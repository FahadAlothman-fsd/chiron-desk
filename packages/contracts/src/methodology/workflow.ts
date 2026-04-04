import * as Schema from "effect/Schema";
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
});
export type WorkflowMetadataDialogInput = typeof WorkflowMetadataDialogInput.Type;

export const FormFieldValueType = Schema.Literal("string", "number", "boolean", "json");
export type FormFieldValueType = typeof FormFieldValueType.Type;

export const FormFieldInput = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("text"),
    multiline: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  }),
  Schema.Struct({
    kind: Schema.Literal("select"),
    options: Schema.Array(Schema.String),
  }),
  Schema.Struct({
    kind: Schema.Literal("checkbox"),
  }),
);
export type FormFieldInput = typeof FormFieldInput.Type;

export const FormStepFieldPayload = Schema.Struct({
  key: Schema.NonEmptyString,
  label: Schema.optional(Schema.String),
  valueType: FormFieldValueType,
  required: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  input: FormFieldInput,
  descriptionJson: Schema.optional(DescriptionJson),
});
export type FormStepFieldPayload = typeof FormStepFieldPayload.Type;

export const WORKFLOW_CONTEXT_FACT_KINDS = [
  "plain_value",
  "external_binding",
  "workflow_reference",
  "work_unit_reference",
  "artifact_reference",
  "draft_spec",
  "draft_spec_field",
] as const;

export const WorkflowContextFactKind = Schema.Literal(...WORKFLOW_CONTEXT_FACT_KINDS);
export type WorkflowContextFactKind = typeof WorkflowContextFactKind.Type;

export const WorkflowDraftSpecFieldDto = Schema.Struct({
  key: Schema.NonEmptyString,
  valueType: FormFieldValueType,
  required: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  descriptionJson: Schema.optional(DescriptionJson),
});
export type WorkflowDraftSpecFieldDto = typeof WorkflowDraftSpecFieldDto.Type;

export const WorkflowContextFactDto = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("plain_value"),
    key: Schema.NonEmptyString,
    valueType: FormFieldValueType,
  }),
  Schema.Struct({
    kind: Schema.Literal("external_binding"),
    key: Schema.NonEmptyString,
    source: Schema.Struct({
      provider: Schema.NonEmptyString,
      bindingKey: Schema.NonEmptyString,
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("workflow_reference"),
    key: Schema.NonEmptyString,
    workflowDefinitionId: Schema.NonEmptyString,
  }),
  Schema.Struct({
    kind: Schema.Literal("work_unit_reference"),
    key: Schema.NonEmptyString,
    workUnitTypeKey: Schema.NonEmptyString,
  }),
  Schema.Struct({
    kind: Schema.Literal("artifact_reference"),
    key: Schema.NonEmptyString,
    artifactSlotKey: Schema.NonEmptyString,
  }),
  Schema.Struct({
    kind: Schema.Literal("draft_spec"),
    key: Schema.NonEmptyString,
    fields: Schema.Array(WorkflowDraftSpecFieldDto),
  }),
  Schema.Struct({
    kind: Schema.Literal("draft_spec_field"),
    key: Schema.NonEmptyString,
    draftSpecKey: Schema.NonEmptyString,
    fieldKey: Schema.NonEmptyString,
    valueType: FormFieldValueType,
  }),
);
export type WorkflowContextFactDto = typeof WorkflowContextFactDto.Type;

export const FormStepPayload = Schema.Struct({
  key: Schema.NonEmptyString,
  label: Schema.optional(Schema.String),
  descriptionJson: Schema.optional(DescriptionJson),
  fields: Schema.Array(FormStepFieldPayload),
  contextFacts: Schema.optionalWith(Schema.Array(WorkflowContextFactDto), { default: () => [] }),
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
  condition: Schema.optional(Schema.Unknown),
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
