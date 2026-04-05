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
    includedFactDefinitionIds: Schema.Array(Schema.NonEmptyString),
  }).pipe(Schema.extend(WorkflowContextFactMetadata)),
);
export type WorkflowContextFactDto = typeof WorkflowContextFactDto.Type;

export const FormStepPayload = Schema.Struct({
  key: Schema.NonEmptyString,
  label: Schema.optional(Schema.String),
  descriptionJson: Schema.optional(DescriptionJson),
  fields: Schema.Array(FormStepFieldPayload),
  guidance: Schema.optional(AudienceGuidance),
});
export type FormStepPayload = typeof FormStepPayload.Type;

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

export const WorkflowEdgeDto = Schema.Struct({
  edgeId: Schema.NonEmptyString,
  fromStepKey: Schema.optionalWith(Schema.NullOr(Schema.NonEmptyString), { default: () => null }),
  toStepKey: Schema.optionalWith(Schema.NullOr(Schema.NonEmptyString), { default: () => null }),
  descriptionJson: Schema.optional(DescriptionJson),
});
export type WorkflowEdgeDto = typeof WorkflowEdgeDto.Type;

export const DeferredWorkflowStepType = Schema.Literal(
  "agent",
  "action",
  "invoke",
  "branch",
  "display",
);
export type DeferredWorkflowStepType = typeof DeferredWorkflowStepType.Type;

export const WorkflowStepReadModel = Schema.Union(
  Schema.Struct({
    stepId: Schema.NonEmptyString,
    stepType: Schema.Literal("form"),
    payload: FormStepPayload,
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
