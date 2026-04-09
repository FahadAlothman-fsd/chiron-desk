import * as Schema from "effect/Schema";

import { ModelReference } from "../methodology/agent.js";
import { WorkflowContextFactKind } from "../methodology/workflow.js";

export const AGENT_STEP_RUNTIME_STATES = [
  "not_started",
  "starting_session",
  "active_streaming",
  "active_idle",
  "disconnected_or_error",
  "completed",
] as const;

export const AgentStepRuntimeState = Schema.Literal(...AGENT_STEP_RUNTIME_STATES);
export type AgentStepRuntimeState = typeof AgentStepRuntimeState.Type;

export const AGENT_STEP_ALLOWED_STATE_TRANSITIONS = {
  not_started: ["starting_session"],
  starting_session: ["active_streaming", "active_idle", "disconnected_or_error"],
  active_streaming: ["active_idle", "disconnected_or_error"],
  active_idle: ["active_streaming", "disconnected_or_error", "completed"],
  disconnected_or_error: ["starting_session", "completed"],
  completed: [],
} as const;

export const AgentStepAllowedStateTransition = Schema.Union(
  Schema.Struct({ from: Schema.Literal("not_started"), to: Schema.Literal("starting_session") }),
  Schema.Struct({
    from: Schema.Literal("starting_session"),
    to: Schema.Literal("active_streaming"),
  }),
  Schema.Struct({ from: Schema.Literal("starting_session"), to: Schema.Literal("active_idle") }),
  Schema.Struct({
    from: Schema.Literal("starting_session"),
    to: Schema.Literal("disconnected_or_error"),
  }),
  Schema.Struct({ from: Schema.Literal("active_streaming"), to: Schema.Literal("active_idle") }),
  Schema.Struct({
    from: Schema.Literal("active_streaming"),
    to: Schema.Literal("disconnected_or_error"),
  }),
  Schema.Struct({ from: Schema.Literal("active_idle"), to: Schema.Literal("active_streaming") }),
  Schema.Struct({
    from: Schema.Literal("active_idle"),
    to: Schema.Literal("disconnected_or_error"),
  }),
  Schema.Struct({ from: Schema.Literal("active_idle"), to: Schema.Literal("completed") }),
  Schema.Struct({
    from: Schema.Literal("disconnected_or_error"),
    to: Schema.Literal("starting_session"),
  }),
  Schema.Struct({ from: Schema.Literal("disconnected_or_error"), to: Schema.Literal("completed") }),
);
export type AgentStepAllowedStateTransition = typeof AgentStepAllowedStateTransition.Type;

export const AGENT_STEP_V1_MCP_TOOLS = [
  "read_step_snapshot",
  "read_context_value",
  "write_context_value",
] as const;

export const AgentStepHarnessBindingState = Schema.Literal(
  "unbound",
  "binding",
  "bound",
  "errored",
);
export type AgentStepHarnessBindingState = typeof AgentStepHarnessBindingState.Type;

export const AgentStepStreamContract = Schema.Struct({
  streamName: Schema.Literal("agent_step_session_events"),
  streamCount: Schema.Literal(1),
  transport: Schema.Literal("sse"),
  source: Schema.Literal("step_execution_scoped"),
  purpose: Schema.Literal("timeline_and_tool_activity"),
});
export type AgentStepStreamContract = typeof AgentStepStreamContract.Type;

export const AgentStepContractBoundary = Schema.Struct({
  version: Schema.Literal("v1"),
  supportedMcpTools: Schema.Array(
    Schema.Literal("read_step_snapshot", "read_context_value", "write_context_value"),
  ),
  requestContextAccess: Schema.Literal(false),
  continuationMode: Schema.Literal("bootstrap_only"),
  nativeMessageLog: Schema.Literal(false),
  persistedWritePolicy: Schema.Literal("applied_only"),
  streamContract: AgentStepStreamContract,
});
export type AgentStepContractBoundary = typeof AgentStepContractBoundary.Type;

export const AgentStepReadableContextFact = Schema.Struct({
  contextFactDefinitionId: Schema.NonEmptyString,
  contextFactKind: WorkflowContextFactKind,
  source: Schema.Literal("explicit", "inferred_from_write"),
});
export type AgentStepReadableContextFact = typeof AgentStepReadableContextFact.Type;

export const AgentStepRuntimeWriteItem = Schema.Struct({
  writeItemId: Schema.NonEmptyString,
  contextFactDefinitionId: Schema.NonEmptyString,
  contextFactKind: WorkflowContextFactKind,
  order: Schema.Number,
  requirementContextFactDefinitionIds: Schema.Array(Schema.NonEmptyString),
  exposureMode: Schema.Literal("requirements_only"),
});
export type AgentStepRuntimeWriteItem = typeof AgentStepRuntimeWriteItem.Type;

export const AgentStepHarnessBinding = Schema.Struct({
  harnessId: Schema.Literal("opencode"),
  bindingState: AgentStepHarnessBindingState,
  sessionId: Schema.optional(Schema.NonEmptyString),
  serverInstanceId: Schema.optional(Schema.NonEmptyString),
  serverBaseUrl: Schema.optional(Schema.NonEmptyString),
  selectedAgent: Schema.optional(Schema.NonEmptyString),
  selectedModel: Schema.optional(ModelReference),
});
export type AgentStepHarnessBinding = typeof AgentStepHarnessBinding.Type;

export const AgentStepComposerState = Schema.Struct({
  enabled: Schema.Boolean,
  startSessionVisible: Schema.Boolean,
  reasonIfDisabled: Schema.optional(Schema.String),
});
export type AgentStepComposerState = typeof AgentStepComposerState.Type;

export const AgentStepTimelineCursor = Schema.Struct({
  before: Schema.optional(Schema.String),
  after: Schema.optional(Schema.String),
});
export type AgentStepTimelineCursor = typeof AgentStepTimelineCursor.Type;

export const AgentStepTimelineMessageItem = Schema.Struct({
  itemType: Schema.Literal("message"),
  timelineItemId: Schema.NonEmptyString,
  createdAt: Schema.String,
  role: Schema.Literal("system", "user", "assistant"),
  content: Schema.String,
});
export type AgentStepTimelineMessageItem = typeof AgentStepTimelineMessageItem.Type;

export const AgentStepTimelineToolItem = Schema.Struct({
  itemType: Schema.Literal("tool_activity"),
  timelineItemId: Schema.NonEmptyString,
  createdAt: Schema.String,
  toolKind: Schema.Literal("harness", "mcp"),
  toolName: Schema.NonEmptyString,
  status: Schema.Literal("started", "completed", "failed"),
  summary: Schema.optional(Schema.String),
  input: Schema.optional(Schema.String),
  output: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
});
export type AgentStepTimelineToolItem = typeof AgentStepTimelineToolItem.Type;

export const AgentStepTimelineItem = Schema.Union(
  AgentStepTimelineMessageItem,
  AgentStepTimelineToolItem,
);
export type AgentStepTimelineItem = typeof AgentStepTimelineItem.Type;

export const AgentStepRuntimeDetailPayload = Schema.Struct({
  stepType: Schema.Literal("agent"),
  state: AgentStepRuntimeState,
  contractBoundary: AgentStepContractBoundary,
  sessionStartPolicy: Schema.Literal("explicit"),
  harnessBinding: AgentStepHarnessBinding,
  composer: AgentStepComposerState,
  objective: Schema.NonEmptyString,
  instructionsMarkdown: Schema.NonEmptyString,
  readableContextFacts: Schema.Array(AgentStepReadableContextFact),
  writeItems: Schema.Array(AgentStepRuntimeWriteItem),
  timelinePreview: Schema.Array(AgentStepTimelineItem),
});
export type AgentStepRuntimeDetailPayload = typeof AgentStepRuntimeDetailPayload.Type;

export const GetAgentStepExecutionDetailInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
});
export type GetAgentStepExecutionDetailInput = typeof GetAgentStepExecutionDetailInput.Type;

export const GetAgentStepExecutionDetailOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  workflowExecutionId: Schema.NonEmptyString,
  body: AgentStepRuntimeDetailPayload,
});
export type GetAgentStepExecutionDetailOutput = typeof GetAgentStepExecutionDetailOutput.Type;

export const GetAgentStepTimelinePageInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  cursor: Schema.optional(AgentStepTimelineCursor),
  limit: Schema.optional(Schema.Number),
});
export type GetAgentStepTimelinePageInput = typeof GetAgentStepTimelinePageInput.Type;

export const GetAgentStepTimelinePageOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  cursor: AgentStepTimelineCursor,
  items: Schema.Array(AgentStepTimelineItem),
});
export type GetAgentStepTimelinePageOutput = typeof GetAgentStepTimelinePageOutput.Type;

export const StartAgentStepSessionInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
});
export type StartAgentStepSessionInput = typeof StartAgentStepSessionInput.Type;

export const StartAgentStepSessionOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  state: Schema.Literal("starting_session", "active_idle", "active_streaming"),
  bindingState: Schema.Literal("binding", "bound"),
});
export type StartAgentStepSessionOutput = typeof StartAgentStepSessionOutput.Type;

export const SendAgentStepMessageInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  message: Schema.NonEmptyString,
});
export type SendAgentStepMessageInput = typeof SendAgentStepMessageInput.Type;

export const SendAgentStepMessageOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  accepted: Schema.Literal(true),
  state: Schema.Literal("active_streaming", "active_idle"),
});
export type SendAgentStepMessageOutput = typeof SendAgentStepMessageOutput.Type;

export const UpdateAgentStepTurnSelectionInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  model: Schema.optional(ModelReference),
  agent: Schema.optional(Schema.NonEmptyString),
});
export type UpdateAgentStepTurnSelectionInput = typeof UpdateAgentStepTurnSelectionInput.Type;

export const UpdateAgentStepTurnSelectionOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  appliesTo: Schema.Literal("next_turn_only"),
  model: Schema.optional(ModelReference),
  agent: Schema.optional(Schema.NonEmptyString),
});
export type UpdateAgentStepTurnSelectionOutput = typeof UpdateAgentStepTurnSelectionOutput.Type;

export const CompleteAgentStepExecutionInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
});
export type CompleteAgentStepExecutionInput = typeof CompleteAgentStepExecutionInput.Type;

export const CompleteAgentStepExecutionOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  state: Schema.Literal("completed"),
});
export type CompleteAgentStepExecutionOutput = typeof CompleteAgentStepExecutionOutput.Type;
