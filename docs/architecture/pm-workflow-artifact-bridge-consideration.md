# PM-Workflow-Artifact Bridge

**Last Updated:** 2026-02-12  
**Status:** Locked for Phase 1

## Purpose

Define how Chiron links PM work items to workflow executions and evidence so progress is derived from observable outcomes, not only manual status edits.

## Decision Lock (2026-02-12)

### 1) PM Entity Model (resolved)

- PM hierarchy is **profile-driven overlay**, not a mandatory global ontology.
- Phase 1 keeps artifact-first behavior and supports BMAD-oriented project views.
- PM state remains first-class and queryable for active profiles (epic/story now; broader types can be added later).

### 2) Minimum Evidence For State Transitions (resolved)

- `todo -> in-progress`: execution started for the linked work item.
- `in-progress -> review`: execution completed with at least one concrete output signal (artifact change, approved tool action, or explicit implementation output).
- `review -> done`: successful verification evidence required (tests/checks or explicit verification step outcome), plus no unresolved blocking failures.
- `any -> blocked`: execution failure, policy denial, or explicit user block decision.

Evidence sources in phase 1:

- workflow lifecycle + step outcomes (`@chiron/workflow-engine`)
- approval outcomes (`@chiron/tooling-engine` / approval audit)
- artifact and git-linked outputs (`@chiron/db`, sandbox/tooling path)
- verification outputs (test/check steps where present)

### 3) Conceptual Progress vs Implementation Reality (resolved)

- Maintain a **dual-view model**:
  - conceptual PM status (work-item lifecycle)
  - implementation reality (execution/evidence timeline)
- Project views must show both and surface drift when they diverge.
- Observability is the durable source for "what actually happened"; PM state is the planning/management projection.

### 4) Runtime vs Read-Model Field Ownership (resolved)

Runtime execution records own:

- execution/step lifecycle status
- active runtime context and control state
- step outputs and execution metadata

Derived PM/read-models own:

- work-item status projection
- execution intent binding (`workItemRef`, `intentType`, `expectedOutputs`)
- linked evidence summary for transitions
- drift indicators and rollup progress fields

## Execution Intent Binding (Phase 1)

Every execution may include optional PM binding:

- `workItemRef`
- `intentType` (`explore | plan | implement | verify | recover`)
- `expectedOutputs`

Bindings must be persisted so execution outcomes can be audited against intended PM purpose.

## Module Alignment

- `event-bus`: transports lifecycle/evidence events; remains ephemeral.
- `observability`: durable timeline, metrics, feedback, and transparency queries.
- `provider-registry`: explicit-user-choice model selection/failure behavior is reflected as evidence context.
- `tooling-engine`: approval/policy decisions are evidence inputs for transitions.
- `sandbox-engine`: git/worktree outcomes provide implementation evidence signals.
- `variable-service` + `template-engine`: execution context and prompt receipts can be linked as supporting evidence where needed.

## Phase 1 Non-Goals

- Universal mandatory PM ontology for every project.
- Fully automated state transitions with zero human override.
- Replacing workflow runtime persistence with PM projection tables.

## Readiness Impact

This lock unblocks architecture readiness by closing the PM bridge open questions and defining clear boundaries for implementation and parity checklists.

## Related Contract

- See `docs/architecture/method-workitem-execution-contract.md` for the phase-1 schema, transition checks, and end-to-end TaskFlow examples.

## Open Decisions

- None for phase 1.
