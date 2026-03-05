# Story 2.6 Dashboard-First Baseline Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move baseline operator visibility (readiness, diagnostics, evidence, fact provenance) to the project dashboard while keeping pinning focused on pin/repin/lineage.

**Architecture:** Keep `project.getProjectDetails` as the single backend source and redistribute UI responsibilities between routes. Extract baseline UI into shared project feature components to avoid duplication/drift. Preserve Epic 2 read-only constraints and deterministic status semantics.

**Tech Stack:** React 19, TanStack Router/Query, TypeScript, oRPC payloads from API, Vitest + Testing Library, Effect-backed API contract.

---

### Task 1: Extract baseline visibility UI into reusable project components

**Files:**
- Create: `apps/web/src/features/projects/baseline-visibility.tsx`
- Modify: `apps/web/src/features/projects/status-visual.tsx`
- Test: `apps/web/src/routes/-projects.$projectId.integration.test.tsx`

**Step 1: Write the failing test**

Add dashboard assertions in `apps/web/src/routes/-projects.$projectId.integration.test.tsx` for:
- `Baseline visibility`
- `Transition readiness preview (project_setup)`
- reason code text (`reason: ...`)

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test 'src/routes/-projects.$projectId.integration.test.tsx'`
Expected: FAIL because dashboard does not render baseline visibility yet.

**Step 3: Write minimal implementation**

Create `apps/web/src/features/projects/baseline-visibility.tsx` containing:
- `type BaselinePreview` and `type BaselineTransition`
- `BaselineVisibilitySection` component
- `Show future paths` local toggle
- transition row rendering with `TransitionStatusBadge`
- disabled workflow action buttons with `aria-disabled="true"`
- diagnostics/facts/evidence sections

Keep this component purely presentational over a `baselinePreview` prop.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test 'src/routes/-projects.$projectId.integration.test.tsx'`
Expected: PASS for new baseline assertions.

**Step 5: Commit**

```bash
git add apps/web/src/features/projects/baseline-visibility.tsx apps/web/src/features/projects/status-visual.tsx apps/web/src/routes/-projects.$projectId.integration.test.tsx
git commit -m "refactor: extract baseline visibility into shared project component"
```

### Task 2: Move baseline visibility to project dashboard route

**Files:**
- Modify: `apps/web/src/routes/projects.$projectId.index.tsx`
- Test: `apps/web/src/routes/-projects.$projectId.integration.test.tsx`

**Step 1: Write the failing test**

In dashboard integration test file, assert:
- summary cards appear (`Methodology`, `Pinned version`, `Publish state`, `Validation`)
- transition preview rows render with status glyph/label
- disabled runtime rationale appears in transition workflow rows

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test 'src/routes/-projects.$projectId.integration.test.tsx'`
Expected: FAIL due missing dashboard baseline block.

**Step 3: Write minimal implementation**

In `projects.$projectId.index.tsx`:
- import and render `BaselineVisibilitySection`
- pass `projectQuery.data?.baselinePreview`
- keep existing project overview + pin summary + runtime section unchanged

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test 'src/routes/-projects.$projectId.integration.test.tsx'`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/routes/projects.$projectId.index.tsx apps/web/src/routes/-projects.$projectId.integration.test.tsx
git commit -m "feat: surface baseline readiness visibility on project dashboard"
```

### Task 3: Slim pinning route to pin-management scope

**Files:**
- Modify: `apps/web/src/routes/projects.$projectId.pinning.tsx`
- Test: `apps/web/src/routes/-projects.$projectId.pinning.integration.test.tsx`

**Step 1: Write the failing test**

Add pinning-route assertions that:
- pin/repin and lineage still render
- pinning route contains dashboard readiness pointer text/link
- baseline-heavy sections are absent from pinning page

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test 'src/routes/-projects.$projectId.pinning.integration.test.tsx'`
Expected: FAIL because baseline sections are still on pinning route.

**Step 3: Write minimal implementation**

In `projects.$projectId.pinning.tsx`:
- remove inline baseline visibility rendering block
- keep pin snapshot/repin config/lineage/runtime sections
- add concise callout linking to dashboard baseline visibility

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test 'src/routes/-projects.$projectId.pinning.integration.test.tsx'`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/routes/projects.$projectId.pinning.tsx apps/web/src/routes/-projects.$projectId.pinning.integration.test.tsx
git commit -m "refactor: keep pinning route focused on pin management and lineage"
```

### Task 4: Validate end-to-end Story 2.6 behavior and regressions

**Files:**
- Modify: `_bmad-output/implementation-artifacts/2-6-provide-baseline-operator-visibility-for-methodology-pin-and-diagnostics-state.md`
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml` (only if status changes)

**Step 1: Run focused test suites**

Run:
- `bun run --cwd apps/web test 'src/routes/-projects.$projectId.integration.test.tsx'`
- `bun run --cwd apps/web test 'src/routes/-projects.$projectId.pinning.integration.test.tsx'`
- `bun run --cwd packages/api test 'src/routers/methodology.test.ts'`

Expected: PASS.

**Step 2: Run workspace verification**

Run:
- `bun run check-types`
- `bun run check`

Expected: PASS.

**Step 3: Update story artifact notes**

Record:
- dashboard-first IA adjustment rationale
- files changed
- verification commands/results

**Step 4: Commit**

```bash
git add apps/web/src/routes apps/web/src/features/projects packages/api/src/routers/methodology.test.ts _bmad-output/implementation-artifacts/2-6-provide-baseline-operator-visibility-for-methodology-pin-and-diagnostics-state.md _bmad-output/implementation-artifacts/sprint-status.yaml
git commit -m "refactor: align story 2.6 baseline visibility with dashboard-first IA"
```
