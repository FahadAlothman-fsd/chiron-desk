# Initial Message Generation Fix

## Issue

Child workflows (like "Five Whys") with `generateInitialMessage: true` were not showing the AI-generated greeting message. The chat interface showed "Start a conversation" instead of the agent's introduction.

## Root Cause

The `ask-user-chat-handler.ts` was generating the initial message correctly using `agent.generate()`, but it was **only storing it in execution variables** (`initial_message`, `generated_initial_message`). It was **not saving it to the Mastra thread**, so when the chat UI called `getChatMessages`, it returned an empty array.

## How It Should Work

### Workflow Configuration (Five Whys Example)

```typescript
const step1Config: AskUserChatStepConfig = {
  agentId: coachAgent.id,
  generateInitialMessage: true, // ✅ Enable dynamic generation
  initialPrompt: `You are Carson, an elite brainstorming facilitator...
  
**Session Context:**
Topic: {{parent.session_topic}}
Goals: {{parent.stated_goals}}

**Your Mission:**
Use the Five Whys technique to drill down from the surface problem to the ROOT CAUSE.

Start with energy: "🔬 Let's solve this mystery! We'll ask WHY five times to find the real culprit. Based on your topic '{{parent.session_topic}}', here's my first question..."`,
  // ... tools config
};
```

### Processing Flow

1. **Child workflow starts** → `executeWorkflow()` creates execution
2. **First step executes** → `ask-user-chat-handler.ts` `executeStep()`
3. **No user input yet** → Handler checks for `generateInitialMessage: true`
4. **Generate message**:
   - Resolves variables in `initialPrompt` (e.g., `{{parent.session_topic}}` → "Improving UX")
   - Calls `agent.generate()` with resolved prompt
   - Agent produces greeting message based on context
5. **Save to thread** → ✅ **NEW**: Saves generated message to Mastra thread
6. **Return to frontend** → Step pauses, waiting for user input
7. **Frontend loads** → Calls `getChatMessages` → Sees agent's greeting
8. **User sees**: "🔬 Let's solve this mystery! Based on your topic 'Improving UX', here's my first question..."

## The Fix

### File: `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`

**Before** (lines 618-634):

```typescript
console.log("[AskUserChatHandler] Generated initial message:", generatedMessage.text);

return {
  output: {
    ...output,
    agent_context: { threadId: agentContext.threadId },
    initial_message: generatedMessage.text,
    generated_initial_message: generatedMessage.text,
  },
  nextStepNumber: null,
  requiresUserInput: true,
};
```

**After** (added message saving):

```typescript
console.log("[AskUserChatHandler] Generated initial message:", generatedMessage.text);

// ✅ NEW: Save generated message to Mastra thread so it appears in chat history
const storage = mastra.getStorage();
if (storage && agentContext.threadId) {
  await storage.saveMessages({
    messages: [
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: generatedMessage.text,
        createdAt: new Date(),
        threadId: agentContext.threadId,
        metadata: {
          type: "initial_message",
          agent_id: config.agentId,
        },
      },
    ],
  });
  console.log(
    "[AskUserChatHandler] Saved generated initial message to thread:",
    agentContext.threadId,
  );
}

return {
  output: {
    ...output,
    agent_context: { threadId: agentContext.threadId },
    initial_message: generatedMessage.text,
    generated_initial_message: generatedMessage.text,
  },
  nextStepNumber: null,
  requiresUserInput: true,
};
```

## What This Fixes

### Before Fix

```
Child Workflow Opens
┌─────────────────────────────────────────┐
│  Five Whys                              │
│                                         │
│  [Chat Interface]                       │
│                                         │
│       💬                                │
│  Start a conversation                   │
│  Send a message to begin chatting       │
│  with Carson                            │
│                                         │
│  [Type your message...]                 │
└─────────────────────────────────────────┘
```

❌ User doesn't know what to do
❌ No context about the technique
❌ Requires user to start conversation

### After Fix

```
Child Workflow Opens
┌─────────────────────────────────────────┐
│  Five Whys                              │
│                                         │
│  [Chat Interface]                       │
│                                         │
│  🤖 Carson:                             │
│  🔬 Let's solve this mystery! We'll     │
│  ask WHY five times to find the real    │
│  culprit. Based on your topic           │
│  'Improving UX design workflow',        │
│  here's my first question:              │
│                                         │
│  Why do you think your current UX       │
│  design workflow needs improvement?     │
│                                         │
│  [Type your message...]                 │
└─────────────────────────────────────────┘
```

✅ Agent greets user with context
✅ Explains the technique
✅ Asks first question immediately
✅ Uses inherited variables (topic, goals)

## Testing The Fix

### Prerequisites

- Server running (already started in background)
- Parent workflow executed through invoke-workflow step
- Child workflow (e.g., "Five Whys") configured with `generateInitialMessage: true`

### Test Steps

1. **Navigate to parent workflow**

   ```
   http://localhost:{port}/projects/{projectId}/workflow/{parentExecutionId}
   ```

2. **Click Execute on a technique**
   - Should see confirmation dialog with topic/goals

3. **Click "Start Workflow"**
   - Child dialog should open
   - ✅ Should immediately see agent's greeting message
   - ✅ Message should reference inherited variables (topic, goals)
   - ✅ Should ask first question specific to the technique

4. **Check message metadata**
   - Open browser DevTools → Network → Find `getChatMessages` request
   - Response should have 1 message with:
     - `role: "assistant"`
     - `metadata.type: "initial_message"`
     - `content: "🔬 Let's solve this mystery..."`

### Expected Console Logs (Server)

When child workflow starts, you should see:

```
[AskUserChatHandler] No user input and no rejected tools - checking initial message
[AskUserChatHandler] Generating initial message dynamically...
[AskUserChatHandler] Generated initial message: 🔬 Let's solve this mystery! We'll ask WHY five times...
[AskUserChatHandler] Saved generated initial message to thread: {threadId}
```

## Workflows That Benefit

All technique workflows with `generateInitialMessage: true`:

1. **Five Whys** (`five-whys`)
   - Greets user with detective energy
   - References session topic and goals
   - Asks first "why" question

2. **Six Thinking Hats** (`six-thinking-hats`)
   - Explains the technique
   - References session context
   - Starts with first hat (White Hat - facts)

3. **SCAMPER** (`scamper`)
   - Introduces creative modification technique
   - References idea being modified
   - Asks first SCAMPER question

4. **Reverse Brainstorming** (`reverse-brainstorming`)
   - Explains counter-intuitive approach
   - References problem to solve
   - Asks first reverse question

## Variable Resolution

The `initialPrompt` supports variable interpolation:

### Parent Variables (via Child Execution)

```typescript
initialPrompt: `
Topic: {{parent.session_topic}}
Goals: {{parent.stated_goals}}
`;
```

These are resolved from the child execution's variables (which were passed from parent via `mappedVariables`).

### How It Works

```typescript
// In ask-user-chat-handler.ts
const resolvedPrompt = this.resolvePromptVariables(
  config.initialPrompt,
  context, // Execution context with variables
);
```

The `resolvePromptVariables()` method:

1. Finds all `{{variable_name}}` patterns
2. Looks up values in `context.variables` (execution variables)
3. Replaces placeholders with actual values
4. Returns resolved prompt string

### Example Resolution

**Initial Prompt Template:**

```
Topic: {{parent.session_topic}}
Goals: {{parent.stated_goals}}
```

**Child Execution Variables:**

```json
{
  "session_topic": "Improving UX design workflow",
  "stated_goals": ["Faster iterations", "Better user feedback"],
  "selected_model": "anthropic/claude-3-5-sonnet-20241022"
}
```

**Resolved Prompt:**

```
Topic: Improving UX design workflow
Goals: ["Faster iterations", "Better user feedback"]
```

Agent then uses this resolved prompt to generate contextual greeting.

## Debugging

### If Initial Message Still Doesn't Show

**Check 1: Server Logs**

```bash
tail -f /home/gondilf/Desktop/projects/masters/chiron/server.log | grep "AskUserChatHandler"
```

Look for:

- `[AskUserChatHandler] Generating initial message dynamically...`
- `[AskUserChatHandler] Generated initial message: ...`
- `[AskUserChatHandler] Saved generated initial message to thread: ...`

If missing, check:

- Is `generateInitialMessage: true` in step config?
- Is `initialPrompt` defined?
- Did step execute (check for `executeStep` log)?

**Check 2: Database (Mastra Messages)**

```bash
bun run db:studio
```

Navigate to `mastra.messages` table, filter by `thread_id` (from execution variables `mastra_thread_id`).

Should see:

- 1 row with `role = "assistant"`
- `content` contains generated greeting
- `metadata` has `type: "initial_message"`

**Check 3: Frontend Network Tab**
Open DevTools → Network → Filter for `getChatMessages`

Response should have:

```json
{
  "messages": [
    {
      "id": "...",
      "role": "assistant",
      "content": "🔬 Let's solve this mystery!...",
      "metadata": {
        "type": "initial_message",
        "agent_id": "..."
      },
      "created_at": "2025-12-05T..."
    }
  ]
}
```

If empty `[]`:

- Message wasn't saved to thread
- Check server logs for error during `storage.saveMessages()`

**Check 4: Variable Resolution**
If message shows but doesn't have context (e.g., shows `{{parent.session_topic}}` literally):

Check child execution variables:

```bash
bun run db:studio
# workflow_executions table
# Find child execution
# Check `variables` JSON column
```

Should contain:

- `session_topic`: (inherited from parent)
- `stated_goals`: (inherited from parent)

If missing, check:

- Parent's `variableMapping` in invoke-workflow step config
- `createAndStartChild` mutation - did it pass `mappedVariables`?

## Related Files

**Backend:**

- `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts` - Handler that generates and saves initial message
- `packages/scripts/src/seeds/techniques/five-whys.ts` - Example workflow with `generateInitialMessage: true`

**Frontend:**

- `apps/web/src/components/workflows/steps/ask-user-chat-step.tsx` - Chat UI that loads messages via `getChatMessages`

**Database:**

- `mastra.messages` table - Stores all chat messages including initial message
- `workflow_executions.variables` - Contains `mastra_thread_id` for linking

## Benefits

✅ **Better UX** - User immediately understands what to do
✅ **Context-Aware** - Agent references inherited variables (topic, goals)
✅ **Technique Explanation** - Agent explains the brainstorming method
✅ **Immediate Engagement** - Agent asks first question right away
✅ **Professional** - Feels like working with a real coach/facilitator

## Next Steps

1. **Test with Five Whys** - Verify greeting message appears
2. **Test with other techniques** - Six Thinking Hats, SCAMPER, etc.
3. **Monitor server logs** - Confirm messages are being saved
4. **Check message quality** - Is the greeting helpful and engaging?
5. **Iterate on prompts** - Improve `initialPrompt` based on user feedback
