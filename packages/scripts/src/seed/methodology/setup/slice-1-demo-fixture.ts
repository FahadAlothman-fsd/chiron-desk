import { schema } from "@chiron/db";

export const SLICE_1_DEMO_FIXTURE = {
  fixtureId: "slice_1_wu_setup_form_path",
  methodologyVersionId: "mver_bmad_v1_active",
  workUnitTypeKey: "setup",
  workflowKey: "setup_project",
  workflowId: "seed:workflow:setup:setup-project:mver_bmad_v1_active",
} as const;

export type MethodologyWorkflowStepSeedRow = typeof schema.methodologyWorkflowSteps.$inferInsert;
export type MethodologyWorkflowEdgeSeedRow = typeof schema.methodologyWorkflowEdges.$inferInsert;
export type MethodologyWorkflowFormStepSeedRow =
  typeof schema.methodologyWorkflowFormSteps.$inferInsert;
export type MethodologyWorkflowFormFieldSeedRow =
  typeof schema.methodologyWorkflowFormFields.$inferInsert;
export type ContextFactDefinitionSeedRow =
  typeof schema.methodologyWorkflowContextFactDefinitions.$inferInsert;
export type ContextFactPlainValueSeedRow =
  typeof schema.methodologyWorkflowContextFactPlainValues.$inferInsert;
export type ContextFactExternalBindingSeedRow =
  typeof schema.methodologyWorkflowContextFactExternalBindings.$inferInsert;
export type ContextFactWorkflowRefSeedRow =
  typeof schema.methodologyWorkflowContextFactWorkflowReferences.$inferInsert;
export type ContextFactWorkUnitRefSeedRow =
  typeof schema.methodologyWorkflowContextFactWorkUnitReferences.$inferInsert;
export type ContextFactArtifactRefSeedRow =
  typeof schema.methodologyWorkflowContextFactArtifactReferences.$inferInsert;
export type ContextFactDraftSpecSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecs.$inferInsert;
export type ContextFactDraftSpecFieldSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecFields.$inferInsert;

const baseId = "seed:l3-slice-1:setup-project";
const setupStepId = `${baseId}:step:collect-setup`;
const factStepId = `${baseId}:step:collect-facts`;

const contextFactDefinitionRows: readonly ContextFactDefinitionSeedRow[] = [
  {
    id: `${baseId}:ctx:def:plain`,
    workflowId: SLICE_1_DEMO_FIXTURE.workflowId,
    factKey: "setup.initiative_name",
    factKind: "plain_value",
  },
  {
    id: `${baseId}:ctx:def:external`,
    workflowId: SLICE_1_DEMO_FIXTURE.workflowId,
    factKey: "setup.project_root_path",
    factKind: "external_binding",
  },
  {
    id: `${baseId}:ctx:def:wf-ref`,
    workflowId: SLICE_1_DEMO_FIXTURE.workflowId,
    factKey: "setup.context_generator_workflow",
    factKind: "workflow_reference",
  },
  {
    id: `${baseId}:ctx:def:wu-ref`,
    workflowId: SLICE_1_DEMO_FIXTURE.workflowId,
    factKey: "setup.story_work_unit",
    factKind: "work_unit_reference",
  },
  {
    id: `${baseId}:ctx:def:artifact-ref`,
    workflowId: SLICE_1_DEMO_FIXTURE.workflowId,
    factKey: "setup.readme_slot",
    factKind: "artifact_reference",
  },
  {
    id: `${baseId}:ctx:def:draft-spec`,
    workflowId: SLICE_1_DEMO_FIXTURE.workflowId,
    factKey: "setup.story_draft",
    factKind: "draft_spec",
  },
  {
    id: `${baseId}:ctx:def:draft-spec-field`,
    workflowId: SLICE_1_DEMO_FIXTURE.workflowId,
    factKey: "setup.story_draft.title",
    factKind: "draft_spec_field",
  },
];

export const slice1DemoFixtureSeedRows = {
  methodology_workflow_steps: [
    {
      id: setupStepId,
      methodologyVersionId: SLICE_1_DEMO_FIXTURE.methodologyVersionId,
      workflowId: SLICE_1_DEMO_FIXTURE.workflowId,
      key: "collect_setup_context",
      type: "form",
      displayName: "Collect Setup Context",
      configJson: null,
      guidanceJson: null,
    },
    {
      id: factStepId,
      methodologyVersionId: SLICE_1_DEMO_FIXTURE.methodologyVersionId,
      workflowId: SLICE_1_DEMO_FIXTURE.workflowId,
      key: "collect_setup_facts",
      type: "form",
      displayName: "Collect Setup Facts",
      configJson: null,
      guidanceJson: null,
    },
  ] satisfies readonly MethodologyWorkflowStepSeedRow[],
  methodology_workflow_edges: [
    {
      id: `${baseId}:edge:collect-setup->collect-facts`,
      methodologyVersionId: SLICE_1_DEMO_FIXTURE.methodologyVersionId,
      workflowId: SLICE_1_DEMO_FIXTURE.workflowId,
      fromStepId: setupStepId,
      toStepId: factStepId,
      edgeKey: "collect_setup_context_to_collect_setup_facts",
      conditionJson: null,
      guidanceJson: null,
    },
  ] satisfies readonly MethodologyWorkflowEdgeSeedRow[],
  methodologyWorkflowFormSteps: [
    {
      id: setupStepId,
      workflowId: SLICE_1_DEMO_FIXTURE.workflowId,
      key: "collect_setup_context",
      label: "Collect Setup Context",
      descriptionJson: { markdown: "Capture baseline setup details." },
    },
    {
      id: factStepId,
      workflowId: SLICE_1_DEMO_FIXTURE.workflowId,
      key: "collect_setup_facts",
      label: "Collect Setup Facts",
      descriptionJson: { markdown: "Capture facts that gate setup completion." },
    },
  ] satisfies readonly MethodologyWorkflowFormStepSeedRow[],
  methodologyWorkflowFormFields: [
    {
      id: `${baseId}:field:setup-step:initiative-name`,
      formStepId: setupStepId,
      key: "initiativeName",
      label: "Initiative name",
      valueType: "string",
      required: true,
      inputJson: { kind: "text", multiline: false },
      descriptionJson: { markdown: "Human-readable initiative name." },
      sortOrder: 0,
    },
    {
      id: `${baseId}:field:fact-step:project-kind`,
      formStepId: factStepId,
      key: "projectKind",
      label: "Project kind",
      valueType: "string",
      required: true,
      inputJson: { kind: "select", options: ["greenfield", "brownfield"] },
      descriptionJson: { markdown: "Routing mode for setup guidance." },
      sortOrder: 0,
    },
  ] satisfies readonly MethodologyWorkflowFormFieldSeedRow[],
  contextFactDefinitions: contextFactDefinitionRows,
  contextFactPlainValues: [
    {
      id: `${baseId}:ctx:plain`,
      contextFactDefinitionId: `${baseId}:ctx:def:plain`,
      valueType: "string",
    },
  ] satisfies readonly ContextFactPlainValueSeedRow[],
  contextFactExternalBindings: [
    {
      id: `${baseId}:ctx:external`,
      contextFactDefinitionId: `${baseId}:ctx:def:external`,
      provider: "project",
      bindingKey: "projectRootPath",
    },
  ] satisfies readonly ContextFactExternalBindingSeedRow[],
  contextFactWorkflowReferences: [
    {
      id: `${baseId}:ctx:wf-ref`,
      contextFactDefinitionId: `${baseId}:ctx:def:wf-ref`,
      workflowDefinitionId: "seed:workflow:setup:generate-project-context:mver_bmad_v1_active",
    },
  ] satisfies readonly ContextFactWorkflowRefSeedRow[],
  contextFactWorkUnitReferences: [
    {
      id: `${baseId}:ctx:wu-ref`,
      contextFactDefinitionId: `${baseId}:ctx:def:wu-ref`,
      workUnitTypeKey: "research",
    },
  ] satisfies readonly ContextFactWorkUnitRefSeedRow[],
  contextFactArtifactReferences: [
    {
      id: `${baseId}:ctx:artifact-ref`,
      contextFactDefinitionId: `${baseId}:ctx:def:artifact-ref`,
      artifactSlotKey: "setup_readme",
    },
  ] satisfies readonly ContextFactArtifactRefSeedRow[],
  contextFactDraftSpecs: [
    {
      id: `${baseId}:ctx:draft-spec`,
      contextFactDefinitionId: `${baseId}:ctx:def:draft-spec`,
    },
  ] satisfies readonly ContextFactDraftSpecSeedRow[],
  contextFactDraftSpecFields: [
    {
      id: `${baseId}:ctx:draft-spec-field`,
      draftSpecId: `${baseId}:ctx:draft-spec`,
      fieldKey: "title",
      valueType: "string",
      required: true,
      descriptionJson: { markdown: "Story draft title candidate." },
    },
  ] satisfies readonly ContextFactDraftSpecFieldSeedRow[],
} as const;
