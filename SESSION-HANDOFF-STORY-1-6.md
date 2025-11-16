# Session Handoff - Story 1.6: Tool Usage Guidance Implementation

**Date**: 2025-11-16  
**Story**: Story 1.6 - Conversational Project Initialization with AI-Powered Approval Gates  
**Status**: 🟢 **65% Complete - Ready to Continue**  
**Last Session Focus**: Per-tool usage guidance implementation + validation

---

## 🎯 Quick Start for Next Session

**What's Working:**
- ✅ 2 tools working end-to-end (`update_summary`, `update_complexity`)
- ✅ Approval gates render with dynamic radio selectors
- ✅ Database queries fetch workflow path options correctly
- ✅ Agent proactively calls tools when given strong guidance

**Known Issue:**
- ⚠️ Workflow pauses after approval, requiring user message to continue
- This is architectural (workflow handler), NOT a prompt/guidance issue
- Agent DOES call next tool when engaged - proving guidance works!

**Next Steps:**
1. Fix auto-resume after approval (2-3 hours) ← **Recommended first**
2. Re-enable tools 3-4 (`fetch_workflow_paths`, `generate_project_name`)
3. Test full 4-tool flow end-to-end

---

## 📊 Current Progress Summary

### ✅ Completed Tasks (Session 5)

**Per-Tool Usage Guidance:**
- Added `usageGuidance` field to tool schema
- Implemented Handlebars template injection in agent-loader
- Extract and pass guidance via RuntimeContext
- Strengthened `update_complexity` with imperative language

**Test Results:**
- `update_summary`: Calls automatically after 2-3 exchanges ✅
- `update_complexity`: Calls automatically after approval ✅
- Approval cards: Render with dynamic options ✅
- Database queries: JSONB filters work correctly ✅

**Commits Made:**
- `a596618` - Initial per-tool usageGuidance implementation
- `4d69266` - Strengthened update_complexity guidance

### ⚠️ Known Architectural Issue

**Problem: Workflow Pauses After Approval**

**Current Flow:**
```
approve(tool_1) → pause → user_message → agent_calls(tool_2)
```

**Desired Flow:**
```
approve(tool_1) → auto_continue → agent_calls(tool_2)
```

**Root Cause** (from server logs):
```javascript
[ApproveToolCall] Saved to MiPRO: update_summary
[WorkflowEvent] workflow_resumed - Execution: 101e7b92...
[AskUserChatHandler] executeStep called userInput: undefined
[AskUserChatHandler] No user input - awaiting first message  ← ISSUE HERE
[Executor] Step 3 requires user input - pausing execution
```

The handler sees `userInput: undefined` after approval and treats it as "waiting for first message" instead of "approval just happened, continue automatically."

**Impact:**
- With 4 tools, user needs 3 extra "continue" messages
- Clunky UX, not seamless conversation

**Fix Location:**
File: `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`

**Solution Approach:**
1. Detect when `executeStep` is called after approval (check approval_states)
2. If recently approved AND no user input, call `agent.generate()` with internal trigger
3. Resume conversation automatically without waiting for user

### 🔒 Tools Currently Disabled

**Tool 3: `fetch_workflow_paths`** (lines 236-250 in seed file)
- Type: `database-query`
- Purpose: Query workflow_paths table with complexity filter
- Status: Temporarily disabled for testing
- Ready to enable: Just uncomment + add `usageGuidance`

**Tool 4: `generate_project_name`** (lines 252-259 in seed file)
- Type: `custom` (uses Ax Predict strategy)
- Purpose: Generate 3-5 project name suggestions
- Status: Temporarily disabled for testing
- Ready to enable: Just uncomment + add `usageGuidance`

---

## 📁 Critical Files to Know

### Backend Core (Don't Modify Without Understanding):

```bash
# Tool guidance implementation
packages/db/src/schema/step-configs.ts                    # Added usageGuidance field
packages/api/src/services/mastra/agent-loader.ts          # Handlebars injection
packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts  # RuntimeContext passing

# Tool builders
packages/api/src/services/workflow-engine/tools/ax-generation-tool.ts  # Ax-powered tools
packages/api/src/services/workflow-engine/tools/database-query-tool.ts # DB query tools

# Seed configuration
packages/scripts/src/seeds/workflow-init-new.ts           # Step 3 config with 2 active tools
```

### Frontend Components:

```bash
# Chat interface
apps/web/src/components/workflows/steps/ask-user-chat-step.tsx      # Main chat UI
apps/web/src/components/workflows/approval-card.tsx                 # Approval gate UI
apps/web/src/components/workflows/approval-card-selector.tsx        # Radio selector for options
```

### Documentation (Updated Session 5):

```bash
docs/stories/1-6-workflow-init-steps-3-4-description-complexity.md  # Story doc (Session 5 added)
docs/architecture/dynamic-tool-options.md                            # Architecture explanation
docs/stories/1-6-card-selector-approval.md                           # Card selector story
```

---

## 🔧 Environment Setup

### Database State:
- ✅ Step 3 config has stronger `usageGuidance` for tools 1-2
- ✅ Workflow path options seeded and queryable
- ✅ PM Agent (Athena) has Handlebars template support
- ⚠️ May have old test executions - delete if needed

### Servers:
```bash
# Start both servers
bun run dev          # Starts server (3000) + web (3001)

# Or separately
bun run dev:server   # Port 3000
bun run dev:web      # Port 3001
```

### Database Access:
```bash
# Connect to database
PGPASSWORD=password psql -h localhost -p 5434 -U postgres -d chiron

# Useful queries
\d workflow_steps                                    # Check step schema
SELECT config FROM workflow_steps WHERE step_number = 3;  # Check Step 3 config

# Clean up test executions
DELETE FROM workflow_executions WHERE status = 'initializing';
DELETE FROM projects WHERE status = 'initializing';
```

---

## 🧪 Testing Guide

### Manual Test Flow (Current State):

1. **Start fresh workflow**:
   - Navigate to http://localhost:3001
   - Click "New Project"
   - Select "Initialize New Project (Guided)"
   - Enter project path: `/home/gondilf/Desktop/test-tool-guidance`

2. **Test Tool 1 - update_summary**:
   - Send 2-3 detailed messages about project
   - Example: "Building a task management app for remote teams..."
   - **Expected**: Agent calls `update_summary` automatically after sufficient detail
   - **Verify**: Approval card appears with project description
   - Click "Accept"

3. **Test Tool 2 - update_complexity**:
   - **Issue**: Workflow pauses after approval
   - Send: "Yes, that looks good!" (or similar)
   - **Expected**: Agent calls `update_complexity` immediately
   - **Verify**: Approval card with 3 radio options (Quick Flow, BMad Method, Enterprise)
   - Click "Accept"

4. **Check Progress**:
   - Right sidebar shows 1/2 → 2/2 tools complete
   - Variables saved: `project_description`, `complexity_classification`

### Playwright Testing (Automated):

```bash
# The browser MCP was used for testing - you can use it too
# Example test captured in screenshot: story-1-6-update-complexity-success.png
```

---

## 🎯 Recommended Next Actions

### Priority 1: Fix Auto-Resume (2-3 hours) ✅ RECOMMENDED

**Goal**: After approval, agent continues automatically without user message

**Implementation Plan**:
1. Open `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`
2. Modify `executeStep()` method:
   ```typescript
   async executeStep(step, execution, userInput?) {
     // Check if we just approved a tool
     const recentApproval = this.detectRecentApproval(execution);
     
     if (recentApproval && !userInput) {
       // Auto-resume: Call agent with internal trigger
       userInput = `[SYSTEM: Tool "${recentApproval}" approved, continue]`;
       // Or just call agent.generate() directly without saving to history
     }
     
     // Rest of existing logic...
   }
   ```
3. Test: Approve tool 1 → agent should call tool 2 automatically
4. Verify: No user message needed between approvals

**Files to Modify**:
- `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`

**Success Criteria**:
- Approve `update_summary` → `update_complexity` calls automatically
- No "Yes, that looks good!" message needed
- Seamless 2-tool flow

### Priority 2: Re-Enable Tools 3-4 (1 hour)

**Goal**: Enable full 4-tool workflow

**Implementation Plan**:
1. Open `packages/scripts/src/seeds/workflow-init-new.ts`
2. Uncomment Tool 3 (lines 236-250)
3. Uncomment Tool 4 (lines 252-259)
4. Add strong `usageGuidance` for both:
   ```typescript
   // Tool 3: fetch_workflow_paths
   usageGuidance: "IMMEDIATELY call this tool after complexity_classification is approved. DO NOT ask the user - automatically fetch matching workflow paths from the database using the complexity level.",
   
   // Tool 4: generate_project_name
   usageGuidance: "IMMEDIATELY call this tool after the workflow path is selected. DO NOT ask the user - automatically generate 3-5 kebab-case project name suggestions based on the project description.",
   ```
5. Re-seed database: `bun run db:seed`
6. Test full 4-tool flow

**Files to Modify**:
- `packages/scripts/src/seeds/workflow-init-new.ts`

**Success Criteria**:
- All 4 tools call in sequence automatically
- Path options display as cards
- Project name suggestions appear
- Full workflow completes

### Priority 3: Test ACE Optimizer (1 hour)

**Goal**: Verify rejection feedback improves outputs

**Test Plan**:
1. Start workflow, get to `update_summary`
2. Click "Reject & Explain"
3. Enter feedback: "You missed the scheduling feature - that's critical"
4. Verify:
   - ACE playbook updates in database
   - Agent regenerates with improved summary
   - New approval card includes scheduling mention

**Files to Check**:
- `packages/api/src/services/mastra/ace-optimizer.ts` - Online learning
- `ace_playbooks` table in database - Check `playbook` JSONB field

---

## 🐛 Known Issues & Workarounds

### Issue 1: Workflow Pauses After Approval
**Status**: Known architectural issue  
**Workaround**: Send any message to continue (e.g., "continue", "yes")  
**Fix**: See Priority 1 above

### Issue 2: Old Test Executions
**Status**: May clutter UI  
**Workaround**:
```sql
DELETE FROM workflow_executions WHERE status = 'initializing';
DELETE FROM projects WHERE status = 'initializing';
```

### Issue 3: Server Restart Needed
**Status**: After seed changes, server doesn't hot-reload  
**Workaround**: Restart server manually

---

## 📝 Documentation References

### Story Documentation:
- **Main Story**: `docs/stories/1-6-workflow-init-steps-3-4-description-complexity.md`
  - Status: Updated with Session 5 progress (line 1760)
  - Tasks: 65% complete overall
  - Acceptance Criteria: 17 ACs, ~8 validated

### Architecture Docs:
- **Dynamic Tool Options**: `docs/architecture/dynamic-tool-options.md`
- **Story Architecture**: `docs/architecture/STORY-1-6-ARCHITECTURE-SUMMARY.md`
- **Database Schema**: `docs/architecture/database-schema-architecture.md`

### Design Docs:
- **Card Selector**: `docs/stories/1-6-card-selector-approval.md`
- **Wireframes**: Sections 2, 4, 5 in main story doc

---

## 🔍 Server Log Debugging

### Key Log Patterns to Watch:

**Tool Execution**:
```
[ToolExecution] update_summary called by agent
[ToolExecution] ✓ Prerequisites satisfied for update_summary
[AxGenerationTool] Generating update_summary with inputs
[ToolExecution] ✓ update_summary execution completed
```

**Approval Flow**:
```
[AskUserChatHandler] Tool update_summary requires approval
[ApproveToolCall] Saved to MiPRO: update_summary
[WorkflowEvent] workflow_resumed
```

**The Pause Issue**:
```
[AskUserChatHandler] executeStep called userInput: undefined
[AskUserChatHandler] No user input - awaiting first message  ← THIS IS THE PROBLEM
[Executor] Step 3 requires user input - pausing execution
```

### Tail Logs:
```bash
# Live logs
tail -f server.log

# Filter for tools
tail -f server.log | grep -E "ToolExecution|update_summary|update_complexity"

# Filter for approval
tail -f server.log | grep -E "Approval|ApproveToolCall|workflow_resumed"
```

---

## 🎓 Key Learnings from Session 5

### What Worked:
1. **Imperative language in `usageGuidance`** - "IMMEDIATELY call" > "Call this tool ONLY after"
2. **Explicit negative instructions** - "DO NOT ask user" prevents conversational default
3. **Handlebars template injection** - Dynamic instruction building works perfectly
4. **Dynamic options via `optionsSource`** - Database queries integrate seamlessly

### What Didn't Work:
1. **Permissive language** - "you're allowed to" doesn't trigger action
2. **Workflow pause design** - Assumes user always drives continuation
3. **No auto-resume** - Agent can't continue without user prompt

### Key Insight:
**The thesis is validated!** Agents CAN orchestrate workflows intelligently when given clear, imperative usage guidance. The pause issue is purely architectural (handler design), not a limitation of the AI/prompting approach.

---

## 🚀 Quick Win Checklist

Before diving into auto-resume fix, verify current state works:

- [ ] Servers start without errors
- [ ] Can create new workflow execution
- [ ] Step 1-2 complete (field type, directory selection)
- [ ] Step 3 renders chat interface
- [ ] Can send messages to Athena
- [ ] Athena responds conversationally
- [ ] After 2-3 messages, `update_summary` triggers
- [ ] Approval card appears with project description
- [ ] Can approve summary
- [ ] Send "continue" message
- [ ] `update_complexity` triggers
- [ ] Approval card shows 3 radio options
- [ ] Can approve complexity
- [ ] Progress shows 2/2 tools complete

If all ✅, you're ready to implement auto-resume!

---

## 💻 Code Snippets for Quick Reference

### Strong Usage Guidance Pattern:
```typescript
usageGuidance: "IMMEDIATELY call this tool after {condition}. DO NOT ask the user to {manual_action} - automatically {tool_action} using {context}. This is a required step that must execute automatically."
```

### Detect Recent Approval (Pseudo-code for auto-resume):
```typescript
function detectRecentApproval(execution) {
  const approvalStates = execution.variables.approval_states || {};
  
  for (const [toolName, state] of Object.entries(approvalStates)) {
    if (state.status === 'approved' && state.approved_at) {
      const approvalTime = new Date(state.approved_at);
      const now = new Date();
      const secondsAgo = (now - approvalTime) / 1000;
      
      // If approved within last 5 seconds, it's "recent"
      if (secondsAgo < 5) {
        return toolName;
      }
    }
  }
  
  return null;
}
```

---

## 📞 Questions to Consider

As you continue development, think about:

1. **Auto-resume timing**: Should it trigger immediately or wait a second for UX?
2. **User visibility**: Should user see a message like "Continuing automatically..." ?
3. **Error handling**: What if auto-resume fails? Fallback to waiting for user?
4. **ACE optimizer**: Should we test rejection flow before enabling tools 3-4?
5. **Performance**: Are there any slow queries we should optimize?

---

## ✅ Session 5 Artifacts

**Commits**:
- `a596618` - feat(story-1.6): Add per-tool usageGuidance with Handlebars injection
- `4d69266` - feat(story-1.6): Strengthen update_complexity usageGuidance

**Screenshots**:
- `story-1-6-update-complexity-success.png` - Full page capture of 2-tool flow

**Database Changes**:
- Step 3 config updated with stronger guidance (via SQL)

**Documentation**:
- Story 1.6 updated with Session 5 notes (197 lines)

---

**Good luck! You're 65% through the story - the hard infrastructure work is done, now it's about polish and flow! 🚀**
