# Epic 2 Readiness Checklist

**Date**: December 1, 2025  
**Epic**: Artifact Workbench (Brainstorming Focus)  
**Duration**: 2 weeks (6 stories)  
**Status**: ⚠️ PARTIALLY READY - Critical gaps identified

---

## Executive Summary

### ✅ What's Ready

- Database foundation (16 tables)
- Workflow execution engine
- Mastra + Ax integration
- Tool types: ax-generation, update-variable
- Step types: ask-user-chat, execute-action, display-output
- Approval/rejection system with timeline pattern
- Variable resolution with extractFrom pattern
- File/git operations in execute-action

### ❌ What's Missing (Blockers)

1. **invoke-workflow step type** - Required for Story 2.3 (technique execution)
2. **metadata column in workflows table** - Required for artifact templates
3. **Kanban UI component** - Required for Story 2.4
4. **Editable Form component** - Required for Story 2.5
5. **Artifact Workbench shell** - Required for Story 2.2

### ⚠️ What Needs Clarification

- Should we remove `module`, `agentId`, `initializerType` from workflows table?
- How does artifact template system work?
- What's the full pattern for child workflow invocation?

---

## Story-by-Story Analysis

### Story 2.1: Project Dashboard & Schema Foundation (2 days)

**Requirements**:

- [ ] Update workflows table (add metadata, remove fields?)
- [ ] Seed brainstorming workflow shell
- [ ] Dashboard UI showing Phase 0 status
- [ ] Routing logic using workflow_paths
- [ ] Context passing to workflow engine

**Readiness**: ⚠️ PARTIALLY READY

- ✅ workflow_paths exists and working
- ✅ Dashboard routing pattern can reuse project creation flow
- ❌ `metadata` column missing
- ⚠️ Unclear if we should remove `module`/`agentId`/`initializerType`

**Recommendations**:

1. Add `metadata` JSONB column to workflows table
2. Keep existing fields (`module`, `agentId`, etc.) for now - don't break workflow-init-new
3. Update Epic 2 doc to reflect actual schema approach

**Estimated Actual Time**: 2 days ✅ (matches estimate)

---

### Story 2.2: Workbench Shell & Setup (Step 1) (3 days)

**Requirements**:

- [ ] Seed Step 1 with tools: set_session_topic, set_stated_goals, select_techniques
- [ ] Implement split-pane layout (Chat + Preview)
- [ ] Chat interface (can reuse from workflow-init-new)
- [ ] Blocking inputs for topic/goals
- [ ] Validation against configuration doc

**Readiness**: ✅ MOSTLY READY

- ✅ Can use `update-variable` for set_session_topic, set_stated_goals
- ✅ Can use `ax-generation` for select_techniques
- ✅ Chat interface exists (ask-user-chat-step)
- ❌ Split-pane Workbench layout NEW (needs implementation)
- ❌ Live artifact preview NEW (needs implementation)

**Recommendations**:

1. Build split-pane layout component (1 day)
2. Reuse ask-user-chat-step component for chat side
3. Build markdown preview component for artifact side
4. Use existing tool patterns (update-variable, ax-generation)

**Estimated Actual Time**: 3-4 days (1 day extra for Workbench layout)

---

### Story 2.3: Execution Loop & Child Workflows (Step 2) (3 days)

**Requirements**:

- [ ] Seed 10 technique workflows (SCAMPER, Six Hats, etc.)
- [ ] Seed Step 2 with invoke-workflow logic
- [ ] Action List UI for technique selection
- [ ] Child workflow modal/dialog
- [ ] Data aggregation into captured_ideas

**Readiness**: ❌ BLOCKED

- ❌ **CRITICAL**: invoke-workflow step type NOT IMPLEMENTED
- ❌ Technique workflows not seeded
- ❌ Child workflow UI pattern not defined
- ✅ Data aggregation pattern exists (execution variables)

**Recommendations**:

1. **MUST DO FIRST**: Implement invoke-workflow step handler (2 days)
   - Execute child workflow with parameter passing
   - Wait for completion (blocking mode)
   - Merge outputs into parent variables
2. Seed technique workflows (1 day)
3. Build child workflow modal (1 day)

**Estimated Actual Time**: 6 days (double original - 3 days for missing invoke-workflow)

---

### Story 2.4: Convergence & Kanban (Step 3 & 4) (3 days)

**Requirements**:

- [ ] Seed Step 3 with organize_ideas tool
- [ ] Seed Step 4 (Analysis Loop) placeholder
- [ ] Kanban drag-and-drop UI
- [ ] State sync with backend
- [ ] Ideas flow from Step 2 to Step 3

**Readiness**: ⚠️ PARTIALLY READY

- ✅ Can use `ax-generation` for organize_ideas classification
- ✅ State sync pattern exists (approval flow)
- ❌ Kanban UI component NEW (needs implementation)
- ✅ Data flow pattern exists (variables between steps)

**Recommendations**:

1. Build Kanban board component (2 days)
   - Drag-and-drop with react-beautiful-dnd or similar
   - Works with ax-generation classification outputs
   - Updates backend on card movement
2. Use existing approval pattern for AI suggestions
3. Seed organize_ideas tool config (1 day)

**Estimated Actual Time**: 4 days (1 day extra for Kanban implementation)

---

### Story 2.5: Planning & Forms (Step 5) (3 days)

**Requirements**:

- [ ] Seed Step 5 with create_action_plan tool
- [ ] Editable Form component
- [ ] AI generates initial plan
- [ ] User refines and locks

**Readiness**: ⚠️ PARTIALLY READY

- ✅ Can use `ax-generation` for AI drafting
- ✅ Approval pattern for user refinement
- ❌ Editable Form component NEW (needs implementation)
- ✅ selection-with-custom-card pattern can be adapted

**Recommendations**:

1. Build Editable Form component (2 days)
   - Similar to selection-with-custom-card
   - Multiple fields, not just one value
   - Lock/unlock pattern
2. Reuse ax-generation tool
3. Seed create_action_plan config (1 day)

**Estimated Actual Time**: 4 days (1 day extra for Form implementation)

---

### Story 2.6: Artifact Rendering & Persistence (Output) (2 days)

**Requirements**:

- [ ] Seed Step 6 (Reflection) and Step 7 (Completion/Commit)
- [ ] Live markdown preview
- [ ] Git commit via execute-action
- [ ] Session cleanup

**Readiness**: ✅ READY

- ✅ execute-action step type works (file/write, git/commit)
- ✅ Variable resolution in templates
- ✅ Markdown rendering (can use react-markdown)
- ✅ display-output step type for success message

**Recommendations**:

1. Reuse existing execute-action for git commit
2. Use Handlebars + variables for template rendering
3. Build simple markdown preview (react-markdown)

**Estimated Actual Time**: 2 days ✅ (matches estimate)

---

## Updated Timeline

**Original Estimate**: 2 weeks (10 working days)  
**Realistic Estimate**: 3-4 weeks (15-20 working days)

**Breakdown**:

- Story 2.1: 2 days
- Story 2.2: 4 days (split-pane workbench)
- Story 2.3: 6 days (invoke-workflow implementation)
- Story 2.4: 4 days (Kanban UI)
- Story 2.5: 4 days (Editable Form)
- Story 2.6: 2 days
- **Total**: 22 days (4.4 weeks)

---

## Critical Path Actions

### BEFORE Starting Epic 2:

1. **Implement invoke-workflow Step Type** (2 days)
   - File: `packages/api/src/services/workflow-engine/step-handlers/invoke-workflow-handler.ts`
   - Spec: Load child workflow, execute with parameters, merge outputs
   - Test: Create simple test workflow and invoke it

2. **Add metadata Column** (1 hour)
   - Migration: `ALTER TABLE workflows ADD COLUMN metadata JSONB`
   - Update schema.ts
   - Re-seed database

3. **Update Documentation** (2 hours) - ALREADY DONE
   - ✅ CANONICAL-WORKFLOW-SCHEMA.md
   - ✅ tool-types-reference.md
   - ✅ dynamic-tool-options.md (extractFrom)

**Total Pre-Epic 2 Work**: 2.5 days

### DURING Epic 2:

4. **Build UI Components** (parallel to stories)
   - Split-pane Workbench (Story 2.2)
   - Kanban Board (Story 2.4)
   - Editable Form (Story 2.5)

5. **Seed Workflows** (as needed)
   - Brainstorming workflow shell (Story 2.1)
   - Technique workflows (Story 2.3)
   - Each step configuration (Stories 2.2-2.6)

---

## Recommended Approach

### Option A: Delay Epic 2 Start (Recommended)

1. Spend 2.5 days completing prerequisites
2. Start Epic 2 with full foundation
3. Realistic 3-week timeline
4. Lower risk, cleaner implementation

### Option B: Start Epic 2, Build Missing Pieces

1. Start Story 2.1 immediately
2. Build invoke-workflow during Story 2.3
3. Accept timeline slip to 3-4 weeks
4. Higher risk, potential blockers

### Option C: Reduce Epic 2 Scope

1. Defer Stories 2.3-2.4 (child workflows + Kanban)
2. Focus on Stories 2.1, 2.2, 2.5, 2.6
3. Deliver basic artifact workbench
4. Add advanced features in Epic 2.5

---

## Success Criteria (Updated)

**Technical**:

- [ ] invoke-workflow step type working
- [ ] Split-pane Workbench component functional
- [ ] Kanban and Form components reusable
- [ ] All 6 stories completed (or scoped-down version)

**Thesis Validation**:

- [ ] Visual UX demonstrates superiority over CLI
- [ ] Artifact-driven workflow shows clear value
- [ ] Real-time collaboration works smoothly

**Documentation**:

- [x] Architecture docs updated
- [x] PRD/Epic alignment documented
- [ ] Component patterns documented (in Epic 2)

---

**Recommendation**: Choose Option A - Spend 2.5 days on prerequisites, then start Epic 2 with 3-week timeline.
