import { reset as drizzleReset } from "drizzle-seed";
import { inArray, sql } from "drizzle-orm";
import { Console, Effect } from "effect";

import { auth } from "@chiron/auth";
import { db, schema } from "@chiron/db";
import {
  METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
  methodologyCanonicalTableSeedRows,
} from "./seed/methodology/index.ts";

import { classifySeedError, shouldSkipSeedError } from "./seed-error-handling.ts";
import { formatStorySeedNotFoundError, getStorySeedPlan } from "./story-seed-fixtures.ts";

const parseArgs = (args) => {
  const reset = args.includes("--reset") || args.includes("-r");
  const storyArg = args.find((arg) => arg.startsWith("--story="));
  const storyId = storyArg ? storyArg.slice("--story=".length) : "2-7";

  return { reset, storyId };
};

const storySeedDbError = (operation, cause) => ({
  _tag: "StorySeedDbError",
  operation,
  cause,
});

const storySeedAuthError = (operation, email, cause) => ({
  _tag: "StorySeedAuthError",
  operation,
  email,
  cause,
});

const tryDb = (operation, run) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => storySeedDbError(operation, cause),
  });

const upsertMethodologyDefinitions = (plan) => {
  if (plan.methodologyDefinitions.length === 0) {
    return Effect.void;
  }

  return tryDb("upsert_methodology_definitions", () =>
    db
      .insert(schema.methodologyDefinitions)
      .values(plan.methodologyDefinitions)
      .onConflictDoUpdate({
        target: schema.methodologyDefinitions.key,
        set: {
          name: sql`excluded.name`,
          descriptionJson: sql`excluded.description_json`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      }),
  ).pipe(Effect.asVoid);
};

const upsertMethodologyVersions = (plan) => {
  if (plan.methodologyVersions.length === 0) {
    return Effect.void;
  }

  return tryDb("upsert_methodology_versions", () =>
    db
      .insert(schema.methodologyVersions)
      .values(plan.methodologyVersions)
      .onConflictDoUpdate({
        target: [schema.methodologyVersions.methodologyId, schema.methodologyVersions.version],
        set: {
          id: sql`excluded.id`,
          status: sql`excluded.status`,
          displayName: sql`excluded.display_name`,
          definitionExtensions: sql`json('{}')`,
          retiredAt: sql`excluded.retired_at`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      }),
  ).pipe(Effect.asVoid);
};

const CANONICAL_TABLES = {
  methodology_work_unit_types: schema.methodologyWorkUnitTypes,
  methodology_agent_types: schema.methodologyAgentTypes,
  methodology_lifecycle_states: schema.methodologyLifecycleStates,
  methodology_lifecycle_transitions: schema.methodologyLifecycleTransitions,
  methodology_transition_condition_sets: schema.methodologyTransitionConditionSets,
  methodology_fact_schemas: schema.methodologyFactSchemas,
  methodology_link_type_definitions: schema.methodologyLinkTypeDefinitions,
  methodology_workflows: schema.methodologyWorkflows,
  methodology_workflow_steps: schema.methodologyWorkflowSteps,
  methodology_workflow_edges: schema.methodologyWorkflowEdges,
  methodology_transition_workflow_bindings: schema.methodologyTransitionWorkflowBindings,
  methodology_fact_definitions: schema.methodologyFactDefinitions,
};

const seedCanonicalMethodologyTables = (plan) =>
  Effect.gen(function* () {
    const versionIds = plan.methodologyVersions.map((version) => version.id);

    yield* Effect.forEach(
      [...METHODOLOGY_CANONICAL_TABLE_SEED_ORDER].reverse(),
      (tableName) =>
        tryDb(`clear_${tableName}`, () => {
          const table = CANONICAL_TABLES[tableName];
          return db.delete(table).where(inArray(table.methodologyVersionId, versionIds));
        }).pipe(Effect.asVoid),
      { discard: true },
    );

    yield* Effect.forEach(
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      (tableName) => {
        const table = CANONICAL_TABLES[tableName];
        const rows = methodologyCanonicalTableSeedRows[tableName].filter((row) =>
          versionIds.includes(row.methodologyVersionId),
        );

        if (rows.length === 0) {
          return Effect.void;
        }

        return tryDb(`insert_${tableName}`, () => db.insert(table).values(rows)).pipe(
          Effect.asVoid,
        );
      },
      { discard: true },
    );
  });

const seedUsers = (plan) =>
  Effect.gen(function* () {
    if (plan.users.length === 0) {
      return;
    }

    const existingUsers = yield* tryDb("load_existing_seed_users", () =>
      db
        .select({ email: schema.user.email })
        .from(schema.user)
        .where(
          inArray(
            schema.user.email,
            plan.users.map((user) => user.email),
          ),
        ),
    );

    const existingEmails = new Set(existingUsers.map((user) => user.email.toLowerCase()));

    yield* Effect.forEach(
      plan.users,
      (seededUser) => {
        if (existingEmails.has(seededUser.email.toLowerCase())) {
          return Console.log(
            `Seed user '${seededUser.email}' already exists. Keep using --reset for deterministic password state.`,
          );
        }

        return Effect.tryPromise({
          try: () =>
            auth.api.signUpEmail({
              body: {
                name: seededUser.name,
                email: seededUser.email,
                password: seededUser.password,
              },
              headers: new Headers({
                origin: process.env.CORS_ORIGIN ?? "http://localhost:3001",
              }),
            }),
          catch: (cause) => storySeedAuthError("sign_up_email", seededUser.email, cause),
        }).pipe(
          Effect.flatMap((result) => {
            if (result && typeof result === "object" && "error" in result && result.error) {
              return Effect.fail(
                storySeedAuthError("sign_up_email_rejected", seededUser.email, result.error),
              );
            }

            return Console.log(`Created seed user '${seededUser.email}'.`);
          }),
        );
      },
      { discard: true },
    );
  });

const options = parseArgs(process.argv.slice(2));

const program = Effect.gen(function* () {
  const plan = yield* getStorySeedPlan(options.storyId);

  if (options.reset) {
    yield* Effect.tryPromise({
      try: () => drizzleReset(db, schema),
      catch: (cause) => storySeedDbError("reset_database", cause),
    });
    yield* Console.log("Database reset complete.");
  }

  yield* upsertMethodologyDefinitions(plan);
  yield* upsertMethodologyVersions(plan);
  yield* seedCanonicalMethodologyTables(plan);
  yield* seedUsers(plan);

  yield* Console.log(`Story seed '${plan.storyId}' applied successfully.`);
  if (plan.users.length > 0) {
    yield* Console.log(
      `Seed login: ${plan.users[0].email} / ${plan.users[0].password} (deterministic with --reset).`,
    );
  }
}).pipe(
  Effect.as(0),
  Effect.catchAll((error) => {
    if (error && typeof error === "object" && error._tag === "StorySeedNotFoundError") {
      return Console.error(formatStorySeedNotFoundError(error)).pipe(Effect.as(1));
    }

    const errorType = classifySeedError(error);

    if (errorType === "missing_tables") {
      return Console.error(
        "Seed skipped: database schema is missing. Run `bun run db:push` first.",
      ).pipe(Effect.as(1));
    }

    if (shouldSkipSeedError(error, options.reset)) {
      return Console.warn("Seed data already exists. Continuing without changes.").pipe(
        Effect.as(0),
      );
    }

    return Console.error(`Story seed failed with an unexpected error: ${String(error)}`).pipe(
      Effect.as(1),
    );
  }),
);

const exitCode = await Effect.runPromise(program);
process.exit(exitCode);
