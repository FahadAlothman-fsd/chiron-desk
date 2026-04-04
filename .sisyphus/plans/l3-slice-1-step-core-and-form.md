# L3 Slice 1 — Step Core and Form

> **Status: Superseded (partial implementation).**
> Completed foundations are preserved in commits `34f6cb67f5` (step-core runtime foundations) and `fb5e7fbbc2` (triage/refinement handoff).
> Remaining correction scope is tracked in `.sisyphus/plans/l3-slice-1-context-facts-form-correction.md`.

## TL;DR
> **Summary**: Deliver the first executable L3 slice by adding shared step-execution core, explicit first-step activation, a Form-only workflow editor, Form runtime execution, workflow context-fact definitions, and the minimal `WU.SETUP` `Form -> Form` demo path against the reset repo baseline.
> **Deliverables**:
> - Workflow editor route and Form-only design-time authoring stack
> - Runtime `step_executions` + Form execution state + workflow execution context facts
> - First-step activation from workflow execution detail page only
> - Create-project `projectRootPath` picker persisted to `projects.project_root_path`
> - Slice-1 demo fixtures for `WU.SETUP` `Form -> Form` and all 7 context-fact kinds
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Contracts/fixtures → DB schema/repos → methodology/workflow services → API/router wiring → web surfaces → verification

## Context
### Original Request
Create the first sharded plan from the frozen L3 architecture, centered on shared step core and a fully vertical Form slice, then discuss seed refinement later.

### Interview Summary
- Slice-1 must inventory pages, page contents, procedures, services, repos, transactions, and DB tables.
- Form is the only active authored/executed step type in this slice; the other five step types render as disabled/deferred placeholders only.
- The workflow editor must use a dark left rail with `STEP TYPES` and `STEP LIST & INSPECTOR`, GeoForm icons (`45/58/08/33/61/22`), and only the Form tile enabled.
- Workflow editor header uses `Edit workflow metadata`, which updates the canonical `methodology_workflows` row directly.
- The workflow editor route must include `workflowDefinitionId` explicitly.
- Left rail section 2 has no move up/down controls; step or edge selection replaces the list with inspector until cleared.
- The graph allows many incoming edges but only one outgoing edge per step in slice-1.
- `descriptionJson` for slice-1-authored entities is `{ "markdown": string }`.
- Form behavior derives from workflow context-fact type; no free-standing `inputKind` enum is allowed.
- `createFormStep` and `updateFormStep` share the same payload shape except identity fields.
- Step-execution detail must use tabs and explain the meaning and source of submission, progression, context writes, and authoritative writes.
- `setup_tags` is JSON with sub-schema `object<string,string>`, but it is slice-1/demo-specific and must not be promoted into a global shared invariant module unless later slices prove it is genuinely cross-domain.
- Manual authoring is limited to project-fact instances; non-project reference examples come from deterministic seeded fixtures.

### Metis Review (gaps addressed)
- Keep the existing baseline seed integrity test at zero workflow steps/edges and introduce a separate deterministic slice-1 demo fixture path for the `WU.SETUP` `Form -> Form` path.
- Define dual enforcement for one-outgoing-edge: UI guard + transactional service validation.
- Make first-step activation server-authoritative and idempotent; never create the first step during transition/workflow start.
- Treat `conditionJson` as deferred/ignored in slice-1 authority rather than forcing unrelated branch semantics into this shard.
- Make service seams reusable foundations for later slices instead of Form-only throwaways.

## Work Objectives
### Core Objective
Add the first reusable L3 execution foundation and a complete Form-only vertical slice that proves authoring, activation, submission, context writes, project-fact writes, and progression on the reset baseline.

### Deliverables
- New route: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
- New route: `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`
- Extended routes:
  - `apps/web/src/routes/projects.new.tsx`
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
  - `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`
  - `apps/web/src/routes/projects.$projectId.facts.tsx`
  - `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx`
- New typed design-time tables for Form steps and workflow context-fact definitions.
- New runtime tables for step execution core and Form runtime state.
- New design-time and runtime procedures plus shared Effect services and repos.
- Deterministic slice-1 demo fixture path for `WU.SETUP` `Form -> Form`.

### Definition of Done
- `bunx vitest run packages/db/src/tests/schema/l3-slice-1-schema.test.ts`
- `bunx vitest run packages/db/src/tests/repository/l3-slice-1-repositories.test.ts`
- `bunx vitest run packages/methodology-engine/src/tests/l3/l3-slice-1-workflow-editor-services.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-slice-1-form-runtime.test.ts`
- `bunx vitest run packages/api/src/tests/routers/l3-slice-1-router.test.ts`
- `bunx vitest run apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx apps/web/src/tests/routes/runtime-form-step-detail.test.tsx apps/web/src/tests/routes/projects.new.integration.test.tsx apps/web/src/tests/routes/runtime-project-facts.test.tsx`
- `bunx playwright test tests/e2e/l3-slice-1-form-flow.spec.ts`

### Must Have
- `projectRootPath` persisted through `createAndPinProject` into `projects.project_root_path`.
- Workflow editor route keyed by explicit `workflowDefinitionId` path param.
- Form-only editor tile enabled; other tiles rendered disabled and deferred.
- Workflow metadata dialog updates the canonical `methodology_workflows` row.
- One outgoing edge max per step enforced in UI and backend.
- Form field behavior derived from linked workflow context-fact definition.
- `WU.SETUP` slice-1 demo fixtures cover both Forms, all 7 context-fact kinds, and one/many cardinalities.
- First-step activation occurs only on explicit action from workflow execution detail page and is idempotent.

### Must NOT Have
- No runtime command procedures for Agent/Action/Invoke/Branch/Display.
- No branch condition authoring/evaluation in this slice.
- No generic `saveWorkflowStep` API.
- No non-project manual fact-authoring UIs.
- No auto-creation of first step during transition or workflow start.
- No seed blast radius outside the dedicated slice-1 demo fixture path.
- No package cleanup/governance work.
- No hard rejection semantics for later step types; they must return deferred/default surfaces only.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after with existing Vitest + Playwright patterns on the reset tree.
- QA policy: every task includes deterministic QA scenarios and evidence paths.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Pages and page contents inventory
1. `apps/web/src/routes/projects.new.tsx`
   - Existing project creation flow
   - Add `projectRootPath` picker, validation, normalization preview, persisted round-trip summary
2. `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
   - Existing Workflows tab remains launch surface
   - Update workflow-editor link to include `workflowDefinitionId`
3. `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
   - New dark shell route
   - Header with workflow title + `Edit workflow metadata`
   - Left icon strip + `STEP TYPES` 2x3 grid with locked GeoForm icons
   - `STEP LIST & INSPECTOR` list/inspector replacement behavior
   - `Context Fact Definitions` panel
   - React Flow canvas with one-outgoing-edge rule
   - Form step dialog and edge dialog
4. `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`
   - Existing workflow execution summary retained
   - Replace deferred-only steps surface with activation CTA or compact step summary
5. `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`
   - New Form runtime detail route
   - Summary header + tabs:
     - `Submission & Progression`
     - `Writes`
     - `Context Fact Semantics`
6. `apps/web/src/routes/projects.$projectId.facts.tsx`
   - Existing project fact definition cards
   - Add create/add CTA and status badges for instances
7. `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx`
   - Reuse existing add/set/replace flows
   - Add clearer manual-authoring entry and slice-1 guidance text

### Procedure inventory
#### Design-time (`packages/api/src/routers/methodology.ts`)
- Existing retained:
  - `version.workUnit.workflow.list`
  - `version.workUnit.workflow.create`
  - `version.workUnit.workflow.update`
  - `version.workUnit.workflow.delete`
- New slice-1 procedures:
  - `version.workUnit.workflow.getEditorDefinition`
  - `version.workUnit.workflow.updateWorkflowMetadata`
  - `version.workUnit.workflow.createFormStep`
  - `version.workUnit.workflow.updateFormStep`
  - `version.workUnit.workflow.deleteFormStep`
  - `version.workUnit.workflow.createEdge`
  - `version.workUnit.workflow.updateEdge`
  - `version.workUnit.workflow.deleteEdge`
  - `version.workUnit.workflow.contextFact.list`
  - `version.workUnit.workflow.contextFact.create`
  - `version.workUnit.workflow.contextFact.update`
  - `version.workUnit.workflow.contextFact.delete`

#### Runtime (`packages/api/src/routers/project-runtime.ts`)
- Existing retained:
  - `getRuntimeWorkflowExecutionDetail`
  - `retrySameWorkflowExecution`
  - `getRuntimeProjectFacts`
  - `getRuntimeProjectFactDetail`
  - `addRuntimeProjectFactValue`
  - `setRuntimeProjectFactValue`
  - `replaceRuntimeProjectFactValue`
- New slice-1 procedures:
  - `activateFirstWorkflowStepExecution`
  - `getRuntimeStepExecutionDetail`
  - `saveFormStepDraft`
  - `submitFormStep`

#### Project creation (`packages/api/src/routers/project.ts` / `project-runtime.ts` as appropriate)
- Extend `createAndPinProject` input to carry optional `projectRootPath`

### Service / repo / transaction inventory
#### Methodology-engine services
- `WorkflowEditorDefinitionService`
- `WorkflowMetadataService`
- `WorkflowTopologyMutationService`
- `FormStepDefinitionService`
- `WorkflowContextFactDefinitionService`
- `WorkflowAuthoringTransactionService`

#### Workflow-engine services
- `WorkflowExecutionDetailService` (extend existing)
- `WorkflowExecutionStepCommandService`
- `StepExecutionDetailService`
- `StepExecutionLifecycleService`
- `StepProgressionService`
- `StepContextQueryService`
- `StepContextMutationService`
- `FormStepExecutionService`
- `StepExecutionTransactionService`

#### Repos
- Design-time:
  - `WorkflowDefinitionRepository`
  - `WorkflowStepRepository`
  - `WorkflowEdgeRepository`
  - `WorkflowContextFactDefinitionRepository`
  - `WorkflowContextFactPlainValueRepository`
  - `WorkflowContextFactExternalBindingRepository`
  - `WorkflowContextFactWorkflowReferenceRepository`
  - `WorkflowContextFactWorkUnitReferenceRepository`
  - `WorkflowContextFactArtifactReferenceRepository`
  - `WorkflowContextFactWorkUnitDraftSpecRepository`
  - `WorkflowContextFactWorkUnitDraftSpecFieldRepository`
  - `FormStepDefinitionRepository`
  - `FormStepFieldRepository`
- Runtime:
  - `StepExecutionRepository`
  - `FormStepExecutionRepository`
  - `WorkflowExecutionContextFactRepository`
- Reused authoritative repos:
  - existing project fact repository path
  - existing workflow execution repository path
  - existing execution read repository path

#### Transactions
- `WorkflowAuthoringTransactionService` for metadata + step + edge + context-fact mutations
- `StepExecutionTransactionService` for activation, submit, context writes, authoritative project-fact writes, and progression updates

### DB table inventory
#### Existing table updates
- `projects` — use existing `project_root_path`
- `methodology_workflows` — canonical workflow row updated by metadata dialog; slice-1-authored descriptions use `{ "markdown": string }`
- `methodology_workflow_steps` — generic shell row remains, Form is only active type
- `methodology_workflow_edges` — structural only for slice-1, `conditionJson` ignored/deferred in authority

#### New design-time tables
- `methodology_workflow_form_steps`
- `methodology_workflow_form_fields`
- `methodology_workflow_context_fact_definitions`
- `methodology_workflow_context_fact_plain_values`
- `methodology_workflow_context_fact_external_bindings`
- `methodology_workflow_context_fact_workflow_refs`
- `methodology_workflow_context_fact_work_unit_refs`
- `methodology_workflow_context_fact_artifact_refs`
- `methodology_workflow_context_fact_work_unit_draft_specs`
- `methodology_workflow_context_fact_work_unit_draft_spec_fields`

#### New runtime tables
- `step_executions`
- `form_step_execution_state`
- `workflow_execution_context_facts`

### Parallel Execution Waves
Wave 1: contracts, schema, demo fixtures, invariants
Wave 2: methodology-engine authoring services + workflow-engine runtime services
Wave 3: API/router wiring + web surfaces
Wave 4: integrated verification and review

### Dependency Matrix
- T1 blocks T2, T3, T5, T6, T7, T8
- T2 blocks T3, T4, T5, T8
- T3 blocks T4
- T5 blocks T6, T7
- T6 blocks T7
- T7 blocks T8

### Agent Dispatch Summary
- Wave 1 → 2 tasks → deep / unspecified-high
- Wave 2 → 2 tasks → deep
- Wave 3 → 3 tasks → unspecified-high / visual-engineering
- Wave 4 → 1 task + final verification → unspecified-high / deep / oracle

## TODOs
> Implementation + Test = ONE task. Never separate.

- [ ] 1. Freeze slice-1 contracts and invariants

  **What to do**: Extend contract definitions for the workflow-editor route identity, workflow metadata dialog, shared `FormStepPayload`, edge DTOs, workflow context-fact DTOs, runtime step execution DTOs, and `createAndPinProject` input with optional `projectRootPath`. Codify `descriptionJson` as `{ "markdown": string }` for slice-1-authored L3 entities, codify `setup_tags` as `object<string,string>` in a slice-1 Form/context-fact contract location (not `packages/contracts/src/shared/invariants.ts`), and codify “deferred/default” later-step read models instead of hard rejection behavior.
  **Must NOT do**: Do not introduce runtime DTOs for non-Form execution commands. Do not preserve a free-standing `inputKind` enum in Form contracts.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: contract parity and reuse across later slices
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: service/error/schema boundaries must follow Effect patterns
  - Omitted: [`hono`] — Reason: no transport implementation yet

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,5,6,7,8 | Blocked By: none

  **References**:
  - Pattern: `packages/contracts/src/methodology/workflow.ts` — existing workflow contract location
  - Pattern: `packages/contracts/src/runtime/executions.ts` — existing runtime execution DTO seam
  - Pattern: `packages/api/src/routers/methodology.ts` — procedure naming authority
  - Pattern: `packages/api/src/routers/project-runtime.ts` — runtime procedure naming authority
  - Pattern: `.sisyphus/plans/l3-step-definition-execution-final.md` — frozen source architecture

  **Acceptance Criteria**:
  - [ ] `createFormStep` and `updateFormStep` share a single payload schema except identity fields.
  - [ ] Slice-1 later-step DTOs expose deferred/default surfaces only.
  - [ ] `createAndPinProject` contract accepts optional `projectRootPath`.
  - [ ] `setup_tags` schema is an object whose keys and values are strings and is defined in a slice-1-specific contract/module, not a global shared invariant module.

  **QA Scenarios**:
  ```
  Scenario: Contract parity and schema locks pass
    Tool: Bash
    Steps: Run `bunx vitest run packages/contracts/src/tests/l3-slice-1-contracts.test.ts`
    Expected: PASS; payload parity, descriptionJson shape, slice-1-local setup_tags schema placement, and deferred surfaces are all asserted
    Evidence: .sisyphus/evidence/task-1-contracts.txt

  Scenario: Invalid inputKind usage is blocked
    Tool: Bash
    Steps: Run the same contract suite and assert the case that supplies a standalone inputKind fails validation
    Expected: PASS; suite reports the invalid inputKind case rejected by schema/parser
    Evidence: .sisyphus/evidence/task-1-contracts-error.txt
  ```

  **Commit**: YES | Message: `feat(contracts): freeze slice-1 form and step core contracts` | Files: `packages/contracts/src/**`, `packages/api/src/**`

- [ ] 2. Add slice-1 schema, repository seams, and deterministic demo fixtures

  **What to do**: Add migrations and schema entries for typed Form design-time tables, typed workflow context-fact tables, and runtime step core tables. Keep the existing baseline seed integrity expectations at zero workflow steps/edges, and add a separate deterministic slice-1 demo fixture path that seeds `WU.SETUP` as `Form -> Form` with exactly one edge and the 7 context-fact kind examples.
  **Must NOT do**: Do not mutate the canonical baseline seed assertions to pretend the old zero-step baseline still covers slice-1. Do not add non-Form runtime tables.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: schema authority and fixture split must stay precise
  - Skills: [`effect-best-practices`] — Reason: repo/service wiring must remain future-friendly
  - Omitted: [`brainstorming`] — Reason: decisions are already locked

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3,4,5,6,7,8 | Blocked By: 1

  **References**:
  - Pattern: `packages/db/src/schema/methodology.ts` — current generic workflow shell tables
  - Pattern: `packages/db/src/schema/runtime.ts` — current L1/L2 runtime boundary
  - Pattern: `packages/db/src/schema/project.ts` — existing `project_root_path`
  - Pattern: `packages/db/src/runtime-repositories/` — repository naming pattern
  - Pattern: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts` — existing setup mapping authority
  - Test: `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts` — baseline seed lock

  **Acceptance Criteria**:
  - [ ] Baseline seed integrity test still asserts zero workflow steps/edges in the baseline profile.
  - [ ] Demo fixture path seeds exactly two Form steps and one edge for `WU.SETUP`.
  - [ ] Runtime schema exposes `step_executions`, `form_step_execution_state`, and `workflow_execution_context_facts`.
  - [ ] Design-time schema exposes typed Form + typed workflow context-fact tables.

  **QA Scenarios**:
  ```
  Scenario: Schema and repository locks pass
    Tool: Bash
    Steps: Run `bunx vitest run packages/db/src/tests/schema/l3-slice-1-schema.test.ts packages/db/src/tests/repository/l3-slice-1-repositories.test.ts`
    Expected: PASS; new tables exist, repository contracts map correctly, one-outgoing-edge invariant is asserted
    Evidence: .sisyphus/evidence/task-2-schema.txt

  Scenario: Baseline and demo fixtures stay separated
    Tool: Bash
    Steps: Run `bunx vitest run packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`
    Expected: PASS; baseline still reports zero steps/edges, demo fixture reports exactly two Form steps and one edge
    Evidence: .sisyphus/evidence/task-2-seeds.txt
  ```

  **Commit**: YES | Message: `feat(db): add slice-1 form and step execution schema` | Files: `packages/db/src/**`, `packages/scripts/src/**`

- [ ] 3. Implement methodology-engine authoring services and router procedures

  **What to do**: Implement `WorkflowEditorDefinitionService`, `WorkflowMetadataService`, `WorkflowTopologyMutationService`, `FormStepDefinitionService`, `WorkflowContextFactDefinitionService`, and `WorkflowAuthoringTransactionService`. Wire the new methodology router procedures and live layers. Enforce one-outgoing-edge at service level and mark generic edge conditions as deferred/ignored.
  **Must NOT do**: Do not expose generic step save/update endpoints. Do not implement non-Form authoring semantics.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: authoring transaction semantics and reuse for later slices
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: Effect service/layer composition is core here
  - Omitted: [`hono`] — Reason: no Hono-specific work

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 4 | Blocked By: 1,2

  **References**:
  - Pattern: `packages/methodology-engine/src/services/workflow-service.ts` — current workflow metadata seam
  - Pattern: `packages/methodology-engine/src/layers/live.ts` — layer merge baseline
  - Pattern: `packages/methodology-engine/src/services/work-unit-service.ts` — service naming patterns
  - Test: `packages/methodology-engine/src/tests/l3/` — L3 design-time test location
  - Test: `packages/api/src/tests/routers/` — router harness patterns

  **Acceptance Criteria**:
  - [ ] `getEditorDefinition` returns workflow row, step list, edge list, context-fact definitions, and Form definitions.
  - [ ] `updateWorkflowMetadata` mutates the canonical `methodology_workflows` row.
  - [ ] `createEdge`/`updateEdge`/`deleteEdge` enforce the one-outgoing-edge rule and expose `{ markdown }` descriptions.
  - [ ] `createFormStep` and `updateFormStep` share one payload schema and derive field behavior from linked context-fact definitions.

  **QA Scenarios**:
  ```
  Scenario: Design-time authoring services pass
    Tool: Bash
    Steps: Run `bunx vitest run packages/methodology-engine/src/tests/l3/l3-slice-1-workflow-editor-services.test.ts packages/api/src/tests/routers/l3-slice-1-methodology-router.test.ts`
    Expected: PASS; metadata update, form CRUD, context-fact CRUD, and edge invariants all succeed
    Evidence: .sisyphus/evidence/task-3-methodology.txt

  Scenario: Duplicate outgoing edge attempt fails deterministically
    Tool: Bash
    Steps: Re-run the same suites and assert the case creating two outgoing edges from the same step returns the typed domain error
    Expected: PASS; exactly one outgoing edge remains authoritative
    Evidence: .sisyphus/evidence/task-3-methodology-error.txt
  ```

  **Commit**: YES | Message: `feat(methodology): add slice-1 workflow editor services` | Files: `packages/methodology-engine/src/**`, `packages/api/src/routers/methodology.ts`

- [ ] 4. Build the workflow editor route and design-time web surfaces

  **What to do**: Create the explicit workflow-editor route file, wire the existing work-unit detail page to navigate by `workflowDefinitionId`, build the dark shell, icon strip, `STEP TYPES` grid, `STEP LIST & INSPECTOR` replacement behavior, context-fact-definition panel, metadata dialog, Form step dialog, and edge dialog with stacked destructive delete. Enforce one-outgoing-edge in the canvas UI before command dispatch.
  **Must NOT do**: Do not add Save/Cancel header buttons. Do not add move up/down controls. Do not enable non-Form tiles.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: route composition and editor UX must follow the locked layout
  - Skills: [`effect-best-practices`] — Reason: use existing query/mutation patterns cleanly
  - Omitted: [`web-design-guidelines`] — Reason: visual reference is already locked and not the focus of this slice

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7,8 | Blocked By: 2,3

  **References**:
  - Pattern: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` — existing launch surface
  - Pattern: `docs/architecture/methodology-pages/workflow-editor/shell.md` — shell authority, with label overrides recorded in draft
  - Pattern: `docs/architecture/methodology-pages/workflow-editor/form-step.md` — Form dialog authority
  - Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx` — route harness pattern

  **Acceptance Criteria**:
  - [ ] Route path includes `workflowDefinitionId` and loads deterministically.
  - [ ] Only the Form tile is enabled; the other five tiles render disabled with the locked icons.
  - [ ] Section labels are exactly `STEP TYPES` and `STEP LIST & INSPECTOR`.
  - [ ] Selecting a step or edge replaces the list with the matching inspector and provides a return path to the list.

  **QA Scenarios**:
  ```
  Scenario: Workflow editor route and shell render correctly
    Tool: Playwright
    Steps: Navigate from the work-unit Workflows tab into the workflow editor; assert the route contains the workflowDefinitionId; assert the dark left rail, `STEP TYPES`, `STEP LIST & INSPECTOR`, and the six icon tiles appear; click Form tile and verify a Form step can be added
    Expected: PASS; only Form is interactive and the shell matches the locked structure
    Evidence: .sisyphus/evidence/task-4-workflow-editor.png

  Scenario: Second outgoing edge is blocked
    Tool: Playwright
    Steps: Add two Form steps, create one edge from step 1 to step 2, then attempt to create a second outgoing edge from step 1 to another target or duplicate path
    Expected: PASS; UI blocks the action and shows deterministic error messaging without creating a second outgoing edge
    Evidence: .sisyphus/evidence/task-4-workflow-editor-error.png
  ```

  **Commit**: YES | Message: `feat(web): add slice-1 workflow editor shell` | Files: `apps/web/src/routes/**`, `apps/web/src/features/**`

- [ ] 5. Add runtime schema, repositories, and step-core services

  **What to do**: Implement runtime repositories for `step_executions`, `form_step_execution_state`, and `workflow_execution_context_facts`, plus `StepExecutionLifecycleService`, `StepProgressionService`, `StepContextQueryService`, `StepContextMutationService`, and `StepExecutionTransactionService`. Extend existing workflow-engine live layers to include these services as reusable slice foundations.
  **Must NOT do**: Do not add runtime tables or services for later step types. Do not let Form-specific logic leak into shared lifecycle/progression services.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: runtime lifecycle and progression seams will be reused by later slices
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: layer/repo/service split must be correct
  - Omitted: [`opencode-sdk`] — Reason: Agent runtime is out of scope

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6,7,8 | Blocked By: 1,2

  **References**:
  - Pattern: `packages/workflow-engine/src/services/workflow-execution-detail-service.ts` — current deferred step seam
  - Pattern: `packages/workflow-engine/src/services/workflow-execution-command-service.ts` — current command seam
  - Pattern: `packages/workflow-engine/src/layers/live.ts` — shared layer composition baseline
  - Pattern: `packages/workflow-engine/src/repositories/` and `packages/db/src/runtime-repositories/` — runtime repo split
  - Test: `packages/workflow-engine/src/tests/runtime/` — runtime suite location

  **Acceptance Criteria**:
  - [ ] `step_executions` owns activation/completion/progression lineage.
  - [ ] `form_step_execution_state` owns draft values and immutable submitted snapshot.
  - [ ] `workflow_execution_context_facts` owns workflow-context outputs after submit.
  - [ ] Shared services can be reused by later step-type slices without rewriting the lifecycle core.

  **QA Scenarios**:
  ```
  Scenario: Runtime core services pass
    Tool: Bash
    Steps: Run `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-slice-1-step-core.test.ts packages/db/src/tests/repository/l3-slice-1-runtime-repositories.test.ts`
    Expected: PASS; activation, snapshot persistence, context writes, and progression lineage all behave deterministically
    Evidence: .sisyphus/evidence/task-5-runtime-core.txt

  Scenario: Duplicate first-step activation is idempotent
    Tool: Bash
    Steps: Re-run the runtime core suite and assert the case calling activation twice returns the same first step execution without a duplicate row
    Expected: PASS; only one first step execution exists
    Evidence: .sisyphus/evidence/task-5-runtime-core-error.txt
  ```

  **Commit**: YES | Message: `feat(workflow): add slice-1 step core services` | Files: `packages/workflow-engine/src/**`, `packages/db/src/runtime-repositories/**`

- [ ] 6. Implement first-step activation and Form runtime commands

  **What to do**: Extend `WorkflowExecutionDetailService`, implement `WorkflowExecutionStepCommandService`, `FormStepExecutionService`, and `StepExecutionDetailService`, wire router procedures for activation/draft/save/submit, and define the exact semantics of submission, progression, context writes, and authoritative writes. `activateFirstWorkflowStepExecution` must create the first step only when none exists, only through the explicit command, and must log its activation source as execution-detail UI.
  **Must NOT do**: Do not create steps during `startTransitionExecution` or `choosePrimaryWorkflowForTransitionExecution`. Do not treat context writes and authoritative writes as the same thing.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: command semantics and data meaning must be explicit and reusable
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: transaction and error boundaries
  - Omitted: [`hono`] — Reason: router wiring is local, not Hono research

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 7,8 | Blocked By: 5

  **References**:
  - Pattern: `packages/workflow-engine/src/services/workflow-execution-detail-service.ts` — replace deferred `stepsSurface`
  - Pattern: `packages/workflow-engine/src/services/workflow-execution-command-service.ts` — extend command surface beyond retry
  - Pattern: `packages/api/src/routers/project-runtime.ts` — runtime procedure wiring
  - Pattern: `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx` — activation surface consumer

  **Acceptance Criteria**:
  - [ ] Workflow start alone leaves `step_executions` empty.
  - [ ] Explicit activation creates exactly one first step execution or returns the existing one.
  - [ ] `submitFormStep` stores immutable submitted snapshot, writes workflow context facts, writes project facts when mapped, and computes progression.
  - [ ] Step detail read model exposes tab-ready sections for `Submission & Progression`, `Writes`, and `Context Fact Semantics`.

  **QA Scenarios**:
  ```
  Scenario: First-step activation and submit work end-to-end at service/router level
    Tool: Bash
    Steps: Run `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-slice-1-form-runtime.test.ts packages/api/src/tests/routers/l3-slice-1-router.test.ts`
    Expected: PASS; first-step activation is explicit/idempotent and Form submit returns the typed tab-ready detail model
    Evidence: .sisyphus/evidence/task-6-runtime-commands.txt

  Scenario: Activation from non-explicit paths never creates a step
    Tool: Bash
    Steps: Re-run the same suites and assert cases for workflow start/retry without explicit activation leave `step_executions` empty
    Expected: PASS; no implicit first-step creation occurs
    Evidence: .sisyphus/evidence/task-6-runtime-commands-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime): add slice-1 activation and form commands` | Files: `packages/workflow-engine/src/**`, `packages/api/src/routers/project-runtime.ts`

- [ ] 7. Extend runtime web surfaces for activation, step detail, project facts, and project root picker

  **What to do**: Update `projects.new.tsx` to collect/persist `projectRootPath`; update workflow execution detail to expose activation CTA and compact step summaries; create the step-execution detail route with tabs instead of flat blocks; extend project facts list/detail to make manual project-fact instance authoring practical in slice-1. Explain each tab/section in the UI copy: submitted snapshot = immutable submit-time value set; progression = lifecycle and next-step outcome; context writes = workflow execution context mutations; authoritative writes = writes propagated into project fact instances.
  **Must NOT do**: Do not add manual authoring controls for work-unit/artifact/workflow references. Do not keep the old flat “blocks” layout on step detail.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: multiple runtime pages and tabbed detail organization
  - Skills: [`effect-best-practices`] — Reason: existing route query/mutation patterns should remain consistent
  - Omitted: [`brainstorming`] — Reason: design is already frozen

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8 | Blocked By: 5,6

  **References**:
  - Pattern: `apps/web/src/routes/projects.new.tsx` — extend existing project create flow
  - Pattern: `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx` — current runtime workflow summary
  - Pattern: `apps/web/src/routes/projects.$projectId.facts.tsx` — project fact card list
  - Pattern: `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx` — existing add/set/replace flow
  - Test: `apps/web/src/tests/routes/-projects.new.integration.test.tsx`
  - Test: `apps/web/src/tests/routes/runtime-workflow-execution-detail.test.tsx`
  - Test: `apps/web/src/tests/routes/runtime-project-facts.test.tsx`

  **Acceptance Criteria**:
  - [ ] `projectRootPath` round-trips from UI to `projects.project_root_path`.
  - [ ] Workflow execution detail replaces deferred-only step message with activation or compact summary.
  - [ ] Step detail route uses tabs and explains the source/meaning of each tab.
  - [ ] Project fact list/detail provide practical manual authoring only for project fact instances.

  **QA Scenarios**:
  ```
  Scenario: Runtime web surfaces behave correctly
    Tool: Playwright
    Steps: Create a project with a valid project root path; open the workflow execution detail; activate first step; open the step detail page; assert tabs render and project fact creation remains available only on project fact routes
    Expected: PASS; runtime pages show activation, tabbed detail, and correct manual-authoring scope
    Evidence: .sisyphus/evidence/task-7-runtime-web.png

  Scenario: Invalid project root path and non-project manual authoring are blocked
    Tool: Playwright
    Steps: Attempt project creation with invalid path input; then navigate runtime surfaces and verify no manual create controls appear for non-project reference examples in the step detail tabs
    Expected: PASS; invalid path is rejected and non-project manual authoring controls do not exist
    Evidence: .sisyphus/evidence/task-7-runtime-web-error.png
  ```

  **Commit**: YES | Message: `feat(web): add slice-1 runtime form surfaces` | Files: `apps/web/src/routes/**`, `apps/web/src/tests/routes/**`

- [ ] 8. Add slice-1 integrated verification and deferred-surface safeguards

  **What to do**: Add targeted tests across db/methodology/workflow/api/web/e2e that lock the slice boundaries, verify deferred/default later-step behavior, verify the demo fixtures, and prove the reusable service seams remain reusable for later slices. Include architecture tests that ensure no non-Form runtime commands or non-project manual authoring paths were introduced.
  **Must NOT do**: Do not end with only happy-path coverage. Do not rely on visual-only review without deterministic tests.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: broad verification across layers
  - Skills: [`effect-best-practices`] — Reason: layer tests need clean Effect composition
  - Omitted: [`requesting-code-review`] — Reason: final verification wave handles review explicitly

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification Wave | Blocked By: 3,4,6,7

  **References**:
  - Test: `packages/db/src/tests/schema/`
  - Test: `packages/methodology-engine/src/tests/l3/`
  - Test: `packages/workflow-engine/src/tests/runtime/`
  - Test: `packages/api/src/tests/routers/`
  - Test: `apps/web/src/tests/routes/`
  - Test: `tests/e2e/`

  **Acceptance Criteria**:
  - [ ] All new slice-1 deterministic tests pass.
  - [ ] Later-step tiles and read models remain deferred/default only.
  - [ ] Baseline and demo seed paths remain intentionally separated.
  - [ ] Architecture tests assert that only project fact instances gained manual authoring and only Form gained runtime commands.

  **QA Scenarios**:
  ```
  Scenario: Full deterministic slice-1 suite passes
    Tool: Bash
    Steps: Run all commands listed in Definition of Done in sequence
    Expected: PASS; all targeted layer tests and the slice-1 Playwright spec succeed
    Evidence: .sisyphus/evidence/task-8-full-suite.txt

  Scenario: Deferred/default later-step behavior remains intact
    Tool: Bash
    Steps: Run `bunx vitest run packages/api/src/tests/architecture/l3-slice-1-deferred-surfaces.test.ts apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx`
    Expected: PASS; non-Form step types expose deferred/default UI/read models only, with no runtime command procedures added
    Evidence: .sisyphus/evidence/task-8-deferred.txt
  ```

  **Commit**: YES | Message: `test(slice1): add slice-1 verification coverage` | Files: `packages/**/src/tests/**`, `apps/web/src/tests/routes/**`, `tests/e2e/**`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
- [ ] F1. Plan Compliance Audit — oracle

  **What to do**: Review the implemented branch against this plan and confirm every locked scope item is present and every excluded item remains deferred.
  **Recommended Agent Profile**:
  - Category: `deep` — Reason: precise scope-vs-implementation audit
  **Parallelization**: Can Parallel: YES | Wave Final | Blocks: none | Blocked By: 8
  **Acceptance Criteria**:
  - [ ] Oracle reports no critical divergence from this plan.
  **QA Scenarios**:
  ```
  Scenario: Oracle scope audit
    Tool: Task
    Steps: Invoke `task(subagent_type="oracle", run_in_background=false, load_skills=[], description="Slice1 compliance audit", prompt="Review the implemented branch against /home/gondilf/Desktop/projects/masters/chiron/.sisyphus/plans/l3-slice-1-step-core-and-form.md. Return only blocking and non-blocking divergences.")`
    Expected: PASS; oracle returns no blocking divergences from the plan
    Evidence: .sisyphus/evidence/f1-plan-compliance.md
  ```
  **Commit**: NO | Message: `` | Files: []

- [ ] F2. Code Quality Review — unspecified-high

  **What to do**: Review services, repos, schema, and routes for unnecessary coupling, especially making sure shared slice-1 services are reusable foundations for later slices.
  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: broad quality review
  **Parallelization**: Can Parallel: YES | Wave Final | Blocks: none | Blocked By: 8
  **Acceptance Criteria**:
  - [ ] Review finds no critical architectural coupling that would force later slice rewrites.
  **QA Scenarios**:
  ```
  Scenario: Cross-layer quality review
    Tool: Task
    Steps: Invoke `task(category="unspecified-high", run_in_background=false, load_skills=[], description="Slice1 quality review", prompt="Review the implemented slice-1 branch for code quality. Focus on shared service reuse across future slices, deferred later-step behavior, transaction seams, and unnecessary coupling. Return blocking and non-blocking findings only.")`
    Expected: PASS; reviewer returns no blocking quality issues
    Evidence: .sisyphus/evidence/f2-code-quality.md
  ```
  **Commit**: NO | Message: `` | Files: []

- [ ] F3. Real Manual QA — unspecified-high (+ playwright)

  **What to do**: Run the slice-1 E2E scenario end-to-end and capture real browser evidence for the workflow editor, first-step activation, Form submission, and project fact authoring.
  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: integrated browser validation
  **Parallelization**: Can Parallel: YES | Wave Final | Blocks: none | Blocked By: 8
  **Acceptance Criteria**:
  - [ ] Playwright scenario passes and screenshots/traces are captured.
  **QA Scenarios**:
  ```
  Scenario: Browser-level slice-1 smoke
    Tool: Playwright
    Steps: Run `bunx playwright test tests/e2e/l3-slice-1-form-flow.spec.ts --trace on`
    Expected: PASS; full slice-1 happy path succeeds with trace output
    Evidence: .sisyphus/evidence/f3-manual-qa.txt
  ```
  **Commit**: NO | Message: `` | Files: []

- [ ] F4. Scope Fidelity Check — deep

  **What to do**: Independently verify the branch did not accidentally implement later-step runtime commands, branch conditions, or non-project manual authoring.
  **Recommended Agent Profile**:
  - Category: `deep` — Reason: anti-scope-creep validation
  **Parallelization**: Can Parallel: YES | Wave Final | Blocks: none | Blocked By: 8
  **Acceptance Criteria**:
  - [ ] Review confirms slice-1 scope boundaries are intact.
  **QA Scenarios**:
  ```
  Scenario: Anti-scope-creep review
    Tool: Task
    Steps: Invoke `task(category="deep", run_in_background=false, load_skills=[], description="Slice1 scope fidelity", prompt="Inspect the implemented slice-1 branch and confirm that only Form runtime semantics, shared step core, projectRootPath create-project changes, and project-fact manual authoring were added. Flag any accidental Branch/Display/Action/Invoke/Agent runtime work or non-project manual authoring.")`
    Expected: PASS; reviewer returns no blocking scope-creep findings
    Evidence: .sisyphus/evidence/f4-scope-fidelity.md
  ```
  **Commit**: NO | Message: `` | Files: []

## Commit Strategy
- Commit after each numbered task using the messages listed in each task.
- Keep migrations/schema, service wiring, web surfaces, and test suites in separate commits.
- Do not batch the entire slice into one commit.

## Success Criteria
- The reset-tree repo gains a reusable shared L3 step core without accidentally implementing later step types.
- `WU.SETUP` can be exercised through a deterministic `Form -> Form` demo path while the old baseline seed integrity profile stays intact.
- Workflow editor, first-step activation, Form submit, workflow context writes, project-fact writes, and step progression all work end-to-end.
- Shared services introduced here remain valid foundations for later Agent/Action/Invoke/Branch/Display slices.
