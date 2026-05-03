---
title: Workflow Context Facts
---
Workflow context facts are execution-scoped values that live inside a workflow run.

They are first-class because workflows need local working data, but they are not durable methodology definition data and they are not owned by a work unit as part of its long-lived contract.

## What makes them different

Chiron has three different fact scopes in public docs:

- methodology facts, which apply across a methodology version
- work-unit facts, which belong to one work-unit definition
- workflow context facts, which support one workflow execution path

Workflow context facts are the local handoff layer between steps.

## What they are for

Use workflow context facts when a step needs to capture or reuse data such as:

- form submissions
- workflow references chosen for later invocation
- work-unit references gathered during delegation
- artifact slot references used by a later step
- temporary structured values that matter during this workflow execution

## Current fact kinds

Current contracts allow these workflow context fact kinds:

- `plain_fact`
- `bound_fact`
- `workflow_ref_fact`
- `artifact_slot_reference_fact`
- `work_unit_reference_fact`
- `work_unit_draft_spec_fact`

There is also a legacy compatibility shape, `plain_value_fact`, still present for migration safety.

## Definition-time shape

At design time, a workflow context fact definition includes things like:

- a key
- cardinality, `one` or `many`
- a fact kind
- optional label, description, and guidance
- kind-specific links, such as a referenced workflow, artifact slot, or work-unit definition

That definition lives on the workflow.

The values do not.

## Runtime shape

At project runtime, workflow context facts show up as grouped instances on a workflow execution.

Each instance can record:

- stored value JSON
- instance order
- when it was recorded
- which step execution produced it, when known

That is why this page frames them as execution-scoped context rather than definition data.

## Relationship to steps

Different step types interact with workflow context facts in different ways:

- `form` captures structured input into declared context facts
- `branch` reads context facts to decide routing
- `invoke` can read context facts as workflow or work-unit targets and can preview propagation outputs
- `action` currently uses allow-listed context-fact kinds for propagation work
- `agent` is intended to read and write only within declared bounds

## What not to assume

Public docs should not claim universal propagation rules that do not exist in contracts.

In particular:

- not every step can read every namespace without restriction
- not every produced value automatically becomes a durable work-unit fact
- workflow context facts do not replace artifacts or work-unit facts
- parent-child invoke communication is still intentionally narrow in v1

## Taskflow example

In Taskflow, a planning workflow could define context facts such as:

- `selectedStories`, as a work-unit draft spec fact with many cardinality
- `reviewWorkflowRef`, as a workflow reference fact
- `storyDocSlot`, as an artifact slot reference fact
- `implementationNotes`, as a plain fact

A `form` step can capture `implementationNotes`, an `invoke` step can use `selectedStories`, and a later `branch` or `agent` step can reuse the captured context during review.

That lets Taskflow carry one coherent thread from setup inputs, to delegation targets, to review context, without renaming the same data differently on each page.

> **Screenshot placeholder**
> Workflow context facts panel for Taskflow, showing setup inputs, delegation targets, artifact slot references, and review-facing context values.

## Current behavior and implementation status

The definition and runtime grouping model for workflow context facts is present in contracts today.

What is not safe to claim yet is a fully generalized value-model convergence story across every step family and runtime package. Some validation, propagation, and broader system convergence items are still explicitly deferred.

## Advanced internal references

- `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md`
- `packages/contracts/src/methodology/fact.ts`
- `packages/contracts/src/methodology/workflow.ts`
- `packages/contracts/src/runtime/executions.ts`
