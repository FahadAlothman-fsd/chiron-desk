---
title: Work Unit Instances
---
Work unit instances are where Taskflow stops being a reusable method and becomes concrete work.

## What the operator can do

In Taskflow, an operator can open the work-unit list and:

- see which work-unit types already have runtime instances
- distinguish singleton work from repeated work
- check the current lifecycle state of each instance
- see whether an instance already has an active transition
- open one instance to inspect its facts, state machine, artifacts, and current transition

This is the main runtime view for questions like, "Which Story is active right now?" or "Has Architecture started yet?"

## What runtime object sits behind the page

At runtime, each work-unit instance is a project-scoped realization of a design-time work-unit definition.

The runtime contract gives each instance:

- a stable project work-unit id
- the linked work-unit type id and key
- a human-facing label
- the current state
- optional active-transition summary
- summary counts for facts, dependencies, and artifact slots
- timestamps for when the instance was created and last updated

The instance overview then fans out into the work unit's state machine, facts, and artifact slots.

## How Taskflow uses work-unit instances

Taskflow can define work-unit types such as `PRD`, `Architecture`, `Epic`, and `Story`.

At runtime, operators do not work with those abstract types directly. They work with instances such as:

- the one `PRD` instance for the project
- the one `Architecture` instance for the project
- one or more `Story` instances created as delivery work fans out

That is why the runtime page shows both the work-unit type and the concrete instance label.

## Observable runtime behavior

Two runtime behaviors matter here.

First, the state badge tells the operator where the instance sits now.

Second, an active transition summary tells the operator whether the work unit is already in motion toward another state, and which workflow is carrying that move.

If artifacts or dependencies matter, the work-unit summaries show that at a glance before the operator drills deeper.

## Back to Design Time

Work unit instances are defined by work-unit contracts and their lifecycle rules.

- [Work Unit Layer overview](/design-time/work-unit-layer/)
- [Facts](/design-time/work-unit-layer/facts)
- [Artifact Slots](/design-time/work-unit-layer/artifact-slots)
- [Workflows](/design-time/work-unit-layer/workflows)
- [Transitions and State Machine](/design-time/work-unit-layer/transitions-and-state-machine)
- Runtime contract authority: `packages/contracts/src/runtime/work-units.ts`

If the operator wants to know why a work unit has a certain state, fact set, or artifact surface, the Work Unit Layer is the contract source.
