# Story 3.2 Overview Command Surface Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Work Unit L2 Overview tab as a compact command surface with single-key actions (`F/W/S/A`), tab-switch shortcuts, and a `?` keymap helper overlay.

**Architecture:** Keep the existing route shell as the container and add an `OverviewTab` feature component that receives projection-derived counts plus action callbacks. Implement keyboard handling through a focused hook/module that gates shortcuts while typing and exposes overlay state. Add route integration tests first (RED), then minimal component logic (GREEN), then refactor shared keycap and helper primitives.

**Tech Stack:** React, TanStack Router, TanStack Query, TypeScript, Vitest, Testing Library, shadcn/ui.

---

### Task 1: Freeze + wire Overview surface contract in route (no graph)

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Create: `apps/web/src/features/methodologies/work-unit-l2/OverviewTab.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

**Step 1: Write failing test for Overview section content (RED)**

Add an integration test that loads `tab: "overview"` and expects:
- `Facts`, `Workflows`, `State Machine`, `Artifact Slots` cards/sections
- no mini-graph copy
- quick actions present in card-level action rows

**Step 2: Run test to verify failure**

Run:
`bun run test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`

Expected: FAIL due missing Overview card surface.

**Step 3: Implement minimal OverviewTab component (GREEN)**

Implement:
- 4 domain cards only
- compact metrics and action rows
- route renders `OverviewTab` when `tab === "overview"`
- keep existing failure/loading context behavior

**Step 4: Re-run test to verify pass**

Run same test command; expected PASS.

**Step 5: Commit**

`git add apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx apps/web/src/features/methodologies/work-unit-l2/OverviewTab.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx && git commit -m "feat(web): add story 3.2 overview command cards"`

---

### Task 2: Add single-key actions and tab-switch key bindings

**Files:**
- Create: `apps/web/src/features/methodologies/work-unit-l2/useOverviewKeymap.ts`
- Modify: `apps/web/src/features/methodologies/work-unit-l2/OverviewTab.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

**Step 1: Write failing tests for keyboard behavior (RED)**

Add tests for:
- `F/W/S/A` trigger corresponding add intents
- `O` and `Shift+F/W/S/A` switch tabs
- shortcuts do not trigger when an input/textarea has focus

**Step 2: Run test to verify failure**

Run:
`bun run test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`

Expected: FAIL for missing key handlers.

**Step 3: Implement minimal keymap hook and wiring (GREEN)**

Implement:
- central key handler with focus guard
- route-level tab-switch action updates search param
- Overview add actions route to existing intent/search flow (or local handlers if already present)
- subtle keycap labels near tabs and card actions

**Step 4: Re-run tests**

Run same route test command; expected PASS.

**Step 5: Commit**

`git add apps/web/src/features/methodologies/work-unit-l2/useOverviewKeymap.ts apps/web/src/features/methodologies/work-unit-l2/OverviewTab.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx && git commit -m "feat(web): add overview single-key and tab keymap actions"`

---

### Task 3: Add `?` keymap helper overlay (semi-hidden)

**Files:**
- Create: `apps/web/src/features/methodologies/work-unit-l2/OverviewKeymapOverlay.tsx`
- Modify: `apps/web/src/features/methodologies/work-unit-l2/OverviewTab.tsx`
- Modify: `apps/web/src/features/methodologies/work-unit-l2/useOverviewKeymap.ts`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

**Step 1: Write failing tests for overlay behavior (RED)**

Test cases:
- pressing `?` opens overlay
- pressing `Esc` closes overlay
- overlay lists single-key actions and tab-switch shortcuts

**Step 2: Run failing tests**

Run:
`bun run test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`

Expected: FAIL due missing overlay.

**Step 3: Implement minimal overlay (GREEN)**

Implement:
- compact modal/panel overlay
- keyboard accessible focus target
- low-visual-noise trigger hint in Overview (e.g., muted `?` keycap)

**Step 4: Re-run tests**

Run same route test command; expected PASS.

**Step 5: Commit**

`git add apps/web/src/features/methodologies/work-unit-l2/OverviewKeymapOverlay.tsx apps/web/src/features/methodologies/work-unit-l2/OverviewTab.tsx apps/web/src/features/methodologies/work-unit-l2/useOverviewKeymap.ts apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx && git commit -m "feat(web): add overview keymap helper overlay"`

---

### Task 4: Story artifact update + verification gate for Overview slice

**Files:**
- Modify: `_bmad-output/implementation-artifacts/3-2-complete-work-unit-l2-tabs-overview-workflows-artifact-slots-facts-state-machine.md`

**Step 1: Update allowed story sections only**

In story artifact, update:
- Tasks/Subtasks checkboxes for Task 3.1
- Dev Agent Record completion notes
- File List entries

Do not edit other story sections.

**Step 2: Run LSP diagnostics on touched files**

Run `lsp_diagnostics` for:
- route file
- `OverviewTab.tsx`
- keymap files
- route integration test file

Expected: zero errors.

**Step 3: Run targeted tests + workspace gates**

Run:
- `bun run test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'` (cwd `apps/web`)
- `bun test "src/tests/routers/methodology.test.ts"` (cwd `packages/api`)
- `bun test "src/tests/repository/methodology-repository.integration.test.ts"` (cwd `packages/db`)
- `bun run build` (workspace)
- `bun run check-types` (workspace; document any pre-existing failures unchanged)

**Step 4: Commit story sync changes**

`git add _bmad-output/implementation-artifacts/3-2-complete-work-unit-l2-tabs-overview-workflows-artifact-slots-facts-state-machine.md && git commit -m "docs(story-3.2): mark overview slice progress and evidence"`

---

## Validation checklist (must be true before moving to Facts tab)

1. Overview renders 4 cards (Facts, Workflows, State Machine, Artifact Slots).
2. Single-key actions (`F/W/S/A`) execute expected add intents.
3. Tab switching shortcuts work and preserve work-unit context.
4. `?` overlay is discoverable but low-noise, closes on `Esc`.
5. Shortcuts are safely disabled while typing in input fields.
6. Existing loading/error deterministic behavior remains intact.

---

## Execution handoff

Plan complete and saved to `docs/plans/2026-03-20-story-3-2-overview-command-surface-implementation-plan.md`. Two execution options:

1. **Subagent-Driven (this session)** - Dispatch fresh subagent per task, review between tasks, fast iteration.
2. **Parallel Session (separate)** - Open new session with `executing-plans`, batch execution with checkpoints.
