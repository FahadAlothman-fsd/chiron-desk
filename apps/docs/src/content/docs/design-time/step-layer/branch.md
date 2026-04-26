---
title: Branch Step
---
<div class="step-page-hero">
  <img class="step-page-icon" src="/step-icons/asset-61.svg" alt="Branch step icon" />
  <span class="step-page-caption">Route selection authority</span>
</div>

`branch` steps choose the next route in a workflow.

They evaluate declared conditions against current workflow-readable data and persist the selected target.

## What a branch step can do

A branch step can:

- evaluate one or more conditional routes
- use `all` or `any` condition modes
- fall back to an optional default target
- record a saved route selection for auditability
- block completion until the persisted selection is valid

## Inputs

Current contracts let branch conditions read canonical workflow namespaces such as:

- `project.facts.*`
- `self.facts.*`
- `project.workUnits.*`
- `context.*`

Routes are built from typed conditions, not free-form expressions.

## Outputs

At runtime, branch detail can expose:

- route validity
- suggested route
- persisted selection
- save-selection action
- completion eligibility
- next-step and lineage state

## Constraints

Branch steps are read-only evaluators.

- they do not mutate facts or artifacts
- route choice is deterministic from the evaluated state plus the saved selection contract
- missing valid routes can block completion
- public docs should not claim broader expression-language support that current contracts do not define

## Taskflow example

In the narrowed public Taskflow example, a `branch` step can check whether onboarding has enough context to continue directly into the `Architecture` work unit or whether more setup input is still required.

That keeps the route choice attached to the workflow instead of hiding readiness decisions in tribal knowledge.

> **Screenshot placeholder**
> Taskflow branch step, showing evaluated routes for additional setup versus Architecture handoff.

## Current behavior and implementation status

`branch` has strong current contract coverage. Current runtime contracts are explicit that UI suggestions are advisory, while the persisted selected target is the completion authority.

## Advanced internal references

- `docs/architecture/methodology-pages/workflow-editor/branch-step.md`
- `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md`
- `packages/contracts/src/methodology/workflow.ts`
- `packages/contracts/src/runtime/executions.ts`
