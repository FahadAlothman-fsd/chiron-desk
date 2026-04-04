# L3 Slice 1 Correction — Context Facts and Form

## TL;DR
> **Summary**: Correct the implemented slice-1 foundations so they reach the real product target: full workflow-editor context-fact CRUD plus full Form CRUD/runtime, without throwing away the good step-core, route, schema, and activation foundations already built.
> **Deliverables**:
> - Corrected context-fact-first contract/model across contracts, routers, services, and tests
> - Fully usable workflow-editor context-fact CRUD surface
> - Fully usable Form dialog and field-binding CRUD based on linked workflow context facts
> - Corrected Form runtime behavior, step detail tabs, and bound/definition-backed semantics
> - End-to-end `projectRootPath` persistence and project-fact manual-authoring support
> - Corrected demo-fixture path and temporary test-only workflow-reference example
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: contracts/model correction → methodology schema/repos/services → workflow-editor UX → runtime form semantics → projectRootPath/project-facts flow → demo fixture + verification

## Context
### Original Request
Finalize a new implementation-correction plan for slice-1. This plan must not become cleanup-only. It must preserve the good foundations already implemented while repairing the wrong ownership model so slice-1 actually delivers full workflow-editor context-fact CRUD and full Form CRUD/runtime.

### Implemented-State Summary
- Good foundations already exist and should be preserved: explicit workflow-editor route identity, workflow launch wiring, dark shell + disabled later-step tiles, one-outgoing-edge rule, first-step activation seam, typed methodology/runtime table direction, runtime step-core services, step detail route, and baseline/demo seed split concept.
- The current drift is concentrated in the product model, not the infrastructure:
  - Form contracts still couple Form fields and context-fact definitions.
  - The Form dialog still behaves as `Contract | Fields | Context Facts` with placeholders instead of real field-binding CRUD.
  - Context-fact semantics are not fully expressed in the workflow-editor CRUD/read-models.
  - `form-step-execution-service.ts` still uses shortcuts like key-prefix routing rather than context-fact-definition-driven semantics.
  - `SetupTags` lives in shared invariants even though it is slice-1/demo-specific.
  - `projectRootPath` is wired in UI but not persisted end-to-end through project creation.

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
- Add acceptance criteria for tab ownership, widget derivation, UI multiplicity, bound-external zero-instance behavior, and end-to-end `projectRootPath` persistence.
- Use the triage model directly in the plan: preserve foundations, patch wrong/incomplete seams in place, and explicitly replace/remove stale ownership artifacts.
- Keep unrelated desktop/server/package churn out of correction commits.

## Work Objectives
### Core Objective
Repair slice-1 so the implemented route/shell/runtime foundations become a coherent product slice centered on workflow-level context-fact CRUD and Form authoring/runtime behavior, while preserving good existing infrastructure and avoiding cleanup-only churn.

### Deliverables
- Corrected contracts in `packages/contracts/src/methodology/workflow.ts`, `packages/contracts/src/runtime/executions.ts`, and related tests.
- Corrected methodology schema/repository/service authority for workflow context facts and Form field bindings.
- Corrected workflow-editor surfaces in `apps/web/src/features/workflow-editor/**` and the explicit workflow-editor route.
- Corrected runtime Form semantics in workflow-engine and step-detail/web surfaces.
- Corrected `createAndPinProject` → project-context → repository → `projects.project_root_path` persistence chain.
- Corrected project-fact manual-authoring path for the `bound_external_fact` zero-instance flow.
- Corrected demo-fixture path and temporary workflow-reference fixture behavior.

### Definition of Done
- `bunx vitest run packages/contracts/src/tests/l3-slice-1-contracts.test.ts`
- `bunx vitest run packages/db/src/tests/schema/l3-slice-1-schema.test.ts packages/db/src/tests/repository/l3-slice-1-repositories.test.ts packages/db/src/tests/repository/l3-slice-1-runtime-repositories.test.ts`
- `bunx vitest run packages/methodology-engine/src/tests/l3/l3-slice-1-workflow-editor-services.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-slice-1-step-core.test.ts packages/workflow-engine/src/tests/runtime/l3-slice-1-form-runtime.test.ts`
- `bunx vitest run packages/api/src/tests/routers/l3-slice-1-methodology-router.test.ts packages/api/src/tests/routers/l3-slice-1-router.test.ts packages/api/src/tests/architecture/l3-slice-1-deferred-surfaces.test.ts`
- `bunx vitest run apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx apps/web/src/tests/routes/runtime-form-step-detail.test.tsx apps/web/src/tests/routes/runtime-workflow-execution-detail.test.tsx apps/web/src/tests/routes/runtime-project-facts.test.tsx apps/web/src/tests/routes/projects.new.integration.test.tsx`
- `bunx vitest run packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`

### Must Have
- Exactly 6 active context-fact kinds in this correction slice; `work_unit_reference_fact` removed from active scope.
- Form never owns inline context-fact definitions anywhere in contracts, routers, services, read models, or tests.
- Form dialog tabs are exactly `Contract | Fields | Guidance`.
- Context-fact dialog tabs are exactly `Contract | Value Semantics | Guidance`.
- `Contract` vs `Value Semantics` vs `Guidance` ownership is enforced exactly as locked in the refinement draft.
- Field widget/runtime behavior is derived from linked context-fact definitions.
- `bound_external_fact` zero-instance behavior shows explicit empty state and routes the operator into project-fact manual authoring.
- `projectRootPath` persists end-to-end into `projects.project_root_path`.
- Good foundations are preserved: route identity, one-outgoing-edge invariant, first-step activation seam, typed tables direction, runtime step-core seams.

### Must NOT Have
- No cleanup-only plan shape.
- No reintroduction of Form-owned inline context facts.
- No `Context Facts` tab inside the Form dialog.
- No standalone `inputKind` field or enum driving runtime widget behavior.
- No `SetupTags` in `packages/contracts/src/shared/invariants.ts`.
- No active slice-1 implementation/testing surface for `work_unit_reference_fact`.
- No unrelated desktop/server/package-manifest churn folded into slice-1 correction commits.
- No expansion into Agent/Action/Invoke/Branch runtime behavior beyond existing deferred/default surfaces.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after against the already implemented slice-1 foundations.
- QA policy: every correction task must preserve good infrastructure while proving the corrected product model with concrete tests.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Preserve / Patch / Replace Inventory
#### Preserve as-is foundations
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- `apps/web/src/features/workflow-editor/step-types-grid.tsx`
- `apps/web/src/features/workflow-editor/step-list-inspector.tsx` (preserve seam, patch details only if task says so)
- `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx` (preserve shell + left-rail/canvas seam)
- `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx` (preserve role as activation surface)
- `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx` (preserve dedicated step-detail route)
- `packages/methodology-engine/src/services/workflow-topology-mutation-service.ts`
- `packages/workflow-engine/src/services/workflow-execution-step-command-service.ts`
- `packages/workflow-engine/src/services/step-execution-detail-service.ts`
- `packages/workflow-engine/src/services/step-execution-lifecycle-service.ts`
- `packages/workflow-engine/src/services/step-progression-service.ts`
- `packages/workflow-engine/src/services/step-context-query-service.ts`
- `packages/workflow-engine/src/services/step-context-mutation-service.ts`
- `packages/workflow-engine/src/services/step-execution-transaction-service.ts`
- `packages/db/src/runtime-repositories/step-execution-repository.ts`
- Typed methodology/runtime table direction in `packages/db/src/schema/methodology.ts` and `packages/db/src/schema/runtime.ts`

#### Patch in place
- `apps/web/src/features/workflow-editor/dialogs.tsx`
- `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx`
- `apps/web/src/routes/projects.new.tsx`
- `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`
- `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`
- `apps/web/src/routes/projects.$projectId.facts.tsx`
- `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx`
- `packages/contracts/src/methodology/workflow.ts`
- `packages/api/src/routers/methodology.ts`
- `packages/api/src/routers/project.ts`
- `packages/methodology-engine/src/services/form-step-definition-service.ts`
- `packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts`
- `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`
- `packages/workflow-engine/src/services/form-step-execution-service.ts`
- `packages/workflow-engine/src/services/step-progression-service.ts` and `step-execution-transaction-service.ts` if deferred behavior is too eager
- `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts`
- `packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`
- project-context create/persist seams under `packages/project-context/src/**`

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
4. `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`
   - explicit activation CTA when no step exists
   - compact step summary after activation
5. `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`
   - tabs and semantics aligned to corrected runtime model
6. `apps/web/src/routes/projects.new.tsx`
   - `projectRootPath` browse/validate/normalize/persist works end-to-end
7. `apps/web/src/routes/projects.$projectId.facts.tsx` and `...facts.$factDefinitionId.tsx`
   - project-fact instance authoring is practical and clearly the manual path for `bound_external_fact`

### Service / repo / transaction inventory
#### Methodology-engine
- Keep and patch:
  - `WorkflowEditorDefinitionService`
  - `WorkflowTopologyMutationService`
  - `FormStepDefinitionService`
  - `WorkflowContextFactDefinitionService`
  - `WorkflowAuthoringTransactionService`
- Add or split explicitly if needed for clarity:
  - `WorkflowMetadataService` as a distinct service only if required to make metadata ownership cleaner; otherwise document canonical ownership in `WorkflowService`

#### Workflow-engine
- Keep and patch:
  - `WorkflowExecutionStepCommandService`
  - `StepExecutionDetailService`
  - `StepExecutionLifecycleService`
  - `StepProgressionService`
  - `StepContextQueryService`
  - `StepContextMutationService`
  - `FormStepExecutionService`
  - `StepExecutionTransactionService`

#### Repositories
- Preserve existing repo seams where real and aligned.
- Patch methodology repositories to provide real editor-definition / form-field / edge / context-fact CRUD methods.
- Patch project-context create/persist seams so `projectRootPath` reaches `projects.project_root_path`.

#### Effect guardrails
- Routers remain thin; one top-level service call per procedure.
- Services use Effect-style boundaries with explicit typed errors.
- Live layers updated in `packages/methodology-engine/src/layers/live.ts` and `packages/workflow-engine/src/layers/live.ts`.
- No direct repo calls from UI glue or router handlers that bypass service boundaries.

### Parallel Execution Waves
Wave 1: contracts/tests + stale artifact removal rules + schema/repository authority corrections
Wave 2: methodology-engine services/read models + workflow-editor dialogs/shell corrections
Wave 3: runtime form semantics + projectRootPath/project-fact manual-authoring flow + demo fixture correction
Wave 4: integrated verification, correction sweep, final review wave

### Dependency Matrix
- T1 blocks T2, T3, T4, T5, T6, T7, T8
- T2 blocks T3, T4, T7, T8
- T3 blocks T4, T5
- T4 blocks T5, T7
- T5 blocks T8
- T6 blocks T5, T8
- T7 blocks T8

### Agent Dispatch Summary
- Wave 1 → 2 tasks → deep
- Wave 2 → 2 tasks → deep / visual-engineering
- Wave 3 → 3 tasks → deep / unspecified-high
- Wave 4 → 1 task + final verification → oracle / unspecified-high / deep

## TODOs
> This is an implementation-correction plan. Preserve good foundations; patch or replace only where the product model is wrong or incomplete.

- [ ] 1. Correct the slice-1 contract model and remove stale ownership artifacts

  **What to do**: Patch `packages/contracts/src/methodology/workflow.ts`, `packages/contracts/src/runtime/executions.ts`, and related tests so the contract model matches the refinement draft exactly: active kind set is 6, Form fields bind to existing workflow context facts, `work_unit_reference_fact` is out of active scope, `inputKind` is gone, widget behavior is derived, UI multiplicity narrowing is encoded, and `SetupTags` is removed from shared invariants and relocated to a slice-1-local contract/module if still needed for the demo fixture.
  **Must NOT do**: Do not preserve `FormStepPayload.contextFacts`. Do not keep active slice-1 expectations for `work_unit_reference_fact`. Do not leave `SetupTags` in `packages/contracts/src/shared/invariants.ts`.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: contracts are the root of the drift
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: service/contract boundaries and typed errors must stay future-safe
  - Omitted: [`hono`] — Reason: not transport-specific work

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4,5,6,7,8 | Blocked By: none

  **References**:
  - Pattern: `packages/contracts/src/methodology/workflow.ts`
  - Pattern: `packages/contracts/src/runtime/executions.ts`
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

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,7,8 | Blocked By: 1

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

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 4,5,8 | Blocked By: 1,2

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

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 5,8 | Blocked By: 2,3

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

- [ ] 5. Correct runtime Form behavior, step detail semantics, and deferred later-step behavior

  **What to do**: Patch workflow-engine runtime services and the web runtime routes so Form submission/writes are driven by linked context-fact definitions rather than key-prefix shortcuts, step detail tabs explain exactly what `Submission & Progression`, `Writes`, and `Context Fact Semantics` mean, bound/definition-backed behavior matches the refinement draft, and progression/deferred behavior does not accidentally behave like later steps are fully active.
  **Must NOT do**: Do not remove the explicit first-step activation seam. Do not expand into non-Form runtime commands. Do not auto-activate next non-Form steps with real semantics.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: runtime semantics drift is subtle and cross-layer
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: service boundaries, errors, and transactions must be precise
  - Omitted: [`hono`] — Reason: no Hono-specific work here

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8 | Blocked By: 1,2,3,4

  **References**:
  - Target: `packages/workflow-engine/src/services/form-step-execution-service.ts`
  - Target: `packages/workflow-engine/src/services/step-execution-detail-service.ts`
  - Target: `packages/workflow-engine/src/services/step-progression-service.ts`
  - Target: `packages/workflow-engine/src/services/step-execution-transaction-service.ts`
  - Target: `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`
  - Target: `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`

  **Acceptance Criteria**:
  - [ ] Form runtime semantics are context-fact-definition-driven, not key-prefix-driven.
  - [ ] Step detail tabs and copy match the corrected runtime model.
  - [ ] `bound_external_fact` zero-instance behavior is explicit and routes operators into project-fact authoring.
  - [ ] Later step types remain deferred/default rather than eagerly gaining runtime behavior.

  **QA Scenarios**:
  ```
  Scenario: Runtime Form semantics follow corrected model
    Tool: Bash
    Steps: Run `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-slice-1-step-core.test.ts packages/workflow-engine/src/tests/runtime/l3-slice-1-form-runtime.test.ts apps/web/src/tests/routes/runtime-form-step-detail.test.tsx apps/web/src/tests/routes/runtime-workflow-execution-detail.test.tsx`
    Expected: PASS; activation is explicit/idempotent, Form writes follow context-fact definitions, and step-detail tabs match corrected semantics
    Evidence: .sisyphus/evidence/task-5-runtime.txt

  Scenario: Bound external fact with zero instances shows explicit empty-state path
    Tool: Bash
    Steps: Re-run the same suites and assert a bound_external field with zero project-fact instances surfaces the locked empty state instead of inline create-new behavior
    Expected: PASS; operator is redirected into the project-fact manual-authoring path
    Evidence: .sisyphus/evidence/task-5-runtime-error.txt
  ```

  **Commit**: YES | Message: `fix(runtime): align form execution with context-fact semantics` | Files: `packages/workflow-engine/src/**`, `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`, `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`

- [ ] 6. Complete projectRootPath persistence and practical project-fact manual authoring

  **What to do**: Patch `projects.new.tsx`, `packages/api/src/routers/project.ts`, and the project-context service/repository seams so `projectRootPath` persists end-to-end into `projects.project_root_path`. Patch project-facts list/detail surfaces so manual authoring of project-fact instances is practical and clearly the operator path used by `bound_external_fact` zero-instance flows.
  **Must NOT do**: Do not leave the path flow half-wired at UI/contract level only. Do not broaden manual authoring into non-project scopes.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: this is cross-package glue with concrete product impact
  - Skills: [`effect-best-practices`] — Reason: keep project-context seams disciplined
  - Omitted: [`hono`] — Reason: no server transport redesign

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8 | Blocked By: 1

  **References**:
  - Target: `apps/web/src/routes/projects.new.tsx`
  - Target: `apps/web/src/routes/projects.$projectId.facts.tsx`
  - Target: `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx`
  - Target: `packages/api/src/routers/project.ts`
  - Target: `packages/project-context/src/service.ts`
  - Target: `packages/project-context/src/repository.ts`
  - Authority: `packages/db/src/schema/project.ts`

  **Acceptance Criteria**:
  - [ ] `projectRootPath` persists through API/service/repository into `projects.project_root_path`.
  - [ ] Project facts list/detail surfaces clearly support manual project-fact instance authoring.
  - [ ] Non-project manual authoring remains unavailable.

  **QA Scenarios**:
  ```
  Scenario: Project root path persists end-to-end
    Tool: Bash
    Steps: Run `bunx vitest run apps/web/src/tests/routes/projects.new.integration.test.tsx packages/project-context/src/tests/service/service.test.ts packages/api/src/tests/routers/l3-slice-1-router.test.ts`
    Expected: PASS; normalized projectRootPath reaches persisted project row and round-trips correctly
    Evidence: .sisyphus/evidence/task-6-project-root.txt

  Scenario: Project-fact manual authoring stays project-scoped only
    Tool: Bash
    Steps: Run `bunx vitest run apps/web/src/tests/routes/runtime-project-facts.test.tsx packages/api/src/tests/routers/l3-slice-1-router.test.ts`
    Expected: PASS; project-fact instance creation works, and non-project manual authoring remains blocked/unavailable
    Evidence: .sisyphus/evidence/task-6-project-facts.txt
  ```

  **Commit**: YES | Message: `fix(project): persist project root and complete project-fact authoring` | Files: `apps/web/src/routes/projects.new.tsx`, `apps/web/src/routes/projects.$projectId.facts*.tsx`, `packages/api/src/routers/project.ts`, `packages/project-context/src/**`

- [ ] 7. Correct the demo fixture and temporary reference examples

  **What to do**: Patch the demo fixture path so it matches the corrected slice-1 model, explicitly keep baseline seed integrity unchanged, keep the temporary `workflow_reference_fact` example test-only with exactly two stub workflows under setup, and remove any active fixture/test expectations that still depend on `work_unit_reference_fact` or stale Form-owned context facts.
  **Must NOT do**: Do not collapse baseline and demo profiles together. Do not treat temporary workflow-reference stubs as stable setup facts.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: fixture drift can silently encode the wrong model
  - Skills: [`effect-best-practices`] — Reason: maintain deterministic contracts and tests
  - Omitted: [`brainstorming`] — Reason: fixture scope is already locked

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8 | Blocked By: 1,2,4

  **References**:
  - Target: `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts`
  - Target: `packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`
  - Baseline lock: `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`
  - Authority: `.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md`

  **Acceptance Criteria**:
  - [ ] Baseline seed remains zero-step/zero-edge.
  - [ ] Demo fixture matches corrected context-fact-first model.
  - [ ] Temporary workflow-reference example is explicitly test-only and removable.
  - [ ] No fixture/test path keeps `work_unit_reference_fact` in active slice-1 scope.

  **QA Scenarios**:
  ```
  Scenario: Baseline and demo fixture remain intentionally separated
    Tool: Bash
    Steps: Run `bunx vitest run packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`
    Expected: PASS; baseline stays zero-step/zero-edge, demo fixture reflects corrected slice-1 model only
    Evidence: .sisyphus/evidence/task-7-fixtures.txt

  Scenario: Temporary workflow-reference example is constrained and removable
    Tool: Bash
    Steps: Re-run the demo-fixture suite and assert the temporary workflow-reference example uses exactly two setup stub workflows and is marked test-only
    Expected: PASS; fixture does not pretend the temporary example is stable setup truth
    Evidence: .sisyphus/evidence/task-7-fixtures-temp.txt
  ```

  **Commit**: YES | Message: `fix(seed): align slice-1 demo fixture with corrected model` | Files: `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts`, `packages/scripts/src/tests/seeding/**`

- [ ] 8. Run integrated correction sweep and prepare the branch for execution handoff

  **What to do**: Run all slice-1 correction tests, ensure only the intended files remain in scope, verify the plan’s preserve/patch/replace decisions are reflected in the branch, and confirm the corrected slice is now centered on full workflow-editor context-fact CRUD and full Form CRUD/runtime instead of placeholder scaffolding.
  **Must NOT do**: Do not let unrelated desktop/server/churn files slip into the correction branch. Do not mark the slice done if the product model is still placeholder-heavy.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: final integrated sweep across multiple packages
  - Skills: [`effect-best-practices`] — Reason: maintain clean layer and test boundaries during final verification
  - Omitted: [`hono`] — Reason: not needed

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: none | Blocked By: 2,3,4,5,6,7

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
    Evidence: .sisyphus/evidence/task-8-full-suite.txt

  Scenario: Correction branch scope excludes unrelated churn
    Tool: Bash
    Steps: Run `git status --short` and compare remaining paths against the preserve/patch/replace inventory in this plan
    Expected: Only intended slice-1 correction files remain; unrelated desktop/server/evidence/package churn is absent or isolated
    Evidence: .sisyphus/evidence/task-8-scope.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

## Final Verification Wave
> 4 review agents run in PARALLEL. ALL must approve. Present consolidated results to user and get explicit okay before marking work complete.

- [ ] F1. Plan Compliance Audit — oracle

  **QA Scenarios**:
  ```
  Scenario: Oracle validates corrected implementation against this plan
    Tool: task
    Steps: Run `task(subagent_type="oracle", load_skills=[], run_in_background=false, description="Slice1 compliance", prompt="Review the implemented changes for /home/gondilf/Desktop/projects/masters/chiron against /home/gondilf/Desktop/projects/masters/chiron/.sisyphus/plans/l3-slice-1-context-facts-form-correction.md. Check preserve/patch/replace decisions, active kind scope, dialog tab ownership, runtime semantics, and projectRootPath persistence. Return blocking issues only.")`
    Expected: Oracle returns no blocking issues.
    Evidence: .sisyphus/evidence/f1-plan-compliance.txt
  ```

- [ ] F2. Code Quality Review — unspecified-high

  **QA Scenarios**:
  ```
  Scenario: Independent code review of corrected slice-1 files
    Tool: task
    Steps: Run `task(category="unspecified-high", load_skills=[], run_in_background=false, description="Slice1 code review", prompt="Review the corrected slice-1 implementation for workflow-editor context-fact CRUD and Form CRUD/runtime. Focus on contract drift, stale ownership artifacts, Effect service boundaries, router thinness, and test sufficiency. Return concrete findings only.")`
    Expected: Reviewer returns no blocking issues.
    Evidence: .sisyphus/evidence/f2-code-quality.txt
  ```

- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)

  **QA Scenarios**:
  ```
  Scenario: Browser-level QA of the corrected workflow-editor and runtime form flow
    Tool: task
    Steps: Run `task(category="unspecified-high", load_skills=[], run_in_background=false, description="Slice1 manual QA", prompt="Using Playwright and the repo test commands where useful, manually QA the corrected slice-1 workflow-editor context-fact CRUD, Form dialog CRUD, first-step activation, runtime step detail tabs, projectRootPath flow, and project-fact manual authoring. Return blocking defects only.")`
    Expected: Reviewer returns no blocking UI/runtime defects.
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
- Commit 4: correct runtime Form semantics and step-detail/workflow-detail behavior
- Commit 5: complete projectRootPath + project-facts manual-authoring path
- Commit 6: correct demo fixture/test alignment

## Success Criteria
- Workflow-editor context-fact CRUD is a real usable feature, not a placeholder.
- Form CRUD and runtime behavior are definition-driven and match the refinement authority.
- Good slice-1 foundations are preserved rather than unnecessarily rewritten.
- The branch no longer encodes the stale ownership model that caused the current drift.
