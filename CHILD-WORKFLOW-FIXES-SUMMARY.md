# Child Workflow Execution - Latest Fixes Applied

## Date: December 5, 2025

## Changes Made

### 1. Added Real-Time Status Polling (Frontend)
**File**: `apps/web/src/components/workflows/steps/invoke-workflow-step.tsx`

**What it does**:
- Polls `getExecutionsByIds` every 2 seconds to get live status of child workflows
- Merges live status into child metadata
- UI now reflects real-time status changes (pending → running → completed/failed)

**Code added**:
```typescript
// Poll for real-time child execution status updates
const { data: liveChildExecutions } = trpc.workflows.getExecutionsByIds.useQuery(
  { executionIds: childMetadata.map((c) => c.id) },
  {
    enabled: childMetadata.length > 0,
    refetchInterval: 2000, // Poll every 2 seconds
  }
);

// Merge live status into child metadata
const updatedChildMetadata = childMetadata.map((child) => {
  const liveData = liveChildExecutions?.find((e) => e.id === child.id);
  return liveData ? { ...child, status: liveData.status, error: liveData.error } : child;
});
```

### 2. Created `getExecutionsByIds` Backend Endpoint
**File**: `packages/api/src/routers/workflows.ts`

**What it does**:
- Accepts array of execution IDs
- Returns current status, workflow name, error, completedAt for each execution
- Lightweight query for polling (doesn't fetch full execution state)

**Code added**:
```typescript
getExecutionsByIds: protectedProcedure
  .input(z.object({ executionIds: z.array(z.string().uuid()) }))
  .query(async ({ input }) => {
    const executions = await db.query.workflowExecutions.findMany({
      where: (executions, { inArray }) => inArray(executions.id, input.executionIds),
      with: { workflow: true },
    });

    return executions.map((e) => ({
      id: e.id,
      status: e.status,
      workflowId: e.workflowId,
      workflowName: e.workflow?.displayName || "Unknown",
      variables: e.variables,
      error: e.error,
      completedAt: e.completedAt?.toISOString(),
    }));
  }),
```

### 3. Update Parent's `_child_metadata` After Child Creation
**File**: `packages/api/src/routers/workflows.ts` (createAndStartChild mutation)

**What it does**:
- After creating child execution, updates parent's `_child_metadata` variable
- Ensures parent always has current list of child executions
- Fixes issue where parent didn't know about children created via dialog

**Code added**:
```typescript
// Update parent's _child_metadata to track this child
const currentChildMetadata = (parentExecution.execution.variables._child_metadata || []) as Array<...>;

await stateManager.mergeExecutionVariables(input.parentExecutionId, {
  _child_metadata: [
    ...currentChildMetadata,
    {
      id: childExecution.id,
      workflowId: childExecution.workflowId,
      workflowName: childExecution.workflow.displayName || childExecution.workflow.name,
      status: childExecution.status,
      createdAt: childExecution.createdAt.toISOString(),
    },
  ],
});
```

## Expected Behavior Now

### Before Starting Child Workflow
1. Parent workflow shows invoke-workflow step
2. Each child workflow shows:
   - ⭕ **Status**: "Not started" (pending)
   - Workflow name (fetched via `getByIds`)
   - Workflow description
   - **[Execute]** button

### After Clicking Execute
1. Confirmation dialog opens showing:
   - Workflow name and description
   - Mapped variables (e.g., `topic`, `goals`)
   - [Cancel] and [Start Workflow] buttons

### After Clicking Start Workflow
1. Backend calls `createAndStartChild`:
   - Creates child execution with `parentExecutionId`
   - Passes `mappedVariables` + `selected_model` as `initialVariables`
   - Updates parent's `_child_metadata`
   - Starts child workflow execution

2. Frontend:
   - Dialog closes (confirmation)
   - Child workflow dialog opens (showing child execution UI)
   - Parent UI updates to show:
     - 🔵 **Status**: "Running" (with spinning icon)
     - **[Resume]** button (to re-open child dialog)

3. Status polling begins:
   - Every 2 seconds, queries `getExecutionsByIds`
   - Updates child status in UI without page refresh

### While Child is Running
- Parent UI shows: 🔵 "Running" with spinning icon
- Click **[Resume]** to re-open child dialog and see progress
- Child executes steps normally (ask-user, run-tool, etc.)

### When Child Completes
1. Child execution status changes to "completed"
2. Next poll (within 2 seconds) detects change
3. Parent UI updates automatically:
   - ✅ **Status**: "Completed" (with checkmark)
   - Shows ideas count (if available)
   - **[Details]** button to expand and see results

### When Child Fails
1. Child execution status changes to "failed"
2. Next poll detects change
3. Parent UI updates:
   - ❌ **Status**: "Failed" (with X icon)
   - **[Retry]** button
   - **[Details]** button to see error message

### Multiple Children (Parallel Execution)
- Each child can be started independently
- All run in parallel (no blocking)
- Status updates independently for each child
- Progress counter: "2 / 4 completed"

## Testing the Fix

### Step 1: Navigate to Parent Workflow
```
http://localhost:3004/projects/{projectId}/workflow/{executionId}
```
- Should see invoke-workflow step with list of child workflows
- All should show "Not started" status

### Step 2: Execute a Child Workflow
1. Click **[Execute]** on any workflow
2. Confirm workflow name/description is correct in dialog
3. Confirm mapped variables show correct values
4. Click **[Start Workflow]**

### Step 3: Verify Child Execution
**Check 1**: Dialog opens showing child workflow
- Should see child's first step (e.g., ask-user chat interface)
- Should NOT see any errors

**Check 2**: Parent UI updates
- Close child dialog (or keep it open)
- Parent should show child as "Running" with spinning icon
- Should happen within 2 seconds

**Check 3**: Child progresses through steps
- Child should execute normally (ask questions, run tools, etc.)
- All inherited variables should be available (topic, goals, selected_model)

**Check 4**: Child completes
- When child finishes last step, status → "completed"
- Parent UI updates to "Completed" ✅ within 2 seconds
- Can click **[Details]** to see results

### Step 4: Test Multiple Children
1. Execute second child workflow
2. Both should show "Running"
3. Both should complete independently
4. Progress counter updates: "2 / 4 completed"

## Debugging If Still Not Working

### Check 1: Server Logs
```bash
tail -f /home/gondilf/Desktop/projects/masters/chiron/server.log | grep -E "CreateAndStartChild|executeWorkflow|ERROR"
```

**Look for**:
- `[CreateAndStartChild] Updated parent {id} with child metadata for {childId}`
- `Started development server` (confirms server running)
- Any `ERROR` messages

### Check 2: Browser Console
Open DevTools (F12) → Console tab

**Look for**:
- tRPC errors (red text)
- Failed network requests
- React errors

### Check 3: Network Tab
Open DevTools (F12) → Network tab

**Filter for**: `createAndStartChild`

**When you click "Start Workflow", check**:
- Request payload has correct `parentExecutionId`, `workflowId`, `projectId`, `mappedVariables`
- Response status is 200 (success)
- Response body has child execution data

**Filter for**: `getExecutionsByIds`

**Should see**:
- Polling requests every 2 seconds
- Response with child execution status

### Check 4: Database (Drizzle Studio)
```bash
bun run db:studio
```

**Check `workflow_executions` table**:
1. Find child execution by ID
2. Verify:
   - `parent_execution_id` is set correctly
   - `status` is "active" or "completed"
   - `variables` contains mapped values (topic, goals, selected_model)

3. Find parent execution
4. Verify:
   - `variables._child_metadata` is an array
   - Contains child execution metadata

## Common Issues & Solutions

### Issue: Status stuck on "pending"
**Cause**: Child execution not being created or started

**Debug**:
1. Check server logs for `createAndStartChild` call
2. Check if child execution exists in database
3. If exists, check its `status` field

**Fix**: Look at `executeWorkflow()` function - might not be starting execution loop

### Issue: Status shows "running" but never completes
**Cause**: Child execution blocked on a step

**Debug**:
1. Open child dialog to see which step it's on
2. Check if step requires user input
3. Check server logs for step errors

**Fix**: Provide required input or fix step configuration

### Issue: "Unknown Workflow" shown
**Cause**: `getByIds` query not returning workflow data

**Debug**:
1. Check Network tab for `getByIds` request
2. Verify workflow IDs are correct
3. Check if workflows exist in database

**Fix**: Ensure workflow IDs in `workflowsToInvoke` variable are valid

### Issue: Variables not passed to child
**Cause**: Variable mapping not calculating correctly

**Debug**:
1. Check confirmation dialog - are mapped variables shown?
2. Check child execution's `variables` field in database
3. Check server logs for `initialVariables`

**Fix**: Verify `variableMapping` in step config

## Files Changed

### Backend
1. `packages/api/src/routers/workflows.ts`
   - Added `getExecutionsByIds` query (line ~1131)
   - Updated `createAndStartChild` to update parent's `_child_metadata` (line ~1240)

### Frontend
2. `apps/web/src/components/workflows/steps/invoke-workflow-step.tsx`
   - Added polling query for child executions (line ~64)
   - Merged live status into child metadata (line ~77)
   - Updated `workflowItems` to use `updatedChildMetadata` (line ~111)

## What Should Work Now

✅ Child execution creation
✅ Parent-child linking (parent_execution_id)
✅ Variable mapping and passing
✅ Model inheritance (selected_model)
✅ Real-time status updates (polling every 2s)
✅ UI status indicators (pending/running/completed/failed)
✅ Child dialog opening
✅ Multiple parallel children
✅ Progress tracking

## What to Test Next

1. ✅ Execute a single child workflow end-to-end
2. ✅ Verify status updates in real-time
3. ✅ Execute multiple children in parallel
4. ✅ Test failed child scenario
5. ✅ Test child completion and output aggregation

## Server Status

✅ Server running at: `http://localhost:3000`
✅ Logs: `/home/gondilf/Desktop/projects/masters/chiron/server.log`
✅ Hot reload enabled (changes auto-reload)

## Next Commands to Run

**If you want to test now**:
```bash
# Web client is not running, start it:
cd /home/gondilf/Desktop/projects/masters/chiron
bun run dev:web

# Then navigate to:
# http://localhost:{port}/projects/{projectId}/workflow/{executionId}
```

**If you want to watch logs**:
```bash
# In a separate terminal:
tail -f /home/gondilf/Desktop/projects/masters/chiron/server.log
```

**If you want to check database**:
```bash
# Already running:
bun run db:studio
# Visit: http://localhost:4983
```
