# Chiron - Architecture Summary (Decision-Focused)

**Project:** chiron
**Date:** 2025-11-03
**Phase:** 3-Solutioning (Architecture Workflow)
**Status:** Core Decisions Complete - Ready for Implementation

---

## Architecture Philosophy

**Approach:** Pragmatic, iterative architecture with deferred complexity.

**Key Principles:**

1. **Test patterns first, optimize later** - Validate core concepts (git-worktree, dual-tracking, chat primitives) before adding orchestration frameworks
2. **Defer to relevant epics** - Make decisions when you have implementation context
3. **Leverage existing decisions** - PRD already locked tech stack (TypeScript, React, Bun, PostgreSQL, Hono, Drizzle, shadcn/ui)
4. **Build for MVP, architect for production** - Start simple, refactor based on learnings

---

## Technology Stack (LOCKED)

### Runtime & Tooling

- **Runtime:** Bun (package manager + JavaScript runtime)
- **Monorepo:** Turborepo + Bun workspaces
- **Package Manager:** Bun

### Backend

- **Framework:** Hono (Bun-optimized HTTP framework)
- **API Pattern:** tRPC (end-to-end type safety)
- **Database:** PostgreSQL with Drizzle ORM
- **Migrations:** drizzle-kit push (MVP), migrate (production)
- **Git Operations:** simple-git (worktree support)

### Frontend

- **Framework:** React + TypeScript + Vite
- **UI Library:** shadcn/ui + Tailwind CSS
- **State Management:** React Query (server state) + Zustand (UI state)
- **Real-Time:** Server-Sent Events (SSE) for server → client updates
- **Client → Server:** tRPC mutations (HTTP)

### Project Structure

```
chiron/
├── apps/
│   ├── web/           # React + TypeScript + Vite
│   └── api/           # Hono + tRPC backend
├── packages/
│   ├── database/      # Drizzle ORM schemas + migrations
│   ├── workflow-engine/  # BMAD workflow execution (discover from bmad repo)
│   ├── git-manager/   # simple-git wrapper for worktree operations
│   ├── shared/        # Shared TypeScript types
│   └── ui/            # shadcn/ui components
├── turbo.json         # Turborepo pipeline
└── package.json       # Bun workspaces config
```

---

## Core Architectural Patterns

### 1. Git-Database Dual-Tracking (Novel)

**Pattern:** Database stores metadata, git stores content, hashes link them.

```
project_artifacts table:
- id, project_id, artifact_type, file_path
- git_commit_hash (links to git)
- metadata_json
- created_at, updated_at

Divergence Detection:
DB hash != git log hash → Warn user, trigger reconciliation
```

**Why Novel:** No existing framework coordinates metadata-in-DB with content-in-git using hash-based divergence detection.

**Implementation:** Epic 1 (database schema) + Epic 2 (git-manager package)

---

### 2. Git Worktree Isolation (Novel)

**Pattern:** Each active agent gets isolated git worktree on separate branch.

```
git_worktrees table:
- id, project_id, agent_id
- worktree_path, branch_name
- status (active, merging, completed, failed)
- created_at

Lifecycle:
1. Agent starts → Create worktree + branch
2. Agent executes → Isolated filesystem
3. Agent completes → Merge to main → Cleanup worktree
4. Agent crashes → Cleanup orphaned worktrees on restart
```

**Why Novel:** No framework orchestrates multiple AI agents with per-agent git workspace isolation.

**Implementation:** Epic 2 (Git Worktree Management)

---

### 3. Cross-Agent Conflict Resolution (Novel)

**Pattern:** Three strategies documented, final choice deferred to implementation.

**Options:**

- **Interrupt-Based:** Pause agent when input artifact changes
- **Dependency-Based:** Prevent parallel execution of dependent work
- **Queue-Based:** Continue with snapshot, reconcile after

**Decision Point:** Epic 3 (Multi-Agent Orchestration Core)

**Deferred Rationale:** Need real-world agent execution patterns before choosing strategy.

---

### 4. BMAD Workflow Execution (Discovery-Driven)

**Pattern:** BMAD workflows stored in database, executed dynamically.

**Reference Architecture:** BMAD repository (query during implementation)

**What We Know:**

- BMAD uses workflow.xml engine with steps, actions, templates, elicitation
- Workflows defined in YAML with frontmatter + markdown instructions
- 4-level variable resolution (config_source, system-generated, user input, defaults)

**What We'll Discover:**

- Exact workflow.xml parsing logic (query bmad repo via MCP)
- Step execution patterns (conditional, optional, parallel)
- Template rendering approach
- State management between steps

**Implementation:** Epic 1 (Workflow execution engine - simplified), Epic 3+ (full orchestration)

---

### 5. Real-Time Agent Status Broadcasting

**Pattern:** SSE for server → client updates, tRPC for client → server actions.

```
SSE Event Types:
- agent.status (idle, active, paused, completed, error)
- workflow.progress (step N of M, percentage)
- agent.error (error message, stack trace)
- agent.approval_needed (workflow suspended, awaiting input)
- artifact.generated (new artifact created, git hash)
```

**Throttling:** Max 2 updates/second per UI component (FR042)

**Implementation:** Epic 4 (Real-Time System & UI Foundation)

---

## Novel Patterns Requiring Custom Design

**4 unique patterns with no standard solutions:**

1. **Multi-Agent Git Worktree Orchestration**
   - Epic 2: Git worktree lifecycle
   - Epic 3: Multi-agent coordination with worktrees

2. **Git-Database Dual-Tracking with Divergence Detection**
   - Epic 1: Database schema
   - Epic 2: Divergence detection logic

3. **Cross-Agent Conflict Resolution**
   - Epic 3: Implement chosen strategy (interrupt/dependency/queue)

4. **Workflow-as-Data Execution**
   - Epic 1: Workflow storage in DB
   - Epic 3: Dynamic workflow execution from DB

**These are your thesis contributions** - no existing framework solves these.

---

## Deferred Decisions (By Epic)

### Epic 1 (Foundation)

- ✅ Database schema design
- ✅ Drizzle ORM setup
- ✅ Basic workflow engine (simplified, no orchestration)
- ⏭️ Testing strategy (Vitest baseline, refine as needed)

### Epic 2 (Git Worktree)

- ✅ simple-git integration
- ⏭️ Worktree cleanup strategy (manual vs automatic)
- ⏭️ Branch naming conventions

### Epic 3 (Multi-Agent Orchestration)

- ⏭️ **CRITICAL:** Effect vs Mastra vs Custom (evaluate during Epic 3)
- ⏭️ Process management (Bun.spawn vs worker threads)
- ⏭️ Cross-agent conflict resolution strategy
- ⏭️ Agent queue management

### Epic 4 (Real-Time UI)

- ✅ SSE implementation
- ⏭️ WebSocket fallback (if SSE proves insufficient)
- ⏭️ UI update throttling approach

### Epic 5+ (Future)

- ⏭️ Error tracking (Sentry, Axiom)
- ⏭️ Structured logging (Pino, Winston)
- ⏭️ Analytics (PostHog, Plausible)

---

## Implementation Strategy

### Phase 1: Foundation (Epic 1-2) - Validate Core Patterns

**Goal:** Prove git-worktree + dual-tracking works better than CLI.

**Key Deliverables:**

1. Database with workflow storage
2. Git worktree creation/cleanup
3. Divergence detection (DB hash vs git hash)
4. Basic workflow execution (no multi-agent yet)

**Success Criteria:**

- Can create isolated worktree per agent
- Can detect external git commits
- Can store workflows in DB and execute them
- Patterns work as designed

---

### Phase 2: Core Orchestration (Epic 3-4) - Multi-Agent + UI

**Goal:** Coordinate 2+ agents with real-time dashboard.

**Key Decision Point:** Evaluate Mastra/Effect during Epic 3 implementation.

**If orchestration complexity high:**

- Consider Mastra (agent framework)
- Consider Effect (structured concurrency)

**If orchestration complexity manageable:**

- Continue with custom orchestration
- Refactor later if needed

**Success Criteria:**

- 2+ agents run in parallel with isolated worktrees
- Dashboard shows real-time agent status
- User can approve/reject agent proposals
- Cross-agent conflicts detected and resolved

---

### Phase 3: Intelligence Layer (Epic 5-6)

**Goal:** MCP integration, workflow state management.

**Deferred to implementation context.**

---

### Phase 4: Polish (Epic 7-8)

**Goal:** Chat primitives, extensibility.

**Deferred to implementation context.**

---

## Agent Implementation Patterns (Anti-Conflict Rules)

**To be defined in Step 8 after core decisions finalized.**

**Key principles:**

1. One agent = one worktree
2. Database as single source of truth for metadata
3. Git as single source of truth for content
4. SSE for notifications, tRPC for actions
5. React Query for server state caching
6. Zustand for UI state

---

## Next Steps

1. ✅ Core architectural decisions complete (5/5)
2. ✅ Deferred decisions documented by epic
3. ⏭️ **Update workflow status** to indicate "Architecture foundations complete, ready for implementation"
4. ⏭️ **Begin Epic 1** (Core Infrastructure & Database Foundation)

---

## Key Architectural Insights

**What Makes Chiron Novel:**

1. Multi-agent git worktree orchestration (no existing solution)
2. Git-database dual-tracking with hash-based divergence detection
3. Visual UX for CLI methodology (BMAD → Chiron transformation)
4. Workflow-as-data stored in database, executed dynamically

**What Makes Chiron Practical:**

- Leverages proven technologies (PostgreSQL, React, TypeScript)
- Pragmatic deferred decisions (evaluate frameworks when needed)
- Discovery-driven implementation (query BMAD repo during Epic 1+)
- Test core patterns before optimizing orchestration

**Thesis Contribution:**

- Novel architecture patterns for multi-agent AI orchestration
- Demonstration that visual UX + parallel agents improves productivity vs CLI
- Reusable patterns for git-worktree isolation and dual-tracking

---

_Last Updated: 2025-11-03_
_Status: Architecture foundations complete - Ready to begin Epic 1_
