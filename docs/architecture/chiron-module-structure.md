# Chiron Module Structure (Canonical)

This document freezes the module boundaries and ownership for Chiron. It is the source of truth for module names, responsibilities, and step-type mapping.

## Step Taxonomy

Workflow steps use this fixed set of types:

- `form`
- `agent`
- `action`
- `invoke`
- `display`
- `branch`

`agent` steps route through `agentKind`:

- `chiron` (Chiron agent runtime)
- `opencode` (OpenCode SDK)

## Core Modules (Effect-First)

Each module is Effect-wrapped and owns its public contract.

### workflow-engine
- Orchestrates workflow + step execution lifecycle
- Drives step transitions and approvals
- Owns execution state + step history

### agent-runtime
- Executes `agent` steps
- Routes `agentKind` adapters
- Emits normalized stream events

### tooling-engine
- Tool registry + schema validation
- Approval gating and variable updates
- Bridges `action` steps to execution

### ax-engine
- Signature registry + resolver
- Optimizer + examples store

### event-bus
- Unified stream for UI + tRPC
- Normalizes AI SDK and OpenCode events

### variable-service
- Canonical variable resolution + precedence
- Variable history and merges

### prompt-composer
- Living system prompt composition
- Renders agentKind-specific prompt layers

### provider-registry
- Model catalog + provider credentials

### sandbox-git
- Worktree per workflow execution
- Repo init for new projects
- Commit snapshots per step

## UI Modules

### step-renderer
- Maps stepType to component

### approval-ui
- Approval queue + cards

### artifact-workbench
- Artifact list + versions

### project-overview
- Project and execution summary

### execution-timeline
- Step history + active step view

## Step Type Ownership

| Step Type | Primary Modules |
| --- | --- |
| form | workflow-engine, variable-service |
| agent | agent-runtime, prompt-composer, tooling-engine, event-bus |
| action | tooling-engine, sandbox-git, variable-service |
| invoke | workflow-engine, event-bus, variable-service |
| display | workflow-engine, step-renderer |
| branch | workflow-engine, variable-service |

## OpenCode Integration

OpenCode uses custom tools (no MCP by default):

- `chiron_context`
- `chiron_actions`
- `chiron_action`

Tools are scoped to the session and step via OpenCode context (session/message IDs). MCP is only reintroduced if dynamic tool schemas are required.
