import { schema } from "@chiron/db";

import {
  LOCKED_BMAD_METHODOLOGY_FACT_KEYS,
  LOCKED_BMAD_SETUP_WORK_UNIT_FACT_KEYS,
  methodologyVersionIds,
} from "./setup-bmad-mapping";

export const SLICE_1_DEMO_FIXTURE = {
  fixtureId: "slice_1_wu_setup_form_path",
  methodologyVersionId: "mver_bmad_v1_active",
  workUnitTypeKey: "setup",
  workflowKey: "setup_project",
  workflowId: "seed:workflow:setup:setup-project:mver_bmad_v1_active",
} as const;

export type MethodologyWorkflowStepSeedRow = typeof schema.methodologyWorkflowSteps.$inferInsert;
export type MethodologyWorkflowEdgeSeedRow = typeof schema.methodologyWorkflowEdges.$inferInsert;
export type MethodologyWorkflowFormFieldSeedRow =
  typeof schema.methodologyWorkflowFormFields.$inferInsert;
export type MethodologyWorkflowContextFactDefinitionSeedRow =
  typeof schema.methodologyWorkflowContextFactDefinitions.$inferInsert;
export type MethodologyWorkflowContextFactPlainValueSeedRow =
  typeof schema.methodologyWorkflowContextFactPlainValues.$inferInsert;
export type MethodologyWorkflowContextFactExternalBindingSeedRow =
  typeof schema.methodologyWorkflowContextFactExternalBindings.$inferInsert;
export type MethodologyWorkflowContextFactWorkflowReferenceSeedRow =
  typeof schema.methodologyWorkflowContextFactWorkflowReferences.$inferInsert;
export type MethodologyWorkflowContextFactArtifactReferenceSeedRow =
  typeof schema.methodologyWorkflowContextFactArtifactReferences.$inferInsert;
export type MethodologyWorkflowContextFactDraftSpecSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecs.$inferInsert;
export type MethodologyWorkflowContextFactDraftSpecFactSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecFields.$inferInsert;
export type MethodologyWorkflowAgentStepSeedRow =
  typeof schema.methodologyWorkflowAgentSteps.$inferInsert;
export type MethodologyWorkflowAgentStepExplicitReadGrantSeedRow =
  typeof schema.methodologyWorkflowAgentStepExplicitReadGrants.$inferInsert;
export type MethodologyWorkflowAgentStepWriteItemSeedRow =
  typeof schema.methodologyWorkflowAgentStepWriteItems.$inferInsert;
export type MethodologyWorkflowAgentStepWriteItemRequirementSeedRow =
  typeof schema.methodologyWorkflowAgentStepWriteItemRequirements.$inferInsert;
export type MethodologyWorkflowContextFactDraftSpecSelectionSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecSelections.$inferInsert;
export type MethodologyWorkflowInvokeStepSeedRow =
  typeof schema.methodologyWorkflowInvokeSteps.$inferInsert;
export type MethodologyWorkflowInvokeBindingSeedRow =
  typeof schema.methodologyWorkflowInvokeBindings.$inferInsert;
export type MethodologyWorkflowInvokeTransitionSeedRow =
  typeof schema.methodologyWorkflowInvokeTransitions.$inferInsert;

export type Slice1FixtureOnlyFactExample = {
  readonly factKey: string;
  readonly seedSource: "work_unit_fact_definition" | "methodology_fact_definition";
  readonly workflowContextFactKind: "bound_fact" | "bound_fact";
  readonly permanence: "fixture_only";
};

function guidanceJson(human: string, agent = human) {
  return {
    human: { markdown: human },
    agent: { markdown: agent },
  };
}

export const slice1FixtureOnlyFactExamples = {
  definitionBackedExternalFacts: LOCKED_BMAD_SETUP_WORK_UNIT_FACT_KEYS.map(
    (factKey): Slice1FixtureOnlyFactExample => ({
      factKey,
      seedSource: "work_unit_fact_definition",
      workflowContextFactKind: "bound_fact",
      permanence: "fixture_only",
    }),
  ),
  boundExternalFacts: LOCKED_BMAD_METHODOLOGY_FACT_KEYS.map(
    (factKey): Slice1FixtureOnlyFactExample => ({
      factKey,
      seedSource: "methodology_fact_definition",
      workflowContextFactKind: "bound_fact",
      permanence: "fixture_only",
    }),
  ),
  explicitlyExcludedFactKeys: ["project_root_path"] as const,
} as const;

export type Slice1DemoFixtureSeedRows = {
  readonly methodologyVersionId: string;
  readonly workflowId: string;
  readonly workflowMetadataPatch: {
    readonly workflowId: string;
    readonly metadataJson: { readonly entryStepId: string };
  };
  readonly methodologyWorkflowContextFactDefinitions: readonly MethodologyWorkflowContextFactDefinitionSeedRow[];
  readonly methodologyWorkflowContextFactPlainValues: readonly MethodologyWorkflowContextFactPlainValueSeedRow[];
  readonly methodologyWorkflowContextFactExternalBindings: readonly MethodologyWorkflowContextFactExternalBindingSeedRow[];
  readonly methodologyWorkflowContextFactWorkflowReferences: readonly MethodologyWorkflowContextFactWorkflowReferenceSeedRow[];
  readonly methodologyWorkflowContextFactArtifactReferences: readonly MethodologyWorkflowContextFactArtifactReferenceSeedRow[];
  readonly methodologyWorkflowContextFactDraftSpecs: readonly MethodologyWorkflowContextFactDraftSpecSeedRow[];
  readonly methodologyWorkflowContextFactDraftSpecSelections: readonly MethodologyWorkflowContextFactDraftSpecSelectionSeedRow[];
  readonly methodologyWorkflowContextFactDraftSpecFacts: readonly MethodologyWorkflowContextFactDraftSpecFactSeedRow[];
  readonly methodology_workflow_steps: readonly MethodologyWorkflowStepSeedRow[];
  readonly methodology_workflow_edges: readonly MethodologyWorkflowEdgeSeedRow[];
  readonly methodologyWorkflowFormFields: readonly MethodologyWorkflowFormFieldSeedRow[];
  readonly methodologyWorkflowAgentSteps: readonly MethodologyWorkflowAgentStepSeedRow[];
  readonly methodologyWorkflowAgentStepExplicitReadGrants: readonly MethodologyWorkflowAgentStepExplicitReadGrantSeedRow[];
  readonly methodologyWorkflowAgentStepWriteItems: readonly MethodologyWorkflowAgentStepWriteItemSeedRow[];
  readonly methodologyWorkflowAgentStepWriteItemRequirements: readonly MethodologyWorkflowAgentStepWriteItemRequirementSeedRow[];
  readonly methodologyWorkflowInvokeSteps: readonly MethodologyWorkflowInvokeStepSeedRow[];
  readonly methodologyWorkflowInvokeBindings: readonly MethodologyWorkflowInvokeBindingSeedRow[];
  readonly methodologyWorkflowInvokeTransitions: readonly MethodologyWorkflowInvokeTransitionSeedRow[];
};

function buildSlice1DemoFixtureSeedRows(methodologyVersionId: string): Slice1DemoFixtureSeedRows {
  const baseId = `seed:l3-slice-1:setup-project:${methodologyVersionId}`;
  const setupStepId = `${baseId}:step:collect-setup`;
  const synthesizeStepId = `${baseId}:step:synthesize-setup-handoff`;
  const writeProjectOverviewArtifactRowId = `${baseId}:write-item:project-overview-artifact`;
  const writeProjectNameRowId = `${baseId}:write-item:project-name`;
  const writeRequiresBrainstormingRowId = `${baseId}:write-item:requires-brainstorming`;
  const writeRequiresProductBriefRowId = `${baseId}:write-item:requires-product-brief`;
  const setupWorkflowId = `seed:workflow:setup:setup-project:${methodologyVersionId}`;

  return {
    methodologyVersionId,
    workflowId: setupWorkflowId,
    workflowMetadataPatch: {
      workflowId: setupWorkflowId,
      metadataJson: {
        entryStepId: setupStepId,
      },
    },
    methodologyWorkflowContextFactDefinitions: [
      {
        id: `${baseId}:ctx:project-type`,
        workflowId: setupWorkflowId,
        factKey: "project_type",
        factKind: "bound_fact",
        label: "Project Type",
        descriptionJson: { markdown: "Select whether this is a greenfield or brownfield project." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Choose greenfield for new projects or brownfield for existing projects.",
          "Use the project type to guide discovery questions and setup approach.",
        ),
      },
      {
        id: `${baseId}:ctx:project-name`,
        workflowId: setupWorkflowId,
        factKey: "project_name",
        factKind: "plain_fact",
        label: "Project Name",
        descriptionJson: { markdown: "The canonical name for this project." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Provide a clear, memorable name for the project.",
          "Use this name consistently across all project artifacts and communications.",
        ),
      },
      {
        id: `${baseId}:ctx:requires-brainstorming`,
        workflowId: setupWorkflowId,
        factKey: "requires_brainstorming",
        factKind: "plain_fact",
        label: "Requires Brainstorming",
        descriptionJson: {
          markdown: "Recommendation for whether a brainstorming session is needed.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Set this when setup findings suggest the team should branch into a brainstorming session.",
          "Use this structured recommendation as an explicit handoff signal for whether brainstorming is needed after setup completes.",
        ),
      },
      {
        id: `${baseId}:ctx:requires-product-brief`,
        workflowId: setupWorkflowId,
        factKey: "requires_product_brief",
        factKind: "plain_fact",
        label: "Requires Product Brief",
        descriptionJson: {
          markdown: "Recommendation for whether a formal product brief is needed.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Set this when the project would benefit from a structured product brief document.",
          "Use this structured recommendation to determine if downstream product definition work is required.",
        ),
      },
      {
        id: `${baseId}:ctx:project-overview-artifact`,
        workflowId: setupWorkflowId,
        factKey: "PROJECT_OVERVIEW",
        factKind: "artifact_slot_reference_fact",
        label: "Project Overview Artifact",
        descriptionJson: {
          markdown: "Reference the PROJECT_OVERVIEW artifact slot from this workflow.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Select the artifact slot that should hold the project overview document.",
          "Use this artifact reference to store the structured project discovery output.",
        ),
      },
    ] satisfies readonly MethodologyWorkflowContextFactDefinitionSeedRow[],
    methodologyWorkflowContextFactPlainValues: [
      {
        id: `${baseId}:ctx-payload:project-name`,
        contextFactDefinitionId: `${baseId}:ctx:project-name`,
        type: "string",
      },
      {
        id: `${baseId}:ctx-payload:requires-brainstorming`,
        contextFactDefinitionId: `${baseId}:ctx:requires-brainstorming`,
        type: "json",
      },
      {
        id: `${baseId}:ctx-payload:requires-product-brief`,
        contextFactDefinitionId: `${baseId}:ctx:requires-product-brief`,
        type: "json",
      },
    ] satisfies readonly MethodologyWorkflowContextFactPlainValueSeedRow[],
    methodologyWorkflowContextFactExternalBindings: [
      {
        id: `${baseId}:ctx-payload:project-type`,
        contextFactDefinitionId: `${baseId}:ctx:project-type`,
        provider: "bound_fact",
        bindingKey: "project_kind",
      },
    ] satisfies readonly MethodologyWorkflowContextFactExternalBindingSeedRow[],
    methodologyWorkflowContextFactWorkflowReferences:
      [] satisfies readonly MethodologyWorkflowContextFactWorkflowReferenceSeedRow[],
    methodologyWorkflowContextFactArtifactReferences: [
      {
        id: `${baseId}:ctx-payload:project-overview-artifact`,
        contextFactDefinitionId: `${baseId}:ctx:project-overview-artifact`,
        slotDefinitionId: "PROJECT_OVERVIEW",
      },
    ] satisfies readonly MethodologyWorkflowContextFactArtifactReferenceSeedRow[],
    methodologyWorkflowContextFactDraftSpecs:
      [] satisfies readonly MethodologyWorkflowContextFactDraftSpecSeedRow[],
    methodologyWorkflowContextFactDraftSpecSelections:
      [] satisfies readonly MethodologyWorkflowContextFactDraftSpecSelectionSeedRow[],
    methodologyWorkflowContextFactDraftSpecFacts:
      [] satisfies readonly MethodologyWorkflowContextFactDraftSpecFactSeedRow[],
    methodology_workflow_steps: [
      {
        id: setupStepId,
        methodologyVersionId,
        workflowId: setupWorkflowId,
        key: "collect_setup_context",
        type: "form",
        displayName: "Collect Setup Context",
        configJson: null,
        guidanceJson: guidanceJson(
          "Select the project type to begin the setup workflow.",
          "Use this step to determine if this is a greenfield or brownfield project.",
        ),
      },
      {
        id: synthesizeStepId,
        methodologyVersionId,
        workflowId: setupWorkflowId,
        key: "synthesize_setup_handoff",
        type: "agent",
        displayName: "Synthesize Setup Handoff",
        configJson: {
          descriptionJson: {
            markdown:
              "Conducts deep discovery conversation and produces structured PROJECT_OVERVIEW document.",
          },
        },
        guidanceJson: guidanceJson(
          "Guide the agent to discover project vision, goals, and requirements through clarifying questions.",
          "The agent should elicit project details and produce a comprehensive PROJECT_OVERVIEW artifact with recommendations.",
        ),
      },
    ] satisfies readonly MethodologyWorkflowStepSeedRow[],
    methodology_workflow_edges: [
      {
        id: `${baseId}:edge:collect-setup->synthesize-handoff`,
        methodologyVersionId,
        workflowId: setupWorkflowId,
        fromStepId: setupStepId,
        toStepId: synthesizeStepId,
        edgeKey: "collect_setup_context_to_synthesize_setup_handoff",
        descriptionJson: {
          markdown: guidanceJson(
            "Proceed to the discovery agent once the project type has been selected.",
            "Use this edge to hand off from project type selection to the deep discovery conversation.",
          ).human.markdown,
        },
      },
    ] satisfies readonly MethodologyWorkflowEdgeSeedRow[],
    methodologyWorkflowFormFields: [
      {
        id: `${baseId}:field:setup-step:project-type`,
        formStepId: setupStepId,
        key: "projectType",
        label: "Project Type",
        valueType: "string",
        required: true,
        inputJson: { contextFactDefinitionId: `${baseId}:ctx:project-type` },
        descriptionJson: {
          markdown: "Select whether this is a greenfield (new) or brownfield (existing) project.",
        },
        sortOrder: 0,
      },
    ] satisfies readonly MethodologyWorkflowFormFieldSeedRow[],
    methodologyWorkflowAgentSteps: [
      {
        stepId: synthesizeStepId,
        objective:
          "Use Chiron MCP tools (chiron_read_context_value, chiron_write_context_value) to conduct a discovery conversation and capture project details. Write project_name, requires_brainstorming, requires_product_brief, and create a PROJECT_OVERVIEW artifact with git repository setup.",
        instructionsMarkdown:
          "You are operating in Chiron with access to MCP tools. Available tools:\n- chiron_read_step_snapshot: Read the current step execution context (objective, instructions, state)\n- chiron_read_context_value: Read context facts by contextFactDefinitionId\n- chiron_write_context_value: Write context values by writeItemId\n\nAvailable write items and their IDs:\n- project_name (string): The canonical project name\n- requires_brainstorming (JSON): {recommend_brainstorming_session: boolean, reasoning: string}\n- requires_product_brief (JSON): {recommend_product_brief: boolean, reasoning: string}\n- PROJECT_OVERVIEW (artifact): Path to the project overview document\n\nCRITICAL: The PROJECT_OVERVIEW artifact requires you to:\n1. Create a markdown file with the project discovery content\n2. Initialize a git repository in the project directory (if not exists)\n3. Commit the file to the repository\n4. Use chiron_write_context_value with writeItemId=PROJECT_OVERVIEW and valueJson=path/to/file.md\n\nDEPENDENCIES: You must write PROJECT_OVERVIEW before you can write requires_brainstorming or requires_product_brief. The system will block these writes until the artifact is committed.\n\nEngage the user in a discovery conversation to understand: 1) Project vision - what are we building and why? 2) Target users - who will use this and what do they need? 3) Goals and success criteria - how will we know this is successful? 4) Constraints - technical, business, or timeline limitations. 5) Key requirements - must-have features or capabilities.\n\nAsk clarifying questions to fill gaps. Then use the MCP tools to write:\n- project_name: A clear project name\n- PROJECT_OVERVIEW: File path after creating doc and committing to git\n- requires_brainstorming: JSON recommendation (blocked until PROJECT_OVERVIEW is written)\n- requires_product_brief: JSON recommendation (blocked until PROJECT_OVERVIEW is written)",
        harness: "opencode",
        agentKey: "Atlas (Plan Executor)",
        modelJson: null,
        completionRequirementsJson: [
          { contextFactDefinitionId: `${baseId}:ctx:project-name` },
          { contextFactDefinitionId: `${baseId}:ctx:requires-brainstorming` },
          { contextFactDefinitionId: `${baseId}:ctx:requires-product-brief` },
          { contextFactDefinitionId: `${baseId}:ctx:project-overview-artifact` },
        ],
        sessionStart: "explicit",
        continuationMode: "bootstrap_only",
        liveStreamCount: 1,
        nativeMessageLog: false,
        persistedWritePolicy: "applied_only",
      },
    ] satisfies readonly MethodologyWorkflowAgentStepSeedRow[],
    methodologyWorkflowAgentStepExplicitReadGrants: [
      { agentStepId: synthesizeStepId, contextFactDefinitionId: `${baseId}:ctx:project-type` },
    ] satisfies readonly MethodologyWorkflowAgentStepExplicitReadGrantSeedRow[],
    methodologyWorkflowAgentStepWriteItems: [
      {
        id: writeProjectNameRowId,
        agentStepId: synthesizeStepId,
        writeItemId: "project_name",
        contextFactDefinitionId: `${baseId}:ctx:project-name`,
        contextFactKind: "plain_fact",
        label: "Project Name",
        sortOrder: 100,
      },
      {
        id: writeRequiresBrainstormingRowId,
        agentStepId: synthesizeStepId,
        writeItemId: "requires_brainstorming",
        contextFactDefinitionId: `${baseId}:ctx:requires-brainstorming`,
        contextFactKind: "plain_fact",
        label: "Requires Brainstorming",
        sortOrder: 200,
      },
      {
        id: writeRequiresProductBriefRowId,
        agentStepId: synthesizeStepId,
        writeItemId: "requires_product_brief",
        contextFactDefinitionId: `${baseId}:ctx:requires-product-brief`,
        contextFactKind: "plain_fact",
        label: "Requires Product Brief",
        sortOrder: 300,
      },
      {
        id: writeProjectOverviewArtifactRowId,
        agentStepId: synthesizeStepId,
        writeItemId: "PROJECT_OVERVIEW",
        contextFactDefinitionId: `${baseId}:ctx:project-overview-artifact`,
        contextFactKind: "artifact_slot_reference_fact",
        label: "Project Overview Artifact",
        sortOrder: 400,
      },
    ] satisfies readonly MethodologyWorkflowAgentStepWriteItemSeedRow[],
    methodologyWorkflowAgentStepWriteItemRequirements: [
      {
        writeItemRowId: writeProjectNameRowId,
        contextFactDefinitionId: `${baseId}:ctx:project-type`,
      },
      {
        writeItemRowId: writeProjectOverviewArtifactRowId,
        contextFactDefinitionId: `${baseId}:ctx:project-type`,
      },
      {
        writeItemRowId: writeRequiresBrainstormingRowId,
        contextFactDefinitionId: `${baseId}:ctx:project-overview-artifact`,
      },
      {
        writeItemRowId: writeRequiresProductBriefRowId,
        contextFactDefinitionId: `${baseId}:ctx:project-overview-artifact`,
      },
    ] satisfies readonly MethodologyWorkflowAgentStepWriteItemRequirementSeedRow[],
    methodologyWorkflowInvokeSteps: [] satisfies readonly MethodologyWorkflowInvokeStepSeedRow[],
    methodologyWorkflowInvokeBindings:
      [] satisfies readonly MethodologyWorkflowInvokeBindingSeedRow[],
    methodologyWorkflowInvokeTransitions:
      [] satisfies readonly MethodologyWorkflowInvokeTransitionSeedRow[],
  } as const;
}

export const slice1DemoFixtureSeedRows = buildSlice1DemoFixtureSeedRows(
  SLICE_1_DEMO_FIXTURE.methodologyVersionId,
);

export const slice1DemoFixtureSeedRowsAllVersions = [
  buildSlice1DemoFixtureSeedRows(methodologyVersionIds.draft),
  buildSlice1DemoFixtureSeedRows(methodologyVersionIds.active),
] as const;
