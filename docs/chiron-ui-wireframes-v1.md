# Chiron UI Wireframes v1.0

**Created:** 2025-10-30
**Purpose:** Visual design exploration for Chiron's PM-grade interface blending Linear-inspired UX with BMAD workflow execution
**Status:** Draft for validation against BMAD methodology

---

## Design Philosophy

Chiron's interface bridges two worlds:

1. **PM-Grade Features** (Linear/Jira-inspired)
   - Kanban boards for story management
   - Project dashboards with status visibility
   - Story detail views with context

2. **BMAD Workflow Execution** (Artifact refinement pattern)
   - Interactive question/answer dialogs
   - Real-time artifact preview and refinement
   - Guided workflow execution with agent orchestration

---

## Table of Contents

1. [Main Dashboard](#screen-1-main-dashboard)
2. [Kanban Board](#screen-2-kanban-board)
3. [Story Detail + Agent Orchestration](#screen-3-story-detail--agent-orchestration)
4. [Workflow Execution - Artifact Refinement](#screen-4-workflow-execution---artifact-refinement)
5. [Sprint Planning](#screen-5-sprint-planning)
6. [Create Epic Wizard](#screen-6-create-epic-wizard)

---

## Screen 1: Main Dashboard

**Context:** First thing user sees when opening Chiron
**Purpose:** Project overview, quick actions, workflow status, agent monitoring

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Chiron    🎯 Projects    👥 Team    ⚙️ Settings         [🔍 Search]   [@fahad ▾]│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  📊 chiron Project                                        Phase: 1-Analysis ●    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ 🎯 Quick Actions                                                      │      │
│  ├───────────────────────────────────────────────────────────────────────┤      │
│  │                                                                         │      │
│  │  💬 "Create authentication feature"                          [Enter ↵] │      │
│  │                                                                         │      │
│  │  💡 Natural language → Chiron interprets → Launches workflow           │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                       │
│  │ 📋 Current Workflow     │  │ 🤖 Active Agents        │                       │
│  ├─────────────────────────┤  ├─────────────────────────┤                       │
│  │                         │  │                         │                       │
│  │ product-brief           │  │ 🟢 Analyst              │                       │
│  │ └─ In Progress          │  │    Working on:          │                       │
│  │                         │  │    product-brief        │                       │
│  │ Next: research (opt.)   │  │                         │                       │
│  │    or product-brief     │  │ ⚪ Dev (Idle)           │                       │
│  │                         │  │ ⚪ Architect (Idle)     │                       │
│  │ [Continue] [View Path]  │  │                         │                       │
│  └─────────────────────────┘  └─────────────────────────┘                       │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ 📊 Project Progress                                                     │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                           │    │
│  │  ✅ Phase 1: Analysis          ████████████░░░░░░░░ 60%                │    │
│  │     • brainstorm-project ✅                                              │    │
│  │     • product-brief 🔄 (In Progress)                                    │    │
│  │     • research ⚪ (Optional)                                             │    │
│  │                                                                           │    │
│  │  ⚪ Phase 2: Planning           ░░░░░░░░░░░░░░░░░░░░ 0%                 │    │
│  │  ⚪ Phase 3: Solutioning        ░░░░░░░░░░░░░░░░░░░░ 0%                 │    │
│  │  ⚪ Phase 4: Implementation     ░░░░░░░░░░░░░░░░░░░░ 0%                 │    │
│  │                                                                           │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ 📁 Recent Artifacts                                                     │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                           │    │
│  │  📄 product-brief-chiron-2025-10-26.md        Updated 2h ago            │    │
│  │  📄 brainstorming-session-results.md          Updated 5d ago            │    │
│  │  📋 bmm-workflow-status.md                    Updated 2h ago            │    │
│  │                                                                           │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Natural language input** for power users (quick actions)
- **Current workflow status** (replaces CLI `workflow-status` command)
- **Agent monitoring** (real-time view of what agents are doing)
- **Phase progress visualization** (BMAD's 4-phase methodology)
- **Recent artifacts** (quick access to generated documents)

**User Flow:**
1. User opens Chiron → sees dashboard
2. Can type natural language command OR click "Continue" on current workflow OR click workflow action
3. Sees all project state at a glance (no status commands needed)
4. Click on any workflow name → launches Structured Exploration dialog to understand and decide

**Structured Exploration Integration:**
- Click "Continue" → Opens exploration dialog: "Resume product-brief? [Explore] [Start] [Skip]"
- Click "research (opt.)" → Exploration: "What research areas? [Explore options] [Define custom]"
- Natural language input triggers intent parsing with exploration confirmation

---

## Screen 2: Kanban Board

**Context:** Phase 4 - Implementation view
**Purpose:** Story management, drag-and-drop workflow, agent assignment visibility

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Dashboard    📋 Kanban    📊 Timeline    🔄 Workflows         [@fahad ▾]      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  🎯 chiron - Phase 4: Implementation                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                                   │
│  🔍 Filter: [All Stories ▾]  [🤖 Agent: All ▾]  [Epic: All ▾]    [+ New Story] │
│                                                                                   │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┐         │
│   BACKLOG       │   TODO          │  IN PROGRESS    │     DONE        │         │
│   ───────       │   ────          │  ──────────     │     ────        │         │
│                 │                 │                 │                 │         │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │         │
│ │ story-9-2   │ │ │ story-8-1   │ │ │ story-8-3   │ │ │ story-8-2   │ │         │
│ │ Auth UI     │ │ │ Workflow    │ │ │ Context Mgr │ │ │ Q&A Dialog  │ │         │
│ │ Component   │ │ │ Engine Core │ │ │             │ │ │ Component   │ │         │
│ │             │ │ │             │ │ │ 🤖 Dev      │ │ │             │ │         │
│ │ Epic 9      │ │ │ Epic 8      │ │ │             │ │ │ ✅ Complete │ │         │
│ │ [Start]     │ │ │ [▶ Start]   │ │ │ ⏸️ [Pause]   │ │ │             │ │         │
│ └─────────────┘ │ └─────────────┘ │ │             │ │ └─────────────┘ │         │
│                 │                 │ │ 🔄 Running  │ │                 │         │
│ ┌─────────────┐ │ ┌─────────────┐ │ │ Context...  │ │ ┌─────────────┐ │         │
│ │ story-9-3   │ │ │ story-8-4   │ │ │ ████░░ 75%  │ │ │ story-7-1   │ │         │
│ │ Login Flow  │ │ │ Agent Panel │ │ │             │ │ │ DB Schema   │ │         │
│ │             │ │ │             │ │ │ [View ▶]    │ │ │             │ │         │
│ │ Epic 9      │ │ │ Epic 8      │ │ └─────────────┘ │ │ ✅ Complete │ │         │
│ │ [Start]     │ │ │ [▶ Start]   │ │                 │ │             │ │         │
│ └─────────────┘ │ └─────────────┘ │ ┌─────────────┐ │ └─────────────┘ │         │
│                 │                 │ │ story-7-2   │ │                 │         │
│ 3 stories       │ 2 stories       │ │ Seed Data   │ │ 2 stories       │         │
│                 │                 │ │             │ │                 │         │
│                 │                 │ │ 🤖 Architect│ │                 │         │
│                 │                 │ │             │ │                 │         │
│                 │                 │ │ 🔄 Designing│ │                 │         │
│                 │                 │ │ Schema...   │ │                 │         │
│                 │                 │ │ ████████ 90%│ │                 │         │
│                 │                 │ │             │ │                 │         │
│                 │                 │ │ [View ▶]    │ │                 │         │
│                 │                 │ └─────────────┘ │                 │         │
│                 │                 │                 │                 │         │
│                 │                 │ 2 stories       │                 │         │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘         │
│                                                                                   │
│  💡 Tip: Drag stories to start them. Click [▶ Start] to launch agent workflow   │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **4-column kanban** (BACKLOG → TODO → IN PROGRESS → DONE)
- **Agent assignment visible** on cards (shows which agent is working)
- **Real-time progress** indicators (percentage, status updates)
- **Drag-and-drop** story management
- **Filters** (by agent, epic, story type)
- **Agent status on cards** (🟢 Active, 🔄 Running, ⏸️ Paused)

**User Flow:**
1. User navigates to Kanban view
2. Sees all stories across phases
3. Clicks [+ New Story] → Opens Structured Exploration wizard
4. Drags story to IN PROGRESS → Exploration dialog: "Launch dev-story workflow? [Explore] [Start] [Configure]"
5. Monitors multiple agents in parallel (Dev on story-8-3, Architect on story-7-2)
6. Clicks [View ▶] to see detailed agent activity

**Structured Exploration Integration:**
- [+ New Story] → Wizard with exploration at each step (epic selection, type, scope, agent)
- Drag to IN PROGRESS → Confirms workflow launch with exploration option
- [▶ Start] button → Opens exploration: "Ready to implement story-8-1? [Explore context] [Start immediately] [Configure]"

**BMAD Mapping:**
- Stories = Individual workflow executions (dev-story, create-story, etc.)
- Agents = BMAD agents (Dev, Architect, Analyst, etc.)
- Kanban columns = Story lifecycle states

---

## Screen 3: Story Detail + Agent Orchestration

**Context:** Clicked "View" on story-8-3 from Kanban
**Purpose:** Deep dive into story, monitor agent activity, view context, chat with agent

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Kanban    📋 story-8-3: Context Manager                      [@fahad ▾]       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │ 📋 Story Details                                          [Edit] [⋮] │        │
│  ├─────────────────────────────────────────────────────────────────────┤        │
│  │                                                                       │        │
│  │ Title: Implement Context Manager for Agent Orchestration            │        │
│  │ Epic: Epic 8 - Workflow Engine Core                                 │        │
│  │ Status: IN PROGRESS  │  Priority: HIGH  │  Points: 5               │        │
│  │                                                                       │        │
│  │ Description:                                                          │        │
│  │ Build context management system that tracks what files/data          │        │
│  │ each agent needs. Implements context transparency panel.             │        │
│  │                                                                       │        │
│  │ Acceptance Criteria:                                                 │        │
│  │ ✅ Context store with file tracking                                  │        │
│  │ 🔄 Context API for agent queries                                     │        │
│  │ ⚪ UI panel showing active context                                    │        │
│  │ ⚪ Tests for context resolution                                       │        │
│  │                                                                       │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │ 🤖 Agent: Dev                                            🟢 Active   │        │
│  ├─────────────────────────────────────────────────────────────────────┤        │
│  │                                                                       │        │
│  │ Current Task: Implementing context API                               │        │
│  │ Progress: ████████████████░░░░ 75%                                   │        │
│  │                                                                       │        │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │        │
│  │ │ 📂 Context in Use                                    [Expand ▾] │ │        │
│  │ ├─────────────────────────────────────────────────────────────────┤ │        │
│  │ │ • apps/server/src/context/manager.ts                           │ │        │
│  │ │ • apps/server/src/context/store.ts                             │ │        │
│  │ │ • packages/types/src/context.ts                                │ │        │
│  │ │ • docs/architecture/context-design.md                          │ │        │
│  │ └─────────────────────────────────────────────────────────────────┘ │        │
│  │                                                                       │        │
│  │ Recent Actions:                                                       │        │
│  │ • 14:32 - Created ContextManager class                               │        │
│  │ • 14:28 - Added context resolution logic                             │        │
│  │ • 14:15 - Implemented file tracking                                  │        │
│  │                                                                       │        │
│  │ [⏸️ Pause Agent]  [💬 Open Chat]  [📊 View Full Context]            │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │ 💬 Agent Conversation                              [Minimize ▾]     │        │
│  ├─────────────────────────────────────────────────────────────────────┤        │
│  │                                                                       │        │
│  │ DEV  14:30 PM                                                        │        │
│  │ I'm implementing the ContextManager class. Should I use a            │        │
│  │ centralized store or distributed context per agent?                  │        │
│  │                                                                       │        │
│  │ YOU  14:31 PM                                                        │        │
│  │ Use centralized store - easier to track cross-agent context         │        │
│  │                                                                       │        │
│  │ DEV  14:32 PM                                                        │        │
│  │ ✅ Implemented centralized ContextStore with file tracking.          │        │
│  │ Moving to API layer next.                                            │        │
│  │                                                                       │        │
│  │ ┌───────────────────────────────────────────────────────────────┐   │        │
│  │ │ Type your message...                                          │   │        │
│  │ └───────────────────────────────────────────────────────────────┘   │        │
│  │                                                                       │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Story metadata** (title, epic, status, priority, points)
- **Acceptance criteria tracking** (✅ done, 🔄 in progress, ⚪ pending)
- **Agent activity panel** with:
  - Current task description
  - Progress percentage
  - Context transparency (files being used)
  - Recent actions timeline
- **Embedded agent chat** for real-time Q&A
- **Control buttons** (pause, open chat, view full context)

**User Flow:**
1. User clicks [View ▶] on story card in Kanban
2. Sees detailed story information
3. Monitors agent activity in real-time
4. Clicks "Context in Use" to see what files agent is accessing
5. Agent asks question → Structured Exploration dialog appears with options
6. User explores options conversationally before selecting
7. Opens chat to ask questions or provide guidance
8. Agent responds and adjusts implementation based on user input

**Structured Exploration Integration:**
- Agent questions appear as Structured Exploration lists with [Explore] [Select] [Reject] buttons
- Technical decisions (library choice, architecture pattern, etc.) trigger exploration dialogs
- User can explore multiple options conversationally before committing to one
- Example: "Which state management? Redux [Explore] | Zustand [Explore] | Jotai [Explore]"

**BMAD Mapping:**
- Story = dev-story workflow execution
- Agent = BMAD agent (Dev, Architect, etc.)
- Context panel = BMAD's context management system
- Chat = Interactive `<ask>` tag responses

---

## Screen 4: Workflow Execution - Artifact Refinement

**Context:** User executing product-brief workflow (Phase 1 - Analysis)
**Purpose:** Collaborative document creation with question/answer flow and real-time preview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ARTIFACT_CHAT                                      ARTIFACT                      │
│ Collaborative document creation                   Version 3 of 5                │
├────────────────────────────────────────┬──────────────────────────────────────┤
│                                        │                                        │
│ Version 3  ● 3:47 PM                  │  # Product Brief: chiron               │
│      Refinement 3                      │                                        │
│                                        │  ## Target Users                       │
│ ┌────────────────────────────────────┐ │                                        │
│ │ USER  3:45 PM                      │ │  ### Primary User Segment             │
│ │ refine target users section        │ │                                        │
│ │                [Edit]               │ │  **Who:** Solo engineers and small    │
│ └────────────────────────────────────┘ │  teams (2-5 people) building complex  │
│                                        │  AI-powered products using structured  │
│ ASSISTANT  3:46 PM                     │  methodologies                         │
│                                        │                                        │
│ 🤔 REASONING                      [▾]  │  **Experience Level:** Intermediate to │
│                                        │  senior engineers comfortable with:    │
│ To refine the target users section,   │  - AI coding agents (Claude Code,     │
│ I need more information...             │  Cursor, Copilot)                     │
│                                        │  - Modern dev workflows (Git, CI/CD)  │
│ 📋 TOOL CALLS (3)                 [▾]  │  - PM tools (Jira, Linear)            │
│                                        │                                        │
│ Please answer these questions:         │  **Context:**                          │
│                                        │  - Working on greenfield projects or  │
│ ─── REQUIRE ACTION (4) ─────────────   │  major feature development            │
│                                        │  - Managing 2-10 concurrent stories   │
│ ✅ Primary user role/title?            │  - Need structure but hate overhead   │
│    Answer: Senior Engineer             │  - Value quality and methodology      │
│                                        │                                        │
│ 🔄 Experience level expectations?      │  **Pain Points:**                      │
│    [Answer] [Clarify] [Ignore]         │  - Juggling multiple agents manually  │
│                                        │  - Lost in complex workflows          │
│ ⚪ Team size typical?                  │  - No visibility into agent progress  │
│    [Answer] [Clarify] [Ignore]         │  - Context switching overhead         │
│                                        │  - Repository pollution from workflow │
│ ⚪ Current tools they use?             │  metadata                             │
│    [Answer] [Clarify] [Ignore]         │                                        │
│                                        │  **Goals:**                            │
│ ────────────────────────────────────   │  - 2x productivity with AI agents     │
│                                        │  - Maintain quality and control       │
│ ASSISTANT  3:47 PM                     │  - Learn structured methodology       │
│                                        │  - Ship features faster               │
│ Great! Let me process your             │                                        │
│ selections and refine the section.     │  ### User Journey: Feature Request    │
│                                        │  to Deployment                         │
│                                        │                                        │
│ Please complete the questions above    │  **Entry Point:** Project dashboard   │
│ before continuing...                   │                                        │
│                                        │  **1. Initiation**                     │
│ ┌────────────────────────────────────┐ │  Engineer opens Chiron dashboard...   │
│ │ 💬 Type @ to add context files...  │ │                                        │
│ └────────────────────────────────────┘ │  [To be completed...]                 │
│           📎 Context  GPT-4  [↑]       │                                        │
│                                        │                                        │
│  [History]  [Refine]                   │  [History]  [Export]                  │
└────────────────────────────────────────┴──────────────────────────────────────┘
```

**Key Features:**
- **Split-panel layout** (chat left, artifact right)
- **Version tracking** (Version 3 ● 3:47 PM shows when this version was created)
- **Question state machine**:
  - ✅ Answered questions (green checkmark)
  - 🔄 In-progress questions (orange indicator)
  - ⚪ Pending questions (white circle)
- **Action buttons** per question: [Answer] [Clarify] [Ignore]
- **REQUIRE ACTION section** blocks progress until completed
- **Real-time artifact updates** (right panel shows live document state)
- **Collapsible reasoning/tool calls** (🤔 REASONING, 📋 TOOL CALLS)
- **Context attachment** (@mention files)
- **Progress indicator** on Refine button (not shown but would show "Refine ██░░ 50%")

**User Flow:**
1. User starts workflow (e.g., product-brief)
2. Agent asks questions via REQUIRE ACTION section with Structured Exploration options
3. User clicks [Answer] → opens Structured Exploration dialog if options available
4. User can [Explore] each option conversationally, then [Select]
5. For open-ended questions, user types answer → agent validates → marks question ✅
6. Artifact updates in real-time (right panel)
7. User continues until all questions answered
8. Click [Refine] → generates next version with all inputs
9. Version marker appears in chat (Version 4 ● 3:52 PM)
10. Repeat until user satisfied

**Structured Exploration Enhancement:**
- Questions with predefined options (e.g., "Experience level expectations?") show as exploration lists
- User can explore "Beginner", "Intermediate", "Advanced" conversationally before selecting
- Open-ended questions remain text input but agent may suggest options based on context
- Example: "Primary user role?" → Agent suggests: Product Manager [Explore] | Engineer [Explore] | Designer [Explore] | Other [Type custom]

**BMAD Mapping:**
- Split panel = Artifact chat (workflow execution) + artifact preview
- REQUIRE ACTION = BMAD's `<ask>` tags requiring user input
- Version markers = BMAD's `<template-output>` checkpoints
- Questions = Variable resolution from workflow.yaml
- Refine button progress = Workflow step completion percentage

---

## Screen 5: Sprint Planning

**Context:** Starting Phase 4 - Implementation (run once when entering implementation phase)
**Purpose:** Prioritize epics, estimate effort, set sprint goals using Structured Exploration pattern
**BMAD Workflow:** `sprint-planning` (sm agent)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Dashboard    🗓️ Sprint Planning                                [@fahad ▾]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  🎯 chiron - Sprint Planning                               Phase: 4-Implementation│
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                                   │
│  📋 Step 1 of 4: Epic Prioritization                                             │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ SM AGENT:                                                             │      │
│  │ You have 3 epics ready for implementation. Let's prioritize them     │      │
│  │ based on dependencies, business value, and technical risk.            │      │
│  │                                                                         │      │
│  │ Which epic should we tackle first?                                    │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ ⚪ Epic 7: Core Workflow Engine                                       │      │
│  │    Foundation for agent orchestration, must go first                  │      │
│  │    Effort: 2 weeks  |  Risk: Medium  |  Value: Critical              │      │
│  │    Dependencies: None                                                 │      │
│  │                                                                         │      │
│  │    [Explore] [Select] [Defer]                                         │      │
│  ├───────────────────────────────────────────────────────────────────────┤      │
│  │ ⚪ Epic 8: Agent Coordination                                         │      │
│  │    Multi-agent orchestration and context management                   │      │
│  │    Effort: 3 weeks  |  Risk: High  |  Value: High                    │      │
│  │    Dependencies: Epic 7 (Core Workflow Engine)                        │      │
│  │                                                                         │      │
│  │    [Explore] [Select] [Defer]                                         │      │
│  ├───────────────────────────────────────────────────────────────────────┤      │
│  │ ⚪ Epic 9: Authentication System                                      │      │
│  │    User auth, Better-Auth integration, password reset                │      │
│  │    Effort: 1 week  |  Risk: Low  |  Value: Medium                    │      │
│  │    Dependencies: None (can run in parallel)                           │      │
│  │                                                                         │      │
│  │    [Explore] [Select] [Defer]                                         │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  💡 Click [Explore] to discuss dependencies, risks, and tradeoffs with SM       │
│                                                                                   │
│  [Cancel]                                                    [Next: Estimation →]│
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Exploration Dialog (User clicked [Explore] on Epic 8)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ EXPLORE: Epic 8 - Agent Coordination                                      [X]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  SM AGENT:                                                                       │
│  Let me explain why Epic 8 is important and what it entails.                    │
│                                                                                   │
│  **What it includes:**                                                           │
│  • Context management system (tracks what files each agent needs)               │
│  • Agent workspace isolation (prevents conflicts)                               │
│  • Handoff coordination (agents pass context to next agent)                     │
│  • Real-time monitoring (see what agents are doing)                             │
│                                                                                   │
│  **Why effort is 3 weeks:**                                                      │
│  • Context system is complex (needs efficient caching, updates)                 │
│  • Agent isolation requires careful architecture                                │
│  • Testing multi-agent scenarios takes time                                     │
│                                                                                   │
│  **Why risk is HIGH:**                                                           │
│  • Novel problem - not many references for multi-agent coordination             │
│  • Performance critical (can't slow down agents)                                │
│  • Edge cases are hard to predict until we test                                 │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ YOU:                                                                   │      │
│  │ Can we split this epic to reduce risk? Maybe do context management   │      │
│  │ first, then agent isolation later?                                    │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  SM AGENT:                                                                       │
│  Great idea! Yes, we could split this into:                                     │
│                                                                                   │
│  **Epic 8A: Context Management (1.5 weeks, Medium risk)**                       │
│  • Context store, context API, file tracking                                    │
│  • Depends on: Epic 7                                                            │
│  • Value: High (enables transparency features)                                  │
│                                                                                   │
│  **Epic 8B: Agent Isolation (1.5 weeks, Medium risk)**                          │
│  • Workspace isolation, concurrent execution                                    │
│  • Depends on: Epic 8A                                                           │
│  • Value: Medium (parallel agent execution)                                     │
│                                                                                   │
│  This reduces risk per epic and delivers value incrementally. Want me to        │
│  split it?                                                                       │
│                                                                                   │
│  [Split Epic] [Keep Original] [Continue Discussion]                             │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ 💬 Type your message...                                                │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  [✓ Select Epic 8] [✗ Defer Epic] [Close]                                      │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### After Selection - Step 2: Sprint Capacity

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Back    🗓️ Sprint Planning                                     [@fahad ▾]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  📋 Step 2 of 4: Sprint Capacity                                                 │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ SM AGENT:                                                             │      │
│  │ You've selected Epic 7 for Sprint 1. Let's estimate capacity.        │      │
│  │                                                                         │      │
│  │ How much time can you dedicate to this sprint?                        │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ ⚪ Full-time (40 hours/week)                                          │      │
│  │    Complete Epic 7 in 2 weeks                                         │      │
│  │    [Explore] [Select]                                                  │      │
│  ├───────────────────────────────────────────────────────────────────────┤      │
│  │ ⚪ Part-time (20 hours/week)                                          │      │
│  │    Complete Epic 7 in 4 weeks                                         │      │
│  │    [Explore] [Select]                                                  │      │
│  ├───────────────────────────────────────────────────────────────────────┤      │
│  │ ⚪ Side project (10 hours/week)                                       │      │
│  │    Complete Epic 7 in 8 weeks                                         │      │
│  │    [Explore] [Select]                                                  │      │
│  ├───────────────────────────────────────────────────────────────────────┤      │
│  │ ⚪ Custom                                                              │      │
│  │    Define your own capacity                                           │      │
│  │    [Define]                                                            │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  [← Previous]                                               [Next: Story Breakdown →]│
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Step 3: Story Breakdown Preview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Back    🗓️ Sprint Planning                                     [@fahad ▾]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  📋 Step 3 of 4: Story Breakdown                                                 │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ SM AGENT:                                                             │      │
│  │ Epic 7 will be broken down using tech-spec workflow. Here's preview: │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  Epic 7: Core Workflow Engine                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                                   │
│  Estimated Stories (will be generated by tech-spec workflow):                    │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │ story-7-1: Workflow YAML parser                           3 points  │        │
│  │ story-7-2: Workflow execution engine                      5 points  │        │
│  │ story-7-3: Variable resolution system                     3 points  │        │
│  │ story-7-4: Template output handler                        2 points  │        │
│  │ story-7-5: Workflow validation                            2 points  │        │
│  │                                                                       │        │
│  │ Total: ~15 points (2 weeks at full-time pace)                       │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                   │
│  💡 Actual stories will be created by tech-spec workflow (JIT, just-in-time)    │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ When should tech-spec run?                                            │      │
│  ├───────────────────────────────────────────────────────────────────────┤      │
│  │ ⚪ Now (generate stories immediately)                                 │      │
│  │    Stories ready before sprint starts                                │      │
│  │    [Explore] [Select]                                                  │      │
│  │                                                                         │      │
│  │ ⚪ Just-in-time (when sprint starts)                                  │      │
│  │    More flexibility, stories may change based on learning             │      │
│  │    [Explore] [Select]                                                  │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  [← Previous]                                                    [Next: Review →]│
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Step 4: Sprint Review & Launch

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Back    🗓️ Sprint Planning                                     [@fahad ▾]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  📋 Step 4 of 4: Review & Launch                                                 │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ ✅ Sprint 1 Configuration                                             │      │
│  ├───────────────────────────────────────────────────────────────────────┤      │
│  │                                                                         │      │
│  │ **Sprint Goal:**                                                       │      │
│  │ Build core workflow engine to enable BMAD workflow execution          │      │
│  │                                                                         │      │
│  │ **Selected Epics:**                                                    │      │
│  │ • Epic 7: Core Workflow Engine (2 weeks, ~15 points)                 │      │
│  │                                                                         │      │
│  │ **Capacity:**                                                          │      │
│  │ • Full-time (40 hours/week)                                           │      │
│  │ • 2-week sprint (80 hours total)                                      │      │
│  │                                                                         │      │
│  │ **Story Generation:**                                                  │      │
│  │ • Just-in-time (tech-spec runs when sprint starts)                   │      │
│  │ • Expected: 5 stories                                                  │      │
│  │                                                                         │      │
│  │ **Agents Involved:**                                                   │      │
│  │ • Architect (tech-spec generation)                                    │      │
│  │ • SM (story management, context)                                      │      │
│  │ • Dev (implementation)                                                │      │
│  │                                                                         │      │
│  │ **Next Steps:**                                                        │      │
│  │ 1. Launch tech-spec workflow (Architect agent)                        │      │
│  │ 2. Generate 5 stories for Epic 7                                      │      │
│  │ 3. Add stories to Kanban board                                        │      │
│  │ 4. Begin sprint                                                        │      │
│  │                                                                         │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  ✅ Looks good    [✏️ Edit]    [❌ Start Over]                                  │
│                                                                                   │
│  [🚀 Initialize Sprint]                                                          │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **4-step wizard** (Epic Prioritization → Capacity → Story Breakdown → Review)
- **Structured Exploration everywhere** - each decision point has [Explore] [Select] buttons
- **Conversational exploration** - users can discuss dependencies, risks, tradeoffs with SM agent
- **Epic splitting capability** - SM suggests breaking large epics into smaller ones during exploration
- **Capacity estimation** - realistic timeline based on user availability
- **JIT story generation** - tech-spec runs just-in-time or immediately, user chooses
- **Clear review step** - shows everything before launching sprint

**User Flow:**
1. User enters Sprint Planning from dashboard (Phase 4 initialization)
2. Step 1: Reviews epics, explores dependencies via conversational dialog, selects priority
3. Step 2: Defines capacity (full-time, part-time, side project, custom)
4. Step 3: Reviews story breakdown preview, decides when to generate stories
5. Step 4: Reviews sprint configuration, launches sprint
6. SM agent launches tech-spec workflow → generates stories → adds to Kanban
7. User returns to dashboard with sprint initialized

**Structured Exploration Showcase:**
- **Epic prioritization** - explore dependencies, risks, business value
- **Capacity estimation** - explore timeline impacts of different capacities
- **Story generation timing** - explore tradeoffs of now vs just-in-time
- **Epic splitting** - conversational exploration leads to better epic breakdown
- All decisions informed by agent expertise, not blind selection

**BMAD Mapping:**
- Sprint Planning = phase 4 initialization workflow (run once)
- SM agent = orchestrator for sprint setup
- tech-spec workflow = JIT epic → stories generation
- Structured Exploration = guided decision-making with expert input

---

## Screen 6: Create Epic Wizard

**Context:** User wants to create a new epic (launched from Dashboard or Kanban [+ New Epic] button)
**Purpose:** Guided epic creation with Structured Exploration at each step
**User Type:** Works for both power users (fast) and new users (educational)

### Step 1: Epic Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Back    📋 Create New Epic                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Let's create a new epic! I'll guide you through the process.                   │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ Step 1 of 3: Epic Overview                                            │      │
│  ├───────────────────────────────────────────────────────────────────────┤      │
│  │                                                                         │      │
│  │ What feature or capability are you building?                           │      │
│  │                                                                         │      │
│  │ ┌─────────────────────────────────────────────────────────────────┐   │      │
│  │ │ e.g., "User authentication", "Payment processing", etc.         │   │      │
│  │ │                                                                 │   │      │
│  │ │ Authentication system with Better-Auth                          │   │      │
│  │ └─────────────────────────────────────────────────────────────────┘   │      │
│  │                                                                         │      │
│  │ 💡 Tip: Be specific but concise. This will help Chiron understand     │      │
│  │    what workflows and agents to suggest.                               │      │
│  │                                                                         │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  [Cancel]                                               [Next: Requirements →]   │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Step 2: Requirements with Structured Exploration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Back    📋 Create New Epic - Authentication System                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ Step 2 of 3: Requirements                                             │      │
│  ├───────────────────────────────────────────────────────────────────────┤      │
│  │                                                                         │      │
│  │ Great! Let's understand what you need. I'll ask key questions.        │      │
│  │                                                                         │      │
│  │ 🤔 REASONING                      [▾]                                  │      │
│  │ Authentication typically needs: login, signup, password management,    │      │
│  │ session handling, and security measures. Let me ask a few questions.   │      │
│  │                                                                         │      │
│  │ ─── REQUIRE ACTION (3) ─────────────                                  │      │
│  │                                                                         │      │
│  │ ✅ What authentication methods do you need?                           │      │
│  │    Selected: Email/password, Password reset                            │      │
│  │                                                                         │      │
│  │ 🔄 Will you use an auth library?                                      │      │
│  │    ⚪ Better-Auth (Recommended for Tauri)                             │      │
│  │       Modern, type-safe, works with desktop apps                       │      │
│  │       [Explore] [Select]                                                │      │
│  │    ⚪ Auth.js                                                          │      │
│  │       Popular, web-focused, large ecosystem                            │      │
│  │       [Explore] [Select]                                                │      │
│  │    ⚪ Build from scratch                                               │      │
│  │       Full control, more time required                                 │      │
│  │       [Explore] [Select]                                                │      │
│  │                                                                         │      │
│  │ ⚪ Additional features needed?                                         │      │
│  │    [Answer] [Skip]                                                     │      │
│  │                                                                         │      │
│  │ 💡 Tip: Click [Explore] to understand tradeoffs before selecting      │      │
│  │                                                                         │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  [← Previous]                                                   [Next: Review →]│
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Exploration Dialog (User clicked [Explore] on Better-Auth)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ EXPLORE: Better-Auth                                                      [X]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ARCHITECT:                                                                      │
│  Let me explain why Better-Auth is a good fit for Chiron.                      │
│                                                                                   │
│  **What is Better-Auth?**                                                        │
│  • Modern auth library built for TypeScript                                     │
│  • Works seamlessly with Tauri desktop apps                                     │
│  • Supports email/password, OAuth, magic links                                  │
│  • Built-in session management                                                   │
│                                                                                   │
│  **Why it's recommended:**                                                       │
│  • ✅ Type-safe (full TypeScript support)                                       │
│  • ✅ Desktop-friendly (works with Tauri's security model)                      │
│  • ✅ Fast setup (~1 week for basic auth)                                       │
│  • ✅ Good documentation and examples                                           │
│                                                                                   │
│  **Tradeoffs:**                                                                  │
│  • ❌ Smaller ecosystem than Auth.js                                            │
│  • ❌ Less community resources                                                  │
│                                                                                   │
│  **Cost:**                                                                       │
│  • Free and open-source                                                          │
│  • Self-hosted (no vendor fees)                                                  │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ YOU:                                                                   │      │
│  │ How does it compare to Auth.js for our use case?                     │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  ARCHITECT:                                                                      │
│  Great question! For Chiron specifically:                                       │
│                                                                                   │
│  **Better-Auth advantages:**                                                     │
│  • Tauri integration is smoother (Better-Auth designed for it)                  │
│  • Simpler API for desktop apps                                                  │
│  • Better TypeScript inference                                                   │
│                                                                                   │
│  **Auth.js advantages:**                                                         │
│  • More OAuth providers out-of-box                                              │
│  • Larger community (more Stack Overflow answers)                               │
│  • Better for web-first applications                                            │
│                                                                                   │
│  For Chiron (Tauri desktop app), I recommend Better-Auth. It'll save time.     │
│                                                                                   │
│  [✓ Select Better-Auth] [Compare with Auth.js] [Continue Discussion]           │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ 💬 Type your message...                                                │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  [Close]                                                                         │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Step 3: Review & Launch

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Back    📋 Create New Epic                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │ Step 3 of 3: Review & Launch                                          │      │
│  ├───────────────────────────────────────────────────────────────────────┤      │
│  │                                                                         │      │
│  │ ✅ Epic Summary                                                        │      │
│  │                                                                         │      │
│  │ Epic 10: Authentication System                                         │      │
│  │ Description: Implement user authentication using Better-Auth library   │      │
│  │              with email/password and password reset.                   │      │
│  │                                                                         │      │
│  │ Chiron will:                                                           │      │
│  │ 1. Generate technical specification (Architect agent)                  │      │
│  │ 2. Break down into estimated 4 stories:                               │      │
│  │    • story-10-1: Better-Auth setup & configuration                    │      │
│  │    • story-10-2: Email/password authentication                        │      │
│  │    • story-10-3: Password reset flow                                  │      │
│  │    • story-10-4: Session management                                   │      │
│  │ 3. Add stories to Kanban board (BACKLOG column)                       │      │
│  │                                                                         │      │
│  │ Estimated timeline: 1 week with agent assistance                      │      │
│  │                                                                         │      │
│  │ ✅ Looks good    [✏️ Edit]    [❌ Start Over]                          │      │
│  │                                                                         │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
│  [🚀 Create Epic & Generate Tech Spec]                                          │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### After Creation - Success Confirmation

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ✅ Epic 10 created: Authentication System                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  🤖 Architect agent launching → Creating tech spec...                           │
│                                                                                   │
│  📋 Epic added to sprint backlog                                                 │
│  📋 Stories will be generated after tech spec completes (~10 minutes)           │
│                                                                                   │
│  What would you like to do?                                                      │
│                                                                                   │
│  [View Kanban]  [Monitor Architect Agent]  [Return to Dashboard]               │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **3-step wizard** (Overview → Requirements → Review)
- **Structured Exploration integrated** - technical decisions have [Explore] buttons
- **Educational exploration dialogs** - agents explain options, tradeoffs, recommendations
- **Requirements gathering** with predefined exploration options
- **Clear review step** - shows exactly what will happen
- **Estimated timeline** - sets expectations
- **Immediate action** - launches tech-spec workflow right away

**User Flow:**
1. Click [+ New Epic] from Dashboard or Kanban
2. Step 1: Enter epic name (30 seconds)
3. Step 2: Answer questions, explore options via Structured Exploration (2-3 minutes)
4. Step 3: Review and launch (30 seconds)
5. Architect agent generates tech-spec → SM creates stories → Stories appear in Kanban
6. **Total time: 3-4 minutes** from idea to epic with stories

**Structured Exploration Showcase:**
- **Library selection** - explore Better-Auth vs Auth.js with expert comparison
- **Feature selection** - explore which auth features to include
- **Timeline estimation** - understand effort based on selections
- All decisions informed by conversational agent expertise

**Works for Both User Types:**
- **Power users** - Skip exploration, make fast selections, 30-60 seconds total
- **New users** - Explore every option, learn best practices, 3-5 minutes total
- Same wizard adapts to user speed

**BMAD Mapping:**
- Create Epic Wizard = Guided epic creation flow
- Structured Exploration = Agent-assisted decision-making
- tech-spec workflow = Automatic story generation from epic
- Architect agent = Technical design and story breakdown

---

## Design Patterns Summary

### Pattern 1: Structured Exploration Lists (NEW - Core Pattern)

**Core Philosophy:** Every decision point in Chiron should offer exploration before commitment.

```
┌─────────────────────────────────────┐
│ ⚪ Option 1                         │
│    Brief description                │
│    [Explore] [Select] [Reject]     │
│ ⚪ Option 2                         │
│    Brief description                │
│    [Explore] [Select] [Reject]     │
└─────────────────────────────────────┘
```

**When user clicks [Explore]:**
- Opens conversational dialog with relevant agent (Architect, SM, Analyst)
- User can ask questions, discuss tradeoffs, understand implications
- Agent provides expert guidance based on project context
- User can explore multiple options before selecting
- Example: "Compare Better-Auth vs Auth.js for my Tauri app"

**Applied Throughout:**
- Dashboard: Next action selection
- Sprint Planning: Epic prioritization, capacity estimation
- Create Epic Wizard: Library selection, feature choices
- Story Detail: Technical decisions during implementation
- Artifact Refinement: Question answering with predefined options

---


### Pattern 2: Context Transparency
- Always show what files/context agents are using
- Real-time updates on agent activity
- Clear indication of what's happening and why

### Pattern 3: Progressive Disclosure
- Collapsible sections (🤔 REASONING, 📋 TOOL CALLS)
- Expandable context panels
- Details on demand, not overwhelming by default

### Pattern 4: Question State Machine
- ⚪ Pending → 🔄 In Progress → ✅ Answered
- Three actions: [Answer] [Clarify] [Ignore]
- REQUIRE ACTION blocks progress until resolved

### Pattern 5: Real-time Artifact Updates
- Split-panel layout (chat + artifact)
- Version markers show checkpoints
- Live preview as user answers questions

### Pattern 6: Agent Orchestration
- Visual representation of agent activity
- Embedded chat for human-agent collaboration
- Pause/resume/monitor controls

### Pattern 7: PM-Grade Workflow
- Kanban boards (drag-and-drop)
- Story lifecycle (BACKLOG → TODO → IN PROGRESS → DONE)
- Epic/story hierarchy
- Acceptance criteria tracking

---

## Next Steps

1. **Validate with BMAD agent** - Ensure workflows/patterns align with actual BMAD implementation
2. **High-fidelity mockups** - Convert ASCII to visual designs (Figma/v0)
3. **Interactive prototype** - Build clickable prototype for user testing
4. **Technical feasibility** - Validate with engineering team

---

## Additional Wireframes: Structured Exploration Lists Pattern

### Technology Selection Workflow

**Main View:**
```
┌─────────────────────────────────────────────────────┐
│ Background Jobs Technology Selection                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ⚪ BullMQ                                           │
│    Redis-based, battle-tested, great UI            │
│    [Explore] [Select] [Reject]                     │
│                                                     │
│ ⚪ Inngest                                          │
│    Serverless-first, built-in observability        │
│    [Explore] [Select] [Reject]                     │
│                                                     │
│ ⚪ Temporal                                         │
│    Workflow engine, handles complex flows          │
│    [Explore] [Select] [Reject]                     │
└─────────────────────────────────────────────────────┘
```

**Exploration Dialog (BullMQ):**
```
┌─────────────────────────────────────────────────────┐
│ EXPLORE: BullMQ                              [X]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ARCHITECT:                                          │
│ BullMQ is a Redis-backed queue. Great for:         │
│ • High-throughput job processing                   │
│ • Delayed/scheduled jobs                           │
│ • Job prioritization                               │
│                                                     │
│ USER:                                               │
│ What about cost? We're on a tight budget           │
│                                                     │
│ ARCHITECT:                                          │
│ Good question! With BullMQ you need:               │
│ • Redis hosting (~$10-50/month)                    │
│ • Self-managed (no platform fees)                  │
│                                                     │
│ For your scale, $10/month Redis works fine.        │
│                                                     │
│ [Conversational exploration continues...]          │
│                                                     │
│ [✓ Select BullMQ] [✗ Reject] [≈ Compare]          │
└─────────────────────────────────────────────────────┘
```

**After Selection:**
```
┌─────────────────────────────────────────────────────┐
│ Background Jobs Technology Selection                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✅ BullMQ                        SELECTED          │
│    Redis-based, $10/month, scales to 100k jobs    │
│    [View Discussion] [Change Selection]            │
│                                                     │
│ ⚪ Inngest                                          │
│    [Explore] [Reject]                              │
│                                                     │
│ ⚪ Temporal                                         │
│    [Explore] [Reject]                              │
└─────────────────────────────────────────────────────┘
```

---

**Document Version:** 2.0
**Last Updated:** 2025-10-31
**Status:** Refined - Structured Exploration Lists pattern integrated across all screens
**Next:** Validate with product brief Target Users section, then create high-fidelity mockups
