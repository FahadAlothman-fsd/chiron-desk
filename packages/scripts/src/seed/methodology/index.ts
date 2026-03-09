import {
  methodologyAgentTypeSeedRows,
  methodologyFactDefinitionSeedRows,
  methodologyFactSchemaSeedRows,
  methodologyLifecycleStateSeedRows,
  methodologyLifecycleTransitionSeedRows,
  methodologyTransitionConditionSetSeedRows,
  methodologyLinkTypeDefinitionSeedRows,
  methodologyTransitionWorkflowBindingSeedRows,
  methodologyWorkUnitTypeSeedRows,
  methodologyWorkflowEdgeSeedRows,
  methodologyWorkflowSeedRows,
  methodologyWorkflowStepSeedRows,
} from "./tables";
import { setupSeedMetadata } from "./setup/setup-bmad-mapping";

export * from "./tables";

export const METHODOLOGY_CANONICAL_TABLE_SEED_ORDER = [
  "methodology_work_unit_types",
  "methodology_agent_types",
  "methodology_lifecycle_states",
  "methodology_lifecycle_transitions",
  "methodology_transition_condition_sets",
  "methodology_fact_schemas",
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
  methodology_lifecycle_states: methodologyLifecycleStateSeedRows,
  methodology_lifecycle_transitions: methodologyLifecycleTransitionSeedRows,
  methodology_transition_condition_sets: methodologyTransitionConditionSetSeedRows,
  methodology_fact_schemas: methodologyFactSchemaSeedRows,
  methodology_link_type_definitions: methodologyLinkTypeDefinitionSeedRows,
  methodology_workflows: methodologyWorkflowSeedRows,
  methodology_workflow_steps: methodologyWorkflowStepSeedRows,
  methodology_workflow_edges: methodologyWorkflowEdgeSeedRows,
  methodology_transition_workflow_bindings: methodologyTransitionWorkflowBindingSeedRows,
  methodology_fact_definitions: methodologyFactDefinitionSeedRows,
} as const;

export const methodologySeedSlices = {
  project_context: setupSeedMetadata,
} as const;
