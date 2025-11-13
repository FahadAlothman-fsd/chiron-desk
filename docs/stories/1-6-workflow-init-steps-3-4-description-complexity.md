# Story 1.6: Conversational Project Initialization with AI-Powered Approval Gates

**Epic:** Epic 1 - Foundation + Workflow-Init Engine  
**Status:** drafted  
**Estimated Effort:** 5 days  
**Assignee:** Dev Agent  
**Dependencies:** Story 1.5 (Workflow-Init Steps 1-2 Foundation)

---

## User Story

As a **developer building Chiron's AI-powered workflow system**,  
I want **to implement a conversational chat interface where the PM Agent guides users through project initialization, generates summaries and classifications using Ax signatures, and learns from user feedback via ACE optimizer**,  
So that **users experience a natural, intelligent project setup flow with human-in-the-loop approval gates, and the system continuously improves from user feedback - validating the core thesis of AI-assisted workflow orchestration**.

---

## Context

🎯 **THIS IS THE THESIS VALIDATION STORY!** 🎯

Story 1.6 implements the **conversational workflow pattern** that forms the foundation of Chiron's AI-powered project methodology. This is the first real-world validation of the thesis: **AI agents can orchestrate complex workflows with human approval gates, learning from feedback to improve over time**.

### **What We're Building**

A **single conversational step (Step 3)** in workflow-init-new where:
1. **PM Agent chats naturally** with user about their project
2. **Agent triggers tools** when ready (not separate workflow steps):
   - `update_summary` → Generates project description (Ax + ChainOfThought)
   - `update_complexity` → Classifies complexity (Ax + ChainOfThought)
   - `fetch_workflow_paths` → Queries database for matching paths
   - `select_workflow_path` → Presents path cards for user selection
   - `generate_project_name` → Suggests project names (Ax + Predict)
3. **User approves/rejects** each AI-generated output
4. **ACE optimizer learns** from rejections (online learning)
5. **MiPRO collects data** from approvals (future offline optimization)

### **Architectural Innovation**

**This story introduces THREE revolutionary patterns:**

1. **Dynamic Tool Configuration** - Tools built from JSONB config at runtime
   - Ax signatures defined in step config (not hardcoded)
   - Agent instructions loaded from database
   - Tool prerequisites validate required variables
   - Database queries configured via filters

2. **Approval Gate Pattern** - Human-in-the-loop AI validation
   - Tools suspend execution for user approval
   - Rejections trigger ACE optimizer updates
   - Approvals save to MiPRO training examples
   - Workflow pauses/resumes seamlessly

3. **Agent Memory Integration** - Mastra threads persist conversation
   - Conversation history stored in `mastra.mastra_messages`
   - Thread ID saved in workflow variables
   - Agent accesses history via Mastra SDK
   - Context flows from chat → tools → Ax generators

### **Why This Matters for the Thesis**

This story validates the hypothesis that:
- ✅ **AI can orchestrate workflows** intelligently (PM Agent decides when to trigger tools)
- ✅ **Human approval gates work** (users validate AI outputs before proceeding)
- ✅ **Systems can learn from feedback** (ACE optimizer improves classifications)
- ✅ **Configuration beats code** (entire flow driven by JSONB step config)
- ✅ **Conversation is superior to forms** (natural Q&A vs rigid form fields)

### **Technical Architecture**

```
User Message → PM Agent (Mastra) → Tool Triggered → Ax Generator → Approval Gate
                  ↓                      ↓                ↓              ↓
            Instructions         Build Signature    Generate        User Decision
            from DB              from Config        with CoT        
                  ↓                      ↓                ↓              ↓
            ACE Playbook         Resolve Inputs     Filter Internal  Approve/Reject
            Injected             from Variables     Fields
                                                                        ↓
                                                           ┌────────────┴────────────┐
                                                           ↓                         ↓
                                                    APPROVE (save)             REJECT (learn)
                                                           ↓                         ↓
                                            MiPRO Training Examples         ACE Playbook Update
                                            workflow_executions.variables   ace_playbooks.playbook
```

### **Story Deliverables**

**1. New Step Type: `ask-user-chat`**
- Conversational interface with AI agent
- Dynamic tool building from config
- Mastra thread management
- Completion condition checking

**2. Three Tool Types:**
- `ax-generation` - AI-powered content generation with Ax signatures
- `database-query` - Configurable DB queries with filter support
- `custom` - Special-purpose tools (path selection UI)

**3. Mastra + Ax Integration:**
- Mastra agent initialization from DB config
- Ax signature building from JSONB config
- ACE playbook loading and injection
- Tool prerequisite validation

**4. Approval Gate System:**
- Suspend/resume workflow on approval requests
- Collect rejection feedback
- Update ACE playbooks (online learning)
- Save approved outputs to MiPRO training

**5. Five Tools for Step 3:**
- `update_summary` - Generate project description
- `update_complexity` - Classify project complexity  
- `fetch_workflow_paths` - Query paths from database
- `select_workflow_path` - Present path cards
- `generate_project_name` - Suggest project names

**6. Database Schema:**
- `AskUserChatStepConfig` TypeScript type
- ACE playbooks table
- MiPRO training examples table
- Anthropic API key configuration

**7. UI Components:**
- `AskUserChatStep` - Chat interface with message bubbles
- Approval card component (inline, not modal)
- Path selection cards (rendered in chat)
- Project name selection UI

### **Future Workflow Simplification**

After Story 1.6 completes, `workflow-init-new` will be refactored to:
- **Step 1:** `ask-user-chat` (all 5 tools, complete initialization)
- **Step 2:** `execute-action` (create project directory, git init, DB insert)
- **Step 3:** `display-output` (success message)

Current implementation keeps Steps 1-2 from Story 1.5, adds Step 3 (chat), to be refactored in Story 1.7.

### **Key Requirements**

- **FR002:** Execute workflows following BMAD workflow.xml engine rules (Mastra tools with approval gates)
- **FR004:** 4-level variable resolution (system, execution, step outputs, defaults)
- **FR005:** Maintain workflow state and enable resume (Mastra threads, approval states)
- **FR006:** AI-powered workflow assistance with learning (ACE optimizer, MiPRO collection)
- **User Journey 1:** First-Time Setup - Conversational project initialization
- **NFR001:** Performance - Tool generation < 10 seconds, approval gate response < 200ms

[Source: docs/architecture/STORY-1-6-ARCHITECTURE-SUMMARY.md - Mastra + Ax architecture]  
[Source: docs/research/spike-ax-mastra-approval-gates.md - Approval gate pattern]  
[Source: docs/research/ax-deep-dive-ace-gepa.md - ACE optimizer strategy]  
[Source: docs/epics/epic-1-foundation.md - Story 1.6 specification]  
[Source: docs/PRD.md - User Journey 1, FR002, FR004, FR005, FR006, NFR001]

---

## New Dependencies

### **Mastra Framework (@mastra/*)**

**1. @mastra/core** - Main Mastra AI agent framework
- **What:** TypeScript framework for building AI agents with tools, memory, and workflows
- **Why:** Provides agent orchestration, tool calling, conversation management, and human-in-the-loop patterns
- **Used For:** Creating PM Agent, managing chat threads, handling tool suspension/resume
- **Key Features:** Agent abstraction, tool registration, memory integration, streaming responses

**2. @mastra/pg** - PostgreSQL storage adapter for Mastra
- **What:** PostgreSQL backend for Mastra's storage layer
- **Why:** Persists conversation threads, messages, working memory, and scorer results
- **Used For:** Storing chat history in `mastra.mastra_messages` table, thread metadata
- **Key Features:** Automatic schema creation, thread management, message persistence

**3. @mastra/memory** - Memory management system
- **What:** Conversation history and semantic recall capabilities
- **Why:** Enables agents to remember past interactions and retrieve relevant context
- **Used For:** Loading conversation history into Ax tool inputs, persistent user context
- **Key Features:** Thread-based memory, semantic search, working memory across sessions

**4. @mastra/evals** - Agent evaluation and scoring
- **What:** Quality scoring system for agent outputs
- **Why:** Evaluate generated summaries and classifications for quality metrics
- **Used For:** Scoring approved outputs before saving to MiPRO training examples
- **Key Features:** Answer relevancy scoring, completeness scoring, custom metrics

### **Ax Framework (@ax-llm/ax)**

**5. @ax-llm/ax** - TypeScript port of DSPy with optimizers
- **What:** Declarative LLM programming framework with prompt optimization
- **Why:** Structured outputs with signatures, ChainOfThought reasoning, optimizer support (ACE/MiPRO)
- **Used For:** Building Ax signatures from config, generating summaries/classifications with reasoning
- **Key Features:** 
  - Signature-based prompting (inputs → outputs)
  - ChainOfThought strategy (shows reasoning)
  - Predict strategy (direct output)
  - ACE optimizer (online learning)
  - MiPRO optimizer (offline optimization - Phase 2)
  - Type-safe structured outputs

### **AI SDK (@ai-sdk/*)**

**6. @ai-sdk/anthropic** - Anthropic API integration for AI SDK
- **What:** Anthropic provider for Vercel AI SDK (Claude models)
- **Why:** Access Claude models (claude-3-5-sonnet, claude-opus-4) as alternative to OpenRouter
- **Used For:** LLM calls via Mastra/Ax using Anthropic API
- **Key Features:** Streaming, tool calling, structured outputs, multi-modal support

### **Package Installation Command**

```bash
# Install all new dependencies at once
bun add @mastra/core @mastra/pg @mastra/memory @mastra/evals @ax-llm/ax @ai-sdk/anthropic

# Optional: Add encryption library for API key storage
bun add @node-rs/argon2
```

**Note:** See [AI Elements Components](#ai-elements-components-ai-elements-registry) section below for chat UI component installation via shadcn CLI.

### **Why These Packages?**

| Package | Replaces/Enables | Alternative Considered |
|---------|------------------|------------------------|
| **Mastra** | Custom agent orchestration | LangChain (too complex, JS-focused) |
| **Ax** | Manual prompt engineering | DSPy Python (not TypeScript) |
| **@ai-sdk/anthropic** | OpenRouter only | Direct Anthropic SDK (less integrated) |
| **@mastra/pg** | Custom conversation storage | Redis (no persistent history) |

**Decision Rationale:**
- **Mastra** chosen for native TypeScript, great DX, human-in-the-loop support (suspend/resume)
- **Ax** chosen for DSPy-like signatures in TypeScript with ACE/MiPRO optimizers
- **Anthropic SDK** chosen for direct API access, cost optimization vs OpenRouter markup

[Source: docs/research/framework-decision-matrix.md - Mastra + Ax evaluation]  
[Source: docs/architecture/architecture-decisions.md - ADR #7: Mastra + Ax Stack]

---

## AI Elements Components (@ai-elements Registry)

### **Using AI SDK Registry for Chat UI**

The `@ai-elements` registry provides production-ready chat UI components optimized for AI conversations. These components are already configured in `components.json` and can be added using shadcn CLI.

**Registry URL:** `https://registry.ai-sdk.dev/{name}.json`

### **Components to Add**

**1. `@ai-elements/prompt-input`** - ChatGPT-style message input
- **What:** Auto-resizing textarea with send button, keyboard shortcuts (Cmd+Enter)
- **Why:** Professional chat input experience with proper UX patterns
- **Used For:** User message input at bottom of chat interface
- **Key Features:** Auto-resize, character count, loading states, disabled state

**2. `@ai-elements/message`** - AI message formatting component
- **What:** Message bubble with role-based styling (user/assistant/system)
- **Why:** Consistent message rendering with markdown support, code highlighting
- **Used For:** Rendering agent and user messages in chat history
- **Key Features:** Markdown rendering, syntax highlighting, timestamp display, avatar support

**3. `@ai-elements/message-list`** - Chat conversation container
- **What:** Scrollable message container with auto-scroll and virtualization
- **Why:** Performance with long conversations, proper scroll behavior
- **Used For:** Main chat message area
- **Key Features:** Auto-scroll to bottom, scroll-lock on user scroll, virtualization for performance

**4. `@ai-elements/thinking-indicator`** - Agent typing indicator
- **What:** Animated "AI is thinking..." indicator with pulse effect
- **Why:** Visual feedback during agent processing
- **Used For:** Showing agent is generating response
- **Key Features:** Smooth animation, customizable text, role indicator

**5. `@ai-elements/chat-container`** - Complete chat layout wrapper
- **What:** Layout component combining message list + input with proper spacing
- **Why:** Handles responsive layout, sticky input, proper overflow
- **Used For:** Overall chat interface structure
- **Key Features:** Responsive design, sticky footer, proper overflow handling

### **Installation Command**

```bash
# Add AI Elements chat components via shadcn CLI (using bun)
bun x shadcn@latest add prompt-input message message-list thinking-indicator chat-container -r @ai-elements

# Components will be installed to:
# apps/web/src/components/ui/prompt-input.tsx
# apps/web/src/components/ui/message.tsx
# apps/web/src/components/ui/message-list.tsx
# apps/web/src/components/ui/thinking-indicator.tsx
# apps/web/src/components/ui/chat-container.tsx
```

### **Integration with Story 1.6**

**Task 8 (Frontend Chat Interface)** will use these components:

```tsx
// apps/web/src/components/workflows/steps/ask-user-chat-step.tsx
import { ChatContainer } from "@/components/ui/chat-container";
import { MessageList } from "@/components/ui/message-list";
import { Message } from "@/components/ui/message";
import { PromptInput } from "@/components/ui/prompt-input";
import { ThinkingIndicator } from "@/components/ui/thinking-indicator";

export function AskUserChatStep({ execution }) {
  return (
    <ChatContainer>
      <MessageList>
        {messages.map(msg => (
          <Message 
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}
        {isThinking && <ThinkingIndicator text="PM Agent is thinking..." />}
      </MessageList>
      
      <PromptInput
        onSubmit={handleSendMessage}
        placeholder="Tell me about your project..."
        disabled={isThinking}
      />
    </ChatContainer>
  );
}
```

### **Why AI Elements vs Custom Components?**

| Aspect | AI Elements | Custom Build |
|--------|-------------|--------------|
| **Development Time** | Minutes (CLI install) | Hours (build from scratch) |
| **UX Patterns** | Battle-tested AI chat patterns | Need to research best practices |
| **Accessibility** | WCAG 2.1 AA compliant | Need to implement manually |
| **Markdown Support** | Built-in with syntax highlighting | Need to add remark/rehype |
| **Performance** | Optimized (virtualization) | Need to optimize manually |
| **Maintenance** | Registry updates | We maintain everything |

**Decision:** Use AI Elements for chat foundation, customize approval cards as needed.

---

## UI Wireframes

### **1. Chat Interface Layout**

```
┌─────────────────────────────────────────────────────────────┬──────────────────┐
│  Step 3 of 10: Project Initialization                       │ Workflow Progress│
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 30% complete              │                  │
├─────────────────────────────────────────────────────────────┤ ✅ Step 1        │
│                    CHAT MESSAGES AREA                        │    Field Type    │
│                  (AI Elements: MessageList)                  │                  │
│  ┌────────────────────────────────────────────────────┐    │ ✅ Step 2        │
│  │ 🤖 PM Agent                                   10:30 │    │    Directory     │
│  │ Hi fahad! Let's get your project set up. Tell me   │    │                  │
│  │ about what you're building - what's the goal?      │    │ ⏳ Step 3        │
│  └────────────────────────────────────────────────────┘    │    Chat Init     │
│            (AI Elements: Message role="assistant")          │                  │
│            ┌────────────────────────────────────────┐       │ Status:          │
│            │ 👤 You                            10:31│       │ ⬜ Description   │
│            │ I'm building a healthcare task         │       │ ⬜ Complexity    │
│            │ management app for nurses...           │       │ ⬜ Path          │
│            └────────────────────────────────────────┘       │ ⬜ Name          │
│            (AI Elements: Message role="user")               │                  │
│  ┌────────────────────────────────────────────────────┐    │                  │
│  │ 🤖 PM Agent                                   10:31 │    │                  │
│  │ Great! Healthcare task management. Tell me about:  │    │                  │
│  │ 1. How many users?                                 │    │                  │
│  │ 2. HIPAA compliance needed?                        │    │                  │
│  │ 3. Web or mobile?                                  │    │                  │
│  └────────────────────────────────────────────────────┘    │                  │
│                                                              │                  │
├──────────────────────────────────────────────────────────────┤                  │
│  Type your message...                                [Send] │                  │
│            (AI Elements: PromptInput)                        │                  │
└─────────────────────────────────────────────────────────────┴──────────────────┘
```

**Implementation Details:**
- **Overall Layout:** `ChatContainer` from AI Elements (handles responsive + sticky input)
- **Message Area:** `MessageList` component (auto-scroll, virtualization, scroll-lock)
- **Agent Messages:** `Message` component with `role="assistant"` (left-aligned, gray)
- **User Messages:** `Message` component with `role="user"` (right-aligned, blue #3B82F6)
- **Input Field:** `PromptInput` component (auto-resize, Cmd+Enter shortcut, disabled states)
- **Right Sidebar:** Custom progress tracker (not from AI Elements)

**Key Features from AI Elements:**
- Markdown rendering with syntax highlighting in messages
- Auto-scroll to bottom on new messages (with scroll-lock if user scrolled up)
- Character count and loading states in PromptInput
- Keyboard shortcuts (Cmd+Enter to send)
- Accessibility (WCAG 2.1 AA compliant)

---

### **2. Approval Card - Project Summary (Inline in Chat)**

```
┌────────────────────────────────────────────────────┐
│ 🤖 PM Agent                              10:32     │
│ Here's my understanding of your project:          │
│                                                    │
│ ╔══════════════════════════════════════════════╗ │
│ ║ 📝 Project Description                       ║ │
│ ╠══════════════════════════════════════════════╣ │
│ ║                                               ║ │
│ ║ A HIPAA-compliant healthcare task management ║ │
│ ║ system for 5 hospitals (~250 nurses total).  ║ │
│ ║ Core features include task assignment,       ║ │
│ ║ scheduling, shift management, and patient    ║ │
│ ║ handoffs. Requires compliance tracking.      ║ │
│ ║                                               ║ │
│ ║ ─────────────────────────────────────────    ║ │
│ ║                                               ║ │
│ ║ 🤔 Why this summary? (click to expand)       ║ │
│ ║ <details>                                     ║ │
│ ║   • Multi-tenant: 5 hospitals mentioned      ║ │
│ ║   • Compliance: HIPAA requirement            ║ │
│ ║   • Moderate scale: ~250 users               ║ │
│ ║   • Timeline: 3-4 months suggests method     ║ │
│ ║ </details>                                    ║ │
│ ║                                               ║ │
│ ╚══════════════════════════════════════════════╝ │
│                                                    │
│ [✓ Accept]  [✗ Reject & Explain]                 │
└────────────────────────────────────────────────────┘
```

**Design Specs:**
- Inline card (NOT modal overlay - stays in chat history)
- Border: Subtle gray (#E5E7EB)
- Reasoning: Collapsible `<details>` tag
- Buttons: Accept (green #10B981), Reject (red #EF4444)
- After approval: Card becomes read-only with ✅ checkmark

---

### **3. Rejection Flow - Feedback Input**

```
┌────────────────────────────────────────────────────┐
│ 🤖 PM Agent                              10:33     │
│                                                     │
│ ╔══════════════════════════════════════════════╗  │
│ ║ ✗ What should I improve?                     ║  │
│ ╠══════════════════════════════════════════════╣  │
│ ║                                               ║  │
│ ║ ┌──────────────────────────────────────────┐ ║  │
│ ║ │ You missed the scheduling functionality - │ ║  │
│ ║ │ that's critical for nurse shifts          │ ║  │
│ ║ │                                            │ ║  │
│ ║ │ [Cursor here - user typing feedback]      │ ║  │
│ ║ └──────────────────────────────────────────┘ ║  │
│ ║                                               ║  │
│ ║ Your feedback helps the AI learn! 🎓          ║  │
│ ║                                               ║  │
│ ║ [Cancel]                  [Submit Feedback]  ║  │
│ ╚══════════════════════════════════════════════╝  │
└────────────────────────────────────────────────────┘
```

**Interaction:**
1. User clicks "Reject & Explain"
2. Textarea appears for feedback (3-5 rows)
3. User types feedback
4. Submit → ACE optimizer updates → Agent regenerates
5. New approval card appears with improved output

---

### **4. Complexity Classification with Reasoning**

```
┌────────────────────────────────────────────────────┐
│ 🤖 PM Agent                              10:36     │
│                                                     │
│ ╔══════════════════════════════════════════════╗  │
│ ║ 🎯 Complexity: METHOD (Moderate)             ║  │
│ ╠══════════════════════════════════════════════╣  │
│ ║                                               ║  │
│ ║ Why METHOD vs QUICK-FLOW or ENTERPRISE?      ║  │
│ ║                                               ║  │
│ ║ ✓ Multi-tenant architecture needed           ║  │
│ ║   (5 hospitals = separate data isolation)    ║  │
│ ║                                               ║  │
│ ║ ✓ HIPAA compliance = security architecture   ║  │
│ ║   (encryption, audit logs, access control)   ║  │
│ ║                                               ║  │
│ ║ ✓ ~250 users = moderate scale                ║  │
│ ║   (not enterprise 1000+, not quick <50)      ║  │
│ ║                                               ║  │
│ ║ ✓ 3-4 month timeline fits method track       ║  │
│ ║                                               ║  │
│ ║ ─────────────────────────────────────────    ║  │
│ ║                                               ║  │
│ ║ Recommended Track: METHOD                     ║  │
│ ║ • Structured planning with architecture docs │  │
│ ║ • Technical specification for each epic      │  │
│ ║ • Security & compliance review checkpoints   ║  │
│ ║                                               ║  │
│ ╚══════════════════════════════════════════════╝  │
│                                                     │
│ [✓ Accept]        [✗ Reject & Explain]            │
└────────────────────────────────────────────────────┘
```

**Visual Indicators:**
- Icon: 🚀 Quick-Flow (blue), ⚖️ Method (orange), 🏢 Enterprise (purple)
- Reasoning: Bullet points with checkmarks
- Recommended track: Highlighted section at bottom

---

### **5. Workflow Path Selection (Cards in Chat)**

```
┌────────────────────────────────────────────────────┐
│ 🤖 PM Agent                              10:37     │
│ Based on METHOD complexity, here are your options: │
│                                                     │
│ ╔══════════════════════════════════════════════╗  │
│ ║ ⚖️ Method (Greenfield)              ⭐ [●]   ║  │
│ ║ Structured planning with architecture docs   ║  │
│ ║                                               ║  │
│ ║ Best for your project because:               ║  │
│ ║ • Multi-tenant needs architecture planning   ║  │
│ ║ • HIPAA = security design required           ║  │
│ ║ • 3-4 month timeline matches this approach   ║  │
│ ║                                               ║  │
│ ║ What you'll get:                              ║  │
│ ║ • Product brief with requirements            ║  │
│ ║ • Architecture documentation                  ║  │
│ ║ • Epic breakdown with tech specs              ║  │
│ ║ • Implementation stories                      ║  │
│ ╚══════════════════════════════════════════════╝  │
│                                                     │
│ ╔══════════════════════════════════════════════╗  │
│ ║ 🚀 Quick Flow (Greenfield)            [○]    ║  │
│ ║ Rapid prototyping with minimal docs          ║  │
│ ║                                               ║  │
│ ║ May be too simple because:                   ║  │
│ ║ ⚠ Doesn't include architecture phase         ║  │
│ ║ ⚠ Limited for multi-tenant complexity        ║  │
│ ╚══════════════════════════════════════════════╝  │
│                                                     │
│ [Continue with Method Path]                        │
└────────────────────────────────────────────────────┘
```

**Card Design:**
- Recommended path: Gold star ⭐, pre-selected radio [●]
- Alternative paths: Empty radio [○], warning icon ⚠ if not ideal
- Click anywhere on card to select
- Button appears after selection

---

### **5.5. Agent Thinking Indicator**

```
┌────────────────────────────────────────────────────┐
│  🤖 PM Agent                              10:37     │
│  Let me generate some workflow path options...     │
│                                                     │
│  ╔══════════════════════════════════════════════╗  │
│  ║ 💭 AI is thinking...                         ║  │
│  ║                                               ║  │
│  ║    ● ● ●  (animated pulse)                   ║  │
│  ║                                               ║  │
│  ║ Analyzing project requirements...             ║  │
│  ╚══════════════════════════════════════════════╝  │
└────────────────────────────────────────────────────┘
```

**Implementation:**
- **Component:** `ThinkingIndicator` from AI Elements
- **When Shown:** During tool execution (update_summary, update_complexity, generate_project_name)
- **Animation:** Smooth pulse effect on dots (CSS animation included)
- **Text:** Customizable status message (e.g., "Generating project summary...", "Classifying complexity...")
- **Styling:** Gray background, subtle shadow, matches agent message style

**State Management:**
```tsx
const [isThinking, setIsThinking] = useState(false);
const [thinkingMessage, setThinkingMessage] = useState("");

// When tool triggers
setIsThinking(true);
setThinkingMessage("Generating project summary...");

// When response arrives
setIsThinking(false);
```

---

### **6. Project Name Suggestions**

```
┌────────────────────────────────────────────────────┐
│ 🤖 PM Agent                              10:38     │
│ Let's pick a name for your project! Here are some │
│ suggestions based on your description:             │
│                                                     │
│ ╔══════════════════════════════════════════════╗  │
│ ║ 📝 Project Name Suggestions                  ║  │
│ ╠══════════════════════════════════════════════╣  │
│ ║                                               ║  │
│ ║ [○] healthcare-task-hub                      ║  │
│ ║     Short, clear, domain-focused              ║  │
│ ║                                               ║  │
│ ║ [●] nurse-shift-manager                      ║  │
│ ║     Emphasizes core use case (scheduling)     ║  │
│ ║                                               ║  │
│ ║ [○] medical-workflow-system                  ║  │
│ ║     Broader scope, extensible naming          ║  │
│ ║                                               ║  │
│ ║ [○] hospital-task-coordinator                ║  │
│ ║     Multi-facility focus                      ║  │
│ ║                                               ║  │
│ ║ ─────────────────────────────────────────    ║  │
│ ║                                               ║  │
│ ║ [○] Use custom name instead                  ║  │
│ ║     ┌────────────────────────────────────┐   ║  │
│ ║     │ my-custom-project-name             │   ║  │
│ ║     └────────────────────────────────────┘   ║  │
│ ║     Must be kebab-case, 3-50 characters      ║  │
│ ║                                               ║  │
│ ╚══════════════════════════════════════════════╝  │
│                                                     │
│ [✓ Accept Selected Name]                          │
└────────────────────────────────────────────────────┘
```

**Validation:**
- Real-time validation for custom name
- Pattern: `^[a-z0-9-]+$` (lowercase, numbers, hyphens only)
- Length: 3-50 characters
- Error messages: Red text below input if invalid

---

### **7. Progress Sidebar (Detailed View)**

```
┌───────────────────┐
│ Workflow Progress │
├───────────────────┤
│ Step 3 of 10      │
│ Chat Init         │
│                   │
│ Checklist:        │
│ ✅ Description    │
│    Collected      │
│                   │
│ ✅ Complexity     │
│    Classified     │
│                   │
│ ✅ Workflow Path  │
│    Selected       │
│                   │
│ ⏳ Project Name   │
│    Pending        │
│                   │
│ ─────────────     │
│                   │
│ Variables:        │
│ • detected_field  │
│   type: greenfield│
│ • project_path:   │
│   /Users/fahad... │
│ • complexity:     │
│   method          │
│                   │
└───────────────────┘
```

**Sidebar Updates:**
- Real-time status as tools complete
- Shows which tools approved/pending
- Displays key variable values
- Collapsible for more screen space

---

## Acceptance Criteria

> **Note:** Following Story 1.5 pattern - focused ACs on business value, not implementation details.

### **1. Conversational Chat Interface**

**AC1: User can chat naturally with PM Agent**
- [ ] Step 3 renders chat interface with message bubbles
- [ ] User can type messages and send them
- [ ] Agent responds conversationally (not form-based)
- [ ] Conversation history persists across page reloads
- [ ] Agent asks clarifying questions before triggering tools

**AC2: Chat state managed with Mastra threads**
- [ ] Mastra thread created on first user message
- [ ] Thread ID saved to workflow execution variables
- [ ] Messages stored in `mastra.mastra_messages` table
- [ ] Chat history retrievable via Mastra SDK

### **2. Tool Execution & AI Generation**

**AC3: update_summary tool generates project description**
- [ ] Agent triggers tool after sufficient conversation
- [ ] Tool uses Ax signature with ChainOfThought strategy
- [ ] Summary appears in chat with reasoning (collapsible)
- [ ] Summary includes key project details from conversation
- [ ] User can approve or reject with feedback

**AC4: update_complexity tool classifies project**
- [ ] Tool only executes after project_description variable exists
- [ ] Uses Ax signature to classify as: quick-flow, method, or enterprise
- [ ] Classification includes reasoning explaining the decision
- [ ] User can approve or reject classification
- [ ] Tool returns validation error if prerequisites missing

**AC5: fetch_workflow_paths queries database**
- [ ] Tool auto-executes after complexity approved
- [ ] Queries workflow_paths table with filters from config
- [ ] Filters by detected_field_type AND complexity_classification
- [ ] Supports JSONB path queries (tags->>'complexity')
- [ ] Results stored in available_workflow_paths variable

**AC6: select_workflow_path presents options**
- [ ] Tool renders path cards in chat interface
- [ ] Cards show path name, description, and why it's recommended
- [ ] User clicks card to select path
- [ ] Selection saves to selected_workflow_path_id variable
- [ ] Tool validates available_workflow_paths exists before executing

**AC7a: generate_project_name generates name suggestions**
- [ ] Tool executes after workflow path selected
- [ ] Uses Ax signature with Predict strategy (no CoT)
- [ ] Generates 3-5 kebab-case project name suggestions
- [ ] Suggestions based on project description and complexity
- [ ] Approval gate triggers for user to review suggestions

**AC7b: User can select or provide custom project name**
- [ ] User can select one of the suggested names
- [ ] User can choose "Use custom name instead" option
- [ ] Custom name input field appears when custom option selected
- [ ] Custom name validates against pattern: `^[a-z0-9-]+$`
- [ ] Custom name validates length: 3-50 characters
- [ ] Real-time validation feedback shown to user
- [ ] Approval triggers after valid selection/custom name provided

### **3. Approval Gate System**

**AC8: Approval gates pause workflow for user decision**
- [ ] Tool execution suspends when requiresApproval: true
- [ ] Approval state saved to workflow_executions.variables
- [ ] Workflow status changes to "paused"
- [ ] Frontend displays approval UI (Accept / Reject & Explain buttons)
- [ ] Workflow resumes on user approval/rejection

**AC9: User can approve AI-generated outputs**
- [ ] Clicking "Accept" saves output to workflow variables
- [ ] Approved output saved to mipro_training_examples table
- [ ] Workflow status changes back to "active"
- [ ] Agent continues to next tool
- [ ] Final approved value persists (e.g., project_description)

**AC10: User can reject and provide feedback**
- [ ] Clicking "Reject & Explain" shows feedback input
- [ ] User can type feedback explaining why they rejected
- [ ] Feedback saves to approval_states.rejection_history
- [ ] ACE optimizer updates playbook with feedback
- [ ] Agent regenerates using updated ACE knowledge
- [ ] User sees updated output for re-approval

### **4. ACE Optimizer & Learning**

**AC11: ACE playbook updates from rejection feedback**
- [ ] Rejection feedback triggers ACE optimizer
- [ ] New bullet added to ace_playbooks.playbook
- [ ] Playbook version incremented
- [ ] totalUpdates counter incremented
- [ ] Future tool executions include updated playbook context

**AC12: ACE playbook injected into agent instructions**
- [ ] PM Agent instructions loaded from agents.instructions table
- [ ] ACE playbook loaded from ace_playbooks table
- [ ] Playbook formatted and appended to instructions
- [ ] Agent sees "LEARNED PATTERNS" section in prompts
- [ ] Playbook influences tool generation behavior

### **5. MiPRO Data Collection**

**AC13: Approved outputs saved for future optimization**
- [ ] Approval saves input + output to mipro_training_examples
- [ ] Record includes tool name (for side effect type tracking)
- [ ] Input includes conversation_history, ace_context, variables
- [ ] Expected output includes approved value
- [ ] Rejection history included (for MiPRO analysis)

### **6. Dynamic Tool Building**

**AC14: Tools built from step config at runtime**
- [ ] AskUserChatStepHandler reads config.tools array
- [ ] Each tool config specifies toolType (ax-generation, database-query, custom)
- [ ] Ax signatures built from config.axSignature specification
- [ ] Database queries built from config.databaseQuery filters
- [ ] Tools validate requiredVariables before execution

**AC15: Ax signatures support input sources**
- [ ] Input fields can have source: "variable" (from execution.variables)
- [ ] Input fields can have source: "context" (from Mastra thread)
- [ ] Input fields can have source: "literal" (static value)
- [ ] Variable resolution fails gracefully if variable missing
- [ ] Conversation history fetched via Mastra SDK

### **7. Step Completion**

**AC16: Step completes when all tools approved**
- [ ] Completion condition checks all required tools approved
- [ ] Output variables extracted from tool results
- [ ] Step marked as completed in executedSteps
- [ ] Workflow advances to next step (Step 4 - future)
- [ ] All required outputs saved to workflow variables

### **8. Anthropic Configuration**

**AC17: Anthropic API key configurable in Settings**
- [ ] Settings page has Anthropic API key card
- [ ] User can save, test, update, and remove API key
- [ ] Key encrypted before storing in database
- [ ] Key validation with Anthropic API works
- [ ] Available Claude models displayed with pricing

---

## Tasks / Subtasks

### **Task 1: Database Schema Updates (AC: #14)**

- [ ] **Subtask 1.1:** Update `packages/db/src/schema/workflows.ts`
  - Add `AskUserChatStepConfig` TypeScript type
  - Define tool config structure (toolType, requiredVariables, axSignature, databaseQuery)
  - Add input field source types (variable, context, literal)
  - Update `StepConfig` union to include `AskUserChatStepConfig`

- [ ] **Subtask 1.2:** Create ACE and MiPRO schema
  - Create `packages/db/src/schema/ace.ts`
  - Define `acePlaybooks` table (agent_id, scope, playbook JSONB, version, total_updates)
  - Define `miproTrainingExamples` table (tool_name, input JSONB, expected_output JSONB, rejection_history JSONB)
  - Add indexes on agent_id, tool_name

- [ ] **Subtask 1.3:** Update `agents` table schema
  - Add `instructions` TEXT field to agents table
  - Migrate existing agents to have default instructions
  - Add `llm_model` field if not exists

- [ ] **Subtask 1.4:** Apply schema changes
  - Run `bun run db:reset` (drops and recreates database)
  - Verify all tables created correctly
  - Run seed scripts to populate initial data

### **Task 2: Mastra + Ax Infrastructure (AC: #11, #12, #13)**

- [ ] **Subtask 2.1:** Install dependencies
  ```bash
  bun add @mastra/core @mastra/pg @mastra/memory @mastra/evals
  bun add @ax-llm/ax
  bun add @ai-sdk/anthropic
  ```

- [ ] **Subtask 2.2:** Create Mastra service
  - Create `packages/api/src/services/mastra/mastra-service.ts`
  - Initialize Mastra instance with PostgreSQL storage
  - Configure storage with `mastra` schema
  - Export `getMastraInstance()` singleton

- [ ] **Subtask 2.3:** Create ACE optimizer service
  - Create `packages/api/src/services/mastra/ace-optimizer.ts`
  - Implement `AceOptimizer` class
  - `loadPlaybook(agentId, scope)` - Load from database
  - `applyOnlineUpdate(input, prediction, feedback)` - Update playbook
  - `formatPlaybookForPrompt(playbook)` - Format as markdown bullets
  - `savePlaybook(playbook)` - Save to database with version increment

- [ ] **Subtask 2.4:** Create MiPRO data collector service
  - Create `packages/api/src/services/mastra/mipro-collector.ts`
  - Implement `MiProCollector` class
  - `saveApprovedOutput(toolName, input, output, rejectionHistory)` - Save training example
  - `getTrainingExamples(toolName, limit)` - Query for future optimization
  - Format data structure for MiPRO compatibility

- [ ] **Subtask 2.5:** Write unit tests
  - Test: Mastra service initializes with PostgreSQL storage
  - Test: ACE playbook loads and updates correctly
  - Test: MiPRO data saves with correct structure
  - Test: Playbook formatting produces valid markdown

### **Task 3: AskUserChatStepHandler Implementation (AC: #1, #2, #14, #15, #16)**

- [ ] **Subtask 3.1:** Create step handler
  - Create `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`
  - Implement `AskUserChatStepHandler` class implementing `StepHandler` interface
  - `executeStep(step, execution, userInput?)` - Main entry point
  - Initialize or resume Mastra agent from config

- [ ] **Subtask 3.2:** Implement agent initialization
  - `initializeAgent(agentConfig, execution)` - Create Mastra agent
  - Load agent instructions from `agents` table
  - Load ACE playbook and inject into instructions
  - Create or load Mastra thread
  - Save thread ID to execution variables
  - Build tools from config and attach to agent

- [ ] **Subtask 3.3:** Implement dynamic tool building
  - `buildTools(toolConfigs, execution)` - Build Mastra tools from config
  - For each tool: validate requiredVariables exist
  - Return validation error if prerequisites missing
  - Build tool based on toolType (ax-generation, database-query, custom)
  - Attach to Mastra agent

- [ ] **Subtask 3.4:** Implement completion condition checking
  - `checkCompletionCondition(condition, execution)` - Check if step complete
  - For "all-tools-approved": verify all required tools have status "approved"
  - Extract output variables using config.outputVariables mapping
  - Return completion status + outputs

- [ ] **Subtask 3.5:** Write unit tests
  - Test: Agent initializes with DB instructions + ACE playbook
  - Test: Mastra thread created and ID saved
  - Test: Tools built correctly from config
  - Test: Prerequisite validation works
  - Test: Completion condition checked accurately

### **Task 4: Ax-Generation Tool Type (AC: #3, #4, #7)**

- [ ] **Subtask 4.1:** Implement Ax tool builder
  - Create `packages/api/src/services/workflow-engine/tools/ax-generation-tool.ts`
  - `buildAxGenerationTool(config, execution)` - Build Mastra tool
  - Build Ax signature string from config.axSignature
  - Create Ax generator with strategy (ChainOfThought or Predict)
  - Wrap in Mastra createTool with execute function

- [ ] **Subtask 4.2:** Implement input resolution
  - `resolveInputs(axSignature.input, execution)` - Resolve input values
  - Handle source: "variable" - Get from execution.variables
  - Handle source: "context" - Fetch from Mastra thread via SDK
  - Handle source: "literal" - Use static value
  - Load ACE playbook and add as ace_context input

- [ ] **Subtask 4.3:** Implement Ax generation
  - Call Ax generator with resolved inputs
  - Parse structured output (handles internal fields)
  - Filter out internal fields (marked with `internal: true`)
  - Return public result for approval

- [ ] **Subtask 4.4:** Implement approval gate suspension
  - Use Mastra `suspend()` to pause execution
  - Return approval state with result + reasoning
  - Save pending state to execution.variables.approval_states
  - Update workflow status to "paused"

- [ ] **Subtask 4.5:** Write unit tests
  - Test: Ax signature built correctly from config
  - Test: Input resolution works for all source types
  - Test: Conversation history fetched from Mastra SDK
  - Test: ACE playbook injected into inputs
  - Test: Internal fields filtered from output
  - Test: Approval gate suspends workflow

### **Task 5: Database-Query Tool Type (AC: #5)**

- [ ] **Subtask 5.1:** Implement DB query tool builder
  - Create `packages/api/src/services/workflow-engine/tools/database-query-tool.ts`
  - `buildDatabaseQueryTool(config, execution)` - Build Mastra tool
  - Parse config.databaseQuery specification
  - Build Drizzle query with filters

- [ ] **Subtask 5.2:** Implement filter resolution
  - `resolveFilters(filters, execution)` - Resolve filter values
  - Handle `{{variable}}` syntax in filter values
  - Support JSONB path queries (e.g., tags->>'complexity')
  - Support operators: eq, contains, gt, lt

- [ ] **Subtask 5.3:** Implement query execution
  - Execute Drizzle query with resolved filters
  - Return results array
  - Save to execution.variables[config.outputVariable]
  - No approval needed (auto-executes)

- [ ] **Subtask 5.4:** Write unit tests
  - Test: Query built correctly from config
  - Test: Variable references resolved in filters
  - Test: JSONB path queries work correctly
  - Test: Results saved to correct variable
  - Test: Multiple filters combine with AND

### **Task 6: Custom Tool Type (AC: #6, #7)**

- [ ] **Subtask 6.1:** Implement path selection tool
  - Create `packages/api/src/services/workflow-engine/tools/custom/select-workflow-path-tool.ts`
  - `buildSelectPathTool(config, execution)` - Build Mastra tool
  - Validate available_workflow_paths variable exists
  - Suspend execution to render UI
  - Return path cards data for frontend

- [ ] **Subtask 6.2:** Implement project name generation tool
  - Create `packages/api/src/services/workflow-engine/tools/custom/generate-project-name-tool.ts`
  - Use Ax signature with Predict strategy
  - Generate 3-5 kebab-case name suggestions
  - Validate custom names (pattern: ^[a-z0-9-]+$, length 3-50)
  - Return suggestions for approval

- [ ] **Subtask 6.3:** Write unit tests
  - Test: Path selection validates prerequisites
  - Test: Path cards data structured correctly
  - Test: Project names follow kebab-case pattern
  - Test: Custom name validation works
  - Test: 3-5 suggestions generated

### **Task 7: Approval Flow Backend (AC: #8, #9, #10)**

- [ ] **Subtask 7.1:** Implement approval API
  - Update `packages/api/src/routers/workflows.ts`
  - Add `approveToolCall` mutation
  - Validate execution exists and is paused
  - Update approval_states[toolName].status = "approved"
  - Save approved value to workflow variables
  - Call MiPRO collector to save training example
  - Resume workflow (status = "active")

- [ ] **Subtask 7.2:** Implement rejection API
  - Add `rejectToolCall` mutation
  - Validate execution exists and is paused
  - Save feedback to approval_states[toolName].rejection_history
  - Call ACE optimizer to update playbook
  - Increment rejection_count
  - Resume workflow for agent to regenerate

- [ ] **Subtask 7.3:** Write unit tests
  - Test: Approval saves to variables and MiPRO
  - Test: Rejection updates ACE playbook
  - Test: Workflow resumes after approval/rejection
  - Test: Multiple rejections increment counter
  - Test: Validation errors for invalid execution ID

### **Task 8: Frontend Chat Interface (AC: #1, #2)**

- [ ] **Subtask 8.1:** Add AI Elements components via shadcn CLI
  - Run: `bun x shadcn@latest add prompt-input message message-list thinking-indicator chat-container -r @ai-elements`
  - Verify components installed to `apps/web/src/components/ui/`
  - Test components render correctly in isolation
  - Review component APIs and customization options

- [ ] **Subtask 8.2:** Create AskUserChatStep component
  - Create `apps/web/src/components/workflows/steps/ask-user-chat-step.tsx`
  - Import AI Elements: `ChatContainer`, `MessageList`, `Message`, `PromptInput`, `ThinkingIndicator`
  - Use `ChatContainer` for overall layout (handles responsive + sticky input)
  - Use `MessageList` for scrollable message area (handles auto-scroll + virtualization)
  - User messages: role="user", right-aligned (blue)
  - Agent messages: role="assistant", left-aligned (gray)
  - Use `ThinkingIndicator` while agent generates response

- [ ] **Subtask 8.3:** Implement message sending with PromptInput
  - Use `PromptInput` component with `onSubmit` handler
  - `handleSendMessage(message)` - Send user message via tRPC
  - tRPC mutation: `workflows.sendChatMessage`
  - Backend calls Mastra agent.stream()
  - Stream agent response to frontend
  - Append messages using `Message` component
  - Disable input during agent processing

- [ ] **Subtask 8.4:** Implement message persistence
  - Load message history from Mastra on component mount
  - Use tRPC query: `workflows.getChatMessages({ threadId })`
  - Backend calls Mastra SDK: `getStorage().getMessages({ threadId })`
  - Map Mastra messages to `Message` components
  - Display full conversation history
  - MessageList handles auto-scroll to bottom

- [ ] **Subtask 8.5:** Write component tests
  - Test: Chat renders with message history
  - Test: User can send message via PromptInput
  - Test: Agent response streams in real-time
  - Test: ThinkingIndicator shows during processing
  - Test: Messages persist across page reload
  - Test: Auto-scroll works correctly
  - Test: Markdown rendering in messages works

### **Task 9: Frontend Approval Gates (AC: #8, #9, #10)**

- [ ] **Subtask 9.1:** Create approval card component
  - Create `apps/web/src/components/workflows/approval-card.tsx`
  - Render inline in chat (not modal)
  - Show tool output in formatted card
  - Display reasoning (collapsible with details tag)
  - Accept and Reject buttons

- [ ] **Subtask 9.2:** Implement approval action
  - `handleApprove(toolName)` - Call tRPC mutation
  - Show loading state during API call
  - On success: Show checkmark animation
  - Agent continues conversation
  - Card stays in chat history (read-only)

- [ ] **Subtask 9.3:** Implement rejection action
  - `handleReject(toolName)` - Show feedback input
  - Textarea for user feedback
  - Submit button sends feedback via tRPC
  - Agent responds with "Thanks for the feedback!"
  - Agent regenerates with ACE knowledge

- [ ] **Subtask 9.4:** Write component tests
  - Test: Approval card renders in chat
  - Test: Approve button triggers approval
  - Test: Reject shows feedback input
  - Test: Feedback submission works
  - Test: Approved card becomes read-only

### **Task 10: Frontend Path Selection UI (AC: #6)**

- [ ] **Subtask 10.1:** Create path selection cards
  - Create `apps/web/src/components/workflows/path-selection-cards.tsx`
  - Render cards for each path in available_workflow_paths
  - Display path name, description, reasoning
  - Radio selection or clickable cards
  - Highlight recommended path

- [ ] **Subtask 10.2:** Implement path selection
  - `handleSelectPath(pathId)` - Call tRPC mutation
  - Save to selected_workflow_path_id variable
  - Visual feedback (selected state)
  - Agent continues to next tool

- [ ] **Subtask 10.3:** Write component tests
  - Test: Path cards render correctly
  - Test: User can select path
  - Test: Selection saves to variables
  - Test: Recommended path highlighted

### **Task 11: Frontend Project Name UI (AC: #7)**

- [ ] **Subtask 11.1:** Create project name selector
  - Create `apps/web/src/components/workflows/project-name-selector.tsx`
  - Display 3-5 suggested names as radio options
  - "Custom name" option with text input
  - Real-time validation (kebab-case, length)
  - Show validation errors

- [ ] **Subtask 11.2:** Implement name selection
  - `handleSelectName(name)` - Approve tool with selected name
  - Validate custom name before submission
  - Save to project_name variable
  - Show checkmark on approval

- [ ] **Subtask 11.3:** Write component tests
  - Test: Suggestions render correctly
  - Test: User can select suggestion
  - Test: Custom name validates correctly
  - Test: Invalid names show errors
  - Test: Selection saves to variables

### **Task 12: Database Seeding (AC: #3, #4, #5, #6, #7)**

- [ ] **Subtask 12.1:** Seed PM Agent with instructions
  - Update `packages/scripts/src/seeds/agents.ts`
  - Define PM Agent instructions (conversational flow, tool calling rules)
  - Set llm_model to anthropic/claude-3-5-sonnet-20241022
  - Seed to agents table

- [ ] **Subtask 12.2:** Seed initial ACE playbook (empty)
  - Create `packages/scripts/src/seeds/ace-playbooks.ts`
  - Create empty playbook for PM Agent
  - Sections: "Summary Generation Patterns", "Complexity Classification Patterns"
  - Empty bullets array (will be populated by learning)

- [ ] **Subtask 12.3:** Seed Step 3 configuration
  - Update `packages/scripts/src/seeds/workflow-init-new.ts`
  - Define all 5 tools with full configuration
  - Tool 1: update_summary (ax-generation, ChainOfThought)
  - Tool 2: update_complexity (ax-generation, ChainOfThought)
  - Tool 3: fetch_workflow_paths (database-query)
  - Tool 4: select_workflow_path (custom)
  - Tool 5: generate_project_name (ax-generation, Predict)
  - Completion condition: all-tools-approved
  - Output variables: project_description, complexity_classification, selected_workflow_path_id, project_name

- [ ] **Subtask 12.4:** Test seeding
  - Run `bun run db:reset && bun run db:seed`
  - Verify PM Agent exists with instructions
  - Verify ACE playbook created
  - Verify Step 3 config saved correctly
  - Query workflow_steps to verify JSONB structure

### **Task 13: Anthropic Configuration (AC: #17)**

- [ ] **Subtask 13.1:** Create Anthropic API router
  - Create `packages/api/src/routers/anthropic.ts`
  - `getKey` procedure - Returns masked key
  - `saveKey` procedure - Encrypts and stores
  - `testKey` procedure - Validates with Anthropic API
  - `removeKey` procedure - Deletes key

- [ ] **Subtask 13.2:** Implement key encryption
  - Use `@node-rs/argon2` for encryption
  - Store encrypted key in app_config table
  - Decrypt on API calls

- [ ] **Subtask 13.3:** Update Settings UI
  - Update `apps/web/src/routes/_authenticated.settings.tsx`
  - Add Anthropic API key card (similar to OpenRouter)
  - Input with show/hide toggle
  - Test, Save, Update, Remove buttons
  - Status indicator (Valid/Invalid/Testing)
  - List available Claude models with pricing

- [ ] **Subtask 13.4:** Write tests
  - Test: Key encryption/decryption
  - Test: Key validation with Anthropic API
  - Test: CRUD operations work
  - Test: Settings UI updates correctly

### **Task 14: Integration & End-to-End Testing (AC: All)**

- [ ] **Subtask 14.1:** End-to-end workflow test
  - Test: User starts workflow-init-new
  - Test: Step 1-2 complete (from Story 1.5)
  - Test: Step 3 renders chat interface
  - Test: User chats with agent
  - Test: Agent triggers update_summary tool
  - Test: User approves summary
  - Test: Agent triggers update_complexity tool
  - Test: User rejects complexity with feedback
  - Test: ACE playbook updates
  - Test: Agent regenerates with improved classification
  - Test: User approves complexity
  - Test: fetch_workflow_paths auto-executes
  - Test: Path cards render
  - Test: User selects path
  - Test: Agent triggers generate_project_name
  - Test: User selects name
  - Test: Step 3 completes
  - Test: All outputs saved to variables

- [ ] **Subtask 14.2:** State persistence test
  - Test: Start workflow, send messages
  - Test: Reload page mid-conversation
  - Test: Conversation history persists
  - Test: Pending approval still shown
  - Test: User can approve after reload
  - Test: Workflow resumes correctly

- [ ] **Subtask 14.3:** Performance test
  - Test: Ax generation completes < 10 seconds (NFR001)
  - Test: Approval API responds < 200ms
  - Test: Message sending < 500ms
  - Measure: End-to-end Step 3 completion time

- [ ] **Subtask 14.4:** Manual testing checklist
  - [ ] Can start workflow from home page
  - [ ] Chat interface renders correctly
  - [ ] Can send messages to agent
  - [ ] Agent responds conversationally
  - [ ] Agent asks clarifying questions
  - [ ] Agent triggers summary tool when ready
  - [ ] Summary shows with reasoning
  - [ ] Can approve summary
  - [ ] Approved summary saved to variables
  - [ ] Can reject summary with feedback
  - [ ] ACE playbook updates on rejection
  - [ ] Agent regenerates with improved output
  - [ ] Complexity classification works
  - [ ] Workflow paths fetch automatically
  - [ ] Path cards render in chat
  - [ ] Can select workflow path
  - [ ] Project name suggestions generated
  - [ ] Can select or provide custom name
  - [ ] Step completes when all tools approved
  - [ ] All outputs saved correctly
  - [ ] Can reload and resume anytime

---

## Learnings from Previous Stories

### **From Story 1.5 (Workflow-Init Steps 1-2 Foundation):**

**Existing Infrastructure to Reuse:**
- ✅ Step handler interface and registry pattern
- ✅ Variable resolver with 4-level precedence
- ✅ State manager for execution tracking
- ✅ WorkflowStepperWizard component for progress display
- ✅ tRPC router patterns for workflow APIs

**Patterns to Follow:**
- Generic step handlers (not workflow-specific)
- JSONB config drives all behavior
- Auto-advance for backend steps, user interaction for approval
- Clear error messages with actionable guidance
- Type-safe with full TypeScript inference

**Technical Debt to Avoid:**
- Don't hardcode tool logic (use config-driven approach)
- Don't skip validation (prerequisite checks critical)
- Don't neglect error handling (approval gates can fail)

### **From Story 1.4 (Workflow Execution Engine Core):**

**State Management Pattern:**
- Use `workflow_executions.variables` for all runtime data
- Track step completion in `executedSteps` JSONB
- Use `status` enum for workflow lifecycle
- Save approval states as structured JSONB

**Variable Resolution:**
- System variables (current_user_id, execution_id)
- Execution variables (from workflow state)
- Step outputs (from completed steps)
- Default values (from config)

---

## Dev Notes

### **Architecture Patterns**

**1. Dynamic Tool Building**
```typescript
// Tools are NOT hardcoded - built from JSONB config at runtime
const tools = config.tools.map(toolConfig => {
  switch (toolConfig.toolType) {
    case "ax-generation":
      return buildAxGenerationTool(toolConfig, execution);
    case "database-query":
      return buildDatabaseQueryTool(toolConfig, execution);
    case "custom":
      return buildCustomTool(toolConfig, execution);
  }
});
```

**2. Prerequisite Validation**
```typescript
// Tools validate required variables exist before executing
if (toolConfig.requiredVariables?.length > 0) {
  const missing = toolConfig.requiredVariables.filter(
    v => !(v in execution.variables)
  );
  if (missing.length > 0) {
    return { error: "MISSING_PREREQUISITES", missingVariables: missing };
  }
}
```

**3. Mastra Thread Management**
```typescript
// Thread ID saved in workflow variables, not separate table
let threadId = execution.variables.mastra_thread_id_main;
if (!threadId) {
  const thread = await mastra.createThread({
    resourceId: `user-${execution.variables.current_user_id}`
  });
  threadId = thread.id;
  await saveVariable("mastra_thread_id_main", threadId);
}
```

**4. Approval State Tracking**
```typescript
// Approval states stored in workflow variables as structured JSONB
approval_states: {
  update_summary: {
    status: "approved" | "pending" | "rejected",
    value: any,
    reasoning: string,
    approved_at: string,
    rejection_count: number,
    rejection_history: Array<{ feedback, rejected_at }>
  }
}
```

**5. ACE Learning Flow**
```typescript
// On rejection:
1. Save feedback to approval_states.rejection_history
2. Call ACE optimizer with feedback
3. ACE adds bullet to playbook (agent-level knowledge)
4. Save updated playbook (version++, totalUpdates++)
5. Resume workflow - agent regenerates with new knowledge
```

**6. Input Source Resolution**
```typescript
// Input fields specify where to get data
{ name: "conversation_history", source: "context" }
  → Fetch from Mastra thread via SDK

{ name: "project_description", source: "variable", variableName: "project_description" }
  → Get from execution.variables.project_description

{ name: "user_expertise", source: "literal", defaultValue: "mid-level" }
  → Use static value
```

**7. AI Elements Chat Components**
```bash
# Install AI Elements via shadcn CLI (using bun)
bun x shadcn@latest add prompt-input message message-list thinking-indicator chat-container -r @ai-elements

# Usage in chat interface
import { ChatContainer, MessageList, Message, PromptInput, ThinkingIndicator } from "@/components/ui";

<ChatContainer>
  <MessageList>
    {messages.map(msg => <Message key={msg.id} role={msg.role} content={msg.content} />)}
    {isThinking && <ThinkingIndicator text="PM Agent is thinking..." />}
  </MessageList>
  <PromptInput onSubmit={handleSend} placeholder="Tell me about your project..." />
</ChatContainer>
```

### **Key Files Structure**

```
packages/api/src/services/
  workflow-engine/
    step-handlers/
      ask-user-chat-handler.ts          # Main handler (NEW)
      execute-action-handler.ts          # Story 1.5 (existing)
      ask-user-handler.ts                # Story 1.5 (existing)
    tools/
      ax-generation-tool.ts              # Ax-powered tool builder (NEW)
      database-query-tool.ts             # DB query tool builder (NEW)
      custom/
        select-workflow-path-tool.ts     # Path selection (NEW)
        generate-project-name-tool.ts    # Name generation (NEW)
  mastra/
    mastra-service.ts                    # Mastra initialization (NEW)
    ace-optimizer.ts                     # ACE playbook management (NEW)
    mipro-collector.ts                   # Training data collection (NEW)

packages/db/src/schema/
  workflows.ts                           # Add AskUserChatStepConfig (UPDATE)
  agents.ts                              # Add instructions field (UPDATE)
  ace.ts                                 # ACE + MiPRO tables (NEW)

apps/web/src/components/
  ui/                                    # AI Elements components (NEW)
    chat-container.tsx                   # Chat layout wrapper
    message-list.tsx                     # Scrollable message area
    message.tsx                          # Individual message bubble
    prompt-input.tsx                     # Auto-resize input field
    thinking-indicator.tsx               # "AI is thinking" animation
  workflows/
    steps/
      ask-user-chat-step.tsx             # Chat interface (NEW)
    approval-card.tsx                    # Approval UI (NEW)
    path-selection-cards.tsx             # Path cards (NEW)
    project-name-selector.tsx            # Name selector (NEW)

packages/scripts/src/seeds/
  workflow-init-new.ts                   # Add Step 3 config (UPDATE)
  agents.ts                              # Add PM Agent instructions (UPDATE)
  ace-playbooks.ts                       # Seed ACE playbooks (NEW)
```

### **Testing Strategy**

**Unit Tests:**
- Each service in isolation (Mastra, ACE, MiPRO, tool builders)
- Mock Mastra SDK calls
- Mock Ax generator calls
- Validate config parsing

**Integration Tests:**
- Step handler with real tool execution
- Approval flow (approve/reject/regenerate)
- State persistence (pause/resume)
- Variable resolution

**Component Tests:**
- AI Elements integration (ChatContainer, MessageList, Message, PromptInput, ThinkingIndicator)
- Chat interface with mock messages
- Approval cards with mock states
- Path selection with mock paths
- Name selector with validation
- Markdown rendering in messages
- Auto-scroll behavior in MessageList

**End-to-End Test:**
- Complete workflow from start to Step 3 completion
- User journey: chat → approve/reject → path selection → name → complete
- Performance: measure generation times

### **Performance Considerations**

- **Ax Generation:** Use streaming for real-time feedback
- **Mastra Threads:** Lazy load messages (pagination)
- **ACE Playbook:** Cache in memory during execution
- **DB Queries:** Index on workflow_paths.tags JSONB field
- **Frontend:** Virtualize message list for long conversations

### **Security Considerations**

- **API Keys:** Encrypt Anthropic key before storing
- **Input Validation:** Validate all user inputs (feedback, custom names)
- **SQL Injection:** Use Drizzle ORM (prevents injection)
- **Thread Access:** Verify user owns thread before fetching messages
- **Variable Access:** Scope variables to execution (no cross-execution access)

---

## AI Elements Integration Summary

### **Components Added from @ai-elements Registry**

This story introduces **5 production-ready chat UI components** from the AI SDK registry:

| Component | File Path | Primary Use |
|-----------|-----------|-------------|
| `ChatContainer` | `apps/web/src/components/ui/chat-container.tsx` | Overall chat layout wrapper |
| `MessageList` | `apps/web/src/components/ui/message-list.tsx` | Scrollable message container with virtualization |
| `Message` | `apps/web/src/components/ui/message.tsx` | Individual message bubbles (user/assistant) |
| `PromptInput` | `apps/web/src/components/ui/prompt-input.tsx` | Auto-resizing message input with shortcuts |
| `ThinkingIndicator` | `apps/web/src/components/ui/thinking-indicator.tsx` | Animated "AI is thinking" indicator |

### **Why This Matters**

**Before AI Elements:**
- Custom chat UI would take 8-12 hours to build properly
- Need to implement markdown rendering, syntax highlighting, auto-scroll, virtualization
- Accessibility compliance requires WCAG 2.1 AA research + implementation
- Performance optimization (virtualization) is complex

**After AI Elements:**
- Install via CLI in ~2 minutes: `bun x shadcn@latest add [components] -r @ai-elements`
- Battle-tested UX patterns from AI SDK team (used by ChatGPT, Vercel v0)
- WCAG 2.1 AA accessibility compliance built-in
- Virtualization for performance with long conversations
- Markdown + syntax highlighting configured

**Time Saved:** ~8-10 hours per chat interface  
**Quality Improvement:** Professional UX patterns, tested at scale  
**Maintenance Reduction:** Registry handles updates, security patches

### **Customization Strategy**

**Use AI Elements for:**
- ✅ Chat container layout (responsive, sticky input)
- ✅ Message bubbles (role-based styling, markdown)
- ✅ Input field (auto-resize, keyboard shortcuts)
- ✅ Thinking indicator (smooth animations)

**Build Custom for:**
- ✅ Approval cards (domain-specific, not generic chat)
- ✅ Path selection cards (project-specific UI)
- ✅ Progress sidebar (workflow tracking)
- ✅ Tool output formatting (rejection feedback, reasoning display)

This hybrid approach maximizes velocity (reuse proven components) while maintaining flexibility (custom domain logic).

---

## Change Log

| Date | Author | Change Description |
|------|--------|-------------------|
| 2025-11-13 | SM Agent (fahad) | Initial story draft - THESIS VALIDATION STORY! 🎉 |
| 2025-11-13 | SM Agent (fahad) | Added AI Elements components integration - Chat UI foundation |
| 2025-11-13 | SM Agent (Bob) | Validation fixes: Split AC7→AC7a/AC7b, enhanced Testing Strategy, added cross-references - **PERFECT SCORE** |

---

## Dev Agent Record

### Context Reference
**Story Location:** docs/stories/1-6-workflow-init-steps-3-4-description-complexity.md  
**Epic:** Epic 1 - Foundation + Workflow-Init Engine  
**Dependencies:** Story 1.5 (Workflow-Init Steps 1-2 Foundation) - In Progress  
**Story Context File:** docs/stories/1-6-workflow-init-steps-3-4-description-complexity.context.xml (to be created via *story-context workflow)

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References
{{debug_logs_location}}

### Completion Notes List
{{completion_notes}}

### File List
{{files_created_or_modified}}
