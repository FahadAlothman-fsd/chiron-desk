import * as Schema from "effect/Schema";

import { ModelReference } from "../methodology/agent.js";
import { AudienceGuidance } from "../methodology/guidance.js";
import { WorkflowContextFactKind } from "../methodology/workflow.js";
import { DescriptionJson } from "../shared/invariants.js";

export const AGENT_STEP_EDITOR_TABS = [
  "overview",
  "objective_and_instructions",
  "harness_and_model",
  "read_scope",
  "write_scope",
  "completion_and_runtime_policy",
  "guidance",
] as const;

export const AgentStepEditorTab = Schema.Literal(...AGENT_STEP_EDITOR_TABS);
export type AgentStepEditorTab = typeof AgentStepEditorTab.Type;

export const AgentStepHarnessKind = Schema.Literal("opencode");
export type AgentStepHarnessKind = typeof AgentStepHarnessKind.Type;

export const AgentStepExplicitReadGrant = Schema.Struct({
  contextFactDefinitionId: Schema.NonEmptyString,
});
export type AgentStepExplicitReadGrant = typeof AgentStepExplicitReadGrant.Type;

export const AgentStepWriteRequirement = Schema.Struct({
  contextFactDefinitionId: Schema.NonEmptyString,
});
export type AgentStepWriteRequirement = typeof AgentStepWriteRequirement.Type;

export const AgentStepWriteItem = Schema.Struct({
  writeItemId: Schema.NonEmptyString,
  contextFactDefinitionId: Schema.NonEmptyString,
  contextFactKind: WorkflowContextFactKind,
  label: Schema.optional(Schema.String),
  order: Schema.Number,
  requirementContextFactDefinitionIds: Schema.Array(Schema.NonEmptyString),
});
export type AgentStepWriteItem = typeof AgentStepWriteItem.Type;

export const AgentStepCompletionRequirement = Schema.Struct({
  contextFactDefinitionId: Schema.NonEmptyString,
});
export type AgentStepCompletionRequirement = typeof AgentStepCompletionRequirement.Type;

export const AgentStepRuntimePolicy = Schema.Struct({
  sessionStart: Schema.optionalWith(Schema.Literal("explicit"), { default: () => "explicit" }),
  continuationMode: Schema.optionalWith(Schema.Literal("bootstrap_only"), {
    default: () => "bootstrap_only",
  }),
  liveStreamCount: Schema.optionalWith(Schema.Literal(1), { default: () => 1 }),
  bootstrapPromptNoReply: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  nativeMessageLog: Schema.optionalWith(Schema.Literal(false), { default: () => false }),
  persistedWritePolicy: Schema.optionalWith(Schema.Literal("applied_only"), {
    default: () => "applied_only",
  }),
});
export type AgentStepRuntimePolicy = typeof AgentStepRuntimePolicy.Type;

export const AgentStepHarnessSelection = Schema.Struct({
  harness: Schema.optionalWith(AgentStepHarnessKind, { default: () => "opencode" }),
  agent: Schema.optional(Schema.NonEmptyString),
  model: Schema.optional(ModelReference),
});
export type AgentStepHarnessSelection = typeof AgentStepHarnessSelection.Type;

export const AgentStepDesignTimePayload = Schema.Struct({
  key: Schema.NonEmptyString,
  label: Schema.optional(Schema.String),
  descriptionJson: Schema.optional(DescriptionJson),
  objective: Schema.NonEmptyString,
  instructionsMarkdown: Schema.NonEmptyString,
  harnessSelection: Schema.optionalWith(AgentStepHarnessSelection, {
    default: () => ({ harness: "opencode" }),
  }),
  explicitReadGrants: Schema.Array(AgentStepExplicitReadGrant),
  writeItems: Schema.Array(AgentStepWriteItem),
  completionRequirements: Schema.Array(AgentStepCompletionRequirement),
  runtimePolicy: Schema.optionalWith(AgentStepRuntimePolicy, {
    default: () => ({
      sessionStart: "explicit",
      continuationMode: "bootstrap_only",
      liveStreamCount: 1,
      bootstrapPromptNoReply: true,
      nativeMessageLog: false,
      persistedWritePolicy: "applied_only",
    }),
  }),
  guidance: Schema.optional(AudienceGuidance),
});
export type AgentStepDesignTimePayload = typeof AgentStepDesignTimePayload.Type;

export const CreateAgentStepInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  afterStepKey: Schema.optionalWith(Schema.NullOr(Schema.NonEmptyString), { default: () => null }),
  payload: AgentStepDesignTimePayload,
});
export type CreateAgentStepInput = typeof CreateAgentStepInput.Type;

export const UpdateAgentStepInput = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  stepId: Schema.NonEmptyString,
  payload: AgentStepDesignTimePayload,
});
export type UpdateAgentStepInput = typeof UpdateAgentStepInput.Type;
