# Architecture Decision: Workflow Layout Routing System

**Date:** 2025-12-03  
**Status:** Implemented in Story 2.3  
**Related Stories:** 2.3, 2.2  

---

## Context

Chiron supports multiple workflow types with different UI presentation needs:
- **Linear flows** (workflow-init) need simple stepper navigation
- **Artifact-generating workflows** (brainstorming, PRD) need split-view with live preview
- **Nested workflows** (techniques) need modal dialogs overlaying parent

We need a flexible layout system that routes workflows to appropriate UI containers based on their type.

---

## Decision

Implement a **metadata-driven layout routing system** using `workflows.metadata.layoutType`.

### Layout Types

```typescript
metadata: {
  layoutType: "wizard" | "artifact-workbench" | "dialog"
}
```

#### 1. Wizard Layout
- **Use case:** Linear, step-by-step workflows (workflow-init, onboarding)
- **UI:** Stepper component at top + step content below
- **Features:** Back/Next navigation, progress indicator
- **Example:** Project initialization workflow

#### 2. Artifact Workbench Layout
- **Use case:** Workflows that generate documents/artifacts
- **UI:** Split-pane with Timeline (left) + ArtifactPreview (right)
- **Features:** Resizable panels, focused/browse mode, live artifact rendering
- **Example:** Brainstorming, PRD generation, Architecture docs

#### 3. Dialog Layout
- **Use case:** Child workflows executed within parent context
- **UI:** Modal overlay with step content, parent dimmed behind
- **Features:** Return to parent, progress tracking, focused isolation
- **Example:** Technique workflows (SCAMPER, Six Hats, Five Whys)

---

## Component Architecture

### Hierarchy

```
WorkflowLayoutRenderer (top-level router)
├─ StepRenderer (pure step content)
├─ WizardLayout (stepper + step)
├─ ArtifactWorkbenchLayout (Timeline + Artifact)
└─ DialogLayout (modal overlay)

Timeline (specific to artifact-workbench)
├─ Focused Mode (one step at 100%)
└─ Browse Mode (accordion navigation)
```

### Separation of Concerns

**StepRenderer:**
- Returns pure step component based on `stepType`
- No layout concerns whatsoever
- Output: `AskUserChatInterface | ActionList | AskUserForm | etc.`

**WorkflowLayoutRenderer:**
- Reads `workflow.metadata.layoutType`
- Renders `StepRenderer` once to get step content
- Routes to appropriate layout component
- Passes `stepContent` as prop

**Layout Components:**
- Receive `execution` and `stepContent` as props
- Handle presentation and navigation
- Self-contained (e.g., ArtifactWorkbenchLayout creates artifact preview internally)

**Timeline Component:**
- **Only used in ArtifactWorkbenchLayout**
- Not a universal component - specific to artifact-generating workflows
- Manages focused/browse mode switching
- Wraps step content in focused mode, shows accordion in browse mode

---

## Key Design Principles

### 1. Layouts are Self-Contained

```typescript
// ❌ BAD: Passing too many props
<ArtifactWorkbenchLayout
  execution={execution}
  stepContent={stepContent}
  artifactContent={artifactContent}  // Layout should handle this!
/>

// ✅ GOOD: Layout handles its own concerns
<ArtifactWorkbenchLayout
  execution={execution}
  stepContent={stepContent}
  // Layout creates artifact preview from execution internally
/>
```

### 2. StepRenderer is Pure

```typescript
// ❌ BAD: Step renderer handling layout
export function StepRenderer({ step }) {
  return (
    <Timeline>  {/* NO! Layout concern */}
      <AskUserChatInterface step={step} />
    </Timeline>
  );
}

// ✅ GOOD: Pure step content
export function StepRenderer({ step }) {
  return <AskUserChatInterface step={step} />;
}
```

### 3. Timeline is Not Universal

```typescript
// ❌ BAD: Timeline everywhere
<WizardLayout>
  <Timeline>  {/* NO! Wizard doesn't need timeline */}
    <StepContent />
  </Timeline>
</WizardLayout>

// ✅ GOOD: Timeline only in artifact-workbench
<ArtifactWorkbenchLayout>
  <Timeline>  {/* YES! This layout uses timeline */}
    <StepContent />
  </Timeline>
</ArtifactWorkbenchLayout>
```

---

## Implementation Details

### Seeding Workflows with Layout Type

```typescript
// Technique workflow (dialog layout)
export const scamperWorkflow = {
  name: "SCAMPER",
  metadata: {
    layoutType: "dialog",  // Renders as modal overlay
    icon: "target",
    estimatedDuration: "10-15 min"
  }
};

// Brainstorming workflow (artifact workbench)
export const brainstormingWorkflow = {
  name: "Brainstorming",
  metadata: {
    layoutType: "artifact-workbench",  // Split view with timeline
    icon: "brain"
  }
};
```

### Timeline Modes (Artifact Workbench Only)

**Focused Mode (Default):**
- Active step takes 100% of left panel height
- Other steps completely hidden (not collapsed - GONE)
- Step content rendered as `children` prop
- For Step 2 (invoke-workflow), shows ActionList filling panel

**Browse Mode (Navigation):**
- Accordion shows all steps with timestamps
- Each item displays: status icon, step title, duration
- Clicking accordion item switches to focused mode for that step
- NOT just expanding - it's a view mode switch

---

## Benefits

1. **Flexibility:** Easy to add new layout types without touching existing code
2. **Separation:** Steps, layouts, and navigation are cleanly separated
3. **Reusability:** Same step components work in any layout
4. **Type Safety:** TypeScript ensures correct layout props
5. **Maintainability:** Each layout manages its own concerns

---

## Future Considerations

### Potential New Layout Types

- **Kanban Layout:** Visual board for story/task management
- **Split-Agent Layout:** Multiple agents in parallel panes
- **Comparison Layout:** Side-by-side option comparison
- **Gallery Layout:** Visual selection interface

### Extensibility Pattern

```typescript
// Easy to add new layouts
case "kanban":
  return (
    <KanbanLayout
      execution={execution}
      stepContent={stepContent}
    />
  );
```

---

## Migration Notes

### From Story 2.2 → Story 2.3

**Before (Story 2.2):**
- `WorkbenchLayout` was the only layout
- Directly used in workflow execution pages
- No routing, no layout types

**After (Story 2.3):**
- `WorkbenchLayout` → `ArtifactWorkbenchLayout` (one of three types)
- `WorkflowLayoutRenderer` routes based on `metadata.layoutType`
- Timeline component extracted (specific to artifact-workbench)
- Dialog layout added for child workflows

### Breaking Changes

- Rename `WorkbenchLayout` → `ArtifactWorkbenchLayout`
- Add `layoutType` to `WorkflowMetadata` interface
- Update workflow seeds to include `metadata.layoutType`

---

## References

- **Story 2.3 Context:** `docs/sprint-artifacts/2-3-execution-loop-and-child-workflows.context.xml`
- **UX Patterns:** `docs/design/ux-design-specification.md` (Pattern D: Focused Dialogs)
- **Epic 2:** `docs/epics/epic-2-artifact-workbench.md`
