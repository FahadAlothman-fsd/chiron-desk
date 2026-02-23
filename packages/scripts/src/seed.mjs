import { Command, Options } from "@effect/cli";
import { Effect } from "effect";

const [{ db, schema }, { reset: drizzleReset, seed }, { classifySeedError, shouldSkipSeedError }] =
  await Promise.all([
    import("@chiron/db"),
    import("drizzle-seed"),
    import("./seed-error-handling.ts"),
  ]);

const handleFailure = (error, stage, shouldReset) => {
  const failureType = classifySeedError(error);

  if (failureType === "missing_tables") {
    console.error("[seed] missing tables: run `bun run db:push` first");
    process.exit(1);
  }

  if (stage === "seed" && shouldSkipSeedError(error, shouldReset)) {
    console.log("[seed] existing rows detected; skipping because --reset was not provided");
    return true;
  }

  throw error;
};

const runSeed = async (shouldReset) => {
  if (shouldReset) {
    try {
      await drizzleReset(db, schema);
      console.log("[seed] database reset complete");
    } catch (error) {
      handleFailure(error, "reset", shouldReset);
    }
  }

  try {
    await seed(db, schema);
    console.log("[seed] drizzle-seed completed");
  } catch (error) {
    const skipped = handleFailure(error, "seed", shouldReset);

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
