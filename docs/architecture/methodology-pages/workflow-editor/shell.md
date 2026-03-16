# Workflow Editor

This document defines the stable implementation-facing spec for the Workflow Editor page in the methodology design-time surface.

Use `docs/architecture/epic-3-authority.md` for precedence when Epic 3 docs conflict. This file is the canonical surface spec for the Workflow Editor page.

## Scope

- This is the stable page-level spec for the Workflow Editor page.
- It defines shell purpose, layout, step-type affordances, selected-summary behavior, sticky toolbar behavior, and the boundary between shell editing and dialog-based deep editing.
- It does not restate per-step schema contracts.

## Purpose

- Provide the primary graph-authoring surface for workflow steps and edges.
- Keep graph editing visible and fast while routing detailed step configuration into dialogs.
- Satisfy Story 3.3 expectations for complete Workflow Editor shell behavior and deterministic save or validation handling.

## Workflow Editor shell layout

The Workflow Editor shell has three durable regions:

- page header
- left rail with step-type grid and selected summary
- main graph editor with in-canvas toolbar

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Back] [Workflow List]                  WORKFLOW: Generate Context            [Cancel][Save]│
├───────────────────────┬────────────────────────────────────────────────────────────────────┤
│ STEP TYPE             │ GRAPH EDITOR                                                        │
│ ┌──────┐ ┌──────┐     │ ┌───────────┐      ┌───────────┐      ┌───────────┐               │
│ │ form+│ │agent+│     │ │   form    │ ───► │  invoke   │ ───► │  action   │               │
│ └──────┘ └──────┘     │ └───────────┘      └───────────┘      └───────────┘               │
│ ┌──────┐ ┌──────┐     │        │                                       │                   │
│ │action│ │invoke│     │        └──────────────► ┌───────────┐ ◄────────┘                   │
│ │   +  │ │   +  │     │                         │  display  │                               │
│ └──────┘ └──────┘     │                         └───────────┘                               │
│ ┌──────┐ ┌──────┐     │                                                                    │
│ │branch│ │display│    │                                                                    │
│ │   +  │ │   +  │     │                                              [Pan][Zoom][Fit][Snap]│
│ └──────┘ └──────┘     │                                                                    │
│────────────────────── │                                                                    │
│ SELECTED SUMMARY      │                                                                    │
│ type: invoke          │                                                                    │
│ key: callDraftFlow    │                                                                    │
│ findings: ⚠1          │                                                                    │
│ [Open Step Dialog]    │                                                                    │
└───────────────────────┴────────────────────────────────────────────────────────────────────┘
```

Implementation note: ask the user again at implementation time for the reference image so the UI can intentionally emulate that design.

### Header

- left side: utility actions
- center: workflow identity and title
- right side: `Cancel` and `Save`

### Left rail

- `STEP TYPE` panel uses a 2x3 grid for six step types: `form`, `agent`, `action`, `invoke`, `branch`, `display`
- each tile keeps a `+` affordance for adding a new step of that type
- selecting a graph step highlights the matching step-type tile
- `SELECTED SUMMARY` stays summary-oriented and does not become the full editor

### Graph editor

- shows workflow nodes and edges
- supports drag and drop and click-to-add step creation
- selecting a node or edge updates the left selected-summary panel
- selected node or edge is visually expanded or highlighted

## Selected Summary contract

The selected-summary panel shows concise state for the current node or edge, such as:

- type
- key
- major data channels or targets
- findings count
- primary action to open deep editing

Expected actions remain summary-oriented, for example:

- `Open Step Dialog`
- `Edit`
- `Details`
- `Delete`

The shell should not duplicate all dialog fields inside the left rail.

## Deep editing boundary

- Detailed step configuration opens in dialogs.
- The left rail remains a selection summary and launch point.
- Shared dialog behavior follows `docs/architecture/methodology-pages/workflow-editor/step-dialog-patterns.md`.
- Path, target, and variable semantics follow `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md`.

Step-specific deep editing is owned by the promoted step contracts:

- `docs/architecture/methodology-pages/workflow-editor/form-step.md`
- `docs/architecture/methodology-pages/workflow-editor/agent-step.md`
- `docs/architecture/methodology-pages/workflow-editor/invoke-step.md`
- `docs/architecture/methodology-pages/workflow-editor/action-step.md`
- `docs/architecture/methodology-pages/workflow-editor/branch-step.md`
- `docs/architecture/methodology-pages/workflow-editor/display-step.md`

## Sticky toolbar behavior

- Graph controls live inside the graph container.
- The toolbar is sticky to the bottom of the graph container, not floating at page scope.
- The toolbar supports pan, zoom, fit, snap, and equivalent graph-view controls without displacing the editor layout.

## Validation and save behavior

- Selection changes must not discard unsaved dialog edits silently.
- Shell-level save state reflects dialog-derived validity and dirty state.
- Findings counts shown in the selected summary stay synchronized with step-level diagnostics.
- Save blocking and severity treatment should follow shared diagnostics rules in `docs/architecture/ux-patterns/diagnostics-visual-treatment.md`.

## State handling

- Empty workflow states must still render the step-type grid and a clear add-step path.
- Loading and error states should preserve workflow identity context.
- Keyboard flows for selection and add-step actions should match click outcomes where the interaction exists in both forms.

## Cross-references

- Use `docs/architecture/methodology-pages/workflow-editor/step-dialog-patterns.md` for stacked dialog, validation timing, and save or cancel rules.
- Use `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md` for canonical path and target semantics.
- Use `docs/architecture/methodology-pages/work-units/detail-tabs.md` for the Workflows tab that routes into this shell.
