import * as Schema from "effect/Schema";

import { AgentStepNormalizedError } from "../agent-step/errors.js";
import {
  AgentStepRuntimeState,
  AgentStepStreamContract,
  AgentStepTimelineItem,
  AgentStepTimelineToolItem,
} from "../agent-step/runtime.js";

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
