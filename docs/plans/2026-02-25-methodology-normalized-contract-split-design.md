# Methodology Normalized Contract Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make normalized tables the sole source of truth for methodology authoring data and replace monolithic `definitionJson` authority with explicit DTO/domain/projection contracts.

**Architecture:** Introduce contract-layer split (`dto`, `domain`, `projection`) and route all write/read service logic through repository methods backed by normalized tables. Keep optional experimentation JSON as non-authoritative overlay only. Remove JSON-driven authoritative writes and lifecycle merge logic.

**Tech Stack:** TypeScript, Effect, Drizzle ORM (SQLite), Hono/tRPC router layer, Bun test/check.

---

### Task 1: Introduce split contracts and deprecate monolithic authority

**Files:**
- Create: `packages/contracts/src/methodology/dto.ts`
- Create: `packages/contracts/src/methodology/domain.ts`
- Create: `packages/contracts/src/methodology/projection.ts`
- Modify: `packages/contracts/src/methodology/index.ts`
- Modify: `packages/contracts/src/methodology/version.ts`
- Test: `packages/contracts/src/methodology/version.test.ts`

**Step 1: Write the failing test**

```ts
it("rejects canonical workflow/binding payload fields in legacy definitionJson schema", () => {
  // Expect decode failure when workflow/binding canonical fields are sent to legacy aggregate
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/contracts/src/methodology/version.test.ts`
Expected: FAIL due to missing split contract behavior.

**Step 3: Write minimal implementation**

```ts
// dto.ts
export const UpdateDraftLifecycleDto = Schema.Struct({ ... });
export const UpdateDraftWorkflowDto = Schema.Struct({ ... });

// domain.ts
export interface WorkflowGraphEntity { ... }

// projection.ts
export const VersionWorkspaceSnapshot = Schema.Struct({ ... });
```

**Step 4: Run test to verify it passes**

Run: `bun test packages/contracts/src/methodology/version.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/dto.ts packages/contracts/src/methodology/domain.ts packages/contracts/src/methodology/projection.ts packages/contracts/src/methodology/index.ts packages/contracts/src/methodology/version.ts packages/contracts/src/methodology/version.test.ts
git commit -m "refactor(contracts): split methodology dto domain projection contracts"
```

### Task 2: Make repository writes normalized-first and remove JSON authority

**Files:**
- Modify: `packages/db/src/methodology-repository.ts`
- Modify: `packages/db/src/lifecycle-repository.ts`
- Modify: `packages/db/src/schema/methodology.ts`
- Test: `packages/db/src/methodology-repository.test.ts` (create if missing)
- Test: `packages/db/src/lifecycle-repository.test.ts` (create if missing)

**Step 1: Write the failing test**

```ts
it("persists lifecycle/workflow/binding changes without mutating authoritative fields in definitionJson", async () => {
  // create draft, update lifecycle, update workflows
  // assert normalized rows are canonical and JSON mirror/overlay is non-authoritative
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/db/src/methodology-repository.test.ts packages/db/src/lifecycle-repository.test.ts`
Expected: FAIL because current code still uses definitionJson merge/rehydration behavior.

**Step 3: Write minimal implementation**

```ts
// methodology-repository.ts
// - persist canonical data in normalized tables only
// - keep optional experimental overlay under dedicated key (ex: definitionExtensions)

// lifecycle-repository.ts
// - stop reading transition bindings from definitionJson
// - read/write bindings only through methodology_transition_workflow_bindings
```

**Step 4: Run test to verify it passes**

Run: `bun test packages/db/src/methodology-repository.test.ts packages/db/src/lifecycle-repository.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/db/src/methodology-repository.ts packages/db/src/lifecycle-repository.ts packages/db/src/schema/methodology.ts packages/db/src/methodology-repository.test.ts packages/db/src/lifecycle-repository.test.ts
git commit -m "refactor(db): make normalized methodology tables canonical"
```

### Task 3: Refactor engine services to consume normalized domain repositories

**Files:**
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/methodology-engine/src/lifecycle-service.ts`
- Modify: `packages/methodology-engine/src/repository.ts`
- Modify: `packages/methodology-engine/src/lifecycle-repository.ts`
- Modify: `packages/methodology-engine/src/validation.ts`
- Test: `packages/methodology-engine/src/version-service.test.ts`
- Test: `packages/methodology-engine/src/validation.test.ts`

**Step 1: Write the failing test**

```ts
it("validates and computes changed fields from normalized entities, not definitionJson diffs", () => {
  // assert workflow/binding/guidance event detection reads domain rows
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/methodology-engine/src/version-service.test.ts packages/methodology-engine/src/validation.test.ts`
Expected: FAIL because services currently decode/diff definitionJson.

**Step 3: Write minimal implementation**

```ts
// version-service.ts
// - replace definitionJson decode/diff with repository-backed normalized snapshot diff

// lifecycle-service.ts
// - remove old lifecycle extraction from definitionJson
```

**Step 4: Run test to verify it passes**

Run: `bun test packages/methodology-engine/src/version-service.test.ts packages/methodology-engine/src/validation.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/methodology-engine/src/version-service.ts packages/methodology-engine/src/lifecycle-service.ts packages/methodology-engine/src/repository.ts packages/methodology-engine/src/lifecycle-repository.ts packages/methodology-engine/src/validation.ts packages/methodology-engine/src/version-service.test.ts packages/methodology-engine/src/validation.test.ts
git commit -m "refactor(engine): remove definitionJson authority from methodology services"
```

### Task 4: Version and split API contracts (Option B)

**Files:**
- Modify: `packages/api/src/routers/methodology.ts`
- Modify: `packages/api/src/routers/methodology.test.ts`
- Modify: `apps/server/src/*` (only if routing/registration changes are needed)

**Step 1: Write the failing test**

```ts
it("v2 endpoints accept split DTOs and return normalized projections", async () => {
  // assert response shape no longer treats definitionJson as authoritative aggregate
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/api/src/routers/methodology.test.ts`
Expected: FAIL until v2 contract endpoints are implemented.

**Step 3: Write minimal implementation**

```ts
// methodology.ts
// - add v2 procedures (or v2 router namespace)
// - adopt dto/projection contracts
// - keep old route disabled or hard-deprecated in this branch (no backcompat requirement)
```

**Step 4: Run test to verify it passes**

Run: `bun test packages/api/src/routers/methodology.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/api/src/routers/methodology.ts packages/api/src/routers/methodology.test.ts apps/server/src
git commit -m "feat(api): introduce methodology v2 split contract endpoints"
```

### Task 5: Add migration safeguards, verification, and artifact updates

**Files:**
- Modify: `_bmad-output/implementation-artifacts/1-3-define-workflows-under-work-unit-scope-and-bind-executable-subset-to-transitions.md`
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml` (only if status transitions)
- Create: `packages/db/src/migrations/*` (if schema migration needed for extension/overlay field)

**Step 1: Write the failing test**

```ts
it("prevents divergence between normalized canonical rows and optional overlay fields", async () => {
  // parity assertion for read projection compiler/reconciler
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/db/src/**/*.test.ts packages/methodology-engine/src/**/*.test.ts`
Expected: FAIL until parity/reconciler safeguards are in place.

**Step 3: Write minimal implementation**

```ts
// add parity/reconciler checks and deterministic error diagnostics
// update story artifact to reflect canonical-source decision and new API contract strategy
```

**Step 4: Run test to verify it passes**

Run:
- `bun check`
- `bun test`

Expected: PASS for checks and full test suite.

**Step 5: Commit**

```bash
git add _bmad-output/implementation-artifacts/1-3-define-workflows-under-work-unit-scope-and-bind-executable-subset-to-transitions.md _bmad-output/implementation-artifacts/sprint-status.yaml packages/db/src/migrations packages/db/src packages/methodology-engine/src packages/api/src
git commit -m "chore(methodology): finalize normalized-source migration and verification"
```
