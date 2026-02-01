# Draft: Agent Runtime Implementation Plan

## Requirements (confirmed)
- Start implementation of `@chiron/agent-runtime` with a step-by-step plan.
- Include contract types in `@chiron/contracts`.
- Include AgentRuntime Tag/Layer + adapter routing (`chiron/opencode`).
- Move AI runtime files from `packages/api` into agent-runtime.
- Update imports/wiring in `packages/api`.
- Ensure read-only chiron agent (no edit tools).
- Static OpenCode tools (`chiron_context/actions/action`).
- Provide verification plan and commands.
- Provide parallel task graph and risks.
- No code edits in this session.

## Technical Decisions
- Move `packages/api/src/services/workflow-engine/effect/ai-runtime/*`, `ai-provider-service.ts`, `streaming-adapter.ts`, `opencode-relay.ts` into `@chiron/agent-runtime`.
- Contracts scope includes: `AgentRunParams`, `AgentRunResult`, `StreamEvent`, plus tool lifecycle types in `@chiron/contracts`.
- Adapter routing dispatch uses `step.config.agentKind` (e.g., `chiron/opencode`).
- Read-only Chiron agent uses strict allowlist (deny-by-default).
- Static OpenCode tools sourced from `chiron_context/actions/action` with schemas defined now.

## Research Findings
- AI runtime files live under `packages/api/src/services/workflow-engine/effect/ai-runtime/` (service, runner, adapters, events, relay).
- Wiring points include `packages/api/src/services/workflow-engine/effect/index.ts` (AILayer/MainLayer), `step-registry.ts`, `sandboxed-agent-handler.ts`, `streaming-adapter.ts`, `routers/workflows.ts`.
- `@chiron/contracts` and `@chiron/agent-runtime` packages exist but currently empty placeholders.
- OpenCode adapter registered in provider registry; `opencode-relay.ts` handles OpenCode stream event relay.
- Best practice: filter/allowlist tools before passing to model; use static tool registry with schemas; allowlist for read-only agents.

## Open Questions
- Test strategy: TDD vs tests-after vs manual-only?
- Verification requirements: any required environments or commands beyond `bun test` / `bun check` / `bun dev`?

## Scope Boundaries
- INCLUDE: planning only, no code edits.
- EXCLUDE: implementation, file modifications, commits.
