# L3 Runtime Step Execution — Setup Form Slice

## TL;DR
> **Summary**: Implement the first runtime L3 slice on top of the imported design-time reality from `feat/effect-migration`: generic workflow step-shell behavior on workflow-execution detail, real Form interaction on step-execution detail, current-state workflow context-fact persistence keyed by `contextFactDefinitionId`, and the prerequisite `projectRootPath` persistence fix needed for repo-scoped pickers.
> **Deliverables**:
> - Workflow-execution detail with explicit step-surface states and a read-only workflow-context-facts section grouped by definition
> - Step-execution detail with common header/status shell and real Form-step draft/submit/complete behavior
> - Canonical runtime schema/repository updates for `methodologyWorkflowSteps` FK alignment, Form runtime child state, and current-state workflow context-fact rows
> - Thin runtime procedures for activate, read detail, save draft, submit, and complete
> - Deterministic tests for project-root-path persistence, step-shell behavior, Form runtime semantics, and read-only context-fact presentation
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: prerequisite projectRootPath persistence + runtime contract freeze → schema/repo semantics → shared services/commands → workflow detail + step detail → verification

## Context
### Original Request
Plan the runtime mirror of the completed design-time Form/context-fact slice, starting with the setup work-unit workflow and the opening Form step.

### Interview Summary
- Planning authority is the imported design-time reality from `feat/effect-migration`, plus `.sisyphus/drafts/l3-runtime-step-execution-setup-form.md`.
- Runtime is scoped to the setup workflow and opening Form step, but must also establish the generic workflow step shell used by workflow-execution detail.
- Form submit writes only workflow-execution context facts in this slice; project-fact/work-unit-fact propagation is deferred.
- Runtime seed rows are out of scope.
- Workflow-execution detail must show explicit step states: `entry pending`, `active step`, `next pending`, `terminal/no next step`, and a blocking invalid-definition state if entry-step derivation fails.
- Step-execution detail is the real interaction page. Shared completion UX lives in the header shell, but step-type-specific readiness decides whether `Complete Step` is rendered/enabled.
- For Form, `Save draft`, `Submit`, `last draft save`, and `last submit` live inside the Form content because they are Form-specific rather than common step metadata.
- Workflow context facts are read-only on workflow-execution detail in this slice, grouped by definition, shown via summary cards and read-only instance dialogs.
- Workflow-context-fact groups are ordered by design-time definition order, and instance cards inside a definition are ordered by runtime `instanceOrder` ascending.
- `workflow_execution_context_facts` must use current-state replacement keyed by `contextFactDefinitionId`.
- For Form, completion readiness is satisfied only when both `submittedAt` and `submittedPayloadJson` exist; completion behavior itself remains shared.
- Form runtime child state remains payload-centric (`draftPayloadJson`, `submittedPayloadJson`) with normalized timestamps (`lastDraftSavedAt`, `submittedAt`). Latest-only; submit syncs draft to submitted.
- `projectRootPath` persistence during project creation is a direct prerequisite fix because repo-scoped path/file pickers depend on it.

### Metis Review (gaps addressed)
- Add an explicit invalid workflow-definition runtime state when no unique entry step can be derived.
- Make activate/save/submit/complete idempotency explicit and testable.
- Show active incomplete Form steps as summary-card-only on workflow-execution detail; do not show a next-step activation card while an active step exists.
- Keep non-Form step types generic/read-only in this slice even though the shared shell must support them.
- Treat L1/L2/project-creation fixes as prerequisite-only repairs, not a broad cleanup detour.

## Work Objectives
### Core Objective
Ship a decision-complete runtime foundation for the setup workflow’s opening Form step by aligning runtime contracts, schema, repositories, services, procedures, and pages to the imported design-time Form/context-fact model.

### Deliverables
- Patched runtime contracts/read models in `packages/contracts/src/runtime/executions.ts` and related route/page consumers.
- Patched runtime schema in `packages/db/src/schema/runtime.ts` and related repositories for Form child state and current workflow context facts.
- Patched runtime command/query services in `packages/workflow-engine/src/services/**` with current-state replace semantics and shared completion behavior.
- Patched runtime procedures in `packages/api/src/routers/project-runtime.ts` plus the prerequisite create-project persistence path in `packages/api/src/routers/project.ts` and `packages/project-context/**`. Exact runtime procedures after this slice are:
  - `getRuntimeWorkflowExecutionDetail`
  - `activateWorkflowStepExecution`
  - `getRuntimeStepExecutionDetail`
  - `saveFormStepDraft`
  - `submitFormStep`
  - `completeStepExecution`
- Patched web runtime routes for workflow-execution detail and step-execution detail in `apps/web/src/routes/**`.

### Definition of Done
- `bunx vitest run packages/db/src/tests/schema/l3-slice-1-schema.test.ts packages/db/src/tests/repository/l3-slice-1-runtime-repositories.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-slice-1-step-core.test.ts packages/workflow-engine/src/tests/runtime/l3-slice-1-form-runtime.test.ts`
- `bunx vitest run packages/api/src/tests/routers/l3-slice-1-router.test.ts packages/api/src/tests/routers/project-runtime-detail-endpoints.test.ts packages/api/src/tests/routers/project-runtime-mutations.test.ts`
- `bunx vitest run apps/web/src/tests/routes/runtime-workflow-execution-detail.test.tsx apps/web/src/tests/routes/runtime-form-step-detail.test.tsx apps/web/src/tests/routes/projects.new.integration.test.tsx`
- `bun run check-types`

### Must Have
- `step_executions.step_definition_id` references canonical `methodology_workflow_steps.id`.
- Workflow-execution detail exposes explicit step-surface states, not a message-only `stepsSurface`.
- Workflow-execution detail renders all workflow context-fact definitions, including those with `0` current instances.
- Workflow context-fact cards are grouped by `contextFactDefinitionId` and open read-only instance dialogs.
- Form runtime state uses latest-only `draftPayloadJson` and `submittedPayloadJson`, with submit syncing draft to submitted.
- Form submit replaces current workflow context-fact rows for affected definitions instead of appending history.
- `Complete Step` is shared behavior, but readiness is step-type-specific; for Form it is allowed only after `submittedAt` and `submittedPayloadJson` both exist.
- `projectRootPath` is persisted during create-project and available to runtime repo-scoped pickers.

### Must NOT Have
- No runtime seed rows or fixture-promotion work.
- No direct CRUD for workflow context facts on workflow-execution detail in this slice.
- No propagation of Form submit writes into project facts or work-unit facts.
- No non-Form step interaction UI.
- No retry/reopen/cancel/reset lifecycle expansion.
- No broad L1/L2 cleanup unrelated to this runtime slice.
- No history-preserving payload snapshots for Form in this slice.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after with deterministic suites at schema/repo/service/router/page layers.
- QA policy: every task includes both happy-path and failure-path scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Canonical Form Payload / valueJson Matrix
> Form payload mirrors `workflow_execution_context_facts.valueJson` at the **instance level**.
> Each `valueJson` stores one current instance. Form payload stores either a single instance shape or an array of instance shapes depending on rendered multiplicity.

### Top-level rules
- Top-level Form payload shape:
  - `Record<fieldKey, FieldValue | FieldValue[] | null>`
- Single rendered field:
  - unset draft/submitted value = `null`
- Many rendered field:
  - empty draft/submitted value = `[]`
- If underlying context-fact cardinality is `many` but field UI multiplicity mode is `one`, the runtime payload is still **single**, and submit normalizes it to exactly one current instance row.
- Form payload arrays are driven by **rendered multiplicity**, not only by underlying definition cardinality.

### 1. `plain_value_fact`
- Single-instance `valueJson` / field value:
  - string → `string`
  - number → `number`
  - boolean → `boolean`
  - json → `Record<string, unknown>` matching the configured JSON sub-schema
- Many rendered payload:
  - `string[]`
  - `number[]`
  - `boolean[]`
  - `Record<string, unknown>[]`
- String runtime widget behavior is already part of this plan:
  - validation `none` → normal text input
  - validation `allowed values` → select / multi-select depending on rendered multiplicity
  - validation `path` → Electron file or folder picker scoped by persisted `projectRootPath`

### 2. `definition_backed_external_fact`
- Mirrors the **underlying bound fact definition** runtime value shape.
- If underlying fact is primitive, reuse the `plain_value_fact` shapes above.
- If underlying fact is work-unit typed:
  - single-instance shape → `{ projectWorkUnitId: string }`
  - many rendered payload → `Array<{ projectWorkUnitId: string }>`
- If underlying primitive is json and rendered as many, repeat the entire json/sub-schema object block.

### 3. `bound_external_fact`
- Single-instance shape → `{ factInstanceId: string }`
- Many rendered payload → `Array<{ factInstanceId: string }>`
- No labels/summaries are stored in payload/valueJson; those belong only in read models.

### 4. `workflow_reference_fact`
- Single-instance shape → `{ workflowDefinitionId: string }`
- Many rendered payload → `Array<{ workflowDefinitionId: string }>`
- Runtime options are restricted to workflow definitions allowed at design time.

### 5. `artifact_reference_fact`
- Single-instance shape → `{ relativePath: string }`
- Many/fileset payload → `Array<{ relativePath: string }>`
- Stored path is always **repo-relative**, never absolute.
- Prefill from latest artifact-slot snapshot affects UI initialization only; submit still writes current workflow-context-fact rows only.

### 6. `work_unit_draft_spec_fact`
- Single draft-spec block shape:
  - `Record<nestedFactKey, NestedValue | NestedValue[] | null>`
- Nested value shapes follow the **nested work-unit fact types**, not workflow context-fact kinds:
  - primitive nested fact → `string | number | boolean | Record<string, unknown>`
  - work-unit typed nested fact → `{ projectWorkUnitId: string }`
- Many outer draft-spec blocks:
  - `Array<Record<nestedFactKey, NestedValue | NestedValue[] | null>>`
- Do not duplicate `workUnitTypeKey` inside the payload; it is already fixed by the bound context-fact definition.

### Materialization guarantee
- Every submitted single instance becomes one current row in `workflow_execution_context_facts`.
- Every submitted array item becomes one current row in `workflow_execution_context_facts` for the same `contextFactDefinitionId`, ordered by `instanceOrder`.
- Therefore:
  - each non-array single field value mirrors one `valueJson`
  - each array item mirrors one `valueJson`

## Execution Strategy
### Parallel Execution Waves
Wave 1: prerequisite persistence + contract/schema/repo semantics
Wave 2: shared runtime services/commands + workflow detail + step detail
Wave 3: integrated verification + hardening

### Dependency Matrix (full, all tasks)
- 1 blocks 4,5,6
- 2 blocks 3,4,5,6
- 3 blocks 4,5,6
- 4 blocks 5,6
- 5 blocks 6,7
- 6 blocks 7

### Agent Dispatch Summary
- Wave 1 → 3 tasks → `deep`
- Wave 2 → 3 tasks → `deep`, `visual-engineering`
- Wave 3 → 1 task → `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Runtime seed work remains out of scope. Form is the only interactive step type in this slice.

- [ ] 1. Persist `projectRootPath` during project creation as the runtime picker prerequisite

  **What to do**: Patch the project create flow so the already-collected `projectRootPath` survives router → project-context service → repository insert and is returned in project summaries/details where needed. Extend tests so repo-scoped runtime path/file picker assumptions have a persisted source of truth before any Form runtime path behavior is implemented.
  **Must NOT do**: Do not redesign the create-project page UX. Do not add any extra project metadata beyond `projectRootPath` persistence in this task.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: small prerequisite change with cross-layer contract/service/repository wiring
  - Skills: [`effect-best-practices`, `effect-solutions`] - Reason: keep router/service/repo boundary clean and typed
  - Omitted: [`effect-review`] - Reason: scoped prerequisite task

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,5,6 | Blocked By: none

  **References**:
  - Research: `apps/web/src/routes/projects.new.tsx:680-686` - UI already sends `projectRootPath`
  - Contract: `packages/contracts/src/project/project.ts:1-12` - create input already allows `projectRootPath`
  - Router gap: `packages/api/src/routers/project.ts:296-320` - currently drops `input.projectRootPath`
  - Service gap: `packages/project-context/src/service.ts:427-433`
  - Repo gap: `packages/db/src/project-context-repository.ts:192-196`
  - Storage: `packages/db/src/schema/project.ts:1-20`
  - Test: `apps/web/src/tests/routes/projects.new.integration.test.tsx`

  **Acceptance Criteria** (agent-executable only):
  - [ ] Create-project flow persists `projectRootPath` into `projects.project_root_path`.
  - [ ] Project create/pin API returns data consistent with the persisted row.
  - [ ] No unrelated project-create behavior changes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Project root path persists end-to-end
    Tool: Bash
    Steps: Run `bunx vitest run apps/web/src/tests/routes/projects.new.integration.test.tsx packages/api/src/tests/routers/project-runtime-queries.test.ts`
    Expected: PASS; create-project keeps `projectRootPath` through UI, router, service, and repository
    Evidence: .sisyphus/evidence/task-1-project-root-path.txt

  Scenario: Empty project root path stays optional
    Tool: Bash
    Steps: Re-run the same suites and assert projects without a root path still create successfully without writing junk values
    Expected: PASS; optional field semantics remain intact
    Evidence: .sisyphus/evidence/task-1-project-root-path-error.txt
  ```

  **Commit**: YES | Message: `fix(project): persist project root path on create` | Files: `packages/api/src/routers/project.ts`, `packages/project-context/src/**`, `packages/db/src/project-context-repository.ts`, related tests

- [ ] 2. Freeze runtime contracts and read-model shapes for the generic step shell and Form page

  **What to do**: Patch runtime contracts so workflow-execution detail exposes explicit step-surface states (`entry_pending`, `active_step`, `next_pending`, `terminal_no_next_step`, `invalid_definition`) and a read-only workflow-context-facts section grouped by definition. Patch step-execution detail contracts so the page is modeled as a common header/status shell plus step-type-specific body, with Form-specific draft/submit readiness and latest-only payload semantics.
  **Must NOT do**: Do not keep `stepsSurface` as deferred message text. Do not keep the old step-detail audit tabs shape as the active runtime contract.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this freezes the cross-layer runtime language for every downstream task
  - Skills: [`effect-best-practices`, `effect-solutions`] - Reason: typed contracts and discriminated read models need clean boundaries
  - Omitted: [`effect-review`] - Reason: scoped contract freeze task

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3,4,5,6 | Blocked By: none

  **References**:
  - Current runtime contract gap: `packages/contracts/src/runtime/executions.ts:18-50`
  - Current workflow detail gap: `packages/contracts/src/runtime/executions.ts:163-224`
  - Imported design-time authority: `packages/contracts/src/methodology/workflow.ts:28-150`
  - Workflow detail consumer: `packages/workflow-engine/src/services/workflow-execution-detail-service.ts:90-180`
  - Step detail consumer: `packages/workflow-engine/src/services/step-execution-detail-service.ts:14-53`
  - Runtime draft authority: `.sisyphus/drafts/l3-runtime-step-execution-setup-form.md`

  **Acceptance Criteria** (agent-executable only):
  - [ ] Workflow-execution detail contract includes explicit generic step states and read-only workflow-context-fact groups by definition.
  - [ ] Step-execution detail contract models common header/status metadata plus typed Form body state.
  - [ ] Contract no longer implies project-fact propagation or submit-auto-complete behavior.
  - [ ] Invalid-entry/ambiguous-entry workflow state is representable explicitly.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Runtime contracts encode explicit shell states
    Tool: Bash
    Steps: Run `bunx vitest run packages/api/src/tests/routers/l3-slice-1-router.test.ts packages/workflow-engine/src/tests/runtime/l3-slice-1-step-core.test.ts`
    Expected: PASS; tests assert explicit shell/read-model states rather than message inference
    Evidence: .sisyphus/evidence/task-2-runtime-contracts.txt

  Scenario: Stale step-detail semantics are gone
    Tool: Bash
    Steps: Re-run the same suites and assert old audit-tab/deferred-only contract shapes are not accepted
    Expected: PASS; stale contract assumptions cannot re-enter
    Evidence: .sisyphus/evidence/task-2-runtime-contracts-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime): freeze step shell contracts` | Files: `packages/contracts/src/runtime/**`, related tests

- [ ] 3. Replace runtime schema and repository semantics for canonical Form state and current workflow context facts

  **What to do**: Patch `packages/db/src/schema/runtime.ts` and runtime repositories so:
  - `step_executions.step_definition_id` remains aligned to canonical `methodology_workflow_steps.id`
  - `form_step_execution_state` evolves to the latest-only payload model with `draftPayloadJson`, `submittedPayloadJson`, `lastDraftSavedAt`, and `submittedAt`
  - `workflow_execution_context_facts` becomes current-state storage keyed by `contextFactDefinitionId`, with per-instance ordering, `createdAt` / `updatedAt` timestamps, and definition-based replace semantics
  - repository methods can replace all current rows for affected definitions atomically
  **Must NOT do**: Do not normalize per-field Form internals. Do not preserve append-only workflow-context-fact semantics in this slice.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: schema/repository seams define the runtime truth for the slice
  - Skills: [`effect-best-practices`, `effect-solutions`] - Reason: repository seams and transaction-friendly shapes must stay disciplined
  - Omitted: [`effect-review`] - Reason: focused execution task

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4,5,6 | Blocked By: 2

  **References**:
  - Runtime schema current state: `packages/db/src/schema/runtime.ts:266-338`
  - Runtime repo current state: `packages/db/src/runtime-repositories/step-execution-repository.ts:97-259`
  - Imported methodology context-fact tables: `packages/db/src/schema/methodology.ts:474-606`
  - Runtime repo interface: `packages/workflow-engine/src/repositories/step-execution-repository.ts:17-117`
  - Draft authority: `.sisyphus/drafts/l3-runtime-step-execution-setup-form.md`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `form_step_execution_state` supports latest-only draft/submitted payloads and `lastDraftSavedAt`.
  - [ ] `workflow_execution_context_facts` is keyed by `contextFactDefinitionId`, supports instance ordering, and records `createdAt` / `updatedAt`.
  - [ ] Repository supports replacing current rows for affected definitions atomically.
  - [ ] No project-fact/work-unit-fact writes are performed by these repository changes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Runtime schema and repository semantics match slice authority
    Tool: Bash
    Steps: Run `bunx vitest run packages/db/src/tests/schema/l3-slice-1-schema.test.ts packages/db/src/tests/repository/l3-slice-1-runtime-repositories.test.ts`
    Expected: PASS; schema/repository tests prove canonical step FK, Form child state metadata, and definition-keyed replace semantics
    Evidence: .sisyphus/evidence/task-3-runtime-schema.txt

  Scenario: Context-fact replacement prevents stale rows
    Tool: Bash
    Steps: Re-run the same suites and assert re-submit replaces affected definition rows instead of appending duplicates
    Expected: PASS; current-state replace semantics are deterministic
    Evidence: .sisyphus/evidence/task-3-runtime-schema-error.txt
  ```

  **Commit**: YES | Message: `refactor(runtime-db): align form state and context facts` | Files: `packages/db/src/schema/runtime.ts`, `packages/db/src/runtime-repositories/**`, related tests

- [ ] 4. Implement shared runtime services and command semantics for activate, draft, submit, and complete

  **What to do**: Patch shared runtime services so they honor the locked product model:
  - generic step activation by pending step definition, idempotent against duplicate clicks
  - Form `Save draft` validates structural shape and updates `draftPayloadJson` + `lastDraftSavedAt`
  - Form `Submit` validates full readiness, overwrites both latest payloads, and replaces current workflow-context-fact rows for affected definitions
  - shared `Complete Step` remains separate from submit and is the only operation that marks the step completed
  - step-type-specific readiness determines whether `Complete Step` is rendered/enabled; for Form readiness requires `submittedAt` + `submittedPayloadJson`
  - invalid/missing/ambiguous entry-step derivation returns a blocking invalid-definition state
  **Must NOT do**: Do not auto-complete on submit. Do not auto-activate the next step. Do not reintroduce project-fact propagation or `project.`-prefixed write semantics.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this is the highest-risk runtime boundary and transaction seam for the slice
  - Skills: [`effect-best-practices`, `effect-solutions`] - Reason: command/query separation, transaction ownership, and tagged errors must remain clean
  - Omitted: [`effect-review`] - Reason: scoped implementation task

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5,6 | Blocked By: 1,2,3

  **References**:
  - Lifecycle primitive: `packages/workflow-engine/src/services/step-execution-lifecycle-service.ts:17-126`
  - Progression primitive: `packages/workflow-engine/src/services/step-progression-service.ts:9-71`
  - Current command seam: `packages/workflow-engine/src/services/workflow-execution-step-command-service.ts:34-120`
  - Current Form service gap: `packages/workflow-engine/src/services/form-step-execution-service.ts`
  - Current context mutation gap: `packages/workflow-engine/src/services/step-context-mutation-service.ts:17-52`
  - Current transaction gap: `packages/workflow-engine/src/services/step-execution-transaction-service.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] Activate is idempotent and never creates duplicate active step executions for the same pending step.
  - [ ] Save draft updates only draft payload + `lastDraftSavedAt`.
  - [ ] Submit overwrites latest payloads and replaces current context-fact rows for affected definitions.
  - [ ] Complete-step is separate from submit and is the only step-completion path.
  - [ ] Invalid entry-step conditions are surfaced as an explicit blocking runtime state.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Shared runtime commands follow locked semantics
    Tool: Bash
    Steps: Run `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-slice-1-step-core.test.ts packages/workflow-engine/src/tests/runtime/l3-slice-1-form-runtime.test.ts`
    Expected: PASS; tests prove activate idempotency, draft/save separation, submit latest-only behavior, and separate completion
    Evidence: .sisyphus/evidence/task-4-runtime-services.txt

  Scenario: Invalid entry-step and duplicate activation failures are explicit
    Tool: Bash
    Steps: Re-run the same suites and assert missing/ambiguous entry-step states and duplicate activation requests fail or resolve deterministically
    Expected: PASS; runtime shell invariants are enforced
    Evidence: .sisyphus/evidence/task-4-runtime-services-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime): implement shared step shell commands` | Files: `packages/workflow-engine/src/services/**`, related tests

- [ ] 5. Implement workflow-execution detail read model, procedures, and read-only context-facts UI

  **What to do**: Patch the workflow-execution detail stack end-to-end so it becomes the orchestration/read page for this slice:
  - service and router return explicit step-surface states
  - router exposes `activateWorkflowStepExecution` for both entry-pending and next-pending activation
  - workflow page renders entry/active/next/terminal/invalid-definition states as summary cards only
  - page renders a read-only workflow-context-facts section with one summary card per definition, including zero-instance definitions, ordered by design-time definition order
  - card action opens read-only instance dialog with kind-sensitive value presentation and viewport-bounded scroll behavior
  **Must NOT do**: Do not inline step interaction into the workflow page. Do not add direct context-fact CRUD here.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: this is the main user-visible workflow page correction for the slice
  - Skills: [`effect-best-practices`] - Reason: UI should consume the read model rather than reconstruct workflow logic
  - Omitted: [`web-design-guidelines`] - Reason: product-model fidelity is primary

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7 | Blocked By: 1,2,3,4

  **References**:
  - Current workflow detail service: `packages/workflow-engine/src/services/workflow-execution-detail-service.ts:73-183`
  - Current runtime contract gap: `packages/contracts/src/runtime/executions.ts:157-224`
  - Current router surface: `packages/api/src/routers/project-runtime.ts:171-205`
  - Workflow page route: `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`
  - Test: `apps/web/src/tests/routes/runtime-workflow-execution-detail.test.tsx`
  - Draft authority: `.sisyphus/drafts/l3-runtime-step-execution-setup-form.md`

  **Acceptance Criteria** (agent-executable only):
  - [ ] Workflow detail renders explicit entry-pending, active-step, next-pending, terminal-no-next-step, and invalid-definition states.
  - [ ] Active incomplete Form steps show summary card + link only; no next-step card is shown while an active step exists.
  - [ ] Workflow-context-facts section shows all definitions, including zero-instance ones.
  - [ ] Summary cards open read-only instance dialogs with correct single/multi/empty layouts.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Workflow execution detail shows the correct shell state and read-only context facts
    Tool: Bash
    Steps: Run `bunx vitest run packages/api/src/tests/routers/project-runtime-detail-endpoints.test.ts packages/api/src/tests/routers/l3-slice-1-router.test.ts apps/web/src/tests/routes/runtime-workflow-execution-detail.test.tsx`
    Expected: PASS; workflow page contract and UI cover entry, active, next, terminal, invalid-definition, and read-only context-fact dialogs
    Evidence: .sisyphus/evidence/task-5-workflow-detail.txt

  Scenario: Workflow page stays orchestration-only
    Tool: Bash
    Steps: Re-run the same suites and assert step-type interaction controls and direct context-fact mutation controls are absent from workflow-execution detail
    Expected: PASS; page remains read-only/orchestration oriented
    Evidence: .sisyphus/evidence/task-5-workflow-detail-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime): ship workflow execution detail shell` | Files: `packages/workflow-engine/src/services/workflow-execution-detail-service.ts`, `packages/api/src/routers/project-runtime.ts`, `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`, related tests

- [ ] 6. Implement step-execution detail read model, procedures, and active Form interaction UI

  **What to do**: Patch the step-execution detail stack end-to-end so it becomes the real interaction surface for Form:
  - service and router return common header/status metadata plus typed Form page model
  - router exposes exact mutations `saveFormStepDraft`, `submitFormStep`, and `completeStepExecution`
  - page header shows only common metadata: identity, activated/completed timestamps, active/completed state, completion outcome, and shared `Complete Step` when enabled
  - Form content renders resolved field bindings and per-kind runtime widgets exactly per the locked runtime semantics from the draft
  - Form content also shows Form-specific metadata/actions: `Save draft`, `Submit`, `last draft save`, and `last submit`
  - `Save draft` and `Submit` live inside Form content and honor latest-only payload semantics
  **Must NOT do**: Do not keep the current audit tabs as the active step page. Do not show workflow-context-facts panel on this page.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: this is the highest-detail runtime UI surface in the slice
  - Skills: [`effect-best-practices`] - Reason: page should be driven by resolved read models and typed mutations
  - Omitted: [`web-design-guidelines`] - Reason: product-model correctness is primary here too

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7 | Blocked By: 1,2,3,4

  **References**:
  - Current step detail gap: `packages/workflow-engine/src/services/step-execution-detail-service.ts:14-199`
  - Current router surface: `packages/api/src/routers/project-runtime.ts:188-205`
  - Step page route: `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`
  - Runtime kind mirror authority: `apps/web/src/features/workflow-editor/dialogs.tsx:87-260`
  - Runtime draft authority: `.sisyphus/drafts/l3-runtime-step-execution-setup-form.md`
  - Test: `apps/web/src/tests/routes/runtime-form-step-detail.test.tsx`

  **Acceptance Criteria** (agent-executable only):
  - [ ] Step-execution detail renders only common metadata and shared completion control in the header shell.
  - [ ] Form content renders the locked kind-specific widgets and multiplicity behaviors from the runtime draft.
  - [ ] Form content contains the Form-only timestamps `last draft save` and `last submit`.
  - [ ] Save draft and submit behavior match latest-only payload semantics.
  - [ ] Workflow-context-facts panel is absent from the step page.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Step execution detail becomes the real Form interaction page
    Tool: Bash
    Steps: Run `bunx vitest run packages/api/src/tests/routers/project-runtime-mutations.test.ts packages/api/src/tests/routers/l3-slice-1-router.test.ts apps/web/src/tests/routes/runtime-form-step-detail.test.tsx`
    Expected: PASS; step page shows header/status shell, resolved Form widgets, save draft, submit, and shared complete behavior
    Evidence: .sisyphus/evidence/task-6-step-detail.txt

  Scenario: Re-submit and latest-only payload behavior stay deterministic
    Tool: Bash
    Steps: Re-run the same suites and assert submit -> edit -> save draft -> re-submit overwrites latest payloads and replaces current context-fact rows correctly
    Expected: PASS; latest-only state semantics remain stable
    Evidence: .sisyphus/evidence/task-6-step-detail-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime): ship form step execution detail` | Files: `packages/workflow-engine/src/services/step-execution-detail-service.ts`, `packages/api/src/routers/project-runtime.ts`, `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`, related tests

- [ ] 7. Run integrated runtime verification and prepare planning handoff

  **What to do**: Run the full named runtime suites, verify only intended runtime/prerequisite files are in scope, and confirm the final implementation still mirrors the imported design-time slice authority and the runtime draft decisions.
  **Must NOT do**: Do not let this slice drift into direct workflow-context-fact CRUD, non-Form interaction UIs, or unrelated cleanup.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: final integrated sweep across schema/service/router/page layers
  - Skills: [`effect-best-practices`] - Reason: keep boundaries and verification clean at the end
  - Omitted: [`effect-review`] - Reason: this is final integrated verification, not a new architecture pass

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: 5,6

  **References**:
  - Draft authority: `.sisyphus/drafts/l3-runtime-step-execution-setup-form.md`
  - Imported design-time authority: `.sisyphus/plans/l3-slice-1-design-time-context-facts-form.md`
  - Historical architecture context: `.sisyphus/plans/l3-step-definition-execution-final.md`

  **Acceptance Criteria** (agent-executable only):
  - [ ] All Definition of Done commands pass.
  - [ ] Only intended runtime/prerequisite files are in scope.
  - [ ] No project-fact/work-unit-fact propagation has been introduced.
  - [ ] Workflow-context-facts section remains read-only in this slice.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full runtime slice suite passes
    Tool: Bash
    Steps: Run every command listed in Definition of Done in sequence from repo root
    Expected: PASS; prerequisite project fix, runtime schema/repo, engine, router, page, and typecheck suites are all green
    Evidence: .sisyphus/evidence/task-7-full-runtime-suite.txt

  Scenario: Branch scope remains runtime-slice-only
    Tool: Bash
    Steps: Run `git status --short` and compare remaining touched files to this plan's procedure/service/schema/page file groups
    Expected: PASS; no unrelated feature churn is included
    Evidence: .sisyphus/evidence/task-7-runtime-scope.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit okay before marking work complete.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: persist `projectRootPath` end-to-end.
- Commit 2: freeze runtime contracts/read models.
- Commit 3: align runtime schema/repositories for canonical Form state and current context facts.
- Commit 4: implement shared runtime command/query semantics.
- Commit 5: ship workflow-execution detail shell and read-only context-facts section.
- Commit 6: ship Form step-execution detail surface.

## Success Criteria
- Runtime planning and execution now mirror the imported design-time slice instead of pre-import assumptions.
- Workflow-execution detail shows explicit generic step-shell states and a read-only grouped context-facts section.
- Step-execution detail is the real Form interaction page.
- Form runtime state is payload-centric but strongly validated against the resolved Form schema.
- Workflow context facts use current-state replace semantics keyed by `contextFactDefinitionId`.
- Repo-scoped path/file pickers have a persisted `projectRootPath` source of truth.
