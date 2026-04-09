import {
  createOpencode,
  createOpencodeClient,
  type OpencodeClient,
  type OpencodeClientConfig,
} from "@opencode-ai/sdk";
import { Effect, Layer } from "effect";

import {
  HarnessDiscoveryError,
  HarnessService,
  type HarnessDiscoveredAgent,
  type HarnessDiscoveredModel,
  type HarnessDiscoveredProvider,
  type HarnessDiscoveryMetadata,
} from "./harness-service";

type OpencodeFactoryResult = Awaited<ReturnType<typeof createOpencode>>;
type OpencodeFactory = (options?: { port?: number }) => Promise<OpencodeFactoryResult>;
type OpencodeClientFactory = (
  config?: OpencodeClientConfig & {
    directory?: string;
  },
) => OpencodeClient;

const DEFAULT_OPENCODE_URL = "http://127.0.0.1:4096";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function unwrapResponse<T>(value: T | { data: T }): T {
  const record = asRecord(value);
  return record && "data" in record ? (record.data as T) : (value as T);
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
        supportsTools: capabilities.toolcall === true,
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
    const key = readString(agent.name);
    if (!key) {
      continue;
    }

    const defaultModel = asRecord(agent.model);
    normalizedAgents.push({
      key,
      label: key,
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

function resolveOpencodeBaseUrl(): string {
  const envUrl = process.env.OPENCODE_SERVER_URL?.trim();
  return envUrl && envUrl.length > 0 ? envUrl : DEFAULT_OPENCODE_URL;
}

function discoverMetadataWithClient(client: Pick<OpencodeClient, "app" | "config">) {
  return Effect.gen(function* () {
    const [agentsResponse, providersResponse] = yield* Effect.all([
      Effect.tryPromise({
        try: () => client.app.agents(),
        catch: (error) =>
          new HarnessDiscoveryError({
            harness: "opencode",
            message: error instanceof Error ? error.message : String(error),
          }),
      }),
      Effect.tryPromise({
        try: () => client.config.providers(),
        catch: (error) =>
          new HarnessDiscoveryError({
            harness: "opencode",
            message: error instanceof Error ? error.message : String(error),
          }),
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

export function makeOpencodeHarnessService(
  factory: OpencodeFactory = createOpencode,
  clientFactory: OpencodeClientFactory = createOpencodeClient,
) {
  return HarnessService.of({
    discoverMetadata: () =>
      Effect.catchAll(
        Effect.try({
          try: () =>
            clientFactory({
              baseUrl: resolveOpencodeBaseUrl(),
              directory: process.cwd(),
            }),
          catch: (error) =>
            new HarnessDiscoveryError({
              harness: "opencode",
              message: error instanceof Error ? error.message : String(error),
            }),
        }).pipe(Effect.flatMap((client) => discoverMetadataWithClient(client))),
        () =>
          Effect.acquireUseRelease(
            Effect.tryPromise({
              try: () => factory({ port: 0 }),
              catch: (error) =>
                new HarnessDiscoveryError({
                  harness: "opencode",
                  message: error instanceof Error ? error.message : String(error),
                }),
            }),
            (runtime) => discoverMetadataWithClient(runtime.client),
            (runtime) =>
              Effect.sync(() => {
                runtime.server.close();
              }).pipe(Effect.orDie),
          ),
      ),
  });
}

export const OpencodeHarnessServiceLive = Layer.succeed(
  HarnessService,
  makeOpencodeHarnessService(),
);
