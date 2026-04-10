import { Effect, Stream } from "effect";
import { describe, expect, it, vi } from "vitest";

import { makeOpencodeHarnessService } from "../../opencode-harness-service";

function makeEventFeed() {
  const values: unknown[] = [];
  const waiters: Array<(value: IteratorResult<unknown>) => void> = [];

  return {
    push(value: unknown) {
      if (waiters.length > 0) {
        const waiter = waiters.shift();
        waiter?.({ done: false, value });
        return;
      }

      values.push(value);
    },
    iterable: {
      [Symbol.asyncIterator]() {
        return {
          next() {
            if (values.length > 0) {
              return Promise.resolve({ done: false, value: values.shift() });
            }

            return new Promise<IteratorResult<unknown>>((resolve) => {
              waiters.push(resolve);
            });
          },
        };
      },
    } satisfies AsyncIterable<unknown>,
  };
}

describe("OpencodeHarnessService runtime", () => {
  it("discovers against an existing OpenCode server without spawning one", async () => {
    const spawnSpy = vi.fn(async () => {
      throw new Error("should not spawn");
    });
    const clientFactory = vi.fn((config?: { baseUrl?: string }) => {
      expect(config?.baseUrl).toBe("http://127.0.0.1:4096");
      return {
        app: {
          agents: async () => [
            {
              name: "explore",
              description: "Explore the codebase",
              mode: "subagent",
              model: { providerID: "anthropic", modelID: "claude-sonnet-4" },
            },
          ],
        },
        config: {
          providers: async () => ({
            providers: [
              {
                id: "anthropic",
                name: "Anthropic",
                models: {
                  "claude-sonnet-4": {
                    id: "claude-sonnet-4",
                    name: "Claude Sonnet 4",
                    capabilities: {
                      reasoning: true,
                      toolcall: true,
                      attachment: true,
                    },
                  },
                },
              },
            ],
            default: { anthropic: "claude-sonnet-4" },
          }),
        },
        session: {
          create: vi.fn(),
          prompt: vi.fn(),
          messages: vi.fn(),
        },
        event: {
          subscribe: vi.fn(),
        },
      };
    });

    const service = makeOpencodeHarnessService(spawnSpy as never, clientFactory as never);
    const metadata = await Effect.runPromise(service.discoverMetadata());

    expect(metadata.harness).toBe("opencode");
    expect(metadata.agents).toEqual([
      {
        key: "explore",
        label: "explore",
        description: "Explore the codebase",
        mode: "subagent",
        defaultModel: {
          provider: "anthropic",
          model: "claude-sonnet-4",
        },
      },
    ]);
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it("starts a managed OpenCode session, normalizes timeline history, and replays the contract SSE log", async () => {
    const eventFeed = makeEventFeed();
    const closeSpy = vi.fn(() => undefined);

    const bootstrapMessages: unknown[] = [
      {
        info: {
          id: "bootstrap-msg",
          role: "user",
          time: { created: 1_744_193_200_000 },
        },
        parts: [{ type: "text", text: "Draft a setup handoff.\n\nUse the managed runtime." }],
      },
    ];
    const fullMessages: unknown[] = [
      ...bootstrapMessages,
      {
        info: {
          id: "user-msg-1",
          role: "user",
          time: { created: 1_744_193_201_000 },
        },
        parts: [{ type: "text", text: "please continue" }],
      },
      {
        info: {
          id: "assistant-msg-1",
          role: "assistant",
          time: { created: 1_744_193_202_000, completed: 1_744_193_203_000 },
        },
        parts: [
          {
            id: "tool-part-1",
            type: "tool",
            tool: "write_context_value",
            state: {
              status: "completed",
              title: "Applied summary write",
              input: { summary: "Current project summary", updated: true },
              output: "Applied summary write",
              time: { start: 1_744_193_202_000, end: 1_744_193_203_000 },
            },
          },
          {
            type: "text",
            text: "Updated the summary and queued the next artifact write.",
          },
        ],
      },
    ];

    let currentMessages: unknown[] = bootstrapMessages;
    const managedClient = {
      app: {
        agents: vi.fn(async () => []),
      },
      config: {
        providers: vi.fn(async () => ({ providers: [], default: {} })),
      },
      session: {
        create: vi.fn(async () => ({
          id: "session-1",
          time: { created: 1_744_193_200_000 },
        })),
        prompt: vi.fn(async ({ body }: { body?: { noReply?: boolean } }) => {
          if (body?.noReply) {
            currentMessages = bootstrapMessages;
            return { ok: true };
          }

          currentMessages = fullMessages;
          return {
            info: {
              id: "assistant-msg-1",
              role: "assistant",
            },
            parts: [],
          };
        }),
        messages: vi.fn(async () => currentMessages),
      },
      event: {
        subscribe: vi.fn(async () => eventFeed.iterable),
      },
    };

    const discoveryClient = {
      app: {
        agents: vi.fn(async () => []),
      },
      config: {
        providers: vi.fn(async () => ({ providers: [], default: {} })),
      },
      session: {
        create: vi.fn(),
        prompt: vi.fn(),
        messages: vi.fn(),
      },
      event: {
        subscribe: vi.fn(async () => eventFeed.iterable),
      },
    };

    const clientFactory = vi.fn((config?: { baseUrl?: string }) => {
      if (config?.baseUrl === "http://127.0.0.1:4010") {
        return managedClient;
      }

      return discoveryClient;
    });
    const spawnSpy = vi.fn(async () => ({
      client: managedClient,
      server: {
        url: "http://127.0.0.1:4010",
        close: closeSpy,
      },
    }));

    const service = makeOpencodeHarnessService(spawnSpy as never, clientFactory as never);

    const started = await Effect.runPromise(
      service.startSession({
        stepExecutionId: "step-exec-1",
        projectRootPath: "/tmp/chiron",
        agent: "explore",
        model: { provider: "anthropic", model: "claude-sonnet-4" },
        objective: "Draft a setup handoff.",
        instructionsMarkdown: "Use the managed runtime.",
      }),
    );
    const restarted = await Effect.runPromise(
      service.startSession({
        stepExecutionId: "step-exec-1",
        projectRootPath: "/tmp/chiron",
        objective: "ignored",
        instructionsMarkdown: "ignored",
      }),
    );

    expect(spawnSpy).toHaveBeenCalledTimes(1);
    expect(spawnSpy).toHaveBeenCalledWith({
      port: 0,
      config: {
        share: "disabled",
        mcp: {
          chiron: {
            type: "remote",
            url: "http://127.0.0.1:3000/mcp?stepExecutionId=step-exec-1",
            enabled: true,
          },
        },
      },
    });
    expect(started.session).toEqual(restarted.session);
    expect(started.serverInstanceId).toBe(restarted.serverInstanceId);
    expect(started.serverBaseUrl).toBe("http://127.0.0.1:4010");
    expect(started.timeline).toEqual([
      {
        itemType: "message",
        timelineItemId: "message:bootstrap-msg",
        createdAt: "2025-04-09T10:06:40.000Z",
        role: "user",
        content: "Draft a setup handoff.\n\nUse the managed runtime.",
      },
    ]);

    const accepted = await Effect.runPromise(service.sendMessage("session-1", "please continue"));
    expect(accepted).toEqual({
      sessionId: "session-1",
      stepExecutionId: "step-exec-1",
      accepted: true,
      state: "active_idle",
    });

    const page = await Effect.runPromise(service.getTimelinePage("session-1"));
    const startedToolItem = page.items[2];
    const completedToolItem = page.items[4];

    expect(page.items).toEqual([
      expect.objectContaining({ itemType: "message", role: "user" }),
      expect.objectContaining({ itemType: "message", role: "user", content: "please continue" }),
      expect.objectContaining({
        itemType: "tool_activity",
        toolKind: "mcp",
        toolName: "write_context_value",
        status: "started",
        summary: "Applied summary write",
      }),
      expect.objectContaining({
        itemType: "message",
        role: "assistant",
        content: "Updated the summary and queued the next artifact write.",
      }),
      expect.objectContaining({
        itemType: "tool_activity",
        toolKind: "mcp",
        toolName: "write_context_value",
        status: "completed",
        output: "Applied summary write",
      }),
    ]);

    expect(startedToolItem?.summary).toBe("Applied summary write");
    expect(JSON.parse(String(startedToolItem?.input))).toEqual({
      summary: "Current project summary",
      updated: true,
    });
    expect(completedToolItem?.output).toBe("Applied summary write");

    const streamEvents = Array.from(
      await Effect.runPromise(
        Stream.runCollect(service.streamSessionEvents("session-1").pipe(Stream.take(9))),
      ),
    );
    expect(streamEvents.map((event) => event.eventType)).toEqual([
      "bootstrap",
      "timeline",
      "session_state",
      "timeline",
      "tool_activity",
      "timeline",
      "tool_activity",
      "session_state",
      "done",
    ]);
    expect(managedClient.session.prompt).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        path: { id: "session-1" },
        body: expect.objectContaining({
          noReply: true,
          agent: "explore",
          model: { providerID: "anthropic", modelID: "claude-sonnet-4" },
          parts: [{ type: "text", text: "Draft a setup handoff.\n\nUse the managed runtime." }],
        }),
      }),
    );
  });

  it("reuses an existing OpenCode session id when resumeSessionId is provided", async () => {
    const resumeMessages: unknown[] = [
      {
        info: {
          id: "resume-user-msg",
          role: "user",
          time: { created: 1_744_193_210_000 },
        },
        parts: [{ type: "text", text: "existing conversation" }],
      },
    ];

    const createSessionSpy = vi.fn(async () => ({
      id: "new-session-should-not-be-used",
      time: { created: 1_744_193_220_000 },
    }));

    const managedClient = {
      app: {
        agents: vi.fn(async () => []),
      },
      config: {
        providers: vi.fn(async () => ({ providers: [], default: {} })),
      },
      session: {
        create: createSessionSpy,
        prompt: vi.fn(async () => ({ ok: true })),
        messages: vi.fn(async ({ path }: { path: { id: string } }) => {
          expect(path.id).toBe("resume-session-1");
          return resumeMessages;
        }),
      },
      event: {
        subscribe: vi.fn(async () => ({ [Symbol.asyncIterator]: async function* () {} })),
      },
    };

    const spawnSpy = vi.fn(async () => ({
      server: { kill: vi.fn() },
      baseUrl: "http://127.0.0.1:4010",
      client: managedClient,
      close: vi.fn(),
    }));

    const service = makeOpencodeHarnessService(
      spawnSpy as never,
      vi.fn(() => managedClient) as never,
    );

    const started = await Effect.runPromise(
      service.startSession({
        stepExecutionId: "step-1",
        projectRootPath: "/tmp/chiron",
        resumeSessionId: "resume-session-1",
        objective: "Reuse the existing session.",
        instructionsMarkdown: "Do not fork history.",
      }),
    );

    expect(started.session.sessionId).toBe("resume-session-1");
    expect(createSessionSpy).not.toHaveBeenCalled();
    expect(started.timeline).toEqual([
      expect.objectContaining({
        itemType: "message",
        role: "user",
        content: "existing conversation",
      }),
    ]);
  });

  it("normalizes raw OpenCode session errors at the adapter boundary", async () => {
    const eventFeed = makeEventFeed();

    const managedClient = {
      app: {
        agents: vi.fn(async () => []),
      },
      config: {
        providers: vi.fn(async () => ({ providers: [], default: {} })),
      },
      session: {
        create: vi.fn(async () => ({ id: "session-error", time: { created: 1_744_193_200_000 } })),
        prompt: vi.fn(async () => ({ ok: true })),
        messages: vi.fn(async () => [
          {
            info: {
              id: "bootstrap-msg",
              role: "user",
              time: { created: 1_744_193_200_000 },
            },
            parts: [{ type: "text", text: "Bootstrap" }],
          },
        ]),
      },
      event: {
        subscribe: vi.fn(async () => eventFeed.iterable),
      },
    };
    const clientFactory = vi.fn(() => managedClient);
    const spawnSpy = vi.fn(async () => ({
      client: managedClient,
      server: {
        url: "http://127.0.0.1:4011",
        close: vi.fn(() => undefined),
      },
    }));

    const service = makeOpencodeHarnessService(spawnSpy as never, clientFactory as never);
    await Effect.runPromise(
      service.startSession({
        stepExecutionId: "step-exec-error",
        projectRootPath: "/tmp/chiron",
        objective: "Bootstrap",
        instructionsMarkdown: "Instructions",
      }),
    );

    const streamPromise = Effect.runPromise(
      Stream.runCollect(service.streamSessionEvents("session-error").pipe(Stream.take(5))),
    );

    setTimeout(() => {
      eventFeed.push({
        type: "session.error",
        properties: {
          sessionID: "session-error",
          error: {
            name: "APIError",
            data: { message: "provider down" },
          },
        },
      });
    }, 0);

    const streamEvents = Array.from(await streamPromise);
    expect(streamEvents.map((event) => event.eventType)).toEqual([
      "bootstrap",
      "timeline",
      "session_state",
      "error",
      "done",
    ]);
    expect(streamEvents[3]).toMatchObject({
      eventType: "error",
      data: {
        error: expect.objectContaining({
          _tag: "OpenCodeExecutionError",
          operation: "stream_events",
          message: "provider down",
        }),
      },
    });
    expect(streamEvents[4]).toMatchObject({
      eventType: "done",
      data: { finalState: "disconnected_or_error" },
    });
  });
});
