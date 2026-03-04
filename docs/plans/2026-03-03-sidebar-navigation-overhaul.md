# Sidebar Navigation Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the confusing split sidebar model with a static, section-based navigation model that points to correct routes and shows planned Epic 3+ items as disabled with badges.

**Architecture:** Keep the existing `AppShell` and sidebar container, but collapse nav data into one typed sections model. Render sections in a single reusable sidebar renderer that supports enabled links and disabled non-link planned items. Remove the old Projects-specific sidebar component and mismatched data wiring.

**Tech Stack:** React 19, TanStack Router, shadcn/ui sidebar primitives, Vitest, Testing Library, TypeScript strict.

---

### Task 1: Lock Sidebar Behavior with Failing Tests

**Files:**
- Create: `apps/web/src/components/app-sidebar.integration.test.tsx`
- Modify: `apps/web/src/components/app-sidebar.tsx` (only if minimal exports needed for testability)

**Step 1: Write the failing test**

Create assertions for:
- static section headings: `Workspace`, `Methodology Authoring`, `Project Operations`, `Planned`
- route links present: Home, Dashboard, Methodologies, Projects
- planned items visible with `Epic 3+` badge
- planned items are not links / are `aria-disabled="true"`

**Step 2: Run test to verify it fails**

Run: `bun run test src/components/app-sidebar.integration.test.tsx`
Expected: FAIL because `AppSidebar` does not yet support unified section model/disabled items.

**Step 3: Write minimal implementation scaffolding**

Expose the minimum props/types needed so tests can target final behavior.

**Step 4: Run test to verify it still fails for the right reason**

Run: `bun run test src/components/app-sidebar.integration.test.tsx`
Expected: FAIL on missing rendered sections/disabled badge behavior, not test setup issues.

**Step 5: Commit**

```bash
git add apps/web/src/components/app-sidebar.integration.test.tsx apps/web/src/components/app-sidebar.tsx
git commit -m "test(sidebar): capture static section and disabled planned-item behavior"
```

### Task 2: Implement Unified Section-Based Sidebar Rendering

**Files:**
- Modify: `apps/web/src/components/app-sidebar.tsx`
- Modify: `apps/web/src/components/nav-main.tsx` (only if reused; otherwise no-op)
- Modify: `apps/web/src/components/nav-secondary.tsx` (only if reused; otherwise no-op)
- Delete: `apps/web/src/components/nav-projects.tsx` (if no longer referenced)

**Step 1: Write the failing test (if additional case needed)**

Add one failing assertion for disabled item non-clickability semantics (no `href`, has `aria-disabled`).

**Step 2: Run test to verify it fails**

Run: `bun run test src/components/app-sidebar.integration.test.tsx`
Expected: FAIL on disabled item semantics.

**Step 3: Write minimal implementation**

- Replace `navMainItems/projectItems/navSecondaryItems` props with:
  - `sections: SidebarSection[]`
- Render each section uniformly.
- For enabled items (`to` and not disabled): render `Link`.
- For disabled items: render non-link button/container with `aria-disabled="true"`, muted styling, badge text.
- Keep header/footer and command button behavior unchanged.

**Step 4: Run tests to verify pass**

Run: `bun run test src/components/app-sidebar.integration.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/components/app-sidebar.tsx apps/web/src/components/nav-projects.tsx apps/web/src/components/app-sidebar.integration.test.tsx
git commit -m "feat(sidebar): unify sidebar sections with disabled planned entries"
```

### Task 3: Rewire AppShell to Approved Static IA

**Files:**
- Modify: `apps/web/src/components/app-shell.tsx`
- Test: `apps/web/src/components/app-sidebar.integration.test.tsx`

**Step 1: Write the failing test**

Add failing assertions for route correctness from shell-provided sections:
- `Projects` links to `/projects`
- no duplicate misleading Project section links to `/methodologies` or `/dashboard`

**Step 2: Run test to verify it fails**

Run: `bun run test src/components/app-sidebar.integration.test.tsx`
Expected: FAIL due old `projectItems` mapping.

**Step 3: Write minimal implementation**

- Build static sections in `AppShell` exactly matching approved IA.
- Compute `isActive` from current pathname for enabled links.
- Provide planned items with `disabled: true` and `badge: "Epic 3+"`.
- Pass `sections` prop into `AppSidebar`.

**Step 4: Run tests to verify pass**

Run: `bun run test src/components/app-sidebar.integration.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/components/app-shell.tsx apps/web/src/components/app-sidebar.integration.test.tsx
git commit -m "feat(sidebar): wire static workspace and project operations IA"
```

### Task 4: Regression Checks and Cleanup

**Files:**
- Modify: `apps/web/src/components/app-sidebar.tsx` (cleanup/type polish if needed)
- Modify: `apps/web/src/components/app-shell.tsx` (cleanup if needed)

**Step 1: Write/adjust final assertions**

Ensure tests include:
- Commands button still rendered when enabled.
- Footer user region still present.
- Planned items show `Epic 3+` badge consistently.

**Step 2: Run targeted tests**

Run: `bun run test src/components/app-sidebar.integration.test.tsx`
Expected: PASS.

**Step 3: Run quality gates**

Run: `bun run check`
Expected: PASS.

Run: `bun run check-types`
Expected: PASS.

**Step 4: Run broader web tests if sidebar impacts shared rendering**

Run: `bun run test --filter=@chiron/web`
Expected: PASS (or equivalent targeted web suite if package filter differs).

**Step 5: Commit**

```bash
git add apps/web/src/components/app-sidebar.tsx apps/web/src/components/app-shell.tsx apps/web/src/components/app-sidebar.integration.test.tsx
git commit -m "test(sidebar): validate static IA, disabled planned entries, and route correctness"
```

### Task 5: Story Artifact and Handoff Update (if this work is tracked by BMAD story)

**Files:**
- Modify: `_bmad-output/implementation-artifacts/<story-file>.md`
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml` (if status changes)

**Step 1: Write failing validation checklist item (manual gate)**

Mark checklist incomplete until all tests/checks pass and file list is complete.

**Step 2: Verify completion gates**

Run:
- `bun run check`
- `bun run check-types`
- relevant test commands

Expected: all pass.

**Step 3: Update story artifact sections**

Update only allowed sections:
- Tasks/Subtasks checkboxes
- Dev Agent Record
- Completion notes
- File list
- Status

**Step 4: Final verification**

Run: `git status -sb`
Expected: only intended files changed.

**Step 5: Commit**

```bash
git add _bmad-output/implementation-artifacts/<story-file>.md _bmad-output/implementation-artifacts/sprint-status.yaml
git commit -m "docs(story): record sidebar IA overhaul implementation status"
```
