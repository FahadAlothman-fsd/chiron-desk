# WORKFLOW ENGINE

Core execution engine. Orchestrates step-by-step workflow processing with state management, event emission, and variable resolution.

## STRUCTURE

```
workflow-engine/
├── executor.ts           # Main loop: executeWorkflow → continueExecution
├── step-registry.ts      # Handler lookup (singleton)
├── step-types.ts         # STEP_HANDLERS map + StepType union
├── step-handler.ts       # StepHandler interface, StepResult type
├── step-handlers/        # Handler implementations
│   ├── ask-user-handler.ts
│   ├── ask-user-chat-handler.ts
│   ├── display-output-handler.ts
│   ├── execute-action-handler.ts
│   └── invoke-workflow-handler.ts
├── tools/                # Mastra tools for ask-user-chat
│   ├── update-variable-tool.ts
│   ├── database-query-tool.ts
│   ├── ax-generation-tool.ts
│   └── custom/           # Domain-specific tools
├── execution-context.ts  # 4-level variable precedence
├── variable-resolver.ts  # Handlebars template resolution
├── event-bus.ts          # Lifecycle events (singleton)
├── workflow-loader.ts    # DB fetch + validation
└── state-manager.ts      # State persistence helpers
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add step handler | `step-handlers/*.ts` + `step-types.ts` | Implement StepHandler, register in STEP_HANDLERS |
| Add Mastra tool | `tools/*.ts` | Used by ask-user-chat handler |
| Debug variable resolution | `variable-resolver.ts` | Handlebars + 4-level precedence |
| Trace execution flow | `executor.ts` | executeWorkflow → continueExecution loop |
| Subscribe to events | `event-bus.ts` | workflowEventBus.subscribeToExecution() |

## PATTERNS

### Add New Step Handler

```typescript
// 1. step-handlers/my-handler.ts
export class MyStepHandler implements StepHandler {
  async executeStep(step: WorkflowStep, context: ExecutionContext, userInput?: unknown): Promise<StepResult> {
    return {
      output: { key: "value" },           // Merged into execution variables
      nextStepNumber: step.nextStepNumber, // null = workflow ends
      requiresUserInput: false,            // true = pause execution
    };
  }
}

// 2. step-types.ts - add to STEP_HANDLERS map
export const STEP_HANDLERS = {
  ...existing,
  "my-step": new MyStepHandler(),
} as const;
```

### Add New Tool (for ask-user-chat)

```typescript
// tools/my-tool.ts
export async function buildMyTool(config: ToolConfig, context: ExecutionContext) {
  return createTool({
    id: config.name,
    description: "...",
    inputSchema: z.object({ ... }),
    execute: async ({ context }) => ({ ... }),
  });
}
```

### Variable Resolution

```typescript
// Template: "Hello {{project_name}}"
// Precedence: System > Execution > StepOutputs > Defaults
resolveVariables(template, context);  // → "Hello MyProject"
```

## ANTI-PATTERNS

- **Switch on stepType**: Use registry pattern, NOT switch statements
- **Direct DB in handlers**: Use executor's mergeExecutionVariables for state
- **Skip StepResult.requiresUserInput**: Must return true for pause/wait states
- **Ignore MAX_STEP_EXECUTIONS**: 100-step limit prevents infinite loops
- **Manual event emission**: Use workflowEventBus helpers
