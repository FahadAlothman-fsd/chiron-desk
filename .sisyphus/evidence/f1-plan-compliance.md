# F1: Plan Compliance Audit — unified-l1-l2-runtime-slice

**Date:** 2026-03-29  
**Plan:** `.sisyphus/plans/unified-l1-l2-runtime-slice.md`  
**Audit scope:** Tasks 1-16, locked procedure/service/repo matrix, explicit L3 exclusions, router thinness

## Executive Verdict

## ❌ REJECT

The implementation is close to the intended L1/L2 slice, and major structural pieces exist, but there are **blocking plan-compliance violations** against locked decisions/matrix constraints.

Blocking findings:
1. **Contract mismatch with locked status inventory**: `RuntimeCandidateAvailability` is missing `"future"`.
   - Plan lock: availability must be `"available" | "blocked" | "future"`.
   - Actual: `packages/contracts/src/runtime/status.ts` defines only `"available" | "blocked"`.
2. **Runtime service wiring gap in production router composition**: `createAppRouter(...)` does not provide runtime workflow-engine layers required by `project-runtime` procedures.
   - `apps/server/src/index.ts` only injects methodology/lifecycle/project-context repo layers.
   - `packages/api/src/routers/project.ts` composes runtime procedures via `createProjectRuntimeRouter(serviceLayer as any)` against that same non-runtime layer.
   - This violates the unified-cutover expectation and locked procedure→service seam applicability in deployed composition.
3. **Shared gate-service seam drift** from locked service naming/scope:
   - Plan lock expects shared gate service to be `RuntimeGateService` used by guidance/transition detail/transition command services.
   - Actual transition services depend on a separate `TransitionRuntimeGateService` tag in `transition-execution-command-service.ts` and `transition-execution-detail-service.ts`.

---

## Task-by-Task Compliance (1-16)

### 1) Freeze runtime contracts, route inventory, and package test harnesses
**Status:** ⚠️ **PARTIAL / FAIL**

Pass evidence:
- Runtime contract modules exist under `packages/contracts/src/runtime/*` and export via `packages/contracts/src/runtime/index.ts` and `packages/contracts/src/index.ts`.
- Package-local test scripts exist:
  - `packages/db/package.json` → `"test": "vitest run"`
  - `packages/workflow-engine/package.json` → `"test": "vitest run"`
- L3 exclusion contract exists: `RuntimeExcludedL3Entity = "step_executions"` in `packages/contracts/src/runtime/executions.ts`.

Blocking non-compliance:
- `RuntimeCandidateAvailability` does not match locked inventory (missing `"future"`) in `packages/contracts/src/runtime/status.ts`.

### 2) Add runtime schema, migration, and legacy-history-aware repin bridge
**Status:** ✅ PASS

- `projects.project_root_path` present (`packages/db/src/schema/project.ts`, migration `0001_runtime_l1_l2.sql`).
- Runtime tables present in `packages/db/src/schema/runtime.ts` and migration.
- Repin bridge checks legacy + runtime-history rows via `hasExecutionHistoryForRepin` and runtime table probes in `packages/db/src/project-context-repository.ts`.
- `project_executions` remains legacy/read-only sentinel usage.

### 3) Runtime repositories for anchors/execution lineage
**Status:** ✅ PASS

- Ports exist under `packages/workflow-engine/src/repositories/`:
  - `ProjectWorkUnitRepository`, `TransitionExecutionRepository`, `WorkflowExecutionRepository`, `ExecutionReadRepository`.
- DB implementations exist under `packages/db/src/runtime-repositories/` and are exported from `packages/db/src/index.ts`.

### 4) Runtime repository support for facts/artifacts/current reconstruction
**Status:** ✅ PASS

- Ports exist: `ProjectFactRepository`, `WorkUnitFactRepository`, `ArtifactRepository`.
- DB implementations exist under `packages/db/src/runtime-repositories/`.
- Schema includes immutable lineage/supersession fields and artifact member status `present|removed`.

### 5) Workflow-engine runtime projection services + condition evaluation
**Status:** ⚠️ **PARTIAL / FAIL (seam drift)**

Pass evidence:
- Services exist: `runtime-overview`, `runtime-guidance`, `runtime-work-unit`, `runtime-workflow-index`, `runtime-fact`, `runtime-artifact`, `runtime-gate`.
- `RuntimeGateService` exposes `evaluateStartGate` + `evaluateCompletionGate`.

Blocking non-compliance:
- Locked shared-service seam requires `RuntimeGateService` as canonical gate service across guidance/transition services; transition services use separate `TransitionRuntimeGateService` tag instead.

### 6) Transition/workflow detail and command services
**Status:** ⚠️ **PARTIAL / FAIL (composition seam)**

Pass evidence:
- Required service files exist (`transition-execution-detail/command`, `workflow-execution-detail/command`).
- Command behavior includes complete/switch/retry/choose-primary pathways.

Blocking non-compliance:
- These services depend on `TransitionRuntimeGateService`, but no production live provider for that tag is wired outside tests.

### 7) Runtime API queries
**Status:** ⚠️ **PARTIAL / FAIL (runtime layer injection)**

Pass evidence:
- `packages/api/src/routers/project-runtime.ts` implements locked query procedures.
- Runtime router boundary test confirms thin router behavior and no repository imports.

Blocking non-compliance:
- `createAppRouter`/server composition does not provide runtime workflow-engine service layer required by these procedures.

### 8) Runtime API streams and mutations
**Status:** ⚠️ **PARTIAL / FAIL (runtime layer injection + seam drift)**

Pass evidence:
- Runtime stream/mutation procedures exist with expected names.
- No step-level procedures introduced.

Blocking non-compliance:
- Same production service-layer wiring gap as Task 7.
- Transition command/detail services require `TransitionRuntimeGateService` provider not wired in production composition.

### 9) Cut over Project Overview + Project Facts
**Status:** ✅ PASS

- Runtime overview route uses `project.getRuntimeOverview` and `runtime-` query keys.
- Project facts route uses `project.getRuntimeProjectFacts`; detail route exists.

### 10) Cut over `/transitions` to Runtime Guidance
**Status:** ✅ PASS

- Route reused at `/projects/$projectId/transitions`; title/copy shows Guidance.
- Uses `getRuntimeGuidanceActive` + `streamRuntimeGuidanceCandidates` + start-gate dialog.
- No completion-gate action UI on guidance route.

### 11) Work Units list/overview/state-machine cutover
**Status:** ✅ PASS

- Routes exist and use runtime procedures/query keys.

### 12) Active Workflows page + execution shells
**Status:** ✅ PASS

- `workflows` route and execution detail shell routes exist.
- Active Workflows table has no status column (as locked).

### 13) Work Unit Facts list/detail routes
**Status:** ✅ PASS

- Routes exist with runtime fact detail usage and runtime query keys.

### 14) Artifact slots/detail/dialog
**Status:** ✅ PASS

- Routes exist and wire runtime artifact procedures including snapshot dialog and check-current-state.

### 15) Transition + Workflow execution detail pages
**Status:** ✅ PASS

- Transition detail page renders required sections and owns choose-primary + complete.
- Workflow detail page owns retry-same and contains explicit deferred steps messaging.
- No step drill-down/table introduced.

### 16) Cleanup/governance/final cutover verification
**Status:** ⚠️ **PARTIAL / FAIL (boundary intent incomplete in composition)**

Pass evidence:
- Governance tests exist (`runtime-boundary-lock`, `runtime-router-boundary`, `runtime-boundary`, `runtime-query-key-separation`).

Blocking non-compliance:
- Despite governance tests, runtime router procedures are not fully backed by production runtime service-layer composition in `apps/server/src/index.ts` + `packages/api/src/routers/index.ts`.

---

## Locked Procedure / Service / Repo Matrix Verification

### Router thinness (required)
**Result:** ✅ PASS (runtime router)

- `packages/api/src/routers/project-runtime.ts` delegates handlers through one service call pattern.
- No repository imports/composition in runtime router.
- Verified by passing architecture test:
  - `bunx vitest run packages/api/src/tests/architecture/runtime-router-boundary.test.ts` → PASS

### Matrix lock fidelity
**Result:** ❌ FAIL

- Service seam drift (`TransitionRuntimeGateService` vs locked `RuntimeGateService` shared seam).
- Production composition does not fully wire runtime service graph for runtime procedures.

---

## L3 / Step-Execution Exclusion Verification

**Result:** ✅ PASS (for this slice)

- No `step_executions` table in runtime schema/migration:
  - `packages/db/src/schema/runtime.ts`
  - `packages/db/src/migrations/0001_runtime_l1_l2.sql`
- Runtime router has no step-level endpoints (`getRuntimeStepExecutionDetail`, `retrySameStepExecution`, etc.).
- Runtime web routes do not introduce step execution UI/orchestration; workflow detail explicitly defers steps.

---

## Router-side Business Logic Verification

**Result:** ✅ PASS (runtime router scope)

- Runtime router remains transport/auth/input/error mapping + service delegation.
- No repo joins or domain orchestration in runtime router handlers.

---

## Final Decision

**REJECT**

Approval is blocked until these are fixed:
1. Align `RuntimeCandidateAvailability` with locked contract (`available | blocked | future`).
2. Wire runtime workflow-engine services/layers into production app router composition (`createAppRouter` + server wiring) so runtime procedures execute with their required tags.
3. Reconcile gate shared-service seam with locked model (`RuntimeGateService` as canonical shared gate service) or update implementation to remove `TransitionRuntimeGateService` divergence.
