import * as Schema from "effect/Schema";

import { AgentStepNormalizedError } from "../agent-step/errors.js";
import {
  AgentStepRuntimeState,
  AgentStepStreamContract,
  AgentStepTimelineItem,
  AgentStepTimelineToolItem,
} from "../agent-step/runtime.js";
import {
  ActionStepRenderableActionStatus,
  ActionStepRenderableItemStatus,
  RuntimeActionAffectedTarget,
  RuntimeActionCompletionSummary,
} from "../runtime/executions.js";

export const AGENT_STEP_SSE_EVENT_TYPES = [
  "bootstrap",
  "session_state",
  "timeline",
  "tool_activity",
  "error",
  "done",
] as const;

export const AgentStepSseEventType = Schema.Literal(...AGENT_STEP_SSE_EVENT_TYPES);
export type AgentStepSseEventType = typeof AgentStepSseEventType.Type;

export const AgentStepSseEnvelope = Schema.Union(
  Schema.Struct({
    version: Schema.Literal("v1"),
    stream: Schema.Literal("agent_step_session_events"),
    eventType: Schema.Literal("bootstrap"),
    stepExecutionId: Schema.NonEmptyString,
    data: Schema.Struct({
      state: AgentStepRuntimeState,
      streamContract: AgentStepStreamContract,
      timelineItems: Schema.Array(AgentStepTimelineItem),
    }),
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    stream: Schema.Literal("agent_step_session_events"),
    eventType: Schema.Literal("session_state"),
    stepExecutionId: Schema.NonEmptyString,
    data: Schema.Struct({
      state: AgentStepRuntimeState,
    }),
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    stream: Schema.Literal("agent_step_session_events"),
    eventType: Schema.Literal("timeline"),
    stepExecutionId: Schema.NonEmptyString,
    data: Schema.Struct({
      item: AgentStepTimelineItem,
    }),
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    stream: Schema.Literal("agent_step_session_events"),
    eventType: Schema.Literal("tool_activity"),
    stepExecutionId: Schema.NonEmptyString,
    data: Schema.Struct({
      item: AgentStepTimelineToolItem,
    }),
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    stream: Schema.Literal("agent_step_session_events"),
    eventType: Schema.Literal("error"),
    stepExecutionId: Schema.NonEmptyString,
    data: Schema.Struct({
      error: AgentStepNormalizedError,
    }),
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    stream: Schema.Literal("agent_step_session_events"),
    eventType: Schema.Literal("done"),
    stepExecutionId: Schema.NonEmptyString,
    data: Schema.Struct({
      finalState: Schema.Literal("active_idle", "disconnected_or_error", "completed"),
    }),
  }),
);
export type AgentStepSseEnvelope = typeof AgentStepSseEnvelope.Type;

export const ACTION_STEP_SSE_EVENT_TYPES = [
  "bootstrap",
  "action-status-changed",
  "action-item-status-changed",
  "step-completion-eligibility-changed",
  "error",
  "done",
] as const;

export const ActionStepSseEventType = Schema.Literal(...ACTION_STEP_SSE_EVENT_TYPES);
export type ActionStepSseEventType = typeof ActionStepSseEventType.Type;

const ActionStepBootstrapAction = Schema.Struct({
  actionId: Schema.NonEmptyString,
  status: ActionStepRenderableActionStatus,
  resultSummaryJson: Schema.optional(Schema.Unknown),
});

const ActionStepBootstrapItem = Schema.Struct({
  actionId: Schema.NonEmptyString,
  itemId: Schema.NonEmptyString,
  status: ActionStepRenderableItemStatus,
  resultSummaryJson: Schema.optional(Schema.Unknown),
  affectedTargets: Schema.Array(RuntimeActionAffectedTarget),
});

export const ActionStepSseEnvelope = Schema.Union(
  Schema.Struct({
    version: Schema.Literal("v1"),
    stream: Schema.Literal("action_step_execution_events"),
    eventType: Schema.Literal("bootstrap"),
    stepExecutionId: Schema.NonEmptyString,
    data: Schema.Struct({
      stepStatus: Schema.Literal("active", "completed"),
      completionSummary: RuntimeActionCompletionSummary,
      actions: Schema.Array(ActionStepBootstrapAction),
      items: Schema.Array(ActionStepBootstrapItem),
    }),
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    stream: Schema.Literal("action_step_execution_events"),
    eventType: Schema.Literal("action-status-changed"),
    stepExecutionId: Schema.NonEmptyString,
    data: Schema.Struct({
      actionId: Schema.NonEmptyString,
      status: ActionStepRenderableActionStatus,
      resultSummaryJson: Schema.optional(Schema.Unknown),
      resultJson: Schema.optional(Schema.Unknown),
    }),
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    stream: Schema.Literal("action_step_execution_events"),
    eventType: Schema.Literal("action-item-status-changed"),
    stepExecutionId: Schema.NonEmptyString,
    data: Schema.Struct({
      actionId: Schema.NonEmptyString,
      itemId: Schema.NonEmptyString,
      status: ActionStepRenderableItemStatus,
      resultSummaryJson: Schema.optional(Schema.Unknown),
      resultJson: Schema.optional(Schema.Unknown),
      affectedTargets: Schema.Array(RuntimeActionAffectedTarget),
    }),
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    stream: Schema.Literal("action_step_execution_events"),
    eventType: Schema.Literal("step-completion-eligibility-changed"),
    stepExecutionId: Schema.NonEmptyString,
    data: RuntimeActionCompletionSummary,
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    stream: Schema.Literal("action_step_execution_events"),
    eventType: Schema.Literal("error"),
    stepExecutionId: Schema.NonEmptyString,
    data: Schema.Struct({
      message: Schema.String,
    }),
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    stream: Schema.Literal("action_step_execution_events"),
    eventType: Schema.Literal("done"),
    stepExecutionId: Schema.NonEmptyString,
    data: Schema.Struct({
      finalStepStatus: Schema.Literal("active", "completed"),
    }),
  }),
);
export type ActionStepSseEnvelope = typeof ActionStepSseEnvelope.Type;
