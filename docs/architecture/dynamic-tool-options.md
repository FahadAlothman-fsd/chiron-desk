# Dynamic Tool Options System

## Overview

This document describes the implementation of the **Dynamic Tool Options** system, which allows AI-powered tools to fetch their available options dynamically from the database instead of using hardcoded values.

## Problem Statement

**Before Implementation:**
- Tool options were hardcoded in tool configurations
- LLM had no context about what each option meant
- Changing options required code changes and redeployment
- Tool outputs used generic values instead of structured metadata

**Example Issue:**
The `update_complexity` tool would output "METHOD" but the database expected "moderate" with full tag metadata including name and description.

## Solution: `optionsSource` Configuration

### Architecture

The solution adds an `optionsSource` field to tool configurations that:

1. **Fetches options dynamically** from database before tool execution
2. **Stores options in execution variables** for use by the AI
3. **Provides structured metadata** (value, name, description) to the LLM
4. **Supports filtering** based on execution context

### Schema Changes

#### 1. Tool Config Schema (`/packages/db/src/schema/step-configs.ts`)

Added `optionsSource` field to tool configuration:

```typescript
// Dynamic options source - fetch options from database before tool execution
optionsSource: z
  .object({
    table: z.string(), // Table to query
    distinctField: z.string(), // Field to get unique values from (supports JSONB like "tags->'complexity'")
    filterBy: z.record(z.string()).optional(), // Optional filters (supports {{variable}} syntax)
    orderBy: z.string().optional(), // Field to order by
    outputVariable: z.string(), // Variable name to store fetched options
  })
  .optional(),
```

#### 2. Workflow Paths Tag Structure (`/packages/scripts/src/seeds/workflow-paths.ts`)

Created structured tag metadata with consistent schema:

```typescript
const TAG_METADATA = {
  complexity: {
    simple: {
      value: "simple",
      name: "Quick Flow Track",
      description: "Fast implementation track using tech-spec planning only. Best for bug fixes, small features, and changes with clear scope. Typical range: 1-15 stories."
    },
    moderate: {
      value: "moderate",
      name: "BMad Method Track",
      description: "Full product planning track using PRD + Architecture + UX. Best for products, platforms, and complex features. Typical range: 10-50+ stories."
    },
    complex: {
      value: "complex",
      name: "Enterprise Method Track",
      description: "Extended enterprise planning track with Security, DevOps, and Test Strategy. Best for enterprise requirements. Typical range: 30+ stories."
    }
  },
  // ... other tag types
};
```

**Database Result:**
```json
{
  "tags": {
    "complexity": {
      "value": "moderate",
      "name": "BMad Method Track",
      "description": "Full product planning track using PRD + Architecture + UX..."
    },
    "fieldType": {
      "value": "greenfield",
      "name": "Greenfield Project",
      "description": "Starting from scratch with no existing codebase..."
    },
    "track": {
      "value": "bmad-method",
      "name": "BMad Method",
      "description": "Comprehensive methodology for medium-complexity projects..."
    }
  }
}
```

### Implementation

#### 1. Options Fetcher (`/packages/api/src/services/workflow-engine/tools/ax-generation-tool.ts`)

Created `fetchToolOptions()` function that:

```typescript
async function fetchToolOptions(
  optionsSource: NonNullable<ToolConfig["optionsSource"]>,
  context: ExecutionContext,
): Promise<unknown[]> {
  // 1. Replace {{variable}} syntax in filters
  const resolvedFilters: Record<string, string> = {};
  if (optionsSource.filterBy) {
    for (const [field, value] of Object.entries(optionsSource.filterBy)) {
      const resolvedValue = value.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
        return String(context.executionVariables[varName]);
      });
      resolvedFilters[field] = resolvedValue;
    }
  }

  // 2. Build SQL query
  let query = `SELECT DISTINCT ${optionsSource.distinctField} as value FROM ${optionsSource.table}`;
  
  // Add filters
  if (Object.keys(resolvedFilters).length > 0) {
    const whereClauses = Object.entries(resolvedFilters)
      .map(([field, value]) => `${field} = '${value}'`)
      .join(" AND ");
    query += ` WHERE ${whereClauses}`;
  }

  // Add ordering
  if (optionsSource.orderBy) {
    query += ` ORDER BY ${optionsSource.orderBy}`;
  }

  // 3. Execute query
  const results = await db.execute(sql.raw(query));
  
  // 4. Return results
  return results.rows.map((row: any) => row.value);
}
```

#### 2. Integration in Tool Builder

Modified `buildAxGenerationTool()` to fetch options before building the tool:

```typescript
export async function buildAxGenerationTool(
  config: ToolConfig,
  context: ExecutionContext,
  agentId: string,
): Promise<ReturnType<typeof createTool>> {
  // ... existing code ...

  // Fetch dynamic options if configured
  if (config.optionsSource) {
    const options = await fetchToolOptions(config.optionsSource, context);
    context.executionVariables[config.optionsSource.outputVariable] = options;
    console.log(
      `[AxGenerationTool] Stored ${options.length} options in variable "${config.optionsSource.outputVariable}"`,
    );
  }

  // ... rest of tool building ...
}
```

#### 3. Input Resolution Enhancement

Updated `resolveInputs()` to check approved tool outputs:

```typescript
case "variable": {
  const variableName = inputConfig.variableName || inputConfig.name;
  let value = context.executionVariables[variableName];

  // If not found in execution variables, check approval states
  if (value === undefined) {
    const approvalStates = (context.executionVariables.approval_states as Record<string, any>) || {};
    
    // Check if variable exists in any approved tool output
    for (const state of Object.values(approvalStates)) {
      if (state.status === "approved" && state.value && variableName in state.value) {
        value = state.value[variableName];
        console.log(`[AX Tool] Found "${variableName}" in approved tool output`);
        break;
      }
    }
  }

  if (value === undefined) {
    throw new Error(`Required variable "${variableName}" not found`);
  }

  inputs[inputConfig.name] = value;
  break;
}
```

### Usage Example: `update_complexity` Tool

#### Configuration (`/packages/scripts/src/seeds/workflow-init-new.ts`)

```typescript
{
  name: "update_complexity",
  toolType: "ax-generation",
  description: "Classify the project's complexity level based on scope, team size, and technical requirements",
  requiredVariables: ["project_description"],
  requiresApproval: true,
  
  // Fetch available complexity options from database
  optionsSource: {
    table: "workflow_paths",
    distinctField: "tags->'complexity'", // Get unique complexity tags
    filterBy: {
      "tags->'fieldType'->>'value'": "{{detected_field_type}}", // Filter by greenfield/brownfield
    },
    orderBy: "sequence_order",
    outputVariable: "complexity_options", // Store in execution.variables
  },
  
  axSignature: {
    input: [
      {
        name: "project_description",
        type: "string",
        source: "variable",
        variableName: "project_description",
        description: "Approved project summary",
      },
      {
        name: "complexity_options",
        type: "array",
        source: "variable",
        variableName: "complexity_options",
        description: "Available complexity levels with structured metadata (value, name, description)",
      },
      // ... other inputs
    ],
    output: [
      {
        name: "complexity_classification",
        type: "string",
        description: "Selected complexity value (e.g., 'simple', 'moderate', 'complex')",
        internal: false,
      },
      {
        name: "reasoning",
        type: "string",
        description: "Factors that led to this complexity classification",
        internal: false,
      },
    ],
    strategy: "ChainOfThought",
  },
}
```

#### Execution Flow

1. **Step 1**: Workflow sets `detected_field_type` = "greenfield"
2. **Step 3**: User chats with PM agent
3. **Agent approves summary**: Stores `project_description` in approval states
4. **Agent calls `update_complexity`**:
   - **Before tool execution**:
     - Fetches options: `SELECT DISTINCT tags->'complexity' FROM workflow_paths WHERE tags->'fieldType'->>'value' = 'greenfield' ORDER BY sequence_order`
     - Stores in `execution.variables.complexity_options`:
       ```json
       [
         {
           "value": "simple",
           "name": "Quick Flow Track",
           "description": "Fast implementation track using tech-spec planning only..."
         },
         {
           "value": "moderate",
           "name": "BMad Method Track",
           "description": "Full product planning track using PRD + Architecture + UX..."
         },
         {
           "value": "complex",
           "name": "Enterprise Method Track",
           "description": "Extended enterprise planning track..."
         }
       ]
       ```
   - **During tool execution**:
     - Resolves `project_description` from approved tool outputs
     - Passes `complexity_options` array to LLM
     - LLM sees full context about each option
     - LLM outputs: `{ complexity_classification: "moderate", reasoning: "..." }`
   - **After tool execution**:
     - Returns result for user approval
     - User approves → stored in `approval_states.update_complexity`

### Benefits

✅ **Dynamic Configuration**: Options fetched from database, not hardcoded  
✅ **Rich Context**: LLM sees full metadata (name + description) for each option  
✅ **Correct Values**: Tool outputs database-compatible values ("moderate" not "METHOD")  
✅ **Filtered Options**: Only shows relevant options based on context (greenfield vs brownfield)  
✅ **Consistent Schema**: All tags follow `{ value, name, description }` structure  
✅ **No Code Changes**: Adding new complexity levels only requires database updates  

### JSONB Path Considerations

**Important**: When working with structured JSONB tags, use the correct path syntax:

- **Wrong**: `tags->>'fieldType'` (tries to extract text from object)
- **Right**: `tags->'fieldType'->>'value'` (extracts value property)

**Query Examples**:
```sql
-- Get complexity tag object
SELECT tags->'complexity' FROM workflow_paths;

-- Get complexity value
SELECT tags->'complexity'->>'value' FROM workflow_paths;

-- Filter by nested value
WHERE tags->'fieldType'->>'value' = 'greenfield'
```

---

## Advanced Features (December 2025)

### 1. `selectFields` - Token Optimization

**Added:** Commit 90214768 (Dec 1, 2025)

#### Problem

When passing large JSON arrays to Ax signatures, sending all fields wastes tokens and increases latency. For example, `workflow_path_options` might have 50+ fields per option, but the LLM only needs 4-5 fields to make a decision.

#### Solution

The `selectFields` property filters JSON data **before** sending to the Ax signature:

```typescript
{
  name: "workflow_paths",
  type: "json",
  source: "variable",
  variableName: "workflow_path_options",
  selectFields: ["id", "displayName", "description", "tags"]  // Only send these fields
}
```

#### Implementation

Located in `ax-generation-tool.ts`, the `resolveInputs()` function filters data:

```typescript
case "variable": {
  let value = context.executionVariables[variableName];
  
  // Apply field selection for token optimization
  if (inputConfig.selectFields && Array.isArray(value)) {
    value = value.map((item: any) => {
      const filtered: any = {};
      for (const field of inputConfig.selectFields) {
        if (field in item) {
          filtered[field] = item[field];
        }
      }
      return filtered;
    });
    console.log(`[AX Tool] Filtered input "${inputConfig.name}" to fields: ${inputConfig.selectFields.join(", ")}`);
  }
  
  inputs[inputConfig.name] = value;
  break;
}
```

#### Results

- **Without `selectFields`**: 50 fields × 10 options = 500+ fields to LLM
- **With `selectFields`**: 4 fields × 10 options = 40 fields to LLM
- **Token Reduction**: 50-80% depending on data structure

#### Example Usage

```typescript
axSignature: {
  input: [
    {
      name: "workflow_paths",
      type: "json",
      source: "variable",
      variableName: "workflow_path_options",
      selectFields: ["id", "displayName", "description", "tags"]  // Optimized!
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
```

---

### 2. `classesFrom` - Field-Level Class Sources

**Added:** Commit 90214768 (Dec 1, 2025)

#### Problem

**Old approach** required tool-level `classSource` configuration:

```typescript
{
  toolType: "ax-generation",
  classSource: "workflow_paths",  // Tool-level constraint
  output: [
    { name: "selected_path_id", type: "class" }  // Must use tool-level source
  ]
}
```

This was limiting when a tool needed multiple classification outputs from different sources.

#### Solution

The `classesFrom` property allows **per-field class source** configuration:

```typescript
output: [
  { 
    name: "selected_path_id", 
    type: "class",
    classesFrom: {
      source: "workflow_path_options",  // Field-level source
      field: "id"
    }
  },
  { 
    name: "selected_technique_id", 
    type: "class",
    classesFrom: {
      source: "technique_options",  // Different source!
      field: "id"
    }
  }
]
```

#### Benefits

- ✅ Multiple class outputs can have different sources in the same tool
- ✅ More flexible than tool-level configuration
- ✅ Clearer intent (source is next to the field that uses it)

#### Example Usage

```typescript
{
  toolName: "select_workflow_and_technique",
  toolType: "ax-generation",
  requiredVariables: ["workflow_path_options", "technique_options"],
  
  axSignature: {
    input: [
      {
        name: "workflow_paths",
        type: "json",
        source: "variable",
        variableName: "workflow_path_options",
        selectFields: ["id", "displayName", "description"]
      },
      {
        name: "techniques",
        type: "json",
        source: "variable",
        variableName: "technique_options",
        selectFields: ["id", "name", "description"]
      }
    ],
    output: [
      {
        name: "selected_workflow_path_id",
        type: "class",
        classesFrom: {
          source: "workflow_path_options",  // Uses first source
          field: "id"
        }
      },
      {
        name: "selected_technique_id",
        type: "class",
        classesFrom: {
          source: "technique_options",  // Uses second source
          field: "id"
        }
      }
    ]
  }
}
```

---

### 3. `extractFrom` - Derived Variables (THE BIG ONE)

**Added:** Commits 90214768 + 6c864856 (Dec 1, 2025)

#### Problem

When a user selects an option by ID, we often need the human-readable name or other metadata:

```typescript
// User selects: selected_workflow_path_id = "uuid-123"
// We also need: selected_workflow_path_name = "BMad Method"
```

**Before `extractFrom`**, we had two bad options:
1. ❌ Make LLM generate the name (hallucination risk, wasteful)
2. ❌ Manual lookup in subsequent steps (complex, error-prone)

#### Solution

The `extractFrom` property automatically extracts related fields from the source data **without Ax signature generation**:

```typescript
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
      source: "workflow_path_options",      // Array to search
      matchField: "id",                      // Field to match on
      matchValue: "selected_workflow_path_id", // Variable with selected ID
      selectField: "displayName"             // Field to extract
    }
  }
]
```

#### Flow Diagram

```
1. User chats with agent
2. Agent calls tool (e.g., select_workflow_path())
3. Ax generates: { selected_workflow_path_id: "uuid-123" }
4. Approval card appears
5. User approves ✓
   ↓
6. Approval handler detects extractFrom configuration
7. Looks up in workflow_path_options:
   options.find(opt => opt.id === "uuid-123")
8. Extracts: displayName = "BMad Method"
9. Stores both values:
   ┌─────────────────────────────────────────┐
   │ approval_states.select_workflow_path    │
   ├─────────────────────────────────────────┤
   │ value: {                                │
   │   selected_workflow_path_id: "uuid-123" │ ← Generated by Ax
   │ }                                        │
   │ derived_values: {                        │
   │   selected_workflow_path_name: "BMad..."│ ← Extracted (no Ax)
   │ }                                        │
   └─────────────────────────────────────────┘
10. Both merge into execution.variables
11. Available in templates: {{selected_workflow_path_name}}
```

#### Implementation

**Tool Configuration** (`ax-generation-tool.ts`):

The `extractDeterministicFields()` function is exported for use by approval handlers:

```typescript
export function extractDeterministicFields(
  outputs: AxSignatureOutput[],
  approvedValues: Record<string, any>,
  executionVariables: Record<string, any>
): Record<string, any> {
  const derived: Record<string, any> = {};

  for (const output of outputs) {
    if (!output.extractFrom) continue;

    const { source, matchField, matchValue, selectField } = output.extractFrom;
    
    // Get the source array
    const sourceArray = executionVariables[source];
    if (!Array.isArray(sourceArray)) {
      console.warn(`[extractFrom] Source "${source}" is not an array`);
      continue;
    }

    // Get the value to match
    const valueToMatch = approvedValues[matchValue];
    if (valueToMatch === undefined) {
      console.warn(`[extractFrom] Match value "${matchValue}" not found in approved values`);
      continue;
    }

    // Find matching item
    const matchedItem = sourceArray.find(
      (item: any) => item[matchField] === valueToMatch
    );

    if (!matchedItem) {
      console.warn(`[extractFrom] No match found for ${matchField}="${valueToMatch}"`);
      continue;
    }

    // Extract the field
    derived[output.name] = matchedItem[selectField];
    console.log(
      `[extractFrom] Extracted ${output.name} = "${derived[output.name]}" from ${source}`
    );
  }

  return derived;
}
```

**Approval Handlers** (`workflows.ts`):

Both `approveToolCall` and `approveToolOutput` mutations compute derived values:

```typescript
// After user approves the tool output
const derivedValues = extractDeterministicFields(
  toolConfig.axSignature.output,
  approvedValues,
  execution.variables
);

// Store in approval states
execution.variables.approval_states[toolName] = {
  status: "approved",
  value: approvedValues,
  derived_values: derivedValues  // ← New!
};

// Merge both into execution variables
Object.assign(execution.variables, approvedValues, derivedValues);
```

#### Storage Structure

```json
{
  "execution": {
    "variables": {
      "selected_workflow_path_id": "uuid-123",
      "selected_workflow_path_name": "BMad Method",
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
  }
}
```

#### Benefits

- ✅ **No Ax signature calls** for deterministic lookups
- ✅ **Zero hallucination risk** (direct data extraction)
- ✅ **Human-readable values** in templates/display
- ✅ **Automatic computation** at approval time
- ✅ **Type-safe** (extracted from actual data)

#### Example Usage: Workflow Path Selection

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
        selectFields: ["id", "displayName", "description", "tags"]
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
          source: "workflow_path_options",
          matchField: "id",
          matchValue: "selected_workflow_path_id",
          selectField: "displayName"
        }
      },
      {
        name: "selected_workflow_path_description",
        type: "string",
        extractFrom: {
          source: "workflow_path_options",
          matchField: "id",
          matchValue: "selected_workflow_path_id",
          selectField: "description"
        }
      }
    ]
  }
}
```

**Result:**
- Ax generates: `selected_workflow_path_id`
- Extracted automatically: `selected_workflow_path_name`, `selected_workflow_path_description`
- All three available in templates: `{{selected_workflow_path_name}}`

#### Multiple Derived Variables

You can extract multiple fields from the same selection:

```typescript
output: [
  { name: "selected_id", type: "class", classesFrom: {...} },
  { name: "selected_name", type: "string", extractFrom: {..., selectField: "name"} },
  { name: "selected_description", type: "string", extractFrom: {..., selectField: "description"} },
  { name: "selected_category", type: "string", extractFrom: {..., selectField: "category"} },
  { name: "selected_metadata", type: "json", extractFrom: {..., selectField: "metadata"} }
]
```

All derived fields are computed in a single pass during approval.

---

### Future Enhancements

1. **Caching**: Cache fetched options to avoid repeated database queries
2. **Validation**: Validate tool output against fetched options
3. **Multi-select**: Support selecting multiple options with array extraction
4. **Computed Options**: Support dynamic option computation
5. **Option Dependencies**: Chain options based on previous selections
6. **Nested extractFrom**: Extract from nested object paths (e.g., `tags.complexity.value`)
7. **Array extractFrom**: Extract multiple items when matchValue is an array

## Files Modified

### Original Implementation (optionsSource)
1. `/packages/db/src/schema/step-configs.ts` - Added `optionsSource` to tool config schema
2. `/packages/api/src/services/workflow-engine/tools/ax-generation-tool.ts` - Added `fetchToolOptions()` and integration
3. `/packages/scripts/src/seeds/workflow-init-new.ts` - Updated `update_complexity` and `fetch_workflow_paths` tools
4. `/packages/scripts/src/seeds/workflow-paths.ts` - Already had structured tag metadata (no changes needed)

### December 2025 Enhancements
1. `/packages/api/src/services/workflow-engine/tools/ax-generation-tool.ts`:
   - Added `selectFields` filtering in `resolveInputs()` (Commit 90214768)
   - Added `classesFrom` field-level support (Commit 90214768)
   - Added `extractDeterministicFields()` exported function (Commit 6c864856)
2. `/packages/api/src/routers/workflows.ts`:
   - Updated `approveToolCall` mutation to compute derived values (Commit 6c864856)
   - Updated `approveToolOutput` mutation to compute derived values (Commit 6c864856)
3. `/packages/scripts/src/seeds/workflow-init-new.ts`:
   - Added `selectFields` to workflow path selection tool (Commit 90214768)
   - Added `extractFrom` for derived variables (Commit 6c864856)

## Testing

To test the implementation:

1. Start a new workflow initialization
2. Chat with the PM agent about your project
3. Approve the project summary
4. Watch the logs for:
   ```
   [AxGenerationTool] Fetching options from workflow_paths.tags->'complexity'
   [AxGenerationTool] Executing query: SELECT DISTINCT ...
   [AxGenerationTool] Fetched 3 options
   [AxGenerationTool] Stored 3 options in variable "complexity_options"
   ```
5. Verify the LLM receives structured options and outputs correct values

## Related Documents

- [Story 1.6 Architecture Summary](/docs/architecture/STORY-1-6-ARCHITECTURE-SUMMARY.md)
- [Workflow Path Schema](/docs/architecture/database-schema-architecture.md)
- [Structured Tags Implementation](/packages/scripts/src/seeds/workflow-paths.ts)
- [Tool Types Reference](/docs/architecture/tool-types.md) - Complete tool type documentation
- [Architecture Updates (Dec 2025)](/ARCHITECTURE-UPDATES-DEC-2025.md) - Context for recent changes

---

**Document Version:** 2.0  
**Last Updated:** December 1, 2025  
**Status:** Production Ready
