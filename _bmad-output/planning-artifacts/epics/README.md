# Epics

**Status**: Pending — new epics to be created after party mode alignment session.

The previous epics (v1, Mastra-era) were archived to `docs/archive/epics-v1-mastra-era/` on 2026-02-08. They referenced obsolete technology (Mastra, 5 step types, `ask-user-chat`, `llm-generate`) and are no longer applicable to the current architecture.

## Current Architecture

See `docs/architecture/chiron-module-structure.md` for the canonical module structure and concurrency model.

## What's Built

- `@chiron/workflow-engine` — 6 step handlers, Effect services
- `@chiron/agent-runtime` — dual adapter (chiron + opencode)
- `@chiron/contracts` — shared types (migrating to Effect Schema)
- `@chiron/api` — tRPC routers (legacy workflow code still present)
- `@chiron/db` — 15+ tables
- `@chiron/auth`, `@chiron/scripts` — supporting packages
- `apps/web` + `apps/server` — functional frontend + backend

## What Needs Epics

- `@chiron/tooling-engine` — central side-effect executor + approval flow
- `@chiron/event-bus` — cross-module event distribution
- `@chiron/provider-registry` — AI provider catalog + credentials
- `@chiron/variable-service` — workflow variable resolution
- `@chiron/template-engine` — template rendering
- `@chiron/ax-engine` — prompt optimization
- `@chiron/sandbox-engine` — git worktree isolation
- Legacy cleanup — remove old workflow-engine from `packages/api`
- Contracts migration — move to Effect Schema
- Concurrency model — Fiber-based execution supervisor
