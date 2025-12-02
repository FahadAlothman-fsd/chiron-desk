# Story 2.2: Workbench Shell & Setup - Testing Guide

**Date:** 2025-12-01  
**Story:** 2-2-workbench-shell-and-setup  
**Status:** Implementation Complete, Ready for Manual Testing

---

## ✅ Implementation Summary

### Completed Tasks

**Task 1: Configure Brainstorming Workflow Step 1 ✅**
- Enhanced `update-variable-tool.ts` to support array types
- Created `brainstorming.ts` seed with Step 1 configuration
- Configured 3 Mastra tools: `update_topic`, `update_goals`, `select_techniques`
- Database seeding verified successfully

**Task 2: Split-Pane Workbench Layout ✅**
- Added shadcn/ui `resizable` component
- Created `WorkbenchLayout` component with localStorage persistence
- Responsive constraints implemented (min/max sizes)

**Task 2.5: Universal Workflow Route ✅**
- Created `/projects/:projectId/workflow/:executionId` route
- Implemented `WorkflowExecutionPage` with workbench integration
- Added `ArtifactPreview` with live variable display
- Updated project dashboard navigation

**Task 3: Build Verification ✅**
- Application builds successfully without TypeScript errors
- All components properly integrated

---

## 🧪 Manual Testing Instructions

### Prerequisites

1. **Database must be seeded:**
   ```bash
   cd /home/gondilf/Desktop/projects/masters/chiron
   bun run db:seed:reset
   ```

2. **Start the development server:**
   ```bash
   bun run dev
   ```

3. **Access the application:**
   - Open browser to http://localhost:5173 (or displayed port)
   - Login with test credentials:
     - Email: test@chiron.local
     - Password: test123456

---

### Test Case 1: Navigate to Brainstorming Workflow

**Objective:** Verify project dashboard shows brainstorming option and navigation works

**Steps:**
1. After login, you should see the projects list
2. Click on an existing project OR create a new project via "Create New Project"
3. On the project dashboard, locate the "Next Recommended Action" card
4. Verify it shows "Brainstorming Session" with description
5. Click the "Start Brainstorming" button

**Expected Results:**
- ✅ Button should display "Starting..." with loading spinner
- ✅ Should navigate to `/projects/{projectId}/workflow/{executionId}`
- ✅ Should see the split-pane workbench layout:
  - Left pane: "Chat" header with chat interface
  - Right pane: "Artifact Preview" header with placeholder text
- ✅ Resizable divider in the middle (drag to test)

**Acceptance Criteria Verified:**
- AC #2: Split-pane layout renders correctly
- AC #3: Chat interface visible in left pane

---

### Test Case 2: Verify Chat Interface Loads

**Objective:** Confirm AskUserChatStep component renders in workbench

**Steps:**
1. After navigation (from Test Case 1), observe the left pane
2. Check for:
   - Model selector dropdown at top
   - Initial message from agent welcoming you to brainstorming
   - Chat input field at bottom
   - Tool status panel (showing 3 tools)

**Expected Results:**
- ✅ Model selector shows available models (Claude, GPT-4, etc.)
- ✅ Initial agent message displays:
   "Welcome to your brainstorming session! 🧠
   
   I'm here to help you generate creative ideas and develop an action plan. Let's start by setting up your session.
   
   What would you like to brainstorm about? Tell me the topic or problem you want to explore."
- ✅ Tool Status Panel shows:
  - update_topic (⏳ Pending)
  - update_goals (⏳ Pending, requires session_topic)
  - select_techniques (⏳ Pending, requires stated_goals)
- ✅ Chat input field is enabled and ready

**Acceptance Criteria Verified:**
- AC #3: Chat timeline interface visible
- AC #4: Mastra tools configured (3 tools showing)

---

### Test Case 3: Test Resizable Divider

**Objective:** Verify split-pane resizing and persistence works

**Steps:**
1. Locate the vertical divider between chat and artifact panes
2. Hover over divider - should show resize cursor
3. Drag divider to the left (make chat pane smaller)
4. Drag divider to the right (make artifact pane smaller)
5. Refresh the page (Ctrl+R or Cmd+R)

**Expected Results:**
- ✅ Divider shows resize cursor on hover
- ✅ Dragging smoothly resizes both panes
- ✅ Minimum size constraints enforced (30% minimum each side)
- ✅ After refresh, pane sizes are restored from localStorage

**Acceptance Criteria Verified:**
- AC #2: Resizable divider with persistence

---

### Test Case 4: Interact with Chat (Tool Execution)

**Objective:** Verify Mastra tool execution flow works end-to-end

**Steps:**
1. In the chat input, type a topic (e.g., "AI-powered task manager for remote teams")
2. Press Enter or click Send
3. Wait for agent response
4. Observe:
   - Agent processes the message
   - Tool `update_topic` should be called
   - Approval card should appear
5. In the approval card:
   - Review the extracted topic
   - Click "Approve" or modify and approve

**Expected Results:**
- ✅ Agent responds to your message
- ✅ Tool status changes from Pending → Processing → Awaiting Approval
- ✅ Approval card displays with:
  - Extracted topic value
  - Reasoning (why agent chose this)
  - [Approve] and [Reject] buttons
- ✅ After approval:
  - Right pane (Artifact Preview) updates to show:
    ```
    Topic: AI-powered task manager for remote teams
    ```
  - Tool status changes to Approved ✅
  - Next tool (update_goals) becomes available

**Acceptance Criteria Verified:**
- AC #1: Step 1 configured with 3 Mastra tools
- AC #4: Mastra tool execution works
- AC #5: Live artifact preview updates

---

### Test Case 5: Complete Full Step 1 Flow

**Objective:** Verify all 3 tools execute in sequence

**Steps:**
1. Complete Test Case 4 (topic approved)
2. Agent should prompt for goals - respond with 2-3 goals (e.g., "Generate 20+ actionable ideas", "Identify top 5 priorities", "Create implementation roadmap")
3. Approve the extracted goals list
4. Agent should present technique options - review and select 2-3 techniques
5. Approve the selected techniques

**Expected Results:**
- ✅ After topic approval, update_goals tool activates
- ✅ Goals extracted and displayed in approval card (array format)
- ✅ After goals approval, right pane shows:
  ```
  Topic: AI-powered task manager for remote teams
  Goals:
  - Generate 20+ actionable ideas
  - Identify top 5 priorities
  - Create implementation roadmap
  ```
- ✅ select_techniques tool activates
- ✅ Technique options displayed (fetched from database via optionsSource)
- ✅ After techniques approval, right pane shows:
  ```
  Selected Techniques:
  [SCAMPER] [Six Thinking Hats] [TRIZ]
  ```
- ✅ All 3 tools show ✅ Approved status
- ✅ Step 1 completion condition met

**Acceptance Criteria Verified:**
- AC #1: All 3 tools configured and functional
- AC #4: Tool execution with approval gates
- AC #5: Live artifact preview with all variables

---

## 🐛 Known Issues / Expected Limitations

### Current Limitations (By Design for Story 2.2)

1. **No Step 2-7 Implementation**
   - Only Step 1 (Setup) is implemented
   - After completing Step 1, workflow will show "No next step" or remain on Step 1
   - This is expected - Steps 2-6 are deferred to Stories 2.3-2.6

2. **Technique Workflows Not Implemented**
   - `select_techniques` will show technique options from database
   - Actually running the technique workflows (SCAMPER, etc.) is Story 2.3

3. **Basic Artifact Preview**
   - Current preview only shows raw variables (topic, goals, techniques)
   - Full markdown rendering with templates is optional enhancement

4. **No Technique Descriptions**
   - Technique selection may show IDs instead of rich descriptions
   - Database may not have technique workflows seeded yet (depends on seed data)

### Potential Issues to Watch For

**Issue:** Technique options empty or error
- **Cause:** No technique workflows in database with tags.type = "technique"
- **Workaround:** This is acceptable for Story 2.2; technique seeding is Story 2.3

**Issue:** Chat not responding
- **Cause:** Mastra agent configuration or OpenRouter API key missing
- **Check:** Verify `OPENROUTER_API_KEY` in server .env file

**Issue:** "Workflow not found" error
- **Cause:** Workflow execution wasn't created properly
- **Check:** Verify database has `workflow_executions` record for the executionId

---

## 📊 Acceptance Criteria Checklist

Story 2.2 has **5 Acceptance Criteria**. Based on manual testing, verify:

- [ ] **AC #1:** Step 1 configured in `brainstorming` workflow with 3 Mastra tools
  - Tools: `update_topic`, `update_goals`, `select_techniques`
  - Verified via: Database query + Tool Status Panel UI

- [ ] **AC #2:** Split-pane workbench layout implemented
  - Left: Chat interface
  - Right: Artifact preview
  - Resizable divider with localStorage persistence
  - Verified via: Visual inspection + resize testing

- [ ] **AC #3:** Chat timeline interface renders in left pane
  - Model selector
  - Message history
  - Chat input
  - Verified via: Test Case 2

- [ ] **AC #4:** Mastra tool execution working
  - Tools appear in Tool Status Panel
  - Agent can call tools
  - Approval gates show
  - Variables saved after approval
  - Verified via: Test Cases 4 & 5

- [ ] **AC #5:** Live artifact preview updates
  - Shows topic after approval
  - Shows goals array after approval
  - Shows techniques after approval
  - Verified via: Test Case 5 (observe right pane)

---

## 🔍 Database Verification Queries

If you want to verify the database directly:

```bash
# Connect to database
cd /home/gondilf/Desktop/projects/masters/chiron
PGPASSWORD=password psql -h localhost -p 5434 -U postgres -d chiron

# Verify brainstorming workflow exists
SELECT name, display_name, tags, metadata 
FROM workflows 
WHERE name = 'brainstorming';

# Verify Step 1 configuration
SELECT step_number, goal, step_type, 
       jsonb_pretty(config::jsonb) as config 
FROM workflow_steps 
WHERE workflow_id = (SELECT id FROM workflows WHERE name = 'brainstorming')
  AND step_number = 1;

# Check workflow execution (after starting brainstorming)
SELECT id, status, current_step, variables 
FROM workflow_executions 
WHERE workflow_id = (SELECT id FROM workflows WHERE name = 'brainstorming')
ORDER BY started_at DESC 
LIMIT 1;
```

---

## ✅ Story Completion Criteria

Story 2.2 is **READY FOR REVIEW** when:

1. All 5 Acceptance Criteria verified ✅
2. Build successful with no errors ✅ (already verified)
3. Manual testing completed for Test Cases 1-5
4. Any blocking issues documented or resolved
5. Story file updated with completion status

**Next Steps:**
- Run manual tests following this guide
- Document any issues found
- If all tests pass → Mark story as DONE
- If issues found → Create subtasks or bug tickets

---

**Testing performed by:** [Reviewer Name]  
**Date:** [Testing Date]  
**Result:** [PASS / FAIL / BLOCKED]  
**Notes:** [Any observations or issues]
