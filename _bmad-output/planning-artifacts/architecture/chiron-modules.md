# Chiron Modules (Full Map)

This document records the full module map agreed so far. It is a snapshot of backend + frontend modules, independent of current implementation order.

---

## Backend Modules

### Execution Core
- **WorkflowExecution**: orchestration state, current step pointer, workflow status.
- **StepExecution**: unit of work, history, revision chain, approvals, streaming scope.
- **State Manager**: persistence + variable merge rules.

### Runtime Engines
- **AI Runtime (ai-sdk)**: streamText, fullStream parsing, tool recovery, fallback.
- **OpenCode Adapter**: OpenCode session stream relay into EventBus.

### Tooling & Actions
- **Tooling Engine**: tool registry, approvals, execution, variable updates.
- **Action Executor**: shared action runner used by execute-action step and tool calls.

### MCP Gateway
- **Chiron MCP Server**: static tools `chiron_context`, `chiron_actions`, `chiron_action`.
- **Action Registry**: step-scoped action schema returned via `chiron_actions`.

### AX Integration
- **AX Signature Registry**: signature definition + input/output schemas.
- **AX Engine**: run signature with system context injection + optimizer config.

### Streaming & Events
- **EventBus**: normalized event stream for ai-sdk + OpenCode.
- **Stream Relay**: tRPC subscription + ordering guarantees.

### Data & State
- **Variable Resolver**: precedence merge (step → workflow → parent → child).
- **Artifact Store**: snapshot storage + version history.
- **Chat/Message Store**: ai-sdk step-scoped chat sessions.
- **OpenCode Session Store**: session IDs only; no duplication.

### Providers & Catalogs
- **Model Catalog / Provider Registry**: engine-specific model lists.
- **Config/Auth**: app_config resolution, provider keys, OpenCode auth.

### Automation & Sandbox
- **Sandbox/Git Service**: worktrees, apply changes, cleanup.
- **Workflow Automation**: invoke-workflow fan-out/join, orchestration helpers.

---

## Frontend Modules

### System Scope
- **System Dashboard**: global sessions, provider status, activity.
- **Workflow Builder**: workflow definition editor (library).
- **Workflow Path Builder**: workflow path/routing editor (library).
- **Settings/Metadata**: provider keys, OpenCode auth, MCP servers.
- **Notifications (global)**: alerts + approvals queue.

### Project Scope
- **Project Overview**: workflows, artifacts, executions summary.
- **Workflow Execution**: timeline + active step + context.
- **Step Execution**: step renderer + approvals + stream.
- **Project Orchestration**: kanban/queue (project-scoped).
- **Artifact Workbench**: artifact browsing + edits + versions.
- **Workflow Path (project instance)**: selected path + overrides.

### Cross-Cutting UI
- **Step Renderer Registry**: step_type → component (shared).
- **Shells**: wizard / dialog / artifact workbench (layout wrappers).
- **Context Panels**: variables, artifacts, logs, prompt layers.

---

## Engine ↔ UI Binding
- StepExecution UI consumes EventBus stream (ai-sdk or OpenCode).
- Layouts remain visual-only; state flows through StepExecution module.
- Model selector uses engine-specific model catalogs.
