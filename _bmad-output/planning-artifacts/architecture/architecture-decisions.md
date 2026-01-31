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

### Decision #6: Workflow Validation Pattern 📝 PROPOSED

**Choice:** Declarative Validation Workflow Configuration
**Status:** Proposed (identified during Story 1.2 code review)
**Date Proposed:** 2025-11-05

**Pattern Identified:**
Many BMAD workflows have a validation counterpart that runs after them to verify completeness/correctness:

```
Primary Workflow → Validation Workflow → Approval/Changes Requested
```

**Current Examples:**
1. **Phase 4 Implementation:**
   - `dev-story` → `code-review` (validates implementation, checks ACs/tasks)
   - Story marked `review` → SM runs code-review → Approve/Changes/Blocked

2. **Phase 3 Solutioning:**
   - `architecture` → `solutioning-gate-check` (validates all Phase 3 artifacts)
   - Checks PRD, architecture, stories aligned with no contradictions

3. **Phase 2 Planning:**
   - `prd` → `validate-prd` (validates requirements completeness)

**Proposed Configuration (workflow.yaml):**

---

### Decision #7: Step Execution Model ✅ DECIDED

**Choice:** Introduce `step_executions` as the unit of execution
**Date Decided:** 2026-01-26

**Rationale:**
- Current execution state is overloaded in `workflow_executions` and `executedSteps`
- Step-level history, approvals, and chat state are difficult to isolate
- Step execution is the natural unit for UI, streaming, and rollback

**Implementation:**
- New table `step_executions` with: `execution_id`, `step_id`, `step_number`, `status`, `variables_delta`, `approval_state`, `metadata`, timestamps, `parent_step_execution_id`
- `workflow_executions.current_step_execution_id` points to active step
- Variables resolve by precedence: `step → workflow → parent → child`
- AI-SDK chat binds to `step_execution_id`
- OpenCode stores only `session_id` (no duplication)

**Applies to:**
- Workflow engine execution, UI step streaming, approvals, rollback

**Alternatives Considered:**
- Continue using `executedSteps` JSONB (insufficient isolation)

---

### Decision #8: AI Runtime Streaming Strategy ✅ DECIDED

**Choice:** Stream-first AI SDK with OpenCode-style tool parsing
**Date Decided:** 2026-01-26

**Rationale:**
- Streaming is required for step UX
- Tool-call args are unreliable in `result.toolCalls` for some models
- OpenCode-style `fullStream` parsing consistently recovers tool arguments

**Implementation:**
- Always use `streamText`
- Parse tool calls from `fullStream` (`tool-input-start`, `tool-input-delta`, `tool-call`)
- If args invalid → do not request approval; fall back to text-only
- If provider rejects tool schema → retry without tools
- No persistent capability flags; handle per call

**Applies to:**
- Sandboxed-agent handler, streaming UI, approval gating

**Alternatives Considered:**
- `generateText` as default (loses streaming UX)

---

### Decision #9: Model Catalog by Engine ✅ DECIDED

**Choice:** Provider registry with engine-specific model catalogs
**Date Decided:** 2026-01-26

**Rationale:**
- ai-sdk and OpenCode have distinct provider/model sources
- Models must reflect user-configured providers (app_config)

**Implementation:**
- `ModelCatalogService` aggregates providers from `app_config`
- ai-sdk steps use OpenRouter list (provider prefix: `openrouter:<id>`)
- OpenCode steps use OpenCode providers list
- Ax tools default to step model; allow override in tool config

**Applies to:**
- Model selector UI, step execution configuration

**Alternatives Considered:**
- Single static model list (out of sync with user config)

---

### Decision #10: AX Signature Registry ✅ DECIDED

**Choice:** Signature registry with system-context injection
**Date Decided:** 2026-01-26

**Rationale:**
- AX should be composable and independent of tool handlers
- Optimization/examples should be configured once per signature

**Implementation:**
- `ax_generate` tool accepts `{ signature, input }`
- Registry maps signature → input schema, output schema, Ax execution
- Inputs merged with system context (`resolved_vars`, `chat_history`, execution metadata)
- Output validated and optionally written to variables

**Applies to:**
- Complexity classification, structured planning tools

**Alternatives Considered:**
- Inline Ax calls inside handlers (harder to optimize)

---

### Decision #11: OpenCode Compatibility ✅ DECIDED

**Choice:** OpenCode session ID storage + streaming relay
**Date Decided:** 2026-01-26

**Rationale:**
- Avoid duplicating OpenCode chat/tool data
- Preserve user’s OpenCode setup (plugins, skills, commands)

**Implementation:**
- Store only `opencode_session_id` in step metadata
- Stream OpenCode session events via SDK and relay into Chiron EventBus
- Use the same tRPC streaming pipeline as ai-sdk steps (unified UI reducer)
- Emulate OpenCode TUI streaming patterns for ordering and chunk handling
- Expose OpenCode tools/skills/commands for discovery only
- Optional plugin hooks for notifications (future)

**Applies to:**
- System-agent steps and OpenCode integration

**Alternatives Considered:**
- Duplicate OpenCode chat into Chiron DB (overhead, divergence risk)

---

### Decision #12: MCP Integration Strategy ✅ DECIDED

**Choice:** Single shared Chiron MCP server with static tools
**Date Decided:** 2026-01-26

**Rationale:**
- MCP tool list updates affect all connected clients
- Step-scoped tooling must not mutate global tool lists

**Implementation:**
- One shared MCP server for all sessions
- Static MCP tools: `chiron_context`, `chiron_actions`, `chiron_action`
- Step-specific action registry returned via `chiron_actions`
- All tool execution routed through Tooling Engine
- Can be hosted as separate process or mounted in Hono via Streamable HTTP

**Applies to:**
- OpenCode integration, Chiron tooling, approvals

**Alternatives Considered:**
- Per-session MCP servers (higher overhead)
- Dynamic tool enable/disable (cross-session interference)
```yaml
name: dev-story
validation:
  workflow: code-review
  trigger: manual | auto | conditional
  required: true
  status_on_pass: done
  status_on_fail: in-progress
  auto_suggest: true  # System suggests validation after workflow completes
```

**Alternative: Database Schema (Story 1.5 - Workflow Execution Engine):**
```typescript
// workflow_validations table
{
  workflowId: uuid,
  validationWorkflowId: uuid,
  trigger: 'manual' | 'auto' | 'conditional',
  required: boolean,
  autoSuggest: boolean
}
```

**Benefits:**
- **Consistency:** Every workflow knows its validation counterpart
- **Automation:** System can suggest/auto-run validations
- **Quality Gates:** Prevents moving forward without validation
- **Traceability:** Clear audit trail of validation outcomes
- **Workflow Chaining:** Natural workflow → validation → next-step pattern

**Implementation Considerations:**
1. **Trigger Types:**
   - `manual`: User must explicitly run validation workflow
   - `auto`: System automatically runs validation after primary workflow
   - `conditional`: Run validation based on workflow outcome (e.g., only if status=review)

2. **Status Management:**
   - Primary workflow sets intermediate status (e.g., `review`)
   - Validation workflow sets final status (e.g., `done` or back to `in-progress`)

3. **Workflow Engine Integration:**
   - Story 1.5 (Workflow Execution Engine) should consider this pattern
   - Database schema may need `workflow_validations` table
   - UI should surface validation suggestions

**Applies to:**
- All BMAD workflow phases (Analysis, Planning, Solutioning, Implementation)
- Quality gates between phases
- Story lifecycle management

**Decision Timeline:**
- **Phase 1:** Document pattern (✅ Done - this decision)
- **Phase 2:** Design database schema (Story 1.5)
- **Phase 3:** Implement validation workflow registry (Epic 6-7)
- **Phase 4:** Add UI support for validation suggestions (Epic 6-7)

**Alternatives Considered:**
- Hardcoded validation logic: Not flexible, harder to extend
- Manual workflow chaining: User must remember validation steps
- No validation pattern: Quality issues, inconsistent outcomes

**References:**
- Story 1.2 code-review identified this pattern
- Backlog item: "Validation Workflow Configuration System"

---

### Decision #7: AI Agent Framework & LLM Optimization ✅ DECIDED

**Choice:** Mastra + Ax
**Date Decided:** 2025-11-12
**Story Context:** Story 1.6 (Workflow Init Steps 3-4: Description + Complexity Analysis)

**Stack Components:**
- **Mastra (@mastra/core):** Agent orchestration, approval-gate workflows, tool calling
- **Ax (@ax-llm/ax):** LLM optimization with ACE (Agentic Context Engineering) playbooks
- **ai-sdk:** Used internally by Mastra (no direct integration needed)
- **Effect:** Deferred to Epic 4+ (multi-agent concurrency needs)

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│ CHIRON WORKFLOW ENGINE (Existing)                           │
│ - Orchestrates workflow steps                               │
│ - Manages state, transitions, variables                     │
│ - Supports all step types (ask-user, execute-action, etc)  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├──> When stepType = "ask-user-chat"
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ MASTRA AGENT (New)                                          │
│ - Agent instructions from DB (agents.instructions field)    │
│ - ACE playbooks injected at runtime                         │
│ - Tools: MCP tools + custom side effect tools               │
│ - Suspend/resume on approval-required responses             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├──> When tool triggers side effect
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ AX GENERATOR (New)                                          │
│ - Build signature from user-defined config                  │
│ - Load ACE playbook from DB (ace_playbooks table)           │
│ - Generate output (summary, complexity, custom fields)      │
│ - Return for user approval                                  │
└─────────────────────────────────────────────────────────────┘
```

**Rationale:**

1. **Mastra for Orchestration:**
   - Native suspend/resume for approval gates (critical for Story 1.6)
   - Agent abstractions with tool calling
   - MCP integration for external tools (Context7, filesystem, etc.)
   - Multi-turn conversation management
   - Built on ai-sdk (battle-tested LLM interface)

2. **Ax for Optimization:**
   - ACE playbooks for agent knowledge that evolves
   - Online learning from user feedback (no training data needed)
   - Structured playbook prevents context collapse
   - GEPA deferred to Phase 2 (when sufficient usage data exists)

3. **Why Not Alternatives:**
   - **Effect + ai-sdk:** Too much custom implementation, no approval-gate primitives
   - **Pure ai-sdk:** No agent abstractions, manual conversation management
   - **Mastra Workflows:** Different abstraction (code-first vs config-first), risky to reimplement

**Key Design Decisions:**

1. **ACE Playbooks (Agent-Level Knowledge):**
   - Scope: Agent-wide (helps all tasks the agent performs)
   - Storage: `ace_playbooks` table linked to `agentId`
   - Initial scope: Global (all users contribute to shared knowledge)
   - Future: User-specific or project-specific scopes if needed
   - Updates: From any user feedback on any side effect
   - **Purpose:** General patterns that apply across workflows (e.g., "When user mentions healthcare, ask about compliance")
   - **Learning:** Online learning from rejection feedback (no training data needed upfront)

2. **MiPRO Optimizations (Task-Specific - Phase 2):**
   - Scope: Per side effect type (e.g., "summary-generation", "complexity-classification")
   - Storage: `mipro_training_examples` table + `mipro_optimizations` table
   - **Phase 1 (Story 1.6):** Collect approved examples only (prepare for future optimization)
   - **Phase 2 (Story 1.7+):** Run MiPRO optimization after 50+ approved examples
   - Purpose: Optimize specific prompts + few-shot examples for classification/generation tasks
   - **Key Difference from ACE:** Task-specific optimization vs general agent knowledge

3. **GEPA (Multi-Objective - Phase 3+):**
   - **Deferred:** Not needed for Story 1.6 (tasks too simple)
   - Potential use: Party mode optimization, high-volume scenarios with cost/speed trade-offs
   - Would optimize for multiple objectives: accuracy + token efficiency + speed

4. **Mastra Storage Architecture:**
   - **PostgreSQL storage** via `@mastra/pg` with custom schema: `mastra.*`
   - Stores: conversation threads, messages, user working memory, workflow snapshots
   - **Separation of concerns:**
     - Mastra tables: Agent conversations, memory, semantic recall
     - Chiron tables: Workflow orchestration, approval state, ACE/MiPRO data
   - **Benefits:** Automatic thread management, semantic recall (RAG over past conversations), working memory
   - Mastra creates these tables: `mastra_threads`, `mastra_messages`, `mastra_resources`, `mastra_workflow_snapshot`, `mastra_traces`

5. **Mastra Scorers (Quality Monitoring):**
   - Built-in scorers: answer-relevancy, completeness, faithfulness, hallucination detection
   - Run asynchronously (don't slow down responses)
   - Stored in `mastra_scorers` table
   - **Purpose:** Filter high-quality examples for future MiPRO training, track quality trends

6. **Side Effect Signatures:**
   - User-defined (no predetermined signatures)
   - Built from workflow config at runtime
   - Ax signatures constructed dynamically: `inputs → outputs`
   - Support for `class` enums with runtime options from workflow paths

7. **MCP Integration:**
   - Connect to any MCP server (Context7, filesystem, etc.)
   - Tools automatically available to agents via `mcp.getTools()`
   - Mix MCP tools with custom side effect tools
   - Per-user dynamic tool configuration supported

8. **Agent Instructions:**
   - New field: `agents.instructions` (text) in database
   - Base system prompt loaded from DB at runtime
   - ACE playbooks injected into instructions before agent creation
   - Enables workflow-specific agents with evolving knowledge

**Implementation:**

```typescript
// 1. Configure Mastra with PostgreSQL storage
const mastraStorage = new PostgresStore({
  connectionString: process.env.DATABASE_URL,
  schemaName: "mastra" // Separate from Chiron tables
});

const mastra = new Mastra({
  storage: mastraStorage
});

// 2. Agent with ACE playbook + Mastra memory
const agent = new Agent({
  name: "pm",
  instructions: buildInstructionsWithACE(
    agentRecord.instructions,  // From DB
    acePlaybook                // Injected at runtime
  ),
  model: anthropic("claude-3-5-sonnet-20241022"),
  tools: { updateSummary, updateComplexity },
  memory: new Memory({
    storage: mastraStorage,
    options: {
      lastMessages: 10,        // Conversation history
      semanticRecall: { topK: 5, messageRange: 100 } // RAG over past conversations
    }
  }),
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: openai("gpt-4o-mini") }),
      sampling: { type: "ratio", rate: 1 }
    }
  }
});

// 3. Generate response (Mastra handles conversation storage)
const response = await agent.generate(userMessage, {
  memory: {
    resource: `user-${userId}`,      // User-scoped working memory
    thread: `workflow-${executionId}` // This workflow's thread
  }
});

// 4. On tool call (side effect):
const result = await generateWithAx(sideEffectConfig, variables, workflow);
// → Builds signature from config
// → Loads ACE playbook if exists
// → Generates output
// → Returns for approval

// 5. On user APPROVAL:
await db.insert(miproTrainingExamples).values({
  sideEffectType: "summary",
  input: { conversation, expertise },
  expectedOutput: approvedValue // Approved summary
});
// → Save for future MiPRO optimization

// 6. On user REJECTION:
await updateACEPlaybook(field, rejectedValue, feedback);
// → Reflector analyzes: "Why was this rejected?"
// → Curator adds new playbook bullets
// → Saved to ace_playbooks table
// → Agent smarter for future interactions!
```

**Package Dependencies:**
```json
{
  "dependencies": {
    "@mastra/core": "^0.1.x",        // Agent framework
    "@mastra/pg": "latest",          // PostgreSQL storage adapter
    "@mastra/memory": "latest",      // Memory management
    "@mastra/evals": "latest",       // Scorers for quality monitoring
    "@mastra/mcp": "latest",         // MCP client/server
    "@ax-llm/ax": "latest",          // ACE + MiPRO optimizers
    "@ai-sdk/anthropic": "^0.x.x",   // Claude (used by Mastra)
    "@ai-sdk/openai": "^0.x.x"       // GPT (for scorers)
  }
}
```

**NOT Using (For Now):**
- ❌ `ai` (ai-sdk core) - Mastra uses internally
- ❌ `effect` - Deferred to Epic 4+ (multi-agent concurrency)
- ❌ `@mastra/libsql` - Using PostgreSQL instead

**Applies to:**
- Story 1.6: Workflow init steps 3-4 (description + complexity with approval gates)
- Future: All ask-user-chat steps with LLM-generated side effects
- Future: Multi-agent orchestration (Epic 4+)

**Alternatives Considered:**

1. **Mastra Only (No Ax):**
   - Pro: Simpler, one framework
   - Con: No prompt optimization, manual prompt engineering
   - Con: No online learning from user feedback

2. **Ax + ai-sdk (No Mastra):**
   - Pro: Full control, lightweight
   - Con: Must build approval-gate pattern from scratch
   - Con: No agent abstractions, manual tool orchestration
   - Con: Risky for MVP timeline

3. **Effect + ai-sdk + Ax:**
   - Pro: Best-in-class error handling, concurrency
   - Con: Steep learning curve (functional programming paradigm)
   - Con: No approval-gate primitives, must implement
   - Con: Over-engineered for Story 1.6 needs

4. **Reimplementing Mastra Workflows:**
   - Pro: Full control over workflow DSL
   - Con: High maintenance burden (keep up with Mastra changes)
   - Con: Lesson from "I regret it" article: avoid deep integrations
   - Decision: Use Chiron workflow engine + Mastra agents (not Mastra workflows)

**Optimizer Usage Strategy:**

| Optimizer | Purpose | When to Use | Story 1.6 |
|-----------|---------|-------------|-----------|
| **ACE** | Agent-level general knowledge | Always! Online learning from feedback | ✅ Phase 1 |
| **MiPRO** | Task-specific optimization (prompts + demos) | After 50+ approved examples | ⚠️ Phase 2 (collect examples in Phase 1) |
| **GEPA** | Multi-objective trade-offs (accuracy + cost + speed) | High-volume scenarios, party mode | ❌ Phase 3+ (deferred) |

**Data Collection Strategy (Story 1.6):**

```typescript
// ALWAYS save approved examples for future MiPRO training
if (userApproved) {
  await db.insert(miproTrainingExamples).values({
    sideEffectType: "summary", // or "complexity"
    input: { conversation, expertise, ...otherInputs },
    expectedOutput: approvedValue,
    scorerResults: scorerMetrics, // From Mastra scorers
    createdAt: new Date()
  });
}

// ALWAYS update ACE on rejection
if (userRejected && feedback) {
  await updateACEPlaybook(sideEffectType, rejectedValue, feedback);
}
```

**Future Considerations:**

- **Epic 4+ (Multi-Agent Orchestration):** Re-evaluate Effect for concurrency patterns
- **Story 1.7+ (MiPRO Optimization):** Run MiPRO after collecting 50+ approved examples per side effect type
- **Phase 3+ (GEPA):** Consider for party mode or high-volume scenarios with quality/speed/cost trade-offs
- **User/Project Scoping:** Add ACE playbook scopes if global learning insufficient

**References:**
- Research: `/docs/research/spike-ax-mastra-approval-gates.md`
- Research: `/docs/research/framework-decision-matrix.md`
- Research: `/docs/research/mastra-deep-dive.md`
- Research: `/docs/research/ax-deep-dive-ace-gepa.md`

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
- **AI Agent Framework:** Mastra + Ax (ACE playbooks)
- **LLM Optimization:** Ax (ACE for online learning, GEPA deferred)

**Deferred Decisions (To Relevant Epics):**
- **Effect Framework:** Deferred to Epic 4+ (multi-agent concurrency)
- **GEPA Optimization:** Deferred to Phase 2 (after sufficient usage data)
- **Testing Strategy:** Deferred to Epic 1 (Vitest + Playwright sufficient for MVP)
- **Process Management:** Deferred to Epic 3 (Bun.spawn() baseline, refine during implementation)
- **Monorepo Configuration:** Basic Turborepo pipeline (build, dev, lint, test)
- **Error Tracking:** Deferred to post-MVP (nice-to-have)
- **Logging Strategy:** Deferred to post-MVP (nice-to-have)
- **Analytics:** Deferred to post-MVP (nice-to-have)

---

### Decision #8: Workflow Layout Routing System ✅ DECIDED

**Choice:** Metadata-driven layout routing with three layout types
**Date Decided:** 2025-12-03
**Implemented in:** Story 2.3

**Layout Types:**
- `wizard`: Linear flows with stepper navigation (workflow-init)
- `artifact-workbench`: Split-pane with Timeline + ArtifactPreview (brainstorming, PRD)
- `dialog`: Modal overlay for child workflows (techniques)

**Rationale:**
- Separation of concerns: Steps, layouts, and navigation cleanly separated
- Flexibility: Easy to add new layout types without touching existing code
- Reusability: Same step components work in any layout
- Type safety: TypeScript ensures correct props at compile time

**Implementation:**
- `WorkflowLayoutRenderer`: Top-level router based on `metadata.layoutType`
- `StepRenderer`: Pure step content, no layout concerns
- Layout components: Self-contained, receive `execution` + `stepContent`
- `Timeline`: Specific to artifact-workbench only (not universal)

**Key Architectural Principles:**
1. Layouts are self-contained (handle their own concerns)
2. StepRenderer returns pure step content (no layout wrappers)
3. Timeline is NOT universal (only for artifact-workbench)

**Applies to:**
- Epic 2: Artifact Workbench (Story 2.2, 2.3)
- All future workflows requiring different UI presentations

**Documentation:**
- Detailed architecture: `docs/architecture/layout-routing-system.md`
- Story context: `docs/sprint-artifacts/2-3-execution-loop-and-child-workflows.context.xml`

---

## Next Steps

1. ✅ Complete AI framework decision (Decision #7)
2. ✅ Complete layout routing system (Decision #8)
3. Continue Epic 2 implementation (Story 2.3 → 2.6)
4. Update sprint status with progress

---

_Last Updated: 2025-12-03_
