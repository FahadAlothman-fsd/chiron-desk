# Work Units L1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the placeholder methodology-version Work Units L1 shell with the approved graph/list overview page using synchronized selection, a persistent right rail, and route-backed local state.

**Architecture:** Keep `/methodologies/$methodologyId/versions/$versionId/work-units` as the L1 owner route and reuse pure graph projection logic from `apps/web/src/features/methodologies/version-graph.ts`, while introducing page-local selectors/components for graph view, list view, and right-rail selection. Do not reuse the full `version-workspace-graph.tsx` component; instead extract only the stable primitives and keep L1 as a browse/select/open surface.

**Tech Stack:** React, TanStack Router, TanStack Query, Vitest, Testing Library, existing methodology projection utilities.

---

### Task 1: Add failing Work Units L1 route coverage

**Files:**
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`
- Create: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`

**Step 1: Write the failing test**

Add route tests that prove L1 now supports:
- only `Graph` and `List` view controls
- URL-backed `view` and `selected` state
- synchronized right rail with search/index/active summary
- active actions `Open details` and `Open Relationship View`
- no transition nodes rendered as first-class L1 graph entities

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: FAIL because the current route still renders the placeholder shell and legacy structure.

**Step 3: Write minimal implementation**

Refactor the route so it validates `view=graph|list` and `selected`, derives selection from the draft projection, and renders the approved L1 shell contract.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx
git commit -m "feat(methodology): add work units l1 route shell"
```

### Task 2: Build reusable L1 page primitives

**Files:**
- Create: `apps/web/src/features/methodologies/work-units-page-selectors.ts`
- Create: `apps/web/src/features/methodologies/work-units-graph-view.tsx`
- Create: `apps/web/src/features/methodologies/work-units-list-view.tsx`
- Create: `apps/web/src/features/methodologies/work-units-right-rail.tsx`
- Modify: `apps/web/src/features/methodologies/version-graph.ts`
- Test: `apps/web/src/tests/features/methodologies/version-graph.test.ts`

**Step 1: Write the failing test**

Add/extend tests for pure selectors that derive:
- work-unit-only graph nodes/edges for L1
- edge derivation from work-unit relationships only
- shared selected-work-unit summary
- deterministic list filtering/search

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/features/methodologies/version-graph.test.ts'`

Expected: FAIL because current L1 projection still includes transition nodes or lacks the new selectors.

**Step 3: Write minimal implementation**

Implement pure selectors/helpers and lightweight page components for graph view, list view, and right rail.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/features/methodologies/version-graph.test.ts'`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/version-graph.ts apps/web/src/features/methodologies/work-units-page-selectors.ts apps/web/src/features/methodologies/work-units-graph-view.tsx apps/web/src/features/methodologies/work-units-list-view.tsx apps/web/src/features/methodologies/work-units-right-rail.tsx apps/web/src/tests/features/methodologies/version-graph.test.ts
git commit -m "feat(methodology): add work units l1 graph primitives"
```

### Task 3: Wire synchronized selection and route-backed view state

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- Modify: `apps/web/src/features/methodologies/work-units-graph-view.tsx`
- Modify: `apps/web/src/features/methodologies/work-units-list-view.tsx`
- Modify: `apps/web/src/features/methodologies/work-units-right-rail.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`

**Step 1: Write the failing test**

Add interaction tests proving:
- selecting from the list updates active summary
- graph selection and list selection stay synchronized
- `view` and `selected` persist through URL search state
- `Open details` navigates to L2 using selected work unit

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: FAIL because selection sync and URL-backed state are not fully wired yet.

**Step 3: Write minimal implementation**

Connect the selectors and page primitives to the route search params and navigation handlers.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx apps/web/src/features/methodologies/work-units-graph-view.tsx apps/web/src/features/methodologies/work-units-list-view.tsx apps/web/src/features/methodologies/work-units-right-rail.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx
git commit -m "feat(methodology): sync work units l1 selection state"
```

### Task 4: Verify and document the Work Units L1 slice

**Files:**
- Modify: `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`

**Step 1: Write the failing test**

No new unit test here. This task is verification + evidence.

**Step 2: Run verification commands**

Run:
- `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' 'src/tests/features/methodologies/version-graph.test.ts'`
- `bun run --cwd apps/web check-types`
- `bun run check-types`
- `bun run check`

Expected: PASS.

**Step 3: Update story evidence**

Append a Story 3.1 addendum documenting:
- Work Units L1 graph/list shell
- one-node-type rule (work units only)
- edge derivation rule
- synchronized selection/right rail
- verification evidence

**Step 4: Run final verification**

Repeat the commands above after the story update.

Expected: PASS.

**Step 5: Commit**

```bash
git add _bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md
git commit -m "docs(story): record work units l1 shell evidence"
```
