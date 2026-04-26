---
title: Taskflow
---
Taskflow is the single running example used across the public docs.

It is not a hardcoded product requirement. It is a representative method that makes Chiron easier to explain.

## Why Taskflow is the example

Taskflow gives the docs one stable story that can cover:

- method setup
- project onboarding
- the handoff into the first durable runtime work

That lets the site teach the product mental model without jumping between unrelated examples.

## Taskflow in one pass

At **Design Time**, you define a Taskflow method. You shape the work-unit catalog, decide which facts and artifact slots matter, and bind workflows to transitions.

At **Project Runtime**, a real project picks up that method. Work starts moving, the first onboarding artifacts appear, and the project reaches the `Architecture` work unit as the first concrete downstream handoff.

> **Screenshot placeholder**
> Taskflow storyline, showing the handoff from shared intro to Design Time to Project Runtime, ending at the Architecture work unit.

## The public Taskflow slice

### Setup and onboarding

This slice shows the starting point.

It covers how a method is set up, what the first project needs to provide, and how the first durable artifacts and facts appear.

It ends when the project has enough context to produce or activate the `Architecture` work unit.

- Read: [/taskflow/setup-onboarding](/taskflow/setup-onboarding)

Later delivery, delegation, and review paths exist in the product and internal docs, but they are intentionally outside the main public Taskflow spine.

## How Taskflow maps to the layer model

- **Methodology Layer** decides what kinds of Taskflow work exist.
- **Work Unit Layer** defines the contract for each kind of Taskflow work.
- **Workflow Layer** defines how each Taskflow path runs.
- **Step Layer** defines the nodes inside those workflows.

If you need the full layer explanation, go back to the [mental model](/mental-model).

If you want the page-by-page coverage check for the narrowed public example, read [/reference/taskflow-consistency-check](/reference/taskflow-consistency-check).
