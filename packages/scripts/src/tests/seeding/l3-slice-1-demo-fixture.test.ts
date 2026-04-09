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

  it("seeds WU.SETUP form->form->agent demo with deterministic runtime handoff shape", async () => {
    const { fixture } = await loadSeedArtifacts();
    const { SLICE_1_DEMO_FIXTURE, slice1DemoFixtureSeedRows } = fixture;

    expect(SLICE_1_DEMO_FIXTURE.workUnitTypeKey).toBe("setup");
    expect(SLICE_1_DEMO_FIXTURE.workflowKey).toBe("setup_project");

    expect(slice1DemoFixtureSeedRows.methodology_workflow_steps).toHaveLength(3);
    expect(slice1DemoFixtureSeedRows.methodology_workflow_edges).toHaveLength(2);

    const formStepRows = slice1DemoFixtureSeedRows.methodology_workflow_steps.filter(
      (row) => row.type === "form",
    );
    expect(formStepRows).toHaveLength(2);
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

    expect(slice1DemoFixtureSeedRows.methodologyWorkflowContextFactDefinitions).toHaveLength(9);
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
    ).toEqual([
      "deepDiveTarget",
      "draftSpecTarget",
      "projectParts",
      "projectSummary",
      "referenceArtifact",
      "referenceWorkflow",
      "repositoryType",
      "requiresBrainstorming",
      "scanLevel",
      "workflowMode",
      "workflowModeReference",
    ]);
    expect(slice1DemoFixtureSeedRows.methodologyWorkflowFormFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          inputJson: {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:workflow-mode",
          },
        }),
        expect.objectContaining({
          inputJson: {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:scan-level",
          },
        }),
        expect.objectContaining({
          inputJson: {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:requires-brainstorming",
          },
        }),
        expect.objectContaining({
          inputJson: {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:deep-dive-target",
          },
        }),
        expect.objectContaining({
          inputJson: {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:project-summary",
          },
        }),
        expect.objectContaining({
          inputJson: {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:workflow-mode",
          },
        }),
        expect.objectContaining({
          inputJson: {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:repository-type",
          },
        }),
        expect.objectContaining({
          inputJson: {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:reference-workflow",
          },
        }),
        expect.objectContaining({
          inputJson: {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:reference-artifact",
          },
        }),
        expect.objectContaining({
          inputJson: {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:deep-dive-target",
          },
        }),
        expect.objectContaining({
          inputJson: {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:project-parts",
          },
        }),
      ]),
    );

    expect(slice1DemoFixtureSeedRows.methodologyWorkflowContextFactDraftSpecFacts).toEqual([
      expect.objectContaining({
        workUnitFactDefinitionId:
          "seed:work-unit-fact:brainstorming:constraints:mver_bmad_v1_active",
      }),
      expect.objectContaining({
        workUnitFactDefinitionId:
          "seed:work-unit-fact:brainstorming:setup-work-unit:mver_bmad_v1_active",
      }),
    ]);

    expect(slice1DemoFixtureSeedRows.methodologyWorkflowAgentSteps).toEqual([
      expect.objectContaining({
        stepId: "seed:l3-slice-1:setup-project:mver_bmad_v1_active:step:synthesize-setup-handoff",
        harness: "opencode",
        agentKey: "Atlas (Plan Executor)",
        modelJson: null,
        completionRequirementsJson: [
          {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:reference-artifact",
          },
          {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:requires-brainstorming",
          },
          {
            contextFactDefinitionId:
              "seed:l3-slice-1:setup-project:mver_bmad_v1_active:ctx:project-summary",
          },
        ],
      }),
    ]);

    expect(slice1DemoFixtureSeedRows.methodologyWorkflowAgentStepExplicitReadGrants).toHaveLength(
      8,
    );
    expect(slice1DemoFixtureSeedRows.methodologyWorkflowAgentStepWriteItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ writeItemId: "write-reference-artifact", sortOrder: 100 }),
        expect.objectContaining({ writeItemId: "write-requires-brainstorming", sortOrder: 200 }),
        expect.objectContaining({ writeItemId: "write-project-summary", sortOrder: 300 }),
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
