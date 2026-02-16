# Workflow Paths (Stub)

This is a placeholder for workflow-path research and design.

## Current understanding

- Workflow paths are guidance only, not execution constraints.
- Users can run any workflow they have access to at any time.
- Some workflows are optional and can be run multiple times (example: brainstorming).
- Paths can suggest recommended next workflows without enforcing them.

## Open questions

- Graph model: should paths be a simple DAG, a multi-start graph, or a tagged list with ordering?
- Cycles: should optional loops (like brainstorming) be represented as explicit loop edges or as independent nodes?
- How to represent parallel guidance (multiple recommended next workflows)?
- How to surface paths in UI without implying hard requirements?

## Example notes

- Workflow paths are soft guidance overlays, not hard constraints.
- Paths are intended to be shareable artifacts (future community playbooks).
- Brainstorming can occur before Product Brief or PRD, and can also run alongside implementation workflows.
- A "Ralph loop" could be modeled as a workflow path suggestion (research needed).
- SDLC is a canonical workflow path (Discovery -> PRD -> Architecture -> Epics/Stories -> Implementation -> QA/Release).

Examples
- SDLC path: Discovery -> PRD -> Architecture -> Epics/Stories -> Implementation -> QA/Release
- Startup MVP path: Problem framing -> Market research -> PRD lite -> Rapid build -> Feedback loop
- Course-correction path: Signal -> Root cause -> Update PRD -> Re-scope stories -> Re-plan
- Innovation path: Brainstorming -> Design thinking -> Concept validation -> PRD

## Next steps

- Research workflow-path graph patterns and finalize representation.
- Define how guidance integrates with workflow selection UI.
