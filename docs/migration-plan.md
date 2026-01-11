# Chiron Stack Migration Plan

**Version:** 1.0  
**Date:** 2026-01-08  
**Status:** Planning Document for BMAD Execution  
**Goal:** Migrate from Mastra to Effect + AI-SDK + AX + OpenCode

---

## Executive Summary

This document outlines the migration from Chiron's current Mastra-based architecture to the new stack:

| Layer | Current | Target |
|-------|---------|--------|
| **Core Shell** | Ad-hoc TypeScript | **Effect** (errors, streaming, concurrency, DI) |
| **Sandboxed Agent** | Mastra agents | **AI-SDK** (generateText, tools, approval) |
| **System Agent** | N/A | **OpenCode** (full computer access) |
| **Optimization** | Mastra ACE | **AX** (ACE, MiPRO, GEPA) |
| **Chat Storage** | Mastra threads | **Own schema** (messages, tangents, branches) |
| **Variables** | JSONB blob | **Typed tables** (variables, variableHistory) |
| **Artifacts** | Basic tracking | **Versioned system** (snapshots, diffs, git) |

---

## Migration Principles

1. **Incremental** - Migrate one workflow at a time, not big bang
2. **Effect-first** - Wrap new code in Effect from day one
3. **Keep working** - Existing workflows continue to run during migration
4. **Test coverage** - Each migrated component has tests
5. **Schema evolution** - Add new tables, deprecate old ones, don't break

---

## Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MIGRATION PHASES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: Foundation                                                        │
│  ├─ Effect setup & patterns                                                 │
│  ├─ Schema additions (non-breaking)                                         │
│  └─ Service architecture                                                    │
│                                                                             │
│  PHASE 2: Chat System                                                       │
│  ├─ Chat schema & services                                                  │
│  ├─ AI-SDK integration (sandboxed agent)                                    │
│  └─ OpenCode integration (system agent)                                     │
│                                                                             │
│  PHASE 3: Variable System                                                   │
│  ├─ Variable tables & history                                               │
│  ├─ Effect-based resolution                                                 │
│  └─ Migration from JSONB                                                    │
│                                                                             │
│  PHASE 4: Workflow Engine                                                   │
│  ├─ Step handlers as Effect services                                        │
│  ├─ Execution management                                                    │
│  └─ Streaming unification                                                   │
│                                                                             │
│  PHASE 5: Artifact System                                                   │
│  ├─ Versioning & snapshots                                                  │
│  ├─ Diff integration                                                        │
│  └─ Git publishing                                                          │
│                                                                             │
│  PHASE 6: Optimization (AX)                                                 │
│  ├─ ACE integration                                                         │
│  ├─ Playbook persistence                                                    │
│  └─ Feedback loops                                                          │
│                                                                             │
│  PHASE 7: Cleanup                                                           │
│  ├─ Remove Mastra dependencies                                              │
│  ├─ Drop deprecated tables                                                  │
│  └─ Documentation                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation (Effect Setup)

### Goal
Establish Effect as the core runtime shell. All new code uses Effect patterns.

### Epic 1.1: Effect Infrastructure

**Stories:**

1. **Install and configure Effect**
   - Add `effect`, `@effect/platform`, `@effect/schema` dependencies
   - Configure tsconfig for Effect
   - Set up Effect runtime in server entry point
   - Acceptance: Effect.runPromise works in server

2. **Define core error types**
   - Create tagged error classes for each domain:
     - `WorkflowError` (StepFailed, StepTimeout, InvalidState)
     - `AgentError` (ToolFailed, ApprovalRejected, ContextOverflow)
     - `VariableError` (NotFound, TypeMismatch, ValidationFailed)
     - `ArtifactError` (NotFound, VersionConflict, PublishFailed)
   - Acceptance: Errors are typed and catchable by tag

3. **Create service architecture pattern**
   - Define `Layer` pattern for services
   - Create `DatabaseService` layer wrapping Drizzle
   - Create `ConfigService` layer for app config
   - Document pattern for team
   - Acceptance: Services composable via Layer

4. **Set up Effect streaming primitives**
   - Create `StreamService` for unified streaming
   - Support AI-SDK text streams
   - Support OpenCode output streams
   - PubSub for real-time updates
   - Acceptance: Can stream from both AI-SDK and OpenCode

### Epic 1.2: Schema Additions (Non-Breaking)

**Stories:**

1. **Add step execution table**
   - Create `stepExecutions` table
   - Add indexes for executionId, stepNumber
   - Acceptance: Table exists, doesn't break existing code

2. **Add variable tables**
   - Create `variables` table
   - Create `variableHistory` table
   - Add indexes
   - Acceptance: Tables exist, doesn't break existing code

3. **Add chat tables**
   - Create `chatSessions` table
   - Create `chatMessages` table
   - Create `chatTangents` table
   - Create `chatBranches` table
   - Acceptance: Tables exist, doesn't break existing code

4. **Add artifact snapshot table**
   - Create `artifactSnapshots` table
   - Modify `projectArtifacts` (add columns, keep existing)
   - Acceptance: Tables exist, doesn't break existing code

5. **Update workflowExecutions table**
   - Add `parentStepExecutionId` column
   - Add `currentStepExecutionId` column
   - Add `errorStepExecutionId` column
   - Keep existing columns (deprecate later)
   - Acceptance: New columns exist, old code still works

---

## Phase 2: Chat System

### Goal
Unified chat interface for both sandboxed and system agents.

### Epic 2.1: Chat Core Services

**Stories:**

1. **Create ChatSession service (Effect)**
   - `ChatSessionService.create(stepExecutionId, agentId)`
   - `ChatSessionService.get(sessionId)`
   - `ChatSessionService.complete(sessionId, completionType)`
   - Wrap in Effect with proper errors
   - Acceptance: Can create/manage chat sessions

2. **Create ChatMessage service (Effect)**
   - `ChatMessageService.add(sessionId, message)`
   - `ChatMessageService.list(sessionId, options)`
   - `ChatMessageService.addToolCall(messageId, toolCalls)`
   - `ChatMessageService.addToolResult(messageId, results)`
   - Support context markers
   - Acceptance: Can manage messages with full schema

3. **Create ChatTangent service (Effect)**
   - `ChatTangentService.start(sessionId, triggerMessageId, topic)`
   - `ChatTangentService.resolve(tangentId, outcome)`
   - `ChatTangentService.abandon(tangentId)`
   - Acceptance: Can manage tangents

4. **Create ChatBranch service (Effect)**
   - `ChatBranchService.create(sessionId, branchPointMessageId, reason)`
   - `ChatBranchService.merge(branchId)`
   - `ChatBranchService.abandon(branchId)`
   - Acceptance: Can manage branches

### Epic 2.2: AI-SDK Integration (Sandboxed Agent)

**Stories:**

1. **Create AI-SDK provider setup**
   - Configure OpenAI, Anthropic, OpenRouter providers
   - Load from appConfig per user
   - Acceptance: Can use any configured provider

2. **Create SandboxedAgentService (Effect)**
   - Wraps AI-SDK `generateText` / `streamText`
   - Dynamic tool loading from step config
   - Message history from ChatMessage table
   - Returns Effect<AgentResponse, AgentError>
   - Acceptance: Can run sandboxed agent with tools

3. **Implement tool execution with approval**
   - Parse `needsApproval` from tool config
   - Pause execution for approval
   - Store approval request in message
   - Resume on approval/rejection
   - Acceptance: Approval flow works

4. **Implement streaming to chat**
   - Stream AI-SDK responses to UI via SSE/tRPC subscription
   - Store completed messages in ChatMessage
   - Handle partial tool calls
   - Acceptance: Real-time streaming works

5. **Create standard Chiron tools**
   - `update_variable` tool
   - `read_artifact` tool
   - `query_database` tool
   - Acceptance: Core tools work with AI-SDK

### Epic 2.3: OpenCode Integration (System Agent)

**Stories:**

1. **Research OpenCode programmatic API**
   - How to invoke OpenCode from Node.js
   - How to stream output
   - How to pass context (artifacts, stories)
   - Document findings
   - Acceptance: Clear understanding documented

2. **Create OpenCodeService (Effect)**
   - `OpenCodeService.startSession(workdir, context)`
   - `OpenCodeService.sendMessage(sessionId, message)`
   - `OpenCodeService.stream(sessionId)` → Effect Stream
   - `OpenCodeService.stop(sessionId)`
   - Acceptance: Can programmatically control OpenCode

3. **Create SystemAgentService (Effect)**
   - Wraps OpenCodeService
   - Maps to ChatSession/ChatMessage schema
   - Handles OpenCode tool results → ChatMessage format
   - Acceptance: System agent chat stored in same schema

4. **Implement Chiron MCP server for OpenCode**
   - `chiron://artifacts` - Read/subscribe to artifacts
   - `chiron://variables` - Read/update workflow variables
   - `chiron://workflow` - Get workflow state, report progress
   - Acceptance: OpenCode can call back to Chiron

5. **Implement streaming from OpenCode**
   - Stream OpenCode output to UI
   - Parse tool calls, file changes, bash output
   - Store in ChatMessage with appropriate structure
   - Acceptance: Real-time OpenCode streaming works

### Epic 2.4: Chat UI Components

**Stories:**

1. **Create unified ChatView component**
   - Works for both sandboxed and system agents
   - Message list with role-based styling
   - Tool call visualization
   - Approval card for pending approvals
   - Acceptance: Single component for both agent types

2. **Create TangentView component**
   - Collapsible tangent display
   - Outcome summary when resolved
   - Visual distinction from main thread
   - Acceptance: Tangents visible and collapsible

3. **Create ContextMarker component**
   - Variable change notification
   - Link to where change happened
   - Visual separator in chat
   - Acceptance: Context changes visible

4. **Create BranchSelector component**
   - Show available branches
   - Switch between branches
   - Branch comparison view
   - Acceptance: Can navigate branches

---

## Phase 3: Variable System

### Goal
Typed variables with history tracking, replacing JSONB blobs.

### Epic 3.1: Variable Services

**Stories:**

1. **Create VariableService (Effect)**
   - `VariableService.create(executionId, name, schema)`
   - `VariableService.get(executionId, name)`
   - `VariableService.set(executionId, name, value, source)`
   - `VariableService.list(executionId)`
   - Automatic history tracking
   - Acceptance: CRUD operations work with history

2. **Create VariableResolver (Effect)**
   - Replace current 4-level precedence with Effect Context
   - `VariableResolver.resolve(template, executionId)`
   - Support Handlebars templates
   - Support nested access (dot notation, array indexing)
   - Acceptance: Templates resolve correctly

3. **Create variable type validation**
   - Validate against VariableSchema
   - Type coercion where sensible
   - Clear error messages
   - Acceptance: Type mismatches caught

4. **Implement variable history queries**
   - `VariableService.getHistory(variableId)`
   - `VariableService.getAtStep(executionId, name, stepNumber)`
   - `VariableService.getSnapshot(executionId, stepNumber)`
   - Acceptance: Can query historical values

### Epic 3.2: Staleness Propagation

**Stories:**

1. **Implement downstream staleness marking**
   - When variable changes at step N, mark steps N+1... as stale
   - Store stale reason
   - Acceptance: Downstream steps marked stale

2. **Create staleness notification stream**
   - PubSub for staleness events
   - UI subscription for real-time updates
   - Acceptance: UI shows stale indicators in real-time

3. **Implement re-resolution triggers**
   - Manual re-run step action
   - Batch re-resolution for multiple steps
   - Acceptance: Can re-run stale steps

### Epic 3.3: Migration from JSONB

**Stories:**

1. **Create migration script for existing executions**
   - Extract variables from `workflowExecutions.variables`
   - Create `variables` rows
   - Create initial `variableHistory` entries
   - Acceptance: Existing data migrated

2. **Create migration script for executed steps**
   - Extract from `workflowExecutions.executedSteps`
   - Create `stepExecutions` rows
   - Acceptance: Existing data migrated

3. **Update workflow engine to use new tables**
   - Read from `variables` table
   - Write to `variables` table
   - Keep JSONB in sync during transition
   - Acceptance: Engine uses new tables

4. **Remove JSONB dependency**
   - Stop writing to JSONB columns
   - Deprecate columns
   - Acceptance: JSONB no longer used

---

## Phase 4: Workflow Engine

### Goal
Effect-based workflow execution with unified streaming.

### Epic 4.1: Step Handlers as Effect Services

**Stories:**

1. **Create StepHandler service pattern**
   ```typescript
   interface StepHandler {
     execute: (step: WorkflowStep, context: ExecutionContext) 
       => Effect.Effect<StepResult, StepError, Requirements>
   }
   ```
   - Document pattern
   - Acceptance: Pattern defined and documented

2. **Migrate ask-user handler to Effect**
   - Wrap in Effect
   - Use VariableService
   - Proper error handling
   - Acceptance: ask-user works with Effect

3. **Create sandboxed-agent handler (Effect)**
   - Replace ask-user-chat handler
   - Use SandboxedAgentService
   - Use ChatSessionService
   - Acceptance: Chat steps work with AI-SDK

4. **Create system-agent handler (Effect)**
   - New handler for OpenCode steps
   - Use SystemAgentService
   - Use ChatSessionService
   - Acceptance: System agent steps work

5. **Migrate execute-action handler to Effect**
   - Wrap in Effect
   - Use VariableService
   - Proper error handling
   - Acceptance: execute-action works with Effect

6. **Migrate invoke-workflow handler to Effect**
   - Wrap in Effect
   - Use new execution tracking
   - Proper error handling
   - Acceptance: invoke-workflow works with Effect

7. **Migrate display-output handler to Effect**
   - Wrap in Effect
   - Use VariableResolver
   - Proper error handling
   - Acceptance: display-output works with Effect

8. **Create branch handler (Effect)**
   - Implement branch step type
   - Condition evaluation
   - Route to next step
   - Acceptance: branch steps work

9. **Create approval-checkpoint handler (Effect)**
   - Implement approval step type
   - Pause execution
   - Resume on approval
   - Acceptance: approval checkpoints work

### Epic 4.2: Execution Management

**Stories:**

1. **Create WorkflowExecutionService (Effect)**
   - `start(projectId, workflowId, inputs)`
   - `pause(executionId)`
   - `resume(executionId)`
   - `cancel(executionId)`
   - Use new stepExecutions table
   - Acceptance: Execution lifecycle managed

2. **Implement step execution tracking**
   - Create stepExecution on step start
   - Update status on completion
   - Store input/output snapshots
   - Acceptance: Step executions tracked

3. **Implement execution recovery**
   - Recover from paused state
   - Recover from server restart
   - Acceptance: Executions resume correctly

4. **Implement nested workflow execution**
   - Parent-child relationship
   - Variable passing
   - Result aggregation
   - Acceptance: invoke-workflow creates child executions

### Epic 4.3: Streaming Unification

**Stories:**

1. **Create unified StreamService (Effect)**
   - Common interface for all streams
   - AI-SDK text streams
   - OpenCode output streams
   - Workflow progress streams
   - Acceptance: Single streaming abstraction

2. **Implement tRPC subscriptions for streams**
   - Replace SSE with tRPC subscriptions where appropriate
   - Or document SSE pattern
   - Acceptance: UI can subscribe to all stream types

3. **Implement Effect PubSub for events**
   - Workflow events (started, step completed, completed)
   - Variable events (changed, stale)
   - Artifact events (updated, published)
   - Acceptance: Event-driven architecture works

---

## Phase 5: Artifact System

### Goal
Versioned artifacts with diffs and git integration.

### Epic 5.1: Artifact Services

**Stories:**

1. **Create ArtifactService (Effect)**
   - `create(projectId, templateId, executionId)`
   - `get(artifactId)`
   - `resolve(artifactId)` - render template with variables
   - `publish(artifactId, note)`
   - Acceptance: Artifact CRUD works

2. **Create ArtifactSnapshotService (Effect)**
   - `create(artifactId, content, variables)`
   - `get(artifactId, version)`
   - `list(artifactId)`
   - Acceptance: Snapshot management works

3. **Create ArtifactDiffService (Effect)**
   - `diffToPublished(artifactId)` - draft vs published
   - `diffVersions(artifactId, from, to)`
   - Use jsdiff library
   - Acceptance: Diffs generated correctly

### Epic 5.2: Diff UI Integration

**Stories:**

1. **Install and configure @pierre/diffs**
   - Add dependency
   - Configure Shiki themes
   - Acceptance: Library installed

2. **Create ArtifactDiffView component**
   - Split/stacked view options
   - Word-level highlighting
   - Line numbers
   - Acceptance: Diffs render beautifully

3. **Create CourseCorrectDiffView component**
   - Accept/reject individual changes
   - Apply selected changes
   - Publish with changes
   - Acceptance: Interactive diff editing works

### Epic 5.3: Git Integration

**Stories:**

1. **Create GitService (Effect)**
   - `commit(projectPath, filePath, content, message)`
   - `log(projectPath, filePath)`
   - `readAtCommit(projectPath, filePath, sha)`
   - Use isomorphic-git
   - Acceptance: Git operations work

2. **Implement publish-to-git flow**
   - Write file to filesystem
   - Create git commit
   - Update artifact with commit hash
   - Acceptance: Publish creates git commit

3. **Implement version history from git**
   - Query git log for artifact file
   - Map commits to versions
   - Acceptance: Can see git history

### Epic 5.4: Artifact Reference System

**Stories:**

1. **Implement artifact_ref variable type**
   - Store artifactId + snapshotVersion
   - Resolve to content when needed
   - Acceptance: Can reference artifacts in variables

2. **Implement dependent tracking**
   - Query variables for artifact_ref
   - Find executions depending on artifact version
   - Acceptance: Can find dependents

3. **Implement course-correct tools**
   - `update_artifact` tool
   - `find_artifact_dependents` tool
   - `mark_dependent_stale` tool
   - Acceptance: Course correct workflow has tools

---

## Phase 6: Optimization (AX)

### Goal
Integrate AX for prompt optimization and online learning.

### Epic 6.1: AX Setup

**Stories:**

1. **Install and configure @ax-llm/ax**
   - Add dependency
   - Configure with AI providers
   - Acceptance: AX library works

2. **Create AxService (Effect)**
   - Wrap AX in Effect
   - `generateWithSignature(signature, input)`
   - `optimize(program, examples)`
   - Acceptance: AX operations wrapped in Effect

### Epic 6.2: ACE Integration

**Stories:**

1. **Create ACEService (Effect)**
   - `applyOnlineUpdate(example, prediction, feedback)`
   - `getPlaybook(agentId, scope)`
   - `savePlaybook(agentId, playbook)`
   - Acceptance: ACE learning works

2. **Create playbook persistence**
   - Store in acePlaybooks table
   - Version playbooks
   - Load on agent initialization
   - Acceptance: Playbooks persist across sessions

3. **Implement feedback loop**
   - Capture user rejections
   - Feed to ACE
   - Update playbook
   - Acceptance: Agent improves from feedback

### Epic 6.3: AX Tools

**Stories:**

1. **Create ax-generation tool type**
   - Define AX signature per tool
   - Execute via AxService
   - Acceptance: ax-generation tools work

2. **Implement classification tools**
   - Story type classification
   - Complexity estimation
   - Acceptance: Classification works

---

## Phase 7: Cleanup

### Goal
Remove Mastra, clean up deprecated code.

### Epic 7.1: Remove Mastra

**Stories:**

1. **Remove Mastra dependencies**
   - Remove `@mastra/*` packages
   - Remove mastra service files
   - Acceptance: No Mastra imports

2. **Drop Mastra tables**
   - Drop `dialogSessions` table
   - Drop any mastra.* schema tables
   - Acceptance: Mastra tables gone

3. **Remove deprecated columns**
   - Remove `workflowExecutions.variables`
   - Remove `workflowExecutions.executedSteps`
   - Acceptance: JSONB columns removed

### Epic 7.2: Documentation

**Stories:**

1. **Update AGENTS.md**
   - Reflect new architecture
   - Update patterns
   - Acceptance: AGENTS.md current

2. **Create architecture documentation**
   - Effect patterns
   - Service architecture
   - Streaming patterns
   - Acceptance: Architecture documented

3. **Create developer onboarding guide**
   - How to add new step types
   - How to add new tools
   - How to work with Effect
   - Acceptance: New devs can onboard

---

## Dependency Graph

```
Phase 1 (Foundation)
    │
    ├──► Phase 2 (Chat System)
    │        │
    │        ├──► Epic 2.2 (AI-SDK) ──┐
    │        │                        │
    │        └──► Epic 2.3 (OpenCode) ┴──► Phase 4 (Workflow Engine)
    │                                              │
    ├──► Phase 3 (Variable System) ───────────────┘
    │        │
    │        └──► Phase 5 (Artifact System)
    │
    └──► Phase 6 (AX) ──► Phase 7 (Cleanup)
```

---

## Estimated Effort

| Phase | Epics | Stories | Estimate |
|-------|-------|---------|----------|
| Phase 1: Foundation | 2 | 9 | 1-2 weeks |
| Phase 2: Chat System | 4 | 18 | 2-3 weeks |
| Phase 3: Variable System | 3 | 10 | 1-2 weeks |
| Phase 4: Workflow Engine | 3 | 14 | 2-3 weeks |
| Phase 5: Artifact System | 4 | 11 | 1-2 weeks |
| Phase 6: Optimization | 3 | 6 | 1 week |
| Phase 7: Cleanup | 2 | 6 | 1 week |
| **TOTAL** | **21** | **74** | **9-14 weeks** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Effect learning curve | Start with simple services, pair programming |
| OpenCode integration unknowns | Research spike in Phase 2 |
| Breaking existing workflows | Keep old code running during migration |
| Schema migration data loss | Backup before migration, test thoroughly |
| Scope creep | Strict story acceptance criteria |

---

## Success Criteria

1. **All existing workflows still work** after migration
2. **Effect error handling** provides better debugging
3. **Chat system** supports both agent types with shared schema
4. **Variables are typed** and have full history
5. **Artifacts are versioned** with diff support
6. **Mastra is completely removed** from codebase
7. **Test coverage** > 80% for new code

---

## Next Steps

1. **Review this plan** - Any missing pieces?
2. **Prioritize** - Which phases are most critical?
3. **Create BMAD epics** - Turn phases into formal epics
4. **Start Phase 1** - Effect foundation
