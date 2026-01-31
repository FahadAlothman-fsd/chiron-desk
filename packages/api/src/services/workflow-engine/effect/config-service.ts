import { appConfig } from "@chiron/db";
import { eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { decrypt } from "../../../services/encryption";
import { DatabaseService } from "./database-service";
import { ExecutionContext } from "./execution-context";

export interface WorkflowConfig {
  readonly databaseUrl: string;
  readonly useEffectAI: boolean;
  readonly maxStepExecutions: number;
  readonly stepTimeoutMs: number;
  readonly approvalTimeoutMs: number;
  readonly streamCheckpointInterval: number;
  readonly openaiApiKey: string | undefined;
  readonly anthropicApiKey: string | undefined;
  readonly openrouterApiKey: string | undefined;
}

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    readonly config: WorkflowConfig;
    readonly get: <K extends keyof WorkflowConfig>(key: K) => WorkflowConfig[K];
  }
>() {}

const loadConfig = (): WorkflowConfig => ({
  databaseUrl: process.env.DATABASE_URL || "",
  useEffectAI: process.env.USE_EFFECT_AI === "true",
  maxStepExecutions: Number.parseInt(process.env.MAX_STEP_EXECUTIONS || "100", 10),
  stepTimeoutMs: Number.parseInt(process.env.STEP_TIMEOUT_MS || "300000", 10),
  approvalTimeoutMs: Number.parseInt(process.env.APPROVAL_TIMEOUT_MS || "300000", 10),
  streamCheckpointInterval: Number.parseInt(process.env.STREAM_CHECKPOINT_INTERVAL || "50", 10),
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
});

const decryptKey = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  try {
    return decrypt(value);
  } catch (error) {
    console.warn(
      "[ConfigService] Failed to decrypt app_config key:",
      error instanceof Error ? error.message : error,
    );
    return undefined;
  }
};

const applyAppConfigOverrides = (
  config: WorkflowConfig,
  overrides?: {
    openaiApiKey?: string;
    anthropicApiKey?: string;
    openrouterApiKey?: string;
  },
): WorkflowConfig => ({
  ...config,
  openaiApiKey: overrides?.openaiApiKey ?? config.openaiApiKey,
  anthropicApiKey: overrides?.anthropicApiKey ?? config.anthropicApiKey,
  openrouterApiKey: overrides?.openrouterApiKey ?? config.openrouterApiKey,
});

export const ConfigServiceLive = Layer.effect(
  ConfigService,
  Effect.gen(function* () {
    const config = loadConfig();
    const executionContext = yield* ExecutionContext;
    const { db } = yield* DatabaseService;

    const state = yield* executionContext.getState();

    if (!state.userId) {
      return {
        config,
        get: <K extends keyof WorkflowConfig>(key: K) => config[key],
      };
    }

    const appConfigRecord = yield* Effect.tryPromise({
      try: async () => {
        const [record] = await db
          .select()
          .from(appConfig)
          .where(eq(appConfig.userId, state.userId ?? ""))
          .limit(1);
        return record ?? null;
      },
      catch: () => null,
    });

    const overrides = appConfigRecord
      ? {
          openaiApiKey: decryptKey(appConfigRecord.openaiApiKey),
          anthropicApiKey: decryptKey(appConfigRecord.anthropicApiKey),
          openrouterApiKey: decryptKey(appConfigRecord.openrouterApiKey),
        }
      : undefined;

    const resolvedConfig = applyAppConfigOverrides(config, overrides);

    return {
      config: resolvedConfig,
      get: <K extends keyof WorkflowConfig>(key: K) => resolvedConfig[key],
    };
  }),
);
