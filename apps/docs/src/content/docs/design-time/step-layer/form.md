---
title: Form Step
---
<div class="step-page-hero">
  <img class="step-page-icon" src="/step-icons/asset-45.svg" alt="Form step icon" />
  <span class="step-page-caption">Structured input capture</span>
</div>

`form` steps collect or edit structured input during a workflow.

They are the clearest way to capture explicit values into workflow context facts for later steps.

## What a form step can do

A form step can:

- render typed fields
- prefill from canonical source paths
- store results against declared workflow context facts
- validate required fields and supported value rules
- save draft data and later submit the final payload

## Inputs

At design time, each field binds to a declared workflow context fact definition.

Fields can read from canonical path families such as:

- `project.*`
- `self.*`
- `context.*`

Current contracts also support typed widgets, cardinality, options, nested structures, and path validation.

## Outputs

A submitted form step produces captured context-fact values for the current workflow execution.

At runtime, the form detail contract includes:

- the rendered page model
- latest draft payload
- latest submission payload
- save-draft and submit actions
- lineage and next-step information

## Constraints

Form steps are structured and deterministic.

- fields must target declared context-fact definitions
- canonical path persistence uses dot notation
- changing cardinality or type should revalidate dependent config
- the step is about captured input, not open-ended reasoning

## Taskflow example

In Taskflow onboarding, a `form` step can capture:

- target repository path
- project type
- preferred review depth
- initial constraints for the child work that will follow

Those values then become reusable workflow context facts for later `agent`, `branch`, or `invoke` steps.

> **Screenshot placeholder**
> Taskflow onboarding form step, showing repository path, project type, review depth, and setup constraints fields.

## Current behavior and implementation status

`form` is one of the strongest step families in current contracts.

Design-time payloads, runtime page models, draft handling, submission handling, and resolved widgets are all present in public authority sources.

## Advanced internal references

- `docs/architecture/methodology-pages/workflow-editor/form-step.md`
- `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md`
- `packages/contracts/src/methodology/workflow.ts`
- `packages/contracts/src/runtime/executions.ts`
