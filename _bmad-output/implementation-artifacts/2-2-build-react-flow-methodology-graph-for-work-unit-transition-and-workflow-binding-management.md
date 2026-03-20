# Story 2.2: Build Methodology Version Workspace Baseline with React Flow Authoring

Status: done

## Story

As an operator,
I want a version workspace to edit methodology contracts with React Flow-assisted authoring,
so that I can configure work units, facts, transitions, workflows, and bindings in one deterministic UI.

## Acceptance Criteria

1. **Given** I open a methodology draft version workspace from Story 2.1 navigation
   **When** the workspace loads
   **Then** I can view and edit draft fields for `methodologyKey`, `displayName`, work unit definitions, work-unit fact schemas, transitions, workflow definitions, and workflow steps
   **And** the workspace clearly shows draft/non-executable state.
2. **Given** I make edits to work units, transitions, workflows, steps, or workflow-transition bindings
   **When** I save changes
   **Then** changes persist through Epic 1 backend contracts
   **And** data reloads deterministically after refresh.
3. **Given** I open the React Flow workspace graph for the version
   **When** graph data is rendered
   **Then** I can view work unit nodes, transition edges, and workflow relationships with binding state
   **And** graph layout and content deterministically reflect persisted backend data.
4. **Given** some workflows are unbound and others are bound to transitions
   **When** I inspect binding controls
   **Then** unbound workflows remain visible in workflow catalog context
   **And** only bound workflows appear as transition-eligible for the associated transition.
5. **Given** I edit facts schema and transition/workflow action configuration
   **When** configuration violates facts v1 constraints
   **Then** I receive actionable diagnostics tied to the invalid fields
   **And** runtime execution actions remain visible-but-disabled with rationale `Workflow runtime execution unlocks in Epic 3+`.

## Tasks / Subtasks

- [x] Build methodology version workspace editing baseline for all contract entities (AC: 1)
  - [x] Extend version workspace surface in `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx` and feature modules under `apps/web/src/features/methodologies/`
  - [x] Add deterministic forms/sections for metadata, work units, fact schemas, transitions, workflow definitions, and steps
  - [x] Preserve explicit draft/non-executable state messaging in the workspace
- [x] Implement contract-backed persistence and deterministic reload semantics (AC: 2)
  - [x] Reuse typed methodology endpoints from `packages/api/src/routers/methodology.ts` and shared contract types in `packages/contracts/src/methodology/*`
  - [x] Wire mutations through existing oRPC client path and apply targeted TanStack Query invalidation/refetch for deterministic post-save state
  - [x] Ensure refresh/direct-link reload reproduces the same UI state from persisted server data
- [x] Implement React Flow graph projection for methodology entities and relationships (AC: 3)
  - [x] Build deterministic mapping from persisted draft data to graph nodes/edges/relationship markers
  - [x] Render work unit nodes, transition edges, and workflow relationship indicators with explicit binding state
  - [x] Keep graph behavior keyboard-accessible and deterministic across re-renders
- [x] Implement scoped topology navigation model (L1/L2/L3) with deterministic drill flow (AC: 1, 3, 4)
  - [x] L1 Methodology topology: work units + transitions only
  - [x] L2 Work Unit scope: workflows under selected work unit + binding controls
  - [x] L3 Workflow scope: step graph for selected workflow (`form`, `agent`, `action`, `invoke`, `branch`, `display`)
  - [x] Add persistent breadcrumb scope stack and keyboard controls (`Enter` drill-in, `Esc` drill-up, command palette scope jump)
- [x] Implement workflow-binding management and catalog/eligibility separation (AC: 4)
  - [x] Keep unbound workflows visible in catalog context
  - [x] Restrict transition-eligible workflow lists to bound workflows only
  - [x] Ensure UI state and persisted binding state remain aligned after edits/refresh
- [x] Apply cut-frame design system consistently across workspace surfaces (AC: 1, 3)
  - [x] Implement shared cut-frame primitive and use it for shell panels, inspector sections, cards, list rows, and graph nodes
  - [x] Keep token usage constrained to existing Chiron semantic variables backed by the 24-color palette
  - [x] Maintain non-color-only state communication and focus visibility for all interactive elements
- [x] Enforce facts v1 diagnostics and runtime deferment boundary (AC: 5)
  - [x] Apply actionable diagnostics for invalid fact schema/action configuration with clear remediation
  - [x] Keep runtime execution actions visible but disabled with exact rationale copy
  - [x] Block any runtime execution dispatch from this Epic 2 workspace baseline
- [x] Seed canonical BMAD data for Story 2.2 authoring scenarios
  - [x] Extend story seed fixtures to support `2-2`/`bmad.v1` instead of synthetic-only `2-1` dataset
  - [x] Seed canonical work units, transition bindings, and workflow definitions from planning artifacts to drive L1/L2/L3 graph rendering
  - [x] Include work-unit cardinality policy in seeded definitions and surface cardinality in UI (`ONE`/`MANY` badge + inspector)
- [x] Testing and quality gates
  - [x] Unit test deterministic graph projection from equal inputs
  - [x] Unit test topology scope navigation state machine (`L1 -> L2 -> L3 -> L2 -> L1`) and breadcrumb parity
  - [x] Unit test binding eligibility filtering (catalog visibility vs transition eligibility)
  - [x] Unit test cardinality display and enforcement affordances for `one_per_project` and `many_per_project`
  - [x] Unit test facts-constraint diagnostics and disabled runtime rationale rendering
  - [x] Integration/component test workspace edits -> persistence -> deterministic reload
  - [x] Integration/component test seeded BMAD data appears in all three scopes without scope leakage
  - [x] Run `bun check`, `bun check-types`, and targeted `bun run test` suites before handoff

## Dev Notes

### Developer Context Section

- Story 2.1 is completed and already provides deterministic navigation/catalog/details/version-entry foundation. Build Story 2.2 on that baseline; do not recreate those flows.
- Story 2.2 owns methodology version workspace authoring + React Flow graph baseline only.
- Story 2.3 remains responsible for validation/publish/evidence hardening; keep this story focused on authoring baseline and deterministic persistence.
- Runtime execution remains deferred in Epic 2. Preserve visible-but-disabled runtime controls and exact deferment rationale.

### Locked UX Topology Decisions (Conversation)

- Use a three-level scoped editor model with one scope visible at a time:
  - L1 Methodology Topology: work units and transitions only.
  - L2 Work Unit Scope: workflows under selected work unit and binding controls.
  - L3 Workflow Scope: workflow step graph using allowed step types.
- Scope navigation must be deterministic with breadcrumb stack and keyboard parity:
  - Drill-in: select + Enter.
  - Drill-up: Esc.
  - Scope jump: command palette.
- Do not render all levels in one canvas simultaneously; avoid graph density overload.

### Locked Visual Language Decisions (Conversation)

- Apply cut-frame/cropped-corner border language across most workspace components, not only graph nodes.
- Reuse existing Chiron token palette in `apps/web/src/index.css` (24-color system); do not introduce net-new colors.
- Keep shape system controlled:
  - Shared cut-frame base silhouette for entities.
  - Entity distinction through icon/tab/badge cues rather than unrelated shape families.
- Keep runtime actions visible but disabled with exact rationale copy: `Workflow runtime execution unlocks in Epic 3+`.

### Cut-Frame Style Spec (Implementation Guidance)

- Introduce a shared cut-frame utility style and apply it to primary workspace surfaces:
  - shell header blocks, panels, cards, buttons, list rows, inspector sections, popovers/dialogs, and graph nodes.
- Keep corners sharp globally (`--radius: 0`) and use notched/cropped corner treatment as the defining border motif.
- Use only existing semantic tokens backed by the 24-color Chiron palette (`--background`, `--card`, `--foreground`, `--muted-foreground`, `--border`, `--primary`, `--ring`, `--destructive`).

```css
/* apps/web/src/index.css (or shared workspace stylesheet) */
.chiron-cut-frame {
  --cut-size: 8px;
  --frame-bg: var(--card);
  --frame-border: color-mix(in oklab, var(--border) 78%, transparent);
  --frame-border-strong: color-mix(in oklab, var(--foreground) 26%, var(--border));
  position: relative;
  background: var(--frame-bg);
  border: 1px solid var(--frame-border);
  clip-path: polygon(
    var(--cut-size) 0,
    calc(100% - var(--cut-size)) 0,
    100% var(--cut-size),
    100% calc(100% - var(--cut-size)),
    calc(100% - var(--cut-size)) 100%,
    var(--cut-size) 100%,
    0 calc(100% - var(--cut-size)),
    0 var(--cut-size)
  );
}

.chiron-cut-frame[data-variant="surface"] {
  --frame-bg: color-mix(in oklab, var(--background) 86%, var(--card));
}

.chiron-cut-frame[data-variant="interactive"] {
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.chiron-cut-frame[data-variant="interactive"]:hover {
  border-color: var(--frame-border-strong);
}

.chiron-cut-frame[data-variant="interactive"]:focus-visible {
  outline: 1px solid color-mix(in oklab, var(--ring) 72%, transparent);
  outline-offset: 1px;
}
```

- Node and edge look (React Flow):
  - Work Unit node: cut-frame, uppercase title, cardinality badge (`ONE`/`MANY`), compact meta row (`WF:x`, `TR:y`).
  - Workflow item/node (L2 scope): same cut-frame base with lower visual weight; state shown via icon + label (not color alone).
  - Transition edge: orthogonal/smooth-step path, subtle dashed line, compact label chip with binding count.
  - Diagnostics: add marker glyph + text code; do not rely on red-only color cues.
- Component-level consistency rules:
  - Reuse one cut-frame primitive everywhere; avoid bespoke border styles per component.
  - Keep size rhythm consistent (`cut-size` 6-10px depending on component scale).
  - Preserve keyboard focus visibility even when clip-path is applied.
  - Keep handles/targets outside clipped corners for reliable graph interactions.

### Locked Seeding and Cardinality Decisions (Conversation)

- Seed canonical `bmad.v1` methodology artifacts for Story 2.2 graph UX coverage (work units, transition bindings, workflow definitions, and step graphs).
- Include work-unit cardinality in seeded definitions and show it in UI (badge + inspector).
- Cardinality policy values are restricted to `one_per_project` and `many_per_project`.
- Explicit examples to preserve in seeded data and UX:
  - `WU.PRD` as single-instance (`one_per_project`).
  - `WU.BRAINSTORMING` as multi-instance (`many_per_project`).

#### Story 2.2 Seed Source of Truth

- `_bmad-output/planning-artifacts/archive/2026-02-reset/legacy-seeds/chiron-seed-transition-allowed-workflows-v1.json`
- `_bmad-output/planning-artifacts/archive/2026-02-reset/legacy-seeds/chiron-seed-workflow-definitions-v1.json`
- `_bmad-output/planning-artifacts/bmad-work-unit-catalog-v1-week6.md`

#### Work-Unit Cardinality Mapping for BMAD Seed (Locked for Story 2.2)

- `one_per_project`:
  - `WU.SETUP`, `WU.PRODUCT_BRIEF`, `WU.PRD`, `WU.UX_DESIGN`, `WU.ARCHITECTURE`, `WU.BACKLOG`, `WU.IMPLEMENTATION_READINESS`, `WU.PROJECT_CONTEXT`, `WU.TEST_FRAMEWORK`, `WU.TEST_ARCHITECTURE`, `WU.CI_QUALITY`
- `many_per_project`:
  - `WU.BRAINSTORMING`, `WU.FACILITATION_SESSION`, `WU.RESEARCH`, `WU.STORY`, `WU.CHANGE_PROPOSAL`, `WU.RETROSPECTIVE`, `WU.SPRINT_PLAN`, `WU.TECH_SPEC`, `WU.TEST_AUTOMATION`, `WU.TEST_DESIGN`, `WU.TEST_REVIEW`, `WU.TEST_TRACEABILITY`, `WU.NFR_ASSESSMENT`, `WU.DESIGN_FACILITATION`, `WU.STRATEGY_FACILITATION`, `WU.PROBLEM_SOLVING`, `WU.STORYTELLING`, `WU.LEARNING_TRACK`

### Technical Requirements

- Use typed oRPC + TanStack Query server-state patterns already established in the web app. No ad hoc fetch paths.
- Reuse existing methodology contracts/endpoints and extend where required through established API/router/service/repository boundaries.
- Persist all editable methodology draft entities through Epic 1 contract-backed surfaces and reflect persisted state deterministically in both form and graph projections.
- Facts constraints must produce actionable, field-level diagnostics with explicit required-vs-observed framing.
- Keep command/visual parity: if a binding/action is available via command affordance, same validation/disabled semantics must apply in visible controls.

### Architecture Compliance

- Respect locked stack and boundaries from project context and architecture docs (React 19, TanStack Router/Query, Hono/oRPC, Effect-oriented service boundaries, Drizzle/SQLite).
- Keep contract-first module separation (`contracts` as shared center, `api` as transport/composition boundary).
- Do not bypass backend policy/service layers with frontend-side domain logic that belongs in service/repository.
- Preserve deterministic diagnostics posture and append-only evidence orientation for future story hardening.
- Do not introduce runtime execution semantics into Epic 2 workspace flows.

### Library and Framework Requirements

- `@xyflow/react` (React Flow) is required for graph authoring/visualization in this story.
- TanStack Query v5 mutation lifecycle should be used for deterministic invalidation/refetch after save operations.
- React 19 patterns must keep status/disabled/error states explicit and accessible.
- Keep shadcn/Radix-aligned component patterns used by existing web surfaces.

### File Structure Requirements

- Primary web implementation surface:
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
  - `apps/web/src/features/methodologies/*` (workspace-specific components/helpers)
- Shared contract/API surfaces (extend, do not fork):
  - `packages/contracts/src/methodology/*`
  - `packages/api/src/routers/methodology.ts`
  - corresponding service/repository modules already used by Story 2.1
- Seed/script surfaces for BMAD fixture coverage:
  - `packages/scripts/src/story-seed-fixtures.ts`
  - `packages/scripts/src/story-seed.mjs`
- Keep tests co-located with updated feature modules/routes per existing repo convention.
- Do not modify generated route tree manually.

### Testing Requirements

- Unit tests:
  - deterministic graph projection (same input -> same nodes/edges/binding markers)
  - binding eligibility filtering logic
  - facts-constraint diagnostics rendering and remediation payload mapping
  - runtime controls visible-but-disabled rationale with exact copy
- Integration/component tests:
  - workspace edit/save flow for core contract entities
  - persisted reload determinism after refresh/direct link
  - graph rendering parity with persisted backend data
- Verification commands:
  - `bun check`
  - `bun check-types`
  - `bun run test` (targeted suites for methodology workspace/graph flows)

### Previous Story Intelligence

- Reuse Story 2.1 route and context scaffolding (`/methodologies -> /methodologies/:methodologyId -> /versions -> /versions/:versionId`) as the single entry path for this workspace.
- Keep existing deterministic query invalidation/refetch discipline from Story 2.1 to avoid stale graph/form divergence.
- Maintain keyboard parity and deterministic focus behavior introduced by Story 2.1 command and navigation patterns.
- Preserve Epic 2 runtime deferment UX contract (`Workflow runtime execution unlocks in Epic 3+`) verbatim.

### Git Intelligence Summary

- Recent commits show Story 2.1 touched both web and API/contracts layers together; Story 2.2 can follow the same cross-layer pattern when needed.
- Commit history indicates story artifact + sprint-status updates are kept in sync; maintain that process here.
- Recent testing pattern favors targeted test suites plus workspace checks; follow same verification rigor for story handoff.

### Latest Tech Information

- `@xyflow/react` latest stable observed: `12.10.1`; project currently targets major `12`/catalog source, so Story 2.2 should stay on the existing major line and avoid introducing cross-major migration scope.
- `@tanstack/react-query` latest stable observed: `5.90.21`; project currently pins `^5.90.12` in web package, which is within the current v5 line.
- React Flow v12 migration docs emphasize v12 API semantics; implement Story 2.2 using v12 conventions only.

### Project Structure Notes

- This is a Turborepo monorepo: Story 2.2 spans `apps/web` with shared `packages/contracts` and `packages/api` integration.
- Keep implementation additive to the current methodology workspace baseline established by Story 2.1.
- Follow project-context guardrails for strict TypeScript, deterministic behavior, and no boundary violations.

### References

- `_bmad-output/planning-artifacts/epics.md` (Epic 2 Story 2.2 definition and ACs)
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/2-1-build-methodology-workspace-ui-for-draft-authoring-and-validation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `package.json`
- `apps/web/package.json`
- `https://reactflow.dev/whats-new`
- `https://reactflow.dev/learn/troubleshooting/migrate-to-v12`
- `https://tanstack.com/query/v5/docs/react/guides/query-invalidation`
- `https://www.npmjs.com/package/@xyflow/react`

### Project Context Reference

- Read and apply `_bmad-output/project-context.md` before implementation.
- Enforce Epic 2 runtime deferment boundary throughout Story 2.2 implementation.

### Story Completion Status

- Story implementation and UX/list follow-up passes completed; verification rerun with targeted suites green.
- Story status advanced to `done` after final review + verification pass.

## Dev Agent Record

### Agent Model Used

openai/gpt-5.3-codex

### Debug Log References

- Create-story workflow execution for Story 2.2 with epic/prd/architecture/ux/project-context and previous-story analysis.
- `packages/methodology-engine`: `bun run test src/version-service.test.ts`
- `apps/web`: `bun run test src/features/methodologies/version-workspace.integration.test.tsx`
- `apps/web`: `bun test src/features/methodologies/version-workspace.persistence.test.ts src/features/methodologies/version-graph.test.ts`
- `packages/scripts`: `bun run test src/__tests__/story-seed-fixtures.test.ts`
- Repo checks: `bun run check-types`, `bun run check`
- `apps/web`: `bun run check-types`
- `apps/web`: `bun test src/features/methodologies/version-graph.test.ts src/features/methodologies/version-workspace.persistence.test.ts`
- `apps/web`: `bun run test src/features/methodologies/version-workspace.integration.test.tsx`
- Playwright visual verification: methodology workspace graph/list screenshots (`methodology-workspace-list-view-v1.png`, `methodology-workspace-list-datagrid-v2.png`)

### Completion Notes List

- Added deterministic methodology version authoring surface with editable metadata/work-unit/fact/transition/workflow/step/binding sections and explicit draft/non-executable posture.
- Added contract-backed authoring snapshot read path (`version.workspace.get`) in methodology service/router and wired deterministic save + invalidate + refetch flow in route.
- Implemented React Flow scope graph system (L1/L2/L3), breadcrumb/scope-jump, Enter/Esc keyboard drill, and binding catalog vs transition-eligible separation controls.
- Added cut-frame utility styles and applied cut-frame surfaces to graph/breadcrumb/catalog/eligibility blocks.
- Added actionable diagnostics mapping from lifecycle/workflow validation responses to field-tied workspace diagnostics while preserving exact runtime deferment rationale copy.
- Extended story seed fixtures with canonical Story 2.2 `bmad.v1` planning-artifact-derived workflows/bindings/cardinality and added seed tests.
- Added/expanded unit and integration coverage for deterministic graph projection, topology navigation, binding eligibility filtering, cardinality badges, runtime rationale rendering, parse/remediation flow, and deterministic round-trip reload behavior.
- Completed graph-first UX cleanup pass: reduced non-essential chrome by default, compacted command rail, and improved border/corner consistency while keeping terminal aesthetic.
- Added searchable scope controls (work unit/workflow) using shadcn-style command+dropdown interactions and improved inspector-first editing flow.
- Added context-aware `+ Add` split menu with inline quick-create forms (custom keys, scoped transition/workflow creation, duplicate-key guardrails).
- Added dual surface authoring mode: `Graph View` and `List View` with scope-aware tables and row-to-inspector selection wiring.
- Added lightweight datagrid behavior in list mode: row filtering (`Filter Rows`) and sortable L1 work-unit columns.
- Improved L3 sequential readability with dependency/topological ordering and explicit step order labels; improved L1 transition readability with state-flow labels.
- Added root-level Tauri attach workflow for desktop dev with existing web server (`dev:native:attach`) and attach config to avoid duplicate dev server startup.

### File List

- `_bmad-output/implementation-artifacts/2-2-build-react-flow-methodology-graph-for-work-unit-transition-and-workflow-binding-management.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/package.json`
- `apps/web/src/index.css`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- `apps/web/src/features/methodologies/workspace-shell.tsx`
- `apps/web/src/features/methodologies/version-workspace.tsx`
- `apps/web/src/features/methodologies/version-workspace-graph.tsx`
- `apps/web/src/features/methodologies/version-graph.ts`
- `apps/web/src/features/methodologies/version-workspace.integration.test.tsx`
- `apps/web/src/features/methodologies/version-workspace.persistence.test.ts`
- `apps/web/src/features/methodologies/version-graph.test.ts`
- `packages/api/src/routers/methodology.ts`
- `packages/methodology-engine/src/version-service.ts`
- `packages/methodology-engine/src/version-service.test.ts`
- `packages/methodology-engine/src/lifecycle-validation.ts`
- `packages/methodology-engine/src/validation.ts`
- `packages/scripts/src/story-seed-fixtures.ts`
- `packages/scripts/src/__tests__/story-seed-fixtures.test.ts`
- `packages/scripts/src/story-seed.mjs`
- `apps/web/src-tauri/tauri.attach.conf.json`
- `README.md`
- `package.json`
- `turbo.json`
