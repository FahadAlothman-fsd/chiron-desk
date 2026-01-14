# Initial Message vs Initial Prompt - Implementation Guide

## The Distinction

There are **two different concepts** for starting a conversation in a workflow step:

### 1. `initialMessage` (UI Banner)

**Purpose**: Informational text for the user  
**Type**: UI element (not a chat message)  
**Location**: Banner/info box at the top of the chat  
**Example**: "This step will help you drill down to root causes using the Five Whys technique"

### 2. `initialPrompt` (User Message)

**Purpose**: Pre-filled prompt that starts the conversation  
**Type**: Real chat message (role: "user")  
**Location**: In the message timeline (visible as a user message)  
**Example**: After variable resolution, becomes a large block of text that the AI responds to

## Visual Example

### With Both initialMessage and initialPrompt

```
┌─────────────────────────────────────────────────────────────┐
│  Five Whys Chat                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 📝 About this step                                    │  │
│  │ This step will help you drill down to root causes    │  │
│  │ using the Five Whys technique                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  👤 User (initial prompt):                                  │
│  You are Carson, an elite brainstorming facilitator...     │
│                                                             │
│  Session Context:                                           │
│  Topic: Improving UX design workflow                        │
│  Goals: ["Faster iterations", "Better user feedback"]      │
│                                                             │
│  Your Mission: Use the Five Whys technique to drill        │
│  down from the surface problem to the ROOT CAUSE...         │
│                                                             │
│  🤖 Carson:                                                 │
│  🔬 Let's solve this mystery! We'll ask WHY five times      │
│  to find the real culprit. Based on your topic 'Improving  │
│  UX design workflow', here's my first question:             │
│                                                             │
│  Why do you think your current UX design workflow needs     │
│  improvement?                                               │
│                                                             │
│  [Type your message...]                                     │
└─────────────────────────────────────────────────────────────┘
```

### With Only initialMessage (No Auto-Response)

```
┌─────────────────────────────────────────────────────────────┐
│  Session Setup Chat                                         │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 📝 About this step                                    │  │
│  │ Tell me about your brainstorming session topic and    │  │
│  │ what you hope to achieve.                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  💬 Start a conversation                                    │
│  Send a message to begin chatting with Carson              │
│                                                             │
│  [Type your message...]                                     │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Examples

### Example 1: Technique with Auto-Start (Five Whys)

**Workflow Seed**:

```typescript
const step1Config: AskUserChatStepConfig = {
  agentId: coachAgent.id,

  // UI banner - tells user what this step does
  initialMessage: "This step uses the Five Whys technique to drill down to root causes. The agent will ask you 'why' five times to uncover the true problem.",

  // Enables dynamic generation
  generateInitialMessage: true,

  // Template for the initial user message (with variables)
  initialPrompt: `You are Carson, an elite brainstorming facilitator who loves helping people drill down to root causes through the Five Whys technique!

**Session Context:**
Topic: {{parent.session_topic}}
Goals: {{parent.stated_goals}}

**Your Mission:**
Use the Five Whys technique to drill down from the surface problem to the ROOT CAUSE. This takes exactly 5 "Why?" questions.

Start with energy: "🔬 Let's solve this mystery! We'll ask WHY five times to find the real culprit. Based on your topic '{{parent.session_topic}}', here's my first question..."

Then ask a SPECIFIC first WHY question (not generic "Why?", but tailored to their topic).`,

  tools: [...]
};
```

**What Happens**:

1. Chat opens
2. Banner shows: "This step uses the Five Whys technique..."
3. Variable resolution: `{{parent.session_topic}}` → "Improving UX design workflow"
4. Resolved prompt saved as user message to thread
5. Agent generates response to that user message
6. User sees:
   - [Banner] About this step
   - [User Message] The entire resolved prompt
   - [Agent Message] Personalized greeting + first question

### Example 2: Open-Ended Session (No Auto-Response)

**Workflow Seed**:

```typescript
const step1Config: AskUserChatStepConfig = {
  agentId: coachAgent.id,

  // UI banner - guides the user
  initialMessage: "Tell me about your brainstorming session. What topic would you like to explore, and what are your goals?",

  // NO generateInitialMessage (defaults to false)
  // NO initialPrompt

  tools: [...]
};
```

**What Happens**:

1. Chat opens
2. Banner shows: "Tell me about your brainstorming session..."
3. Empty state: "Start a conversation"
4. User must type first message
5. Agent responds to user's message

### Example 3: Slash-Command Style Prompt (No Banner)

**Workflow Seed**:

```typescript
const step1Config: AskUserChatStepConfig = {
  agentId: coachAgent.id,

  // NO initialMessage

  // Enable generation
  generateInitialMessage: true,

  // Command-like prompt (like Claude Code slash commands)
  initialPrompt: `/brainstorm

Generate 20 creative ideas for improving: {{parent.session_topic}}

Goals to consider:
{{parent.stated_goals}}

Use the Mind Mapping technique: start with the central concept and branch out into related ideas, sub-ideas, and connections.

Format each idea as:
- **Idea Title**: Description (1-2 sentences)

Be creative, think laterally, and explore unconventional approaches!`,

  tools: [...]
};
```

**What Happens**:

1. Chat opens (no banner)
2. User message appears: "/brainstorm\n\nGenerate 20 creative ideas..."
3. Agent responds with 20 ideas formatted as requested
4. User can continue the conversation

## Backend Implementation

### Step Handler Logic

**File**: `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`

```typescript
// Check if initial message should be generated
if (!userInput && config.generateInitialMessage && config.initialPrompt) {
  // 1. Resolve variables in initialPrompt
  const resolvedPrompt = this.resolvePromptVariables(config.initialPrompt, context);
  // Result: "You are Carson... Topic: Improving UX design workflow..."

  // 2. Get thread resourceId
  const storage = mastra.getStorage();
  const thread = await storage?.getThreadById({ threadId: agentContext.threadId });
  const resourceId = thread?.resourceId || `user-${context.systemVariables.current_user_id}`;

  // 3. Save resolved prompt as USER message
  await storage.saveMessages({
    messages: [
      {
        id: crypto.randomUUID(),
        role: "user", // ✅ This is a user message
        content: resolvedPrompt, // The full resolved template
        threadId: agentContext.threadId,
        resourceId,
        metadata: { type: "initial_prompt" },
      },
    ],
  });

  // 4. Generate AI response to that user message
  const generatedMessage = await agent.generate([{ role: "user", content: resolvedPrompt }], {
    runtimeContext,
    maxSteps: 1,
  });

  // 5. Save AI response as ASSISTANT message
  await storage.saveMessages({
    messages: [
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: generatedMessage.text,
        threadId: agentContext.threadId,
        resourceId,
        metadata: { type: "initial_message", agent_id: config.agentId },
      },
    ],
  });

  // 6. Return (include initialMessage for UI banner)
  return {
    output: {
      agent_context: { threadId: agentContext.threadId },
      initial_message_banner: config.initialMessage, // For banner
      generated_initial_message: generatedMessage.text,
    },
    nextStepNumber: null,
    requiresUserInput: true,
  };
}
```

### Variable Resolution

**Before**:

```
Topic: {{parent.session_topic}}
Goals: {{parent.stated_goals}}
```

**After** (with execution variables):

```
Topic: Improving UX design workflow
Goals: ["Faster iterations", "Better user feedback"]
```

## Frontend Implementation

### Chat Component

**File**: `apps/web/src/components/workflows/steps/ask-user-chat-step.tsx`

```tsx
return (
  <Conversation className="flex-1 overflow-y-auto">
    <ConversationContent>
      {/* Banner for initialMessage (if present) */}
      {stepConfig.initialMessage && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <MessageSquareIcon className="size-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="mb-1 font-medium text-foreground text-sm">About this step</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {stepConfig.initialMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message timeline */}
      {timeline.map((item) => {
        if (item.type === "message") {
          const message = item.data;
          // Both user messages (including initialPrompt) and agent messages render here
          return (
            <Message from={message.role} key={message.id}>
              ...
            </Message>
          );
        }
      })}
    </ConversationContent>
  </Conversation>
);
```

## Database Schema

### mastra.messages Table

**After initial prompt generation**:

| id      | thread_id  | resource_id | role      | content                                    | metadata                                         |
| ------- | ---------- | ----------- | --------- | ------------------------------------------ | ------------------------------------------------ |
| msg-001 | thread-abc | user-123    | user      | "You are Carson... Topic: Improving UX..." | `{"type": "initial_prompt"}`                     |
| msg-002 | thread-abc | user-123    | assistant | "🔬 Let's solve this mystery!..."          | `{"type": "initial_message", "agent_id": "..."}` |

### workflow_executions.variables

```json
{
  "session_topic": "Improving UX design workflow",
  "stated_goals": ["Faster iterations", "Better user feedback"],
  "selected_model": "anthropic/claude-3-5-sonnet-20241022",
  "mastra_thread_id": "thread-abc",
  "initial_message_banner": "This step uses the Five Whys technique...",
  "generated_initial_message": "🔬 Let's solve this mystery!..."
}
```

## Use Cases

### Use Case 1: Guided Technique Workflow

**Scenario**: User executes "Five Whys" from parent workflow  
**Config**: Has both `initialMessage` (banner) and `initialPrompt` (auto-start)  
**Result**: Chat opens with clear guidance and agent immediately starts the technique

### Use Case 2: Open Conversation

**Scenario**: User starts a general brainstorming session  
**Config**: Has `initialMessage` (banner), NO `initialPrompt`  
**Result**: Chat opens with guidance, waits for user to start typing

### Use Case 3: Command-Style Prompt

**Scenario**: Workflow needs to execute a specific command  
**Config**: NO `initialMessage`, has `initialPrompt` (command template)  
**Result**: Chat shows the command as a user message, agent responds with results

### Use Case 4: Fully Manual

**Scenario**: Free-form agent chat  
**Config**: NO `initialMessage`, NO `initialPrompt`  
**Result**: Empty chat, user types first message

## Benefits

### For `initialMessage` (Banner)

✅ Provides context without cluttering chat history  
✅ Always visible at top, even as chat scrolls  
✅ Doesn't consume token budget (not in LLM context)  
✅ Clear separation between "instructions" and "conversation"

### For `initialPrompt` (User Message)

✅ Visible in chat timeline (transparency)  
✅ Part of conversation history (LLM sees it)  
✅ Can be long/detailed (like slash commands)  
✅ Variables resolved dynamically per execution  
✅ Reusable template pattern

## Summary

| Feature         | initialMessage           | initialPrompt                         |
| --------------- | ------------------------ | ------------------------------------- |
| **Type**        | UI banner                | User message                          |
| **Visibility**  | Top of chat              | In timeline                           |
| **AI sees it?** | No                       | Yes                                   |
| **Purpose**     | Guide user               | Start conversation                    |
| **Example**     | "This step helps you..." | "Generate 20 ideas for..."            |
| **Length**      | 1-2 sentences            | Can be very long                      |
| **Variables**   | No                       | Yes ({{parent.var}})                  |
| **Triggers AI** | No                       | Yes (if generateInitialMessage: true) |

**Key Insight**: `initialMessage` is for humans, `initialPrompt` is for the AI (but humans see it too).
