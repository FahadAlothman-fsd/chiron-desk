# Methodology Shell IA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the new System / Methodology / Project shell information architecture with a context switcher, shallow sidebars, and in-page tabs for work-unit and workflow drill-ins.

**Architecture:** Introduce a top-level context mode model that drives shell navigation and selectors, then refactor the methodology pages so sidebar items stay shallow while work-unit and workflow detail moves into local tabs in the main content area. Keep the implementation incremental so existing routes and CRUD behavior remain functional while navigation structure changes.

**Tech Stack:** React, TanStack Router, TypeScript, existing app shell/navigation components, Vitest

---

### Task 1: Locate current shell and navigation entry points

**Files:**
- Inspect: `apps/web/src/routes/**`
- Inspect: `apps/web/src/features/**`
- Inspect: `apps/web/src/components/**`

**Step 1: Find the current app shell and sidebar components**

Search for the components that render the current sidebar and top-left selector.

**Step 2: Find the current methodology and project route layout components**

Identify where route-level layout boundaries exist so the new context-mode shell can be inserted without duplicating layout logic.

**Step 3: Record exact files for the shell refactor**

Write down the shell component, selector component, route layout files, and methodology/project page entry files before changing anything.


### Task 2: Add the context-mode model

**Files:**
- Modify: `apps/web/src/...` shell/layout file(s) discovered in Task 1
- Test: route/layout integration test file(s) covering shell rendering

**Step 1: Write a failing test for context-mode rendering**

Add a test that expects the shell to expose three app contexts:
- System
- Methodology
- Project

**Step 2: Run the failing test**

Run the relevant web integration test file and confirm the new expectation fails.

**Step 3: Add a typed context-mode model**

Implement a small typed model for the shell context mode and connect it to the top-left switcher UI.

**Step 4: Render the three context icons/modes in the shell**

Show the mode switcher without yet finalizing deeper page behavior.

**Step 5: Re-run the test**

Confirm the context-mode rendering test passes.


### Task 3: Make selectors mode-specific

**Files:**
- Modify: shell/header selector component(s)
- Test: shell/header integration test(s)

**Step 1: Write a failing test for mode-specific selectors**

Expect:
- System mode: minimal/no secondary selector
- Methodology mode: methodology selector + version selector
- Project mode: project selector + pinned methodology/version context display

**Step 2: Run the failing test**

Confirm the selector expectations fail under the current shared selector behavior.

**Step 3: Implement mode-specific selector rendering**

Refactor the current selector area so it changes based on the active context mode.

**Step 4: Re-run the selector test**

Confirm the expected selectors render correctly for each mode.


### Task 4: Build the System sidebar

**Files:**
- Modify: shell/sidebar component(s)
- Test: shell/sidebar integration test(s)

**Step 1: Write a failing test for System sidebar items**

Expect these items in System mode:
- Home
- Methodologies
- Projects
- Harnesses
- Settings

**Step 2: Run the failing test**

Confirm the old sidebar does not match this menu.

**Step 3: Implement System sidebar navigation**

Render the System sidebar from the active context mode, not from methodology/project assumptions.

**Step 4: Re-run the sidebar test**

Confirm the System menu is correct.


### Task 5: Build the Methodology sidebar

**Files:**
- Modify: methodology shell/sidebar component(s)
- Test: methodology shell/sidebar integration test(s)

**Step 1: Write a failing test for Methodology sidebar items**

Expect these items in Methodology mode:
- Dashboard
- Versions
- Methodology Facts
- Work Units
- Artifact Templates

**Step 2: Run the failing test**

Confirm current methodology navigation does not match this set.

**Step 3: Implement Methodology sidebar navigation**

Refactor methodology navigation so those five items are the top-level sidebar items.

**Step 4: Re-run the test**

Confirm the Methodology menu is correct.


### Task 6: Build the Project sidebar

**Files:**
- Modify: project shell/sidebar component(s)
- Test: project shell/sidebar integration test(s)

**Step 1: Write a failing test for Project sidebar items**

Expect these items in Project mode:
- Dashboard
- Project Facts
- Work Units
- Artifacts
- Runs / History
- Pin / Methodology

**Step 2: Run the failing test**

Confirm current project navigation does not match this set.

**Step 3: Implement Project sidebar navigation**

Refactor project navigation to be mode-specific and shallow.

**Step 4: Re-run the test**

Confirm the Project menu is correct.


### Task 7: Move work-unit drill-in into tabs

**Files:**
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx`
- Modify: any methodology detail panel component(s)
- Test: `apps/web/src/features/methodologies/version-workspace.integration.test.tsx`

**Step 1: Write a failing integration test for work-unit tabs**

Expect that when a work unit is selected, the main pane shows tabs:
- Overview
- Facts
- Transitions
- Workflows

**Step 2: Run the failing integration test**

Confirm the current UI does not expose this exact tab structure.

**Step 3: Implement work-unit tab navigation in the main pane**

Keep the sidebar shallow and move the work-unit drill-in into local tabs.

**Step 4: Re-run the integration test**

Confirm the work-unit tab structure renders correctly.


### Task 8: Move workflow drill-in into tabs

**Files:**
- Modify: methodology workflow detail panel component(s)
- Test: `apps/web/src/features/methodologies/version-workspace.integration.test.tsx`

**Step 1: Write a failing integration test for workflow tabs**

Expect that when a workflow is selected inside a work unit, the main pane shows tabs:
- Overview
- Steps

**Step 2: Run the failing integration test**

Confirm current workflow detail rendering does not match the new structure.

**Step 3: Implement workflow tab navigation**

Render workflow-local tabs instead of pushing workflow depth into the sidebar.

**Step 4: Re-run the integration test**

Confirm the workflow tab structure renders correctly.


### Task 9: Keep Harnesses out of methodology navigation

**Files:**
- Modify: methodology page(s) where harness/agent selection currently appears as a top-level area
- Test: methodology navigation/integration test(s)

**Step 1: Write a failing test asserting Harnesses are not a methodology sidebar page**

Expect Harnesses to be system-owned and only referenced where needed in methodology authoring.

**Step 2: Run the failing test**

Confirm current behavior or labels still mix system-owned harnesses into methodology navigation.

**Step 3: Refactor harness references to be contextual only**

Keep them available for pickers where needed, but not as a methodology sidebar section.

**Step 4: Re-run the test**

Confirm Harnesses are system-owned in the shell model.


### Task 10: Verify route behavior and polish labels

**Files:**
- Modify: route labels, shell components, sidebar item labels
- Test: affected integration tests

**Step 1: Run all focused web tests for the shell/navigation areas**

Run the exact methodology/project shell tests you touched.

**Step 2: Fix any label or route regressions**

Address mismatched labels, selector state, or mode-specific routing issues.

**Step 3: Re-run the focused tests**

Ensure all touched shell/navigation tests pass.


### Task 11: Final verification

**Files:**
- No new files unless a test or doc fix is needed

**Step 1: Run type-check**

Run: `bun run check-types`

Expected: PASS

**Step 2: Run focused web tests**

Run the shell/methodology/project integration tests touched by the refactor.

Expected: PASS

**Step 3: Run root checks**

Run: `bun run check`

Expected: PASS

**Step 4: Commit**

Create small semantic commits by concern as the implementation progresses.
