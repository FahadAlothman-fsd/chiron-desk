---
title: Artifact Slots
---
Runtime artifact slots are the operator-visible output surfaces attached to live work.

## What the operator can do

In Taskflow, an operator can use artifact-slot views to:

- see which expected outputs already exist
- distinguish missing outputs from filled slots
- inspect the latest snapshot or reference for a slot
- understand which work unit produced the output
- decide whether a transition has enough evidence to continue

## What runtime object sits behind the page

At runtime, an artifact slot is the live counterpart to a design-time output contract.

The runtime view can expose:

- slot identity, key, and label
- the owning work-unit instance
- whether any artifact snapshot is present
- the latest visible snapshot or reference
- timestamps and status summaries

This keeps outputs inspectable instead of burying them in untyped side effects.

## How Taskflow uses runtime artifact slots

Taskflow might expect outputs such as a PRD draft, architecture notes, review evidence, or implementation artifacts.

The runtime artifact-slot surface helps the operator answer:

- has the expected output been produced?
- is the latest snapshot the one reviewers should inspect?
- are downstream steps blocked because the slot is still empty?

## How this differs from design-time artifact slots

- Design Time defines what output is expected.
- Project Runtime shows whether this project has actually produced it.

## Back to Design Time

Artifact-slot runtime surfaces come from work-unit output contracts.

- [Work Unit Layer overview](/design-time/work-unit-layer/)
- [Artifact Slots](/design-time/work-unit-layer/artifact-slots)
- Runtime artifact authority: `packages/contracts/src/runtime/artifacts.ts`
- Runtime work-unit authority: `packages/contracts/src/runtime/work-units.ts`

Use the Work Unit Layer to understand why a slot exists. Use Project Runtime to inspect whether the output is really there.
