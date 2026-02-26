---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: []
workflowType: 'research'
lastStep: 5
research_type: 'technical'
research_topic: 'workflow-definition + transition-binding eligibility contracts with deterministic diagnostics and explicit selection semantics'
research_goals: 'Find TypeScript schema-first examples (Effect Schema, zod, io-ts) of workflow systems with deterministic eligibility checking and conflict resolution when multiple workflows match'
user_name: 'Gondilf'
date: '2026-02-24'
web_research_enabled: true
source_verification: true
---

# Research Report: Technical

**Date:** 2026-02-24
**Author:** Gondilf
**Research Type:** Technical

---

## Research Overview

Researching workflow-definition patterns with schema-first TypeScript implementations, focusing on:
- Deterministic eligibility diagnostics
- Explicit selection semantics for multiple eligible workflows
- Schema validation (Effect Schema, zod, io-ts)
- Transition-binding contracts

---

<!-- Content will be appended sequentially through research workflow steps -->

---

## Research Findings: Workflow Eligibility Contracts & Schema-First TypeScript

### 1. Core Concepts: Deterministic Workflow Selection

When multiple workflows are eligible for a given state/event combination, deterministic selection requires:

1. **Explicit Priority Ordering** - Each transition/workflow has a priority value
2. **Guard Conditions** - Boolean predicates that determine eligibility
3. **Conflict Resolution Strategy** - First-match, priority-based, or explicit selection

**Evidence from Open-Mercato Workflow Engine** ([GitHub](https://github.com/open-mercato/open-mercato/blob/main/packages/core/src/modules/workflows/lib/transition-handler.ts)):
```typescript
// Transitions sorted by priority (highest first)
const transitions = (definition.definition.transitions || [])
  .filter((t: any) => t.fromStepId === fromStepId)
  .sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0))
```

### 2. XState Guard Pattern (Industry Standard)

XState provides the most mature pattern for guarded transitions with deterministic selection:

**Key Features**:
- **Serial Guards**: Transitions tested in order, first valid transition wins
- **Guard Functions**: Pure functions receiving (context, event, meta) => boolean
- **Custom Guard Objects**: Serializable guard definitions with parameters

**Example from XState Documentation** ([XState Guards](https://xstate.js.org/docs/guides/guards.html)):
```typescript
const doorMachine = createMachine(
  {
    states: {
      closed: {
        on: {
          OPEN: [
            // Transitions tested one at a time
            // First valid transition will be taken
            { target: 'opened', cond: 'isAdmin' },
            { target: '.error', cond: 'shouldAlert' },
            { target: '.idle' } // fallback
          ]
        }
      }
    }
  },
  {
    guards: {
      isAdmin: (context) => context.level === 'admin',
      shouldAlert: (context) => context.alert === true
    }
  }
);
```

**Deterministic Diagnostics**: XState provides `state.can(event)` to check if a transition is possible without executing it.

### 3. Schema-First Validation Patterns

#### 3.1 Effect Schema (Recommended for This Repo)

Effect Schema provides the most robust schema-first validation with:
- **Decoding/Encoding**: Transform data from external sources
- **Composable Schemas**: Build complex validations from simple ones
- **Detailed Error Messages**: Structured parse errors
- **Type Inference**: Automatic TypeScript type derivation

**Example Pattern**:
```typescript
import { Schema } from "effect"

// Define workflow eligibility schema
const WorkflowEligibilitySchema = Schema.Struct({
  workflowId: Schema.String,
  priority: Schema.Number,
  guardCondition: Schema.optional(Schema.String),
  requiredContext: Schema.Array(Schema.String)
})

type WorkflowEligibility = Schema.Schema.Type<typeof WorkflowEligibilitySchema>

// Validate with detailed errors
const validateEligibility = Schema.decodeUnknownEither(WorkflowEligibilitySchema)
```

**Evidence**: Effect Patterns community recommends starting with schemas for all data ([Effect Patterns](https://github.com/PaulJPhilp/EffectPatterns)):
> "For any medium to large size project having a strong schema layer is key. Ideally, all the data coming from external sources should be filtered by a schema."

#### 3.2 Zod Alternative

Zod provides a simpler but less powerful alternative:

```typescript
import { z } from "zod"

const WorkflowTransitionSchema = z.object({
  from: z.string(),
  to: z.string(),
  event: z.string(),
  guard: z.function().optional(),
  priority: z.number().default(0)
})

type WorkflowTransition = z.infer<typeof WorkflowTransitionSchema>
```

### 4. Workflow Eligibility Contract Pattern

Based on research from n8n, open-mercato, and XState, here's a comprehensive pattern:

```typescript
// 1. Define the eligibility contract schema
const EligibilityContractSchema = Schema.Struct({
  workflowId: Schema.String,
  // Priority for conflict resolution (higher = more preferred)
  priority: Schema.Number,
  // Guard condition as serializable object
  guard: Schema.Struct({
    type: Schema.String,
    params: Schema.Record({ key: Schema.String, value: Schema.Unknown })
  }),
  // Required context keys for this workflow
  requiredContext: Schema.Array(Schema.String),
  // Metadata for diagnostics
  metadata: Schema.Struct({
    description: Schema.String,
    version: Schema.String
  })
})

// 2. Eligibility checker with deterministic selection
interface EligibilityChecker {
  // Check if a single workflow is eligible
  isEligible(
    contract: EligibilityContract,
    context: WorkflowContext,
    event: WorkflowEvent
  ): boolean
  
  // Find all eligible workflows, sorted by priority
  findEligible(
    contracts: EligibilityContract[],
    context: WorkflowContext,
    event: WorkflowEvent
  ): EligibleWorkflowResult[]
  
  // Select single workflow with explicit strategy
  selectWorkflow(
    eligible: EligibleWorkflowResult[],
    strategy: 'first' | 'priority' | 'explicit'
  ): WorkflowSelectionResult
}

// 3. Deterministic diagnostics
type EligibilityDiagnostics = {
  workflowId: string
  eligible: boolean
  guardResults: Array<{
    guardType: string
    passed: boolean
    reason?: string
  }>
  missingContext?: string[]
}
```

### 5. Adaptation to Chiron Repo Style

Given the project uses **Bun**, **Hono**, **oRPC**, and **Drizzle**, here's the recommended adaptation:

#### 5.1 Schema-First with Effect

```typescript
// packages/workflow/src/schemas/eligibility.ts
import { Schema } from "effect"

export const WorkflowId = Schema.String.pipe(
  Schema.pattern(/^wf_[a-z0-9_]+$/)
)

export const GuardConditionSchema = Schema.Struct({
  type: Schema.Literal("context_has", "event_matches", "custom"),
  path: Schema.Array(Schema.String),
  operator: Schema.optional(
    Schema.Literal("equals", "contains", "gt", "lt", "regex")
  ),
  value: Schema.Unknown
})

export const EligibilityContractSchema = Schema.Struct({
  id: WorkflowId,
  priority: Schema.Number,
  guard: GuardConditionSchema,
  requiredContext: Schema.Array(Schema.String),
  metadata: Schema.Struct({
    description: Schema.String,
    createdAt: Schema.DateFromString
  })
})

export type EligibilityContract = Schema.Schema.Type<
  typeof EligibilityContractSchema
>
```

#### 5.2 Hono/oRPC Integration

```typescript
// apps/server/src/routes/workflow-eligibility.ts
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { Schema } from "effect"
import { eligibilityService } from "@chiron/workflow"

const app = new Hono()

app.post("/check-eligibility", async (c) => {
  const body = await c.req.json()
  
  // Decode with Effect Schema
  const result = Schema.decodeUnknownEither(EligibilityContractSchema)(body)
  
  if (result._tag === "Left") {
    return c.json({ error: "Invalid contract", details: result.left }, 400)
  }
  
  const eligibility = await eligibilityService.check(result.right)
  return c.json(eligibility)
})
```

#### 5.3 Deterministic Selection Service

```typescript
// packages/workflow/src/services/eligibility-service.ts
import { Effect, Schema } from "effect"
import type { EligibilityContract, WorkflowContext, WorkflowEvent } from "../types"

export class EligibilityService {
  /**
   * Find all eligible workflows with full diagnostics
   */
  findEligible(
    contracts: EligibilityContract[],
    context: WorkflowContext,
    event: WorkflowEvent
  ): Effect.Effect<
    Array<{ contract: EligibilityContract; diagnostics: EligibilityDiagnostics }>,
    never,
    never
  > {
    return Effect.forEach(contracts, (contract) =>
      this.evaluateContract(contract, context, event).pipe(
        Effect.map((diagnostics) => ({ contract, diagnostics }))
      )
    ).pipe(
      Effect.map((results) => 
        results
          .filter((r) => r.diagnostics.eligible)
          .sort((a, b) => b.contract.priority - a.contract.priority)
      )
    )
  }
  
  /**
   * Select single workflow deterministically
   */
  selectWorkflow(
    eligible: Array<{ contract: EligibilityContract }>,
    strategy: "first" | "priority" | "explicit" = "priority"
  ): Effect.Effect<
    EligibilityContract | null,
    { reason: string; candidates: string[] },
    never
  > {
    if (eligible.length === 0) {
      return Effect.succeed(null)
    }
    
    if (strategy === "priority") {
      // Already sorted by priority
      return Effect.succeed(eligible[0].contract)
    }
    
    if (strategy === "first") {
      return Effect.succeed(eligible[0].contract)
    }
    
    // Explicit strategy requires user selection when multiple match
    if (eligible.length > 1) {
      return Effect.fail({
        reason: "Multiple workflows eligible - explicit selection required",
        candidates: eligible.map((e) => e.contract.id)
      })
    }
    
    return Effect.succeed(eligible[0].contract)
  }
  
  private evaluateContract(
    contract: EligibilityContract,
    context: WorkflowContext,
    event: WorkflowEvent
  ): Effect.Effect<EligibilityDiagnostics, never, never> {
    // Implementation with detailed diagnostics
    return Effect.succeed({
      workflowId: contract.id,
      eligible: true, // computed
      guardResults: [] // computed
    })
  }
}
```

### 6. References & Resources

#### Official Documentation
1. **Effect Schema** - https://effect.website/docs/schema/introduction/
2. **XState Guards** - https://xstate.js.org/docs/guides/guards.html
3. **Zod Documentation** - https://zod.dev/

#### High-Quality Examples
1. **Open-Mercato Workflow Engine** ([GitHub](https://github.com/open-mercato/open-mercato))
   - MIT licensed
   - Priority-based transition selection
   - TypeScript with MikroORM

2. **n8n Workflow Engine** ([GitHub](https://github.com/n8n-io/n8n))
   - Eligible workflow filtering patterns
   - Production-scale workflow orchestration

3. **XState** ([GitHub](https://github.com/statelyai/xstate))
   - Industry-standard state machine patterns
   - Guarded transitions with serial evaluation

4. **Effect Patterns Hub** ([GitHub](https://github.com/PaulJPhilp/EffectPatterns))
   - Community-driven Effect-TS patterns
   - Schema-first architecture recommendations

#### Articles & Guides
1. "How to Build Type-Safe State Machines in TypeScript" - OneUptime (2026)
2. "Building a Fault-Tolerant Web Data Ingestion Pipeline with Effect-TS" - Medium (2026)
3. "Practical Zod: Schema Validation That Makes Sense" - akrom.dev (2026)

### 7. Key Recommendations

1. **Use Effect Schema** for validation (already aligns with project's Effect usage patterns)
2. **Implement priority-based selection** for multiple eligible workflows
3. **Provide deterministic diagnostics** - always report why workflows are/aren't eligible
4. **Support explicit selection mode** - fail when multiple workflows match and explicit mode is enabled
5. **Make guards serializable** - store guard definitions as data, not just functions
6. **Follow XState's serial guard evaluation** - test transitions in order, first match wins

---

*Research completed: 2026-02-24*
*Sources: Official docs, GitHub repositories, technical articles*
