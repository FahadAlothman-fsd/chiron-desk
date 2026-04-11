import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import { HarnessDiscoveryError } from "../../harness-service";
import { makeOpencodeHarnessService } from "../../opencode-harness-service";

describe("OpencodeHarnessService degraded modes", () => {
  it("falls back to a spawned ephemeral discovery server when the configured base URL is unavailable", async () => {
    const closeSpy = vi.fn(() => undefined);
    const spawnSpy = vi.fn(async () => ({
      client: {
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
      },
      server: {
        close: closeSpy,
      },
    }));
    const clientFactory = vi.fn(() => {
      throw new Error("connect failed");
    });

    const service = makeOpencodeHarnessService(spawnSpy as never, clientFactory as never);
    const metadata = await Effect.runPromise(service.discoverMetadata());

    expect(metadata.providers).toEqual([
      {
        provider: "anthropic",
        label: "Anthropic",
        defaultModel: "claude-sonnet-4",
        models: [
          {
            provider: "anthropic",
            model: "claude-sonnet-4",
            label: "Claude Sonnet 4",
            isDefault: true,
            supportsReasoning: true,
            supportsTools: true,
            supportsAttachments: true,
          },
        ],
      },
    ]);
    expect(spawnSpy).toHaveBeenCalledWith({ port: 0 });
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it("waits for the ephemeral discovery server to fully close before returning metadata", async () => {
    let closed = false;
    let closeCalled = false;

    const spawnSpy = vi.fn(async () => ({
      client: {
        app: {
          agents: async () => {
            if (closed) {
              throw new Error("server offline");
            }

            return [
              {
                name: "explore",
                description: "Explore the codebase",
                mode: "subagent",
                model: { providerID: "anthropic", modelID: "claude-sonnet-4" },
              },
            ];
          },
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
      },
      server: {
        close: vi.fn(() => {
          closeCalled = true;
          setTimeout(() => {
            closed = true;
          }, 20);
        }),
      },
    }));
    const clientFactory = vi.fn(() => {
      throw new Error("connect failed");
    });

    const service = makeOpencodeHarnessService(spawnSpy as never, clientFactory as never);

    const metadataPromise = Effect.runPromise(service.discoverMetadata());
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 5);
    });

    expect(closeCalled).toBe(true);
    expect(closed).toBe(false);

    const pendingBeforeShutdown = await Promise.race([
      metadataPromise.then(() => "resolved" as const),
      Promise.resolve("pending" as const),
    ]);

    expect(pendingBeforeShutdown).toBe("pending");

    const metadata = await metadataPromise;
    expect(metadata.harness).toBe("opencode");
    expect(closed).toBe(true);
  });

  it("cleans up the managed server when bootstrap initialization fails", async () => {
    const closeSpy = vi.fn(() => undefined);
    const managedClient = {
      app: {
        agents: vi.fn(async () => []),
      },
      config: {
        providers: vi.fn(async () => ({ providers: [], default: {} })),
      },
      session: {
        create: vi.fn(async () => ({ id: "session-1", time: { created: 1_744_193_200_000 } })),
        prompt: vi.fn(async () => {
          throw new Error("bootstrap failed");
        }),
        messages: vi.fn(async () => []),
      },
      event: {
        subscribe: vi.fn(async () => ({
          async *[Symbol.asyncIterator]() {
            yield* [];
          },
        })),
      },
    };
    const clientFactory = vi.fn((config?: { baseUrl?: string }) => {
      if (config?.baseUrl === "http://127.0.0.1:4020") {
        return managedClient;
      }

      return managedClient;
    });
    const spawnSpy = vi.fn(async () => ({
      client: managedClient,
      server: {
        url: "http://127.0.0.1:4020",
        close: closeSpy,
      },
    }));

    const service = makeOpencodeHarnessService(spawnSpy as never, clientFactory as never);
    const result = await Effect.runPromise(
      Effect.either(
        service.startSession({
          stepExecutionId: "step-exec-2",
          projectRootPath: "/tmp/chiron",
          objective: "Bootstrap",
          instructionsMarkdown: "This will fail.",
        }),
      ),
    );

    expect(result._tag).toBe("Left");
    if (result._tag !== "Left") {
      throw new Error("expected startSession to fail");
    }

    expect(result.left).toMatchObject({
      _tag: "OpenCodeExecutionError",
      operation: "start_session",
      message: "Failed to bootstrap OpenCode session context.",
    });
    expect(closeSpy).toHaveBeenCalledTimes(1);

    const missingSession = await Effect.runPromise(
      Effect.either(service.getTimelinePage("session-1")),
    );
    expect(missingSession._tag).toBe("Left");
  });

  it("surfaces a typed discovery error when both discovery connection paths fail", async () => {
    const spawnSpy = vi.fn(async () => {
      throw new Error("spawn failed");
    });
    const clientFactory = vi.fn(() => {
      throw new Error("connect failed");
    });

    const service = makeOpencodeHarnessService(spawnSpy as never, clientFactory as never);
    const result = await Effect.runPromise(Effect.either(service.discoverMetadata()));

    expect(result._tag).toBe("Left");
    if (result._tag !== "Left") {
      throw new Error("expected discovery to fail");
    }

    expect(result.left).toBeInstanceOf(HarnessDiscoveryError);
    expect(result.left).toMatchObject({
      _tag: "HarnessDiscoveryError",
      harness: "opencode",
    });
  });
});
