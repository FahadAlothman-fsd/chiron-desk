# Draft: Agent taxonomy + module structure refinement

## Requirements (confirmed)
- User wants to iron out `_bmad-output/planning-artifacts/architecture/chiron-module-structure.md` with an agentKind model.
- Requirements: two Chiron agents (step-scoped + system-wide).
- OpenCode is separate via SDK (not a Chiron agent).
- Conflicts noted:
  - `docs/migration-plan.md` uses sandboxed/system agent split.
  - `chiron-module-structure.md` proposes single step type `agent` with agentKind adapters.
  - Research doc suggests `opencode-session` step type.
- Output requested in plan (no code edits):
  1) Parallel task graph for missing context (file reads only)
  2) Proposed refined spec outline (modules, interfaces, agentKind contract, step config)
  3) Decision points/questions for user
  4) Consistency validation steps across docs

## Technical Decisions
- None yet; awaiting codebase/doc review findings.

## Research Findings
- Pending explore/librarian agents.

## Open Questions
- Which docs are authoritative when conflicts exist?
- Should `opencode-session` be a distinct step type or an external SDK integration referenced by `agent` step type?
- Expected testing/validation approach for documentation consistency?

## Scope Boundaries
- INCLUDE: refining module structure + agent taxonomy spec across docs; no code changes.
- EXCLUDE: implementation, code edits, or non-markdown changes.
