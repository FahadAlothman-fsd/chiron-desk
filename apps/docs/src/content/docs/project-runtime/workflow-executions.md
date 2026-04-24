---
title: Workflow Executions
---
Workflow executions show the live path a work unit is taking through a transition.

## What the operator can do

In Taskflow, an operator can open a workflow execution and:

- see whether the workflow is primary or supporting
- confirm which work unit and transition it belongs to
- review when the run started, completed, or was superseded
- retry the same workflow when the runtime allows it
- complete the workflow when the runtime says it is ready
- inspect the active step surface, step graph, and workflow context facts

This is the page for answering, "What is this transition actually doing right now?"

## What runtime object sits behind the page

A workflow execution is the runtime record of one workflow attached to one transition execution.

The current contract exposes:

- workflow identity, role, and status
- parent transition identity and status
- work-unit identity and backlink
- lineage across superseded attempts
- retry and completion actions when available
- a step surface that shows entry pending, active step, next pending, terminal, or invalid definition
- a step graph runtime with executed nodes and saved branch selections
- grouped workflow context fact instances

So the operator is not just looking at a label like `dev-story`. They are looking at a dated execution record with context, state, and allowed next actions.

## How Taskflow uses workflow executions

In Taskflow, a Story transition might launch `dev-story` as the primary workflow.

The operator can then watch that execution:

- move from started to completed
- expose workflow context facts gathered by earlier steps
- show whether a branch has a saved route
- reveal if a retry would supersede the current attempt

If another attempt replaces the current one, the lineage section keeps that visible instead of hiding the earlier run.

## Observable review and branch behavior

Runtime review behavior shows up here through statuses, retries, completion eligibility, and superseded attempts.

Branch behavior shows up here through the step graph runtime. Operators can see saved branch selections and then drill into the relevant step execution for route details.

Workflow pages do not define those rules. They expose the current run of rules that were authored elsewhere.

## Back to Design Time

Workflow executions are runtime instances of workflow definitions bound to work-unit transitions.

- [Work Unit Layer, Workflows](/design-time/work-unit-layer/workflows)
- [Transitions and State Machine](/design-time/work-unit-layer/transitions-and-state-machine)
- [Workflow Layer overview](/design-time/workflow-layer/)
- [Workflow Context Facts](/design-time/workflow-layer/context-facts)
- Runtime contract authority: `packages/contracts/src/runtime/executions.ts`

Go back to the Workflow Layer if you need to understand why a workflow has certain context facts. Go back to the Work Unit Layer if you need to know why that workflow was bound to this transition in the first place.
