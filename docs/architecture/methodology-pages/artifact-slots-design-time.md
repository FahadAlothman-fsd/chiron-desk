# Artifact Slots tab

This document defines the stable implementation-facing spec for the Artifact Slots tab.

Use `docs/architecture/epic-3-authority.md` for precedence when Epic 3 docs conflict. This file is the canonical surface spec for the Artifact Slots tab.

## Scope

- This is the stable design-time spec for the Artifact Slots tab under Work Unit Graph Detail (L2).
- It defines the slot, template, and snapshot boundary, locked tab shape, supported update paths, and gate or staleness semantics needed for implementation.
- It does not turn runtime artifact history into a first-class editor surface.

## Purpose

- Define artifact slot contracts per methodology version and work-unit type.
- Let authors manage slot metadata, slot rules, and slot-owned templates without mixing those concerns into runtime evidence pages.
- Keep runtime snapshots visible only as a referenced consequence of execution, not as the design-time authority surface.

## Design-time boundary

- Artifact Slots tab is methodology design-time only.
- Slot definitions and slot-owned templates are the design-time authority.
- Project artifact snapshots are runtime evidence.
- Runtime file-level audit expansion remains deferred and must not be treated as required for the baseline design-time surface.

## Data model split

The locked model has three layers:

- `methodology_artifact_slot_definitions`: design-time slot contracts
- `methodology_artifact_slot_templates`: design-time templates owned by a slot
- `project_artifact_snapshots`: immutable runtime output records

Implementation must preserve that split. Design-time slot editing must not write directly into runtime snapshot records.

## Locked tab shape

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ ARTIFACT SLOTS (DESIGN-TIME)                                                [+ Add Slot]   │
│ Tabs: [Overview] [Facts] [Workflows] [State Machine] [Artifact Slots]                     │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Search slots... ] [Filter: cardinality] [Filter: templates]                             │
│                                                                                            │
│ Slot Key            Cardinality   Templates   Rules Summary                   Actions       │
│ story_doc           single        1           output path configured          [Edit]        │
│ architecture_doc    single        1           output path configured          [Edit]        │
│ code_changes        fileset       0/optional  include/exclude globs           [Edit]       │
│                                                                                            │
│ Row expand:                                                                                │
│ - description                                                                              │
│ - template attachments (key/name summary)                                                    │
│ - include/exclude summary                                                                   │
│ - findings                                                                                 │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- page title uses `ARTIFACT SLOTS (DESIGN-TIME)`
- page-level action: `+ Add Slot`
- searchable and filterable slot table
- row fields: slot key, cardinality, template count, rules summary, actions
- row expansion for description, template attachments, include or exclude summary, and findings

## Slot contract rules

- `id` is the canonical identity for slots; `key` is editable secondary metadata.
- `slot_key` (the `key` field) is unique per methodology version and work-unit type but can change without changing slot identity.
- `cardinality` is `single` or `fileset`.
- Git-tracking expectations belong on the slot definition.
- Include and exclude glob rules plus output path strategy belong to slot rules.
- Slot-level requiredness is not the main enforcement mechanism. Transition gate policy owns whether a slot is required for readiness.
- Identity rule: slots are referenced by `id` across payloads, UI state, editing flows, and persistence boundaries.
- Draft convention: client-created slots use `draft:{uuid}` temporary ids before persistence; server returns real UUIDs after save.

## Template contract rules

- Templates are attached under a slot, not authored as free-floating artifacts.
- `id` is the canonical identity for templates; `key` is editable secondary metadata.
- Template metadata includes id, key, name, description, guidance, and content.
- Template rendering hints live with the template contract, not with runtime snapshot records.
- Variable usage inside templates should follow `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md`.
- **Phase 1 authoring**: Handlebars + Monaco for markdown template authoring.
- **Phase 1 scope**: No rendered preview; scope stops at author/edit/save/persist plus runtime-ready content.
- **Canonical storage**: Markdown template source is the canonical content; no Plate, Slate JSON, or rich-text canonical storage.

## Add and edit flow

The Artifact Slots tab uses stacked dialog editing:

- `Level 1 - Slot Dialog`: slot id (draft or persisted), `slot_key`, `display_name`, description, guidance, `cardinality`
- `Level 2 - Templates Tab`: nested template CRUD with id-first identity
- `Level 3 - Template Dialog`: template id (draft or persisted), template key, name, description, guidance, content authoring

### Id-first persistence seam

- Slots and templates are persisted through a bulk replace mutation that updates by id.
- `draft:{uuid}` ids create new rows; persisted UUIDs update existing rows.
- Unknown non-`draft:` ids are rejected with deterministic errors.
- Key can change without changing entity identity.
- Dirty indicators track edits per tab (Contract, Guidance, Templates, Content).
- Discard protection confirms before losing unsaved changes.

## Frozen schema baseline (Story 3.2)

Design-time implementation for Story 3.2 uses this minimal schema baseline:

- `methodology_artifact_slot_definitions`
  - `id`
  - `methodology_version_id`
  - `work_unit_type_id`
  - `key`
  - `display_name`
  - `description_json`
  - `guidance_json`
  - `cardinality` (`single | fileset`)
  - `rules_json` (optional, machine-evaluated structured rules only)
  - `created_at`
  - `updated_at`
- `methodology_artifact_slot_templates`
  - `id`
  - `slot_definition_id`
  - `key`
  - `display_name`
  - `description_json`
  - `guidance_json`
  - `content`
  - `created_at`
  - `updated_at`

Excluded from v1 by design (YAGNI):

- `purpose`
- `allowed_namespaces_json`
- `default_content_json`
- separate persisted `variables` column

Variable namespaces are validated through the shared variable target model and are not stored per template row.

Validation and findings behavior should follow `docs/architecture/methodology-pages/workflow-editor/step-dialog-patterns.md` and `docs/architecture/ux-patterns/diagnostics-visual-treatment.md` where shared shell rules apply.

## Update paths

Three update paths are supported and must converge through the same mutation and snapshot pipeline:

- deterministic fileset capture through `artifact-sync`
- agent-driven edits followed by explicit sync into Chiron
- template-based creation or update through render plus upsert snapshot flow

Implementation should not invent separate side channels for artifact mutation outside those paths.

## Gate and staleness semantics

- Cross-story overlap and staleness checks are gate concerns, not ad hoc slot-tab policy.
- Transition condition sets own blocking behavior.
- Git-aware gate conditions compare snapshot commit or hash references.
- Reassessment outcomes are persisted as facts or evidence and then evaluated by gate logic.

## Component responsibilities

### Slot table

- Give fast scan of slot inventory and readiness hints.
- Route deep editing into dialogs.

### Row expansion

- Show enough template and rule context to decide whether deeper edits are needed.

### Slot dialog stack

- Own slot basics, rule editing, template attachment, and validation.

## Cross-references

- Use `docs/architecture/methodology-pages/work-units/detail-tabs.md` for the parent L2 tab model.
- Use `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md` for variable namespace rules reused by slot templates.
- Use `docs/architecture/ux-patterns/diagnostics-visual-treatment.md` for findings treatment.
