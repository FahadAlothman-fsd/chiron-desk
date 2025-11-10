# Story 1.4 - Manual Testing Checklist

**Story:** Workflow Execution Engine Core  
**Tester:** TBD  
**Date:** TBD  
**Status:** NOT YET TESTED

---

## Prerequisites

1. Start database: `bun db:start`
2. Start web server: `bun dev:web`
3. Navigate to http://localhost:5173

---

## Test Cases

### ✅ TC1: Can start workflow-init-new from UI (metadata-only workflow for Story 1.4)

**Steps:**
1. Navigate to workflows page
2. Find "workflow-init-new" workflow
3. Click "Start Workflow" button
4. Verify execution starts successfully

**Expected Result:**
- Workflow execution record created in database
- UI shows workflow started (or immediately completes if 0 steps)

**Actual Result:**
- [ ] NOT YET TESTED

**Notes:**

---

### ✅ TC2: WorkflowStepper displays correctly

**Steps:**
1. Start a workflow with multiple steps (create test workflow if needed)
2. Observe the WorkflowStepperWizard component

**Expected Result:**
- Displays "Step X of N" progress text
- Shows visual progress bar
- Current step title visible
- Completed steps shown as green bars
- Upcoming steps shown as grey bars

**Actual Result:**
- [ ] NOT YET TESTED

**Notes:**

---

### ✅ TC3: Pause and resume workflow works

**Steps:**
1. Start a multi-step workflow
2. Click "Pause" button during execution
3. Verify workflow pauses
4. Click "Resume" button
5. Verify workflow continues from correct step

**Expected Result:**
- Workflow pauses mid-execution
- State persisted to database
- Resume continues from last completed step
- No data loss

**Actual Result:**
- [ ] NOT YET TESTED

**Notes:**

---

### ✅ TC4: Events update UI in real-time

**Steps:**
1. Start a workflow
2. Observe the UI updates as steps execute
3. Verify events trigger without manual refresh

**Expected Result:**
- Step progress updates automatically
- Workflow status changes reflect immediately
- No need to refresh page
- SSE subscription working

**Actual Result:**
- [ ] NOT YET TESTED

**Notes:**

---

### ✅ TC5: Error messages are clear and actionable

**Steps:**
1. Trigger a workflow error (e.g., invalid workflow ID, database error)
2. Observe error message displayed to user

**Expected Result:**
- Error message is human-readable
- Explains what went wrong
- Provides guidance on how to fix (if applicable)
- Red alert with "Retry" button

**Actual Result:**
- [ ] NOT YET TESTED

**Notes:**

---

## Summary

**Tests Passed:** 0 / 5  
**Tests Failed:** 0 / 5  
**Tests Blocked:** 0 / 5  
**Tests Not Run:** 5 / 5

**Overall Status:** ⚠️ NOT YET TESTED

**Blocker Issues:** None identified yet

**Notes:**
- Manual testing requires Story 1.5+ step handlers to create meaningful workflows
- Recommend testing with simple display-output workflows for now
- Full UI testing can be done after workflow-init implementation in Stories 1.5-1.8

---

## Follow-up Actions

- [ ] Complete manual testing before marking story as "Done"
- [ ] Document any UI bugs found
- [ ] Create GitHub issues for critical UI bugs
- [ ] Update this checklist with actual results
