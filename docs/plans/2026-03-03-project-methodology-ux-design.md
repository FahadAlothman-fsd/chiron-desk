# Epic 2 Story 2.5 Design: Project Creation + Methodology Pinning UX (Routes and Boundaries)

Date: 2026-03-03
Story: 2.5 (project creation + methodology pinning UX + pin lineage visibility)
Status: Approved-for-planning (assumed; proceed with this design unless superseded)

## Goal
Deliver a project creation and pin/repin experience that is reproducible by default (exact methodology published version pin), auditable (append-only lineage), and policy-governed (repin blocked once executions exist), while keeping Epic 2 boundaries intact (no runtime execution, no setup fact persistence).

## Non-Goals
- Full project management (names, sharing, delete, search/list) beyond the minimum create + view + repin surfaces.
- Persisting methodology-defined setup facts (including `project.deliveryMode`) outside workflow execution.
- Workflow runtime execution controls (must remain visible-but-disabled with the exact rationale copy).
- Duplicating domain policy in the UI (all compatibility and repin policy enforcement stays in backend engine/repo).

## Baseline (Already Implemented)
- Project persistence exists in DB schema: `packages/db/src/schema/project.ts` defines:
  - `projects` (id, createdAt, updatedAt)
  - `project_methodology_pins` (active pin pointer)
  - `project_methodology_pin_events` (append-only lineage events)
  - `project_executions` (repin policy gate)
- Backend domain semantics already exist:
  - `pinProjectMethodologyVersion`, `repinProjectMethodologyVersion`, `getProjectPinLineage`, `getProjectMethodologyPin` in `packages/methodology-engine/src/version-service.ts`.
  - Repository guarantees atomic pin pointer + lineage event writes in `packages/db/src/methodology-repository.ts`.
  - API surfaces already exist for pin/repin/lineage in `packages/api/src/routers/methodology.ts`.

## Primary Decision: Dedicated Project Routes (Recommended)
Implement Story 2.5 as dedicated project CRUD routes/pages under `/projects/*`, not inside methodology design-time routes.

Rationale:
- Separates design-time methodology authoring (`/methodologies/...`) from project runtime identity (stable `projectId` permalink).
- Avoids coupling project state (pin pointer + lineage) to methodology workspace-specific shells/breadcrumb types.
- Aligns with Story 2.5 file-structure requirements: project CRUD routes are the primary surface; methodology routes remain authoring surfaces.

## Route Architecture (Exact Files)
Create TanStack Router file routes under `apps/web/src/routes/`:

1) `apps/web/src/routes/projects.tsx`
- Purpose: project entry surface.
- Minimum behavior: link to `/projects/new` and (optional) an "Open by ID" field for deep-linking in absence of a project list API.

2) `apps/web/src/routes/projects.new.tsx`
- Purpose: "Create project" flow.
- UI: methodology card selection + methodology-scoped published-version autocomplete.
- Action: generate `projectId` client-side, then call `orpc.methodology.pinProjectMethodologyVersion`.
- On success: navigate to `/projects/$projectId`.

3) `apps/web/src/routes/projects.$projectId.tsx`
- Purpose: project pin details.
- UI: active pin summary, lineage list/table, repin flow.
- Data: read active pin pointer (not inferred), read lineage, allow repin mutation.

Note: keep methodology authoring routes unchanged:
- `apps/web/src/routes/methodologies.tsx` remains catalog + "create methodology".
- `apps/web/src/routes/methodologies.$methodologyId.*` remains methodology version authoring workspace.

## Shared Component Extraction (Exact Files)
To avoid duplicating the selection UI between `/methodologies` and `/projects/new`, extract reusable UI-only modules.

Methodology UI helpers:
- `apps/web/src/features/methodologies/card-avatar-map.ts`
  - Implements deterministic index mapping for methodology cards:
    - index 0 -> `asset-07`
    - index 1 -> `asset-11`
    - index 2 -> `asset-26`
    - index 3 -> `asset-41`
    - then cycle
  - Returns public URL: `/visuals/methodologies/avatars/<asset>.svg`.

- `apps/web/src/features/methodologies/methodology-card-grid.tsx`
  - Pure UI component:
    - input: ordered `MethodologyCatalogItem[]` + selected key + onSelect
    - renders cards with decorative avatar (`alt=""`) and accessible text label
    - does not call APIs

Project UI modules:
- `apps/web/src/features/projects/project-shell.tsx`
  - Project page header + segments; do not reuse `MethodologyWorkspaceShell` (it hardcodes methodology route shapes).

- `apps/web/src/features/projects/published-version-autocomplete.tsx`
  - UI for selecting a published version, scoped to the selected methodology.
  - Source list comes from `orpc.methodology.getMethodologyDetails({ methodologyKey })` filtered to `status === "active"`.
  - Deterministic latest preselect: sort by `(createdAt, id)` ascending and pick last.

- `apps/web/src/features/projects/project-pin-lineage.tsx`
  - Renders:
    - active pin metadata (methodologyKey, publishedVersion, actorId, timestamp)
    - lineage events (actorId, timestamp, previousVersion, newVersion)
    - deterministic diagnostics blocks on failure states

## Static Assets (Exact Files)
Copy fixed avatars into:
- `apps/web/public/visuals/methodologies/avatars/asset-07.svg`
- `apps/web/public/visuals/methodologies/avatars/asset-11.svg`
- `apps/web/public/visuals/methodologies/avatars/asset-26.svg`
- `apps/web/public/visuals/methodologies/avatars/asset-41.svg`

## API Surface (Minimal Additions)
Backend already exposes:
- `packages/api/src/routers/methodology.ts`
  - `pinProjectMethodologyVersion` (protected)
  - `repinProjectMethodologyVersion` (protected)
  - `getProjectPinLineage` (currently public)

Add one focused read procedure for refresh-safe project pages:
- `packages/api/src/routers/methodology.ts`: `getProjectMethodologyPin`
  - input: `{ projectId: string }`
  - output: pin pointer or NOT_FOUND
  - implementation: call `MethodologyVersionService.getProjectMethodologyPin(projectId)`

Note: `getTransitionEligibility` already reads the pin pointer via `getProjectMethodologyPin` internally; this new procedure exposes that read for project pages.

## Data Flow (TanStack Query + oRPC)

### /projects/new
- Query catalog: `orpc.methodology.listMethodologies`
  - Order: reuse deterministic sorter `sortCatalogDeterministically` from `apps/web/src/features/methodologies/foundation.ts`.
  - Avatar mapping: apply only after ordering.
- Query methodology details when a methodology is selected:
  - `orpc.methodology.getMethodologyDetails({ methodologyKey })`
  - Filter versions to `status === "active"`.
  - If none: block create and show guidance "Publish an eligible version first".
- Mutation create+pin:
  - Client generates `projectId = crypto.randomUUID()`.
  - Call `orpc.methodology.pinProjectMethodologyVersion({ projectId, methodologyKey, publishedVersion })`.
  - On transport failure: keep selections; render failed state.
  - On diagnostics failure (invalid/incompatible target): render diagnostics and keep selections.

### /projects/$projectId
- Query active pin pointer:
  - `orpc.methodology.getProjectMethodologyPin({ projectId })` (new)
- Query lineage:
  - `orpc.methodology.getProjectPinLineage({ projectId })`
- Repin mutation:
  - `orpc.methodology.repinProjectMethodologyVersion({ projectId, methodologyKey, publishedVersion })`
  - On success: invalidate pin + lineage queries and refetch.
  - On blocked policy (`PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY`): show diagnostics; do not mutate displayed pin/lineage until refetch confirms no change.

## UX Contracts Mapped to Acceptance Criteria
- Deterministic card avatars: index mapping `[asset-07, asset-11, asset-26, asset-41]` applied to deterministically ordered list.
- Deterministic latest preselect: stable sort and last-pick rule applied consistently in create and repin flows.
- No implicit repin: project page always uses active pin pointer from backend; publishing new methodology versions does not affect project pin.
- Repin policy: UI surfaces diagnostics from backend; never attempts to "force" repin.
- Epic 2 runtime boundary:
  - keep runtime controls visible-but-disabled with exact copy from `apps/web/src/features/methodologies/foundation.ts`:
    - `Workflow runtime execution unlocks in Epic 3+`

## Navigation Integration
- Update `apps/web/src/components/app-shell.tsx` sidebar/nav to include:
  - `/projects` (Projects)
  - `/projects/new` (Create Project)

## Migration Path (Implementation Sequencing)
1) Extract card avatar mapping + card grid UI into `apps/web/src/features/methodologies/`.
2) Add `apps/web/src/routes/projects.new.tsx` using extracted components and existing `pinProjectMethodologyVersion`.
3) Add `getProjectMethodologyPin` procedure and wire `apps/web/src/routes/projects.$projectId.tsx` to render current pin + lineage.
4) Add repin flow on the project page using existing repin mutation.
5) Add runtime controls as visible-but-disabled on project pages (reuse `RUNTIME_DEFERRED_RATIONALE`).

## Escalation Triggers (When to Revisit)
- If the product requires a project list/search or project naming, introduce `packages/api/src/routers/project.ts` and a first-class project read/list surface instead of overloading methodology router.
- If project setup facts must be captured before any runtime exists, revisit the Epic boundary decision (currently explicitly disallowed by Story 2.5).
