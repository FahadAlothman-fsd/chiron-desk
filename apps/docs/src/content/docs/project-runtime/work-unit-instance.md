---
title: Work Unit Instance
---
The single work-unit instance view is where an operator inspects one concrete unit of work in detail.

## What the operator can do

In Taskflow, an operator can open one work-unit instance and:

- confirm its current state
- review its facts and visible artifact slots
- inspect the active transition, if one exists
- understand which workflow is driving the current change
- judge whether the unit is blocked, ready, or complete

## What runtime object sits behind the page

This view is one project work-unit record plus its attached runtime detail.

That detail can include:

- identity and label
- linked work-unit type
- current state
- visible fact summaries
- artifact-slot summaries and snapshots
- active transition summary
- timestamps and operator actions

It is the runtime realization of one design-time work-unit definition.

## How Taskflow uses the detail view

A Taskflow operator might open a Story instance to answer questions like:

- does this Story still need implementation notes?
- has it produced the expected artifact outputs?
- which transition is active right now?
- is the workflow already waiting on review or rework?

## How this differs from the list page

- [Work Unit Instances](/project-runtime/work-unit-instances) shows the project-wide set.
- This page is the drill-down for one instance.

## Back to Design Time

One work-unit instance is defined by the same design-time work-unit contract as the list view.

- [Work Unit Layer overview](/design-time/work-unit-layer/)
- [Facts](/design-time/work-unit-layer/facts)
- [Artifact Slots](/design-time/work-unit-layer/artifact-slots)
- [Transitions and State Machine](/design-time/work-unit-layer/transitions-and-state-machine)
- Runtime contract authority: `packages/contracts/src/runtime/work-units.ts`

Use the Work Unit Layer to understand why this instance has these facts, slots, and state rules.
