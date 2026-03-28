# F4: Scope Fidelity Check — unified-l1-l2-runtime-slice

**Date:** 2026-03-29  
**Status:** ❌ REJECT

## Inputs Reviewed

- Plan: `.sisyphus/plans/unified-l1-l2-runtime-slice.md`
- Canonical draft: `.sisyphus/drafts/runtime-project-context-revision.md`
- Implementation seams (key files):
  - `packages/db/src/project-context-repository.ts`
  - `packages/db/src/schema/runtime.ts`
  - `packages/workflow-engine/src/services/runtime-gate-service.ts`
  - `packages/workflow-engine/src/services/runtime-guidance-service.ts`
  - `packages/workflow-engine/src/services/transition-execution-command-service.ts`
  - `packages/workflow-engine/src/services/transition-execution-detail-service.ts`
  - `packages/api/src/routers/project-runtime.ts`
  - `packages/api/src/routers/index.ts`
  - `apps/web/src/routes/projects.$projectId.transitions.tsx`
  - `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`

---

## 1) IN vs OUT Boundary Verification

### IN-scope (L1/L2 runtime slice) — **mostly present**

- L1/L2 runtime persistence exists (`project_work_units`, `transition_executions`, `workflow_executions`, facts/artifacts lineage tables) in `packages/db/src/schema/runtime.ts`.
- Runtime routes/surfaces are present under locked route inventory (overview/guidance/work-units/facts/artifacts/transition detail/workflow detail).
- Runtime router surface exists in `packages/api/src/routers/project-runtime.ts`.

### OUT-of-scope (must remain deferred) — **confirmed**

- No `step_executions` runtime table in `packages/db/src/schema/runtime.ts`.
- No step-level runtime procedures in `packages/api/src/routers/project-runtime.ts`.
- Workflow detail explicitly keeps deferred L3 messaging (`stepsSurface.message`) in `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`.

**Boundary status:** Partial pass (L3 deferment respected), but critical seam violations below block approval.

---

## 2) `project_executions` Ownership Check

### Expected
- `project_executions` remains legacy read-only compatibility history.
- New runtime writes must not target `project_executions`.

### Observed
- `packages/db/src/project-context-repository.ts` reads `projectExecutions` only for repin history predicate (`hasRuntimeExecutionHistory`).
- No runtime insert/update/delete targeting `projectExecutions` in runtime implementation paths.

### Result
✅ **PASS** — ownership and legacy read-only posture preserved.

---

## 3) `RuntimeGateService` Scope Verification

### Expected (locked model)
- Shared gate service is `RuntimeGateService` with start/completion evaluation.
- Shared use by Guidance + Transition Command + Transition Detail seams.
- No extra gate orchestration service that bypasses this seam.

### Observed violations

1. **Command/detail do not consume `RuntimeGateService` seam directly.**
   - `transition-execution-command-service.ts` defines and depends on a separate `TransitionRuntimeGateService` context tag.
   - `transition-execution-detail-service.ts` imports and depends on `TransitionRuntimeGateService`.

2. **No live binding found for `TransitionRuntimeGateService` in production layer composition.**
   - `packages/api/src/routers/index.ts` builds `methodologyServiceLayer` (methodology + project-context only) and passes that to `createProjectRouter`.
   - No provider layer shown for `TransitionRuntimeGateService` / runtime workflow-engine services in app router composition.

3. **Unsafe router cast for missing guidance method.**
   - `project-runtime.ts` calls `runtimeGuidanceService.getRuntimeStartGateDetail(...)` via type cast, but `RuntimeGuidanceService` interface/implementation expose only `getActive` + `streamCandidates`.
   - This is a seam break and runtime-risking contract mismatch.

### Result
❌ **FAIL** — `RuntimeGateService` scope/seam contract is not faithfully preserved end-to-end.

---

## 4) Guidance Fiber Model Verification

### Expected (locked model)
- One long-lived root stream fiber.
- Structured bounded concurrency by work-unit group.
- Stable ordering within each group.
- Progressive stream behavior (bootstrap then transition deltas), with cancellation cascading.

### Observed

- `runtime-guidance-service.ts` precomputes all per-card transition evaluations (`Effect.forEach` over cards + per-transition evaluation) **before** returning `AsyncIterable` (`toAsyncIterable([...baseEvents, ...flattened, done])`).
- This behaves as pre-materialized event batch emission, not true progressive long-lived evaluation stream.
- While per-card ordering is deterministic, the implementation does not clearly realize the locked long-lived stream-fiber lifecycle model.

### Result
⚠️ **FAIL (model fidelity)** — ordering is stable, but fiber/stream lifecycle semantics are not aligned with locked guidance model.

---

## 5) Preview/Runtime Cutover Separation Check

### Expected
- Runtime surfaces use runtime-prefixed contracts/keys.
- No runtime semantics folded into preview `project.getProjectDetails` payload for runtime pages.

### Observed
- Runtime pages/routes use runtime procedures and runtime query-key namespaces.
- No `getProjectDetails` usage detected in runtime routes (`index/transitions/work-units/workflows/facts/transition-executions/workflow-executions`).
- Preview endpoints still exist for non-runtime surfaces (acceptable).

### Result
✅ **PASS** — preview/runtime separation is materially maintained at web-route usage seam.

---

## 6) L3 Deferral Confirmation

- No `step_executions` table added.
- No step-level router procedures added.
- Workflow detail remains explicit L3-deferred shell messaging.

✅ **PASS** — L3 remains deferred.

---

## 7) Cross-wave Artifact Sanity Note (F1–F3 inputs)

- Existing `.sisyphus/evidence/f1-plan-compliance.md`, `f2-code-quality.md`, `f3-manual-qa.md` currently document a different prior scope (artifact-slot/id-first work), not this runtime slice.
- They cannot be treated as authoritative evidence for this unified L1/L2 runtime implementation.

⚠️ **Evidence continuity gap** detected.

---

## Final Verdict

## ❌ REJECT

Approval is blocked by scope-fidelity regressions in critical locked seams:

1. `RuntimeGateService` seam divergence via separate `TransitionRuntimeGateService` dependency path.
2. Missing/unsafe `getRuntimeStartGateDetail` service contract path (router cast to non-declared method).
3. Guidance stream implementation shape does not faithfully implement locked long-lived progressive fiber model.
4. Runtime service layer composition in app router is not visibly wired to provide runtime workflow-engine services (integration risk).

### Required before APPROVE

- Re-align transition command/detail services to the locked shared gate seam (or provide explicit, tested adapter binding proving equivalence).
- Implement and type `getRuntimeStartGateDetail` on the owning service seam (remove unsafe cast path).
- Refit guidance stream implementation to true progressive root-stream fiber model with bounded child concurrency + cancellation semantics as locked.
- Prove runtime service provisioning in app router composition with integration coverage (non-mocked runtime router path).
