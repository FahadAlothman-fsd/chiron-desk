# L3 Plan B — Fact Unification + Runtime Validation

> **STATUS: COMPLETED** — Plan B is implemented and verified in the current `feat/effect-migration` branch. This file remains the authoritative closure record for the fact/runtime unification wave.

## Closure Update (2026-04-24)
- Plan B remains complete, and the branch now also includes the follow-up invoke/runtime refinements that landed on top of the original Plan B wave.
- Additional stabilized work included along the way:
  - invoke runtime save-draft behavior and saved-vs-prefill-vs-live child state separation
  - invoke many-instance runtime handling with explicit fresh-draft/new-instance targeting
  - invoke work-unit start/completion gate detail branching in runtime surfaces
  - collapsible invoke binding preview and condition-tree panels in the runtime UI
  - setup completion-gate seed repair so setup facts like `initiative_name` and `project_kind` resolve by the correct seeded fact-definition ids
- The setup completion-gate issue was confirmed as a **seed-definition mismatch**, not persisted completion-gate evaluation. Transition completion gates are still evaluated live at runtime.
- Recent targeted verification covering the latest follow-up fixes passed:
  - `bunx vitest run packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts packages/scripts/src/tests/seeding/setup-invoke-phase-1-fixture.test.ts packages/contracts/src/tests/l3-runtime-invoke-contracts.test.ts packages/workflow-engine/src/tests/runtime/runtime-invoke-step-detail.test.ts packages/workflow-engine/src/tests/runtime/runtime-invoke-workunit-start.test.ts apps/web/src/tests/routes/runtime-invoke-step-detail.test.tsx`
- Related post-plan closure commits:
  - `487a16fa49` `fix(seed): align setup completion gate fact ids`
  - `53b7d4b02b` `fix(runtime): support invoke row gate states and multi-instance drafts`
  - `cc3863f5d6` `fix(runtime-ui): refine invoke condition tree behavior`
- Adjacent future tracks remain separate from Plan B closure:
  - `.sisyphus/plans/chiron-documentation-site.md`
  - `.sisyphus/plans/chiron-thesis-survey-experiment.md`
  These should be treated as post-merge follow-up work, not reopened inside Plan B.

## TL;DR
> **Summary**: Implement the canonical fact/runtime model locked after Plan A, then route every approved fact read/write surface through it: manual runtime CRUD, workflow-context mutation, invoke materialization, and agent/MCP boundaries. This plan also adds the missing manual runtime CRUD home for workflow-context facts and replaces raw/legacy fact handling with runtime-enforced canonical validation.
> **Deliverables**:
> - Canonical fact family contracts, closed schemas, and compatibility rules
> - Shared runtime manual-CRUD/orchestration + validation service
> - Family-specific runtime CRUD procedures for project facts, work-unit facts, and workflow-context facts
> - Manual CRUD UI/dialogs on project fact detail, work-unit fact detail, and workflow execution detail
> - Progressive-disclosure MCP read/write model using `readItemId` / `writeItemId`
> - Template-only `work_unit_draft_spec_fact` with invoke-state materialization mappings
> - Work-unit runtime identity (immutable key + display-name rule) and artifact snapshot semantics
> **Effort**: XL
> **Parallel**: YES - 4 waves
> **Critical Path**: Contract lock → schema/repo/service foundation → runtime boundaries/procedures → UI/dialogs → audit/regression

## Context
### Original Request
- Treat this as the immediate next plan after Plan A closure.
- Include artifact-slot linking with both project facts and work-unit facts.
- Enforce canonical `slotDefinitionId` at persistence boundaries.
- Normalize wrapped compatibility envelopes `{ factInstanceId, value }`.
- Add explicit folder/path validation and runtime CRUD.
- Keep methodology-version thinning and broad UI refactors out of scope.
- Add manual user-facing runtime CRUD: runtime pages, dialogs by cardinality/fact type, and the procedures/services behind them.

### Interview Summary
- Primitive-backed facts unify across layers: `string`, `number` (+ min/max), `boolean`, `json`.
- `definition_backed_external_fact` and `bound_external_fact` collapse into canonical `bound_fact`.
- Canonical `bound_fact` runtime value always stores both `{ instanceId, value }`.
- Workflow steps interact only with workflow-context facts; project/work-unit facts are reached through context proxies/bindings.
- Artifact semantics become `artifact_snapshot_fact`-style: slot authority, grouped files, repo-relative regex validation, optional runtime folder binding, fallback to repo root.
- `work_unit_draft_spec_fact` is a closed-schema reusable template; created runtime ids live in invoke state, not in the template.
- Manual runtime CRUD must exist for project facts, work-unit facts, and workflow-context facts.
- Workflow-context manual CRUD belongs on workflow execution detail as a context section with per-fact dialogs.
- Manual CRUD UX is detail-page + dialogs, not broad inline editing.
- Cardinality-one uses direct set/replace dialog; cardinality-many uses instance list + per-instance dialogs.
- Backend uses a shared runtime manual CRUD orchestration service with family-specific repositories and family-specific external procedures.
- MCP redesign is runtime-only, step-scoped by session, uses `readItemId` / `writeItemId`, mode-driven reads, `queryParam`, and structured errors.

### Metis Review (gaps addressed)
- Front-load a contract-lock task before any boundary hardening.
- Add explicit runtime CRUD tasks and workflow-context runtime CRUD surfaces.
- Add explicit consumer migration tasks for legacy envelope readers, not only write boundaries.
- Add explicit work-unit identity task.
- Add explicit artifact snapshot semantics task.
- Preserve the step → workflow-context → outward propagation invariant.

## Work Objectives
### Core Objective
Make fact handling decision-complete and runtime-safe by standardizing canonical fact shapes, adding one shared runtime CRUD/validation orchestration layer, exposing manual CRUD consistently across the three runtime layers, and upgrading all read/write surfaces to the locked semantics without reopening unrelated UI architecture.

### Deliverables
- Canonical contracts for fact families, context-fact kinds, MCP read/write, runtime CRUD inputs/outputs, and invoke template/state payloads
- Runtime schema/repository support for workflow-context manual CRUD and work-unit identity metadata
- Shared `RuntimeManualFactCrudService` plus family-specific repository adapters
- Family-specific project/work-unit/workflow-context CRUD procedures using normalized CRUD verbs
- Manual CRUD UI/dialogs on:
  - `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx`
  - `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.facts.$factDefinitionId.tsx`
  - `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`
- Progressive-disclosure MCP read/write contract and runtime services
- Template-only `work_unit_draft_spec_fact` and invoke-state materialization mapping
- Artifact slot/path validation, folder-path binding, and canonical `slotDefinitionId` persistence
- No-bypass audit and regression proof, including Plan A reruns

### Definition of Done (verifiable conditions with commands)
- `bunx vitest run packages/contracts/src/tests/fact-unification-runtime-contracts.test.ts`
- `bunx vitest run packages/contracts/src/tests/mcp-progressive-disclosure-contract.test.ts`
- `bunx vitest run packages/db/src/tests/schema/runtime-fact-unification-schema.test.ts`
- `bunx vitest run packages/db/src/tests/repository/runtime-fact-crud-repositories.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-manual-fact-crud-service.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/bound-fact-compatibility.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/artifact-snapshot-fact-semantics.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/invoke-draft-spec-template-state.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/work-unit-instance-identity.test.ts`
- `bunx vitest run packages/api/src/tests/routers/runtime-fact-crud-logical-delete.test.ts`
- `bunx vitest run packages/api/src/tests/routers/runtime-workflow-context-fact-crud.test.ts`
- `bunx vitest run apps/web/src/tests/runtime/runtime-fact-dialogs.test.tsx`
- `bunx vitest run apps/web/src/tests/runtime/workflow-context-fact-crud-section.test.tsx`
- `bunx vitest run packages/contracts/src/tests/l3-plan-a-action-branch-contracts.test.ts`
- `bunx vitest run packages/api/src/tests/routers/action-branch-plan-a-routers.test.ts`
- `bunx vitest run packages/db/src/tests/repository/l3-plan-a-action-branch-repositories.test.ts`
- `bunx vitest run packages/db/src/tests/schema/l3-plan-a-action-branch-schema.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/action-step-runtime-services.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/branch-runtime-services.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-invoke-workunit-start.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-invoke-completion.test.ts`
- `bun run check-types`
- `bun run test`
- `bun run build`

### Must Have
- Canonical `bound_fact`, `workflow_ref_fact`, `artifact_snapshot_fact`, `work_unit_draft_spec_fact`, and primitive-backed value semantics implemented in contracts and runtime validators
- Closed `work_unit_draft_spec_fact` schema with no arbitrary keys
- Manual runtime CRUD for project facts, work-unit facts, and workflow-context facts
- Structured runtime CRUD dialogs by cardinality and fact family
- Shared runtime manual CRUD service with family-specific repositories
- MCP read/write redesign using `readItemId` / `writeItemId`, no `stepExecutionId`, mode-driven reads, structured errors
- Work-unit immutable runtime key `{definition_key}-{instance#}` and cardinality-many display-name flag behavior
- Artifact slot/folder-path validation with canonical `slotDefinitionId` persistence and repo-root fallback
- Legacy compatibility normalization for `{ factInstanceId, value }` and other approved read shapes
- Explicit proof that steps still mutate only workflow-context facts directly

### Must NOT Have
- No broad UI redesign outside the identified runtime surfaces
- No methodology-version-layer thinning
- No direct step mutation of project/work-unit facts
- No raw JSON-first dialogs for special fact families
- No direct repo-file deletion by Chiron
- No persistence of friendly slot keys at canonical boundaries
- No created runtime ids written into `work_unit_draft_spec_fact` templates

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after with explicit boundary fixtures and regression reruns
- QA policy: every task includes happy path + failure path, exact commands, and evidence files
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.log`

## Execution Strategy
### Locked Architecture Decisions
1. `bound_fact` is the canonical cross-layer replacement for the two legacy external kinds.
2. Runtime enforcement is authoritative at MCP/form/action/invoke/manual-CRUD boundaries.
3. Workflow steps directly mutate only workflow-context facts.
4. Manual runtime CRUD procedures use CRUD verbs (`create/update/remove/delete`) and remain family-specific at the router boundary.
5. `remove` vs `delete` exists only for workflow-context facts; project/work-unit facts use logical delete only.
6. Workflow-context manual CRUD lives on workflow execution detail as a context section + per-fact dialogs.
7. Project/work-unit manual CRUD remain on existing fact detail pages with upgraded dialogs and backend semantics.
8. Artifact slots remain the authority for path/format rules; optional folder-path fact binding supplies runtime base path only.
9. `work_unit_draft_spec_fact` is template-only; invoke state stores frozen run values + created runtime ids.
10. MCP read grants become explicit `readItemId` records parallel to `writeItemId`.

### Parallel Execution Waves
Wave 1: contract lock + schema/repo foundation
Wave 2: shared service foundation + work-unit/artifact semantics
Wave 3: runtime boundaries, MCP, invoke, manual CRUD procedures
Wave 4: web runtime surfaces + audit/regression

### Dependency Matrix (full, all tasks)
- T1 contract/model lock → blocks T2-T11
- T2 schema/repository foundation → blocks T3-T11
- T3 shared runtime manual CRUD service → blocks T4-T11
- T4 artifact + path semantics → blocks T6-T11
- T5 work-unit identity + progressive disclosure → blocks T7-T11
- T6 project/work-unit runtime CRUD procedure migration → blocks T10-T11
- T7 workflow-context runtime CRUD + MCP redesign → blocks T8-T11
- T8 invoke template/state migration → blocks T11
- T9 legacy consumer migration and boundary hardening → blocks T11
- T10 web runtime CRUD dialogs/pages → blocks T11
- T11 audit/regression + Plan A reruns → blocks Final Verification Wave

### Agent Dispatch Summary
- Wave 1 → 2 tasks → deep
- Wave 2 → 3 tasks → deep / unspecified-high
- Wave 3 → 4 tasks → deep
- Wave 4 → 2 tasks → visual-engineering / unspecified-high

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Lock canonical contracts, schemas, and runtime payload shapes

  **What to do**: Update contracts to freeze the final canonical fact family shapes, manual CRUD payloads, MCP `readItemId` / `writeItemId` direction, explicit `queryParam`, runtime error envelopes, `bound_fact`, `workflow_ref_fact`, `artifact_snapshot_fact`, closed `work_unit_draft_spec_fact`, CRUD verbs, and the fixed/fact-backed invoke source matrix. Rename the methodology/design-time enum layer to `bound_fact` now; do not keep legacy design-time names as canonical.
  **Must NOT do**: Do not harden runtime services in this task. Do not keep `stepExecutionId` in the final MCP v1 tool inputs.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this is the plan’s contract lock and must drive all later work.
  - Skills: [`effect-best-practices`] - Reason: contract/runtime schemas and tagged errors must align.
  - Omitted: [`web-design-guidelines`] - Reason: no UI implementation in this task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: T2-T11 | Blocked By: none

  **References**:
  - `packages/contracts/src/methodology/fact.ts`
  - `packages/contracts/src/methodology/workflow.ts`
  - `packages/contracts/src/runtime/facts.ts`
  - `packages/contracts/src/mcp/tools.ts`
  - `packages/contracts/src/agent-step/runtime.ts`
  - Plan decisions in this file under `## Context` and `## Execution Strategy`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/contracts/src/tests/fact-unification-runtime-contracts.test.ts`
  - [ ] `bunx vitest run packages/contracts/src/tests/mcp-progressive-disclosure-contract.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Canonical fact contracts match locked decisions
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/fact-unification-runtime-contracts.test.ts --reporter=verbose | tee .sisyphus/evidence/task-1-contract-lock.log`
    Expected: PASS; `bound_fact`, artifact snapshot facts, workflow refs, work-unit draft spec, CRUD payloads, and work-unit identity rules match the locked model
    Evidence: .sisyphus/evidence/task-1-contract-lock.log

  Scenario: MCP inputs are item-id based and step-scoped by session only
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/mcp-progressive-disclosure-contract.test.ts --reporter=verbose | tee .sisyphus/evidence/task-1-mcp-contract.log`
    Expected: PASS; no `stepExecutionId` remains in MCP tool inputs; `readItemId`, `writeItemId`, modes, `queryParam`, and structured errors are defined
    Evidence: .sisyphus/evidence/task-1-mcp-contract.log
  ```

  **Commit**: YES | Message: `feat(contracts): lock plan-b fact and mcp contracts` | Files: `packages/contracts/src/**`

- [x] 2. Add runtime schema and repository foundation for workflow-context CRUD and work-unit identity

  **What to do**: Add/extend runtime schema and repository support for workflow-context manual CRUD, immutable work-unit keys, display-name metadata behavior, and any needed runtime CRUD persistence records. Keep family-specific repositories under `packages/db/src/runtime-repositories/**` and add the missing workflow-context runtime repository rather than reusing design-time methodology repositories.
  **Must NOT do**: Do not put manual CRUD logic in routers. Do not write created invoke ids into draft-spec storage.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: schema/repository changes determine everything above them.
  - Skills: [`effect-best-practices`] - Reason: repository contracts and error behavior must stay typed.
  - Omitted: [`hono`] - Reason: HTTP transport is irrelevant here.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T3-T11 | Blocked By: T1

  **References**:
  - `packages/db/src/schema/runtime.ts`
  - `packages/db/src/runtime-repositories/project-fact-repository.ts`
  - `packages/db/src/runtime-repositories/work-unit-fact-repository.ts`
  - `packages/db/src/repositories/workflow-context-fact-repository.ts`
  - `packages/workflow-engine/src/repositories/project-fact-repository.ts`
  - `packages/workflow-engine/src/repositories/work-unit-fact-repository.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/db/src/tests/schema/runtime-fact-unification-schema.test.ts`
  - [ ] `bunx vitest run packages/db/src/tests/repository/runtime-fact-crud-repositories.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Runtime schema supports workflow-context CRUD and work-unit identity
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/schema/runtime-fact-unification-schema.test.ts --reporter=verbose | tee .sisyphus/evidence/task-2-runtime-schema.log`
    Expected: PASS; schema includes workflow-context runtime CRUD support and immutable work-unit key fields without forcing unrelated migrations
    Evidence: .sisyphus/evidence/task-2-runtime-schema.log

  Scenario: Runtime repositories honor logical delete and family boundaries
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/runtime-fact-crud-repositories.test.ts --reporter=verbose | tee .sisyphus/evidence/task-2-runtime-repos.log`
    Expected: PASS; project/work-unit/workflow-context runtime repositories create/update/logically-delete correctly and do not cross family boundaries
    Evidence: .sisyphus/evidence/task-2-runtime-repos.log
  ```

  **Commit**: YES | Message: `feat(runtime): add fact crud repository foundation` | Files: `packages/db/src/**`, `packages/workflow-engine/src/repositories/**`

- [x] 3. Implement shared runtime manual fact CRUD orchestration and error model

  **What to do**: Add one shared orchestration layer (for example `RuntimeManualFactCrudService`) that owns canonical decode/normalize/validate/apply logic for manual runtime CRUD across project facts, work-unit facts, and workflow-context facts. This service must enforce runtime-only validation, family-specific policy, logical delete semantics, context-only remove/delete distinction, and structured agent/user-facing errors.
  **Must NOT do**: Do not bypass methodology/context definitions. Do not let routers call repositories directly for Plan B-managed runtime CRUD after this task.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this is the central business-logic layer.
  - Skills: [`effect-best-practices`] - Reason: tagged errors, services, and validation flows must remain composable.
  - Omitted: [`web-design-guidelines`] - Reason: no UI here.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: T4-T11 | Blocked By: T2

  **References**:
  - `packages/workflow-engine/src/services/runtime-fact-service.ts`
  - `packages/workflow-engine/src/services/step-context-mutation-service.ts`
  - `packages/workflow-engine/src/services/runtime/agent-step-context-write-service.ts`
  - `packages/contracts/src/methodology/fact.ts`
  - `packages/contracts/src/methodology/workflow.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-manual-fact-crud-service.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Shared service enforces canonical validation and CRUD semantics
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-manual-fact-crud-service.test.ts --reporter=verbose | tee .sisyphus/evidence/task-3-runtime-crud-service.log`
    Expected: PASS; project/work-unit/workflow-context CRUD all go through one service and honor family-specific rules
    Evidence: .sisyphus/evidence/task-3-runtime-crud-service.log

  Scenario: Structured runtime errors are returned on invalid writes
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-manual-fact-crud-service.test.ts --testNamePattern="invalid payload|forbidden operation|structured error" --reporter=verbose | tee .sisyphus/evidence/task-3-runtime-crud-errors.log`
    Expected: PASS; invalid shape, unsupported capability, and scope violations return explicit structured errors
    Evidence: .sisyphus/evidence/task-3-runtime-crud-errors.log
  ```

  **Commit**: YES | Message: `feat(runtime): add shared manual fact crud service` | Files: `packages/workflow-engine/src/services/**`

- [x] 4. Implement artifact snapshot semantics and shared path validation

  **What to do**: Implement the canonical `artifact_snapshot_fact` semantics: grouped files per slot, canonical `slotDefinitionId` persistence, full repo-relative path regex validation, optional folder-path fact binding, repo-root fallback when folder fact is missing, explicit file status values, `record_deleted_file` / `remove_from_slot` distinction, and no direct repo deletion. Apply this to both project-fact-linked and work-unit-fact-linked artifact relationships.
  **Must NOT do**: Do not persist friendly slot keys. Do not infer folder binding from unrelated facts.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: artifact semantics touch validation, persistence, and runtime reads.
  - Skills: [`effect-best-practices`] - Reason: error handling and service coordination must remain explicit.
  - Omitted: [`vercel-react-best-practices`] - Reason: this is backend/runtime semantics.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T6-T11 | Blocked By: T3

  **References**:
  - `packages/contracts/src/methodology/artifact-slot.ts`
  - `packages/contracts/src/methodology/fact.ts`
  - `packages/workflow-engine/src/services/runtime/agent-step-context-write-service.ts`
  - `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.artifact-slots.$slotDefinitionId.tsx`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/artifact-snapshot-fact-semantics.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Artifact snapshot semantics accept only valid repo-relative paths
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/artifact-snapshot-fact-semantics.test.ts --reporter=verbose | tee .sisyphus/evidence/task-4-artifact-semantics.log`
    Expected: PASS; valid slot/file writes succeed and invalid absolute/traversal/wrong-regex paths fail explicitly
    Evidence: .sisyphus/evidence/task-4-artifact-semantics.log

  Scenario: Folder-path binding falls back to repo root safely
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/artifact-snapshot-fact-semantics.test.ts --testNamePattern="folder binding fallback|repo root fallback|missing folder fact" --reporter=verbose | tee .sisyphus/evidence/task-4-folder-fallback.log`
    Expected: PASS; missing/deleted folder fact uses repo root without blocking migrations, while still enforcing slot regex rules
    Evidence: .sisyphus/evidence/task-4-folder-fallback.log
  ```

  **Commit**: YES | Message: `feat(facts): add artifact snapshot validation semantics` | Files: `packages/contracts/src/**`, `packages/workflow-engine/src/**`, `packages/db/src/**`

- [x] 5. Implement work-unit runtime identity and progressive-disclosure reads

  **What to do**: Implement immutable `{definition_key}-{instance#}` work-unit keys, cardinality-many display-name flag behavior, and progressive-disclosure runtime reads for work-unit search/expansion. Keep default query results lightweight and require explicit expansion for facts/artifacts.
  **Must NOT do**: Do not reuse instance numbers after deletion. Do not expose full fact/artifact payloads by default.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: runtime identity and disclosure rules affect both services and UI.
  - Skills: [`effect-best-practices`] - Reason: schema + query outputs must stay typed.
  - Omitted: [`opencode-sdk`] - Reason: harness integration is separate.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T7-T11 | Blocked By: T3

  **References**:
  - `packages/workflow-engine/src/services/runtime-work-unit-service.ts`
  - `packages/contracts/src/runtime/work-units.ts`
  - `packages/workflow-engine/src/services/runtime/agent-step-context-read-service.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/work-unit-instance-identity.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Work-unit instance keys are immutable and monotonic
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/work-unit-instance-identity.test.ts --reporter=verbose | tee .sisyphus/evidence/task-5-work-unit-identity.log`
    Expected: PASS; keys follow `{definition_key}-{instance#}`, remain immutable, and numbers are never reused after delete
    Evidence: .sisyphus/evidence/task-5-work-unit-identity.log

  Scenario: Progressive-disclosure reads stay lightweight by default
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/work-unit-instance-identity.test.ts --testNamePattern="progressive disclosure|lightweight default read|explicit expansion" --reporter=verbose | tee .sisyphus/evidence/task-5-work-unit-read-disclosure.log`
    Expected: PASS; default reads expose only identity/key/display/type, with facts/artifacts available only through explicit expansion
    Evidence: .sisyphus/evidence/task-5-work-unit-read-disclosure.log
  ```

  **Commit**: YES | Message: `feat(runtime): add work-unit identity and disclosure rules` | Files: `packages/db/src/**`, `packages/workflow-engine/src/**`, `packages/contracts/src/**`

- [x] 6. Migrate project and work-unit manual runtime CRUD procedures to CRUD verbs over shared service

  **What to do**: Replace router-direct project/work-unit runtime fact mutation flows with family-specific CRUD procedures over the shared service. Migrate the current add/set/replace behavior into explicit `create/update/delete` semantics while preserving the existing project fact and work-unit fact detail pages as the canonical manual CRUD homes.
  **Must NOT do**: Do not keep the web UI dependent on the old `add/set/replace` procedure names after this task. Do not add `remove` for project/work-unit facts.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: router, service, and runtime fact pages all change together.
  - Skills: [`effect-best-practices`] - Reason: procedure contracts and service boundaries must stay consistent.
  - Omitted: [`hono`] - Reason: router usage is straightforward; the complexity is in the contracts.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T10-T11 | Blocked By: T3, T4

  **References**:
  - `packages/api/src/routers/project-runtime.ts`
  - `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx`
  - `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.facts.$factDefinitionId.tsx`
  - `packages/workflow-engine/src/services/runtime-fact-service.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/api/src/tests/routers/runtime-fact-crud-logical-delete.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Project/work-unit CRUD procedures use CRUD verbs and logical delete
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/runtime-fact-crud-logical-delete.test.ts --reporter=verbose | tee .sisyphus/evidence/task-6-project-workunit-crud.log`
    Expected: PASS; manual runtime CRUD procedures are family-specific, use CRUD verbs, and project/work-unit delete is logical only
    Evidence: .sisyphus/evidence/task-6-project-workunit-crud.log

  Scenario: Number min/max and JSON compatibility are enforced at runtime CRUD boundary
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/runtime-fact-crud-logical-delete.test.ts --testNamePattern="min/max|json compatibility|exact key-shape" --reporter=verbose | tee .sisyphus/evidence/task-6-project-workunit-validation.log`
    Expected: PASS; invalid min/max and incompatible JSON writes fail with explicit errors
    Evidence: .sisyphus/evidence/task-6-project-workunit-validation.log
  ```

  **Commit**: YES | Message: `feat(api): migrate project and work-unit fact crud` | Files: `packages/api/src/**`, `packages/workflow-engine/src/**`, `apps/web/src/routes/**`

- [x] 7. Implement workflow-context manual runtime CRUD and MCP progressive-disclosure model

  **What to do**: Add runtime workflow-context CRUD procedures and services, expose them on workflow execution detail as the canonical manual CRUD home, and redesign MCP read/write around `readItemId` / `writeItemId`, mode-driven reads, `queryParam`, `limit`, and structured runtime errors. Keep workflow-context `remove` vs `delete` distinction only here.
  **Must NOT do**: Do not make step execution detail the primary manual CRUD home. Do not leave definition-id based read contracts in place.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this is the most cross-cutting runtime-surface task.
  - Skills: [`effect-best-practices`] - Reason: tagged errors and service wiring must remain coherent.
  - Omitted: [`opencode-sdk`] - Reason: no harness implementation changes beyond MCP contract/runtime service.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T8-T11 | Blocked By: T3, T5

  **References**:
  - `packages/contracts/src/mcp/tools.ts`
  - `packages/workflow-engine/src/services/runtime/agent-step-context-read-service.ts`
  - `packages/workflow-engine/src/services/runtime/agent-step-context-write-service.ts`
  - `packages/contracts/src/agent-step/runtime.ts`
  - `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/api/src/tests/routers/runtime-workflow-context-fact-crud.test.ts`
  - [ ] `bunx vitest run packages/contracts/src/tests/mcp-progressive-disclosure-contract.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Workflow-context manual CRUD supports create/update/remove/delete correctly
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/runtime-workflow-context-fact-crud.test.ts --reporter=verbose | tee .sisyphus/evidence/task-7-workflow-context-crud.log`
    Expected: PASS; workflow-context CRUD exists at runtime, `remove` vs `delete` are distinct, and direct project/work-unit mutation bypass is rejected
    Evidence: .sisyphus/evidence/task-7-workflow-context-crud.log

  Scenario: MCP progressive-disclosure reads and writes are item-id scoped
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/mcp-progressive-disclosure-contract.test.ts --reporter=verbose | tee .sisyphus/evidence/task-7-mcp-progressive.log`
    Expected: PASS; reads are mode-driven by `readItemId`, writes target `writeItemId`, invalid modes/queryParam produce structured errors, and no input requires `stepExecutionId`
    Evidence: .sisyphus/evidence/task-7-mcp-progressive.log
  ```

  **Commit**: YES | Message: `feat(runtime): add workflow context crud and mcp progressive reads` | Files: `packages/contracts/src/**`, `packages/api/src/**`, `packages/workflow-engine/src/**`, `apps/web/src/routes/**`

- [x] 8. Redefine invoke template/state handling around template-only draft specs

  **What to do**: Redefine `work_unit_draft_spec_fact` as a closed template-only payload with stable draft keys, grouped artifact slots/files, and no created runtime ids. Move created work-unit/fact/artifact instance ids and the fully resolved frozen values into invoke state/materialization mappings only. Preserve template reuse across multiple invoke runs.
  **Must NOT do**: Do not persist created runtime ids back into the template. Do not keep flat artifact arrays.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: invoke semantics and persistence mappings must be exact.
  - Skills: [`effect-best-practices`] - Reason: state transitions and payload schemas require disciplined typing.
  - Omitted: [`bmad-quick-dev`] - Reason: this is not freeform implementation; it is contract-led runtime work.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T11 | Blocked By: T3, T7

  **References**:
  - `packages/workflow-engine/src/services/invoke-propagation-service.ts`
  - `packages/workflow-engine/src/tests/runtime/runtime-invoke-workunit-start.test.ts`
  - `packages/workflow-engine/src/tests/runtime/runtime-invoke-completion.test.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/invoke-draft-spec-template-state.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Draft spec stays template-only and invoke state stores materialization results
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/invoke-draft-spec-template-state.test.ts --reporter=verbose | tee .sisyphus/evidence/task-8-invoke-template-state.log`
    Expected: PASS; templates contain no created runtime ids, invoke state stores frozen run values and created runtime mappings
    Evidence: .sisyphus/evidence/task-8-invoke-template-state.log

  Scenario: Reusing one draft-spec template across multiple invokes remains safe
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/invoke-draft-spec-template-state.test.ts --testNamePattern="template reuse|multiple invokes|distinct materialization state" --reporter=verbose | tee .sisyphus/evidence/task-8-invoke-template-reuse.log`
    Expected: PASS; multiple invoke runs reuse the same template while writing distinct invoke-state materialization results
    Evidence: .sisyphus/evidence/task-8-invoke-template-reuse.log
  ```

  **Commit**: YES | Message: `feat(invoke): make draft spec template-only` | Files: `packages/contracts/src/**`, `packages/workflow-engine/src/**`

- [x] 9. Migrate legacy readers/consumers and harden all runtime boundaries

  **What to do**: Audit and update all readers/evaluators/consumers that still expect legacy envelopes or flat draft-spec payloads: detail views, action runtime, command services, invoke readers, form/context consumers, and any compatibility fallbacks. Ensure write hardening and read compatibility land together.
  **Must NOT do**: Do not harden writers only and leave readers stale. Do not leave raw `factInstanceId` envelopes as the canonical runtime expectation.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this is the no-drift closure task.
  - Skills: [`effect-best-practices`] - Reason: consumers must stay consistent across layered services.
  - Omitted: [`web-design-guidelines`] - Reason: this is not a visual task.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T11 | Blocked By: T3, T4, T7, T8

  **References**:
  - `packages/workflow-engine/src/services/step-execution-detail-service.ts`
  - `packages/workflow-engine/src/services/workflow-execution-step-command-service.ts`
  - `packages/workflow-engine/src/services/action-step-runtime-service.ts`
  - `packages/workflow-engine/src/services/form-step-execution-service.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/bound-fact-compatibility.test.ts`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/artifact-snapshot-fact-semantics.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Legacy wrapped envelopes normalize correctly for readers and evaluators
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/bound-fact-compatibility.test.ts --reporter=verbose | tee .sisyphus/evidence/task-9-bound-compat.log`
    Expected: PASS; `{ factInstanceId, value }` and approved legacy shapes remain readable while canonical writes emit `{ instanceId, value }`
    Evidence: .sisyphus/evidence/task-9-bound-compat.log

  Scenario: No runtime consumer still expects flat draft-spec or friendly slot keys
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/bound-fact-compatibility.test.ts packages/workflow-engine/src/tests/runtime/artifact-snapshot-fact-semantics.test.ts --testNamePattern="draft spec consumer|slotDefinitionId persistence|friendly slot key|flat draft spec" --reporter=verbose | tee .sisyphus/evidence/task-9-consumer-migration.log`
    Expected: PASS; all relevant readers/consumers understand the new grouped template/state and canonical slotDefinitionId persistence
    Evidence: .sisyphus/evidence/task-9-consumer-migration.log
  ```

  **Commit**: YES | Message: `fix(runtime): migrate fact consumers to canonical model` | Files: `packages/workflow-engine/src/**`, `packages/api/src/**`

- [x] 10. Implement manual runtime CRUD dialogs and page flows on existing runtime surfaces

  **What to do**: Upgrade the existing runtime pages to the locked UI matrix. Keep project fact CRUD on `projects.$projectId.facts.$factDefinitionId`, work-unit fact CRUD on `projects.$projectId.work-units.$projectWorkUnitId.facts.$factDefinitionId`, and add workflow-context CRUD as a context section on workflow execution detail. Use dialogs by default: cardinality-one direct set/replace dialog; cardinality-many instance list + per-instance dialogs. Use kind-specific structured dialogs for `bound_fact`, `work_unit`, `artifact_snapshot_fact`, `workflow_ref_fact`, and `work_unit_draft_spec_fact`.
  **Must NOT do**: Do not introduce a broad new runtime CRUD UI architecture. Do not use generic JSON-first dialogs for special fact families.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: this is the one major runtime-surface/UI integration task.
  - Skills: [`vercel-react-best-practices`, `web-design-guidelines`] - Reason: dialog/data-fetch patterns must stay performant and consistent.
  - Omitted: [`vercel-composition-patterns`] - Reason: not a component-library redesign.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: T11 | Blocked By: T6, T7, T8

  **References**:
  - `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx`
  - `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.facts.$factDefinitionId.tsx`
  - `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`
  - `apps/web/src/components/ui/dialog.tsx`
  - `apps/web/src/components/ui/sheet.tsx`
  - `apps/web/src/features/workflow-editor/dialogs.tsx`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run apps/web/src/tests/runtime/runtime-fact-dialogs.test.tsx`
  - [ ] `bunx vitest run apps/web/src/tests/runtime/workflow-context-fact-crud-section.test.tsx`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Manual runtime fact dialogs follow the locked cardinality matrix
    Tool: Bash
    Steps: run `bunx vitest run apps/web/src/tests/runtime/runtime-fact-dialogs.test.tsx --reporter=verbose | tee .sisyphus/evidence/task-10-runtime-dialogs.log`
    Expected: PASS; cardinality-one uses direct set/replace dialog, cardinality-many uses list + per-instance dialogs, and special kinds use structured dialogs
    Evidence: .sisyphus/evidence/task-10-runtime-dialogs.log

  Scenario: Workflow execution detail hosts workflow-context CRUD as a context section
    Tool: Bash
    Steps: run `bunx vitest run apps/web/src/tests/runtime/workflow-context-fact-crud-section.test.tsx --reporter=verbose | tee .sisyphus/evidence/task-10-workflow-context-ui.log`
    Expected: PASS; workflow execution detail is the canonical manual CRUD home for workflow-context facts and step execution pages do not become the primary CRUD surface
    Evidence: .sisyphus/evidence/task-10-workflow-context-ui.log
  ```

  **Commit**: YES | Message: `feat(web): add plan-b runtime fact dialogs` | Files: `apps/web/src/routes/**`, `apps/web/src/components/**`

- [x] 11. Run no-bypass audit, regression, and Plan A compatibility proof

  **What to do**: Prove that all approved fact mutation surfaces now use the canonical runtime model and shared runtime enforcement where required, that workflow-context mediation remains intact, and that Plan A action/branch flows still pass. Include exact regression commands and evidence.
  **Must NOT do**: Do not leave compatibility claims as prose. Do not skip Plan A reruns.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this is a broad regression and audit wave.
  - Skills: [`effect-best-practices`] - Reason: audit assertions must remain aligned with service boundaries.
  - Omitted: [`review-work`] - Reason: the plan already defines the exact review wave below.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification Wave | Blocked By: T6-T10

  **References**:
  - `packages/api/src/routers/project-runtime.ts`
  - `packages/workflow-engine/src/services/runtime/agent-step-context-write-service.ts`
  - `packages/workflow-engine/src/services/invoke-propagation-service.ts`
  - `.sisyphus/plans/l3-plan-a-action-branch-gates.md`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/contracts/src/tests/l3-plan-a-action-branch-contracts.test.ts`
  - [ ] `bunx vitest run packages/api/src/tests/routers/action-branch-plan-a-routers.test.ts`
  - [ ] `bunx vitest run packages/db/src/tests/repository/l3-plan-a-action-branch-repositories.test.ts`
  - [ ] `bunx vitest run packages/db/src/tests/schema/l3-plan-a-action-branch-schema.test.ts`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/action-step-runtime-services.test.ts`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/branch-runtime-services.test.ts`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-invoke-workunit-start.test.ts`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-invoke-completion.test.ts`
  - [ ] `bun run test`
  - [ ] `bun run build`

  **QA Scenarios**:
  ```
  Scenario: Plan A runtime branches/actions remain green after Plan B
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/l3-plan-a-action-branch-contracts.test.ts packages/api/src/tests/routers/action-branch-plan-a-routers.test.ts packages/db/src/tests/repository/l3-plan-a-action-branch-repositories.test.ts packages/db/src/tests/schema/l3-plan-a-action-branch-schema.test.ts packages/workflow-engine/src/tests/runtime/action-step-runtime-services.test.ts packages/workflow-engine/src/tests/runtime/branch-runtime-services.test.ts packages/workflow-engine/src/tests/runtime/runtime-invoke-workunit-start.test.ts packages/workflow-engine/src/tests/runtime/runtime-invoke-completion.test.ts --reporter=verbose | tee .sisyphus/evidence/task-11-plan-a-regression.log`
    Expected: PASS; Plan A action/branch/invoke behavior remains compatible after Plan B hardening
    Evidence: .sisyphus/evidence/task-11-plan-a-regression.log

  Scenario: No approved write path bypasses canonical runtime enforcement
    Tool: Bash
    Steps: run `bun run test -- --reporter=verbose | tee .sisyphus/evidence/task-11-no-bypass.log`
    Expected: PASS; all approved mutation surfaces pass and any bypass fixture fails loudly
    Evidence: .sisyphus/evidence/task-11-no-bypass.log
  ```

  **Commit**: YES | Message: `test(facts): prove plan-b regression closure` | Files: `packages/**`, `apps/web/src/tests/**`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle

  **QA Scenarios**:
  ```
  Scenario: Oracle verifies implementation against this plan
    Tool: Bash
    Steps: run `bun run check-types && bun run test | tee .sisyphus/evidence/f1-plan-compliance.log`
    Expected: Oracle review packet has passing type/test evidence and confirms task-by-task compliance against this plan
    Evidence: .sisyphus/evidence/f1-plan-compliance.log
  ```
- [x] F2. Code Quality Review — unspecified-high

  **QA Scenarios**:
  ```
  Scenario: Code quality review packet is complete
    Tool: Bash
    Steps: run `bun run build | tee .sisyphus/evidence/f2-code-quality.log`
    Expected: Build passes and reviewer can inspect final code paths, error handling, and layering without unresolved quality defects
    Evidence: .sisyphus/evidence/f2-code-quality.log
  ```
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)

  **QA Scenarios**:
  ```
  Scenario: Runtime CRUD UI/manual QA is exercised end-to-end
    Tool: Playwright
    Steps: open the project runtime fact detail pages and workflow execution detail page, execute create/update/delete/remove flows for representative fact families, and capture screenshots/logs
    Expected: All manual runtime CRUD surfaces behave according to the plan, with correct dialogs, validation, and page ownership
    Evidence: .sisyphus/evidence/f3-real-manual-qa.log
  ```
- [x] F4. Scope Fidelity Check — deep

  **QA Scenarios**:
  ```
  Scenario: Final scope check confirms no forbidden expansion landed
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/fact-unification-runtime-contracts.test.ts packages/contracts/src/tests/mcp-progressive-disclosure-contract.test.ts packages/api/src/tests/routers/runtime-fact-crud-logical-delete.test.ts packages/api/src/tests/routers/runtime-workflow-context-fact-crud.test.ts --reporter=verbose | tee .sisyphus/evidence/f4-scope-fidelity.log`
    Expected: Final review confirms the work stayed inside Plan B scope and did not re-open methodology thinning or broad UI redesign
    Evidence: .sisyphus/evidence/f4-scope-fidelity.log
  ```

## Commit Strategy
- Commit 1: contracts/schema lock (`packages/contracts`, `packages/db/src/schema`, repo interfaces)
- Commit 2: shared runtime CRUD/orchestration + artifact/work-unit semantics (`packages/workflow-engine`, repo implementations)
- Commit 3: runtime procedures + MCP/runtime boundary redesign (`packages/api`, `packages/workflow-engine`, `packages/contracts`)
- Commit 4: web runtime CRUD surfaces/dialogs (`apps/web`)
- Commit 5: audit/regression closure (tests only if practical; otherwise combine with previous wave)
- Keep commits aligned to task clusters above; do not mix broad UI changes into contract-only commits.

## Success Criteria
- Every fact family and runtime surface follows the locked canonical semantics without new judgment calls by the executor.
- Manual runtime CRUD exists and is discoverable on the correct runtime pages for project facts, work-unit facts, and workflow-context facts.
- MCP/agent runtime interactions are step-scoped, item-id based, mode-driven, and return structured errors.
- `work_unit_draft_spec_fact` is template-only, invoke state is frozen-per-run, and legacy compatibility remains explicit.
- Work-unit identity, artifact path semantics, slot-definition persistence, and Plan A compatibility are all proven by executable tests.
