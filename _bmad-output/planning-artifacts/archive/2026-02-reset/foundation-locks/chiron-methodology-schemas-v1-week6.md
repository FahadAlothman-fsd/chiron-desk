# Chiron Methodology Schemas v1 (SQLite) - Week 6

Date: 2026-02-17  
Status: Draft for implementation lock  
Scope: Methodology layer + transition/workflow binding + gates + invoke selection

## 1) SQLite Conventions (for all schemas)

- `id`: `text` (UUID string)
- `created_at`, `updated_at`: `integer` (unix epoch ms)
- booleans: `integer` (`0|1`)
- enums: `text` + check constraints in app layer first
- variable payloads/complex metadata: `json` (expand later)

## 2) Schema Catalog (DB Tables)

This section lists all proposed tables and low-level fields only.

### 2.1 `methodology_definitions`

Purpose: top-level methodology identity.

Fields:
- `id`: text
- `key`: text
- `name`: text
- `description`: text
- `is_active`: integer
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: `key`
- index: `is_active`

### 2.2 `methodology_versions`

Purpose: versioned methodology snapshots.

Fields:
- `id`: text
- `methodology_id`: text
- `version`: text
- `status`: text
- `effective_at`: integer
- `retired_at`: integer nullable
- `config_json`: json
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: (`methodology_id`, `version`)
- index: (`methodology_id`, `status`)

### 2.3 `work_unit_type_definitions`

Purpose: work-unit type registry per methodology version.

Fields:
- `id`: text
- `methodology_version_id`: text
- `key`: text
- `name`: text
- `description`: text
- `status_ledger_json`: json
- `default_status`: text
- `slot_policy_json`: json
- `link_policy_json`: json
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: (`methodology_version_id`, `key`)
- index: (`methodology_version_id`)

### 2.4 `work_unit_transition_definitions`

Purpose: transition edges for each work-unit type.

Fields:
- `id`: text
- `methodology_version_id`: text
- `work_unit_type_id`: text
- `from_status`: text
- `to_status`: text
- `transition_key`: text
- `is_activation`: integer
- `enabled`: integer
- `metadata_json`: json
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: (`methodology_version_id`, `work_unit_type_id`, `from_status`, `to_status`)
- index: (`methodology_version_id`, `work_unit_type_id`)
- index: `transition_key`

### 2.5 `workflow_definitions`

Purpose: procedure definitions scoped under methodology version + owner work-unit type.

Fields:
- `id`: text
- `methodology_version_id`: text
- `owner_work_unit_type_id`: text
- `key`: text
- `name`: text
- `description`: text
- `definition_json`: json
- `enabled`: integer
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: (`methodology_version_id`, `key`)
- index: (`methodology_version_id`, `owner_work_unit_type_id`)
- index: `enabled`

### 2.6 `transition_primary_workflows`

Purpose: one primary workflow per transition edge.

Fields:
- `id`: text
- `transition_definition_id`: text
- `workflow_definition_id`: text
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: `transition_definition_id`
- unique: (`transition_definition_id`, `workflow_definition_id`)

### 2.7 `transition_allowed_workflows`

Purpose: transition-scoped callable workflow set used by agent selection.

Fields:
- `id`: text
- `transition_definition_id`: text
- `workflow_definition_id`: text
- `priority`: integer nullable
- `enabled`: integer
- `metadata_json`: json
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: (`transition_definition_id`, `workflow_definition_id`)
- index: (`transition_definition_id`, `enabled`)
- index: (`workflow_definition_id`, `enabled`)

### 2.8 `work_units`

Purpose: runtime/planning instances of work-unit types.

Fields:
- `id`: text
- `project_id`: text
- `methodology_version_id`: text
- `work_unit_type_id`: text
- `key`: text
- `title`: text
- `objective`: text
- `status`: text
- `priority`: integer nullable
- `parent_work_unit_id`: text nullable
- `metadata_json`: json
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: (`project_id`, `key`)
- index: (`project_id`, `work_unit_type_id`, `status`)
- index: `parent_work_unit_id`

### 2.9 `work_unit_links`

Purpose: dependency and relation graph between work units.

Fields:
- `id`: text
- `project_id`: text
- `source_work_unit_id`: text
- `target_work_unit_id`: text
- `relation_type`: text
- `strength`: text
- `metadata_json`: json
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: (`source_work_unit_id`, `target_work_unit_id`, `relation_type`)
- index: (`project_id`, `target_work_unit_id`, `strength`)
- index: (`project_id`, `source_work_unit_id`)

### 2.10 `work_unit_transition_attempts`

Purpose: transition execution attempts and lifecycle states.

Fields:
- `id`: text
- `project_id`: text
- `work_unit_id`: text
- `transition_definition_id`: text
- `workflow_execution_id`: text nullable
- `status`: text
- `started_at`: integer nullable
- `completed_at`: integer nullable
- `metadata_json`: json
- `created_at`: integer
- `updated_at`: integer

Indexes:
- index: (`work_unit_id`, `status`)
- index: (`transition_definition_id`, `status`)
- index: `workflow_execution_id`

### 2.11 `transition_start_gate_rules`

Purpose: availability-gate rule set per transition.

Fields:
- `id`: text
- `transition_definition_id`: text
- `required_links_json`: json
- `required_facts_json`: json
- `policy_json`: json
- `enabled`: integer
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: `transition_definition_id`
- index: `enabled`

### 2.12 `transition_completion_gate_rules`

Purpose: completion-gate rule set per transition.

Fields:
- `id`: text
- `transition_definition_id`: text
- `required_output_types_json`: json
- `required_links_json`: json
- `required_approvals_json`: json
- `child_outcome_policy_json`: json
- `policy_json`: json
- `enabled`: integer
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: `transition_definition_id`
- index: `enabled`

### 2.13 `execution_outputs`

Purpose: typed evidence ledger used by completion gate.

Fields:
- `id`: text
- `project_id`: text
- `work_unit_id`: text nullable
- `workflow_execution_id`: text
- `step_execution_id`: text nullable
- `transition_attempt_id`: text nullable
- `var_key`: text
- `var_type`: text
- `value_json`: json
- `created_at`: integer

Indexes:
- index: (`workflow_execution_id`, `var_type`)
- index: (`transition_attempt_id`, `var_type`)
- index: (`work_unit_id`, `var_type`)
- index: (`project_id`, `var_key`)

### 2.14 `slot_definitions`

Purpose: method-defined slot catalog per work-unit type.

Fields:
- `id`: text
- `methodology_version_id`: text
- `work_unit_type_id`: text
- `slot_key`: text
- `value_type`: text
- `head_policy`: text
- `required_on_transitions_json`: json
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: (`methodology_version_id`, `work_unit_type_id`, `slot_key`)
- index: (`work_unit_type_id`)

### 2.15 `slot_snapshot_versions`

Purpose: immutable snapshot history per slot.

Fields:
- `id`: text
- `project_id`: text
- `work_unit_id`: text
- `slot_definition_id`: text
- `snapshot_version`: integer
- `digest`: text
- `artifact_ref_json`: json
- `metadata_json`: json
- `created_by_execution_id`: text nullable
- `created_by_step_execution_id`: text nullable
- `created_at`: integer

Indexes:
- unique: (`work_unit_id`, `slot_definition_id`, `snapshot_version`)
- index: (`work_unit_id`, `slot_definition_id`, `created_at`)
- index: `digest`

### 2.16 `slot_heads`

Purpose: fast pointer to active snapshot head(s).

Fields:
- `id`: text
- `project_id`: text
- `work_unit_id`: text
- `slot_definition_id`: text
- `head_label`: text
- `slot_snapshot_version_id`: text
- `updated_at`: integer

Indexes:
- unique: (`work_unit_id`, `slot_definition_id`, `head_label`)
- index: (`project_id`, `work_unit_id`)

### 2.17 `project_facts`

Purpose: auditable project facts (if stored separate from variable-service values).

Fields:
- `id`: text
- `project_id`: text
- `fact_key`: text
- `fact_value_json`: json
- `source`: text
- `updated_by_execution_id`: text nullable
- `updated_by_step_execution_id`: text nullable
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: (`project_id`, `fact_key`)
- index: (`project_id`)

### 2.18 `gate_diagnostics`

Purpose: structured gate outcomes and remediation hints.

Fields:
- `id`: text
- `transition_attempt_id`: text
- `gate_scope`: text
- `code`: text
- `blocking`: integer
- `required_json`: json
- `observed_json`: json
- `remediation_json`: json
- `created_at`: integer

Indexes:
- index: (`transition_attempt_id`, `gate_scope`)
- index: (`transition_attempt_id`, `blocking`)

## 3) Invoke Config Schema Extension (low-level)

Add to invoke config JSON:

- `bindingMode`: text (`same_work_unit` | `child_work_units`)
- `childWorkUnitTypeKey`: text nullable
- `activationTransitionKey`: text nullable
- `parentCompletionPolicyJson`: json

Notes:
- `same_work_unit` for brainstorming techniques.
- `child_work_units` for fan-out stories/sub-entities.

## 4) AX Selection Structured Output Schema (low-level)

Selection output JSON (validated):

- `selected_workflow_ids`: json (array of text)
- `reasoning`: text nullable

Validation checks:
- all selected IDs must exist in transition allowed set
- no duplicates
- enforce min/max cardinality

## 5) Effect Service Schemas (DTOs)

These are transport/domain DTO shapes (not DB tables).

### 5.1 `StartGateCheckInput`

- `projectId`: text
- `workUnitId`: text
- `transitionDefinitionId`: text
- `workflowExecutionId`: text nullable
- `contextJson`: json

### 5.2 `CompletionGateCheckInput`

- `projectId`: text
- `workUnitId`: text
- `transitionDefinitionId`: text
- `transitionAttemptId`: text
- `workflowExecutionId`: text
- `contextJson`: json

### 5.3 `GateFinding`

- `code`: text
- `scope`: text (`start_gate` | `completion_gate`)
- `blocking`: integer
- `requiredJson`: json
- `observedJson`: json
- `remediationJson`: json

### 5.4 `GateCheckResult`

- `allowed`: integer
- `findingsJson`: json
- `summaryJson`: json

### 5.5 `WorkflowSelectionOption`

- `workflowDefinitionId`: text
- `workflowKey`: text
- `name`: text
- `description`: text nullable
- `priority`: integer nullable
- `metadataJson`: json

### 5.6 `InvokeBindingContext`

- `bindingMode`: text
- `parentWorkUnitId`: text
- `childWorkUnitTypeKey`: text nullable
- `activationTransitionKey`: text nullable
- `itemJson`: json nullable

## 6) Effect Service Interfaces (exact signatures draft)

```ts
export interface WorkflowBindingService {
  resolvePrimaryWorkflow(input: {
    methodologyVersionId: string;
    workUnitTypeId: string;
    fromStatus: string;
    toStatus: string;
  }): Effect.Effect<
    { workflowDefinitionId: string; workflowKey: string },
    WorkflowBindingError
  >;

  listAllowedWorkflows(input: {
    methodologyVersionId: string;
    workUnitTypeId: string;
    fromStatus: string;
    toStatus: string;
  }): Effect.Effect<WorkflowSelectionOption[], WorkflowBindingError>;

  validateSelectionAgainstAllowedSet(input: {
    allowedWorkflowDefinitionIds: string[];
    selectedWorkflowDefinitionIds: string[];
    minSelections?: number;
    maxSelections?: number;
  }): Effect.Effect<void, WorkflowSelectionValidationError>;
}

export interface TransitionGateService {
  checkStartGate(input: StartGateCheckInput): Effect.Effect<GateCheckResult, TransitionGateError>;
  checkCompletionGate(
    input: CompletionGateCheckInput,
  ): Effect.Effect<GateCheckResult, TransitionGateError>;
}

export interface TransitionLifecycleService {
  beginTransition(input: {
    projectId: string;
    workUnitId: string;
    transitionDefinitionId: string;
    requestedBy: string;
  }): Effect.Effect<{ transitionAttemptId: string }, TransitionLifecycleError>;

  completeTransition(input: {
    transitionAttemptId: string;
    workflowExecutionId: string;
  }): Effect.Effect<
    { status: "COMPLETED" | "EXECUTED_NOT_COMPLETED"; findings: GateFinding[] },
    TransitionLifecycleError
  >;
}
```

Notes:
- `completeTransition` is workflow finalization behavior, not a separate user-facing "commit module" concept.
- Keep product language: Start Gate + Completion Gate.

## 7) Minimal Index Priorities for Week 6-10

Prioritize these first for SQLite performance:

- `transition_allowed_workflows(transition_definition_id, enabled)`
- `work_unit_transition_attempts(work_unit_id, status)`
- `execution_outputs(transition_attempt_id, var_type)`
- `execution_outputs(workflow_execution_id, var_type)`
- `work_unit_links(target_work_unit_id, strength)`
- `slot_snapshot_versions(work_unit_id, slot_definition_id, created_at)`
- `slot_heads(work_unit_id, slot_definition_id, head_label)`
