# Chiron Tool Types Reference

**Date:** December 1, 2025  
**Status:** Production Documentation  
**Last Updated:** Dec 1, 2025

---

## Overview

Chiron's workflow engine uses **Tool Types** to define how agents interact with workflows. Tools are executable actions that agents can call during `ask-user-chat` steps to gather information, generate content, or update variables.

### Tool Type Categories

1. **`ax-generation`** - AI-powered content generation using DSPy/Ax signatures
2. **`update-variable`** - Direct variable updates without LLM generation
3. **`execute-action`** (Future) - System operations (covered in CANONICAL-WORKFLOW-SCHEMA.md)

---

## Tool Type 1: `ax-generation`

### Purpose

Generate structured content using AI (via DSPy/Ax signatures) with approval gates and automatic field extraction.

### When to Use

- AI needs to generate/analyze content from conversation
- Output requires human approval before proceeding
- Need structured data extraction (classifications, summaries, selections)
- Want to provide multiple suggestions for user to choose from

### Schema

```typescript
{
  toolName: string,              // Unique tool identifier
  toolType: "ax-generation",
  description: string,           // What this tool does (shown to agent)
  
  // Prerequisites
  requiredVariables?: string[],  // Variables that must exist before calling
  
  // Ax Signature Configuration
  axSignature: {
    signatureName: string,       // DSPy signature to use
    
    // Inputs to the signature
    input: Array<{
      name: string,              // Input parameter name
      type: "string" | "json" | "number" | "boolean",
      source: "variable" | "conversation" | "static",
      
      // For variable source
      variableName?: string,
      
      // For static source
      staticValue?: any,
      
      // NEW: Token optimization
      selectFields?: string[],   // Filter JSON fields before sending to LLM
    }>,
    
    // Outputs from the signature
    output: Array<{
      name: string,              // Output field name
      type: "string" | "json" | "number" | "boolean" | "class",
      
      // For classification/selection outputs
      classesFrom?: {
        source: string,          // Variable containing options array
        field: string,           // Field to use as class value
      },
      
      // NEW: Derived variables (computed, not generated)
      extractFrom?: {
        source: string,          // Variable containing options array
        matchField: string,      // Field to match on
        matchValue: string,      // Variable containing selected value
        selectField: string,     // Field to extract
      }
    }>
  }
}
```

### Input Schema Pattern

**Important:** `ax-generation` tools have **empty input schemas** - the agent calls them with no parameters:

```typescript
inputSchema: z.object({})  // Agent provides NO inputs
```

All inputs are resolved from the execution context using the `axSignature.input` configuration.

### Examples

#### Example 1: Simple Generation (Project Summary)

```typescript
{
  toolName: "generate_summary",
  toolType: "ax-generation",
  description: "Generate a concise project summary based on the user's description",
  
  requiredVariables: ["project_description"],
  
  axSignature: {
    signatureName: "GenerateProjectSummary",
    input: [
      {
        name: "description",
        type: "string",
        source: "variable",
        variableName: "project_description"
      }
    ],
    output: [
      {
        name: "project_summary",
        type: "string"
      }
    ]
  }
}
```

**Agent calls:** `generate_summary()` (no parameters)  
**Engine resolves:** Gets `project_description` from variables  
**Ax generates:** `project_summary` string  
**User approves:** Summary saved to `execution.variables.project_summary`

---

#### Example 2: Classification with Classes

```typescript
{
  toolName: "select_workflow_path",
  toolType: "ax-generation",
  description: "Recommend and select the best workflow path based on project needs",
  
  requiredVariables: ["project_description", "workflow_path_options"],
  
  axSignature: {
    signatureName: "SelectWorkflowPath",
    input: [
      {
        name: "project_description",
        type: "string",
        source: "variable",
        variableName: "project_description"
      },
      {
        name: "workflow_paths",
        type: "json",
        source: "variable",
        variableName: "workflow_path_options",
        selectFields: ["id", "displayName", "description", "tags"]  // Only send these fields
      }
    ],
    output: [
      {
        name: "selected_workflow_path_id",
        type: "class",
        classesFrom: {
          source: "workflow_path_options",
          field: "id"
        }
      }
    ]
  }
}
```

**Agent calls:** `select_workflow_path()`  
**Engine resolves:** 
- `project_description` from variables
- `workflow_path_options` from variables (filtered to 4 fields only)
**Ax selects:** One of the valid IDs from `workflow_path_options`  
**User approves:** Selected ID saved to variables

---

#### Example 3: With Derived Variables (`extractFrom`)

```typescript
{
  toolName: "select_workflow_path",
  toolType: "ax-generation",
  description: "Recommend and select the best workflow path",
  
  requiredVariables: ["project_description", "workflow_path_options"],
  
  axSignature: {
    signatureName: "SelectWorkflowPath",
    input: [
      {
        name: "project_description",
        type: "string",
        source: "variable",
        variableName: "project_description"
      },
      {
        name: "workflow_paths",
        type: "json",
        source: "variable",
        variableName: "workflow_path_options",
        selectFields: ["id", "displayName", "description"]
      }
    ],
    output: [
      {
        name: "selected_workflow_path_id",
        type: "class",
        classesFrom: {
          source: "workflow_path_options",
          field: "id"
        }
      },
      {
        name: "selected_workflow_path_name",
        type: "string",
        extractFrom: {
          source: "workflow_path_options",      // Array of options
          matchField: "id",                       // Match on this field
          matchValue: "selected_workflow_path_id", // Variable with selected ID
          selectField: "displayName"              // Extract this field
        }
      }
    ]
  }
}
```

**Flow:**
1. Agent calls `select_workflow_path()`
2. Ax generates `selected_workflow_path_id: "uuid-123"`
3. User approves
4. **Approval handler detects `extractFrom`**
5. Looks up in `workflow_path_options.find(opt => opt.id === "uuid-123")`
6. Extracts `displayName: "BMad Method"`
7. Stores both values:
   - `selected_workflow_path_id: "uuid-123"`
   - `selected_workflow_path_name: "BMad Method"` (derived, not generated)

**Storage Structure:**
```json
{
  "approval_states": {
    "select_workflow_path": {
      "status": "approved",
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

Both values merge into `execution.variables` and are available for template resolution: `{{selected_workflow_path_name}}`

---

### Advanced Features

#### `selectFields` - Token Optimization

When passing large JSON arrays to LLM, filter to only needed fields:

```typescript
{
  name: "workflow_paths",
  type: "json",
  source: "variable",
  variableName: "workflow_path_options",
  selectFields: ["id", "displayName", "description", "tags"]
}
```

**Without `selectFields`:** 50+ fields × 10 options = 500+ fields to LLM  
**With `selectFields`:** 4 fields × 10 options = 40 fields to LLM

**Result:** 50-80% token reduction

---

#### `classesFrom` - Field-Level Class Sources

Define class constraints per output field instead of tool-level:

```typescript
{
  name: "selected_technique_id",
  type: "class",
  classesFrom: {
    source: "technique_options",  // Different source per field
    field: "id"
  }
}
```

**Benefit:** Multiple class outputs can have different sources in the same tool.

---

#### `extractFrom` - Derived Variables

Automatically extract related fields without LLM generation:

**Use Cases:**
- User selects ID → extract human-readable name
- User selects option → extract metadata
- Classification → extract category description

**Benefits:**
- ✅ No LLM generation for deterministic lookups
- ✅ Reduces hallucination risk
- ✅ Human-readable values in templates
- ✅ Automatic - no manual mapping

---

## Tool Type 2: `update-variable`

### Purpose

Direct variable updates where the **agent extracts the value** from conversation **without using an Ax signature**. User approval is still required via approval card.

### When to Use

- Capturing simple user inputs (topic, description, preferences)
- Agent can extract value directly from conversation
- Value doesn't need Ax signature (agent already knows it)
- **User approval still required** (shows approval card)

### Schema

```typescript
{
  toolName: string,
  toolType: "update-variable",
  description: string,
  targetVariable: string,        // Where to store the value
  requiredVariables?: string[],
}
```

### Input Schema Pattern

**Important:** `update-variable` tools **DO have input schemas** - the agent provides the value:

```typescript
inputSchema: z.object({
  value: valueSchema,              // Agent extracts and provides value
  reasoning: z.string().optional() // Agent can explain extraction
})
```

### Examples

#### Example 1: Simple Text Input

```typescript
{
  toolName: "set_session_topic",
  toolType: "update-variable",
  description: "Capture the brainstorming session topic from user conversation",
  targetVariable: "session_topic"
}
```

**Generated Tool Schema:**
```typescript
{
  name: "set_session_topic",
  description: "Capture the brainstorming session topic from user conversation",
  inputSchema: z.object({
    value: z.string().min(1).describe("The brainstorming topic"),
    reasoning: z.string().optional().describe("Why this topic was identified")
  })
}
```

**Agent Usage:**
```typescript
// User: "I want to brainstorm ideas for improving team collaboration"
agent.call_tool("set_session_topic", {
  value: "team collaboration improvement",
  reasoning: "User explicitly stated brainstorming topic"
})
```

**Result:** 
- **Approval card appears** with value: "team collaboration improvement"
- User approves/rejects
- On approval: `execution.variables.session_topic = "team collaboration improvement"`

---

#### Example 2: JSON Object Input

```typescript
{
  toolName: "update_goals",
  toolType: "update-variable",
  description: "Store the stated goals for this session",
  targetVariable: "stated_goals"
}
```

**Generated Tool Schema:**
```typescript
{
  name: "update_goals",
  description: "Store the stated goals for this session",
  inputSchema: z.object({
    value: z.any().describe("The stated goals"),
    reasoning: z.string().optional()
  })
}
```

**Agent Usage:**
```typescript
// User: "My goals are to identify 5 creative solutions and prioritize the top 3"
agent.call_tool("update_goals", {
  value: {
    quantity: 5,
    action: "identify creative solutions",
    prioritization: "top 3"
  },
  reasoning: "User specified quantity and prioritization goals"
})
```

---

#### Example 3: Replacing Old Pattern

**OLD WAY (using ax-generation for simple text):**
```typescript
{
  toolName: "update_summary",
  toolType: "ax-generation",
  axSignature: {
    signatureName: "ExtractSummary",
    input: [{ name: "description", type: "string", source: "conversation" }],
    output: [{ name: "summary", type: "string" }]
  }
}
```
❌ Slow (Ax signature call)  
✅ Requires approval (good!)  
❌ Overkill - why use Ax when agent already knows the value?

**NEW WAY (using update-variable):**
```typescript
{
  toolName: "update_description",
  toolType: "update-variable",
  description: "Store the project description from conversation",
  targetVariable: "project_description"
}
```
✅ Fast (agent extracts, no Ax signature)  
✅ Still requires approval (shows card)  
✅ Agent provides value directly from conversation

---

### Comparison: `ax-generation` vs `update-variable`

| Feature | `ax-generation` | `update-variable` |
|---------|----------------|------------------|
| **Purpose** | Uses Ax signature for structured generation | Agent extracts and stores value |
| **Input Schema** | Empty `z.object({})` | Has `value` parameter |
| **Agent Provides** | Nothing (reads context) | Extracted value directly |
| **Uses Ax Signature** | Yes | No (agent extracts) |
| **Approval Gate** | ✅ Yes (approval card) | ✅ Yes (approval card) |
| **Speed** | Slower (Ax signature call) | Fast (no Ax call) |
| **Use Case** | Complex generation, classification | Simple extraction from chat |
| **Example** | "Generate 5 project names" | "Extract topic user mentioned" |

---

## Tool Configuration in Steps

Tools are configured in `ask-user-chat` step types:

```typescript
{
  stepType: "ask-user-chat",
  agentId: "analyst-uuid",
  systemPrompt: "You are helping the user...",
  continueOnApproval: true,
  
  tools: [
    {
      toolName: "generate_summary",
      toolType: "ax-generation",
      // ... ax config
    },
    {
      toolName: "set_topic",
      toolType: "update-variable",
      targetVariable: "session_topic"
    }
  ]
}
```

---

## Tool Execution Flow

### `ax-generation` Flow

1. User chats with agent
2. Agent decides to call tool (e.g., `generate_summary()`)
3. Engine resolves inputs from `execution.variables`
4. Ax signature generates output
5. **Approval card appears** with generated content
6. User approves/rejects
7. On approval:
   - Stores generated values in `approval_states.{tool}.value`
   - Computes derived values (if `extractFrom` configured)
   - Stores derived in `approval_states.{tool}.derived_values`
   - Merges both into `execution.variables`
8. Workflow continues

### `update-variable` Flow

1. User chats with agent
2. Agent extracts value from conversation
3. Agent calls tool (e.g., `set_topic({ value: "collaboration" })`)
4. **Approval card appears** with extracted value
5. User approves/rejects
6. On approval: Engine saves to `targetVariable` in `execution.variables`
7. Workflow continues

---

## Implementation References

### Code Locations

- **Tool Generation:** `packages/api/src/services/workflow-engine/tools/ax-generation-tool.ts`
- **Update Variable:** `packages/api/src/services/workflow-engine/tools/update-variable-tool.ts`
- **Tool Handler:** `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`
- **Approval Logic:** `packages/api/src/routers/workflows.ts` (mutations: `approveToolCall`, `approveToolOutput`)

### Related Architecture Docs

- **Dynamic Tool Options:** `/docs/architecture/dynamic-tool-options.md` (see update in Gap 3)
- **Step Types:** `/docs/architecture/CANONICAL-WORKFLOW-SCHEMA.md`
- **Approval System:** `/docs/architecture/approval-rejection-system.md` (see Gap 4)

---

## Best Practices

### When to Use `ax-generation`

✅ Content needs structured generation via Ax signature  
✅ Multiple suggestions or options to generate  
✅ Classification from complex context  
✅ Structured extraction with complex reasoning  
✅ Ax signature optimizations provide value

### When to Use `update-variable`

✅ Simple user input (name, topic, description)  
✅ Agent can extract value directly from conversation  
✅ Value is obvious/explicit in user's message  
✅ No need for Ax signature (agent knows the value)  
✅ Speed is important (skip Ax signature call)

### Token Optimization

- Always use `selectFields` for large JSON arrays
- Only send fields the Ax signature actually needs
- Use `extractFrom` for deterministic lookups (don't use Ax to generate what you can extract)

### Naming Conventions

- Tool names: `verb_noun` (e.g., `generate_summary`, `set_topic`, `select_path`)
- Variable names: `descriptor_type` (e.g., `project_summary`, `session_topic`, `selected_path_id`)
- Derived variables: `selected_{field}_name` pattern (e.g., `selected_workflow_path_name`)

---

## Future Tool Types

### Planned (Not Yet Implemented)

- **`database-query`** - Direct DB reads without agent involvement
- **`custom`** - User-defined tool implementations
- **`api-call`** - External API integrations

---

**Document Version:** 1.0  
**Last Updated:** December 1, 2025  
**Status:** Production Ready
