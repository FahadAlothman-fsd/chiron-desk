# Story 2.3: New Primitives Summary

## Overview

Story 2.3 introduces **3 major reusable primitives** that fundamentally expand Chiron's workflow capabilities. These primitives are **NOT** technique-specific - they work for ANY future workflow.

---

## Primitive 1: Object Type Support for update-variable-tool

### What It Does
Enables tools to save **structured data (objects)** with schema validation, not just primitives (strings, numbers, arrays).

### Why It's Needed
- **Five Whys** needs to save Q&A pairs: `{ question: string, answer: string }`
- **Mind Mapping** needs to save dynamic sub-branches: `{ [branchName: string]: string[] }`
- **Future workflows** will need complex data structures

### Implementation Location
`packages/api/src/services/workflow-engine/tools/update-variable-tool.ts`

### Changes Required
Add `case "object"` to schema builder with support for:
- `valueSchema.properties` - Define object structure
- `valueSchema.required` - Mark required vs optional fields
- `valueSchema.additionalProperties` - Support dynamic keys

### Example Usage

**Five Whys Q&A Pair:**
```typescript
{
  name: "save_why_1",
  toolType: "update-variable",
  variableName: "why_1",
  valueType: "object",
  valueSchema: {
    type: "object",
    required: ["question", "answer"],
    properties: {
      question: { 
        type: "string",
        description: "The specific WHY question asked"
      },
      answer: { 
        type: "string",
        description: "The clarified answer from conversation"
      }
    }
  }
}
```

**Mind Mapping Sub-branches (Dynamic Keys):**
```typescript
{
  name: "capture_sub_branches",
  toolType: "update-variable",
  variableName: "sub_branches",
  valueType: "object",
  valueSchema: {
    type: "object",
    additionalProperties: {
      type: "array",
      items: { type: "string" }
    }
  }
}
// Result: { "Features": ["Login", "Dashboard"], "Users": ["Students", "Teachers"] }
```

### Validation
Zod validates:
- Required fields present
- Correct types for each property
- Structure matches schema

### Future Applications
- Any workflow needing structured data
- Form submissions with multiple fields
- Configuration objects
- Nested data structures

---

## Primitive 2: generateInitialMessage for ask-user-chat

### What It Does
Allows agent to **dynamically generate the first message/question** based on context, instead of static text.

### Why It's Needed
- **Five Whys** first question should be specific to the topic, not generic "Why?"
- **SCAMPER** should personalize substitution question to user's idea
- **All techniques** should feel tailored, not templated

### Implementation Location
- Schema: `packages/db/src/schema/step-configs.ts` (add to `askUserChatStepConfigSchema`)
- Handler: `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`

### Changes Required
1. Add config fields:
   - `generateInitialMessage: boolean` - Enable generation
   - `initialPrompt: string` - Prompt for generation
2. Detect flag in handler
3. Call `agent.generate([], { system: resolvedPrompt })`
4. Return generated message as `generated_initial_message`
5. UI displays as first assistant message

### Example Usage

**Five Whys:**
```typescript
{
  stepType: "ask-user-chat",
  config: {
    generateInitialMessage: true,
    initialPrompt: `Based on {{parent.session_topic}}, generate the first specific WHY question that will start our root cause analysis.`
  }
}
```

**Result:**
- User's topic: "Users abandon shopping carts"
- Agent generates: "Why do users abandon their shopping carts on your site?"
- NOT generic: "Why does this happen?"

### Variable Resolution
Supports `{{parent.variable}}` syntax:
- `{{parent.session_topic}}`
- `{{parent.stated_goals}}`
- Any parent execution variable

### Future Applications
- Any workflow needing personalized opening
- Context-aware greeting messages
- Dynamic question generation
- Adaptive conversation starters

---

## Primitive 3: invoke-workflow Step Type

### What It Does
Enables **any workflow to invoke child workflows** and aggregate their outputs - universal parent-child composition.

### Why It's Needed
- **Brainstorming** needs to invoke technique workflows (SCAMPER, Six Hats, etc.)
- **Future:** Multi-expert review (invoke 3 reviewer workflows)
- **Future:** Parallel research (invoke research workflows per topic)
- **Future:** ANY nested workflow pattern

### Implementation Location
`packages/api/src/services/workflow-engine/step-handlers/invoke-workflow-handler.ts`

### Database Changes
Add `parentExecutionId` column to `workflow_executions`:
```sql
ALTER TABLE workflow_executions 
ADD COLUMN parent_execution_id UUID 
REFERENCES workflow_executions(id) ON DELETE CASCADE;
```

### Configuration Schema

```typescript
interface InvokeWorkflowStepConfig {
  // What workflows to invoke
  workflowsToInvoke: string | string[]; // "{{selected_techniques}}" or ["scamper", "six-hats"]
  
  // How to invoke them
  invocationMode: "sequential" | "parallel";
  
  // What variable does each child output?
  expectedOutputVariable: string; // e.g., "generated_ideas"
  
  // Where to store aggregated results in parent
  aggregateInto: string; // e.g., "captured_ideas"
  
  // How to determine step completion
  completionCondition: {
    type: "all-complete" | "user-confirmed" | "minimum-complete";
    minimum?: number;
  };
}
```

### Example Usage

**Brainstorming Step 2:**
```typescript
{
  stepNumber: 2,
  stepType: "invoke-workflow",
  goal: "Execute selected brainstorming techniques",
  config: {
    workflowsToInvoke: "{{selected_techniques}}", // ["scamper", "six-hats"]
    invocationMode: "parallel",
    expectedOutputVariable: "generated_ideas",
    aggregateInto: "captured_ideas",
    completionCondition: {
      type: "all-complete"
    }
  }
}
```

**What Happens:**
1. Handler reads `selected_techniques` from variables: `["scamper", "six-hats"]`
2. Creates 2 child `workflow_executions`:
   - Child 1: workflowId = "scamper", parentExecutionId = parent ID
   - Child 2: workflowId = "six-hats", parentExecutionId = parent ID
3. Both start in `idle` status
4. User executes them via action list UI
5. When both reach `completed` status:
   - Handler reads `generated_ideas` from each child
   - Aggregates into parent `captured_ideas`
   - Parent step advances

### Parent Variable Resolution

Child workflows access parent variables via `{{parent.variable}}`:

```typescript
// Child workflow (SCAMPER) can use:
initialPrompt: `
  Topic: {{parent.session_topic}}
  Goals: {{parent.stated_goals}}
  
  Let's SCAMPER through this topic!
`
```

Handler resolves by querying parent execution when child encounters `{{parent.X}}`.

### Completion Conditions

**all-complete (Story 2.3):**
- Step completes when ALL children have `status = "completed"`
- Blocking - parent waits for all children

**user-confirmed (Future):**
- User manually advances when satisfied
- Non-blocking - children can run asynchronously

**minimum-complete (Future):**
- Step completes when N children complete
- Hybrid - wait for threshold, then allow advance

### Future Applications
- Multi-agent collaboration (invoke multiple reviewer agents)
- Parallel task execution (invoke research workflows for different topics)
- Workflow composition (any workflow can invoke sub-workflows)
- Recursive patterns (child can invoke grandchild)

---

## Impact on Story 2.3

### Technique Workflows Enabled

| Technique | Uses Primitive 1 (Object) | Uses Primitive 2 (Generate) | Uses Primitive 3 (Invoke) |
|-----------|---------------------------|------------------------------|----------------------------|
| SCAMPER | ❌ | ✅ | ✅ (invoked by parent) |
| Six Hats | ❌ | ✅ | ✅ (invoked by parent) |
| Five Whys | ✅ (Q&A pairs) | ✅ | ✅ (invoked by parent) |
| Mind Mapping | ✅ (Dynamic keys) | ✅ | ✅ (invoked by parent) |
| What If Scenarios | ❌ | ✅ | ✅ (invoked by parent) |

### Architecture Benefits

**Before Story 2.3:**
- ❌ Only primitive types (string, number, boolean, array)
- ❌ Static initial messages
- ❌ No workflow composition

**After Story 2.3:**
- ✅ Structured data with validation
- ✅ Dynamic personalized conversations
- ✅ Universal parent-child workflows
- ✅ Reusable across ALL future workflows

---

## Testing Strategy

### Primitive 1: Object Type Support
- Unit tests: Validate schema building (required, optional, additionalProperties)
- Integration tests: Save and retrieve structured data
- Test cases: Five Whys Q&A, Mind Mapping sub-branches

### Primitive 2: generateInitialMessage
- Unit tests: Variable resolution in initialPrompt
- Integration tests: Agent generation with parent context
- Test cases: Five Whys first question, SCAMPER substitution question

### Primitive 3: invoke-workflow
- Unit tests: Child execution creation, aggregation logic
- Integration tests: Full parent-child flow with real techniques
- Test cases: Brainstorming → SCAMPER + Six Hats → aggregation

---

## Documentation

All primitives documented in:
- **Architecture:** `docs/architecture/workflow-primitives.md` (to be created)
- **Story:** `docs/sprint-artifacts/2-3-execution-loop-and-child-workflows.md`
- **Techniques:** `docs/sprint-artifacts/story-2-3-technique-workflows/README.md`

---

## Future Stories Can Immediately Use

**Story 2.4+:** Any workflow needing:
- Structured data storage → Use Primitive 1
- Personalized opening → Use Primitive 2
- Child workflow invocation → Use Primitive 3

**No additional implementation needed** - primitives are universal!
