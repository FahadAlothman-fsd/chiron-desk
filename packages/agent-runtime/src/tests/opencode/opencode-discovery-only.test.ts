import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import { makeOpencodeHarnessService } from "../../opencode-harness-service";

describe("opencode harness discovery only", () => {
  it("connects to an existing opencode server for discovery without spawning a new server", async () => {
    const spawnSpy = vi.fn(async () => {
      throw new Error("should not spawn");
    });
    const clientFactory = vi.fn(() => ({
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
    }));

    const service = makeOpencodeHarnessService(spawnSpy as never, clientFactory as never);

    const metadata = await Effect.runPromise(service.discoverMetadata());

    expect(metadata.harness).toBe("opencode");
    expect(clientFactory).toHaveBeenCalledTimes(1);
    expect(spawnSpy).not.toHaveBeenCalled();
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
  });

  it("falls back to a spawned ephemeral server when no existing server is reachable", async () => {
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

    expect(metadata.harness).toBe("opencode");
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
});
