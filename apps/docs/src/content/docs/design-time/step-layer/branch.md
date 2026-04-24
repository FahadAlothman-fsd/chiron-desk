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

In Taskflow review and rework, a `branch` step can check whether required review outcomes exist. If the result is strong enough, it routes to completion. If not, it routes back to a rework path.

The same branch concept also appears earlier in setup, where onboarding can split by project type, and in fan-out, where delegation can split by scope or readiness.

> **Screenshot placeholder**
> Taskflow branch step, showing evaluated routes for completion, rework, and delegated follow-up.

## Current behavior and implementation status

`branch` has strong current contract coverage. Current runtime contracts are explicit that UI suggestions are advisory, while the persisted selected target is the completion authority.

## Advanced internal references

- `docs/architecture/methodology-pages/workflow-editor/branch-step.md`
- `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md`
- `packages/contracts/src/methodology/workflow.ts`
- `packages/contracts/src/runtime/executions.ts`
