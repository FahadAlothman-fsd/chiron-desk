---
title: Taskflow
---
Taskflow is the single running example used across the public docs.

It is not a hardcoded product requirement. It is a representative method that makes Chiron easier to explain.

## Why Taskflow is the example

Taskflow gives the docs one stable story that can cover:

- method setup
- project onboarding
- fan-out and delegation
- branching decisions
- artifact production
- review and rework

That lets the site teach the product mental model without jumping between unrelated examples.

## Taskflow in one pass

At **Design Time**, you define a Taskflow method. You shape the work-unit catalog, decide which facts and artifact slots matter, and bind workflows to transitions.

At **Project Runtime**, a real project picks up that method. Work starts moving, artifacts appear, delegated work fans out into more focused work units, and review loops decide whether work advances or returns for rework.

> **Screenshot placeholder**
> End-to-end Taskflow storyline, showing the handoff from shared intro to Design Time to Project Runtime, with the three scenario slices called out in sequence.

## The three scenario slices

### Setup and onboarding

This slice shows the starting point.

It covers how a method is set up, what the first project needs to provide, and how the first durable artifacts and facts appear.

It also introduces the first branch, such as a greenfield path versus an existing-project path, so branching does not appear out of nowhere later.

- Read: [/taskflow/setup-onboarding](/taskflow/setup-onboarding)

### Fan-out and delegation

This slice shows how Taskflow handles expansion.

It covers how a parent work unit can branch into delegated work while keeping ownership, structure, and expected outputs clear.

This is where artifact production becomes multi-path, because each delegated child can return its own durable outputs for the parent to review.

- Read: [/taskflow/fan-out-delegation](/taskflow/fan-out-delegation)

### Review and rework

This slice shows the control loop.

It covers how evidence is reviewed, how approval or rejection affects progress, and how rework stays visible instead of turning into a side conversation.

The same branch and artifact story continues here. Review routes work toward completion or rework, and revised artifacts stay attached to the same work instead of disappearing into chat.

- Read: [/taskflow/review-rework](/taskflow/review-rework)

## How Taskflow maps to the layer model

- **Methodology Layer** decides what kinds of Taskflow work exist.
- **Work Unit Layer** defines the contract for each kind of Taskflow work.
- **Workflow Layer** defines how each Taskflow path runs.
- **Step Layer** defines the nodes inside those workflows.

If you need the full layer explanation, go back to the [mental model](/mental-model).

If you want the page-by-page coverage check for Taskflow consistency, read [/reference/taskflow-consistency-check](/reference/taskflow-consistency-check).
