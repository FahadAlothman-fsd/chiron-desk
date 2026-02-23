# Core Execution Modules (Implementation Order)

## Overview
This document defines the first batch of backend modules to implement, ordered by dependency and readiness for standalone testing. These modules form the execution core of Chiron and should be implemented before UI refactors.

## Implementation Order (current plan)
1. **AI Runtime (ai-sdk)**
2. **Tooling Engine**
3. **StepExecution Core**
4. **EventBus / Stream Relay**

> Note: The AI Runtime parser is intentionally designed to run without EventBus. It emits normalized events to a callback. The EventBus adapter is added after the parser and tooling are stable.

---

## Module 1: AI Runtime (ai-sdk)

**Purpose**
Stream LLM output and recover tool calls reliably.

**Responsibilities**
- Use `streamText` as the default path.
- Parse `fullStream` to reconstruct tool arguments (OpenCode pattern).
- Validate tool args and decide whether to request approval.
- Retry text-only when tool schemas are rejected.

**Inputs**
- `model` (provider + modelId)
- `messages` (prompt layers + history)
- `tools` (Chiron tool schemas)
- `toolChoice`

**Outputs (normalized events)**
- `TextChunk`
- `ToolCallRequested`
- `ToolResult`
- `StreamDone`
- `StreamError`

**Parsing Rules**
- Parse `tool-input-start`, `tool-input-delta`, `tool-call` from `fullStream`.
- Use `argsTextDelta` (fallback: `inputTextDelta`), or `tool-call.input` if deltas missing.
- If args invalid → skip tool call and continue text-only.
- If provider rejects tool schema → retry stream without tools.

**Acceptance Criteria**
- Tool calls recover for `gpt-oss-120b` + Claude via stream parsing.
- Tool schema failures (e.g., gpt-4o-mini on OpenRouter) retry text-only.
- No dependency on `result.toolCalls`.

---

## Module 2: Tooling Engine

**Purpose**
Single dispatcher for Chiron-owned tools.

**Responsibilities**
- Tool registry + schema validation.
- Approval gating.
- Variable updates (`variables_delta`).
- Execute-action support (shared action executor).
- Ax tool execution via signature registry.

**Inputs**
- Tool name + arguments
- Step execution context (executionId, stepExecutionId, tool scope)

**Outputs**
- Tool result
- Variable updates
- Events: `ToolCallStarted`, `ToolCallCompleted`, `ApprovalRequested`

**Acceptance Criteria**
- Tool approvals block/resume correctly.
- Tool results update variables consistently.
- Ax tool can be added without changes to handlers.

---

## Module 3: StepExecution Core

**Purpose**
Make step execution the unit of state, history, and revision.

**Responsibilities**
- Create `step_executions` per step run.
- Maintain status and timestamps.
- Support revisions and rollback without mutating history.
- Merge only active steps into workflow variables.

**Schema (minimum)**
- `execution_id`, `step_id`, `step_number`, `status`
- `variables_delta`, `approval_state`, `metadata`
- `revision_of_step_execution_id`, `parent_step_execution_id`
- `is_active`, `started_at`, `completed_at`

**Revision Rules**
- Completed steps are immutable.
- Revisions create new rows; only one active revision per step slot.
- Downstream steps become stale when upstream revision is created.

**Acceptance Criteria**
- Active step execution drives UI and variable resolution.
- Revision history preserved and auditable.

---

## Module 4: EventBus / Stream Relay

**Purpose**
Unified real-time event pipeline for ai-sdk and OpenCode.

**Responsibilities**
- Accept events from AI Runtime or OpenCode adapter.
- Publish to EventBus and tRPC subscription.
- Preserve ordering and step scoping.

**Event Schema**
- `TextChunk`, `ToolCallRequested`, `ToolResult`, `ApprovalRequested`,
  `StepCompleted`, `StreamError`

**Acceptance Criteria**
- Single UI reducer works for ai-sdk and OpenCode streams.
- Streams end on `StepCompleted` or `StreamError`.

---

## Missing / Deferred Modules (next batch)
- OpenCode Stream Adapter (session stream → EventBus)
- MCP Action Registry (`chiron_context`, `chiron_actions`, `chiron_action`)
- Model Catalog by Engine
- AX Signature Registry
- Sandbox/Git Service integration
- Frontend refactor (Zustand + StepExecution UI)
