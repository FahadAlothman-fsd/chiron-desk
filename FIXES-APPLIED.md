# Fixes Applied - Reasoning Display + Agent Hang

## Summary
Fixed two issues discovered during Story 1.8 testing:
1. ✅ Reasoning not being displayed in chat
2. ✅ Agent hanging when it generates reasoning-only responses

---

## Fix 1: Display Reasoning ✅

### Problem
Messages with `type: "reasoning"` weren't being parsed or displayed, even though the Reasoning component existed.

### Root Cause
The `parseMessageContent()` function only looked for `type: "thinking"`, but Mastra generates `type: "reasoning"` with nested `details` array.

### Solution
Updated `apps/web/src/components/workflows/steps/ask-user-chat-step.tsx`:

**Changed**: `parseMessageContent()` function (lines ~226-270)
- Added support for `type: "reasoning"` parts
- Extract text from nested `details` array format
- Map reasoning to `thinking` field for display in existing `<Reasoning>` component

```typescript
const reasoningParts = parts.filter((p) => p.type === "reasoning");

// Extract reasoning text from details array if present
let reasoningText = "";
if (reasoningParts.length > 0) {
  const reasoningPart = reasoningParts[0];
  if (reasoningPart.reasoning) {
    reasoningText = reasoningPart.reasoning;
  } else if (reasoningPart.details && Array.isArray(reasoningPart.details)) {
    // Extract text from details array
    reasoningText = reasoningPart.details
      .filter((d) => d.type === "text" && d.text)
      .map((d) => d.text)
      .join("\n");
  }
}
```

### Result
- Reasoning is now visible in collapsible UI element
- Users can see what the agent was thinking

---

## Fix 2: Handle Agent Hang ✅

### Problem
After generating reasoning, the agent sometimes:
- Doesn't call the expected tool
- Doesn't send any text content  
- Leaves the conversation stuck

### Root Cause  
The model (GPT OSS 120B via OpenRouter) occasionally generates ONLY reasoning without follow-up action. This is a known behavior with some LLMs where reasoning becomes the final output.

### Solution
Updated `apps/web/src/components/workflows/steps/ask-user-chat-step.tsx`:

**Changed**: Message rendering logic (lines ~519-542)
- Detect when message has reasoning but no text content
- Show "Agent is thinking..." state with "Continue" button
- Button sends follow-up prompt to trigger action

```typescript
{parsedContent.text ? (
  <MessageResponse>{parsedContent.text}</MessageResponse>
) : (
  !isUser && parsedContent.thinking && (
    <div className="flex items-center gap-2 border-dashed bg-muted/30 p-3">
      <Sparkles className="animate-pulse" />
      <span>Agent is thinking...</span>
      <button onClick={() => sendMessage.mutate({
        message: "Please proceed with the action you identified."
      })}>
        Continue
      </button>
    </div>
  )
)}
```

### Result
- User sees clear "thinking" state
- One click continues the conversation
- Agent proceeds with tool call or response

---

## Testing Verification

### Before Fixes
- ❌ Reasoning invisible to user
- ❌ Agent stuck indefinitely after reasoning
- ❌ No way to recover without manual backend intervention

### After Fixes
- ✅ Reasoning displayed in collapsible component
- ✅ Clear visual indicator when agent is thinking
- ✅ User can continue conversation with one click
- ✅ Workflow can complete successfully

---

## Additional Benefits

### Better UX
- Users understand what the agent is thinking
- Clear feedback when agent needs nudge
- No silent failures

### Debugging
- Reasoning content helps developers understand agent behavior
- Easy to identify when agent gets stuck
- Can analyze reasoning patterns for prompt improvements

---

## Next Steps (Future Enhancements)

### Backend Auto-Retry
Implement automatic retry in `ask-user-chat-handler.ts`:
- Detect reasoning-only responses
- Auto-inject follow-up prompt
- Retry agent.generate() seamlessly
- No user interaction needed

### Prompt Engineering
Update agent instructions:
- Explicitly require action after reasoning
- Discourage reasoning-only responses
- Test with different models for reliability

### Monitoring
Add metrics for:
- Reasoning-only response rate
- User "Continue" button clicks
- Agent recovery success rate

---

## Files Modified

1. `apps/web/src/components/workflows/steps/ask-user-chat-step.tsx`
   - Updated `parseMessageContent()` function
   - Added reasoning-only detection and Continue button

---

## Model Information

**Current**: GPT OSS 120B via OpenRouter  
**Note**: User-selected model (frontend selector) correctly overrides agent's default model (Gemini Flash)

**Behavior**: GPT OSS 120B sometimes generates reasoning-only responses, especially when deciding which tool to call. The fixes handle this gracefully.

---

## Conclusion

Both issues are now resolved with minimal code changes. The fixes are:
- ✅ Non-invasive (no breaking changes)
- ✅ User-friendly (clear UI feedback)
- ✅ Effective (workflow can continue)
- ✅ Maintainable (well-documented)

Story 1.8 testing can continue with these fixes in place.
