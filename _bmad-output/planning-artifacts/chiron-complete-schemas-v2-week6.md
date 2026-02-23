# Chiron Complete Schemas v2 (SQLite, Methodology-First)

Date: 2026-02-18
Status: Draft for lock
Goal: Full schema catalog with low-level field types, including new methodology layer and required updates to existing runtime schemas.

## 1) Design Decisions Locked from This Review

1. Transition model uses two gates only: `start_gate` and `completion_gate`.
2. Workflows are scoped to `methodology_version + work_unit_type`.
3. Transition workflow authority comes from transition bindings, not static workflow kind enums.
4. `transition_allowed_workflows` is source-of-truth for what can run in a transition.
5. `transition_primary_workflows` is removed (optional later if needed).
6. State ledger is work-unit-type scoped (not methodology-wide mutable state).
7. Methodology defines variable/fact ledger definitions; project stores values and history.
8. `execution_outputs` is append-only evidence ledger, not "current variable store".
9. `gate_diagnostics` is persisted on failures/warnings only (not every check), optional but recommended.
10. Reversion is append-only (step revision and execution branch), never destructive overwrite.

## 2) SQLite Type Conventions

- `id`: `text`
- boolean: `integer` (`0|1`)
- datetime: `integer` (epoch ms)
- enum-like values: `text`
- complex definitions: `json`
- hashes/digests: `text`

## 3) Methodology Definition Schemas

### 3.1 `methodology_definitions`

Purpose: methodology identity.

Fields:
- `id`: text
- `key`: text
- `name`: text
- `description_json`: json
- `created_at`: integer
- `updated_at`: integer

`description_json` shape (expand later):
- `short`: text
- `long`: text
- `agent`: text

Indexes:
- unique: `key`

### 3.2 `methodology_versions`

Purpose: immutable methodology version records.

Fields:
- `id`: text
- `methodology_id`: text
- `version`: text
- `status`: text
- `upgrade_policy`: text
- `min_supported_from_version`: text nullable
- `definition_json`: json
- `created_at`: integer
- `retired_at`: integer nullable

`status` values:
- `draft`
- `active`
- `deprecated`
- `retired`

`definition_json` purpose:
- one frozen snapshot payload for this version (high-level version bundle metadata), not runtime state.

Indexes:
- unique: (`methodology_id`, `version`)
- index: (`methodology_id`, `status`)

### 3.3 `project_methodology_pins`

Purpose: explicit project pinning and upgrades.

Fields:
- `id`: text
- `project_id`: text
- `methodology_version_id`: text
- `upgrade_from_pin_id`: text nullable
- `pinned_by_user_id`: text nullable
- `notes_json`: json
- `pinned_at`: integer

Indexes:
- index: (`project_id`, `pinned_at`)

## 4) Methodology Variable/Fact Definition + Values

### 4.1 `methodology_variable_definitions`

Purpose: methodology-defined allowed variables (project facts/vars contract).

Fields:
- `id`: text
- `methodology_version_id`: text
- `key`: text
- `value_type`: text
- `scope`: text
- `description_json`: json
- `required`: integer
- `default_value_json`: json nullable
- `validation_json`: json nullable
- `created_at`: integer
- `updated_at`: integer

`scope` values:
- `project`
- `work_unit`
- `execution`

Indexes:
- unique: (`methodology_version_id`, `key`)
- index: (`methodology_version_id`, `scope`)

### 4.2 `project_variable_values`

Purpose: current values by project for methodology-defined project-scope vars.

Fields:
- `id`: text
- `project_id`: text
- `methodology_variable_definition_id`: text
- `value_json`: json
- `source`: text
- `updated_by_execution_id`: text nullable
- `updated_by_step_execution_id`: text nullable
- `updated_at`: integer

Indexes:
- unique: (`project_id`, `methodology_variable_definition_id`)
- index: (`project_id`)

### 4.3 `project_variable_history`

Purpose: append-only history of project variable changes.

Fields:
- `id`: text
- `project_id`: text
- `methodology_variable_definition_id`: text
- `previous_value_json`: json nullable
- `new_value_json`: json
- `source`: text
- `changed_by_execution_id`: text nullable
- `changed_by_step_execution_id`: text nullable
- `changed_at`: integer

Indexes:
- index: (`project_id`, `changed_at`)
- index: (`methodology_variable_definition_id`, `changed_at`)

## 5) Work Unit Type + Transition Definition Schemas

### 5.1 `work_unit_type_definitions`

Purpose: work-unit type definitions with state ledger.

Fields:
- `id`: text
- `methodology_version_id`: text
- `key`: text
- `name`: text
- `description_json`: json
- `state_ledger_json`: json
- `slot_policy_json`: json nullable
- `created_at`: integer
- `updated_at`: integer

Note:
- `default_status` removed.
- activation to different initial states is expressed by transitions from reserved state.

Indexes:
- unique: (`methodology_version_id`, `key`)

### 5.2 `work_unit_transition_definitions`

Purpose: transition edges for each work-unit type.

Fields:
- `id`: text
- `methodology_version_id`: text
- `work_unit_type_id`: text
- `from_state`: text
- `to_state`: text
- `transition_key`: text
- `start_gate_requirements_json`: json
- `completion_gate_requirements_json`: json
- `transition_policy_json`: json nullable
- `enabled`: integer
- `created_at`: integer
- `updated_at`: integer

Notes:
- `is_activation` removed.
- Activation can be represented as `from_state = "__absent__"`.
- Guard definitions are explicit fields (not hidden in generic metadata).

Indexes:
- unique: (`methodology_version_id`, `work_unit_type_id`, `from_state`, `to_state`)
- index: (`methodology_version_id`, `work_unit_type_id`)

## 6) Workflow Definition + Transition Binding Schemas

### 6.1 `workflow_definitions`

Purpose: reusable workflows under work-unit ownership.

Fields:
- `id`: text
- `methodology_version_id`: text
- `owner_work_unit_type_id`: text
- `key`: text
- `name`: text
- `description_json`: json
- `definition_json`: json
- `metadata_json`: json nullable
- `enabled`: integer
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: (`methodology_version_id`, `key`)
- index: (`methodology_version_id`, `owner_work_unit_type_id`, `enabled`)

### 6.2 `transition_allowed_workflows`

Purpose: source-of-truth for workflows allowed on a transition.

Fields:
- `id`: text
- `transition_definition_id`: text
- `workflow_definition_id`: text
- `priority`: integer nullable
- `enabled`: integer
- `binding_defaults_json`: json nullable
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: (`transition_definition_id`, `workflow_definition_id`)
- index: (`transition_definition_id`, `enabled`, `priority`)

`binding_defaults_json` use:
- default invoke binding mode for this transition-workflow pair
- selection cardinality hints

## 7) Work Unit Runtime Schemas

### 7.1 `work_units`

Purpose: runtime/planning unit instances.

Fields:
- `id`: text
- `project_id`: text
- `methodology_version_id`: text
- `work_unit_type_id`: text
- `key`: text
- `title`: text
- `objective`: text nullable
- `state`: text
- `priority`: integer nullable
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: (`project_id`, `key`)
- index: (`project_id`, `work_unit_type_id`, `state`)

### 7.2 `methodology_link_type_definitions`

Purpose: methodology-defined allowed link/dependency types.

Fields:
- `id`: text
- `methodology_version_id`: text
- `key`: text
- `description_json`: json
- `allowed_strengths_json`: json
- `created_at`: integer
- `updated_at`: integer

Indexes:
- unique: (`methodology_version_id`, `key`)

### 7.3 `work_unit_links`

Purpose: runtime graph edges between work units.

Fields:
- `id`: text
- `project_id`: text
- `source_work_unit_id`: text
- `target_work_unit_id`: text
- `link_type_definition_id`: text
- `strength`: text
- `meta_json`: json nullable
- `created_by_execution_id`: text nullable
- `created_by_step_execution_id`: text nullable
- `created_at`: integer
- `updated_at`: integer

`meta_json` use:
- relation context details (for example: epic created story list item index, import source, rationale)

Indexes:
- unique: (`source_work_unit_id`, `target_work_unit_id`, `link_type_definition_id`)
- index: (`project_id`, `target_work_unit_id`, `strength`)

## 8) Transition Execution + Evidence Schemas

### 8.1 `work_unit_transition_attempts`

Purpose: transition lifecycle records.

Fields:
- `id`: text
- `project_id`: text
- `work_unit_id`: text
- `transition_definition_id`: text
- `workflow_execution_id`: text nullable
- `status`: text
- `started_at`: integer nullable
- `ended_at`: integer nullable
- `meta_json`: json nullable
- `created_at`: integer
- `updated_at`: integer

`status` values:
- `created`
- `running`
- `waiting`
- `completed`
- `executed_not_completed`
- `failed`
- `cancelled`

Indexes:
- index: (`work_unit_id`, `status`)
- index: (`transition_definition_id`, `status`)
- index: (`workflow_execution_id`)

### 8.2 `execution_outputs`

Purpose: append-only typed outputs/events generated during execution steps and used as completion evidence.

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

Scope note:
- keep for execution evidence and step outputs.
- do not use as sole current-value source for project variables/facts.

Indexes:
- index: (`workflow_execution_id`, `var_type`)
- index: (`transition_attempt_id`, `var_type`)
- index: (`work_unit_id`, `var_type`)

## 9) Slot/Snapshot Schemas

### 9.1 `slot_definitions`

Purpose: slot catalog by work-unit type.

Fields:
- `id`: text
- `methodology_version_id`: text
- `work_unit_type_id`: text
- `slot_key`: text
- `value_type`: text
- `head_policy`: text
- `description_json`: json nullable
- `created_at`: integer
- `updated_at`: integer

`head_policy` values:
- `single_head`
- `multi_head`

Note:
- removed `required_on_transitions`; transition gates own requirement definitions.

Indexes:
- unique: (`methodology_version_id`, `work_unit_type_id`, `slot_key`)

### 9.2 `slot_snapshot_versions`

Purpose: immutable version history for each slot.

Fields:
- `id`: text
- `project_id`: text
- `work_unit_id`: text
- `slot_definition_id`: text
- `snapshot_version`: integer
- `digest`: text
- `artifact_ref_json`: json
- `meta_json`: json nullable
- `created_by_execution_id`: text nullable
- `created_by_step_execution_id`: text nullable
- `created_at`: integer

`digest` use:
- content hash (or normalized payload hash) for change detection, dedup checks, and stale/suspect propagation triggers.

Indexes:
- unique: (`work_unit_id`, `slot_definition_id`, `snapshot_version`)
- index: (`work_unit_id`, `slot_definition_id`, `created_at`)
- index: (`digest`)

### 9.3 `slot_heads`

Purpose: fast pointer to current snapshot head(s).

Fields:
- `id`: text
- `project_id`: text
- `work_unit_id`: text
- `slot_definition_id`: text
- `head_label`: text
- `slot_snapshot_version_id`: text
- `updated_at`: integer

Why separate table:
- proven pattern for immutable history + efficient current read.
- avoids rewriting large version rows.

Indexes:
- unique: (`work_unit_id`, `slot_definition_id`, `head_label`)

## 10) Gate Evaluation Persistence

### 10.1 `gate_evaluations`

Purpose: persisted gate outcomes for audit/debug and blocked transition UX.

Fields:
- `id`: text
- `transition_attempt_id`: text
- `gate_scope`: text
- `decision`: text
- `rules_hash`: text nullable
- `summary_json`: json
- `failed_findings_json`: json nullable
- `created_at`: integer

Policy:
- persist `decision=block|warn` always.
- persist `decision=pass` optionally sampled or omitted.

Indexes:
- index: (`transition_attempt_id`, `gate_scope`, `decision`)

## 11) Existing Runtime Schemas to Keep and Modify

These already exist and should be carried over with changes.

### 11.1 `workflow_executions` (existing)

Keep and add fields:
- add `methodology_version_id`: text
- add `work_unit_id`: text nullable
- keep `parentExecutionId` for invoke lineage

### 11.2 `step_executions` (existing)

Keep and formalize reversion fields already present:
- `revisionOfStepExecutionId`: text nullable
- `parentStepExecutionId`: text nullable
- `isActive`: integer

Add:
- `supersededByStepExecutionId`: text nullable
- `revisionReason`: text nullable

### 11.3 `chat_sessions` + `chat_messages` (existing)

Keep and add continuation lineage support:
- `chat_sessions.continuity_key`: text nullable
- `chat_sessions.parent_session_id`: text nullable
- `chat_sessions.is_active_lineage`: integer

### 11.4 `variables` + `variable_history` (existing)

Keep for execution/runtime variable system.
Add scope fields if not already represented:
- `scope_type`: text
- `scope_id`: text

Use with methodology variable definitions for type-safe projection.

### 11.5 `approval_audit`, `user_approval_settings` (existing)

Keep as-is and map approval outcomes into completion gate checks where required.

### 11.6 AX schemas (existing `training_examples`, `optimization_runs`, `ace_playbooks`, `mipro_training_examples`)

Keep and add optional transition/work-unit references:
- `methodology_version_id`: text nullable
- `work_unit_type_id`: text nullable
- `transition_definition_id`: text nullable

## 12) Invoke Binding Extension (workflow step config JSON)

Add fields to invoke step config definition:
- `bindingMode`: text (`same_work_unit` | `child_work_units`)
- `childWorkUnitTypeKey`: text nullable
- `activationTransitionKey`: text nullable
- `childOutcomePolicyJson`: json nullable

Behavior:
- brainstorming techniques: `same_work_unit`
- story fan-out from epic: `child_work_units`

## 13) Reversion Semantics (Schema-Level)

1. Revert is append-only revision, not delete/overwrite.
2. A revised step creates new `step_execution` row linked by `revisionOfStepExecutionId`.
3. Prior revised step row remains immutable and `isActive=0`.
4. Chat continuation across revised steps uses `parent_session_id` + `continuity_key` lineage.
5. If downstream side effects exist, create new execution branch (`workflow_executions.parentExecutionId`) instead of unsafe in-place rewind.

## 14) Open Items to Lock Next

1. Reserved activation state token exact value (`__absent__` vs other).
2. Final JSON shape for gate requirements (`start_gate_requirements_json`, `completion_gate_requirements_json`).
3. Allowed variable primitive set (`string|number|boolean|json|ref` etc.).
4. Pass sampling policy for `gate_evaluations`.
5. Minimum required fields in `workflow_definitions.metadata_json` for filtering and selection UX.

## 15) Lessons Pulled from Existing Schemas (full scan)

This v2 model intentionally carries forward useful patterns already present in repo:

1. `step_executions` already has revision primitives (`isActive`, `revisionOfStepExecutionId`, `parentStepExecutionId`).
   - v2 extends this rather than replacing it.
2. `workflow_executions` already supports parent-child invoke lineage (`parentExecutionId`) and execution state snapshots (`variables`, `executedSteps`).
   - v2 keeps this and adds methodology/work-unit references.
3. `chat_sessions` and `chat_messages` already model step-level conversation history.
   - v2 adds explicit continuity lineage fields for safe reversion/continuation.
4. `stream_checkpoints` is useful for interrupted stream recovery.
   - v2 keeps it unchanged structurally.
5. `approval_audit` and `user_approval_settings` are already strong for gate-related approval evidence.
   - v2 keeps and maps them into completion-gate requirements.
6. Existing `step-configs.ts` invoke config is legacy (`workflowsToInvoke`, `variableMapping`, aggregate output).
   - v2 introduces invoke binding extension (`bindingMode`, `childWorkUnitTypeKey`, `activationTransitionKey`).
7. Existing optimization schemas (`training_examples`, `optimization_runs`, ACE tables) are worth preserving.
   - v2 adds optional methodology/work-unit/transition references rather than replacing AX tables.
8. Existing `core.ts` path-oriented tables (`workflow_paths`, `workflow_path_workflows`, `project_state`) represent previous orchestration model.
   - v2 should mark these as legacy-compatible while methodology transition flow becomes primary path.
