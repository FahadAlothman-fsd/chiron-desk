import { db as defaultDb, schema } from "@chiron/db";
import { eq, inArray, sql } from "drizzle-orm";

import {
  BASELINE_MANUAL_SEED_PLAN,
  type ManualSeedMethodologyDefinition,
  type ManualSeedMethodologyVersion,
} from "../../manual-seed-fixtures";
import {
  METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
  methodologyCanonicalTableSeedRows,
} from "./authority";

const CANONICAL_BMAD_DEFINITION = BASELINE_MANUAL_SEED_PLAN.methodologyDefinitions[0];
const CANONICAL_BMAD_VERSIONS = BASELINE_MANUAL_SEED_PLAN.methodologyVersions;

if (!CANONICAL_BMAD_DEFINITION || CANONICAL_BMAD_VERSIONS.length === 0) {
  throw new Error("Canonical BMAD seed plan is missing required methodology rows");
}

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
  methodology_workflow_context_fact_definitions: schema.methodologyWorkflowContextFactDefinitions,
  methodology_workflow_context_fact_plain_values: schema.methodologyWorkflowContextFactPlainValues,
  methodology_workflow_context_fact_external_bindings:
    schema.methodologyWorkflowContextFactExternalBindings,
  methodology_workflow_context_fact_workflow_references:
    schema.methodologyWorkflowContextFactWorkflowReferences,
  methodology_workflow_context_fact_artifact_references:
    schema.methodologyWorkflowContextFactArtifactReferences,
  methodology_workflow_context_fact_draft_specs: schema.methodologyWorkflowContextFactDraftSpecs,
  methodology_workflow_context_fact_draft_spec_selections:
    schema.methodologyWorkflowContextFactDraftSpecSelections,
  methodology_workflow_context_fact_draft_spec_facts:
    schema.methodologyWorkflowContextFactDraftSpecFields,
  methodology_workflow_form_fields: schema.methodologyWorkflowFormFields,
  methodology_workflow_agent_steps: schema.methodologyWorkflowAgentSteps,
  methodology_workflow_agent_step_explicit_read_grants:
    schema.methodologyWorkflowAgentStepExplicitReadGrants,
  methodology_workflow_agent_step_write_items: schema.methodologyWorkflowAgentStepWriteItems,
  methodology_workflow_agent_step_write_item_requirements:
    schema.methodologyWorkflowAgentStepWriteItemRequirements,
  methodology_workflow_action_steps: schema.methodologyWorkflowActionSteps,
  methodology_workflow_action_step_actions: schema.methodologyWorkflowActionStepActions,
  methodology_workflow_action_step_action_items: schema.methodologyWorkflowActionStepActionItems,
  methodology_workflow_invoke_steps: schema.methodologyWorkflowInvokeSteps,
  methodology_workflow_invoke_bindings: schema.methodologyWorkflowInvokeBindings,
  methodology_workflow_invoke_transitions: schema.methodologyWorkflowInvokeTransitions,
  methodology_workflow_branch_steps: schema.methodologyWorkflowBranchSteps,
  methodology_workflow_branch_routes: schema.methodologyWorkflowBranchRoutes,
  methodology_workflow_branch_route_groups: schema.methodologyWorkflowBranchRouteGroups,
  methodology_workflow_branch_route_conditions: schema.methodologyWorkflowBranchRouteConditions,
  methodology_workflow_edges: schema.methodologyWorkflowEdges,
  methodology_transition_workflow_bindings: schema.methodologyTransitionWorkflowBindings,
  methodology_fact_definitions: schema.methodologyFactDefinitions,
} as const;

const TABLE_PRIMARY_KEY_COLUMNS = {
  methodology_work_unit_types: "id",
  methodology_agent_types: "id",
  work_unit_lifecycle_states: "id",
  work_unit_lifecycle_transitions: "id",
  transition_condition_sets: "id",
  work_unit_fact_definitions: "id",
  methodology_artifact_slot_definitions: "id",
  methodology_artifact_slot_templates: "id",
  methodology_link_type_definitions: "id",
  methodology_workflows: "id",
  methodology_workflow_steps: "id",
  methodology_workflow_context_fact_definitions: "id",
  methodology_workflow_context_fact_plain_values: "id",
  methodology_workflow_context_fact_external_bindings: "id",
  methodology_workflow_context_fact_workflow_references: "id",
  methodology_workflow_context_fact_artifact_references: "id",
  methodology_workflow_context_fact_draft_specs: "id",
  methodology_workflow_context_fact_draft_spec_selections: "id",
  methodology_workflow_context_fact_draft_spec_facts: "id",
  methodology_workflow_form_fields: "id",
  methodology_workflow_agent_steps: "stepId",
  methodology_workflow_agent_step_explicit_read_grants: "id",
  methodology_workflow_agent_step_write_items: "id",
  methodology_workflow_agent_step_write_item_requirements: "id",
  methodology_workflow_action_steps: "stepId",
  methodology_workflow_action_step_actions: "id",
  methodology_workflow_action_step_action_items: "id",
  methodology_workflow_invoke_steps: "stepId",
  methodology_workflow_invoke_bindings: "id",
  methodology_workflow_invoke_transitions: "id",
  methodology_workflow_branch_steps: "stepId",
  methodology_workflow_branch_routes: "id",
  methodology_workflow_branch_route_groups: "id",
  methodology_workflow_branch_route_conditions: "id",
  methodology_workflow_edges: "id",
  methodology_transition_workflow_bindings: "id",
  methodology_fact_definitions: "id",
} as const;

type Database = typeof defaultDb;
type CanonicalTableName = (typeof METHODOLOGY_CANONICAL_TABLE_SEED_ORDER)[number];
type CanonicalSeedRows = typeof methodologyCanonicalTableSeedRows;
type ExistingMethodologyVersion = Pick<
  typeof schema.methodologyVersions.$inferSelect,
  "id" | "methodologyId" | "version"
>;
type CanonicalPrimaryKeyName<TName extends CanonicalTableName> =
  (typeof TABLE_PRIMARY_KEY_COLUMNS)[TName];
type CanonicalRow<TName extends CanonicalTableName> =
  CanonicalBmadSeedPayload["canonicalRows"][TName][number];

export type CanonicalBmadSeedPayload = {
  readonly definition: ManualSeedMethodologyDefinition;
  readonly versions: readonly ManualSeedMethodologyVersion[];
  readonly reseedVersionIds: readonly string[];
  readonly canonicalRows: {
    readonly [K in CanonicalTableName]: ReadonlyArray<CanonicalSeedRows[K][number]>;
  };
};

export type CanonicalBmadSeedResult = {
  readonly methodologyKey: string;
  readonly methodologyId: string;
  readonly displayName: string;
  readonly versionIds: readonly string[];
  readonly versionCount: number;
  readonly clearedTableCount: number;
  readonly seededTableCount: number;
  readonly insertedCanonicalRowCount: number;
};

export const CANONICAL_BMAD_METHODOLOGY_KEY = CANONICAL_BMAD_DEFINITION.key;

function buildSeedRowsForResolvedVersions(versionIdMap: ReadonlyMap<string, string>) {
  return Object.fromEntries(
    METHODOLOGY_CANONICAL_TABLE_SEED_ORDER.map((tableName) => [
      tableName,
      methodologyCanonicalTableSeedRows[tableName].map((row) => {
        if (
          "methodologyVersionId" in row &&
          typeof row.methodologyVersionId === "string" &&
          row.methodologyVersionId.length > 0
        ) {
          return {
            ...row,
            methodologyVersionId:
              versionIdMap.get(row.methodologyVersionId) ?? row.methodologyVersionId,
          };
        }

        return row;
      }),
    ]),
  ) as CanonicalBmadSeedPayload["canonicalRows"];
}

function omitPrimaryKey<TRow extends Record<string, unknown>, TKey extends keyof TRow>(
  row: TRow,
  key: TKey,
) {
  const { [key]: _omitted, ...rest } = row;
  return rest;
}

async function upsertCanonicalRowsForTable<TName extends CanonicalTableName>(
  tx: Parameters<Database["transaction"]>[0] extends (arg: infer T) => unknown ? T : never,
  tableName: TName,
  rows: ReadonlyArray<CanonicalRow<TName>>,
) {
  const table = CANONICAL_TABLES[tableName];
  const primaryKey = TABLE_PRIMARY_KEY_COLUMNS[tableName] as CanonicalPrimaryKeyName<TName>;

  for (const row of rows) {
    await tx
      .insert(table)
      .values(row)
      .onConflictDoUpdate({
        target: table[primaryKey],
        set: omitPrimaryKey(row, primaryKey),
      });
  }
}

async function resyncContextFactSubtypeRows(
  tx: Parameters<Database["transaction"]>[0] extends (arg: infer T) => unknown ? T : never,
  payload: CanonicalBmadSeedPayload,
) {
  const contextFactIds = payload.canonicalRows.methodology_workflow_context_fact_definitions.map(
    (row) => row.id,
  );

  if (contextFactIds.length === 0) {
    return;
  }

  const draftSpecRows = await tx
    .select({ id: schema.methodologyWorkflowContextFactDraftSpecs.id })
    .from(schema.methodologyWorkflowContextFactDraftSpecs)
    .where(
      inArray(
        schema.methodologyWorkflowContextFactDraftSpecs.contextFactDefinitionId,
        contextFactIds,
      ),
    );

  if (draftSpecRows.length > 0) {
    await tx.delete(schema.methodologyWorkflowContextFactDraftSpecSelections).where(
      inArray(
        schema.methodologyWorkflowContextFactDraftSpecSelections.draftSpecId,
        draftSpecRows.map((row) => row.id),
      ),
    );
    await tx.delete(schema.methodologyWorkflowContextFactDraftSpecFields).where(
      inArray(
        schema.methodologyWorkflowContextFactDraftSpecFields.draftSpecId,
        draftSpecRows.map((row) => row.id),
      ),
    );
  }

  await tx
    .delete(schema.methodologyWorkflowContextFactDraftSpecs)
    .where(
      inArray(
        schema.methodologyWorkflowContextFactDraftSpecs.contextFactDefinitionId,
        contextFactIds,
      ),
    );
  await tx
    .delete(schema.methodologyWorkflowContextFactPlainValues)
    .where(
      inArray(
        schema.methodologyWorkflowContextFactPlainValues.contextFactDefinitionId,
        contextFactIds,
      ),
    );
  await tx
    .delete(schema.methodologyWorkflowContextFactExternalBindings)
    .where(
      inArray(
        schema.methodologyWorkflowContextFactExternalBindings.contextFactDefinitionId,
        contextFactIds,
      ),
    );
  await tx
    .delete(schema.methodologyWorkflowContextFactWorkflowReferences)
    .where(
      inArray(
        schema.methodologyWorkflowContextFactWorkflowReferences.contextFactDefinitionId,
        contextFactIds,
      ),
    );
  await tx
    .delete(schema.methodologyWorkflowContextFactArtifactReferences)
    .where(
      inArray(
        schema.methodologyWorkflowContextFactArtifactReferences.contextFactDefinitionId,
        contextFactIds,
      ),
    );
}

export function buildCanonicalBmadSeedPayload(options?: {
  readonly existingDefinitionId?: string | null;
  readonly existingVersions?: readonly ExistingMethodologyVersion[];
}): CanonicalBmadSeedPayload {
  const methodologyId = options?.existingDefinitionId ?? CANONICAL_BMAD_DEFINITION.id;
  const existingVersionsByTag = new Map(
    (options?.existingVersions ?? []).map((version) => [version.version, version]),
  );

  const versions = CANONICAL_BMAD_VERSIONS.map((version) => ({
    ...version,
    id: existingVersionsByTag.get(version.version)?.id ?? version.id,
    methodologyId,
  }));

  const versionIdMap = new Map(
    CANONICAL_BMAD_VERSIONS.map((version, index) => [
      version.id,
      versions[index]?.id ?? version.id,
    ]),
  );

  return {
    definition: {
      ...CANONICAL_BMAD_DEFINITION,
      id: methodologyId,
    },
    versions,
    reseedVersionIds: [...new Set([...versionIdMap.keys(), ...versionIdMap.values()])],
    canonicalRows: buildSeedRowsForResolvedVersions(versionIdMap),
  };
}

export async function seedCanonicalBmadMethodology(database: Database = defaultDb) {
  return database.transaction(async (tx) => {
    const existingDefinition = await tx
      .select({ id: schema.methodologyDefinitions.id })
      .from(schema.methodologyDefinitions)
      .where(eq(schema.methodologyDefinitions.key, CANONICAL_BMAD_METHODOLOGY_KEY))
      .limit(1);

    const methodologyId = existingDefinition[0]?.id ?? null;
    const existingVersions = methodologyId
      ? await tx
          .select({
            id: schema.methodologyVersions.id,
            methodologyId: schema.methodologyVersions.methodologyId,
            version: schema.methodologyVersions.version,
          })
          .from(schema.methodologyVersions)
          .where(eq(schema.methodologyVersions.methodologyId, methodologyId))
      : [];

    const payload = buildCanonicalBmadSeedPayload({
      existingDefinitionId: methodologyId,
      existingVersions,
    });

    await tx
      .insert(schema.methodologyDefinitions)
      .values(payload.definition)
      .onConflictDoUpdate({
        target: schema.methodologyDefinitions.key,
        set: {
          name: sql`excluded.name`,
          descriptionJson: sql`excluded.description_json`,
          archivedAt: null,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      });

    await tx
      .insert(schema.methodologyVersions)
      .values(
        payload.versions.map((version) => ({
          ...version,
          definitionExtensions: {},
        })),
      )
      .onConflictDoUpdate({
        target: [schema.methodologyVersions.methodologyId, schema.methodologyVersions.version],
        set: {
          status: sql`excluded.status`,
          displayName: sql`excluded.display_name`,
          definitionExtensions: sql`excluded.definition_extensions_json`,
          retiredAt: sql`excluded.retired_at`,
        },
      });

    await resyncContextFactSubtypeRows(tx, payload);

    let seededTableCount = 0;
    let insertedCanonicalRowCount = 0;

    for (const tableName of METHODOLOGY_CANONICAL_TABLE_SEED_ORDER) {
      const rows = payload.canonicalRows[tableName];
      if (rows.length === 0) {
        continue;
      }

      await upsertCanonicalRowsForTable(tx, tableName, rows);
      seededTableCount += 1;
      insertedCanonicalRowCount += rows.length;
    }

    const result: CanonicalBmadSeedResult = {
      methodologyKey: payload.definition.key,
      methodologyId: payload.definition.id,
      displayName: payload.definition.name,
      versionIds: payload.versions.map((version) => version.id),
      versionCount: payload.versions.length,
      clearedTableCount: 0,
      seededTableCount,
      insertedCanonicalRowCount,
    };

    return result;
  });
}
