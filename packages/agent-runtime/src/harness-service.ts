import { Context } from "effect";
import * as Schema from "effect/Schema";

import { HarnessExecutionError, OpenCodeExecutionError } from "@chiron/contracts/agent-step/errors";
import {
  AgentStepTimelineCursor,
  AgentStepTimelineItem,
} from "@chiron/contracts/agent-step/runtime";
import { ModelReference } from "@chiron/contracts/methodology/agent";
import { AgentStepSseEnvelope } from "@chiron/contracts/sse";

export const HarnessDiscoveredModel = Schema.Struct({
  provider: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  label: Schema.NonEmptyString,
  isDefault: Schema.Boolean,
  supportsReasoning: Schema.Boolean,
  supportsTools: Schema.Boolean,
  supportsAttachments: Schema.Boolean,
});
export type HarnessDiscoveredModel = typeof HarnessDiscoveredModel.Type;

export const HarnessDiscoveredProvider = Schema.Struct({
  provider: Schema.NonEmptyString,
  label: Schema.NonEmptyString,
  defaultModel: Schema.optional(Schema.NonEmptyString),
  models: Schema.Array(HarnessDiscoveredModel),
});
export type HarnessDiscoveredProvider = typeof HarnessDiscoveredProvider.Type;

export const HarnessDiscoveredAgent = Schema.Struct({
  key: Schema.NonEmptyString,
  label: Schema.NonEmptyString,
  description: Schema.optional(Schema.String),
  mode: Schema.Literal("subagent", "primary", "all"),
  defaultModel: Schema.optional(
    Schema.Struct({
      provider: Schema.NonEmptyString,
      model: Schema.NonEmptyString,
    }),
  ),
});
export type HarnessDiscoveredAgent = typeof HarnessDiscoveredAgent.Type;

export const HarnessDiscoveryMetadata = Schema.Struct({
  harness: Schema.Literal("opencode"),
  discoveredAt: Schema.NonEmptyString,
  agents: Schema.Array(HarnessDiscoveredAgent),
  providers: Schema.Array(HarnessDiscoveredProvider),
  models: Schema.Array(HarnessDiscoveredModel),
});
export type HarnessDiscoveryMetadata = typeof HarnessDiscoveryMetadata.Type;

export class HarnessDiscoveryError extends Schema.TaggedError<HarnessDiscoveryError>()(
  "HarnessDiscoveryError",
  {
    harness: Schema.NonEmptyString,
    message: Schema.String,
  },
) {}

export const HarnessOperationError = Schema.Union(HarnessExecutionError, OpenCodeExecutionError);
export type HarnessOperationError = typeof HarnessOperationError.Type;

export const HarnessSessionConfig = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  projectRootPath: Schema.NonEmptyString,
  resumeSessionId: Schema.optional(Schema.NonEmptyString),
  agent: Schema.optional(Schema.NonEmptyString),
  model: Schema.optional(ModelReference),
  objective: Schema.NonEmptyString,
  instructionsMarkdown: Schema.NonEmptyString,
});
export type HarnessSessionConfig = typeof HarnessSessionConfig.Type;

export const HarnessReconnectSessionConfig = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  projectRootPath: Schema.NonEmptyString,
  resumeSessionId: Schema.NonEmptyString,
  serverBaseUrl: Schema.optional(Schema.NonEmptyString),
  agent: Schema.optional(Schema.NonEmptyString),
  model: Schema.optional(ModelReference),
  objective: Schema.NonEmptyString,
  instructionsMarkdown: Schema.NonEmptyString,
});
export type HarnessReconnectSessionConfig = typeof HarnessReconnectSessionConfig.Type;

export const HarnessSession = Schema.Struct({
  sessionId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  startedAt: Schema.NonEmptyString,
  state: Schema.Literal(
    "starting_session",
    "active_streaming",
    "active_idle",
    "disconnected_or_error",
    "completed",
  ),
  agent: Schema.optional(Schema.NonEmptyString),
  model: Schema.optional(ModelReference),
});
export type HarnessSession = typeof HarnessSession.Type;

export const HarnessSessionStarted = Schema.Struct({
  session: HarnessSession,
  serverInstanceId: Schema.optional(Schema.NonEmptyString),
  serverBaseUrl: Schema.optional(Schema.NonEmptyString),
  timeline: Schema.Array(AgentStepTimelineItem),
  cursor: AgentStepTimelineCursor,
});
export type HarnessSessionStarted = typeof HarnessSessionStarted.Type;

export const HarnessMessageAccepted = Schema.Struct({
  sessionId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  accepted: Schema.Literal(true),
  state: Schema.Literal("active_streaming", "active_idle"),
});
export type HarnessMessageAccepted = typeof HarnessMessageAccepted.Type;

export const HarnessTimelinePage = Schema.Struct({
  sessionId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  cursor: AgentStepTimelineCursor,
  items: Schema.Array(AgentStepTimelineItem),
});
export type HarnessTimelinePage = typeof HarnessTimelinePage.Type;

export class HarnessService extends Context.Tag("@chiron/agent-runtime/HarnessService")<
  HarnessService,
  {
    readonly discoverMetadata: () => import("effect").Effect.Effect<
      HarnessDiscoveryMetadata,
      HarnessDiscoveryError
    >;
    readonly startSession: (
      config: HarnessSessionConfig,
    ) => import("effect").Effect.Effect<HarnessSessionStarted, HarnessOperationError>;
    readonly reconnectSession: (
      config: HarnessReconnectSessionConfig,
    ) => import("effect").Effect.Effect<HarnessSessionStarted, HarnessOperationError>;
    readonly sendMessage: (
      sessionId: string,
      message: string,
    ) => import("effect").Effect.Effect<HarnessMessageAccepted, HarnessOperationError>;
    readonly getTimelinePage: (
      sessionId: string,
      cursor?: typeof AgentStepTimelineCursor.Type,
    ) => import("effect").Effect.Effect<HarnessTimelinePage, HarnessOperationError>;
    readonly streamSessionEvents: (
      sessionId: string,
    ) => import("effect").Stream.Stream<AgentStepSseEnvelope, HarnessOperationError>;
  }
>() {}
