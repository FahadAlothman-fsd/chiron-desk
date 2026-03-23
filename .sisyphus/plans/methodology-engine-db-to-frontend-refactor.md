# Methodology Engine DB-to-Frontend Refactor

## TL;DR
> **Summary**: Finish the in-flight methodology schema renames, then realign the methodology engine, API, and design-time web UI around explicit methodology/version/work-unit/workflow boundaries without changing existing route URLs.
> **Deliverables**:
> - DB schema, repository, seed, and integration test alignment for renamed tables/column
> - Contract and oRPC vocabulary cleanup across methodology packages
> - Methodology-engine service decomposition with `WorkUnitTypeService` owning lower-scope helpers internally
> - API router restructure and renamed procedures
> - Frontend module and test updates from ORPC client usage through route-level screens
> **Effort**: XL
> **Parallel**: YES - 4 waves
> **Critical Path**: 1 -> 2 -> 5 -> 7 -> 9 -> 11 -> 12 -> 13

## Context
### Original Request
Create an explicit, end-to-end implementation plan for finishing the methodology-engine refactor from database to frontend. Include the user's in-progress table renames, explain what changes across the stack, and leave zero executor judgment calls.

### Interview Summary
- The current design is too version-centric and should be realigned around methodology/version/work-unit/workflow boundaries.
- Backend and design-time UI both need to move to the same boundary model.
- oRPC/API vocabulary may be renamed; route URLs should stay stable if possible.
- Verification strategy is characterization-first, then refactor.
- `WorkUnitTypeService` should be the public owner for work-unit facts, state machine, artifact slots, and transitions; those lower-scope helpers should not remain peer top-level services unless independently required.

### Metis Review (gaps addressed)
- Defaulted to a one-shot API/type cutover with no long-lived aliases.
- Included DB migration completion/repair in this pass.
- Preserved all current methodology route URLs unless a conflict is proven.
- Switched seeds/manual seeds/tests atomically to the new vocabulary.
- Added explicit acceptance criteria for old-name eradication, migration correctness, transaction safety, API compile safety, and route-level smoke verification.

## Work Objectives
### Core Objective
Deliver a coherent methodology authoring stack where database schema, repositories, contracts, methodology-engine services, oRPC procedures, and frontend authoring screens all use the same terminology and the same ownership boundaries.

### Deliverables
- Propagated table/column renames for methodology dependency and work-unit state/transition vocabulary
- Completed DB/repository/test/seed alignment
- Decomposed methodology-engine service surface into scope-owned boundaries
- Renamed and reorganized methodology oRPC procedures to match those boundaries
- Updated methodology authoring UI modules and tests to use the renamed API and new service shape

### Definition of Done (verifiable conditions with commands)
- `rg -n "methodology_link_type_definitions|work_unit_lifecycle_states|work_unit_lifecycle_transitions|condition_json" packages apps` returns no matches outside intentionally preserved historical migration files.
- `bun test packages/db/src/tests/repository/methodology-repository.integration.test.ts packages/db/src/tests/repository/lifecycle-repository.integration.test.ts` passes.
- `bun test packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts` passes.
- `bun test packages/contracts/src/tests/methodology/version.test.ts packages/contracts/src/tests/packaging/package-entrypoint.test.ts` passes.
- `bun test packages/methodology-engine/src/tests/l1 packages/methodology-engine/src/tests/l2-l3 packages/methodology-engine/src/tests/versioning packages/methodology-engine/src/tests/validation packages/methodology-engine/src/tests/eligibility` passes.
- `bun test packages/api/src/tests/routers/methodology.test.ts packages/api/src/tests/smoke/smoke.test.ts` passes.
- `bun test apps/web/src/tests/routes apps/web/src/tests/features/methodologies` passes.
- `bun run check-types` passes at workspace root.

### Must Have
- Preserve existing methodology page URLs.
- Finish/repair DB rename propagation before higher-layer rename work depends on it.
- Keep domain behavior stable; do not change methodology semantics, workflow behavior, or UI flows unless characterization proves a current defect.
- Use work-unit-owned internal helper modules inside `WorkUnitTypeService` instead of keeping fact/artifact/state helpers as peer public services.

### Must NOT Have
- No long-lived compatibility adapters for old API names.
- No broad redesign of the methodology product model.
- No unrelated cleanup, formatting sweep, or UI redesign.
- No new top-level peer services unless an external caller truly requires them.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: characterization-first, then tests-after per seam using existing Bun/Vitest coverage.
- QA policy: Every task includes agent-executed happy-path and failure/edge scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: foundation and rename inventory (`1-4`)
Wave 2: contracts and engine boundaries (`5-8`)
Wave 3: API surface and tests (`9-10`)
Wave 4: frontend/client/module/test realignment (`11-13`)

### Dependency Matrix (full, all tasks)
- `1` Blocks `2-13`
- `2` Blocks `5-13`
- `3` Blocked by `2`; blocks `13`
- `4` Blocked by `2`; blocks `13`
- `5` Blocked by `2`; blocks `7-13`
- `6` Blocked by `2`; blocks `7-10`
- `7` Blocked by `5-6`; blocks `8-10`
- `8` Blocked by `5-7`; blocks `9-10`
- `9` Blocked by `5-8`; blocks `10-13`
- `10` Blocked by `9`; blocks `13`
- `11` Blocked by `5` and `9`; blocks `12-13`
- `12` Blocked by `9` and `11`; blocks `13`
- `13` Blocked by `3-4` and `10-12`

### Agent Dispatch Summary
- Wave 1 -> 4 tasks -> `unspecified-high`, `quick`
- Wave 2 -> 4 tasks -> `deep`, `unspecified-high`
- Wave 3 -> 2 tasks -> `unspecified-high`, `quick`
- Wave 4 -> 3 tasks -> `visual-engineering`, `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Establish rename characterization inventory

  **What to do**: Add characterization coverage and search-based assertions for the in-flight schema vocabulary changes before any refactor. Capture the exact old identifiers being removed, the active-code directories that must become clean, and the exception policy for historical migrations only. Add or update tests/search assertions in `packages/db/src/tests/repository/`, `packages/scripts/src/tests/seeding/`, `packages/api/src/tests/routers/`, and `apps/web/src/tests/` only where needed to lock current observable behavior before renaming internals.
  **Must NOT do**: Do not change production behavior, route URLs, or public API names in this task. Do not start service decomposition yet.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: spans multiple packages and requires precise characterization without mutation drift.
  - Skills: `[]` — Reason: existing repository findings are sufficient.
  - Omitted: `['test-driven-development']` — Reason: characterization-first is the agreed policy instead of pure red-green per feature.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: `2-13` | Blocked By: none

  **References**:
  - Pattern: `packages/db/src/schema/methodology.ts` — current source of renamed tables/column.
  - Pattern: `packages/db/src/tests/repository/methodology-repository.integration.test.ts` — DB integration assertions still use old table names.
  - Pattern: `packages/db/src/tests/repository/lifecycle-repository.integration.test.ts` — lifecycle integration assertions still use old table names.
  - Pattern: `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts` — seed coverage must be updated once names change.
  - Pattern: `packages/api/src/tests/routers/methodology.test.ts` — router behavior lock before procedure rename work.
  - Pattern: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx` — route-level behavior lock for work-unit flows.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `rg -n "methodology_link_type_definitions|work_unit_lifecycle_states|work_unit_lifecycle_transitions|condition_json" packages apps` is recorded and converted into task-local assertions or documented exceptions.
  - [ ] Characterization tests exist for current repository/API/web behavior that would fail if rename propagation or service split changes observable outputs unexpectedly.
  - [ ] Task evidence includes the baseline old-name match inventory and the baseline passing characterization commands.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Baseline rename inventory captured
    Tool: Bash
    Steps: Run `rg -n "methodology_link_type_definitions|work_unit_lifecycle_states|work_unit_lifecycle_transitions|condition_json" packages apps | tee .sisyphus/evidence/task-1-rename-inventory.txt`
    Expected: Output lists all active old-name references that downstream tasks must remove or intentionally exempt
    Evidence: .sisyphus/evidence/task-1-rename-inventory.txt

  Scenario: Characterization suite passes before refactor
    Tool: Bash
    Steps: Run `bun test packages/db/src/tests/repository/methodology-repository.integration.test.ts packages/db/src/tests/repository/lifecycle-repository.integration.test.ts packages/api/src/tests/routers/methodology.test.ts`
    Expected: Current behavior is captured with a green baseline before production refactor tasks begin
    Evidence: .sisyphus/evidence/task-1-characterization.txt
  ```

  **Commit**: YES | Message: `test(methodology): add rename characterization coverage` | Files: `packages/db/src/tests/repository/*`, `packages/scripts/src/tests/seeding/*`, `packages/api/src/tests/routers/methodology.test.ts`, `apps/web/src/tests/**/*methodologies*`

- [ ] 2. Propagate DB schema and repository renames

  **What to do**: Finish the active rename propagation starting from `packages/db/src/schema/methodology.ts`. Update table exports/imports and any raw field access so the active DB layer consistently uses `methodology_dependency_definitions`, `work_unit_states`, `work_unit_transitions`, and `description_json` for workflow edges. Create or repair the Drizzle migration output in `packages/db/src/migrations/` so a fresh database and an upgraded database both land on the same schema. Update `packages/db/src/schema/index.ts`, `packages/db/src/methodology-repository.ts`, and `packages/db/src/lifecycle-repository.ts` to the new names.
  **Must NOT do**: Do not rename unrelated tables or alter domain semantics. Do not edit historical migration files except to add a new forward migration or repair the in-flight rename migration path.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: DB schema, migrations, repositories, and raw SQL must move together.
  - Skills: `[]` — Reason: standard Drizzle/TypeScript refactor with repo-specific names.
  - Omitted: `['systematic-debugging']` — Reason: this is structured propagation, not failure triage.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: `5-13` | Blocked By: `1`

  **References**:
  - Pattern: `packages/db/src/schema/methodology.ts` — canonical source for active table and column names.
  - Pattern: `packages/db/src/schema/index.ts` — schema barrel that must export the renamed symbols.
  - Pattern: `packages/db/src/methodology-repository.ts` — currently imports old names and old `conditionJson` field.
  - Pattern: `packages/db/src/lifecycle-repository.ts` — currently imports old state/transition table names.
  - Pattern: `packages/db/drizzle.config.ts:8` — migration output path is `packages/db/src/migrations`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] TypeScript imports/exports in DB schema and repositories reference only the new names.
  - [ ] A forward migration exists in `packages/db/src/migrations/` that upgrades the renamed tables/column safely.
  - [ ] `bun test packages/db/src/tests/repository/methodology-repository.integration.test.ts packages/db/src/tests/repository/lifecycle-repository.integration.test.ts` passes.
  - [ ] `rg -n "methodologyLinkTypeDefinitions|workUnitLifecycleStates|workUnitLifecycleTransitions|conditionJson" packages/db` returns no matches outside intentional historical files.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Repository layer uses only renamed schema symbols
    Tool: Bash
    Steps: Run `rg -n "methodologyLinkTypeDefinitions|workUnitLifecycleStates|workUnitLifecycleTransitions|conditionJson" packages/db | tee .sisyphus/evidence/task-2-db-rename-scan.txt`
    Expected: No active-code references remain outside historical migration files
    Evidence: .sisyphus/evidence/task-2-db-rename-scan.txt

  Scenario: Repository integration tests pass on renamed schema
    Tool: Bash
    Steps: Run `bun test packages/db/src/tests/repository/methodology-repository.integration.test.ts packages/db/src/tests/repository/lifecycle-repository.integration.test.ts | tee .sisyphus/evidence/task-2-db-tests.txt`
    Expected: DB repositories pass against the new schema names with no missing-table or missing-column errors
    Evidence: .sisyphus/evidence/task-2-db-tests.txt
  ```

  **Commit**: YES | Message: `refactor(db): propagate methodology schema renames` | Files: `packages/db/src/schema/*`, `packages/db/src/methodology-repository.ts`, `packages/db/src/lifecycle-repository.ts`, `packages/db/src/migrations/*`

- [ ] 3. Align DB integration fixtures and repository tests

  **What to do**: Update raw SQL fixtures and repository integration assertions to the renamed table/column vocabulary. Rewrite any embedded `CREATE TABLE` statements, direct inserts, and expected row shape assertions in `packages/db/src/tests/repository/methodology-repository.integration.test.ts` and `packages/db/src/tests/repository/lifecycle-repository.integration.test.ts` so they exercise the new schema names explicitly.
  **Must NOT do**: Do not introduce compatibility helpers in tests; the fixtures must reflect the final active schema only.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: concentrated changes in known test files once schema names are final.
  - Skills: `[]` — Reason: straightforward test alignment.
  - Omitted: `['dispatching-parallel-agents']` — Reason: both files share the same rename inventory and should stay consistent.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: `13` | Blocked By: `2`

  **References**:
  - Test: `packages/db/src/tests/repository/methodology-repository.integration.test.ts` — contains raw SQL for dependency/state/transition tables.
  - Test: `packages/db/src/tests/repository/lifecycle-repository.integration.test.ts` — contains raw SQL for state/transition/condition fixtures.
  - Pattern: `packages/db/src/schema/methodology.ts` — expected final names.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Both repository integration test files use the new schema vocabulary exclusively.
  - [ ] Repository tests pass without helper aliases or fallback table names.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Repository test fixtures match renamed schema
    Tool: Bash
    Steps: Run `rg -n "methodology_link_type_definitions|work_unit_lifecycle_states|work_unit_lifecycle_transitions|condition_json" packages/db/src/tests/repository | tee .sisyphus/evidence/task-3-repo-test-scan.txt`
    Expected: No old-name matches remain in DB repository test files
    Evidence: .sisyphus/evidence/task-3-repo-test-scan.txt

  Scenario: Repository tests stay green after fixture rewrite
    Tool: Bash
    Steps: Run `bun test packages/db/src/tests/repository/methodology-repository.integration.test.ts packages/db/src/tests/repository/lifecycle-repository.integration.test.ts | tee .sisyphus/evidence/task-3-repo-tests.txt`
    Expected: Both repository suites pass with the renamed SQL fixtures
    Evidence: .sisyphus/evidence/task-3-repo-tests.txt
  ```

  **Commit**: NO | Message: `refactor(db): align repository integration fixtures` | Files: `packages/db/src/tests/repository/*`

- [ ] 4. Align seed tables, manual seed, and seed tests

  **What to do**: Update methodology seed table modules, seed index order, BMAD mapping setup, manual seed wiring, and seed integrity tests so the active seeding system uses the renamed tables only. Rename the dependency seed table module and lifecycle seed table references in `packages/scripts/src/seed/methodology/`, update `packages/scripts/src/manual-seed.mjs`, and ensure seed order still respects foreign keys.
  **Must NOT do**: Do not keep dual old/new seed maps. Do not reorder canonical seeding unless required by FK dependencies.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — Reason: mostly deterministic renames with a small ordering check.
  - Skills: `[]` — Reason: repo-local propagation only.
  - Omitted: `['artistry']` — Reason: no unconventional approach needed.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: `13` | Blocked By: `2`

  **References**:
  - Pattern: `packages/scripts/src/seed/methodology/index.ts` — canonical seed order and table-to-row mapping.
  - Pattern: `packages/scripts/src/manual-seed.mjs` — direct schema symbol map for manual seeding.
  - Pattern: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts` — seed setup with old vocabulary references.
  - Test: `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts` — seed correctness assertions.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Active seed modules, manual seed wiring, and seed tests use only new table names.
  - [ ] `bun test packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts` passes.
  - [ ] Any seed command or seed helper used in tests can hydrate a clean DB without missing-table errors.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Seed sources use only renamed table names
    Tool: Bash
    Steps: Run `rg -n "methodology_link_type_definitions|work_unit_lifecycle_states|work_unit_lifecycle_transitions" packages/scripts | tee .sisyphus/evidence/task-4-seed-scan.txt`
    Expected: No active seed/manual-seed references remain to the old names
    Evidence: .sisyphus/evidence/task-4-seed-scan.txt

  Scenario: Seed integrity suite passes
    Tool: Bash
    Steps: Run `bun test packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts | tee .sisyphus/evidence/task-4-seed-tests.txt`
    Expected: Seed ordering and row maps remain valid after the rename propagation
    Evidence: .sisyphus/evidence/task-4-seed-tests.txt
  ```

  **Commit**: YES | Message: `refactor(seeds): align methodology fixtures with renamed tables` | Files: `packages/scripts/src/seed/methodology/**/*`, `packages/scripts/src/manual-seed.mjs`, `packages/scripts/src/tests/seeding/*`

- [ ] 5. Rename methodology contracts and exported vocabulary

  **What to do**: Update methodology contract modules so DB/API/frontend share the same vocabulary. Replace `link type` naming with `dependency definition`, remove `lifecycle` wording where the refactor target is simply `state` or `transition`, and replace UI-leaky names such as dialog/projection/draft where the type represents a scope or snapshot rather than a screen. Update `packages/contracts/src/methodology/dependency.ts`, `lifecycle.ts`, `version.ts`, `workflow.ts`, `dto.ts`, `projection.ts`, `domain.ts`, and `index.ts` so exported type names, schema names, and field names match the final stack vocabulary.
  **Must NOT do**: Do not change domain semantics or payload shape beyond the agreed rename/ownership cleanup. Do not introduce both old and new type exports in the same public contract surface.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: contract changes cascade into engine, API, and web packages.
  - Skills: `[]` — Reason: repo-local schema vocabulary is already mapped.
  - Omitted: `['writing']` — Reason: this is code contract work, not prose docs.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: `7-13` | Blocked By: `2`

  **References**:
  - Pattern: `packages/contracts/src/methodology/dependency.ts` — target module for dependency-definition vocabulary.
  - Pattern: `packages/contracts/src/methodology/lifecycle.ts` — currently aggregates work-unit state/transition concepts under lifecycle naming.
  - Pattern: `packages/contracts/src/methodology/version.ts` — version-level snapshot types that still leak draft/projection vocabulary.
  - Pattern: `packages/contracts/src/methodology/projection.ts` — candidate for workspace-snapshot terminology cleanup.
  - Pattern: `packages/contracts/src/methodology/index.ts` — barrel export that must remain internally consistent.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Active methodology contracts export only the new dependency/state/transition vocabulary.
  - [ ] `bun test packages/contracts/src/tests/methodology/version.test.ts packages/contracts/src/tests/packaging/package-entrypoint.test.ts` passes.
  - [ ] `bun run check-types` passes for contracts consumers after the rename.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Contract surface no longer exports old methodology vocabulary
    Tool: Bash
    Steps: Run `rg -n "LinkType|linkTypeDefinitions|LifecycleState|LifecycleTransition|DraftProjection|saveWorkUnitLifecycleTransitionDialog" packages/contracts | tee .sisyphus/evidence/task-5-contract-scan.txt`
    Expected: No active contract exports retain the old vocabulary unless intentionally renamed test fixtures are isolated
    Evidence: .sisyphus/evidence/task-5-contract-scan.txt

  Scenario: Contract tests and package entrypoints pass
    Tool: Bash
    Steps: Run `bun test packages/contracts/src/tests/methodology/version.test.ts packages/contracts/src/tests/packaging/package-entrypoint.test.ts | tee .sisyphus/evidence/task-5-contract-tests.txt`
    Expected: Schema codecs and package exports remain valid after the rename cutover
    Evidence: .sisyphus/evidence/task-5-contract-tests.txt
  ```

  **Commit**: NO | Message: `refactor(contracts): align methodology vocabulary` | Files: `packages/contracts/src/methodology/*`, `packages/contracts/src/tests/**/*`

- [ ] 6. Narrow repository ports to scope-owned interfaces

  **What to do**: Reduce the god-interface role of `packages/methodology-engine/src/repository.ts` by finalizing scope-specific ports and moving each service to the narrowest repository dependency it needs. Keep DB implementations in `packages/db`, but update engine-side ports so version-scoped services consume version metadata operations, work-unit services consume work-unit state/fact/artifact operations, and workflow services consume workflow-specific operations. Use existing port files (`version-repository.ts`, `work-unit-repository.ts`, `workflow-repository.ts`, `methodology-tx.ts`) and create only the additional port files strictly needed to avoid leaking unrelated methods.
  **Must NOT do**: Do not duplicate repository logic in multiple places. Do not leave new services depending on the old all-purpose `MethodologyRepository` if a narrower port exists.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: interface boundaries determine the engine split and future DI graph.
  - Skills: `[]` — Reason: repo analysis already identified the current coupling points.
  - Omitted: `['artistry']` — Reason: conventional boundary refactor.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: `7-10` | Blocked By: `2`

  **References**:
  - Pattern: `packages/methodology-engine/src/repository.ts` — current god interface.
  - Pattern: `packages/methodology-engine/src/ports/version-repository.ts` — existing version port.
  - Pattern: `packages/methodology-engine/src/ports/work-unit-repository.ts` — existing work-unit port.
  - Pattern: `packages/methodology-engine/src/ports/workflow-repository.ts` — existing workflow port.
  - Pattern: `packages/db/src/methodology-repository.ts` — DB implementation to adapt behind the narrowed ports.
  - Pattern: `packages/db/src/lifecycle-repository.ts` — lifecycle/state implementation to adapt behind narrowed ports.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Each new or updated methodology-engine service depends on the narrowest port that satisfies its methods.
  - [ ] `packages/methodology-engine/src/repository.ts` no longer acts as the default dependency for all authoring services.
  - [ ] `bun run check-types` passes with the new ports and layer wiring.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Engine services no longer import the god repository by default
    Tool: Bash
    Steps: Run `rg -n "yield\* MethodologyRepository|from \"\.\./repository\"" packages/methodology-engine/src/services | tee .sisyphus/evidence/task-6-port-scan.txt`
    Expected: Only services that genuinely need the broad repository retain that dependency; new scope services use narrow ports
    Evidence: .sisyphus/evidence/task-6-port-scan.txt

  Scenario: Type-check succeeds with narrowed ports
    Tool: Bash
    Steps: Run `bun run check-types | tee .sisyphus/evidence/task-6-typecheck.txt`
    Expected: No missing-method or missing-layer errors remain after the port split
    Evidence: .sisyphus/evidence/task-6-typecheck.txt
  ```

  **Commit**: NO | Message: `refactor(engine): narrow methodology repository ports` | Files: `packages/methodology-engine/src/repository.ts`, `packages/methodology-engine/src/ports/*`, `packages/db/src/*repository*.ts`

- [ ] 7. Introduce `WorkUnitTypeService` as the public work-unit owner

  **What to do**: Create `packages/methodology-engine/src/services/work-unit-type-service.ts` as the public work-unit authoring boundary. Inside that service, implement owned helper modules under `packages/methodology-engine/src/services/internal/` for facts, state machine, and artifact slots; keep transitions inside the state-machine helper. Migrate logic out of `work-unit-fact-service.ts`, `work-unit-state-machine-service.ts`, and `work-unit-artifact-slot-service.ts` into the new boundary. Leave thin compatibility exports only if required transiently inside the engine package during the same commit, then remove them before task completion.
  **Must NOT do**: Do not create new peer `Context.Tag`s for each subdomain. Do not leave facts/artifact/state logic primarily delegated through `MethodologyVersionService`.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this is the key domain-boundary move with Effect-specific ownership rules.
  - Skills: `[]` — Reason: the service ownership pattern is already decided.
  - Omitted: `['better-auth-best-practices']` — Reason: unrelated domain.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: `8-10` | Blocked By: `5-6`

  **References**:
  - Pattern: `packages/methodology-engine/src/services/work-unit-fact-service.ts` — current facade to absorb.
  - Pattern: `packages/methodology-engine/src/services/work-unit-state-machine-service.ts` — current real subdomain logic to absorb.
  - Pattern: `packages/methodology-engine/src/services/work-unit-artifact-slot-service.ts` — current facade to absorb.
  - Pattern: `packages/methodology-engine/src/services/work-unit-service.ts` — current interface-only placeholder.
  - Pattern: `packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts` — characterization surface for L2/L3 service behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `WorkUnitTypeService` is the only public work-unit authoring service depended on by API/router callers.
  - [ ] Facts, state machine, artifact slots, and transitions are implemented as owned helper modules/functions under the work-unit boundary.
  - [ ] `bun test packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts` passes.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Work-unit helper services no longer remain peer public boundaries
    Tool: Bash
    Steps: Run `rg -n "WorkUnitFactService|WorkUnitStateMachineService|WorkUnitArtifactSlotService" packages/methodology-engine/src packages/api/src | tee .sisyphus/evidence/task-7-work-unit-boundary-scan.txt`
    Expected: API-facing code depends on `WorkUnitTypeService`; old helper services are removed or fully internalized
    Evidence: .sisyphus/evidence/task-7-work-unit-boundary-scan.txt

  Scenario: Work-unit service suite passes after consolidation
    Tool: Bash
    Steps: Run `bun test packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts | tee .sisyphus/evidence/task-7-work-unit-tests.txt`
    Expected: Work-unit authoring behavior remains unchanged while the public boundary is consolidated
    Evidence: .sisyphus/evidence/task-7-work-unit-tests.txt
  ```

  **Commit**: YES | Message: `refactor(engine): realign work-unit authoring boundary` | Files: `packages/methodology-engine/src/services/work-unit-type-service.ts`, `packages/methodology-engine/src/services/internal/*`, `packages/methodology-engine/src/tests/l2-l3/*`

- [ ] 8. Split methodology and version services by scope and update layer wiring

  **What to do**: Shrink `packages/methodology-engine/src/services/methodology-version-service.ts` and `packages/methodology-engine/src/version-service.ts` so methodology catalog concerns, version metadata concerns, work-unit concerns, and workflow concerns are no longer collapsed into one version-centric service. Create exact scope services at `packages/methodology-engine/src/services/methodology-service.ts`, `packages/methodology-engine/src/services/version-service.ts` (metadata/status/publication only), and `packages/methodology-engine/src/services/workflow-definition-service.ts` if workflow metadata still needs a dedicated public boundary. Update `packages/methodology-engine/src/layers/live.ts` and `packages/methodology-engine/src/index.ts` to export only the new intended boundaries.
  **Must NOT do**: Do not change transaction semantics, validation semantics, or publication behavior. Do not keep UI-leaky or status-leaky method names such as `getDraftProjection` or dialog-based mutations.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this is the core service decomposition and DI rewrite.
  - Skills: `[]` — Reason: findings already identify the split boundaries.
  - Omitted: `['dispatching-parallel-agents']` — Reason: shared files and layer wiring make this serial.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: `9-10` | Blocked By: `5-7`

  **References**:
  - Pattern: `packages/methodology-engine/src/services/methodology-version-service.ts` — primary god service to shrink.
  - Pattern: `packages/methodology-engine/src/version-service.ts` — hidden core god service to narrow.
  - Pattern: `packages/methodology-engine/src/services/workflow-service.ts` — current workflow-specific logic to either rename or absorb.
  - Pattern: `packages/methodology-engine/src/services/methodology-validation-service.ts` — validation wrapper to keep aligned with new service names.
  - Pattern: `packages/methodology-engine/src/layers/live.ts` — layer graph to rewire.
  - Pattern: `packages/methodology-engine/src/index.ts` — public exports to realign.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Methodology-engine exports explicit methodology/version/work-unit/workflow boundaries instead of one version-centric façade.
  - [ ] Validation, publication, and version event history still produce identical observable outputs under characterization tests.
  - [ ] `bun test packages/methodology-engine/src/tests/l1 packages/methodology-engine/src/tests/versioning packages/methodology-engine/src/tests/validation packages/methodology-engine/src/tests/eligibility` passes.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Engine export surface matches target boundaries
    Tool: Bash
    Steps: Run `bun test packages/methodology-engine/src/tests/l1/l1-port-exports.characterization.test.ts packages/methodology-engine/src/tests/l1/l1-route-boundary.characterization.test.ts | tee .sisyphus/evidence/task-8-engine-boundary-tests.txt`
    Expected: L1 export and route-boundary characterization stays green after the split
    Evidence: .sisyphus/evidence/task-8-engine-boundary-tests.txt

  Scenario: Core engine suites stay green after service split
    Tool: Bash
    Steps: Run `bun test packages/methodology-engine/src/tests/versioning/version-service.test.ts packages/methodology-engine/src/tests/validation/lifecycle-validation.test.ts packages/methodology-engine/src/tests/eligibility/eligibility-service.test.ts | tee .sisyphus/evidence/task-8-engine-tests.txt`
    Expected: Versioning, validation, and eligibility behaviors remain stable after the boundary realignment
    Evidence: .sisyphus/evidence/task-8-engine-tests.txt
  ```

  **Commit**: YES | Message: `refactor(engine): realign methodology service boundaries` | Files: `packages/methodology-engine/src/services/*`, `packages/methodology-engine/src/version-service.ts`, `packages/methodology-engine/src/layers/live.ts`, `packages/methodology-engine/src/index.ts`

- [ ] 9. Rename methodology API contracts and restructure the router by scope

  **What to do**: Replace the version-centric, UI-leaky procedure surface in `packages/api/src/routers/methodology.ts` with scope-named procedures that match the new engine boundaries. Keep the top-level methodology router entrypoint stable in `packages/api/src/routers/index.ts`, but internally split the large router into clearly named scope sections or extracted subrouter modules under `packages/api/src/routers/methodology/` if needed. Rename procedures away from terms such as `getDraftProjection`, `saveWorkUnitLifecycleTransitionDialog`, and ambiguous `replace*` verbs unless the operation is truly a replace-all.
  **Must NOT do**: Do not keep both old and new procedure names in the public router. Do not change route URLs in the web app as part of API renaming.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: large oRPC surface with direct engine coupling.
  - Skills: `[]` — Reason: procedure rename mapping is already established.
  - Omitted: `['hono']` — Reason: this is router contract organization, not HTTP handler design.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: `10-13` | Blocked By: `5-8`

  **References**:
  - Pattern: `packages/api/src/routers/methodology.ts` — current 2500-line API surface.
  - Pattern: `packages/api/src/routers/index.ts` — top-level router export point that should stay stable.
  - Pattern: `packages/api/src/context.ts` — service access and layer provisioning.
  - Pattern: `packages/contracts/src/methodology/*.ts` — renamed contracts that define final procedure input/output types.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Public methodology procedure names match the final methodology/version/work-unit/workflow vocabulary with no long-lived aliases.
  - [ ] Router implementation calls the new engine boundaries instead of the old god service surface.
  - [ ] `bun run check-types` passes and web/API consumers compile against the renamed router shape.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Router surface no longer exposes old procedure names
    Tool: Bash
    Steps: Run `rg -n "getDraftProjection|saveWorkUnitLifecycleTransitionDialog|replaceTransitionBindings|updateDraftWorkflows|createWorkUnit\b|updateWorkUnit\b" packages/api/src/routers | tee .sisyphus/evidence/task-9-router-scan.txt`
    Expected: Old UI-leaky or scope-misaligned procedure names are removed from the active API router
    Evidence: .sisyphus/evidence/task-9-router-scan.txt

  Scenario: Workspace type-check passes after router rename
    Tool: Bash
    Steps: Run `bun run check-types | tee .sisyphus/evidence/task-9-router-typecheck.txt`
    Expected: oRPC server and downstream consumers compile cleanly with the renamed procedures
    Evidence: .sisyphus/evidence/task-9-router-typecheck.txt
  ```

  **Commit**: YES | Message: `refactor(api): rename methodology procedures by scope` | Files: `packages/api/src/routers/methodology.ts`, `packages/api/src/routers/index.ts`, optional `packages/api/src/routers/methodology/*`

- [ ] 10. Update API router tests and smoke coverage for the renamed surface

  **What to do**: Rewrite methodology router tests and smoke tests to target the renamed procedures and new service boundaries. Update mocks, helper builders, and expectation names in `packages/api/src/tests/routers/methodology.test.ts` and `packages/api/src/tests/smoke/smoke.test.ts` so they assert the final API vocabulary and behavior.
  **Must NOT do**: Do not leave tests calling removed procedure names through compatibility shims.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: once the router is settled, test rewrites are localized.
  - Skills: `[]` — Reason: standard Vitest/oRPC update.
  - Omitted: `['systematic-debugging']` — Reason: tests should mirror the now-final router shape.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: `13` | Blocked By: `9`

  **References**:
  - Test: `packages/api/src/tests/routers/methodology.test.ts` — primary router coverage.
  - Test: `packages/api/src/tests/smoke/smoke.test.ts` — smoke coverage that must continue to pass.
  - Pattern: `packages/api/src/routers/methodology.ts` — final procedure surface.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Router tests target only the renamed procedure surface.
  - [ ] `bun test packages/api/src/tests/routers/methodology.test.ts packages/api/src/tests/smoke/smoke.test.ts` passes.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Router tests no longer reference removed procedure names
    Tool: Bash
    Steps: Run `rg -n "getDraftProjection|saveWorkUnitLifecycleTransitionDialog|replaceTransitionBindings|updateDraftWorkflows" packages/api/src/tests | tee .sisyphus/evidence/task-10-api-test-scan.txt`
    Expected: API tests reference only the final procedure names
    Evidence: .sisyphus/evidence/task-10-api-test-scan.txt

  Scenario: API tests pass on renamed router surface
    Tool: Bash
    Steps: Run `bun test packages/api/src/tests/routers/methodology.test.ts packages/api/src/tests/smoke/smoke.test.ts | tee .sisyphus/evidence/task-10-api-tests.txt`
    Expected: Router and smoke suites pass without compatibility layers
    Evidence: .sisyphus/evidence/task-10-api-tests.txt
  ```

  **Commit**: NO | Message: `test(api): align methodology router coverage` | Files: `packages/api/src/tests/routers/methodology.test.ts`, `packages/api/src/tests/smoke/smoke.test.ts`

- [ ] 11. Update frontend ORPC usage, query keys, and methodology foundations

  **What to do**: Update web-side ORPC imports, query keys, selectors, and feature foundations to the renamed API and boundary model before touching the large route modules. Refactor `apps/web/src/features/methodologies/foundation.ts`, `commands.ts`, `command-palette.tsx`, `command-palette-navigation.ts`, `version-workspace.tsx`, `version-workspace-author-hub-actions.ts`, and any shared query helpers/selectors so they call the final methodology/version/work-unit/workflow procedures and expose the new field names to the rest of the UI.
  **Must NOT do**: Do not change route path strings. Do not redesign the UI; this task is data-access and shared-state alignment only.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: shared client/query state fans out into all methodology screens.
  - Skills: `[]` — Reason: existing web architecture patterns are already mapped.
  - Omitted: `['visual-engineering']` — Reason: no visual redesign is needed here.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: `12-13` | Blocked By: `5` and `9`

  **References**:
  - Pattern: `apps/web/src/features/methodologies/foundation.ts` — shared methodology/view-model types.
  - Pattern: `apps/web/src/features/methodologies/commands.ts` — command definitions keyed to ORPC procedures.
  - Pattern: `apps/web/src/features/methodologies/command-palette.tsx` — command palette behavior.
  - Pattern: `apps/web/src/features/methodologies/version-workspace.tsx` — largest shared data-state consumer.
  - Pattern: `apps/web/src/features/methodologies/work-units-page-selectors.ts` — selector layer for work-unit screens.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Shared methodology feature modules compile against the renamed ORPC surface.
  - [ ] Query invalidation keys and selectors use the final scope vocabulary.
  - [ ] `bun run check-types` passes before route-module rewrites begin.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Shared feature layer no longer references removed API vocabulary
    Tool: Bash
    Steps: Run `rg -n "getDraftProjection|saveWorkUnitLifecycleTransitionDialog|replaceTransitionBindings|linkTypeDefinitions|LifecycleTransition" apps/web/src/features/methodologies | tee .sisyphus/evidence/task-11-web-foundation-scan.txt`
    Expected: Shared feature modules use only the final API and vocabulary names
    Evidence: .sisyphus/evidence/task-11-web-foundation-scan.txt

  Scenario: Web type-check passes after shared client alignment
    Tool: Bash
    Steps: Run `bun run check-types | tee .sisyphus/evidence/task-11-web-typecheck.txt`
    Expected: Shared web modules compile cleanly against the renamed contracts/router
    Evidence: .sisyphus/evidence/task-11-web-typecheck.txt
  ```

  **Commit**: NO | Message: `refactor(web): align methodology shared clients and selectors` | Files: `apps/web/src/features/methodologies/*`

- [ ] 12. Realign methodology route modules and work-unit tabs by scope

  **What to do**: Refactor the large methodology route files so each screen uses the final scope boundary explicitly while preserving URLs. Update `apps/web/src/routes/methodologies.$methodologyId.tsx`, `methodologies.$methodologyId.versions.$versionId.tsx`, `methodologies.$methodologyId.versions.$versionId.work-units.tsx`, `methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`, `methodologies.$methodologyId.versions.$versionId.facts.tsx`, `methodologies.$methodologyId.versions.$versionId.agents.tsx`, and `methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`. Move work-unit and workflow-specific UI logic out of version-heavy modules where necessary, and update the work-unit L2 tabs in `apps/web/src/features/methodologies/work-unit-l2/` so facts, workflows, state machine, and artifact slots each call the correct renamed procedures.
  **Must NOT do**: Do not alter path strings, page information architecture, or dialog behavior beyond what the renamed API and boundary split require.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: large UI modules need careful structural refactoring while preserving screen behavior.
  - Skills: `[]` — Reason: existing UI patterns are already known and route URLs stay stable.
  - Omitted: `['web-design-guidelines']` — Reason: this is architecture-preserving, not a design audit.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: `13` | Blocked By: `9` and `11`

  **References**:
  - Pattern: `apps/web/src/routes/methodologies.$methodologyId.tsx` — methodology-level dashboard.
  - Pattern: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx` — version workspace shell.
  - Pattern: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx` — work-unit list/create/edit route.
  - Pattern: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` — work-unit detail shell.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx` — work-unit fact tab.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx` — workflow metadata tab.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` — state/transition tab.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx` — artifact slot tab.

  **Acceptance Criteria** (agent-executable only):
  - [ ] All methodology authoring routes compile and use the final ORPC procedure names.
  - [ ] Existing methodology route URLs still resolve to the same pages.
  - [ ] Work-unit tabs are aligned to work-unit/workflow boundaries instead of version-centric state.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Route files use only the renamed procedure surface
    Tool: Bash
    Steps: Run `rg -n "getDraftProjection|saveWorkUnitLifecycleTransitionDialog|replaceTransitionBindings|updateDraftWorkflows|linkTypeDefinitions" apps/web/src/routes apps/web/src/features/methodologies/work-unit-l2 | tee .sisyphus/evidence/task-12-route-scan.txt`
    Expected: Route modules and work-unit tabs reference only the final procedure and field names
    Evidence: .sisyphus/evidence/task-12-route-scan.txt

  Scenario: Route-level methodology smoke path compiles and renders
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx | tee .sisyphus/evidence/task-12-route-tests.txt`
    Expected: Methodology, version, and work-unit route suites pass with stable URLs and renamed data access
    Evidence: .sisyphus/evidence/task-12-route-tests.txt
  ```

  **Commit**: YES | Message: `refactor(web): realign methodology authoring modules` | Files: `apps/web/src/routes/*methodologies*`, `apps/web/src/features/methodologies/work-unit-l2/*`, `apps/web/src/features/methodologies/*`

- [ ] 13. Update frontend feature tests and end-to-end methodology smoke coverage

  **What to do**: Rewrite methodology feature tests, integration tests, and final smoke assertions so the renamed API and boundary model are fully covered. Update feature tests in `apps/web/src/tests/features/methodologies/` and route tests in `apps/web/src/tests/routes/`. Add or update one end-to-end methodology authoring smoke path that proves the stack still works from methodology page -> version workspace -> work-unit detail -> workflow-related action using current URLs.
  **Must NOT do**: Do not leave green tests that still mock removed field names or removed procedures.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: this is the final web safety net spanning many screens.
  - Skills: `[]` — Reason: existing test suite gives the patterns.
  - Omitted: `['playwright']` — Reason: use existing test harness first; use Playwright only if the repo already has that path for methodology UI.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: none | Blocked By: `3-4` and `10-12`

  **References**:
  - Test: `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx`
  - Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx`
  - Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
  - Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`
  - Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`
  - Test: `apps/web/src/tests/features/methodologies/version-workspace.integration.test.tsx`
  - Test: `apps/web/src/tests/features/methodologies/version-workspace-author-hub.test.tsx`
  - Test: `apps/web/src/tests/features/methodologies/work-units-graph-view.test.tsx`

  **Acceptance Criteria** (agent-executable only):
  - [ ] Web route and feature tests reference only the final API/type vocabulary.
  - [ ] `bun test apps/web/src/tests/routes apps/web/src/tests/features/methodologies` passes.
  - [ ] One end-to-end methodology authoring smoke flow proves stable URLs and renamed stack integration.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Web tests no longer reference removed API/type names
    Tool: Bash
    Steps: Run `rg -n "getDraftProjection|saveWorkUnitLifecycleTransitionDialog|replaceTransitionBindings|linkTypeDefinitions|work_unit_lifecycle_" apps/web/src/tests | tee .sisyphus/evidence/task-13-web-test-scan.txt`
    Expected: No old vocabulary remains in methodology web tests
    Evidence: .sisyphus/evidence/task-13-web-test-scan.txt

  Scenario: Full methodology web suite passes
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes apps/web/src/tests/features/methodologies | tee .sisyphus/evidence/task-13-web-tests.txt`
    Expected: Methodology web integration and feature suites pass with the new boundaries and renamed API
    Evidence: .sisyphus/evidence/task-13-web-tests.txt
  ```

  **Commit**: YES | Message: `test(methodology): add end-to-end verification coverage` | Files: `apps/web/src/tests/routes/*methodologies*`, `apps/web/src/tests/features/methodologies/*`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after each major layer turns green: characterization coverage, DB/repository rename propagation, seeds/tests alignment, engine boundary split, API rename cutover, frontend realignment, final smoke coverage.
- Commit message sequence:
  - `test(methodology): add rename characterization coverage`
  - `refactor(db): propagate methodology schema renames`
  - `refactor(seeds): align methodology fixtures with renamed tables`
  - `refactor(engine): realign methodology service boundaries`
  - `refactor(api): rename methodology procedures by scope`
  - `refactor(web): realign methodology authoring modules`
  - `test(methodology): add end-to-end verification coverage`

## Success Criteria
- Old DB vocabulary is fully removed from active code.
- Methodology-engine public boundaries match methodology/version/work-unit/workflow ownership.
- API contracts and procedure names use the same vocabulary as the DB/contracts/UI.
- Existing methodology URLs still work.
- DB, engine, API, and web tests all pass without manual intervention.
