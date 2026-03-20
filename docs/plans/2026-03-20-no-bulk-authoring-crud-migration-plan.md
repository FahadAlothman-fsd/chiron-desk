# No-Bulk Authoring CRUD Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce the rule **"no bulk except dedicated reorder endpoints"** by migrating authoring writes from projection/snapshot batch procedures to explicit resource CRUD procedures, starting with workflows, then state-machine bindings, then remaining nested authoring surfaces.

**Architecture:** Keep `version.workspace.get` as a temporary read model only. Move write ownership to explicit domain services and repository operations (resource-scoped mutations), and keep legacy batch endpoints only as deprecated compatibility paths at version root during migration.

**Tech Stack:** TypeScript, Effect, oRPC, Hono, Drizzle/SQLite, Vitest, TanStack Query.

---

## Ground Rules (Locked)

1. **No bulk write endpoints for authoring** except dedicated reorder endpoints.
2. `version.workspace.get` is allowed for read-only projections during transition.
3. `updateDraftWorkflows` / `updateDraftLifecycle` remain only as temporary compatibility entry points, not nested authoring aliases.
4. Every migration slice must include RED→GREEN tests and alias-removal verification.

---

## Current Coupling Inventory (Detected)

### High-risk aliasing in router
- `packages/api/src/routers/methodology.ts`
  - `version.workUnit.workflow.update -> router.updateDraftWorkflows`
- `version.workUnit.stateMachine.transition.binding.update -> router.updateDraftWorkflows`
  - `version.workUnit.stateMachine.{state,transition,conditionSet}.update -> router.updateDraftLifecycle`
  - many nested `.list/.get` aliases still point to `router.version.workspace.get`

### Write paths still batch-coupled
- `packages/methodology-engine/src/version-service.ts`
  - `updateDraftWorkflows` full-snapshot write path
- `packages/methodology-engine/src/services/work-unit-state-machine-service.ts`
  - `replaceBindings` reads projection and writes through `updateDraftWorkflows`
- `packages/api/src/routers/methodology.ts`
  - work-unit workflow explicit handlers currently read projection and write with `updateDraftWorkflows`

### Frontend compatibility dependencies
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
  - root mutation uses `orpc.methodology.updateDraftWorkflows`

---

## Allowed Reorder-Only Endpoint Policy

Allowed bulk-style mutation shape only for ordering operations:
- Endpoint naming: `reorder` (not `update`, not `replace`)
- Input shape: `{ versionId, workUnitTypeKey, orderedKeys[] }` **or** `{ beforeKey/afterKey }`
- Scope: ordering metadata only (no content mutation)
- Must be idempotent-safe and conflict-aware.

All other writes must be explicit CRUD:
- `create`, `get`, `list`, `updateMeta` (or `update` if full entity), `delete`.

---

## Phased Migration Plan

### Phase 0: Safety Rails and Characterization (no behavior change)

**Files:**
- Modify: `packages/api/src/tests/routers/methodology.test.ts`
- Modify: `packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId*.test.tsx`

**Step 1: Add failing characterization tests for forbidden aliasing**
- Assert nested authoring routes do not call batch root handlers (`updateDraftWorkflows`, `updateDraftLifecycle`).

**Step 2: Add regression tests for binding preservation**
- Single workflow mutation must not drop unrelated `transitionWorkflowBindings`.

**Step 3: Add regression tests for single-resource delete isolation**
- Deleting one workflow removes only that workflow and its binding references.

**Step 4: Run tests (expect RED initially)**
Run:
`bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

---

### Phase 1: Workflow Explicit CRUD (first migration slice)

**Files:**
- Create: `packages/contracts/src/methodology/workflow.ts`
- Modify: `packages/contracts/src/methodology/index.ts`
- Modify: `packages/methodology-engine/src/ports/workflow-repository.ts`
- Modify: `packages/db/src/methodology-repository.ts`
- Modify: `packages/methodology-engine/src/services/workflow-service.ts`
- Modify: `packages/methodology-engine/src/services/methodology-version-service.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Modify: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Define workflow CRUD contracts (resource-scoped)**
- Add: `GetWorkUnitWorkflowInput`, `ListWorkUnitWorkflowsInput`, `CreateWorkUnitWorkflowInput`, `UpdateWorkUnitWorkflowMetaInput`, `DeleteWorkUnitWorkflowInput`, optional `ReorderWorkUnitWorkflowsInput`.

**Step 2: Extend workflow repository port to direct CRUD methods**
- Add methods for list/get/create/updateMeta/delete (+ optional reorder).

**Step 3: Implement DB repository methods without full snapshot replacement**
- Direct row-level operations for workflows and binding cleanup on delete.

**Step 4: Implement `WorkflowService` explicit methods**
- Move write behavior to explicit service methods; keep strict validation and domain errors.

**Step 5: Rewire API router nested workflow paths to explicit service methods**
- `version.workUnit.workflow.{list,get,create,updateMeta,delete}` must not call `updateDraftWorkflows`.
- Keep `version.workUnit.workflow.update` only if required as deprecated compatibility alias (temporary), otherwise remove.

**Step 6: Add/adjust API tests for explicit CRUD and deprecation behavior**

**Step 7: Run tests (GREEN)**
Run:
`bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

---

### Phase 2: State-Machine Binding Writes off Batch Workflow Path

**Files:**
- Modify: `packages/contracts/src/methodology/lifecycle.ts`
- Modify: `packages/methodology-engine/src/services/work-unit-state-machine-service.ts`
- Modify: `packages/methodology-engine/src/ports/workflow-repository.ts`
- Modify: `packages/db/src/methodology-repository.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Modify: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Introduce explicit binding CRUD contract(s)**
- Replace batch binding update semantics with transition-scoped binding methods.

**Step 2: Replace `replaceBindings -> updateDraftWorkflows` path**
- Direct binding persistence via repository/service.

**Step 3: Rewire router alias**
- `version.workUnit.stateMachine.transition.binding.update` must not point to `router.updateDraftWorkflows`.

**Step 4: Add binding isolation and transition-coupling tests**

**Step 5: Run tests**
Run:
`bun run --cwd packages/methodology-engine test -- src/tests/l2-l3/work-unit-l2-services.test.ts`

---

### Phase 3: Remove Remaining Nested Write Aliases to Batch Handlers

**Files:**
- Modify: `packages/api/src/routers/methodology.ts`
- Modify: `packages/methodology-engine/src/services/methodology-version-service.ts`
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Replace nested authoring `.update` aliases**
- Remove nested mappings to `updateDraftLifecycle`/`updateDraftWorkflows` for authoring domains.

**Step 2: Keep root compatibility procedures only**
- Retain root `updateDraftLifecycle`/`updateDraftWorkflows` temporarily with deprecation markers in comments/tests.

**Step 3: Add test asserting nested namespace purity**
- Nested authoring operations must route to explicit handlers only.

---

### Phase 4: Web Caller Migration off Root Batch Mutations

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId*.test.tsx`

**Step 1: Replace root batch mutation usage with explicit nested CRUD mutations**

**Step 2: Update tests/mocks to explicit endpoint contracts**

**Step 3: Verify no authoring surface depends on root batch procedures**

---

### Phase 5: Compatibility Sunset and Cleanup

**Files:**
- Modify: `packages/api/src/routers/methodology.ts`
- Modify: `packages/contracts/src/methodology/dto.ts`
- Modify: `packages/api/src/tests/routers/methodology.test.ts`
- Modify: `docs/plans/*` and story artifacts referencing transitional batch usage

**Step 1: Remove deprecated compatibility aliases/calls after zero-callers checkpoint**

**Step 2: Remove/limit batch DTO usage to reorder-only endpoints where explicitly allowed**

**Step 3: Final deprecation cleanup tests**

---

## Verification Gates Per Phase

Run per phase:

```bash
bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts
bun run --cwd packages/methodology-engine test -- src/tests/l2-l3/work-unit-l2-services.test.ts
bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId*.test.tsx'
bun run --cwd apps/web build
```

Diagnostics gate:
- `lsp_diagnostics` clean on all modified files before phase completion.

---

## Risk Matrix

1. **Lost update race** during transition read-modify-write shims.
   - Mitigation: migrate write paths first (workflow then bindings), keep shims short-lived.
2. **Binding orphaning** on workflow delete.
   - Mitigation: transition-binding cleanup tests at API + repository layers.
3. **Alias confusion** causing accidental batch path regressions.
   - Mitigation: explicit alias purity tests in router.
4. **Frontend breakage** from contract cutover.
   - Mitigation: phased caller migration with mock updates in the same slice.

---

## Rollback Strategy

- Rollback is per phase and per domain:
  1) revert router mapping changes,
  2) restore previous service wiring,
  3) keep compatibility root procedures unchanged.
- Do not delete compatibility procedures until caller inventory is zero and tests are green.

---

## Definition of Complete for This Migration

- No nested authoring write route points to `updateDraftWorkflows` or `updateDraftLifecycle`.
- Explicit CRUD exists for workflow and state-machine binding authoring paths.
- Batch endpoints exist only for explicitly approved reorder operations (or temporary root compatibility before sunset).
- Web authoring surfaces no longer call root batch mutation APIs.
- All phase verification gates pass.
