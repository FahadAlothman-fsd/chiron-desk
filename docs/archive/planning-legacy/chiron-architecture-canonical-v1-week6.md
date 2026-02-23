# Chiron Architecture Canonical v1 (Week 6)

Date: 2026-02-18
Status: Canonical architecture reference for reset + rebuild

## 1) Architectural Core

Chiron is an Effect-based orchestration platform with a methodology-first domain model.

Core concepts:

- work units (typed planning/execution entities)
- transitions (state changes)
- gates (`start_gate`, `completion_gate` only)
- slots/snapshots (typed artifact state)
- transition-bound workflow execution

## 2) Execution Boundary Contracts

### Locked step capabilities

- `form`
- `agent`
- `action`
- `invoke`
- `branch`
- `display`

### Gate semantics

- `start_gate`: availability to begin transition execution.
- `completion_gate`: eligibility to complete transition and persist state change.

No additional gate class is allowed in this horizon.

## 3) Module Responsibilities (Canonical)

- `workflow-engine`
  - orchestrates step execution and transition lifecycle.
- `methodology-engine`
  - owns work-unit/transition/slot/gate domain services.
- `agent-runtime`
  - executes Chiron and OpenCode runtime adapters.
- `provider-registry`
  - owns provider/model policy, resolution, and usage policy boundaries.
- `tooling-engine`
  - side-effect policy/approval orchestration.
- `sandbox-engine`
  - worktree + git boundary (`simple-git` adapter implementation in this module).
- `variable-service`
  - scoped variable operations and resolution support.
- `template-engine`
  - template compose/render/prompt receipt responsibilities.
- `event-bus`
  - ephemeral event transport.
- `ax-engine`
  - optimization/recommendation engine with explicit promotion flow.

## 4) Dependency Direction (Canonical)

- `contracts` at the center as shared Effect Schema boundary.
- `api` is transport/composition boundary, not runtime-internal orchestrator.
- `provider-registry` policy is upstream of `agent-runtime` and `ax-engine`.
- `workflow-engine` consumes service interfaces, not concrete cross-module internals.

## 5) Persistence and Data Model

- DB: SQLite-only in this implementation horizon.
- ORM: Drizzle.
- Methodology schema model follows:
  - methodology/version definitions
  - work-unit types and transitions
  - workflow definition and transition-allowed bindings
  - transition attempts + gate evaluations
  - execution outputs ledger
  - slot definitions/snapshot versions/heads
  - variable definitions + values/history

## 6) Workflow Binding Model

- Workflows scoped by `methodologyVersion + workUnitType`.
- Transitions define allowed executable workflows.
- Invoke modes:
  - `same_work_unit` for techniques/subroutines
  - `child_work_units` for lifecycle fan-out entities

## 7) Streaming and Runtime Transport

- Hono is the streaming/transport edge for execution updates.
- SSE/event streams deliver live agent/step/runtime signals.
- tRPC remains the typed control/query surface.

## 8) Migration/Cutover Posture

- Backend-first cutover.
- Frontend wiring follows stabilized backend contracts.
- Historical docs retained in archive, non-canonical for implementation decisions.

## 9) Companion Canonical Docs

- `chiron-foundational-docs-lock-v1-week6.md`
- `chiron-module-lock-matrix-v1-week6.md`
- `chiron-complete-schemas-v2-week6.md`
- `chiron-prd-canonical-v1-week6.md`
