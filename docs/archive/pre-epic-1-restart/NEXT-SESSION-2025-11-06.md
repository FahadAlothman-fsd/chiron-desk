# Next Session Guide - Schema Implementation

**Date:** 2025-11-06
**Previous Session:** Schema design finalized through workflow mapping
**Status:** Ready to implement schema and seed Phase 1 workflows

---

## Quick Start

**What to do:** Implement Chiron database schema and seed Phase 1 workflows

**Which agent:** DEV (Amelia)

**Command:** "Implement the Chiron database schema from docs/architecture/database-schema-final.md"

---

## ⚠️ CRITICAL UPDATES (2025-11-05 Gate Check)

**Schema has been updated to 16 tables (was 15):**

1. **NEW TABLE:** `app_config` - System settings for API keys
   - Location: `packages/db/src/schema/config.ts`
   - Purpose: Store OpenRouter/Anthropic/OpenAI API keys (encrypted)
   - Required for first-time setup flow (Story 1.4)
   - See `database-schema-final.md` section 12 for full definition

2. **ENHANCED TABLE:** `project_artifacts` - Added `gitCommitHash` column
   - Type-safe git tracking (FR034 compliance)
   - Indexed for performance
   - See `database-schema-final.md` section 11 for updated definition

3. **UPDATED:** Story 1.1 acceptance criteria in `epics.md`
   - Now specifies 16 tables (was 11)
   - Documents schema evolution from Phase 2 → Phase 3
   - Lists all table categories and purposes

**Gate Check Report:** See `docs/implementation-readiness-report-2025-11-05.md` for full validation details (9.8/10 readiness score)

---

## What Was Accomplished (Previous Session)

### 1. Complete Schema Design ✅ + Gate Check Validation ✅

- **16 tables** defined with full TypeScript types (updated from 15 after gate check)
- **N-way branching** pattern designed for select conditionals
- **Variable storage** pattern established (all in `workflow_executions.variables`)
- **Context inline** pattern (no file system dependencies)
- **Artifact tracking** pattern (database references, not metadata files)
- **API key storage** added (`app_config` table for OpenRouter/Anthropic/OpenAI keys)
- **Git tracking** enhanced (dedicated `gitCommitHash` column in `project_artifacts`)

### 2. Phase 1 Workflows Mapped ✅

- **brainstorm-project** - 10 steps, 4 conditional branches, 1 artifact
- **research** - 16 steps, **6-way select branch** (router pattern), 1 artifact
- **product-brief** - **PENDING** (next session)

### 3. Key Architectural Decisions ✅

- Context defined inline in workflow config (NOT file paths)
- All runtime data in `workflow_executions.variables` JSONB
- Branching via `workflow_step_branches` table (supports N-way)
- Artifacts tracked in `project_artifacts` (NO metadata files!)
- `project_state` table tracks progress (NO status files!)

---

## File References

### Primary Documents

1. **`docs/architecture/database-schema-final.md`** ← THE SCHEMA
   - All 16 tables with complete definitions (updated 2025-11-05)
   - TypeScript types for JSONB columns
   - Example data for understanding
   - Implementation checklist
   - **CRITICAL:** Includes `app_config` table for API key storage (required for first-time setup)

2. **`docs/implementation-readiness-report-2025-11-05.md`** ← GATE CHECK RESULTS
   - Comprehensive validation of schema against PRD, architecture, and UX requirements
   - Readiness score: 9.8/10 (after fixes)
   - Traceability matrices
   - Security notes for API key encryption

3. **`docs/next-session-guide.md`** ← Original project guide
   - Tool stack decisions (AI SDK + Mastra + ax)
   - Epic 1 timeline
   - Story 1.1 acceptance criteria (now OUTDATED - see epics.md)

4. **`docs/epics.md`** ← Epic breakdown
   - Story 1.1: Database Schema Design (16 tables - updated 2025-11-05)
   - Story 1.2: BMAD Workflow Seeding

### Workflow Examples (For Seeding)

4. **`bmad/bmm/workflows/workflow-status/paths/greenfield-level-3.yaml`**
   - Phase 1: brainstorm-project, research, product-brief
   - Phase 2-4: Additional workflows

5. **`bmad/bmm/workflows/1-analysis/brainstorm-project/instructions.md`**
   - Full workflow instructions (reference for seeding)

6. **`bmad/bmm/workflows/1-analysis/research/instructions-router.md`**
   - 6-way router workflow (reference for seeding)

---

## Tasks for This Session

### Task 1: Implement Schema in Drizzle (2-3 hours)

**Location:** `packages/db/src/schema/`

**Files to create:**

- `core.ts` - projects, project_state, workflow_paths, workflow_path_workflows
- `workflows.ts` - workflows, workflow_steps, workflow_step_branches, workflow_step_actions
- `executions.ts` - workflow_executions, project_artifacts
- `agents.ts` - agents
- `config.ts` - app_config (NEW - API key storage)
- `optimization.ts` - training_examples, optimization_runs
- `index.ts` - export all schemas

**Key Points:**

- Copy table definitions EXACTLY from `database-schema-final.md`
- Include all enums, indexes, TypeScript types
- Test with `drizzle-kit generate` to create migrations

**Success Criteria:**

- ✅ All 16 tables defined (including app_config)
- ✅ Migrations generated without errors
- ✅ TypeScript types compile
- ✅ Database can be initialized with `drizzle-kit push`
- ✅ Security note: app_config table ready for encryption implementation (Story 1.4)

---

### Task 2: Create Seed Data for Phase 1 (3-4 hours)

**Location:** `packages/db/src/seed/`

**Files to create:**

- `seed-agents.ts` - Analyst agent
- `seed-workflow-paths.ts` - greenfield-level-3 path
- `seed-workflows.ts` - brainstorm-project, research workflows
- `seed-workflow-steps.ts` - All steps for Phase 1 workflows
- `seed-workflow-branches.ts` - Conditional branches
- `seed-workflow-path-workflows.ts` - Junction table entries
- `index.ts` - Run all seeds in order

**Seeding Strategy:**

**Step 1: Agents**

```typescript
// Analyst agent (for Phase 1 workflows)
await db.insert(agents).values({
  name: "analyst",
  displayName: "Business Analyst",
  description: "Strategic Business Analyst + Requirements Expert",
  role: "Strategic Business Analyst + Requirements Expert",
  llmProvider: "anthropic",
  llmModel: "claude-sonnet-4-20250514",
  llmTemperature: "0.7",
  tools: [],
  mcpServers: [],
  color: "#3B82F6",
  avatar: "📊",
  active: true,
});
```

**Step 2: Workflow Paths**

```typescript
// greenfield-level-3
await db.insert(workflowPaths).values({
  id: "path-greenfield-3",
  name: "greenfield-level-3",
  projectType: "software",
  projectLevel: "3",
  fieldType: "greenfield",
  description: "Complex system - subsystems, integrations, architectural decisions",
});
```

**Step 3: Workflows**

```typescript
// brainstorm-project
await db.insert(workflows).values({
  id: "wf-brainstorm-project",
  name: "brainstorm-project",
  displayName: "Brainstorm Project",
  agentId: "agent-analyst-uuid",
  pattern: "sequential-dependencies",
  outputArtifactType: "markdown",
  outputArtifactTemplateId: null,
});

// research
await db.insert(workflows).values({
  id: "wf-research",
  name: "research",
  displayName: "Research Workflow",
  agentId: "agent-analyst-uuid",
  pattern: "structured-exploration",
  outputArtifactType: "markdown",
  outputArtifactTemplateId: null,
});
```

**Step 4: Workflow Steps**

Use the **EXACT mappings** from previous session:

**brainstorm-project steps:**

- Step 1: validate-readiness (invoke-workflow)
- Step 2: check-status-exists (check-condition)
- Step 3: set-standalone-mode (execute-action)
- Step 4: load-project-context (load-context) ← **inline context!**
- Step 5: invoke-cis-brainstorming (invoke-workflow)
- Step 6: save-brainstorming-artifact (execute-action)
- Step 7: check-standalone-mode (check-condition)
- Step 8: update-workflow-status (invoke-workflow)
- Step 9a: display-tracked-complete (display-output)
- Step 9b: display-standalone-complete (display-output)

**research steps:**

- Step 1: validate-readiness (invoke-workflow)
- Step 2: check-status-exists (check-condition)
- Step 3: set-standalone-mode (execute-action)
- Step 4: select-research-type (ask-user) ← **select with 6 options!**
- Step 5: route-research-type (check-condition) ← **6-way branch!**
- Step 6a-6f: execute-\*-research (invoke-workflow) × 6
- Step 7: save-research-artifact (execute-action)
- Step 8: check-standalone-mode (check-condition)
- Step 9: update-workflow-status (invoke-workflow)
- Step 10a: display-tracked-complete (display-output)
- Step 10b: display-standalone-complete (display-output)

**Step 5: Workflow Step Branches**

**brainstorm-project branches:**

- Step 2 → true/false (2 branches)
- Step 7 → true/false (2 branches)

**research branches:**

- Step 2 → true/false (2 branches)
- Step 5 → 1/2/3/4/5/6 (6 branches) ← **N-way branching!**
- Step 8 → true/false (2 branches)

**Step 6: Workflow Path Workflows**

```typescript
// Phase 1 workflows for greenfield-level-3
await db.insert(workflowPathWorkflows).values([
  {
    workflowPathId: "path-greenfield-3",
    workflowId: "wf-brainstorm-project",
    phase: 1,
    sequenceOrder: 1,
    isOptional: true,
    isRecommended: false,
  },
  {
    workflowPathId: "path-greenfield-3",
    workflowId: "wf-research",
    phase: 1,
    sequenceOrder: 2,
    isOptional: true,
    isRecommended: false,
  },
  {
    workflowPathId: "path-greenfield-3",
    workflowId: "wf-product-brief",
    phase: 1,
    sequenceOrder: 3,
    isOptional: false,
    isRecommended: true,
  },
]);
```

**Success Criteria:**

- ✅ All agents seeded
- ✅ greenfield-level-3 path seeded
- ✅ brainstorm-project workflow seeded (10 steps)
- ✅ research workflow seeded (16 steps)
- ✅ All branches seeded (including 6-way branch!)
- ✅ Junction table entries seeded

---

### Task 3: Test Workflow Execution (1-2 hours)

**Manual Testing:**

1. **Create test project:**

```typescript
const project = await db.insert(projects).values({
  name: "test-chiron",
  path: "/test/chiron",
  level: "3",
  type: "software",
  fieldType: "greenfield",
});

const projectState = await db.insert(projectState).values({
  projectId: project.id,
  workflowPathId: "path-greenfield-3",
  currentPhase: 1,
  completedWorkflows: [],
});
```

2. **Test brainstorm-project execution:**

```typescript
// Create workflow execution
const execution = await db.insert(workflowExecutions).values({
  projectId: project.id,
  workflowId: "wf-brainstorm-project",
  agentId: "agent-analyst-uuid",
  status: "active",
  currentStepId: "step-1-validate",
  variables: {},
});

// Simulate step execution:
// - Step 1: validate → set variables { status_exists: true, project_id: "..." }
// - Step 2: check-condition → read status_exists, route to step 4
// - Step 4: load-context → set variables { project_context: "..." }
// - etc.
```

3. **Verify branching:**

- Test boolean branches (true/false)
- Test select branches (6-way router in research)
- Verify step links work correctly

**Success Criteria:**

- ✅ Can create workflow execution
- ✅ Can navigate through steps
- ✅ Variables update correctly
- ✅ Branching logic works
- ✅ Artifact tracking works

---

## Key Reminders for Implementation

### 1. Context is INLINE, not file-based!

**CORRECT:**

```typescript
{
  stepType: "load-context",
  config: {
    contextSource: "inline",
    contextContent: "Your actual context content here...",
    storeAs: "project_context"
  }
}
```

**WRONG:**

```typescript
{
  contextSource: "file", // ❌ NO!
  contextPath: "{installed_path}/context.md" // ❌ NO!
}
```

---

### 2. All Runtime Data in `workflow_executions.variables`

**Pattern:**

```typescript
// Step outputs:
await db.update(workflowExecutions).set({
  variables: {
    ...currentVariables,
    [config.storeAs]: outputValue,
  },
});

// Step inputs:
const value = execution.variables[config.evaluateVariable];
```

---

### 3. Branching via Table Lookup

**Execution:**

```typescript
// Get current step's branches
const branches = await db
  .select()
  .from(workflowStepBranches)
  .where(eq(workflowStepBranches.stepId, currentStepId));

// Match branch key
const userInput = execution.variables[step.config.evaluateVariable]; // e.g., "1"
const branch = branches.find((b) => b.branchKey === userInput);

// Jump to next step
currentStepId = branch.nextStepId;
```

---

### 4. No Metadata Files!

**Artifacts = actual files tracked in database:**

- File generated: `/docs/brainstorming-session-2025-11-05.md`
- Database row: `project_artifacts` table
- **NO** separate metadata file!

**Progress tracking = database records:**

- Current state: `project_state` table
- **NO** `bmm-workflow-status.md` file!

---

## Expected Outcomes

By end of session:

1. ✅ Complete schema implemented in Drizzle
2. ✅ Phase 1 workflows seeded (brainstorm-project, research)
3. ✅ Can execute workflows end-to-end (manual testing)
4. ✅ Branching patterns validated (boolean, select)
5. ✅ Artifact tracking works

**Ready for Next Session:**

- Map product-brief workflow (interactive vs YOLO modes)
- Build workflow execution engine (Mastra integration)
- Create UI for workflow interaction

---

## Questions to Address

### Schema Questions

- Do we need workflow_templates table now? (Deferred to Epic 2?)
- Should git_worktrees be added now? (Deferred to Epic 4+?)

### Seeding Questions

- Should we seed ALL agents now or just analyst? (Start with analyst only)
- Should we seed other workflow paths (level 0-4)? (Start with level 3 only)

### Testing Questions

- Do we need automated tests? (Manual testing first, then add tests)
- Should we build execution engine now? (Next session after product-brief mapping)

---

## Files Created This Session

1. `docs/architecture/database-schema-final.md` - Complete schema specification
2. `docs/NEXT-SESSION-2025-11-06.md` - This file (session guide)

**Files Modified:**

- None (schema not yet implemented)

**Files Pending:**

- `packages/db/src/schema/*.ts` - Schema implementation
- `packages/db/src/seed/*.ts` - Seed data
- `docs/architecture/workflow-mappings/brainstorm-project.md` - Optional documentation
- `docs/architecture/workflow-mappings/research.md` - Optional documentation

---

## Session Summary

**What We Achieved:**

- ✅ Complete database schema (16 tables - updated after gate check)
- ✅ N-way branching pattern designed
- ✅ Variable storage pattern established
- ✅ Context inline pattern confirmed
- ✅ brainstorm-project workflow mapped (10 steps)
- ✅ research workflow mapped (16 steps, 6-way branch)
- ✅ **Gate check validation** (solutioning-gate-check workflow)
- ✅ **Critical gap identified and fixed:** app_config table for API keys
- ✅ **FR034 compliance:** gitCommitHash column added to project_artifacts
- ✅ **Story 1.1 acceptance criteria updated:** 11 → 16 tables documented

**Gate Check Results:**

- **Readiness Score:** 9.8/10 (after fixes)
- **Status:** ✅ READY FOR IMPLEMENTATION
- **Validation:** 100% alignment with architectural decisions #33-#37
- **Report:** docs/implementation-readiness-report-2025-11-05.md

**Schema Changes (2025-11-05 Gate Check):**

1. **Added:** `app_config` table (OpenRouter/Anthropic/OpenAI API key storage)
   - Singleton pattern (one row)
   - Encryption required (see security notes)
   - Required for first-time setup (Story 1.4)
2. **Enhanced:** `project_artifacts.gitCommitHash` column (type-safe git tracking)
3. **Updated:** Story 1.1 acceptance criteria in epics.md

**What's Next:**

- Implement schema in Drizzle ORM (16 tables)
- Seed Phase 1 workflows
- Test workflow execution manually
- Map product-brief workflow (next session)
- Implement API key encryption (Story 1.4)

---

_Session ended: 2025-11-05_
_Next session ready: 2025-11-06_
_Schema validated and ready for implementation_
