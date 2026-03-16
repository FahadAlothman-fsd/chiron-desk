# Agent Continuation Contract

**Last Updated:** 2026-02-09  
**Status:** Contextual draft only (non-canonical)

Do not use this file as current implementation authority.

The continuation intent described here is still relevant, but the invoke/output examples in this draft predate the promoted `invoke.v1` facts-and-artifact-slot model. Continuation work must be reconciled against:
- `docs/architecture/methodology-pages/workflow-editor/agent-step.md`
- `docs/architecture/methodology-pages/workflow-editor/invoke-step.md`
- `docs/plans/2026-03-12-invoke-facts-artifact-slots-design.md`
- `docs/architecture/epic-3-authority.md`

## Purpose

Define how one agent step can continue a prior agent conversation after intermediate steps (for example `invoke`) complete.

Primary use case:

1. Agent step A sets objective and planning context
2. Invoke step runs child workflows and captures outputs
3. Agent step B resumes the same conversation context and converges using child outputs

## Contract Additions (Agent Step)

Extend `AgentStepConfig` with continuation fields:

```ts
type AgentStepConfig = {
  // existing fields...
  continuityKey?: string
  continuityMode?: "new" | "continue" // default: "continue"
  contextAttachments?: Array<{
    variable: string
    role?: "system" | "user"
    format?: "json" | "text"
    label?: string
  }>
}
```

- `continuityKey`: shared identifier for related agent steps in one workflow execution.
- `continuityMode: "continue"`: reuse continuity session if present.
- `continuityMode: "new"`: force fresh session for this step.
- `contextAttachments`: deterministic way to inject invoke outputs or other variables into resumed context.

## Runtime Behavior

Given `(executionId, stepExecutionId, continuityKey)`:

1. Resolve or create chat session by `(executionId, continuityKey)`.
2. Load prior conversation history for active lineage.
3. Add current step prompt/input messages.
4. Add `contextAttachments` as explicit structured context blocks.
5. Execute agent runtime.
6. Persist generated messages and tool events under current `stepExecutionId`.

## Data Model Notes

For robust continuation and revert behavior:

- `chat_sessions` should support continuity grouping (execution + continuity key).
- `chat_messages` should retain `stepExecutionId` attribution.
- History reconstruction should include only messages from active step-execution lineage.

## Revert Interaction

- `session_rewind`: rewind within same continuity session when no persisted boundary is crossed.
- `step_revision`: create a new step execution revision when persisted boundaries are crossed.
- Continuation after revert uses active lineage only (reverted attempts remain auditable but inactive).

## Security And Approval Notes

- Outputs from child invoke workflows are treated as untrusted input and wrapped in explicit context blocks.
- Tool approval decisions remain scoped to current step execution and are not implicitly reused across revisions.

## Example Pattern

```yaml
- id: set-objective
  type: agent
  config:
    continuityKey: brainstorm-main
    continuityMode: new

- id: run-techniques
  type: invoke
  config:
    forEach: ...
    output:
      mode: variables
      target: technique_results

- id: converge
  type: agent
  config:
    continuityKey: brainstorm-main
    continuityMode: continue
    contextAttachments:
      - variable: technique_results
        role: system
        format: json
        label: "Child workflow outputs"
```
