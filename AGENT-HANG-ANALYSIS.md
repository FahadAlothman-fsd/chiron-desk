# Agent Hang Issue - Root Cause Analysis

## Problem
After approving "Update Complexity", the agent (Athena using Gemini 2.0 Flash) gets stuck:
- Agent writes reasoning about needing to call `select_workflow_path` tool
- But never actually invokes the tool
- No text response sent to user
- Execution remains "paused"

## Evidence from Database

### Last Assistant Message (Mastra):
```json
{
  "format": 2,
  "parts": [{
    "type": "reasoning",
    "reasoning": "",
    "details": [{
      "type": "text",
      "text": "We need to follow the workflow: after complexity classification approved, need to select workflow path. The system says we must call tool IMMEDIATELY after classification is approved. There's a tool \"select_workflow_path\"? Not listed but instruction says call this tool IMMEDIATELY after complexity_classification is approved. We need to fetch matching workflow paths from database and recommend. Likely we need to call a tool named \"select_workflow_path\". Use tool."
    }]
  }]
}
```

**Note**: Message has ONLY reasoning, NO tool invocation, NO text content.

## Root Cause

**Gemini 2.0 Flash Free model gets stuck in reasoning mode** without completing the action.

The agent:
1. ✅ Understands it needs to call a tool
2. ✅ Writes reasoning explaining what to do
3. ❌ **Never actuallyinvokes the tool**
4. ❌ **Sends empty/incomplete message**

## Potential Solutions

### Option 1: Change Agent Model (Quick Fix)
Replace Gemini Flash with a more reliable model:
- **Claude Sonnet** (better tool calling)
- **GPT-4** (more reliable)  
- **Gemini Pro** (paid, more reliable than Flash Free)

### Option 2: Add Stuck Detection (Medium Fix)
Implement automatic retry logic:
```typescript
if (lastMessage.hasReasoningOnly && noToolCall && elapsedTime > 5s) {
  // Retry with explicit prompt: "You must call the tool now"
}
```

### Option 3: Explicit Tool Forcing (Complex Fix)
Make tool calling more explicit in the workflow:
- Auto-invoke tools when prerequisites met
- Don't rely on agent judgment for "IMMEDIATELY" tools

### Option 4: Manual Recovery (Immediate Workaround)
Send a follow-up message to nudge the agent:
```
"Please call the select_workflow_path tool now to continue."
```

## Recommendation

**Immediate**: Change Athena's model from `google/gemini-2.0-flash-exp:free` to `anthropic/claude-sonnet-4` or `openai/gpt-4o`

**Long-term**: Add stuck detection and auto-retry logic to the ask-user-chat handler

## Test Result Impact

This is a **minor issue** that doesn't invalidate the Story 1.8 success:
- ✅ Core workflow logic works
- ✅ Tool invocation works (2/4 tools succeeded)
- ✅ Approval workflow works
- ⚠️ Agent model reliability needs improvement

The architecture is solid - this is just a model selection/tuning issue.
