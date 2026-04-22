import { describe, expect, it } from "vitest";

async function loadSeedArtifacts() {
  process.env.DATABASE_URL ??= "file:test.db";
  process.env.BETTER_AUTH_SECRET ??= "test-secret-for-methodology-seeds-123";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";

  const fixture = await import("../../seed/methodology/setup/setup-invoke-phase-1-fixture");
  const sharedFixtures =
    await import("../../seed/methodology/tables/runtime-workflow-fixtures.shared");
  const manualSeed = await import("../../manual-seed.mjs");
  return { fixture, manualSeed, sharedFixtures };
}

describe("setup invoke phase-1 fixture", () => {
  it("seeds the invoke-only phase-1 workflow fixture", { timeout: 15000 }, async () => {
    const { fixture, manualSeed, sharedFixtures } = await loadSeedArtifacts();
    const { setupInvokePhase1FixtureSeedRows, setupInvokePhase1FixtureSeedRowsAllVersions } =
      fixture;
    const { runtimeWorkflowFixtureBundles } = sharedFixtures;

    expect(setupInvokePhase1FixtureSeedRows.workflowIds).toEqual([
      "seed:workflow:setup:setup-project:mver_bmad_v1_active",
      "seed:workflow:setup:generate-project-context:mver_bmad_v1_active",
      "seed:workflow:brainstorming:brainstorming-primary:mver_bmad_v1_active",
      "seed:workflow:research:research-primary:mver_bmad_v1_active",
      "seed:workflow:brainstorming:brainstorming-support:mver_bmad_v1_active",
    ]);

    const stepsByWorkflow: Record<
      string,
      Array<(typeof setupInvokePhase1FixtureSeedRows.methodology_workflow_steps)[number]>
    > = {};
    for (const row of setupInvokePhase1FixtureSeedRows.methodology_workflow_steps) {
      const workflowId = row.workflowId;
      const existingRows = stepsByWorkflow[workflowId] ?? [];
      stepsByWorkflow[workflowId] = [...existingRows, row];
    }

    expect(
      stepsByWorkflow["seed:workflow:setup:setup-project:mver_bmad_v1_active"]?.map(
        (row) => row.type,
      ),
    ).toEqual(["form", "agent", "action", "branch", "invoke", "invoke"]);
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
        "cf_setup_branch_note",
        "cf_setup_followup_workflows",
        "cf_brainstorming_support_workflows",
        "cf_project_overview_artifact",
      ]),
    );

    expect(setupInvokePhase1FixtureSeedRows.methodologyWorkflowContextFactPlainValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contextFactDefinitionId:
            "seed:l3-setup-invoke:brainstorming-support:mver_bmad_v1_active:ctx:cf-support-note",
          type: "string",
        }),
      ]),
    );
    expect(
      setupInvokePhase1FixtureSeedRows.methodologyWorkflowContextFactPlainValues.find(
        (row) =>
          row.contextFactDefinitionId ===
          "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-branch-note",
      ),
    ).toBeUndefined();
    expect(setupInvokePhase1FixtureSeedRows.methodologyWorkflowContextFactExternalBindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-requires-brainstorming",
          provider: "bound_fact",
          bindingKey: "requires_brainstorming",
        }),
        expect.objectContaining({
          contextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-requires-research",
          provider: "bound_fact",
          bindingKey: "requires_research",
        }),
        expect.objectContaining({
          contextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-branch-note",
          provider: "bound_fact",
          bindingKey: "branch_note",
        }),
      ]),
    );

    expect(
      setupInvokePhase1FixtureSeedRows.methodologyWorkflowContextFactWorkflowReferences,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-followup-workflows",
          workflowDefinitionId: "seed:workflow:setup:generate-project-context:mver_bmad_v1_active",
        }),
        expect.objectContaining({
          contextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-followup-workflows",
          workflowDefinitionId: "seed:workflow:setup:setup-project:mver_bmad_v1_active",
        }),
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

    expect(
      setupInvokePhase1FixtureSeedRows.methodologyWorkflowContextFactDraftSpecSelections.filter(
        (row) =>
          row.draftSpecId === "seed:l3-setup-invoke:setup:mver_bmad_v1_active:draft-spec:research",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          selectionType: "fact",
          definitionId: "seed:work-unit-fact:research:research-goals:mver_bmad_v1_active",
        }),
        expect.objectContaining({
          selectionType: "fact",
          definitionId: "seed:work-unit-fact:research:research-topic:mver_bmad_v1_active",
        }),
        expect.objectContaining({
          selectionType: "artifact",
          definitionId: "seed:artifact-slot:research:research-report:mver_bmad_v1_active",
        }),
      ]),
    );
    expect(
      setupInvokePhase1FixtureSeedRows.methodologyWorkflowContextFactDraftSpecSelections.some(
        (row) =>
          row.draftSpecId ===
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:draft-spec:research" &&
          row.definitionId === "seed:work-unit-fact:research:setup-work-unit:mver_bmad_v1_active",
      ),
    ).toBe(false);

    expect(setupInvokePhase1FixtureSeedRows.methodologyWorkflowAgentSteps).toEqual([
      expect.objectContaining({
        stepId: "seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:synthesize-setup-for-invoke",
        harness: "opencode",
        agentKey: "Atlas - Plan Executor",
        modelJson: { provider: "opencode", model: "kimi-2.5" },
        bootstrapPromptNoReply: false,
        completionRequirementsJson: [
          {
            contextFactDefinitionId:
              "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-project-overview-artifact",
          },
          {
            contextFactDefinitionId:
              "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-branch-note",
          },
          {
            contextFactDefinitionId:
              "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-followup-workflows",
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
        "cf_setup_branch_note",
        "cf_setup_followup_workflows",
        "cf_setup_brainstorming_draft_spec",
        "cf_setup_research_draft_spec",
      ]),
    );

    expect(setupInvokePhase1FixtureSeedRows.methodologyWorkflowActionSteps).toEqual([
      {
        stepId: "seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:propagate-setup-context",
        executionMode: "sequential",
      },
    ]);
    expect(setupInvokePhase1FixtureSeedRows.methodologyWorkflowActionStepActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionStepId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:propagate-setup-context",
          actionKey: "propagate_setup_decision_facts",
          contextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-requires-brainstorming",
          contextFactKind: "bound_fact",
        }),
        expect.objectContaining({
          actionKey: "propagate_setup_environment_bindings",
          contextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-method-project-knowledge-directory",
          contextFactKind: "bound_fact",
        }),
        expect.objectContaining({
          actionKey: "propagate_project_overview_artifact_reference",
          contextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-project-overview-artifact",
          contextFactKind: "artifact_slot_reference_fact",
        }),
      ]),
    );
    expect(setupInvokePhase1FixtureSeedRows.methodologyWorkflowActionStepActionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemKey: "setup_decision.requires_brainstorming",
          actionRowId: "seed:l3-setup-invoke:setup:mver_bmad_v1_active:action-row:decision-facts",
          targetContextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-requires-brainstorming",
        }),
        expect.objectContaining({
          itemKey: "setup_decision.requires_research",
          actionRowId: "seed:l3-setup-invoke:setup:mver_bmad_v1_active:action-row:decision-facts",
          targetContextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-requires-research",
        }),
        expect.objectContaining({
          itemKey: "setup_decision.branch_note",
          actionRowId: "seed:l3-setup-invoke:setup:mver_bmad_v1_active:action-row:decision-facts",
          targetContextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-setup-branch-note",
        }),
        expect.objectContaining({
          itemKey: "setup_environment.project_knowledge_directory",
          targetContextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-method-project-knowledge-directory",
        }),
        expect.objectContaining({
          itemKey: "setup_environment.planning_artifacts_directory",
          targetContextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-method-planning-artifacts-directory",
        }),
        expect.objectContaining({
          itemKey: "setup_environment.communication_language",
          targetContextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-method-communication-language",
        }),
        expect.objectContaining({
          itemKey: "setup_environment.document_output_language",
          targetContextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-method-document-output-language",
        }),
        expect.objectContaining({
          itemKey: "setup_artifact.project_overview",
          targetContextFactDefinitionId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:ctx:cf-project-overview-artifact",
        }),
      ]),
    );
    expect(setupInvokePhase1FixtureSeedRows.methodologyWorkflowBranchSteps).toEqual([
      {
        stepId: "seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:route-setup-followups",
        defaultTargetStepId: null,
        configJson: null,
      },
    ]);
    expect(setupInvokePhase1FixtureSeedRows.methodologyWorkflowBranchRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          branchStepId: "seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:route-setup-followups",
          routeId: "branch_to_brainstorming_then_research",
          targetStepId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:invoke-brainstorming-fixed",
          conditionMode: "all",
        }),
        expect.objectContaining({
          routeId: "branch_to_research_only",
          targetStepId:
            "seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:invoke-research-from-draft-spec",
          conditionMode: "any",
        }),
      ]),
    );
    expect(manualSeed.RUNTIME_FIXTURE_TABLE_INSERTIONS.map(([rowsKey]) => rowsKey)).toEqual(
      expect.arrayContaining([
        "methodologyWorkflowActionSteps",
        "methodologyWorkflowActionStepActions",
        "methodologyWorkflowActionStepActionItems",
        "methodologyWorkflowBranchSteps",
        "methodologyWorkflowBranchRoutes",
        "methodologyWorkflowBranchRouteGroups",
        "methodologyWorkflowBranchRouteConditions",
      ]),
    );

    expect(
      setupInvokePhase1FixtureSeedRowsAllVersions.map((bundle) => {
        const setupWorkflowId = `seed:workflow:setup:setup-project:${bundle.methodologyVersionId}`;
        return {
          version: bundle.methodologyVersionId,
          setupStepKeys: bundle.methodology_workflow_steps
            .filter((row) => row.workflowId === setupWorkflowId)
            .map((row) => row.key),
          actionKeys: bundle.methodologyWorkflowActionStepActions.map((row) => row.actionKey),
          branchRouteIds: bundle.methodologyWorkflowBranchRoutes.map((row) => row.routeId),
        };
      }),
    ).toEqual([
      {
        version: "mver_bmad_v1_draft",
        setupStepKeys: [
          "collect_setup_baseline",
          "synthesize_setup_for_invoke",
          "propagate_setup_context",
          "route_setup_followups",
          "invoke_brainstorming_fixed",
          "invoke_research_from_draft_spec",
        ],
        actionKeys: [
          "propagate_setup_decision_facts",
          "propagate_setup_environment_bindings",
          "propagate_project_overview_artifact_reference",
        ],
        branchRouteIds: ["branch_to_brainstorming_then_research", "branch_to_research_only"],
      },
      {
        version: "mver_bmad_v1_active",
        setupStepKeys: [
          "collect_setup_baseline",
          "synthesize_setup_for_invoke",
          "propagate_setup_context",
          "route_setup_followups",
          "invoke_brainstorming_fixed",
          "invoke_research_from_draft_spec",
        ],
        actionKeys: [
          "propagate_setup_decision_facts",
          "propagate_setup_environment_bindings",
          "propagate_project_overview_artifact_reference",
        ],
        branchRouteIds: ["branch_to_brainstorming_then_research", "branch_to_research_only"],
      },
    ]);

    expect(
      runtimeWorkflowFixtureBundles.flatMap((bundle) =>
        bundle.methodology_workflow_steps
          .filter(
            (row) => row.workflowId === "seed:workflow:setup:setup-project:mver_bmad_v1_active",
          )
          .map((row) => row.key),
      ),
    ).toEqual([
      "collect_setup_baseline",
      "synthesize_setup_for_invoke",
      "propagate_setup_context",
      "route_setup_followups",
      "invoke_brainstorming_fixed",
      "invoke_research_from_draft_spec",
    ]);
  });
});
