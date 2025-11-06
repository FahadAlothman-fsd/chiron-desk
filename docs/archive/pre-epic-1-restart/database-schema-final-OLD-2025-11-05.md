# Chiron Database Schema - Final Design

**Date:** 2025-11-05
**Status:** Ready for Implementation
**Context:** Schema designed through collaborative session mapping BMad greenfield-level-3 workflows to Chiron's execution model

---

## Design Principles

1. **Relational over Document** - Use PostgreSQL strengths (foreign keys, typed columns, joins)
2. **Actions as First-Class Entities** - Not buried in JSONB
3. **Type-Safe Conditionals** - N-way branching with explicit routing table
4. **Context in Config** - Inline context definitions, not file system dependencies
5. **Artifact Tracking** - Database references to generated files (not metadata files)

---

## Complete Table List (16 Tables)

### Core Tables
1. `projects` - Project metadata
2. `project_state` - Current workflow position
3. `workflow_paths` - Workflow sequences for project types
4. `workflow_path_workflows` - Junction table (paths ↔ workflows)

### Workflow Definition Tables
5. `agents` - AI agents (Analyst, PM, Architect, etc.)
6. `workflows` - Workflow definitions
7. `workflow_steps` - Individual steps within workflows
8. `workflow_step_branches` - Conditional routing (N-way branching)
9. `workflow_step_actions` - Actions within steps (sequential/parallel)

### Execution Tables
10. `workflow_executions` - Workflow execution state (runtime)
11. `project_artifacts` - Generated files tracking

### System Configuration Tables
12. `app_config` - Application-wide settings (LLM API keys, preferences)

### Optimization Tables (ax integration)
13. `training_examples` - User corrections for optimization
14. `optimization_runs` - GEPA optimizer results

### Future Tables (Epic 2+)
15. `epic_state` - Epic progress tracking
16. `story_state` - Story progress tracking

---

## Table Schemas

### 1. projects

```typescript
export const projectLevelEnum = pgEnum("project_level", ["0", "1", "2", "3", "4"]);
export const projectTypeEnum = pgEnum("project_type", ["software", "game"]);
export const fieldTypeEnum = pgEnum("field_type", ["greenfield", "brownfield"]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  path: text("path").notNull(), // File system path to project
  level: projectLevelEnum("level").notNull(),
  type: projectTypeEnum("type").notNull(),
  fieldType: fieldTypeEnum("field_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
```

**Indexes:**
```typescript
index("projects_name_idx").on(table.name)
```

---

### 2. project_state

**Purpose:** Track current position in workflow path (NOT file-based metadata!)

```typescript
export const projectState = pgTable("project_state", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),

  // Workflow path reference
  workflowPathId: uuid("workflow_path_id")
    .notNull()
    .references(() => workflowPaths.id),

  // Current position
  currentPhase: integer("current_phase").notNull().default(1), // 1=Analysis, 2=Planning, 3=Solutioning, 4=Implementation
  currentWorkflowId: uuid("current_workflow_id")
    .references(() => workflows.id),

  // Completed workflows (array of workflow IDs)
  completedWorkflows: jsonb("completed_workflows")
    .$type<string[]>()
    .notNull()
    .default([]),

  lastUpdated: timestamp("last_updated").notNull().defaultNow()
});
```

**Key Points:**
- One row per project
- `completedWorkflows` tracks progress (e.g., `["brainstorm-project", "research"]`)
- workflow-status reads/writes to this table (NO FILES!)

---

### 3. workflow_paths

**Purpose:** Define workflow sequences for project types (greenfield-level-3, etc.)

```typescript
export const workflowPaths = pgTable("workflow_paths", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // "greenfield-level-3"
  projectType: projectTypeEnum("project_type").notNull(),
  projectLevel: projectLevelEnum("project_level").notNull(),
  fieldType: fieldTypeEnum("field_type").notNull(),
  description: text("description").notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
```

**Note:** Removed `pathDefinition` JSONB - use relationships via junction table

---

### 4. workflow_path_workflows (Junction Table - NEW!)

**Purpose:** Which workflows belong to which path, in which phase/order

```typescript
export const workflowPathWorkflows = pgTable("workflow_path_workflows", {
  id: uuid("id").primaryKey().defaultRandom(),

  workflowPathId: uuid("workflow_path_id")
    .notNull()
    .references(() => workflowPaths.id, { onDelete: "cascade" }),

  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),

  phase: integer("phase").notNull(), // 1=Analysis, 2=Planning, 3=Solutioning, 4=Implementation
  sequenceOrder: integer("sequence_order").notNull(), // Order within phase

  isOptional: boolean("is_optional").notNull().default(false),
  isRecommended: boolean("is_recommended").notNull().default(false),

  createdAt: timestamp("created_at").notNull().defaultNow()
});
```

**Example Data (greenfield-level-3, Phase 1):**
```sql
INSERT INTO workflow_path_workflows (workflow_path_id, workflow_id, phase, sequence_order, is_optional) VALUES
  ('greenfield-3-uuid', 'brainstorm-project-uuid', 1, 1, true),
  ('greenfield-3-uuid', 'research-uuid', 1, 2, true),
  ('greenfield-3-uuid', 'product-brief-uuid', 1, 3, false); -- recommended but not required
```

---

### 5. agents

```typescript
export const llmProviderEnum = pgEnum("llm_provider", ["anthropic", "openrouter", "openai"]);

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // "analyst", "pm", "architect"
  displayName: text("display_name").notNull(), // "Business Analyst"
  description: text("description").notNull(),
  role: text("role").notNull(),

  // LLM Configuration
  llmProvider: llmProviderEnum("llm_provider").notNull(),
  llmModel: text("llm_model").notNull(),
  llmTemperature: text("llm_temperature"), // Stored as text for precision

  // Agent capabilities
  tools: jsonb("tools").$type<AgentTool[]>(),
  mcpServers: jsonb("mcp_servers").$type<string[]>(),

  // UI styling
  color: text("color"),
  avatar: text("avatar"),

  active: boolean("active").notNull().default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export type AgentTool = {
  name: string;
  description: string;
  parameters: Record<string, any>;
};
```

---

### 6. workflows

```typescript
export const workflowPatternEnum = pgEnum("workflow_pattern", [
  "sequential-dependencies",
  "parallel-independence",
  "structured-exploration",
  "focused-dialogs"
]);

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // "brainstorm-project", "research"
  displayName: text("display_name").notNull(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id),

  pattern: workflowPatternEnum("pattern").notNull(),

  // Output artifact configuration (optional)
  outputArtifactType: text("output_artifact_type"), // "markdown", "json"
  outputArtifactTemplateId: uuid("output_artifact_template_id"), // Future: reference to templates table

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
```

**Note:** Removed `inputs`/`outputs` JSONB - steps define their own I/O

---

### 7. workflow_steps

**Purpose:** Individual steps within a workflow

```typescript
export const stepTypeEnum = pgEnum("step_type", [
  "ask-user",
  "llm-generate",
  "check-condition",
  "approval-checkpoint",
  "execute-action",
  "invoke-workflow",
  "display-output",
  "load-context" // NEW!
]);

export const workflowSteps = pgTable("workflow_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),

  stepNumber: integer("step_number").notNull(),
  stepType: stepTypeEnum("step_type").notNull(),
  stepId: text("step_id").notNull(), // "validate-readiness", "check-status"

  title: text("title").notNull(),
  description: text("description"),

  // Type-specific configuration (typed per stepType)
  config: jsonb("config").$type<StepConfig>().notNull(),

  // Next step (null if routing via branches)
  nextStepId: uuid("next_step_id").references(() => workflowSteps.id),

  createdAt: timestamp("created_at").notNull().defaultNow()
});
```

**Indexes:**
```typescript
index("workflow_steps_workflow_id_idx").on(table.workflowId),
index("workflow_steps_workflow_step_idx").on(table.workflowId, table.stepNumber)
```

---

### Step Config TypeScript Types

```typescript
// AskUserStep - Captures user input
export type AskUserStepConfig = {
  question: string;
  inputType: "text" | "boolean" | "select" | "number";
  options?: string[]; // For select type
  validation?: string; // Zod schema as string
  storeAs: string; // Variable name in workflow_executions.variables
};

// LLMGenerateStep - Generate content with LLM
export type LLMGenerateStepConfig = {
  promptTemplate: string; // Can use {{variable}} interpolation
  outputSchema: string; // Zod schema as JSON string
  streaming: boolean;
  temperature?: number;
  storeAs: string; // Variable name
};

// CheckConditionStep - Evaluate condition and route
export type CheckConditionStepConfig = {
  conditionType: "boolean" | "select" | "abstract";
  evaluateVariable: string; // Variable name from workflow_executions.variables

  // For ABSTRACT only (LLM evaluates)
  abstractCondition?: {
    llmPrompt: string;
    evaluationSchema: string; // Zod schema (usually z.boolean())
  };

  // Routing defined in workflow_step_branches table
};

// ExecuteActionStep - Run actions
export type ExecuteActionStepConfig = {
  description: string;
  // Actions defined in workflow_step_actions table
};

// InvokeWorkflowStep - Call sub-workflow
export type InvokeWorkflowStepConfig = {
  invokedWorkflowName: string;
  inputParams: Record<string, any>; // Can use {{variable}} interpolation
  outputMapping: Record<string, string>; // Map sub-workflow outputs to variables
};

// DisplayOutputStep - Show message to user
export type DisplayOutputStepConfig = {
  outputTemplate: string; // Can use {{variable}} interpolation
  outputType: "info" | "success" | "warning" | "error";
};

// LoadContextStep - Load context into workflow
export type LoadContextStepConfig = {
  contextSource: "inline" | "database" | "variable";

  // For inline (context defined in workflow config)
  contextContent?: string;

  // For database (query for artifact content)
  databaseQuery?: {
    table: string;
    where: Record<string, any>;
    selectField: string;
  };

  // For variable (copy from existing variable)
  sourceVariable?: string;

  storeAs: string; // Variable name
};

export type StepConfig =
  | AskUserStepConfig
  | LLMGenerateStepConfig
  | CheckConditionStepConfig
  | ExecuteActionStepConfig
  | InvokeWorkflowStepConfig
  | DisplayOutputStepConfig
  | LoadContextStepConfig;
```

---

### 8. workflow_step_branches (NEW!)

**Purpose:** N-way conditional routing (boolean, select, abstract)

```typescript
export const workflowStepBranches = pgTable("workflow_step_branches", {
  id: uuid("id").primaryKey().defaultRandom(),

  stepId: uuid("step_id")
    .notNull()
    .references(() => workflowSteps.id, { onDelete: "cascade" }),

  // Branch configuration
  branchKey: text("branch_key").notNull(), // "true", "false", "1", "2", "3", etc.
  branchLabel: text("branch_label"), // Display text for select options (optional)

  // Target
  nextStepId: uuid("next_step_id")
    .notNull()
    .references(() => workflowSteps.id),

  // Ordering for select dropdowns
  displayOrder: integer("display_order"),

  createdAt: timestamp("created_at").notNull().defaultNow()
});
```

**Example Data:**

**Boolean Branch:**
```sql
INSERT INTO workflow_step_branches (step_id, branch_key, next_step_id) VALUES
  ('check-status-step-uuid', 'true', 'continue-step-uuid'),
  ('check-status-step-uuid', 'false', 'set-standalone-step-uuid');
```

**Select Branch (6-way):**
```sql
INSERT INTO workflow_step_branches (step_id, branch_key, branch_label, next_step_id, display_order) VALUES
  ('route-research-uuid', '1', 'Market Research', 'market-research-uuid', 1),
  ('route-research-uuid', '2', 'Deep Prompt Generator', 'deep-prompt-uuid', 2),
  ('route-research-uuid', '3', 'Technical Research', 'technical-uuid', 3),
  ('route-research-uuid', '4', 'Competitive Intelligence', 'competitive-uuid', 4),
  ('route-research-uuid', '5', 'User Research', 'user-research-uuid', 5),
  ('route-research-uuid', '6', 'Domain Research', 'domain-uuid', 6);
```

---

### 9. workflow_step_actions

**Purpose:** Actions within steps (Chiron's sequential/parallel patterns)

```typescript
export const actionExecutionEnum = pgEnum("action_execution", [
  "sequential",
  "parallel",
  "conditional"
]);

export const workflowStepActions = pgTable("workflow_step_actions", {
  id: uuid("id").primaryKey().defaultRandom(),

  stepId: uuid("step_id")
    .notNull()
    .references(() => workflowSteps.id, { onDelete: "cascade" }),

  actionType: text("action_type").notNull(), // "set-variable", "database-insert", "database-query"
  actionConfig: jsonb("action_config").notNull(), // Action-specific parameters

  // Chiron's execution pattern
  executionMode: actionExecutionEnum("execution_mode").notNull(),
  sequenceOrder: integer("sequence_order").notNull(),

  // Conditional execution (optional)
  condition: text("condition"),

  createdAt: timestamp("created_at").notNull().defaultNow()
});
```

**Example Actions:**

**Set Variable:**
```typescript
{
  actionType: "set-variable",
  actionConfig: {
    variableName: "standalone_mode",
    value: true
  }
}
```

**Database Insert (save artifact):**
```typescript
{
  actionType: "database-insert",
  actionConfig: {
    table: "project_artifacts",
    data: {
      project_id: "{{project_id}}",
      artifact_type: "brainstorming-session",
      file_path: "{{brainstorming_artifact_path}}",
      workflow_id: "wf-brainstorm-project",
      metadata: {
        session_date: "{{current_date}}"
      }
    }
  }
}
```

---

### 10. workflow_executions

**Purpose:** Runtime workflow execution state (pause/resume)

```typescript
export const workflowStatusEnum = pgEnum("workflow_status", [
  "idle",
  "active",
  "paused",
  "completed",
  "failed"
]);

export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),

  status: workflowStatusEnum("status").notNull().default("idle"),

  // Current step
  currentStepId: uuid("current_step_id")
    .references(() => workflowSteps.id),

  // ALL RUNTIME DATA STORED HERE!
  variables: jsonb("variables")
    .$type<Record<string, any>>()
    .notNull()
    .default({}),
  contextData: jsonb("context_data").$type<Record<string, any>>(),

  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  pausedAt: timestamp("paused_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
```

**Indexes:**
```typescript
index("workflow_executions_project_id_idx").on(table.projectId),
index("workflow_executions_status_idx").on(table.status),
index("workflow_executions_project_status_idx").on(table.projectId, table.status)
```

**Key Points:**
- `variables` JSONB stores ALL step outputs (e.g., `{ status_exists: true, project_level: 3, brainstorming_results: "..." }`)
- Steps read/write from `variables` using `storeAs` and `evaluateVariable` config fields
- Workflow can pause/resume by storing `currentStepId`

---

### 11. project_artifacts

**Purpose:** Track generated files (NOT metadata - actual artifacts!)

```typescript
export const projectArtifacts = pgTable("project_artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),

  artifactType: text("artifact_type").notNull(), // "brainstorming-session", "product-brief", "prd"
  filePath: text("file_path").notNull(), // Path to actual file (e.g., /docs/brainstorming-2025-11-05.md)

  workflowId: uuid("workflow_id")
    .references(() => workflows.id),

  // FR034: Git commit hash tracking (type-safe column)
  gitCommitHash: text("git_commit_hash"), // Git hash of artifact version

  metadata: jsonb("metadata").$type<Record<string, any>>(), // Artifact-specific metadata

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
```

**Indexes:**
```typescript
index("project_artifacts_project_id_idx").on(table.projectId),
index("project_artifacts_type_idx").on(table.artifactType),
index("project_artifacts_git_hash_idx").on(table.gitCommitHash)
```

**Example Data:**
```sql
INSERT INTO project_artifacts (project_id, artifact_type, file_path, workflow_id, git_commit_hash, metadata) VALUES
  ('project-uuid', 'brainstorming-session', '/docs/brainstorming-session-2025-11-05.md', 'wf-brainstorm-uuid', 'abc123def456', '{"techniques": ["Mind Mapping", "SCAMPER"]}'),
  ('project-uuid', 'product-brief', '/docs/product-brief-chiron-2025-11-05.md', 'wf-product-brief-uuid', 'def456ghi789', '{"mode": "interactive"}');
```

---

### 12. app_config (System Configuration)

**Purpose:** Application-wide settings (LLM API keys, user preferences)

**CRITICAL SECURITY:** API keys MUST be encrypted at rest. Use `@node-rs/bcrypt` or Tauri SecureStorage API.

```typescript
export const appConfig = pgTable("app_config", {
  id: uuid("id").primaryKey().defaultRandom(),

  // LLM Provider API Keys (encrypted at rest!)
  openrouterApiKey: text("openrouter_api_key"), // PRIMARY - required for first-time setup
  anthropicApiKey: text("anthropic_api_key"),   // Optional fallback
  openaiApiKey: text("openai_api_key"),         // Optional fallback

  // Default Provider Configuration
  defaultLlmProvider: text("default_llm_provider").default("openrouter"), // "openrouter", "anthropic", "openai"

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
```

**Single-Row Table:**
This table should have exactly ONE row (singleton pattern). Enforce in application logic:
```typescript
// On first launch
if ((await db.select().from(appConfig)).length === 0) {
  await db.insert(appConfig).values({ defaultLlmProvider: "openrouter" });
}
```

**Example Data:**
```sql
-- First-time setup (user configures OpenRouter key)
INSERT INTO app_config (openrouter_api_key, default_llm_provider) VALUES
  ('<ENCRYPTED_KEY_HERE>', 'openrouter');

-- Later: User adds fallback providers
UPDATE app_config SET
  anthropic_api_key = '<ENCRYPTED_KEY_HERE>',
  openai_api_key = '<ENCRYPTED_KEY_HERE>'
WHERE id = (SELECT id FROM app_config LIMIT 1);
```

**Security Notes:**
1. **Encryption at Rest:** Use `@node-rs/bcrypt` to encrypt keys before storing
2. **Never Log Keys:** Implement strict no-log policy for API keys
3. **Key Rotation:** Allow user to update keys without re-entering all
4. **Tauri Integration:** Consider using Tauri SecureStorage API for OS-level keychain integration
5. **Validation:** Test API key with sample call before saving (prevent typos)

**First-Time Setup Flow (Story 1.4):**
1. User launches Chiron → Check if `app_config` table is empty
2. If empty → Show "API Key Setup" screen
3. User enters OpenRouter API key → Validate with test call
4. If valid → Encrypt and save to `app_config` table
5. User can proceed to create projects

---

### 13. training_examples (ax optimization)

```typescript
export const trainingExamples = pgTable("training_examples", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" }),

  workflowId: text("workflow_id").notNull(), // e.g., "workflow-init"
  stepId: text("step_id").notNull(), // e.g., "classify-level"

  input: jsonb("input").notNull(), // LLM inputs
  output: jsonb("output").notNull(), // Correct output (from user correction)
  originalPrediction: jsonb("original_prediction"), // Wrong LLM prediction

  createdAt: timestamp("created_at").notNull().defaultNow(),
  usedInOptimizationAt: timestamp("used_in_optimization_at")
});
```

---

### 14. optimization_runs (ax optimization)

```typescript
export const optimizationRuns = pgTable("optimization_runs", {
  id: uuid("id").primaryKey().defaultRandom(),

  workflowId: text("workflow_id").notNull(),
  stepId: text("step_id").notNull(),

  optimizerType: text("optimizer_type").notNull(), // "GEPA", "MiPRO", etc.
  numExamples: integer("num_examples").notNull(),

  bestScore: real("best_score").notNull(),
  paretoFrontSize: integer("pareto_front_size"),
  hypervolume: real("hypervolume"),

  optimizationFilePath: text("optimization_file_path").notNull(), // Path to JSON file
  appliedAt: timestamp("applied_at"),

  createdAt: timestamp("created_at").notNull().defaultNow()
});
```

---

### 15-16. epic_state & story_state (Future - Epic 2+)

```typescript
export const epicState = pgTable("epic_state", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  epicNumber: integer("epic_number").notNull(),
  status: text("status").notNull(), // "todo", "in-progress", "done"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const storyState = pgTable("story_state", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  epicNumber: integer("epic_number").notNull(),
  storyNumber: text("story_number").notNull(),
  status: text("status").notNull(), // "todo", "in-progress", "done"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
```

---

## Key Architectural Decisions

### 1. Variable Storage Pattern

**All runtime data in `workflow_executions.variables` JSONB:**

| Step Type | Reads Variables? | Writes Variables? | Config Fields |
|-----------|------------------|-------------------|---------------|
| `ask-user` | ❌ | ✅ | `storeAs` |
| `llm-generate` | ✅ (for prompt) | ✅ | `storeAs`, `promptTemplate` |
| `check-condition` | ✅ | ❌ | `evaluateVariable` |
| `execute-action` | ✅ (for params) | ✅ (optional) | action config |
| `invoke-workflow` | ✅ (for inputs) | ✅ | `inputParams`, `outputMapping` |
| `load-context` | ❌ | ✅ | `storeAs`, `contextContent` |
| `display-output` | ✅ (for template) | ❌ | `outputTemplate` |

**Example Flow:**
```typescript
// Step 1 outputs:
{ status_exists: true, project_id: "uuid-123", project_level: 3 }

// Step 2 reads:
evaluateVariable: "status_exists" → branches based on value

// Step 3 writes:
{ ...previous, standalone_mode: true }

// Step 4 writes:
{ ...previous, project_context: "context content..." }

// Step 5 writes:
{ ...previous, brainstorming_results: "...", brainstorming_artifact_path: "/docs/..." }
```

---

### 2. Context Definition Pattern

**Context is defined INLINE in workflow config, NOT read from files:**

```typescript
// CORRECT:
{
  stepType: "load-context",
  config: {
    contextSource: "inline",
    contextContent: "Your context here...", // ← Defined in config!
    storeAs: "project_context"
  }
}

// WRONG:
{
  stepType: "load-context",
  config: {
    contextSource: "file",
    contextPath: "{installed_path}/context.md", // ❌ NO!
    storeAs: "project_context"
  }
}
```

---

### 3. Branching Patterns

**Three branching types:**

| Type | User Input | Evaluation | Branches | Example |
|------|-----------|------------|----------|---------|
| **Boolean** | Yes/No | Concrete (JS eval) | 2 (true/false) | "Confirm Level 3?" |
| **Select** | Choose from list | Concrete (key match) | N (one per option) | "Choose research type: 1-6" |
| **Abstract** | Free-form text | LLM interpretation | 2 (true/false) | "Describe complexity" → LLM decides |

**Execution:**
1. `AskUserStep` captures input → stores in `variables[storeAs]`
2. `CheckConditionStep` reads `variables[evaluateVariable]`
3. Match against `workflow_step_branches.branchKey`
4. Jump to `workflow_step_branches.nextStepId`

---

### 4. Step Linking

**Every step has `nextStepId`:**
- If routing is **linear**: `nextStepId = "next-step-uuid"`
- If routing is **conditional**: `nextStepId = null` → use `workflow_step_branches` table

**Example:**
```
Step 1 (validate) → nextStepId: step-2-uuid
Step 2 (check-condition) → nextStepId: null → branches:
  ├─ true → step-4-uuid
  └─ false → step-3-uuid
Step 3 (set-standalone) → nextStepId: step-4-uuid
Step 4 (load-context) → nextStepId: step-5-uuid
```

---

### 5. Artifact Tracking

**Artifacts = actual generated files, tracked in database:**

1. Workflow generates file → stores path in variable (e.g., `brainstorming_artifact_path`)
2. `ExecuteActionStep` inserts into `project_artifacts` table
3. Row contains: `project_id`, `artifact_type`, `file_path`, `workflow_id`, `metadata`

**NO metadata files stored** - only database references to actual artifacts!

---

## Implementation Checklist

### Phase 1: Core Schema (Epic 1 - Story 1.1)

- [ ] Create all 13 core tables (exclude epic_state, story_state for now)
- [ ] Add all enums
- [ ] Add all indexes
- [ ] Add TypeScript types for JSONB columns
- [ ] Generate migrations with Drizzle Kit

### Phase 2: Seed Data (Epic 1 - Story 1.2)

- [ ] Seed agents (analyst, pm, architect, dev, sm, ux-designer)
- [ ] Seed workflow_paths (greenfield-level-3)
- [ ] Seed Phase 1 workflows (brainstorm-project, research, product-brief)
- [ ] Seed all workflow_steps for Phase 1
- [ ] Seed all workflow_step_branches
- [ ] Seed workflow_path_workflows junction entries

### Phase 3: Test Workflows (Epic 1 - Story 1.4)

- [ ] Test brainstorm-project end-to-end
- [ ] Test research with 6-way branching
- [ ] Test product-brief (next session)
- [ ] Verify artifact tracking works
- [ ] Verify workflow-status integration

---

## Next Session Context

**What's Ready:**
- Complete schema design (15 tables)
- brainstorm-project workflow fully mapped
- research workflow fully mapped (6-way select branching)

**What's Pending:**
- product-brief workflow mapping (interactive vs YOLO mode)
- Seed data generation
- Schema implementation in Drizzle ORM

**Files to Reference:**
- This file: `docs/architecture/database-schema-final.md`
- Workflow mappings: Reference brainstorm-project and research examples
- BMad paths: `bmad/bmm/workflows/workflow-status/paths/greenfield-level-3.yaml`

---

_Schema finalized: 2025-11-05_
_Ready for implementation_
