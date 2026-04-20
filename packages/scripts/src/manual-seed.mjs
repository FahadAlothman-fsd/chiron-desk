import { reset as drizzleReset } from "drizzle-seed";
import { inArray, sql } from "drizzle-orm";
import { Console, Effect } from "effect";
import { inspect } from "node:util";

import { auth } from "@chiron/auth";
import { db, schema } from "@chiron/db";
import {
  METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
  methodologyCanonicalTableSeedRows,
} from "./seed/methodology/index.ts";
import { SeedLogger, joinSummary, pluralize } from "./seed/seed-logger.ts";
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
    return Effect.succeed(0);
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
  ).pipe(Effect.as(plan.methodologyDefinitions.length));
};

const upsertMethodologyVersions = (plan) => {
  if (plan.methodologyVersions.length === 0) {
    return Effect.succeed(0);
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
          definitionExtensions: {},
          retiredAt: sql`excluded.retired_at`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      }),
  ).pipe(Effect.as(plan.methodologyVersions.length));
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
    let clearedTables = 0;
    let seededTables = 0;
    let insertedRows = 0;

    yield* Effect.forEach(
      [...METHODOLOGY_CANONICAL_TABLE_SEED_ORDER].reverse(),
      (tableName) =>
        tryDb(`clear_${tableName}`, () => {
          const table = CANONICAL_TABLES[tableName];
          return db.delete(table).where(inArray(table.methodologyVersionId, versionIds));
        }).pipe(
          Effect.tap(() => {
            clearedTables += 1;
            return SeedLogger.tableCleared(tableName);
          }),
          Effect.asVoid,
        ),
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

        return Effect.forEach(
          rows,
          (row, index) =>
            tryDb(`insert_${tableName}_${index}`, () => db.insert(table).values(row)).pipe(
              Effect.asVoid,
            ),
          { discard: true },
        ).pipe(
          Effect.tap(() => {
            seededTables += 1;
            insertedRows += rows.length;
            return SeedLogger.tableSeeded(tableName, rows.length);
          }),
        );
      },
      { discard: true },
    );

    return {
      clearedTables,
      seededTables,
      insertedRows,
    };
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
    let fixtureTablesSeeded = 0;
    let fixtureRowsInserted = 0;
    let workflowMetadataPatched = 0;

    if (workflowMetadataPatches.length === 0) {
      return {
        fixtureTablesSeeded,
        fixtureRowsInserted,
        workflowMetadataPatched,
      };
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

      yield* Effect.forEach(
        rows,
        (row, index) =>
          tryDb(`insert_${rowsKey}_${index}`, () => db.insert(table).values(row)).pipe(Effect.asVoid),
        { discard: true },
      );
      fixtureTablesSeeded += 1;
      fixtureRowsInserted += rows.length;
      yield* SeedLogger.fixtureSeeded(rowsKey, rows.length);
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
      workflowMetadataPatched += 1;
      yield* SeedLogger.metadataPatched(patch.workflowId);
    }

    return {
      fixtureTablesSeeded,
      fixtureRowsInserted,
      workflowMetadataPatched,
    };
  });

const seedUsers = (plan) =>
  Effect.gen(function* () {
    if (plan.users.length === 0) {
      return { created: 0, skipped: 0 };
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
    let created = 0;
    let skipped = 0;

    yield* Effect.forEach(
      plan.users,
      (seededUser) => {
        if (existingEmails.has(seededUser.email.toLowerCase())) {
          skipped += 1;
          return SeedLogger.userSkipped(seededUser.email);
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

            created += 1;
            return SeedLogger.userCreated(seededUser.email);
          }),
        );
      },
      { discard: true },
    );

    return { created, skipped };
  });

if (import.meta.main) {
  const options = parseArgs(process.argv.slice(2));
  const seedStartedAt = Date.now();
  const dotenvPath = process.env.DOTENV_CONFIG_PATH;

  const program = Effect.gen(function* () {
    const plan = BASELINE_MANUAL_SEED_PLAN;

    yield* SeedLogger.banner({
      reset: options.reset,
      dotenvPath,
      planName: "Manual baseline seed",
    });
    yield* SeedLogger.planSummary({
      methodologyDefinitions: plan.methodologyDefinitions.length,
      methodologyVersions: plan.methodologyVersions.length,
      users: plan.users.length,
      canonicalTables: METHODOLOGY_CANONICAL_TABLE_SEED_ORDER.length,
      runtimeFixtureTables: RUNTIME_FIXTURE_TABLE_INSERTIONS.length,
    });

    if (options.reset) {
      const resetPhase = yield* SeedLogger.phaseStart("Reset database", "drizzle-seed reset");
      yield* Effect.tryPromise({
        try: () => drizzleReset(db, schema),
        catch: (cause) => manualSeedDbError("reset_database", cause),
      });
      yield* SeedLogger.phaseDone(resetPhase, "database reset complete");
    }

    const methodologyDefinitionsPhase = yield* SeedLogger.phaseStart(
      "Upsert methodology definitions",
    );
    const methodologyDefinitions = yield* upsertMethodologyDefinitions(plan);
    yield* SeedLogger.phaseDone(
      methodologyDefinitionsPhase,
      pluralize(methodologyDefinitions, "definition"),
    );

    const methodologyVersionsPhase = yield* SeedLogger.phaseStart("Upsert methodology versions");
    const methodologyVersions = yield* upsertMethodologyVersions(plan);
    yield* SeedLogger.phaseDone(
      methodologyVersionsPhase,
      pluralize(methodologyVersions, "version"),
    );

    const canonicalPhase = yield* SeedLogger.phaseStart(
      "Seed canonical methodology tables",
      `${METHODOLOGY_CANONICAL_TABLE_SEED_ORDER.length} tables`,
    );
    const canonicalSummary = yield* seedCanonicalMethodologyTables(plan);
    yield* SeedLogger.phaseDone(
      canonicalPhase,
      joinSummary([
        pluralize(canonicalSummary.clearedTables, "table cleared", "tables cleared"),
        pluralize(canonicalSummary.seededTables, "table seeded", "tables seeded"),
        pluralize(canonicalSummary.insertedRows, "row"),
      ]),
    );

    const fixturesPhase = yield* SeedLogger.phaseStart(
      "Seed runtime workflow fixtures",
      `${RUNTIME_FIXTURE_TABLE_INSERTIONS.length} fixture tables`,
    );
    const runtimeFixtureSummary = yield* seedRuntimeWorkflowFixtures(plan);
    yield* SeedLogger.phaseDone(
      fixturesPhase,
      joinSummary([
        pluralize(runtimeFixtureSummary.fixtureTablesSeeded, "fixture table"),
        pluralize(runtimeFixtureSummary.fixtureRowsInserted, "fixture row"),
        pluralize(runtimeFixtureSummary.workflowMetadataPatched, "metadata patch", "metadata patches"),
      ]),
    );

    const usersPhase = yield* SeedLogger.phaseStart(
      "Create seed users",
      pluralize(plan.users.length, "user"),
    );
    const userSummary = yield* seedUsers(plan);
    yield* SeedLogger.phaseDone(
      usersPhase,
      joinSummary([
        pluralize(userSummary.created, "created user", "created users"),
        userSummary.skipped > 0
          ? pluralize(userSummary.skipped, "existing user skipped", "existing users skipped")
          : null,
      ]),
    );

    yield* SeedLogger.summary(
      {
        resetApplied: options.reset,
        methodologyDefinitions,
        methodologyVersions,
        canonicalTablesCleared: canonicalSummary.clearedTables,
        canonicalTablesSeeded: canonicalSummary.seededTables,
        canonicalRowsInserted: canonicalSummary.insertedRows,
        runtimeFixtureTablesSeeded: runtimeFixtureSummary.fixtureTablesSeeded,
        runtimeFixtureRowsInserted: runtimeFixtureSummary.fixtureRowsInserted,
        workflowMetadataPatched: runtimeFixtureSummary.workflowMetadataPatched,
        usersCreated: userSummary.created,
        usersSkipped: userSummary.skipped,
      },
      seedStartedAt,
      plan.users.length > 0
        ? `${plan.users[0].email} / ${plan.users[0].password}${
            options.reset ? " (deterministic with --reset)" : ""
          }`
        : undefined,
    );
  }).pipe(
    Effect.as(0),
    Effect.catchAll((error) => {
      const errorType = classifySeedError(error);

      if (errorType === "missing_tables") {
        return SeedLogger.missingSchema().pipe(Effect.as(1));
      }

      if (shouldSkipSeedError(error, options.reset)) {
        return SeedLogger.alreadySeeded().pipe(Effect.as(0));
      }

      const nestedCause =
        error && typeof error === "object" && "cause" in error ? error.cause : undefined;
      const nestedCauseMessage =
        nestedCause && typeof nestedCause === "object" && "message" in nestedCause
          ? nestedCause.message
          : undefined;
      const nestedNestedCause =
        nestedCause && typeof nestedCause === "object" && "cause" in nestedCause
          ? nestedCause.cause
          : undefined;
      const nestedNestedCauseMessage =
        nestedNestedCause && typeof nestedNestedCause === "object" && "message" in nestedNestedCause
          ? nestedNestedCause.message
          : undefined;

      return SeedLogger.unexpectedError(
        [
          `Manual seed failed with an unexpected error: ${inspect(error, { depth: 8, colors: false })}`,
          nestedCauseMessage ? `cause.message: ${nestedCauseMessage}` : null,
          nestedNestedCauseMessage ? `cause.cause.message: ${nestedNestedCauseMessage}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      ).pipe(
        Effect.as(1),
      );
    }),
  );

  const exitCode = await Effect.runPromise(program);
  process.exit(exitCode);
}
