# Effectful Workflow Engine Design

This document defines how workflow-engine modules are implemented with Effect.

## Core principles

1. Tag = contract
   - Each module exposes a Tag for its public interface.
   - Example: VariableService, StepHandlerRegistry, WorkflowEventBus.

2. Layer = wiring
   - Implementations are provided as Layers.
   - Layers own dependencies; services do not.

3. Context = dependency graph
   - Step handlers and the executor run as Effects that require Tags.

4. Errors are explicit
   - Expected failures are modeled in the Error channel.
   - Defects are unexpected and remain outside the Error type.

5. Resource safety
   - Use acquireRelease/ensuring for resources (db, file, streams).

## Service boundaries

Workflow engine modules should depend only on Tags, not on other module internals.

- workflow-engine: step execution, state transitions, step handlers
- variable-service: variable merge, template resolution
- event-bus: workflow lifecycle events
- tooling-engine: tool execution + approvals
- agent-runtime: streaming + agent execution

## Step handler contract (Effect)

Step handlers are pure Effects requiring services via Tags.

Inputs:
- ExecutionContext
- VariableService
- WorkflowEventBus
- StepHandlerRegistry
- Optional: ToolingEngine, AgentRuntime, ApprovalService

Outputs:
- StepResult (status, outputs, next step)
- Events emitted to EventBus

## Tag/Layer layout (example)

- Tag: VariableService
- Layer: VariableServiceLive
- Tag: WorkflowEventBus
- Layer: WorkflowEventBusLive
- Tag: StepHandlerRegistry
- Layer: StepHandlerRegistryLive

## Streams for events

Use Effect Stream/Sink for event flow:
- Stream for event production
- Sink for persistence or batching

## Dependency rule

No direct imports between modules. Modules consume only Tags.
