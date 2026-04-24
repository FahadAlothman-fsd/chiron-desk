---
title: Taskflow Fan-Out And Delegation
---
This scenario slice shows how Taskflow expands one piece of work into several focused paths.

The point is not just that work can be delegated. The point is that delegation stays structured.

## The starting point

Imagine a parent Taskflow work unit reaches a point where one person or one agent should no longer handle everything in one place.

That parent work unit may now need to:

- split scope
- assign more focused work
- collect outputs from several child paths
- keep the relationship between parent and child work visible

## What the layers are doing

### Methodology Layer

The Methodology Layer defines that these related work types exist and that parent-child relationships are part of the method.

### Work Unit Layer

At the Work Unit Layer, the parent and child work units each have their own facts, artifact slots, states, and workflows.

That matters because delegated work is still durable work. It is not just a note in a chat thread.

### Workflow Layer

The Workflow Layer handles the actual fan-out path.

In Taskflow, a workflow can reach a point where it creates or activates child work, routes context into that work, and expects certain artifacts back.

### Step Layer

At the Step Layer, this is where invoke and branch behavior become easy to picture.

The workflow may branch based on scope or readiness, then invoke more focused work.

Some of the deepest workflow-step runtime depth is still not fully implemented, so public docs describe this slice conceptually and call maturity limits out when they matter.

> **Screenshot placeholder**
> Taskflow delegation view, showing one parent work unit branching into child work units, invoked workflow rows, and returned artifact summaries.

## A Taskflow example

Suppose a parent delivery work unit has gathered enough scope to split into three focused tracks.

Taskflow can model that as:

1. a parent work unit reaching the right transition
2. a workflow deciding that fan-out should happen
3. child work units being created or activated
4. each child path producing its own artifacts
5. the parent path waiting for enough evidence to continue

This keeps delegation tied to explicit structure.

## Where branching fits

Branching is part of the story, not a special case.

Taskflow might route work differently depending on:

- project size
- risk level
- missing prerequisites
- whether one child path needs review before others can continue

That branching logic belongs to the workflow, which means you can inspect it and reason about it.

## Which artifacts matter here

This slice is where artifact production becomes especially visible.

Each delegated path may produce different outputs, such as:

- scoped plans
- implementation drafts
- evidence bundles
- status summaries for the parent work unit

The parent work does not need to infer what happened from chat history. It can look at the artifact slots and workflow state, then hand those outputs into the review and rework slice.

## Why this slice matters

Taskflow uses fan-out to show that Chiron is not just a single-path workflow tool.

It can model delegation while keeping state, outputs, and review boundaries readable.

## Continue the example

- Next: [/taskflow/review-rework](/taskflow/review-rework)
- Back to overview: [/taskflow/](/taskflow/)
