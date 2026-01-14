# WORKFLOW ENGINE

Core execution engine. Orchestrates step-by-step workflow processing with state management, event emission, and variable resolution. Uses Effect + AI-SDK for all AI interactions.

## STRUCTURE

```
workflow-engine/
├── executor.ts           # Main loop: executeWorkflow → continueExecution
├── step-registry.ts      # Handler lookup (singleton)
├── step-types.ts         # STEP_HANDLERS map + StepType union
├── step-handler.ts       # StepHandler interface, StepResult type
├── step-handlers/        # Handler implementations
│   ├── ask-user-handler.ts
│   ├── sandboxed-agent-handler.ts  # AI-SDK based agent interactions
│   ├── display-output-handler.ts
│   ├── execute-action-handler.ts
│   └── invoke-workflow-handler.ts
├── effect/               # Effect service layer
│   ├── ai-provider-service.ts      # Multi-provider AI (OpenRouter, OpenCode, Anthropic, OpenAI)
│   ├── config-service.ts
│   └── variable-service.ts
├── execution-context.ts  # 4-level variable precedence
├── variable-resolver.ts  # Handlebars template resolution
├── event-bus.ts          # Lifecycle events (singleton)
├── workflow-loader.ts    # DB fetch + validation
└── state-manager.ts      # State persistence helpers
```

## WHERE TO LOOK

| Task                      | File                                   | Notes                                                |
| ------------------------- | -------------------------------------- | ---------------------------------------------------- |
| Add step handler          | `step-handlers/*.ts` + `step-types.ts` | Implement StepHandler, register in STEP_HANDLERS     |
| Configure AI provider     | `effect/ai-provider-service.ts`        | 4 providers: openrouter, opencode, anthropic, openai |
| Debug variable resolution | `variable-resolver.ts`                 | Handlebars + 4-level precedence                      |
| Trace execution flow      | `executor.ts`                          | executeWorkflow → continueExecution loop             |
| Subscribe to events       | `event-bus.ts`                         | workflowEventBus.subscribeToExecution()              |

## PATTERNS

### Add New Step Handler

```typescript
// 1. step-handlers/my-handler.ts
export class MyStepHandler implements StepHandler {
  async executeStep(
    step: WorkflowStep,
    context: ExecutionContext,
    userInput?: unknown,
  ): Promise<StepResult> {
    return {
      output: { key: "value" }, // Merged into execution variables
      nextStepNumber: step.nextStepNumber, // null = workflow ends
      requiresUserInput: false, // true = pause execution
    };
  }
}

// 2. step-types.ts - add to STEP_HANDLERS map
export const STEP_HANDLERS = {
  ...existing,
  "my-step": new MyStepHandler(),
} as const;
```

### AI Provider Usage

```typescript
// Use AIProviderService from Effect layer
const model =
  yield *
  aiProvider.loadModel({
    provider: "openrouter", // or "opencode", "anthropic", "openai"
    modelId: "anthropic/claude-sonnet-4-20250514",
  });

const result =
  yield *
  aiProvider.generateText({
    model,
    messages: [{ role: "user", content: "Hello" }],
  });
```

### Variable Resolution

```typescript
// Template: "Hello {{project_name}}"
// Precedence: System > Execution > StepOutputs > Defaults
resolveVariables(template, context); // → "Hello MyProject"
```

## ANTI-PATTERNS

- **Switch on stepType**: Use registry pattern, NOT switch statements
- **Direct DB in handlers**: Use executor's mergeExecutionVariables for state
- **Skip StepResult.requiresUserInput**: Must return true for pause/wait states
- **Ignore MAX_STEP_EXECUTIONS**: 100-step limit prevents infinite loops
- **Manual event emission**: Use workflowEventBus helpers
- **Direct AI SDK calls**: Use AIProviderService for consistent provider handling
