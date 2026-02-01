import { Context, Effect, Layer } from "effect";

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

export const ConfigServiceLive = Layer.effect(
  ConfigService,
  Effect.sync(() => {
    const config = loadConfig();
    return {
      config,
      get: <K extends keyof WorkflowConfig>(key: K) => config[key],
    };
  }),
);
