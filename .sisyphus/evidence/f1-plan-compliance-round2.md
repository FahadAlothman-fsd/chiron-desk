# F1: Plan Compliance Audit — l3-step-definition-execution-final (Round 2)

**Date:** 2026-04-03  
**Plan:** `.sisyphus/plans/l3-step-definition-execution-final.md`  
**Audit scope:** Round 2 verification of the two Round 1 blockers plus the remaining locked L3 architectural decisions listed in the audit request.

## Executive Verdict

## ✅ APPROVE

The two Round 1 blockers are fixed in the current codebase: the shared MCP transport now uses `@hono/mcp` with `@modelcontextprotocol/sdk`, and `packages/workflow-engine` no longer persists or exposes `opencode*` adapter fields. The other requested locked decisions remain intact: workflow start is still separate from step start, `entryStepId` stays nullable-in-draft and publish-validated, typed save procedures remain in place, the shared context split is preserved, one OpenCode server is still keyed per active Agent step execution, and the transaction seam still exists and is used by multi-aggregate step commands.

## Compliance Results

### 1) MCP transport now uses `@hono/mcp` + `@modelcontextprotocol/sdk`
**Status:** ✅ PASS

Evidence:
- `apps/server/src/mcp/chiron-mcp-router.ts:6-7` imports:
  - `StreamableHTTPTransport` from `@hono/mcp`
  - `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`
- `apps/server/src/mcp/chiron-mcp-router.ts:44-52` creates an SDK `McpServer`.
- `apps/server/src/mcp/chiron-mcp-router.ts:173-216` serves requests through `StreamableHTTPTransport` instead of the prior custom JSON-only transport.
- `apps/server/package.json:23-24` includes both dependencies.

### 2) OpenCode boundary: `opencode*` fields removed from `packages/workflow-engine`
**Status:** ✅ PASS

Evidence:
- Repo search under `packages/workflow-engine` found **no `opencode*` matches** in production code.
- `packages/workflow-engine/src/repositories/l3-step-execution-repository.ts:31-50` now exposes harness-generic binding fields:
  - `bindingBaseUrl`
  - `bindingPort`
  - `bindingSessionId`
  - `bindingInstanceId`
- `packages/workflow-engine/src/services/agent-step-runtime-service.ts:214-229`, `243-289`, `328-335`, `469-474` reads/writes only those generic binding fields.
- OpenCode-specific storage names remain internal to DB mapping only:
  - `packages/db/src/runtime-repositories/l3-step-execution-repository.ts:71-83`, `276-299`
  - `packages/db/src/schema/runtime.ts:180-183`

### 3) Workflow start vs. step start separation
**Status:** ✅ PASS

Evidence:
- `packages/workflow-engine/src/services/transition-execution-command-service.ts:359-379` starts the transition and workflow execution, but does not create a step execution.
- `packages/workflow-engine/src/services/step-execution-lifecycle-service.ts:73-88` creates step executions only in `activateStep`.
- `packages/workflow-engine/src/services/step-execution-lifecycle-service.ts:75-77` rejects activation sources other than `"workflow_execution_page"`.
- `packages/api/src/routers/l3-runtime-router.ts:246-259` activates steps explicitly with `activationSource: "workflow_execution_page"`.

### 4) `entryStepId` validation remains correct
**Status:** ✅ PASS

Evidence:
- `packages/contracts/src/methodology/version.ts:72-80` keeps `entryStepId` as `Schema.optional(Schema.NullOr(Schema.NonEmptyString))`.
- `packages/methodology-engine/src/validation.ts:547-602` rejects publish-time cases where `entryStepId` is null, foreign to the workflow, or unresolved.

### 5) Typed procedures remain in place; no generic `saveWorkflowStep`
**Status:** ✅ PASS

Evidence:
- `packages/api/src/routers/l3-design-time-router.ts:364-454` exposes only typed save procedures:
  - `saveFormStep`
  - `saveAgentStep`
  - `saveActionStep`
  - `saveInvokeStep`
  - `saveBranchStep`
  - `saveDisplayStep`
- Repo search found `saveWorkflowStep` only in tests asserting its absence:
  - `packages/api/src/tests/routers/l3-design-time-router.test.ts`
  - `packages/api/src/tests/routers/project-l3-design-time.test.ts`
  - `packages/methodology-engine/src/tests/l3/l3-design-time-services.test.ts`

### 6) Shared service split is still maintained
**Status:** ✅ PASS

Evidence:
- Shared services remain split across:
  - `packages/workflow-engine/src/services/step-context-query-service.ts`
  - `packages/workflow-engine/src/services/step-context-mutation-service.ts`
  - `packages/workflow-engine/src/services/step-output-materialization-service.ts`
- Repo search found no production `StepContextService`, `L3Repository`, or god `StepService` implementation in `packages/workflow-engine/src`.

### 7) One OpenCode server per active Agent step execution
**Status:** ✅ PASS

Evidence:
- `packages/agent-runtime/src/opencode/opencode-session-service.ts:254-255` maintains `instancesByStep` keyed by step execution.
- `packages/agent-runtime/src/opencode/opencode-session-service.ts:285-333` reuses an existing instance for the same `stepExecutionId` and otherwise creates one new server/instance for that step.
- `packages/agent-runtime/src/opencode/opencode-mcp-config-service.ts:41-50` builds MCP config per `stepExecutionId` and encodes it into the MCP URL query.
- `packages/agent-runtime/src/opencode/opencode-server-manager-service.ts:190-198` can locate a running server by `stepExecutionId`.

### 8) Transaction seam exists and is used
**Status:** ✅ PASS

Evidence:
- `packages/workflow-engine/src/services/step-execution-transaction-service.ts:12-35` defines the shared `StepExecutionTransactionService` seam.
- Multi-aggregate services still execute through that seam:
  - `packages/workflow-engine/src/services/form-step-runtime-service.ts:118-151`
  - `packages/workflow-engine/src/services/invoke-step-runtime-service.ts:127-171`
  - `packages/workflow-engine/src/services/invoke-step-runtime-service.ts:193-216`
  - `packages/workflow-engine/src/services/branch-step-runtime-service.ts:190-220`
  - `packages/workflow-engine/src/services/display-step-runtime-service.ts:106-121`

## Final Decision

**APPROVE**

No Round 1 blocking issue remains in the scope requested for this audit, and the other listed locked decisions are still reflected in the current implementation.
