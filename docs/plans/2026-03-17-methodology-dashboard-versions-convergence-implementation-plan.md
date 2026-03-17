# Methodology Dashboard + Versions Convergence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `/methodologies/:methodologyId` the single canonical methodology dashboard UX by moving draft controls there, turning `/methodologies/:methodologyId/versions` into a compatibility route shell, and shifting version editability metadata derivation to server/API.

**Architecture:** Extend methodology details payload in `@chiron/methodology-engine` to include editability metadata per version, computed from project pin state in API composition. Update dashboard route to consume server-provided fields and host draft controls. Keep versions index route for compatibility + child nesting, without maintaining a second independent page contract.

**Tech Stack:** TanStack Router, TanStack Query, oRPC routers, Effect services, Vitest, Playwright, Bun.

---

### Task 1: Add failing API tests for version editability metadata

**Files:**
- Modify: `packages/api/src/tests/routers/methodology.test.ts`
- Reference: `packages/api/src/routers/methodology.ts`

**Step 1: Write the failing test**

Add a test that calls `getMethodologyDetails` and asserts each returned version includes:
- `pinnedProjectCount`
- `isEditable`
- `editabilityReason` (`"editable" | "pinned" | "archived"`)

Cover at least:
- draft + unpinned -> editable
- active + pinned -> locked/pinned
- archived + unpinned -> locked/archived

**Step 2: Run test to verify it fails**

Run:
`bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected:
FAIL because fields are missing from current payload.

**Step 3: Write minimal implementation**

Implement only enough API composition logic to satisfy the failing expectations:
- compute pinned counts by version id
- attach editability fields to each version summary

**Step 4: Run test to verify it passes**

Run:
`bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected:
PASS for the new metadata assertions.

**Step 5: Commit**

```bash
git add packages/api/src/tests/routers/methodology.test.ts packages/api/src/routers/methodology.ts
git commit -m "feat(api): expose version editability metadata in methodology details"
```

### Task 2: Update methodology service/router types and serialization for enriched versions

**Files:**
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write/adjust failing type-level and behavior assertions**

In API tests, assert response shape includes new fields on all versions returned by `getMethodologyDetails` and `listMethodologyVersions` (if wired to same enriched payload).

**Step 2: Run tests to verify failure**

Run:
`bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected:
FAIL on response shape mismatch.

**Step 3: Write minimal implementation**

- Extend `MethodologyDetails` version item type in `version-service.ts` to include optional enriched fields (or add API-level mapped type if preferred).
- In `createMethodologyRouter`, enrich versions using project pin data from `ProjectContextService` before returning details.
- Keep serialization deterministic and avoid UI-specific wording in API.

**Step 4: Run tests to verify pass**

Run:
`bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected:
PASS.

**Step 5: Commit**

```bash
git add packages/methodology-engine/src/version-service.ts packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "feat(api): return pinned counts and editability reason for methodology versions"
```

### Task 3: Move draft controls into dashboard route using TDD

**Files:**
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.tsx`

**Step 1: Write failing dashboard tests**

Add assertions that dashboard renders:
- `Create Draft` button
- `Open Existing Draft` button
- existing summary + ledger still present
- action state reflects enriched API fields (not local pin aggregation)

**Step 2: Run test to verify failure**

Run:
`bun run --cwd apps/web test -- src/tests/routes/methodologies.$methodologyId.integration.test.tsx`

Expected:
FAIL because controls are not on dashboard yet.

**Step 3: Write minimal implementation**

In `methodologies.$methodologyId.tsx`:
- add create draft mutation + navigate behavior currently in versions index
- add open existing draft action
- remove local `projectsQuery` + reduce-based editability derivation
- consume server-provided `pinnedProjectCount`, `isEditable`, `editabilityReason`

**Step 4: Run test to verify pass**

Run:
`bun run --cwd apps/web test -- src/tests/routes/methodologies.$methodologyId.integration.test.tsx`

Expected:
PASS.

**Step 5: Commit**

```bash
git add apps/web/src/routes/methodologies.$methodologyId.tsx apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx
git commit -m "feat(web): host draft controls on methodology dashboard"
```

### Task 4: Convert versions index into compatibility route shell

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx`

**Step 1: Write failing compatibility test**

Add assertions for exact `/versions` path behavior:
- no independent duplicated ledger/draft control contract
- compatibility behavior (shared dashboard render or redirect)
- nested child pass-through still works when pathname is not exact `/versions`

**Step 2: Run test to verify failure**

Run:
`bun run --cwd apps/web test -- src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx`

Expected:
FAIL with old independent page expectations.

**Step 3: Write minimal implementation**

Refactor `methodologies.$methodologyId.versions.tsx`:
- keep `Outlet` for nested child routes
- for exact index path, reuse dashboard content or navigate to `/methodologies/$methodologyId`
- remove duplicate ledger/draft logic from this route

**Step 4: Run test to verify pass**

Run:
`bun run --cwd apps/web test -- src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx`

Expected:
PASS.

**Step 5: Commit**

```bash
git add apps/web/src/routes/methodologies.$methodologyId.versions.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx
git commit -m "refactor(web): make methodology versions index a compatibility shell"
```

### Task 5: Story-level regression verification and docs update

**Files:**
- Modify: `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`
- Optional update: `docs/plans/2026-03-17-methodology-dashboard-versions-convergence-design.md`

**Step 1: Add/adjust Story 3.1 evidence entries**

Document that dashboard is canonical and versions index is compatibility-only, with API-owned editability metadata.

**Step 2: Run web targeted regressions**

Run:
`bun run --cwd apps/web test -- src/tests/routes/methodologies.$methodologyId.integration.test.tsx src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx src/tests/features/methodologies/commands.test.ts src/tests/features/methodologies/command-palette.integration.test.tsx`

Expected:
All pass.

**Step 3: Run repo-wide required checks**

Run:
`bun run check-types && bun run check && bunx playwright test`

Expected:
All pass.

**Step 4: Commit**

```bash
git add _bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md docs/plans/2026-03-17-methodology-dashboard-versions-convergence-design.md
git commit -m "docs(story-3.1): record dashboard canonicalization and versions compatibility route"
```

### Task 6: Final integration sanity check

**Files:**
- Verify only (no required edits)

**Step 1: Run one final focused command**

Run:
`bun run --cwd apps/web test -- src/tests/routes/methodologies.$methodologyId.integration.test.tsx src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx`

Expected:
PASS, confirming dashboard+versions convergence behavior remains stable.

**Step 2: Capture git status for review**

Run:
`git status --short`

Expected:
Only intended files are modified.

**Step 3: Handoff for branch finishing**

Use `@superpowers/finishing-a-development-branch` after verification is complete.
