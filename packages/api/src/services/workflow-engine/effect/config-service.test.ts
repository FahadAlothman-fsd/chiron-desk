import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { ConfigService, ConfigServiceLive } from "./config-service";
import { DatabaseServiceLive } from "./database-service";
import { ExecutionContextLive } from "./execution-context";

describe("ConfigService", () => {
  const baseState = {
    executionId: "test-execution",
    workflowId: "test-workflow",
    projectId: undefined,
    parentExecutionId: null,
    userId: undefined,
    variables: {},
    currentStepNumber: 1,
  };

  const contextLayer = Layer.mergeAll(DatabaseServiceLive, ExecutionContextLive(baseState));

  const configLayer = ConfigServiceLive.pipe(Layer.provide(contextLayer));

  const TestLayer = Layer.mergeAll(contextLayer, configLayer);

  test("provides config object", () => {
    const program = Effect.gen(function* () {
      const configService = yield* ConfigService;
      expect(configService.config).toBeDefined();
      expect(typeof configService.config.maxStepExecutions).toBe("number");
    });

    Effect.runSync(Effect.provide(program, TestLayer));
  });

  test("get returns config value", () => {
    const program = Effect.gen(function* () {
      const configService = yield* ConfigService;
      const maxSteps = configService.get("maxStepExecutions");
      expect(maxSteps).toBe(100);
    });

    Effect.runSync(Effect.provide(program, TestLayer));
  });

  test("useEffectAI defaults to false", () => {
    const program = Effect.gen(function* () {
      const configService = yield* ConfigService;
      expect(configService.get("useEffectAI")).toBe(false);
    });

    Effect.runSync(Effect.provide(program, TestLayer));
  });
});
