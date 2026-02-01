import { describe, expect, it, mock } from "bun:test";
import { Effect, Layer } from "effect";
import {
  AIProviderError,
  AIProviderService,
  AIProviderServiceLive,
  ModelNotFoundError,
} from "@chiron/agent-runtime/ai-sdk/ai-provider-service";
import { ConfigService } from "@chiron/agent-runtime/config-service";

const mockConfigService = {
  _tag: "ConfigService" as const,
  get: (key: string) => {
    if (key === "openrouterApiKey") return "test-openrouter-key";
    if (key === "openaiApiKey") return "test-openai-key";
    if (key === "anthropicApiKey") return "test-anthropic-key";
    return undefined;
  },
  getAll: () => ({
    databaseUrl: "test",
    useEffectExecutor: false,
    useEffectAI: true,
    maxStepExecutions: 100,
    stepTimeoutMs: 300000,
    approvalTimeoutMs: 300000,
    streamCheckpointInterval: 50,
    openaiApiKey: "test-openai-key",
    anthropicApiKey: "test-anthropic-key",
    openrouterApiKey: "test-openrouter-key",
  }),
};

const TestConfigLayer = Layer.succeed(ConfigService, mockConfigService);

describe("AIProviderService", () => {
  describe("parseModelString", () => {
    it("should parse openrouter model string", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AIProviderService;
        return yield* service.parseModelString("openrouter:openrouter/polaris-alpha");
      });

      const testLayer = AIProviderServiceLive.pipe(Layer.provide(TestConfigLayer));

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.provider).toBe("openrouter");
      expect(result.modelId).toBe("openrouter/polaris-alpha");
    });

    it("should parse openai model string", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AIProviderService;
        return yield* service.parseModelString("openai:gpt-4o-mini");
      });

      const testLayer = AIProviderServiceLive.pipe(Layer.provide(TestConfigLayer));

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.provider).toBe("openai");
      expect(result.modelId).toBe("gpt-4o-mini");
    });

    it("should parse anthropic model string", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AIProviderService;
        return yield* service.parseModelString("anthropic:claude-3-5-sonnet-20241022");
      });

      const testLayer = AIProviderServiceLive.pipe(Layer.provide(TestConfigLayer));

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.provider).toBe("anthropic");
      expect(result.modelId).toBe("claude-3-5-sonnet-20241022");
    });

    it("should return default for invalid format", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AIProviderService;
        return yield* service.parseModelString("invalid-format");
      });

      const testLayer = AIProviderServiceLive.pipe(Layer.provide(TestConfigLayer));

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result.provider).toBe("openrouter");
      expect(result.modelId).toBe("openrouter/polaris-alpha");
    });
  });

  describe("loadModel", () => {
    it("should load openrouter model with API key", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AIProviderService;
        return yield* service.loadModel({
          provider: "openrouter",
          modelId: "openrouter/polaris-alpha",
        });
      });

      const testLayer = AIProviderServiceLive.pipe(Layer.provide(TestConfigLayer));

      const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(result).toBeDefined();
    });

    it("should fail without API key when not provided", async () => {
      const noKeyConfigService = {
        ...mockConfigService,
        get: () => undefined,
      };

      const program = Effect.gen(function* () {
        const service = yield* AIProviderService;
        return yield* service.loadModel({
          provider: "openai",
          modelId: "gpt-4o-mini",
        });
      });

      const testLayer = AIProviderServiceLive.pipe(
        Layer.provide(Layer.succeed(ConfigService, noKeyConfigService)),
      );

      const result = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayer)));

      expect(result._tag).toBe("Failure");
    });
  });
});
