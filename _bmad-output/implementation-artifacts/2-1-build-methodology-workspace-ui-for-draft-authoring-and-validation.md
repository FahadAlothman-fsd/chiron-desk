# Story 2.1: Establish Methodology Catalog, Details, and Version Entry Foundation

Status: done

## Story

As an operator,
I want to browse and create methodologies, then navigate into methodology versions and draft entry points,
so that I can reliably reach the correct version workspace without using raw API calls.

## Acceptance Criteria

1. **Given** I open the methodologies page in Epic 2 **When** the page loads **Then** I can view a deterministic list of available methodologies with basic state summary **And** I can open a selected methodology details view from that list.
2. **Given** I am on the methodologies page **When** I create a new methodology **Then** the methodology is persisted through Epic 1 backend endpoints **And** it appears in the list deterministically after refresh.
3. **Given** I open a methodology details view **When** details are rendered **Then** I can view methodology metadata and available versions **And** I can navigate from details to version-specific draft entry.
4. **Given** I am viewing methodology versions for a methodology **When** I create a draft version or open an existing draft **Then** the UI persists the draft-version action through Epic 1 backend endpoints **And** routes me to the methodology version workspace.
5. **Given** I navigate between methodologies, details, versions, and workspace entry points **When** I use links, breadcrumbs, or back navigation **Then** navigation remains deterministic and keyboard-accessible **And** selected methodology and version context is preserved across route transitions.
6. **Given** methodology and version setup capabilities are visible in Epic 2 foundation views **When** I inspect available execution actions **Then** runtime execution controls remain visible but disabled with rationale (`Workflow runtime execution unlocks in Epic 3+`) **And** the foundation flow focuses on setup and workspace entry, not runtime execution.

## Tasks / Subtasks

- [x] Implement methodology catalog route and deterministic loading shell (AC: 1)
  - [x] Define explicit route paths for foundation flow: `/methodologies`, `/methodologies/:methodologyId`, `/methodologies/:methodologyId/versions`, `/methodologies/:methodologyId/versions/:versionId`
  - [x] Add route/screen composition in existing `apps/web/src/routes` patterns for methodology catalog entry
  - [x] Render explicit deterministic state semantics (`normal`, `loading`, `blocked`, `failed`, `success`) with text labels and no color-only signaling
  - [x] Fetch and render methodology list with basic state summary and deterministic ordering from Epic 1 contract-backed endpoints
- [x] Implement methodology creation flow from catalog (AC: 2)
  - [x] Wire create action through existing typed oRPC client path (no ad hoc endpoints)
  - [x] Invalidate/refetch relevant TanStack Query keys so post-create refresh is deterministic
  - [x] Preserve keyboard-accessible action flow and deterministic error handling
- [x] Implement methodology details and versions entry flow (AC: 3, 4)
  - [x] Build details view showing methodology metadata and available versions
  - [x] Add draft version create action that persists through Epic 1 backend contracts
  - [x] Add open-existing-draft action and route handoff into version workspace entry
  - [x] Route to version workspace entry point with selected methodology/version context preserved
- [x] Implement deterministic navigation and context preservation (AC: 5)
  - [x] Add links/breadcrumb/back-navigation behavior that preserves selected methodology/version context
  - [x] Ensure keyboard-accessible navigation parity with pointer interactions
  - [x] Add deterministic route state recovery for refresh and direct-link entry where applicable
- [x] Keep runtime controls visible-but-disabled in Epic 2 foundation views (AC: 6)
  - [x] Render runtime execution controls as disabled with explicit rationale copy (`Workflow runtime execution unlocks in Epic 3+`)
  - [x] Prevent runtime action dispatch from Story 2.1 surfaces while preserving setup/navigation usability
- [x] Testing and quality gates
  - [x] Unit test AC1 deterministic list rendering from equivalent inputs
  - [x] Unit test AC2 methodology creation flow and deterministic list refresh
  - [x] Unit test AC3 methodology details rendering and versions visibility
  - [x] Unit test AC4 create-draft and open-existing-draft route handoff behavior
  - [x] Unit test AC5 navigation context preservation and keyboard navigation parity on critical path
  - [x] Unit test AC6 disabled runtime control semantics with exact rationale copy rendering
  - [x] Integration/component test create-methodology and create/open-draft flows with deterministic refresh behavior (AC2, AC4)
  - [x] Run `bun check`, `bun check-types`, and targeted `bun run test` suites before handoff

## Dev Notes

### Developer Context Section

- This story was regenerated after approved Epic 2 course correction and now owns catalog/details/version-entry foundation only.
- Deep methodology workspace authoring with React Flow is Story 2.2 scope; validation/publish hardening is Story 2.3 scope.
- Story 2.1 must establish deterministic operator journey: `methodologies -> methodology -> versions -> version workspace`.

### Technical Requirements

- Use typed API interactions through existing oRPC contracts and TanStack Query utilities in `apps/web/src/utils/orpc.ts`.
- Reuse existing methodology router endpoints and contract types from `packages/api/src/routers/methodology.ts` and `packages/contracts/src/methodology/*`.
- Required endpoint classes for this story: methodology catalog list/create, methodology details/get, versions list, and draft version create/open entry endpoints in the existing methodology router surface.
- For deterministic reload after mutations, apply targeted query invalidation/refetch in mutation lifecycle (`onSuccess`/`onSettled`) and avoid stale-cache drift.
- Keep runtime execution disabled in Epic 2 UI foundation surfaces; no runtime execution orchestration in this story.

### Deterministic Semantics

- Deterministic list ordering: same response data yields same row order and same selected item behavior.
- Deterministic refresh: post-mutation invalidation/refetch removes stale-cache divergence and reflects persisted server state.
- Deterministic navigation: URL and selected methodology/version context survive refresh, back/forward, and direct-link entry.

### Methodology List Basic State Summary

- `methodologyKey`
- `displayName`
- version-state summary (at minimum: has draft and available versions)
- recency metadata used by the chosen deterministic sort/display pattern

### Architecture Compliance

- Respect locked stack and boundaries: Bun, TypeScript strict, React 19, TanStack Router/Query, Hono/oRPC, Effect-oriented service boundaries.
- UI composes contract-backed services only; do not bypass backend policy/service boundaries with frontend business logic.
- Preserve deterministic diagnostics and append-only evidence framing from PRD/architecture even when Story 2.1 is primarily setup/navigation focused.
- Do not introduce switch-based step dispatch or other patterns explicitly marked as anti-patterns in project context.

### Library and Framework Requirements

- TanStack Router: follow route patterns in `apps/web/src/routes` and route context usage for `orpc` and `queryClient`.
- TanStack Query v5: use explicit mutation lifecycle and query invalidation/refetch for deterministic server-state sync.
- React 19: keep form and mutation status handling explicit and accessible.
- Command palette foundation direction for keyboard parity: use shadcn `Command` (cmdk-based) from the `@shadcn` registry and integrate with `@tanstack/react-hotkeys` so command-path and visible-control actions stay equivalent.
- `@xyflow/react` is installed but deep graph authoring usage belongs to Story 2.2, not Story 2.1.

### Command Palette Presentation and Load Control

- Presentation: open as centered command dialog (`Cmd/Ctrl+K`) with clear placeholder (`Navigate, create, or open methodology...`), compact list density, grouped sections, and visible shortcut hints.
- Initial scope for Story 2.1: navigation and setup only (`Go to Methodologies`, `Open Methodology`, `Open Versions`, `Create Methodology`, `Create Draft`, `Open Existing Draft`); no runtime execution commands.
- Anti-overload defaults: show top context-relevant commands first, cap visible results (`<= 20` total, `<= 8` per group), and require search input before showing long-tail actions.
- Information architecture: group by `Navigate`, `Create`, `Open`, and `System`; pin current-context actions at top and move low-frequency actions behind search.
- Validity parity rule: every command action must map to an equivalent visible control and enforce identical disabled/validation logic.
- Disabled-state clarity: when a command is unavailable, render it disabled with explicit rationale text (including runtime-deferred rationale for Epic 2).

### Command Palette v1 Taxonomy (Story 2.1)

| Command ID | Label | Group | Default Shortcut | Availability Context | Outcome | Disabled Rationale (if blocked) | Visible Control Parity |
|---|---|---|---|---|---|---|---|
| CMD-NAV-METHODOLOGIES | Go to Methodologies | Navigate | `g m` | global | route to `/methodologies` | n/a | left nav `Methodologies` link |
| CMD-NAV-METHODOLOGY-DETAILS | Open Methodology Details | Open | `g d` | methodology selected or searchable result | route to `/methodologies/:methodologyId` | `Select a methodology first` | methodology row/details link |
| CMD-NAV-VERSIONS | Open Methodology Versions | Open | `g v` | methodology selected or searchable result | route to `/methodologies/:methodologyId/versions` | `Select a methodology first` | versions navigation action |
| CMD-CREATE-METHODOLOGY | Create Methodology | Create | `c m` | global | open create-methodology flow and persist through typed endpoint | `Methodology creation is temporarily unavailable` | create methodology button/modal trigger |
| CMD-CREATE-DRAFT | Create Draft Version | Create | `c d` | methodology details/versions context | create draft version and route to `/methodologies/:methodologyId/versions/:versionId` | `Open a methodology version context first` | create draft button |
| CMD-OPEN-DRAFT | Open Existing Draft | Open | `o d` | methodology has draft version | route to existing draft version workspace entry | `No draft version exists for this methodology` | open draft action in versions list |
| CMD-SYS-RUNTIME-DEFERRED | Runtime Execution (Epic 3+) | System | none | visible in all Epic 2 foundation contexts | no-op (intentionally disabled) | `Workflow runtime execution unlocks in Epic 3+` | disabled runtime control with same copy |

### Command Palette Result Ordering and Limits

- Ranking order: `context-exact` > `recently-used` > `group-priority` > `text-match score` > `alphabetical tie-break`.
- Group priority for Story 2.1: `Open` then `Navigate` then `Create` then `System`.
- Hard limits: show up to `20` results total and up to `8` per group before refinement.
- Refinement rule: after `2+` typed characters, expand eligible results while preserving ranking and hard limits.
- Noise control: hide `System` group by default unless search matches it or user arrow-navigates past available primary actions.

### Command Palette Interaction Rules

- Open/close: `Cmd/Ctrl+K` toggles; `Esc` closes and returns focus to prior control.
- Enter behavior: `Enter` triggers highlighted command if enabled; if disabled, keep focus and show inline rationale.
- Navigation: Arrow keys move highlight; `Tab` cycles group boundaries; mouse hover cannot override keyboard-highlighted selection state.
- Focus safety: on route changes initiated by command palette, move focus to primary heading/action region of destination view.
- Analytics-ready event names (optional implementation detail): `command_palette_opened`, `command_executed`, `command_blocked`.

### File Structure Requirements

- Place Story 2.1 route/screen work under existing web route/component organization in `apps/web/src`.
- Keep contract usage via shared packages (`@chiron/contracts`, API router clients) and existing client utility boundaries.
- Co-locate tests with implemented route/components where current repo conventions apply.
- Do not edit generated route tree outputs directly.

### Testing Requirements

- Unit tests:
  - deterministic list/details rendering from equivalent inputs
  - navigation context preservation across route transitions and refresh
  - runtime-control visible-but-disabled semantics with rationale copy
- Integration/component tests:
  - methodology creation flow and deterministic list refresh
  - draft version create/open actions and route handoff into version workspace entry
  - keyboard-accessible navigation parity checks on critical path
- Verification commands:
  - `bun check`
  - `bun check-types`
  - `bun run test` (targeted suites for methodology catalog/details/version entry)

### Traceability Matrix

| AC | Description | Primary Tasks | Tests | Coverage |
|---|---|---|---|---|
| AC-01 | Deterministic methodology list + open details | catalog route shell, deterministic state rendering, list summary rendering | unit: deterministic list rendering | FULL |
| AC-02 | Create methodology + deterministic refresh | create flow via typed oRPC, mutation invalidation/refetch | helper/unit coverage + web integration/component command-flow test | FULL |
| AC-03 | Methodology details + versions visibility | details screen, versions rendering | unit: details + versions visibility | FULL |
| AC-04 | Create/open draft + route to version workspace | draft create action, open-existing-draft action, route handoff | helper/unit coverage + web integration/component command-flow test | FULL |
| AC-05 | Deterministic keyboard-accessible navigation with preserved context | links/breadcrumb/back behavior, route recovery, command/visible parity | helper/unit coverage + keyboard group-cycling integration check | FULL |
| AC-06 | Runtime controls visible-but-disabled with rationale | disabled runtime controls, blocked action dispatch | unit: disabled runtime controls with exact rationale copy | FULL |

### Agent Implementation Guardrails (Do / Don't)

- Do: limit Story 2.1 changes to catalog/details/version-entry foundation surfaces and supporting shared client wiring.
- Do: use existing contract-backed methodology endpoints and shared contract types.
- Do: keep command palette action set small and context-aware for this story.
- Don't: implement deep React Flow authoring (Story 2.2 scope).
- Don't: implement publish/validation hardening (Story 2.3 scope).
- Don't: introduce runtime execution behavior or hidden bypass actions in command or visible UI paths.

### Previous Story Intelligence

- Not applicable for Epic 2 story progression. This is the first Epic 2 implementation story.

### Latest Tech Information

- `@xyflow/react` stable line is `12.x` (recent stable observed as `12.10.1`); Story 2.1 should not pull graph-authoring scope forward.
- TanStack Query `v5` guidance emphasizes explicit mutation invalidation/refetch patterns for deterministic reload behavior.
- React 19 provides `useActionState`/`useFormStatus` primitives, but controlled explicit mutation/status handling aligned to existing app patterns remains the safer path for this story.

### Project Structure Notes

- This is a Turborepo monorepo; Story 2.1 implementation lives primarily in `apps/web` while consuming shared contracts and router APIs.
- Existing methodology API routes already expose draft create/validate/publish/pin/eligibility operations; Story 2.1 should consume these instead of introducing parallel APIs.

### References

- `_bmad-output/planning-artifacts/epics.md` (Epic 2 Story 2.1 corrected scope and ACs)
- `_bmad-output/planning-artifacts/archive/2026-02-reset/legacy-planning/sprint-change-proposal-2026-02-28.md` (course correction rationale and sequencing)
- `_bmad-output/planning-artifacts/architecture.md` (locked architecture and module boundaries)
- `_bmad-output/planning-artifacts/prd.md` (product model and journey constraints)
- `_bmad-output/planning-artifacts/ux-design-specification.md` (state semantics, navigation/accessibility expectations)
- `_bmad-output/project-context.md` (implementation guardrails and anti-pattern constraints)
- `packages/api/src/routers/methodology.ts` (existing methodology endpoints)
- `packages/contracts/src/methodology/version.ts` (validation/contract structures)
- `https://reactflow.dev/`
- `https://tanstack.com/query/latest`
- `https://react.dev/reference/react/useActionState`

### Project Context Reference

- Read and apply `_bmad-output/project-context.md` before implementation.
- Maintain Epic 2 deferment boundary for runtime execution unlocks.

### Story Completion Status

- Story regenerated from corrected Epic 2 sequencing with stale pre-correction scope removed.
- Status is `review`.

## Dev Agent Record

### Agent Model Used

openai/gpt-5.3-codex

### Debug Log References

- Implemented backend catalog/details/version-list endpoints via methodology repository/service/router expansion.
- Implemented Epic 2 foundation routes for catalog/details/versions/workspace entry and deterministic navigation patterns.
- Executed verification commands: `bun check`, `bun check-types`, `bun --filter @chiron/api test src/routers/methodology.test.ts`, `bun test src/features/methodologies/foundation.test.ts`.
- Added global methodology command palette (`Cmd/Ctrl+K`) at layout level with grouped Story 2.1 command taxonomy and command/visible-control parity wiring.
- Added deterministic command helper module and tests for command IDs, ranking/limits, search-to-methodology resolution, and draft-input generation.
- Added web integration/component tests for command-driven create/open flows and deterministic mutation invalidation behavior in methodology command palette.
- Replaced broad methodology-route cache invalidations with targeted query-key invalidations for deterministic post-mutation refresh.
- Reduced methodology router type assertions by passing typed payload objects to service handlers where contract shapes align.
- Executed verification commands: `bun test src/features/methodologies/foundation.test.ts src/features/methodologies/commands.test.ts`, `bun --filter @chiron/api test src/routers/methodology.test.ts`.
- Executed verification commands: `bun run test`, `bun test src/features/methodologies/foundation.test.ts src/features/methodologies/commands.test.ts src/features/methodologies/command-palette-navigation.test.ts`.
- Refined login experience using shadcn-oriented form composition with appendix-driven assets and Chiron token styling in `apps/web/src/routes/login.tsx`.
- Fixed Base UI dropdown runtime issue in `apps/web/src/components/nav-user.tsx` by restoring required menu-group context usage.
- Switched methodology creation entry from inline panel to dialog workflow in `apps/web/src/routes/methodologies.tsx`.
- Fixed nested route rendering by returning `<Outlet />` from parent methodologies route when child methodology/version paths are active.
- Added deterministic story-scoped seed tooling for Story 2.1 (`db:seed:story`) and validated reset + seed run path.
- Executed additional verification commands: `bun --filter @chiron/scripts test`, `bun run db:seed:story -- --story=2-1`, `bun run db:seed:story:reset -- --story=2-1`.

### Completion Notes List

- Added methodology catalog/details/version-list query surface and deterministic summaries in API/service/repository layers.
- Added web foundation flow routes for `methodologies -> methodology -> versions -> version workspace` with keyboard-accessible links/breadcrumbs.
- Added global command palette and hotkey flow for Story 2.1 navigation/setup actions with disabled-state rationale parity.
- Added disabled runtime execution controls with exact rationale copy across Epic 2 foundation views.
- Added deterministic helper tests in web plus integration-style API router tests for list/details/versions and create/open draft contract behavior.
- Added command helper tests covering command taxonomy, ordering/visibility, and deterministic create-draft payload generation.
- Added command palette group-boundary cycling helper tests and implemented focus handoff to primary destination region after command-triggered navigation.
- Added command-palette integration/component tests covering create-methodology, create/open-draft flows, deterministic invalidation, and keyboard group cycling.
- Updated login route visual treatment to align with appendix assets (`3D Pixel` + `Bitmap Dreams`) and Chiron token system while preserving non-gradient Bloomberg-terminal direction.
- Converted methodology creation flow to dialog-based interaction to reduce persistent layout noise on catalog screen.
- Added deterministic story seed fixtures + runner for Story 2.1 including operator auth user and catalog/details/version test data.
- `bun check` remains formatting-sensitive in broader workspace; targeted API/web tests and scripts-package tests pass; `bun check-types` remains blocked by pre-existing `packages/methodology-engine` diagnostics requiring `evidenceRef` fields.

### File List

- `_bmad-output/implementation-artifacts/2-1-build-methodology-workspace-ui-for-draft-authoring-and-validation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/package.json`
- `apps/web/vitest.config.ts`
- `apps/web/src/components/app-shell.tsx`
- `apps/web/src/components/app-sidebar.tsx`
- `apps/web/src/components/nav-main.tsx`
- `apps/web/src/components/nav-projects.tsx`
- `apps/web/src/components/nav-secondary.tsx`
- `apps/web/src/components/ui/command.tsx`
- `apps/web/src/components/nav-user.tsx`
- `apps/web/src/components/login-form.tsx`
- `apps/web/src/features/methodologies/command-palette.tsx`
- `apps/web/src/features/methodologies/command-palette.integration.test.tsx`
- `apps/web/src/features/methodologies/command-palette-navigation.ts`
- `apps/web/src/features/methodologies/command-palette-navigation.test.ts`
- `apps/web/src/features/methodologies/commands.ts`
- `apps/web/src/features/methodologies/commands.test.ts`
- `apps/web/src/features/methodologies/foundation.ts`
- `apps/web/src/features/methodologies/foundation.test.ts`
- `apps/web/src/routes/login.tsx`
- `apps/web/src/routes/methodologies.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- `apps/web/src/routeTree.gen.ts`
- `apps/web/src/test/setup.ts`
- `apps/web/public/visuals/login/appendix/softulka-shape-large-01.svg`
- `apps/web/public/visuals/login/appendix/softulka-shape-simple-10.svg`
- `apps/web/public/visuals/login/appendix/vanzyst-asset-35.svg`
- `packages/api/src/routers/methodology.ts`
- `packages/api/src/routers/methodology.test.ts`
- `packages/db/src/methodology-repository.ts`
- `packages/methodology-engine/src/repository.ts`
- `packages/methodology-engine/src/version-service.ts`
- `packages/scripts/src/story-seed-fixtures.ts`
- `packages/scripts/src/story-seed.mjs`
- `packages/scripts/src/__tests__/story-seed-fixtures.test.ts`
- `packages/scripts/package.json`
- `bun.lock`
- `package.json`
- `turbo.json`
