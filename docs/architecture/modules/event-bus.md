# Event Bus Module Design

**Package:** `@chiron/event-bus`  
**Status:** Planned (scaffold-only package, inline implementation exists)

## Purpose

Provide a shared Effect-native event transport for cross-module communication and live UI updates.

## Current Reality

- Standalone package is scaffold-only.
- Active inline implementation exists in `@chiron/workflow-engine` using `PubSub.sliding(256)` + `Stream.fromPubSub`.

## MVP Responsibilities

- Define canonical event envelope contracts for module events.
- Expose `publish(event)` and `stream()` service API.
- Support filtering by `eventType`, `workflowId`, `executionId`, and `userId`.
- Keep low-latency stream fan-out behavior for API subscriptions and SSE delivery.
- Preserve visibility for background execution state changes and approval/policy outcomes.

## Phase 2 Responsibilities

- Integration hooks for observability/event-log ingestion and audit views (separate module).
- Multi-subscriber fan-out with backpressure-aware patterns.

## Phase 1 Event Surface

### Core Lifecycle

- `WorkflowStarted`
- `StepStarted`
- `StepCompleted`
- `WorkflowCompleted`
- `WorkflowError`

### Agent Stream And Approvals

- `TextChunk`
- `ApprovalRequested`
- `ApprovalResolved`

### Extended Contract Events (Expansion Path)

- `ToolCallStarted`
- `ToolCallCompleted`
- `ToolInputStarted`
- `ToolInputDelta`
- `VariableChanged`
- `VariablesPropagated`

## Module Relationships

### Depends On

- `@chiron/contracts` for event schemas
- `effect` primitives (`PubSub`, `Stream`, `Layer`)

### Used By

- `@chiron/workflow-engine` (primary publisher)
- `@chiron/api` (stream subscriptions and SSE bridging)
- `apps/web` (live execution UI consumption)
- `@chiron/tooling-engine` and `@chiron/variable-service` (event publishers as these modules mature)
- Future `observability` module (event ingestion and persistence)

## Effect Service Shape (Target)

- `publish(event) -> Effect<void, EventBusError>`
- `stream(filters?) -> Stream<WorkflowEvent | SystemEvent>`

## Decision Lock (2026-02-11)

- Event Bus remains an in-memory, ephemeral transport in phase 1.
- Baseline buffering is a single global `PubSub.sliding(256)`.
- Streaming transport remains subscription/SSE-first; control actions (`pause`, `resume`, `interrupt`, approval decisions) are explicit command mutations.
- Background workflow/agent execution is allowed, but hidden autonomous control changes are not.
- Event Bus does not perform business-policy decisions; it carries decisions and outcomes from owner modules.
- Replay/history/query responsibilities are owned by a separate observability/event-log module, not Event Bus.
- Fallback/provider switching policy remains explicit-user-choice per provider-registry lock; Event Bus only transports the related events.

## Observability Surface (Locked)

### Key Events

- `eventbus.publish`
- `eventbus.subscribe`
- `eventbus.buffer.sliding`
- `eventbus.drop`

### Critical Metrics

- `module_requests_total` (publish/subscribe requests)
- `module_failures_total` (publish/stream failures)
- `module_operation_duration_ms` (publish/stream operation latency)
- `eventbus_subscriber_count`
- `eventbus_buffer_utilization_ratio`
- `eventbus_dropped_total`

### Required Span Names

- `module.event-bus.publish`
- `module.event-bus.stream`
- `module.event-bus.subscribe`

### Sensitive Data Rules

- Do not log event payload bodies.
- Log only envelope metadata and correlation identifiers.
- Transport diagnostics must not include rendered prompt text or variable values.

## Open Decisions

- None for phase 1.
