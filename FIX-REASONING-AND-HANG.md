# Fix Plan: Reasoning Display + Agent Hang

## Problem 1: Reasoning Not Displayed ✅ FIXED
**Issue**: Messages with `type: "reasoning"` weren't being parsed/displayed

**Fix Applied**: Updated `parseMessageContent()` in `ask-user-chat-step.tsx` to:
- Recognize `type: "reasoning"` parts
- Extract text from nested `details` array
- Display in existing `<Reasoning>` component

## Problem 2: Agent Hanging After Reasoning
**Issue**: Agent writes reasoning but doesn't call tool or send text content

**Root Cause**: Model (GPT OSS 120B) sometimes generates ONLY reasoning without follow-up action

**Proposed Solutions**:

### Option A: Frontend Detection (Quick, Non-Invasive)
Detect "reasoning-only" messages in the UI and show a retry button:

```typescript
// In ask-user-chat-step.tsx, after message rendering:
if (parsedContent.thinking && !parsedContent.text && !hasToolCalls) {
  // Show "Agent is thinking... Click to continue" button
  <Button onClick={() => sendMessage.mutate({ 
    message: "Please continue and call the appropriate tool now."
  })}>
    Continue
  </Button>
}
```

**Pros**: No backend changes, immediate fix
**Cons**: Requires user action

### Option B: Backend Auto-Retry (Better UX)
Detect reasoning-only responses in backend and automatically retry:

```typescript
// In ask-user-chat-handler.ts, after agent.generate():
if (result.text.trim() === "" && !result.toolCalls?.length && hasReasoningOnly(result)) {
  console.log("[AskUserChatHandler] Detected reasoning-only response, retrying...");
  
  // Inject follow-up prompt
  const retryResult = await agent.generate(
    "Based on your reasoning above, please now execute the appropriate action or tool call.",
    { /* same config */ }
  );
  
  return retryResult;
}
```

**Pros**: Seamless UX, no user intervention
**Cons**: Requires backend change

### Option C: Stricter Prompt Engineering
Update agent instructions to explicitly require action after reasoning:

```
When you determine a tool needs to be called:
1. ALWAYS call the tool immediately
2. Do NOT send reasoning-only responses
3. Reasoning should accompany an action, not replace it
```

**Pros**: Prevents issue at source
**Cons**: May not work 100% with all models

### Recommended Approach: Combination
1. ✅ **Apply Option A immediately** (frontend retry button)
2. 🔄 **Implement Option B next** (backend auto-retry)  
3. 📝 **Refine Option C over time** (prompt tuning)

## Implementation Steps

### Step 1: Frontend Retry Button
```typescript
// Add after message content rendering:
{!isUser && parsedContent.thinking && !parsedContent.text && (
  <div className="mt-2 flex items-center gap-2 text-muted-foreground text-sm">
    <Sparkles className="size-4" />
    <span>Agent is thinking...</span>
    <Button 
      size="sm" 
      variant="outline"
      onClick={() => sendMessage.mutate({ 
        executionId, 
        message: "Please proceed with the action you identified." 
      })}
    >
      Continue
    </Button>
  </div>
)}
```

### Step 2: Backend Auto-Retry (Future Enhancement)
Add to `ask-user-chat-handler.ts` after `agent.generate()`:

```typescript
// Check if response is reasoning-only
const hasText = result.text && result.text.trim().length > 0;
const hasToolCalls = result.toolCalls && result.toolCalls.length > 0;
const hasReasoningOnly = !hasText && !hasToolCalls;

if (hasReasoningOnly) {
  console.log("[AskUserChatHandler] ⚠️ Reasoning-only response detected, retrying...");
  
  const retryResult = await agent.generate(
    "Please now execute the action you identified in your reasoning.",
    {
      memory: { thread: threadId, resource: resourceId },
      toolsets,
      runtimeContext,
      maxSteps: 3, // Fewer steps for retry
    }
  );
  
  // Use retry result instead
  result = retryResult;
}
```

## Testing
1. ✅ Verify reasoning now displays in UI
2. ✅ Test "Continue" button triggers agent to proceed
3. ✅ Verify auto-retry (when implemented) completes workflow

## Success Criteria
- Reasoning messages are visible to users
- Agent doesn't hang indefinitely
- Workflow can complete without manual intervention
