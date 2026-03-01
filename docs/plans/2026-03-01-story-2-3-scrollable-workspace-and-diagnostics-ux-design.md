# Story 2.3 Scrollable Workspace and Diagnostics UX Design

Date: 2026-03-01
Owner: BMAD implementation stream
Scope: Epic 2 methodology workspace UX refinement for Story 2.3 surfaces

## Problem

The current Story 2.3 workspace is functionally correct but visually overloaded:

- too much content is shown in one long page,
- diagnostics read like raw engine/runtime output,
- publish and evidence are present but not prioritized in a triage-friendly way.

This slows operator decision-making and makes validation issues feel like internal system errors instead of guided remediation.

## Goals

1. Make the workspace scroll behavior intentional and predictable.
2. Reframe diagnostics as operator-facing guidance, not raw code dumps.
3. Preserve deterministic ordering, deep-linking, and Epic 2 runtime deferment rules.
4. Keep existing architecture and Story 2.2/2.3 contracts intact.

## Non-Goals

- Replatforming the entire workspace architecture.
- Introducing Epic 3 runtime execution behavior.
- Relaxing deterministic diagnostics/evidence semantics.

## Direction Decision

Selected model: Hybrid layout behavior.

- Desktop: split panes with independent scroll regions.
- Mobile/tablet: standard document flow with collapsible sections.

Rationale: this improves triage speed on large screens without harming usability on small screens.

## Section 1 - Scroll and Layout Contract

### Desktop (lg and up)

- Keep page shell stable; avoid one giant document scroll.
- Create independent vertical scroll regions:
  - main authoring region (workspace graph/editor),
  - right utility rail (diagnostics, publish, evidence).
- Make right rail sticky within viewport so diagnostics and publish remain reachable while editing.
- Constrain diagnostics list height with internal scroll to prevent page blowout.
- Keep publish and evidence visible in utility rail without displacing main editor context.

### Mobile and Tablet

- Revert to document flow with regular page scroll.
- Use collapsible sections for diagnostics, publish, and evidence.
- Preserve action availability and deterministic behavior parity with desktop.

## Section 2 - Diagnostics UX Redesign

### Card-Based Diagnostic Rows

Each diagnostic renders as an operator card with:

- severity badge (`Blocking` or `Warning`),
- human-readable title,
- short "Why this matters" explanation,
- short "How to fix" remediation text,
- `Go to field` action preserving current deep-link focus behavior.

### Technical Detail Placement

- Keep machine code (for example `WF_STEP_TYPE_INVALID`) available as secondary metadata.
- Move code/scope payload into a compact "Details" line so it does not dominate the UI.

### Grouping and Filtering

- Keep group buckets: `Field`, `Work Unit`, `Transition`, `Workflow`.
- Keep deterministic ordering semantics from current implementation.
- Add quick filters:
  - `All`,
  - `Blocking`,
  - `Warnings`,
  - text search over title/scope/remediation.

### Summary Strip

Add a compact summary at top of diagnostics panel:

- total count,
- blocking count,
- warning count,
- explicit publish status message (blocked vs allowed with warnings).

## Section 3 - Interaction and Visual Polish

- Use calm, product-grade feedback styling instead of "runtime crash" appearance.
- Prioritize information hierarchy:
  - headline actionability first,
  - remediation second,
  - low-level metadata last.
- Add distinct empty states:
  - no diagnostics,
  - warnings only,
  - blocking issues present.
- Keep runtime controls visible but disabled with exact copy:
  - `Workflow runtime execution unlocks in Epic 3+`.

## Accessibility and Behavior Requirements

- Keyboard navigation across diagnostics list and "Go to field" actions.
- Focus ring visibility and deterministic focus transfer after deep-link clicks.
- Non-color-only severity communication (badges/icons/text labels).
- Preserve deterministic sort order and avoid client-side mutation of server evidence records.

## AC Mapping

- AC1: improved grouped diagnostics and actionable deep-links.
- AC2: publish remains deterministic with clearer preflight messaging.
- AC3: evidence remains queryable and visible, with improved panel ergonomics.
- AC4: immutable rejection remains deterministic with better operator framing.
- AC5: runtime controls remain visible/disabled while publish/evidence stay usable.

## Implementation Surfaces (Expected)

- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- `apps/web/src/features/methodologies/version-workspace.tsx`
- `apps/web/src/features/methodologies/version-workspace-graph.tsx`
- optional helper extraction under `apps/web/src/features/methodologies/` for diagnostics presentation and filtering.

## Approval Status

User-approved direction: Hybrid layout (`C`) with scroll containment and diagnostics redesign.
