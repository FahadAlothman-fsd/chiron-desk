import { describe, expect, it } from "vitest";

async function loadSeedArtifacts() {
  process.env.DATABASE_URL ??= "file:test.db";
  process.env.BETTER_AUTH_SECRET ??= "test-secret-for-methodology-seeds-123";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";

  const methodology = await import("../../seed/methodology");
  const fixture = await import("../../seed/methodology/setup/slice-1-demo-fixture");
  return { methodology, fixture };
}

describe("l3 slice-1 demo fixture", () => {
  it("keeps baseline canonical seeds at zero workflow steps and edges", async () => {
    const { methodology } = await loadSeedArtifacts();
    const { methodologyCanonicalTableSeedRows } = methodology;

    expect(methodologyCanonicalTableSeedRows.methodology_workflow_steps).toHaveLength(0);
    expect(methodologyCanonicalTableSeedRows.methodology_workflow_edges).toHaveLength(0);
  });

  it("seeds WU.SETUP form->form demo with exactly two steps and one edge", async () => {
    const { fixture } = await loadSeedArtifacts();
    const { SLICE_1_DEMO_FIXTURE, slice1DemoFixtureSeedRows } = fixture;

    expect(SLICE_1_DEMO_FIXTURE.workUnitTypeKey).toBe("setup");
    expect(SLICE_1_DEMO_FIXTURE.workflowKey).toBe("setup_project");

    expect(slice1DemoFixtureSeedRows.methodology_workflow_steps).toHaveLength(2);
    expect(slice1DemoFixtureSeedRows.methodology_workflow_edges).toHaveLength(1);

    const formStepRows = slice1DemoFixtureSeedRows.methodology_workflow_steps;
    for (const row of formStepRows) {
      expect(row.type).toBe("form");
    }
  });

  it("includes all 7 context-fact kinds in deterministic examples", async () => {
    const { fixture } = await loadSeedArtifacts();
    const { slice1DemoFixtureSeedRows } = fixture;

    expect(slice1DemoFixtureSeedRows.contextFactDefinitions).toHaveLength(7);
    expect(
      slice1DemoFixtureSeedRows.contextFactDefinitions.map((row) => row.factKind).toSorted(),
    ).toEqual([
      "artifact_reference",
      "draft_spec",
      "draft_spec_field",
      "external_binding",
      "plain_value",
      "work_unit_reference",
      "workflow_reference",
    ]);
  });
});
