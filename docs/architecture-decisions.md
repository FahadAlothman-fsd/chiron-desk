# Chiron - Architectural Decisions

**Project:** chiron
**Date:** 2025-11-03
**Phase:** 3-Solutioning (Architecture Workflow)
**Status:** In Progress

---

## Decision Log

### Decision #1: Database ORM ✅ DECIDED

**Choice:** Drizzle ORM
**Version:** 0.44.7 (latest stable, November 2025)
**Date Decided:** 2025-11-03

**Rationale:**
- TypeScript-first ORM with excellent type inference
- Native PostgreSQL support via `postgres.js` or `pg` driver
- Full Bun runtime compatibility verified
- Lightweight (~7.4kb minified+gzipped, zero dependencies)
- SQL-like query builder (closer to SQL than Prisma's abstraction)
- Already specified in PRD as preferred ORM

**Implementation:**
- Driver: `postgres.js` (recommended for Bun)
- Schema definitions: `drizzle-orm/pg-core`
- Migrations: `drizzle-kit push` for MVP development (instant schema sync)
  - Switch to `drizzle-kit generate` + `drizzle-kit migrate` before production
- Location: `packages/database/` in monorepo

**Applies to:**
- Epic 1: Core Infrastructure & Database Foundation
- All database operations (FR001-FR005, FR032-FR036)

**Alternatives Considered:**
- Prisma: Too abstracted from SQL, heavier bundle size
- TypeORM: Less TypeScript-native, older patterns
- Kysely: More SQL-focused but less ecosystem support

---

### Decision #2: API Communication Pattern ✅ DECIDED

**Choice:** tRPC with Hono
**Version:** @trpc/server latest (to be verified during implementation)
**Date Decided:** 2025-11-03

**Rationale:**
- End-to-end type safety between `apps/web` and `apps/api`
- Automatic TypeScript inference (no code generation needed)
- Shared types via monorepo workspace dependencies
- Hono runs tRPC adapter + SSE handlers side-by-side
- 45 functional requirements with complex domain = type safety critical
- Monorepo structure benefits from shared types

**Implementation:**
- tRPC router definitions: `apps/api/src/trpc/routers/`
- React Query integration on frontend for caching/mutations
- Hono middleware: `@trpc/server/adapters/fetch` or Hono-specific adapter
- Shared types: `packages/shared/src/types/`

**Applies to:**
- All frontend ↔ backend communication
- FR006-FR045 (all API-driven features)

**Alternatives Considered:**
- REST with Hono: Simpler but no automatic type safety
- GraphQL: Too heavy for single-client MVP, over-engineered

---

### Decision #3: Real-Time Updates ✅ DECIDED

**Choice:** Server-Sent Events (SSE) + tRPC HTTP
**Date Decided:** 2025-11-03

**Architecture:**
- **Server → Client:** SSE via Hono's `streamSSE` helper (from `hono/streaming`)
- **Client → Server:** tRPC mutations (HTTP POST)

**Rationale:**
- One-way real-time updates sufficient for single-user MVP
- Automatic reconnection (browser handles it)
- Simpler than WebSockets for notification-heavy architecture
- Works with FR042 throttling requirement (max 2 updates/second)
- User responses via tRPC mutations keep it simple
- No collaborative multi-user editing in MVP scope

**Use Cases:**
- Agent status changes (idle → active → completed)
- Workflow progress updates
- Error notifications (agent encountered error)
- Approval requests (agent waiting for human input)
- Artifact generation complete
- Git divergence warnings

**Implementation:**
- Backend: Hono route with `streamSSE()` broadcasting agent events
- Frontend: React hooks via `react-sse-hooks` or `@microsoft/fetch-event-source`
- Event types: `agent.status`, `workflow.progress`, `agent.error`, `agent.approval_needed`, `artifact.generated`
- User responses: tRPC mutations (e.g., `approveWorkflow()`, `resolveConflict()`)

**Applies to:**
- FR016: Multi-Agent Dashboard with real-time progress
- FR031: Real-time UI updates for agent status and workflow progress
- FR042: Throttled updates (max 2 updates/sec per UI component)

**Alternatives Considered:**
- WebSockets: Too complex for single-user, no collaborative editing needed
- Polling: Network overhead, not "true" real-time despite FR042 throttling

---

### Decision #4: State Management ✅ DECIDED

**Choice:** React Query (TanStack Query) + Zustand
**XState:** Deferred - Add only if state machine complexity emerges
**Date Decided:** 2025-11-03

**Architecture:**
- **React Query:** Server state caching, tRPC integration, SSE invalidation
- **Zustand:** Global UI state, SSE event distribution, ephemeral state
- **XState (future):** State machines for story transitions, approval flows if needed

**Rationale:**
- tRPC automatically includes React Query (no extra setup)
- SSE events invalidate React Query cache (agent status → refetch projects)
- Zustand handles UI state (panels, dialogs, command palette)
- Simpler MVP approach with clear upgrade path to XState
- Avoid premature complexity - add state machines only when patterns emerge

**State Categories:**
1. **Server state** (React Query): projects, agents, workflows, artifacts, epics, stories
2. **UI state** (Zustand): active agent panels, selected artifact, open dialogs, command palette
3. **Real-time state** (Zustand): SSE connection state, live agent statuses
4. **Form state** (React Hook Form or similar): artifact editing, workflow inputs

**Implementation:**
- Zustand store: `apps/web/src/stores/` (global UI state)
- React Query devtools for debugging
- SSE events trigger `queryClient.invalidateQueries()`
- XState considered for: Story Kanban transitions, Approval flows, Conflict resolution wizards

**Applies to:**
- All frontend state management
- FR016-FR020 (UI visualization requirements)
- FR031 (real-time state updates)

**Alternatives Considered:**
- React Query only: Too much manual state coordination with SSE
- Jotai: More granular but learning curve for MVP
- XState everywhere: Over-engineered for MVP, backend owns workflow state

---

### Decision #5: Git Operations Library ✅ DECIDED

**Choice:** simple-git
**Version:** Latest stable (to be verified during implementation)
**Date Decided:** 2025-11-03

**Rationale:**
- **Worktree support:** Essential for FR027, FR037 (per-agent workspace isolation)
- Most popular Node.js git wrapper (5M+ downloads/week)
- Promise-based API with TypeScript support
- Mature, well-documented, battle-tested
- Likely works with Bun (Node.js compatibility layer)
- Covers all required operations: worktree, commit hash tracking, divergence detection, branch management

**Git Requirements Coverage:**
- ✅ Worktree lifecycle (create, switch, merge, cleanup)
- ✅ Commit hash tracking for divergence detection
- ✅ Branch management and status checking
- ✅ Diff operations for conflict resolution

**Implementation:**
- Location: `packages/git-manager/` or `apps/api/src/services/git/`
- Wrapper service for type-safe git operations
- Error handling for worktree failures (FR030)
- Divergence detection: compare DB hash vs `git log -1 --format=%H -- <file>`

**Applies to:**
- FR027-FR030: Git worktree management
- FR034: Git commit hash tracking
- FR037-FR038: Worktree registry and cleanup
- FR028: Repository divergence detection

**Alternatives Considered:**
- isomorphic-git: No worktree support (dealbreaker)
- Raw git CLI: More control but manual error handling, security concerns

---

## Technology Stack Summary

**Confirmed Decisions:**
- **Runtime:** Bun (package manager + JavaScript runtime)
- **Monorepo:** Turborepo + Bun workspaces
- **Database:** PostgreSQL with Drizzle ORM
- **Backend Framework:** Hono (Bun-optimized)
- **API Pattern:** tRPC with React Query
- **Real-Time:** Server-Sent Events (SSE)
- **State Management:** React Query + Zustand (XState deferred)
- **Frontend:** React + TypeScript + Vite
- **UI Library:** shadcn/ui + Tailwind CSS
- **Migrations:** drizzle-kit push (MVP), migrate (production)
- **Git Operations:** simple-git library

**Deferred Decisions (To Relevant Epics):**
- **Orchestration Framework** (Effect/Mastra): Deferred to Epic 3 (Multi-Agent Orchestration Core)
- **Testing Strategy:** Deferred to Epic 1 (Vitest + Playwright sufficient for MVP)
- **Process Management:** Deferred to Epic 3 (Bun.spawn() baseline, refine during implementation)
- **Monorepo Configuration:** Basic Turborepo pipeline (build, dev, lint, test)
- **Error Tracking:** Deferred to post-MVP (nice-to-have)
- **Logging Strategy:** Deferred to post-MVP (nice-to-have)
- **Analytics:** Deferred to post-MVP (nice-to-have)

---

## Next Steps

1. Decide on Git operations library (Decision #5)
2. Complete remaining critical decisions (6-10)
3. Address cross-cutting concerns (Step 5)
4. Define project structure and boundaries (Step 6)
5. Design novel architectural patterns (Step 7)
6. Define implementation patterns to prevent agent conflicts (Step 8)

---

_Last Updated: 2025-11-03_
