import { describe, expect, it } from "vitest";

import { BASELINE_MANUAL_SEED_PLAN } from "../../manual-seed-fixtures";

async function loadMethodologySeedArtifacts() {
  process.env.DATABASE_URL ??= "file:test.db";
  process.env.BETTER_AUTH_SECRET ??= "test-secret-for-methodology-seeds-123";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";

  return import("../../seed/methodology");
}

describe("methodology seed integrity", () => {
  it("keeps manual seed baseline deterministic for operator journey", () => {
    expect(BASELINE_MANUAL_SEED_PLAN.planId).toBe("baseline_manual");
    expect(BASELINE_MANUAL_SEED_PLAN.users).toHaveLength(1);
    expect(BASELINE_MANUAL_SEED_PLAN.users[0]?.email).toBe("operator@chiron.local");
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyDefinitions).toHaveLength(1);
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyDefinitions[0]?.key).toBe("bmad.v1");
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyVersions).toHaveLength(1);
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyVersions[0]?.id).toBe("mver_bmad_v1_active");
  });

  it("keeps the canonical slice metadata-only until L2 implementation", async () => {
    const {
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      methodologyCanonicalTableSeedRows,
      methodologySeedSlices,
    } = await loadMethodologySeedArtifacts();

    expect(METHODOLOGY_CANONICAL_TABLE_SEED_ORDER).toContain("transition_condition_sets");
    expect(METHODOLOGY_CANONICAL_TABLE_SEED_ORDER).not.toContain(
      "methodology_transition_required_links",
    );
    expect(Object.keys(methodologySeedSlices)).toEqual(["baseline_metadata"]);
    expect(methodologySeedSlices.baseline_metadata.slice).toBe("baseline_metadata");
    expect(methodologySeedSlices.baseline_metadata.workUnitKeys).toEqual([]);
    expect(methodologySeedSlices.baseline_metadata.workflowKeys).toEqual([]);

    expect(methodologyCanonicalTableSeedRows.methodology_work_unit_types).toHaveLength(0);

    expect(methodologyCanonicalTableSeedRows.work_unit_lifecycle_states).toHaveLength(0);

    expect(methodologyCanonicalTableSeedRows.work_unit_lifecycle_transitions).toHaveLength(0);

    expect(methodologyCanonicalTableSeedRows.transition_condition_sets).toHaveLength(0);

    expect(methodologyCanonicalTableSeedRows.methodology_transition_workflow_bindings).toHaveLength(
      0,
    );
    expect(methodologyCanonicalTableSeedRows.methodology_workflows).toHaveLength(0);
    expect(methodologyCanonicalTableSeedRows.methodology_workflow_steps).toHaveLength(0);

    const factDefinitions = methodologyCanonicalTableSeedRows.methodology_fact_definitions;
    expect(factDefinitions).toHaveLength(2);
    for (const factDefinition of factDefinitions) {
      expect(factDefinition.guidanceJson).toMatchObject({
        human: { markdown: expect.any(String) },
        agent: { markdown: expect.any(String) },
      });
      expect(factDefinition.descriptionJson).toMatchObject({
        human: { markdown: expect.any(String) },
        agent: { markdown: expect.any(String) },
      });
    }
  });
});
