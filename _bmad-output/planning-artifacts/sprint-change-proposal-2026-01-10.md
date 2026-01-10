# Sprint Change Proposal: Mastra to Effect + AI-SDK Migration

**Date:** 2026-01-10
**Author:** BMAD Correct Course Workflow
**Status:** PROPOSED
**Classification:** Moderate (Epic restructuring + Architecture update)
**Tech Spec:** [tech-spec-effect-workflow-engine.md](./tech-spec-effect-workflow-engine.md)

---

## Executive Summary

During Epic 2 implementation (Story 2-3: invoke-workflow execution loop), the variable resolution system for parent-child workflow communication was found to be broken. Root cause analysis reveals that Mastra, selected as the orchestration layer in ADR #7 (Nov 2025), has become technical debt. The project only uses Mastra's tool definitions and LLM generation features, both of which AI-SDK provides natively with better streaming support.

**Recommended Action:** Migrate from Mastra to Effect + AI-SDK + AX + OpenCode stack by inserting migration work into Epic 2, restructuring Epic 3, and adjusting MVP scope to fit the 10-week timeline.

**Key Architecture Changes:**
- Workflow executor as Effect-native program (not wrapped async)
- Step handlers as Effect Services with typed errors
- AI-SDK for LLM integration with streaming
- Effect Scope for workflow lifecycle (pause/resume)
- Effect PubSub for event-driven architecture
- Typed variable system with parent-child propagation

---

## Issue Summary

### Problem Statement

The variable resolution system in the invoke-workflow step handler (Story 2-3) is broken. Child workflows cannot properly pass resolved variables back to parent workflows. This blocks completion of Epic 2 and all downstream epics.

### Root Cause

Mastra's abstraction layer creates unnecessary indirection:
- Only using Mastra for tools + LLM generation
- AI-SDK provides both capabilities natively with better streaming
- Effect provides orchestration + state + errors + resources (what Mastra promised + more)
- Working around Mastra rather than with it = tech debt

### Discovery Context

- **Trigger Story:** 2-3 (invoke-workflow execution loop)
- **Sprint Status:** Epic 2 in progress (2-1 done, 2-2 done, 2-3 in review/blocked)
- **Evidence:** 
  - `docs/migration-plan.md` - Detailed migration strategy
  - `_bmad-output/planning-artifacts/research/tool-stack-decision.md` - Original ADR

---

## Epic Impact Assessment

| Epic | Impact | Changes Required |
|------|--------|------------------|
| **Epic 2** | HIGH | Add 3 migration stories (2-M1, 2-M2, 2-M3) before Story 2-3 |
| **Epic 3** | HIGH | REPLACE with "Core Platform Migration" |
| **Epic 4** | MODERATE | Absorbs Phase 0 workflows from old Epic 3 |
| **Epic 5** | MODERATE | Adds OpenCode integration |
| **Epic 6** | LOW | Benefits from migration, scope unchanged |
| **Epic 7** | DEFERRED | Moves to post-10-week phase |
| **Epic 8** | DEFERRED | Moves to post-10-week phase |

### Epic 2 Restructured Stories

```
Epic 2 (Artifact Workbench + Migration Foundation):
├── 2-1: Split-pane layout ✅ DONE
├── 2-2: Real-time artifact sync ✅ DONE
├── 2-M1: Effect Foundation (~4-5 days) ← NEW
│   ├── 2-M1a: Effect Runtime + Core Services (1-2 days)
│   │   ├── Install effect, @effect/platform, @effect/schema
│   │   ├── Configure Effect runtime in server
│   │   ├── Create DatabaseService Layer (wraps Drizzle)
│   │   └── Create ConfigService Layer
│   ├── 2-M1b: Effect Error Types + Patterns (1 day)
│   │   ├── Define tagged errors (WorkflowError, StepError, VariableError, AgentError)
│   │   ├── Create error recovery utilities (withRetry, withTimeout)
│   │   └── Document error handling conventions
│   └── 2-M1c: Effect Workflow Primitives (2 days)
│       ├── ExecutionContext as Effect Service
│       ├── WorkflowEventBus as PubSub
│       ├── StepHandlerRegistry as Effect Service
│       └── Executor loop as Effect.gen with Scope
├── 2-M2: Variable System (~3-4 days) ← NEW
│   ├── Create variables + variableHistory tables
│   ├── Implement VariableService (Effect CRUD)
│   ├── Implement resolveTemplate with Handlebars
│   ├── Implement propagateToParent (THE BUG FIX!)
│   └── Migration script from JSONB to typed tables
├── 2-M3: AI-SDK Integration (~4-5 days) ← NEW
│   ├── Install ai, @ai-sdk/anthropic, @openrouter/ai-sdk-provider
│   ├── Create AIProviderService (model abstraction)
│   ├── Create ChatService (own message storage, not Mastra)
│   ├── Implement AI-SDK tool builder from tool configs
│   ├── Implement streaming with Effect Stream integration
│   └── Implement approval handling with feedback capture
├── 2-M4: Step Handler Migration (~4-5 days) ← NEW
│   ├── Rename ask-user → user-form + Effect wrap
│   ├── Rename ask-user-chat → sandboxed-agent + AI-SDK rewrite
│   ├── Effect wrap: execute-action, invoke-workflow, display-output
│   ├── Implement: branch handler
│   └── Remove placeholders: llm-generate, approval-checkpoint, question-set
├── 2-M5: Mastra Removal (~2 days) ← NEW
│   ├── Remove @mastra/* packages
│   ├── Delete mastra service files
│   ├── Drop dialog_sessions table
│   └── Update AGENTS.md
├── 2-3: invoke-workflow handler (UNBLOCKED) (~1-2 days)
│   └── Now uses Effect-based variable resolution
├── 2-4: Template-based generation
├── 2-5: Brainstorming focus workflow
└── 2-6: Version history UI
```

### Epic 3 Replacement

**Old Epic 3:** "Artifact Workbench Part 2" (Phase 0 completion)

**New Epic 3:** "Core Platform Migration"
- Chat Services (Effect-based sessions, messages, tangents)
- Artifact System (versioning, snapshots, diffs)
- Streaming unification (AI-SDK + Effect PubSub)
- system-agent foundation (OpenCode research spike)

**Note:** Mastra Removal is now Story 2-M5 in Epic 2 (final migration story).

---

## Step Types & Tool Types Taxonomy

### Step Types (7 total - down from 9)

| Step Type | Was | Status | Implementation |
|-----------|-----|--------|----------------|
| **user-form** | ask-user | RENAME | Effect Service (no AI) |
| **sandboxed-agent** | ask-user-chat | REWRITE | Effect + AI-SDK |
| **system-agent** | NEW | Epic 5 | Effect + OpenCode |
| **execute-action** | same | WRAP | Effect Service |
| **invoke-workflow** | same | FIX | Effect Scoped |
| **display-output** | same | WRAP | Effect Service |
| **branch** | placeholder | IMPLEMENT | Effect Service |

**Removed:** `llm-generate`, `approval-checkpoint`, `question-set` (absorbed by other types)

### Tool Types (3 - for sandboxed-agent)

| Tool Type | Purpose |
|-----------|---------|
| **update-variable** | Set workflow variable with optional approval |
| **ax-generation** | Structured LLM output with AX/DSPy signatures |
| **snapshot-artifact** | Save artifact version (commit snapshot inline) |

### Input Source Types (5 - how tools get dynamic data)

| Source | Description |
|--------|-------------|
| **variable** | From workflow variable |
| **literal** | Hardcoded in config |
| **database** | Dynamic DB query for options |
| **context** | Chat/conversation history |
| **artifact** | Project artifact content |

### Approval Modes (Enhanced)

| Mode | User Actions |
|------|--------------|
| **none** | Direct execution |
| **text** | Approve / **Edit & Approve** / Reject+feedback |
| **selector** | Accept AI choice / **Select different+feedback** |

Feedback captured for AX optimization - user corrections become training data.

### Special Features

- **Agent JIT Inputs:** Agent can add inputs at tool call time (allowAgentInputs: true)
- **User-defined MCPs:** Extend sandboxed-agent tools (future)
- **Feedback Loop:** Rejections/edits feed AX optimization
- **Artifact Refinement:** Use `correct-course` workflow (BMAD pattern), not freeform tools

---

## Additional Architecture Decisions

### Chiron Agent (Meta-Helper)

A project-level assistant always available via Command Palette (Cmd+K → "Ask Chiron..."):
- "What should I do next?"
- "Where am I in the project?"
- Has context of epics, stories, artifacts, execution statuses

**Implementation:** Post-MVP (deferred to tweaks phase)

### System-Agent UI Integration

`system-agent` (OpenCode) is NOT fully headless - user has visibility and can interact:
- **Streaming output** visible in Chiron UI
- **User can send messages** to guide/correct OpenCode
- **"Open in Terminal"** button copies command to open session externally
- **Ralph Wiggum style** = CAN run autonomously, but user has visibility + can intervene

### Kanban vs Executions View

| View | Purpose | Content |
|------|---------|---------|
| **Kanban** | Story management | Stories only, filterable by Epic |
| **Executions Table** | Workflow tracking | All workflow executions |

Kanban is specifically for stories with drag-and-drop state transitions.
Executions table shows all workflows (brainstorming, PRD, dev-story, etc.).

---

## Artifact Updates Required

| Artifact | Update Required |
|----------|-----------------|
| **PRD.md** | Update Epic List section (lines 419-739) with restructured roadmap |
| **architecture-decisions.md** | Supersede ADR #7; create new ADR for Effect + AI-SDK + AX + OpenCode |
| **database-schema-architecture.md** | Add tables: variables, variableHistory, stepExecutions, chatSessions, chatMessages, chatTangents, chatBranches, artifactSnapshots; deprecate dialog_sessions |
| **tech-spec-epic-1.md** | Update workflow engine for Effect patterns, AI-SDK integration |
| **sprint-status.yaml** | Add migration stories to Epic 2, restructure Epic 3 |
| **AGENTS.md** | Update post-migration with new patterns |

---

## Recommended Path Forward

### Approach: Hybrid Direct Adjustment + MVP Scope Adjustment

1. **Insert migration work into Epic 2** to unblock Story 2-3
2. **Restructure Epic 3** as "Core Platform Migration"
3. **Adjust MVP scope** for 10-week timeline (defer Epics 7-8)

### Rationale

- **Unblocks current work** - Variable resolution fix enables Story 2-3 completion
- **Removes tech debt** - Mastra dependency eliminated, cleaner architecture
- **Enables streaming** - AI-SDK provides native streaming support
- **Fits timeline** - AI-agent execution speed makes 10 weeks achievable
- **Preserves thesis value** - Multi-agent orchestration (Epic 5-6) still delivered

### Alternatives Considered

| Option | Viable? | Why Not Selected |
|--------|---------|------------------|
| Rollback Stories 2-1, 2-2 | NO | No benefit, loses working functionality |
| Continue with Mastra | NO | Tech debt compounds, streaming still broken |
| Full 21-epic migration plan | NO | Overkill, doesn't fit timeline |

---

## 10-Week Implementation Timeline

```
WEEK 1-2: Epic 2 Migration + Completion
├── 2-M1: Effect Foundation
├── 2-M2: Variable System
├── 2-M3: AI-SDK Integration
├── 2-3: invoke-workflow (unblocked)
└── 2-4, 2-5, 2-6: Complete Epic 2

WEEK 3-4: Epic 3 (Core Platform Migration)
├── Chat Services (Effect-based)
├── Artifact System (versioning, snapshots)
└── Workflow Engine handlers migration

WEEK 5-6: Epic 4 (Phase 1 Planning)
├── PRD workflow
├── Research workflow
└── Product Brief workflow

WEEK 7-8: Epic 5 (Git Worktree + OpenCode)
├── Worktree lifecycle management
├── OpenCode integration research
└── System agent foundation

WEEK 9-10: Epic 6 (Phase 3 Solutioning)
├── Architecture workflow
├── Tech-spec workflow
└── Multi-artifact coordination
```

### Post-10-Week: Tweaks & Polish

- Epic 7: Phase 4 Implementation (Kanban, dev-story)
- Epic 8: AX optimization, Polish & Extensibility
- Memory features (emulate Mastra memory)
- Hotkey system for power users (keyboard-first workflow control)
- Chiron Agent (meta-helper via Command Palette)

**Note:** Mastra removal is Story 2-M5 (final migration story in Epic 2).

---

## Handoff Plan

| Role/Agent | Responsibility |
|------------|----------------|
| **Gondilf** | Approve this proposal |
| **Dev Agent** | Execute migration stories (2-M1, 2-M2, 2-M3), complete Epic 2 |
| **Architect Agent** | Create new ADR superseding #7, update database schema doc |
| **PM Agent** | Update PRD epic list, update sprint-status.yaml |

### Immediate Next Steps (Upon Approval)

1. Update `sprint-status.yaml` with new Epic 2 structure
2. Create ADR for Effect + AI-SDK + AX + OpenCode stack decision
3. Begin Story 2-M1 (Effect Foundation)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Effect learning curve | Medium | Medium | Good documentation, AI-agent assistance |
| AI-SDK integration issues | Low | Medium | Well-documented library, Context7 available |
| Timeline slippage | Medium | High | AI-agent speed buffer, scope already adjusted |
| OpenCode unknowns | Medium | Medium | Research spike in Epic 5, not critical path |

---

## Approval

- [x] **Gondilf** - Product Owner approval (2026-01-10)
- [ ] Architecture changes approved
- [ ] Sprint status updated
- [ ] Migration work begun

---

**Document Generated:** 2026-01-10
**Workflow:** BMAD Correct Course
**Next Review:** Upon Epic 2 completion
