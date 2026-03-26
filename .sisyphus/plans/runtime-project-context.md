# Runtime Project Context Model

## TL;DR
> **Summary**: Add the first persisted runtime L1/L2 project-context model for Chiron by extending methodology fact definitions with explicit cardinality, introducing durable runtime tables for work units and fact instances, and wiring a persisted runtime evaluator that reads pinned methodology definitions plus current runtime state.
> **Deliverables**:
> - Methodology definition support for fact cardinality and `work_unit_reference`
> - Runtime tables: `project_work_units`, `project_fact_instances`, `work_unit_fact_instances`
> - Extended `@chiron/project-context` repository/service/runtime-loading seam
> - Persisted transition-condition evaluation path integrated into current project read flows
> - DB/repository/service/API verification coverage for runtime L1/L2 behavior
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8

## Context
### Original Request
- Create a decision-complete runtime/project-context plan for Chiron focused on execution-time/runtime L1/L2 only.
- Primary entity scope: `project_work_units`, `project_fact_instances`, `work_unit_fact_instances`.
- Explicitly define runtime identity/lifecycle state, methodology-definition mappings, separate fact cardinality, supported value shapes, runtime dependency references, transition-condition evaluation, and interaction with `project_methodology_pins` and `project_executions`.
- Exclude design-time seeding redesign and L3 workflow step/edge runtime.

### Interview Summary
- Current runtime persistence authority is `packages/db/src/schema/project.ts:7-86`, which only contains `projects`, `project_methodology_pins`, `project_methodology_pin_events`, and a minimal `project_executions`.
- Current runtime write seam is already established in `packages/project-context/src/repository.ts:45-82`, `packages/project-context/src/service.ts:74-100`, and `packages/db/src/project-context-repository.ts`.
- Methodology definition authority already exists in `packages/db/src/schema/methodology.ts:71-276` for methodology facts, work-unit types, lifecycle states/transitions, and work-unit facts.
- Current transition gating in `packages/api/src/routers/project.ts:375-484` still derives active fact values from methodology defaults and invokes the pure in-memory evaluator in `packages/project-context/src/transition-condition-evaluator.ts:33-251`.

### Metis Review (gaps addressed)
- Closed identity strategy: runtime rows reference methodology definitions by DB ID and carry `methodology_version_id` as an explicit version anchor.
- Closed runtime ownership: `@chiron/project-context` remains the runtime write owner; methodology packages remain read-only definition authority.
- Closed persistence model: current-state only for this slice; no event sourcing, no mutation history tables, no runtime workflow-step runtime.
- Closed repin rule: repin is blocked by any persisted runtime rows or executions; do not assume execution-only blocking remains sufficient.
- Closed many-value semantics: many-valued facts are unordered at the platform level; deterministic read ordering is by `created_at, id` only and does not convey business priority.
- Closed evaluator split: keep the current preview/default evaluator intact and add a separate persisted-runtime evaluator/loader path.

## Work Objectives
### Core Objective
Implement the runtime/project-context persistence and evaluation foundation required to represent project-level and work-unit-level execution state at L1/L2 against a pinned methodology version, with no unresolved identity, cardinality, reference, or evaluator semantics left to the implementer.

### Deliverables
- Extend methodology fact definition contracts and persistence so both methodology facts and work-unit facts have explicit cardinality (`one | many`) separate from fact type.
- Extend methodology fact typing to support `work_unit_reference` without redesigning design-time seeding.
- Add durable runtime tables and constraints for project work units and runtime fact instances.
- Add repository/service/runtime-loader seams in `@chiron/project-context` and concrete Drizzle implementations in `@chiron/db`.
- Add a persisted transition-condition evaluation path that overlays runtime state on pinned methodology defaults.
- Update current project read flows so transition eligibility/status can be driven by persisted runtime state instead of definition defaults only.

### Definition of Done (verifiable conditions with commands)
- `bunx vitest run packages/db/src/tests/repository/project-context-runtime-schema.integration.test.ts` passes and proves runtime schema behavior.
- `bunx vitest run packages/db/src/tests/repository/project-context-runtime-repository.integration.test.ts` passes and proves runtime repository behavior.
- `bunx vitest run packages/project-context/src/runtime-state-loader.test.ts` passes and proves effective runtime-state projection behavior.
- `bunx vitest run packages/project-context/src/persisted-transition-condition-evaluator.test.ts` passes and proves persisted condition semantics.
- `bunx vitest run packages/project-context/src/service.runtime.test.ts` passes and proves runtime service and repin policy behavior.
- `bunx vitest run packages/api/src/tests/routers/project-runtime.test.ts` passes and proves current project router reads persisted runtime state.
- `bun run check-types` passes across the workspace.

### Must Have
- Exact runtime table and field definitions locked before implementation.
- Explicit runtime↔methodology mapping by FK and validation rules.
- Explicit absent/default/reference/many semantics.
- Explicit repin/runtime-state interaction.
- Zero dependence on workflow-step/edge runtime tables.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No redesign of the design-time methodology seed plan.
- No L3 runtime workflow step, edge, scheduler, or orchestration tables.
- No generic EAV abstraction beyond the three scoped runtime tables.
- No append-only audit/history subsystem in this slice.
- No cross-project or cross-methodology-version work-unit references.
- No business-priority ordering axis for many-valued facts.

## Runtime Entity Decisions
### Ownership and versioning
- Runtime writes stay in `@chiron/project-context`; methodology remains read-only authority.
- Every runtime row carries `methodology_version_id` and must match the active `project_methodology_pins.methodology_version_id` at write time.
- Runtime rows reference methodology definitions by DB ID, not by key, to keep FK integrity stable even when keys are denormalized elsewhere.
- `project_executions` remains provenance-only. Runtime state is anchored to `project_id`, not to `project_execution_id`.

### Methodology definition prerequisites
- Add `cardinality` to `methodology_fact_definitions` and `work_unit_fact_definitions` as `text enum('one','many') not null default 'one'`.
- Extend the shared fact type contract in `packages/contracts/src/methodology/fact.ts:10-107` to include `work_unit_reference`.
- Do **not** rename existing methodology columns in this slice: keep `methodology_fact_definitions.value_type` and `work_unit_fact_definitions.fact_type`; normalize them in TypeScript/domain mappings instead.

### `project_work_units`
- Purpose: durable runtime row per instantiated methodology work-unit type instance.
- Fields:
  - `id: text` — primary key UUID
  - `project_id: text` — FK `projects.id` (`onDelete: cascade`)
  - `methodology_version_id: text` — FK `methodology_versions.id` (`onDelete: restrict`)
  - `work_unit_type_id: text` — FK `methodology_work_unit_types.id` (`onDelete: restrict`)
  - `cardinality_policy: text enum('one_per_project','many_per_project')` — runtime snapshot from methodology definition
  - `instance_key: text not null` — `__singleton__` for `one_per_project`; caller-supplied stable key for `many_per_project`
  - `current_state_id: text` — FK `work_unit_lifecycle_states.id` (`onDelete: restrict`)
  - `activated_by_transition_id: text | null` — FK `work_unit_lifecycle_transitions.id`
  - `created_by_project_execution_id: text | null` — FK `project_executions.id` (`onDelete: set null`)
  - `updated_by_project_execution_id: text | null` — FK `project_executions.id` (`onDelete: set null`)
  - `created_at: timestamp_ms`
  - `updated_at: timestamp_ms`
- Constraints/indexes:
  - unique partial index on `(project_id, methodology_version_id, work_unit_type_id)` where `cardinality_policy='one_per_project'`
  - unique index on `(project_id, methodology_version_id, work_unit_type_id, instance_key)`
  - index on `(project_id, current_state_id)`
  - index on `(project_id, work_unit_type_id)`
- Semantics:
  - row absence is the only representation of `__absent__`
  - deleting runtime work units is out of scope; lifecycle terminal states represent closure

### `project_fact_instances`
- Purpose: durable current-state rows for methodology-level runtime facts.
- Fields:
  - `id: text` — primary key UUID
  - `project_id: text` — FK `projects.id` (`onDelete: cascade`)
  - `methodology_version_id: text` — FK `methodology_versions.id` (`onDelete: restrict`)
  - `methodology_fact_definition_id: text` — FK `methodology_fact_definitions.id` (`onDelete: restrict`)
  - `cardinality: text enum('one','many')` — runtime snapshot from methodology definition
  - `value_kind: text enum('scalar','json','work_unit_reference')`
  - `value_json: text json | null` — used for scalar/json values only
  - `referenced_project_work_unit_id: text | null` — FK `project_work_units.id` for reference values only
  - `created_by_project_execution_id: text | null` — FK `project_executions.id` (`onDelete: set null`)
  - `updated_by_project_execution_id: text | null` — FK `project_executions.id` (`onDelete: set null`)
  - `created_at: timestamp_ms`
  - `updated_at: timestamp_ms`
- Constraints/indexes:
  - partial unique index on `(project_id, methodology_version_id, methodology_fact_definition_id)` where `cardinality='one'`
  - index on `(project_id, methodology_fact_definition_id)`
  - index on `(project_id, referenced_project_work_unit_id)`
  - check-style repository validation: exactly one payload mode is populated (`value_json` xor `referenced_project_work_unit_id`) according to `value_kind`

### `work_unit_fact_instances`
- Purpose: durable current-state rows for work-unit-scoped runtime facts.
- Fields:
  - `id: text` — primary key UUID
  - `project_work_unit_id: text` — FK `project_work_units.id` (`onDelete: cascade`)
  - `methodology_version_id: text` — FK `methodology_versions.id` (`onDelete: restrict`)
  - `work_unit_fact_definition_id: text` — FK `work_unit_fact_definitions.id` (`onDelete: restrict`)
  - `cardinality: text enum('one','many')` — runtime snapshot from methodology definition
  - `value_kind: text enum('scalar','json','work_unit_reference')`
  - `value_json: text json | null`
  - `referenced_project_work_unit_id: text | null` — FK `project_work_units.id`
  - `created_by_project_execution_id: text | null` — FK `project_executions.id` (`onDelete: set null`)
  - `updated_by_project_execution_id: text | null` — FK `project_executions.id` (`onDelete: set null`)
  - `created_at: timestamp_ms`
  - `updated_at: timestamp_ms`
- Constraints/indexes:
  - partial unique index on `(project_work_unit_id, work_unit_fact_definition_id)` where `cardinality='one'`
  - index on `(project_work_unit_id, work_unit_fact_definition_id)`
  - index on `(referenced_project_work_unit_id)`
  - same payload-mode validation rules as project fact instances

### Mapping rules
- `project_work_units.work_unit_type_id` → `methodology_work_unit_types.id`
- `project_work_units.current_state_id` → `work_unit_lifecycle_states.id`
- `project_work_units.activated_by_transition_id` → `work_unit_lifecycle_transitions.id`
- `project_fact_instances.methodology_fact_definition_id` → `methodology_fact_definitions.id`
- `work_unit_fact_instances.work_unit_fact_definition_id` → `work_unit_fact_definitions.id`
- `project_fact_instances.referenced_project_work_unit_id` and `work_unit_fact_instances.referenced_project_work_unit_id` → `project_work_units.id`
- All runtime writes must validate that the referenced methodology definition/state/transition belongs to the same `methodology_version_id` pinned to the project.

### Cardinality, value-shape, and default semantics
- Fact cardinality is definition-level metadata (`one | many`) and is independent from fact type.
- Fact type remains definition-level metadata and is expanded to: `string | number | boolean | json | work_unit_reference`.
- Runtime storage uses `value_kind` as the storage discriminator:
  - `scalar` for `string | number | boolean`
  - `json` for `json`
  - `work_unit_reference` for `work_unit_reference`
- Platform ordering semantics:
  - `many` facts are unordered for business logic
  - any deterministic list rendering is sorted by `created_at, id`
  - if domain-specific ordering matters, it must live inside the fact payload/schema itself
- Absence/default/null rules:
  - project or work-unit fact with `cardinality='one'` and no row = absent; persisted evaluator falls back to methodology `defaultValue` if defined
  - project or work-unit fact with `cardinality='many'` and no rows = empty set
  - explicit null is only allowed for `json` facts; absence is still represented by row absence
  - `work_unit_reference` facts never use `value_json`

### Runtime dependency and condition semantics
- Runtime dependency references (for setup → brainstorming/research and similar flows) are represented with `work_unit_reference` fact instances, not with a fourth relationship table.
- Persisted `work_unit` condition semantics:
  - `operator='exists'` + `workUnitKey` => true if any persisted `project_work_units` row of that type exists
  - `operator='state_is'` + `workUnitKey` + `stateKey` => true if any persisted row of that type is in the required state
  - optional `referenceFactKey` narrows evaluation to the work unit referenced by a `work_unit_reference` fact; if present, the referenced row must belong to the same project and methodology version
- Persisted `fact` condition semantics:
  - `operator='exists'` => true when a runtime row exists, or when a single-valued methodology default exists and no overriding runtime row is present
  - `operator='equals'` => compares the effective value after overlaying runtime rows on methodology defaults
- Empty many-set behavior is always false for existential checks.

### Pins and executions interaction
- Runtime rows are valid only against the currently pinned methodology version.
- `project_executions` can populate provenance columns on runtime rows but do not own the rows.
- `repinProjectMethodologyVersion` must be blocked when the project has any of:
  - `project_executions`
  - `project_work_units`
  - `project_fact_instances`
  - `work_unit_fact_instances` via joined `project_work_units`
- This slice does **not** define migration/remapping of runtime state across methodology versions.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: TDD using Vitest repository/service/router tests plus targeted integration coverage.
- QA policy: Every task below includes agent-executed happy-path and failure-path scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`
- Execution notes:
  - use `bunx vitest run ...` for targeted task verification
  - use `bun run check-types` before final verification wave
  - do not rely on manual DB inspection or browser-only confirmation for this slice

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 (contracts/definition seam), Task 2 (failing DB integration coverage), Task 3 (schema + migration implementation)

Wave 2: Task 4 (repository expansion), Task 5 (runtime state loader), Task 6 (persisted evaluator)

Wave 3: Task 7 (service/runtime mutation orchestration + repin guard), Task 8 (API/router integration + end-to-end runtime read path)

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2-8
- Task 2 blocks Task 3
- Task 3 blocks Tasks 4-8
- Task 4 blocks Tasks 5-8
- Task 5 blocks Tasks 6-8
- Task 6 blocks Tasks 7-8
- Task 7 blocks Task 8
- Task 8 blocks Final Verification Wave

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → `unspecified-high`
- Wave 2 → 3 tasks → `unspecified-high`, `deep`
- Wave 3 → 2 tasks → `unspecified-high`, `deep`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Lock methodology fact cardinality and runtime value-shape contracts

  **What to do**: Extend the shared methodology fact contracts so runtime planning has an authoritative definition seam before any DB changes land. Add `FactCardinality = "one" | "many"`, extend the shared fact type enum to include `work_unit_reference`, update methodology fact/work-unit fact input schemas to carry cardinality, and add the minimal domain-mapping changes needed so existing methodology tables can continue using `value_type` / `fact_type` column names without a broad rename. Document in code comments that runtime storage discriminates `scalar | json | work_unit_reference` while definition-level type remains `string | number | boolean | json | work_unit_reference`.
  **Must NOT do**: Do not redesign seed data, rename existing methodology DB columns, or introduce runtime persistence in this task.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: touches shared contracts that affect multiple packages and must stay narrow.
  - Skills: [`better-auth-best-practices`] — not needed; omit.
  - Omitted: [`brainstorming`, `turborepo`] — already resolved; task is contract-focused, not exploratory or monorepo-config work.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2, 3, 4, 5, 6, 7, 8] | Blocked By: []

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `packages/contracts/src/methodology/fact.ts:10-107` — current fact enum/input authority; extend here rather than inventing runtime-only shadow types.
  - Pattern: `packages/contracts/src/methodology/lifecycle.ts:9-18,63-72` — existing work-unit cardinality authority; reuse naming style when adding fact cardinality.
  - Pattern: `packages/db/src/schema/methodology.ts:71-96` — methodology fact definition table currently uses `value_type` and lacks cardinality.
  - Pattern: `packages/db/src/schema/methodology.ts:243-276` — work-unit fact definition table currently uses `fact_type` and lacks cardinality.
  - Pattern: `packages/api/src/routers/project.ts:375-380` — current read path still assumes definition defaults only; contract changes must preserve this fallback capability.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/contracts/src/methodology/fact.test.ts` exits 0 and proves `FactType` includes `work_unit_reference` and `FactCardinality` accepts only `one|many`.
  - [ ] `bun run check-types` exits 0 after all contract consumers compile against the new fields without renaming the existing methodology DB columns.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Contract accepts new runtime-facing fact shape metadata
    Tool: Bash
    Steps: Run `bunx vitest run packages/contracts/src/methodology/fact.test.ts > .sisyphus/evidence/task-1-fact-contracts.log 2>&1`
    Expected: Command exits 0 and log contains assertions for `work_unit_reference` plus `one|many`
    Evidence: .sisyphus/evidence/task-1-fact-contracts.log

  Scenario: Invalid fact cardinality is rejected
    Tool: Bash
    Steps: Ensure the same test file includes a negative assertion for `cardinality: "ordered"`; run `bunx vitest run packages/contracts/src/methodology/fact.test.ts --testNamePattern "rejects invalid cardinality" > .sisyphus/evidence/task-1-fact-contracts-error.log 2>&1`
    Expected: Command exits 0 because the test passes by proving decode/validation rejection of invalid cardinality
    Evidence: .sisyphus/evidence/task-1-fact-contracts-error.log
  ```

  **Commit**: YES | Message: `feat(contracts): add runtime fact cardinality and reference typing` | Files: `packages/contracts/src/methodology/fact.ts`, `packages/contracts/src/methodology/fact.test.ts`, any direct contract consumer updates required for compile safety

- [ ] 2. Add failing runtime schema integration coverage

  **What to do**: Create a dedicated DB integration test file that expresses the exact runtime schema expectations before implementation: new runtime tables exist, methodology fact tables expose cardinality, singleton work units enforce one-per-project uniqueness, many-valued facts allow multiple rows, payload mode checks reject malformed scalar/reference rows, and cross-project/cross-version work-unit references are rejected at repository-validation boundaries. Follow the existing temp-SQLite + schema bootstrap pattern used by current repository integration tests.
  **Must NOT do**: Do not implement the schema or repository changes in this task; the purpose is a deliberate red test proving the target behavior.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: red-test design requires careful capture of all required constraints before code changes.
  - Skills: [] — existing repo patterns are sufficient.
  - Omitted: [`systematic-debugging`] — not a bug hunt; this is deliberate TDD setup.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [3, 4, 5, 6, 7, 8] | Blocked By: [1]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `packages/db/src/tests/repository/methodology-repository.integration.test.ts` — canonical temp SQLite + SQL bootstrap integration pattern.
  - Pattern: `packages/db/src/tests/repository/lifecycle-repository.integration.test.ts` — repository-oriented constraint/integrity test style.
  - Pattern: `packages/db/src/schema/project.ts:7-86` — current runtime schema authority to extend, not replace.
  - Pattern: `packages/db/src/schema/methodology.ts:71-96,243-276` — existing methodology fact tables to assert new `cardinality` support against.
  - API/Type: `packages/project-context/src/repository.ts:45-82` — current repository seam; new tests should anticipate this seam, not invent another owner package.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/db/src/tests/repository/project-context-runtime-schema.integration.test.ts` exits non-zero before implementation and the log shows missing runtime tables/columns or failing uniqueness/payload assertions for the intended reasons.
  - [ ] The test file covers all of: singleton work-unit uniqueness, many fact multi-row allowance, payload-mode validation, same-project/same-version reference restrictions, and absence/default semantics at the schema boundary.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Red test proves runtime tables are not implemented yet
    Tool: Bash
    Steps: Run `bunx vitest run packages/db/src/tests/repository/project-context-runtime-schema.integration.test.ts > .sisyphus/evidence/task-2-runtime-schema-red.log 2>&1; test $? -ne 0`
    Expected: Command sequence succeeds because Vitest fails and the log mentions missing `project_work_units` / fact-instance schema expectations
    Evidence: .sisyphus/evidence/task-2-runtime-schema-red.log

  Scenario: Red test includes malformed reference case
    Tool: Bash
    Steps: Verify the test file contains a case for cross-project or cross-version `work_unit_reference`; run `bunx vitest run packages/db/src/tests/repository/project-context-runtime-schema.integration.test.ts --testNamePattern "rejects cross-project reference" > .sisyphus/evidence/task-2-runtime-schema-error.log 2>&1; test $? -ne 0`
    Expected: Command sequence succeeds because the targeted test currently fails for the intended unimplemented validation path
    Evidence: .sisyphus/evidence/task-2-runtime-schema-error.log
  ```

  **Commit**: YES | Message: `test(db): add failing runtime schema integration coverage` | Files: `packages/db/src/tests/repository/project-context-runtime-schema.integration.test.ts`

- [ ] 3. Implement methodology cardinality columns and runtime tables

  **What to do**: Add the actual Drizzle schema and migration support required by the plan: `cardinality` columns on methodology fact definition tables, plus new `project_work_units`, `project_fact_instances`, and `work_unit_fact_instances` tables under `packages/db/src/schema/project.ts`. Implement all indexes and FK relationships defined in the Runtime Entity Decisions section, including singleton partial uniqueness, payload/reference indexes, and execution provenance columns. Generate the corresponding migration file and ensure schema exports remain authoritative through `packages/db/src/schema/index.ts`.
  **Must NOT do**: Do not add history tables, workflow-step runtime tables, or cross-project reference relaxations.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: schema work must be exact and consistent with existing Drizzle + migration patterns.
  - Skills: [] — follow established project schema conventions.
  - Omitted: [`turborepo`] — package wiring is already known and not the hard part.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [4, 5, 6, 7, 8] | Blocked By: [1, 2]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `packages/db/src/schema/project.ts:7-86` — timestamp defaults, FK style, and index naming conventions for project-context tables.
  - Pattern: `packages/db/src/schema/methodology.ts:71-96,122-143,173-276` — methodology FK/index patterns and cardinality-policy naming.
  - Pattern: `packages/db/src/migrations/0000_daffy_yellow_claw.sql` — existing migration style and SQL naming conventions.
  - Test: `packages/db/src/tests/repository/project-context-runtime-schema.integration.test.ts` — red coverage introduced in Task 2; make it green without weakening assertions.
  - API/Type: `packages/contracts/src/methodology/lifecycle.ts:9-10` — use `one_per_project|many_per_project` naming exactly for work-unit cardinality snapshots.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/db/src/tests/repository/project-context-runtime-schema.integration.test.ts` exits 0 and proves all new tables, columns, FKs, and uniqueness constraints exist.
  - [ ] `bun run check-types` exits 0 after the new schema is exported through the DB package.
  - [ ] A new migration file exists under `packages/db/src/migrations/` and includes DDL for the three runtime tables plus both new methodology cardinality columns.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Runtime schema supports singleton and many-valued facts
    Tool: Bash
    Steps: Run `bunx vitest run packages/db/src/tests/repository/project-context-runtime-schema.integration.test.ts > .sisyphus/evidence/task-3-runtime-schema-green.log 2>&1`
    Expected: Command exits 0 and log contains passing assertions for singleton uniqueness plus many-row acceptance
    Evidence: .sisyphus/evidence/task-3-runtime-schema-green.log

  Scenario: Invalid payload mode is rejected after schema lands
    Tool: Bash
    Steps: Run `bunx vitest run packages/db/src/tests/repository/project-context-runtime-schema.integration.test.ts --testNamePattern "rejects malformed payload mode" > .sisyphus/evidence/task-3-runtime-schema-error.log 2>&1`
    Expected: Command exits 0 because the targeted negative test now passes by observing the expected rejection path
    Evidence: .sisyphus/evidence/task-3-runtime-schema-error.log
  ```

  **Commit**: YES | Message: `feat(db): add runtime work unit and fact instance schema` | Files: `packages/db/src/schema/project.ts`, `packages/db/src/schema/methodology.ts`, `packages/db/src/schema/index.ts`, `packages/db/src/migrations/*`, `packages/db/src/tests/repository/project-context-runtime-schema.integration.test.ts`

- [ ] 4. Extend project-context repository for runtime persistence

  **What to do**: Expand `ProjectContextRepository` with exact runtime row types and CRUD/query methods for work units and fact instances, then implement those methods in `packages/db/src/project-context-repository.ts`. Required repository capabilities are: `hasPersistedRuntimeState(projectId)`, `createProjectWorkUnit`, `transitionProjectWorkUnitState`, `listProjectWorkUnits`, `getProjectWorkUnitById`, `setProjectFactValue`, `appendProjectFactValue`, `clearProjectFactValues`, `listProjectFactInstances`, `setWorkUnitFactValue`, `appendWorkUnitFactValue`, `clearWorkUnitFactValues`, and `listWorkUnitFactInstances`. Enforce same-project/same-version validation, singleton semantics, and payload-mode rules in repository writes.
  **Must NOT do**: Do not add service orchestration, router integration, or persisted evaluator logic in this task.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: repository changes span Effect interfaces, DB implementation, and integrity enforcement.
  - Skills: [] — existing repository patterns are authoritative.
  - Omitted: [`systematic-debugging`] — this is forward implementation, not post-failure diagnosis.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [5, 6, 7, 8] | Blocked By: [3]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `packages/project-context/src/repository.ts:4-82` — current row-type + Context.Tag repository style; extend here rather than introducing a second repository tag.
  - Pattern: `packages/db/src/project-context-repository.ts` — existing transactional pin/repin implementation style and repository error mapping.
  - Pattern: `packages/project-context/src/service.ts:102-520` — service consumes repository via Effect; preserve this seam.
  - Pattern: `packages/db/src/schema/project.ts:19-86` — current project-context tables share naming, timestamp, and index conventions with the new runtime tables.
  - Test Pattern: `packages/db/src/tests/repository/methodology-repository.integration.test.ts` — integration repository tests should provision full temp DBs and assert row-level integrity.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/db/src/tests/repository/project-context-runtime-repository.integration.test.ts` exits 0 and proves create/list/transition/set/append/clear flows for all three runtime entities.
  - [ ] `bunx vitest run packages/db/src/tests/repository/project-context-runtime-repository.integration.test.ts --testNamePattern "rejects duplicate singleton work unit"` exits 0 and proves the repository rejects a second `one_per_project` instance.
  - [ ] `bun run check-types` exits 0 after repository interfaces and DB implementation compile together.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Repository persists runtime work units and facts end-to-end
    Tool: Bash
    Steps: Run `bunx vitest run packages/db/src/tests/repository/project-context-runtime-repository.integration.test.ts > .sisyphus/evidence/task-4-runtime-repository.log 2>&1`
    Expected: Command exits 0 and log shows passing coverage for project facts, work-unit facts, and work-unit state transitions
    Evidence: .sisyphus/evidence/task-4-runtime-repository.log

  Scenario: Repository rejects invalid reference scope
    Tool: Bash
    Steps: Run `bunx vitest run packages/db/src/tests/repository/project-context-runtime-repository.integration.test.ts --testNamePattern "rejects cross-version work_unit_reference" > .sisyphus/evidence/task-4-runtime-repository-error.log 2>&1`
    Expected: Command exits 0 because the targeted negative test passes by observing the expected repository/domain rejection
    Evidence: .sisyphus/evidence/task-4-runtime-repository-error.log
  ```

  **Commit**: YES | Message: `feat(project-context): add runtime repository persistence` | Files: `packages/project-context/src/repository.ts`, `packages/project-context/src/errors.ts`, `packages/db/src/project-context-repository.ts`, `packages/db/src/tests/repository/project-context-runtime-repository.integration.test.ts`

- [ ] 5. Add runtime state loader and effective-value projection seam

  **What to do**: Create a read-only runtime state loader in `@chiron/project-context` that composes the active project pin, methodology definitions, runtime work-unit rows, project fact rows, and work-unit fact rows into a single normalized snapshot for evaluation and read APIs. The loader must: resolve definition IDs back to keys, expose current work-unit state by runtime row and by work-unit type key, overlay single-valued runtime facts on top of methodology defaults, return empty arrays for missing many facts, and preserve work-unit-reference facts as runtime work-unit IDs plus resolved target metadata.
  **Must NOT do**: Do not evaluate transition conditions in this task and do not mutate runtime state.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this is the seam that turns raw runtime rows and methodology definitions into a stable runtime projection.
  - Skills: [] — project patterns already provide the needed layering model.
  - Omitted: [`turborepo`] — no monorepo workflow changes are needed.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [6, 7, 8] | Blocked By: [4]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `packages/api/src/routers/project.ts:366-484` — current project read path needs a richer state source than `activeFactValues` built from defaults.
  - Pattern: `packages/project-context/src/service.ts:24-50` — current project-context service already exposes normalized state objects; match that style.
  - Pattern: `packages/methodology-engine/src/contracts/runtime-resolvers.ts:1-42` — placeholder runtime resolver seam confirms runtime projections should be explicit and typed.
  - API/Type: `packages/contracts/src/methodology/fact.ts:55-107` — use fact definition metadata as the basis for default overlay and key resolution.
  - API/Type: `packages/contracts/src/methodology/lifecycle.ts:44-59,63-72` — use transition/work-unit definition shapes to resolve keys and lifecycle states.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/project-context/src/runtime-state-loader.test.ts` exits 0 and proves the loader returns effective single-valued defaults, empty many sets, resolved work-unit references, and grouped work units by type/state.
  - [ ] `bunx vitest run packages/project-context/src/runtime-state-loader.test.ts --testNamePattern "overlays runtime single fact on methodology default"` exits 0 and proves runtime values override defaults without materializing extra rows.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Loader returns effective runtime snapshot
    Tool: Bash
    Steps: Run `bunx vitest run packages/project-context/src/runtime-state-loader.test.ts > .sisyphus/evidence/task-5-runtime-loader.log 2>&1`
    Expected: Command exits 0 and log shows passing assertions for grouped work units, effective defaults, and reference resolution
    Evidence: .sisyphus/evidence/task-5-runtime-loader.log

  Scenario: Missing many-valued facts project to empty sets
    Tool: Bash
    Steps: Run `bunx vitest run packages/project-context/src/runtime-state-loader.test.ts --testNamePattern "returns empty array for missing many fact" > .sisyphus/evidence/task-5-runtime-loader-error.log 2>&1`
    Expected: Command exits 0 because the targeted negative/edge test passes by proving missing rows do not become null or singleton defaults
    Evidence: .sisyphus/evidence/task-5-runtime-loader-error.log
  ```

  **Commit**: YES | Message: `feat(project-context): add runtime state loader` | Files: `packages/project-context/src/runtime-state-loader.ts`, `packages/project-context/src/runtime-state-loader.test.ts`, any supporting runtime-state types under `packages/project-context/src/`

- [ ] 6. Add persisted transition-condition evaluator

  **What to do**: Implement a new persisted evaluator file in `@chiron/project-context` that consumes the runtime state loader snapshot and evaluates methodology `TransitionConditionSet` records against persisted runtime state. Keep `packages/project-context/src/transition-condition-evaluator.ts` unchanged as the existing pure preview/default evaluator. The persisted evaluator must support: fact `exists|equals`, work-unit `exists|state_is`, existential semantics for many work units, optional `referenceFactKey` narrowing, effective default overlay for missing single facts, empty-many=false semantics, and diagnostics compatible with the current router’s diagnostic display shape.
  **Must NOT do**: Do not mutate the current preview evaluator in place, and do not add workflow-step execution behavior.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: evaluator semantics are long-lived and easy to get subtly wrong.
  - Skills: [] — the existing pure evaluator plus runtime loader are the authoritative patterns.
  - Omitted: [`systematic-debugging`] — use deliberate greenfield semantics instead of reactive patching.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [7, 8] | Blocked By: [5]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `packages/project-context/src/transition-condition-evaluator.ts:33-251` — preserve current evaluator behavior for preview mode; reuse diagnostic vocabulary where possible.
  - Pattern: `packages/api/src/routers/project.ts:441-536` — current router expects a `{ met, diagnostics }` result shape and merges diagnostics into transition status.
  - API/Type: `packages/contracts/src/methodology/lifecycle.ts:20-59` — authoritative transition-condition structures and phases.
  - Pattern: `packages/project-context/src/runtime-state-loader.ts` — persisted evaluator must consume loader output rather than re-query repositories directly.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/project-context/src/persisted-transition-condition-evaluator.test.ts` exits 0 and proves fact/work-unit conditions evaluate correctly against persisted runtime state.
  - [ ] `bunx vitest run packages/project-context/src/persisted-transition-condition-evaluator.test.ts --testNamePattern "uses referenceFactKey to target a specific work unit"` exits 0 and proves specific runtime dependency evaluation works.
  - [ ] `bunx vitest run packages/project-context/src/persisted-transition-condition-evaluator.test.ts --testNamePattern "treats empty many set as unmet"` exits 0 and proves empty-many existential semantics stay false.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Persisted evaluator gates transitions from stored runtime state
    Tool: Bash
    Steps: Run `bunx vitest run packages/project-context/src/persisted-transition-condition-evaluator.test.ts > .sisyphus/evidence/task-6-persisted-evaluator.log 2>&1`
    Expected: Command exits 0 and log shows passing happy-path assertions for `exists` and `state_is`
    Evidence: .sisyphus/evidence/task-6-persisted-evaluator.log

  Scenario: Reference-targeted condition fails when referenced work unit is in wrong state
    Tool: Bash
    Steps: Run `bunx vitest run packages/project-context/src/persisted-transition-condition-evaluator.test.ts --testNamePattern "fails when referenced work unit state mismatches" > .sisyphus/evidence/task-6-persisted-evaluator-error.log 2>&1`
    Expected: Command exits 0 because the negative test passes by producing an unmet diagnostic instead of a false positive
    Evidence: .sisyphus/evidence/task-6-persisted-evaluator-error.log
  ```

  **Commit**: YES | Message: `feat(project-context): add persisted transition evaluator` | Files: `packages/project-context/src/persisted-transition-condition-evaluator.ts`, `packages/project-context/src/persisted-transition-condition-evaluator.test.ts`, any supporting runtime condition types under `packages/project-context/src/`

- [ ] 7. Add runtime mutation services and repin runtime-state guard

  **What to do**: Extend `ProjectContextService` so runtime L1/L2 writes are available through the existing owner package. Required service operations are: `createProjectWorkUnit`, `transitionProjectWorkUnit`, `setProjectFactValue`, `appendProjectFactValue`, `clearProjectFactValues`, `setWorkUnitFactValue`, `appendWorkUnitFactValue`, `clearWorkUnitFactValues`, and `getPersistedProjectRuntimeState`. Each operation must validate the active project pin, resolve methodology definition/state IDs from keys via read-only methodology authority, call the repository methods from Task 4, and preserve the semantics locked in this plan. Update repin logic so `repinProjectMethodologyVersion` blocks when `hasPersistedRuntimeState(projectId)` is true even if no executions exist, with explicit diagnostics/error codes distinct from the existing execution-history guard.
  **Must NOT do**: Do not add workflow-step orchestration, background execution logic, or methodology-version migration/remapping.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: service-layer orchestration must preserve existing project-context boundaries and error semantics.
  - Skills: [] — existing service/repository layering is sufficient.
  - Omitted: [`better-auth-best-practices`] — unrelated to runtime project-context behavior.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [8] | Blocked By: [6]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `packages/project-context/src/service.ts:74-520` — existing Effect service style, diagnostic construction, and repository orchestration for pin/repin.
  - Pattern: `packages/project-context/src/repository.ts:45-82` — extend the existing repository/service contract rather than adding a parallel runtime service package.
  - Pattern: `packages/project-context/src/errors.ts` — existing project pin diagnostics and repository error-code pattern to extend with runtime-state/validation errors.
  - Pattern: `packages/project-context/src/runtime-state-loader.ts` — use loader output for `getPersistedProjectRuntimeState` rather than duplicating read composition.
  - API/Type: `packages/db/src/schema/project.ts:19-86` — existing pin/execution tables remain the authority for project/version/provenance lookups.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/project-context/src/service.runtime.test.ts` exits 0 and proves runtime work-unit/fact write flows succeed against an active pin.
  - [ ] `bunx vitest run packages/project-context/src/service.runtime.test.ts --testNamePattern "blocks repin when runtime state exists"` exits 0 and proves runtime rows block repin even without execution history.
  - [ ] `bunx vitest run packages/project-context/src/service.runtime.test.ts --testNamePattern "rejects cross-project work_unit_reference"` exits 0 and proves service validation enforces same-project/same-version references.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Service writes runtime state against active pin
    Tool: Bash
    Steps: Run `bunx vitest run packages/project-context/src/service.runtime.test.ts > .sisyphus/evidence/task-7-runtime-service.log 2>&1`
    Expected: Command exits 0 and log shows passing assertions for work-unit creation, state transition, and fact writes
    Evidence: .sisyphus/evidence/task-7-runtime-service.log

  Scenario: Repin fails when runtime rows exist but no executions exist
    Tool: Bash
    Steps: Run `bunx vitest run packages/project-context/src/service.runtime.test.ts --testNamePattern "blocks repin when runtime state exists" > .sisyphus/evidence/task-7-runtime-service-error.log 2>&1`
    Expected: Command exits 0 because the negative test passes by returning the new runtime-state blocking diagnostic
    Evidence: .sisyphus/evidence/task-7-runtime-service-error.log
  ```

  **Commit**: YES | Message: `feat(project-context): add runtime mutation services and repin guards` | Files: `packages/project-context/src/service.ts`, `packages/project-context/src/errors.ts`, `packages/project-context/src/service.runtime.test.ts`, any new runtime-service parameter/result types in `packages/project-context/src/`

- [ ] 8. Integrate persisted runtime state into current project read flows

  **What to do**: Update the project router read path so transition display/status logic can consume persisted runtime state. Replace the single-source `activeFactValues` default projection in `packages/api/src/routers/project.ts:375-484` with: (1) runtime snapshot load through `ProjectContextService.getPersistedProjectRuntimeState`, (2) persisted evaluator invocation when runtime context exists, and (3) fallback to the existing preview/default evaluator only when no persisted runtime context is present for the requested project/work-unit scope. Preserve current diagnostic formatting and response shape, and add route-level tests that cover both fallback and persisted-runtime cases.
  **Must NOT do**: Do not redesign the project router response contract or introduce workflow-step execution endpoints.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this task crosses API read semantics, transition diagnostics, and backward compatibility.
  - Skills: [] — existing router/test patterns are enough.
  - Omitted: [`playwright`] — runtime model verification is fully API/test driven in this slice.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [F1, F2, F3, F4] | Blocked By: [7]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `packages/api/src/routers/project.ts:375-536` — current active-fact projection and diagnostic merge logic to preserve.
  - Pattern: `packages/project-context/src/transition-condition-evaluator.ts:151-198` — existing preview evaluator must remain available for no-runtime fallback.
  - Pattern: `packages/project-context/src/persisted-transition-condition-evaluator.ts` — new persisted path should be invoked when runtime state is loaded.
  - Pattern: `packages/api/src/tests/routers/methodology.test.ts` — existing API router test location and Vitest style.
  - Pattern: `packages/project-context/src/runtime-state-loader.ts` — router should consume the normalized snapshot, not re-assemble runtime joins itself.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/api/src/tests/routers/project-runtime.test.ts` exits 0 and proves project route output reflects persisted runtime facts/work units when they exist.
  - [ ] `bunx vitest run packages/api/src/tests/routers/project-runtime.test.ts --testNamePattern "falls back to definition defaults when runtime state is absent"` exits 0 and proves backward-compatible preview behavior remains.
  - [ ] `bun run check-types` exits 0 after the router consumes the new service/evaluator seams.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Project router reflects persisted runtime state
    Tool: Bash
    Steps: Run `bunx vitest run packages/api/src/tests/routers/project-runtime.test.ts > .sisyphus/evidence/task-8-project-router.log 2>&1`
    Expected: Command exits 0 and log shows passing assertions for persisted fact/work-unit-driven transition status
    Evidence: .sisyphus/evidence/task-8-project-router.log

  Scenario: Router preserves preview fallback when runtime state is missing
    Tool: Bash
    Steps: Run `bunx vitest run packages/api/src/tests/routers/project-runtime.test.ts --testNamePattern "falls back to definition defaults when runtime state is absent" > .sisyphus/evidence/task-8-project-router-fallback.log 2>&1`
    Expected: Command exits 0 and targeted test proves the router still derives eligibility from methodology defaults when no runtime rows exist
    Evidence: .sisyphus/evidence/task-8-project-router-fallback.log
  ```

  **Commit**: YES | Message: `feat(api): read persisted runtime state in project router` | Files: `packages/api/src/routers/project.ts`, `packages/api/src/tests/routers/project-runtime.test.ts`, any necessary API-layer wiring for `ProjectContextService`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after each numbered task; do not batch multiple numbered tasks into one commit.
- Recommended commit sequence:
  1. `feat(contracts): add runtime fact cardinality and work-unit-reference typing`
  2. `test(db): add failing runtime project-context integration coverage`
  3. `feat(db): add runtime work-unit and fact instance schema`
  4. `feat(project-context): add runtime repository persistence`
  5. `feat(project-context): add runtime state loader`
  6. `feat(project-context): add persisted transition evaluator`
  7. `feat(project-context): add runtime mutation services and repin guards`
  8. `feat(api): read persisted runtime state in project router`

## Success Criteria
- Projects can persist and query runtime work units against a pinned methodology version without inventing any L3 workflow runtime.
- Projects can persist single and many-valued project facts and work-unit facts with explicit scalar/json/reference handling.
- Persisted runtime references can represent setup → brainstorming/research relationships within the same project/version.
- Transition gating can evaluate against persisted runtime state plus methodology defaults, while the current preview evaluator remains intact.
- Repin is safely blocked whenever runtime state exists and no migration/remapping subsystem is required in this slice.
