---
title: Work Unit Layer, Workflows
---
Workflows are the execution paths available inside a selected work unit.

They belong to the work unit's catalog, even before a transition binds them.

## What a workflow means here

At the Work Unit Layer, a workflow is a named execution path that belongs to one work-unit type.

Examples for Taskflow could include:

- `create-prd`
- `dev-story`
- `verify-story`
- `review-story`

This page is about workflow ownership and cataloging at work-unit scope. It is not the deep dive on workflow steps.

## Workflows are not transitions

This boundary is important.

- A workflow says how work runs.
- A transition says when the work unit can change lifecycle state.
- A workflow binding links the two.

That means a workflow can exist without being bound yet.

For example, a work unit may have an unbound draft workflow in its catalog while the author is still deciding which lifecycle move should use it.

## What a workflow contract includes

Current workflow contracts include metadata such as:

- key
- display name
- description
- guidance

The deeper step graph belongs to workflow authoring and the Step Layer story. The work-unit surface focuses on which workflows exist for this work unit and which transitions reference them.

## Taskflow example

For a Taskflow `Story` work unit, a common split could be:

- `dev-story` for active implementation work
- `verify-story` for validation and review support

At this layer, you can see both workflows in the work-unit catalog.

Then you can inspect which transition, if any, each workflow is bound to.

> **Screenshot placeholder**
> Workflows tab for the Taskflow Story work unit, showing bound and unbound workflows, transition summaries, and findings.

## Bound and unbound workflows

Two useful states on this page are:

- **Bound**. The workflow is linked to one or more transitions.
- **Unbound**. The workflow exists in the work-unit catalog but has no transition binding yet.

That view helps authors spot workflows that are defined but not yet made operational.

## Boundary rule

Use the Work Unit Layer to answer, "Which workflows belong to this work unit?"

Use transitions and workflow bindings to answer, "When is each workflow allowed to run?"

## Internal architecture references

- `docs/architecture/methodology-pages/work-units/detail-tabs.md`
- `docs/architecture/chiron-module-structure.md`
- `packages/contracts/src/methodology/workflow.ts`
