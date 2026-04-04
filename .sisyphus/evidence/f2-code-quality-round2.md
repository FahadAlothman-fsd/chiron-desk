# F2 Code Quality Review — L3 implementation (Round 2)

**Date:** 2026-04-03  
**Verdict:** ❌ **REJECT**

## Scope reviewed

- `packages/workflow-engine/src/services/transition-execution-command-service.ts`
- `packages/workflow-engine/src/services/transition-execution-detail-service.ts`
- `packages/api/src/routers/l3-runtime-router.ts`
- `apps/server/src/mcp/chiron-mcp-router.ts`

## Blocking issues from Round 1

### 1) Completion gates bypassed

**Status:** ✅ Fixed

Evidence:

- `transition-execution-command-service.ts:452-465` now resolves transition context and passes `transitionContext.completionGateConditionTree` into `evaluateCompletionGate(...)` during completion.
- `transition-execution-command-service.ts:527-540` does the same in `choosePrimaryWorkflowForTransitionExecution(...)`.
- `transition-execution-detail-service.ts:285-316` now builds `completionGateConditionTree` from lifecycle condition sets and passes that tree into `runtimeGate.evaluateCompletionGate(...)`.

Conclusion: the reviewed completion-gate paths are no longer calling the gate service with an empty placeholder tree in the previously-blocking paths.

### 2) Unsafe cast in `TransitionExecutionDetailService`

**Status:** ✅ Fixed

Evidence:

- No `as unknown as ...` / invented gate-service API remains in `transition-execution-detail-service.ts`.
- The service now calls the real `runtimeGate.evaluateCompletionGate({ projectId, projectWorkUnitId, conditionTree })` shape directly at `transition-execution-detail-service.ts:305-326`.

Conclusion: the previous fabricated API boundary is removed.

### 3) Router boundary violation in `l3-runtime-router.ts`

**Status:** ✅ Fixed

Evidence:

- `l3-runtime-router.ts:5-18` imports workflow-engine services from `@chiron/workflow-engine`.
- No source-relative `../../../workflow-engine/src/index` import remains in this router.
- No `as never` cast remains in this router.

Conclusion: this router now respects the workflow-engine package boundary.

### 4) MCP router orchestration leak

**Status:** ❌ Not fixed

Evidence:

- `chiron-mcp-router.ts:12-15` still defines a router-level union over three services: `AgentStepRuntimeService | StepContextQueryService | StepExecutionDetailService`.
- `chiron-mcp-router.ts:108-116` still orchestrates multiple services inside the transport layer for `read_context_value`:
  - `yield* AgentStepRuntimeService`
  - `yield* StepContextQueryService`
  - `runtime.getContextHandle(...)`
  - `runtime.parseContextKey(...)`
  - `contextQuery.readContextValue(...)`

Conclusion: the MCP router is still not delegating that tool flow to a single top-level service boundary. This remains a critical transport orchestration violation.

## Diagnostics / verification

### LSP diagnostics

`lsp_diagnostics` was clean for all four reviewed TypeScript files:

- `transition-execution-command-service.ts`
- `transition-execution-detail-service.ts`
- `l3-runtime-router.ts`
- `chiron-mcp-router.ts`

### Targeted tests

All targeted tests passed:

- `packages/workflow-engine`: `bunx vitest run src/tests/runtime/transition-execution-services.test.ts` → **PASS** (`4/4`)
- `packages/api`: `bunx vitest run src/tests/routers/project-runtime-queries.test.ts src/tests/routers/project-runtime-detail-endpoints.test.ts` → **PASS** (`15/15`)
- `apps/server`: `bunx vitest run src/tests/mcp/l3-agent-mcp-tools.test.ts` → **PASS** (`2/2`)

### Typecheck status

`bunx turbo check-types --filter=server --filter=web` → **FAIL**

Current state:

- The previous unresolved `@chiron/agent-runtime` / nullability failures called out in Round 1 were **not** reproduced in this run.
- However, `server:check-types` still exits non-zero because of current Effect language-service diagnostics in shared code, including:
  - `packages/db/src/repositories/l3-design-time-repository.ts`
  - `packages/workflow-engine/src/layers/live.ts`
  - multiple `packages/workflow-engine/src/services/*`

So the reviewed slice is improved, but typecheck is still not green.

### Build

`bunx turbo build --filter=server --filter=web` → **PASS**

Notes:

- `server` build passed
- `web` build passed with only a chunk-size warning

## Final decision

**REJECT**

Reason:

- Three Round 1 blockers are fixed.
- One critical blocker remains: `apps/server/src/mcp/chiron-mcp-router.ts` still orchestrates multiple services at the transport boundary instead of delegating to a single top-level service.
- Typecheck is also still not green.

Approval should remain blocked until the MCP router orchestration leak is removed and the targeted typecheck command is green.
