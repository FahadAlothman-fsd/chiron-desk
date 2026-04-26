import { describe, expect, it } from "vitest";

const SEED_ARTIFACT_TIMEOUT_MS = 15_000;

async function loadSeedArtifacts() {
  process.env.DATABASE_URL ??= "file:test.db";
  process.env.BETTER_AUTH_SECRET ??= "test-secret-for-methodology-seeds-123";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";

  const methodology = await import("../../seed/methodology");
  const fixture = await import("../../seed/methodology/setup/slice-1-demo-fixture");
  return { methodology, fixture };
}

describe("l3 slice-1 demo fixture", { timeout: SEED_ARTIFACT_TIMEOUT_MS }, () => {
  it("keeps baseline canonical seeds authored for Section A workflows", async () => {
    const { methodology } = await loadSeedArtifacts();
    const { methodologyCanonicalTableSeedRows } = methodology;

    expect(methodologyCanonicalTableSeedRows.methodology_workflow_steps.length).toBeGreaterThan(0);
    expect(methodologyCanonicalTableSeedRows.methodology_workflow_edges.length).toBeGreaterThan(0);
  });

  it("seeds WU.SETUP form->form->agent demo with deterministic runtime handoff shape", async () => {
    const { fixture } = await loadSeedArtifacts();
    const { SLICE_1_DEMO_FIXTURE, slice1DemoFixtureSeedRows } = fixture;

    expect(SLICE_1_DEMO_FIXTURE.workUnitTypeKey).toBe("setup");
    expect(SLICE_1_DEMO_FIXTURE.workflowKey).toBe("setup_project");

    expect(slice1DemoFixtureSeedRows.methodology_workflow_steps).toHaveLength(2);
    expect(slice1DemoFixtureSeedRows.methodology_workflow_edges).toHaveLength(1);

    const formStepRows = slice1DemoFixtureSeedRows.methodology_workflow_steps.filter(
      (row) => row.type === "form",
    );
    expect(formStepRows).toHaveLength(1);
    for (const row of formStepRows) {
      expect(row.type).toBe("form");
      expect(row.workflowId).toBe(SLICE_1_DEMO_FIXTURE.workflowId);
      expect(row.guidanceJson).toMatchObject({
        human: { markdown: expect.any(String) },
        agent: { markdown: expect.any(String) },
      });
    }

    const agentStepRows = slice1DemoFixtureSeedRows.methodology_workflow_steps.filter(
      (row) => row.type === "agent",
    );
    expect(agentStepRows).toHaveLength(1);
    expect(agentStepRows[0]).toMatchObject({
      key: "synthesize_setup_handoff",
      displayName: "Synthesize Setup Handoff",
    });

    expect(slice1DemoFixtureSeedRows.workflowMetadataPatch).toEqual({
      workflowId: SLICE_1_DEMO_FIXTURE.workflowId,
      metadataJson: {
        entryStepId: "seed:l3-slice-1:setup-project:mver_bmad_v1_active:step:collect-setup",
      },
    });

    expect(slice1DemoFixtureSeedRows.methodologyWorkflowContextFactDefinitions).toHaveLength(5);
    for (const fact of slice1DemoFixtureSeedRows.methodologyWorkflowContextFactDefinitions) {
      expect(fact.workflowId).toBe(SLICE_1_DEMO_FIXTURE.workflowId);
      expect(fact.guidanceJson).toMatchObject({
        human: { markdown: expect.any(String) },
        agent: { markdown: expect.any(String) },
      });
    }

    expect(
      slice1DemoFixtureSeedRows.methodologyWorkflowFormFields
        .map((row) => row.key)
        .slice()
        .sort(),
    ).toEqual(["projectType"]);
    expect(slice1DemoFixtureSeedRows.methodologyWorkflowFormFields).toEqual([
      expect.objectContaining({
        inputJson: {
          contextFactDefinitionId:
            "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:project-type",
        },
      }),
    ]);

    expect(slice1DemoFixtureSeedRows.methodologyWorkflowContextFactDraftSpecFacts).toEqual([]);

    expect(slice1DemoFixtureSeedRows.methodologyWorkflowAgentSteps).toEqual([
      expect.objectContaining({
        stepId: "seed:l3-slice-1:setup-project:mver_bmad_v1_active:step:synthesize-setup-handoff",
        harness: "opencode",
        agentKey: "Atlas - Plan Executor",
        modelJson: null,
        completionRequirementsJson: [
          {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:project-name",
          },
          {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:requires-brainstorming",
          },
          {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:requires-product-brief",
          },
          {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:project-overview-artifact",
          },
        ],
      }),
    ]);

    expect(slice1DemoFixtureSeedRows.methodologyWorkflowAgentStepExplicitReadGrants).toHaveLength(
      1,
    );
    expect(slice1DemoFixtureSeedRows.methodologyWorkflowAgentStepWriteItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ writeItemId: "project_name", sortOrder: 100 }),
        expect.objectContaining({ writeItemId: "requires_brainstorming", sortOrder: 200 }),
        expect.objectContaining({ writeItemId: "requires_product_brief", sortOrder: 300 }),
        expect.objectContaining({ writeItemId: "PROJECT_OVERVIEW", sortOrder: 400 }),
      ]),
    );
    expect(
      slice1DemoFixtureSeedRows.methodologyWorkflowAgentStepWriteItemRequirements,
    ).toHaveLength(4);
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

    expect(slice1FixtureOnlyFactExamples.definitionBackedExternalFacts).toHaveLength(
      methodologyDesignTimeSeedFacts.setupWorkUnitFactDefinitionKeys.length,
    );
    expect(slice1FixtureOnlyFactExamples.boundExternalFacts).toHaveLength(
      methodologyDesignTimeSeedFacts.methodologyFactDefinitionKeys.length,
    );

    expect(
      slice1FixtureOnlyFactExamples.definitionBackedExternalFacts.map((row) => row.factKey),
    ).toEqual([...methodologyDesignTimeSeedFacts.setupWorkUnitFactDefinitionKeys]);
    expect(slice1FixtureOnlyFactExamples.boundExternalFacts.map((row) => row.factKey)).toEqual([
      ...methodologyDesignTimeSeedFacts.methodologyFactDefinitionKeys,
    ]);

    for (const example of slice1FixtureOnlyFactExamples.definitionBackedExternalFacts) {
      expect(example.seedSource).toBe("work_unit_fact_definition");
      expect(example.workflowContextFactKind).toBe("bound_fact");
      expect(example.permanence).toBe("fixture_only");
      expect(permanentWorkUnitFactKeys.has(example.factKey)).toBe(false);
      expect(permanentMethodologyFactKeys.has(example.factKey)).toBe(false);
    }

    for (const example of slice1FixtureOnlyFactExamples.boundExternalFacts) {
      expect(example.seedSource).toBe("methodology_fact_definition");
      expect(example.workflowContextFactKind).toBe("bound_fact");
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
