# Story 1.3: Define Workflows Under Work Unit Scope and Bind Executable Subset to Transitions

Status: review

## Story

As an operator,
I want to define workflows under a work unit type and bind only selected workflows to transitions,
so that reusable draft workflows exist while execution remains policy-controlled and deterministic.

## Acceptance Criteria

1. Workflow definitions under a work unit type are persisted in draft scope independently of transition bindings; unbound workflows remain in draft catalog and are not transition-eligible.
2. Unsupported workflow step types are rejected deterministically with diagnostics that identify invalid types and accepted set (`form`, `agent`, `action`, `invoke`, `branch`, `display`).
3. Binding a subset of workflows to a specific transition marks only those workflows as transition-eligible; unbound workflows remain catalog-only.
4. If a transition has multiple bound workflows and transition gates pass, the system presents the eligible workflow list for explicit operator selection; only the selected workflow instance executes.
5. If a transition has zero bound workflows, transition eligibility blocks deterministically with actionable diagnostics identifying missing workflow bindings.
6. Workflow definition and binding changes in draft scope append evidence entries and remain queryable for publish-time lineage audit.

## Tasks / Subtasks

- [x] Implement workflow graph contracts and persistence under work-unit scope (AC: 1, 2, 6)
  - [x] Add/update contracts for `WorkflowDefinition`, `WorkflowStepDefinition`, and `WorkflowEdgeDefinition` with fixed step-type allowlist: `form|agent|action|invoke|branch|display`.
  - [x] Persist draft-scoped workflow catalog independently from transition bindings using normalized tables: `methodology_workflows`, `methodology_workflow_steps`, and `methodology_workflow_edges`.
  - [x] Model control flow via edges (`from_step_id`, `to_step_id`, `edge_key`) where `from_step_id IS NULL` means entry edge and `to_step_id IS NULL` means terminal edge.
  - [x] Keep branch behavior in `config_json`; do not introduce `branch_targets_json` or integer sequence as execution authority.
- [x] Add layered guidance model across methodology authoring surfaces (AC: 6)
  - [x] Add `guidance_json` on version-scoped root (`methodology_versions`) and explicit authoring layers: work-unit types, lifecycle states, lifecycle transitions, fact definitions, link-type definitions, agent types, workflows, workflow steps, and workflow edges.
  - [x] Define deterministic guidance resolution order with version as fallback root.
  - [x] Preserve existing `persona` fields where present; guidance adds structured user/agent execution context, not replacement persona semantics.
- [x] Align naming to fact terminology in persistence/contracts (AC: 6)
  - [x] Rename persistence naming from `methodology_variable_definitions` to `methodology_fact_definitions` with safe migration compatibility.
  - [x] Use additive migration strategy: create the fact table, backfill existing rows, dual-read during transition window, and switch writes to fact naming without lineage loss.
  - [x] Keep repository mappings and contract exports consistent with Story 1.2 terminology (`factDefinitions`).
- [x] Implement deterministic graph and binding validation (AC: 2, 3, 4, 5)
  - [x] Enforce supported step types and deterministic diagnostics for invalid types.
  - [x] Enforce graph invariants: exactly one entry edge per workflow, no degenerate edge (`from` and `to` both null), at least one terminal edge, and deterministic edge-key routing per source.
  - [x] Enforce branch routing invariants: branch steps have at least two outgoing labeled edges; non-branch steps must not have ambiguous multiple routes unless explicitly modeled.
  - [x] Enforce reachability invariants: entry edge reaches at least one terminal edge and dead/unreachable nodes emit deterministic diagnostics.
  - [x] Allow multiple terminal edges when intentionally modeled and require deterministic terminal outcome selection by chosen edge key.
  - [x] Guarantee zero partial writes on invalid submissions.
- [x] Implement transition workflow binding model and eligibility projection (AC: 3, 4, 5)
  - [x] Support binding subset of catalog workflows per transition via relation table.
  - [x] Mark only bound workflows as transition-eligible.
  - [x] Expose deterministic eligible-workflow list for explicit selection when multiple are bound.
  - [x] Emit deterministic blocked diagnostics when no workflows are bound.
- [x] Preserve append-only evidence and lineage for workflow/binding/guidance mutations (AC: 6)
  - [x] Add evidence events for workflow, step, edge, binding, and guidance create/update/delete operations.
  - [x] Ensure lineage queries retain stable ordering and actor attribution.
- [x] Wire API/service endpoints through existing Effect service layers (AC: 1-6)
  - [x] Keep writes authenticated and bounded to draft scope.
  - [x] Keep module ownership boundaries aligned across `contracts`, `methodology-engine`, `db`, and `api`.
  - [x] Define API key/id mapping contract: payloads use stable keys (`workflowKey`, `stepKey`, `fromStepKey`, `toStepKey`), repository resolves keys to IDs transactionally, responses remain key-oriented.
  - [x] Extend payload/response contracts to carry workflow graph structures and guidance payloads.
- [x] Add deterministic tests for positive and negative paths (AC: 1-6)
  - [x] Validation tests for invalid step types, invalid graph topology, and unsupported bindings.
  - [x] Validation tests for reachability and dead-node diagnostics.
  - [x] Eligibility tests for bound subset, explicit selection list behavior, and no-binding blocked behavior.
  - [x] Persistence/evidence tests for append-only lineage semantics across workflow, binding, and guidance writes.
  - [x] Regression tests for Story 1.1 and 1.2 guarantees (auth writes, actor propagation, deterministic diagnostics, zero partial mutation).
- [x] [AI-Review] Complete split-contract migration by replacing monolithic API write routes with split lifecycle/workflow authoring endpoints as the sole API write interface.
- [x] [AI-Review] Replace router `serializeVersion` legacy payload exposure to remove `definitionJson` leakage (use `definitionExtensions` envelope naming).
- [ ] [AI-Review] Persist and round-trip full guidance scopes (`global`, `byWorkUnitType`, `byAgentType`, `byTransition`) across normalized tables; avoid lossy `guidance: undefined` snapshots.
- [ ] [AI-Review] Add DB integration tests for normalized-source authority and guidance round-trip to prevent drift between write/read paths.
- [x] [AI-Review] Harden workflow snapshot reconstruction to fail on unknown step types (no silent coercion fallback).

## Dev Notes

### Implementation Blueprint (Schemas, Services, API, Tests)

- `packages/contracts`
  - Tasks/Subtasks section is the implementation acceptance checklist; this blueprint maps ownership and integration boundaries.
  - Add `packages/contracts/src/methodology/workflow.ts` with typed workflow authoring schemas:
    - `WorkflowStepType = 'form'|'agent'|'action'|'invoke'|'branch'|'display'`
    - `WorkflowStepDefinition` with deterministic `stepKey`, `stepType`, and `config` payload envelope.
    - `WorkflowEdgeDefinition` with `fromStepKey`, `toStepKey`, and deterministic `edgeKey` routing.
    - `WorkflowDefinition` with metadata plus normalized `steps` and `edges` (graph authority), not integer sequence authority.
    - `TransitionWorkflowBinding` for transition-to-workflow key binding set.
  - Add shared `Guidance` contract shape and apply it to version/lifecycle/fact/workflow surfaces in scope.
  - Extend `packages/contracts/src/methodology/lifecycle.ts` so each `WorkUnitTypeDefinition` can carry workflow definitions and binding configuration in draft scope.
  - Extend `packages/contracts/src/methodology/eligibility.ts` to include workflow-selection metadata (eligible workflow keys and explicit-selection requirement) and blocked diagnostics when bindings are missing.
  - Update `packages/contracts/src/methodology/index.ts` and `packages/contracts/src/index.ts` exports.
- `packages/db`
  - Extend `packages/db/src/schema/methodology.ts` with workflow persistence under methodology version/work-unit scope:
    - `methodology_workflows` (catalog per work-unit, unique by `versionId + workUnitTypeId + key`).
    - `methodology_workflow_steps` (step node table with `stepKey`, `stepType`, and `configJson`).
    - `methodology_workflow_edges` (edge table with nullable `fromStepId` and `toStepId` start/end semantics plus `edgeKey`).
    - `methodology_transition_allowed_workflows` (transition/workflow binding join, unique by `versionId + transitionId + workflowId`).
  - Add `guidance_json` to version and explicit authoring layers in scope (work-unit, state, transition, fact definition, link type, agent type, workflow, step, and edge).
  - Rename physical fact-definition table naming from variable-based to fact-based naming using additive migration + backfill + compatibility reads.
  - Add/adjust migrations and indexes for deterministic read ordering and efficient transition eligibility lookup.
  - Extend `packages/db/src/lifecycle-repository.ts` read/write methods:
    - write path stores workflows + steps + edges + bindings in same transaction as lifecycle structures,
    - read path exposes workflow graph and transition bindings for eligibility projection,
    - event writes stay append-only and include workflow/step/edge/binding/guidance changed fields.
- `packages/methodology-engine`
  - Extend `packages/methodology-engine/src/lifecycle-validation.ts` with workflow diagnostics:
    - unsupported step type (blocking),
    - duplicate workflow keys (blocking),
    - invalid graph topology (entry/terminal/edge routing) and bindings that reference undefined workflows (blocking),
    - deterministic sorted diagnostics aligned with existing contract shape.
  - Extend `packages/methodology-engine/src/lifecycle-service.ts` orchestration to validate and persist workflow catalog + graph + bindings through `LifecycleRepository.saveLifecycleDefinition`.
  - Extend `packages/methodology-engine/src/lifecycle-repository.ts` interface with workflow/binding query and persistence operations.
  - Extend `packages/methodology-engine/src/eligibility-service.ts` to return transition eligibility plus executable workflow subset and explicit-selection semantics when >1 workflow is bound.
  - Add deterministic guidance layering resolution utilities (version fallback root) for execution/context consumers.
  - Preserve existing no-partial-write behavior and validation-only evidence writes on invalid submissions.
- `packages/api` and server composition
  - Extend `packages/api/src/routers/methodology.ts` schemas/procedures to accept typed workflow graph authoring payloads and return enhanced eligibility output.
  - Keep API payload contracts key-oriented and avoid DB ID leakage at transport boundaries.
  - Keep protected-write semantics for draft mutations and preserve existing error mapping behavior.
  - Wire any new layer dependencies through `apps/server` if service constructor signatures change.
- Tests (`packages/*/src/**/*.test.ts`)
  - `lifecycle-validation.test.ts`: add allowlist and deterministic-diagnostic tests for workflow graph validation, reachability/dead-node checks, and bindings.
  - `methodology.test.ts` (API): add end-to-end contract tests for storing unbound catalog workflows, subset bindings, multi-bound transition selection metadata, and no-binding blocked diagnostics.
  - DB/repository tests (new or existing suite): verify transactional persistence and append-only lineage events for workflow/step/edge/binding/guidance writes.
  - Eligibility service tests: verify bound-only executability and deterministic ordering of transitions/workflow lists.

### Developer Context Section

- Story 1.3 is the workflow-definition and transition-binding scope for Epic 1; do not expand into publish/version pinning behaviors (Stories 1.4 and 1.5).
- Keep this backend-first and deterministic; no UI-heavy implementation is required beyond API contract support.
- Preserve strict separation between catalog definition and executable eligibility.

### Non-Goals

- Do not implement full runtime execution engine behavior changes beyond transition eligibility and workflow selection contracts.
- Do not implement frontend graph canvas or operator UI flows in this story.
- Do not implement publish-time version pinning or methodology publish semantics (Stories 1.4 and 1.5 own that scope).

### Technical Requirements

- Keep workflow definitions draft-scoped and independently queryable, even when unbound.
- Enforce allowed workflow step types exactly and reject all others deterministically.
- Model executable flow as graph edges, not integer sequence authority.
- Preserve edge semantics: `fromStepId IS NULL` = entry edge, `toStepId IS NULL` = terminal edge; forbid both-null edges.
- Keep branch routing in `config_json` and edge labels (`edgeKey`); do not add side-channel branch-target columns.
- Allow multiple terminal edges when intentionally modeled and require deterministic terminal outcome selection by chosen edge key.
- Enforce entry-to-terminal reachability and dead-node detection with deterministic diagnostics.
- Ensure transition eligibility logic uses bound subset only; catalog presence alone must never grant eligibility.
- When multiple workflows are bound, return deterministic eligible list for explicit operator choice before execution.
- When zero workflows are bound, block deterministically and return actionable diagnostics.
- Add `guidance_json` as structured user+agent guidance across in-scope authoring layers with version-level fallback root.
- Align persistence naming to `fact` terminology (`methodology_fact_definitions`) and preserve compatibility where needed.
- Keep API payload contracts key-oriented (`workflowKey`, `stepKey`, `fromStepKey`, `toStepKey`) and resolve persistence IDs internally.
- Keep writes transactional and idempotent where appropriate; invalid payloads must result in zero partial mutation.
- Maintain deterministic ordering for workflow lists, diagnostics, and evidence query responses.

### Constraint Enforcement Matrix

- `Exactly one entry edge per workflow` -> DB partial unique index (`from_step_id IS NULL`) + service validation + deterministic tests.
- `No degenerate edge` (`from` and `to` both null) -> DB check constraint + service validation tests.
- `At least one terminal edge` (`to_step_id IS NULL`) -> service validation + deterministic tests.
- `Entry reaches terminal` + `no dead nodes` -> service graph traversal validation + deterministic diagnostics tests.
- `Unique route key per source` (`workflow, from_step, edge_key`) -> DB unique index + service validation tests.
- `Allowed step types only` -> contract schema decode + service validation + deterministic diagnostics tests.
- `Transition eligibility bound subset only` -> service logic + eligibility API tests.
- `Missing binding blocks eligibility` -> service diagnostics + API blocked-path tests.
- `Fact table rename remains safe` -> additive migration/backfill + repository compatibility reads + regression tests.

### Architecture Compliance

- Respect package/module ownership boundaries:
  - `packages/contracts`: typed contracts and schemas only
  - `packages/methodology-engine`: domain validation and orchestration
  - `packages/db`: schema/repository and evidence persistence
  - `packages/api`: transport/procedure composition
- Keep append-only lineage model intact; no in-place evidence overwrite.
- Do not add new step capabilities or new gate classes in this story.
- Preserve graph and guidance responsibilities in methodology-authoring layers; do not move runtime execution concerns into this story.
- Keep invocation/runtime execution semantics aligned to existing architecture contracts; this story defines and binds workflows, not full runtime expansion.

### Library/Framework Requirements

- Stay on repository-pinned dependency versions; do not upgrade frameworks inside Story 1.3.
- Effect ecosystem is active; use existing project Effect patterns (`Context.Tag` + `Layer`, decode at boundaries) instead of introducing new abstractions.
- Drizzle is evolving rapidly (including beta tracks); use current repo conventions and avoid beta-only APIs.
- Hono workspace pin is currently `^4.8.2`; note known upstream security advisories for older adapter ranges and keep upgrade decisions explicit/scope-controlled.

### File Structure Requirements

- Expected touchpoints (extend existing patterns, do not relocate architecture):
  - `packages/contracts/src/methodology/` for workflow graph, guidance, and binding contracts
  - `packages/methodology-engine/src/` for graph validation, eligibility projection, guidance layering, and orchestration
  - `packages/db/src/schema/methodology.ts` and `packages/db/src/lifecycle-repository.ts` for schema/repository updates and evidence persistence
  - `packages/api/src/routers/` and server wiring for authenticated procedures
  - `packages/*/src/**/*.test.ts` for deterministic behavior coverage
- Preserve naming and export conventions introduced in Stories 1.1 and 1.2.

### Testing Requirements

- Add deterministic validator tests for step-type allowlist enforcement.
- Add deterministic validator tests for graph invariants (entry/terminal/no-degenerate-edge/routing uniqueness).
- Add binding tests proving only bound workflows are transition-eligible.
- Add selection-path tests where multiple eligible workflows require explicit operator choice.
- Add blocked-path tests where zero bindings produce deterministic actionable diagnostics.
- Add persistence tests proving append-only evidence lineage for workflow, step, edge, binding, and guidance mutations.
- Add regression tests to protect Story 1.1/1.2 guarantees (auth, actor attribution, deterministic diagnostics ordering, transactional no-partial-mutation behavior).

### Validation Outcomes (Checklist Applied)

- Critical gap resolved: story now specifies concrete schema/repository/service/API touchpoints instead of only high-level scope.
- Critical gap resolved: deterministic diagnostics extended with explicit workflow-step and binding validation expectations.
- Enhancement applied: explicit test matrix added for contracts, engine, API, repository, and lineage behavior.
- LLM optimization applied: implementation sequence is package-layered (`contracts -> db -> methodology-engine -> api -> server wiring -> tests`) to reduce ambiguity and prevent boundary drift.

### Previous Story Intelligence

- Reuse Story 1.2 implementation patterns:
  - Effect-first service composition with schema decoding at boundaries.
  - Deterministic diagnostic contract and stable sorting.
  - Transactional write orchestration and append-only evidence logging.
  - Authenticated write paths with actor identity propagated to evidence records.
- Carry forward Story 1.2 hardening outcomes:
  - safe definition JSON merge behavior,
  - strict decode on persisted payload reads,
  - no silent mutation paths,
  - deterministic eligibility query behavior.

### Git Intelligence Summary

- Recent implementation pattern is a package-first vertical slice across `contracts -> db -> methodology-engine -> api -> apps/server`, followed by story artifact and sprint-status synchronization.
- Commit style trend: `feat(scope): ...` for technical change, then `docs:` updates for artifact/status progression.
- Maintain the same shape in Story 1.3 to minimize regression risk and review churn.

### Latest Tech Information

- Effect: no immediate must-adopt change identified for this scope; continue with pinned versions and established service-layer patterns.
- Drizzle: upstream is actively evolving (including v1 beta work); avoid adopting beta-only APIs within this story.
- Hono: security advisories exist for older adapter/version combinations; capture advisory awareness in notes and handle dependency upgrades in dedicated upgrade work, not in Story 1.3 scope.

### Project Structure Notes

- This story extends Epic 1 methodology-authoring contracts by adding workflow catalog and transition binding controls without boundary drift.
- If implementation pressure suggests boundary violation, stop and document a design note before proceeding.

### References

- Epic/story source: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- Product constraints: [Source: _bmad-output/planning-artifacts/prd.md]
- Architecture guardrails: [Source: _bmad-output/planning-artifacts/architecture.md]
- UX/deterministic diagnostics contract: [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- Implementation rules: [Source: _bmad-output/project-context.md]
- Previous story intelligence: [Source: _bmad-output/implementation-artifacts/1-2-define-work-unit-types-and-transition-lifecycle-rules-in-methodology-draft.md]

### Project Context Reference

- Enforce strict TypeScript boundaries and schema-first decoding.
- Preserve deterministic behavior for diagnostics and eligibility outputs.
- Keep package boundaries explicit and avoid cross-layer leakage.

### Story Completion Status

- Story prepared via create-story ultimate context workflow.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

openai/gpt-5.3-codex

### Debug Log References

- Workflow: `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`

### Change Log

- 2026-02-25: Removed compatibility-only `allowedWorkflowsByTransition` and legacy fact-table dual-write path (`methodologyLegacyVariableDefinitions` / `methodology_variable_definitions`) to keep a single canonical model.
- 2026-02-25: Remediated review gaps by syncing normalized workflow tables from draft definition writes, sourcing eligibility bindings from normalized DB relation rows, and normalizing lifecycle event types to contract-aligned values.
- 2026-02-25: Advanced normalized-source refactor by splitting methodology contracts (dto/domain/projection), routing workflow canonical writes via explicit repository params, adding normalized workflow snapshot reads for service validation/diffs, and introducing split API routes for lifecycle/workflow authoring.
- 2026-02-25: Renamed legacy version payload envelope naming from `definitionJson` to `definitionExtensions`, removed `V2` route suffixes, and enforced fail-fast workflow step-type reconstruction in snapshot reads.

### Completion Notes List

- Story context compiled from epics, PRD, architecture, UX spec, project context, prior story intelligence, and recent git history.
- Story status set to `review` in story file after implementation validation and synchronized sprint tracker state.
- Scope constrained to draft workflow-definition and transition-binding behavior; publish/pin concerns intentionally deferred.
- Implemented workflow contracts and API schema updates for workflow graph, transition workflow bindings, and layered guidance payload support.
- Added deterministic workflow/binding validation diagnostics and eligibility workflow projection (selection list + no-binding blocked diagnostics).
- Added append-only workflow/binding/guidance version events on draft updates plus focused validation/eligibility test suites.
- Extended DB schema with normalized workflow catalog tables/binding relation and layered `guidance_json` columns across methodology authoring surfaces.
- Removed legacy workflow-binding compatibility alias `allowedWorkflowsByTransition`; `transitionWorkflowBindings` is now the single canonical binding field.
- Removed legacy fact-table compatibility path (`methodology_variable_definitions` / `methodologyLegacyVariableDefinitions`) and dropped dual-write behavior; `methodology_fact_definitions` is now canonical.
- Expanded graph validation for entry/terminal edge semantics, deterministic routing keys, branch/outgoing invariants, and dead-node diagnostics.
- Remediated Story 1.3 code-review findings: normalized workflow persistence is now synchronized on create/update draft writes; lifecycle transition saves now rehydrate binding rows from canonical definition payload.
- Eligibility workflow projection now reads transition-workflow bindings from normalized DB relations instead of legacy payload fallback paths.
- Lifecycle lineage events now use contract-compatible event types (`updated`/`validated`) for consistency with typed event contracts.
- Executed validation commands: `bun check` and targeted tests `bun test packages/methodology-engine/src/eligibility-service.test.ts packages/api/src/routers/methodology.test.ts`.
- Removed workflow/binding/guidance authority from legacy extension payload write path by persisting only lifecycle envelope fields and passing canonical workflow/binding payloads separately into repository writes.
- Added normalized workflow snapshot query (`findWorkflowSnapshot`) and switched version-service workflow/binding/guidance diffing + draft validation merge path to consume normalized persistence snapshots.
- Updated lifecycle changed-fields reconstruction to read normalized lifecycle tables instead of decoding prior `definitionJson` payloads.
- Added split API procedures (`createDraftVersion`, `updateDraftWorkflows`) and matching router tests to support lifecycle creation plus workflow/binding authoring updates without route version suffixes.
- Added explicit guard assertions in version-service tests that `definitionExtensions` no longer stores canonical workflow/binding fields.
- Executed validation commands: `bun check` and focused tests `bun test packages/methodology-engine/src/version-service.test.ts packages/api/src/routers/methodology.test.ts packages/methodology-engine/src/lifecycle-service.test.ts`.

### File List

- `_bmad-output/implementation-artifacts/1-3-define-workflows-under-work-unit-scope-and-bind-executable-subset-to-transitions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/contracts/src/methodology/version.ts`
- `packages/contracts/src/methodology/index.ts`
- `packages/contracts/src/methodology/dto.ts`
- `packages/contracts/src/methodology/domain.ts`
- `packages/contracts/src/methodology/projection.ts`
- `packages/contracts/src/methodology/eligibility.ts`
- `packages/contracts/src/methodology/version.test.ts`
- `packages/methodology-engine/src/validation.ts`
- `packages/methodology-engine/src/validation.test.ts`
- `packages/methodology-engine/src/eligibility-service.ts`
- `packages/methodology-engine/src/eligibility-service.test.ts`
- `packages/methodology-engine/src/version-service.ts`
- `packages/methodology-engine/src/version-service.test.ts`
- `packages/methodology-engine/src/index.ts`
- `packages/methodology-engine/src/lifecycle-repository.ts`
- `packages/methodology-engine/src/lifecycle-service.ts`
- `packages/methodology-engine/src/repository.ts`
- `packages/api/src/routers/methodology.ts`
- `packages/api/src/routers/methodology.test.ts`
- `packages/db/src/schema/methodology.ts`
- `packages/db/src/methodology-repository.ts`
- `packages/db/src/lifecycle-repository.ts`
