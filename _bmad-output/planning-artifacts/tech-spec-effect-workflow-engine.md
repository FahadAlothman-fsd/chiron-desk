# Tech Spec: Effect-Native Workflow Engine with AI-SDK Integration

**Date:** 2026-01-10
**Author:** BMAD Correct Course Workflow
**Status:** APPROVED
**Epic:** 2 (Migration Stories 2-M1 through 2-M4)

---

## Executive Summary

This tech spec defines the architecture for migrating Chiron's workflow engine from Mastra-based implementation to an Effect-native design with AI-SDK integration. The migration addresses the variable resolution bug blocking Story 2-3 while establishing a cleaner foundation for remaining features.

**Key Changes:**
- Workflow executor as Effect program (not wrapped async)
- Step handlers as Effect Services
- AI-SDK for LLM integration with streaming
- Effect Scope for workflow lifecycle management
- Effect PubSub for event-driven architecture
- Typed variable system with parent-child propagation

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Step Types Taxonomy](#2-step-types-taxonomy)
3. [Tool Types Taxonomy](#3-tool-types-taxonomy)
4. [Effect Service Architecture](#4-effect-service-architecture)
5. [AI-SDK Integration](#5-ai-sdk-integration)
6. [Variable System](#6-variable-system)
7. [Streaming Architecture](#7-streaming-architecture)
8. [Error Handling](#8-error-handling)
9. [Chiron Agent (Meta-Helper)](#9-chiron-agent-meta-helper)
10. [System-Agent UI Integration](#10-system-agent-ui-integration)
11. [Kanban & Executions Views](#11-kanban--executions-views)
12. [Migration Stories](#12-migration-stories)

---

## 1. Architecture Overview

### Current State (Mastra-based)

```
┌─────────────────────────────────────────────────────────┐
│                    Workflow Executor                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ async/await │  │  try/catch  │  │  JSONB state    │  │
│  │    loops    │  │   errors    │  │  (variables)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    Step Handlers                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  ask-user-chat: 1567 lines, HEAVY Mastra dependency ││
│  │  - Mastra threads for chat history                  ││
│  │  - Mastra createTool for tools                      ││
│  │  - Custom approval gate logic                       ││
│  └─────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│                    Variable Resolution                   │
│  ┌─────────────────────────────────────────────────────┐│
│  │  4-level merge + Handlebars                         ││
│  │  JSONB blob in workflowExecutions                   ││
│  │  BUG: Parent-child propagation broken               ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Target State (Effect + AI-SDK)

```
┌─────────────────────────────────────────────────────────┐
│              Effect Runtime (Main Layer)                 │
├─────────────────────────────────────────────────────────┤
│                    Services (Effect)                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │ DatabaseSvc  │ │ VariableSvc  │ │ WorkflowEventBus │ │
│  │   (Drizzle)  │ │ (typed+hist) │ │    (PubSub)      │ │
│  └──────────────┘ └──────────────┘ └──────────────────┘ │
├─────────────────────────────────────────────────────────┤
│              Workflow Executor (Effect.gen)              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │ Scope-based  │ │ Fiber-based  │ │ Stream-based     │ │
│  │  lifecycle   │ │  parallelism │ │   events         │ │
│  └──────────────┘ └──────────────┘ └──────────────────┘ │
├─────────────────────────────────────────────────────────┤
│              Step Handlers (Effect Services)             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │  user-form   │ │  sandboxed-  │ │  system-agent    │ │
│  │              │ │    agent     │ │   (OpenCode)     │ │
│  │              │ │  (AI-SDK)    │ │                  │ │
│  └──────────────┘ └──────────────┘ └──────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │   execute-   │ │   invoke-    │ │     branch       │ │
│  │    action    │ │   workflow   │ │                  │ │
│  └──────────────┘ └──────────────┘ └──────────────────┘ │
├─────────────────────────────────────────────────────────┤
│              AI-SDK Integration                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │  streamText  │ │    tools     │ │  Effect Stream   │ │
│  │ generateObj  │ │  (AI-SDK)    │ │   integration    │ │
│  └──────────────┘ └──────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Step Types Taxonomy

### Final Step Types (7)

| Step Type | Purpose | AI? | Implementation |
|-----------|---------|-----|----------------|
| **user-form** | Structured input with validation | No | Effect Service |
| **sandboxed-agent** | AI chat with tools, approval gates | Yes (AI-SDK) | Effect + AI-SDK |
| **system-agent** | Full computer access | Yes (OpenCode) | Effect + OpenCode |
| **execute-action** | Backend operations (file, git, db) | No | Effect Service |
| **invoke-workflow** | Parent-child workflow orchestration | No | Effect Scoped |
| **display-output** | Show content, wait for acknowledgment | No | Effect Service |
| **branch** | Conditional routing | Optional | Effect Service |

### Step Type Details

#### user-form (was: ask-user)

```typescript
interface UserFormConfig {
  fields: FormField[]
  submitLabel?: string
  cancelable?: boolean
}

interface FormField {
  name: string
  type: "text" | "number" | "boolean" | "choice" | "path"
  label: string
  required?: boolean
  validation?: ValidationRule[]
  options?: ChoiceOption[]  // For choice type
}

// Effect Service
const UserFormHandler = Effect.Service<StepHandler>()("UserFormHandler", {
  effect: Effect.gen(function* () {
    return {
      stepType: "user-form",
      execute: (step, userInput) => Effect.gen(function* () {
        const config = step.config as UserFormConfig
        
        if (!userInput) {
          // First call - return form spec, wait for input
          return {
            output: { formSpec: config.fields },
            nextStepNumber: null,
            requiresUserInput: true,
          }
        }
        
        // Validate input
        const validated = yield* validateFormInput(userInput, config.fields)
        
        return {
          output: validated,
          nextStepNumber: step.stepNumber + 1,
          requiresUserInput: false,
        }
      })
    }
  })
})
```

#### sandboxed-agent (was: ask-user-chat)

```typescript
interface SandboxedAgentConfig {
  agentId: string
  systemPrompt?: string
  tools: ToolConfig[]
  completionCondition: CompletionCondition
  maxSteps?: number
  allowAgentInputs?: boolean  // Agent can add JIT inputs to tool calls
}

interface CompletionCondition {
  type: "all-variables-set" | "all-tools-approved" | "explicit-done" | "custom"
  variables?: string[]  // For all-variables-set
  customCheck?: string  // Expression for custom
}

// See Section 5 for full AI-SDK implementation
```

#### system-agent (NEW - for OpenCode)

```typescript
interface SystemAgentConfig {
  workdir: string
  contextArtifacts: string[]  // Artifact IDs to include
  allowedOperations: ("file" | "git" | "bash" | "browser")[]
  mcpServers?: string[]  // Additional MCP servers
}

// Implementation deferred to Epic 5
// Will use OpenCode programmatic API + Chiron MCP server
```

#### execute-action

```typescript
interface ExecuteActionConfig {
  actions: Action[]
  executionMode: "sequential" | "parallel"
  requiresConfirmation?: boolean
}

type Action =
  | { type: "set-variable"; variable: string; value: unknown; path?: string }
  | { type: "file"; operation: "mkdir" | "write" | "delete"; path: string; content?: string }
  | { type: "git"; operation: "init" | "commit" | "branch"; options: GitOptions }
  | { type: "database"; operation: "insert" | "update" | "delete"; table: string; data: unknown }

const ExecuteActionHandler = Effect.Service<StepHandler>()("ExecuteActionHandler", {
  effect: Effect.gen(function* () {
    const variableService = yield* VariableService
    const eventBus = yield* WorkflowEventBus
    
    return {
      stepType: "execute-action",
      execute: (step, userInput) => Effect.gen(function* () {
        const config = step.config as ExecuteActionConfig
        const context = yield* ExecutionContext
        
        // Confirmation gate
        if (config.requiresConfirmation && !userInput?.confirmed) {
          return {
            output: { pendingActions: config.actions },
            nextStepNumber: null,
            requiresUserInput: true,
          }
        }
        
        // Execute actions
        const results = config.executionMode === "parallel"
          ? yield* Effect.forEach(config.actions, executeAction, { concurrency: "unbounded" })
          : yield* Effect.forEach(config.actions, executeAction, { concurrency: 1 })
        
        return {
          output: { actionResults: results },
          nextStepNumber: step.stepNumber + 1,
          requiresUserInput: false,
        }
      })
    }
  }),
  dependencies: [VariableService.Default, WorkflowEventBus.Default]
})
```

#### invoke-workflow

```typescript
interface InvokeWorkflowConfig {
  workflowId: string
  variableMapping: Record<string, string>  // parent var -> child var
  aggregateInto: string  // Variable to store child outputs
  executionMode: "sequential" | "parallel"  // For multiple children
  expectedOutputVariable?: string
}

const InvokeWorkflowHandler = Effect.Service<StepHandler>()("InvokeWorkflowHandler", {
  effect: Effect.gen(function* () {
    const variableService = yield* VariableService
    const workflowExecutor = yield* WorkflowExecutor
    
    return {
      stepType: "invoke-workflow",
      execute: (step) => Effect.gen(function* () {
        const config = step.config as InvokeWorkflowConfig
        const parentContext = yield* ExecutionContext
        
        // Map parent variables to child inputs
        const childInputs = yield* mapVariables(
          parentContext.variables,
          config.variableMapping
        )
        
        // Execute child in scoped context (KEY FIX!)
        const childResult = yield* Effect.scoped(
          Effect.gen(function* () {
            // Create child execution with parent reference
            const childExecution = yield* workflowExecutor.createChildExecution({
              workflowId: config.workflowId,
              parentExecutionId: parentContext.executionId,
              inputs: childInputs,
            })
            
            // Run child workflow
            const result = yield* workflowExecutor.runToCompletion(childExecution.id)
            
            return result
          })
        )
        
        // Propagate child outputs back to parent (THE BUG FIX!)
        yield* variableService.merge(parentContext.executionId, {
          [config.aggregateInto]: childResult.outputs,
        })
        
        return {
          output: { childResult },
          nextStepNumber: step.stepNumber + 1,
          requiresUserInput: false,
        }
      })
    }
  }),
  dependencies: [VariableService.Default, WorkflowExecutor.Default]
})
```

#### display-output

```typescript
interface DisplayOutputConfig {
  template: string  // Handlebars template
  requiresAcknowledgment: boolean
  displayType: "markdown" | "json" | "artifact-preview"
}

const DisplayOutputHandler = Effect.Service<StepHandler>()("DisplayOutputHandler", {
  effect: Effect.gen(function* () {
    const variableService = yield* VariableService
    
    return {
      stepType: "display-output",
      execute: (step, userInput) => Effect.gen(function* () {
        const config = step.config as DisplayOutputConfig
        const context = yield* ExecutionContext
        
        // Resolve template
        const content = yield* variableService.resolveTemplate(
          config.template,
          context.executionId
        )
        
        if (config.requiresAcknowledgment && !userInput?.acknowledged) {
          return {
            output: { displayContent: content, displayType: config.displayType },
            nextStepNumber: null,
            requiresUserInput: true,
          }
        }
        
        return {
          output: { displayContent: content },
          nextStepNumber: step.stepNumber + 1,
          requiresUserInput: false,
        }
      })
    }
  }),
  dependencies: [VariableService.Default]
})
```

#### branch

```typescript
interface BranchConfig {
  conditionType: "expression" | "llm"
  condition: string  // JS expression or LLM prompt
  trueStepNumber: number
  falseStepNumber: number
}

const BranchHandler = Effect.Service<StepHandler>()("BranchHandler", {
  effect: Effect.gen(function* () {
    const variableService = yield* VariableService
    
    return {
      stepType: "branch",
      execute: (step) => Effect.gen(function* () {
        const config = step.config as BranchConfig
        const context = yield* ExecutionContext
        
        const result = config.conditionType === "expression"
          ? yield* evaluateExpression(config.condition, context.variables)
          : yield* evaluateWithLLM(config.condition, context)
        
        return {
          output: { branchTaken: result ? "true" : "false", condition: config.condition },
          nextStepNumber: result ? config.trueStepNumber : config.falseStepNumber,
          requiresUserInput: false,
        }
      })
    }
  }),
  dependencies: [VariableService.Default]
})
```

---

## 3. Tool Types Taxonomy

### Tool Types (3)

Tools are capabilities exposed to `sandboxed-agent` for interacting with the workflow system.

| Tool Type | Purpose | Approval Modes |
|-----------|---------|----------------|
| **update-variable** | Set workflow variable | none, text, selector |
| **ax-generation** | Structured LLM output with AX | none, text, selector |
| **snapshot-artifact** | Save artifact version | none, text |

**Note:** Artifact refinement/updates use the `correct-course` workflow pattern (BMAD methodology), not freeform tools. This keeps artifact changes structured and intentional with proper audit trail.

### Input Source Types (5)

How tools get dynamic data for their inputs:

| Source | Description | Example |
|--------|-------------|---------|
| **variable** | From workflow variable | `{ type: "variable", path: "project.name" }` |
| **literal** | Hardcoded value | `{ type: "literal", value: "greenfield" }` |
| **database** | Dynamic DB query | `{ type: "database", query: "SELECT...", params: [...] }` |
| **context** | Chat history | `{ type: "context", maxMessages: 10 }` |
| **artifact** | Project artifact | `{ type: "artifact", artifactId: "...", section?: "..." }` |

### Approval Modes (Enhanced)

| Mode | User Actions | Feedback Capture |
|------|--------------|------------------|
| **none** | N/A | N/A |
| **text** | Approve / Edit & Approve / Reject | Edit diff, rejection reason |
| **selector** | Accept AI choice / Select different | Selection + reason for override |

Feedback is stored for AX optimization - user corrections become training data.

### Tool Configuration Schema

```typescript
interface ToolConfig {
  id: string  // Unique tool instance ID
  type: "update-variable" | "ax-generation" | "snapshot-artifact"
  name: string  // Display name
  description: string  // For AI to understand when to use
  config: UpdateVariableConfig | AxGenerationConfig | SnapshotArtifactConfig
  allowAgentInputs?: boolean  // Agent can add JIT inputs
}

interface UpdateVariableConfig {
  targetVariable: string
  valueSchema: ValueSchema  // Zod-like schema definition
  inputSources?: Record<string, InputSource>  // Pre-populate from sources
  approval: ApprovalConfig
}

interface AxGenerationConfig {
  signature: string  // DSPy signature: "input1, input2 -> output1, output2"
  strategy: "ChainOfThought" | "Predict"
  inputSources: Record<string, InputSource>
  outputFields: OutputFieldConfig[]
  approval: ApprovalConfig
  playbook?: string  // AX playbook ID for optimization
}

interface SnapshotArtifactConfig {
  artifactVariable: string  // Variable containing artifact content
  targetPath: string  // Where to save (resolved)
  commitMessage?: string  // Template for commit message
  approval: ApprovalConfig
}

interface ApprovalConfig {
  mode: "none" | "text" | "selector"
  selectorOptions?: SelectorOption[]  // For selector mode
  editableFields?: string[]  // Which fields can be edited in text mode
}

interface SelectorOption {
  value: string
  label: string
  description?: string
  source?: InputSource  // Dynamic options from DB, etc.
}
```

### Agent JIT Inputs

When `allowAgentInputs: true`, the agent can provide additional inputs at tool call time:

```typescript
// Tool definition
{
  type: "ax-generation",
  config: {
    signature: "project_description, project_type -> level, reasoning",
    inputSources: {
      project_description: { type: "variable", path: "project.description" },
      project_type: { type: "variable", path: "project.type" },
    },
    allowAgentInputs: true,  // Enable JIT inputs
  }
}

// Agent's tool call
{
  name: "classify-level",
  arguments: {
    // Config inputs resolved automatically from sources
    // Agent adds JIT inputs:
    additional_context: "User mentioned tight deadline, hackathon project",
    override_hints: "Prioritize speed over completeness",
  }
}

// Merged inputs to AX
{
  project_description: "...",  // From variable
  project_type: "software",    // From variable
  additional_context: "...",   // From agent JIT
  override_hints: "...",       // From agent JIT
}
```

---

## 4. Effect Service Architecture

### Core Services

```typescript
// Database Service - wraps Drizzle
const DatabaseService = Effect.Service<{
  readonly db: DrizzleDB
  readonly transaction: <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | DatabaseError, R>
}>()("DatabaseService", {
  scoped: Effect.acquireRelease(
    Effect.sync(() => ({ db: drizzleDb, transaction: ... })),
    () => Effect.sync(() => console.log("DB cleanup"))
  )
})

// Variable Service - typed variables with history
const VariableService = Effect.Service<{
  readonly get: (executionId: string, name: string) => Effect.Effect<Variable, VariableNotFoundError>
  readonly set: (executionId: string, name: string, value: unknown, source: string) => Effect.Effect<void, VariableError>
  readonly merge: (executionId: string, values: Record<string, unknown>) => Effect.Effect<void, VariableError>
  readonly resolveTemplate: (template: string, executionId: string) => Effect.Effect<string, VariableError>
  readonly getHistory: (variableId: string) => Effect.Effect<VariableHistory[], VariableError>
}>()("VariableService", {
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService
    // Implementation...
  }),
  dependencies: [DatabaseService.Default]
})

// Execution Context - scoped to workflow execution
const ExecutionContext = Effect.Service<{
  readonly executionId: string
  readonly workflowId: string
  readonly projectId: string
  readonly parentExecutionId: string | null
  readonly variables: Record<string, unknown>
  readonly currentStepNumber: number
}>()("ExecutionContext", {
  // Created per-execution, not global
})

// Workflow Event Bus - PubSub for events
type WorkflowEvent =
  | { _tag: "WorkflowStarted"; executionId: string }
  | { _tag: "StepStarted"; stepNumber: number; stepType: string }
  | { _tag: "StepCompleted"; stepNumber: number; output: unknown }
  | { _tag: "ToolCallStarted"; toolName: string }
  | { _tag: "ToolCallCompleted"; toolName: string; result: unknown }
  | { _tag: "TextChunk"; chunk: string }
  | { _tag: "ApprovalRequested"; toolName: string; value: unknown }
  | { _tag: "WorkflowCompleted"; outputs: unknown }
  | { _tag: "WorkflowError"; error: WorkflowError }

const WorkflowEventBus = Effect.Service<{
  readonly publish: (event: WorkflowEvent) => Effect.Effect<void>
  readonly subscribe: () => Effect.Effect<Stream.Stream<WorkflowEvent>>
}>()("WorkflowEventBus", {
  scoped: Effect.gen(function* () {
    const pubsub = yield* Effect.acquireRelease(
      PubSub.bounded<WorkflowEvent>(256),
      (ps) => PubSub.shutdown(ps)
    )
    
    return {
      publish: (event) => PubSub.publish(pubsub, event),
      subscribe: () => Effect.sync(() => Stream.fromPubSub(pubsub)),
    }
  })
})
```

### Workflow Executor

```typescript
const WorkflowExecutor = Effect.Service<{
  readonly start: (projectId: string, workflowId: string, inputs: Record<string, unknown>) => Effect.Effect<Execution, WorkflowError>
  readonly continue: (executionId: string, userInput?: unknown) => Effect.Effect<Execution, WorkflowError>
  readonly pause: (executionId: string) => Effect.Effect<void, WorkflowError>
  readonly cancel: (executionId: string) => Effect.Effect<void, WorkflowError>
  readonly createChildExecution: (opts: ChildExecutionOpts) => Effect.Effect<Execution, WorkflowError>
  readonly runToCompletion: (executionId: string) => Effect.Effect<ExecutionResult, WorkflowError>
}>()("WorkflowExecutor", {
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService
    const variableService = yield* VariableService
    const eventBus = yield* WorkflowEventBus
    const stepRegistry = yield* StepHandlerRegistry
    
    const executeStep = (step: WorkflowStep) => Effect.gen(function* () {
      yield* eventBus.publish({ _tag: "StepStarted", stepNumber: step.stepNumber, stepType: step.stepType })
      
      const handler = yield* stepRegistry.getHandler(step.stepType)
      const result = yield* handler.execute(step).pipe(
        Effect.timeout("5 minutes"),
        Effect.retry(Schedule.exponential("1 second").pipe(Schedule.jittered, Schedule.upTo("30 seconds"))),
        Effect.catchTag("TimeoutException", () => 
          Effect.fail(new StepTimeoutError({ stepId: step.id, timeout: 300000 }))
        )
      )
      
      yield* eventBus.publish({ _tag: "StepCompleted", stepNumber: step.stepNumber, output: result.output })
      
      return result
    })
    
    const runStepLoop = (execution: Execution) => Effect.gen(function* () {
      let currentStep = yield* getNextStep(execution)
      let loopCount = 0
      const MAX_STEPS = 100
      
      while (currentStep && loopCount < MAX_STEPS) {
        const result = yield* executeStep(currentStep)
        
        if (result.requiresUserInput) {
          // Pause and wait for user
          yield* updateExecutionStatus(execution.id, "waiting_for_input")
          return { status: "waiting", pendingStep: currentStep }
        }
        
        // Update step execution record
        yield* recordStepExecution(execution.id, currentStep, result)
        
        // Get next step
        currentStep = result.nextStepNumber 
          ? yield* getStepByNumber(execution.workflowId, result.nextStepNumber)
          : null
        
        loopCount++
      }
      
      if (loopCount >= MAX_STEPS) {
        yield* Effect.fail(new MaxStepsExceededError({ executionId: execution.id }))
      }
      
      return { status: "completed" }
    })
    
    return {
      start: (projectId, workflowId, inputs) => Effect.scoped(
        Effect.gen(function* () {
          // Create execution record
          const execution = yield* Effect.acquireRelease(
            createExecution(projectId, workflowId, inputs),
            (exec) => finalizeExecution(exec)  // Cleanup on scope close
          )
          
          yield* eventBus.publish({ _tag: "WorkflowStarted", executionId: execution.id })
          
          // Initialize variables from inputs
          yield* Effect.forEach(
            Object.entries(inputs),
            ([name, value]) => variableService.set(execution.id, name, value, "input")
          )
          
          // Run step loop
          const result = yield* runStepLoop(execution)
          
          if (result.status === "completed") {
            yield* eventBus.publish({ _tag: "WorkflowCompleted", outputs: execution.variables })
          }
          
          return execution
        })
      ),
      
      continue: (executionId, userInput) => Effect.gen(function* () {
        const execution = yield* getExecution(executionId)
        const pendingStep = yield* getPendingStep(execution)
        
        // Execute pending step with user input
        const handler = yield* stepRegistry.getHandler(pendingStep.stepType)
        const result = yield* handler.execute(pendingStep, userInput)
        
        // Continue step loop
        // ...
      }),
      
      // Other methods...
    }
  }),
  dependencies: [
    DatabaseService.Default,
    VariableService.Default,
    WorkflowEventBus.Default,
    StepHandlerRegistry.Default,
  ]
})
```

---

## 5. AI-SDK Integration

### Provider Setup

```typescript
import { anthropic } from "@ai-sdk/anthropic"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

const AIProviderService = Effect.Service<{
  readonly getModel: (modelId: string) => LanguageModel
}>()("AIProviderService", {
  effect: Effect.gen(function* () {
    const config = yield* ConfigService
    
    const openrouter = createOpenRouter({
      apiKey: config.openrouterApiKey,
    })
    
    return {
      getModel: (modelId) => {
        if (modelId.startsWith("anthropic/")) {
          return anthropic(modelId.replace("anthropic/", ""))
        }
        return openrouter(modelId)
      }
    }
  }),
  dependencies: [ConfigService.Default]
})
```

### Sandboxed Agent Handler (Full Implementation)

```typescript
import { streamText, tool, generateText } from "ai"
import { z } from "zod"

const SandboxedAgentHandler = Effect.Service<StepHandler>()("SandboxedAgentHandler", {
  effect: Effect.gen(function* () {
    const variableService = yield* VariableService
    const eventBus = yield* WorkflowEventBus
    const aiProvider = yield* AIProviderService
    const chatService = yield* ChatService
    
    // Build AI-SDK tools from config
    const buildTools = (toolConfigs: ToolConfig[]) => Effect.gen(function* () {
      const tools: Record<string, ReturnType<typeof tool>> = {}
      
      for (const config of toolConfigs) {
        tools[config.id] = yield* buildTool(config)
      }
      
      return tools
    })
    
    const buildTool = (config: ToolConfig) => Effect.gen(function* () {
      switch (config.type) {
        case "update-variable":
          return tool({
            description: config.description,
            parameters: buildZodSchema(config.config.valueSchema),
            execute: async (args) => {
              // Handle approval if needed
              if (config.config.approval.mode !== "none") {
                return {
                  status: "awaiting_approval",
                  value: args,
                  approvalMode: config.config.approval.mode,
                }
              }
              // Direct execution
              await Effect.runPromise(
                variableService.set(
                  executionId,
                  config.config.targetVariable,
                  args,
                  `tool:${config.id}`
                )
              )
              return { status: "completed", value: args }
            }
          })
        
        case "ax-generation":
          return tool({
            description: config.description,
            parameters: buildAxInputSchema(config.config),
            execute: async (args, { abortSignal }) => {
              // Resolve input sources
              const inputs = await Effect.runPromise(
                resolveInputSources(config.config.inputSources, executionId)
              )
              
              // Merge with agent JIT inputs if allowed
              const mergedInputs = config.allowAgentInputs
                ? { ...inputs, ...args }
                : inputs
              
              // Run AX generation
              const result = await runAxGeneration(
                config.config,
                mergedInputs,
                abortSignal
              )
              
              // Handle approval
              if (config.config.approval.mode !== "none") {
                return {
                  status: "awaiting_approval",
                  value: result,
                  approvalMode: config.config.approval.mode,
                  selectorOptions: config.config.approval.selectorOptions,
                }
              }
              
              return { status: "completed", value: result }
            }
          })
        
        case "snapshot-artifact":
          return tool({
            description: config.description,
            parameters: z.object({
              content: z.string().describe("Artifact content to snapshot"),
              commitMessage: z.string().optional(),
            }),
            execute: async (args) => {
              // Handle approval
              if (config.config.approval.mode !== "none") {
                return {
                  status: "awaiting_approval",
                  value: args,
                  approvalMode: config.config.approval.mode,
                }
              }
              
              // Save snapshot
              await Effect.runPromise(
                snapshotArtifact(config.config.targetPath, args.content, args.commitMessage)
              )
              
              return { status: "completed", path: config.config.targetPath }
            }
          })
      }
    })
    
    return {
      stepType: "sandboxed-agent",
      
      execute: (step, userInput) => Effect.gen(function* () {
        const config = step.config as SandboxedAgentConfig
        const context = yield* ExecutionContext
        
        // Handle approval response
        if (userInput?.approvalResponse) {
          yield* handleApprovalResponse(userInput.approvalResponse, config)
          // Check if we can continue
          const isComplete = yield* checkCompletion(config.completionCondition, context)
          if (isComplete) {
            return {
              output: yield* collectStepOutputs(context.executionId, step.id),
              nextStepNumber: step.stepNumber + 1,
              requiresUserInput: false,
            }
          }
        }
        
        // Handle user message
        if (userInput?.message) {
          yield* chatService.addMessage(context.executionId, step.id, {
            role: "user",
            content: userInput.message,
          })
        }
        
        // Build tools
        const tools = yield* buildTools(config.tools)
        
        // Get chat history
        const messages = yield* chatService.getMessages(context.executionId, step.id)
        
        // Get model
        const model = aiProvider.getModel(config.modelId ?? "anthropic/claude-sonnet-4-20250514")
        
        // Stream response
        const result = yield* Effect.tryPromise(() =>
          streamText({
            model,
            system: config.systemPrompt,
            messages,
            tools,
            maxSteps: config.maxSteps ?? 10,
            onStepFinish: async ({ toolCalls, toolResults }) => {
              // Emit events for UI
              for (const tc of toolCalls) {
                await Effect.runPromise(
                  eventBus.publish({ _tag: "ToolCallCompleted", toolName: tc.toolName, result: tc })
                )
              }
              
              // Check for approval requests
              for (const tr of toolResults) {
                if (tr.result?.status === "awaiting_approval") {
                  await Effect.runPromise(
                    eventBus.publish({
                      _tag: "ApprovalRequested",
                      toolName: tr.toolName,
                      value: tr.result.value,
                    })
                  )
                }
              }
            }
          })
        )
        
        // Stream text to UI
        const textStream = Stream.fromAsyncIterable(
          result.textStream,
          (e) => new AgentStreamError({ cause: e })
        )
        
        yield* Stream.runForEach(textStream, (chunk) =>
          eventBus.publish({ _tag: "TextChunk", chunk })
        )
        
        // Save assistant message
        const fullText = await result.text
        yield* chatService.addMessage(context.executionId, step.id, {
          role: "assistant",
          content: fullText,
          toolCalls: await result.toolCalls,
        })
        
        // Check for pending approvals
        const pendingApprovals = yield* getPendingApprovals(context.executionId, step.id)
        if (pendingApprovals.length > 0) {
          return {
            output: { pendingApprovals },
            nextStepNumber: null,
            requiresUserInput: true,
          }
        }
        
        // Check completion
        const isComplete = yield* checkCompletion(config.completionCondition, context)
        
        return {
          output: { response: fullText },
          nextStepNumber: isComplete ? step.stepNumber + 1 : null,
          requiresUserInput: !isComplete,
        }
      })
    }
  }),
  dependencies: [
    VariableService.Default,
    WorkflowEventBus.Default,
    AIProviderService.Default,
    ChatService.Default,
  ]
})
```

### Approval Handling with Feedback

```typescript
interface ApprovalResponse {
  toolCallId: string
  decision: "approve" | "edit" | "reject" | "select-different"
  editedValue?: unknown  // For edit mode
  selectedValue?: unknown  // For selector mode
  feedback?: string  // Reason for rejection or different selection
}

const handleApprovalResponse = (response: ApprovalResponse, config: SandboxedAgentConfig) =>
  Effect.gen(function* () {
    const variableService = yield* VariableService
    const context = yield* ExecutionContext
    
    const toolConfig = config.tools.find(t => t.id === response.toolCallId)
    if (!toolConfig) {
      yield* Effect.fail(new ToolNotFoundError({ toolId: response.toolCallId }))
    }
    
    switch (response.decision) {
      case "approve":
        // Store the value
        yield* storeToolResult(toolConfig, response.originalValue)
        break
      
      case "edit":
        // Store edited value + capture diff for AX training
        yield* storeToolResult(toolConfig, response.editedValue)
        yield* captureTrainingExample({
          toolId: toolConfig.id,
          originalValue: response.originalValue,
          correctedValue: response.editedValue,
          type: "edit",
        })
        break
      
      case "reject":
        // Capture rejection for AX training
        yield* captureTrainingExample({
          toolId: toolConfig.id,
          originalValue: response.originalValue,
          feedback: response.feedback,
          type: "rejection",
        })
        // Mark tool for regeneration
        yield* markForRegeneration(response.toolCallId, response.feedback)
        break
      
      case "select-different":
        // Store selected value + capture override for AX training
        yield* storeToolResult(toolConfig, response.selectedValue)
        yield* captureTrainingExample({
          toolId: toolConfig.id,
          aiChoice: response.originalValue,
          userChoice: response.selectedValue,
          feedback: response.feedback,
          type: "override",
        })
        break
    }
  })
```

---

## 6. Variable System

### Database Schema

```sql
-- Typed variables (replaces JSONB blob)
CREATE TABLE variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value JSONB NOT NULL,
  value_schema JSONB,  -- Zod-like schema for validation
  source TEXT NOT NULL,  -- "input", "step:N", "tool:xyz", "user"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(execution_id, name)
);

-- Variable history for audit trail
CREATE TABLE variable_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
  previous_value JSONB,
  new_value JSONB NOT NULL,
  source TEXT NOT NULL,
  step_number INTEGER,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_variables_execution ON variables(execution_id);
CREATE INDEX idx_variable_history_variable ON variable_history(variable_id);
CREATE INDEX idx_variable_history_changed ON variable_history(changed_at);
```

### Variable Service Implementation

```typescript
const VariableService = Effect.Service<{
  readonly get: (executionId: string, name: string) => Effect.Effect<Variable, VariableNotFoundError>
  readonly set: (executionId: string, name: string, value: unknown, source: string) => Effect.Effect<void, VariableError>
  readonly merge: (executionId: string, values: Record<string, unknown>) => Effect.Effect<void, VariableError>
  readonly resolveTemplate: (template: string, executionId: string) => Effect.Effect<string, VariableError>
  readonly getHistory: (variableId: string) => Effect.Effect<VariableHistory[], VariableError>
  readonly propagateToParent: (childExecutionId: string, variableNames: string[]) => Effect.Effect<void, VariableError>
}>()("VariableService", {
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService
    const eventBus = yield* WorkflowEventBus
    
    return {
      get: (executionId, name) => Effect.gen(function* () {
        const result = yield* Effect.tryPromise(() =>
          db.db.query.variables.findFirst({
            where: and(
              eq(variables.executionId, executionId),
              eq(variables.name, name)
            )
          })
        )
        
        if (!result) {
          yield* Effect.fail(new VariableNotFoundError({ executionId, name }))
        }
        
        return result
      }),
      
      set: (executionId, name, value, source) => Effect.gen(function* () {
        const existing = yield* Effect.tryPromise(() =>
          db.db.query.variables.findFirst({
            where: and(
              eq(variables.executionId, executionId),
              eq(variables.name, name)
            )
          })
        )
        
        if (existing) {
          // Update + record history
          yield* Effect.tryPromise(() =>
            db.db.transaction(async (tx) => {
              // Record history
              await tx.insert(variableHistory).values({
                variableId: existing.id,
                previousValue: existing.value,
                newValue: value,
                source,
              })
              
              // Update variable
              await tx.update(variables)
                .set({ value, source, updatedAt: new Date() })
                .where(eq(variables.id, existing.id))
            })
          )
        } else {
          // Insert new
          yield* Effect.tryPromise(() =>
            db.db.insert(variables).values({
              executionId,
              name,
              value,
              source,
            })
          )
        }
        
        // Emit event
        yield* eventBus.publish({
          _tag: "VariableChanged",
          executionId,
          name,
          value,
          source,
        })
      }),
      
      merge: (executionId, values) => Effect.gen(function* () {
        yield* Effect.forEach(
          Object.entries(values),
          ([name, value]) => this.set(executionId, name, value, "merge"),
          { concurrency: 1 }  // Sequential to maintain order
        )
      }),
      
      resolveTemplate: (template, executionId) => Effect.gen(function* () {
        // Get all variables for execution
        const vars = yield* Effect.tryPromise(() =>
          db.db.query.variables.findMany({
            where: eq(variables.executionId, executionId)
          })
        )
        
        // Build context object
        const context = vars.reduce((acc, v) => {
          acc[v.name] = v.value
          return acc
        }, {} as Record<string, unknown>)
        
        // Add system variables
        const execution = yield* getExecution(executionId)
        context.execution_id = executionId
        context.project_id = execution.projectId
        context.date = new Date().toISOString().split("T")[0]
        context.timestamp = Date.now()
        
        // Compile and execute Handlebars template
        const compiled = Handlebars.compile(template)
        return compiled(context)
      }),
      
      // KEY FIX: Parent-child variable propagation
      propagateToParent: (childExecutionId, variableNames) => Effect.gen(function* () {
        const childExecution = yield* getExecution(childExecutionId)
        
        if (!childExecution.parentExecutionId) {
          return  // No parent, nothing to propagate
        }
        
        for (const name of variableNames) {
          const childVar = yield* this.get(childExecutionId, name)
          yield* this.set(
            childExecution.parentExecutionId,
            name,
            childVar.value,
            `child:${childExecutionId}`
          )
        }
      }),
    }
  }),
  dependencies: [DatabaseService.Default, WorkflowEventBus.Default]
})
```

---

## 7. Streaming Architecture

### Effect Stream + AI-SDK Integration

```typescript
// Unified stream type for all step outputs
type StepStream = Stream.Stream<StepStreamEvent, StepError, never>

type StepStreamEvent =
  | { _tag: "Text"; chunk: string }
  | { _tag: "ToolCall"; name: string; args: unknown }
  | { _tag: "ToolResult"; name: string; result: unknown }
  | { _tag: "ApprovalRequest"; toolName: string; value: unknown; mode: ApprovalMode }
  | { _tag: "Progress"; percent: number; message: string }
  | { _tag: "Done"; output: unknown }

// Convert AI-SDK stream to Effect Stream
const aiSdkToEffectStream = (result: StreamTextResult<...>) =>
  Stream.async<StepStreamEvent, AgentStreamError>((emit) => {
    const textStream = result.textStream[Symbol.asyncIterator]()
    
    const pump = async () => {
      try {
        while (true) {
          const { value, done } = await textStream.next()
          if (done) {
            emit.end()
            break
          }
          emit.single({ _tag: "Text", chunk: value })
        }
      } catch (e) {
        emit.fail(new AgentStreamError({ cause: e }))
      }
    }
    
    pump()
  })

// Broadcast to multiple consumers (UI, logging, persistence)
const broadcastStream = (stream: StepStream) => Effect.gen(function* () {
  const hub = yield* Stream.toHub(stream, { capacity: 256 })
  
  return {
    // UI consumer
    forUI: () => Stream.fromHub(hub),
    // Persistence consumer
    forPersistence: () => Stream.fromHub(hub).pipe(
      Stream.filter((e) => e._tag === "Done" || e._tag === "ToolResult")
    ),
    // Logging consumer
    forLogging: () => Stream.fromHub(hub).pipe(
      Stream.tap((e) => Effect.sync(() => console.log("Stream event:", e._tag)))
    ),
  }
})
```

### tRPC Subscription Integration

```typescript
// In tRPC router
export const workflowRouter = router({
  streamExecution: publicProcedure
    .input(z.object({ executionId: z.string() }))
    .subscription(async function* ({ input, ctx }) {
      const eventBus = yield* Effect.runPromise(
        Effect.provide(WorkflowEventBus, mainLayer)
      )
      
      const stream = yield* Effect.runPromise(eventBus.subscribe())
      
      for await (const event of Stream.toAsyncIterable(stream)) {
        yield event
      }
    }),
})
```

---

## 8. Error Handling

### Tagged Errors

```typescript
import { Data } from "effect"

// Workflow errors
class WorkflowNotFoundError extends Data.TaggedError("WorkflowNotFoundError")<{
  workflowId: string
}> {}

class ExecutionNotFoundError extends Data.TaggedError("ExecutionNotFoundError")<{
  executionId: string
}> {}

class MaxStepsExceededError extends Data.TaggedError("MaxStepsExceededError")<{
  executionId: string
  maxSteps: number
}> {}

// Step errors
class StepTimeoutError extends Data.TaggedError("StepTimeoutError")<{
  stepId: string
  timeout: number
}> {}

class StepValidationError extends Data.TaggedError("StepValidationError")<{
  stepId: string
  field: string
  message: string
}> {}

class UnknownStepTypeError extends Data.TaggedError("UnknownStepTypeError")<{
  stepType: string
}> {}

// Variable errors
class VariableNotFoundError extends Data.TaggedError("VariableNotFoundError")<{
  executionId: string
  name: string
}> {}

class VariableValidationError extends Data.TaggedError("VariableValidationError")<{
  name: string
  expected: string
  received: string
}> {}

// Agent errors
class AgentStreamError extends Data.TaggedError("AgentStreamError")<{
  cause: unknown
}> {}

class ToolExecutionError extends Data.TaggedError("ToolExecutionError")<{
  toolName: string
  cause: unknown
}> {}

class ApprovalRejectedError extends Data.TaggedError("ApprovalRejectedError")<{
  toolName: string
  feedback: string
}> {}

// Union type for handlers
type WorkflowError =
  | WorkflowNotFoundError
  | ExecutionNotFoundError
  | MaxStepsExceededError

type StepError =
  | StepTimeoutError
  | StepValidationError
  | UnknownStepTypeError

type VariableError =
  | VariableNotFoundError
  | VariableValidationError

type AgentError =
  | AgentStreamError
  | ToolExecutionError
  | ApprovalRejectedError
```

### Error Recovery Patterns

```typescript
// Retry with exponential backoff
const withRetry = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.retry(
      Schedule.exponential("1 second").pipe(
        Schedule.jittered,
        Schedule.upTo("30 seconds"),
        Schedule.whileInput((e) => isRetryable(e))
      )
    )
  )

// Timeout with custom error
const withTimeout = <A, E, R>(effect: Effect.Effect<A, E, R>, duration: Duration.Duration) =>
  effect.pipe(
    Effect.timeout(duration),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new StepTimeoutError({ stepId: "unknown", timeout: Duration.toMillis(duration) }))
    )
  )

// Catch specific errors
const handleStepErrors = <A, R>(effect: Effect.Effect<A, StepError, R>) =>
  effect.pipe(
    Effect.catchTag("StepTimeoutError", (e) =>
      Effect.gen(function* () {
        yield* logError(e)
        yield* markStepFailed(e.stepId, "timeout")
        yield* Effect.fail(e)
      })
    ),
    Effect.catchTag("StepValidationError", (e) =>
      Effect.gen(function* () {
        yield* logError(e)
        // Validation errors might be recoverable with user input
        return { requiresUserInput: true, error: e }
      })
    )
  )
```

---

## 9. Chiron Agent (Meta-Helper)

### Overview

The Chiron Agent is a project-level assistant available at any time, not tied to any specific workflow. It helps users with:
- "What should I do next?"
- "Where am I in the project?"
- "Help me understand this workflow"
- "Show me the status of my epics"

### UI Access

**Primary:** Command Palette (Cmd+K → "Ask Chiron...")

Opens a dialog with full chat interface. Has access to:
- Project state (epics, stories, artifacts)
- Workflow execution statuses
- Sprint status
- BMAD methodology knowledge

### Implementation (Deferred to Post-MVP)

```typescript
// Chiron Agent is a special sandboxed-agent with project-wide context
interface ChironAgentConfig {
  projectId: string
  contextSources: [
    { type: "database", query: "SELECT * FROM epics WHERE project_id = ?" },
    { type: "database", query: "SELECT * FROM stories WHERE project_id = ?" },
    { type: "database", query: "SELECT * FROM workflow_executions WHERE project_id = ? AND status = 'active'" },
    { type: "artifact", path: "_bmad-output/implementation-artifacts/sprint-status.yaml" },
  ]
  tools: [
    { type: "ax-generation", config: { signature: "question, context -> answer, suggested_action" } },
  ]
}
```

---

## 10. System-Agent UI Integration

### Overview

Unlike `sandboxed-agent` which is fully interactive, `system-agent` (OpenCode) has a hybrid model:
- **Can run autonomously** (Ralph Wiggum style - no interruptions)
- **But output streams to Chiron UI** (user has visibility)
- **User can interact** if they want (send messages, intervene)
- **External access** via "Open in Terminal" button

### UI Components

```
┌─────────────────────────────────────────────────────────────────┐
│  System Agent: Dev-Story 2.3                      [Running ●]   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  SESSION OUTPUT (streaming from OpenCode)                   ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │  > Reading story-2-3.md...                                  ││
│  │  > Analyzing acceptance criteria...                         ││
│  │  > Creating test file: executor.test.ts                     ││
│  │  > Running tests... 3/5 passing                             ││
│  │  > Fixing assertion in test #4...                           ││
│  │  █                                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Type a message to OpenCode...                          [↵] ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [Open in Terminal ↗]  [Copy Session Command]  [Stop Session]   │
└─────────────────────────────────────────────────────────────────┘
```

### Features

1. **Streaming Output:** Real-time view of OpenCode's work
2. **Message Input:** User can send messages to guide/correct
3. **Open in Terminal:** Copies `opencode session attach <session_id>` command
4. **Copy Session Command:** For advanced users who want CLI access
5. **Stop Session:** Graceful termination

### Implementation Notes

- OpenCode session managed via its programmatic API
- Output captured and streamed via Effect Stream to UI
- MCP server provides OpenCode access to Chiron resources:
  - `chiron://variables/{execution_id}/{name}`
  - `chiron://artifacts/{artifact_id}`
  - `chiron://story/{story_id}` (including todos)

---

## 11. Kanban & Executions Views

### Kanban View (Stories Only)

The Kanban is specifically for **story management**, not general workflow executions.

```
┌─────────────────────────────────────────────────────────────────┐
│  STORY KANBAN                                [Filter: Epic 2 ▼] │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│   BACKLOG   │   DRAFTED   │ IN PROGRESS │   REVIEW    │  DONE   │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────┤
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │             │┌───────┐│
│ │Story 2.4│ │ │Story 2.5│ │ │Story 2.3│ │             ││Story  ││
│ │         │ │ │         │ │ │         │ │             ││ 2.2   ││
│ │Epic 2   │ │ │Epic 2   │ │ │Epic 2   │ │             ││       ││
│ └─────────┘ │ └─────────┘ │ └─────────┘ │             │└───────┘│
└─────────────┴─────────────┴─────────────┴─────────────┴─────────┘
```

**Features:**
- Filter by Epic
- Click card → View story artifact
- Drag-and-drop state transitions
- Epic artifact viewable in sidebar when filtered

### Executions Table (All Workflows)

Separate view for tracking all workflow executions.

```
┌─────────────────────────────────────────────────────────────────┐
│  WORKFLOW EXECUTIONS                           [Filter ▼] [⟳]  │
├──────────┬────────────────┬──────────┬──────────┬───────────────┤
│ ID       │ Workflow       │ Status   │ Duration │ Actions       │
├──────────┼────────────────┼──────────┼──────────┼───────────────┤
│ exec-123 │ Brainstorming  │ ● Active │ 2m       │ [View] [Stop] │
│ exec-122 │ Dev-Story 2.3  │ ● Running│ 15m      │ [View]        │
│ exec-121 │ PRD Generation │ ✓ Done   │ 1h 23m   │ [View]        │
│ exec-120 │ Workflow-Init  │ ✓ Done   │ 45m      │ [View]        │
└──────────┴────────────────┴──────────┴──────────┴───────────────┘
```

**Features:**
- Filter by status, workflow type
- View opens execution detail (steps, variables, chat)
- Active executions can be stopped

---

## 12. Migration Stories

### Story 2-M1: Effect Foundation (~4-5 days)

**2-M1a: Effect Runtime + Core Services (1-2 days)**
- [ ] Install `effect`, `@effect/platform`, `@effect/schema`
- [ ] Configure Effect runtime in server entry point
- [ ] Create `DatabaseService` Layer wrapping Drizzle
- [ ] Create `ConfigService` Layer for app configuration
- [ ] Document Layer composition pattern

**2-M1b: Effect Error Types + Patterns (1 day)**
- [ ] Define tagged error classes (WorkflowError, StepError, VariableError, AgentError)
- [ ] Create error recovery utilities (withRetry, withTimeout)
- [ ] Document error handling conventions

**2-M1c: Effect Workflow Primitives (2 days)**
- [ ] Create `ExecutionContext` as Effect Service
- [ ] Create `WorkflowEventBus` as PubSub
- [ ] Create `StepHandlerRegistry` as Effect Service
- [ ] Refactor executor main loop to `Effect.gen` with `Scope`

### Story 2-M2: Variable System (~3-4 days)

- [ ] Create `variables` table (typed, with schema)
- [ ] Create `variable_history` table (audit trail)
- [ ] Implement `VariableService` with Effect CRUD
- [ ] Implement `resolveTemplate` with Handlebars
- [ ] Implement `propagateToParent` for child workflows (THE BUG FIX!)
- [ ] Migration script from JSONB to typed tables
- [ ] Update executor to use new variable system

### Story 2-M3: AI-SDK Integration (~4-5 days)

- [ ] Install `ai`, `@ai-sdk/anthropic`, `@openrouter/ai-sdk-provider`
- [ ] Create `AIProviderService` (model provider abstraction)
- [ ] Create `ChatService` (own message storage, not Mastra threads)
- [ ] Implement AI-SDK tool builder from tool configs
- [ ] Implement streaming with Effect Stream integration
- [ ] Implement approval handling with feedback capture
- [ ] Connect streaming to tRPC subscriptions

### Story 2-M4: Step Handler Migration (~4-5 days)

- [ ] Rename `ask-user` → `user-form` + Effect wrap
- [ ] Rename `ask-user-chat` → `sandboxed-agent` + full AI-SDK rewrite
- [ ] Effect wrap: `execute-action`
- [ ] Effect wrap + bug fix: `invoke-workflow`
- [ ] Effect wrap: `display-output`
- [ ] Implement: `branch` handler
- [ ] Remove placeholders: `llm-generate`, `approval-checkpoint`, `question-set`
- [ ] Update `step-types.ts` enum
- [ ] Update `step-registry.ts`

### Story 2-3: invoke-workflow (UNBLOCKED) (~1-2 days)

- [ ] Verify parent-child variable propagation works
- [ ] Test nested workflow execution
- [ ] Update tests

---

## Appendix A: File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/api/src/services/workflow-engine/executor.ts` | REWRITE | Effect-native execution |
| `packages/api/src/services/workflow-engine/variable-resolver.ts` | REPLACE | Use VariableService |
| `packages/api/src/services/workflow-engine/step-types.ts` | UPDATE | New step type enum |
| `packages/api/src/services/workflow-engine/step-registry.ts` | UPDATE | Effect Service pattern |
| `packages/api/src/services/workflow-engine/step-handlers/*.ts` | REWRITE | Effect Services |
| `packages/api/src/services/workflow-engine/tools/*.ts` | REWRITE | AI-SDK tool format |
| `packages/api/src/services/effect/*.ts` | NEW | Core Effect services |
| `packages/api/src/services/ai/*.ts` | NEW | AI-SDK integration |
| `packages/api/src/services/chat/*.ts` | NEW | Chat message storage |
| `packages/db/src/schema/variables.ts` | NEW | Variable tables |
| `packages/db/src/schema/chat.ts` | NEW | Chat tables |

---

## Appendix B: Dependencies

```json
{
  "dependencies": {
    "effect": "^3.x",
    "@effect/platform": "^0.x",
    "@effect/schema": "^0.x",
    "ai": "^4.x",
    "@ai-sdk/anthropic": "^1.x",
    "@openrouter/ai-sdk-provider": "^0.x",
    "@ax-llm/ax": "^x.x"
  }
}
```

---

**Document Generated:** 2026-01-10
**Status:** Ready for implementation
**Next:** Update Sprint Change Proposal with these details
