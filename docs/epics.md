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

**Epic Sequencing Principles:**

- Epic 1 establishes foundational infrastructure and initial functionality
- Subsequent epics build progressively, each delivering significant end-to-end value
- Stories within epics are vertically sliced and sequentially ordered
- No forward dependencies - each story builds only on previous work

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
- [ ] All tables created with proper relationships:
  - `projects` (id, name, path, level, type, field_type, created_at, updated_at)
  - `workflows` (id, name, module, phase, yaml_config, template, instructions)
  - `agents` (id, name, role, capabilities_json, active)
  - `project_artifacts` (id, project_id, artifact_type, file_path, git_commit_hash, metadata_json, created_at, updated_at)
  - `workflow_state` (id, project_id, workflow_id, agent_id, status, context_json, started_at, completed_at)
  - `project_state` (id, project_id, current_phase, phase_1_complete, phase_2_complete, phase_3_complete, phase_4_complete, last_updated)
  - `git_worktrees` (id, project_id, agent_id, worktree_path, branch_name, status, created_at)
  - `agent_capabilities` (id, agent_id, mcp_server_config_json, permissions_json)
  - `workflow_versions` (id, workflow_id, version, yaml_config, changed_by, changed_at)
  - `epic_state` (id, project_id, epic_name, status, created_at, updated_at)
  - `story_state` (id, project_id, epic_id, story_name, status, assigned_agent_id, created_at, updated_at)
- [ ] Indexes created on frequently queried columns
- [ ] Migration files in `src/db/migrations/` directory
- [ ] `npm run db:migrate` command works
- [ ] `npm run db:seed` command works (empty for now, used in Story 1.2)

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
