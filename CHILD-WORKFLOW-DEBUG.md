# Child Workflow Execution Debugging Guide

## Current Status

Server is running at `http://localhost:3000`
Logs are being written to `server.log`

## What We've Fixed So Far

### ✅ Fixed Issues
1. **Drizzle Relations Error** - Added missing relations in schema
2. **Confirmation Dialog** - Shows workflow details and mapped variables before execution
3. **Backend Endpoints** - Created `getByIds` and `createAndStartChild` mutations
4. **Model Inheritance** - Child workflows inherit `selected_model` from parent
5. **Variable Passing** - Mapped variables are passed to child via `initialVariables`
6. **Parent-Child Linking** - `parentExecutionId` set atomically during creation
7. **Mastra Agent Error** - Fixed empty message array issue
8. **Dialog UI** - Fixed duplicate X button and sizing

## What Might Still Be Wrong

### Hypothesis 1: Child Workflow Not Starting
**Symptom**: Dialog shows but workflow doesn't progress

**Check**:
```bash
# Watch server logs for execution errors
tail -f /home/gondilf/Desktop/projects/masters/chiron/server.log | grep -i "error\|workflow\|execute"
```

**Possible Causes**:
- Child workflow executor not being called
- Missing initial step in child workflow
- Agent not initialized properly

**Files to Check**:
- `packages/api/src/routers/workflows.ts:1190-1196` (createAndStartChild)
- `packages/api/src/services/workflow-engine/executor.ts:36-97` (executeWorkflow)

### Hypothesis 2: Status Not Updating in UI
**Symptom**: Child creates but status shows "pending" forever

**Check**:
```typescript
// In invoke-workflow-step.tsx:92-104
// Status mapping logic should show:
// - "running" if childExecution.status === "active" || "paused"
// - "completed" if childExecution.status === "completed"
// - "failed" if failed child exists
```

**Possible Causes**:
- Parent execution not polling for updates
- `_child_metadata` not being updated
- Missing refetch after child creation

**Fix**: Add polling to parent execution query in the route file

### Hypothesis 3: Child Metadata Not Being Tracked
**Symptom**: UI shows "Unknown Workflow" or no status

**Check**:
```bash
# Query the database to see if parent_execution_id is set
bun run db:studio
# Then check workflow_executions table for parentExecutionId field
```

**Possible Causes**:
- `_child_metadata` variable not being updated in parent
- invoke-workflow-handler not tracking children properly

**Files to Check**:
- `packages/api/src/services/workflow-engine/step-handlers/invoke-workflow-handler.ts:60-75`

## Debugging Steps

### Step 1: Reproduce the Issue
1. Navigate to a parent workflow with invoke-workflow step
2. Click "Execute" on a child workflow
3. Confirm in the dialog
4. Observe what happens

### Step 2: Check Server Logs
```bash
# Clear log and watch for new entries
: > /home/gondilf/Desktop/projects/masters/chiron/server.log
tail -f /home/gondilf/Desktop/projects/masters/chiron/server.log
```

**Look for**:
- `[InvokeWorkflowHandler]` - Child creation logs
- `[WorkflowExecutor]` - Execution start logs
- `[StepHandler]` - Step execution logs
- Any error messages

### Step 3: Check Database State
```bash
bun run db:studio
```

**Check**:
1. `workflow_executions` table
   - Is child execution created?
   - Does it have correct `parent_execution_id`?
   - What's its status? (should be "active" after start)
   - Are `variables` populated with mapped values?

2. Parent execution
   - Does `variables` have `_child_metadata` array?
   - Does it contain child execution info?

### Step 4: Check Network Requests (Browser DevTools)
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter for `createAndStartChild`
4. Click Execute on child workflow
5. Check:
   - Request payload (has correct `parentExecutionId`, `workflowId`, `mappedVariables`?)
   - Response (has child execution ID?)
   - Any error responses?

### Step 5: Check React State
1. Install React DevTools extension
2. Find `WorkflowExecutionPage` component
3. Check state:
   - `executionData` - Does it have `_child_metadata`?
   - `childExecutionData` - Does it load when dialog opens?

## Next Steps to Implement

### TODO 1: Add Real-time Status Updates
**Problem**: Parent doesn't know when child status changes

**Solution**: Update invoke-workflow-handler to poll child status

**File**: `apps/web/src/components/workflows/steps/invoke-workflow-step.tsx`

**Change**:
```typescript
// Add polling query for child executions
const { data: childExecutionsData } = trpc.workflows.getExecutionsByIds.useQuery(
  { executionIds: childMetadata.map(c => c.id) },
  {
    enabled: childMetadata.length > 0,
    refetchInterval: 2000, // Poll every 2 seconds
  }
);

// Merge real-time status into childMetadata
const updatedChildMetadata = childMetadata.map(child => {
  const liveData = childExecutionsData?.find(e => e.id === child.id);
  return liveData ? { ...child, status: liveData.status } : child;
});
```

### TODO 2: Create `getExecutionsByIds` Backend Endpoint
**File**: `packages/api/src/routers/workflows.ts`

**Add**:
```typescript
getExecutionsByIds: protectedProcedure
  .input(z.object({
    executionIds: z.array(z.string().uuid()),
  }))
  .query(async ({ input }) => {
    const executions = await db.query.workflowExecutions.findMany({
      where: (executions, { inArray }) => 
        inArray(executions.id, input.executionIds),
      with: { workflow: true },
    });

    return executions.map(e => ({
      id: e.id,
      status: e.status,
      workflowId: e.workflowId,
      workflowName: e.workflow?.displayName || 'Unknown',
      variables: e.variables,
      error: e.error,
      completedAt: e.completedAt,
    }));
  }),
```

### TODO 3: Update Parent Variables After Child Creation
**Problem**: Parent's `_child_metadata` might not persist

**File**: `packages/api/src/routers/workflows.ts:1196-1218`

**Add**:
```typescript
// After child creation, update parent's _child_metadata
const parentExecution = await stateManager.getExecution(input.parentExecutionId);
if (parentExecution) {
  const currentChildMetadata = (parentExecution.execution.variables._child_metadata || []) as any[];
  
  await stateManager.mergeExecutionVariables(input.parentExecutionId, {
    _child_metadata: [
      ...currentChildMetadata,
      {
        id: childExecution.id,
        workflowId: childExecution.workflowId,
        workflowName: childExecution.workflow.displayName || childExecution.workflow.name,
        status: childExecution.status,
        createdAt: childExecution.createdAt.toISOString(),
      }
    ]
  });
}
```

### TODO 4: Fix Dialog Not Showing Child Progress
**Problem**: Dialog opens but doesn't show child workflow UI

**Check**: `apps/web/src/routes/projects/$projectId.workflow.$executionId.tsx:234-255`

The dialog renders correctly, but might need:
- Better error handling if `childExecutionData` is undefined
- Loading state while child execution initializes

## Common Issues & Solutions

### Issue: "Execution not found" error
**Solution**: Child execution might not be created. Check `createAndStartChild` mutation response.

### Issue: Dialog shows but is empty
**Solution**: `childExecutionData` query might be disabled. Check `enabled` condition.

### Issue: Status stuck on "pending"
**Solution**: Add polling query for child executions (TODO 1).

### Issue: Variables not passed to child
**Solution**: Check `mappedVariables` calculation in `handleConfirmStart()`.

## Testing Checklist

- [ ] Parent workflow loads and shows invoke-workflow step
- [ ] Click "Execute" opens confirmation dialog
- [ ] Dialog shows correct workflow name and description
- [ ] Dialog shows correct mapped variables (topic, goals)
- [ ] Click "Start Workflow" creates child execution
- [ ] Child execution has correct `parent_execution_id` in database
- [ ] Child execution starts running (status = "active")
- [ ] Child dialog opens and shows workflow UI
- [ ] Child workflow progresses through steps
- [ ] Parent UI updates to show "Running" status
- [ ] Child workflow completes
- [ ] Parent UI updates to show "Completed" status
- [ ] Parent can execute multiple children in parallel

## Key Files Reference

**Backend**:
- Router: `packages/api/src/routers/workflows.ts`
- Executor: `packages/api/src/services/workflow-engine/executor.ts`
- Handler: `packages/api/src/services/workflow-engine/step-handlers/invoke-workflow-handler.ts`
- Schema: `packages/db/src/schema/workflows.ts`

**Frontend**:
- Route: `apps/web/src/routes/projects/$projectId.workflow.$executionId.tsx`
- Step UI: `apps/web/src/components/workflows/steps/invoke-workflow-step.tsx`
- Layout: `apps/web/src/components/workflows/layouts/dialog-layout.tsx`

## Questions to Ask User

1. What exactly happens when you click "Start Workflow"?
   - Does the dialog close?
   - Do you see any errors?
   - Does the child workflow dialog open?

2. What status does the child workflow show in the parent UI?
   - "Not started" (pending)?
   - "Running"?
   - "Completed"?
   - Nothing/blank?

3. If you check the database (bun run db:studio), does the child execution exist?
   - What's its status field?
   - Does it have parent_execution_id set?

4. Are there any errors in:
   - Browser console (F12 → Console tab)?
   - Server logs (`server.log`)?
   - Network tab (F12 → Network → failed requests)?
