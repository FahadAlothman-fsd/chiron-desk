import { isDeepStrictEqual } from "node:util";

import type {
  BranchConditionMode,
  BranchRouteConditionPayload,
  BranchRouteGroupPayload,
  BranchRoutePayload,
  WorkflowContextFactDto,
} from "@chiron/contracts/methodology/workflow";
import type {
  FactCondition,
  RuntimeConditionEvaluation,
  RuntimeConditionEvaluationTree,
  RuntimeCondition,
  WorkUnitCondition,
} from "@chiron/contracts/runtime/conditions";

import type { RuntimeWorkflowExecutionContextFactRow } from "../repositories/step-execution-repository";
import { unwrapRuntimeBoundFactEnvelope } from "./runtime-bound-fact-value";

type BranchEvaluableRoute = Pick<
  BranchRoutePayload,
  "routeId" | "targetStepId" | "conditionMode" | "groups"
> & {
  sortOrder?: number;
};

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

export interface EvaluateBranchRoutesParams {
  routes: readonly BranchEvaluableRoute[];
  contextFacts: readonly RuntimeWorkflowExecutionContextFactRow[];
  contextFactDefinitions: readonly WorkflowContextFactDto[];
  projectWorkUnitInstances?: readonly ProjectWorkUnitInstanceSummary[];
}

export interface ProjectWorkUnitInstanceSummary {
  readonly workUnitTypeKey: string;
  readonly currentStateKey: string | null;
}

export const toProjectWorkUnitInstanceSummaries = (params: {
  readonly projectWorkUnits: readonly {
    readonly workUnitTypeId: string;
    readonly currentStateId: string | null;
  }[];
  readonly workUnitTypeKeysById: ReadonlyMap<string, string>;
  readonly stateKeysById: ReadonlyMap<string, string>;
}): readonly ProjectWorkUnitInstanceSummary[] =>
  params.projectWorkUnits.flatMap((workUnit) => {
    const workUnitTypeKey = params.workUnitTypeKeysById.get(workUnit.workUnitTypeId);
    if (!workUnitTypeKey) {
      return [];
    }

    return [
      {
        workUnitTypeKey,
        currentStateKey: workUnit.currentStateId
          ? (params.stateKeysById.get(workUnit.currentStateId) ?? null)
          : null,
      } satisfies ProjectWorkUnitInstanceSummary,
    ];
  });

export interface BranchRouteEvaluation {
  routeId: string;
  targetStepId: string;
  sortOrder: number;
  conditionMode: BranchConditionMode;
  isValid: boolean;
  evaluationTree: RuntimeConditionEvaluationTree;
}

export interface BranchTargetSuggestion {
  suggestedTargetStepId: string | null;
  source: "conditional_route" | "default_target" | "none";
  routeId?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getRouteSortOrder = (route: BranchEvaluableRoute, index: number): number =>
  typeof route.sortOrder === "number" ? route.sortOrder : index;

const toComparableValue = (comparisonJson: unknown): unknown =>
  isRecord(comparisonJson) && "value" in comparisonJson ? comparisonJson.value : comparisonJson;

const unwrapScalarValueRecord = (value: unknown): unknown => {
  let current = value;

  while (isRecord(current) && Object.keys(current).length === 1 && "value" in current) {
    current = current.value;
  }

  return current;
};

const normalizeDirectFactComparisonValue = (
  definition: WorkflowContextFactDto,
  value: unknown,
): unknown => {
  switch (definition.kind) {
    case "plain_fact":
    case "plain_value_fact":
    case "bound_fact":
      return unwrapScalarValueRecord(value);
    case "workflow_ref_fact":
    case "artifact_slot_reference_fact":
    case "work_unit_reference_fact":
    case "work_unit_draft_spec_fact":
      return value;
  }
};

const summarizeExtractedValues = (values: readonly unknown[]): unknown => {
  if (values.length === 0) {
    return null;
  }

  return values.length === 1 ? values[0] : values;
};

const toRuntimeCondition = (
  condition: BranchRouteConditionPayload,
  definition: WorkflowContextFactDto | undefined,
): RuntimeCondition => {
  if (
    condition.operator === "work_unit_instance_exists" ||
    condition.operator === "work_unit_instance_exists_in_state"
  ) {
    return {
      kind: "work_unit",
      workUnitTypeKey: condition.workUnitTypeKey,
      operator: condition.operator,
      ...(condition.operator === "work_unit_instance_exists_in_state"
        ? { stateKeys: condition.stateKeys }
        : {}),
      ...(typeof condition.minCount === "number" ? { minCount: condition.minCount } : {}),
      ...(condition.isNegated ? { isNegated: true } : {}),
    } satisfies WorkUnitCondition;
  }

  return {
    kind: "fact",
    factDefinitionId: condition.contextFactDefinitionId,
    factKey: definition?.key ?? condition.contextFactDefinitionId,
    ...(condition.subFieldKey ? { subFieldKey: condition.subFieldKey } : {}),
    operator: condition.operator,
    ...(condition.isNegated ? { isNegated: true } : {}),
    ...(typeof condition.comparisonJson !== "undefined"
      ? { comparisonJson: condition.comparisonJson }
      : {}),
  } satisfies FactCondition;
};

const countMatchingProjectWorkUnits = (params: {
  readonly projectWorkUnitInstances: readonly ProjectWorkUnitInstanceSummary[];
  readonly condition: Extract<
    BranchRouteConditionPayload,
    {
      readonly operator: "work_unit_instance_exists" | "work_unit_instance_exists_in_state";
    }
  >;
}): number =>
  params.projectWorkUnitInstances.filter((workUnit) => {
    if (workUnit.workUnitTypeKey !== params.condition.workUnitTypeKey) {
      return false;
    }

    return params.condition.operator === "work_unit_instance_exists_in_state"
      ? workUnit.currentStateKey !== null &&
          params.condition.stateKeys.includes(workUnit.currentStateKey)
      : true;
  }).length;

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
  definition: WorkflowContextFactDto,
  row: RuntimeWorkflowExecutionContextFactRow,
  subFieldKey: string | null,
): readonly unknown[] => {
  const rawValue = unwrapRuntimeBoundFactEnvelope(row.valueJson);

  if (!subFieldKey) {
    if (typeof row.valueJson === "undefined" || row.valueJson === null) {
      return [];
    }

    return [normalizeDirectFactComparisonValue(definition, rawValue)];
  }

  switch (definition.kind) {
    case "plain_fact":
    case "plain_value_fact":
    case "bound_fact":
    case "workflow_ref_fact":
    case "artifact_slot_reference_fact":
    case "work_unit_reference_fact":
      return pickJsonSubFieldValues(rawValue, subFieldKey);
    case "work_unit_draft_spec_fact": {
      const normalized = normalizeDraftSpecValue(rawValue);
      if (!normalized) {
        return [];
      }

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

      return [];
    }
  }
};

const evaluateCondition = (params: {
  condition: BranchRouteConditionPayload;
  definition: WorkflowContextFactDto | undefined;
  matchingRows: readonly RuntimeWorkflowExecutionContextFactRow[];
  projectWorkUnitInstances: readonly ProjectWorkUnitInstanceSummary[];
}): RuntimeConditionEvaluation => {
  const runtimeCondition = toRuntimeCondition(params.condition, params.definition);

  if (
    params.condition.operator === "work_unit_instance_exists" ||
    params.condition.operator === "work_unit_instance_exists_in_state"
  ) {
    const matchedCount = countMatchingProjectWorkUnits({
      condition: params.condition,
      projectWorkUnitInstances: params.projectWorkUnitInstances,
    });
    const minCount = params.condition.minCount ?? 1;
    const baseMet = matchedCount >= minCount;
    const met = params.condition.isNegated ? !baseMet : baseMet;
    const stateScope =
      params.condition.operator === "work_unit_instance_exists_in_state"
        ? ` in states ${params.condition.stateKeys.join(", ")}`
        : "";

    return {
      condition: runtimeCondition,
      met,
      expectedValueJson: { minCount },
      currentValueJson: { count: matchedCount },
      ...(!met
        ? {
            reason: `Project work unit '${params.condition.workUnitTypeKey}' matched ${matchedCount} instance(s)${stateScope}; expected at least ${minCount}`,
          }
        : {}),
    };
  }

  const extractedValues = !params.definition
    ? []
    : params.matchingRows.flatMap((row) =>
        extractFactValues(
          params.definition as WorkflowContextFactDto,
          row,
          params.condition.subFieldKey ?? null,
        ),
      );

  const expectedValue =
    params.condition.operator === "equals"
      ? toComparableValue(params.condition.comparisonJson)
      : undefined;
  const currentValue = summarizeExtractedValues(extractedValues);

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
        return extractedValues.some((value) => isDeepStrictEqual(value, expectedValue));
      }
      default:
        return false;
    }
  })();

  const met = params.condition.isNegated ? !baseMet : baseMet;

  return {
    condition: runtimeCondition,
    met,
    ...(typeof expectedValue !== "undefined" ? { expectedValueJson: expectedValue } : {}),
    currentValueJson: currentValue,
    ...(!met
      ? {
          reason:
            params.condition.operator === "exists"
              ? `Context fact '${runtimeCondition.factKey}' did not satisfy exists`
              : `Context fact '${runtimeCondition.factKey}' did not satisfy equals`,
        }
      : {}),
  };
};

const finalizeTree = (
  mode: BranchConditionMode,
  conditions: readonly RuntimeConditionEvaluation[],
  groups: readonly RuntimeConditionEvaluationTree[],
): RuntimeConditionEvaluationTree => {
  const children = [...conditions, ...groups];
  const met =
    mode === "all" ? children.every((child) => child.met) : children.some((child) => child.met);

  return {
    mode,
    met,
    ...(met
      ? {}
      : {
          reason:
            mode === "any"
              ? children.length === 0
                ? "ANY route with no conditions cannot be satisfied"
                : "No ANY branch satisfied"
              : "At least one branch condition failed",
        }),
    conditions,
    groups,
  };
};

const evaluateGroup = (params: {
  group: BranchRouteGroupPayload;
  contextFactsByDefinitionId: ReadonlyMap<
    string,
    readonly RuntimeWorkflowExecutionContextFactRow[]
  >;
  definitionsById: ReadonlyMap<string, WorkflowContextFactDto>;
  projectWorkUnitInstances: readonly ProjectWorkUnitInstanceSummary[];
}): RuntimeConditionEvaluationTree => {
  const conditions = params.group.conditions.map((condition) =>
    evaluateCondition({
      condition,
      definition:
        "contextFactDefinitionId" in condition
          ? params.definitionsById.get(condition.contextFactDefinitionId)
          : undefined,
      matchingRows:
        "contextFactDefinitionId" in condition
          ? (params.contextFactsByDefinitionId.get(condition.contextFactDefinitionId) ?? [])
          : [],
      projectWorkUnitInstances: params.projectWorkUnitInstances,
    }),
  );

  return finalizeTree(params.group.mode, conditions, []);
};

export const evaluateRoutes = ({
  routes,
  contextFacts,
  contextFactDefinitions,
  projectWorkUnitInstances,
}: EvaluateBranchRoutesParams): readonly BranchRouteEvaluation[] => {
  const contextFactsByDefinitionId = new Map<string, RuntimeWorkflowExecutionContextFactRow[]>();
  for (const fact of contextFacts) {
    const entries = contextFactsByDefinitionId.get(fact.contextFactDefinitionId) ?? [];
    contextFactsByDefinitionId.set(fact.contextFactDefinitionId, [...entries, fact]);
  }

  const definitionsById = new Map<string, WorkflowContextFactDto>();
  for (const definition of contextFactDefinitions) {
    if (typeof definition.contextFactDefinitionId === "string") {
      definitionsById.set(definition.contextFactDefinitionId, definition);
    }
  }

  return routes
    .map((route, index) => {
      const groups = route.groups.map((group) =>
        evaluateGroup({
          group,
          contextFactsByDefinitionId,
          definitionsById,
          projectWorkUnitInstances: projectWorkUnitInstances ?? [],
        }),
      );
      const evaluationTree = finalizeTree(route.conditionMode, [], groups);

      return {
        routeId: route.routeId,
        targetStepId: route.targetStepId,
        sortOrder: getRouteSortOrder(route, index),
        conditionMode: route.conditionMode,
        isValid: evaluationTree.met,
        evaluationTree,
      } satisfies BranchRouteEvaluation;
    })
    .sort(
      (left: BranchRouteEvaluation, right: BranchRouteEvaluation) =>
        left.sortOrder - right.sortOrder,
    );
};

export const isRouteValid = (params: {
  route: BranchEvaluableRoute;
  contextFacts: readonly RuntimeWorkflowExecutionContextFactRow[];
  contextFactDefinitions: readonly WorkflowContextFactDto[];
}): boolean =>
  evaluateRoutes({
    routes: [params.route],
    contextFacts: params.contextFacts,
    contextFactDefinitions: params.contextFactDefinitions,
  })[0]?.isValid ?? false;

export const getSuggestedTarget = (params: {
  evaluations: readonly BranchRouteEvaluation[];
  defaultTargetStepId?: string | null;
}): BranchTargetSuggestion => {
  const firstValidRoute = params.evaluations.find((route) => route.isValid);
  if (firstValidRoute) {
    return {
      suggestedTargetStepId: firstValidRoute.targetStepId,
      source: "conditional_route",
      routeId: firstValidRoute.routeId,
    };
  }

  if (params.defaultTargetStepId) {
    return {
      suggestedTargetStepId: params.defaultTargetStepId,
      source: "default_target",
    };
  }

  return {
    suggestedTargetStepId: null,
    source: "none",
  };
};
