# Comfortable Desktop Scaling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver comfortable desktop sizing for 1080p/1440p by applying fluid global scaling and shell spacing adjustments without per-page maintenance.

**Architecture:** Apply a root CSS clamp-based scale in `apps/web/src/index.css`, then connect shell-level class hooks in `app-shell.tsx` so spacing remains balanced. Validate behavior with existing integration tests plus one targeted assertion update, then run full repo checks.

**Tech Stack:** React, TanStack Router, Tailwind v4 CSS layers, Vitest, Bun.

---

### Task 1: Add failing shell-scale regression test

**Files:**
- Modify: `apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx`
- Test command target: same file

**Step 1: Write the failing test**

Add a test that renders `AppShell` and asserts the top-level content region contains a new class hook (for example `chiron-app-shell-content`) that will carry comfortable desktop spacing behavior.

```tsx
it("applies desktop-comfort scale hook on shell content", async () => {
  render(<AppShell><div>content</div></AppShell>);
  expect(document.querySelector(".chiron-app-shell-content")).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
bun run --cwd apps/web test -- src/tests/components/app-shell.sidebar-sections.integration.test.tsx
```

Expected: FAIL because `chiron-app-shell-content` does not exist yet.

**Step 3: Write minimal implementation**

In `apps/web/src/components/app-shell.tsx`, add `chiron-app-shell-content` class to the main content container (`div` wrapping route children).

**Step 4: Run test to verify it passes**

Run the same command and confirm PASS.

**Step 5: Commit**

```bash
git add apps/web/src/components/app-shell.tsx apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx
git commit -m "test(web): add shell scale hook regression coverage"
```

### Task 2: Implement comfortable desktop fluid scaling in global CSS

**Files:**
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/src/components/app-shell.tsx` (if class hooks/spacing refinement still needed)

**Step 1: Write the failing expectation (style contract)**

Add a focused assertion in an existing integration test (or a minimal new one) that checks the content wrapper uses the class hook and keeps existing shell layout semantics. This test should fail first if class/hook is missing.

**Step 2: Run test to verify it fails**

Run the same targeted test file as Task 1 and confirm failing assertion.

**Step 3: Write minimal implementation**

In `apps/web/src/index.css`:
- Add a desktop-only fluid scaling rule for `html` using `clamp(...)` (comfortable range)
- Add utility class `.chiron-app-shell-content` to tune vertical rhythm (padding/gap) under desktop breakpoints

Implementation constraints:
- Do not add `useEffect`
- Do not add per-page hardcoded width break hacks
- Keep scaling conservative (~10–15% perceived increase)

**Step 4: Run targeted tests to verify pass**

```bash
bun run --cwd apps/web test -- src/tests/components/app-shell.sidebar-sections.integration.test.tsx
bun run --cwd apps/web test -- src/tests/features/methodologies/command-palette.integration.test.tsx
bun run --cwd apps/web test -- src/tests/features/methodologies/commands.test.ts
```

Expected: all PASS.

**Step 5: Commit**

```bash
git add apps/web/src/index.css apps/web/src/components/app-shell.tsx apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx
git commit -m "feat(web): apply comfortable desktop fluid scaling"
```

### Task 3: Verification and evidence

**Files:**
- Modify if needed: `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`

**Step 1: Run type checks**

```bash
bun run --cwd apps/web check-types
bun run check-types
```

Expected: PASS.

**Step 2: Run repository checks**

```bash
bun run check
```

Expected: PASS (if format issues: run `bunx oxfmt --write <files>` then rerun).

**Step 3: Visual QA pass (manual)**

Verify at minimum:
- 1920×1080: denser than current baseline, still balanced
- 2560×1440: no tiny/sparse appearance
- Command palette and sidebar remain legible and proportionate

Optional evidence command:

```bash
bunx playwright test tests/e2e/story-3-1-design-shell-navigation.spec.ts
```

**Step 4: Update artifact evidence section**

Append a short addendum describing the scaling change and verification results.

**Step 5: Commit**

```bash
git add _bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md
git commit -m "docs(story-3-1): record comfortable desktop scaling evidence"
```
