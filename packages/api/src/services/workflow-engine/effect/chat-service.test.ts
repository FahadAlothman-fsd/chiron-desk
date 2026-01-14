import { describe, expect, it } from "bun:test";
import { getTableName } from "drizzle-orm";
import { Effect, Layer } from "effect";
import {
  ChatService,
  ChatServiceError,
  ChatServiceLive,
  SessionNotFoundError,
} from "./chat-service";
import { DatabaseService } from "./database-service";
import { WorkflowEventBus, WorkflowEventBusLive } from "./event-bus";

const mockSessions: Map<string, any> = new Map();
const mockMessages: Map<string, any[]> = new Map();
let messageIdCounter = 0;
let sessionIdCounter = 0;

const createMockDb = () => ({
  insert: (table: any) => ({
    values: (data: any) => ({
      returning: async () => {
        const tableName = getTableName(table);
        if (tableName === "chat_sessions") {
          const id = `session-${++sessionIdCounter}`;
          const session = {
            id,
            executionId: data.executionId,
            stepId: data.stepId,
            title: data.title ?? null,
            status: "active" as const,
            messageCount: 0,
            totalTokens: 0,
            metadata: data.metadata ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: null,
          };
          mockSessions.set(id, session);
          mockMessages.set(id, []);
          return [session];
        }
        if (tableName === "chat_messages") {
          const id = `msg-${++messageIdCounter}`;
          const message = {
            id,
            sessionId: data.sessionId,
            role: data.role,
            content: data.content,
            sequenceNum: data.sequenceNum,
            metadata: data.metadata ?? null,
            createdAt: new Date(),
          };
          const sessionMessages = mockMessages.get(data.sessionId) || [];
          sessionMessages.push(message);
          mockMessages.set(data.sessionId, sessionMessages);
          return [message];
        }
        return [{ id: "test-id", ...data }];
      },
    }),
  }),
  select: (_fields?: any) => ({
    from: (table: any) => {
      const tableName = getTableName(table);
      const createThenable = (result: any) =>
        Object.assign(Promise.resolve(result), {
          limit: async (n: number) => result.slice(0, n),
          orderBy: () => ({ limit: async (_n: number) => [] }),
        });

      return {
        where: (_condition: any) => {
          if (tableName === "chat_messages") {
            return createThenable([{ maxSeq: -1 }]);
          }
          if (tableName === "chat_sessions") {
            const sessions = Array.from(mockSessions.values());
            return createThenable(sessions);
          }
          return createThenable([]);
        },
        orderBy: () => ({
          limit: async (_n: number) => [],
        }),
      };
    },
  }),
  update: (table: any) => ({
    set: (data: any) => ({
      where: (_condition: any) => ({
        returning: async () => {
          const tableName = getTableName(table);
          if (tableName === "chat_sessions") {
            for (const [id, session] of mockSessions.entries()) {
              const updated = { ...session, ...data, updatedAt: new Date() };
              mockSessions.set(id, updated);
              return [updated];
            }
          }
          return [{ id: "test-id", ...data }];
        },
      }),
      returning: async () => [{ id: "test-id", ...data }],
    }),
  }),
  delete: (table: any) => ({
    where: (_condition: any) => ({
      returning: async () => [{ id: "deleted-id" }],
    }),
  }),
});

const createTestLayers = () => {
  mockSessions.clear();
  mockMessages.clear();
  messageIdCounter = 0;
  sessionIdCounter = 0;

  const MockDatabaseLayer = Layer.succeed(DatabaseService, {
    _tag: "DatabaseService" as const,
    db: createMockDb() as any,
    transaction: (fn: any) => Effect.tryPromise({ try: () => fn(createMockDb()), catch: (e) => e }),
  });

  return ChatServiceLive.pipe(
    Layer.provide(MockDatabaseLayer),
    Layer.provide(WorkflowEventBusLive),
  );
};

describe("ChatService", () => {
  describe("createSession", () => {
    it("should create a new chat session", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ChatService;
        return yield* service.createSession("exec-1", "step-1", {
          model: "test-model",
        });
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(createTestLayers())));

      expect(result.id).toBeDefined();
      expect(result.executionId).toBe("exec-1");
      expect(result.stepId).toBe("step-1");
      expect(result.status).toBe("active");
      expect(result.messageCount).toBe(0);
    });
  });

  describe("addMessage", () => {
    it("should add a message to a session", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ChatService;
        const session = yield* service.createSession("exec-2", "step-2");
        return yield* service.addMessage(session.id, {
          role: "user",
          content: "Hello, AI!",
        });
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(createTestLayers())));

      expect(result.id).toBeDefined();
      expect(result.role).toBe("user");
      expect(result.content).toBe("Hello, AI!");
      expect(result.sequenceNum).toBe(0);
    });

    it("should support different message roles", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ChatService;
        const session = yield* service.createSession("exec-3", "step-3");

        const userMsg = yield* service.addMessage(session.id, {
          role: "user",
          content: "User message",
        });

        const assistantMsg = yield* service.addMessage(session.id, {
          role: "assistant",
          content: "Assistant response",
        });

        const toolCallMsg = yield* service.addMessage(session.id, {
          role: "tool_call",
          content: '{"action": "test"}',
          metadata: { toolName: "test-tool" },
        });

        return { userMsg, assistantMsg, toolCallMsg };
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(createTestLayers())));

      expect(result.userMsg.role).toBe("user");
      expect(result.assistantMsg.role).toBe("assistant");
      expect(result.toolCallMsg.role).toBe("tool_call");
      expect(result.toolCallMsg.metadata?.toolName).toBe("test-tool");
    });
  });

  describe("getOrCreateSession", () => {
    it("should create new session if none exists", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ChatService;
        return yield* service.getOrCreateSession("exec-new", "step-new");
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(createTestLayers())));

      expect(result.id).toBeDefined();
      expect(result.executionId).toBe("exec-new");
    });
  });

  describe("updateSession", () => {
    it("should update session status", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ChatService;
        const session = yield* service.createSession("exec-upd", "step-upd");
        return yield* service.updateSession(session.id, {
          status: "completed",
          completedAt: new Date(),
        });
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(createTestLayers())));

      expect(result.status).toBe("completed");
    });
  });

  describe("incrementTokens", () => {
    it("should increment token count", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ChatService;
        const session = yield* service.createSession("exec-tok", "step-tok");
        yield* service.incrementTokens(session.id, 100);
        return session;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(createTestLayers())));

      expect(result).toBeDefined();
    });
  });
});
