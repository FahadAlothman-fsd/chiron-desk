# Story 2.6: Provide Baseline Operator Visibility for Methodology, Pin, and Diagnostics State

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator,
I want a baseline visibility panel for methodology and project contract state,
so that I can verify setup health and evidence status before runtime execution is enabled.

## Acceptance Criteria

1. [Baseline Contract Visibility] When opening a project linked to a methodology, the operator can see active methodology, pinned version, publish state, and last validation status, sourced from persisted backend state.
2. [Epic 2 Read-Only Boundary] Setup workflow execution remains disabled in Epic 2; baseline visibility shows setup-facts status deferred to `WU.SETUP` workflow `setup-project` in Epic 3, and remains read-only for methodology, pin, diagnostics, and work-unit readiness state.
3. [Work-Unit Transition Visibility] For selected methodology versions, the panel shows work-unit transitions and transition status metadata; transition-eligible workflows are presented in context of selected work-unit transition (not project-level transitions).
4. [Fact + Provenance Visibility] Work-unit details show persisted fact key-value pairs with type and provenance metadata (`sourceExecutionId`, `updatedAt`); missing required facts surface warning or blocking indicators aligned to gate/readiness.
5. [Deterministic Evidence Timeline] Evidence sections render append-only publish and pin events in deterministic order with actor, timestamp, and reference identifiers.
6. [Diagnostics History Contract] Diagnostics are grouped by context (`publish`, `pin`, `repin-policy`) and include structured remediation fields (`code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, `evidenceRef`).
7. [Reuse Existing Outputs] Baseline panel consumes persisted outputs from Stories 2.1-2.5 and does not introduce new methodology-authoring validation rules.
8. [Explicit Empty State] If setup diagnostics do not exist for a new project, diagnostics history displays explicit empty-state messaging that diagnostics appear after publish/pin/policy checks.
9. [Transition Readiness Preview] For selected work-unit transition, readiness preview shows start-gate readiness from pinned methodology contract + current project state; transitions with no start-gate conditions are shown as eligible for future execution.
10. [Visible-But-Disabled Runtime Controls] If selected transition has eligible workflows, execution controls remain visible but disabled with exact rationale `Workflow runtime execution unlocks in Epic 3+`, and UI links users to config/validation views only (read-only navigation; no runtime execution or setup mutations in Epic 2).
11. [Desktop Accessibility + Readability] Baseline visibility remains readable and keyboard-accessible across desktop form factors, and status communication never depends on color alone.

## Tasks / Subtasks

- [x] Build baseline visibility read model aggregation over existing persisted sources (AC: 1, 2, 3, 4, 5, 6, 7, 9)
  - [x] Reuse existing methodology and project pin lineage APIs to compose active methodology/version/publish/validation state.
  - [x] Add or extend project-facing read endpoints only where aggregation is missing, while preserving backend authority and deterministic contract shapes.
  - [x] Ensure diagnostics grouping supports `publish`, `pin`, and `repin-policy` contexts with stable fields.
  - [x] Ensure read-only fact provenance retrieval path exists for preview (`sourceExecutionId`, `updatedAt`) without introducing write paths.
- [x] Implement operator baseline visibility panels in project routes (AC: 1, 3, 4, 5, 6, 8, 9, 10, 11)
  - [x] Render baseline summary card for methodology/pin/publish/validation status sourced from persisted backend responses.
  - [x] Render work-unit transition metadata and transition-scoped eligibility/readiness context.
  - [x] Render workflow list for each transition with a disabled per-workflow action button and exact rationale copy.
  - [x] Add `Show future paths` toggle (default off) to reveal `future` transitions without changing status semantics.
  - [x] Render fact + provenance details and warning/blocking indicators for missing required facts.
  - [x] Render diagnostics history with explicit empty-state handling for new projects.
- [x] Preserve Epic 2 boundary and reuse constraints (AC: 2, 7, 10)
  - [x] Keep setup-fact writes out of scope (deferred to Epic 3 `WU.SETUP/setup-project`).
  - [x] Keep runtime controls visible but disabled with exact copy `Workflow runtime execution unlocks in Epic 3+`.
  - [x] Reuse existing persisted outputs from Stories 2.1-2.5; no new methodology-authoring validation rule systems.
- [x] Enforce deterministic UX and accessibility contracts (AC: 6, 8, 10, 11)
  - [x] Keep blocked vs failed semantics distinct and actionable.
  - [x] Keep command/visual parity where actions are exposed.
  - [x] Ensure keyboard navigation, focus handling, and non-color-only status communication.
- [x] Add verification coverage for read model, UI behavior, and regressions (AC: 1-11)
  - [x] Add API tests for any new project baseline visibility endpoints or enriched read payloads.
  - [x] Add web integration tests for deterministic diagnostics/evidence rendering, empty-state messaging, and disabled runtime control rationale.
  - [x] Add responsive + keyboard interaction checks for baseline visibility panels on supported desktop breakpoints.
  - [x] Add fixtures for `WU.SETUP` preview with `project.deliveryMode` present/absent to verify blocked vs eligible preview semantics and reason codes.
  - [x] Run `bun check`, `bun check-types`, and targeted `bun run test` scopes for touched packages.

## Dev Notes

### Developer Context Section

- Story 2.6 extends Epic 2 operator-facing visibility only; execution enablement remains Epic 3+ and must not leak runtime mutation behavior into Epic 2.
- Reuse Story 2.5 project surfaces and deterministic diagnostics patterns as the baseline implementation path (`contracts -> db -> engine -> api -> web`), not new parallel abstractions.
- Existing persisted publish/pin/policy outputs are authoritative sources for panel data; avoid client-synthesized lineage or diagnostics shape drift.
- Work-unit transition visibility is transition-scoped (within selected work-unit type context), not a project-level transition control surface.
- Setup-fact status is informational in this story: show deferred ownership to `WU.SETUP/setup-project` and keep panel read-only for setup readiness state.

### Technical Requirements

- Surface active methodology, exact pinned version, publish state, and latest validation status using persisted backend state contracts only.
- Surface transition readiness preview derived from pinned methodology contract and current project state; when no `start_gate` constraints exist, mark transition as future-eligible.
- Mark baseline transition/workflow payload explicitly as preview-only (`isPreview: true`) and avoid implying execution readiness guarantees.
- Include deterministic `statusReasonCode` for each transition preview row (e.g., `HAS_ALLOWED_WORKFLOW`, `NO_WORKFLOW_BOUND`, `UNRESOLVED_WORKFLOW_BINDING`, `MISSING_PREVIEW_PREREQUISITE_FACT`, `FUTURE_NO_START_GATE`, `FUTURE_NOT_IN_CURRENT_CONTEXT`).
- Render transition status with a consistent Chiron visual entity glyph (`asset-34`) and state-color variants (`eligible`, `blocked`, `future`) so the same thing changes color by state.
- Keep status triple-encoded (`glyph + explicit label + semantic color`); never rely on color alone.
- Surface work-unit facts with provenance (`sourceExecutionId`, `updatedAt`) and deterministic warning/blocking indicators when required facts are missing.
- Surface deterministic append-only event ordering for publish/pin evidence entries with actor/timestamp/reference identifiers.
- Keep diagnostics payload contract unchanged: `code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, `evidenceRef`.
- Keep execution controls visible-but-disabled with exact rationale copy and route users to configuration/validation views only (read-only navigation) instead of runtime execution.
- Keep Story 2.6 read-only for methodology/pin/diagnostics/readiness state and avoid introducing authoring validation logic.

### Architecture Compliance

- Preserve package boundary direction: contracts in `packages/contracts`, persistence in `packages/db`, policy/orchestration in `packages/methodology-engine`, transport in `packages/api`, rendering/interactions in `apps/web`.
- Keep policy enforcement backend-authoritative; UI should display diagnostics/remediation, not re-implement policy or infer authoritative outcomes.
- Keep append-only evidence semantics and deterministic ordering from existing pin/publish lineage contracts.
- Preserve Epic sequencing constraints: Story 2.6 is visibility/readiness preview only; runnable transition execution remains Epic 3 runtime scope.

### Library and Framework Requirements

- Continue using current workspace stack and patterns in place: React 19 + TanStack Router/Query in web, oRPC + Hono in API, Effect-first services in domain packages.
- Reuse existing deterministic diagnostics helper patterns in project web features; avoid introducing alternate diagnostics rendering schemas.
- Prefer existing workspace libraries over adding new dependencies for Story 2.6.
- Version check baseline (registry at workflow run time): `@tanstack/react-query 5.90.21`, `@tanstack/react-router 1.163.3`, `@orpc/client 1.13.6`, `hono 4.12.4`, `effect 3.19.19`, `drizzle-orm 0.45.1`, `better-auth 1.5.2`.

### File Structure Requirements

- Extend existing project operator routes/components from Story 2.5 rather than creating a separate navigation area:
  - `apps/web/src/routes/projects.$projectId.index.tsx`
  - `apps/web/src/routes/projects.$projectId.pinning.tsx`
  - `apps/web/src/features/projects/deterministic-diagnostics.ts`
- If additional project visibility composition is needed, place route-adjacent UI and helpers under `apps/web/src/features/projects/`.
- Add a centralized status-glyph mapping helper/component under `apps/web/src/features/projects/` to keep list and graph iconography consistent.
- Vendor bitmap assets from UX appendix source pack into `apps/web/public/visuals/chiron-status/`:
  - `asset-34.svg` (canonical status entity glyph)
  - `asset-13.svg` (secondary motif for headers/chips)
- Add or extend project baseline read endpoints in `packages/api/src/routers/project.ts` and wire via `packages/api/src/routers/index.ts` only when existing responses are insufficient.
- Keep domain and repository updates localized to existing methodology/project services in `packages/methodology-engine` and `packages/db`; do not introduce duplicate contract paths.
- Keep tests co-located with touched modules in web/api packages.

### Testing Requirements

- Add API tests for baseline visibility response composition and deterministic diagnostics grouping (`publish|pin|repin-policy`).
- Add web integration tests that verify:
  - Baseline summary fields map to persisted backend state.
  - Work-unit transition readiness preview semantics (with/without start-gate constraints).
  - Transition `statusReasonCode` values remain deterministic and consistent with rendered status labels.
  - `Show future paths` default-off behavior and deterministic reveal of only `future` transitions when enabled.
  - Fact provenance rendering and missing-required-fact warning/blocking states.
  - Deterministic evidence ordering and diagnostics field rendering.
  - Empty diagnostics explicit messaging for new projects.
  - Runtime execution controls visible-but-disabled with exact rationale copy on each listed allowed workflow.
  - Status visuals use canonical glyph `asset-34` with deterministic state-color variants in both list and graph projections.
  - Same fixture + toggle state yields identical transition keys, statuses, reason codes, and workflow counts in list and graph projections.
- Add keyboard accessibility checks for baseline panels (focus order, operable controls, non-color-only status semantics) across supported desktop layouts.
- Run and pass: `bun check`, `bun check-types`, and targeted `bun run test` for touched modules.

### Previous Story Intelligence

- Story 2.5 already delivered project routes, deterministic diagnostics rendering, and backend-authoritative pin/repin lineage behaviors; Story 2.6 should build directly on those surfaces.
- Story 2.5 explicitly preserved Epic boundary text for disabled runtime controls; Story 2.6 must keep the same exact rationale copy.
- Story 2.5 confirms setup-fact writes are deferred to Epic 3 `WU.SETUP/setup-project`; Story 2.6 must keep this as read-only deferred status.
- Existing touched files from 2.5 provide the shortest extension path (`apps/web/src/routes/projects*.tsx`, `apps/web/src/features/projects/deterministic-diagnostics.ts`, `packages/api/src/routers/project.ts`, methodology services/repositories).

### Git Intelligence Summary

- Recent commits reinforce deterministic diagnostics and vertical-slice delivery across `contracts -> db -> engine -> api -> web`.
- Story-oriented commits consistently include story artifact and sprint-status updates; preserve this operational pattern for Story 2.6.
- Latest docs/planning updates include setup-fact scope clarifications; Story 2.6 must remain aligned with deferred `WU.SETUP` ownership.

### Latest Tech Information

- Registry latest versions were checked during this workflow run via `bun pm view` for story-relevant packages.
- No mandatory dependency upgrades are required to deliver Story 2.6 scope; prioritize behavior and contract correctness over dependency churn.
- If upgrades are considered, isolate them into follow-up work to avoid coupling with baseline visibility implementation.

### Project Context Reference

- Follow project context rules for strict TypeScript boundaries, Effect-first orchestration contracts, and backend-authoritative tool/policy semantics.
- Respect module boundaries and avoid cross-module internal imports that bypass documented contracts.
- Keep deterministic diagnostics and evidence semantics aligned with project context + UX guidance.

### Story Completion Status

- Scope is locked to baseline operator visibility for methodology/pin/diagnostics/readiness state with read-only behavior in Epic 2.
- Context set includes epics story requirements, architecture constraints, UX deterministic/a11y contracts, project context rules, previous story intelligence, git work patterns, and live dependency version check results.
- Story artifact is ready-for-dev with implementation guardrails and verification expectations.

### Project Structure Notes

- Alignment with unified structure: extend existing project routes and features in `apps/web` and existing project/methodology services in `packages/api`, `packages/methodology-engine`, and `packages/db`.
- Keep visibility concerns centralized in project operator surfaces; avoid introducing parallel state or diagnostics systems.
- Preserve deterministic diagnostics/evidence contracts as reusable shared rendering patterns.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.6: Provide Baseline Operator Visibility for Methodology, Pin, and Diagnostics State]
- [Source: _bmad-output/planning-artifacts/epics.md#Story Dependency Matrix]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Pin Persistence]
- [Source: _bmad-output/planning-artifacts/architecture.md#Transition-Workflow Binding and Execution Eligibility Model]
- [Source: _bmad-output/planning-artifacts/architecture.md#Sequencing and Guardrails]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Deterministic State Model and Semantics]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Diagnostics and Evidence Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Behavior Strategy]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Baseline]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad-output/project-context.md#Technology Stack & Versions]
- [Source: _bmad-output/implementation-artifacts/2-5-provide-project-creation-and-methodology-pinning-ux-with-pin-lineage-visibility.md]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.3-codex

### Debug Log References

- `bun run --cwd packages/api test "src/routers/methodology.test.ts"`
- `bun run --cwd apps/web test 'src/routes/-projects.$projectId.integration.test.tsx'`
- `bun run --cwd apps/web test 'src/routes/-projects.$projectId.pinning.integration.test.tsx'`
- `bun run --cwd apps/web test "src/components/app-shell.sidebar-sections.integration.test.tsx" "src/components/app-sidebar.integration.test.tsx"`
- `bun run check-types`
- `bun run check`
- `bunx oxfmt --write 'apps/web/src/routes/projects.$projectId.pinning.tsx' 'apps/web/src/routes/-projects.$projectId.pinning.integration.test.tsx'`
- `bun run --cwd apps/web test 'src/routes/-projects.$projectId.pinning.integration.test.tsx'`
- `bun run --cwd packages/scripts db:seed:story -- --story=2-5`
- `bun run --cwd packages/scripts db:seed:story -- --story=2-6`
- `bunx --bun shadcn@latest registry add @cult-ui`
- `bunx --bun shadcn@latest registry add @elements`
- `bunx --bun shadcn@latest registry add @kokonutui`
- Playwright MCP verification: login, project switcher, dashboard baseline, facts/work-units/transitions/agents routes.

### Completion Notes List

- Extended `project.getProjectDetails` with additive `baselinePreview` read model (`isPreview: true`) that composes pinned methodology summary, transition preview statuses/reason codes, grouped diagnostics contexts, fact provenance fields, and deterministic evidence timeline while preserving read-only Epic 2 behavior.
- Shifted Story 2.6 IA to dashboard-first visibility: baseline summary, transition readiness preview, fact provenance, diagnostics empty-state/contract rendering, and evidence timeline now render on the project dashboard route.
- Kept pinning route focused on pin-management concerns (active pin snapshot, repin controls, lineage) and added a lightweight pointer back to dashboard readiness visibility.
- Added centralized status visual mapping helper and vendored Chiron glyph assets `asset-34.svg` and `asset-13.svg` under `apps/web/public/visuals/chiron-status/`.
- Added API regression test for baseline preview composition, expanded dashboard integration coverage for readiness rendering/future toggle/reason codes, and updated pinning integration coverage for route-scope split.
- Updated story seed fixture for Story 2.5 BMAD versions to include lifecycle/workflow definition extensions and reseeded story data so setup/readiness preview is available in Story 2.6.
- Added Story 2.6 seed alias and seed-content enrichments: `2-6` seed plan, derived `agentTypes`, and transition metadata (`workUnitTypeKey`, `gateClass`, `requiredLinks`) for richer project context pages.
- Added project-scoped operator pages and sidebar IA extensions: `/projects/$projectId/facts`, `/projects/$projectId/work-units`, `/projects/$projectId/transitions`, `/projects/$projectId/agents` with URL-backed filters and dynamic `Project Context` sidebar links.
- Added contextual sidebar header behavior: system scope shows `Operator Workspace`, project scope shows searchable project selector, methodology scope shows searchable methodology selector.
- Added home/index route replacement (from Better T Stack placeholder) to substantive operator index snippets for Projects, Methodologies, Workflow Preview, and System Health.
- Added tokenized primitive enhancements (CVA variants for card/popover/command), textured mono canvas utilities, corner-color variants, and transition flow visualization with arrow-based state display.
- Tuned future-path UX: transition list becomes scrollable when `Show future paths` is enabled to prevent page overgrowth.
- Updated baseline preview fallback logic so setup transition/workflow appears as available in seeded preview scenarios (draft binding fallback) while keeping project facts empty/read-only.
- `bun run check`, `bun run check-types`, targeted API/web tests, and Playwright route checks all pass for Story 2.6 flow.
- Note: DB migration meta deletions/changes visible in git status are user-side workspace changes and were not introduced as part of Story 2.6 implementation.

### File List

- `_bmad-output/implementation-artifacts/2-6-provide-baseline-operator-visibility-for-methodology-pin-and-diagnostics-state.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/components.json`
- `apps/web/src/components/app-shell.tsx`
- `apps/web/src/components/app-sidebar.tsx`
- `apps/web/src/components/sidebar-sections.tsx`
- `apps/web/src/components/app-shell.sidebar-sections.integration.test.tsx`
- `apps/web/src/components/app-sidebar.integration.test.tsx`
- `apps/web/src/components/ui/card.tsx`
- `apps/web/src/components/ui/command.tsx`
- `apps/web/src/components/ui/popover.tsx`
- `apps/web/src/index.css`
- `apps/web/src/routeTree.gen.ts`
- `apps/web/src/routes/index.tsx`
- `packages/api/src/routers/project.ts`
- `packages/api/src/routers/methodology.test.ts`
- `packages/scripts/src/story-seed-fixtures.ts`
- `apps/web/src/features/projects/baseline-visibility.tsx`
- `apps/web/src/features/projects/status-visual.tsx`
- `apps/web/src/routes/projects.$projectId.pinning.tsx`
- `apps/web/src/routes/projects.$projectId.index.tsx`
- `apps/web/src/routes/projects.$projectId.facts.tsx`
- `apps/web/src/routes/projects.$projectId.work-units.tsx`
- `apps/web/src/routes/projects.$projectId.transitions.tsx`
- `apps/web/src/routes/projects.$projectId.agents.tsx`
- `apps/web/src/routes/-projects.$projectId.integration.test.tsx`
- `apps/web/src/routes/-projects.$projectId.pinning.integration.test.tsx`
- `apps/web/public/visuals/chiron-status/asset-34.svg`
- `apps/web/public/visuals/chiron-status/asset-13.svg`
- `docs/plans/2026-03-04-project-switcher-project-dashboard-lists-design.md`
- `docs/plans/2026-03-04-project-switcher-project-dashboard-lists-implementation-plan.md`
- `docs/plans/2026-03-04-story-2-6-dashboard-first-baseline-visibility-design.md`
- `docs/plans/2026-03-04-story-2-6-dashboard-first-baseline-visibility-implementation-plan.md`
- `docs/plans/2026-03-05-epic-2-preview-setup-transition-facts-agents-design.md`
- `docs/plans/2026-03-05-epic-2-preview-setup-transition-facts-agents-implementation-plan.md`
