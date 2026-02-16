# @chiron/api

API composition layer for Chiron. Exposes typed routers and wires runtime services to frontend and desktop clients.

## What This Package Contains

- `src/routers/` - tRPC routers (`workflows`, `projects`, `agents`, `models`, `settings`, `opencode`)
- `src/services/` - service integrations used by routers
- `src/services/workflow-engine/` - legacy workflow-engine bridge paths during migration
- `src/context.ts` - request context construction
- `src/index.ts` - root API exports

## Current State

- Active and used by `apps/server`
- Still contains legacy workflow-engine integration code in `src/services/workflow-engine/`
- Target direction is thin API orchestration over standalone packages (`@chiron/workflow-engine`, `@chiron/agent-runtime`, `@chiron/tooling-engine`)

## Where To Change Things

- Add endpoint: `src/routers/`
- Add service integration: `src/services/`
- Workflow runtime logic: prefer standalone packages over adding new logic under legacy `src/services/workflow-engine/`
