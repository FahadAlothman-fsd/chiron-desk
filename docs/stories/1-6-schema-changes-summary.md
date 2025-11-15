# Story 1.6 - Database Schema Changes Summary

## 📊 Overview

**3 Files Modified** + **1 New File Created** = **2 New Tables** + **Major Step Config Expansion**

---

## 🆕 New File: `packages/db/src/schema/ace.ts`

### **Table 1: `ace_playbooks`** - Online Learning Storage

Stores learned patterns from user feedback using ACE (Agentic Context Engineering) optimizer.

```typescript
CREATE TABLE ace_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Scope system: global (all users) | user (personal) | project (project-specific)
  scope TEXT NOT NULL DEFAULT 'global',
  user_id TEXT REFERENCES user(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Structured playbook content
  playbook JSONB NOT NULL DEFAULT '{"sections": {}}',
  
  -- Version control
  version INTEGER NOT NULL DEFAULT 1,
  total_updates INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

**Indexes:**
- `idx_ace_playbooks_agent_id` - Fast lookup by agent
- `idx_ace_playbooks_agent_scope` - Composite for scope-specific queries
- `idx_ace_playbooks_user_id` - User-scoped playbooks
- `idx_ace_playbooks_project_id` - Project-scoped playbooks

**Playbook JSONB Structure:**
```json
{
  "sections": {
    "Summary Generation": {
      "bullets": [
        "• Include timeline details when users mention 'when'",
        "• Mention key stakeholders explicitly",
        "• Always specify technology stack if discussed"
      ]
    },
    "Complexity Classification": {
      "bullets": [
        "• Consider team size: solo = quick-flow, 2-5 = method, 6+ = enterprise",
        "• Factor in compliance needs (HIPAA, SOC2, etc.)",
        "• Legacy system integration increases complexity"
      ]
    }
  }
}
```

**Purpose:** 
- **Online learning** - Updates happen in production when users reject AI outputs
- **Incremental deltas** - New bullets added, not full rewrites (prevents context collapse)
- **Scope flexibility** - Can learn globally (all users), per-user (personalized), or per-project

---

### **Table 2: `mipro_training_examples`** - Offline Optimization Data

Collects approved AI outputs for future batch optimization using MiPRO.

```typescript
CREATE TABLE mipro_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tool_name TEXT NOT NULL,  -- e.g., "update_summary", "update_complexity"
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Training pair
  input JSONB NOT NULL,           -- What was sent to AI
  expected_output JSONB NOT NULL, -- What user approved
  
  -- Learning metadata
  rejection_history JSONB DEFAULT '[]',  -- Previous rejections before approval
  scorer_results JSONB DEFAULT '{}',     -- Quality metrics from Mastra evals
  
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

**Indexes:**
- `idx_mipro_training_tool_name` - Query examples by tool
- `idx_mipro_training_agent_id` - Query all examples for agent
- `idx_mipro_training_created_at` - Time-based queries (recent examples)

**Input JSONB Structure:**
```json
{
  "conversation_history": "User: I'm building a healthcare app...\nAgent: Tell me more...",
  "ace_context": "LEARNED PATTERNS: • Include HIPAA considerations...",
  "variables": {
    "detected_field_type": "greenfield",
    "project_type": "healthcare"
  }
}
```

**Expected Output JSONB Structure:**
```json
{
  "project_description": "A HIPAA-compliant healthcare task management system...",
  "reasoning": "Included timeline, stakeholders, and compliance needs"
}
```

**Rejection History JSONB:**
```json
[
  {
    "feedback": "Too vague - needs more technical detail",
    "rejectedAt": "2025-11-13T10:23:45Z",
    "previousOutput": {
      "project_description": "A healthcare app"
    }
  },
  {
    "feedback": "Missing HIPAA compliance mention",
    "rejectedAt": "2025-11-13T10:25:12Z",
    "previousOutput": {
      "project_description": "A healthcare task management system for nurses"
    }
  }
]
```

**Purpose:**
- **Offline optimization** - MiPRO runs periodically to find optimal prompts
- **Rejection tracking** - Learns from what DIDN'T work
- **Quality scoring** - Integrates with Mastra evals for automatic quality metrics

---

## ✏️ Modified File 1: `packages/db/src/schema/agents.ts`

### **Added Field: `instructions`**

```diff
  llm_model       text NOT NULL,
  llm_temperature text,
+ instructions    text,        -- NEW! Multi-line agent system prompt
  tools           jsonb,
```

**What This Enables:**
- PM Agent can have a detailed system prompt stored in database (not hardcoded)
- ACE playbook gets **injected at runtime** into instructions
- Instructions can be updated without code changes

**Example Usage:**
```typescript
// In database:
agents.instructions = `
You are Athena, the Product Manager AI.
Your role is to guide users through project initialization.

Ask clarifying questions about:
- Project goals and timeline
- Key stakeholders
- Technical constraints
- Budget and resources

Use the tools when you have enough information.
`;

// At runtime (in AskUserChatStepHandler):
const playbook = await aceOptimizer.loadPlaybook(agentId);
const fullInstructions = `
${agent.instructions}

${aceOptimizer.formatPlaybookForPrompt(playbook)}
`;
// Result includes learned patterns appended to base instructions
```

---

## ✏️ Modified File 2: `packages/db/src/schema/step-configs.ts`

### **Massive Expansion of `AskUserChatStepConfig`**

#### **Before (Story 1.5):**
```typescript
export const askUserChatStepConfigSchema = z.object({
  systemPrompt: z.string(),
  initialMessage: z.string(),
  outputVariable: z.string(),
  completionCondition: z.object({
    type: z.enum(["user-satisfied", "confidence-threshold", "max-turns"]),
    threshold: z.number().optional(),
    maxTurns: z.number().optional(),
  }),
});
```

#### **After (Story 1.6):**
```typescript
export const askUserChatStepConfigSchema = z.object({
  agentId: z.string().uuid(),              // Reference to agents table
  initialMessage: z.string().optional(),   // Optional greeting message
  
  // 🆕 DYNAMIC TOOL CONFIGURATION
  tools: z.array(z.object({
    name: z.string(),
    toolType: z.enum(["ax-generation", "database-query", "custom"]),
    requiredVariables: z.array(z.string()).optional(),
    requiresApproval: z.boolean().optional(),
    
    // Ax-generation specific (LLM-powered tools)
    axSignature: z.object({
      input: z.array(z.object({
        name: z.string(),
        type: z.string(),
        source: z.enum(["variable", "context", "literal", "playbook"]),
        variableName: z.string().optional(),
        defaultValue: z.unknown().optional(),
        description: z.string(),
        internal: z.boolean().optional(),  // Hide from approval UI
      })),
      output: z.array(z.object({
        name: z.string(),
        type: z.string(),
        description: z.string(),
        internal: z.boolean().optional(),
      })),
      strategy: z.enum(["ChainOfThought", "Predict"]),
    }).optional(),
    
    // Database-query specific
    databaseQuery: z.object({
      table: z.string(),
      filters: z.array(z.object({
        field: z.string(),              // Supports JSONB: "tags->>'complexity'"
        operator: z.enum(["eq", "contains", "gt", "lt"]),
        value: z.string(),              // Can use {{variable}} syntax
      })),
      outputVariable: z.string(),
    }).optional(),
    
    // Custom tool specific
    customToolHandler: z.string().optional(),
  })).optional(),
  
  // 🆕 COMPLETION CONDITIONS
  completionCondition: z.object({
    type: z.enum([
      "user-satisfied",
      "all-tools-approved",         // NEW! Wait for all tools
      "confidence-threshold",
      "max-turns",
    ]),
    requiredTools: z.array(z.string()).optional(),  // List of tool names
    threshold: z.number().optional(),
    maxTurns: z.number().optional(),
  }),
  
  // 🆕 OUTPUT VARIABLE MAPPING
  outputVariables: z.record(z.string(), z.string()).optional(),
  // Maps: { "project_description": "approval_states.update_summary.value" }
});
```

---

## 🔑 Key Changes Explained

### **1. Changed: `systemPrompt` → `agentId`**

**Before:** System prompt embedded in step config  
**After:** Reference to agent in database (with instructions field)

**Why?**  
- Agents are reusable across steps
- Instructions can include ACE playbook at runtime
- Easier to update agent behavior without changing workflow configs

---

### **2. Added: `tools` Array** - The Game Changer! 🎯

This is the **CORE INNOVATION** of Story 1.6. Tools are now:

- **Dynamically built from JSONB config** (not hardcoded)
- **Three types supported:**
  1. **`ax-generation`** - LLM-powered tools using Ax signatures
  2. **`database-query`** - SQL queries with JSONB support
  3. **`custom`** - Custom TypeScript handlers

**Tool Type 1: Ax-Generation Example**
```typescript
{
  name: "update_summary",
  toolType: "ax-generation",
  requiredVariables: ["conversation_history"],
  requiresApproval: true,
  axSignature: {
    input: [
      {
        name: "conversation_history",
        type: "string",
        source: "context",           // From Mastra thread
        description: "Chat history"
      },
      {
        name: "ace_context",
        type: "string",
        source: "playbook",          // From ACE playbook
        description: "Learned patterns"
      }
    ],
    output: [
      {
        name: "project_description",
        type: "string",
        description: "Generated summary"
      },
      {
        name: "reasoning",
        type: "string",
        description: "Why this summary",
        internal: true               // Hidden from approval UI
      }
    ],
    strategy: "ChainOfThought"       // Show reasoning process
  }
}
```

**Tool Type 2: Database-Query Example**
```typescript
{
  name: "fetch_workflow_paths",
  toolType: "database-query",
  requiredVariables: ["complexity_classification"],
  databaseQuery: {
    table: "workflow_paths",
    filters: [
      {
        field: "tags->>'fieldType'",              // JSONB path query!
        operator: "eq",
        value: "{{detected_field_type}}"          // Variable substitution
      },
      {
        field: "tags->>'complexity'",
        operator: "eq",
        value: "{{complexity_classification}}"
      }
    ],
    outputVariable: "available_workflow_paths"
  }
}
```

**Tool Type 3: Custom Example**
```typescript
{
  name: "select_workflow_path",
  toolType: "custom",
  requiredVariables: ["available_workflow_paths"],
  customToolHandler: "select-workflow-path-tool"  // References handler file
}
```

---

### **3. Added: Input Source Types** - Flexible Data Resolution

**Four source types:**

| Source | Description | Example |
|--------|-------------|---------|
| `variable` | From `workflow_executions.variables` | `detected_field_type: "greenfield"` |
| `context` | From Mastra conversation thread | Full chat history |
| `literal` | Static value from config | `defaultValue: "unknown"` |
| `playbook` | From ACE playbook (learned patterns) | Formatted bullets |

**Why This Matters:**
- Tools can pull data from **anywhere**
- ACE playbook automatically injected when source: "playbook"
- Conversation history automatically fetched when source: "context"

---

### **4. Added: Completion Condition `all-tools-approved`**

**Before:** Step completes when user clicks "Done"  
**After:** Step completes when **all required tools have been approved**

```typescript
completionCondition: {
  type: "all-tools-approved",
  requiredTools: [
    "update_summary",
    "update_complexity",
    "select_workflow_path",
    "generate_project_name"
  ]
}
```

**Step Completion Logic:**
```typescript
// Pseudo-code in AskUserChatStepHandler
function checkCompletion(execution) {
  if (config.completionCondition.type === "all-tools-approved") {
    const requiredTools = config.completionCondition.requiredTools;
    const approvalStates = execution.variables.approval_states;
    
    return requiredTools.every(toolName => 
      approvalStates[toolName]?.status === "approved"
    );
  }
}
```

---

### **5. Added: Output Variables Mapping**

Maps approval state paths to workflow variables:

```typescript
outputVariables: {
  "project_description": "approval_states.update_summary.value",
  "complexity_classification": "approval_states.update_complexity.value",
  "selected_workflow_path_id": "approval_states.select_workflow_path.value",
  "project_name": "approval_states.generate_project_name.value"
}
```

**Why?**
- Clean abstraction: Step handler knows what to extract
- Approval states stored in `workflow_executions.variables.approval_states`
- Final values promoted to top-level variables for next steps

---

## ✏️ Modified File 3: `packages/db/src/schema/index.ts`

```diff
+ // ACE playbooks and MiPRO training examples
+ export * from "./ace";
  // Agent definitions
  export * from "./agents";
```

Simple export so services can import ACE tables:
```typescript
import { acePlaybooks, miproTrainingExamples } from "@chiron/db/schema";
```

---

## 🎯 Schema Change Impact Summary

### **What These Changes Enable:**

✅ **Configuration-Driven Architecture**
- Tools defined in JSONB, not hardcoded
- Workflows are data, not code
- Changes don't require deployments

✅ **Online Learning (ACE)**
- User rejections → playbook updates
- Playbook injected into agent instructions
- Learns in production

✅ **Offline Optimization (MiPRO)**
- Approved outputs saved as training data
- Rejection history tracked for analysis
- Future batch optimization supported

✅ **Flexible Tool Building**
- 3 tool types: LLM (Ax), Database, Custom
- 4 input sources: variable, context, literal, playbook
- JSONB queries with variable substitution

✅ **Human-in-the-Loop Approval Gates**
- Tools pause for user approval
- Feedback collected on rejection
- ACE learns from feedback

✅ **Multi-Scope Learning**
- Global playbooks (all users)
- User-scoped playbooks (personalized)
- Project-scoped playbooks (team-specific)

---

## 📊 Database Table Relationships

```
agents
  ├─→ ace_playbooks (agent_id)
  │     ├─→ user (user_id) [optional]
  │     └─→ projects (project_id) [optional]
  │
  ├─→ mipro_training_examples (agent_id)
  │
  └─→ workflows (agent_id)
        └─→ workflow_steps
              └─→ config JSONB (AskUserChatStepConfig)

workflow_executions
  ├─→ workflows (workflow_id)
  ├─→ agents (agent_id)
  └─→ variables JSONB:
        ├─ approval_states:
        │    ├─ update_summary: { status, value, reasoning, rejection_history }
        │    ├─ update_complexity: { ... }
        │    └─ ...
        └─ [other runtime variables]
```

---

## 🔢 Statistics

| Metric | Count |
|--------|-------|
| **New Tables** | 2 (ace_playbooks, mipro_training_examples) |
| **New Columns** | 1 (agents.instructions) |
| **Modified Schemas** | 3 files |
| **New Schema File** | 1 (ace.ts) |
| **New Indexes** | 7 total (4 ACE + 3 MiPRO) |
| **New Zod Fields** | 15+ in AskUserChatStepConfig |
| **JSONB Structures** | 4 (playbook, input, expected_output, rejection_history) |
| **Tool Types Supported** | 3 (ax-generation, database-query, custom) |
| **Input Source Types** | 4 (variable, context, literal, playbook) |
| **Completion Condition Types** | 4 (was 3, added all-tools-approved) |

---

## 🚀 Next Steps

**These schemas enable Task 3+:**
- Task 3: AskUserChatStepHandler (reads tool config, builds tools)
- Task 4: Ax-Generation Tool Builder (uses axSignature config)
- Task 5: Database-Query Tool Builder (uses databaseQuery config)
- Task 6: Custom Tool Builder (uses customToolHandler config)
- Task 7: Approval APIs (read/write approval_states)
- Task 12: Seed PM Agent instructions + Step 3 tool config

**The foundation is SOLID!** 🎉
