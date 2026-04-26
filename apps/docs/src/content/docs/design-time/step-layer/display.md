---
title: Display Step
---
<div class="step-page-hero">
  <img class="step-page-icon" src="/step-icons/asset-22.svg" alt="Display step icon" />
  <span class="step-page-caption">Read-only review surface</span>
</div>

`display` steps render read-only information inside a workflow.

They are for summaries, diagnostics, instructions, and review surfaces.

## What a display step can do

A display step is designed to:

- render single-page or tabbed content
- interpolate allowed values from `context.*`, `project.*`, and `self.*`
- model next-step navigation explicitly
- separate presentation content from guidance

## Inputs

Current design-time contracts describe:

- a presentation mode, `single` or `tabs`
- versioned content payloads
- optional navigation metadata
- human and agent guidance

## Outputs

The output is a rendered, read-only review surface.

Display steps do not capture new values and do not mutate facts, artifacts, or route state.

## Constraints

Display steps stay presentation-only.

- interpolation is read-only
- content is versioned for migration safety
- navigation is explicit, not hidden in rich text
- the step should not be framed as an editor

## Taskflow example

In the narrowed public Taskflow example, a `display` step can show the onboarding summary, gathered constraints, and architecture handoff checklist before the operator continues into the `Architecture` work unit.

> **Screenshot placeholder**
> Taskflow display step, showing onboarding summary tabs, gathered constraints, and the Architecture handoff checklist.

## Current behavior and implementation status

The design-time contract is specific and mature enough to document. Runtime detail is not yet fully implemented as a dedicated display-step body in the same way as `form`, `invoke`, or `branch`.

Current generic runtime contracts still classify `display` as deferred, so public docs should describe the intended capabilities while marking the runtime depth as not yet fully implemented.

## Advanced internal references

- `docs/architecture/methodology-pages/workflow-editor/display-step.md`
- `packages/contracts/src/runtime/executions.ts`
