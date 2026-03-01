# Story 2.3: Deliver Validation, Publish, and Evidence UX for Methodology Contracts

Status: review

## Story

As an operator,
I want a hardened validation and publish flow with evidence visibility on top of version workspace baseline,
so that I can safely publish methodology versions and verify audit outcomes from UI.

## Acceptance Criteria

1. **Given** a methodology draft has blocking diagnostics
   **When** I attempt to publish from the version workspace
   **Then** publish is blocked
   **And** actionable diagnostics are grouped by scope (`field`, `work unit`, `transition`, `workflow`) and linked to editable context.
2. **Given** a methodology draft is valid
   **When** I publish version `Vn`
   **Then** I receive immutable publish results with version metadata and validation summary
   **And** the workspace reflects the published immutable state.
3. **Given** a methodology version is published
   **When** I open evidence view
   **Then** append-only evidence fields (`actor`, `timestamp`, `sourceDraftRef`, `publishedVersion`, validation outcome) are visible
   **And** evidence is queryable with deterministic ordering.
4. **Given** I attempt to edit immutable contract fields on a published version
   **When** I submit edits
   **Then** the operation is deterministically rejected
   **And** immutable diagnostics are rendered without corrupting local workspace state.
5. **Given** I am in Epic 2 methodology workspace
   **When** runtime execution controls are present
   **Then** they remain visible but disabled with rationale `Workflow runtime execution unlocks in Epic 3+`
   **And** publish and evidence inspection remain fully usable.

## Tasks / Subtasks

- [x] Implement scoped validation diagnostics orchestration in version workspace (AC: 1)
  - [x] Map backend diagnostics into stable UI groups by `field`, `work unit`, `transition`, `workflow`
  - [x] Add deterministic deep-links/focus targets from diagnostics rows to editable context in workspace panels/graph
  - [x] Preserve required-vs-observed remediation framing for all blocking diagnostics
- [x] Implement publish flow with immutable result handling (AC: 2)
  - [x] Add publish action surface in methodology version workspace with explicit preflight state and blocking feedback
  - [x] Wire publish mutation through existing typed oRPC methodology routes/services
  - [x] On successful publish, update server state/query cache and render immutable metadata + validation summary in workspace
- [x] Implement published evidence panel/query surface (AC: 3)
  - [x] Add deterministic evidence view/table for append-only publish evidence fields
  - [x] Ensure evidence sorting and filtering are deterministic and reproducible
  - [x] Keep evidence payload rendering aligned with audit/read-model semantics (no client-side mutation of evidence records)
- [x] Enforce immutable-field rejection UX and local-state integrity (AC: 4)
  - [x] Block edits/mutations against immutable fields for published versions
  - [x] Render immutable diagnostics in-place without wiping valid local workspace context
  - [x] Add regression guard for stale cache/local form state after immutable rejection responses
- [x] Preserve Epic 2 execution deferment boundary while enabling publish/evidence usability (AC: 5)
  - [x] Keep runtime execution controls visible but disabled with exact rationale copy
  - [x] Ensure runtime-disabled state does not block validation, publish, or evidence operations
- [x] Extend backend/service contracts only where required for deterministic publish/evidence semantics (AC: 1, 2, 3, 4)
  - [x] Add or refine methodology router/service endpoints for publish result and evidence retrieval contracts
  - [x] Maintain append-only evidence posture and deterministic diagnostics contracts in methodology engine validations/services
- [x] Testing and verification gates
  - [x] Unit test diagnostics grouping/deep-link mapping and immutable rejection state handling
  - [x] Unit test evidence ordering/query behavior with deterministic fixtures
  - [x] Integration test publish blocked path (diagnostics present) and publish success path (valid draft)
  - [x] Integration test published-version immutable edit rejection with no local-state corruption
  - [x] Verify runtime controls remain disabled with exact rationale while publish/evidence remain usable
  - [x] Run `bun check`, `bun check-types`, and targeted `bun run test` suites before handoff

## Dev Notes

### Developer Context Section

- Story 2.2 established the methodology version workspace baseline, React Flow topology model, deterministic save/reload behavior, and runtime controls deferment UX. Build this story on top of those surfaces; do not re-create baseline navigation/authoring infrastructure.
- This story hardens validation + publish + evidence UX and must preserve deterministic/audit-oriented behavior across UI and service contracts.
- Runtime execution remains out of scope for Epic 2. Keep execution controls visible but disabled with exact rationale copy.

### Technical Requirements

- Reuse typed methodology APIs and contract types already used by version workspace (`packages/api` + `packages/contracts` + methodology engine services).
- Use deterministic TanStack Query mutation/invalidation patterns already established in story 2.2 to avoid stale form/graph/evidence divergence.
- Preserve diagnostics contract shape and render actionable remediation (what failed, why, what to do next).
- Ensure publish outputs and evidence read models are immutable/append-only from the UI perspective.
- Facts and variable-type expansion work (including filesystem-oriented types such as `path`, `file`, and `folder`) is out of scope for Story 2.3 and is tracked in Story 2.4.

### Architecture Compliance

- Respect methodology-first and version pinning principles: published version state is immutable and evidence is append-only.
- Keep module boundaries: UI in `apps/web`, transport/composition in `packages/api`, domain validation/publish logic in `packages/methodology-engine`, shared contracts in `packages/contracts`.
- Preserve deterministic diagnostics posture and avoid introducing runtime execution semantics in Epic 2.
- Maintain strict TypeScript and boundary decoding/validation patterns from project context.

### Library and Framework Requirements

- Continue React 19 + TanStack Query v5 patterns for server-state and mutation lifecycle handling.
- Continue `@xyflow/react` v12-compatible graph/workspace integration where diagnostics and selection context cross graph/panel boundaries.
- Keep shadcn/Radix-aligned interaction semantics and accessibility behavior used by current methodology workspace.

### File Structure Requirements

- Primary web implementation surfaces:
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
  - `apps/web/src/features/methodologies/version-workspace.tsx`
  - `apps/web/src/features/methodologies/version-workspace-graph.tsx`
  - `apps/web/src/features/methodologies/version-graph.ts`
  - new co-located workspace publish/evidence helpers/components under `apps/web/src/features/methodologies/` as needed
- Shared API/contract/domain surfaces (extend, do not fork):
  - `packages/contracts/src/methodology/*`
  - `packages/api/src/routers/methodology.ts`
  - `packages/methodology-engine/src/version-service.ts`
  - `packages/methodology-engine/src/validation.ts`
  - `packages/methodology-engine/src/lifecycle-validation.ts`
- Keep tests co-located with touched features/services using current repository conventions.

### Testing Requirements

- Unit tests:
  - diagnostics grouping + remediation/deep-link projection
  - immutable-field rejection and local-state integrity
  - evidence query ordering/filter determinism
- Integration/component tests:
  - blocked publish path with grouped diagnostics
  - successful publish path with immutable metadata + summary reflected in workspace
  - published immutable edit rejection without state corruption
  - runtime controls disabled with exact rationale while publish/evidence remain functional
- Verification commands:
  - `bun check`
  - `bun check-types`
  - `bun run test` (targeted suites for methodology workspace + methodology engine publish/validation surfaces)

### Previous Story Intelligence

- Reuse Story 2.2 L1/L2/L3 scope navigation and deterministic state model; diagnostics deep-links should target the same scope model rather than introducing alternate navigation semantics.
- Preserve cut-frame visual language and non-color-only state semantics introduced in Story 2.2.
- Keep deterministic query invalidation/refetch discipline to avoid drift between inspector, graph, and persisted state.
- Preserve exact deferment rationale copy for runtime controls: `Workflow runtime execution unlocks in Epic 3+`.

### Git Intelligence Summary

- Recent methodology commits show cross-layer changes were made in lockstep (`apps/web`, `packages/api`, `packages/methodology-engine`, and tests). Follow the same boundary-respecting pattern.
- Existing commit history keeps implementation artifact progression synchronized (`story file` + `sprint-status.yaml`). Continue that process.
- Current testing patterns rely on targeted suites plus repo checks; maintain that rigor for story handoff.

### Latest Tech Information

- Latest npm versions validated during story context creation:
  - `@tanstack/react-query`: `5.90.21`
  - `@xyflow/react`: `12.10.1`
- Current web package pins are already in-range for this story (`@tanstack/react-query` `^5.90.12`; `@xyflow/react` via catalog on v12 line). No cross-major migration work is required for story 2.3.
- Continue TanStack Query v5 invalidation best practices and React Flow v12 semantics used in Story 2.2.

### Project Context Reference

- Read and apply `_bmad-output/project-context.md` before implementation.
- Enforce strict TypeScript, Effect-first/service-boundary discipline, and deterministic diagnostics/evidence behavior.
- Do not bypass tooling/module boundaries or introduce runtime execution behavior before Epic 3.

### Story Completion Status

- Story context generated and hardened with epic, architecture, PRD/UX, previous-story, git-history, and latest-tech analysis.
- Implemented grouped diagnostics orchestration with deterministic scope grouping and diagnostics deep-link focus behavior across workspace field + graph context.
- Added publish preflight/publish execution UX and immutable publish result display with deterministic query invalidation/refetch.
- Added append-only publication evidence table with deterministic sort/filter behavior and immutable rejection diagnostics for published versions.
- Verified with `bun check`, `bun check-types`, and targeted `bun run test` suites for web workspace, methodology-engine, and API methodology router surfaces.

### Project Structure Notes

- This is a Turborepo monorepo; Story 2.3 spans web UI and methodology API/domain packages.
- Keep changes additive to Story 2.2 workspace baseline, with deterministic publish/evidence behavior layered on existing route/feature structure.
- Avoid manual edits to generated route tree artifacts.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2 - Story 2.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Methodology Versioning and Execution Strategy]
- [Source: _bmad-output/planning-artifacts/architecture.md#Locked Core Decisions]
- [Source: _bmad-output/planning-artifacts/prd.md#Requirements]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Critical UI/UX Conventions]
- [Source: _bmad-output/project-context.md#Critical Rules]
- [Source: _bmad-output/implementation-artifacts/2-2-build-react-flow-methodology-graph-for-work-unit-transition-and-workflow-binding-management.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml#development_status]
- [Source: apps/web/package.json#dependencies]
- [Source: npm registry lookup for @tanstack/react-query and @xyflow/react]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.3-codex

### Debug Log References

- Create-story workflow execution for Story 2.3 with complete artifact loading and selective story extraction.
- Previous story (2.2) analysis completed for continuity, established patterns, and runtime deferment constraints.
- Recent commit pattern analysis completed for boundary and testing conventions.
- Latest npm version checks completed for `@tanstack/react-query` and `@xyflow/react`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/2-3-deliver-validation-publish-and-evidence-ux-for-methodology-contracts.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/src/features/methodologies/version-workspace.tsx`
- `apps/web/src/features/methodologies/version-workspace-graph.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- `apps/web/src/features/methodologies/version-workspace.persistence.test.ts`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- `_bmad-output/planning-artifacts/epics.md`
- `docs/plans/2026-03-01-methodology-version-workspace-direction-design.md`
- `docs/plans/2026-03-01-story-2-3-diagnostics-first-workspace-implementation-plan.md`
