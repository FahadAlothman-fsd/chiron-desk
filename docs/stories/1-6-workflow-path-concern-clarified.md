# Workflow Path Concern - Clarification

**Date:** 2025-11-13  
**User Concern:** "The way we are FETCHING the workflow paths is sketchy"

---

## 🎯 Distinction Clarified

### What's NOT the concern:
- ✅ `select_workflow_path` tool (custom) - Having LLM help user pick a path
- ✅ The overall flow: describe → classify → fetch → select
- ✅ Using AI to guide the selection

### What IS the concern:
- ⚠️ `fetch_workflow_paths` tool (database-query) - **HOW we query the database**
- ⚠️ The JSONB filter configuration approach
- ⚠️ String template substitution in SQL-like queries

---

## 🔍 The Sketchy Part

**Current database-query tool config:**
```typescript
{
  name: "fetch_workflow_paths",
  toolType: "database-query",
  databaseQuery: {
    table: "workflow_paths",
    filters: [
      { 
        field: "tags->>'fieldType'",           // ⚠️ Raw JSONB path syntax
        operator: "eq", 
        value: "{{detected_field_type}}"      // ⚠️ String template substitution
      },
      { 
        field: "tags->>'complexity'",          // ⚠️ Raw JSONB path syntax
        operator: "eq", 
        value: "{{complexity_classification}}" // ⚠️ String template substitution
      }
    ]
  }
}
```

**What makes this sketchy:**

1. **Raw SQL-ish syntax in JSON config:**
   - `"tags->>'fieldType'"` - PostgreSQL JSONB operator exposed
   - Config knows about database implementation details
   - Hard to validate or type-check

2. **String template substitution:**
   - `"{{detected_field_type}}"` - Basic string replacement
   - No validation that variable exists
   - No type coercion (what if it's a number?)
   - SQL injection risk if not careful

3. **Tight coupling:**
   - Config depends on exact database schema
   - If we rename `tags` to `metadata`, config breaks
   - If we change JSONB structure, config breaks

4. **Error handling nightmare:**
   - What if `detected_field_type` variable doesn't exist?
   - What if JSONB path is wrong?
   - What if operator is invalid?
   - No compile-time checking

---

## 💡 Better Alternatives

### Option 1: Typed Service Method (Recommended)

**Instead of generic database-query tool, create a specific method:**

```typescript
// packages/api/src/services/workflow-paths/workflow-path-service.ts
export class WorkflowPathService {
  async findPathsByComplexity(params: {
    fieldType: 'greenfield' | 'brownfield';
    complexity: 'quick-flow' | 'method' | 'enterprise';
  }): Promise<WorkflowPath[]> {
    return await db
      .select()
      .from(workflowPaths)
      .where(
        and(
          eq(sql`${workflowPaths.tags}->>'fieldType'`, params.fieldType),
          eq(sql`${workflowPaths.tags}->>'complexity'`, params.complexity)
        )
      );
  }
}
```

**Tool config becomes:**
```typescript
{
  name: "fetch_workflow_paths",
  toolType: "service-call",  // New type!
  serviceCall: {
    service: "WorkflowPathService",
    method: "findPathsByComplexity",
    params: {
      fieldType: "{{detected_field_type}}",
      complexity: "{{complexity_classification}}"
    }
  }
}
```

**Benefits:**
- ✅ Type-safe method with TypeScript
- ✅ Testable independently
- ✅ Can validate params before query
- ✅ Encapsulates JSONB logic
- ✅ Easy to refactor query without changing config

---

### Option 2: Semantic Query Builder

**Abstract away SQL details:**

```typescript
{
  name: "fetch_workflow_paths",
  toolType: "database-query",
  databaseQuery: {
    table: "workflow_paths",
    filters: {
      // Semantic, not SQL-ish
      matchTags: {
        fieldType: "{{detected_field_type}}",
        complexity: "{{complexity_classification}}"
      }
    }
  }
}
```

**Builder handles JSONB internally:**
```typescript
function buildQuery(config: DatabaseQueryConfig) {
  if (config.filters.matchTags) {
    // Internal: Handle JSONB path logic
    const conditions = Object.entries(config.filters.matchTags).map(
      ([key, value]) => eq(sql`${table.tags}->>'${key}'`, resolveVariable(value))
    );
    return and(...conditions);
  }
}
```

**Benefits:**
- ✅ Config doesn't know about JSONB operators
- ✅ Can change database implementation without breaking config
- ✅ Semantic naming (`matchTags` vs raw SQL)
- ⚠️ Still generic, might not fit all cases

---

### Option 3: Skip Tool, Use Direct Function Call

**Simplest approach:**

```typescript
// In AskUserChatStepHandler.ts
async executeStep(step, context) {
  // ... agent conversation ...
  
  // When complexity is approved:
  const paths = await workflowPathService.findPathsByComplexity({
    fieldType: context.variables.detected_field_type,
    complexity: context.variables.complexity_classification
  });
  
  context.variables.available_workflow_paths = paths;
  
  // Continue with agent...
}
```

**Benefits:**
- ✅ No "generic database-query tool" needed
- ✅ Direct, type-safe function call
- ✅ Easy to understand and debug
- ⚠️ Less flexible (hardcoded in step handler)

---

## 🎯 Recommendation for Implementation

### Phase 1 (Task 5): Build as Designed
- Implement generic database-query tool
- **Document every pain point** as we hit them
- See how it feels in practice

### Phase 2 (During Task 5 or 6): Refactor if Needed
**If it feels sketchy (it probably will):**

**Quick fix:** Add a `service-call` tool type
```typescript
export const toolTypes = [
  'ax-generation',
  'database-query',
  'service-call',  // NEW!
  'custom'
];
```

**Update config:**
```typescript
{
  name: "fetch_workflow_paths",
  toolType: "service-call",
  serviceCall: {
    service: "WorkflowPathService",
    method: "findPathsByComplexity",
    params: {
      fieldType: "{{detected_field_type}}",
      complexity: "{{complexity_classification}}"
    }
  }
}
```

**Implement service-call tool builder:**
```typescript
// packages/api/src/services/workflow-engine/tools/service-call-tool.ts
export function buildServiceCallTool(config: ServiceCallToolConfig) {
  return {
    name: config.name,
    description: "Fetch workflow paths based on complexity",
    execute: async (params) => {
      const service = getService(config.serviceCall.service);
      const method = service[config.serviceCall.method];
      const resolvedParams = resolveParams(config.serviceCall.params, params);
      return await method(resolvedParams);
    }
  };
}
```

---

## ✅ Summary

**Your concern:** Database-query tool with JSONB paths and string templates is fragile

**You're right!** It's sketchy because:
- Raw SQL syntax in config
- No type safety
- Tight coupling to schema
- Error handling is hard

**Solution during implementation:**
1. Try it first (validate the pattern)
2. Likely replace with `service-call` tool type
3. Move query logic to typed service method
4. Keep config semantic and simple

**The select_workflow_path (custom tool) is fine** - that's about LLM helping user choose, which makes sense!

---

**Concern Acknowledged & Plan Documented** ✅  
**Will refactor during Task 5 if it feels wrong (it probably will)** 🎯
