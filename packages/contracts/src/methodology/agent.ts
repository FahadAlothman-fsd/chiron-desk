import * as Schema from "effect/Schema";

export const ModelReference = Schema.Struct({
  provider: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
});
export type ModelReference = typeof ModelReference.Type;

export const AgentPromptTemplate = Schema.Struct({
  markdown: Schema.NonEmptyString,
});
export type AgentPromptTemplate = typeof AgentPromptTemplate.Type;

export const AgentTypeDefinition = Schema.Struct({
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  persona: Schema.NonEmptyString,
  promptTemplate: Schema.optional(AgentPromptTemplate),
  defaultModel: Schema.optional(ModelReference),
  mcpServers: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  capabilities: Schema.optional(Schema.Array(Schema.NonEmptyString)),
});
export type AgentTypeDefinition = typeof AgentTypeDefinition.Type;

export const CreateMethodologyAgentInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  agent: AgentTypeDefinition,
});
export type CreateMethodologyAgentInput = typeof CreateMethodologyAgentInput.Type;

export const UpdateMethodologyAgentInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  agentKey: Schema.NonEmptyString,
  agent: AgentTypeDefinition,
});
export type UpdateMethodologyAgentInput = typeof UpdateMethodologyAgentInput.Type;

export const DeleteMethodologyAgentInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  agentKey: Schema.NonEmptyString,
});
export type DeleteMethodologyAgentInput = typeof DeleteMethodologyAgentInput.Type;
