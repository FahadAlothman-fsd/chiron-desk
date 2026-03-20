# Project Switcher + Project Dashboard Lists Design

Date: 2026-03-04
Status: Proposed (proceed with this design unless superseded)

## Goal
Deliver a project-scoped navigation and operator dashboard that supports:
- A project switcher with search inside the sidebar.
- Project-specific sidebar sections once a project is in scope.
- A project dashboard surface with filterable lists for: facts, work units, transitions, agents.

## Non-Goals
- Runtime execution enablement (Epic 3+ only; keep visible-but-disabled rationale copy).
- Server-side pagination/filtering for lists (client-side first; revisit only when data sizes demand it).
- Role-based navigation personalization.
- Replacing TanStack Router file-based routing patterns.

## Constraints And Existing Anchors
- Sidebar IA is already established for Epic 2 (see `docs/plans/2026-03-03-sidebar-navigation-overhaul-design.md`).
- Baseline visibility belongs on the project dashboard, not pinning (see `docs/plans/2026-03-04-story-2-6-dashboard-first-baseline-visibility-design.md`).
- Existing app shell + sidebar primitives are in place:
  - `apps/web/src/components/app-shell.tsx`
  - `apps/web/src/components/app-sidebar.tsx`
  - `apps/web/src/components/sidebar-sections.tsx`
- Existing project API surfaces:
  - `orpc.project.listProjects` (sidebar switcher)
  - `orpc.project.getProjectDetails` (project dashboard)

## Primary Decision: Route-Scoped Project Context (Recommended)
Treat the active project as part of the URL, not as a global client store.
- Project routes: `/projects/$projectId/*`
- Sidebar switcher navigates by changing routes.

Rationale:
- Deep-linkable, shareable, and back/forward friendly.
- Minimizes coupling between sidebar and dashboard content.
- Aligns with existing TanStack Router layout and query key patterns.

## Information Architecture

### Workspace (Global)
Retain the existing global sections (as already implemented).
- Home: `/`
- Dashboard: `/dashboard` (may remain global or redirect; see Open Questions)
- Methodologies: `/methodologies`
- Projects: `/projects`

### Project Scope (When URL Contains projectId)
Add a project-specific section in the sidebar when the active route is under `/projects/$projectId/*`.
- Overview: `/projects/$projectId`
- Facts: `/projects/$projectId/facts`
- Work Units: `/projects/$projectId/work-units`
- Transitions: `/projects/$projectId/transitions`
- Agents: `/projects/$projectId/agents`
- Pinning: `/projects/$projectId/pinning`

Note: Using subroutes (instead of dashboard tabs) keeps the sidebar link model unchanged since `SidebarNavItem` currently supports `to: string` only.

## Sidebar Architecture Split

### Sidebar Responsibilities
- Determine scope from routing:
  - Workspace scope: no `projectId` in route.
  - Project scope: route matches `/projects/$projectId/*`.
- Provide a project switcher with search:
  - Fetch: `orpc.project.listProjects`.
  - Filter locally by `displayName` and `id`.
  - Navigate on selection.
- Render scope-aware sections.

### Sidebar Non-Responsibilities
- Do not fetch project details (`getProjectDetails`) just to render navigation.
- Do not own filtering state for dashboard lists.

### Implementation Notes
- Extend section building to be scope-aware:
  - Evolve `buildSidebarSections(pathname)` into `buildSidebarSections({ pathname, projectId, projectLabel? })`.
  - Parse `projectId` in `AppShell` and pass into builder.

## Dashboard Architecture Split

### Dashboard Responsibilities
- Own all list rendering, filtering, sorting, and empty/error/loading states.
- Persist filters in URL search params (per page) to support:
  - shareable links
  - back/forward
  - stable refresh behavior

### Dashboard Data Loading
- Use a single base query per project: `orpc.project.getProjectDetails({ projectId })`.
- Reuse existing baseline preview surfaces:
  - facts and transitions already exist in `baselinePreview`.
- Add a small derived summary for work units and agents (see Data Contracts).

## Data Contracts

### Sidebar Contract (Existing)
`orpc.project.listProjects -> ProjectSummary[]`
- Fields: `id`, `displayName`, `createdAt`, `updatedAt`
- Sidebar uses this for switcher list + current project display.

### Project Dashboard Contract (Extend Existing)
Extend `orpc.project.getProjectDetails({ projectId })` output with `projectionSummary`.

#### Existing Fields (Already Used)
- `project`
- `pin`
- `lineage`
- `baselinePreview`

#### New Field: projectionSummary (UI-Safe DTO)
Purpose: support Work Units and Agents list pages without exposing `Unknown[]` projection shapes.

Proposed shape:
- `projectionSummary.workUnitTypes[]`:
  - `key: string`
  - `displayName?: string`
  - `cardinality?: "one_per_project" | "many_per_project"`
  - `factCount: number`
  - `stateCount: number`
  - `transitionCount: number`
- `projectionSummary.agentTypes[]`:
  - `key: string`
  - `displayName?: string`
  - `persona: string`
  - `defaultModel?: { provider: string; model: string }`
  - `mcpServers?: string[]`
  - `capabilities?: string[]`

Derivation source (server-side): `MethodologyVersionService.version.workspace.get(pin.methodologyVersionId)`.

### Degradation Rules
- If the project has no pin:
  - `baselinePreview` is null.
  - `projectionSummary` should be null.
  - All list pages render a clear "Project not pinned" empty state.

## Filter Model (Client-First)
Each list surface supports:
- `q` (text search)
- small, type-specific facets

Suggested facets:
- facts: `required`, `missing`
- transitions: `status` (eligible | blocked | future)
- work units: `cardinality`
- agents: `capability`, `mcpServer`

Escalation trigger: if list sizes become large or runtime execution introduces high-cardinality entities, revisit with server-side filtering/pagination while preserving the same UI contract.

## Error/Loading/Empty States
- Sidebar:
  - listProjects loading: skeleton or "Loading projects..."
  - listProjects error: show "Projects unavailable" but keep navigation usable
- Project list pages:
  - getProjectDetails loading: skeleton panels
  - getProjectDetails NOT_FOUND: show not-found panel + link to `/projects`
  - no pin: show "Project not pinned" guidance; disable runtime controls with Epic rationale copy

## Phased Delivery Plan (Minimize Churn)

### Phase 1: Sidebar Project Switcher + Project Section Wiring
- Add switcher UI using existing Command/Popover patterns.
- Add conditional "Project" nav section when route is in project scope.
- No changes required to existing project dashboard content.

### Phase 2: Add Project List Routes
- Add the 4 new routes under `/projects/$projectId/*`.
- Implement facts/transitions pages from existing `baselinePreview`.

### Phase 3: Extend getProjectDetails With projectionSummary
- Add server mapping and return `projectionSummary`.
- Implement work units and agents pages using `projectionSummary`.

### Phase 4: Harden With Tests
- Integration tests for:
  - project switcher routing
  - scope-aware sidebar sections
  - list page route wiring and empty states

## Open Questions
1) Lists as subroutes (recommended) vs a single dashboard page with tabs.
2) What should `/dashboard` mean after project-scoped lists exist?
   - Option: keep it global and project-agnostic.
   - Option: redirect to last-opened project.
3) When switching projects from a subpage, should the app preserve the current subpage path?
   - Example: from `/projects/a/transitions` to `/projects/b/transitions`.
