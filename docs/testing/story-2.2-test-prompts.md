# Story 2.2: Workbench Shell Test Prompts

**Workflow**: Brainstorming (Analyst Agent - Mimir)  
**Context**: Use this after completing project initialization with TaskFlow (see `project-init-comprehensive-prompt.md`)

---

## Test Flow: Complete Brainstorming Setup (Step 1)

### 1️⃣ Set Topic (update_topic tool)

**User Prompt:**
```
I want to brainstorm ways to improve the TaskFlow onboarding experience for new teams
```

**Expected Behavior:**
- Mimir acknowledges the topic
- Mimir calls `update_topic` tool with value: "Improving TaskFlow onboarding experience for new teams"
- Tool appears in Agent Status sidebar as "Awaiting Approval"
- User approves the tool in the UI
- Artifact Preview updates to show:
  ```
  # Brainstorming Session: Improving TaskFlow onboarding experience for new teams
  ```
- Topic variable is set in execution
- Mimir confirms and asks about goals

---

### 2️⃣ Set Goals (update_goals tool)

**User Prompt:**
```
My goals for this session are:
1. Reduce time-to-first-task from 30 minutes to under 5 minutes
2. Increase new team activation rate (first 10 tasks created) from 40% to 70%
3. Design an interactive tutorial that doesn't feel overwhelming
4. Identify friction points in current onboarding flow
```

**Expected Behavior:**
- Mimir calls `update_goals` tool with array of goals
- Tool appears as "Awaiting Approval" in sidebar (blocked until topic is approved)
- User approves the tool
- Artifact Preview updates to show goals list:
  ```
  ## Session Goals
  - Reduce time-to-first-task from 30 minutes to under 5 minutes
  - Increase new team activation rate (first 10 tasks created) from 40% to 70%
  - Design an interactive tutorial that doesn't feel overwhelming
  - Identify friction points in current onboarding flow
  ```
- Goals variable is set
- Mimir confirms and moves to technique selection

---

### 3️⃣ Select Techniques (select_techniques tool - AX Generation)

**User Prompt:**
```
Which brainstorming techniques would work best for tackling this onboarding problem?
```

**Expected Behavior:**
- Mimir fetches available techniques from database (workflows with `tags.type = 'technique'`)
- Should find 6 techniques:
  1. **Design Thinking** - "Guide human-centered design processes using empathy-driven methodologies"
  2. **Problem Solving** - "Apply systematic problem-solving methodologies to crack complex challenges"
  3. **Innovation Strategy** - "Identify disruption opportunities and architect business model innovation"
  4. **Storytelling** - "Craft compelling narratives using proven story frameworks"
  5. **SCAMPER Method** - "Systematic creativity through seven lenses (Substitute/Combine/Adapt/Modify/Put/Eliminate/Reverse)"
  6. **Five Whys Root Cause Analysis** - "Drill down through layers of causation to uncover root causes by asking why five times"
- Mimir recommends 1-2 techniques based on the goals (likely Design Thinking + SCAMPER or Five Whys)
- Mimir provides reasoning for recommendations
- Mimir calls `select_techniques` tool with:
  ```json
  {
    "selected_techniques": ["design-thinking", "scamper"],
    "reasoning": "Design Thinking helps us understand new user pain points through empathy, while SCAMPER systematically explores alternative onboarding approaches (substitute complex setup with guided flows, combine tutorials with real tasks, adapt from successful apps like Notion/Linear)."
  }
  ```
- Tool appears as "Awaiting Approval" (blocked until goals are approved)
- User approves
- Artifact Preview updates to show:
  ```
  ## Selected Techniques
  - **Design Thinking**: Guide human-centered design processes...
  - **SCAMPER Method**: Systematic creativity through seven lenses...
  ```

---

### 4️⃣ Step Completion

**Expected Behavior After All Tools Approved:**
- All three variables set: `session_topic`, `stated_goals`, `selected_techniques`
- Completion condition met: `all-variables-set`
- Artifact Preview shows complete session configuration
- Workflow ready to progress to Step 2 (when Story 2.3 is implemented)

---

## Alternative Test Scenarios

### Quick Test (Minimal Conversation)

**Prompt 1:**
```
Let's brainstorm features to reduce TaskFlow's time-to-value for new users. Goals: faster activation, better retention, competitive differentiation.
```
Mimir should extract both topic and goals, call both tools sequentially.

**Prompt 2:**
```
Use Design Thinking and Five Whys techniques
```
Mimir should call select_techniques with those two IDs.

---

### TaskFlow-Specific Topics

**Growth-Focused:**
```
I want to brainstorm viral growth features for TaskFlow that would encourage organic team expansion
```

**Technical Innovation:**
```
Let's brainstorm ways to make TaskFlow's offline-first sync more reliable and transparent to users
```

**Competitive Positioning:**
```
I need ideas for differentiating TaskFlow from Asana and Linear in the small-team market
```

---

### Rejection Test

**Prompt 1:**
```
I want to brainstorm ideas for TaskFlow enterprise features
```

**Action:** Approve the topic tool

**Prompt 2:**
```
Actually, let me change that to "TaskFlow mobile app feature prioritization" instead
```

**Expected:** Mimir calls update_topic again with new value, user can approve the updated topic

---

### Tool Prerequisite Test

Try to approve `update_goals` **before** `update_topic` is approved:
- Tool should remain "Blocked" in sidebar
- Cannot approve until prerequisite (session_topic) is set
- This validates `requiredVariables` enforcement

---

## What to Verify

### ✅ UI Elements
- [ ] Mimir's character name and icon display
- [ ] Agent Status sidebar shows all 3 tools
- [ ] Tools show correct status icons (Circle → Clock → CheckCircle)
- [ ] Collapsed sidebar shows icons vertically with tooltips
- [ ] Core Instructions tab displays Mimir's persona + available tools
- [ ] Progress tab shows tool states

### ✅ Tool Flow
- [ ] Tools execute in correct order (topic → goals → techniques)
- [ ] Prerequisites block tools correctly
- [ ] Approval/rejection updates execution state
- [ ] Agent Status sidebar refreshes after approvals
- [ ] **CRITICAL**: Approving `update_topic` saves `session_topic` to execution variables
- [ ] **CRITICAL**: `update_goals` becomes unblocked after `update_topic` approval

### ✅ Artifact Preview
- [ ] Template renders with placeholders initially
- [ ] Placeholders highlight in yellow (missing variables)
- [ ] Preview updates as tools are approved
- [ ] Final preview shows complete session config

### ✅ AX Generation (select_techniques)
- [ ] Fetches techniques from database via optionsSource
- [ ] Agent provides reasoning for recommendations
- [ ] Multiple techniques can be selected
- [ ] Selected technique IDs stored in execution variables

---

## Troubleshooting

**If techniques don't appear:**
1. Check that technique workflows are seeded: `bun run db:seed`
2. Verify workflows have tags: `type: 'technique'`
3. Check execution logs for database query errors

**If tools stay blocked:**
- Check execution variables in database: `SELECT variables->'session_topic' FROM workflow_executions WHERE id = '<execution_id>';`
- Verify `currentStep` is being loaded in `approveToolCall` endpoint
- Ensure `toolConfig.targetVariable` is being used to save values
- Check server logs for `[ApproveToolCall] Saved update-variable` messages

**If Core Instructions are empty:**
- This should be fixed (getResolvedInstructions builds minimal instructions)
- Check that agent has instructions property OR fallback logic works
- Verify API endpoint returns instructions for analyst agent

**If approved values display character-by-character:**
- This should be fixed (UI checks if value is string vs object)
- Hard refresh browser (Ctrl+Shift+R)
- Check `tool-status-sidebar.tsx` has the string check

---

## Expected Database State After Completion

**execution.variables:**
```json
{
  "session_topic": "Improving TaskFlow onboarding experience for new teams",
  "stated_goals": [
    "Reduce time-to-first-task from 30 minutes to under 5 minutes",
    "Increase new team activation rate (first 10 tasks created) from 40% to 70%",
    "Design an interactive tutorial that doesn't feel overwhelming",
    "Identify friction points in current onboarding flow"
  ],
  "selected_techniques": ["design-thinking", "scamper"],
  "technique_options": [...], // Fetched from DB
  "approval_states": {
    "update_topic": { 
      "status": "approved", 
      "value": "Improving TaskFlow onboarding experience for new teams",
      "approved_at": "2025-12-01T23:45:00.000Z"
    },
    "update_goals": { 
      "status": "approved", 
      "value": [...],
      "approved_at": "2025-12-01T23:46:00.000Z"
    },
    "select_techniques": { 
      "status": "approved", 
      "value": {
        "selected_ids": ["design-thinking", "scamper"],
        "reasoning": "..."
      },
      "approved_at": "2025-12-01T23:47:00.000Z"
    }
  }
}
```

---

## Notes for Story 2.3+

Once Step 2 is implemented, after all tools are approved in Step 1:
- Workflow should automatically progress to Step 2 (Execution Loop)
- Selected techniques will be executed in sequence
- Each technique will have its own sub-workflow execution
- For SCAMPER: User will go through S-C-A-M-P-E-R lenses sequentially
- For Design Thinking: User will work through empathy mapping, ideation, prototyping phases

For now, workflow stays at Step 1 after completion.

---

## Bug Fixes Completed in This Session

1. ✅ **Frontend**: Fixed `execution` destructuring in `ask-user-chat-step.tsx` 
   - Was reading wrong object structure from `getExecution` response
   
2. ✅ **Frontend**: Fixed approved value display in `tool-status-sidebar.tsx`
   - Handle string vs object values (prevent character-by-character display)
   
3. ✅ **Backend**: Fixed `approveToolCall` to use `currentStep` from `executionData`
   - Was using `execution.currentStep` (undefined) instead of `executionData.currentStep`
   
4. ✅ **Backend**: Fixed `approveToolCall` to correctly save `update-variable` values
   - Now saves to `execution.variables[targetVariable]` for prerequisite checking
   
5. ✅ **Database**: Five Whys and SCAMPER techniques seeded with 11 and 7 tools respectively
