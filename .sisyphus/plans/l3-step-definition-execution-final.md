# L3 Step Definition And Execution Final Plan

## TL;DR
> **Summary**: Implement the fully locked L3 step-definition and execution architecture across all six step types using workflow-centric design-time services, execution-centric runtime services, shared context/lifecycle/progression boundaries, and a harness-agnostic Agent runtime backed by an OpenCode adapter.
> **Deliverables**:
> - L3 design-time schema, validation rules, and workflow publish invariants (`entryStepId`, typed step contracts, context-fact authoring)
> - L3 runtime schema, repositories, shared services, and typed step runtime services
> - Thin API procedures and step/workflow execution pages aligned with the locked architecture
> - Common harness contracts in `packages/agent-runtime` and an OpenCode adapter with one server per active Agent step execution
> - Automated verification for lifecycle, context facts, MCP tools, timeline rendering, and page behavior
> **Effort**: XL
> **Parallel**: YES - 4 waves
> **Critical Path**: 1 → 2/3 → 4/5 → 6/7/8 → 9/10 → 11

## Context
### Original Request
- Freeze the full L3 architecture and generate the final decision-complete plan/spec.
- Cover all six step types: `form`, `agent`, `action`, `invoke`, `branch`, `display`.
- Include pages, procedures, services, DB tables, harness/OpenCode/MCP integration, and edge-case guardrails.
- Keep this architecture separate from the later seed-data plan.

### Interview Summary
- All six step types are locked at design-time and runtime.
- Design-time remains workflow-centric; runtime remains execution-centric.
- Public procedures are typed and thin; each procedure calls exactly one top-level service.
- Shared context concerns were split into `StepContextQueryService`, `StepContextMutationService`, and `StepOutputMaterializationService`.
- L1/L2 transition/workflow activation is separate from L3 step activation; first step execution is created only from the workflow execution page.
- Workflow definitions get nullable `entryStepId`, validated at publish time rather than creation time.
- Agent runtime depends on common harness contracts in `packages/agent-runtime`; OpenCode lives only behind the adapter boundary.
- Current verified OpenCode constraint: MCP config is fixed at `createOpencode(...)` time, so current implementation uses one OpenCode server per active Agent step execution.

### Metis Review (gaps addressed)
- Freeze step lifecycle scope to `active | completed | failed | superseded` in current implementation scope.
- Keep OpenCode-specific constraints in the adapter layer only; do not leak SDK details into `packages/workflow-engine`.
- Add explicit transaction ownership for multi-aggregate step commands.
- Add explicit publish-time workflow validation for nullable `entryStepId`.
- Add non-goals to prevent L3 from expanding into pause/resume/cancel orchestration, generalized MCP registration, or seed-data authoring in this slice.

## Work Objectives
### Core Objective
Implement the locked L3 architecture so design-time authoring, runtime step execution, context-fact propagation, and Agent harness integration all follow one coherent boundary model: typed step services for semantics, shared services for invariants, thin procedures for transport, and narrow repositories for persistence.

### Deliverables
- Design-time workflow-step schema and typed child tables in `packages/db/src/schema/methodology.ts` (or L3 methodology schema split) plus methodology-engine validation for publish-time invariants.
- Runtime step execution schema and typed child tables in `packages/db/src/schema/runtime.ts` plus repository implementations/exports.
- Shared L3 runtime services in `packages/workflow-engine`:
  - `StepExecutionLifecycleService`
  - `StepProgressionService`
  - `StepContextQueryService`
  - `StepContextMutationService`
  - `StepOutputMaterializationService`
  - `GitWorkspaceQueryService`
  - `StepReadModelService`
  - `StepExecutionDetailService`
  - `WorkflowExecutionDetailService`
  - `StepExecutionTransactionService`
- Typed design-time services and typed runtime services for all six step types.
- Common harness contracts in `packages/agent-runtime` and OpenCode adapter services under `packages/agent-runtime/src/opencode/**`.
- Shared Chiron MCP transport in `apps/server` using `@hono/mcp` and `@modelcontextprotocol/sdk`, wired to the Agent runtime/domain services.
- Thin API procedures in `packages/api` for design-time authoring and runtime execution/detail flows.
- Web workflow-editor enhancements plus workflow execution / step execution runtime pages in `apps/web`.

### Definition of Done (verifiable conditions with commands)
- `bunx vitest run packages/methodology-engine/src/tests/validation/l3-publish-validation.test.ts`
- `bunx vitest run packages/methodology-engine/src/tests/l3/l3-step-definition-roundtrip.test.ts`
- `bunx vitest run packages/db/src/tests/schema/l3-step-schema.test.ts`
- `bunx vitest run packages/db/src/tests/repository/l3-step-runtime-repositories.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-step-shared-services.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-step-type-services.test.ts`
- `bunx vitest run packages/agent-runtime/src/tests/opencode/opencode-lifecycle.test.ts`
- `bunx vitest run packages/api/src/tests/routers/project-runtime-l3.test.ts`
- `bunx vitest run apps/web/src/tests/routes/l3-step-execution.test.tsx`
- `bunx playwright test tests/e2e/l3-step-execution.spec.ts`
- `bun run check-types`

### Must Have
- Workflow definitions may be drafted with `entryStepId = null`, but publish must reject null or cross-workflow entry pointers.
- Starting a transition / choosing a workflow creates only transition/workflow executions; first step execution is created only from the workflow execution page.
- Only the current/first needed step execution is created eagerly; later steps are created on explicit activation/progression.
- Shared context fact semantics are centralized in shared services; step-type services do not invent their own fact write model.
- Agent runtime depends only on common harness contracts; OpenCode SDK remains confined to `packages/agent-runtime` adapter code.
- One OpenCode server is created per active Agent step execution in current implementation scope.
- `propose_context_write` is synchronous validate-and-apply in current implementation scope and returns `approved` on success; failures are structured errors.
- Display is context-facts-only and remains read-only except for its idempotent completion action.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No public generic `saveWorkflowStep` procedure.
- No god `StepService`, god `StepContextService`, or god `L3Repository`.
- No OpenCode SDK imports in `packages/workflow-engine` or `packages/api`.
- No generic persisted Agent interaction/event log table in current scope.
- No `agent_step_execution_segments` table.
- No pause/resume/cancel/timed_out/aborted lifecycle expansion in current implementation scope.
- No automatic first-step creation during Guidance/State-Machine workflow start.
- No seed-data authoring in this plan; seed additions are a follow-up plan.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after with architecture-first TDD at schema/service/router/page layers.
- QA policy: every task below includes exact commands and evidence paths.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Locked Architecture Decisions
1. **Workflow start vs step start**: transition/workflow creation and first-step activation are intentionally separate.
2. **Entry-step invariant**: nullable `entryStepId` on workflow definition; required and validated at publish time.
3. **Shared context split**: query, mutation, and output-materialization are separate shared services.
4. **Git truth seam**: repo-state inspection for Action artifact behavior lives in shared `GitWorkspaceQueryService`, not inside Action services or repositories.
5. **Transaction seam**: multi-aggregate L3 commands run through `StepExecutionTransactionService`.
6. **Agent harness boundary**: common harness contracts in `packages/agent-runtime`; OpenCode adapter only behind that seam.
7. **OpenCode server model**: one OpenCode server per active Agent step execution in current implementation scope.
8. **MCP transport boundary**: shared Chiron MCP HTTP transport lives in `apps/server` and is implemented with `@hono/mcp` + `@modelcontextprotocol/sdk`; workflow-engine owns only the domain services invoked by those tools.
9. **Canonical runtime naming**: `getWorkflowExecutionDetail`, `getStepExecutionDetail`, typed step mutations, and canonical cross-step names supersede older historical `getRuntime*` discussion names.

### Ownership Matrix
- `packages/methodology-engine` — design-time workflow/step authoring services and publish validation
- `packages/workflow-engine` — runtime shared services, typed step runtime services, read models, progression/lifecycle/context orchestration
- `packages/agent-runtime` — common harness contracts plus OpenCode adapter implementation
- `packages/db` — design-time/runtime schema, migrations, repositories, transaction boundary plumbing
- `packages/api` — thin typed procedures only
- `apps/web` — workflow editor, workflow execution detail, step execution detail, and Agent runtime UI

### Procedure → Service → Repository Boundary
- Procedure rule: auth/validation/error mapping only; call exactly one top-level service method.
- Top-level service rule: may compose multiple shared services and repositories through Effect layers.
- Repository rule: narrow aggregate/invariant seams only; authoritative L1/L2 runtime repositories are reused where L3 commands update existing runtime stores.

### Parallel Execution Waves
Wave 1: design-time contracts/schema/validation + runtime core schema/repositories
Wave 2: shared services + typed step services + harness contracts
Wave 3: OpenCode adapter + API procedures
Wave 4: web surfaces + end-to-end verification + cleanup

### Dependency Matrix (full, all tasks)
- 1 blocks 2-11
- 2 blocks 4-11
- 3 blocks 4-11
- 4 blocks 6-11
- 5 blocks 6-11
- 6 blocks 9-11
- 7 blocks 9-11
- 8 blocks 9-11
- 9 blocks 10-11
- 10 blocks 11

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → deep / unspecified-high
- Wave 2 → 3 tasks → deep
- Wave 3 → 2 tasks → deep / unspecified-high
- Wave 4 → 3 tasks → unspecified-high / visual-engineering

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Freeze L3 contracts and publish invariants

  **What to do**: Add/lock typed contracts for L3 step definitions, runtime step detail payloads, Agent MCP payloads, and shared lifecycle enums in `packages/contracts/src/**`. Add methodology-engine validation enforcing nullable-in-draft but required-on-publish `entryStepId`, same-workflow entry-step ownership, and workflow publish rejection when entry step is missing/invalid. Add failing tests first, then implement until green.
  **Must NOT do**: Do not implement repositories, services, or UI in this task. Do not allow older historical procedure names to leak into the new contracts.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: freezes the downstream architecture and validation surface.
  - Skills: [`effect-solutions`, `effect-best-practices`] — Reason: contracts and publish validation must align with typed service/error patterns.
  - Omitted: [`opencode-sdk`] — Reason: no harness adapter work yet.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-11 | Blocked By: none

  **References**:
  - Plan: `.sisyphus/plans/l3-step-definition-execution-final.md`
  - Plan pattern: `.sisyphus/plans/unified-l1-l2-runtime-slice.md`
  - Existing validation seam: `packages/methodology-engine/src/validation.ts`
  - Existing contracts seams: `packages/contracts/src/methodology/**`, `packages/contracts/src/runtime/**`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/methodology-engine/src/tests/validation/l3-publish-validation.test.ts`
  - [ ] `bunx vitest run packages/methodology-engine/src/tests/l3/l3-step-definition-roundtrip.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Publish rejects invalid entry step
    Tool: Bash
    Steps: run `bunx vitest run packages/methodology-engine/src/tests/validation/l3-publish-validation.test.ts --reporter=verbose | tee .sisyphus/evidence/task-1-l3-publish-validation.log`
    Expected: PASS; draft save with null `entryStepId` passes, publish with null or foreign `entryStepId` fails deterministically
    Evidence: .sisyphus/evidence/task-1-l3-publish-validation.log

  Scenario: Step-definition roundtrip stays stable
    Tool: Bash
    Steps: run `bunx vitest run packages/methodology-engine/src/tests/l3/l3-step-definition-roundtrip.test.ts --reporter=verbose | tee .sisyphus/evidence/task-1-l3-roundtrip.log`
    Expected: PASS; all six step types serialize and reload with stable discriminator/ordering/contracts
    Evidence: .sisyphus/evidence/task-1-l3-roundtrip.log
  ```

  **Commit**: YES | Message: `feat(l3): lock contracts and publish invariants` | Files: `packages/contracts/src/**`, `packages/methodology-engine/src/validation.ts`, `packages/methodology-engine/src/tests/**`

- [x] 2. Add L3 design-time schema and repositories

  **What to do**: Add typed design-time persistence for all six step types plus workflow-level `entryStepId` in methodology schema. Implement or extend repositories for generic step shells, edges, and typed child tables, including Agent context-entry child tables and Display tabs/blocks. Add schema/repository tests for creation, deletion, and replacement of entry-step pointer under draft rules.
  **Must NOT do**: Do not implement runtime tables or runtime services here. Do not encode publish rules in DB-only logic.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-solutions`] — Reason: repository/layer seams should match the locked architecture.
  - Omitted: [`opencode-sdk`] — Reason: no harness work here.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4-11 | Blocked By: 1

  **References**:
  - Plan: `.sisyphus/plans/l3-step-definition-execution-final.md`
  - Existing schema: `packages/db/src/schema/methodology.ts`
  - Existing repository patterns: `packages/db/src/**`, `packages/methodology-engine/src/**`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/db/src/tests/schema/l3-design-time-schema.test.ts`
  - [ ] `bunx vitest run packages/db/src/tests/repository/l3-design-time-repositories.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Design-time schema lock
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/schema/l3-design-time-schema.test.ts --reporter=verbose | tee .sisyphus/evidence/task-2-l3-design-schema.log`
    Expected: PASS; output confirms workflow `entryStepId`, typed step tables, and no per-step entry boolean drift
    Evidence: .sisyphus/evidence/task-2-l3-design-schema.log

  Scenario: Design-time repository integrity
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/l3-design-time-repositories.test.ts --reporter=verbose | tee .sisyphus/evidence/task-2-l3-design-repos.log`
    Expected: PASS; step create/update/delete and edge cleanup remain workflow-consistent
    Evidence: .sisyphus/evidence/task-2-l3-design-repos.log
  ```

  **Commit**: YES | Message: `feat(l3): add design-time step schema and repositories` | Files: `packages/db/src/schema/methodology.ts`, `packages/db/src/tests/schema/**`, `packages/db/src/tests/repository/**`, `packages/db/src/**repository*`

- [x] 3. Add L3 runtime schema and repositories

  **What to do**: Add `step_executions`, typed runtime child tables for Form/Agent/Action/Invoke/Branch, and supporting runtime repository implementations. Reuse authoritative L1/L2 repositories for project facts, work-unit facts, artifacts, workflow executions, transition executions, and project work units where L3 commands mutate existing runtime aggregates. Add repo tests for first-step creation, branch chosen-route persistence, action row lineage, invoke first-action uniqueness, and Agent proposal persistence.
  **Must NOT do**: Do not add generic agent interaction logs, step segments, or step pause/resume tables.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-solutions`, `effect-best-practices`] — Reason: repository and transaction seams must stay composable.
  - Omitted: [`opencode-sdk`] — Reason: no adapter implementation yet.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5-11 | Blocked By: 1

  **References**:
  - Plan: `.sisyphus/plans/l3-step-definition-execution-final.md`
  - Existing runtime schema/repo patterns: `packages/db/src/schema/runtime.ts`, `packages/db/src/runtime-repositories/**`
  - L1/L2 runtime plan: `.sisyphus/plans/unified-l1-l2-runtime-slice.md`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/db/src/tests/schema/l3-runtime-schema.test.ts`
  - [ ] `bunx vitest run packages/db/src/tests/repository/l3-step-runtime-repositories.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Runtime schema lock
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/schema/l3-runtime-schema.test.ts --reporter=verbose | tee .sisyphus/evidence/task-3-l3-runtime-schema.log`
    Expected: PASS; output confirms `step_executions`, typed child tables, and no forbidden Agent interaction tables
    Evidence: .sisyphus/evidence/task-3-l3-runtime-schema.log

  Scenario: Runtime repository invariants
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/l3-step-runtime-repositories.test.ts --reporter=verbose | tee .sisyphus/evidence/task-3-l3-runtime-repos.log`
    Expected: PASS; output confirms first-step creation, invoke launch/skip uniqueness, branch chosen-route persistence, and Agent approved-write rows
    Evidence: .sisyphus/evidence/task-3-l3-runtime-repos.log
  ```

  **Commit**: YES | Message: `feat(l3): add runtime step schema and repositories` | Files: `packages/db/src/schema/runtime.ts`, `packages/db/src/runtime-repositories/**`, `packages/db/src/tests/schema/**`, `packages/db/src/tests/repository/**`

- [x] 4. Implement workflow-centric design-time services and procedures

  **What to do**: Implement `WorkflowEditorReadService`, `WorkflowTopologyMutationService`, `WorkflowStepMutationService.deleteWorkflowStep`, `StepDefinitionResolverService`, and all six typed design-time step services in `packages/methodology-engine`. Wire thin design-time procedures in `packages/api` so the left-rail grid opens specific step dialogs and those dialogs call typed save procedures only. Ensure `saveAgentStep` persists the full Agent blob atomically and no public generic `saveWorkflowStep` exists.
  **Must NOT do**: Do not leak runtime semantics into methodology-engine. Do not expose a generic save API that bypasses typed step validation.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-solutions`, `effect-best-practices`] — Reason: service boundaries and layer composition must be clean from the start.
  - Omitted: [`hono`] — Reason: this task is service/procedure ownership, not transport nuance.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9-11 | Blocked By: 2

  **References**:
  - Plan: `.sisyphus/plans/l3-step-definition-execution-final.md`
  - Existing methodology-engine patterns: `packages/methodology-engine/src/**`
  - Existing API router patterns: `packages/api/src/routers/**`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/methodology-engine/src/tests/l3/l3-design-time-services.test.ts`
  - [ ] `bunx vitest run packages/api/src/tests/routers/l3-design-time-router.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Typed step saves only
    Tool: Bash
    Steps: run `bunx vitest run packages/methodology-engine/src/tests/l3/l3-design-time-services.test.ts --reporter=verbose | tee .sisyphus/evidence/task-4-l3-design-services.log`
    Expected: PASS; typed save methods exist for all six step types and no public generic `saveWorkflowStep` path remains
    Evidence: .sisyphus/evidence/task-4-l3-design-services.log

  Scenario: Thin design-time router ownership
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/l3-design-time-router.test.ts --reporter=verbose | tee .sisyphus/evidence/task-4-l3-design-router.log`
    Expected: PASS; each procedure calls exactly one top-level methodology/design-time service method
    Evidence: .sisyphus/evidence/task-4-l3-design-router.log
  ```

  **Commit**: YES | Message: `feat(l3): add workflow-centric design-time services` | Files: `packages/methodology-engine/src/**`, `packages/api/src/routers/**`, `packages/api/src/tests/routers/**`

- [x] 5. Implement shared runtime services and transaction seam

  **What to do**: Implement shared runtime services in `packages/workflow-engine`: `StepExecutionLifecycleService`, `StepProgressionService`, `StepContextQueryService`, `StepContextMutationService`, `StepOutputMaterializationService`, `StepReadModelService`, `StepExecutionDetailService`, `WorkflowExecutionDetailService`, and `StepExecutionTransactionService`. Lock first-step activation to workflow execution page only, enforce stale `contextHandle` invalidation, and centralize multi-aggregate atomicity under the transaction seam.
  **Must NOT do**: Do not implement OpenCode-specific logic here. Do not collapse query/mutation/materialization back into one context god service. Do not bury git truth inspection inside Action services or repositories.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-solutions`, `effect-best-practices`, `effect-review`] — Reason: this is the highest-risk boundary work in the whole slice.
  - Omitted: [`opencode-sdk`] — Reason: harness adapter remains separate.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9-11 | Blocked By: 3

  **References**:
  - Plan: `.sisyphus/plans/l3-step-definition-execution-final.md`
  - L1/L2 runtime service model: `.sisyphus/plans/unified-l1-l2-runtime-slice.md`
  - Existing workflow-engine patterns: `packages/workflow-engine/src/**`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-step-shared-services.test.ts`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-context-services.test.ts`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-git-workspace-service.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Shared service boundary lock
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-step-shared-services.test.ts --reporter=verbose | tee .sisyphus/evidence/task-5-l3-shared-services.log`
    Expected: PASS; output proves one-step activation, progression ownership, and no OpenCode imports in workflow-engine
    Evidence: .sisyphus/evidence/task-5-l3-shared-services.log

  Scenario: Context query/mutation/materialization split
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-context-services.test.ts --reporter=verbose | tee .sisyphus/evidence/task-5-l3-context-services.log`
    Expected: PASS; output proves query/write/materialization are separate shared services with deterministic conflict behavior
    Evidence: .sisyphus/evidence/task-5-l3-context-services.log

  Scenario: Git workspace truth is shared and deterministic
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-git-workspace-service.test.ts --reporter=verbose | tee .sisyphus/evidence/task-5-l3-git-workspace.log`
    Expected: PASS; output proves repo-relative file validation, committed-state checks, and commit/blob identity resolution live in `GitWorkspaceQueryService`
    Evidence: .sisyphus/evidence/task-5-l3-git-workspace.log
  ```

  **Commit**: YES | Message: `feat(l3): add shared runtime services and transaction seam` | Files: `packages/workflow-engine/src/services/**`, `packages/workflow-engine/src/tests/runtime/**`

- [x] 6. Implement typed runtime services for Form, Branch, and Display

  **What to do**: Implement `FormStepRuntimeService`, `BranchStepRuntimeService`, and `DisplayStepRuntimeService`. Form must handle draft/submission/materialization correctly; Branch must do evaluate+commit atomically and persist only chosen-route snapshots; Display must remain read-only and complete idempotently. Provide type-specific detail payload methods used by `StepExecutionDetailService`.
  **Must NOT do**: Do not let Form write facts outside shared materialization rules. Do not persist live per-route branch evaluation rows. Do not add Display mutations beyond idempotent completion.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-solutions`, `effect-best-practices`] — Reason: these services must compose shared boundaries correctly.
  - Omitted: [`opencode-sdk`] — Reason: not agent-specific.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10-11 | Blocked By: 5

  **References**:
  - Plan: `.sisyphus/plans/l3-step-definition-execution-final.md`
  - Existing workflow-engine patterns: `packages/workflow-engine/src/services/**`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-form-branch-display-services.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Form/Branch/Display semantic coverage
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-form-branch-display-services.test.ts --reporter=verbose | tee .sisyphus/evidence/task-6-l3-form-branch-display.log`
    Expected: PASS; output proves Form draft vs submit behavior, Branch evaluate+commit TOCTOU guard, and Display double-submit idempotency
    Evidence: .sisyphus/evidence/task-6-l3-form-branch-display.log
  ```

  **Commit**: YES | Message: `feat(l3): add form branch and display runtime services` | Files: `packages/workflow-engine/src/services/**`, `packages/workflow-engine/src/tests/runtime/**`

- [x] 7. Implement typed runtime services for Action and Invoke

  **What to do**: Implement `ActionStepRuntimeService` and `InvokeStepRuntimeService` with deterministic approval/execution/retry/launch/skip semantics. Action must enforce step-level approval before group execution, deterministic child/result rollups, and selective retry lineage. Invoke must enforce unique first durable action per child target, parent-child relation persistence, and transactional launch/skip handling against authoritative runtime repositories.
  **Must NOT do**: Do not let Action or Invoke procedures orchestrate repositories directly. Do not leave first-action races or mixed retry semantics implicit.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-solutions`, `effect-best-practices`, `effect-review`] — Reason: these are the trickiest multi-aggregate step semantics.
  - Omitted: [`opencode-sdk`] — Reason: still not harness-specific.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10-11 | Blocked By: 5

  **References**:
  - Plan: `.sisyphus/plans/l3-step-definition-execution-final.md`
  - Reused authoritative repos: `packages/db/src/runtime-repositories/**`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-action-invoke-services.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Action deterministic retries and rollups
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-action-invoke-services.test.ts -t "Action" --reporter=verbose | tee .sisyphus/evidence/task-7-l3-action.log`
    Expected: PASS; output proves approval-before-execute, selective retry preservation, deterministic rollup, and Action artifact resolution using shared `GitWorkspaceQueryService`
    Evidence: .sisyphus/evidence/task-7-l3-action.log

  Scenario: Invoke launch/skip uniqueness
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-action-invoke-services.test.ts -t "Invoke" --reporter=verbose | tee .sisyphus/evidence/task-7-l3-invoke.log`
    Expected: PASS; output proves one winner for launch-vs-skip races and transactional child relation creation
    Evidence: .sisyphus/evidence/task-7-l3-invoke.log
  ```

  **Commit**: YES | Message: `feat(l3): add action and invoke runtime services` | Files: `packages/workflow-engine/src/services/**`, `packages/workflow-engine/src/tests/runtime/**`

- [x] 8. Add common harness contracts and OpenCode adapter

  **What to do**: In `packages/agent-runtime`, define the common harness contracts (`HarnessCatalogService`, `HarnessInstanceService`, `HarnessSessionService`, `HarnessMessagingService`, `HarnessActivityStreamService`, `HarnessToolObservationService`, `HarnessMcpBindingService`) and implement the OpenCode adapter under `src/opencode/**`, including `OpencodePortAllocatorService`, `OpencodeServerManagerService`, `OpencodeMcpConfigService`, `OpencodeClientFactoryService`, `OpencodeSessionService`, and `OpencodeActivityAdapterService`. Persist current server base URL/port/session binding on `agent_step_execution_state` and enforce one OpenCode server per active Agent step execution. `OpencodeMcpConfigService` must build the Chiron MCP server URL with the execution-scoped query-param binding (current verified direction: `?executionToken=<token>`) at `createOpencode(...)` time.
  **Must NOT do**: Do not expose OpenCode SDK types outside `packages/agent-runtime`. Do not attempt a shared-server multi-step MCP config model in this task.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`opencode-sdk`, `effect-solutions`, `effect-best-practices`, `hono`] — Reason: this task characterizes the harness boundary and adapter lifecycle.
  - Omitted: [`turborepo`] — Reason: no monorepo-pipeline redesign needed.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 9-11 | Blocked By: 3

  **References**:
  - Plan: `.sisyphus/plans/l3-step-definition-execution-final.md`
  - Existing package: `packages/agent-runtime/**`
  - Existing server entry: `apps/server/src/**`
  - Existing adapter notes: `.sisyphus/plans/opencode-adapter.md`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/agent-runtime/src/tests/opencode/opencode-lifecycle.test.ts`
  - [ ] `bunx vitest run packages/agent-runtime/src/tests/opencode/opencode-mcp-binding.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: One server per active agent step
    Tool: Bash
    Steps: run `bunx vitest run packages/agent-runtime/src/tests/opencode/opencode-lifecycle.test.ts --reporter=verbose | tee .sisyphus/evidence/task-8-opencode-lifecycle.log`
    Expected: PASS; output proves activation creates one server, free port allocation works, restart updates binding metadata, and completion stops or retires the server
    Evidence: .sisyphus/evidence/task-8-opencode-lifecycle.log

  Scenario: MCP binding config is fixed at server construction
    Tool: Bash
    Steps: run `bunx vitest run packages/agent-runtime/src/tests/opencode/opencode-mcp-binding.test.ts --reporter=verbose | tee .sisyphus/evidence/task-8-opencode-mcp.log`
    Expected: PASS; output proves execution-scoped MCP config is supplied at `createOpencode(...)` time and not injected later through client/session calls
    Evidence: .sisyphus/evidence/task-8-opencode-mcp.log
  ```

  **Commit**: YES | Message: `feat(l3): add harness contracts and opencode adapter` | Files: `packages/agent-runtime/**`, `apps/server/src/**`

- [x] 9. Implement Agent runtime service and Chiron MCP tools

  **What to do**: Implement `AgentStepRuntimeService` in `packages/workflow-engine` against the common harness contracts only. Add Agent step detail payloads, send/stream behavior, and the three MCP tools (`read_step_snapshot`, `read_context_value`, `propose_context_write`) through the shared Chiron MCP route. Enforce stale `contextHandle` rejection, approved-only current write semantics, idempotent activation/message/proposal behavior, and use the saved OpenCode base URL/session binding from `agent_step_execution_state`.
  **Must NOT do**: Do not import OpenCode SDK directly into workflow-engine. Do not reintroduce human review / Deferred waiting or saved interaction logs.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-solutions`, `effect-best-practices`, `effect-review`, `opencode-sdk`, `hono`] — Reason: this task is the exact intersection of Effect service boundaries and MCP/harness integration.
  - Omitted: [`turborepo`] — Reason: package graph changes are already fixed.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 10-11 | Blocked By: 5, 8

  **References**:
  - Plan: `.sisyphus/plans/l3-step-definition-execution-final.md`
  - Existing package: `packages/workflow-engine/**`
  - Existing server entry: `apps/server/src/**`
  - Existing adapter package: `packages/agent-runtime/**`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-agent-runtime-service.test.ts`
  - [ ] `bunx vitest run apps/server/src/tests/mcp/l3-agent-mcp-tools.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Agent runtime service stays harness-agnostic
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/l3-agent-runtime-service.test.ts --reporter=verbose | tee .sisyphus/evidence/task-9-agent-runtime.log`
    Expected: PASS; output proves workflow-engine depends only on common harness contracts and enforces approved-only current write semantics
    Evidence: .sisyphus/evidence/task-9-agent-runtime.log

  Scenario: MCP tools enforce current binding rules
    Tool: Bash
    Steps: run `bunx vitest run apps/server/src/tests/mcp/l3-agent-mcp-tools.test.ts --reporter=verbose | tee .sisyphus/evidence/task-9-agent-mcp.log`
    Expected: PASS; output proves stale handles fail, read tools are immediate, and successful writes return `approved`
    Evidence: .sisyphus/evidence/task-9-agent-mcp.log
  ```

  **Commit**: YES | Message: `feat(l3): add agent runtime service and mcp tools` | Files: `packages/workflow-engine/**`, `apps/server/src/**`, `apps/server/src/tests/mcp/**`

- [x] 10. Wire thin API procedures for L3 design-time and runtime

  **What to do**: Add/extend `packages/api` routers so all canonical L3 procedures exist with the exact inputs/outputs locked in the architecture. Ensure every procedure calls exactly one top-level service method and that design-time/runtime naming follows the canonical matrix, not older `getRuntime*` discussion names.
  **Must NOT do**: Do not let routers orchestrate multiple services or repositories. Do not expose stale procedure names as public API.

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: [`effect-solutions`, `effect-best-practices`, `hono`] — Reason: routers must remain thin and typed.
  - Omitted: [`opencode-sdk`] — Reason: SDK details stay behind service boundaries.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 11 | Blocked By: 4, 5, 6, 7, 9

  **References**:
  - Plan: `.sisyphus/plans/l3-step-definition-execution-final.md`
  - Existing router patterns: `packages/api/src/routers/**`
  - Existing tests: `packages/api/src/tests/routers/**`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/api/src/tests/routers/project-runtime-l3.test.ts`
  - [ ] `bunx vitest run packages/api/src/tests/routers/project-l3-design-time.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Runtime procedures stay thin and canonical
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/project-runtime-l3.test.ts --reporter=verbose | tee .sisyphus/evidence/task-10-api-runtime.log`
    Expected: PASS; output proves each runtime procedure calls one top-level service and exports canonical names only
    Evidence: .sisyphus/evidence/task-10-api-runtime.log

  Scenario: Design-time procedures stay typed and workflow-centric
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/project-l3-design-time.test.ts --reporter=verbose | tee .sisyphus/evidence/task-10-api-design.log`
    Expected: PASS; output proves step-type save procedures exist and no public generic `saveWorkflowStep` remains
    Evidence: .sisyphus/evidence/task-10-api-design.log
  ```

  **Commit**: YES | Message: `feat(l3): wire thin l3 api procedures` | Files: `packages/api/src/routers/**`, `packages/api/src/tests/routers/**`

- [x] 11. Implement web surfaces and end-to-end verification

  **What to do**: Implement the locked workflow-centric design-time editor behavior and execution-centric runtime surfaces in `apps/web`: typed step dialogs, Agent stacked dialogs, workflow execution page current-step activation, common step detail shell, step-type detail content, Agent timeline/composer/side-rail tabs, and canonical tool-card rendering. Add route tests and Playwright coverage for the locked timeline, first-step activation, and step-type flows.
  **Must NOT do**: Do not invent segmented Agent chat UX, generic interaction persistence, or noncanonical procedure calls. Do not create first step executions from Guidance/State-Machine pages.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`vercel-react-best-practices`, `web-design-guidelines`] — Reason: runtime surfaces and tool cards require strong UI discipline.
  - Omitted: [`opencode-sdk`] — Reason: frontend uses backend procedures/streams, not SDK directly.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: none | Blocked By: 4, 6, 7, 9, 10

  **References**:
  - Plan: `.sisyphus/plans/l3-step-definition-execution-final.md`
  - Existing web routes: `apps/web/src/routes/**`
  - Existing tests: `apps/web/src/tests/routes/**`, `tests/e2e/**`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run apps/web/src/tests/routes/l3-step-editor.test.tsx`
  - [ ] `bunx vitest run apps/web/src/tests/routes/l3-step-execution.test.tsx`
  - [ ] `bunx playwright test tests/e2e/l3-step-execution.spec.ts`
  - [ ] `bun run check-types`

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: First step activation happens only from workflow execution page
    Tool: Playwright
    Steps: open the workflow execution page for an active workflow without step executions; assert the current step shows an activation control; activate it; confirm a step detail route opens; verify Guidance/State-Machine start path did not precreate the step execution
    Expected: PASS; first step execution appears only after workflow-execution-page activation
    Evidence: .sisyphus/evidence/task-11-first-step-activation.trace.zip

  Scenario: Agent timeline remains single annotated stream
    Tool: Playwright
    Steps: open an active Agent step execution; send a message; observe assistant partials and tool cards; expand/collapse a harness read card and a Chiron MCP card
    Expected: PASS; timeline is single annotated stream, tool cards are collapsible, read card shows params only, and side rail uses the locked tab layout
    Evidence: .sisyphus/evidence/task-11-agent-timeline.trace.zip
  ```

  **Commit**: YES | Message: `feat(l3): add workflow and step execution surfaces` | Files: `apps/web/src/routes/**`, `apps/web/src/features/**`, `apps/web/src/tests/routes/**`, `tests/e2e/**`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
  - Tool: `task(subagent_type="oracle")`
  - Steps: review the implemented changes against `.sisyphus/plans/l3-step-definition-execution-final.md`; verify workflow start vs step start separation, `entryStepId` publish validation, typed procedure inventory, shared-service split, and OpenCode adapter boundary.
  - Expected: oracle approves or returns an actionable variance list with no ambiguous findings.
  - Evidence: `.sisyphus/evidence/f1-plan-compliance.md`
- [ ] F2. Code Quality Review — unspecified-high
  - Tool: `task(category="unspecified-high")`
  - Steps: review changed files for architectural boundary violations, god services, router orchestration leakage, and OpenCode imports outside `packages/agent-runtime`.
  - Expected: reviewer approves or returns a file-by-file findings list.
  - Evidence: `.sisyphus/evidence/f2-code-quality.md`
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
  - Tool: `task(category="unspecified-high")` + `playwright`
  - Steps: execute the locked user journeys: publish validation, first step activation from workflow execution page only, Agent timeline/tool-card behavior, Action/Invoke/Branch runtime flows, and Display completion idempotency.
  - Expected: all journeys pass with no scope leakage and no duplicated interaction persistence.
  - Evidence: `.sisyphus/evidence/f3-real-qa.md` and Playwright traces under `test-results/**/trace.zip`
- [ ] F4. Scope Fidelity Check — deep
  - Tool: `task(category="deep")`
  - Steps: verify the implementation does not include deferred scope items such as seed-data authoring, human-in-the-loop Agent review, pause/resume/cancel lifecycle expansion, or generic interaction logging.
  - Expected: deep review confirms implementation stayed within current L3 architecture scope.
  - Evidence: `.sisyphus/evidence/f4-scope-fidelity.md`

## Commit Strategy
- Commit after each task or tightly related task pair using the messages specified under each TODO.
- Keep architecture freezes (contracts/schema/validation) separate from runtime/service and UI commits.
- Do not mix OpenCode adapter changes with unrelated workflow-engine logic in one commit.

## Success Criteria
- All six step types are fully representable in design-time and runtime using typed services and tables.
- All public procedures are thin and call exactly one top-level service method.
- Workflow-engine remains OpenCode-agnostic.
- Agent runtime works through harness contracts and OpenCode adapter only.
- Publish rejects invalid workflows (including missing/invalid `entryStepId`).
- First step execution is only created from workflow execution page activation, not from Guidance/State-Machine activation.
- Timeline and step detail pages render the locked L3 model without duplicated interaction persistence.
