---
title: Agent Step
---
<div class="step-page-hero">
  <img class="step-page-icon" src="/step-icons/asset-58.svg" alt="Agent step icon" />
  <span class="step-page-caption">Bounded agent work</span>
</div>

`agent` steps are the bounded conversational step type.

They are meant for drafting, analysis, brainstorming, and other agent work where context access and write authority need to stay explicit.

## What an agent step can do

An agent step is designed to:

- choose a harness, such as Chiron or OpenCode
- select an agent identity and optional model override
- provide step-specific instructions
- expose read-only context selectors
- expose an allow-listed actions catalog
- complete through explicit completion conditions

## Inputs

Current design-time contracts describe three tool-facing input areas:

- `context`, for read-only scoped visibility
- `actions`, for the allowed catalog the agent can inspect
- `action`, for executing one allow-listed action

Selectors can point to project facts, self facts, work-unit data, and artifact snapshots.

## Outputs

The intended outputs are bounded writes through declared step actions, such as:

- variable updates
- AX-backed generation outputs
- artifact synchronization results

The public rule is simple: an agent step should not have undefined write access.

## Constraints

Agent steps are intentionally narrow in authority.

- context access is read-only and scoped
- writes are limited to declared targets
- progressive unlock can depend on required variables
- completion can require agent-done, approvals, populated variables, or manual confirmation

## Taskflow example

In the narrowed public Taskflow example, an `agent` step could read the onboarding brief, repo context, and architecture constraints, then draft the first architecture-oriented output through declared actions that write only to approved context targets.

> **Screenshot placeholder**
> Taskflow agent step configuration, showing bounded context selectors, allowed actions, and completion rules for early Architecture work support.

## Current behavior and implementation status

Public docs need to be careful here.

The design-time contract for `agent` is detailed and stable enough to explain. The deeper runtime detail is not yet fully implemented in the same way as `form`, `invoke`, or `branch`.

Current runtime contracts still treat `agent` as deferred in the generic deferred-step shape. Public docs should present the intended capabilities clearly, while labeling the end-to-end runtime depth as not yet fully implemented.

## Advanced internal references

- `docs/architecture/methodology-pages/workflow-editor/agent-step.md`
- `docs/architecture/system-pages/harnesses/index.md`
- `docs/architecture/modules/provider-registry.md`
- `packages/contracts/src/runtime/executions.ts`
