# Context-Aware Command Palette Design

Date: 2026-03-17
Status: approved-direction-recorded

## Goal

Record three viable command-palette frameworks for Chiron, preserve the approved recommendation, and capture polished ASCII wireframes for:

- the recommended palette across System, Methodology, and Project contexts
- deeper drill-down for `Methodology > Work Units > selected work unit`
- empty, loading, blocked, and failed palette states

## Inputs and Constraints

- Chiron already uses an explicit three-context shell: `System`, `Methodology`, and `Project`.
- Context switching must stay distinct from entity selection.
- Methodology context is version-scoped.
- The palette should support both navigation and real authoring actions.
- Error and blocked states should be human-readable, reassuring, and action-oriented rather than raw internal-code dumps.

Primary local references:

- `apps/web/src/components/app-sidebar.tsx`
- `apps/web/src/features/methodologies/command-palette.tsx`
- `docs/plans/2026-03-09-methodology-shell-information-architecture-design.md`
- `docs/architecture/methodology-pages/work-units/overview.md`
- `docs/architecture/methodology-pages/work-units/detail-tabs.md`

Secondary pattern influences:

- cmdk nested-page pattern
- GitHub command palette scoped suggestions
- Retool context-aware command model
- shadcn grouped command presentation

## Recorded Frameworks

### Framework 1 - Segmented Context + Scoped Results

Summary:

- Top row switches the command universe between `System`, `Methodology`, and `Project`.
- Second row shows current scope and lets the user understand which methodology/version or project is active.
- Main results list is grouped into categories such as `Navigate`, `Create`, `Inspect`, and `Recent`.

Strengths:

- Best overall default for Chiron.
- Closest to the current app-shell mental model.
- Works well for both discovery and expert usage.
- Adapts cleanly to narrow layouts.

Weaknesses:

- Less optimized than a drill-down-first model for deep object editing.

Best use:

- Global default palette behavior.

### Framework 2 - Breadcrumb Drill-Down Palette

Summary:

- The palette behaves like a navigator stack.
- The path row shows the current local drill-down, such as `Methodology / Version / Work Units / Selected Work Unit`.
- Results are local to the current node and focus on child pages, tabs, and actions.

Strengths:

- Best for deep design-time authoring.
- Excellent for selected-object work such as tabs, facts, workflows, and state-machine editing.
- Makes hierarchy explicit.

Weaknesses:

- Heavier than Framework 1 for fast cross-context jumping.

Best use:

- Once the user has entered a local object such as a work unit.

### Framework 3 - Dense Split-Rail Expert Palette

Summary:

- A narrow left rail keeps context mode, quick scope, and recent objects visible at all times.
- The right pane shows search results and action groups.

Strengths:

- Very efficient for expert, high-frequency operators.
- Maintains strong awareness of context while searching.

Weaknesses:

- Visually denser and less calm.
- More niche than the other two frameworks.
- Harder to justify as the first/default experience.

Best use:

- Advanced operator workflows if future testing shows strong value.

## Approved Recommendation

- Use Framework 1 as the main palette.
- Borrow Framework 2's breadcrumb drill-down once a user enters a local object.
- Avoid fully committing to Framework 3 unless Chiron later needs a denser expert-only operating mode.

This creates a hybrid model:

1. Enter the palette in a clean, segmented global mode.
2. Pick context.
3. Pick scope.
4. If the user enters a local object, switch into breadcrumb drill-down behavior for that object.

## Final Recommended Wireframes

### A. System Context

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Command Palette                                                Esc  │
├──────────────────────────────────────────────────────────────────────┤
│ [System]  Methodology  Project                                       │
│ Scope: Global platform                                                │
│ Search: >                                                             │
├──────────────────────────────────────────────────────────────────────┤
│ NAVIGATE                                                             │
│  Home                                                  page          │
│  Methodologies                                          page          │
│  Projects                                               page          │
│  Harnesses                                              page          │
│  Settings                                               page          │
│                                                                      │
│ CREATE                                                               │
│  New Methodology                                      create         │
│  New Project                                          create         │
│                                                                      │
│ RECENT                                                               │
│  Equity Core methodology                             recent         │
│  customer-portal project                             recent         │
└──────────────────────────────────────────────────────────────────────┘
```

### B. Methodology Context

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Command Palette                                                Esc  │
├──────────────────────────────────────────────────────────────────────┤
│ System  [Methodology]  Project                                       │
│ Scope: Equity Core  >  Draft v0.2.0                                  │
│ Search: >                                                            │
├──────────────────────────────────────────────────────────────────────┤
│ NAVIGATE                                                             │
│  Dashboard                                             page          │
│  Versions                                              page          │
│  Facts                                                 page          │
│  Work Units                                            page          │
│  Agents                                                page          │
│  Dependency Definitions                                page          │
│                                                                      │
│ CREATE                                                               │
│  Add Fact                                              create        │
│  Add Work Unit                                         create        │
│  Add Agent                                             create        │
│  Add Link Type                                         create        │
│                                                                      │
│ INSPECT                                                              │
│  Open diagnostics                                      inspect       │
│  Open publish evidence                                  inspect       │
└──────────────────────────────────────────────────────────────────────┘
```

### C. Project Context

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Command Palette                                                Esc  │
├──────────────────────────────────────────────────────────────────────┤
│ System  Methodology  [Project]                                       │
│ Scope: customer-portal  >  pinned to Equity Core v0.1.0              │
│ Search: >                                                            │
├──────────────────────────────────────────────────────────────────────┤
│ NAVIGATE                                                             │
│  Dashboard                                             page          │
│  Project Facts                                         page          │
│  Work Units                                            page          │
│  Agents                                                page          │
│  Pin / Methodology                                     page          │
│                                                                      │
│ CREATE                                                               │
│  Capture Project Fact                                 create         │
│  Start Work Unit                                      create         │
│                                                                      │
│ INSPECT                                                              │
│  Latest run diagnostics                                inspect       │
│  Current readiness context                             inspect       │
│  Pin lineage                                           inspect       │
└──────────────────────────────────────────────────────────────────────┘
```

## Drill-Down Wireframes

These screens intentionally switch from Framework 1 behavior to Framework 2 behavior.

### D. Methodology > Work Units

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Command Palette                                                Esc  │
├──────────────────────────────────────────────────────────────────────┤
│ Context: Methodology                                                │
│ Path: Equity Core / Draft v0.2.0 / Work Units                       │
│ Search: > onboarding                                                │
├──────────────────────────────────────────────────────────────────────┤
│ PAGES                                                                │
│  Facts                                                page          │
│  Agents                                               page          │
│  Dependency Definitions                               page          │
│                                                                       │
│ WORK UNITS                                                           │
│  Customer Onboarding                                 object         │
│  Repo Intake                                          object         │
│  Project Context                                      object         │
│                                                                       │
│ ACTIONS                                                              │
│  Add Work Unit                                       create         │
│  Open graph view                                     inspect        │
└──────────────────────────────────────────────────────────────────────┘
```

### E. Methodology > Work Units > Selected Work Unit

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Command Palette                                                Esc  │
├──────────────────────────────────────────────────────────────────────┤
│ Context: Methodology                                                │
│ Path: Equity Core / Draft v0.2.0 / Work Units / Customer Onboarding │
│ Search: >                                                            │
├──────────────────────────────────────────────────────────────────────┤
│ TABS                                                                 │
│  Overview                                             tab           │
│  Facts                                                tab           │
│  Workflows                                            tab           │
│  State Machine                                        tab           │
│  Artifact Slots                                       tab           │
│                                                                      │
│ ACTIONS                                                               │
│  Edit work unit details                               edit          │
│  Add fact                                             create        │
│  Add workflow                                         create        │
│  Open relationship view                               inspect       │
│                                                                      │
│ RELATED                                                                │
│  Open parent Work Units page                            page          │
│  Open diagnostics                                       inspect       │
└──────────────────────────────────────────────────────────────────────┘
```

## State Variants

The palette should follow the approved human-readable error contract:

- say what happened
- say why it happened
- say what is safe
- give a way out
- help the user fix it

Raw technical details can exist, but only in secondary or collapsible form.

### F. Empty State

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Command Palette                                                Esc  │
├──────────────────────────────────────────────────────────────────────┤
│ System  [Methodology]  Project                                       │
│ Scope: Equity Core  >  Draft v0.2.0                                  │
│ Search: > zebra                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ State: normal - No matches yet                                       │
│                                                                      │
│ What happened                                                        │
│  Nothing matched "zebra" in this methodology scope.                 │
│                                                                      │
│ What you can do now                                                  │
│  - Try a page name like Facts or Work Units                          │
│  - Try an action like Add Agent or Add Fact                          │
│  - Clear the search to browse available commands                     │
└──────────────────────────────────────────────────────────────────────┘
```

### G. Loading State

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Command Palette                                                Esc  │
├──────────────────────────────────────────────────────────────────────┤
│ System  Methodology  [Project]                                       │
│ Scope: customer-portal                                               │
│ Search: > agents                                                     │
├──────────────────────────────────────────────────────────────────────┤
│ State: loading - Gathering project commands                          │
│                                                                      │
│ What happened                                                        │
│  Chiron is loading commands for this project scope.                  │
│                                                                      │
│ What is safe                                                         │
│  Your current project selection is preserved.                        │
│                                                                      │
│ What you can do now                                                  │
│  - Wait a moment for project commands to appear                      │
│  - Press Esc to close the palette if you want to continue elsewhere  │
│                                                                      │
│  [loading list placeholders......................................]   │
└──────────────────────────────────────────────────────────────────────┘
```

### H. Blocked State

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Command Palette                                                Esc  │
├──────────────────────────────────────────────────────────────────────┤
│ System  [Methodology]  Project                                       │
│ Scope: Equity Core  >  no draft selected                             │
│ Search: > add work unit                                              │
├──────────────────────────────────────────────────────────────────────┤
│ State: blocked - Select a draft version first                        │
│                                                                      │
│ What happened                                                        │
│  This action is unavailable because no editable draft version is in  │
│  scope.                                                              │
│                                                                      │
│ Why it happened                                                      │
│  Work-unit authoring belongs to a specific methodology version.      │
│                                                                      │
│ What is safe                                                         │
│  Your methodology selection is still active.                         │
│                                                                      │
│ How to fix it                                                        │
│  - Open Versions                                                     │
│  - Select an existing draft or create a new draft                    │
│  - Re-run Add Work Unit                                              │
│                                                                      │
│ TECHNICAL DETAILS                                                    │
│  Hidden by default                                                   │
└──────────────────────────────────────────────────────────────────────┘
```

### I. Failed State

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Command Palette                                                Esc  │
├──────────────────────────────────────────────────────────────────────┤
│ System  Methodology  [Project]                                       │
│ Scope: customer-portal                                               │
│ Search: > latest run                                                 │
├──────────────────────────────────────────────────────────────────────┤
│ State: failed - Couldn't load run commands                           │
│                                                                      │
│ What happened                                                        │
│  Chiron couldn't load run-related commands for this project.         │
│                                                                      │
│ Why it happened                                                      │
│  The project diagnostics service did not return a usable result.     │
│                                                                      │
│ What is safe                                                         │
│  Your project scope and search text are still preserved.             │
│                                                                      │
│ What you can do now                                                  │
│  - Retry loading run commands                                        │
│  - Open the Project dashboard instead                                │
│  - Open diagnostics for more detail                                  │
│                                                                      │
│ [Retry]  [Open Project Dashboard]  [View Diagnostics]                │
└──────────────────────────────────────────────────────────────────────┘
```

## Practical Usage Guidance

### Use Framework 1 when:

- the user starts from a general search
- the user may switch contexts during the same session
- the user wants a balanced discovery + speed model

### Switch into Framework 2 when:

- the user opens a local object such as a work unit
- the command universe should shrink to object-specific tabs and actions
- hierarchy and local navigation matter more than global switching

### Keep Framework 3 recorded, not primary, when:

- future operator research shows strong demand for a denser expert mode
- users benefit from a constant left-rail awareness model

## Notes for Later Implementation

- Keep context mode selection separate from scope selection.
- Prefer grouped results over one unstructured list.
- Preserve search text and selected scope through loading and failed states when safe.
- Distinguish `blocked` from `failed`.
- Keep technical details secondary.
- Treat recent items as supportive, not dominant.
