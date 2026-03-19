# Chiron Module Structure (Canonical)

> **Last Updated:** 2026-03-19

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

## Methodology Ownership Model (Design-Time Canonical)

Design-time ownership is locked as:

- `Methodology Version` owns release/publish lineage and published projection boundaries.
- `Work Unit` owns local authoring aggregates: facts, state machine, workflows, and transition-workflow bindings.
- `Workflow` owns steps and edges within its parent work unit scope.

Compatibility read models may expose flattened version-level workflow indexes for legacy callers, but those are projections only and are not write-authoritative sources.

### Layered boundary implementation status (2026-03-19)

- L1 service boundary is implemented in `@chiron/methodology-engine` via `MethodologyVersionBoundaryService` and companion L1 services.
- Legacy lifecycle compatibility seam (`lifecycle-service.ts`) is removed from the active design-time path.
- API methodology and project routers now resolve methodology mutations through L1 boundary services instead of legacy/lifecycle direct injections.
- Version and catalog destructive actions remain archive-first (soft-delete semantics), not hard-delete.

## Runtime Boundary Lock

Runtime modules (`workflow-engine`, `agent-runtime`, `tooling-engine`, `variable-service`, `template-engine`) consume:

- `@chiron/contracts` runtime-facing schemas, and
- published methodology projections/resolver contracts.

Runtime modules must not import design-time persistence seams (methodology repositories, draft mutation services, or DB table adapters) from `@chiron/methodology-engine`.

## Stability Disclaimer (Execution vs Contracts)

Execution-side module internals are intentionally provisional and may change significantly as L1/L2/L3 implementation advances.

Stability anchors are:

- design-time contract shapes in `@chiron/contracts`, and
- runtime-facing published contracts/projections consumed by execution modules.

## Thin-Core Boundary Lock (CCF.5 / Gate G2.5)

Decision record (`core-boundary-decision-log`) for Epic 3 prerequisite locking.

### Core scope statement (locked)

`core` is restricted to thin orchestration/use-case coordination only and is concretely represented by `packages/core` (`@chiron/core`). Domain behavior remains in domain packages and shared contracts remain in `packages/contracts`.

### Allowed responsibilities in `core`

- orchestration flow and use-case coordination
- app-level policy composition
- ports/interfaces for external concerns
- deterministic orchestration outputs consumed by adapters

### Forbidden responsibilities in `core`

- DB/filesystem/process adapters and persistence implementations
- Electron host/runtime ownership (`main`, `preload`, IPC surface)
- Hono/oRPC handlers and protocol transport wiring
- React/TanStack UI rendering, component logic, and UI event handling

### Traceability links

- FR: `FR2`, `FR5`, `FR7`
- NFR: `NFR1`, `NFR2`, `NFR5`
- ADR: `ADR-EF-B01`, `ADR-EF-02`, `ADR-EF-03`
- Gate: `G2.5`
- Evidence: `core-boundary-decision-log`, `package-responsibility-map`, `epic3-prerequisite-architecture-log`
- Diagnostics: `boundary-violation-diagnostics`, `package-ownership-diagnostics`

### Dev Story Boundary Checklist

- Verify no transport/runtime/UI leakage into `core`.
- Verify no adapter/infrastructure implementation inside `core`.
- Verify `core` only composes/consumes ports/interfaces for external concerns.
- Verify Epic 3-related edits preserve CCF.5 evidence references.

### Code Review Boundary Checklist

- Reject any PR adding Hono/oRPC, Electron host, or React/TanStack ownership to `core`.
- Reject any PR placing persistence/process/filesystem implementation in `core`.
- Confirm dependency direction stays contracts-centered and adapter -> core -> domain/contracts.
- Confirm CCF.6 sequencing remains intact: CCF.5 lock precedes planning re-baseline.

## OpenCode Integration

OpenCode uses custom tools (no MCP by default):

- `chiron_context`
- `chiron_actions`
- `chiron_action`

Tools are scoped to the session and step via OpenCode context (session/message IDs). MCP is only reintroduced if dynamic tool schemas are required.
