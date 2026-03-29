## 2026-03-28 - Wave 1 Task 1 runtime contract freeze

### Files created
- `packages/contracts/src/runtime/status.ts`
- `packages/contracts/src/runtime/conditions.ts`
- `packages/contracts/src/runtime/overview.ts`
- `packages/contracts/src/runtime/guidance.ts`
- `packages/contracts/src/runtime/work-units.ts`
- `packages/contracts/src/runtime/facts.ts`
- `packages/contracts/src/runtime/artifacts.ts`
- `packages/contracts/src/runtime/executions.ts`
- `packages/contracts/src/runtime/index.ts`
- `packages/contracts/src/tests/runtime/runtime-contracts.test.ts`
- `packages/contracts/src/tests/runtime/runtime-cutover-rules.test.ts`

### Key schema decisions
- Locked runtime route inventory in `RUNTIME_ROUTE_INVENTORY` and enforced it with `RuntimeRoutePage` literal schema.
- Locked runtime guidance stream envelope to version `"1"` and stream event taxonomy to exactly `bootstrap | transitionResult | workUnitDone | done | error`.
- Locked condition kinds to exactly `fact | work_unit_fact | artifact` and artifact operators to exactly `exists | stale | fresh`.
- Encoded legacy-compatibility guardrails in runtime contracts:
  - `project_executions` modeled as `legacy_read_only` only with `writesAllowed: false`.
  - `step_executions` represented as excluded L3 entity (`RuntimeExcludedL3Entity`) and no L3 step runtime contracts exported.
- Kept runtime contracts schema-only (Effect/Schema), with no runtime implementation logic and no DB/router behavior.

### Deviations from plan
- Added an explicit `active-workflows` route slug to the locked route inventory to match the draft’s active-workflow page contract surface and prevent implicit drift.
- Added `goToGuidanceHref` to overview output alongside the target object because the expected outcome explicitly requested this field.

## 2026-03-28 - Wave 1 Task 2 runtime schema + repin history bridge

### Schema decisions made
- Added `projects.project_root_path` as the only persisted runtime anchor field for project filesystem/git context.
- Introduced locked L1/L2 runtime tables in `packages/db/src/schema/runtime.ts`:
  - `project_work_units`
  - `transition_executions`
  - `workflow_executions`
  - `project_fact_instances`
  - `work_unit_fact_instances`
  - `project_artifact_snapshots`
  - `artifact_snapshot_files`
- Kept `project_executions` untouched and read-only (no rename, no write-path changes).
- Used immutable-lineage fields for runtime entities (`superseded_by_*`) plus explicit execution provenance on fact tables and `workflow_role` on workflow executions.
- Preserved artifact-file lock fields only (`member_status`, `git_commit_hash`, `git_blob_hash`) without policy/delete/blob payload expansions.

### Migration approach
- Added `packages/db/src/migrations/0001_runtime_l1_l2.sql` to introduce runtime tables + indexes and append `projects.project_root_path` via `ALTER TABLE`.
- Applied explicit FK topology from runtime rows to project/methodology definitions and runtime parents, with self-lineage FKs for immutable supersession chains.
- Included targeted lineage/query indexes per table for project-scoped and parent-scoped existence checks used by repin policy.

### Repin bridge implementation details
- Replaced `hasPersistedExecutions` with `hasExecutionHistoryForRepin` at repository/service boundaries.
- Added a runtime-history-aware predicate in `packages/db/src/project-context-repository.ts` that blocks repin if either condition is true:
  - legacy `project_executions` rows exist for the project, or
  - any new runtime rows exist (directly or via joins back to project scope).
- Reused the same runtime-history predicate inside `repinProjectMethodologyVersion` transaction guard to avoid divergence between precheck and write-time enforcement.
- Added lock/bridge tests:
  - `packages/db/src/tests/schema/runtime-schema.test.ts`
  - `packages/project-context/src/tests/service/runtime-history-repin.test.ts`

## 2026-03-28 - Wave 1 Task 4 runtime fact/artifact repositories

### Fact lineage reconstruction approach
- Added runtime fact ports under `packages/workflow-engine/src/repositories/`:
  - `project-fact-repository.ts`
  - `work-unit-fact-repository.ts`
- Implemented DB-backed layers:
  - `packages/db/src/runtime-repositories/project-fact-repository.ts`
  - `packages/db/src/runtime-repositories/work-unit-fact-repository.ts`
- Current-state projection for facts is enforced as latest effective frontier only:
  - select rows where `status = active`
  - exclude rows with `superseded_by_fact_instance_id` set
  - scope by `(project_id, fact_definition_id)` for project facts and `(project_work_unit_id, fact_definition_id)` for work-unit facts
- Supersession uses immutable lineage updates only (no in-place value edits):
  - `supersedeFactInstance` marks the older row `status = superseded`
  - writes `superseded_by_fact_instance_id` to point at the newer replacement row
- Work-unit-reference facts are rigidly stored via `referenced_project_work_unit_id` with `value_json = null`; primitive facts keep `value_json` and null reference id.

### Artifact current-state reconstruction details
- Added artifact port and DB layer:
  - `packages/workflow-engine/src/repositories/artifact-repository.ts`
  - `packages/db/src/runtime-repositories/artifact-repository.ts`
- Snapshot lineage is parent-row based (`project_artifact_snapshots`) with member deltas in `artifact_snapshot_files`.
- Head snapshot selection:
  - choose latest non-superseded parent row (`superseded_by_project_artifact_snapshot_id IS NULL`), deterministic by `(created_at DESC, id DESC)`.
- Effective member reconstruction:
  - walk lineage from root → head
  - apply per-snapshot delta rows by `file_path`
  - `member_status = present` inserts/replaces live member
  - `member_status = removed` deletes live member
  - output live members only, sorted by `filePath`
- Freshness check behavior:
  - loads current effective snapshot first
  - uses `projects.project_root_path` as git anchor
  - compares stored member `git_blob_hash`/`git_commit_hash` to HEAD state (`git ls-tree`, `git log -1 -- <file>`)
  - returns `fresh` when all tracked signals match, `stale` on mismatch, `unavailable` when root path/git context cannot be resolved.

### Zero-live-member handling
- If latest artifact lineage head resolves to zero live members after applying present/removed deltas:
  - `getCurrentSnapshotBySlot` returns `exists = false`
  - `members = []`
  - latest head snapshot metadata is still returned
  - lineage history remains intact and queryable (history is not dropped when current effective set is empty).

## 2026-03-28 - Wave 1 Task 3 runtime execution repositories

### Repository port design decisions
- Added a dedicated runtime repository port family in `packages/workflow-engine/src/repositories/`:
  - `ProjectWorkUnitRepository` for work-unit anchor CRUD/list/pointer update only.
  - `TransitionExecutionRepository` for transition execution lifecycle start/switch/get-active operations.
  - `WorkflowExecutionRepository` for workflow execution create/complete/supersede/retry and transition primary pointer updates.
  - `ExecutionReadRepository` for joined read models (transition/workflow detail and active workflow projections), keeping write repos narrow.
- Added `packages/workflow-engine/src/errors.ts` with a dedicated `RepositoryError` so runtime ports can remain Effect-first without depending on unrelated package error types.
- Kept status/role row contracts explicit in port-level row types (`TransitionExecutionStatus`, `WorkflowExecutionStatus`, `WorkflowExecutionRole`) to prevent implicit widening across layers.

### Atomic operation patterns used
- Implemented `startTransitionExecution` as one DB transaction:
  1. insert new `transition_executions` row (`status = active`)
  2. update `project_work_units.active_transition_execution_id` to the inserted transition id
- Implemented `switchActiveTransitionExecution` as one DB transaction:
  1. read current active transition from the work-unit pointer
  2. insert new active transition row
  3. mark prior active transition as `superseded` with `superseded_by_transition_execution_id` + `superseded_at`
  4. mark prior active primary workflow as `parent_superseded` when applicable
  5. update work-unit active transition pointer to the new transition id
- Implemented `retryWorkflowExecution` as one DB transaction:
  1. load prior workflow execution
  2. insert new workflow execution for same `transition_execution_id` + `workflow_id` + `workflow_role`
  3. supersede prior active execution via `superseded_by_workflow_execution_id` + `superseded_at`
  4. if role is `primary`, update `transition_executions.primary_workflow_execution_id`

### Pointer update challenges / resolutions
- Challenge: ensuring no double-active lineage after transition switch/retry.
  - Resolution: update prior active rows with status + supersession pointers inside the same transaction as new-row insert and pointer moves.
- Challenge: preserving read-side joins without bloating write repos.
  - Resolution: moved all multi-table projections (transition/workflow detail, active workflows by project) into `ExecutionReadRepository` only.
- Challenge: preventing cross-package type drift for new runtime repos.
  - Resolution: exported all runtime repo layers from `packages/db/src/index.ts` and added `@chiron/workflow-engine` as a `packages/db` dependency.

## 2026-03-28 - Wave 2 Task 5 runtime projection services

### Service layer architecture decisions
- Added a dedicated runtime service family under `packages/workflow-engine/src/services/`:
  - `runtime-gate-service.ts`
  - `runtime-guidance-service.ts`
  - `runtime-overview-service.ts`
  - `runtime-work-unit-service.ts`
  - `runtime-workflow-index-service.ts`
  - `runtime-fact-service.ts`
  - `runtime-artifact-service.ts`
- Kept services Effect-first with `Context.Tag` + `Layer.effect` and repository-only dependencies (no router/SQL leakage).
- Introduced a composed runtime live layer in `packages/workflow-engine/src/layers/live.ts` with dependency-safe composition:
  - base runtime services merged first (`gate`, `workflow-index`, `fact`, `artifact`)
  - dependent services provided from base (`overview`, `guidance`, `work-unit`)
  - avoids `Layer.mergeAll` dependency warning/failure in typecheck.
- Exported runtime services and runtime live layer from `packages/workflow-engine/src/index.ts`.

### Gate evaluation concurrency/short-circuit approach
- `RuntimeGateService` now exposes exactly:
  - `evaluateStartGate(...)`
  - `evaluateCompletionGate(...)`
- Condition-tree evaluation is deterministic and short-circuiting by mode:
  - `all` stops on the first unmet condition/group.
  - `any` stops on the first met condition/group.
- Supported condition kinds are strictly:
  - `fact`
  - `work_unit_fact`
  - `artifact`
- Unsupported condition kinds are rejected with `UnsupportedConditionKindError`.
- Artifact operators mapped to repository freshness checks:
  - `exists` => snapshot existence
  - `fresh` => exists + freshness `fresh`
  - `stale` => exists + freshness `stale`

### Stream orchestration patterns
- `RuntimeGuidanceService` owns stream orchestration and delegates gate semantics to `RuntimeGateService`.
- `streamCandidates(...)` emits the locked event taxonomy in order:
  - `bootstrap`
  - `transitionResult` (per candidate)
  - `workUnitDone` (per card/group)
  - `done`
  - `error` (fallback path)
- Candidate evaluation uses bounded structured concurrency at work-unit-card level via Effect `forEach(..., { concurrency })`, while preserving stable transition ordering inside each card.
- Active guidance projection remains persistence-driven (`project_work_units` + execution read models + fact/artifact summaries) and keeps completion readiness as a lightweight delegated gate hint.

## 2026-03-28 - Wave 2 Task 6 transition/workflow execution services

### Command service patterns used
- Split runtime services into read-model detail services and command services:
  - `TransitionExecutionDetailService` + `TransitionExecutionCommandService`
  - `WorkflowExecutionDetailService` + `WorkflowExecutionCommandService`
- Command services use Effect Tag services with explicit repository dependencies and guarded error paths via `RepositoryError`.
- `completeTransitionExecution` performs live completion-gate re-evaluation immediately before write path and hard-fails on gate-blocked state.
- `choosePrimaryWorkflowForTransitionExecution` routes through an atomic-capability adapter that creates a new primary attempt and supersedes the previous primary pointer target.
- `retrySameWorkflowExecution` always creates a new execution for the same workflow definition and only repoints transition primary workflow when role is `primary`.

### Transaction boundaries and atomicity approach
- Transition start/switch command paths rely on repository transaction primitives (`startTransitionExecution`, `switchActiveTransitionExecution`) then attach primary workflow execution.
- Transition completion path requires an atomic repository capability (`completeTransitionExecutionAtomically`) so completion status/state update/active-pointer clear occur as one write unit.
- Choose-primary path requires an atomic repository capability (`choosePrimaryWorkflowForTransitionExecutionAtomically`) to ensure new primary execution creation + supersession lineage + primary pointer update remain consistent.
- Workflow retry path keeps lineage immutable by writing a new workflow execution row; it supersedes the prior row when prior status is `active`, and preserves historical completed attempts.

### Gate pre-check integration
- `TransitionExecutionCommandService.startTransitionExecution` and `switchActiveTransitionExecution` run `evaluateStartGate(...)` pre-checks before writes.
- `TransitionExecutionDetailService` uses `evaluateCompletionGate(...)` to compute completion panel state for read model display.
- `TransitionExecutionCommandService.completeTransitionExecution` re-runs `evaluateCompletionGate(...)` against live truth before allowing state transition completion writes.
- `TransitionExecutionCommandService.choosePrimaryWorkflowForTransitionExecution` refreshes completion-gate context before selecting a new primary workflow attempt.

## 2026-03-28 - Wave 2 Task 7 runtime API query router

### Router design patterns used
- Kept runtime query handlers in `packages/api/src/routers/project-runtime.ts` and mounted them into `createProjectRouter(...)` via object spread so preview/project handlers stay separate from runtime transport concerns.
- Added one zod input schema per runtime read surface and kept each handler thin: validate input, resolve exactly one top-level Effect service, return its payload unchanged.
- Reused the existing task-8 runtime router file instead of bloating `project.ts`, so query, stream, and mutation procedures can share one runtime-specific transport module.

### oRPC integration approach
- Exposed all runtime read procedures directly on the `project` router namespace (`getRuntimeOverview`, `getRuntimeWorkUnits`, `getRuntimeWorkUnitOverview`, `getRuntimeWorkUnitStateMachine`, `getRuntimeProjectFacts`, `getRuntimeProjectFactDetail`, `getRuntimeWorkUnitFacts`, `getRuntimeWorkUnitFactDetail`, `getRuntimeArtifactSlots`, `getRuntimeArtifactSlotDetail`, `getRuntimeArtifactSnapshotDialog`, `getRuntimeActiveWorkflows`).
- Used `publicProcedure.input(...).handler(...)` for all read endpoints and passed request payloads straight through to the locked seam service method without repo composition or API-layer business rules.
- Added focused router tests that assert each procedure is mounted and each call hits only the expected top-level service method once.

### Error handling strategy
- Switched runtime router execution to `Effect.runPromiseExit(...)` + `Cause.failureOption(...)` so typed Effect failures survive transport mapping instead of collapsing into FiberFailure wrappers.
- Centralized runtime transport mapping in `mapEffectError(...)`: `*NotFoundError` tags map to `NOT_FOUND`, `RepositoryError` maps to `INTERNAL_SERVER_ERROR`, unsupported condition kinds map to `BAD_REQUEST`, and unknown failures bubble as internal errors with the underlying message.
- Added error tests covering empty-list success semantics, tagged not-found mapping, repository failure mapping, and unknown failure fallback.

## 2026-03-28 - Wave 2 Task 8 runtime API streams + mutations router

### Stream implementation patterns
- Added `packages/api/src/routers/project-runtime.ts` as a thin runtime router that delegates stream/query/mutation work to top-level runtime services via `runEffect(...)`.
- Implemented `streamRuntimeGuidanceCandidates` as direct delegation to `RuntimeGuidanceService.streamCandidates(...)` with no router-side buffering, fan-out, or resume-token logic, preserving a single service-owned root stream fiber and group-bounded evaluation semantics.
- Added `getRuntimeGuidanceActive` and `getRuntimeStartGateDetail` as separate read endpoints so Active query and Open/Future stream remain transport-split and independently callable.

### Mutation endpoint design
- Added transition/workflow execution command endpoints:
  - `startTransitionExecution`
  - `switchActiveTransitionExecution`
  - `completeTransitionExecution`
  - `choosePrimaryWorkflowForTransitionExecution`
  - `retrySameWorkflowExecution`
- Added fact mutation endpoints for project and work-unit scopes:
  - `addRuntimeProjectFactValue`, `setRuntimeProjectFactValue`, `replaceRuntimeProjectFactValue`
  - `addRuntimeWorkUnitFactValue`, `setRuntimeWorkUnitFactValue`, `replaceRuntimeWorkUnitFactValue`
- Added detail/check query endpoints:
  - `getRuntimeTransitionExecutionDetail`
  - `getRuntimeWorkflowExecutionDetail`
  - `checkArtifactSlotCurrentState`
- Router procedures stay thin: each endpoint delegates to exactly one top-level service method.

### Error handling in mutations
- Standardized router-level Effect error mapping:
  - `RepositoryError` -> `INTERNAL_SERVER_ERROR` with repository-failure message.
  - `UnsupportedConditionKindError` -> `BAD_REQUEST`.
  - fallback -> `INTERNAL_SERVER_ERROR` with stringified cause.
- Added explicit `NOT_FOUND` behavior for transition/workflow detail read endpoints when service returns `null`.
- Kept mutation handlers transport-only with no gate/orchestration business logic added in router scope.

## 2026-03-28 - Wave 3 Task 12 active workflows + execution route shells

### Shell route patterns
- Added runtime execution shell routes at:
  - `apps/web/src/routes/projects.$projectId.transition-executions.$transitionExecutionId.tsx`
  - `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`
- Shell routes use runtime-prefixed query keys and explicit shell boundaries:
  - `runtime-transition-execution-shell`
  - `runtime-workflow-execution-shell`
- Transition shell hydrates shared runtime context through `runtime-guidance-active` and optionally preloads detail when `projectWorkUnitId` is available in search params.
- Workflow shell preloads `project.getRuntimeWorkflowExecutionDetail` in route loader and keeps body intentionally shell-only for Task 15 fill-in.

### Breadcrumb setup
- Active workflows route uses `MethodologyWorkspaceShell` segments: `Projects -> {projectId} -> Active Workflows`.
- Transition execution shell uses: `Projects -> {projectId} -> Guidance -> {transitionExecutionId}`.
- Workflow execution shell uses: `Projects -> {projectId} -> Active Workflows -> {workflowExecutionId}`.
- Guidance active cards now expose transition/workflow detail entry points with route-safe params:
  - transition link includes search context `projectWorkUnitId` for breadcrumb/detail hydration.

### Navigation flow
- Added project-scope sidebar links for `Guidance` and `Active Workflows` and active-state matching for:
  - `/projects/$projectId/transition-executions/*`
  - `/projects/$projectId/workflow-executions/*`
- Active workflows table (`/projects/$projectId/workflows`) is active-only, no status column, and routes to workflow execution shell via row+primary link CTA.
- Guidance active cards now include explicit shell navigation CTAs:
  - `open-transition-detail`
  - `open-workflow-detail`

## 2026-03-28 - Wave 3 Task 9 runtime overview/facts web cutover

### Component structure decisions
- Replaced project dashboard runtime placeholder with a lean runtime overview composition in `apps/web/src/routes/projects.$projectId.index.tsx`:
  - top = three clickable runtime stat cards (fact types with instances, work-unit types with instances, active transitions)
  - middle = active workflows list with lightweight transition/work-unit context
  - bottom = prominent `Go to Guidance` CTA
- Reworked `apps/web/src/routes/projects.$projectId.facts.tsx` into definition-first runtime project fact cards sourced from runtime read model (`getRuntimeProjectFacts`) instead of baseline preview projection fallback.
- Added definition-scoped detail surface `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx` with:
  - definition metadata section
  - current effective state section (`one`/`many` current rows)
  - narrow mutation action panel (add/set/replace only)

### Query key patterns used
- Introduced TanStack query keys with required runtime prefixing:
  - `runtime-overview`
  - `runtime-project-facts`
  - `runtime-project-fact-detail`
- Kept keys project-scoped (`projectId`) and definition-scoped where needed (`factDefinitionId`).
- Mutations invalidate runtime read-model caches by prefix:
  - project facts list prefix
  - current fact detail key
  - overview key (for stat freshness after fact writes)

### Navigation approach
- Runtime stat cards use direct navigation from overview:
  - facts stat -> `/projects/$projectId/facts` with existence-prefill context
  - work-unit stat -> `/projects/$projectId/work-units`
  - active transition stat -> `/projects/$projectId/transitions`
- Active workflow list stays read-focused in this slice and avoids introducing new execution-detail route dependencies.
- Fact cards navigate definition-first to `/projects/$projectId/facts/$factDefinitionId`.
- Fact detail includes deterministic return path back to project facts list.

## 2026-03-28 - Wave 3 Task 10 runtime guidance web cutover

### Stream handling patterns
- Cut over `/projects/$projectId/transitions` into Runtime Guidance while keeping route path stable and replacing old baseline-preview filtering UI.
- Ran Active and Open/Future transport split in parallel on page load:
  - Active via `orpc.project.getRuntimeGuidanceActive.queryOptions(...)` + runtime-prefixed key `runtime-guidance-active`.
  - Open/Future via typed oRPC stream call `orpc.project.streamRuntimeGuidanceCandidates.call({ projectId })`.
- Implemented reconnect-safe stream state management with a fresh-bootstrap reset contract:
  - `bootstrap` event fully replaces candidate cards and clears prior transition results + done markers.
  - `transitionResult` updates per-candidate status map without reordering cards.
  - `workUnitDone` marks card completion only.
  - `done` marks stream complete.
  - `error` records stream error and triggers reconnect loop.
- Added pure helper reducer `applyRuntimeGuidanceStreamEvent(...)` and reconnect-focused tests that explicitly assert stale state is discarded on new bootstrap.

### Section layout approach
- Locked UI to exactly two top-level sections in route composition:
  - `Active`
  - `Open/Future`
- Active section renders work-unit cards with active transition + primary workflow summary and lightweight completion readiness hint only (no completion-gate tree or complete action).
- Open/Future section stays merged (not split into separate Open/Future top-level blocks), preserves bootstrap evaluation order, and surfaces source indicators on candidate rows.

### Dialog integration
- Added shared runtime start-gate dialog component (`apps/web/src/components/runtime/runtime-start-gate-dialog.tsx`) driven by `project.getRuntimeStartGateDetail`.
- Added launch decision helper (`resolveRuntimeGuidanceLaunchDecision`) to route actions through:
  - `startTransitionExecution` for future candidates and open candidates without active transition context.
  - `switchActiveTransitionExecution` when launching against a work unit with an existing active transition execution.
- Applied runtime-prefixed query key for drill-in details (`runtime-start-gate-detail`) and refresh strategy after mutation success:
  - invalidate Active query
  - restart candidate stream epoch for fresh Open/Future hydration

## 2026-03-28 - Wave 3 Task 11 runtime work-units list + overview/state-machine shell

### Route nesting approach
- Kept `/projects/$projectId/work-units` as the runtime instance index and added nested instance routes:
  - `/projects/$projectId/work-units/$projectWorkUnitId` (overview)
  - `/projects/$projectId/work-units/$projectWorkUnitId/state-machine` (state machine shell)
- Used list row navigation as the primary flow (`Open overview`) and explicit overview-to-state-machine CTA (`Open state machine`) to keep traversal deterministic.
- Regenerated `apps/web/src/routeTree.gen.ts` so TanStack route typing recognizes the new nested paths and params.

### Query key patterns
- Introduced runtime-prefixed query keys per surface and scope:
  - `runtime-work-units` + `[projectId, hasActiveTransition]`
  - `runtime-work-unit-overview` + `[projectId, projectWorkUnitId]`
  - `runtime-work-unit-state-machine` + `[projectId, projectWorkUnitId]`
- Kept list query filters URL-backed (`hasActiveTransition`) and mapped them to transport filters only when non-default.
- Continued direct oRPC queryOptions usage (`project.getRuntimeWorkUnits`, `project.getRuntimeWorkUnitOverview`, `project.getRuntimeWorkUnitStateMachine`) with explicit queryKey overrides.

### Navigation structure
- List page switched from methodology-preview content to runtime instance rows (table scan surface) and now links each row to overview.
- Overview page remains intentionally shallow: identity/current-state, optional active transition card, and exactly three summary cards (Facts/Dependencies, State Machine, Artifact Slots).
- State machine page shell focuses on current state, active transition panel, and possible transition candidates from the current state.
- Explicitly avoided future/inactive-instantiation opportunities on the state-machine page to keep that concern in Runtime Guidance.

## 2026-03-28 - Wave 3 Task 13 runtime work-unit facts list/detail routes

### Route and query-key decisions
- Added runtime work-unit facts routes:
  - `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.facts.tsx`
  - `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.facts.$factDefinitionId.tsx`
- Locked query keys to runtime-prefixed forms required by the runtime slice:
  - list: `['runtime-work-unit-facts', projectId, projectWorkUnitId]`
  - detail: `['runtime-work-unit-fact-detail', projectId, projectWorkUnitId, factDefinitionId]`
- Detail mutation invalidation refreshes list/detail plus work-unit overview summary key:
  - `['runtime-work-unit-overview', projectId, projectWorkUnitId]`

### UI/interaction constraints implemented
- Facts list renders exactly two tabs: `Primitive` and `Work Units`.
- `Work Units` tab preserves locked section ordering: `Outgoing` first, `Incoming` second.
- Fact detail stays definition-scoped (`factDefinitionId`), not instance-scoped.
- Detail action surface remains mutation-limited to add/set/replace paths only (no delete/clear controls).
- Added deterministic navigation from work-unit overview `Facts / Dependencies` card to work-unit facts route.

### Validation evidence
- Route tree regenerated via `bun run build` in `apps/web` (new nested facts routes materialized in `apps/web/src/routeTree.gen.ts`).
- Added/ran targeted route tests:
  - `apps/web/src/tests/routes/runtime-work-unit-facts.test.tsx`
  - `apps/web/src/tests/routes/runtime-work-unit-fact-detail.test.tsx`
- Added e2e scenario:
  - `tests/e2e/runtime-work-unit-facts.spec.ts`

## 2026-03-28 - Wave 3 Task 15 transition/workflow execution detail pages

### Route implementation decisions
- Filled the transition execution page at `apps/web/src/routes/projects.$projectId.transition-executions.$transitionExecutionId.tsx` with the locked section order:
  1. Transition definition
  2. Current primary workflow
  3. Completion gate
  4. Primary attempt history
  5. Supporting workflows
- Switched the page query key to runtime-prefixed detail scope:
  - `runtime-transition-execution-detail` (`[projectId, transitionExecutionId]`)
- Kept transition actions constrained to the locked ownership boundary:
  - `choosePrimaryWorkflowForTransitionExecution`
  - `completeTransitionExecution`
  - explicitly no same-workflow retry control on transition detail.

### Workflow detail decisions
- Filled `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx` as a lean L2 detail page with:
  - workflow runtime summary
  - parent transition/work-unit context links
  - retry/supersession lineage
  - explicit `Steps coming later` deferred messaging.
- Switched the page query key to:
  - `runtime-workflow-execution-detail` (`[projectId, workflowExecutionId]`)
- Kept action boundary locked to `retrySameWorkflowExecution` only; no choose-different-workflow affordance was added.

### Verification artifacts
- Added route tests:
  - `apps/web/src/tests/routes/runtime-transition-execution-detail.test.tsx`
  - `apps/web/src/tests/routes/runtime-workflow-execution-detail.test.tsx`
- Added e2e coverage entry:
  - `tests/e2e/runtime-execution-details.spec.ts`
- Verified:
  - both new route tests pass
  - e2e spec executes with fixture-aware skip when app/runtime data is unavailable
  - monorepo `bun run build` succeeds.

## 2026-03-29 - Wave 3 Task 16 architecture governance + runtime query-key separation

### Governance test coverage added
- Added workflow-engine runtime ownership boundary lock test:
  - `packages/workflow-engine/src/tests/architecture/runtime-boundary-lock.test.ts`
  - Asserts runtime service seams are exported from workflow-engine and runtime service class declarations are scoped to `packages/workflow-engine/src/services/*`.
  - Asserts no `step_executions` table appears in runtime schema/migration and no step-level runtime router procedures exist.
- Added API router boundary test:
  - `packages/api/src/tests/architecture/runtime-router-boundary.test.ts`
  - Asserts runtime router remains service-layer thin (`runEffect` handlers, no repository imports/composition, no step-level procedures).
- Added project-context runtime boundary test:
  - `packages/project-context/src/tests/architecture/runtime-boundary.test.ts`
  - Asserts runtime-history reads remain through `hasExecutionHistoryForRepin` port.
  - Asserts repin guard checks include both legacy `projectExecutions` and new runtime history sources via DB repository read-path evidence.
  - Asserts no runtime write commands are owned/invoked by project-context.

### Runtime query-key separation test coverage
- Added web route query-key governance test:
  - `apps/web/src/tests/routes/runtime-query-key-separation.test.tsx`
  - Asserts runtime route surfaces use runtime-prefixed keys:
    - `runtime-overview`
    - `runtime-guidance-active`
    - `runtime-work-units`
    - `runtime-active-workflows`
    - `runtime-transition-execution-detail`
    - `runtime-workflow-execution-detail`
  - Asserts non-runtime/preview-form key strings are absent from those runtime route surfaces.

### Implementation gotchas resolved
- API boundary test initially over-counted service resolutions versus handlers; adjusted to enforce non-repository composition and thin-service pattern without assuming strict 1:1 textual parity.
- Web query-key test initially used an incorrect repo-root relative path from `apps/web/src/tests/routes`; corrected root traversal to `../../../../../`.

## 2026-03-28 - Wave 3 Task 14 runtime artifact slots/detail/dialog

### Route and query-key decisions
- Added work-unit nested runtime routes:
  - `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.artifact-slots.tsx`
  - `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.artifact-slots.$slotDefinitionId.tsx`
- Locked list and detail keys to runtime-prefixed forms:
  - `runtime-artifact-slots` scoped by `[projectId, projectWorkUnitId]`
  - `runtime-artifact-slot-detail` scoped by `[projectId, projectWorkUnitId, slotDefinitionId]`
- Added an overview CTA from work-unit overview into artifact slots (`Open artifact slots`) to keep runtime navigation contiguous.

### UI behavior locked in implementation
- Artifact Slots page remains summary-first with one card per slot definition and only latest-effective snapshot summary in each card body.
- Slot detail page enforces section priority:
  1. Current effective snapshot (with explicit exists/no-exists messaging)
  2. Lineage history list
- Zero-live-member handling is represented directly in detail UI (`exists = false`, empty members) while lineage cards still render.
- `checkArtifactSlotCurrentState` is wired only on detail route; overview/list pages do not expose mutation actions.
- `unavailable` check result surfaces explicit root-path/git-context-unavailable messaging instead of hiding errors.

### Snapshot drill-in dialog pattern
- Added `apps/web/src/components/runtime/artifact-snapshot-dialog.tsx` as a read-focused dialog for one snapshot row.
- Dialog renders snapshot metadata + delta members (`present`/`removed`) + lightweight effective count only; no file-content viewers.
- Detail route owns dialog selection/open state and drives snapshot fetch via runtime-prefixed dialog query key.

### Test and generation updates
- Added route tests:
  - `apps/web/src/tests/routes/runtime-artifact-slots.test.tsx`
  - `apps/web/src/tests/routes/runtime-artifact-slot-detail.test.tsx`
- Added e2e path test:
  - `tests/e2e/runtime-artifacts.spec.ts`
- Regenerated `apps/web/src/routeTree.gen.ts` via TanStack router CLI after adding new file routes.

## 2026-03-29 - F3 manual QA rejection findings

### Verification blockers observed
- `bun run test` failed immediately because `packages/workflow-engine` runs `vitest` directly and the shell reported `vitest: command not found` (exit 127).
- `bun run test:layout:guardrail` failed on `packages/template-engine/src/index.test.ts`, which violates the repo rule that `src/` test files must live under `src/tests/**`.
- `bunx playwright test tests/e2e/runtime-*.spec.ts --reporter=line` exited 0 but skipped all 7 specs because the runtime web app was unreachable.
- Direct manual browser access to `http://localhost:3001/` returned connection refused, so live runtime-page spot checks could not be executed.

### Scope fidelity confirmed despite failed verification
- Guidance remains locked to two top-level sections (`Active`, `Open/Future`) with start/switch behavior only.
- Work-unit facts remain definition-scoped with exactly `Primitive` and `Work Units` tabs and no delete/clear actions.
- Artifact detail keeps `Current effective snapshot` before `Lineage history` and preserves zero-live-member lineage visibility.
- Transition detail owns complete/choose-primary actions; workflow detail owns retry-same-only plus `Steps coming later` messaging.

## 2026-03-29 - F4 scope fidelity findings (REJECT)

### Boundary confirmations
- `project_executions` remains legacy read-only in runtime paths; only repin-history read checks touch it (`packages/db/src/project-context-repository.ts`).
- L3 remains deferred in implementation seams:
  - no `step_executions` runtime table in `packages/db/src/schema/runtime.ts`
  - no step-level runtime procedures in `packages/api/src/routers/project-runtime.ts`
  - workflow detail keeps explicit deferred steps messaging.
- Runtime web routes use runtime-prefixed query keys and do not call preview `getProjectDetails` for runtime surfaces.

### Critical fidelity regressions identified
- Locked shared gate seam is not preserved end-to-end:
  - command/detail services depend on `TransitionRuntimeGateService` (separate tag) instead of directly consuming `RuntimeGateService` seam.
- `getRuntimeStartGateDetail` seam mismatch:
  - router calls it via type-cast on `RuntimeGuidanceService`, but the service interface/live impl expose only `getActive` + `streamCandidates`.
- Guidance stream lifecycle model diverges from locked progressive root-fiber contract:
  - stream events are precomputed (`Effect.forEach`) then emitted from a materialized array, rather than progressive long-lived streaming evaluation.
- App router composition currently passes methodology/project-context layer into project router without visible runtime workflow-engine service provisioning (`packages/api/src/routers/index.ts`), creating integration risk for runtime procedures.

## 2026-03-29 - F1 plan compliance audit findings (REJECT)

### Key compliance deltas discovered
- Locked runtime contract inventory drift: `RuntimeCandidateAvailability` in `packages/contracts/src/runtime/status.ts` is `"available" | "blocked"` but the plan matrix locks it to `"available" | "blocked" | "future"`.
- Runtime production composition seam gap: `apps/server/src/index.ts` + `packages/api/src/routers/index.ts` provide methodology/lifecycle/project-context layers, but runtime procedures in `project-runtime.ts` rely on workflow-engine runtime services not visibly wired into that composition.
- Shared gate seam drift: transition services depend on `TransitionRuntimeGateService` rather than the locked shared `RuntimeGateService` seam.

### What remained compliant
- No `step_executions` table was introduced in runtime schema/migration.
- No L3 step-level UI/procedure surface was added to runtime routes/routers.
- Runtime router thinness constraints held (service-only delegation, no repo composition in router).

## 2026-03-29 - F1/F4 gate seam drift fix

### Seam consolidation applied
- Removed `TransitionRuntimeGateService` declaration from `packages/workflow-engine/src/services/transition-execution-command-service.ts`.
- Updated both transition services to consume the shared `RuntimeGateService` tag:
  - `TransitionExecutionCommandServiceLive`
  - `TransitionExecutionDetailServiceLive`
- Updated runtime transition service tests to stub `RuntimeGateService` directly instead of a transition-specific gate tag.

### Wiring adjustments
- Extended `packages/workflow-engine/src/layers/live.ts` dependent layer to include transition/workflow command + detail live services and provide them from the shared runtime base layer.
- This keeps gate dependency wiring anchored on one seam token (`RuntimeGateService`) across guidance + transition paths.

### Verification evidence
- `bunx vitest run packages/workflow-engine/src/tests/runtime/transition-execution-services.test.ts` ✅
- `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-gate-service.test.ts` ✅
- `lsp_diagnostics` on all changed files returned clean (no diagnostics).

## 2026-03-29 - Final verification wave integration fixes

### API/runtime composition learnings
- Runtime workflow-engine layers must be composed alongside methodology/project-context layers before passing into `createProjectRouter(...)`; otherwise runtime procedures compile but run without required Effect services.
- For this workspace, importing workflow-engine runtime tags from `packages/api` via relative source path (`../../../workflow-engine/src/index`) avoids the server typecheck module-resolution failure seen with `@chiron/workflow-engine` from inside `packages/api/src`.

### Web route typing learnings
- TanStack Router search params inherit through nested runtime work-unit routes; links into nested work-unit facts/artifact/state-machine surfaces must include `hasActiveTransition` when the ancestor work-units route locks it in search schema.
- Under `exactOptionalPropertyTypes`, helper input types that accept optional provenance fields should model `?: string | undefined` when upstream payloads include explicit `undefined` values.

### Workflow-engine test config learnings
- In this workspace, `packages/workflow-engine` requires `bunx vitest run` in package scripts to avoid missing local `vitest` binary.
- `vitest.config.ts` can be plain-object export to avoid unresolved `vitest/config` import when package-local module resolution is not available.

## 2026-03-29 - Runtime service wiring follow-up

- Runtime live layer construction can fail to expose read services when `createAppRouter(...)` provides only a subset of runtime repositories while merged runtime layers include command/detail services with additional repository dependencies.
- `WorkflowEngineRuntimeLive` currently includes transition/workflow command services, so API runtime repository wiring must include both execution write repositories in addition to read/fact/artifact repos.
- Verified green wiring set for runtime repos at app composition:
  - `ProjectWorkUnitRepository`
  - `ExecutionReadRepository`
  - `TransitionExecutionRepository`
  - `WorkflowExecutionRepository`
  - `ProjectFactRepository`
  - `WorkUnitFactRepository`
  - `ArtifactRepository`

## 2026-03-29 - Runtime guidance future-candidate generation

- `RuntimeGuidanceService.streamCandidates(...)` must hydrate candidate seeds from two sources when no explicit test seeds are provided:
  - open candidates from existing `project_work_units`
  - future candidates derived from pinned methodology lifecycle definitions.
- Project pin lookup (`ProjectContextRepository.findProjectPin`) is the runtime seam that resolves `methodologyVersionId`; if missing, future candidates should be empty while open candidates remain available.
- Future candidate eligibility must respect work-unit cardinality against existing runtime instances:
  - single-instance variants (`one`, `one_per_project`, `single`) only when count is zero
  - multi-instance variants always creatable.
- Start-transition derivation for future cards should use lifecycle transitions with `fromStateId = null` and convert start-phase condition sets into runtime `RuntimeConditionTree` gates for evaluation.

## 2026-03-29 - Transition start gate type-mismatch fix

- `TransitionExecutionCommandService` must resolve transition start-gate condition trees from methodology lifecycle data before calling `RuntimeGateService.evaluateStartGate(...)`; passing transition/workflow ids directly to the gate service causes runtime failures because gate evaluation expects a concrete `conditionTree`.
- For runtime transition starts, the stable lookup chain is:
  1. `ProjectContextRepository.findProjectPin(projectId)` -> pinned `methodologyVersionId`
  2. `ProjectWorkUnitRepository.getProjectWorkUnitById(projectWorkUnitId)` -> `workUnitTypeId`
  3. `LifecycleRepository.findLifecycleTransitions(...workUnitTypeId)` + `findTransitionConditionSets(...transitionId)`
  4. build `RuntimeConditionTree` from non-completion condition sets and evaluate the start gate with that tree.
- Keep `ProjectContextRepository`/`LifecycleRepository` dependencies lazy (resolved inside start-gate context effect) so completion/choose command paths and existing tests do not require extra layers when they do not execute start/switch flows.

## 2026-03-29 - Runtime layer dependency passthrough for lazy command dependencies

- `TransitionExecutionCommandService` currently resolves `ProjectContextRepository` and `LifecycleRepository` lazily inside command-path effects (not during layer construction), so those tags must be present in the runtime environment when handlers execute.
- Adding `Layer.service(ProjectContextRepository)` and `Layer.service(LifecycleRepository)` into `WorkflowEngineRuntimeBaseLayer` keeps these dependencies available to downstream command effects after API-level `Layer.provide(...)` composition.
