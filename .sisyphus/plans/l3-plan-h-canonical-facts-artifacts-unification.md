# L3 Plan H — Canonical Facts + Artifact Instance Unification

## TL;DR
> **Summary**: Replace the remaining mixed fact/artifact models with one canonical `kind`-first schema family across design-time and runtime, then cut all writers/readers over together so contracts, db schema, repositories, workflow services, API routes, and web surfaces stop speaking conflicting models.
>
> **Primary outcomes**:
> - Canonical fact-family naming locked across layers: `plain_fact`, `work_unit_reference_fact`, `bound_fact`, `workflow_ref_fact`, `artifact_slot_reference_fact`, `work_unit_draft_spec_fact`
> - `type` exists only for `plain_fact`
> - JSON subfield shape/cardinality stays inside `validationJson`
> - Runtime artifacts move from snapshot lineage to one mutable artifact instance per `(projectWorkUnitId, slotDefinitionId)`
> - Work-unit references stop masquerading as primitive types and become explicit fact family members
>
> **Effort**: XL
> **Parallel**: limited; contract + schema locks first, then package waves
> **Critical Path**: contract lock → db schema/migration lock → repository/runtime service cutover → API/web/test cutover

## Why this plan exists
- The current Plan B still locks `artifact_snapshot_fact` and snapshot-lineage artifact runtime semantics.
- Project facts, work-unit facts, and workflow-context facts still use different naming and persistence models.
- Work-unit references are currently a mixed concept (`factType: "work_unit"` + `referencedProjectWorkUnitId`) instead of an explicit fact kind.
- Artifact runtime contracts still point at snapshot ids while the desired model is one current artifact instance per slot with mutable tracked files.

## Locked decisions
1. Canonical top-level discriminator is always `kind`.
2. Only `plain_fact` has nested `type`.
3. `plain_fact.type` is one of `string | number | boolean | json`.
4. JSON subfield typing/cardinality lives only inside `validationJson`.
5. Canonical fact kinds are:
   - `plain_fact`
   - `work_unit_reference_fact`
   - `bound_fact`
   - `workflow_ref_fact`
   - `artifact_slot_reference_fact`
   - `work_unit_draft_spec_fact`
6. Allowed kinds by layer are:
   - Project facts: `plain_fact`
   - Work-unit facts: `plain_fact`, `work_unit_reference_fact`
   - Workflow-context facts: all six canonical kinds above
7. `bound_fact` runtime envelope is always `{ instanceId, value }`.
8. `artifact_slot_reference_fact` replaces `artifact_snapshot_fact` everywhere canonical.
9. Runtime artifact storage becomes one current artifact instance per `(projectWorkUnitId, slotDefinitionId)` with mutable tracked files.
10. UUID row `id` remains the canonical mutation target; any human/agent-facing stable ids are secondary fields.
11. Project/work-unit facts keep their current logical-delete lineage model in this refactor unless a change is strictly required to support the canonical schema layer.
12. Workflow steps still mutate only workflow-context facts directly.

## Canonical schema targets

### Shared base
```ts
type FactBase = {
  id?: string
  key: string
  label?: string
  descriptionJson?: unknown
  guidance?: unknown
  cardinality: "one" | "many"
}
```

### Fact definitions
```ts
type PlainFactDefinition = FactBase & {
  kind: "plain_fact"
  type: "string" | "number" | "boolean" | "json"
  defaultValue?: unknown
  validationJson?: unknown
}

type WorkUnitReferenceFactDefinition = FactBase & {
  kind: "work_unit_reference_fact"
  linkTypeDefinitionId?: string
  targetWorkUnitDefinitionId?: string
}

type BoundFactDefinition = FactBase & {
  kind: "bound_fact"
  sourceFactDefinitionId: string
  targetLocator:
    | { scope: "project" }
    | { scope: "work_unit"; workUnitDefinitionId: string }
}

type WorkflowRefFactDefinition = FactBase & {
  kind: "workflow_ref_fact"
  allowedWorkflowDefinitionIds: string[]
}

type ArtifactSlotReferenceFactDefinition = FactBase & {
  kind: "artifact_slot_reference_fact"
  slotDefinitionId: string
}

type WorkUnitDraftSpecFactDefinition = FactBase & {
  kind: "work_unit_draft_spec_fact"
  workUnitDefinitionId: string
  selectedWorkUnitFactDefinitionIds: string[]
  selectedArtifactSlotDefinitionIds: string[]
}
```

### Runtime values
```ts
type PlainFactRuntimeValue = string | number | boolean | null | JsonValue

type WorkUnitReferenceFactRuntimeValue = {
  projectWorkUnitId: string
}

type BoundFactRuntimeValue = {
  instanceId: string
  value: unknown
}

type WorkflowRefFactRuntimeValue = {
  workflowDefinitionId: string
}

type ArtifactSlotReferenceFactRuntimeValue = {
  slotDefinitionId: string
  artifactInstanceId: string
  files: Array<{
    filePath: string
    gitCommitHash: string | null
    gitCommitTitle: string | null
  }>
}

type WorkUnitDraftSpecFactRuntimeValue = {
  workUnitDefinitionId: string
  factValues: Array<{
    workUnitFactDefinitionId: string
    value: unknown
  }>
  artifactValues: Array<{
    slotDefinitionId: string
    artifactInstanceId: string
    files: Array<{
      filePath: string
      gitCommitHash: string | null
      gitCommitTitle: string | null
    }>
  }>
}
```

## Package-by-package implementation checklist

### Wave 1 — Contracts lock (`packages/contracts`)
- [ ] Rename all canonical fact kinds in methodology/runtime contracts:
  - `plain_value_fact` → `plain_fact`
  - `artifact_snapshot_fact` → `artifact_slot_reference_fact`
  - add `work_unit_reference_fact`
- [ ] Replace top-level `factType` / `valueType` drift with:
  - `kind` always
  - `type` only on `plain_fact`
- [ ] Update workflow-context fact unions in:
  - `packages/contracts/src/methodology/fact.ts`
  - `packages/contracts/src/methodology/workflow.ts`
- [ ] Update runtime fact value contracts in:
  - `packages/contracts/src/runtime/facts.ts`
  - `packages/contracts/src/runtime/work-units.ts`
  - `packages/contracts/src/runtime/executions.ts`
  - `packages/contracts/src/runtime/artifacts.ts`
- [ ] Replace artifact runtime contract from snapshot pointer shape to artifact-instance shape.
- [ ] Replace work-unit runtime/detail contracts so `work_unit` is no longer treated as a plain primitive type.
- [ ] Update condition/invoke/agent-step/runtime contracts that hardcode old kind names.
- [ ] Add/refresh tests proving the canonical names and allowed layer subsets.

#### Wave 1 QA
- Tool: Bash
- Steps:
  - `bunx vitest run packages/contracts/src/tests/fact-unification-runtime-contracts.test.ts --reporter=verbose`
  - `bunx vitest run packages/contracts/src/tests/l3-slice-1-contracts.test.ts --reporter=verbose`
  - `bunx vitest run packages/contracts/src/tests/l3-plan-a-action-branch-contracts.test.ts --reporter=verbose`
  - `bunx vitest run packages/contracts/src/tests/mcp-progressive-disclosure-contract.test.ts --reporter=verbose`
- Expected:
  - Canonical kinds are only the new names.
  - `plain_fact` alone carries `type`.
  - No active runtime contract still exposes `projectArtifactSnapshotId` as canonical artifact identity.

### Wave 2 — DB schema + migrations (`packages/db/src/schema`, migrations, repository tests)
- [ ] Design-time schema refactor:
  - normalize methodology/project fact definitions to canonical `kind`
  - introduce `type` only for plain facts
  - convert work-unit fact definitions from `factType: "work_unit"` to `kind: "work_unit_reference_fact"`
  - rename workflow-context `fact_kind` rows to new canonical names
- [ ] Add/replace workflow-context subtype tables as needed for the new canonical kinds.
- [ ] Eliminate `artifactSlotKey` persistence at canonical boundaries; use `slotDefinitionId` only.
- [ ] Runtime artifact schema refactor:
  - replace snapshot-lineage tables with single-instance-per-slot tables
  - introduce `project_artifact_instances`
  - introduce `project_artifact_instance_files`
  - remove `supersededByProjectArtifactSnapshotId` from active model
- [ ] Update invoke/runtime tables that currently point to `artifactSnapshotId` so they point to artifact instance ids or current slot state as required.
- [ ] Write data migration/backfill scripts for:
  - old fact kinds → new fact kinds
  - old flat factType/valueType columns → canonical kind/type shape
  - runtime artifact snapshot heads → current artifact instances + tracked files
  - any persisted `projectArtifactSnapshotId` runtime values
- [ ] Update schema/repository tests to verify backfill and new invariants.

#### Wave 2 QA
- Tool: Bash
- Steps:
  - `bunx vitest run packages/db/src/tests/schema/runtime-fact-unification-schema.test.ts --reporter=verbose`
  - `bunx vitest run packages/db/src/tests/schema/methodology-schema.test.ts --reporter=verbose`
  - `bunx vitest run packages/db/src/tests/repository/runtime-fact-crud-repositories.test.ts --reporter=verbose`
  - `bunx vitest run packages/db/src/tests/repository/methodology-repository.integration.test.ts --reporter=verbose`
  - `bunx vitest run packages/db/src/tests/repository/runtime-artifacts-repository.test.ts --reporter=verbose`
- Expected:
  - Schema tests pass for canonical kind/type layout.
  - Repository tests pass against migrated schema.
  - The extended methodology/artifact repository suites prove old artifact snapshot heads become current artifact instances and old fact rows are readable canonically.

### Wave 3 — DB runtime repositories (`packages/db/src/runtime-repositories`, `packages/db/src/methodology-repository.ts`)
- [ ] Update methodology repository reads/writes to canonical fact kinds and `slotDefinitionId` semantics only.
- [ ] Remove old external-binding/artifact-key semantic leakage from workflow-context persistence.
- [ ] Replace artifact repository snapshot/head/lineage logic with:
  - get-or-create artifact instance by `(projectWorkUnitId, slotDefinitionId)`
  - upsert/remove tracked files
  - git freshness checks against tracked files
- [ ] Update work-unit fact repository so work-unit references are represented canonically and no longer treated as a generic primitive `factType`.
- [ ] Keep project/work-unit logical delete behavior intact unless a repository contract must expand for canonical schemas.
- [ ] Update repository tests accordingly.

#### Wave 3 QA
- Tool: Bash
- Steps:
  - `bunx vitest run packages/db/src/tests/repository/runtime-fact-crud-repositories.test.ts --reporter=verbose`
  - `bunx vitest run packages/db/src/tests/repository/runtime-artifacts-repository.test.ts --reporter=verbose`
  - `bunx vitest run packages/db/src/tests/repository/methodology-repository.integration.test.ts --reporter=verbose`
  - `bunx vitest run packages/db/src/tests/repository/workflow-context-fact-list.integration.test.ts --reporter=verbose`
- Expected:
  - Repositories no longer depend on snapshot-lineage as primary artifact truth.
  - Work-unit references behave as `work_unit_reference_fact` semantics.
  - Methodology persistence round-trips canonical kinds only.

### Wave 4 — Methodology engine authoring/validation (`packages/methodology-engine`)
- [ ] Replace old fact-kind and `factType` hardcoding in:
  - action step definition services
  - branch step definition services
  - invoke step definition services
  - methodology version validation/publish logic
- [ ] Add support for:
  - `plain_fact`
  - `work_unit_reference_fact`
  - `artifact_slot_reference_fact`
- [ ] Ensure design-time validators understand `type` only for `plain_fact`.
- [ ] Ensure authoring flows do not generate stale old kind names or artifact snapshot semantics.
- [ ] Update tests/fixtures that still expect old canonical names.

#### Wave 4 QA
- Tool: Bash
- Steps:
  - `bun --filter @chiron/methodology-engine test`
  - rerun targeted suites covering action/branch/invoke definition services and version validation if broad package time is too high
- Expected:
  - Authoring validators reject old kind names on canonical paths.
  - No design-time publish/version flow emits legacy names or old artifact snapshot semantics.

### Wave 5 — Workflow engine runtime services (`packages/workflow-engine`)
- [ ] Update `RuntimeManualFactCrudService` to decode/apply the new canonical kinds.
- [ ] Replace all remaining old names in runtime readers/writers.
- [ ] Refine `bound_fact` semantics to the currently agreed contract.
- [ ] Introduce/normalize runtime handling for `work_unit_reference_fact` in workflow context.
- [ ] Replace artifact snapshot runtime services with artifact-instance/tracked-files services.
- [ ] Update action propagation, invoke start/completion, agent-step context writes, prefill, and detail services to use the new artifact + fact models together in one pass.
- [ ] Remove old snapshot-first assumptions from read models.
- [ ] Update all runtime tests around facts/artifacts/invoke/action/branch flows.

#### Wave 5 QA
- Tool: Bash
- Steps:
  - `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-manual-fact-crud-service.test.ts --reporter=verbose`
  - `bunx vitest run packages/workflow-engine/src/tests/runtime/bound-fact-compatibility.test.ts --reporter=verbose`
  - `bunx vitest run packages/workflow-engine/src/tests/runtime/artifact-snapshot-fact-semantics.test.ts --reporter=verbose`
  - `bunx vitest run packages/workflow-engine/src/tests/runtime/invoke-draft-spec-template-state.test.ts --reporter=verbose`
  - `bunx vitest run packages/workflow-engine/src/tests/runtime/action-step-runtime-services.test.ts --reporter=verbose`
  - `bunx vitest run packages/workflow-engine/src/tests/runtime/branch-runtime-services.test.ts --reporter=verbose`
  - `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-invoke-workunit-start.test.ts --reporter=verbose`
  - `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-invoke-completion.test.ts --reporter=verbose`
- Expected:
  - Runtime services only emit/read canonical kinds.
  - Bound facts, work-unit references, and artifact slot references follow the new runtime payloads.
  - Artifact runtime uses current artifact instances with tracked files, not snapshot lineage, as primary behavior.

### Wave 6 — API routers (`packages/api`)
- [ ] Update methodology routers to canonical fact kind names and shapes.
- [ ] Update runtime fact/artifact CRUD endpoints to decode only canonical schemas.
- [ ] Ensure API contracts expose artifact instance ids, not snapshot ids.
- [ ] Ensure work-unit references are surfaced canonically rather than through old `factType: "work_unit"` semantics.
- [ ] Update router tests and fixtures.

#### Wave 6 QA
- Tool: Bash
- Steps:
  - `bunx vitest run packages/api/src/tests/routers/runtime-fact-crud-logical-delete.test.ts --reporter=verbose`
  - `bunx vitest run packages/api/src/tests/routers/runtime-workflow-context-fact-crud.test.ts --reporter=verbose`
  - rerun targeted methodology/action-branch router suites that currently lock kind names and invoke shapes
- Expected:
  - Router boundaries decode canonical schemas only.
  - Artifact-related router responses expose artifact instance ids/current files rather than snapshot ids.
  - Work-unit references are surfaced canonically across router payloads.

### Wave 7 — Web/UI surfaces (`apps/web`)
- [ ] Update methodology authoring UI to canonical kind names and field layouts.
- [ ] Update runtime fact dialogs/detail pages for new canonical kinds and type placement.
- [ ] Replace snapshot-specific artifact UI with current artifact-instance/tracked-files UI.
- [ ] Update work-unit fact detail pages to use `work_unit_reference_fact` terminology and semantics.
- [ ] Update workflow execution detail/context sections for renamed kinds and new artifact values.
- [ ] Update all tests and mocks that still use old names, labels, or snapshot ids.

#### Wave 7 QA
- Tool: Bash / Vitest
- Steps:
  - `bunx vitest run apps/web/src/tests/runtime/runtime-fact-dialogs.test.tsx --reporter=verbose`
  - `bunx vitest run apps/web/src/tests/runtime/workflow-context-fact-crud-section.test.tsx --reporter=verbose`
  - rerun affected workflow-editor/runtime detail suites that currently assert old kind names or artifact snapshot labels
  - `bun --filter web test`
- Expected:
  - UI uses canonical fact-kind names and fields.
  - Artifact surfaces no longer present snapshot-lineage as primary model.
  - Work-unit references show the new terminology/behavior consistently.

### Wave 8 — Cleanup + compatibility removal
- [ ] Remove decode-only aliases once all readers/writers/tests are green.
- [ ] Remove deprecated snapshot-lineage primary code paths.
- [ ] Remove stale docs and plan references to the old artifact snapshot model.

#### Wave 8 QA
- Tool: Bash / Grep
- Steps:
  - `rg -n "plain_value_fact|artifact_snapshot_fact|factType: \"work_unit\"|valueType: \"work_unit\"|projectArtifactSnapshotId|supersededByProjectArtifactSnapshotId|artifactSlotKey" packages apps docs`
  - run `bun run check-types`
  - run `bun run test`
  - run `bun run build`
- Expected:
  - No canonical code paths still depend on old names or snapshot-first runtime semantics.
  - Workspace is green.

## Must-have migration rules
1. Do not half-migrate contracts without updating runtime writers/readers in the same branch.
2. Do not leave both `factType` and `kind` canonical at the same time.
3. Do not keep snapshot ids as the active artifact runtime identity after the cutover.
4. Do not preserve `artifactSlotKey` at canonical persistence boundaries.
5. Keep compatibility dual-read only where strictly needed during the migration window; canonical writes only.

## Biggest integration risks
- Methodology-engine still hardcodes old kinds and old flat fact typing.
- Artifact runtime change has the widest blast radius because contracts, repos, services, invoke state, and UI all currently assume snapshot lineage.
- Work-unit references currently leak through several runtime/detail/dependency views and must be converted carefully.
- Tests and seed fixtures still carry old names in many places.

## Recommended execution order
1. Contracts lock
2. DB schema + migrations
3. DB repositories
4. Methodology-engine
5. Workflow-engine
6. API
7. Web
8. Cleanup

## Acceptance criteria
- [ ] No canonical surfaces still use `plain_value_fact` or `artifact_snapshot_fact`.
- [ ] No canonical surfaces still use top-level `factType` / `valueType` drift.
- [ ] Runtime artifact contracts no longer use `projectArtifactSnapshotId` as active identity.
- [ ] Work-unit references flow through `work_unit_reference_fact` semantics across design-time and runtime.
- [ ] `bun run check-types`
- [ ] `bun run test`
- [ ] `bun run build`
