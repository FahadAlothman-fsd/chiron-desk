# Story 3.1: Complete Design-Time IA and Page Shell Baseline

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator,
I want complete design-time page shells and route context,
so that methodology authoring surfaces are reachable and consistent before runtime unlock.

## Story Metadata

- `intentTag`: `Spike`
- `frRefs`: `FR2`, `FR7`
- `nfrRefs`: `NFR1`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`, `ADR-EF-06`
- `gateRefs`: `G3`
- `evidenceRefs`: `design-shell-route-map-log`, `design-shell-nav-consistency-log`, `design-shell-state-handling-log`
- `diagnosticRefs`: `design-shell-route-diagnostics`, `design-shell-accessibility-diagnostics`

## Acceptance Criteria (Gherkin)

1. **Design-time route completion**

   **Given** I open methodology version workspace routes  
   **When** I navigate across design-time pages  
   **Then** Work Units (L1), Methodology Facts, Agents, Dependency Definitions, and Work Unit L2 shell routes are complete and deterministic.

2. **Deterministic shell-state handling**

   **Given** empty, loading, or error states occur  
   **When** I interact with the page shells  
   **Then** state handling is deterministic, keyboard-accessible, and preserves route and selection context.

## In Scope

- Complete version-scoped methodology navigation for Story 3.1 surfaces: Facts, Work Units (L1), Agents, Dependency Definitions, and Work Unit L2 shell entry.
- Replace current disabled methodology sidebar placeholders with real routes and active-state behavior.
- Deliver page-shell baselines only for the new surfaces, with locked tabs, shell framing, deterministic empty/loading/error handling, and route-context preservation.
- Expose page navigation and primary page-level authoring actions through the approved context-aware command palette with command/visible-control parity.
- Reuse existing methodology workspace data and authoring primitives where possible instead of inventing parallel stores or duplicate editors.
- Add route and navigation tests plus at least one manual scenario and one Playwright scenario that prove deterministic shell reachability for G3 evidence.

## Out of Scope

- Full implementation of Story 3.2 tab content for L2 Facts, Workflows, State Machine, or Artifact Slots.
- Deep agent runtime/provider registry UX, runtime execution controls, or workflow-step execution behavior.
- Replacing canonical methodology editing contracts or redesigning the existing version workspace authoring model.
- Runtime onboarding execution flows, SSE/MCP execution loops, or non-methodology project surfaces.
- Manual edits to generated route-tree artifacts; route generation must stay tool-driven.

## Tasks / Subtasks

- [ ] Extend methodology version IA and route map for Story 3.1 surfaces (AC: 1, 2)
  - [ ] Replace disabled methodology sidebar placeholders with concrete navigation entries for `Facts`, `Work Units`, `Agents`, and `Dependency Definitions` under the selected methodology version section.
  - [ ] Keep the existing `Workspace` and `Facts` routes intact while introducing deterministic route entry points for the new L1 and L2 shell surfaces.
  - [ ] Extend the current methodology-scoped command palette toward the approved context-aware model so Story 3.1 destinations and create actions are reachable with the same validity and outcomes as visible controls.
  - [ ] Preserve TanStack Router file-route conventions and regenerate generated route artifacts through tooling rather than hand-editing generated files.
- [ ] Build Work Units (L1) page shell baseline from the canonical page spec (AC: 1, 2)
  - [ ] Add the version-scoped Work Units overview route with the locked three-region shell: graph canvas, searchable right-rail list, and selected-summary panel.
  - [ ] Implement the locked page-level tabs `Graph`, `Contracts`, and `Diagnostics` plus header action `+ Add Work Unit` as shell-level affordances.
  - [ ] Keep Work Unit creation out of the graph canvas and route it through a deterministic create entry flow that can be invoked from both the header button and the command palette.
  - [ ] Ensure list and graph selection stay synchronized and route into a stable L2 details entry action vocabulary: `Open details` and `Open Relationship View`.
- [ ] Build Work Unit detail (L2) shell baseline and persistent selected-work-unit context (AC: 1, 2)
  - [ ] Add a version-scoped selected-work-unit route that preserves selected work-unit identity across tab switches.
  - [ ] Implement the locked L2 tab set `Overview`, `Facts`, `Workflows`, `State Machine`, and `Artifact Slots` as shell tabs, even where inner editing content remains placeholder/baseline for later stories.
  - [ ] Record the locked quick-action vocabulary for L2 shell entry points: `Add fact`, `Add workflow`, and `Open Workflow Editor`, while keeping deeper tab implementation for later stories.
  - [ ] Preserve empty/loading/error handling without dropping selected-work-unit context whenever practical.
- [ ] Build Agents and Dependency Definitions shell baselines from stable specs (AC: 1, 2)
  - [ ] Add the version-scoped Agents route with the locked tab set `Catalog`, `Contracts`, `Diagnostics`, card-first catalog shell, and dialog-first CRUD entry points.
  - [ ] Add the version-scoped Dependency Definitions route with tabs `Definitions`, `Usage`, `Diagnostics`, searchable list/detail split, dialog-first create/edit entry, and explicit archive-confirmation behavior when usages exist.
  - [ ] Reuse deterministic diagnostics and selector patterns already established in the methodology UX system.
- [ ] Preserve methodology facts behavior while aligning it to the completed IA baseline (AC: 1, 2)
  - [ ] Keep the existing version-scoped facts route reachable from the updated version navigation and ensure its state handling remains consistent with new page-shell conventions.
  - [ ] Avoid creating duplicate fact authoring flows; extend current facts surfaces only where needed for shell consistency and navigation contracts while preserving dialog-first `Add Fact` / `Edit` behavior.
- [ ] Add verification and evidence coverage for design-time reachability (AC: 1, 2)
  - [ ] Update sidebar/route integration tests so methodology version navigation reflects the new real routes instead of disabled placeholders.
  - [ ] Add command-palette tests for context switching, destination reachability, and create-action parity for `Add Fact`, `Add Work Unit`, `Add Agent`, and `Add Link Type`.
  - [ ] Add route-level tests for empty/loading/error state determinism and keyboard-accessible navigation on the new shells.
  - [ ] Capture one manual scenario and one Playwright scenario showing end-to-end navigation across version workspace, Facts, Work Units (L1), Agents, Dependency Definitions, and Work Unit L2.

## Dev Notes

- Epic 3 is explicitly design-time-first. Story 3.1 exists to make methodology authoring surfaces reachable and coherent before any runtime unlock work proceeds.
- This is a spike story feeding Gate G3 evidence, so route determinism, diagnostics determinism, and evidence capture are part of the implementation, not post-hoc extras.
- The stable `docs/architecture/...` methodology page specs override older tentative planning docs whenever there is tension.

### Existing Implementation Snapshot

- Current methodology routing already includes:
  - `apps/web/src/routes/methodologies.$methodologyId.tsx` for methodology overview/dashboard
  - `apps/web/src/routes/methodologies.$methodologyId.versions.tsx` for versions ledger
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx` for the existing workspace entry shell
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx` for version-scoped methodology facts
- Current sidebar logic in `apps/web/src/components/sidebar-sections.tsx` exposes real routes only for `Workspace` and `Facts`; `Work Units`, `Workflows`, and `Artifact Templates` are still disabled placeholders.
- Existing sidebar tests in `apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx` and `apps/web/src/tests/components/app-sidebar.integration.test.tsx` currently assert those disabled placeholders. Story 3.1 must update those expectations.
- The existing workspace graph/editor in `apps/web/src/features/methodologies/version-workspace-graph.tsx` already contains reusable work-unit graph, list, inspector, and selection behavior. Reuse/adapt those primitives for the new page shells instead of rebuilding an entirely separate graph stack.

### Technical Requirements

- Use TanStack Router file-based routes via `createFileRoute(...)` and keep generated route artifacts tool-generated.
- Use TanStack Query query/mutation patterns with stable query keys, explicit `enabled` conditions, and deterministic loading/error state rendering.
- Keep selected version context visible while navigating version-scoped pages; new routes should stay under `/methodologies/:methodologyId/versions/:versionId/...`.
- Work Units (L1) must match the locked three-region shell from `docs/architecture/methodology-pages/work-units/overview.md`.
- Work Unit L2 must keep one persistent selected-work-unit anchor and the stable tab order from `docs/architecture/methodology-pages/work-units/detail-tabs.md`.
- Agents remains card-first and dialog-driven; do not turn it into a table-first or full-page detail editor.
- Dependency Definitions remains semantic-only; do not move transition-gate policy enforcement onto that page.
- Facts route should stay dialog-first CRUD and must not be replaced with spreadsheet-style inline editing.
- Empty/loading/error states must preserve context wherever practical and remain keyboard-accessible.

### CRUD Contracts By Surface

- Facts: preserve dialog-first CRUD with page-level `+ Add Fact` and row-level `Edit`; do not regress to inline spreadsheet editing.
- Agents: preserve card-first catalog with page-level `+ Add Agent`; keep create, edit, and delete dialog-driven, with `Open details` and `Edit` remaining distinct card actions.
- Dependency Definitions: provide page-level `+ Add Link Type`, selected-detail `Edit`, and `Archive`; create/edit should use focused entry flows and archive must require explicit confirmation when usages still exist.
- Work Units (L1): expose page-level `+ Add Work Unit`; do not create work units inline inside the graph canvas.
- Work Unit L2 shell: keep quick actions `Add fact`, `Add workflow`, and `Open Workflow Editor` visible as routeable shell entry points; L2 Facts must stay aligned with Methodology Facts semantics and dialog-first authoring.

### Command Palette Integration

- Story 3.1 must extend the existing palette toward the approved context-aware model recorded in `docs/plans/2026-03-17-context-aware-command-palette-design.md`.
- Use Framework 1 as the main palette model: segmented context switching across `System`, `Methodology`, and `Project`, with grouped results such as `Navigate`, `Create`, `Inspect`, and `Recent`.
- Borrow Framework 2 once the user enters a local object such as a selected work unit, using breadcrumb drill-down for object-specific tabs and actions.
- Keep context mode selection distinct from scope selection (`methodology + version` or `project`).
- In Methodology context, palette create actions must include `Add Fact`, `Add Work Unit`, `Add Agent`, and `Add Link Type` with equivalent validity, routing, and blocking behavior as visible controls.
- Palette blocked/failed states should follow the approved human-readable contract: what happened, why, what is safe, and how to fix it, with technical details secondary.

### Human-Readable Error Contract

- This contract applies to all Story 3.1 operator-facing shell states and command-palette states, not just one page.
- Replace raw/internal-first error presentation with operator-first copy that appears in this order whenever relevant: what happened, why it happened, what is safe or preserved, what the operator can do now, and how to fix it.
- Keep `blocked` and `failed` distinct: `blocked` means the operator must satisfy a known prerequisite; `failed` means the system could not complete a requested load or action.
- Empty states should explain the surface and point to the next valid action instead of presenting a dead end.
- Loading states should preserve visible scope or selection context when practical and reassure the operator that current context is still retained.
- Technical details, diagnostic payloads, and raw error codes may exist, but they must be secondary, collapsible, or clearly demoted behind the human-readable explanation.
- Error treatment must remain keyboard-accessible and use triple encoding where applicable: icon, explicit label, and semantic color rather than color alone.

### Reuse and Anti-Patterns

- Reuse existing methodology shell components such as `MethodologyWorkspaceShell` and existing route-context/query patterns before adding new shell infrastructure.
- Reuse current facts authoring surfaces instead of building a second methodology-facts implementation.
- Reuse graph/list/inspector behavior from `version-workspace-graph.tsx` where the stable page specs align.
- Reuse the current command-palette primitives and navigation helpers before introducing a second palette stack.
- Do not introduce duplicate methodology stores, shadow route-context providers, or a second graph data model for the same draft projection.
- Do not implement inline spreadsheet CRUD for Facts, Agents, or Dependency Definitions.
- Do not implement work-unit creation directly inside the graph canvas.
- Do not hand-edit generated route tree files.
- Do not leak runtime wording or execution controls into these design-time shells.

### Expected File Targets

- Navigation and shell composition:
  - `apps/web/src/components/sidebar-sections.tsx`
  - `apps/web/src/components/app-sidebar.tsx`
  - `apps/web/src/features/methodologies/workspace-shell.tsx`
- Existing methodology routes to extend or align:
  - `apps/web/src/routes/methodologies.$methodologyId.tsx`
  - `apps/web/src/routes/methodologies.$methodologyId.versions.tsx`
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
- New version-scoped route surfaces expected in this story:
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
- Reusable methodology feature modules likely to support extraction rather than route-local duplication:
  - `apps/web/src/features/methodologies/version-workspace-graph.tsx`
  - `apps/web/src/features/methodologies/methodology-facts.tsx`
  - new extracted page-shell helpers under `apps/web/src/features/methodologies/**` as needed
- Test targets:
  - `apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx`
  - `apps/web/src/tests/components/app-sidebar.integration.test.tsx`
  - new or updated route integration tests under `apps/web/src/routes/**`

### Architecture Compliance

- Preserve the thin-core/module-boundary lock from `docs/architecture/chiron-module-structure.md`; this story is a web-shell/routing concern, not a reason to move transport, DB, or runtime adapter logic into `core`.
- Keep contracts flowing through existing oRPC/query boundaries; Story 3.1 should prefer composing present data into new shells over inventing new persistence paths.
- Keep diagnostics deterministic and compatible with the shared UX diagnostics treatment.
- Preserve command/visible-control parity from the UX spec where navigation or actions are exposed.

### Testing Requirements

- Add or update route/sidebar integration tests for the new version-scoped IA.
- Add focused tests covering deterministic empty/loading/error rendering for each new page shell.
- Verify keyboard navigation and context preservation on at least the primary navigation paths.
- Run both `bun run check` and `bun run check-types` before claiming completion.
- Provide one manual verification path and one Playwright verification path for evidence refs required by the story metadata.

## Definition of Done

### 1) Route Completion

- [ ] Version-scoped routes exist and resolve for Facts, Work Units (L1), Agents, Dependency Definitions, and Work Unit L2.
- [ ] Methodology sidebar shows real navigable entries instead of disabled placeholders for Story 3.1 surfaces.
- [ ] Route transitions preserve methodology/version context deterministically.

### 2) Shell Baselines

- [ ] Work Units (L1) matches the locked three-region shell and locked action vocabulary.
- [ ] Work Unit L2 exposes the locked tab set with persistent selected-work-unit context.
- [ ] Agents and Dependency Definitions match their locked page-shell structures.
- [ ] Methodology Facts remains aligned with the version-scoped IA and shared shell/state conventions.
- [ ] CRUD entry points for Facts, Agents, Dependency Definitions, and Work Units align with the locked page contracts recorded in the architecture docs.

### 3) Deterministic States and Accessibility

- [ ] Empty/loading/error states are implemented for each new shell.
- [ ] State handling preserves relevant route or selection context whenever practical.
- [ ] Keyboard-accessible navigation is verified for the new shell routes and tab affordances.
- [ ] Command palette blocked/failed states use human-readable operator messaging and preserve safe scope context when practical.
- [ ] Story 3.1 blocked/failed/loading states follow the global human-readable error contract instead of exposing raw internal-first messaging.

### 4) Verification and Evidence

- [ ] Sidebar and route integration tests cover the new version-scoped IA.
- [ ] Command palette tests prove context-aware reachability and create-action parity for the new methodology surfaces.
- [ ] Manual and Playwright evidence are captured for design-shell navigation consistency.
- [ ] Validation commands pass and the story includes explicit evidence/diagnostic outputs for G3.

## Validation (Exact Commands + Expected Outcomes)

1. `bun run check`
   - Expected: PASS with no lint or formatting violations.

2. `bun run check-types`
   - Expected: PASS with no type errors after route and shell additions.

3. `bun run --cwd apps/web test -- src/tests/components/app-shell.sidebar-sections.integration.test.tsx src/tests/components/app-sidebar.integration.test.tsx`
   - Expected: PASS; methodology version navigation reflects real Story 3.1 routes rather than disabled placeholders.

4. `bun run --cwd apps/web test -- 'src/routes/methodologies.$methodologyId.versions.$versionId*.integration.test.tsx'`
   - Expected: PASS; version-scoped design-time shells render deterministic loading/error/empty states and route transitions.

5. `bunx playwright test`
   - Expected: PASS for the Story 3.1 navigation scenario covering version workspace, Facts, Work Units, Agents, Dependency Definitions, and Work Unit L2 shell entry.

## Evidence Pack

- `design-shell-route-map-log`: route inventory covering every Story 3.1 page shell and how it is reached from version context.
- `design-shell-nav-consistency-log`: manual and Playwright evidence showing consistent sidebar, tab, and route navigation behavior.
- `design-shell-state-handling-log`: screenshots or structured notes for empty/loading/error states proving context preservation and deterministic copy.
- `design-shell-route-diagnostics`: deterministic diagnostics references for route/state failures captured during verification.
- `design-shell-accessibility-diagnostics`: keyboard-navigation and accessibility findings for new shell routes and tab sets.

### Project Structure Notes

- Alignment with unified project structure: keep new UI shells under `apps/web/src/routes/**` and reusable methodology UI under `apps/web/src/features/methodologies/**`.
- Detected variance to eliminate: methodology version navigation still exposes disabled placeholders instead of route-complete Story 3.1 surfaces.
- Detected variance to avoid: the existing version workspace already contains graph/editor logic; Story 3.1 should extract/reuse from it instead of forking a second implementation.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1: Complete Design-Time IA and Page Shell Baseline]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/project-context.md]
- [Source: docs/architecture/epic-3-authority.md]
- [Source: docs/architecture/chiron-module-structure.md]
- [Source: docs/architecture/methodology-pages/versions.md]
- [Source: docs/architecture/methodology-pages/work-units/overview.md]
- [Source: docs/architecture/methodology-pages/work-units/detail-tabs.md]
- [Source: docs/architecture/methodology-pages/methodology-facts.md]
- [Source: docs/architecture/methodology-pages/agents.md]
- [Source: docs/architecture/methodology-pages/dependency-definitions.md]
- [Source: docs/plans/2026-03-17-context-aware-command-palette-design.md]
- [Source: apps/web/src/components/sidebar-sections.tsx]
- [Source: apps/web/src/components/app-sidebar.tsx]
- [Source: apps/web/src/features/methodologies/command-palette.tsx]
- [Source: apps/web/src/routes/methodologies.$methodologyId.tsx]
- [Source: apps/web/src/routes/methodologies.$methodologyId.versions.tsx]
- [Source: apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx]
- [Source: apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx]
- [Source: apps/web/src/features/methodologies/version-workspace-graph.tsx]
- [Source: apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx]
- [Source: apps/web/src/tests/components/app-sidebar.integration.test.tsx]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `docs/architecture/methodology-pages/work-units/overview.md`
- `docs/architecture/methodology-pages/work-units/detail-tabs.md`
- `docs/architecture/methodology-pages/methodology-facts.md`
- `docs/architecture/methodology-pages/agents.md`
- `docs/architecture/methodology-pages/dependency-definitions.md`
- `apps/web/src/components/sidebar-sections.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
- `apps/web/src/features/methodologies/version-workspace-graph.tsx`
- `apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx`
- `apps/web/src/tests/components/app-sidebar.integration.test.tsx`

### Completion Notes List

- Story context was rebuilt from Epic 3 planning artifacts, current architecture authority docs, UX constraints, and current methodology route/sidebar code.
- The document now calls out the exact existing implementation baseline so the dev agent can extend current surfaces rather than reinvent them.
- Tasks and DoD encode the locked Story 3.1 page-shell contracts for Facts, Work Units (L1), Agents, Dependency Definitions, and Work Unit L2.
- Validation and evidence sections explicitly require route, accessibility, and deterministic-state proof aligned with Gate G3.

### File List

- `apps/web/src/components/sidebar-sections.tsx`
- `apps/web/src/components/app-sidebar.tsx`
- `apps/web/src/features/methodologies/workspace-shell.tsx`
- `apps/web/src/features/methodologies/version-workspace-graph.tsx`
- `apps/web/src/features/methodologies/methodology-facts.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
- `apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx`
- `apps/web/src/tests/components/app-sidebar.integration.test.tsx`

## Post-Implementation Addendum (2026-03-17) — Methodology Dashboard IA Alignment

### Scope of this addendum

- Align `/methodologies/:methodologyId` to version-first dashboard behavior after UX review.
- Remove dashboard-level facts inventory presentation to avoid cross-scope ambiguity.
- Encode pinned-project editability rule at dashboard action level.

### Implemented changes

- Updated route:
  - `apps/web/src/routes/methodologies.$methodologyId.tsx`
- Replaced facts-inventory dashboard body with:
  - summary strip: `Latest Active Version`, `Latest Draft Version`, `Total Versions`
  - version ledger section with lifecycle badges and editability state
- Added pinned-aware editability behavior:
  - editable when lifecycle is not archived and pinned-project count is `0`
  - locked when pinned-project count is greater than `0`
  - archived rows remain locked
- Kept version navigation context intact through existing versions/workspace routes.

### Test updates

- Updated:
  - `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx`
- New assertions validate:
  - version-first summary strip and ledger presence
  - lifecycle badge visibility
  - pinned-aware lock/edit behavior labels
  - absence of dashboard facts inventory/editor cues on this route

### Verification evidence

Commands run (all passing after formatting correction):

1. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx'`
2. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx' 'src/tests/components/app-shell.sidebar-sections.integration.test.tsx' 'src/tests/components/app-sidebar.integration.test.tsx' 'src/tests/features/methodologies/commands.test.ts' 'src/tests/features/methodologies/command-palette.integration.test.tsx'`
3. `bun run --cwd apps/web check-types`
4. `bun run check-types`
5. `bun run check` (required formatting fix applied via `bunx oxfmt --write 'apps/web/src/routes/methodologies.$methodologyId.tsx'`)
6. `bunx playwright test tests/e2e/story-3-1-design-shell-navigation.spec.ts`

### Notes

- This addendum intentionally targets IA clarity on methodology dashboard only; it does not alter deeper draft/activation policy beyond pinned-aware dashboard edit affordances.

## Post-Implementation Addendum (2026-03-17) — Dashboard/Versions Convergence + API Ownership

### Scope of this addendum

- Make `/methodologies/:methodologyId` the canonical methodology page for version ledger + draft controls.
- Keep `/methodologies/:methodologyId/versions` as a compatibility route shell (not a duplicated maintained UX page).
- Move version editability metadata ownership to server/API.

### Implemented changes

- Dashboard route now hosts former versions-index controls:
  - `Create Draft`
  - `Open Existing Draft`
- Dashboard ledger now consumes API-owned metadata per version:
  - `pinnedProjectCount`
  - `isEditable`
  - `editabilityReason`
- Versions index route was reduced to compatibility content with a deterministic path back to dashboard while preserving nested child route behavior through `Outlet`.
- API router (`packages/api/src/routers/methodology.ts`) now enriches methodology version summaries with editability metadata before returning details/versions to web clients.

### Files updated (convergence slice)

- `apps/web/src/routes/methodologies.$methodologyId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx`
- `packages/api/src/routers/methodology.ts`
- `packages/api/src/tests/routers/methodology.test.ts`

### Verification evidence

Commands run for this convergence slice:

1. `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`
2. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx'`
3. `bun run --cwd apps/web test -- 'src/tests/components/app-shell.sidebar-sections.integration.test.tsx' 'src/tests/components/app-sidebar.integration.test.tsx' 'src/tests/features/methodologies/commands.test.ts' 'src/tests/features/methodologies/command-palette.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`

### Notes

- `packages/core` extraction was intentionally deferred in this slice because editability derivation is currently a single-surface API composition concern. Extraction remains a follow-up if this policy becomes multi-consumer or materially more complex.

## Post-Implementation Addendum (2026-03-17) — Comfortable Desktop Scaling (1080p/1440p)

### Scope of this addendum

- Address operator feedback that desktop UI felt too small/sparse at 1440p while keeping the Story 3.1 shell UX intact.
- Apply one maintainable desktop scale strategy instead of page-by-page sizing overrides.

### Implemented changes

- Added desktop fluid root scaling in global web styles (`apps/web/src/index.css`):
  - baseline remains stable at smaller sizes
  - scales up between desktop breakpoints with clamp-based bounds
- Added shell spacing hooks for balanced rhythm under the larger scale:
  - `chiron-app-shell-header`
  - `chiron-app-shell-content`
- Updated app shell structure to use those hooks:
  - `apps/web/src/components/app-shell.tsx`

### Files updated (scaling slice)

- `apps/web/src/index.css`
- `apps/web/src/components/app-shell.tsx`
- `docs/plans/2026-03-17-comfortable-desktop-scaling-design.md`
- `docs/plans/2026-03-17-comfortable-desktop-scaling-implementation-plan.md`

### Verification evidence

Commands run for this scaling slice:

1. `bun run --cwd apps/web test -- src/tests/components/app-shell.sidebar-sections.integration.test.tsx`
2. `bun run --cwd apps/web test -- src/tests/features/methodologies/command-palette.integration.test.tsx src/tests/features/methodologies/commands.test.ts`
3. `bun run --cwd apps/web check-types`
4. `bun run check`

### Notes

- This slice intentionally avoids per-page hardcoded resolution logic and avoids introducing new effect-based runtime resizing behavior.
