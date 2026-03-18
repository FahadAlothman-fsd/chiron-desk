# Work Units L1 Design

Date: 2026-03-17
Status: approved-for-planning

## Goal

Implement the methodology-version Work Units Overview page (`/methodologies/:methodologyId/versions/:versionId/work-units`) as the approved L1 browsing and selection surface, with synchronized graph/list views, a persistent right rail, and routing into L2 for deeper editing.

## Scope

- This design covers Work Units L1 only.
- It does not redesign Work Unit L2 tabs.
- It does not move full editing into L1.

## Locked page contract

- Header action: `+ Add Work Unit`
- Views: `Graph` and `List`
- Single active selection shared across graph, list, and right rail
- Persistent right rail with:
  - search
  - work-unit index
  - active work-unit summary
- Primary actions on the active work unit:
  - `Open details`
  - `Open Relationship View`

## Entity model

- The L1 graph contains exactly one node type: `Work Unit`
- Transitions are never separate nodes in L1
- Transition counts and workflow counts are details rendered inside each work-unit card
- Edges connect work units to work units only

## Edge derivation rule

This is partially implied today in the codebase and surrounding docs, but it is not stated clearly enough in the canonical Work Units L1 page doc yet, so this design locks it explicitly:

- A visible L1 edge exists only when a work-unit-to-work-unit relationship can be derived from:
  1. a defined dependency/link type, and
  2. a fact/value authored on a work unit that references another work unit through that link semantics
- Transitions do not create graph entities or graph edges at L1
- Transition-to-workflow bindings remain an internal detail for work-unit detail/readiness flows, not the source of L1 topology edges

## View behavior

### Graph view

- Center pane shows only work-unit cards and work-unit-to-work-unit edges
- Active card is visually distinct
- Non-active cards are de-emphasized
- Each card shows overview-level metadata only:
  - display name
  - key
  - counts for transitions, workflows, facts, relationships/diagnostics as available
- Card actions stay lightweight and overview-oriented

### List view

- Uses the same underlying selection model as the graph
- Swaps the center pane from canvas to table/list
- Keeps the same right rail and same active selection
- Row click updates the graph/list shared selected work unit

## Right rail contract

- Search field filters the work-unit index deterministically
- Work-unit list drives selection
- Active work-unit summary shows:
  - display name
  - key
  - overview counts
  - `Open details`
  - `Open Relationship View`
- Right rail remains summary-oriented; it is not a full inspector

## URL state

- Route path owns durable methodology/version scope
- Search params own local page state:
  - `view=graph|list`
  - `selected=<workUnitKey>`
- Reloading or sharing the URL restores the same L1 view + selection when possible

## Reuse direction

- Reuse pure graph/projection helpers from `apps/web/src/features/methodologies/version-graph.ts`
- Do not reuse the full `version-workspace-graph.tsx` monolith wholesale
- Extract/adapt reusable pieces for:
  - L1 work-unit projection
  - synchronized selection
  - graph/list shared focus behavior

## Notes on documentation status

The current canonical L1 doc at `docs/architecture/methodology-pages/work-units/overview.md` already documents the three-region shell and right rail, but it still shows legacy tabs (`Graph`, `Contracts`, `Diagnostics`) and does not clearly spell out the exact edge-derivation rule above. This design serves as the approved contract for implementation planning.
