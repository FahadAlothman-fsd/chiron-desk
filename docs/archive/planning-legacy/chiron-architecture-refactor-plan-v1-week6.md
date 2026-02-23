# Chiron Architecture Refactor Plan v1 (Week 6)

Date: 2026-02-18
Status: Locked architecture consolidation plan

## 1) Canonical Architecture Set (Active)

- `docs/architecture/modules/*.md`
- `docs/architecture/workflow-engine/*.md`
- `docs/architecture/method-workitem-execution-contract.md`
- `docs/architecture/method-workitem-execution-examples.md`
- `_bmad-output/planning-artifacts/chiron-module-lock-matrix-v1-week6.md`
- `_bmad-output/planning-artifacts/chiron-complete-schemas-v2-week6.md`

## 2) Refactor Targets

### Module docs updates

- enforce dependency boundaries from lock matrix.
- clarify provider-registry vs agent-runtime vs ax-engine ownership.
- clarify sandbox/tooling git path.

### Workflow-engine docs updates

- maintain 6-step contracts.
- lock invoke semantics with binding modes.
- document transition lifecycle with two gates only.

### Method/workitem docs updates

- align variable/fact ledger model with schema v2.
- align transition binding authority with `transition_allowed_workflows`.

## 3) Architectural Decisions to Encode Explicitly

1. SQLite-only current horizon.
2. Hono as streaming transport boundary.
3. API is composition/transport only, not runtime-internal orchestrator.
4. Provider policy centralized in provider-registry.
5. AX remains separate engine with explicit promotion path.

## 4) Historical Archive Targets (Architecture)

- Mastra-era migration docs and superseded parity notes to archive folders.
- Keep as historical references only, not active implementation guidance.

## 5) Acceptance Criteria for Architecture Lock

1. No active architecture doc contradicts module lock matrix.
2. Every module has clear responsibility + dependency direction.
3. Invoke semantics and gate semantics are unambiguous.
4. Historical docs are marked non-canonical.
