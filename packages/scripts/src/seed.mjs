import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { Result } from "better-result";

const [{ db, schema }, { reset: drizzleReset, seed }, { classifySeedError, shouldSkipSeedError }] =
  await Promise.all([
    import("@chiron/db"),
    import("drizzle-seed"),
    import("./seed-error-handling.ts"),
  ]);

const handleFailure = (error, stage, shouldReset) => {
  const failureType = classifySeedError(error);

  if (failureType === "missing_tables") {
    console.error("[seed:test] missing tables: run `bun run db:push` first");
    process.exit(1);
  }

  if (stage === "seed" && shouldSkipSeedError(error, shouldReset)) {
    console.log("[seed:test] existing rows detected; skipping because --reset was not provided");
    return true;
  }

  throw error;
};

const runSeed = async (shouldReset) => {
  if (shouldReset) {
    const resetResult = await Result.tryPromise({
      try: async () => drizzleReset(db, schema),
      catch: (error) => error,
    });

    if (resetResult.isErr()) {
      handleFailure(resetResult.error, "reset", shouldReset);
    } else {
      console.log("[seed:test] database reset complete");
    }
  }

  const seedResult = await Result.tryPromise({
    try: async () => seed(db, schema, { count: 1 }),
    catch: (error) => error,
  });

  if (seedResult.isOk()) {
    console.log("[seed:test] drizzle-seed completed");
  } else {
    const skipped = handleFailure(seedResult.error, "seed", shouldReset);

    if (skipped) {
      return;
    }
  }
};

const resetOption = Options.boolean("reset").pipe(Options.withAlias("r"));

const seedCommand = Command.make("seed", { reset: resetOption }, ({ reset }) =>
  Effect.promise(() => runSeed(reset)),
);

const cli = Command.run(seedCommand, {
  name: "chiron-seed",
  version: "0.1.0",
});

await Effect.runPromise(cli(process.argv));
