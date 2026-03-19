import * as Schema from "effect/Schema";

import { MethodologyFactDefinitionInput } from "./fact.js";
import { LayeredGuidance } from "./guidance.js";
import { WorkflowDefinition } from "./version.js";

export const MethodologyLifecycleAuthoringDto = Schema.Struct({
  workUnitTypes: Schema.Array(Schema.Unknown),
  agentTypes: Schema.optionalWith(Schema.Array(Schema.Unknown), { default: () => [] }),
  transitions: Schema.Array(Schema.Unknown),
});
export type MethodologyLifecycleAuthoringDto = typeof MethodologyLifecycleAuthoringDto.Type;

export const MethodologyWorkflowAuthoringDto = Schema.Struct({
  workflows: Schema.Array(WorkflowDefinition),
  transitionWorkflowBindings: Schema.Record({
    key: Schema.String,
    value: Schema.Array(Schema.String),
  }),
  guidance: Schema.optional(LayeredGuidance),
});
export type MethodologyWorkflowAuthoringDto = typeof MethodologyWorkflowAuthoringDto.Type;

export const UpdateDraftWorkflowsInputDto = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workflows: Schema.Array(WorkflowDefinition),
  transitionWorkflowBindings: Schema.Record({
    key: Schema.String,
    value: Schema.Array(Schema.String),
  }),
  guidance: Schema.optional(LayeredGuidance),
  factDefinitions: Schema.optional(Schema.Array(MethodologyFactDefinitionInput)),
});
export type UpdateDraftWorkflowsInputDto = typeof UpdateDraftWorkflowsInputDto.Type;

export const MethodologyDraftExtensionsDto = Schema.optional(Schema.Unknown);
export type MethodologyDraftExtensionsDto = unknown | undefined;
