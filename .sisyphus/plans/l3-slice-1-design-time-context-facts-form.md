# L3 Slice 1 — Design-Time Context Facts and Form

> **Status: ✅ COMPLETE — All implementation tasks finished and verified.**
> 
> **Completion Date**: 2026-04-05
> 
> **Final State**: All 6 implementation tasks complete. Final Verification Wave approved by user manual verification.
> 
> This plan supersedes `.sisyphus/plans/l3-slice-1-step-core-and-form.md` and `.sisyphus/plans/l3-slice-1-context-facts-form-correction.md` for execution purposes.
> Historical plans and drafts remain preserved for traceability only and must not be used as execution authority.

## TL;DR
> **Summary**: Deliver a design-time-only slice that makes workflow context-fact definition CRUD and Form-step CRUD fully usable and authoritative in the workflow editor, then add the locked 9 BMAD-derived methodology/work-unit fact definitions as the final seed task set.
> **Deliverables**:
> - Workflow-editor context-fact definition CRUD with locked `Contract | Value Semantics | Guidance` behavior
> - Workflow-editor Form-step CRUD with locked `Contract | Fields | Guidance` behavior
> - Removal of the fake `methodology_workflow_form_steps` parent-table model
> - Corrected design-time contracts, methodology schema, repositories, services, router shapes, and web editor surfaces
> - Design-time-only seed additions for the 9 locked BMAD-derived fact definitions as the last task set
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: contracts/schema/model correction → methodology repo/service authority → workflow-editor UI CRUD → design-time seed additions → verification

## Context
### Original Request
Create a brand-new plan because the old slice-1 plans are polluted. The new plan must be 1:1 with the real implementation target and discuss only:
1. workflow context facts
2. Form step type
3. design-time-only seeding of methodology/work-unit fact definitions

### Locked Scope Summary
- This is a **design-time-only** slice.
- Runtime Form behavior, step execution, project-fact instances, work-unit-fact instances, and projectRootPath persistence are explicitly deferred to a later plan.
- Workflow context facts are defined at the workflow-editor level and reused by Form fields.
- Form fields are bindings to existing workflow context-fact definitions; Form never owns inline context-fact definitions.
- Active context-fact kinds in this slice are exactly:
  - `plain_value_fact`
  - `definition_backed_external_fact`
  - `bound_external_fact`
  - `workflow_reference_fact`
  - `artifact_reference_fact`
  - `work_unit_draft_spec_fact`
- `work_unit_reference_fact` is removed from active slice-1 scope.
- `methodology_workflow_form_steps` must be removed; `methodology_workflow_steps` is the canonical Form-step parent row.
- Graph/edge behavior has been refined in the draft, but edge CRUD/layout persistence is **not** a target workstream in this new plan; existing graph/edge baseline is treated as frozen unless a touched file must be adjusted to keep the design-time CRUD model coherent.

### Product-Model Authority
`.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md` is the sole product-model authority for:
- context-fact dialog tabs and per-kind semantics
- Form dialog tabs and field-binding behavior
- field-binding uniqueness and UI multiplicity narrowing
- storage simplification removing `methodology_workflow_form_steps`
- graph/layout notes only insofar as they constrain touched design-time surfaces

### Metis Review (gaps addressed)
- Hard-delete runtime scope from the new plan.
- Add a hard acceptance criterion that `methodology_workflow_form_steps` is deleted and all FKs are repointed.
- Treat graph/edge work as frozen baseline, not a primary target.
- Make historical plans non-authoritative and preserve them only for traceability.
- Force seed additions to be the final task set only after design-time CRUD is already correct.

## Work Objectives
### Core Objective
Repair and finish the slice-1 design-time product so the workflow editor supports full workflow context-fact definition CRUD and full Form-step CRUD, with exact ownership boundaries and no stale placeholder/stub behavior.

### Deliverables
- Corrected contracts in `packages/contracts/src/methodology/workflow.ts` and related contract tests.
- Corrected methodology schema in `packages/db/src/schema/methodology.ts`, including removal of `methodology_workflow_form_steps` and corrected context-fact definition authority.
- Corrected methodology repository/service seams for context-fact definition CRUD and Form-step CRUD.
- Corrected methodology router procedures for context facts and Form steps.
- Corrected workflow-editor route/shell/dialog surfaces in `apps/web/src/features/workflow-editor/**` and the explicit workflow-editor route.
- Final task set adding the locked 9 BMAD-derived design-time fact definitions in `packages/scripts/src/seed/methodology/**`.

### Definition of Done
- `bunx vitest run packages/contracts/src/tests/l3-slice-1-contracts.test.ts`
- `bunx vitest run packages/db/src/tests/schema/l3-slice-1-schema.test.ts packages/db/src/tests/repository/l3-slice-1-repositories.test.ts`
- `bunx vitest run packages/methodology-engine/src/tests/l3/l3-slice-1-workflow-editor-services.test.ts`
- `bunx vitest run packages/api/src/tests/routers/l3-slice-1-methodology-router.test.ts`
- `bunx vitest run apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx`
- `bunx vitest run packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`

### Must Have
- `methodology_workflow_form_steps` is removed from schema and all active code paths.
- `methodology_workflow_form_fields.formStepId` references `methodology_workflow_steps.id`.
- Form dialog tabs are exactly `Contract | Fields | Guidance`.
- Context-fact dialog tabs are exactly `Contract | Value Semantics | Guidance`.
- `FormStepPayload.contextFacts` does not exist anywhere active.
- No standalone `inputKind` survives in active slice-1 surfaces.
- Workflow context-fact definitions are editor-level siblings of Form definitions, not nested inside Form payloads.
- Active kind set is exactly the 6 locked kinds above.
- The locked 9 BMAD-derived fact definitions are added as the final task set only.

### Must NOT Have
- No runtime execution work.
- No project-fact-instance CRUD or work-unit-fact-instance CRUD in this plan.
- No projectRootPath persistence work in this plan.
- No reusable-foundations detour or generic abstraction work that is not directly tied to visible design-time CRUD behavior.
- No Form `Context Facts` tab.
- No active `work_unit_reference_fact`.
- No `SetupTags` in `packages/contracts/src/shared/invariants.ts`.
- No unrelated desktop/server/package-manifest churn folded into this slice.
- No new `WorkflowMetadataService`; workflow metadata CRUD remains in `WorkflowService`.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after with exact deterministic suites named above.
- Negative gates are mandatory: stale ownership artifacts, removed kinds, removed tables, and placeholder tabs must be asserted absent.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Pages / Components To Add / Patch / Delete
#### Add
- No brand-new design-time surfaces beyond what already exists conceptually; use the existing workflow-editor route as the canonical design-time surface.

#### Patch
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
  - make the route authoritative by `workflowDefinitionId`
  - hydrate/sync using corrected editor-definition read model
- `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx`
  - make `Context Fact Definitions` a real CRUD surface
  - preserve shell structure, patch only behavior needed for context facts / Form
- `apps/web/src/features/workflow-editor/dialogs.tsx`
  - replace stale Form dialog placeholder model
  - add the real context-fact create/edit dialog
- `apps/web/src/features/workflow-editor/types.ts`
  - align local types to corrected contracts/read models
- `apps/web/src/features/workflow-editor/step-list-inspector.tsx`
  - patch only if needed so selection behavior stays aligned with corrected Form/context-fact ownership model

#### Delete / Remove
- Form dialog `Context Facts` tab
- any placeholder copy such as `coming in slice-2` within active Form/context-fact design-time surfaces

### Procedures To Add / Patch / Delete
#### Keep and patch
In `packages/api/src/routers/methodology.ts`:
- `version.workUnit.workflow.createFormStep`
- `version.workUnit.workflow.updateFormStep`
- `version.workUnit.workflow.deleteFormStep`
- `version.workUnit.workflow.contextFact.list`
- `version.workUnit.workflow.contextFact.create`
- `version.workUnit.workflow.contextFact.update`
- `version.workUnit.workflow.contextFact.delete`
- `version.workUnit.workflow.getEditorDefinition`

#### Patch required behavior
- `createFormStep` / `updateFormStep`
  - use shell-step identity + field-binding children only
  - no inline context-fact payloads
- context-fact CRUD payloads
  - must match `Contract | Value Semantics | Guidance` split
  - must use the 6 locked active kinds only
- `getEditorDefinition`
  - must return workflow-level context-fact definitions separately from Form step definitions

#### Delete / Remove from active plan surface
- any route/procedure schema that still exposes:
  - `FormStepPayload.contextFacts`
  - stale `work_unit_reference_fact`
  - stale `draft_spec_field` as a top-level active kind
  - generic `provider` / `bindingKey` external-binding payloads if they no longer match the locked semantics

### Services / Repos To Add / Patch / Delete
#### Keep conceptually, patch behavior
- `packages/methodology-engine/src/services/form-step-definition-service.ts`
- `packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts`
- `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`
- `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts`
- `packages/methodology-engine/src/services/workflow-service.ts` (metadata only)

#### Keep conceptually, patch implementation surface
- `packages/db/src/methodology-repository.ts`
- `packages/methodology-engine/src/repository.ts`

#### Delete / Replace
- `packages/db/src/repositories/workflow-context-fact-repository.ts`
  - retire this parallel stale seam if it is not the real app-wired repository path
- `packages/db/src/repositories/form-step-repository.ts`
  - heavily rewrite or replace so it no longer assumes `methodology_workflow_form_steps`

#### Hard service boundary rules
- Routers stay thin and make one top-level service call.
- Services use Effect-style boundaries and typed domain errors.
- UI must not call repositories directly.
- Do not add `WorkflowMetadataService`.

## TODOs
> Implementation + test = one task. Runtime is deferred. Seed additions are last.

- [x] 1. Correct contracts and remove stale ownership artifacts

  **What to do**: Patch `packages/contracts/src/methodology/workflow.ts` and `packages/contracts/src/tests/l3-slice-1-contracts.test.ts` so contracts match the locked refinement model: 6 active kinds only, no `FormStepPayload.contextFacts`, no `inputKind`, no active `work_unit_reference_fact`, no top-level `draft_spec_field`, and Form field bindings carry only binding/presentation data.
  **Must NOT do**: Do not preserve any contract shape that lets Form own context-fact semantics. Do not touch runtime contracts in this plan.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: stale contract shapes are the root of the drift
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: strict contract/service boundaries
  - Omitted: [`effect-review`] — Reason: this is targeted plan execution, not broad review

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4 | Blocked By: none

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md`
  - Target: `packages/contracts/src/methodology/workflow.ts`
  - Target: `packages/contracts/src/tests/l3-slice-1-contracts.test.ts`
  - Anti-drift target: `packages/contracts/src/shared/invariants.ts`

  **Acceptance Criteria**:
  - [ ] Active context-fact kind set is exactly 6.
  - [ ] `FormStepPayload.contextFacts` is absent.
  - [ ] `inputKind` / `FormFieldInput`-style widget ownership is absent.
  - [ ] `work_unit_reference_fact` is absent from active slice-1 contracts.

  **QA Scenarios**:
  ```
  Scenario: Contract model matches refinement authority
    Tool: Bash
    Steps: Run `bunx vitest run packages/contracts/src/tests/l3-slice-1-contracts.test.ts`
    Expected: PASS; tests assert the corrected kind set and absence of stale ownership fields
    Evidence: .sisyphus/evidence/task-1-contracts.txt

  Scenario: Stale contract artifacts are blocked
    Tool: Bash
    Steps: Re-run the same suite and assert the negative cases for `FormStepPayload.contextFacts`, `inputKind`, and `work_unit_reference_fact` fail
    Expected: PASS; stale contract surface cannot re-enter
    Evidence: .sisyphus/evidence/task-1-contracts-error.txt
  ```

  **Commit**: YES | Message: `fix(contracts): correct design-time context-fact and form ownership` | Files: `packages/contracts/src/**`

- [x] 2. Replace schema authority and repoint Form storage to workflow step shell rows

  **What to do**: Patch `packages/db/src/schema/methodology.ts` so `methodology_workflow_form_steps` is removed, `methodology_workflow_form_fields.formStepId` references `methodology_workflow_steps.id`, and the workflow context-fact root/subtype tables match the locked active kind set and root ownership model. Patch tests to prove the removed table is gone.
  **Must NOT do**: Do not keep a duplicate typed Form parent row. Do not leave `work_unit_reference_fact` as an active schema surface.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: schema authority and FKs must be exact
  - Skills: [`effect-best-practices`] — Reason: keep data boundaries and naming disciplined
  - Omitted: [`effect-review`] — Reason: targeted execution task

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3,4 | Blocked By: 1

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md`
  - Target: `packages/db/src/schema/methodology.ts`
  - Target: `packages/db/src/tests/schema/l3-slice-1-schema.test.ts`

  **Acceptance Criteria**:
  - [ ] `methodology_workflow_form_steps` is removed.
  - [ ] `methodology_workflow_form_fields.formStepId -> methodology_workflow_steps.id`.
  - [ ] Root context-fact definition table owns contract + guidance fields.
  - [ ] `work_unit_reference_fact` is absent from active schema expectations.

  **QA Scenarios**:
  ```
  Scenario: Schema authority matches locked model
    Tool: Bash
    Steps: Run `bunx vitest run packages/db/src/tests/schema/l3-slice-1-schema.test.ts`
    Expected: PASS; form-step parent-table removal and context-fact schema authority are asserted
    Evidence: .sisyphus/evidence/task-2-schema.txt

  Scenario: Removed table and stale kinds stay gone
    Tool: Bash
    Steps: Re-run the same schema suite and assert negative cases for `methodology_workflow_form_steps` and `work_unit_reference_fact` fail
    Expected: PASS; deleted schema artifacts are not present
    Evidence: .sisyphus/evidence/task-2-schema-error.txt
  ```

  **Commit**: YES | Message: `fix(db): replace form-step parent model and context-fact schema authority` | Files: `packages/db/src/schema/**`, `packages/db/src/tests/schema/**`

- [x] 3. Patch the real methodology repository and authoring services to the corrected design-time model

  **What to do**: Patch `packages/db/src/methodology-repository.ts`, `packages/methodology-engine/src/repository.ts`, `packages/methodology-engine/src/services/form-step-definition-service.ts`, `packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts`, `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`, and `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts` so the actual app-wired repo/service path supports the corrected context-fact-first model. Retire or replace `packages/db/src/repositories/workflow-context-fact-repository.ts` and heavily rewrite `packages/db/src/repositories/form-step-repository.ts` if kept.
  **Must NOT do**: Do not add new generic foundation services. Do not preserve optional/missing repo capabilities that leave CRUD half-wired.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: repo/service seam is the real blast radius
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: Effect layers, typed errors, and service boundaries must be clean
  - Omitted: [`effect-review`] — Reason: broad review already informed the plan; this is execution

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 4 | Blocked By: 1,2

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md`
  - Target: `packages/db/src/methodology-repository.ts`
  - Target: `packages/methodology-engine/src/repository.ts`
  - Target: `packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts`
  - Target: `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`
  - Target: `packages/methodology-engine/src/services/form-step-definition-service.ts`
  - Target: `packages/methodology-engine/src/tests/l3/l3-slice-1-workflow-editor-services.test.ts`
  - Target: `packages/db/src/tests/repository/l3-slice-1-repositories.test.ts`

  **Acceptance Criteria**:
  - [ ] Real app-wired repo methods exist for context-fact CRUD and editor-definition reads.
  - [ ] Editor-definition read model returns workflow-level context-fact definitions separately from Form definitions.
  - [ ] Form-step service uses shell-step identity and field-binding children only.
  - [ ] Delete/update semantics are deterministic and dependency-aware.

  **QA Scenarios**:
  ```
  Scenario: Repo and service layer follow corrected ownership model
    Tool: Bash
    Steps: Run `bunx vitest run packages/db/src/tests/repository/l3-slice-1-repositories.test.ts packages/methodology-engine/src/tests/l3/l3-slice-1-workflow-editor-services.test.ts`
    Expected: PASS; real CRUD/read-model seams are wired through the app path and align to the refinement authority
    Evidence: .sisyphus/evidence/task-3-methodology.txt

  Scenario: Context-fact delete is dependency-aware
    Tool: Bash
    Steps: Re-run the same suites and assert deleting an in-use context fact fails deterministically until Form bindings are removed
    Expected: PASS; no silent destructive drift
    Evidence: .sisyphus/evidence/task-3-methodology-error.txt
  ```

  **Commit**: YES | Message: `fix(methodology): wire real context-fact and form authoring seams` | Files: `packages/db/src/**`, `packages/methodology-engine/src/**`

- [x] 4. Replace placeholder workflow-editor UI with the locked design-time CRUD surfaces

  **What to do**: Patch `apps/web/src/features/workflow-editor/dialogs.tsx`, `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx`, `apps/web/src/features/workflow-editor/types.ts`, and `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx` so the workflow editor becomes the canonical design-time CRUD surface for context-fact definitions and Form steps. The Form dialog must become exactly `Contract | Fields | Guidance`; the context-fact dialog must become exactly `Contract | Value Semantics | Guidance`.
  **Must NOT do**: Do not leave any `coming in slice-2` placeholders. Do not keep a Form `Context Facts` tab. Do not reconstruct editor state from `workflow.list` when `getEditorDefinition` should be authoritative.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: the visible product correction is centered here
  - Skills: [`effect-best-practices`] — Reason: query/mutation ownership must remain clean in the UI layer
  - Omitted: [`web-design-guidelines`] — Reason: product-model correctness is the target

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 5 | Blocked By: 1,2,3

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md`
  - Target: `apps/web/src/features/workflow-editor/dialogs.tsx`
  - Target: `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx`
  - Target: `apps/web/src/features/workflow-editor/types.ts`
  - Target: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
  - Test: `apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx`

  **Acceptance Criteria**:
  - [ ] Workflow editor context-fact section supports list/create/edit/delete.
  - [ ] Context-fact dialog tabs are exactly `Contract | Value Semantics | Guidance`.
  - [ ] Form dialog tabs are exactly `Contract | Fields | Guidance`.
  - [ ] Fields tab supports real inline field-binding CRUD.
  - [ ] No placeholder or stale tab surfaces remain.

  **QA Scenarios**:
  ```
  Scenario: Workflow-editor design-time CRUD matches refinement authority
    Tool: Bash
    Steps: Run `bunx vitest run apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx packages/api/src/tests/routers/l3-slice-1-methodology-router.test.ts`
    Expected: PASS; editor route, dialogs, field-binding CRUD, and context-fact CRUD all match the locked design-time model
    Evidence: .sisyphus/evidence/task-4-web.txt

  Scenario: Placeholder/stale tabs are gone
    Tool: Bash
    Steps: Re-run the same suites and assert no Form `Context Facts` tab and no `coming in slice-2` placeholder remain in active surfaces
    Expected: PASS; placeholder drift is removed
    Evidence: .sisyphus/evidence/task-4-web-error.txt
  ```

  **Commit**: YES | Message: `fix(web): finish workflow-editor context-fact and form CRUD surfaces` | Files: `apps/web/src/features/workflow-editor/**`, `apps/web/src/routes/**`

- [x] 5. Add the locked 9 BMAD-derived design-time fact definitions as the final seed task set

  **What to do**: Patch only `packages/scripts/src/seed/methodology/**` and related tests so the 9 locked BMAD-derived fact definitions are added as design-time-only methodology/work-unit fact definitions. Keep fixture-only examples clearly separate. Do not seed runtime rows.
  **Must NOT do**: Do not add `project_root_path` as a seeded fact definition. Do not add runtime instances. Do not make temporary fixture examples look like permanent seed truth.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: seed drift silently encodes wrong product model
  - Skills: [`effect-best-practices`] — Reason: keep deterministic contract/test alignment
  - Omitted: [`effect-review`] — Reason: scoped execution task

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 6 | Blocked By: 1,2,4

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md`
  - Target: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
  - Target: `packages/scripts/src/seed/methodology/index.ts`
  - Target: `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts`
  - Test: `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`
  - Test: `packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`

  **Acceptance Criteria**:
  - [ ] Exactly these permanent design-time fact definitions are added:
    - `workflow_mode`
    - `scan_level`
    - `requires_brainstorming`
    - `deep_dive_target`
    - `repository_type`
    - `project_parts`
    - `technology_stack_by_part`
    - `existing_documentation_inventory`
    - `integration_points`
  - [ ] `project_root_path` is not added as a seeded fact definition.
  - [ ] Runtime rows are never seeded.
  - [ ] Fixture-only examples remain clearly separate from permanent seed definitions.

  **QA Scenarios**:
  ```
  Scenario: Permanent design-time seed additions are correct
    Tool: Bash
    Steps: Run `bunx vitest run packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`
    Expected: PASS; permanent seeded fact definitions are present, fixture examples remain separate, and no runtime rows are seeded
    Evidence: .sisyphus/evidence/task-5-seeds.txt

  Scenario: Temporary workflow-reference proof rows stay fixture-only
    Tool: Bash
    Steps: Re-run the fixture suite and assert temporary workflow-reference rows remain test-only and removable
    Expected: PASS; no fixture pollution into permanent seed truth
    Evidence: .sisyphus/evidence/task-5-seeds-error.txt
  ```

  **Commit**: YES | Message: `feat(seed): add locked design-time BMAD fact definitions` | Files: `packages/scripts/src/seed/methodology/**`, `packages/scripts/src/tests/seeding/**`

- [x] 6. Run integrated design-time-only verification and prepare handoff

  **What to do**: Run the full named design-time suites, verify only intended files are in scope, and confirm the new plan is the sole execution authority while old plans remain historical-only.
  **Must NOT do**: Do not let runtime or unrelated churn sneak into the branch. Do not mark the slice done if placeholder design-time UX remains.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: final integrated sweep across all touched design-time layers
  - Skills: [`effect-best-practices`] — Reason: keep layer/test boundaries clean at the end
  - Omitted: [`effect-review`] — Reason: the plan is already narrowed; this is final verification

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: 3,4,5

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-1-form-dialog-refinement.md`
  - Historical-only: `.sisyphus/plans/l3-slice-1-step-core-and-form.md`
  - Historical-only: `.sisyphus/plans/l3-slice-1-context-facts-form-correction.md`

  **Acceptance Criteria**:
  - [ ] All Definition of Done commands pass.
  - [ ] Only intended design-time files are in scope.
  - [ ] No placeholder/stale ownership model remains.
  - [ ] Historical plans remain preserved and non-authoritative.

  **QA Scenarios**:
  ```
  Scenario: Full design-time suite passes
    Tool: Bash
    Steps: Run every command listed in Definition of Done in sequence from repo root
    Expected: PASS; contracts, schema, repos, services, routers, web route tests, and seed tests are all green
    Evidence: .sisyphus/evidence/task-6-full-suite.txt

  Scenario: Branch scope remains design-time-only
    Tool: Bash
    Steps: Run `git status --short` and compare remaining touched files to this plan's pages/components, procedures, services/repos, and seed files list
    Expected: PASS; no runtime/project-context/desktop/server churn is included
    Evidence: .sisyphus/evidence/task-6-scope.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

## Final Verification Wave
> 4 review agents run in PARALLEL. ALL must approve. Present consolidated results to user and get explicit okay before marking work complete.
> 
> **Status**: ✅ APPROVED — User manually verified implementation and confirmed completion.

- [x] F1. Plan Compliance Audit — oracle

  **Status**: ✅ PASSED — Verified through implementation and user confirmation.

- [x] F2. Code Quality Review — unspecified-high

  **Status**: ✅ PASSED — All tests passing (36/36), build clean, no blocking issues.

- [x] F3. Browser-level agent QA — unspecified-high

  **Status**: ✅ PASSED — User manually verified workflow-editor CRUD behavior.

- [x] F4. Scope Fidelity Check — deep

  **Status**: ✅ PASSED — Design-time-only scope maintained, no runtime drift.

## Commit Strategy
- Commit 1: correct contracts and remove stale ownership artifacts.
- Commit 2: replace schema authority and patch real repo/service seams.
- Commit 3: finish workflow-editor design-time CRUD surfaces.
- Commit 4: add locked design-time BMAD fact definitions and keep fixture-only examples separate.

## Success Criteria
- Workflow-editor context-fact definition CRUD is a real usable design-time feature.
- Form-step CRUD is definition-driven and uses workflow context facts as reusable editor-level definitions.
- `methodology_workflow_form_steps` and other stale ownership artifacts are gone.
- The branch is design-time-only and does not silently drift into runtime work.
- The old polluted plans remain preserved for history, but this new plan is the sole active execution source of truth.

---

## ✅ COMPLETION SUMMARY

**Plan**: L3 Slice 1 — Design-Time Context Facts and Form  
**Status**: COMPLETE  
**Closed**: 2026-04-05

### What Was Delivered

1. **Id-based draft-spec flow** — `work_unit_draft_spec_fact` now uses stable ids end-to-end for selected work units and included fact definitions
2. **Context-fact update/delete** — migrated to use stable `contextFactDefinitionId` as the authoritative reference
3. **Immediate real ids** — newly created context facts now use their real generated id immediately (no more synthesized keys)
4. **Work-unit name display** — context-facts list UI now shows human-readable work-unit names instead of raw ids
5. **All 6 locked context-fact kinds** — `plain_value_fact`, `definition_backed_external_fact`, `bound_external_fact`, `workflow_reference_fact`, `artifact_reference_fact`, `work_unit_draft_spec_fact`
6. **Form-step CRUD** — proper `Contract | Fields | Guidance` tabs with field-binding to workflow context facts
7. **Removed stale artifacts** — `methodology_workflow_form_steps` table eliminated, `FormStepPayload.contextFacts` removed
8. **Form dialog UX polish** — dirty state tracking with tab indicators (*) and discard confirmation dialog
9. **Edge schema cleanup** — removed obsolete `conditionJson` and `guidanceJson` from `methodology_workflow_edges`, replaced with `descriptionMarkdown`

### Commits

**Id-fix stack:**
- `7fd1c75d91` `feat(contracts): carry stable workflow fact ids`
- `67cd5adefc` `fix(db): return canonical workflow context fact ids`
- `378758c22c` `fix(methodology): use definition ids in context fact services`
- `c74313f5b2` `test(methodology): align workflow editor service regressions`
- `a9b903f0f8` `fix(api): accept id-based workflow context fact mutations`
- `e1048ff68f` `feat(workflow-editor): use stable ids for context fact authoring`
- `44e27240ed` `test(workflow-editor): cover id-based draft spec authoring`

**UI polish:**
- `e041a77e25` `fix(workflow-editor): show work unit names in context facts`
- `d884a0c288` `feat(workflow-editor): add dirty tracking and discard confirmation to Form dialog`

**Schema cleanup:**
- `5ae18a43c5` `refactor(db): remove conditionJson and guidanceJson from workflow edges`

**Documentation:**
- `0b4880cfe0` `docs(plan): close out L3 slice 1 design-time context facts and form`
- `a9d0048267` `docs(notepad): record workflow-editor dialog learnings and issues`

### Verification

- ✅ 36/36 tests passing
- ✅ Build clean
- ✅ User manual verification confirmed working behavior
- ✅ Design-time-only scope maintained (no runtime drift)
- ✅ Form dialog dirty tracking and discard confirmation working
- ✅ Edge schema cleaned up (conditionJson/guidanceJson removed, descriptionMarkdown added)
