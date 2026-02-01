import { chatMessages, chatSessions, streamCheckpoints } from "@chiron/db";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { Duration, Effect, Schedule, Stream } from "effect";
import {
  type AIProviderError,
  StreamingError,
  type StreamResult,
} from "@chiron/agent-runtime/ai-sdk/ai-provider-service";
import type { ApprovalRequest } from "./approval-service";
import { ApprovalService, type ApprovalServiceError } from "./approval-service";
import { ChatService, ChatServiceError } from "./chat-service";
import { ConfigService } from "./config-service";
import { DatabaseService } from "./database-service";
import { WorkflowEventBus } from "./event-bus";

export const rateLimitRetryPolicy = Schedule.exponential(Duration.seconds(1)).pipe(
  Schedule.jittered,
  Schedule.whileInput(
    (error: AIProviderError) =>
      error.retryable === true ||
      (error.cause instanceof Error && error.cause.message.includes("429")),
  ),
  Schedule.intersect(Schedule.recurs(5)),
  Schedule.andThen(Schedule.spaced(Duration.seconds(30))),
);

export function streamTextWithRetry(
  streamFn: () => Effect.Effect<StreamResult, AIProviderError>,
): Effect.Effect<StreamResult, AIProviderError> {
  return streamFn().pipe(
    Effect.retry(rateLimitRetryPolicy),
    Effect.tapError((error) => Effect.logError(`Stream failed after retries: ${error.cause}`)),
  );
}

export function streamWithCheckpoint(
  streamResult: StreamResult,
  sessionId: string,
  checkpointInterval = 50,
): Effect.Effect<string, StreamingError> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseService;

    let accumulated = "";
    let tokenCount = 0;
    let lastCheckpoint = 0;

    const [checkpoint] = yield* Effect.tryPromise({
      try: () =>
        db
          .insert(streamCheckpoints)
          .values({
            sessionId,
            accumulatedText: "",
            tokenCount: 0,
            status: "streaming",
          })
          .returning(),
      catch: (error) => new StreamingError({ cause: error, phase: "emit" }),
    });

    const checkpointId = checkpoint!.id;

    const result = yield* Stream.runForEach(streamResult.fullStream, (part) =>
      Effect.gen(function* () {
        if (part.type === "text-delta") {
          accumulated += part.textDelta;
          tokenCount++;

          if (tokenCount - lastCheckpoint >= checkpointInterval) {
            yield* Effect.tryPromise({
              try: () =>
                db
                  .update(streamCheckpoints)
                  .set({
                    accumulatedText: accumulated,
                    tokenCount,
                    lastChunkAt: new Date(),
                  })
                  .where(eq(streamCheckpoints.id, checkpointId)),
              catch: (error) => new StreamingError({ cause: error, phase: "emit" }),
            });
            lastCheckpoint = tokenCount;
          }
        }
      }),
    ).pipe(
      Effect.map(() => accumulated),
      Effect.tap(() =>
        Effect.tryPromise({
          try: () =>
            db
              .update(streamCheckpoints)
              .set({
                status: "complete",
                accumulatedText: accumulated,
                tokenCount,
                completedAt: new Date(),
              })
              .where(eq(streamCheckpoints.id, checkpointId)),
          catch: (error) => new StreamingError({ cause: error, phase: "complete" }),
        }),
      ),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              db
                .update(streamCheckpoints)
                .set({
                  status: "failed",
                  accumulatedText: accumulated,
                  errorMessage: String(error),
                })
                .where(eq(streamCheckpoints.id, checkpointId)),
            catch: () => new StreamingError({ cause: error, phase: "complete" }),
          });

          return yield* Effect.fail(
            new StreamingError({
              cause: error,
              phase: "read",
              partialText: accumulated,
            }),
          );
        }),
      ),
    );

    return result;
  });
}

export function executeToolWithTimeout<A, E>(
  effect: Effect.Effect<A, E>,
  timeoutMs = 30_000,
  toolName = "unknown",
): Effect.Effect<A | { success: false; error: string; timedOut: true }, E> {
  return effect.pipe(
    Effect.timeout(Duration.millis(timeoutMs)),
    Effect.catchTag("TimeoutException", () =>
      Effect.succeed({
        success: false as const,
        error: `Tool '${toolName}' timed out after ${timeoutMs}ms`,
        timedOut: true as const,
      }),
    ),
  );
}

export interface ApprovalTimeoutConfig {
  timeoutMs: number;
  defaultAction: "approve" | "deny" | "skip";
  notifyUser: boolean;
}

export interface ApprovalResponse {
  action: "approved" | "denied" | "skipped";
  reason: string;
  timedOut: boolean;
  value?: string;
}

export function requestApprovalWithTimeout(
  request: ApprovalRequest,
  config: ApprovalTimeoutConfig = {
    timeoutMs: 300_000,
    defaultAction: "deny",
    notifyUser: true,
  },
): Effect.Effect<ApprovalResponse, ApprovalServiceError> {
  return Effect.gen(function* () {
    const eventBus = yield* WorkflowEventBus;
    const approvalService = yield* ApprovalService;

    const toolCallId = randomUUID();
    const stepId = (request.context?.stepId as string | undefined) ?? request.toolName;

    yield* eventBus.publish({
      _tag: "ApprovalRequested",
      executionId: request.executionId,
      stepId,
      toolName: request.toolName,
      toolType: "custom",
      toolCallId,
      args: request.context ?? {},
      riskLevel: request.approval.riskLevel,
    });

    const waitForResponse = Effect.async<ApprovalResponse, never>((resume) => {
      const timeout = setTimeout(() => {
        resume(
          Effect.succeed({
            action:
              config.defaultAction === "approve"
                ? ("approved" as const)
                : config.defaultAction === "skip"
                  ? ("skipped" as const)
                  : ("denied" as const),
            reason: "timeout",
            timedOut: true,
          }),
        );
      }, config.timeoutMs);

      return Effect.sync(() => clearTimeout(timeout));
    });

    const response = yield* waitForResponse;

    if (response.timedOut && config.notifyUser) {
      yield* eventBus.publish({
        _tag: "TextChunk",
        executionId: request.executionId,
        stepId,
        chunk: `[APPROVAL_TIMEOUT] ${request.toolName} - defaulted to ${config.defaultAction}`,
      });
    }

    yield* approvalService.logDecision({
      executionId: request.executionId,
      toolName: request.toolName,
      toolType: request.toolType,
      autoApproved: false,
      reason: response.reason,
      trustLevel: "cautious",
      riskLevel: request.approval.riskLevel,
      userResponse: response.timedOut
        ? null
        : {
            action: response.action,
            value: response.value,
            responseTimeMs: config.timeoutMs,
          },
      timedOut: response.timedOut,
    });

    return response;
  });
}

export function persistStreamResult(
  sessionId: string,
  fullText: string,
  toolCalls: Array<{
    toolCallId: string;
    toolName: string;
    args: unknown;
  }>,
  usage: { completionTokens: number; totalTokens: number },
): Effect.Effect<void, ChatServiceError> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseService;

    yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const session = await tx
            .select({ messageCount: chatSessions.messageCount })
            .from(chatSessions)
            .where(eq(chatSessions.id, sessionId))
            .limit(1);

          const baseSeq = session[0]?.messageCount ?? 0;

          await tx.insert(chatMessages).values({
            sessionId,
            role: "assistant",
            content: fullText,
            sequenceNum: baseSeq,
            metadata: { tokenCount: usage.completionTokens },
          });

          if (toolCalls.length > 0) {
            await tx.insert(chatMessages).values(
              toolCalls.map((tc, idx) => ({
                sessionId,
                role: "tool_call" as const,
                content: JSON.stringify(tc.args),
                sequenceNum: baseSeq + 1 + idx,
                metadata: {
                  toolName: tc.toolName,
                  toolCallId: tc.toolCallId,
                },
              })),
            );
          }

          await tx
            .update(chatSessions)
            .set({
              messageCount: sql`message_count + ${1 + toolCalls.length}`,
              totalTokens: sql`total_tokens + ${usage.totalTokens}`,
              updatedAt: new Date(),
            })
            .where(eq(chatSessions.id, sessionId));
        }),
      catch: (error) => new ChatServiceError({ cause: error, operation: "add", sessionId }),
    });
  });
}

export function interruptibleStream(
  streamResult: StreamResult,
  sessionId: string,
): Effect.Effect<string, StreamingError> {
  return Effect.gen(function* () {
    let accumulated = "";
    const chatService = yield* ChatService;

    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        if (accumulated.length > 0) {
          yield* chatService
            .addMessage(sessionId, {
              role: "assistant",
              content: accumulated,
              metadata: { interrupted: true },
            })
            .pipe(Effect.orDie);
        }
        yield* streamResult.abort();
        yield* Effect.log(`Stream interrupted, saved ${accumulated.length} chars`);
      }),
    );

    yield* Stream.runForEach(streamResult.textStream, (chunk) =>
      Effect.sync(() => {
        accumulated += chunk;
      }),
    );

    return accumulated;
  }).pipe(Effect.scoped);
}

export function recoverFromCheckpoint(
  sessionId: string,
): Effect.Effect<string | null, StreamingError> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseService;

    const checkpoints = yield* Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(streamCheckpoints)
          .where(eq(streamCheckpoints.sessionId, sessionId))
          .orderBy(streamCheckpoints.createdAt)
          .limit(1),
      catch: (error) => new StreamingError({ cause: error, phase: "read" }),
    });

    const checkpoint = checkpoints[0];
    if (!checkpoint) {
      return null;
    }

    if (checkpoint.status === "streaming" || checkpoint.status === "interrupted") {
      return checkpoint.accumulatedText;
    }

    return null;
  });
}

export type AILayerError =
  | AIProviderError
  | ChatServiceError
  | ApprovalServiceError
  | StreamingError;

export function isRetryable(error: AILayerError): boolean {
  if ("retryable" in error) {
    return error.retryable === true;
  }
  return false;
}

export function getPartialText(error: AILayerError): string | undefined {
  if ("partialText" in error) {
    return error.partialText;
  }
  return undefined;
}
