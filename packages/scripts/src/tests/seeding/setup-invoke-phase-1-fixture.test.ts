import { describe, expect, it } from "vitest";

async function loadSeedArtifacts() {
  process.env.DATABASE_URL ??= "file:test.db";
  process.env.BETTER_AUTH_SECRET ??= "test-secret-for-methodology-seeds-123";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";

  const fixture = await import("../../seed/methodology/setup/setup-invoke-phase-1-fixture");
  return { fixture };
}

describe("setup invoke phase-1 fixture", () => {
  it("seeds the invoke-only phase-1 workflow fixture", async () => {
    const { fixture } = await loadSeedArtifacts();
    const { setupInvokePhase1FixtureSeedRows } = fixture;

    expect(setupInvokePhase1FixtureSeedRows.workflowIds).toEqual([
      "seed:workflow:setup:setup-project:mver_bmad_v1_active",
      "seed:workflow:brainstorming:brainstorming-primary:mver_bmad_v1_active",
      "seed:workflow:research:research-primary:mver_bmad_v1_active",
      "seed:workflow:brainstorming:brainstorming-support:mver_bmad_v1_active",
    ]);

    const stepsByWorkflow = Object.groupBy(
      setupInvokePhase1FixtureSeedRows.methodology_workflow_steps,
      (row) => row.workflowId,
    );

    expect(
      stepsByWorkflow["seed:workflow:setup:setup-project:mver_bmad_v1_active"]?.map(
        (row) => row.type,
      ),
    ).toEqual(["form", "agent", "invoke", "invoke"]);
    expect(
      stepsByWorkflow["seed:workflow:brainstorming:brainstorming-primary:mver_bmad_v1_active"]?.map(
        (row) => row.type,
      ),
    ).toEqual(["form", "invoke", "invoke"]);
    expect(
      stepsByWorkflow["seed:workflow:research:research-primary:mver_bmad_v1_active"]?.map(
        (row) => row.type,
      ),
    ).toEqual(["form"]);
    expect(
      stepsByWorkflow["seed:workflow:brainstorming:brainstorming-support:mver_bmad_v1_active"]?.map(
        (row) => row.type,
      ),
    ).toEqual(["form"]);

    expect(setupInvokePhase1FixtureSeedRows.workflowMetadataPatches).toEqual([
      {
        workflowId: "seed:workflow:setup:setup-project:mver_bmad_v1_active",
        metadataJson: {
          entryStepId: "seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:collect-setup-baseline",
        },
      },
      {
        workflowId: "seed:workflow:brainstorming:brainstorming-primary:mver_bmad_v1_active",
        metadataJson: {
          entryStepId:
            "seed:l3-setup-invoke:brainstorming:mver_bmad_v1_active:step:confirm-brainstorming-seed",
        },
      },
      {
        workflowId: "seed:workflow:research:research-primary:mver_bmad_v1_active",
        metadataJson: {
          entryStepId:
            "seed:l3-setup-invoke:research:mver_bmad_v1_active:step:capture-research-topic",
        },
      },
      {
        workflowId: "seed:workflow:brainstorming:brainstorming-support:mver_bmad_v1_active",
        metadataJson: {
          entryStepId:
            "seed:l3-setup-invoke:brainstorming-support:mver_bmad_v1_active:step:capture-support-note",
        },
      },
    ]);

    expect(
      setupInvokePhase1FixtureSeedRows.methodologyWorkflowContextFactDefinitions.map(
        (row) => row.factKey,
      ),
    ).toEqual(
      expect.arrayContaining([
        "cf_setup_brainstorming_draft_spec",
        "cf_setup_research_draft_spec",
        "cf_brainstorming_support_workflows",
        "cf_project_overview_artifact",
      ]),
    );

    expect(setupInvokePhase1FixtureSeedRows.methodologyWorkflowInvokeSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stepId: "seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:invoke-brainstorming-fixed",
          targetKind: "work_unit",
          sourceMode: "fixed_set",
        }),
        expect.objectContaining({
          stepId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:invoke-research-from-draft-spec",
          targetKind: "work_unit",
          sourceMode: "context_fact_backed",
        }),
        expect.objectContaining({
          stepId:
            "seed:l3-setup-invoke:brainstorming:mver_bmad_v1_active:step:invoke-support-fixed",
          targetKind: "workflow",
          sourceMode: "fixed_set",
        }),
        expect.objectContaining({
          stepId:
            "seed:l3-setup-invoke:brainstorming:mver_bmad_v1_active:step:invoke-support-from-refs",
          targetKind: "workflow",
          sourceMode: "context_fact_backed",
        }),
      ]),
    );

    expect(setupInvokePhase1FixtureSeedRows.methodologyWorkflowInvokeBindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          invokeStepId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:invoke-brainstorming-fixed",
          destinationKey: "desired_outcome",
          sourceKind: "literal",
        }),
        expect.objectContaining({
          invokeStepId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:invoke-brainstorming-fixed",
          destinationKey: "selected_direction",
          sourceKind: "literal",
        }),
      ]),
    );

    expect(setupInvokePhase1FixtureSeedRows.methodologyWorkflowAgentSteps).toEqual([
      expect.objectContaining({
        stepId: "seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:synthesize-setup-for-invoke",
        harness: "opencode",
        agentKey: "Atlas (Plan Executor)",
        modelJson: { provider: "opencode", model: "kimi-2.5" },
        completionRequirementsJson: [
          {
            contextFactDefinitionId:
              "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-project-overview-artifact",
          },
          {
            contextFactDefinitionId:
              "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-brainstorming-draft-spec",
          },
          {
            contextFactDefinitionId:
              "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-research-draft-spec",
          },
        ],
      }),
    ]);
    expect(
      setupInvokePhase1FixtureSeedRows.methodologyWorkflowAgentStepWriteItems.map(
        (row) => row.writeItemId,
      ),
    ).toEqual(
      expect.arrayContaining([
        "cf_project_overview_artifact",
        "cf_setup_requires_brainstorming",
        "cf_setup_requires_research",
        "cf_setup_brainstorming_draft_spec",
        "cf_setup_research_draft_spec",
      ]),
    );
  });
});
