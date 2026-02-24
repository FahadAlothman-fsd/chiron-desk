import { Schema } from "effect";

export const ModelReference = Schema.Struct({
  provider: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
});
export type ModelReference = typeof ModelReference.Type;

export const AgentTypeDefinition = Schema.Struct({
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  persona: Schema.NonEmptyString,
  defaultModel: Schema.optional(ModelReference),
  mcpServers: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  capabilities: Schema.optional(Schema.Array(Schema.NonEmptyString)),
});
export type AgentTypeDefinition = typeof AgentTypeDefinition.Type;
