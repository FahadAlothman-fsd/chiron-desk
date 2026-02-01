# Chiron Module Structure (Proposed)

This document captures the proposed module structure and dependency graph for Chiron.

## Dependency Graph

```mermaid
flowchart TD
  workflow_engine[workflow-engine]
  tooling_engine[tooling-engine]
  variable_service[variable-service]
  event_bus[event-bus]
  provider_registry[provider-registry]
  agent_runtime[agent-runtime]
  prompt_composer[prompt-composer]
  ax_engine[ax-engine]
  mcp_gateway[mcp-gateway]
  sandbox_git[sandbox-git]
  step_renderer[step-renderer]
  approval_ui[approval-ui]

  workflow_engine --> tooling_engine
  workflow_engine --> variable_service
  workflow_engine --> event_bus
  workflow_engine --> agent_runtime
  workflow_engine --> provider_registry

  tooling_engine --> variable_service
  tooling_engine --> event_bus
  tooling_engine --> provider_registry
  tooling_engine --> ax_engine
  tooling_engine --> mcp_gateway
  tooling_engine --> sandbox_git

  ax_engine --> provider_registry
  ax_engine --> event_bus
  ax_engine --> variable_service

  agent_runtime --> prompt_composer
  agent_runtime --> provider_registry
  agent_runtime --> event_bus

  prompt_composer --> variable_service

  step_renderer --> approval_ui
```

## Modules

### Core Runtime
- workflow-engine: workflow + step execution, state transitions, approvals orchestration.
- ax-engine: AX registry, resolver, execution, optimizer, examples store.
- agent-runtime: agent step execution with agentKind adapters (chiron, opencode, later codex/claude-code).

### Shared Infrastructure
- variable-service: canonical variable resolution, precedence, history, templates.
- prompt-composer: structured prompt spec and adapter rendering per agentKind.
- tooling-engine: tool registry, approvals, execution; bridges ax-generation to ax-engine.
- provider-registry: model catalog + credentials (per-user, global across projects), usage tracking, spend estimates, and provider limits.
- event-bus: unified streaming and lifecycle events.
- mcp-gateway: MCP tool discovery and schema exposure (optional; replaced by OpenCode custom tools by default).
- sandbox-git: worktree ops, apply changes, cleanup.

### UI Layer
- step-renderer: step_type -> UI component registry.
- approval-ui: approval cards, pending queue, tool status.

## Agent Step Type

Single step type: `agent`
- agentKind: `chiron`, `opencode` (future: `codex`, `claude-code`)
- agentKind adapter renders prompt and tool schema specifics

## Notes
- This structure is intended to replace the current monolithic services under packages/api/src/services.
- The workflow-engine remains the orchestrator; ax-engine and agent-runtime are invoked via tooling-engine.
