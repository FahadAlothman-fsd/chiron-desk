import { schema } from "@chiron/db";

export type MethodologyWorkUnitTypeSeedRow = typeof schema.methodologyWorkUnitTypes.$inferInsert;
export type MethodologyAgentTypeSeedRow = typeof schema.methodologyAgentTypes.$inferInsert;
export type MethodologyLifecycleStateSeedRow = typeof schema.workUnitLifecycleStates.$inferInsert;
export type MethodologyLifecycleTransitionSeedRow =
  typeof schema.workUnitLifecycleTransitions.$inferInsert;
export type MethodologyTransitionConditionSetSeedRow =
  typeof schema.transitionConditionSets.$inferInsert;
export type MethodologyFactSchemaSeedRow = typeof schema.methodologyFactSchemas.$inferInsert;
export type MethodologyFactDefinitionSeedRow =
  typeof schema.methodologyFactDefinitions.$inferInsert;
export type MethodologyWorkflowSeedRow = typeof schema.methodologyWorkflows.$inferInsert;
export type MethodologyWorkflowStepSeedRow = typeof schema.methodologyWorkflowSteps.$inferInsert;
export type MethodologyWorkflowEdgeSeedRow = typeof schema.methodologyWorkflowEdges.$inferInsert;
export type MethodologyTransitionWorkflowBindingSeedRow =
  typeof schema.methodologyTransitionWorkflowBindings.$inferInsert;

const methodologyVersionId = "mver_bmad_project_context_only_draft";

function toDescriptionJson(markdown: string) {
  return {
    human: { markdown },
    agent: { markdown },
  };
}

function toGuidanceJson(markdown: string) {
  return {
    human: { markdown },
    agent: { markdown },
  };
}

export const setupWorkUnitTypeSeedRows: readonly MethodologyWorkUnitTypeSeedRow[] = [];
export const setupAgentTypeSeedRows: readonly MethodologyAgentTypeSeedRow[] = [];
export const setupLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] = [];
export const setupLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  [];
export const setupTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  [];
export const setupFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] = [];
export const setupWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] = [];
export const setupWorkflowStepSeedRows: readonly MethodologyWorkflowStepSeedRow[] = [];
export const setupWorkflowEdgeSeedRows: readonly MethodologyWorkflowEdgeSeedRow[] = [];
export const setupTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  [];

export const setupFactDefinitionSeedRows: readonly MethodologyFactDefinitionSeedRow[] = [
  {
    id: "seed:fact-def:communicationLanguage",
    methodologyVersionId,
    name: "Communication Language",
    key: "communicationLanguage",
    valueType: "string",
    descriptionJson: toDescriptionJson("Language used for agent responses."),
    guidanceJson: toGuidanceJson(
      "Loaded from runtime communication context for methodology-level defaults.",
    ),
    defaultValueJson: "{{communication_language}}",
    validationJson: { rules: [] },
  },
  {
    id: "seed:fact-def:documentOutputLanguage",
    methodologyVersionId,
    name: "Document Output Language",
    key: "documentOutputLanguage",
    valueType: "string",
    descriptionJson: toDescriptionJson("Language used for generated documentation."),
    guidanceJson: toGuidanceJson(
      "Loaded from runtime document-output policy for methodology-level defaults.",
    ),
    defaultValueJson: "{{document_output_language}}",
    validationJson: { rules: [] },
  },
];

export const setupSeedMetadata = {
  methodologyVersionId,
  slice: "baseline_metadata",
  workUnitKeys: [] as string[],
  workflowKeys: [] as string[],
  sourceRefs: ["docs/plans/2026-03-20-story-3-2-l2-implementation-plan.md"],
} as const;
