---
title: Work Unit Layer, Transitions and State Machine
---
The state machine defines lifecycle states and the allowed transitions between them.

Transitions are policy objects. They are not the same thing as workflows.

## What the state machine owns

For a selected work unit, the state machine owns:

- lifecycle states
- lifecycle transitions
- transition condition sets
- workflow bindings on transitions

This is where lifecycle policy becomes explicit.

## States and transitions

A state is a named lifecycle state such as:

- `draft`
- `ready`
- `in_progress`
- `review`
- `done`

A transition is an allowed move between states, such as `ready -> in_progress`.

Transitions can also carry condition sets for start and completion checks.

## Workflows and transitions stay separate

This is the key rule.

- A workflow explains how work runs.
- A transition explains when a lifecycle move is allowed.
- A workflow binding explicitly attaches a workflow to a transition.

Chiron keeps these concepts separate so lifecycle policy does not get buried inside a generic automation editor.

## Explicit workflow bindings

Bindings are explicit references from a transition to one or more workflows.

That lets a methodology say things like:

- when `Story` moves from `ready` to `in_progress`, `dev-story` is allowed
- when `Story` moves from `review` to `done`, `verify-story` is allowed

The workflow is still defined elsewhere in the work-unit catalog. The transition only binds it.

## Gates and condition sets

Transitions can include condition sets with phases such as:

- `start`
- `completion`

These condition sets are the authority for blocking or allowing a lifecycle move.

That is why dependency definitions and artifact slots stay separate from enforcement. The transition's condition sets decide whether a required dependency, fact, or artifact condition blocks the move.

## Taskflow example

Imagine a Taskflow `Story` work unit with these states:

- `ready`
- `in_progress`
- `review`
- `done`

One transition could be `ready -> in_progress`.

That transition can bind `dev-story` and require a start gate that checks whether upstream context is present.

Another transition could be `review -> done`.

That transition can bind `verify-story` and require a completion gate that checks whether the `code_changes` slot has the expected evidence.

> **Screenshot placeholder**
> State Machine tab for the Taskflow Story work unit, showing transition rows, gate mode, bound workflows, dependency checks, and findings.

## Why this separation helps

Keeping transitions and workflows separate makes the method easier to inspect.

You can answer two different questions clearly:

- What can this work unit do?
- When is each action allowed to drive a lifecycle move?

That makes review, debugging, and future runtime interpretation much clearer.

## Internal architecture references

- `docs/architecture/methodology-pages/state-machine-tab.md`
- `docs/architecture/methodology-pages/work-units/detail-tabs.md`
- `docs/architecture/methodology-pages/dependency-definitions.md`
- `packages/contracts/src/methodology/lifecycle.ts`
