# Test Layout Standardization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize test placement to colocated `src/tests/**` folders across apps and packages without changing test behavior.

**Architecture:** Perform a pure-structure refactor in deterministic batches (desktop → web → packages), fixing imports and config globs only where needed. Validate each batch immediately with module-scoped test runs before proceeding. Keep naming suffixes unchanged to preserve discovery semantics.

**Tech Stack:** Bun workspaces, Turborepo, Vitest, TypeScript, existing Playwright scaffold docs.

---

### Task 1: Baseline inventory and migration map

**Files:**
- Create: `docs/plans/2026-03-15-test-layout-standardization-migration-map.md`

**Step 1: Generate app/package test inventory**

Run:

```bash
bunx --yes node -e "console.log('inventory generated manually via glob tool in execution session')"
```

Expected: command completes (placeholder marker for recorded inventory process).

**Step 2: Write migration map document**

Document exact old → new paths for:
- `apps/desktop/src/*.test.ts`
- `apps/web/src/**/*.{test.ts,test.tsx,integration.test.tsx}`
- `packages/*/src/*.test.ts`
- `packages/*/src/**/__tests__/*.test.ts`

**Step 3: Commit**

```bash
git add docs/plans/2026-03-15-test-layout-standardization-migration-map.md
git commit -m "docs: add test layout migration map"
```

---

### Task 2: Desktop migration to `src/tests/**`

**Files:**
- Modify: `apps/desktop/src/**` (move tests)
- Modify: `apps/desktop/vitest.config.ts` (only if include changes become necessary)

**Step 1: Move desktop tests into grouped folders**

Target groups:
- `apps/desktop/src/tests/runtime/**`
- `apps/desktop/src/tests/bootstrap/**`
- `apps/desktop/src/tests/ipc/**`
- `apps/desktop/src/tests/packaging/**`

**Step 2: Fix broken relative imports**

Update only imports affected by new depth.

**Step 3: Run desktop tests**

Run:

```bash
bun --filter desktop test
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/desktop/src apps/desktop/vitest.config.ts
git commit -m "refactor(desktop): move tests into src/tests structure"
```

---

### Task 3: Web migration to `src/tests/**`

**Files:**
- Modify: `apps/web/src/**` (move tests)
- Modify: `apps/web/vitest.config.ts` (if include glob broadening is required)

**Step 1: Move web tests to mirrored test domains**

Target domains:
- `apps/web/src/tests/routes/**`
- `apps/web/src/tests/features/**`
- `apps/web/src/tests/components/**`
- `apps/web/src/tests/lib/**`
- `apps/web/src/tests/utils/**`

**Step 2: Keep suffix semantics intact**

Preserve `.integration.test.tsx` and `.test.ts` naming.

**Step 3: Update Vitest include (if needed)**

If current include excludes moved unit tests, change to:

```ts
include: ["src/tests/**/*.test.ts", "src/tests/**/*.test.tsx", "src/tests/**/*.integration.test.tsx"]
```

**Step 4: Run web tests**

Run:

```bash
bun --filter web test
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src apps/web/vitest.config.ts
git commit -m "refactor(web): colocate tests under src/tests"
```

---

### Task 4: Package migration to `src/tests/**`

**Files:**
- Modify: `packages/api/src/**`
- Modify: `packages/contracts/src/**`
- Modify: `packages/methodology-engine/src/**`
- Modify: `packages/project-context/src/**`
- Modify: `packages/scripts/src/**`
- Modify: `packages/db/src/**`
- Modify (if needed):
  - `packages/api/vitest.config.ts`
  - `packages/contracts/vitest.config.ts`
  - `packages/methodology-engine/vitest.config.ts`
  - `packages/scripts/vitest.config.ts`

**Step 1: Move package tests from mixed locations**

Migrate:
- root `src/*.test.ts`
- `src/**/__tests__/*.test.ts`

Into:
- `src/tests/**` with domain subfolders.

**Step 2: Remove `__tests__` usage in migrated packages**

Ensure no remaining `src/**/__tests__` in scope.

**Step 3: Adjust package Vitest config only where discovery fails**

Preferred include for explicitness:

```ts
include: ["src/tests/**/*.test.ts", "src/tests/**/*.integration.test.ts"]
```

**Step 4: Run affected package tests**

Run:

```bash
bun --filter @chiron/api test || bun --filter api test
bun --filter @chiron/contracts test || bun --filter contracts test
bun --filter @chiron/methodology-engine test || bun --filter methodology-engine test
bun --filter @chiron/project-context test || bun --filter project-context test
bun --filter @chiron/scripts test || bun --filter scripts test
bun --filter @chiron/db test || bun --filter db test
```

Expected: PASS for all modules that define test scripts/config.

**Step 5: Commit**

```bash
git add packages/*/src packages/*/vitest.config.ts
git commit -m "refactor(packages): standardize tests under src/tests"
```

---

### Task 5: Workspace verification and guardrails

**Files:**
- Modify: `docs/plans/2026-03-15-test-layout-standardization-design.md` (append execution notes)
- Optional Create: `docs/architecture/testing-layout-conventions.md`

**Step 1: Run workspace tests**

Run:

```bash
bun run test
```

Expected: PASS or known unrelated baseline failures documented.

**Step 2: Add guardrail check (optional but recommended)**

Add a CI/lint check preventing new `src/*.test.ts` outside `src/tests/**`.

**Step 3: Document final convention**

Record final rule:

- Tests must be colocated in `src/tests/**` for apps and packages.

**Step 4: Commit**

```bash
git add docs/architecture/testing-layout-conventions.md docs/plans/2026-03-15-test-layout-standardization-design.md
git commit -m "docs: define colocated test folder convention"
```
