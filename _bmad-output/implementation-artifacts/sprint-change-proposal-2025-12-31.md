# Sprint Change Proposal: Mastra Replacement with Effect + AI-SDK + AX + OpenCode

**Date**: 2025-12-31
**Status**: Draft - In Discussion
**Impact Level**: High (Architectural)
**Triggered By**: Workflow engine over-engineering analysis + Mastra bloat evaluation

---

## Executive Summary

Replace Mastra with a lean, composable stack of **Effect + AI-SDK + AX + OpenCode**. This gives us full control over primitives, robust error handling via Effect, and seamless integration into the OpenCode/OhMyOpenCode ecosystem.

**Core Insight**: Chiron is a **PM and agent orchestration platform** - it provides composable primitives for software development workflows. Agents (sandboxed or system-level like Sisyphus) are things Chiron *orchestrates*, not what Chiron *is*.

---

## What is Chiron?

Chiron is a **PM and Agent Orchestration Platform** for the software development lifecycle.

```
┌─────────────────────────────────────────────────────────────────┐
│                           CHIRON                                 │
│              PM & Agent Orchestration Platform                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PRIMITIVES (composable for any SDLC workflow):                 │
│  ├── Workflow Engine (BMAD phases, steps, approval gates)       │
│  ├── Agent Orchestration (sandboxed-agent, system-agent)        │
│  ├── Living Documents (reactive context sync across agents)     │
│  ├── Artifact Management (workbench, templates, outputs)        │
│  ├── Approval/Rejection System (human-in-the-loop)              │
│  └── Online Learning (AX ACE - agents improve from feedback)    │
│                                                                  │
│  BUILT ON: Effect + AI-SDK + AX + OpenCode                      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                       ORCHESTRATES                               │
│                                                                  │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│    │ Sisyphus │  │ Analyst  │  │ Architect│  │ Writer   │      │
│    │ (dev)    │  │ (PM)     │  │ (design) │  │ (docs)   │      │
│    └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                  │
│    Any agent, any capability level, composed into workflows     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Chiron doesn't replace agents - it **orchestrates** them. The primitives Chiron provides can be composed to build any software development workflow (brainstorming, planning, implementation, review, retrospective, etc.).

### How Primitives Are Developed

```
BMAD Methodology              Tool Capabilities
(what workflows we need)      (what's possible)
         │                           │
         │    Effect, AI-SDK,        │
         │    AX, OpenCode           │
         │                           │
         └───────────┬───────────────┘
                     ▼
            CHIRON PRIMITIVES
            (composable building blocks)
                     │
                     ▼
         Translated BMAD Workflows
         (proper Chiron code, not YAML)
```

**Key Insight**: We do NOT seed raw BMAD YAML/instructions/checklists into the database. Instead:

1. **BMAD as lens** - Use BMAD methodology to understand what workflow we need
2. **Tools as inspiration** - Effect, AI-SDK, AX, OpenCode inform what primitives are possible
3. **Build primitives** - Create composable Chiron primitives from these capabilities
4. **Translate workflows** - Express BMAD workflows using Chiron primitives (real code, not parsed YAML)
5. **Progressive discovery** - As we go through BMAD phases, we discover and refine more primitives

The YAML files in `bmad/` are **reference material**, not runtime configuration. Chiron workflows are proper implementations using the primitives we build.

---

## 1. Problem Statement

### Current Issues

1. **Mastra Bloat**: Opinionated abstractions create friction rather than value
2. **Over-engineered Workflow Engine** (from `course-correction-workflow-engine.md`):
   - 4-level variable precedence system (solves non-existent problem)
   - Path-based output extraction (fragile, hard to debug)
   - No schema enforcement
   - Variable name mismatches between parent/child workflows
3. **Loss of Control**: Mastra's `mastra.*` schema, thread management, and storage patterns don't fit our needs
4. **Effect Deferred Too Long**: Originally planned for Epic 4+, but needed now for robust error handling

### What We Want

- **Full control** over primitives - no framework opinions
- **Effect's robustness** - typed errors, retry, structured concurrency, fibers
- **AI SDK direct** - native approval flows, MCP, latest features
- **AX learning** - agents get smarter from rejections (ACE playbooks)
- **OpenCode integration** - seamless ecosystem fit
- **Living documents** - reactive context that stays in sync across agents

---

## 2. Proposed Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| **Error Handling & Concurrency** | Effect | Typed errors, fibers, streams, retry/recovery, PubSub |
| **LLM Primitives** | AI SDK | generateText, streamText, tools, `needsApproval` approval gates |
| **Prompt Optimization** | AX | ACE playbooks, online learning from rejections |
| **System Execution** | OpenCode Server | Full computer access (files, shell, git, LSP) |
| **Storage** | PostgreSQL (own schema) | Messages, conversations, artifacts, workflow state |
| **RAG** | pgvector | Already have PostgreSQL, native vector support |

---

## 3. Agent Model: Privilege-Based

### Two Agent Types

| Agent | Privileges | Use Cases |
|-------|------------|-----------|
| **sandboxed-agent** | Defined tools only, scoped file access (like artifact-workbench) | Chat, decisions, approvals, brainstorming, artifact editing |
| **system-agent** | Full computer access via OpenCode | Code implementation, file I/O, git, shell, LSP |

### Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      CHIRON AGENTS                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  sandboxed-agent                    system-agent                │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │ • Chat/decisions │              │ • Full bash      │        │
│  │ • Approvals      │   escalate   │ • File I/O       │        │
│  │ • Artifacts      │ ──────────►  │ • Git operations │        │
│  │   (scoped writes)│              │ • LSP tools      │        │
│  │ • Brainstorming  │              │ • Anything       │        │
│  └──────────────────┘              └──────────────────┘        │
│                                                                 │
│  Tools: defined per workflow        Tools: OpenCode server      │
│  Engine: AI SDK + Effect            Engine: OpenCode + Effect   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Naming Change

| Old Name | New Name |
|----------|----------|
| `ask-user-chat` | `sandboxed-agent` |
| (implied OpenCode usage) | `system-agent` |

---

## 4. Key Patterns

### 4.1 Effect's Role

Effect handles:
- **Streaming unification** - AI SDK streams + OpenCode streams
- **Typed error handling** - `Effect<A, E, R>` with discriminated unions
- **Retry/recovery** - `Schedule.exponential`, `Effect.retry`
- **Fiber-based concurrency** - lightweight virtual threads
- **Living documents** - PubSub, SubscriptionRef for reactive context

```typescript
// Example: Typed LLM errors with recovery
class LLMTimeout extends Data.TaggedError("LLMTimeout")<{ model: string }> {}
class ApprovalRejected extends Data.TaggedError("ApprovalRejected")<{ reason: string }> {}

const callLLM = Effect.tryPromise({
  try: () => generateText({ model, prompt }),
  catch: (e) => new LLMTimeout({ model: model.id })
}).pipe(
  Effect.retry(Schedule.exponential("1 second")),
  Effect.catchTag("LLMTimeout", (e) => /* fallback model */)
);
```

### 4.2 AI SDK Approval Flow

Native `needsApproval: true` for approval gates:

```typescript
const result = await generateText({
  model,
  tools: {
    dangerousAction: tool({
      needsApproval: true,  // Pauses for approval
      parameters: z.object({ ... }),
      execute: async (input) => { ... }
    })
  },
  messages
});

// Check for approval requests in result.content
// Add tool-approval-response message
// Re-call generateText with updated messages
```

### 4.3 AI SDK Memory (Bring Your Own)

AI SDK is **storage-agnostic by design**. Pattern:

```typescript
// Load from DB
const messages = await loadMessages(conversationId);

// Stream response
const result = streamText({
  model,
  messages,
  onFinish: async ({ response }) => {
    // Save to DB when done
    await saveMessages(conversationId, response.messages);
  }
});

// Context window management
prepareStep: async ({ messages }) => ({
  messages: [messages[0], ...messages.slice(-10)]  // Keep system + last 10
});
```

### 4.4 AX Online Learning (ACE)

Learn from user rejections:

```typescript
const optimizer = new AxACE({ studentAI, teacherAI });

// After user rejects LLM output
await optimizer.applyOnlineUpdate({
  example: { topic, goals },
  prediction: llmOutput,
  feedback: "Too verbose, missed security angle"  // English critique
});

// Playbook grows with learned rules
await savePlaybook(optimizer.artifact.playbook);
```

### 4.5 Living Documents (Effect PubSub + SubscriptionRef)

Documents stay in sync across agents:

```
┌─────────────────────────────────────────────────────────────────┐
│                   DOCUMENT WATCHER SERVICE                       │
│                                                                  │
│  @effect/platform FileSystem.watch("docs/")                     │
│         │                                                        │
│         ▼                                                        │
│  Stream<WatchEvent> ──► filter ──► parse diff                   │
│         │                                                        │
│         ▼                                                        │
│  PubSub.publish(DocumentChanged { path, diff, newContent })     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼              ▼
          ┌───────────┐  ┌───────────┐  ┌───────────┐
          │ Agent A   │  │ Agent B   │  │ Agent C   │
          │ subscribed│  │ subscribed│  │ subscribed│
          │ epic-2.md │  │ story.md  │  │ PRD.md    │
          └───────────┘  └───────────┘  └───────────┘
```

When a document changes, inject system message into agent's context:

```typescript
{
  role: "system",
  content: `
    ⚠️ CONTEXT UPDATE: docs/epic-2.md was modified.
    
    Changes:
    - Added: "Must implement caching layer"
    - Changed: deadline Jan 5 → Jan 10
    
    Adjust your approach if needed.
  `
}
```

---

## 5. Impact Analysis

### Affected Components

| Component | Impact | Notes |
|-----------|--------|-------|
| `packages/api/src/services/mastra/` | 🔴 Remove entirely | Replace with Effect services + AI SDK |
| `ask-user-chat-handler.ts` | 🔴 Rewrite | Becomes `sandboxed-agent` with AI SDK |
| Tool definitions (`createTool`) | 🟡 Migrate | Use AI SDK `tool()` helper |
| Streaming | 🟡 Refactor | Effect Stream + AI SDK direct |
| Error handling | 🟡 Add | Effect typed errors throughout |
| Message storage (`mastra.*`) | 🔴 Replace | Own schema in existing PostgreSQL |
| ACE integration | 🟢 Simplify | Direct AX usage (remove Mastra wrapper) |

### Affected Epics

| Epic | Impact | Details |
|------|--------|---------|
| Epic 1 (Foundation) | 🟡 Medium | DB schema changes |
| Epic 2 (Artifact Workbench) | 🔴 High | Workflow engine rewrite |
| Epic 3-5 | 🟡 Medium | Same engine, different workflows |
| Epic 6 (Implementation) | 🟢 Low | OpenCode-heavy, aligns with new model |

### What Stays the Same

- BMAD methodology and workflow YAML structure
- `workflow_executions`, `artifacts` tables (your schema)
- UI components (consumer of API)
- tRPC routers (just change what they call)
- Drizzle ORM

---

## 6. Own Schema (Not Mastra's)

```typescript
// Agent messages - replaces mastra.mastra_messages
export const agentMessages = pgTable('agent_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id').references(() => workflowExecutions.id),
  stepId: text('step_id'),
  role: text('role'),  // 'user' | 'assistant' | 'system' | 'tool'
  content: jsonb('content'),
  toolCalls: jsonb('tool_calls'),
  toolResults: jsonb('tool_results'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Agent conversations - replaces mastra.mastra_threads
export const agentConversations = pgTable('agent_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id').references(() => workflowExecutions.id),
  agentType: text('agent_type'),  // 'sandboxed' | 'system'
  status: text('status'),  // 'active' | 'completed' | 'error'
  contextDocs: jsonb('context_docs'),  // Subscribed living documents
  playbook: jsonb('playbook'),  // AX ACE playbook state
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

---

## 7. Migration Approach

### Recommended: Incremental (Component by Component)

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| **Phase A** | Add Effect foundation | Effect services layer, typed errors |
| **Phase B** | Replace one workflow (brainstorming) | `sandboxed-agent` with AI SDK, own message storage |
| **Phase C** | Remove Mastra wrappers | Direct AX usage, direct AI SDK |
| **Phase D** | Add living documents | Effect PubSub, document watcher |
| **Phase E** | OpenCode integration | `system-agent` for implementation workflows |
| **Phase F** | Drop `mastra.*` schema | Clean removal after migration complete |

### Fresh Start for Schemas

- Do NOT migrate existing `mastra.*` data
- Create new tables (`agent_messages`, `agent_conversations`)
- Clean break from Mastra's opinions

---

## 8. Open Questions

1. **Effect adoption depth**: Start simple or go all-in on Effect patterns?
2. **OpenCode server integration**: How does Chiron call OpenCode server? REST? WebSocket?
3. **Living documents granularity**: Watch all docs or explicit subscription per workflow?
4. **Playbook storage**: Per-workflow, per-agent, or global ACE playbooks?

---

## 9. Next Steps

- [ ] Review and approve this proposal
- [ ] Create detailed tech spec for Phase A (Effect foundation)
- [ ] Identify first workflow to migrate (recommend: brainstorming)
- [ ] Design own message schema in detail
- [ ] Prototype living documents with Effect PubSub

---

## 10. Chiron Vision (Refined)

### Chiron is a Harness for the USER

Chiron is NOT an agent framework. It's a **harness that helps software engineers work on their projects** using agents as tools.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CHIRON                                   │
│       "Harness for engineers to build software with AI"         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ARTIFACT GENERATION              IMPLEMENTATION                 │
│  (BMAD techniques)                (OpenCode)                     │
│                                                                  │
│  ┌─────────────────┐             ┌─────────────────┐            │
│  │ sandboxed-agent │             │  system-agent   │            │
│  │                 │   feeds     │   (OpenCode)    │            │
│  │ • Elicitation   │ ────────►   │                 │            │
│  │ • PRD           │  artifacts  │ • Code writing  │            │
│  │ • Epics         │             │ • File ops      │            │
│  │ • Stories       │             │ • Git           │            │
│  │ • Tech specs    │             │ • Testing       │            │
│  └─────────────────┘             └─────────────────┘            │
│                                                                  │
│         Effect (orchestration, error handling, streaming)        │
│         AI-SDK (LLM primitives, approval gates)                  │
│         AX (optimization, learning from feedback)                │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PROTOTYPING                      TRACKING                       │
│  • Isolated git worktrees         • Progress dashboards          │
│  • Safe experimentation           • What's implemented           │
│  • OpenCode in sandbox            • What's next                  │
│  • No main branch pollution       • Issues/blockers              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Insight

> LLM output quality is a **byproduct** of artifact quality. Better PRD + Epics + Stories = Better code from OpenCode.

### The Full Loop

```
BMAD Techniques    →    Artifacts    →    OpenCode    →    Code
(sandboxed-agent)       (versioned)       (system-agent)   (reliable)
                                               │
                                               ▼
                                          Execution
                                          (isolated env)
                                               │
     ┌─────────────────────────────────────────┘
     ▼
  Feedback    →    AX Optimization    →    Better Artifacts
  (rejections,      (ACE playbooks)         (next iteration)
   reviews)
```

---

## 11. Artifact Versioning (Git-Based Provenance)

### The Problem

Living documents update in real-time, but we need to know what version was used when a story was implemented.

### Solution: Git Pinning

When an artifact is used as INPUT to a workflow execution, we pin its git version:

```typescript
interface ArtifactReference {
  path: string;          // "docs/PRD.md"
  commitHash: string;    // "abc123"
  accessedAt: Date;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  inputs: ArtifactReference[];  // Pinned at execution start
  outputs: ArtifactReference[]; // Created during execution
  status: "running" | "completed" | "failed";
}
```

### Two Modes

| Mode | When | Behavior |
|------|------|----------|
| **Living** | During active work | Real-time sync via Effect PubSub |
| **Pinned** | Historical reference | Git commit hash preserved |

This gives us:
- **Provenance**: Know exactly what context was used for any decision
- **Reproducibility**: Can recreate the exact state when a story was implemented
- **Living sync**: Still get real-time updates during active work

---

## 12. Concrete Workflow Translation Example

### `create-story` in Chiron

```
┌─────────────────────────────────────────────────────────────────┐
│ CREATE-STORY WORKFLOW                                            │
│ Layout: artifact-workbench                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ INPUTS (git-versioned, pinned at execution start):              │
│   • sprint-status.yaml @ commit abc123                          │
│   • epic-{n}.md @ commit def456                                 │
│   • PRD.md @ commit 789xyz                                      │
│                                                                  │
│ STEPS:                                                          │
│                                                                  │
│ Step 1: Select Target Story                                     │
│   Type: sandboxed-agent                                         │
│   Tools: [read-sprint-status, select-option]                    │
│   UI: Structured exploration (show available stories)           │
│   Output: story_key                                             │
│                                                                  │
│ Step 2: Analyze Context                                         │
│   Type: sandboxed-agent                                         │
│   Tools: [read-artifact, analyze-architecture, web-search]      │
│   Output: context_analysis                                      │
│                                                                  │
│ Step 3: Generate Story Draft                                    │
│   Type: sandboxed-agent + ax-generation                         │
│   Tools: [generate-story-content]                               │
│   UI: Artifact preview (left), chat (right)                     │
│   → User can approve/reject (AX learns from feedback)           │
│                                                                  │
│ Step 4: Approval Checkpoint                                     │
│   Type: approval-checkpoint                                     │
│   UI: Diff view, checklist validation                           │
│                                                                  │
│ Step 5: Write Artifact                                          │
│   Type: execute-action (file-write + git-commit)                │
│   Output: stories/story-2.3.md @ newHash                        │
│                                                                  │
│ PROVENANCE: All inputs + outputs tracked with git hashes        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## References

- `docs/chiron-stack-research.md` - **Deep research guide for each technology**
- `docs/course-correction-workflow-engine.md` - Workflow engine analysis
- `docs/architecture/architecture-decisions.md` - Decision #7 (original Mastra choice)
- Effect docs: effect.website
- AI SDK docs: sdk.vercel.ai
- AX docs: github.com/ax-llm/ax
- OpenCode: github.com/opencode-ai/opencode

---

**Document Status**: Draft
**Last Updated**: 2025-12-31
**Author**: Sisyphus + fahad
