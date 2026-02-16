# Draft: Workflow Step Migration and Module Alignment

> **STATUS: COMPLETED** — This work has been implemented. Kept for historical reference.

## Requirements (confirmed)
- Produce a concrete plan with parallel task graph + detailed todo list.
- Hard migration of workflow step types; reset/reseed acceptable.
- Rename step types to {form, agent, action, invoke, display, branch}.
- Remove system-agent and sandboxed-agent step types.
- Use agentKind {chiron, opencode}.
- OpenCode is via SDK and agentKind=opencode, not a Chiron system agent.
- Close on module boundaries and align structure (workflow-engine, agent-runtime, tooling-engine, etc.).
- Include: task graph with dependencies + parallelizable workstreams, detailed todo list, risks + mitigations, required verification (tests/commands), explicit list of files/areas to audit for stepType changes (DB enum, seeds, handlers, UI renderers, docs).
- Must NOT implement code or suggest partial changes.
- Target completion timeline: 4 weeks with parallel worktrees later.

## Technical Decisions
- Migration approach: hard migration with reset/reseed acceptable (details TBD).
- Step types to standardize: form, agent, action, invoke, display, branch.
- agentKind values: chiron, opencode.

## Research Findings
- Found module boundary proposal in `_bmad-output/planning-artifacts/architecture/chiron-module-structure.md`:
  - Core runtime: workflow-engine, ax-engine, agent-runtime.
  - Shared infra: variable-service, prompt-composer, tooling-engine, provider-registry, event-bus, mcp-gateway, sandbox-git.
  - UI layer: step-renderer, approval-ui.
  - Agent step type: single `agent` with agentKind `chiron` | `opencode`.
- Pending: explore agent for codebase patterns.
- Pending: librarian agent for external best practices.

## Open Questions
- Need to confirm whether `_bmad-output/planning-artifacts/architecture/chiron-module-structure.md` is the authoritative target or needs adjustments.
- Need to confirm test strategy (TDD vs tests-after vs manual).
- Need to confirm migration mechanism/sequence expectations (db reset steps, seeding sources).

## Scope Boundaries
- INCLUDE: stepType rename/removal, agentKind model, module boundary alignment, repo-wide audit list.
- EXCLUDE: implementation details beyond the plan.
