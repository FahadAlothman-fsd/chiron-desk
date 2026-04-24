---
title: Transition Executions
---
Transition executions are the runtime envelope around a state change.

## What the operator can do

In Taskflow, an operator can inspect a transition execution to:

- see which state change is in progress
- understand whether the transition has started, completed, or been blocked
- review which workflows are bound to the transition
- check readiness or completion gates before moving work forward
- understand whether the current attempt is still active or has been superseded

This is the page for the question, "What state change is this work unit trying to make right now?"

## What runtime object sits behind the page

The transition execution owns the runtime move from one state to another.

It typically carries:

- work-unit identity and current transition status
- from-state and to-state context
- start and completion timing
- readiness and completion gating signals
- the workflows running inside that state change

That makes the transition execution broader than any one workflow execution.

## How Taskflow uses transition executions

In Taskflow, a Story might move from implementation into review.

The transition execution is the envelope that says:

- which state change is happening
- which workflow is carrying that move
- whether review gates are satisfied
- whether the work can actually complete the move

## How this differs from workflow executions

- [Workflow Executions](/project-runtime/workflow-executions) show one runtime path inside the change.
- Transition executions show the whole state-change container that owns those workflows and their gates.

## Back to Design Time

Transition executions come from work-unit lifecycle rules and workflow bindings.

- [Work Unit Layer overview](/design-time/work-unit-layer/)
- [Workflows](/design-time/work-unit-layer/workflows)
- [Transitions and State Machine](/design-time/work-unit-layer/transitions-and-state-machine)
- [Workflow Layer overview](/design-time/workflow-layer/)
- Runtime contract authority: `packages/contracts/src/runtime/executions.ts`
- Runtime work-unit authority: `packages/contracts/src/runtime/work-units.ts`

Go back to Design Time when you need to know why this transition exists or why these workflows are bound to it.
