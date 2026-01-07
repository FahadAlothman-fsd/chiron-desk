# Story 2.3: UI Architecture Primitives - FINAL LOCK

**Date:** 2025-12-03  
**Status:** LOCKED - Ready for Implementation  
**Document Type:** Architectural Decision Record

---

## Executive Summary

Story 2.3 introduces **6 foundational UI primitives** that establish how workflows render and how users navigate between parent and child workflows. These primitives are **reusable patterns** that will be used across all future stories.

**Critical Design Principle:** Step type components (like `ask-user-chat`) are **IDENTICAL** regardless of which layout container they render in. Users experience **consistent interfaces** whether in artifact-workbench, dialog, or wizard layouts.

---

## Primitive 1: Layout Types (Workflow Container)

### Definition
Layout type defines the **container shell** that wraps step type content.

### Storage
`workflows.metadata.layoutType` (JSONB field in workflows table)

### Defined Types

| Layout Type | Purpose | Used By | Visual Pattern |
|-------------|---------|---------|----------------|
| `wizard` | Horizontal progress stepper | workflow-init | Top stepper bar, steps below |
| `artifact-workbench` | Timeline + workspace split | brainstorming | Left: timeline, Right: workspace |
| `dialog` | Modal overlay on parent | techniques (SCAMPER, etc.) | Full-screen modal, parent dimmed behind |

### Key Rules
1. Layout type is **presentation container only**
2. Step type content is **identical** across all layout types
3. Layout type stored in workflow definition, not step definition
4. Multiple workflows can use same layout type

---

## Primitive 2: Step Types (Content Component)

### Definition
Step type defines the **interaction pattern** rendered inside layout container.

### Storage
`workflow_steps.stepType` (enum field in workflow_steps table)

### Currently Seeded Types

| Step Type | Component | Renders Same In All Layouts? |
|-----------|-----------|------------------------------|
| `ask-user-chat` | `<AskUserChatInterface />` | ✅ YES |
| `ask-user` | `<SimpleFormInterface />` | ✅ YES |
| `execute-action` | `<ActionExecutionLog />` | ✅ YES |
| `display-output` | `<OutputDisplay />` | ✅ YES |

### Critical Design Rule

**THE SAME COMPONENT EVERYWHERE:**

```typescript
// ask-user-chat step in artifact-workbench layout
<WorkbenchLayout>
  <Timeline />
  <Workspace>
    <AskUserChatInterface executionId={id} stepNumber={2} />
  </Workspace>
</WorkbenchLayout>

// ask-user-chat step in dialog layout
<DialogLayout>
  <DialogHeader>SCAMPER</DialogHeader>
  <DialogBody>
    <AskUserChatInterface executionId={childId} stepNumber={1} />
  </DialogBody>
</DialogLayout>

// EXACT SAME <AskUserChatInterface /> component in both
```

**User Experience:** User sees familiar chat interface everywhere. No confusion from "dialog version" vs "workbench version".

---

## Primitive 3: Artifact-Workbench Timeline - Focused Mode

### Visual Structure

```
┌─ TIMELINE (30% width) ───┐
│                          │
│          ↑               │  ← Click arrow to toggle browse
│     (arrow button)       │
│                          │
│  ┌───────────────────┐   │
│  │                   │   │
│  │  Step 2           │   │
│  │  🔄 In Progress   │   │  ← Active step takes 100% space
│  │                   │   │     NO other steps visible
│  │  Child Workflows: │   │
│  │  ├─ SCAMPER ✅    │   │
│  │  ├─ Six Hats 🔄   │   │
│  │  └─ 5 Whys ⚪     │   │
│  │                   │   │
│  └───────────────────┘   │
│                          │
│          ↓               │  ← Click arrow to toggle browse
│     (arrow button)       │
│                          │
└──────────────────────────┘
```

### Behavior Rules

1. **Active step takes 100% of timeline vertical space**
2. **Other steps (Step 1, Step 3, etc.) completely hidden** - not even titles visible
3. **Arrows at top/bottom** toggle to browse mode
4. **No scrolling** - focused view shows ONLY active step
5. **Child workflows shown** if active step invokes child workflows

### When to Use
- Default mode for artifact-workbench
- User wants to focus on current work without distraction
- Timeline acts as "mini-dashboard" for active step

---

## Primitive 4: Artifact-Workbench Timeline - Browse Mode

### Visual Structure

```
┌─ TIMELINE (30% width) ───┐
│                          │
│  Step 1 ✅               │
│  Started: 2:30 PM        │
│  Completed: 2:45 PM      │
│  Duration: 15 min        │
│          ↓               │  ← Arrow connects to next
│                          │
│  Step 2 🔄 [ACTIVE]      │  ← Visual badge shows current
│  Started: 2:45 PM        │
│  In progress...          │
│    ├─ SCAMPER ✅         │
│    ├─ Six Hats 🔄        │
│    └─ 5 Whys ⚪          │
│          ↓               │
│                          │
│  Step 3 ⚪               │
│  Not started             │
│                          │
│  [⬆️ Focus Active Step]  │  ← Button to return to focused
└──────────────────────────┘
```

### Behavior Rules

1. **All steps visible** with equal vertical spacing
2. **Full metadata shown:**
   - `startedAt` timestamp (if step started)
   - `completedAt` timestamp (if step completed)
   - Calculated duration (completedAt - startedAt)
3. **Arrows connect steps** visually showing flow
4. **Click step** → Jump to that step's context (workspace shows that step's output)
5. **Button at bottom** → Return to focused mode
6. **Scrollable** if workflow has many steps

### When to Use
- User wants to review all workflow progress
- Debugging step execution timeline
- Understanding full workflow structure
- Jumping to previous step context

---

## Primitive 5: Dialog Layout (Modal Overlay)

### Visual Structure

```
┌─ Parent Workflow (artifact-workbench) ──────────────────────┐
│ ┌─ Timeline ─┐ ┌─ Workspace ────────────────────────────┐   │
│ │  Step 2 🔄 │ │  Action List:                          │   │
│ │            │ │  ☑️ SCAMPER (completed)                │   │
│ │            │ │  🔄 Six Hats (in progress)             │   │
│ │            │ │  ⚪ Five Whys (pending)                │   │
│ └────────────┘ └─────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
                        ↓ User clicks "Execute Six Hats"
                        ↓ Dialog opens ON TOP
┌─────────────────────────────────────────────────────────────────┐
│              DIALOG OVERLAY (dimmed background)                 │
│ ┌─ Six Thinking Hats ──────────────────────────────────────────┐ │
│ │                                                              │ │
│ │ [Optional stepper for multi-step techniques: 1/6 steps]     │ │
│ │                                                              │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │ │
│ │ │                                                          │ │ │
│ │ │  <AskUserChatInterface executionId={childId} />          │ │ │
│ │ │                                                          │ │ │
│ │ │  Chat Interface:                                         │ │ │
│ │ │  Agent: "Let's explore the WHITE hat perspective..."    │ │ │
│ │ │  User: "Here are the facts about our onboarding..."     │ │ │
│ │ │  Agent: "Great! Moving to RED hat - emotions..."        │ │ │
│ │ │                                                          │ │ │
│ │ │  [Input field]                                           │ │ │
│ │ │                                                          │ │ │
│ │ └──────────────────────────────────────────────────────────┘ │ │
│ │                                                              │ │
│ │ Progress: 2/6 hats completed                                │ │
│ │ [🔙 Return to Parent] [Complete Technique]                  │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│     Parent workflow still visible behind (dimmed overlay)        │
└───────────────────────────────────────────────────────────────────┘
```

### Behavior Rules

1. **Dialog is a workflow layout type** (`metadata.layoutType = "dialog"`)
2. **Renders as full-screen modal** overlay on parent workflow
3. **Parent workflow visible behind** with dimmed overlay (not completely hidden)
4. **Dialog header** shows technique/workflow name
5. **Dialog body** renders current step's step type component
6. **Optional stepper** at top for multi-step workflows (Mind Mapping: 4 steps)
7. **Return button** closes dialog, returns to parent execution
8. **Complete button** marks technique finished, closes dialog

### Step Type Rendering in Dialog

**If child workflow step is `ask-user-chat`:**
```typescript
<DialogLayout>
  <DialogHeader>SCAMPER</DialogHeader>
  <DialogBody>
    <AskUserChatInterface 
      executionId={childExecutionId} 
      stepNumber={1} 
      config={stepConfig}
    />
  </DialogBody>
  <DialogFooter>
    <Button>Return to Parent</Button>
    <Button>Complete Technique</Button>
  </DialogFooter>
</DialogLayout>
```

**Same `<AskUserChatInterface />` component** used in parent workflow workspace.

### Multi-Step Techniques

**Mind Mapping (4 steps):**
- Stepper shows: "Step 1: Define Center → Step 2: Main Branches → Step 3: Sub-branches → Step 4: Connections"
- Each step still renders `ask-user-chat` interface
- Stepper indicates progress, doesn't change component

**What If Scenarios (3 steps):**
- Stepper shows: "Step 1: Constraints → Step 2: Wild Ideas → Step 3: Practical Extraction"
- Same pattern as Mind Mapping

---

## Primitive 6: Parent-Child Workflow Linkage

### Database Schema

**New Column:**
```sql
ALTER TABLE workflow_executions 
ADD COLUMN parentExecutionId UUID REFERENCES workflow_executions(id);
```

**Parent Execution:**
```json
{
  "id": "exec-parent-123",
  "workflowId": "brainstorming",
  "currentStep": 2,
  "variables": {
    "session_topic": "improve onboarding flow",
    "selected_techniques": ["scamper", "six-hats", "five-whys"],
    "child_executions": ["exec-child-456", "exec-child-789"]
  }
}
```

**Child Execution:**
```json
{
  "id": "exec-child-456",
  "workflowId": "scamper",
  "parentExecutionId": "exec-parent-123",
  "currentStep": 1,
  "variables": {
    "session_topic": "improve onboarding flow",  // Inherited from parent
    "generated_ideas": ["idea 1", "idea 2"]
  }
}
```

### Variable Inheritance

**Child workflow accesses parent variables:**
```typescript
// In technique workflow step config
{
  initialPrompt: "Based on {{parent.session_topic}} and goals {{parent.stated_goals}}, let's explore..."
}

// System resolves:
// 1. Check if execution has parentExecutionId
// 2. Load parent execution
// 3. Read parent.variables.session_topic
// 4. Replace {{parent.session_topic}} with "improve onboarding flow"
```

### Navigation Flow

1. User in parent workflow (brainstorming Step 2)
2. Clicks "Execute SCAMPER"
3. System:
   - Creates child execution with `parentExecutionId`
   - Copies parent variables to child context
   - Opens dialog with child execution
4. User completes SCAMPER
5. Clicks "Complete Technique"
6. System:
   - Aggregates child outputs into parent variables
   - Closes dialog
   - Returns to parent execution
7. Parent shows SCAMPER marked complete

---

## Primitive 7: Step Execution Timestamps

### Database Storage

**JSONB Field:** `workflow_executions.executedSteps`

```typescript
{
  "1": {
    "status": "completed",
    "startedAt": "2025-12-03T14:30:00Z",
    "completedAt": "2025-12-03T14:45:00Z",
    "output": { "session_topic": "improve onboarding" }
  },
  "2": {
    "status": "in-progress",
    "startedAt": "2025-12-03T14:45:15Z",
    "completedAt": null
  }
}
```

### Execution Logic Changes

**When step starts:**
```typescript
executedSteps[stepNumber].startedAt = new Date().toISOString();
executedSteps[stepNumber].status = "in-progress";
```

**When step completes:**
```typescript
executedSteps[stepNumber].completedAt = new Date().toISOString();
executedSteps[stepNumber].status = "completed";
```

### Timeline Display

**Browse Mode:**
- Read `startedAt` from `executedSteps[stepNumber]`
- Read `completedAt` from `executedSteps[stepNumber]`
- Calculate duration: `new Date(completedAt) - new Date(startedAt)`
- Format: "Started: 2:30 PM", "Completed: 2:45 PM", "Duration: 15 min"

**Focused Mode:**
- Do NOT show timestamps (focused view is about active work, not metadata)

---

## Implementation Files

### New Files to Create

```
apps/web/src/components/workflows/
├── timeline-focused-view.tsx          # Primitive 3
├── timeline-browse-view.tsx           # Primitive 4
├── dialog-layout.tsx                  # Primitive 5
└── timeline-mode-toggle.tsx           # Toggle button between focused/browse

packages/api/src/services/workflow-engine/
└── utils/timestamp-recorder.ts        # Primitive 7 helper
```

### Files to Update

```
apps/web/src/components/workflows/
├── workbench-layout.tsx               # Add timeline mode toggle support
└── child-workflow-dialog.tsx          # Use dialog-layout component

packages/api/src/services/workflow-engine/
└── workflow-executor.ts               # Add timestamp recording
```

---

## Design Decisions

### Decision 1: Same Component Everywhere
**Decision:** Step type components (like `AskUserChatInterface`) are IDENTICAL in all layout types.

**Rationale:**
- Consistent user experience
- No "special versions" to maintain
- Layout type only controls container, not content

**Impact:** UI code reuse, user familiarity

---

### Decision 2: Focused Mode Hides Other Steps
**Decision:** Focused mode shows ONLY active step, completely hides other steps (not even collapsed).

**Rationale:**
- Maximum focus on current work
- No visual clutter or distraction
- Browse mode available for full timeline view

**Impact:** Need two separate timeline components

---

### Decision 3: Dialog = Workflow Layout Type
**Decision:** Dialog is a layout type stored in workflow metadata, not a UI-only pattern.

**Rationale:**
- Workflow definition controls presentation
- Techniques self-declare they render as dialogs
- Supports nested dialogs (child workflow can invoke grandchild workflow)

**Impact:** Seed data must set `metadata.layoutType = "dialog"` for all techniques

---

### Decision 4: Timestamps in executedSteps JSONB
**Decision:** Store timestamps in existing `executedSteps` field, not new columns.

**Rationale:**
- Schema already supports it (no migration needed)
- Timestamps are execution metadata, fit naturally in executedSteps
- Easy to query and display

**Impact:** Execution logic needs small update to record timestamps

---

## Testing Checklist

### Primitive 3: Timeline Focused Mode
- [ ] Active step takes 100% vertical space
- [ ] Other steps completely hidden (not visible at all)
- [ ] Arrows at top/bottom toggle to browse mode
- [ ] Child workflows shown if active step invokes them

### Primitive 4: Timeline Browse Mode
- [ ] All steps visible with equal spacing
- [ ] Timestamps displayed correctly (startedAt, completedAt, duration)
- [ ] Click step → Workspace updates to show that step's context
- [ ] Button at bottom returns to focused mode

### Primitive 5: Dialog Layout
- [ ] Dialog opens as modal overlay on parent
- [ ] Parent workflow visible behind with dimmed overlay
- [ ] Dialog body renders step type component (ask-user-chat)
- [ ] Multi-step techniques show stepper at top
- [ ] Return button closes dialog, returns to parent
- [ ] Complete button marks technique finished

### Primitive 6: Parent-Child Linkage
- [ ] Child execution created with parentExecutionId set
- [ ] Parent variables copied to child context
- [ ] `{{parent.variable}}` syntax resolves correctly
- [ ] Child outputs aggregated back into parent variables
- [ ] Dialog closure returns to parent execution

### Primitive 7: Timestamps
- [ ] startedAt recorded when step starts
- [ ] completedAt recorded when step completes
- [ ] Browse mode displays timestamps correctly
- [ ] Duration calculated accurately
- [ ] Focused mode does NOT show timestamps

---

## Success Criteria

✅ All 7 primitives implemented and tested  
✅ Step type components reused without modification across layouts  
✅ Timeline modes (focused/browse) work correctly  
✅ Dialog layout renders techniques correctly  
✅ Parent-child workflow navigation works smoothly  
✅ Timestamps display correctly in browse mode  
✅ User experience is consistent and intuitive

---

**DOCUMENT STATUS: LOCKED AND FINAL**  
**READY FOR IMPLEMENTATION: YES**  
**SIGN-OFF: Fahad (2025-12-03)**
