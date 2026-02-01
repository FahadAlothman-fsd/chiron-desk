import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk";
import { Effect, Layer, Stream } from "effect";
import type {
  AgentRunParams,
  AgentRunResult,
  AgentStreamEvent,
  AgentToolOutcome,
} from "@chiron/contracts";
import { AgentRuntimeError } from "../errors";
import { OpenCodeAgentAdapter } from "../adapters";
import { registerSession } from "../opencode/session-registry";
import { ensureChironTools } from "../opencode/ensure-tools";

type OpenCodeServer = {
  url: string;
  close: () => void | Promise<void>;
};

type OpenCodeClient = ReturnType<typeof createOpencodeClient>;

type GlobalEvent = {
  directory: string;
  payload: {
    type: string;
    [key: string]: unknown;
  };
};

const toolset = {
  chiron_context: true,
  chiron_actions: true,
  chiron_action: true,
} as const;

let serverPromise: Promise<OpenCodeServer> | null = null;

const ensureServer = async (baseUrl?: string): Promise<OpenCodeServer> => {
  if (baseUrl ?? process.env.OPENCODE_BASE_URL) {
    return {
      url: baseUrl ?? process.env.OPENCODE_BASE_URL ?? "",
      close: () => undefined,
    };
  }
  if (!serverPromise) {
    serverPromise = createOpencodeServer({ port: 4096, config: {} as const });
  }
  return serverPromise;
};

const createClient = async (
  directory?: string,
  baseUrl?: string,
): Promise<{ client: OpenCodeClient; baseUrl: string }> => {
  const server = await ensureServer(baseUrl);
  const client = createOpencodeClient({ baseUrl: server.url, directory });
  return { client, baseUrl: server.url };
};

const encodeDirectory = (directory?: string): string | undefined => {
  if (!directory) return undefined;
  const isNonAscii = /[^\u0000-\u007F]/.test(directory);
  return isNonAscii ? encodeURIComponent(directory) : directory;
};

const buildPromptParts = (messages: AgentRunParams["messages"]) => {
  return messages.map((message) => ({
    type: "text",
    text: message.content,
  }));
};

const parseSseStream = async function* (
  response: Response,
): AsyncGenerator<GlobalEvent, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as GlobalEvent;
        yield parsed;
      } catch {
        continue;
      }
    }
  }
};

const mapEventToAgentStream = (event: GlobalEvent): AgentStreamEvent | null => {
  const payload = event.payload;
  const type = payload.type as string;
  if (type === "message.part.updated") {
    const part = (payload as { part?: any; delta?: any }).part;
    const delta = (payload as { delta?: any }).delta;
    if (!part) return null;
    if (part.type === "text") {
      const text = delta?.text ?? part.text ?? "";
      return {
        type: "message.delta",
        executionId: part.sessionID ?? "",
        stepId: part.sessionID ?? "",
        text,
      };
    }
    if (part.type === "tool") {
      const toolName = part.tool as string;
      const toolCallId = part.callID as string;
      const state = part.state ?? {};
      const status = state.status as string | undefined;
      if (status === "pending") {
        return {
          type: "tool.pending",
          executionId: part.sessionID ?? "",
          stepId: part.sessionID ?? "",
          toolName,
          toolCallId,
        };
      }
      if (status === "running") {
        return {
          type: "tool.call",
          executionId: part.sessionID ?? "",
          stepId: part.sessionID ?? "",
          toolName,
          toolCallId,
          args: state.input ?? {},
        };
      }
      if (status === "completed") {
        return {
          type: "tool.result",
          executionId: part.sessionID ?? "",
          stepId: part.sessionID ?? "",
          toolName,
          toolCallId,
          result: state.output ?? null,
        };
      }
      if (status === "error") {
        return {
          type: "error",
          executionId: part.sessionID ?? "",
          stepId: part.sessionID ?? "",
          error: state.error ?? "tool error",
        };
      }
    }
  }

  if (type === "session.idle") {
    const sessionId = (payload as { sessionID?: string }).sessionID ?? "";
    return {
      type: "message.complete",
      executionId: sessionId,
      stepId: sessionId,
      text: "",
    };
  }

  return null;
};

export const OpenCodeAgentAdapterLive = Layer.effect(
  OpenCodeAgentAdapter,
  Effect.sync(() => ({
    kind: "opencode" as const,
    run: (params: AgentRunParams) =>
      Effect.tryPromise({
        try: async () => {
          const directory = encodeDirectory(params.directory);
          const { client, baseUrl } = await createClient(params.directory, params.opencodeBaseUrl);

          const session = await client.session.create({
            directory,
            title: `Chiron Step ${params.stepNumber}`,
          });
          const sessionId = (session as any).data?.id ?? (session as any).id ?? session;

          registerSession(sessionId, {
            executionId: params.executionId,
            stepId: params.stepId,
            directory: params.directory,
          });

          await client.session.prompt_async({
            path: { sessionID: sessionId },
            query: { directory },
            body: {
              model: {
                providerID: params.model.split(":")[0] ?? "openrouter",
                modelID: params.model.split(":")[1] ?? params.model,
              },
              agent: "chiron-opencode",
              parts: buildPromptParts(params.messages),
              tools: toolset,
            },
          });

          const response = await fetch(`${baseUrl}/global/event`, {
            headers: {
              Accept: "text/event-stream",
              "x-opencode-directory": directory ?? "",
            },
          });

          let fullText = "";
          const toolOutcomes: AgentToolOutcome[] = [];

          for await (const globalEvent of parseSseStream(response)) {
            const mapped = mapEventToAgentStream(globalEvent);
            if (!mapped) continue;
            if (mapped.type === "message.delta") {
              fullText += mapped.text;
            }
            if (mapped.type === "tool.pending") {
              toolOutcomes.push({
                toolName: mapped.toolName,
                status: "pending",
              });
            }
            if (mapped.type === "tool.result") {
              toolOutcomes.push({
                toolName: mapped.toolName,
                status: "executed",
                result: mapped.result,
              });
            }
            if (mapped.type === "message.complete") {
              break;
            }
          }

          return {
            fullText,
            toolOutcomes,
          } satisfies AgentRunResult;
        },
        catch: (cause) =>
          new AgentRuntimeError({
            cause,
            operation: "adapter",
          }),
      }),
    stream: (params: AgentRunParams) =>
      Stream.unwrap(
        Effect.tryPromise({
          try: async () => {
            const directory = encodeDirectory(params.directory);
            const { client, baseUrl } = await createClient(
              params.directory,
              params.opencodeBaseUrl,
            );

            const session = await client.session.create({
              directory,
              title: `Chiron Step ${params.stepNumber}`,
            });
            const sessionId = (session as any).data?.id ?? (session as any).id ?? session;

            registerSession(sessionId, {
              executionId: params.executionId,
              stepId: params.stepId,
              directory: params.directory,
            });

            await client.session.prompt_async({
              path: { sessionID: sessionId },
              query: { directory },
              body: {
                model: {
                  providerID: params.model.split(":")[0] ?? "openrouter",
                  modelID: params.model.split(":")[1] ?? params.model,
                },
                agent: "chiron-opencode",
                parts: buildPromptParts(params.messages),
                tools: toolset,
              },
            });

            const response = await fetch(`${baseUrl}/global/event`, {
              headers: {
                Accept: "text/event-stream",
                "x-opencode-directory": directory ?? "",
              },
            });

            const generator = (async function* () {
              for await (const globalEvent of parseSseStream(response)) {
                const mapped = mapEventToAgentStream(globalEvent);
                if (!mapped) continue;
                yield mapped;
                if (mapped.type === "message.complete") break;
              }
            })();

            return Stream.fromAsyncIterable(
              generator,
              (cause) =>
                new AgentRuntimeError({
                  cause,
                  operation: "stream",
                }),
            );
          },
          catch: (cause) =>
            new AgentRuntimeError({
              cause,
              operation: "adapter",
            }),
        }),
      ),
  })),
);
