# Final Projection Removal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fully remove projection-related code and language from `packages/methodology-engine`, and remove projection terminology from `docs/` and `_bmad-output/`, while preserving working design-time and published-contract behavior.

**Architecture:** Replace projection-centric reads with explicit authoring/published query contracts. Keep command-side services resource-scoped (workflow/fact/lifecycle/artifact-slot CRUD) and keep query-side payload shaping in boundary services and API handlers. Move all remaining projection bootstrap behavior to `getAuthoringSnapshot` / query-specific methods and delete projection ports/types/usages.

**Tech Stack:** TypeScript, Effect (`Context.Tag`, `Layer`), Hono/oRPC router, Vitest, Bun, ripgrep/AST-grep.

---

## Current Usage Inventory (must be eliminated)

### Code: `packages/methodology-engine/src`

1. `src/version-service.ts`
   - `version.workspace.get` interface + implementation and `VersionWorkspaceSnapshot` import.
   - `updateDraftWorkflows` remains as compatibility mutation.
2. `src/services/methodology-version-service.ts`
   - Re-exports `version.workspace.get` and `updateDraftWorkflows` from core service.
3. `src/services/published-methodology-service.ts`
   - Exposes `version.workspace.get` and projection type.
4. `src/ports/workspace-snapshot-port.ts`
   - Projection port/type surface.
5. `src/index.ts`
   - Exports `WorkspaceSnapshotPort`.
6. Tests:
   - `src/tests/versioning/version-service.test.ts` (`describe("version.workspace.get")` and call-sites)
   - `src/tests/l2-l3/work-unit-l2-services.test.ts` imports `VersionWorkspaceSnapshot` for fixtures.

### Docs references (projection / version.workspace.get / updateDraftWorkflows)

- `docs/` currently has many references in plans and architecture markdown.
- `_bmad-output/` currently has references in implementation/planning artifacts.

The implementation must leave **zero projection-related references** in:
- `packages/methodology-engine/**`
- `docs/**`
- `_bmad-output/**`

---

## Replacement Rules (per-instance policy)

1. `version.workspace.get(versionId)` → replace with one of:
   - `getAuthoringSnapshot(versionId)` for design-time authoring reads.
   - New explicit query method for published/runtime contract reads (if needed).
2. `VersionWorkspaceSnapshot` type usage in methodology-engine → replace with:
   - `AuthoringSnapshot` for authoring flows/tests.
   - Minimal local typed query DTOs for published contracts.
3. `WorkspaceSnapshotPort` port → delete entirely; do not replace with another “projection”-named port.
4. Any docs wording using “authoring snapshot/projection model” → replace with:
   - “authoring snapshot” for design-time read model.
   - “published contract query” for published read use-cases.

---

## Task 1: Add RED verification tests for zero projection surface

**Files:**
- Modify: `packages/methodology-engine/src/tests/versioning/version-service.test.ts`
- Modify: `packages/methodology-engine/src/tests/l1/methodology-version-service.test.ts`
- Modify: `packages/methodology-engine/src/tests/l1/l1-route-boundary.characterization.test.ts`
- Add: `packages/methodology-engine/src/tests/l1/projection-surface-removal.test.ts`

**Step 1: Write failing tests asserting removed API surface**

Add tests that fail against current state, e.g.:
- service no longer has `version.workspace.get`.
- service no longer has `updateDraftWorkflows`.
- no exported `WorkspaceSnapshotPort` from engine public index.

**Step 2: Run test to verify RED**

Run: `bun run --cwd packages/methodology-engine vitest run src/tests/l1/projection-surface-removal.test.ts`

Expected: FAIL (old projection/updateDraftWorkflows surface still present).

**Step 3: Commit (RED checkpoint)**

```bash
git add packages/methodology-engine/src/tests/l1/projection-surface-removal.test.ts packages/methodology-engine/src/tests/l1/methodology-version-service.test.ts packages/methodology-engine/src/tests/l1/l1-route-boundary.characterization.test.ts
git commit -m "test: add red checks for projection surface removal"
```

---

## Task 2: Remove projection API from core version service

**Files:**
- Modify: `packages/methodology-engine/src/version-service.ts`

**Step 1: Remove projection contracts and implementation**

- Remove `VersionWorkspaceSnapshot` import.
- Remove `version.workspace.get` method from `MethodologyVersionService` interface.
- Remove `version.workspace.get` implementation block.
- Remove `version.workspace.get` from `MethodologyVersionService.of(...)`.

**Step 2: Remove `updateDraftWorkflows` from public core surface (if still present)**

- Remove interface method + export wiring from `MethodologyVersionService`.
- Keep only explicit CRUD methods for authoring mutations.

**Step 3: Run focused tests**

Run: `bun run --cwd packages/methodology-engine vitest run src/tests/versioning/version-service.test.ts`

Expected: failing tests point only to old projection assertions; no unrelated regressions.

**Step 4: Commit**

```bash
git add packages/methodology-engine/src/version-service.ts
git commit -m "refactor: remove projection and batch workflow APIs from core version service"
```

---

## Task 3: Replace downstream service usage with explicit query methods

**Files:**
- Modify: `packages/methodology-engine/src/services/methodology-version-service.ts`
- Modify: `packages/methodology-engine/src/services/published-methodology-service.ts`

**Step 1: Methodology boundary service cleanup**

- Remove `version.workspace.get` and `updateDraftWorkflows` from boundary interface + `of(...)` wiring.
- Keep/expand `getAuthoringSnapshot` as the only design-time read model surface.
- If published read behavior needs a query, add explicit non-projection naming (e.g., `getPublishedContractByVersionAndWorkUnitType` already exists).

**Step 2: Published service cleanup**

- Remove `version.workspace.get` from `PublishedMethodologyService` contract and implementation.
- Keep only published query methods required by runtime/pinning flows.

**Step 3: Run focused tests**

Run: `bun run --cwd packages/methodology-engine vitest run src/tests/l1/methodology-version-service.test.ts src/tests/l1/l1-route-boundary.characterization.test.ts`

Expected: PASS after updating expectations to removed methods.

**Step 4: Commit**

```bash
git add packages/methodology-engine/src/services/methodology-version-service.ts packages/methodology-engine/src/services/published-methodology-service.ts packages/methodology-engine/src/tests/l1/methodology-version-service.test.ts packages/methodology-engine/src/tests/l1/l1-route-boundary.characterization.test.ts
git commit -m "refactor: remove projection/batch compatibility from boundary and published services"
```

---

## Task 4: Delete projection port and exports

**Files:**
- Delete: `packages/methodology-engine/src/ports/workspace-snapshot-port.ts`
- Modify: `packages/methodology-engine/src/index.ts`

**Step 1: Remove port file and public export**

- Delete `workspace-snapshot-port.ts`.
- Remove `WorkspaceSnapshotPort` export from `src/index.ts`.

**Step 2: Verify no imports remain**

Run: `grep -R "WorkspaceSnapshotPort\|workspace-snapshot-port" packages/methodology-engine/src`

Expected: no matches.

**Step 3: Commit**

```bash
git add packages/methodology-engine/src/index.ts packages/methodology-engine/src/ports/workspace-snapshot-port.ts
git commit -m "refactor: delete projection repository port and public export"
```

---

## Task 5: Rewrite tests to authoring snapshot terminology and fixtures

**Files:**
- Modify: `packages/methodology-engine/src/tests/versioning/version-service.test.ts`
- Modify: `packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts`

**Step 1: Replace projection-focused assertions**

- Remove `describe("version.workspace.get")` suite.
- Replace with tests validating explicit query methods (`getAuthoringSnapshot` and published contract query methods).

**Step 2: Replace type imports in L2 tests**

- Replace `VersionWorkspaceSnapshot` fixture dependency with local `AuthoringSnapshot`-shape fixture.

**Step 3: Run tests**

Run: `bun run --cwd packages/methodology-engine vitest run src/tests/versioning/version-service.test.ts src/tests/l2-l3/work-unit-l2-services.test.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add packages/methodology-engine/src/tests/versioning/version-service.test.ts packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts
git commit -m "test: replace projection-oriented tests with authoring snapshot coverage"
```

---

## Task 6: API compatibility update (workspace bootstrap without projection API)

**Files:**
- Modify: `packages/api/src/routers/methodology.ts`
- Modify: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Replace workspace bootstrap internals**

- Keep route shape `version.workspace.get` if UI compatibility requires it.
- Internally, replace boundary call from removed projection method to explicit query method (`getAuthoringSnapshot` + any required metadata composition).

**Step 2: Add RED/then GREEN tests for route behavior**

- Ensure returned shape remains compatible for clients.
- Ensure no call path requires removed projection APIs.

**Step 3: Run tests**

Run: `bun run --cwd packages/api vitest run src/tests/routers/methodology.test.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "refactor: serve workspace bootstrap from explicit authoring query methods"
```

---

## Task 7: WorkflowService L3 preparation checkpoint (story 3-3 alignment)

**Files:**
- Modify: `packages/methodology-engine/src/services/workflow-service.ts`
- Modify: `packages/methodology-engine/src/services/methodology-version-service.ts`
- Modify: `packages/methodology-engine/src/index.ts`
- Add/Modify tests under: `packages/methodology-engine/src/tests/l2-l3/`

**Step 1: Define migration seam (no feature expansion yet)**

- Add explicit TODO-free, typed interface methods in `WorkflowService` for step/edge/workflow CRUD expected in Story 3-3.
- Wire only pass-through/adapters needed for current callers, without reintroducing projection concepts.

**Step 2: Add characterization tests for seam contract**

- Tests should verify that workflow operations route through `WorkflowService` seam contracts, not projection rebuild logic.

**Step 3: Run tests**

Run: `bun run --cwd packages/methodology-engine vitest run src/tests/l2-l3/scaffold-contracts.test.ts src/tests/l2-l3/work-unit-l2-services.test.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add packages/methodology-engine/src/services/workflow-service.ts packages/methodology-engine/src/services/methodology-version-service.ts packages/methodology-engine/src/index.ts packages/methodology-engine/src/tests/l2-l3/
git commit -m "refactor: establish workflow service seam for story 3-3 without projection coupling"
```

---

## Task 8: Full docs and `_bmad-output` terminology scrub

**Files:**
- Modify all matching markdown under:
  - `docs/**/*.md`
  - `_bmad-output/**/*.md`

**Step 1: Generate exact hit list**

Run:

```bash
rg -n "version.workspace.get|VersionWorkspaceSnapshot|WorkspaceSnapshotPort|authoring snapshot|workspace-snapshot-port" docs _bmad-output
```

Expected: non-empty list (baseline).

**Step 2: Rewrite all hits with replacement vocabulary**

- Replace API names/concepts with `getAuthoringSnapshot`, `authoring snapshot`, or `published contract query` based on context.
- Preserve historical intent but remove projection terminology from text.

**Step 3: Re-run zero-hit check**

Run:

```bash
rg -n "version.workspace.get|VersionWorkspaceSnapshot|WorkspaceSnapshotPort|authoring snapshot|workspace-snapshot-port" docs _bmad-output
```

Expected: no matches.

**Step 4: Commit**

```bash
git add docs _bmad-output
git commit -m "docs: remove projection terminology across docs and bmad artifacts"
```

---

## Final Verification Gates (must all pass)

1. **No projection references in methodology-engine code**

```bash
rg -n "version.workspace.get|VersionWorkspaceSnapshot|WorkspaceSnapshotPort|workspace-snapshot-port" packages/methodology-engine/src
```

Expected: no matches.

2. **No projection references in docs or bmad artifacts**

```bash
rg -n "version.workspace.get|VersionWorkspaceSnapshot|WorkspaceSnapshotPort|authoring snapshot|workspace-snapshot-port" docs _bmad-output
```

Expected: no matches.

3. **Methodology-engine tests**

```bash
bun run --cwd packages/methodology-engine vitest run
```

Expected: pass (or only pre-existing unrelated failures documented before this work).

4. **API router tests**

```bash
bun run --cwd packages/api vitest run src/tests/routers/methodology.test.ts
```

Expected: pass.

5. **Diagnostics on touched files**

- Run `lsp_diagnostics` on all modified files; expected zero diagnostics.

---

## Non-Negotiable Acceptance Criteria

- `packages/methodology-engine/src/**` contains **zero** projection-related symbols/files/usages.
- No `version.workspace.get` method exists in any methodology-engine service interface.
- No `WorkspaceSnapshotPort` port exists.
- `docs/**` and `_bmad-output/**` contain **zero** projection-related terms per verification regex.
- API and methodology-engine tests relevant to authoring/publish flows pass.

---

Plan complete and saved to `docs/plans/2026-03-20-final-projection-removal-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
