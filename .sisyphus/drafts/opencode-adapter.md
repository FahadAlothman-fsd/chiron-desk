# Draft: OpenCode Adapter for @chiron/agent-runtime

## Requirements (confirmed)
- Implement OpenCode adapter in @chiron/agent-runtime.
- Use static tools: chiron_context / chiron_actions / chiron_action.
- agentKind dispatch via step.config.agentKind.
- Chiron agent must be read-only.
- Integrate OpenCode SDK (not ACP).
- Provide: step-by-step plan, required files, minimal viable adapter, tool registration + session mapping, event mapping to AgentStreamEvent, verification steps.
- No code edits requested (planning only).
- User requested plan now; no further background research.

## Technical Decisions
- None yet.

## Research Findings
- Skipped per user request.

## Open Questions
- Target OpenCode SDK version or package name?
- Expected adapter interface in @chiron/agent-runtime (e.g., existing adapters to mirror)?
- Required agent kinds beyond OpenCode and Chiron?
- Expected tool schema for chiron_context/chiron_actions/chiron_action?
- How AgentStreamEvent is defined and required mapping fields?
- Session lifecycle expectations (create/reuse/close) and IDs?
- Verification approach preference (tests vs manual, which commands)?

## Scope Boundaries
- INCLUDE: OpenCode adapter, tool registration, session mapping, event mapping plan, verification steps.
- EXCLUDE: Implementation/code changes (this is planning only).
