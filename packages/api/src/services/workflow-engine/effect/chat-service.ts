import {
  chatMessages,
  chatSessions,
  type ChatMessage as DBChatMessage,
  type ChatSession as DBChatSession,
  type NewChatMessage,
  type NewChatSession,
} from "@chiron/db";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { Context, Data, Effect, Layer } from "effect";
import { DatabaseService } from "./database-service";
import { WorkflowEventBus } from "./event-bus";

export class ChatServiceError extends Data.TaggedError("ChatServiceError")<{
  readonly cause: unknown;
  readonly operation: "create" | "add" | "get" | "stream" | "delete";
  readonly sessionId?: string;
}> {}

export class SessionNotFoundError extends Data.TaggedError("SessionNotFoundError")<{
  readonly sessionId: string;
}> {}

export type MessageRole = "user" | "assistant" | "system" | "tool_call" | "tool_result";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  sequenceNum: number;
  createdAt: Date;
  metadata?: {
    toolName?: string;
    toolCallId?: string;
    tokenCount?: number;
    model?: string;
    interrupted?: boolean;
    [key: string]: unknown;
  };
}

export interface ChatSession {
  id: string;
  executionId: string;
  stepId: string;
  title: string | null;
  status: "active" | "completed" | "failed" | "interrupted";
  messageCount: number;
  totalTokens: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  metadata?: Record<string, unknown>;
}

export interface GetHistoryOptions {
  limit?: number;
  beforeId?: string;
}

function dbSessionToSession(db: DBChatSession): ChatSession {
  return {
    id: db.id,
    executionId: db.executionId,
    stepId: db.stepId,
    title: db.title,
    status: db.status,
    messageCount: db.messageCount,
    totalTokens: db.totalTokens,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
    completedAt: db.completedAt,
    metadata: db.metadata ?? undefined,
  };
}

function dbMessageToMessage(db: DBChatMessage): ChatMessage {
  return {
    id: db.id,
    role: db.role,
    content: db.content,
    sequenceNum: db.sequenceNum,
    createdAt: db.createdAt,
    metadata: db.metadata ?? undefined,
  };
}

export interface ChatService {
  readonly _tag: "ChatService";

  createSession: (
    executionId: string,
    stepId: string,
    metadata?: Record<string, unknown>,
  ) => Effect.Effect<ChatSession, ChatServiceError>;

  getSession: (sessionId: string) => Effect.Effect<ChatSession, SessionNotFoundError>;

  getOrCreateSession: (
    executionId: string,
    stepId: string,
    metadata?: Record<string, unknown>,
  ) => Effect.Effect<ChatSession, ChatServiceError>;

  addMessage: (
    sessionId: string,
    message: {
      role: MessageRole;
      content: string;
      metadata?: ChatMessage["metadata"];
    },
  ) => Effect.Effect<ChatMessage, ChatServiceError>;

  getHistory: (
    sessionId: string,
    options?: GetHistoryOptions,
  ) => Effect.Effect<ChatMessage[], SessionNotFoundError>;

  updateSession: (
    sessionId: string,
    update: Partial<Pick<ChatSession, "status" | "title" | "completedAt" | "metadata">>,
  ) => Effect.Effect<ChatSession, SessionNotFoundError | ChatServiceError>;

  incrementTokens: (sessionId: string, tokens: number) => Effect.Effect<void, ChatServiceError>;

  deleteSession: (sessionId: string) => Effect.Effect<void, SessionNotFoundError>;
}

export const ChatService = Context.GenericTag<ChatService>("ChatService");

export const ChatServiceLive = Layer.effect(
  ChatService,
  Effect.gen(function* () {
    const { db } = yield* DatabaseService;
    const eventBus = yield* WorkflowEventBus;

    const getNextSequenceNum = (sessionId: string) =>
      Effect.tryPromise({
        try: async () => {
          const result = await db
            .select({ maxSeq: sql<number>`COALESCE(MAX(sequence_num), -1)` })
            .from(chatMessages)
            .where(eq(chatMessages.sessionId, sessionId));
          return (result[0]?.maxSeq ?? -1) + 1;
        },
        catch: (error) => new ChatServiceError({ cause: error, operation: "get", sessionId }),
      });

    return {
      _tag: "ChatService" as const,

      createSession: (executionId, stepId, metadata) =>
        Effect.tryPromise({
          try: async () => {
            const newSession: NewChatSession = {
              executionId,
              stepId,
              metadata: metadata ?? null,
            };
            const [result] = await db.insert(chatSessions).values(newSession).returning();
            return dbSessionToSession(result!);
          },
          catch: (error) => new ChatServiceError({ cause: error, operation: "create" }),
        }),

      getSession: (sessionId) =>
        Effect.tryPromise({
          try: async () => {
            const result = await db
              .select()
              .from(chatSessions)
              .where(eq(chatSessions.id, sessionId))
              .limit(1);
            if (!result[0]) {
              throw new SessionNotFoundError({ sessionId });
            }
            return dbSessionToSession(result[0]);
          },
          catch: (error) => {
            if (error instanceof SessionNotFoundError) return error;
            throw error;
          },
        }),

      getOrCreateSession: (executionId, stepId, metadata) =>
        Effect.tryPromise({
          try: async () => {
            const existing = await db
              .select()
              .from(chatSessions)
              .where(
                and(eq(chatSessions.executionId, executionId), eq(chatSessions.stepId, stepId)),
              )
              .limit(1);

            if (existing[0]) {
              return dbSessionToSession(existing[0]);
            }

            const [newSession] = await db
              .insert(chatSessions)
              .values({ executionId, stepId, metadata: metadata ?? null })
              .returning();
            return dbSessionToSession(newSession!);
          },
          catch: (error) => new ChatServiceError({ cause: error, operation: "create" }),
        }),

      addMessage: (sessionId, message) =>
        Effect.gen(function* () {
          const sequenceNum = yield* getNextSequenceNum(sessionId);

          const result = yield* Effect.tryPromise({
            try: async () => {
              const newMessage: NewChatMessage = {
                sessionId,
                role: message.role,
                content: message.content,
                sequenceNum,
                metadata: message.metadata ?? null,
              };

              const [inserted] = await db.insert(chatMessages).values(newMessage).returning();

              await db
                .update(chatSessions)
                .set({
                  messageCount: sql`message_count + 1`,
                  updatedAt: new Date(),
                })
                .where(eq(chatSessions.id, sessionId));

              return inserted!;
            },
            catch: (error) =>
              new ChatServiceError({
                cause: error,
                operation: "add",
                sessionId,
              }),
          });

          yield* eventBus.publish({
            _tag: "TextChunk",
            executionId: sessionId,
            chunk: `[${message.role}] Message added`,
          });

          return dbMessageToMessage(result);
        }),

      getHistory: (sessionId, options) =>
        Effect.tryPromise({
          try: async () => {
            let query = db
              .select()
              .from(chatMessages)
              .where(eq(chatMessages.sessionId, sessionId))
              .orderBy(chatMessages.sequenceNum);

            if (options?.beforeId) {
              const beforeMsg = await db
                .select({ sequenceNum: chatMessages.sequenceNum })
                .from(chatMessages)
                .where(eq(chatMessages.id, options.beforeId))
                .limit(1);

              if (beforeMsg[0]) {
                query = db
                  .select()
                  .from(chatMessages)
                  .where(
                    and(
                      eq(chatMessages.sessionId, sessionId),
                      lt(chatMessages.sequenceNum, beforeMsg[0].sequenceNum),
                    ),
                  )
                  .orderBy(chatMessages.sequenceNum);
              }
            }

            if (options?.limit) {
              query = query.limit(options.limit) as typeof query;
            }

            const results = await query;
            return results.map(dbMessageToMessage);
          },
          catch: (error) => {
            if (error instanceof SessionNotFoundError) return error;
            return new SessionNotFoundError({ sessionId });
          },
        }),

      updateSession: (sessionId, update) =>
        Effect.tryPromise({
          try: async () => {
            const updateData: Partial<DBChatSession> = {
              updatedAt: new Date(),
            };

            if (update.status !== undefined) updateData.status = update.status;
            if (update.title !== undefined) updateData.title = update.title;
            if (update.completedAt !== undefined) updateData.completedAt = update.completedAt;
            if (update.metadata !== undefined) updateData.metadata = update.metadata;

            const [result] = await db
              .update(chatSessions)
              .set(updateData)
              .where(eq(chatSessions.id, sessionId))
              .returning();

            if (!result) {
              throw new SessionNotFoundError({ sessionId });
            }

            return dbSessionToSession(result);
          },
          catch: (error) => {
            if (error instanceof SessionNotFoundError) return error;
            return new ChatServiceError({
              cause: error,
              operation: "get",
              sessionId,
            });
          },
        }),

      incrementTokens: (sessionId, tokens) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .update(chatSessions)
              .set({
                totalTokens: sql`total_tokens + ${tokens}`,
                updatedAt: new Date(),
              })
              .where(eq(chatSessions.id, sessionId));
          },
          catch: (error) =>
            new ChatServiceError({
              cause: error,
              operation: "get",
              sessionId,
            }),
        }),

      deleteSession: (sessionId) =>
        Effect.tryPromise({
          try: async () => {
            const result = await db
              .delete(chatSessions)
              .where(eq(chatSessions.id, sessionId))
              .returning({ id: chatSessions.id });

            if (!result[0]) {
              throw new SessionNotFoundError({ sessionId });
            }
          },
          catch: (error) => {
            if (error instanceof SessionNotFoundError) return error;
            throw error;
          },
        }),
    };
  }),
);
