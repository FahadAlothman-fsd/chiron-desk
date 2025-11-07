# chiron - Epic Breakdown

**Author:** fahad
**Date:** 2025-11-01
**Project Level:** 3
**Target Scale:** Complex system with subsystems, integrations, and architectural decisions

---

## Overview

This document provides the detailed epic breakdown for chiron, expanding on the high-level epic list in the [PRD](./PRD.md).

Each epic includes:

- Expanded goal and value proposition
- Complete story breakdown with user stories
- Acceptance criteria for each story
- Story sequencing and dependencies

**Epic Sequencing Principles (Phase-by-Phase BMAD Approach):**

- **Epic 1:** Foundation - Core infrastructure (workflow engine, database, project setup)
- **Epic 2:** Phase 1 Complete - All Analysis workflows (product-brief, brainstorm, research) with UI patterns
- **Epic 3:** Phase 2 Complete - All Planning workflows (PRD, epics) with pattern refinements
- **Epic 4:** Git Worktree & Multi-Agent Foundation - Parallel execution infrastructure
- **Epic 5:** Phase 3 Complete - All Solutioning workflows (architecture, tech-spec)
- **Epic 6:** Phase 4 Complete - All Implementation workflows (sprint, stories, Kanban) with full orchestration
- **Epic 7:** Polish & Extensibility - Admin interface, performance, refinements

**Key Strategy:**
- Each phase epic delivers complete end-to-end user value (working workflows + UI)
- Patterns emerge organically based on real workflow needs (not speculation)
- Thesis validated early (Artifact Workbench + Chat Patterns in Epic 2, Week 3-4)
- Infrastructure built just-in-time (multi-agent deferred until needed in Epic 6)

---

## Epic 1: Foundation + Workflow-Init Engine

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

### Stories

#### Story 1.1: Database Schema Refactoring
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

#### Story 1.2: Core Data Seeding
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

#### Story 1.3: Web UI Foundation + LLM Models Page
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

#### Story 1.4: Workflow Execution Engine Core
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

#### Story 1.5: Workflow-Init Steps 1-3 (Foundation)
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

#### Story 1.6: Workflow-Init Steps 4-6 (Analysis)
**Priority:** P0 (Critical)
**Estimate:** 4 days
**Dependencies:** Story 1.5

**Description:**
Implement workflow-init steps 4-6: Analyze project complexity (LLM classification), fetch workflow paths (DB query), help user choose path (conversational chat). Build llm-generate and ask-user-chat step handlers.

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
6. Test steps 4-6 in workflow execution

**Acceptance Criteria:**

**Step Handlers (Backend):**
- [ ] `LLMGenerateStepHandler` implementation:
  - Calls OpenRouter API with user-selected model (or default)
  - Supports `llmTask.type: "classification"` (returns category + reasoning)
  - Supports `llmTask.type: "structured"` (returns JSON matching schema)
  - Parses structured output with JSON schema validation
  - Saves result to `outputVariable`
  - Handles LLM errors gracefully (retry, fallback)
- [ ] `ExecuteActionStepHandler` extensions:
  - Supports `database` action type (query workflow_paths table)
  - Supports JSONB filtering (`tags->>'fieldType' = "greenfield"`)
  - Saves query results to output variable
- [ ] `AskUserChatStepHandler` implementation:
  - Initializes chat session with `systemPrompt`
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
  - Auto-advances when complete
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
- [ ] Step 5 seeded with DB query:
  - Filter: `tags->>'fieldType' = "{{detected_field_type}}"`
  - Output: `available_paths`
- [ ] Step 6 seeded with chat config:
  - System prompt: Explain workflow paths, help user choose
  - Available paths: `{{available_paths}}`
  - Recommended track: `{{recommended_track}}`
  - Completion condition: user-satisfied, max 10 turns

**Testing:**
- [ ] Unit tests for LLM service, chat handler (using `bun test`)
- [ ] Test: Step 4 classifies project based on description
- [ ] Test: Step 5 fetches workflow paths from database
- [ ] Test: Step 6 displays chat interface
- [ ] Test: Can ask questions about workflow paths
- [ ] Test: LLM responds with path recommendations
- [ ] Test: Can select a path and complete step
- [ ] Test: Variables saved: `recommended_track`, `available_paths`, `selected_workflow_path_id`
- [ ] Integration test: Steps 4-6 flow sequentially

**Wireframes:**
- LLM loading state (animated, informative)
- Classification result display (card with reasoning)
- Chat interface layout (messages, input, path options)
- Path selection cards (in chat context)

**Technical Notes:**
- LLM service: `packages/api/src/services/llm.ts` (OpenRouter integration)
- Chat streaming: Server-Sent Events (SSE) recommended for simplicity
- Model selection: Use model from user preferences (from LLM models page)
- Default model: `anthropic/claude-3.5-sonnet` or `openai/gpt-4-turbo`
- Conversation history: Store in `workflow_executions.context_data`
- Reference: `docs/epics/epic-1-database-implementation.md` → Steps 4-6

---

#### Story 1.7: Workflow-Init Steps 7-8 (Naming)
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

#### Story 1.8: Workflow-Init Steps 9-10 (Creation & Confirmation)
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

### Epic 1 Summary

**Total Effort:** ~21 days (4.2 weeks)
**Stories:** 8 stories
**Dependencies:** None (foundation epic)

**Epic 1 Delivers:**
- ✅ Complete database foundation (16 tables, no migrations - Docker reset approach)
- ✅ Web application with authentication (better-auth)
- ✅ LLM models selection page (OpenRouter integration)
- ✅ Generic workflow execution engine (reusable for all future workflows)
- ✅ 5 step type handlers (ask-user, execute-action, llm-generate, ask-user-chat, display-output)
- ✅ Complete workflow-init-new (10 steps, end-to-end tested)
- ✅ Users can create projects through conversational workflow
- ✅ All code tested with Bun test framework

**Ready for Epic 2:**
- Epic 2 will implement product-brief workflow using the same workflow engine
- New step types can be added as needed (invoke-workflow, conditional branching, etc.)
- Workflow engine is proven, tested, and production-ready
- UI patterns established (stepper, step containers, chat interface)

---

## Epic 2: Phase 1 - Analysis Workflows Complete

**Goal:** Implement all Phase 1 (Analysis) workflows with Artifact Workbench UI, chat patterns, and tangential workflow support. Validate thesis: visual UX > CLI for BMAD methodology.

**Duration:** 3.5-4 weeks
**Dependencies:** Epic 1 (foundation)
**Owner:** DEV + UX Designer agents
**BMAD Phase:** Phase 1 (Analysis)

### Key Deliverables

**Workflows Implemented:**
1. **product-brief** - Main workflow with tangent support
2. **brainstorm-project** - Optional tangent workflow
3. **research** - Optional tangent workflow (multiple research areas)

**UI Components:**
- **Artifact Workbench** (split-pane: artifact content left, chat right)
- **Chat Interface** with Pattern A (Sequential Dependencies) + Pattern C (Structured Exploration)
- **Workflow Breadcrumbs** (tangent navigation: "product-brief > research > back")
- **Tangent Trigger Mechanism** (button/slash command to launch nested workflow)
- **Artifact Display** (markdown rendering with syntax highlighting)

**Chat Patterns Discovered:**
- **Pattern A: Sequential Dependencies** - Product-brief main flow (wizard-like step progression)
- **Pattern C: Structured Exploration** - Brainstorming technique selection (curated options with deep-dive)
- **Tangent Pattern (NEW):** - Workflow nesting/resumption with state preservation

**Technical Enablers:**
- Workflow state stack (push/pop for tangents)
- Artifact dependency tracking (`product_artifacts.depends_on` JSON field)
- Resume-from-checkpoint logic
- Chat context preservation across tangent workflows
- Template rendering for artifacts (product-brief.md, research.md)

### Stories

#### Story 2.1: Tauri Application Shell & Basic UI
**Priority:** P0 (Critical)
**Estimate:** 3 days
**Dependencies:** Epic 1 complete

**Description:**
Set up Tauri desktop application with React frontend, establish routing, and create basic layout structure (sidebar + main content area).

**Acceptance Criteria:**
- [ ] Tauri app initializes and opens desktop window
- [ ] React + TypeScript + Vite + Tailwind configured
- [ ] shadcn/ui components installed and accessible
- [ ] Basic routing setup (React Router or similar)
- [ ] App layout structure:
  - Left sidebar: Project selector + workflow navigation
  - Main content area: Will hold Artifact Workbench
  - Top bar: Project name + phase indicator
- [ ] App connects to backend API (Hono server via Tauri invoke)
- [ ] Can list projects from database (verify Epic 1 integration)
- [ ] Hot reload works for development

**Technical Notes:**
- Frontend: `src-ui/` directory
- Tauri commands in `src-tauri/src/commands.rs`
- API layer using Hono: `src/api/`
- Use tRPC or direct Tauri invoke for backend communication

---

#### Story 2.2: Artifact Workbench UI Component
**Priority:** P0 (Critical)
**Estimate:** 4 days
**Dependencies:** Story 2.1

**Description:**
Build the core Artifact Workbench component with split-pane layout: left pane displays artifact content (markdown), right pane contains chat interface.

**Acceptance Criteria:**
- [ ] Split-pane layout with resizable divider (30/70 default split)
- [ ] Left pane: Artifact content display
  - Renders markdown with syntax highlighting (react-markdown + prismjs)
  - Shows artifact metadata (type, last updated, git hash)
  - Read-only view (editing comes later)
- [ ] Right pane: Chat interface placeholder
  - Message list container (styled for chat bubbles)
  - Input field at bottom (text area with send button)
  - Scrollable message history
- [ ] Component accepts props: `artifactId`, `workflowId`
- [ ] Fetches artifact content from API (`GET /api/artifacts/:id`)
- [ ] Responsive layout (min-width constraints prevent unusable splits)
- [ ] Visual design follows UX foundation (CARBON theme, monospace typography, corner borders)

**Technical Notes:**
- Component: `src-ui/components/ArtifactWorkbench.tsx`
- Use `react-split` or `react-resizable-panels` for split pane
- Markdown renderer: `react-markdown` with `remark-gfm`
- Syntax highlighting: `prism-react-renderer` or `highlight.js`

---

#### Story 2.3: Chat Pattern A - Sequential Dependencies
**Priority:** P0 (Critical)
**Estimate:** 5 days
**Dependencies:** Story 2.2

**Description:**
Implement Pattern A (Sequential Dependencies) for product-brief workflow. Wizard-like step progression with AI guidance, user responses, and progress tracking.

**Acceptance Criteria:**
- [ ] Chat displays workflow steps sequentially:
  1. Step loads → AI message appears ("Let's start with goals...")
  2. User responds → Next step loads automatically
  3. Progress bar shows completion (Step 3 of 9)
- [ ] Step state persistence in `workflow_state` table
- [ ] Can pause and resume workflow (mid-step)
- [ ] Each step can have:
  - AI guidance message
  - User input (text, selection, or multi-line)
  - Optional elicitation (technique selection)
  - Generated content preview (shows what will be added to artifact)
- [ ] Step validation (required fields, format checks)
- [ ] "Back" button to edit previous step (with warning)
- [ ] Step completion triggers artifact update (incremental save)
- [ ] Visual design: Wizard-style progress indicator + step numbering

**Technical Notes:**
- State machine for step flow: `src/services/step-machine.ts`
- Step definitions from workflow YAML (`product-brief/instructions.md`)
- Use Zustand or Jotai for client-side state
- Backend: `POST /api/workflows/:id/step` to advance step

---

#### Story 2.4: Artifact Generation Engine
**Priority:** P0 (Critical)
**Estimate:** 3 days
**Dependencies:** Story 2.3

**Description:**
Build artifact generation engine that creates/updates markdown files based on workflow templates and user inputs.

**Acceptance Criteria:**
- [ ] Engine loads template from database (`workflows.template` column)
- [ ] Engine replaces template variables with user inputs:
  - `{{project_name}}` → actual project name
  - `{{goals}}` → user-provided goals from Step 1
  - etc.
- [ ] Engine supports incremental updates (step-by-step artifact building)
- [ ] Generated artifact saved to disk (`docs/product-brief-{project}-{date}.md`)
- [ ] Artifact metadata saved to database (`project_artifacts` table):
  - `file_path`, `artifact_type`, `git_commit_hash`, `metadata_json`
- [ ] Git commit created after generation:
  - Commit message: "Generate product-brief for {project}"
  - Hash stored in `project_artifacts.git_commit_hash`
- [ ] Can regenerate sections (e.g., user edits Step 2, regenerate Goals section only)
- [ ] Template uses Handlebars syntax for conditionals/loops

**Technical Notes:**
- Template engine: `handlebars` library
- Service: `src/services/artifact-generator.ts`
- Git operations: `simple-git` library
- File system: `fs-extra` for file operations

---

#### Story 2.5: Tangential Workflow System
**Priority:** P0 (Critical)
**Estimate:** 4 days
**Dependencies:** Story 2.3

**Description:**
Implement workflow nesting system that allows users to launch tangent workflows (brainstorm, research) from main workflow (product-brief), then resume the main workflow with context from tangent artifacts.

**Acceptance Criteria:**
- [ ] Workflow state stack in database:
  - `workflow_stack` table (id, project_id, workflow_id, parent_workflow_id, stack_position, state_json)
  - Push when tangent starts, pop when tangent completes
- [ ] UI shows breadcrumb navigation:
  - "product-brief > research (Market Analysis) > back"
  - Breadcrumbs clickable to navigate stack
- [ ] Tangent trigger mechanisms:
  - Button in chat: "Launch Research Workflow"
  - Slash command: `/research` in chat input
- [ ] Main workflow pauses when tangent starts:
  - State saved with current step + inputs
  - Chat shows: "Paused product-brief. Starting research workflow..."
- [ ] Tangent workflow runs in nested context:
  - Same Artifact Workbench UI
  - Separate chat context
  - Generates separate artifact (research.md)
- [ ] Resume main workflow after tangent completes:
  - Chat shows: "Research complete ✓ Resuming product-brief..."
  - Main workflow can reference tangent artifact (dependency link)
- [ ] Artifact dependency tracking:
  - `project_artifacts.depends_on` JSON field: `["research.md", "brainstorm-notes.md"]`
  - UI shows dependencies in artifact metadata panel

**Technical Notes:**
- Stack service: `src/services/workflow-stack.ts`
- Breadcrumb component: `src-ui/components/WorkflowBreadcrumbs.tsx`
- Chat command parser for `/research`, `/brainstorm` commands
- Dependency graph visualization (optional for Epic 2, defer to Epic 7)

---

#### Story 2.6: Pattern C - Structured Exploration (Brainstorming Techniques)
**Priority:** P1 (Important)
**Estimate:** 3 days
**Dependencies:** Story 2.5

**Description:**
Implement Pattern C (Structured Exploration) for brainstorming technique selection. Shows curated list of techniques with descriptions, allows deep-dive into selected technique.

**Acceptance Criteria:**
- [ ] Technique selection UI:
  - Grid or list view of techniques (5-10 options)
  - Each technique shows: Name, description, when to use
  - Techniques loaded from database (seeded in Epic 1)
- [ ] User can select technique:
  - Click technique → expands with detailed guidance
  - Shows: Full description, example, step-by-step process
- [ ] Selected technique influences workflow:
  - Brainstorming workflow steps adapt based on technique
  - Example: SCAMPER shows 7 prompts, Mind Mapping shows radial exploration
- [ ] User can switch techniques mid-workflow (with warning)
- [ ] Technique choice saved in `workflow_state.context_json`
- [ ] Visual design: Card grid with hover effects, expansion animation

**Technical Notes:**
- Technique data from `elicitation_methods` table (seeded in Epic 1)
- Component: `src-ui/components/TechniqueSelector.tsx`
- Use Radix UI accordion or disclosure for expand/collapse

---

#### Story 2.7: Research Workflow Implementation
**Priority:** P1 (Important)
**Estimate:** 3 days
**Dependencies:** Story 2.5

**Description:**
Implement research workflow as tangent-capable workflow. Supports multiple research areas (market, competitive, user, technical).

**Acceptance Criteria:**
- [ ] Research workflow loaded from database (seeded in Epic 1)
- [ ] User specifies research area:
  - Market research, Competitive analysis, User research, Technical evaluation
- [ ] Research workflow steps:
  1. Define research questions
  2. Gather information (manual input or MCP tool integration placeholder)
  3. Synthesize findings
  4. Generate research artifact
- [ ] Generates `research-{area}-{date}.md` artifact
- [ ] Can launch multiple research workflows (e.g., market + competitive)
- [ ] Each research artifact tracked separately in database
- [ ] Research artifact referenced by product-brief (dependency link)

**Technical Notes:**
- Research workflow: `bmad/bmm/workflows/research/`
- MCP integration placeholder for Story 2.7 (actual MCP tools in Epic 5)
- Multiple research artifacts: unique filenames with area + timestamp

---

#### Story 2.8: Product-Brief Workflow End-to-End Integration
**Priority:** P0 (Critical)
**Estimate:** 3 days
**Dependencies:** Stories 2.4, 2.5, 2.6, 2.7

**Description:**
Integrate all components to deliver complete product-brief workflow experience from start to finish, including optional tangent workflows.

**Acceptance Criteria:**
- [ ] Complete user journey (see User Journey in PRD):
  1. User launches product-brief workflow
  2. Sequential steps guide through sections (Executive Summary, Problem, Solution, etc.)
  3. User can launch brainstorm workflow (tangent) at Step 3
  4. User can launch research workflow (tangent) at Step 4
  5. Tangent workflows complete, return to product-brief
  6. Product-brief workflow completes
  7. Artifact generated: `product-brief-{project}-{date}.md`
  8. Git commit created with hash tracked
- [ ] All workflow state persisted (can close app and resume)
- [ ] Artifact dependencies tracked correctly
- [ ] Phase 1 marked complete in `project_state` table
- [ ] Next workflow suggested (PRD from Phase 2)
- [ ] Error handling for all edge cases (network, file system, git)

**Technical Notes:**
- Integration test suite for full workflow
- End-to-end test with real database and file system
- Performance: Workflow completes in <30 seconds for typical inputs

---

### Epic 2 Summary

**Total Effort:** ~24 days (4.8 weeks) = 3.5-4 weeks sprint
**Stories:** 8 (UI foundation + workflows + patterns)
**Dependencies:** Epic 1 (foundation)
**Risks:**
- Pattern implementation may need iteration based on usability testing
- Tangent workflow complexity might require additional stories
- UI performance with large artifacts (pagination/virtualization may be needed)

**Thesis Validation:** By end of Epic 2, you will have:
- ✅ Working Artifact Workbench with visual chat interface
- ✅ Product-brief workflow generating real artifacts
- ✅ Tangent workflow system (brainstorm + research)
- ✅ Two chat patterns validated (Sequential + Structured Exploration)
- ✅ Early proof that visual UX improves over CLI

**Next Epic:** Epic 3 implements Phase 2 (Planning) workflows (PRD, epics) with pattern refinements based on Epic 2 learnings.

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

---

## Epic 3: Phase 2 - Planning Workflows Complete

**Goal:** Implement all Phase 2 (Planning) workflows with pattern refinements based on Epic 2 learnings.

**Duration:** 3-3.5 weeks
**Dependencies:** Epic 2 (Phase 1 complete)
**Owner:** PM + DEV agents
**BMAD Phase:** Phase 2 (Planning)

### Key Deliverables

**Workflows Implemented:**
1. **prd** - Main planning workflow with epic breakdown
2. **validate-prd** - Optional validation/refinement workflow (tangent)

**Pattern Refinements:**
- Pattern A enhancements based on Epic 2 feedback
- Pattern C refinements for epic prioritization
- New patterns discovered during PRD workflow

**UI Enhancements:**
- Artifact Workbench improvements (version timeline, inline editing)
- Multi-artifact navigation (product-brief → PRD linking)
- Epic breakdown visualization

**Detailed Story Breakdown:** To be completed during Epic 2 implementation or at start of Epic 3.

---

## Epic 4: Git Worktree & Multi-Agent Foundation

**Goal:** Implement git worktree isolation and multi-agent orchestration foundation (preparation for Phase 4).

**Duration:** 2-2.5 weeks
**Dependencies:** Epic 1 (database foundation)
**Owner:** DEV agent
**BMAD Phase:** Infrastructure (cross-phase)

### Key Deliverables

**Git Worktree Management:**
- Worktree creation/deletion API
- Per-agent workspace isolation
- Automatic branch creation
- Merge-back on completion
- Git commit hash tracking
- Divergence detection

**Multi-Agent Foundation:**
- Agent spawning and lifecycle management
- State synchronization service
- Optimistic locking for artifact writes
- Database snapshots before destructive operations

**Detailed Story Breakdown:** To be completed during Epic 3 or at start of Epic 4.

---

## Epic 5: Phase 3 - Solutioning Workflows Complete

**Goal:** Implement all Phase 3 (Solutioning) workflows with architecture decision support.

**Duration:** 2.5-3 weeks
**Dependencies:** Epic 3 (Phase 2 complete)
**Owner:** Architect + DEV agents
**BMAD Phase:** Phase 3 (Solutioning)

### Key Deliverables

**Workflows Implemented:**
1. **architecture** - Main solutioning workflow
2. **tech-spec** - Technical specification workflow
3. **solutioning-gate-check** - Validation workflow (optional)

**New Patterns:**
- Pattern D: Focused Dialogs (for architecture Q&A, deep-dive discussions)
- Technical decision tracking and visualization

**UI Enhancements:**
- Multi-artifact view (PRD + Architecture side-by-side)
- Decision tree visualization (optional)
- Architecture diagram integration (optional)

**Detailed Story Breakdown:** To be completed during Epic 4 or at start of Epic 5.

---

## Epic 6: Phase 4 - Implementation Workflows Complete

**Goal:** Implement all Phase 4 (Implementation) workflows with full multi-agent orchestration, Kanban board, and sprint management.

**Duration:** 3-3.5 weeks
**Dependencies:** Epic 4 (multi-agent foundation), Epic 5 (Phase 3 complete)
**Owner:** SM + DEV agents
**BMAD Phase:** Phase 4 (Implementation)

### Key Deliverables

**Workflows Implemented:**
1. **sprint-planning** - Sprint setup with story extraction
2. **create-story** - Story creation workflow
3. **dev-story** - Story implementation workflow
4. **code-review** - Review workflow (optional)
5. **retrospective** - Sprint retrospective (optional)

**New Patterns:**
- Pattern B: Parallel Independence (story checklists, multi-agent coordination)
- Real-time agent status dashboard
- Kanban board with drag-and-drop

**Multi-Agent Orchestration:**
- Parallel agent execution (DEV, Architect, UX Designer)
- Cross-agent conflict detection and resolution
- Agent handoff system
- OpenCode integration as primary DEV agent

**UI Components:**
- Multi-Agent Dashboard with real-time status
- Story Kanban board (Backlog → TODO → In Progress → Review → Done)
- Agent Context & MCP visibility panel
- Command Palette (Cmd/Ctrl+K) for quick actions

**Detailed Story Breakdown:** To be completed during Epic 5 or at start of Epic 6.

---

## Epic 7: Polish & Extensibility

**Goal:** Admin interface for workflow/agent customization, performance optimization, and polish.

**Duration:** 2-2.5 weeks
**Dependencies:** Epic 6 (all phases complete)
**Owner:** DEV agent
**BMAD Phase:** Cross-phase (extensibility)

### Key Deliverables

**Extensibility:**
- Admin interface for workflow CRUD
- Agent capability editor (MCP assignment)
- Workflow editor (YAML → form-based)
- Elicitation method library editor

**Polish:**
- Performance optimization (large artifacts, virtualization)
- Error handling refinements
- User onboarding flow
- Documentation and help system

**Optional (if time permits):**
- Dependency graph visualization
- Advanced conflict resolution UI
- Database backup/restore UI
- Analytics and usage tracking

**Detailed Story Breakdown:** To be completed during Epic 6 or at start of Epic 7.

---

## Summary: Resequenced Epic Roadmap

| Epic | Title | Duration | Dependencies | BMAD Phase | Thesis Validation |
|------|-------|----------|--------------|------------|-------------------|
| 1 | Core Foundation | 2w | None | Infrastructure | - |
| 2 | Phase 1 - Analysis Complete | 3.5-4w | Epic 1 | Phase 1 | ✅ **Validated here** |
| 3 | Phase 2 - Planning Complete | 3-3.5w | Epic 2 | Phase 2 | Pattern refinements |
| 4 | Git Worktree & Multi-Agent | 2-2.5w | Epic 1 | Infrastructure | - |
| 5 | Phase 3 - Solutioning Complete | 2.5-3w | Epic 3 | Phase 3 | New patterns |
| 6 | Phase 4 - Implementation Complete | 3-3.5w | Epic 4, 5 | Phase 4 | Full orchestration |
| 7 | Polish & Extensibility | 2-2.5w | Epic 6 | Cross-phase | - |
| **Total** | **7 epics** | **18.5-21 weeks** | - | **All 4 phases** | **Early validation** |

**Key Strategy Changes from Original:**
- ✅ Thesis validated in Week 5-6 (Epic 2) instead of Week 11-13
- ✅ Patterns emerge organically from real workflow needs (not speculative)
- ✅ Each phase delivers complete end-to-end value (working workflows + UI)
- ✅ Infrastructure built just-in-time (multi-agent deferred until Epic 6 when needed)
- ✅ User can use Chiron for real work starting Epic 2 (Analysis workflows functional)

**Parallelization Opportunities:**
- Epic 4 (Git Worktree) can start after Epic 1, run parallel with Epic 2-3
- This could reduce total timeline to ~16-18 weeks with careful scheduling

---

**Next Steps:**
1. Begin Epic 1 implementation (foundation)
2. During Epic 2, discover and document additional patterns as they emerge
3. After Epic 2, reassess timeline and validate thesis before continuing
4. Detailed story breakdowns for Epics 3-7 created just-in-time (not upfront)
