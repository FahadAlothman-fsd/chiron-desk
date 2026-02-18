# Chiron Workflow Engine Structure

**Date:** 2025-11-04
**Status:** Architecture Defined - Ready for Tool Research
**Phase:** 3-Solutioning

---

## Overview

Chiron's workflow engine is **NOT** a migration of BMAD's file-based system. It is a native, structured workflow model where:

- Workflows are **structured data** (not markdown/YAML files)
- Step types map **directly to UI components**
- **Chat patterns** are first-class workflow primitives
- **LLM** gets structured prompts and returns typed outputs
- **Engine** enforces boundaries, persistence, and multi-agent coordination

---

## Core Workflow Model

```typescript
type Workflow = {
  id: string
  name: string
  displayName: string
  agentId: string              // References agents table

  pattern: WorkflowPattern     // Uses chat patterns!

  outputArtifact?: {
    type: string
    templateId: string
  }

  inputs: WorkflowInput[]
  outputs: WorkflowOutput[]
}
```

---

## The 4 Chat Patterns (Workflow Primitives)

### 1. Sequential Dependencies
Linear workflow with step-by-step execution.

**Example:** workflow-init (project creation wizard)

```typescript
type SequentialDependenciesPattern = {
  type: "sequential-dependencies"
  steps: WorkflowStep[]
}
```

### 2. Parallel Independence
Multiple independent tasks executing concurrently.

**Example:** Multi-agent dashboard (multiple agents on different epics)

### 3. Structured Exploration
Branching options based on context or user choice.

**Example:** product-brief (ask if research needed, branch to research workflow)

```typescript
type StructuredExplorationPattern = {
  type: "structured-exploration"
  rootStep: WorkflowStep
  branches: {
    condition: string
    subPattern: WorkflowPattern
  }[]
}
```

### 4. Focused Dialogs
Single-topic deep dive with back-and-forth.

**Example:** Artifact editing chat

---

## Step Type System

### AskUserStep
User input with choices and validation.

```typescript
type AskUserStep = {
  type: "ask-user"
  question: string

  choices?: {
    type: "single" | "multiple"
    options: Choice[]
  }

  responseType: "boolean" | "string" | "number" | "choice"
  responseVariable: string
  validation?: ValidationRules
}
```

**UI Mapping:**
- Boolean → Yes/No buttons
- Choice → Button group or dropdown
- String → Text input
- Number → Number input

---

### LLMGenerateStep
LLM content generation with structured I/O.

```typescript
type LLMGenerateStep = {
  type: "llm-generate"
  llmTask: LLMTask
  contextVariables: string[]
  outputVariable: string
  streaming?: boolean
}

type LLMTask =
  | StructuredGenerationTask  // ax/DSPy signatures
  | FreeformGenerationTask    // AI SDK prompts
  | ClassificationTask         // Multi-class decisions
  | ExtractionTask            // Schema-based extraction
```

**UI Mapping:**
- Loading indicator
- Streaming output (if enabled)
- Editable result

---

### CheckConditionStep
Conditional branching with concrete or abstract evaluation.

```typescript
type CheckConditionStep = {
  type: "check-condition"
  condition: ConcreteCondition | AbstractCondition
  ifTrue: WorkflowPattern
  ifFalse?: WorkflowPattern
}

// Concrete: Engine evaluates (fast, deterministic)
type ConcreteCondition = {
  type: "concrete"
  expression: { variable: string, operator: "==", value: any }
}

// Abstract: LLM evaluates (flexible, context-aware)
type AbstractCondition = {
  type: "abstract"
  description: string
  contextVariables: string[]
}
```

**UI Mapping:**
- Decision point visualization
- Shows which branch was taken

---

### ApprovalCheckpointStep
Template output with user approval flow.

```typescript
type ApprovalCheckpointStep = {
  type: "approval-checkpoint"
  content: string
  artifact?: {
    type: string
    savePath: string
  }
}
```

**UI Mapping:**
- Split view: content | chat
- Approve/Reject/Edit buttons
- Version history

---

### ExecuteActionStep
System operations (database, file, git).

```typescript
type ExecuteActionStep = {
  type: "execute-action"
  action: SystemAction
}

type SystemAction =
  | DatabaseOperation
  | FileOperation
  | GitOperation
```

**UI Mapping:**
- Background task indicator
- Progress/completion status

---

### InvokeWorkflowStep
Cross-workflow/cross-module composition.

```typescript
type InvokeWorkflowStep = {
  type: "invoke-workflow"
  targetWorkflow: string
  parameters: Record<string, string>
  mode?: string
}
```

**UI Mapping:**
- Nested workflow indicator
- Breadcrumb navigation

---

### DisplayOutputStep
Rich markdown rendering for user communication.

```typescript
type DisplayOutputStep = {
  type: "display-output"
  content: string  // Markdown with {{variables}}
}
```

**UI Mapping:**
- Chat message
- Rich markdown rendering

---

## Agent Model

Agents are first-class database entities.

```typescript
type Agent = {
  id: string
  name: string
  displayName: string
  description: string
  role: string

  llmConfig: {
    provider: "anthropic" | "openrouter" | "openai"
    model: string
    temperature?: number
  }

  tools?: AgentTool[]
  mcpServers?: string[]

  color?: string
  avatar?: string
}
```

---

## Example: workflow-init

**Pattern:** Sequential Dependencies (10 steps)

**Key Steps:**
1. Ask project name (AskUserStep)
2. Ask description (AskUserStep)
3. Ask project type (AskUserStep with choices)
4. Ask field type (AskUserStep with choices)
5. **LLM classifies level** (LLMGenerateStep - Classification)
6. Confirm level with user (DisplayOutputStep + AskUserStep - Boolean)
7. Manual override if rejected (AskUserStep with choices)
8. Finalize config (LLMGenerateStep - Structured)
9. Create project (ExecuteActionStep - Database)
10. Show next steps (DisplayOutputStep)

**Guardrails:**
- User can override LLM's level classification
- Validation on project name (kebab-case regex)

---

## Tool Research Requirements

### For Effect
- Can it manage multi-agent concurrent execution?
- Resource management for git worktrees, DB connections
- Error handling for workflow failures
- Cancellation of long-running LLM calls

### For AI SDK (Vercel)
- Multi-provider support (OpenRouter, Anthropic)
- Streaming for real-time UI updates
- Structured outputs (Zod schemas)
- Tool calling for workflow decisions

### For Mastra
- Agent orchestration with custom tools
- Workflow graphs matching our patterns
- Memory management across executions
- Integration with simple-git, Drizzle

### For ax (DSPy TypeScript)
- TypeScript support and maturity
- Anthropic/OpenRouter provider support
- Signature-based structured I/O
- Streaming compatibility
- Prompt optimization

---

## Next Steps

1. ✅ Structure defined
2. ⏭️ Research tools (Effect, AI SDK, Mastra, ax)
3. ⏭️ Prototype: workflow-init with chosen tool stack
4. ⏭️ Validate: Can execute end-to-end
5. ⏭️ Implement: Epic 1 Story 1.1 (Database Schema)

---

_Document Created: 2025-11-04_
