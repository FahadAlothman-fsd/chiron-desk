# Chiron Module Structure (Canonical)

> **Last Updated:** 2026-02-08

This document freezes the module boundaries, ownership, and execution model for Chiron. It is the source of truth for module names, responsibilities, step-type mapping, and concurrency architecture.

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

## Execution & Concurrency Model

Chiron uses Effect-TS structured concurrency for real-time multi-workflow execution.

### Concurrent Workflow Executions

Multiple workflows run as sibling Fibers under a root supervisor. A user can brainstorm a PRD, implement a story, and run a code review simultaneously.

```
Supervisor (root Scope, Ref<HashMap<executionId, Fiber>>)
  ├── Fiber: Execution A — "Create PRD"       (sequential steps)
  ├── Fiber: Execution B — "Dev Story 2.3"    (sequential steps)
  └── Fiber: Execution C — "Code Review"      (sequential steps)
```

### Sequential Steps, Concurrent Internals

Within each execution, steps run **sequentially** (while-loop). But within a single step, child Fibers handle concurrent operations:

| Step Type | Child Fibers? | What For |
| --- | --- | --- |
| form | No | Deferred awaiting user input |
| agent | Yes | AI stream consumption + tool calls |
| action | Yes | Tooling-engine execution + approval waiting |
| invoke | Yes | Sub-workflow as child Fiber (Fibers within Fibers) |
| display | No | Renders output |
| branch | No | Evaluates condition |

### Effect Primitives

| Primitive | Use Case |
| --- | --- |
| `Fiber.fork` | Spawn workflow executions, agent streams, tool calls |
| `Scope` | Lifecycle — cancel workflow interrupts all child fibers |
| `Stream` | Agent responses, event feeds, SSE to frontend |
| `PubSub` | Event bus backbone (sliding window, 256 buffer) |
| `Deferred` | Approval rendezvous, user input awaiting |
| `Queue` | Rate limiting concurrent executions |
| `FiberRef` | Propagate execution context (executionId, userId) |
| `Ref` | Active executions map: HashMap<executionId, Fiber> |
| `Schema` | Decode boundaries at package edges |
| `TaggedError` | Typed error channels across all packages |

## Core Modules (Effect-First)

Each module is Effect-wrapped and owns its public contract.

### contracts
- Shared Effect Schema types and events to prevent circular deps
- Step types, event schemas, agentKind enums
- **Direction: Migrating to Effect-native** (Schema.Struct definitions, not plain TS types)

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
- Unified stream for UI + oRPC
- Normalizes AI SDK and OpenCode events

### variable-service
- Canonical variable resolution + precedence
- Variable history and merges

### template-engine
- Living system prompt composition
- Renders agentKind-specific prompt layers

### provider-registry
- Model catalog + provider credentials

### sandbox-engine
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
| agent | agent-runtime, template-engine, tooling-engine, event-bus |
| action | tooling-engine, sandbox-engine, variable-service |
| invoke | workflow-engine, event-bus, variable-service |
| display | workflow-engine, step-renderer |
| branch | workflow-engine, variable-service |

## Dependency Rule

All modules may depend on `@chiron/contracts`. No module may import another module only for shared types.

## OpenCode Integration

OpenCode uses custom tools (no MCP by default):

- `chiron_context`
- `chiron_actions`
- `chiron_action`

Tools are scoped to the session and step via OpenCode context (session/message IDs). MCP is only reintroduced if dynamic tool schemas are required.
