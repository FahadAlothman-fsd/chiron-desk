import type { RuntimeCondition, RuntimeConditionTree } from "@chiron/contracts/runtime/conditions";
import type { RuntimeCandidateAvailability } from "@chiron/contracts/runtime/status";
import { Context, Data, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import { ArtifactRepository } from "../repositories/artifact-repository";
import { ProjectFactRepository } from "../repositories/project-fact-repository";
import { WorkUnitFactRepository } from "../repositories/work-unit-fact-repository";

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

export class RuntimeGateService extends Context.Tag("RuntimeGateService")<
  RuntimeGateService,
  {
    readonly evaluateStartGate: (
      input: RuntimeGateEvaluationInput,
    ) => Effect.Effect<RuntimeGateEvaluationResult, RuntimeGateError>;
    readonly evaluateCompletionGate: (
      input: RuntimeGateEvaluationInput,
    ) => Effect.Effect<RuntimeGateEvaluationResult, RuntimeGateError>;
  }
>() {}

const evaluateTree = (
  tree: RuntimeConditionTree,
  evaluateCondition: (
    condition: RuntimeCondition,
  ) => Effect.Effect<ConditionEvaluationResult, RuntimeGateError>,
): Effect.Effect<ConditionEvaluationResult, RuntimeGateError> =>
  Effect.gen(function* () {
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

const normalizeFactDefinitionId = (condition: {
  readonly factDefinitionId?: string | undefined;
  readonly factKey: string;
}): string => condition.factDefinitionId ?? condition.factKey;

const normalizeSlotDefinitionId = (condition: {
  readonly slotDefinitionId?: string | undefined;
  readonly slotKey: string;
}): string => condition.slotDefinitionId ?? condition.slotKey;

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

            return rows.length > 0
              ? ({ met: true } as const)
              : ({
                  met: false,
                  reason: `Project fact '${condition.factKey}' is missing`,
                } as const);
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

            return rows.length > 0
              ? ({ met: true } as const)
              : ({
                  met: false,
                  reason: `Work-unit fact '${condition.factKey}' is missing`,
                } as const);
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

    return RuntimeGateService.of({
      evaluateStartGate: evaluate,
      evaluateCompletionGate: evaluate,
    });
  }),
);
