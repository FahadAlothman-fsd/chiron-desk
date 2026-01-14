# Chiron Architecture Foundations

**Date:** 2025-11-01
**Status:** Foundational Decisions
**Purpose:** Record critical architectural decisions made during product-brief phase to guide PRD and architecture design

---

## Core Principles

### 1. Guided Not Automated

- Human makes strategic decisions at every workflow step
- Workflows provide structure; AI agents execute; humans validate
- Context visibility enables informed judgment, not blind acceptance

### 2. Multi-Agent Orchestration (Chiron's Core Innovation)

- **BMAD limitation:** Sequential, single-agent execution only (manual handoffs: *analyst → *pm → \*architect)
- **Chiron innovation:** Coordinate multiple agents simultaneously with isolated contexts
- **Value proposition:** Parallel execution (DEV on Story 1 while Architect designs Epic 2)
- **Architecture requirement:** Build orchestration layer on top of BMAD's single-agent model

### 3. Pattern-Driven UX

- Specialized interfaces for common workflow behaviors
- NOT generic workflow renderers or low-code builders
- Dynamic content + opinionated presentation

### 4. Clean Artifact Separation

- Database stores methodology; repository stores deliverables
- Version control tracks what matters: project artifacts, not infrastructure

---

## Data Storage Strategy

### Database Storage

**What:** BMAD metadata, project state, execution, user customizations

**Includes:**

- Workflows (ingested from YAML/MD files)
- Agents and agent configurations
- State machines and workflow paths
- Project state (phases, epics, stories, status)
- Execution history and tracking
- User customizations (custom elicitation methods, patterns)

**Why:**

- Enables dynamic updates as BMAD v6 evolves (alpha → stable)
- Supports user extensibility without file pollution
- Centralizes orchestration state

### Repository Storage

**What:** Project artifacts ONLY

**Includes:**

- Product Requirements Documents (PRDs)
- Architecture documentation
- Technical specifications
- Story files
- All as **markdown with YAML frontmatter**

**Why:**

- Clean version control history
- No methodology infrastructure pollution
- Clear separation: "how we work" vs "what we produce"

---

## Module Architecture

### Default Modules (MVP)

**BMM (Business Methodology Module)**

- 4-phase software development lifecycle: Analysis → Planning → Solutioning → Implementation
- 8+ specialized agents: PM, Analyst, Architect, SM, DEV, TEA, UX, Game roles
- Scale-adaptive workflows (Levels 0-4)
- Story state machine: BACKLOG → TODO → IN PROGRESS → DONE

**CIS (Creative Intelligence System)**

- 150+ creative/innovation techniques across 5 workflows
- 5 specialized agents with unique personas
- Integrates with BMM Phase 1 (Analysis) for brainstorming/ideation

### Out of Scope (MVP)

**BMB (BMAD Method Builder)**

- Meta-module for building BMAD components
- Not end-user facing for MVP
- Future consideration: Custom workflow creation

### Ingestion Approach

```
BMAD YAML/MD Files → Parser → Database Schema
                               ↓
                    Chiron Workflow Engine
                               ↓
                    Pattern-Driven UI Rendering
```

**Benefits:**

- Adapts to BMAD updates automatically
- User customizations preserved during BMAD syncs
- Extensible without hardcoded logic

---

## UX Pattern Philosophy

### Core Patterns Identified

**1. Multi-Agent Dashboard** (NEW - Core Innovation)

- **Problem:** BMAD's sequential single-agent model requires manual switching (*analyst → *pm → \*architect)
- **Solution:** Visual dashboard showing all active/queued/idle agents with real-time status
- **Features:**
  - Active agents panel (shows running workflows, progress %)
  - Agent queue (next agents waiting for handoff)
  - Isolated workspaces per agent (prevents context pollution)
  - Parallel execution visualization (DEV + Architect simultaneously)
- **Applies to:** All multi-workflow scenarios (Analysis → Planning → Solutioning → Implementation)

**2. Structured Exploration Lists**

- **Problem:** CLI Q&A pollutes context with long option lists
- **Solution:** Visual cards with expand/collapse, "reshuffle" for new suggestions
- **Applies to:** Elicitation methods, brainstorming techniques, design thinking phases

**3. Artifact Refinement Workbench**

- **Problem:** CLI text editing inadequate for complex documents; no version tracking
- **Solution:** Side-by-side editor with version history, approval workflow
- **Applies to:** PRD generation, architecture docs, tech specs

**4. Story State Kanban**

- **Problem:** CLI status files opaque; manual tracking tedious
- **Solution:** Drag-and-drop Kanban board integrated with workflow execution
- **Applies to:** Sprint planning, story progression, epic management

**5. Embedded Agent Panels**

- **Problem:** Context-switching between CLI windows, agents, PM tools
- **Solution:** In-app agent conversations with real-time context visibility
- **Applies to:** All agent interactions during workflow execution

### Design Philosophy

- **Dynamic content:** Workflow data flexible and updatable
- **Opinionated presentation:** UX patterns purposefully designed for efficiency
- **NOT building:** Generic form builders or low-code workflow designers

---

## Extensibility Model

### User Customization Points

**1. Elicitation Methods (Database Extension)**

```sql
elicitation_methods:
  - BMAD defaults (from CSV): is_custom = false
  - User additions: is_custom = true
  - Both displayed in UI selection menus
```

**Example:** User adds "RICE Prioritization" to brainstorming techniques

- Stored in DB alongside BMAD's 36 default techniques
- Survives BMAD version updates
- Shareable across team (future: export/import)

**2. Reserved Workflow Tags**

- Workflows support reserved tags: `<step>`, `<action>`, `<check>`, etc.
- Tags stored in DB for parsing and execution
- Enables BMAD workflow evolution without Chiron code changes

### What Users CANNOT Customize (MVP)

- Workflow structure (no custom workflow builder)
- Core UX patterns (opinionated by design)
- Agent personas (BMAD defaults only)

---

## CSV Schema Unification

### Type 1: Selection/Elicitation Methods

**Common schema:** `category, method_name, description, [extra_guidance], [metadata]`

**Examples:**

- `adv-elicit-methods.csv` (39 elicitation techniques)
- `brain-methods.csv` (36 brainstorming techniques)
- `design-methods.csv` (31 design thinking methods)

**Database mapping:**

```sql
CREATE TABLE elicitation_methods (
  module VARCHAR,        -- 'bmm', 'cis', 'core'
  workflow VARCHAR,      -- 'brainstorming', 'design-thinking'
  category VARCHAR,      -- 'collaborative', 'creative', 'deep'
  method_name VARCHAR,
  description TEXT,
  facilitation_prompts TEXT[],
  best_for VARCHAR,
  energy_level VARCHAR,
  typical_duration VARCHAR,
  custom_fields JSONB,  -- Workflow-specific extras
  is_custom BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP
);
```

### Type 2: Manifest/Registry Files

**Schema:** `name, description, module, path`

**Examples:**

- `workflow-manifest.csv`
- `agent-manifest.csv`
- `task-manifest.csv`

**Purpose:** System registries for BMAD components

### Type 3: Configuration/Taxonomy

**Schema:** Domain-specific (varies)

**Examples:**

- `game-types.csv`
- `pattern-categories.csv`
- `documentation-requirements.csv`

**Purpose:** Domain-specific configurations

---

## Workflow Execution Model

### BMAD Core Integration

- **Leverage:** BMAD's `workflow.xml` execution engine
- **NOT reinventing:** Use proven methodology execution logic
- **Integration point:** Chiron calls BMAD core with workflow context

### Execution Flow

```
User Action (UI) → Chiron Orchestrator
                         ↓
              Workflow Engine (BMAD core)
                         ↓
              Step Execution + State Updates
                         ↓
              Pattern-Driven UI Updates (real-time)
```

### State Management

- Project state stored in Chiron DB
- BMAD workflows read/write state via Chiron API
- UI reflects state changes in real-time

---

## Key Architectural Constraints

### MVP Scope

✅ **In Scope:**

- BMM + CIS module support
- Pattern-driven UX for core workflows
- User extensibility of elicitation methods
- Database-driven workflow ingestion

❌ **Out of Scope:**

- BMB (custom workflow builder)
- Multi-user collaboration (single user MVP)
- External tool integrations beyond AI coding agents
- Mobile applications (desktop/web only)

### BMAD Alpha Considerations

- BMAD v6 is currently alpha → expect changes
- Architecture must accommodate workflow updates
- Database schema must be migration-friendly
- UI patterns must gracefully handle new workflow types

---

## Next Steps

**Immediate (Product Brief completion):**

- Continue BMAD deep-dive questions (Q3-Q10)
- Complete remaining Product Brief sections

**After Product Brief:**

- Create PRD with detailed requirements
- Design full architecture (database schema, API contracts, component structure)
- Define technical specifications per epic

**Deferred to Architecture Phase:**

- Database schema design
- API contract definitions
- Component architecture
- Technology stack selection
- Deployment strategy

**Points to Investigate Further (Q3 Workflow System Insights):**

- Workflow execution state management (nested workflows, call stacks, variable context with 4-level precedence)
- Document versioning for template workflows (checkpoint tracking, approval workflow, rollback capability)
- Project state management (replicate workflow-status.md functionality in DB)
- State management approach: XState for workflow orchestration, Zustand for UI state, Drizzle for database queries, Effect for agent orchestration and complex workflows (structured concurrency for parallel agent execution, resource lifecycle management for git worktrees and agent contexts, typed error handling across multi-agent coordination, dependency injection for agent-specific MCP services, and composable retry/timeout patterns - addresses core challenges of running multiple isolated agents with guaranteed cleanup and type-safe error propagation)
- Workflow-to-DB API design (how workflows query/update Chiron state vs reading .md files)

**Points to Investigate Further (Q4 Agent System - Multi-Agent Orchestration):**

- **Competitive research:** Conductor.build (https://conductor.build/) already does parallel coding agent orchestration - research their approach, learn from their patterns, identify differentiation opportunities
- **Agent session management:** How to maintain isolated contexts for concurrent agents (prevent context pollution)
- **Agent handoff protocol:** Workflow output from Agent A becomes input context for Agent B
- **Parallel execution coordination:** DEV implements Story 1 while Architect designs Epic 2 (workspace isolation critical)
- **Agent state tracking:** Active, queued, idle, waiting-for-input states
- **Agent communication:** How agents signal completion/readiness for handoff
- **Workspace isolation:** File-level separation (Agent A's PRD.md draft != Agent B's codebase access)
- **XState integration:** Multi-agent orchestration state machine design
- **BMAD agent count:** 14+ specialized agents (BMM: 9, CIS: 5) - prioritize which agents for MVP
- **Chiron's differentiation:** BMAD methodology + PM-grade SDLC + pattern-driven UX vs Conductor's generic automation
- **Context-aware MCP injection:** Agents should have role-specific MCP servers to prevent context pollution
  - Problem: All MCPs loaded = context bloat, unnecessary tools in agent context
  - Solution: Inject MCPs based on agent role and workflow context
  - Examples: DEV agent gets codebase MCPs (React DeepGraph, memory), Analyst agent gets research MCPs (web search, Context7)
  - BMAD v6 roadmap includes MCP Injections - align Chiron's approach with BMAD's implementation
  - Database schema: agent_mcp_mappings table (which MCPs for which agents/workflows)

**Points to Investigate Further (Q5 4-Phase Methodology - Dashboard & Navigation):**

- **Phase progression UI:** Visual representation of 4 phases (Analysis → Planning → Solutioning → Implementation) with completion status
- **Project state schema:** Database structure to replace workflow-status.md (current_phase, current_workflow, next_command, next_agent, phase_X_complete flags)
- **Level-based adaptation:** Dashboard adjusts to project level (0-4) - Level 1 hides Solutioning, Level 4 shows all phases
- **Workflow path visualization:** Show required vs optional workflows per phase, locked vs available states
- **Gate check pattern:** solutioning-gate-check UI (validate PRD + UX + Architecture before Phase 4)
- **Phase completion rules:** Auto-detect when all required workflows done, unlock next phase
- **Artifact-workflow linking:** Track which workflow generated which output (PRD.md ← prd workflow)
- **5 workflow-status modes:** How to implement validate/data/init-check/update modes in Chiron's orchestration layer

**Points to Investigate Further (Q6 Project Types & Levels - Adaptive Workflows):**

- **Project types (MVP scope):** Software only (greenfield + brownfield) - game workflows excluded from MVP
- **5 Complexity levels (0-4):** Atomic change (0) → Small feature (1) → Medium project (2) → Complex system (3) → Enterprise (4)
- **Phase skipping rules:** Level 0-1 skip Phase 3 (Solutioning) entirely - Dashboard must hide phases dynamically based on level
- **Documentation strategy by level:** L0-1 = tech-spec only, L2 = PRD + optional tech-spec, L3-4 = PRD + Architecture + JIT tech-specs per epic
- **Smart project wizard:** Keyword detection to auto-suggest level ("fix bug" → L0, "multi-tenant platform" → L4) with manual override
- **10 workflow path files:** greenfield/brownfield × levels 0-4 (game-design.yaml excluded from MVP)
- **Brownfield prerequisites:** `document-project` workflow for undocumented codebases - orchestrate via coding agent (Claude Code/OpenCode), display results in Chiron
- **Level switching:** Allow project upgrade if scope grows (L2 → L3 when complexity increases)
- **Path-based workflow recommendations:** Dashboard shows "Next workflow" based on current level's path file
- **Brownfield vs Greenfield context:** Brownfield agents receive existing architecture docs as input context automatically

**Points to Investigate Further (Q7 Status & Tracking - Database Schema Design):**

- **Dual tracking system:** Two complementary tracking mechanisms
  - `project_state` table (replaces workflow-status.md) - Phase-level progress tracking
  - `sprint_tracking` table (replaces sprint-status.yaml) - Story-level implementation tracking
- **project_state schema:** project_name, project_type, project_level, field_type, workflow_path, current_phase, current_workflow, current_agent, phase_X_complete flags, next_action, next_command, next_agent
- **sprint_tracking schema:** JSONB development_status field storing epic/story states, project_key, tracking_system, story_location
- **Story state machine validation:** Enforce valid transitions
  - Epic: backlog → contexted
  - Story: backlog → drafted → ready-for-dev → in-progress → review → done
  - Retrospective: optional ↔ completed
  - **No downgrades:** Can't regress from 'done' back to 'in-progress'
- **API design patterns:** Replace BMAD file operations
  - Read: `workflow_status.read(mode=data)` → `chiron.api.getProjectState(projectId)`
  - Write: `invoke-workflow mode=update` → `chiron.api.updateProjectState({workflow_name, action})`
  - Story updates: Direct file writes → `chiron.api.updateStoryStatus({story_key, status})`
- **Validation rules enforcement:**
  - Phase progression logic (can't skip phases without completion)
  - State machine transitions (validate allowed state changes)
  - solutioning-gate-check criteria (PRD ↔ Architecture ↔ Stories alignment)
  - Document completeness by level
- **Error handling strategy:** Graceful degradation, backup/recovery, partial success support
- **5 workflow-status modes implementation:** interactive, validate, data, init-check, update - how to expose via Chiron API

**Q9 User Journey Insights (Concrete Mechanics):**

**1. Installation & Directory Structure:**

- **BMAD approach:** Copies entire workflow library to `bmad/` directory in user's project
- **Chiron decision:** Store workflows in database, only generate artifacts in user's `docs/` folder
- **Rationale:** Avoid repo bloat, enable dynamic updates as BMAD evolves
- **Implementation:** Workflow ingestion service loads BMAD files into DB on Chiron startup/update

**2. Workflow Execution Pipeline (Critical Flow):**

```
workflow.xml (engine) → workflow.yaml (config) → instructions.md (steps) →
  → template.md (output) → artifact files (docs/) → status update
```

- **Chiron translation:**
  - `workflow.xml` = Workflow Engine Service (backend API)
  - `workflow.yaml` = `workflow_templates` table (DB)
  - `instructions.md` = `workflow_steps` table (DB)
  - `template.md` = Template files stored in DB or file system
  - Status updates = `project_state` table writes

**3. File READ/WRITE Patterns (Per Workflow Execution):**

- **Files READ:**
  - `workflow.yaml` (workflow config)
  - `config.yaml` (user settings) → Chiron: project settings table
  - `workflow-status/instructions.md` (validation) → Chiron: API call to check status
  - `template.md` (document template)
  - Previous phase artifacts (e.g., PRD reads product-brief.md)
- **Files WRITTEN:**
  - Output artifact (e.g., `docs/product-brief-myproject-2025-11-01.md`)
  - `bmm-workflow-status.md` (state update) → Chiron: `project_state` table update
- **Chiron implementation:** File Generation Service API endpoint to write artifacts to user's repo

**4. Artifact Dependency Chain (Cross-Phase Data Flow):**

```
Phase 1: product-brief.md
    ↓
Phase 2: PRD.md + epics.md (reads product-brief.md)
    ↓
Phase 3: architecture.md (reads PRD.md + epics.md + optional ux-spec.md)
    ↓
Phase 4: story-X.X.md (reads epics.md + PRD.md + architecture.md)
```

- **Critical requirement:** Track artifact dependencies in DB
- **New schema needed:**

```sql
CREATE TABLE workflow_dependencies (
  workflow_id INT,
  required_artifact_type ENUM('product_brief', 'prd', 'epics', 'architecture', 'ux_spec'),
  is_optional BOOLEAN
);

CREATE TABLE project_artifacts (
  id SERIAL PRIMARY KEY,
  project_id INT,
  artifact_type VARCHAR,
  file_path TEXT,
  created_at TIMESTAMP
);
```

- **Validation logic:** Before starting workflow, check if required artifacts exist. Block execution if missing required dependencies.

**5. State Transition Mechanics (Status File Updates):**

- **BMAD pattern:** Workflow completion triggers `invoke-workflow mode=update` → reads workflow path YAML → determines next workflow → updates status fields
- **Chiron equivalent:**

```javascript
// After workflow completion
await chiron.api.updateProjectState({
  projectId,
  action: "complete_workflow",
  workflowName: "product-brief",
});
// Backend logic:
// 1. Mark workflow complete in completed_workflows[]
// 2. Load workflow path (greenfield-level-3 sequence)
// 3. Determine next workflow from sequence
// 4. Update current_workflow, next_command, next_agent
// 5. Check if phase complete (last required workflow in phase)
```

**6. Variable Resolution System (4-Level Precedence):**

- **BMAD system:**
  1. Hardcoded in workflow.yaml
  2. From config.yaml via `{config_source}:field_name`
  3. System-generated (e.g., `{date}`)
  4. Ask user at runtime (unknown variables)
- **Chiron implementation:**
  - Level 1: Workflow template defaults (DB)
  - Level 2: Project settings table (`SELECT setting_value FROM project_settings WHERE key = ?`)
  - Level 3: System variables (timestamp, user info from session)
  - Level 4: Runtime prompts in UI (form fields for missing variables)
- **Template engine needed:** Replace `{config_source}:user_name` → query DB → insert value

**7. New Architectural Components Identified:**

| Component                       | Purpose                                                         | Replaces (BMAD)                       |
| ------------------------------- | --------------------------------------------------------------- | ------------------------------------- |
| **Workflow Engine Service**     | Orchestrates step execution, variable resolution, state updates | `bmad/core/tasks/workflow.xml`        |
| **Artifact Dependency Checker** | Validates prerequisites before workflow starts                  | Implicit reads in instruction steps   |
| **File Generation Service**     | Writes artifacts to user's repo via API                         | Direct file writes in workflows       |
| **Workflow Path Resolver**      | Determines "what's next" based on project type/level            | Reads `greenfield-level-3.yaml`       |
| **Template Variable Engine**    | Resolves variables using 4-level precedence                     | BMAD's variable resolution logic      |
| **Workflow Ingestion Service**  | Loads BMAD YAML/MD files into database                          | Manual installation to `bmad/` folder |

**8. Critical Design Decisions Confirmed:**

✅ **No local workflow files in user repos** - Prevents bloat, enables dynamic updates
✅ **Explicit artifact dependency tracking** - DB stores "PRD requires product_brief"
✅ **Workflow path as database logic** - Sequence rules stored in DB, queried dynamically
✅ **File generation via API** - Chiron backend writes to user's repo on behalf of workflows
✅ **Status updates via API** - No more `.md` file parsing, all state in `project_state` table
✅ **Template variable system** - Project settings + runtime inputs resolve `{variables}`

**Q10 Technical Architecture Insights (Integration, Execution & Version Control):**

**1. Slash Command Bridge Mechanics:**

- **BMAD's approach:** Auto-generates `.claude/commands/` files during installation
  - Command files are text prompts: "LOAD workflow.xml + pass workflow.yaml path as parameter"
  - Claude Code reads command → LLM loads workflow.xml → executes workflow
  - Generation code: `tools/cli/installers/lib/ide/workflow-command-generator.js`
  - Example command content:
    ```markdown
    # product-brief

    IT IS CRITICAL THAT YOU FOLLOW THESE STEPS:

    1. Always LOAD {project-root}/bmad/core/tasks/workflow.xml
    2. READ its entire contents
    3. Pass yaml path as 'workflow-config' parameter
    4. Follow workflow.xml instructions EXACTLY
    ```

- **Chiron's approach:** No slash commands needed
  - UI buttons/workflows trigger API calls directly: `POST /api/workflows/execute`
  - Backend workflow engine uses **LLM + structured outputs** (not freeform text prompts)

**2. LLM Role in Workflow Execution (Critical Architectural Clarification):**

**BMAD's approach:**

- LLM interprets XML tags from freeform markdown instructions
- Relies on prompt adherence (no output validation)
- Works for single-agent, sequential execution with human in the loop

**Chiron's approach (Hybrid: LLM Decisions + Structured Outputs):**

```
Workflow Step Execution:
  ↓
LLM receives: Current step + Context + Available actions
  ↓
LLM decides (via DSPy/ax structured output):
  {
    "action": "template-output" | "ask" | "elicit" | "goto" | "invoke-workflow",
    "content": "Generated PRD section...",
    "next_step": 3,
    "requires_approval": true,
    "elicit_method": "SWOT Analysis",  // If action = elicit
    "metadata": {...}
  }
  ↓
Chiron parses guaranteed schema (DSPy ensures valid JSON)
  ↓
Chiron enforces rules & validates decisions:
  - Validate decision (e.g., next_step within valid range)
  - If requires_approval && !yolo_mode → Show user, wait for approval
  - If template-output → Save to DB, render editor UI
  - If elicit → Generate interactive card list in UI
  - If ask → Show prompt in UI, wait for user input
  ↓
Chiron executes next step based on LLM's validated decision
```

**Role Separation (LLM + Chiron + User):**

| Component                                  | Responsibility                                           | Examples                                                                                      |
| ------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **LLM (Agentic Brain)**                    | Make workflow decisions based on context                 | Which step next? What elicitation method? Is this section complete? What content to generate? |
| **DSPy/ax (Structure Enforcer)**           | Guarantee parseable outputs, enable optimization         | Enforce JSON schema, future: GEPA/ACE optimizers for better decisions                         |
| **Chiron (Execution Engine + Gatekeeper)** | Execute decisions, enforce rules, render UI, track state | Validate next_step, enforce approval gates, save artifacts, update project_state              |
| **User (Final Authority)**                 | Approve/reject LLM decisions (unless yolo mode)          | Continue [c] or Edit [e]?, Approve generated content, Override decisions                      |

**Benefits over BMAD's freeform approach:**

- ✅ Guaranteed parseable outputs (no regex hacks or hope-based parsing)
- ✅ Validation of LLM decisions (reject invalid next_step, invalid actions)
- ✅ Future optimization (DSPy optimizers like GEPA/ACE improve decision quality)
- ✅ Multi-agent coordination (structured decisions enable parallel workflow orchestration)
- ✅ Reliable UI rendering (action type determines which UI component to show)

**3. Version Control Strategy:**

- **BMAD's approach:**
  - No automatic commits (user manually commits via git)
  - Date-based artifact naming: `product-brief-{project}-{date}.md`
  - `.gitignore` excludes BMAD infrastructure: `.bmad-core/`, `.bmad-creator-tools/`
  - No file versioning (regeneration overwrites files)
  - Recommended commit points: After workflow completion, after phase completion

- **Chiron's approach:**
  - ✅ Keep date-based naming pattern (clear audit trail)
  - ⚠️ **Git commit strategy - Decision deferred to PRD phase:**
    - Option A: Auto-commit after workflows (opinionated, convenient)
    - Option B: Manual commits (user control, matches BMAD)
    - Option C: Suggested commits (UI notification, user decides)
  - ✅ **Add artifact version tracking in DB:**
    ```sql
    CREATE TABLE artifact_versions (
      id SERIAL PRIMARY KEY,
      artifact_id INT REFERENCES project_artifacts(id),
      version INT,
      content TEXT,
      generated_by_workflow VARCHAR,
      created_at TIMESTAMP,
      git_commit_hash VARCHAR(40)  -- Track which commit this version was generated at
    );
    ```
  - Enables rollback even if file is overwritten
  - Git integration via API (isomorphic-git or simple shell commands)

**4. Workflow Parsing & Execution Mechanics:**

- **BMAD's approach:**
  - **YAML parsing:** Uses `js-yaml` library (standard Node.js package)
  - **Variable resolution:** Regex-based string replacement
    ```javascript
    const regex = new RegExp(placeholder, "g");
    content = content.replace(regex, value);
    ```
  - **XML tag processing:** LLM interprets tags directly from instructions.md (no explicit parser!)
  - **4-level precedence:** User responses > Workflow variables > System variables > Inherited variables
  - **Philosophy:** "Deliberately simple, portable across AI platforms, relies on LLM instruction following"

- **Chiron's approach:**
  - **YAML parsing:** Use `js-yaml` or equivalent (TypeScript/Rust)
  - **Variable resolution:** Same regex pattern, but query DB for config values
    ```javascript
    // Resolve {config_source}:output_folder
    const configValue = await db.query("SELECT value FROM project_settings WHERE key = ?", [
      "output_folder",
    ]);
    content = content.replace(/{config_source}:output_folder/g, configValue);
    ```
  - **Workflow execution:** Hybrid approach (LLM decisions + programmatic validation)
    - LLM receives step instructions with context
    - LLM outputs structured decision (DSPy schema)
    - Chiron validates and executes decision
    - Chiron handles all state management, file operations, UI rendering
  - **Tag interpretation:** LLM outputs action type, Chiron maps to execution logic
    ```typescript
    async function executeStepDecision(decision: WorkflowStepOutput) {
      switch (decision.action) {
        case "template-output":
          await saveArtifact(decision.content);
          await showEditorUI(decision.content);
          if (decision.requires_approval && !yoloMode) {
            await waitForUserApproval();
          }
          break;
        case "elicit":
          const methods = await getElicitationMethods(decision.elicit_method);
          await showInteractiveCards(methods);
          break;
        case "ask":
          const answer = await promptUser(decision.content);
          context.userInputs[decision.variable_name] = answer;
          break;
        case "goto":
          return decision.next_step;
        case "invoke-workflow":
          await executeWorkflow(decision.workflow_id, context);
          break;
      }
    }
    ```

**5. Variable Resolution - 4-Level Precedence System:**

| Level       | BMAD Source                                     | Chiron Source                                                        |
| ----------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| 1 (Highest) | User responses (runtime input)                  | UI form inputs, user prompts during workflow execution               |
| 2           | Workflow variables (hardcoded in workflow.yaml) | Workflow template defaults stored in DB (`workflow_templates` table) |
| 3           | System variables (`{date}`, `{project-root}`)   | System-generated values (timestamp, paths, user session data)        |
| 4 (Lowest)  | Inherited variables (from parent workflows)     | Project settings table queries (`project_settings` table)            |

**Chiron implementation:**

```typescript
async function resolveVariable(variableName: string, context: WorkflowContext): Promise<string> {
  // Level 1: Check user input (highest priority)
  if (context.userInputs[variableName]) {
    return context.userInputs[variableName];
  }

  // Level 2: Check workflow defaults
  if (context.workflowDefaults[variableName]) {
    return context.workflowDefaults[variableName];
  }

  // Level 3: Check system variables
  if (variableName === "date") {
    return new Date().toISOString().split("T")[0];
  }
  if (variableName === "project-root") {
    return context.projectPath;
  }

  // Level 4: Query project settings (lowest priority)
  const setting = await db.projectSettings.get(context.projectId, variableName);
  if (setting) return setting.value;

  // Not found - prompt user (becomes Level 1 input)
  return await promptUserForVariable(variableName);
}
```

**6. New Architectural Components Identified:**

| Component                       | Purpose                                               | Implementation Notes                                                          |
| ------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| **YAML Parser**                 | Load workflow configs from DB                         | Use `js-yaml` or equivalent (TypeScript/Rust)                                 |
| **Variable Resolver**           | Replace `{variables}` using 4-level precedence        | Regex replacement + DB queries for settings                                   |
| **DSPy/ax Integration**         | Enforce structured LLM outputs for workflow decisions | TypeScript port (`ax`), define schemas for each action type                   |
| **Workflow Decision Validator** | Validate LLM decisions before execution               | Check next_step bounds, validate action types, ensure required fields present |
| **Action Executor**             | Map LLM action decisions to concrete execution        | switch/case logic for template-output, ask, elicit, goto, invoke-workflow     |
| **Artifact Versioning Service** | Track version history in DB with git context          | Store content snapshots per generation with commit hash                       |
| **Git Integration Service**     | Commit artifacts to user's repo                       | isomorphic-git or shell commands, track commit hashes                         |
| **Template Engine**             | Resolve variables in templates before generation      | Combine variable resolver + template content                                  |

**7. Critical Design Decisions (Q10 Summary):**

✅ **No slash commands** - UI triggers workflows via API (cleaner, more reliable than text prompts)
✅ **Hybrid LLM + structured execution** - LLM makes agentic decisions, DSPy enforces schemas, Chiron validates and executes
✅ **Date-based artifact naming** - Keep BMAD's pattern (`product-brief-chiron-2025-11-01.md`)
✅ **Artifact version tracking with git context** - Store versions in DB with commit hash for audit trail
✅ **4-level variable precedence** - User > Workflow > System > Settings (implement in template engine)
✅ **DSPy/ax for structured outputs** - Guarantee parseable decisions, enable future optimization (GEPA/ACE)
✅ **Action-based execution mapping** - LLM outputs action type, Chiron maps to UI/execution logic
⚠️ **Git commit strategy TBD** - Defer to PRD phase (auto-commit vs manual vs suggested commits)

---

## Future Considerations & Post-MVP Features

**Note:** These ideas emerged during product-brief phase but are intentionally scoped OUT of MVP. Revisit during post-MVP epic planning.

### 1. Git Commit Hash Tracking (Workflow Safety Feature)

**Problem:** Chiron has no awareness of external repo changes (commits made outside Chiron, direct file edits, git operations)

**Solution:** Store git commit hash in project state to detect drift

**Benefits:**

- Detect external changes (compare `last_known_commit_hash` vs current HEAD)
- Workflow safety (warn if uncommitted changes exist before starting workflow)
- Audit trail (track which commit each artifact was generated from)
- Conflict prevention (alert user if repo state changed during workflow execution)

**Implementation:**

```sql
-- Schema additions
ALTER TABLE project_state ADD COLUMN last_known_commit_hash VARCHAR(40);
ALTER TABLE project_artifacts ADD COLUMN generated_at_commit VARCHAR(40);

-- Workflow pattern (before starting any workflow)
const currentHash = await git.getCurrentCommitHash();
const storedHash = await chiron.getProjectState().last_known_commit_hash;
if (currentHash !== storedHash) {
  // Prompt: "Repo changed outside Chiron. Sync status? [y/n]"
}
```

**Workflows to add:**

- `sync-repo-state` - Reconcile Chiron state with actual repo state
- `detect-external-changes` - Background service to monitor git status

**Priority:** Post-MVP (nice-to-have, not blocking core functionality)

---

### 2. Idea Capture System (Meta-Feature for Flow State)

**Problem:** During deep workflow sessions, tangential ideas emerge that are:

- Not relevant to current task (context-switching breaks flow)
- Valuable for future consideration (forgetting them wastes insights)
- Need lightweight capture now → structured review later

**Solution:** "Parking Lot" system for capturing ideas without breaking workflow flow

**User Story:**

```
During product-brief workflow:
User: "What if we track commit hashes?"
Analyst: "💡 Great idea! Captured to project backlog. I'll remind you during Planning phase."

Later (during PRD workflow):
PM agent: "You have 3 captured ideas from Analysis. Review now? [y/n]"
→ User reviews ideas
→ Options: [Add to PRD] [Create Epic] [Archive] [Ignore]
```

**Implementation:**

```sql
CREATE TABLE project_annotations (
  id SERIAL PRIMARY KEY,
  project_id INT,
  annotation_type ENUM('idea', 'risk', 'decision', 'question', 'assumption', 'tech_debt'),
  content TEXT,
  captured_during_workflow VARCHAR,  -- e.g., "product-brief"
  captured_at TIMESTAMP,
  related_artifact_id INT REFERENCES project_artifacts(id),
  status ENUM('backlog', 'addressed', 'archived'),
  addressed_in_workflow VARCHAR,  -- e.g., "prd" (when idea was acted upon)
  resolution_note TEXT  -- How was this idea handled?
);
```

**Workflows to add:**

- `*capture-idea` - Quick capture during any workflow (minimal interruption)
- `*review-ideas` - Structured review of captured ideas
- Integration with PRD/Architecture workflows to prompt idea review at phase transitions

**Benefits:**

- Preserves flow state (no context-switching during creative work)
- Creates audit trail of idea evolution (captured → addressed → how it was resolved)
- Supports multiple annotation types (ideas, risks, questions, assumptions, tech debt)
- Links ideas to context (which workflow, which artifact, when)

**Priority:** Post-MVP (enhances UX but not required for core functionality)

---

_This document captures foundational decisions to ensure consistency as we move into PRD and detailed architecture design. All future design work should align with these principles._
