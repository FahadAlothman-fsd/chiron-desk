# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-08
**Commit:** e75b2f9df
**Branch:** feat/effect-migration

## OVERVIEW

Multi-agent orchestration platform for AI-driven software development. Transforms BMAD methodology into visual workflow execution with a desktop app (React 19 + Tauri v2), tRPC API, and PostgreSQL persistence. Supports concurrent workflow executions via Effect Fibers — users can brainstorm, plan, and implement in parallel.

## STRUCTURE

```
chiron/
├── apps/
│   ├── web/                    # Desktop app (React 19 + Tauri v2)
│   └── server/                 # Hono + tRPC server (entry: src/index.ts)
├── packages/
│   ├── contracts/              # Shared Effect Schema types across all packages
│   ├── workflow-engine/        # Effect-based workflow execution (6 step handlers)
│   ├── agent-runtime/          # Dual AI adapter (Chiron + OpenCode agents)
│   ├── tooling-engine/         # Central side-effect executor + approval flow [planned]
│   ├── event-bus/              # Cross-module event distribution [stub]
│   ├── variable-service/       # Workflow variable resolution & state [stub]
│   ├── template-engine/        # Handlebars template rendering for AI prompts [stub]
│   ├── provider-registry/      # AI provider catalog, credentials, usage tracking [stub]
│   ├── ax-engine/              # DSPy-style prompt optimization via @ax-llm/ax [stub]
│   ├── sandbox-engine/            # Git worktree isolation for agent execution [stub]
│   ├── api/                    # tRPC routers + Effect service composition layer
│   ├── db/                     # Drizzle ORM schema (PostgreSQL, 15+ tables)
│   ├── auth/                   # Better-Auth integration
│   └── scripts/                # Seed scripts, BMAD data import
├── _bmad/                      # BMAD methodology (agents, workflows, templates)
├── _bmad-output/               # Generated planning artifacts (PRD, epics, etc.)
├── .sisyphus/                  # Plans & drafts from development sessions
├── docs/                       # Architecture specs, design docs
└── academic_reports/           # Thesis-related documents
```

## WHERE TO LOOK

| Task                      | Location                                              | Notes                                                            |
| ------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| Add workflow step handler | `packages/workflow-engine/src/handlers/`               | Create handler + register in step-registry service               |
| Add workflow schema       | `packages/workflow-engine/src/schema/`                 | Effect Schema definitions for step configs                       |
| Add/modify agent adapter  | `packages/agent-runtime/src/adapters/`                 | Chiron (AI SDK) or OpenCode (SDK) adapters                       |
| Add tRPC endpoint         | `packages/api/src/routers/`                            | Sub-routers: workflows, agents, projects, models, settings, opencode |
| Add DB table              | `packages/db/src/schema/`                              | Export from index.ts, run `bun db:push`                          |
| Add UI component          | `apps/web/src/components/`                             | shadcn/ui base in `ui/`, workflows in `workflows/`               |
| Add route                 | `apps/web/src/routes/`                                 | TanStack Router file-based, auto-generates routeTree.gen.ts      |
| Seed data                 | `packages/scripts/src/seeds/`                          | Export from seed.ts, run `bun db:seed`                           |
| Shared contract types     | `packages/contracts/src/`                              | AgentKind, AgentRunParams, stream events, tool I/O types         |
| Legacy workflow code      | `packages/api/src/services/workflow-engine/`           | LEGACY — being migrated to `packages/workflow-engine/`           |

## ARCHITECTURE

### Execution Model

- **Concurrent executions**: Each workflow execution runs as its own Effect Fiber under a supervisor
- **Sequential steps**: Within an execution, steps run sequentially (while-loop)
- **Concurrent within steps**: Agent steps fork child Fibers for AI streaming + tool calls
- **Sub-workflows**: `invoke` steps fork child Fiber executions (Fibers within Fibers)
- **Clean interruption**: Effect Scope ensures cancelling a workflow interrupts all child Fibers

### 6 Step Types

| Step      | Purpose                          | Child Fibers? |
| --------- | -------------------------------- | ------------- |
| `form`    | Collect user input               | No — Deferred |
| `agent`   | Run AI agent (chiron or opencode)| Yes — streaming + tool calls |
| `action`  | Execute side effects             | Yes — tooling-engine + approval |
| `invoke`  | Call sub-workflow                 | Yes — child execution Fiber |
| `display` | Show results to user             | No |
| `branch`  | Conditional routing              | No |

### 2 Agent Kinds

| Kind        | Runtime                | Capabilities                    |
| ----------- | ---------------------- | ------------------------------- |
| `chiron`    | Vercel AI SDK          | Read-only, multi-provider, analysis/planning |
| `opencode`  | OpenCode SDK           | Full filesystem access, code writing, tools  |

### Effect Primitives Used

| Primitive     | Where                                                    |
| ------------- | -------------------------------------------------------- |
| `Fiber.fork`  | Spawn workflow executions, agent streams, tool calls     |
| `Scope`       | Lifecycle management — interrupt cascades to children    |
| `Stream`      | Agent responses, event feeds, SSE to frontend            |
| `PubSub`      | Event bus backbone (sliding window, 256 buffer)          |
| `Deferred`    | Approval rendezvous, user input awaiting                 |
| `Queue`       | Rate limiting concurrent executions                      |
| `FiberRef`    | Propagate execution context (executionId, userId)        |
| `Ref`         | Active executions map: HashMap<executionId, Fiber>       |
| `Schema`      | Decode boundaries at package edges                       |
| `TaggedError` | Typed error channels across all packages                 |

### Dependency Flow

```
apps/web ──> @chiron/api ──> @chiron/workflow-engine ──> @chiron/agent-runtime
                │                      │                          │
                ├──> @chiron/auth      ├──> @chiron/event-bus     ├──> OpenCode SDK
                │         │            ├──> @chiron/variable-svc  └──> Vercel AI SDK
                │         v            └──> @chiron/tooling-engine
                │    @chiron/db                    │
                │                                  ├──> @chiron/sandbox-engine
                └──> @chiron/scripts               └──> @chiron/provider-registry
                                                              │
               All packages ──> @chiron/contracts              └──> @chiron/ax-engine
```

## CONVENTIONS

- **Formatter**: OXC (oxlint + oxfmt) — TAB indent, double quotes
- **Style**: shadcn/ui 'new-york' style, custom registries (@kibo-ui, @aceternity, @animate-ui)
- **DB**: Drizzle `db:push` for dev (NOT migrations), PostgreSQL port 5434
- **Testing**: Bun Test, co-located `*.test.ts` files, happy-dom for React
- **Imports**: Path alias `@/` for src directory
- **Types**: Strict TS (noUncheckedIndexedAccess, noUnusedLocals)
- **Services**: Effect-TS Services + Layers, decode boundaries at package edges
- **Errors**: Data.TaggedError for typed error channels
- **Schemas**: Effect Schema (migrating from Zod) — define in contracts, reuse at boundaries

## ANTI-PATTERNS (THIS PROJECT)

- **ESLint/Prettier/Biome**: Use OXC only — `bun check` for lint+format
- **Direct DB migrations**: Use `bun db:push` during development
- **Manual route tree**: Never edit routeTree.gen.ts — auto-generated
- **Port 5432**: PostgreSQL runs on 5434 to avoid conflicts
- **as any / @ts-ignore**: Strict types enforced
- **Zod in new code**: Use Effect Schema — Zod is legacy, being migrated out
- **Switch statements for handlers**: Use registry pattern with lookup maps
- **Direct filesystem/git in agents**: All side effects go through tooling-engine

## UNIQUE STYLES

- **Workflow steps**: Handler pattern with registry lookup, NOT switch statements
- **AI integration**: Vercel AI SDK + Effect for Chiron agents, OpenCode SDK for code agents
- **Variable resolution**: Handlebars templates in workflow configs
- **Event-driven**: PubSub-based EventBus for workflow lifecycle events
- **Concurrency**: Effect Fibers for parallel workflow executions, Deferred for rendezvous
- **Approval flow**: DB-backed + in-memory Deferred sync, trust x risk matrix

## COMMANDS

```bash
# Development
bun dev              # All services (web:3001, server:3000)
bun dev:native       # Tauri desktop app
bun check            # OXC lint + format check

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

- Desktop app uses Tauri v2 — Rust layer in `apps/web/src-tauri/`
- BMAD methodology docs in `_bmad/` — agents, workflows, templates
- Workflow execution uses MAX_STEP_EXECUTIONS=100 to prevent infinite loops
- Multiple AI providers via OpenRouter + direct Anthropic/OpenAI SDKs
- Legacy workflow-engine code in `packages/api/src/services/workflow-engine/` is being migrated to `packages/workflow-engine/` — both exist during transition
- Development plans and session drafts tracked in `.sisyphus/`
