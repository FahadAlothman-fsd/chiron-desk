# Chiron Reset Baseline Checklist (oRPC + Effect)

**Purpose:** establish a clean, deterministic implementation baseline before sprint planning.

## Frontend Reference Documents

- `_bmad-output/planning-artifacts/ux-design-specification.md` (canonical)
- `_bmad-output/planning-artifacts/design/ux-patterns-index.md`
- `_bmad-output/planning-artifacts/design/ux-pattern-structured-exploration-lists.md`

Historical references (non-canonical, use only for legacy context):

- `docs/design/design-decisions.md`
- `docs/design/step-execution-layout-system.md`
- `docs/design/step-execution-components.md`
- `docs/design/step-execution-wireframes.md`

## 1) Canonical Decisions (Lock First)

- [ ] API layer is **oRPC** for all frontend <-> backend communication (commands, queries, streams).
- [ ] Realtime transport is **SSE-first** for current sprint scope.
- [ ] WebSocket support is deferred and optional (future enhancement, no current dependency on WS).
- [ ] Backend architecture is **Effect-first** (service contracts with `Tag`/`Layer`, typed errors, decode-at-boundary).
- [ ] Persistence baseline is **SQLite + Drizzle**.
- [ ] Frontend graph/canvas dependency includes **React Flow**.
- [ ] Typography baseline is **Commit Mono + Geist Pixel (all 5 variants)**.

## 2) Repo Reset Scope

- [ ] Keep only canonical documentation and planning folders during reset:
  - `_bmad/`
  - `_bmad-output/`
  - `docs/`
  - `academic_reports/`
  - `.sisyphus/`
- [ ] Recreate implementation workspace from Better-T-Stack after reset.

## 3) Dependency Baseline Map

### Workspace / Root

- [ ] `typescript`
- [ ] `turbo`
- [ ] `effect`
- [ ] `@effect/schema`
- [ ] lint/format toolchain chosen and locked
- [ ] test runner chosen and locked

### Server / API

- [ ] `hono`
- [ ] `@orpc/server`
- [ ] `@orpc/client` (for internal typed tests/smoke paths where needed)
- [ ] SSE response pipeline support (native Hono/EventSource-compatible stream handling)
- [ ] auth package(s) selected and locked

### Frontend / Web

- [ ] React app scaffold from Better-T-Stack
- [ ] oRPC client integration for all API communication
- [ ] TanStack Query integration for async state
- [ ] **React Flow** installed and wired for graph/state projections
- [ ] shadcn baseline confirmed from Better-T-Stack scaffold
- [ ] design token system mapped to Tailwind + CSS variables

### Shared / Data

- [ ] `drizzle-orm`
- [ ] `drizzle-kit`
- [ ] one SQLite driver selected and locked
- [ ] shared contracts package uses Effect Schema as canonical boundary contract source

## 4) Frontend Foundation Blueprint

### Design Tokens

- [ ] Define and freeze token groups: `color`, `typography`, `spacing`, `radius`, `shadow`, `z-index`, `motion`.
- [ ] Map tokens to CSS variables and Tailwind theme extension.
- [ ] Define semantic color roles (not raw color usage in component code).
- [ ] Define motion durations/easings for page, panel, and list transitions.

### Font Setup

- [ ] Bundle and load **Commit Mono** for primary product typography usage.
- [ ] Bundle and load **Geist Pixel (all 5 variants)** for stylistic/system contexts.
- [ ] Define explicit fallbacks in CSS.
- [ ] Verify font rendering on Linux and macOS dev environments.

### shadcn Baseline

- [ ] Standardize component variant conventions (`size`, `intent`, `tone`, `state`).
- [ ] Standardize focus, disabled, loading, error states across primitives.
- [ ] Freeze base primitives before story implementation starts.

## 5) Package Skeleton Strategy (Do Now)

**Decision:** create module skeletons now; implement contracts/logic in stories.

- [ ] Create package skeletons with empty-but-compiling exports:
  - `packages/contracts`
  - `packages/api`
  - `packages/db`
  - `packages/auth`
  - `packages/workflow-engine`
  - `packages/agent-runtime`
  - `packages/tooling-engine`
  - `packages/event-bus`
  - `packages/variable-service`
  - `packages/template-engine`
  - `packages/provider-registry`
  - `packages/sandbox-engine`
  - `packages/ax-engine`
  - `packages/scripts`
- [ ] Add package-local `package.json`, `tsconfig.json`, and `src/index.ts` for each.
- [ ] Establish dependency direction rules (no internal cross-module imports; consume public contract boundaries only).

## 6) Expected Repo Structure After Setup

```text
chiron/
├─ apps/
│  ├─ web/                        # React + shadcn + tokens + fonts + React Flow + oRPC client
│  └─ server/                     # Hono + oRPC handlers + SSE streams
├─ packages/
│  ├─ contracts/
│  ├─ api/
│  ├─ db/
│  ├─ auth/
│  ├─ workflow-engine/
│  ├─ agent-runtime/
│  ├─ tooling-engine/
│  ├─ event-bus/
│  ├─ variable-service/
│  ├─ template-engine/
│  ├─ provider-registry/
│  ├─ sandbox-engine/
│  ├─ ax-engine/
│  └─ scripts/
├─ docs/
├─ _bmad/
├─ _bmad-output/
├─ academic_reports/
└─ .sisyphus/
```

## 7) Sprint-Readiness Gates (Pass/Fail)

- [ ] `install` passes at workspace level.
- [ ] `typecheck` passes across all apps/packages.
- [ ] `lint/format` passes with zero errors.
- [ ] `test` baseline passes.
- [ ] Smoke path 1: one typed oRPC command/query from web to server works end-to-end.
- [ ] Smoke path 2: one SSE stream from server to web renders live updates.
- [ ] Docs alignment check: no stale tRPC assumptions remain in active canonical docs.

## 8) Go To Sprint Planning

Proceed to `/bmad-bmm-sprint-planning` only when all items in Sections 1-7 are checked.
