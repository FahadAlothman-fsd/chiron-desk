# Story 2.5: Provide Project Creation and Methodology Pinning UX with Pin Lineage Visibility

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator,
I want to create a project from the UI by selecting a methodology card and an exact published version scoped to that methodology via autocomplete, and view both current and historical pin lineage,
so that project pinning is reproducible by default and any version change is allowed only through an explicit, auditable repin action governed by policy.

## Acceptance Criteria

1. [UI Selection] Project setup renders methodologies as selectable cards; each card shows a deterministic identity avatar assignment (index mapping: `0->asset-07`, `1->asset-11`, `2->asset-26`, `3->asset-41`, then cycle), and selecting a card activates that methodology with version autocomplete limited to published versions of that methodology and latest preselected by deterministic ordering.
2. [Create + Pin Persistence] On successful create, the system persists the exact pinned methodology version and the UI shows active methodology, pinned version, and pin metadata.
3. [Scope Boundary] Methodology-defined setup fact capture (including `project.deliveryMode`) is deferred to `WU.SETUP` workflow `setup-project` in Epic 3; Story 2.5 does not hardcode or persist setup facts outside methodology workflow execution.
4. [No Implicit Repin] Publishing a newer version never changes an existing project pin automatically; UI continues showing the current pinned version until explicit repin.
5. [Repin Success Path] Repin is allowed only when no persisted execution history exists; successful repin updates active pin resolution and appends lineage with `actor`, `timestamp`, `previousVersion`, `newVersion`.
6. [Repin Block Path] If persisted execution history exists, repin is blocked deterministically and UI diagnostics clearly explain block reason and next action.
7. [Repin UX Flow] Repin interaction is methodology-first then version selection, and version autocomplete is constrained to selected methodology with latest preselected unless changed.
8. [Invalid/Incompatible Target Handling] Pin/repin attempts targeting non-existent or incompatible versions are deterministically rejected, return actionable diagnostics, and do not corrupt local UI state.
9. [Empty-Version Methodology] If a selected methodology has no published versions, create/repin actions remain blocked and UI shows actionable guidance to publish an eligible version first.
10. [Transport Failure Resilience] On network/transport errors during create/pin/repin, UI preserves user selections, surfaces deterministic failure diagnostics, and does not mutate local pin/lineage state.
11. [Epic Boundary] Runtime execution controls remain visible but disabled in Epic 2 and display exact rationale: `Workflow runtime execution unlocks in Epic 3+`; pinning and lineage views stay fully usable.

## Tasks / Subtasks

- [x] Build project CRUD and create-and-pin route surfaces (AC: 1, 2, 3, 9, 11)
  - [x] Add project routes for list/create and project details (`apps/web/src/routes/projects.tsx`, `apps/web/src/routes/projects.$projectId.tsx`) and keep methodology routes authoring-only.
  - [x] Implement methodology-card selector with methodology-scoped version autocomplete and deterministic latest preselection.
  - [x] Add temporary avatar mapping for cards (`asset-07`, `asset-11`, `asset-26`, `asset-41`) using deterministic cyclic index mapping on the ordered methodology list.
  - [x] Ensure selected methodology with no published versions blocks create action with actionable guidance.
- [x] Implement create, pin, and repin integration on backend-authoritative contracts (AC: 2, 4, 5, 6, 7, 8)
  - [x] Reuse existing pin/repin/lineage procedures and diagnostics envelope from Story 1.5 contracts and services.
  - [x] Preserve no-implicit-repin behavior and enforce execution-history repin lock with policy diagnostics.
  - [x] Keep authenticated mutation path and actor attribution for lineage evidence.
  - [x] Handle invalid or incompatible version failures deterministically without local state corruption.
- [x] Implement project pin lineage and diagnostics rendering (AC: 2, 5, 6, 8, 10)
  - [x] Render current pin metadata and historical lineage entries from persisted backend responses only.
  - [x] Render blocked or failed diagnostics with stable fields (`code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, `evidenceRef`).
  - [x] Preserve local selections and existing visible state on transport failures and unauthorized-session outcomes.
- [x] Preserve epic boundary and setup ownership semantics (AC: 3, 11)
  - [x] Do not add hardcoded setup-fact writes (`project.deliveryMode`) in Story 2.5.
  - [x] Keep runtime controls visible but disabled with exact copy `Workflow runtime execution unlocks in Epic 3+`.
  - [x] Keep setup-fact ownership deferred to Epic 3 `WU.SETUP` workflow `setup-project`.
- [x] Validate and test complete flow (AC: 1-11)
  - [x] Add co-located web tests for card selection, version scoping, deterministic avatar mapping, and create/pin or repin outcomes.
  - [x] Add API tests for project CRUD surfaces and authenticated pin or repin behavior.
  - [x] Run `bun check`, `bun check-types`, and targeted `bun run test` scopes for touched modules.

## Dev Notes

### Developer Context Section

- Story 1.5 already implemented canonical pinning semantics in backend layers (`packages/db/src/schema/project.ts`, `packages/db/src/methodology-repository.ts`, `packages/methodology-engine/src/version-service.ts`, `packages/api/src/routers/methodology.ts`); Story 2.5 must consume and surface these behaviors, not recreate them.
- Treat `project_methodology_pins` as the active pointer and `project_methodology_pin_events` as append-only lineage; UI must present both current pin state and historical transitions exactly as returned by existing APIs.
- Keep architecture boundaries strict: `apps/web` handles interaction and presentation, `packages/api` remains transport and composition, and domain policy stays in engine and repository layers (no policy duplication in routes or components).
- Preserve transport and auth semantics: pin and repin flows must execute through authenticated procedures so actor attribution remains authoritative for lineage and audit evidence.
- Keep setup ownership explicit: methodology-defined setup facts (including `project.deliveryMode`) are owned by `WU.SETUP` workflow `setup-project` and are out of Story 2.5 write scope.
- Use existing deterministic diagnostics contract (`code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, `evidenceRef`) for blocked and failed pin and repin UX states; avoid introducing alternate diagnostic shapes.
- Preserve repin policy lock behavior for execution-bearing projects as authoritative backend policy; UI should explain the lock and next step without mutating local pin or lineage state.
- Reuse established Story 2.4 UI conventions: deterministic state labels (`loading|blocked|failed|success`), stable mutation and invalidation patterns, and exact Epic boundary copy `Workflow runtime execution unlocks in Epic 3+` with runtime controls visible but disabled.

### Technical Requirements

- Depend on existing backend pinning contracts from Story 1.5 (`pinProjectMethodologyVersion`, `repinProjectMethodologyVersion`, `getProjectPinLineage`) as the sole source of truth for pin, repin policy, and lineage behavior.
- Implement project creation and pinning UI as a deterministic chain: methodology card selection -> methodology-scoped version autocomplete -> deterministic latest default -> create+pin mutation -> active pin confirmation.
- Add hardcoded identity-layer avatar mapping for methodology cards in this story (`asset-07`, `asset-11`, `asset-26`, `asset-41`) using index-based cyclic assignment; this is temporary visual identity only and not persisted methodology metadata.
- Define deterministic latest-version selection rule explicitly (for example: newest published timestamp with stable tiebreak) and apply it consistently across create and repin flows.
- Keep repin flow dependency order explicit: methodology selection -> scoped version selection -> repin mutation -> either lineage append (success) or deterministic policy diagnostics (blocked or failed).
- Preserve authenticated mutation paths for create+pin and repin so actor attribution remains authoritative in lineage evidence; handle expired or unauthorized sessions with deterministic blocked or failed UX state and no local state mutation.
- Populate current and historical pin displays from existing active-pin and lineage APIs; do not derive or synthesize lineage client-side.
- Enforce no-implicit-repin behavior in UI and cache handling: newly published methodology versions do not mutate project pin state without explicit repin success.
- Handle stale-selection edge cases deterministically: if selected version becomes invalid or incompatible before submit, mutation result must surface actionable diagnostics and preserve local selection for correction.
- Handle concurrent repin attempts deterministically (same project): only persisted authoritative outcome is shown after refetch, and UI does not present mixed or duplicated lineage state.
- Defer methodology-defined setup fact persistence (`project.deliveryMode` and related setup facts) to Epic 3 `WU.SETUP` workflow `setup-project`; Story 2.5 must not introduce hardcoded setup-fact writes.
- Reuse Story 2.4 deterministic UX conventions (`State: loading|blocked|failed|success`) and keep runtime execution controls visible-but-disabled with exact copy `Workflow runtime execution unlocks in Epic 3+`.
- Ensure transport-failure resilience: preserve local selections and displayed pin and lineage state on errors while surfacing actionable diagnostics.
- Keep outputs Story 2.6-ready by exposing stable, queryable pin state and lineage surfaces without introducing new authoring or validation rule systems.

### Architecture Compliance

- Preserve dependency direction and package boundaries: shared schemas and contracts in `packages/contracts`, persistence in `packages/db`, domain policy in `packages/methodology-engine`, and transport composition in `packages/api`.
- Implement Story 2.5 as frontend integration over backend-authoritative policy: consume existing pin, repin, and lineage contracts without duplicating policy logic in web routes or components.
- Treat `packages/api` as a transport boundary only; keep repin lock, compatibility checks, and lineage authority in engine and repository layers.
- Preserve existing persistence authority for this story: use current active pin pointer (`project_methodology_pins`) and append-only lineage (`project_methodology_pin_events`) with deterministic ordering; do not introduce alternate pin or lineage stores in Story 2.5.
- Maintain authenticated mutation requirements for pin and repin flows so lineage actor attribution remains authoritative and auditable.
- Continue deterministic diagnostics propagation from service and repository contracts to UI surfaces without schema drift from the existing diagnostic envelope.
- Ensure UI state authority rules: after pin or repin mutation and refetch, rendered active pin and lineage must reflect persisted backend state only (no client-synthesized lineage or inferred pin swaps).
- Limit Story 2.5 additions to UI and query integration needed for create-and-pin, repin, and lineage visibility; do not add new domain-policy branches in this story.
- Enforce Epic boundary integrity: keep runtime execution controls visible-but-disabled in Epic 2, and defer methodology-defined setup-fact writes (including `project.deliveryMode`) to Epic 3 `WU.SETUP` workflow `setup-project`.

### Library and Framework Requirements

- Build web surfaces with the existing React 19 + TanStack Router stack in `apps/web` and follow current route/module patterns; avoid introducing alternate routing or state frameworks.
- Use TanStack Query (`@tanstack/react-query`) with existing oRPC integration (`@orpc/client`, `@orpc/tanstack-query`) for all project pin, repin, and lineage data flows.
- Keep API exposure on existing oRPC/Hono boundaries (`@orpc/server`, `hono`) and reuse current protected-procedure semantics for authenticated pin and repin operations.
- Preserve Effect-first domain and repository behavior (`effect` in engine and db packages); do not bypass service-layer diagnostics or policy checks from UI-specific shortcuts.
- For frontend async and error-handling ergonomics in Story 2.5, use existing `better-result` patterns already present in web methodology features instead of introducing Effect runtime on UI surfaces.
- Preserve SQLite + Drizzle persistence path (`drizzle-orm` on `@chiron/db`) and consume current pin and lineage stores instead of introducing new persistence dependencies.
- Reuse existing UI component stack already present in `apps/web` (`@base-ui/react`, Tailwind CSS v4 conventions, existing workspace shell/components); do not add a second component system.
- Use local static SVG assets from the approved Bitmap appendix set via `apps/web/public/visuals/methodologies/avatars/` and serve by stable public paths; do not reference external filesystem paths at runtime.
- Keep avatar assignment deterministic by applying index mapping to the already deterministic ordered methodology list and cycling `[asset-07, asset-11, asset-26, asset-41]`.
- Treat methodology card avatars as decorative presentation only (`alt=""`) so card text remains the accessible selection label and focus target.
- Scope avatar behavior to Story 2.5 as temporary fixed visual identity seeds (non-persisted, non-contract metadata) until methodology or agent avatar selection is introduced later.
- Keep dependency additions minimal for Story 2.5; prefer existing workspace libraries and patterns over adding new third-party packages.

### File Structure Requirements

- Primary implementation surface for Story 2.5 should be project CRUD routes, not methodology authoring routes: create `apps/web/src/routes/projects.tsx` for project list/create and `apps/web/src/routes/projects.$projectId.tsx` for project pinning details.
- Keep methodology design-time routes (`apps/web/src/routes/methodologies*.tsx`) as authoring surfaces; do not embed project CRUD or project pinning UI there.
- If selector complexity grows, extract UI-only helpers into `apps/web/src/features/projects/` (for example, `card-avatar-map.ts`) while keeping route orchestration in project route files.
- Copy fixed avatar SVGs into repo-local static assets at `apps/web/public/visuals/methodologies/avatars/` using exact names: `asset-07.svg`, `asset-11.svg`, `asset-26.svg`, `asset-41.svg`.
- Reference avatars via stable public URLs (for example `/visuals/methodologies/avatars/asset-07.svg`); do not reference external filesystem paths at runtime.
- Keep deterministic ordering as the dependency root: apply avatar index mapping only to the ordered methodology options rendered in project create and project settings pin selectors.
- Keep pin and lineage contract usage on existing backend surfaces only:
  - `packages/api/src/routers/methodology.ts`
  - `packages/methodology-engine/src/version-service.ts`
  - `packages/db/src/methodology-repository.ts`
  - `packages/db/src/schema/project.ts`
- Add project-facing transport surfaces under `packages/api/src/routers/project.ts` and register them in `packages/api/src/routers/index.ts` so UI can create/list/read projects while reusing existing pin and lineage contracts.
- Do not introduce new project fact persistence files in Story 2.5; setup-fact writes remain deferred to Epic 3 `WU.SETUP` workflow scope.
- Keep tests co-located with touched files (for example, project route/component tests under `apps/web/src/...`) and include deterministic avatar-mapping verification against ordered methodology lists.
- Avoid editing generated artifacts or creating parallel contract copies; extend existing modules only where necessary.

### Testing Requirements

- Add web unit or component tests for project-create methodology card selection, scoped version autocomplete behavior, and deterministic latest-version preselection.
- Add deterministic avatar-mapping tests proving ordered methodology indices map cyclically to `[asset-07, asset-11, asset-26, asset-41]` and remain stable across equivalent inputs.
- Add integration tests for create and pin happy path: project create succeeds, exact pinned version persists, and active pin metadata renders correctly in UI.
- Add integration tests for repin success and repin block policy paths using existing diagnostics contract assertions (`code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, `evidenceRef`).
- Add failure-path tests for invalid or incompatible version selection, empty-version methodology selection, transport failure resilience, and unauthorized-session handling with no local state corruption.
- Add API-level tests for any new project router surfaces (`create`, `list`, `details`) and verify pin or repin mutations stay authenticated while lineage actor attribution remains preserved.
- Add regression tests or assertions that newly published methodology versions do not implicitly repin existing projects.
- Verify runtime controls remain visible but disabled with exact copy `Workflow runtime execution unlocks in Epic 3+` on project pinning surfaces.
- Keep test files co-located with touched modules (`apps/web/src/routes/projects*.test.tsx`, API router tests, and existing engine or repository test suites where behavior is extended).
- Run and pass: `bun check`, `bun check-types`, and targeted `bun run test` scopes for touched web/API/engine/db modules before marking story ready.
- Epic 2 verification baseline: automated unit and integration coverage plus manual deterministic UX walkthrough; full Playwright runtime execution scenarios remain Epic 3+.

### Previous Story Intelligence

- Story 1.5 already implemented canonical backend pinning behavior (active pointer + append-only lineage + execution-history repin lock + deterministic diagnostics); Story 2.5 must reuse these contracts and not duplicate policy in UI.
- Story 2.4 established deterministic UX semantics (`State: loading|blocked|failed|success`), stable mutation and invalidation patterns, and exact Epic boundary runtime copy; preserve these unchanged on project routes.
- Route ownership correction from current analysis is authoritative: Story 2.5 implementation surfaces are project CRUD and operator routes (`projects` routes), not methodology authoring routes.
- Story 2.5 may add project-facing transport surfaces for project CRUD and read models, but pin and repin policy authority remains in existing backend pinning contracts and services.
- Epic boundary remains strict: setup-fact persistence (including `project.deliveryMode`) is deferred to Epic 3 `WU.SETUP` workflow `setup-project`; Story 2.5 must not add hardcoded setup-fact writes.
- Maintain no-implicit-repin guarantees and execution-history repin lock behavior as inherited invariants from prior stories.
- Preserve diagnostics contract fidelity end-to-end (`code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, `evidenceRef`) and avoid alternate UI-specific diagnostic schemas.
- Keep avatar behavior as temporary presentation-only identity seeds (index-mapped Bitmap assets), non-persisted and non-contract metadata until later avatar-selection stories.
- Continue extending existing module flow (`contracts -> db -> engine -> api -> web`) with co-located tests, avoiding parallel abstractions or duplicate contract files.

### Git Intelligence Summary

- Recent feature-story commits (`feat(methodologies)`) consistently deliver vertical slices across `contracts -> db -> engine -> api -> web`, with paired story artifact and sprint-status updates.
- Prior story hardening commits for 2.3 and 2.4 demonstrate expected quality bar: deterministic diagnostics behavior, route-level integration tests, and persistence edge-case coverage.
- Repository history separates docs-only planning commits (`docs(story-*)`) from implementation commits; keep Story 2.5 guidance aligned with that style.
- Large BMAD framework update commits (`chore: bmad update`) are infrastructural and should not change Story 2.5 implementation scope decisions.
- Practical pattern to preserve: extend existing modules and tests in-place, avoid parallel abstractions, and keep deterministic runtime-boundary copy stable (`Workflow runtime execution unlocks in Epic 3+`).

### Latest Tech Information

- Registry versions verified with Bun (`bun pm view`) for story-relevant libraries:
  - `@tanstack/react-query`: latest `5.90.21` (repo `^5.90.12` in `apps/web/package.json`)
  - `@tanstack/react-router`: latest `1.163.3` (repo `^1.141.1` in `apps/web/package.json`)
  - `@tanstack/react-form`: latest `1.28.3` (repo `^1.28.0` in `apps/web/package.json`)
  - `@tanstack/react-hotkeys`: latest `0.3.1` (repo uses catalog in `apps/web/package.json`, root pin `^0.3.0` in `package.json`)
  - `better-result`: latest `2.7.0` (repo `^2.7.0` in `apps/web/package.json`)
  - `@orpc/client|@orpc/server|@orpc/tanstack-query`: latest `1.13.6` (repo `^1.12.2` or catalog entries)
  - `hono`: latest `4.12.4` (repo `^4.8.2` / catalog)
  - `effect`: latest `3.19.19` (repo `^3.19.16` / catalog)
  - `drizzle-orm`: latest `0.45.1` (repo `^0.45.1`, already current)
  - `better-auth`: latest `1.5.2` (repo `^1.4.18` / catalog)
- `@xyflow/react`: latest `12.10.1` (repo `^12` / catalog)
- Story 2.5 should prioritize behavior delivery over dependency churn; no mandatory package upgrades are required to complete create, pin, repin, lineage, and avatar-card UX scope.
- Frontend async and try-catch ergonomics in Story 2.5 should prefer existing `better-result` usage patterns in web code, while `effect` remains the primary domain and backend orchestration model.
- If dependency updates are considered during implementation, prefer isolated follow-up changes and keep Story 2.5 focused on deterministic UX and contract integration.

### Project Context Reference

- Follow monorepo boundaries from project context: web interaction in `apps/web`, transport composition in `packages/api`, domain policy in `packages/methodology-engine`, persistence in `packages/db`, and shared schema contracts in `packages/contracts`.
- Preserve strict TypeScript and boundary decoding discipline; do not introduce `any`-style bypasses for project create or pinning flows.
- Reuse existing deterministic diagnostics and state conventions across project routes so operator-visible outcomes stay consistent with prior Epic 2 stories.
- Keep setup-fact ownership aligned with project context and epic sequencing: `WU.SETUP` workflow (`setup-project`) owns setup fact writes in Epic 3, not Story 2.5.
- Maintain co-located tests and run repository-standard verification commands (`bun check`, `bun check-types`, targeted `bun run test`) before implementation handoff completion.

### Story Completion Status

- Scope is locked: Story 2.5 covers project create, pin, and repin UX plus pin lineage visibility in Epic 2; setup-fact writes (including `project.deliveryMode`) are deferred to Epic 3 `WU.SETUP`.
- Required context is complete: epics, architecture, PRD, UX spec, project context, prior story intelligence, git history, and Bun-based version checks were incorporated.
- Handoff is complete: artifact remains `ready-for-dev` with implementation, structure, and testing guardrails for immediate `dev-story` execution.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming): place methodology card avatar SVGs under `apps/web/public/visuals/methodologies/avatars/` and consume them from project create/pin card rendering in `apps/web/src/routes/projects*.tsx`.
- Deterministic mapping rule: keep avatar assignment as index-based presentation utility (not database-backed, not part of methodology contract payloads).
- Accessibility contract for decorative avatars: render as decorative imagery (`alt=""`) while card text remains the accessible label for selection.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5: Provide Project Creation and Methodology Pinning UX with Pin Lineage Visibility]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.6: Provide Baseline Operator Visibility for Methodology Pin and Diagnostics State]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3: Runtime-Orchestrated Transition Execution]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architecture]
- [Source: _bmad-output/project-context.md#Technical Stack]
- [Source: _bmad-output/project-context.md#Rules]
- [Source: _bmad-output/project-context.md#Repository Layout]
- [Source: _bmad-output/planning-artifacts/chiron-terminology-glossary-v1.md#Thesis-Aligned Primitive Terms]
- [Source: _bmad-output/planning-artifacts/bmad-work-unit-catalog-v1-week6.md#WU.SETUP]
- [Source: _bmad-output/planning-artifacts/chiron-seed-workflow-definitions-v1.json#setup-project]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Asset Source Registry (Design Inputs)]
- [Source: _bmad-output/planning-artifacts/chiron-frontend-lock-v1-week6.md#Visual Asset Packs]
- [Source: packages/db/src/schema/project.ts]
- [Source: packages/db/src/methodology-repository.ts]
- [Source: packages/methodology-engine/src/version-service.ts]
- [Source: packages/api/src/routers/methodology.ts]
- [Source: apps/web/src/routes/methodologies.tsx]
- [Source: apps/web/src/components/nav-projects.tsx]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.3-codex

### Debug Log References

- `bun install`
- `bun run build` (apps/web, used to regenerate route tree)
- `bun run check`
- `bun run check-types`
- `bun run test --filter=@chiron/api`
- `bun run test src/routes/-projects.integration.test.tsx 'src/routes/-projects.$projectId.integration.test.tsx' src/features/projects/card-avatar-map.integration.test.tsx` (apps/web)
- `bun run test src/components/app-sidebar.integration.test.tsx src/components/app-shell.sidebar-sections.integration.test.tsx` (apps/web)
- `bun run test src/routes/-projects.integration.test.tsx src/routes/-projects.new.integration.test.tsx 'src/routes/-projects.$projectId.integration.test.tsx' src/components/app-sidebar.integration.test.tsx src/components/app-shell.sidebar-sections.integration.test.tsx src/features/projects/card-avatar-map.integration.test.tsx` (apps/web)
- `bun run test src/__tests__/story-seed-fixtures.test.ts` (packages/scripts)
- `bun run format && bun run check && bun run check-types`
- `bun run test -- src/routes/-projects.pinning-routing.integration.test.tsx` (apps/web)
- `bun run test -- src/routes/-projects.\$projectId.pinning.integration.test.tsx` (apps/web)
- `bun run test -- src/routes/-projects.integration.test.tsx src/routes/-projects.new.integration.test.tsx src/routes/-projects.\$projectId.integration.test.tsx src/routes/-projects.\$projectId.pinning.integration.test.tsx src/routes/-projects.pinning-routing.integration.test.tsx` (apps/web)
- `bun run check-types` (apps/web)

### Completion Notes List

- Added project transport router with project list/create/details while reusing backend-authoritative pin/repin/lineage semantics from Story 1.5.
- Extended repository and methodology service contracts with minimal project CRUD (`createProject`, `listProjects`, `getProjectById`) and wired through API.
- Split project surfaces so `/projects` is now an overview/navigation page and `/projects/new` is a dedicated creation workspace with large vertical methodology radio-cards and autocomplete combobox version selection.
- Upgraded project creation UX to use shadcn primitives (`radio-group`, `popover` + `command`) with deterministic default version behavior, empty-version blocking guidance, and preserved diagnostics/rules.
- Updated deterministic avatar assets to transparent SVG-only visuals (`asset-07`, `asset-11`, `asset-26`, `asset-41`) so cards no longer render white boxed backgrounds.
- Added Story 2.5 seed fixture coverage (`2-5`) with multiple methodologies and multiple published versions to support realistic methodology/version picking in local demos.
- Aligned story seed version states to backend-compatible `active` pin targets so deterministic pin validation no longer rejects seeded versions as incompatible.
- Added persisted project names across schema/repository/service/API, with create-form name input prefilled by random generated defaults and a regenerate action; fallback generated names remain for legacy unnamed rows.
- Reworked repin controls from free-text inputs to selector-based comboboxes (methodology and scoped version), with deterministic latest defaults and explicit blocked/failed diagnostics panel styling.
- Preserved epic boundary by keeping runtime controls visible-but-disabled with exact copy `Workflow runtime execution unlocks in Epic 3+` and avoiding setup-fact persistence writes.
- Added and passed API + web integration tests covering create/pin flow, repin diagnostics envelope rendering, and deterministic avatar cycling.
- Overhauled sidebar information architecture into static sections (`Workspace`, `Methodology Authoring`, `Project Operations`, `Planned`) so navigation labels map to implemented routes and planned Epic 3+ entries are visible-but-disabled with badges.
- Fixed nested route architecture so `/projects/$projectId/pinning` renders dedicated pinning content (root cause: parent project route rendered dashboard without outlet); split into layout route + index dashboard + pinning child route.
- Polished pinning information hierarchy with explicit `Current pin` snapshot, `Version transition preview`, event-type badges (`PINNED`/`REPINNED`), and more readable lineage metadata chips.
- Added route-wiring regression coverage to assert `/projects/$projectId/pinning` resolves to pinning workspace, preventing dashboard-content fallback regressions.

### File List

- `packages/methodology-engine/src/repository.ts`
- `packages/methodology-engine/src/version-service.ts`
- `packages/db/src/methodology-repository.ts`
- `packages/api/src/routers/project.ts`
- `packages/api/src/routers/index.ts`
- `packages/api/src/routers/methodology.test.ts`
- `apps/web/src/features/projects/card-avatar-map.ts`
- `apps/web/src/features/projects/card-avatar-map.integration.test.tsx`
- `apps/web/src/routes/projects.tsx`
- `apps/web/src/routes/projects.new.tsx`
- `apps/web/src/routes/projects.$projectId.tsx`
- `apps/web/src/routes/projects.$projectId.index.tsx`
- `apps/web/src/routes/projects.$projectId.pinning.tsx`
- `apps/web/src/routes/-projects.integration.test.tsx`
- `apps/web/src/routes/-projects.new.integration.test.tsx`
- `apps/web/src/routes/-projects.$projectId.integration.test.tsx`
- `apps/web/src/routes/-projects.$projectId.pinning.integration.test.tsx`
- `apps/web/src/routes/-projects.pinning-routing.integration.test.tsx`
- `apps/web/src/components/ui/popover.tsx`
- `apps/web/src/components/ui/radio-group.tsx`
- `apps/web/public/visuals/methodologies/avatars/asset-07.svg`
- `apps/web/public/visuals/methodologies/avatars/asset-11.svg`
- `apps/web/public/visuals/methodologies/avatars/asset-26.svg`
- `apps/web/public/visuals/methodologies/avatars/asset-41.svg`
- `apps/web/src/routeTree.gen.ts`
- `apps/web/src/components/app-sidebar.tsx`
- `apps/web/src/components/app-shell.tsx`
- `apps/web/src/components/sidebar-sections.tsx`
- `apps/web/src/components/app-sidebar.integration.test.tsx`
- `apps/web/src/components/app-shell.sidebar-sections.integration.test.tsx`
- `apps/web/src/components/nav-projects.tsx` (deleted)
- `docs/plans/2026-03-03-sidebar-navigation-overhaul-design.md`
- `docs/plans/2026-03-03-sidebar-navigation-overhaul.md`
- `packages/scripts/src/story-seed-fixtures.ts`
- `packages/scripts/src/__tests__/story-seed-fixtures.test.ts`
- `packages/db/src/migrations/0000_big_vulcan.sql`
- `packages/db/src/migrations/meta/0000_snapshot.json`
- `packages/db/src/migrations/meta/_journal.json`
