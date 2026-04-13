import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "@/components/ui/sonner";

import type {
  WorkflowBranchStepPayload,
  WorkflowAgentStepPayload,
  WorkflowContextFactDefinitionItem,
  WorkflowContextFactDraft,
  WorkflowConditionOperator,
  WorkflowConditionOperand,
  WorkflowEditorEdge,
  WorkflowEditorGuidance,
  WorkflowHarnessDiscoveryMetadata,
  WorkflowEditorPickerBadge,
  WorkflowEditorMetadata,
  WorkflowEditorPickerOption,
  WorkflowEditorStep,
  WorkflowFormStepPayload,
  WorkflowInvokeArtifactSlotDefinition,
  WorkflowInvokeStepPayload,
  WorkflowInvokeWorkUnitFactDefinition,
} from "../features/workflow-editor/types";
import { WorkflowEditorShell } from "../features/workflow-editor/workflow-editor-shell";

export const Route = createFileRoute(
  "/methodologies/$methodologyId/versions/$versionId/work-units/$workUnitKey/workflow-editor/$workflowDefinitionId",
)({
  component: MethodologyWorkflowEditorRoute,
});

type RawEditorDefinition = {
  workflow?: unknown;
  steps?: unknown;
  edges?: unknown;
  contextFacts?: unknown;
  formDefinitions?: unknown;
  agentStepDefinitions?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readMarkdown(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  const record = asRecord(value);
  if (!record) {
    return "";
  }

  if (typeof record.markdown === "string") {
    return record.markdown;
  }

  return "";
}

function readGuidance(value: unknown): WorkflowEditorGuidance {
  const record = asRecord(value);
  if (!record) {
    return { humanMarkdown: "", agentMarkdown: "" };
  }

  const human = readMarkdown(record.human);
  const agent = readMarkdown(record.agent);

  return { humanMarkdown: human, agentMarkdown: agent };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}

function parseBranchProjectedEdgeMetadata(value: unknown): {
  edgeOwner: NonNullable<WorkflowEditorEdge["edgeOwner"]>;
  branchStepId: string;
  routeId?: string;
} | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  if (record.edgeOwner !== "branch_default" && record.edgeOwner !== "branch_conditional") {
    return null;
  }

  if (typeof record.branchStepId !== "string" || record.branchStepId.trim().length === 0) {
    return null;
  }

  return {
    edgeOwner: record.edgeOwner,
    branchStepId: record.branchStepId,
    ...(typeof record.routeId === "string" && record.routeId.trim().length > 0
      ? { routeId: record.routeId }
      : {}),
  };
}

const hasComparisonValue = (comparison: unknown) =>
  typeof comparison === "object" && comparison !== null && "value" in comparison;

const hasStringComparisonValue = (comparison: unknown) => {
  if (!hasComparisonValue(comparison)) {
    return false;
  }

  return typeof (comparison as { value?: unknown }).value === "string";
};

const hasBooleanComparisonValue = (comparison: unknown) => {
  if (!hasComparisonValue(comparison)) {
    return false;
  }

  return typeof (comparison as { value?: unknown }).value === "boolean";
};

const hasNumericComparisonValue = (comparison: unknown) => {
  if (!hasComparisonValue(comparison)) {
    return false;
  }

  const value = (comparison as { value?: unknown }).value;
  return typeof value === "number" && Number.isFinite(value);
};

const hasNumericRangeComparison = (comparison: unknown) => {
  if (typeof comparison !== "object" || comparison === null) {
    return false;
  }

  if (!("min" in comparison) || !("max" in comparison)) {
    return false;
  }

  const min = (comparison as { min?: unknown }).min;
  const max = (comparison as { max?: unknown }).max;

  return (
    typeof min === "number" &&
    typeof max === "number" &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min <= max
  );
};

const hasNoComparison = (comparison: unknown) =>
  typeof comparison === "undefined" || comparison === null;

const isScalarOperand = (operand: WorkflowConditionOperand) => operand.cardinality === "one";
const isManyOperand = (operand: WorkflowConditionOperand) => operand.cardinality === "many";
const isStringOperand = (operand: WorkflowConditionOperand) => operand.operandType === "string";
const isNumberOperand = (operand: WorkflowConditionOperand) => operand.operandType === "number";
const isArtifactReferenceOperand = (operand: WorkflowConditionOperand) =>
  operand.operandType === "artifact_reference";
const isJsonObjectOperand = (operand: WorkflowConditionOperand) =>
  operand.operandType === "json_object";

const hasComparableValueForOperand = (
  comparison: unknown,
  operand: WorkflowConditionOperand,
): boolean => {
  if (!hasComparisonValue(comparison)) {
    return false;
  }

  if (operand.operandType === "number") {
    return hasNumericComparisonValue(comparison);
  }

  if (operand.operandType === "boolean") {
    return hasBooleanComparisonValue(comparison);
  }

  return true;
};

const BUILT_IN_CONDITION_OPERATORS: readonly WorkflowConditionOperator[] = [
  {
    key: "exists",
    label: "Exists",
    requiresComparison: false,
    supportsOperand: () => true,
    validateComparison: (comparison) => hasNoComparison(comparison),
  },
  {
    key: "equals",
    label: "Equals",
    requiresComparison: true,
    supportsOperand: (operand) =>
      !isArtifactReferenceOperand(operand) && !isJsonObjectOperand(operand),
    validateComparison: (comparison, operand) => hasComparableValueForOperand(comparison, operand),
  },
  {
    key: "contains",
    label: "Contains",
    requiresComparison: true,
    supportsOperand: (operand) => isStringOperand(operand),
    validateComparison: (comparison) => hasStringComparisonValue(comparison),
  },
  {
    key: "starts_with",
    label: "Starts With",
    requiresComparison: true,
    supportsOperand: (operand) => isStringOperand(operand),
    validateComparison: (comparison) => hasStringComparisonValue(comparison),
  },
  {
    key: "ends_with",
    label: "Ends With",
    requiresComparison: true,
    supportsOperand: (operand) => isStringOperand(operand),
    validateComparison: (comparison) => hasStringComparisonValue(comparison),
  },
  {
    key: "gt",
    label: "Greater Than",
    requiresComparison: true,
    supportsOperand: (operand) => isNumberOperand(operand),
    validateComparison: (comparison) => hasNumericComparisonValue(comparison),
  },
  {
    key: "gte",
    label: "Greater Than Or Equal",
    requiresComparison: true,
    supportsOperand: (operand) => isNumberOperand(operand),
    validateComparison: (comparison) => hasNumericComparisonValue(comparison),
  },
  {
    key: "lt",
    label: "Less Than",
    requiresComparison: true,
    supportsOperand: (operand) => isNumberOperand(operand),
    validateComparison: (comparison) => hasNumericComparisonValue(comparison),
  },
  {
    key: "lte",
    label: "Less Than Or Equal",
    requiresComparison: true,
    supportsOperand: (operand) => isNumberOperand(operand),
    validateComparison: (comparison) => hasNumericComparisonValue(comparison),
  },
  {
    key: "between",
    label: "Between",
    requiresComparison: true,
    supportsOperand: (operand) => isNumberOperand(operand),
    validateComparison: (comparison) => hasNumericRangeComparison(comparison),
  },
  {
    key: "exists_in_repo",
    label: "Exists In Repo",
    supportsOperand: (operand) => isStringOperand(operand),
    requiresComparison: false,
    validateComparison: (comparison) => hasNoComparison(comparison),
  },
  {
    key: "fresh",
    label: "Fresh",
    supportsOperand: (operand) => operand.freshnessCapable,
    requiresComparison: false,
    validateComparison: (comparison) => hasNoComparison(comparison),
  },
];

function normalizeContextFactKind(
  value: unknown,
): WorkflowContextFactDefinitionItem["kind"] | null {
  switch (value) {
    case "plain_value_fact":
    case "definition_backed_external_fact":
    case "bound_external_fact":
    case "workflow_reference_fact":
    case "artifact_reference_fact":
    case "work_unit_draft_spec_fact":
      return value;
    case "plain_value":
      return "plain_value_fact";
    case "workflow_reference":
      return "workflow_reference_fact";
    case "artifact_reference":
      return "artifact_reference_fact";
    case "draft_spec":
      return "work_unit_draft_spec_fact";
    case "external_binding":
      return "bound_external_fact";
    default:
      return null;
  }
}

function summarizeContextFact(fact: WorkflowContextFactDraft | WorkflowContextFactDefinitionItem) {
  const lead = `${fact.kind.replaceAll("_", " ")} · ${fact.cardinality}`;

  switch (fact.kind) {
    case "plain_value_fact":
      return `${lead} · ${fact.valueType ?? "string"}`;
    case "definition_backed_external_fact":
    case "bound_external_fact":
      return fact.externalFactDefinitionId?.trim()
        ? `${lead} · ${fact.externalFactDefinitionId.trim()}`
        : lead;
    case "workflow_reference_fact":
      return fact.allowedWorkflowDefinitionIds.length > 0
        ? `${lead} · ${fact.allowedWorkflowDefinitionIds.length} workflow${
            fact.allowedWorkflowDefinitionIds.length === 1 ? "" : "s"
          }`
        : lead;
    case "artifact_reference_fact":
      return fact.artifactSlotDefinitionId?.trim()
        ? `${lead} · ${fact.artifactSlotDefinitionId.trim()}`
        : lead;
    case "work_unit_draft_spec_fact":
      return fact.workUnitTypeKey?.trim() ? `${lead} · ${fact.workUnitTypeKey.trim()}` : lead;
  }
}

function inferWorkUnitTypeIdentifierFromDraftSpecFactDefinitionIds(
  rawWorkUnits: unknown,
  factDefinitionIds: readonly string[],
) {
  if (factDefinitionIds.length === 0) {
    return "";
  }

  for (const entry of getWorkUnitEntries(rawWorkUnits)) {
    const workUnit = asRecord(entry);
    if (!workUnit || typeof workUnit.key !== "string") {
      continue;
    }

    const factIds = new Set(
      getWorkUnitFactEntries(rawWorkUnits, workUnit.key)
        .map((fact) => asRecord(fact)?.id)
        .filter((id): id is string => typeof id === "string"),
    );

    if (factDefinitionIds.every((factDefinitionId) => factIds.has(factDefinitionId))) {
      return typeof workUnit.id === "string" && workUnit.id.trim().length > 0
        ? workUnit.id
        : workUnit.key;
    }
  }

  return "";
}

function toWorkflowMetadata(
  workflowDefinitionId: string,
  workflow: unknown,
): WorkflowEditorMetadata {
  const value = asRecord(workflow) ?? {};
  const metadata = asRecord(value.metadata) ?? asRecord(value.metadataJson) ?? {};

  const descriptionMarkdown =
    readMarkdown(value.descriptionJson) ||
    readMarkdown(value.description) ||
    readMarkdown(value.guidanceJson);
  const key =
    typeof value.key === "string" && value.key.trim().length > 0 ? value.key : workflowDefinitionId;
  const displayName =
    typeof value.displayName === "string" && value.displayName.trim().length > 0
      ? value.displayName
      : key;

  return {
    workflowDefinitionId,
    key,
    displayName,
    descriptionMarkdown,
    entryStepId:
      typeof metadata.entryStepId === "string" && metadata.entryStepId.trim().length > 0
        ? metadata.entryStepId
        : null,
  };
}

function toFormFields(rawFields: unknown): WorkflowFormStepPayload["fields"] {
  if (!Array.isArray(rawFields)) {
    return [];
  }

  const fields: WorkflowFormStepPayload["fields"] = [];

  rawFields.forEach((entry) => {
    const field = asRecord(entry);
    if (!field) {
      return;
    }

    if (typeof field.contextFactDefinitionId === "string") {
      fields.push({
        contextFactDefinitionId: field.contextFactDefinitionId,
        fieldLabel:
          typeof field.fieldLabel === "string" && field.fieldLabel.trim().length > 0
            ? field.fieldLabel
            : field.contextFactDefinitionId,
        fieldKey:
          typeof field.fieldKey === "string" && field.fieldKey.trim().length > 0
            ? field.fieldKey
            : field.contextFactDefinitionId,
        helpText:
          typeof field.helpText === "string"
            ? field.helpText
            : field.helpText === null
              ? null
              : null,
        required: field.required === true,
        ...(field.uiMultiplicityMode === "one" || field.uiMultiplicityMode === "many"
          ? { uiMultiplicityMode: field.uiMultiplicityMode }
          : {}),
      });
      return;
    }

    if (typeof field.key === "string") {
      fields.push({
        contextFactDefinitionId: field.key,
        fieldLabel:
          typeof field.label === "string" && field.label.trim().length > 0
            ? field.label
            : field.key,
        fieldKey: field.key,
        helpText: readMarkdown(field.descriptionJson) || null,
        required: field.required === true,
      });
    }
  });

  return fields;
}

function toWorkflowFormPayload(rawPayload: unknown): WorkflowFormStepPayload | null {
  const payload = asRecord(rawPayload);
  if (!payload || typeof payload.key !== "string") {
    return null;
  }

  return {
    key: payload.key,
    ...(typeof payload.label === "string" ? { label: payload.label } : {}),
    ...(readMarkdown(payload.descriptionJson)
      ? { descriptionJson: { markdown: readMarkdown(payload.descriptionJson) } }
      : {}),
    fields: toFormFields(payload.fields),
    guidance: readGuidance(payload.guidanceJson ?? payload.guidance),
  };
}

function toWorkflowAgentPayload(rawPayload: unknown): WorkflowAgentStepPayload | null {
  const payload = asRecord(rawPayload);
  if (!payload || typeof payload.key !== "string") {
    return null;
  }

  const writeItems = Array.isArray(payload.writeItems)
    ? payload.writeItems.flatMap((entry) => {
        const writeItem = asRecord(entry);
        if (!writeItem || typeof writeItem.writeItemId !== "string") {
          return [];
        }

        const contextFactKind = normalizeContextFactKind(writeItem.contextFactKind);
        if (!contextFactKind || typeof writeItem.contextFactDefinitionId !== "string") {
          return [];
        }

        return [
          {
            writeItemId: writeItem.writeItemId,
            contextFactDefinitionId: writeItem.contextFactDefinitionId,
            contextFactKind,
            ...(typeof writeItem.label === "string" ? { label: writeItem.label } : {}),
            order: typeof writeItem.order === "number" ? writeItem.order : 0,
            requirementContextFactDefinitionIds: Array.isArray(
              writeItem.requirementContextFactDefinitionIds,
            )
              ? writeItem.requirementContextFactDefinitionIds.filter(
                  (value): value is string => typeof value === "string",
                )
              : [],
          },
        ];
      })
    : [];

  return {
    key: payload.key,
    ...(typeof payload.label === "string" ? { label: payload.label } : {}),
    ...(readMarkdown(payload.descriptionJson)
      ? { descriptionJson: { markdown: readMarkdown(payload.descriptionJson) } }
      : {}),
    objective: typeof payload.objective === "string" ? payload.objective : "",
    instructionsMarkdown:
      typeof payload.instructionsMarkdown === "string" ? payload.instructionsMarkdown : "",
    harnessSelection: {
      harness: asRecord(payload.harnessSelection)?.harness === "opencode" ? "opencode" : "opencode",
      ...(typeof asRecord(payload.harnessSelection)?.agent === "string"
        ? { agent: asRecord(payload.harnessSelection)?.agent as string }
        : {}),
      ...(asRecord(payload.harnessSelection?.model) &&
      typeof asRecord(payload.harnessSelection?.model)?.provider === "string" &&
      typeof asRecord(payload.harnessSelection?.model)?.model === "string"
        ? {
            model: {
              provider: asRecord(payload.harnessSelection?.model)?.provider as string,
              model: asRecord(payload.harnessSelection?.model)?.model as string,
            },
          }
        : {}),
    },
    explicitReadGrants: Array.isArray(payload.explicitReadGrants)
      ? payload.explicitReadGrants
          .map((entry) => asRecord(entry)?.contextFactDefinitionId)
          .filter((value): value is string => typeof value === "string")
          .map((contextFactDefinitionId) => ({ contextFactDefinitionId }))
      : [],
    writeItems,
    completionRequirements: Array.isArray(payload.completionRequirements)
      ? payload.completionRequirements
          .map((entry) => asRecord(entry)?.contextFactDefinitionId)
          .filter((value): value is string => typeof value === "string")
          .map((contextFactDefinitionId) => ({ contextFactDefinitionId }))
      : [],
    runtimePolicy: {
      sessionStart:
        asRecord(payload.runtimePolicy)?.sessionStart === "explicit" ? "explicit" : "explicit",
      continuationMode:
        asRecord(payload.runtimePolicy)?.continuationMode === "bootstrap_only"
          ? "bootstrap_only"
          : "bootstrap_only",
      liveStreamCount: asRecord(payload.runtimePolicy)?.liveStreamCount === 1 ? 1 : 1,
      nativeMessageLog: false,
      persistedWritePolicy: "applied_only",
    },
    guidance: {
      human: { markdown: readMarkdown(asRecord(payload.guidance)?.human) },
      agent: { markdown: readMarkdown(asRecord(payload.guidance)?.agent) },
    },
  };
}

function toInvokeBindings(rawBindings: unknown) {
  if (!Array.isArray(rawBindings)) {
    return [];
  }

  return rawBindings.flatMap((entry) => {
    const binding = asRecord(entry);
    const destination = asRecord(binding?.destination);
    const source = asRecord(binding?.source);
    if (!binding || !destination || !source) {
      return [];
    }

    const parsedDestination =
      destination.kind === "work_unit_fact" &&
      typeof destination.workUnitFactDefinitionId === "string"
        ? {
            kind: "work_unit_fact" as const,
            workUnitFactDefinitionId: destination.workUnitFactDefinitionId,
          }
        : destination.kind === "artifact_slot" &&
            typeof destination.artifactSlotDefinitionId === "string"
          ? {
              kind: "artifact_slot" as const,
              artifactSlotDefinitionId: destination.artifactSlotDefinitionId,
            }
          : null;
    const parsedSource =
      source.kind === "context_fact" && typeof source.contextFactDefinitionId === "string"
        ? {
            kind: "context_fact" as const,
            contextFactDefinitionId: source.contextFactDefinitionId,
          }
        : source.kind === "literal" &&
            (typeof source.value === "string" ||
              typeof source.value === "number" ||
              typeof source.value === "boolean")
          ? { kind: "literal" as const, value: source.value }
          : source.kind === "runtime"
            ? { kind: "runtime" as const }
            : null;

    if (!parsedDestination || !parsedSource) {
      return [];
    }

    return [
      {
        destination: parsedDestination,
        source: parsedSource,
      },
    ];
  });
}

function toInvokeActivationTransitions(rawTransitions: unknown) {
  if (!Array.isArray(rawTransitions)) {
    return [];
  }

  return rawTransitions.flatMap((entry) => {
    const transition = asRecord(entry);
    if (!transition || typeof transition.transitionId !== "string") {
      return [];
    }

    return [
      {
        transitionId: transition.transitionId,
        workflowDefinitionIds: Array.isArray(transition.workflowDefinitionIds)
          ? transition.workflowDefinitionIds.filter(
              (workflowDefinitionId): workflowDefinitionId is string =>
                typeof workflowDefinitionId === "string",
            )
          : [],
      },
    ];
  });
}

function toWorkflowInvokePayload(rawPayload: unknown): WorkflowInvokeStepPayload | null {
  const payload = asRecord(rawPayload);
  if (!payload || typeof payload.key !== "string") {
    return null;
  }

  const base = {
    key: payload.key,
    ...(typeof payload.label === "string" ? { label: payload.label } : {}),
    ...(readMarkdown(payload.descriptionJson)
      ? { descriptionJson: { markdown: readMarkdown(payload.descriptionJson) } }
      : {}),
    guidance: {
      human: { markdown: readMarkdown(asRecord(payload.guidanceJson ?? payload.guidance)?.human) },
      agent: { markdown: readMarkdown(asRecord(payload.guidanceJson ?? payload.guidance)?.agent) },
    },
  };

  if (payload.targetKind === "workflow" && payload.sourceMode === "fixed_set") {
    return {
      ...base,
      targetKind: "workflow",
      sourceMode: "fixed_set",
      workflowDefinitionIds: Array.isArray(payload.workflowDefinitionIds)
        ? payload.workflowDefinitionIds.filter(
            (workflowDefinitionId): workflowDefinitionId is string =>
              typeof workflowDefinitionId === "string",
          )
        : [],
    };
  }

  if (
    payload.targetKind === "workflow" &&
    payload.sourceMode === "context_fact_backed" &&
    typeof payload.contextFactDefinitionId === "string"
  ) {
    return {
      ...base,
      targetKind: "workflow",
      sourceMode: "context_fact_backed",
      contextFactDefinitionId: payload.contextFactDefinitionId,
    };
  }

  if (
    payload.targetKind === "work_unit" &&
    payload.sourceMode === "fixed_set" &&
    typeof payload.workUnitDefinitionId === "string"
  ) {
    return {
      ...base,
      targetKind: "work_unit",
      sourceMode: "fixed_set",
      workUnitDefinitionId: payload.workUnitDefinitionId,
      bindings: toInvokeBindings(payload.bindings),
      activationTransitions: toInvokeActivationTransitions(payload.activationTransitions),
    };
  }

  if (
    payload.targetKind === "work_unit" &&
    payload.sourceMode === "context_fact_backed" &&
    typeof payload.contextFactDefinitionId === "string"
  ) {
    return {
      ...base,
      targetKind: "work_unit",
      sourceMode: "context_fact_backed",
      contextFactDefinitionId: payload.contextFactDefinitionId,
      bindings: toInvokeBindings(payload.bindings),
      activationTransitions: toInvokeActivationTransitions(payload.activationTransitions),
    };
  }

  return null;
}

function toWorkflowBranchPayload(rawPayload: unknown): WorkflowBranchStepPayload | null {
  const payload = asRecord(rawPayload);
  if (!payload || typeof payload.key !== "string") {
    return null;
  }

  const guidance = readGuidance(payload.guidanceJson ?? payload.guidance);

  return {
    key: payload.key,
    ...(typeof payload.label === "string" ? { label: payload.label } : {}),
    ...(readMarkdown(payload.descriptionJson)
      ? { descriptionJson: { markdown: readMarkdown(payload.descriptionJson) } }
      : {}),
    guidance: {
      human: { markdown: guidance.humanMarkdown },
      agent: { markdown: guidance.agentMarkdown },
    },
    defaultTargetStepId:
      typeof payload.defaultTargetStepId === "string" &&
      payload.defaultTargetStepId.trim().length > 0
        ? payload.defaultTargetStepId
        : null,
    routes: Array.isArray(payload.routes)
      ? payload.routes.flatMap((rawRoute) => {
          const route = asRecord(rawRoute);
          if (
            !route ||
            typeof route.routeId !== "string" ||
            typeof route.targetStepId !== "string" ||
            (route.conditionMode !== "all" && route.conditionMode !== "any")
          ) {
            return [];
          }

          return [
            {
              routeId: route.routeId,
              targetStepId: route.targetStepId,
              conditionMode: route.conditionMode,
              groups: Array.isArray(route.groups)
                ? route.groups.flatMap((rawGroup) => {
                    const group = asRecord(rawGroup);
                    if (
                      !group ||
                      typeof group.groupId !== "string" ||
                      (group.mode !== "all" && group.mode !== "any")
                    ) {
                      return [];
                    }

                    return [
                      {
                        groupId: group.groupId,
                        mode: group.mode,
                        conditions: Array.isArray(group.conditions)
                          ? group.conditions.flatMap((rawCondition) => {
                              const condition = asRecord(rawCondition);

                              if (
                                !condition ||
                                typeof condition.conditionId !== "string" ||
                                typeof condition.contextFactDefinitionId !== "string" ||
                                typeof condition.operator !== "string"
                              ) {
                                return [];
                              }

                              return [
                                {
                                  conditionId: condition.conditionId,
                                  contextFactDefinitionId: condition.contextFactDefinitionId,
                                  subFieldKey:
                                    typeof condition.subFieldKey === "string" &&
                                    condition.subFieldKey.trim().length > 0
                                      ? condition.subFieldKey
                                      : null,
                                  operator:
                                    condition.operator === "stale" ? "fresh" : condition.operator,
                                  isNegated:
                                    condition.operator === "stale"
                                      ? true
                                      : condition.isNegated === true,
                                  comparisonJson:
                                    typeof condition.comparisonJson === "undefined"
                                      ? null
                                      : condition.comparisonJson,
                                },
                              ];
                            })
                          : [],
                      },
                    ];
                  })
                : [],
            },
          ];
        })
      : [],
  };
}

function toWorkflowSteps(
  rawSteps: unknown,
  rawFormDefinitions: unknown,
  rawAgentStepDefinitions: unknown,
): WorkflowEditorStep[] {
  const definitionsByStepId = new Map<string, WorkflowFormStepPayload>();
  const agentDefinitionsByStepId = new Map<string, WorkflowAgentStepPayload>();

  if (Array.isArray(rawFormDefinitions)) {
    rawFormDefinitions.forEach((entry) => {
      const definition = asRecord(entry);
      if (!definition || typeof definition.stepId !== "string") {
        return;
      }

      const payload = toWorkflowFormPayload(definition.payload);
      if (payload) {
        definitionsByStepId.set(definition.stepId, payload);
      }
    });
  }

  if (Array.isArray(rawAgentStepDefinitions)) {
    rawAgentStepDefinitions.forEach((entry) => {
      const definition = asRecord(entry);
      if (!definition || typeof definition.step?.stepId !== "string") {
        return;
      }

      const payload = toWorkflowAgentPayload(definition.payload);
      if (payload) {
        agentDefinitionsByStepId.set(definition.step.stepId, payload);
      }
    });
  }

  const stepsFromWorkflow = Array.isArray(rawSteps)
    ? rawSteps
        .map((rawStep, index): WorkflowEditorStep | null => {
          const step = asRecord(rawStep);
          if (!step) {
            return null;
          }

          const stepId = typeof step.stepId === "string" ? step.stepId : `step-${index}`;

          if (step.stepType === "form" || step.type === "form") {
            const payload = toWorkflowFormPayload(step.payload) ?? definitionsByStepId.get(stepId);
            if (!payload) {
              return null;
            }

            return {
              stepId,
              stepType: "form",
              payload,
            };
          }

          if (step.stepType === "agent" || step.type === "agent") {
            const payload = agentDefinitionsByStepId.get(stepId);
            if (!payload) {
              return {
                stepId,
                stepType: "agent",
                payload: {
                  key: `agent-${index + 1}`,
                  label: "Agent Step",
                  descriptionJson:
                    typeof step.defaultMessage === "string"
                      ? { markdown: step.defaultMessage }
                      : undefined,
                  objective: "",
                  instructionsMarkdown: "",
                  harnessSelection: { harness: "opencode" },
                  explicitReadGrants: [],
                  writeItems: [],
                  completionRequirements: [],
                  runtimePolicy: {
                    sessionStart: "explicit",
                    continuationMode: "bootstrap_only",
                    liveStreamCount: 1,
                    nativeMessageLog: false,
                    persistedWritePolicy: "applied_only",
                  },
                  guidance: {
                    human: { markdown: "" },
                    agent: { markdown: "" },
                  },
                },
              };
            }

            return {
              stepId,
              stepType: "agent",
              payload,
            };
          }

          if (step.stepType === "invoke" || step.type === "invoke") {
            const payload = toWorkflowInvokePayload(step.payload);
            if (!payload) {
              return null;
            }

            return {
              stepId,
              stepType: "invoke",
              payload,
            };
          }

          if (step.stepType === "branch" || step.type === "branch") {
            const payload = toWorkflowBranchPayload(step.payload);
            if (!payload) {
              return null;
            }

            return {
              stepId,
              stepType: "branch",
              payload,
            };
          }

          return null;
        })
        .filter((step): step is WorkflowEditorStep => step !== null)
    : [];

  if (stepsFromWorkflow.length > 0) {
    return stepsFromWorkflow;
  }

  return [...definitionsByStepId.entries()].map(([stepId, payload]) => ({
    stepId,
    stepType: "form",
    payload,
  }));
}

function toWorkflowEdges(rawEdges: unknown): WorkflowEditorEdge[] {
  if (!Array.isArray(rawEdges)) {
    return [];
  }

  return rawEdges
    .map((rawEdge, index): WorkflowEditorEdge | null => {
      const edge = asRecord(rawEdge);
      if (!edge) {
        return null;
      }

      if (typeof edge.fromStepKey !== "string" || typeof edge.toStepKey !== "string") {
        return null;
      }

      const projectedMetadata = parseBranchProjectedEdgeMetadata(edge.descriptionJson);

      return {
        edgeId:
          typeof edge.edgeId === "string"
            ? edge.edgeId
            : typeof edge.edgeKey === "string"
              ? edge.edgeKey
              : `edge-${index}`,
        fromStepKey: edge.fromStepKey,
        toStepKey: edge.toStepKey,
        descriptionMarkdown: projectedMetadata ? "" : readMarkdown(edge.descriptionJson),
        ...projectedMetadata,
      };
    })
    .filter((edge): edge is WorkflowEditorEdge => edge !== null);
}

function toContextFactDefinitions(
  rawFacts: unknown,
  rawWorkUnits: unknown,
): WorkflowContextFactDefinitionItem[] {
  if (!Array.isArray(rawFacts)) {
    return [];
  }

  return rawFacts
    .map((entry): WorkflowContextFactDefinitionItem | null => {
      const value = asRecord(entry);
      if (!value) {
        return null;
      }

      const kind = normalizeContextFactKind(value.kind);
      if (!kind || typeof value.key !== "string") {
        return null;
      }

      const cardinality = value.cardinality === "many" ? "many" : "one";
      const item: WorkflowContextFactDefinitionItem = {
        contextFactDefinitionId:
          typeof value.contextFactDefinitionId === "string"
            ? value.contextFactDefinitionId
            : typeof value.factKey === "string"
              ? value.factKey
              : value.key,
        key: value.key,
        label:
          typeof value.label === "string"
            ? value.label
            : typeof value.displayName === "string"
              ? value.displayName
              : value.key,
        descriptionMarkdown:
          readMarkdown(value.descriptionJson) ||
          readMarkdown(value.description) ||
          readMarkdown(value.summaryJson),
        kind: kind as WorkflowContextFactDefinitionItem["kind"],
        cardinality,
        guidance: readGuidance(value.guidanceJson ?? value.guidance),
        allowedWorkflowDefinitionIds: Array.isArray(value.allowedWorkflowDefinitionIds)
          ? value.allowedWorkflowDefinitionIds.filter(
              (workflowId): workflowId is string => typeof workflowId === "string",
            )
          : [],
        includedFactDefinitionIds: Array.isArray(value.includedFactDefinitionIds)
          ? value.includedFactDefinitionIds.filter(
              (factId): factId is string => typeof factId === "string",
            )
          : Array.isArray(value.fields)
            ? value.fields
                .map((field) => asRecord(field)?.id)
                .filter((factId): factId is string => typeof factId === "string")
            : [],
        selectedWorkUnitFactDefinitionIds: Array.isArray(value.selectedWorkUnitFactDefinitionIds)
          ? value.selectedWorkUnitFactDefinitionIds.filter(
              (factId): factId is string => typeof factId === "string",
            )
          : Array.isArray(value.includedFactDefinitionIds)
            ? value.includedFactDefinitionIds.filter(
                (factId): factId is string => typeof factId === "string",
              )
            : [],
        selectedArtifactSlotDefinitionIds: Array.isArray(value.selectedArtifactSlotDefinitionIds)
          ? value.selectedArtifactSlotDefinitionIds.filter(
              (slotId): slotId is string => typeof slotId === "string",
            )
          : [],
        validationJson:
          typeof value.validationJson === "undefined" ? value.validation : value.validationJson,
        summary: typeof value.summary === "string" ? value.summary : "",
      };

      if (
        value.valueType === "string" ||
        value.valueType === "number" ||
        value.valueType === "boolean" ||
        value.valueType === "json"
      ) {
        item.valueType = value.valueType;
      }

      if (typeof value.externalFactDefinitionId === "string") {
        item.externalFactDefinitionId = value.externalFactDefinitionId;
      }

      if (typeof value.artifactSlotDefinitionId === "string") {
        item.artifactSlotDefinitionId = value.artifactSlotDefinitionId;
      } else if (typeof value.artifactSlotKey === "string") {
        item.artifactSlotDefinitionId = value.artifactSlotKey;
      }

      if (kind === "work_unit_draft_spec_fact") {
        const resolvedWorkUnitDefinitionId =
          typeof value.workUnitDefinitionId === "string" &&
          value.workUnitDefinitionId.trim().length > 0
            ? value.workUnitDefinitionId.trim()
            : inferWorkUnitTypeIdentifierFromDraftSpecFactDefinitionIds(
                rawWorkUnits,
                item.selectedWorkUnitFactDefinitionIds,
              );

        item.workUnitDefinitionId = resolvedWorkUnitDefinitionId;
        item.workUnitTypeKey = resolvedWorkUnitDefinitionId;
        item.includedFactDefinitionIds = item.selectedWorkUnitFactDefinitionIds;
      }

      return {
        ...item,
        summary: item.summary || summarizeContextFact(item),
      };
    })
    .filter((item): item is WorkflowContextFactDefinitionItem => item !== null);
}

function toContextFactMutationPayload(draft: WorkflowContextFactDraft) {
  const descriptionMarkdown = draft.descriptionMarkdown.trim();
  const humanMarkdown = draft.guidance.humanMarkdown.trim();
  const agentMarkdown = draft.guidance.agentMarkdown.trim();

  const base = {
    kind: draft.kind,
    key: draft.key.trim(),
    label: draft.label.trim() || undefined,
    cardinality: draft.cardinality,
    ...(descriptionMarkdown.length > 0
      ? {
          descriptionJson: { markdown: descriptionMarkdown },
        }
      : {}),
    guidance: {
      human: { markdown: humanMarkdown },
      agent: { markdown: agentMarkdown },
    },
  };

  switch (draft.kind) {
    case "plain_value_fact":
      return {
        ...base,
        valueType: draft.valueType ?? "string",
        ...(typeof draft.validationJson === "undefined"
          ? {}
          : {
              validationJson: draft.validationJson,
            }),
      };
    case "definition_backed_external_fact":
    case "bound_external_fact":
      return {
        ...base,
        externalFactDefinitionId: draft.externalFactDefinitionId?.trim() ?? "",
      };
    case "workflow_reference_fact":
      return {
        ...base,
        allowedWorkflowDefinitionIds: draft.allowedWorkflowDefinitionIds,
      };
    case "artifact_reference_fact":
      return {
        ...base,
        artifactSlotDefinitionId: draft.artifactSlotDefinitionId?.trim() ?? "",
      };
    case "work_unit_draft_spec_fact":
      return {
        ...base,
        workUnitDefinitionId:
          draft.workUnitDefinitionId?.trim() ?? draft.workUnitTypeKey?.trim() ?? "",
        selectedWorkUnitFactDefinitionIds:
          draft.selectedWorkUnitFactDefinitionIds.length > 0
            ? draft.selectedWorkUnitFactDefinitionIds
            : draft.includedFactDefinitionIds,
        selectedArtifactSlotDefinitionIds: draft.selectedArtifactSlotDefinitionIds,
      };
  }
}

function toFormStepMutationPayload(payload: WorkflowFormStepPayload) {
  const descriptionMarkdown = readMarkdown(payload.descriptionJson);

  return {
    key: payload.key,
    ...(typeof payload.label === "string" ? { label: payload.label } : {}),
    ...(descriptionMarkdown ? { descriptionJson: { markdown: descriptionMarkdown } } : {}),
    guidance: {
      human: { markdown: payload.guidance.humanMarkdown },
      agent: { markdown: payload.guidance.agentMarkdown },
    },
    fields: payload.fields,
  };
}

function toAgentStepMutationPayload(payload: WorkflowAgentStepPayload) {
  const descriptionMarkdown = readMarkdown(payload.descriptionJson);

  return {
    key: payload.key,
    ...(typeof payload.label === "string" && payload.label.trim().length > 0
      ? { label: payload.label }
      : {}),
    ...(descriptionMarkdown ? { descriptionJson: { markdown: descriptionMarkdown } } : {}),
    objective: payload.objective,
    instructionsMarkdown: payload.instructionsMarkdown,
    harnessSelection: payload.harnessSelection,
    explicitReadGrants: payload.explicitReadGrants,
    writeItems: payload.writeItems,
    completionRequirements: payload.completionRequirements,
    runtimePolicy: payload.runtimePolicy,
    guidance: payload.guidance,
  };
}

function toInvokeStepMutationPayload(payload: WorkflowInvokeStepPayload) {
  const descriptionMarkdown = readMarkdown(payload.descriptionJson);

  if (payload.targetKind === "workflow" && payload.sourceMode === "fixed_set") {
    return {
      key: payload.key,
      ...(typeof payload.label === "string" && payload.label.trim().length > 0
        ? { label: payload.label }
        : {}),
      ...(descriptionMarkdown ? { descriptionJson: { markdown: descriptionMarkdown } } : {}),
      guidance: payload.guidance,
      targetKind: "workflow",
      sourceMode: "fixed_set",
      workflowDefinitionIds: payload.workflowDefinitionIds,
    };
  }

  if (payload.targetKind === "workflow") {
    return {
      key: payload.key,
      ...(typeof payload.label === "string" && payload.label.trim().length > 0
        ? { label: payload.label }
        : {}),
      ...(descriptionMarkdown ? { descriptionJson: { markdown: descriptionMarkdown } } : {}),
      guidance: payload.guidance,
      targetKind: "workflow",
      sourceMode: "context_fact_backed",
      contextFactDefinitionId: payload.contextFactDefinitionId,
    };
  }

  if (payload.sourceMode === "fixed_set") {
    return {
      key: payload.key,
      ...(typeof payload.label === "string" && payload.label.trim().length > 0
        ? { label: payload.label }
        : {}),
      ...(descriptionMarkdown ? { descriptionJson: { markdown: descriptionMarkdown } } : {}),
      guidance: payload.guidance,
      targetKind: "work_unit",
      sourceMode: "fixed_set",
      workUnitDefinitionId: payload.workUnitDefinitionId,
      bindings: payload.bindings,
      activationTransitions: payload.activationTransitions,
    };
  }

  return {
    key: payload.key,
    ...(typeof payload.label === "string" && payload.label.trim().length > 0
      ? { label: payload.label }
      : {}),
    ...(descriptionMarkdown ? { descriptionJson: { markdown: descriptionMarkdown } } : {}),
    guidance: payload.guidance,
    targetKind: "work_unit",
    sourceMode: "context_fact_backed",
    contextFactDefinitionId: payload.contextFactDefinitionId,
    bindings: payload.bindings,
    activationTransitions: payload.activationTransitions,
  };
}

function toBranchStepMutationPayload(payload: WorkflowBranchStepPayload) {
  const descriptionMarkdown = readMarkdown(payload.descriptionJson);

  return {
    key: payload.key,
    ...(typeof payload.label === "string" && payload.label.trim().length > 0
      ? { label: payload.label }
      : {}),
    ...(descriptionMarkdown ? { descriptionJson: { markdown: descriptionMarkdown } } : {}),
    guidance: payload.guidance,
    defaultTargetStepId: payload.defaultTargetStepId,
    routes: payload.routes.map((route) => ({
      ...route,
      groups: route.groups.map((group) => ({
        ...group,
        conditions: group.conditions.map((condition) => ({
          ...condition,
          subFieldKey:
            typeof condition.subFieldKey === "string" && condition.subFieldKey.trim().length > 0
              ? condition.subFieldKey.trim()
              : null,
        })),
      })),
    })),
  };
}

function getFactDefinitionEntries(rawFactDefinitions: unknown) {
  const record = asRecord(rawFactDefinitions);
  return Array.isArray(record?.factDefinitions)
    ? record.factDefinitions
    : Array.isArray(record?.factSchemas)
      ? record.factSchemas
      : Array.isArray(rawFactDefinitions)
        ? rawFactDefinitions
        : [];
}

function getWorkUnitEntries(rawWorkUnits: unknown) {
  const record = asRecord(rawWorkUnits);
  return Array.isArray(record?.workUnitTypes)
    ? record.workUnitTypes
    : Array.isArray(rawWorkUnits)
      ? rawWorkUnits
      : [];
}

function getWorkUnitFactEntries(rawWorkUnits: unknown, workUnitTypeIdentifier: string) {
  const matchedWorkUnit = getWorkUnitEntries(rawWorkUnits).find((entry) => {
    const workUnit = asRecord(entry);
    return (
      workUnit &&
      (workUnit.key === workUnitTypeIdentifier || workUnit.id === workUnitTypeIdentifier)
    );
  });
  const workUnit = asRecord(matchedWorkUnit);

  return Array.isArray(workUnit?.factSchemas) ? workUnit.factSchemas : [];
}

function normalizePickerFactType(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  switch (value) {
    case "string":
    case "number":
    case "boolean":
    case "json":
      return value;
    case "work_unit":
    case "work unit":
      return "work unit";
    default:
      return null;
  }
}

function getWorkUnitTypeLabel(rawWorkUnits: unknown, workUnitTypeIdentifier: string) {
  const matchedWorkUnit = getWorkUnitEntries(rawWorkUnits).find((entry) => {
    const workUnit = asRecord(entry);
    return (
      workUnit &&
      (workUnit.key === workUnitTypeIdentifier || workUnit.id === workUnitTypeIdentifier)
    );
  });
  const workUnit = asRecord(matchedWorkUnit);

  if (!workUnit) {
    return null;
  }

  if (typeof workUnit.displayName === "string" && workUnit.displayName.trim().length > 0) {
    return workUnit.displayName.trim();
  }

  if (typeof workUnit.name === "string" && workUnit.name.trim().length > 0) {
    return workUnit.name.trim();
  }

  return typeof workUnit.key === "string" && workUnit.key.trim().length > 0
    ? workUnit.key.trim()
    : null;
}

function resolveWorkUnitTypeKey(rawWorkUnits: unknown, workUnitTypeIdentifier: string) {
  const normalizedIdentifier = workUnitTypeIdentifier.trim();
  if (normalizedIdentifier.length === 0) {
    return null;
  }

  const matchedWorkUnit = getWorkUnitEntries(rawWorkUnits).find((entry) => {
    const workUnit = asRecord(entry);
    return (
      workUnit && (workUnit.key === normalizedIdentifier || workUnit.id === normalizedIdentifier)
    );
  });
  const workUnit = asRecord(matchedWorkUnit);

  return typeof workUnit?.key === "string" && workUnit.key.trim().length > 0
    ? workUnit.key.trim()
    : null;
}

function getFactTypeBadgeTone(
  type: ReturnType<typeof normalizePickerFactType>,
): WorkflowEditorPickerBadge["tone"] {
  switch (type) {
    case "string":
      return "type-string";
    case "number":
      return "type-number";
    case "boolean":
      return "type-boolean";
    case "json":
      return "type-json";
    case "work unit":
      return "type-work-unit";
    default:
      return "cardinality";
  }
}

function toFactOptions(
  rawFactDefinitions: unknown,
  fallbackDescription: string,
  rawWorkUnits: unknown,
  source: "methodology" | "current_work_unit",
  mode: "key" | "id" = "key",
): WorkflowEditorPickerOption[] {
  const facts = getFactDefinitionEntries(rawFactDefinitions);

  return facts
    .map((entry) => {
      const value = asRecord(entry);
      if (!value || typeof value.key !== "string") {
        return null;
      }

      const label =
        typeof value.name === "string" && value.name.trim().length > 0
          ? value.name.trim()
          : typeof value.label === "string" && value.label.trim().length > 0
            ? value.label.trim()
            : typeof value.displayName === "string" && value.displayName.trim().length > 0
              ? value.displayName.trim()
              : value.key;
      const optionValue =
        mode === "id"
          ? typeof value.id === "string" && value.id.trim().length > 0
            ? value.id.trim()
            : typeof value.factDefinitionId === "string" && value.factDefinitionId.trim().length > 0
              ? value.factDefinitionId.trim()
              : typeof value.definitionId === "string" && value.definitionId.trim().length > 0
                ? value.definitionId.trim()
                : value.key
          : value.key;

      const description = readMarkdown(value.descriptionJson) || readMarkdown(value.description);
      const cardinality =
        value.cardinality === "one" || value.cardinality === "many" ? value.cardinality : null;
      const factType = normalizePickerFactType(value.valueType ?? value.factType);
      const workUnitTypeKey =
        typeof value.workUnitTypeKey === "string" && value.workUnitTypeKey.trim().length > 0
          ? value.workUnitTypeKey.trim()
          : null;
      const workUnitTypeLabel =
        factType === "work unit" && workUnitTypeKey
          ? getWorkUnitTypeLabel(rawWorkUnits, workUnitTypeKey)
          : null;
      const badges: WorkflowEditorPickerBadge[] = [
        {
          label: source === "methodology" ? "Methodology" : "Current Work Unit",
          tone: source === "methodology" ? "source-methodology" : "source-current-work-unit",
        },
        ...(cardinality ? [{ label: cardinality, tone: "cardinality" as const }] : []),
        ...(factType ? [{ label: factType, tone: getFactTypeBadgeTone(factType) }] : []),
        ...(workUnitTypeLabel
          ? [{ label: workUnitTypeLabel, tone: "work-unit-definition" as const }]
          : []),
      ];
      const searchText = [
        value.key,
        label,
        description,
        fallbackDescription,
        workUnitTypeKey,
        ...badges.map((badge) => badge.label),
      ]
        .filter((segment): segment is string => typeof segment === "string" && segment.length > 0)
        .join(" ");

      return {
        value: optionValue,
        label,
        secondaryLabel: value.key,
        description: description || fallbackDescription,
        searchText,
        badges,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function toMethodologyFactOptions(rawFactDefinitions: unknown, rawWorkUnits: unknown) {
  return toFactOptions(rawFactDefinitions, "Methodology fact", rawWorkUnits, "methodology");
}

function toWorkUnitFactOptions(rawWorkUnits: unknown, workUnitTypeKey: string) {
  return toFactOptions(
    getWorkUnitFactEntries(rawWorkUnits, workUnitTypeKey),
    "Work unit fact",
    rawWorkUnits,
    "current_work_unit",
  );
}

function toWorkUnitDraftSpecFactOptions(rawWorkUnits: unknown, workUnitTypeIdentifier: string) {
  return toFactOptions(
    getWorkUnitFactEntries(rawWorkUnits, workUnitTypeIdentifier),
    "Work unit fact",
    rawWorkUnits,
    "current_work_unit",
    "id",
  );
}

function toInvokeWorkUnitFactDefinitions(
  rawWorkUnits: unknown,
  workUnitTypeIdentifier: string,
): WorkflowInvokeWorkUnitFactDefinition[] {
  return getWorkUnitFactEntries(rawWorkUnits, workUnitTypeIdentifier)
    .map((entry) => {
      const fact = asRecord(entry);
      if (!fact || typeof fact.key !== "string") {
        return null;
      }

      const factType =
        fact.factType === "string" ||
        fact.factType === "number" ||
        fact.factType === "boolean" ||
        fact.factType === "json" ||
        fact.factType === "work_unit"
          ? fact.factType
          : null;
      if (!factType) {
        return null;
      }

      return {
        id:
          typeof fact.id === "string" && fact.id.trim().length > 0
            ? fact.id.trim()
            : typeof fact.factDefinitionId === "string" && fact.factDefinitionId.trim().length > 0
              ? fact.factDefinitionId.trim()
              : fact.key,
        key: fact.key,
        label:
          typeof fact.name === "string" && fact.name.trim().length > 0
            ? fact.name.trim()
            : typeof fact.label === "string" && fact.label.trim().length > 0
              ? fact.label.trim()
              : fact.key,
        factType,
        cardinality: fact.cardinality === "many" ? "many" : "one",
        validationJson: fact.validationJson ?? fact.validation ?? null,
      } satisfies WorkflowInvokeWorkUnitFactDefinition;
    })
    .filter((entry): entry is WorkflowInvokeWorkUnitFactDefinition => entry !== null);
}

function toWorkUnitTypeOptions(rawWorkUnits: unknown) {
  const workUnitTypes = getWorkUnitEntries(rawWorkUnits);

  return workUnitTypes
    .map((entry) => {
      const workUnit = asRecord(entry);
      if (!workUnit || typeof workUnit.key !== "string") {
        return null;
      }

      const label =
        typeof workUnit.displayName === "string" && workUnit.displayName.trim().length > 0
          ? workUnit.displayName.trim()
          : workUnit.key;
      const description =
        readMarkdown(workUnit.descriptionJson) ||
        readMarkdown(workUnit.description) ||
        (typeof workUnit.cardinality === "string"
          ? workUnit.cardinality.replaceAll("_", " ")
          : "") ||
        "Work unit";

      return {
        value:
          typeof workUnit.id === "string" && workUnit.id.trim().length > 0
            ? workUnit.id
            : workUnit.key,
        label,
        secondaryLabel: workUnit.key,
        description,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function toArtifactSlotOptions(rawArtifactSlots: unknown) {
  const record = asRecord(rawArtifactSlots);
  const slots = Array.isArray(rawArtifactSlots)
    ? rawArtifactSlots
    : Array.isArray(record?.artifactSlots)
      ? record.artifactSlots
      : [];

  return slots
    .map((entry) => {
      const slot = asRecord(entry);
      if (!slot || typeof slot.key !== "string") {
        return null;
      }

      const cardinality =
        typeof slot.cardinality === "string" ? slot.cardinality.replaceAll("_", " ") : null;
      const slotDefinitionId =
        typeof slot.id === "string" && slot.id.trim().length > 0
          ? slot.id.trim()
          : typeof slot.artifactSlotDefinitionId === "string" &&
              slot.artifactSlotDefinitionId.trim().length > 0
            ? slot.artifactSlotDefinitionId.trim()
            : typeof slot.definitionId === "string" && slot.definitionId.trim().length > 0
              ? slot.definitionId.trim()
              : slot.key;

      return {
        value: slotDefinitionId,
        label:
          typeof slot.displayName === "string" && slot.displayName.trim().length > 0
            ? slot.displayName.trim()
            : slot.key,
        secondaryLabel: slot.key,
        description: readMarkdown(slot.description) || "Artifact slot",
        badges: cardinality ? [{ label: cardinality, tone: "cardinality" as const }] : [],
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        value: string;
        label: string;
        description: string;
        badges: { label: string; tone: "cardinality" }[];
      } => entry !== null,
    );
}

function toInvokeArtifactSlotDefinitions(
  rawArtifactSlots: unknown,
): WorkflowInvokeArtifactSlotDefinition[] {
  return toArtifactSlotOptions(rawArtifactSlots).map((slot) => ({
    id: slot.value,
    key: slot.secondaryLabel ?? slot.value,
    label: slot.label,
    cardinality: slot.badges?.some((badge) => badge.label === "fileset")
      ? ("fileset" as const)
      : ("single" as const),
  }));
}

function toWorkflowOptions(rawWorkflows: unknown) {
  const record = asRecord(rawWorkflows);
  const workflows = Array.isArray(record?.workflows)
    ? record.workflows
    : Array.isArray(rawWorkflows)
      ? rawWorkflows
      : [];

  return workflows
    .map((entry) => {
      const workflow = asRecord(entry);
      if (!workflow) {
        return null;
      }

      const value =
        typeof workflow.workflowDefinitionId === "string" &&
        workflow.workflowDefinitionId.trim().length > 0
          ? workflow.workflowDefinitionId
          : typeof workflow.key === "string" && workflow.key.trim().length > 0
            ? workflow.key
            : null;

      if (!value) {
        return null;
      }

      return {
        value,
        label:
          typeof workflow.displayName === "string" && workflow.displayName.trim().length > 0
            ? workflow.displayName
            : value,
        secondaryLabel:
          typeof workflow.key === "string" && workflow.key.trim().length > 0
            ? workflow.key
            : undefined,
        description:
          readMarkdown(workflow.descriptionJson) ||
          readMarkdown(workflow.description) ||
          readMarkdown(workflow.guidanceJson) ||
          "Workflow",
      };
    })
    .filter(
      (entry): entry is { value: string; label: string; description: string } => entry !== null,
    );
}

function toTransitionOptions(rawTransitions: unknown) {
  const transitions = Array.isArray(rawTransitions) ? rawTransitions : [];

  return transitions
    .map((entry) => {
      const transition = asRecord(entry);
      const transitionIdentifier =
        typeof transition?.transitionId === "string" && transition.transitionId.trim().length > 0
          ? transition.transitionId
          : typeof transition?.id === "string" && transition.id.trim().length > 0
            ? transition.id
            : null;
      if (!transition || !transitionIdentifier) {
        return null;
      }

      const label =
        typeof transition.transitionName === "string" && transition.transitionName.trim().length > 0
          ? transition.transitionName
          : typeof transition.transitionKey === "string" &&
              transition.transitionKey.trim().length > 0
            ? transition.transitionKey
            : (transition.transitionId ?? transition.id);

      return {
        value: transitionIdentifier,
        label,
        secondaryLabel:
          typeof transition.transitionKey === "string" ? transition.transitionKey : undefined,
        description:
          typeof transition.transitionKey === "string" && transition.transitionKey.trim().length > 0
            ? transition.transitionKey
            : "Lifecycle transition",
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        value: string;
        label: string;
        secondaryLabel?: string;
        description: string;
      } => entry !== null,
    );
}

function resolveTransitionKey(rawTransitions: unknown, transitionIdentifier: string) {
  const normalizedIdentifier = transitionIdentifier.trim();
  if (normalizedIdentifier.length === 0) {
    return null;
  }

  const transitions = Array.isArray(rawTransitions) ? rawTransitions : [];
  const matched = transitions
    .map((entry) => asRecord(entry))
    .find(
      (transition) =>
        transition &&
        ((typeof transition.transitionId === "string" &&
          transition.transitionId.trim() === normalizedIdentifier) ||
          (typeof transition.id === "string" && transition.id.trim() === normalizedIdentifier)),
    );

  return matched &&
    typeof matched.transitionKey === "string" &&
    matched.transitionKey.trim().length > 0
    ? matched.transitionKey.trim()
    : null;
}

export function MethodologyWorkflowEditorRoute() {
  const { methodologyId, versionId, workUnitKey, workflowDefinitionId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();

  const workflowProcedures = orpc.methodology.version.workUnit.workflow as unknown as {
    getEditorDefinition?: {
      queryOptions: (args: {
        input: {
          methodologyId: string;
          versionId: string;
          workUnitTypeKey: string;
          workflowDefinitionId: string;
        };
      }) => unknown;
    };
    getAgentStepDefinition?: {
      queryOptions: (args: {
        input: {
          methodologyId: string;
          versionId: string;
          workUnitTypeKey: string;
          workflowDefinitionId: string;
          stepId: string;
        };
      }) => unknown;
    };
    discoverAgentStepHarnessMetadata?: {
      queryOptions: (args: { input: Record<string, never> }) => unknown;
    };
    updateWorkflowMetadata?: { mutationOptions: () => unknown };
    createFormStep?: { mutationOptions: () => unknown };
    updateFormStep?: { mutationOptions: () => unknown };
    deleteFormStep?: { mutationOptions: () => unknown };
    createInvokeStep?: { mutationOptions: () => unknown };
    updateInvokeStep?: { mutationOptions: () => unknown };
    deleteInvokeStep?: { mutationOptions: () => unknown };
    createBranchStep?: { mutationOptions: () => unknown };
    updateBranchStep?: { mutationOptions: () => unknown };
    deleteBranchStep?: { mutationOptions: () => unknown };
    createAgentStep?: { mutationOptions: () => unknown };
    updateAgentStep?: { mutationOptions: () => unknown };
    deleteAgentStep?: { mutationOptions: () => unknown };
    createEdge?: { mutationOptions: () => unknown };
    updateEdge?: { mutationOptions: () => unknown };
    deleteEdge?: { mutationOptions: () => unknown };
    contextFact?: {
      create?: { mutationOptions: () => unknown };
      update?: { mutationOptions: () => unknown };
      delete?: { mutationOptions: () => unknown };
    };
  };

  const editorQueryOptions = (workflowProcedures.getEditorDefinition?.queryOptions?.({
    input: {
      methodologyId,
      versionId,
      workUnitTypeKey: workUnitKey,
      workflowDefinitionId,
    },
  }) ?? {
    queryKey: ["workflow-editor", methodologyId, versionId, workUnitKey, workflowDefinitionId],
    queryFn: async () => null,
  }) as unknown as {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
  };

  const editorDefinitionQuery = useQuery(editorQueryOptions);
  const methodologyFactsQueryOptions = (orpc.methodology.version.fact?.list?.queryOptions?.({
    input: { versionId },
  }) ?? {
    queryKey: ["methodology-facts", versionId],
    queryFn: async () => ({ factDefinitions: [] }),
  }) as unknown as {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
  };
  const methodologyFactsQuery = useQuery(methodologyFactsQueryOptions);
  const workUnitTypesQueryOptions = (orpc.methodology.version.workUnit.list?.queryOptions?.({
    input: { versionId },
  }) ?? {
    queryKey: ["work-unit-types", versionId],
    queryFn: async () => ({ workUnitTypes: [] }),
  }) as unknown as {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
  };
  const workUnitTypesQuery = useQuery(workUnitTypesQueryOptions);
  const workUnitFactsQueryOptions = (orpc.methodology.version.workUnit.fact?.list?.queryOptions?.({
    input: { versionId },
  }) ?? {
    queryKey: ["work-unit-facts", versionId],
    queryFn: async () => ({ workUnitTypes: [] }),
  }) as unknown as {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
  };
  const workUnitFactsQuery = useQuery(workUnitFactsQueryOptions);
  const artifactSlotsQueryOptions =
    (orpc.methodology.version.workUnit.artifactSlot?.list?.queryOptions?.({
      input: { versionId, workUnitTypeKey: workUnitKey },
    }) ?? {
      queryKey: ["work-unit-artifact-slots", versionId, workUnitKey],
      queryFn: async () => [],
    }) as unknown as {
      queryKey: unknown[];
      queryFn: () => Promise<unknown>;
    };
  const artifactSlotsQuery = useQuery(artifactSlotsQueryOptions);
  const availableWorkflowsQueryOptions =
    (orpc.methodology.version.workUnit.workflow.list?.queryOptions?.({
      input: { versionId, workUnitTypeKey: workUnitKey },
    }) ?? {
      queryKey: ["work-unit-workflows", versionId, workUnitKey],
      queryFn: async () => [],
    }) as unknown as {
      queryKey: unknown[];
      queryFn: () => Promise<unknown>;
    };
  const availableWorkflowsQuery = useQuery(availableWorkflowsQueryOptions);
  const transitionsQueryOptions =
    (orpc.methodology.version.workUnit.stateMachine?.transition?.list?.queryOptions?.({
      input: { versionId, workUnitTypeKey: workUnitKey },
    }) ?? {
      queryKey: ["work-unit-state-machine-transitions", versionId, workUnitKey],
      queryFn: async () => [],
    }) as unknown as {
      queryKey: unknown[];
      queryFn: () => Promise<unknown>;
    };
  const transitionsQuery = useQuery(transitionsQueryOptions);
  const harnessMetadataQueryOptions =
    (workflowProcedures.discoverAgentStepHarnessMetadata?.queryOptions?.({
      input: {},
    }) ?? {
      queryKey: ["agent-step-harness-metadata"],
      queryFn: async () => null,
    }) as unknown as {
      queryKey: unknown[];
      queryFn: () => Promise<unknown>;
    };

  const updateWorkflowMutation = useMutation(
    (workflowProcedures.updateWorkflowMetadata?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const createFormStepMutation = useMutation(
    (workflowProcedures.createFormStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const createAgentStepMutation = useMutation(
    (workflowProcedures.createAgentStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const createInvokeStepMutation = useMutation(
    (workflowProcedures.createInvokeStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const createBranchStepMutation = useMutation(
    (workflowProcedures.createBranchStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const updateFormStepMutation = useMutation(
    (workflowProcedures.updateFormStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const updateAgentStepMutation = useMutation(
    (workflowProcedures.updateAgentStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const updateInvokeStepMutation = useMutation(
    (workflowProcedures.updateInvokeStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const updateBranchStepMutation = useMutation(
    (workflowProcedures.updateBranchStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const deleteFormStepMutation = useMutation(
    (workflowProcedures.deleteFormStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const deleteAgentStepMutation = useMutation(
    (workflowProcedures.deleteAgentStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const deleteInvokeStepMutation = useMutation(
    (workflowProcedures.deleteInvokeStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const deleteBranchStepMutation = useMutation(
    (workflowProcedures.deleteBranchStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const createContextFactMutation = useMutation(
    (workflowProcedures.contextFact?.create?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const updateContextFactMutation = useMutation(
    (workflowProcedures.contextFact?.update?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const deleteContextFactMutation = useMutation(
    (workflowProcedures.contextFact?.delete?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const createEdgeMutation = useMutation(
    (workflowProcedures.createEdge?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const updateEdgeMutation = useMutation(
    (workflowProcedures.updateEdge?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const deleteEdgeMutation = useMutation(
    (workflowProcedures.deleteEdge?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );

  const editorDefinition =
    (editorDefinitionQuery.data as RawEditorDefinition | null | undefined) ?? null;
  const workflow = editorDefinition ? asRecord(editorDefinition.workflow) : null;

  if (editorDefinitionQuery.isLoading) {
    return (
      <section className="chiron-frame-flat chiron-tone-canvas grid gap-2 p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Workflow Editor
        </p>
        <p className="text-sm text-muted-foreground">Loading workflow editor definition...</p>
      </section>
    );
  }

  if (!workflow) {
    return (
      <section className="chiron-frame-flat chiron-tone-contracts grid gap-2 p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Workflow Editor
        </p>
        <p className="text-sm">
          Unable to resolve workflow {workflowDefinitionId} for work unit {workUnitKey}.
        </p>
      </section>
    );
  }

  const resolvedWorkflowDefinitionId =
    typeof workflow.workflowDefinitionId === "string" && workflow.workflowDefinitionId.length > 0
      ? workflow.workflowDefinitionId
      : workflowDefinitionId;
  const initialSteps = toWorkflowSteps(
    editorDefinition?.steps,
    editorDefinition?.formDefinitions,
    editorDefinition?.agentStepDefinitions,
  );
  const conditionOperators = BUILT_IN_CONDITION_OPERATORS;

  return (
    <WorkflowEditorShell
      metadata={toWorkflowMetadata(resolvedWorkflowDefinitionId, workflow)}
      initialSteps={initialSteps}
      initialEdges={toWorkflowEdges(editorDefinition?.edges)}
      contextFactDefinitions={toContextFactDefinitions(
        editorDefinition?.contextFacts,
        workUnitFactsQuery.data,
      )}
      methodologyFacts={toMethodologyFactOptions(
        methodologyFactsQuery.data,
        workUnitTypesQuery.data,
      )}
      currentWorkUnitFacts={toWorkUnitFactOptions(workUnitFactsQuery.data, workUnitKey)}
      artifactSlots={toArtifactSlotOptions(artifactSlotsQuery.data)}
      workUnitTypes={toWorkUnitTypeOptions(workUnitTypesQuery.data)}
      availableWorkflows={toWorkflowOptions(availableWorkflowsQuery.data)}
      availableTransitions={toTransitionOptions(transitionsQuery.data)}
      conditionOperators={conditionOperators}
      workUnitFactsQueryScope={versionId}
      loadWorkUnitFacts={async (selectedWorkUnitTypeKey) => {
        const data = await queryClient.fetchQuery(workUnitFactsQueryOptions);

        return toWorkUnitDraftSpecFactOptions(data, selectedWorkUnitTypeKey);
      }}
      loadWorkUnitArtifactSlots={async (selectedWorkUnitTypeIdentifier) => {
        const selectedWorkUnitTypeKey = resolveWorkUnitTypeKey(
          workUnitTypesQuery.data,
          selectedWorkUnitTypeIdentifier,
        );
        if (!selectedWorkUnitTypeKey) {
          return [];
        }

        const selectedWorkUnitArtifactSlotsQueryOptions =
          (orpc.methodology.version.workUnit.artifactSlot?.list?.queryOptions?.({
            input: { versionId, workUnitTypeKey: selectedWorkUnitTypeKey },
          }) ?? {
            queryKey: ["work-unit-artifact-slots", versionId, selectedWorkUnitTypeKey],
            queryFn: async () => [],
          }) as unknown as {
            queryKey: unknown[];
            queryFn: () => Promise<unknown>;
          };
        const data = await queryClient.fetchQuery(selectedWorkUnitArtifactSlotsQueryOptions);

        return toArtifactSlotOptions(data);
      }}
      loadInvokeWorkUnitFacts={async (selectedWorkUnitTypeIdentifier) => {
        const data = await queryClient.fetchQuery(workUnitFactsQueryOptions);

        return toInvokeWorkUnitFactDefinitions(data, selectedWorkUnitTypeIdentifier);
      }}
      loadInvokeWorkUnitArtifactSlots={async (selectedWorkUnitTypeIdentifier) => {
        const selectedWorkUnitTypeKey = resolveWorkUnitTypeKey(
          workUnitTypesQuery.data,
          selectedWorkUnitTypeIdentifier,
        );
        if (!selectedWorkUnitTypeKey) {
          return [];
        }

        const selectedWorkUnitArtifactSlotsQueryOptions =
          (orpc.methodology.version.workUnit.artifactSlot?.list?.queryOptions?.({
            input: { versionId, workUnitTypeKey: selectedWorkUnitTypeKey },
          }) ?? {
            queryKey: ["work-unit-artifact-slots", versionId, selectedWorkUnitTypeKey],
            queryFn: async () => [],
          }) as unknown as {
            queryKey: unknown[];
            queryFn: () => Promise<unknown>;
          };
        const data = await queryClient.fetchQuery(selectedWorkUnitArtifactSlotsQueryOptions);

        return toInvokeArtifactSlotDefinitions(data);
      }}
      loadInvokeWorkUnitTransitions={async (selectedWorkUnitTypeIdentifier) => {
        const selectedWorkUnitTypeKey = resolveWorkUnitTypeKey(
          workUnitTypesQuery.data,
          selectedWorkUnitTypeIdentifier,
        );
        if (!selectedWorkUnitTypeKey) {
          return [];
        }

        const selectedWorkUnitTransitionsQueryOptions =
          (orpc.methodology.version.workUnit.stateMachine?.transition?.list?.queryOptions?.({
            input: { versionId, workUnitTypeKey: selectedWorkUnitTypeKey },
          }) ?? {
            queryKey: ["work-unit-state-machine-transitions", versionId, selectedWorkUnitTypeKey],
            queryFn: async () => [],
          }) as unknown as {
            queryKey: unknown[];
            queryFn: () => Promise<unknown>;
          };
        const data = await queryClient.fetchQuery(selectedWorkUnitTransitionsQueryOptions);

        return toTransitionOptions(data);
      }}
      loadInvokeWorkUnitWorkflows={async (selectedWorkUnitTypeIdentifier) => {
        const selectedWorkUnitTypeKey = resolveWorkUnitTypeKey(
          workUnitTypesQuery.data,
          selectedWorkUnitTypeIdentifier,
        );
        if (!selectedWorkUnitTypeKey) {
          return [];
        }

        const selectedWorkUnitWorkflowsQueryOptions =
          (orpc.methodology.version.workUnit.workflow.list?.queryOptions?.({
            input: { versionId, workUnitTypeKey: selectedWorkUnitTypeKey },
          }) ?? {
            queryKey: ["work-unit-workflows", versionId, selectedWorkUnitTypeKey],
            queryFn: async () => [],
          }) as unknown as {
            queryKey: unknown[];
            queryFn: () => Promise<unknown>;
          };
        const data = await queryClient.fetchQuery(selectedWorkUnitWorkflowsQueryOptions);

        return toWorkflowOptions(data);
      }}
      loadInvokeTransitionBoundWorkflowKeys={async (
        selectedWorkUnitTypeIdentifier,
        transitionIdentifier,
      ) => {
        const selectedWorkUnitTypeKey = resolveWorkUnitTypeKey(
          workUnitTypesQuery.data,
          selectedWorkUnitTypeIdentifier,
        );
        if (!selectedWorkUnitTypeKey || transitionIdentifier.trim().length === 0) {
          return [];
        }

        const selectedWorkUnitTransitionsQueryOptions =
          (orpc.methodology.version.workUnit.stateMachine?.transition?.list?.queryOptions?.({
            input: { versionId, workUnitTypeKey: selectedWorkUnitTypeKey },
          }) ?? {
            queryKey: ["work-unit-state-machine-transitions", versionId, selectedWorkUnitTypeKey],
            queryFn: async () => [],
          }) as unknown as {
            queryKey: unknown[];
            queryFn: () => Promise<unknown>;
          };
        const transitionsData = await queryClient.fetchQuery(
          selectedWorkUnitTransitionsQueryOptions,
        );
        const transitionKey = resolveTransitionKey(transitionsData, transitionIdentifier);
        if (!transitionKey) {
          return [];
        }

        const transitionBindingsQueryOptions =
          (orpc.methodology.version.workUnit.stateMachine?.transition?.binding?.list?.queryOptions?.(
            {
              input: {
                versionId,
                workUnitTypeKey: selectedWorkUnitTypeKey,
                transitionKey,
              },
            },
          ) ?? {
            queryKey: [
              "work-unit-transition-bindings",
              versionId,
              selectedWorkUnitTypeKey,
              transitionKey,
            ],
            queryFn: async () => [],
          }) as unknown as {
            queryKey: unknown[];
            queryFn: () => Promise<unknown>;
          };
        const data = await queryClient.fetchQuery(transitionBindingsQueryOptions);

        return Array.isArray(data)
          ? data.filter((entry): entry is string => typeof entry === "string")
          : [];
      }}
      onSaveMetadata={async (metadata) => {
        await updateWorkflowMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          payload: {
            workflowDefinitionId: metadata.workflowDefinitionId,
            key: metadata.key,
            ...(metadata.displayName.length > 0 ? { displayName: metadata.displayName } : {}),
            ...(metadata.descriptionMarkdown.length > 0
              ? { descriptionJson: { markdown: metadata.descriptionMarkdown } }
              : {}),
            entryStepId: metadata.entryStepId,
          },
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onCreateFormStep={async (payload) => {
        await createFormStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          afterStepKey: null,
          payload: toFormStepMutationPayload(payload),
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onCreateAgentStep={async (payload) => {
        await createAgentStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          afterStepKey: null,
          payload: toAgentStepMutationPayload(payload),
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onCreateInvokeStep={async (payload) => {
        await createInvokeStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          payload: toInvokeStepMutationPayload(payload),
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onCreateBranchStep={async (payload) => {
        await createBranchStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          payload: toBranchStepMutationPayload(payload),
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onUpdateFormStep={async (stepId, payload) => {
        await updateFormStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          stepId,
          payload: toFormStepMutationPayload(payload),
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onUpdateAgentStep={async (stepId, payload) => {
        await updateAgentStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          stepId,
          payload: toAgentStepMutationPayload(payload),
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onUpdateInvokeStep={async (stepId, payload) => {
        await updateInvokeStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          stepId,
          payload: toInvokeStepMutationPayload(payload),
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onUpdateBranchStep={async (stepId, payload) => {
        await updateBranchStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          stepId,
          payload: toBranchStepMutationPayload(payload),
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onDeleteFormStep={async (stepId) => {
        await deleteFormStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          stepId,
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onDeleteAgentStep={async (stepId) => {
        await deleteAgentStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          stepId,
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onDeleteInvokeStep={async (stepId) => {
        await deleteInvokeStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          stepId,
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onDeleteBranchStep={async (stepId) => {
        await deleteBranchStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          stepId,
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      discoverHarnessMetadata={async () => {
        const data = await queryClient.fetchQuery(harnessMetadataQueryOptions);
        return data as WorkflowHarnessDiscoveryMetadata;
      }}
      onCreateContextFact={async (draft) => {
        try {
          const created = await createContextFactMutation.mutateAsync({
            versionId,
            workUnitTypeKey: workUnitKey,
            workflowDefinitionId: resolvedWorkflowDefinitionId,
            fact: toContextFactMutationPayload(draft),
          });

          const nextFact = toContextFactDefinitions([created], workUnitFactsQuery.data)[0];
          if (!nextFact) {
            throw new Error("Created context fact did not return an editor definition item.");
          }

          await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
          return nextFact;
        } catch (error) {
          toast.error(`Failed to create context fact: ${toErrorMessage(error)}`);
          throw error;
        }
      }}
      onUpdateContextFact={async (contextFactDefinitionId, draft) => {
        try {
          await updateContextFactMutation.mutateAsync({
            versionId,
            workUnitTypeKey: workUnitKey,
            workflowDefinitionId: resolvedWorkflowDefinitionId,
            contextFactDefinitionId,
            fact: toContextFactMutationPayload(draft),
          });

          await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
        } catch (error) {
          toast.error(`Failed to update context fact: ${toErrorMessage(error)}`);
          throw error;
        }
      }}
      onDeleteContextFact={async (contextFactDefinitionId) => {
        await deleteContextFactMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          contextFactDefinitionId,
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onCreateEdge={async (edge) => {
        await createEdgeMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          fromStepKey: edge.fromStepKey,
          toStepKey: edge.toStepKey,
          ...(edge.descriptionMarkdown.length > 0
            ? { descriptionJson: { markdown: edge.descriptionMarkdown } }
            : {}),
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onUpdateEdge={async (edgeId, descriptionMarkdown) => {
        await updateEdgeMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          edgeId,
          ...(descriptionMarkdown.length > 0
            ? { descriptionJson: { markdown: descriptionMarkdown } }
            : {}),
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onDeleteEdge={async (edgeId) => {
        await deleteEdgeMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          edgeId,
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
    />
  );
}
