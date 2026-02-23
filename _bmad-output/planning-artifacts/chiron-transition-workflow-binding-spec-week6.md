# Chiron Transition Workflow Binding Spec (Week 6)

Date: 2026-02-17  
Status: Draft for same-day lock

## 1) Goal

Define how workflows are scoped to work units, how transitions choose what can run, and how `invoke` executes child workflows without creating model ambiguity.

This spec aligns with:

- Methodology-first execution
- Two-gate transition model only (`Start Gate`, `Completion Gate`)
- SQLite-only horizon
- Carry-over of AX-based workflow selection

## 2) Core Model

### 2.1 Ownership and binding

1. Workflow definitions are scoped under `methodologyVersion + workUnitType`.
2. Each transition edge binds one primary workflow (transition driver).
3. Each transition edge also defines a set of allowed invoked workflows.
4. Child workflows are referenced by ID/key; their step configs are defined once in workflow registry.

### 2.2 No static workflow kind required

Do not add a hardcoded enum such as `kind=technique` as an authorization mechanism.

Use explicit transition bindings for authority:

- "this workflow is primary for this edge"
- "these workflows are allowed to be invoked on this edge"

Metadata tags can still exist for UX/search only.

## 3) SQLite Data Model (minimal)

### 3.1 `workflow_definitions`

- `id` (pk)
- `methodology_version_id` (fk)
- `owner_work_unit_type` (text)
- `key` (unique per methodology version)
- `name`
- `description`
- `definition_json` (step graph/config)
- `enabled` (boolean)

Indexes:

- `(methodology_version_id, owner_work_unit_type)`
- `(methodology_version_id, key)` unique

### 3.2 `transition_primary_workflows`

- `id` (pk)
- `methodology_version_id` (fk)
- `work_unit_type`
- `from_status`
- `to_status`
- `workflow_definition_id` (fk)

Constraints:

- Unique on `(methodology_version_id, work_unit_type, from_status, to_status)`

### 3.3 `transition_allowed_workflows`

- `id` (pk)
- `methodology_version_id` (fk)
- `work_unit_type`
- `from_status`
- `to_status`
- `workflow_definition_id` (fk)
- `priority` (int, optional)
- `enabled` (boolean)

Indexes:

- `(methodology_version_id, work_unit_type, from_status, to_status, enabled)`
- `(workflow_definition_id)`

## 4) Runtime Retrieval Contract

Given transition context `(methodologyVersion, workUnitType, fromStatus, toStatus)`:

1. Resolve primary workflow from `transition_primary_workflows`.
2. Resolve allowed child workflows from `transition_allowed_workflows`.
3. Return options to agent selection step with `id`, `key`, `name`, `description`, `priority`.

This replaces generic tag-based option retrieval.

## 5) AX Selection (carry-over lesson preserved)

### 5.1 Selection step behavior

- Keep `ax-generation` tool in parent workflow.
- Source options from transition-allowed query above.
- Require structured output.

Structured output schema:

```json
{
  "type": "object",
  "required": ["selected_workflow_ids"],
  "properties": {
    "selected_workflow_ids": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "reasoning": { "type": "string" }
  }
}
```

Validation rules:

- all selected IDs must be in allowed set for transition context
- no duplicates
- enforce max selectable limit if configured

If validation fails after retries, transition remains `EXECUTED_NOT_COMPLETED` with structured diagnostics.

## 6) Invoke Binding Modes

### 6.1 `same_work_unit` (default for brainstorming techniques)

- Child executions inherit same `workUnitId` as parent.
- Each child has independent `executionId` and `parentExecutionId`.
- Outputs are namespaced into parent evidence.
- No new work units created.

### 6.2 `child_work_units` (for fan-out creation flows)

- Use when each iteration item is a true lifecycle entity (e.g., stories under epic).
- For each item, create/bind child work unit, then run configured workflow.
- Parent completion can depend on all/threshold child outcomes.

## 7) Two-Gate Transition Semantics

### 7.1 Start Gate

Checks before execution:

- transition edge exists
- primary workflow exists and is enabled
- policy/fact preconditions satisfied

Result:

- `AVAILABLE` or `UNAVAILABLE` with machine-readable reasons.

### 7.2 Completion Gate

Checks before state move:

- required typed outputs exist
- required links/dependency constraints pass (`hard` blocks, `soft` warns, `context` info)
- required approvals are resolved
- if transition requires child workflow outcomes, they satisfy configured rule

Result:

- `COMPLETED` (state transition applied) or `EXECUTED_NOT_COMPLETED` with remediation diagnostics.

## 8) Effectful Service Boundaries

### `packages/methodology-engine`

- `WorkflowBindingService`
  - resolvePrimaryWorkflow
  - listAllowedWorkflows
  - validateSelectionAgainstAllowedSet
- `TransitionGateService`
  - checkStartGate
  - checkCompletionGate

### `packages/workflow-engine`

- consumes above services via Tags
- executes primary workflow
- runs invoke with binding mode
- applies transition finalization only after completion gate pass

### `packages/agent-runtime`

- supports structured output for selection steps
- returns typed validation failures to workflow engine

## 9) Documentation Lock Items (Tonight)

- Transition binding model approved
- Allowed-workflow retrieval contract approved
- AX structured selection schema approved
- Invoke mode semantics approved
- Two-gate transition wording approved

## 10) Recommended Default Decisions (for Tuesday lock)

Use these defaults unless explicitly overridden:

1. `transition_primary_workflows` must have exactly one active row per transition edge.
2. `transition_allowed_workflows` defaults to non-empty for edges using technique selection.
3. AX selection cardinality default: `min=1`, `max=3` workflows.
4. `invoke` default binding mode: `same_work_unit`.
5. Parent completion rule default for brainstorming: "at least one selected workflow completed successfully and required aggregate output exists".
6. Child error policy default in brainstorming invoke: `continue` with per-item diagnostics.

## 11) Immediate Migration Path from Current Seeds

Current seed pattern is already close and should be adapted, not replaced:

1. Keep technique workflow definitions in `packages/scripts/src/seeds/techniques/*.ts`.
2. Keep parent brainstorming selection tool in `packages/scripts/src/seeds/brainstorming.ts`.
3. Replace option query source from tag filter (`tags.type=technique`) to transition-allowed binding query.
4. Add structured output schema validation to selection response.
5. Validate selected IDs against allowed set before invoke.
6. Preserve `invoke` output namespacing for completion gate evidence checks.
