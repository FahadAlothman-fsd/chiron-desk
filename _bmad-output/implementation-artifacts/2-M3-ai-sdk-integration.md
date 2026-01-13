# Story 2-M3: AI-SDK Integration

## Story

- **Title:** AI-SDK Integration with Effect Services
- **As a** workflow execution engine
- **I want** native AI-SDK integration with Effect-based services
- **So that** AI agent interactions use direct streaming, own message storage, and typed tool execution without Mastra dependency

## Status

| Field            | Value                                         |
| ---------------- | --------------------------------------------- |
| **Epic**         | Epic 2: Artifact Workbench + Migration Foundation |
| **Status**       | Done                                          |
| **Story Points** | 15                                            |
| **Priority**     | High (blocks 2-M4, 2-M5)                      |
| **Risk Level**   | Medium                                        |

## Context & Background

### Why This Story Exists

Story 2-M2 delivered the Effect-based VariableService with full database persistence. This story continues the migration by replacing Mastra's AI/chat infrastructure with direct AI-SDK integration. This is the critical path for:

1. **Removing Mastra Dependency** - Mastra's PostgresStore uses separate 'mastra' schema and opaque thread management
2. **Enabling Streaming** - AI-SDK's `streamText()` async iterables integrate cleanly with Effect PubSub
3. **Typed Tool Execution** - Build tools from `ToolConfig` schema with proper validation
4. **Own Message Storage** - ChatService manages conversation history in our schema with full audit trail

### Current State (What Exists)

1. **ModelLoader** (`packages/api/src/services/mastra/model-loader.ts`):
   - Already wraps `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@openrouter/ai-sdk-provider`
   - Has `loadModel(config)` returning AI-SDK model
   - Includes `createOpenRouterFetchWithFix()` for malformed tool_calls
   - Parses 'provider:modelId' format

2. **MastraService** (to be replaced):
   - Uses `@mastra/core` + `PostgresStore` in 'mastra' schema
   - Manages threads via `createThread()`, `getThread()`, `getThreadMessages()`
   - Storage handles conversation history automatically

3. **DialogSessions Table** (existing):
   - Has `messages` JSONB array of `{role, content, timestamp}`
   - Tied to `executionId` and `questionId`
   - Can be extended for ChatService or replaced with dedicated tables

4. **Effect Infrastructure** (from 2-M1, 2-M2):
   - `MainLayer` with DatabaseService, ConfigService, WorkflowEventBus, StepHandlerRegistry, VariableService
   - PubSub bounded queue (256 sliding) for events
   - Tagged errors and retry utilities

### Target State

```
┌─────────────────────────────────────────────────────────────────┐
│                      AIProviderService                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ loadModel()     │  │ streamText()    │  │ generateText()  │ │
│  │ (wrap existing) │  │ (async iter)    │  │ (single call)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ChatService                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ createSession() │  │ addMessage()    │  │ getHistory()    │ │
│  │ getSession()    │  │ streamResponse()│  │ persistStream() │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ToolBuilder                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ fromToolConfig()│  │ update-variable │  │ ax-generation   │ │
│  │ (Zod schemas)   │  │ tool            │  │ tool            │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Design

### Dependencies to Add

```json
{
  "dependencies": {
    "ai": "^4.0.0"
  }
}
```

> Note: `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@openrouter/ai-sdk-provider` already installed via model-loader.ts

### New Files Structure

```
packages/api/src/services/workflow-engine/effect/
├── ai-provider-service.ts    # AIProviderService (wraps model-loader)
├── chat-service.ts           # ChatService (own message storage)
├── approval-service.ts       # ApprovalService (trust decisions + audit)
├── tool-builder.ts           # Build AI-SDK tools from ToolConfig
└── streaming-adapter.ts      # AI-SDK async iter → Effect PubSub

packages/db/src/schema/
├── chat-sessions.ts          # Chat session containers
├── chat-messages.ts          # Individual messages
├── stream-checkpoints.ts     # Recovery checkpoints for streaming
├── approval-audit.ts         # Audit trail for approval decisions
└── user-approval-settings.ts # Per-user auto-approve preferences
```

### Database Schema Design

Five new tables for the AI layer:

#### Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│  workflow_executions │       │       users         │
│  (existing)         │       │  (existing)         │
└──────────┬──────────┘       └──────────┬──────────┘
           │                             │
           │ 1:N                         │ 1:1
           ▼                             ▼
┌─────────────────────┐       ┌─────────────────────────┐
│   chat_sessions     │       │ user_approval_settings  │
├─────────────────────┤       ├─────────────────────────┤
│ id (PK)             │       │ id (PK)                 │
│ execution_id (FK)   │       │ user_id (FK, unique)    │
│ step_id             │       │ enabled                 │
│ status              │       │ trust_level             │
│ message_count       │       │ tool_overrides (jsonb)  │
│ total_tokens        │       └─────────────────────────┘
│ metadata (jsonb)    │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │ 1:N       │ 1:N
     ▼           ▼
┌──────────────┐ ┌───────────────────┐
│chat_messages │ │stream_checkpoints │
├──────────────┤ ├───────────────────┤
│ id (PK)      │ │ id (PK)           │
│ session_id   │ │ session_id (FK)   │
│ role         │ │ accumulated_text  │
│ content      │ │ token_count       │
│ sequence_num │ │ status            │
│ metadata     │ │ error_message     │
└──────────────┘ └───────────────────┘

┌─────────────────────┐
│  approval_audit     │
├─────────────────────┤
│ id (PK)             │
│ execution_id (FK)   │◄── workflow_executions (1:N)
│ tool_name           │
│ tool_type           │
│ auto_approved       │
│ reason              │
│ trust_level         │
│ risk_level          │
│ user_response       │
│ timed_out           │
└─────────────────────┘
```

#### Table 1: chat_sessions

```typescript
// packages/db/src/schema/chat-sessions.ts

import { pgTable, uuid, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workflowExecutions } from "./workflows";

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    
    // Links to workflow execution context
    executionId: uuid("execution_id")
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    stepId: text("step_id").notNull(),
    
    // Session metadata
    title: text("title"),
    status: text("status", { 
      enum: ["active", "completed", "failed", "interrupted"] 
    }).notNull().default("active"),
    
    // Stats (denormalized for quick access)
    messageCount: integer("message_count").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    
    // Flexible metadata
    metadata: jsonb("metadata").$type<{
      model?: string;
      systemPrompt?: string;
      tools?: string[];
      [key: string]: unknown;
    }>(),
    
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    executionIdx: index("chat_sessions_execution_idx").on(table.executionId),
    executionStepIdx: index("chat_sessions_execution_step_idx").on(table.executionId, table.stepId),
    statusIdx: index("chat_sessions_status_idx").on(table.status),
  })
);

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  execution: one(workflowExecutions, {
    fields: [chatSessions.executionId],
    references: [workflowExecutions.id],
  }),
  messages: many(chatMessages),
  checkpoints: many(streamCheckpoints),
}));

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
```

#### Table 2: chat_messages

```typescript
// packages/db/src/schema/chat-messages.ts

import { pgTable, uuid, text, timestamp, jsonb, index, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { chatSessions } from "./chat-sessions";

export const messageRoleEnum = ["user", "assistant", "system", "tool_call", "tool_result"] as const;
export type MessageRole = typeof messageRoleEnum[number];

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    
    role: text("role", { enum: messageRoleEnum }).notNull(),
    content: text("content").notNull(),
    sequenceNum: integer("sequence_num").notNull(),
    
    metadata: jsonb("metadata").$type<{
      tokenCount?: number;
      model?: string;
      finishReason?: string;
      interrupted?: boolean;
      toolName?: string;
      toolCallId?: string;
      toolResultId?: string;
      success?: boolean;
      [key: string]: unknown;
    }>(),
    
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionSeqIdx: index("chat_messages_session_seq_idx").on(table.sessionId, table.sequenceNum),
    roleIdx: index("chat_messages_role_idx").on(table.role),
    createdIdx: index("chat_messages_created_idx").on(table.createdAt),
  })
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
```

#### Table 3: stream_checkpoints

```typescript
// packages/db/src/schema/stream-checkpoints.ts

import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { chatSessions } from "./chat-sessions";

export const streamCheckpoints = pgTable(
  "stream_checkpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    
    accumulatedText: text("accumulated_text").notNull().default(""),
    tokenCount: integer("token_count").notNull().default(0),
    
    status: text("status", {
      enum: ["streaming", "complete", "failed", "interrupted"]
    }).notNull().default("streaming"),
    errorMessage: text("error_message"),
    
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastChunkAt: timestamp("last_chunk_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    sessionIdx: index("stream_checkpoints_session_idx").on(table.sessionId),
    statusIdx: index("stream_checkpoints_status_idx").on(table.status),
  })
);

export const streamCheckpointsRelations = relations(streamCheckpoints, ({ one }) => ({
  session: one(chatSessions, {
    fields: [streamCheckpoints.sessionId],
    references: [chatSessions.id],
  }),
}));

export type StreamCheckpoint = typeof streamCheckpoints.$inferSelect;
export type NewStreamCheckpoint = typeof streamCheckpoints.$inferInsert;
```

#### Table 4: approval_audit

```typescript
// packages/db/src/schema/approval-audit.ts

import { pgTable, uuid, text, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workflowExecutions } from "./workflows";

export const approvalAudit = pgTable(
  "approval_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    
    toolName: text("tool_name").notNull(),
    toolType: text("tool_type").notNull(),
    
    autoApproved: boolean("auto_approved").notNull(),
    reason: text("reason").notNull(),
    
    trustLevel: text("trust_level", {
      enum: ["paranoid", "cautious", "balanced", "yolo"]
    }).notNull(),
    riskLevel: text("risk_level", {
      enum: ["safe", "moderate", "dangerous"]
    }).notNull(),
    
    userResponse: jsonb("user_response").$type<{
      action: "approved" | "denied" | "modified";
      value?: string;
      responseTimeMs: number;
    } | null>(),
    
    timedOut: boolean("timed_out").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    executionIdx: index("approval_audit_execution_idx").on(table.executionId),
    autoApprovedIdx: index("approval_audit_auto_approved_idx").on(table.autoApproved),
    toolTypeIdx: index("approval_audit_tool_type_idx").on(table.toolType),
    createdIdx: index("approval_audit_created_idx").on(table.createdAt),
  })
);

export const approvalAuditRelations = relations(approvalAudit, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [approvalAudit.executionId],
    references: [workflowExecutions.id],
  }),
}));

export type ApprovalAuditEntry = typeof approvalAudit.$inferSelect;
export type NewApprovalAuditEntry = typeof approvalAudit.$inferInsert;
```

#### Table 5: user_approval_settings

```typescript
// packages/db/src/schema/user-approval-settings.ts

import { pgTable, uuid, text, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth";

export const userApprovalSettings = pgTable(
  "user_approval_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    
    enabled: boolean("enabled").notNull().default(true),
    trustLevel: text("trust_level", {
      enum: ["paranoid", "cautious", "balanced", "yolo"]
    }).notNull().default("cautious"),
    
    toolOverrides: jsonb("tool_overrides").$type<Record<string, boolean>>().notNull().default({}),
    
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("user_approval_settings_user_idx").on(table.userId),
  })
);

export const userApprovalSettingsRelations = relations(userApprovalSettings, ({ one }) => ({
  user: one(users, {
    fields: [userApprovalSettings.userId],
    references: [users.id],
  }),
}));

export type UserApprovalSettings = typeof userApprovalSettings.$inferSelect;
export type NewUserApprovalSettings = typeof userApprovalSettings.$inferInsert;
```

#### Schema Index Export

```typescript
// packages/db/src/schema/index.ts - ADD these exports

// AI Layer tables
export * from "./chat-sessions";
export * from "./chat-messages";
export * from "./stream-checkpoints";
export * from "./approval-audit";
export * from "./user-approval-settings";
```

#### Index Summary

| Table | Index | Purpose |
|-------|-------|---------|
| `chat_sessions` | `execution_idx` | Find sessions by execution |
| `chat_sessions` | `execution_step_idx` | Unique session per execution+step |
| `chat_sessions` | `status_idx` | Find active/completed sessions |
| `chat_messages` | `session_seq_idx` | Ordered message retrieval |
| `chat_messages` | `role_idx` | Filter by role |
| `stream_checkpoints` | `session_idx` | Find checkpoint by session |
| `stream_checkpoints` | `status_idx` | Find interrupted streams |
| `approval_audit` | `execution_idx` | Audit log per execution |
| `approval_audit` | `auto_approved_idx` | Analytics queries |
| `approval_audit` | `tool_type_idx` | Tool-based analysis |
| `user_approval_settings` | `user_idx` | User lookup |

### AIProviderService Contract

```typescript
// packages/api/src/services/workflow-engine/effect/ai-provider-service.ts

import { Effect, Context, Data } from "effect";
import type { LanguageModel, CoreMessage, CoreTool, TextStreamPart } from "ai";

// ===== ERRORS =====
export class AIProviderError extends Data.TaggedError("AIProviderError")<{
  cause: unknown;
  provider: string;
  operation: "load" | "stream" | "generate";
}> {}

export class ModelNotFoundError extends Data.TaggedError("ModelNotFoundError")<{
  modelId: string;
  provider: string;
}> {}

// ===== TYPES =====
export interface ModelConfig {
  provider: "openrouter" | "openai" | "anthropic";
  modelId: string;
  apiKey: string;
  enableThinking?: boolean;  // Claude extended thinking
}

export interface StreamTextParams {
  model: LanguageModel;
  messages: CoreMessage[];
  tools?: Record<string, CoreTool>;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export interface GenerateTextParams extends StreamTextParams {}

/** Effect-wrapped streaming result (wraps AI-SDK's raw result) */
export interface StreamResult {
  /** Effect Stream of text deltas only */
  textStream: Stream.Stream<string, StreamingError>;
  
  /** Effect Stream of ALL events (text, tool calls, finish, errors) */
  fullStream: Stream.Stream<TextStreamPart, StreamingError>;
  
  /** Effect that resolves to complete text when stream finishes */
  text: Effect.Effect<string, StreamingError>;
  
  /** Effect that resolves to all tool calls made */
  toolCalls: Effect.Effect<ToolCall[], StreamingError>;
  
  /** Effect that resolves to tool results after execution */
  toolResults: Effect.Effect<ToolResult[], StreamingError>;
  
  /** Effect for finish reason */
  finishReason: Effect.Effect<FinishReason, StreamingError>;
  
  /** Effect for token usage stats */
  usage: Effect.Effect<TokenUsage, StreamingError>;
  
  /** Abort controller to cancel the stream */
  abort: () => Effect.Effect<void, never>;
}

// ===== SERVICE INTERFACE =====
export interface AIProviderService {
  readonly _tag: "AIProviderService";
  
  /** Load an AI model from config (wraps model-loader.ts) */
  loadModel: (config: ModelConfig) => Effect.Effect<LanguageModel, ModelNotFoundError>;
  
  /** Stream text generation with tool support - returns Effect-wrapped streams */
  streamText: (params: StreamTextParams) => Effect.Effect<StreamResult, AIProviderError>;
  
  /** Single-call text generation */
  generateText: (params: GenerateTextParams) => Effect.Effect<GenerateTextResult, AIProviderError>;
  
  /** Parse "provider:modelId" string format */
  parseModelString: (modelString: string) => Effect.Effect<ModelConfig, AIProviderError>;
}

// ===== CONTEXT TAG =====
export const AIProviderService = Context.GenericTag<AIProviderService>("AIProviderService");
```

#### StreamResult Wrapping (AI-SDK → Effect)

```typescript
/** Wrap AsyncIterable → Effect Stream */
function asyncIterableToStream<A>(
  iterable: AsyncIterable<A>
): Stream.Stream<A, StreamingError> {
  return Stream.fromAsyncIterable(
    iterable,
    (error) => new StreamingError({ cause: error, phase: "read" })
  );
}

/** Wrap Promise → Effect */
function promiseToEffect<A>(
  promise: Promise<A>,
  operation: string
): Effect.Effect<A, StreamingError> {
  return Effect.tryPromise({
    try: () => promise,
    catch: (error) => new StreamingError({ cause: error, phase: operation as any }),
  });
}

/** Main wrapper - converts raw AI-SDK result to Effect-friendly StreamResult */
export function wrapStreamResult(
  rawResult: RawAIStreamResult,
  abortController: AbortController
): StreamResult {
  return {
    textStream: asyncIterableToStream(rawResult.textStream),
    fullStream: asyncIterableToStream(rawResult.fullStream),
    text: promiseToEffect(rawResult.text, "complete"),
    toolCalls: promiseToEffect(rawResult.toolCalls, "tool-calls"),
    toolResults: promiseToEffect(rawResult.toolResults, "tool-results"),
    finishReason: promiseToEffect(rawResult.finishReason, "finish"),
    usage: promiseToEffect(rawResult.usage, "usage"),
    abort: () => Effect.sync(() => abortController.abort()),
  };
}
```

### ChatService Contract

```typescript
// packages/api/src/services/workflow-engine/effect/chat-service.ts

import { Effect, Context, Data } from "effect";

// ===== ERRORS =====
export class ChatServiceError extends Data.TaggedError("ChatServiceError")<{
  cause: unknown;
  operation: "create" | "add" | "get" | "stream";
  sessionId?: string;
}> {}

export class SessionNotFoundError extends Data.TaggedError("SessionNotFoundError")<{
  sessionId: string;
}> {}

// ===== TYPES =====
export type MessageRole = "user" | "assistant" | "system" | "tool_call" | "tool_result";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: {
    toolName?: string;
    toolCallId?: string;
    tokenCount?: number;
    model?: string;
  };
}

export interface ChatSession {
  id: string;
  executionId: string;
  stepId: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  metadata?: Record<string, unknown>;
}

export interface StreamResponseParams {
  model: ModelConfig;
  systemPrompt?: string;
  tools?: ToolConfig[];
  maxTokens?: number;
  temperature?: number;
}

// ===== SERVICE INTERFACE =====
export interface ChatService {
  readonly _tag: "ChatService";
  
  /** Create a new chat session linked to execution */
  createSession: (
    executionId: string, 
    stepId: string,
    metadata?: Record<string, unknown>
  ) => Effect.Effect<ChatSession, ChatServiceError>;
  
  /** Get existing session */
  getSession: (sessionId: string) => Effect.Effect<ChatSession, SessionNotFoundError>;
  
  /** Get or create session for execution+step combo */
  getOrCreateSession: (
    executionId: string,
    stepId: string
  ) => Effect.Effect<ChatSession, ChatServiceError>;
  
  /** Add a message to session */
  addMessage: (
    sessionId: string, 
    message: Omit<ChatMessage, "id" | "timestamp">
  ) => Effect.Effect<ChatMessage, ChatServiceError>;
  
  /** Get conversation history for AI context */
  getHistory: (
    sessionId: string,
    options?: { limit?: number; beforeId?: string }
  ) => Effect.Effect<ChatMessage[], SessionNotFoundError>;
  
  /** Stream AI response, persist chunks, emit events */
  streamResponse: (
    sessionId: string,
    userMessage: string,
    params: StreamResponseParams
  ) => Effect.Effect<ChatMessage, ChatServiceError>;
  
  /** Delete session and all messages */
  deleteSession: (sessionId: string) => Effect.Effect<void, SessionNotFoundError>;
}

// ===== CONTEXT TAG =====
export const ChatService = Context.GenericTag<ChatService>("ChatService");
```

### ToolBuilder Contract

```typescript
// packages/api/src/services/workflow-engine/effect/tool-builder.ts

import { Effect, Data } from "effect";
import type { CoreTool } from "ai";
import type { ZodSchema } from "zod";

// ===== ERRORS =====
export class ToolBuilderError extends Data.TaggedError("ToolBuilderError")<{
  cause: unknown;
  toolName: string;
  operation: "build" | "execute" | "validate";
}> {}

// ===== TYPES =====
export type ToolType = "update-variable" | "ax-generation" | "snapshot-artifact";

export interface ToolConfig {
  name: string;
  type: ToolType;
  description: string;
  inputSchema: ZodSchema;
  approval: ToolApprovalConfig;  // From ADR-001
}

export interface ToolExecutionContext {
  executionId: string;
  stepId: string;
  variableService: VariableService;
  approvalService: ApprovalService;
  eventBus: WorkflowEventBus;
}

export interface ToolExecutionResult {
  success: boolean;
  output: unknown;
  approvalUsed?: ApprovalDecision;
}

// ===== FUNCTIONS =====

/** Build AI-SDK tools from ToolConfig definitions */
export declare function buildToolsFromConfig(
  toolConfigs: ToolConfig[],
  context: ToolExecutionContext
): Effect.Effect<Record<string, CoreTool>, ToolBuilderError>;

/** Execute a specific tool with approval flow */
export declare function executeTool(
  toolName: string,
  toolType: ToolType,
  args: unknown,
  context: ToolExecutionContext
): Effect.Effect<ToolExecutionResult, ToolBuilderError>;

/** Validate tool args against schema */
export declare function validateToolArgs(
  config: ToolConfig,
  args: unknown
): Effect.Effect<unknown, ToolBuilderError>;
```

### Approval System Design (ADR-001)

> **Decision**: Two SEPARATE concerns - Mode (UI type) and Auto-Approve (trust rules)
> **Status**: Approved via Architecture Decision Record

#### Concern 1: Approval Mode (UI Type)

```typescript
// HOW to collect input - defined per-tool
type ApprovalMode = 
  | "none"      // No UI ever - tool executes silently
  | "text"      // Free-form text input field
  | "selector"  // Dropdown with predefined options
  | "confirm";  // Simple yes/no/cancel

interface ToolApprovalConfig {
  mode: ApprovalMode;
  riskLevel: "safe" | "moderate" | "dangerous";
  
  // Mode-specific config
  selectorOptions?: string[];           // For mode: "selector"
  textPlaceholder?: string;             // For mode: "text"
  confirmMessage?: string;              // For mode: "confirm"
  defaultValue?: string;                // Pre-filled value
}
```

#### Concern 2: Auto-Approve (Trust Rules)

```typescript
// WHEN to skip UI - defined per-user/session
interface UserAutoApproveSettings {
  enabled: boolean;                     // Master kill switch
  trustLevel: TrustLevel;               // Global trust floor
  toolOverrides: Record<string, boolean>; // Per-tool-type overrides
}

type TrustLevel = 
  | "paranoid"  // Never auto-approve anything
  | "cautious"  // Only auto-approve "safe" risk level
  | "balanced"  // Auto-approve "safe" + "moderate"
  | "yolo";     // Auto-approve everything (dangerous!)

interface SessionApprovalState {
  approveAllUntil?: Date;              // "Approve all for 5 minutes"
  approvedTools: Set<string>;          // "Always approve this tool"
  deniedTools: Set<string>;            // "Never auto-approve this tool"
}
```

#### Runtime Decision Logic

```typescript
function shouldAutoApprove(
  tool: ToolConfig,
  userSettings: UserAutoApproveSettings,
  session: SessionApprovalState
): { autoApprove: boolean; reason: string } {
  
  // Mode "none" = no approval concept
  if (tool.approval.mode === "none") {
    return { autoApprove: true, reason: "mode:none" };
  }
  
  // Master switch off = always prompt
  if (!userSettings.enabled) {
    return { autoApprove: false, reason: "auto-approve:disabled" };
  }
  
  // Session override (user clicked "approve all")
  if (session.approveAllUntil && new Date() < session.approveAllUntil) {
    return { autoApprove: true, reason: "session:approve-all" };
  }
  
  // Per-tool deny list
  if (session.deniedTools.has(tool.name)) {
    return { autoApprove: false, reason: "session:denied" };
  }
  
  // Per-tool allow list
  if (session.approvedTools.has(tool.name)) {
    return { autoApprove: true, reason: "session:approved" };
  }
  
  // User's per-tool-type override
  if (tool.type in userSettings.toolOverrides) {
    return { 
      autoApprove: userSettings.toolOverrides[tool.type]!, 
      reason: "user:tool-override" 
    };
  }
  
  // Trust level vs risk level matrix
  const trustMatrix: Record<TrustLevel, Set<RiskLevel>> = {
    paranoid: new Set([]),
    cautious: new Set(["safe"]),
    balanced: new Set(["safe", "moderate"]),
    yolo: new Set(["safe", "moderate", "dangerous"]),
  };
  
  const autoApprove = trustMatrix[userSettings.trustLevel].has(tool.approval.riskLevel);
  return { 
    autoApprove, 
    reason: `trust:${userSettings.trustLevel}+risk:${tool.approval.riskLevel}` 
  };
}
```

#### Tool Risk Level Classification

| Tool Type | Default Risk | Rationale |
|-----------|--------------|-----------|
| `snapshot-artifact` (read) | `safe` | Read-only, no side effects |
| `update-variable` | `moderate` | Changes state but reversible |
| `ax-generation` | `moderate` | Creates content, costs tokens |
| `file-write` | `dangerous` | Permanent side effects |
| `execute-command` | `dangerous` | Arbitrary execution |

### ApprovalService Contract

```typescript
// packages/api/src/services/workflow-engine/effect/approval-service.ts

import { Effect, Context, Data } from "effect";

// ===== ERRORS =====
export class ApprovalServiceError extends Data.TaggedError("ApprovalServiceError")<{
  cause: unknown;
  operation: "decide" | "log" | "getSettings";
}> {}

// ===== TYPES (from ADR-001) =====
export type ApprovalMode = "none" | "text" | "selector" | "confirm";
export type RiskLevel = "safe" | "moderate" | "dangerous";
export type TrustLevel = "paranoid" | "cautious" | "balanced" | "yolo";

export interface ToolApprovalConfig {
  mode: ApprovalMode;
  riskLevel: RiskLevel;
  selectorOptions?: string[];
  textPlaceholder?: string;
  confirmMessage?: string;
  defaultValue?: string;
}

export interface UserAutoApproveSettings {
  enabled: boolean;
  trustLevel: TrustLevel;
  toolOverrides: Record<string, boolean>;
}

export interface SessionApprovalState {
  approveAllUntil?: Date;
  approvedTools: Set<string>;
  deniedTools: Set<string>;
}

export interface ApprovalDecision {
  autoApprove: boolean;
  reason: string;
  toolName: string;
  riskLevel: RiskLevel;
  trustLevel: TrustLevel;
}

export interface ApprovalAuditEntry {
  id: string;
  timestamp: Date;
  executionId: string;
  toolName: string;
  toolType: string;
  autoApproved: boolean;
  reason: string;
  userResponse?: {
    action: "approved" | "denied" | "modified";
    value?: string;
    responseTimeMs: number;
  };
}

export interface ApprovalRequest {
  toolName: string;
  toolType: string;
  approval: ToolApprovalConfig;
  executionId: string;
  context?: Record<string, unknown>;
}

// ===== SERVICE INTERFACE =====
export interface ApprovalService {
  readonly _tag: "ApprovalService";
  
  /** Check if tool should auto-approve (pure, never fails) */
  shouldAutoApprove: (
    request: ApprovalRequest,
    userSettings: UserAutoApproveSettings,
    sessionState: SessionApprovalState
  ) => Effect.Effect<ApprovalDecision, never>;
  
  /** Log approval decision to audit trail */
  logDecision: (
    entry: Omit<ApprovalAuditEntry, "id" | "timestamp">
  ) => Effect.Effect<ApprovalAuditEntry, ApprovalServiceError>;
  
  /** Get user's auto-approve settings (from DB or defaults) */
  getUserSettings: (
    userId: string
  ) => Effect.Effect<UserAutoApproveSettings, ApprovalServiceError>;
  
  /** Update user's auto-approve settings */
  updateUserSettings: (
    userId: string,
    settings: Partial<UserAutoApproveSettings>
  ) => Effect.Effect<UserAutoApproveSettings, ApprovalServiceError>;
  
  /** Get session approval state (returns empty if none) */
  getSessionState: (
    executionId: string
  ) => Effect.Effect<SessionApprovalState, never>;
  
  /** Update session state (e.g., "approve all for 5 min") */
  updateSessionState: (
    executionId: string,
    update: Partial<SessionApprovalState>
  ) => Effect.Effect<SessionApprovalState, ApprovalServiceError>;
  
  /** Get audit log for execution */
  getAuditLog: (
    executionId: string,
    options?: { limit?: number }
  ) => Effect.Effect<ApprovalAuditEntry[], ApprovalServiceError>;
}

// ===== CONTEXT TAG =====
export const ApprovalService = Context.GenericTag<ApprovalService>("ApprovalService");
```

### StreamingAdapter Contract

```typescript
// packages/api/src/services/workflow-engine/effect/streaming-adapter.ts

import { Effect, Stream, Data } from "effect";
import type { TextStreamPart } from "ai";

// ===== ERRORS =====
export class StreamingError extends Data.TaggedError("StreamingError")<{
  cause: unknown;
  phase: "read" | "emit" | "complete";
}> {}

// ===== EVENT TYPES =====
export interface StreamChunkEvent {
  type: "ai:stream:chunk";
  executionId: string;
  sessionId: string;
  chunk: string;
  tokenIndex: number;
}

export interface StreamCompleteEvent {
  type: "ai:stream:complete";
  executionId: string;
  sessionId: string;
  fullText: string;
  totalTokens: number;
  durationMs: number;
}

export interface StreamErrorEvent {
  type: "ai:stream:error";
  executionId: string;
  sessionId: string;
  error: string;
}

export type StreamEvent = StreamChunkEvent | StreamCompleteEvent | StreamErrorEvent;

// ===== FUNCTIONS =====

/** Convert AI-SDK async iterable to Effect Stream */
export declare function aiStreamToEffectStream<A>(
  asyncIterable: AsyncIterable<A>
): Stream.Stream<A, StreamingError>;

/** Process stream, emit to EventBus, return full text */
export declare function streamToEventBus(
  stream: AsyncIterable<TextStreamPart>,
  eventBus: WorkflowEventBus,
  executionId: string,
  sessionId: string
): Effect.Effect<string, StreamingError>;

/** Create tRPC-compatible async generator from EventBus */
export declare function eventBusToAsyncGenerator(
  eventBus: WorkflowEventBus,
  executionId: string,
  filter?: (event: StreamEvent) => boolean
): AsyncGenerator<StreamEvent, void, unknown>;
```

#### ChatService.streamResponse() Implementation Example

```typescript
streamResponse: (sessionId, userMessage, params) =>
  Effect.gen(function* () {
    const aiProvider = yield* AIProviderService;
    const eventBus = yield* WorkflowEventBus;
    const session = yield* getSession(sessionId);
    
    // Add user message first
    yield* addMessage(sessionId, { role: "user", content: userMessage });
    
    // Load model and get history
    const model = yield* aiProvider.loadModel(params.model);
    const history = yield* getHistory(sessionId);
    
    // Build tools if provided
    const tools = params.tools 
      ? yield* buildToolsFromConfig(params.tools, context)
      : undefined;
    
    // Start streaming - returns Effect-wrapped StreamResult
    const streamResult = yield* aiProvider.streamText({
      model,
      messages: history.map(toAIMessage),
      tools,
      system: params.systemPrompt,
      maxTokens: params.maxTokens,
    });
    
    // Process fullStream → emit events → collect text
    let fullText = "";
    let tokenCount = 0;
    
    yield* Stream.runForEach(streamResult.fullStream, (part) =>
      Effect.gen(function* () {
        switch (part.type) {
          case "text-delta":
            fullText += part.textDelta;
            tokenCount++;
            yield* eventBus.publish({
              type: "ai:stream:chunk",
              executionId: session.executionId,
              sessionId,
              chunk: part.textDelta,
              tokenIndex: tokenCount,
            });
            break;
            
          case "tool-call":
            yield* eventBus.publish({
              type: "ai:tool:call",
              executionId: session.executionId,
              toolName: part.toolName,
              args: part.args,
            });
            break;
            
          case "finish":
            yield* eventBus.publish({
              type: "ai:stream:complete",
              executionId: session.executionId,
              sessionId,
              fullText,
              totalTokens: tokenCount,
            });
            break;
        }
      })
    );
    
    // Get usage stats and persist assistant message
    const usage = yield* streamResult.usage;
    
    return yield* addMessage(sessionId, {
      role: "assistant",
      content: fullText,
      metadata: { tokenCount: usage.completionTokens, model: params.model.modelId },
    });
  }),
```

### MainLayer Composition Update

```typescript
// packages/api/src/services/workflow-engine/effect/index.ts

// New AI Layer combining all AI-related services
export const AILayer = Layer.mergeAll(
  AIProviderServiceLive,
  ChatServiceLive,
  ApprovalServiceLive
);

// Updated MainLayer with AI services
export const MainLayer = Layer.mergeAll(
  DatabaseServiceLive,
  ConfigServiceLive,
  WorkflowEventBusLive,
  StepHandlerRegistryLive
).pipe(
  Layer.provideMerge(VariableServiceLive),  // From 2-M2
  Layer.provideMerge(AILayer)                // NEW from 2-M3
);

// Export all services
export {
  // Existing (2-M1, 2-M2)
  DatabaseService,
  ConfigService,
  WorkflowEventBus,
  StepHandlerRegistry,
  VariableService,
  
  // NEW (2-M3)
  AIProviderService,
  ChatService,
  ApprovalService,
};

// Export types
export type {
  // AI types
  ModelConfig,
  StreamResult,
  StreamTextParams,
  
  // Chat types
  ChatSession,
  ChatMessage,
  MessageRole,
  
  // Approval types
  ApprovalMode,
  TrustLevel,
  RiskLevel,
  ApprovalDecision,
  ApprovalAuditEntry,
  
  // Tool types
  ToolConfig,
  ToolType,
  ToolExecutionResult,
  
  // Streaming types
  StreamEvent,
  StreamChunkEvent,
  StreamCompleteEvent,
};
```

### Error Recovery Patterns

Six patterns for handling failures across the AI layer:

#### Pattern 1: Stream Checkpointing

```typescript
// Problem: Stream dies mid-response, we lose everything
// Solution: Checkpoint accumulated text to DB periodically

interface StreamCheckpoint {
  sessionId: string;
  executionId: string;
  accumulatedText: string;
  tokenCount: number;
  lastChunkAt: Date;
  status: "streaming" | "complete" | "failed" | "interrupted";
}

export function streamWithCheckpoint(
  streamResult: StreamResult,
  sessionId: string,
  checkpointInterval: number = 50  // Every 50 tokens
): Effect.Effect<string, StreamingError> {
  return Effect.gen(function* () {
    const db = yield* DatabaseService;
    let accumulated = "";
    let tokenCount = 0;
    let lastCheckpoint = 0;
    
    // Create initial checkpoint
    const checkpoint = yield* db.insert(streamCheckpoints).values({
      sessionId,
      accumulatedText: "",
      tokenCount: 0,
      status: "streaming",
    });
    
    try {
      yield* Stream.runForEach(streamResult.fullStream, (part) =>
        Effect.gen(function* () {
          if (part.type === "text-delta") {
            accumulated += part.textDelta;
            tokenCount++;
            
            // Checkpoint every N tokens
            if (tokenCount - lastCheckpoint >= checkpointInterval) {
              yield* db.update(streamCheckpoints)
                .set({ accumulatedText: accumulated, tokenCount, lastChunkAt: new Date() })
                .where(eq(streamCheckpoints.id, checkpoint.id));
              lastCheckpoint = tokenCount;
            }
          }
        })
      );
      
      // Mark complete
      yield* db.update(streamCheckpoints)
        .set({ status: "complete", accumulatedText: accumulated })
        .where(eq(streamCheckpoints.id, checkpoint.id));
      return accumulated;
      
    } catch (error) {
      // Mark failed but preserve what we have
      yield* db.update(streamCheckpoints)
        .set({ status: "failed", accumulatedText: accumulated })
        .where(eq(streamCheckpoints.id, checkpoint.id));
      
      return yield* Effect.fail(new StreamingError({ 
        cause: error, 
        phase: "read",
        partialText: accumulated,  // Include what we got!
      }));
    }
  });
}
```

#### Pattern 2: Rate Limit Retry with Exponential Backoff

```typescript
import { Schedule } from "effect";

export const rateLimitRetryPolicy = Schedule.exponential("1 second").pipe(
  Schedule.jittered,                    // Prevent thundering herd
  Schedule.whileInput((error: AIProviderError) => 
    error.cause instanceof Error && 
    error.cause.message.includes("429")
  ),
  Schedule.recurs(5),                   // Max 5 retries
  Schedule.union(Schedule.spaced("30 seconds"))  // Cap at 30s
);

export function streamTextWithRetry(
  params: StreamTextParams
): Effect.Effect<StreamResult, AIProviderError> {
  return AIProviderService.pipe(
    Effect.flatMap(service => service.streamText(params)),
    Effect.retry(rateLimitRetryPolicy),
    Effect.tapError(error => Effect.log(`Stream failed after retries: ${error.cause}`))
  );
}
```

#### Pattern 3: Tool Execution Timeout

```typescript
export function executeToolWithTimeout(
  toolName: string,
  toolType: ToolType,
  args: unknown,
  context: ToolExecutionContext,
  timeoutMs: number = 30_000
): Effect.Effect<ToolExecutionResult, ToolBuilderError> {
  return executeTool(toolName, toolType, args, context).pipe(
    Effect.timeout(Duration.millis(timeoutMs)),
    Effect.catchTag("TimeoutException", () =>
      Effect.succeed({
        success: false,
        output: null,
        error: `Tool '${toolName}' timed out after ${timeoutMs}ms`,
        timedOut: true,
      })
    )
  );
}
```

#### Pattern 4: Approval Timeout with Default Action

```typescript
export interface ApprovalTimeoutConfig {
  timeoutMs: number;           // How long to wait (default: 5 min)
  defaultAction: "approve" | "deny" | "skip";
  notifyUser: boolean;
}

export function requestApprovalWithTimeout(
  request: ApprovalRequest,
  config: ApprovalTimeoutConfig = { timeoutMs: 300_000, defaultAction: "deny", notifyUser: true }
): Effect.Effect<ApprovalResponse, ApprovalServiceError> {
  return Effect.gen(function* () {
    const eventBus = yield* WorkflowEventBus;
    
    yield* eventBus.publish({
      type: "approval:requested",
      request,
      timeoutAt: new Date(Date.now() + config.timeoutMs),
    });
    
    const response = yield* waitForApprovalResponse(request.id).pipe(
      Effect.timeout(Duration.millis(config.timeoutMs)),
      Effect.catchTag("TimeoutException", () =>
        Effect.gen(function* () {
          if (config.notifyUser) {
            yield* eventBus.publish({ type: "approval:timeout", request, defaultAction: config.defaultAction });
          }
          return { action: config.defaultAction === "approve" ? "approved" : "denied", reason: "timeout", timedOut: true };
        })
      )
    );
    
    return response;
  });
}
```

#### Pattern 5: Transactional Message Persistence

```typescript
export function persistStreamResult(
  sessionId: string,
  fullText: string,
  toolCalls: ToolCall[],
  usage: TokenUsage
): Effect.Effect<ChatMessage, ChatServiceError> {
  return Effect.gen(function* () {
    const db = yield* DatabaseService;
    
    // All-or-nothing transaction
    return yield* db.transaction(async (tx) => {
      const [message] = await tx.insert(chatMessages).values({
        sessionId, role: "assistant", content: fullText,
        metadata: { tokenCount: usage.completionTokens },
      }).returning();
      
      if (toolCalls.length > 0) {
        await tx.insert(chatMessages).values(
          toolCalls.map(tc => ({
            sessionId, role: "tool_call" as const,
            content: JSON.stringify(tc.args),
            metadata: { toolName: tc.toolName, toolCallId: tc.toolCallId },
          }))
        );
      }
      
      await tx.update(chatSessions)
        .set({ 
          messageCount: sql`message_count + ${1 + toolCalls.length}`,
          totalTokens: sql`total_tokens + ${usage.totalTokens}`,
          updatedAt: new Date(),
        })
        .where(eq(chatSessions.id, sessionId));
      
      return message;
    });
  }).pipe(Effect.mapError(cause => new ChatServiceError({ cause, operation: "add", sessionId })));
}
```

#### Pattern 6: Graceful Stream Interruption

```typescript
export function interruptibleStream(
  streamResult: StreamResult,
  sessionId: string
): Effect.Effect<string, StreamingError> {
  return Effect.gen(function* () {
    let accumulated = "";
    
    // Register cleanup on interruption
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        if (accumulated.length > 0) {
          yield* ChatService.pipe(
            Effect.flatMap(svc => svc.addMessage(sessionId, {
              role: "assistant", content: accumulated, metadata: { interrupted: true },
            }))
          );
        }
        yield* streamResult.abort();
        yield* Effect.log(`Stream interrupted, saved ${accumulated.length} chars`);
      }).pipe(Effect.orDie)
    );
    
    yield* Stream.runForEach(streamResult.textStream, (chunk) =>
      Effect.sync(() => { accumulated += chunk; })
    );
    
    return accumulated;
  }).pipe(Effect.scoped);
}
```

#### Error Type Hierarchy with Recovery Hints

```typescript
export type AILayerError = 
  | AIProviderError
  | ChatServiceError
  | ApprovalServiceError
  | ToolBuilderError
  | StreamingError;

// Extend errors with recovery info
export class AIProviderError extends Data.TaggedError("AIProviderError")<{
  cause: unknown;
  provider: string;
  operation: "load" | "stream" | "generate";
  retryable: boolean;
  retryAfterMs?: number;
}> {}

export class StreamingError extends Data.TaggedError("StreamingError")<{
  cause: unknown;
  phase: "read" | "emit" | "complete";
  partialText?: string;  // What we got before failure
}> {}

export const isRetryable = (error: AILayerError): boolean =>
  "retryable" in error && error.retryable === true;
```

#### Error Recovery Summary

| Pattern | Problem Solved | Effect Feature |
|---------|---------------|----------------|
| **Checkpointing** | Partial stream loss | Periodic DB writes |
| **Rate Limit Retry** | 429 errors | `Effect.retry` + `Schedule` |
| **Tool Timeout** | Hanging execution | `Effect.timeout` |
| **Approval Timeout** | User never responds | Timeout + default action |
| **Transactional Persist** | DB write fails | `db.transaction` |
| **Graceful Interrupt** | User cancels | `Effect.addFinalizer` + scoped |

---

## Acceptance Criteria

### AC1: AIProviderService Created ✅
```gherkin
Given the Effect service layer
When AIProviderService is instantiated
Then it should:
  - Wrap existing model-loader.ts loadModel() function
  - Expose streamText() returning Effect with async iterable
  - Expose generateText() for single-call completions
  - Handle all three providers (openrouter, openai, anthropic)
  - Use Effect.tryPromise for async operations
```

### AC2: ChatService with Own Storage ✅
```gherkin
Given the database schema
When ChatService manages conversations
Then it should:
  - Create chat sessions linked to executionId and stepId
  - Store messages with role, content, timestamp, metadata
  - Support message types: user, assistant, tool_call, tool_result
  - Retrieve full conversation history for AI context
  - NOT use Mastra's PostgresStore or 'mastra' schema
```

### AC3: Tool Builder from ToolConfig ✅
```gherkin
Given ToolConfig definitions from step configuration
When buildToolsFromConfig() is called
Then it should:
  - Convert ToolConfig[] to AI-SDK CoreTool format
  - Use Zod schemas for parameter validation
  - Route tool execution to appropriate handlers
  - Support tool types: update-variable, ax-generation, snapshot-artifact
  - Return properly typed tool results
```

### AC3.5: Approval System Architecture ✅
```gherkin
Given the approval system design (ADR-001)
When tool/action requires user input
Then two SEPARATE concerns should be handled:

1. APPROVAL MODE (UI type - HOW to get input):
   - "none": No UI needed, tool executes directly
   - "text": Free-form text input field
   - "selector": Dropdown/choice from options
   - "confirm": Simple yes/no confirmation
   - Mode-specific config: selectorOptions, textPlaceholder, confirmMessage

2. AUTO-APPROVE (WHEN to skip UI entirely):
   - Trust levels: paranoid | cautious | balanced | yolo
   - Per-tool-type overrides in UserAutoApproveSettings
   - Session state: approveAllUntil, approvedTools, deniedTools
   - Risk levels per tool: safe | moderate | dangerous

3. RUNTIME DECISION:
   - shouldAutoApprove() returns { autoApprove: boolean, reason: string }
   - Reason logged for audit trail (e.g., "trust:cautious+risk:safe")
   - Trust matrix maps trust level → allowed risk levels

4. AUDIT TRAIL:
   - Every approval decision logged with ApprovalAuditEntry
   - Captures: autoApproved, reason, userResponse (if prompted)

Example scenarios:
  - mode: "selector", trust: "cautious", risk: "safe" → Auto-approve
  - mode: "selector", trust: "paranoid" → Always show UI
  - mode: "confirm", session: "approve-all" → Auto-confirm, log
  - mode: "none" → Always executes, no approval concept

Note: Full auto-approve LEARNING is OUT OF SCOPE for this story.
This story establishes the ARCHITECTURE and basic decision logic.
```

### AC4: Streaming with Effect PubSub ✅
```gherkin
Given an AI streaming response
When streamToEventBus() processes chunks
Then it should:
  - Emit "ai:stream:chunk" events for each text delta
  - Emit "ai:stream:complete" when stream finishes
  - Accumulate full response text
  - Handle stream errors with Effect error channel
  - Support cancellation via Effect interruption
```

### AC5: Integration with MainLayer ✅
```gherkin
Given the existing Effect MainLayer
When AIProviderService and ChatService are added
Then they should:
  - Be added to MainLayer.mergeAll() composition
  - Depend on DatabaseService and ConfigService
  - Emit events through WorkflowEventBus
  - Support transaction boundaries for message persistence
```

### AC6: Backward Compatibility ✅
```gherkin
Given existing sandboxed-agent-handler using Mastra
When USE_EFFECT_AI flag is disabled (default)
Then:
  - Existing Mastra integration continues to work
  - No breaking changes to current workflow execution
  - Feature flag enables gradual migration
```

### AC7: Error Recovery ✅
```gherkin
Given potential failures in AI streaming and tool execution
When errors occur
Then the system should:
  - Checkpoint stream progress every N tokens to prevent data loss
  - Retry rate-limited requests (429) with exponential backoff
  - Timeout hanging tool executions with graceful fallback
  - Handle approval timeouts with configurable default action
  - Use transactions for atomic message persistence
  - Support graceful stream interruption with partial result preservation
  - Include recovery hints in error types (retryable, partialText, retryAfterMs)
```

### AC8: Unit Tests ✅
```gherkin
Given the new AI-SDK services
When tests are executed
Then:
  - AIProviderService tests mock AI-SDK calls
  - ChatService tests verify database operations
  - Tool builder tests validate schema conversion
  - Streaming adapter tests verify PubSub emission
  - Error recovery patterns have dedicated tests
  - Minimum 20 tests passing
```

## Tasks

### Task 1: Install Dependencies & Setup
- [ ] 1.1: Add `ai: "^4.0.0"` to packages/api/package.json
- [ ] 1.2: Run `bun install` and verify no version conflicts
- [ ] 1.3: Create feature flag `USE_EFFECT_AI` in config

### Task 2: AIProviderService Implementation
- [ ] 2.1: Create `ai-provider-service.ts` with tagged errors (`AIProviderError`, `ModelNotFoundError`)
- [ ] 2.2: Define `ModelConfig`, `StreamTextParams`, `GenerateTextParams` types
- [ ] 2.3: Implement `loadModel()` wrapping model-loader.ts
- [ ] 2.4: Implement `parseModelString()` for "provider:modelId" format
- [ ] 2.5: Create `wrapStreamResult()` - AsyncIterable→Stream, Promise→Effect
- [ ] 2.6: Implement `streamText()` returning Effect-wrapped `StreamResult`
- [ ] 2.7: Implement `generateText()` for single-call completions
- [ ] 2.8: Create `AIProviderServiceLive` Layer
- [ ] 2.9: Write unit tests (mock AI-SDK, test wrapping logic)

### Task 3: Database Schema Implementation
- [ ] 3.1: Create `chat-sessions.ts` with table, relations, indexes, types
- [ ] 3.2: Create `chat-messages.ts` with messageRoleEnum, table, relations, indexes
- [ ] 3.3: Create `stream-checkpoints.ts` with table, relations, indexes
- [ ] 3.4: Create `approval-audit.ts` with table, relations, indexes
- [ ] 3.5: Create `user-approval-settings.ts` with table, relations, indexes
- [ ] 3.6: Update `schema/index.ts` with all new exports
- [ ] 3.7: Run `bun db:push` to create tables
- [ ] 3.8: Verify all indexes created correctly

### Task 4: ChatService Implementation
- [ ] 4.1: Create `chat-service.ts` with tagged errors (`ChatServiceError`, `SessionNotFoundError`)
- [ ] 4.2: Define service types matching schema (ChatSession, ChatMessage, MessageRole)
- [ ] 4.3: Implement `createSession()` with executionId/stepId linking
- [ ] 4.4: Implement `getSession()` and `getOrCreateSession()`
- [ ] 4.5: Implement `addMessage()` with auto-incrementing sequenceNum
- [ ] 4.6: Implement `getHistory()` with limit/beforeId pagination
- [ ] 4.7: Implement `streamResponse()` orchestrating AI + persistence + events
- [ ] 4.8: Implement `deleteSession()` with cascade delete
- [ ] 4.9: Create `ChatServiceLive` Layer
- [ ] 4.10: Write unit tests (mock DB operations)

### Task 5: ToolBuilder Implementation
- [ ] 5.1: Create `tool-builder.ts` with tagged error (`ToolBuilderError`)
- [ ] 5.2: Define `ToolConfig`, `ToolType`, `ToolExecutionContext`, `ToolExecutionResult` types
- [ ] 5.3: Implement `validateToolArgs()` using Zod schemas
- [ ] 5.4: Implement `buildToolsFromConfig()` converting ToolConfig[] → CoreTool record
- [ ] 5.5: Implement `executeTool()` with approval flow integration
- [ ] 5.6: Create tool execution router for: update-variable, ax-generation, snapshot-artifact
- [ ] 5.7: Integrate with existing update-variable-tool.ts
- [ ] 5.8: Write unit tests (schema conversion, tool routing)

### Task 6: ApprovalService Implementation
- [ ] 6.1: Create `approval-service.ts` with tagged error (`ApprovalServiceError`)
- [ ] 6.2: Define all ADR-001 types: `ApprovalMode`, `RiskLevel`, `TrustLevel`, etc.
- [ ] 6.3: Implement trust matrix: paranoid→[], cautious→[safe], balanced→[safe,moderate], yolo→[all]
- [ ] 6.4: Implement `shouldAutoApprove()` - pure function, returns decision + reason
- [ ] 6.5: Implement `logDecision()` persisting to approval_audit table
- [ ] 6.6: Implement `getUserSettings()` and `updateUserSettings()` (user_approval_settings table)
- [ ] 6.7: Implement `getSessionState()` and `updateSessionState()`
- [ ] 6.8: Implement `getAuditLog()` with pagination
- [ ] 6.9: Create `ApprovalServiceLive` Layer
- [ ] 6.10: Write unit tests for decision matrix (all trust/risk combos)

### Task 7: StreamingAdapter Implementation
- [ ] 7.1: Create `streaming-adapter.ts` with tagged error (`StreamingError`)
- [ ] 7.2: Define `StreamEvent` union: `StreamChunkEvent`, `StreamCompleteEvent`, `StreamErrorEvent`
- [ ] 7.3: Implement `aiStreamToEffectStream()` wrapping AsyncIterable
- [ ] 7.4: Implement `streamToEventBus()` - process stream, emit events, return full text
- [ ] 7.5: Implement `eventBusToAsyncGenerator()` for tRPC subscriptions
- [ ] 7.6: Handle Effect interruption for clean cancellation
- [ ] 7.7: Write unit tests (mock streams, verify event emission)

### Task 8: Error Recovery Implementation
- [ ] 8.1: Implement `streamWithCheckpoint()` with configurable interval (uses stream_checkpoints table)
- [ ] 8.2: Create `rateLimitRetryPolicy` using Effect Schedule
- [ ] 8.3: Implement `streamTextWithRetry()` wrapping AIProviderService
- [ ] 8.4: Implement `executeToolWithTimeout()` with graceful fallback
- [ ] 8.5: Implement `requestApprovalWithTimeout()` with default action
- [ ] 8.6: Implement `persistStreamResult()` with transaction
- [ ] 8.7: Implement `interruptibleStream()` with Effect.addFinalizer
- [ ] 8.8: Add recovery hints to all error types (retryable, partialText, retryAfterMs)
- [ ] 8.9: Write tests for each recovery pattern

### Task 9: Integration & Testing
- [ ] 9.1: Create `AILayer` combining AIProviderService, ChatService, ApprovalService
- [ ] 9.2: Update `MainLayer` with AILayer composition
- [ ] 9.3: Update `effect/index.ts` with all exports (services, types)
- [ ] 9.4: Run full test suite - target 30+ tests passing
- [ ] 9.5: Manual integration test with real AI call (optional, mark as slow)

## Dev Notes

### Key Decisions

1. **Extend dialog_sessions vs new table**: Recommend creating separate `chat_messages` table for cleaner separation and proper indexing. DialogSessions is tied to approval-gate flow; ChatService is more general.

2. **AI-SDK Version**: Use v4.x for latest streaming improvements and tool calling enhancements.

3. **Feature Flag Strategy**: `USE_EFFECT_AI` defaults to false. Story 2-M4 will migrate step handlers to use this flag, and 2-M5 will flip default and remove Mastra.

4. **Approval System Architecture (ADR-001)**: Two SEPARATE concerns:
   - **Mode** = UI type (none/text/selector/confirm) - HOW to collect input
   - **Auto-Approve** = Trust rules (paranoid/cautious/balanced/yolo) - WHEN to skip UI
   
   This mirrors Claude Code / OpenCode's approach where you can configure trust levels. Key elements:
   - `shouldAutoApprove()` returns decision + reason for audit
   - Trust matrix maps trust level → allowed risk levels
   - Session state allows temporary "approve all" or per-tool overrides
   - Every decision logged with `ApprovalAuditEntry`
   
   Full auto-approve LEARNING (pattern detection) deferred to later stories.

### Gotchas from model-loader.ts

1. **OpenRouter Fix**: `createOpenRouterFetchWithFix()` handles malformed `tool_calls` responses - ensure this is used when provider is openrouter.

2. **Thinking Mode**: `enableThinking` option for Claude models - preserve this capability.

3. **Default Model**: `openrouter/polaris-alpha` - ensure ChatService can use different models per step config.

### Testing Strategy

- Mock `ai` package functions for unit tests
- Use Effect test utilities for service testing
- Integration tests can hit real AI APIs with small prompts (mark as slow)

## References

- Tech Spec: `_bmad-output/planning-artifacts/tech-spec-effect-workflow-engine.md` (Section 5)
- Story 2-M1: Effect Foundation (done)
- Story 2-M2: Variable System (done)
- Existing: `packages/api/src/services/mastra/model-loader.ts`
- Existing: `packages/api/src/services/mastra/mastra-service.ts` (to be replaced)

## Changelog

| Date       | Change         | Author |
| ---------- | -------------- | ------ |
| 2026-01-13 | Initial draft  | SM     |
| 2026-01-13 | Added ADR-001: Approval System two-concern architecture (Mode + Auto-Approve) via Advanced Elicitation | SM |
| 2026-01-13 | Added full API Contracts: AIProviderService, ChatService, ApprovalService, ToolBuilder, StreamingAdapter via Advanced Elicitation | SM |
| 2026-01-13 | Updated story points 8→13, tasks 24→47 to reflect expanded scope | SM |
| 2026-01-13 | Added Error Recovery Patterns: checkpointing, retry, timeout, transactions, interruption via Advanced Elicitation | SM |
| 2026-01-13 | Updated story points 13→15, added Task 7 (10 subtasks), AC7→AC8, target 25+ tests | SM |
| 2026-01-13 | Added Database Schema Design: 5 tables (chat_sessions, chat_messages, stream_checkpoints, approval_audit, user_approval_settings) with ERD, indexes, Drizzle schemas via Advanced Elicitation | SM |
| 2026-01-13 | Reorganized tasks: 9 task groups, ~65 subtasks, target 30+ tests | SM |
