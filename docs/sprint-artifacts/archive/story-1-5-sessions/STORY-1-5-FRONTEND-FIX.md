# Story 1.5 - Frontend Fix: Add Continue Button to Execute-Action Steps

## Issue
After implementing backend pause logic, the frontend `ExecuteActionStep` component was still **auto-advancing** after 500ms instead of waiting for user confirmation.

**User Experience:**
- Step 1 (execute-action) would execute
- Show "Completed" for 500ms
- Auto-advance to Step 2
- **No Continue button!**

---

## Root Cause

The `ExecuteActionStep` component was designed for **automatic execution** (the original Story 1.5 spec):

```typescript
// OLD CODE (auto-advance):
useEffect(() => {
  if (result && !error && !loading) {
    setShowSuccess(true);
    const timer = setTimeout(() => {
      onComplete?.(result);  // Auto-advance after 500ms!
    }, 500);
    return () => clearTimeout(timer);
  }
}, [result, error, loading, onComplete]);
```

This conflicted with the new requirement: **"even setting variables should let the user confirm"**

---

## Fix Applied

### File 1: `apps/web/src/components/workflows/steps/execute-action-step.tsx`

**Change 1: Add `onContinue` prop**
```typescript
export interface ExecuteActionStepProps {
  // ... existing props
  onContinue?: () => void; // NEW: User confirmation callback
}
```

**Change 2: Remove auto-advance timer**
```typescript
// NEW CODE (no auto-advance):
useEffect(() => {
  if (result && !error && !loading) {
    setShowSuccess(true);  // Show success, but don't auto-advance
  }
}, [result, error, loading]);
```

**Change 3: Show Continue button in success state**
```typescript
// Success state - wait for user confirmation
if (showSuccess && result) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-50...">
        <CheckCircle2 className="h-5 w-5 text-green-600..." />
        <div className="text-sm text-green-700...">
          Action completed successfully
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={onContinue}
          size="lg"
          className="min-w-32"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
```

---

### File 2: `apps/web/src/routes/projects/$projectId.initialize.tsx`

**Change: Wire up `onContinue` handler**
```typescript
{currentStepData?.stepType === "execute-action" && (
  <ExecuteActionStep
    config={currentStepData.config as any}
    loading={continueWorkflow.isPending || execution.status === "active"}
    result={execution.variables}
    error={execution.error || undefined}
    onRetry={() => {
      continueWorkflow.mutate({
        executionId: execution.id,
        userId: "system",
      });
    }}
    onContinue={() => {
      // User confirmed - submit step with empty userInput to signal confirmation
      submitStep.mutate({
        executionId: execution.id,
        userId: "system",
        userInput: {}, // Empty object signals user confirmation
      });
    }}
    onComplete={() => {
      refetchExecution();
    }}
  />
)}
```

**Key Point:** When user clicks Continue, we call `submitStep` with `userInput: {}` (empty object). This signals to the backend that the user has confirmed the step.

---

## Complete Flow

### Step 1 (Execute-Action - Set Variable)

**First Execution (Backend):**
1. User selects initializer
2. Backend starts workflow
3. `ExecuteActionHandler.executeStep()` called with `userInput = undefined`
4. Handler executes `set-variable` action
5. Returns `{ output: { detected_field_type: "greenfield" }, requiresUserInput: true }`
6. Executor marks step as `"status": "waiting"`
7. Executor pauses execution (`status: "paused"`)

**Frontend Display:**
1. `ExecuteActionStep` component renders
2. Shows loading state initially
3. Execution pauses, so `loading = false`
4. `result` is populated with variables
5. Shows success state with **"Continue" button**

**User Clicks Continue:**
1. `onContinue()` handler called
2. Calls `submitStep.mutate({ executionId, userId, userInput: {} })`
3. Backend receives `userInput = {}` (not undefined!)
4. `ExecuteActionHandler.executeStep()` called with `userInput = {}`
5. Handler sees `userInput !== undefined`, so proceeds to complete
6. Returns `{ output: { detected_field_type: "greenfield" }, requiresUserInput: false }`
7. Executor marks step as `"status": "completed"`
8. Executor merges variables: `{ detected_field_type: "greenfield" }`
9. Executor advances to Step 2

---

### Step 2 (Ask-User - Path Selection)

**First Execution (Backend):**
1. `AskUserHandler.executeStep()` called with `userInput = undefined`
2. Handler returns `{ output: {}, requiresUserInput: true }`
3. Executor marks step as `"status": "waiting"`
4. Executor pauses execution

**Frontend Display:**
1. `AskUserStep` component renders
2. Shows path selector input
3. Shows "Continue" button (disabled until path is selected)

**User Selects Path and Clicks Continue:**
1. `onSubmit()` handler called with path value
2. Calls `submitStep.mutate({ executionId, userId, userInput: "/path/to/project" })`
3. Backend receives `userInput = "/path/to/project"`
4. `AskUserHandler.executeStep()` validates path
5. Returns `{ output: { project_path: "/path/to/project" }, requiresUserInput: false }`
6. Executor marks step as `"status": "completed"`
7. Executor merges variables: `{ detected_field_type: "greenfield", project_path: "/path/to/project" }`
8. Executor advances to Step 3 (not implemented in Story 1.5)

---

## Testing Checklist

### ✅ Expected Behavior

**Step 1 (Execute-Action):**
- [ ] Step executes automatically on page load
- [ ] Shows loading state briefly
- [ ] Shows green success box: "Action completed successfully"
- [ ] Shows **Continue button** (NOT auto-advancing!)
- [ ] Clicking Continue advances to Step 2

**Step 2 (Ask-User):**
- [ ] Shows path selector input
- [ ] Shows file browser button
- [ ] Continue button disabled until path selected
- [ ] Selecting path enables Continue button
- [ ] Clicking Continue with valid path advances workflow

### ❌ What Should NOT Happen

- [ ] Step 1 should NOT auto-advance after 500ms
- [ ] Step 1 should NOT skip to Step 2 without user clicking Continue
- [ ] Step 2 should NOT show as completed before user selects path
- [ ] Workflow should NOT complete both steps immediately

---

## Files Modified

1. **`apps/web/src/components/workflows/steps/execute-action-step.tsx`**
   - Added `onContinue` prop
   - Removed auto-advance timer
   - Added Continue button to success state

2. **`apps/web/src/routes/projects/$projectId.initialize.tsx`**
   - Wired up `onContinue` handler
   - Calls `submitStep` with `userInput: {}` to signal confirmation

---

## Backend/Frontend Contract

**Execute-Action Steps:**
- **First call:** `userInput = undefined` → Backend returns `requiresUserInput: true`, step marked "waiting"
- **Frontend:** Shows success state with Continue button
- **User clicks Continue:** Frontend calls `submitStep({ userInput: {} })`
- **Second call:** `userInput = {}` → Backend returns `requiresUserInput: false`, step marked "completed"

**Ask-User Steps:**
- **First call:** `userInput = undefined` → Backend returns `requiresUserInput: true`, step marked "waiting"
- **Frontend:** Shows input form with Continue button
- **User fills form and clicks Continue:** Frontend calls `submitStep({ userInput: <actual-value> })`
- **Second call:** `userInput = <actual-value>` → Backend validates and returns `requiresUserInput: false`, step marked "completed"

---

## Status: Ready for Testing

✅ Backend fixes applied (executor.ts, execute-action-handler.ts, state-manager.ts)
✅ Frontend fixes applied (execute-action-step.tsx, $projectId.initialize.tsx)
✅ Continue button added to execute-action steps
✅ Auto-advance removed

**Test by:**
1. Starting backend: `cd apps/server && bun run dev`
2. Starting frontend: `cd apps/web && bun run dev`
3. Navigate to http://localhost:3001
4. Create new project
5. Select initializer
6. **Verify Step 1 shows Continue button and does NOT auto-advance**
7. Click Continue
8. **Verify Step 2 shows path selector**
9. Select path and click Continue
10. **Verify workflow pauses** (Story 1.5 ends at Step 2)
