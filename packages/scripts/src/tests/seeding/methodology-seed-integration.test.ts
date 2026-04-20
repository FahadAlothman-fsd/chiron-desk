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
  methodology_workflow_edges: [],
  methodology_transition_workflow_bindings: [],
  methodology_fact_definitions: [],
  ...Object.fromEntries(Object.keys(seedRows).map((tableName) => [tableName, []])),
});

const stableSortRows = <TRow extends { id: string }>(rows: TRow[]) =>
  rows.toSorted((a, b) => a.id.localeCompare(b.id));

const canonicalSnapshot = (order: readonly CanonicalTableName[], state: CanonicalSeedState) =>
  Object.fromEntries(
    order.map((tableName) => [
      tableName,
      stableSortRows(state[tableName] as Array<{ id: string }>),
    ]),
  );

const assertNoDuplicateIds = <TRow extends { id: string }>(
  tableName: CanonicalTableName,
  rows: TRow[],
) => {
  const ids = rows.map((row) => row.id);
  expect(new Set(ids).size, `duplicate ids in ${tableName}`).toBe(ids.length);
};

const applyCanonicalReseed = (
  order: readonly CanonicalTableName[],
  seedRows: CanonicalSeedRows,
  state: CanonicalSeedState,
  versionIds: Set<string>,
): CanonicalSeedState => {
  const nextState = { ...state } as CanonicalSeedState;

  for (const tableName of [...order].reverse()) {
    nextState[tableName] = nextState[tableName].filter(
      (row) => !versionIds.has(row.methodologyVersionId),
    ) as CanonicalSeedState[typeof tableName];
  }

  for (const tableName of order) {
    const incomingRows = seedRows[tableName].filter((row) =>
      versionIds.has(row.methodologyVersionId),
    );
    const mergedRows = [
      ...nextState[tableName],
      ...incomingRows,
    ] as CanonicalSeedState[typeof tableName];
    assertNoDuplicateIds(tableName, mergedRows as Array<{ id: string }>);
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

  it("applies deterministic reseed semantics for canonical table rows", async () => {
    const { METHODOLOGY_CANONICAL_TABLE_SEED_ORDER, methodologyCanonicalTableSeedRows } =
      await loadMethodologySeedArtifacts();

    const versionIds = new Set(
      BASELINE_MANUAL_SEED_PLAN.methodologyVersions.map((version) => version.id),
    );

    const firstSeededState = applyCanonicalReseed(
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      methodologyCanonicalTableSeedRows,
      initializeCanonicalSeedState(methodologyCanonicalTableSeedRows),
      versionIds,
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

    const reseededState = applyCanonicalReseed(
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      methodologyCanonicalTableSeedRows,
      driftedState,
      versionIds,
    );
    const reseededSnapshot = canonicalSnapshot(
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      reseededState,
    );

    expect(reseededSnapshot).toEqual(firstSnapshot);

    const reseededAgainState = applyCanonicalReseed(
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      methodologyCanonicalTableSeedRows,
      reseededState,
      versionIds,
    );
    expect(canonicalSnapshot(METHODOLOGY_CANONICAL_TABLE_SEED_ORDER, reseededAgainState)).toEqual(
      firstSnapshot,
    );
  });

  it("remains L1/L2-only with no seeded workflow step or edge rows", async () => {
    const { methodologyCanonicalTableSeedRows } = await loadMethodologySeedArtifacts();

    expect(methodologyCanonicalTableSeedRows.methodology_workflow_steps).toEqual([]);
    expect(methodologyCanonicalTableSeedRows.methodology_workflow_edges).toEqual([]);
  });
});
