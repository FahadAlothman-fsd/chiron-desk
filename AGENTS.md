# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-06
**Commit:** 7591e0cae
**Branch:** main

## OVERVIEW

Multi-agent orchestration platform for AI-driven software development. Transforms BMAD methodology into visual workflow execution with desktop app (React + Tauri), tRPC API, PostgreSQL persistence.

## STRUCTURE

```
chiron/
├── apps/
│   ├── web/              # Desktop app (React 19 + Tauri v2)
│   └── server/           # Hono + tRPC server (entry: src/index.ts)
├── packages/
│   ├── api/              # tRPC routers, workflow engine, AI services
│   ├── auth/             # Better-Auth integration
│   ├── db/               # Drizzle ORM schema (PostgreSQL)
│   └── scripts/          # Seed scripts, DB utilities
├── _bmad/                # BMAD methodology (agents, workflows, templates)
└── docs/                 # Architecture, epics, design specs
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add workflow step type | `packages/api/src/services/workflow-engine/step-handlers/` | Create handler + register in step-registry.ts |
| Add tRPC endpoint | `packages/api/src/routers/` | Add to sub-router, auto-merged via index.ts |
| Add DB table | `packages/db/src/schema/` | Export from index.ts, run `bun db:push` |
| Add UI component | `apps/web/src/components/` | shadcn/ui base in `ui/`, workflows in `workflows/` |
| Add route | `apps/web/src/routes/` | TanStack Router file-based, auto-generates routeTree.gen.ts |
| Seed data | `packages/scripts/src/seeds/` | Export from seed.ts, run `bun db:seed` |
| Configure AI model | `packages/api/src/services/mastra/` | model-loader.ts for providers |

## CONVENTIONS

- **Formatter**: Biome (NOT ESLint/Prettier) - TAB indent, double quotes
- **Style**: shadcn/ui 'new-york' style, custom registries (@kibo-ui, @aceternity, @animate-ui)
- **DB**: Drizzle `db:push` for dev (NOT migrations), PostgreSQL port 5434
- **Testing**: Bun Test, co-located `*.test.ts` files, happy-dom for React
- **Imports**: Path alias `@/` for src directory
- **Types**: Strict TS (noUncheckedIndexedAccess, noUnusedLocals)

## ANTI-PATTERNS (THIS PROJECT)

- **ESLint/Prettier**: Use Biome only - `bun check` for lint+format
- **Direct DB migrations**: Use `bun db:push` during development
- **Manual route tree**: Never edit routeTree.gen.ts - auto-generated
- **Port 5432**: PostgreSQL runs on 5434 to avoid conflicts
- **as any / @ts-ignore**: Strict types enforced

## UNIQUE STYLES

- **Workflow steps**: Handler pattern with registry lookup, NOT switch statements
- **AI integration**: Vercel AI SDK + Mastra for agents, @ax-llm/ax for optimization
- **Variable resolution**: Handlebars templates in workflow configs
- **Event-driven**: EventBus for workflow lifecycle (started/completed/error)

## COMMANDS

```bash
# Development
bun dev              # All services (web:3001, server:3000)
bun dev:native       # Tauri desktop app
bun check            # Biome lint + format

# Database
bun db:start         # Start PostgreSQL container (port 5434)
bun db:push          # Push schema changes
bun db:seed          # Seed with BMAD data
bun db:studio        # Drizzle Studio UI

# Testing
bun test             # All tests
bun test:db          # Database tests only
bun test:scripts     # Seed script tests
```

## NOTES

- Desktop app uses Tauri v2 - Rust layer in `apps/web/src-tauri/`
- BMAD methodology docs in `_bmad/` - agents, workflows, templates
- Workflow execution uses MAX_STEP_EXECUTIONS=100 to prevent infinite loops
- Multiple AI providers via OpenRouter + direct Anthropic/OpenAI SDKs
