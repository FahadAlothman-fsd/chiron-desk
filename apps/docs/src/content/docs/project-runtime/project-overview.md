---
title: Project Overview
---
Project overview is the operator's first runtime dashboard.

## What the operator can do

In Taskflow, an operator can use the project overview to:

- see active work at a glance
- spot blocked or ready items
- review project-wide facts and summary counts
- jump into the work unit, transition, or workflow that needs attention next

This is the page for the question, "What is happening in this project right now?"

## What runtime object sits behind the page

The overview is a project-scoped summary built from runtime contracts.

It brings together:

- project metadata
- summary cards for facts and work
- readiness or eligibility signals
- active transition and workflow pointers
- operator-visible blockers

The overview does not replace the deeper runtime pages. It routes the operator into them.

## How Taskflow uses the overview

In Taskflow, the overview is where an operator can notice that:

- project facts still need setup data
- a Story work unit is active
- one transition is in progress
- a workflow execution needs review or completion

That lets the operator move from summary to detail without losing the system picture.

## Back to Design Time

Project overview is a runtime summary of design-time structure.

- [Design Time overview](/design-time/)
- [Methodology Layer](/design-time/methodology-layer)
- [Work Unit Layer](/design-time/work-unit-layer/)
- [Workflow Layer](/design-time/workflow-layer/)
- Runtime overview authority: `packages/contracts/src/runtime/overview.ts`

Use Design Time to understand why the project can show these summaries at all. Use Project Overview to see what this project is doing now.
