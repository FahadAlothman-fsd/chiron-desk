# Methodology Version-First Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert methodology dashboard to a version-first ledger with badge-based lifecycle clarity and pinned-project editability rules.

**Architecture:** Keep routing unchanged (`/methodologies/:methodologyId`) but replace dashboard content contract with summary + version ledger. Drive editability from a deterministic `isVersionEditable` rule using pinned-project count and lifecycle. Preserve version-scoped editor routes for Facts/Work Units/Agents/Dependency Definitions.

**Tech Stack:** React, TanStack Router, TanStack Query, TypeScript, Vitest, Playwright (existing app stack)

---

### Task 1: Lock dashboard behavior with failing tests (RED)

**Files:**
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx`
- Modify: `apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx` (only if labels/expectations shift)

**Step 1: Write failing test for version-first dashboard content**

Add/adjust assertions to require:
- Summary strip contains: latest active, latest draft, total versions
- Version ledger rows are visible
- Lifecycle badges are visible per row
- Facts inventory section is not rendered on methodology dashboard

**Step 2: Run test to verify it fails**

Run:
`bun run --cwd apps/web test -- src/tests/routes/methodologies.$methodologyId.integration.test.tsx`

Expected:
- FAIL because existing dashboard still shows facts inventory and missing summary/badges.

**Step 3: Add failing editability-rule tests**

In same test file (or a new focused test file), add matrix assertions:
- Draft + pinned=0 => editable
- Draft + pinned>0 => locked
- Published + pinned=0 => editable
- Published + pinned>0 => locked
- Archived => locked

**Step 4: Run tests to verify failures are precise**

Run:
`bun run --cwd apps/web test -- src/tests/routes/methodologies.$methodologyId.integration.test.tsx`

Expected:
- FAIL on action enable/disable semantics.

**Step 5: Commit (only if explicitly requested by user)**

Do not commit unless requested.

---

### Task 2: Implement deterministic dashboard view model + rendering (GREEN)

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.tsx`
- Modify: `apps/web/src/features/methodologies/foundation.ts` (if shared helpers needed)

**Step 1: Implement summary derivation helpers**

Add deterministic selectors for:
- latest published version
- latest draft version
- total version counts by lifecycle

Use existing version data order rules from methodology foundation.

**Step 2: Implement pinned-editability helper**

Introduce a pure helper, e.g.:

```ts
function isVersionEditable(input: {
  lifecycle: "draft" | "published" | "archived";
  pinnedProjectCount: number;
}): boolean {
  if (input.lifecycle === "archived") return false;
  return input.pinnedProjectCount === 0;
}
```

If pinned count is not already in route payload, use available source in route context/query and normalize to `0` when absent.

**Step 3: Replace facts-focused body with version-first layout**

Render:
- Summary strip cards
- Version ledger/table
- Lifecycle badges per row
- Action state (`Edit` enabled/disabled) based on helper

Remove dashboard facts inventory section from this route.

**Step 4: Add user-facing lock reason text**

For locked rows, show deterministic reason text, e.g.:
- "Pinned by active projects; create/open draft flow required."

**Step 5: Run route test to verify pass**

Run:
`bun run --cwd apps/web test -- src/tests/routes/methodologies.$methodologyId.integration.test.tsx`

Expected:
- PASS

**Step 6: Commit (only if explicitly requested by user)**

Do not commit unless requested.

---

### Task 3: Keep navigation/context coherence and badges stable

**Files:**
- Modify: `apps/web/src/components/sidebar-sections.tsx` (only if label wording needs tightening)
- Modify: `apps/web/src/features/methodologies/commands.ts` (only if command labels require alignment)
- Modify: `apps/web/src/features/methodologies/command-palette.tsx` (only if action labeling/context hints require alignment)

**Step 1: Add/adjust failing integration assertions (if needed)**

Ensure:
- Dashboard route remains version-first in wording
- Command/open actions still resolve to version-owned pages

**Step 2: Run focused integration tests (RED)**

Run:
`bun run --cwd apps/web test -- src/tests/components/app-shell.sidebar-sections.integration.test.tsx src/tests/features/methodologies/command-palette.integration.test.tsx src/tests/features/methodologies/commands.test.ts`

Expected:
- FAIL only if copy/label drift introduced.

**Step 3: Apply minimal text/label fixes**

Keep DRY/YAGNI: only align wording and context messages, no behavior expansion.

**Step 4: Re-run focused tests (GREEN)**

Run same command as Step 2.

Expected:
- PASS

**Step 5: Commit (only if explicitly requested by user)**

Do not commit unless requested.

---

### Task 4: Full verification + evidence before completion

**Files:**
- No feature files expected; verification only unless defects found.

**Step 1: Run web type checks**

Run:
`bun run --cwd apps/web check-types`

Expected:
- PASS

**Step 2: Run monorepo checks**

Run:
`bun run check-types`
`bun run check`

Expected:
- PASS

**Step 3: Run targeted Story 3.1 + dashboard tests**

Run:
`bun run --cwd apps/web test -- src/tests/routes/methodologies.$methodologyId.integration.test.tsx src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx src/tests/features/methodologies/commands.test.ts src/tests/features/methodologies/command-palette.integration.test.tsx src/tests/components/app-shell.sidebar-sections.integration.test.tsx`

Expected:
- PASS

**Step 4: Run Playwright smoke**

Run:
`bunx playwright test tests/e2e/story-3-1-design-shell-navigation.spec.ts`

Expected:
- PASS

**Step 5: Record evidence summary**

Capture command, exit status, and key assertions validated.

**Step 6: Commit (only if explicitly requested by user)**

Do not commit unless requested.
