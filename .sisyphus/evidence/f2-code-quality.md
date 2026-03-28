# F2: Code Quality Review — unified-l1-l2-runtime-slice

**Date:** 2026-03-29
**Verdict:** ❌ REJECT

## Scope reviewed

- `packages/contracts/src/runtime/*`
- `packages/db/src/runtime-repositories/*`
- `packages/workflow-engine/src/services/*`
- `packages/api/src/routers/project-runtime.ts`
- Changed runtime web routes:
  - `apps/web/src/routes/projects.$projectId.index.tsx`
  - `apps/web/src/routes/projects.$projectId.facts.tsx`
  - `apps/web/src/routes/projects.$projectId.transitions.tsx`
  - `apps/web/src/routes/projects.$projectId.work-units.tsx`
- Relevant tests:
  - `packages/api/src/tests/architecture/runtime-router-boundary.test.ts`
  - `packages/workflow-engine/src/tests/architecture/runtime-boundary-lock.test.ts`
  - `packages/api/src/tests/routers/project-runtime-*.test.ts`
  - `apps/web/src/tests/routes/runtime-query-key-separation.test.tsx`

## Verification run

- `lsp_diagnostics`: clean for reviewed contracts/db/workflow-engine/api files and the 4 changed web routes
- `bun run check-types`: **FAILED**
  - `apps/web/src/routes/projects.$projectId.index.tsx:111` — missing required `hasActiveTransition` search param in link to `/work-units`
  - `apps/web/src/routes/projects.$projectId.facts.tsx:194` — missing required `search` prop in detail link
  - `apps/web/src/routes/projects.$projectId.work-units.tsx:161` — missing required `search` prop in detail link
  - Additional runtime-route type failures also remain in artifact/fact/state-machine detail pages

## Findings summary

### Critical

1. **Runtime services are not composed into the real server/app layer.**
   - `packages/api/src/routers/index.ts:30-56` builds `methodologyServiceLayer` only, then passes it into `createProjectRouter(...)`.
   - `apps/server/src/index.ts:21-25` only provides methodology/lifecycle/project-context repo layers.
   - Runtime procedures in `packages/api/src/routers/project-runtime.ts` depend on workflow-engine runtime services, but the app composition does not provide them.
   - Result: runtime endpoints are not actually wired for production resolution.

2. **Command/detail runtime layer composition is incomplete.**
   - `packages/workflow-engine/src/layers/live.ts:11-29` exports only read-oriented runtime services (`RuntimeGateService`, `RuntimeWorkflowIndexService`, `RuntimeFactService`, `RuntimeArtifactService`, `RuntimeOverviewService`, `RuntimeGuidanceService`, `RuntimeWorkUnitService`).
   - It does **not** compose `TransitionExecutionDetailServiceLive`, `TransitionExecutionCommandServiceLive`, `WorkflowExecutionDetailServiceLive`, or `WorkflowExecutionCommandServiceLive`.
   - `TransitionRuntimeGateService` is declared in `packages/workflow-engine/src/services/transition-execution-command-service.ts:51-63`, but no live implementation/layer is composed anywhere in production code.

3. **Atomic command paths are declared via unsafe casts but not implemented by repository interfaces/layers.**
   - `packages/workflow-engine/src/services/transition-execution-command-service.ts:65-81` adds optional `completeTransitionExecutionAtomically` and `choosePrimaryWorkflowForTransitionExecutionAtomically` via local cast types.
   - `packages/workflow-engine/src/repositories/transition-execution-repository.ts:43-64` and `packages/workflow-engine/src/repositories/workflow-execution-repository.ts:34-60` do not declare those methods.
   - `packages/db/src/runtime-repositories/transition-execution-repository.ts` and `packages/db/src/runtime-repositories/workflow-execution-repository.ts` do not implement them.
   - Therefore `completeTransitionExecution` (`packages/workflow-engine/src/services/transition-execution-command-service.ts:254-269`) and `choosePrimaryWorkflowForTransitionExecution` (`:301-314`) will always fall into the “missing atomic ... capability” RepositoryError path.

### High

4. **Router/service type safety is broken by undeclared-method casts.**
   - `RuntimeGuidanceService` only declares `getActive` and `streamCandidates` (`packages/workflow-engine/src/services/runtime-guidance-service.ts:45-55`), but router handler `getRuntimeStartGateDetail` casts the service to add `getRuntimeStartGateDetail` (`packages/api/src/routers/project-runtime.ts:414-417`).
   - `RuntimeFactService` only declares read methods (`packages/workflow-engine/src/services/runtime-fact-service.ts:54-69`), but router mutation handlers cast in six extra mutation methods (`packages/api/src/routers/project-runtime.ts:540-613`).
   - Relevant tests mask this with widened mocks:
     - `packages/api/src/tests/routers/project-runtime-detail-endpoints.test.ts:24-49`
     - `packages/api/src/tests/routers/project-runtime-mutations.test.ts:103-173`
   - This defeats the claimed service-contract discipline.

5. **Typed error handling is not disciplined for command/business failures.**
   - Router maps `RepositoryError` to `INTERNAL_SERVER_ERROR` (`packages/api/src/routers/project-runtime.ts:220-226`).
   - Command services manufacture `RepositoryError` for user/state validation failures (`packages/workflow-engine/src/services/transition-execution-command-service.ts:83-84`, `:118-135`, `:170-174`, `:204-258`; `packages/workflow-engine/src/services/workflow-execution-command-service.ts:11-12`, `:33-59`).
   - Result: invalid transition/workflow operations become 500s instead of typed domain/client errors.

6. **Changed runtime web routes are not type-safe under real route typing.**
   - `apps/web/src/routes/projects.$projectId.index.tsx:108-112` links to `/work-units` without required `hasActiveTransition` search.
   - `apps/web/src/routes/projects.$projectId.facts.tsx:194-199` omits required `search` for fact detail navigation.
   - `apps/web/src/routes/projects.$projectId.work-units.tsx:161-166` omits required `search` for work-unit overview navigation.
   - `bun run check-types` fails, so the runtime web slice is not verification-clean.

## Requested review areas

### 1) Type safety assessment

**Status:** FAIL

Positives:
- Contracts use `effect/Schema` consistently across `packages/contracts/src/runtime/*`.
- Repository/service tags are explicitly typed.
- Direct LSP diagnostics were clean on reviewed files.

Defects:
- Router uses `Layer.Layer<any>` / `Effect.Effect<unknown, any>` (`packages/api/src/routers/project-runtime.ts:230`, `:246`), weakening end-to-end typing.
- Router reaches undeclared service methods through casts.
- Test suite uses `as any` / widened intersections to hide contract mismatches.
- Monorepo typecheck fails on runtime route code.

### 2) Effect layer composition review

**Status:** FAIL

- Runtime live layer is incomplete for the full router surface.
- API/server composition never provides runtime repo/service layers to the live app.
- Runtime command/detail services are not production-wired.

### 3) Typed error handling review

**Status:** FAIL

- Read-side not-found mapping is reasonable.
- Infra and business-rule failures are conflated into `RepositoryError` and surfaced as 500s.
- This is not a typed domain error model.

### 4) Repository/service boundary discipline check

**Router boundary:** PASS

- `packages/api/src/routers/project-runtime.ts` does not compose repositories directly.
- No repository imports from db/runtime-repositories or workflow-engine repositories appear in router code.
- Dedicated boundary test also enforces this (`packages/api/src/tests/architecture/runtime-router-boundary.test.ts`).

**Service boundary:** FAIL

- Router stays service-only, but service contracts are bypassed with casts.
- Command services depend on repository capabilities not declared in repository interfaces.

### 5) Query-key separation verification

**Status:** PASS

- Reviewed runtime pages use dedicated runtime-prefixed keys:
  - `runtime-overview`
  - `runtime-project-facts`
  - `runtime-work-units`
  - `runtime-guidance-active`
- Dedicated guard test exists: `apps/web/src/tests/routes/runtime-query-key-separation.test.tsx`

### 6) Confirmation that every runtime procedure calls exactly one top-level service

**Status:** PASS with caveat

- Router inspection shows each procedure resolves one top-level service inside its handler.
- Query/mutation tests also verify one delegated service call for the covered procedures.
- Caveat: several handlers do this via unsafe casted methods that are not part of the declared service interface.

### 7) Confirmation that repos are not composed in routers

**Status:** PASS

- Confirmed by source inspection and boundary test.

## Final verdict

**REJECT**

The slice fails final code-quality review because it has production-blocking architecture and typing defects:

1. runtime services are not wired into the real app/server layer,
2. command/detail live layers are incomplete,
3. atomic repository capabilities required by command services are not actually implemented, and
4. the runtime web route surface does not pass monorepo typecheck.

Do **not** approve until those critical/high-severity defects are fixed and `bun run check-types` is clean.
