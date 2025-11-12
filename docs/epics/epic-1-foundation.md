# Epic 1: Foundation + Workflow-Init Engine

**Goal:** Build database foundation, web UI shell, generic workflow execution engine, and complete workflow-init-new implementation

**Duration:** ~21 days (4.2 weeks)
**Dependencies:** None (foundation epic)
**Owner:** DEV Agent

**Key Deliverables:**
- Complete database foundation (16 tables, no migrations - Docker reset approach)
- Web application with authentication (better-auth)
- Generic workflow execution engine (reusable for all future workflows)
- LLM integration (OpenRouter) with models selection page
- 5 step type handlers (ask-user, execute-action, llm-generate, ask-user-chat, display-output)
- Complete workflow-init-new (10 steps, end-to-end)
- Users can create projects through conversational workflow

**Testing Framework:**
- Use Bun test framework for all unit and integration tests
- Test files: `*.test.ts` or `*.spec.ts`
- Run tests: `bun test`
- Coverage: `bun test --coverage`

---

## Stories

### Story 1.1: Database Schema Refactoring
**Priority:** P0 (Critical)
**Estimate:** 2 days

**Description:**
Refactor database schema to match final design from `docs/epics/epic-1-database-implementation.md`. Remove migration system - use direct schema application with Docker container reset during development.

**Acceptance Criteria:**
- [ ] Update schema files in `packages/db/src/schema/`:
  - Remove `workflow_step_branches`, `workflow_step_actions` tables (deprecated)
  - Update `workflows` table (add `initializerType`, remove `isProjectInitializer`)
  - Update `projects` table (add `userId` foreign key)
  - Update `appConfig` table (add `userId` unique constraint)
  - Add new step config types (AskUserChatStepConfig, expanded AskUserStepConfig)
- [ ] Create `scripts/reset-db.sh` script:
  - `docker-compose down -v` (remove volumes)
  - `docker-compose up -d` (recreate containers)
  - Apply schema directly (no migrations)
- [ ] Delete all existing migration files from `packages/db/src/migrations/`
- [ ] All 16 tables created with correct relationships
- [ ] Indexes on frequently queried columns (projects.userId, workflows.module, etc.)
- [ ] Test: `bun run db:reset` works cleanly
- [ ] Test: `bun test` runs successfully (setup test framework)

**Technical Notes:**
- Use Drizzle ORM schema definition, skip Drizzle migrations
- PostgreSQL enums for status fields (IDLE, ACTIVE, PAUSED, etc.)
- Reference: `docs/architecture/database-schema-architecture.md`
- Reference: `docs/epics/epic-1-database-implementation.md` for detailed schema changes

---

### Story 1.2: Core Data Seeding
**Priority:** P0 (Critical)
**Estimate:** 1 day
**Dependencies:** Story 1.1

**Description:**
Seed essential data: users (using existing better-auth), agents, workflow-init-new workflow metadata, and workflow paths. Do NOT seed workflow steps yet (comes in Stories 1.5-1.8).

**Acceptance Criteria:**
- [ ] Users seeded (use existing better-auth seeding in `packages/scripts/src/seeds/`)
- [ ] 6 core agents seeded into `agents` table:
  - PM (Product Manager)
  - Analyst (Business Analyst)
  - Architect (Solutions Architect)
  - DEV (Developer)
  - SM (Scrum Master)
  - UX Designer
- [ ] workflow-init-new workflow seeded (metadata only, NO steps):
  - name: "workflow-init-new"
  - displayName: "Initialize New Project"
  - module: "bmm"
  - agentId: PM agent
  - initializerType: "new-project"
- [ ] 6 workflow paths seeded:
  - quick-flow-greenfield, quick-flow-brownfield
  - method-greenfield, method-brownfield
  - enterprise-greenfield, enterprise-brownfield
- [ ] Seed script is idempotent (can run multiple times safely using `.onConflictDoNothing()` or existence checks)
- [ ] Test: `bun run db:seed` populates database successfully
- [ ] Unit tests for seed functions (using `bun test`)

**Technical Notes:**
- Better-auth user seeding already exists - reuse it
- Create new seed files:
  - `packages/scripts/src/seeds/agents.ts`
  - `packages/scripts/src/seeds/workflow-init-new.ts`
  - `packages/scripts/src/seeds/workflow-paths.ts`
- Reference: `docs/epics/epic-1-database-implementation.md` for seed data structure
- Idempotent pattern: Use Drizzle's `.onConflictDoNothing()` or check existence before insert

---

### Story 1.3: Web UI Foundation + LLM Models Page
**Priority:** P0 (Critical)
**Estimate:** 3 days
**Dependencies:** Story 1.2

**Description:**
Set up React web application with authentication (using existing better-auth), home page with project list, basic layout shell, and LLM models selection page.

**Acceptance Criteria:**

**Authentication & Layout:**
- [ ] Login page uses existing better-auth setup
- [ ] Home page displays:
  - "Create Project" button (primary action, does nothing yet)
  - Projects list (empty state: "No projects yet" message with icon)
  - Basic table/card layout for projects (when they exist)
- [ ] App layout structure:
  - Left sidebar: Navigation (Home, Projects, LLM Models, Settings)
  - Top bar: Project name (if selected), user avatar, logout
  - Main content area: Page content
- [ ] Connect to backend API:
  - GET `/api/projects` endpoint (returns empty array for now)
- [ ] Routing setup (TanStack Router)
- [ ] Hot reload works for development
- [ ] Visual design follows UX foundation (CARBON theme, corner borders, monospace typography)

**LLM Models Page:**
- [ ] Models page route: `/models`
- [ ] Fetch available models from OpenRouter API on page load
- [ ] TanStack Table displaying models with columns:
  - Model Name
  - Provider (OpenAI, Anthropic, Google, Meta, etc.)
  - Context Length
  - Input Price (per 1M tokens)
  - Output Price (per 1M tokens)
- [ ] Table features:
  - Filter by Provider (dropdown multi-select)
  - Filter by Min Context Length (slider or input)
  - Search by model name (fuzzy search)
  - Sort all columns (ascending/descending)
- [ ] Model selection saved to user preferences (placeholder for future - just UI for now)
- [ ] Link in sidebar navigation: "LLM Models"
- [ ] Loading state while fetching models
- [ ] Error state if API fails

**Testing:**
- [ ] Unit tests for components (using `bun test`)
- [ ] Test API integration (mock tRPC calls)

**Technical Notes:**
- Frontend: `apps/web/src/`
- API: `packages/api/` (tRPC for type-safe API calls)
- Auth: `packages/auth/` (better-auth already configured)
- UI components: shadcn/ui (already installed)
- Routing: TanStack Router (already installed)
- OpenRouter models API: `GET https://openrouter.ai/api/v1/models`
- Cache models list (refresh every hour or on demand)
- Use TanStack Table v8

**Wireframes:**
- Home page layout (header, sidebar, main content)
- Empty state (shown when no projects exist)
- Projects list (shown when projects exist)
- LLM Models page (table with filters)

---

### Story 1.4: Workflow Execution Engine Core
**Priority:** P0 (Critical)
**Estimate:** 3 days
**Dependencies:** Story 1.3

**Description:**
Build the generic workflow execution engine foundation that will power all workflows in Chiron. This is the core service that loads workflows from the database, executes steps sequentially, manages state, and resolves variables.

**Acceptance Criteria:**

**Workflow Engine Backend:**
- [ ] Workflow loader service:
  - Read workflow + steps from database by workflow ID
  - Load steps in correct order (by `stepNumber`)
  - Validate workflow structure (no missing steps, valid nextStepNumber references)
- [ ] Step executor framework:
  - Generic step handler interface: `executeStep(step, context) → result`
  - Step type registry: Register handlers for each step type
  - Step execution loop: Execute steps sequentially, respect `nextStepNumber`
  - Support step transitions: auto-advance or wait for user input
- [ ] Variable resolver:
  - Resolve `{{variable}}` references using Handlebars templating
  - 4-level precedence:
    1. System variables (`current_user_id`, `execution_id`, `{{date}}`)
    2. Execution variables (from `workflow_executions.variables`)
    3. Step outputs (from `executedSteps[N].output`)
    4. Default values (from step config)
  - Handle nested variables: `{{user.name}}`, `{{array[0]}}`, etc.
- [ ] State management:
  - Create `workflow_executions` record on workflow start
  - Save current step to `current_step_id`
  - Track executed steps in `executedSteps` JSONB field:
    ```json
    {
      "1": { "status": "completed", "output": {...}, "completedAt": "..." },
      "2": { "status": "in-progress", "startedAt": "..." }
    }
    ```
  - Support pause/resume workflow (load state from database)
- [ ] Event system:
  - Emit events: `workflow_started`, `step_started`, `step_completed`, `workflow_completed`, `workflow_error`
  - UI subscribes to events for real-time updates (Server-Sent Events or WebSocket)

**Workflow UI Components:**
- [ ] `WorkflowStepper` component:
  - Shows progress: "Step X of N"
  - Progress bar (visual indicator)
  - Current step title and goal
- [ ] `WorkflowStepContainer` component:
  - Wrapper for step UI components
  - Handles step transitions (Next/Back buttons)
  - Shows loading state while step executes
  - Error handling and display
- [ ] Basic step navigation:
  - "Next" button (submits current step, advances)
  - "Back" button (go to previous step with warning)
  - Auto-advance for backend-only steps (execute-action, llm-generate auto-complete)

**Testing:**
- [ ] Unit tests for workflow engine services (using `bun test`)
- [ ] Test: Load workflow-init-new from database (no steps yet, just metadata)
- [ ] Test: Execute empty workflow (0 steps) successfully
- [ ] Test: Variable resolution with all precedence levels
- [ ] Test: Workflow state saves/loads from database
- [ ] Integration test: Start workflow → pause → resume

**Technical Notes:**
- Engine service: `packages/api/src/services/workflow-engine.ts`
- Step handlers directory: `packages/api/src/services/workflow-engine/step-handlers/`
- Variable resolver: Use `handlebars` library
- Event system: Node EventEmitter or custom event bus
- State machine pattern for workflow status (IDLE → RUNNING → PAUSED → COMPLETED → ERROR)
- Reference: `bmad/core/tasks/workflow.xml` for workflow execution logic

---

### Story 1.5: Workflow-Init Steps 1-3 (Foundation)
**Priority:** P0 (Critical)
**Estimate:** 3 days
**Dependencies:** Story 1.4

**Description:**
Implement workflow-init steps 1-3: Get project directory (path selector), get project description (text input), set field type to greenfield (execute-action). Build ask-user and execute-action step handlers.

**Workflow Steps:**
- **Step 1:** Get project directory (ask-user - path)
- **Step 2:** Get project description (ask-user - string)
- **Step 3:** Set field type to greenfield (execute-action)

**Process:**
1. Study BMAD workflow-init steps 1-3 implementation
2. Create wireframes (ASCII art, markdown, or v0 prompt as needed)
3. Define step config JSON for each step
4. Seed steps 1-3 to `workflow_steps` table
5. Build step handlers + UI components
6. Test steps 1-3 in workflow execution

**Acceptance Criteria:**

**Step Handlers (Backend):**
- [ ] `AskUserStepHandler` implementation:
  - Supports `responseType: "path"` (path selector)
  - Supports `responseType: "string"` (text input)
  - Validates input (required, minLength, maxLength, pattern)
  - Saves response to `responseVariable` in workflow execution state
- [ ] `ExecuteActionStepHandler` implementation:
  - Supports `set-variable` action type
  - Executes actions sequentially
  - Auto-advances to next step (no user input needed)

**UI Components (Frontend):**
- [ ] `AskUserStep` component:
  - Renders path selector (directory picker using file system API or text input with validation)
  - Renders text input with real-time validation
  - Shows validation errors clearly
  - Submits response to backend on "Next" button
- [ ] `ExecuteActionStep` component:
  - Invisible to user (backend-only step)
  - Shows brief loading indicator
  - Auto-advances when complete

**Seeding:**
- [ ] Step 1 seeded with path selector config
- [ ] Step 2 seeded with text input config (minLength: 20, maxLength: 1000)
- [ ] Step 3 seeded with set-variable action (detected_field_type = "greenfield")

**Testing:**
- [ ] Unit tests for step handlers (using `bun test`)
- [ ] Integration test: Start workflow-init-new
- [ ] Test: Step 1 displays path selector
- [ ] Test: Step 2 displays text input with validation (min 20 chars)
- [ ] Test: Step 3 executes silently and advances
- [ ] Test: Variables saved correctly: `project_path`, `user_description`, `detected_field_type`

**Wireframes:**
- Path selector UI (simple text input with browse button or native picker)
- Text input UI with validation feedback

**Technical Notes:**
- Path selector: Use native file picker API or text input with manual entry
- Step handler pattern: `async executeStep(step, execution, userInput?) → StepResult`
- Reference: `docs/epics/epic-1-database-implementation.md` → workflow-init-new Steps 1-3

---

### Story 1.6: Workflow-Init Steps 4-6 (Analysis)
**Priority:** P0 (Critical)
**Estimate:** 4 days
**Dependencies:** Story 1.5

**Description:**
Implement workflow-init steps 4-6: Analyze project complexity (LLM classification), fetch workflow paths (DB query), help user choose path (conversational chat). Build llm-generate and ask-user-chat step handlers. Includes Mastra + Ax integration with approval gates and Anthropic API key configuration.

**Workflow Steps:**
- **Step 4:** Analyze complexity (llm-generate - classification)
- **Step 5:** Fetch workflow paths (execute-action - DB query)
- **Step 6:** Help choose path (ask-user-chat - conversational)

**Process:**
1. Study BMAD workflow-init steps 4-6 implementation
2. Create wireframes (especially for chat UI - critical UX)
3. Define step config JSON with LLM prompts and system instructions
4. Seed steps 4-6
5. Build step handlers + UI components
6. Integrate Mastra + Ax for LLM orchestration
7. Test steps 4-6 in workflow execution

**Acceptance Criteria:**

**Mastra + Ax Integration:**
- [ ] Install dependencies:
  - `@mastra/core`, `@mastra/pg`, `@mastra/memory`, `@mastra/evals`
  - `@ax-llm/ax`
  - `@ai-sdk/anthropic`, `@ai-sdk/openai`
- [ ] Configure Mastra PostgreSQL storage (mastra.* schema)
- [ ] Implement ACE optimizer for PM Agent:
  - Load PM Agent with ACE playbook (online learning)
  - ACE learns from rejections (user feedback)
  - Update ace_playbooks table on rejection
- [ ] Database schema additions:
  - `agents.instructions` (text field for agent instructions)
  - `ace_playbooks` table (agent-level knowledge)
  - `mipro_training_examples` table (approved outputs for Phase 2)
- [ ] Build approval gate UI:
  - Preview generated content
  - Approve/Reject buttons
  - Feedback input on rejection
- [ ] Side effects implementation:
  - `update_summary` tool (updates execution variables)
  - `update_complexity` tool (updates complexity classification)
- [ ] Data collection:
  - Save approved outputs to mipro_training_examples
  - Save rejections + feedback to ace_playbooks

**Anthropic Configuration (Settings UI):**
- [ ] Update Settings router (`packages/api/src/routers/settings.ts`):
  - `getAnthropicKey` procedure (returns masked key)
  - `saveAnthropicKey` procedure (encrypts and stores)
  - `updateAnthropicKey` procedure (updates existing key)
  - `removeAnthropicKey` procedure (deletes key)
  - `testAnthropicKey` procedure (validates key with Anthropic API)
- [ ] Update Settings page (`apps/web/src/routes/_authenticated.settings.tsx`):
  - Add Anthropic API key card (similar to existing OpenRouter card)
  - Input field with show/hide toggle
  - Test, Save, Update, Remove buttons
  - Status indicator (Valid/Invalid/Testing)
- [ ] Add Anthropic setup guide:
  - Link to https://console.anthropic.com/settings/keys
  - Instructions on getting API key
  - Model availability information
- [ ] List available Anthropic models in UI:
  - claude-3-5-sonnet-20241022
  - claude-3-7-sonnet-20250219
  - claude-opus-4-20250514
  - claude-haiku-4-5
  - Include pricing and context window info
- [ ] Update environment documentation:
  - Add `ANTHROPIC_API_KEY` to `.env.example` files
  - Document Mastra environment variables

**Step Handlers (Backend):**
- [ ] `LLMGenerateStepHandler` implementation:
  - Uses Mastra Agent with Ax signature
  - Supports `llmTask.type: "classification"` (returns category + reasoning)
  - Supports `llmTask.type: "structured"` (returns JSON matching schema)
  - Parses structured output with JSON schema validation
  - Saves result to `outputVariable`
  - Handles LLM errors gracefully (retry, fallback)
  - Triggers approval gate for classifications
- [ ] `ExecuteActionStepHandler` extensions:
  - Supports `database` action type (query workflow_paths table)
  - Supports JSONB filtering (`tags->>'fieldType' = "greenfield"`)
  - Saves query results to output variable
- [ ] `AskUserChatStepHandler` implementation:
  - Initializes chat session with `systemPrompt`
  - Uses Mastra agent with conversation memory
  - Streams LLM responses to user (Server-Sent Events or WebSocket)
  - Maintains conversation history
  - Detects completion condition:
    - `user-satisfied`: User explicitly confirms choice
    - `confidence-threshold`: LLM confidence > threshold
    - `max-turns`: Maximum conversation turns reached
  - Extracts final output (selected path ID) to `outputVariable`

**UI Components (Frontend):**
- [ ] `LLMGenerateStep` component:
  - Shows loading state ("Analyzing your project..." with spinner)
  - Displays LLM reasoning in readable format
  - Shows classification result (quick-flow / method / enterprise)
  - Highlight box showing why this track was recommended
  - Approval gate modal:
    - Preview classification with reasoning
    - Approve/Reject buttons
    - Feedback textarea on reject
  - Auto-advances when approved
- [ ] `AskUserChatStep` component:
  - Chat interface with message bubbles
  - User messages aligned right (blue), AI messages left (gray)
  - Shows typing indicator while LLM generates response
  - Displays workflow path options in chat context (cards or list)
  - Input field for user questions
  - "I'm ready to choose" button appears when user satisfied
  - Completion triggers path selection

**Seeding:**
- [ ] Step 4 seeded with classification task:
  - Categories: quick-flow, method, enterprise
  - Input: `{{user_description}}`
  - Reasoning: true
  - Approval gate: enabled
- [ ] Step 5 seeded with DB query:
  - Filter: `tags->>'fieldType' = "{{detected_field_type}}"`
  - Output: `available_paths`
- [ ] Step 6 seeded with chat config:
  - System prompt: Explain workflow paths, help user choose
  - Available paths: `{{available_paths}}`
  - Recommended track: `{{recommended_track}}`
  - Completion condition: user-satisfied, max 10 turns

**Testing:**
- [ ] Unit tests for Mastra integration (using `bun test`)
- [ ] Unit tests for ACE optimizer
- [ ] Unit tests for approval gate handlers
- [ ] Test: Step 4 classifies project based on description
- [ ] Test: Approval gate shows preview
- [ ] Test: Rejection updates ACE playbook
- [ ] Test: Approval saves to mipro_training_examples
- [ ] Test: Step 5 fetches workflow paths from database
- [ ] Test: Step 6 displays chat interface
- [ ] Test: Can ask questions about workflow paths
- [ ] Test: LLM responds with path recommendations
- [ ] Test: Can select a path and complete step
- [ ] Test: Variables saved: `recommended_track`, `available_paths`, `selected_workflow_path_id`
- [ ] Integration test: Steps 4-6 flow sequentially with approval gates
- [ ] Test: Anthropic API key CRUD operations
- [ ] Test: Anthropic key validation with API

**Wireframes:**
- LLM loading state (animated, informative)
- Classification result display (card with reasoning)
- Approval gate modal (preview + approve/reject)
- Chat interface layout (messages, input, path options)
- Path selection cards (in chat context)
- Anthropic API key settings card

**Technical Notes:**
- Mastra service: `packages/api/src/services/mastra.ts`
- Ax service: `packages/api/src/services/ax.ts`
- ACE playbook service: `packages/api/src/services/ace.ts`
- Chat streaming: Server-Sent Events (SSE) recommended for simplicity
- Model selection: Use model from user preferences (supports both OpenRouter and Anthropic)
- Default Anthropic model: `anthropic/claude-3-5-sonnet-20241022`
- Conversation history: Store in Mastra threads (automatic)
- Approval gate state: Track in `workflow_executions.variables.approval_states`
- Reference: `docs/epics/epic-1-database-implementation.md` → Steps 4-6
- Reference: `docs/architecture/STORY-1-6-ARCHITECTURE-SUMMARY.md` for Mastra + Ax architecture

---

### Story 1.7: Workflow-Init Steps 7-8 (Naming)
**Priority:** P0 (Critical)
**Estimate:** 2 days
**Dependencies:** Story 1.6

**Description:**
Implement workflow-init steps 7-8: Generate project name suggestions (LLM structured output), user selects name or provides custom (ask-user with choices + allowCustom).

**Workflow Steps:**
- **Step 7:** Generate name suggestions (llm-generate - structured)
- **Step 8:** Select project name (ask-user - choices with custom option)

**Process:**
1. Study BMAD workflow-init steps 7-8 implementation
2. Create wireframes for name selection UI
3. Define step config JSON
4. Seed steps 7-8
5. Extend existing handlers (already built in 1.5-1.6)
6. Test steps 7-8

**Acceptance Criteria:**

**Step Handler Extensions:**
- [ ] `AskUserStepHandler` extensions:
  - Supports `responseType: "choice"` with dynamic options from previous step
  - Supports `choices.allowCustom: true` (show custom text input option)
  - Validates choice against available options OR custom pattern
  - Custom input validation: pattern `^[a-z0-9-]+$` (kebab-case)

**UI Components:**
- [ ] `AskUserStep` extensions for choice selection:
  - Renders choice list (radio buttons or selectable cards)
  - Shows "Custom" option if `allowCustom: true`
  - Reveals text input when "Custom" selected
  - Validates custom input (kebab-case, 3-50 chars, no special chars except hyphens)
  - Real-time validation feedback

**Seeding:**
- [ ] Step 7 seeded with LLM structured generation task:
  - Generate 3 project name suggestions
  - Requirements: lowercase, kebab-case, descriptive, 2-3 words, professional
  - Input: `{{user_description}}`
  - Schema: `{ suggestions: string[] }` (array of 3 strings)
- [ ] Step 8 seeded with choices config:
  - Options: `{{name_suggestions.suggestions}}` (dynamic from step 7)
  - Allow custom: true
  - Validation: pattern `^[a-z0-9-]+$`, minLength 3, maxLength 50

**Testing:**
- [ ] Unit tests for choice handler extensions (using `bun test`)
- [ ] Test: Step 7 generates 3 valid project name suggestions
- [ ] Test: Step 8 displays suggestions as selectable options
- [ ] Test: Can select a suggested name
- [ ] Test: Can choose "Custom" and enter own name
- [ ] Test: Custom name validates correctly (kebab-case enforcement)
- [ ] Test: Invalid names show appropriate error messages
- [ ] Test: Variables saved: `name_suggestions`, `project_name`

**Wireframes:**
- Name suggestions display (cards with radio selection)
- Custom name input with validation feedback

**Technical Notes:**
- Name generation prompt: "Generate 3 project names: lowercase, kebab-case (e.g., task-manager), descriptive, 2-3 words, professional, memorable"
- Validation regex: `/^[a-z0-9-]+$/`
- Reference: `docs/epics/epic-1-database-implementation.md` → Steps 7-8

---

### Story 1.8: Workflow-Init Steps 9-10 (Creation & Confirmation)
**Priority:** P0 (Critical)
**Estimate:** 3 days
**Dependencies:** Story 1.7

**Description:**
Implement workflow-init steps 9-10: Create project (directory + git + DB record), display success message. Build project creation API, display-output step handler, and complete end-to-end workflow-init.

**Workflow Steps:**
- **Step 9:** Create project (execute-action - complex multi-action)
- **Step 10:** Confirm success (display-output)

**Process:**
1. Study BMAD workflow-init steps 9-10 implementation
2. Create wireframes for success message display
3. Define step config JSON
4. Seed steps 9-10
5. Build step handlers + project creation API
6. Test end-to-end workflow

**Acceptance Criteria:**

**Step Handler Extensions:**
- [ ] `ExecuteActionStepHandler` extensions:
  - Supports `file` action type:
    - Operation: `mkdir` with recursive flag
    - Uses Node-compatible Bun APIs: `import { mkdir } from "node:fs/promises"`
  - Supports `git` action type:
    - Operation: `init`, `commit`
    - Uses `simple-git` library
  - Supports `database` action type:
    - Operation: `insert` into projects table
    - Returns inserted record ID
  - Executes multiple actions sequentially
  - Rolls back on error (delete directory if DB insert fails)
  - Handles errors gracefully with clear messages
- [ ] `DisplayOutputStepHandler` implementation:
  - Renders content template with variable interpolation (Handlebars)
  - Supports markdown formatting
  - Supports conditionals (Handlebars `{{#if}}` helpers)
  - No user input required (read-only display)

**UI Components:**
- [ ] `DisplayOutputStep` component:
  - Renders markdown content with formatting
  - Shows success icon/checkmark (celebratory feel)
  - Displays project details (name, path, workflow path)
  - "Continue to Dashboard" button to navigate to home page
  - Confetti animation (optional but delightful)

**Project Creation API:**
- [ ] POST `/api/projects` endpoint:
  - Accepts: `name`, `path`, `workflowPathId`, `userId`
  - Validates:
    - Project name is unique for this user
    - Directory doesn't already exist at `path/name`
    - Workflow path exists in database
  - Creates directory: `await mkdir(path/name, { recursive: true })`
  - Initializes git repository: `git init`
  - Creates initial commit with README (optional)
  - Inserts project record into database:
    - `name`, `path`, `userId`, `workflowPathId`, `initializedByExecutionId`
  - Returns project ID and full project object
  - Error handling: Cleanup on failure (delete directory if created)

**Seeding:**
- [ ] Step 9 seeded with execute-action config:
  - Actions: file (mkdir), git (init), database (insert projects)
  - Variables used: `{{project_path}}`, `{{project_name}}`, `{{selected_workflow_path_id}}`, `{{current_user_id}}`, `{{execution_id}}`
- [ ] Step 10 seeded with display-output config:
  - Success message template with project details
  - Markdown formatted with celebration

**Testing:**
- [ ] Unit tests for execute-action extensions (using `bun test`)
- [ ] Unit tests for display-output handler
- [ ] Unit tests for POST /api/projects endpoint
- [ ] Test: Step 9 creates project directory at correct path
- [ ] Test: Git repository initialized in project directory
- [ ] Test: Project record saved to database with all fields
- [ ] Test: Step 10 displays success message with correct variables
- [ ] Test: Can navigate to dashboard after completion
- [ ] **END-TO-END TEST:** Complete workflow-init from step 1 to step 10
- [ ] **END-TO-END TEST:** New project appears in projects list on home page
- [ ] Error handling test: Cleanup on failure (directory deleted if DB insert fails)

**Wireframes:**
- Success message display (formatted, celebratory, informative)
- Dashboard navigation flow

**Technical Notes:**
- Use Node-compatible Bun file system APIs: `import { mkdir } from "node:fs/promises"`
- Use `simple-git` library for git operations
- Project path validation: Check directory doesn't exist before creating
- Cleanup strategy: `try-catch` with rollback (delete dir if DB fails)
- Success message template in step 10 config (Handlebars syntax)
- Reference: `docs/epics/epic-1-database-implementation.md` → Steps 9-10

---

## Epic 1 Summary

**Total Effort:** ~21 days (4.2 weeks)
**Stories:** 8 stories
**Dependencies:** None (foundation epic)

**Epic 1 Delivers:**
- ✅ Complete database foundation (16 tables, no migrations - Docker reset approach)
- ✅ Web application with authentication (better-auth)
- ✅ LLM models selection page (OpenRouter + Anthropic integration)
- ✅ Anthropic API key configuration in Settings
- ✅ Generic workflow execution engine (reusable for all future workflows)
- ✅ 5 step type handlers (ask-user, execute-action, llm-generate, ask-user-chat, display-output)
- ✅ Mastra + Ax integration with ACE optimizer and approval gates
- ✅ Complete workflow-init-new (10 steps, end-to-end tested)
- ✅ Users can create projects through conversational workflow
- ✅ All code tested with Bun test framework

**Ready for Epic 2:**
- Epic 2 will implement product-brief workflow using the same workflow engine
- New step types can be added as needed (invoke-workflow, conditional branching, etc.)
- Workflow engine is proven, tested, and production-ready
- UI patterns established (stepper, step containers, chat interface, approval gates)
- Mastra + Ax infrastructure ready for expanding to more agents and workflows

---

## Story Guidelines Reference

**Story Format:**

```
**Story [EPIC.N]: [Story Title]**

As a [user type],
I want [goal/desire],
So that [benefit/value].

**Acceptance Criteria:**
1. [Specific testable criterion]
2. [Another specific criterion]
3. [etc.]

**Prerequisites:** [Dependencies on previous stories, if any]
```

**Story Requirements:**

- **Vertical slices** - Complete, testable functionality delivery
- **Sequential ordering** - Logical progression within epic
- **No forward dependencies** - Only depend on previous work
- **AI-agent sized** - Completable in 2-4 hour focused session
- **Value-focused** - Integrate technical enablers into value-delivering stories

---

**For implementation:** Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown.
