import { schema } from "@chiron/db";

import {
  LOCKED_BMAD_METHODOLOGY_FACT_KEYS,
  LOCKED_BMAD_SETUP_WORK_UNIT_FACT_KEYS,
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

export type Slice1FixtureOnlyFactExample = {
  readonly factKey: string;
  readonly seedSource: "work_unit_fact_definition" | "methodology_fact_definition";
  readonly workflowContextFactKind: "definition_backed_external_fact" | "bound_external_fact";
  readonly permanence: "fixture_only";
};

const baseId = "seed:l3-slice-1:setup-project";
const setupStepId = `${baseId}:step:collect-setup`;
const factStepId = `${baseId}:step:collect-facts`;

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
  methodologyWorkflowFormFields: [
    {
      id: `${baseId}:field:setup-step:initiative-name`,
      formStepId: setupStepId,
      key: "initiativeName",
      label: "Initiative name",
      valueType: "string",
      required: true,
      inputJson: { contextFactDefinitionId: "initiative_name" },
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
      inputJson: { contextFactDefinitionId: "workflow_mode" },
      descriptionJson: { markdown: "Routing mode for setup guidance." },
      sortOrder: 0,
    },
  ] satisfies readonly MethodologyWorkflowFormFieldSeedRow[],
} as const;
