---
title: Work Unit Layer
---
The Work Unit Layer defines the durable contract for one kind of work.

If the Methodology Layer gives you the map of the method, the Work Unit Layer gives you the contract for a selected work unit such as `Story`, `PRD`, or `Research`.

## What the Work Unit Layer owns

For one work-unit type, this layer owns:

- facts
- artifact slots
- workflows
- lifecycle states and transitions
- explicit workflow bindings on transitions

This is the layer where a work unit becomes a durable contract boundary.

## One work unit, several connected concerns

The Work Unit Layer is easier to understand when you treat its concerns as distinct pieces that fit together.

### Facts

Facts are durable data contracts owned by the selected work unit.

They define what structured information this kind of work can store.

[Read the facts deep dive](/design-time/work-unit-layer/facts)

### Artifact slots

Artifact slots are durable output contracts.

They define the named places where this work unit can produce artifacts such as a PRD document, a story document, or a fileset of code changes.

[Read the artifact slots deep dive](/design-time/work-unit-layer/artifact-slots)

### Workflows

Workflows define the execution paths available inside the selected work unit.

A workflow can exist in the work-unit catalog before it is bound to any transition.

[Read the workflows deep dive](/design-time/work-unit-layer/workflows)

### Transitions and state machine

States and transitions define lifecycle policy.

Transitions decide which moves are allowed. They also hold the explicit bindings that connect workflows to lifecycle moves.

[Read the transitions and state machine deep dive](/design-time/work-unit-layer/transitions-and-state-machine)

## Workflows and transitions are different concepts

This distinction matters.

- A workflow defines how work runs.
- A transition defines when a work unit can move from one lifecycle state to another.
- A workflow binding explicitly connects a workflow to a transition.

That means Chiron does not collapse everything into one generic automation object.

## Taskflow example

Take a Taskflow `Story` work unit.

Its Work Unit Layer might define:

- facts such as `acceptance_criteria` and `implementation_notes`
- artifact slots such as `story_doc` and `code_changes`
- workflows such as `dev-story` and `verify-story`
- transitions such as `ready -> in_progress` and `review -> done`

Then the transition `ready -> in_progress` can bind `dev-story`, while `review -> done` can bind `verify-story`.

That binding is explicit. The workflow and the transition are still separate design-time objects.

> **Screenshot placeholder**
> Work Unit Layer overview for the Taskflow Story work unit, with summary cards for facts, artifact slots, workflows, states, transitions, and findings.

## How this layer relates to the others

- The [Methodology Layer](/design-time/methodology-layer) stays global.
- The Work Unit Layer defines one work-unit contract.
- The Workflow Layer explains workflow-owned context and authoring.
- The Step Layer explains the nodes inside a workflow.

## Internal architecture references

For contributors working inside the repo, use these local internal references:

- `docs/architecture/methodology-pages/work-units/overview.md`
- `docs/architecture/methodology-pages/work-units/detail-tabs.md`
- `docs/architecture/methodology-pages/artifact-slots-design-time.md`
- `docs/architecture/methodology-pages/state-machine-tab.md`
