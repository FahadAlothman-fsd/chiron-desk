import { Effect, Layer, Queue, Stream } from "effect";

import { HarnessExecutionError } from "@chiron/contracts/agent-step/errors";
import type { AgentStepTimelineCursor } from "@chiron/contracts/agent-step/runtime";
import type { AgentStepSseEnvelope } from "@chiron/contracts/sse";
import {
  HarnessService,
  type HarnessDiscoveryMetadata,
  type HarnessMessageAccepted,
  type HarnessSession,
  type HarnessSessionConfig,
  type HarnessSessionStarted,
  type HarnessTimelinePage,
} from "./harness-service";

const DEFAULT_METADATA: HarnessDiscoveryMetadata = {
  harness: "opencode",
  discoveredAt: "2026-04-09T00:00:00.000Z",
  agents: [
    {
      key: "fake-agent",
      label: "fake-agent",
      description: "In-memory fake harness agent",
      mode: "all",
      defaultModel: {
        provider: "fake-provider",
        model: "fake-model",
      },
    },
  ],
  providers: [
    {
      provider: "fake-provider",
      label: "Fake Provider",
      defaultModel: "fake-model",
      models: [
        {
          provider: "fake-provider",
          model: "fake-model",
          label: "Fake Model",
          isDefault: true,
          supportsReasoning: true,
          supportsTools: true,
          supportsAttachments: false,
        },
      ],
    },
  ],
  models: [
    {
      provider: "fake-provider",
      model: "fake-model",
      label: "Fake Model",
      isDefault: true,
      supportsReasoning: true,
      supportsTools: true,
      supportsAttachments: false,
    },
  ],
};

const SESSION_STREAM_CONTRACT = {
  streamName: "agent_step_session_events" as const,
  streamCount: 1 as const,
  transport: "sse" as const,
  source: "step_execution_scoped" as const,
  purpose: "timeline_and_tool_activity" as const,
};

type FakeHarnessOptions = {
  readonly metadata?: HarnessDiscoveryMetadata;
  readonly now?: () => string;
  readonly idFactory?: (prefix: string) => string;
  readonly responseResolver?: (input: {
    readonly session: HarnessSession;
    readonly message: string;
    readonly turn: number;
  }) => string;
};

type FakeHarnessSessionRecord = {
  session: HarnessSession;
  timeline: Array<HarnessTimelinePage["items"][number]>;
  eventLog: Array<AgentStepSseEnvelope>;
  subscribers: Set<Queue.Queue<AgentStepSseEnvelope>>;
  turnCount: number;
};

function defaultNow(): string {
  return new Date().toISOString();
}

function defaultIdFactory(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizeExecutionError(
  operation: HarnessExecutionError["operation"],
  message: string,
  cause?: unknown,
): HarnessExecutionError {
  return new HarnessExecutionError({
    operation,
    message,
    ...(cause === undefined ? {} : { cause }),
  });
}

function createCursor(items: HarnessTimelinePage["items"]): HarnessTimelinePage["cursor"] {
  if (items.length === 0) {
    return {};
  }

  return {
    before: items[0]?.timelineItemId,
    after: items[items.length - 1]?.timelineItemId,
  };
}

function defaultResponseResolver(input: {
  readonly session: HarnessSession;
  readonly message: string;
  readonly turn: number;
}): string {
  return [
    `Fake harness response ${input.turn} for ${input.session.stepExecutionId}.`,
    `Received: ${input.message}`,
  ].join(" ");
}

export function makeFakeHarnessService(options: FakeHarnessOptions = {}) {
  const metadata = options.metadata ?? DEFAULT_METADATA;
  const now = options.now ?? defaultNow;
  const idFactory = options.idFactory ?? defaultIdFactory;
  const responseResolver = options.responseResolver ?? defaultResponseResolver;

  const sessionsById = new Map<string, FakeHarnessSessionRecord>();
  const sessionIdByStepExecutionId = new Map<string, string>();

  const emitToSubscribers = (record: FakeHarnessSessionRecord, event: AgentStepSseEnvelope) =>
    Effect.forEach(Array.from(record.subscribers), (subscriber) => Queue.offer(subscriber, event), {
      concurrency: "unbounded",
      discard: true,
    });

  const pushEvent = (record: FakeHarnessSessionRecord, event: AgentStepSseEnvelope) => {
    record.eventLog.push(event);
    return emitToSubscribers(record, event);
  };

  const pushTimelineItem = (
    record: FakeHarnessSessionRecord,
    item: HarnessTimelinePage["items"][number],
  ) => {
    record.timeline.push(item);

    if (item.itemType === "tool_activity") {
      return pushEvent(record, {
        version: "v1",
        stream: "agent_step_session_events",
        eventType: "tool_activity",
        stepExecutionId: record.session.stepExecutionId,
        data: { item },
      });
    }

    return pushEvent(record, {
      version: "v1",
      stream: "agent_step_session_events",
      eventType: "timeline",
      stepExecutionId: record.session.stepExecutionId,
      data: { item },
    });
  };

  const setSessionState = (record: FakeHarnessSessionRecord, state: HarnessSession["state"]) => {
    record.session = { ...record.session, state };

    return pushEvent(record, {
      version: "v1",
      stream: "agent_step_session_events",
      eventType: "session_state",
      stepExecutionId: record.session.stepExecutionId,
      data: { state },
    });
  };

  const requireSession = (sessionId: string, operation: HarnessExecutionError["operation"]) =>
    Effect.fromNullable(sessionsById.get(sessionId)).pipe(
      Effect.orElseFail(() =>
        normalizeExecutionError(operation, `Harness session '${sessionId}' was not found.`),
      ),
    );

  const getTimelineSlice = (
    items: HarnessTimelinePage["items"],
    cursor?: AgentStepTimelineCursor,
  ) => {
    if (!cursor?.before && !cursor?.after) {
      return items;
    }

    if (cursor.after) {
      const afterIndex = items.findIndex((item) => item.timelineItemId === cursor.after);
      return afterIndex >= 0 ? items.slice(afterIndex + 1) : items;
    }

    if (cursor.before) {
      const beforeIndex = items.findIndex((item) => item.timelineItemId === cursor.before);
      return beforeIndex >= 0 ? items.slice(0, beforeIndex) : items;
    }

    return items;
  };

  return HarnessService.of({
    discoverMetadata: () => Effect.succeed(metadata),
    startSession: (config: HarnessSessionConfig) =>
      Effect.gen(function* () {
        const existingSessionId = sessionIdByStepExecutionId.get(config.stepExecutionId);
        if (existingSessionId) {
          const existing = yield* requireSession(existingSessionId, "start_session");
          const items = [...existing.timeline];

          return {
            session: existing.session,
            serverInstanceId: `fake-server:${existing.session.stepExecutionId}`,
            serverBaseUrl: `http://fake-opencode.local/${existing.session.stepExecutionId}`,
            timeline: items,
            cursor: createCursor(items),
          } satisfies HarnessSessionStarted;
        }

        const startedAt = now();
        const session: HarnessSession = {
          sessionId: idFactory("session"),
          stepExecutionId: config.stepExecutionId,
          startedAt,
          state: "active_idle",
          ...(config.agent ? { agent: config.agent } : {}),
          ...(config.model ? { model: config.model } : {}),
        };

        const bootstrapItem: HarnessTimelinePage["items"][number] = {
          itemType: "message",
          timelineItemId: idFactory("timeline"),
          createdAt: startedAt,
          role: "system",
          content: [config.objective, config.instructionsMarkdown].join("\n\n"),
        };

        const record: FakeHarnessSessionRecord = {
          session,
          timeline: [bootstrapItem],
          eventLog: [],
          subscribers: new Set(),
          turnCount: 0,
        };

        const bootstrapEvent: AgentStepSseEnvelope = {
          version: "v1",
          stream: "agent_step_session_events",
          eventType: "bootstrap",
          stepExecutionId: config.stepExecutionId,
          data: {
            state: session.state,
            streamContract: SESSION_STREAM_CONTRACT,
            timelineItems: [...record.timeline],
          },
        };

        record.eventLog.push(bootstrapEvent);
        sessionsById.set(session.sessionId, record);
        sessionIdByStepExecutionId.set(config.stepExecutionId, session.sessionId);

        return {
          session,
          serverInstanceId: `fake-server:${config.stepExecutionId}`,
          serverBaseUrl: `http://fake-opencode.local/${config.stepExecutionId}`,
          timeline: [...record.timeline],
          cursor: createCursor(record.timeline),
        } satisfies HarnessSessionStarted;
      }).pipe(
        Effect.catchAll((error) =>
          error instanceof HarnessExecutionError
            ? Effect.fail(error)
            : Effect.fail(
                normalizeExecutionError("start_session", "Failed to start fake session.", error),
              ),
        ),
      ),
    sendMessage: (sessionId: string, message: string) =>
      Effect.gen(function* () {
        if (message.trim().length === 0) {
          return yield* normalizeExecutionError(
            "send_message",
            "Harness message must be non-empty.",
          );
        }

        const record = yield* requireSession(sessionId, "send_message");

        if (record.session.state === "completed") {
          return yield* normalizeExecutionError(
            "send_message",
            `Harness session '${sessionId}' is already completed.`,
          );
        }

        record.turnCount += 1;
        const messageTimestamp = now();
        const assistantTimestamp = now();

        const userMessage: HarnessTimelinePage["items"][number] = {
          itemType: "message",
          timelineItemId: idFactory("timeline"),
          createdAt: messageTimestamp,
          role: "user",
          content: message,
        };
        const startedToolItem: HarnessTimelinePage["items"][number] = {
          itemType: "tool_activity",
          timelineItemId: idFactory("timeline"),
          createdAt: messageTimestamp,
          toolKind: "harness",
          toolName: "send_message",
          status: "started",
          summary: "Fake harness started processing the turn.",
        };
        const assistantMessage: HarnessTimelinePage["items"][number] = {
          itemType: "message",
          timelineItemId: idFactory("timeline"),
          createdAt: assistantTimestamp,
          role: "assistant",
          content: responseResolver({
            session: record.session,
            message,
            turn: record.turnCount,
          }),
        };
        const completedToolItem: HarnessTimelinePage["items"][number] = {
          itemType: "tool_activity",
          timelineItemId: idFactory("timeline"),
          createdAt: assistantTimestamp,
          toolKind: "harness",
          toolName: "send_message",
          status: "completed",
          summary: "Fake harness completed the turn.",
        };

        yield* setSessionState(record, "active_streaming");
        yield* pushTimelineItem(record, userMessage);
        yield* pushTimelineItem(record, startedToolItem);
        yield* pushTimelineItem(record, assistantMessage);
        yield* pushTimelineItem(record, completedToolItem);
        yield* setSessionState(record, "active_idle");
        yield* pushEvent(record, {
          version: "v1",
          stream: "agent_step_session_events",
          eventType: "done",
          stepExecutionId: record.session.stepExecutionId,
          data: { finalState: "active_idle" },
        });

        return {
          sessionId,
          stepExecutionId: record.session.stepExecutionId,
          accepted: true,
          state: "active_idle",
        } satisfies HarnessMessageAccepted;
      }).pipe(
        Effect.catchAll((error) =>
          error instanceof HarnessExecutionError
            ? Effect.fail(error)
            : Effect.fail(
                normalizeExecutionError(
                  "send_message",
                  "Failed to send fake harness message.",
                  error,
                ),
              ),
        ),
      ),
    getTimelinePage: (sessionId: string, cursor?: AgentStepTimelineCursor) =>
      Effect.gen(function* () {
        const record = yield* requireSession(sessionId, "stream_events");
        const items = getTimelineSlice(record.timeline, cursor);

        return {
          sessionId,
          stepExecutionId: record.session.stepExecutionId,
          cursor: createCursor(items),
          items,
        } satisfies HarnessTimelinePage;
      }).pipe(
        Effect.catchAll((error) =>
          error instanceof HarnessExecutionError
            ? Effect.fail(error)
            : Effect.fail(
                normalizeExecutionError(
                  "stream_events",
                  "Failed to load fake harness timeline page.",
                  error,
                ),
              ),
        ),
      ),
    streamSessionEvents: (sessionId: string) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const record = yield* requireSession(sessionId, "stream_events");
          const subscriber = yield* Queue.unbounded<AgentStepSseEnvelope>();

          yield* Queue.offerAll(subscriber, record.eventLog);
          record.subscribers.add(subscriber);

          return Stream.fromQueue(subscriber);
        }).pipe(
          Effect.catchAll((error) =>
            error instanceof HarnessExecutionError
              ? Effect.fail(error)
              : Effect.fail(
                  normalizeExecutionError(
                    "stream_events",
                    "Failed to open fake harness event stream.",
                    error,
                  ),
                ),
          ),
        ),
      ),
  });
}

export const FakeHarnessServiceLive = Layer.succeed(HarnessService, makeFakeHarnessService());
