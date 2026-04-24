---
title: Runtime Guidance
---
Runtime guidance is the operator-facing signal for what can run next and why.

## What the operator can do

In Taskflow, an operator can use runtime guidance to:

- spot ready versus blocked work
- understand eligibility and readiness reasons
- find the next workflow, step, or review action to take
- explain why a transition cannot complete yet
- route attention to the right work unit or execution record

This is the page for the question, "What should happen next, and what is stopping it?"

## What runtime object sits behind the page

Runtime guidance is derived from live runtime state.

That can include:

- readiness summaries
- eligibility reasons
- missing fact or artifact prerequisites
- active transition or workflow pointers
- blocker messages the operator can act on

It is guidance, not a second copy of the underlying objects. The detailed objects still live on the project, work-unit, transition, workflow, and step pages.

## How Taskflow uses runtime guidance

In Taskflow, guidance can tell the operator that:

- setup facts must be filled before delivery starts
- a Story is ready for implementation
- review evidence is missing, so a transition cannot complete
- a saved branch choice is still required before work can move forward

## Back to Design Time

Guidance surfaces come from the same design-time rules that define facts, slots, transitions, workflows, and steps.

- [Design Time overview](/design-time/)
- [Work Unit Layer overview](/design-time/work-unit-layer/)
- [Workflow Layer overview](/design-time/workflow-layer/)
- [Step Layer overview](/design-time/step-layer/)
- Runtime overview authority: `packages/contracts/src/runtime/overview.ts`
- Runtime work-unit authority: `packages/contracts/src/runtime/work-units.ts`

Use Design Time to understand the rules. Use Runtime Guidance to see how those rules apply to this project right now.
