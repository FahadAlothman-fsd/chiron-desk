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
            id: "reasoning-part-1",
            type: "reasoning",
            text: "I should confirm the summary write before replying.",
            time: { start: 1_744_193_202_500, end: 1_744_193_202_900 },
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
    const thinkingItem = page.items[3];
    const completedToolItem = page.items[5];

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
        itemType: "thinking",
        createdAt: "2025-04-09T10:06:42.500Z",
        content: "I should confirm the summary write before replying.",
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

    expect(startedToolItem).toMatchObject({
      itemType: "tool_activity",
      summary: "Applied summary write",
    });
    expect(JSON.parse(String((startedToolItem as { input?: string } | undefined)?.input))).toEqual({
      summary: "Current project summary",
      updated: true,
    });
    expect(thinkingItem).toMatchObject({
      itemType: "thinking",
      createdAt: "2025-04-09T10:06:42.500Z",
      content: "I should confirm the summary write before replying.",
    });
    expect(completedToolItem).toMatchObject({
      itemType: "tool_activity",
      output: "Applied summary write",
    });

    const streamEvents = Array.from(
      await Effect.runPromise(
        Stream.runCollect(service.streamSessionEvents("session-1").pipe(Stream.take(10))),
      ),
    );
    expect(streamEvents.map((event) => event.eventType)).toEqual([
      "bootstrap",
      "timeline",
      "session_state",
      "timeline",
      "tool_activity",
      "timeline",
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

  it("reconnects through a saved server base url before spawning a new managed server", async () => {
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

    const attachedClient = {
      app: {
        agents: vi.fn(async () => []),
      },
      config: {
        providers: vi.fn(async () => ({ providers: [], default: {} })),
      },
      session: {
        create: vi.fn(async () => ({
          id: "should-not-create",
          time: { created: 1_744_193_220_000 },
        })),
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

    const clientFactory = vi.fn(() => attachedClient);
    const spawnSpy = vi.fn(async () => {
      throw new Error("should not spawn");
    });

    const service = makeOpencodeHarnessService(spawnSpy as never, clientFactory as never);

    const reconnected = await Effect.runPromise(
      service.reconnectSession({
        stepExecutionId: "step-1",
        projectRootPath: "/tmp/chiron",
        resumeSessionId: "resume-session-1",
        serverBaseUrl: "http://127.0.0.1:4010",
        objective: "Reuse the existing session.",
        instructionsMarkdown: "Do not fork history.",
      }),
    );

    expect(spawnSpy).not.toHaveBeenCalled();
    expect(clientFactory).toHaveBeenCalledWith({
      baseUrl: "http://127.0.0.1:4010",
      directory: "/tmp/chiron",
    });
    expect(reconnected.serverBaseUrl).toBe("http://127.0.0.1:4010");
    expect(reconnected.session.sessionId).toBe("resume-session-1");
    expect(reconnected.timeline).toEqual([
      expect.objectContaining({
        itemType: "message",
        role: "user",
        content: "existing conversation",
      }),
    ]);
  });

  it("falls back to spawning a managed server when the saved server base url is unreachable", async () => {
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

    const managedClient = {
      app: {
        agents: vi.fn(async () => []),
      },
      config: {
        providers: vi.fn(async () => ({ providers: [], default: {} })),
      },
      session: {
        create: vi.fn(async () => ({
          id: "should-not-create",
          time: { created: 1_744_193_220_000 },
        })),
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

    const clientFactory = vi.fn((config?: { baseUrl?: string; directory?: string }) => {
      if (config?.baseUrl === "http://127.0.0.1:4011") {
        throw new Error("connect failed");
      }

      if (config?.baseUrl === "http://127.0.0.1:4010") {
        return managedClient;
      }

      throw new Error(`unexpected client config: ${JSON.stringify(config)}`);
    });
    const spawnSpy = vi.fn(async () => ({
      client: managedClient,
      server: {
        url: "http://127.0.0.1:4010",
        close: vi.fn(() => undefined),
      },
    }));

    const service = makeOpencodeHarnessService(spawnSpy as never, clientFactory as never);

    const reconnected = await Effect.runPromise(
      service.reconnectSession({
        stepExecutionId: "step-1",
        projectRootPath: "/tmp/chiron",
        resumeSessionId: "resume-session-1",
        serverBaseUrl: "http://127.0.0.1:4011",
        objective: "Reuse the existing session.",
        instructionsMarkdown: "Do not fork history.",
      }),
    );

    expect(spawnSpy).toHaveBeenCalledTimes(1);
    expect(clientFactory).toHaveBeenCalledWith({
      baseUrl: "http://127.0.0.1:4011",
      directory: "/tmp/chiron",
    });
    expect(clientFactory).toHaveBeenCalledWith({
      baseUrl: "http://127.0.0.1:4010",
      directory: "/tmp/chiron",
    });
    expect(reconnected.serverBaseUrl).toBe("http://127.0.0.1:4010");
    expect(reconnected.session.sessionId).toBe("resume-session-1");
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

  it("allows bootstrap prompt generation when noReply is false", async () => {
    const eventFeed = makeEventFeed();
    const managedClient = {
      app: {
        agents: vi.fn(async () => []),
      },
      config: {
        providers: vi.fn(async () => ({ providers: [], default: {} })),
      },
      session: {
        create: vi.fn(async () => ({
          id: "session-autoreply",
          time: { created: 1_744_193_200_000 },
        })),
        prompt: vi.fn(async () => ({
          info: { id: "assistant-msg-1", role: "assistant" },
          parts: [{ type: "text", text: "Bootstrap reply" }],
        })),
        messages: vi.fn(async () => [
          {
            info: {
              id: "bootstrap-user-msg",
              role: "user",
              time: { created: 1_744_193_200_000 },
            },
            parts: [{ type: "text", text: "Bootstrap\n\nInstructions" }],
          },
          {
            info: {
              id: "bootstrap-assistant-msg",
              role: "assistant",
              time: { created: 1_744_193_201_000 },
            },
            parts: [{ type: "text", text: "Bootstrap reply" }],
          },
        ]),
      },
      event: {
        subscribe: vi.fn(async () => eventFeed.iterable),
      },
    };

    const service = makeOpencodeHarnessService(
      vi.fn(async () => ({
        client: managedClient,
        server: {
          url: "http://127.0.0.1:4010",
          close: vi.fn(),
        },
      })) as never,
      vi.fn(() => managedClient) as never,
    );

    const started = await Effect.runPromise(
      service.startSession({
        stepExecutionId: "step-exec-autoreply",
        projectRootPath: "/tmp/chiron",
        objective: "Bootstrap",
        instructionsMarkdown: "Instructions",
        noReply: false,
      }),
    );

    expect(managedClient.session.prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.not.objectContaining({ noReply: true }),
      }),
    );

    const streamEvents = Array.from(
      await Effect.runPromise(
        Stream.runCollect(service.streamSessionEvents("session-autoreply").pipe(Stream.take(6))),
      ),
    );

    expect(streamEvents.map((event) => event.eventType)).toEqual([
      "bootstrap",
      "session_state",
      "timeline",
      "timeline",
      "session_state",
      "done",
    ]);
    expect(streamEvents[1]).toMatchObject({
      eventType: "session_state",
      data: { state: "active_streaming" },
    });
    const timelineItems = streamEvents
      .filter((event) => event.eventType === "timeline")
      .map((event) => event.data.item);
    expect(timelineItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemType: "message",
          role: "assistant",
          content: "Bootstrap reply",
        }),
      ]),
    );
    expect(streamEvents[5]).toMatchObject({
      eventType: "done",
      data: { finalState: "active_idle" },
    });

    expect(["active_streaming", "active_idle"]).toContain(started.session.state);
  });

  it("rejects sendMessage while bootstrap noReply=false turn is still streaming", async () => {
    const eventFeed = makeEventFeed();
    let releaseBootstrap: (() => void) | undefined;
    let promptCallCount = 0;
    const bootstrapInFlight = new Promise<void>((resolve) => {
      releaseBootstrap = resolve;
    });

    const managedClient = {
      app: {
        agents: vi.fn(async () => []),
      },
      config: {
        providers: vi.fn(async () => ({ providers: [], default: {} })),
      },
      session: {
        create: vi.fn(async () => ({
          id: "session-bootstrap-streaming",
          time: { created: 1_744_193_200_000 },
        })),
        prompt: vi.fn(async () => {
          promptCallCount += 1;
          if (promptCallCount === 1) {
            await bootstrapInFlight;
            return {
              info: { id: "assistant-msg-1", role: "assistant" },
              parts: [{ type: "text", text: "Bootstrap reply" }],
            };
          }

          return { ok: true };
        }),
        messages: vi.fn(async () => [
          {
            info: {
              id: "bootstrap-user-msg",
              role: "user",
              time: { created: 1_744_193_200_000 },
            },
            parts: [{ type: "text", text: "Bootstrap\n\nInstructions" }],
          },
        ]),
      },
      event: {
        subscribe: vi.fn(async () => eventFeed.iterable),
      },
    };

    const service = makeOpencodeHarnessService(
      vi.fn(async () => ({
        client: managedClient,
        server: {
          url: "http://127.0.0.1:4010",
          close: vi.fn(),
        },
      })) as never,
      vi.fn(() => managedClient) as never,
    );

    const started = await Effect.runPromise(
      service.startSession({
        stepExecutionId: "step-exec-bootstrap-streaming",
        projectRootPath: "/tmp/chiron",
        objective: "Bootstrap",
        instructionsMarkdown: "Instructions",
        noReply: false,
      }),
    );

    await Effect.runPromise(
      Stream.runCollect(
        service.streamSessionEvents(started.session.sessionId).pipe(
          Stream.filter((event) => event.eventType === "session_state"),
          Stream.take(1),
        ),
      ),
    );

    const sendAttempt = await Effect.runPromise(
      Effect.either(service.sendMessage(started.session.sessionId, "follow up")),
    );

    expect(sendAttempt).toMatchObject({
      _tag: "Left",
      left: {
        _tag: "OpenCodeExecutionError",
        operation: "send_message",
      },
    });

    releaseBootstrap?.();
  });
});
