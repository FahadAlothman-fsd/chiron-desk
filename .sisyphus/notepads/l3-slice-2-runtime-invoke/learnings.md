# Learnings - L3 Slice 2 Runtime Invoke

## Conventions
- Invoke runtime follows the locked 2x2 matrix: target kinds (`workflow | work_unit`) × source modes (`fixed_set | context_fact_backed`)
- Human-readable labels/status text are primary in UI; IDs are supplementary only
- Context-fact propagation happens only on invoke-step completion, not during child start

## Patterns
- Frozen target set: resolve targets once on step activation, materialize child rows once
- Invoke aggregate root is `invoke_step_execution_state` - child rows link to it, not directly to `step_executions`
- Idempotency keyed by invoke child row identity, not by best-effort lookup

## Decisions
- Separate invoke runtime from branch runtime (branch is a later plan)
- No invoke-specific streaming in v1
- Step execution detail page is the primary invoke runtime UI surface

## Gotchas
- Zero-target behavior: invoke step is blocked with explicit reason `No invoke targets resolved`
- Duplicate-target behavior: `InvokeTargetResolutionService` canonicalizes and deduplicates
- Completion semantics: explicit generic `completeStepExecution(...)` action, never automatic

## 2026-04-14 Contract locks
- Runtime invoke detail body is now a first-class `stepType = invoke` union member in `packages/contracts/src/runtime/executions.ts`.
- Invoke detail rows keep human-readable labels first (`label`, `workUnitLabel`, `transitionLabel`, `workflowLabel`, `currentWorkUnitStateLabel`), with IDs carried as secondary fields for actions/selectors.
- Start mutations are intentionally narrow and idempotent-aware: workflow target returns only `{ invokeWorkflowTargetExecutionId, workflowExecutionId, result }`; work-unit target returns only `{ invokeWorkUnitTargetExecutionId, projectWorkUnitId, transitionExecutionId, workflowExecutionId, result }`.
- The referenced authority draft file was not present in `.sisyphus/drafts/`; the locked shapes were derived from `.sisyphus/plans/l3-slice-2-runtime-invoke.md` plus existing runtime contract patterns.

## 2026-04-14 Invoke target resolution seams
- `InvokeExecutionRepository` now carries the invoke aggregate root plus both child tables and work-unit mapping-table seams, including future start/update methods for workflow/work-unit child execution rows.
- `InvokeTargetResolutionService` separates `resolveTargets(...)` from `materializeTargetsForActivation(...)` so deduplication happens before row creation while child materialization still stays frozen behind the invoke root boundary.
- Frozen-target semantics currently treat an existing `invoke_step_execution_state` row as the activation-time freeze marker; if the root exists with zero child rows, the step stays blocked with `No invoke targets resolved` and later context changes are ignored.
- Canonical deduplication keeps first-seen order and assigns zero-based `resolutionOrder`, which is now covered for fixed-set workflow targets and context-fact-backed work-unit targets.

## 2026-04-14 Invoke runtime schema
- `packages/db/src/schema/runtime.ts` now models invoke runtime as a dedicated aggregate: `invoke_step_execution_state` has the unique `stepExecutionId` anchor plus `invokeStepDefinitionId`, `createdAt`, and `updatedAt` only.
- Invoke workflow/work-unit child rows both point at `invokeStepExecutionStateId`; neither child table carries a direct `stepExecutionId`, preserving the aggregate boundary.
- `invoke_workflow_target_execution.resolutionOrder` is intentionally nullable at the schema level (`notNull === false`) so activation can materialize rows before ordering is guaranteed.
- Work-unit start side effects get explicit mapping tables: `invoke_work_unit_created_fact_instance` links created `work_unit_fact_instances`, and `invoke_work_unit_created_artifact_snapshot` links created `project_artifact_snapshots`.

## 2026-04-14 Invoke work-unit start flow
- `InvokeWorkUnitExecutionService` validates ownership via `stepExecutionId` + invoke child row identity first, then resolves the invoke step definition from methodology data before any child-start writes.
- Work-unit child start validation is split into two explicit preconditions: the child row's `transitionDefinitionId` must still be present in the invoke step's activation transitions, and the selected `workflowDefinitionId` must be one of that transition's allowed workflow IDs.
- The transactional write seam is currently modeled as an optional `startInvokeWorkUnitTargetAtomically(...)` capability on the invoke repository service object; the service refuses to start if that atomic path is unavailable rather than silently falling back to non-transactional writes.
- Initial child-domain materialization creates one fact instance per work-unit fact schema using `defaultValueJson ?? null`, plus one empty artifact snapshot per artifact slot definition, and records both exact IDs into the invoke mapping tables before linking transition/workflow executions back onto the child row.

## 2026-04-14 Invoke workflow child start
- `InvokeWorkflowExecutionService` keys start idempotency strictly by `invokeWorkflowTargetExecutionId`; it rejects child rows whose `invokeStepExecutionStateId` does not match the caller's `stepExecutionId` root.
- Workflow-target invoke start reuses the parent workflow execution's `transitionExecutionId` and creates the child workflow execution with role `supporting` before persisting the child row's `workflowExecutionId`.
- Repeated starts short-circuit on the pre-materialized child row's existing `workflowExecutionId`, returning `result = already_started` without creating a duplicate workflow execution.

## 2026-04-14 Invoke completion and propagation
- `InvokeCompletionService` re-hydrates the invoke step through `getWorkflowEditorDefinition(...)` so completion checks use the authored target kind rather than guessing from runtime rows.
- Completion eligibility is target-specific: workflow invoke requires at least one child workflow execution with status `completed`, while work-unit invoke requires at least one child transition execution with status `completed`.
- `InvokePropagationService` treats completion-time propagation as a full replace of the affected output context facts via `StepContextMutationService`, which makes retries idempotent and prevents duplicate propagation rows.
- Workflow output facts use `allowedWorkflowDefinitionIds` as the explicit selection filter; work-unit draft-spec output facts use `selectedWorkUnitFactDefinitionIds` and `selectedArtifactSlotDefinitionIds`, with empty selections meaning propagate all available mapped IDs.

## 2026-04-14 Invoke step detail assembly
- `InvokeStepDetailService` now centralizes invoke detail read-model assembly so `StepExecutionDetailService` only delegates invoke bodies and reuses the returned completion eligibility for the shared shell action state.
- Human-readable invoke labels are resolved from methodology/lifecycle metadata first (`displayName`, workflow key, transition key/state display name), with runtime IDs carried separately for actions and deep links.
- Workflow child rows treat `active`/`completed` child workflow executions as the primary status source, expose the current child step label when available, and fall back to `failed`/`unavailable` when persisted runtime pointers no longer resolve cleanly.
- Work-unit child rows derive `blocked` vs `not_started` from authored activation workflow availability, surface explicit disabled reasons on `start`, and show propagation preview outputs by filtering parent workflow context facts to the invoke target kind.

## 2026-04-14 Invoke step detail UI wiring
- The step execution detail route now renders invoke-specific runtime sections directly from the shared route file, keeping the shared shell card intact and layering invoke overview, target rows, and propagation preview beneath it.
- Workflow rows use start/open actions with step-detail invalidation on successful starts; work-unit rows keep a per-row primary-workflow selection state seeded from the current row or first available option before calling `startInvokeWorkUnitTarget(...)`.
- The route keeps human-readable labels/status text primary by showing labels in titles and detail text, while IDs only appear in `DetailCode` secondary metadata and deep-link actions.
- The new `runtime-invoke-step-detail` Vitest harness proves the invoke surface renders the agreed state/action matrix and that successful workflow-start, work-unit-start, and complete-step mutations refetch the step detail query.

## 2026-04-14 Manual QA review findings
- Targeted invoke runtime tests currently pass end-to-end in review scope: 14/14 workflow-engine tests and 2/2 web route tests.
- Coverage is strongest at the service layer: workflow start idempotency, work-unit transactional creation, blocked transition handling, completion eligibility, and propagation payload content are all explicitly asserted.
- UI coverage currently proves successful mutation integration and query refetching, but not disabled-button behavior for blocked work-unit starts or ineligible completion.
- Completion idempotency is explicitly proven for workflow-target propagation, but not separately retried for the work-unit propagation branch.

## 2026-04-14 Invoke code-quality review learnings
- Invoke start invariants must be enforced server-side, not just through step-detail action disabling; both workflow-target and work-unit-target start paths need an explicit `stepExecution.status === "active"` guard.
- Invoke child-start idempotency is only trustworthy when the child workflow/work-unit row update and child execution creation happen in one atomic repository boundary; a pre-check plus later write is not enough.
- Runtime-layer composition needs an explicit review alongside unit tests: isolated Effect-layer tests can all pass while a published API service is still missing from `WorkflowEngineRuntimeStepServicesLive`.

## 2026-04-14 Invoke workflow atomic start seam
- `InvokeExecutionRepository` now declares `startInvokeWorkflowTargetAtomically(...)` as the required transactional seam for workflow-child starts, mirroring the existing work-unit atomic boundary instead of relying on a service-level two-write sequence.
- `InvokeWorkflowExecutionService` should validate ownership/project boundaries only, then delegate both idempotency (`already_started`) and child workflow creation+linking to that atomic repository method so the service cannot orphan a supporting workflow execution.

## 2026-04-14 Zero-target completion reason wiring
- `getInvokeTargetsBlockedReason(...)` is now the single zero-target source of truth; target resolution uses it for both freshly resolved targets and already-frozen invoke child rows.
- `InvokeCompletionService` checks that canonical blocked reason before child-status eligibility, so zero-target invoke steps surface `No invoke targets resolved` instead of the generic completion rule text.
- The step-detail shell inherits the exact disabled reason by reusing invoke completion eligibility through `completionSummary.reasonIfIneligible`, which is now covered by a runtime step-detail test.

## 2026-04-14 Runtime layer invoke wiring
- `WorkflowEngineRuntimeStepServicesLive` must explicitly merge both invoke start services (`InvokeWorkflowExecutionServiceLive` and `InvokeWorkUnitExecutionServiceLive`) so the router-exposed invoke API surface stays composition-safe.
- Keeping `InvokeWorkUnitExecutionServiceLive` as a direct member of the step-services merge preserves its existing repository requirements without changing service implementation or introducing a new dependency cycle in `live.ts`.

## 2026-04-14 Invoke test-gap closure
- The new runtime integration coverage now locks three high-risk behaviors together: workflow-start races only create one child workflow, zero-target invoke completion fails with the canonical `No invoke targets resolved` reason, and repeated work-unit completion stays propagation-idempotent (`replaceWorkflowExecutionContextFacts` runs once).
- Route-level disabled-action coverage should assert actual UI behavior, not just payload shape: blocked work-unit starts render disabled buttons, while an ineligible invoke completion can hide the `Complete Step` button entirely and leave the disabled reason visible in the shell/body text.
- Router-level invoke error mapping currently preserves the `INTERNAL_SERVER_ERROR` code for invoke `RepositoryError`s, but the user-facing message still collapses to the generic `Repository operation failed: ` because `mapEffectError(...)` reads `err.message` instead of the tagged error's nested `cause` message.

## 2026-04-14 Invoke active-step invariant
- Both invoke start services now enforce the parent `stepExecution.status === "active"` invariant server-side immediately after project ownership validation, so stale/completed invoke steps cannot launch new workflow or work-unit children even if a client bypasses UI disabling.
- The runtime step repository currently models step status as `"active" | "completed"`, so targeted guard coverage uses completed-step fixtures to prove the shared non-active rejection path without changing service interfaces.

## 2026-04-14 Invoke work-unit repository contract lock
- `InvokeExecutionRepository` now declares `startInvokeWorkUnitTargetAtomically(...)` as a first-class required service method, with a named `StartInvokeWorkUnitTargetAtomicallyParams` contract mirroring the existing workflow atomic-start seam.
- `InvokeWorkUnitExecutionService` should consume `yield* InvokeExecutionRepository` directly and call the atomic start method through the declared repository contract; ad-hoc type intersections and optional capability checks weaken the Effect boundary and are unnecessary once the contract is explicit.

## 2026-04-14 Plan compliance rerun
- The rerun passed: reviewed invoke contracts, schema, services, router surface, and step-detail UI all match the locked invoke-only plan without introducing branch runtime, workflow-page redesign, or invoke-specific streaming.
- The previously rejected zero-target path is now consistently wired end-to-end: `InvokeCompletionService`, `StepExecutionDetailService`, and transaction-level completion failures all surface the same canonical reason `No invoke targets resolved`.
- Workflow child start now depends on the repository-level atomic seam instead of a service-level two-write sequence, and targeted integration coverage proves atomic failure does not orphan supporting workflow executions.

## 2026-04-14 Manual QA rerun
- The rerun approved the invoke slice: targeted runtime/web/api Vitest coverage now closes all previously flagged QA gaps, including router error mapping, UI disabled-action assertions, live-layer composition, workflow-start race behavior, zero-target completion-disabled wiring, and work-unit propagation idempotency on retry.
- Required verification command passed cleanly with 8/8 files and 27/27 tests green.

## 2026-04-14 Code-quality rerun
- The invoke code-quality rerun approved the slice: the live runtime layer now exports both invoke start services, both start services enforce the active-step invariant server-side, and both atomic repository seams are first-class typed contracts.
- The zero-target disabled/completion reason is now genuinely single-sourced through `getInvokeTargetsBlockedReason(...)`, with coverage across resolution, detail, transaction completion, and integration tests.
- Targeted verification for this rerun passed cleanly: `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-invoke-*.test.ts` finished 6/6 files green (22/22 tests), and reviewed invoke files were clean under `lsp_diagnostics`.

## 2026-04-14 Scope fidelity rerun
- The previously flagged `.sisyphus` changes are orchestration artifacts, not implementation scope creep: the plan diff is checkbox-only progress tracking, while `.sisyphus/boulder.json`, notepads, and evidence files belong to the orchestration system.
- The extra workflow-engine edits outside the original short allowlist are still invoke-scoped integration work: `workflow-execution-step-command-service.ts`, `step-execution-transaction-service.ts`, `step-execution-detail-service.ts`, `index.ts`, and `layers/live.ts` only gate, propagate, expose, or wire invoke behavior.
- The rerun found no forbidden expansion: no branch runtime implementation, no invoke-specific SSE/streaming, no workflow execution page redesign, no redundant source-mode persistence split, and no context-fact propagation during child start.
