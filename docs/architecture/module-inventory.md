# Chiron Module Inventory

**Last Updated:** 2026-02-09  
**Status:** Canonical module-level inventory

This document maps each package to its current implementation state, owned responsibilities, and next documentation source.

## Packages

| Package | State | What Exists Now | Source Of Truth |
| --- | --- | --- | --- |
| `@chiron/workflow-engine` | Implemented (core) | 6 step handlers, schemas, execution loop, event bus, variable service, approval gateway | `packages/workflow-engine/AGENTS.md` |
| `@chiron/agent-runtime` | Implemented (core) | Chiron + OpenCode adapters, streaming bridge, session relay, tooling bridge placeholder | `packages/agent-runtime/AGENTS.md` |
| `@chiron/api` | Implemented + migration bridge | tRPC routers, service composition, legacy workflow-engine integration paths | `packages/api/AGENTS.md` |
| `@chiron/db` | Implemented | Drizzle schema, auth/workflow/project/chat/approval/optimization tables | `packages/db/AGENTS.md` + `packages/db/src/schema/AGENTS.md` |
| `@chiron/auth` | Implemented (thin) | Better-Auth wiring + Drizzle adapter | `packages/auth/AGENTS.md` |
| `@chiron/scripts` | Implemented | Seed pipelines, verification scripts, migration helpers | `packages/scripts/AGENTS.md` |
| `@chiron/contracts` | Partial (types only) | Shared TypeScript types used across runtime/api/engine | `packages/contracts/AGENTS.md` |
| `@chiron/tooling-engine` | Planned (scaffold) | Package skeleton + finalized implementation plan | `packages/tooling-engine/AGENTS.md` |
| `@chiron/event-bus` | Planned (scaffold) | Placeholder package; inline event bus exists in workflow-engine | `packages/event-bus/AGENTS.md` |
| `@chiron/variable-service` | Planned (scaffold) | Placeholder package; inline variable service exists in workflow-engine | `packages/variable-service/AGENTS.md` |
| `@chiron/template-engine` | Planned (scaffold) | Placeholder package for template/prompt composition boundary | `packages/template-engine/AGENTS.md` |
| `@chiron/provider-registry` | Planned (scaffold) | Provider/model handling currently spread across api + agent-runtime | `packages/provider-registry/AGENTS.md` |
| `@chiron/sandbox-engine` | Planned (scaffold) | Placeholder package for execution isolation and git primitives | `packages/sandbox-engine/AGENTS.md` |
| `@chiron/ax-engine` | Planned (scaffold) | Placeholder package; optimization schema + prototype work exists elsewhere | `packages/ax-engine/AGENTS.md` |

## Notes

- Module-level package docs live next to packages as `packages/<name>/AGENTS.md`.
- `AGENTS.md` at repo root stays the project-level canonical map.
- If a package is scaffold-only, document intended scope and dependencies explicitly to prevent drift.

## Detailed Design Docs For Scaffold Modules

- `docs/architecture/modules/event-bus.md`
- `docs/architecture/modules/variable-service.md`
- `docs/architecture/modules/template-engine.md`
- `docs/architecture/modules/provider-registry.md`
- `docs/architecture/modules/sandbox-engine.md`
- `docs/architecture/modules/ax-engine.md`

## Cross-Cutting Design Docs

- `docs/architecture/workflow-versioning.md`
- `docs/architecture/git-context-variables.md`
- `docs/architecture/branching-strategy.md`
- `docs/architecture/workflow-diagram-ui-react-flow.md`
