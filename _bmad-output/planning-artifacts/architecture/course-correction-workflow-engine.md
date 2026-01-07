# Workflow Engine Course Correction - Brainstorming Workflow Analysis

**Date**: 2025-12-31
**Context**: Analysis of current Chiron workflow engine implementation vs. BMAD's approach, with focus on brainstorming workflow execution

---

## Executive Summary

Chiron's workflow engine is over-engineered for its use case. Current implementation uses:
- 4-level variable precedence system
- Path-based output extraction
- Complex state fragmentation across multiple layers

This creates bloat and fragility. Analysis reveals simpler alternatives that better align with workflow execution needs.

---

## Current Implementation Problems

### Problem 1: 4-Level Variable Precedence

**Current Structure:**
```typescript
// packages/api/src/services/workflow-engine/variable-resolver.ts
mergedContext = {
  ...defaultValues,     // Level 4: Step config defaults
  ...stepOutputs,       // Level 3: Outputs from previous steps
  ...executionVariables, // Level 2: User-set variables
  ...systemVariables,   // Level 1: date, time, project
}
```

**Issues:**
- Solves a problem that doesn't exist in practice
- Creates confusion about where variables come from
- No clear need for "system variables override execution variables" etc.

### Problem 2: Path-Based Output Extraction

**Current Pattern:**
```typescript
// Step config in seed data
outputVariables: {
  topic: "approval_states.update_topic.value",
  goals: "approval_states.update_goals.value",
  techniques: "approval_states.select_techniques.value.selected_techniques"
}
```

**Issues:**
- Fragile - path changes break everything
- Unclear what approval_states actually is
- Deeply nested state that's hard to debug

### Problem 3: No Schema Enforcement

**Current State:**
```typescript
// PostgreSQL JSONB - no validation
execution.variables: {
  session_topic: string,    // Hope it's a string?
  techniques: string[],     // Hope it's an array?
  generated_ideas: ???      // What shape?
}
```

**Issues:**
- No runtime type checking
- Shape mismatches discovered at execution time
- Hard to refactor safely

### Problem 4: Variable Name Mismatch Bug

**Found in seed data:**
```typescript
// Parent (brainstorming Step 2) expects:
expectedOutputVariable: "generated_ideas"

// Child (SCAMPER) outputs:
captured_ideas: {  // Different name!
  substitute: "approval_states.scamper_substitute.value.substitute_ideas",
  // ...
}
```

**Result:** Parent step cannot read child output → silent failure or runtime error.

---

## BMAD's Approach (For Comparison)

### Document-Centric State Management

```markdown
---
# This YAML frontmatter IS the state
stepsCompleted: [1, 2]
session_topic: "AI orchestration"
techniques_used: ["mind-mapping", "scamper"]
ideas_generated: ["idea 1", "idea 2"]
---

# Brainstorming Results
{{user_name}}
{{date}}
{{#each ideas_generated}}
- {{this}}
{{/each}}
```

**Key Characteristics:**
- State lives **in the document** (YAML frontmatter)
- Simple handlebars for display only: `{{variable_name}}`
- Template marks what goes to document: `<template-output>session_topic, stated_goals</template-output>`
- Variables captured directly: `<ask response="session_topic">`
- Progressive building - each step appends content

**Why This Works for BMAD:**
- Single session workflow (no parallel execution)
- Artifact IS the state
- Simple, understandable, easy to debug

---

## Production Workflow Engine Patterns

Research on how production engines handle these problems:

| Engine | Child→Parent Data | State Management | Schema |
|--------|-------------------|------------------|--------|
| **Temporal.io** | Typed Promise return | Immutable event history | TypeScript/Python types |
| **Inngest** | Completion status only | Hash-based memoization | Dynamic JSON |
| **Windmill** | Explicit context passing | Variable store (u/g/f scopes) | TypedDict |
| **Prefect** | Function arguments | Result backend | Type hints |
| **Dagster** | I/O manager or args | Asset materializations | Type annotations |

**Key Insight:** None use path-based extraction. Children return typed values directly.

---

## Proposed Solution: Typed Output Contracts

### Core Concept

Instead of:
```typescript
// Current: Path extraction
outputVariables: {
  topic: "approval_states.update_topic.value"
}
```

Do:
```typescript
// Proposed: Direct output declaration
produces: {
  session_topic: "{{topic_approval}}"
}
```

### Step 1: Workflow Declares Output Schema

```typescript
// In workflow metadata
const scamperWorkflow = {
  name: "scamper",
  outputSchema: {
    type: "object",
    properties: {
      workflow_name: { type: "string" },
      lens_ideas: {
        type: "object",
        properties: {
          substitute: { type: "array", items: { type: "string" } },
          combine: { type: "array", items: { type: "string" } },
          // ... all 7 lenses
        }
      }
    },
    required: ["workflow_name", "lens_ideas"]
  }
};
```

### Step 2: Step Produces Output Directly

```typescript
// SCAMPER step config
const step1Config: AskUserChatStepConfig = {
  // ... tools config ...

  // NEW: Direct output (no paths)
  produces: {
    workflow_name: { value: "SCAMPER" },
    lens_ideas: {
      map: {
        substitute: "{{substitute_ideas}}",
        combine: "{{combine_ideas}}",
        adapt: "{{adapt_ideas}}",
        modify: "{{modify_ideas}}",
        other_uses: "{{other_uses_ideas}}",
        eliminate: "{{eliminate_ideas}}",
        reverse: "{{reverse_ideas}}"
      }
    }
  }
};
```

### Step 3: Parent Declares Expected Contract

```typescript
// Brainstorming Step 2: Invoke-workflow
const step2Config = {
  stepType: "invoke-workflow",

  workflowsToInvoke: "{{selected_techniques}}",

  inputMapping: {
    session_topic: "{{session_topic}}",
    stated_goals: "{{stated_goals}}"
  },

  // NEW: Expected output shape
  expectedOutput: {
    schema: {
      workflow_name: "string",
      raw_outputs: "object"  // Child's native structure
    }
  },

  aggregation: {
    mode: "collect",
    into: "child_results"
  }
};
```

### Step 4: Runtime Validation

```typescript
// In invoke-workflow-handler.ts

for (const workflowId of workflowIds) {
  const childExecution = await executeChildWorkflow(workflowId, childInput);

  // Validate child output against expected schema
  const output = childExecution.getOutput();

  if (!validateSchema(output, config.expectedOutput.schema)) {
    throw new Error(`Child ${workflowId} returned invalid output`);
  }

  childResults.push(output);
}
```

---

## Artifact Updates: Selective Publishing

**Problem:** Not every step output should go to the artifact.

**Solution:** Steps explicitly declare what to publish.

### Approach: artifactUpdates in Step Config

```typescript
// Step 1 config
const step1Config = {
  produces: {
    session_topic: "{{topic_approval}}",
    stated_goals: "{{goals_approval}}",
    selected_techniques: "{{technique_selection}}",  // Internal use only
  },

  // NEW: What goes to artifact
  artifactUpdates: {
    session_topic: "{{session_topic}}",
    stated_goals: "{{stated_goals}}"
    // selected_techniques NOT published - used only by Step 2
  }
};

// Step 3 config (Converge)
const step3Config = {
  consumes: ["child_results"],
  produces: {
    distilled_insights: "{{ai_convergence_output}}",
    action_items: "{{ai_convergence_output.actions}}"
  },

  artifactUpdates: {
    all_ideas: "{{child_results | flatten}}",
    distilled_insights: "{{distilled_insights}}",
    action_items: "{{action_items}}"
  }
};
```

### How It Works

```typescript
// After each step completes
if (step.config.artifactUpdates) {
  const updates = resolveVariables(step.config.artifactUpdates, context);
  artifact.update(updates);  // Progressive artifact building
}
```

### Artifact Template References

```markdown
# Brainstorming Session

## Context
**Topic**: {{session_topic}}
**Goals**:
{{#each stated_goals}}
- {{this}}
{{/each}}

## Generated Ideas
{{#each all_ideas}}
- {{this}}
{{/each}}

## Action Items
{{#each action_items}}
- [ ] {{this.task}} ({{this.owner}})
{{/each}}
```

---

## Parent-Child Workflow Communication: Two Options

### Option A: Strict Contracts (Pre-Execution Validation)

**Parent declares exact schema:**
```typescript
expectedOutput: {
  schema: {
    workflow_name: "string",
    normalized_output: {
      type: "object",
      properties: {
        primary_outputs: { type: "array", items: { type: "string" } },
        metadata: { type: "object" }
      }
    }
  }
}
```

**Child declares matching schema:**
```typescript
outputSchema: {
  workflow_name: { type: "string", const: "SCAMPER" },
  normalized_output: {
    type: "object",
    properties: {
      primary_outputs: { type: "array", items: { type: "string" } },
      metadata: { type: "object" }
    }
  }
}

produces: {
  workflow_name: "SCAMPER",
  normalized_output: {
    primary_outputs: {
      // Flatten all lens ideas
      map: ["substitute_ideas", "combine_ideas", /* ... */]
    },
    metadata: {
      lenses_used: ["substitute", "combine", /* ... */]
    }
  }
}
```

**Pros:**
- Clear contract defined in both places
- Validation happens before execution
- Type-safe

**Cons:**
- Rigid - all children must match exactly
- Adding new technique requires changing multiple places

---

### Option B: Invoke-Level Normalization (Recommended)

**Children declare native structure (flexible):**
```typescript
// SCAMPER
{
  outputSchema: {
    technique_name: "SCAMPER",
    lens_ideas: {
      substitute: { type: "array", items: { type: "string" } },
      combine: { type: "array", items: { type: "string" } },
      // ... all 7 lenses
    }
  },
  produces: {
    technique_name: "SCAMPER",
    lens_ideas: {
      substitute: "{{substitute_ideas}}",
      combine: "{{combine_ideas}}",
      // ...
    }
  }
}

// Six Hats
{
  outputSchema: {
    technique_name: "SixThinkingHats",
    hat_perspectives: {
      white_hat: { type: "array", items: { type: "string" } },
      red_hat: { type: "array", items: { type: "string" } },
      // ... all 6 hats
    }
  },
  produces: {
    technique_name: "SixThinkingHats",
    hat_perspectives: {
      white_hat: "{{white_hat_insights}}",
      red_hat: "{{red_hat_feelings}}",
      // ...
    }
  }
}
```

**Parent normalizes at aggregation time:**
```typescript
aggregation: {
  mode: "collect",
  into: "child_results",

  // NEW: Transform layer
  normalize: {
    normalized_ideas: {
      // Try each field, use first that exists
      coalesce: [
        "raw_outputs.lens_ideas.substitute",
        "raw_outputs.lens_ideas.combine",
        "raw_outputs.lens_ideas.adapt",
        // ... all lenses and hats
      ],
      flatten: true  // Array-of-arrays → flat array
    },

    technique_metadata: {
      technique_name: "technique_name",
      source_type: {
        conditional: [
          { if: "raw_outputs.lens_ideas exists", then: "SCAMPER" },
          { if: "raw_outputs.hat_perspectives exists", then: "SixThinkingHats" },
          { else: "raw_outputs.technique_name" }
        ]
      }
    }
  }
}
```

**Parent gets:**
```typescript
child_results = [
  {
    technique_name: "SCAMPER",
    raw_outputs: { lens_ideas: { /* ... */ } },
    normalized_ideas: ["sub idea 1", "sub idea 2", /* all flattened */],
    technique_metadata: { technique_name: "SCAMPER", source_type: "SCAMPER" }
  },
  {
    technique_name: "SixThinkingHats",
    raw_outputs: { hat_perspectives: { /* ... */ } },
    normalized_ideas: ["white insight 1", "red feeling 1", /* all flattened */],
    technique_metadata: { technique_name: "SixThinkingHats", source_type: "SixThinkingHats" }
  }
]
```

**Pros:**
- Flexible - new techniques without changing existing ones
- Normalization logic in one place (parent)
- Children keep their native structure

**Cons:**
- More complex transform logic
- Validation happens post-execution (later发现问题)

---

## Comparison: Option A vs Option B

| Aspect | Option A (Strict Contracts) | Option B (Invoke-Level Normalize) |
|--------|---------------------------|----------------------------------|
| **Child output** | Normalized structure | Native structure |
| **Parent contract** | Exact schema match | Loose + transform rules |
| **Normalization** | Child responsibility | Parent responsibility |
| **Validation** | Pre-execution | Post-execution transform |
| **Flexibility** | Rigid | Flexible |
| **Debugging** | Clear contract in both places | Transform logic in one place |
| **Best for** | Stable, known workflows | Evolving technique library |
| **Example** | SCAMPER and Six Hats agree on `{ ideas: string[] }` | Add new technique without changing others |

---

## Recommendations

### For Brainstorming Workflow: Option B (Invoke-Level Normalization)

**Rationale:**
- Brainstorming techniques will keep being added
- Each technique has its own natural structure (7 lenses, 6 hats, etc.)
- Parent defines the "brainstorming contract" centrally
- New techniques don't need to know about each other's schemas
- Better fits the evolving nature of the technique library

### For Other Workflows: Option A (Strict Contracts)

**Rationale:**
- Stable, known workflows benefit from strict validation
- Pre-execution checking catches errors earlier
- Clear contracts help with documentation and understanding

### For Artifact Updates: Explicit artifactUpdates

**Why:**
- Clear, declarative approach
- Steps control what gets published
- Not everything goes to artifact (e.g., selected_techniques used only internally)
- Easier to track provenance

---

## Brainstorming Workflow Flow (Revised)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Setup                                                   │
│ ─────────────                                                   │
│ Produces: session_topic, stated_goals, selected_techniques      │
│ Publishes to artifact: session_topic, stated_goals             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Invoke Techniques (DIVERGE) - Option B                  │
│ ─────────────────────────────────────────                      │
│ Invokes: SCAMPER, Six Hats, etc.                                │
│ Children return native structures                                │
│ Parent normalizes to:                                           │
│   - normalized_ideas (flattened from all techniques)            │
│   - technique_metadata                                          │
│                                                                 │
│ Produces: child_results                                         │
│ Published to artifact: (none - consumed by Step 3)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Converge                                                │
│ ─────────────                                                   │
│ Consumes: child_results, normalized_ideas                       │
│ AI task: Cluster, prioritize, distill into actionable insights │
│                                                                 │
│ Produces: distilled_insights, prioritized_ideas, action_items   │
│ Publishes to artifact: all_ideas, distilled_insights, actions   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Action Planning                                         │
│ ──────────────────────                                          │
│ Consumes: distilled_insights, prioritized_ideas                 │
│ AI task: Turn insights into next steps, assign owners           │
│                                                                 │
│ Produces: final_action_plan, next_steps                         │
│ Publishes to artifact: final_action_plan, next_steps             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Artifact Complete
```

---

## Next Steps

### Immediate Actions
1. **Fix the bug**: Update SCAMPER to output `generated_ideas` instead of `captured_ideas`
2. **Simplify variable resolution**: Move from 4-level precedence to single flat store
3. **Implement artifactUpdates**: Add selective publishing to step configs

### Medium-Term
1. **Implement typed output contracts**: Replace path-based extraction with direct produces
2. **Choose Option B**: Implement invoke-level normalization for brainstorming
3. **Add schema validation**: Runtime validation of output contracts

### Long-Term
1. **Type generation**: Auto-generate TypeScript types from JSON schemas
2. **Migration plan**: Gradual migration of existing workflows to new pattern
3. **Tooling**: Workflow validation/preview tooling

---

## Key Files to Review/Modify

- `packages/api/src/services/workflow-engine/variable-resolver.ts` - Simplify precedence
- `packages/api/src/services/workflow-engine/step-handlers/invoke-workflow-handler.ts` - Add normalization
- `packages/scripts/src/seeds/brainstorming.ts` - Fix SCAMPER bug, add artifactUpdates
- `packages/scripts/src/seeds/techniques/scamper.ts` - Update output naming

---

## Appendix: Code Snippets

### Simplified Variable Resolution (Proposed)

```typescript
// Instead of 4-level merge
interface ExecutionState {
  variables: Record<string, unknown>;
}

// Step outputs just merge in (shallow, last write wins)
state.variables = { ...state.variables, ...stepOutput };

// Template resolution is trivial
const rendered = Handlebars.compile(template)(state.variables);
```

### Schema Validation (Proposed)

```typescript
import { validate } from 'jsonschema';

function validateSchema(data: unknown, schema: any): boolean {
  const result = validate(data, schema);
  if (!result.valid) {
    console.error('Schema validation failed:', result.errors);
    return false;
  }
  return true;
}
```

---

**Document Status**: Draft for discussion
**Owner**: TBD
**Reviewers**: TBD
