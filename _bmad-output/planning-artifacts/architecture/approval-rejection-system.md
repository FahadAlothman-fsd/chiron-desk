# Approval & Rejection System Architecture

**Date:** December 1, 2025  
**Status:** ⚠️ WORK IN PROGRESS - Active Testing & Refinement  
**Last Updated:** Dec 1, 2025  
**Implementation:** Commits 7ce092a0, 1d59fe1e, 4e1bf0e3 (Nov 29-30, 2025)

---

## ⚠️ Document Status

This document describes the **Timeline-Based Rejection System** currently in production. However, this system is still undergoing active testing and refinement during Epic 2 implementation.

**Expected Stability:** Mid-Epic 2 (Story 2.4-2.5)  
**Current Phase:** Production use with ongoing improvements  
**Known Issues:** See bottom of document

---

## Overview

Chiron's workflow engine uses an **approval gate pattern** where all tool outputs require user approval before proceeding. This ensures human-in-the-loop control over AI-generated content.

### Core Concepts

1. **Approval Cards** - UI components showing tool output for review
2. **Approval States** - Backend storage tracking approval status per tool
3. **Timeline Pattern** - Rejected cards remain visible (read-only) while new cards appear for regenerated content
4. **Forced Regeneration** - System forces agent to regenerate rejected tools using `toolChoice`

---

## Approval States Data Structure

All approval states are stored in `execution.variables.approval_states`:

```typescript
approval_states: {
  [toolName: string]: {
    status: "pending" | "approved" | "rejected" | "regenerating",
    value: any,  // The tool output awaiting/after approval
    
    // Derived values (from extractFrom pattern)
    derived_values?: Record<string, any>,
    
    // Rejection tracking
    rejection_history?: Array<{
      feedback: string,
      rejectedAt: string,
      previousOutput?: string | Record<string, unknown>
    }>,
    rejection_count?: number
  }
}
```

### Status Flow

```
pending → approved ✓
   ↓
rejected → regenerating → pending (new output) → approved ✓
                              ↓
                          rejected (again) → ...
```

---

## Timeline Pattern (New Approach)

**Design Philosophy:** Rejected cards become **historical records** rather than being updated in-place.

### Visual States

#### 1. Pending Approval (White Border)
```
┌─────────────────────────────────────────┐
│ 🔵 Awaiting Approval                    │
├─────────────────────────────────────────┤
│ Tool Output:                            │
│ { project_name: "task-manager" }        │
│                                         │
│ [Accept ✓] [Reject & Explain ✗]        │
└─────────────────────────────────────────┘
```

#### 2. Approved (Green Border)
```
┌─────────────────────────────────────────┐
│ ✅ Approved                              │
├─────────────────────────────────────────┤
│ Tool Output:                            │
│ { project_name: "task-manager" }        │
└─────────────────────────────────────────┘
```

#### 3. Rejected - Final State (Red Border, Read-Only)
```
┌─────────────────────────────────────────┐
│ ❌ Rejected                              │
├─────────────────────────────────────────┤
│ Tool Output:                            │
│ { project_name: "old-name" }            │
│                                         │
│ ▼ Last Rejection (1 rejection total)   │
│   User Feedback: "Name too generic"    │
│   Rejected: 2025-12-01 10:30 AM        │
└─────────────────────────────────────────┘
(Card remains visible but locked)
```

#### 4. Regenerating (Blue Border, Spinner)
```
┌─────────────────────────────────────────┐
│ 🔄 Regenerating... ⏳                   │
├─────────────────────────────────────────┤
│ Agent is generating improved output     │
│ based on your feedback...               │
└─────────────────────────────────────────┘
```

#### 5. New Pending (After Regeneration, Green Highlight)
```
┌─────────────────────────────────────────┐
│ 🔵 Awaiting Approval (Regenerated)      │
├─────────────────────────────────────────┤
│ Tool Output:                            │
│ { project_name: "agile-task-tracker" } │  ← Highlighted green
│                                         │
│ ▼ Rejection History (1 previous)       │
│   [See previous rejection details]     │
│                                         │
│ [Accept ✓] [Reject & Explain ✗]        │
└─────────────────────────────────────────┘
```

---

## Rejection Flow (Complete)

### Step 1: User Rejects Tool Output

**Frontend** (`approval-card.tsx`):
```typescript
// User clicks "Reject & Explain"
const handleReject = () => {
  // Show textarea for feedback
  setShowRejectionInput(true);
};

const submitRejection = () => {
  rejectToolCall({
    executionId,
    toolName,
    feedback: rejectionFeedback
  });
};
```

---

### Step 2: Backend Processes Rejection

**API** (`workflows.ts` - `rejectToolCall` mutation):

```typescript
// 1. Duplicate detection (5-second window)
const existingHistory = toolState.rejection_history || [];
const isDuplicate = existingHistory.some(r => 
  r.feedback === feedback && 
  (Date.now() - new Date(r.rejectedAt).getTime()) < 5000
);

if (isDuplicate) {
  console.log("[Rejection] Duplicate detected, skipping");
  return;
}

// 2. Add to rejection history
const newRejection = {
  feedback,
  rejectedAt: new Date().toISOString(),
  previousOutput: toolState.value
};

toolState.rejection_history = [...existingHistory, newRejection];
toolState.rejection_count = (toolState.rejection_count || 0) + 1;

// 3. Set status to regenerating
toolState.status = "regenerating";

// 4. Continue execution (triggers agent regeneration)
await continueExecution(executionId, userId);
```

---

### Step 3: Agent Regenerates with Feedback

**Handler** (`ask-user-chat-handler.ts`):

```typescript
// Detect if regeneration is needed
const rejectedTools = Object.entries(approvalStates)
  .filter(([_, state]) => state.status === "regenerating")
  .map(([toolName, state]) => ({
    toolName,
    lastFeedback: state.rejection_history?.slice(-1)[0]?.feedback,
    previousOutput: state.rejection_history?.slice(-1)[0]?.previousOutput
  }));

if (rejectedTools.length > 0) {
  console.log("[Handler] Regeneration needed for:", rejectedTools.map(t => t.toolName));
  
  // Filter tools to only rejected ones
  const rejectedToolNames = rejectedTools.map(t => t.toolName);
  const filteredTools = allTools.filter(t => rejectedToolNames.includes(t.name));
  
  // Force tool call
  const toolChoice = rejectedTools.length === 1 
    ? { type: "tool" as const, toolName: rejectedTools[0].toolName }
    : "required" as const;
  
  // Use user's feedback as the message (not system instruction)
  const userMessage = rejectedTools.length === 1
    ? rejectedTools[0].lastFeedback
    : `Please regenerate the rejected tools based on the feedback provided.`;
  
  // Agent executes with forced tool call
  const result = await agent.generate(userMessage, {
    toolChoice,
    tools: filteredTools
  });
}
```

**Agent Instructions** (`agent-loader.ts`):

```typescript
// Inject rejection context into system instructions
if (rejectedTools && rejectedTools.length > 0) {
  instructions += "\n\n---\n## URGENT: Tool Regeneration Required\n\n";
  
  for (const rt of rejectedTools) {
    instructions += `**Tool**: ${rt.toolName}\n`;
    instructions += `**User Feedback**: "${rt.lastFeedback}"\n`;
    
    if (rt.previousOutput) {
      const outputStr = typeof rt.previousOutput === 'string' 
        ? rt.previousOutput 
        : JSON.stringify(rt.previousOutput, null, 2);
      
      instructions += `**Previous Output** (rejected):\n${outputStr.slice(0, 500)}...\n\n`;
    }
    
    instructions += `**Action Required**: You MUST call the ${rt.toolName} tool immediately with improved output that addresses the user's feedback.\n\n`;
  }
}
```

---

### Step 4: New Approval State Created

**Handler** (`ask-user-chat-handler.ts` - after agent completes):

```typescript
// Agent called tool with new output
const newToolState = {
  status: "pending",
  value: toolResult.output,
  
  // Preserve rejection history
  rejection_history: existingState.rejection_history,
  rejection_count: existingState.rejection_count
};

execution.variables.approval_states[toolName] = newToolState;

// UI shows new pending card with rejection history visible
```

---

### Step 5: User Reviews Regenerated Output

**Frontend** (`approval-card.tsx`):

```typescript
// Show regenerated content with green highlight
<div className={cn(
  "p-4 rounded",
  hasRejectionHistory && "bg-green-50 border-l-4 border-green-500"
)}>
  {/* New tool output */}
</div>

{/* Show collapsible rejection history */}
{rejectionHistory && rejectionHistory.length > 0 && (
  <Accordion>
    <AccordionItem value="history">
      <AccordionTrigger>
        ▼ Rejection History ({rejectionHistory.length} previous)
      </AccordionTrigger>
      <AccordionContent>
        {rejectionHistory.map((rejection, idx) => (
          <div key={idx} className="mb-4">
            <div className="text-sm text-gray-600">
              Rejected: {new Date(rejection.rejectedAt).toLocaleString()}
            </div>
            <div className="font-semibold mt-1">User Feedback:</div>
            <div className="text-sm italic">"{rejection.feedback}"</div>
            {rejection.previousOutput && (
              <>
                <div className="font-semibold mt-2">Previous Output:</div>
                <pre className="text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(rejection.previousOutput, null, 2)}
                </pre>
              </>
            )}
          </div>
        ))}
      </AccordionContent>
    </AccordionItem>
  </Accordion>
)}
```

User can:
- **Accept** → Status becomes "approved", workflow continues
- **Reject again** → Process repeats, adds to history

---

## Key Design Decisions

### 1. Timeline Pattern vs In-Place Update

**Why Timeline?**
- ✅ Clear history of what was rejected and why
- ✅ User can compare old vs new output
- ✅ Debugging: See exactly what agent produced at each iteration
- ✅ Training data: Rejection patterns can improve signatures

**Trade-off:**
- More cards in UI (manageable with collapsing)
- Slightly more complex state management

---

### 2. Forced Tool Call via `toolChoice`

**Why Force?**
- ✅ Guarantees agent regenerates the specific rejected tool
- ✅ Prevents agent from asking clarifying questions instead of acting
- ✅ Faster regeneration (no "thinking" phase)

**Options:**
```typescript
// Single rejection - force specific tool
toolChoice: { type: "tool", toolName: "generate_summary" }

// Multiple rejections - require any tool call
toolChoice: "required"
```

---

### 3. User Feedback as Message (Not System Instruction)

**Why?**
- ✅ Feedback appears naturally in chat history
- ✅ No hidden system messages
- ✅ User sees what agent is responding to
- ✅ Mastra thread preserves context correctly

**Rejection feedback** is also injected into **system instructions** for emphasis, but the **user message** is the actual feedback text.

---

### 4. Duplicate Detection (5-Second Window)

**Why?**
- Bug fix from early implementation
- Frontend could trigger multiple rejection calls
- 5-second window prevents duplicate history entries

```typescript
const isDuplicate = existingHistory.some(r => 
  r.feedback === feedback && 
  (Date.now() - new Date(r.rejectedAt).getTime()) < 5000
);
```

---

## Integration with Other Systems

### With `extractFrom` (Derived Variables)

When tool output is approved, both generated and derived values are stored:

```typescript
approval_states: {
  "select_workflow_path": {
    status: "approved",
    value: {
      selected_workflow_path_id: "uuid-123"  // Generated by Ax
    },
    derived_values: {
      selected_workflow_path_name: "BMad Method"  // Extracted
    }
  }
}
```

**On rejection:** Both sets of values are discarded, agent regenerates only the `value` portion.

---

### With `update-variable` Tools

`update-variable` tools also show approval cards and support rejection:

```typescript
// Agent calls update-variable tool
agent.call_tool("set_session_topic", {
  value: "team collaboration",
  reasoning: "User mentioned collaboration"
});

// Approval card appears
// User can reject → agent extracts different value from conversation
```

---

## Known Issues & Limitations

### 1. Old Duplicates in Database
**Issue:** Duplicate rejections created before duplicate detection was added  
**Impact:** Some tools have redundant rejection history entries  
**Workaround:** Clean up manually or ignore (doesn't affect functionality)  
**Status:** Low priority

### 2. Regeneration Timing
**Issue:** Sometimes takes 2-3 seconds to show "Regenerating" state  
**Impact:** User might think nothing happened  
**Workaround:** None needed (cosmetic)  
**Status:** Monitoring

### 3. Multiple Rejections UI
**Issue:** When 3+ tools rejected, UI can feel cluttered  
**Impact:** Harder to track which regenerations are for which tools  
**Workaround:** Approve tools individually rather than batching rejections  
**Status:** UI enhancement for Epic 3

---

## Testing Checklist

During Epic 2 implementation, verify:

- [ ] Single tool rejection with feedback
- [ ] User feedback appears in chat (not "Please proceed")
- [ ] No system messages visible in chat
- [ ] Agent regenerates quickly (< 5 seconds)
- [ ] New approval card shows "Awaiting Approval"
- [ ] Rejection history displays correctly in collapsible
- [ ] Reject same tool twice with different feedback
- [ ] Second feedback added to history (no duplicate)
- [ ] Approve regenerated output
- [ ] Status changes to "approved"
- [ ] Next tool becomes available
- [ ] Multiple tool rejections handled correctly
- [ ] `update-variable` tool rejection works

---

## Future Enhancements

### Planned for Epic 3+
1. **Diff View** - Show side-by-side comparison of old vs new output
2. **Rejection Analytics** - Feed rejection patterns to MiPRO/ACE for signature optimization
3. **Rejection Categories** - Structured feedback (too long, wrong format, missing info, etc.)
4. **Edit Feedback** - Allow editing rejection feedback after submission
5. **Batch Approval** - Approve multiple regenerated tools at once

### Research Phase
1. **ACE Optimizer Integration** - Use rejection data for online signature refinement
2. **Smart Regeneration** - Predict which changes will satisfy user based on feedback patterns
3. **Rejection Limits** - Prevent infinite rejection loops (max 3-5 attempts)

---

## Implementation Files

### Backend
- `packages/api/src/routers/workflows.ts` - `rejectToolCall`, `rejectToolOutput` mutations
- `packages/api/src/services/mastra/agent-loader.ts` - Rejection feedback injection
- `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts` - Regeneration logic

### Frontend
- `apps/web/src/components/workflows/approval-card.tsx` - Timeline UI, rejection history
- `apps/web/src/components/workflows/steps/ask-user-chat-step.tsx` - Chat integration
- `apps/web/src/components/workflows/tool-status-sidebar.tsx` - Status indicators
- `apps/web/src/components/workflows/tool-status-panel.tsx` - Panel display

---

## Related Documentation

- [Tool Types Reference](/docs/architecture/tool-types.md) - Approval flow for both tool types
- [Dynamic Tool Options](/docs/architecture/dynamic-tool-options.md) - How extractFrom works with approvals
- [REJECTION-SYSTEM-FINAL.md](/REJECTION-SYSTEM-FINAL.md) - Implementation notes and debugging log

---

**Document Status:** ⚠️ WIP - This system is production-ready but actively being refined based on Epic 2 usage. Expect updates to this document as patterns stabilize.

**Last Updated:** December 1, 2025  
**Next Review:** After Story 2.5 completion
