# Epic 3: Core Platform Migration

**Goal:** Complete the Effect + AI-SDK migration foundation, enabling all subsequent epics to build on the new architecture.

**Duration:** ~2 weeks
**Dependencies:** Epic 2 Migration Stories (2-M1 through 2-M4)
**Owner:** DEV agent
**BMAD Phase:** Infrastructure

---

## Context

This epic was restructured from "Artifact Workbench Part 2 - Phase 0 Completion" to "Core Platform Migration" per Sprint Change Proposal (2026-01-10).

The migration from Mastra to Effect + AI-SDK requires additional platform work beyond what fits in Epic 2's migration stories. Epic 3 completes the migration foundation.

**Related Documents:**
- Sprint Change Proposal: `sprint-change-proposal-2026-01-10.md`
- Tech Spec: `tech-spec-effect-workflow-engine.md`

---

## Key Deliverables

### Chat Services (Effect-based)
- Chat session management with Effect Services
- Message storage (own schema, not Mastra threads)
- Tangent support for side conversations
- Branch support for conversation forks

### Artifact System
- Artifact versioning with snapshots
- Diff visualization between versions
- Git hash tracking for each snapshot
- Artifact template resolution

### Streaming Unification
- AI-SDK text streams → Effect Stream
- Effect PubSub for workflow events
- tRPC subscriptions for UI consumption
- Unified event types across all step handlers

### System-Agent Foundation
- OpenCode programmatic API research spike
- Chiron MCP server design (chiron://variables, chiron://artifacts)
- Session streaming to Chiron UI
- "Open in Terminal" integration design

---

## Story Breakdown

### Story 3.1: Chat Services (~3 days)
**Goal:** Effect-based chat management replacing Mastra threads.

**Acceptance Criteria:**
- [ ] Create `chat_sessions` table (per step execution)
- [ ] Create `chat_messages` table (role, content, tool_calls)
- [ ] Create `chat_tangents` table (side conversations)
- [ ] Create `chat_branches` table (conversation forks)
- [ ] Implement ChatSessionService (Effect)
- [ ] Implement ChatMessageService (Effect)
- [ ] Migrate sandboxed-agent to use new ChatService

### Story 3.2: Artifact System (~3 days)
**Goal:** Versioned artifacts with snapshots and diffs.

**Acceptance Criteria:**
- [ ] Create `artifact_snapshots` table
- [ ] Implement ArtifactService (Effect)
- [ ] Implement ArtifactSnapshotService (Effect)
- [ ] Implement ArtifactDiffService (using jsdiff)
- [ ] Connect snapshot-artifact tool to ArtifactService
- [ ] Git hash tracking for each snapshot

### Story 3.3: Streaming Unification (~2 days)
**Goal:** Unified streaming architecture across all components.

**Acceptance Criteria:**
- [ ] Define StepStreamEvent union type
- [ ] Implement AI-SDK → Effect Stream adapter
- [ ] Implement Effect PubSub broadcast pattern
- [ ] Create tRPC subscription for workflow events
- [ ] Connect UI to streaming subscriptions
- [ ] Verify streaming works for sandboxed-agent

### Story 3.4: System-Agent Foundation (~3 days)
**Goal:** Research and design foundation for OpenCode integration (Epic 5).

**Acceptance Criteria:**
- [ ] Research OpenCode programmatic API (document findings)
- [ ] Design Chiron MCP server resource schema
- [ ] Prototype MCP server with chiron://variables endpoint
- [ ] Design session streaming to Chiron UI
- [ ] Document "Open in Terminal" integration approach
- [ ] Create Epic 5 detailed story breakdown based on findings

---

## Success Criteria

- [ ] Chat services fully operational (own schema)
- [ ] Chat history persisted in own schema (not Mastra threads)
- [ ] Artifact snapshots working with git hash tracking
- [ ] Streaming works end-to-end (AI-SDK → Effect → tRPC → UI)
- [ ] Clear path documented for OpenCode integration in Epic 5

---

## Risk Assessment

### Medium Risk
- **OpenCode API Unknowns:** Research spike may reveal unexpected complexity
- **Streaming Performance:** Real-time updates across many connections

### Mitigation Strategies
- Research spike (3.4) done before Epic 5 commitment
- Streaming uses bounded PubSub to prevent memory issues

---

**Status:** 🟡 Backlog (Waiting for Epic 2 Migration Stories)
**Document Version:** 1.0 (Restructured per Sprint Change Proposal)
**Last Updated:** 2026-01-10
