# Chiron Backend Stack Lock v1 (Week 6)

Date: 2026-02-18
Status: Proposed lock for backend implementation phase
Scope: Backend only (frontend deferred until backend spine is stable)

## 1) Backend Platform Lock

- Runtime/monorepo: Bun + Turborepo
- Server transport: Hono (SSE/streaming endpoints are first-class)
- Typed API: oRPC
- Core orchestration/runtime: Effect
- Agent runtimes: AI SDK + OpenCode SDK
- Persistence: SQLite + Drizzle
- Auth: Better-Auth
- Prompt templating: Handlebars

## 2) Package/Module Lock (Backend)

### Keep and implement now

- `apps/server`
- `packages/api`
- `packages/workflow-engine`
- `packages/agent-runtime`
- `packages/contracts`
- `packages/db`
- `packages/auth`
- `packages/scripts`

### Keep package boundaries, implement incrementally

- `packages/methodology-engine` (new; add now)
- `packages/tooling-engine`
- `packages/sandbox-engine`
- `packages/variable-service`
- `packages/template-engine`
- `packages/provider-registry`
- `packages/event-bus`

### Defer advanced behavior (keep placeholders)

- `packages/ax-engine` advanced optimization loops

## 3) Dependency Selection by Package

### apps/server

Required:
- `hono`
- `@hono/orpc-server`
- `@orpc/server`
- `ai`
- `@openrouter/ai-sdk-provider`
- `@opencode-ai/sdk`
- `@modelcontextprotocol/sdk`
- `better-auth`
- `dotenv`

Workspace deps:
- `@chiron/api`, `@chiron/auth`, `@chiron/db`

### packages/api

Required:
- `effect`, `@effect/platform`
- `hono`
- `@orpc/server`, `@orpc/client`
- `drizzle-orm`

Workspace deps:
- `@chiron/agent-runtime`, `@chiron/contracts`, `@chiron/db`, `@chiron/auth`

Notes:
- Remove direct `simple-git` usage from API layer.

### packages/workflow-engine

Required:
- `effect`
- `handlebars`

Workspace deps:
- `@chiron/agent-runtime` (and later methodology/tooling service tags)

### packages/agent-runtime

Required:
- `effect`
- `ai`
- `@ai-sdk/openai`
- `@ai-sdk/anthropic`
- `@openrouter/ai-sdk-provider`
- `@opencode-ai/sdk`
- `ai-sdk-provider-opencode-sdk`

Workspace deps:
- `@chiron/contracts`

### packages/contracts

Required:
- `effect` (Effect Schema contracts)

### packages/db

Required:
- `drizzle-orm`
- SQLite driver package (choose one and lock):
  - `better-sqlite3` (recommended for local desktop/runtime simplicity)
  - OR `@libsql/client` (if remote/libSQL compatibility needed)

Remove for backend lock:
- `pg`
- `@types/pg`
- Postgres-only scripts/docker assumptions

### packages/auth

Required:
- `better-auth`
- `dotenv`

Workspace deps:
- `@chiron/db`

### packages/sandbox-engine

Required:
- `effect`
- `simple-git` (adapter implementation for v1)

Notes:
- Git operations should be called through sandbox/tooling boundary only.

### packages/tooling-engine

Required:
- `effect`

Workspace deps:
- `@chiron/contracts`, `@chiron/sandbox-engine`, `@chiron/provider-registry`, `@chiron/variable-service`

### packages/variable-service

Required:
- `effect`

Workspace deps:
- `@chiron/contracts`

### packages/template-engine

Required:
- `effect`
- `handlebars`

Workspace deps:
- `@chiron/contracts`

### packages/provider-registry

Required:
- `effect`

Workspace deps:
- `@chiron/contracts`, `@chiron/db`

### packages/event-bus

Required:
- `effect`

Workspace deps:
- `@chiron/contracts`

### packages/methodology-engine (new)

Required:
- `effect`

Workspace deps:
- `@chiron/contracts`, `@chiron/db`, `@chiron/variable-service`

## 4) Explicit Non-Goals for Backend Lock

- No additional framework experiments.
- No second DB track (SQLite only for current horizon).
- No direct git calls outside sandbox-engine.
- No third gate type (only start/completion).

## 5) Immediate Implementation Order

1. Lock DB driver choice for SQLite in `packages/db`.
2. Add `packages/methodology-engine` and wire contracts.
3. Move git adapter dependency/usage to `packages/sandbox-engine`.
4. Wire Hono streaming endpoints in `apps/server` + API bridge.
5. Complete workflow-engine -> tooling/sandbox/provider/variable/tag boundaries.

## 6) Dependency Boundary Correction (Critical)

The prior draft should be interpreted with this correction:

- `@chiron/api` should not import deep runtime internals from `@chiron/agent-runtime/*`.
- `@chiron/api` composes services at the boundary and talks to stable service interfaces.
- Runtime/provider decisions should not be split between API and runtime internals.

### Recommended package dependency matrix

- `@chiron/contracts`
  - depends on: none
  - owns: Effect schemas/types and service contracts

- `@chiron/db`
  - depends on: `@chiron/contracts`
  - owns: persistence implementation

- `@chiron/provider-registry`
  - depends on: `@chiron/contracts`, `@chiron/db`
  - owns: model/provider catalog, resolution policy, credentials, usage accounting policy, fallback policy

- `@chiron/agent-runtime`
  - depends on: `@chiron/contracts`, `@chiron/provider-registry`
  - owns: execution adapters (AI SDK/OpenCode), streaming runtime behavior

- `@chiron/ax-engine`
  - depends on: `@chiron/contracts`, `@chiron/provider-registry`
  - owns: optimization logic and recommendation generation

- `@chiron/workflow-engine`
  - depends on: `@chiron/contracts`, `@chiron/agent-runtime`, `@chiron/tooling-engine`, `@chiron/variable-service`, `@chiron/event-bus`
  - owns: step orchestration and transition lifecycle

- `@chiron/api`
  - depends on: `@chiron/contracts`, `@chiron/workflow-engine`, `@chiron/auth`, `@chiron/db`
  - owns: transport/adapters only (Hono/oRPC/SSE), not runtime internals

### Provider dependency ownership

- Provider-registry should own provider SDK dependencies for model families it resolves (AI SDK provider adapters and resolution metadata).
- OpenCode SDK remains primarily in `agent-runtime` as executor runtime dependency.
- AX engine should consume provider-registry resolution; do not duplicate provider policy in ax-engine.
