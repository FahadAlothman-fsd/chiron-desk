# Methodology Versions

This document defines the stable implementation-facing spec for the Methodology Versions page.

Use `docs/architecture/epic-3-authority.md` for precedence when Epic 3 docs conflict. This file is the canonical surface spec for the Methodology Versions page.

## Scope

- This is the stable methodology-owned page spec for the Versions surface.
- It defines the versions ledger, row model, lifecycle states, primary actions, and the routing boundary between methodology-wide context and version-scoped authoring.
- It does not redefine the inner behavior of Work Units, Facts, Workflow Editor, or other version-owned pages.

## Page purpose

- Give operators one deterministic methodology-owned home for viewing, creating, selecting, and reasoning about methodology versions.
- Make version scope explicit before the user enters version-owned authoring surfaces.
- Keep methodology-wide metadata separate from version-specific design-time authoring state.

## Locked page shape

The Versions page is a ledger/list view under a selected methodology.

- Route: `/methodologies/:methodologyId/versions`
- Primary action: `+ Create Version`
- Secondary actions per row: `Open Version`, `Duplicate`, `Archive` (where lifecycle permits)
- Stable page regions:
  - methodology header and summary
  - versions ledger/table
  - selected row summary / lifecycle details
  - findings and readiness strip

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ METHODOLOGY: BMAD v1                                                        [+ Create Version] │
│ Tabs: [Versions]                                                                            │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Summary: [Total: 4] [Draft: 1] [Published: 2] [Archived: 1] [⚠1]                         │
│ [ Search versions... ] [Filter: lifecycle] [Filter: findings]                              │
│                                                                                            │
│ Version            Lifecycle      Scope Summary                    Findings   Actions       │
│ v1.0               Published      facts: 12  work units: 5         ✓          [Open Version] │
│ v1.1-draft         Draft          facts: 13  work units: 6         ⚠1         [Open Version] │
│ v0.9               Archived       legacy baseline                  ✓          [View]         │
│                                                                                            │
│ SELECTED SUMMARY                                                                           │
│ v1.1-draft                                                                                │
│ status: Draft                                                                              │
│ created from: v1.0                                                                         │
│ actions: [Open Version] [Duplicate] [Archive]                                              │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Routing model

- `Versions` is the umbrella methodology page everything version-scoped hangs under.
- Selecting a methodology version routes the user into version-scoped authoring under `/methodologies/:methodologyId/versions/:versionId/...`.
- Version-owned surfaces include at least:
  - Work Units Overview
  - Work Unit Detail Tabs
  - Methodology Facts
  - Workflow Editor
  - other methodology-version authoring surfaces that are added later
- Methodology-wide pages remain outside the version route until explicitly declared version-owned.

## Version row model

Each row in the versions ledger should expose:

- version display name
- stable version key / identifier
- lifecycle state
- origin / derived-from lineage when applicable
- concise scope summary (for example counts for facts, work units, workflows, findings)
- findings badge and blocking summary
- durable row actions

The page is list-first. Deep editing does not happen inline here.

## Lifecycle states

The page must treat lifecycle state as first-class metadata.

- `Draft`
  - mutable design-time candidate
  - valid target for current authoring work
- `Published`
  - stable released methodology version
  - valid project pin target
- `Archived`
  - retained for lineage and historical execution context
  - not the normal target for new project pinning

Additional lifecycle refinements may be added later, but those states are the minimum stable model for this page.

## Action model

- `+ Create Version`
  - creates a new draft version under the current methodology
- `Open Version`
  - enters the selected version's authoring surfaces
- `Duplicate`
  - creates a draft derived from the selected version
- `Archive`
  - moves a version into historical/non-active state when policy allows

This page is intentionally ledger-first. It should not become a general metadata editor for all methodology-wide settings.

## Relationship to other surfaces

### Methodology-wide, not version entry pages

- `Versions` is the entry surface that establishes which methodology version the user is working inside.
- It sits above the version-owned pages, rather than competing with them.

### Version-owned authoring pages

After entering a version, the user moves into version-scoped pages such as:

- `docs/architecture/methodology-pages/work-units/overview.md`
- `docs/architecture/methodology-pages/work-units/detail-tabs.md`
- `docs/architecture/methodology-pages/methodology-facts.md`
- `docs/architecture/methodology-pages/workflow-editor/shell.md`

Those docs define the behavior inside a selected version. This page defines how the user gets there and how versions are represented.

## Diagnostics and readiness

- Findings on this page summarize version-level readiness and lineage concerns.
- Errors block publish or archive actions when policy requires it.
- Warnings may allow save or navigation while still surfacing unresolved issues.
- Findings treatment must stay aligned with `docs/architecture/ux-patterns/diagnostics-visual-treatment.md`.

## Exploration: repinning and upgrade behavior

The following is intentionally exploratory guidance, not locked policy yet.

Current working ideas from product discussion:

- easy/safe changes during repin likely include:
  - adding a new work unit type
  - adding a project fact
  - adding a work unit fact
  - adding a transition type
  - adding a workflow
  - adding a workflow to the allowed workflows of a transition
- deletion or modification of existing facts should likely be rejected or deferred for now
- editing existing workflows is still unresolved and needs a later dedicated policy
- older executions may stay attached to the version they originally ran against even when newer executions use a newer pinned version

Do not treat that list as final methodology versioning policy yet. It is here so the Versions page can preserve the current product thinking without overstating it as locked canon.

## Cross-references

- Use `docs/plans/2026-03-09-methodology-shell-information-architecture-design.md` for historical IA rationale.
- Use `docs/plans/2026-03-10-methodology-version-scoped-sidebar-implementation-plan.md` for historical version-scoped route rationale.
- Use `docs/architecture/methodology-pages/work-units/overview.md` and `docs/architecture/methodology-pages/work-units/detail-tabs.md` for version-owned work-unit surfaces.
- Use `docs/architecture/methodology-pages/workflow-editor/shell.md` for version-owned Workflow Editor behavior.
- Use `docs/architecture/ux-patterns/diagnostics-visual-treatment.md` for shared findings treatment.
