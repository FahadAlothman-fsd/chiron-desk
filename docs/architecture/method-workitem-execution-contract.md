# Method-WorkItem-Execution Contract (Phase 1)

**Last Updated:** 2026-02-14  
**Status:** Locked for Phase 1

## Purpose

Define a minimal, deterministic bridge between planning and execution:

- Method defines defaults and sequencing.
- Work items track planning state and dependencies.
- Executions and step outputs provide runtime truth.
- Transitions are checked using required output variable types.

This document is intentionally strict to avoid design drift.

## Scope Boundaries

### User-Definable (Method Layer)

- Work item types
- Work item status model
- Intent taxonomy
- Workflow paths and sequence
- Transition requirements (required output variable types)
- Dependency defaults (`hard | soft | context`)

### System-Fixed (Execution Layer)

- Execution and step execution lifecycle
- Step types (`form | agent | action | invoke | display | branch`)
- Variable scope precedence
- Event/audit/observability invariants
- Explicit control commands (pause/resume/interrupt/approval)

## Core Terms

- `method`: system-level reusable methodology package (for example BMAD).
- `methodVersion`: immutable version of a method.
- `path`: ordered sequence of workflows inside a method.
- `workItemType`: planning type (for example `prd`, `architecture`, `story`).
- `workItem`: project-level instance of a planning item.
- `intent`: per-execution purpose label (metadata used for defaults and reporting).
- `expectedOutputTypes`: required typed outputs for transition checks.

## Data Model (Phase 1)

### Method Registry (System Level)

```sql
methods(
  id, slug, name, visibility, createdAt
)

method_versions(
  id, methodId, version, sourceHash, isPublished, createdAt
)

method_paths(
  id, methodVersionId, key, name, track, description, createdAt
)

method_path_workflows(
  id, methodPathId, workflowKey, phase, sequenceOrder, isOptional, prerequisiteJson
)

method_work_item_types(
  id, methodVersionId, key, name, defaultStatus, allowedStatusesJson, boardLaneKey
)

method_intents(
  id, methodVersionId, key, name, defaultExpectedOutputTypesJson
)

method_transition_rules(
  id, methodVersionId, workItemTypeKey, fromStatus, toStatus,
  requiredOutputTypesJson, blockOnHardDeps, warnOnSoftDeps
)
```

### Project Planning Layer

```sql
projects(
  id, name, methodVersionId, activeMethodPathId, initMode, status, createdAt
)

work_items(
  id, projectId, typeKey, title, status, objective, acceptanceCriteriaJson,
  parentWorkItemId, priority, createdBy, createdAt, updatedAt
)

work_item_links(
  id, projectId, fromWorkItemId, toWorkItemId, relationType, strength, createdAt
)

work_item_executions(
  id, workItemId, executionId, intentKey, expectedOutputTypesJson, createdAt
)
```

### Execution Bridge

```sql
execution_outputs(
  id, executionId, stepExecutionId, varKey, varType, valueRefJson, createdAt
)
```

`execution_outputs` is a normalized ledger of typed output writes used by transition checks.

## Field Definitions (Planning Layer)

### `work_items`

- `typeKey`: work item type key from method version (`prd`, `story`, etc.).
- `status`: current planning state used by board/list views.
- `objective`: short purpose statement; may be agent-drafted then confirmed.
- `acceptanceCriteriaJson`: structured criteria list.
- `parentWorkItemId`: hierarchical relationship (for example story under epic).

### `work_item_links`

- `relationType`: `depends_on | blocks | informed_by | references | parent_of`.
- `strength`:
  - `hard`: blocks transitions when unresolved.
  - `soft`: warns on transition, does not hard-block by default.
  - `context`: informational/reference only.

### `work_item_executions`

- `intentKey`: execution purpose label chosen for this run.
- `expectedOutputTypesJson`: required variable types for this run (resolved default + overrides).

## Context Resolution Contract

At execution start, system builds immutable `ExecutionContextSnapshot` using:

1. method defaults (types/intents/path/rules)
2. project variables and active path
3. work item data + dependency links
4. workflow and step config

Agent receives compact snapshot and can retrieve extra context with tools.

## Agent Context Retrieval Tools (Phase 1)

- `ctx.list(scope)`
- `ctx.get(scope,key)`
- `ctx.get_many(scope,keys[])`
- `ctx.search(scope,query)`

Guardrails:

- scoped reads only
- typed keys only
- auditable retrieval log
- per-run retrieval budget

## Transition Evaluation (Deterministic)

To move a work item from `fromStatus -> toStatus`, evaluator checks:

1. transition rule exists for `workItemTypeKey`
2. required output variable types are present in `execution_outputs` for linked runs
3. dependency policy result (`hard` blocks, `soft` warns, `context` ignored for blocking)

No free-form evidence taxonomy is required in phase 1.

## Rigorous Examples (TaskFlow)

Rigorous examples are maintained in:

- `docs/architecture/method-workitem-execution-examples.md`

## What This Solves

- preserves method-level planning semantics
- keeps execution deterministic
- avoids vague enforcement systems
- supports both project-coupled and standalone workflows

## Open Decisions

- None for phase 1.
