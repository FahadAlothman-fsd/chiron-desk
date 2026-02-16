# Draft: Workflow Engine Contract + Lifecycle Plan

## Requirements (confirmed)
- Produce a parallel task graph and structured TODOs for implementing workflow-engine contract, step lifecycle, integrations, and docs updates.
- Provide wave-based plan with dependencies, explicit file targets, and recommended category+skills per task.
- Read-only analysis only; no file edits.
- Respect locked decisions: step types, agentKind, tool generation, provider registry.
- Honor module boundaries with Effect Tag/Layer.
- Include EventBus emission points.
- Include doc acceptance criteria and Effect utilization best practices section.
- Include tests/smoke verification plan.
- Do not propose refactors outside workflow-engine; do not change module boundaries.

## Technical Decisions
- Pending: exact contract shapes and lifecycle entry points per step type.

## Research Findings
- Pending: codebase pattern scan (workflow-engine and related services).
- Pending: Effect Tag/Layer best practices summary.

## Open Questions
- Precise file targets for contract types, step lifecycle handlers, and integrations.
- Which tests/smoke checks are expected and where they should live.
- Any specific doc files for acceptance criteria and best practices.

## Scope Boundaries
- INCLUDE: workflow-engine contract types + minimal stubs; step lifecycle for form/agent/action/invoke/display/branch; integrations via interfaces with tooling-engine/variable-service/agent-runtime; docs updates with acceptance criteria + Effect best practices; tests/smoke plan.
- EXCLUDE: refactors outside workflow-engine; changing module boundaries; altering locked decisions.
