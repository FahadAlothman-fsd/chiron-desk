---
title: Invoke Step
---
<div class="step-page-hero">
  <img class="step-page-icon" src="/step-icons/asset-33.svg" alt="Invoke step icon" />
  <span class="step-page-caption">Child workflow dispatch</span>
</div>

`invoke` steps start other workflows.

They can invoke another workflow in the current work unit or target child work units for delegation.

## What an invoke step can do

An invoke step can:

- select workflow targets directly or from a context fact
- target either workflows or work units
- bind context values into child work-unit facts or artifact slots
- control run mode and activation transitions
- expose propagation previews and per-target runtime state

## Inputs

Current contracts support two target kinds:

- `workflow`
- `work_unit`

They also support two source modes:

- `fixed`
- `fact_backed`

When work-unit targets are used, bindings and activation transitions become part of the step payload.

## Outputs

At runtime, invoke steps can expose:

- workflow target rows
- work-unit target rows
- completion summary
- propagation preview
- links to started work units, transitions, or workflows

## Constraints

Invoke v1 is intentionally constrained.

- parent-child communication relies on facts and artifact slots
- there is no separate general IO-mapping editor
- target selection must stay typed and explicit
- completion remains explicit instead of magical propagation

## Taskflow example

In the narrowed public Taskflow example, an `invoke` step could activate the `Architecture` work unit once onboarding has produced the required project context and starting artifacts.

> **Screenshot placeholder**
> Taskflow invoke step, showing the Architecture work-unit target, activation transition, and propagated onboarding context.

## Current behavior and implementation status

`invoke` has strong current contract coverage in both design-time and runtime authority sources. Public docs can describe this step family as current behavior, while still avoiding claims about broader cross-workflow IO features that are intentionally outside v1.

## Advanced internal references

- `docs/architecture/methodology-pages/workflow-editor/invoke-step.md`
- `packages/contracts/src/methodology/workflow.ts`
- `packages/contracts/src/runtime/executions.ts`
