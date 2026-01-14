# Chiron Database Schema Design

**Version:** 2.0 (Post-Mastra)  
**Date:** 2026-01-08  
**Status:** Design Document for BMAD Implementation

---

## Overview

This document defines Chiron's database schema after the architectural shift from Mastra to Effect + AI-SDK + AX. The schema supports:

- **Workflow execution** with typed variables and full history
- **Live artifacts** that resolve from variables on-the-fly
- **Rich chat** with tangents, branches, and context markers
- **Time-travel editing** - change a variable, downstream re-resolves

---

## Design Principles

1. **Variables are first-class** - Not JSONB blobs, proper tables with history
2. **Artifacts are views** - Templates + variables, resolved on demand
3. **History is immutable** - New step executions, not updates in place
4. **Chat preserves thinking** - Tangents collapse but survive

---

## Schema Categories

| Category           | Tables                                                         | Status                          |
| ------------------ | -------------------------------------------------------------- | ------------------------------- |
| Auth               | `user`, `session`, `account`, `verification`                   | Keep (Better-Auth)              |
| Config             | `appConfig`                                                    | Keep                            |
| Agents             | `agents`                                                       | Keep                            |
| Workflow Templates | `workflows`, `workflowSteps`, `workflowTemplates`              | Keep                            |
| Workflow Paths     | `workflowPaths`, `workflowPathWorkflows`                       | Keep                            |
| Projects           | `projects`, `projectState`                                     | Keep                            |
| Executions         | `workflowExecutions`, `stepExecutions`                         | Modify + New                    |
| Variables          | `variables`, `variableHistory`                                 | New                             |
| Artifacts          | `projectArtifacts`, `artifactSnapshots`                        | Modify + New                    |
| Chat               | `chatSessions`, `chatMessages`, `chatTangents`, `chatBranches` | New (replaces `dialogSessions`) |

---

## 1. Auth (Better-Auth) - KEEP

Standard Better-Auth tables, no changes.

### user

| Column        | Type        | Notes |
| ------------- | ----------- | ----- |
| id            | TEXT PK     |       |
| name          | TEXT        |       |
| email         | TEXT UNIQUE |       |
| emailVerified | BOOLEAN     |       |
| image         | TEXT        |       |
| createdAt     | TIMESTAMP   |       |
| updatedAt     | TIMESTAMP   |       |

### session

| Column    | Type           | Notes |
| --------- | -------------- | ----- |
| id        | TEXT PK        |       |
| userId    | TEXT FK → user |       |
| token     | TEXT UNIQUE    |       |
| expiresAt | TIMESTAMP      |       |
| ipAddress | TEXT           |       |
| userAgent | TEXT           |       |

### account

| Column       | Type           | Notes  |
| ------------ | -------------- | ------ |
| id           | TEXT PK        |        |
| userId       | TEXT FK → user |        |
| accountId    | TEXT           |        |
| providerId   | TEXT           |        |
| accessToken  | TEXT           |        |
| refreshToken | TEXT           |        |
| password     | TEXT           | Hashed |

### verification

| Column     | Type      | Notes |
| ---------- | --------- | ----- |
| id         | TEXT PK   |       |
| identifier | TEXT      |       |
| value      | TEXT      |       |
| expiresAt  | TIMESTAMP |       |

### appConfig

| Column             | Type                  | Notes        |
| ------------------ | --------------------- | ------------ |
| id                 | UUID PK               |              |
| userId             | TEXT FK → user UNIQUE | One per user |
| openrouterApiKey   | TEXT                  |              |
| anthropicApiKey    | TEXT                  |              |
| openaiApiKey       | TEXT                  |              |
| defaultLlmProvider | TEXT                  |              |

---

## 2. Agents - KEEP

### agents

| Column         | Type        | Notes                         |
| -------------- | ----------- | ----------------------------- |
| id             | UUID PK     |                               |
| name           | TEXT UNIQUE | "analyst", "pm", "dev"        |
| displayName    | TEXT        | "Mimir the Analyst"           |
| description    | TEXT        |                               |
| role           | TEXT        | "Business Analyst"            |
| llmProvider    | ENUM        | anthropic, openrouter, openai |
| llmModel       | TEXT        | "claude-sonnet-4-20250514"    |
| llmTemperature | TEXT        | "0.7"                         |
| instructions   | TEXT        | System prompt                 |
| tools          | JSONB       | AgentTool[]                   |
| mcpServers     | JSONB       | MCP configs                   |
| color          | TEXT        | "#8B5CF6"                     |
| avatar         | TEXT        | Emoji or URL                  |
| active         | BOOLEAN     |                               |
| createdAt      | TIMESTAMP   |                               |
| updatedAt      | TIMESTAMP   |                               |

**AgentTool Type:**

```typescript
{
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
```

---

## 3. Workflow Templates - KEEP

### workflows

| Column             | Type                        | Notes                   |
| ------------------ | --------------------------- | ----------------------- |
| id                 | UUID PK                     |                         |
| name               | TEXT UNIQUE                 | "brainstorming"         |
| displayName        | TEXT                        | "Brainstorming Session" |
| description        | TEXT                        |                         |
| tags               | JSONB                       | WorkflowTags            |
| metadata           | JSONB                       | WorkflowMetadata        |
| outputArtifactType | TEXT                        | "markdown"              |
| outputTemplateId   | UUID FK → workflowTemplates |                         |
| createdAt          | TIMESTAMP                   |                         |
| updatedAt          | TIMESTAMP                   |                         |

**WorkflowTags Type:**

```typescript
{
  phase: "0" | "1" | "2" | "3" | "4"  // BMAD phase
  type: "method" | "technique" | "utility" | "initializer"
  track?: "greenfield" | "brownfield"
  complexity?: "simple" | "moderate" | "complex"
  module: "bmm" | "cis" | "core" | "custom"
}
```

**WorkflowMetadata Type:**

```typescript
{
  agentId: string
  isStandalone: boolean
  requiresProjectContext: boolean
  layoutType?: "wizard" | "artifact-workbench" | "dialog"
  icon?: string
  color?: string
  estimatedDuration?: string
  recommendedFor?: string[]
  inputSchema?: Record<string, VariableSchema>
}
```

### workflowSteps

| Column         | Type                | Notes                                                                                                                             |
| -------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| id             | UUID PK             |                                                                                                                                   |
| workflowId     | UUID FK → workflows |                                                                                                                                   |
| stepNumber     | INTEGER             |                                                                                                                                   |
| goal           | TEXT                | "Collect project details"                                                                                                         |
| stepType       | ENUM                | ask-user, ask-user-chat, llm-generate, branch, approval-checkpoint, execute-action, invoke-workflow, display-output, question-set |
| config         | JSONB               | Step-type-specific config                                                                                                         |
| nextStepNumber | INTEGER             | For linear flow                                                                                                                   |
| createdAt      | TIMESTAMP           |                                                                                                                                   |
| updatedAt      | TIMESTAMP           |                                                                                                                                   |

**Unique constraint:** (workflowId, stepNumber)

### workflowTemplates

| Column            | Type        | Notes                   |
| ----------------- | ----------- | ----------------------- |
| id                | UUID PK     |                         |
| name              | TEXT UNIQUE | "brainstorming-session" |
| displayName       | TEXT        |                         |
| artifactType      | TEXT        | "markdown"              |
| template          | TEXT        | Handlebars template     |
| templateVariables | JSONB       | TemplateVariable[]      |
| createdAt         | TIMESTAMP   |                         |
| updatedAt         | TIMESTAMP   |                         |

**TemplateVariable Type:**

```typescript
{
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required: boolean;
  description: string;
}
```

---

## 4. Workflow Paths - KEEP

### workflowPaths

| Column         | Type        | Notes                   |
| -------------- | ----------- | ----------------------- |
| id             | UUID PK     |                         |
| name           | TEXT UNIQUE | "full-methodology"      |
| displayName    | TEXT        | "Full BMAD Methodology" |
| description    | TEXT        |                         |
| educationText  | TEXT        | Explanation for user    |
| tags           | JSONB       | {complexity, fieldType} |
| recommendedFor | JSONB       | string[]                |
| estimatedTime  | TEXT        | "2-4 weeks"             |
| agentSupport   | TEXT        | Level of AI assistance  |
| sequenceOrder  | INTEGER     | Display order           |
| createdAt      | TIMESTAMP   |                         |
| updatedAt      | TIMESTAMP   |                         |

### workflowPathWorkflows

| Column         | Type                    | Notes              |
| -------------- | ----------------------- | ------------------ |
| id             | UUID PK                 |                    |
| workflowPathId | UUID FK → workflowPaths |                    |
| workflowId     | UUID FK → workflows     |                    |
| phase          | INTEGER                 | BMAD phase (0-4)   |
| sequenceOrder  | INTEGER                 | Order within phase |
| isOptional     | BOOLEAN                 |                    |
| isRecommended  | BOOLEAN                 |                    |
| createdAt      | TIMESTAMP               |                    |
| updatedAt      | TIMESTAMP               |                    |

---

## 5. Projects - KEEP

### projects

| Column                | Type                    | Notes                                  |
| --------------------- | ----------------------- | -------------------------------------- |
| id                    | UUID PK                 |                                        |
| name                  | TEXT                    | "Chiron"                               |
| path                  | TEXT                    | "/home/user/projects/chiron"           |
| status                | ENUM                    | initializing, active, archived, failed |
| userId                | TEXT FK → user          |                                        |
| initializerWorkflowId | UUID FK → workflows     |                                        |
| workflowPathId        | UUID FK → workflowPaths |                                        |
| executedVsPath        | JSONB                   | Tracking vs expected                   |
| createdAt             | TIMESTAMP               |                                        |
| updatedAt             | TIMESTAMP               |                                        |

### projectState

| Column             | Type                      | Notes              |
| ------------------ | ------------------------- | ------------------ |
| id                 | UUID PK                   |                    |
| projectId          | UUID FK → projects UNIQUE | One per project    |
| workflowPathId     | UUID FK → workflowPaths   |                    |
| currentPhase       | INTEGER                   | Current BMAD phase |
| currentWorkflowId  | UUID FK → workflows       |                    |
| completedWorkflows | JSONB                     | string[]           |
| createdAt          | TIMESTAMP                 |                    |
| updatedAt          | TIMESTAMP                 |                    |

---

## 6. Workflow Executions - MODIFY

### workflowExecutions

| Column                 | Type                     | Notes                                       |
| ---------------------- | ------------------------ | ------------------------------------------- |
| id                     | UUID PK                  |                                             |
| projectId              | UUID FK → projects       |                                             |
| workflowId             | UUID FK → workflows      |                                             |
| agentId                | UUID FK → agents         | Override agent                              |
| parentExecutionId      | UUID FK → self           | For nested workflows                        |
| parentStepExecutionId  | UUID FK → stepExecutions | **NEW** Which step invoked                  |
| status                 | ENUM                     | pending, running, paused, completed, failed |
| currentStepExecutionId | UUID FK → stepExecutions | **NEW** Current step                        |
| startedAt              | TIMESTAMP                |                                             |
| completedAt            | TIMESTAMP                |                                             |
| pausedAt               | TIMESTAMP                |                                             |
| error                  | TEXT                     |                                             |
| errorStepExecutionId   | UUID FK → stepExecutions | **NEW** Which step failed                   |
| createdAt              | TIMESTAMP                |                                             |
| updatedAt              | TIMESTAMP                |                                             |

**Removed columns:**

- ~~variables~~ → Now in `variables` table
- ~~executedSteps~~ → Now in `stepExecutions` table

### stepExecutions - NEW

| Column      | Type                         | Notes                                                |
| ----------- | ---------------------------- | ---------------------------------------------------- |
| id          | UUID PK                      |                                                      |
| executionId | UUID FK → workflowExecutions |                                                      |
| stepId      | UUID FK → workflowSteps      | Template step                                        |
| stepNumber  | INTEGER                      | Denormalized for queries                             |
| status      | ENUM                         | pending, running, paused, completed, skipped, failed |
| isStale     | BOOLEAN                      | Upstream variable changed                            |
| staleReason | TEXT                         | "tech_stack changed at step 1"                       |
| error       | TEXT                         |                                                      |
| branchTaken | TEXT                         | For branch steps                                     |
| startedAt   | TIMESTAMP                    |                                                      |
| completedAt | TIMESTAMP                    |                                                      |
| createdAt   | TIMESTAMP                    |                                                      |
| updatedAt   | TIMESTAMP                    |                                                      |

**Index:** (executionId, stepNumber)

---

## 7. Variables - NEW

### variables

| Column       | Type                         | Notes                     |
| ------------ | ---------------------------- | ------------------------- |
| id           | UUID PK                      |                           |
| executionId  | UUID FK → workflowExecutions |                           |
| name         | TEXT                         | "session_topic"           |
| currentValue | JSONB                        | VariableValue             |
| schema       | JSONB                        | VariableSchema (optional) |
| description  | TEXT                         |                           |
| createdAt    | TIMESTAMP                    |                           |
| updatedAt    | TIMESTAMP                    |                           |

**Unique constraint:** (executionId, name)

**VariableValue Type:**

```typescript
type VariableValue =
  | { type: "primitive"; value: string | number | boolean | null }
  | { type: "list"; items: VariableValue[] }
  | { type: "map"; entries: Record<string, VariableValue> }
  | { type: "workflow_ref"; workflowId: string }
  | { type: "artifact_ref"; artifactId: string }
  | { type: "file_ref"; path: string; gitRef?: string }
  | { type: "structured"; schemaId: string; data: Record<string, unknown> };
```

**VariableSchema Type:**

```typescript
{
  type: "string" | "number" | "boolean" | "array" | "object" | "enum" | "workflow_ref" | "artifact_ref"
  items?: VariableSchema           // For arrays
  properties?: Record<string, VariableSchema>  // For objects
  enum?: string[]                  // For enums
  required?: boolean
  default?: unknown
}
```

### variableHistory

| Column          | Type                     | Notes                                                        |
| --------------- | ------------------------ | ------------------------------------------------------------ |
| id              | UUID PK                  |                                                              |
| variableId      | UUID FK → variables      |                                                              |
| stepExecutionId | UUID FK → stepExecutions | Where change happened                                        |
| stepNumber      | INTEGER                  | Denormalized                                                 |
| previousValue   | JSONB                    | VariableValue                                                |
| newValue        | JSONB                    | VariableValue                                                |
| source          | ENUM                     | agent_tool, manual_edit, step_output, workflow_input, system |
| toolCallId      | TEXT                     | If from agent tool                                           |
| manualEditNote  | TEXT                     | If manual edit                                               |
| createdAt       | TIMESTAMP                |                                                              |

**Indexes:**

- (variableId, stepNumber)
- (stepExecutionId)

---

## 8. Artifacts - MODIFY

### projectArtifacts

| Column          | Type                         | Notes                              |
| --------------- | ---------------------------- | ---------------------------------- |
| id              | UUID PK                      |                                    |
| projectId       | UUID FK → projects           |                                    |
| templateId      | UUID FK → workflowTemplates  | **NEW**                            |
| executionId     | UUID FK → workflowExecutions | **NEW** Which execution created    |
| stepExecutionId | UUID FK → stepExecutions     | **NEW** Which step created         |
| name            | TEXT                         | "brainstorming-session-1"          |
| artifactType    | TEXT                         | "markdown"                         |
| status          | ENUM                         | **NEW** draft, published, archived |
| currentVersion  | INTEGER                      | **NEW** Latest snapshot version    |
| filePath        | TEXT                         | Set when published to filesystem   |
| gitCommitHash   | TEXT                         |                                    |
| metadata        | JSONB                        |                                    |
| createdAt       | TIMESTAMP                    |                                    |
| updatedAt       | TIMESTAMP                    |                                    |

**How artifacts work:**

1. Artifact references a `workflowTemplate` (the Handlebars template)
2. Artifact belongs to an `execution` (has access to its variables)
3. On view: resolve template with current execution variables
4. On publish: create snapshot with resolved content

### artifactSnapshots - NEW

| Column           | Type                       | Notes                                            |
| ---------------- | -------------------------- | ------------------------------------------------ |
| id               | UUID PK                    |                                                  |
| artifactId       | UUID FK → projectArtifacts |                                                  |
| version          | INTEGER                    | 1, 2, 3...                                       |
| resolvedContent  | TEXT                       | Full rendered content                            |
| variableSnapshot | JSONB                      | Record<string, VariableValue> - state at publish |
| filePath         | TEXT                       | If written to filesystem                         |
| gitCommitHash    | TEXT                       | If committed                                     |
| publishedBy      | TEXT                       | User ID or "workflow"                            |
| publishNote      | TEXT                       | "Published after review"                         |
| createdAt        | TIMESTAMP                  |                                                  |

**Unique constraint:** (artifactId, version)

---

## 9. Chat - NEW (Replaces dialogSessions)

### chatSessions

| Column          | Type                     | Notes                                                                       |
| --------------- | ------------------------ | --------------------------------------------------------------------------- |
| id              | UUID PK                  |                                                                             |
| stepExecutionId | UUID FK → stepExecutions |                                                                             |
| agentId         | UUID FK → agents         |                                                                             |
| status          | ENUM                     | active, completed, abandoned                                                |
| completionType  | ENUM                     | user_satisfied, all_tools_approved, confidence_threshold, max_turns, manual |
| isComplete      | BOOLEAN                  |                                                                             |
| tokenCount      | INTEGER                  | Total tokens used                                                           |
| createdAt       | TIMESTAMP                |                                                                             |
| updatedAt       | TIMESTAMP                |                                                                             |

### chatMessages

| Column          | Type                   | Notes                         |
| --------------- | ---------------------- | ----------------------------- |
| id              | UUID PK                |                               |
| sessionId       | UUID FK → chatSessions |                               |
| parentMessageId | UUID FK → self         | For branching                 |
| tangentId       | UUID FK → chatTangents | If part of tangent            |
| branchId        | UUID FK → chatBranches | If in a branch                |
| role            | ENUM                   | user, assistant, system, tool |
| content         | TEXT                   |                               |
| toolCalls       | JSONB                  | ToolCall[]                    |
| toolResults     | JSONB                  | ToolResult[]                  |
| contextMarker   | JSONB                  | ContextMarker                 |
| tokenCount      | INTEGER                |                               |
| createdAt       | TIMESTAMP              |                               |

**Indexes:**

- (sessionId, createdAt)
- (tangentId)

**ToolCall Type:**

```typescript
{
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}
```

**ToolResult Type:**

```typescript
{
  toolCallId: string;
  result: unknown;
  isError: boolean;
}
```

**ContextMarker Type:**

```typescript
{
  type: "variable_changed" | "step_stale" | "branch_point"
  variableName?: string
  previousValue?: VariableValue
  newValue?: VariableValue
  changedAtStep?: number
  branchReason?: string
}
```

### chatTangents

| Column           | Type                   | Notes                               |
| ---------------- | ---------------------- | ----------------------------------- |
| id               | UUID PK                |                                     |
| sessionId        | UUID FK → chatSessions |                                     |
| triggerMessageId | UUID FK → chatMessages | What started it                     |
| topic            | TEXT                   | "Testing Strategy"                  |
| status           | ENUM                   | active, resolved, abandoned         |
| outcome          | TEXT                   | "Use testcontainers"                |
| outcomeVariables | JSONB                  | string[] - Variables set in tangent |
| returnMessageId  | UUID FK → chatMessages | Where main thread resumed           |
| isCollapsed      | BOOLEAN                | UI state                            |
| createdAt        | TIMESTAMP              |                                     |
| resolvedAt       | TIMESTAMP              |                                     |

### chatBranches

| Column               | Type                   | Notes                     |
| -------------------- | ---------------------- | ------------------------- |
| id                   | UUID PK                |                           |
| sessionId            | UUID FK → chatSessions |                           |
| branchPointMessageId | UUID FK → chatMessages | Divergence point          |
| branchReason         | TEXT                   | "Try different approach"  |
| status               | ENUM                   | active, merged, abandoned |
| createdAt            | TIMESTAMP              |                           |
| mergedAt             | TIMESTAMP              |                           |

---

## 10. Tables to DROP

### dialogSessions - DROP

Replaced by `chatSessions`, `chatMessages`, `chatTangents`, `chatBranches`.

---

## 11. Tables to EVALUATE

These are for AX optimization. Keep if using online learning, drop if not.

### acePlaybooks

| Column       | Type               | Notes                  |
| ------------ | ------------------ | ---------------------- |
| id           | UUID PK            |                        |
| agentId      | UUID FK → agents   |                        |
| scope        | ENUM               | global, user, project  |
| userId       | TEXT FK → user     |                        |
| projectId    | UUID FK → projects |                        |
| playbook     | JSONB              | ACE playbook structure |
| version      | INTEGER            |                        |
| totalUpdates | INTEGER            |                        |

### trainingExamples

For AX GEPA optimization.

### optimizationRuns

For AX GEPA optimization.

### miproTrainingExamples

For MiPRO optimization.

---

## Entity Relationships

```
user ──────┬──────────────────────────────────────────────────┐
           │                                                  │
           ▼                                                  ▼
      appConfig                                           projects
                                                              │
                                                              │
agents ◄───────────────────────────┐                          │
   │                               │                          │
   │                               │                          ▼
   │                               │              workflowExecutions ◄──────┐
   │                               │                     │                  │
   │                               │         ┌───────────┴──────────┐       │
   │                               │         ▼                      ▼       │
   │                               │   stepExecutions ──────► variables     │
   │                               │         │                      │       │
   │                               │         │                      ▼       │
   │                               │         │            variableHistory   │
   │                               │         │                              │
   │                               │         ├──────────────────────────────┤
   │                               │         │                              │
   │                               │         ▼                              │
   │                               └──► chatSessions                        │
   │                                         │                              │
   │                                         ▼                              │
   │                                   chatMessages                         │
   │                                    │       │                           │
   │                                    ▼       ▼                           │
   │                             chatTangents  chatBranches                 │
   │                                                                        │
   └───────────────────────────────────────────────────────────────────────┘
                                        │
                                        │
workflows ◄─────────────────────────────┘
    │
    ├──► workflowSteps
    │
    └──► workflowTemplates ◄──── projectArtifacts ──► artifactSnapshots
```

---

## Migration Path

1. **Phase 1: Add new tables** (non-breaking)
   - Add `stepExecutions`, `variables`, `variableHistory`
   - Add `chatSessions`, `chatMessages`, `chatTangents`, `chatBranches`
   - Add `artifactSnapshots`
   - Modify `projectArtifacts` (add columns)

2. **Phase 2: Migrate data**
   - Extract `workflowExecutions.executedSteps` → `stepExecutions`
   - Extract `workflowExecutions.variables` → `variables`
   - Extract `dialogSessions.messages` → `chatMessages`

3. **Phase 3: Update code**
   - Update workflow engine to use new tables
   - Update variable resolver to use `variables` table
   - Update chat handlers to use new chat tables

4. **Phase 4: Cleanup** (breaking)
   - Remove deprecated columns from `workflowExecutions`
   - Drop `dialogSessions` table

---

## Open Questions

1. **Variable snapshots for step inputs/outputs** - Do we need a `variableSnapshots` table to capture full state at step boundaries, or is `variableHistory` sufficient?

2. **Artifact staleness** - How do we know when an artifact needs re-resolution? Options:
   - Track which variables the template uses (parse Handlebars)
   - Re-resolve on every view (simple but potentially slow)
   - Manual "refresh" action

3. **Chat branch merging** - When a branch is "merged", what happens to its messages? Move to main thread? Keep separate with marker?

4. **Optimization tables** - Are we using AX optimization? If not, drop `acePlaybooks`, `trainingExamples`, `optimizationRuns`, `miproTrainingExamples`.
