# Rich Selectors

This document defines the shared selector behavior for Epic 3 design-time surfaces that choose hierarchical variables, canonical paths, workflows, entities, or similar structured references.

## Scope

- This is the shared interaction contract for hierarchical variable, path, workflow, and entity selection.
- It covers rich selector behavior in form, branch, agent, action, invoke, display-adjacent variable insertion, and related methodology editors.
- It does not redefine the valid target namespace set or per-step schema fields.

## Pattern goals

- Make deep structured selection easier than manual string entry.
- Keep persisted references canonical and migration-safe.
- Reuse one stacked dialog pattern for advanced selection.
- Preserve context when moving between the base editor and deeper picker flows.

## Canonical persistence rule

- Selectors may render hierarchy in segmented form such as `project > facts > projectType`.
- Persisted references must use canonical dot-path persistence such as `project.facts.projectType`.
- The segmented form is a UI affordance only and is not the source of truth.
- When a selector stores a workflow or entity reference that is not a variable path, the stored value should still use the canonical serialized form defined by that contract rather than a display label.

## Hierarchical variable and path selection

- Variable and path selectors should present namespace-aware hierarchy rather than a flat text list whenever the selectable space includes nested structures.
- Supported hierarchy commonly includes `project`, `self`, `context`, and `project.workUnits` descendants.
- Selectors should expose resolved type and cardinality when that information affects valid operators, bindings, or downstream config.
- Branch and form editors should use the same canonical path browsing model even when the final authored field names differ.

## Workflow and entity selection

- Workflow selectors support fixed selection and variable-backed selection without changing the shared interaction model.
- Entity selectors should show stable identifying metadata needed to distinguish similarly named options.
- Selector results should store stable identifiers or canonical paths, not ephemeral UI labels.
- Where applicable, the selector should preview the chosen item in compact read-only form after selection.

## Stacked dialog usage

- Use stacked dialog usage for advanced selectors so the base step dialog stays focused.
- Child dialogs may break the flow into levels such as namespace choice, entity or path drill-down, then confirmation or advanced configuration.
- Closing a child selector without saving returns the user to the parent shell with the prior saved value intact.
- Saving a child selector updates the parent draft immediately and triggers any dependent validation refresh.

## Validation and diagnostics integration

- Selector choices participate in immediate validation for type, cardinality, namespace support, and dependency compatibility.
- Invalid or stale selections should surface through both inline issues and aggregate findings.
- If a path becomes incompatible because a related field changes, the selector surface should show the invalid state instead of silently rewriting the stored reference.

## Authoring guidance

- Use this document when a page-level spec needs hierarchical variable selection, workflow picking, or entity lookup behavior.
- Use `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md` for namespace authority, `fieldKey`, `sourcePath`, and `cardinality` semantics.
- Use `docs/architecture/methodology-pages/workflow-editor/step-dialog-patterns.md` for parent-shell tab and save behavior.
