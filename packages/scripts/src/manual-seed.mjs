import { reset as drizzleReset } from "drizzle-seed";
import { inArray, sql } from "drizzle-orm";
import { Console, Effect } from "effect";

import { auth } from "@chiron/auth";
import { db, schema } from "@chiron/db";
import {
  METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
  methodologyCanonicalTableSeedRows,
} from "./seed/methodology/index.ts";
import {
  runtimeMethodologyWorkflowActionStepActionItemSeedRows,
  runtimeMethodologyWorkflowActionStepActionSeedRows,
  runtimeMethodologyWorkflowActionStepSeedRows,
  runtimeMethodologyWorkflowBranchRouteConditionSeedRows,
  runtimeMethodologyWorkflowBranchRouteGroupSeedRows,
  runtimeMethodologyWorkflowBranchRouteSeedRows,
  runtimeMethodologyWorkflowBranchStepSeedRows,
  runtimeMethodologyWorkflowAgentStepExplicitReadGrantSeedRows,
  runtimeMethodologyWorkflowAgentStepWriteItemRequirementSeedRows,
  runtimeMethodologyWorkflowAgentStepWriteItemSeedRows,
  runtimeMethodologyWorkflowAgentStepSeedRows,
  runtimeMethodologyWorkflowContextFactArtifactReferenceSeedRows,
  runtimeMethodologyWorkflowContextFactDefinitionSeedRows,
  runtimeMethodologyWorkflowContextFactDraftSpecFactSeedRows,
  runtimeMethodologyWorkflowContextFactDraftSpecSeedRows,
  runtimeMethodologyWorkflowContextFactDraftSpecSelectionSeedRows,
  runtimeMethodologyWorkflowContextFactExternalBindingSeedRows,
  runtimeMethodologyWorkflowContextFactPlainValueSeedRows,
  runtimeMethodologyWorkflowContextFactWorkflowReferenceSeedRows,
  runtimeMethodologyWorkflowEdgeSeedRows,
  runtimeMethodologyWorkflowFormFieldSeedRows,
  runtimeMethodologyWorkflowInvokeBindingSeedRows,
  runtimeMethodologyWorkflowInvokeStepSeedRows,
  runtimeMethodologyWorkflowInvokeTransitionSeedRows,
  runtimeMethodologyWorkflowMetadataPatches,
  runtimeMethodologyWorkflowStepSeedRows,
} from "./seed/methodology/tables/index.ts";
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

export const RUNTIME_FIXTURE_TABLE_INSERTIONS = [
  [
    "methodologyWorkflowContextFactDefinitions",
    schema.methodologyWorkflowContextFactDefinitions,
    runtimeMethodologyWorkflowContextFactDefinitionSeedRows,
  ],
  [
    "methodologyWorkflowContextFactPlainValues",
    schema.methodologyWorkflowContextFactPlainValues,
    runtimeMethodologyWorkflowContextFactPlainValueSeedRows,
  ],
  [
    "methodologyWorkflowContextFactExternalBindings",
    schema.methodologyWorkflowContextFactExternalBindings,
    runtimeMethodologyWorkflowContextFactExternalBindingSeedRows,
  ],
  [
    "methodologyWorkflowContextFactWorkflowReferences",
    schema.methodologyWorkflowContextFactWorkflowReferences,
    runtimeMethodologyWorkflowContextFactWorkflowReferenceSeedRows,
  ],
  [
    "methodologyWorkflowContextFactArtifactReferences",
    schema.methodologyWorkflowContextFactArtifactReferences,
    runtimeMethodologyWorkflowContextFactArtifactReferenceSeedRows,
  ],
  [
    "methodologyWorkflowContextFactDraftSpecs",
    schema.methodologyWorkflowContextFactDraftSpecs,
    runtimeMethodologyWorkflowContextFactDraftSpecSeedRows,
  ],
  [
    "methodologyWorkflowContextFactDraftSpecSelections",
    schema.methodologyWorkflowContextFactDraftSpecSelections,
    runtimeMethodologyWorkflowContextFactDraftSpecSelectionSeedRows,
  ],
  [
    "methodologyWorkflowContextFactDraftSpecFacts",
    schema.methodologyWorkflowContextFactDraftSpecFields,
    runtimeMethodologyWorkflowContextFactDraftSpecFactSeedRows,
  ],
  ["methodology_workflow_steps", schema.methodologyWorkflowSteps, runtimeMethodologyWorkflowStepSeedRows],
  [
    "methodologyWorkflowActionSteps",
    schema.methodologyWorkflowActionSteps,
    runtimeMethodologyWorkflowActionStepSeedRows,
  ],
  [
    "methodologyWorkflowActionStepActions",
    schema.methodologyWorkflowActionStepActions,
    runtimeMethodologyWorkflowActionStepActionSeedRows,
  ],
  [
    "methodologyWorkflowActionStepActionItems",
    schema.methodologyWorkflowActionStepActionItems,
    runtimeMethodologyWorkflowActionStepActionItemSeedRows,
  ],
  [
    "methodologyWorkflowBranchSteps",
    schema.methodologyWorkflowBranchSteps,
    runtimeMethodologyWorkflowBranchStepSeedRows,
  ],
  [
    "methodologyWorkflowBranchRoutes",
    schema.methodologyWorkflowBranchRoutes,
    runtimeMethodologyWorkflowBranchRouteSeedRows,
  ],
  [
    "methodologyWorkflowBranchRouteGroups",
    schema.methodologyWorkflowBranchRouteGroups,
    runtimeMethodologyWorkflowBranchRouteGroupSeedRows,
  ],
  [
    "methodologyWorkflowBranchRouteConditions",
    schema.methodologyWorkflowBranchRouteConditions,
    runtimeMethodologyWorkflowBranchRouteConditionSeedRows,
  ],
  ["methodologyWorkflowAgentSteps", schema.methodologyWorkflowAgentSteps, runtimeMethodologyWorkflowAgentStepSeedRows],
  [
    "methodologyWorkflowAgentStepExplicitReadGrants",
    schema.methodologyWorkflowAgentStepExplicitReadGrants,
    runtimeMethodologyWorkflowAgentStepExplicitReadGrantSeedRows,
  ],
  [
    "methodologyWorkflowAgentStepWriteItems",
    schema.methodologyWorkflowAgentStepWriteItems,
    runtimeMethodologyWorkflowAgentStepWriteItemSeedRows,
  ],
  [
    "methodologyWorkflowAgentStepWriteItemRequirements",
    schema.methodologyWorkflowAgentStepWriteItemRequirements,
    runtimeMethodologyWorkflowAgentStepWriteItemRequirementSeedRows,
  ],
  ["methodologyWorkflowInvokeSteps", schema.methodologyWorkflowInvokeSteps, runtimeMethodologyWorkflowInvokeStepSeedRows],
  ["methodologyWorkflowInvokeBindings", schema.methodologyWorkflowInvokeBindings, runtimeMethodologyWorkflowInvokeBindingSeedRows],
  [
    "methodologyWorkflowInvokeTransitions",
    schema.methodologyWorkflowInvokeTransitions,
    runtimeMethodologyWorkflowInvokeTransitionSeedRows,
  ],
  ["methodology_workflow_edges", schema.methodologyWorkflowEdges, runtimeMethodologyWorkflowEdgeSeedRows],
  ["methodologyWorkflowFormFields", schema.methodologyWorkflowFormFields, runtimeMethodologyWorkflowFormFieldSeedRows],
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
    const workflowMetadataPatches = runtimeMethodologyWorkflowMetadataPatches.filter((patch) =>
      versionIds.has(patch.workflowId.split(":").at(-1)),
    );
    const runtimeWorkflowSteps = runtimeMethodologyWorkflowStepSeedRows.filter((row) =>
      versionIds.has(row.methodologyVersionId),
    );
    const runtimeWorkflowEdges = runtimeMethodologyWorkflowEdgeSeedRows.filter((row) =>
      versionIds.has(row.methodologyVersionId),
    );
    const runtimeContextFacts = runtimeMethodologyWorkflowContextFactDefinitionSeedRows.filter((row) =>
      versionIds.has(row.workflowId.split(":").at(-1)),
    );
    const runtimeDraftSpecs = runtimeMethodologyWorkflowContextFactDraftSpecSeedRows.filter((row) =>
      runtimeContextFacts.some((contextFact) => contextFact.id === row.contextFactDefinitionId),
    );

    if (workflowMetadataPatches.length === 0) {
      return;
    }

    const workflowIds = workflowMetadataPatches.map((patch) => patch.workflowId);
    const stepIds = runtimeWorkflowSteps.map((row) => row.id);
    const actionStepIds = runtimeMethodologyWorkflowActionStepSeedRows
      .filter((row) => stepIds.includes(row.stepId))
      .map((row) => row.stepId);
    const actionRowIds = runtimeMethodologyWorkflowActionStepActionSeedRows
      .filter((row) => actionStepIds.includes(row.actionStepId))
      .map((row) => row.id);
    const branchStepIds = runtimeMethodologyWorkflowBranchStepSeedRows
      .filter((row) => stepIds.includes(row.stepId))
      .map((row) => row.stepId);
    const branchRouteIds = runtimeMethodologyWorkflowBranchRouteSeedRows
      .filter((row) => branchStepIds.includes(row.branchStepId))
      .map((row) => row.id);
    const branchRouteGroupIds = runtimeMethodologyWorkflowBranchRouteGroupSeedRows
      .filter((row) => branchRouteIds.includes(row.routeId))
      .map((row) => row.id);
    const invokeStepIds = runtimeMethodologyWorkflowInvokeStepSeedRows
      .filter((row) => stepIds.includes(row.stepId))
      .map((row) => row.stepId);
    const contextFactDefinitionIds = runtimeContextFacts.map((row) => row.id);
    const draftSpecIds = runtimeDraftSpecs.map((row) => row.id);

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

    if (actionRowIds.length > 0) {
      yield* tryDb("clear_fixture_action_step_action_items", () =>
        db
          .delete(schema.methodologyWorkflowActionStepActionItems)
          .where(inArray(schema.methodologyWorkflowActionStepActionItems.actionRowId, actionRowIds)),
      ).pipe(Effect.asVoid);

      yield* tryDb("clear_fixture_action_step_actions", () =>
        db
          .delete(schema.methodologyWorkflowActionStepActions)
          .where(inArray(schema.methodologyWorkflowActionStepActions.id, actionRowIds)),
      ).pipe(Effect.asVoid);
    }

    if (actionStepIds.length > 0) {
      yield* tryDb("clear_fixture_action_steps", () =>
        db
          .delete(schema.methodologyWorkflowActionSteps)
          .where(inArray(schema.methodologyWorkflowActionSteps.stepId, actionStepIds)),
      ).pipe(Effect.asVoid);
    }

    if (branchRouteGroupIds.length > 0) {
      yield* tryDb("clear_fixture_branch_route_conditions", () =>
        db
          .delete(schema.methodologyWorkflowBranchRouteConditions)
          .where(
            inArray(schema.methodologyWorkflowBranchRouteConditions.groupId, branchRouteGroupIds),
          ),
      ).pipe(Effect.asVoid);
    }

    if (branchRouteIds.length > 0) {
      yield* tryDb("clear_fixture_branch_route_groups", () =>
        db
          .delete(schema.methodologyWorkflowBranchRouteGroups)
          .where(inArray(schema.methodologyWorkflowBranchRouteGroups.routeId, branchRouteIds)),
      ).pipe(Effect.asVoid);

      yield* tryDb("clear_fixture_branch_routes", () =>
        db
          .delete(schema.methodologyWorkflowBranchRoutes)
          .where(inArray(schema.methodologyWorkflowBranchRoutes.id, branchRouteIds)),
      ).pipe(Effect.asVoid);
    }

    if (branchStepIds.length > 0) {
      yield* tryDb("clear_fixture_branch_steps", () =>
        db
          .delete(schema.methodologyWorkflowBranchSteps)
          .where(inArray(schema.methodologyWorkflowBranchSteps.stepId, branchStepIds)),
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

    for (const [rowsKey, table, allRows] of RUNTIME_FIXTURE_TABLE_INSERTIONS) {
      const rows = allRows.filter((row) => {
        if (typeof row?.methodologyVersionId === "string") {
          return versionIds.has(row.methodologyVersionId);
        }

        if (typeof row?.workflowId === "string") {
          return workflowIds.includes(row.workflowId);
        }

        if (typeof row?.formStepId === "string") {
          return stepIds.includes(row.formStepId);
        }

        if (typeof row?.stepId === "string") {
          return stepIds.includes(row.stepId);
        }

        if (typeof row?.actionStepId === "string") {
          return actionStepIds.includes(row.actionStepId);
        }

        if (typeof row?.actionRowId === "string") {
          return actionRowIds.includes(row.actionRowId);
        }

        if (typeof row?.branchStepId === "string") {
          return branchStepIds.includes(row.branchStepId);
        }

        if (typeof row?.routeId === "string") {
          return branchRouteIds.includes(row.routeId);
        }

        if (typeof row?.groupId === "string") {
          return branchRouteGroupIds.includes(row.groupId);
        }

        if (typeof row?.invokeStepId === "string") {
          return invokeStepIds.includes(row.invokeStepId);
        }

        if (typeof row?.agentStepId === "string") {
          return stepIds.includes(row.agentStepId);
        }

        if (typeof row?.writeItemRowId === "string") {
          return runtimeMethodologyWorkflowAgentStepWriteItemSeedRows.some(
            (writeItem) => writeItem.id === row.writeItemRowId,
          );
        }

        if (typeof row?.contextFactDefinitionId === "string") {
          return contextFactDefinitionIds.includes(row.contextFactDefinitionId);
        }

        if (typeof row?.draftSpecId === "string") {
          return draftSpecIds.includes(row.draftSpecId);
        }

        return true;
      });
      if (rows.length === 0) {
        continue;
      }

      yield* tryDb(`insert_${rowsKey}`, () => db.insert(table).values(rows)).pipe(Effect.asVoid);
    }

    for (const patch of workflowMetadataPatches) {
      yield* tryDb(`patch_${patch.workflowId}_metadata`, async () => {
        const existing = await db
          .select({ metadataJson: schema.methodologyWorkflows.metadataJson })
          .from(schema.methodologyWorkflows)
          .where(sql`${schema.methodologyWorkflows.id} = ${patch.workflowId}`)
          .limit(1);

        const currentMetadata = existing[0]?.metadataJson;
        const nextMetadata =
          currentMetadata && typeof currentMetadata === "object" && !Array.isArray(currentMetadata)
            ? { ...currentMetadata, ...patch.metadataJson }
            : { ...patch.metadataJson };

        await db
          .update(schema.methodologyWorkflows)
          .set({ metadataJson: nextMetadata })
          .where(sql`${schema.methodologyWorkflows.id} = ${patch.workflowId}`);
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

if (import.meta.main) {
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
}
