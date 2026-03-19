# Story 3.1: Complete Design-Time IA and Page Shell Baseline

Status: done

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

## Post-Implementation Addendum (2026-03-17) — Version Workspace Author Hub + Two-Tab Top Layer

### Scope of this addendum

- Replace the old top-level version workspace mode model (`Author`, `Publish`, `Evidence`, `Context`) with the approved first-layer contract.
- Establish `Author` as a hub with visible quick-action and hotkey parity instead of a top-level mega-editor.
- Keep deeper authoring on dedicated owner pages while preserving deterministic review/publish behavior.

### Implemented changes

- Top-level version workspace now exposes exactly two visible tabs:
  - `Author`
  - `Review & Publish`
- Added a dedicated author-hub component:
  - `apps/web/src/features/methodologies/version-workspace-author-hub.tsx`
- Added reusable author-hub action metadata and input-guarded TanStack hotkey sequence wiring:
  - `apps/web/src/features/methodologies/version-workspace-author-hub-actions.ts`
- Author hub now shows the approved first-layer shell:
  - status cards: `DRAFT`, `SAVE STATE`, `RUNTIME`, `READINESS`
  - surface cards: `Work Units`, `Facts`, `Agents`, `Link Types`
  - visible quick-action parity for open/create actions with existing command grammar hints:
    - `G W`, `C W`
    - `G F`, `C F`
    - `G A`, `C A`
    - `G L`, `C L`
- Top-level author hub actions route to the same destinations as the command palette:
  - work units -> `/methodologies/:methodologyId/versions/:versionId/work-units`
  - facts -> `/methodologies/:methodologyId/versions/:versionId/facts`
  - agents -> `/methodologies/:methodologyId/versions/:versionId/agents`
  - link types -> `/methodologies/:methodologyId/versions/:versionId/dependency-definitions`
- Legacy top-layer search states were removed from the route contract; only `author` and `review` remain valid top-level workspace pages.
- The top-level workspace route no longer mounts the old `MethodologyVersionWorkspace` editor directly.
- Remaining `useEffect` state-sync logic was removed from the top-level workspace route in favor of render-derived state to align with React best-practices guidance.

### Files updated (author-hub slice)

- `apps/web/src/features/methodologies/version-workspace-author-hub.tsx`
- `apps/web/src/features/methodologies/version-workspace-author-hub-actions.ts`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.tsx`
- `apps/web/src/tests/features/methodologies/version-workspace-author-hub.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

### Verification evidence

Commands run for this author-hub slice:

1. `bun run --cwd apps/web test -- 'src/tests/features/methodologies/version-workspace-author-hub.test.tsx'`
2. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' 'src/tests/features/methodologies/version-workspace-author-hub.test.tsx' 'src/tests/features/methodologies/commands.test.ts' 'src/tests/features/methodologies/command-palette.integration.test.tsx'`
3. `bun run --cwd apps/web check-types`
4. `bun run check-types`
5. `bun run check`
6. `bunx playwright test tests/e2e/story-3-1-design-shell-navigation.spec.ts`

### Notes

- This slice keeps deeper editing intentionally out of the top-level workspace and treats `Author` as a navigational hub.
- Hotkey behavior is guarded so shortcut sequences do not fire while text input targets are active.

## Post-Implementation Addendum (2026-03-17) — Reusable Surface Card Primitive

### Scope of this addendum

- Replace the one-off Author hub surface cards with an approved reusable card primitive.
- Match the near-exact reference structure while keeping colors sourced from the existing app palette.
- Preserve existing quick-action and hotkey parity while moving the Author hub onto the reusable shell.

### Implemented changes

- Added a reusable surface-card component:
  - `apps/web/src/components/surface-card.tsx`
- The shared card now provides the approved structural language:
  - square shell
  - thin border
  - palette-derived tinted background
  - subtle diagonal stripe wash
  - four decorative corner squares
  - explicit footer separator
  - compact side-by-side footer actions
- Migrated the Author hub surface cards to use the reusable primitive while keeping current content intact:
  - `Work Units`
  - `Facts`
  - `Agents`
  - `Link Types`
- Preserved current quick-action behaviors during the migration:
  - visible shortcut hints remain attached to action buttons
  - disabled rationale remains visible when provided
  - existing TanStack hotkey sequence behavior still routes through the Author hub layer

### Files updated (reusable-card slice)

- `apps/web/src/components/surface-card.tsx`
- `apps/web/src/features/methodologies/version-workspace-author-hub.tsx`
- `apps/web/src/tests/components/surface-card.test.tsx`
- `apps/web/src/tests/features/methodologies/version-workspace-author-hub.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

### Verification evidence

Commands run for this reusable-card slice:

1. `bun run --cwd apps/web test -- 'src/tests/components/surface-card.test.tsx'`
2. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' 'src/tests/components/surface-card.test.tsx' 'src/tests/features/methodologies/version-workspace-author-hub.test.tsx'`

### Notes

- This primitive is intended for reuse across the app; the Author hub is only the first consumer.
- The visual structure is near-exact to the approved reference, but color derives from current Chiron tone tokens rather than a copied external palette.

## Post-Implementation Addendum (2026-03-17) — Work Units L1 Overview Shell

### Scope

Implemented the approved Work Units L1 surface at
`/methodologies/:methodologyId/versions/:versionId/work-units` as the version-scoped overview page for browsing, selecting, and opening work units.

### What changed

- Replaced the placeholder L1 shell with the approved page structure:
  - page-level `+ Add Work Unit`
  - top-level `Graph`, `Contracts`, and `Diagnostics` tabs
  - persistent right rail with search, work-unit index, and active summary
- Locked the clarified L1 graph rule into implementation:
  - only one node type at L1: `Work Unit`
  - transitions are details inside the work-unit card, not graph nodes
  - edges exist only between work units
- Updated the pure graph projection so L1 derives work-unit-to-work-unit edges from explicit work-unit relationships.
- Added reusable page-local selectors for deterministic L1 summaries and active selection fallback.
- Extracted presentational page primitives for:
  - graph view
  - right rail summary/index
- Added deterministic placeholder shells for the locked `Contracts` and `Diagnostics` L1 tabs while preserving route-backed selection context.
- Kept selection and view state route-backed through search params (`view`, `selected`).

### Files updated

- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- `apps/web/src/features/methodologies/version-graph.ts`
- `apps/web/src/features/methodologies/work-units-page-selectors.ts`
- `apps/web/src/features/methodologies/work-units-graph-view.tsx`
- `apps/web/src/features/methodologies/work-units-list-view.tsx`
- `apps/web/src/features/methodologies/work-units-right-rail.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`
- `apps/web/src/tests/features/methodologies/version-graph.test.ts`
- `apps/web/src/tests/features/methodologies/work-units-page-selectors.test.ts`

### Verification evidence

Commands run for this Work Units L1 slice:

1. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`
2. `bun run --cwd apps/web test -- 'src/tests/features/methodologies/version-graph.test.ts' 'src/tests/features/methodologies/work-units-page-selectors.test.ts'`
3. `bun run --cwd apps/web test -- 'src/tests/features/methodologies/version-graph.test.ts' 'src/tests/features/methodologies/work-units-page-selectors.test.ts' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`
4. `bun run --cwd apps/web check-types`
5. `bun run check-types`
6. `bun run check`

### Notes

- The current relationship-edge source is implemented through explicit work-unit `relationships` in the L1 projection layer.
- This matches the newly approved L1 contract better than the prior transition-node model, but broader canonical documentation may still need future tightening around the exact serialized source of those relationships.

## Post-Implementation Addendum (2026-03-17) - Methodology Version Namespace Migration

### Scope

Recorded the Story 3.1 API and web migration from draft-centric methodology procedure names to the approved version-owned namespace.

### Implemented namespace decision

- Version lifecycle procedures now live under `methodology.version.*`:
  - `methodology.version.list`
  - `methodology.version.create`
  - `methodology.version.get`
  - `methodology.version.update`
  - `methodology.version.validate`
  - `methodology.version.publish`
  - `methodology.version.getLineage`
  - `methodology.version.getPublicationEvidence`
  - `methodology.version.workspace.get`
- Story 3.1 shallow version-owned entity surfaces now exist under the same aggregate:
  - `methodology.version.fact.list`
  - `methodology.version.agent.list`
  - `methodology.version.dependencyDefinition.list`
  - `methodology.version.workUnit.list`
  - `methodology.version.workUnit.create`
  - `methodology.version.workUnit.get`
  - `methodology.version.workUnit.updateMeta`
  - `methodology.version.workUnit.delete`
- Story 3.1 intentionally stops at the shallow work-unit surface.
- Story 3.2 remains the planned expansion point for nested work-unit internals such as:
  - `methodology.version.workUnit.fact.*`
  - `methodology.version.workUnit.stateMachine.*`
  - `methodology.version.workUnit.workflow.*`
  - `methodology.version.workUnit.artifactSlot.*`

### Single-draft product rule now enforced

- `methodology.version.create` now fails when a draft version already exists for the methodology.
- This is enforced in the service layer through `DraftVersionAlreadyExistsError`, not only by UI convention.
- The web surfaces continue to support `Create Draft` / `Open Existing Draft` behavior around that invariant.

### Story 3.1 web alignment completed

- Story 3.1 web consumers were aligned to the new version-owned surface for create/bootstrap/read/publish behavior:
  - dashboard create flow uses `methodology.version.create`
  - workspace bootstrap uses `methodology.version.workspace.get`
  - workspace validation/publish uses `methodology.version.validate` and `methodology.version.publish`
  - app shell version bootstrap uses `methodology.version.workspace.get`
  - command palette draft creation uses `methodology.version.create`
  - shallow read routes use `methodology.version.fact.list`, `agent.list`, `dependencyDefinition.list`, and `workUnit.list/get`
- Historical snapshot (superseded on 2026-03-19): at this point in Story 3.1, draft-centric seams were still present for lifecycle/workflow payload updates. That is no longer true in the current architecture after the layered refactor.

### Files updated in the namespace slice

- `packages/contracts/src/methodology/version.ts`
- `packages/methodology-engine/src/errors.ts`
- `packages/methodology-engine/src/version-service.ts`
- `packages/api/src/routers/methodology.ts`
- `packages/api/src/tests/routers/methodology.test.ts`
- `apps/web/src/routes/methodologies.$methodologyId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- `apps/web/src/components/app-shell.tsx`
- `apps/web/src/features/methodologies/command-palette.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`
- `apps/web/src/tests/routes/-methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- `apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx`
- `docs/plans/2026-03-17-methodology-version-namespace-design.md`

### Verification evidence

Commands run for the namespace migration slice:

1. `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`
2. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx' 'src/tests/features/methodologies/command-palette.integration.test.tsx'`
3. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx' 'src/tests/routes/-methodologies.$methodologyId.versions.$versionId.integration.test.tsx'`
4. `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts && bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

### Notes

- This slice intentionally establishes the version-owned API boundary first, while leaving a narrow compatibility bridge for lifecycle/workflow persistence until deeper entity-specific mutations are introduced.
- The Story 3.1 vs Story 3.2 boundary is now explicit in both the API shape and the verification surface.

## Post-Implementation Addendum (2026-03-17) - Catalog and Entity Mutation Surface

### Scope

Recorded the Story 3.1 mutation follow-up that completed methodology catalog actions plus dedicated fact, agent, and dependency-definition mutation surfaces.

### Implemented mutation decision

- methodology aggregate CRUD now lives under `methodology.catalog.*`:
  - `methodology.catalog.list`
  - `methodology.catalog.create`
  - `methodology.catalog.get`
  - `methodology.catalog.update`
  - `methodology.catalog.delete`
- `methodology.catalog.delete` is implemented as soft delete / archive.
- nested Story 3.1 entity mutations now exist under `methodology.version.*`:
  - `methodology.version.fact.create/update/delete`
  - `methodology.version.agent.create/update/delete`
  - `methodology.version.dependencyDefinition.create/update/delete`

### Story 3.1 frontend alignment completed

- facts page save/delete flow now uses `methodology.version.fact.create/update/delete`
- methodology dashboard edit/archive actions now use `methodology.catalog.update/delete`
- agents page now exposes a real create-flow dialog using `methodology.version.agent.create`
- dependency-definitions page now exposes a real create-flow dialog using `methodology.version.dependencyDefinition.create`

### Files updated in the mutation slice

- `packages/contracts/src/methodology/fact.ts`
- `packages/contracts/src/methodology/agent.ts`
- `packages/contracts/src/methodology/dependency.ts`
- `packages/contracts/src/methodology/projection.ts`
- `packages/methodology-engine/src/repository.ts`
- `packages/methodology-engine/src/version-service.ts`
- `packages/methodology-engine/src/lifecycle-service.ts`
- `packages/db/src/schema/methodology.ts`
- `packages/db/src/methodology-repository.ts`
- `packages/api/src/routers/methodology.ts`
- `packages/api/src/tests/routers/methodology.test.ts`
- `apps/web/src/routes/methodologies.$methodologyId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`
- `docs/plans/2026-03-17-methodology-catalog-and-version-entity-mutations-design.md`

### Verification evidence

Commands run for the mutation-surface slice:

1. `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`
2. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx'`
3. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx'`
4. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`

### Notes

- This slice completes the intended Story 3.1 mutation surface for methodology catalog actions and the fact/agent/dependency-definition entity layer.
- Work Units remain shallow in Story 3.1.
- Historical note: the former compatibility seams (`orpc.methodology.updateDraftLifecycle`, `orpc.methodology.updateDraftWorkflows`) were removed in the 2026-03-19 methodology-engine layered refactor.

## Post-Implementation Addendum (2026-03-18) - L1 Completion

### Scope

Closed the remaining Story 3.1 L1 product surface for agents, dependency definitions, and shallow work-unit/dashboard mutation affordances while intentionally leaving L2 artifact/state-machine work out of scope.

### Implemented changes

- Methodology dashboard now exposes user-visible methodology aggregate actions:
  - `Edit Methodology`
  - `Archive Methodology`
- Facts page save/delete flow now uses dedicated fact CRUD mutations end-to-end:
  - `methodology.version.fact.create`
  - `methodology.version.fact.update`
  - `methodology.version.fact.delete`
- Agents page now exposes user-visible create/edit/delete dialogs using:
  - `methodology.version.agent.create`
  - `methodology.version.agent.update`
  - `methodology.version.agent.delete`
- Dependency Definitions page now exposes user-visible create/edit/delete dialogs using:
  - `methodology.version.dependencyDefinition.create`
  - `methodology.version.dependencyDefinition.update`
  - `methodology.version.dependencyDefinition.delete`
- Work Units remained at the shallow Story 3.1 boundary already accepted for L1:
  - `list`
  - `create`
  - `get`
  - `updateMeta`
  - `delete`

### Files updated in the L1 completion slice

- `apps/web/src/routes/methodologies.$methodologyId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`
- `docs/plans/2026-03-18-story-3-1-l1-completion-design.md`

### Verification evidence

Commands run for the L1 completion slice:

1. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx'`
2. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx'`
3. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`
4. `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`
5. `bun run check-types`
6. `bun run check`

### Notes

- This addendum closes the approved L1 product surface only.
- Artifact slots, artifact templates, and state-machine internals remain intentionally deferred to L2.

## Senior Developer Review (AI)

### Review Date

- 2026-03-18

### Reviewer

- OpenCode (openai/gpt-5.4)

### Findings Summary

- No active blocking findings remain from the Story 3.1 remediation pass after fresh verification.

### Resolved In This Pass

- `Add Fact`, `Add Agent`, and `Add Link Type` now navigate into intent-backed create flows, and the Agents / Dependency Definitions routes now open and clear those create intents deterministically.
- `Add Work Unit` now follows the same route-backed create-intent pattern: the command palette navigates with `intent=add-work-unit`, and the Work Units route opens and clears that create intent while preserving current selection context.
- Work Units L1 create now captures the shallow metadata contract actually supported by Story 3.1 (`Work Unit Key`, `Display Name`, `Description`) and still normalizes hidden invalid draft agent personas before submit so the visible create action is self-sufficient against the existing broad lifecycle mutation contract.
- Work Units L1 create failures now surface operator-visible inline error copy and preserve dialog context instead of failing silently.
- Work Unit L2 routes now validate the selected `workUnitKey` and render preserved-context failed state instead of false success for arbitrary keys.
- `Open Relationship View` now performs a deterministic navigation back to graph mode while preserving the active selected work unit.
- The command palette no longer advertises nonexistent project scope/context, so its labels now match the real command model.
- The Work Units L1 tab contract is back in sync with authority docs: `Graph`, `Contracts`, and `Diagnostics`.

### Outcome

- Targeted remediation verification passed, no active blocking findings remain, and Story 3.1 returns to `review`.

### Change Log

- 2026-03-18: Senior Developer Review recorded 5 HIGH and 2 MEDIUM active findings across command-palette parity, Work Units L1 create-flow determinism, silent mutation failures, route determinism, dead shell affordances, and project-context honesty; story returned to `in-progress` pending remediation.
- 2026-03-18: Remediation verification passed the targeted Story 3.1 suite (30 tests), `bun run --cwd apps/web check-types`, and `bun run check`. Six review findings are now resolved; one HIGH finding remains active for command-palette `Add Work Unit` parity, so the story stays `in-progress`.
- 2026-03-18: Final parity remediation passed the refreshed targeted Story 3.1 suite (31 tests), `bun run --cwd apps/web check-types`, and `bun run check`. The remaining `Add Work Unit` command-palette blocker is now resolved, so no active blocking findings remain and the story returns to `review`.
- 2026-03-18: Work Units create dialog regression was corrected so the Story 3.1 shallow create surface now authors `Work Unit Key`, `Display Name`, and `Description`; targeted Work Units regression tests, `bun run --cwd apps/web check-types`, and the refreshed Story 3.1 verification suite all passed afterward.

## Architecture Alignment Addendum (2026-03-19)

### Boundary clarification after Story 3.1

- Story 3.1 completion remains valid for approved L1 UX/API outcomes.
- Canonical architecture ownership is now clarified as:
  - methodology version = publish/release root,
  - work unit = workflow and transition-workflow binding authoring root.
- Any compatibility shape that still exposes version-level workflow summaries is read/projection-only and must not become a parallel writable authority.

### Design-time vs runtime contract stance

- `@chiron/methodology-engine` remains the design-time authority for definitions, validation, and publication.
- Runtime packages consume published runtime-facing contracts/projections and do not own design-time persistence seams.

### Stability disclaimer

- Execution module/service internals are provisional and may change heavily during L1/L2/L3 implementation hardening.
- Stability anchors are the design-time contract boundary and runtime-facing published contract/projection boundary.

## Methodology-Engine Refactor Completion Addendum (2026-03-19)

### Completion status

- Lifecycle/legacy compatibility seam removed from active methodology-engine composition.
- API methodology and project routers now consume boundary-first L1 services.
- `packages/methodology-engine/src/lifecycle-service.ts` removed after migration.

### Verified outcomes

- Version CRUD and archive-not-delete behavior remained intact after seam removal.
- L1 boundary characterization and service tests passed.
- API methodology router tests and web methodology integration tests passed.
- Scoped build for `@chiron/api`, `@chiron/methodology-engine`, and `web` passed.

### Reference commits

- `8c0a93313` — refactor(methodology): remove lifecycle compatibility seam and finalize version archive flows
- `74cbb68b5` — merge `chore/l1-layers-scaffold` into `feat/effect-migration`

## Current Backend Architecture Snapshot Addendum (2026-03-19)

### Why this addendum exists

- This section records the **current repo state** after the L1 layering work so Story 3.1 history stays aligned with the actual backend implementation.
- It captures service ownership, router wiring, and the still-active compatibility-shaped procedures that are part of the current API surface.

### Active service layering (current)

- `packages/methodology-engine/src/layers/live.ts` composes the L1 methodology layer as:
  - `MethodologyVersionServiceLive`
  - `MethodologyValidationServiceLive`
  - `PublishedMethodologyServiceLive`
- `packages/methodology-engine/src/index.ts` exports the L1 boundary alias:
  - `MethodologyVersionService` as `MethodologyVersionBoundaryService`
- `packages/api/src/routers/index.ts` wires runtime layers by providing repos into:
  - `MethodologyEngineL1Live`
  - `EligibilityServiceLive`
  - `ProjectContextServiceLive`

### Current backend ownership model

- **API router layer (`packages/api/src/routers/methodology.ts`)**
  - maps transport procedures and namespace aliases (`catalog.*`, `version.*`) to service calls
  - retains top-level procedures for project pinning and transition eligibility
- **Boundary service layer (`packages/methodology-engine/src/services/methodology-version-service.ts`)**
  - exposes draft/version/catalog operations and Story 3.1 shallow entity CRUD entry points
  - keeps lifecycle/workflow update entry points (`updateDraftLifecycle`, `updateDraftWorkflows`)
- **Core version service (`packages/methodology-engine/src/version-service.ts`)**
  - remains the deeper implementation for draft lifecycle, validation, publication, and persistence orchestration
- **Repository layer (`packages/methodology-engine/src/repository.ts` + `lifecycle-repository.ts`)**
  - persists methodology/version and lifecycle-specific structures through Effect `Context.Tag` boundaries

### API namespace and behavior notes (current)

- `catalog` aliases exist and route to methodology aggregate actions:
  - `list`, `create`, `get`, `update`, `delete` (archive)
- `version` aliases exist and route to version aggregate actions:
  - `list`, `create`, `get`, `update`, `updateMeta`, `archive`, `validate`, `workspace.get`, `getLineage`, `publish`, `getPublicationEvidence`
- Story 3.1 shallow entity aliases remain under `version`:
  - `fact.{list,create,update,delete}`
  - `agent.{list,create,update,delete}`
  - `dependencyDefinition.{list,create,update,delete}`
  - `workUnit.{list,create,get,updateMeta,delete}`
- Important current mapping detail:
  - `version.workUnit.delete` currently aliases `router.updateDraftLifecycle` (full lifecycle payload path), not a dedicated work-unit-only delete transport path.

### Invariants currently enforced in service layer

- Draft mutability guard is enforced before lifecycle/workflow mutations (`VersionNotDraftError` path).
- Duplicate and existence checks remain active for dependency definitions (`DuplicateDependencyDefinitionError`, `DependencyDefinitionNotFoundError`).
- Validation/decode and repository failure categories are preserved through typed Effect error channels and mapped by API router error handling.

### Files reviewed for this addendum

- `packages/methodology-engine/src/index.ts`
- `packages/methodology-engine/src/layers/live.ts`
- `packages/methodology-engine/src/services/methodology-version-service.ts`
- `packages/methodology-engine/src/version-service.ts`
- `packages/methodology-engine/src/repository.ts`
- `packages/methodology-engine/src/lifecycle-repository.ts`
- `packages/api/src/routers/index.ts`
- `packages/api/src/routers/methodology.ts`

### Verification evidence for this documentation update

1. `grep` over `packages/methodology-engine/src/services` and `packages/methodology-engine/src/layers` to confirm current service tags and layer composition.
2. `read` verification of:
   - `packages/methodology-engine/src/index.ts`
   - `packages/methodology-engine/src/layers/live.ts`
   - `packages/methodology-engine/src/services/methodology-version-service.ts`
   - `packages/api/src/routers/index.ts`
   - `packages/api/src/routers/methodology.ts`
3. `grep` verification of active router procedures including `updateDraftLifecycle` and `updateDraftWorkflows` usage in `packages/api/src/routers/methodology.ts`.

## Story 3.2 Trajectory Addendum (2026-03-19) — Methodology-Engine L2 Design Path

### Scope of this addendum

- Capture the explicit backend design trajectory from completed Story 3.1 into Story 3.2 (Work Unit L2 tabs).
- Record the concrete service/API/file plan so L2 implementation can proceed without re-litigating ownership.

### Story 3.1 assessment (what is stable now)

- L1 boundary-first shape is active and remains the Story 3.1 authority for:
  - methodology catalog/version lifecycle,
  - methodology-level facts/agents/dependency definitions,
  - shallow work-unit metadata CRUD.
- The active composition currently centers on:
  - `packages/methodology-engine/src/layers/live.ts`
  - `packages/methodology-engine/src/services/methodology-version-service.ts`
  - `packages/methodology-engine/src/version-service.ts`
  - `packages/api/src/routers/methodology.ts`
- L2/L3 scaffolds are present but intentionally thin:
  - `packages/methodology-engine/src/services/work-unit-service.ts`
  - `packages/methodology-engine/src/services/workflow-service.ts`
  - `packages/methodology-engine/src/contracts/runtime-resolvers.ts`

### Story 3.2 backend design choice (locked for trajectory)

- Keep **methodology version** as publish/release aggregate root.
- Move/solidify **work-unit internals** under Story 3.2 L2 ownership and APIs:
  - work-unit facts,
  - work-unit workflows,
  - state machine authoring (states/transitions/condition sets/bindings),
  - artifact slots.
- Keep L1 focused on version-level and shallow metadata concerns; do not re-expand L1 to own deep L2 mutation paths.

### L2 namespace target under `methodology.version.workUnit.*`

- `fact.{list,create,update,delete}`
- `workflow.{list,create,update,delete}`
- `stateMachine.state.{list,create,update,delete}`
- `stateMachine.transition.{list,create,update,delete}`
- `stateMachine.conditionSet.{list,create,update,delete}`
- `stateMachine.binding.{list,create,update,delete}`
- `artifactSlot.{list,create,update,delete}`
- `artifactSlot.template.{list,create,update,delete}`

### Current gaps that Story 3.2 must close

- Router gap: `packages/api/src/routers/methodology.ts` currently exposes shallow `version.workUnit.*` aliases and still relies on `updateDraftLifecycle` / `updateDraftWorkflows` compatibility-shaped payload paths for deeper edits.
- Contracts gap:
  - `packages/contracts/src/methodology/fact.ts` defines methodology-level fact CRUD but no explicit nested `workUnit.fact.*` contracts.
  - no dedicated artifact-slot contracts file exists yet.
- Service gap:
  - `packages/methodology-engine/src/services/work-unit-service.ts` and `workflow-service.ts` are scaffold tags only.
  - L2 live implementations and repository boundaries for nested work-unit internals are not wired.
- Schema gap:
  - lifecycle/workflow tables exist in `packages/db/src/schema/methodology.ts`,
  - artifact-slot tables are not yet present.

### Planned service and file trajectory for Story 3.2

- Design record (this trajectory):
  - `docs/plans/2026-03-19-story-3-2-l2-methodology-engine-design.md`
- Engine/services:
  - **Create** `packages/methodology-engine/src/services/work-unit-fact-service.ts`
  - **Create** `packages/methodology-engine/src/services/work-unit-state-machine-service.ts`
  - **Create** `packages/methodology-engine/src/services/work-unit-artifact-slot-service.ts`
  - **Update** `packages/methodology-engine/src/services/work-unit-service.ts` (from scaffold toward composed L2 boundary facade)
  - **Update** `packages/methodology-engine/src/services/workflow-service.ts` (work-unit scoped workflow ownership)
  - **Update** `packages/methodology-engine/src/layers/live.ts` to compose L2 live layers explicitly
  - **Update** `packages/methodology-engine/src/index.ts` exports for new L2 boundary services
- Contracts/API:
  - **Update** `packages/contracts/src/methodology/fact.ts` with work-unit scoped contract variants
  - **Create** `packages/contracts/src/methodology/artifact-slot.ts`
  - **Update** `packages/contracts/src/methodology/index.ts` exports
  - **Update** `packages/api/src/routers/methodology.ts` to add nested `version.workUnit.*` L2 routers
- Persistence:
  - **Update** `packages/db/src/schema/methodology.ts` for artifact-slot definitions/templates tables
  - **Update** `packages/db/src/methodology-repository.ts` for corresponding persistence operations

### Locked L2 interaction decisions (2026-03-19 follow-up)

- L2 remains one selected-work-unit page with top-level tabs:
  - `Overview`, `Facts`, `Workflows`, `State Machine`, `Artifact Slots`
- `State Machine` contains inner tabs:
  - `States`, `Transitions`
- Facts tab stays methodology-facts style and list/table-first (no row expansion in this slice).
- Workflow bindings are owned by State Machine transition editing; Workflows tab shows binding visibility but does not own binding writes.
- Artifact-slot templates are edited inside Slot Details dialog (nested template table), not as a separate page/tab.
- State deletion policy is warning-first (not hard-block):
  - destructive confirmation lists affected transitions,
  - default remediation allows disconnecting transition endpoints (set state refs to null where applicable),
  - optional explicit transition cleanup/delete path can be offered in the same flow.
- Unbound transition policy:
  - warning severity,
  - `Unbound` badge in transition rows,
  - inline `Bind workflow` opens full Transition dialog on binding-focused tab.

### Verification and evidence intent for Story 3.2 prep

- Preserve Story 3.1 outcomes while adding L2 ownership incrementally.
- Validate each slice with targeted methodology-engine + API + web route tests before broad repo checks.
- Keep this addendum as the continuity anchor and track implementation detail in the new Story 3.2 design plan.
