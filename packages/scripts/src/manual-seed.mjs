import { reset as drizzleReset } from "drizzle-seed";
import { inArray, sql } from "drizzle-orm";
import { Console, Effect } from "effect";

import { auth } from "@chiron/auth";
import { db, schema } from "@chiron/db";
import {
  METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
  methodologyCanonicalTableSeedRows,
} from "./seed/methodology/index.ts";
import { brainstormingDemoFixtureSeedRowsAllVersions } from "./seed/methodology/setup/brainstorming-demo-fixture.ts";
import { slice1DemoFixtureSeedRowsAllVersions } from "./seed/methodology/setup/slice-1-demo-fixture.ts";
import { classifySeedError, shouldSkipSeedError } from "./seed-error-handling.ts";
import { BASELINE_MANUAL_SEED_PLAN } from "./manual-seed-fixtures.ts";

const parseArgs = (args) => {
  const reset = args.includes("--reset") || args.includes("-r");

  return { reset };
};

const manualSeedDbError = (operation, cause) => ({
  _tag: "ManualSeedDbError",
  operation,
  cause,
});

const manualSeedAuthError = (operation, email, cause) => ({
  _tag: "ManualSeedAuthError",
  operation,
  email,
  cause,
});

const tryDb = (operation, run) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => manualSeedDbError(operation, cause),
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
  work_unit_lifecycle_states: schema.workUnitLifecycleStates,
  work_unit_lifecycle_transitions: schema.workUnitLifecycleTransitions,
  transition_condition_sets: schema.transitionConditionSets,
  work_unit_fact_definitions: schema.workUnitFactDefinitions,
  methodology_artifact_slot_definitions: schema.methodologyArtifactSlotDefinitions,
  methodology_artifact_slot_templates: schema.methodologyArtifactSlotTemplates,
  methodology_link_type_definitions: schema.methodologyLinkTypeDefinitions,
  methodology_workflows: schema.methodologyWorkflows,
  methodology_workflow_steps: schema.methodologyWorkflowSteps,
  methodology_workflow_edges: schema.methodologyWorkflowEdges,
  methodology_transition_workflow_bindings: schema.methodologyTransitionWorkflowBindings,
  methodology_fact_definitions: schema.methodologyFactDefinitions,
};

const RUNTIME_FIXTURE_TABLE_INSERTIONS = [
  ["methodologyWorkflowContextFactDefinitions", schema.methodologyWorkflowContextFactDefinitions],
  ["methodologyWorkflowContextFactPlainValues", schema.methodologyWorkflowContextFactPlainValues],
  ["methodologyWorkflowContextFactExternalBindings", schema.methodologyWorkflowContextFactExternalBindings],
  ["methodologyWorkflowContextFactWorkflowReferences", schema.methodologyWorkflowContextFactWorkflowReferences],
  ["methodologyWorkflowContextFactArtifactReferences", schema.methodologyWorkflowContextFactArtifactReferences],
  ["methodologyWorkflowContextFactDraftSpecs", schema.methodologyWorkflowContextFactDraftSpecs],
  [
    "methodologyWorkflowContextFactDraftSpecSelections",
    schema.methodologyWorkflowContextFactDraftSpecSelections,
  ],
  ["methodologyWorkflowContextFactDraftSpecFacts", schema.methodologyWorkflowContextFactDraftSpecFields],
  ["methodology_workflow_steps", schema.methodologyWorkflowSteps],
  ["methodologyWorkflowAgentSteps", schema.methodologyWorkflowAgentSteps],
  [
    "methodologyWorkflowAgentStepExplicitReadGrants",
    schema.methodologyWorkflowAgentStepExplicitReadGrants,
  ],
  ["methodologyWorkflowAgentStepWriteItems", schema.methodologyWorkflowAgentStepWriteItems],
  [
    "methodologyWorkflowAgentStepWriteItemRequirements",
    schema.methodologyWorkflowAgentStepWriteItemRequirements,
  ],
  ["methodologyWorkflowInvokeSteps", schema.methodologyWorkflowInvokeSteps],
  ["methodologyWorkflowInvokeBindings", schema.methodologyWorkflowInvokeBindings],
  ["methodologyWorkflowInvokeTransitions", schema.methodologyWorkflowInvokeTransitions],
  ["methodology_workflow_edges", schema.methodologyWorkflowEdges],
  ["methodologyWorkflowFormFields", schema.methodologyWorkflowFormFields],
];

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

const seedRuntimeWorkflowFixtures = (plan) =>
  Effect.gen(function* () {
    const versionIds = new Set(plan.methodologyVersions.map((version) => version.id));
    const bundles = [...slice1DemoFixtureSeedRowsAllVersions, ...brainstormingDemoFixtureSeedRowsAllVersions].filter(
      (bundle) => versionIds.has(bundle.methodologyVersionId),
    );

    if (bundles.length === 0) {
      return;
    }

    const workflowIds = bundles.map((bundle) => bundle.workflowId);
    const stepIds = bundles.flatMap((bundle) => bundle.methodology_workflow_steps.map((row) => row.id));
    const invokeStepIds = bundles.flatMap((bundle) =>
      (bundle.methodologyWorkflowInvokeSteps ?? []).map((row) => row.stepId),
    );
    const contextFactDefinitionIds = bundles.flatMap((bundle) =>
      bundle.methodologyWorkflowContextFactDefinitions.map((row) => row.id),
    );
    const draftSpecIds = bundles.flatMap((bundle) =>
      bundle.methodologyWorkflowContextFactDraftSpecs.map((row) => row.id),
    );

    if (invokeStepIds.length > 0) {
      yield* tryDb("clear_fixture_invoke_transitions", () =>
        db
          .delete(schema.methodologyWorkflowInvokeTransitions)
          .where(inArray(schema.methodologyWorkflowInvokeTransitions.invokeStepId, invokeStepIds)),
      ).pipe(Effect.asVoid);

      yield* tryDb("clear_fixture_invoke_bindings", () =>
        db
          .delete(schema.methodologyWorkflowInvokeBindings)
          .where(inArray(schema.methodologyWorkflowInvokeBindings.invokeStepId, invokeStepIds)),
      ).pipe(Effect.asVoid);

      yield* tryDb("clear_fixture_invoke_steps", () =>
        db
          .delete(schema.methodologyWorkflowInvokeSteps)
          .where(inArray(schema.methodologyWorkflowInvokeSteps.stepId, invokeStepIds)),
      ).pipe(Effect.asVoid);
    }

    yield* tryDb("clear_fixture_workflow_form_fields", () =>
      db.delete(schema.methodologyWorkflowFormFields).where(inArray(schema.methodologyWorkflowFormFields.formStepId, stepIds)),
    ).pipe(Effect.asVoid);

    yield* tryDb("clear_fixture_workflow_edges", () =>
      db.delete(schema.methodologyWorkflowEdges).where(inArray(schema.methodologyWorkflowEdges.workflowId, workflowIds)),
    ).pipe(Effect.asVoid);

    yield* tryDb("clear_fixture_workflow_steps", () =>
      db.delete(schema.methodologyWorkflowSteps).where(inArray(schema.methodologyWorkflowSteps.workflowId, workflowIds)),
    ).pipe(Effect.asVoid);

    yield* tryDb("clear_fixture_draft_spec_facts", () =>
      db
        .delete(schema.methodologyWorkflowContextFactDraftSpecFields)
        .where(inArray(schema.methodologyWorkflowContextFactDraftSpecFields.draftSpecId, draftSpecIds)),
    ).pipe(Effect.asVoid);

    yield* tryDb("clear_fixture_draft_spec_selections", () =>
      db
        .delete(schema.methodologyWorkflowContextFactDraftSpecSelections)
        .where(inArray(schema.methodologyWorkflowContextFactDraftSpecSelections.draftSpecId, draftSpecIds)),
    ).pipe(Effect.asVoid);

    yield* tryDb("clear_fixture_draft_specs", () =>
      db
        .delete(schema.methodologyWorkflowContextFactDraftSpecs)
        .where(
          inArray(
            schema.methodologyWorkflowContextFactDraftSpecs.contextFactDefinitionId,
            contextFactDefinitionIds,
          ),
        ),
    ).pipe(Effect.asVoid);

    yield* tryDb("clear_fixture_artifact_refs", () =>
      db
        .delete(schema.methodologyWorkflowContextFactArtifactReferences)
        .where(
          inArray(
            schema.methodologyWorkflowContextFactArtifactReferences.contextFactDefinitionId,
            contextFactDefinitionIds,
          ),
        ),
    ).pipe(Effect.asVoid);

    yield* tryDb("clear_fixture_workflow_refs", () =>
      db
        .delete(schema.methodologyWorkflowContextFactWorkflowReferences)
        .where(
          inArray(
            schema.methodologyWorkflowContextFactWorkflowReferences.contextFactDefinitionId,
            contextFactDefinitionIds,
          ),
        ),
    ).pipe(Effect.asVoid);

    yield* tryDb("clear_fixture_external_bindings", () =>
      db
        .delete(schema.methodologyWorkflowContextFactExternalBindings)
        .where(
          inArray(
            schema.methodologyWorkflowContextFactExternalBindings.contextFactDefinitionId,
            contextFactDefinitionIds,
          ),
        ),
    ).pipe(Effect.asVoid);

    yield* tryDb("clear_fixture_plain_values", () =>
      db
        .delete(schema.methodologyWorkflowContextFactPlainValues)
        .where(
          inArray(schema.methodologyWorkflowContextFactPlainValues.contextFactDefinitionId, contextFactDefinitionIds),
        ),
    ).pipe(Effect.asVoid);

    yield* tryDb("clear_fixture_context_facts", () =>
      db
        .delete(schema.methodologyWorkflowContextFactDefinitions)
        .where(inArray(schema.methodologyWorkflowContextFactDefinitions.workflowId, workflowIds)),
    ).pipe(Effect.asVoid);

    for (const [rowsKey, table] of RUNTIME_FIXTURE_TABLE_INSERTIONS) {
      const rows = bundles.flatMap((bundle) => bundle[rowsKey] ?? []);
      if (rows.length === 0) {
        continue;
      }

      yield* tryDb(`insert_${rowsKey}`, () => db.insert(table).values(rows)).pipe(Effect.asVoid);
    }

    for (const bundle of bundles) {
      yield* tryDb(`patch_${bundle.workflowId}_metadata`, async () => {
        const existing = await db
          .select({ metadataJson: schema.methodologyWorkflows.metadataJson })
          .from(schema.methodologyWorkflows)
          .where(sql`${schema.methodologyWorkflows.id} = ${bundle.workflowId}`)
          .limit(1);

        const currentMetadata = existing[0]?.metadataJson;
        const nextMetadata =
          currentMetadata && typeof currentMetadata === "object" && !Array.isArray(currentMetadata)
            ? { ...currentMetadata, ...bundle.workflowMetadataPatch.metadataJson }
            : { ...bundle.workflowMetadataPatch.metadataJson };

        await db
          .update(schema.methodologyWorkflows)
          .set({ metadataJson: nextMetadata })
          .where(sql`${schema.methodologyWorkflows.id} = ${bundle.workflowId}`);
      }).pipe(Effect.asVoid);
    }
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
          catch: (cause) => manualSeedAuthError("sign_up_email", seededUser.email, cause),
        }).pipe(
          Effect.flatMap((result) => {
            if (result && typeof result === "object" && "error" in result && result.error) {
              return Effect.fail(
                manualSeedAuthError("sign_up_email_rejected", seededUser.email, result.error),
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
  const plan = BASELINE_MANUAL_SEED_PLAN;

  if (options.reset) {
    yield* Effect.tryPromise({
      try: () => drizzleReset(db, schema),
      catch: (cause) => manualSeedDbError("reset_database", cause),
    });
    yield* Console.log("Database reset complete.");
  }

  yield* upsertMethodologyDefinitions(plan);
  yield* upsertMethodologyVersions(plan);
  yield* seedCanonicalMethodologyTables(plan);
  yield* seedRuntimeWorkflowFixtures(plan);
  yield* seedUsers(plan);

  yield* Console.log("Manual baseline seed applied successfully.");
  if (plan.users.length > 0) {
    yield* Console.log(
      `Seed login: ${plan.users[0].email} / ${plan.users[0].password} (deterministic with --reset).`,
    );
  }
}).pipe(
  Effect.as(0),
  Effect.catchAll((error) => {
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

    return Console.error(`Manual seed failed with an unexpected error: ${String(error)}`).pipe(
      Effect.as(1),
    );
  }),
);

const exitCode = await Effect.runPromise(program);
process.exit(exitCode);
