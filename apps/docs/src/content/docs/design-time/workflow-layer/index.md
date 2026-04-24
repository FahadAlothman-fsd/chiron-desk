---
title: Workflow Layer
---
The Workflow Layer defines the runnable graph that lives inside one work-unit definition.

It sits below the Work Unit Layer and above the Step Layer.

## What the Workflow Layer owns

This layer owns the structure of a single workflow definition:

- workflow identity and metadata
- the entry step
- the graph of steps and edges
- workflow-local context facts
- the execution path that a bound transition can run

The workflow stays inside its parent work unit. It is not a methodology-wide object with independent ownership.

## Why this layer exists

The Work Unit Layer says which workflows a work unit can run.

The Workflow Layer says how one of those workflows is shaped.

That separation matters because a work unit can bind several workflows to different transitions, while each workflow still needs its own graph, its own local context, and its own step sequence.

## Workflow graph model

Current contracts model a workflow as a graph with:

- an optional `entryStepId` on workflow metadata
- step nodes with fixed step types
- edges that connect steps by `fromStepKey` and `toStepKey`

In the public mental model, that means a workflow is a directed path through explicit steps. Some workflows are mostly linear. Others branch and rejoin.

The graph is authored in the workflow editor shell, where the left rail adds step types and the main canvas shows nodes and edges.

## Relationship to transitions

A workflow does not replace the work-unit state machine.

Instead, a transition binds one or more workflows, and a workflow execution then runs inside the transition execution envelope at project runtime.

That means:

- the state machine still decides which move is allowed
- the transition still owns start and completion gates
- the workflow provides the runnable path used during that move

## Step taxonomy inside a workflow

Each workflow uses the same fixed step taxonomy:

- `form`
- `agent`
- `action`
- `invoke`
- `display`
- `branch`

Those step types are explained in the [Step Layer overview](/design-time/step-layer/) and in the individual step pages.

## Workflow context facts

Workflow context facts are first-class workflow data, but they are not the same thing as methodology facts or work-unit facts.

They exist so one step can capture or produce data that later steps in the same workflow execution can reuse.

Read the dedicated page for the full model: [Workflow context facts](/design-time/workflow-layer/context-facts).

## Taskflow example

In Taskflow, a story delivery workflow might:

1. use a `form` step to capture implementation scope
2. use an `agent` step to draft a plan
3. use a `display` step to show the proposed plan for review
4. use a `branch` step to choose rework or continue
5. use an `invoke` step to fan out into child work when needed

The work unit still owns the story states and allowed transitions. The workflow owns the runnable graph inside one of those transitions.

That same graph model carries all three Taskflow slices. Setup uses it to capture onboarding context, fan-out uses it to branch and invoke child work, and review uses it to route completion or rework while keeping artifact production visible.

> **Screenshot placeholder**
> Workflow editor view for a Taskflow workflow, showing graph nodes for form, agent, display, branch, invoke, and action.

## Current behavior and implementation status

Current contracts clearly support workflow ownership under a work unit, graph editing concepts, workflow edges, entry-step metadata, and execution-scoped workflow context facts.

The deeper Step Layer is still uneven in implementation maturity.

- `form`, `invoke`, and `branch` have concrete contract depth today
- `agent` and `display` are still deferred in the runtime detail contract
- `action` has concrete authoring and runtime detail contracts, but broader AX and runtime convergence is still not fully finished

Public docs should treat the Workflow Layer as real and stable in concept, while avoiding any claim that every step family already has full end-to-end execution depth.

## Advanced internal references

- `docs/architecture/methodology-pages/workflow-editor/shell.md`
- `docs/architecture/chiron-module-structure.md`
- `packages/contracts/src/methodology/workflow.ts`
