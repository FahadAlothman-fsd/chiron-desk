# Story 1.6: Frontend UI Implementation

**Date:** 2025-11-15  
**Status:** ✅ Complete - Core Components Implemented

---

## Summary

Implemented the frontend UI components for Story 1.6's Tool → Approval Flow. The system now provides a polished, Bloomberg Terminal-inspired interface for users to interact with AI agents, review tool outputs, and provide approval/rejection feedback.

---

## Components Implemented

### 1. **ToolStatusPanel** ✅ NEW

**Location:** `apps/web/src/components/workflows/tool-status-panel.tsx`

**Purpose:** Real-time progress tracking of tool execution in a sidebar panel

**Features:**
- ✅ Progress bar showing X/Y tools approved
- ✅ Tool-by-tool status with icons:
  - ⚪ Not Started (Circle)
  - ⏳ Executing (Loader2 spinning)
  - 🎯 Awaiting Approval (Clock - yellow)
  - ✅ Approved (CheckCircle2 - green)
  - 🚫 Blocked (AlertCircle - orange + prerequisite list)
  - ❌ Rejected (XCircle - red + feedback snippet)
- ✅ Tooltip on hover showing full tool description + prerequisites
- ✅ Badge showing status (Approved, Blocked, Rejected, etc.)
- ✅ Rejection count badge if tool rejected multiple times
- ✅ Shows missing prerequisites for blocked tools
- ✅ Shows last rejection feedback for rejected tools

**Visual Design:**
- Clean card-based layout
- Color-coded status (green/yellow/red/orange)
- Sticky positioning (stays visible while scrolling)
- Hover effects for interactivity

**Data Sources:**
- `tools` - Tool config from step config
- `approvalStates` - Live approval state from execution.variables
- `executionVariables` - For checking prerequisites

---

### 2. **ApprovalCard** ✅ EXISTING (Updated)

**Location:** `apps/web/src/components/workflows/approval-card.tsx`

**Purpose:** Inline approval UI for AI-generated tool outputs

**Features:**
- ✅ Displays generated value (formatted nicely, not raw JSON)
- ✅ Collapsible reasoning section (ChainOfThought)
- ✅ **[✓ Accept]** button → calls `approveToolCall` mutation
- ✅ **[✗ Reject & Explain]** button → shows feedback textarea
- ✅ Feedback validation (requires text before submitting)
- ✅ Loading states during API calls
- ✅ Read-only state after approval/rejection
- ✅ Visual styling with border colors:
  - Green border + green background for approved
  - Red border + red background for rejected
  - Default border for pending

**Updates Made:**
- ✅ Removed `userId` parameter (backend extracts from session)
- ✅ Fixed mutation calls to match backend API

**Mutations Used:**
- `trpc.workflows.approveToolCall` - Saves to MiPRO, resumes workflow
- `trpc.workflows.rejectToolCall` - Updates ACE playbook, regenerates tool

---

### 3. **AskUserChatStepNew** ✅ EXISTING (Enhanced)

**Location:** `apps/web/src/components/workflows/steps/ask-user-chat-step-new.tsx`

**Purpose:** Conversational chat interface with AI agent

**Features:**
- ✅ AI Elements-based chat UI (polished, modern)
- ✅ Message bubbles (user + assistant)
- ✅ Collapsible "thinking" sections (reasoning)
- ✅ Model selector dropdown (Claude, GPT-4, Gemini, Llama, etc.)
- ✅ Real-time message loading (polls every 2s)
- ✅ Loading indicator while agent generates response
- ✅ Approval cards displayed inline after messages
- ✅ **Tool Status Panel** integrated in sidebar
- ✅ Auto-scroll to latest message

**Enhancements Made:**
- ✅ Added `ToolStatusPanel` import
- ✅ Updated interface to include `tools` in stepConfig
- ✅ Restructured layout:
  - Tool Status Panel (left, 320px width, sticky)
  - Chat Area (center, flexible width)
- ✅ Approval states extracted and passed to both components

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│                                                      │
│  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ Tool Status  │  │   Chat Conversation       │   │
│  │   Panel      │  │                            │   │
│  │              │  │   • User message           │   │
│  │ ✅ Summary   │  │   • Agent message          │   │
│  │ 🎯 Complex   │  │   • Approval Card          │   │
│  │ 🚫 Workflow  │  │   • Loading indicator      │   │
│  │              │  │                            │   │
│  │ (sticky)     │  │   ┌─────────────────────┐ │   │
│  │              │  │   │ Input + Model Sel   │ │   │
│  │              │  │   └─────────────────────┘ │   │
│  └──────────────┘  └──────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

### 4. **Backend API - sendChatMessage Mutation** ✅ NEW

**Location:** `packages/api/src/routers/workflows.ts`

**Purpose:** Send user messages to AI agent with model selection support

**Features:**
- ✅ Accepts message text + optional model selection
- ✅ Merges selected model into execution variables
- ✅ Resumes workflow execution with user input
- ✅ Extracts userId from session (no manual passing needed)

**API:**
```typescript
trpc.workflows.sendChatMessage.useMutation({
  executionId: string;
  message: string;
  selectedModel?: string; // e.g., "openrouter:anthropic/claude-3.5-sonnet"
})
```

**Flow:**
1. User types message + selects model (optional)
2. Frontend calls `sendChatMessage`
3. Backend saves `selected_model` to execution.variables
4. Backend resumes workflow with user message
5. Agent processes message, potentially triggers tools
6. Tools save to approval_states
7. Frontend polls and displays approval cards
8. User approves/rejects
9. Workflow resumes or regenerates

---

## Integration Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐         ┌──────────────────────────────────┐  │
│  │ ToolStatusPanel│◀────────│ Polls execution.variables         │  │
│  │                │         │ every 2 seconds                   │  │
│  │ - Not Started  │         │                                    │  │
│  │ - Executing    │         │ Shows: approval_states             │  │
│  │ - Pending      │         │        + execution variables       │  │
│  │ - Approved     │         └──────────────────────────────────┘  │
│  │ - Rejected     │                                                │
│  │ - Blocked      │         ┌──────────────────────────────────┐  │
│  └────────────────┘         │ Chat Messages                      │  │
│                              │                                    │  │
│                              │ - User messages                   │  │
│                              │ - Agent responses                 │  │
│                              │ - Approval cards (inline)         │  │
│                              └──────────────────────────────────┘  │
│                                        │                            │
│                                        ▼                            │
│                              ┌──────────────────────────────────┐  │
│                              │ ApprovalCard                       │  │
│                              │                                    │  │
│                              │ [✓ Accept]  [✗ Reject & Explain] │  │
│                              └──────────────────────────────────┘  │
│                                        │                            │
└────────────────────────────────────────┼────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND API                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  sendChatMessage                                                     │
│  ├─> Merge selected_model into execution.variables                  │
│  ├─> Resume execution with user message                             │
│  └─> Agent.generate() → Tool executes → Approval state saved        │
│                                                                      │
│  approveToolCall                                                     │
│  ├─> Update approval_states[tool].status = "approved"              │
│  ├─> Save to MiPRO training examples                                │
│  └─> Resume workflow → Check completion                             │
│                                                                      │
│  rejectToolCall                                                      │
│  ├─> Update approval_states[tool].status = "rejected"              │
│  ├─> Add feedback to rejection_history                              │
│  ├─> Update ACE playbook with feedback                              │
│  └─> Resume workflow → Agent regenerates tool                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## User Flow Example

### Project Initialization Flow (Story 1.6)

1. **User starts workflow**
   - Opens workflow-init-new
   - Step 3 renders with chat interface
   - Tool Status Panel shows all 5 tools as "Not Started"

2. **User chats with PM Agent**
   - Types: "I'm building a healthcare task management app"
   - Agent responds with clarifying questions
   - Tool Status Panel shows no changes yet

3. **Agent triggers update_summary tool**
   - Tool Status changes to "⏳ Executing"
   - Agent generates project description using Ax + ChainOfThought
   - Approval Card appears in chat with generated summary
   - Tool Status changes to "🎯 Awaiting Approval"

4. **User reviews summary**
   - Clicks collapsible "Reasoning" to see thinking process
   - Decides summary is too technical
   - Clicks "Reject & Explain"
   - Types feedback: "Focus more on user benefits, less on technology"

5. **ACE learns from rejection**
   - Tool Status shows "❌ Rejected" with feedback snippet
   - ACE playbook updated with feedback
   - Agent regenerates summary
   - New Approval Card appears with improved summary
   - Tool Status back to "🎯 Awaiting Approval"

6. **User approves improved summary**
   - Clicks "✓ Accept"
   - Tool Status changes to "✅ Approved"
   - Progress bar updates: 1/5 tools complete
   - Summary value merged into execution.variables.project_description

7. **update_complexity tool auto-triggers**
   - Tool Status shows "⏳ Executing"
   - Uses project_description to classify complexity
   - Approval Card appears with classification: "method"
   - User approves immediately
   - Tool Status: ✅ Approved
   - Progress: 2/5

8. **fetch_workflow_paths tool auto-triggers**
   - Tool Status: ⏳ Executing
   - Queries database for matching paths
   - No approval needed (database-query type)
   - Tool Status: ✅ Approved
   - Progress: 3/5

9. **select_workflow_path still blocked**
   - Tool Status: 🚫 Blocked
   - Tooltip shows: "Waiting for: available workflow paths"
   - (This is the prerequisite enforcement working!)

10. **Workflow continues...**
    - All tools complete
    - Progress: 5/5
    - Step 3 completes, moves to Step 4 (execute-action)

---

## Styling & Design

### Color Palette (Status Indicators)

```typescript
const statusColors = {
  not_started: "gray",      // Circle icon (muted)
  executing: "blue",        // Loader2 spinning
  awaiting_approval: "yellow",  // Clock icon
  approved: "green",        // CheckCircle2
  rejected: "red",          // XCircle
  blocked: "orange",        // AlertCircle
};
```

### Component Hierarchy

```
AskUserChatStepNew
├── ToolStatusPanel (sidebar, sticky)
│   ├── Card
│   │   ├── CardHeader
│   │   │   ├── Title + Progress count
│   │   │   └── Progress bar
│   │   └── CardContent
│   │       └── Tool items (map)
│   │           ├── Status icon
│   │           ├── Tool name + badges
│   │           ├── Description
│   │           ├── Blocked message (if applicable)
│   │           └── Rejection feedback (if applicable)
│   └── Tooltip (on hover)
│
└── Chat Area (main content)
    ├── Conversation
    │   ├── ConversationContent
    │   │   ├── Messages (map)
    │   │   │   ├── User message
    │   │   │   └── Agent message
    │   │   │       ├── Reasoning (collapsible)
    │   │   │       └── Response text
    │   │   │
    │   │   ├── ApprovalCards (map over pending approvals)
    │   │   │   ├── Card
    │   │   │   │   ├── CardHeader (tool name + status badge)
    │   │   │   │   ├── CardContent
    │   │   │   │   │   ├── Generated value (formatted)
    │   │   │   │   │   ├── Reasoning (collapsible)
    │   │   │   │   │   └── Feedback input (if rejecting)
    │   │   │   │   └── CardFooter
    │   │   │   │       ├── Accept button
    │   │   │   │       └── Reject button
    │   │   │
    │   │   └── Loading indicator (if streaming)
    │   │
    │   └── ConversationScrollButton (auto-scroll)
    │
    └── PromptInput
        ├── PromptInputBody
        │   └── PromptInputTextarea
        └── PromptInputFooter
            ├── PromptInputTools
            │   ├── ModelSelector (dropdown)
            │   └── Agent info (Athena + Sparkles icon)
            └── PromptInputSubmit (Send button)
```

---

## Files Modified

### Frontend
1. `apps/web/src/components/workflows/tool-status-panel.tsx` ✅ NEW
   - Tool progress tracking panel with status indicators
   - 262 lines

2. `apps/web/src/components/workflows/approval-card.tsx` ✅ UPDATED
   - Removed userId parameter from mutations
   - Fixed API calls to match backend

3. `apps/web/src/components/workflows/steps/ask-user-chat-step-new.tsx` ✅ UPDATED
   - Added ToolStatusPanel import
   - Updated stepConfig interface to include tools
   - Restructured layout (sidebar + chat)
   - Integrated tool status tracking

### Backend
4. `packages/api/src/routers/workflows.ts` ✅ UPDATED
   - Added `sendChatMessage` mutation (lines 83-102)
   - Supports model selection via execution variables

---

## Testing Checklist

### Manual Testing (TODO)

- [ ] **Tool Status Panel:**
  - [ ] Progress bar updates as tools complete
  - [ ] Status icons change correctly (⚪ → ⏳ → 🎯 → ✅)
  - [ ] Blocked tools show missing prerequisites
  - [ ] Rejected tools show feedback snippet
  - [ ] Rejection count badge appears after multiple rejections
  - [ ] Tooltips show full tool descriptions
  - [ ] Panel sticky positioning works on scroll

- [ ] **Approval Cards:**
  - [ ] Generated values display formatted (not raw JSON)
  - [ ] Reasoning section is collapsible
  - [ ] Accept button approves and resumes workflow
  - [ ] Reject button shows feedback input
  - [ ] Feedback validation prevents empty submissions
  - [ ] Loading states show during API calls
  - [ ] Border colors update (green=approved, red=rejected)
  - [ ] Read-only state after approval/rejection

- [ ] **Chat Interface:**
  - [ ] Messages display correctly (user + agent)
  - [ ] Thinking sections collapsible
  - [ ] Model selector changes model
  - [ ] Selected model saved to execution variables
  - [ ] Real-time polling updates messages (2s interval)
  - [ ] Loading indicator while agent generates
  - [ ] Auto-scroll to latest message

- [ ] **End-to-End Flow:**
  - [ ] Start workflow → Tool Status shows "Not Started"
  - [ ] Send message → Agent responds
  - [ ] Agent triggers tool → Status changes to "Executing"
  - [ ] Tool completes → Approval card appears
  - [ ] User rejects → ACE learns → Agent regenerates
  - [ ] User approves → Progress updates → Workflow continues
  - [ ] All tools approved → Step completes

### Integration Testing (TODO)

- [ ] Test with real LLM (Anthropic API key configured)
- [ ] Test with all 5 tools in workflow-init-new
- [ ] Test prerequisite blocking (update_complexity before update_summary)
- [ ] Test rejection → regeneration loop
- [ ] Test approval → MiPRO collection
- [ ] Test model switching (Claude → GPT-4 → Gemini)

---

## Next Steps

### Immediate Priorities

1. **Special Tool Handling** (Not Yet Implemented)
   - [ ] `select_workflow_path` - Custom UI with path cards
   - [ ] `generate_project_name` - Radio buttons + custom name input
   - [ ] These need custom approval card variants

2. **Regeneration UI** (Not Yet Implemented)
   - [ ] Show "Regenerating..." indicator when tool rejected
   - [ ] Show comparison: "Previous attempt" vs "New attempt"
   - [ ] Allow user to compare versions before approving

3. **Error Handling** (Partial)
   - [ ] Show error messages when tool execution fails
   - [ ] Show error messages when mutations fail
   - [ ] Retry button for failed tools
   - [ ] Clear error states

4. **Performance Optimization** (Future)
   - [ ] Debounce polling if no changes detected
   - [ ] Cache approval states locally
   - [ ] Optimize re-renders in chat area

5. **Accessibility** (Future)
   - [ ] Keyboard navigation for approval cards
   - [ ] Screen reader announcements for status changes
   - [ ] ARIA labels for status icons
   - [ ] Focus management after approvals

---

## Technical Debt & Considerations

### Known Issues

1. **Polling Interval:** Currently polls every 2 seconds
   - Consider using tRPC subscriptions for real-time updates
   - More efficient than polling, but more complex to set up

2. **Model Selection Storage:** Stored in execution.variables
   - Should this be per-step or per-execution?
   - Currently applies to all subsequent tool calls

3. **Approval Card Variants:** All tools use same approval card
   - `select_workflow_path` needs custom path card UI
   - `generate_project_name` needs radio + custom input UI
   - Consider creating specialized approval card components

4. **Scroll Position:** Auto-scroll might be jarring
   - Consider only scrolling on new messages, not on polling updates
   - Add "Jump to bottom" button if user scrolls up

5. **Tooltip Performance:** Tooltips re-render on every poll
   - Consider memoization or debouncing

---

## Dependencies

### UI Libraries (Already Installed)
- `@radix-ui/react-tooltip` - Tooltips
- `@radix-ui/react-collapsible` - Collapsible reasoning sections
- `lucide-react` - Icons (CheckCircle2, Clock, AlertCircle, etc.)
- `sonner` - Toast notifications

### AI Elements (Custom Components)
- `Conversation` - Chat container
- `Message` - Message bubble
- `PromptInput` - Input area with model selector
- `ModelSelector` - Dropdown for AI model selection
- `Reasoning` - Collapsible thinking section

### tRPC Queries & Mutations
- `workflows.getChatMessages` - Load message history
- `workflows.getExecution` - Load execution state + approval states
- `workflows.sendChatMessage` - Send user message
- `workflows.approveToolCall` - Approve tool output
- `workflows.rejectToolCall` - Reject with feedback

---

## Success Metrics

### User Experience
- ✅ Users can see tool progress at a glance
- ✅ Users can approve/reject AI outputs with feedback
- ✅ Users can switch AI models mid-conversation
- ✅ Users can collapse/expand reasoning sections
- ✅ Users see real-time updates (via polling)

### Developer Experience
- ✅ Components are reusable (ApprovalCard, ToolStatusPanel)
- ✅ TypeScript type safety enforced
- ✅ Clear separation of concerns (UI, API, state management)
- ✅ Follows shadcn/ui design patterns

### System Performance
- ⏳ Frontend build succeeds without errors
- ⏳ Real-time updates via polling (2s interval)
- ⏳ API calls complete < 200ms (approval gates)
- ⏳ Tool generation < 10s (AI processing)

---

## Conclusion

The frontend UI for Story 1.6 is **functionally complete** for the core approval flow. Users can now:
- See tool execution progress in a visual sidebar
- Approve or reject AI-generated content with feedback
- Experience a polished Bloomberg Terminal-inspired interface
- Switch AI models mid-conversation
- View reasoning behind AI decisions

**What's Ready:**
- ✅ ToolStatusPanel component
- ✅ ApprovalCard component
- ✅ Chat interface with model selection
- ✅ Backend mutations for approval/rejection
- ✅ Real-time polling for updates

**What's Missing:**
- ⏳ Custom UI for select_workflow_path (path cards)
- ⏳ Custom UI for generate_project_name (radio + custom input)
- ⏳ Regeneration comparison UI
- ⏳ Real-time subscriptions (replacing polling)
- ⏳ Comprehensive error handling

**Estimated Remaining Effort:** 1-2 days for custom tool UIs + polish

**Blocker:** None - core functionality is ready for testing with real workflows
