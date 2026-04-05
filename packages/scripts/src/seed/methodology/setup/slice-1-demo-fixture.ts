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

export type Slice1FixtureOnlyFactExample = {
  readonly factKey: string;
  readonly seedSource: "work_unit_fact_definition" | "methodology_fact_definition";
  readonly workflowContextFactKind: "definition_backed_external_fact" | "bound_external_fact";
  readonly permanence: "fixture_only";
};

const brainstormingWorkUnitFactBase = `seed:work-unit-fact:brainstorming`;

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
      workflowContextFactKind: "definition_backed_external_fact",
      permanence: "fixture_only",
    }),
  ),
  boundExternalFacts: LOCKED_BMAD_METHODOLOGY_FACT_KEYS.map(
    (factKey): Slice1FixtureOnlyFactExample => ({
      factKey,
      seedSource: "methodology_fact_definition",
      workflowContextFactKind: "bound_external_fact",
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
  readonly methodologyWorkflowContextFactDraftSpecFacts: readonly MethodologyWorkflowContextFactDraftSpecFactSeedRow[];
  readonly methodology_workflow_steps: readonly MethodologyWorkflowStepSeedRow[];
  readonly methodology_workflow_edges: readonly MethodologyWorkflowEdgeSeedRow[];
  readonly methodologyWorkflowFormFields: readonly MethodologyWorkflowFormFieldSeedRow[];
};

function buildSlice1DemoFixtureSeedRows(methodologyVersionId: string): Slice1DemoFixtureSeedRows {
  const baseId = `seed:l3-slice-1:setup-project:${methodologyVersionId}`;
  const setupStepId = `${baseId}:step:collect-setup`;
  const factStepId = `${baseId}:step:exercise-bindings`;
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
        id: `${baseId}:ctx:workflow-mode`,
        workflowId: setupWorkflowId,
        factKey: "workflow_mode",
        factKind: "definition_backed_external_fact",
        label: "Workflow Mode",
        descriptionJson: { markdown: "Select the setup workflow mode for this project." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Choose the workflow mode that best matches the setup objective.",
          "Use the selected workflow mode to guide downstream setup branching and expectations.",
        ),
      },
      {
        id: `${baseId}:ctx:scan-level`,
        workflowId: setupWorkflowId,
        factKey: "scan_level",
        factKind: "definition_backed_external_fact",
        label: "Scan Level",
        descriptionJson: { markdown: "Select the desired scan depth for setup." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Pick the scan level that matches the desired setup depth.",
          "Use the scan level to calibrate how much discovery and evidence gathering the setup workflow should perform.",
        ),
      },
      {
        id: `${baseId}:ctx:requires-brainstorming`,
        workflowId: setupWorkflowId,
        factKey: "requires_brainstorming",
        factKind: "plain_value_fact",
        label: "Requires Brainstorming",
        descriptionJson: { markdown: "Indicates whether brainstorming should follow setup." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Set this when setup findings suggest the team should branch into a brainstorming session.",
          "Use this boolean as an explicit handoff signal for whether brainstorming is needed after setup completes.",
        ),
      },
      {
        id: `${baseId}:ctx:deep-dive-target`,
        workflowId: setupWorkflowId,
        factKey: "deep_dive_target",
        factKind: "work_unit_draft_spec_fact",
        label: "Deep Dive Target",
        descriptionJson: {
          markdown:
            "Select brainstorming fact definitions to compose the downstream draft-spec envelope.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Choose the brainstorming facts that should be bundled into a reusable draft-spec target.",
          "Use the selected brainstorming fact definitions as the canonical structure for drafting downstream brainstorming work.",
        ),
      },
      {
        id: `${baseId}:ctx:repository-type`,
        workflowId: setupWorkflowId,
        factKey: "repository_type",
        factKind: "bound_external_fact",
        label: "Repository Type",
        descriptionJson: {
          markdown: "Reference the discovered repository type for the current project.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Bind to the discovered repository type for this project.",
          "Use the repository type binding to drive setup decisions that depend on project structure.",
        ),
      },
      {
        id: `${baseId}:ctx:reference-workflow`,
        workflowId: setupWorkflowId,
        factKey: "reference_workflow",
        factKind: "workflow_reference_fact",
        label: "Reference Workflow",
        descriptionJson: { markdown: "Reference another workflow from the setup workflow." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Select a reusable supporting workflow to reference from setup.",
          "Use workflow references when setup needs to point operators or agents at another reusable workflow path.",
        ),
      },
      {
        id: `${baseId}:ctx:reference-artifact`,
        workflowId: setupWorkflowId,
        factKey: "reference_artifact",
        factKind: "artifact_reference_fact",
        label: "Reference Artifact",
        descriptionJson: {
          markdown: "Reference the setup README artifact slot from this workflow.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Select the artifact slot that should be referenced from setup.",
          "Use this artifact reference to keep setup-aware forms grounded in the durable artifact shape they point to.",
        ),
      },
      {
        id: `${baseId}:ctx:project-parts`,
        workflowId: setupWorkflowId,
        factKey: "project_parts",
        factKind: "bound_external_fact",
        label: "Project Parts",
        descriptionJson: {
          markdown: "Reference the discovered project parts for multiplicity coverage.",
        },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Bind to the discovered project parts for this project.",
          "Use this many-valued binding to exercise repeated project-part selection and downstream part-aware flows.",
        ),
      },
      {
        id: `${baseId}:ctx:project-summary`,
        workflowId: setupWorkflowId,
        factKey: "project_summary",
        factKind: "plain_value_fact",
        label: "Project Summary",
        descriptionJson: { markdown: "Capture a concise reusable project summary." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Capture a concise summary that downstream steps can reuse.",
          "Use this summary as a lightweight plain-value example and reusable narrative anchor for later forms.",
        ),
      },
    ] satisfies readonly MethodologyWorkflowContextFactDefinitionSeedRow[],
    methodologyWorkflowContextFactPlainValues: [
      {
        id: `${baseId}:ctx-payload:requires-brainstorming`,
        contextFactDefinitionId: `${baseId}:ctx:requires-brainstorming`,
        valueType: "boolean",
      },
      {
        id: `${baseId}:ctx-payload:project-summary`,
        contextFactDefinitionId: `${baseId}:ctx:project-summary`,
        valueType: "string",
      },
    ] satisfies readonly MethodologyWorkflowContextFactPlainValueSeedRow[],
    methodologyWorkflowContextFactExternalBindings: [
      {
        id: `${baseId}:ctx-payload:workflow-mode`,
        contextFactDefinitionId: `${baseId}:ctx:workflow-mode`,
        provider: "definition_backed_external_fact",
        bindingKey: "workflow_mode",
      },
      {
        id: `${baseId}:ctx-payload:scan-level`,
        contextFactDefinitionId: `${baseId}:ctx:scan-level`,
        provider: "definition_backed_external_fact",
        bindingKey: "scan_level",
      },
      {
        id: `${baseId}:ctx-payload:repository-type`,
        contextFactDefinitionId: `${baseId}:ctx:repository-type`,
        provider: "bound_external_fact",
        bindingKey: "repository_type",
      },
      {
        id: `${baseId}:ctx-payload:project-parts`,
        contextFactDefinitionId: `${baseId}:ctx:project-parts`,
        provider: "bound_external_fact",
        bindingKey: "project_parts",
      },
    ] satisfies readonly MethodologyWorkflowContextFactExternalBindingSeedRow[],
    methodologyWorkflowContextFactWorkflowReferences: [
      {
        id: `${baseId}:ctx-payload:reference-workflow`,
        contextFactDefinitionId: `${baseId}:ctx:reference-workflow`,
        workflowDefinitionId: `seed:workflow:setup:generate-project-context:${methodologyVersionId}`,
      },
    ] satisfies readonly MethodologyWorkflowContextFactWorkflowReferenceSeedRow[],
    methodologyWorkflowContextFactArtifactReferences: [
      {
        id: `${baseId}:ctx-payload:reference-artifact`,
        contextFactDefinitionId: `${baseId}:ctx:reference-artifact`,
        artifactSlotKey: "setup_readme",
      },
    ] satisfies readonly MethodologyWorkflowContextFactArtifactReferenceSeedRow[],
    methodologyWorkflowContextFactDraftSpecs: [
      {
        id: `${baseId}:ctx-payload:deep-dive-target`,
        contextFactDefinitionId: `${baseId}:ctx:deep-dive-target`,
      },
    ] satisfies readonly MethodologyWorkflowContextFactDraftSpecSeedRow[],
    methodologyWorkflowContextFactDraftSpecFacts: [
      {
        id: `${baseId}:ctx-payload:deep-dive-target:constraints`,
        draftSpecId: `${baseId}:ctx-payload:deep-dive-target`,
        workUnitFactDefinitionId: `${brainstormingWorkUnitFactBase}:constraints:${methodologyVersionId}`,
      },
      {
        id: `${baseId}:ctx-payload:deep-dive-target:setup-work-unit`,
        draftSpecId: `${baseId}:ctx-payload:deep-dive-target`,
        workUnitFactDefinitionId: `${brainstormingWorkUnitFactBase}:setup-work-unit:${methodologyVersionId}`,
      },
    ] satisfies readonly MethodologyWorkflowContextFactDraftSpecFactSeedRow[],
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
          "Capture the setup facts that determine how project setup should proceed.",
          "Use this first step to collect the core setup selections that drive downstream setup branching.",
        ),
      },
      {
        id: factStepId,
        methodologyVersionId,
        workflowId: setupWorkflowId,
        key: "exercise_context_fact_bindings",
        type: "form",
        displayName: "Exercise Context Fact Bindings",
        configJson: null,
        guidanceJson: guidanceJson(
          "Use this step to verify that every workflow context fact kind binds into form fields correctly.",
          "Treat this as a runtime test harness for context-fact rendering, not as product-facing setup truth.",
        ),
      },
    ] satisfies readonly MethodologyWorkflowStepSeedRow[],
    methodology_workflow_edges: [
      {
        id: `${baseId}:edge:collect-setup->exercise-bindings`,
        methodologyVersionId,
        workflowId: setupWorkflowId,
        fromStepId: setupStepId,
        toStepId: factStepId,
        edgeKey: "collect_setup_context_to_exercise_context_fact_bindings",
        descriptionJson: {
          markdown: guidanceJson(
            "Proceed to the draft runtime test form once the real setup context has been collected.",
            "Use this edge to hand off from the real setup intake to the context-fact binding test harness.",
          ).human.markdown,
        },
      },
    ] satisfies readonly MethodologyWorkflowEdgeSeedRow[],
    methodologyWorkflowFormFields: [
      {
        id: `${baseId}:field:setup-step:workflow-mode`,
        formStepId: setupStepId,
        key: "workflowMode",
        label: "Workflow Mode",
        valueType: "string",
        required: true,
        inputJson: { contextFactDefinitionId: `${baseId}:ctx:workflow-mode` },
        descriptionJson: { markdown: "Select the setup workflow mode." },
        sortOrder: 0,
      },
      {
        id: `${baseId}:field:setup-step:scan-level`,
        formStepId: setupStepId,
        key: "scanLevel",
        label: "Scan Level",
        valueType: "string",
        required: true,
        inputJson: { contextFactDefinitionId: `${baseId}:ctx:scan-level` },
        descriptionJson: { markdown: "Choose the desired scan depth for setup." },
        sortOrder: 1,
      },
      {
        id: `${baseId}:field:setup-step:requires-brainstorming`,
        formStepId: setupStepId,
        key: "requiresBrainstorming",
        label: "Requires Brainstorming",
        valueType: "boolean",
        required: true,
        inputJson: { contextFactDefinitionId: `${baseId}:ctx:requires-brainstorming` },
        descriptionJson: { markdown: "Flag whether brainstorming should follow setup." },
        sortOrder: 2,
      },
      {
        id: `${baseId}:field:setup-step:deep-dive-target`,
        formStepId: setupStepId,
        key: "deepDiveTarget",
        label: "Deep Dive Target",
        valueType: "json",
        required: false,
        inputJson: { contextFactDefinitionId: `${baseId}:ctx:deep-dive-target` },
        descriptionJson: {
          markdown: "Select brainstorming facts to include in the reusable draft-spec envelope.",
        },
        sortOrder: 3,
      },
      {
        id: `${baseId}:field:exercise-bindings:project-summary`,
        formStepId: factStepId,
        key: "projectSummary",
        label: "Project Summary",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: `${baseId}:ctx:project-summary` },
        descriptionJson: { markdown: "Exercises plain value fact binding." },
        sortOrder: 0,
      },
      {
        id: `${baseId}:field:exercise-bindings:workflow-mode-reference`,
        formStepId: factStepId,
        key: "workflowModeReference",
        label: "Workflow Mode Reference",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: `${baseId}:ctx:workflow-mode` },
        descriptionJson: { markdown: "Exercises definition-backed external fact binding." },
        sortOrder: 1,
      },
      {
        id: `${baseId}:field:exercise-bindings:repository-type`,
        formStepId: factStepId,
        key: "repositoryType",
        label: "Repository Type",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: `${baseId}:ctx:repository-type` },
        descriptionJson: { markdown: "Exercises bound external fact binding." },
        sortOrder: 2,
      },
      {
        id: `${baseId}:field:exercise-bindings:reference-workflow`,
        formStepId: factStepId,
        key: "referenceWorkflow",
        label: "Reference Workflow",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: `${baseId}:ctx:reference-workflow` },
        descriptionJson: { markdown: "Exercises workflow reference fact binding." },
        sortOrder: 3,
      },
      {
        id: `${baseId}:field:exercise-bindings:reference-artifact`,
        formStepId: factStepId,
        key: "referenceArtifact",
        label: "Reference Artifact",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: `${baseId}:ctx:reference-artifact` },
        descriptionJson: { markdown: "Exercises artifact reference fact binding." },
        sortOrder: 4,
      },
      {
        id: `${baseId}:field:exercise-bindings:draft-spec-target`,
        formStepId: factStepId,
        key: "draftSpecTarget",
        label: "Draft Spec Target",
        valueType: "json",
        required: false,
        inputJson: { contextFactDefinitionId: `${baseId}:ctx:deep-dive-target` },
        descriptionJson: { markdown: "Exercises work-unit draft-spec fact binding." },
        sortOrder: 5,
      },
      {
        id: `${baseId}:field:exercise-bindings:project-parts`,
        formStepId: factStepId,
        key: "projectParts",
        label: "Project Parts",
        valueType: "json",
        required: false,
        inputJson: { contextFactDefinitionId: `${baseId}:ctx:project-parts` },
        descriptionJson: {
          markdown: "Exercises multiplicity for a many-valued bound external fact.",
        },
        sortOrder: 6,
      },
    ] satisfies readonly MethodologyWorkflowFormFieldSeedRow[],
  } as const;
}

export const slice1DemoFixtureSeedRows = buildSlice1DemoFixtureSeedRows(
  SLICE_1_DEMO_FIXTURE.methodologyVersionId,
);

export const slice1DemoFixtureSeedRowsAllVersions = [
  buildSlice1DemoFixtureSeedRows(methodologyVersionIds.draft),
  buildSlice1DemoFixtureSeedRows(methodologyVersionIds.active),
] as const;
