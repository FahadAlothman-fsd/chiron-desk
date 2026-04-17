import { isDeepStrictEqual } from "node:util";

import type {
  RuntimeCondition,
  RuntimeConditionEvaluation,
  RuntimeConditionEvaluationTree,
  RuntimeConditionTree,
} from "@chiron/contracts/runtime/conditions";
import type { RuntimeCandidateAvailability } from "@chiron/contracts/runtime/status";
import { Context, Data, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import { ArtifactRepository } from "../repositories/artifact-repository";
import { ProjectFactRepository } from "../repositories/project-fact-repository";
import type { ProjectFactInstanceRow } from "../repositories/project-fact-repository";
import { WorkUnitFactRepository } from "../repositories/work-unit-fact-repository";
import type { WorkUnitFactInstanceRow } from "../repositories/work-unit-fact-repository";

export interface RuntimeGateEvaluationInput {
  readonly projectId: string;
  readonly projectWorkUnitId?: string;
  readonly conditionTree: RuntimeConditionTree;
}

export interface RuntimeGateEvaluationResult {
  readonly result: RuntimeCandidateAvailability;
  readonly firstReason?: string;
  readonly evaluatedAt: string;
}

export interface RuntimeGateEvaluationWithTreeResult extends RuntimeGateEvaluationResult {
  readonly evaluationTree: RuntimeConditionEvaluationTree;
}

export class UnsupportedConditionKindError extends Data.TaggedError(
  "UnsupportedConditionKindError",
)<{
  readonly kind: string;
}> {}

type RuntimeGateError = RepositoryError | UnsupportedConditionKindError;

interface ConditionEvaluationResult {
  readonly met: boolean;
  readonly reason?: string;
}

interface ConditionEvaluationTreeResult {
  readonly met: boolean;
  readonly reason?: string;
  readonly conditions: readonly RuntimeConditionEvaluation[];
  readonly groups: readonly RuntimeConditionEvaluationTree[];
}

type RuntimeFactRow = ProjectFactInstanceRow | WorkUnitFactInstanceRow;

export class RuntimeGateService extends Context.Tag("RuntimeGateService")<
  RuntimeGateService,
  {
    readonly evaluateStartGate: (
      input: RuntimeGateEvaluationInput,
    ) => Effect.Effect<RuntimeGateEvaluationResult, RuntimeGateError>;
    readonly evaluateCompletionGate: (
      input: RuntimeGateEvaluationInput,
    ) => Effect.Effect<RuntimeGateEvaluationResult, RuntimeGateError>;
    readonly evaluateCompletionGateExhaustive: (
      input: RuntimeGateEvaluationInput,
    ) => Effect.Effect<RuntimeGateEvaluationWithTreeResult, RuntimeGateError>;
  }
>() {}

const evaluateTree = (
  tree: RuntimeConditionTree | null | undefined,
  evaluateCondition: (
    condition: RuntimeCondition,
  ) => Effect.Effect<ConditionEvaluationResult, RuntimeGateError>,
): Effect.Effect<ConditionEvaluationResult, RuntimeGateError> =>
  Effect.gen(function* () {
    if (!tree) {
      return { met: true };
    }

    const conditions = tree.conditions as readonly RuntimeCondition[];
    const groups = tree.groups as readonly RuntimeConditionTree[];

    const steps: ReadonlyArray<Effect.Effect<ConditionEvaluationResult, RuntimeGateError>> = [
      ...conditions.map((condition) => evaluateCondition(condition)),
      ...groups.map((group) => evaluateTree(group, evaluateCondition)),
    ];

    if (tree.mode === "all") {
      for (const step of steps) {
        const evaluation = yield* step;
        if (!evaluation.met) {
          return evaluation;
        }
      }
      return { met: true };
    }

    for (const step of steps) {
      const evaluation = yield* step;
      if (evaluation.met) {
        return { met: true };
      }
    }

    return {
      met: false,
      reason:
        steps.length === 0
          ? "ANY gate with no conditions cannot be satisfied"
          : "No ANY branch satisfied",
    };
  });

const findFirstBlockingReason = (tree: RuntimeConditionEvaluationTree): string | undefined => {
  for (const condition of tree.conditions) {
    if (!condition.met) {
      return condition.reason;
    }
  }

  for (const group of tree.groups) {
    const reason = findFirstBlockingReason(group);
    if (reason !== undefined) {
      return reason;
    }
  }

  return tree.met ? undefined : tree.reason;
};

const evaluateTreeExhaustive = (
  tree: RuntimeConditionTree | null | undefined,
  evaluateCondition: (
    condition: RuntimeCondition,
  ) => Effect.Effect<ConditionEvaluationResult, RuntimeGateError>,
): Effect.Effect<ConditionEvaluationTreeResult, RuntimeGateError> =>
  Effect.gen(function* () {
    if (!tree) {
      return {
        met: true,
        conditions: [],
        groups: [],
      } satisfies ConditionEvaluationTreeResult;
    }

    const conditions = tree.conditions as readonly RuntimeCondition[];
    const groups = tree.groups as readonly RuntimeConditionTree[];

    const conditionResults: readonly RuntimeConditionEvaluation[] = yield* Effect.forEach(
      conditions,
      (condition) =>
        evaluateCondition(condition).pipe(
          Effect.map(
            (result) =>
              ({
                condition,
                met: result.met,
                ...(result.reason !== undefined ? { reason: result.reason } : {}),
              }) satisfies RuntimeConditionEvaluation,
          ),
        ),
    );

    const groupResults: readonly RuntimeConditionEvaluationTree[] = yield* Effect.forEach(
      groups,
      (group) =>
        evaluateTreeExhaustive(group, evaluateCondition).pipe(
          Effect.map(
            (result) =>
              ({
                mode: group.mode,
                met: result.met,
                ...(result.reason !== undefined ? { reason: result.reason } : {}),
                conditions: result.conditions,
                groups: result.groups,
              }) satisfies RuntimeConditionEvaluationTree,
          ),
        ),
    );

    const steps = [...conditionResults, ...groupResults];
    const met =
      tree.mode === "all" ? steps.every((step) => step.met) : steps.some((step) => step.met);

    const fallbackReason =
      !met && tree.mode === "any"
        ? steps.length === 0
          ? "ANY gate with no conditions cannot be satisfied"
          : "No ANY branch satisfied"
        : undefined;

    return {
      met,
      ...(fallbackReason !== undefined ? { reason: fallbackReason } : {}),
      conditions: conditionResults,
      groups: groupResults,
    } satisfies ConditionEvaluationTreeResult;
  });

const normalizeFactDefinitionId = (condition: {
  readonly factDefinitionId?: string | undefined;
  readonly factKey: string;
}): string => condition.factDefinitionId ?? condition.factKey;

const normalizeSlotDefinitionId = (condition: {
  readonly slotDefinitionId?: string | undefined;
  readonly slotKey: string;
}): string => condition.slotDefinitionId ?? condition.slotKey;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type DraftSpecFactEntry = {
  factDefinitionId: string;
  value?: unknown;
  valueJson?: unknown;
};

type DraftSpecArtifactEntry = {
  artifactSlotDefinitionId: string;
  relativePath?: string;
  artifactSnapshotId?: string;
};

type DraftSpecRuntimeValue = {
  instance?: Record<string, unknown>;
  facts: readonly DraftSpecFactEntry[];
  artifacts: readonly DraftSpecArtifactEntry[];
};

const toComparableValue = (comparisonJson: unknown): unknown =>
  isRecord(comparisonJson) && "value" in comparisonJson ? comparisonJson.value : comparisonJson;

const pickJsonSubFieldValues = (value: unknown, subFieldKey: string): readonly unknown[] => {
  if (!isRecord(value) || !(subFieldKey in value)) {
    return [];
  }

  const subValue = value[subFieldKey];
  return typeof subValue === "undefined" ? [] : [subValue];
};

const normalizeDraftSpecValue = (value: unknown): DraftSpecRuntimeValue | null => {
  if (!isRecord(value)) {
    return null;
  }

  const facts = Array.isArray(value.facts)
    ? value.facts.flatMap((entry) => {
        if (!isRecord(entry) || typeof entry.factDefinitionId !== "string") {
          return [];
        }

        return [
          {
            factDefinitionId: entry.factDefinitionId,
            ...("value" in entry ? { value: entry.value } : {}),
            ...("valueJson" in entry ? { valueJson: entry.valueJson } : {}),
          } satisfies DraftSpecFactEntry,
        ];
      })
    : Array.isArray(value.workUnitFactInstanceIds)
      ? value.workUnitFactInstanceIds.flatMap((entry) =>
          typeof entry === "string" ? [{ factDefinitionId: entry }] : [],
        )
      : [];

  const artifacts = Array.isArray(value.artifacts)
    ? value.artifacts.flatMap((entry) => {
        if (!isRecord(entry) || typeof entry.artifactSlotDefinitionId !== "string") {
          return [];
        }

        return [
          {
            artifactSlotDefinitionId: entry.artifactSlotDefinitionId,
            ...(typeof entry.relativePath === "string" ? { relativePath: entry.relativePath } : {}),
            ...(typeof entry.artifactSnapshotId === "string"
              ? { artifactSnapshotId: entry.artifactSnapshotId }
              : {}),
          } satisfies DraftSpecArtifactEntry,
        ];
      })
    : Array.isArray(value.artifactSnapshotIds)
      ? value.artifactSnapshotIds.flatMap((entry) =>
          typeof entry === "string" ? [{ artifactSlotDefinitionId: entry }] : [],
        )
      : [];

  return {
    ...(isRecord(value.instance) ? { instance: value.instance } : {}),
    facts,
    artifacts,
  };
};

const extractFactValues = (
  rows: readonly RuntimeFactRow[],
  subFieldKey: string | null | undefined,
): readonly unknown[] => {
  if (!subFieldKey) {
    return rows.flatMap((row) =>
      typeof row.valueJson === "undefined" || row.valueJson === null ? [] : [row.valueJson],
    );
  }

  return rows.flatMap((row) => {
    const normalized = normalizeDraftSpecValue(row.valueJson);
    if (normalized) {
      if (subFieldKey.startsWith("fact:")) {
        const factDefinitionId = subFieldKey.slice("fact:".length);
        return normalized.facts.flatMap((fact) => {
          if (fact.factDefinitionId !== factDefinitionId) {
            return [];
          }

          if ("value" in fact && typeof fact.value !== "undefined") {
            return [fact.value];
          }

          if ("valueJson" in fact && typeof fact.valueJson !== "undefined") {
            return [fact.valueJson];
          }

          return [fact];
        });
      }

      if (subFieldKey.startsWith("artifact:")) {
        const artifactSlotDefinitionId = subFieldKey.slice("artifact:".length);
        return normalized.artifacts.filter(
          (artifact) => artifact.artifactSlotDefinitionId === artifactSlotDefinitionId,
        );
      }

      if (subFieldKey.startsWith("instance:")) {
        return pickJsonSubFieldValues(
          normalized.instance ?? {},
          subFieldKey.slice("instance:".length),
        );
      }
    }

    return pickJsonSubFieldValues(row.valueJson, subFieldKey);
  });
};

const evaluateFactValues = (params: {
  rows: readonly RuntimeFactRow[];
  condition: Extract<RuntimeCondition, { kind: "fact" | "work_unit_fact" }>;
}): boolean => {
  const extractedValues = extractFactValues(params.rows, params.condition.subFieldKey ?? null);

  const baseMet = (() => {
    switch (params.condition.operator) {
      case "exists":
        return extractedValues.some((value) => {
          if (value === null || typeof value === "undefined") {
            return false;
          }

          return !Array.isArray(value) || value.length > 0;
        });
      case "equals": {
        const expected = toComparableValue(params.condition.comparisonJson);
        return extractedValues.some((value) => isDeepStrictEqual(value, expected));
      }
    }
  })();

  return params.condition.isNegated ? !baseMet : baseMet;
};

export const RuntimeGateServiceLive = Layer.effect(
  RuntimeGateService,
  Effect.gen(function* () {
    const projectFactRepository = yield* ProjectFactRepository;
    const workUnitFactRepository = yield* WorkUnitFactRepository;
    const artifactRepository = yield* ArtifactRepository;

    const evaluateSingleCondition = (
      context: RuntimeGateEvaluationInput,
      condition: RuntimeCondition,
    ): Effect.Effect<ConditionEvaluationResult, RuntimeGateError> =>
      Effect.gen(function* () {
        switch (condition.kind) {
          case "fact": {
            const factDefinitionId = normalizeFactDefinitionId(condition);
            const rows = yield* projectFactRepository.getCurrentValuesByDefinition({
              projectId: context.projectId,
              factDefinitionId,
            });

            const met = evaluateFactValues({ rows, condition });

            if (met) {
              return { met: true } as const;
            }

            return {
              met: false,
              reason:
                condition.operator === "exists" && rows.length === 0
                  ? `Project fact '${condition.factKey}' is missing`
                  : `Project fact '${condition.factKey}' did not satisfy ${condition.operator}`,
            } as const;
          }
          case "work_unit_fact": {
            if (!context.projectWorkUnitId) {
              return {
                met: false,
                reason: "Work-unit fact condition requires projectWorkUnitId",
              };
            }

            const factDefinitionId = normalizeFactDefinitionId(condition);
            const rows = yield* workUnitFactRepository.getCurrentValuesByDefinition({
              projectWorkUnitId: context.projectWorkUnitId,
              factDefinitionId,
            });

            const met = evaluateFactValues({ rows, condition });

            if (met) {
              return { met: true } as const;
            }

            return {
              met: false,
              reason:
                condition.operator === "exists" && rows.length === 0
                  ? `Work-unit fact '${condition.factKey}' is missing`
                  : `Work-unit fact '${condition.factKey}' did not satisfy ${condition.operator}`,
            } as const;
          }
          case "artifact": {
            if (!context.projectWorkUnitId) {
              return {
                met: false,
                reason: "Artifact condition requires projectWorkUnitId",
              };
            }

            const slotDefinitionId = normalizeSlotDefinitionId(condition);
            const freshness = yield* artifactRepository.checkFreshness({
              projectId: context.projectId,
              projectWorkUnitId: context.projectWorkUnitId,
              slotDefinitionId,
            });

            if (condition.operator === "exists") {
              return freshness.exists
                ? ({ met: true } as const)
                : ({
                    met: false,
                    reason: `Artifact slot '${condition.slotKey}' has no current snapshot`,
                  } as const);
            }

            if (condition.operator === "fresh") {
              return freshness.exists && freshness.freshness === "fresh"
                ? ({ met: true } as const)
                : ({
                    met: false,
                    reason: `Artifact slot '${condition.slotKey}' is not fresh`,
                  } as const);
            }

            return freshness.exists && freshness.freshness === "stale"
              ? ({ met: true } as const)
              : ({
                  met: false,
                  reason: `Artifact slot '${condition.slotKey}' is not stale`,
                } as const);
          }
          default:
            return yield* new UnsupportedConditionKindError({
              kind: (condition as { kind: string }).kind,
            });
        }
      });

    const evaluate = (
      input: RuntimeGateEvaluationInput,
    ): Effect.Effect<RuntimeGateEvaluationResult, RuntimeGateError> =>
      evaluateTree(input.conditionTree, (condition) =>
        evaluateSingleCondition(input, condition),
      ).pipe(
        Effect.map((result) => ({
          result: result.met ? "available" : "blocked",
          ...(result.reason !== undefined ? { firstReason: result.reason } : {}),
          evaluatedAt: new Date().toISOString(),
        })),
      );

    const evaluateExhaustive = (
      input: RuntimeGateEvaluationInput,
    ): Effect.Effect<RuntimeGateEvaluationWithTreeResult, RuntimeGateError> =>
      evaluateTreeExhaustive(input.conditionTree, (condition) =>
        evaluateSingleCondition(input, condition),
      ).pipe(
        Effect.map((result) => {
          const evaluationTree = {
            mode: input.conditionTree.mode,
            met: result.met,
            ...(result.reason !== undefined ? { reason: result.reason } : {}),
            conditions: result.conditions,
            groups: result.groups,
          } satisfies RuntimeConditionEvaluationTree;
          const firstReason = findFirstBlockingReason(evaluationTree);

          return {
            result: result.met ? "available" : "blocked",
            ...(firstReason !== undefined ? { firstReason } : {}),
            evaluatedAt: new Date().toISOString(),
            evaluationTree,
          } satisfies RuntimeGateEvaluationWithTreeResult;
        }),
      );

    return RuntimeGateService.of({
      evaluateStartGate: evaluate,
      evaluateCompletionGate: evaluate,
      evaluateCompletionGateExhaustive: evaluateExhaustive,
    });
  }),
);
