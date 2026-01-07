# Story 2.3: Execution Loop & Child Workflows Test Prompts

**Workflow**: Brainstorming Step 2 (invoke-workflow with techniques)  
**Context**: Use this after completing brainstorming Step 1 (see `story-2.2-test-prompts.md`)

---

## Prerequisites

Before running these tests, ensure:
1. ✅ Project initialized with workflow-init-new (TaskFlow)
2. ✅ Brainstorming Step 1 completed (topic, goals, techniques selected)
3. ✅ Database seeded with 5 technique workflows:
   - SCAMPER
   - Six Thinking Hats
   - Five Whys
   - Mind Mapping
   - What If Scenarios

---

## Test Flow: Execute Techniques (Step 2)

### 1️⃣ Verify Step 2 Loads (InvokeWorkflowStep Component)

**Starting State:**
- Brainstorming workflow execution at Step 2
- `variables.selected_techniques = ["scamper", "six-thinking-hats"]`

**Expected UI:**
- InvokeWorkflowStep component renders
- Action list shows 2 techniques with "Execute" buttons
- Status indicators: Both show "Pending" (gray Circle icon)
- Summary: "0 / 2 completed"

**Verification Points:**
- [ ] InvokeWorkflowStep renders correctly
- [ ] 2 technique cards visible
- [ ] Each card shows: technique name, description, "Pending" status
- [ ] [Execute] button visible for each technique
- [ ] No Dialog open initially

---

### 2️⃣ Execute SCAMPER Technique (Dialog Opens)

**User Action:**
Click [Execute] button on SCAMPER card

**Expected Behavior:**
1. **Dialog Opens:**
   - Modal overlay appears with dimmed parent workflow behind
   - Dialog title: "SCAMPER"
   - Dialog description: "Systematic creative thinking..."
   - Wizard stepper not shown (SCAMPER is 1 step with 7 sequential tools)
   - Dialog body shows AskUserChatStep interface

2. **SCAMPER Step 1 Loads:**
   - Agent: Mimir (Analyst)
   - Initial message auto-generated with parent context:
     ```
     Let's explore ideas for [session_topic] using the SCAMPER framework.
     
     Your goals for this session are:
     [stated_goals displayed as numbered list]
     
     I'll guide you through 7 lenses: Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, and Reverse.
     ```
   - Tool status sidebar shows 7 tools (all sequential)
   - First tool ready: `substitute_ideas`

3. **Parent Workflow Still Visible:**
   - Behind dialog (dimmed overlay)
   - SCAMPER card status changes to "Running" (blue spinning Loader icon)

**Verification Points:**
- [ ] Dialog opens as modal overlay
- [ ] Parent workflow visible behind (dimmed)
- [ ] SCAMPER title and description shown
- [ ] AskUserChatStep renders inside dialog
- [ ] Initial message contains parent context (topic, goals)
- [ ] Tool status sidebar shows 7 sequential tools
- [ ] Parent: SCAMPER status = "Running"

---

### 3️⃣ Complete SCAMPER Tools (Sequential Execution)

**User Prompts (one per tool):**

```
1. Substitute: What if we replace the traditional onboarding checklist with an interactive story?
```
Mimir calls `substitute_ideas` → Approve

```
2. Combine: We could combine the tutorial with real task creation - users learn by doing real work
```
Mimir calls `combine_ideas` → Approve

```
3. Adapt: Let's adapt Duolingo's streak system to encourage daily check-ins during the first week
```
Mimir calls `adapt_ideas` → Approve

```
4. Modify: Modify the dashboard to show a progress bar for onboarding completion
```
Mimir calls `modify_ideas` → Approve

```
5. Put to use: Use the onboarding time to gather team preferences and auto-configure settings
```
Mimir calls `put_to_use_ideas` → Approve

```
6. Eliminate: Remove the account setup step and use social login + smart defaults
```
Mimir calls `eliminate_ideas` → Approve

```
7. Reverse: Instead of us explaining features, have the user ask questions and we answer contextually
```
Mimir calls `reverse_ideas` → Approve

**Expected Behavior:**
- Each tool approval saves idea to `variables.generated_ideas` array
- Tool status sidebar updates (tool moves to completed state)
- Next tool becomes active
- After 7th tool approval:
  - Step completion condition met
  - Dialog closes automatically
  - Parent workflow: SCAMPER status changes to "Completed" (green CheckCircle icon)
  - SCAMPER card shows "7 ideas" count
  - [Details] button appears to expand idea list

**Verification Points:**
- [ ] All 7 tools execute sequentially
- [ ] Each idea captured in child execution variables
- [ ] Dialog closes after 7th tool approval
- [ ] Parent: SCAMPER status = "Completed"
- [ ] Parent: SCAMPER card shows idea count "7 ideas"

---

### 4️⃣ Execute Six Thinking Hats (Parallel Execution)

**User Action:**
Click [Execute] button on Six Thinking Hats card (while SCAMPER dialog is closed but completed)

**Expected Behavior:**
1. **Dialog Opens for Six Hats:**
   - New modal dialog with "Six Thinking Hats" title
   - Initial message with parent context
   - 6 sequential tools (White Hat → Blue Hat)

2. **Parent Workflow State:**
   - SCAMPER: Still shows "Completed" with "7 ideas"
   - Six Hats: Status changes to "Running"
   - Summary: "1 / 2 completed"

**User Prompts (abbreviated):**

```
White Hat: We have data showing 60% drop-off in first session
Red Hat: I feel overwhelmed by the current 15-step setup process
Yellow Hat: Interactive tutorials have 3x higher completion rates
Black Hat: Risk of oversimplifying and missing critical setup steps
Green Hat: What if we use AI to personalize the onboarding path?
Blue Hat: Let's prioritize the quick-win improvements and test them first
```

**Expected Behavior:**
- Each tool executes, captures idea
- After 6th tool approval:
  - Dialog closes
  - Six Hats: Status = "Completed" with "6 ideas"
  - Summary: "2 / 2 completed"

**Verification Points:**
- [ ] Six Hats dialog opens independently
- [ ] SCAMPER data preserved (not overwritten)
- [ ] Both techniques show "Completed" status
- [ ] Summary: "2 / 2 completed"
- [ ] No data loss or conflicts from parallel execution

---

### 5️⃣ Verify Data Aggregation (Artifact Preview)

**Navigate to Artifact Preview Pane:**

**Expected Display:**

```
## Captured Ideas (2 workflows completed)

┌─ SCAMPER ─────────────────────────────────────────┐
│  [SCAMPER]  7 ideas    Completed 2:30 PM          │
│                                                     │
│  (1) Replace traditional checklist with story      │
│  (2) Combine tutorial with real task creation      │
│  (3) Adapt Duolingo streak system                  │
│  (4) Modify dashboard with progress bar            │
│  (5) Use onboarding time to gather preferences     │
│  (6) Remove account setup, use social login        │
│  (7) Reverse explanation flow, user asks questions │
└─────────────────────────────────────────────────────┘

┌─ Six Thinking Hats ───────────────────────────────┐
│  [Six Hats]  6 ideas    Completed 2:45 PM         │
│                                                     │
│  (1) Data: 60% drop-off in first session           │
│  (2) Feeling: Overwhelmed by 15-step setup         │
│  (3) Positive: Interactive tutorials 3x better     │
│  (4) Caution: Risk of oversimplifying setup        │
│  (5) Creative: AI-personalized onboarding path     │
│  (6) Process: Prioritize quick-win improvements    │
└─────────────────────────────────────────────────────┘
```

**Verification Points:**
- [ ] CapturedIdeasSection renders
- [ ] 2 technique groups displayed
- [ ] Each group shows: workflow name badge, idea count, completion time
- [ ] All 13 ideas visible (7 + 6)
- [ ] Ideas numbered within each group
- [ ] Blue-themed styling with workflow badges

---

### 6️⃣ Verify Database State

**Query Execution Variables:**

```sql
SELECT 
  variables->'captured_ideas' as captured_ideas,
  variables->'child_executions' as child_executions,
  current_step 
FROM workflow_executions 
WHERE id = '<parent_execution_id>';
```

**Expected Structure:**

```json
{
  "captured_ideas": {
    "scamper-workflow-id": {
      "workflowId": "scamper-workflow-id",
      "workflowName": "SCAMPER",
      "workflowDescription": "Systematic creative thinking...",
      "output": [
        "Replace traditional checklist with story",
        "Combine tutorial with real task creation",
        ...
      ],
      "completedAt": "2025-12-04T14:30:00.000Z"
    },
    "six-hats-workflow-id": {
      "workflowId": "six-hats-workflow-id",
      "workflowName": "Six Thinking Hats",
      "output": [
        "Data: 60% drop-off in first session",
        ...
      ],
      "completedAt": "2025-12-04T14:45:00.000Z"
    }
  },
  "child_executions": [
    "child-exec-id-1",
    "child-exec-id-2"
  ]
}
```

**Verification Points:**
- [ ] `captured_ideas` contains both techniques
- [ ] Each technique keyed by workflowId
- [ ] `output` arrays contain all ideas
- [ ] `completedAt` timestamps present
- [ ] `child_executions` array has 2 IDs

---

## Edge Case Tests

### Test: Failed Technique (Graceful Degradation)

**Scenario:**
1. Execute SCAMPER normally (completes successfully)
2. Manually fail Six Hats child execution in DB:
   ```sql
   UPDATE workflow_executions 
   SET status = 'failed', error = 'Simulated failure'
   WHERE id = '<six-hats-child-id>';
   ```
3. Refresh parent workflow page

**Expected Behavior:**
- SCAMPER: Still shows "Completed" with 7 ideas
- Six Hats: Shows "Failed" status (red XCircle icon)
- Artifact preview: Only shows SCAMPER ideas (graceful degradation)
- `variables._failed_children` contains Six Hats error info
- Parent workflow can continue (not blocked by child failure)

---

### Test: Page Refresh Persistence

**Scenario:**
1. Complete SCAMPER
2. Refresh browser (Ctrl+R)
3. Open Six Hats dialog
4. Complete Six Hats
5. Refresh again

**Expected Behavior:**
- After step 2: SCAMPER data persists (7 ideas visible)
- After step 5: Both techniques persist (13 ideas total)
- No data loss on refresh

---

### Test: Timeline Browse Mode

**Scenario:**
1. In parent workflow, click top arrow in Timeline to enter browse mode
2. View Step 1 details
3. View Step 2 details
4. Return to focused mode

**Expected Behavior:**
- Browse mode shows accordion with:
  - Step 1: Completed, timestamp, duration
  - Step 2: In Progress, timestamp
- Click Step 1: Shows step details
- Click "Focus Active Step": Returns to Step 2 focused view
- No state loss during navigation

---

## Regression Tests (Ensure No Breakage)

### ✅ Workflow Init Still Works
Run `project-init-comprehensive-prompt.md` test:
- [ ] Athena responds correctly
- [ ] All 4 tools execute (summary, complexity, path, name)
- [ ] Project created successfully
- [ ] Directory selection works

### ✅ Brainstorming Step 1 Still Works  
Run `story-2.2-test-prompts.md` test:
- [ ] Topic/goals/techniques selection works
- [ ] Artifact preview updates correctly
- [ ] Tool prerequisites enforced
- [ ] Step completion triggers Step 2

---

## What to Verify

### ✅ New UI Components (Story 2.3)
- [ ] InvokeWorkflowStep renders action list
- [ ] DialogLayout opens as modal overlay
- [ ] Wizard stepper not shown for 1-step techniques
- [ ] Timeline focused/browse modes work
- [ ] CapturedIdeasSection displays aggregated ideas
- [ ] Workflow badges and completion timestamps

### ✅ Backend Logic
- [ ] InvokeWorkflowStepHandler creates child executions
- [ ] Variable mapping applies parent context to child
- [ ] Completion condition checking (all-complete)
- [ ] Output aggregation into structured object
- [ ] Graceful degradation for failed children
- [ ] Parallel execution safety (no overwrites)

### ✅ Data Flow
- [ ] Child outputs captured in `generated_ideas`
- [ ] Parent aggregates into `captured_ideas`
- [ ] JSONB storage persists across refreshes
- [ ] UI reads from correct variable names

---

## Troubleshooting

**If dialog doesn't open:**
- Check `metadata.layoutType = "dialog"` for technique workflows
- Verify WorkflowLayoutRenderer routing logic
- Check console for errors

**If ideas don't aggregate:**
- Verify `expectedOutputVariable = "generated_ideas"` in Step 2 config
- Verify `aggregateInto = "captured_ideas"` in Step 2 config
- Check InvokeWorkflowStepHandler.aggregateChildOutputs() logic

**If parallel execution conflicts:**
- Check Record<workflowId, data> structure
- Verify each child uses unique workflowId as key
- Check for race conditions in state updates

---

## Success Criteria

Story 2.3 is **COMPLETE** when:
- ✅ All 5 acceptance criteria pass
- ✅ All subtasks 9.1-9.7 verified
- ✅ No regressions in workflow-init or Step 1
- ✅ Parallel execution works without conflicts
- ✅ Data persists across page refreshes
- ✅ Graceful degradation handles failed children
- ✅ UI displays aggregated ideas correctly
