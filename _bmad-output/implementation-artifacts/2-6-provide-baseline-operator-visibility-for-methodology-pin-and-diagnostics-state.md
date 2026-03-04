# Story 2.6: Provide Baseline Operator Visibility for Methodology, Pin, and Diagnostics State

Status: ready-for-dev

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

- [ ] Build baseline visibility read model aggregation over existing persisted sources (AC: 1, 2, 3, 4, 5, 6, 7, 9)
  - [ ] Reuse existing methodology and project pin lineage APIs to compose active methodology/version/publish/validation state.
  - [ ] Add or extend project-facing read endpoints only where aggregation is missing, while preserving backend authority and deterministic contract shapes.
  - [ ] Ensure diagnostics grouping supports `publish`, `pin`, and `repin-policy` contexts with stable fields.
  - [ ] Ensure read-only fact provenance retrieval path exists for preview (`sourceExecutionId`, `updatedAt`) without introducing write paths.
- [ ] Implement operator baseline visibility panels in project routes (AC: 1, 3, 4, 5, 6, 8, 9, 10, 11)
  - [ ] Render baseline summary card for methodology/pin/publish/validation status sourced from persisted backend responses.
  - [ ] Render work-unit transition metadata and transition-scoped eligibility/readiness context.
  - [ ] Render workflow list for each transition with a disabled per-workflow action button and exact rationale copy.
  - [ ] Add `Show future paths` toggle (default off) to reveal `future` transitions without changing status semantics.
  - [ ] Render fact + provenance details and warning/blocking indicators for missing required facts.
  - [ ] Render diagnostics history with explicit empty-state handling for new projects.
- [ ] Preserve Epic 2 boundary and reuse constraints (AC: 2, 7, 10)
  - [ ] Keep setup-fact writes out of scope (deferred to Epic 3 `WU.SETUP/setup-project`).
  - [ ] Keep runtime controls visible but disabled with exact copy `Workflow runtime execution unlocks in Epic 3+`.
  - [ ] Reuse existing persisted outputs from Stories 2.1-2.5; no new methodology-authoring validation rule systems.
- [ ] Enforce deterministic UX and accessibility contracts (AC: 6, 8, 10, 11)
  - [ ] Keep blocked vs failed semantics distinct and actionable.
  - [ ] Keep command/visual parity where actions are exposed.
  - [ ] Ensure keyboard navigation, focus handling, and non-color-only status communication.
- [ ] Add verification coverage for read model, UI behavior, and regressions (AC: 1-11)
  - [ ] Add API tests for any new project baseline visibility endpoints or enriched read payloads.
  - [ ] Add web integration tests for deterministic diagnostics/evidence rendering, empty-state messaging, and disabled runtime control rationale.
  - [ ] Add responsive + keyboard interaction checks for baseline visibility panels on supported desktop breakpoints.
  - [ ] Add fixtures for `WU.SETUP` preview with `project.deliveryMode` present/absent to verify blocked vs eligible preview semantics and reason codes.
  - [ ] Run `bun check`, `bun check-types`, and targeted `bun run test` scopes for touched packages.

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

- `git log -5 --pretty=format:'%h %ad %s' --date=short`
- `bun pm view @tanstack/react-query version`
- `bun pm view @tanstack/react-router version`
- `bun pm view @orpc/client version`
- `bun pm view hono version`
- `bun pm view effect version`
- `bun pm view drizzle-orm version`
- `bun pm view better-auth version`

### Completion Notes List

- Generated comprehensive ready-for-dev story context for Story 2.6 with explicit Epic 2 boundary constraints.
- Incorporated Story 2.6 acceptance criteria, prior-story continuity from 2.5, architecture guardrails, UX deterministic/a11y requirements, and project context constraints.
- Added implementation and testing task breakdown mapped to AC coverage to guide `dev-story` execution.

### File List

- `_bmad-output/implementation-artifacts/2-6-provide-baseline-operator-visibility-for-methodology-pin-and-diagnostics-state.md`
