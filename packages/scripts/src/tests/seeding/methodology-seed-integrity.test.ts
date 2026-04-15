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
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyDefinitions[0]).toMatchObject({
      id: "mdef_bmad_v1",
      key: "bmad.slice-a.v1",
      name: "BMAD v1 — Slice A",
      descriptionJson: {
        markdown:
          "Refined Slice-A canonical methodology definition for setup, brainstorming, and research.",
      },
    });
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyVersions).toHaveLength(2);
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyVersions[0]?.methodologyId).toBe("mdef_bmad_v1");
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyVersions[1]?.methodologyId).toBe("mdef_bmad_v1");
    expect(
      BASELINE_MANUAL_SEED_PLAN.methodologyVersions.some(
        (version) => version.id === "mver_bmad_v1_draft",
      ),
    ).toBe(true);
    expect(
      BASELINE_MANUAL_SEED_PLAN.methodologyVersions.some(
        (version) => version.id === "mver_bmad_v1_active",
      ),
    ).toBe(true);
  });

  it("keeps canonical seed metadata deterministic across slice registrations", async () => {
    const {
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      methodologyCanonicalTableSeedRows,
      methodologyDesignTimeSeedFacts,
      methodologyRuntimeSeedPolicy,
      methodologySeedSlices,
    } = await loadMethodologySeedArtifacts();

    expect(METHODOLOGY_CANONICAL_TABLE_SEED_ORDER).toEqual([
      "methodology_work_unit_types",
      "methodology_agent_types",
      "work_unit_lifecycle_states",
      "work_unit_lifecycle_transitions",
      "transition_condition_sets",
      "work_unit_fact_definitions",
      "methodology_artifact_slot_definitions",
      "methodology_artifact_slot_templates",
      "methodology_link_type_definitions",
      "methodology_workflows",
      "methodology_workflow_steps",
      "methodology_workflow_edges",
      "methodology_transition_workflow_bindings",
      "methodology_fact_definitions",
    ]);
    expect(Object.keys(methodologySeedSlices)).toEqual([
      "slice_a_setup",
      "slice_a_brainstorming",
      "slice_a_research",
    ]);
    expect(methodologySeedSlices.slice_a_setup.slice).toBe("slice_a_setup");
    expect(methodologySeedSlices.slice_a_brainstorming.slice).toBe("slice_a_brainstorming");
    expect(methodologySeedSlices.slice_a_research.slice).toBe("slice_a_research");

    expect(
      Object.fromEntries(
        Object.entries(methodologyCanonicalTableSeedRows).map(([table, rows]) => [
          table,
          rows.length,
        ]),
      ),
    ).toEqual({
      methodology_work_unit_types: 6,
      methodology_agent_types: 6,
      work_unit_lifecycle_states: 6,
      work_unit_lifecycle_transitions: 6,
      transition_condition_sets: 12,
      work_unit_fact_definitions: 48,
      methodology_artifact_slot_definitions: 6,
      methodology_artifact_slot_templates: 10,
      methodology_link_type_definitions: 6,
      methodology_workflows: 38,
      methodology_workflow_steps: 0,
      methodology_workflow_edges: 0,
      methodology_transition_workflow_bindings: 16,
      methodology_fact_definitions: 16,
    });

    expect(methodologyDesignTimeSeedFacts).toEqual({
      setupWorkUnitFactDefinitionKeys: [
        "workflow_mode",
        "scan_level",
        "requires_brainstorming",
        "requires_research",
        "requires_product_brief",
        "deep_dive_target",
      ],
      methodologyFactDefinitionKeys: [
        "repository_type",
        "project_parts",
        "technology_stack_by_part",
        "existing_documentation_inventory",
        "integration_points",
      ],
      lockedBmadDerivedFactDefinitionKeys: [
        "workflow_mode",
        "scan_level",
        "requires_brainstorming",
        "requires_research",
        "requires_product_brief",
        "deep_dive_target",
        "repository_type",
        "project_parts",
        "technology_stack_by_part",
        "existing_documentation_inventory",
        "integration_points",
      ],
    });
    expect(methodologyRuntimeSeedPolicy).toEqual({
      seedProjectFactInstances: false,
      seedWorkUnitFactInstances: false,
    });

    const workUnitDefinitions = methodologyCanonicalTableSeedRows.methodology_work_unit_types;
    expect(workUnitDefinitions).toHaveLength(6);

    const methodologyAgents = methodologyCanonicalTableSeedRows.methodology_agent_types;
    expect(methodologyAgents).toHaveLength(6);
    expect(new Set(methodologyAgents.map((agent) => agent.methodologyVersionId))).toEqual(
      new Set(["mver_bmad_v1_draft", "mver_bmad_v1_active"]),
    );
    expect(new Set(methodologyAgents.map((agent) => agent.key))).toEqual(
      new Set(["bmad_analyst", "bmad_brainstorming_coach", "bmad_tech_writer"]),
    );

    for (const agent of methodologyAgents) {
      const promptMarkdown = agent.promptTemplateJson?.markdown ?? "";
      expect(agent.descriptionJson).toBeTruthy();
      expect(agent.guidanceJson).toBeTruthy();
      expect(agent.persona).toEqual(expect.any(String));
      expect(agent.promptTemplateJson).toBeTruthy();
      expect(agent.persona).not.toMatch(/_bmad\//i);
      expect(agent.persona).not.toMatch(/\.md\b/i);
      expect(promptMarkdown).not.toMatch(/_bmad\//i);
      expect(promptMarkdown).not.toMatch(/\.md\b/i);
    }

    const draftAgentRows = methodologyAgents
      .filter((agent) => agent.methodologyVersionId === "mver_bmad_v1_draft")
      .map(({ methodologyVersionId: _methodologyVersionId, id: _id, ...row }) => row)
      .toSorted((a, b) => a.key.localeCompare(b.key));

    const activeAgentRows = methodologyAgents
      .filter((agent) => agent.methodologyVersionId === "mver_bmad_v1_active")
      .map(({ methodologyVersionId: _methodologyVersionId, id: _id, ...row }) => row)
      .toSorted((a, b) => a.key.localeCompare(b.key));

    expect(draftAgentRows).toEqual(activeAgentRows);

    const lifecycleStates = methodologyCanonicalTableSeedRows.work_unit_lifecycle_states;
    expect(lifecycleStates).toHaveLength(6);
    expect(new Set(lifecycleStates.map((state) => state.key))).toEqual(new Set(["done"]));
    const setupLifecycleStates = lifecycleStates.filter((state) =>
      state.workUnitTypeId.includes(":wut:setup:"),
    );
    expect(setupLifecycleStates).toHaveLength(2);
    for (const state of setupLifecycleStates) {
      expect(state.id).toBe(`seed:state:setup:done:${state.methodologyVersionId}`);
      expect(state.workUnitTypeId).toBe(`seed:wut:setup:${state.methodologyVersionId}`);
      expect(state.descriptionJson).toBeTruthy();
      expect(state.guidanceJson).toBeTruthy();
    }

    const brainstormingLifecycleStates = lifecycleStates.filter((state) =>
      state.workUnitTypeId.includes(":wut:brainstorming:"),
    );
    expect(brainstormingLifecycleStates).toHaveLength(2);
    for (const state of brainstormingLifecycleStates) {
      expect(state.id).toBe(`seed:state:brainstorming:done:${state.methodologyVersionId}`);
      expect(state.workUnitTypeId).toBe(`seed:wut:brainstorming:${state.methodologyVersionId}`);
      expect(state.descriptionJson).toBeTruthy();
      expect(state.guidanceJson).toBeTruthy();
    }

    const researchLifecycleStates = lifecycleStates.filter((state) =>
      state.workUnitTypeId.includes(":wut:research:"),
    );
    expect(researchLifecycleStates).toHaveLength(2);
    for (const state of researchLifecycleStates) {
      expect(state.id).toBe(`seed:state:research:done:${state.methodologyVersionId}`);
      expect(state.workUnitTypeId).toBe(`seed:wut:research:${state.methodologyVersionId}`);
      expect(state.descriptionJson).toBeTruthy();
      expect(state.guidanceJson).toBeTruthy();
    }

    const lifecycleTransitions = methodologyCanonicalTableSeedRows.work_unit_lifecycle_transitions;
    expect(lifecycleTransitions).toHaveLength(6);
    expect(new Set(lifecycleTransitions.map((transition) => transition.transitionKey))).toEqual(
      new Set(["activation_to_done"]),
    );
    const setupLifecycleTransitions = lifecycleTransitions.filter((transition) =>
      transition.workUnitTypeId.includes(":wut:setup:"),
    );
    expect(setupLifecycleTransitions).toHaveLength(2);
    for (const transition of setupLifecycleTransitions) {
      expect(transition.id).toBe(
        `seed:transition:setup:activation-to-done:${transition.methodologyVersionId}`,
      );
      expect(transition.workUnitTypeId).toBe(`seed:wut:setup:${transition.methodologyVersionId}`);
      expect(transition.fromStateId).toBeNull();
      expect(transition.toStateId).toBe(`seed:state:setup:done:${transition.methodologyVersionId}`);
      expect(transition.descriptionJson).toBeTruthy();
      expect(transition.guidanceJson).toBeTruthy();
    }

    const brainstormingLifecycleTransitions = lifecycleTransitions.filter((transition) =>
      transition.workUnitTypeId.includes(":wut:brainstorming:"),
    );
    expect(brainstormingLifecycleTransitions).toHaveLength(2);
    for (const transition of brainstormingLifecycleTransitions) {
      expect(transition.id).toBe(
        `seed:transition:brainstorming:activation-to-done:${transition.methodologyVersionId}`,
      );
      expect(transition.workUnitTypeId).toBe(
        `seed:wut:brainstorming:${transition.methodologyVersionId}`,
      );
      expect(transition.fromStateId).toBeNull();
      expect(transition.toStateId).toBe(
        `seed:state:brainstorming:done:${transition.methodologyVersionId}`,
      );
      expect(transition.descriptionJson).toBeTruthy();
      expect(transition.guidanceJson).toBeTruthy();
    }

    const researchLifecycleTransitions = lifecycleTransitions.filter((transition) =>
      transition.workUnitTypeId.includes(":wut:research:"),
    );
    expect(researchLifecycleTransitions).toHaveLength(2);
    for (const transition of researchLifecycleTransitions) {
      expect(transition.id).toBe(
        `seed:transition:research:activation-to-done:${transition.methodologyVersionId}`,
      );
      expect(transition.workUnitTypeId).toBe(
        `seed:wut:research:${transition.methodologyVersionId}`,
      );
      expect(transition.fromStateId).toBeNull();
      expect(transition.toStateId).toBe(
        `seed:state:research:done:${transition.methodologyVersionId}`,
      );
      expect(transition.descriptionJson).toBeTruthy();
      expect(transition.guidanceJson).toBeTruthy();
    }

    const transitionConditionSets = methodologyCanonicalTableSeedRows.transition_condition_sets;
    expect(transitionConditionSets).toHaveLength(12);
    expect(new Set(transitionConditionSets.map((conditionSet) => conditionSet.phase))).toEqual(
      new Set(["start", "completion"]),
    );
    expect(new Set(transitionConditionSets.map((conditionSet) => conditionSet.mode))).toEqual(
      new Set(["all"]),
    );
    for (const conditionSet of transitionConditionSets) {
      expect(conditionSet).not.toHaveProperty("descriptionJson");
      expect(conditionSet).not.toHaveProperty("guidanceJson");
    }

    const setupTransitionConditionSets = transitionConditionSets.filter((conditionSet) =>
      conditionSet.key.startsWith("wu.setup."),
    );
    expect(setupTransitionConditionSets).toHaveLength(4);

    const startConditionSets = setupTransitionConditionSets.filter(
      (conditionSet) => conditionSet.phase === "start",
    );
    expect(startConditionSets).toHaveLength(2);
    for (const startConditionSet of startConditionSets) {
      expect(startConditionSet.id).toBe(
        `seed:condition-set:setup:activation-to-done:start:${startConditionSet.methodologyVersionId}`,
      );
      expect(startConditionSet.key).toBe("wu.setup.activation_to_done.start");
      expect(startConditionSet.transitionId).toBe(
        `seed:transition:setup:activation-to-done:${startConditionSet.methodologyVersionId}`,
      );
      expect(startConditionSet.groupsJson).toEqual([]);
    }

    const completionConditionSets = setupTransitionConditionSets.filter(
      (conditionSet) => conditionSet.phase === "completion",
    );
    expect(completionConditionSets).toHaveLength(2);
    for (const completionConditionSet of completionConditionSets) {
      expect(completionConditionSet.id).toBe(
        `seed:condition-set:setup:activation-to-done:completion:${completionConditionSet.methodologyVersionId}`,
      );
      expect(completionConditionSet.key).toBe("wu.setup.activation_to_done.completion");
      expect(completionConditionSet.transitionId).toBe(
        `seed:transition:setup:activation-to-done:${completionConditionSet.methodologyVersionId}`,
      );
      expect(completionConditionSet.groupsJson).toEqual([]);
    }

    const brainstormingTransitionConditionSets = transitionConditionSets.filter((conditionSet) =>
      conditionSet.key.startsWith("wu.brainstorming."),
    );
    expect(brainstormingTransitionConditionSets).toHaveLength(4);

    const brainstormingStartConditionSets = brainstormingTransitionConditionSets.filter(
      (conditionSet) => conditionSet.phase === "start",
    );
    expect(brainstormingStartConditionSets).toHaveLength(2);
    for (const conditionSet of brainstormingStartConditionSets) {
      expect(conditionSet.id).toBe(
        `seed:condition-set:brainstorming:activation-to-done:start:${conditionSet.methodologyVersionId}`,
      );
      expect(conditionSet.transitionId).toBe(
        `seed:transition:brainstorming:activation-to-done:${conditionSet.methodologyVersionId}`,
      );
      expect(conditionSet.groupsJson).toEqual([]);
    }

    const brainstormingCompletionConditionSets = brainstormingTransitionConditionSets.filter(
      (conditionSet) => conditionSet.phase === "completion",
    );
    expect(brainstormingCompletionConditionSets).toHaveLength(2);
    for (const conditionSet of brainstormingCompletionConditionSets) {
      expect(conditionSet.id).toBe(
        `seed:condition-set:brainstorming:activation-to-done:completion:${conditionSet.methodologyVersionId}`,
      );
      expect(conditionSet.transitionId).toBe(
        `seed:transition:brainstorming:activation-to-done:${conditionSet.methodologyVersionId}`,
      );
      expect(conditionSet.groupsJson).toEqual([]);
    }

    const researchTransitionConditionSets = transitionConditionSets.filter((conditionSet) =>
      conditionSet.key.startsWith("wu.research."),
    );
    expect(researchTransitionConditionSets).toHaveLength(4);

    const researchStartConditionSets = researchTransitionConditionSets.filter(
      (conditionSet) => conditionSet.phase === "start",
    );
    expect(researchStartConditionSets).toHaveLength(2);
    for (const conditionSet of researchStartConditionSets) {
      expect(conditionSet.id).toBe(
        `seed:condition-set:research:activation-to-done:start:${conditionSet.methodologyVersionId}`,
      );
      expect(conditionSet.transitionId).toBe(
        `seed:transition:research:activation-to-done:${conditionSet.methodologyVersionId}`,
      );
      expect(conditionSet.groupsJson).toEqual([]);
    }

    const researchCompletionConditionSets = researchTransitionConditionSets.filter(
      (conditionSet) => conditionSet.phase === "completion",
    );
    expect(researchCompletionConditionSets).toHaveLength(2);
    for (const conditionSet of researchCompletionConditionSets) {
      expect(conditionSet.id).toBe(
        `seed:condition-set:research:activation-to-done:completion:${conditionSet.methodologyVersionId}`,
      );
      expect(conditionSet.transitionId).toBe(
        `seed:transition:research:activation-to-done:${conditionSet.methodologyVersionId}`,
      );
      expect(conditionSet.groupsJson).toEqual([]);
    }

    const transitionWorkflowBindings =
      methodologyCanonicalTableSeedRows.methodology_transition_workflow_bindings;
    expect(transitionWorkflowBindings).toHaveLength(16);

    const setupTransitionWorkflowBindings = transitionWorkflowBindings.filter((binding) =>
      binding.id.includes(":binding:setup:"),
    );
    expect(setupTransitionWorkflowBindings).toHaveLength(2);
    for (const binding of setupTransitionWorkflowBindings) {
      expect(binding.id).toBe(
        `seed:binding:setup:activation-to-done:${binding.methodologyVersionId}`,
      );
      expect(binding.transitionId).toBe(
        `seed:transition:setup:activation-to-done:${binding.methodologyVersionId}`,
      );
      expect(binding.workflowId).toBe(
        `seed:workflow:setup:setup-project:${binding.methodologyVersionId}`,
      );
      expect(binding).not.toHaveProperty("descriptionJson");
      expect(binding).not.toHaveProperty("guidanceJson");
    }

    const brainstormingTransitionWorkflowBindings = transitionWorkflowBindings.filter((binding) =>
      binding.id.includes(":binding:brainstorming:"),
    );
    expect(brainstormingTransitionWorkflowBindings).toHaveLength(6);
    for (const binding of brainstormingTransitionWorkflowBindings) {
      expect(binding.transitionId).toBe(
        `seed:transition:brainstorming:activation-to-done:${binding.methodologyVersionId}`,
      );
      expect(binding.workflowId).toMatch(
        new RegExp(
          `^seed:workflow:brainstorming:(brainstorming|brainstorming-primary|brainstorming-support):${binding.methodologyVersionId}$`,
        ),
      );
      expect(binding.id).toMatch(
        new RegExp(
          `^seed:binding:brainstorming:activation-to-done(?::brainstorming-(primary|support))?:${binding.methodologyVersionId}$`,
        ),
      );
      expect(binding).not.toHaveProperty("descriptionJson");
      expect(binding).not.toHaveProperty("guidanceJson");
    }

    const researchTransitionWorkflowBindings = transitionWorkflowBindings.filter((binding) =>
      binding.id.includes(":binding:research:"),
    );
    expect(researchTransitionWorkflowBindings).toHaveLength(8);
    for (const binding of researchTransitionWorkflowBindings) {
      expect(binding.transitionId).toBe(
        `seed:transition:research:activation-to-done:${binding.methodologyVersionId}`,
      );
      expect(binding).not.toHaveProperty("descriptionJson");
      expect(binding).not.toHaveProperty("guidanceJson");
      expect(binding.workflowId).toMatch(
        new RegExp(
          `^seed:workflow:research:(research-primary|market-research|domain-research|technical-research):${binding.methodologyVersionId}$`,
        ),
      );
      expect(binding.id).toMatch(
        new RegExp(
          `^seed:binding:research:(research-primary|market-research|domain-research|technical-research):${binding.methodologyVersionId}$`,
        ),
      );
    }

    expect(
      new Set(researchTransitionWorkflowBindings.map((binding) => binding.workflowId)),
    ).toEqual(
      new Set([
        "seed:workflow:research:market-research:mver_bmad_v1_draft",
        "seed:workflow:research:domain-research:mver_bmad_v1_draft",
        "seed:workflow:research:research-primary:mver_bmad_v1_draft",
        "seed:workflow:research:technical-research:mver_bmad_v1_draft",
        "seed:workflow:research:market-research:mver_bmad_v1_active",
        "seed:workflow:research:domain-research:mver_bmad_v1_active",
        "seed:workflow:research:research-primary:mver_bmad_v1_active",
        "seed:workflow:research:technical-research:mver_bmad_v1_active",
      ]),
    );

    const workflows = methodologyCanonicalTableSeedRows.methodology_workflows;
    expect(workflows).toHaveLength(38);
    expect(new Set(workflows.map((workflow) => workflow.key))).toEqual(
      new Set([
        "setup_project",
        "generate_project_context",
        "brainstorming",
        "brainstorming_primary",
        "brainstorming_support",
        "five_whys_deep_dive",
        "architecture_decision_records",
        "self_consistency_validation",
        "first_principles_analysis",
        "socratic_questioning",
        "critique_and_refine",
        "tree_of_thoughts",
        "graph_of_thoughts",
        "meta_prompting_analysis",
        "stakeholder_round_table",
        "research_primary",
        "market_research",
        "domain_research",
        "technical_research",
      ]),
    );
    const setupWorkflows = workflows.filter((workflow) =>
      workflow.workUnitTypeId.includes(":wut:setup:"),
    );
    expect(setupWorkflows).toHaveLength(4);
    for (const workflow of setupWorkflows) {
      expect(workflow.workUnitTypeId).toBe(`seed:wut:setup:${workflow.methodologyVersionId}`);
      expect(workflow.descriptionJson).toBeTruthy();
      expect(workflow.guidanceJson).toBeTruthy();
      expect(workflow.metadataJson).toMatchObject({
        family: "setup",
        supports_modes: ["greenfield", "brownfield"],
      });
    }

    const brainstormingWorkflows = workflows.filter((workflow) =>
      workflow.workUnitTypeId.includes(":wut:brainstorming:"),
    );
    expect(brainstormingWorkflows).toHaveLength(26);
    for (const workflow of brainstormingWorkflows) {
      expect(workflow.workUnitTypeId).toBe(
        `seed:wut:brainstorming:${workflow.methodologyVersionId}`,
      );
      expect(workflow.descriptionJson).toBeTruthy();
      expect(workflow.guidanceJson).toBeTruthy();
      expect(workflow.metadataJson).toMatchObject({
        family: "brainstorming",
      });
    }

    const researchWorkflows = workflows.filter((workflow) =>
      workflow.workUnitTypeId.includes(":wut:research:"),
    );
    expect(researchWorkflows).toHaveLength(8);
    for (const workflow of researchWorkflows) {
      expect(workflow.workUnitTypeId).toBe(`seed:wut:research:${workflow.methodologyVersionId}`);
      expect(workflow.descriptionJson).toBeTruthy();
      expect(workflow.guidanceJson).toBeTruthy();
      expect(workflow.metadataJson).toMatchObject({
        family: "research",
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
      });
    }

    expect(new Set(researchWorkflows.map((workflow) => workflow.key))).toEqual(
      new Set(["research_primary", "market_research", "domain_research", "technical_research"]),
    );
    for (const key of [
      "research_primary",
      "market_research",
      "domain_research",
      "technical_research",
    ] as const) {
      expect(researchWorkflows.filter((workflow) => workflow.key === key)).toHaveLength(2);
    }

    const setupProjectWorkflowRows = workflows.filter(
      (workflow) => workflow.key === "setup_project",
    );
    expect(setupProjectWorkflowRows).toHaveLength(2);
    for (const workflow of setupProjectWorkflowRows) {
      expect(workflow.id).toBe(
        `seed:workflow:setup:setup-project:${workflow.methodologyVersionId}`,
      );
      expect(workflow.metadataJson).toMatchObject({
        intent: "primary_setup_completion",
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
      });
    }

    const generateProjectContextWorkflowRows = workflows.filter(
      (workflow) => workflow.key === "generate_project_context",
    );
    expect(generateProjectContextWorkflowRows).toHaveLength(2);
    for (const workflow of generateProjectContextWorkflowRows) {
      expect(workflow.id).toBe(
        `seed:workflow:setup:generate-project-context:${workflow.methodologyVersionId}`,
      );
      expect(workflow.metadataJson).toMatchObject({
        intent: "supporting_context_generation",
        bound_by_default: false,
      });
    }

    const primaryBrainstormingWorkflowRows = workflows.filter(
      (workflow) => workflow.key === "brainstorming",
    );
    expect(primaryBrainstormingWorkflowRows).toHaveLength(2);
    for (const workflow of primaryBrainstormingWorkflowRows) {
      expect(workflow.id).toBe(
        `seed:workflow:brainstorming:brainstorming:${workflow.methodologyVersionId}`,
      );
      expect(workflow.metadataJson).toMatchObject({
        intent: "primary_brainstorming_session",
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
        source_workflow: "brainstorming",
      });
    }

    const phase1PrimaryBrainstormingWorkflowRows = workflows.filter(
      (workflow) => workflow.key === "brainstorming_primary",
    );
    expect(phase1PrimaryBrainstormingWorkflowRows).toHaveLength(2);
    for (const workflow of phase1PrimaryBrainstormingWorkflowRows) {
      expect(workflow.id).toBe(
        `seed:workflow:brainstorming:brainstorming-primary:${workflow.methodologyVersionId}`,
      );
      expect(workflow.metadataJson).toMatchObject({
        intent: "phase_1_invoke_primary_brainstorming",
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
      });
    }

    const phase1SupportWorkflowRows = workflows.filter(
      (workflow) => workflow.key === "brainstorming_support",
    );
    expect(phase1SupportWorkflowRows).toHaveLength(2);
    for (const workflow of phase1SupportWorkflowRows) {
      expect(workflow.id).toBe(
        `seed:workflow:brainstorming:brainstorming-support:${workflow.methodologyVersionId}`,
      );
      expect(workflow.metadataJson).toMatchObject({
        bound_by_default: false,
        source_method_key: "brainstorming_support",
      });
    }

    const brainstormingSupportWorkflowRows = brainstormingWorkflows.filter(
      (workflow) =>
        !["brainstorming", "brainstorming_primary", "brainstorming_support"].includes(workflow.key),
    );
    expect(brainstormingSupportWorkflowRows).toHaveLength(20);
    expect(
      new Set(
        brainstormingSupportWorkflowRows.map((workflow) => workflow.metadataJson?.bound_by_default),
      ),
    ).toEqual(new Set([false]));
    expect(
      new Set(
        brainstormingSupportWorkflowRows.map((workflow) => workflow.metadataJson?.source_workflow),
      ),
    ).toEqual(new Set(["advanced_elicitation"]));

    const supportWorkflowKeys = new Set([
      "five_whys_deep_dive",
      "architecture_decision_records",
      "self_consistency_validation",
      "first_principles_analysis",
      "socratic_questioning",
      "critique_and_refine",
      "tree_of_thoughts",
      "graph_of_thoughts",
      "meta_prompting_analysis",
      "stakeholder_round_table",
    ]);
    for (const key of supportWorkflowKeys) {
      expect(
        brainstormingSupportWorkflowRows.filter((workflow) => workflow.key === key),
      ).toHaveLength(2);
    }

    const workflowsByVersion = new Map<string, typeof workflows>();
    for (const workflow of workflows) {
      const existing = workflowsByVersion.get(workflow.methodologyVersionId) ?? [];
      existing.push(workflow);
      workflowsByVersion.set(workflow.methodologyVersionId, existing);
    }
    expect([...workflowsByVersion.keys()].toSorted()).toEqual([
      "mver_bmad_v1_active",
      "mver_bmad_v1_draft",
    ]);
    for (const [versionId, versionWorkflows] of workflowsByVersion) {
      expect(versionWorkflows).toHaveLength(19);
      expect(
        versionWorkflows.filter((workflow) => workflow.metadataJson?.bound_by_default === true),
      ).toHaveLength(7);
      expect(
        versionWorkflows.filter((workflow) => workflow.metadataJson?.bound_by_default === false),
      ).toHaveLength(12);
      expect(
        versionWorkflows
          .filter((workflow) => workflow.metadataJson?.bound_by_default === true)
          .map((workflow) => workflow.key)
          .toSorted(),
      ).toEqual([
        "brainstorming",
        "brainstorming_primary",
        "domain_research",
        "market_research",
        "research_primary",
        "setup_project",
        "technical_research",
      ]);
      const versionSupportWorkflows = versionWorkflows.filter(
        (workflow) =>
          workflow.metadataJson?.source_workflow === "advanced_elicitation" &&
          workflow.metadataJson?.bound_by_default === false &&
          workflow.key !== "brainstorming_support",
      );
      expect(versionSupportWorkflows).toHaveLength(10);
      expect(versionSupportWorkflows.map((workflow) => workflow.key).toSorted()).toEqual(
        [...supportWorkflowKeys].toSorted(),
      );
      expect(
        transitionWorkflowBindings
          .filter((binding) => binding.methodologyVersionId === versionId)
          .map((binding) => binding.workflowId)
          .toSorted(),
      ).toEqual([
        `seed:workflow:brainstorming:brainstorming-primary:${versionId}`,
        `seed:workflow:brainstorming:brainstorming-support:${versionId}`,
        `seed:workflow:brainstorming:brainstorming:${versionId}`,
        `seed:workflow:research:domain-research:${versionId}`,
        `seed:workflow:research:market-research:${versionId}`,
        `seed:workflow:research:research-primary:${versionId}`,
        `seed:workflow:research:technical-research:${versionId}`,
        `seed:workflow:setup:setup-project:${versionId}`,
      ]);
    }

    expect(methodologyCanonicalTableSeedRows.methodology_workflow_steps).toHaveLength(0);
    expect(methodologyCanonicalTableSeedRows.methodology_workflow_edges).toHaveLength(0);

    const factDefinitions = methodologyCanonicalTableSeedRows.methodology_fact_definitions;
    expect(factDefinitions).toHaveLength(16);

    const dependencyDefinitions =
      methodologyCanonicalTableSeedRows.methodology_link_type_definitions;
    expect(dependencyDefinitions).toHaveLength(6);

    const versionIds = new Set(
      factDefinitions.map((factDefinition) => factDefinition.methodologyVersionId),
    );
    expect(versionIds).toEqual(new Set(["mver_bmad_v1_draft", "mver_bmad_v1_active"]));

    expect(new Set(factDefinitions.map((factDefinition) => factDefinition.key))).toEqual(
      new Set([
        "communication_language",
        "document_output_language",
        "project_root_directory",
        "repository_type",
        "project_parts",
        "technology_stack_by_part",
        "existing_documentation_inventory",
        "integration_points",
      ]),
    );
    expect(
      factDefinitions.some((factDefinition) => factDefinition.key === "project_root_path"),
    ).toBe(false);

    expect(
      new Set(dependencyDefinitions.map((dependencyDefinition) => dependencyDefinition.key)),
    ).toEqual(
      new Set(["requires_setup_context", "informed_by_brainstorming", "informed_by_research"]),
    );

    expect(
      new Set(workUnitDefinitions.map((workUnitDefinition) => workUnitDefinition.key)),
    ).toEqual(new Set(["setup", "brainstorming", "research"]));
    for (const workUnitDefinition of workUnitDefinitions) {
      expect(workUnitDefinition.id).toBe(
        `seed:wut:${workUnitDefinition.key}:${workUnitDefinition.methodologyVersionId}`,
      );
    }

    for (const factDefinition of factDefinitions) {
      expect(factDefinition.guidanceJson).toBeTruthy();
      expect(factDefinition.descriptionJson).toBeTruthy();
      expect(["one", "many"]).toContain(factDefinition.cardinality);
    }

    const projectRootDirectoryFact = factDefinitions.find(
      (factDefinition) => factDefinition.key === "project_root_directory",
    );
    expect(projectRootDirectoryFact?.validationJson).toMatchObject({
      kind: "path",
      path: {
        pathKind: "directory",
      },
    });

    const repositoryTypeFactRows = factDefinitions.filter(
      (factDefinition) => factDefinition.key === "repository_type",
    );
    expect(repositoryTypeFactRows).toHaveLength(2);
    for (const repositoryTypeFact of repositoryTypeFactRows) {
      expect(repositoryTypeFact.validationJson).toEqual({
        kind: "allowed-values",
        values: ["monolith", "monorepo", "multi_part"],
      });
    }

    const projectPartsFactRows = factDefinitions.filter(
      (factDefinition) => factDefinition.key === "project_parts",
    );
    expect(projectPartsFactRows).toHaveLength(2);
    for (const projectPartsFact of projectPartsFactRows) {
      expect(projectPartsFact.valueType).toBe("json");
      expect(projectPartsFact.cardinality).toBe("many");
      expect(projectPartsFact.validationJson).toMatchObject({
        kind: "json-schema",
        schemaDialect: "draft-2020-12",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["part_id", "root_path", "project_type_id"],
          properties: {
            part_id: { type: "string", cardinality: "one" },
            root_path: {
              type: "string",
              cardinality: "one",
              title: "Root Path",
              "x-validation": {
                kind: "path",
                path: {
                  pathKind: "directory",
                  normalization: {
                    mode: "posix",
                    trimWhitespace: true,
                  },
                  safety: {
                    disallowAbsolute: true,
                    preventTraversal: true,
                  },
                },
              },
            },
            project_type_id: { type: "string", cardinality: "one" },
          },
        },
        subSchema: {
          type: "object",
          fields: expect.arrayContaining([
            expect.objectContaining({ key: "part_id", type: "string", cardinality: "one" }),
            expect.objectContaining({
              key: "root_path",
              type: "string",
              cardinality: "one",
              validation: {
                kind: "path",
                path: {
                  pathKind: "directory",
                  normalization: {
                    mode: "posix",
                    trimWhitespace: true,
                  },
                  safety: {
                    disallowAbsolute: true,
                    preventTraversal: true,
                  },
                },
              },
            }),
            expect.objectContaining({
              key: "project_type_id",
              type: "string",
              cardinality: "one",
            }),
          ]),
        },
      });
    }

    const technologyStackByPartFactRows = factDefinitions.filter(
      (factDefinition) => factDefinition.key === "technology_stack_by_part",
    );
    expect(technologyStackByPartFactRows).toHaveLength(2);
    for (const technologyStackByPartFact of technologyStackByPartFactRows) {
      expect(technologyStackByPartFact.valueType).toBe("json");
      expect(technologyStackByPartFact.cardinality).toBe("many");
      expect(technologyStackByPartFact.validationJson).toMatchObject({
        kind: "json-schema",
        schemaDialect: "draft-2020-12",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["part_id", "framework", "language", "version", "database", "dependencies"],
          properties: {
            part_id: { type: "string", cardinality: "one" },
            framework: { type: "string", cardinality: "one" },
            language: { type: "string", cardinality: "one" },
            version: { type: "string", cardinality: "one" },
            database: { type: "string", cardinality: "one" },
            dependencies: { type: "string", cardinality: "one" },
          },
        },
        subSchema: {
          type: "object",
          fields: expect.arrayContaining([
            expect.objectContaining({ key: "part_id", type: "string", cardinality: "one" }),
            expect.objectContaining({ key: "framework", type: "string", cardinality: "one" }),
            expect.objectContaining({ key: "language", type: "string", cardinality: "one" }),
            expect.objectContaining({ key: "version", type: "string", cardinality: "one" }),
            expect.objectContaining({ key: "database", type: "string", cardinality: "one" }),
            expect.objectContaining({ key: "dependencies", type: "string", cardinality: "one" }),
          ]),
        },
      });
    }

    const existingDocumentationInventoryFactRows = factDefinitions.filter(
      (factDefinition) => factDefinition.key === "existing_documentation_inventory",
    );
    expect(existingDocumentationInventoryFactRows).toHaveLength(2);
    for (const documentationInventoryFact of existingDocumentationInventoryFactRows) {
      expect(documentationInventoryFact.valueType).toBe("json");
      expect(documentationInventoryFact.cardinality).toBe("many");
      expect(documentationInventoryFact.validationJson).toMatchObject({
        kind: "json-schema",
        schemaDialect: "draft-2020-12",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["path", "doc_type", "related_part_id"],
          properties: {
            path: {
              type: "string",
              cardinality: "one",
              title: "path",
              "x-validation": {
                kind: "path",
                path: {
                  pathKind: "file",
                  normalization: {
                    mode: "posix",
                    trimWhitespace: true,
                  },
                  safety: {
                    disallowAbsolute: true,
                    preventTraversal: true,
                  },
                },
              },
            },
            doc_type: { type: "string", cardinality: "one" },
            related_part_id: { type: "string", cardinality: "one" },
          },
        },
        subSchema: {
          type: "object",
          fields: expect.arrayContaining([
            expect.objectContaining({
              key: "path",
              type: "string",
              cardinality: "one",
              validation: {
                kind: "path",
                path: {
                  pathKind: "file",
                  normalization: {
                    mode: "posix",
                    trimWhitespace: true,
                  },
                  safety: {
                    disallowAbsolute: true,
                    preventTraversal: true,
                  },
                },
              },
            }),
            expect.objectContaining({ key: "doc_type", type: "string", cardinality: "one" }),
            expect.objectContaining({ key: "related_part_id", type: "string", cardinality: "one" }),
          ]),
        },
      });
    }

    const integrationPointsFactRows = factDefinitions.filter(
      (factDefinition) => factDefinition.key === "integration_points",
    );
    expect(integrationPointsFactRows).toHaveLength(2);
    for (const integrationPointsFact of integrationPointsFactRows) {
      expect(integrationPointsFact.valueType).toBe("json");
      expect(integrationPointsFact.cardinality).toBe("many");
      expect(integrationPointsFact.validationJson).toMatchObject({
        kind: "json-schema",
        schemaDialect: "draft-2020-12",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["from_part_id", "to_part_id", "integration_type", "details"],
          properties: {
            from_part_id: { type: "string", cardinality: "one" },
            to_part_id: { type: "string", cardinality: "one" },
            integration_type: { type: "string", cardinality: "one" },
            details: { type: "string", cardinality: "one" },
          },
        },
        subSchema: {
          type: "object",
          fields: expect.arrayContaining([
            expect.objectContaining({ key: "from_part_id", type: "string", cardinality: "one" }),
            expect.objectContaining({ key: "to_part_id", type: "string", cardinality: "one" }),
            expect.objectContaining({
              key: "integration_type",
              type: "string",
              cardinality: "one",
            }),
            expect.objectContaining({ key: "details", type: "string", cardinality: "one" }),
          ]),
        },
      });
    }

    const draftFactRows = factDefinitions
      .filter((factDefinition) => factDefinition.methodologyVersionId === "mver_bmad_v1_draft")
      .map(({ methodologyVersionId: _methodologyVersionId, id: _id, ...row }) => row)
      .toSorted((a, b) => a.key.localeCompare(b.key));

    const activeFactRows = factDefinitions
      .filter((factDefinition) => factDefinition.methodologyVersionId === "mver_bmad_v1_active")
      .map(({ methodologyVersionId: _methodologyVersionId, id: _id, ...row }) => row)
      .toSorted((a, b) => a.key.localeCompare(b.key));

    expect(draftFactRows).toEqual(activeFactRows);

    const draftDependencyRows = dependencyDefinitions
      .filter(
        (dependencyDefinition) =>
          dependencyDefinition.methodologyVersionId === "mver_bmad_v1_draft",
      )
      .map(({ methodologyVersionId: _methodologyVersionId, id: _id, ...row }) => row)
      .toSorted((a, b) => a.key.localeCompare(b.key));

    const activeDependencyRows = dependencyDefinitions
      .filter(
        (dependencyDefinition) =>
          dependencyDefinition.methodologyVersionId === "mver_bmad_v1_active",
      )
      .map(({ methodologyVersionId: _methodologyVersionId, id: _id, ...row }) => row)
      .toSorted((a, b) => a.key.localeCompare(b.key));

    expect(draftDependencyRows).toEqual(activeDependencyRows);

    const draftWorkUnitRows = workUnitDefinitions
      .filter(
        (workUnitDefinition) => workUnitDefinition.methodologyVersionId === "mver_bmad_v1_draft",
      )
      .map(({ methodologyVersionId: _methodologyVersionId, id: _id, ...row }) => row)
      .toSorted((a, b) => a.key.localeCompare(b.key));

    const activeWorkUnitRows = workUnitDefinitions
      .filter(
        (workUnitDefinition) => workUnitDefinition.methodologyVersionId === "mver_bmad_v1_active",
      )
      .map(({ methodologyVersionId: _methodologyVersionId, id: _id, ...row }) => row)
      .toSorted((a, b) => a.key.localeCompare(b.key));

    expect(draftWorkUnitRows).toEqual(activeWorkUnitRows);

    const workUnitFactDefinitions = methodologyCanonicalTableSeedRows.work_unit_fact_definitions;
    expect(workUnitFactDefinitions).toHaveLength(48);
    expect(new Set(workUnitFactDefinitions.map((fact) => fact.key))).toEqual(
      new Set([
        "initiative_name",
        "project_kind",
        "project_knowledge_directory",
        "planning_artifacts_directory",
        "workflow_mode",
        "scan_level",
        "requires_brainstorming",
        "requires_research",
        "deep_dive_target",
        "setup_work_unit",
        "objectives",
        "desired_outcome",
        "selected_direction",
        "constraints",
        "selected_directions",
        "session_notes_file",
        "estimated_research_effort",
        "research_work_units",
        "brainstorming_work_unit",
        "research_topic",
        "research_goals",
        "scope_notes",
        "research_synthesis",
      ]),
    );
    const setupWorkUnitFactDefinitions = workUnitFactDefinitions.filter((fact) =>
      fact.workUnitTypeId.includes(":wut:setup:"),
    );
    expect(setupWorkUnitFactDefinitions).toHaveLength(18);
    for (const factDefinition of setupWorkUnitFactDefinitions) {
      expect(factDefinition.workUnitTypeId).toBe(
        `seed:wut:setup:${factDefinition.methodologyVersionId}`,
      );
      expect(factDefinition.descriptionJson).toBeTruthy();
      expect(factDefinition.guidanceJson).toBeTruthy();
      expect(["one", "many"]).toContain(factDefinition.cardinality);
    }

    const brainstormingWorkUnitFactDefinitions = workUnitFactDefinitions.filter((fact) =>
      fact.workUnitTypeId.includes(":wut:brainstorming:"),
    );
    expect(brainstormingWorkUnitFactDefinitions).toHaveLength(18);

    const setupWorkUnitFactRows = brainstormingWorkUnitFactDefinitions.filter(
      (fact) => fact.key === "setup_work_unit",
    );
    expect(setupWorkUnitFactRows).toHaveLength(2);
    for (const setupWorkUnitFact of setupWorkUnitFactRows) {
      expect(setupWorkUnitFact.factType).toBe("work_unit");
      expect(setupWorkUnitFact.validationJson).toMatchObject({
        kind: "none",
        dependencyType: "requires_setup_context",
        workUnitKey: "setup",
      });
    }

    const sessionNotesFileRows = brainstormingWorkUnitFactDefinitions.filter(
      (fact) => fact.key === "session_notes_file",
    );
    expect(sessionNotesFileRows).toHaveLength(2);
    for (const sessionNotesFile of sessionNotesFileRows) {
      expect(sessionNotesFile.factType).toBe("string");
      expect(sessionNotesFile.validationJson).toMatchObject({
        kind: "path",
        path: {
          pathKind: "file",
        },
      });
    }

    const estimatedResearchEffortRows = brainstormingWorkUnitFactDefinitions.filter(
      (fact) => fact.key === "estimated_research_effort",
    );
    expect(estimatedResearchEffortRows).toHaveLength(2);
    for (const estimatedResearchEffort of estimatedResearchEffortRows) {
      expect(estimatedResearchEffort.factType).toBe("number");
    }

    const researchWorkUnitsRows = brainstormingWorkUnitFactDefinitions.filter(
      (fact) => fact.key === "research_work_units",
    );
    expect(researchWorkUnitsRows).toHaveLength(2);
    for (const researchWorkUnits of researchWorkUnitsRows) {
      expect(researchWorkUnits.factType).toBe("work_unit");
      expect(researchWorkUnits.cardinality).toBe("many");
      expect(researchWorkUnits.validationJson).toMatchObject({
        kind: "none",
        dependencyType: "informed_by_research",
        workUnitKey: "research",
      });
    }

    for (const factDefinition of brainstormingWorkUnitFactDefinitions) {
      expect(factDefinition.workUnitTypeId).toBe(
        `seed:wut:brainstorming:${factDefinition.methodologyVersionId}`,
      );
      expect(factDefinition.descriptionJson).toBeTruthy();
      expect(factDefinition.guidanceJson).toBeTruthy();
      expect(["one", "many"]).toContain(factDefinition.cardinality);
    }

    const researchWorkUnitFactDefinitions = workUnitFactDefinitions.filter((fact) =>
      fact.workUnitTypeId.includes(":wut:research:"),
    );
    expect(researchWorkUnitFactDefinitions).toHaveLength(12);
    for (const factDefinition of researchWorkUnitFactDefinitions) {
      expect(factDefinition.workUnitTypeId).toBe(
        `seed:wut:research:${factDefinition.methodologyVersionId}`,
      );
      expect(factDefinition.descriptionJson).toBeTruthy();
      expect(factDefinition.guidanceJson).toBeTruthy();
      expect(["one", "many"]).toContain(factDefinition.cardinality);
    }

    const objectivesFactRows = brainstormingWorkUnitFactDefinitions.filter(
      (fact) => fact.key === "objectives",
    );
    expect(objectivesFactRows).toHaveLength(2);
    for (const objectiveFact of objectivesFactRows) {
      expect(objectiveFact.factType).toBe("json");
      expect(objectiveFact.cardinality).toBe("many");
      expect(objectiveFact.defaultValueJson).toBeNull();
      expect(objectiveFact.validationJson).toMatchObject({
        kind: "json-schema",
        schemaDialect: "draft-2020-12",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["title", "motivation", "success_signal"],
          properties: {
            title: { type: "string", cardinality: "one" },
            motivation: { type: "string", cardinality: "one" },
            success_signal: { type: "string", cardinality: "one" },
            priority: { type: "number", cardinality: "one" },
            notes: { type: "string", cardinality: "one" },
          },
        },
      });
    }

    expect(
      brainstormingWorkUnitFactDefinitions.some(
        (factDefinition) => factDefinition.key === "objective",
      ),
    ).toBe(false);

    const selectedDirectionsFactRows = brainstormingWorkUnitFactDefinitions.filter(
      (fact) => fact.key === "selected_directions",
    );
    expect(selectedDirectionsFactRows).toHaveLength(2);
    for (const selectedDirectionsFact of selectedDirectionsFactRows) {
      expect(selectedDirectionsFact.factType).toBe("json");
      expect(selectedDirectionsFact.cardinality).toBe("one");
      expect(selectedDirectionsFact.defaultValueJson).toBeNull();
      expect(selectedDirectionsFact.validationJson).toMatchObject({
        kind: "json-schema",
        schemaDialect: "draft-2020-12",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            primary_directions: { type: "string", cardinality: "many" },
            quick_wins: { type: "string", cardinality: "many" },
            breakthrough_concepts: { type: "string", cardinality: "many" },
          },
        },
      });
      const selectedDirectionProperties =
        selectedDirectionsFact.validationJson?.kind === "json-schema" &&
        selectedDirectionsFact.validationJson.schema &&
        typeof selectedDirectionsFact.validationJson.schema === "object" &&
        "properties" in selectedDirectionsFact.validationJson.schema
          ? selectedDirectionsFact.validationJson.schema.properties
          : null;
      if (selectedDirectionProperties && typeof selectedDirectionProperties === "object") {
        for (const field of [
          "primary_directions",
          "quick_wins",
          "breakthrough_concepts",
        ] as const) {
          const property = selectedDirectionProperties[field];
          if (property && typeof property === "object") {
            expect(property).not.toHaveProperty("default");
          }
        }
      }
    }

    const selectedDirectionFactRows = brainstormingWorkUnitFactDefinitions.filter(
      (fact) => fact.key === "selected_direction",
    );
    expect(selectedDirectionFactRows).toHaveLength(2);
    for (const selectedDirectionFact of selectedDirectionFactRows) {
      expect(selectedDirectionFact.factType).toBe("string");
      expect(selectedDirectionFact.cardinality).toBe("one");
      expect(selectedDirectionFact.defaultValueJson).toBeNull();
      expect(selectedDirectionFact.validationJson).toEqual({ kind: "none" });
    }

    const constraintsFactRows = brainstormingWorkUnitFactDefinitions.filter(
      (fact) => fact.key === "constraints",
    );
    expect(constraintsFactRows).toHaveLength(2);
    for (const constraintsFact of constraintsFactRows) {
      expect(constraintsFact.factType).toBe("json");
      expect(constraintsFact.cardinality).toBe("one");
      expect(constraintsFact.defaultValueJson).toBeNull();
      expect(constraintsFact.validationJson).toMatchObject({
        kind: "json-schema",
        schemaDialect: "draft-2020-12",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            must_have: { type: "string", cardinality: "many" },
            must_avoid: { type: "string", cardinality: "many" },
            timebox_notes: { type: "string", cardinality: "many" },
          },
        },
      });
    }

    const researchGoalsFactRows = researchWorkUnitFactDefinitions.filter(
      (fact) => fact.key === "research_goals",
    );
    expect(researchGoalsFactRows).toHaveLength(2);
    for (const researchGoalsFact of researchGoalsFactRows) {
      expect(researchGoalsFact.factType).toBe("json");
      expect(researchGoalsFact.cardinality).toBe("many");
      expect(researchGoalsFact.defaultValueJson).toBeNull();
      expect(researchGoalsFact.validationJson).toMatchObject({
        kind: "json-schema",
        schemaDialect: "draft-2020-12",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["title", "question", "success_signal"],
          properties: {
            title: { type: "string", cardinality: "one" },
            question: { type: "string", cardinality: "one" },
            success_signal: { type: "string", cardinality: "one" },
            priority: { type: "number", cardinality: "one" },
            notes: { type: "string", cardinality: "one" },
          },
        },
      });
    }

    const researchSynthesisFactRows = researchWorkUnitFactDefinitions.filter(
      (fact) => fact.key === "research_synthesis",
    );
    expect(researchSynthesisFactRows).toHaveLength(2);
    for (const researchSynthesisFact of researchSynthesisFactRows) {
      expect(researchSynthesisFact.factType).toBe("json");
      expect(researchSynthesisFact.cardinality).toBe("one");
      expect(researchSynthesisFact.defaultValueJson).toBeNull();
      expect(researchSynthesisFact.validationJson).toMatchObject({
        kind: "json-schema",
        schemaDialect: "draft-2020-12",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["executive_summary", "key_finding", "primary_recommendation"],
          properties: {
            executive_summary: { type: "string", cardinality: "one" },
            key_finding: { type: "string", cardinality: "one" },
            primary_recommendation: { type: "string", cardinality: "one" },
            source_verification_summary: { type: "string", cardinality: "one" },
          },
        },
      });
    }

    const projectKindFactRows = workUnitFactDefinitions.filter(
      (fact) => fact.key === "project_kind",
    );
    expect(projectKindFactRows).toHaveLength(2);
    for (const projectKindFact of projectKindFactRows) {
      expect(projectKindFact.validationJson).toEqual({
        kind: "allowed-values",
        values: ["greenfield", "brownfield"],
      });
    }

    const projectKnowledgeDirectoryFactRows = workUnitFactDefinitions.filter(
      (fact) => fact.key === "project_knowledge_directory",
    );
    expect(projectKnowledgeDirectoryFactRows).toHaveLength(2);
    for (const projectKnowledgeDirectoryFact of projectKnowledgeDirectoryFactRows) {
      expect(projectKnowledgeDirectoryFact.defaultValueJson).toBe("docs");
      expect(projectKnowledgeDirectoryFact.validationJson).toMatchObject({
        kind: "path",
        path: {
          pathKind: "directory",
          safety: { disallowAbsolute: true, preventTraversal: true },
        },
      });
    }

    const planningArtifactsDirectoryFactRows = workUnitFactDefinitions.filter(
      (fact) => fact.key === "planning_artifacts_directory",
    );
    expect(planningArtifactsDirectoryFactRows).toHaveLength(2);
    for (const planningArtifactsDirectoryFact of planningArtifactsDirectoryFactRows) {
      expect(planningArtifactsDirectoryFact.defaultValueJson).toBe(".sisyphus");
      expect(planningArtifactsDirectoryFact.validationJson).toMatchObject({
        kind: "path",
        path: {
          pathKind: "directory",
          safety: { disallowAbsolute: true, preventTraversal: true },
        },
      });
    }

    const workflowModeFactRows = workUnitFactDefinitions.filter(
      (fact) => fact.key === "workflow_mode",
    );
    expect(workflowModeFactRows).toHaveLength(2);
    for (const workflowModeFact of workflowModeFactRows) {
      expect(workflowModeFact.factType).toBe("string");
      expect(workflowModeFact.cardinality).toBe("one");
      expect(workflowModeFact.validationJson).toEqual({
        kind: "allowed-values",
        values: ["lightweight", "invoke_test"],
      });
    }

    const scanLevelFactRows = workUnitFactDefinitions.filter((fact) => fact.key === "scan_level");
    expect(scanLevelFactRows).toHaveLength(2);
    for (const scanLevelFact of scanLevelFactRows) {
      expect(scanLevelFact.factType).toBe("string");
      expect(scanLevelFact.cardinality).toBe("one");
      expect(scanLevelFact.validationJson).toEqual({
        kind: "allowed-values",
        values: ["quick", "deep", "exhaustive"],
      });
    }

    const requiresBrainstormingFactRows = workUnitFactDefinitions.filter(
      (fact) => fact.key === "requires_brainstorming",
    );
    expect(requiresBrainstormingFactRows).toHaveLength(2);
    for (const requiresBrainstormingFact of requiresBrainstormingFactRows) {
      expect(requiresBrainstormingFact.factType).toBe("boolean");
      expect(requiresBrainstormingFact.cardinality).toBe("one");
      expect(requiresBrainstormingFact.defaultValueJson).toBeNull();
      expect(requiresBrainstormingFact.validationJson).toEqual({ kind: "none" });
    }

    const requiresResearchFactRows = workUnitFactDefinitions.filter(
      (fact) => fact.key === "requires_research",
    );
    expect(requiresResearchFactRows).toHaveLength(2);
    for (const requiresResearchFact of requiresResearchFactRows) {
      expect(requiresResearchFact.factType).toBe("boolean");
      expect(requiresResearchFact.cardinality).toBe("one");
      expect(requiresResearchFact.defaultValueJson).toBeNull();
      expect(requiresResearchFact.validationJson).toEqual({ kind: "none" });
    }

    const deepDiveTargetFactRows = workUnitFactDefinitions.filter(
      (fact) => fact.key === "deep_dive_target",
    );
    expect(deepDiveTargetFactRows).toHaveLength(2);
    for (const deepDiveTargetFact of deepDiveTargetFactRows) {
      expect(deepDiveTargetFact.factType).toBe("json");
      expect(deepDiveTargetFact.cardinality).toBe("one");
      expect(deepDiveTargetFact.validationJson).toMatchObject({
        kind: "json-schema",
        schemaDialect: "draft-2020-12",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["target_type", "target_path", "target_name", "target_scope"],
          properties: {
            target_type: { type: "string", cardinality: "one" },
            target_path: { type: "string", cardinality: "one" },
            target_name: { type: "string", cardinality: "one" },
            target_scope: { type: "string", cardinality: "one" },
          },
        },
      });
    }

    const artifactSlotDefinitions =
      methodologyCanonicalTableSeedRows.methodology_artifact_slot_definitions;
    expect(artifactSlotDefinitions).toHaveLength(6);

    const setupArtifactSlotDefinitions = artifactSlotDefinitions.filter((slot) =>
      slot.workUnitTypeId.includes(":wut:setup:"),
    );
    expect(setupArtifactSlotDefinitions).toHaveLength(2);
    for (const slot of setupArtifactSlotDefinitions) {
      expect(slot.id).toBe(`seed:artifact-slot:setup:setup-readme:${slot.methodologyVersionId}`);
      expect(slot.key).toBe("setup_readme");
      expect(slot.workUnitTypeId).toBe(`seed:wut:setup:${slot.methodologyVersionId}`);
      expect(slot.cardinality).toBe("single");
      expect(slot.descriptionJson).toBeTruthy();
      expect(slot.guidanceJson).toBeTruthy();
      expect(slot.rulesJson).toEqual({
        pathStrategy: "project-root",
        suggestedPath: "README.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      });
    }

    const brainstormingArtifactSlotDefinitions = artifactSlotDefinitions.filter((slot) =>
      slot.workUnitTypeId.includes(":wut:brainstorming:"),
    );
    expect(brainstormingArtifactSlotDefinitions).toHaveLength(2);
    for (const slot of brainstormingArtifactSlotDefinitions) {
      expect(slot.id).toBe(
        `seed:artifact-slot:brainstorming:brainstorming-session:${slot.methodologyVersionId}`,
      );
      expect(slot.key).toBe("brainstorming_session");
      expect(slot.workUnitTypeId).toBe(`seed:wut:brainstorming:${slot.methodologyVersionId}`);
      expect(slot.cardinality).toBe("single");
      expect(slot.rulesJson).toMatchObject({
        pathStrategy: "project-knowledge",
        suggestedPath: "brainstorming/brainstorming-session.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      });
    }

    const researchArtifactSlotDefinitions = artifactSlotDefinitions.filter((slot) =>
      slot.workUnitTypeId.includes(":wut:research:"),
    );
    expect(researchArtifactSlotDefinitions).toHaveLength(2);
    for (const slot of researchArtifactSlotDefinitions) {
      expect(slot.id).toBe(
        `seed:artifact-slot:research:research-report:${slot.methodologyVersionId}`,
      );
      expect(slot.key).toBe("research_report");
      expect(slot.workUnitTypeId).toBe(`seed:wut:research:${slot.methodologyVersionId}`);
      expect(slot.cardinality).toBe("single");
      expect(slot.rulesJson).toMatchObject({
        pathStrategy: "planning-artifacts",
        suggestedPath: "research/research-report.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      });
    }

    const artifactSlotTemplates =
      methodologyCanonicalTableSeedRows.methodology_artifact_slot_templates;
    expect(artifactSlotTemplates).toHaveLength(10);

    const setupArtifactSlotTemplates = artifactSlotTemplates.filter((template) =>
      template.slotDefinitionId.includes(":artifact-slot:setup:"),
    );
    expect(setupArtifactSlotTemplates).toHaveLength(2);
    for (const template of setupArtifactSlotTemplates) {
      expect(template.id).toBe(
        `seed:artifact-template:setup:default:${template.methodologyVersionId}`,
      );
      expect(template.slotDefinitionId).toBe(
        `seed:artifact-slot:setup:setup-readme:${template.methodologyVersionId}`,
      );
      expect(template.key).toBe("default");
      expect(template.descriptionJson).toBeTruthy();
      expect(template.guidanceJson).toBeTruthy();
      expect(template.content).toContain("{{workUnit.facts.initiative_name}}");
      expect(template.content).toContain("{{workUnit.facts.project_kind}}");
      expect(template.content).toContain("{{methodology.facts.project_root_directory}}");
      expect(template.content).toContain("{{workUnit.facts.project_knowledge_directory}}");
      expect(template.content).toContain("{{workUnit.facts.planning_artifacts_directory}}");
    }

    const brainstormingArtifactSlotTemplates = artifactSlotTemplates.filter((template) =>
      template.slotDefinitionId.includes(":artifact-slot:brainstorming:"),
    );
    expect(brainstormingArtifactSlotTemplates).toHaveLength(2);
    for (const template of brainstormingArtifactSlotTemplates) {
      expect(template.id).toBe(
        `seed:artifact-template:brainstorming:default:${template.methodologyVersionId}`,
      );
      expect(template.slotDefinitionId).toBe(
        `seed:artifact-slot:brainstorming:brainstorming-session:${template.methodologyVersionId}`,
      );
      expect(template.key).toBe("default");
      expect(template.content).toContain("{{workUnit.facts.desired_outcome}}");
      expect(template.content).toContain("{{#if workUnit.facts.objectives}}");
      expect(template.content).toContain("{{#if workUnit.facts.constraints.must_have}}");
      expect(template.content).toContain(
        "{{#if workUnit.facts.selected_directions.primary_directions}}",
      );
      expect(template.content).toContain("{{#each workUnit.facts.constraints.must_have}}");
      expect(template.content).toContain("{{#each workUnit.facts.constraints.must_avoid}}");
      expect(template.content).toContain("{{#each workUnit.facts.constraints.timebox_notes}}");
      expect(template.content).toContain(
        "{{#each workUnit.facts.selected_directions.primary_directions}}",
      );
      expect(template.content).toContain("{{#each workUnit.facts.selected_directions.quick_wins}}");
      expect(template.content).toContain(
        "{{#each workUnit.facts.selected_directions.breakthrough_concepts}}",
      );
      expect(template.content).not.toContain("{{workUnit.facts.constraints.must_have}}");
      expect(template.content).not.toContain("{{workUnit.facts.constraints.must_avoid}}");
      expect(template.content).not.toContain("{{workUnit.facts.constraints.timebox_notes}}");
      expect(template.content).not.toContain(
        "{{workUnit.facts.selected_directions.primary_directions}}",
      );
      expect(template.content).not.toContain("{{workUnit.facts.selected_directions.quick_wins}}");
      expect(template.content).not.toContain(
        "{{workUnit.facts.selected_directions.breakthrough_concepts}}",
      );
    }

    const researchArtifactSlotTemplates = artifactSlotTemplates.filter((template) =>
      template.slotDefinitionId.includes(":artifact-slot:research:"),
    );
    expect(researchArtifactSlotTemplates).toHaveLength(6);
    expect(new Set(researchArtifactSlotTemplates.map((template) => template.key))).toEqual(
      new Set(["market", "domain", "technical"]),
    );
    for (const template of researchArtifactSlotTemplates) {
      expect(template.id).toBe(
        `seed:artifact-template:research:${template.key}:${template.methodologyVersionId}`,
      );
      expect(template.slotDefinitionId).toBe(
        `seed:artifact-slot:research:research-report:${template.methodologyVersionId}`,
      );
      expect(template.content).toContain("{{workUnit.facts.research_topic}}");
      expect(template.content).toContain("{{#if workUnit.facts.research_goals}}");
      expect(template.content).toContain(
        "{{#if workUnit.facts.research_synthesis.executive_summary}}",
      );
    }
  });

  it("seeds methodology json fact definitions with normalized subSchema fields", async () => {
    const { methodologyCanonicalTableSeedRows } = await loadMethodologySeedArtifacts();

    const factDefinitions = methodologyCanonicalTableSeedRows.methodology_fact_definitions;
    const jsonFacts = [
      "technology_stack_by_part",
      "existing_documentation_inventory",
      "integration_points",
    ];

    for (const factKey of jsonFacts) {
      const rows = factDefinitions.filter((factDefinition) => factDefinition.key === factKey);
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        const validationJson =
          typeof row.validationJson === "string"
            ? (JSON.parse(row.validationJson) as { subSchema?: { fields?: unknown[] } })
            : (row.validationJson as { subSchema?: { fields?: unknown[] } });
        expect(validationJson).toMatchObject({
          kind: "json-schema",
        });
        expect(validationJson.subSchema?.type).toBe("object");
        expect(Array.isArray(validationJson.subSchema?.fields ?? [])).toBe(true);
      }
    }
  });

  it("seeds brainstorming setup_work_unit as canonical work_unit fact type", async () => {
    const { methodologyCanonicalTableSeedRows } = await loadMethodologySeedArtifacts();

    const setupWorkUnitFactRows = methodologyCanonicalTableSeedRows.work_unit_fact_definitions
      .filter((fact) => fact.workUnitTypeId.includes(":wut:brainstorming:"))
      .filter((fact) => fact.key === "setup_work_unit");

    expect(setupWorkUnitFactRows).toHaveLength(2);
    for (const setupWorkUnitFact of setupWorkUnitFactRows) {
      expect(setupWorkUnitFact.factType).toBe("work_unit");
      expect(setupWorkUnitFact.validationJson).toMatchObject({
        kind: "none",
        dependencyType: "requires_setup_context",
        workUnitKey: "setup",
      });
    }
  });
});
