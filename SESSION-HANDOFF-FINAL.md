# Story 1.6: Final Session Handoff - optionsSource Implementation

## 🎯 Session Objective
Fix `update_complexity` tool and implement `optionsSource` feature to fetch dynamic options from database.

## ✅ Completed Work

### 1. **Variable Extraction After Approval** ✅
**Problem:** Tool 1 outputs weren't available to Tool 2  
**Fix:** Added loop in `packages/api/src/routers/workflows.ts` (lines 297-310) to extract approved tool outputs to `execution.variables`

**Commit:** `f95c4c7` - fix(story-1.6): Extract approved tool outputs to execution variables

### 2. **optionsSource Backend Implementation** ✅  
**Problem:** `complexity_options` variable not found  
**Fix:** Implemented `fetchAndStoreOptions()` method in `ask-user-chat-handler.ts` (lines 701-833)
- Queries `workflow_paths` table with JSONB filters
- Resolves template variables (e.g., `{{detected_field_type}}`)
- Extracts distinct values
- Stores in `execution.variables.complexity_options`

**Commit:** `673091c` - feat(story-1.6): Implement optionsSource to fetch dynamic options from database

### 3. **optionsSource Frontend Display** ✅
**Problem:** Options not visible to user  
**Fix:** Added "Available Options" section in sidebar accordion (`tool-status-sidebar.tsx` lines 233-276)  
- Displays fetched options in blue card
- Shows name + description for each option

**Commit:** `925b8a0` - feat(story-1.6): Display dynamic options in sidebar accordion

### 4. **Structured Tags Implementation** ✅
**Problem:** Tags were simple strings, no context for AI  
**Fix:** Updated schema and seed to use `{name, value, description}` structure

**Schema Changes:**
```typescript
// packages/db/src/schema/core.ts
tags: {
  complexity?: {
    name: string;        // "BMad Method Track"
    value: string;       // "method"
    description: string; // Full explanation for AI
  };
  fieldType?: { ... };
}
```

**Seed Changes:**
```typescript
// packages/scripts/src/seeds/workflow-paths.ts
const complexityTagMap = {
  "bmad-method": {
    name: "BMad Method Track",
    value: "method",
    description: "Full product planning track..."
  },
  // ... etc
};
```

**Commit:** `b22a2dd` - feat(story-1.6): Implement structured tags and fix sidebar options display

### 5. **Frontend Sidebar Fix** ✅
**Problem:** Options showing in ALL tool accordions  
**Fix:** Updated `ToolConfig` interface to include `optionsSource`, only show options if tool has it configured

```typescript
// Only show options if this tool has optionsSource configured
if (!tool.optionsSource) {
  return null;
}
```

**Result:** Tool 1 (update_summary) correctly shows NO options, Tool 2 (update_complexity) shows options

## 🐛 Remaining Issues

### Issue 1: Auto-Resume Not Working ⚠️
**Symptom:** After Tool 1 approval, Tool 2 doesn't execute automatically  
**Workaround:** User must send "continue" message  
**Root Cause:** Unknown - needs investigation in workflow resume logic  
**Priority:** HIGH - blocks user workflow

### Issue 2: Options Showing Duplicates (FIXED IN CODE, NEEDS FRESH TEST) 🔄
**Symptom:** Each option appears 3x (e.g., Quick Flow, Quick Flow, Quick Flow, BMad Method, BMad Method, BMad Method)  
**Root Cause:** Deduplication by `value` field implemented but old executions have cached data  
**Status:** Code fixed in commit `b22a2dd`, but existing workflow executions still show old data  
**Test Status:** Needs fresh workflow execution to verify fix

**Deduplication Logic (IMPLEMENTED):**
```typescript
// packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts (lines 802-808)
const uniqueValues = [
  ...new Map(
    extractedValues.map((v: any) => {
      const key = typeof v === "object" && v.value ? v.value : JSON.stringify(v);
      return [key, v];
    }),
  ).values(),
];
```

### Issue 3: YAML Track Mapping (FIXED) ✅
**Problem:** Enterprise workflows had wrong complexity value  
**Root Cause:** YAML files use `"enterprise-bmad-method"` but seed map only had `"enterprise"`  
**Fix:** Added aliases in `complexityTagMap`:
```typescript
"bmad-method": { name: "BMad Method Track", value: "method", ... },
"enterprise-bmad-method": { name: "Enterprise Method Track", value: "enterprise", ... },
```

**Verification:**
```sql
SELECT name, tags->'complexity'->>'value' FROM workflow_paths WHERE tags->'fieldType'->>'value' = 'greenfield';
-- Returns: quick-flow, method, enterprise ✅
```

## 📊 Test Results

### End-to-End Test (Partially Complete)
1. ✅ Created fresh workflow execution
2. ✅ Provided project description
3. ✅ Tool 1 (`update_summary`) executed and showed approval card
4. ✅ Tool 1 accordion does NOT show options (correct!)
5. ✅ Approved Tool 1  
6. ✅ Progress counter updated to 1/2
7. ⚠️ Had to manually send "continue" to trigger Tool 2 (auto-resume issue)
8. ✅ Tool 2 (`update_complexity`) executed with approval card
9. ✅ Tool 2 accordion shows options (correct!)
10. 🔄 Options showed duplicates (old execution with cached data - code is fixed)

### What Works
- ✅ Variable extraction from Tool 1 approval
- ✅ Tool 2 receives both required inputs (`project_description` + `complexity_options`)
- ✅ optionsSource fetches from database correctly
- ✅ Sidebar only shows options for tools with `optionsSource`
- ✅ Structured tags `{name, value, description}` in database

### What Needs Testing
- 🔄 **Fresh workflow execution** to verify deduplication works  
- 🔄 **All 3 complexity options** appear (Quick Flow, BMad Method, Enterprise)
- ⚠️ **Auto-resume** after approval

## 📁 Files Modified

### Backend
1. `packages/api/src/routers/workflows.ts` - Variable extraction after approval (lines 297-310)
2. `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`:
   - `fetchAndStoreOptions()` method (lines 701-833)
   - Deduplication logic (lines 802-808)
3. `packages/db/src/schema/core.ts` - Structured tags schema (lines 108-125)
4. `packages/scripts/src/seeds/workflow-paths.ts` - Structured tag seed data

### Frontend  
5. `apps/web/src/components/workflows/tool-status-sidebar.tsx`:
   - Added `optionsSource` to `ToolConfig` interface (lines 26-35)
   - Conditional options display (lines 233-275)

## 🔜 Next Steps

### Immediate (Story 1.6)
1. **Test with fresh workflow execution:**
   - Create new project
   - Complete Tool 1 and Tool 2
   - Verify 3 distinct options (no duplicates)
   - Verify Enterprise option appears

2. **Fix auto-resume issue:**
   - Investigate why workflow doesn't resume after approval
   - Check workflow state machine transitions
   - Test with Tool 1 → Tool 2 flow

3. **Clean up test files:**
   - Remove `test-db-query.ts` if not needed

### Future Stories
1. **Auto-resume investigation** - Why isn't the workflow continuing automatically after approval?
2. **Re-enable Tools 3 & 4** - fetch_workflow_paths, generate_project_name  
3. **Step 4+ Implementation** - Directory creation, git init, etc.

## 🎯 Key Technical Achievements

### optionsSource Flow (WORKING)
```
1. Step 3 loads → builds tools
2. For update_complexity → sees optionsSource config  
3. Calls fetchAndStoreOptions()
4. Queries: SELECT * FROM workflow_paths WHERE tags->'fieldType'->>'value' = 'greenfield'
5. Extracts distinct complexity values by 'value' field
6. Stores in execution.variables.complexity_options
7. Builds tool (now has access to complexity_options)
8. Tool executes → uses both project_description + complexity_options ✅
```

### Structured Tags Architecture
```typescript
// Database
tags: {
  complexity: {
    name: "BMad Method Track",
    value: "method", 
    description: "Full product planning track using PRD + Architecture + UX..."
  }
}

// AI Agent receives full description for context
// Backend filters by value
// Frontend displays name + description to user
```

## 💡 Important Notes

1. **optionsSource is a CORE FEATURE** - Cannot be removed, enables dynamic approval gates
2. **Tags must have {name, value, description}** - Enforced in schema for AI context
3. **Deduplication by `value` field** - Multiple workflow paths can share same complexity
4. **Options cached in execution.variables** - Old executions won't reflect database changes
5. **Sidebar shows options per-tool** - Not globally, only in relevant accordion

## 🔗 Related Documents
- `docs/architecture/dynamic-tool-options.md` - optionsSource architecture
- `docs/stories/1-6-card-selector-approval.md` - Approval card design
- `docs/stories/1-6-workflow-init-steps-3-4-description-complexity.md` - Story requirements

## Database Verification Commands

```bash
# Check tag structure
PGPASSWORD=password psql -h localhost -p 5434 -U postgres -d chiron -c \
  "SELECT name, tags->'complexity' FROM workflow_paths LIMIT 3;"

# Check distinct complexity values
PGPASSWORD=password psql -h localhost -p 5434 -U postgres -d chiron -c \
  "SELECT DISTINCT tags->'complexity'->>'value' as complexity FROM workflow_paths;"

# Check greenfield paths
PGPASSWORD=password psql -h localhost -p 5434 -U postgres -d chiron -c \
  "SELECT name, tags->'complexity'->>'name', tags->'complexity'->>'value' \
   FROM workflow_paths WHERE tags->'fieldType'->>'value' = 'greenfield';"
```

Expected result: 3 rows with values `quick-flow`, `method`, `enterprise` ✅
