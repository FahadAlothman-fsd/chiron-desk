# Draft: Agent Runtime Contracts (Chiron + OpenCode)

## Requirements (confirmed)
- Need agent-runtime contracts for both Chiron (AI SDK) and OpenCode adapters with near-identical interface.
- Provide: (1) contract interface spec (types), (2) shared contracts needed in @chiron/contracts, (3) extraction plan from existing ai-runtime, (4) questions/risks.
- Constraints: Chiron agent has no edit capabilities; OpenCode uses static tools chiron_context/actions/action.
- No code edits (plan-only).

## Technical Decisions
- None yet.

## Research Findings
- None yet.

## Open Questions
- Unknown target locations for existing ai-runtime contracts and adapters.
- Unclear desired runtime behaviors for tools/streaming/errors and capability flags.
- Unclear packaging/output format for “contract interface spec (types)” deliverable.

## Scope Boundaries
- INCLUDE: interface/contract planning for Chiron and OpenCode adapters; shared contracts in @chiron/contracts; extraction plan; questions/risks.
- EXCLUDE: implementing or editing code.
