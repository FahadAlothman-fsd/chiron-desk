# OpenCode Adapter Plan (@chiron/agent-runtime)

## TL;DR

> **Quick Summary**: Add a minimal OpenCode SDK adapter alongside existing agent-runtime adapters, wired through `step.config.agentKind`, registering the static Chiron tools and mapping OpenCode session/events into `AgentStreamEvent`.
> 
> **Deliverables**:
> - OpenCode adapter module (minimal viable)
> - Adapter registration and agentKind dispatch wiring
> - Tool registration for `chiron_context`, `chiron_actions`, `chiron_action`
> - Session lifecycle mapping for OpenCode SDK
> - Event mapping from OpenCode stream to `AgentStreamEvent`
> - Verification steps and commands
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: NO - sequential
> **Critical Path**: Locate agent-runtime patterns → implement adapter → wire agentKind dispatch → map events → verify

---

## Context

### Original Request
“Implement OpenCode adapter in @chiron/agent-runtime. Context: static tools chiron_context/chiron_actions/chiron_action; agentKind dispatch via step.config.agentKind; Chiron agent read-only; OpenCode SDK integration (not ACP). Provide: step-by-step plan, required files, minimal viable adapter, tool registration + session mapping, event mapping to AgentStreamEvent, and verification steps. No code edits.”

### Interview Summary
**Key Discussions**:
- Use OpenCode SDK (not ACP), integrate as an adapter.
- Use static tools `chiron_context`, `chiron_actions`, `chiron_action`.
- Dispatch via `step.config.agentKind`.
- Chiron agent must be read-only.

**Research Findings**:
- Skipped per user request.

---

## Work Objectives

### Core Objective
Introduce a minimal OpenCode adapter in `@chiron/agent-runtime` that conforms to existing adapter conventions, registers static tools, maps sessions and streaming events to `AgentStreamEvent`, and is selectable via `step.config.agentKind`.

### Concrete Deliverables
- New adapter module for OpenCode SDK.
- Updated adapter registry and dispatching by `step.config.agentKind`.
- Tool registration for `chiron_context`, `chiron_actions`, `chiron_action`.
- Session mapping (OpenCode session ↔ agent-runtime session identity).
- Event mapping (OpenCode SDK stream → `AgentStreamEvent`).
- Verification steps with commands.

### Definition of Done
- Agent runtime can select OpenCode adapter via `step.config.agentKind` without errors.
- OpenCode adapter registers static tools and resolves them correctly.
- OpenCode streaming events are emitted as `AgentStreamEvent` with expected fields.
- Verification commands run cleanly (tests or scripted checks as applicable).

### Must Have
- Minimal viable adapter with session + event mapping.
- Tool registration uses `chiron_context`, `chiron_actions`, `chiron_action`.
- AgentKind dispatch supports OpenCode.

### Must NOT Have (Guardrails)
- No ACP integration.
- No write access for Chiron agent (read-only constraints preserved).
- No unrelated refactors.

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: Likely YES (bun test). Confirm in codebase.
- **User wants tests**: Not specified → default to Tests-after if tests exist, otherwise manual verification.
- **Framework**: bun test (per repo conventions).

### If Tests-After
- Add/extend adapter tests to cover tool registration and event mapping once implementation exists.

### Automated Verification Only
All verification steps should be executable via CLI commands. Use `bun test` if tests exist; otherwise use a scripted node/bun run to exercise adapter flow and assert event outputs.

---

## Execution Strategy

### Sequential Steps
1) Locate existing agent-runtime adapter patterns and interface contracts.
2) Implement minimal OpenCode adapter module based on existing adapter API.
3) Wire adapter selection into agentKind dispatch (`step.config.agentKind`).
4) Register static Chiron tools in the adapter.
5) Implement OpenCode session lifecycle mapping (create/reuse/close and id mapping).
6) Map OpenCode SDK streaming events to `AgentStreamEvent`.
7) Add/adjust tests or script verification.
8) Run verification commands and capture outputs.

---

## Required Files (to locate in repo before implementation)

> These are the expected locations; confirm exact paths by inspecting the repository.

**Adapter Interfaces & Registry**
- `packages/agent-runtime/src/` (root index/registry for adapters)
- `packages/agent-runtime/src/adapters/` (existing adapters to mirror)
- `packages/agent-runtime/src/agent-kind` or similar (agentKind mapping)

**Events & Types**
- `packages/agent-runtime/src/events/` or `packages/agent-runtime/src/types/` (contains `AgentStreamEvent`)

**Tooling**
- `packages/agent-runtime/src/tools/` or `packages/agent-runtime/src/tooling/` (tool schemas and registration)
- Static tools: `chiron_context`, `chiron_actions`, `chiron_action` definitions

**Step/Workflow Config**
- `packages/api/src/services/workflow-engine/` (step config with `step.config.agentKind`)

**Tests**
- `packages/agent-runtime/src/**/*.test.ts`

---

## Minimal Viable Adapter (Design)

### Adapter Responsibilities
- Initialize OpenCode SDK client.
- Create or reuse an OpenCode session.
- Register static tools (`chiron_context`, `chiron_actions`, `chiron_action`).
- Execute a prompt/step and stream responses.
- Convert OpenCode stream events to `AgentStreamEvent`.
- Respect read-only constraints (no write tool or mutation capability for Chiron agent).

### Session Mapping
- **Session ID Source**: Use agent-runtime’s session identifier as the primary key.
- **Mapping**: Maintain a lookup from agent-runtime session id → OpenCode session id.
- **Lifecycle**:
  - On start: create OpenCode session if none mapped.
  - On reuse: attach existing OpenCode session for continuity.
  - On end: close OpenCode session if the runtime indicates termination.

### Tool Registration
- Register three tools at session start (or adapter init):
  - `chiron_context`: provides contextual data to the agent.
  - `chiron_actions`: returns available actions list.
  - `chiron_action`: executes a single action by name/args.
- Ensure tool schemas match expected OpenCode SDK tool registration format.
- Enforce read-only if relevant tools could mutate state.

### Event Mapping to `AgentStreamEvent`
Map OpenCode SDK stream events into the runtime event model. Use a deterministic mapping table:

| OpenCode Event | AgentStreamEvent Type | Fields |
|---|---|---|
| message delta / token | `token` or `message.delta` | text chunk, sequence id, timestamp |
| message complete | `message.complete` | full text, message id |
| tool call start | `tool.call.started` | tool name, input |
| tool call result | `tool.call.completed` | tool name, output, duration |
| error | `error` | error code/message, stack if available |
| done/finish | `done` | final status, reason |

**Notes**:
- Preserve correlation ids between tool calls and events.
- Normalize timestamps to agent-runtime expected format.
- Attach adapter metadata (provider name = OpenCode).

---

## TODOs

- [ ] 1. Identify adapter interfaces and existing adapter patterns in agent-runtime

  **What to do**:
  - Locate adapter interface/type (init/run/stream signatures).
  - Identify how tools are registered and invoked.
  - Locate `AgentStreamEvent` definition and required fields.

  **Must NOT do**:
  - No code modifications during this step.

  **References**:
  - `packages/agent-runtime/src/adapters/*` - existing adapter patterns to mirror
  - `packages/agent-runtime/src/types/*` - `AgentStreamEvent` contract
  - `packages/api/src/services/workflow-engine/*` - `step.config.agentKind` usage

  **Acceptance Criteria**:
  - Adapter interface signature and event contract documented in notes.

- [ ] 2. Define minimal OpenCode adapter interface and file placement

  **What to do**:
  - Choose file location in adapter folder.
  - Define exported adapter shape consistent with others.

  **Must NOT do**:
  - No ACP integration; OpenCode SDK only.

  **Acceptance Criteria**:
  - Proposed file path and export name agreed.

- [ ] 3. Implement OpenCode session lifecycle mapping (create/reuse/close)

  **What to do**:
  - Select OpenCode SDK session API.
  - Add runtime session lookup map.
  - Ensure cleanup on termination.

  **Acceptance Criteria**:
  - Session mapping flow documented in code comments/tests.

- [ ] 4. Register static tools with OpenCode SDK

  **What to do**:
  - Register `chiron_context`, `chiron_actions`, `chiron_action` during adapter init/session start.
  - Map tool input/output to OpenCode schema.
  - Enforce read-only if any tool could mutate state.

  **Acceptance Criteria**:
  - Tool calls appear in stream as OpenCode tool events.

- [ ] 5. Map OpenCode stream events to `AgentStreamEvent`

  **What to do**:
  - Create mapping table for OpenCode event types to `AgentStreamEvent`.
  - Normalize fields (ids, timestamps, metadata).
  - Ensure errors propagate as `AgentStreamEvent` errors.

  **Acceptance Criteria**:
  - Stream test or script shows expected event types.

- [ ] 6. Wire agentKind dispatch

  **What to do**:
  - Add `opencode` (or chosen identifier) to agentKind registry.
  - Ensure `step.config.agentKind` selects OpenCode adapter.

  **Acceptance Criteria**:
  - A step configured with agentKind=OpenCode resolves to the adapter.

- [ ] 7. Verification

  **What to do**:
  - Add tests or scripted verification of adapter initialization, tool calls, and event mapping.
  - Run commands listed below and capture outputs.

  **Acceptance Criteria**:
  - Commands succeed and event outputs match expected mapping.

---

## Verification Commands

> Use once implementation exists; adjust to actual file paths and test scripts.

**Lint/Format (if required):**
```bash
bun check
```

**Unit Tests:**
```bash
bun test packages/agent-runtime
```

**Adapter Smoke Test (if a script exists or is added):**
```bash
bun -e "import { runOpenCodeAdapter } from './packages/agent-runtime/src/...'; /* invoke minimal run */"
```

---

## Success Criteria

- OpenCode adapter loads via `step.config.agentKind` and runs without errors.
- Static tools are registered and callable during a run.
- Streamed output is emitted as valid `AgentStreamEvent` values.
- Verification commands pass.
