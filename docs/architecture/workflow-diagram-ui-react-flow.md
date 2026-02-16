# Workflow Diagram UI (React Flow)

**Last Updated:** 2026-02-09  
**Status:** Draft baseline

## Goal

Add first-class diagram UI for workflow structure and execution visibility using React Flow.

## Scope

- Visualize workflow definitions (steps, branches, invoke edges).
- Visualize execution overlays (status, current step, errors, approvals).
- Support branch-aware views through execution/git context signals.

## MVP

- Read-only graph rendering for workflow definitions.
- Node types for six step kinds.
- Edge types for sequential, conditional, and invoke transitions.
- Execution state overlay from event stream.

## Phase 2

- Interactive editing mode (if approved).
- Execution lineage/compare modes.
- Deep links from graph nodes to step/execution detail panels.

## Integration Points

- `@chiron/api` workflow endpoints
- Event stream subscriptions from event bus/SSE
- Variable and git context indicators for branch-aware debugging

## Design Note

- This is execution/architecture visualization, not a PM replacement.
- External PM systems (for example Linear) remain source-of-truth for planning artifacts.
