# Step Execution Wireframes

**Companion to:** `step-execution-layout-system.md`  
**Format:** ASCII wireframes with implementation notes

---

## Table of Contents

1. [Shell Wireframes](#shell-wireframes)
2. [Step Type Wireframes](#step-type-wireframes)
3. [State Variations](#state-variations)
4. [Responsive Variants](#responsive-variants)

---

## Shell Wireframes

### 1. Wizard Shell

Linear multi-step flow with horizontal progress.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ●━━━━━●━━━━━◯━━━━━◯━━━━━◯                                                    ┃
┃  Setup   Config   Confirm  Complete                                          ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                              ┃
┃                                                                              ┃
┃                    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓                       ┃
┃                    ┃                                  ┃                       ┃
┃                    ┃   [Step Content Here]            ┃                       ┃
┃                    ┃                                  ┃                       ┃
┃                    ┃   Centered, max-width: 672px     ┃                       ┃
┃                    ┃                                  ┃                       ┃
┃                    ┃   Vertically centered when       ┃                       ┃
┃                    ┃   content is short               ┃                       ┃
┃                    ┃                                  ┃                       ┃
┃                    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛                       ┃
┃                                                                              ┃
┃                                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key measurements:**
- Stepper height: 80px (py-6, gap-3)
- Step content: max-w-2xl (672px)
- Vertical: flex items-center justify-center

---

### 2. Workbench Shell (Focused Mode)

Split pane with timeline left, artifact right.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Project > Brainstorm > Step 2/5                    [Browse History] [Theme] ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                        ┃                                     ┃
┃  ┌─ Step 2 ─────────────────────────┐  ┃  ┌─ Artifact Preview ─────────────┐ ┃
┃  │ Define Session Parameters        │  ┃  │                                │ ┃
┃  │ agent · ◐ In Progress            │  ┃  │  # Brainstorm Session          │ ┃
┃  └──────────────────────────────────┘  ┃  │                                │ ┃
┃                                        ┃  │  ## Topic                      │ ┃
┃  [Chat/Step Content Area]              ┃  │  AI-powered scheduling         │ ┃
┃                                        ┃  │                                │ ┃
┃  ┌──────────────────────────────────┐  ┃  │  ## Goals                      │ ┃
┃  │ Agent is thinking...             │  ┃  │  - Automate calendar           │ ┃
┃  │ ░░░░░░░░░░░░░░░░░                │  ┃  │  - Reduce conflicts            │ ┃
┃  └──────────────────────────────────┘  ┃  │                                │ ┃
┃                                        ┃  │  ## Ideas                      │ ┃
┃  [More content...]                     ┃  │  (generating...)               │ ┃
┃                                        ┃  │                                │ ┃
┃  ┌──────────────────────────────────┐  ┃  └────────────────────────────────┘ ┃
┃  │ Type message...           [Send] │  ┃                                     ┃
┃  └──────────────────────────────────┘  ┃  ┌─ Variables ────────────────────┐ ┃
┃                                        ┃  │ topic: "AI scheduling"         │ ┃
┃                                        ┃  │ goals: [...]                   │ ┃
┃                                        ┃  └────────────────────────────────┘ ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ▌ Resize handle                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key measurements:**
- Meta bar height: 48px
- Default split: 60% / 40%
- Min panel width: 30%
- Resize handle: 8px draggable zone

---

### 3. Workbench Shell (Browse Mode)

All steps visible in accordion.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Project > Brainstorm > Step 2/5                   [← Focused Mode] [Theme]  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                        ┃                                     ┃
┃  ┌─ Step 1 ──────────────────── ✓ ─┐   ┃  ┌─ Artifact Preview ─────────────┐ ┃
┃  │ Project Setup                   │   ┃  │                                │ ┃
┃  │ Completed · 2 min ago           │   ┃  │  [Same as focused mode]        │ ┃
┃  │                                 │   ┃  │                                │ ┃
┃  │ Output: Created project "test"  │   ┃  │                                │ ┃
┃  └─────────────────────────────────┘   ┃  │                                │ ┃
┃                                        ┃  │                                │ ┃
┃  ┌─ Step 2 ──────────────────── ◐ ─┐   ┃  │                                │ ┃
┃  │ Define Session Parameters   ▼   │   ┃  │                                │ ┃
┃  │ In Progress · Started 5 min ago │   ┃  │                                │ ┃
┃  │                                 │   ┃  │                                │ ┃
┃  │ ┌─────────────────────────────┐ │   ┃  │                                │ ┃
┃  │ │ [Expanded Step Content]    │ │   ┃  │                                │ ┃
┃  │ │                            │ │   ┃  │                                │ ┃
┃  │ └─────────────────────────────┘ │   ┃  │                                │ ┃
┃  └─────────────────────────────────┘   ┃  │                                │ ┃
┃                                        ┃  │                                │ ┃
┃  ┌─ Step 3 ──────────────────── ○ ─┐   ┃  │                                │ ┃
┃  │ Execute Techniques              │   ┃  │                                │ ┃
┃  │ Pending                         │   ┃  └────────────────────────────────┘ ┃
┃  └─────────────────────────────────┘   ┃                                     ┃
┃                                        ┃                                     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

### 4. Dialog Shell

Modal overlay for child workflows.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                              ┃
┃ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ┃
┃ ░░░░░░░░░░░░░░░░ [Parent Workflow - Dimmed] ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ┃
┃ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ┃
┃ ░░░░┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓░░░░ ┃
┃ ░░░░┃ Six Thinking Hats                                         [X] ┃░░░░ ┃
┃ ░░░░┃ Structured parallel thinking technique    「Child Workflow」  ┃░░░░ ┃
┃ ░░░░┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫░░░░ ┃
┃ ░░░░┃  ●━━━━━●━━━━━◯━━━━━◯                                           ┃░░░░ ┃
┃ ░░░░┃  White   Red    Black  Yellow                                  ┃░░░░ ┃
┃ ░░░░┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫░░░░ ┃
┃ ░░░░┃                                                                ┃░░░░ ┃
┃ ░░░░┃  [Step Content - Full functionality]                           ┃░░░░ ┃
┃ ░░░░┃                                                                ┃░░░░ ┃
┃ ░░░░┃  Chat, forms, approvals, streaming...                          ┃░░░░ ┃
┃ ░░░░┃                                                                ┃░░░░ ┃
┃ ░░░░┃                                                                ┃░░░░ ┃
┃ ░░░░┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫░░░░ ┃
┃ ░░░░┃  [← Return to Parent Workflow]                                 ┃░░░░ ┃
┃ ░░░░┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛░░░░ ┃
┃ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ┃
┃                                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key measurements:**
- Dialog: 95vw × 95vh
- Backdrop: bg-black/50
- Stepper: Same bar style as wizard

---

## Step Type Wireframes

### Sandboxed Agent Step (with Tool Sidebar)

Full chat interface with approval flow.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┓
┃                                                              ┃ AGENT TOOLS  ┃
┃  ┌─ About this step ───────────────────────────────────────┐ ┃              ┃
┃  │ ℹ️ Define your brainstorming session parameters with    │ ┃ ┌──────────┐ ┃
┃  │ the agent. You'll set a topic and goals.                │ ┃ │ update_  │ ┃
┃  └─────────────────────────────────────────────────────────┘ ┃ │ name  ✓  │ ┃
┃                                                              ┃ └──────────┘ ┃
┃  ┌─ 🤖 Session Facilitator ─────────────────────────────────┐┃              ┃
┃  │ Let me help you set up your brainstorming session.       │┃ ┌──────────┐ ┃
┃  │                                                          │┃ │ define_  │ ┃
┃  │ I've analyzed your project and have some suggestions     │┃ │ goals ◐  │ ┃
┃  │ for the session parameters.                              │┃ └──────────┘ ┃
┃  └──────────────────────────────────────────────────────────┘┃              ┃
┃                                                              ┃ ┌──────────┐ ┃
┃  ┌─ 🔧 Approval Required ───────────────────────────────────┐┃ │ generate │ ┃
┃  │                                                          │┃ │ summary  │ ┃
┃  │  define_session_goals                                    │┃ │    ○     │ ┃
┃  │                                                          │┃ └──────────┘ ┃
┃  │  ┌─ Recommended ──────────────────────────────────────┐  │┃              ┃
┃  │  │ • Automate calendar management                     │  │┃              ┃
┃  │  │ • Reduce meeting conflicts                         │  │┃              ┃
┃  │  │ • Integrate with existing tools                    │  │┃              ┃
┃  │  └────────────────────────────────────────────────────┘  │┃              ┃
┃  │                                                          │┃              ┃
┃  │  Agent reasoning: Based on your topic "AI scheduling",   │┃              ┃
┃  │  these goals align with common user needs in this space. │┃              ┃
┃  │                                                          │┃              ┃
┃  │  [✓ Approve]  [✎ Edit]  [✗ Reject with Feedback]         │┃              ┃
┃  │                                                          │┃              ┃
┃  └──────────────────────────────────────────────────────────┘┃              ┃
┃                                                              ┃              ┃
┃  ┌──────────────────────────────────────────────────────────┐┃              ┃
┃  │ Type your message...                              [Send] │┃              ┃
┃  │ GPT-4o · Session Facilitator                             │┃              ┃
┃  └──────────────────────────────────────────────────────────┘┃              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━┛
```

**Sidebar States:**
```
EXPANDED                          COLLAPSED
┌─────────────────────┐           ┌──────┐
│ AGENT TOOLS         │           │  A   │
│                     │           │  G   │
│ ┌─────────────────┐ │           │  E   │
│ │ update_name  ✓  │ │           │  N   │
│ │ Approved        │ │           │  T   │
│ └─────────────────┘ │           │      │
│                     │           │  ─   │
│ ┌─────────────────┐ │           │      │
│ │ define_goals ◐  │ │           │  ✓   │
│ │ Awaiting...     │ │           │  ◐   │
│ └─────────────────┘ │           │  ○   │
│                     │           │      │
│ ┌─────────────────┐ │           └──────┘
│ │ gen_summary  ○  │ │
│ │ Blocked         │ │
│ └─────────────────┘ │
└─────────────────────┘
```

---

### User Form Step

Centered form with validation.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                              ┃
┃                                                                              ┃
┃                 ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   Where should we create the project?       ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   Select a directory or create a new one.   ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   ┌─────────────────────────────────────────┃               ┃
┃                 ┃   │ /home/user/projects                     ┃               ┃
┃                 ┃   │                                 [Browse]┃               ┃
┃                 ┃   └─────────────────────────────────────────┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   ┌─ Tip ─────────────────────────────────┐ ┃               ┃
┃                 ┃   │ Select an empty directory or let us   │ ┃               ┃
┃                 ┃   │ create a new one for you.             │ ┃               ┃
┃                 ┃   └───────────────────────────────────────┘ ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   [Continue]                                ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛               ┃
┃                                                                              ┃
┃                                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Form Types:**

```
PATH INPUT                           STRING INPUT
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│ /home/user/projects             │  │ my-project-name                 │
│                         [Browse]│  │                                 │
└─────────────────────────────────┘  └─────────────────────────────────┘

TWO-PART PATH INPUT (Create New)     VALIDATION ERROR
┌────────────────┐ / ┌──────────┐    ┌─────────────────────────────────┐
│ /home/user/pro │   │ my-proj  │    │ invalid name                    │
└────────────────┘   └──────────┘    └─────────────────────────────────┘
                                     ⚠️ Must be kebab-case (a-z, 0-9, -)
```

---

### Execute Action Step

Preview with execute button.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                              ┃
┃                 ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   Initialize Project Directory              ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   The following actions will be performed:  ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   ┌─────────────────────────────────────┐   ┃               ┃
┃                 ┃   │ 1. Create directory:                │   ┃               ┃
┃                 ┃   │    /home/user/projects/my-project   │   ┃               ┃
┃                 ┃   │                                     │   ┃               ┃
┃                 ┃   │ 2. Initialize git repository        │   ┃               ┃
┃                 ┃   │                                     │   ┃               ┃
┃                 ┃   │ 3. Create initial structure:        │   ┃               ┃
┃                 ┃   │    ├── .gitignore                   │   ┃               ┃
┃                 ┃   │    ├── README.md                    │   ┃               ┃
┃                 ┃   │    └── docs/                        │   ┃               ┃
┃                 ┃   └─────────────────────────────────────┘   ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   [Execute Actions]                         ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛               ┃
┃                                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Execution States:**

```
EXECUTING                            COMPLETED
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│ ◐ Executing...                  │  │ ✓ Actions completed             │
│                                 │  │                                 │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │ • Directory created             │
│ Creating directory...           │  │ • Git initialized               │
└─────────────────────────────────┘  │ • Files created                 │
                                     │                                 │
                                     │ [Continue]                      │
                                     └─────────────────────────────────┘
```

---

### Display Output Step

Rendered markdown with variable interpolation.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                              ┃
┃                 ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   ✓ Session Complete                        ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   Your brainstorming session "AI Scheduling"┃               ┃
┃                 ┃   has been completed successfully.          ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   ┌─ Summary ────────────────────────────┐  ┃               ┃
┃                 ┃   │                                      │  ┃               ┃
┃                 ┃   │ Techniques completed: 3/3            │  ┃               ┃
┃                 ┃   │ Total ideas generated: 47            │  ┃               ┃
┃                 ┃   │ Duration: 23 minutes                 │  ┃               ┃
┃                 ┃   │                                      │  ┃               ┃
┃                 ┃   └──────────────────────────────────────┘  ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   Generated Artifacts:                      ┃               ┃
┃                 ┃   • 📄 session-output.md                    ┃               ┃
┃                 ┃   • 📄 ideas-list.json                      ┃               ┃
┃                 ┃   • 📄 action-items.md                      ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   [Download All] [Continue]                 ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛               ┃
┃                                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

### Invoke Workflow Step

Cards for child workflows with progress.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                              ┃
┃   Execute Brainstorming Techniques                                           ┃
┃   Click Execute to start each technique. Techniques can run in parallel.     ┃
┃                                                                              ┃
┃   ┌─────────────────────────────────────────────────────────────────────┐    ┃
┃   │  🎩 Six Thinking Hats                        ● Completed    [View]  │    ┃
┃   │  Structured parallel thinking technique                             │    ┃
┃   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  5/5 tools │    ┃
┃   └─────────────────────────────────────────────────────────────────────┘    ┃
┃                                                                              ┃
┃   ┌─────────────────────────────────────────────────────────────────────┐    ┃
┃   │  🔧 SCAMPER Method                           ◐ Running     [Open]   │    ┃
┃   │  Systematic creativity technique                                    │    ┃
┃   │  ━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2/7 tools │    ┃
┃   └─────────────────────────────────────────────────────────────────────┘    ┃
┃                                                                              ┃
┃   ┌─────────────────────────────────────────────────────────────────────┐    ┃
┃   │  ❓ Five Whys                                ○ Pending     [Execute]│    ┃
┃   │  Root cause analysis technique                                      │    ┃
┃   │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0/5 tools │    ┃
┃   └─────────────────────────────────────────────────────────────────────┘    ┃
┃                                                                              ┃
┃   ────────────────────────────────────────────────────────────────────────   ┃
┃   Progress: 1/3 completed                                       0 failed     ┃
┃                                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Card States:**

```
PENDING                              RUNNING
┌───────────────────────────────┐    ┌───────────────────────────────┐
│ 🎩 Six Thinking Hats      ○   │    │ 🎩 Six Thinking Hats      ◐   │
│ Pending                       │    │ Running · Step 2/4            │
│ ░░░░░░░░░░░░░░░░░░░░░░  0/5   │    │ ━━━━━━━━━░░░░░░░░░░░░░  2/5   │
│                     [Execute] │    │                       [Open]  │
└───────────────────────────────┘    └───────────────────────────────┘

COMPLETED                            FAILED
┌───────────────────────────────┐    ┌───────────────────────────────┐
│ 🎩 Six Thinking Hats      ✓   │    │ 🎩 Six Thinking Hats      ✗   │
│ Completed · 15 min            │    │ Failed · Error at step 3      │
│ ━━━━━━━━━━━━━━━━━━━━━━  5/5   │    │ ━━━━━━━━━━━━░░░░░░░░░░  3/5   │
│                       [View]  │    │             [Retry] [Details] │
└───────────────────────────────┘    └───────────────────────────────┘
```

---

### Branch Step (Future)

Decision point with condition display.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                              ┃
┃                 ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   Choose Your Path                          ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   Based on your project type, select        ┃               ┃
┃                 ┃   the appropriate workflow:                 ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   ┌─────────────────────────────────────┐   ┃               ┃
┃                 ┃   │ 🌱 Greenfield                       │   ┃               ┃
┃                 ┃   │ Start from scratch with full        │   ┃               ┃
┃                 ┃   │ requirements gathering              │   ┃               ┃
┃                 ┃   │                           [Select →]│   ┃               ┃
┃                 ┃   └─────────────────────────────────────┘   ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┃   ┌─────────────────────────────────────┐   ┃               ┃
┃                 ┃   │ 🏗️ Brownfield                       │   ┃               ┃
┃                 ┃   │ Extend existing codebase with       │   ┃               ┃
┃                 ┃   │ codebase analysis first             │   ┃               ┃
┃                 ┃   │                           [Select →]│   ┃               ┃
┃                 ┃   └─────────────────────────────────────┘   ┃               ┃
┃                 ┃                                             ┃               ┃
┃                 ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛               ┃
┃                                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## State Variations

### Step Completion Banner

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                    ┌─────────────────────────────────────┐                   │
│                    │  ✓ Step 2 Complete                  │                   │
│                    │                                     │                   │
│                    │  Define Session Parameters          │                   │
│                    │                                     │                   │
│                    │  ✨ Ready for next phase            │                   │
│                    └─────────────────────────────────────┘                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Error State

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   ┌─ Error ────────────────────────────────────────────────────────────────┐ │
│   │ ⚠️ Step execution failed                                               │ │
│   │                                                                        │ │
│   │ Error: Agent timeout after 30 seconds                                  │ │
│   │                                                                        │ │
│   │ [Retry] [Skip Step] [View Logs]                                        │ │
│   └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Loading/Streaming

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌─ 🤖 Agent ─────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │ Analyzing your project requirements and generating suggestions...      │  │
│  │                                                                        │  │
│  │ Based on the topic "AI Scheduling", I recommend focusing on█           │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ░░░░░░░░░░ Streaming response...                                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Responsive Variants

### Tablet (768px - 1199px)

```
Workbench Shell (Context Panel Collapsed):
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━┓
┃                                                 ┃ A   ┃
┃  [Full Timeline/Step Content]                   ┃ R   ┃
┃                                                 ┃ T   ┃
┃                                                 ┃ I   ┃
┃                                                 ┃ F   ┃
┃                                                 ┃ A   ┃
┃                                                 ┃ C   ┃
┃                                                 ┃ T   ┃
┃                                                 ┃ S   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━┛

Dialog Shell (90vw):
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Six Thinking Hats                              [X]    ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ●━●━◯━◯                                              ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                       ┃
┃ [Step Content]                                        ┃
┃                                                       ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ [← Return]                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Mobile (< 768px)

```
Wizard Shell Only (Stepper becomes dropdown):
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Step 2 of 5                        [▼] ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                        ┃
┃  [Full-width Step Content]             ┃
┃                                        ┃
┃  Form inputs, buttons, etc.            ┃
┃  stack vertically                      ┃
┃                                        ┃
┃                                        ┃
┃  [Continue]                            ┃
┃                                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## Implementation Notes

### CSS Classes Reference

```css
/* Shell containers */
.shell-wizard { ... }
.shell-workbench { ... }
.shell-dialog { ... }

/* Zone layouts */
.zone-meta { height: 48px; }
.zone-primary { flex: 1; overflow: auto; }
.zone-context { width: 40%; min-width: 360px; }

/* Step containers */
.step-centered { max-width: 672px; margin: 0 auto; }
.step-full { width: 100%; }

/* Status indicators */
.status-pending { color: var(--muted-foreground); }
.status-progress { color: oklch(0.7 0.15 80); } /* amber */
.status-complete { color: oklch(0.56 0.19 142); } /* carbon green */
.status-error { color: var(--destructive); }
```

### Z-Index Layers

```
Dialog backdrop:     50
Dialog content:      51
Toasts:              100
Tooltips:            110
```

---

This wireframe document complements the layout system spec with visual references for implementation.
