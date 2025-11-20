# Epic Technical Specification: Foundation + Workflow-Init Engine

Date: 2025-11-07
Author: fahad
Epic ID: 1
Status: Draft

---

## Overview

Epic 1 establishes Chiron's foundational infrastructure by implementing a 15-table PostgreSQL database schema with Drizzle ORM, a generic workflow execution engine capable of running any BMAD methodology workflow, and a complete end-to-end implementation of the workflow-init-new conversational project setup. This epic delivers a web-based (React + TanStack Router) application with better-auth authentication, OpenRouter LLM integration with model selection UI, and 5 core step type handlers (ask-user, execute-action, llm-generate, ask-user-chat, display-output) that power the workflow engine. The epic transitions from traditional database migrations to a Docker-based reset approach for rapid development iteration, stores all workflow step configuration in extensible JSONB fields for runtime flexibility, and implements multi-user project isolation from day one to support future multi-tenancy. By the end of Epic 1, users can launch Chiron, authenticate, browse available LLM models, and create new projects through a 10-step conversational workflow that analyzes project complexity, recommends appropriate workflow paths (quick-flow/method/enterprise), generates project name suggestions, and initializes the project directory with git repository.

## Objectives and Scope

**In Scope:**
- Database schema refactoring: 15 tables with JSONB-based step configuration storage (no migrations, Docker reset approach)
- Core data seeding: Users (better-auth), 6 agents (PM, Analyst, Architect, DEV, SM, UX Designer), workflow-init-new metadata, 6 workflow paths (quick-flow/method/enterprise × greenfield/brownfield)
- Web UI foundation: React + TanStack Router + shadcn/ui with authentication, home page, project list, sidebar navigation
- LLM models page: OpenRouter API integration, TanStack Table with filtering/sorting/search for model selection
- Generic workflow execution engine: Step-by-step orchestration, 4-level variable resolution, state persistence, event-driven UI updates
- Workflow-init implementation: 10 steps covering project setup from directory selection through git initialization and database record creation
- 5 step type handlers: ask-user (path selector, text input, choices), execute-action (set-variable, file operations, git, database), llm-generate (classification, structured generation), ask-user-chat (conversational selection), display-output (markdown rendering)
- Testing infrastructure: Bun test framework for all unit and integration tests

**Out of Scope (Deferred to Future Epics):**
- Workflow steps for Epic 2+ workflows (product-brief, PRD, architecture, etc.) - only workflow-init-new in Epic 1
- Tauri desktop application wrapper - web-first for MVP, Tauri deferred to post-MVP
- Multi-agent orchestration and git worktree management - Epic 4
- Advanced step types (branch, approval-checkpoint, invoke-workflow) - Epic 2+
- Artifact generation for PRDs, architecture docs, stories - Epic 2+
- Real-time WebSocket/SSE for multi-agent coordination - Epic 4
- MCP server integration and agent-capability management - Epic 5
- Story Kanban board and phase tracking UI - Epic 6

## System Architecture Alignment

Epic 1 implements the foundational layers of Chiron's architecture as defined in `/docs/architecture/database-schema-architecture.md`:

**Database Layer (Category 1-5 Tables):**
- Workflow Definition (2 tables): `workflows`, `workflow_steps` with JSONB config storage
- Execution & State (5 tables): `workflow_executions`, `projects`, `project_state`, `workflow_paths`, `workflow_path_workflows`
- Templates & Agents (2 tables): `workflow_templates`, `agents`
- Auth & User (5 tables): Better-auth standard schema (`user`, `session`, `account`, `verification`, `app_config`)
- Optional (1 table): `dialog_sessions` (deferred, can use workflow_executions.variables for Epic 1)

**Key Architectural Patterns Implemented:**
- JSONB Step Configuration: All step-specific config in `workflow_steps.config` JSONB field (no new tables for new patterns)
- Tag-Based Workflow Path Filtering: `workflow_paths.tags` JSONB enables dynamic track selection without schema changes
- Dual Progress Tracking: `workflow_executions.executedSteps` (step-level) + `projects.executedVsPath` (workflow-level)
- Multi-User Isolation: `userId` foreign keys on `projects` and `app_config` for future multi-tenancy

**Technology Stack:**
- PostgreSQL 17 (Docker) + Drizzle ORM 0.44.2 for type-safe database operations
- React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui for web UI
- TanStack Router for routing, TanStack Table for data tables, TanStack React Query for server state
- Better-auth for authentication (existing setup, reused)
- Handlebars for template/variable resolution in workflow engine
- OpenRouter for LLM API access (classification, structured generation)
- Bun runtime and test framework for backend and testing
- Node-compatible Bun APIs for file system operations (mkdir, git via simple-git)

**Constraints Respected:**
- No Drizzle migrations during development (Docker reset approach per architecture decision)
- No hardcoded enums for methodology concepts (tags JSONB instead)
- Workflow engine must be generic and reusable for all future workflows (not workflow-init-specific)
- All secrets (API keys) stored in `app_config` with encryption at application level
- Foreign key constraints enforce data integrity and cascade deletes for user isolation

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|----------------|----------------|--------|---------|-------|
| **Workflow Engine Service** | Load workflows from DB, execute steps sequentially, manage state, resolve variables | Workflow ID, user input per step | Workflow execution record, step results, events | Story 1.4 |
| **Step Handler Registry** | Register and dispatch step type handlers (ask-user, llm-generate, etc.) | Step type, step config, execution context | Step result, output variables | Story 1.4 |
| **Variable Resolver** | Resolve {{variable}} references using Handlebars with 4-level precedence | Template string, execution context | Resolved string | Story 1.4 |
| **LLM Integration Service** | Call OpenRouter API for classification and structured generation | LLM task config, input text, model selection | Structured JSON response, reasoning | Story 1.6 |
| **Database Seed Service** | Populate database with initial data (users, agents, workflows, paths) | Seed data definitions | Database records | Story 1.2 |
| **Authentication Service** | Handle user login/logout using better-auth | User credentials | Session token, user record | Story 1.3 (existing) |
| **Project Management Service** | CRUD operations for projects (create, list, delete) | Project metadata | Project records | Story 1.8 |
| **File System Service** | Execute file operations (mkdir, git init) via Bun APIs | File paths, operations | Success/failure status | Story 1.8 |
| **Models API Client** | Fetch available models from OpenRouter, cache results | OpenRouter API key | Model list with pricing/specs | Story 1.3 |
| **Event Bus** | Emit workflow events for real-time UI updates | Event type, payload | Event stream to UI subscribers | Story 1.4 |

### Data Models and Contracts

**Core Database Tables (Story 1.1):**

```typescript
// workflows table
{
  id: uuid,
  name: string (unique),
  displayName: string,
  description: string,
  module: "bmm" | "cis" | "custom",
  agentId: uuid (FK → agents),
  initializerType: "new-project" | "existing-project" | null,
  isStandalone: boolean,
  requiresProjectContext: boolean,
  outputArtifactType: string,
  outputTemplateId: uuid,
  createdAt: timestamp,
  updatedAt: timestamp
}

// workflow_steps table
{
  id: uuid,
  workflowId: uuid (FK → workflows),
  stepNumber: int,
  goal: string,
  stepType: "ask-user" | "execute-action" | "llm-generate" | "ask-user-chat" | "display-output",
  config: jsonb, // All step-specific configuration
  nextStepNumber: int
}

// workflow_executions table
{
  id: uuid,
  workflowId: uuid (FK → workflows),
  projectId: uuid (FK → projects),
  agentId: uuid (FK → agents),
  status: "idle" | "running" | "paused" | "completed" | "error",
  currentStep: int,
  variables: jsonb, // User inputs and intermediate values
  executedSteps: jsonb, // Step-by-step execution history
  startedAt: timestamp,
  completedAt: timestamp,
  error: text
}

// projects table
{
  id: uuid,
  name: string (unique),
  path: string,
  userId: string (FK → user),
  workflowPathId: uuid (FK → workflow_paths),
  initializedByExecutionId: uuid (FK → workflow_executions),
  executedVsPath: jsonb, // Workflow-level progress tracking
  createdAt: timestamp,
  updatedAt: timestamp
}

// workflow_paths table
{
  id: uuid,
  name: string,
  displayName: string,
  description: string,
  educationText: string,
  tags: jsonb, // { track, fieldType, complexity, ... }
  recommendedFor: jsonb, // Array of keywords
  estimatedTime: string,
  agentSupport: string,
  sequenceOrder: int
}

// agents table
{
  id: uuid,
  name: string,
  displayName: string,
  description: string,
  role: string,
  llmProvider: string,
  llmModel: string,
  llmTemperature: float,
  tools: jsonb,
  mcpServers: jsonb,
  color: string,
  avatar: string,
  active: boolean
}

// app_config table
{
  id: uuid,
  userId: string (FK → user, unique),
  openrouterApiKey: string,
  anthropicApiKey: string,
  openaiApiKey: string,
  defaultLlmProvider: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Step Config Types (Story 1.5-1.8):**

```typescript
// AskUserStepConfig - Story 1.5, 1.7
type AskUserStepConfig = {
  type: "ask-user",
  message?: string, // Optional message before question
  question: string,
  responseType: "path" | "string" | "choice",
  responseVariable: string,
  pathConfig?: {
    selectMode: "file" | "directory",
    mustExist?: boolean
  },
  choices?: {
    type: "single" | "multiple",
    options: string | Choice[],
    allowCustom?: boolean
  },
  validation?: {
    required?: boolean,
    minLength?: number,
    maxLength?: number,
    pattern?: string
  }
}

// ExecuteActionStepConfig - Story 1.5, 1.8
type ExecuteActionStepConfig = {
  type: "execute-action",
  actions: Array<{
    type: "set-variable" | "file" | "git" | "database",
    config: {
      // set-variable: { variable, value }
      // file: { operation: "mkdir", path, recursive }
      // git: { operation: "init", path }
      // database: { operation: "insert"|"query", table, values/filter }
    }
  }>,
  executionMode: "sequential" | "parallel"
}

// LLMGenerateStepConfig - Story 1.6, 1.7
type LLMGenerateStepConfig = {
  type: "llm-generate",
  llmTask: {
    type: "classification" | "structured",
    description: string,
    input: string, // With {{variable}} references
    categories?: string[], // For classification
    schema?: object, // For structured generation
    reasoning?: boolean
  },
  contextVariables: string[],
  outputVariable: string,
  streaming: boolean,
  signatureConfig: {
    schema: object,
    reasoning: boolean
  }
}

// AskUserChatStepConfig - Story 1.6
type AskUserChatStepConfig = {
  type: "ask-user-chat",
  initialMessage: string,
  systemPrompt: string,
  completionCondition: {
    type: "user-satisfied" | "max-turns",
    maxTurns?: number
  },
  outputVariable: string
}

// DisplayOutputStepConfig - Story 1.8
type DisplayOutputStepConfig = {
  type: "display-output",
  content: string // Markdown with {{variable}} references
}
```

**API Response Types:**

```typescript
// GET /api/models
type ModelsResponse = {
  models: Array<{
    id: string,
    name: string,
    provider: string,
    contextLength: number,
    pricing: {
      prompt: number, // per 1M tokens
      completion: number
    }
  }>
}

// POST /api/workflows/:id/execute
type WorkflowExecutionResponse = {
  executionId: string,
  workflowId: string,
  status: "running",
  currentStep: number
}

// POST /api/workflows/:id/step
type StepSubmitRequest = {
  executionId: string,
  stepNumber: number,
  userInput: any // Step-specific input
}

type StepSubmitResponse = {
  executionId: string,
  nextStep: number | null,
  output: any
}
```

### APIs and Interfaces

**Backend API Endpoints (tRPC):**

```typescript
// Authentication (existing better-auth)
POST /api/auth/signin
POST /api/auth/signout
GET /api/auth/session

// Projects
GET /api/projects
  Response: Project[]
  
GET /api/projects/:id
  Response: Project
  
POST /api/projects
  Body: { name, path, userId, workflowPathId }
  Response: Project
  
DELETE /api/projects/:id
  Response: { success: boolean }

// Workflows
GET /api/workflows
  Query: { module?, initializerType? }
  Response: Workflow[]
  
GET /api/workflows/:id
  Response: Workflow with steps[]
  
POST /api/workflows/:id/execute
  Body: { projectId?, userId }
  Response: { executionId, status }
  
POST /api/workflows/executions/:executionId/step
  Body: { stepNumber, userInput }
  Response: { nextStep, output, status }
  
GET /api/workflows/executions/:executionId
  Response: WorkflowExecution

// Workflow Paths
GET /api/workflow-paths
  Query: { tags? }
  Response: WorkflowPath[]
  Example: GET /api/workflow-paths?tags.fieldType=greenfield

// LLM Models
GET /api/models
  Response: { models: Model[] }
  Source: OpenRouter API
  Cache: 1 hour

// Agents
GET /api/agents
  Response: Agent[]
```

**Frontend Component Interfaces:**

```typescript
// WorkflowStepper component
interface WorkflowStepperProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  stepGoal: string;
}

// WorkflowStepContainer component
interface WorkflowStepContainerProps {
  executionId: string;
  step: WorkflowStep;
  onNext: (userInput: any) => Promise<void>;
  onBack: () => void;
  loading: boolean;
}

// AskUserStep component
interface AskUserStepProps {
  config: AskUserStepConfig;
  onSubmit: (value: any) => void;
  loading: boolean;
}

// LLMGenerateStep component
interface LLMGenerateStepProps {
  config: LLMGenerateStepConfig;
  result?: any; // LLM output
  loading: boolean;
}

// AskUserChatStep component
interface AskUserChatStepProps {
  config: AskUserChatStepConfig;
  messages: ChatMessage[];
  onMessage: (message: string) => void;
  onComplete: (selection: any) => void;
  loading: boolean;
}
```

**Event Interfaces:**

```typescript
// Workflow events emitted by engine
type WorkflowEvent = 
  | { type: "workflow_started", executionId: string, workflowId: string }
  | { type: "step_started", executionId: string, stepNumber: number }
  | { type: "step_completed", executionId: string, stepNumber: number, output: any }
  | { type: "workflow_completed", executionId: string }
  | { type: "workflow_error", executionId: string, error: string }

// Frontend subscribes via EventSource or polling
interface EventSubscription {
  subscribe(callback: (event: WorkflowEvent) => void): () => void;
}
```

### Workflows and Sequencing

**Workflow-Init-New Sequence (10 Steps):**

```
Step 1 (ask-user): Get project directory
  ↓ User selects/inputs path
Step 2 (ask-user): Get project description
  ↓ User inputs description (20-1000 chars)
Step 3 (execute-action): Set field type = "greenfield"
  ↓ Auto-execute, set variables
Step 4 (llm-generate): Analyze complexity → recommend track
  ↓ LLM classifies: quick-flow | method | enterprise
Step 5 (execute-action): Query workflow_paths WHERE tags.fieldType = "greenfield"
  ↓ Fetch matching paths from DB
Step 6 (ask-user-chat): Conversational path selection
  ↓ User chats with AI, selects workflow path
Step 7 (llm-generate): Generate 3 project name suggestions
  ↓ LLM generates kebab-case names
Step 8 (ask-user): Select name or provide custom
  ↓ User selects from suggestions or enters custom name
Step 9 (execute-action): Create project (mkdir + git init + DB insert)
  ↓ File system + git + database operations
Step 10 (display-output): Show success message
  ✓ Workflow complete, project created
```

**Workflow Engine Execution Flow:**

```
1. User triggers workflow (e.g., "Create Project" button)
   ↓
2. Frontend calls POST /api/workflows/:id/execute
   ↓
3. Backend creates workflow_executions record (status: "running")
   ↓
4. Engine loads workflow + steps from database (sorted by stepNumber)
   ↓
5. For each step:
   a. Resolve variables in step config using Handlebars
   b. Dispatch to step type handler
   c. If step requires user input:
      - Send step config to frontend
      - Wait for POST /api/workflows/executions/:id/step
   d. If step is backend-only (execute-action, llm-generate):
      - Execute immediately
      - Auto-advance to next step
   e. Update executedSteps JSONB with result
   f. Emit step_completed event
   g. Advance to nextStepNumber
   ↓
6. When nextStepNumber is null:
   - Mark workflow_executions.status = "completed"
   - Emit workflow_completed event
   - Return to frontend
```

**Variable Resolution Sequence:**

```
1. Engine encounters {{variable}} in step config
   ↓
2. Check precedence (first match wins):
   Level 1: System variables (current_user_id, execution_id, date)
   Level 2: Execution variables (workflow_executions.variables)
   Level 3: Step outputs (executedSteps[N].output)
   Level 4: Default values (from step config)
   ↓
3. If found: Replace with value
4. If not found: Raise error (missing required variable)
5. Support nested access: {{recommended_track.track}}
```

**Database Seed Sequence (Story 1.2):**

```
1. Run better-auth user seeding (existing)
   ↓
2. Seed 6 agents (PM, Analyst, Architect, DEV, SM, UX Designer)
   ↓
3. Seed workflow-init-new workflow (metadata only, no steps yet)
   ↓
4. Seed 6 workflow paths (quick-flow, method, enterprise × greenfield, brownfield)
   ↓
5. Stories 1.5-1.8: Incrementally seed workflow-init steps
   - Story 1.5: Seed steps 1-3
   - Story 1.6: Seed steps 4-6
   - Story 1.7: Seed steps 7-8
   - Story 1.8: Seed steps 9-10
```

## Non-Functional Requirements

### Performance

**Target Metrics (from PRD NFR001):**
- Workflow-init execution: < 5 minutes end-to-end (excluding user think time)
- LLM API calls: < 10 seconds per classification/generation task
- Database queries: < 100ms for single-table lookups, < 500ms for JSONB filtering
- UI responsiveness: < 200ms for step transitions, < 500ms for event updates

**Performance Strategies:**
- JSONB GIN indexes on `workflow_paths.tags` for efficient tag filtering (Story 1.1)
- Foreign key indexes on all FK columns (userId, workflowId, etc.) for fast joins
- OpenRouter models API caching: 1 hour TTL to reduce API calls (Story 1.3)
- Handlebars template compilation caching to avoid re-parsing (Story 1.4)
- Bounded JSONB field sizes: max 100 steps per workflow, max 50 executed steps tracked
- Database connection pooling via Drizzle default configuration
- No N+1 queries: Use Drizzle's `with` for eager loading workflow steps with workflows

**Epic 1 Performance Baseline:**
- Single user, local PostgreSQL, no concurrency concerns
- LLM latency dominated by OpenRouter API (out of our control)
- File system operations (mkdir, git init) < 1 second on SSD
- Focus: Ensure no artificial delays from inefficient queries or rendering

### Security

**Authentication & Authorization:**
- Better-auth session-based authentication (existing, reused in Story 1.3)
- All API endpoints require valid session token
- User ID extracted from session, passed to all service functions
- No cross-user data access: All queries filtered by `userId`

**API Key Storage:**
- LLM API keys stored in `app_config.openrouterApiKey`, `anthropicApiKey`, `openaiApiKey`
- **Critical:** Keys must be encrypted at application level before storage (implementation required in Story 1.3)
- Keys decrypted only when making LLM API calls (in-memory, never logged)
- Environment variable fallback for development: `OPENROUTER_API_KEY` env var if app_config empty

**Input Validation:**
- All ask-user step inputs validated against step config validation rules
- Path inputs sanitized to prevent directory traversal (block `..`, absolute path checks)
- Project names validated with regex: `^[a-z0-9-]+$` (no special chars except hyphens)
- LLM structured outputs validated against JSON schema before storage
- Database queries parameterized via Drizzle (no SQL injection risk)

**File System Security:**
- File operations restricted to user's project directories only
- Git operations only within project directories (no system-wide git access)
- Path validation before mkdir/git init to prevent escaping project root

**Error Handling:**
- LLM API errors sanitized (no API keys in error messages)
- Database errors logged server-side, generic message to client
- File system errors logged with sanitized paths (no sensitive info)

**Epic 1 Exclusions (Future Epics):**
- No rate limiting (single user, local app)
- No DDoS protection (not public-facing)
- No penetration testing (thesis MVP)
- No secrets management service (local encryption only)

### Reliability/Availability

**Workflow State Persistence (NFR002 - 99%+ success rate):**
- Workflow execution state saved after each step completion (executedSteps JSONB)
- Resume capability: If app crashes mid-workflow, user can reload and continue from last completed step
- Rollback on error: If step 9 (project creation) fails, no partial state left (cleanup mkdir on DB insert failure)

**Error Recovery:**
- LLM API failures: Retry logic with exponential backoff (3 attempts, 1s/2s/4s delays)
- Database connection failures: Drizzle auto-reconnect, app displays "Reconnecting..." message
- File system failures: Clear error message to user, no silent failures
- Git init failures: Cleanup empty directory, show actionable error ("Git not installed?")

**Data Integrity:**
- Foreign key constraints prevent orphaned records (cascade deletes on user deletion)
- Unique constraints prevent duplicate projects/workflows/agents
- JSONB validation before insert (TypeScript type guards + runtime checks)
- Idempotent seed scripts: Safe to run multiple times without duplicates (`.onConflictDoNothing()`)

**Availability:**
- Local PostgreSQL container: User controls availability (Docker must be running)
- No external dependencies except LLM APIs (OpenRouter, configurable fallbacks)
- Offline mode: Not supported (LLM calls required for workflow-init steps 4, 7)

**Degradation:**
- If OpenRouter API down: Display error, allow user to skip LLM steps (manual input fallback)
- If database down: App cannot function, display connection error with Docker restart instructions

### Observability

**Logging:**
- Workflow engine logs: Step transitions, variable resolutions, errors (console.log for Epic 1)
- LLM API calls: Request/response metadata (model, token count, latency), sanitized prompts
- Database operations: Query timing for slow query detection (> 500ms logged as warning)
- File system operations: mkdir/git init success/failure with paths (sanitized)
- Authentication: Login/logout events with userId (no passwords logged)

**Metrics (Epic 1 Baseline):**
- No formal metrics system (deferred to future epic)
- Manual tracking: Workflow completion times, LLM API latency, step failure rates
- Browser DevTools for frontend performance profiling

**Tracing:**
- Execution ID tracked throughout workflow lifecycle (DB → API → UI)
- Step-by-step execution history in `executedSteps` JSONB provides audit trail
- Error context includes: executionId, stepNumber, stepType, userId

**Error Reporting:**
- Backend errors logged to console with stack traces
- Frontend errors displayed to user with actionable messages
- LLM failures: Show raw API error + suggestion ("Check API key?")
- Database failures: Show connection state + Docker status check suggestion

**User Visibility (Epic 1):**
- WorkflowStepper shows: Current step (X of 10), step title, step goal
- Loading states: Spinner during LLM calls, "Executing..." during execute-action steps
- Event updates: Real-time step completion status (via polling or EventSource)
- No token usage display (deferred to Epic 2+ for cost visibility)

**Signals to Capture (Future):**
- Workflow execution success/failure rates
- Average time per step type
- LLM token usage and costs
- User drop-off rates (which steps abandoned?)
- Database query performance over time

## Dependencies and Integrations

**Core Dependencies:**

| Package | Version | Purpose | Story |
|---------|---------|---------|-------|
| **Backend/Database** |
| `drizzle-orm` | 0.44.2 | Type-safe ORM for PostgreSQL | 1.1, all |
| `pg` | ^8.14.1 | PostgreSQL client driver | 1.1 |
| `better-auth` | ^1.3.28 | Authentication system (existing) | 1.3 |
| `@trpc/server` | ^11.5.0 | Type-safe API routing | 1.3, 1.4 |
| `hono` | ^4.8.2 | Lightweight web framework (alternative to tRPC for some endpoints) | 1.4 |
| `zod` | ^4.1.11 | Runtime validation and TypeScript types | 1.1, all |
| `handlebars` | TBD | Template/variable resolution | 1.4 |
| `simple-git` | TBD | Git operations (init, commit) | 1.8 |
| **Frontend** |
| `react` | 19.1.0 | UI framework | 1.3, all |
| `react-dom` | 19.1.0 | React DOM renderer | 1.3 |
| `@tanstack/react-router` | ^1.114.25 | Type-safe routing | 1.3 |
| `@tanstack/react-query` | ^5.85.5 | Server state management | 1.3 |
| `@tanstack/react-table` | (via shadcn data-table) | Table component for models page | 1.3 |
| `@trpc/tanstack-react-query` | ^11.5.0 | tRPC React integration | 1.3 |
| `@trpc/client` | ^11.5.0 | tRPC client | 1.3 |
| `tailwindcss` | ^4.0.15 | Utility-first CSS | 1.3 |
| `shadcn/ui` | (component library + registries) | Pre-built React components from official + community registries | 1.3, all |
| `lucide-react` | ^0.473.0 | Icon library | 1.3 |
| `sonner` | ^2.0.5 | Toast notifications | 1.3 |
| **Build/Dev Tools** |
| `typescript` | ^5.8.2 | Type safety | all |
| `vite` | ^6.2.2 | Frontend build tool | 1.3 |
| `turbo` | ^2.5.4 | Monorepo build system | all |
| `bun` | (runtime) | JavaScript runtime, test framework | all |
| `@biomejs/biome` | ^2.2.0 | Linter and formatter | all |
| **Workspace Packages** |
| `@chiron/db` | workspace:* | Database schema and client | 1.1, 1.2 |
| `@chiron/api` | workspace:* | tRPC API routes | 1.4 |
| `@chiron/auth` | workspace:* | Better-auth configuration | 1.3 |
| `@chiron/scripts` | workspace:* | Database seed scripts | 1.2 |

**External Integrations:**

| Integration | Purpose | Authentication | Story |
|-------------|---------|----------------|-------|
| **OpenRouter API** | LLM provider (classification, structured generation) | API key in `app_config.openrouterApiKey` | 1.3, 1.6, 1.7 |
| **PostgreSQL** | Primary database (Docker container) | Local connection (no auth for dev) | 1.1 |
| **Docker** | PostgreSQL containerization | Local Docker socket | 1.1 |
| **Git** | Repository initialization via simple-git | System git binary required | 1.8 |

**New Dependencies to Add (Epic 1):**

```json
// packages/api/package.json
{
  "dependencies": {
    "handlebars": "^4.7.8",
    "simple-git": "^3.25.0"
  }
}
```

**shadcn/ui Component Strategy (Project-Wide Standard):**

Chiron uses shadcn/ui components and registries (https://ui.shadcn.com/docs/directory) as the standard approach for all UI development across all epics:

**Process:**
1. Explore shadcn component directory for desired component (sidebar, data-table, input, etc.)
2. Add registry to `apps/web/components.json` if not already present
3. Use shadcn CLI or MCP to add specific component from registry
4. Configure component to match Epic 1 requirements

**Epic 1 Components:**
- Sidebar component from registry for app navigation
- Data-table component (includes @tanstack/react-table) for models page
- Input components (text, path selector) for workflow steps
- Button, Card, Dialog components for general UI
- Form components for ask-user steps

**Future Epics:**
- All UI components will follow this same pattern
- Chat interfaces, Kanban boards, artifact viewers, etc. will use shadcn registries
- Custom components built on top of shadcn primitives

**Configuration:**
- Style: `new-york`
- Base color: `neutral`
- Icon library: `lucide`
- CSS variables: enabled
- Existing setup: `apps/web/components.json` (no changes needed for foundation)

**Version Constraints:**
- All `catalog:` references use versions defined in root `package.json` workspaces.catalog
- Workspace packages use `workspace:*` for local dependency resolution
- PostgreSQL Docker image: `postgres:17-alpine` (latest stable)
- Bun runtime: >= 1.1.0 (for Node-compatible APIs)

**Integration Notes:**
- OpenRouter API: Rate limits unknown, implement client-side retry logic
- PostgreSQL: Local Docker container, no remote DB in Epic 1
- Git: Requires system git installation (validated in Story 1.8)
- Better-auth: Existing setup reused, no new configuration needed

## Acceptance Criteria (Authoritative)

**AC1: Database Schema Implementation (Story 1.1)**
- 15 PostgreSQL tables created with correct relationships and indexes
- `workflows` table has `initializerType` field, no `isProjectInitializer`
- `projects` and `app_config` tables have `userId` foreign keys
- `workflow_step_branches` and `workflow_step_actions` tables removed
- JSONB step config types defined in TypeScript (AskUserStepConfig, AskUserChatStepConfig, etc.)
- Docker reset script (`scripts/reset-db.sh`) successfully recreates database
- All migration files deleted, no Drizzle migrations used
- Bun test framework configured and running

**AC2: Core Data Seeding (Story 1.2)**
- Better-auth users seeded successfully
- 6 core agents seeded: PM, Analyst, Architect, DEV, SM, UX Designer
- workflow-init-new workflow metadata seeded (no steps yet)
- 6 workflow paths seeded with correct tags and metadata
- Seed scripts are idempotent (can run multiple times without errors)
- `bun run db:seed` populates database successfully

**AC3: Web UI Foundation (Story 1.3)**
- Login page functional using better-auth
- Home page displays with "Create Project" button and empty state
- Sidebar navigation with links: Home, Projects, LLM Models, Settings
- App layout responsive with header, sidebar, main content area
- GET /api/projects endpoint returns empty array
- TanStack Router configured and routing works
- Visual design follows CARBON theme (from UX spec)

**AC4: LLM Models Page (Story 1.3)**
- Models page route `/models` accessible
- Fetches models from OpenRouter API on page load
- TanStack Table displays models with sortable columns
- Filters work: Provider (multi-select), Min Context Length (slider)
- Search by model name works (fuzzy)
- Loading state while fetching, error state if API fails
- Models cached for 1 hour

**AC5: Workflow Execution Engine Core (Story 1.4)**
- Engine loads workflow-init-new from database (metadata only, 0 steps)
- Step executor framework with handler registry implemented
- Variable resolver supports {{variable}} syntax with 4-level precedence
- Workflow execution state saved to `workflow_executions` table
- `executedSteps` JSONB tracks step history
- Events emitted: workflow_started, step_started, step_completed, workflow_completed, workflow_error
- WorkflowStepper and WorkflowStepContainer components render
- Can pause and resume workflow (load state from database)

**AC6: Workflow-Init Steps 1-3 (Story 1.5)**
- AskUserStepHandler supports path selector and text input
- ExecuteActionStepHandler supports set-variable action
- Steps 1-3 seeded to database
- AskUserStep component renders path selector and text input with validation
- ExecuteActionStep auto-executes and advances
- Can complete steps 1-3 end-to-end
- Variables saved: project_path, user_description, detected_field_type

**AC7: Workflow-Init Steps 4-6 (Story 1.6)**
- LLMGenerateStepHandler calls OpenRouter API for classification and structured generation
- ExecuteActionStepHandler supports database query with JSONB filtering
- AskUserChatStepHandler manages conversational chat with completion detection
- Steps 4-6 seeded to database
- LLMGenerateStep shows loading state, reasoning, and classification result
- AskUserChatStep renders chat interface with streaming responses
- Can complete steps 4-6 end-to-end
- Variables saved: recommended_track, available_paths, selected_workflow_path_id

**AC8: Workflow-Init Steps 7-8 (Story 1.7)**
- AskUserStepHandler supports choice input with allowCustom option
- Steps 7-8 seeded to database
- LLM generates 3 valid project name suggestions (kebab-case)
- User can select suggestion or enter custom name
- Custom name validation works (pattern: ^[a-z0-9-]+$, length 3-50)
- Variables saved: name_suggestions, project_name

**AC9: Workflow-Init Steps 9-10 (Story 1.8)**
- ExecuteActionStepHandler supports file (mkdir), git (init), and database (insert) actions
- DisplayOutputStepHandler renders markdown with variable interpolation
- Steps 9-10 seeded to database
- Project directory created successfully
- Git repository initialized in project directory
- Project record saved to database with all fields
- Success message displays with project details
- Complete workflow-init runs end-to-end (all 10 steps)
- New project appears in projects list on home page

**AC10: Testing Coverage (All Stories)**
- Unit tests for all step handlers (bun test)
- Integration tests for workflow execution engine
- Component tests for all step UI components
- End-to-end test: Complete workflow-init-new from start to finish
- All tests pass with `bun test`

## Traceability Mapping

| AC | PRD Requirement | Epic 1 Story | Component/API | Test Coverage |
|----|-----------------|--------------|---------------|---------------|
| AC1 | FR001 (Store workflows in DB) | 1.1 | workflows, workflow_steps tables | Schema validation tests |
| AC1 | FR032 (Initialize DB on first launch) | 1.1 | scripts/reset-db.sh | Docker reset integration test |
| AC2 | FR024 (Seed BMAD defaults) | 1.2 | seed scripts (agents, workflows, paths) | Seed idempotency tests |
| AC3 | FR035 (Create/import/delete projects) | 1.3 | GET /api/projects, home page | API integration tests |
| AC3 | Auth system | 1.3 | Better-auth (existing) | Auth flow tests (existing) |
| AC4 | LLM integration (implied by FR002) | 1.3 | OpenRouter API client, models page | API mock tests |
| AC5 | FR002 (Execute workflows following workflow.xml) | 1.4 | Workflow engine service | Engine unit tests, state persistence tests |
| AC5 | FR004 (4-level variable precedence) | 1.4 | Variable resolver | Variable resolution unit tests |
| AC5 | FR005 (Maintain workflow state, resume) | 1.4 | workflow_executions table, state loader | Pause/resume integration test |
| AC6 | User Journey 1 (Step 1-2: path, description) | 1.5 | AskUserStepHandler, AskUserStep component | Step handler unit tests, UI component tests |
| AC7 | User Journey 1 (Step 4: LLM classification) | 1.6 | LLMGenerateStepHandler | LLM integration tests (mocked) |
| AC7 | User Journey 1 (Step 5: Query paths) | 1.6 | ExecuteActionStepHandler (database action) | JSONB query tests |
| AC7 | User Journey 1 (Step 6: Conversational path selection) | 1.6 | AskUserChatStepHandler, AskUserChatStep component | Chat flow tests |
| AC8 | User Journey 1 (Step 7-8: Name generation, selection) | 1.7 | LLMGenerateStepHandler, choice input | Structured generation tests, validation tests |
| AC9 | User Journey 1 (Step 9: Directory + git + DB) | 1.8 | ExecuteActionStepHandler (file, git, DB) | File system tests, git init tests, DB insert tests |
| AC9 | FR036 (Validate project directory and git) | 1.8 | Project creation API | Path validation tests, git validation tests |
| AC9 | User Journey 1 (Step 10: Success message) | 1.8 | DisplayOutputStepHandler | Template rendering tests |
| AC10 | NFR002 (99%+ workflow success rate) | All | Full workflow engine + handlers | End-to-end workflow test |

**Cross-Story Traceability:**

**User Journey 1 (First-Time Setup) → Epic 1 Stories:**
- Journey Step 1-2 (Project info) → Story 1.5 (Steps 1-2)
- Journey Step 3 (Field type detection) → Story 1.5 (Step 3)
- Journey Step 4 (LLM classification) → Story 1.6 (Step 4)
- Journey Step 5 (Query paths) → Story 1.6 (Step 5)
- Journey Step 6 (Path selection chat) → Story 1.6 (Step 6)
- Journey Step 7-8 (Name generation) → Story 1.7 (Steps 7-8)
- Journey Step 9-10 (Create project) → Story 1.8 (Steps 9-10)

**PRD Epic 1 → Tech Spec Coverage:**
- Epic 1 Goal: "Establish database schema, workflow engine, project management primitives, and workflow-init conversational setup" ✅ COMPLETE
- All 6 original Epic 1 FRs (FR001-005, FR032-033, FR035-036) mapped to stories
- User Journey 1 fully implemented end-to-end
- NFR001-005 baseline established for single-user local app

## Risks, Assumptions, Open Questions

**Risks:**

| Risk | Impact | Mitigation | Owner |
|------|--------|------------|-------|
| **R1: JSONB step config too flexible** - No schema enforcement could lead to runtime errors | HIGH | TypeScript type guards, runtime validation with Zod, comprehensive tests for each step type | Story 1.4-1.8 |
| **R2: OpenRouter API rate limits unknown** | MEDIUM | Implement retry logic with exponential backoff, cache model list, allow user to configure API key | Story 1.6, 1.7 |
| **R3: Handlebars variable resolution edge cases** | MEDIUM | Extensive unit tests for nested variables, array access, missing variables, malformed templates | Story 1.4 |
| **R4: Docker PostgreSQL not running** | HIGH | Clear error messages with Docker status check instructions, validate DB connection on app startup | Story 1.1, 1.3 |
| **R5: LLM structured output schema mismatch** | MEDIUM | JSON schema validation, fallback to manual input if LLM fails, show LLM reasoning to user | Story 1.6, 1.7 |
| **R6: Git not installed on user system** | MEDIUM | Validate git installation before workflow-init, show actionable error with download link | Story 1.8 |
| **R7: File system permissions issues** | LOW | Path validation, clear error messages, test on different OS (Mac, Linux, Windows via WSL) | Story 1.8 |
| **R8: Better-auth encryption for API keys** | HIGH | Research encryption at application level (not implemented in Story 1.3), document TODOs for future | Story 1.3 |
| **R9: Workflow engine complexity** | MEDIUM | Build incrementally (Stories 1.5-1.8), comprehensive integration tests, learn from BMAD workflow.xml | Story 1.4 |
| **R10: shadcn component compatibility** | LOW | Test components in isolation before integration, follow shadcn best practices, use MCP for guidance | Story 1.3+ |

**Assumptions:**

| Assumption | Validation Strategy |
|------------|---------------------|
| **A1:** Users have Docker installed and running | Document in README, check Docker status on app startup |
| **A2:** Users have git installed globally | Validate in Story 1.8, show error with download link if missing |
| **A3:** Users have OpenRouter API key or willing to sign up | Provide signup link, allow empty key for exploration (skip LLM steps) |
| **A4:** Better-auth is production-ready for local app | Existing setup has been tested, assume stable |
| **A5:** Bun runtime is stable for Epic 1 use cases | Test file system operations, git integration, and test framework early |
| **A6:** 10 workflow-init steps are sufficient for MVP | Based on BMAD CLI experience, can add/modify steps if needed |
| **A7:** Single-user local app (no concurrency) | NFRs scoped to single user, multi-user deferred to future epics |
| **A8:** Web-first (no Tauri) is acceptable for Epic 1 | Validated with stakeholder, Tauri deferred to post-MVP |
| **A9:** No migrations needed (Docker reset) is acceptable for development | Team agreement, migrations deferred until production readiness |
| **A10:** shadcn registries provide all needed components | If not, can build custom components on shadcn primitives |

**Open Questions:**

| Question | Blocking? | Resolution Plan | Target Story |
|----------|-----------|-----------------|--------------|
| **Q1:** What's the exact minLength for project description (currently 20 chars)? | No | Test with PM during Story 1.5, adjust if needed | 1.5 |
| **Q2:** Should we encrypt API keys at application level or rely on file system permissions? | Yes | Research options in Story 1.3, document decision in tech spec | 1.3 |
| **Q3:** How should we handle LLM API failures? Retry? Manual fallback? | No | Implement retry + manual fallback, test with mock failures | 1.6 |
| **Q4:** What's the max conversation turns for ask-user-chat (currently 10)? | No | Start with 10, adjust based on UX testing during Story 1.6 | 1.6 |
| **Q5:** Should path selector use native file picker or text input? | No | Prototype both in Story 1.5, choose based on cross-platform compatibility | 1.5 |
| **Q6:** What's the rollback strategy if project creation (Step 9) partially fails? | Yes | Cleanup mkdir on DB insert failure, test in Story 1.8 | 1.8 |
| **Q7:** Should we validate project name uniqueness (currently per-user)? | No | Implement per-user uniqueness, test edge cases in Story 1.8 | 1.8 |
| **Q8:** How do we handle workflow state if user closes browser mid-workflow? | No | Persist state in DB after each step, test resume in Story 1.4 | 1.4 |
| **Q9:** What model should be default for LLM calls (gpt-4, claude-3.5-sonnet)? | No | Use OpenRouter recommended model or let user choose in models page | 1.6 |
| **Q10:** Should we add workflow execution timeout (e.g., 30 minutes)? | No | No timeout for Epic 1 (user-paced), consider for future epics | 1.4 |

## Test Strategy Summary

**Test Framework:** Bun test (all tests use `bun test`)

**Test Levels:**

**1. Unit Tests (Component/Function Level)**
- **Database Schema (Story 1.1):**
  - Foreign key constraint enforcement
  - Unique constraint validation
  - JSONB field type checking
  - Cascade delete behavior
- **Seed Scripts (Story 1.2):**
  - Idempotency (run twice, no duplicates)
  - Foreign key resolution (agent IDs, workflow IDs)
  - JSONB tag structure validation
- **Workflow Engine (Story 1.4):**
  - Variable resolution (all 4 precedence levels)
  - Handlebars template rendering (nested variables, arrays)
  - Step executor dispatch (correct handler selected)
  - State persistence (executedSteps JSONB updates)
  - Event emission (correct events fired)
- **Step Handlers (Stories 1.5-1.8):**
  - AskUserStepHandler: Input validation (minLength, pattern, required)
  - ExecuteActionStepHandler: Each action type (set-variable, file, git, database)
  - LLMGenerateStepHandler: Classification and structured generation (mocked LLM)
  - AskUserChatStepHandler: Completion detection, conversation history
  - DisplayOutputStepHandler: Markdown rendering, variable interpolation
- **UI Components (Stories 1.3-1.8):**
  - AskUserStep: Renders path selector, text input, choices correctly
  - LLMGenerateStep: Shows loading, reasoning, result
  - AskUserChatStep: Chat messages, input field, completion button
  - DisplayOutputStep: Markdown rendering with variables
  - WorkflowStepper: Progress display (X of N)

**2. Integration Tests (Multi-Component)**
- **Workflow Execution Flow (Story 1.4):**
  - Load workflow from DB → Execute steps → Save state → Resume
  - Variable propagation across steps (step 2 output → step 3 input)
  - Error handling (LLM failure, DB failure, validation failure)
- **API Endpoints (Stories 1.3-1.8):**
  - GET /api/projects (returns correct data)
  - POST /api/workflows/:id/execute (creates execution record)
  - POST /api/workflows/executions/:id/step (advances step, saves state)
  - GET /api/models (fetches from OpenRouter, caches)
- **Database Operations (Stories 1.5-1.8):**
  - JSONB queries (filter workflow_paths by tags)
  - Complex inserts (project with FK references)
  - Transaction rollback on error (cleanup mkdir if DB fails)

**3. End-to-End Tests (Full User Journey)**
- **Workflow-Init Complete Flow (Story 1.8):**
  - Start workflow → Complete all 10 steps → Project created
  - Verify: Directory exists, git initialized, DB record correct
  - Verify: Project appears in home page list
- **Error Recovery (Story 1.8):**
  - Pause workflow at step 5 → Reload app → Resume from step 5
  - Step 9 fails (mkdir error) → Cleanup → Retry
- **LLM Integration (Story 1.6-1.7):**
  - Mock OpenRouter API responses
  - Test classification result parsing
  - Test structured generation schema validation

**Test Coverage Targets:**
- Unit tests: 80%+ code coverage
- Integration tests: All critical paths covered
- End-to-end tests: At least 1 happy path + 3 error scenarios

**Testing Tools:**
- Bun test for all test execution
- Mock LLM API responses (no real OpenRouter calls in tests)
- In-memory SQLite for DB unit tests (fast)
- Docker PostgreSQL for integration tests (realistic)
- React Testing Library for component tests

**Test Execution:**
```bash
# Run all tests
bun test

# Run specific story tests
bun test --filter "Story 1.4"

# Run with coverage
bun test --coverage

# Watch mode during development
bun test --watch
```

**Continuous Testing:**
- Run tests before each commit (husky pre-commit hook)
- Run tests in CI pipeline (future)
- Manual testing checklist for each story before marking "done"

**Manual Testing Checklist (Per Story):**
- [ ] Happy path works end-to-end
- [ ] Error messages are clear and actionable
- [ ] Loading states display correctly
- [ ] Validation prevents invalid input
- [ ] UI matches wireframes/design
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Responsive layout works (min 1280x720)
