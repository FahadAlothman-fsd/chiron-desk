# L3 Slice 1 Correction — Context Facts and Form

> **Status: Superseded / historical only. DO NOT EXECUTE THIS PLAN.**
> This file is retained only for traceability of the intermediate correction pass.
> The sole active slice-1 execution source of truth is `.sisyphus/plans/l3-slice-1-design-time-context-facts-form.md`.

## TL;DR
> **Summary**: Correct the shipped slice-1 product model so workflow-editor context-fact CRUD and Form-step design-time CRUD become fully usable and authoritative, while deferring runtime work to a later dedicated plan.
> **Deliverables**:
> - Corrected context-fact-first contract/model across contracts, routers, services, and tests
> - Fully usable workflow-editor context-fact CRUD surface
> - Fully usable Form dialog and field-binding CRUD based on linked workflow context facts
> - Corrected design-time methodology schema/repository/service authority for context facts and Form steps
> - Locked design-time seed additions for the 9 BMAD-derived methodology/work-unit fact definitions, added as the last task set
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: contracts/model correction → methodology schema/repos/services → workflow-editor UX → design-time seed additions → verification

## Context
### Original Request
Finalize a new implementation-correction plan for slice-1. This plan must not become cleanup-only. It must preserve the good foundations already implemented while repairing the wrong ownership model so slice-1 actually delivers full workflow-editor context-fact CRUD and full Form-step design-time CRUD. Runtime is explicitly deferred to a later plan.

### Implemented-State Summary
- Good foundations already exist and should be preserved: explicit workflow-editor route identity, workflow launch wiring, dark shell + disabled later-step tiles, one-outgoing-edge rule, first-step activation seam, typed methodology/runtime table direction, runtime step-core services, step detail route, and baseline/demo seed split concept.
- The current drift is concentrated in the product model, not the infrastructure:
  - Form contracts still couple Form fields and context-fact definitions.
  - The Form dialog still behaves as `Contract | Fields | Context Facts` with placeholders instead of real field-binding CRUD.
  - Context-fact semantics are not fully expressed in the workflow-editor CRUD/read-models.
  - `SetupTags` lives in shared invariants even though it is slice-1/demo-specific.
  - Runtime/project-fact-instance concerns exist, but this correction pass is intentionally narrowing away from them.

### Refinement Draft Authority
Use `.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md` as the product-model authority for the correction work. It locks:
- Workflow context facts are authored at workflow-editor level and reused by Form fields.
- Form dialog tabs are exactly `Contract | Fields | Guidance`.
- Context-fact dialog tabs are exactly `Contract | Value Semantics | Guidance`.
- Active context-fact kinds in this correction slice are exactly:
  - `plain_value_fact`
  - `definition_backed_external_fact`
  - `bound_external_fact`
  - `workflow_reference_fact`
  - `artifact_reference_fact`
  - `work_unit_draft_spec_fact`
- `work_unit_reference_fact` is removed from active slice-1 refinement/testing scope.
- Field widget/runtime behavior is derived from the linked context-fact definition; no standalone `inputKind` survives.
- Form-field bindings may define a UI multiplicity mode only when the linked context fact has canonical cardinality `many`; that mode may narrow `many -> one`, but may never widen `one -> many`.

### Metis Review (gaps addressed)
- Lock the active kind set to 6 and explicitly remove `work_unit_reference_fact` from current scope.
- Add architecture guardrails so Form never again owns inline context-fact definitions.
- Add acceptance criteria for tab ownership, widget derivation, UI multiplicity, and exact design-time ownership.
- Use the triage model directly in the plan: preserve foundations, patch wrong/incomplete seams in place, and explicitly replace/remove stale ownership artifacts.
- Keep unrelated desktop/server/package churn out of correction commits.

### Postmortem Guardrails (locked)
- This is **not** a reusable-foundations exercise. Any work whose primary output is generic infrastructure, future-proofing, or cross-slice abstraction fails scope unless the task names it as required to unlock a concrete product acceptance criterion.
- `.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md` is the sole product-model authority for slice-1 behavior. Service/repo/layer structure is subordinate to that authority, not the other way around.
- The following stale artifacts are blocking failures if they appear anywhere in active slice-1 contracts, routers, services, read models, tests, or UI:
  - `FormStepPayload.contextFacts`
  - Form dialog `Context Facts` tab
  - standalone `inputKind`
  - `SetupTags` in `packages/contracts/src/shared/invariants.ts`
  - active `work_unit_reference_fact`
- Placeholder or stub UX in active slice-1 surfaces is forbidden. Any `coming in slice-2`, decorative CRUD shell, or dead tab in scoped surfaces fails acceptance.
- Every service/repository change must trace directly to one visible product behavior: workflow-editor context-fact CRUD, Form field-binding CRUD, or design-time seed-definition correctness.
- Atomic commits must map to one product correction seam only. Unrelated desktop/server/package churn is out of scope.

## Work Objectives
### Core Objective
Repair slice-1 so the implemented route/shell foundations become a coherent product slice centered on workflow-level context-fact CRUD and Form-step design-time authoring behavior, while preserving good existing infrastructure and avoiding cleanup-only churn. Runtime step behavior, project-fact-instance CRUD, and projectRootPath persistence are deferred.

### Deliverables
- Corrected contracts in `packages/contracts/src/methodology/workflow.ts`, `packages/contracts/src/runtime/executions.ts`, and related tests.
- Corrected methodology schema/repository/service authority for workflow context facts and Form field bindings.
- Corrected workflow-editor surfaces in `apps/web/src/features/workflow-editor/**` and the explicit workflow-editor route.
- Correct design-time seed additions in `packages/scripts/src/seed/methodology/**` for the locked 9 BMAD-derived fact definitions.
- Corrected demo-fixture path and temporary workflow-reference fixture behavior only as needed to support design-time authoring proof.

### Definition of Done
- `bunx vitest run packages/contracts/src/tests/l3-slice-1-contracts.test.ts`
- `bunx vitest run packages/db/src/tests/schema/l3-slice-1-schema.test.ts packages/db/src/tests/repository/l3-slice-1-repositories.test.ts packages/db/src/tests/repository/l3-slice-1-runtime-repositories.test.ts`
- `bunx vitest run packages/methodology-engine/src/tests/l3/l3-slice-1-workflow-editor-services.test.ts`
- `bunx vitest run packages/api/src/tests/routers/l3-slice-1-methodology-router.test.ts`
- `bunx vitest run apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx`
- `bunx vitest run packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`

### Must Have
- Exactly 6 active context-fact kinds in this correction slice; `work_unit_reference_fact` removed from active scope.
- Form never owns inline context-fact definitions anywhere in contracts, routers, services, read models, or tests.
- Form dialog tabs are exactly `Contract | Fields | Guidance`.
- Context-fact dialog tabs are exactly `Contract | Value Semantics | Guidance`.
- `Contract` vs `Value Semantics` vs `Guidance` ownership is enforced exactly as locked in the refinement draft.
- Field widget/runtime behavior is derived from linked context-fact definitions.
- Good foundations are preserved: route identity, one-outgoing-edge invariant, and typed methodology table direction.
- The 9 BMAD-derived design-time fact definitions are locked for the last seed task set in this plan.

### Must NOT Have
- No cleanup-only plan shape.
- No reusable-foundations detour where generic abstractions outrank product correctness.
- No reintroduction of Form-owned inline context facts.
- No `Context Facts` tab inside the Form dialog.
- No standalone `inputKind` field or enum driving runtime widget behavior.
- No `SetupTags` in `packages/contracts/src/shared/invariants.ts`.
- No active slice-1 implementation/testing surface for `work_unit_reference_fact`.
- No unrelated desktop/server/package-manifest churn folded into slice-1 correction commits.
- No runtime Form/context-fact/project-fact-instance implementation in this plan.
- No expansion into Agent/Action/Invoke/Branch runtime behavior beyond existing deferred/default surfaces.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after against the already implemented slice-1 foundations.
- QA policy: every correction task must preserve good infrastructure while proving the corrected product model with concrete tests.
- Negative gates are mandatory: stale ownership artifacts, placeholder tabs, and forbidden kinds must be asserted absent, not merely omitted from happy-path tests.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Preserve / Patch / Replace Inventory
#### Preserve as-is foundations
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- `apps/web/src/features/workflow-editor/step-types-grid.tsx`
- `apps/web/src/features/workflow-editor/step-list-inspector.tsx` (preserve seam, patch details only if task says so)
- `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx` (preserve shell + left-rail/canvas seam)
- `packages/methodology-engine/src/services/workflow-topology-mutation-service.ts`
- Typed methodology table direction in `packages/db/src/schema/methodology.ts`

#### Patch in place
- `apps/web/src/features/workflow-editor/dialogs.tsx`
- `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx`
- `packages/contracts/src/methodology/workflow.ts`
- `packages/api/src/routers/methodology.ts`
- `packages/methodology-engine/src/services/form-step-definition-service.ts`
- `packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts`
- `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`
- `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts`
- `packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`
- `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
- `packages/scripts/src/seed/methodology/index.ts`

#### Replace / remove
- `SetupTags` in `packages/contracts/src/shared/invariants.ts`
- Any active `FormStepPayload.contextFacts`-style inline ownership model
- The Form-dialog `Context Facts` tab in `apps/web/src/features/workflow-editor/dialogs.tsx`
- Any stale `inputKind` field/enum
- Any active slice-1 expectations/examples/tests for `work_unit_reference_fact`
- Debug/test-only editor affordances that distort canonical UX

### Pages and surfaces that must be correct after this plan
1. `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
   - loads editor by explicit `workflowDefinitionId`
   - uses canonical editor-definition read model rather than reconstructing from `workflow.list`
2. `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx`
   - left rail contains `STEP TYPES`, `STEP LIST & INSPECTOR`, `Context Fact Definitions`
   - content-sized sections with scrollable inner regions
3. `apps/web/src/features/workflow-editor/dialogs.tsx`
   - Form dialog = `Contract | Fields | Guidance`
   - Context-fact dialog = `Contract | Value Semantics | Guidance`
4. `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx`
   - context-fact definitions list/create/edit/delete is practical and authoritative
5. `apps/web/src/features/workflow-editor/step-list-inspector.tsx`
   - step and edge selection behavior remains aligned with the refined design-time model

### Service / repo / transaction inventory
#### Methodology-engine
- Keep and patch:
  - `WorkflowEditorDefinitionService`
  - `WorkflowTopologyMutationService`
  - `FormStepDefinitionService`
  - `WorkflowContextFactDefinitionService`
  - `WorkflowAuthoringTransactionService`
- Do not add a new `WorkflowMetadataService`; existing workflow metadata CRUD stays in `WorkflowService`.

#### Workflow-engine
- Deferred from this plan. Runtime services remain untouched except where a shared contract/test import must be kept compiling under the corrected design-time model.

#### Repositories
- Preserve existing repo seams where real and aligned.
- Patch methodology repositories to provide real editor-definition / form-field / edge / context-fact CRUD methods.
- Patch seed-definition files only under `packages/scripts/src/seed/methodology/**` for the locked 9 design-time facts.

#### Effect guardrails
- Routers remain thin; one top-level service call per procedure.
- Services use Effect-style boundaries with explicit typed errors.
- Live layers updated in `packages/methodology-engine/src/layers/live.ts` and `packages/workflow-engine/src/layers/live.ts`.
- No direct repo calls from UI glue or router handlers that bypass service boundaries.

### Parallel Execution Waves
Wave 1: contracts/tests + stale artifact removal rules + schema/repository authority corrections
Wave 2: methodology-engine services/read models + workflow-editor dialogs/shell corrections
Wave 3: design-time seed-definition additions + integrated verification + final review wave

### Dependency Matrix
- T1 blocks T2, T3, T4, T5, T6
- T2 blocks T3, T4, T5, T6
- T3 blocks T4, T6
- T4 blocks T5, T6
- T5 blocks T6

### Agent Dispatch Summary
- Wave 1 → 2 tasks → deep
- Wave 2 → 2 tasks → deep / visual-engineering
- Wave 3 → 1 task + integrated verification + final review wave → deep / oracle / unspecified-high

## TODOs
> This is an implementation-correction plan. Preserve good foundations; patch or replace only where the product model is wrong or incomplete.

- [ ] 1. Correct the slice-1 contract model and remove stale ownership artifacts

  **What to do**: Patch `packages/contracts/src/methodology/workflow.ts`, `packages/contracts/src/runtime/executions.ts`, and related tests so the contract model matches the refinement draft exactly: active kind set is 6, Form fields bind to existing workflow context facts, `work_unit_reference_fact` is out of active scope, `inputKind` is gone, widget behavior is derived, UI multiplicity narrowing is encoded, and `SetupTags` is removed from shared invariants and relocated to a slice-1-local contract/module if still needed for the demo fixture.
  **Must NOT do**: Do not preserve `FormStepPayload.contextFacts`. Do not keep active slice-1 expectations for `work_unit_reference_fact`. Do not leave `SetupTags` in `packages/contracts/src/shared/invariants.ts`.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: contracts are the root of the drift
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: service/contract boundaries and typed errors must stay future-safe
  - Omitted: [`hono`] — Reason: not transport-specific work

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4,5,6 | Blocked By: none

  **References**:
  - Pattern: `packages/contracts/src/methodology/workflow.ts`
  - Pattern: `packages/contracts/src/shared/invariants.ts`
  - Authority: `.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md`
  - Drift map: `.sisyphus/drafts/l3-slice-1-implementation-triage.md`

  **Acceptance Criteria**:
  - [ ] Contract model encodes only the 6 active kinds.
  - [ ] Form field bindings reference context-fact definitions; Form no longer owns inline context facts.
  - [ ] `SetupTags` is no longer in shared invariants.
  - [ ] `inputKind` no longer exists in slice-1 contract surfaces.
  - [ ] UI multiplicity narrowing rules are encoded and tested.

  **QA Scenarios**:
  ```
  Scenario: Contract model matches refinement authority
    Tool: Bash
    Steps: Run `bunx vitest run packages/contracts/src/tests/l3-slice-1-contracts.test.ts`
    Expected: PASS; tests assert active kind set, no inline context-fact ownership, no inputKind, slice-local setup_tags placement, and UI multiplicity rules
    Evidence: .sisyphus/evidence/task-1-contracts.txt

  Scenario: Stale ownership artifacts are blocked
    Tool: Bash
    Steps: Re-run the same suite and assert the negative cases for `FormStepPayload.contextFacts`, `inputKind`, and `work_unit_reference_fact` all fail
    Expected: PASS; stale ownership model cannot re-enter the slice-1 contract surface
    Evidence: .sisyphus/evidence/task-1-contracts-error.txt
  ```

  **Commit**: YES | Message: `fix(contracts): correct slice-1 context-fact and form ownership model` | Files: `packages/contracts/src/**`

- [ ] 2. Correct methodology schema, repository, and authoring-service authority

  **What to do**: Patch the typed methodology tables/repositories/services so workflow context-fact definitions are first-class and Form field bindings are consumers. Implement or complete the missing repository methods needed by the existing services, and align service outputs with the refined `Contract | Value Semantics | Guidance` ownership. Preserve the one-outgoing-edge invariant and keep `conditionJson` ignored/deferred.
  **Must NOT do**: Do not revert to generic `configJson` authority for Form semantics. Do not reintroduce branch logic or non-Form authoring semantics.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: schema/repo/service authority must be exact
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: service layering and typed failures matter here
  - Omitted: [`brainstorming`] — Reason: decisions are already locked

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3,4,5,6 | Blocked By: 1

  **References**:
  - Pattern: `packages/db/src/schema/methodology.ts`
  - Pattern: `packages/db/src/repositories/form-step-repository.ts`
  - Pattern: `packages/db/src/repositories/workflow-context-fact-repository.ts`
  - Pattern: `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`
  - Pattern: `packages/methodology-engine/src/services/form-step-definition-service.ts`
  - Pattern: `packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts`
  - Pattern: `packages/methodology-engine/src/services/workflow-topology-mutation-service.ts`

  **Acceptance Criteria**:
  - [ ] Methodology repositories provide real editor-definition / form / edge / context-fact CRUD methods.
  - [ ] Service read models align to context-fact-first ownership.
  - [ ] One-outgoing-edge invariant remains enforced in service layer.
  - [ ] Context-fact tab ownership is represented in service DTOs, not just UI copy.

  **QA Scenarios**:
  ```
  Scenario: Methodology services and repositories follow corrected model
    Tool: Bash
    Steps: Run `bunx vitest run packages/db/src/tests/schema/l3-slice-1-schema.test.ts packages/db/src/tests/repository/l3-slice-1-repositories.test.ts packages/methodology-engine/src/tests/l3/l3-slice-1-workflow-editor-services.test.ts`
    Expected: PASS; typed tables, repos, editor-definition reads, form field bindings, and context-fact CRUD all align to the refinement model
    Evidence: .sisyphus/evidence/task-2-methodology.txt

  Scenario: Duplicate outgoing edge still fails deterministically
    Tool: Bash
    Steps: Re-run the methodology-engine suite and assert the second outgoing-edge create attempt returns the typed domain error
    Expected: PASS; service transaction enforces at most one outgoing edge per step
    Evidence: .sisyphus/evidence/task-2-methodology-error.txt
  ```

  **Commit**: YES | Message: `fix(methodology): align context-fact and form authoring authority` | Files: `packages/db/src/**`, `packages/methodology-engine/src/**`

- [ ] 3. Replace the stale Form dialog with the refined context-fact-first editor UX

  **What to do**: Patch `apps/web/src/features/workflow-editor/dialogs.tsx` so the Form dialog becomes exactly `Contract | Fields | Guidance`, with real field-binding CRUD, inline field cards, field-binding uniqueness, field-key derivation, `required`, UI multiplicity narrowing, viewport-bounded scrolling, and no `Context Facts` tab. Build the context-fact dialog as exactly `Contract | Value Semantics | Guidance`, with per-kind value-semantics behavior matching the refinement draft.
  **Must NOT do**: Do not leave placeholder “coming in slice-2” tabs. Do not keep Form-owned context-fact CRUD. Do not invent a JSON editor different from the methodology fact JSON editor pattern.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: dialog UX and tab ownership are the central correction target
  - Skills: [`effect-best-practices`] — Reason: keep data-flow/query state clean in React
  - Omitted: [`web-design-guidelines`] — Reason: product-model correctness is higher priority than general design audit

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 4,6 | Blocked By: 1,2

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md`
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx`
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx`
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx`
  - Target: `apps/web/src/features/workflow-editor/dialogs.tsx`

  **Acceptance Criteria**:
  - [ ] Form dialog tabs are exactly `Contract | Fields | Guidance`.
  - [ ] Context-fact dialog tabs are exactly `Contract | Value Semantics | Guidance`.
  - [ ] Fields tab has real inline field-binding CRUD and no placeholders.
  - [ ] JSON `plain_value_fact` UX mirrors the methodology fact JSON editor pattern.
  - [ ] `work_unit_reference_fact` does not appear in active slice-1 UI flows.

  **QA Scenarios**:
  ```
  Scenario: Workflow-editor dialog UX matches refined model
    Tool: Bash
    Steps: Run `bunx vitest run apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx`
    Expected: PASS; tests assert tab sets, no Form Context Facts tab, real field-binding CRUD, context-fact-first flows, and JSON editor parity behavior
    Evidence: .sisyphus/evidence/task-3-web-dialogs.txt

  Scenario: Form binding cannot reuse the same context fact twice in one form
    Tool: Bash
    Steps: Re-run the same integration suite and assert the duplicate-binding case is blocked in UI state and submission path
    Expected: PASS; a single contextFactDefinitionId cannot be bound twice in one Form
    Evidence: .sisyphus/evidence/task-3-web-dialogs-error.txt
  ```

  **Commit**: YES | Message: `fix(web): replace stale form dialog with context-fact-first UX` | Files: `apps/web/src/features/workflow-editor/dialogs.tsx`

- [ ] 4. Finish the workflow-editor shell and route as the canonical context-fact CRUD surface

  **What to do**: Patch the workflow-editor route, shell, and inspector/panel behavior so the route is authoritative by `workflowDefinitionId`, the `Context Fact Definitions` section is real CRUD (list, create, edit, delete), left-rail sections size to content with internal scroll regions, raw GeoForm code strip is gone, and the route uses canonical editor-definition loading instead of reconstructing from `workflow.list` plus local filtering.
  **Must NOT do**: Do not lose the good explicit route identity. Do not turn this into a left-rail redesign beyond the defects already locked.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: preserve shell foundations while correcting editor authority and panel behavior
  - Skills: [`effect-best-practices`] — Reason: query/mutation state and invalidation must stay clean
  - Omitted: [`brainstorming`] — Reason: layout and ownership are already decided

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 5,6 | Blocked By: 2,3

  **References**:
  - Target: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
  - Target: `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx`
  - Target: `apps/web/src/features/workflow-editor/step-list-inspector.tsx`
  - Target: `apps/web/src/features/workflow-editor/step-types-grid.tsx`
  - Pattern: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`

  **Acceptance Criteria**:
  - [ ] Editor route loads by `workflowDefinitionId` as the canonical identity.
  - [ ] `Context Fact Definitions` is a real CRUD surface, not decorative scaffolding.
  - [ ] Left rail has content-sized sections and scrollable internal regions.
  - [ ] Raw GeoForm code strip is removed.

  **QA Scenarios**:
  ```
  Scenario: Workflow editor route and shell stay authoritative
    Tool: Bash
    Steps: Run `bunx vitest run apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx packages/api/src/tests/routers/l3-slice-1-methodology-router.test.ts`
    Expected: PASS; editor data loads by workflowDefinitionId and context-fact CRUD actions use the canonical editor-definition flow
    Evidence: .sisyphus/evidence/task-4-editor-shell.txt

  Scenario: Invalid workflowDefinitionId produces deterministic not-found/editor error state
    Tool: Bash
    Steps: Re-run the same suites and assert the invalid workflowDefinitionId case yields the locked error state instead of fallback reconstruction
    Expected: PASS; no silent fallback to workflow.list reconstruction
    Evidence: .sisyphus/evidence/task-4-editor-shell-error.txt
  ```

  **Commit**: YES | Message: `fix(web): finish workflow editor context-fact surface` | Files: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`, `apps/web/src/features/workflow-editor/**`


- [ ] 5. Add the locked 9 design-time BMAD fact definitions to the methodology seed and keep demo examples clearly separate

  **What to do**: Patch only `packages/scripts/src/seed/methodology/**` and related seed tests so the 9 locked BMAD-derived fact definitions are added at design time only, with no runtime rows and no runtime instance creation flows. Keep baseline seed integrity intentionally updated, keep demo fixture examples clearly marked fixture-only, and ensure temporary workflow-reference proof rows remain removable/test-only.
  **Must NOT do**: Do not seed runtime rows. Do not add `project_root_path` as a methodology/work-unit fact definition. Do not turn fixture-only workflow-context examples into permanent methodology fact definitions.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: fixture drift can silently encode the wrong model
  - Skills: [`effect-best-practices`] — Reason: maintain deterministic contracts and tests
  - Omitted: [`brainstorming`] — Reason: fixture scope is already locked

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 6 | Blocked By: 1,2,4

  **References**:
  - Target: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
  - Target: `packages/scripts/src/seed/methodology/index.ts`
  - Target: `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts`
  - Target: `packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`
  - Baseline lock: `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`
  - Authority: `.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md`

  **Acceptance Criteria**:
  - [ ] Permanent seed additions include exactly these 9 design-time fact definitions and no runtime rows: `workflow_mode`, `scan_level`, `requires_brainstorming`, `deep_dive_target`, `repository_type`, `project_parts`, `technology_stack_by_part`, `existing_documentation_inventory`, `integration_points`.
  - [ ] `workflow_mode`, `scan_level`, `requires_brainstorming`, and `deep_dive_target` are added as `work_unit_fact_definitions` for `WU.SETUP`.
  - [ ] `repository_type`, `project_parts`, `technology_stack_by_part`, `existing_documentation_inventory`, and `integration_points` are added as `methodology_fact_definitions`.
  - [ ] `project_root_path` is not added as a seeded fact definition.
  - [ ] Demo fixture examples remain separate from permanent seed definitions.

  **QA Scenarios**:
  ```
  Scenario: Permanent design-time fact definitions and demo fixture remain intentionally separated
    Tool: Bash
    Steps: Run `bunx vitest run packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`
    Expected: PASS; permanent seeded fact definitions are present, no runtime rows are introduced, and demo fixture remains fixture-only
    Evidence: .sisyphus/evidence/task-5-fixtures.txt

  Scenario: Temporary workflow-reference example stays proof-only
    Tool: Bash
    Steps: Re-run the demo-fixture suite and assert the temporary workflow-reference example uses exactly two setup stub workflows and is marked test-only
    Expected: PASS; fixture does not pretend the temporary example is stable setup truth
    Evidence: .sisyphus/evidence/task-5-fixtures-temp.txt
  ```

  **Commit**: YES | Message: `feat(seed): add locked design-time BMAD fact definitions` | Files: `packages/scripts/src/seed/methodology/**`, `packages/scripts/src/tests/seeding/**`

- [ ] 6. Run integrated design-time correction sweep and prepare the branch for execution handoff

  **What to do**: Run all slice-1 design-time correction tests, ensure only the intended files remain in scope, verify the plan’s preserve/patch/replace decisions are reflected in the branch, and confirm the corrected slice is now centered on full workflow-editor context-fact CRUD and full Form-step design-time CRUD instead of placeholder scaffolding.
  **Must NOT do**: Do not let unrelated desktop/server/churn files slip into the correction branch. Do not mark the slice done if the design-time product model is still placeholder-heavy.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: final integrated sweep across multiple packages
  - Skills: [`effect-best-practices`] — Reason: maintain clean layer and test boundaries during final verification
  - Omitted: [`hono`] — Reason: not needed

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: none | Blocked By: 2,3,4,5

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md`
  - Drift map: `.sisyphus/drafts/l3-slice-1-implementation-triage.md`
  - Existing plan to supersede operationally: `.sisyphus/plans/l3-slice-1-step-core-and-form.md`

  **Acceptance Criteria**:
  - [ ] Preserve/patch/replace inventory is reflected in the final change set.
  - [ ] All named tests in Definition of Done pass.
  - [ ] Slice-1 no longer relies on placeholder Form/context-fact authoring behavior.
  - [ ] Unrelated churn is excluded from the correction branch scope.

  **QA Scenarios**:
  ```
  Scenario: Full correction test suite passes
    Tool: Bash
    Steps: Run every command listed in Definition of Done in sequence from repo root
    Expected: PASS; contracts, schema, repositories, services, routers, web routes, and fixture tests are all green
    Evidence: .sisyphus/evidence/task-6-full-suite.txt

  Scenario: Correction branch scope excludes unrelated churn
    Tool: Bash
    Steps: Run `git status --short` and compare remaining paths against the preserve/patch/replace inventory in this plan
    Expected: Only intended slice-1 correction files remain; unrelated desktop/server/evidence/package churn is absent or isolated
    Evidence: .sisyphus/evidence/task-6-scope.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

## Final Verification Wave
> 4 review agents run in PARALLEL. ALL must approve. Present consolidated results to user and get explicit okay before marking work complete.

- [ ] F1. Plan Compliance Audit — oracle

  **QA Scenarios**:
  ```
  Scenario: Oracle validates corrected implementation against this plan
    Tool: task
    Steps: Run `task(subagent_type="oracle", load_skills=[], run_in_background=false, description="Slice1 compliance", prompt="Review the implemented changes for /home/gondilf/Desktop/projects/masters/chiron against /home/gondilf/Desktop/projects/masters/chiron/.sisyphus/plans/l3-slice-1-context-facts-form-correction.md. Check preserve/patch/replace decisions, active kind scope, dialog tab ownership, design-time-only scope, and seed-definition boundaries. Return blocking issues only.")`
    Expected: Oracle returns no blocking issues.
    Evidence: .sisyphus/evidence/f1-plan-compliance.txt
  ```

- [ ] F2. Code Quality Review — unspecified-high

  **QA Scenarios**:
  ```
  Scenario: Independent code review of corrected slice-1 files
    Tool: task
    Steps: Run `task(category="unspecified-high", load_skills=[], run_in_background=false, description="Slice1 code review", prompt="Review the corrected slice-1 implementation for workflow-editor context-fact CRUD and Form-step design-time CRUD only. Focus on contract drift, stale ownership artifacts, Effect service boundaries, router thinness, design-time-only scope, and test sufficiency. Return concrete findings only.")`
    Expected: Reviewer returns no blocking issues.
    Evidence: .sisyphus/evidence/f2-code-quality.txt
  ```

- [ ] F3. Browser-level agent QA — unspecified-high (+ playwright if UI)

  **QA Scenarios**:
  ```
  Scenario: Browser-level QA of the corrected workflow-editor and runtime form flow
    Tool: task
    Steps: Run `task(category="unspecified-high", load_skills=[], run_in_background=false, description="Slice1 browser QA", prompt="Using Playwright and the repo test commands where useful, QA the corrected slice-1 workflow-editor context-fact CRUD, Form dialog CRUD, field-binding behavior, and design-time-only seed boundaries. Return blocking defects only.")`
    Expected: Reviewer returns no blocking UI/design-time defects.
    Evidence: .sisyphus/evidence/f3-manual-qa.txt
  ```

- [ ] F4. Scope Fidelity Check — deep

  **QA Scenarios**:
  ```
  Scenario: Deep scope audit against refinement authority
    Tool: task
    Steps: Run `task(category="deep", load_skills=[], run_in_background=false, description="Slice1 scope audit", prompt="Audit the corrected slice-1 implementation against /home/gondilf/Desktop/projects/masters/chiron/.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md and /home/gondilf/Desktop/projects/masters/chiron/.sisyphus/drafts/l3-slice-1-implementation-triage.md. Confirm no cleanup-only drift, no non-Form expansion, and no reintroduction of stale ownership model artifacts. Return blocking scope violations only.")`
    Expected: Auditor returns no blocking scope violations.
    Evidence: .sisyphus/evidence/f4-scope-fidelity.txt
  ```

## Commit Strategy
- Commit 1: correct contracts + remove stale shared invariant / stale active kind expectations
- Commit 2: correct methodology schema/repos/services for context-fact-first model
- Commit 3: replace stale Form dialog and finish workflow-editor context-fact CRUD surfaces
- Commit 4: add locked design-time BMAD fact definitions and keep fixture-only examples separate

## Success Criteria
- Workflow-editor context-fact CRUD is a real usable feature, not a placeholder.
- Form design-time CRUD and field-binding behavior are definition-driven and match the refinement authority.
- Good slice-1 foundations are preserved rather than unnecessarily rewritten.
- The branch no longer encodes the stale ownership model that caused the current drift.
- Runtime work remains explicitly deferred rather than half-implemented in this plan.
