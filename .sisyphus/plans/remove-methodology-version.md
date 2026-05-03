# Remove Methodology Version Layer

## TL;DR

> **Quick Summary**: Remove the `methodologyVersions` table and version indirection entirely. All ~14 definition tables, project pins, and project executions re-key from `methodologyVersionId` → `methodologyId`. The methodology is always live and editable — no draft/publish lifecycle.
>
> **Deliverables**:
> - DB schema: `methodology_versions` + `methodology_version_events` dropped; all definition tables re-keyed
> - Project schema: `projectMethodologyPins` and `projectExecutions` lose `methodologyVersionId`
> - Backend: version services audited then deleted/folded; repository + API routes updated
> - UI: version routes collapsed into methodology routes; sidebar nav updated; route tree regenerated
> - Seed data: all 6 seed files updated to insert directly against `methodologyId`
> - All existing tests updated to compile and pass against new shape
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 5 waves
> **Critical Path**: T1 (schema) → T2 (project schema) → T4 (repositories) → T8 (MethodologyService) → T12 (API routers) → T16 (routeTree regen) → T17 (tests) → T18 (gate) → Final

---

## Context

### Original Request
Remove the methodology version concept entirely. Projects (pins + executions) should reference methodologies directly instead of versions. Methodology is always editable — no lifecycle states.

### Interview Summary
- **Lifecycle**: Always editable. No draft/published status on methodology.
- **definitionExtensions**: Dropped entirely (was version-specific config).
- **publishedVersion field**: Dropped from projectMethodologyPins.
- **URL structure**: Flattened — `/methodologies/:id/versions/:versionId/facts` → `/methodologies/:id/facts`.
- **Production data**: Pre-production — clean `db:push` reset, no migration scripts needed.
- **projectExecutions**: Re-key to `methodologyId` directly (same as pins).
- **version-service files**: Audit first, then delete lifecycle logic and fold any reusable CRUD into methodology service.

### Metis Review — Gaps Addressed
- `projectExecutions.methodologyVersionId` confirmed in scope → re-key to `methodologyId`
- `packages/db/src/lifecycle-repository.ts` added to scope
- `packages/db/src/project-context-repository.ts` + `packages/project-context/src/service.ts` added
- Versions list route (`methodologies.$methodologyId.versions.tsx`) added — deleted, not replaced
- `version-label.ts`, `version-graph.ts`, `version-workspace-author-hub-actions.ts` added
- `app-sidebar.tsx` + `sidebar-sections.tsx` version nav links added
- All 7 integration test files added
- `routeTree.gen.ts` regeneration gated as explicit step
- Unique constraint collision check added as first task gate
- `contracts/src/methodology/version.ts` — partial deletion, consumers updated first

---

## Work Objectives

### Core Objective
Eliminate the `methodologyVersions` indirection layer so every definition, pin, and execution references `methodologyDefinitions.id` directly.

### Concrete Deliverables
- `methodology_versions` and `methodology_version_events` tables gone from schema
- All 14 definition tables have `methodology_id` FK instead of `methodology_version_id`
- `project_methodology_pins` has no `methodology_version_id` or `published_version`
- `project_executions` has no `methodology_version_id`
- No route containing `/versions/` in the web app
- `bun run check-types` exits 0
- `bun run test` exits 0
- Seed runs clean against fresh DB

### Definition of Done
- [ ] `sqlite3 local.db ".tables"` returns no table containing `version` (repo-root `local.db`, configured via `apps/server/.env` `DATABASE_URL=file:../../local.db`)
- [ ] `bun run check-types` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run db:seed` exits 0 with no FK errors
- [ ] `grep -r "methodologyVersionId\|methodology_version_id" packages/ apps/web/src/` returns 0 matches (outside test fixtures/comments)

### Must Have
- All 14 definition tables re-keyed to `methodologyId`
- Project pins and executions re-keyed to `methodologyId`
- Seed files all updated to build against `methodologyId` directly
- All existing tests updated to compile and pass
- Version UI routes deleted and methodology routes cover the same content
- `routeTree.gen.ts` regenerated as explicit step

### Must NOT Have (Guardrails)
- No new draft/published status field added to `methodologyDefinitions`
- No nullable transitional `methodologyVersionId` columns left behind
- No manual edits to `routeTree.gen.ts` — regenerate only
- No scope expansion into new test coverage beyond fixing existing tests
- No sidebar redesign — remove version nav items only
- No new snapshot/history mechanism added to executions
- No renaming and logic-changing in the same commit for workspace components — split rename from refactor
- `contracts/src/methodology/version.ts` must be the last contracts file touched, after all consumers updated

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (update existing tests to match new shape — no new test authoring)
- **Framework**: bun test
- **No TDD** — this is a structural refactor, not new behavior

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 — Foundation (schema + pre-flight check, run in parallel):
├── T1: Pre-flight seed uniqueness check + schema changes (methodology.ts)  [quick]
├── T2: Project schema changes (project.ts — pins + executions)             [quick]
└── T3: Audit version-service files, produce extraction note                [quick]

Wave 2 — Backend (after Wave 1, max parallel):
├── T4: DB repositories — methodology-repository.ts + lifecycle-repository.ts + project-context-repository.ts  [unspecified-high]
├── T5: project-context/src/service.ts                                       [unspecified-high]
├── T6: Effect errors + ports — errors.ts, ports/version-repository.ts (delete), ports/workflow-repository.ts, ports/work-unit-repository.ts, repository.ts  [effect-best-practices]
└── T7: contracts/src/methodology/version.ts — consumers first, file last   [unspecified-high]

Wave 3 — Effect engine services (after Wave 2, max parallel):
├── T8:  methodology-service.ts — new main service (refactored from methodology-version-service.ts)  [deep+effect-best-practices]
├── T9:  WorkUnitService + WorkUnitFactService + WorkUnitArtifactSlotService — update versionId→methodologyId  [unspecified-high+effect-best-practices]
├── T10: WorkflowService + WorkflowTopologyMutationService + WorkflowEditorDefinitionService — update versionId→methodologyId  [unspecified-high+effect-best-practices]
└── T11: WorkflowAuthoringTransactionService + FormStepDefinitionService + remaining step definition services + layers/live.ts + index.ts  [unspecified-high+effect-best-practices]

Wave 4 — API + UI (after Wave 3):
├── T12: API routers — methodology.ts + project.ts (remove version CRUD, update all versionId refs)  [unspecified-high]
├── T13: UI version routes — delete 8 routes, create 6 flattened replacements                        [visual-engineering]
├── T14: UI feature files — workspace rename + refactor, app-shell.tsx, sidebar, project routes      [visual-engineering]
└── T15: Seed files — all 6 seed files                                                               [unspecified-high]

Wave 5 — Integration (after Wave 4):
├── T16: Regenerate routeTree.gen.ts                                                                  [quick]
├── T17: Update all test files (methodology-engine tests + api tests + web component tests)           [unspecified-high]
└── T18: db:push + full check-types gate                                                              [quick]

Wave FINAL — Verification (after ALL tasks):
├── F1: Plan compliance audit      [oracle]
├── F2: Code quality review        [unspecified-high]
├── F3: Real manual QA             [unspecified-high]
└── F4: Scope fidelity check       [deep]
```

### Dependency Matrix
- T1, T2, T3: no deps — start immediately
- T4, T5, T6, T7: depend on T1 + T2 + T3
- T8, T9, T10, T11: depend on T4 + T5 + T6 + T7
- T12, T13, T14, T15: depend on T8 + T9 + T10 + T11
- T16: depends on T13 + T14 (routes deleted/added, workspace renamed)
- T17: depends on T16 (route tree must be valid before tests run)
- T18: depends on T17
- FINAL: depends on T18

### Agent Dispatch Summary
- Wave 1: T1→`quick`, T2→`quick`, T3→`quick`
- Wave 2: T4→`unspecified-high`, T5→`unspecified-high` (load `effect-best-practices`), T6→`unspecified-high` (load `effect-best-practices`), T7→`unspecified-high`
- Wave 3: T8→`deep` (load `effect-best-practices`), T9→`unspecified-high` (load `effect-best-practices`), T10→`unspecified-high` (load `effect-best-practices`), T11→`unspecified-high` (load `effect-best-practices`)
- Wave 4: T12→`unspecified-high` (load `hono`), T13→`visual-engineering` (load `vercel-react-best-practices`), T14→`visual-engineering` (load `vercel-react-best-practices`), T15→`unspecified-high`
- Wave 5: T16→`quick`, T17→`unspecified-high`, T18→`quick`
- FINAL: F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high` (load `playwright`), F4→`deep`

---

## TODOs

- [ ] T1. Pre-flight check + methodology schema changes

  **What to do**:
  - Before touching any schema: query the seed data or dev DB to confirm no methodology has more than one version with overlapping definition keys (if two versions of the same methodology share a fact key, re-keying would violate the new unique index). Log findings.
  - In `packages/db/src/schema/methodology.ts`:
    - Delete the `methodologyVersions` table definition entirely
    - Delete the `methodologyVersionEvents` table definition entirely
    - On every table that has `methodologyVersionId`: rename the column to `methodologyId`, update the `.references()` to point to `methodologyDefinitions.id` (with `onDelete: "cascade"`)
    - Update every `uniqueIndex` and `index` that references `methodologyVersionId` → `methodologyId` (rename the index key string too, e.g. `methodology_fact_defs_vid_key_idx` → `methodology_fact_defs_mid_key_idx`)
    - Tables to update: `methodologyFactDefinitions`, `methodologyLinkTypeDefinitions`, `methodologyWorkUnitTypes`, `methodologyAgentTypes`, `workUnitLifecycleStates`, `workUnitLifecycleTransitions`, `workUnitFactDefinitions`, `methodologyArtifactSlotDefinitions`, `methodologyArtifactSlotTemplates`, `transitionConditionSets`, `methodologyWorkflows`, `methodologyWorkflowSteps`, `methodologyWorkflowEdges`, `methodologyTransitionWorkflowBindings`
    - Remove the `definitionExtensions` field from `methodologyVersions` (table is deleted, so this is automatic)
    - Do NOT touch any table that does not have a direct `methodologyVersionId` column

  **Must NOT do**:
  - Do not add any `status`, `publishedVersion`, or `definitionExtensions` field to `methodologyDefinitions`
  - Do not manually edit `routeTree.gen.ts`
  - Do not touch project.ts (that is T2)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3)
  - **Blocks**: T4, T5, T6, T7
  - **Blocked By**: None

  **References**:
  - `packages/db/src/schema/methodology.ts` — full file, all tables to modify
  - Pattern: all `methodologyVersionId` column declarations follow the same shape — find-replace is safe within this file

  **Acceptance Criteria**:
  - [ ] Pre-flight log: "No uniqueness conflicts detected" or list of conflicts found
  - [ ] `methodology_versions` export deleted from schema file
  - [ ] `methodology_version_events` export deleted from schema file
  - [ ] All 14 listed tables have `methodologyId` column (not `methodologyVersionId`)
  - [ ] No remaining reference to `methodologyVersions` in `methodology.ts`
  - [ ] File parses without TypeScript errors (imports still intact — downstream consumers not yet updated)

  ```
  Scenario: Schema file has no version table exports
    Tool: Bash (grep)
    Steps:
      1. grep "methodologyVersions\|methodologyVersionEvents" packages/db/src/schema/methodology.ts
    Expected Result: zero matches
    Evidence: .sisyphus/evidence/task-1-no-version-exports.txt

  Scenario: All 14 definition tables reference methodologyId
    Tool: Bash (grep)
    Steps:
      1. grep -c "methodologyId" packages/db/src/schema/methodology.ts
    Expected Result: count >= 14
    Evidence: .sisyphus/evidence/task-1-mid-column-count.txt
  ```

  **Commit**: YES (Wave 1 commit after T1+T2+T3 all pass)
  - Message: `refactor(db): drop methodology version schema, re-key definition tables`

---

- [ ] T2. Project schema changes — pins + executions

  **What to do**:
  - In `packages/db/src/schema/project.ts`:
    - In `projectMethodologyPins`: remove `methodologyVersionId` column and `publishedVersion` column. Keep `methodologyId`, `methodologyKey`.
    - In `projectExecutions`: remove `methodologyVersionId` column. Add `methodologyId` column (FK to `methodologyDefinitions.id`, not null) if it doesn't already exist — or rename the existing `methodologyVersionId` to `methodologyId` and update the reference target.
    - Update any index that referenced `methodologyVersionId` in these tables.

  **Must NOT do**:
  - Do not add any version-related columns as replacements
  - Do not touch `methodology.ts` (that is T1)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3)
  - **Blocks**: T4, T5, T6, T7
  - **Blocked By**: None

  **References**:
  - `packages/db/src/schema/project.ts` — full file, focus on `projectMethodologyPins` and `projectExecutions` table definitions
  - `packages/db/src/schema/methodology.ts` (T1 output) — to get the correct `methodologyDefinitions` reference for the new FK

  **Acceptance Criteria**:
  - [ ] `projectMethodologyPins` has no `methodologyVersionId` column
  - [ ] `projectMethodologyPins` has no `publishedVersion` column
  - [ ] `projectExecutions` has no `methodologyVersionId` column
  - [ ] `projectExecutions` has `methodologyId` FK to `methodologyDefinitions`

  ```
  Scenario: Pin table has no version columns
    Tool: Bash (grep)
    Steps:
      1. grep "methodologyVersionId\|publishedVersion" packages/db/src/schema/project.ts
    Expected Result: zero matches
    Evidence: .sisyphus/evidence/task-2-no-version-cols.txt
  ```

  **Commit**: YES (grouped with T1+T3 in Wave 1 commit)

---

- [ ] T3. Audit version-service files — produce extraction note

  **What to do**:
  - Read these files in full and produce a written note (saved to `.sisyphus/evidence/task-3-service-audit.md`) listing:
    - `packages/methodology-engine/src/services/methodology-version-service.ts`: for each exported function/class — is it lifecycle-only (delete it), or does it contain definition CRUD logic that should be preserved in a `methodology-service.ts`?
    - `packages/methodology-engine/src/version-service.ts`: same audit
    - `packages/methodology-engine/src/ports/version-repository.ts`: same audit — which port methods are version-lifecycle vs. definition access?
  - This note is the input contract for T6. T6 must not start until this note exists.
  - Do NOT make any code changes in this task.

  **Must NOT do**:
  - Do not edit any files
  - Do not delete any files

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2)
  - **Blocks**: T6
  - **Blocked By**: None

  **References**:
  - `packages/methodology-engine/src/services/methodology-version-service.ts`
  - `packages/methodology-engine/src/version-service.ts`
  - `packages/methodology-engine/src/ports/version-repository.ts`

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/task-3-service-audit.md` exists
  - [ ] File lists every exported symbol from all 3 files with a `DELETE` or `PRESERVE → methodology-service` label
  - [ ] File is readable prose, not just filenames

  ```
  Scenario: Audit note exists and is non-empty
    Tool: Bash
    Steps:
      1. wc -l .sisyphus/evidence/task-3-service-audit.md
    Expected Result: line count > 10
    Evidence: .sisyphus/evidence/task-3-audit-exists.txt
  ```

  **Commit**: NO (audit note only, no code changes)

---

- [ ] T4. methodology-repository.ts + lifecycle-repository.ts

  **What to do**:
  - In `packages/db/src/methodology-repository.ts`:
    - Remove all methods that accept or return `methodologyVersionId` — replace with `methodologyId` throughout
    - Remove any methods that are purely version-lifecycle (createDraftVersion, publishDraftVersion, archiveVersion, validateDraftVersion, getAuthoringSnapshot by version — these are gone)
    - Update all SELECT/JOIN queries: anywhere `methodology_version_id` is used as a filter, replace with `methodology_id`
    - Update return types to no longer include version fields
  - In `packages/db/src/lifecycle-repository.ts`:
    - Same treatment — this repository is version-scoped; all queries must be re-keyed to `methodologyId`
  - In `packages/db/src/project-context-repository.ts`:
    - Remove version resolution logic. Any lookup that went `projectPin → versionId → definitions` now goes `projectPin → methodologyId → definitions` directly.

  **Must NOT do**:
  - Do not touch the API router (T8)
  - Do not touch contracts types yet (T7)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T7)
  - **Blocks**: T8
  - **Blocked By**: T1, T2, T3

  **References**:
  - `packages/db/src/methodology-repository.ts` — full file
  - `packages/db/src/lifecycle-repository.ts` — full file
  - `packages/db/src/project-context-repository.ts` — full file
  - `packages/db/src/schema/methodology.ts` (T1 output) — new column names
  - `packages/db/src/schema/project.ts` (T2 output) — new pin/execution shape

  **Acceptance Criteria**:
  - [ ] No `methodologyVersionId` in any of the 3 repository files
  - [ ] All queries compile against the updated schema (no reference to dropped columns)
  - [ ] `cd packages/db && tsc --noEmit` exits 0

  ```
  Scenario: No version references remain in repositories
    Tool: Bash
    Steps:
      1. grep -n "methodologyVersionId\|methodology_version_id" packages/db/src/methodology-repository.ts packages/db/src/lifecycle-repository.ts packages/db/src/project-context-repository.ts
    Expected Result: zero matches
    Evidence: .sisyphus/evidence/task-4-no-version-refs.txt

  Scenario: DB package typechecks clean
    Tool: Bash
    Steps:
      1. cd packages/db && tsc --noEmit 2>&1
    Expected Result: exit 0, no errors
    Evidence: .sisyphus/evidence/task-4-typecheck.txt
  ```

  **Commit**: NO (grouped in Wave 2 commit after T4+T5+T6+T7)

---

- [ ] T5. project-context/src/service.ts

  **What to do**:
  - In `packages/project-context/src/service.ts`:
    - Remove all code that resolves methodology through a version (the `pin → versionId → definitions` chain)
    - Replace with direct `pin → methodologyId → definitions` resolution using the updated `project-context-repository.ts` from T4
    - Update any Effect service layer, types, or Layer wiring that refers to methodology version ID
    - Remove any exported types or interfaces that are version-ID-scoped from this file

  **Must NOT do**:
  - Do not touch contracts (T7)
  - Do not touch the API (T8)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`effect-best-practices`]
    - `effect-best-practices`: This package likely uses Effect services/layers — follow Effect patterns for service updates

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T6, T7)
  - **Blocks**: T8
  - **Blocked By**: T1, T2, T3

  **References**:
  - `packages/project-context/src/service.ts` — full file
  - `packages/db/src/project-context-repository.ts` (T4 output) — updated resolution API
  - `packages/db/src/schema/project.ts` (T2 output) — new pin shape (no versionId)

  **Acceptance Criteria**:
  - [ ] No `methodologyVersionId` in `packages/project-context/src/service.ts`
  - [ ] `cd packages/project-context && bun run check-types` exits 0

  ```
  Scenario: No version references in project-context service
    Tool: Bash
    Steps:
      1. grep -n "methodologyVersionId\|versionId" packages/project-context/src/service.ts
    Expected Result: zero matches
    Evidence: .sisyphus/evidence/task-5-no-version-refs.txt
  ```

  **Commit**: NO (grouped in Wave 2 commit)

---

- [ ] T6. methodology-engine services — delete lifecycle, fold CRUD

  **What to do**:
  - Read `.sisyphus/evidence/task-3-service-audit.md` (T3 output) before making any changes.
  - For each symbol labeled `DELETE` in the audit: remove it from its file.
  - For each symbol labeled `PRESERVE`: move it into `packages/methodology-engine/src/services/methodology-service.ts` (create this file if it doesn't exist). Update the function signatures to accept `methodologyId` instead of `methodologyVersionId`.
  - Delete `packages/methodology-engine/src/services/methodology-version-service.ts` once all preserved symbols are moved.
  - Delete `packages/methodology-engine/src/version-service.ts` once all preserved symbols are moved.
  - Update `packages/methodology-engine/src/ports/version-repository.ts`: rename to `methodology-repository-port.ts` (or merge into existing port), remove all version-lifecycle port methods, keep definition-access methods re-keyed to `methodologyId`.
  - Update any barrel `index.ts` files in `packages/methodology-engine/src/` to reflect deleted/renamed files.

  **Must NOT do**:
  - Do not start without reading the T3 audit note
  - Do not delete any symbol without verifying it has no callers outside this package first (use grep)
  - Do not touch contracts (T7) or the API router (T8)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`effect-best-practices`]
    - `effect-best-practices`: The methodology engine uses Effect services and layers

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T5, T7)
  - **Blocks**: T8
  - **Blocked By**: T1, T2, T3

  **References**:
  - `.sisyphus/evidence/task-3-service-audit.md` — MUST READ FIRST
  - `packages/methodology-engine/src/services/methodology-version-service.ts`
  - `packages/methodology-engine/src/version-service.ts`
  - `packages/methodology-engine/src/ports/version-repository.ts`
  - `packages/methodology-engine/src/tests/versioning/version-service.test.ts` — note which tests need removing (don't touch yet — T13 handles tests)
  - `packages/methodology-engine/src/tests/l1/methodology-version-service.test.ts` — same note

  **Acceptance Criteria**:
  - [ ] `methodology-version-service.ts` deleted
  - [ ] `version-service.ts` deleted
  - [ ] All preserved CRUD symbols exist in `methodology-service.ts` with `methodologyId` signatures
  - [ ] `cd packages/methodology-engine && tsc --noEmit` exits 0 (tests excluded)

  ```
  Scenario: Version service files deleted
    Tool: Bash
    Steps:
      1. ls packages/methodology-engine/src/services/methodology-version-service.ts 2>&1
      2. ls packages/methodology-engine/src/version-service.ts 2>&1
    Expected Result: both return "No such file or directory"
    Evidence: .sisyphus/evidence/task-6-files-deleted.txt

  Scenario: Preserved symbols exist in methodology-service.ts
    Tool: Bash
    Steps:
      1. cat .sisyphus/evidence/task-3-service-audit.md | grep PRESERVE | wc -l  (get expected count N)
      2. grep -c "export" packages/methodology-engine/src/services/methodology-service.ts
    Expected Result: export count >= N
    Evidence: .sisyphus/evidence/task-6-preserved-symbols.txt
  ```

  **Commit**: NO (grouped in Wave 2 commit)

---

- [ ] T7. Contracts — update consumers, then trim version.ts

  **What to do**:
  - Do NOT start this task last — but do NOT delete `version.ts` until all consumers are updated.
  - Open `packages/contracts/src/methodology/version.ts`. Identify which exported types are version-lifecycle-specific (VersionStatus, DraftVersion, PublishVersionInput, etc.) vs. genuinely reusable (if any). Version-lifecycle types are deleted. Any type that was purely a wrapper adding `versionId` to a definition shape: remove the `versionId` field or replace the type with a methodology-scoped equivalent.
  - For each consumer of the deleted types: update the import to use the new methodology-scoped type (or remove the import if the consumer is also being deleted in T6/T8).
  - Consumers to check: `packages/api/src/routers/methodology.ts`, any frontend feature files importing from contracts.
  - Once all consumers compile without importing the deleted types, remove those type definitions from `version.ts`. If `version.ts` becomes empty, delete the file and update the contracts barrel.

  **Must NOT do**:
  - Do not delete the file until all consumers are updated (to avoid cascading build failures)
  - Do not invent new types — only remove version-lifecycle types and update signatures to use `methodologyId`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T5, T6)
  - **Blocks**: T8, T9, T10
  - **Blocked By**: T1, T2, T3

  **References**:
  - `packages/contracts/src/methodology/version.ts` — full file
  - `packages/contracts/src/methodology/` — check barrel index.ts
  - `packages/api/src/routers/methodology.ts` — primary consumer (don't edit yet — just note which types it imports)
  - Any `apps/web/src/` files importing from `@chiron/contracts/methodology/version`

  **Acceptance Criteria**:
  - [ ] No version-lifecycle types remain in contracts (VersionStatus, DraftVersion, PublishVersionInput, etc.)
  - [ ] All remaining consumers compile against updated types
  - [ ] `cd packages/contracts && tsc --noEmit` exits 0

  ```
  Scenario: Lifecycle types gone from contracts
    Tool: Bash
    Steps:
      1. grep -n "VersionStatus\|DraftVersion\|PublishVersion\|RetireVersion" packages/contracts/src/methodology/version.ts 2>/dev/null || echo "file deleted or clean"
    Expected Result: zero matches or "file deleted or clean"
    Evidence: .sisyphus/evidence/task-7-lifecycle-types-gone.txt
  ```

  **Commit**: NO (grouped in Wave 2 commit after T4+T5+T6+T7 all pass typecheck)
  - Wave 2 commit message: `refactor(backend): remove version services, update repositories and contracts`

---

- [ ] T8. MethodologyService — refactor from methodology-version-service.ts

  **What to do**:
  - Read `.sisyphus/evidence/task-3-service-audit.md` (T3 output) and the T6 output (`methodology-service.ts` scaffold) before starting.
  - The goal: create `packages/methodology-engine/src/services/methodology-service.ts` as the new main service class using the `Effect.Service` class pattern (Effect 3.x):
    ```ts
    export class MethodologyService extends Effect.Service<MethodologyService>()(
      "MethodologyService",
      { effect: Effect.gen(function* () { ... }), dependencies: [...] }
    ) {}
    ```
  - The service exposes definition CRUD operations (listMethodologies, getMethodology, listFactDefinitions, listWorkUnitTypes, listAgentTypes, listWorkflows, listArtifactSlotDefinitions, listLinkTypeDefinitions) all accepting `methodologyId: string` (not versionId).
  - Gut all lifecycle methods (createDraftVersion, publishVersion, archiveVersion, validateDraft) from `methodology-version-service.ts` — these are deleted. Preserve any definition-access logic by folding it into the new `MethodologyService`.
  - Delete `packages/methodology-engine/src/services/methodology-version-service.ts` once all preserved logic is in the new file.
  - Delete `packages/methodology-engine/src/services/published-methodology-service.ts` entirely (no methods survive — all lifecycle).
  - Update `packages/methodology-engine/src/index.ts` barrel exports: remove `MethodologyVersionService`, `PublishedMethodologyService` exports; add `MethodologyService`.
  - Use `Effect.gen` + `yield*` for all async operations. Return `Effect.Effect<T, MethodologyError>` from all methods (no throwing, no Promise).
  - Load `effect-best-practices` skill before writing any Effect code.

  **Must NOT do**:
  - Do not use `Context.Tag` for the new `MethodologyService` — use `Effect.Service` class pattern
  - Do not change existing services that already use `Context.Tag` (WorkUnitService, WorkflowService, etc.) — only the new service uses the class pattern
  - Do not leave `MethodologyEngineL1Live` export name unchanged in `apps/server/src/index.ts` — it must not change
  - Do not touch any other service files (WorkUnitService, WorkflowService etc.) — those are T9/T10/T11

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`effect-best-practices`]
    - `effect-best-practices`: Creating Effect.Service class, Effect.gen, Layer wiring, TaggedError patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9, T10, T11)
  - **Blocks**: T12
  - **Blocked By**: T4, T5, T6, T7

  **References**:
  - `.sisyphus/evidence/task-3-service-audit.md` — MUST READ FIRST
  - `packages/methodology-engine/src/services/methodology-version-service.ts` — 2307-line source; gut lifecycle, preserve definition CRUD
  - `packages/methodology-engine/src/services/published-methodology-service.ts` — DELETE entirely
  - `packages/methodology-engine/src/errors.ts` — existing error types; add `MethodologyNotFoundError` if missing, delete `VersionNotFoundError`, `VersionNotDraftError`, `DraftVersionAlreadyExistsError`, `DuplicateVersionError`
  - `packages/methodology-engine/src/index.ts` — 94-line barrel; update exports
  - `packages/methodology-engine/src/layers/live.ts` — 42-line Layer composition; keep `MethodologyEngineL1Live` name intact
  - Effect.Service class pattern example: `~/.local/share/effect-solutions/effect/packages/effect/src/Effect.ts` + effect-best-practices skill

  **Acceptance Criteria**:
  - [ ] `methodology-version-service.ts` deleted
  - [ ] `published-methodology-service.ts` deleted
  - [ ] `methodology-service.ts` exists using `Effect.Service` class pattern
  - [ ] All definition-access methods accept `methodologyId` (not `versionId`)
  - [ ] `cd packages/methodology-engine && tsc --noEmit` exits 0

  ```
  Scenario: New service file exists with Effect.Service pattern
    Tool: Bash
    Steps:
      1. grep "extends Effect.Service" packages/methodology-engine/src/services/methodology-service.ts
    Expected Result: one match
    Evidence: .sisyphus/evidence/task-8-effect-service-pattern.txt

  Scenario: Version service files deleted
    Tool: Bash
    Steps:
      1. ls packages/methodology-engine/src/services/methodology-version-service.ts 2>&1
      2. ls packages/methodology-engine/src/services/published-methodology-service.ts 2>&1
    Expected Result: both "No such file or directory"
    Evidence: .sisyphus/evidence/task-8-version-services-deleted.txt
  ```

  **Commit**: NO (grouped in Wave 3 commit after T8+T9+T10+T11)

---

- [ ] T9. WorkUnitService + WorkUnitFactService + WorkUnitArtifactSlotService — update versionId→methodologyId

  **What to do**:
  - These services already use `Context.Tag` + `Effect.Effect` return types — DO NOT change the service pattern (keep `Context.Tag`).
  - In `packages/methodology-engine/src/services/work-unit-service.ts`:
    - Replace all `methodologyVersionId` / `versionId` parameter names and types with `methodologyId`
    - Update all repository calls to pass `methodologyId` instead of `versionId`
    - Update return types / error union if they reference version-scoped types
  - Same treatment for:
    - `packages/methodology-engine/src/services/work-unit-fact-service.ts`
    - `packages/methodology-engine/src/services/work-unit-artifact-slot-service.ts`
  - Update the port interfaces in `packages/methodology-engine/src/ports/work-unit-repository.ts` to remove `versionId` params (should match T6 output).
  - Do NOT restructure the service class or switch to `Effect.Service` class — only rename parameters and update port calls.

  **Must NOT do**:
  - Do not convert existing `Context.Tag` services to `Effect.Service` class
  - Do not touch WorkflowService or FormStepDefinitionService (T10/T11)
  - Do not touch the oRPC router (T12)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`effect-best-practices`]
    - `effect-best-practices`: Understanding Effect service patterns and port wiring

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T8, T10, T11)
  - **Blocks**: T12
  - **Blocked By**: T4, T5, T6, T7

  **References**:
  - `packages/methodology-engine/src/services/work-unit-service.ts`
  - `packages/methodology-engine/src/services/work-unit-fact-service.ts`
  - `packages/methodology-engine/src/services/work-unit-artifact-slot-service.ts`
  - `packages/methodology-engine/src/ports/work-unit-repository.ts` (T6 output) — updated port interface
  - `packages/db/src/schema/methodology.ts` (T1 output) — new column names for correctness check

  **Acceptance Criteria**:
  - [ ] No `methodologyVersionId` / `versionId` in any of the 3 work-unit service files
  - [ ] All method signatures accept `methodologyId: string`
  - [ ] `cd packages/methodology-engine && tsc --noEmit` exits 0

  ```
  Scenario: No version ID params in work-unit services
    Tool: Bash
    Steps:
      1. grep -n "methodologyVersionId\|versionId" packages/methodology-engine/src/services/work-unit-service.ts packages/methodology-engine/src/services/work-unit-fact-service.ts packages/methodology-engine/src/services/work-unit-artifact-slot-service.ts
    Expected Result: zero matches
    Evidence: .sisyphus/evidence/task-9-work-unit-no-version.txt
  ```

  **Commit**: NO (grouped in Wave 3 commit after T8+T9+T10+T11)

---

- [ ] T10. WorkflowService + WorkflowTopologyMutationService + WorkflowEditorDefinitionService + WorkflowContextFactDefinitionService — update versionId→methodologyId

  **What to do**:
  - These services already use `Context.Tag` + `Effect.Effect` return types — DO NOT change the service pattern.
  - In each of the following files, replace all `methodologyVersionId` / `versionId` parameter names and types with `methodologyId`. Update all repository calls to pass `methodologyId`. Update port interface calls to match T6 output:
    - `packages/methodology-engine/src/services/workflow-service.ts` (356 lines)
    - `packages/methodology-engine/src/services/workflow-topology-mutation-service.ts`
    - `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`
    - `packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts`
  - Update `packages/methodology-engine/src/ports/workflow-repository.ts` (T6 output) — ensure versionId is gone from the port interface.

  **Must NOT do**:
  - Do not convert existing `Context.Tag` services to `Effect.Service` class
  - Do not touch WorkUnitService (T9), WorkflowAuthoringTransactionService (T11), or FormStepDefinitionService (T11)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`effect-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T8, T9, T11)
  - **Blocks**: T12
  - **Blocked By**: T4, T5, T6, T7

  **References**:
  - `packages/methodology-engine/src/services/workflow-service.ts` — 356 lines, primary target
  - `packages/methodology-engine/src/services/workflow-topology-mutation-service.ts`
  - `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`
  - `packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts`
  - `packages/methodology-engine/src/ports/workflow-repository.ts` (T6 output)

  **Acceptance Criteria**:
  - [ ] No `methodologyVersionId` / `versionId` in any of the 4 workflow service files
  - [ ] `cd packages/methodology-engine && tsc --noEmit` exits 0

  ```
  Scenario: No version ID params in workflow services
    Tool: Bash
    Steps:
      1. grep -n "methodologyVersionId\|versionId" packages/methodology-engine/src/services/workflow-service.ts packages/methodology-engine/src/services/workflow-topology-mutation-service.ts packages/methodology-engine/src/services/workflow-editor-definition-service.ts packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts
    Expected Result: zero matches
    Evidence: .sisyphus/evidence/task-10-workflow-no-version.txt
  ```

  **Commit**: NO (grouped in Wave 3 commit after T8+T9+T10+T11)

---

- [ ] T11. WorkflowAuthoringTransactionService + FormStepDefinitionService + remaining step services + layers/live.ts + index.ts

  **What to do**:
  - In `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts` (305 lines): replace all `methodologyVersionId`/`versionId` with `methodologyId`. Keep `Context.Tag` pattern.
  - In `packages/methodology-engine/src/services/form-step-definition-service.ts`: same treatment.
  - Check for any other service files in `packages/methodology-engine/src/services/` not covered by T8–T10 that still reference `versionId` — update them.
  - In `packages/methodology-engine/src/layers/live.ts` (42 lines):
    - Remove `MethodologyVersionService` and `PublishedMethodologyService` from the `Layer.mergeAll` / `Layer.provide` chain
    - Add `MethodologyService` (from T8) to the layer composition
    - CRITICAL: The export name `MethodologyEngineL1CoreServicesLive` (and its alias `MethodologyEngineL1Live` if used) must NOT change — it is imported in `apps/server/src/index.ts`
  - In `packages/methodology-engine/src/index.ts` (94 lines):
    - Remove all exports of deleted services (`MethodologyVersionService`, `PublishedMethodologyService`)
    - Add export for `MethodologyService`
    - Remove exports for deleted error types (`VersionNotFoundError`, etc.)
    - Verify all remaining exports still resolve

  **Must NOT do**:
  - Do not rename `MethodologyEngineL1Live` or `MethodologyEngineL1CoreServicesLive`
  - Do not change the Layer composition order for surviving services
  - Do not add new services not already in scope

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`effect-best-practices`]
    - `effect-best-practices`: Layer.mergeAll composition, Effect service registration patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T8, T9, T10)
  - **Blocks**: T12
  - **Blocked By**: T4, T5, T6, T7

  **References**:
  - `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts` — 305 lines
  - `packages/methodology-engine/src/services/form-step-definition-service.ts`
  - `packages/methodology-engine/src/layers/live.ts` — 42 lines; update Layer composition
  - `packages/methodology-engine/src/index.ts` — 94 lines; update barrel exports
  - `apps/server/src/index.ts` — READ ONLY to verify export name — DO NOT edit this file in T11

  **Acceptance Criteria**:
  - [ ] No `methodologyVersionId`/`versionId` in authoring transaction service or form step service
  - [ ] `layers/live.ts` no longer references `MethodologyVersionService` or `PublishedMethodologyService`
  - [ ] `MethodologyEngineL1CoreServicesLive` export name unchanged
  - [ ] `cd packages/methodology-engine && tsc --noEmit` exits 0

  ```
  Scenario: Layer export name preserved
    Tool: Bash
    Steps:
      1. grep "MethodologyEngineL1CoreServicesLive\|MethodologyEngineL1Live" packages/methodology-engine/src/layers/live.ts
    Expected Result: at least one match (export still exists)
    Evidence: .sisyphus/evidence/task-11-layer-name-preserved.txt

  Scenario: Deleted services removed from layer
    Tool: Bash
    Steps:
      1. grep "MethodologyVersionService\|PublishedMethodologyService" packages/methodology-engine/src/layers/live.ts
    Expected Result: zero matches
    Evidence: .sisyphus/evidence/task-11-deleted-services-gone.txt
  ```

  **Commit**: NO (grouped in Wave 3 commit)
  - Wave 3 commit message: `refactor(methodology-engine): replace version services with MethodologyService, update all engine services to methodologyId`

---

- [ ] T12. API routers — methodology.ts + project.ts — remove version CRUD, update all versionId refs

  **What to do**:
  - In `packages/api/src/routers/methodology.ts`:
    - Delete all oRPC procedure handlers for version CRUD: create version, update version, publish version, archive version, get version, list versions, validate version
    - For any procedure that previously took `versionId` as input and returned version-scoped definitions (facts, work units, agents, workflows, etc.): update the procedure to accept `methodologyId` only, call the updated `MethodologyService` from T8
    - Update all service calls to use the new `MethodologyService` API from T8
    - Update Zod input schemas to remove `versionId` fields
    - Update response schemas to remove version envelope fields
  - In `packages/api/src/routers/project.ts`:
    - Remove any procedure that creates/resolves project pins via `methodologyVersionId`
    - Update pin creation and execution creation to pass `methodologyId` directly

  **Must NOT do**:
  - Do not add any version-related procedures or params
  - Do not touch UI files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`hono`]
    - `hono`: The API uses Hono + oRPC — follow Hono routing and oRPC procedure patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T13, T14, T15)
  - **Blocks**: T16, T17
  - **Blocked By**: T8, T9, T10, T11

  **References**:
  - `packages/api/src/routers/methodology.ts` — full file
  - `packages/api/src/routers/project.ts` — Momus-flagged; confirmed exists
  - `packages/methodology-engine/src/services/methodology-service.ts` (T8 output) — new MethodologyService API
  - `packages/db/src/methodology-repository.ts` (T4 output) — new repository API
  - `packages/contracts/src/methodology/` (T7 output) — updated types

  **Acceptance Criteria**:
  - [ ] No procedure with `versionId` input in methodology router
  - [ ] No `publishVersion`, `createDraftVersion`, `archiveVersion` procedures remain
  - [ ] `packages/api/src/routers/project.ts` uses `methodologyId` for pin/execution creation
  - [ ] `cd packages/api && tsc --noEmit` exits 0

  ```
  Scenario: No version procedure inputs remain
    Tool: Bash
    Steps:
      1. grep -n "versionId\|versions\/" packages/api/src/routers/methodology.ts packages/api/src/routers/project.ts
    Expected Result: zero matches
    Evidence: .sisyphus/evidence/task-12-no-version-routes.txt

  Scenario: API still returns facts for a methodology
    Tool: Bash (curl — requires dev server running on port 3000)
    Note: API uses oRPC at /rpc — NOT REST at /api/methodologies.
          Procedures: methodology.listMethodologies (no input) and methodology.listFactDefinitions (input: {methodologyId})
    Steps:
      1. Start dev server: bun run dev &; sleep 5
      2. List methodologies via oRPC:
         curl -s -X POST http://localhost:3000/rpc/methodology/listMethodologies \
           -H "Content-Type: application/json" -d '{}' | jq '.[0].id' > /tmp/mid.txt
         METHODOLOGY_ID=$(cat /tmp/mid.txt | tr -d '"')
      3. List fact definitions for that methodology:
         curl -s -X POST http://localhost:3000/rpc/methodology/listFactDefinitions \
           -H "Content-Type: application/json" -d "{\"methodologyId\":\"$METHODOLOGY_ID\"}" | jq 'length'
    Expected Result: integer > 0 (facts exist for the methodology)
    Evidence: .sisyphus/evidence/task-12-facts-api.txt
  ```

  **Commit**: NO (grouped in Wave 4 commit after T12+T13+T14+T15)

---

- [ ] T13. UI version routes — delete 8 routes, create flattened replacements

  **What to do**:
  - DELETE these route files entirely (do not archive):
    - `apps/web/src/routes/methodologies.$methodologyId.versions.tsx` (list page)
    - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
    - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
    - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
    - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
    - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
    - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
    - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
  - CREATE these replacement route files at the flattened paths:
    - `apps/web/src/routes/methodologies.$methodologyId.facts.tsx`
    - `apps/web/src/routes/methodologies.$methodologyId.agents.tsx`
    - `apps/web/src/routes/methodologies.$methodologyId.work-units.tsx`
    - `apps/web/src/routes/methodologies.$methodologyId.work-units.$workUnitKey.tsx`
    - `apps/web/src/routes/methodologies.$methodologyId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
    - `apps/web/src/routes/methodologies.$methodologyId.dependency-definitions.tsx`
  - The new route files use `methodologyId` (not `versionId`) as the sole param. Copy the relevant UI content from the deleted files, removing any version-specific props/loaders.
  - Do NOT regenerate `routeTree.gen.ts` yet — that is T16.

  **Must NOT do**:
  - Do not manually edit `routeTree.gen.ts`
  - Do not add version-related params to the new routes

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`vercel-react-best-practices`]
    - `vercel-react-best-practices`: TanStack Router + React patterns for route components

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T12, T14, T15)
  - **Blocks**: T16
  - **Blocked By**: T8, T9, T10, T11

  **References**:
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx` — source of content patterns to port
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx` — source for facts route
  - All other version route files listed above — read before deleting
  - `apps/web/src/features/methodologies/version-workspace.tsx` (T14 will rename/refactor this — coordinate that new route files import from the updated workspace, not the version-named one)

  **Acceptance Criteria**:
  - [ ] All 8 listed version route files deleted
  - [ ] All 6 flattened replacement route files created
  - [ ] No `versionId` param in any new route file
  - [ ] `find apps/web/src/routes -name "*versions*"` returns empty

  ```
  Scenario: No version route files remain
    Tool: Bash
    Steps:
      1. find apps/web/src/routes -name "*versions*"
    Expected Result: empty output
    Evidence: .sisyphus/evidence/task-13-no-version-routes.txt

  Scenario: Flattened facts route file exists
    Tool: Bash
    Steps:
      1. ls apps/web/src/routes/methodologies.\$methodologyId.facts.tsx
    Expected Result: file exists
    Evidence: .sisyphus/evidence/task-13-facts-route-exists.txt
  ```

  **Commit**: NO (grouped in Wave 4 commit)

---

- [ ] T14. UI feature files — workspace rename + refactor + sidebar nav + project routes

  **What to do**:
  **Step 1 — Rename (separate from logic changes):**
  - Rename `version-workspace.tsx` → `methodology-workspace.tsx`
  - Rename `version-workspace-graph.tsx` → `methodology-workspace-graph.tsx`
  - Rename `version-workspace-author-hub.tsx` → `methodology-workspace-author-hub.tsx`
  - Rename `version-workspace-author-hub-actions.ts` → `methodology-workspace-author-hub-actions.ts`
  - Update all import paths that reference the old names.
  - Delete `version-label.ts` and `version-graph.ts` (these were version-specific utilities — remove their import sites too).
  - Commit this rename step before making logic changes (see commit note below).

  **Step 2 — Logic changes (after rename commit):**
  - In the renamed workspace files: remove all `versionId` props, state, and query params. Replace version-based data loading with `methodologyId`-based loading.
  - In `apps/web/src/components/app-sidebar.tsx` and `sidebar-sections.tsx`: remove all nav links that point to `/versions/` routes. Update any links to methodology content to use the new flattened paths.
  - In `apps/web/src/components/app-shell.tsx`: remove version selector component if present. (Momus-flagged as a file containing version refs.)
  - In `apps/web/src/features/methodologies/command-palette.tsx`: remove version-related commands (create version, publish version, archive version).
  - In `apps/web/src/routes/projects.new.tsx`: remove `versionId` from project creation form and mutation — project now pins by `methodologyId` only.
  - In `apps/web/src/routes/projects.$projectId.pinning.tsx`: update pinning UI to select a methodology directly (no version dropdown). Remove `publishedVersion` field.
  - In `apps/web/src/routes/projects.$projectId.work-units.tsx`: remove any `versionId` refs in data fetching or route params.
  - In `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`: remove `methodologyVersionId` from execution context if present.

  **Must NOT do**:
  - Do not rename and refactor logic in the same commit — rename first, then logic changes
  - Do not redesign the sidebar — only remove version items
  - Do not redesign the pinning UI — only remove the version selection step

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`vercel-react-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T12, T13, T15)
  - **Blocks**: T16
  - **Blocked By**: T8, T9, T10, T11

  **References**:
  - `apps/web/src/features/methodologies/version-workspace.tsx`
  - `apps/web/src/features/methodologies/version-workspace-graph.tsx`
  - `apps/web/src/features/methodologies/version-workspace-author-hub.tsx`
  - `apps/web/src/features/methodologies/version-workspace-author-hub-actions.ts`
  - `apps/web/src/features/methodologies/version-label.ts`
  - `apps/web/src/features/methodologies/version-graph.ts`
  - `apps/web/src/features/methodologies/command-palette.tsx`
  - `apps/web/src/components/app-sidebar.tsx`
  - `apps/web/src/components/app-shell.tsx` — Momus-flagged
  - `apps/web/src/components/sidebar-sections.tsx` (if exists)
  - `apps/web/src/routes/projects.new.tsx` — Momus-flagged
  - `apps/web/src/routes/projects.$projectId.pinning.tsx` — Momus-flagged
  - `apps/web/src/routes/projects.$projectId.work-units.tsx` — Momus-flagged
  - `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx` — Momus-flagged

  **Acceptance Criteria**:
  - [ ] No file named `version-workspace*` or `version-label*` or `version-graph*` remains in features/methodologies/
  - [ ] `methodology-workspace.tsx` exists and has no `versionId` prop
  - [ ] Sidebar has no links containing `/versions/`
  - [ ] Command palette has no version lifecycle commands
  - [ ] `app-shell.tsx` has no version selector component
  - [ ] `projects.new.tsx` has no `versionId` field in form or mutation
  - [ ] `projects.$projectId.pinning.tsx` has no version dropdown / `publishedVersion` field

  ```
  Scenario: No version-named feature files remain
    Tool: Bash
    Steps:
      1. find apps/web/src/features/methodologies -name "version-*"
    Expected Result: empty output
    Evidence: .sisyphus/evidence/task-14-no-version-files.txt

  Scenario: Sidebar has no version links
    Tool: Bash
    Steps:
      1. grep -n "/versions/" apps/web/src/components/app-sidebar.tsx apps/web/src/components/sidebar-sections.tsx 2>/dev/null
    Expected Result: zero matches
    Evidence: .sisyphus/evidence/task-14-sidebar-clean.txt

  Scenario: Project new route has no versionId
    Tool: Bash
    Steps:
      1. grep -n "versionId\|publishedVersion" apps/web/src/routes/projects.new.tsx apps/web/src/routes/projects.\$projectId.pinning.tsx 2>/dev/null
    Expected Result: zero matches
    Evidence: .sisyphus/evidence/task-14-project-routes-clean.txt
  ```

  **Commit**: YES — two commits:
  1. `refactor(ui): rename version-workspace files to methodology-workspace`
  2. (after logic changes) included in Wave 4 commit

---

- [ ] T15. Seed files — update all 6 to insert against methodologyId directly

  **What to do**:
  - In each of the following files, remove all calls to create methodology versions. Instead, after creating a `methodologyDefinition`, insert all definitions (facts, work units, agents, workflows, lifecycle states, transitions, artifact slots, etc.) using the `methodologyDefinition.id` directly as `methodologyId`.
  - Files to update:
    - `packages/scripts/src/seed/methodology/canonical-bmad.ts`
    - `packages/scripts/src/seed/methodology/authority.ts`
    - `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts`
    - `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
    - `packages/scripts/src/seed/methodology/setup/setup-invoke-phase-1-fixture.ts`
    - `packages/scripts/src/seed/methodology/setup/brainstorming-demo-fixture.ts`
  - The pattern in each file currently is roughly: `createMethodology → createVersion → insertDefinitionsWithVersionId`. The new pattern is: `createMethodology → insertDefinitionsWithMethodologyId`.
  - Remove any helpers like `createDraftVersion`, `publishVersion` from seed utilities.

  **Must NOT do**:
  - Do not add any version-creation calls
  - Do not change the actual definition content (facts, work units, agents) — only the ID threading changes

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T12, T13, T14)
  - **Blocks**: T17, T18
  - **Blocked By**: T8, T9, T10, T11

  **References**:
  - `packages/scripts/src/seed/methodology/canonical-bmad.ts` — primary seed, largest file
  - `packages/scripts/src/seed/methodology/authority.ts`
  - `packages/scripts/src/seed/methodology/setup/` — all 4 fixture files
  - `packages/scripts/src/seed/methodology/index.ts` — entry point, may need updates
  - `packages/db/src/schema/methodology.ts` (T1 output) — new insert shapes (no versionId)

  **Acceptance Criteria**:
  - [ ] No call to `createDraftVersion`, `createVersion`, or `publishVersion` in any seed file
  - [ ] All definition inserts use `methodologyId` (not `methodologyVersionId`)
  - [ ] `cd packages/scripts && tsc --noEmit` exits 0

  ```
  Scenario: No version creation calls in seed files
    Tool: Bash
    Steps:
      1. grep -rn "createDraftVersion\|createVersion\|publishVersion\|methodologyVersionId" packages/scripts/src/seed/
    Expected Result: zero matches
    Evidence: .sisyphus/evidence/task-15-no-version-seed-calls.txt
  ```

  **Commit**: NO (grouped in Wave 4 commit)
  - Wave 4 commit message: `refactor(api+ui+seed): remove version routes, features, project version refs, and seed version creation`

---

- [ ] T16. Regenerate routeTree.gen.ts

  **What to do**:
  - Run the TanStack Router route generation command. This is typically `bun run generate` or starts automatically on dev server boot. Check `package.json` in `apps/web` for the exact command.
  - Do NOT manually edit `apps/web/src/routeTree.gen.ts`.
  - After regeneration, confirm the file no longer contains any route entry with `versions` or `versionId` in the path.
  - If the generation fails due to TypeScript errors in route files, fix the errors in the route files (not in `routeTree.gen.ts`), then regenerate again.

  **Must NOT do**:
  - Do not hand-edit `routeTree.gen.ts` under any circumstances

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 — sequential after T13 + T14
  - **Blocks**: T17
  - **Blocked By**: T13, T14

  **References**:
  - `apps/web/package.json` — find the generate/codegen script
  - `apps/web/src/routeTree.gen.ts` — verify output post-generation

  **Acceptance Criteria**:
  - [ ] `bun run generate` (or equivalent) exits 0
  - [ ] `grep "versions\.\$versionId" apps/web/src/routeTree.gen.ts` returns empty
  - [ ] File timestamp is newer than T9/T10 completion

  ```
  Scenario: routeTree has no version routes
    Tool: Bash
    Steps:
      1. grep "versions\.\$versionId\|versionsVersionId" apps/web/src/routeTree.gen.ts
    Expected Result: zero matches
    Evidence: .sisyphus/evidence/task-16-no-version-in-tree.txt
  ```

  **Commit**: NO (grouped in Wave 5 commit)

---

- [ ] T17. Update all test files

  **What to do**:
  - Update every test file that references `methodologyVersionId`, version creation, or version routes. The goal is compile-and-pass, not new coverage.
  - Files to update:
    - `packages/methodology-engine/src/tests/versioning/version-service.test.ts` — delete this file (tests for deleted lifecycle)
    - `packages/methodology-engine/src/tests/l1/methodology-version-service.test.ts` — delete this file
    - `packages/db/src/tests/schema/methodology-schema.test.ts` — update schema assertions (remove version table assertions)
    - `packages/db/src/tests/repository/methodology-repository.integration.test.ts` — update to use `methodologyId` throughout
    - `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts` — update for versionless seed shape
    - `packages/scripts/src/tests/seeding/methodology-seed-integration.test.ts` — update for versionless seed shape
    - `packages/scripts/src/tests/seeding/canonical-bmad-seed.test.ts` — update for versionless seed shape
    - All `apps/web/src/tests/routes/` files referencing version routes (7 files) — update or delete if testing deleted routes
    - `apps/web/src/tests/features/methodologies/version-workspace*.test.tsx` — update to use new workspace name
    - `packages/api/src/tests/routers/methodology.test.ts` — update for versionless API shape
    - `packages/project-context/src/tests/service/runtime-history-repin.test.ts` — update for direct methodologyId resolution
    - `apps/web/src/tests/components/app-sidebar.integration.test.tsx` — update for removed version nav items
    - `apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx` — update for removed version-related sections
  - For tests on deleted functionality (lifecycle tests): delete the test file.
  - For tests on refactored functionality: update test inputs/assertions to match new `methodologyId`-based shape.

  **Must NOT do**:
  - Do not write new tests beyond fixing existing ones
  - Do not skip or `.skip` any test as a workaround — either fix it or delete the test file if the tested code is gone

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — must run after T16 (routeTree valid)
  - **Parallel Group**: Wave 5 — sequential
  - **Blocks**: T18
  - **Blocked By**: T16

  **References**:
  - All test files listed above
  - `packages/db/src/schema/methodology.ts` (T1 output) — new shape assertions
  - `packages/db/src/methodology-repository.ts` (T4 output) — new repository API for test setup

  **Acceptance Criteria**:
  - [ ] `bun run test` exits 0
  - [ ] No `.skip` or `.todo` added to existing tests as workarounds
  - [ ] `version-service.test.ts` and `methodology-version-service.test.ts` deleted

  ```
  Scenario: All tests pass
    Tool: Bash
    Steps:
      1. bun run test 2>&1 | tail -20
    Expected Result: "X passed, 0 failed" (or equivalent bun test output)
    Evidence: .sisyphus/evidence/task-17-tests-pass.txt

  Scenario: Deleted test files gone
    Tool: Bash
    Steps:
      1. ls packages/methodology-engine/src/tests/versioning/version-service.test.ts 2>&1
      2. ls packages/methodology-engine/src/tests/l1/methodology-version-service.test.ts 2>&1
    Expected Result: both "No such file or directory"
    Evidence: .sisyphus/evidence/task-17-deleted-tests.txt
  ```

  **Commit**: NO (grouped in Wave 5 commit)

---

- [ ] T18. db:push + full typecheck gate

  **What to do**:
  - Run `bun run db:push` against the local dev DB. This will apply the new schema (drop version tables, rename columns). Confirm it exits 0.
  - Run `bun run db:seed` to verify seed files load cleanly against the new schema. Confirm it exits 0 with no FK constraint errors.
  - Run `bun run check-types` (full repo via turbo). Confirm exit 0.
  - If any errors: fix them in the appropriate files (do not suppress with `@ts-ignore`), then re-run until clean.
  - Run `bun run test` one final time to confirm all tests pass post-push.

  **Must NOT do**:
  - Do not suppress TypeScript errors
  - Do not skip this task — it is the acceptance gate for all Wave 1-5 work

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — final gate task
  - **Parallel Group**: Wave 5 — last step
  - **Blocks**: FINAL wave
  - **Blocked By**: T17

  **References**:
  - `package.json` (root) — `db:push`, `db:seed`, `check-types`, `test` script names

  **Acceptance Criteria**:
  - [ ] `bun run db:push` exits 0
  - [ ] `bun run db:seed` exits 0
  - [ ] `bun run check-types` exits 0
  - [ ] `bun run test` exits 0

  ```
  Scenario: Full stack clean
    Tool: Bash
    Steps:
      1. bun run db:push 2>&1 | tail -5
      2. bun run db:seed 2>&1 | tail -5
      3. bun run check-types 2>&1 | tail -5
      4. bun run test 2>&1 | tail -10
    Expected Result: all exit 0, no error lines
    Evidence: .sisyphus/evidence/task-18-full-gate.txt
  ```

  **Commit**: YES — Wave 5 commit after all tasks pass
  - Message: `refactor(tests+db): update tests and run db:push for versionless methodology shape`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. Verify: no table containing "version" remains in schema, all 14 definition tables have `methodology_id` column, `project_methodology_pins` and `project_executions` have no `methodology_version_id`, no route file containing "versions.$versionId" exists, `bun run check-types` passes, seed runs clean. Check evidence files in `.sisyphus/evidence/`.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run check-types` + `bun run test`. Review all changed files for `as any`, `@ts-ignore`, empty catches, dead imports, leftover `versionId` references in variable names/comments. Check AI slop patterns.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Lint issues [N] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean DB (`db:push` + `db:seed`). Navigate to `/methodologies` in browser via Playwright. Verify methodology detail page loads with facts/agents/work-units/workflows accessible without a version param. Verify project pin works against `methodologyId`. Verify no 404s on any methodology route. Save screenshots to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  Diff all changed files against plan spec. Confirm no files outside plan's scope were modified. Confirm no new status/lifecycle field was added to `methodologyDefinitions`. Confirm `routeTree.gen.ts` was regenerated, not hand-edited. Confirm `version.ts` contracts file was the last consumer updated.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy
Single commit per wave after all tasks in the wave pass typecheck.
- Wave 1: `refactor(db): drop methodology version schema, re-key definition tables`
- Wave 2: `refactor(backend): remove version services, update repositories and contracts`
- Wave 3: `refactor(methodology-engine): replace version services with MethodologyService, update all engine services to methodologyId`
- Wave 4a: `refactor(ui): rename version-workspace files to methodology-workspace` (rename-only commit, from T14 Step 1)
- Wave 4b: `refactor(api+ui+seed): remove version routes, features, project version refs, and seed version creation`
- Wave 5: `refactor(tests+db): update tests and run db:push for versionless methodology shape`

---

## Success Criteria

### Verification Commands
```bash
# No version tables remain
# local.db lives at repo root — configured via apps/server/.env DATABASE_URL=file:../../local.db
sqlite3 ./local.db ".tables" | tr ' ' '\n' | grep version
# Expected: empty

# All definition tables have methodology_id
sqlite3 ./local.db "PRAGMA table_info(methodology_fact_definitions)" | grep methodology_id
# Expected: row present

# No version routes in file system
find apps/web/src/routes -name "*versions*"
# Expected: empty

# TypeScript clean
bun run check-types
# Expected: exit 0

# Tests pass
bun run test
# Expected: exit 0

# Seed clean
bun run db:push && bun run db:seed
# Expected: exit 0
```

### Final Checklist
- [ ] `methodology_versions` table gone
- [ ] `methodology_version_events` table gone
- [ ] All 14 definition tables have `methodology_id` FK
- [ ] `project_methodology_pins` has no `methodology_version_id`
- [ ] `project_executions` has no `methodology_version_id`
- [ ] No `/versions/` routes exist in apps/web/src/routes/
- [ ] `routeTree.gen.ts` regenerated (not hand-edited)
- [ ] All seed files insert against `methodologyId` directly
- [ ] `bun run check-types` clean
- [ ] `bun run test` clean
