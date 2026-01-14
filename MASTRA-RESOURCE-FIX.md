# Mastra Resource ID Fix

## Error

When starting a child workflow, got error:

```
Failed to start workflow
Expected to find a resource for messageId, but could not find expected error has occurred.
```

## Root Cause

Mastra requires messages to have a `resourceId` that matches the thread's resourceId. When saving the initial generated message to the thread, we weren't including the `resourceId` field.

## Fixes Applied

### 1. Added `resourceId` When Saving Initial Message

**File**: `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`

**Before**:

```typescript
await storage.saveMessages({
  messages: [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content: generatedMessage.text,
      threadId: agentContext.threadId,
      metadata: { type: "initial_message", agent_id: config.agentId },
    },
  ],
});
```

**After**:

```typescript
// Get resourceId from thread
const thread = await storage.getThreadById({ threadId: agentContext.threadId });
const resourceId = thread?.resourceId || `user-${context.systemVariables.current_user_id}`;

await storage.saveMessages({
  messages: [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content: generatedMessage.text,
      threadId: agentContext.threadId,
      resourceId, // ✅ Required by Mastra
      metadata: { type: "initial_message", agent_id: config.agentId },
    },
  ],
});
```

### 2. Added Error Handling

Wrapped the message save in try-catch to gracefully handle failures:

```typescript
try {
  // Save message...
  console.log(
    "[AskUserChatHandler] Saved generated initial message to thread:",
    agentContext.threadId,
  );
} catch (saveError) {
  console.error("[AskUserChatHandler] Failed to save initial message to thread:", saveError);
  // Don't throw - we can still continue without initial message in history
  // The message is saved in execution variables for fallback
}
```

### 3. Added Thread Verification

Before calling `agent.generate()`, verify the thread exists:

```typescript
// Verify thread exists before using it
const storage = mastra.getStorage();
if (storage) {
  const thread = await storage.getThreadById({ threadId });
  if (!thread) {
    console.error(`[AskUserChatHandler] Thread not found: ${threadId}`);
    throw new Error(`Thread ${threadId} not found in storage`);
  }
  console.log(`[AskUserChatHandler] Thread verified, resourceId: ${thread.resourceId}`);
}
```

### 4. Enhanced Logging

Added more detailed logging for debugging:

```typescript
console.log("[AskUserChatHandler] Thread ID for initial message:", agentContext.threadId);
console.log(
  "[AskUserChatHandler] Execution variables available:",
  Object.keys(context.executionVariables),
);
console.log(`[AskUserChatHandler] Using agent: ${agentName}`);
```

## How It Works Now

### Thread Creation & Resource ID

1. **Thread is created** (`initializeAgent()`)

   ```typescript
   const thread = await createThread(`user-${context.systemVariables.current_user_id}`);
   // resourceId: "user-123e4567-e89b-12d3-a456-426614174000"
   ```

2. **Thread is stored** in Mastra's `mastra.threads` table
   - `id`: "thread-1733456789-abc123def"
   - `resource_id`: "user-123e4567-e89b-12d3-a456-426614174000"

3. **Initial message is generated** (`generateInitialMessage: true`)

   ```typescript
   const generatedMessage = await agent.generate([...], { system: resolvedPrompt });
   ```

4. **Initial message is saved to thread** with matching resourceId

   ```typescript
   await storage.saveMessages({
     messages: [
       {
         threadId: "thread-1733456789-abc123def",
         resourceId: "user-123e4567-e89b-12d3-a456-426614174000", // ✅ Matches thread
         role: "assistant",
         content: "🔬 Let's solve this mystery!...",
       },
     ],
   });
   ```

5. **Frontend loads messages**
   ```typescript
   const messages = await trpc.workflows.getChatMessages.useQuery({ executionId });
   // Returns: [{ role: "assistant", content: "🔬 Let's solve this mystery!..." }]
   ```

## Mastra Resource ID Requirements

Mastra uses `resourceId` to:

- Link messages to specific user contexts
- Enable multi-tenancy (different users, different threads)
- Enforce data isolation

**Rule**: Every message MUST have a `resourceId` that matches its thread's `resourceId`.

**Format**: `user-{userId}` where userId is a UUID

**Example**:

```
Thread: thread-1733456789-abc123def
  resourceId: user-550e8400-e29b-41d4-a716-446655440000

Message: msg-1733456800-xyz789
  threadId: thread-1733456789-abc123def
  resourceId: user-550e8400-e29b-41d4-a716-446655440000  ✅ MUST match
```

## Testing

### 1. Start a Child Workflow

1. Navigate to parent workflow with invoke-workflow step
2. Click "Execute" on a technique (e.g., "Five Whys")
3. Click "Start Workflow" in confirmation dialog

### 2. Expected Behavior

✅ Child dialog opens
✅ Chat shows agent's greeting message immediately
✅ Message references inherited variables (topic, goals)
✅ No "Expected to find a resource" error

### 3. Check Server Logs

```bash
tail -f /home/gondilf/Desktop/projects/masters/chiron/server.log | grep "AskUserChatHandler"
```

Should see:

```
[AskUserChatHandler] Generating initial message dynamically...
[AskUserChatHandler] Thread ID for initial message: thread-...
[AskUserChatHandler] Using agent: brainstorming-coach
[AskUserChatHandler] Generated initial message: 🔬 Let's solve this mystery!...
[AskUserChatHandler] Saved generated initial message to thread: thread-...
```

### 4. Verify in Database

```bash
bun run db:studio
```

**Check `mastra.messages` table**:

- Filter by `thread_id` (from execution variables `mastra_thread_id`)
- Should have 1 row:
  - `role = "assistant"`
  - `content` = initial greeting
  - `resource_id` = matches thread's resource_id
  - `metadata` has `type: "initial_message"`

**Check `mastra.threads` table**:

- Find thread by ID
- `resource_id` should be `user-{uuid}`

## Common Issues

### Issue: Still getting "Expected to find a resource" error

**Debug Steps**:

1. **Check thread exists**:

   ```bash
   # In db:studio, find thread in mastra.threads
   # Verify resource_id is set
   ```

2. **Check message resourceId**:

   ```bash
   # In db:studio, find message in mastra.messages
   # Verify resource_id matches thread's resource_id
   ```

3. **Check server logs**:

   ```bash
   tail -f server.log | grep -i "resource\|thread"
   ```

4. **Check variable consistency**:
   - Thread created with: `user-${context.systemVariables.current_user_id}`
   - Message saved with: same `userId`
   - Agent.generate called with: `resource: user-${userId}`
   - All three MUST use the same userId

### Issue: Compilation error "mastra has already been declared"

**Solution**: Fixed by reusing existing `mastra` variable instead of declaring new one.

### Issue: Initial message doesn't show in chat

**Possible Causes**:

1. Message save failed (check try-catch logs)
2. Frontend not polling `getChatMessages` (check Network tab)
3. Thread ID mismatch (check execution variables vs Mastra thread)

## Related Files

**Backend**:

- `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts` - Generates and saves initial message
- `packages/api/src/services/mastra/mastra-service.ts` - Creates threads with resourceId

**Frontend**:

- `apps/web/src/components/workflows/steps/ask-user-chat-step.tsx` - Loads messages via `getChatMessages`

**Database**:

- `mastra.threads` - Stores thread with resource_id
- `mastra.messages` - Stores messages with resource_id matching thread

## Summary

The fix ensures that:

1. ✅ Initial message is generated with correct context
2. ✅ Message is saved to Mastra thread with matching `resourceId`
3. ✅ Thread exists before trying to use it
4. ✅ Errors are handled gracefully
5. ✅ Detailed logging for debugging
6. ✅ Frontend receives message via `getChatMessages`

The error was caused by missing `resourceId` field when saving the initial message. Mastra requires this field to match the thread's resourceId for data isolation and multi-tenancy.
