# Methodology Facts

This document defines the stable implementation-facing spec for Methodology Facts authoring.

Use `docs/architecture/epic-3-authority.md` for precedence when Epic 3 docs conflict. This file is the canonical surface spec for Methodology Facts.

## Scope

- This is the stable design-time page spec for Methodology Facts.
- It defines page purpose, dialog-first CRUD, fact-cardinality rules, diagnostics behavior, and scope boundaries.
- It does not move dependency policy enforcement onto facts.

## Page purpose

- Provide deterministic methodology-level fact authoring that stays usable for both current save flows and later publish validation.
- Keep create and edit work inside dialogs so the page stays scan-friendly and low-noise.
- Reuse one fact-authoring mental model across methodology-level facts and work-unit facts without collapsing their scopes together.

## Locked page shape

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ METHODOLOGY FACTS                                                             [+ Add Fact] │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Search facts... ] [Filter: type] [Filter: cardinality] [Filter: findings]               │
│                                                                                            │
│ Name                 Key               Type       Validation        Findings   Actions      │
│ Project Context      projectContext    work_unit  selector          ✓          [Edit]       │
│ Story Intent         storyIntent       string     required          ⚠1         [Edit]       │
│ Acceptance Notes     acceptanceNotes   string     none              ✓          [Edit]       │
│                                                                                            │
│ Create/Edit Fact Dialog                                                                   │
│ [Contract] [Guidance]                                                        [Cancel][Save]│
│ Name: ____________    Key: ____________                                                   │
│ Type: [string v]     Cardinality: [single v]                                            │
│ Default: __________                                                               ⛔2      │
│ Validation: [none/path/allowed-values/json-schema]                                       │
│ Human Guidance: ...                                                                       │
│ Agent Guidance: ...                                                                       │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- Page shell: list or table of facts with `+ Add Fact` as the page-level action.
- Row action: `Edit`, which opens the fact dialog.
- Primary list columns: name, key, type, validation, and findings summary.

Methodology Facts remains dialog-first CRUD. This page is not being redesigned into inline spreadsheet editing.

## Fact dialog contract

The create and edit dialog keeps a stacked three-part authoring flow:

- `Contract`: display name, key, type, cardinality, default, validation config
- `Guidance`: human guidance, agent guidance, description
- findings area plus persistent `Cancel` and `Save`

If deeper editing is needed for JSON-schema or selector-heavy fields, child stacked dialogs may be used, but the base interaction remains dialog-first.

## Fact semantics

- `cardinality` is first-class and required for methodology facts, using `single` or `set`.
- Type and validation compatibility are enforced before save.
- Key uniqueness is deterministic within methodology scope.
- Cardinality changes trigger immediate revalidation of dependent config.
- JSON-schema support stays available, but the detailed editor micro-UX is not owned by this page-level spec.

## Diagnostics and readiness

- Errors block save.
- Warnings may allow save when the draft remains storable.
- Findings must stay synchronized with inline field issues.
- Severity treatment follows `docs/architecture/ux-patterns/diagnostics-visual-treatment.md`.
- Deterministic diagnostics are required for key collisions, invalid defaults, invalid validation config, and invalid cardinality-dependent settings.

## Boundary to dependency policy

- `work_unit`-typed facts may carry semantic dependency metadata.
- Dependency policy enforcement does not live on Methodology Facts.
- Enforcement belongs in transition gate condition sets and workflow branch conditions.
- This page must not grow ad hoc link-policy controls that compete with those authorities.

## Selector and authoring rules

- Relational selectors use the rich dropdown pattern in `docs/architecture/ux-patterns/rich-selectors.md`.
- Selector options should show a primary label plus short context subtitle when selecting work units, link types, or similar entities.
- Persisted references must use the canonical serialized form for the selected entity, not transient display labels.

## Component responsibilities

### Fact list

- Provide fast scan of existing fact contracts and their validation state.
- Route edits into the dialog.

### Fact dialog

- Own contract edits, guidance edits, validation state, and save blocking.
- Revalidate immediately when type, cardinality, or validation settings change.

### Findings surfaces

- Show aggregate readiness at page and dialog level.
- Point the user back to the exact failing field or row.

## Cross-references

- Use `docs/architecture/ux-patterns/diagnostics-visual-treatment.md` for shared findings treatment.
- Use `docs/architecture/ux-patterns/rich-selectors.md` for selector interaction rules.
- Use `docs/architecture/methodology-pages/work-units/detail-tabs.md` for the L2 Facts tab boundary and scope framing.
