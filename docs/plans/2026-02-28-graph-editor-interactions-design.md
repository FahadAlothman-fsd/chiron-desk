# Graph Editor Canonical Interactions (No JSON Editing)

Date: 2026-02-28
Status: Proposed (interaction contract)

## Goal
Define canonical user interactions for a graph-first methodology editor that supports creating and editing:
- work units (work unit types)
- transitions (lifecycle transitions)
- workflows (workflow definitions)
- bindings (transition -> workflow bindings)

The graph is the only editable source of truth. Users do not edit JSON as a routine authoring surface.

## Non-goals
- Changing server-side canonical models or persistence boundaries.
- Real-time multi-user collaboration.
- Adding new step kinds or expanding runtime execution behavior.

## Interaction principles (hard rules)
- Graph-first: all edits apply to canonical in-memory graph state via typed operations.
- Command parity: every visible authoring action is available via command palette with equivalent validation and outcomes.
- Determinism: equivalent inputs produce equivalent derived projections, ordering, and diagnostics.
- Safety: destructive operations are explicit and confirmable; key renames are transactional (refactor-style).
- JSON posture: JSON is import/export + diagnostics only; never the primary edit surface.

## Surfaces
- Canvas (graph): visual topology, selection, drill-in/out by scope.
- Inspector (details panel): the primary edit surface for selected entity fields.
- Scope controls: L1/L2/L3 buttons, breadcrumbs, scoped dropdowns.
- Bindings panel (L2): the primary surface for transition-workflow bindings.
- Diagnostics panel: deterministic list of validation errors/warnings mapped to entities/fields.
- Command palette: search + invoke all create/edit/bind/rename/delete operations.
- Raw JSON panel (advanced): read-only export by default; explicit apply-import only.

## Canonical scopes
- L1: methodology overview (catalog of work unit types, optionally agent types).
- L2: within a selected work unit type (transitions + workflows + bindings).
- L3: within a selected workflow (workflow steps + edges).

Assumption for this contract: L3 supports step + edge editing now.
If L3 is deferred, all L3 create/connect/delete actions are disabled and the inspector is metadata-only.

## Shared interaction primitives

### Selection and focus
- Click selects a node/edge.
- Esc clears selection and drills up one scope level.
- Enter drills in (L1->L2 for work unit selection; L2->L3 for workflow selection) when selection supports it.
- Keyboard focus never gets trapped in the canvas; tab order remains predictable (scope controls -> canvas -> inspector).

### Create
- Primary entry: a `+` action in the current scope header (button) and a command palette action.
- Secondary entry: canvas context menu at cursor.
- Create always starts with a minimal modal (required fields only) and deterministic key generation if auto.

### Edit
- Inspector is the canonical field editor.
- Field edits apply optimistically to the canonical graph state.
- Invalid fields render inline errors and a node-level diagnostic badge count.

### Rename key (refactor)
- Keys are never edited inline.
- `Rename key...` performs a single atomic update of:
  - the entity key
  - all references to that key (bindings, workflow attachments, transition references)
- UI displays an impact preview (reference count) before applying.

### Delete
- `Delete...` is explicit and confirmable.
- UI shows what else changes (e.g., bindings removed, references detached) before final confirmation.
- If an entity is referenced and the system cannot deterministically detach, delete is blocked with remediation guidance.

### Deterministic ordering
- Lists in inspector/panels are sorted by stable keys.
- Diagnostics are sorted deterministically (scope group -> entity key -> field -> code).

## Entity interactions

### Work unit type (work unit)
Create (L1)
- Button: `+ Work Unit`.
- Modal fields:
  - `key` (required; validated for format + uniqueness)
  - `displayName` (optional)
  - `cardinality` (optional; default applied)

Edit (L1/L2)
- Select work unit node.
- Inspector fields (minimum): `displayName`, `cardinality`.

Duplicate (L1)
- `Duplicate work unit...` prompts for new key; copies all attached transitions and associated configuration.

Rename (L1/L2)
- `Rename key...` updates:
  - workflows attached to the work unit
  - transitions owned by the work unit (scope keys)
  - any derived indices

Delete (L1)
- Blocked if workflows/transitions exist unless a deterministic delete plan is available and previewed.

### Transition (lifecycle transition)
Ownership
- A transition is owned by a work unit type (L2).

Create (L2)
- Button: `+ Transition`.
- Modal fields (minimum): `transitionKey`, `fromState`, `toState`.

Edit (L2)
- Select transition node.
- Inspector edits fields; validation errors bind to transition key + field.

Delete (L2)
- Confirmation includes: number of bindings that will be removed.

### Workflow
Ownership
- A workflow is attached to a work unit type (L2) and contains steps/edges (L3).

Create (L2)
- Button: `+ Workflow`.
- Modal fields (minimum): `workflowKey`, optional `displayName`.

Edit metadata (L2/L3)
- Select workflow node.
- Inspector edits `displayName` and any supported metadata.

Rename (L2/L3)
- `Rename key...` updates:
  - transition-workflow bindings
  - any step/edge references that include workflow key in IDs

Delete (L2)
- Confirmation includes: bindings removed + steps/edges removed.

### Workflow step (L3)
Create
- Button: `+ Step` -> type picker (agent/form/action/invoke/branch/display).
- Step key is deterministic if auto (type prefix + counter) and unique within workflow.

Edit
- Select step node -> inspector shows step-type-specific fields.

Delete
- Confirmation includes whether edges will be removed and whether this disconnects the workflow.

### Workflow edge (L3)
Create
- Drag-connect from a source handle to a target handle.

Edit
- Select edge -> inspector edits edge properties (label/condition if supported).

Delete
- Select edge -> `Delete`.

## Bindings (transition -> workflow)

### Primary interaction (L2 bindings panel)
- User selects a transition (dropdown or by selecting a transition node).
- Panel shows workflow catalog for the current work unit.
- Each workflow row has a `Bound` toggle.

Batch operations (L2)
- `Bind eligible` (binds all workflows that pass eligibility filter for the selected transition).
- `Unbind all`.
- `Copy bindings from...` (transition picker).

### Optional gesture (canvas)
- Drag a bind handle from a transition node to a workflow node to add binding.
- Click a binding edge to remove.

### Eligibility and diagnostics
- Panel shows two lists (or labels): `eligible` vs `bound`.
- Invalid bindings remain visible but flagged with deterministic diagnostics.

## Save, reload, and diagnostics behavior
- Manual `Save Draft` is the default.
- Save compiles canonical graph state to existing persistence boundaries:
  1) lifecycle payload
  2) workflows payload (including bindings)
- After successful saves: invalidate/refetch projection and replace canonical graph (replace-on-success).
- While dirty: background refetch does not overwrite local state; UI may show a non-blocking badge if server state changed.

Diagnostics
- Parsing errors do not exist in the normal flow (no JSON editing).
- Validation diagnostics bind to entity and field:
  - shown inline in inspector
  - shown as node badges
  - listed in diagnostics panel with stable ordering

## Raw JSON fallback (minimal role + exposure policy)

### Capabilities
- Export (default when enabled): deterministic, read-only JSON derived from canonical graph.
- Apply JSON (advanced): a separate editable buffer + `Apply` button that imports JSON into canonical graph via parse + shape-check.

### Role gating
- `View raw JSON`: allowed for a maintainer/debug role.
- `Apply raw JSON`: allowed only for platform/maintainer role.

### Policy: when to expose
Expose `View raw JSON` only when at least one of these is true:
1) Import/export: the user needs to seed or export methodology contracts.
2) Support/debug: copy deterministic state for a bug report.
3) Forward-compat: the backend projection contains fields not yet representable in the UI (surface an `unsupported fields present` badge).

Expose `Apply raw JSON` only when at least one of these is true:
1) Recovery: user must paste a known-good exported payload to restore a broken draft.
2) Migration: an admin needs to apply a bulk update that the UI does not yet model.

### Policy: when NOT to expose
Do not expose raw JSON as a default authoring surface or as a workaround for missing UI affordances.

## Open decisions
- L3 scope: confirm whether step+edge editing is in-scope now (assumed yes for this contract).
