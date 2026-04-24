---
title: Step Layer
---
The Step Layer explains the explicit nodes that make up a workflow.

This is the most execution-facing layer in the public design-time model.

## The six step types

Every workflow step in Chiron uses one of six types:

| Step Type | Icon | Responsibility |
|-----------|------|----------------|
| `form` | <img class="step-page-icon" src="/step-icons/asset-45.svg" alt="Form" /> | Collects structured input |
| `agent` | <img class="step-page-icon" src="/step-icons/asset-58.svg" alt="Agent" /> | Runs bounded agent work |
| `action` | <img class="step-page-icon" src="/step-icons/asset-08.svg" alt="Action" /> | Performs deterministic non-chat effects |
| `invoke` | <img class="step-page-icon" src="/step-icons/asset-33.svg" alt="Invoke" /> | Starts other workflows or work-unit executions |
| `display` | <img class="step-page-icon" src="/step-icons/asset-22.svg" alt="Display" /> | Shows read-only information |
| `branch` | <img class="step-page-icon" src="/step-icons/asset-61.svg" alt="Branch" /> | Chooses the next route |

Each type has a different responsibility. Chiron does not treat them as one generic step with arbitrary behavior.

## Why the split matters

This split keeps workflows inspectable.

- `form` collects structured input
- `agent` runs bounded agent work
- `action` performs deterministic non-chat effects
- `invoke` starts other workflows or work-unit executions
- `display` shows read-only information
- `branch` chooses the next route

That makes the execution grammar easier to author, audit, and review.

## Inputs and outputs

Most steps consume some mix of:

- workflow context facts
- work-unit facts
- project-level runtime state
- artifact references

Their outputs differ by type.

- some produce or update workflow context facts
- some launch other executions
- some only render information
- some record a route choice for later completion

## Maturity framing

The step taxonomy is fixed and public.

The implementation maturity is mixed.

- `form`, `invoke`, and `branch` have strong current contract coverage
- `action` has concrete authoring and runtime detail coverage, but some deeper engine convergence is still not fully implemented
- `agent` and `display` remain partially deferred in runtime detail contracts

So the Step Layer is a real product layer, but not every step family has the same end-to-end depth yet.

## Taskflow example

Taskflow uses this sequence often:

1. collect structured setup data with `form`
2. run bounded drafting or analysis with `agent`
3. show a review surface with `display`
4. choose a route with `branch`
5. trigger child work with `invoke`
6. persist deterministic changes with `action`

Not every Taskflow slice needs every step type, but the same six-type grammar stays consistent across the docs.

The setup slice leans on `form`, `agent`, and `branch`. The fan-out slice makes `invoke` and artifact-producing `action` more visible. The review slice leans on `display`, `branch`, and bounded `agent` rework help.

> **Screenshot placeholder**
> Step Layer overview for Taskflow, showing the six step types as one consistent grammar across setup, delegation, and review.

## Read the step pages next

- [Form step](/design-time/step-layer/form)
- [Agent step](/design-time/step-layer/agent)
- [Action step](/design-time/step-layer/action)
- [Invoke step](/design-time/step-layer/invoke)
- [Display step](/design-time/step-layer/display)
- [Branch step](/design-time/step-layer/branch)

## Advanced internal references

- `docs/architecture/chiron-module-structure.md`
- `docs/architecture/methodology-pages/workflow-editor/`
- `packages/contracts/src/runtime/executions.ts`
