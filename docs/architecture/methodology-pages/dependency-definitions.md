# Dependency Type Definitions

This document defines the stable implementation-facing spec for Dependency Type Definitions.

Use `docs/architecture/epic-3-authority.md` for precedence when Epic 3 docs conflict. This file is the canonical surface spec for Dependency Type Definitions.

## Scope

- This is the stable design-time page spec for Dependency Type Definitions.
- It defines page purpose, semantic-only scope, selector behavior, and impact-validation expectations.
- It does not make dependency definitions the enforcement authority for transition gating.

## Page purpose

- Define reusable semantic dependency or link types once at methodology level.
- Let work-unit topology and transition gate policy reference those definitions consistently.
- Keep meaning and usage discoverable without pushing enforcement rules into this page.

## Semantic-only scope

- Link types are semantic definitions only.
- Transition condition sets remain the enforcement authority for required vs optional behavior, blocking semantics, and phase-specific gating.
- Strength taxonomy is not the primary policy mechanism for the stable baseline.

This boundary is durable. Dependency Type Definitions should not grow into a second gate-policy editor.

## Locked page shape

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEPENDENCY DEFINITIONS                                                  [+ Add Link Type] │
│ Tabs: [Definitions] [Usage] [Diagnostics]                                                 │
├──────────────────────────────────────────────────────────────────────────┬─────────────────┤
│ LINK TYPE LIST                                                          │ SELECTED DETAIL │
│ [ Search link types... ]                                                │                 │
│                                                                          │ Key: depends_on │
│ • depends_on                                                             │ Label: Depends On │
│ • informs                                                                │ Description: Requires upstream context. │
│ • blocks                                                                 │                 │
│ • references                                                             │ Used by: 12 links │
│                                                                          │ Inbound: 5      │
│ Select row -> load detail                                                │ Outbound: 7     │
│                                                                          │                 │
│                                                                          │ [Edit] [Archive]│
└──────────────────────────────────────────────────────────────────────────┴─────────────────┘
```

- tabs: `Definitions`, `Usage`, `Diagnostics`
- searchable link-type list on the left
- selected-detail panel on the right
- page-level create action: `+ Add Link Type`
- selected detail shows key, label, description, usage counts, inbound and outbound references, plus `Edit` and `Archive`

## Definition rules

- Keys are unique per methodology version.
- Semantic fields such as key and description are the stable core.
- Editing a link type triggers deterministic impact diagnostics for affected usages.
- Archive flows require explicit confirmation when usages still exist.

## Selector behavior

- Work Unit selector and Link Type selector use the shared rich-selector pattern.
- Options show primary display name plus short description subtitle.
- Selected values show concise identity while preserving access to the longer description when expanded or hovered.
- Persisted selections use stable identifiers, not display-only labels.

Use `docs/architecture/ux-patterns/rich-selectors.md` for the shared selector interaction contract.

## Legacy field note

Current canonical fields in `methodology_link_type_definitions` include:

- `key`
- `description_json`
- `allowed_strengths_json`

`allowed_strengths_json` is transitional and must not be treated as the primary policy authority for new implementation work.

## Component responsibilities

### Link type list

- Support search and selection of methodology dependency semantics.
- Keep selection synchronized with the detail panel.

### Selected detail

- Show semantic meaning and usage context.
- Expose edit and archive entry points.

### Diagnostics surfaces

- Surface impacted-usage findings when a definition changes.
- Keep blocking vs non-blocking severity consistent with shared diagnostics treatment.

## Cross-references

- Use `docs/architecture/methodology-pages/state-machine-tab.md` for the gate-policy surface that consumes dependency definitions.
- Use `docs/architecture/ux-patterns/rich-selectors.md` for selector behavior.
- Use `docs/architecture/ux-patterns/diagnostics-visual-treatment.md` for findings treatment.
