# Workflow Versioning Model

**Last Updated:** 2026-02-09  
**Status:** Draft baseline

## Separation Of Concerns

Two different versioning systems must coexist:

- **Workflow Definition Versioning**: changes to workflow structure/config (steps, paths, prompts).
- **Execution Revisioning**: retries/re-runs/reverts of step attempts inside one execution.

Do not treat these as the same thing.

## Definition Versioning Rules

- Published workflow definitions are immutable.
- New edits produce a new workflow version.
- Executions always pin to a specific workflow definition version.
- Historical executions must remain reproducible against the pinned version.

## Execution Revision Rules

- Step attempts are immutable records.
- Retry/revert creates a new step execution row.
- Prior attempts remain preserved for audit and replay.
- Exactly one active attempt per current step in an execution.

## Implementation Direction

- Keep definition version metadata in workflow-definition layer.
- Keep execution revision lineage in `step_executions`.
- Ensure APIs expose both: `workflowVersion` and `stepRevisionChain`.
