# Epic 1: Database Schema Implementation

**Epic:** Database Schema & Workflow Engine Foundation  
**Status:** Ready for Implementation  
**Author:** Architect (Winston) + Fahad  
**Date:** 2025-11-07

---

## ⚠️ IMPORTANT DISCLAIMER

**Seed data values and exact step configurations in this document are PRELIMINARY and subject to change during implementation.**

When implementing seed files, add TODO comments to indicate which values need verification or adjustment:

```typescript
// TODO: Verify LLM prompt template during implementation
// TODO: Confirm validation rules with PM
// TODO: Test actual file path patterns
```

This is a **working document** that will evolve as we build Epic 1.

---

## Overview

This document provides the **complete implementation specification** for Epic 1's database schema changes and seed data structure. Use this alongside the locked architecture document (`/docs/architecture/database-schema-architecture.md`) to implement Stories 1.1-1.2.

---

## Schema Changes to Existing Files

### 1. `/packages/db/src/schema/workflows.ts`

#### Remove Deprecated Tables

**DELETE these table definitions:**
```typescript
// DELETE: workflow_step_branches table (lines ~115-136)
export const workflowStepBranches = pgTable("workflow_step_branches", { ... });

// DELETE: workflow_step_actions table (lines ~140-161)
export const workflowStepActions = pgTable("workflow_step_actions", { ... });
```

**Rationale:** Branches and actions now stored in `workflow_steps.config` JSONB.

---

#### Update `workflows` Table

**REMOVE:**
```typescript
isProjectInitializer: boolean("is_project_initializer").default(false),
```

**ADD:**
```typescript
initializerType: text("initializer_type"), // "new-project" | "existing-project" | null
```

**ADD UNIQUE CONSTRAINT (after table definition):**
```typescript
// Only one initializer per type per module
// CREATE UNIQUE INDEX unique_initializer_type_per_module 
// ON workflows(module, initializer_type) 
// WHERE initializer_type IS NOT NULL;
```

**Full Updated Table:**
```typescript
export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  module: text("module"), // "bmm", "cis", "custom"
  
  agentId: uuid("agent_id").references(() => agents.id),
  
  // UPDATED: initializerType replaces isProjectInitializer
  initializerType: text("initializer_type"), // "new-project" | "existing-project" | null
  isStandalone: boolean("is_standalone").default(true),
  requiresProjectContext: boolean("requires_project_context").default(false),
  
  outputArtifactType: text("output_artifact_type"),
  outputTemplateId: uuid("output_template_id"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

---

#### Update `workflow_steps` Table

**NO STRUCTURAL CHANGES** - Table stays the same

**UPDATE TYPE DEFINITIONS** - Expand `StepConfig` union type:

```typescript
// ADD these new step config types

type AskUserChatStepConfig = {
  type: "ask-user-chat";
  initialMessage: string;
  systemPrompt: string;
  actions?: Array<{
    trigger: "confidence-low" | "confidence-high" | "on-complete";
    action: SystemAction;
  }>;
  completionCondition: {
    type: "user-satisfied" | "confidence-threshold" | "max-turns";
    threshold?: number;
    maxTurns?: number;
  };
  outputVariable: string;
};

// UPDATE existing AskUserStepConfig to include new fields
type AskUserStepConfig = {
  type: "ask-user";
  message?: string; // NEW: Optional message before question
  question: string;
  
  choices?: {
    type: "single" | "multiple";
    options: Choice[] | string;
    display?: string;
    value?: string;
    allowCustom?: boolean; // NEW: Allow custom input
  };
  
  responseType: "boolean" | "string" | "number" | "choice" | "path"; // NEW: "path" type
  responseVariable: string;
  
  // NEW: Path selector config
  pathConfig?: {
    startPath?: string;
    selectMode: "file" | "directory";
    mustExist?: boolean;
  };
  
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
};

// UPDATE StepConfig union
export type StepConfig =
  | AskUserStepConfig
  | AskUserChatStepConfig // NEW
  | LLMGenerateStepConfig
  | CheckConditionStepConfig
  | ExecuteActionStepConfig
  | InvokeWorkflowStepConfig
  | DisplayOutputStepConfig
  | LoadContextStepConfig;
```

---

### 2. `/packages/db/src/schema/core.ts`

#### Update `projects` Table

**ADD:**
```typescript
userId: text("user_id")
  .notNull()
  .references(() => user.id, { onDelete: "cascade" }),
```

**ADD INDEX:**
```typescript
userIdIdx: index("projects_user_id_idx").on(table.userId),
```

**Full Updated Table:**
```typescript
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    path: text("path").notNull(),
    
    // NEW: User ownership
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    
    workflowPathId: uuid("workflow_path_id")
      .notNull()
      .references(() => workflowPaths.id),
    
    initializedByExecutionId: uuid("initialized_by_execution_id")
      .references(() => workflowExecutions.id),
    
    executedVsPath: jsonb("executed_vs_path")
      .$type<{
        [phase: number]: {
          [workflowName: string]: {
            status: "not-started" | "in-progress" | "completed" | "skipped";
            executionId?: string;
            startedAt?: string;
            completedAt?: string;
            artifactPath?: string;
          };
        };
      }>()
      .default({}),
    
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("projects_name_idx").on(table.name),
    userIdIdx: index("projects_user_id_idx").on(table.userId), // NEW INDEX
    workflowPathIdx: index("projects_workflow_path_idx").on(table.workflowPathId),
  }),
);
```

---

#### Update `appConfig` Table

**ADD:**
```typescript
userId: text("user_id")
  .notNull()
  .unique()
  .references(() => user.id, { onDelete: "cascade" }),
```

**Full Updated Table:**
```typescript
export const appConfig = pgTable("app_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // NEW: User ownership (one config per user)
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  
  openrouterApiKey: text("openrouter_api_key"),
  anthropicApiKey: text("anthropic_api_key"),
  openaiApiKey: text("openai_api_key"),
  
  defaultLlmProvider: text("default_llm_provider").default("openrouter"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

---

## New Seed Files to Create

All seed files follow the existing pattern in `/packages/scripts/src/seeds/`.

### 1. `/packages/scripts/src/seeds/workflow-init-new.ts`

**Purpose:** Seed the workflow-init-new workflow and its 10 steps.

**Structure:**
```typescript
import { db, workflows, workflowSteps, agents } from "@chiron/db";

// Get PM agent ID
async function getPMAgentId(): Promise<string> {
  const agent = await db.query.agents.findFirst({
    where: (agents, { eq }) => eq(agents.name, "pm"),
  });
  if (!agent) throw new Error("PM agent not found");
  return agent.id;
}

export async function seedWorkflowInitNew() {
  const pmAgentId = await getPMAgentId();
  
  // Insert workflow
  const [workflow] = await db
    .insert(workflows)
    .values({
      name: "workflow-init-new",
      displayName: "Initialize New Project",
      description: "Guided project setup for new greenfield projects",
      module: "bmm",
      agentId: pmAgentId,
      initializerType: "new-project",
      isStandalone: true,
      requiresProjectContext: false,
      outputArtifactType: null,
      outputTemplateId: null,
    })
    .returning()
    .onConflictDoNothing();
  
  if (!workflow) {
    console.log("  ⚠️  workflow-init-new already exists, skipping");
    return;
  }
  
  // Insert 10 steps
  const steps = [
    {
      stepNumber: 1,
      goal: "Get project directory location from user",
      stepType: "ask-user",
      config: {
        type: "ask-user",
        message: "Let's set up your project! First, I need to know where you want to create it.",
        question: "Select your project directory",
        responseType: "path",
        responseVariable: "project_path",
        pathConfig: {
          selectMode: "directory",
          mustExist: false,
        },
        validation: {
          required: true,
        },
      },
      nextStepNumber: 2,
    },
    {
      stepNumber: 2,
      goal: "Get detailed project description from user",
      stepType: "ask-user",
      config: {
        type: "ask-user",
        message: "Great! Now tell me about your project.",
        question: "What are you building? What's the goal?",
        responseType: "string",
        responseVariable: "user_description",
        validation: {
          required: true,
          minLength: 20, // TODO: Verify minimum length with PM
          maxLength: 1000,
        },
      },
      nextStepNumber: 3,
    },
    {
      stepNumber: 3,
      goal: "Set field type to greenfield",
      stepType: "execute-action",
      config: {
        type: "execute-action",
        actions: [
          {
            type: "set-variable",
            config: {
              variable: "detected_field_type",
              value: "greenfield",
            },
          },
          {
            type: "set-variable",
            config: {
              variable: "fieldType_tag_key",
              value: "fieldType",
            },
          },
        ],
        executionMode: "sequential",
      },
      nextStepNumber: 4,
    },
    {
      stepNumber: 4,
      goal: "Analyze project complexity and recommend track",
      stepType: "llm-generate",
      config: {
        type: "llm-generate",
        llmTask: {
          type: "classification",
          description: `Analyze the project description and classify complexity. 
          
Consider:
- "quick-flow" for: bugs, fixes, small features, simple additions
- "method" for: dashboards, platforms, products, multiple features
- "enterprise" for: multi-tenant, compliance, security-critical, large-scale systems

Return one of: quick-flow, method, enterprise`,
          input: "{{user_description}}",
          categories: ["quick-flow", "method", "enterprise"],
          reasoning: true,
        },
        contextVariables: ["user_description"],
        outputVariable: "recommended_track",
        streaming: false,
        signatureConfig: {
          schema: {
            type: "object",
            properties: {
              track: { 
                type: "string", 
                enum: ["quick-flow", "method", "enterprise"] 
              },
              reasoning: { type: "string" },
            },
            required: ["track", "reasoning"],
          },
          reasoning: true,
        },
      },
      nextStepNumber: 5,
    },
    {
      stepNumber: 5,
      goal: "Fetch workflow paths matching greenfield field type",
      stepType: "execute-action",
      config: {
        type: "execute-action",
        actions: [
          {
            type: "database",
            config: {
              operation: "query",
              table: "workflow_paths",
              filter: {
                "tags->>'fieldType'": "{{detected_field_type}}",
              },
              orderBy: ["sequence_order"],
              output: "available_paths",
            },
          },
        ],
        executionMode: "sequential",
      },
      nextStepNumber: 6,
    },
    {
      stepNumber: 6,
      goal: "Help user choose workflow path through guided conversation",
      stepType: "ask-user-chat",
      config: {
        type: "ask-user-chat",
        initialMessage: `Based on your description, I recommend the **{{recommended_track.track}}** track.

Here's why:
{{recommended_track.reasoning}}

I can walk you through the available paths, or you can choose directly. What would you like to know?`,
        systemPrompt: `You are helping the user select a workflow path for their project.

Available paths (from available_paths variable):
{{#each available_paths}}
- **{{displayName}}**: {{description}}
  - Time: {{estimatedTime}}
  - Agent Support: {{agentSupport}}
  - Tags: {{tags}}
{{/each}}

Recommended: {{recommended_track.track}}

Guide the user toward the right choice. Answer questions about tracks, compare options, and help them understand tradeoffs. When they're ready to choose, confirm their selection.`,
        actions: [
          {
            trigger: "confidence-high",
            action: {
              type: "set-variable",
              config: {
                variable: "path_selection_confidence",
                value: "high",
              },
            },
          },
        ],
        completionCondition: {
          type: "user-satisfied",
          maxTurns: 10, // TODO: Test actual conversation flow
        },
        outputVariable: "selected_workflow_path_id",
      },
      nextStepNumber: 7,
    },
    {
      stepNumber: 7,
      goal: "Generate project name suggestions",
      stepType: "llm-generate",
      config: {
        type: "llm-generate",
        llmTask: {
          type: "structured",
          description: `Generate 3 project name suggestions based on the user's project description.

Requirements:
- Lowercase, kebab-case (e.g., "task-manager", "awesome-dashboard")
- Descriptive but concise (2-3 words max)
- No special characters except hyphens
- Professional and memorable

Return array of 3 name suggestions.`,
          input: "{{user_description}}",
          schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 3,
              },
            },
            required: ["suggestions"],
          },
        },
        contextVariables: ["user_description"],
        outputVariable: "name_suggestions",
        streaming: false,
        signatureConfig: {
          schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: { 
                  type: "string",
                  pattern: "^[a-z0-9-]+$",
                },
              },
            },
          },
        },
      },
      nextStepNumber: 8,
    },
    {
      stepNumber: 8,
      goal: "User selects project name from suggestions or provides custom name",
      stepType: "ask-user",
      config: {
        type: "ask-user",
        message: "Here are some name suggestions based on your description:",
        question: "Choose a project name or enter your own",
        choices: {
          type: "single",
          options: "{{name_suggestions.suggestions}}",
          allowCustom: true,
        },
        responseType: "choice",
        responseVariable: "project_name",
        validation: {
          required: true,
          pattern: "^[a-z0-9-]+$",
          minLength: 3,
          maxLength: 50,
        },
      },
      nextStepNumber: 9,
    },
    {
      stepNumber: 9,
      goal: "Create project directory, initialize git, and create database record",
      stepType: "execute-action",
      config: {
        type: "execute-action",
        actions: [
          {
            type: "file",
            config: {
              operation: "mkdir",
              path: "{{project_path}}/{{project_name}}",
              recursive: true,
            },
          },
          {
            type: "git",
            config: {
              operation: "init",
              path: "{{project_path}}/{{project_name}}",
            },
          },
          {
            type: "database",
            config: {
              operation: "insert",
              table: "projects",
              values: {
                name: "{{project_name}}",
                path: "{{project_path}}/{{project_name}}",
                userId: "{{current_user_id}}",
                workflowPathId: "{{selected_workflow_path_id}}",
                initializedByExecutionId: "{{execution_id}}",
              },
              output: "project_id",
            },
          },
        ],
        executionMode: "sequential",
      },
      nextStepNumber: 10,
    },
    {
      stepNumber: 10,
      goal: "Confirm project creation and show next steps",
      stepType: "display-output",
      config: {
        type: "display-output",
        content: `# ✅ Project Initialized Successfully!

**Project Name:** {{project_name}}  
**Location:** {{project_path}}/{{project_name}}  
**Workflow Path:** {{selected_workflow_path.displayName}}

## What's Next?

Your project is ready to begin. Head to the dashboard to start your first workflow.

{{#if (eq recommended_track.track "method")}}
**Recommended First Step:** Create Product Brief or PRD
{{else if (eq recommended_track.track "quick-flow")}}
**Recommended First Step:** Create Tech-Spec
{{else}}
**Recommended First Step:** Review Enterprise Planning Workflows
{{/if}}

Good luck with your project! 🚀`,
      },
      nextStepNumber: null,
    },
  ];
  
  for (const step of steps) {
    await db.insert(workflowSteps).values({
      workflowId: workflow.id,
      ...step,
    });
  }
  
  console.log("  ✓ workflow-init-new (10 steps)");
}
```

---

### 2. `/packages/scripts/src/seeds/workflow-init-existing.ts`

**Purpose:** Seed the workflow-init-existing workflow for brownfield projects.

**Status:** TBD - Define steps during Story 1.2

**Placeholder Structure:**
```typescript
import { db, workflows, workflowSteps, agents } from "@chiron/db";

export async function seedWorkflowInitExisting() {
  // TODO: Define workflow-init-existing steps
  // Key differences from workflow-init-new:
  // - Step 3: Scan existing codebase (has_git, has_source, has_package_json)
  // - Step 4: Branch on codebase scan results
  // - Add steps for document-project workflow suggestion
  
  console.log("  ⚠️  workflow-init-existing not yet defined");
}
```

---

### 3. `/packages/scripts/src/seeds/workflow-paths-bmm.ts`

**Purpose:** Seed 6 BMM workflow paths (quick-flow, method, enterprise × greenfield/brownfield).

**Structure:**
```typescript
import { db, workflowPaths } from "@chiron/db";

const BMM_WORKFLOW_PATHS = [
  {
    name: "quick-flow-greenfield",
    displayName: "Quick Flow (Greenfield)",
    description: "Fast implementation path for new projects",
    educationText: "Tech-spec focused planning. Best for simple features with clear scope. Hours to 1 day of planning. AI agents will have basic context.",
    tags: {
      track: "quick-flow",
      fieldType: "greenfield",
      complexity: "simple",
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
      complexity: "simple",
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
      complexity: "moderate",
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
      complexity: "moderate",
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
      complexity: "high",
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
      complexity: "high",
    },
    recommendedFor: ["enterprise", "existing", "compliance", "add security", "audit"],
    estimatedTime: "3-7 days",
    agentSupport: "Elite - comprehensive planning with codebase integration",
    sequenceOrder: 6,
  },
];

export async function seedWorkflowPathsBMM() {
  for (const path of BMM_WORKFLOW_PATHS) {
    await db
      .insert(workflowPaths)
      .values(path)
      .onConflictDoNothing();
    
    console.log(`  ✓ ${path.name}`);
  }
}
```

**Note:** `recommendedFor` values are PRELIMINARY. Test actual keyword matching during implementation.

---

### 4. `/packages/scripts/src/seeds/workflow-path-workflows.ts`

**Purpose:** Map workflows to paths by phase.

**Status:** TBD - Define after workflows are finalized

**Placeholder Structure:**
```typescript
import { db, workflowPathWorkflows, workflowPaths, workflows } from "@chiron/db";

// Helper to get workflow path ID
async function getPathId(pathName: string): Promise<string | null> {
  const path = await db.query.workflowPaths.findFirst({
    where: (paths, { eq }) => eq(paths.name, pathName),
  });
  return path?.id ?? null;
}

// Helper to get workflow ID
async function getWorkflowId(workflowName: string): Promise<string | null> {
  const workflow = await db.query.workflows.findFirst({
    where: (workflows, { eq }) => eq(workflows.name, workflowName),
  });
  return workflow?.id ?? null;
}

export async function seedWorkflowPathWorkflows() {
  // TODO: Define workflow mappings after Story 1.2
  // Example structure:
  
  // const methodGreenfieldId = await getPathId("method-greenfield");
  // const createPRDId = await getWorkflowId("prd");
  
  // await db.insert(workflowPathWorkflows).values({
  //   workflowPathId: methodGreenfieldId,
  //   workflowId: createPRDId,
  //   phase: 2, // Planning
  //   sequenceOrder: 1,
  //   isOptional: false,
  //   isRecommended: true,
  // });
  
  console.log("  ⚠️  workflow-path-workflows mapping not yet defined");
}
```

---

## Update Main Seed Script

**File:** `/packages/scripts/src/seed.ts` (or wherever main seed script is)

**ADD imports:**
```typescript
import { seedWorkflowInitNew } from "./seeds/workflow-init-new";
import { seedWorkflowInitExisting } from "./seeds/workflow-init-existing";
import { seedWorkflowPathsBMM } from "./seeds/workflow-paths-bmm";
import { seedWorkflowPathWorkflows } from "./seeds/workflow-path-workflows";
```

**ADD to seed execution:**
```typescript
// After existing seeds...
console.log("\n🌱 Seeding workflow initializers...");
await seedWorkflowInitNew();
await seedWorkflowInitExisting();

console.log("\n🌱 Seeding BMM workflow paths...");
await seedWorkflowPathsBMM();

console.log("\n🌱 Seeding workflow-path-workflows junction...");
await seedWorkflowPathWorkflows();
```

---

## Implementation Notes

### Step Type Handlers (Story 1.3+)

When implementing the workflow execution engine, each step type needs a handler:

1. **ask-user** → Render form, validate, store in variables
2. **ask-user-chat** → Initialize chat session, handle side effects
3. **llm-generate** → Call LLM provider, parse structured output
4. **branch** → Evaluate condition, select branch, execute inline steps
5. **approval-checkpoint** → Render preview, await approval
6. **execute-action** → Execute actions (file, git, database, set-variable)
7. **invoke-workflow** → Spawn sub-workflow, await completion
8. **display-output** → Render markdown with variable interpolation

### Variable Resolution (Story 1.3+)

Variables referenced in configs use Handlebars syntax: `{{variable_name}}`

**Resolution order:**
1. System variables (`current_user_id`, `execution_id`)
2. Workflow execution variables (`workflow_executions.variables`)
3. Step outputs (`executedSteps[N].output`)
4. Config defaults

### JSONB Query Patterns

**Filter workflow paths by tags:**
```sql
SELECT * FROM workflow_paths 
WHERE tags->>'fieldType' = 'greenfield'
  AND tags->>'track' = 'method';
```

**Track step execution:**
```sql
UPDATE workflow_executions 
SET executed_steps = jsonb_set(
  executed_steps,
  '{5}',
  '{"status": "completed", "startedAt": "...", "completedAt": "...", "output": {...}}'
)
WHERE id = '...';
```

---

## Testing Strategy

### Schema Changes
- [ ] Test all foreign key constraints
- [ ] Verify unique constraints (userId on app_config)
- [ ] Test JSONB queries with GIN indexes
- [ ] Verify cascade deletes work correctly

### Seed Data
- [ ] All seeds run without errors
- [ ] workflow-init-new creates 10 steps
- [ ] workflow paths have correct tags
- [ ] Agent assignments are correct

### Integration
- [ ] workflow-init-new can be loaded from database
- [ ] Step configs parse correctly
- [ ] Variable interpolation works ({{variable}})
- [ ] JSONB filtering returns expected paths

---

## Story Breakdown Suggestion

**Story 1.1: Schema Implementation**
- Update workflows, projects, app_config tables
- Remove workflow_step_branches, workflow_step_actions
- Add TypeScript types for new step configs
- Test migrations locally

**Story 1.2: Seed Data**
- Create workflow-init-new seed
- Create workflow-paths-bmm seed
- Update main seed script
- Test seeding on clean database

**Story 1.3+: Execution Engine**
- Implement step type handlers
- Build workflow UI wizard
- Implement variable resolution
- Add executedSteps tracking

**Story 1.6: Mastra + Ax Integration with Approval Gates**
- Install Mastra (@mastra/core, @mastra/pg, @mastra/memory, @mastra/evals) and Ax (@ax-llm/ax)
- Configure Mastra PostgreSQL storage (mastra.* schema)
- Implement ACE optimizer for PM Agent (online learning from rejections)
- Add database schema: agents.instructions, ace_playbooks, mipro_training_examples
- Build approval gate UI with side effects (update_summary, update_complexity tools)
- Implement data collection (save approved outputs for MiPRO Phase 2)
- **Add Anthropic API key configuration to Settings UI**
  - Update settings router with Anthropic endpoints (getAnthropicKey, saveAnthropicKey, testAnthropicKey)
  - Add Anthropic API key card to Settings page
  - Add link to Anthropic API key setup guide (https://console.anthropic.com/settings/keys)
  - List available Anthropic models in UI (claude-3-5-sonnet, claude-3-7-sonnet, claude-opus-4, etc.)
  - Update environment variable documentation (.env.example files)
- Testing: Test approval flow, rejection flow (ACE learning), example collection

---

## Questions for PM/Team

- [ ] Validate minLength values (e.g., description min 20 chars)
- [ ] Confirm LLM classification prompt wording
- [ ] Test actual conversation flow for ask-user-chat (maxTurns = 10?)
- [ ] Verify project name validation pattern (^[a-z0-9-]+$)
- [ ] Confirm workflow path education text accuracy

---

**Status:** Ready for Story 1.1 Implementation  
**Last Updated:** 2025-11-07  
**Next:** Begin schema changes, then seed file creation
