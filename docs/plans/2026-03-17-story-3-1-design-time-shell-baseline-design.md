# Story 3.1 Design-Time Shell Baseline Design

Date: 2026-03-17
Status: approved-direction-recorded

## Goal

Implement Story 3.1 in the existing web-app style: TanStack Router file-routes, React page shells, TanStack Query for route-scoped data, and Bun/Vitest regression coverage.

## Primary recommendation

Use a hybrid route model:

- real file-routes for each operator-facing page surface
- route params as the durable scope contract
- search params for local tab/selection state
- one shared query/read model for the selected methodology version
- one shared command-action resolver so palette actions and visible buttons stay in parity

This keeps Story 3.1 shell-first, avoids new client stores, and matches the current version-scoped facts/workspace patterns already in the repo.

## Route and file map

Keep existing:

- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`

Add:

- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`

Extract shared UI helpers under `apps/web/src/features/methodologies/` instead of duplicating route-local state/rendering logic, especially for:

- version-page shell framing
- deterministic empty/loading/blocked/failed rendering
- work-unit graph/list/selection reuse
- command action resolution

## Shared state and query strategy

Treat these as the only durable scope inputs:

- `methodologyId`
- `versionId`
- `workUnitKey` for L2

Use search params for local view state only.

Recommended search models:

- Work Units L1: `?tab=graph|contracts|diagnostics&selected=<workUnitKey>`
- Work Unit L2: `?tab=overview|facts|workflows|state-machine|artifact-slots`
- Owner-page create intent: `?intent=add-fact|add-work-unit|add-agent|add-link-type`

Recommended TanStack Query ownership:

- `getMethodologyDetails(methodologyId)` for methodology name, versions, and version labels
- `getDraftProjection(versionId)` as the shared design-time read model for facts, work units, agents, and dependency definitions
- route-level `select` helpers to derive page-specific slices rather than adding Story 3.1-specific transport or a second app store

Rules:

- route params are the source of truth for scope
- URL search is the source of truth for page-local selection/tab state
- component state is transient only (dialogs, search input, temporary filters)
- no new global methodology workspace store for Story 3.1

## Command palette parity model

Extend the existing methodology palette instead of creating a second palette stack.

Global palette behavior:

- keep Framework 1 segmented context model as the entry point
- keep Methodology scope explicitly version-scoped
- group results into `Navigate`, `Create`, `Inspect`, and `Recent`

Local object behavior:

- once a work unit is selected, switch to Framework 2 breadcrumb drill-down behavior
- expose selected-object tabs/actions without losing methodology/version context

Parity contract for Story 3.1 create actions:

- `Add Fact` -> owner route `/methodologies/:methodologyId/versions/:versionId/facts`
- `Add Work Unit` -> owner route `/methodologies/:methodologyId/versions/:versionId/work-units`
- `Add Agent` -> owner route `/methodologies/:methodologyId/versions/:versionId/agents`
- `Add Link Type` -> owner route `/methodologies/:methodologyId/versions/:versionId/dependency-definitions`

Resolver rule:

- if already on the owner page, open the same dialog/action immediately
- if off-page, navigate to the owner route with the matching `intent` search param
- header buttons, list actions, and palette commands must call the same resolver so validity, blocking, and resulting UX stay identical

## Deterministic UX contract

All Story 3.1 pages and palette outcomes use the same state precedence:

1. `blocked`
2. `loading`
3. `failed`
4. `empty`
5. `ready`

Definitions:

- `blocked`: a known prerequisite prevents progress, such as immutable/published version or missing required work-unit selection
- `loading`: data or route transition is in progress
- `failed`: the system attempted a load/action and could not complete it
- `empty`: the surface is valid but has no authored records yet
- `ready`: normal interactive state

Copy order for blocked/failed states:

1. what happened
2. why it happened
3. what is safe or preserved
4. what the operator can do now
5. technical detail in secondary/collapsible form

Rendering rules:

- keep breadcrumbs, title, and scope chip visible in every state
- preserve selected version context always
- preserve selected work-unit identity whenever practical during refetches/errors
- make empty states action-oriented, never dead ends
- keep keyboard and click behavior equivalent for navigation and tab changes

## Implementation sequencing

### Batch 1 - Routing and IA foundation

- update `apps/web/src/components/sidebar-sections.tsx`
- update `apps/web/src/components/app-sidebar.tsx`
- add the new route files with shell placeholders
- extract shared version-page shell/state helpers

Outcome: all Story 3.1 routes exist, sidebar entries are real, and state framing is consistent.

### Batch 2 - Work Units L1 and L2 shells

- extract reusable graph/list/selection primitives from `apps/web/src/features/methodologies/version-workspace-graph.tsx`
- implement Work Units L1 three-region shell
- implement Work Unit L2 selected-anchor shell with locked tab order

Outcome: route-complete work-unit navigation with persistent selection context.

### Batch 3 - Agents and Dependency Definitions shells

- add agents shell with catalog/contracts/diagnostics tabs and dialog-first create/edit entry
- add dependency-definitions shell with definitions/usage/diagnostics tabs and list/detail split
- wire page-level create actions through the shared action resolver

Outcome: all Story 3.1 page shells are reachable with the required CRUD entry points.

### Batch 4 - Command parity, deterministic states, and verification

- extend palette command model to version-scoped create/navigation entries
- standardize blocked/failed/empty/loading copy and rendering
- finish route/sidebar/palette regression tests and Playwright evidence path

Outcome: command parity and story-level verification coverage are complete.

## Risks and mitigations

### Risk 1 - Forking the existing workspace graph model

If Work Units L1 reimplements graph/list/selection logic from scratch, behavior will drift quickly.

Mitigation: extract selectors, graph primitives, and selection helpers from `apps/web/src/features/methodologies/version-workspace-graph.tsx`; do not build a second graph state model.

### Risk 2 - Context loss on refetch or route transitions

If selection stays only in component state, page reloads and route transitions will drop the selected work unit.

Mitigation: keep durable scope in route params and page-local selection/tab state in URL search params.

### Risk 3 - Palette/button behavior drift

If page buttons and palette actions dispatch independently, blocked/failed behavior will diverge.

Mitigation: centralize create/navigation resolution in one helper used by both visible controls and palette commands.

## Regression test plan

Update existing tests:

- `apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx`
- `apps/web/src/tests/components/app-sidebar.integration.test.tsx`
- `apps/web/src/tests/features/methodologies/commands.test.ts`
- `apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx`
- `apps/web/src/tests/features/methodologies/command-palette-navigation.test.ts`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`

Add new tests:

- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.agents.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.integration.test.tsx`

Recommended commands:

1. `bun run check`
2. `bun run check-types`
3. `bun run --cwd apps/web test -- 'src/tests/components/app-shell.sidebar-sections.integration.test.tsx' 'src/tests/components/app-sidebar.integration.test.tsx'`
4. `bun run --cwd apps/web test -- 'src/tests/features/methodologies/commands.test.ts' 'src/tests/features/methodologies/command-palette.integration.test.tsx' 'src/tests/features/methodologies/command-palette-navigation.test.ts'`
5. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.agents.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.integration.test.tsx'`
6. `bunx playwright test`

## Revisit triggers

Revisit this architecture only if one of these becomes true:

- Story 3.2 or later requires independently cacheable page slices with materially different data-shape costs
- Work Unit L2 tabs need first-class deep-link routes instead of search-param tabs
- Story 3.1 verification shows the shared draft projection is too heavy for acceptable route-level responsiveness
