import { describe, expect, it } from "vitest";

async function loadSeedArtifacts() {
  process.env.DATABASE_URL ??= "file:test.db";
  process.env.BETTER_AUTH_SECRET ??= "test-secret-for-methodology-seeds-123";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";

  const fixture = await import("../../seed/methodology/setup/brainstorming-demo-fixture");
  return { fixture };
}

describe("l3 brainstorming demo fixture", () => {
  it("seeds a realistic brainstorming workflow runtime fixture", { timeout: 15000 }, async () => {
    const { fixture } = await loadSeedArtifacts();
    const { brainstormingDemoFixtureSeedRows } = fixture;

    expect(brainstormingDemoFixtureSeedRows.methodology_workflow_steps).toHaveLength(4);
    expect(brainstormingDemoFixtureSeedRows.methodology_workflow_edges).toHaveLength(3);
    expect(brainstormingDemoFixtureSeedRows.workflowMetadataPatch).toEqual({
      workflowId: brainstormingDemoFixtureSeedRows.workflowId,
      metadataJson: {
        entryStepId: "seed:l3-brainstorming:primary:mver_bmad_v1_active:step:session-setup",
      },
    });

    expect(
      brainstormingDemoFixtureSeedRows.methodology_workflow_steps.map((row) => row.type),
    ).toEqual(["form", "agent", "invoke", "invoke"]);

    expect(brainstormingDemoFixtureSeedRows.methodologyWorkflowContextFactDefinitions).toHaveLength(
      42,
    );

    expect(
      brainstormingDemoFixtureSeedRows.methodologyWorkflowContextFactDefinitions.map(
        (row) => row.factKey,
      ),
    ).toEqual(
      expect.arrayContaining([
        "brainstorming_topic",
        "brainstorming_mode",
        "brainstorming_notes_file",
        "brainstorming_workspace_dir",
        "brainstorming_effort_score",
        "brainstorming_ready_for_synthesis",
        "brainstorming_summary_json",
        "method_existing_documentation_inventory",
        "wu_setup_work_unit",
        "bound_research_work_units",
        "reference_workflow_single",
        "reference_workflow_many",
        "brainstorming_session_artifact_ref",
        "research_draft_spec_minimal",
        "research_draft_spec_with_artifacts",
      ]),
    );

    expect(
      brainstormingDemoFixtureSeedRows.methodologyWorkflowContextFactWorkflowReferences,
    ).toHaveLength(4);
    expect(brainstormingDemoFixtureSeedRows.methodologyWorkflowContextFactDraftSpecs).toHaveLength(
      2,
    );
    expect(
      brainstormingDemoFixtureSeedRows.methodologyWorkflowContextFactDraftSpecSelections,
    ).toHaveLength(7);

    expect(brainstormingDemoFixtureSeedRows.methodologyWorkflowAgentSteps).toEqual([
      expect.objectContaining({
        stepId: "seed:l3-brainstorming:primary:mver_bmad_v1_active:step:facilitate-session",
        harness: "opencode",
      }),
    ]);

    expect(brainstormingDemoFixtureSeedRows.methodologyWorkflowInvokeSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stepId: "seed:l3-brainstorming:primary:mver_bmad_v1_active:step:invoke-techniques",
          targetKind: "workflow",
          sourceMode: "context_fact_backed",
        }),
        expect.objectContaining({
          stepId:
            "seed:l3-brainstorming:primary:mver_bmad_v1_active:step:create-research-work-units",
          targetKind: "work_unit",
          sourceMode: "context_fact_backed",
        }),
      ]),
    );

    expect(brainstormingDemoFixtureSeedRows.methodologyWorkflowInvokeBindings).toHaveLength(4);
    expect(brainstormingDemoFixtureSeedRows.methodologyWorkflowInvokeTransitions).toEqual([
      expect.objectContaining({
        invokeStepId:
          "seed:l3-brainstorming:primary:mver_bmad_v1_active:step:create-research-work-units",
        workflowDefinitionIds: [
          "seed:workflow:research:market-research:mver_bmad_v1_active",
          "seed:workflow:research:domain-research:mver_bmad_v1_active",
          "seed:workflow:research:technical-research:mver_bmad_v1_active",
        ],
      }),
    ]);
  });
});
