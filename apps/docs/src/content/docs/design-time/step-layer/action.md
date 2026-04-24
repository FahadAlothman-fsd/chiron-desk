---
title: Action Step
---
<div class="step-page-hero">
  <img class="step-page-icon" src="/step-icons/asset-08.svg" alt="Action step icon" />
  <span class="step-page-caption">Deterministic effects</span>
</div>

`action` steps perform deterministic, non-chat work.

They are for explicit effects that should be reviewable, typed, and bounded.

## What an action step can do

Current contracts frame `action` steps around propagation-style actions with explicit ordering and execution mode.

In public terms, an action step can:

- run one or more declared actions
- run them sequentially or in parallel
- expose row-level execution state
- support manual completion once the execution rules allow it
- preview or perform bounded propagation work

## Inputs

Current design-time payloads include:

- step metadata
- `executionMode`
- one or more enabled actions
- allowed context-fact references for propagation items

Each action points to declared context facts and nested items, rather than acting as an open automation shell.

## Outputs

At runtime, action-step detail can expose:

- action rows and item statuses
- completion eligibility
- next-step and lineage data

The important public point is that action output is explicit and reviewable, not hidden inside chat.

## Constraints

The v1 surface is intentionally narrow.

- authoring is whole-step oriented
- only propagation-style action kinds are part of the current contract
- ordering and uniqueness rules are validated
- the step is not a generic shell or infrastructure DSL

## Taskflow example

In Taskflow, an `action` step can take approved workflow context facts and propagate them into the right fact or artifact slot targets after a reviewer has accepted the plan.

That keeps artifact production explicit in both the fan-out and review slices. The action is part of the visible workflow, not a silent background side effect.

> **Screenshot placeholder**
> Taskflow action step, showing propagation rows from approved context facts into fact targets and artifact slots.

## Current behavior and implementation status

This step type needs careful wording.

Current contracts include concrete authoring payloads and a concrete runtime detail body for action execution. At the same time, broader AX convergence, richer action kinds, and some deeper value-model work are still explicitly deferred.

So public docs can describe `action` as real and partly implemented, but should not claim that the full long-term action vision is already shipped.

## Advanced internal references

- `docs/architecture/methodology-pages/workflow-editor/action-step.md`
- `docs/architecture/modules/ax-engine.md`
- `packages/contracts/src/methodology/workflow.ts`
- `packages/contracts/src/runtime/executions.ts`
