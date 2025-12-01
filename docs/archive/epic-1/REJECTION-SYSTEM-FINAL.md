# Rejection System - Complete Implementation

## Overview
Implemented full tool rejection and regeneration flow with user feedback, including UI, backend logic, and agent instructions.

---

## Issues Fixed

### 1. Duplicate Rejection History
**Problem**: Same rejection appearing twice with identical timestamps  
**Root Cause**: `rejectToolOutput` endpoint calling `mergeExecutionVariables` twice; both endpoints missing duplicate detection  
**Fix**: 
- Removed duplicate `mergeExecutionVariables` call
- Added 5-second duplicate detection to both `rejectToolCall` and `rejectToolOutput`
- Changed `toolState.output` → `toolState.value`

### 2. Approved Value Display Bug
**Problem**: String values shown with each character on separate line  
**Root Cause**: `Object.entries()` on string creates character array  
**Fix**: Check if value is string first, render directly with `whitespace-pre-wrap`

### 3. Regeneration Status UI
**Problem**: No visual indication during regeneration  
**Fix**: 
- Added `"regenerating"` status to approval states
- Blue border, spinning loader, "Regenerating..." badge
- Status changes: `pending` → `regenerating` → `pending` (new result)

### 4. Rejection Count Badge
**Problem**: Badge in accordion header cut off as "1 f"  
**Fix**: Moved badge inside "Last Rejection" details box

### 5. System Messages in Chat
**Problem**: Internal regeneration instructions appearing as user messages  
**Root Cause**: Instructions injected into `effectiveUserInput`, saved to Mastra thread  
**Fix**: Use user's rejection feedback as the message instead

### 6. Agent Hanging During Regeneration
**Problem**: Agent stuck "thinking" when forced to call tool  
**Root Cause**: No context about rejection feedback after removing system messages  
**Fix**: Inject rejection feedback into agent's system instructions dynamically

---

## Implementation Details

### Backend Changes

#### `packages/api/src/routers/workflows.ts`
- **`rejectToolCall`**: Added duplicate detection, use "regenerating" status
- **`rejectToolOutput`**: Same duplicate detection logic, single `mergeExecutionVariables` call
- Both store: `rejection_history`, `rejection_count`, `previousOutput`

#### `packages/api/src/services/mastra/agent-loader.ts`
```typescript
// Inject rejection feedback into system instructions
if (rejectedTools && rejectedTools.length > 0) {
  instructions += "\n\n---\n## URGENT: Tool Regeneration Required\n\n";
  for (const rt of rejectedTools) {
    instructions += `**Tool**: ${rt.toolName}\n`;
    instructions += `**User Feedback**: "${rt.lastFeedback}"\n\n`;
    // Include previous output (truncated)
    // Include clear action required
  }
}
```

#### `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`
- During regeneration: Use user's feedback as the message
- Filter tools to only rejected when `regenerationNeeded === true`
- Force tool call via `toolChoice`:
  - Single rejection: `{ type: "tool", toolName: "..." }`
  - Multiple rejections: `"required"`
- Skip approved tools from toolset

### Frontend Changes

#### `apps/web/src/components/workflows/approval-card.tsx`
- Added `isRegenerating` prop
- Added `rejectionHistory` prop with timeline display
- Blue UI for regenerating state
- Collapsible rejection history with:
  - Previous output
  - User feedback
  - Timestamp
- Green highlight for regenerated content

#### `apps/web/src/components/workflows/tool-status-sidebar.tsx`
- Handle string values in approved section
- Move rejection count badge to details box
- Update interface to support "regenerating" status

#### Type Updates
Updated `ApprovalState` interface across all components:
- Added `"regenerating"` to status union
- Aligned `rejection_history` structure:
  ```typescript
  rejection_history?: Array<{
    feedback: string;
    rejectedAt: string;
    previousOutput?: string | Record<string, unknown>;
  }>;
  ```

---

## User Flow

### Rejection Flow
1. User clicks "Reject & Explain" on approval card
2. Provides feedback in textarea
3. Frontend calls `rejectToolCall` mutation
4. Backend:
   - Adds to `rejection_history` (with duplicate check)
   - Sets `status: "regenerating"`
   - Calls `continueExecution()`
5. Handler detects rejected tools:
   - Filters toolset to only rejected tools
   - Injects feedback into agent system instructions
   - Uses user's feedback as the chat message
   - Forces tool call via `toolChoice`
6. Agent:
   - Sees "URGENT: Tool Regeneration Required" in system instructions
   - Sees user feedback and previous output
   - Forced to call the specific tool
   - Generates improved output
7. New approval state created:
   - `status: "pending"`
   - Preserves `rejection_history`
   - New `value` and `reasoning`
8. UI updates:
   - Shows new approval card
   - Displays rejection history in collapsible
   - Highlights regenerated content

### Approval Flow (After Regeneration)
1. User reviews regenerated output
2. Clicks "Accept" or "Reject & Explain" again
3. If approved: status changes to "approved", tool unlocks next tools
4. If rejected again: Process repeats, adds to history

---

## Testing Checklist

- [ ] Reject tool with feedback
- [ ] Verify user's feedback appears in chat (not "Please proceed")
- [ ] Verify no system messages in chat
- [ ] Verify agent regenerates quickly (no long "thinking")
- [ ] Verify new approval card shows "Awaiting Approval"
- [ ] Verify rejection history shows correctly
- [ ] Reject same tool again with different feedback
- [ ] Verify second feedback added to history (no duplicate)
- [ ] Approve regenerated output
- [ ] Verify status changes to "approved"
- [ ] Verify next tool becomes available

---

## Files Modified

**Backend**:
- `packages/api/src/routers/workflows.ts`
- `packages/api/src/services/mastra/agent-loader.ts`
- `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`

**Frontend**:
- `apps/web/src/components/workflows/approval-card.tsx`
- `apps/web/src/components/workflows/steps/ask-user-chat-step.tsx`
- `apps/web/src/components/workflows/tool-status-sidebar.tsx`
- `apps/web/src/components/workflows/tool-status-panel.tsx`

---

## Known Issues

1. **Old duplicates remain in DB**: Duplicates created before this fix still exist. Clean up with:
   ```sql
   -- Remove duplicate rejection entries (keep only first)
   ```

2. **Server restart required**: Backend changes need server restart to take effect

---

## Future Enhancements

- [ ] Add rejection analytics to MiPRO training
- [ ] Show diff between previous and regenerated output
- [ ] Allow editing feedback after rejection
- [ ] Add rejection reason categories (too long, wrong format, missing info, etc.)
- [ ] Implement actual ACE optimizer integration
