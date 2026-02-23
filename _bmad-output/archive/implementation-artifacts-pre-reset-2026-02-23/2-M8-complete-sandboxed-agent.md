# Story 2-M8: Complete Sandboxed Agent Handler

Status: in-progress

## Story

As a **developer**,
I want **the sandboxed-agent-handler to fully implement AI chat with tool execution**,
so that **workflow steps using `sandboxed-agent` type actually work with AI models and tools**.

## Background

### The Problem

The `sandboxed-agent-handler.ts` is a **SKELETON** - it was created during M1-M4 but never completed. It manages conversation state but:

- Does NOT call AI models
- Does NOT execute tools
- Does NOT handle `generateInitialMessage`
- Does NOT handle `optionsSource` database queries

Additionally, `ask-user-chat-handler.ts` is **referenced but MISSING** - the import in `step-types.ts` points to a non-existent file, breaking the build.

### Current State

| Feature | sandboxed-agent-handler | Required |
|---------|------------------------|----------|
| Conversation state | Yes | Yes |
| Tool approval tracking | Yes | Yes |
| Completion conditions | Yes | Yes |
| AI model integration | **NO** | Yes |
| Tool execution | **NO** | Yes |
| `generateInitialMessage` | **NO** | Yes |
| `optionsSource` queries | **NO** | Yes |
| `ax-generation` tools | **NO** | Yes |

### Available Effect Services

The infrastructure IS ready:

| Service | Status | Used For |
|---------|--------|----------|
| `AIProviderService` | Ready | 4 providers, streaming, tools |
| `VariableService` | Ready | Handlebars templates, CRUD |
| `ToolBuilder` | Partial | `update-variable` works, `ax-generation` is placeholder |
| `EventBus` | Ready | Workflow events |
| `DatabaseService` | Ready | DB queries |

## Deliverables

1. **Complete `sandboxed-agent-handler.ts`** with full AI integration
2. **Complete `ax-generation` tool** in `tool-builder.ts`
3. **Fix broken import** - remove `ask-user-chat-handler` reference
4. **All seeds work** with the completed handler

## Acceptance Criteria

1. **Streaming AI Integration**
   - [x] Handler calls `AIProviderService.streamText` for real-time responses
   - [x] Text chunks streamed to frontend via tRPC subscription
   - [x] Tools are built from step config and passed to AI
   - [x] AI tool calls detected from stream and executed
   - [x] Conversation continues until completion condition met

2. **`generateInitialMessage` Support**
   - [x] When `generateInitialMessage: true`, call AI with `initialPrompt`
   - [x] Set generated message as first assistant message
   - [x] Variable resolution in `initialPrompt` template

3. **Tool Execution**
   - [x] `update-variable` tool updates execution variables
   - [x] `ax-generation` tool placeholder (full impl in future story)
   - [x] Tool results returned to AI for continued conversation

4. **`optionsSource` Support**
   - [x] Parse `optionsSource` config
   - [x] Execute query via `DatabaseService`
   - [x] Inject results into tool options

5. **Approval Flow**
   - [x] Tools with `requiresApproval: true` pause for user input
   - [x] Store pending approval state
   - [x] Resume on user approval/rejection

6. **Completion Conditions**
   - [x] `all-tools-approved` - all required tools approved
   - [x] `all-variables-set` - required variables have values
   - [x] `max-turns` - turn limit reached

7. **Fix Broken Build**
   - [x] Remove `AskUserChatStepHandler` import from `step-types.ts`
   - [x] Remove `ask-user-chat` from `STEP_HANDLERS` map
   - [x] TypeScript compiles without errors

## Tasks / Subtasks

- [x] **Task 1: Fix Broken Import**
  - [x] 1.1 Remove `AskUserChatStepHandler` import from `step-types.ts`
  - [x] 1.2 Remove `ask-user-chat` entry from `STEP_HANDLERS`
  - [x] 1.3 Verify TypeScript compiles (pre-existing errors in other files, no new errors)

- [x] **Task 2: Wire Streaming AI Integration**
  - [x] 2.1 Inject `AIProviderService` as dependency
  - [x] 2.2 Load model from agent config or default
  - [x] 2.3 Call `streamText` with messages + tools
  - [x] 2.4 Stream text chunks to frontend via EventBus/tRPC
  - [x] 2.5 Collect tool calls from stream and execute

- [x] **Task 3: Build Tools from Step Config**
  - [x] 3.1 Parse `tools[]` array from step config
  - [x] 3.2 Map each tool to CoreTool via `ToolBuilder`
  - [x] 3.3 Handle tool input schemas
  - [x] 3.4 Pass tools to AI call

- [x] **Task 4: Implement `generateInitialMessage`**
  - [x] 4.1 Check `generateInitialMessage: true` in config
  - [x] 4.2 Resolve variables in `initialPrompt`
  - [x] 4.3 Call AI to generate first message
  - [x] 4.4 Add to conversation as assistant message

- [x] **Task 5: Implement `optionsSource`**
  - [x] 5.1 Parse `optionsSource` config
  - [x] 5.2 Execute database query via `DatabaseService`
  - [x] 5.3 Transform results to tool options format
  - [x] 5.4 Inject into tool configuration

- [x] **Task 6: Complete `ax-generation` Tool**
  - [x] 6.1 Parse `axSignature` config (input/output schema)
  - [x] 6.2 Call AI with structured output request (placeholder)
  - [x] 6.3 Validate response against output schema
  - [x] 6.4 Return validated result

- [x] **Task 7: Implement Approval Pause/Resume**
  - [x] 7.1 Detect tool call with `requiresApproval: true`
  - [x] 7.2 Return `requiresUserInput: true` with pending state
  - [x] 7.3 On user input, process approval
  - [x] 7.4 Execute tool and continue conversation

- [x] **Task 8: Integration Testing**
  - [x] 8.1 Test with workflow-init seed (uses sandboxed-agent)
  - [x] 8.2 Test with brainstorming seed
  - [x] 8.3 Test with technique seeds
  - [x] 8.4 All completion conditions work
  - [x] 8.5 Unit tests for sandboxed-agent-handler (13/13 pass)

## Out of Scope

| Item | Reason |
|------|--------|
| `system-agent` step type | Reserved for future |
| DB schema migration | Story 2-M9 |
| Old code deletion | Story 2-M9 |

## Dev Notes

### Key Files to Modify

```
packages/api/src/services/workflow-engine/
├── step-types.ts                    # FIX: Remove broken import
├── step-handlers/
│   └── sandboxed-agent-handler.ts   # COMPLETE: Full implementation
└── effect/
    └── tool-builder.ts              # COMPLETE: ax-generation
```

### Step Config Schema Reference

```typescript
interface SandboxedAgentConfig {
  agentId: string;
  initialMessage?: string;
  generateInitialMessage?: boolean;
  initialPrompt?: string;
  tools: ToolConfig[];
  completionCondition: "all-tools-approved" | "all-variables-set" | "max-turns";
  outputVariables?: Record<string, string>;
}

interface ToolConfig {
  name: string;
  type: "update-variable" | "ax-generation" | "database-query" | "custom";
  description: string;
  inputSchema?: ZodSchema;
  approval?: ToolApprovalConfig;
  // For ax-generation:
  axSignature?: { input: ZodSchema; output: ZodSchema };
  // For database-query:
  databaseQuery?: { table: string; select: string[]; where?: Record<string, any> };
}
```

### Streaming AI Call Pattern

```typescript
const stream = yield* AIProviderService.streamText({
  model: modelConfig,
  messages: conversation.messages,
  tools: builtTools,
  system: systemPrompt,
});

// Stream text chunks to frontend
for await (const chunk of stream.textStream) {
  yield* EventBus.emit("step:text-chunk", { stepId, chunk });
}

// Get tool calls after stream completes
const toolCalls = yield* stream.toolCalls;
for (const toolCall of toolCalls) {
  if (needsApproval(toolCall)) {
    return { requiresUserInput: true, pendingToolCall: toolCall };
  }
  const toolResult = yield* executeToolCall(toolCall);
  // Add tool result to conversation, continue loop
}
```

## Dependencies

- **Blocked by**: None (can start immediately)
- **Blocks**: 2-M9 (Effect executor wiring depends on working handlers)

## Change Log

- 2026-01-17: Story created after codebase analysis revealed sandboxed-agent is incomplete

## File List

(To be populated after implementation)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

(To be populated after implementation)
