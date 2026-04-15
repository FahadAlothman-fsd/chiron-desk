# L3 Slice 2 Runtime Branch

## TL;DR
> **Summary**: Implement branch-step runtime with explicit persisted selection state, branch-aware progression, server-assembled branch detail payloads, and a shared condition-evaluation core aligned with transition gates.
> **Deliverables**:
> - Branch runtime DB state + repositories
> - Branch detail/read-model + explicit save mutation
> - Branch-aware progression/completion revalidation
> - Shared branch/transition gate condition evaluation semantics
> - Runtime `valueJson` shape alignment for context-fact kinds used by branch
> - Step-execution detail UI for branch
> **Effort**: XL
> **Parallel**: YES - 2 waves
> **Critical Path**: Contracts/Shapes → Condition Engine + DB State → Branch Resolver/Progression → API Read Model → UI

## Context
### Original Request
- Plan the branch step at runtime after branch design time landed.
- Keep branch runtime aligned with the pulled `feat/effect-migration` design-time implementation.
- Treat invoke runtime as a separate already-planned artifact, but reuse invoke/design-time seams where useful.

### Interview Summary
- Branch runtime lives inside `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`.
- Persist branch runtime state explicitly with one row per `stepExecutionId`, created on activation with null selection and updated in place on explicit save.
- Persist **`selectedTargetStepId`**, not `selectedRouteId`.
- Save-selection is separate from generic complete-step.
- Default target is UI-only auto-selection until explicit save; shown in a distinct default section below conditional routes.
- Completion must only use a persisted valid selection; never silently consume a UI-derived default.
- Query/refetch in v1; no branch-specific stream.
- Runtime workflow context facts stay in the single `workflow_execution_context_facts` table, but every fact kind requires an explicit runtime `valueJson` shape.
- Cross-layer shape coherence is required across project facts, project work-unit facts, and workflow context facts.
- Transition gate condition evaluation must be refactored to align with branch condition semantics.
- Condition semantics were locked for:
  - `plain_value_fact`
  - `artifact_reference_fact`
  - `workflow_reference_fact`
  - `bound_external_fact`
  - `definition_backed_external_fact`
  - `work_unit_draft_spec_fact`

### Metis Review (gaps addressed)
- Add guardrails separating `persistedSelection`, UI-derived default suggestion, and current validity.
- Revalidate persisted target on completion and again at next-step activation.
- Keep branch/gate alignment at the evaluator/operator layer, not by forcing identical storage models.
- Scope transition-gate refactor to semantic alignment needed for branch v1 only.
- Make route precedence explicit to avoid hidden ambiguity.

## Work Objectives
### Core Objective
Deliver a decision-complete branch runtime implementation plan that adds explicit branch selection persistence, branch-aware progression, server-assembled branch UI payloads, and aligned branch/gate condition semantics without introducing branch streaming or generic runtime redesign.

### Deliverables
- Branch runtime schema/repository/service design in `packages/db` and `packages/workflow-engine`
- Branch runtime contracts in `packages/contracts`
- Branch API wiring in `packages/api/src/routers/project-runtime.ts`
- Branch UI in `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`
- Transition gate evaluator alignment plan
- Runtime `valueJson` shape enforcement for branch-relevant context-fact kinds
- Test plan and concrete regression coverage targets

### Definition of Done
- Branch step activation creates runtime state with null selection.
- Explicit save persists `selectedTargetStepId` and completion remains separate.
- Branch detail payload returns `body.branch` with the locked section/field structure.
- Workflow progression and workflow-detail “next step” resolution honor completed branch selections rather than raw outgoing edges.
- Completion blocks when no persisted valid selection exists.
- Shared condition evaluator semantics cover branch and transition gates for the supported branch-relevant fact kinds.
- Runtime context-fact `valueJson` shapes needed by branch are explicit, coherent, and exercised by tests.
- UI renders conditional routes, default target, saved-selection banner, invalid-selection warning, and disabled completion/save states exactly as locked.
- All planned tests and QA scenarios run agent-executably with no human-only verification.

### Must Have
- One branch runtime row per `stepExecutionId`
- `selectedTargetStepId` persistence
- Explicit save mutation
- Branch-aware revalidation on completion
- Branch-aware next-step resolver
- Query/refetch only in v1
- Nested `work_unit_draft_spec_fact.valueJson` shape with `instance`, `facts`, `artifacts`
- Transition gate evaluator refactor for semantic alignment

### Must NOT Have
- No branch SSE/streaming in v1
- No autosave of branch selection
- No auto-complete on route selection
- No silent fallback from invalid persisted selection to default target
- No append-only branch selection history in v1
- No runtime per-kind context-fact instance tables beyond `workflow_execution_context_facts`
- No broad runtime-shell redesign outside branch-specific hooks/messages

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after using repo test patterns, while individual implementation slices should still be structured contract/schema-first.
- QA policy: Every task includes agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
Wave 1: contracts/shapes, DB state, evaluator alignment, external/draft-spec runtime-shape enforcement, transition gate refactor
Wave 2: branch resolver/progression, API read model + mutation wiring, UI implementation, integration/regression coverage, invoke/action population-point alignment

### Dependency Matrix (full, all tasks)
- T1 contracts/shapes → blocks T2, T3, T4, T6, T7, T8, T9, T10
- T2 DB branch state → blocks T5, T6, T7, T8, T9
- T3 shared branch value decoders/evaluator → blocks T5, T6, T7, T8, T9
- T4 transition gate alignment → independent after T1/T3, but must finish before final verification
- T5 branch activation/save/completion services → blocks T6, T7, T8, T9
- T6 branch-aware progression + workflow detail integration → blocks T8, T9
- T7 runtime fact-shape population points (invoke/action/external/draft-spec) → blocks T8, T9
- T8 branch detail API/read model → blocks T9
- T9 branch UI → blocks T10 and final verification
- T10 regression and integration coverage → blocks final verification

### Agent Dispatch Summary
- Wave 1 → 5 tasks → unspecified-high / deep / oracle-informed architecture slices
- Wave 2 → 5 tasks → unspecified-high / deep / visual-engineering for UI slice

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Lock branch runtime contracts and explicit `valueJson` shapes

  **What to do**: Update runtime contracts so branch detail is a first-class `body.branch` variant inside `getRuntimeStepExecutionDetail`. Add explicit runtime-shape definitions for every branch-relevant context-fact kind that branch/gate evaluation will decode from `workflow_execution_context_facts.valueJson`, including the nested `work_unit_draft_spec_fact` structure with `instance`, `facts`, and `artifacts`. Make `work_unit_draft_spec_fact.facts` an array of JSON objects, each carrying `factDefinitionId` plus the underlying fact-type-shaped payload.
  **Must NOT do**: Do not introduce per-kind runtime instance tables; do not leave any branch-relevant `valueJson` shape implicit.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: contract-first architecture slice with high coupling to later DB/service/UI work.
  - Skills: `[]` - No special project skill is required beyond repo-grounded planning.
  - Omitted: `effect-best-practices` - Reason: this is contract/schema planning, not Effect service implementation.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T2, T3, T4, T5, T7, T8, T9, T10 | Blocked By: none

  **References**:
  - Runtime contract seam: `packages/contracts/src/runtime/executions.ts`
  - Branch design-time semantics: `packages/contracts/src/methodology/workflow.ts`
  - Runtime context fact storage: `packages/db/src/schema/runtime.ts`
  - Draft note authority: `.sisyphus/drafts/l3-slice-2-runtime-invoke-branch.md`

  **Acceptance Criteria**:
  - [ ] `getRuntimeStepExecutionDetail` contract includes `body.branch` with the locked field names/sections from the interview.
  - [ ] Each branch-relevant context-fact kind used by the branch evaluator has an explicit runtime `valueJson` contract.
  - [ ] `work_unit_draft_spec_fact` runtime shape explicitly includes top-level `instance`, `facts`, and `artifacts`.
  - [ ] `work_unit_draft_spec_fact.facts[*]` explicitly includes `factDefinitionId` plus underlying fact-type-shaped value payload.

  **QA Scenarios**:
  ```
  Scenario: Runtime contracts compile with explicit branch shapes
    Tool: Bash
    Steps: run the runtime/contracts test or typecheck command that covers `packages/contracts/src/runtime/executions.ts`
    Expected: branch payload types compile and tests assert the new `body.branch` shape
    Evidence: .sisyphus/evidence/task-1-branch-contracts.txt

  Scenario: Draft-spec valueJson shape is asserted in tests
    Tool: Bash
    Steps: run the new contract/schema tests covering `work_unit_draft_spec_fact` runtime shape
    Expected: tests confirm `instance`, `facts`, `artifacts` and `factDefinitionId` requirements
    Evidence: .sisyphus/evidence/task-1-draft-spec-shape.txt
  ```

  **Commit**: YES | Message: `feat(branch-runtime): lock runtime contracts and fact shapes` | Files: `packages/contracts/**`, `packages/db/**`, tests

- [ ] 2. Add branch runtime persistence schema and repositories

  **What to do**: Add a dedicated branch runtime state table in `packages/db/src/schema/runtime.ts` with one row per `stepExecutionId`, nullable `selectedTargetStepId`, timestamps, and the correct uniqueness/index strategy. Add repository methods to create the row on activation and update selection in place. Revalidate that the table is keyed by unique `stepExecutionId`, with `selectedTargetStepId` as mutable state, not part of a compound-history design.
  **Must NOT do**: Do not add append-only selection history; do not key multiple rows by target selection.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: schema/repository work with persistence invariants.
  - Skills: `[]` - No special skill needed.
  - Omitted: `turborepo` - Reason: no monorepo pipeline design work here.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T5, T6, T8, T9, T10 | Blocked By: T1

  **References**:
  - Runtime schema: `packages/db/src/schema/runtime.ts`
  - Form/agent runtime state pattern: `packages/db/src/schema/runtime.ts`
  - Runtime repositories: `packages/db/src/runtime-repositories/`
  - Metis guardrail: one row per `stepExecutionId`, explicit persisted-vs-derived separation

  **Acceptance Criteria**:
  - [ ] Branch runtime table exists with one-row-per-step-execution uniqueness.
  - [ ] Activation repository method can create row with null `selectedTargetStepId`.
  - [ ] Save-selection repository method updates row in place.
  - [ ] Repository tests cover create, update, duplicate activation protection, and invalid FK cases.

  **QA Scenarios**:
  ```
  Scenario: Branch state row is created once per step execution
    Tool: Bash
    Steps: run repository/schema tests for the new branch runtime table and create-row behavior
    Expected: duplicate activation attempts do not create multiple rows for one `stepExecutionId`
    Evidence: .sisyphus/evidence/task-2-branch-state-row.txt

  Scenario: Save updates selectedTargetStepId in place
    Tool: Bash
    Steps: run repository tests that save one target, then save a different target for the same `stepExecutionId`
    Expected: same branch state row is updated; no history rows are created
    Evidence: .sisyphus/evidence/task-2-branch-save-update.txt
  ```

  **Commit**: YES | Message: `feat(branch-runtime): add branch state persistence` | Files: `packages/db/src/schema/runtime.ts`, `packages/db/src/runtime-repositories/**`, tests

- [ ] 3. Build shared branch-condition decoders and evaluator core

  **What to do**: Implement explicit runtime decoders for branch-relevant context-fact `valueJson` shapes and a shared evaluator core that handles the locked branch semantics for `plain_value_fact`, `artifact_reference_fact`, `workflow_reference_fact`, `bound_external_fact`, `definition_backed_external_fact`, and `work_unit_draft_spec_fact`. Keep `not` generic and apply it after evaluating the underlying condition result. Treat route-level availability as separate from condition/value evidence.
  **Must NOT do**: Do not scatter raw `valueJson` inspection logic across UI, API, progression, or transition-gate code; do not make `not` artifact-specific.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this is the semantic core and highest-risk correctness slice.
  - Skills: `[]` - No extra skill required.
  - Omitted: `visual-engineering` - Reason: no UI work in this task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T4, T5, T6, T8, T9, T10 | Blocked By: T1

  **References**:
  - Condition-engine authority: `packages/methodology-engine/src/services/condition-engine.ts`
  - Branch design-time service: `packages/methodology-engine/src/services/branch-step-definition-service.ts`
  - Draft semantics authority: `.sisyphus/drafts/l3-slice-2-runtime-invoke-branch.md`

  **Acceptance Criteria**:
  - [ ] Each branch-relevant fact kind decodes from explicit runtime `valueJson` shapes.
  - [ ] `not` inversion is applied generically after base evaluation.
  - [ ] `many` default remains ANY for the fact kinds explicitly locked in the interview.
  - [ ] Evaluator returns enough evidence to support compact row summaries and route-dialog data without duplicating semantic logic elsewhere.

  **QA Scenarios**:
  ```
  Scenario: Plain/artifact/workflow/external/draft-spec evaluations all decode correctly
    Tool: Bash
    Steps: run evaluator tests covering one passing and one failing example for each locked fact kind
    Expected: evaluator returns correct pass/fail result and evidence payload per kind
    Evidence: .sisyphus/evidence/task-3-evaluator-matrix.txt

  Scenario: Generic `not` inversion works for all supported conditions
    Tool: Bash
    Steps: run evaluator tests where the same base condition is checked with and without `not`
    Expected: results invert cleanly without changing the underlying evidence payload source
    Evidence: .sisyphus/evidence/task-3-not-inversion.txt
  ```

  **Commit**: YES | Message: `feat(branch-runtime): add shared branch evaluator core` | Files: `packages/workflow-engine/**`, tests

- [ ] 4. Refactor transition gate evaluation to align with branch semantics

  **What to do**: Refactor the transition gate condition engine so it aligns with the branch evaluator semantics/operator model while still targeting transition-specific entities. Ensure transition gate evaluation can consume current work-unit facts, primary workflow context facts from workflows bound to the transition, and artifact slots directly. Reuse the shared evaluator/decoder layer from T3 where possible without forcing storage-model identity.
  **Must NOT do**: Do not redesign all transition/runtime gate flows; do not create a second divergent condition engine.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: semantic-alignment refactor across workflow engine paths.
  - Skills: `[]` - No extra skill needed.
  - Omitted: `effect-solutions` - Reason: architecture refactor plan, not Effect-specific implementation guidance.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T10, Final Verification | Blocked By: T1, T3

  **References**:
  - Runtime gate seam: `packages/workflow-engine/src/services/runtime-gate-service.ts`
  - Transition/runtime services in `packages/workflow-engine/src/services/`
  - Metis/Oracle recommendation: align branch/gate semantics at evaluator layer, not storage model

  **Acceptance Criteria**:
  - [ ] Transition gates reuse the shared evaluator/decoder semantics for overlapping operator families.
  - [ ] Transition gate evaluation explicitly supports current work-unit facts, primary workflow context facts, and artifact slots.
  - [ ] No duplicated branch-vs-gate operator semantics remain for overlapping condition kinds.

  **QA Scenarios**:
  ```
  Scenario: Transition gate and branch evaluator agree on shared semantics
    Tool: Bash
    Steps: run paired tests where the same logical condition is evaluated through branch and transition-gate paths
    Expected: overlapping operators produce the same result/evidence semantics
    Evidence: .sisyphus/evidence/task-4-gate-alignment.txt

  Scenario: Transition gate resolves all three target domains
    Tool: Bash
    Steps: run tests covering current work-unit facts, primary workflow context facts, and artifact-slot conditions
    Expected: all three domains evaluate through the aligned gate engine without custom one-off logic
    Evidence: .sisyphus/evidence/task-4-gate-targets.txt
  ```

  **Commit**: YES | Message: `refactor(gates): align transition and branch evaluation` | Files: `packages/workflow-engine/**`, tests

- [ ] 5. Implement branch activation, save-selection, and completion revalidation services

  **What to do**: Add service-layer behavior that creates the branch runtime row on step activation, saves `selectedTargetStepId` explicitly, and revalidates the persisted target both when completing the branch step and when activating the next step. Persisted selection must always win over any UI-derived default suggestion, and invalid persisted selections must remain visible but block completion until explicitly replaced.
  **Must NOT do**: Do not auto-save selection; do not silently fall back from invalid persisted selection to default target.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: service orchestration and correctness-critical workflow behavior.
  - Skills: `[]` - No extra skill needed.
  - Omitted: `visual-engineering` - Reason: no UI work here.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T6, T8, T9, T10 | Blocked By: T1, T2, T3

  **References**:
  - Step lifecycle seam: `packages/workflow-engine/src/services/step-execution-lifecycle-service.ts`
  - Step command seam: `packages/workflow-engine/src/services/workflow-execution-step-command-service.ts`
  - Metis guardrail: completion must consume persisted valid selection only

  **Acceptance Criteria**:
  - [ ] Branch state row is created during branch step activation with null selection.
  - [ ] Save-selection mutation updates persisted `selectedTargetStepId` in place.
  - [ ] Completion rejects null or invalid persisted selections with explicit reasons.
  - [ ] Next-step activation reuses the same persisted-target validity rules as completion.

  **QA Scenarios**:
  ```
  Scenario: Save and complete a valid branch selection
    Tool: Bash
    Steps: run service/API tests that activate a branch step, save a valid target, then complete it
    Expected: completion succeeds only after explicit save and persisted selection remains authoritative
    Evidence: .sisyphus/evidence/task-5-save-complete.txt

  Scenario: Persisted route becomes invalid before completion
    Tool: Bash
    Steps: run tests that save a valid conditional target, mutate facts so it becomes invalid, then attempt completion
    Expected: persisted selection remains stored, warning reason is returned, completion is blocked
    Evidence: .sisyphus/evidence/task-5-invalid-persisted.txt
  ```

  **Commit**: YES | Message: `feat(branch-runtime): add selection and completion services` | Files: `packages/workflow-engine/**`, tests

- [ ] 6. Make workflow progression and workflow detail branch-aware

  **What to do**: Update progression and workflow-detail services so completed branch steps resolve the next step from persisted branch runtime state instead of raw outgoing edges. Apply Oracle’s recommended default precedence: persisted explicit selection governs completion/activation; UI suggestion order may be first matching conditional by ascending sort order, then default target, but suggestions must never drive completion implicitly.
  **Must NOT do**: Do not leave workflow detail or activation logic reading only `workflowEdges.find(...)` after a branch completes.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: architecture-critical progression change.
  - Skills: `[]` - No extra skill needed.
  - Omitted: `turborepo` - Reason: unrelated.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T8, T9, T10 | Blocked By: T2, T3, T5

  **References**:
  - Progression seam: `packages/workflow-engine/src/services/step-progression-service.ts`
  - Workflow detail/runtime services in `packages/workflow-engine/src/services/`
  - Oracle guidance: keep one branch-target resolver as single source of truth

  **Acceptance Criteria**:
  - [ ] Completed branch steps resolve next-step activation from persisted branch state, not just projected edges.
  - [ ] Workflow detail surfaces branch-aware next-step information.
  - [ ] Persisted explicit selection always wins over UI-only default suggestions.

  **QA Scenarios**:
  ```
  Scenario: Next-step activation follows saved branch target
    Tool: Bash
    Steps: run progression tests with multiple valid conditional routes and a saved persisted target
    Expected: next-step resolution follows the persisted target, not the first valid edge suggestion
    Evidence: .sisyphus/evidence/task-6-branch-progression.txt

  Scenario: Workflow detail reports branch-aware next step
    Tool: Bash
    Steps: run workflow-detail tests after a completed branch step with a persisted target
    Expected: workflow detail shows the correct resolved next step and does not infer from raw edge order alone
    Evidence: .sisyphus/evidence/task-6-workflow-detail.txt
  ```

  **Commit**: YES | Message: `feat(branch-runtime): make progression branch-aware` | Files: `packages/workflow-engine/**`, tests

- [ ] 7. Align runtime fact-population points with locked shapes

  **What to do**: Update only the runtime fact-population points that branch evaluation directly depends on so the locked `valueJson` contracts are actually produced. This includes external-fact binding/prefill/create flows and the minimal invoke work-unit propagation subset needed for `work_unit_draft_spec_fact` to contain the created work-unit ID and nested payload structure. Treat invoke-runtime work here as a dependency slice scoped by `.sisyphus/plans/l3-slice-2-runtime-invoke.md`, not as a second full invoke-runtime implementation effort inside this plan. Preserve the single-table runtime context-fact model while making shape contents explicit and stable.
  **Must NOT do**: Do not add new runtime per-kind fact tables for branch support; do not implement unrelated invoke-runtime UI/read-model work here; do not leave invoke/action flows writing obsolete flat draft-spec payloads.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: multi-seam runtime population alignment.
  - Skills: `[]` - No extra skill needed.
  - Omitted: `better-auth-best-practices` - Reason: unrelated.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T8, T9, T10 | Blocked By: T1, T3, T5

  **References**:
  - Invoke runtime dependency: `.sisyphus/plans/l3-slice-2-runtime-invoke.md`
  - Invoke notes in draft: `.sisyphus/drafts/l3-slice-2-runtime-invoke-branch.md`
  - Runtime context fact storage: `packages/db/src/schema/runtime.ts`
  - Work-unit/runtime fact tables: `packages/db/src/schema/runtime.ts`

  **Acceptance Criteria**:
  - [ ] `work_unit_draft_spec_fact.valueJson` uses the nested `instance` / `facts` / `artifacts` structure.
  - [ ] Invoke-created work-unit IDs are persisted into draft-spec context facts using only the minimal invoke-runtime subset required by `.sisyphus/plans/l3-slice-2-runtime-invoke.md`.
  - [ ] Bound/definition-backed external facts persist `instanceId` and `value` according to locked lifecycle rules.
  - [ ] Runtime shapes are coherent across project facts, work-unit facts, and workflow context facts where branch depends on them.

  **QA Scenarios**:
  ```
  Scenario: Invoke work-unit propagation writes nested draft-spec valueJson
    Tool: Bash
    Steps: run invoke/runtime tests that create a work unit and then inspect the resulting draft-spec context fact payload
    Expected: nested `instance`, `facts`, `artifacts` structure exists and includes the created work-unit ID
    Evidence: .sisyphus/evidence/task-7-draft-spec-propagation.txt

  Scenario: External fact propagation preserves instanceId and value shape
    Tool: Bash
    Steps: run action/external-fact tests covering singleton prefill, many-cardinality create-new, and post-propagation instanceId persistence
    Expected: context fact `valueJson` matches the locked lifecycle rules for bound and definition-backed external facts
    Evidence: .sisyphus/evidence/task-7-external-shapes.txt
  ```

  **Commit**: YES | Message: `feat(runtime-facts): align branch-dependent value shapes` | Files: `packages/workflow-engine/**`, `packages/api/**`, tests

- [ ] 8. Implement branch detail API payload and save-selection wiring

  **What to do**: Extend `getRuntimeStepExecutionDetail` to return the fully assembled `body.branch` payload with locked sections/field names, derived default section, persisted selection section, save action state, route-row summaries, and route-dialog payloads. Add `saveBranchTargetSelection(stepExecutionId, selectedTargetStepId)` to the runtime API/router and wire query invalidation/refetch behavior for branch-related pages.
  **Must NOT do**: Do not ship a thin raw-data payload that forces the client to reimplement branch semantics; do not add a separate branch-specific detail query.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: contract/API/read-model integration.
  - Skills: `[]` - No extra skill required.
  - Omitted: `vercel-react-best-practices` - Reason: this task is service/API-first.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T9, T10 | Blocked By: T1, T2, T3, T5, T6, T7

  **References**:
  - Router seam: `packages/api/src/routers/project-runtime.ts`
  - Step detail seam: `packages/workflow-engine/src/services/step-execution-detail-service.ts`
  - Existing route consumer: `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`

  **Acceptance Criteria**:
  - [ ] `getRuntimeStepExecutionDetail` returns `body.branch` with the exact locked field names and section structure.
  - [ ] Save-selection mutation exists and updates persisted branch state.
  - [ ] API returns explicit enabled/disabled reasons for save and completion-related state.
  - [ ] Refetch/invalidation behavior is sufficient to refresh step detail and workflow detail after relevant mutations.

  **QA Scenarios**:
  ```
  Scenario: Branch detail API returns locked branch payload
    Tool: Bash
    Steps: run API/service tests against `getRuntimeStepExecutionDetail` for a branch step fixture
    Expected: response contains `body.branch` with conditionalRoutesSection, defaultTargetSection, selection, and actions using the locked field names
    Evidence: .sisyphus/evidence/task-8-branch-detail-api.txt

  Scenario: Save-selection mutation round-trips into refetched detail payload
    Tool: Bash
    Steps: call `saveBranchTargetSelection`, then refetch branch detail and workflow detail queries
    Expected: persisted selection, banner text, row flags, and completion readiness are updated in the returned payloads
    Evidence: .sisyphus/evidence/task-8-save-refetch.txt
  ```

  **Commit**: YES | Message: `feat(branch-runtime): expose branch detail and save API` | Files: `packages/api/**`, `packages/workflow-engine/**`, tests

- [ ] 9. Implement branch UI in step execution detail page

  **What to do**: Render the branch section in the step-execution detail route using the locked payload structure: conditional routes section, separate default target section, saved-selection banner, invalid-selection warning, route/detail dialogs, and explicit save flow. Keep completion in the shared shell. Ensure derived default suggestion, persisted selection, and invalid persisted selection are visually distinct.
  **Must NOT do**: Do not auto-save defaults, do not collapse save into completion, and do not hide invalid persisted selections.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: complex UI state and interaction work inside an existing route surface.
  - Skills: `[]` - No extra skill required.
  - Omitted: `web-design-guidelines` - Reason: accessibility/design review can happen in final verification rather than implementation planning.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T10, Final Verification | Blocked By: T1, T5, T6, T7, T8

  **References**:
  - Existing route: `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`
  - Workflow-editor branch UI patterns: `apps/web/src/features/workflow-editor/dialogs.tsx`
  - Runtime form/agent display patterns: `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`

  **Acceptance Criteria**:
  - [ ] Branch UI renders the locked conditional/default/selection/action sections from `body.branch`.
  - [ ] Saved-selection banner and invalid-selection warning render exactly when indicated by the payload.
  - [ ] Save button and complete-step button honor server-supplied enabled/disabled logic.
  - [ ] Route dialogs and default-target dialog use the locked compact-vs-detail evidence split.

  **QA Scenarios**:
  ```
  Scenario: Save a conditional route and see banner + shared-shell completion enablement
    Tool: Playwright
    Steps: open a branch step detail page, select a valid conditional route, save it, then inspect the page state
    Expected: saved-selection banner appears, selected row styling updates, and shared-shell completion becomes enabled only when the saved route is still valid
    Evidence: .sisyphus/evidence/task-9-branch-ui-save.png

  Scenario: Persisted route becomes invalid and UI blocks completion
    Tool: Playwright
    Steps: save a valid route, mutate backing data through fixture actions so it becomes invalid, refetch page state
    Expected: invalid-selection warning appears, persisted selection remains visible, save/complete affordances reflect locked disabled behavior
    Evidence: .sisyphus/evidence/task-9-branch-ui-invalid.png
  ```

  **Commit**: YES | Message: `feat(branch-runtime): add branch step detail UI` | Files: `apps/web/**`, tests

- [ ] 10. Add regression coverage and branch/gate integration tests

  **What to do**: Add end-to-end repository/service/API/UI regression coverage for the locked branch runtime semantics, explicit runtime fact shapes, and transition gate alignment. Cover happy paths, invalid persisted selections, multiple-valid routes, no-valid-routes cases, external-fact lifecycle variants, and draft-spec nested payload handling.
  **Must NOT do**: Do not rely on human confirmation or manual inspection as acceptance criteria.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: broad regression hardening across layers.
  - Skills: `[]` - No extra skill required.
  - Omitted: `playwright` skill - Reason: plan already specifies Playwright tool usage directly in QA scenarios.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Final Verification | Blocked By: T4, T8, T9

  **References**:
  - Runtime repository tests in `packages/db/src/tests/repository/`
  - Runtime schema tests in `packages/db/src/tests/schema/`
  - Runtime service tests in `packages/workflow-engine/src/tests/runtime/`
  - Route tests in `apps/web/src/tests/routes/`

  **Acceptance Criteria**:
  - [ ] Regression tests cover activation, save, invalid persisted selection, completion blocking, progression, and workflow-detail next-step behavior.
  - [ ] Tests cover branch-evaluator semantics for all locked branch-relevant fact kinds.
  - [ ] Tests cover transition gate semantic alignment for overlapping operator families.
  - [ ] Tests cover nested `work_unit_draft_spec_fact` shape and invoke-created work-unit ID persistence.

  **QA Scenarios**:
  ```
  Scenario: Full branch runtime regression suite passes
    Tool: Bash
    Steps: run the new repository/service/API/UI regression test set for branch runtime and transition-gate alignment
    Expected: all branch runtime tests pass with no skipped critical semantics
    Evidence: .sisyphus/evidence/task-10-branch-regressions.txt

  Scenario: Draft-spec nested valueJson and external lifecycle scenarios pass end-to-end
    Tool: Bash
    Steps: run the tests covering invoke-created work units, draft-spec nested payloads, bound external updates, and definition-backed creation/prefill cases
    Expected: runtime facts are shaped and evaluated exactly as locked in the plan
    Evidence: .sisyphus/evidence/task-10-runtime-shapes.txt
  ```

  **Commit**: YES | Message: `test(branch-runtime): add regression coverage` | Files: `packages/db/**`, `packages/workflow-engine/**`, `packages/api/**`, `apps/web/**`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Final verification must remain fully agent-executable and produce concrete evidence artifacts.
- [ ] F1. Plan Compliance Audit — oracle

  **Tool / Agent**: `oracle`
  **Steps**:
  - Review the implemented diff and compare it against `.sisyphus/plans/l3-slice-2-runtime-branch.md`
  - Verify persisted selection semantics, branch-aware progression, branch/gate evaluator alignment, and explicit `valueJson` shape coverage all match the plan
  **Expected**:
  - Oracle approves that implementation matches the plan with no material omission or semantic drift
  **Evidence**:
  - `.sisyphus/evidence/f1-plan-compliance.md`

- [ ] F2. Code Quality Review — unspecified-high

  **Tool / Agent**: `task(category="unspecified-high")`
  **Steps**:
  - Review changed contracts, schema, repositories, services, and UI for duplication, hidden coupling, brittle JSON decoding, and unsafe fallbacks
  - Confirm no branch logic is duplicated between UI, detail service, progression, and gate code
  **Expected**:
  - Review reports no critical code-quality issues and explicitly calls out any minor follow-ups
  **Evidence**:
  - `.sisyphus/evidence/f2-code-quality.md`

- [ ] F3. Agent-Executed QA Sweep — unspecified-high (+ playwright if UI)

  **Tool / Agent**: `task(category="unspecified-high")` and `Playwright`
  **Steps**:
  - Run the planned branch runtime repository/service/API/UI regression commands
  - Execute Playwright scenarios for: save valid route, invalid persisted selection, default target display, branch completion blocking, and branch-aware next-step behavior
  **Expected**:
  - All automated QA scenarios pass and evidence includes both command output and UI screenshots where applicable
  **Evidence**:
  - `.sisyphus/evidence/f3-qa-sweep.txt`
  - `.sisyphus/evidence/f3-qa-ui.png`

- [ ] F4. Scope Fidelity Check — deep

  **Tool / Agent**: `deep`
  **Steps**:
  - Review the final diff for scope creep beyond branch runtime, branch/gate semantic alignment, and minimal invoke-runtime dependency hooks
  - Confirm the implementation did not introduce forbidden items such as streaming, autosave, append-only selection history, or broad runtime-shell redesign
  **Expected**:
  - Deep review approves that the shipped work stays inside the locked branch-runtime scope boundaries
  **Evidence**:
  - `.sisyphus/evidence/f4-scope-fidelity.md`

## Commit Strategy
- Prefer 8 atomic commits aligned to contracts, schema, evaluator, services, progression, API, UI, and regression coverage.
- Commit messages should describe intent, not mechanics.
- Keep the branch green after every commit.

## Success Criteria
- Branch runtime behavior matches the locked interview semantics with no unresolved judgment calls.
- Persisted-vs-derived state is unambiguous in API and UI.
- Transition gate semantics align with branch semantics where intended, without broad scope creep.
- Runtime `valueJson` shapes are explicit and coherent for all branch-relevant fact kinds.
- All automated tests and QA scenarios pass.
