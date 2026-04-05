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
      expect(row.workflowId).toBe(SLICE_1_DEMO_FIXTURE.workflowId);
    }

    expect(
      slice1DemoFixtureSeedRows.methodologyWorkflowFormFields.map((row) => row.key).toSorted(),
    ).toEqual(["initiativeName", "projectKind"]);
    expect(slice1DemoFixtureSeedRows.methodologyWorkflowFormFields).toEqual([
      expect.objectContaining({ inputJson: { contextFactDefinitionId: "initiative_name" } }),
      expect.objectContaining({ inputJson: { contextFactDefinitionId: "workflow_mode" } }),
    ]);
  });

  it("keeps fixture-only BMAD-derived context-fact examples separate from permanent seeds", async () => {
    const { methodology, fixture } = await loadSeedArtifacts();
    const { methodologyCanonicalTableSeedRows, methodologyDesignTimeSeedFacts } = methodology;
    const { slice1FixtureOnlyFactExamples } = fixture;

    const permanentMethodologyFactKeys = new Set(
      methodologyCanonicalTableSeedRows.methodology_fact_definitions.map((row) => row.key),
    );
    const permanentWorkUnitFactKeys = new Set(
      methodologyCanonicalTableSeedRows.work_unit_fact_definitions.map((row) => row.key),
    );

    expect(slice1FixtureOnlyFactExamples.definitionBackedExternalFacts).toHaveLength(4);
    expect(slice1FixtureOnlyFactExamples.boundExternalFacts).toHaveLength(5);

    expect(
      slice1FixtureOnlyFactExamples.definitionBackedExternalFacts.map((row) => row.factKey),
    ).toEqual([...methodologyDesignTimeSeedFacts.setupWorkUnitFactDefinitionKeys]);
    expect(slice1FixtureOnlyFactExamples.boundExternalFacts.map((row) => row.factKey)).toEqual([
      ...methodologyDesignTimeSeedFacts.methodologyFactDefinitionKeys,
    ]);

    for (const example of slice1FixtureOnlyFactExamples.definitionBackedExternalFacts) {
      expect(example.seedSource).toBe("work_unit_fact_definition");
      expect(example.workflowContextFactKind).toBe("definition_backed_external_fact");
      expect(example.permanence).toBe("fixture_only");
      expect(permanentWorkUnitFactKeys.has(example.factKey)).toBe(true);
      expect(permanentMethodologyFactKeys.has(example.factKey)).toBe(false);
    }

    for (const example of slice1FixtureOnlyFactExamples.boundExternalFacts) {
      expect(example.seedSource).toBe("methodology_fact_definition");
      expect(example.workflowContextFactKind).toBe("bound_external_fact");
      expect(example.permanence).toBe("fixture_only");
      expect(permanentMethodologyFactKeys.has(example.factKey)).toBe(true);
      expect(permanentWorkUnitFactKeys.has(example.factKey)).toBe(false);
    }

    expect(
      slice1FixtureOnlyFactExamples.explicitlyExcludedFactKeys.includes("project_root_path"),
    ).toBe(true);
    expect(permanentMethodologyFactKeys.has("project_root_path")).toBe(false);
    expect(permanentWorkUnitFactKeys.has("project_root_path")).toBe(false);
  });
});
