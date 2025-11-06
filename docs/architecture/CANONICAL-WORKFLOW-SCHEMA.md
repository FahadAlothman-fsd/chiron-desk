# Chiron Workflow Engine Schema (CANONICAL)

**Date:** 2025-11-05  
**Last Updated:** 2025-11-06  
**Status:** Architectural Agreement - Ready for Implementation  
**Context:** Architect + Fahad session on workflow-init and schema design

---

## ⚠️ CANONICAL SOURCE OF TRUTH

**This document is the SINGLE SOURCE OF TRUTH for Chiron's workflow engine schema.**

- All schema implementation (Story 1.1) MUST match this document exactly
- All seed scripts (Story 1.2) MUST use structures defined here
- All API implementations (Story 1.3+) MUST reference this schema
- Any schema changes MUST update this document FIRST, then code

**Last Verified:** 2025-11-06  
**Session:** Document Reconciliation (pre-Epic 1 restart)

---

## Overview

This document captures the agreed-upon workflow engine schema for Chiron. This is the foundation for:
- Story 1.2 (BMAD Workflow Seeding)
- Story 1.4 (workflow-init implementation)
- Story 1.5 (Workflow Execution Engine)

### What's New (2025-11-06 Update)

This update adds **5 critical schema tables** and **execution progress tracking**:

1. **`workflow_path_workflows`** - Junction table mapping workflows to paths by phase
2. **`workflow_executions`** - Execution state with **`executedSteps`** tracking (mirrors `executedVsPath` pattern)
3. **`workflow_templates`** - Handlebars templates for artifact generation
4. **`dialog_sessions`** - Optional dialog tracking (can defer to execution variables)
5. **`projects.executedVsPath`** - JSONB field tracking workflow completion vs path definition

**Key Addition:** The `executedSteps` field in `workflow_executions` provides step-by-step execution tracking, showing exactly what happened at each step, when it happened, what branch was taken, and what output was produced. This mirrors the `executedVsPath` pattern but for individual workflow execution.

---

## Core Principles

1. **No Hardcoded Enums** - Tracks, field types, and project metadata are DATA in tables, not schema enums
2. **workflow-init is a Workflow** - Project initialization is a first-class workflow with branching steps
3. **N-Way Branching** - Branch steps support multiple outcomes, not just binary true/false
4. **Concrete vs Abstract** - Conditions can be engine-evaluated (fast) or LLM-evaluated (flexible)
5. **Tag-Based Filtering** - workflow_paths use JSONB tags for dynamic filtering
6. **Dual Progress Tracking** - `executedVsPath` (project-level) + `executedSteps` (execution-level) provide complete visibility

---

## Database Schema

### 1. Workflows Table

```typescript
export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  module: text("module"), // "bmm", "cis", "custom"
  
  // Agent assignment
  agentId: uuid("agent_id").references(() => agents.id),
  
  // Special flags
  isProjectInitializer: boolean("is_project_initializer").default(false),
  isStandalone: boolean("is_standalone").default(true),
  requiresProjectContext: boolean("requires_project_context").default(false),
  
  // Output configuration
  outputArtifactType: text("output_artifact_type"), // "prd", "architecture", "story", etc.
  outputTemplateId: uuid("output_template_id"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Constraint: Only one project initializer per module
// CREATE UNIQUE INDEX unique_project_initializer ON workflows(module) 
// WHERE is_project_initializer = true;
```

---

### 2. Workflow Steps Table

```typescript
export const workflowSteps = pgTable("workflow_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  
  stepNumber: integer("step_number").notNull(),
  goal: text("goal").notNull(), // Human-readable step purpose
  
  // Step type from our 7 types
  stepType: text("step_type").notNull(),
  // "ask-user" | "llm-generate" | "branch" | "approval-checkpoint" | 
  // "execute-action" | "invoke-workflow" | "display-output"
  
  // Step configuration (type-specific, stored as JSON)
  config: jsonb("config").notNull(),
  
  // Sequential flow
  nextStepNumber: integer("next_step_number"), // null = end of workflow
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Index for efficient step retrieval
// CREATE INDEX workflow_steps_workflow_id_step_number 
// ON workflow_steps(workflow_id, step_number);
```

---

### 3. Workflow Paths Table (NO ENUMS!)

```typescript
export const workflowPaths = pgTable("workflow_paths", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // "method-greenfield"
  displayName: text("display_name").notNull(), // "BMad Method (Greenfield)"
  description: text("description").notNull(),
  educationText: text("education_text"), // Long-form for UI cards
  
  // 🎯 FREE-FORM TAGS (not enums!)
  // workflow-init filters dynamically on these
  tags: jsonb("tags").$type<{
    track?: string,          // "quick-flow" | "method" | "enterprise"
    fieldType?: string,      // "greenfield" | "brownfield"
    complexity?: string,     // "simple" | "moderate" | "complex"
    [key: string]: string    // Custom tags!
  }>(),
  
  // Metadata for workflow-init's recommendation engine
  recommendedFor: jsonb("recommended_for").$type<string[]>(), // ["dashboard", "platform"]
  estimatedTime: text("estimated_time"), // "1-3 days"
  agentSupport: text("agent_support"), // "Exceptional - complete context"
  
  // UI presentation order
  sequenceOrder: integer("sequence_order").default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

---

### 4. Projects Table (See Section 9 for Full Schema)

**Note:** The complete Projects table schema with `executedVsPath` progress tracking is documented in **Section 9** below (after the new schema tables). This section is kept as a placeholder for structural clarity.

---

### 5. Workflow Path Workflows (Junction Table)

Maps which workflows belong to which workflow path, organized by phase and sequence.

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
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Index for efficient path workflow lookup
// CREATE INDEX workflow_path_workflows_path_phase 
// ON workflow_path_workflows(workflow_path_id, phase, sequence_order);
```

**Example Seed Data:**

```typescript
// method-greenfield path workflows
const methodGreenfieldWorkflows = [
  // Phase 1: Analysis (optional workflows)
  {
    workflowPathId: "method-greenfield-uuid",
    workflowId: "product-brief-uuid",
    phase: 1,
    sequenceOrder: 1,
    isOptional: true,
    isRecommended: true
  },
  {
    workflowPathId: "method-greenfield-uuid",
    workflowId: "research-uuid",
    phase: 1,
    sequenceOrder: 2,
    isOptional: true,
    isRecommended: false
  },
  
  // Phase 2: Planning (required workflows)
  {
    workflowPathId: "method-greenfield-uuid",
    workflowId: "create-prd-uuid",
    phase: 2,
    sequenceOrder: 1,
    isOptional: false,
    isRecommended: true
  },
  {
    workflowPathId: "method-greenfield-uuid",
    workflowId: "create-ux-design-uuid",
    phase: 2,
    sequenceOrder: 2,
    isOptional: false,
    isRecommended: true
  },
  
  // Phase 3: Solutioning
  {
    workflowPathId: "method-greenfield-uuid",
    workflowId: "create-architecture-uuid",
    phase: 3,
    sequenceOrder: 1,
    isOptional: false,
    isRecommended: true
  },
  
  // Phase 4: Implementation
  {
    workflowPathId: "method-greenfield-uuid",
    workflowId: "sprint-planning-uuid",
    phase: 4,
    sequenceOrder: 1,
    isOptional: false,
    isRecommended: true
  }
];
```

---

### 6. Workflow Executions Table

Tracks running and completed workflow instances with their state and step-by-step execution progress.

```typescript
export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id),
  
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" }),
  
  status: text("status").notNull(), // "running" | "completed" | "failed" | "cancelled"
  currentStep: integer("current_step").default(1),
  
  // All workflow variables accumulated during execution
  variables: jsonb("variables").$type<Record<string, any>>().default({}),
  
  // 🎯 NEW: Step-by-step execution tracking (mirrors executedVsPath pattern)
  executedSteps: jsonb("executed_steps").$type<{
    [stepNumber: number]: {
      status: "completed" | "failed" | "skipped",
      startedAt: string,
      completedAt?: string,
      output?: any,
      error?: string,
      branchTaken?: string // For branch steps: which path was chosen
    }
  }>().default({}),
  
  // Timestamps
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  
  // Error tracking
  error: text("error"),
  errorStep: integer("error_step"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Indexes for common queries
// CREATE INDEX workflow_executions_project_id ON workflow_executions(project_id);
// CREATE INDEX workflow_executions_status ON workflow_executions(status);
```

**Example Execution State:**

```typescript
{
  id: "exec-123",
  workflowId: "workflow-init-uuid",
  projectId: null, // No project yet during workflow-init
  status: "running",
  currentStep: 5,
  variables: {
    project_name: "task-manager",
    project_path: "/Users/fahad/projects/task-manager",
    user_description: "Task management app for small teams...",
    codebase_scan: { has_git: false, has_source: false },
    detected_field_type: "greenfield",
    recommended_track: "method"
  },
  executedSteps: {
    "1": {
      status: "completed",
      startedAt: "2025-11-05T10:25:00Z",
      completedAt: "2025-11-05T10:25:15Z",
      output: { project_name: "task-manager" }
    },
    "2": {
      status: "completed",
      startedAt: "2025-11-05T10:25:16Z",
      completedAt: "2025-11-05T10:25:45Z",
      output: { user_description: "Task management app..." }
    },
    "3": {
      status: "completed",
      startedAt: "2025-11-05T10:25:46Z",
      completedAt: "2025-11-05T10:25:47Z",
      output: { codebase_scan: { has_git: false, has_source: false } }
    },
    "4": {
      status: "completed",
      startedAt: "2025-11-05T10:25:47Z",
      completedAt: "2025-11-05T10:25:48Z",
      branchTaken: "greenfield",
      output: { detected_field_type: "greenfield" }
    }
  },
  startedAt: "2025-11-05T10:25:00Z"
}
```

**How `executedSteps` Works:**

1. **Before workflow starts:** `executedSteps = {}`
2. **As each step executes:** Engine adds entry with status, timestamps, output
3. **For branch steps:** Records which branch was taken in `branchTaken` field
4. **UI can show:** Step-by-step progress, execution timeline, outputs at each stage
5. **Debugging:** See exactly where workflow failed and what data was available
6. **Resumability:** Can resume from last completed step after interruption

---

### 7. Dialog Sessions Table (Optional)

Tracks dialog interactions for clarification steps. Can also be stored in `workflow_executions.variables` if preferred.

```typescript
export const dialogSessions = pgTable("dialog_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  executionId: uuid("execution_id")
    .notNull()
    .references(() => workflowExecutions.id, { onDelete: "cascade" }),
  
  questionId: text("question_id").notNull(), // "q3_user_description"
  
  // Chat history
  messages: jsonb("messages").$type<Array<{
    role: "user" | "assistant",
    content: string,
    timestamp: string
  }>>().default([]),
  
  // Extracted answer from dialog
  extractedAnswer: jsonb("extracted_answer"),
  
  status: text("status").notNull(), // "open" | "closed"
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

// Index for looking up dialogs by execution
// CREATE INDEX dialog_sessions_execution_id ON dialog_sessions(execution_id);
```

**Note:** This table is optional for MVP. Dialog state can be stored in `workflow_executions.variables` under a key like `_dialog_sessions` to keep things simpler initially.

---

### 8. Workflow Templates Table

Stores Handlebars templates for artifact generation (PRD, Architecture, etc.)

```typescript
export const workflowTemplates = pgTable("workflow_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // "prd-template"
  displayName: text("display_name").notNull(), // "Product Requirements Document"
  
  artifactType: text("artifact_type").notNull(), // "prd" | "architecture" | "story" | etc
  
  // Handlebars template content (markdown)
  template: text("template").notNull(),
  
  // Expected variables for this template
  templateVariables: jsonb("template_variables").$type<Array<{
    name: string,
    type: string,
    required: boolean,
    description?: string
  }>>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Example Template:**

```typescript
{
  name: "prd-template",
  displayName: "Product Requirements Document",
  artifactType: "prd",
  template: `# {{project_name}} - Product Requirements Document

## 1. Overview

{{prd.overview}}

## 2. User Personas

{{#each prd.personas}}
### {{name}}
- **Role:** {{role}}
- **Goals:**
{{#each goals}}  - {{this}}
{{/each}}
{{/each}}

## 3. Features

{{#each prd.features}}
### {{name}}

{{description}}

**Acceptance Criteria:**
{{#each acceptanceCriteria}}
- [ ] {{this}}
{{/each}}

---
{{/each}}
`,
  templateVariables: [
    { name: "project_name", type: "string", required: true },
    { name: "prd.overview", type: "string", required: true },
    { name: "prd.personas", type: "array", required: true },
    { name: "prd.features", type: "array", required: true }
  ]
}
```

---

### 9. Projects Table (UPDATED with Progress Tracking)

**UPDATED** - Adding `executedVsPath` for progress tracking:

```typescript
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  path: text("path").notNull(), // File system path
  
  // Workflow path reference
  workflowPathId: uuid("workflow_path_id")
    .notNull()
    .references(() => workflowPaths.id),
  
  // Audit trail
  initializedByExecutionId: uuid("initialized_by_execution_id")
    .references(() => workflowExecutions.id),
  
  // 🎯 NEW: Progress tracking - compares executed workflows vs path definition
  executedVsPath: jsonb("executed_vs_path").$type<{
    [phase: number]: {
      [workflowName: string]: {
        status: "not-started" | "in-progress" | "completed" | "skipped",
        executionId?: string,
        startedAt?: string,
        completedAt?: string,
        artifactPath?: string
      }
    }
  }>().default({}),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Example Progress State:**

```typescript
{
  "executedVsPath": {
    "1": {
      "product-brief": {
        "status": "completed",
        "executionId": "exec-456",
        "startedAt": "2025-11-05T11:00:00Z",
        "completedAt": "2025-11-05T11:30:00Z",
        "artifactPath": "docs/product-brief.md"
      },
      "research": {
        "status": "skipped"
      }
    },
    "2": {
      "create-prd": {
        "status": "in-progress",
        "executionId": "exec-789",
        "startedAt": "2025-11-05T12:00:00Z"
      }
    }
  }
}
```

**How It Works:**

1. After workflow-init: `executedVsPath = {}`
2. Dashboard queries `workflow_path_workflows` to get expected structure
3. Merges with `executedVsPath` to show actual progress
4. Updates `executedVsPath` as workflows start/complete

**Dashboard Query Pattern:**

```typescript
// 1. Get expected workflows from path
const expectedWorkflows = await db
  .select()
  .from(workflowPathWorkflows)
  .where(eq(workflowPathWorkflows.workflowPathId, project.workflowPathId))
  .orderBy(workflowPathWorkflows.phase, workflowPathWorkflows.sequenceOrder);

// 2. Merge with actual execution
const progress = expectedWorkflows.map(expected => ({
  ...expected,
  execution: project.executedVsPath[expected.phase]?.[expected.workflow.name] || {
    status: "not-started"
  }
}));

// 3. Render in UI with status badges
```

---

## Step Types (8 Total)

### 1. AskUserStep

User input with validation and choices.

```typescript
type AskUserStep = {
  type: "ask-user"
  question: string
  
  choices?: {
    type: "single" | "multiple"
    options: Choice[] | string  // Array or variable name
    display?: string            // For dynamic options: which field to display
    value?: string              // For dynamic options: which field is the value
  }
  
  responseType: "boolean" | "string" | "number" | "choice"
  responseVariable: string
  validation?: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: string  // regex
    min?: number      // for numbers
    max?: number
  }
}

type Choice = {
  value: string
  label: string
  description?: string
}
```

**UI Mapping:**
- `boolean` → Yes/No buttons
- `choice` (single) → Radio buttons or cards
- `choice` (multiple) → Checkboxes
- `string` → Text input with validation
- `number` → Number input with min/max

**Example:**
```typescript
{
  type: "ask-user",
  question: "What's your project called?",
  responseType: "string",
  responseVariable: "project_name",
  validation: {
    required: true,
    minLength: 3,
    pattern: "^[a-z0-9-]+$"
  }
}
```

---

### 2. LLMGenerateStep

AI content generation with structured I/O.

```typescript
type LLMGenerateStep = {
  type: "llm-generate"
  llmTask: LLMTask
  contextVariables: string[]  // Variables to include in prompt
  outputVariable: string
  streaming?: boolean
}

type LLMTask =
  | StructuredGenerationTask
  | FreeformGenerationTask
  | ClassificationTask
  | ExtractionTask

type ClassificationTask = {
  type: "classification"
  description: string
  input: string              // Variable reference or template string
  categories: string[]       // Must return one of these
  reasoning?: boolean        // Include reasoning in output
}

type StructuredGenerationTask = {
  type: "structured"
  description: string
  schema: any               // Zod schema or JSON schema
  input?: string
}

type FreeformGenerationTask = {
  type: "freeform"
  prompt: string
  maxTokens?: number
}

type ExtractionTask = {
  type: "extraction"
  description: string
  input: string
  schema: any
}
```

**UI Mapping:**
- Loading indicator with progress
- Streaming output (if enabled)
- Editable result with approval

**Example:**
```typescript
{
  type: "llm-generate",
  llmTask: {
    type: "classification",
    description: "Analyze project complexity and recommend track",
    input: "{{user_description}}",
    categories: ["quick-flow", "method", "enterprise"],
    reasoning: true
  },
  contextVariables: ["user_description"],
  outputVariable: "recommended_track"
}
```

---

### 3. BranchStep (N-Way Branching)

Conditional branching with multiple outcomes.

```typescript
type BranchStep = {
  type: "branch"
  
  // What to branch on
  evaluator: ConcreteEvaluator | AbstractEvaluator
  
  // N-way cases (not binary!)
  branches: Branch[]
  
  // Fallback if no match
  defaultBranch?: WorkflowPattern
}

type ConcreteEvaluator = {
  type: "concrete"
  variable: string  // Variable to evaluate
}

type AbstractEvaluator = {
  type: "abstract"
  description: string
  contextVariables: string[]
  categories: string[]  // LLM must return one of these
}

type Branch = {
  matchValue: string | string[]  // Can match multiple values
  label?: string                  // UI display name
  pattern: WorkflowPattern
}

type WorkflowPattern = {
  type: "sequential-dependencies" | "parallel-independence" | "structured-exploration" | "focused-dialog"
  steps: WorkflowStep[]
}
```

**UI Mapping:**
- Decision tree visualization
- Shows which branch was taken
- Expandable pattern preview

**Example (Concrete):**
```typescript
{
  type: "branch",
  evaluator: {
    type: "concrete",
    variable: "project_state"
  },
  branches: [
    {
      matchValue: "clean_slate",
      label: "No existing work",
      pattern: {
        type: "sequential-dependencies",
        steps: [/* ... */]
      }
    },
    {
      matchValue: "planning_in_progress",
      label: "Planning documents found",
      pattern: {
        type: "sequential-dependencies",
        steps: [/* ... */]
      }
    },
    {
      matchValue: ["implementation_in_progress", "review_in_progress"],
      label: "Active implementation",
      pattern: {
        type: "sequential-dependencies",
        steps: [/* ... */]
      }
    }
  ],
  defaultBranch: {
    type: "sequential-dependencies",
    steps: [/* fallback */]
  }
}
```

**Example (Abstract):**
```typescript
{
  type: "branch",
  evaluator: {
    type: "abstract",
    description: "Classify project complexity based on description",
    contextVariables: ["user_description"],
    categories: ["simple", "moderate", "complex", "enterprise"]
  },
  branches: [
    {
      matchValue: "simple",
      label: "Simple Project",
      pattern: { /* recommend quick-flow */ }
    },
    {
      matchValue: ["moderate", "complex"],
      label: "Moderate/Complex",
      pattern: { /* recommend method */ }
    },
    {
      matchValue: "enterprise",
      label: "Enterprise",
      pattern: { /* recommend enterprise */ }
    }
  ]
}
```

---

### 4. ApprovalCheckpointStep

Human approval with artifact preview.

```typescript
type ApprovalCheckpointStep = {
  type: "approval-checkpoint"
  content: string  // Markdown with {{variables}}
  artifact?: {
    type: string         // "prd", "architecture", "story"
    savePath: string     // Where to save if approved
  }
}
```

**UI Mapping:**
- Split view: content preview | chat
- Approve/Reject/Edit buttons
- Version history
- Diff view

**Example:**
```typescript
{
  type: "approval-checkpoint",
  content: "{{generated_prd}}",
  artifact: {
    type: "prd",
    savePath: "{{output_folder}}/prd.md"
  }
}
```

---

### 5. ExecuteActionStep

System operations (database, file, git).

```typescript
type ExecuteActionStep = {
  type: "execute-action"
  action: SystemAction
}

type SystemAction =
  | DatabaseAction
  | FileAction
  | GitAction
  | SetVariableAction
  | ScanCodebaseAction

type DatabaseAction = {
  type: "database"
  operation: "query" | "insert" | "update" | "delete"
  table: string
  values?: Record<string, any>
  filter?: any
  output?: string  // Variable to store result
}

type SetVariableAction = {
  type: "set-variable"
  variable: string
  value: any
}

type ScanCodebaseAction = {
  type: "scan-codebase"
  path: string
  checks: ("has_git" | "has_source" | "has_package_json")[]
  output: string
}

type FileAction = {
  type: "file"
  operation: "read" | "write" | "delete" | "exists"
  path: string
  content?: string
  output?: string
}

type GitAction = {
  type: "git"
  operation: "init" | "status" | "commit" | "branch"
  path: string
  output?: string
}
```

**UI Mapping:**
- Background task indicator
- Progress/completion status
- Error messages if operation fails

**Example:**
```typescript
{
  type: "execute-action",
  action: {
    type: "scan-codebase",
    path: "{{project_path}}",
    checks: ["has_git", "has_source"],
    output: "codebase_scan_result"
  }
}
```

---

### 6. InvokeWorkflowStep

Workflow composition and cross-module calls.

```typescript
type InvokeWorkflowStep = {
  type: "invoke-workflow"
  targetWorkflow: string  // Workflow name or ID
  parameters: Record<string, string>  // Input variables
  mode?: "blocking" | "async"
  outputVariable?: string  // Store result
}
```

**UI Mapping:**
- Nested workflow indicator
- Breadcrumb navigation
- Sub-workflow progress

**Example:**
```typescript
{
  type: "invoke-workflow",
  targetWorkflow: "research",
  parameters: {
    research_type: "market",
    topic: "{{user_description}}"
  },
  mode: "blocking",
  outputVariable: "research_output"
}
```

---

### 7. DisplayOutputStep

Rich markdown output to user.

```typescript
type DisplayOutputStep = {
  type: "display-output"
  content: string  // Markdown with {{variable}} interpolation
}
```

**UI Mapping:**
- Chat message bubble
- Rich markdown rendering
- Code blocks with syntax highlighting
- Mermaid diagrams

**Example:**
```typescript
{
  type: "display-output",
  content: `
# Project Initialization Complete! ✅

**Project:** {{project_name}}
**Path:** {{selected_workflow_path_name}}
**Next Workflow:** {{next_workflow}}

Your project is ready to begin.
  `
}
```

---

### 8. QuestionSetStep

Batch questions with optional dialog clarification support.

```typescript
type QuestionSetStep = {
  type: "question-set"
  questions: Question[]
  allowDialogs?: boolean  // Enable clarification dialogs per question
  pattern?: "sequential" | "all-at-once"  // How to present questions
}

type Question = {
  id: string
  question: string
  responseType: "boolean" | "string" | "number" | "choice"
  responseVariable: string
  
  choices?: {
    type: "single" | "multiple"
    options: Choice[] | string
    display?: string
    value?: string
  }
  
  validation?: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: string
    min?: number
    max?: number
  }
  
  // Optional dialog support
  dialogEnabled?: boolean
  dialogPrompt?: string  // Custom prompt for clarification dialog
}
```

**UI Mapping:**
- Left panel: Question list with progress indicators
- Right panel: Current question with input field
- Optional chat panel for dialogs (if enabled)
- Progress bar showing X of Y questions completed

**Example:**
```typescript
{
  type: "question-set",
  allowDialogs: true,
  pattern: "sequential",
  questions: [
    {
      id: "q1_project_name",
      question: "What's your project called?",
      responseType: "string",
      responseVariable: "project_name",
      validation: { required: true, minLength: 3 },
      dialogEnabled: false
    },
    {
      id: "q2_description",
      question: "Tell me about what you're building",
      responseType: "string",
      responseVariable: "user_description",
      validation: { required: true, minLength: 10 },
      dialogEnabled: true,
      dialogPrompt: "I can help you refine your description. What aspects would you like to clarify?"
    },
    {
      id: "q3_track",
      question: "Which track best fits your project?",
      responseType: "choice",
      responseVariable: "selected_track",
      choices: {
        type: "single",
        options: [
          { value: "quick-flow", label: "Quick Flow", description: "Fast tech-spec path" },
          { value: "method", label: "BMad Method", description: "Full PRD + UX + Architecture" },
          { value: "enterprise", label: "Enterprise", description: "Extended planning with security" }
        ]
      },
      dialogEnabled: false
    }
  ]
}
```

**Benefits:**
- Reduces step count for multi-question workflows
- Provides consistent question navigation UI
- Dialog support enables clarification without interrupting flow
- Can be broken into individual AskUserSteps if needed

---

## workflow-init: Complete Step Mapping

This is the canonical example of how workflow-init uses our step types.

### Step 1: Ask Project Name

```typescript
{
  stepNumber: 1,
  goal: "Get project name from user",
  stepType: "ask-user",
  config: {
    type: "ask-user",
    question: "What's your project called?",
    responseType: "string",
    responseVariable: "project_name",
    validation: {
      required: true,
      minLength: 3,
      pattern: "^[a-z0-9-]+$"
    }
  },
  nextStepNumber: 2
}
```

**Variables Set:** `project_name`

---

### Step 2: Ask Project Description

```typescript
{
  stepNumber: 2,
  goal: "Get project description and goals",
  stepType: "ask-user",
  config: {
    type: "ask-user",
    question: "Tell me about what you're building. What's the goal?",
    responseType: "string",
    responseVariable: "user_description",
    validation: {
      required: true,
      minLength: 10
    }
  },
  nextStepNumber: 3
}
```

**Variables Set:** `user_description`

---

### Step 3: Scan Codebase

```typescript
{
  stepNumber: 3,
  goal: "Check if existing codebase exists",
  stepType: "execute-action",
  config: {
    type: "execute-action",
    action: {
      type: "scan-codebase",
      path: "{{project_path}}",
      checks: ["has_git", "has_source"],
      output: "codebase_scan"
    }
  },
  nextStepNumber: 4
}
```

**Variables Set:** `codebase_scan` (object with `has_git`, `has_source` booleans)

---

### Step 4: Branch on Codebase Existence (N-Way, Concrete)

```typescript
{
  stepNumber: 4,
  goal: "Determine field type based on codebase scan",
  stepType: "branch",
  config: {
    type: "branch",
    evaluator: {
      type: "concrete",
      variable: "codebase_scan.has_source"
    },
    branches: [
      {
        matchValue: true,
        label: "Existing codebase (brownfield)",
        pattern: {
          type: "sequential-dependencies",
          steps: [
            {
              type: "execute-action",
              action: {
                type: "set-variable",
                variable: "detected_field_type",
                value: "brownfield"
              }
            },
            {
              type: "display-output",
              content: "I see you have an existing codebase. You'll need to run **document-project** before planning."
            }
          ]
        }
      },
      {
        matchValue: false,
        label: "No codebase (greenfield)",
        pattern: {
          type: "sequential-dependencies",
          steps: [
            {
              type: "execute-action",
              action: {
                type: "set-variable",
                variable: "detected_field_type",
                value: "greenfield"
              }
            }
          ]
        }
      }
    ]
  },
  nextStepNumber: 5
}
```

**Variables Set:** `detected_field_type` ("greenfield" | "brownfield")

---

### Step 5: LLM Classifies Complexity (Abstract)

```typescript
{
  stepNumber: 5,
  goal: "Analyze project complexity and recommend track",
  stepType: "llm-generate",
  config: {
    type: "llm-generate",
    llmTask: {
      type: "classification",
      description: "Analyze the project description and classify complexity. Consider keywords like 'dashboard', 'platform', 'fix', 'bug', 'enterprise', 'multi-tenant' to determine appropriate track.",
      input: "{{user_description}}",
      categories: ["quick-flow", "method", "enterprise"],
      reasoning: true
    },
    contextVariables: ["user_description"],
    outputVariable: "recommended_track",
    streaming: false
  },
  nextStepNumber: 6
}
```

**Variables Set:** `recommended_track` ("quick-flow" | "method" | "enterprise")

---

### Step 6: Query Available Workflow Paths

```typescript
{
  stepNumber: 6,
  goal: "Fetch workflow paths matching detected field type",
  stepType: "execute-action",
  config: {
    type: "execute-action",
    action: {
      type: "database",
      operation: "query",
      table: "workflow_paths",
      filter: {
        "tags->>'fieldType'": "{{detected_field_type}}"
      },
      orderBy: "sequence_order",
      output: "available_paths"
    }
  },
  nextStepNumber: 7
}
```

**Variables Set:** `available_paths` (array of workflow_path records)

---

### Step 7: Display Track Options

```typescript
{
  stepNumber: 7,
  goal: "Show available tracks with education text",
  stepType: "display-output",
  config: {
    type: "display-output",
    content: `
# Choose Your Workflow Track

Based on your description, I recommend: **{{recommended_track}}**

Here are your available paths:

{{#each available_paths}}
## {{displayName}} {{#if (eq tags.track ../recommended_track)}}(RECOMMENDED){{/if}}

**Time:** {{estimatedTime}}
**Agent Support:** {{agentSupport}}

{{educationText}}

---
{{/each}}
    `
  },
  nextStepNumber: 8
}
```

---

### Step 8: User Selects Workflow Path

```typescript
{
  stepNumber: 8,
  goal: "User selects their preferred workflow path",
  stepType: "ask-user",
  config: {
    type: "ask-user",
    question: "Which workflow path fits your project?",
    choices: {
      type: "single",
      options: "{{available_paths}}",  // Dynamic from variable
      display: "displayName",          // Show this field
      value: "id"                      // Store this field
    },
    responseType: "choice",
    responseVariable: "selected_workflow_path_id"
  },
  nextStepNumber: 9
}
```

**Variables Set:** `selected_workflow_path_id` (uuid)

---

### Step 9: Optional Product Brief Question (Conditional)

```typescript
{
  stepNumber: 9,
  goal: "Ask if user wants product brief (greenfield Method/Enterprise only)",
  stepType: "branch",
  config: {
    type: "branch",
    evaluator: {
      type: "concrete",
      variable: "detected_field_type"
    },
    branches: [
      {
        matchValue: "greenfield",
        label: "Greenfield - offer product brief",
        pattern: {
          type: "sequential-dependencies",
          steps: [
            {
              type: "ask-user",
              question: "Would you like to create a Product Brief first? (Recommended for strategic planning)",
              responseType: "boolean",
              responseVariable: "product_brief_requested"
            }
          ]
        }
      },
      {
        matchValue: "brownfield",
        label: "Brownfield - skip product brief",
        pattern: {
          type: "sequential-dependencies",
          steps: [
            {
              type: "execute-action",
              action: {
                type: "set-variable",
                variable: "product_brief_requested",
                value: false
              }
            }
          ]
        }
      }
    ]
  },
  nextStepNumber: 10
}
```

**Variables Set:** `product_brief_requested` (boolean)

---

### Step 10: Create Project Record

```typescript
{
  stepNumber: 10,
  goal: "Create project in database with selected workflow path",
  stepType: "execute-action",
  config: {
    type: "execute-action",
    action: {
      type: "database",
      operation: "insert",
      table: "projects",
      values: {
        name: "{{project_name}}",
        path: "{{project_path}}",
        workflowPathId: "{{selected_workflow_path_id}}",
        initializedByExecutionId: "{{execution_id}}"
      },
      output: "project_id"
    }
  },
  nextStepNumber: 11
}
```

**Variables Set:** `project_id` (uuid)

---

### Step 11: Display Success & Next Steps

```typescript
{
  stepNumber: 11,
  goal: "Confirm project creation and show next workflow",
  stepType: "display-output",
  config: {
    type: "display-output",
    content: `
# ✅ Project Initialized Successfully!

**Project:** {{project_name}}
**Path:** {{project_path}}
**Workflow Path:** {{selected_workflow_path_name}}

{{#if product_brief_requested}}
**Next Step:** Create Product Brief
{{else}}
{{#if (eq detected_field_type "brownfield")}}
**Next Step:** Run document-project workflow
{{else}}
**Next Step:** Create PRD or Tech-Spec
{{/if}}
{{/if}}

Your project is ready. Head to the dashboard to begin!
    `
  },
  nextStepNumber: null  // End of workflow
}
```

---

## Variable Flow Summary

### Inputs (from user or system)
- `project_name` - User input (Step 1)
- `user_description` - User input (Step 2)
- `project_path` - System-provided (from UI context)
- `execution_id` - System-generated

### Derived (from workflow execution)
- `codebase_scan` - Execute-action (Step 3)
- `detected_field_type` - Branch result (Step 4)
- `recommended_track` - LLM classification (Step 5)
- `available_paths` - Database query (Step 6)
- `selected_workflow_path_id` - User choice (Step 8)
- `product_brief_requested` - User choice or auto-set (Step 9)
- `project_id` - Database insert (Step 10)

### Final Outputs
- Project created in database
- User knows next workflow to run
- Execution complete

---

## Seed Data: workflow_paths

```typescript
const workflowPaths = [
  {
    name: "quick-flow-greenfield",
    displayName: "Quick Flow (Greenfield)",
    description: "Fast implementation path for new projects",
    educationText: "Tech-spec focused planning. Best for simple features with clear scope. Hours to 1 day of planning. AI agents will have basic context.",
    tags: {
      track: "quick-flow",
      fieldType: "greenfield",
      complexity: "simple"
    },
    recommendedFor: ["fix", "bug", "simple", "add", "quick", "small"],
    estimatedTime: "Hours to 1 day",
    agentSupport: "Basic - minimal context provided",
    sequenceOrder: 1,
  },
  {
    name: "quick-flow-brownfield",
    displayName: "Quick Flow (Brownfield)",
    description: "Fast implementation for existing codebases",
    educationText: "Tech-spec + existing codebase analysis. Best for small additions to existing projects. Hours to 1 day of planning.",
    tags: {
      track: "quick-flow",
      fieldType: "brownfield",
      complexity: "simple"
    },
    recommendedFor: ["fix", "bug", "existing", "modify"],
    estimatedTime: "Hours to 1 day",
    agentSupport: "Basic - minimal context provided",
    sequenceOrder: 2,
  },
  {
    name: "method-greenfield",
    displayName: "BMad Method (Greenfield)",
    description: "Full product planning for new projects (RECOMMENDED)",
    educationText: "PRD + UX + Architecture. Best for products, platforms, and complex features. 1-3 days planning. AI agents get complete context for exceptional code generation.",
    tags: {
      track: "method",
      fieldType: "greenfield",
      complexity: "moderate"
    },
    recommendedFor: ["dashboard", "platform", "product", "multiple features", "complex"],
    estimatedTime: "1-3 days",
    agentSupport: "Exceptional - complete context for AI coding partnership",
    sequenceOrder: 3,
  },
  {
    name: "method-brownfield",
    displayName: "BMad Method (Brownfield)",
    description: "Full planning for complex additions to existing code",
    educationText: "PRD + Architecture creates focused solution design from massive codebase. Best for major refactors, new modules, complex integrations. 1-3 days planning.",
    tags: {
      track: "method",
      fieldType: "brownfield",
      complexity: "moderate"
    },
    recommendedFor: ["existing", "add to", "refactor", "integrate", "complex"],
    estimatedTime: "1-3 days",
    agentSupport: "Exceptional - distills codebase into focused solution design",
    sequenceOrder: 4,
  },
  {
    name: "enterprise-greenfield",
    displayName: "Enterprise Method (Greenfield)",
    description: "Extended planning with security, devops, and test strategy",
    educationText: "BMad Method + Security Architecture + DevOps + Test Strategy. Best for enterprise requirements, compliance, multi-tenant systems. 3-7 days planning.",
    tags: {
      track: "enterprise",
      fieldType: "greenfield",
      complexity: "high"
    },
    recommendedFor: ["enterprise", "multi-tenant", "compliance", "security", "audit"],
    estimatedTime: "3-7 days",
    agentSupport: "Elite - comprehensive enterprise planning",
    sequenceOrder: 5,
  },
  {
    name: "enterprise-brownfield",
    displayName: "Enterprise Method (Brownfield)",
    description: "Enterprise planning for existing systems",
    educationText: "Extended planning for adding enterprise features to existing codebases. Includes security, devops, test strategy. 3-7 days planning.",
    tags: {
      track: "enterprise",
      fieldType: "brownfield",
      complexity: "high"
    },
    recommendedFor: ["enterprise", "existing", "compliance", "add security", "audit"],
    estimatedTime: "3-7 days",
    agentSupport: "Elite - comprehensive planning with codebase integration",
    sequenceOrder: 6,
  },
];
```

---

## Key Architectural Decisions

### 1. No Enums for Methodology Concepts
- ❌ No `projectLevelEnum`, `projectTypeEnum`, `trackEnum`
- ✅ All methodology metadata stored as JSONB tags in `workflow_paths`
- ✅ Enables runtime extensibility without schema migrations

### 2. workflow-init is a First-Class Workflow
- ✅ Stored in `workflows` table with `isProjectInitializer = true`
- ✅ Uses standard step types (ask-user, branch, execute-action, etc.)
- ✅ No special-case code - pure workflow execution

### 3. N-Way Branching
- ✅ Branch steps support multiple outcomes (not binary)
- ✅ Can match multiple values: `matchValue: ["moderate", "complex"]`
- ✅ Both concrete (engine-evaluated) and abstract (LLM-evaluated)

### 4. Concrete vs Abstract Evaluation
- **Concrete**: Fast, deterministic, engine-evaluated
  - Used for: Variable checks, boolean flags, existence checks
- **Abstract**: Flexible, context-aware, LLM-evaluated using ax
  - Used for: Complexity analysis, semantic classification, subjective decisions

### 5. Dynamic Option Presentation
- `AskUserStep` can reference variables for choices: `options: "{{available_paths}}"`
- Enables data-driven UI without hardcoding options
- Workflow paths query result → directly becomes UI cards

---

## Implementation Checklist

### Story 1.3 (Current - Schema Updates)
- [ ] Remove `projectLevelEnum`, `projectTypeEnum`, `fieldTypeEnum`
- [ ] Add `isProjectInitializer`, `isStandalone`, `requiresProjectContext` to `workflows`
- [ ] Add `tags` (JSONB) to `workflow_paths`
- [ ] Add `executedVsPath` (JSONB) to `projects` table
- [ ] Add `initializedByExecutionId` to `projects`
- [ ] Create `workflow_path_workflows` junction table
- [ ] Create `workflow_executions` table with `executedSteps` tracking
- [ ] Create `workflow_templates` table
- [ ] Create `dialog_sessions` table (optional - can defer to Story 1.5)
- [ ] Create migration script

### Story 1.4 (Next - workflow-init Implementation)
- [ ] Seed `workflow-init` workflow definition into database
- [ ] Seed 6 `workflow_paths` (quick-flow, method, enterprise × greenfield/brownfield)
- [ ] Build workflow execution UI wizard
- [ ] Implement Step 5: LLM classification using ax
- [ ] Implement Step 8: Dynamic path cards from DB query
- [ ] Wire up Step 10: Project creation with selected path

### Story 1.5 (Future - Workflow Execution Engine)
- [ ] Implement 8 step type handlers (ask-user, llm-generate, branch, approval-checkpoint, execute-action, invoke-workflow, display-output, question-set)
- [ ] Implement N-way branch evaluator (concrete + abstract)
- [ ] Implement variable resolution system (4-level precedence)
- [ ] Implement workflow pattern execution (sequential, parallel, structured, focused)
- [ ] Add workflow state persistence and resumability
- [ ] Implement `executedSteps` tracking in execution engine
- [ ] Build step-by-step progress UI showing execution timeline

---

## References

- **Workflow Engine Design Brief:** `docs/workflow-engine-design-brief.md`
- **Workflow Engine Structure:** `docs/workflow-engine-structure.md`
- **PRD:** `docs/PRD.md` (FR001-FR045)
- **Architecture Decisions:** `docs/architecture-decisions.md` (ADR log)
- **Archived:** `docs/archive/pre-epic-1-restart/` (old schema and architecture docs)

---

_Snapshot Created: 2025-11-05_
_Authors: Architect (Winston) + Fahad_
