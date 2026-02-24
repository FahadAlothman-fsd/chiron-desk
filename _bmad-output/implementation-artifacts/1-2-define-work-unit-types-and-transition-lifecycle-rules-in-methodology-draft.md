# Story 1.2: Define Work Unit Types and Transition Lifecycle Rules in Methodology Draft

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator,
I want to define and update work unit types and lifecycle transition rules in a methodology draft,
so that published methodology versions have valid, deterministic execution contracts.

## Acceptance Criteria

1. Work unit type lifecycle and transition definitions can be defined/updated in draft scope and queried for validation.
2. Cardinality policy supports only `one_per_project` and `many_per_project`, and persists for activation/gate/action derivation.
3. Fact schema supports static fields `string|number|boolean|json` with `required` and optional `default`; Facts v1 disallows refs/derived expressions.
4. Planning dependency policy supports `linkTypeKey=planning_input` and strengths `hard|soft|context`; dependency types remain target-neutral while transition gates bind concrete `requiredLinks` selectors.
5. Duplicate state IDs, undefined state references, and duplicate transition keys are rejected with deterministic diagnostics and no partial mutation.
6. Invalid cardinality values are rejected deterministically.
7. Fact schema duplicate keys, unsupported types, invalid defaults, and reserved collisions are rejected with deterministic diagnostics and no partial mutation.
8. Dependency requirements with undefined link types or disallowed strengths are rejected deterministically.
9. Transition gate classes allow only `start_gate` and `completion_gate`.
10. Lifecycle edges using `__absent__` allow only one-way activation `__absent__ -> defined_state`; defined_state -> `__absent__` is rejected.
11. Valid draft lifecycle exposes deterministic transition eligibility metadata and guard metadata.
12. Saved lifecycle changes emit append-only evidence queryable for draft/publish lineage.

## Tasks / Subtasks

- [x] Extend methodology draft domain model for work unit types/lifecycles/transitions (AC: 1, 2, 4, 9, 10)
  - [x] Add/adjust contracts and schemas for work unit definitions, lifecycle states, transitions, gate bindings, cardinality policy.
  - [x] Update persistence model (Drizzle schema/repositories) for draft-scoped lifecycle data with deterministic ordering.
- [x] Implement deterministic validation for lifecycle and fact schema constraints (AC: 3, 5, 6, 7, 8, 9, 10)
  - [x] Add validators returning structured diagnostics for duplicates, undefined refs, invalid defaults/types, invalid cardinality, disallowed gate classes, invalid `__absent__` direction.
  - [x] Ensure transactional behavior: reject invalid inputs without partial writes.
- [x] Implement query/read model for transition eligibility and guard metadata (AC: 1, 11)
  - [x] Expose deterministic transition eligibility metadata from lifecycle definitions.
  - [x] Include guard metadata required by downstream execution planning.
  - [x] Keep eligibility in this story definition-time only (state graph + declared guard requirements), not runtime gate execution.
- [x] Add append-only evidence emission for lifecycle mutations (AC: 12)
  - [x] Record evidence events for lifecycle changes in draft scope.
  - [x] Ensure lineage queryability from draft to published version chain.
- [x] Wire API/service surface for create/update/query operations (AC: 1-12)
  - [x] Route through authenticated procedures and Effect service layers.
  - [x] Keep boundaries aligned with existing `packages/contracts`, `packages/methodology-engine`, `packages/db`, and `packages/api` ownership.
- [x] Add tests covering positive and negative paths (AC: 1-12)
  - [x] Deterministic validator tests for all rejection cases.
  - [x] Persistence/evidence tests ensuring append-only lineage semantics.
  - [x] API/service tests proving no partial mutation on invalid input.
  - [x] Add regression tests to ensure Story 1.1 guarantees remain true for 1.2 lifecycle APIs (auth writes, actor propagation, deterministic diagnostics ordering, append-only lineage).

## Dev Notes

### Developer Context Section

- Story 1.2 is the contract-hardening step after 1.1 baseline draft/version support; do not expand into Story 1.3 workflow binding behavior beyond required lifecycle metadata surfaces.
- Keep this backend-first and deterministic; avoid UI scope in this story.
- Primary goal is trustworthy methodology contract authoring with strict validation and evidence lineage.

### Technical Requirements

- Use Effect-first implementation patterns (typed services, explicit errors, pure validation then transactional persistence).
- Preserve deterministic diagnostics ordering and shape; no non-deterministic map/set iteration in outputs.
- Enforce allowed sets exactly:
  - Cardinality: `one_per_project|many_per_project`
  - Gate classes: `start_gate|completion_gate`
  - Fact types: `string|number|boolean|json`
  - Planning dependency strengths: `hard|soft|context`
- Enforce `__absent__` lifecycle semantics exactly: activation only from absent to defined state.
- On invalid payloads, return deterministic diagnostics and perform zero writes.

### Transition Eligibility Scope (Story 1.2)

- Implement transition eligibility as methodology-definition metadata only.
- Eligibility in 1.2 means: valid edge from current lifecycle state + declared guard requirements emitted deterministically.
- Do not evaluate runtime facts, approvals, attempts, or gate outcomes in this story.
- Return deterministic metadata for downstream runtime engines to evaluate later.

### `__absent__` Persistence Mapping (Normative)

- Treat `__absent__` as a pseudo-state in contracts/API input only; do not create a `__absent__` row in `methodology_lifecycle_states`.
- Store activation edges (`__absent__ -> defined_state`) by writing `from_state_id = NULL` and `to_state_id = <defined_state_id>` in `methodology_lifecycle_transitions`.
- Enforce `to_state_id` as non-null and FK-bound to `methodology_lifecycle_states.id`.
- Reject any payload that sets `toStateKey = "__absent__"`.
- Eligibility query semantics:
  - current state `__absent__`: only transitions where `from_state_id IS NULL` are eligible from state.
  - current defined state: only transitions where `from_state_id = <current_state_id>` are eligible from state.

### Strict Implementation Checklist (Dev Agent)

- [ ] Contracts: replace loose lifecycle internals with typed schemas for work unit type, states, transitions, cardinality, fact schema, and required link metadata.
- [ ] Condition model (definition only): represent transition guard requirements as declarative metadata (`requiredLinks`, allowed strengths, required flags/selectors), not executable expressions.
- [ ] DB schema: add draft-scoped persistence for work unit type definitions, lifecycle states/transitions, and transition required-link requirements.
- [ ] DB guardrail: do not add runtime instance tables in 1.2 (no work unit instances, transition attempts, or gate-evaluation runtime tables).
- [ ] Repository: add transactional upsert/read functions for lifecycle contract data; on invalid payloads, perform zero writes.
- [ ] Service (Effect): implement create/update/query flow through `Context.Tag` + `Layer`, schema decode at boundary, deterministic diagnostics ordering.
- [ ] API procedures: keep lifecycle writes authenticated (`protectedProcedure`), keep read/query procedures scoped to draft-contract metadata.
- [ ] Validation rules: enforce allowed sets (`one_per_project|many_per_project`, `start_gate|completion_gate`, fact types, strengths) and `__absent__` one-way semantics.
- [ ] Eligibility output: return deterministic transition eligibility metadata + guard metadata from definition graph only.
- [ ] Evidence: append lifecycle mutation/validation events to lineage with actor attribution and stable ordering.
- [ ] 1.1 carryover regression checks: authenticated writes, actor propagation, deterministic diagnostics, append-only lineage, and transactional no-partial-mutation behavior.
- [ ] Tests: add positive and negative tests for all AC rejection classes and positive eligibility metadata paths.

### Ready-for-Dev Gate (Checklist Review)

- 1) Contracts typed lifecycle schemas - **PASS**
- 2) Condition model definition-only metadata - **PASS**
- 3) Draft-scoped DB schema additions - **NEEDS CLARIFICATION** (lock exact table set and uniqueness/FK/index strategy before implementation)
- 4) No runtime instance tables in Story 1.2 - **PASS**
- 5) Repository transactional upsert/read + zero partial mutation - **PASS**
- 6) Effect service flow with decode-at-boundary + deterministic diagnostics - **PASS**
- 7) API procedure plan (which existing procedures are extended vs new) - **NEEDS CLARIFICATION**
- 8) Validation allowed-set enforcement + `__absent__` directionality - **PASS**
- 9) Eligibility output contract fields and sort order - **NEEDS CLARIFICATION**
- 10) Evidence event taxonomy for lifecycle changes - **NEEDS CLARIFICATION**
- 11) Story 1.1 non-regression requirements - **PASS**
- 12) Test matrix for all rejection classes + positive paths - **PASS**

### Clarifications Required Before Dev Start

- DB table contract: confirm exact new table names, columns, and indexes for lifecycle definitions (draft contract layer only).
- API surface contract: confirm names/signatures for lifecycle write/read procedures and whether `updateDraftVersion` remains orchestration wrapper or delegates to new lifecycle-specific procedure(s).
- Eligibility response schema: confirm deterministic response fields/order (for example: `transitionKey`, `fromState`, `toState`, `gateClass`, `requiredLinks`, `guardMetadata`, `isEligibleFromState`).
- Evidence event types: confirm canonical event names for lifecycle mutation/validation so lineage queries remain stable and reviewable.

### Architecture Compliance

- Respect module boundaries and ownership:
  - Contracts/types in `packages/contracts`
  - Domain logic + validation/orchestration in `packages/methodology-engine`
  - Persistence in `packages/db`
  - Transport/procedure wiring in `packages/api` and server adapters
- Keep append-only evidence model intact; do not overwrite historical events.
- Do not introduce extra gate classes or step capabilities.
- Keep tooling/control plane assumptions unchanged (`tooling-engine` as singular control plane).
- Do not add runtime work-unit instance tables in 1.2 (for example, instance state, transition attempts, or gate evaluation tables).

### Library/Framework Requirements

- Stay on repository-pinned dependencies for this story; do not perform framework upgrades as part of implementation.
- Research notes for awareness:
  - Effect ecosystem has a v4 beta track with runtime and package consolidation; keep implementation compatible with project's currently pinned major line.
  - Drizzle is in active v1 beta evolution; prefer current project patterns and avoid adopting beta-only APIs unless already present in repo.
- Use existing Bun/Hono/oRPC/Drizzle/Effect conventions already established in Story 1.1 code paths.

### File Structure Requirements

- Expected touchpoints (extend existing patterns, do not relocate architecture):
  - `packages/contracts/src/...` for lifecycle/fact/dependency contracts and diagnostics types
  - `packages/methodology-engine/src/...` for lifecycle validation rules and transition metadata derivation
  - `packages/db/src/...` for schema/repository updates and evidence writes
  - `packages/api/src/...` (and server route bindings) for authenticated write/query procedures
  - `packages/*/src/**/*.test.ts` for deterministic behavior coverage
- Preserve naming conventions and export surfaces introduced in 1.1.

### Testing Requirements

- Add deterministic tests for each AC rejection class:
  - Duplicate states/transitions
  - Undefined refs/link types
  - Invalid cardinality/gate class/fact types/defaults/reserved collisions
  - Invalid `defined_state -> __absent__` edge
- Add positive-path tests for valid lifecycle transition eligibility and guard metadata.
- Add evidence tests asserting append-only lifecycle event emission and lineage queryability.
- Add transactional tests proving invalid submissions cause no partial mutations.

### Previous Story Intelligence

- Reuse 1.1 patterns:
  - Effect service composition (`Context.Tag` + `Layer`) and decode at boundaries.
  - Deterministic diagnostics contract and stable error mapping.
  - Transactional write orchestration and append-only event logging.
  - Authenticated write procedures with actor identity threaded into evidence records.
- Avoid pitfalls corrected in 1.1 review: unsafe casts, weak boundary decoding, and missing actor/audit propagation.

### Story 1.1 Carryover Contract (Must Not Regress)

- Keep authenticated write surface (`protectedProcedure`) for lifecycle mutations; no public write routes.
- Thread `actorId` from session through service and repository so lifecycle evidence remains attributable.
- Decode unknown boundary payloads via schema decode (no unsafe casts).
- Keep diagnostics deterministic in ordering/shape for equivalent inputs.
- Keep writes transactional: invalid payloads must produce zero state mutation.
- Keep evidence append-only and lineage queryable with stable ordering.

### Git Intelligence Summary

- Recent commits show stable package-first vertical slices touching `contracts/db/methodology-engine/api` plus story artifacts.
- Follow same implementation shape for 1.2 to minimize regressions and preserve team conventions.
- Keep story artifact updates synchronized with sprint status transitions.

### Latest Tech Information

- External checks indicate active upstream changes in Effect and Drizzle ecosystems; this reinforces a conservative approach:
  - Prefer repo-locked versions and existing project abstractions.
  - Avoid introducing newly changed/beta APIs unless already adopted in this codebase.
- Continue prioritizing deterministic behavior, schema-first contracts, and explicit validation over framework novelty.

### Project Structure Notes

- Alignment: This story extends established methodology baseline contracts from 1.1 without cross-boundary architecture drift.
- Variance policy: If a required change appears to force boundary violations, stop and add a design note before implementation.

### References

- Epic/story requirements: [Source: _bmad-output/planning-artifacts/epics.md#Epic 1], [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- Product and constraint context: [Source: _bmad-output/planning-artifacts/prd.md]
- Technical architecture guardrails: [Source: _bmad-output/planning-artifacts/architecture.md]
- Agent implementation rules: [Source: _bmad-output/project-context.md]
- Previous implementation intelligence: [Source: _bmad-output/implementation-artifacts/1-1-create-methodology-draft-baseline.md]

### Project Context Reference

- Enforce strict TypeScript and Effect Schema at boundaries.
- Maintain deterministic transition/gate behavior and contract-driven tests.
- Keep package boundaries explicit and avoid internal cross-import leakage.

### Story Completion Status

- Story prepared via create-story ultimate context workflow.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

openai/gpt-5.3-codex

### Debug Log References

- Workflow: `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`

### Completion Notes List

- Story context compiled from epics, PRD, architecture, project context, previous story, and recent git intelligence.
- Story status set to ready-for-dev in both story file and sprint tracker.
- Wave 1 review issues resolved: definition JSON merge safety, strict Effect decode at boundaries, removal of silent mutation paths, actor attribution tightening, and deterministic eligibility query improvements.
- Story 1.2 methodology-layer extension added: `agentTypes` contract + persistence + validation + API input support.
- Methodology-level definitions now use `factDefinitions` as the canonical name across contracts, API, and services.

### File List

**Contracts (`packages/contracts/src/methodology/`):**
- `agent.ts` - NEW: Agent type schema (persona, defaultModel provider/model, MCP server keys, capabilities)
- `lifecycle.ts` - Core lifecycle schemas (WorkUnitTypeDefinition, LifecycleState, LifecycleTransition) + UpdateDraftLifecycleInput includes agentTypes
- `fact.ts` - Fact type and schema definitions
- `dependency.ts` - Dependency strength and requirement types
- `eligibility.ts` - Transition eligibility and guard metadata types
- `version.ts` - MethodologyVersionDefinition includes `agentTypes` (default `[]`) and canonical `factDefinitions` inputs
- `index.ts` - Re-exports for methodology contracts (including `agent.ts`)

**DB (`packages/db/src/`):**
- `schema/methodology.ts` - Lifecycle tables + NEW `methodology_agent_types`
- `methodology-repository.ts` - Added findLinkTypeKeys method
- `lifecycle-repository.ts` - Lifecycle data persistence + agentTypes persistence + safe definitionJson merge
- `index.ts` - Added lifecycle repository export

**Methodology Engine (`packages/methodology-engine/src/`):**
- `lifecycle-validation.ts` - Deterministic validation + link type existence + agent type validation
- `lifecycle-service.ts` - Effect-first updateDraftLifecycle with typed decode of existing definition JSON and agentTypes support
- `lifecycle-repository.ts` - LifecycleRepository interface and row types + `AgentTypeRow` + `findAgentTypes`
- `eligibility-service.ts` - Transition eligibility query service with batched requiredLinks fetch (no N+1)
- `repository.ts` - Added findLinkTypeKeys to MethodologyRepository interface
- `errors.ts` - MethodologyError and LifecycleError types
- `index.ts` - Module exports
- `lifecycle-validation.test.ts` - Deterministic validator tests + agent type validation tests
- `version-service.test.ts` - Added findLinkTypeKeys mock

**API (`packages/api/src/routers/`):**
- `methodology.ts` - updateDraftLifecycle and getTransitionEligibility procedures + agentTypes input schema
- `index.ts` - Fixed duplicate variable, wired LifecycleRepository + all service layers
- `methodology.test.ts` - Updated service layer composition with lifecycle mocks

**Server (`apps/server/src/`):**
- `index.ts` - Wired lifecycle repository layer into app router

**Documentation:**
- `_bmad-output/implementation-artifacts/1-2-define-work-unit-types-and-transition-lifecycle-rules-in-methodology-draft.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/plans/2026-02-24-story-1-2-agent-type-schema-design.md`
- `docs/plans/2026-02-24-story-1-2-review-fix-plan.md`
