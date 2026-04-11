import * as Schema from "effect/Schema";
import { AudienceGuidance } from "./guidance.js";
import { DescriptionJson } from "../shared/invariants.js";
import { WorkflowDefinition } from "./version.js";

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

export const WORKFLOW_CONTEXT_FACT_KINDS = [
  "plain_value_fact",
  "definition_backed_external_fact",
  "bound_external_fact",
  "workflow_reference_fact",
  "artifact_reference_fact",
  "work_unit_draft_spec_fact",
] as const;

export const WorkflowContextFactKind = Schema.Literal(...WORKFLOW_CONTEXT_FACT_KINDS);
export type WorkflowContextFactKind = typeof WorkflowContextFactKind.Type;

export const WorkflowContextFactCardinality = Schema.Literal("one", "many");
export type WorkflowContextFactCardinality = typeof WorkflowContextFactCardinality.Type;

const WorkflowContextFactMetadata = Schema.Struct({
  contextFactDefinitionId: Schema.optional(Schema.NonEmptyString),
  label: Schema.optional(Schema.String),
  descriptionJson: Schema.optional(DescriptionJson),
  guidance: Schema.optional(AudienceGuidance),
});

export const WorkflowContextFactDto = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("plain_value_fact"),
    key: Schema.NonEmptyString,
    cardinality: WorkflowContextFactCardinality,
    valueType: FormFieldValueType,
  }).pipe(Schema.extend(WorkflowContextFactMetadata)),
  Schema.Struct({
    kind: Schema.Literal("definition_backed_external_fact"),
    key: Schema.NonEmptyString,
    cardinality: WorkflowContextFactCardinality,
    externalFactDefinitionId: Schema.NonEmptyString,
  }).pipe(Schema.extend(WorkflowContextFactMetadata)),
  Schema.Struct({
    kind: Schema.Literal("bound_external_fact"),
    key: Schema.NonEmptyString,
    cardinality: WorkflowContextFactCardinality,
    externalFactDefinitionId: Schema.NonEmptyString,
  }).pipe(Schema.extend(WorkflowContextFactMetadata)),
  Schema.Struct({
    kind: Schema.Literal("workflow_reference_fact"),
    key: Schema.NonEmptyString,
    cardinality: WorkflowContextFactCardinality,
    allowedWorkflowDefinitionIds: Schema.Array(Schema.NonEmptyString),
  }).pipe(Schema.extend(WorkflowContextFactMetadata)),
  Schema.Struct({
    kind: Schema.Literal("artifact_reference_fact"),
    key: Schema.NonEmptyString,
    cardinality: WorkflowContextFactCardinality,
    artifactSlotDefinitionId: Schema.NonEmptyString,
  }).pipe(Schema.extend(WorkflowContextFactMetadata)),
  Schema.Struct({
    kind: Schema.Literal("work_unit_draft_spec_fact"),
    key: Schema.NonEmptyString,
    cardinality: WorkflowContextFactCardinality,
    workUnitDefinitionId: Schema.NonEmptyString,
    selectedWorkUnitFactDefinitionIds: Schema.Array(Schema.NonEmptyString),
    selectedArtifactSlotDefinitionIds: Schema.Array(Schema.NonEmptyString),
  }).pipe(Schema.extend(WorkflowContextFactMetadata)),
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

export const InvokeSourceMode = Schema.Literal("fixed_set", "context_fact_backed");
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
    sourceMode: Schema.Literal("fixed_set"),
    workflowDefinitionIds: Schema.Array(Schema.NonEmptyString),
  }).pipe(Schema.extend(WorkflowStepPayloadMetadata)),
  Schema.Struct({
    targetKind: Schema.Literal("workflow"),
    sourceMode: Schema.Literal("context_fact_backed"),
    contextFactDefinitionId: Schema.NonEmptyString,
  }).pipe(Schema.extend(WorkflowStepPayloadMetadata)),
  Schema.Struct({
    targetKind: Schema.Literal("work_unit"),
    sourceMode: Schema.Literal("fixed_set"),
    workUnitDefinitionId: Schema.NonEmptyString,
  })
    .pipe(Schema.extend(WorkUnitInvokePayloadShared))
    .pipe(Schema.extend(WorkflowStepPayloadMetadata)),
  Schema.Struct({
    targetKind: Schema.Literal("work_unit"),
    sourceMode: Schema.Literal("context_fact_backed"),
    contextFactDefinitionId: Schema.NonEmptyString,
  })
    .pipe(Schema.extend(WorkUnitInvokePayloadShared))
    .pipe(Schema.extend(WorkflowStepPayloadMetadata)),
);
export type InvokeStepPayload = typeof InvokeStepPayload.Type;

export const BranchConditionMode = Schema.Literal("all", "any");
export type BranchConditionMode = typeof BranchConditionMode.Type;

export const BranchRouteConditionPayload = Schema.Struct({
  conditionId: Schema.NonEmptyString,
  contextFactDefinitionId: Schema.NonEmptyString,
  contextFactKind: WorkflowContextFactKind,
  operator: Schema.NonEmptyString,
  isNegated: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  comparisonJson: Schema.Unknown,
});
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
})
  .pipe(Schema.extend(WorkflowStepPayloadMetadata))
  .pipe(
    Schema.filter((payload) => {
      const targetStepIds = payload.routes.map((route) => route.targetStepId);
      return new Set(targetStepIds).size === targetStepIds.length;
    }),
  );
export type BranchStepPayload = typeof BranchStepPayload.Type;

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
