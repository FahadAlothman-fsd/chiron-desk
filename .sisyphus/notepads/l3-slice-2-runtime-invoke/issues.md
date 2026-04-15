# Issues - L3 Slice 2 Runtime Invoke

## Active Issues
None yet - work just starting.

## Resolved Issues
None yet.

## 2026-04-14 Plan compliance audit findings
- `InvokeWorkflowExecutionService` is idempotent by child-row identity, but the start flow is not transactional: it creates a child workflow execution before marking the invoke child row started, so a failed second write can orphan runtime state.
- Zero-target blocking is only defined in `InvokeTargetResolutionService`; the user-facing completion-disabled reason comes from `InvokeCompletionService`, which currently falls back to generic eligibility text instead of the locked `No invoke targets resolved` message.

## 2026-04-14 Scope fidelity review findings
- The runtime invoke slice did not stay strictly inside the approved file boundary: `packages/workflow-engine/src/services/workflow-execution-step-command-service.ts` was modified even though it was not on the allowed list.
- Repository state also includes out-of-scope workspace changes under `.sisyphus/`, including a modified read-only plan file and extra generated artifacts, which forces a scope-fidelity reject even though the invoke feature logic itself stayed invoke-only.

## 2026-04-14 Manual QA gaps
- No explicit UI assertion currently proves the blocked `Start work unit` control renders disabled or that an ineligible `Complete Step` action keeps its disabled reason visible at the route level.
- Work-unit completion propagation verifies payload correctness, but the test does not retry completion to prove propagation idempotency on that branch.
- `packages/api/src/routers/project-runtime.ts` invoke handlers rely on generic `runEffect(mapEffectError)` wiring; this was validated by inspection only, not by a dedicated router/API-boundary test in this slice.

## 2026-04-14 Invoke code-quality review findings
- `packages/workflow-engine/src/layers/live.ts` does not provide `InvokeWorkUnitExecutionServiceLive` even though `packages/api/src/routers/project-runtime.ts` exposes `startInvokeWorkUnitTarget`, so the published API surface is not fully backed by the runtime step service layer.
- `packages/workflow-engine/src/services/invoke-workflow-execution-service.ts` creates a child workflow execution before persisting the invoke target row start, which leaves an orphan/duplicate risk on concurrent starts or failed `markInvokeWorkflowTargetExecutionStarted(...)` calls.
- Both invoke start services currently trust UI gating and do not reject starts for non-active parent invoke steps.
- `packages/workflow-engine/src/services/invoke-work-unit-execution-service.ts` relies on an optional `startInvokeWorkUnitTargetAtomically(...)` capability that is not part of the declared `InvokeExecutionRepository` contract.
- Zero-target blocking is modeled in `InvokeTargetResolutionService`, but `InvokeCompletionService` re-derives completion eligibility without consuming that canonical blocked reason, so zero-target invoke steps can surface the wrong disabled message.

## 2026-04-14 Plan compliance rerun resolution
- Previously identified plan-compliance defects are resolved:
  - Workflow child start now goes through the atomic repository seam, and integration coverage verifies failure leaves no orphan child workflow execution.
  - Zero-target invoke completion now reports the canonical reason `No invoke targets resolved` in both detail-shell and completion-transaction paths.
- No remaining plan deviations were found in the reviewed invoke surfaces.

## 2026-04-14 Manual QA rerun resolution
- Previously reported manual-QA coverage gaps are resolved in test coverage:
  - Route-level disabled-action behavior is explicitly asserted.
  - Work-unit completion propagation is retried and proven idempotent.
  - Router-level invoke error mapping now has dedicated tests.
  - Live runtime layer composition and workflow-start race behavior now have integration coverage.
  - Zero-target completion-disabled behavior is covered across resolution, detail, integration, and route tests.

## 2026-04-14 Code-quality rerun resolution
- The previously rejected invoke code-quality issues are now closed:
  - `live.ts` exports both invoke start services in the runtime step layer.
  - Workflow/work-unit child starts now rely on typed atomic repository seams.
  - Both start services reject non-active parent invoke steps.
  - Zero-target completion wiring uses the canonical `No invoke targets resolved` path end-to-end.
- No remaining blocking code-quality issues were found within the requested review scope.
