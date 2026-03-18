import { Schema } from "effect";

import { LayeredGuidance, MethodologyVersionStatus, WorkflowDefinition } from "./version.js";

export const MethodologyVersionProjection = Schema.Struct({
  id: Schema.NonEmptyString,
  methodologyId: Schema.NonEmptyString,
  version: Schema.NonEmptyString,
  status: MethodologyVersionStatus,
  displayName: Schema.NonEmptyString,
  workUnitTypes: Schema.Array(Schema.Unknown),
  agentTypes: Schema.Array(Schema.Unknown),
  transitions: Schema.Array(Schema.Unknown),
  workflows: Schema.Array(WorkflowDefinition),
  transitionWorkflowBindings: Schema.Record({
    key: Schema.String,
    value: Schema.Array(Schema.String),
  }),
  guidance: Schema.optional(LayeredGuidance),
  factDefinitions: Schema.optional(Schema.Array(Schema.Unknown)),
  linkTypeDefinitions: Schema.optional(Schema.Array(Schema.Unknown)),
});
export type MethodologyVersionProjection = typeof MethodologyVersionProjection.Type;
