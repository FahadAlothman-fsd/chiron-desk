# Work Units Overview

This document defines the stable implementation-facing spec for the Work Units Overview page, formerly referred to as Work Units (L1).

Use `docs/architecture/epic-3-authority.md` for precedence when Epic 3 docs conflict. This file is the canonical surface spec for the Work Units Overview page.

## Scope

- This is the stable design-time page spec for the Work Units Overview page.
- It defines page purpose, locked shell shape, selection model, action vocabulary, and readiness behavior.
- It does not redefine Work Unit Graph Detail (L2) tab content or workflow-step authoring contracts.

## Page purpose

- Give operators one deterministic L1 surface for discovering, creating, selecting, and opening methodology work units.
- Keep topology awareness, searchable access, and quick actions on one page without mixing in L2 editing concerns.
- Satisfy Story 3.1 route and shell expectations for complete design-time page shells with stable empty, loading, and error handling.

## Locked page shape

The Work Units Page (L1) uses a three-region shell:

- center canvas: L1 work-unit graph only
- right rail list: searchable work-unit index
- selected summary: selected-node identity plus primary actions

Page-level actions and tabs stay outside the canvas:

- header action: `+ Add Work Unit`
- top-level tabs: `Graph`, `Contracts`, `Diagnostics`

## Locked wireframe model

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ WORK UNITS                                                                 [+ Add Work Unit] │
│ Tabs: [Graph] [Contracts] [Diagnostics]                                                   │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│                              GRAPH CANVAS (L1 ONLY)                                         │
│                                                                                            │
│       [ Research ] ─────────► [ Context Pack ] ─────────► [ Draft Story ]                 │
│             │                          │                         │                          │
│             └──────────────► [ Facts ] ┴──────────────► [ QA ] ─┘                          │
│                                                                                            │
│────────────────────────────────────────────────────────────────────────────────────────────│
│ RIGHT RAIL: WORK UNIT LIST                                                                 │
│ [ Search work units... ]                                                                   │
│ • Research                states: 3  transitions: 2  gates: 1                              │
│ • Context Pack            states: 2  transitions: 1  gates: 0                              │
│ • Draft Story             states: 4  transitions: 3  gates: 2                              │
│ • QA                      states: 2  transitions: 1  gates: 1                              │
│                                                                                            │
│ SELECTED SUMMARY                                                                           │
│ Research                                                                                   │
│ key: research                                                                              │
│ actions: [Open details] [Open Relationship View]                                           │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- The canvas renders larger work-unit container nodes, not compact chips.
- The right rail owns search and list selection.
- The selected-summary panel stays summary-oriented. It does not become a full inspector.
- The page keeps a single primary selection at a time.

## Node contract

Each L1 node must show:

- display name and key
- description toggle with `Human` and `Agent` views
- usage-scope indicator through icon semantics, not raw jargon labels
- always-visible lightweight signals for states, transitions, gates, and diagnostics
- quick action entry points for the locked L1 actions

Design-time language is required here. Runtime active-state wording does not belong on this surface.

## Selection and action locks

- List selection and graph selection are bi-directional and always synchronized.
- Clicking a list row auto-focuses and visually prioritizes the node in the canvas.
- Selecting on the canvas updates the list highlight and selected summary immediately.
- Only one work unit can be selected at a time.
- Focused nodes are visually distinct and non-focused nodes are visibly de-emphasized.
- Keyboard flows and click flows must land in the same state.

The locked action vocabulary is:

- `Open details`
- `Open Relationship View`

Those labels are durable and should not drift into alternate wording.

## Component responsibilities

### Canvas (Graph)

- Render L1 work-unit nodes only.
- Support pan, zoom, and smooth auto-focus from list-driven selection.
- Keep L1 topology readable by routing deeper relationship editing into `Open Relationship View`.

### Work Unit List

- Provide deterministic search and scan for all work units.
- Drive selection and focus into the graph.
- May show lightweight health hints, but not full findings detail.

### Selected Summary

- Show selected work-unit identity and key context.
- Expose only the locked primary actions.
- Stay stable while the user changes tabs, unless route context changes away from Work Units (L1).

### Header and tabs

- Keep create action at page level.
- Separate graph, contract, and diagnostics contexts cleanly.

## State handling and readiness

- Empty state must explain the surface and offer `+ Add Work Unit` as the next action.
- Loading and error states must preserve prior selection context when practical.
- Save and publish readiness findings should use the shared diagnostics treatment in `docs/architecture/ux-patterns/diagnostics-visual-treatment.md`.
- Diagnostics must identify precise location by page, entity, or field and remain deterministic for equivalent invalid inputs.

## Cross-references

- Use `docs/architecture/methodology-pages/work-units/detail-tabs.md` for Work Unit Graph Detail (L2) tab boundaries.
- Use `docs/architecture/ux-patterns/diagnostics-visual-treatment.md` for severity styling and blocking semantics.
- Use `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md` as historical baseline rationale.
