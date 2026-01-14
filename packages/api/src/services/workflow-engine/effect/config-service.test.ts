import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { ConfigService, ConfigServiceLive } from "./config-service";

describe("ConfigService", () => {
  test("provides config object", () => {
    const program = Effect.gen(function* () {
      const configService = yield* ConfigService;
      expect(configService.config).toBeDefined();
      expect(typeof configService.config.maxStepExecutions).toBe("number");
    });

    Effect.runSync(Effect.provide(program, ConfigServiceLive));
  });

  test("get returns config value", () => {
    const program = Effect.gen(function* () {
      const configService = yield* ConfigService;
      const maxSteps = configService.get("maxStepExecutions");
      expect(maxSteps).toBe(100);
    });

    Effect.runSync(Effect.provide(program, ConfigServiceLive));
  });

  test("useEffectExecutor defaults to false", () => {
    const program = Effect.gen(function* () {
      const configService = yield* ConfigService;
      expect(configService.get("useEffectExecutor")).toBe(false);
    });

    Effect.runSync(Effect.provide(program, ConfigServiceLive));
  });
});
