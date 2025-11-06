# UX Pattern: Structured Exploration Lists

**Pattern Name:** Structured Exploration Lists (SEL)
**Created:** 2025-10-30
**Status:** Core UX Principle for Chiron

---

## Problem Statement

In AI-assisted workflows, users need to explore multiple options, dive deep into specific items, and have tangential conversations - but these explorations pollute the main context window, causing:

- **Context overflow** - LLM gets confused by 200+ message conversations
- **Lost decisions** - Hard to find "what was actually decided" in chat history
- **Non-resumable sessions** - Can't easily pick up where you left off
- **Poor artifact generation** - Agent must parse through noise to extract decisions

---

## Solution: Structured Exploration Lists

### Core Concept

**Main View:** Clean list of explorable items with contextual actions
**Focused Dialogs:** Isolated conversations for deep exploration of ONE item
**Decision Recording:** Only final decisions return to main context

### Architecture

```
┌─────────────────────────────────────┐
│ Main View (Clean Context)          │
│                                     │
│ ✅ Item 1: Decision recorded        │
│ 🔄 Item 2: Currently exploring      │
│ ⚪ Item 3: Not started              │
│ ⚪ Item 4: Not started              │
│                                     │
│ Context: 4 items + 1 decision       │
│ = ~10 tokens total                  │
└─────────────────────────────────────┘
         ↓ Click [Explore] on Item 2
┌─────────────────────────────────────┐
│ Focused Dialog (Isolated Context)  │
│                                     │
│ AGENT: Let's explore Item 2...     │
│ USER: What about X?                 │
│ AGENT: Good question! [explains]   │
│ USER: How does Y compare?           │
│ AGENT: [10-15 message discussion]  │
│                                     │
│ Context: This dialog only          │
│ = 30+ messages, BUT isolated       │
│                                     │
│ [✓ Accept Decision]                │
└─────────────────────────────────────┘
         ↓ Accept decision
┌─────────────────────────────────────┐
│ Main View (Still Clean!)           │
│                                     │
│ ✅ Item 1: Decision recorded        │
│ ✅ Item 2: Final decision recorded  │ ← Only this added
│ ⚪ Item 3: Not started              │
│ ⚪ Item 4: Not started              │
│                                     │
│ Context: 4 items + 2 decisions      │
│ = ~15 tokens total                  │
│                                     │
│ Dialog history: Preserved but       │
│ not in main context                 │
└─────────────────────────────────────┘
```

---

## Pattern Components

### 1. Main List View

**Purpose:** Overview of all explorable items with status visibility

**Elements:**
- List items with status indicators (✅ ⚪ 🔄 ❌)
- Contextual actions per item ([Explore] [Select] [Reject] [Compare])
- Final decisions displayed inline
- Clean, scannable layout

**Context Load:** Minimal - only items + final decisions

### 2. Focused Dialog

**Purpose:** Deep exploration of ONE item without polluting main context

**Elements:**
- Modal/drawer overlay
- Conversational AI interaction
- Full exploration history preserved
- Actions: [Accept] [Reject] [Compare to Other] [Close]

**Context Load:** Heavy - but isolated to dialog only

### 3. Decision Recording

**Purpose:** Capture final outcome without conversation history

**Process:**
1. User explores in dialog (10-50 messages)
2. Agent synthesizes final decision (1-2 sentences)
3. User accepts decision
4. Only decision returns to main view
5. Dialog history preserved separately

---

## Use Cases

### Decision-Making Workflows

**Technology Selection:**
```
List: BullMQ, Inngest, Temporal
Action: [Explore] each option
Dialog: Discuss pros/cons, cost, scaling
Decision: "BullMQ selected - Redis-based, $10/month, scales to 100k jobs"
```

**Architecture Patterns:**
```
List: Centralized Store, Distributed per Agent, Hybrid
Action: [Explore] patterns
Dialog: Discuss tradeoffs, complexity, scalability
Decision: "Hybrid approach - shared base + agent-specific layers"
```

**Library Choices:**
```
List: Better-Auth, Auth.js, Clerk, Supabase Auth
Action: [Explore] [Compare] libraries
Dialog: Deep dive into features, pricing, DX
Decision: "Better-Auth chosen - type-safe, framework-agnostic"
```

### Exploratory Workflows

**Brainstorming Questions:**
```
List: What If questions (5-10 scenarios)
Action: [Answer] each question
Dialog: Conversational exploration of scenario
Decision: Final synthesized answer per question
```

**User Research Insights:**
```
List: Pain points discovered (10-15 items)
Action: [Explore] [Validate] [Deprioritize]
Dialog: Discuss evidence, impact, frequency
Decision: "P0 pain point - affects 80% of users daily"
```

### Review/Feedback Workflows

**Code Review Issues:**
```
List: Performance issues, bugs, style concerns
Action: [Discuss] [Fix] [Won't Fix]
Dialog: Analyze impact, discuss solutions
Decision: "Fix approved - converting to hash map (15 min)"
```

**Architecture Review:**
```
List: Concerns about scalability, security, maintainability
Action: [Discuss] [Address] [Accept Risk]
Dialog: Technical deep dive, alternatives
Decision: "Mitigate with caching layer - acceptable tradeoff"
```

### Planning Workflows

**Feature Prioritization:**
```
List: Proposed features for MVP (10-15 features)
Action: [Explore] [Include in MVP] [Defer to v2]
Dialog: Discuss value, complexity, dependencies
Decision: "Auth in MVP, payment deferred - can use manual invoicing"
```

**Story Breakdown:**
```
List: Epic tasks to break into stories
Action: [Explore] [Break Down] [Merge]
Dialog: Discuss scope, acceptance criteria
Decision: "3 stories: Setup, Implementation, Testing"
```

---

## Benefits

### 1. Context Window Management

**Without Pattern:**
```
Main context = 200+ messages across 10 items
→ LLM confused
→ Context limit hit
→ Lost track of decisions
```

**With Pattern:**
```
Main context = 10 items + 10 decisions (20 items)
→ LLM focused
→ Never hit limit
→ Clear decision record
```

### 2. Visual Clarity

Users see at a glance:
- ✅ What's been decided
- 🔄 What's in progress
- ⚪ What's pending
- ❌ What's rejected

vs. scrolling through 200 messages

### 3. Non-Linear Exploration

Users can:
- Explore items in any order
- Skip items entirely
- Compare items side-by-side
- Come back to items later
- Explore multiple items simultaneously

### 4. Resumability

- Close dialog mid-conversation
- Return tomorrow
- Dialog history preserved
- Continue where you left off
- No lost context

### 5. Clean Artifact Generation

**Without Pattern:**
```
Agent: "Parse 200 messages to extract decisions"
→ Error-prone
→ Includes tangents
```

**With Pattern:**
```
Agent: "Use the 10 final decisions"
→ Clean
→ Exactly what was decided
```

### 6. Collaborative Decision-Making

Multiple team members can:
- Explore different options independently
- See each other's explorations
- Leave notes/comments
- Converge on final decisions

---

## Implementation in Chiron

### Interactive Mode vs YOLO Mode

**Interactive Mode:**
- User manually explores each item
- Opens dialogs to dive deep
- Makes explicit decisions
- Full control over exploration

**YOLO Mode:**
- Agent auto-generates answers for all items
- List pre-filled with decisions
- User reviews and refines
- Quick path for experienced users

**Both modes use the same structured list UI** - difference is who populates it.

### UI Components

**Main List Component:**
```typescript
<ExplorationList
  items={items}
  onExplore={(item) => openDialog(item)}
  onSelect={(item) => recordDecision(item)}
  onReject={(item) => markRejected(item)}
  onCompare={(items) => openComparisonDialog(items)}
/>
```

**Focused Dialog Component:**
```typescript
<ExplorationDialog
  item={currentItem}
  conversationHistory={dialogHistory}
  onAccept={(decision) => recordToMainView(decision)}
  onClose={() => saveDialogState()}
/>
```

**Decision Display Component:**
```typescript
<DecisionCard
  item={item}
  decision={finalDecision}
  onEdit={() => reopenDialog(item)}
  onRevise={() => createNewDialog(item)}
/>
```

---

## When to Use This Pattern

### ✅ Use When:

- Multiple items need exploration (2+)
- Each item requires deep dive/discussion
- Tangents and clarifications are expected
- Final decisions need to be clean/concise
- Users might explore non-linearly
- Session resumability is important

### ❌ Don't Use When:

- Single item only
- No exploration needed (simple choice)
- Linear flow required (can't skip ahead)
- Conversational history is the artifact (not decisions)

---

## Anti-Patterns to Avoid

### ❌ Pure Conversational Flow

```
Main chat with everything:
AGENT: Let's pick a library
USER: What are the options?
AGENT: [Lists 5 libraries]
USER: Tell me about BullMQ
AGENT: [Explains BullMQ]
USER: What about cost?
[50 messages later...]
USER: OK I'll use BullMQ
AGENT: Moving to next question...
[Context now polluted]
```

### ❌ Rigid Form-Based Flow

```
┌──────────────────────┐
│ Select Library:      │
│ [Dropdown ▾]         │
│ [Submit]             │
└──────────────────────┘
```
No exploration, no guidance, no tangents allowed.

### ❌ Single Giant Dialog

```
Dialog with all 10 items:
- Explore all items in one conversation
- Can't close and resume
- All context in one place
- Context overflow
```

---

## Key Insight

**The pattern separates:**

1. **Structure** (main list) - What needs to be decided
2. **Exploration** (dialogs) - How we get to decisions
3. **Decisions** (recorded in list) - What was decided

This separation enables:
- Clean context management
- Flexible exploration
- Clear decision tracking
- Collaborative workflows

---

## Chiron's Differentiator

**Traditional PM Tools:** Rigid forms or free-form notes (no middle ground)

**AI Chat Interfaces:** Pure conversational (context explosion)

**Chiron:** Structured exploration lists
- Guided like forms
- Flexible like conversation
- Clean like structured data
- Powerful like AI collaboration

**This is Chiron's UX superpower.**

---

**Pattern Status:** Core UX Principle - Apply to ALL workflows with exploration needs
**Next Steps:** Implement in Phase 1 MVP, validate with user testing
