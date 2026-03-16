# Chiron Week 6 Tuesday Finalization Checklist

Date: 2026-02-17  
Status: Active  
Goal: Finish canonical documentation and lock implementation direction today.

## A) Must-Finalize Today (Lock Tonight)

- [ ] Confirm canonical stack section includes: Effect, AI SDK, OpenCode SDK, Hono, oRPC, Tauri, Better-Auth, Drizzle, SQLite, Handlebars, OXC.
- [ ] Approve canonical taxonomy mapping table (legacy + current BMAD sample -> final terms).
- [ ] Approve simplified transition gate model: Start Gate + Completion Gate only.
- [ ] Approve transition lifecycle terms (`UNAVAILABLE`, `AVAILABLE`, `EXECUTING`, `EVALUATING_COMPLETION`, `COMPLETED`, `EXECUTED_NOT_COMPLETED`).
- [ ] Approve deterministic completion constraints (typed outputs + required links + dependency policy + approvals).
- [ ] Approve structured gate diagnostics contract (`code`, `scope`, `blocking`, `required`, `observed`, `remediation`).

## B) Module Relevance Decision (Do Not Restart Blindly)

### Keep as relevant foundations

- [ ] `packages/workflow-engine`: keep execution patterns and step handler architecture as reference core.
- [ ] `packages/agent-runtime`: keep dual runtime adapter model (`chiron` + `opencode`).
- [ ] `packages/contracts`: keep as canonical boundary package, finish Effect Schema alignment.
- [ ] `packages/api`: keep router boundaries, thin orchestration, remove legacy deep internals gradually.

### Rebuild/rewire now (same module names, new internals)

- [ ] `packages/variable-service`: rebuild as canonical scope/merge/promote service with audit semantics.
- [ ] `packages/template-engine`: rebuild strict compose/render + prompt receipt boundary.
- [ ] `packages/tooling-engine`: rebuild as centralized side-effect approval/policy executor.
- [ ] `packages/provider-registry`: rebuild for model/provider/credential policy resolution.
- [ ] `packages/sandbox-engine`: rebuild per-execution isolation + git service boundary.
- [ ] `packages/event-bus`: keep ephemeral transport contract, implement as standalone module.
- [ ] `packages/ax-engine`: keep module boundary, defer advanced optimization behavior.

### Explicitly defer

- [ ] Advanced AX rollout logic and non-critical optimization controls.
- [ ] Non-essential admin surfaces not needed for transition/gate delivery.

## C) Effectful Project Structure Checklist

- [ ] Every module exposes a Tag and a Live Layer (`X`, `XLive`), test layers for deterministic tests.
- [ ] Cross-module dependencies use Tags only (no concrete implementation imports across boundaries).
- [ ] Workflow step handlers depend on service Tags (`ExecutionContext`, variable service, event bus, registry, optional tooling/agent services).
- [ ] Typed domain errors are explicit in Effect error channels (no hidden failure classes in core flow).
- [ ] Resourceful operations use acquire/release safety and scoped lifecycle semantics.
- [ ] Transition evaluation and commit are modeled as deterministic Effects with explicit result ADTs.

## D) SQLite-Only Implementation Constraints

- [ ] Replace active Postgres assumptions in scripts/tests/env docs.
- [ ] Define and index gate-hot JSON paths (or generated columns) for transition checks.
- [ ] Add baseline query-performance checks for transition evaluator operations.
- [ ] Ensure no active code path requires Postgres-specific behavior.

## E) Transition and Gate Contract Completion Checklist

- [ ] Start Gate availability matrix exists for priority work-unit transitions.
- [ ] Completion Gate requirements matrix exists with required `varType`s and link constraints.
- [ ] Dependency strength behavior (`hard`, `soft`, `context`) is documented per transition family.
- [ ] Completion atomicity contract is documented (status + audit + snapshot head update).
- [ ] Failure/remediation examples are documented for at least 3 common blocked cases.

## E.1) Invoke + Methodology Binding Checklist

- [ ] Define invoke `bindingMode` and document both modes: `same_work_unit` and `child_work_units`.
- [ ] Brainstorming pattern documented: techniques fan-out stays under single brainstorming work unit.
- [ ] Story-generation pattern documented: invoke iteration activates/updates separate story work units.
- [ ] Parent completion-gate dependency on child outcomes documented per workflow (all/threshold/selected).
- [ ] Item-scoped invoke failure diagnostics and retry/skip policy documented.
- [ ] Parent -> child invoke input contract documented for elicitation pattern (`topic`, `goals`, `constraints`, optional `scope`, `originWorkUnitRef`).
- [ ] Child -> parent output binding contract documented (`elicitation_summary`, `technique_results`, `decision_notes`, `recommendations`, `evidenceRefs`) and wired into parent completion diagnostics.

## F) Deliverables to Close Today

- [ ] Final `North Star + Non-Negotiables` approved.
- [ ] Final canonical mapping + gate constraints approved.
- [ ] Legacy-to-canonical glossary approved.
- [ ] Module keep/rebuild/defer decisions approved.
- [ ] Week 6->10 implementation brief updated to match these decisions.

## G) Owners (fill before sign-off)

- [ ] PM/Architect owner:
- [ ] Dev owner:
- [ ] PO/SM owner:
- [ ] Approval timestamp:
