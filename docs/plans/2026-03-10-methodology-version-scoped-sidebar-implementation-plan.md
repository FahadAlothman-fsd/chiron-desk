# Methodology Version-Scoped Sidebar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reshape the methodology shell IA so methodology-wide pages live under an Overview section while version-scoped pages live under a selected-version section, with Facts moved to a version-scoped route.

**Architecture:** Extend the shell/sidebar to understand both the selected methodology and selected version. Keep methodology-wide routes at `/methodologies/:methodologyId...`, but move authoring surfaces like Facts under `/methodologies/:methodologyId/versions/:versionId/...`. The version selector continues to land on the workspace route, and the sidebar mirrors that hierarchy explicitly.

**Tech Stack:** React, TanStack Router, TanStack Query, Vitest, Testing Library, Playwright.

---

### Task 1: Lock the sidebar IA in tests

**Files:**
- Modify: `apps/web/src/components/app-shell.sidebar-sections.integration.test.tsx`
- Modify: `apps/web/src/components/app-sidebar.integration.test.tsx`

**Step 1: Write the failing test**

Update sidebar tests to expect:
- methodology scope returns an `Overview` section with `Dashboard` and `Versions`
- when a version is selected, a second section title uses the selected version name only
- that selected-version section contains `Workspace` and `Facts`
- version switcher selection navigates to `/methodologies/$methodologyId/versions/$versionId`

**Step 2: Run test to verify it fails**

Run: `bunx vitest run 'src/components/app-shell.sidebar-sections.integration.test.tsx' 'src/components/app-sidebar.integration.test.tsx'`

Expected: FAIL because the current sidebar still uses one `Methodology` section and top-level `Methodology Facts`.

**Step 3: Write minimal implementation**

Update sidebar section construction and version-switcher tests only enough to express the new IA.

**Step 4: Run test to verify it passes**

Run the same command.

Expected: PASS.

### Task 2: Move Facts to the version-scoped route in tests

**Files:**
- Create: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.facts.integration.test.tsx` (replace/remove)

**Step 1: Write the failing test**

Create a version-scoped facts-route test that expects:
- route params `methodologyId` and `versionId`
- breadcrumbs/links use the version-scoped route
- facts page loads the selected version projection instead of selecting the latest draft automatically

**Step 2: Run test to verify it fails**

Run: `bunx vitest run 'src/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx'`

Expected: FAIL because the route file does not exist yet and the current facts route is methodology-scoped.

**Step 3: Write minimal implementation**

Add the version-scoped route file and point the test at it.

**Step 4: Run test to verify it passes**

Run the same command.

Expected: PASS.

### Task 3: Implement sidebar IA and version-aware route links

**Files:**
- Modify: `apps/web/src/components/sidebar-sections.tsx`
- Modify: `apps/web/src/components/app-shell.tsx`
- Modify: `apps/web/src/components/app-sidebar.tsx`

**Step 1: Write the failing test**

Extend tests to assert:
- no methodology-level `Facts` item remains
- `Workspace` and `Facts` appear only when a version is selected
- selected-version section title matches the current version label

**Step 2: Run test to verify it fails**

Run: `bunx vitest run 'src/components/app-shell.sidebar-sections.integration.test.tsx' 'src/components/app-sidebar.integration.test.tsx'`

Expected: FAIL because `buildSidebarSections` does not accept selected-version context yet.

**Step 3: Write minimal implementation**

Add version context to `buildSidebarSections`, pass selected version data from `AppShell`, and keep the version popover navigating to workspace.

**Step 4: Run test to verify it passes**

Run the same command.

Expected: PASS.

### Task 4: Move the facts page to version scope and keep CRUD behavior green

**Files:**
- Create: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
- Delete: `apps/web/src/routes/methodologies.$methodologyId.facts.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`

**Step 1: Write the failing test**

Port the existing CRUD expectations to the version-scoped route test and assert:
- route uses `versionId` directly
- `Workspace` link points to `/methodologies/$methodologyId/versions/$versionId`
- `Facts` stays within the selected version section

**Step 2: Run test to verify it fails**

Run: `bunx vitest run 'src/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx'`

Expected: FAIL until the route file and links are updated.

**Step 3: Write minimal implementation**

Create the new route file from the current facts route, switch loading/persistence to the explicit `versionId`, and update workspace navigation links.

**Step 4: Run test to verify it passes**

Run the same command.

Expected: PASS.

### Task 5: Verify shell, routing, and live browser behavior

**Files:**
- Test: `apps/web/src/components/app-sidebar.integration.test.tsx`
- Test: `apps/web/src/components/app-shell.sidebar-sections.integration.test.tsx`
- Test: `apps/web/src/routes/methodologies.$methodologyId.integration.test.tsx`
- Test: `apps/web/src/routes/methodologies.$methodologyId.versions.integration.test.tsx`
- Test: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`
- Browser verify via Playwright on `http://localhost:3001`

**Step 1: Run broader verification**

Run: `bunx vitest run 'src/components/app-sidebar.integration.test.tsx' 'src/components/app-shell.sidebar-sections.integration.test.tsx' 'src/routes/methodologies.$methodologyId.integration.test.tsx' 'src/routes/methodologies.$methodologyId.versions.integration.test.tsx' 'src/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx'`

Expected: PASS.

**Step 2: Browser verify**

Use Playwright on `http://localhost:3001` to confirm:
- version selector lands on workspace
- sidebar shows `Overview` + selected-version section
- `Facts` opens under the selected version and renders CRUD UI

**Step 3: Re-run focused tests if browser reveals issues**

Run the minimal failing suite for the discovered issue, fix, and then re-run the broader suite.
