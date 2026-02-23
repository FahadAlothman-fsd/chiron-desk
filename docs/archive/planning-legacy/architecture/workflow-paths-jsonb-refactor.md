# Workflow Paths JSONB Refactor

**Status:** Pending Implementation  
**Date:** 2025-12-04  
**Reason:** Simplify workflow path configuration by using JSONB instead of junction table

---

## Problem Statement

Current architecture uses a normalized junction table (`workflow_path_workflows`) to link workflow paths to workflows with metadata. This creates:

1. **Impedance Mismatch**: YAML source files have nested structure, but we normalize to junction table
2. **Complex Seeding**: Must delete/insert junction table rows, handle orphans
3. **Complex Queries**: 3-table joins (workflow_paths + workflow_path_workflows + workflows)
4. **Fragmented Config**: Workflow path configuration split across 2 tables

## Proposed Solution

Store workflow path configuration as JSONB directly in `workflow_paths.phases` column, matching the YAML structure exactly.

**Before (Normalized):**
```
workflow_paths
  id: uuid
  name: string
  displayName: string
  
workflow_path_workflows (junction)
  workflow_path_id: uuid (FK)
  workflow_id: uuid (FK)
  phase: integer
  sequence_order: integer
  is_optional: boolean
  is_recommended: boolean
```

**After (JSONB):**
```
workflow_paths
  id: uuid
  name: string
  displayName: string
  phases: jsonb {
    "0": [
      {
        "id": "brainstorming",
        "optional": true,
        "agent": "analyst",
        "sequenceOrder": 1
      }
    ],
    "1": [...],
    "3": [...]
  }
```

---

## Implementation Steps

### Step 1: Update Schema

**File:** `packages/db/src/schema/core.ts`

#### Remove Junction Table
```typescript
// DELETE THIS ENTIRE TABLE DEFINITION:
export const workflowPathWorkflows = pgTable("workflow_path_workflows", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowPathId: uuid("workflow_path_id")
    .notNull()
    .references(() => workflowPaths.id, { onDelete: "cascade" }),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  phase: integer("phase").notNull(),
  sequenceOrder: integer("sequence_order").notNull(),
  isOptional: boolean("is_optional").notNull().default(false),
  isRecommended: boolean("is_recommended").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

#### Add JSONB Column to workflow_paths
```typescript
export const workflowPaths = pgTable("workflow_paths", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
  educationText: text("education_text"),
  tags: jsonb("tags"), // Existing column
  recommendedFor: text("recommended_for"),
  estimatedTime: varchar("estimated_time", { length: 100 }),
  agentSupport: varchar("agent_support", { length: 255 }),
  sequenceOrder: integer("sequence_order").default(0),
  
  // NEW: Store entire workflow path configuration as JSONB
  phases: jsonb("phases").default("{}"), // Add this line
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

#### Update Exports
```typescript
// In packages/db/src/schema/core.ts at the bottom

// REMOVE this line:
export const workflowPathWorkflowsRelations = relations(workflowPathWorkflows, ({ one }) => ({
  workflowPath: one(workflowPaths, {
    fields: [workflowPathWorkflows.workflowPathId],
    references: [workflowPaths.id],
  }),
  workflow: one(workflows, {
    fields: [workflowPathWorkflows.workflowId],
    references: [workflows.id],
  }),
}));

// No new relations needed - phases is just JSONB data
```

#### Update Schema Index Export
**File:** `packages/db/src/schema/index.ts`

```typescript
// REMOVE this line:
export * from "./core"; // This exports workflowPathWorkflows

// Or just remove the workflowPathWorkflows export if index.ts re-exports it
```

**File:** `packages/db/src/index.ts`

```typescript
// Verify this line is REMOVED:
export { workflowPathWorkflows } from "./schema/core";
```

---

### Step 2: Simplify Seeding Script

**File:** `packages/scripts/src/seeds/workflow-paths.ts`

#### Replace Junction Table Logic

**OLD (Lines ~199-250):**
```typescript
// Seed workflow_path_workflows join table from phases
if (data.phases && Array.isArray(data.phases) && workflowPathId) {
  console.log(`    Seeding ${data.phases.length} phases for ${name}...`);

  // Clean up existing join rows for this path first to avoid duplicates
  await db
    .delete(workflowPathWorkflows)
    .where(eq(workflowPathWorkflows.workflowPathId, workflowPathId));

  for (const phaseData of data.phases) {
    const phaseNumber = phaseData.phase !== undefined ? phaseData.phase : null;
    const phaseWorkflows = phaseData.workflows || [];

    if (phaseNumber === null) {
      console.warn(`    ⚠️  Phase number missing in ${name}, skipping phase`);
      continue;
    }

    for (let i = 0; i < phaseWorkflows.length; i++) {
      const workflowData = phaseWorkflows[i];
      const workflowName = workflowData.id;

      // Look up workflow by name
      const workflow = await db.query.workflows.findFirst({
        where: eq(workflows.name, workflowName),
      });

      if (!workflow) {
        console.warn(`    ⚠️  Workflow '${workflowName}' not found, skipping`);
        continue;
      }

      // Insert into junction table
      await db.insert(workflowPathWorkflows).values({
        workflowPathId,
        workflowId: workflow.id,
        phase: phaseNumber,
        sequenceOrder: i + 1,
        isOptional: workflowData.optional || false,
        isRecommended: workflowData.recommended || false,
      });
    }
  }
}
```

**NEW (Direct JSONB Mapping):**
```typescript
// Build phases JSONB structure from YAML
if (data.phases && Array.isArray(data.phases) && workflowPathId) {
  console.log(`    Processing ${data.phases.length} phases for ${name}...`);

  // Group workflows by phase number
  const phasesMap: Record<number, any[]> = {};

  for (const phaseData of data.phases) {
    const phaseNumber = phaseData.phase !== undefined ? phaseData.phase : null;
    const phaseWorkflows = phaseData.workflows || [];

    if (phaseNumber === null) {
      console.warn(`    ⚠️  Phase number missing in ${name}, skipping phase`);
      continue;
    }

    // Initialize phase array if doesn't exist
    if (!phasesMap[phaseNumber]) {
      phasesMap[phaseNumber] = [];
    }

    // Process each workflow in this phase
    for (let i = 0; i < phaseWorkflows.length; i++) {
      const workflowData = phaseWorkflows[i];
      const workflowName = workflowData.id;

      // Look up workflow by name to validate it exists
      const workflow = await db.query.workflows.findFirst({
        where: eq(workflows.name, workflowName),
      });

      if (!workflow) {
        console.warn(`    ⚠️  Workflow '${workflowName}' not found, skipping`);
        continue;
      }

      // Add to phases map
      phasesMap[phaseNumber].push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        optional: workflowData.optional || false,
        recommended: workflowData.recommended || false,
        agent: workflowData.agent || null,
        command: workflowData.command || null,
        sequenceOrder: i + 1,
      });
    }
  }

  // Update workflow path with phases JSONB
  await db
    .update(workflowPaths)
    .set({ phases: phasesMap })
    .where(eq(workflowPaths.id, workflowPathId));

  console.log(`    ✓ Seeded ${Object.keys(phasesMap).length} phases with JSONB`);
}
```

#### Update Imports (Remove Junction Table)
```typescript
// At the top of the file
import {
  db,
  workflowPaths,
  // REMOVE: workflowPathWorkflows,
  workflows,
} from "@chiron/db";
```

---

### Step 3: Update API Endpoint

**File:** `packages/api/src/routers/workflows.ts`

#### Update getByPhaseAndPath
```typescript
/**
 * Story 2.1: Get workflows by phase AND workflow path
 * Returns workflows that belong to a specific workflow path for a given phase
 * Uses JSONB phases column for filtering
 */
getByPhaseAndPath: protectedProcedure
  .input(
    z.object({
      phase: z.string(), // e.g., "0", "1", "2", etc.
      workflowPathId: z.string().uuid(),
    }),
  )
  .query(async ({ input }) => {
    // Convert phase string to number for JSONB key lookup
    const phaseNum = input.phase;

    // Fetch workflow path with phases JSONB
    const workflowPath = await db.query.workflowPaths.findFirst({
      where: eq(workflowPaths.id, input.workflowPathId),
    });

    if (!workflowPath) {
      throw new Error(`Workflow path not found: ${input.workflowPathId}`);
    }

    // Extract workflows for this phase from JSONB
    const phasesData = workflowPath.phases as Record<string, any[]>;
    const phaseWorkflows = phasesData[phaseNum] || [];

    if (phaseWorkflows.length === 0) {
      return { workflows: [] };
    }

    // Fetch full workflow objects
    const workflowIds = phaseWorkflows.map((w: any) => w.workflowId);
    const workflowsData = await db.query.workflows.findMany({
      where: (workflows, { inArray }) => inArray(workflows.id, workflowIds),
    });

    // Merge workflow data with path metadata
    const results = phaseWorkflows.map((phaseWorkflow: any) => {
      const workflow = workflowsData.find((w) => w.id === phaseWorkflow.workflowId);
      return {
        ...workflow,
        sequenceOrder: phaseWorkflow.sequenceOrder,
        isOptional: phaseWorkflow.optional,
        isRecommended: phaseWorkflow.recommended,
      };
    });

    // Sort by sequence order
    results.sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0));

    return { workflows: results };
  }),
```

#### Update Imports (Remove Junction Table)
```typescript
// At the top of workflows.ts
import {
  db,
  workflowExecutions,
  // REMOVE: workflowPathWorkflows,
  workflowTemplates,
  workflows,
  workflowPaths, // Add this if not already imported
} from "@chiron/db";
```

---

### Step 4: Update Dynamic Tool Loading

**File:** `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`

#### Update Phases Population Logic
Find the section around line 945-1000 that queries `workflow_path_workflows`:

**OLD:**
```typescript
// Fetch phases data for each workflow path
for (const result of results) {
  // Query workflow_path_workflows join table to get phases
  const pathWorkflows = await db
    .select({
      phase: workflowPathWorkflows.phase,
      sequenceOrder: workflowPathWorkflows.sequenceOrder,
      isOptional: workflowPathWorkflows.isOptional,
      isRecommended: workflowPathWorkflows.isRecommended,
      workflowId: workflowPathWorkflows.workflowId,
      workflowName: workflows.name,
      workflowDisplayName: workflows.displayName,
    })
    .from(workflowPathWorkflows)
    .leftJoin(
      workflows,
      eq(workflowPathWorkflows.workflowId, workflows.id),
    )
    .where(eq(workflowPathWorkflows.workflowPathId, result.id))
    .orderBy(
      workflowPathWorkflows.phase,
      workflowPathWorkflows.sequenceOrder,
    );

  // Group workflows by phase
  const phaseMap = new Map<number, any>();

  for (const pw of pathWorkflows) {
    const phaseNum = pw.phase ?? 0;

    if (!phaseMap.has(phaseNum)) {
      phaseMap.set(phaseNum, {
        phase: phaseNum,
        name: `Phase ${phaseNum}`,
        workflows: [],
      });
    }

    phaseMap.get(phaseNum).workflows.push({
      id: pw.workflowId,
      name: pw.workflowName,
      displayName: pw.workflowDisplayName,
      isOptional: pw.isOptional,
      isRecommended: pw.isRecommended,
      sequenceOrder: pw.sequenceOrder,
    });
  }

  // Convert map to array and attach to result
  result.phases = Array.from(phaseMap.values()).sort(
    (a, b) => a.phase - b.phase,
  );
}
```

**NEW:**
```typescript
// Fetch phases data from JSONB for each workflow path
for (const result of results) {
  // Phases already stored as JSONB in workflow_paths table
  const phasesData = (result.phases as Record<string, any[]>) || {};
  
  // Convert JSONB structure to array format expected by UI
  const phaseArray = [];
  
  for (const [phaseNumStr, phaseWorkflows] of Object.entries(phasesData)) {
    const phaseNum = parseInt(phaseNumStr, 10);
    
    // Enrich with full workflow display names
    const enrichedWorkflows = [];
    
    for (const workflowRef of phaseWorkflows) {
      const workflow = await db.query.workflows.findFirst({
        where: eq(workflows.id, workflowRef.workflowId),
      });
      
      enrichedWorkflows.push({
        id: workflowRef.workflowId,
        name: workflowRef.workflowName,
        displayName: workflow?.displayName || workflowRef.workflowName,
        isOptional: workflowRef.optional,
        isRecommended: workflowRef.recommended,
        sequenceOrder: workflowRef.sequenceOrder,
      });
    }
    
    phaseArray.push({
      phase: phaseNum,
      name: `Phase ${phaseNum}`,
      workflows: enrichedWorkflows.sort(
        (a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0)
      ),
    });
  }
  
  // Sort phases by phase number and attach to result
  result.phases = phaseArray.sort((a, b) => a.phase - b.phase);
}
```

#### Update Imports
```typescript
// At the top of the getDatabaseData method (around line 930)
const { db, workflowPaths, workflows } = await import("@chiron/db");
// REMOVE: workflowPathWorkflows
```

---

### Step 5: Clean Up Database Schema Exports

**File:** `packages/db/src/index.ts`

Remove junction table export if present:
```typescript
// REMOVE this line if it exists:
export { workflowPathWorkflows } from "./schema/core";
```

**File:** `packages/db/src/schema/index.ts`

Verify junction table is not re-exported:
```typescript
// Should NOT have:
export * from "./core"; // Only if this exports workflowPathWorkflows specifically
```

---

## Deployment Steps (Local Development)

```bash
# Step 1: Stop and remove existing database
bun db:down

# Step 2: Start fresh database container
bun db:start

# Step 3: Push new schema (creates tables with phases JSONB column)
bun db:push

# Step 4: Seed database with updated seeding logic
bun db:seed:reset
```

**No migration files needed** - we're in local development, fresh schema push is the approach.

---

## Testing Checklist

After implementation:

- [ ] Seeding completes without errors
- [ ] Workflow paths have `phases` JSONB populated
- [ ] `workflow_path_workflows` table no longer exists
- [ ] `/new-project` page displays workflow path options
- [ ] Workflow-init Step 1 shows Reasoning with workflow paths
- [ ] Clicking a workflow path card shows phase breakdown
- [ ] Phase breakdown shows correct workflows (brainstorming in Phase 0, sprint-planning in Phase 3)
- [ ] Project dashboard navigation still works
- [ ] No TypeScript errors in API or seeding code

---

## Rollback Plan

If issues occur:
1. Revert all code changes (git reset)
2. `bun db:down && bun db:start`
3. Restore old schema with junction table
4. `bun db:push && bun db:seed:reset`

---

## Benefits Recap

- ✅ **Simpler Seeding**: Direct YAML → JSONB mapping
- ✅ **Atomic Updates**: Change entire workflow path config in one UPDATE
- ✅ **Fewer Joins**: No 3-table joins needed
- ✅ **Version Control**: Entire path configuration versioned together
- ✅ **Easier Reasoning**: One row = one complete workflow path config
- ✅ **Matches Source**: JSONB structure mirrors YAML exactly

---

## Files to Modify

| File | Lines Changed (Est.) | Type |
|------|---------------------|------|
| `packages/db/src/schema/core.ts` | ~30 | Schema |
| `packages/scripts/src/seeds/workflow-paths.ts` | ~60 | Simplification |
| `packages/api/src/routers/workflows.ts` | ~40 | Query Logic |
| `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts` | ~50 | Query Logic |
| `packages/db/src/index.ts` | ~1 | Cleanup |

**Total:** ~180 lines, 5 files

---

**Ready to implement after UI/UX updates are complete!** 🚀
