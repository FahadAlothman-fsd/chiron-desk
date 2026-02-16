# Draft: Effect Migration Planning

> **STATUS: COMPLETED** — This work has been implemented. Kept for historical reference.

## Requirements (confirmed)
- Migration completed by tomorrow on branch `feat/effect-migration`.
- App fully done in 4 weeks; need a 4-week roadmap with milestones.
- Step types currently: user-form, sandboxed-agent, system-agent, execute-action, invoke-workflow, display-output, branch.
- Target step type rename: form, agent, action, invoke, display, branch.
- agentKind should be `chiron` or `opencode`.
- OpenCode via SDK.
- Hard reset acceptable.
- Update seeds to new schema.
- Plan must include: 24-hour migration plan, 4-week roadmap, success criteria + verification steps, risks + mitigations, clarifying questions + counterexamples.
- No code edits in this session.

## Technical Decisions
- None yet; awaiting clarification and codebase findings.

## Research Findings
- Pending explore/librarian agents.

## Open Questions
- None recorded yet; to be updated after initial clarification.

## Scope Boundaries
- INCLUDE: Step-type rename, schema migration, seeds update, minimal runtime wiring.
- EXCLUDE: Full implementation work or code changes in this session.
