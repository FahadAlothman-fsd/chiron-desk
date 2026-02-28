# Graph-first Methodology Editor Design (JSON Fallback Only)

Date: 2026-02-28
Status: Proposed (ready-for-planning)
Owner: Platform / Methodology Workspace

## Goal

Make the methodology authoring workspace graph-first across L1/L2/L3 scopes: the canonical editable state is a normalized in-memory graph, and JSON is treated as an import/export + diagnostics surface only (never the source of truth).

This design targets the current Epic 2 authoring UI and keeps the existing backend write boundaries (`updateDraftLifecycle`, `updateDraftWorkflows`) as the initial persistence contract.

## Non-goals

- Changing the server-side canonical model (normalized tables already exist and are canonical).
- Introducing new workflow step capabilities or gate classes (locked surfaces).
- Solving real-time multi-user collaboration (we design deterministic single-operator semantics first).

## Constraints (carry-forward)

- Deterministic diagnostics: equivalent inputs produce equivalent diagnostic content and stable ordering.
- Append-only evidence posture: publish/pin lineage remains append-only and queryable deterministically.

(See: `docs/plans/2026-02-24-epic1-scope-boundaries-design.md`.)

## Current Implementation (baseline)

The current UI is graph-shaped but JSON-authoritative:

- Draft state is JSON strings per field in `MethodologyVersionWorkspaceDraft` (`apps/web/src/features/methodologies/version-workspace.tsx`).
- React Flow renders a projection over parsed JSON (`parseWorkspaceDraftForPersistence()` -> `projectMethodologyGraph()`), and bindings mutate JSON (`transitionWorkflowBindingsJson`) (`apps/web/src/features/methodologies/version-workspace-graph.tsx`).
- Save is a coarse "parse JSON -> compile payloads -> two mutations -> invalidate+refetch -> rebuild deterministic JSON" loop (`apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`).
- Deterministic reload is currently achieved by rebuilding JSON via `createDraftFromProjection()` after refetch (see `apps/web/src/features/methodologies/version-workspace.persistence.test.ts`).

This creates two recurring problems:

- JSON parsing/merging is on the hot path and becomes the de-facto state machine.
- Projection <-> editor synchronization is fragile (the graph is derived from JSON, but the graph is the primary interaction model).

## Target Architecture (graph-first)

### 1) Canonical state model

Introduce an in-memory normalized graph as the single editable source of truth:

- `MethodologyGraph` (canonical)
  - `displayName`
  - `workUnitTypesByKey: Map<workUnitTypeKey, WorkUnitTypeEntity>`
  - `agentTypesByKey: Map<agentTypeKey, AgentTypeEntity>`
  - `workflowsByKey: Map<workflowKey, WorkflowEntity>`
  - `transitionWorkflowBindings: Map<transitionKey, Set<workflowKey>>`
  - `guidance: { global?, byWorkUnitType, byAgentType, byTransition }`
- Keys are stable identifiers (use the existing domain keys you already persist and validate: work unit type keys, transition keys, workflow keys, step keys, edge keys).
- L1/L2/L3 navigation state stays as `GraphScope` (already modeled in `apps/web/src/features/methodologies/version-graph.ts`).

JSON strings are derived views:

- `rawJsonView = toDeterministicJson(compileGraphToAggregateShape(graph))`
- Editing JSON is only allowed through an explicit "Apply JSON" import action (see section 6).

### 2) State ownership and layering

Ownership is explicit and non-overlapping:

1. Server truth (remote base)
   - Owned by TanStack Query (`getDraftProjection(versionId)`).
   - Treated as immutable input.

2. Canonical local edit state
   - Owned by a `MethodologyGraphStore` (React context + reducer; no new deps required).
   - Contains:
     - `baseProjection` (last accepted server projection)
     - `graph` (current editable graph)
     - `dirty` (per-domain + per-entity markers)
     - `patchLog` (optional, enables undo/redo and import flows)
     - `ui` (scope, selection, inspector tab)
     - `diagnostics` (validation/persistence diagnostics mapped to entity/field refs)

3. Presentation state
   - React Flow viewport + node layout positions are UI-only and may persist to localStorage.
   - Important: layout persistence must never mutate the contract graph.

### 3) Optimistic updates

Optimistic updates are defined at two levels:

- Local optimism (required)
  - Every edit applies immediately to the canonical `graph` via a typed patch.
  - The UI never waits on JSON parsing or server round-trips to update the graph.

- Network optimism (optional, phased)
  - Phase 1 (matches current UX): manual "Save Draft" persists compiled graph snapshots.
  - Phase 2 (if desired): auto-save queue for small edits (binding toggles, step edits) with debounce/coalescing.

Rollback behavior:

- Manual save: keep local dirty state on failure; user can retry or reload.
- Auto-save: maintain `baseProjection + patchLog`; on failure, revert only the failed persistence domain to `baseProjection` and reapply remaining patches.

### 4) Mutation boundaries (compile targets)

Keep existing server write boundaries as first-class client domains:

- Domain: `lifecycle`
  - work unit types (including lifecycle states/transitions, facts, required links)
  - agent types
  - persists via `updateDraftLifecycle`

- Domain: `workflows`
  - workflows (steps/edges)
  - transition-workflow bindings
  - guidance overlays
  - persists via `updateDraftWorkflows`

Client-side patch classification:

- Every `GraphPatch` is tagged with its required persistence domain(s).
- The store computes `dirtyDomains = { lifecycle?: boolean, workflows?: boolean }`.

Deterministic save coordinator (two-phase):

1. Compile `graph -> UpdateDraftLifecycleInput`
2. Call `updateDraftLifecycle`
   - If validation fails: surface deterministic diagnostics; do not proceed.
3. Compile `graph -> UpdateDraftWorkflowsInput`
4. Call `updateDraftWorkflows`
   - If diagnostics exist: surface; stop.
5. On success: invalidate + refetch projection; rehydrate (see section 5).

Note: server implementations currently persist workflows/bindings via snapshot replacement (delete+insert in a transaction). This makes coalescing/debouncing important if auto-save is enabled.

### 5) Projection <-> form synchronization

Single source of truth rule:

- The canonical graph store is the only editable state.
- All UI surfaces read via selectors and write via patches.

Projections:

- Graph projection (React Flow)
  - `nodes/edges = projectMethodologyGraph(compileGraphForProjection(graph), scope)`
  - This can reuse the existing pure projection in `apps/web/src/features/methodologies/version-graph.ts` by adapting input to typed entities.

- Inspector forms
  - Forms are controlled by reading the selected entity from the store.
  - Field edits dispatch patches (no JSON string updates, no parse/merge).

Layout and selection:

- `scope` and `selection` live in `store.ui`.
- React Flow layout/positions persist separately (e.g. localStorage keyed by methodologyKey + scope) and are applied as a presentation overlay.

### 6) JSON fallback semantics (import/export only)

JSON remains available but is non-authoritative:

- Export:
  - Render deterministic JSON from the canonical graph (read-only).

- Import / Apply JSON:
  - User edits JSON in a separate text buffer.
  - On "Apply": parse + shape-check + compile to patches (or replace graph wholesale) and dispatch to the store.
  - If parse/shape-check fails: no changes are applied; diagnostics are shown.

Recommended posture:

- Default to read-only JSON with "Copy".
- If editable JSON is enabled, make it an explicit "Advanced" action with a clear warning that it replaces canonical graph state.

### 7) Deterministic reload semantics

Deterministic reload is required for the operator trust model:

- Replace-on-success rule
  - The store only accepts server projection as canonical state on:
    1) initial load (when not dirty), or
    2) after successful persistence (or explicit user-triggered reload).

- Ignore background refetch while dirty
  - If TanStack Query refetches while local edits exist, do not overwrite local state.
  - Optional: show an informational "server updated" badge if you later add a server revision cursor.

- Hydration function is deterministic
  - `hydrateGraphFromProjection(projection)` must:
    - sort arrays by stable keys
    - normalize optional/undefined fields consistently
    - ensure bindings are stored as sorted sets

- JSON view determinism
  - `compileGraphToAggregateShape(graph)` must produce stable key insertion order so `JSON.stringify(..., null, 2)` remains deterministic.

The existing determinism test pattern (persist -> refetch -> rebuild -> equality) should be preserved, but moved from "JSON draft equality" to "graph + derived JSON equality".

## Risks

1) Partial persistence with split mutation boundaries
- Lifecycle save can succeed while workflows save fails.
- Mitigation: domain-specific dirty markers + explicit UI state that indicates which domain is synced.

2) Key rename operations
- Renaming a workflow key or transition key requires updating all references deterministically.
- Mitigation: explicit rename patches that update indices in one reducer transaction; prohibit ad-hoc string edits.

3) Projection drift
- If graph->DTO compilation or JSON import mapping is incomplete, users can lose data.
- Mitigation: constrain JSON import to validated shapes; add parity tests that round-trip projection->graph->DTO->projection.

## Migration Steps (from current JSON-authoritative UI)

1) Add graph store + deterministic hydrator
- Hydrate graph from `getDraftProjection` (do not create JSON strings).

2) Switch React Flow to graph store
- Graph canvas reads projection from store and updates selection/scope in store.
- Keep layout persistence as UI-only.

3) Move binding toggles to patches
- `onToggleBinding` updates canonical `transitionWorkflowBindings` instead of `transitionWorkflowBindingsJson`.

4) Add compiler + save coordinator
- Compile store graph to the existing DTO inputs and reuse the existing two-phase save flow.

5) Move inspector forms to graph store
- Each form edits entities via patches.

6) Demote JSON editors to fallback-only
- Replace current always-visible JSON editors with an advanced import/export panel.

## Escalation triggers (when to consider patch-based server endpoints)

Move to a server-side patch log / revision cursor if any of the following become true:

- Multi-tab editing becomes common and overwrites are a real problem.
- Save latency becomes unacceptable due to snapshot replacement writes.
- You need conflict detection beyond "reload and overwrite" semantics.

