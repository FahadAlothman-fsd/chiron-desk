# Architecture Updates - December 2025

**Date**: December 1, 2025  
**Context**: Last 6 commits (Nov 29 - Dec 1)  
**Status**: Needs to be integrated into official architecture docs

---

## New Architectural Patterns Implemented

### 1. **Tool Type: `update-variable`** (Commit: 1d59fe1e)

**What**: Lightweight tool type for direct variable updates without AI generation

**Why**: Not all tool outputs need LLM generation - some are simple user inputs

**Schema**:

```typescript
{
  toolType: "update-variable",
  targetVariable: "project_name",  // Where to store the value
  description: "...",
  requiredVariables: [],
  // NO axSignature needed
}
```

**Example**: `update_description` tool (replaces old `update_summary`)

- User provides project description in chat
- Agent stores it directly in `project_description` variable
- No LLM generation, no approval gates
- Simple, fast, direct

**Handler Location**: `ask-user-chat-handler.ts` - detects `update-variable` type and saves to `targetVariable`

**Documentation Gap**: Not documented in `dynamic-tool-options.md` or architecture docs

---

### 2. **Generic Selection Component** (Commit: cb5d49fa)

**What**: Refactored project name selector into reusable `SelectionWithCustomCard` component

**Pattern**: "Select from AI suggestions OR provide custom value"

**Use Cases**:

- Project names (current)
- File paths
- API endpoint names
- Directory locations
- Any scenario where AI suggests options but user can override

**Props**:

```typescript
{
  title: string;
  suggestions: Array<{
    value: string;
    label: string;
    reasoning?: string;
    recommended?: boolean;
  }>;
  validation?: {
    minLength?: number;
    maxLength?: number;
    regex?: RegExp;
    customValidator?: (value: string) => string | null;
  };
  labels: {
    radioLabel: string;
    inputLabel: string;
    inputPlaceholder: string;
  };
}
```

**Documentation Gap**: Not in UX docs or component architecture

---

### 3. **Timeline-Based Rejection System** (Commit: 7ce092a0)

**What**: Complete rework of how rejections work

**Old Approach** (removed):

- Update approval card in-place
- Complex system instruction injection
- Messy state management

**New Approach** (current):

- **Timeline Pattern**: Rejected cards become final read-only state (red border)
- **New card appears** when agent regenerates
- **Rejection history** stored in `approval_states.{tool}.rejection_history[]`
- **User feedback** saved as chat messages with metadata: `{ type: 'rejection_feedback', toolName, rejectedAt }`
- **Forced regeneration** using `toolChoice: { type: 'tool', toolName: 'specific_tool' }`

**Data Structure**:

```typescript
approval_states: {
  [toolName]: {
    status: "approved" | "pending" | "rejected" | "regenerating",
    value: any,
    rejection_history?: Array<{
      feedback: string;
      rejectedAt: string;
      previousOutput?: string | object;
    }>,
    rejection_count?: number;
  }
}
```

**UI Patterns**:

- ✅ Green border = approved
- 🔵 Blue border = regenerating (with spinner)
- 🔴 Red border = rejected (final, read-only)
- ⚪ White border = pending approval
- 🔄 Amber indicator = rejection feedback message

**Documentation Gap**: `REJECTION-SYSTEM-FINAL.md` exists but not integrated into architecture docs

---

### 4. **Action Preview & Execute-Action Step** (Commit: 90214768)

**What**: New step type for executing file/git/database operations with user preview

**Step Type**: `execute-action`

**Actions Supported**:

```typescript
{
  type: "file/mkdir",
  path: "{{project_path}}",  // Variable resolution
}

{
  type: "file/write",
  path: "{{project_path}}/README.md",
  content: "# {{project_name}}\n..."  // Template with variables
}

{
  type: "git/init",
  path: "{{project_path}}"
}

{
  type: "git/commit",
  message: "Initial commit: {{project_name}}",
  files: ["README.md"]
}

{
  type: "database/update",
  table: "projects",
  operation: "update",
  data: {
    workflow_path_id: "{{selected_workflow_path_id}}"
  }
}
```

**Preview Mode**:

- Set `requiresUserConfirmation: true` in step config
- Shows all actions with icons before execution
- User clicks "Continue" to execute
- Prevents accidental file/git operations

**Variable Resolution**:

- All paths, content, messages support `{{variable}}` syntax
- Resolved from `execution.variables` before execution

**Documentation Gap**: Not in step types architecture or workflow schema docs

---

### 5. **AX Tool Features: `selectFields`, `classesFrom`, `extractFrom`** (Commits: 90214768, 6c864856)

#### A. **`selectFields`** - Token Optimization

**What**: Filter JSON/JSON[] data before passing to LLM

**Why**: Large objects waste tokens; LLM only needs specific fields

**Example**:

```typescript
{
  name: "workflow_paths",
  type: "json",
  source: "variable",
  selectFields: ["id", "displayName", "description", "tags"],  // Only send these fields
}
```

**Runtime**:

- Handler filters data: `data.map(item => pick(item, selectFields))`
- Generates inline schema: `"Array of {id, displayName, description, tags}"`
- LLM sees clean, focused data

**Benefit**: 50-80% token reduction for large option arrays

---

#### B. **`classesFrom`** - Field-Level Class Sources

**What**: Configure class source at field level instead of tool level

**Old Way**:

```typescript
{
  toolType: "ax-generation",
  classSource: "workflow_paths",  // Tool-level
  output: [
    { name: "selected_path_id", type: "class" }
  ]
}
```

**New Way**:

```typescript
{
  toolType: "ax-generation",
  output: [
    {
      name: "selected_path_id",
      type: "class",
      classesFrom: {
        source: "workflow_path_options",  // Field-level
        field: "id"
      }
    }
  ]
}
```

**Why**: More flexible - different outputs can have different class sources

---

#### C. **`extractFrom`** - Derived Variables (THE BIG ONE)

**What**: Automatically extract related fields from selected options without LLM generation

**Problem**:

- User selects workflow path by ID: `"uuid-123"`
- We also need the human-readable name: `"BMad Method"`
- LLM shouldn't generate this - it's deterministic lookup

**Solution**:

```typescript
{
  name: "selected_workflow_path_name",
  type: "string",
  extractFrom: {
    source: "workflow_path_options",      // Variable containing options array
    matchField: "id",                       // Field to match on
    matchValue: "selected_workflow_path_id", // Variable containing selected value
    selectField: "displayName"              // Field to extract
  }
}
```

**Flow**:

1. User selects option → `selected_workflow_path_id = "uuid-123"`
2. Approval handler detects `extractFrom` config
3. Looks up in `workflow_path_options.find(opt => opt.id === "uuid-123")`
4. Extracts: `displayName = "BMad Method"`
5. Stores in `approval_states.{tool}.derived_values.selected_workflow_path_name`
6. Merges into `execution.variables.selected_workflow_path_name`
7. Available for template resolution: `{{selected_workflow_path_name}}`

**Storage Structure**:

```json
{
  "approval_states": {
    "select_workflow_path": {
      "value": {
        "selected_workflow_path_id": "uuid-123"
      },
      "derived_values": {
        "selected_workflow_path_name": "BMad Method"
      }
    }
  }
}
```

**Benefits**:

- ✅ No LLM generation needed for deterministic data
- ✅ Human-readable values in templates/display
- ✅ Reduces hallucination risk
- ✅ Automatic - no manual mapping

**Implementation**:

- `ax-generation-tool.ts`: `extractDeterministicFields()` function (exported)
- `workflows.ts`: `approveToolCall()` and `approveToolOutput()` mutations
- Both approval handlers compute and store derived values

**Documentation Gap**: Mentioned in commit but not in `dynamic-tool-options.md` or tool architecture

---

## Files Changed Summary

| File                                                                                | New Concepts                                                            |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/api/src/routers/workflows.ts`                                             | update-variable detection, derived values computation, rejection system |
| `packages/api/src/services/workflow-engine/tools/ax-generation-tool.ts`             | selectFields, classesFrom, extractFrom, exportable extractor            |
| `packages/api/src/services/workflow-engine/step-handlers/execute-action-handler.ts` | file ops, git ops, variable resolution, preview mode                    |
| `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`  | update-variable handling, rejection forcing                             |
| `apps/web/src/components/workflows/selection-with-custom-card.tsx`                  | Generic selection component                                             |
| `apps/web/src/components/workflows/steps/execute-action-step.tsx`                   | Action preview UI                                                       |
| `apps/web/src/components/workflows/approval-card.tsx`                               | Timeline rejection UI, regenerating state                               |
| `packages/scripts/src/seeds/workflow-init-new.ts`                                   | All new features in use                                                 |

---

## Documentation Gaps

### Critical (Needed for Next Story):

1. **Tool Types Reference**
   - Location: `/docs/architecture/tool-types.md` (CREATE NEW)
   - Content: update-variable, ax-generation, execute-action (with examples)

2. **Derived Variables Pattern**
   - Location: `/docs/architecture/dynamic-tool-options.md` (UPDATE)
   - Content: Add extractFrom section with flow diagrams

3. **Rejection System Architecture**
   - Location: `/docs/architecture/approval-rejection-system.md` (CREATE NEW)
   - Content: Timeline pattern, state management, forced regeneration

4. **Step Types Reference**
   - Location: `/docs/architecture/step-types.md` (CREATE NEW)
   - Content: ask-user-chat, display-input, execute-action, display-output

### Nice to Have:

5. **Component Patterns**
   - Location: `/docs/design/component-patterns.md` (CREATE NEW)
   - Content: Generic selection, approval cards, action preview

6. **Variable Resolution**
   - Location: `/docs/architecture/variable-resolution.md` (CREATE NEW)
   - Content: Template syntax, resolution order, derived values

---

## Impact on Next Stories

### Brainstorm Workflow (Epic 2):

**What We Can Reuse**:

1. ✅ **update-variable** - For user inputs (brainstorm topic, technique selection)
2. ✅ **execute-action** - For file operations (save artifacts)
3. ✅ **extractFrom** - For technique metadata extraction
4. ✅ **Rejection system** - For artifact quality feedback
5. ✅ **Generic selection** - For technique picker

**Example Workflow**:

```typescript
// Step 1: Get brainstorm topic (update-variable)
{
  stepType: "ask-user-chat",
  tools: [{
    toolType: "update-variable",
    targetVariable: "brainstorm_topic"
  }]
}

// Step 2: Select technique (ax-generation with extractFrom)
{
  stepType: "ask-user-chat",
  tools: [{
    toolType: "ax-generation",
    output: [
      {
        name: "selected_technique_id",
        type: "class",
        classesFrom: { source: "techniques", field: "id" }
      },
      {
        name: "selected_technique_name",
        type: "string",
        extractFrom: {
          source: "technique_options",
          matchField: "id",
          matchValue: "selected_technique_id",
          selectField: "name"
        }
      }
    ]
  }]
}

// Step 3: Generate ideas (Mastra parallel workflow)
{
  stepType: "execute-workflow",
  workflowType: "mastra-parallel",
  tasks: [/* generate with multiple agents */]
}

// Step 4: Save artifacts (execute-action)
{
  stepType: "execute-action",
  actions: [
    { type: "file/mkdir", path: "{{project_path}}/artifacts" },
    { type: "file/write", path: "{{project_path}}/artifacts/brainstorm-{{timestamp}}.md", content: "..." }
  ]
}
```

---

## Recommendations

### Before Starting Epic 2:

1. **Document Tool Types** - Create reference guide with all 3 types
2. **Document extractFrom** - Add to dynamic-tool-options.md with examples
3. **Document Step Types** - Clarify execute-action vs ask-user-chat
4. **Update Workflow Schema** - Add execute-action to canonical schema

### Consider:

1. **Rename `update-variable`** to `capture-input`? (more descriptive)
2. **Add validation** to extractFrom (what if matchValue not found?)
3. **Cache derived values** (don't recompute on every variable access)
4. **Extend execute-action** with more operations (copy, move, delete files)

---

**Next Action**: Review this with team and decide which docs to update before Epic 2 kickoff

---

## Schema vs Implementation Differences

### Execute-Action Step Structure

**Schema Doc Says:**

```typescript
{
  type: "execute-action",
  action: {  // SINGLE action
    type: "database",
    operation: "update",
    table: "projects"
  }
}
```

**Actual Implementation:**

```typescript
{
  stepType: "execute-action",
  requiresUserConfirmation: true,  // NEW: Preview feature
  executionMode: "sequential",     // NEW: parallel or sequential
  actions: [  // ARRAY of actions
    { type: "file", config: { operation: "mkdir", path: "..." } },
    { type: "git", config: { operation: "init", path: "..." } },
    { type: "file", config: { operation: "write", path: "...", content: "..." } },
    { type: "database", config: { table: "projects", operation: "update", data: {...} } }
  ]
}
```

**Key Differences:**

1. ✅ **Multiple actions per step** (not single action)
2. ✅ **Preview mode** via `requiresUserConfirmation`
3. ✅ **Execution modes**: sequential or parallel
4. ✅ **Nested config**: `{ type, config }` instead of flat structure
5. ✅ **Variable resolution** in all fields (paths, content, messages)

**Action Types Implemented:**

- `file` with operations: `mkdir`, `write` (read/delete not yet)
- `git` with operations: `init`, `commit` (status/branch not yet)
- `database` with operation: `update` (query/insert/delete not yet)
- `set-variable` (as documented)

**Not Yet Implemented from Schema:**

- `scan-codebase` action
- File operations: `read`, `delete`, `exists`
- Git operations: `status`, `branch`
- Database operations: `query`, `insert`, `delete`

---

## Tool Input Schema Clarification

### Current State:

**ax-generation tools:**

```typescript
inputSchema: z.object({}); // NO agent inputs
```

- Agent calls tool with no parameters
- Tool resolves ALL inputs from execution context
- Inputs configured via `axSignature.input` with `source` field

**update-variable tools:**

```typescript
inputSchema: z.object({
  value: valueSchema, // Agent provides value
  reasoning: z.string().optional(), // Agent can explain
});
```

- Agent extracts value from conversation
- Agent passes value when calling tool

### Future Enhancement:

**ax-generation with agent inputs:**

```typescript
inputSchema: z.object({
  additional_context: z.string().optional(), // Agent provides dynamic context
  user_preferences: z.string().optional(), // Agent extracts from latest message
});
```

This would allow agents to pass dynamic, message-specific context to Ax signatures beyond pre-stored variables.

**Use Case Example:**

```typescript
// User: "I want a healthcare app but focusing on scheduling"
// Agent calls: generate_summary({
//   additional_context: "User emphasized scheduling functionality"
// })
// Ax signature gets both project_description (from variables)
// AND additional_context (from agent's current understanding)
```

---

## Critical Documentation Tasks Before Epic 2

### Must Have:

1. **Update CANONICAL-WORKFLOW-SCHEMA.md**
   - Fix execute-action to support multiple actions
   - Add requiresUserConfirmation and executionMode
   - Document actual action structure with config nesting

2. **Create Tool Types Reference**
   - Document: ax-generation, update-variable, (future: database-query, custom)
   - Show input schema patterns
   - Explain when to use each type

3. **Update dynamic-tool-options.md**
   - Add extractFrom pattern with full flow
   - Add selectFields for token optimization
   - Add classesFrom for field-level class sources

### Should Have:

4. **Create Step Types Reference**
   - ask-user-chat (with tools)
   - display-input (user forms)
   - execute-action (system operations)
   - display-output (success messages)
   - invoke-workflow (future)

5. **Document Rejection System**
   - Timeline pattern
   - State management
   - Forced regeneration with toolChoice

---

## PRD & Epic Alignment Analysis

### What PRD Says vs What We Built

#### Workflow Execution (FR001-FR005)

**PRD Says:**

- FR002: "Execute workflows following BMAD's workflow.xml engine rules (steps, actions, templates, elicitation)"
- FR004: "Resolve variables using 4-level precedence (config_source, system-generated, user input, defaults)"

**What We Built:**

- ✅ Steps execute from database (not XML)
- ✅ Variable resolution with `{{variable}}` syntax
- ⚠️ **DIFFERENT**: Only 2-level precedence (execution variables, system variables) - not 4-level
- ⚠️ **NEW**: Added derived_values for extractFrom pattern (not in PRD)
- ⚠️ **NEW**: Added approval_states for human-in-the-loop (not explicitly in PRD)

**Recommendation**: Update PRD FR004 to reflect actual 3-level precedence:

1. Execution variables (includes approved values)
2. Derived values (from extractFrom)
3. System variables (user_id, current_user_id)

---

#### LLM Integration

**PRD/Epic 1 Says:**

- "LLM integration (OpenRouter) with models selection page"
- FR009: "Agent-capability mappings stored in database"

**What We Built:**

- ✅ OpenRouter integration
- ✅ User API key management
- ✅ Model selection per execution
- ⚠️ **DIFFERENT**: Agents use Mastra framework (not direct OpenRouter)
- ⚠️ **DIFFERENT**: Tool types (ax-generation, update-variable) instead of generic "LLM generate"
- ✅ **MATCHES**: Approval gates with rejection/regeneration

**Gap**: "5 step type handlers" mentioned in Epic 1

- ✅ ask-user-chat (implemented)
- ✅ execute-action (implemented)
- ✅ display-output (implemented)
- ⚠️ display-input (partially - we use ask-user-chat instead)
- ❌ llm-generate (replaced by ax-generation tools)

**Recommendation**: Update Epic 1 deliverables to reflect:

- "4 step types: ask-user-chat, execute-action, display-input, display-output"
- "2 tool types: ax-generation (Ax signatures), update-variable (direct updates)"

---

#### Epic 2: Artifact Workbench

**Epic 2 Says (Story 2.1):**

```
Schema Refactor: Update workflows table:
- ADD: tags (JSONB), metadata (JSONB)
- REMOVE: module, agentId, initializerType, isStandalone, requiresProjectContext
```

**Current Schema:**

```typescript
workflows {
  id, name, displayName,
  module,           // STILL EXISTS (should be removed?)
  agentId,          // STILL EXISTS (should be removed?)
  tags,             // ✅ EXISTS
  metadata,         // ❌ MISSING
  initializerType,  // STILL EXISTS (used in workflow-init-new)
  steps relationship
}
```

**Gap Analysis:**

- ⚠️ `metadata` column not added yet
- ⚠️ `module`, `agentId`, `initializerType` still exist (should they be removed?)
- ✅ `tags` exists (used for workflow path filtering)

**Recommendation for Epic 2**:

- Keep `module` and `agentId` for now (used in workflow-init-new)
- Add `metadata` JSONB column
- OR: Decide to keep current schema and update Epic 2 doc

---

#### Epic 2: Brainstorming Workflow

**Epic 2 Says:**

- Story 2.2: "set_session_topic, set_stated_goals, select_techniques tools"
- Story 2.3: "invoke-workflow logic" for technique execution
- Story 2.4: "Kanban UI for ax-generator pattern"
- Story 2.5: "Editable Form component for ax-generator pattern"

**What We Can Reuse from Epic 1**:

- ✅ `update-variable` tool → perfect for `set_session_topic`, `set_stated_goals`
- ✅ `ax-generation` tool → can be used for `select_techniques` (classification)
- ✅ `execute-action` step → can save artifacts (Story 2.6)
- ⚠️ `invoke-workflow` → NOT IMPLEMENTED YET (Story 2.3 blocker)
- ⚠️ Kanban UI pattern → NEW (needs implementation)
- ⚠️ Editable Form pattern → NEW (needs implementation)

**Epic 2 Readiness**:

- ✅ Foundation ready (database, workflow engine, Mastra)
- ✅ Tool types ready (update-variable, ax-generation)
- ✅ Step types ready (ask-user-chat, execute-action, display-output)
- ❌ invoke-workflow step type MISSING
- ❌ Kanban UI pattern MISSING
- ❌ Editable Form pattern MISSING
- ❌ Split-pane Artifact Workbench MISSING

---

### Critical Gaps for Epic 2

#### 1. Missing Step Type: `invoke-workflow`

**Epic 2 Needs (Story 2.3)**:

```typescript
{
  stepType: "invoke-workflow",
  targetWorkflow: "scamper-technique",
  parameters: {
    topic: "{{session_topic}}",
    goals: "{{stated_goals}}"
  },
  outputVariable: "technique_results"
}
```

**Status**: NOT IMPLEMENTED

**Impact**: Story 2.3 (Execution Loop & Child Workflows) blocked

---

#### 2. Missing UI Patterns

**Needed for Epic 2**:

- **Kanban Board** (Story 2.4) - organize ideas
- **Editable Forms** (Story 2.5) - refine action plan
- **Split-Pane Workbench** (Story 2.2) - chat + artifact preview
- **Action List** (Story 2.3) - technique selection

**Status**: NOT IMPLEMENTED (except selection patterns from Epic 1)

---

#### 3. Artifact Template System

**Epic 2 Says**:

- "Live Preview: Right pane renders Markdown from template.md + session_variables"
- "artifactTemplate referenced in workflow config"

**Current Implementation**:

- ✅ Variable resolution in templates (`{{variable}}`)
- ✅ Handlebars-based rendering
- ❌ Artifact template storage/loading system
- ❌ Live preview component
- ❌ Version tracking

---

### Recommendations Before Epic 2

#### Must Implement:

1. **Add `invoke-workflow` Step Type**
   - Handler: execute child workflow with parameter passing
   - Collect outputs into parent workflow variables
   - Support both blocking and async modes (start with blocking)

2. **Add `metadata` Column to Workflows**
   - Store artifact template references
   - Store workflow-specific configuration
   - Migration: ALTER TABLE workflows ADD COLUMN metadata JSONB

3. **Decide on Schema Changes**
   - Keep or remove `module`, `agentId`, `initializerType`?
   - If keeping: update Epic 2 doc
   - If removing: plan migration strategy

#### Should Implement (or defer to Epic 2 stories):

4. **Kanban UI Component**
   - Reusable drag-and-drop board
   - Works with ax-generation classification outputs
   - State syncing with backend

5. **Editable Form Component**
   - Similar to selection-with-custom-card
   - AI-generated initial values, user refinement
   - Works with ax-generation outputs

6. **Artifact Workbench Shell**
   - Split-pane layout
   - Live markdown preview
   - Chat interface integration

---

### Updated Epic 2 Prerequisites

**Before Starting Epic 2:**

- [x] Database foundation ✅
- [x] Workflow execution engine ✅
- [x] Mastra + Ax integration ✅
- [x] Tool types (ax-generation, update-variable) ✅
- [x] Step types (ask-user-chat, execute-action, display-output) ✅
- [x] Approval/rejection system ✅
- [x] Variable resolution with extractFrom ✅
- [ ] invoke-workflow step type ❌ MISSING
- [ ] Kanban UI component ❌ MISSING (can build in Story 2.4)
- [ ] Editable Form component ❌ MISSING (can build in Story 2.5)
- [ ] Artifact Workbench layout ❌ MISSING (can build in Story 2.2)
- [ ] Metadata column in workflows ❌ MISSING

**Critical Blocker**: `invoke-workflow` must be implemented before Story 2.3

**Risk**: Epic 2 timeline (2 weeks) doesn't account for missing foundation pieces
