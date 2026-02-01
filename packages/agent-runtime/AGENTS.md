# Agent Runtime (Chiron) — Implementation Spec

This document captures the current state of `@chiron/agent-runtime` and how it integrates OpenCode alongside Chiron’s AI-SDK runtime. It is intended as a practical “what exists and why” reference for returning to this module.

## Purpose

`@chiron/agent-runtime` is the execution layer for `agent` steps. It exposes a single contract that supports two agent kinds:

- `chiron` — Chiron’s step-scoped AI-SDK agent
- `opencode` — OpenCode SDK agent (full toolset + Chiron tools)

Both are surfaced through the same `AgentRuntime` interface so orchestration code remains agnostic.

## Public Contract (Exports)

Located in `packages/agent-runtime/src/index.ts` and `@chiron/contracts`:

- `AgentRuntime` (Tag), `AgentRuntimeLive`, `AgentRuntimeDefault`
- `AgentAdapter` interface + adapter Tags
- `AgentRunParams`, `AgentRunResult`, `AgentStreamEvent`, `AgentKind`
- OpenCode tool IO types: `ChironContextInput/Output`, `ChironActionsInput/Output`, `ChironActionInput/Output`

## Implementation Layout

```
packages/agent-runtime/
  src/
    adapters/
      chiron-adapter.ts
      opencode-adapter.ts
    ai-sdk/
      ai-provider-service.ts
      ai-runtime-runner.ts
      ai-runtime-service.ts
      provider-adapter.ts
      provider-adapters.ts
      openai-adapter.ts
      anthropic-adapter.ts
      openrouter-adapter.ts
      opencode-adapter.ts
      pass-through-adapter.ts
      streaming-adapter.ts
      events.ts
    opencode/
      opencode-relay.ts
      session-registry.ts
    adapters.ts
    config-service.ts
    errors.ts
    runtime.ts
    tooling-bridge.ts
```

### Core files

- `runtime.ts`
  - Defines `AgentRuntime` interface and Tag.
  - Routes by `agentKind` to the correct adapter.
  - `AgentRuntimeDefault` wires both adapters.

- `adapters.ts`
  - Adapter interface + Tags: `ChironAgentAdapter`, `OpenCodeAgentAdapter`.

- `errors.ts`
  - `AgentRuntimeError` (Effect tagged error).

- `tooling-bridge.ts`
  - Placeholder interface for tooling-engine integration (validate/approve/execute).
  - Will be replaced by real tooling-engine hooks later.

## Chiron Adapter (AI-SDK)

File: `src/adapters/chiron-adapter.ts`

Responsibilities:
- Uses `AiRuntimeService` + `runAiRuntime` to stream and execute tools.
- Requires `toolContext` + `toolConfigs` for approval/execution.
- Emits EventBus stream for UI consumption.

Behavior notes:
- Read-only in practice (no edit-capable tools are provided unless tooling-engine enables them).
- Uses AI-SDK provider adapters (OpenAI, Anthropic, OpenRouter, OpenCode).

## OpenCode Adapter

File: `src/adapters/opencode-adapter.ts`

Responsibilities:
- Uses OpenCode SDK (`@opencode-ai/sdk`) directly (not ACP).
- Starts or reuses a shared OpenCode server (uses `OPENCODE_BASE_URL` if provided).
- Creates a session per step execution.
- Sends prompt via `session.prompt_async` with static tool set enabled.
- Streams SSE from `/global/event`, maps events to `AgentStreamEvent`.
- Registers `sessionId -> executionId/stepId/directory` in session registry.

Static tool set (always enabled):
- `chiron_context`
- `chiron_actions`
- `chiron_action`

These tool definitions live in `.opencode/tools/` (project-local).

## Session Registry

File: `src/opencode/session-registry.ts`

Stores:
- `sessionId -> executionId/stepId/directory`

Used by Chiron’s tool endpoints to map tool calls back to the correct execution context.

## OpenCode Tool Files (Project Local)

Created under `.opencode/tools/` in repo root:

- `chiron_context.ts`
- `chiron_actions.ts`
- `chiron_action.ts`

Each calls Chiron endpoints:

- `POST /api/opencode/chiron_context`
- `POST /api/opencode/chiron_actions`
- `POST /api/opencode/chiron_action`

## Chiron Server Endpoints (Tool Backends)

Implemented in `packages/api/src/routers/opencode.ts` and registered in `routers/index.ts`:

- `opencode.chironContext`
- `opencode.chironActions`
- `opencode.chironAction`

REST endpoints exposed in `apps/server/src/index.ts`:

- `POST /api/opencode/chiron_context`
- `POST /api/opencode/chiron_actions`
- `POST /api/opencode/chiron_action`

## Event Mapping (OpenCode -> AgentStreamEvent)

The OpenCode adapter maps tool/message events to the same stream schema as AI-SDK:

- `message.part.updated` -> `message.delta`
- `tool` part state `pending` -> `tool.pending`
- `tool` part state `running` -> `tool.call`
- `tool` part state `completed` -> `tool.result`
- `tool` part state `error` -> `error`
- `session.idle` -> `message.complete`

## Contracts and Dependencies

Dependencies consumed by agent-runtime:
- `@chiron/contracts` for shared types
- `@chiron/tooling-engine` (via tooling-bridge -> execute/approve/validate tool calls)
- `@chiron/event-bus` (stream events to UI + workflows)
- `@chiron/provider-registry` (model/provider resolution)
- `@chiron/prompt-composer` (system prompt layers)
- `@chiron/sandbox-git` (worktree resolution for OpenCode execution)
- AI-SDK providers: OpenAI, Anthropic, OpenRouter
- OpenCode SDK: `@opencode-ai/sdk`
- Effect runtime

Exposed contracts:
- `AgentRunParams` / `AgentRunResult`
- `AgentStreamEvent`
- OpenCode tool IO types

## OpenCode Integration References

- OpenCode SDK JS (`packages/sdk/js`) in `anomalyco/opencode`
- OpenCode custom tools docs: <https://opencode.ai/docs/custom-tools/>

## Security TODOs (Tool Endpoint Hardening)

These are required before production:

- [ ] Issue short-lived tool tokens when OpenCode session is created
- [ ] Require `Authorization` for all `/api/opencode/*` endpoints
- [ ] Verify sessionId/messageId against registry and execution ownership
- [ ] Rate-limit tool endpoints per sessionId + IP
- [ ] Log all tool invocations for audit
- [ ] Restrict tool endpoints to internal network / localhost when possible
