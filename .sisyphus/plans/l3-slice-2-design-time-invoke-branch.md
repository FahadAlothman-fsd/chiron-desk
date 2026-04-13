# L3 Slice 2 — Design-Time Invoke and Branch

## TL;DR
> **Summary**: Deliver the next L3 design-time authoring slice by making `invoke` and `branch` first-class step types in the workflow editor, with full design-time contracts, schema, services, procedures, and editor read models. Invoke ships first, then branch, but both live in one decision-complete plan.
> **Deliverables**:
> - Full design-time `invoke` authoring with workflow/work-unit target modes, context-fact-backed/fixed-set variants, bindings, and editor support
> - Full design-time `branch` authoring with normalized routes/groups/conditions, default route, and projected branch-owned canvas edges
> - `work_unit_draft_spec_fact` redesign to carry explicit work-unit identity plus fact/artifact selections
> - Unified `getEditorDefinition` read model that returns typed invoke/branch steps plus one unified edge list with branch-owned edge metadata
> - Compatibility-preserving behavior for non-branch workflows and non-branch generic edge CRUD
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: contracts + schema foundations → invoke vertical slice → branch condition engine + branch CRUD + editor read-model projection → verification

## Context
### Original Request
- Plan the next design-time step types after the completed Form/context-facts slice.
- Final user direction: one combined **design-time** plan for `invoke` and `branch`, with `invoke` discussed and locked first, then `branch`.

### Interview Summary
- This plan is **design-time only**.
- Runtime implementation, runtime pages, runtime tables, and runtime procedures are a later planning track.
- `invoke` is fully specified enough to plan:
  - target kinds: `workflow | work_unit`
  - source modes: `fixed_set | context_fact_backed`
  - workflow target has no authored bindings in v1
  - work-unit target supports bindings, activation transitions, and transition workflow selection
- `branch` is fully specified enough to plan:
  - branch inspects **workflow context facts only** in v1
  - route-wide `conditionMode: all | any`
  - group-level `mode: all | any`
  - default route belongs on the branch-step root, not as an `else` route row
  - branch routes are authoritative; generic workflow edges are projected canvas edges only
- `work_unit_draft_spec_fact` must be redesigned so it carries explicit `workUnitDefinitionId` and typed fact/artifact selections.
- `getEditorDefinition` remains the **single** editor query and must grow typed invoke/branch read models plus unified edge metadata.

### Authority Override
This plan supersedes earlier promoted invoke/branch design assumptions and any stale deferred-step placeholder model in the current code/docs. Implementers must follow this plan over prior branch/invoke sketches when conflicts exist, especially around:
- invoke target/source matrix
- branch default-route ownership
- branch routes vs generic edge authority
- `work_unit_draft_spec_fact` typed redesign

### Metis Review (gaps addressed)
- Add explicit acceptance criteria that existing **non-branch** workflows and generic edges still round-trip unchanged.
- Make branch-owned projected edges the **only** source of branch edge truth in the editor read model.
- Validate route/group/condition deletions through identity-aware delta reconcile rather than blind full replacement.
- Keep git/staleness implementation out of this plan; only design-time semantics and UI messaging remain in scope.

### Oracle Review (guardrails applied)
- `step_edges` remain source-of-truth only for **non-branch** steps.
- Outgoing branch topology is authoritative in branch tables; `step_edges` are derived projection for branch only.
- `getEditorDefinition` stays the single canvas/read seam.
- Transition-gate storage/UI migration is deferred; only the shared condition engine architecture is introduced now.

## Work Objectives
### Core Objective
Finish the design-time workflow-editor slice so invoke and branch become fully authorable step types with normalized persistence, typed service/API boundaries, and a unified editor read model that keeps non-branch behavior stable while adding branch-owned projected edges.

### Deliverables
- Corrected contracts for invoke, branch, and `work_unit_draft_spec_fact` in `packages/contracts/src/methodology/workflow.ts` and related tests.
- Normalized methodology schema for invoke, branch, and draft-spec redesign in `packages/db/src/schema/methodology.ts`.
- Typed methodology-engine services and repo seams for invoke and branch authoring.
- Thin methodology router procedures for invoke and branch CRUD.
- Workflow-editor UI for invoke and branch, including stacked branch-route dialog and branch-owned edge rendering.
- Unified `getEditorDefinition` read model returning typed invoke/branch steps and one unified edge list.

### Definition of Done (verifiable conditions with commands)
- `bunx vitest run packages/contracts/src/tests/l3-design-time-invoke-branch-contracts.test.ts`
- `bunx vitest run packages/db/src/tests/schema/l3-design-time-invoke-branch-schema.test.ts`
- `bunx vitest run packages/db/src/tests/repository/l3-design-time-invoke-branch-repositories.test.ts`
- `bunx vitest run packages/methodology-engine/src/tests/l3/l3-design-time-invoke-branch-services.test.ts`
- `bunx vitest run packages/api/src/tests/routers/l3-design-time-invoke-branch-router.test.ts`
- `bunx vitest run apps/web/src/tests/routes/workflow-editor-invoke-branch.integration.test.tsx`
- `bun run check-types`

### Must Have
- `work_unit_draft_spec_fact` stores `workUnitDefinitionId` explicitly.
- Draft-spec child rows support both work-unit facts and artifact slots.
- Invoke target/source matrix matches the locked 2x2 model exactly.
- Workflow-target invoke has **no authored invoke bindings** in v1.
- Work-unit invoke supports bindings, activation transitions, and per-transition workflows.
- Branch inspects **workflow context facts only** in v1.
- Branch supports route-wide `all|any` and group-level `all|any`.
- Branch default route lives on the branch-step root.
- Branch conditional routes have unique `targetStepId` values within one branch step.
- `getEditorDefinition` returns one unified edge list with branch-owned edge metadata.

### Must NOT Have
- No runtime invoke execution implementation.
- No runtime branch evaluation implementation.
- No transition-gate storage/UI migration in this slice.
- No freeform branch `conditionJson` blob.
- No generic branch edge editing through the normal edge editor.
- No authored invoke bindings for workflow-target invoke.
- No `afterStepKey` in invoke or branch create/update inputs.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after.
- Compatibility rule: existing non-branch workflows and generic edge CRUD must remain green.
- Projection rule: branch-owned edge rows must be validated as derived projection, not second source-of-truth.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Locked Architecture Decisions
1. `work_unit_draft_spec_fact` is expanded before invoke/branch depend on it.
2. Workflow-target invoke has no authored bindings in v1.
3. Work-unit invoke uses bindings + activation transitions + transition workflow subsets.
4. Branch condition engine is shared in architecture, but branch is the only consumer in this slice.
5. Branch routes are authoritative; generic edges are projected for branch only.
6. `getEditorDefinition` is the single read seam for the editor.
7. Branch default route is root-level fallback, not an `else` route row.
8. Branch-owned projected edges render differently and are not generically editable.
9. Design-time git usage is limited to capability-aware stale-operator messaging; actual git comparison is deferred to runtime planning.

### Parallel Execution Waves
Wave 1: contracts + schema + repo seams + shared condition engine foundations
Wave 2: invoke vertical slice + branch services/API/read-model projection
Wave 3: workflow-editor UI + integrated verification + compatibility hardening

### Dependency Matrix (full, all tasks)
- 1 blocks 2-9
- 2 blocks 3-9
- 3 blocks 4-9
- 4 blocks 6-9
- 5 blocks 7-9
- 6 blocks 8-9
- 7 blocks 8-9
- 8 blocks 9

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → deep
- Wave 2 → 3 tasks → deep / unspecified-high
- Wave 3 → 3 tasks → visual-engineering / unspecified-high

## TODOs
> Implementation + Test = ONE task. Never separate.
> Invoke ships first, branch second, but both are covered in one plan.

- [x] 1. Freeze invoke, branch, and draft-spec contracts

  **What to do**: Update `packages/contracts/src/methodology/workflow.ts` and new/related test files so the design-time contracts match the locked invoke and branch models: invoke target/source variants, bindings shape, branch routes/groups/conditions, and `work_unit_draft_spec_fact` redesign with explicit work-unit identity and typed selected destinations.
  **Must NOT do**: Do not leave invoke/branch as deferred opaque payloads. Do not introduce runtime-only fields. Do not keep `work_unit_draft_spec_fact` as only `includedFactDefinitionIds: string[]`.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: contracts freeze every downstream layer.
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: typed services and error boundaries depend on this exact shape.
  - Omitted: [`effect-review`] — Reason: this is architecture freeze, not broad review.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-9 | Blocked By: none

  **References**:
  - Pattern: `packages/contracts/src/methodology/workflow.ts` - current Form/context-fact contract style to extend
  - Pattern: `packages/contracts/src/tests/l3-slice-1-contracts.test.ts` - existing slice-level contract test pattern
  - Authority: `.sisyphus/drafts/l3-slice-2-invoke-branch-discussion.md`

  **Acceptance Criteria**:
  - [ ] `InvokeStepPayload` fully represents the locked 2x2 invoke matrix.
  - [ ] `BranchStepPayload` fully represents default route + routes + groups + conditions.
  - [ ] `BranchRouteConditionPayload` stores `contextFactDefinitionId`, `contextFactKind`, `operator`, `isNegated`, and `comparisonJson`.
  - [ ] `work_unit_draft_spec_fact` contract no longer only exposes `includedFactDefinitionIds`.

  **QA Scenarios**:
  ```
  Scenario: Invoke and branch contracts round-trip
    Tool: Bash
    Steps: Run `bunx vitest run packages/contracts/src/tests/l3-design-time-invoke-branch-contracts.test.ts`
    Expected: PASS; invoke, branch, and draft-spec payload shapes match the locked design
    Evidence: .sisyphus/evidence/task-1-contracts.txt

  Scenario: Deferred/opaque step shapes stay removed
    Tool: Bash
    Steps: Re-run the same suite and assert invoke/branch cannot be serialized as generic deferred payloads
    Expected: PASS; no stale deferred-step contract surface remains
    Evidence: .sisyphus/evidence/task-1-contracts-error.txt
  ```

  **Commit**: YES | Message: `feat(contracts): lock invoke branch and draft-spec authoring models` | Files: `packages/contracts/src/**`

- [x] 2. Normalize methodology schema for invoke, branch, and draft-spec redesign

  **What to do**: Update `packages/db/src/schema/methodology.ts` with the full invoke table set, branch table set, and draft-spec redesign. Add constraints/indices for branch route uniqueness, route/group ordering, invoke transition/workflow invariants, and typed draft-spec selections.
  **Must NOT do**: Do not collapse branch conditions into `conditionJson`. Do not keep branch default route as a route row. Do not keep draft-spec work-unit identity inferred-only.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: persistence authority and constraints must be exact.
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: schema/repo boundaries drive everything else.
  - Omitted: [`effect-review`] — Reason: focused schema work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4-9 | Blocked By: 1

  **References**:
  - Pattern: `packages/db/src/schema/methodology.ts` - existing workflow/context-fact schema authority
  - Authority: `.sisyphus/drafts/l3-slice-2-invoke-branch-discussion.md`

  **Acceptance Criteria**:
  - [ ] Invoke tables exist exactly as locked.
  - [ ] Branch tables exist exactly as locked.
  - [ ] Draft-spec root and child rows carry explicit work-unit identity + typed fact/artifact selections.
  - [ ] Branch conditional routes have unique `targetStepId` within a branch step.

  **QA Scenarios**:
  ```
  Scenario: Schema encodes invoke and branch persistence model
    Tool: Bash
    Steps: Run `bunx vitest run packages/db/src/tests/schema/l3-design-time-invoke-branch-schema.test.ts`
    Expected: PASS; invoke/branch/draft-spec tables, constraints, and nullability match the locked model
    Evidence: .sisyphus/evidence/task-2-schema.txt

  Scenario: Invalid branch/invoke structural cases are rejected
    Tool: Bash
    Steps: Re-run the same suite and assert duplicate route targets, invalid target nullability, and invalid draft-spec child shape fail
    Expected: PASS; invalid persistence states are blocked
    Evidence: .sisyphus/evidence/task-2-schema-error.txt
  ```

  **Commit**: YES | Message: `feat(db): add invoke branch and draft-spec design-time schema` | Files: `packages/db/src/schema/**`, `packages/db/src/tests/schema/**`

- [x] 3. Add narrow repository seams and shared condition foundations

  **What to do**: Extend methodology repository interfaces/implementations to support narrow invoke/branch/draft-spec operations. Add shared condition registry/validation/evaluation architecture seams for workflow-context-fact conditions, but only wire branch as the consumer in this slice.
  **Must NOT do**: Do not create a god repository. Do not migrate transition-gate storage/UI. Do not put git/staleness implementation into methodology repos.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this is the shared persistence and validation seam.
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: requires disciplined service/repo layering.
  - Omitted: [`effect-review`] — Reason: targeted architecture work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4-9 | Blocked By: 2

  **References**:
  - Pattern: `packages/db/src/methodology-repository.ts` - canonical methodology repo seam
  - Pattern: `packages/methodology-engine/src/repository.ts` - current interface seam
  - Authority: `.sisyphus/drafts/l3-slice-2-invoke-branch-discussion.md`

  **Acceptance Criteria**:
  - [ ] Invoke repo methods stay narrow and persistence-focused.
  - [ ] Branch repo methods stay narrow and persistence-focused.
  - [ ] Shared condition registry/validation engine exists as reusable service architecture.
  - [ ] Transition-gate storage/UI remains untouched in this slice.

  **QA Scenarios**:
  ```
  Scenario: Repository seams support invoke/branch persistence without god methods
    Tool: Bash
    Steps: Run `bunx vitest run packages/db/src/tests/repository/l3-design-time-invoke-branch-repositories.test.ts`
    Expected: PASS; invoke and branch trees persist and reconcile through narrow repo methods
    Evidence: .sisyphus/evidence/task-3-repos.txt

  Scenario: Shared condition engine validates branch-only scope cleanly
    Tool: Bash
    Steps: Re-run the same suite and assert branch operators are validated while transition-gate storage is untouched
    Expected: PASS; shared engine exists without premature gate migration
    Evidence: .sisyphus/evidence/task-3-repos-error.txt
  ```

  **Commit**: YES | Message: `feat(methodology): add invoke branch repos and condition foundations` | Files: `packages/db/src/**`, `packages/methodology-engine/src/**`

- [x] 4. Implement invoke step-definition service and thin API CRUD

  **What to do**: Add `InvokeStepDefinitionService` and wire thin methodology router procedures for create/update/delete invoke step. Persist workflow-target and work-unit-target variants exactly as locked, with full-state payload + identity-aware delta reconcile for child rows.
  **Must NOT do**: Do not add runtime invoke execution behavior. Do not expose authored bindings for workflow-target invoke. Do not make routers orchestrate multiple services.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: top-level service boundaries and typed errors matter here.
  - Omitted: [`hono`] — Reason: this is service/procedure ownership, not transport nuance.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6-9 | Blocked By: 3

  **References**:
  - Pattern: `packages/methodology-engine/src/services/form-step-definition-service.ts` - typed step-definition service shape
  - Pattern: `packages/api/src/routers/methodology.ts` - current methodology router placement
  - Authority: `.sisyphus/drafts/l3-slice-2-invoke-branch-discussion.md`

  **Acceptance Criteria**:
  - [ ] Create/update/delete invoke procedures exist and call exactly one top-level service method.
  - [ ] Workflow-target invoke rejects authored bindings at UI/API/service layers.
  - [ ] Work-unit invoke round-trips transitions, workflows, bindings, and count rules without loss.
  - [ ] Omitted child rows are deleted through delta reconcile.

  **QA Scenarios**:
  ```
  Scenario: Invoke authoring CRUD round-trips cleanly
    Tool: Bash
    Steps: Run `bunx vitest run packages/methodology-engine/src/tests/l3/l3-design-time-invoke-branch-services.test.ts -t "invoke" packages/api/src/tests/routers/l3-design-time-invoke-branch-router.test.ts -t "invoke"`
    Expected: PASS; invoke variants persist and rehydrate exactly through service and API layers
    Evidence: .sisyphus/evidence/task-4-invoke.txt

  Scenario: Invalid invoke combinations are rejected
    Tool: Bash
    Steps: Re-run the same suites and assert bad source-mode/fact-kind/workflow-scope/binding combinations fail deterministically
    Expected: PASS; invoke invariants are enforced at service/API boundaries
    Evidence: .sisyphus/evidence/task-4-invoke-error.txt
  ```

  **Commit**: YES | Message: `feat(methodology): add invoke authoring service and api` | Files: `packages/methodology-engine/src/**`, `packages/api/src/routers/**`, `packages/api/src/tests/routers/**`

- [x] 5. Implement branch step-definition service, CRUD, and projected-edge sync

  **What to do**: Add `BranchStepDefinitionService` and wire branch CRUD procedures. Implement full-state payload + identity-aware delta reconcile for routes/groups/conditions, default-target validation, route target validation, and projected branch-owned edge sync into generic workflow edges.
  **Must NOT do**: Do not treat projected branch edges as generic editable topology. Do not persist a branch `else` row. Do not migrate transition-gate UI/storage.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: branch is the highest-risk authoring seam in the slice.
  - Omitted: [`hono`] — Reason: focus is service/procedure behavior, not transport.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6-9 | Blocked By: 3

  **References**:
  - Pattern: `packages/methodology-engine/src/services/form-step-definition-service.ts` - top-level step-definition service style
  - Pattern: `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts` - transaction seam
  - Authority: `.sisyphus/drafts/l3-slice-2-invoke-branch-discussion.md`

  **Acceptance Criteria**:
  - [ ] Branch CRUD persists routes/groups/conditions via delta reconcile.
  - [ ] Default route is root-owned only.
  - [ ] Projected branch-owned edges are synced from branch truth.
  - [ ] Generic edge mutation paths reject branch-owned projected edges.

  **QA Scenarios**:
  ```
  Scenario: Branch authoring CRUD and edge projection stay coherent
    Tool: Bash
    Steps: Run `bunx vitest run packages/methodology-engine/src/tests/l3/l3-design-time-invoke-branch-services.test.ts -t "branch" packages/api/src/tests/routers/l3-design-time-invoke-branch-router.test.ts -t "branch"`
    Expected: PASS; routes/groups/conditions/default target save and projected edges remain aligned
    Evidence: .sisyphus/evidence/task-5-branch.txt

  Scenario: Invalid branch structures are rejected
    Tool: Bash
    Steps: Re-run the same suites and assert duplicate conditional route targets, invalid default target, self-targets, empty groups, and invalid operator payloads fail deterministically
    Expected: PASS; branch invariants are enforced at service/API boundaries
    Evidence: .sisyphus/evidence/task-5-branch-error.txt
  ```

  **Commit**: YES | Message: `feat(methodology): add branch authoring service and api` | Files: `packages/methodology-engine/src/**`, `packages/api/src/routers/**`, `packages/api/src/tests/routers/**`

- [x] 6. Ship invoke workflow-editor authoring surfaces

  **What to do**: Enable invoke in the step grid, add the full create/edit invoke dialog, and wire all tab interactions to the invoke procedures/read model. Preserve the current workflow-editor shell and non-invoke behaviors.
  **Must NOT do**: Do not add a new page. Do not expose workflow-target invoke bindings. Do not weaken existing Form-step UX behavior.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`vercel-react-best-practices`] — Reason: route/dialog/state flow needs careful UI behavior.
  - Omitted: [`web-design-guidelines`] — Reason: product-model correctness is higher priority than generic styling advice.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 9 | Blocked By: 4

  **References**:
  - Pattern: `apps/web/src/features/workflow-editor/dialogs.tsx` - current Form dialog shell and save/cancel pattern
  - Pattern: `apps/web/src/features/workflow-editor/step-types-grid.tsx` - step unlock surface
  - Pattern: `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx` - editor state coordination
  - Authority: `.sisyphus/drafts/l3-slice-2-invoke-branch-discussion.md`

  **Acceptance Criteria**:
  - [ ] Invoke is unlocked and authorable in the workflow editor.
  - [ ] Workflow-target invoke hides/disables `Invoke Bindings` and shows the correct note in config.
  - [ ] Work-unit invoke exposes bindings and transition/workflow selectors correctly.
  - [ ] Create/edit flows preserve dirty-state, validation, cancel, and save behavior.

  **QA Scenarios**:
  ```
  Scenario: Invoke UI flows match locked authoring model
    Tool: Bash
    Steps: Run `bunx vitest run apps/web/src/tests/routes/workflow-editor-invoke-branch.integration.test.tsx -t "invoke"`
    Expected: PASS; create/edit invoke dialogs, hidden bindings behavior, transitions/workflows, and binding UX all match the locked design
    Evidence: .sisyphus/evidence/task-6-invoke-ui.txt

  Scenario: Invoke UI blocks invalid authoring states
    Tool: Bash
    Steps: Re-run the same suite and assert invalid combinations are blocked with stable error presentation
    Expected: PASS; UI validation matches service-level invariants
    Evidence: .sisyphus/evidence/task-6-invoke-ui-error.txt
  ```

  **Commit**: YES | Message: `feat(web): add invoke design-time editor surfaces` | Files: `apps/web/src/features/workflow-editor/**`, `apps/web/src/tests/routes/**`

- [x] 7. Ship branch workflow-editor authoring surfaces and stacked route dialog

  **What to do**: Enable branch in the step grid, add the create/edit branch dialog, implement the `Routes` tab, and implement the stacked route dialog for route + group + condition authoring. Wire branch-owned projected edge rendering and click behavior in the canvas/list/inspector.
  **Must NOT do**: Do not expose a generic edge editor for branch-owned edges. Do not add a top-level Conditions tab. Do not render labels directly on branch-owned edges.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`vercel-react-best-practices`] — Reason: stacked dialog, route list, and special edge behavior are UI-heavy.
  - Omitted: [`web-design-guidelines`] — Reason: functional correctness of authoring UX is primary.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 9 | Blocked By: 5

  **References**:
  - Pattern: `apps/web/src/features/workflow-editor/workflow-canvas.tsx` - edge rendering and click model
  - Pattern: `apps/web/src/features/workflow-editor/step-list-inspector.tsx` - step/edge focus behavior
  - Pattern: `apps/web/src/features/workflow-editor/dialogs.tsx` - dialog shell and validation behavior
  - Authority: `.sisyphus/drafts/l3-slice-2-invoke-branch-discussion.md`

  **Acceptance Criteria**:
  - [ ] Branch is unlocked and authorable in the workflow editor.
  - [ ] Branch dialog has top-level tabs `Contract | Routes | Guidance` only.
  - [ ] Add/Edit Route opens a stacked route dialog with collapsible groups and operator-specific condition editors.
  - [ ] Branch-owned projected edges render and behave differently from normal edges.

  **QA Scenarios**:
  ```
  Scenario: Branch UI flows match locked authoring model
    Tool: Bash
    Steps: Run `bunx vitest run apps/web/src/tests/routes/workflow-editor-invoke-branch.integration.test.tsx -t "branch"`
    Expected: PASS; branch dialog, stacked route dialog, default route selection, route/group/condition authoring, and special edge behavior match the locked design
    Evidence: .sisyphus/evidence/task-7-branch-ui.txt

  Scenario: Branch projected edges are non-generic and route-focused
    Tool: Bash
    Steps: Re-run the same suite and assert branch-owned edges are dashed/animated, have no label, do not open the generic edge editor, and focus the owning branch step
    Expected: PASS; branch-owned edge behavior is consistent and separate from normal edge editing
    Evidence: .sisyphus/evidence/task-7-branch-ui-error.txt
  ```

  **Commit**: YES | Message: `feat(web): add branch design-time editor surfaces` | Files: `apps/web/src/features/workflow-editor/**`, `apps/web/src/tests/routes/**`

- [x] 8. Expand `getEditorDefinition` and preserve non-branch compatibility

  **What to do**: Update the editor read-model assembly so invoke and branch steps are returned as typed steps, and the unified edge list includes normal edges plus branch-owned projected edges with the exact locked metadata and ownership semantics.
  **Must NOT do**: Do not introduce a second branch-only query. Do not let branch-owned projected edges look like user-authored generic edges. Do not break non-branch workflows or generic edge CRUD.

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: [`effect-best-practices`] — Reason: this is the highest-risk compatibility seam between persistence and UI.
  - Omitted: [`effect-review`] — Reason: targeted read-model work, not general audit.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 9 | Blocked By: 4,5

  **References**:
  - Pattern: `packages/methodology-engine/src/services/workflow-editor-definition-service.ts` - editor read-model assembly seam
  - Pattern: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx` - editor query consumer
  - Authority: `.sisyphus/drafts/l3-slice-2-invoke-branch-discussion.md`

  **Acceptance Criteria**:
  - [ ] `getEditorDefinition` returns typed invoke and branch steps.
  - [ ] `getEditorDefinition.edges[]` is a unified list with `edgeOwner = normal | branch_conditional | branch_default`.
  - [ ] Branch-owned projected edges carry enough metadata for special rendering and click behavior.
  - [ ] Existing non-branch workflows still round-trip unchanged.

  **QA Scenarios**:
  ```
  Scenario: Unified editor read model supports invoke and branch without regressions
    Tool: Bash
    Steps: Run `bunx vitest run packages/methodology-engine/src/tests/l3/l3-design-time-invoke-branch-services.test.ts -t "editor definition" apps/web/src/tests/routes/workflow-editor-invoke-branch.integration.test.tsx -t "compat"`
    Expected: PASS; typed invoke/branch steps and unified edge list are returned while non-branch editor behavior remains stable
    Evidence: .sisyphus/evidence/task-8-editor-read-model.txt

  Scenario: Branch-owned edges are classified, not mistaken for generic edges
    Tool: Bash
    Steps: Re-run the same suites and assert branch-derived conditional/default edges carry ownership metadata and are not exposed as generic editable edges
    Expected: PASS; projection semantics are preserved in the read model
    Evidence: .sisyphus/evidence/task-8-editor-read-model-error.txt
  ```

  **Commit**: YES | Message: `feat(editor): unify invoke branch step and edge read models` | Files: `packages/methodology-engine/src/**`, `apps/web/src/routes/**`, `apps/web/src/tests/routes/**`

- [x] 9. Run integrated design-time verification and compatibility sweep

  **What to do**: Run the full design-time suites, verify old non-branch workflows and generic edge CRUD remain stable, and confirm invoke/branch authoring and projected-edge behavior are the only functional changes in scope.
  **Must NOT do**: Do not mark complete if invoke/branch remain partially deferred in the editor. Do not let runtime git implementation leak into the branch design-time slice.

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: [`effect-best-practices`] — Reason: final integrated verification across all authoring layers.
  - Omitted: [`effect-review`] — Reason: this is final verification, not a broad review.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: 6,7,8

  **References**:
  - Authority: `.sisyphus/plans/l3-slice-2-design-time-invoke-branch.md`
  - Working design record: `.sisyphus/drafts/l3-slice-2-invoke-branch-discussion.md`

  **Acceptance Criteria**:
  - [ ] All Definition of Done commands pass.
  - [ ] Existing non-branch workflows and generic edge behavior remain unchanged.
  - [ ] Invoke and branch are fully authorable in the workflow editor.
  - [ ] Branch-owned projected edges render and behave correctly in the unified editor read model.

  **QA Scenarios**:
  ```
  Scenario: Full design-time suite passes
    Tool: Bash
    Steps: Run every command listed in Definition of Done from repo root
    Expected: PASS; contracts, schema, repository, services, router, and web integration tests are all green
    Evidence: .sisyphus/evidence/task-9-full-suite.txt

  Scenario: Compatibility sweep stays green for non-branch workflows
    Tool: Bash
    Steps: Run `git status --short` and compare changed files to this plan’s intended design-time scope; verify non-branch generic edge CRUD and existing workflow-editor flows remain in scope and green
    Expected: PASS; invoke/branch additions do not regress existing design-time behavior
    Evidence: .sisyphus/evidence/task-9-compat.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: lock contracts for invoke, branch, and draft-spec redesign.
- Commit 2: add normalized schema + repo seams + shared condition foundations.
- Commit 3: add invoke service/API and branch service/API.
- Commit 4: add invoke and branch workflow-editor authoring surfaces.
- Commit 5: expand `getEditorDefinition` and finish compatibility verification.

## Implementation Outcomes
- Design-time invoke and branch authoring shipped through contracts, schema, repositories, methodology-engine services, router procedures, workflow-editor UI, and unified `getEditorDefinition` read models.
- Branch-owned topology is now authoritative in branch tables while the editor consumes one unified edge list with branch ownership metadata.
- `work_unit_draft_spec_fact` was redesigned to store explicit work-unit identity plus typed fact/artifact selections.
- Context-kind follow-up work was completed on top of this slice:
  - `plain_value_fact` gained authorable JSON sub-schema/value-semantics support, operator handling, and validation persistence fixes.
  - `definition_backed_external_fact` and `bound_external_fact` gained methodology/work-unit external metadata support, JSON-subfield compatibility fixes, and edit-mode selector hydration that tolerates legacy key-backed saved values while converging to canonical ids.
  - `workflow_reference_fact`, `artifact_reference_fact`, and `work_unit_draft_spec_fact` were kept aligned with id-based persistence and design-time authoring expectations.
- Seed/runtime follow-up work extended Brainstorming and Setup coverage so the primary Brainstorming runtime workflow now exercises the supported context-kind variations needed for design-time and seed validation.
- Post-slice cleanup also fixed the workflow-editor external-fact edit path so methodology external picks now save by definition id instead of silently falling back to keys when the authoring snapshot provides ids.

## Success Criteria
- Invoke is fully authorable at design time in the workflow editor.
- Branch is fully authorable at design time in the workflow editor.
- `work_unit_draft_spec_fact` correctly models typed fact/artifact selections with explicit work-unit identity.
- Branch topology semantics are authoritative in branch tables while the editor still uses one unified edge list.
- Existing non-branch workflows and generic edge CRUD remain unchanged.
