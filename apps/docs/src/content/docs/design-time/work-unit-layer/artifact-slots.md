---
title: Work Unit Layer, Artifact Slots
---
Artifact slots are durable output contracts for a work unit.

They are not just a list of outputs. They define named places where durable artifacts can live.

## What an artifact slot owns

An artifact slot contract can include:

- identity
- key and display name
- description and guidance
- cardinality
- rules
- slot-owned templates

Current slot cardinality is:

- `single`
- `fileset`

That lets a work unit model one durable document or a tracked collection of files.

## Why slots are more than outputs

Calling slots just outputs hides the real design-time contract.

An artifact slot tells the methodology:

- what kind of artifact this work unit is expected to produce
- whether it is one item or a fileset
- which templates belong to the slot
- which rules shape capture or sync behavior

Transitions can then use gate policy to decide whether a slot is required for readiness.

## Design time versus runtime

At design time, the work unit defines slot contracts and slot-owned templates.

At runtime, executions produce artifact snapshots against those slots.

That split matters. Design-time slot editing should not be confused with runtime evidence.

## Taskflow example

A Taskflow `Story` work unit might define:

- `story_doc` as a `single` slot
- `code_changes` as a `fileset` slot

The `story_doc` slot can carry a markdown template for the initial story draft.

The `code_changes` slot can define rules for how a fileset is captured and tracked.

> **Screenshot placeholder**
> Artifact Slots tab for the Taskflow Story work unit, showing `story_doc`, `code_changes`, template counts, and slot rules.

## Templates belong to the slot

Templates are owned by a slot, not floated elsewhere in the methodology.

That gives the work unit one durable place to say, "when this slot is created, here is the template or starting content shape that belongs with it."

## Boundary rule

Artifact slots define design-time output contracts.

Transition policy decides whether a slot is required before a lifecycle move can complete.

This keeps slot authoring separate from readiness enforcement.

## Internal architecture references

- `docs/architecture/methodology-pages/artifact-slots-design-time.md`
- `docs/architecture/methodology-pages/work-units/detail-tabs.md`
- `packages/contracts/src/methodology/artifact-slot.ts`
