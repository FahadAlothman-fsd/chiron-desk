# Story 3-2 Design-Time Closure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close Story 3-2 by fully wiring design-time frontend CRUD across methodology version L1 and work-unit L2 tabs, using the current backend contracts (including metadata-only workflow CRUD at L2).

**Architecture:** Keep backend route shapes intact and complete the missing frontend integrations. L1 pages (facts, agents, dependency definitions, work units) must be fully operable from UI. L2 work-unit tabs (overview, facts, workflows, state machine, artifact slots) must have concrete components with read/write flows wired to existing oRPC procedures. Treat workflows at L2 as metadata-only (no steps/edges editing in this story). Keep UI intentionally simple/readable and align with Story 3-2 artifact: transition details are page-routed, and artifact-slot templates are managed as a nested table inside Slot Details dialogs.

**Tech Stack:** React, TanStack Router, TanStack Query, oRPC client, Bun, Vitest, TypeScript.

---

### Task 1: Add RED Integration Coverage for Missing L2/L1 Wiring

**Files:**
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`
- Reference: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`

**Step 1: Write failing tests for missing tabs/actions**

Add tests for:
- Workflows tab performs list/create/update/delete using `version.workUnit.workflow.*`.
- State Machine tab performs list/update for states/transitions/condition sets.
- Artifact Slots tab performs list/replace.
- Work Units list page exposes delete action and calls `version.workUnit.delete`.
- Keymap behavior: global tab hotkeys `1..5` switch tab order `Overview -> Facts -> Workflows -> State Machine -> Artifact Slots`, and tab-local hotkeys still work.
- Facts dependency representation: dependency type appears in validation/badge treatment (not as a separate table column).
- Facts model cleanup guard: do not use or display any `required` field/semantics for facts anywhere in L1/L2 UI.

**Step 2: Run targeted RED command**

Run: `bun run --cwd apps/web vitest run src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "Workflows|State Machine|Artifact Slots|delete"`

Expected: FAIL (missing UI wiring/handlers).

**Step 3: Commit failing tests**

```bash
git add apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx
git commit -m "test(web): codify missing L2 tab and work-unit delete wiring"
```

---

### Task 2: Implement L2 Workflows Tab (Metadata-Only)

**Files:**
- Create: `apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Reference: `packages/api/src/routers/methodology.ts` (workflow metadata-only schema)

**Step 1: Build workflows tab component**

Implement:
- list workflows
- create workflow metadata
- update workflow metadata
- delete workflow metadata
- row-level `Open Workflow Editor` link/button that routes to a mock editor path for Story 3-3 follow-up
- read-only bound-transition visibility per row (count/badges)

Do **not** expose/edit `steps` or `edges` in this tab.

**Step 2: Wire mutations/queries in work-unit detail route**

Use:
- `orpc.methodology.version.workUnit.workflow.list`
- `orpc.methodology.version.workUnit.workflow.create`
- `orpc.methodology.version.workUnit.workflow.update`
- `orpc.methodology.version.workUnit.workflow.delete`

and invalidate `version.workUnit.get` query after writes.

Mock editor route target for this story: `/methodologies/$methodologyId/versions/$versionId/work-units/$workUnitKey/workflows/$workflowKey/editor` (page can be a placeholder shell).

**Step 3: Run targeted GREEN tests**

Run: `bun run --cwd apps/web vitest run src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "Workflows"`

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx
git commit -m "feat(web): wire L2 workflow metadata CRUD tab"
```

---

### Task 3: Implement L2 State Machine Tab

**Files:**
- Create: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Reference: `packages/api/src/routers/methodology.ts` transition-scoped namespace

**Step 1: Build state machine tab component**

Implement UI handlers for:
- `version.workUnit.stateMachine.state.list`
- `version.workUnit.stateMachine.state.update`
- `version.workUnit.stateMachine.transition.list`
- `version.workUnit.stateMachine.transition.update`
- `version.workUnit.stateMachine.transition.conditionSet.list`
- `version.workUnit.stateMachine.transition.conditionSet.update`

Keep bindings under transition scope only.

State Machine UX must stay simple and list-first. Transition row `Details` action should route to transition details page (no complex inline editor).

**Step 2: Wire mutation/read flows and invalidation**

Invalidate work-unit snapshot query after each state-machine mutation.

**Step 3: Run targeted GREEN tests**

Run: `bun run --cwd apps/web vitest run src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "State Machine|condition set|binding"`

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx
git commit -m "feat(web): wire L2 state-machine tab with transition-scoped edits"
```

---

### Task 4: Implement L2 Artifact Slots Tab

**Files:**
- Create: `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Reference: `packages/api/src/routers/methodology.ts` artifact slot routes

**Step 1: Build artifact slots tab component**

Implement read/replace flows using:
- `version.workUnit.artifactSlot.list`
- `version.workUnit.artifactSlot.replace`

Implement Story 3-2 nested dialog pattern (not a separate templates page):
- Slot table/list surface for overview and selection.
- Slot Details dialog with stacked sections/tabs: Basics, Rules JSON, Templates.
- Basics must expose definition-time metadata including cardinality and slot identity fields.
- Rules JSON section must render/edit the rules JSON payload as definition-time configuration.
- Templates managed as nested table inside Slot Details dialog with add/edit/remove actions.
- Do not introduce any occupied/occupancy concepts in this story; artifact slots are design-time definitions only.

**Step 2: Wire route tab rendering + mutation integration**

**Step 3: Run targeted GREEN tests**

Run: `bun run --cwd apps/web vitest run src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "Artifact Slots"`

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx
git commit -m "feat(web): wire L2 artifact-slot tab"
```

---

### Task 5: Add L1 Work Unit Delete Action

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- Modify: `apps/web/src/features/methodologies/work-units-list-view.tsx` (if needed for action slot)
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

**Step 1: Add delete CTA + confirmation UX**

Wire mutation:
- `orpc.methodology.version.workUnit.delete`

**Step 2: Invalidate relevant queries and preserve selection behavior**

**Step 3: Run targeted GREEN tests**

Run: `bun run --cwd apps/web vitest run src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "work unit delete"`

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx apps/web/src/features/methodologies/work-units-list-view.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx
git commit -m "feat(web): add L1 work-unit delete wiring"
```

---

### Task 6: Story 3-2 Docs Closure and Acceptance Snapshot

**Files:**
- Modify: `docs/plans/2026-03-20-story-3-3-layer-ownership-transition-bindings-plan.md` (status notes only)
- Modify: `docs/plans/2026-03-20-no-bulk-authoring-crud-migration-plan.md` (status notes only)
- Modify: `_bmad-output/**` relevant Story 3-2 implementation artifact(s)

**Step 1: Record implemented frontend wiring status**

Document:
- L1 CRUD pages complete
- L2 tabs complete
- L2 workflows metadata-only by design (steps/edges deferred to L3)

**Step 2: Run docs scan for stale flat namespaces**

Run:
`rg -n "stateMachine\.binding|stateMachine\.conditionSet|workUnit\.workflow" docs _bmad-output`

Expected: transition-scoped naming retained; no stale flat namespace references where migration was completed.

**Step 3: Commit**

```bash
git add docs _bmad-output
git commit -m "docs(story-3.2): record design-time frontend closure status"
```

---

### Task 7: Full Verification Gate (Required Before Declaring Story 3-2 Done)

**Files:**
- Verify all touched frontend/backend/docs files

**Step 1: Frontend tests**

Run:
- `bun run --cwd apps/web vitest run src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`
- `bun run --cwd apps/web vitest run src/tests/features/methodologies`

Expected: PASS.

**Step 2: API and engine regression tests**

Run:
- `bun run --cwd packages/api vitest run src/tests/routers/methodology.test.ts`
- `bun run --cwd packages/methodology-engine vitest run`

Expected: PASS.

**Step 3: LSP diagnostics on all edited TS/TSX files**

Expected: zero errors.

**Step 4: Story guard scans**

Run:
```bash
rg -n "getDraftProjection|MethodologyVersionProjection|ProjectionRepository|projection-repository" packages/methodology-engine/src
rg -n "getDraftProjection|MethodologyVersionProjection|ProjectionRepository|draft projection|projection-repository" docs _bmad-output
```

Expected: no matches.

**Step 5: Final closure commit**

```bash
git add -A
git commit -m "feat(web): close Story 3-2 design-time frontend CRUD wiring"
```

---

## Finalized Tab Design Acceptance Checklist

Use this checklist as the UX/design contract while implementing Tasks 1-5.

### Overview Tab

**Visible content**
- Work-unit summary only: name, key, description, and a small count/metadata summary.

**Allowed actions**
- Top-level actions such as `Edit metadata` and `Delete work unit` via L1-style dialogs/confirm flows.

**Must not include**
- No inline editable grid.
- No inline form fields in the tab body.

### Facts Tab

**Visible content**
- Read-oriented list of fact definitions for the work unit.
- Human-meaningful fields: name/key, type, defaults, and dependency-treatment semantics shown as badges/treatment.

**Allowed actions**
- `Add fact`, row `Edit`, row `Delete` through L1-style dialogs.

**Must not include**
- No table-cell editing.
- No `required` field/flag/semantics anywhere in UI, validation copy, or interaction flow.

### Workflows Tab

**Visible content**
- Metadata-only workflow list (for example key/display name + lightweight metadata).

**Allowed actions**
- Row `Edit metadata`, `Delete`, and `Open editor` deep-link to mock Story 3-3 editor route.

**Must not include**
- No steps/edges editing.
- No graph canvas/editor.
- No inline editing.

### State Machine Tab

**Visible content**
- Read-first grouping of states and transitions.
- Transition rows must include transition-scoped condition sets and bindings.

**Allowed actions**
- Dialog-driven actions for add/edit/delete state.
- Dialog-driven actions for add/edit/delete transition.
- Dialog-driven edit for condition sets and bindings.

**Must not include**
- No graph editor.
- No inline editable transition table.

### Artifact Slots Tab

**Visible content**
- Definition-time slot list and slot details.
- Slot details must include cardinality, rules JSON, and template set.

**Allowed actions**
- L1-pattern nested dialog flow for slot operations.
- Templates managed inside Slot Details dialog (nested table/actions).

**Must not include**
- No occupied/occupancy concept.
- No runtime occupancy wording or status.
- No separate templates page.

### Cross-Tab UX Rules

**Visible behavior**
- Tabs act as navigation + overview containers.

**Allowed interactions**
- Editing happens in dialogs/drawers matching existing L1 patterns.
- Keep and extend existing TanStack hotkeys so `1..5` consistently switch tabs.

**Must not include**
- No one-off hotkey behavior that conflicts with existing Overview/page hotkeys.

---

## Notes for Implementer

- Keep L2 workflow UI metadata-only in Story 3-2: `key`, `displayName`, optional metadata/guidance only.
- Do not introduce step/edge editing UX in this story; reserve that for L3 step-oriented services.
- Keep transition operations transition-scoped (`transition.binding.*`, `transition.conditionSet.*`).
- Facts dependency type is rendered as part of validation/dependency badge treatment; do not add a dedicated dependency column just for this field.
- Facts `required` semantics were removed; do not display, derive, or validate any required flag in facts UI.
- Preserve keymap UX: reuse existing TanStack hotkey implementation from Overview and extend it consistently across all tabs with stable tab hotkeys `1..5`, while keeping existing tab-local productivity hotkeys.
- Provide a workflow-editor deep-link per workflow row to a mock route/page for Story 3-3.
- Artifact slots are definition-time only in this story: model/show cardinality + rules JSON + template set, with templates nested inside Slot Details dialog; no separate templates page.
- Prefer small commits per tab/domain so regressions are isolated and revertable.
