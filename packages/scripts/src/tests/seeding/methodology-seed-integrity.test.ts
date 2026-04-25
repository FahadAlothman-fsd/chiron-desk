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

describe("methodology seed integrity", { timeout: SEED_ARTIFACT_TIMEOUT_MS }, () => {
  it("keeps the baseline manual seed metadata deterministic", () => {
    expect(BASELINE_MANUAL_SEED_PLAN.planId).toBe("baseline_manual");
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyDefinitions[0]).toMatchObject({
      id: "mdef_bmad_v1",
      key: "bmad.slice-a.v1",
      name: "BMAD v1 — Slice A",
      descriptionJson: {
        markdown:
          "Refined Slice-A canonical methodology definition for setup through architecture.",
      },
    });
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyVersions).toHaveLength(2);
    expect(
      BASELINE_MANUAL_SEED_PLAN.methodologyVersions.map((version) => version.id).toSorted(),
    ).toEqual(["mver_bmad_v1_active", "mver_bmad_v1_draft"]);
  });

  it("registers the full Section A slice set with expected canonical counts", async () => {
    const {
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      methodologyCanonicalTableSeedRows,
      methodologyDesignTimeSeedFacts,
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
      "methodology_workflow_context_fact_definitions",
      "methodology_workflow_context_fact_plain_values",
      "methodology_workflow_context_fact_external_bindings",
      "methodology_workflow_context_fact_workflow_references",
      "methodology_workflow_context_fact_artifact_references",
      "methodology_workflow_context_fact_draft_specs",
      "methodology_workflow_context_fact_draft_spec_selections",
      "methodology_workflow_context_fact_draft_spec_facts",
      "methodology_workflow_form_fields",
      "methodology_workflow_agent_steps",
      "methodology_workflow_agent_step_explicit_read_grants",
      "methodology_workflow_agent_step_write_items",
      "methodology_workflow_agent_step_write_item_requirements",
      "methodology_workflow_action_steps",
      "methodology_workflow_action_step_actions",
      "methodology_workflow_action_step_action_items",
      "methodology_workflow_invoke_steps",
      "methodology_workflow_invoke_bindings",
      "methodology_workflow_invoke_transitions",
      "methodology_workflow_branch_steps",
      "methodology_workflow_branch_routes",
      "methodology_workflow_branch_route_groups",
      "methodology_workflow_branch_route_conditions",
      "methodology_workflow_edges",
      "methodology_transition_workflow_bindings",
      "methodology_fact_definitions",
    ]);

    expect(Object.keys(methodologySeedSlices)).toEqual([
      "slice_a_setup",
      "slice_a_brainstorming",
      "slice_a_research",
      "slice_a_product_brief",
      "slice_a_prd",
      "slice_a_ux_design",
      "slice_a_architecture",
    ]);

    const tableCounts = Object.fromEntries(
      Object.entries(methodologyCanonicalTableSeedRows).map(([table, rows]) => [
        table,
        rows.length,
      ]),
    );

    expect(tableCounts).toMatchObject({
      methodology_work_unit_types: 14,
      methodology_agent_types: 6,
      work_unit_lifecycle_states: 14,
      work_unit_lifecycle_transitions: 14,
      transition_condition_sets: 28,
      methodology_artifact_slot_definitions: 26,
      methodology_artifact_slot_templates: 30,
      methodology_link_type_definitions: 12,
      methodology_workflows: 34,
      methodology_transition_workflow_bindings: 18,
      methodology_fact_definitions: 20,
    });
    expect(tableCounts.work_unit_fact_definitions).toBeGreaterThan(0);
    expect(tableCounts.methodology_workflow_steps).toBeGreaterThan(0);
    expect(tableCounts.methodology_workflow_context_fact_definitions).toBeGreaterThan(0);
    expect(tableCounts.methodology_workflow_form_fields).toBeGreaterThan(0);
    expect(tableCounts.methodology_workflow_agent_steps).toBeGreaterThan(0);
    expect(tableCounts.methodology_workflow_action_steps).toBeGreaterThan(0);
    expect(tableCounts.methodology_workflow_branch_steps).toBeGreaterThan(0);
    expect(tableCounts.methodology_workflow_edges).toBeGreaterThan(0);

    expect(methodologyDesignTimeSeedFacts).toEqual({
      setupWorkUnitFactDefinitionKeys: [
        "workflow_mode",
        "scan_level",
        "requires_brainstorming",
        "requires_research",
        "branch_note",
        "requires_product_brief",
        "deep_dive_target",
      ],
      methodologyFactDefinitionKeys: [
        "project_knowledge_directory",
        "planning_artifacts_directory",
        "implementation_artifacts_directory",
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
        "branch_note",
        "requires_product_brief",
        "deep_dive_target",
        "project_knowledge_directory",
        "planning_artifacts_directory",
        "implementation_artifacts_directory",
        "repository_type",
        "project_parts",
        "technology_stack_by_part",
        "existing_documentation_inventory",
        "integration_points",
      ],
    });
  });

  it("seeds the Section A work unit catalog without deferred standalone MVP units", async () => {
    const { methodologyCanonicalTableSeedRows } = await loadMethodologySeedArtifacts();

    const workUnitTypes = methodologyCanonicalTableSeedRows.methodology_work_unit_types;
    expect(new Set(workUnitTypes.map((row) => row.key))).toEqual(
      new Set([
        "setup",
        "brainstorming",
        "research",
        "product_brief",
        "prd",
        "ux_design",
        "architecture",
      ]),
    );
    expect(workUnitTypes.some((row) => row.key === "epic")).toBe(false);
    expect(workUnitTypes.some((row) => row.key === "sprint_plan")).toBe(false);
    expect(workUnitTypes.some((row) => row.key === "implementation_readiness")).toBe(false);
  });

  it("updates setup, brainstorming, and research rows to the agreed Section A contract", async () => {
    const { methodologyCanonicalTableSeedRows } = await loadMethodologySeedArtifacts();

    const factRows = methodologyCanonicalTableSeedRows.work_unit_fact_definitions;
    const slotRows = methodologyCanonicalTableSeedRows.methodology_artifact_slot_definitions;
    const workflowRows = methodologyCanonicalTableSeedRows.methodology_workflows;
    const conditionSets = methodologyCanonicalTableSeedRows.transition_condition_sets;

    expect(factRows.filter((row) => row.workUnitTypeId.includes(":wut:setup:"))).toHaveLength(8);
    expect(
      new Set(
        factRows.filter((row) => row.workUnitTypeId.includes(":wut:setup:")).map((row) => row.key),
      ),
    ).toEqual(
      new Set([
        "initiative_name",
        "project_kind",
        "setup_path_summary",
        "next_recommended_work_unit",
      ]),
    );

    expect(
      new Set(
        slotRows.filter((row) => row.workUnitTypeId.includes(":wut:setup:")).map((row) => row.key),
      ),
    ).toEqual(new Set(["PROJECT_OVERVIEW", "BROWNFIELD_DOCS_INDEX", "PROJECT_CONTEXT"]));

    const setupCompletion = conditionSets.find(
      (row) =>
        row.key === "wu.setup.activation_to_done.completion" &&
        row.methodologyVersionId === "mver_bmad_v1_active",
    );
    expect(setupCompletion?.groupsJson).toEqual([
      {
        mode: "all",
        conditions: [
          expect.objectContaining({
            config: expect.objectContaining({ factKey: "initiative_name" }),
          }),
          expect.objectContaining({ config: expect.objectContaining({ factKey: "project_kind" }) }),
          expect.objectContaining({
            config: expect.objectContaining({ factKey: "setup_path_summary" }),
          }),
          expect.objectContaining({
            config: expect.objectContaining({ factKey: "next_recommended_work_unit" }),
          }),
          expect.objectContaining({
            config: expect.objectContaining({ slotKey: "PROJECT_OVERVIEW" }),
          }),
        ],
      },
    ]);

    expect(
      new Set(
        factRows
          .filter((row) => row.workUnitTypeId.includes(":wut:brainstorming:"))
          .map((row) => row.key),
      ),
    ).toEqual(
      new Set([
        "setup_work_unit",
        "brainstorming_focus",
        "desired_outcome",
        "objectives",
        "constraints",
        "technique_plan",
        "selected_technique_workflows",
        "technique_outputs",
        "selected_directions",
        "follow_up_research_topics",
      ]),
    );
    expect(workflowRows.some((row) => row.key === "brainstorming_primary")).toBe(false);
    expect(workflowRows.some((row) => row.key === "brainstorming_support")).toBe(false);
    expect(workflowRows.some((row) => row.key === "architecture_decision_records")).toBe(false);
    expect(
      new Set(
        workflowRows
          .filter((row) => row.workUnitTypeId.includes(":wut:brainstorming:"))
          .map((row) => row.key),
      ),
    ).toEqual(
      new Set([
        "brainstorming",
        "first_principles_analysis",
        "five_whys_deep_dive",
        "socratic_questioning",
        "stakeholder_round_table",
        "critique_and_refine",
      ]),
    );

    expect(
      new Set(
        factRows
          .filter((row) => row.workUnitTypeId.includes(":wut:research:"))
          .map((row) => row.key),
      ),
    ).toEqual(
      new Set([
        "setup_work_unit",
        "brainstorming_work_unit",
        "research_type",
        "research_topic",
        "research_goals",
        "scope_notes",
        "research_synthesis",
        "source_inventory",
      ]),
    );
    expect(
      new Set(
        slotRows
          .filter((row) => row.workUnitTypeId.includes(":wut:research:"))
          .map((row) => row.key),
      ),
    ).toEqual(new Set(["RESEARCH_REPORT"]));
    expect(workflowRows.some((row) => row.key === "research_primary")).toBe(false);
    expect(
      new Set(
        workflowRows
          .filter((row) => row.workUnitTypeId.includes(":wut:research:"))
          .map((row) => row.key),
      ),
    ).toEqual(new Set(["market_research", "domain_research", "technical_research"]));
  });

  it("adds Product Brief, PRD, UX Design, and Architecture with required bindings and artifacts", async () => {
    const { methodologyCanonicalTableSeedRows } = await loadMethodologySeedArtifacts();

    const factRows = methodologyCanonicalTableSeedRows.work_unit_fact_definitions;
    const slotRows = methodologyCanonicalTableSeedRows.methodology_artifact_slot_definitions;
    const workflowRows = methodologyCanonicalTableSeedRows.methodology_workflows;
    const bindingRows = methodologyCanonicalTableSeedRows.methodology_transition_workflow_bindings;

    expect(
      new Set(
        factRows
          .filter((row) => row.workUnitTypeId.includes(":wut:product_brief:"))
          .map((row) => row.key),
      ),
    ).toEqual(
      new Set([
        "setup_work_unit",
        "brainstorming_work_unit",
        "research_work_units",
        "product_name",
        "product_intent_summary",
        "source_context_summary",
        "brief_synthesis",
        "review_findings",
        "open_questions",
        "next_recommended_work_unit",
      ]),
    );
    expect(
      new Set(
        slotRows
          .filter((row) => row.workUnitTypeId.includes(":wut:product_brief:"))
          .map((row) => row.key),
      ),
    ).toEqual(new Set(["PRODUCT_BRIEF", "PRODUCT_BRIEF_DISTILLATE"]));
    expect(workflowRows.filter((row) => row.key === "create_product_brief")).toHaveLength(2);

    expect(
      new Set(
        factRows.filter((row) => row.workUnitTypeId.includes(":wut:prd:")).map((row) => row.key),
      ),
    ).toEqual(
      new Set([
        "setup_work_unit",
        "product_brief_work_unit",
        "research_work_units",
        "brainstorming_work_unit",
        "project_name",
        "input_context_inventory",
        "project_classification",
        "product_vision",
        "success_criteria",
        "user_journeys",
        "scope_plan",
        "functional_requirements",
        "non_functional_requirements",
        "prd_synthesis",
        "next_recommended_work_units",
      ]),
    );
    expect(
      slotRows.filter((row) => row.workUnitTypeId.includes(":wut:prd:")).map((row) => row.key),
    ).toEqual(["PRD", "PRD"]);
    expect(workflowRows.filter((row) => row.key === "create_prd")).toHaveLength(2);

    expect(
      new Set(
        factRows
          .filter((row) => row.workUnitTypeId.includes(":wut:ux_design:"))
          .map((row) => row.key),
      ),
    ).toContain("prd_work_unit");
    expect(
      new Set(
        slotRows
          .filter((row) => row.workUnitTypeId.includes(":wut:ux_design:"))
          .map((row) => row.key),
      ),
    ).toEqual(new Set(["UX_DESIGN_SPECIFICATION", "UX_COLOR_THEMES", "UX_DESIGN_DIRECTIONS"]));
    expect(workflowRows.filter((row) => row.key === "create_ux_design")).toHaveLength(2);

    expect(
      new Set(
        factRows
          .filter((row) => row.workUnitTypeId.includes(":wut:architecture:"))
          .map((row) => row.key),
      ),
    ).toEqual(
      new Set([
        "prd_work_unit",
        "ux_design_work_unit",
        "research_work_units",
        "project_context_artifact",
        "project_context_analysis",
        "architecture_decisions",
        "implementation_patterns",
        "project_structure",
        "requirements_coverage",
        "validation_results",
        "architecture_synthesis",
        "next_recommended_work_units",
      ]),
    );
    expect(
      factRows.find(
        (row) =>
          row.workUnitTypeId.includes(":wut:architecture:") &&
          row.key === "project_context_artifact",
      )?.factType,
    ).toBe("work_unit_reference");
    expect(
      new Set(
        slotRows
          .filter((row) => row.workUnitTypeId.includes(":wut:architecture:"))
          .map((row) => row.key),
      ),
    ).toEqual(new Set(["ARCHITECTURE_DOCUMENT", "ARCHITECTURE_DECISION_RECORDS"]));
    expect(workflowRows.filter((row) => row.key === "create_architecture")).toHaveLength(2);
    expect(workflowRows.filter((row) => row.key === "record_architecture_decision")).toHaveLength(
      2,
    );
    expect(
      bindingRows.filter((row) => row.workflowId.includes(":record-architecture-decision:")),
    ).toEqual([]);
  });

  it("seeds authored Section A workflow steps, edges, and context facts", async () => {
    const { methodologyCanonicalTableSeedRows } = await loadMethodologySeedArtifacts();

    const workflowSteps = methodologyCanonicalTableSeedRows.methodology_workflow_steps;
    const workflowEdges = methodologyCanonicalTableSeedRows.methodology_workflow_edges;
    const contextFacts =
      methodologyCanonicalTableSeedRows.methodology_workflow_context_fact_definitions;

    expect(workflowSteps.length).toBeGreaterThan(0);
    expect(workflowEdges.length).toBeGreaterThan(0);
    expect(contextFacts.length).toBeGreaterThan(0);

    expect(
      workflowSteps
        .filter((row) => row.workflowId.includes(":workflow:setup:setup-project:"))
        .map((row) => row.key),
    ).toEqual([
      "collect_setup_baseline",
      "branch_project_kind",
      "greenfield_setup_agent",
      "brownfield_scan_preferences",
      "invoke_document_project",
      "branch_need_brainstorming",
      "invoke_brainstorming_work",
      "branch_need_research",
      "invoke_research_work",
      "branch_need_product_brief",
      "invoke_product_brief_work",
      "propagate_setup_outputs",
      "collect_setup_baseline",
      "branch_project_kind",
      "greenfield_setup_agent",
      "brownfield_scan_preferences",
      "invoke_document_project",
      "branch_need_brainstorming",
      "invoke_brainstorming_work",
      "branch_need_research",
      "invoke_research_work",
      "branch_need_product_brief",
      "invoke_product_brief_work",
      "propagate_setup_outputs",
    ]);

    expect(
      workflowSteps
        .filter((row) => row.workflowId.includes(":workflow:prd:create-prd:"))
        .map((row) => row.key),
    ).toEqual([
      "prd_input_initialization_agent",
      "prd_discovery_and_vision_agent",
      "prd_success_and_journeys_agent",
      "prd_context_requirements_agent",
      "prd_capability_contract_agent",
      "prd_polish_and_completion_agent",
      "propagate_prd_outputs",
      "prd_input_initialization_agent",
      "prd_discovery_and_vision_agent",
      "prd_success_and_journeys_agent",
      "prd_context_requirements_agent",
      "prd_capability_contract_agent",
      "prd_polish_and_completion_agent",
      "propagate_prd_outputs",
    ]);

    expect(
      workflowSteps
        .filter((row) => row.workflowId.includes(":workflow:product_brief:create-product-brief:"))
        .map((row) => row.key),
    ).toEqual([
      "brief_intent_agent",
      "product_brief_authoring_agent",
      "propagate_product_brief_outputs",
      "brief_intent_agent",
      "product_brief_authoring_agent",
      "propagate_product_brief_outputs",
    ]);

    expect(
      workflowSteps
        .filter((row) => row.workflowId.includes(":workflow:ux_design:create-ux-design:"))
        .map((row) => row.key),
    ).toEqual([
      "ux_input_initialization_agent",
      "ux_project_and_experience_agent",
      "ux_visual_foundation_agent",
      "ux_flows_components_patterns_agent",
      "ux_responsive_accessibility_completion_agent",
      "propagate_ux_design_outputs",
      "ux_input_initialization_agent",
      "ux_project_and_experience_agent",
      "ux_visual_foundation_agent",
      "ux_flows_components_patterns_agent",
      "ux_responsive_accessibility_completion_agent",
      "propagate_ux_design_outputs",
    ]);

    expect(
      workflowSteps
        .filter((row) => row.workflowId.includes(":workflow:architecture:create-architecture:"))
        .map((row) => row.key),
    ).toEqual([
      "architecture_input_initialization_agent",
      "architecture_context_agent",
      "architecture_starter_and_decisions_agent",
      "architecture_patterns_structure_agent",
      "architecture_validation_completion_agent",
      "propagate_architecture_outputs",
      "architecture_input_initialization_agent",
      "architecture_context_agent",
      "architecture_starter_and_decisions_agent",
      "architecture_patterns_structure_agent",
      "architecture_validation_completion_agent",
      "propagate_architecture_outputs",
    ]);

    expect(
      workflowEdges
        .filter((row) => row.workflowId.includes(":workflow:setup:setup-project:"))
        .map((row) => row.edgeKey),
    ).toEqual([
      "collect_setup_baseline_to_branch_project_kind",
      "greenfield_setup_agent_to_branch_need_brainstorming",
      "brownfield_scan_preferences_to_invoke_document_project",
      "invoke_document_project_to_propagate_setup_outputs",
      "invoke_brainstorming_work_to_branch_need_research",
      "invoke_research_work_to_branch_need_product_brief",
      "invoke_product_brief_work_to_propagate_setup_outputs",
      "collect_setup_baseline_to_branch_project_kind",
      "greenfield_setup_agent_to_branch_need_brainstorming",
      "brownfield_scan_preferences_to_invoke_document_project",
      "invoke_document_project_to_propagate_setup_outputs",
      "invoke_brainstorming_work_to_branch_need_research",
      "invoke_research_work_to_branch_need_product_brief",
      "invoke_product_brief_work_to_propagate_setup_outputs",
    ]);

    const setupActionRows =
      methodologyCanonicalTableSeedRows.methodology_workflow_action_step_actions;
    const setupActionItemRows =
      methodologyCanonicalTableSeedRows.methodology_workflow_action_step_action_items;
    const setupBoundFactPropagationActions = setupActionRows.filter(
      (row) =>
        row.actionStepId.includes(":setup:setup-project:") &&
        row.actionKey === "propagate_setup_bound_facts",
    );
    expect(setupBoundFactPropagationActions).toHaveLength(2);
    for (const action of setupBoundFactPropagationActions) {
      expect(action.contextFactKind).toBe("bound_fact");
      expect(
        setupActionItemRows
          .filter((row) => row.actionRowId === action.id)
          .map((row) => row.itemKey),
      ).toEqual([
        "setup.initiative_name",
        "setup.project_kind",
        "setup.project_knowledge_directory",
        "setup.planning_artifacts_directory",
        "setup.communication_language",
        "setup.document_output_language",
        "setup.workflow_mode",
        "setup.scan_level",
        "setup.deep_dive_target",
        "setup.repository_type",
        "setup.project_parts",
        "setup.technology_stack_by_part",
        "setup.existing_documentation_inventory",
        "setup.integration_points",
        "setup.setup_path_summary",
        "setup.next_recommended_work_unit",
      ]);
    }

    expect(
      new Set(
        contextFacts
          .filter((row) => row.workflowId.includes(":workflow:product_brief:create-product-brief:"))
          .map((row) => row.factKey),
      ),
    ).toEqual(
      new Set([
        "brief_mode_ctx",
        "setup_input_summary_ctx",
        "brainstorming_input_summary_ctx",
        "research_input_summary_ctx",
        "product_name_ctx",
        "product_intent_summary_ctx",
        "source_context_summary_ctx",
        "brief_synthesis_ctx",
        "review_findings_ctx",
        "open_questions_ctx",
        "next_work_unit_ref_ctx",
        "product_brief_artifact_ctx",
        "product_brief_distillate_artifact_ctx",
      ]),
    );

    expect(
      new Set(
        contextFacts
          .filter((row) => row.workflowId.includes(":workflow:prd:create-prd:"))
          .map((row) => row.factKey),
      ),
    ).toEqual(
      new Set([
        "setup_input_summary_ctx",
        "product_brief_input_summary_ctx",
        "research_input_summary_ctx",
        "brainstorming_input_summary_ctx",
        "project_name_ctx",
        "input_context_inventory_ctx",
        "project_classification_ctx",
        "product_vision_ctx",
        "success_criteria_ctx",
        "user_journeys_ctx",
        "domain_requirements_ctx",
        "innovation_analysis_ctx",
        "project_type_requirements_ctx",
        "scope_plan_ctx",
        "functional_requirements_ctx",
        "non_functional_requirements_ctx",
        "prd_synthesis_ctx",
        "next_work_unit_refs_ctx",
        "prd_artifact_ctx",
      ]),
    );
  });
});
