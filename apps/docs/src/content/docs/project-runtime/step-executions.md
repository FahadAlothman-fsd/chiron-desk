---
title: Step Executions
---
Step executions are the smallest runtime unit an operator can inspect directly.

## What the operator can do

In Taskflow, an operator can open a step execution and:

- see the step type, activation time, completion time, and next step
- complete the step when the runtime allows manual completion
- fill a form step, save a draft, or submit it
- inspect branch suggestions, save a branch choice, and see why completion is blocked
- start or open invoked child workflows or work-unit targets
- run, retry, or skip action items when the action step exposes them
- inspect an agent step's timeline preview, readable context, and write set

This is the runtime surface for the question, "What exactly happened inside this workflow?"

## What runtime object sits behind the page

Every step execution has a shared shell:

- step execution id
- workflow execution id
- step definition id
- step type
- status
- activation and completion timestamps
- completion action visibility and eligibility

After that shared shell, the body depends on the step type.

Current runtime bodies include:

- rich form-step detail with page model, draft state, submission state, and next-step linkage
- rich branch-step detail with conditional routes, suggested target, saved selection, and completion summary
- rich invoke-step detail with target rows, statuses, propagation preview, and completion summary
- rich action-step detail with runtime rows, retry and skip controls, and manual completion summary
- agent-step detail in a dedicated runtime contract with session state, readable context, timeline preview, and write-set progress

## Taskflow example

Inside a Taskflow `dev-story` workflow, an operator might move through:

- a form step that captures implementation notes
- an invoke step that starts a child review workflow
- a branch step that routes to completion or rework
- an action step that propagates approved outputs
- an agent step that shows conversation, tool activity, and proposed writes

Each one is visible as its own runtime record rather than disappearing into a single opaque run.

## Current behavior and partial areas

This page needs a clear maturity note.

- `form`, `branch`, `invoke`, and `action` have concrete runtime detail contracts today.
- `agent` has a dedicated runtime contract and a real operator surface, but the broader step-layer story is still being finished across the product.
- `display` remains lighter. Public docs should not imply a deep standalone execution surface that current contracts do not show.
- The repo still labels deeper workflow-step execution work as not yet fully implemented in some areas, especially around the full Step Layer story.

That means step executions are real and inspectable now, but you should not assume every step family has reached the same depth.

## Observable branch, review, and artifact behavior

Branch behavior is directly observable here. Operators can see valid routes, default targets, the saved selection, and the rule that completion depends on the persisted selection.

Review and rework behavior is observable through next-step linkage, retry controls, superseding workflow attempts, and completion blockers.

Artifact behavior is observable when action or invoke steps show propagation targets, artifact slot references, or output previews. This page stays at that runtime evidence level and does not claim deeper automation than the contracts provide.

## Back to Design Time

Step executions come from the Step Layer and, for agent steps, the agent-step contract boundary.

- [Step Layer overview](/design-time/step-layer/)
- [Form](/design-time/step-layer/form)
- [Agent](/design-time/step-layer/agent)
- [Action](/design-time/step-layer/action)
- [Invoke](/design-time/step-layer/invoke)
- [Display](/design-time/step-layer/display)
- [Branch](/design-time/step-layer/branch)
- Runtime contract authority: `packages/contracts/src/runtime/executions.ts`
- Agent-step runtime authority: `packages/contracts/src/agent-step/runtime.ts`

Use the Step Layer when you want to know what a step type is supposed to mean. Use step executions when you need to inspect one actual run.
