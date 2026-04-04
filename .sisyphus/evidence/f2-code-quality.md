# F2: Code Quality Review — l3-step-definition-execution-final (FINAL WAVE)

**Date:** 2026-04-03  
**Verdict:** ❌ **REJECT**

## Verification evidence run

- Full required command set executed and recorded in:
  - `.sisyphus/evidence/final-wave-tests.log`
- Result: **19 PASS / 2 FAIL** (`TOTAL_FAILURES=2`)
- Failed commands:
  1. `OPENCODE_SERVER_PASSWORD=test bunx vitest run packages/agent-runtime/src/tests/opencode/opencode-lifecycle.test.ts`
  2. `OPENCODE_SERVER_PASSWORD=test bunx vitest run packages/agent-runtime/src/tests/opencode/opencode-mcp-binding.test.ts`

Failure signature in both:
- `HarnessInstanceError: Server exited with code 1`
- OpenCode output references log path under `~/.local/share/opencode/log/...`

## Architecture / boundary checks

### 1) MCP transport stack
- ✅ PASS
- `apps/server/src/mcp/chiron-mcp-router.ts:6-7`
  - `import { StreamableHTTPTransport } from "@hono/mcp"`
  - `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"`

### 2) OpenCode SDK integration is real (not stubbed)
- ✅ PASS
- SDK imports and usage exist in adapter implementation:
  - `packages/agent-runtime/src/opencode/opencode-server-manager-service.ts` (`createOpencode`)
  - `packages/agent-runtime/src/opencode/opencode-client-factory-service.ts` (`createOpencodeClient`)
  - `packages/agent-runtime/src/opencode/opencode-session-service.ts` (SDK `Event`/`Part`)

### 3) OpenCode does not leak into workflow-engine/api via SDK imports
- ✅ PASS
- `grep @opencode-ai/sdk` in `packages/workflow-engine/src` and `packages/api/src` returned no matches.

### 4) Router orchestration boundary in MCP transport
- ⚠️ FAIL (still a code-quality finding)
- `apps/server/src/mcp/chiron-mcp-router.ts:108-116` orchestrates two services directly in transport for `read_context_value`:
  - `AgentStepRuntimeService`
  - `StepContextQueryService`

## Diagnostics / build

- `lsp_diagnostics` run on key touched runtime files (MCP router, workflow detail service, opencode manager/client files): **clean**.
- `bunx turbo build --filter=server --filter=web`: **PASS**.

## Final decision

**REJECT**

Blocking reasons:
1. 2 required final-wave tests failed.
2. MCP router still contains transport-layer multi-service orchestration for `read_context_value`.

---

## 2026-04-03 Slice-1 shared foundation coupling review

**Scope reviewed**

- `packages/methodology-engine/src/services/*workflow*`
- `packages/workflow-engine/src/services/*step*`, runtime command/detail services
- `packages/db/src/{schema,repositories,runtime-repositories}`
- `packages/api/src/routers/{methodology,project-runtime,index}.ts`
- `apps/server/src/index.ts`

**Verdict:** ❌ **REJECT**

### Blocking findings

1. **Form-specific logic leaks into the shared runtime foundation.**
   - `packages/db/src/schema/runtime.ts:272-278` stores `step_executions.step_definition_id` as a foreign key to `methodologyWorkflowFormSteps.id`, not the generic `methodologyWorkflowSteps.id`.
   - `packages/workflow-engine/src/services/form-step-execution-service.ts:30-49` uses the `project.<factDefinitionId>` key prefix convention to split writes, and `:93-95` hard-fails non-`form` steps.
   - `packages/workflow-engine/src/services/step-execution-detail-service.ts:126-147,180-185` decodes the same `project.<factDefinitionId>` convention in a supposedly shared detail surface.
   - **Why blocking:** later `agent` / `action` / `invoke` / `branch` / `display` slices will need schema and shared-service rewrites instead of layering on a generic step-execution foundation.

2. **Shared “transaction” services are not actually transactional.**
   - `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts:67-232` is a sequential orchestrator over metadata, form-step, edge, and context-fact mutations with no shared repository transaction.
   - `packages/workflow-engine/src/services/step-execution-transaction-service.ts:88-158` writes form state, completes the step, persists context facts, persists authoritative project facts, and activates the next step across multiple repositories with no atomic boundary.
   - **Why blocking:** any mid-sequence failure can leave authoring/runtime state partially committed; later slices would have to replace these “foundation” services to get real consistency guarantees.

3. **The production wiring/capability model for slice-1 shared services is incomplete and internally inconsistent.**
   - `apps/server/src/index.ts:29-41` wires methodology/lifecycle/project-context/runtime repos, but does **not** provide `createFormStepRepoLayer`, `createWorkflowContextFactRepoLayer`, or any step-execution repo layer.
   - `packages/api/src/routers/index.ts:39-47` types `runtimeRepoLayer` without `StepExecutionRepository`, while `packages/workflow-engine/src/layers/live.ts:44-52` builds services that require it.
   - `packages/db/src/index.ts:28-35` exports `createStepExecutionRepoLayer` from `packages/db/src/repositories/step-execution-repository.ts`, while the full workflow-engine implementation actually lives in `packages/db/src/runtime-repositories/step-execution-repository.ts:93-257`.
   - `packages/workflow-engine/src/services/transition-execution-command-service.ts:491-549` requires atomic repo capabilities (`completeTransitionExecutionAtomically`, `choosePrimaryWorkflowForTransitionExecutionAtomically`) that are not implemented in `packages/db/src/runtime-repositories/transition-execution-repository.ts` or `workflow-execution-repository.ts`.
   - **Why blocking:** the reusable slice-1 services are not actually deployable/shared in the real server composition; later slices would need rewiring and repository contract surgery.

4. **Transition completion is coupled to placeholder logic instead of lifecycle metadata.**
   - `packages/workflow-engine/src/services/transition-execution-command-service.ts:235-281` resolves `completionGateConditionTree` and `targetState`, but `:452-488` ignores that context, evaluates `emptyGate`, and then tries to read `targetState` from the gate result shape.
   - **Why blocking:** the core shared transition command path is not slice-agnostic and will need redesign before later slices can rely on completion gates.

### Non-blocking findings

1. **Condition-tree translation is duplicated across services.**
   - `packages/workflow-engine/src/services/runtime-guidance-service.ts:130-240`
   - `packages/workflow-engine/src/services/transition-execution-command-service.ts:50-154`
   - This is maintenance coupling; extract one translator for runtime-condition hydration.

2. **API/package boundaries are looser than they should be.**
   - `packages/api/src/routers/project-runtime.ts:15-28` and `packages/api/src/routers/index.ts:19-28` import workflow-engine internals via relative `../../../workflow-engine/src/index` paths instead of a clean package boundary.

3. **The intended atomic authoring entry point is disconnected from the route surface.**
   - `packages/api/src/routers/methodology.ts` imports `WorkflowAuthoringTransactionService` (`:11`) but does not use it; the router exposes only piecemeal mutations.
   - This is not blocking today, but it means the “transaction service” is not yet the canonical path for future slices.

## Final decision for this review

**REJECT**

The slice-1 shared services are **not** yet reusable foundations for later slices. The runtime schema and shared services are still form-coupled, transaction boundaries are not real, and the production wiring/capability story is incomplete enough that later slices would require architectural rewrites instead of additive extension.
