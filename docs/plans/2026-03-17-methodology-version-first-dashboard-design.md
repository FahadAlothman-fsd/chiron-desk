# Methodology Version-First Dashboard Design

Date: 2026-03-17  
Status: approved-for-implementation

## Context

Current methodology dashboard behavior mixes version ownership with cross-version fact inventory cues, which creates IA ambiguity. The canonical direction is version-first authoring: version lifecycle is the primary model, and editing surfaces are version-scoped.

## Goal

Make `/methodologies/:methodologyId` a version-first dashboard that clearly communicates lifecycle state and ownership, using badges and summary signals, with no facts inventory on this page.

## Final UX Decision (approved)

### 1) Page contract

Route: `/methodologies/:methodologyId`

This page shows:
- Versions list (ledger)
- Latest Active Version
- Latest Draft Version
- Aggregate version stats

This page does **not** show facts inventory/editor content.

### 2) Summary strip

Top summary cards/strip includes:
- Latest Active (latest published version)
- Latest Draft (latest draft version)
- Total Versions

Optional additional counters:
- Published count
- Draft count
- Archived count

### 3) Versions ledger

Each row includes:
- Display Name
- Version string
- Lifecycle badge (`Draft`, `Published`, `Archived`)
- Updated timestamp
- Actions (`Open`, `Edit` where permitted)

### 4) Badge semantics

Required badges:
- Lifecycle badge per row (`Draft` / `Published` / `Archived`)
- Optional row accent badge for `Latest Active` and `Latest Draft`

Badge color/shape should be consistent with existing UI tokens and not introduce new one-off styles.

## Editability Rule (new decision)

If **no projects are pinned** to a version, the version is editable in place.

If **one or more projects are pinned** to a version, the version is treated as immutable and must be changed through draft/new-version flow.

This rule applies uniformly at the dashboard decision point for version-level actions.

## Behavior matrix

| Version lifecycle | Pinned project count | Edit in place | Required path |
| --- | ---: | --- | --- |
| Draft | 0 | Yes | Open/Edit version directly |
| Draft | >0 | No | Create/continue draft/new-version flow |
| Published | 0 | Yes | Open/Edit version directly |
| Published | >0 | No | Create draft/new-version flow |
| Archived | any | No | Read-only/open only |

## IA implications

- Facts are still version-scoped editor surfaces.
- Dashboard remains version-first and does not imply facts are methodology-global.
- Sidebar + command palette should preserve version context and route users to version-owned pages.

## Non-goals

- No redesign of full draft/activation lifecycle in this change.
- No deep workflow editor behavior changes.
- No runtime execution scope changes.

## Acceptance criteria

1. `/methodologies/:methodologyId` renders a version ledger and summary strip; no facts table/editor appears.
2. Latest Active and Latest Draft are clearly visible at top.
3. Each version row has lifecycle badge(s).
4. Edit action availability reflects pinned-project rule.
5. Locked rows clearly communicate why editing is disabled.

## Testing expectations

- Route/integration tests for:
  - summary strip values
  - badge rendering and labels
  - edit enabled/disabled by pinned count
  - no facts inventory section on methodology dashboard route
- Command/sidebar navigation tests should still pass with unchanged version-scoped routes.
