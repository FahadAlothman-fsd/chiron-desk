# Workflow Engine Parity Checklist

**Last Updated:** 2026-02-09  
**Status:** Active drift-control checklist

This checklist tracks parity between the standalone runtime in `@chiron/workflow-engine` and the legacy execution/state path still used in `@chiron/api`.

## Current Gap (Verified)

- Standalone runtime (`packages/workflow-engine/src/services/workflow-engine.ts`) is in-memory orchestration.
- Execution context (`packages/workflow-engine/src/services/execution-context.ts`) is in-memory `Ref` state.
- DB-backed execution state and step records are still primarily handled by legacy `packages/api/src/services/workflow-engine/state-manager.ts` and legacy executor wiring.
- History rows are retained in DB (`isActive` toggling), but revision-chain links (`revisionOfStepExecutionId`, `parentStepExecutionId`) are not fully wired for all retry/revert flows.

## Target Behavior

1. `@chiron/workflow-engine` is the primary runtime path.
2. Every step attempt creates a new immutable `step_executions` row.
3. Exactly one active row per `(executionId, stepId)` (or `(executionId, stepNumber)` based on final invariant choice).
4. Revisions are explicit via `revisionOfStepExecutionId`.
5. Reverts create new revision rows (do not mutate/delete old rows).
6. Variable changes are auditable through `variables` + `variable_history`.
7. Router path in `packages/api/src/routers/workflows.ts` delegates to standalone runtime composition, not legacy executor/state manager logic.

## Invariants To Enforce

- **Immutability:** prior `step_executions` rows are never overwritten to represent new attempts.
- **Single Active Attempt:** one and only one `isActive=true` attempt per active step in an execution.
- **Revision Lineage:** retries and reverts set `revisionOfStepExecutionId` to the prior attempt they supersede.
- **Deterministic Revert:** revert operation creates a new active row whose effective output matches the chosen historical attempt.
- **Audit Preservation:** all variable mutations produce `variable_history` rows with source and step context.

## Implementation Checklist

### A) Add Persistence Boundary In Standalone Runtime

- [ ] Introduce a persistence service interface in `@chiron/workflow-engine` (Effect Tag) for execution + step records.
- [ ] Add DB-backed live layer in API composition (or dedicated package) and inject into `WorkflowEngineRuntimeLive`.
- [ ] Move step start/complete/fail/pause writes out of legacy state-manager flow.

### B) Step Execution Revision Semantics

- [ ] On new step attempt: deactivate current active row and insert new active row.
- [ ] Populate `revisionOfStepExecutionId` for retries/re-runs.
- [ ] Populate `parentStepExecutionId` only where explicit parent-child attempt trees are required.
- [ ] Standardize one key for active uniqueness (`stepId` preferred if stable; otherwise `stepNumber` with strict mapping).

### C) Revert Semantics

- [ ] Add explicit `revertStepExecution` operation in runtime service boundary.
- [ ] Revert creates a new active revision row linked to selected historical row.
- [ ] Revert recomputes/applies variable state and appends `variable_history` entries.
- [ ] Preserve prior active row as historical (`isActive=false`).

### D) API Router Cutover

- [ ] Switch execution endpoints in `packages/api/src/routers/workflows.ts` to standalone runtime composition path.
- [ ] Keep compatibility adapters temporarily; remove direct legacy state-manager writes once parity passes.
- [ ] Mark old state-manager paths deprecated and remove after burn-in window.

### E) Tests (Must Pass Before Cutover)

- [ ] Retry creates new row + deactivates previous + sets revision link.
- [ ] Revert creates new row (not overwrite) + deactivates previous active.
- [ ] Exactly one active step execution per key constraint.
- [ ] Variable history records every mutation for retry/revert flows.
- [ ] API endpoints return consistent execution view after cutover.

## Cutover Gate

Cut over only when all are true:

- [ ] Standalone runtime writes execution + step state through persistence boundary.
- [ ] Router uses standalone path for execute/continue/approval flows.
- [ ] Legacy state-manager no longer required for correctness.
- [ ] Regression tests pass for retry/revert/history scenarios.

## Ownership

- Runtime semantics: `@chiron/workflow-engine`
- Persistence adapter + API wiring: `@chiron/api`
- Schema/audit correctness: `@chiron/db`
