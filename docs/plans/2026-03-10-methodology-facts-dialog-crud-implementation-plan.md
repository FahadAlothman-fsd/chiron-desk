# Methodology Facts Dialog CRUD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the Methodology Facts page into a dialog-driven CRUD surface with a scan-friendly grid, guidance viewer, delete confirmation, generic success toasts, and query invalidation after successful mutations.

**Architecture:** Keep the facts page route as the orchestration layer for data loading, mutation, invalidation, and toast handling. Move the facts grid into a richer reusable feature component that renders the approved columns and action triggers, while create/edit/delete/guidance dialogs remain local to the facts page so they can work directly against the loaded draft state.

**Tech Stack:** React, TanStack Query, TanStack Table, Base UI dialog/tooltip primitives, shared dropdown menu UI, `sonner`, Vitest, Testing Library.

---

### Task 1: Lock the approved facts-page UX in tests

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.facts.integration.test.tsx`

**Step 1: Write the failing test**

Add expectations for the approved grid and interactions:
- `Add Fact` button in the header
- grid headers `Fact`, `Type`, `Validation`, `Default`, `Guidance`, `Actions`
- guidance icon trigger with tooltip/accessibility label
- compact row actions trigger
- no inline `FactListEditor` block visible by default

**Step 2: Run test to verify it fails**

Run: `bunx vitest run 'src/routes/methodologies.$methodologyId.facts.integration.test.tsx'`

Expected: FAIL because the page still renders the old inline authoring studio instead of dialog-driven CRUD.

**Step 3: Write minimal implementation**

Update the facts page/grid components just enough to match the new static structure.

**Step 4: Run test to verify it passes**

Run: `bunx vitest run 'src/routes/methodologies.$methodologyId.facts.integration.test.tsx'`

Expected: PASS.

### Task 2: Add create/edit dialog flow

**Files:**
- Modify: `apps/web/src/features/methodologies/methodology-facts.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.facts.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.facts.integration.test.tsx`

**Step 1: Write the failing test**

Add one test covering:
- `Add Fact` opens a dialog
- dialog starts on `Basic` step with display name, key, type, default value
- `Next` moves to `Advanced`
- `Back` returns to `Basic`
- `Edit` from row actions opens the same dialog prefilled

**Step 2: Run test to verify it fails**

Run: `bunx vitest run 'src/routes/methodologies.$methodologyId.facts.integration.test.tsx'`

Expected: FAIL because the dialog flow does not exist yet.

**Step 3: Write minimal implementation**

Implement local dialog state and a two-step create/edit form that maps to `FactEditorValue` and updates the draft facts array.

**Step 4: Run test to verify it passes**

Run: `bunx vitest run 'src/routes/methodologies.$methodologyId.facts.integration.test.tsx'`

Expected: PASS.

### Task 3: Add guidance viewer and delete confirmation

**Files:**
- Modify: `apps/web/src/features/methodologies/methodology-facts.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.facts.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.facts.integration.test.tsx`

**Step 1: Write the failing test**

Add one test covering:
- clicking guidance icon opens a dialog
- dialog renders guidance markdown sections for `Human` and `Agent`
- row actions menu exposes `Delete`
- delete confirmation dialog appears before removal

**Step 2: Run test to verify it fails**

Run: `bunx vitest run 'src/routes/methodologies.$methodologyId.facts.integration.test.tsx'`

Expected: FAIL because neither dialog exists yet.

**Step 3: Write minimal implementation**

Add tooltip-backed icon triggers, markdown guidance dialog, and confirm-delete dialog that removes the selected fact from local draft state.

**Step 4: Run test to verify it passes**

Run: `bunx vitest run 'src/routes/methodologies.$methodologyId.facts.integration.test.tsx'`

Expected: PASS.

### Task 4: Save/delete success behavior with invalidation and toast

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.facts.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.facts.integration.test.tsx`

**Step 1: Write the failing test**

Add one test covering:
- save from dialog triggers mutation
- dialog closes on success
- generic toast appears (`Fact saved`)
- relevant query invalidation happens
- delete confirm triggers save path and shows `Fact deleted`

**Step 2: Run test to verify it fails**

Run: `bunx vitest run 'src/routes/methodologies.$methodologyId.facts.integration.test.tsx'`

Expected: FAIL because the route currently has no toast behavior and no dialog lifecycle around save/delete.

**Step 3: Write minimal implementation**

Use `toast.success(...)`, close dialogs on success, and keep the existing authoritative `invalidateQueries` + refetch path.

**Step 4: Run test to verify it passes**

Run: `bunx vitest run 'src/routes/methodologies.$methodologyId.facts.integration.test.tsx'`

Expected: PASS.

### Task 5: Verify shell and route behavior stays green

**Files:**
- Test: `apps/web/src/components/app-shell.sidebar-sections.integration.test.tsx`
- Test: `apps/web/src/components/app-sidebar.integration.test.tsx`
- Test: `apps/web/src/routes/methodologies.$methodologyId.integration.test.tsx`
- Test: `apps/web/src/routes/methodologies.$methodologyId.facts.integration.test.tsx`
- Test: `apps/web/src/routes/methodologies.$methodologyId.versions.integration.test.tsx`

**Step 1: Run broader verification**

Run: `bunx vitest run 'src/components/app-sidebar.integration.test.tsx' 'src/components/app-shell.sidebar-sections.integration.test.tsx' 'src/routes/methodologies.$methodologyId.integration.test.tsx' 'src/routes/methodologies.$methodologyId.facts.integration.test.tsx' 'src/routes/methodologies.$methodologyId.versions.integration.test.tsx'`

Expected: PASS.

**Step 2: Refactor only if still green**

Keep cleanup limited to dialog helpers or column rendering extraction.

**Step 3: Re-run broader verification**

Run the same command again.

Expected: PASS.
