import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { DatabaseService, DatabaseServiceLive } from "./database-service";

describe("DatabaseService", () => {
  test("provides db instance", () => {
    const program = Effect.gen(function* () {
      const dbService = yield* DatabaseService;
      expect(dbService.db).toBeDefined();
    });

    Effect.runSync(Effect.provide(program, DatabaseServiceLive));
  });

  test("transaction executes effect", async () => {
    const program = Effect.gen(function* () {
      const dbService = yield* DatabaseService;
      const result = yield* dbService.transaction(() => Effect.succeed("test-result"));
      expect(result).toBe("test-result");
    });

    await Effect.runPromise(Effect.provide(program, DatabaseServiceLive));
  });
});
