import * as Schema from "effect/Schema";
import { AudienceGuidance } from "./guidance.js";
import { DescriptionJson } from "../shared/invariants.js";
import { WorkflowDefinition } from "./version.js";
import {
  CANONICAL_WORKFLOW_CONTEXT_FACT_KINDS,
  CanonicalWorkflowContextFactDefinition,
  CanonicalWorkflowContextFactValueType,
  LegacyPlainValueFactDefinition,
} from "./fact.js";

export const WorkflowEditorRouteIdentity = Schema.Struct({
  methodologyId: Schema.NonEmptyString,
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  workflowDefinitionId: Schema.NonEmptyString,
});
export type WorkflowEditorRouteIdentity = typeof WorkflowEditorRouteIdentity.Type;

export const WorkflowMetadataDialogInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  descriptionJson: Schema.optional(DescriptionJson),
  entryStepId: Schema.optionalWith(Schema.NullOr(Schema.NonEmptyString), { default: () => null }),
});
export type WorkflowMetadataDialogInput = typeof WorkflowMetadataDialogInput.Type;

export const FormFieldValueType = Schema.Literal("string", "number", "boolean", "json");
export type FormFieldValueType = typeof FormFieldValueType.Type;

export const FormFieldUiMultiplicityMode = Schema.Literal("one", "many");
export type FormFieldUiMultiplicityMode = typeof FormFieldUiMultiplicityMode.Type;

export const FormStepFieldPayload = Schema.Struct({
  contextFactDefinitionId: Schema.NonEmptyString,
  fieldLabel: Schema.NonEmptyString,
  fieldKey: Schema.NonEmptyString,
  helpText: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  required: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  uiMultiplicityMode: Schema.optional(FormFieldUiMultiplicityMode),
});
export type FormStepFieldPayload = typeof FormStepFieldPayload.Type;

export const WORKFLOW_CONTEXT_FACT_KINDS = CANONICAL_WORKFLOW_CONTEXT_FACT_KINDS;

export const WorkflowContextFactKind = Schema.Literal(
  ...WORKFLOW_CONTEXT_FACT_KINDS,
  "plain_value_fact",
);
export type WorkflowContextFactKind = typeof WorkflowContextFactKind.Type;

export const WorkflowContextFactCardinality = Schema.Literal("one", "many");
export type WorkflowContextFactCardinality = typeof WorkflowContextFactCardinality.Type;

export const WorkflowContextFactValueType = CanonicalWorkflowContextFactValueType;
export type WorkflowContextFactValueType = typeof WorkflowContextFactValueType.Type;

export const WorkflowContextFactDto = Schema.Union(
  CanonicalWorkflowContextFactDefinition,
  LegacyPlainValueFactDefinition,
);
export type WorkflowContextFactDto = typeof WorkflowContextFactDto.Type;

const WorkflowStepPayloadMetadata = Schema.Struct({
  key: Schema.NonEmptyString,
  label: Schema.optional(Schema.String),
  descriptionJson: Schema.optional(DescriptionJson),
  guidance: Schema.optional(AudienceGuidance),
});

export const FormStepPayload = Schema.Struct({
  fields: Schema.Array(FormStepFieldPayload),
}).pipe(Schema.extend(WorkflowStepPayloadMetadata));
export type FormStepPayload = typeof FormStepPayload.Type;

export const InvokeTargetKind = Schema.Literal("workflow", "work_unit");
export type InvokeTargetKind = typeof InvokeTargetKind.Type;

export const InvokeSourceMode = Schema.Literal("fixed", "fact_backed");
export type InvokeSourceMode = typeof InvokeSourceMode.Type;

export const InvokeBindingDestination = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("work_unit_fact"),
    workUnitFactDefinitionId: Schema.NonEmptyString,
  }),
  Schema.Struct({
    kind: Schema.Literal("artifact_slot"),
    artifactSlotDefinitionId: Schema.NonEmptyString,
  }),
);
export type InvokeBindingDestination = typeof InvokeBindingDestination.Type;

export const InvokeBindingSource = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("context_fact"),
    contextFactDefinitionId: Schema.NonEmptyString,
  }),
  Schema.Struct({
    kind: Schema.Literal("literal"),
    value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean),
  }),
  Schema.Struct({
    kind: Schema.Literal("runtime"),
  }),
);
export type InvokeBindingSource = typeof InvokeBindingSource.Type;

export const InvokeBindingPayload = Schema.Struct({
  destination: InvokeBindingDestination,
  source: InvokeBindingSource,
});
export type InvokeBindingPayload = typeof InvokeBindingPayload.Type;

export const InvokeActivationTransitionPayload = Schema.Struct({
  transitionId: Schema.NonEmptyString,
  workflowDefinitionIds: Schema.Array(Schema.NonEmptyString),
});
export type InvokeActivationTransitionPayload = typeof InvokeActivationTransitionPayload.Type;

const WorkUnitInvokePayloadShared = Schema.Struct({
  bindings: Schema.Array(InvokeBindingPayload),
  activationTransitions: Schema.Array(InvokeActivationTransitionPayload),
});

export const InvokeStepPayload = Schema.Union(
  Schema.Struct({
    targetKind: Schema.Literal("workflow"),
    sourceMode: Schema.Literal("fixed"),
    workflowDefinitionIds: Schema.Array(Schema.NonEmptyString),
  }).pipe(Schema.extend(WorkflowStepPayloadMetadata)),
  Schema.Struct({
    targetKind: Schema.Literal("workflow"),
    sourceMode: Schema.Literal("fact_backed"),
    contextFactDefinitionId: Schema.NonEmptyString,
  }).pipe(Schema.extend(WorkflowStepPayloadMetadata)),
  Schema.Struct({
    targetKind: Schema.Literal("work_unit"),
    sourceMode: Schema.Literal("fixed"),
    workUnitDefinitionId: Schema.NonEmptyString,
  }).pipe(Schema.extend(WorkUnitInvokePayloadShared), Schema.extend(WorkflowStepPayloadMetadata)),
  Schema.Struct({
    targetKind: Schema.Literal("work_unit"),
    sourceMode: Schema.Literal("fact_backed"),
    contextFactDefinitionId: Schema.NonEmptyString,
  }).pipe(Schema.extend(WorkUnitInvokePayloadShared), Schema.extend(WorkflowStepPayloadMetadata)),
);
export type InvokeStepPayload = typeof InvokeStepPayload.Type;

export const ACTION_STEP_EDITOR_TABS = ["overview", "actions", "execution", "guidance"] as const;
export const ActionStepEditorTab = Schema.Literal(...ACTION_STEP_EDITOR_TABS);
export type ActionStepEditorTab = typeof ActionStepEditorTab.Type;

export const ACTION_STEP_EXECUTION_MODES = ["sequential", "parallel"] as const;
export const ActionStepExecutionMode = Schema.Literal(...ACTION_STEP_EXECUTION_MODES);
export type ActionStepExecutionMode = typeof ActionStepExecutionMode.Type;

export const ACTION_STEP_ALLOWED_CONTEXT_FACT_KINDS = [
  "bound_fact",
  "artifact_slot_reference_fact",
] as const;
export const ActionStepAllowedContextFactKind = Schema.Literal(
  ...ACTION_STEP_ALLOWED_CONTEXT_FACT_KINDS,
);
export type ActionStepAllowedContextFactKind = typeof ActionStepAllowedContextFactKind.Type;

// Plan A boundary: Action authoring is whole-step only. Future per-action CRUD, richer target
// payloads, and non-propagation action kinds are explicitly deferred to Plan B.
export const ACTION_STEP_WHOLE_STEP_AUTHORING_RULES = [
  "whole_step_only",
  "propagation_only",
  "shared_execution_mode",
  "stable_nested_ids",
] as const;

export const L3_PLAN_A_PLAN_B_DEFERRALS = [
  "canonical_value_json_decode_normalize_validate_pipeline",
  "runtime_enforcement_of_methodology_fact_validation_rules",
  "richer_nested_work_unit_draft_spec_fact_payload",
  "shared_typed_fact_instance_model",
  "raw_write_hardening_for_schema_unknown_boundaries",
  "agent_step_and_mcp_invalid_write_audit",
  "broad_operator_system_convergence",
] as const;

export const ActionStepPropagationItemPayload = Schema.Struct({
  itemId: Schema.NonEmptyString,
  itemKey: Schema.NonEmptyString,
  label: Schema.optional(Schema.String),
  sortOrder: Schema.Number,
  targetContextFactDefinitionId: Schema.optional(Schema.NonEmptyString),
});
export type ActionStepPropagationItemPayload = typeof ActionStepPropagationItemPayload.Type;

export const ActionStepActionPayload = Schema.Struct({
  actionId: Schema.NonEmptyString,
  actionKey: Schema.NonEmptyString,
  label: Schema.optional(Schema.String),
  enabled: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  sortOrder: Schema.Number,
  actionKind: Schema.Literal("propagation"),
  contextFactDefinitionId: Schema.NonEmptyString,
  contextFactKind: ActionStepAllowedContextFactKind,
  items: Schema.Array(ActionStepPropagationItemPayload),
}).pipe(
  Schema.filter((action) => {
    if (action.items.length < 1) {
      return false;
    }

    const itemIds = action.items.map((item) => item.itemId);
    const itemKeys = action.items.map((item) => item.itemKey);
    const itemSortOrders = action.items.map((item) => item.sortOrder);

    return (
      new Set(itemIds).size === itemIds.length &&
      new Set(itemKeys).size === itemKeys.length &&
      new Set(itemSortOrders).size === itemSortOrders.length
    );
  }),
);
export type ActionStepActionPayload = typeof ActionStepActionPayload.Type;

export const ActionStepPayload = Schema.Struct({
  executionMode: ActionStepExecutionMode,
  actions: Schema.Array(ActionStepActionPayload),
}).pipe(
  Schema.extend(WorkflowStepPayloadMetadata),
  Schema.filter((payload) => payload.actions.some((action) => action.enabled !== false)),
  Schema.filter((payload) => {
    if (payload.actions.length < 1) {
      return false;
    }

    const actionIds = payload.actions.map((action) => action.actionId);
    const actionKeys = payload.actions.map((action) => action.actionKey);
    const actionSortOrders = payload.actions.map((action) => action.sortOrder);
    return (
      new Set(actionIds).size === actionIds.length &&
      new Set(actionKeys).size === actionKeys.length &&
      new Set(actionSortOrders).size === actionSortOrders.length
    );
  }),
);
export type ActionStepPayload = typeof ActionStepPayload.Type;

export const BranchConditionMode = Schema.Literal("all", "any");
export type BranchConditionMode = typeof BranchConditionMode.Type;

export const BRANCH_STEP_CONDITION_OPERATORS = ["exists", "equals"] as const;
export const BranchStepConditionOperator = Schema.Literal(...BRANCH_STEP_CONDITION_OPERATORS);
export type BranchStepConditionOperator = typeof BranchStepConditionOperator.Type;

export const BRANCH_STEP_PROJECT_WORK_UNIT_CONDITION_OPERATORS = [
  "work_unit_instance_exists",
  "work_unit_instance_exists_in_state",
] as const;
export const BranchStepProjectWorkUnitConditionOperator = Schema.Literal(
  ...BRANCH_STEP_PROJECT_WORK_UNIT_CONDITION_OPERATORS,
);
export type BranchStepProjectWorkUnitConditionOperator =
  typeof BranchStepProjectWorkUnitConditionOperator.Type;

const PositiveInteger = Schema.Number.pipe(
  Schema.filter((value) => Number.isInteger(value) && value > 0),
);

const NonEmptyStateKeys = Schema.Array(Schema.NonEmptyString).pipe(
  Schema.filter((value) => value.length > 0),
);

export const BranchRouteFactConditionPayload = Schema.Struct({
  conditionId: Schema.NonEmptyString,
  contextFactDefinitionId: Schema.NonEmptyString,
  subFieldKey: Schema.optionalWith(Schema.NullOr(Schema.NonEmptyString), {
    default: () => null,
  }),
  operator: BranchStepConditionOperator,
  isNegated: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  comparisonJson: Schema.Unknown,
  workUnitTypeKey: Schema.optional(Schema.NullOr(Schema.NonEmptyString)),
  stateKeys: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  minCount: Schema.optional(PositiveInteger),
});
export type BranchRouteFactConditionPayload = typeof BranchRouteFactConditionPayload.Type;

export const BranchRouteProjectWorkUnitExistsConditionPayload = Schema.Struct({
  conditionId: Schema.NonEmptyString,
  contextFactDefinitionId: Schema.optional(Schema.NullOr(Schema.NonEmptyString)),
  subFieldKey: Schema.optional(Schema.NullOr(Schema.NonEmptyString)),
  workUnitTypeKey: Schema.NonEmptyString,
  operator: Schema.Literal("work_unit_instance_exists"),
  minCount: Schema.optionalWith(PositiveInteger, { default: () => 1 }),
  isNegated: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  comparisonJson: Schema.optional(Schema.Unknown),
  stateKeys: Schema.optional(Schema.Array(Schema.NonEmptyString)),
});
export type BranchRouteProjectWorkUnitExistsConditionPayload =
  typeof BranchRouteProjectWorkUnitExistsConditionPayload.Type;

export const BranchRouteProjectWorkUnitExistsInStateConditionPayload = Schema.Struct({
  conditionId: Schema.NonEmptyString,
  contextFactDefinitionId: Schema.optional(Schema.NullOr(Schema.NonEmptyString)),
  subFieldKey: Schema.optional(Schema.NullOr(Schema.NonEmptyString)),
  workUnitTypeKey: Schema.NonEmptyString,
  operator: Schema.Literal("work_unit_instance_exists_in_state"),
  stateKeys: NonEmptyStateKeys,
  minCount: Schema.optionalWith(PositiveInteger, { default: () => 1 }),
  isNegated: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  comparisonJson: Schema.optional(Schema.Unknown),
});
export type BranchRouteProjectWorkUnitExistsInStateConditionPayload =
  typeof BranchRouteProjectWorkUnitExistsInStateConditionPayload.Type;

export const BranchRouteConditionPayload = Schema.Union(
  BranchRouteFactConditionPayload,
  BranchRouteProjectWorkUnitExistsConditionPayload,
  BranchRouteProjectWorkUnitExistsInStateConditionPayload,
);
export type BranchRouteConditionPayload = typeof BranchRouteConditionPayload.Type;

export const BranchRouteGroupPayload = Schema.Struct({
  groupId: Schema.NonEmptyString,
  mode: BranchConditionMode,
  conditions: Schema.Array(BranchRouteConditionPayload),
});
export type BranchRouteGroupPayload = typeof BranchRouteGroupPayload.Type;

const BranchRoutePayloadBase = Schema.Struct({
  routeId: Schema.NonEmptyString,
  targetStepId: Schema.NonEmptyString,
  conditionMode: BranchConditionMode,
  groups: Schema.Array(BranchRouteGroupPayload),
});

export const BranchRoutePayload = BranchRoutePayloadBase.pipe(
  Schema.filter((route) => {
    const conditionIds = route.groups.flatMap((group) =>
      group.conditions.map((condition) => condition.conditionId),
    );
    return new Set(conditionIds).size === conditionIds.length;
  }),
);
export type BranchRoutePayload = typeof BranchRoutePayload.Type;

export const BranchStepPayload = Schema.Struct({
  defaultTargetStepId: Schema.optionalWith(Schema.NullOr(Schema.NonEmptyString), {
    default: () => null,
  }),
  routes: Schema.Array(BranchRoutePayload),
}).pipe(
  Schema.extend(WorkflowStepPayloadMetadata),
  Schema.filter((payload) => {
    const routeIds = payload.routes.map((route) => route.routeId);
    const targetStepIds = payload.routes.map((route) => route.targetStepId);
    return (
      new Set(routeIds).size === routeIds.length &&
      new Set(targetStepIds).size === targetStepIds.length
    );
  }),
);
export type BranchStepPayload = typeof BranchStepPayload.Type;

export const CreateActionStepInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  afterStepKey: Schema.optionalWith(Schema.NullOr(Schema.NonEmptyString), { default: () => null }),
  payload: ActionStepPayload,
});
export type CreateActionStepInput = typeof CreateActionStepInput.Type;

export const UpdateActionStepInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  stepId: Schema.NonEmptyString,
  payload: ActionStepPayload,
});
export type UpdateActionStepInput = typeof UpdateActionStepInput.Type;

export const DeleteActionStepInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  stepId: Schema.NonEmptyString,
});
export type DeleteActionStepInput = typeof DeleteActionStepInput.Type;

export const GetActionStepDefinitionInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  stepId: Schema.NonEmptyString,
});
export type GetActionStepDefinitionInput = typeof GetActionStepDefinitionInput.Type;

export const GetActionStepDefinitionOutput = Schema.Struct({
  stepId: Schema.NonEmptyString,
  stepType: Schema.Literal("action"),
  payload: ActionStepPayload,
});
export type GetActionStepDefinitionOutput = typeof GetActionStepDefinitionOutput.Type;

export const CreateFormStepInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  afterStepKey: Schema.optionalWith(Schema.NullOr(Schema.NonEmptyString), { default: () => null }),
  payload: FormStepPayload,
});
export type CreateFormStepInput = typeof CreateFormStepInput.Type;

export const UpdateFormStepInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  stepId: Schema.NonEmptyString,
  payload: FormStepPayload,
});
export type UpdateFormStepInput = typeof UpdateFormStepInput.Type;

export const CreateInvokeStepInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  payload: InvokeStepPayload,
});
export type CreateInvokeStepInput = typeof CreateInvokeStepInput.Type;

export const UpdateInvokeStepInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  stepId: Schema.NonEmptyString,
  payload: InvokeStepPayload,
});
export type UpdateInvokeStepInput = typeof UpdateInvokeStepInput.Type;

export const DeleteInvokeStepInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  stepId: Schema.NonEmptyString,
});
export type DeleteInvokeStepInput = typeof DeleteInvokeStepInput.Type;

export const CreateBranchStepInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  payload: BranchStepPayload,
});
export type CreateBranchStepInput = typeof CreateBranchStepInput.Type;

export const UpdateBranchStepInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  stepId: Schema.NonEmptyString,
  payload: BranchStepPayload,
});
export type UpdateBranchStepInput = typeof UpdateBranchStepInput.Type;

export const DeleteBranchStepInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  stepId: Schema.NonEmptyString,
});
export type DeleteBranchStepInput = typeof DeleteBranchStepInput.Type;

export const WorkflowEdgeDto = Schema.Struct({
  edgeId: Schema.NonEmptyString,
  fromStepKey: Schema.optionalWith(Schema.NullOr(Schema.NonEmptyString), { default: () => null }),
  toStepKey: Schema.optionalWith(Schema.NullOr(Schema.NonEmptyString), { default: () => null }),
  descriptionJson: Schema.optional(DescriptionJson),
});
export type WorkflowEdgeDto = typeof WorkflowEdgeDto.Type;

export const DeferredWorkflowStepType = Schema.Literal("agent", "action", "display");
export type DeferredWorkflowStepType = typeof DeferredWorkflowStepType.Type;

export const WorkflowStepReadModel = Schema.Union(
  Schema.Struct({
    stepId: Schema.NonEmptyString,
    stepType: Schema.Literal("form"),
    payload: FormStepPayload,
  }),
  Schema.Struct({
    stepId: Schema.NonEmptyString,
    stepType: Schema.Literal("invoke"),
    payload: InvokeStepPayload,
  }),
  Schema.Struct({
    stepId: Schema.NonEmptyString,
    stepType: Schema.Literal("branch"),
    payload: BranchStepPayload,
  }),
  Schema.Struct({
    stepId: Schema.NonEmptyString,
    stepType: DeferredWorkflowStepType,
    stepKey: Schema.optional(Schema.NonEmptyString),
    mode: Schema.Literal("deferred"),
    defaultMessage: Schema.String,
  }),
);
export type WorkflowStepReadModel = typeof WorkflowStepReadModel.Type;

export const ListWorkUnitWorkflowsInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
});
export type ListWorkUnitWorkflowsInput = typeof ListWorkUnitWorkflowsInput.Type;

export const CreateWorkUnitWorkflowInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  workflow: WorkflowDefinition,
});
export type CreateWorkUnitWorkflowInput = typeof CreateWorkUnitWorkflowInput.Type;

export const UpdateWorkUnitWorkflowInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  workflowKey: Schema.NonEmptyString,
  workflow: WorkflowDefinition,
});
export type UpdateWorkUnitWorkflowInput = typeof UpdateWorkUnitWorkflowInput.Type;

export const DeleteWorkUnitWorkflowInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  workflowKey: Schema.NonEmptyString,
});
export type DeleteWorkUnitWorkflowInput = typeof DeleteWorkUnitWorkflowInput.Type;
