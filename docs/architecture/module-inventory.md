# Chiron Module Inventory

**Last Updated:** 2026-03-16  
**Status:** Canonical module-level inventory

This document maps each package to its current package-level reality. It is useful for inventory and ownership, but not the final authority for Epic 3 implementation readiness.

## Packages

| Package | State | What Exists Now | Current authority |
| --- | --- | --- | --- |
| `@chiron/workflow-engine` | Scaffold package, architecture locked | Package exists, but `packages/workflow-engine/src/index.ts` is still a stub. Runtime behavior still lives elsewhere while the package split is in progress. | `docs/architecture/chiron-module-structure.md`, runtime/technical docs under `docs/architecture/workflow-engine/`, and `docs/architecture/epic-3-authority.md` for the boundary between runtime package scope and methodology design-time contracts |
| `@chiron/agent-runtime` | Scaffold package, architecture locked | Package exists, but `packages/agent-runtime/src/index.ts` is still a stub. Runtime adapter behavior is not yet implemented in this standalone package. | `docs/architecture/chiron-module-structure.md`, `docs/architecture/methodology-pages/workflow-editor/agent-step.md` |
| `@chiron/api` | Implemented with migration pressure | oRPC routers and service composition exist, but some paths still reflect migration-era layering. | code in `packages/api/`, plus `docs/architecture/chiron-module-structure.md` |
| `@chiron/db` | Implemented | Drizzle schema, auth/workflow/project/chat/approval/optimization tables exist in the package. | code in `packages/db/` |
| `@chiron/auth` | Implemented (thin) | Better Auth wiring and DB adapter exist in the package. | code in `packages/auth/` |
| `@chiron/scripts` | Implemented | Seed and verification scripts exist in the package. | code in `packages/scripts/` |
| `@chiron/contracts` | Partial, active foundation | Shared contract package exists, but the repo is still migrating toward Effect-native schema ownership. | `docs/architecture/chiron-module-structure.md`, code in `packages/contracts/` |
| `@chiron/tooling-engine` | Scaffold package | Package exists, but `src/index.ts` is still a stub. | `docs/architecture/modules/README.md` |
| `@chiron/event-bus` | Scaffold package | Package exists, but `src/index.ts` is still a stub. Event-bus behavior is still inline elsewhere. | `docs/architecture/modules/event-bus.md` |
| `@chiron/variable-service` | Scaffold package | Package exists, but `src/index.ts` is still a stub. Variable-service behavior is still inline elsewhere. | `docs/architecture/modules/variable-service.md` |
| `@chiron/template-engine` | Scaffold package | Package exists, but `src/index.ts` is still a stub. | `docs/architecture/modules/template-engine.md` |
| `@chiron/provider-registry` | Scaffold package | Package exists, but `src/index.ts` is still a stub. Provider and model handling are ahead in docs, not package code. | `docs/architecture/modules/provider-registry.md` |
| `@chiron/sandbox-engine` | Scaffold package | Package exists, but `src/index.ts` is still a stub. | `docs/architecture/modules/sandbox-engine.md` |
| `@chiron/ax-engine` | Scaffold package, docs ahead of code | Package exists, but `src/index.ts` is still a stub. AX policy and architecture are documented, while implementation remains scaffold-only. | `docs/architecture/modules/ax-engine.md` |

## Notes

- Use this file as an inventory, not as the final readiness gate for Epic 3 work.
- If a package is scaffold-only, say so directly and point to the stable architecture doc that defines intended scope.
- For Epic 3 routing and promotion status, use `docs/architecture/epic-3-authority.md`.

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
