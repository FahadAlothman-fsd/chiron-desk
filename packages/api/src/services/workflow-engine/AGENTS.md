# LEGACY WORKFLOW ENGINE

> **STATUS: LEGACY — Being migrated to `packages/workflow-engine/`**
>
> This directory contains the ORIGINAL workflow engine that lived inside `@chiron/api`.
> The new standalone package `@chiron/workflow-engine` replaces this with proper Effect Services, Layers, and decode boundaries.
>
> **Do NOT add new features here.** All new work goes to `packages/workflow-engine/`.
> This code will be removed once the API router switchover is complete.

## WHAT'S HERE (for reference during migration)

```
workflow-engine/
├── step-handlers/                        # OLD handler implementations
│   ├── user-form-handler.ts              # → migrated to workflow-engine/handlers/form-handler.ts
│   ├── sandboxed-agent-handler.ts        # → migrated to workflow-engine/handlers/agent-handler.ts
│   ├── execute-action-effect-handler.ts  # → migrated to workflow-engine/handlers/action-handler.ts
│   ├── invoke-workflow-effect-handler.ts # → migrated to workflow-engine/handlers/invoke-handler.ts
│   ├── display-output-effect-handler.ts  # → migrated to workflow-engine/handlers/display-handler.ts
│   └── branch-effect-handler.ts          # → migrated to workflow-engine/handlers/branch-handler.ts
├── effect/                               # Effect service layer (partially migrated)
│   ├── executor.ts                       # → workflow-engine/services/workflow-engine.ts
│   ├── runtime-composition.ts            # API runtime adapter (still active — bridges old ↔ new)
│   ├── decode-boundary.ts                # → workflow-engine/services/decode.ts
│   ├── step-registry.ts                  # → workflow-engine/services/step-registry.ts
│   ├── event-bus.ts (.d.ts)              # → workflow-engine/services/event-bus.ts
│   ├── execution-context.ts              # → workflow-engine/services/execution-context.ts
│   ├── tool-approval-gateway.ts (.d.ts)  # → workflow-engine/services/approval-gateway.ts
│   ├── tooling-engine.ts                 # → will move to packages/tooling-engine/
│   ├── tool-builder.ts                   # → will move to packages/tooling-engine/
│   ├── variable-service.ts               # → workflow-engine/services/variable-service.ts
│   ├── config-service.ts                 # API-level config (may stay in api)
│   ├── database-service.ts               # API-level DB access (stays in api)
│   ├── chat-service.ts                   # Chat persistence (stays in api)
│   ├── approval-service.ts               # DB-backed approval (stays in api or → tooling-engine)
│   ├── error-recovery.ts                 # Stream error handling
│   ├── errors.ts / error-utils.ts        # Error types
│   └── index.ts                          # Barrel export
├── event-bus.ts                          # Old singleton event bus → replaced by Effect PubSub
├── execution-context.ts                  # Old execution context → replaced by Effect service
├── state-manager.ts                      # State persistence helpers
├── variable-resolver.ts                  # Handlebars template resolution
└── workflow-loader.ts                    # DB fetch + validation
```

## MIGRATION STATUS

| Component | Old Location | New Location | Status |
|---|---|---|---|
| 6 step handlers | `step-handlers/` | `packages/workflow-engine/src/handlers/` | Migrated |
| Step registry | `effect/step-registry.ts` | `packages/workflow-engine/src/services/` | Migrated |
| Workflow executor | `effect/executor.ts` | `packages/workflow-engine/src/services/` | Migrated |
| Event bus | `event-bus.ts` + `effect/event-bus.ts` | `packages/workflow-engine/src/services/` | Migrated |
| Approval gateway | `effect/tool-approval-gateway.ts` | `packages/workflow-engine/src/services/` | Migrated |
| Decode boundary | `effect/decode-boundary.ts` | `packages/workflow-engine/src/services/` | Migrated |
| Runtime composition | `effect/runtime-composition.ts` | — | **Still active** (API adapter) |
| Tool builder | `effect/tool-builder.ts` | `packages/tooling-engine/` | **Pending** |
| Tooling engine | `effect/tooling-engine.ts` | `packages/tooling-engine/` | **Pending** |
| Config/DB/Chat services | `effect/` | Stays in `@chiron/api` | N/A |

## WHAT STILL NEEDS TO HAPPEN

1. Switch API router (`packages/api/src/routers/workflows.ts`) from legacy executor to `@chiron/workflow-engine` runtime
2. Extract tooling-related code to `@chiron/tooling-engine`
3. Remove this directory once all consumers are switched over
