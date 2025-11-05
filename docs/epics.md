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

## Epic 1: Core Infrastructure & Database Foundation

**Goal:** Establish database schema, workflow engine, project management primitives, and workflow-init conversational setup

**Duration:** 2 weeks
**Dependencies:** None (foundation epic)
**Owner:** DEV Agent

### Stories

#### Story 1.1: Database Schema Design and Migration System
**Priority:** P0 (Critical)
**Estimate:** 3 days

**Description:**
Design and implement the complete PostgreSQL schema for Chiron, including all tables for projects, workflows, agents, artifacts, and state tracking. Set up Drizzle ORM with migration system.

**Acceptance Criteria:**
- [ ] Drizzle ORM configured with TypeScript
- [ ] All 16 tables created with proper relationships (schema evolved in Phase 3 based on architectural decisions #33-#37):

  **Core Tables (4):**
  - `projects` - Project metadata (name, path, level, type, field_type)
  - `project_state` - Current workflow position (current_phase, phase_*_complete flags)
  - `workflow_paths` - Workflow sequences for project types (greenfield-level-0 through 4, brownfield variants)
  - `workflow_path_workflows` - Junction table linking paths to workflows with phase/order

  **Workflow Definition Tables (5):**
  - `agents` - AI agents with LLM config (name, role, llm_provider, llm_model, tools JSONB, mcp_servers JSONB, color, avatar)
  - `workflows` - Workflow definitions (name, agent_id, pattern enum, output_artifact_type)
  - `workflow_steps` - Individual steps (step_number, step_type enum, config JSONB, next_step_id)
  - `workflow_step_branches` - Conditional routing for N-way branching (step_id, branch_key, next_step_id)
  - `workflow_step_actions` - Actions within steps (action_type, action_config JSONB, execution_mode enum)

  **Execution Tables (2):**
  - `workflow_executions` - Runtime state (status, current_step_id, variables JSONB, context_data JSONB) *[renamed from workflow_state]*
  - `project_artifacts` - Generated files tracking (artifact_type, file_path, **git_commit_hash**, metadata JSONB)

  **System Configuration (1):**
  - `app_config` - Application settings (openrouter_api_key, anthropic_api_key, openai_api_key, default_llm_provider) *[NEW - critical for first-time setup]*

  **Optimization Tables (2):**
  - `training_examples` - User corrections for ax optimization
  - `optimization_runs` - GEPA optimizer results

  **Future Tables (2) - Epic 3/6:**
  - `epic_state` - Epic progress tracking (deferred but schema-ready)
  - `story_state` - Story progress tracking (deferred but schema-ready)

- [ ] Indexes created on frequently queried columns
- [ ] Migration files in `packages/db/src/migrations/` directory
- [ ] `npm run db:migrate` command works
- [ ] `npm run db:seed` command works (empty for now, used in Story 1.2)

**Schema Evolution Notes:**
- Original Story 1.1 listed 11 tables (Phase 2 estimate)
- Final schema has 16 tables based on Phase 3 architectural decisions:
  - **Added:** workflow_steps, workflow_step_branches, workflow_step_actions, workflow_paths, workflow_path_workflows, training_examples, optimization_runs, app_config (Decision #33, #37, gate check finding)
  - **Merged:** agent_capabilities → agents table (JSONB fields)
  - **Renamed:** workflow_state → workflow_executions
  - **Deferred:** git_worktrees (Epic 4), workflow_versions (Epic 7)

**Technical Notes:**
- Use Drizzle ORM schema definition in `src/db/schema.ts`
- Migrations use Drizzle Kit CLI
- Consider using PostgreSQL enums for status fields (IDLE, ACTIVE, PAUSED, etc.)

---

#### Story 1.2: BMAD Workflow Seeding System
**Priority:** P0 (Critical)
**Estimate:** 2 days
**Dependencies:** Story 1.1

**Description:**
Implement seed system that loads BMAD workflows, agents, and configurations from YAML/Markdown files into the database on initial setup.

**Acceptance Criteria:**
- [ ] Seed script reads BMAD files from `bmad/` directory
- [ ] All BMM workflows seeded into `workflows` table
- [ ] All CIS workflows seeded into `workflows` table
- [ ] 6 core agents seeded into `agents` table (Analyst, PM, Architect, DEV, SM, UX Designer)
- [ ] Agent capabilities seeded into `agent_capabilities` table
- [ ] Elicitation methods seeded (techniques from brainstorming.yaml, design-thinking.yaml, etc.)
- [ ] Seed script is idempotent (can run multiple times safely)
- [ ] `npm run db:seed` populates database successfully
- [ ] Seed data includes workflow paths (greenfield-level-0 through greenfield-level-4, brownfield variants)

**Technical Notes:**
- Parse YAML using `js-yaml` library
- Parse Markdown frontmatter for workflow instructions
- Store workflow instructions as text in `workflows.instructions` column
- Store YAML config as JSON in `workflows.yaml_config` column

---

#### Story 1.3: Project CRUD Operations
**Priority:** P0 (Critical)
**Estimate:** 2 days
**Dependencies:** Story 1.1

**Description:**
Implement API endpoints and services for creating, reading, updating, and deleting projects in Chiron.

**Acceptance Criteria:**
- [ ] `POST /api/projects` creates new project entry
- [ ] `GET /api/projects` lists all projects
- [ ] `GET /api/projects/:id` gets single project with details
- [ ] `DELETE /api/projects/:id` removes project (with confirmation)
- [ ] Project creation validates:
  - Directory path exists or can be created
  - Directory is empty or has valid git repository
  - Project name is unique
- [ ] Project deletion:
  - Removes database entries (cascade delete for related records)
  - Does NOT delete files on disk (safety measure)
  - Warns user about active agents
- [ ] All operations return proper HTTP status codes and error messages

**Technical Notes:**
- Use Hono for API routing
- Use Tauri commands to expose API to frontend
- Validation logic in service layer, not controller

---

#### Story 1.4: Workflow-Init Conversational Setup
**Priority:** P0 (Critical)
**Estimate:** 4 days
**Dependencies:** Story 1.3

**Description:**
Build conversational workflow-init that determines project type, level, and field (greenfield/brownfield) through natural conversation, replicating the BMAD CLI workflow-init experience.

**Acceptance Criteria:**
- [ ] Conversational flow (see User Journey 1 in PRD):
  1. "What's your project called?" → captures project name
  2. "Tell me about what you're building. What's the goal? Adding to something or starting fresh?" → analyzes response
  3. Agent uses LLM to determine:
     - **Project Type:** software (game excluded from MVP)
     - **Project Level:** 0 (bug fix), 1 (single feature), 2 (multi-feature), 3 (complex system), 4 (multi-system)
     - **Field Type:** greenfield (new project) or brownfield (existing codebase)
  4. "Based on your description: Level X [type] [field] project. Is that correct?" → user confirms or corrects
  5. If confirmed: loads appropriate workflow path YAML (e.g., `greenfield-level-3.yaml`)
- [ ] Project directory validation/creation:
  - If directory doesn't exist → create it + `git init`
  - If directory exists but no git → `git init`
  - If directory exists with git → validate and proceed
- [ ] Generates `docs/bmm-workflow-status.md` with:
  - Project configuration (name, type, level, field)
  - Workflow path reference (YAML file)
  - Current phase and next recommended workflow
- [ ] AI reasoning visible (why Level 3? why greenfield?)
- [ ] User can override AI's suggestion
- [ ] Chat interface uses Pattern A (Sequential Dependencies) from Epic 7

**Technical Notes:**
- LLM prompt engineering for project analysis (keywords: "new", "existing", "refactor", "bug", "feature", "system")
- Project level heuristics:
  - Level 0: "bug", "fix", "patch", single file/function
  - Level 1: "add feature", "new endpoint", isolated change
  - Level 2: "multiple features", "new module", several components
  - Level 3: "complex", "system", "integrations", "architecture decisions"
  - Level 4: "multiple systems", "microservices", "distributed"
- Field type heuristics:
  - Greenfield: "new", "starting", "from scratch"
  - Brownfield: "existing", "legacy", "refactor", "improve", "add to"
- Workflow path mapping stored in database (seeded from `bmad/bmm/workflows/workflow-status/paths/`)
- Status file template in `bmad/bmm/workflows/workflow-status/workflow-status-template.md`

---

#### Story 1.5: Workflow Execution Engine (Simplified)
**Priority:** P0 (Critical)
**Estimate:** 4 days
**Dependencies:** Story 1.2

**Description:**
Build simplified workflow execution engine that follows workflow.xml rules for steps, actions, variables, and templates (no agent coordination yet - that's Epic 3).

**Acceptance Criteria:**
- [ ] Engine loads workflow from database by ID
- [ ] Engine resolves variables using 4-level precedence:
  1. `config_source` references (read from config.yaml)
  2. System-generated (`{{date}}` → current date)
  3. User input (prompt if variable unknown)
  4. Default values (from workflow YAML)
- [ ] Engine executes workflow steps in order
- [ ] Engine supports conditional steps (`if="condition"`)
- [ ] Engine supports optional steps (`optional="true"`)
- [ ] Engine generates output from template if `template: true`
- [ ] Engine saves workflow state to `workflow_state` table (can resume)
- [ ] Engine emits events for UI updates (step started, step completed, workflow completed)
- [ ] Test workflow execution with `workflow-init` and `product-brief` workflows

**Technical Notes:**
- Workflow engine as separate service: `src/services/workflow-engine.ts`
- Use state machine pattern for workflow status
- Emit events via EventEmitter for UI consumption (real-time updates in Epic 4)
- Template rendering with Handlebars

---

#### Story 1.6: Git Repository Validation
**Priority:** P1 (Important)
**Estimate:** 1 day
**Dependencies:** Story 1.3

**Description:**
Implement git repository validation before allowing workflows to execute on a project.

**Acceptance Criteria:**
- [ ] Validation checks:
  - Directory exists
  - Git repository initialized (`.git` directory present)
  - Not in detached HEAD state
  - No uncommitted changes (working tree clean) - WARNING only, not blocker
  - Remote configured (optional warning, not blocker)
- [ ] Validation runs before workflow execution
- [ ] Clear error messages for each failure type
- [ ] Option to initialize git repo if missing (`git init`)
- [ ] Validation function returns structured result (pass/fail + reasons)

**Technical Notes:**
- Use `simple-git` library
- Validation service: `src/services/git-validation.ts`
- Validation errors shown in UI (Epic 4)

---

### Epic 1 Summary

**Total Effort:** ~16 days (3.2 weeks) = 2 weeks sprint with some overtime
**Stories:** 6 (added workflow-init as Story 1.4)
**Dependencies:** None (foundation)
**Risks:** Database schema changes may cascade to other epics

**Key Addition:** Workflow-init provides conversational project setup matching BMAD's UX, critical for first-time user experience (see User Journey 1 in PRD)

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
