import {
  createOpencode,
  createOpencodeClient,
  type OpencodeClient,
  type OpencodeClientConfig,
} from "@opencode-ai/sdk";
import { HarnessExecutionError, OpenCodeExecutionError } from "@chiron/contracts/agent-step/errors";
import type {
  AgentStepTimelineCursor,
  AgentStepTimelineItem,
} from "@chiron/contracts/agent-step/runtime";
import type { AgentStepSseEnvelope } from "@chiron/contracts/sse";
import { inspect } from "node:util";
import { Context, Effect, Layer, Option, Queue, Runtime, Stream } from "effect";

import {
  HarnessDiscoveryError,
  HarnessService,
  type HarnessDiscoveredAgent,
  type HarnessDiscoveredModel,
  type HarnessDiscoveredProvider,
  type HarnessDiscoveryMetadata,
  type HarnessMessageAccepted,
  type HarnessSession,
  type HarnessSessionConfig,
  type HarnessSessionStarted,
  type HarnessTimelinePage,
} from "./harness-service";

type OpencodeFactory = typeof createOpencode;

type PromptModel = {
  providerID: string;
  modelID: string;
};

type PromptInput = {
  readonly sessionId: string;
  readonly text: string;
  readonly agent?: string;
  readonly model?: PromptModel;
  readonly noReply?: boolean;
};

type OpencodeMessageRecord = {
  readonly info: unknown;
  readonly parts: readonly unknown[];
};

type OpencodeClientPort = {
  readonly discoverAgents: () => Promise<unknown>;
  readonly discoverProviders: () => Promise<unknown>;
  readonly createSession: (input: { readonly title: string }) => Promise<unknown>;
  readonly prompt: (input: PromptInput) => Promise<unknown>;
  readonly listMessages: (sessionId: string) => Promise<readonly OpencodeMessageRecord[]>;
  readonly subscribeEvents: (options?: { readonly signal?: AbortSignal }) => Promise<unknown>;
  readonly healthCheck: () => Promise<void>;
};

type OpencodeManagedServer = {
  readonly serverInstanceId: string;
  readonly stepExecutionId?: string;
  readonly baseUrl: string;
  readonly client: OpencodeClientPort;
  readonly owned: boolean;
  readonly close: () => void | Promise<void>;
};

type SessionRecord = {
  session: HarnessSession;
  readonly client: OpencodeClientPort;
  readonly server: OpencodeManagedServer;
  readonly bootstrapContent: string;
  readonly bootstrapTimelineItemId: string;
  readonly timeline: AgentStepTimelineItem[];
  readonly timelineIds: Set<string>;
  readonly eventLog: AgentStepSseEnvelope[];
  readonly subscribers: Set<Queue.Queue<AgentStepSseEnvelope>>;
  eventPumpActive: boolean;
  eventPumpAbortController?: AbortController;
};

type OpencodeClientFactoryServiceShape = {
  readonly createClient: (
    config: OpencodeClientConfig & { readonly directory?: string },
  ) => Effect.Effect<OpencodeClientPort, OpenCodeExecutionError>;
};

type OpencodeServerManagerServiceShape = {
  readonly connectExistingServer: (
    baseUrl: string,
    options?: {
      readonly directory?: string;
      readonly stepExecutionId?: string;
    },
  ) => Effect.Effect<OpencodeManagedServer, HarnessDiscoveryError>;
  readonly startDiscoveryServer: () => Effect.Effect<OpencodeManagedServer, HarnessDiscoveryError>;
  readonly startManagedServer: (
    stepExecutionId: string,
    directory: string,
    preferredBaseUrl?: string,
  ) => Effect.Effect<OpencodeManagedServer, OpenCodeExecutionError>;
  readonly stopServer: (server: OpencodeManagedServer) => Effect.Effect<void, never>;
};

const DEFAULT_OPENCODE_URL = "http://127.0.0.1:4096";
const DEFAULT_CHIRON_MCP_URL = "http://127.0.0.1:3000/mcp";
const SESSION_STREAM_CONTRACT = {
  streamName: "agent_step_session_events" as const,
  streamCount: 1 as const,
  transport: "sse" as const,
  source: "step_execution_scoped" as const,
  purpose: "timeline_and_tool_activity" as const,
};

export class OpencodeClientFactoryService extends Context.Tag(
  "@chiron/agent-runtime/OpencodeClientFactoryService",
)<OpencodeClientFactoryService, OpencodeClientFactoryServiceShape>() {}

export class OpencodeServerManagerService extends Context.Tag(
  "@chiron/agent-runtime/OpencodeServerManagerService",
)<OpencodeServerManagerService, OpencodeServerManagerServiceShape>() {}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function unwrapResponse<T>(value: T | { data: T }): T {
  const record = asRecord(value);
  return record && "data" in record ? (record.data as T) : (value as T);
}

function createId(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

function normalizeTimestamp(value: unknown, fallback: string): string {
  const numeric = readNumber(value);
  if (numeric === undefined) {
    return fallback;
  }

  const millis = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
  return new Date(millis).toISOString();
}

function resolveOpencodeBaseUrl(): string {
  const envUrl = process.env.OPENCODE_SERVER_URL?.trim();
  return envUrl && envUrl.length > 0 ? envUrl : DEFAULT_OPENCODE_URL;
}

function resolveChironMcpUrl(stepExecutionId: string): string {
  const base = process.env.CHIRON_MCP_URL?.trim() || DEFAULT_CHIRON_MCP_URL;
  const url = new URL(base);
  url.searchParams.set("stepExecutionId", stepExecutionId);
  return url.toString();
}

function getTimelineSlice(
  items: readonly AgentStepTimelineItem[],
  cursor?: AgentStepTimelineCursor,
): readonly AgentStepTimelineItem[] {
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
}

function createCursor(items: readonly AgentStepTimelineItem[]): HarnessTimelinePage["cursor"] {
  if (items.length === 0) {
    return {};
  }

  return {
    before: items[0]?.timelineItemId,
    after: items[items.length - 1]?.timelineItemId,
  };
}

function opencodeError(
  operation: OpenCodeExecutionError["operation"],
  message: string,
  cause?: unknown,
): OpenCodeExecutionError {
  return new OpenCodeExecutionError({
    operation,
    message,
    ...(cause === undefined ? {} : { cause }),
  });
}

function harnessError(
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

function discoveryError(message: string, cause?: unknown): HarnessDiscoveryError {
  return new HarnessDiscoveryError({
    harness: "opencode",
    message:
      cause instanceof Error && !message.includes(cause.message)
        ? `${message}: ${cause.message}`
        : message,
  });
}

function toPromptModel(model: HarnessSession["model"] | undefined): PromptModel | undefined {
  return model
    ? {
        providerID: model.provider,
        modelID: model.model,
      }
    : undefined;
}

function buildPromptInput(input: {
  readonly sessionId: string;
  readonly text: string;
  readonly agent?: string;
  readonly model?: PromptModel;
  readonly noReply?: boolean;
}): PromptInput {
  return {
    sessionId: input.sessionId,
    text: input.text,
    ...(input.agent ? { agent: input.agent } : {}),
    ...(input.model ? { model: input.model } : {}),
    ...(input.noReply ? { noReply: true } : {}),
  };
}

async function waitForClientShutdown(
  client: OpencodeClientPort,
  options: { readonly timeoutMs?: number; readonly pollIntervalMs?: number } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 2_000;
  const pollIntervalMs = options.pollIntervalMs ?? 50;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await client.healthCheck();
      await new Promise<void>((resolve) => {
        setTimeout(resolve, pollIntervalMs);
      });
    } catch {
      return;
    }
  }
}

function buildBootstrapContent(config: HarnessSessionConfig): string {
  return [config.objective, config.instructionsMarkdown].join("\n\n");
}

function normalizeModels(
  providerId: string,
  providerLabel: string,
  modelsValue: unknown,
  defaultModelId: string | undefined,
): readonly HarnessDiscoveredModel[] {
  const entries = asRecord(modelsValue);
  if (!entries) {
    return [];
  }

  return Object.entries(entries)
    .map(([modelId, modelValue]) => {
      const model = asRecord(modelValue) ?? {};
      const capabilities = asRecord(model.capabilities) ?? {};

      return {
        provider: providerId,
        model: readString(model.id, modelId),
        label: readString(model.name, readString(model.id, modelId) || providerLabel),
        isDefault: defaultModelId === modelId || defaultModelId === model.id,
        supportsReasoning: capabilities.reasoning === true,
        supportsTools: capabilities.toolcall === true || capabilities.tool_call === true,
        supportsAttachments: capabilities.attachment === true,
      } satisfies HarnessDiscoveredModel;
    })
    .sort(
      (left, right) =>
        Number(right.isDefault) - Number(left.isDefault) || left.label.localeCompare(right.label),
    );
}

function normalizeProviders(
  providersValue: unknown,
  defaultsValue: unknown,
): {
  readonly providers: readonly HarnessDiscoveredProvider[];
  readonly models: readonly HarnessDiscoveredModel[];
} {
  const providers = Array.isArray(providersValue) ? providersValue : [];
  const defaults = asRecord(defaultsValue) ?? {};

  const normalizedProviders: HarnessDiscoveredProvider[] = [];

  for (const providerValue of providers) {
    const provider = asRecord(providerValue) ?? {};
    const providerId = readString(provider.id);
    if (!providerId) {
      continue;
    }

    const defaultModel = readString(defaults[providerId], undefined);
    const models = normalizeModels(
      providerId,
      readString(provider.name, providerId),
      provider.models,
      defaultModel,
    );

    normalizedProviders.push({
      provider: providerId,
      label: readString(provider.name, providerId),
      ...(defaultModel ? { defaultModel } : {}),
      models,
    });
  }

  normalizedProviders.sort((left, right) => left.label.localeCompare(right.label));

  return {
    providers: normalizedProviders,
    models: normalizedProviders.flatMap((provider) => provider.models),
  };
}

function normalizeAgents(agentsValue: unknown): readonly HarnessDiscoveredAgent[] {
  const agents = Array.isArray(agentsValue) ? agentsValue : [];

  const normalizedAgents: HarnessDiscoveredAgent[] = [];

  for (const agentValue of agents) {
    const agent = asRecord(agentValue) ?? {};
    const key =
      readOptionalString(agent.key) ??
      readOptionalString(agent.id) ??
      readOptionalString(agent.slug) ??
      readOptionalString(agent.name);
    if (!key) {
      continue;
    }

    const defaultModel = asRecord(agent.model);
    normalizedAgents.push({
      key,
      label: readString(agent.label, readString(agent.name, key)),
      ...(typeof agent.description === "string" ? { description: agent.description } : {}),
      mode:
        agent.mode === "primary" || agent.mode === "all" || agent.mode === "subagent"
          ? agent.mode
          : "subagent",
      ...(defaultModel && readString(defaultModel.providerID) && readString(defaultModel.modelID)
        ? {
            defaultModel: {
              provider: readString(defaultModel.providerID),
              model: readString(defaultModel.modelID),
            },
          }
        : {}),
    });
  }

  normalizedAgents.sort((left, right) => left.label.localeCompare(right.label));
  return normalizedAgents;
}

function normalizeAgentToken(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
}

function resolveDiscoveredAgentKey(
  selectedAgent: string | undefined,
  discoveredAgents: readonly HarnessDiscoveredAgent[],
): string | undefined {
  if (!selectedAgent) {
    return undefined;
  }

  const exact = discoveredAgents.find((agent) => agent.key === selectedAgent);
  if (exact) {
    return exact.key;
  }

  const normalizedSelection = normalizeAgentToken(selectedAgent);
  const normalizedMatch = discoveredAgents.find(
    (agent) =>
      normalizeAgentToken(agent.key) === normalizedSelection ||
      normalizeAgentToken(agent.label) === normalizedSelection,
  );

  return normalizedMatch?.key ?? discoveredAgents[0]?.key ?? selectedAgent;
}

function createBootstrapTimelineItem(params: {
  sessionId: string;
  createdAt: string;
  content: string;
}): AgentStepTimelineItem {
  return {
    itemType: "message",
    timelineItemId: `bootstrap:${params.sessionId}`,
    createdAt: params.createdAt,
    role: "user",
    content: params.content,
  };
}

function hasBootstrapTimelineItem(record: SessionRecord): boolean {
  return record.timeline.some((item) => item.timelineItemId === record.bootstrapTimelineItemId);
}

function hasOnlySyntheticBootstrapMessage(record: SessionRecord): boolean {
  return (
    hasBootstrapTimelineItem(record) &&
    record.timeline.every((item) => item.timelineItemId === record.bootstrapTimelineItemId)
  );
}

function replaceBootstrapTimelineItem(record: SessionRecord, item: AgentStepTimelineItem): void {
  const bootstrapIndex = record.timeline.findIndex(
    (entry) => entry.timelineItemId === record.bootstrapTimelineItemId,
  );
  if (bootstrapIndex < 0) {
    return;
  }

  record.timeline[bootstrapIndex] = item;
  record.timelineIds.delete(record.bootstrapTimelineItemId);
  record.timelineIds.add(item.timelineItemId);

  const bootstrapEvent = record.eventLog.find((event) => event.eventType === "bootstrap");
  if (bootstrapEvent && "timelineItems" in bootstrapEvent.data) {
    bootstrapEvent.data.timelineItems = [item];
  }
}

function modelExists(
  discoveredModels: readonly HarnessDiscoveredModel[],
  model: HarnessSession["model"] | undefined,
): boolean {
  if (!model) {
    return false;
  }

  return discoveredModels.some(
    (entry) => entry.provider === model.provider && entry.model === model.model,
  );
}

function resolveDiscoveredModel(
  selectedModel: HarnessSession["model"] | undefined,
  selectedAgent: string | undefined,
  discoveredAgents: readonly HarnessDiscoveredAgent[],
  discoveredModels: readonly HarnessDiscoveredModel[],
): HarnessSession["model"] | undefined {
  if (selectedModel && discoveredModels.length === 0) {
    return selectedModel;
  }

  if (modelExists(discoveredModels, selectedModel)) {
    return selectedModel;
  }

  const agentDefaultModel = selectedAgent
    ? discoveredAgents.find((entry) => entry.key === selectedAgent)?.defaultModel
    : undefined;
  if (modelExists(discoveredModels, agentDefaultModel)) {
    return agentDefaultModel;
  }

  const selectedProvider = selectedModel?.provider;
  if (selectedProvider) {
    const selectedProviderDefault = discoveredModels.find(
      (entry) => entry.provider === selectedProvider && entry.isDefault,
    );
    if (selectedProviderDefault) {
      return {
        provider: selectedProviderDefault.provider,
        model: selectedProviderDefault.model,
      };
    }

    const selectedProviderAny = discoveredModels.find(
      (entry) => entry.provider === selectedProvider,
    );
    if (selectedProviderAny) {
      return {
        provider: selectedProviderAny.provider,
        model: selectedProviderAny.model,
      };
    }
  }

  const providerDefault = discoveredModels.find((entry) => entry.isDefault);
  if (providerDefault) {
    return { provider: providerDefault.provider, model: providerDefault.model };
  }

  const firstModel = discoveredModels.at(0);
  return firstModel ? { provider: firstModel.provider, model: firstModel.model } : undefined;
}

function createPortFromClient(
  client: Pick<OpencodeClient, "app" | "config" | "session" | "event">,
): OpencodeClientPort {
  return {
    discoverAgents: () => client.app.agents(),
    discoverProviders: () => client.config.providers(),
    createSession: ({ title }) => client.session.create({ body: { title } }),
    prompt: ({ sessionId, text, agent, model, noReply }) =>
      client.session.prompt({
        path: { id: sessionId },
        body: {
          ...(agent ? { agent } : {}),
          ...(model ? { model } : {}),
          ...(noReply ? { noReply: true } : {}),
          parts: [{ type: "text", text }],
        },
      }),
    listMessages: async (sessionId) => {
      const response = unwrapResponse(await client.session.messages({ path: { id: sessionId } }));
      return Array.isArray(response)
        ? response.map((entry) => {
            const record = asRecord(entry) ?? {};
            return {
              info: record.info,
              parts: Array.isArray(record.parts) ? record.parts : [],
            } satisfies OpencodeMessageRecord;
          })
        : [];
    },
    subscribeEvents: ({ signal } = {}) => client.event.subscribe(signal ? { signal } : undefined),
    healthCheck: async () => {
      await client.app.agents();
    },
  };
}

export function makeOpencodeClientFactoryService(
  clientFactory: (
    config?: OpencodeClientConfig & { readonly directory?: string },
  ) => OpencodeClient = createOpencodeClient,
) {
  return OpencodeClientFactoryService.of({
    createClient: (config) =>
      Effect.try({
        try: () => createPortFromClient(clientFactory(config)),
        catch: (error) =>
          opencodeError(
            "start_session",
            error instanceof Error ? error.message : "Failed to create OpenCode client.",
            error,
          ),
      }),
  });
}

export function makeOpencodeServerManagerService(
  factory: OpencodeFactory = createOpencode,
  clientFactoryService: OpencodeClientFactoryServiceShape = makeOpencodeClientFactoryService(),
) {
  const managedServers = new Map<string, OpencodeManagedServer>();

  const stopServer = (server: OpencodeManagedServer) =>
    Effect.tryPromise({
      try: async () => {
        managedServers.delete(server.stepExecutionId ?? server.serverInstanceId);
        await server.close();
        if (server.owned) {
          await waitForClientShutdown(server.client);
        }
      },
      catch: () => undefined,
    }).pipe(Effect.orDie);

  const spawnServer = <E>(input: {
    readonly stepExecutionId?: string;
    readonly directory?: string;
    readonly onError: (message: string, cause?: unknown) => E;
  }) =>
    Effect.tryPromise({
      try: async () => {
        const runtime = await factory({
          port: 0,
          ...(input.stepExecutionId
            ? {
                config: {
                  share: "disabled",
                  mcp: {
                    chiron: {
                      type: "remote",
                      url: resolveChironMcpUrl(input.stepExecutionId),
                      enabled: true,
                    },
                  },
                },
              }
            : {}),
        });

        const runtimeRecord = asRecord(runtime);
        const serverRecord = asRecord(runtimeRecord?.server);
        const baseUrl = readString(serverRecord?.url);
        const fallbackClient = createPortFromClient(runtime.client);
        const managed: OpencodeManagedServer = {
          serverInstanceId: createId("opencode-server"),
          ...(input.stepExecutionId ? { stepExecutionId: input.stepExecutionId } : {}),
          baseUrl,
          owned: true,
          client:
            baseUrl.length > 0 && input.directory
              ? await Effect.runPromise(
                  clientFactoryService.createClient({
                    baseUrl,
                    directory: input.directory,
                  }),
                )
              : baseUrl.length > 0 && input.stepExecutionId
                ? (() => {
                    throw input.onError(
                      "OpenCode working directory is required to start a managed server.",
                    );
                  })()
                : fallbackClient,
          close: () => {
            runtime.server.close();
          },
        };

        if (input.stepExecutionId) {
          managedServers.set(input.stepExecutionId, managed);
        }

        return managed;
      },
      catch: (error) => input.onError("Failed to start OpenCode server", error),
    });

  const connectExistingServer = (
    baseUrl: string,
    options?: {
      readonly directory?: string;
      readonly stepExecutionId?: string;
    },
  ) =>
    clientFactoryService
      .createClient({
        baseUrl,
        ...(options?.directory ? { directory: options.directory } : {}),
      })
      .pipe(
        Effect.flatMap((client) =>
          Effect.tryPromise({
            try: () => client.healthCheck(),
            catch: (error) =>
              discoveryError(
                error instanceof Error
                  ? error.message
                  : "Unable to connect to existing OpenCode server.",
                error,
              ),
          }).pipe(
            Effect.as({
              serverInstanceId: createId("opencode-server"),
              ...(options?.stepExecutionId ? { stepExecutionId: options.stepExecutionId } : {}),
              baseUrl,
              owned: false,
              client,
              close: () => undefined,
            } satisfies OpencodeManagedServer),
          ),
        ),
        Effect.catchTag("OpenCodeExecutionError", (error) =>
          Effect.fail(discoveryError(error.message)),
        ),
      );

  return OpencodeServerManagerService.of({
    connectExistingServer,
    startDiscoveryServer: () => spawnServer({ onError: discoveryError }),
    startManagedServer: (stepExecutionId, directory, preferredBaseUrl) =>
      Effect.gen(function* () {
        if (directory.trim().length === 0) {
          return yield* opencodeError(
            "start_session",
            "OpenCode working directory is required to start a managed server.",
          );
        }

        const existing = managedServers.get(stepExecutionId);
        if (existing) {
          const healthy = yield* Effect.either(
            Effect.tryPromise({
              try: () => existing.client.healthCheck(),
              catch: (error) =>
                opencodeError(
                  "start_session",
                  "Managed OpenCode server health check failed.",
                  error,
                ),
            }),
          );

          if (healthy._tag === "Right") {
            return existing;
          }

          yield* stopServer(existing);
        }

        if (preferredBaseUrl?.trim()) {
          const attached = yield* Effect.either(
            connectExistingServer(preferredBaseUrl, { stepExecutionId, directory }).pipe(
              Effect.map((server) => {
                managedServers.set(stepExecutionId, server);
                return server;
              }),
            ),
          );

          if (attached._tag === "Right") {
            return attached.right;
          }
        }

        return yield* spawnServer({
          stepExecutionId,
          directory,
          onError: (message, cause) => opencodeError("start_session", message, cause),
        });
      }),
    stopServer,
  });
}

function discoverMetadataWithClient(client: OpencodeClientPort) {
  return Effect.gen(function* () {
    const [agentsResponse, providersResponse] = yield* Effect.all([
      Effect.tryPromise({
        try: () => client.discoverAgents(),
        catch: (error) =>
          discoveryError(error instanceof Error ? error.message : String(error), error),
      }),
      Effect.tryPromise({
        try: () => client.discoverProviders(),
        catch: (error) =>
          discoveryError(error instanceof Error ? error.message : String(error), error),
      }),
    ]);

    const providersPayload = asRecord(unwrapResponse(providersResponse)) ?? {};
    const normalizedProviders = normalizeProviders(
      providersPayload.providers,
      providersPayload.default,
    );

    return {
      harness: "opencode",
      discoveredAt: new Date().toISOString(),
      agents: normalizeAgents(unwrapResponse(agentsResponse)),
      providers: normalizedProviders.providers,
      models: normalizedProviders.models,
    } satisfies HarnessDiscoveryMetadata;
  });
}

function getMessageText(parts: readonly unknown[]): string {
  const chunks: string[] = [];

  for (const partValue of parts) {
    const part = asRecord(partValue) ?? {};
    const type = readString(part.type);
    if (type !== "text") {
      continue;
    }

    const text = readString(part.text);
    if (text) {
      chunks.push(text);
    }
  }

  return chunks.join("\n").trim();
}

function getThinkingParts(
  parts: readonly unknown[],
): readonly { content: string; createdAt?: string }[] {
  const chunks: { content: string; createdAt?: string }[] = [];

  for (const partValue of parts) {
    const part = asRecord(partValue) ?? {};
    const type = readString(part.type);
    if (type !== "thinking" && type !== "reasoning") {
      continue;
    }

    const content =
      readOptionalString(part.thinking) ??
      readOptionalString(part.text) ??
      readOptionalString(part.content);

    if (content) {
      const start = readNumber(asRecord(part.time)?.start);
      chunks.push({
        content,
        ...(start === undefined ? {} : { createdAt: normalizeTimestamp(start, "") }),
      });
    }
  }

  return chunks;
}

function getToolKind(toolName: string): "harness" | "mcp" {
  const normalized = toolName.startsWith("chiron_") ? toolName.slice("chiron_".length) : toolName;

  return normalized === "read_step_snapshot" ||
    normalized === "read_context_value" ||
    normalized === "write_context_value" ||
    normalized === "read_step_execution_snapshot" ||
    normalized === "read_context_fact_schema" ||
    normalized === "read_context_fact_instances" ||
    normalized === "read_attachable_targets" ||
    normalized === "create_context_fact_instance" ||
    normalized === "update_context_fact_instance" ||
    normalized === "remove_context_fact_instance" ||
    normalized === "delete_context_fact_instance"
    ? "mcp"
    : "harness";
}

function readToolText(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return inspect(value, { depth: 5, breakLength: 100, compact: false });
}

function addTimelineItem(record: SessionRecord, item: AgentStepTimelineItem): boolean {
  if (record.timelineIds.has(item.timelineItemId)) {
    return false;
  }

  record.timelineIds.add(item.timelineItemId);
  record.timeline.push(item);
  return true;
}

function emitToSubscribers(record: SessionRecord, event: AgentStepSseEnvelope) {
  return Effect.forEach(
    Array.from(record.subscribers),
    (subscriber) => Queue.offer(subscriber, event),
    {
      concurrency: "unbounded",
      discard: true,
    },
  );
}

function pushEvent(record: SessionRecord, event: AgentStepSseEnvelope) {
  record.eventLog.push(event);
  return emitToSubscribers(record, event);
}

function pushTimelineEvents(record: SessionRecord, items: readonly AgentStepTimelineItem[]) {
  return Effect.forEach(items, (item) =>
    pushEvent(
      record,
      item.itemType === "tool_activity"
        ? {
            version: "v1",
            stream: "agent_step_session_events",
            eventType: "tool_activity",
            stepExecutionId: record.session.stepExecutionId,
            data: { item },
          }
        : {
            version: "v1",
            stream: "agent_step_session_events",
            eventType: "timeline",
            stepExecutionId: record.session.stepExecutionId,
            data: { item },
          },
    ),
  );
}

function setSessionState(record: SessionRecord, state: HarnessSession["state"]) {
  if (record.session.state === state) {
    return Effect.void;
  }

  record.session = { ...record.session, state };
  return pushEvent(record, {
    version: "v1",
    stream: "agent_step_session_events",
    eventType: "session_state",
    stepExecutionId: record.session.stepExecutionId,
    data: { state },
  });
}

function emitDone(
  record: SessionRecord,
  finalState: "active_idle" | "disconnected_or_error" | "completed",
) {
  const last = record.eventLog.at(-1);
  if (
    last?.eventType === "done" &&
    last.stepExecutionId === record.session.stepExecutionId &&
    last.data.finalState === finalState
  ) {
    return Effect.void;
  }

  return pushEvent(record, {
    version: "v1",
    stream: "agent_step_session_events",
    eventType: "done",
    stepExecutionId: record.session.stepExecutionId,
    data: { finalState },
  });
}

function emitError(
  record: SessionRecord,
  operation: OpenCodeExecutionError["operation"],
  message: string,
  cause?: unknown,
) {
  const error = opencodeError(operation, message, cause);
  return pushEvent(record, {
    version: "v1",
    stream: "agent_step_session_events",
    eventType: "error",
    stepExecutionId: record.session.stepExecutionId,
    data: { error },
  });
}

function buildToolItems(
  messageId: string,
  parts: readonly unknown[],
  fallbackCreatedAt: string,
): {
  readonly started: readonly AgentStepTimelineItem[];
  readonly finished: readonly AgentStepTimelineItem[];
} {
  const started: AgentStepTimelineItem[] = [];
  const finished: AgentStepTimelineItem[] = [];

  for (const partValue of parts) {
    const part = asRecord(partValue) ?? {};
    if (readString(part.type) !== "tool") {
      continue;
    }

    const state = asRecord(part.state) ?? {};
    const toolName = readString(part.tool, "unknown_tool");
    const status = readString(state.status);
    const partId = readString(part.id, readString(part.callID, createId(`tool:${messageId}`)));
    const stateTime = asRecord(state.time) ?? {};
    const title = readString(state.title);
    const inputText = readToolText(state.input ?? part.input);
    const outputText = readToolText(state.output ?? part.output);
    const errorText = readToolText(state.error ?? part.error);

    const startedItem: AgentStepTimelineItem = {
      itemType: "tool_activity",
      timelineItemId: `tool:${partId}:started`,
      createdAt: normalizeTimestamp(stateTime.start, fallbackCreatedAt),
      toolKind: getToolKind(toolName),
      toolName,
      status: "started",
      ...(title ? { summary: title } : {}),
      ...(inputText ? { input: inputText } : {}),
    };

    const completedItem: AgentStepTimelineItem = {
      itemType: "tool_activity",
      timelineItemId: `tool:${partId}:${status === "error" ? "failed" : "completed"}`,
      createdAt: normalizeTimestamp(
        stateTime.end,
        normalizeTimestamp(stateTime.start, fallbackCreatedAt),
      ),
      toolKind: getToolKind(toolName),
      toolName,
      status: status === "error" ? "failed" : "completed",
      ...(title ? { summary: title } : {}),
      ...(outputText ? { output: outputText } : {}),
      ...(errorText ? { error: errorText } : {}),
    };

    if (status === "pending" || status === "running") {
      started.push(startedItem);
      continue;
    }

    if (status === "completed" || status === "error") {
      started.push(startedItem);
      finished.push(completedItem);
    }
  }

  return { started, finished };
}

function buildThinkingItems(
  messageId: string,
  parts: readonly unknown[],
  fallbackCreatedAt: string,
): readonly AgentStepTimelineItem[] {
  return getThinkingParts(parts).map((part, index) => ({
    itemType: "thinking",
    timelineItemId: `thinking:${messageId}:${index}`,
    createdAt: part.createdAt ?? fallbackCreatedAt,
    content: part.content,
  }));
}

function syncSessionMessages(record: SessionRecord, messages: readonly OpencodeMessageRecord[]) {
  const appended: AgentStepTimelineItem[] = [];

  for (const messageRecord of messages) {
    const info = asRecord(messageRecord.info) ?? {};
    const messageId = readString(info.id);
    if (!messageId) {
      continue;
    }

    const role = readString(info.role) === "assistant" ? "assistant" : "user";
    const createdAt = normalizeTimestamp(asRecord(info.time)?.created, record.session.startedAt);

    if (role === "user") {
      const content = getMessageText(messageRecord.parts);
      if (!content) {
        continue;
      }

      const item: AgentStepTimelineItem = {
        itemType: "message",
        timelineItemId: `message:${messageId}`,
        createdAt,
        role: "user",
        content,
      };

      if (hasOnlySyntheticBootstrapMessage(record)) {
        replaceBootstrapTimelineItem(record, item);
        continue;
      }

      if (content === record.bootstrapContent && hasBootstrapTimelineItem(record)) {
        continue;
      }

      if (addTimelineItem(record, item)) {
        appended.push(item);
      }
      continue;
    }

    const toolItems = buildToolItems(messageId, messageRecord.parts, createdAt);
    const thinkingItems = buildThinkingItems(messageId, messageRecord.parts, createdAt);
    for (const item of toolItems.started) {
      if (addTimelineItem(record, item)) {
        appended.push(item);
      }
    }

    for (const item of thinkingItems) {
      if (addTimelineItem(record, item)) {
        appended.push(item);
      }
    }

    const content = getMessageText(messageRecord.parts);
    if (content) {
      const item: AgentStepTimelineItem = {
        itemType: "message",
        timelineItemId: `message:${messageId}`,
        createdAt,
        role: "assistant",
        content,
      };

      if (addTimelineItem(record, item)) {
        appended.push(item);
      }
    }

    for (const item of toolItems.finished) {
      if (addTimelineItem(record, item)) {
        appended.push(item);
      }
    }
  }

  return appended;
}

function extractSessionId(rawEvent: unknown): string | undefined {
  const event = asRecord(rawEvent) ?? {};
  const payload = asRecord(event.payload) ?? event;
  const properties = asRecord(payload.properties) ?? {};

  return (
    readString(properties.sessionID, undefined) ||
    readString(asRecord(properties.info)?.sessionID, undefined) ||
    readString(asRecord(properties.part)?.sessionID, undefined) ||
    readString(asRecord(properties.error)?.sessionID, undefined)
  );
}

function extractEventType(rawEvent: unknown): string {
  const event = asRecord(rawEvent) ?? {};
  const payload = asRecord(event.payload) ?? event;
  return readString(payload.type);
}

function extractEventProperties(rawEvent: unknown): Record<string, unknown> {
  const event = asRecord(rawEvent) ?? {};
  const payload = asRecord(event.payload) ?? event;
  return asRecord(payload.properties) ?? {};
}

async function* asAsyncIterable(value: unknown): AsyncIterable<unknown> {
  const record = asRecord(value);
  const streamCandidate = record?.stream;
  const stream =
    streamCandidate &&
    typeof streamCandidate === "object" &&
    Symbol.asyncIterator in streamCandidate
      ? streamCandidate
      : value;
  if (!stream || typeof (stream as AsyncIterable<unknown>)[Symbol.asyncIterator] !== "function") {
    return;
  }

  for await (const item of stream as AsyncIterable<unknown>) {
    yield item;
  }
}

export function makeOpencodeHarnessService(
  factory: OpencodeFactory = createOpencode,
  clientFactory: (
    config?: OpencodeClientConfig & { readonly directory?: string },
  ) => OpencodeClient = createOpencodeClient,
) {
  const clientFactoryService = makeOpencodeClientFactoryService(clientFactory);
  const serverManager = makeOpencodeServerManagerService(factory, clientFactoryService);
  const sessionsById = new Map<string, SessionRecord>();
  const sessionIdByStepExecutionId = new Map<string, string>();

  const requireSession = (sessionId: string, operation: HarnessExecutionError["operation"]) =>
    Effect.fromNullable(sessionsById.get(sessionId)).pipe(
      Effect.orElseFail(() =>
        harnessError(operation, `Harness session '${sessionId}' was not found.`),
      ),
    );

  const loadMessages = (record: SessionRecord, operation: OpenCodeExecutionError["operation"]) =>
    Effect.tryPromise({
      try: () => record.client.listMessages(record.session.sessionId),
      catch: (error) =>
        opencodeError(operation, "Failed to load OpenCode session messages.", error),
    });

  const synchronizeTimeline = (
    record: SessionRecord,
    operation: OpenCodeExecutionError["operation"],
  ) =>
    loadMessages(record, operation).pipe(
      Effect.map((messages) => syncSessionMessages(record, messages)),
    );

  const resolvePromptSelections = (
    client: OpencodeClientPort,
    input: {
      readonly agent: string | undefined;
      readonly model: HarnessSession["model"] | undefined;
    },
    operation: OpenCodeExecutionError["operation"],
  ) =>
    Effect.all([
      Effect.tryPromise({
        try: () => client.discoverAgents(),
        catch: (error) =>
          opencodeError(operation, "Failed to discover available OpenCode agents.", error),
      }),
      Effect.tryPromise({
        try: () => client.discoverProviders(),
        catch: (error) =>
          opencodeError(
            operation,
            "Failed to discover available OpenCode providers and models.",
            error,
          ),
      }),
    ]).pipe(
      Effect.map(([agentsResponse, providersResponse]) => {
        const discoveredAgents = normalizeAgents(unwrapResponse(agentsResponse));
        const providersPayload = asRecord(unwrapResponse(providersResponse)) ?? {};
        const discoveredModels = normalizeProviders(
          providersPayload.providers,
          providersPayload.default,
        ).models;

        const resolvedAgent = resolveDiscoveredAgentKey(input.agent, discoveredAgents);
        const resolvedModel = resolveDiscoveredModel(
          input.model,
          resolvedAgent,
          discoveredAgents,
          discoveredModels,
        );

        return {
          agent: resolvedAgent,
          model: resolvedModel,
        } as const;
      }),
      Effect.catchTag("OpenCodeExecutionError", () =>
        Effect.succeed({
          agent: input.agent,
          model: input.model,
        } as const),
      ),
    );

  const createRecord = (
    config: HarnessSessionConfig,
    server: OpencodeManagedServer,
    rawSession: unknown,
    resolvedAgent: string | undefined,
    resolvedModel: HarnessSession["model"] | undefined,
  ): SessionRecord => {
    const sessionRecord = asRecord(rawSession) ?? {};
    const session: HarnessSession = {
      sessionId: readString(sessionRecord.id, createId("session")),
      stepExecutionId: config.stepExecutionId,
      startedAt: normalizeTimestamp(
        asRecord(sessionRecord.time)?.created,
        new Date().toISOString(),
      ),
      state: "active_idle",
      ...(resolvedAgent ? { agent: resolvedAgent } : {}),
      ...(resolvedModel ? { model: resolvedModel } : {}),
    };

    const bootstrapContent = buildBootstrapContent(config);
    const bootstrapTimelineItem = createBootstrapTimelineItem({
      sessionId: session.sessionId,
      createdAt: session.startedAt,
      content: bootstrapContent,
    });

    return {
      session,
      client: server.client,
      server,
      bootstrapContent,
      bootstrapTimelineItemId: bootstrapTimelineItem.timelineItemId,
      timeline: [bootstrapTimelineItem],
      timelineIds: new Set([bootstrapTimelineItem.timelineItemId]),
      eventLog: [
        {
          version: "v1",
          stream: "agent_step_session_events",
          eventType: "bootstrap",
          stepExecutionId: config.stepExecutionId,
          data: {
            state: session.state,
            streamContract: SESSION_STREAM_CONTRACT,
            timelineItems: [bootstrapTimelineItem],
          },
        },
      ],
      subscribers: new Set(),
      eventPumpActive: false,
    };
  };

  const ensureSessionEventPump = (record: SessionRecord) =>
    Effect.gen(function* () {
      if (record.eventPumpActive) {
        return;
      }

      record.eventPumpActive = true;
      const controller = new AbortController();
      record.eventPumpAbortController = controller;

      const runtime = yield* Effect.runtime<never>();
      const runPromise = Runtime.runPromise(runtime);

      yield* Effect.forkDaemon(
        Effect.gen(function* () {
          const source = yield* Effect.tryPromise({
            try: () => record.client.subscribeEvents({ signal: controller.signal }),
            catch: (error) =>
              opencodeError("stream_events", "Failed to subscribe to OpenCode events.", error),
          });

          yield* Effect.tryPromise({
            try: async () => {
              for await (const rawEvent of asAsyncIterable(source)) {
                if (extractSessionId(rawEvent) !== record.session.sessionId) {
                  continue;
                }

                const rawType = extractEventType(rawEvent);
                if (!rawType) {
                  continue;
                }

                if (
                  rawType === "message.updated" ||
                  rawType === "message.part.updated" ||
                  rawType === "message.part.removed" ||
                  rawType === "message.removed" ||
                  rawType === "command.executed"
                ) {
                  const appended = await runPromise(
                    synchronizeTimeline(record, "stream_events").pipe(
                      Effect.orElseSucceed(() => []),
                    ),
                  );
                  await runPromise(pushTimelineEvents(record, appended));
                  continue;
                }

                if (rawType === "session.status") {
                  const status = readString(
                    extractEventProperties(rawEvent).status &&
                      asRecord(extractEventProperties(rawEvent).status)?.type,
                  );
                  if (status === "busy") {
                    await runPromise(setSessionState(record, "active_streaming"));
                  } else if (status === "idle") {
                    await runPromise(setSessionState(record, "active_idle"));
                  }
                  continue;
                }

                if (rawType === "session.idle") {
                  const appended = await runPromise(
                    synchronizeTimeline(record, "stream_events").pipe(
                      Effect.orElseSucceed(() => []),
                    ),
                  );
                  await runPromise(pushTimelineEvents(record, appended));
                  await runPromise(setSessionState(record, "active_idle"));
                  await runPromise(emitDone(record, "active_idle"));
                  continue;
                }

                if (rawType === "session.error") {
                  const properties = extractEventProperties(rawEvent);
                  const errorRecord = asRecord(properties.error) ?? {};
                  const message = readString(
                    asRecord(errorRecord.data)?.message,
                    readString(errorRecord.name, "OpenCode session reported an error."),
                  );
                  await runPromise(setSessionState(record, "disconnected_or_error"));
                  await runPromise(emitError(record, "stream_events", message, errorRecord));
                  await runPromise(emitDone(record, "disconnected_or_error"));
                }
              }
            },
            catch: (error) =>
              opencodeError("stream_events", "Failed while consuming OpenCode events.", error),
          });
        }).pipe(
          Effect.catchAll((error) =>
            setSessionState(record, "disconnected_or_error").pipe(
              Effect.zipRight(emitError(record, "stream_events", error.message, error)),
              Effect.zipRight(emitDone(record, "disconnected_or_error")),
            ),
          ),
          Effect.ensuring(
            Effect.sync(() => {
              record.eventPumpActive = false;
              if (record.eventPumpAbortController === controller) {
                delete record.eventPumpAbortController;
              }
            }),
          ),
        ),
      );
    });

  const cleanupFailedStart = (record: SessionRecord | undefined) =>
    Effect.gen(function* () {
      if (!record) {
        return;
      }

      record.eventPumpAbortController?.abort();
      sessionsById.delete(record.session.sessionId);
      sessionIdByStepExecutionId.delete(record.session.stepExecutionId);
      yield* serverManager.stopServer(record.server);
    });

  return HarnessService.of({
    discoverMetadata: () =>
      Effect.catchAll(
        serverManager
          .connectExistingServer(resolveOpencodeBaseUrl())
          .pipe(Effect.flatMap((existing) => discoverMetadataWithClient(existing.client))),
        () =>
          Effect.acquireUseRelease(
            serverManager.startDiscoveryServer(),
            (server) => discoverMetadataWithClient(server.client),
            (server) => serverManager.stopServer(server),
          ),
      ),
    startSession: (config) =>
      Effect.gen(function* () {
        const existingSessionId = sessionIdByStepExecutionId.get(config.stepExecutionId);
        if (existingSessionId) {
          const existing = yield* requireSession(existingSessionId, "start_session").pipe(
            Effect.catchTag("HarnessExecutionError", (error) =>
              Effect.fail(opencodeError("start_session", error.message, error)),
            ),
          );

          if (existing.session.state === "disconnected_or_error") {
            sessionsById.delete(existing.session.sessionId);
            sessionIdByStepExecutionId.delete(existing.session.stepExecutionId);
            yield* serverManager.stopServer(existing.server);
          } else {
            return {
              session: existing.session,
              serverInstanceId: existing.server.serverInstanceId,
              serverBaseUrl: existing.server.baseUrl,
              timeline: [...existing.timeline],
              cursor: createCursor(existing.timeline),
            } satisfies HarnessSessionStarted;
          }
        }

        let record: SessionRecord | undefined;

        return yield* Effect.gen(function* () {
          const server = yield* serverManager.startManagedServer(
            config.stepExecutionId,
            config.projectRootPath,
          );
          const promptSelections = yield* resolvePromptSelections(
            server.client,
            {
              agent: config.agent,
              model: config.model,
            },
            "start_session",
          );
          const promptModel = toPromptModel(promptSelections.model);
          const resumedRecord = yield* Effect.gen(function* () {
            if (!config.resumeSessionId) {
              return undefined;
            }
            const resumeSessionId = config.resumeSessionId;

            const resumeAttempt = yield* Effect.either(
              Effect.tryPromise({
                try: () => server.client.listMessages(resumeSessionId),
                catch: (error) =>
                  opencodeError(
                    "start_session",
                    "Failed to resume OpenCode session from existing session id.",
                    error,
                  ),
              }),
            );

            if (resumeAttempt._tag === "Left") {
              return undefined;
            }
            const resumeMessages = resumeAttempt.right;

            const resumed = createRecord(
              config,
              server,
              {
                id: resumeSessionId,
                time: { created: new Date().toISOString() },
              },
              promptSelections.agent,
              promptSelections.model,
            );

            const appended = syncSessionMessages(resumed, resumeMessages);
            resumed.session = {
              ...resumed.session,
              state: "active_idle",
            };
            if (appended.length > 0) {
              yield* pushTimelineEvents(resumed, appended);
            }

            return resumed;
          });

          const createdRecord =
            resumedRecord ??
            createRecord(
              config,
              server,
              yield* Effect.tryPromise({
                try: () =>
                  server.client.createSession({ title: `Agent step ${config.stepExecutionId}` }),
                catch: (error) =>
                  opencodeError("start_session", "Failed to create OpenCode session.", error),
              }).pipe(Effect.map(unwrapResponse)),
              promptSelections.agent,
              promptSelections.model,
            );
          record = createdRecord;

          sessionsById.set(createdRecord.session.sessionId, createdRecord);
          sessionIdByStepExecutionId.set(
            createdRecord.session.stepExecutionId,
            createdRecord.session.sessionId,
          );

          yield* ensureSessionEventPump(createdRecord);

          if (!resumedRecord) {
            const shouldSuppressBootstrapReply = config.noReply ?? true;
            const runBootstrapPrompt = Effect.gen(function* () {
              if (!shouldSuppressBootstrapReply) {
                yield* setSessionState(createdRecord, "active_streaming");
              }

              yield* Effect.tryPromise({
                try: () =>
                  createdRecord.client.prompt(
                    buildPromptInput({
                      sessionId: createdRecord.session.sessionId,
                      text: createdRecord.bootstrapContent,
                      ...(promptSelections.agent ? { agent: promptSelections.agent } : {}),
                      ...(promptModel ? { model: promptModel } : {}),
                      noReply: shouldSuppressBootstrapReply,
                    }),
                  ),
                catch: (error) =>
                  opencodeError(
                    "start_session",
                    "Failed to bootstrap OpenCode session context.",
                    error,
                  ),
              });

              const bootstrapTimelineItems = yield* synchronizeTimeline(
                createdRecord,
                "start_session",
              );
              yield* pushTimelineEvents(createdRecord, bootstrapTimelineItems);

              if (!shouldSuppressBootstrapReply) {
                yield* setSessionState(createdRecord, "active_idle");
                yield* emitDone(createdRecord, "active_idle");
              }
            }).pipe(
              Effect.catchAll((error: OpenCodeExecutionError) =>
                setSessionState(createdRecord, "disconnected_or_error").pipe(
                  Effect.zipRight(emitError(createdRecord, "start_session", error.message, error)),
                  Effect.zipRight(emitDone(createdRecord, "disconnected_or_error")),
                  Effect.zipRight(Effect.fail(error)),
                ),
              ),
            );

            if (shouldSuppressBootstrapReply) {
              yield* runBootstrapPrompt;
            } else {
              const returnSession = { ...createdRecord.session };
              const returnTimeline = [...createdRecord.timeline];
              const returnCursor = createCursor(returnTimeline);
              yield* Effect.forkDaemon(runBootstrapPrompt.pipe(Effect.orDie));

              return {
                session: returnSession,
                serverInstanceId: createdRecord.server.serverInstanceId,
                serverBaseUrl: createdRecord.server.baseUrl,
                timeline: returnTimeline,
                cursor: returnCursor,
              } satisfies HarnessSessionStarted;
            }
          }

          return {
            session: createdRecord.session,
            serverInstanceId: createdRecord.server.serverInstanceId,
            serverBaseUrl: createdRecord.server.baseUrl,
            timeline: [...createdRecord.timeline],
            cursor: createCursor(createdRecord.timeline),
          } satisfies HarnessSessionStarted;
        }).pipe(Effect.tapError(() => cleanupFailedStart(record)));
      }),
    reconnectSession: (config) =>
      Effect.gen(function* () {
        const mappedSessionId = sessionIdByStepExecutionId.get(config.stepExecutionId);
        if (mappedSessionId === config.resumeSessionId) {
          const existing = yield* Effect.option(
            requireSession(mappedSessionId, "start_session"),
          ).pipe(Effect.map(Option.getOrUndefined));

          if (existing) {
            return {
              session: existing.session,
              serverInstanceId: existing.server.serverInstanceId,
              serverBaseUrl: existing.server.baseUrl,
              timeline: [...existing.timeline],
              cursor: createCursor(existing.timeline),
            } satisfies HarnessSessionStarted;
          }
        }

        let record: SessionRecord | undefined;

        return yield* Effect.gen(function* () {
          const server = yield* serverManager.startManagedServer(
            config.stepExecutionId,
            config.projectRootPath,
            config.serverBaseUrl,
          );

          const promptSelections = yield* resolvePromptSelections(
            server.client,
            {
              agent: config.agent,
              model: config.model,
            },
            "start_session",
          );

          const resumeMessages = yield* Effect.tryPromise({
            try: () => server.client.listMessages(config.resumeSessionId),
            catch: (error) =>
              opencodeError(
                "start_session",
                `Harness session '${config.resumeSessionId}' was not found.`,
                error,
              ),
          });

          const resumed = createRecord(
            {
              ...config,
              resumeSessionId: config.resumeSessionId,
              noReply: true,
            },
            server,
            {
              id: config.resumeSessionId,
              time: { created: new Date().toISOString() },
            },
            promptSelections.agent,
            promptSelections.model,
          );
          record = resumed;

          const appended = syncSessionMessages(resumed, resumeMessages);
          resumed.session = {
            ...resumed.session,
            state: "active_idle",
          };
          if (appended.length > 0) {
            yield* pushTimelineEvents(resumed, appended);
          }

          sessionsById.set(resumed.session.sessionId, resumed);
          sessionIdByStepExecutionId.set(
            resumed.session.stepExecutionId,
            resumed.session.sessionId,
          );

          return {
            session: resumed.session,
            serverInstanceId: resumed.server.serverInstanceId,
            serverBaseUrl: resumed.server.baseUrl,
            timeline: [...resumed.timeline],
            cursor: createCursor(resumed.timeline),
          } satisfies HarnessSessionStarted;
        }).pipe(Effect.tapError(() => cleanupFailedStart(record)));
      }),
    sendMessage: (sessionId, message) =>
      Effect.gen(function* () {
        if (message.trim().length === 0) {
          return yield* opencodeError("send_message", "Harness message must be non-empty.");
        }

        const record = yield* requireSession(sessionId, "send_message").pipe(
          Effect.catchTag("HarnessExecutionError", (error) =>
            Effect.fail(opencodeError("send_message", error.message, error)),
          ),
        );

        if (record.session.state === "completed") {
          return yield* opencodeError(
            "send_message",
            `Harness session '${sessionId}' is already completed.`,
          );
        }

        if (record.session.state === "disconnected_or_error") {
          return yield* opencodeError(
            "send_message",
            `Harness session '${sessionId}' is disconnected and cannot receive messages.`,
          );
        }

        if (record.session.state !== "active_idle") {
          return yield* opencodeError(
            "send_message",
            `Harness session '${sessionId}' is currently ${record.session.state}; wait until it is active_idle before sending a new message.`,
          );
        }

        return yield* Effect.gen(function* () {
          yield* setSessionState(record, "active_streaming");
          const promptSelections = yield* resolvePromptSelections(
            record.client,
            {
              agent: record.session.agent,
              model: record.session.model,
            },
            "send_message",
          );

          if (
            promptSelections.agent !== record.session.agent ||
            promptSelections.model?.provider !== record.session.model?.provider ||
            promptSelections.model?.model !== record.session.model?.model
          ) {
            record.session = {
              ...record.session,
              ...(promptSelections.agent ? { agent: promptSelections.agent } : {}),
              ...(promptSelections.model ? { model: promptSelections.model } : {}),
            };
          }

          yield* Effect.tryPromise({
            try: () =>
              record.client.prompt(
                buildPromptInput({
                  sessionId,
                  text: message,
                  ...(promptSelections.agent ? { agent: promptSelections.agent } : {}),
                  ...(promptSelections.model
                    ? {
                        model: {
                          providerID: promptSelections.model.provider,
                          modelID: promptSelections.model.model,
                        },
                      }
                    : {}),
                }),
              ),
            catch: (error) =>
              opencodeError("send_message", "Failed to send OpenCode message.", error),
          });

          const appended = yield* synchronizeTimeline(record, "send_message");
          yield* pushTimelineEvents(record, appended);
          yield* setSessionState(record, "active_idle");
          yield* emitDone(record, "active_idle");

          return {
            sessionId,
            stepExecutionId: record.session.stepExecutionId,
            accepted: true,
            state: "active_idle",
          } satisfies HarnessMessageAccepted;
        }).pipe(
          Effect.catchAll((error: OpenCodeExecutionError) =>
            setSessionState(record, "disconnected_or_error").pipe(
              Effect.zipRight(emitError(record, "send_message", error.message, error)),
              Effect.zipRight(emitDone(record, "disconnected_or_error")),
              Effect.zipRight(Effect.fail(error)),
            ),
          ),
        );
      }),
    getTimelinePage: (sessionId, cursor) =>
      Effect.gen(function* () {
        const record = yield* requireSession(sessionId, "stream_events").pipe(
          Effect.catchTag("HarnessExecutionError", (error) =>
            Effect.fail(opencodeError("stream_events", error.message, error)),
          ),
        );

        const items = [...getTimelineSlice(record.timeline, cursor)];
        return {
          sessionId,
          stepExecutionId: record.session.stepExecutionId,
          cursor: createCursor(items),
          items,
        } satisfies HarnessTimelinePage;
      }),
    streamSessionEvents: (sessionId) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const record = yield* requireSession(sessionId, "stream_events").pipe(
            Effect.catchTag("HarnessExecutionError", (error) =>
              Effect.fail(opencodeError("stream_events", error.message, error)),
            ),
          );

          yield* ensureSessionEventPump(record);

          const subscriber = yield* Queue.unbounded<AgentStepSseEnvelope>();
          yield* Queue.offerAll(subscriber, record.eventLog);
          record.subscribers.add(subscriber);

          return Stream.fromQueue(subscriber).pipe(
            Stream.ensuring(
              Effect.sync(() => {
                record.subscribers.delete(subscriber);
              }),
            ),
          );
        }),
      ),
  });
}

export const OpencodeHarnessServiceLive = Layer.succeed(
  HarnessService,
  makeOpencodeHarnessService(),
);
