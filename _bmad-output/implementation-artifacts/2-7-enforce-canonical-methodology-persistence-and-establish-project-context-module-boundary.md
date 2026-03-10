# Story 2.7: Enforce Canonical Methodology Persistence and Establish Project-Context Module Boundary

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform engineer,
I want methodology design-time persistence to be canonical-table authoritative and project ownership moved into a dedicated `project-context` module,
so that Epic 3 onboarding runtime work starts from coherent boundaries with zero `definition_extensions_json` authority drift.

## Story Metadata

- `intentTag`: `Hardening`
- `frRefs`: `FR2`, `FR3`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`, `ADR-EF-06`
- `gateRefs`: `G3`
- `evidenceRefs`: `canonical-authority-readwrite-evidence`, `project-context-boundary-evidence`, `route-contract-runtime-evidence`, `project-context-onboarding-seed-evidence`, `regression-proof-verification-evidence`, `forbidden-key-rejection-proof-evidence`, `dependency-boundary-proof-evidence`, `structured-runtime-log-evidence`
- `diagnosticRefs`: `forbidden-extension-keys-diagnostics`, `project-context-boundary-diagnostics`, `route-runtime-contract-diagnostics`, `onboarding-canonical-mapping-diagnostics`, `publish-pin-projection-regression-diagnostics`

## Acceptance Criteria (Gherkin)

1. **Canonical authority hardening**

   **Given** canonical methodology domains are edited through design-time services and repositories  
   **When** create, update, read, and delete operations execute for table-backed canonical entities  
   **Then** canonical data is persisted and resolved from canonical SQLite tables only  
   **And** `methodology_versions.definition_extensions_json` is never used as canonical write target or canonical read fallback.

2. **Forbidden canonical key enforcement**

   **Given** a save or seed payload contains forbidden canonical domain keys inside `definition_extensions_json`  
   **When** API/service validation and CI guardrails run  
   **Then** the operation is rejected with deterministic diagnostics  
   **And** CI enforces a dual hard gate (runtime-path and repo-wide) with no allowlist or exception mechanism.

3. **Project ownership boundary**

   **Given** project create, list, get, pin, and repin operations are invoked from transport routes  
   **When** requests are processed  
   **Then** persistence and domain ownership flow through `project-context` module contracts  
   **And** `methodology-engine` no longer owns project persistence responsibilities  
   **And** dependency direction is hard-isolated so `methodology-engine` does not import project persistence repositories/types.

4. **Route/contract runtime stabilization**

   **Given** boundary refactoring changes transport wiring and caller contracts  
   **When** API routes and frontend callers are executed against real runtime flows  
   **Then** project create/list/get/pin/repin behavior remains runtime-correct (not only type-correct)  
   **And** compatibility shims are not permitted; migration is atomic within this story scope.

5. **Project-context onboarding seed/mapping alignment**

   **Given** onboarding canonical mapping is seeded for Epic 3 intake scope  
   **When** seed fixtures and table insertions are produced from BMAD sources  
   **Then** only `WU.PROJECT_CONTEXT` is seeded for this slice  
   **And** lifecycle is canonical `__absent__ -> done` for this slice  
   **And** transition condition sets remain canonical target model while `transition_required_links` is treated as migration debt only.

6. **Regression-proof deterministic verification**

   **Given** regression coverage is executed for publish, pin, projection, and project-context onboarding contracts  
   **When** deterministic tests run in CI  
   **Then** regressions observed in current Epic 1 and Epic 2 authority drift are prevented  
   **And** evidence artifacts and diagnostics references are produced for each verification group.

## In Scope

- Remove canonical authority drift for methodology canonical domains by enforcing table-only authority and no `definition_extensions_json` canonical fallback.
- Add explicit forbidden-key guardrails in validation and CI for canonical domains.
- Refactor project persistence ownership to `project-context` module boundary for create/list/get/pin/repin and related project-context persistence paths.
- Align API route wiring and frontend caller contracts (including methodology-builder paths) to the new boundary and prove runtime behavior, not only compile-time shape.
- Align onboarding seed/mapping to `WU.PROJECT_CONTEXT` only with canonical lifecycle `__absent__ -> done` and condition-set target semantics.
- Update methodology graph and work-unit graph shape for this slice to a single canonical `WU.PROJECT_CONTEXT` onboarding flow.
- Add deterministic regression suite coverage and evidence output for publish/pin/projection plus project-context onboarding integrity.

## Out of Scope

- New Epic 3 runtime execution features (transition execution engine behavior beyond stabilization prerequisites).
- Additional work-unit onboarding mapping beyond `WU.PROJECT_CONTEXT` for this story.
- Full removal of all `transition_required_links` fields from all layers in one cut; this story enforces non-authority status and controlled migration posture.
- Unrelated UX redesign work or non-boundary visual refactors.
- General dependency upgrade campaign unrelated to canonical authority and project-context boundary stabilization.

## Tasks / Subtasks

- [x] Canonical authority hardening (AC: 1, 2)
  - [x] Remove canonical read or fallback paths that source canonical domains from `definition_extensions_json`.
  - [x] Ensure canonical write paths persist canonical entities through canonical tables only.
  - [x] Add deterministic validation errors for forbidden canonical keys in extension payloads.
  - [x] Enforce dual CI hard gate for forbidden keys (runtime-path plus repo-wide) with no allowlist file.
- [x] Project-context ownership boundary refactor (AC: 3)
  - [x] Route project create/list/get/pin/repin persistence through `project-context` contracts and repositories.
  - [x] Remove project persistence ownership from `methodology-engine` surfaces.
  - [x] Remove direct imports of project persistence repositories/types from `methodology-engine`.
  - [x] Keep transport-level contracts stable and explicit across API and caller boundaries.
- [x] Runtime route and contract stabilization (AC: 4)
  - [x] Update API routes and frontend callers for boundary changes and runtime behavior parity.
  - [x] Rewire methodology-builder frontend flows to consume the boundary-aligned API contracts with no fallback path.
  - [x] Enforce atomic caller/route migration with no compatibility shim layer.
  - [x] Validate real runtime request-response paths for project operations and diagnostics propagation.
- [x] Seed and mapping realignment for onboarding scope (AC: 5)
  - [x] Seed only `WU.PROJECT_CONTEXT` for this onboarding slice.
  - [x] Enforce lifecycle `__absent__ -> done` for this slice.
  - [x] Update canonical methodology graph and work-unit graph nodes/edges for the single-work-unit onboarding model.
  - [x] Keep transition condition sets as canonical target and label `transition_required_links` as migration debt.
- [x] Regression-proof verification and evidence packaging (AC: 6)
  - [x] Add deterministic tests covering publish, pin, projection, and project-context onboarding contract integrity.
  - [x] Resolve currently failing regressions from authority debt and boundary drift before marking done.
  - [x] Produce traceable evidence and diagnostics outputs for CI and story closure.
- [x] Canonical methodology CRUD hierarchy finalization (AC: 1, 4, 5)
  - [x] Make canonical work-unit lifecycle/fact structures authoritative for create-draft, validation, workspace persistence, and transition graph editing.
  - [x] Refactor frontend methodology workspace from split draft fields to the agreed canonical hierarchy.
  - [x] Remove remaining `transition_required_links` repository/schema/migration-debt surfaces.
  - [x] Align seed and methodology workflow/step modeling more closely to the project-context mapping draft where still thin.

## Dev Notes

### Developer Context Section

- This is the final Epic 2 stabilization story before Epic 3; the goal is debt burn-down, not feature expansion.
- Authority rule is absolute: table-backed canonical domains are authoritative; `definition_extensions_json` is extension-only and non-authoritative.
- Known debt from Epic 2 retrospective and prior story learnings: extension payloads still leaked into active seed/runtime authority paths; this story closes that gap.
- Boundary rule is absolute: project persistence ownership moves to `project-context`; `methodology-engine` cannot continue to own project persistence.
- Runtime correctness requirement is absolute: route/caller alignment must be validated with real runtime flows, not mock-only or type-only checks.

### Technical Requirements

- Enforce canonical domain CRUD through canonical tables and canonical repositories only.
- Block forbidden canonical keys inside extension payloads (`workUnitTypes`, `agentTypes`, `transitions`, `workflows`, `transitionWorkflowBindings`, `factDefinitions`, `linkTypeDefinitions`).
- Enforce forbidden-key policy with dual CI hard gates: (1) active runtime-path payloads and (2) repo-wide payload scan; no exception/allowlist mechanism is permitted.
- Keep extension payload behavior additive/non-canonical only; no fallback reconstruction of canonical entities.
- Refactor project persistence APIs and internals so project CRUD and pinning semantics are owned by `project-context` boundary.
- Enforce hard dependency direction: API and callers may depend on `project-context`; `methodology-engine` must not import project persistence repositories/types.
- Rewire methodology-builder and project-facing frontend flows to boundary-aligned contracts; no shortcut calls to legacy ownership paths.
- Keep methodology graph and work-unit graph canonical for this slice with only `WU.PROJECT_CONTEXT` onboarding path.
- Keep transition condition sets as target canonical model and prohibit treating `transition_required_links` as source of truth in this slice.

### Architecture Compliance

- Preserve layered ownership: contracts -> db -> domain engine -> api -> web.
- Keep module boundaries explicit (`project-context` ownership for project persistence; methodology domains remain table-authoritative in methodology persistence layers).
- Do not introduce multi-repository write orchestration for single canonical save transactions where cohesive repository boundaries are required.
- Preserve deterministic diagnostics envelope and evidence traceability expected by Epic 2 and Epic 3 gate progression.

### Illegal Boundary Shortcuts (Explicitly Forbidden)

- `methodology-engine` importing project persistence repositories, tables, DB mappers, or write-model types from project persistence surfaces.
- `methodology-engine` invoking project create/list/get/pin/repin persistence writes directly.
- API routes bypassing `project-context` and writing project persistence through `methodology-engine`.
- Re-introducing adapter or shim code that routes project persistence ownership back into `methodology-engine`.
- Note: boundary-safe shared contracts are acceptable only when they do not grant project persistence ownership to `methodology-engine`.

### Library and Framework Requirements

- Use existing stack and patterns already present in repo (`effect`, `drizzle-orm`, `hono`, `@orpc/server`, React/TanStack).
- Latest registry checks captured for awareness (`effect@3.19.19`, `drizzle-orm@0.45.1`, `hono@4.12.5`, `@orpc/server@1.13.6`); no mandatory dependency churn is required to complete this story.

### File Structure Requirements

- Canonical persistence and boundary touches are expected in existing module surfaces rather than parallel shadow modules.
- Primary expected areas:
  - `packages/db/src/**`
  - `packages/methodology-engine/src/**`
  - `packages/api/src/routers/**`
  - `packages/scripts/src/seed/**`
  - `packages/scripts/src/story-seed-fixtures.ts`
  - `apps/web/src/routes/**` (caller/contract runtime alignment)
- Keep tests co-located with touched surfaces using existing `*.test.ts` and `*.integration.test.tsx` patterns.

### Testing Requirements

- Add deterministic tests that fail if canonical authority regresses back to extension fallback.
- Add deterministic tests for forbidden-key guardrails in save and seed flows.
- Add route/caller integration tests proving runtime correctness for create/list/get/pin/repin after boundary changes.
- Add onboarding seed and projection contract integrity checks for `WU.PROJECT_CONTEXT` canonical mapping.
- Ensure regression suite includes publish/pin/projection and project-context onboarding contract checks with stable diagnostics assertions.

## Definition of Done (Hard Checklist)

### 1) Canonical Authority Hardening

- [x] Canonical domains read/write canonical tables only.
- [x] `definition_extensions_json` is not used for canonical storage or fallback.
- [x] Forbidden-key guardrails are implemented and enforced in CI.
- [x] Forbidden-key CI enforcement is dual-gated (runtime-path + repo-wide) and contains no allowlist/exception path.

### 2) Project Ownership Boundary

- [x] Project create/list/get/pin/repin persistence flows through `project-context` module boundary.
- [x] Project-context persistence responsibilities are removed from `methodology-engine` ownership.
- [x] `methodology-engine` has no direct imports of project persistence repositories/types (hard-isolated boundary).

### 3) Route/Contract Stabilization (Runtime Correctness)

- [x] API routes and frontend callers are aligned to boundary changes.
- [x] Runtime flows are verified end-to-end for project operations (not only type checks).
- [x] Compatibility shims are absent; route/caller migration is atomic in this story.

### 4) Seed/Mapping Alignment for Onboarding Scope

- [x] Seed scope is `WU.PROJECT_CONTEXT` only.
- [x] Lifecycle for this slice is `__absent__ -> done`.
- [x] Methodology graph and work-unit graph for onboarding are canonical and single-work-unit (`WU.PROJECT_CONTEXT`) aligned.
- [x] Transition condition sets remain canonical target model.
- [x] `transition_required_links` is explicitly treated as migration debt, not canonical authority.

### 5) Regression-Proof Verification

- [x] Deterministic tests cover publish, pin, projection, and project-context onboarding contract integrity.
- [x] Previously failing authority/boundary regressions from current state are resolved.
- [x] Evidence and diagnostics artifacts are attached and referenced for closure.
- [x] Full audit pack is complete: test logs, structured runtime logs, forbidden-key rejection proofs, and dependency-boundary proof.

## Validation (Exact Commands + Expected Outcomes)

1. `bun run check`
   - Expected: PASS with no lint or format violations.

2. `bun run check-types`
   - Expected: PASS with no type errors after boundary refactor.

3. `bunx vitest run packages/db/src/methodology-repository.integration.test.ts`
   - Expected: PASS; canonical table roundtrip behavior remains authoritative and extension fallback is not used for canonical domains.

4. `bun run --cwd packages/methodology-engine test -- src/eligibility-service.test.ts`
   - Expected: PASS; gate and eligibility behavior stays deterministic while not restoring canonical authority to extension payloads.

5. `bun run --cwd packages/scripts test -- src/__tests__/story-seed-fixtures.test.ts`
   - Expected: PASS; onboarding seed fixtures align to `WU.PROJECT_CONTEXT` scope and canonical mapping assumptions.

6. `bun run --cwd packages/api test -- src/routers/methodology.test.ts`
   - Expected: PASS; publish/pin/projection contract integrity remains stable under canonical authority constraints.

7. `bun run --cwd apps/web test -- src/routes/-projects.integration.test.tsx src/routes/-projects.\$projectId.integration.test.tsx src/routes/-projects.\$projectId.pinning.integration.test.tsx`
   - Expected: PASS; runtime project create/list/get/pin/repin flows remain stable with aligned API route contracts.

8. `bun run test`
   - Expected: PASS for full deterministic regression suite on CI, including dual forbidden-key enforcement behavior.

9. `grep -RInE "from ['\"].*(project-context|project-repository|project-context-repository)" packages/methodology-engine/src`
   - Expected: no matches that import project persistence repositories/types into `methodology-engine`.

## Evidence Pack (Mandatory - Full Audit)

- `Test logs`: retain command outputs for Validation steps 1-9 with timestamps.
- `Structured runtime logs`: include Effect/Hono structured log lines for create/list/get/pin/repin and onboarding projection flows (request id, project id, operation, diagnostic code when present).
- `Forbidden-key rejection proofs`: include at least one API/service rejection case and one seed/fixture rejection case with deterministic diagnostic payload.
- `Dependency boundary proof`: include output for Validation step 9 and corresponding code references that show project persistence ownership remains in `project-context`.

## Debt Burn-Down (Epic 1 and Epic 2 Closure by This Story)

- [x] **E2 canonical authority drift closed:** canonical methodology payloads no longer rely on `definition_extensions_json` storage/fallback.
- [x] **E2 forbidden-key enforcement closed:** CI rejects forbidden canonical keys with dual hard gates (runtime-path + repo-wide) and no allowlist.
- [x] **E2 project ownership boundary debt closed:** project persistence is owned by `project-context`, not `methodology-engine`.
- [x] **E2 onboarding mapping coherence debt closed:** seed/mapping constrained to `WU.PROJECT_CONTEXT` with canonical lifecycle `__absent__ -> done`.
- [x] **E1 and E2 migration semantics debt closed for this slice:** transition condition sets treated as canonical target authority; required-links retained only as migration debt marker.
- [x] **Epic 3 unblock condition met:** no hidden deferred authority/boundary debt remains in canonical persistence or project-context ownership for onboarding runtime start.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming): preserve explicit module boundaries and keep project persistence in `project-context` surfaces.
- Detected variance to eliminate in this story: extension-authority fallback and mixed project ownership responsibilities.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.7: Enforce Canonical Methodology Persistence and Establish Project-Context Module Boundary]
- [Source: docs/architecture/methodology-canonical-authority.md]
- [Source: docs/architecture/project-context-only-bmad-mapping-draft.md]
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-03-07.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `git log --oneline -5`
- `bun pm view effect version`
- `bun pm view drizzle-orm version`
- `bun pm view hono version`
- `bun pm view @orpc/server version`
- `bun run check`
- `bun run check-types`
- `bun test src/methodology-repository.integration.test.ts`
- `bun run --cwd packages/methodology-engine test -- src/version-service.test.ts`
- `bun run --cwd packages/methodology-engine test -- src/eligibility-service.test.ts`
- `bun run --cwd packages/api test -- src/routers/methodology.test.ts`
- `bun run --cwd packages/scripts test -- src/__tests__/story-seed-fixtures.test.ts src/__tests__/methodology-seed-integrity.test.ts`
- `bun run test`
- `git diff -- packages/scripts/src/story-seed.mjs`
- `bun test src/features/methodologies/commands.test.ts`
- `bun test src/features/methodologies/version-workspace.persistence.test.ts`
- `bunx vitest run "src/features/methodologies/version-workspace.integration.test.tsx"`
- `bun run --cwd packages/methodology-engine test -- src/validation.test.ts`
- `bunx vitest run "src/features/methodologies/command-palette.integration.test.tsx"`
- `bun run --cwd packages/scripts test -- src/__tests__/methodology-seed-integrity.test.ts`
- `bun run --cwd packages/api test -- src/routers/methodology.test.ts`
- `bun run --cwd packages/methodology-engine test -- src/version-service.test.ts src/validation.test.ts`
- `bun run --cwd packages/methodology-engine test -- src/lifecycle-validation.test.ts src/version-service.test.ts src/eligibility-service.test.ts`
- `bunx vitest run "src/components/app-sidebar.integration.test.tsx" "src/components/app-shell.sidebar-sections.integration.test.tsx" "src/routes/methodologies.$methodologyId.integration.test.tsx" "src/routes/methodologies.$methodologyId.versions.integration.test.tsx"`

### Completion Notes List

- Story context generated from current repo state and planning artifacts with explicit hardening scope for final Epic 2 stabilization.
- Non-negotiable constraints encoded as testable Gherkin acceptance criteria and Definition of Done gates.
- Validation section defines exact commands and expected outcomes to prevent ambiguous completion claims.
- Updated API methodology router tests to synthesize lifecycle repository data from canonical version payloads, removing extension fallback assumptions and restoring publish/pin/projection determinism.
- Updated scripts and methodology-engine regression tests to reflect canonical fact validation defaults and current story seed inventory.
- Executed all validation commands, including full workspace tests and methodology-engine dependency boundary scan, with passing results.
- Corrected previous premature completion claim by reverting story status to `in-progress` and requiring AC-by-AC runtime evidence before any move to `review`.
- Implemented production ownership migration for project persistence: extracted project CRUD/pin/repin/lineage from `methodology-engine` into new `project-context` package, created dedicated DB layer adapter, and rewired API/server composition to `ProjectContextService`.
- Canonical lifecycle writes now persist through `LifecycleRepository.saveLifecycleDefinition`, with top-level transition inputs normalized into table-authoritative work-unit lifecycle state.
- `definition_extensions_json` is now extension-only for methodology drafts; repository saves reject forbidden canonical keys with deterministic `FORBIDDEN_EXTENSION_KEYS` diagnostics.
- Lifecycle read/projection flows now resolve canonical transition condition sets from `methodology_transition_condition_sets`; stale `requiredLinks` authority paths were removed from lifecycle services, validation, and API lifecycle input contracts.
- Added repo-wide onboarding seed integrity coverage proving `WU.PROJECT_CONTEXT`-only scope, canonical `__absent__ -> done`, empty `transition_required_links`, and condition-set authority for the seeded slice.
- Validation evidence captured with green runs for `bun run check`, `bun run check-types`, `bun run test`, targeted DB Bun integration, targeted methodology-engine suites, targeted API methodology suite, and targeted scripts seed-integrity suite.
- Corrected scope understanding: story remains `in-progress` because frontend methodology hierarchy, `transition_required_links` schema/repository cleanup, and deeper seed/workflow-step alignment are still incomplete foundation work.
- Canonical draft creation now starts from nested work-unit lifecycle state rather than top-level transition rows.
- Backend validation now accepts canonical nested lifecycle transitions without requiring top-level `transitions` payloads.
- Workspace persistence, transition graph editing, and work-unit fact editing now treat canonical work-unit structures as source-of-truth while split JSON fields remain compatibility mirrors only.
- Workspace hydration and persistence now also treat work-unit-owned workflows and transition `allowedWorkflowKeys` as canonical source-of-truth, with `workflowsJson`, `workflowStepsJson`, and `transitionWorkflowBindingsJson` retained only as compatibility mirrors during the frontend hierarchy migration.
- Removed `transition_required_links` from production schema/repository/seed surfaces; remaining mention is only the seed-integrity test asserting that the legacy table is absent.
- Expanded `setup-bmad-mapping` from thin `templateRef` stubs to richer workflow metadata plus explicit step `displayName`, `configJson`, and `guidanceJson`, including the fuller greenfield/brownfield `document-project` sequence and the full `generate-project-context` sequence from the mapping draft.
- Final verification completed with fresh green `bun run check`, `bun run check-types`, `bun run test`, and targeted web command-palette verification against the canonical create-draft payload.
- Added lightweight workflow model support for `metadata`, structured markdown `guidance`, and workflow-level `inputContract` / `outputContract`, with repository persistence/read support and seed coverage for the `WU.PROJECT_CONTEXT` slice.
- Seeded guidance JSON consistently across workflow rows, step rows, condition sets, and other guidance-capable seeded methodology entities using the agreed `{ human.markdown, agent.markdown }` shape.
- Normalized newly-enriched `descriptionJson` fields to the same `{ human.markdown, agent.markdown }` shape where applicable, including methodology fact definitions and lifecycle-state seed content.
- Simplified workflow IO contracts to fact-reference contracts (`factKey`, `displayName`, `required`, `validation`) rather than embedding a second pseudo-fact-definition model.
- Deferred two follow-up schema cleanups explicitly for later work: physical rename of `methodology_fact_schemas` and physical removal of the legacy `required` field on methodology fact definitions.
- Implemented the new shell IA: list/index pages remain in `System`, selected methodology pages switch into `Methodology`, and selected/new project pages switch into `Project`, with grouped methodology selector + version selector controls and Bitmap SVG context icons.
- Split the methodology overview from the versions ledger, added a reusable TanStack/shadcn-style `DataGrid`, and made the versions page the dedicated ledger while preserving the methodology dashboard as an overview page.
- Verified the live `/projects/new` flow via Playwright after seed and shell fixes: BMAD v1 published version selection works, project creation and pinning succeed, and the app lands on the new project dashboard with the expected methodology pin.
- Assessed renaming `methodology_fact_schemas` and deferred the physical rename to a follow-up (target candidate: 3.1) so the next agent can execute it as a focused migration once naming is finalized. Blast radius identified across DB schema (`packages/db/src/schema/methodology.ts`), lifecycle and methodology repositories (`packages/db/src/lifecycle-repository.ts`, `packages/db/src/methodology-repository.ts`), contracts (`packages/contracts/src/methodology/fact.ts`, `packages/contracts/src/methodology/lifecycle.ts`), seed exports (`packages/scripts/src/seed/methodology/index.ts`, `packages/scripts/src/seed/methodology/tables/methodology-fact-schemas.seed.ts`, `packages/scripts/src/story-seed.mjs`), frontend methodology workspace files (`apps/web/src/features/methodologies/**`), and a broad set of tests/docs. Recommendation: keep domain language aligned now (`workUnitFacts` vs `methodologyFacts`), then perform one explicit rename/reset pass later rather than mixing the table rename into ongoing model cleanup.
- Assessed legacy `required` on methodology fact definitions and deferred its physical removal to the same follow-up migration track. Current seed/model semantics already treat it as non-authoritative (`required: false` for the seeded methodology facts, with transition condition sets carrying real requiredness), but the column/field still exists in schema, repository mapping, preview logic, contracts, and tests. Recommendation: remove it later in one explicit cleanup pass alongside the fact-schema naming migration instead of mixing that churn into current 2.7 testing.

### File List

- `packages/api/src/routers/methodology.test.ts`
- `packages/api/src/routers/methodology.ts`
- `packages/api/src/routers/project.ts`
- `packages/api/src/routers/index.ts`
- `packages/api/package.json`
- `apps/web/src/features/methodologies/foundation.ts`
- `apps/web/src/features/methodologies/commands.ts`
- `apps/web/src/features/methodologies/commands.test.ts`
- `apps/web/src/features/methodologies/version-workspace.tsx`
- `apps/web/src/features/methodologies/version-workspace-graph.tsx`
- `apps/web/src/features/methodologies/version-workspace.persistence.test.ts`
- `apps/web/src/features/methodologies/version-workspace.integration.test.tsx`
- `apps/web/src/features/methodologies/command-palette.integration.test.tsx`
- `apps/web/src/components/app-shell.tsx`
- `apps/web/src/components/app-sidebar.tsx`
- `apps/web/src/components/sidebar-sections.tsx`
- `apps/web/src/components/data-grid.tsx`
- `apps/web/src/components/ui/table.tsx`
- `apps/web/src/components/app-sidebar.integration.test.tsx`
- `apps/web/src/components/app-shell.sidebar-sections.integration.test.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.integration.test.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.integration.test.tsx`
- `apps/web/public/visuals/context-switcher/system-asset-16.svg`
- `apps/web/public/visuals/context-switcher/methodology-asset-08.svg`
- `apps/web/public/visuals/context-switcher/project-asset-05.svg`
- `packages/db/src/methodology-repository.integration.test.ts`
- `packages/db/src/methodology-repository.ts`
- `packages/db/src/project-context-repository.ts`
- `packages/db/src/index.ts`
- `packages/db/package.json`
- `packages/project-context/package.json`
- `packages/project-context/tsconfig.json`
- `packages/project-context/src/index.ts`
- `packages/project-context/src/repository.ts`
- `packages/project-context/src/service.ts`
- `packages/methodology-engine/src/repository.ts`
- `packages/methodology-engine/src/version-service.ts`
- `packages/methodology-engine/src/version-service.test.ts`
- `packages/methodology-engine/src/errors.ts`
- `packages/methodology-engine/src/lifecycle-repository.ts`
- `packages/methodology-engine/src/lifecycle-service.ts`
- `packages/methodology-engine/src/lifecycle-validation.ts`
- `packages/methodology-engine/src/lifecycle-validation.test.ts`
- `packages/db/src/lifecycle-repository.ts`
- `packages/scripts/src/__tests__/story-seed-fixtures.test.ts`
- `packages/scripts/src/__tests__/methodology-seed-integrity.test.ts`
- `packages/scripts/src/story-seed.mjs`
- `apps/server/src/index.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-7-enforce-canonical-methodology-persistence-and-establish-project-context-module-boundary.md`
