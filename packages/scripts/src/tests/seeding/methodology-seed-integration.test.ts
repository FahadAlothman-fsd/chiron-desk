import { describe, expect, it } from "vitest";

import { BASELINE_MANUAL_SEED_PLAN } from "../../manual-seed-fixtures";

const SEED_ARTIFACT_TIMEOUT_MS = 15_000;

async function loadMethodologySeedArtifacts() {
  process.env.DATABASE_URL ??= "file:test.db";
  process.env.BETTER_AUTH_SECRET ??= "test-secret-for-methodology-seeds-123";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";

  return import("../../seed/methodology");
}

type MethodologySeedArtifacts = Awaited<ReturnType<typeof loadMethodologySeedArtifacts>>;
type CanonicalTableName =
  MethodologySeedArtifacts["METHODOLOGY_CANONICAL_TABLE_SEED_ORDER"][number];
type CanonicalSeedRows = MethodologySeedArtifacts["methodologyCanonicalTableSeedRows"];

type CanonicalSeedState = {
  [K in CanonicalTableName]: Array<CanonicalSeedRows[K][number]>;
};

const CANONICAL_PRIMARY_KEY: Record<CanonicalTableName, "id" | "stepId"> = {
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
};

const FORBIDDEN_EXTENSION_KEYS = [
  "workUnitTypes",
  "agentTypes",
  "transitions",
  "conditionSets",
  "workUnitFacts",
  "methodologyFacts",
  "artifactSlots",
  "artifactSlotTemplates",
  "workflows",
  "workflowSteps",
  "workflowEdges",
  "transitionWorkflowBindings",
  "linkTypeDefinitions",
] as const;

const FK_TABLE_DEPENDENCIES: Record<CanonicalTableName, CanonicalTableName[]> = {
  methodology_work_unit_types: [],
  methodology_agent_types: [],
  work_unit_lifecycle_states: ["methodology_work_unit_types"],
  work_unit_lifecycle_transitions: ["methodology_work_unit_types", "work_unit_lifecycle_states"],
  transition_condition_sets: ["work_unit_lifecycle_transitions"],
  work_unit_fact_definitions: ["methodology_work_unit_types"],
  methodology_artifact_slot_definitions: ["methodology_work_unit_types"],
  methodology_artifact_slot_templates: ["methodology_artifact_slot_definitions"],
  methodology_link_type_definitions: [],
  methodology_workflows: ["methodology_work_unit_types"],
  methodology_workflow_steps: ["methodology_workflows"],
  methodology_workflow_context_fact_definitions: ["methodology_workflows"],
  methodology_workflow_context_fact_plain_values: ["methodology_workflow_context_fact_definitions"],
  methodology_workflow_context_fact_external_bindings: [
    "methodology_workflow_context_fact_definitions",
  ],
  methodology_workflow_context_fact_workflow_references: [
    "methodology_workflow_context_fact_definitions",
  ],
  methodology_workflow_context_fact_artifact_references: [
    "methodology_workflow_context_fact_definitions",
  ],
  methodology_workflow_context_fact_draft_specs: ["methodology_workflow_context_fact_definitions"],
  methodology_workflow_context_fact_draft_spec_selections: [
    "methodology_workflow_context_fact_draft_specs",
  ],
  methodology_workflow_context_fact_draft_spec_facts: [
    "methodology_workflow_context_fact_draft_specs",
  ],
  methodology_workflow_form_fields: [
    "methodology_workflow_steps",
    "methodology_workflow_context_fact_definitions",
  ],
  methodology_workflow_agent_steps: ["methodology_workflow_steps"],
  methodology_workflow_agent_step_explicit_read_grants: [
    "methodology_workflow_agent_steps",
    "methodology_workflow_context_fact_definitions",
  ],
  methodology_workflow_agent_step_write_items: [
    "methodology_workflow_agent_steps",
    "methodology_workflow_context_fact_definitions",
  ],
  methodology_workflow_agent_step_write_item_requirements: [
    "methodology_workflow_agent_step_write_items",
    "methodology_workflow_context_fact_definitions",
  ],
  methodology_workflow_action_steps: ["methodology_workflow_steps"],
  methodology_workflow_action_step_actions: [
    "methodology_workflow_action_steps",
    "methodology_workflow_context_fact_definitions",
  ],
  methodology_workflow_action_step_action_items: ["methodology_workflow_action_step_actions"],
  methodology_workflow_invoke_steps: ["methodology_workflow_steps"],
  methodology_workflow_invoke_bindings: ["methodology_workflow_invoke_steps"],
  methodology_workflow_invoke_transitions: ["methodology_workflow_invoke_steps"],
  methodology_workflow_branch_steps: ["methodology_workflow_steps"],
  methodology_workflow_branch_routes: [
    "methodology_workflow_branch_steps",
    "methodology_workflow_steps",
  ],
  methodology_workflow_branch_route_groups: ["methodology_workflow_branch_routes"],
  methodology_workflow_branch_route_conditions: [
    "methodology_workflow_branch_route_groups",
    "methodology_workflow_context_fact_definitions",
  ],
  methodology_workflow_edges: ["methodology_workflows", "methodology_workflow_steps"],
  methodology_transition_workflow_bindings: [
    "work_unit_lifecycle_transitions",
    "methodology_workflows",
  ],
  methodology_fact_definitions: [],
};

const initializeCanonicalSeedState = (seedRows: CanonicalSeedRows): CanonicalSeedState => ({
  methodology_work_unit_types: [],
  methodology_agent_types: [],
  work_unit_lifecycle_states: [],
  work_unit_lifecycle_transitions: [],
  transition_condition_sets: [],
  work_unit_fact_definitions: [],
  methodology_artifact_slot_definitions: [],
  methodology_artifact_slot_templates: [],
  methodology_link_type_definitions: [],
  methodology_workflows: [],
  methodology_workflow_steps: [],
  methodology_workflow_context_fact_definitions: [],
  methodology_workflow_context_fact_plain_values: [],
  methodology_workflow_context_fact_external_bindings: [],
  methodology_workflow_context_fact_workflow_references: [],
  methodology_workflow_context_fact_artifact_references: [],
  methodology_workflow_context_fact_draft_specs: [],
  methodology_workflow_context_fact_draft_spec_selections: [],
  methodology_workflow_context_fact_draft_spec_facts: [],
  methodology_workflow_form_fields: [],
  methodology_workflow_agent_steps: [],
  methodology_workflow_agent_step_explicit_read_grants: [],
  methodology_workflow_agent_step_write_items: [],
  methodology_workflow_agent_step_write_item_requirements: [],
  methodology_workflow_action_steps: [],
  methodology_workflow_action_step_actions: [],
  methodology_workflow_action_step_action_items: [],
  methodology_workflow_invoke_steps: [],
  methodology_workflow_invoke_bindings: [],
  methodology_workflow_invoke_transitions: [],
  methodology_workflow_branch_steps: [],
  methodology_workflow_branch_routes: [],
  methodology_workflow_branch_route_groups: [],
  methodology_workflow_branch_route_conditions: [],
  methodology_workflow_edges: [],
  methodology_transition_workflow_bindings: [],
  methodology_fact_definitions: [],
  ...Object.fromEntries(Object.keys(seedRows).map((tableName) => [tableName, []])),
});

function getRowPrimaryKey<TTableName extends CanonicalTableName>(
  tableName: TTableName,
  row: CanonicalSeedState[TTableName][number],
): string {
  const primaryKey = CANONICAL_PRIMARY_KEY[tableName];
  return row[primaryKey];
}

const stableSortRows = <TTableName extends CanonicalTableName>(
  tableName: TTableName,
  rows: CanonicalSeedState[TTableName],
) =>
  rows.toSorted((a, b) =>
    getRowPrimaryKey(tableName, a).localeCompare(getRowPrimaryKey(tableName, b)),
  );

const canonicalSnapshot = (order: readonly CanonicalTableName[], state: CanonicalSeedState) =>
  Object.fromEntries(
    order.map((tableName) => [tableName, stableSortRows(tableName, state[tableName])]),
  );

const assertNoDuplicateIds = <TTableName extends CanonicalTableName>(
  tableName: CanonicalTableName,
  rows: CanonicalSeedState[TTableName],
) => {
  const ids = rows.map((row) => getRowPrimaryKey(tableName as TTableName, row));
  expect(new Set(ids).size, `duplicate ids in ${tableName}`).toBe(ids.length);
};

const applyCanonicalUpsert = (
  order: readonly CanonicalTableName[],
  seedRows: CanonicalSeedRows,
  state: CanonicalSeedState,
): CanonicalSeedState => {
  const nextState = { ...state } as CanonicalSeedState;

  for (const tableName of order) {
    const incomingRows = seedRows[tableName];
    const incomingIds = new Set(incomingRows.map((row) => getRowPrimaryKey(tableName, row)));
    const mergedRows = [
      ...nextState[tableName].filter((row) => !incomingIds.has(getRowPrimaryKey(tableName, row))),
      ...incomingRows,
    ] as CanonicalSeedState[typeof tableName];
    assertNoDuplicateIds(tableName, mergedRows);
    nextState[tableName] = mergedRows;
  }

  return nextState;
};

describe("methodology seed integration", { timeout: SEED_ARTIFACT_TIMEOUT_MS }, () => {
  it("seeds one definition plus draft/active versions without canonical extension payload", () => {
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyDefinitions).toHaveLength(1);
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyVersions).toHaveLength(2);

    const statuses = BASELINE_MANUAL_SEED_PLAN.methodologyVersions
      .map((version) => version.status)
      .toSorted();
    expect(statuses).toEqual(["active", "draft"]);

    for (const version of BASELINE_MANUAL_SEED_PLAN.methodologyVersions) {
      const extensions = (version.definitionExtensions ?? {}) as Record<string, unknown>;
      for (const forbiddenKey of FORBIDDEN_EXTENSION_KEYS) {
        expect(extensions).not.toHaveProperty(forbiddenKey);
      }
    }
  });

  it("keeps canonical table order FK-safe for all referenced ids", async () => {
    const { METHODOLOGY_CANONICAL_TABLE_SEED_ORDER, methodologyCanonicalTableSeedRows } =
      await loadMethodologySeedArtifacts();

    const tableOrderPosition = new Map(
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER.map((tableName, index) => [tableName, index]),
    );

    for (const tableName of METHODOLOGY_CANONICAL_TABLE_SEED_ORDER) {
      for (const dependencyTable of FK_TABLE_DEPENDENCIES[tableName]) {
        expect(tableOrderPosition.get(dependencyTable)).toBeLessThan(
          tableOrderPosition.get(tableName),
        );
      }
    }

    const workUnitTypeIds = new Set(
      methodologyCanonicalTableSeedRows.methodology_work_unit_types.map((row) => row.id),
    );
    const lifecycleStateIds = new Set(
      methodologyCanonicalTableSeedRows.work_unit_lifecycle_states.map((row) => row.id),
    );
    const lifecycleTransitionIds = new Set(
      methodologyCanonicalTableSeedRows.work_unit_lifecycle_transitions.map((row) => row.id),
    );
    const workflowIds = new Set(
      methodologyCanonicalTableSeedRows.methodology_workflows.map((row) => row.id),
    );
    const slotDefinitionIds = new Set(
      methodologyCanonicalTableSeedRows.methodology_artifact_slot_definitions.map((row) => row.id),
    );

    for (const row of methodologyCanonicalTableSeedRows.work_unit_lifecycle_states) {
      expect(workUnitTypeIds.has(row.workUnitTypeId)).toBe(true);
    }

    for (const row of methodologyCanonicalTableSeedRows.work_unit_lifecycle_transitions) {
      expect(workUnitTypeIds.has(row.workUnitTypeId)).toBe(true);
      if (row.fromStateId) {
        expect(lifecycleStateIds.has(row.fromStateId)).toBe(true);
      }
      if (row.toStateId) {
        expect(lifecycleStateIds.has(row.toStateId)).toBe(true);
      }
    }

    for (const row of methodologyCanonicalTableSeedRows.transition_condition_sets) {
      expect(lifecycleTransitionIds.has(row.transitionId)).toBe(true);
    }

    for (const row of methodologyCanonicalTableSeedRows.work_unit_fact_definitions) {
      expect(workUnitTypeIds.has(row.workUnitTypeId)).toBe(true);
    }

    for (const row of methodologyCanonicalTableSeedRows.methodology_artifact_slot_definitions) {
      expect(workUnitTypeIds.has(row.workUnitTypeId)).toBe(true);
    }

    for (const row of methodologyCanonicalTableSeedRows.methodology_artifact_slot_templates) {
      expect(slotDefinitionIds.has(row.slotDefinitionId)).toBe(true);
    }

    for (const row of methodologyCanonicalTableSeedRows.methodology_workflows) {
      if (row.workUnitTypeId) {
        expect(workUnitTypeIds.has(row.workUnitTypeId)).toBe(true);
      }
    }

    for (const row of methodologyCanonicalTableSeedRows.methodology_transition_workflow_bindings) {
      expect(lifecycleTransitionIds.has(row.transitionId)).toBe(true);
      expect(workflowIds.has(row.workflowId)).toBe(true);
    }
  });

  it("applies deterministic upsert semantics for canonical table rows", async () => {
    const { METHODOLOGY_CANONICAL_TABLE_SEED_ORDER, methodologyCanonicalTableSeedRows } =
      await loadMethodologySeedArtifacts();

    const firstSeededState = applyCanonicalUpsert(
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      methodologyCanonicalTableSeedRows,
      initializeCanonicalSeedState(methodologyCanonicalTableSeedRows),
    );
    const firstSnapshot = canonicalSnapshot(
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      firstSeededState,
    );

    const driftedState: CanonicalSeedState = {
      ...firstSeededState,
      methodology_workflows: [
        ...firstSeededState.methodology_workflows,
        {
          id: "seed:workflow:drifted:should-be-cleared:mver_bmad_v1_draft",
          methodologyVersionId: "mver_bmad_v1_draft",
          workUnitTypeId: "seed:wut:setup:mver_bmad_v1_draft",
          key: "drifted_should_be_cleared",
          displayName: "Drifted workflow",
          descriptionJson: { markdown: "drift" },
          guidanceJson: { human: { markdown: "drift" }, agent: { markdown: "drift" } },
          metadataJson: { family: "setup", bound_by_default: false },
          createdAt: null,
          updatedAt: null,
        },
      ],
    };

    const reseededState = applyCanonicalUpsert(
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      methodologyCanonicalTableSeedRows,
      driftedState,
    );
    const reseededSnapshot = canonicalSnapshot(
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      reseededState,
    );

    expect(reseededSnapshot).toEqual({
      ...firstSnapshot,
      methodology_workflows: stableSortRows("methodology_workflows", [
        ...firstSnapshot.methodology_workflows,
        driftedState.methodology_workflows.at(-1)!,
      ]),
    });

    const reseededAgainState = applyCanonicalUpsert(
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      methodologyCanonicalTableSeedRows,
      reseededState,
    );
    expect(canonicalSnapshot(METHODOLOGY_CANONICAL_TABLE_SEED_ORDER, reseededAgainState)).toEqual(
      reseededSnapshot,
    );
  });

  it("seeds authored workflow rows for Section A editor surfaces", async () => {
    const { methodologyCanonicalTableSeedRows } = await loadMethodologySeedArtifacts();

    expect(methodologyCanonicalTableSeedRows.methodology_workflow_steps.length).toBeGreaterThan(0);
    expect(
      methodologyCanonicalTableSeedRows.methodology_workflow_context_fact_definitions.length,
    ).toBeGreaterThan(0);
    expect(methodologyCanonicalTableSeedRows.methodology_workflow_edges.length).toBeGreaterThan(0);

    const activeSetupWorkflow = methodologyCanonicalTableSeedRows.methodology_workflows.find(
      (row) => row.methodologyVersionId === "mver_bmad_v1_active" && row.key === "setup_project",
    );
    const activePrdWorkflow = methodologyCanonicalTableSeedRows.methodology_workflows.find(
      (row) => row.methodologyVersionId === "mver_bmad_v1_active" && row.key === "create_prd",
    );

    expect(activeSetupWorkflow?.metadataJson).toMatchObject({
      entryStepId:
        "seed:section-a:setup:setup-project:mver_bmad_v1_active:step:collect_setup_baseline",
    });
    expect(activePrdWorkflow?.metadataJson).toMatchObject({
      entryStepId:
        "seed:section-a:prd:create-prd:mver_bmad_v1_active:step:prd_input_initialization_agent",
    });
  });
});
