import {
  methodologyAgentTypeSeedRows,
  methodologyArtifactSlotDefinitionSeedRows,
  methodologyArtifactSlotTemplateSeedRows,
  methodologyFactDefinitionSeedRows,
  methodologyLifecycleStateSeedRows,
  methodologyLifecycleTransitionSeedRows,
  methodologyTransitionConditionSetSeedRows,
  methodologyLinkTypeDefinitionSeedRows,
  methodologyTransitionWorkflowBindingSeedRows,
  workUnitFactDefinitionSeedRows,
  methodologyWorkUnitTypeSeedRows,
  methodologyWorkflowEdgeSeedRows,
  methodologyWorkflowSeedRows,
  methodologyWorkflowStepSeedRows,
} from "./tables";
import {
  brainstormingSeedMetadata,
  researchSeedMetadata,
  setupSeedMetadata,
} from "./setup/setup-bmad-mapping";

export * from "./tables";

export const METHODOLOGY_CANONICAL_TABLE_SEED_ORDER = [
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
] as const;

export const methodologyCanonicalTableSeedRows = {
  methodology_work_unit_types: methodologyWorkUnitTypeSeedRows,
  methodology_agent_types: methodologyAgentTypeSeedRows,
  work_unit_lifecycle_states: methodologyLifecycleStateSeedRows,
  work_unit_lifecycle_transitions: methodologyLifecycleTransitionSeedRows,
  transition_condition_sets: methodologyTransitionConditionSetSeedRows,
  work_unit_fact_definitions: workUnitFactDefinitionSeedRows,
  methodology_artifact_slot_definitions: methodologyArtifactSlotDefinitionSeedRows,
  methodology_artifact_slot_templates: methodologyArtifactSlotTemplateSeedRows,
  methodology_link_type_definitions: methodologyLinkTypeDefinitionSeedRows,
  methodology_workflows: methodologyWorkflowSeedRows,
  methodology_workflow_steps: methodologyWorkflowStepSeedRows,
  methodology_workflow_edges: methodologyWorkflowEdgeSeedRows,
  methodology_transition_workflow_bindings: methodologyTransitionWorkflowBindingSeedRows,
  methodology_fact_definitions: methodologyFactDefinitionSeedRows,
} as const;

export const methodologySeedSlices = {
  slice_a_setup: setupSeedMetadata,
  slice_a_brainstorming: brainstormingSeedMetadata,
  slice_a_research: researchSeedMetadata,
} as const;
