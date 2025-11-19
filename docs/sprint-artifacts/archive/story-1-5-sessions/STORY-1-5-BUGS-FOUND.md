# Story 1.5 - Bug Fixes Session (2025-11-10)

## Critical Bug Fixed: Ask-User Steps Auto-Completing

### Problem
Workflow was completing **both** Steps 1 and 2 immediately instead of pausing for user input:
- Step 1 (execute-action): Should pause for user confirmation
- Step 2 (ask-user): Should pause and wait for path input
- Both were being marked as `"status": "completed"` with empty output `{}`
- Execution status showed `"completed"` instead of `"paused"`

### Root Cause
The executor was saving steps as "completed" **BEFORE** checking if they required user input:

```typescript
// OLD CODE (BUGGY):
// 1. Execute step handler
const result = await handler.executeStep(currentStep, context, userInput);

// 2. Save as completed immediately (BUG!)
await updateExecutedSteps(..., "completed");
await mergeExecutionVariables(...);

// 3. THEN check if pause needed (too late!)
if (result.requiresUserInput) {
  await pauseExecution(executionId);
  return;
}
```

**Result:** Step was already saved as "completed" even though it needed user input!

---

## Fixes Applied

### Fix 1: Check `requiresUserInput` BEFORE Saving
**File:** `packages/api/src/services/workflow-engine/executor.ts` (lines 171-211)

```typescript
// NEW CODE (FIXED):
const result = await handler.executeStep(currentStep, context, userInput);

// CHECK FIRST before saving
if (result.requiresUserInput) {
  console.log(`Step ${currentStep.stepNumber} requires user input - pausing`);
  
  // Mark as "waiting" (not "completed")
  await updateExecutedSteps(..., "waiting");
  
  // Pause execution
  await pauseExecution(executionId, currentStep.stepNumber);
  return;
}

// Only save as completed if no user input needed
await updateExecutedSteps(..., "completed");
await mergeExecutionVariables(...);
```

**Key Changes:**
1. ✅ Check `requiresUserInput` **before** saving
2. ✅ Use new status `"waiting"` for steps that need input
3. ✅ Only mark as `"completed"` when truly done

---

### Fix 2: Resume from "Waiting" Steps
**File:** `packages/api/src/services/workflow-engine/executor.ts` (lines 120-152)

**Problem:** When user submitted input, the executor didn't know to resume the "waiting" step.

```typescript
// NEW CODE:
// Find steps that are truly completed (not waiting)
const completedStepNumbers = Object.keys(executedSteps)
  .map(Number)
  .filter((stepNum) => executedSteps[stepNum].status === "completed")
  .sort((a, b) => b - a);

// Check if there's a waiting step
const waitingStepNumbers = Object.keys(executedSteps)
  .map(Number)
  .filter((stepNum) => executedSteps[stepNum].status === "waiting")
  .sort((a, b) => a - b);

if (waitingStepNumbers.length > 0) {
  // Resume from the waiting step
  currentStepNumber = waitingStepNumbers[0];
} else if (completedStepNumbers.length > 0) {
  // Continue from last completed
  const lastStep = steps.find((s) => s.stepNumber === lastCompletedStep);
  currentStepNumber = lastStep?.nextStepNumber || lastCompletedStep + 1;
}
```

**Key Changes:**
1. ✅ Prioritize "waiting" steps over "completed" steps
2. ✅ Resume execution from the waiting step number
3. ✅ Pass `userInput` to the waiting step when resuming

---

### Fix 3: Execute-Action Steps Also Require Confirmation
**File:** `packages/api/src/services/workflow-engine/step-handlers/execute-action-handler.ts`

**Requirement:** Per Fahad's feedback: *"it should not go to the next step until the user clicks on continue (so even setting variables should let the user confirm)"*

```typescript
// NEW CODE:
async executeStep(step, context, userInput) {
  const config = step.config as ExecuteActionStepConfig;

  // First execution - pause for confirmation
  if (userInput === undefined) {
    console.log("First execution - requiring user confirmation");
    
    // Execute actions to prepare output
    const resolvedActions = await this.resolveActions(config.actions, context);
    const output = await this.executeSequential(resolvedActions, context);

    return {
      output, // Return computed output for preview
      nextStepNumber: step.nextStepNumber ?? null,
      requiresUserInput: true, // Wait for user confirmation
    };
  }

  // User confirmed - complete the step
  console.log("User confirmed - completing step");
  // ... execute and return final result
}
```

**Key Changes:**
1. ✅ First call (no `userInput`) → pause for user confirmation
2. ✅ Second call (with `userInput`) → complete and advance
3. ✅ User must explicitly click "Continue" for ALL steps

---

### Fix 4: Update StateManager Interface
**File:** `packages/api/src/services/workflow-engine/state-manager.ts` (line 11)

```typescript
export interface ExecutedStepData {
  stepId: string;
  status: "completed" | "failed" | "skipped" | "waiting"; // Added "waiting"
  startedAt: string;
  completedAt?: string;
  output?: Record<string, unknown>;
  error?: string;
}
```

---

## Expected Behavior After Fix

### When Workflow Starts:
1. User creates project
2. User selects initializer
3. Workflow execution starts
4. **Step 1 (execute-action):**
   - Executes `set-variable` action
   - Returns `requiresUserInput: true`
   - Marked as `"status": "waiting"`
   - Execution paused
5. **UI shows Step 1** with "Continue" button
6. User clicks "Continue"
7. **Step 1 completes:**
   - Marked as `"status": "completed"`
   - Variable `detected_field_type = "greenfield"` saved
8. **Step 2 (ask-user):**
   - Returns `requiresUserInput: true`
   - Marked as `"status": "waiting"`
   - Execution paused
9. **UI shows Step 2** with path selector
10. User selects path and clicks "Continue"
11. **Step 2 completes:**
    - Marked as `"status": "completed"`
    - Variable `project_path` saved
12. Workflow paused (end of Story 1.5 scope)

---

## Database State Examples

### Before Fix (BUGGY):
```json
{
  "executedSteps": {
    "1": {
      "status": "completed",  // ❌ Wrong!
      "output": {},           // ❌ Empty!
      "completedAt": "2025-11-10T12:07:40.492Z"
    },
    "2": {
      "status": "completed",  // ❌ Wrong!
      "output": {},           // ❌ Empty!
      "completedAt": "2025-11-10T12:07:40.492Z"
    }
  },
  "status": "completed",      // ❌ Should be "paused"!
  "variables": {}             // ❌ Empty!
}
```

### After Fix (CORRECT):
```json
{
  "executedSteps": {
    "1": {
      "status": "waiting",    // ✅ Correct!
      "output": {},           // ✅ Waiting for confirmation
      "startedAt": "2025-11-10T12:15:00.000Z"
    }
    // Step 2 hasn't started yet ✅
  },
  "status": "paused",         // ✅ Correct!
  "currentStepId": "<step-1-uuid>",
  "variables": {}             // ✅ No variables until step completes
}
```

**After user confirms Step 1:**
```json
{
  "executedSteps": {
    "1": {
      "status": "completed",  // ✅ Now completed!
      "output": {
        "detected_field_type": "greenfield"
      },
      "completedAt": "2025-11-10T12:15:05.000Z"
    },
    "2": {
      "status": "waiting",    // ✅ Waiting for path input
      "startedAt": "2025-11-10T12:15:05.100Z"
    }
  },
  "status": "paused",         // ✅ Still paused
  "currentStepId": "<step-2-uuid>",
  "variables": {
    "detected_field_type": "greenfield"  // ✅ Variable saved!
  }
}
```

---

## Testing Instructions

### Manual Test via UI:
1. Navigate to http://localhost:3001
2. Click "Create New Project"
3. Select "Guided Setup" initializer
4. Click "Continue"
5. **Verify Step 1 pauses** - you should see:
   - "Step 1 of 10" in progress bar
   - Step 1 content displayed
   - "Continue" button enabled
   - Backend logs show: `[Executor] Step 1 requires user input - pausing execution`
6. Click "Continue" on Step 1
7. **Verify Step 2 pauses** - you should see:
   - "Step 2 of 10" in progress bar
   - Path selector displayed
   - Backend logs show: `[Executor] Step 2 requires user input - pausing execution`
8. Select path and click "Continue"
9. **Verify Step 2 completes** - check database:
   ```sql
   SELECT executed_steps, variables, status 
   FROM workflow_executions 
   ORDER BY created_at DESC LIMIT 1;
   ```

### Check Server Logs:
```bash
tail -f /tmp/chiron-server.log | grep -E "\[Executor\]|\[AskUserHandler\]|\[ExecuteActionHandler\]"
```

Look for:
- `[ExecuteActionHandler] First execution - requiring user confirmation`
- `[Executor] Step 1 requires user input - pausing execution`
- `[Executor] pauseExecution called for: <execution-id> at step: 1`
- `[AskUserHandler] No user input - returning requiresUserInput: true`

---

## Files Modified

1. **`packages/api/src/services/workflow-engine/executor.ts`**
   - Lines 171-211: Check requiresUserInput before saving
   - Lines 120-152: Resume from waiting steps
   - Lines 285-325: Add "waiting" status support
   - Line 362: Add stepNumber param to pauseExecution

2. **`packages/api/src/services/workflow-engine/step-handlers/execute-action-handler.ts`**
   - Lines 12-33: Add user confirmation requirement
   - Returns `requiresUserInput: true` on first execution

3. **`packages/api/src/services/workflow-engine/state-manager.ts`**
   - Line 11: Add "waiting" to ExecutedStepData status union

---

## Next Steps

1. ✅ Backend fixes applied
2. ⏳ **Test via UI** (manual testing needed - Fahad running web on 3001)
3. ⏳ Verify database state after each step
4. ⏳ Check server logs for expected console output
5. ⏳ Test full flow: Create project → Step 1 → Step 2 → Complete

---

## Status: Ready for Testing

**Backend server running on port 3000**
- All fixes applied ✅
- Debug logging enabled ✅
- Ready to test from web UI on port 3001 ✅

Test by creating a new project and observing:
1. Step 1 pauses and requires user confirmation
2. Step 2 pauses and waits for path input
3. Database shows correct "waiting" → "completed" transitions
4. Variables are only saved after user confirms each step
