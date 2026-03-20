# Story 3.2 Facts Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the Work Unit L2 Facts tab with methodology-facts parity (table-first + dialog-first CRUD) plus Story 3.2 work-unit semantics.

**Architecture:** Reuse existing methodology-facts inventory/editor behavior through an L2 adapter in the work-unit detail route. Keep mutations scoped to `methodology.version.workUnit.fact.*` and verify scoping with integration tests before full UI wiring.

**Tech Stack:** TypeScript, React, TanStack Router, TanStack Query, Bun test, oRPC client.

---

## Task 1: Lock L2 fact API behavior before UI wiring

**Files:**
- Modify: `packages/api/src/tests/routers/methodology.test.ts`
- Modify (if required by failing test): `packages/api/src/routers/methodology.ts`

**Step 1: Write failing test**
- Add/extend a test that proves `methodology.version.workUnit.fact.*` calls are work-unit scoped (not methodology-level fallback semantics).

**Step 2: Run test to verify RED**
- Run: `bun test "src/tests/routers/methodology.test.ts"` (cwd `packages/api`)
- Expected: fail with current aliasing behavior if scoping is incorrect.

**Step 3: Implement minimal API fix**
- Update router wiring only as needed to satisfy scoping expectation.

**Step 4: Run test to verify GREEN**
- Re-run same API test command.

**Step 5: Commit**
- Commit message example: `fix(api): enforce work-unit fact namespace scoping`

---

## Task 2: Add failing route tests for Facts tab surface

**Files:**
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`

**Step 1: Write failing tests**
- Facts tab renders table-first surface and does not use row expansion.
- Facts tab offers `+ Add Fact`, row `Edit`, row `Delete` actions.
- Work-unit fact type path shows dependency-type selector when type is `work unit`.

**Step 2: Run tests to verify RED**
- Run route integration tests in `apps/web` for those files.
- Expected: fail because Facts tab is still placeholder.

**Step 3: Commit test-only RED state (optional checkpoint)**
- Optional if team flow prefers explicit red checkpoints.

---

## Task 3: Implement FactsTab component + route wiring

**Files:**
- Create: `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Reuse: `apps/web/src/features/methodologies/methodology-facts.tsx` (adapter usage; avoid duplication)

**Step 1: Implement minimal table-first FactsTab**
- Render inventory table with methodology-facts visual/interaction parity.
- Keep no row expansion.

**Step 2: Implement dialog-first CRUD controls**
- Add `+ Add Fact` and row actions (`Edit`, `Delete`).
- Keep contract/guidance flow consistent with methodology-facts dialog behavior.

**Step 3: Add work-unit-specific fields**
- Add/select `work unit` fact type handling.
- Show dependency definition selector for `work unit` type and work-unit json value types.

**Step 4: Wire to L2 namespace queries/mutations**
- Use `orpc.methodology.version.workUnit.fact.*` only.
- Invalidate/refetch facts data for active work unit after mutations.

**Step 5: Run RED tests to GREEN**
- Re-run both route integration suites from Task 2.

**Step 6: Commit**
- Commit message example: `feat(web): implement work-unit facts tab authoring surface`

---

## Task 4: Add focused Facts tab behavioral tests

**Files:**
- Create or modify: `apps/web/src/tests/features/methodologies/work-unit-l2-facts.test.tsx` (or closest existing naming convention)

**Step 1: Add tests for locked behaviors**
- No row expansion in facts list.
- Work-unit dependency selector appears only for work-unit type.
- Dialog save/cancel/discard flow mirrors methodology-facts behavior.

**Step 2: Run targeted tests**
- Run feature test file in `apps/web`.

**Step 3: Fix minimal implementation gaps**
- Patch only behavior needed for failing assertions.

**Step 4: Re-run to GREEN**

**Step 5: Commit**
- Commit message example: `test(web): lock work-unit facts tab behavior`

---

## Task 5: Story artifact sync + verification gate

**Files:**
- Modify: `_bmad-output/implementation-artifacts/3-2-complete-work-unit-l2-tabs-overview-workflows-artifact-slots-facts-state-machine.md`

**Step 1: Update story tracking**
- Mark Task 4.1 checklist items completed only when verified.
- Update Dev Agent Record completion notes + file list entries.

**Step 2: Run verification commands**
- `bun run test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'` (cwd `apps/web`)
- `bun run test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'` (cwd `apps/web`)
- `bun run test -- 'src/tests/features/methodologies/*.test.tsx'` (cwd `apps/web`)
- `bun test "src/tests/routers/methodology.test.ts"` (cwd `packages/api`)
- `bun run build` (workspace root)

**Step 3: LSP diagnostics gate**
- Run `lsp_diagnostics` for all modified TS/TSX files, severity `error`.

**Step 4: Final commit for facts slice evidence**
- Commit message example: `docs(story-3.2): record facts tab completion evidence`

---

## Execution handoff

Plan complete and saved to `docs/plans/2026-03-20-story-3-2-facts-tab-implementation-plan.md`. Two execution options:

1. **Subagent-Driven (this session)** - Dispatch fresh subagent per task, review between tasks, fast iteration.
2. **Parallel Session (separate)** - Open new session with `executing-plans`, batch execution with checkpoints.
