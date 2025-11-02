# chiron Product Requirements Document (PRD)

**Author:** fahad
**Date:** 2025-11-01
**Project Level:** 3
**Target Scale:** Complex system with subsystems, integrations, and architectural decisions

---

## Goals and Background Context

### Goals

1. **Enable Multi-Agent Orchestration:** Coordinate 2+ AI coding agents in parallel with isolated contexts, transforming BMAD's sequential CLI methodology into a visual orchestration platform
2. **Achieve 2x Productivity Through Parallel Execution:** Reduce 5-story project completion time from 4-5 days (CLI) to 2-3 days (Chiron) through coordinated multi-agent workflows
3. **Provide PM-Grade Visibility:** Deliver real-time visual dashboards showing project state (phases, epics, stories), agent activity, and execution context across all workflows
4. **Preserve Guided Methodology:** Maintain BMAD's "guided not automated" philosophy where human expertise drives strategic decisions while AI agents execute tasks
5. **Deliver Thesis-Quality MVP:** Complete functional multi-agent orchestration prototype within 4-month timeline, validating novel architecture patterns for academic contribution

### Background Context

Software development teams using AI coding agents (Claude Code, Cursor, Copilot) with structured methodologies like BMAD face a critical orchestration gap. Engineers can't coordinate multiple agents in parallel, lack visibility into agent execution and context usage, and spend 30-40% of time on manual context management and status tracking instead of building.

Chiron solves this by transforming BMAD's proven 4-phase methodology (Analysis → Planning → Solutioning → Implementation) from CLI-based execution into a PM-grade visual orchestration platform. Built as a master's thesis project, Chiron adds three transformative capabilities to BMAD: (1) multi-agent coordination with isolated workspaces, (2) pattern-driven visual UX replacing context-polluting CLI interactions, and (3) clean artifact separation where databases store methodology while repositories contain only project deliverables. The platform preserves BMAD's philosophy of amplifying human expertise rather than replacing it, enabling parallel agent execution while keeping human judgment at the center of every strategic decision.

---

## Requirements

### Functional Requirements

**BMAD Workflow Engine:**
- FR001: System shall store workflow definitions in PostgreSQL database (seeded from BMAD YAML/Markdown on initial setup) and execute workflows from database, enabling runtime modification and extension without file system changes
- FR002: System shall execute workflows following BMAD's workflow.xml engine rules (steps, actions, templates, elicitation)
- FR003: System shall support all 4 phases of BMAD methodology (Analysis, Planning, Solutioning, Implementation)
- FR004: System shall resolve variables using 4-level precedence (config_source, system-generated, user input, defaults)
- FR005: System shall maintain workflow state and enable resume/restart of interrupted workflows

**Multi-Agent Orchestration:**
- FR006: System shall coordinate 2+ AI coding agents executing workflows in parallel with isolated contexts using git worktrees for workspace isolation and dual-tracking (database state + git repository state) to prevent conflicts and maintain consistency
- FR007: System shall synchronize project state between git repository and database, detecting divergence and resolving conflicts when agents modify repository content
- FR008: System shall support automated workflow handoffs (e.g., Analyst completes product-brief → triggers PM with context)
- FR009: System shall support configurable agent-capability mappings stored in database, allowing administrators to assign or modify role-specific capabilities (MCPs, permissions, workflows) for each of the 6 core agents (Analyst, PM, Architect, DEV, SM, UX Designer)
- FR010: System shall integrate OpenCode as primary coding agent for DEV workflows

**Project and State Management:**
- FR011: System shall support project levels 0-4 with adaptive UI (hide/show phases based on complexity)
- FR012: System shall track project state across phases with completion flags (PHASE_1_COMPLETE, etc.)
- FR013: System shall manage epic and story state machines with enforced transitions (Backlog → Drafted → Ready → In Progress → Review → Done)
- FR014: System shall generate and version project artifacts (PRDs, architecture docs, story files) as markdown with YAML frontmatter
- FR015: System shall store BMAD metadata in database while keeping only project artifacts in repository

**User Interface and Visualization:**
- FR016: System shall provide Multi-Agent Dashboard showing active/queued/idle agents with real-time progress
- FR017: System shall provide Story Kanban board with drag-and-drop state management
- FR018: System shall provide Artifact Workbench for side-by-side editing with version history
- FR019: System shall provide Structured Exploration Lists for visual technique/method selection
- FR020: System shall display Phase Navigation showing 4-phase progression with completion tracking

**Context and MCP Management:**
- FR021: System shall inject role-specific MCP servers per agent (e.g., DEV gets codebase MCPs, Analyst gets research MCPs)
- FR022: System shall manage agent context automatically, eliminating manual context loading
- FR023: System shall provide real-time visibility into what files/context each agent is using during execution

**Extensibility:**
- FR024: System shall seed database with BMAD's default elicitation methods, techniques, workflows, and agents on initial setup, allowing users to add, modify, or remove any configuration through database without requiring code changes
- FR025: System shall provide full CRUD operations for all methodology components (workflows, agents, elicitation methods, techniques, state machines) through administrative interface, with changes taking immediate effect
- FR026: System shall version all user modifications to methodology components, enabling rollback and tracking of customizations over time

**Git Worktree Management:**
- FR027: System shall manage git worktree lifecycle (create, switch, merge, cleanup) for each active agent, automatically creating isolated branches and merging completed work back to main branch upon workflow completion
- FR028: System shall detect git repository divergence from database state (external commits, manual file changes) and halt agent execution until reconciled
- FR029: System shall provide conflict resolution UI when agents compete for same artifact modification
- FR030: System shall recover gracefully from git worktree failures (cleanup, rollback, user notification) without corrupting project or database state
- FR034: System shall record git commit hash for every generated artifact in project_artifacts table, enabling version tracking and divergence detection
- FR037: System shall maintain worktree registry in git_worktrees table, tracking active agent workspaces and preventing duplicate worktree creation for same agent
- FR038: System shall clean up orphaned git worktrees on application restart (detect crashed agents, remove stale branches)

**Database Management:**
- FR032: System shall initialize and migrate Chiron PostgreSQL database on first launch, creating all required tables for system-wide and project-specific data
- FR033: System shall provide database backup/restore functionality for user's Chiron database (all projects + methodology)

**Project Management:**
- FR035: System shall allow user to create/import/delete projects in Chiron, storing project metadata (name, path, level, type) in projects table
- FR036: System shall validate project directory structure and git repository status before allowing agent workflows to execute

**Real-Time System:**
- FR031: System shall provide real-time UI updates for agent status, workflow progress, and state changes via WebSocket or polling mechanism
- FR042: System shall throttle real-time updates to max 2 updates/second per UI component to prevent performance degradation

**Data Integrity and Recovery:**
- FR039: System shall provide manual reconciliation workflow when automatic git-database sync fails, allowing user to choose database state or git state as source of truth
- FR040: System shall implement optimistic locking for artifacts, preventing multiple agents from modifying same file simultaneously
- FR041: System shall create automatic database snapshots before destructive operations (workflow execution, artifact generation, worktree merge)

**System Validation:**
- FR043: System shall check available disk space before creating git worktrees and warn user if insufficient (<2GB per worktree)
- FR044: System shall validate agent-capability configurations before saving, preventing removal of required capabilities for core workflows

**Cross-Agent Coordination:**
- FR045: System shall detect when workflow input artifacts are modified during parallel agent execution and provide conflict resolution mechanism (implementation strategy TBD: interrupt-based, dependency-based, or queue-based resolution)

### Non-Functional Requirements

- NFR001: **Performance** - Workflow execution shall complete within acceptable timeframes (product-brief <45min, PRD with 3 epics <2hrs, story implementation <30min per story)
- NFR002: **Reliability** - System shall maintain 99%+ workflow execution success rate without crashes, hangs, or data loss
- NFR003: **Usability** - Users shall understand project status within 10 seconds of opening dashboard and identify active agent tasks within 5 seconds
- NFR004: **Scalability** - System shall support concurrent execution of up to 4 agents without performance degradation on standard hardware (8GB RAM, quad-core CPU)
- NFR005: **Maintainability** - Database schema migrations shall preserve user customizations and workflow modifications across system updates

---

## User Journeys

### Journey 1: First-Time Setup and Initial Project Creation

1. User downloads and launches Chiron (Tauri desktop app)
2. System detects first launch → initializes PostgreSQL database (FR032)
3. System seeds database with BMM + CIS workflows, 6 agents, elicitation methods (FR024)
4. Welcome screen appears: "Create your first project"
5. User clicks "Create Project" → Project setup wizard appears
6. **Workflow-init conversation begins:**
   - System: "What's your project called?"
   - User: "TaskFlow"
   - System: "Tell me about what you're building. What's the goal? Adding to something or starting fresh?"
   - User: "Starting fresh. Building a task management app with AI-powered prioritization, team collaboration, Level 3 complexity"
   - System analyzes: "Based on your description: Level 3 greenfield software project. Is that correct?"
   - User: "Yes"
   - System loads workflow path: `greenfield-level-3.yaml`
7. **System validates/creates project directory and git repository:**
   - If `/Users/fahad/projects/taskflow` doesn't exist → create directory + `git init`
   - If exists but no git → `git init`
   - If exists with git → validate and proceed (FR036)
8. System creates project entry in database (FR035)
9. System generates workflow status file: `docs/bmm-workflow-status.md`
10. Dashboard appears showing Phase 1 (Analysis) with recommended first workflow
11. User sees: "Start with product-brief to define your product vision"
12. User is ready to begin structured development with Chiron

### Journey 2: Running Multi-Agent Workflows in Parallel (Core Value Proposition)

1. User opens Chiron dashboard for "TaskFlow" project
2. Dashboard shows: Phase 2 (Planning), Current: "Ready to create architecture"
3. User sees two pending tasks:
   - Epic 1 tech-spec (Architect agent)
   - Epic 2 UX design (UX Designer agent)
4. User clicks "Start" on both tasks simultaneously
5. **System spawns two agents in parallel:**
   - Architect agent → creates git worktree `feature/epic-1-tech-spec` (FR027, FR037)
   - UX Designer agent → creates git worktree `feature/epic-2-ux-design`
6. **Multi-Agent Dashboard (FR016) shows:**
   - Architect: IN PROGRESS - "Generating tech spec for Epic 1... (3/8 steps)"
   - UX Designer: IN PROGRESS - "Creating wireframes for Epic 2... (2/5 steps)"
7. User clicks on Architect agent tile → sees real-time context panel (FR023):
   - Files being accessed: `docs/PRD.md`, `docs/epics.md`
   - Current MCP: React DeepGraph analyzing existing components
8. **Cross-agent conflict scenario (FR045):**
   - UX Designer discovers during Epic 2 design that React is wrong, should use Vue instead
   - UX Designer modifies PRD to change UI library recommendation
   - **System detects artifact modification with active dependent agent**
   - Conflict resolution triggered (see "Cross-Agent Conflict Resolution Strategies" section below)
9. After resolution and 15 minutes:
   - Architect completes → worktree merged to main (FR027)
   - Artifact created: `docs/tech-spec-epic-1.md` (FR014)
   - Database updated: `project_artifacts` table records git hash (FR034)
   - UI shows: Architect → IDLE, artifact ready for review
10. User reviews tech-spec in Artifact Workbench (FR018), clicks "Approve"
11. System updates epic state: Epic 1 → "Ready for Development" (FR013)
12. UX Designer completes 5 min later → both artifacts done with no context switching

**Cross-Agent Conflict Resolution Strategies (FR045 - Implementation TBD):**

Three approaches documented for evaluation during solutioning/implementation:

**Option A: Interrupt-Based Resolution (Max Safety)**
- When UX Designer modifies PRD:
  1. System detects: Architect agent has PRD in active context
  2. Pauses Architect, shows notification: "⚠️ Input artifact changed. PRD updated by UX Designer. Review changes?"
  3. User reviews diff, decides: [Continue with old context] or [Restart with new context]
  4. Pro: Maximum safety, no stale data
  5. Con: UX friction, interrupts workflow

**Option B: Dependency-Based Prevention (Sequential Execution)**
- Epic 2 (UX) declares dependency on Epic 1 (Arch)
- System prevents parallel execution of dependent epics
- Forces sequential: Epic 1 complete → Epic 2 starts
- Pro: Simple, no conflicts possible
- Con: Kills parallelization benefit for dependent work

**Option C: Queue-Based Reconciliation (Max Parallelization)**
- UX Designer makes PRD change → goes into "pending changes" queue
- Architect continues with snapshot of PRD at workflow start
- When Architect finishes: "Pending PRD changes detected. Reconcile before Epic 1 approval?"
- User manually resolves: update tech-spec or revert PRD change
- Pro: Maximum parallelization, minimal interruptions
- Con: Potential rework, manual cleanup required

*Decision deferred to Architecture/Solutioning phase based on technical feasibility and UX prototyping.*

### Journey 3: Handling Git Divergence (Error Recovery)

1. User working on "TaskFlow" project in Chiron
2. User manually edits `docs/PRD.md` in VS Code (outside Chiron)
3. User commits change directly: `git commit -m "Fix typo in PRD"`
4. User returns to Chiron, clicks "Start workflow: create-story"
5. **System detects divergence (FR028):**
   - Database `project_artifacts` table: `PRD.md` last hash = `abc123`
   - Git repository query: `git log -1 --format=%H -- docs/PRD.md` → returns `def456`
   - Hash mismatch detected: `abc123 != def456`
6. **Warning modal appears:**
   - "⚠️ Repository divergence detected"
   - "PRD.md was modified outside Chiron (git hash mismatch). Sync required before continuing."
   - Options: [View Changes] [Sync Now] [Cancel]
7. User clicks "View Changes" → sees git diff between old hash and current hash
8. User clicks "Sync Now" → reconciliation workflow triggers (FR039)
9. **System updates database metadata:**
   - Reads current file from git (source of truth for content)
   - Updates `project_artifacts.git_commit_hash` to `def456`
   - Updates `project_artifacts.updated_at` to current timestamp
   - **Note:** Only metadata stored in DB, NOT file content - git is source of truth
10. System validates: no conflicts with pending workflows
11. Success: "Repository synced. Safe to proceed with workflows."
12. User continues workflow execution with confidence

---

## UX Design Principles

1. **Guided Not Automated** - UI provides structure and clarity while preserving human decision-making at every step
2. **Chat as Timeline** - Conversation interface doubles as temporal record of artifact evolution, showing version history inline with decisions that triggered them
3. **Pattern-Driven Interactions** - Specialized chat patterns for different contexts (sequential questions, parallel questions, structured exploration lists) rather than generic forms
4. **Dialog-Focused Actions** - Complex interactions happen in focused dialogs that maintain context while keeping main chat clean
5. **Visibility Over Abstraction** - Show what agents are doing in real-time (context, files, progress) rather than hiding complexity
6. **Progressive Refinement** - User controls when artifact versions are created through question answering progress bar, not automatic/unpredictable updates
7. **Minimal Context Switching** - Command palette (Linear-style) + unified interface keeps all orchestration, state, and artifact management in one place

---

## User Interface Design Goals

**Platform:**
- Desktop application built with Tauri (Rust backend + web frontend)
- UI framework: React + TypeScript
- Styling: Tailwind CSS with shadcn/ui component library
- Design system: Custom theme based on shadcn/ui primitives
- Single-window application with persistent sidebar navigation
- Responsive design supporting minimum 1280x720 resolution

**Core Screens:**

1. **Multi-Agent Dashboard (Home)**
   - Active agents panel with real-time progress bars and status indicators
   - Project phase navigation (visual 4-phase timeline)
   - Quick actions panel with natural language input
   - Recent artifacts list with timestamps
   - Command palette access (Cmd/Ctrl+K) for rapid navigation

2. **Story Kanban Board**
   - Drag-and-drop columns: BACKLOG → TODO → IN PROGRESS → REVIEW → DONE
   - Epic organization (swimlanes or filters - to be determined during implementation)
   - Agent assignment visible on story cards
   - Real-time progress indicators for active stories
   - Click story card → opens Story Detail view

3. **Artifact Workbench (Split-Pane Layout)**
   - **LEFT PANE:** Artifact content (markdown with syntax highlighting, live preview)
   - **RIGHT PANE:** Chat interface featuring:
     - Conversation timeline with agent responses
     - Structured interaction patterns (questions, exploration lists, elicitation methods)
     - Version blocks appearing inline when refinements occur
     - Context indicators (GPT-4, token usage, active files)
     - Refine button with progress bar showing path to next version
   - **Quote-to-Chat:** Select artifact text → quote into chat for discussion
   - **Auto-Diff Detection:** When user manually edits artifact, chat detects change and asks "Why did you change X?" with diff visualization
   - **History Sidebar:** Quick version switcher synced with timeline blocks

4. **Chat Interface Patterns (Core Innovation: Universal Interaction Primitives)**

   Chiron's chat interface is built on four composable interaction primitives that handle any decision-making, task execution, or exploration flow - not just question-answering. These patterns can be mixed, nested, and adapted to context.

   **Pattern A: Sequential Dependencies (Wizard/Chain Pattern)**
   - **Core Mechanic:** Each step depends on previous selection, revealing complexity progressively
   - **Visual:** Collapsed completed steps → Expanded current step → Greyed future steps
   - **Actions per step:** [Answer] [Clarify] [Ignore] or context-specific actions
   - **Use Cases:**
     - Multi-step wizards (project setup, epic creation, deployment config)
     - Conditional logic trees (if X, then show Y options)
     - Troubleshooting flows (check A → if yes, do B → if no, try C)
     - Git conflict resolution (resolve → test → commit → push)
     - Story refinement (define epic → select stories → acceptance criteria → estimate)
   - **State Tracking:** Progress bar shows completion, can jump back to modify earlier steps

   **Pattern B: Parallel Independence (Checklist/Queue Pattern)**
   - **Core Mechanic:** Independent items handled in any order, track completion state
   - **Visual:** REQUIRE ACTION (N) | COMPLETED (N) | ANSWERED (N) | IGNORED (N) sections
   - **Actions per item:** [Answer] [Clarify] [Ignore] [Restore] or context-specific actions
   - **Use Cases:**
     - Checklists (pre-deployment, testing, code review)
     - Acceptance criteria validation (mark each as done/pending)
     - Multi-agent task queue (assign independent tasks to agents)
     - Test suite results (show pass/fail for each test)
     - Epic story breakdown (work on stories in any order)
     - Feature flags (toggle multiple independent features)
     - Code review feedback (address comments in any order)
   - **State Tracking:** Can ignore optional items with feedback, restore later if needed

   **Pattern C: Structured Exploration (Curated Options with Deep-Dive)**
   - **Core Mechanic:** Present curated options, enable conversational exploration before commitment
   - **Visual:** Option cards with description + [Explore] [Select] [Reject] actions
   - **Modes:** Select-one (radio) or select-multiple (checkbox)
   - **Use Cases:**
     - Tech stack selection (database, UI library, auth provider with tradeoff discussions)
     - Architecture patterns (microservices vs monolith vs serverless)
     - Code refactoring strategies (agent suggests 3 approaches, user explores each)
     - Design pattern selection (Factory vs Builder vs Singleton)
     - Elicitation method selection (5 Whys, SCAMPER, Tree of Thoughts)
     - Testing strategy (unit vs integration vs E2E focus)
     - Deployment strategy (blue/green vs canary vs rolling)
     - Agent assignment (who should handle this task?)
     - Workflow selection (what should we do next?)
     - Story prioritization (explore business value before selecting epics)
   - **Exploration Dialog:** Opens focused conversation with agent, can compare multiple options, ask "why/why not"

   **Pattern D: Focused Dialogs (Context-Preserving Deep-Dive)**
   - **Core Mechanic:** Open focused dialog for complex actions while preserving main chat context
   - **Visual:** Modal/drawer with agent conversation, reasoning, tool calls, actions at bottom
   - **Actions:** ✓ Accept | ↻ Continue Discussion | ✗ Cancel | context-specific actions
   - **Use Cases:**
     - **Answer/Clarify (Questions):** Provide answer or refine question phrasing
     - **Code Explanation:** Select code block → explain in dialog with deep-dive
     - **Diff Review:** Click diff hunk → see context, related changes, impact
     - **Error Investigation:** Click error → stack trace, suggested fixes, similar issues
     - **Dependency Analysis:** Click function → callers, callees, impact radius
     - **Performance Analysis:** Click slow function → profiling data, optimization suggestions
     - **Security Audit:** Click vulnerability → exploit explanation, remediation steps
     - **Documentation Lookup:** Hover API → docs, examples, related methods
     - **Git Blame Context:** Click commit → author, PR context, related commits
     - **Test Failure Diagnosis:** Click failed test → failure reason, recent changes, fix suggestions
     - **Artifact Section Editing:** Select PRD section → structured editor with agent help
     - **Conflict Resolution:** Agent collision → discuss and resolve with both agents
     - **Breaking Change Review:** Proposed API change → show affected code, migration path
   - **Context Sync:** All dialog interactions sync back to main chat timeline

   **Pattern Composition Examples:**

   *Epic Creation Wizard:*
   - Sequential: Overview → Requirements → Tech decisions → Review
   - Structured List: Within requirements, select auth library (Better-Auth vs Auth.js)
   - Dialog: Click [Explore] on Better-Auth → conversational comparison
   - Parallel: Multiple feature toggles (email, OAuth, 2FA) enabled independently

   *Code Review Flow:*
   - Parallel: 5 review comments, address in any order
   - Dialog: Click comment → discuss with reviewer, propose alternatives
   - Sequential: For complex comment, follow remediation steps in order
   - Structured List: Agent suggests 3 refactoring approaches, explore before selecting

   *Story Implementation:*
   - Sequential: Acceptance criteria validation (dependencies require order)
   - Parallel: Multiple tasks (write tests, implement, update docs)
   - Dialog: Click failing test → investigate with agent
   - Structured List: Agent suggests design patterns for implementation

5. **Command Palette (Global Quick Actions)**
   - Linear-style command palette (Cmd/Ctrl+K)
   - Fuzzy search across: workflows, agents, artifacts, stories, navigation
   - Context-aware suggestions based on current screen
   - Keyboard-first navigation for power users
   - Recent items and favorites prioritized

**Key Interaction Patterns:**

1. **Chat Timeline as Version Control**
   - Conversation shows when/why each version was created
   - Version blocks appear inline: "Version 2 - 8:46:07 PM - Refinement 2"
   - Click version block → artifact pane jumps to that version
   - History sidebar provides quick version switching
   - Both navigation methods stay synced

2. **Refine Progress Bar**
   - Shows proximity to next artifact version generation
   - Fills incrementally as user answers required questions
   - User controls when refinement happens (not automatic)
   - Prevents surprise updates mid-thought

3. **Dialog-Driven Complexity**
   - Answer/Clarify/Explore actions open focused dialogs
   - Dialogs show: assistant reasoning, tool calls, conversation
   - Actions at bottom: ✓ (accept), ↻ (continue), ✗ (cancel)
   - Main chat stays clean, complex interactions isolated

4. **Quote and Discuss**
   - Select artifact text → appears as quote in chat
   - Enables precise discussion about specific sections
   - Agent can reference quotes in responses
   - Auto-quoting on manual edits with diff visualization

5. **Inline Editing with Chat Sync**
   - User edits artifact directly in left pane
   - Chat detects change via diff
   - Agent asks: "I see you changed X. Why did you make this change?"
   - Captures user intent for context and future refinements

6. **Real-Time Indicators**
   - Collapsible sections: 🤔 REASONING, 🛠️ TOOL CALLS (N)
   - Context badges: @ Context, GPT-4, token usage %
   - Progress bars: Agent execution, refinement proximity
   - Status badges: ✅ Answered, 🔄 In Progress, ⚪ Pending, ✗ Ignored

7. **Keyboard-First Navigation**
   - Command palette for global actions
   - Arrow keys for question navigation
   - Enter to Answer, C to Clarify, I to Ignore
   - Escape to close dialogs
   - Vim-style navigation optional (user preference)

---

## Epic List

The following epics are sequenced to maximize parallel development opportunities while respecting technical dependencies. Each epic represents 1-2 weeks of focused development effort.

### Delivery Sequence and Dependencies

**Phase 1: Foundation (Epics 1-2) - 3 weeks**
- Epic 1 and Epic 2 can be developed in parallel after initial project setup

**Phase 2: Core Orchestration (Epics 3-4) - 4 weeks**
- Epic 3 depends on Epic 1 and Epic 2 completion
- Epic 4 can start in parallel with Epic 3 (UI/backend split)

**Phase 3: Intelligence Layer (Epics 5-6) - 3 weeks**
- Epic 5 depends on Epic 3 (orchestration must work first)
- Epic 6 can be developed in parallel with Epic 5

**Phase 4: Polish & Extensibility (Epics 7-8) - 2 weeks**
- Epic 7 depends on all core features (Epic 1-6)
- Epic 8 can start earlier but benefits from user testing Epic 1-6

---

### Epic 1: Core Infrastructure & Database Foundation
**Goal:** Establish database schema, workflow engine, and project management primitives

**Functional Requirements:** FR001-005, FR032-033, FR035-036

**Key Deliverables:**
- PostgreSQL schema with all tables (projects, workflows, agents, project_artifacts, etc.)
- Database initialization and migration system
- BMAD workflow seeding from YAML/Markdown files
- Workflow execution engine following workflow.xml rules
- Project CRUD operations (create, import, delete)
- Project directory and git repository validation

**Success Criteria:**
- Database initializes on first launch with BMM + CIS workflows
- Can create new project entry and validate git repository
- Can execute simple workflow from database (e.g., product-brief stub)
- All 4-level variable resolution working (config_source, system-generated, user input, defaults)

**Technical Notes:**
- Use Drizzle ORM for schema management
- Seed data stored in `src/db/seeds/` directory
- Workflow execution engine is simplified version (no agent coordination yet)

**Estimated Effort:** 2 weeks

---

### Epic 2: Git Worktree Management & Isolation
**Goal:** Implement git worktree lifecycle management for per-agent workspace isolation

**Functional Requirements:** FR027-030, FR034, FR037-038

**Key Deliverables:**
- Git worktree creation/deletion API
- Worktree registry in `git_worktrees` table
- Automatic branch creation per agent
- Merge-back functionality on workflow completion
- Orphaned worktree cleanup on app restart
- Git commit hash tracking in `project_artifacts` table
- Divergence detection (DB hash vs git hash)
- Conflict resolution UI for competing modifications

**Success Criteria:**
- Can create isolated worktree for agent with unique branch
- Can detect external git commits (manual edits outside Chiron)
- Can merge agent's completed work back to main branch
- Can clean up orphaned worktrees after crash
- Git hash stored for every generated artifact

**Technical Notes:**
- Use `simple-git` library for git operations
- Worktree naming convention: `chiron-{agentName}-{timestamp}`
- Branch naming: `chiron/{agentName}/{workflowName}`

**Estimated Effort:** 1.5 weeks

---

### Epic 3: Multi-Agent Orchestration Core
**Goal:** Enable parallel agent execution with state synchronization and conflict handling

**Functional Requirements:** FR006-010, FR040-041, FR045

**Key Deliverables:**
- Agent spawning and lifecycle management (start, pause, stop)
- Git-database state synchronization service
- Cross-agent artifact modification detection
- Automated workflow handoff system (e.g., Analyst → PM)
- Agent-capability configuration system (role → MCPs/permissions mapping)
- OpenCode integration as primary DEV agent
- Optimistic locking for artifact writes
- Automatic database snapshots before destructive operations

**Success Criteria:**
- Can execute 2+ agents in parallel with isolated worktrees
- Database reflects agent status in real-time (idle, active, paused)
- System detects when Agent A modifies artifact used by Agent B
- Can trigger PM workflow automatically after Analyst completes product-brief
- Database snapshot created before workflow execution

**Technical Notes:**
- Agent state machine: IDLE → QUEUED → ACTIVE → PAUSED → COMPLETED → ERROR
- Use event-driven architecture (EventEmitter or message queue)
- Conflict resolution strategy TBD during implementation (Options A/B/C from Journey 2)

**Estimated Effort:** 3 weeks

---

### Epic 4: Real-Time System & UI Foundation
**Goal:** Build Tauri desktop app with core screens and real-time updates

**Functional Requirements:** FR016-020, FR031, FR042-044

**Key Deliverables:**
- Tauri application shell with Rust backend + React frontend
- Multi-Agent Dashboard with agent status tiles
- Story Kanban board (drag-and-drop)
- Artifact Workbench (split-pane: content + chat)
- Phase Navigation component (4-phase timeline)
- Structured Exploration Lists (technique/method selection)
- WebSocket or polling for real-time UI updates (throttled to 2 updates/sec)
- Command palette (Linear-style, Cmd/Ctrl+K)
- Disk space validation before worktree creation (<2GB warning)

**Success Criteria:**
- Desktop app launches and connects to local PostgreSQL
- Dashboard shows active agents with real-time progress bars
- Can drag story between Kanban columns (updates database)
- Artifact Workbench displays markdown with syntax highlighting
- Command palette searches workflows, agents, artifacts
- UI updates within 500ms of backend state change

**Technical Notes:**
- Frontend: React + TypeScript + Tailwind + shadcn/ui
- Backend: Tauri (Rust) with Hono API layer
- Real-time: Consider tRPC with subscriptions or WebSocket
- State management: Zustand or Jotai

**Estimated Effort:** 3 weeks

---

### Epic 5: Agent Context & MCP Management
**Goal:** Implement role-specific MCP injection and automatic context management

**Functional Requirements:** FR021-023

**Key Deliverables:**
- MCP configuration system per agent role
- Dynamic MCP injection based on active agent
- Context tracking and visibility UI
- Real-time context usage display (files accessed, MCP calls)
- Automatic context loading on workflow start

**Success Criteria:**
- DEV agent receives codebase MCPs (DeepGraph, Context7)
- Analyst agent receives research MCPs (web search, documentation)
- User can see in real-time: "Architect accessing docs/PRD.md, using React DeepGraph MCP"
- Context pollution eliminated (agents only see their required MCPs)

**Technical Notes:**
- MCP configuration stored in `agent_capabilities` table
- Use MCP SDK for dynamic server connection
- Context tracking via proxy layer monitoring tool calls

**Estimated Effort:** 1.5 weeks

---

### Epic 6: Project & State Management
**Goal:** Implement phase tracking, epic/story state machines, and artifact generation

**Functional Requirements:** FR011-015

**Key Deliverables:**
- Adaptive UI for project levels 0-4 (hide/show phases)
- Phase completion tracking (PHASE_1_COMPLETE flags)
- Epic state machine enforcement (Backlog → Drafted → Ready → In Progress → Review → Done)
- Story state transitions with validation
- Artifact generation engine (PRD, architecture docs, stories with YAML frontmatter)
- Metadata-only database storage (content stays in git)

**Success Criteria:**
- Level 0 project hides Analysis/Planning phases
- Level 3 project shows all 4 phases
- Can transition story from TODO → IN PROGRESS (blocks invalid transitions)
- Generated story file has correct YAML frontmatter + markdown body
- Database stores only metadata (title, status, assignee), NOT content

**Technical Notes:**
- State machine validation via Drizzle check constraints or application layer
- Artifact templates stored in database (seeded from BMAD)
- Use unified template engine (Handlebars or similar)

**Estimated Effort:** 2 weeks

---

### Epic 7: Chat Interface & Interaction Primitives
**Goal:** Build 4 universal chat patterns for workflow interaction

**Functional Requirements:** Derived from UX Design section (not explicit FRs, but core to product vision)

**Key Deliverables:**
- **Pattern A:** Sequential Dependencies (wizard/chain)
- **Pattern B:** Parallel Independence (checklist/queue)
- **Pattern C:** Structured Exploration (curated options with deep-dive)
- **Pattern D:** Focused Dialogs (context-preserving deep-dive)
- Chat timeline as version control (version blocks inline)
- Refine progress bar (proximity to next artifact version)
- Quote-to-chat functionality (select text → quote in chat)
- Auto-diff detection on manual edits
- Dialog-driven complexity (Answer/Clarify/Explore actions)

**Success Criteria:**
- Wizard pattern works for project setup (workflow-init equivalent)
- Checklist pattern works for acceptance criteria validation
- Exploration pattern works for tech stack selection
- Dialog pattern works for code explanation deep-dive
- Chat shows version blocks when artifact refined
- User can select PRD text and discuss in chat

**Technical Notes:**
- Build composable React components for each pattern
- Use Radix UI primitives for dialogs/modals
- Pattern state stored in `workflow_state` table
- Version blocks reference `artifact_versions` table

**Estimated Effort:** 2.5 weeks

---

### Epic 8: Extensibility & Admin Interface
**Goal:** Enable users to customize workflows, agents, and methodology through UI

**Functional Requirements:** FR024-026

**Key Deliverables:**
- Admin interface for CRUD operations on workflows, agents, elicitation methods
- Database seeding system (BMAD defaults on first launch)
- Workflow editor (YAML → form-based editing)
- Agent capability editor (assign MCPs, permissions)
- Technique/method library editor
- Version control for user modifications (rollback capability)
- Change preview before saving (impact analysis)

**Success Criteria:**
- Can add custom workflow through UI (no file editing)
- Can modify agent capabilities (e.g., give Analyst agent codebase MCP)
- Can add custom elicitation method
- Can rollback to previous workflow version
- Changes take effect immediately (no restart required)

**Technical Notes:**
- Admin routes protected (consider simple auth or unlock mechanism)
- Use JSON Schema for workflow validation
- Store modification history in `workflow_versions` table
- Provide "Reset to BMAD defaults" option

**Estimated Effort:** 2 weeks

---

### Epic 9: Data Integrity & Recovery (Stretch Goal / Post-MVP)
**Goal:** Advanced reliability features for production readiness

**Functional Requirements:** FR039-044 (partially covered in Epic 2-3, refinements here)

**Key Deliverables:**
- Manual reconciliation workflow UI (choose DB or git as source of truth)
- Enhanced automatic snapshot system
- Agent-capability validation before save
- Detailed error recovery flows
- Database backup/restore UI
- Conflict resolution analytics (track frequency, resolution choices)

**Success Criteria:**
- When auto-sync fails, user can manually reconcile with clear diff
- System prevents saving agent config that breaks core workflows
- Can export/import Chiron database (all projects + methodology)

**Technical Notes:**
- Consider this post-MVP (defer if timeline tight)
- Focus Epic 1-8 for thesis deliverable
- Use learnings from Epic 3 conflict handling

**Estimated Effort:** 1.5 weeks (deferred to post-MVP)

---

### Summary: 8 Core Epics (Epic 9 is stretch)

| Epic | Title | Effort | Dependencies | Parallelizable |
|------|-------|--------|--------------|----------------|
| 1 | Core Infrastructure & Database | 2w | None | No (foundation) |
| 2 | Git Worktree Management | 1.5w | None | Yes (with Epic 1) |
| 3 | Multi-Agent Orchestration | 3w | Epic 1, 2 | Partial (with Epic 4) |
| 4 | Real-Time System & UI | 3w | Epic 1 | Yes (with Epic 3) |
| 5 | Agent Context & MCP | 1.5w | Epic 3 | Yes (with Epic 6) |
| 6 | Project & State Management | 2w | Epic 3 | Yes (with Epic 5) |
| 7 | Chat Interface Primitives | 2.5w | Epic 4, 6 | No (needs UI + state) |
| 8 | Extensibility & Admin | 2w | Epic 1, 4 | Partial (after core) |
| **Total** | **8 epics** | **17.5 weeks** | - | **Optimized to ~12-14 weeks with parallelization** |

> **Note:** Detailed epic breakdown with full story specifications is available in [epics.md](./epics.md)

---

## Out of Scope

The following features are explicitly excluded from the MVP to maintain focus on core multi-agent orchestration capabilities within the 4-month thesis timeline.

### Excluded from MVP (Thesis Scope)

**1. Game Development Workflows**
- BMAD BMM module includes game-specific workflows (GDD, narrative design, game brief)
- Chiron MVP focuses exclusively on software projects (greenfield + brownfield)
- Rationale: Game workflows add complexity without validating core orchestration thesis
- Post-MVP: Can be added as plugin/extension after core platform proven

**2. Mobile Applications**
- Desktop-only (Tauri) for MVP
- No iOS/Android native apps
- Rationale: Multi-platform support distracts from orchestration innovation
- Post-MVP: Consider web-based UI or Electron for cross-platform portability

**3. Cloud/SaaS Deployment**
- Local-only PostgreSQL database
- No multi-user authentication or authorization
- No cloud hosting or team collaboration features
- Rationale: Thesis focuses on single-developer productivity gains
- Post-MVP: Multi-tenant SaaS requires auth, data isolation, billing

**4. Advanced AI Features**
- No LLM fine-tuning or custom model training
- No autonomous agent decision-making without human approval
- No automated code review or merge decisions
- Rationale: "Guided not automated" philosophy - human remains decision-maker
- Post-MVP: Explore agent autonomy levels as research extension

**5. Integrations with External Tools**
- No Jira/Linear/Asana/GitHub Issues sync
- No Slack/Discord notifications
- No CI/CD pipeline integration (GitHub Actions, GitLab CI)
- No IDE plugins (VS Code, JetBrains)
- Rationale: Integrations are polish, not core innovation
- Post-MVP: Community-driven integrations after open source release

**6. Advanced Git Features**
- No git rebase/squash/cherry-pick automation
- No advanced merge conflict resolution (AI-suggested merges)
- No git submodule or monorepo support
- No git LFS handling
- Rationale: Basic worktree + merge covers MVP needs
- Post-MVP: Add based on user feedback and pain points

**7. Team Collaboration Features**
- No real-time co-editing of artifacts
- No commenting or review workflows for teams
- No role-based access control (admin/developer/viewer)
- No audit logs or activity feeds
- Rationale: Solo developer use case for thesis validation
- Post-MVP: Essential for SaaS/enterprise adoption

**8. Advanced Reporting & Analytics**
- No productivity metrics dashboard (time saved, velocity tracking)
- No agent performance analytics (success rates, error patterns)
- No workflow optimization recommendations
- Rationale: Thesis evaluates feasibility, not long-term ROI
- Post-MVP: Data-driven insights for enterprise users

**9. Offline Mode**
- Requires internet for LLM API calls (Claude, GPT-4)
- No offline workflow execution
- No local LLM support (Ollama, LM Studio)
- Rationale: Scope constraint, API-based LLMs for MVP quality
- Post-MVP: Hybrid mode with local models for research/privacy

**10. Internationalization (i18n)**
- English-only UI and documentation
- No multi-language support for workflows or agents
- Rationale: Translation adds complexity without validating thesis
- Post-MVP: Community translations after open source

**11. Plugin/Extension Ecosystem**
- No third-party plugin architecture
- No marketplace or extension registry
- Users can customize via database (FR024-026), but no sandboxed plugin SDK
- Rationale: Extensibility via DB sufficient for MVP
- Post-MVP: Plugin system enables community innovation

**12. Advanced Testing Infrastructure**
- No built-in test generation or execution
- No coverage tracking or quality gates
- No integration with testing frameworks (Jest, Pytest, etc.)
- Rationale: Agents generate tests via workflows, but no test orchestration in MVP
- Post-MVP: Testing automation layer for CI/CD integration

**13. Performance Optimization**
- No database query optimization beyond Drizzle ORM defaults
- No Redis/caching layer for frequent queries
- No background job queue (Bull, BullMQ)
- Rationale: Single-user performance acceptable without optimization
- Post-MVP: Scale concerns addressed for SaaS

**14. Security Hardening**
- No penetration testing or security audit
- No secrets management (HashiCorp Vault, etc.)
- No rate limiting or DDoS protection
- Rationale: Local app with no public exposure
- Post-MVP: Essential for cloud deployment

**15. Migration Tools**
- No import from other tools (Jira, Linear, Notion)
- No export to standardized formats (JSON, CSV)
- No backup/restore beyond basic DB dump (FR033)
- Rationale: Fresh start for users, no legacy migration needed
- Post-MVP: Import tools for adoption by existing teams

### Deferred to Post-MVP (Not Thesis Critical)

**1. TEA (Test Architect) Agent**
- Comprehensive testing workflows and quality gates
- Advanced test coverage analysis
- E2E testing orchestration
- Integration with testing frameworks (Jest, Pytest, Playwright)
- Reason: 6 core agents (Analyst, PM, Architect, DEV, SM, UX) cover essential BMM methodology for MVP; testing workflows are complex and not critical for thesis validation of multi-agent orchestration

**2. Epic 9: Data Integrity & Recovery** (see Epic List)
- Advanced conflict resolution analytics
- Enhanced snapshot system
- Manual reconciliation UI polish
- Reason: Core integrity covered in Epic 2-3, refinements not thesis-critical

**3. Advanced Artifact Versioning**
- No git-style branching for artifacts (multiple draft versions)
- No "what-if" scenario exploration (fork PRD, compare alternatives)
- Linear version history only
- Reason: Version timeline (chat-based) sufficient for MVP

**4. Workflow Debugger**
- No step-through debugging for workflow execution
- No breakpoints or variable inspection
- Error logs only
- Reason: Useful for BMAD power users, not essential for thesis validation

**5. Custom Agent Creation**
- Users can configure 6 core agents (Analyst, PM, Architect, DEV, SM, UX)
- Cannot create new agent types (e.g., "QA Engineer" or "DevOps")
- Reason: 6 agents cover BMM methodology, custom agents add scope

**6. Workflow Marketplace**
- No community-shared workflows or templates
- No rating/review system
- No discovery mechanism
- Reason: Single-user MVP, marketplace requires ecosystem

### Summary: MVP Focus

**IN SCOPE:** Multi-agent orchestration for software projects (greenfield/brownfield), 6 core agents, 4-phase BMAD methodology, git worktree isolation, visual UX, local desktop app, single developer

**OUT OF SCOPE:** Game workflows, mobile apps, cloud/SaaS, team collaboration, external integrations, advanced AI, advanced git, internationalization, plugins, performance optimization, security hardening, migration tools

This clear boundary ensures the thesis demonstrates novel multi-agent coordination architecture within a realistic 4-month timeline while leaving pathways for future commercial/research extensions.
