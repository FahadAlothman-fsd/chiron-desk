# Unified L1/L2 Runtime Slice

## TL;DR
> **Summary**: Implement the locked L1/L2 runtime slice from `.sisyphus/drafts/runtime-project-context-revision.md` as one unified cutover across persistence, Effect services, API contracts, and runtime web surfaces while explicitly deferring all L3 step-execution work.
> **Deliverables**:
> - runtime schema, repositories, and lineage/current-selection rules
> - `packages/workflow-engine` runtime domain services and layers
> - typed runtime oRPC queries, streams, and mutations
> - cutover of locked L1/L2 runtime routes/surfaces in `apps/web`
> - full automated verification for lineage, guidance streaming, and page behavior
> **Effort**: XL
> **Parallel**: YES - 4 waves
> **Critical Path**: 1 → 2 → 3/4 → 5/6 → 7/8 → 9/10/11/12 → 13/14/15 → 16

## Context
### Original Request
- Use `.sisyphus/drafts/runtime-project-context-revision.md` as the canonical source.
- Produce exactly one decision-complete execution plan for the unified L1/L2 runtime slice.
- Keep all locked L1/L2 surfaces, procedures, runtime tables, lineage semantics, locked condition kinds, and Effect service/package decisions in the same plan.
- Explicitly defer L3 step execution page, step-type-specific execution UI, and step-level retry/orchestration details.

### Interview Summary
- No new user clarifications were required after repo grounding; the draft already locked the runtime UX and data semantics.
- Existing `.sisyphus/plans/runtime-project-context.md` is historical only and must not drive implementation.
- The stale footer inside the canonical draft that still mentions L3-inclusive scope is superseded by the user’s current boundaries and is non-authoritative for this plan.

### Metis Review (gaps addressed)
- Front-load the `project_executions` compatibility decision before any schema/UI work.
- Freeze package ownership, route inventory, and transport contract inventory before parallelization.
- Prove deterministic lineage/current-state reconstruction without `step_executions`.
- Keep preview contracts and runtime contracts separate until route cutover is complete.
- Add explicit “Must Not Add” boundaries on every surface to block L3 creep and UI overbuild.

## Work Objectives
### Core Objective
Replace the current runtime-preview/deferred experience with the locked L1/L2 runtime slice using stable runtime persistence, deterministic lineage rules, thin oRPC routers, Effect-owned domain services in `packages/workflow-engine`, and route-level web cutovers that preserve the audited UX semantics.

### Deliverables
- Runtime table layer in `packages/db/src/schema/runtime.ts` plus migration wiring from `packages/db/src/schema/index.ts`.
- Runtime repository implementations in `packages/db/src/runtime-repositories/**` plus export wiring from `packages/db/src/index.ts`.
- Runtime repository ports in `packages/workflow-engine/src/repositories/**` and runtime services/layers in `packages/workflow-engine/src/**`.
- Shared runtime transport/domain schemas in `packages/contracts/src/runtime/**` exported from `packages/contracts/src/index.ts`.
- Runtime router modules in `packages/api/src/routers/project-runtime.ts` and thin composition updates in `packages/api/src/routers/project.ts` and `packages/api/src/routers/index.ts`.
- Web cutover across the locked project/runtime routes in `apps/web/src/routes/**` plus route tests and Playwright coverage.
- Repin compatibility update in `packages/project-context/**` so runtime history blocks repin without writing new rows to `project_executions`.

### Definition of Done (verifiable conditions with commands)
- `bunx vitest run packages/db/src/tests/runtime/**/*.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/**/*.test.ts`
- `bunx vitest run packages/api/src/tests/routers/project-runtime*.test.ts`
- `bunx vitest run apps/web/src/tests/routes/runtime-*.test.tsx`
- `bunx playwright test tests/e2e/runtime-*.spec.ts`
- `bun run check-types`
- `bun run test:layout:guardrail`

### Must Have
- `project_executions` remains legacy read-only compatibility history; new runtime writes never target it.
- Repin blocking becomes `legacy project_executions rows OR new runtime-history rows exist`.
- Runtime execution domain ownership lives in `packages/workflow-engine`.
- Runtime persistence ownership lives in `packages/db`.
- Runtime routers stay thin and own transport only.
- Every runtime procedure calls exactly one top-level Effect service method; routers never join repos directly and never orchestrate gate/lineage logic.
- Existing `/projects/$projectId/transitions` path is reused as the Runtime Guidance page to avoid nav churn; label/copy changes to “Guidance”, URL stays stable.
- Runtime guidance Active query and Open/Future stream project the same domain model.
- No `step_executions` table or L3 page work lands in this slice.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No new runtime ownership in `packages/api`, `packages/project-context`, `packages/methodology-engine`, or `packages/core`.
- No dual-write flow between preview and runtime data.
- No preview `getProjectDetails` payload expansion to carry runtime semantics.
- No step-level retry/orchestration UI, step timelines, step mutation APIs, or step tables.
- No historical project-wide transition browser beyond Runtime Guidance + Active Workflows + execution detail pages already locked.
- No delete/clear flows for project facts or work-unit facts in this slice.
- No artifact content editor, artifact upload flow, or version-management workflow.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after with TDD-first inside each package (`contracts/db/workflow-engine/api/web`) using Vitest and Playwright.
- QA policy: every task below includes agent-executed scenarios with exact commands and evidence paths.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.
- Package-local scripts to add in this slice:
  - `packages/db/package.json` → `"test": "vitest run"`
  - `packages/workflow-engine/package.json` → `"test": "vitest run"`

## Execution Strategy
### Locked Architecture Decisions
1. **`project_executions` fate**: keep the table untouched as a legacy sentinel for already-persisted preview/runtime history; add a new runtime-history predicate that blocks repin when either legacy `project_executions` rows exist or any new runtime rows exist. Do not rename or repurpose `project_executions` in this slice.
2. **Preview/runtime cutover mode**: additive dual-read, single-write. Introduce new runtime contracts/endpoints beside `project.getProjectDetails`; cut routes over one file at a time to new query keys and runtime procedures; never dual-write because preview is read-only.
3. **Determinism without `step_executions`**: current facts/artifacts/executions are reconstructed exclusively from immutable L1/L2 tables plus active pointers and explicit supersession fields. Ordering rule is `(created_at DESC, id DESC)` within each lineage chain unless a more specific natural parent/child edge exists.

### Ownership Matrix
- `packages/workflow-engine` — runtime domain ports, read models, command services, lineage/guidance logic, Effect layers.
- `packages/db` — runtime schema, migrations, repository implementations, transaction boundaries, invariant tests.
- `packages/api` — thin oRPC procedures only; no domain decisions.
- `packages/contracts` — shared runtime status enums, payload schemas, stream envelope schemas.
- `apps/web` — runtime routes, components, TanStack query usage, page-level tests.
- `packages/project-context` — project metadata/pin/re-pin integration only; reads runtime history through a narrow port.
- `packages/methodology-engine` — published methodology lookup only; no runtime ownership.

### Procedure → Effect Service → Repository Boundary
- Boundary rule: `page/route -> procedure -> top-level service -> shared service(s) -> repository port(s) -> db implementation`.
- Procedure rule: auth/validation/error mapping only; call exactly one top-level service method; never call repositories directly.
- Shared-service rule: `RuntimeGateService` is the only shared gate-evaluation service in this slice; it may be called by `RuntimeGuidanceService`, `TransitionExecutionCommandService`, and `TransitionExecutionDetailService`, but it never owns stream lifecycle, DTO shaping, transactions, or active-pointer writes.
- Repository rule: use a family of narrow ports, not a giant runtime repository:
  - `ProjectWorkUnitRepository`
  - `TransitionExecutionRepository`
  - `WorkflowExecutionRepository`
  - `ExecutionReadRepository`
  - `ProjectFactRepository`
  - `WorkUnitFactRepository`
  - `ArtifactRepository`
- Legacy rule: `project_executions` compatibility checks remain under `packages/project-context`; runtime services/repos do not own or write that table.

### Canonical Route / Surface Inventory
- `apps/web/src/routes/projects.$projectId.index.tsx` → Project Overview (`/projects/$projectId/`)
- `apps/web/src/routes/projects.$projectId.transitions.tsx` → Runtime Guidance (`/projects/$projectId/transitions`, label changes to Guidance)
- `apps/web/src/routes/projects.$projectId.work-units.tsx` → Work Units List (`/projects/$projectId/work-units`)
- `apps/web/src/routes/projects.$projectId.facts.tsx` → Project Facts (`/projects/$projectId/facts`)
- `apps/web/src/routes/projects.$projectId.workflows.tsx` → Active Workflows (`/projects/$projectId/workflows`) **new**
- `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx` → Project Fact Detail **new**
- `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.tsx` → Work Unit Overview **new**
- `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.state-machine.tsx` → Work Unit State Machine **new**
- `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.facts.tsx` → Work Unit Facts **new**
- `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.facts.$factDefinitionId.tsx` → Work Unit Fact Detail **new**
- `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.artifact-slots.tsx` → Artifact Slots **new**
- `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.artifact-slots.$slotDefinitionId.tsx` → Artifact Slot Detail **new**
- `apps/web/src/routes/projects.$projectId.transition-executions.$transitionExecutionId.tsx` → Transition Execution Detail **new**
- `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx` → Workflow Execution Detail **new**
- Artifact Snapshot Dialog stays a component/modal opened from Artifact Slot Detail; do not create a separate route.

### Canonical Runtime Contract Inventory
- `packages/contracts/src/runtime/status.ts`
  - `TransitionExecutionStatus = "active" | "completed" | "superseded"`
  - `WorkflowExecutionStatus = "active" | "completed" | "superseded" | "parent_superseded"`
  - `RuntimeCandidateAvailability = "available" | "blocked" | "future"`
- `packages/contracts/src/runtime/conditions.ts`
  - only `fact`, `work_unit_fact`, `artifact`
  - `artifact` operators only `exists | stale | fresh`
- `packages/contracts/src/runtime/guidance.ts`
  - `getRuntimeGuidanceActive`
  - `streamRuntimeGuidanceCandidates`
  - stream envelope version fixed at `1`
  - event types exactly `bootstrap`, `transitionResult`, `workUnitDone`, `done`, `error`
  - reconnect behavior: restart from a fresh bootstrap; no resume token in this slice
- `packages/contracts/src/runtime/overview.ts`
  - project overview stats + active workflows preview + `goToGuidanceHref`
- `packages/contracts/src/runtime/work-units.ts`
  - list payloads, overview payload, state-machine payload, work-unit facts payloads
- `packages/contracts/src/runtime/facts.ts`
  - project facts list/detail payloads
- `packages/contracts/src/runtime/artifacts.ts`
  - artifact slots list, slot detail, snapshot dialog payloads, check result payloads
- `packages/contracts/src/runtime/executions.ts`
  - transition execution detail payloads, workflow execution detail payloads, start/switch/retry/complete mutation inputs/outputs
  - fact mutation inputs/outputs: `addRuntimeProjectFactValue`, `setRuntimeProjectFactValue`, `replaceRuntimeProjectFactValue`, `addRuntimeWorkUnitFactValue`, `setRuntimeWorkUnitFactValue`, `replaceRuntimeWorkUnitFactValue`

### Determinism / Current-Selection Rules
- `project_work_units` is the durable runtime anchor; all work-unit-scoped facts/artifacts/executions resolve through it.
- Transition retry creates a new `workflow_execution` under the same `transition_execution`.
- Choosing another primary workflow under an active transition creates a new primary `workflow_execution` and supersedes the previous primary attempt.
- Switching active transition creates a new `transition_execution` row that supersedes the previous active transition execution and its active primary workflow path.
- Project facts and work-unit facts are immutable lineage rows; current value/member selection uses the latest non-superseded row(s) per `(anchor, fact_definition_id)` with cardinality rules enforced from methodology definitions.
- Artifact current state is reconstructed from the latest reachable `project_artifact_snapshots` lineage head plus delta rows in `artifact_snapshot_files` keyed by `file_path`; `member_status = "removed"` participates in reconstruction but does not render as a live member.
- If latest artifact lineage resolves to zero live members, surface `exists = false` and `members = []` while still rendering lineage history.
- Git freshness rules always evaluate against `projects.project_root_path`; missing/invalid path yields an unavailable/error result, not a fabricated freshness state.

### Query / Stream / Cutover Rules
- Runtime routes must use new TanStack query keys prefixed with `runtime-`; preview routes keep existing keys until removed.
- `project.getProjectDetails` remains preview-only; do not add runtime-only fields to its payload.
- Runtime Guidance page loads Active query and Open/Future stream in parallel.
- Open/Future bootstrap returns full stable ordering plus summary counts; deltas only update transition availability/reason fields.
- On stream reconnect, client discards prior Open/Future state, requests a fresh stream, and rehydrates from the new bootstrap.

### Canonical Procedure / Service / Repo Matrix
- **Project Overview**
  - Procedures: `project.getRuntimeOverview`, `project.getRuntimeActiveWorkflows`
  - Top-level services: `RuntimeOverviewService`, `RuntimeWorkflowIndexService`
  - Repositories: `ProjectWorkUnitRepository`, `ExecutionReadRepository`, `ProjectFactRepository`
- **Runtime Guidance**
  - Procedures: `project.getRuntimeGuidanceActive`, `project.streamRuntimeGuidanceCandidates`, `project.getRuntimeStartGateDetail`, `project.startTransitionExecution`, `project.switchActiveTransitionExecution`
  - Top-level services: `RuntimeGuidanceService`, `TransitionExecutionCommandService`
  - Shared service: `RuntimeGateService`
  - Repositories: `ProjectWorkUnitRepository`, `ExecutionReadRepository`, `TransitionExecutionRepository`, `WorkflowExecutionRepository`, `ProjectFactRepository`, `WorkUnitFactRepository`, `ArtifactRepository`
- **Work Units List + Overview**
  - Procedures: `project.getRuntimeWorkUnits`, `project.getRuntimeWorkUnitOverview`
  - Top-level service: `RuntimeWorkUnitService`
  - Repositories: `ProjectWorkUnitRepository`, `ExecutionReadRepository`, `WorkUnitFactRepository`, `ArtifactRepository`
- **Work Unit State Machine**
  - Procedures: `project.getRuntimeWorkUnitStateMachine`, `project.getRuntimeStartGateDetail`, `project.startTransitionExecution`, `project.switchActiveTransitionExecution`
  - Top-level services: `RuntimeWorkUnitService`, `TransitionExecutionCommandService`
  - Shared service: `RuntimeGateService`
- **Project Facts**
  - Procedures: `project.getRuntimeProjectFacts`, `project.getRuntimeProjectFactDetail`, `project.addRuntimeProjectFactValue`, `project.setRuntimeProjectFactValue`, `project.replaceRuntimeProjectFactValue`
  - Top-level service: `RuntimeFactService`
  - Repositories: `ProjectFactRepository`
- **Work Unit Facts**
  - Procedures: `project.getRuntimeWorkUnitFacts`, `project.getRuntimeWorkUnitFactDetail`, `project.addRuntimeWorkUnitFactValue`, `project.setRuntimeWorkUnitFactValue`, `project.replaceRuntimeWorkUnitFactValue`
  - Top-level service: `RuntimeFactService`
  - Repositories: `WorkUnitFactRepository`, `ProjectWorkUnitRepository`
- **Artifacts**
  - Procedures: `project.getRuntimeArtifactSlots`, `project.getRuntimeArtifactSlotDetail`, `project.getRuntimeArtifactSnapshotDialog`, `project.checkArtifactSlotCurrentState`
  - Top-level service: `RuntimeArtifactService`
  - Repositories: `ArtifactRepository`, `ProjectWorkUnitRepository`
- **Active Workflows**
  - Procedure: `project.getRuntimeActiveWorkflows`
  - Top-level service: `RuntimeWorkflowIndexService`
  - Repositories: `ExecutionReadRepository`, `ProjectWorkUnitRepository`
- **Transition Execution Detail**
  - Procedures: `project.getRuntimeTransitionExecutionDetail`, `project.choosePrimaryWorkflowForTransitionExecution`, `project.completeTransitionExecution`
  - Top-level services: `TransitionExecutionDetailService`, `TransitionExecutionCommandService`
  - Shared service: `RuntimeGateService`
  - Repositories: `ExecutionReadRepository`, `TransitionExecutionRepository`, `WorkflowExecutionRepository`, `ProjectWorkUnitRepository`, `ProjectFactRepository`, `WorkUnitFactRepository`, `ArtifactRepository`
- **Workflow Execution Detail**
  - Procedures: `project.getRuntimeWorkflowExecutionDetail`, `project.retrySameWorkflowExecution`
  - Top-level services: `WorkflowExecutionDetailService`, `WorkflowExecutionCommandService`
  - Repositories: `ExecutionReadRepository`, `WorkflowExecutionRepository`, `TransitionExecutionRepository`

### Fiber / Concurrency Model
- Query procedures use short-lived request fibers only.
- Mutation procedures use short-lived command fibers only; no optimistic execution-state writes.
- `project.streamRuntimeGuidanceCandidates` owns exactly one externally long-lived root stream fiber.
- Guidance stream concurrency is **structured bounded concurrency** only:
  - parallelize across work-unit groups;
  - preserve stable candidate ordering within each group;
  - no detached fire-and-forget fibers;
  - cancelling the root stream cancels all child evaluation work.
- `RuntimeGateService` owns transition-bound condition-group evaluation scopes:
  - `ALL` short-circuits by interrupting sibling fibers on the first unmet/false result;
  - `ANY` short-circuits by interrupting sibling fibers on the first met/true result.
- Guidance emission contract stays deterministic: first blocking reason is stable, ordered, and derived from the scoped gate evaluation result rather than race order.

### Invalidation / Revalidation Rules
- Start/switch invalidates `runtime-overview`, `runtime-guidance-active`, `runtime-guidance-stream`, `runtime-work-units`, affected `runtime-work-unit-overview`, affected `runtime-work-unit-state-machine`, and `runtime-active-workflows`.
- Complete transition invalidates the above plus affected `runtime-transition-execution-detail`, affected `runtime-workflow-execution-detail`, and any state-derived summary cards.
- Retry same workflow invalidates `runtime-workflow-execution-detail`, any parent `runtime-transition-execution-detail` whose lineage changed, `runtime-guidance-active`, and `runtime-active-workflows`.
- Project fact mutations invalidate `runtime-project-facts`, affected `runtime-project-fact-detail`, and any gate-dependent views.
- Work-unit fact mutations invalidate `runtime-work-unit-facts`, affected `runtime-work-unit-fact-detail`, affected work-unit overview/state-machine, and any gate-dependent views.
- Artifact manual checks invalidate `runtime-artifact-slots`, affected `runtime-artifact-slot-detail`, affected snapshot dialog state, and any guidance/completion-gate views whose artifact predicates changed.

### Parallel Execution Waves
> Target: 4 tasks per wave. Extracted all foundation dependencies into Wave 1 before parallel cutover work.

Wave 1: contracts + compatibility + schema + repositories
Wave 2: workflow-engine services + runtime API contracts/routers
Wave 3: overview/guidance/list/runtime shell pages
Wave 4: detail pages + cleanup/governance

### Dependency Matrix (full, all tasks)
- 1 blocks all other tasks.
- 2 blocked by 1.
- 3 blocked by 2.
- 4 blocked by 2.
- 5 blocked by 1, 3, 4.
- 6 blocked by 1, 3, 4.
- 7 blocked by 1, 5.
- 8 blocked by 1, 5, 6.
- 9 blocked by 7.
- 10 blocked by 8.
- 11 blocked by 7, 8.
- 12 blocked by 7, 8.
- 13 blocked by 11.
- 14 blocked by 7, 11.
- 15 blocked by 8, 12.
- 16 blocked by 9, 10, 11, 12, 13, 14, 15.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 4 tasks → deep / unspecified-high
- Wave 2 → 4 tasks → deep / unspecified-high
- Wave 3 → 4 tasks → unspecified-high / visual-engineering
- Wave 4 → 4 tasks → unspecified-high / deep

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Freeze runtime contracts, route inventory, and package test harnesses

  **What to do**: Create the shared runtime contract modules under `packages/contracts/src/runtime/` (`status.ts`, `conditions.ts`, `overview.ts`, `guidance.ts`, `work-units.ts`, `facts.ts`, `artifacts.ts`, `executions.ts`, `index.ts`) and export them from `packages/contracts/src/index.ts`. Encode the locked route inventory and stream-event taxonomy directly in the contract schemas, add package-local `test` scripts to `packages/db/package.json` and `packages/workflow-engine/package.json`, and create failing contract tests that lock the legacy-compatibility rules (`project_executions` legacy-only, no `step_executions`, event types/version fixed, only `fact | work_unit_fact | artifact` condition kinds).
  **Must NOT do**: Do not add runtime implementation logic, router handlers, or DB writes in this task. Do not reuse or extend `desktop-runtime` contracts for L1/L2 web runtime. Do not add any L3/step schemas.
  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this task freezes all downstream interfaces and scope boundaries.
  - Skills: `[]`
  - Omitted: `writing-skills` — No skill authoring is involved.
  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-16 | Blocked By: none
  **References**:
  - Pattern: `packages/contracts/src/index.ts`
  - Pattern: `apps/web/src/routes/projects.$projectId.transitions.tsx:17-20`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:1108-1311`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:2448-2867`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/contracts/src/tests/runtime/runtime-contracts.test.ts`
  - [ ] `bunx vitest run packages/contracts/src/tests/runtime/runtime-cutover-rules.test.ts`
  - [ ] `bun run check-types`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Contract inventory lock
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/runtime/runtime-contracts.test.ts --reporter=verbose | tee .sisyphus/evidence/task-1-contract-freeze.log`
    Expected: PASS; output includes assertions for `bootstrap|transitionResult|workUnitDone|done|error` and `fact|work_unit_fact|artifact`
    Evidence: .sisyphus/evidence/task-1-contract-freeze.log

  Scenario: L3 exclusion guard
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/runtime/runtime-cutover-rules.test.ts --reporter=verbose | tee .sisyphus/evidence/task-1-contract-freeze-l3.log`
    Expected: PASS; output confirms no exported `step_executions` schema or L3 event contract
    Evidence: .sisyphus/evidence/task-1-contract-freeze-l3.log
  ```
  **Commit**: YES | Message: `feat(runtime): lock l1-l2 runtime contracts and cutover rules` | Files: `packages/contracts/src/runtime/**`, `packages/contracts/src/index.ts`, `packages/contracts/src/tests/runtime/**`, `packages/db/package.json`, `packages/workflow-engine/package.json`

- [ ] 2. Add runtime schema, migration, and legacy-history-aware repin bridge

  **What to do**: Add `projects.project_root_path` to `packages/db/src/schema/project.ts`; create `packages/db/src/schema/runtime.ts` with the locked L1/L2 tables; export them from `packages/db/src/schema/index.ts`; add `packages/db/src/migrations/0001_runtime_l1_l2.sql`. Replace `hasPersistedExecutions` with a runtime-history-aware read path that blocks repin when legacy `project_executions` rows exist or any new runtime rows exist while leaving `project_executions` untouched and read-only.
  **Must NOT do**: Do not rename `project_executions`, write new runtime rows into it, introduce `step_executions`, or add policy/delete/blob fields.
  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: `[]`
  - Omitted: `turborepo`
  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3-8 | Blocked By: 1
  **References**:
  - Pattern: `packages/db/src/schema/project.ts:7-86`
  - Pattern: `packages/db/src/project-context-repository.ts:136-144`
  - Pattern: `packages/project-context/src/service.ts:293-311`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:322-332`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:1020-1025`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:441-685`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/db/src/tests/schema/runtime-schema.test.ts`
  - [ ] `bunx vitest run packages/project-context/src/tests/service/runtime-history-repin.test.ts`
  - [ ] `bun run check-types`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Schema lock
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/schema/runtime-schema.test.ts --reporter=verbose | tee .sisyphus/evidence/task-2-runtime-schema.log`
    Expected: PASS; assertions include `project_root_path`, runtime table names, and no `step_executions`
    Evidence: .sisyphus/evidence/task-2-runtime-schema.log

  Scenario: Repin blocked by runtime history
    Tool: Bash
    Steps: run `bunx vitest run packages/project-context/src/tests/service/runtime-history-repin.test.ts --reporter=verbose | tee .sisyphus/evidence/task-2-repin-bridge.log`
    Expected: PASS; output shows stable `PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY` diagnostics for both legacy and new runtime history cases
    Evidence: .sisyphus/evidence/task-2-repin-bridge.log
  ```
  **Commit**: YES | Message: `feat(runtime): add l1-l2 runtime schema and repin history bridge` | Files: `packages/db/src/schema/project.ts`, `packages/db/src/schema/runtime.ts`, `packages/db/src/schema/index.ts`, `packages/db/src/migrations/0001_runtime_l1_l2.sql`, `packages/project-context/src/repository.ts`, `packages/project-context/src/service.ts`, `packages/db/src/project-context-repository.ts`, `packages/db/src/tests/schema/runtime-schema.test.ts`, `packages/project-context/src/tests/service/runtime-history-repin.test.ts`

- [ ] 3. Implement runtime repository layers for anchors and execution lineage

  **What to do**: Define narrow repository ports in `packages/workflow-engine/src/repositories/` for `ProjectWorkUnitRepository`, `TransitionExecutionRepository`, `WorkflowExecutionRepository`, and `ExecutionReadRepository`, then implement their DB-backed layers in `packages/db/src/runtime-repositories/` and export them from `packages/db/src/index.ts`. Cover creation/list/current-selection operations for `project_work_units`, `transition_executions`, and `workflow_executions`, including atomic start, switch, retry, and primary-pointer updates; keep joined read models in `ExecutionReadRepository` rather than bloating the write repos.
  **Must NOT do**: Do not place business rules in API/router files, bundle fact/artifact writes here, or model activity by mutating old rows beyond the locked active pointers and supersession fields.
  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: `[]`
  - Omitted: `systematic-debugging`
  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5-8 | Blocked By: 2
  **References**:
  - Pattern: `packages/db/src/project-context-repository.ts`
  - Pattern: `packages/project-context/src/repository.ts:45-82`
  - Pattern: `packages/methodology-engine/src/services/workflow-service.ts:20`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:521-596`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/db/src/tests/repository/runtime-executions-repository.test.ts`
  - [ ] `bunx vitest run packages/db/src/tests/repository/runtime-work-units-repository.test.ts`
  - [ ] `bun run check-types`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Retry vs switch atomicity
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/runtime-executions-repository.test.ts --reporter=verbose | tee .sisyphus/evidence/task-3-execution-repo.log`
    Expected: PASS; assertions show no double-active transition or primary workflow rows after retry/switch transactions
    Evidence: .sisyphus/evidence/task-3-execution-repo.log

  Scenario: Active pointer consistency
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/runtime-work-units-repository.test.ts --reporter=verbose | tee .sisyphus/evidence/task-3-work-unit-repo.log`
    Expected: PASS; output confirms the work-unit active transition pointer updates only to the newest active execution
    Evidence: .sisyphus/evidence/task-3-work-unit-repo.log
  ```
  **Commit**: YES | Message: `feat(runtime): add runtime execution repositories` | Files: `packages/workflow-engine/src/repositories/**`, `packages/db/src/runtime-repositories/project-work-unit-repository.ts`, `packages/db/src/runtime-repositories/transition-execution-repository.ts`, `packages/db/src/runtime-repositories/workflow-execution-repository.ts`, `packages/db/src/runtime-repositories/execution-read-repository.ts`, `packages/db/src/index.ts`, `packages/db/src/tests/repository/runtime-executions-repository.test.ts`, `packages/db/src/tests/repository/runtime-work-units-repository.test.ts`

- [ ] 4. Implement runtime repository support for facts, artifacts, and current-state reconstruction

  **What to do**: Add `ProjectFactRepository`, `WorkUnitFactRepository`, and `ArtifactRepository` ports under `packages/workflow-engine/src/repositories/` and implement their DB-backed layers under `packages/db/src/runtime-repositories/`. Lock immutable lineage writes/reads for `project_fact_instances`, `work_unit_fact_instances`, `project_artifact_snapshots`, and `artifact_snapshot_files`, including `member_status = present|removed`, `exists = false` when the latest artifact lineage resolves to zero live members, and direct `referenced_project_work_unit_id` handling for work-unit-reference facts.
  **Must NOT do**: Do not add delete/clear flows, artifact file contents, or policy state. Do not model work-unit references on project facts. Do not treat missing `project_root_path` as `stale` or `fresh`.
  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: `[]`
  - Omitted: `effect-solutions`
  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5-8 | Blocked By: 2
  **References**:
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:441-516`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:602-685`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:1731-2400`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:1020-1025`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/db/src/tests/repository/runtime-facts-repository.test.ts`
  - [ ] `bunx vitest run packages/db/src/tests/repository/runtime-artifacts-repository.test.ts`
  - [ ] `bunx vitest run packages/db/src/tests/repository/runtime-condition-prereqs.test.ts`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Fact lineage reconstruction
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/runtime-facts-repository.test.ts --reporter=verbose | tee .sisyphus/evidence/task-4-facts-repo.log`
    Expected: PASS; output covers primitive facts, work-unit-reference facts, and incoming/outgoing dependency counts
    Evidence: .sisyphus/evidence/task-4-facts-repo.log

  Scenario: Artifact zero-live-member handling
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/runtime-artifacts-repository.test.ts --reporter=verbose | tee .sisyphus/evidence/task-4-artifacts-repo.log`
    Expected: PASS; output confirms the latest lineage head can resolve to `exists = false` with empty members while retaining history
    Evidence: .sisyphus/evidence/task-4-artifacts-repo.log
  ```
  **Commit**: YES | Message: `feat(runtime): add fact and artifact lineage repositories` | Files: `packages/workflow-engine/src/repositories/project-fact-repository.ts`, `packages/workflow-engine/src/repositories/work-unit-fact-repository.ts`, `packages/workflow-engine/src/repositories/artifact-repository.ts`, `packages/db/src/runtime-repositories/project-fact-repository.ts`, `packages/db/src/runtime-repositories/work-unit-fact-repository.ts`, `packages/db/src/runtime-repositories/artifact-repository.ts`, `packages/db/src/tests/repository/runtime-facts-repository.test.ts`, `packages/db/src/tests/repository/runtime-artifacts-repository.test.ts`, `packages/db/src/tests/repository/runtime-condition-prereqs.test.ts`

- [ ] 5. Build workflow-engine runtime projection services and condition evaluation

  **What to do**: Implement the runtime Effect layer in `packages/workflow-engine` using repository ports from Task 3/4. Create `runtime-overview-service.ts`, `runtime-guidance-service.ts`, `runtime-work-unit-service.ts`, `runtime-workflow-index-service.ts`, `runtime-fact-service.ts`, `runtime-artifact-service.ts`, and `runtime-gate-service.ts`, then export a merged runtime live layer from `packages/workflow-engine/src/layers/live.ts` and `src/index.ts`. `RuntimeGateService` must expose exactly `evaluateStartGate(...)` and `evaluateCompletionGate(...)`; `RuntimeGuidanceService` owns stream orchestration but delegates gate semantics to `RuntimeGateService`.
  **Must NOT do**: Do not put repository SQL or router code here. Do not read methodology draft-editing seams. Do not infer L3/step state to answer Active/Open/Future queries.
  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-solutions`]
  - Omitted: [`better-auth-best-practices`]
  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7-14 | Blocked By: 1, 3, 4
  **References**:
  - Pattern: `packages/methodology-engine/src/layers/live.ts:7-15`
  - Pattern: `packages/project-context/src/service.ts:74-411`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:1108-1708`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:2013-2400`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-guidance-service.test.ts`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-gate-service.test.ts`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-overview-service.test.ts packages/workflow-engine/src/tests/runtime/runtime-facts-artifacts-services.test.ts packages/workflow-engine/src/tests/runtime/runtime-workflow-index-service.test.ts`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Guidance parity
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-guidance-service.test.ts --reporter=verbose | tee .sisyphus/evidence/task-5-guidance-service.log`
    Expected: PASS; output shows Active query and Open/Future bootstrap/delta evaluation use one canonical domain interpretation and preserve stable candidate ordering within each work-unit group
    Evidence: .sisyphus/evidence/task-5-guidance-service.log

  Scenario: Gate semantics and unsupported condition kind rejection
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-gate-service.test.ts --reporter=verbose | tee .sisyphus/evidence/task-5-gate-service.log`
    Expected: PASS; output includes `ANY`/`ALL` sibling interruption semantics and rejection of any kind outside `fact|work_unit_fact|artifact`
    Evidence: .sisyphus/evidence/task-5-gate-service.log
  ```
  **Commit**: NO | Message: `feat(runtime): add runtime projection services` | Files: `packages/workflow-engine/src/services/runtime-overview-service.ts`, `packages/workflow-engine/src/services/runtime-guidance-service.ts`, `packages/workflow-engine/src/services/runtime-work-unit-service.ts`, `packages/workflow-engine/src/services/runtime-workflow-index-service.ts`, `packages/workflow-engine/src/services/runtime-fact-service.ts`, `packages/workflow-engine/src/services/runtime-artifact-service.ts`, `packages/workflow-engine/src/services/runtime-gate-service.ts`, `packages/workflow-engine/src/layers/live.ts`, `packages/workflow-engine/src/index.ts`, `packages/workflow-engine/src/tests/runtime/**`

- [ ] 6. Build workflow-engine transition/workflow detail and command services

  **What to do**: Add `transition-execution-detail-service.ts`, `transition-execution-command-service.ts`, `workflow-execution-detail-service.ts`, and `workflow-execution-command-service.ts` in `packages/workflow-engine/src/services/`. Keep the read-model services separate from command services. `TransitionExecutionDetailService` may call `RuntimeGateService.evaluateCompletionGate(...)` for the completion panel; `TransitionExecutionCommandService` may call `RuntimeGateService.evaluateStartGate(...)` and `evaluateCompletionGate(...)` for command pre-checks. `completeTransitionExecution` must live-re-evaluate completion gates, mark transition execution completed, update `project_work_units.current_state_id`, and clear `active_transition_execution_id` only when gates pass. `choosePrimaryWorkflowForTransitionExecution` must create a new primary workflow execution and supersede the previous primary attempt. `retrySameWorkflowExecution` must create a new workflow execution for the same definition and only update the transition primary pointer when the retried workflow role is `primary`.
  **Must NOT do**: Do not choose a different workflow definition from the workflow detail page. Do not expose L3 steps. Do not duplicate completion-gate logic separately in read and command paths.
  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-solutions`]
  - Omitted: [`test-driven-development`]
  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 12, 15 | Blocked By: 1, 3, 4
  **References**:
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:2448-2697`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:2700-3276`
  - Pattern: `packages/project-context/src/service.ts`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/transition-execution-services.test.ts`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/workflow-execution-services.test.ts`
  - [ ] `bun run check-types`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Complete transition only when gates pass
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/transition-execution-services.test.ts --reporter=verbose | tee .sisyphus/evidence/task-6-transition-services.log`
    Expected: PASS; output shows blocked completions fail and successful completions update work-unit state + clear active transition pointer atomically
    Evidence: .sisyphus/evidence/task-6-transition-services.log

  Scenario: Retry same workflow keeps definition stable
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/workflow-execution-services.test.ts --reporter=verbose | tee .sisyphus/evidence/task-6-workflow-services.log`
    Expected: PASS; output shows retries create a new workflow execution for the same definition and preserve `workflow_role`
    Evidence: .sisyphus/evidence/task-6-workflow-services.log
  ```
  **Commit**: YES | Message: `feat(runtime): add execution detail command services` | Files: `packages/workflow-engine/src/services/transition-execution-*.ts`, `packages/workflow-engine/src/services/workflow-execution-*.ts`, `packages/workflow-engine/src/tests/runtime/transition-execution-services.test.ts`, `packages/workflow-engine/src/tests/runtime/workflow-execution-services.test.ts`

- [ ] 7. Add runtime API queries for overview, lists, facts, and artifacts

  **What to do**: Create `packages/api/src/routers/project-runtime.ts` and wire it into `packages/api/src/routers/project.ts` / `packages/api/src/routers/index.ts` without bloating existing handlers. Implement query procedures exactly named `project.getRuntimeOverview`, `project.getRuntimeWorkUnits`, `project.getRuntimeWorkUnitOverview`, `project.getRuntimeWorkUnitStateMachine`, `project.getRuntimeProjectFacts`, `project.getRuntimeProjectFactDetail`, `project.getRuntimeWorkUnitFacts`, `project.getRuntimeWorkUnitFactDetail`, `project.getRuntimeArtifactSlots`, `project.getRuntimeArtifactSlotDetail`, `project.getRuntimeArtifactSnapshotDialog`, and `project.getRuntimeActiveWorkflows`. Each query procedure must call exactly one top-level service method from the locked seam matrix and do no repo composition in-router.
  **Must NOT do**: Do not embed domain logic in router handlers. Do not change preview payload shape. Do not create raw SSE endpoints.
  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: [`effect-solutions`]
  - Omitted: [`hono`]
  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9, 11, 12, 13, 14 | Blocked By: 1, 5
  **References**:
  - Pattern: `packages/api/src/routers/index.ts:25-57`
  - Pattern: `packages/api/src/routers/project.ts:64-80`
  - Pattern: `packages/api/src/tests/routers/methodology.test.ts`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:1312-2400`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/api/src/tests/routers/project-runtime-queries.test.ts`
  - [ ] `bunx vitest run packages/api/src/tests/routers/project-runtime-errors.test.ts`
  - [ ] `bun run check-types`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Query contract coverage
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/project-runtime-queries.test.ts --reporter=verbose | tee .sisyphus/evidence/task-7-api-queries.log`
    Expected: PASS; output lists all runtime read procedures and their typed payload assertions
    Evidence: .sisyphus/evidence/task-7-api-queries.log

  Scenario: Empty state vs 404 semantics
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/project-runtime-errors.test.ts --reporter=verbose | tee .sisyphus/evidence/task-7-api-errors.log`
    Expected: PASS; output distinguishes missing resource failures from valid empty collections
    Evidence: .sisyphus/evidence/task-7-api-errors.log
  ```
  **Commit**: NO | Message: `feat(runtime): add runtime query router` | Files: `packages/api/src/routers/project-runtime.ts`, `packages/api/src/routers/project.ts`, `packages/api/src/routers/index.ts`, `packages/api/src/tests/routers/project-runtime-queries.test.ts`, `packages/api/src/tests/routers/project-runtime-errors.test.ts`, `packages/api/package.json`

- [ ] 8. Add runtime API streams and mutations for guidance and execution actions

  **What to do**: Extend `packages/api/src/routers/project-runtime.ts` with `project.streamRuntimeGuidanceCandidates`, `project.getRuntimeGuidanceActive`, `project.getRuntimeStartGateDetail`, `project.startTransitionExecution`, `project.switchActiveTransitionExecution`, `project.completeTransitionExecution`, `project.choosePrimaryWorkflowForTransitionExecution`, `project.getRuntimeTransitionExecutionDetail`, `project.getRuntimeWorkflowExecutionDetail`, `project.retrySameWorkflowExecution`, `project.checkArtifactSlotCurrentState`, `project.addRuntimeProjectFactValue`, `project.setRuntimeProjectFactValue`, `project.replaceRuntimeProjectFactValue`, `project.addRuntimeWorkUnitFactValue`, `project.setRuntimeWorkUnitFactValue`, and `project.replaceRuntimeWorkUnitFactValue`. Guidance streaming must use one root stream fiber with structured bounded child concurrency by work-unit group only.
  **Must NOT do**: Do not let guidance start/switch flows expose completion gates. Do not implement resume-token streaming. Do not allow workflow detail to choose a different workflow definition.
  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-solutions`]
  - Omitted: [`systematic-debugging`]
  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10, 11, 12, 15 | Blocked By: 1, 5, 6
  **References**:
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:815-993`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:2448-2867`
  - Pattern: `apps/web/src/utils/orpc.ts:11-36`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/api/src/tests/routers/project-runtime-stream.test.ts`
  - [ ] `bunx vitest run packages/api/src/tests/routers/project-runtime-mutations.test.ts`
  - [ ] `bunx vitest run packages/api/src/tests/routers/project-runtime-detail-endpoints.test.ts`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Stream envelope and reconnect semantics
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/project-runtime-stream.test.ts --reporter=verbose | tee .sisyphus/evidence/task-8-api-stream.log`
    Expected: PASS; output confirms event version `1`, allowed event types only, group-level bounded concurrency with stable within-group ordering, and reconnect behavior restarts with a fresh bootstrap
    Evidence: .sisyphus/evidence/task-8-api-stream.log

  Scenario: Mutation ownership split
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/project-runtime-mutations.test.ts packages/api/src/tests/routers/project-runtime-detail-endpoints.test.ts --reporter=verbose | tee .sisyphus/evidence/task-8-api-mutations.log`
    Expected: PASS; output proves workflow detail only retries same definition, transition detail owns choose-primary and complete actions, and fact mutations stay inside `RuntimeFactService`
    Evidence: .sisyphus/evidence/task-8-api-mutations.log
  ```
  **Commit**: YES | Message: `feat(runtime): add runtime streams and mutations` | Files: `packages/api/src/routers/project-runtime.ts`, `packages/api/src/tests/routers/project-runtime-stream.test.ts`, `packages/api/src/tests/routers/project-runtime-mutations.test.ts`, `packages/api/src/tests/routers/project-runtime-detail-endpoints.test.ts`

- [ ] 9. Cut over Project Overview and Project Facts to runtime-backed data

  **What to do**: Replace the deferred runtime copy in `apps/web/src/routes/projects.$projectId.index.tsx` with the locked Project Overview payload from `project.getRuntimeOverview`. Keep the page lean: clickable stat cards for fact types with instances, work-unit types with instances, active transitions; active workflow list; prominent `Go to Guidance` CTA. Cut `apps/web/src/routes/projects.$projectId.facts.tsx` over to `project.getRuntimeProjectFacts` and add `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx` for the locked definition-scoped Project Fact Detail surface. Wire project-fact add/set/replace controls only to `project.addRuntimeProjectFactValue`, `project.setRuntimeProjectFactValue`, and `project.replaceRuntimeProjectFactValue`.
  **Must NOT do**: Do not keep `Runtime Execution (Epic 3+)` placeholder copy. Do not add filters, history timelines, delete/clear actions, or work-unit-reference handling to Project Facts.
  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`vercel-react-best-practices`]
  - Omitted: [`web-design-guidelines`]
  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 16 | Blocked By: 7
  **References**:
  - Pattern: `apps/web/src/routes/projects.$projectId.index.tsx:386-545`
  - Pattern: `apps/web/src/tests/routes/-projects.$projectId.integration.test.tsx`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:1312-1408`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:2013-2180`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-project-overview.test.tsx`
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-project-facts.test.tsx`
  - [ ] `bunx playwright test tests/e2e/runtime-overview-and-facts.spec.ts`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Overview guidance handoff
    Tool: Playwright
    Steps: open `/projects/proj_runtime_demo`; assert `[data-testid="project-overview-active-transitions-stat"]` and `[data-testid="project-overview-go-to-guidance"]` are visible; click the CTA
    Expected: browser navigates to `/projects/proj_runtime_demo/transitions`; no text matching `Runtime Execution (Epic 3+)` remains on overview
    Evidence: .sisyphus/evidence/task-9-overview-guidance.trace.zip

  Scenario: Project fact detail current-value editing shell
    Tool: Playwright
    Steps: open `/projects/proj_runtime_demo/facts`; click `[data-testid="project-fact-card-project_priority"]`; on detail page use `[data-testid="project-fact-add-or-replace"]`
    Expected: detail page shows current effective values only; action labels are add/set/replace only; no delete/clear control exists
    Evidence: .sisyphus/evidence/task-9-project-facts.trace.zip
  ```
  **Commit**: NO | Message: `feat(runtime): cut project overview and facts to runtime data` | Files: `apps/web/src/routes/projects.$projectId.index.tsx`, `apps/web/src/routes/projects.$projectId.facts.tsx`, `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx`, `apps/web/src/tests/routes/runtime-project-overview.test.tsx`, `apps/web/src/tests/routes/runtime-project-facts.test.tsx`, `tests/e2e/runtime-overview-and-facts.spec.ts`

- [ ] 10. Cut over `/projects/$projectId/transitions` into Runtime Guidance

  **What to do**: Reuse `apps/web/src/routes/projects.$projectId.transitions.tsx` as the Runtime Guidance page. Change the page title/nav copy to Guidance while keeping the URL stable. Load `project.getRuntimeGuidanceActive` and `project.streamRuntimeGuidanceCandidates` in parallel; render exactly two sections, `Active` and `Open/Future`; use the shared start-gate drill-in dialog from `project.getRuntimeStartGateDetail`; wire `startTransitionExecution` and `switchActiveTransitionExecution`.
  **Must NOT do**: Do not add completion-gate trees or `Complete Transition` actions here. Do not split Open and Future into separate top-level sections. Do not create a separate guidance route or raw SSE client.
  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`vercel-react-best-practices`]
  - Omitted: [`dispatching-parallel-agents`]
  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 16 | Blocked By: 8
  **References**:
  - Pattern: `apps/web/src/routes/projects.$projectId.transitions.tsx:17-116`
  - Pattern: `apps/web/src/utils/orpc.ts:11-36`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:1108-1311`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-guidance.test.tsx`
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-guidance-reconnect.test.tsx`
  - [ ] `bunx playwright test tests/e2e/runtime-guidance.spec.ts`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Guidance page sections and start-gate dialog
    Tool: Playwright
    Steps: open `/projects/proj_runtime_demo/transitions`; assert `[data-testid="runtime-guidance-active-section"]` and `[data-testid="runtime-guidance-open-future-section"]`; click `[data-testid="runtime-guidance-candidate-wu_story_001-transition_start"]`; open `[data-testid="runtime-guidance-start-gate-dialog"]`
    Expected: exactly two top-level sections render; dialog shows blocked/available reasoning; no `[data-testid="complete-transition-action"]` exists on this page
    Evidence: .sisyphus/evidence/task-10-guidance.trace.zip

  Scenario: Stream reconnect
    Tool: Playwright
    Steps: open the same page, trigger mocked transport reconnect in the test harness, wait for the second bootstrap event
    Expected: Open/Future list rehydrates from the new bootstrap with no duplicate candidate rows and no stale blocked reason lingering
    Evidence: .sisyphus/evidence/task-10-guidance-reconnect.trace.zip
  ```
  **Commit**: YES | Message: `feat(runtime): cut transitions route over to runtime guidance` | Files: `apps/web/src/routes/projects.$projectId.transitions.tsx`, `apps/web/src/components/runtime/**`, `apps/web/src/tests/routes/runtime-guidance.test.tsx`, `apps/web/src/tests/routes/runtime-guidance-reconnect.test.tsx`, `tests/e2e/runtime-guidance.spec.ts`

- [ ] 11. Cut over Work Units list, Work Unit Overview, and Work Unit State Machine shell

  **What to do**: Convert `apps/web/src/routes/projects.$projectId.work-units.tsx` from methodology-preview content to the runtime instance index returned by `project.getRuntimeWorkUnits`. Add `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.tsx` for the Work Unit Overview and `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.state-machine.tsx` for the Work Unit State Machine.
  **Must NOT do**: Do not show future/inactive-instantiation opportunities on the state-machine page. Do not add transition history browsing to overview. Do not add gate trees inline on overview.
  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`vercel-react-best-practices`]
  - Omitted: [`vercel-composition-patterns`]
  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 13, 14, 16 | Blocked By: 7, 8
  **References**:
  - Pattern: `apps/web/src/routes/projects.$projectId.work-units.tsx:16-32`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:1409-1708`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:2870-2993`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-work-units.test.tsx`
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-work-unit-overview.test.tsx`
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-work-unit-state-machine.test.tsx`
  - [ ] `bunx playwright test tests/e2e/runtime-work-units.spec.ts`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Work-unit list to overview navigation
    Tool: Playwright
    Steps: open `/projects/proj_runtime_demo/work-units`; assert `[data-testid="runtime-work-units-table"]`; click `[data-testid="runtime-work-unit-row-wu_story_001"]`
    Expected: browser navigates to `/projects/proj_runtime_demo/work-units/wu_story_001`; overview shows `[data-testid="work-unit-overview-page"]` and summary cards for facts, state machine, and artifact slots
    Evidence: .sisyphus/evidence/task-11-work-units.trace.zip

  Scenario: State machine alternative switch surface
    Tool: Playwright
    Steps: open `/projects/proj_runtime_demo/work-units/wu_story_001/state-machine`; assert `[data-testid="work-unit-state-machine-page"]`; open `[data-testid="start-gate-drill-in-transition_alt"]`
    Expected: active transition panel is visible; possible transitions act as switch candidates; no future-instantiation cards render on this page
    Evidence: .sisyphus/evidence/task-11-state-machine.trace.zip
  ```
  **Commit**: NO | Message: `feat(runtime): cut work-unit list and state surfaces` | Files: `apps/web/src/routes/projects.$projectId.work-units.tsx`, `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.tsx`, `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.state-machine.tsx`, `apps/web/src/tests/routes/runtime-work-units.test.tsx`, `apps/web/src/tests/routes/runtime-work-unit-overview.test.tsx`, `apps/web/src/tests/routes/runtime-work-unit-state-machine.test.tsx`, `tests/e2e/runtime-work-units.spec.ts`

- [ ] 12. Add Active Workflows page and execution-route shells/navigation

  **What to do**: Add `apps/web/src/routes/projects.$projectId.workflows.tsx` for the active-only workflow execution table and create the route shells for `projects.$projectId.transition-executions.$transitionExecutionId.tsx` and `projects.$projectId.workflow-executions.$workflowExecutionId.tsx` with their shared layout/navigation plumbing, breadcrumb context, and loader boundaries.
  **Must NOT do**: Do not add a status column to Active Workflows. Do not implement full detail-page bodies in this task. Do not create a project-wide historical workflows browser.
  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`vercel-react-best-practices`]
  - Omitted: [`web-design-guidelines`]
  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 15, 16 | Blocked By: 7, 8
  **References**:
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:2994-3113`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:2679-2867`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-active-workflows.test.tsx`
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-execution-route-shells.test.tsx`
  - [ ] `bunx playwright test tests/e2e/runtime-active-workflows.spec.ts`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Active workflows to workflow detail handoff
    Tool: Playwright
    Steps: open `/projects/proj_runtime_demo/workflows`; assert `[data-testid="runtime-active-workflows-table"]`; click `[data-testid="runtime-active-workflow-row-we_story_start_primary_001"]`
    Expected: browser navigates to `/projects/proj_runtime_demo/workflow-executions/we_story_start_primary_001`; shell route loads without deferred-copy placeholders
    Evidence: .sisyphus/evidence/task-12-active-workflows.trace.zip

  Scenario: Guidance card to transition detail handoff
    Tool: Playwright
    Steps: open `/projects/proj_runtime_demo/transitions`; click `[data-testid="runtime-guidance-active-card-wu_story_001"] [data-testid="open-transition-detail"]`
    Expected: browser navigates to `/projects/proj_runtime_demo/transition-executions/te_story_start_001`; shell route receives correct params and breadcrumb context
    Evidence: .sisyphus/evidence/task-12-transition-shell.trace.zip
  ```
  **Commit**: YES | Message: `feat(runtime): add active workflow index and execution route shells` | Files: `apps/web/src/routes/projects.$projectId.workflows.tsx`, `apps/web/src/routes/projects.$projectId.transition-executions.$transitionExecutionId.tsx`, `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`, `apps/web/src/tests/routes/runtime-active-workflows.test.tsx`, `apps/web/src/tests/routes/runtime-execution-route-shells.test.tsx`, `tests/e2e/runtime-active-workflows.spec.ts`

- [ ] 13. Implement Work Unit Facts list/detail routes

  **What to do**: Add `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.facts.tsx` and `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.facts.$factDefinitionId.tsx`. The list page must render exactly two tabs, `Primitive` and `Work Units`. The detail page is definition-scoped, not instance-scoped, and exposes add/set/replace actions only via `project.addRuntimeWorkUnitFactValue`, `project.setRuntimeWorkUnitFactValue`, and `project.replaceRuntimeWorkUnitFactValue`.
  **Must NOT do**: Do not add delete/clear actions. Do not mix project facts into these routes. Do not collapse outgoing/incoming into a single undifferentiated list.
  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`vercel-react-best-practices`]
  - Omitted: [`vercel-composition-patterns`]
  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 16 | Blocked By: 11
  **References**:
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:1731-2012`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:916-921`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-work-unit-facts.test.tsx`
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-work-unit-fact-detail.test.tsx`
  - [ ] `bunx playwright test tests/e2e/runtime-work-unit-facts.spec.ts`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Work-unit facts tab split
    Tool: Playwright
    Steps: open `/projects/proj_runtime_demo/work-units/wu_story_001/facts`; click `[data-testid="work-unit-facts-tab-primitive"]`, then `[data-testid="work-unit-facts-tab-work-units"]`
    Expected: Primitive tab shows non-reference fact cards only; Work Units tab shows `Outgoing` section before `Incoming`
    Evidence: .sisyphus/evidence/task-13-work-unit-facts.trace.zip

  Scenario: Definition-scoped fact detail
    Tool: Playwright
    Steps: on the Work Units tab, click `[data-testid="work-unit-fact-card-dependency_blocks"]`; inspect `[data-testid="work-unit-fact-detail-page"]`
    Expected: page is keyed by fact definition, not a single fact-instance ID; only add/set/replace controls render
    Evidence: .sisyphus/evidence/task-13-work-unit-fact-detail.trace.zip
  ```
  **Commit**: NO | Message: `feat(runtime): add work-unit fact routes` | Files: `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.facts.tsx`, `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.facts.$factDefinitionId.tsx`, `apps/web/src/tests/routes/runtime-work-unit-facts.test.tsx`, `apps/web/src/tests/routes/runtime-work-unit-fact-detail.test.tsx`, `tests/e2e/runtime-work-unit-facts.spec.ts`

- [ ] 14. Implement Artifact Slots, Artifact Slot Detail, and Artifact Snapshot Dialog

  **What to do**: Add `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.artifact-slots.tsx` and `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.artifact-slots.$slotDefinitionId.tsx`, plus an Artifact Snapshot Dialog component opened from the detail page. The slots page renders one card per slot with latest effective snapshot summary only. The detail page renders current effective snapshot first and lineage/history second. The dialog renders snapshot-specific delta/member drill-in. Wire `project.checkArtifactSlotCurrentState` only on the detail page.
  **Must NOT do**: Do not add file-content viewers, artifact upload/edit flows, or inline mutation on the slots overview page. Do not hide lineage when the latest head resolves to zero live members.
  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`vercel-react-best-practices`]
  - Omitted: [`web-design-guidelines`]
  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 16 | Blocked By: 11
  **References**:
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:2181-2400`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:3114-3188`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:2308`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-artifact-slots.test.tsx`
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-artifact-slot-detail.test.tsx`
  - [ ] `bunx playwright test tests/e2e/runtime-artifacts.spec.ts`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Artifact slots overview to detail
    Tool: Playwright
    Steps: open `/projects/proj_runtime_demo/work-units/wu_story_001/artifact-slots`; click `[data-testid="artifact-slot-card-design_doc"]`
    Expected: detail page loads `[data-testid="artifact-slot-detail-page"]`; current effective snapshot section renders above lineage history
    Evidence: .sisyphus/evidence/task-14-artifact-detail.trace.zip

  Scenario: Missing root path / zero-live-member handling
    Tool: Playwright
    Steps: open the mocked missing-root-path case and the zero-live-member case from the detail page test fixture; trigger `[data-testid="check-artifact-slot-current-state"]`
    Expected: missing root path renders unavailable/error messaging; zero-live-member lineage still renders with `exists = false` and empty members list
    Evidence: .sisyphus/evidence/task-14-artifact-edge.trace.zip
  ```
  **Commit**: NO | Message: `feat(runtime): add artifact slot routes and dialog` | Files: `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.artifact-slots.tsx`, `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.artifact-slots.$slotDefinitionId.tsx`, `apps/web/src/components/runtime/artifact-snapshot-dialog.tsx`, `apps/web/src/tests/routes/runtime-artifact-slots.test.tsx`, `apps/web/src/tests/routes/runtime-artifact-slot-detail.test.tsx`, `tests/e2e/runtime-artifacts.spec.ts`

- [ ] 15. Implement Transition Execution Detail and Workflow Execution Detail pages

  **What to do**: Fill in the route shells from Task 12. `projects.$projectId.transition-executions.$transitionExecutionId.tsx` must render, in order: transition definition, current primary workflow, completion gate panel, primary attempt history, supporting workflows. Wire `project.choosePrimaryWorkflowForTransitionExecution` and `project.completeTransitionExecution` here only. `projects.$projectId.workflow-executions.$workflowExecutionId.tsx` must render workflow summary, parent transition/work-unit context, retry/supersession lineage, and explicit “steps coming later” L3-deferred messaging. Wire `project.retrySameWorkflowExecution` here only.
  **Must NOT do**: Do not add same-definition retry controls to transition detail. Do not allow choose-different-workflow from workflow detail. Do not add step drill-downs or step tables.
  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`vercel-react-best-practices`]
  - Omitted: [`brainstorming`]
  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 16 | Blocked By: 8, 12
  **References**:
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:2448-2697`
  - Draft: `.sisyphus/drafts/runtime-project-context-revision.md:2700-3276`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-transition-execution-detail.test.tsx`
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-workflow-execution-detail.test.tsx`
  - [ ] `bunx playwright test tests/e2e/runtime-execution-details.spec.ts`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Transition detail action ownership
    Tool: Playwright
    Steps: open `/projects/proj_runtime_demo/transition-executions/te_story_start_001`; assert the five sections in order using `[data-testid="transition-definition-section"]`, `[data-testid="transition-primary-workflow-section"]`, `[data-testid="transition-completion-gates-section"]`, `[data-testid="transition-primary-attempt-history-section"]`, `[data-testid="transition-supporting-workflows-section"]`; click `[data-testid="choose-primary-workflow-action"]`
    Expected: transition detail contains choose-primary and complete actions; no retry-same-workflow control exists here
    Evidence: .sisyphus/evidence/task-15-transition-detail.trace.zip

  Scenario: Workflow detail retry-only behavior
    Tool: Playwright
    Steps: open `/projects/proj_runtime_demo/workflow-executions/we_story_start_primary_001`; click `[data-testid="retry-same-workflow-action"]`
    Expected: page shows explicit `Steps coming later` messaging; retry action preserves the same workflow definition and no choose-different-workflow control exists
    Evidence: .sisyphus/evidence/task-15-workflow-detail.trace.zip
  ```
  **Commit**: YES | Message: `feat(runtime): add execution detail pages` | Files: `apps/web/src/routes/projects.$projectId.transition-executions.$transitionExecutionId.tsx`, `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`, `apps/web/src/tests/routes/runtime-transition-execution-detail.test.tsx`, `apps/web/src/tests/routes/runtime-workflow-execution-detail.test.tsx`, `tests/e2e/runtime-execution-details.spec.ts`

- [ ] 16. Remove preview-runtime leftovers, add governance locks, and finalize cutover verification

  **What to do**: Delete or neutralize preview-only runtime helpers that should no longer back the cutover surfaces, including deferred runtime copy, preview-only normalizers used solely for the replaced runtime surfaces, and any route code still reading runtime data from `project.getProjectDetails`. Keep preview support only where non-runtime project pages still need it. Add architecture/governance tests that enforce the ownership matrix and route-level query-key separation tests so runtime caches never collide with preview caches.
  **Must NOT do**: Do not remove `project.getProjectDetails` entirely if non-runtime callers still exist. Do not collapse preview and runtime contracts into one payload. Do not weaken the boundary tests to allow package drift.
  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`verification-before-completion`]
  - Omitted: [`finishing-a-development-branch`]
  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification Wave | Blocked By: 9-15
  **References**:
  - Pattern: `packages/project-context/src/tests/architecture/core-boundary-lock.test.ts`
  - Pattern: `apps/web/src/tests/routes/-projects.$projectId.integration.test.tsx`
  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/architecture/runtime-boundary-lock.test.ts packages/api/src/tests/architecture/runtime-router-boundary.test.ts packages/project-context/src/tests/architecture/runtime-boundary.test.ts`
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-query-key-separation.test.tsx`
  - [ ] `bun run test`, `bun run test:layout:guardrail`, and `bunx playwright test tests/e2e/runtime-*.spec.ts`
  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Boundary enforcement
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/architecture/runtime-boundary-lock.test.ts packages/api/src/tests/architecture/runtime-router-boundary.test.ts packages/project-context/src/tests/architecture/runtime-boundary.test.ts --reporter=verbose | tee .sisyphus/evidence/task-16-boundaries.log`
    Expected: PASS; output confirms runtime logic stays out of forbidden packages and no `step_executions` seam is introduced
    Evidence: .sisyphus/evidence/task-16-boundaries.log

  Scenario: Final cutover regression suite
    Tool: Bash
    Steps: run `bun run test | tee .sisyphus/evidence/task-16-root-test.log && bun run test:layout:guardrail | tee .sisyphus/evidence/task-16-layout.log && bunx playwright test tests/e2e/runtime-*.spec.ts | tee .sisyphus/evidence/task-16-playwright.log`
    Expected: all commands exit 0; no runtime routes still depend on preview-only deferred helpers
    Evidence: .sisyphus/evidence/task-16-root-test.log
  ```
  **Commit**: YES | Message: `chore(runtime): finalize cutover and lock architecture boundaries` | Files: `apps/web/src/routes/**`, `apps/web/src/tests/routes/runtime-query-key-separation.test.tsx`, `packages/workflow-engine/src/tests/architecture/runtime-boundary-lock.test.ts`, `packages/api/src/tests/architecture/runtime-router-boundary.test.ts`, `packages/project-context/src/tests/architecture/runtime-boundary.test.ts`, `tests/e2e/runtime-*.spec.ts`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle

  **Tool**: `task(subagent_type="oracle")`
  **Input**: `.sisyphus/plans/unified-l1-l2-runtime-slice.md`, implementation diff/changed files, runtime evidence logs under `.sisyphus/evidence/`
  **Steps**:
  1. Compare completed work against every numbered task and the locked procedure/service/repo matrix.
  2. Verify no implementation introduced L3 step-execution UI/orchestration or router-side business logic.
  3. Write findings to `.sisyphus/evidence/f1-plan-compliance.md`.
  **Expected**: Oracle returns APPROVE with no unresolved scope or seam violations.
  **Evidence**: `.sisyphus/evidence/f1-plan-compliance.md`

- [ ] F2. Code Quality Review — unspecified-high

  **Tool**: `task(category="unspecified-high")`
  **Input**: changed runtime files across `packages/contracts`, `packages/db`, `packages/workflow-engine`, `packages/api`, `apps/web`, plus relevant tests
  **Steps**:
  1. Review for type safety, Effect layer composition, typed error handling, repository/service boundary discipline, and query-key separation.
  2. Confirm every runtime procedure calls exactly one top-level service and repos are not composed in routers.
  3. Write findings to `.sisyphus/evidence/f2-code-quality.md`.
  **Expected**: Reviewer returns APPROVE with no critical or high-severity defects.
  **Evidence**: `.sisyphus/evidence/f2-code-quality.md`

- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)

  **Tool**: `task(category="unspecified-high")` plus `Playwright`
  **Steps**:
  1. Run `bun run test | tee .sisyphus/evidence/f3-root-test.log`.
  2. Run `bun run test:layout:guardrail | tee .sisyphus/evidence/f3-layout.log`.
  3. Run `bunx playwright test tests/e2e/runtime-*.spec.ts --reporter=line | tee .sisyphus/evidence/f3-playwright.log`.
  4. Reviewer inspects the Playwright results and spot-checks that guidance, work units, facts, artifacts, transition detail, and workflow detail match the locked scope only.
  5. Write QA verdict to `.sisyphus/evidence/f3-manual-qa.md`.
  **Expected**: all commands exit 0, Playwright passes, and reviewer returns APPROVE with no scope-expanding UI behavior.
  **Evidence**: `.sisyphus/evidence/f3-root-test.log`, `.sisyphus/evidence/f3-layout.log`, `.sisyphus/evidence/f3-playwright.log`, `.sisyphus/evidence/f3-manual-qa.md`

- [ ] F4. Scope Fidelity Check — deep

  **Tool**: `task(category="deep")`
  **Input**: plan file, completed implementation, verification artifacts from F1-F3
  **Steps**:
  1. Re-check IN vs OUT boundaries from the plan and canonical runtime draft.
  2. Confirm no hidden regressions in `project_executions` ownership, `RuntimeGateService` scope, guidance fiber model, or preview/runtime cutover separation.
  3. Write findings to `.sisyphus/evidence/f4-scope-fidelity.md`.
  **Expected**: reviewer returns APPROVE with explicit confirmation that L3 remains deferred and all L1/L2 seams match the locked model.
  **Evidence**: `.sisyphus/evidence/f4-scope-fidelity.md`

## Commit Strategy
- Commit 1: lock runtime contracts, compatibility decisions, route inventory, package scripts, and failing fixtures.
- Commit 2: add runtime schema/migrations and legacy-history-aware repin bridge.
- Commit 3: add runtime repository layers and lineage/current-selection tests.
- Commit 4: add workflow-engine runtime services and API router contracts.
- Commit 5: cut over overview/guidance/list surfaces.
- Commit 6: cut over facts/artifacts/execution detail pages.
- Commit 7: remove preview-runtime deferred leftovers, add governance tests, and refresh fixtures after all verification is green.

## Success Criteria
- Every locked L1/L2 route/surface in the canonical draft exists with runtime-backed data and no preview placeholder copy.
- All retry/switch/complete invariants are enforced and covered by automated tests.
- Repin is blocked by both legacy and new runtime history without new writes to `project_executions`.
- Runtime Guidance stream behavior is typed, restart-safe, and parity-tested against the synchronous Active section.
- No file or package in the final implementation violates the ownership matrix or introduces L3 step execution scope.
