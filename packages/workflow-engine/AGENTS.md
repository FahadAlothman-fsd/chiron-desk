# @chiron/workflow-engine

**The heart of Chiron.** Executes workflow definitions step-by-step using Effect services. Each workflow execution runs as its own Effect Fiber under a supervisor; within an execution, steps run sequentially via a while-loop.

## File Layout

```
src/
├── index.ts                        # Barrel — re-exports everything
├── schema/                         # Effect Schema definitions for step configs
│   ├── index.ts                    # Re-exports all schemas
│   ├── workflow.ts                 # WorkflowDefinition, WorkflowStep schemas
│   ├── form.ts                     # FormStepConfig schema
│   ├── agent.ts                    # AgentStepConfig schema (agentKind: chiron | opencode)
│   ├── action.ts                   # ActionStepConfig schema
│   ├── invoke.ts                   # InvokeStepConfig schema (sub-workflow reference)
│   ├── display.ts                  # DisplayStepConfig schema
│   └── branch.ts                   # BranchStepConfig schema (conditions, routing)
├── handlers/                       # Step type handlers — one per step type
│   ├── index.ts                    # Registry: stepType → handler lookup map
│   ├── form-handler.ts             # Collects user input, returns Deferred (pauses execution)
│   ├── agent-handler.ts            # Runs AI agent via @chiron/agent-runtime adapter
│   ├── action-handler.ts           # Executes side effects via ActionService
│   ├── invoke-handler.ts           # Forks child workflow execution as child Fiber
│   ├── display-handler.ts          # Renders output to user
│   └── branch-handler.ts           # Evaluates conditions, returns next step ID
└── services/                       # Effect services (Tag + interface + Layer)
    ├── workflow-engine.ts          # Core: execute(), continue(), submitApproval(), submitStep()
    ├── step-handler.ts             # StepHandler Tag — interface for all handlers
    ├── step-registry.ts            # StepRegistry Tag — maps step types to handlers
    ├── default-step-registry.ts    # Default registry with all 6 handlers registered
    ├── execution-context.ts        # ExecutionContext Tag — executionId, variables, current step
    ├── event-bus.ts                # WorkflowEventBus — PubSub.sliding(256) + Stream.fromPubSub
    ├── variable-service.ts         # Variable resolution and state within an execution
    ├── action-service.ts           # ActionService Tag — delegates to tooling-engine
    ├── approval-gateway.ts         # ApprovalGateway — Deferred + Ref<HashMap> for approval rendezvous
    ├── workflow-invoker.ts         # WorkflowInvoker — loads and runs sub-workflows (invoke step)
    ├── decode.ts                   # Decode boundary — Schema.decode at package edge
    └── live.ts                     # Live Layer composition — wires all services together
```

## Execution Model

```
WorkflowEngine.execute(definition, inputs)
  → decode inputs at boundary (Schema.decode)
  → initialize ExecutionContext (variables, step index)
  → while (currentIndex !== null):
      → get handler from StepRegistry
      → EventBus.publish(StepStarted)
      → handler.run(step, context)
      → merge output variables
      → EventBus.publish(StepCompleted)
      → if requiresUserInput → pause (Deferred)
      → if nextStepId → branch
      → else → increment index
```

## Key Patterns

- **Handler registry** — `handlers/index.ts` maps step types to handlers via a lookup object. Never use switch statements.
- **Effect Services** — Every service is a `Context.Tag` with an interface, implemented via `Layer.succeed` or `Layer.scoped`.
- **Decode boundary** — `decode.ts` validates all external inputs at the package edge. Internal code works with trusted types.
- **Event-driven** — All lifecycle events flow through `WorkflowEventBus` (PubSub → Stream → SSE → frontend).
- **Approval rendezvous** — `approval-gateway.ts` uses `Deferred` + `Ref<HashMap<id, Deferred>>`. request() creates and awaits Deferred; resolve() succeeds it from the approval UI.

## Tests

Co-located `*.test.ts` files in `handlers/` and `services/`. Run with `bun test`.

## Dependencies

- `@chiron/contracts` — shared types (AgentKind, AgentRunParams, etc.)
- `effect` — services, streams, fibers, schemas
