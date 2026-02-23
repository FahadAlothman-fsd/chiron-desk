# Step Execution Layout System

> Status Notice (2026-02-23): Superseded for active implementation.
> Use `_bmad-output/planning-artifacts/ux-design-specification.md` and `_bmad-output/planning-artifacts/reset-baseline-checklist.md` as canonical sources.

**Author:** Design System  
**Status:** Proposed  
**Last Updated:** 2026-01-26

---

## Executive Summary

This document defines Chiron's layout architecture for step execution. It replaces the generic wireframe approach with an intentional, composable system that maps step behaviors to visual patterns while respecting the Bloomberg Terminal aesthetic (monospace typography, carbon green accents, data-dense interfaces, zero radius).

---

## Design Principles

### 1. Step-First, Shell-Agnostic
Steps are self-contained modules. They declare their **intrinsic requirements** (sidebar, streaming, approvals) but don't know their parent shell. The shell adapts to step needs, not vice versa.

### 2. Density Over Whitespace
Bloomberg-inspired: information-rich panels, compact spacing, data always visible. Generous padding only where it aids scanability (between logical sections, not within them).

### 3. Streaming as First-Class Citizen
Real-time content (agent responses, logs, tool results) shapes layout. Reserve vertical space for growing content. Never truncate active streams.

### 4. Progressive Disclosure via Zones
Three-zone mental model:
- **Primary Zone**: Current task (forms, chat, output)
- **Context Zone**: Supporting info (tool status, variables, artifacts)  
- **Meta Zone**: Navigation, step progress, actions

---

## Shell Definitions

### Shell 1: Wizard Shell
**Use cases:** `workflow-init`, project setup, linear multi-step flows  
**Layout Type:** `wizard` (via `workflow.metadata.layoutType`)

```
+------------------------------------------------------------------+
|  [META ZONE] Horizontal Stepper                                   |
|  ●──●──○──○──○  Step names inline, completed=filled              |
+------------------------------------------------------------------+
|                                                                  |
|                     [PRIMARY ZONE]                               |
|              Step content centered, max-w-2xl                    |
|                                                                  |
|              ┌─────────────────────────────┐                     |
|              │  Form / Selection / Output  │                     |
|              │                             │                     |
|              │  [Continue] button          │                     |
|              └─────────────────────────────┘                     |
|                                                                  |
+------------------------------------------------------------------+
```

**Characteristics:**
- Full-width step content area (centered)
- No sidebar, no split pane
- Stepper shows all steps with status indicators
- Footer navigation when needed (back/next)
- Best for: `form`, `display`, simple `action`

---

### Shell 2: Workbench Shell
**Use cases:** Brainstorming, PRD generation, artifact-producing workflows  
**Layout Type:** `artifact-workbench`

```
+------------------------------------------------------------------+
| [META] Breadcrumb: Project > Workflow > Step 2/5    [Browse] [◐] |
+------------------------------------------------------------------+
|                          |                                       |
|  [TIMELINE / PRIMARY]    │  [CONTEXT ZONE]                       |
|                          │                                       |
|  ┌─ Step Header ───────┐ │  ┌─ Artifact Preview ───────────────┐ |
|  │ Step 2: Define...   │ │  │                                  │ |
|  └─────────────────────┘ │  │  # Project Brief                 │ |
|                          │  │                                  │ |
|  ┌─ Chat/Content ──────┐ │  │  ## Problem Statement            │ |
|  │ Agent: Let me...    │ │  │  The user needs...               │ |
|  │                     │ │  │                                  │ |
|  │ [Approval Card]     │ │  │  ## Target Audience              │ |
|  │ ┌───────────────┐   │ │  │  ...                             │ |
|  │ │ Recommend: X  │   │ │  │                                  │ |
|  │ │ [Approve][Edit]│  │ │  └──────────────────────────────────┘ |
|  │ └───────────────┘   │ │                                       |
|  │                     │ │  ┌─ Variables ──────────────────────┐ |
|  │ ▌ (input area)      │ │  │ topic: "AI scheduling"          │ |
|  └─────────────────────┘ │  │ goals: ["automate", "reduce"]    │ |
|                          │  └──────────────────────────────────┘ |
+---------------------------+--------------------------------------+
```

**Characteristics:**
- Resizable two-pane split (default 60/40)
- Left: Timeline container (focused/browse modes)
- Right: Artifact preview + auxiliary panels (collapsible)
- Timeline header shows step progress + mode toggle
- Browse mode: accordion of all steps with timestamps

---

### Shell 3: Dialog Shell
**Use cases:** Child workflows invoked from `invoke` steps
**Layout Type:** `dialog`

```
+------------------------------------------------------------------+
|  [Dimmed Parent Workflow Visible Behind]                         |
|                                                                  |
|    +--------------------------------------------------------+   |
|    | [DIALOG HEADER]                                   [X]  |   |
|    | Six Thinking Hats               Badge: Child Workflow  |   |
|    | "Structured parallel thinking technique"               |   |
|    +--------------------------------------------------------+   |
|    | [META] Stepper (same bar style as wizard)              |   |
|    |  ●──●──○──○                                            |   |
|    +--------------------------------------------------------+   |
|    |                                                        |   |
|    |  [PRIMARY ZONE - Step Content]                         |   |
|    |                                                        |   |
|    |  Chat interface, forms, outputs...                     |   |
|    |  (Full step functionality)                             |   |
|    |                                                        |   |
|    +--------------------------------------------------------+   |
|    | [FOOTER]                                               |   |
|    | [<- Return to Parent Workflow]                         |   |
|    +--------------------------------------------------------+   |
|                                                                  |
+------------------------------------------------------------------+
```

**Characteristics:**
- 95vw x 95vh modal overlay
- Parent workflow dimmed but visible
- Consistent stepper matching parent style
- "Return to Parent" always visible in footer
- Step content renders directly (no nested workbench)

---

### Shell 4: Focused Panel (Future)
**Use cases:** Quick actions, single-tool execution, confirmation dialogs  
**Layout Type:** `focused-panel`

```
+--------------------------------------------+
| [PANEL HEADER]                       [X]   |
| Execute: Create Directory                  |
+--------------------------------------------+
|                                            |
|  Action: mkdir                             |
|  Path: /projects/chiron/docs               |
|                                            |
|  [Execute]  [Cancel]                       |
|                                            |
+--------------------------------------------+
```

---

## Step Type → Layout Mapping

Each step type has intrinsic UI requirements that inform shell selection:

| Step Type         | Primary UI            | Needs Sidebar? | Needs Artifact? | Streams? | Default Shell     |
|-------------------|-----------------------|----------------|-----------------|----------|-------------------|
| `agent` (chiron)   | Chat + Approvals     | Yes (tools)    | Maybe           | Yes      | Workbench         |
| `agent` (opencode) | Output + Logs        | Yes (logs)     | Maybe           | Yes      | Workbench         |
| `form`             | Form inputs          | No             | No              | No       | Wizard            |
| `action`           | Preview + Button     | No             | No              | Maybe    | Wizard            |
| `display`          | Rendered markdown    | No             | No              | No       | Wizard            |
| `invoke`           | Workflow cards       | No             | No              | No       | Workbench         |
| `branch`          | Decision UI           | No             | No              | No       | Wizard            |

**Note:** Shell can be overridden by `workflow.metadata.layoutType`. The table shows defaults when unspecified.

---

## Component Architecture

### Level 1: Shell Components (Layout Wrappers)

```
layouts/
├── wizard-shell.tsx          # Horizontal stepper + centered content
├── workbench-shell.tsx       # Split pane + timeline + artifact
├── dialog-shell.tsx          # Modal overlay for child workflows
└── focused-panel-shell.tsx   # Compact action panel (future)
```

### Level 2: Zone Components (Reusable Regions)

```
zones/
├── step-header.tsx           # Step number, goal, status badge
├── timeline-container.tsx    # Focused/browse mode switching
├── context-panel.tsx         # Artifact + variables + logs
├── meta-bar.tsx              # Breadcrumbs, actions, mode toggles
└── step-footer.tsx           # Navigation, submit, actions
```

### Level 3: Step Components (Behavior-Specific)

```
steps/
├── agent-step.tsx            # Chat + streaming + approvals + tool sidebar
├── form-step.tsx             # Form fields + validation + submit
├── action-step.tsx           # Action preview + execute button
├── display-step.tsx          # Markdown render + variables
├── invoke-step.tsx           # Workflow cards + execution status
└── branch-step.tsx           # Decision UI + condition display
```

### Level 4: Atomic Components (Step Internals)

```
step-atoms/
├── approval-card.tsx         # Single approval with actions
├── approval-selector.tsx     # Multi-option approval selection
├── tool-status-item.tsx      # Single tool progress indicator
├── stream-output.tsx         # Real-time text accumulator
├── variable-inspector.tsx    # JSONB variable display
└── log-viewer.tsx            # Timestamped log entries
```

---

## Component Hierarchy (Render Tree)

```
<WorkflowLayoutRenderer>
  └─ <ShellComponent>           // wizard-shell | workbench-shell | dialog-shell
       ├─ <MetaBar />           // Breadcrumbs, step progress, mode toggle
       │
       ├─ <PrimaryZone>
       │    └─ <TimelineContainer>     // (workbench only)
       │         └─ <StepRenderer>
│              └─ <StepComponent />   // agent | form | etc.
       │                   ├─ <StepHeader />
       │                   ├─ <StepContent />
       │                   │    ├─ <Chat /> | <Form /> | <Output />
       │                   │    └─ <ApprovalCard />*
       │                   └─ <StepFooter />
       │
       └─ <ContextZone>         // (workbench only, collapsible)
            ├─ <ArtifactPreview />
            ├─ <VariableInspector />
            └─ <ToolStatusSidebar />
```

---

## Detailed Zone Specifications

### Meta Bar

```typescript
interface MetaBarProps {
  breadcrumbs: Array<{ label: string; href?: string }>;
  stepProgress: { current: number; total: number };
  executionStatus: "idle" | "active" | "paused" | "completed" | "failed";
  actions?: Array<{ icon: LucideIcon; label: string; onClick: () => void }>;
  onToggleMode?: () => void;  // Browse/Focused toggle
}
```

**Visual Spec (Dark Mode):**
- Height: 48px
- Background: `bg-card` (oklch 0.205)
- Border: `border-b border-border` (oklch 1 0 0 / 10%)
- Typography: 13px `CommitMono`
- Step indicator: `Step 2/5` with progress dots

---

### Step Header

```typescript
interface StepHeaderProps {
  stepNumber: number;
  goal: string;
  stepType: StepType;
  status: "pending" | "in-progress" | "completed" | "failed";
  estimatedDuration?: string;
  collapsible?: boolean;
}
```

**Visual Spec:**
```
┌──────────────────────────────────────────────────────────────┐
│  02  Define Session Parameters                    ● In Progress │
│      agent · ~5 min                                          │
└──────────────────────────────────────────────────────────────┘
```

- Step number: Bold, 24px, muted foreground
- Goal: 16px, foreground
- Type badge: 11px uppercase, secondary background
- Status: Color-coded dot + label

---

### Timeline Container

Two modes managed internally:

**Focused Mode (Default):**
- Active step fills container
- Header shows step info + "Browse History" toggle
- No accordion, just current step content

**Browse Mode:**
- Accordion of all steps
- Each step shows: number, goal, status, duration
- Completed steps show output summary
- Click to expand/focus

```typescript
interface TimelineContainerProps {
  steps: WorkflowStep[];
  currentStep: number;
  focusedStep: number;
  executedSteps: Record<number, ExecutedStepInfo>;
  mode: "focused" | "browse";
  onModeChange: (mode: "focused" | "browse") => void;
  onStepFocus: (stepNumber: number) => void;
  children: React.ReactNode;  // Current step content
}
```

---

### Context Panel (Workbench Shell)

Collapsible right panel with tabbed sections:

```
┌─ Context Panel ──────────────────────── [−] ┐
│ [Artifact] [Variables] [Logs]               │
├─────────────────────────────────────────────┤
│                                             │
│  # Session Output                           │
│                                             │
│  ## Topic                                   │
│  AI-powered scheduling assistant            │
│                                             │
│  ## Goals                                   │
│  - Automate calendar management             │
│  - Reduce meeting conflicts                 │
│                                             │
│  ---                                        │
│  Last updated: 2 min ago                    │
│                                             │
└─────────────────────────────────────────────┘
```

**Collapsed State:**
- 48px wide strip
- Vertical text: "ARTIFACTS" / "VARIABLES" / "LOGS"
- Icon indicators for each section

---

### Tool Status Sidebar (Sandboxed Agent)

Rendered inside step component, not shell:

```typescript
interface ToolStatusSidebarProps {
  tools: ToolConfig[];
  approvalStates: Record<string, ApprovalState>;
  executionVariables: Record<string, unknown>;
  collapsible: boolean;
  defaultCollapsed?: boolean;
}
```

**Visual Spec:**
```
┌─ Agent Tools ─────────────────────────────────┐
│                                               │
│  ┌─ update_project_name ─────────────── ✓ ─┐ │
│  │  Approved: "chiron-scheduler"           │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─ define_session_goals ────────────── ◐ ─┐ │
│  │  Awaiting approval                      │ │
│  │  [View Details]                         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─ generate_summary ────────────────── ○ ─┐ │
│  │  Blocked: requires session_goals        │ │
│  └─────────────────────────────────────────┘ │
│                                               │
└───────────────────────────────────────────────┘
```

Status icons:
- `○` Not started (muted)
- `◐` In progress / Awaiting (yellow/amber)
- `✓` Approved (green)
- `✗` Rejected (red)
- `⊘` Blocked (orange)

---

## Step-Specific Layouts

### Sandboxed Agent Step

```
+------------------------------------------------------------------+
| [Step Header: 02 · Define Parameters · agent]                   |
+------------------------------------------------------------------+
|                                                     |             |
|  [Chat Area]                                        | [Tools]     |
|                                                     |             |
|  ┌─ About this step ─────────────────────────────┐  | update_name |
|  │ Define your session parameters with the agent │  |    ✓        |
|  └───────────────────────────────────────────────┘  |             |
|                                                     | define_goal |
|  ┌─ Assistant ───────────────────────────────────┐  |    ◐        |
|  │ Let me help you define the session. I've      │  |             |
|  │ analyzed your inputs and have a suggestion... │  | gen_summary |
|  └───────────────────────────────────────────────┘  |    ○        |
|                                                     |             |
|  ┌─ Approval: define_session_goals ──────────────┐  |             |
|  │                                               │  |             |
|  │  Recommended: ["automate", "integrate"]       │  |             |
|  │                                               │  |             |
|  │  Agent reasoning: Based on your topic...      │  |             |
|  │                                               │  |             |
|  │  [Approve] [Edit] [Reject with feedback]      │  |             |
|  └───────────────────────────────────────────────┘  |             |
|                                                     |             |
|  ┌─ Input ───────────────────────────────────────┐  |             |
|  │ Type message... (Shift+Enter for newline)     │  |             |
|  │                                        [Send] │  |             |
|  └───────────────────────────────────────────────┘  |             |
+-----------------------------------------------------+-------------+
```

### User Form Step

```
+------------------------------------------------------------------+
|                                                                  |
|                  ┌─────────────────────────────────┐              |
|                  │                                 │              |
|                  │  Where should we create the     │              |
|                  │  project?                       │              |
|                  │                                 │              |
|                  │  ┌─────────────────────────────┐│              |
|                  │  │ /home/user/projects         ││              |
|                  │  │                      [Browse]│              |
|                  │  └─────────────────────────────┘│              |
|                  │                                 │              |
|                  │  Tip: Select an empty directory │              |
|                  │  or create a new one.           │              |
|                  │                                 │              |
|                  │  [Continue]                     │              |
|                  │                                 │              |
|                  └─────────────────────────────────┘              |
|                                                                  |
+------------------------------------------------------------------+
```

### Invoke Workflow Step

```
+------------------------------------------------------------------+
| [Step Header: 03 · Execute Techniques · invoke]                  |
+------------------------------------------------------------------+
|                                                                  |
|  Execute Brainstorming Techniques                                |
|  Click Execute to start each technique. Techniques run parallel. |
|                                                                  |
|  ┌─────────────────────────────────────────────────────────────┐ |
|  │  Six Thinking Hats               ● Completed    [View]      │ |
|  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 5/5 tools    │ |
|  └─────────────────────────────────────────────────────────────┘ |
|                                                                  |
|  ┌─────────────────────────────────────────────────────────────┐ |
|  │  SCAMPER Method                  ◐ Running      [Open]      │ |
|  │  ━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2/7 tools    │ |
|  └─────────────────────────────────────────────────────────────┘ |
|                                                                  |
|  ┌─────────────────────────────────────────────────────────────┐ |
|  │  Five Whys                       ○ Pending      [Execute]   │ |
|  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0/5 tools    │ |
|  └─────────────────────────────────────────────────────────────┘ |
|                                                                  |
|  ────────────────────────────────────────────────────────────── |
|  Progress: 1/3 completed                         0 failed        |
|                                                                  |
+------------------------------------------------------------------+
```

### Display Output Step

```
+------------------------------------------------------------------+
|                                                                  |
|              ┌─────────────────────────────────────────┐          |
|              │                                         │          |
|              │  Session Complete                       │          |
|              │                                         │          |
|              │  Your brainstorming session generated   │          |
|              │  the following artifacts:               │          |
|              │                                         │          |
|              │  ┌─────────────────────────────────────┐│          |
|              │  │ 📄 session-output.md                ││          |
|              │  │ 📄 ideas-list.json                  ││          |
|              │  │ 📄 action-items.md                  ││          |
|              │  └─────────────────────────────────────┘│          |
|              │                                         │          |
|              │  Total ideas generated: 47              │          |
|              │  Techniques completed: 3/3              │          |
|              │  Duration: 23 minutes                   │          |
|              │                                         │          |
|              │  [Download All] [Continue to Next]      │          |
|              │                                         │          |
|              └─────────────────────────────────────────┘          |
|                                                                  |
+------------------------------------------------------------------+
```

---

## Visual Language

### Typography

| Element          | Font          | Size  | Weight | Color              |
|------------------|---------------|-------|--------|--------------------|
| Step number      | CommitMono    | 24px  | 700    | muted-foreground   |
| Step goal        | CommitMono    | 16px  | 400    | foreground         |
| Body text        | CommitMono    | 14px  | 400    | foreground         |
| Labels           | CommitMono    | 12px  | 400    | muted-foreground   |
| Badges           | CommitMono    | 11px  | 700    | varies             |
| Code/mono        | CommitMono    | 13px  | 400    | foreground         |

### Color Tokens (Dark Mode Primary)

| Token                 | OKLCH Value        | Use                           |
|-----------------------|--------------------|------------------------------ |
| `--background`        | oklch(0.145 0 0)   | Page background               |
| `--card`              | oklch(0.205 0 0)   | Panel backgrounds             |
| `--primary`           | oklch(0.56 0.19 142) | Carbon green accents        |
| `--muted`             | oklch(0.269 0 0)   | Secondary backgrounds         |
| `--muted-foreground`  | oklch(0.708 0 0)   | Secondary text                |
| `--border`            | oklch(1 0 0 / 10%) | Dividers, outlines            |

### Status Colors

| Status       | Color         | Use                              |
|--------------|---------------|----------------------------------|
| Success      | Green-500     | Completed, approved              |
| Warning      | Amber-500     | Awaiting, in-progress            |
| Error        | Red-500       | Failed, rejected                 |
| Info         | Blue-500      | Active, streaming                |
| Blocked      | Orange-500    | Dependencies unmet               |

### Spacing Scale

| Token | Value | Use                              |
|-------|-------|----------------------------------|
| xs    | 4px   | Inline spacing, icon gaps        |
| sm    | 8px   | Tight groupings                  |
| md    | 16px  | Standard padding                 |
| lg    | 24px  | Section separation               |
| xl    | 32px  | Major divisions                  |

### Border Radius

**Global:** `--radius: 0rem` (square corners per Bloomberg aesthetic)

Exception: Badge pills use `rounded-full` for visual distinction.

---

## Animation Guidelines

### Streaming Content
- Text appears character-by-character with 0ms delay (immediate)
- Use CSS `will-change: contents` for performance
- No typewriter effect - instant append

### Panel Transitions
- Duration: 200ms
- Easing: `ease-out`
- Properties: `width`, `opacity`, `transform`

### Step Completion
- Success checkmark: Scale from 0.8 to 1.0, 300ms
- Fade in completion message: 200ms
- Progress bar fill: 300ms with ease-out

### Approval Cards
- Appear: Slide up from 8px below, fade in, 200ms
- Approve action: Green border flash, 150ms
- Reject action: Shake animation (2px), red flash, 200ms

---

## Responsive Behavior

### Desktop (≥1200px)
- Full workbench layout with all panels
- Sidebar default: expanded
- Context panel default: expanded

### Tablet (768px - 1199px)
- Workbench: Context panel collapsed by default
- Sidebar: Collapsed to icon strip
- Dialog: 90vw × 90vh

### Mobile (< 768px)
- Wizard shell only (workbench not supported)
- Full-width step content
- Stepper becomes dropdown

---

## Implementation Roadmap

### Phase 1: Foundation (Current Sprint)
1. Extract `MetaBar` component from existing layouts
2. Create `StepHeader` standardized component
3. Refactor `TimelineContainer` with mode switching
4. Standardize shell prop interfaces

### Phase 2: Shell Consolidation
1. Unify `WizardLayout` and `ArtifactWorkbenchLayout` APIs
2. Extract `ContextPanel` as composable zone
3. Create shell selection utility function
4. Add shell override support via workflow metadata

### Phase 3: Step Enhancements
1. Add opencode path for `agent` step
2. Create `branch` step decision UI
3. Enhance streaming in `agent`
4. Add variable inspector panel

### Phase 4: Polish
1. Add animations per guidelines
2. Implement responsive breakpoints
3. Add keyboard navigation
4. Create storybook documentation

---

## File Structure (Proposed)

```
components/workflows/
├── shells/
│   ├── wizard-shell.tsx
│   ├── workbench-shell.tsx
│   ├── dialog-shell.tsx
│   └── index.ts
│
├── zones/
│   ├── meta-bar.tsx
│   ├── step-header.tsx
│   ├── timeline-container.tsx
│   ├── context-panel.tsx
│   ├── step-footer.tsx
│   └── index.ts
│
├── steps/
│   ├── agent-step.tsx
│   ├── form-step.tsx
│   ├── action-step.tsx
│   ├── display-step.tsx
│   ├── invoke-step.tsx
│   ├── branch-step.tsx
│   └── index.ts
│
├── step-atoms/
│   ├── approval-card.tsx
│   ├── approval-selector.tsx
│   ├── tool-status-item.tsx
│   ├── stream-output.tsx
│   ├── variable-inspector.tsx
│   ├── log-viewer.tsx
│   └── index.ts
│
├── step-renderer.tsx       # stepType → component mapping
├── shell-renderer.tsx      # layoutType → shell mapping
├── workflow-layout-renderer.tsx  # orchestrator
└── types.ts
```

---

## Appendix: Component Props Reference

### ShellRendererProps
```typescript
interface ShellRendererProps {
  layoutType: "wizard" | "artifact-workbench" | "dialog";
  workflow: {
    id: string;
    displayName: string;
    description?: string;
    outputArtifactType?: string;
  };
  execution: {
    id: string;
    status: ExecutionStatus;
    currentStepId: string;
    variables: Record<string, unknown>;
    executedSteps: Record<number, ExecutedStepInfo>;
  };
  steps: WorkflowStep[];
  projectId?: string;
  // Dialog-specific
  dialogProps?: {
    open: boolean;
    onClose: () => void;
  };
  children: React.ReactNode;
}
```

### StepRendererProps
```typescript
interface StepRendererProps {
  step: WorkflowStep;
  execution: WorkflowExecution;
  projectId: string;
  onExecuteWorkflow?: (workflowId: string) => void;
  onViewExecution?: (executionId: string) => void;
  onStepComplete?: () => void;
}
```

---

## Summary

This layout system provides:

1. **Three intentional shells** (Wizard, Workbench, Dialog) with clear use cases
2. **Composable zones** (Meta, Primary, Context) that adapt to shell context
3. **Step-first architecture** where steps declare needs, shells adapt
4. **Bloomberg-inspired aesthetics** (monospace, carbon green, data-dense, zero radius)
5. **Streaming-first design** with proper space reservation
6. **Progressive disclosure** via collapsible panels and browse/focus modes

The architecture is extensible - new step types slot into existing shells, new shells can be added without modifying steps.
