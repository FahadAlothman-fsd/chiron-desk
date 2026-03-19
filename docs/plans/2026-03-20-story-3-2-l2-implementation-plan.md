# Story 3.2 L2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete Story 3.2 with a backend-first foundation, then deliver L2 tabs one-by-one in locked order with explicit behavior/UI freeze and per-tab commits.

**Architecture:** Build stable nested L2 APIs and service boundaries first (`methodology.version.workUnit.*`), then implement UI in vertical tab slices: Overview → Facts → Workflows → State Machine → Artifact Slots. At each tab, freeze behavior + look/UX before coding, validate, and commit before moving to the next tab.

**Tech Stack:** TypeScript, Bun, Drizzle ORM (SQLite), Effect, oRPC/Hono, TanStack Router, React, Vitest/Bun test.

---

## Scope and sequencing lock (authoritative)

1. **Backend foundation first** (required before tab implementation).
2. **Tab order is fixed**: Overview → Facts → Workflows → State Machine → Artifact Slots.
3. **One tab at a time**: no multi-tab implementation pass.
4. **Per-tab freeze gate** before coding UI:
   - behavior contract freeze,
   - visual/layout freeze,
   - interaction/UX freeze.
5. **Overview special rule:** start with simple ASCII wireframes before implementation.
6. **Commit per completed tab slice** after tests pass.

> Note: This plan intentionally includes already completed schema migration context and now locks the design-time work-unit fact table name as `work_unit_fact_definitions`.

---

## Already-completed baseline (do not redo)

- Lifecycle/condition-set table migration completed:
  - `work_unit_lifecycle_states`
  - `work_unit_lifecycle_transitions`
  - `transition_condition_sets`
- Transition `gateClass` removed from authoring storage/editing; derived from condition-set phase in authoring UI.
- Workflow I/O contract fields removed from active model surfaces.
- Docs and tests were aligned for the above migration.

Implementation in this plan continues from that baseline.

---

## Phase 0: Pre-implementation cleanup gate (must complete first)

### Task 0.1: Fact required-field deprecation (methodology + work-unit definitions)

**Files:**
- Modify: `packages/db/src/schema/methodology.ts`
- Modify: `packages/db/src/lifecycle-repository.ts`
- Modify: `packages/db/src/methodology-repository.ts`
- Modify: `packages/methodology-engine/src/repository.ts`
- Modify: `packages/methodology-engine/src/lifecycle-repository.ts`
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/api/src/routers/project.ts`
- Tests: db + scripts + API tests touched by fact shape

**Step 1: Write failing tests** for absence of `required` in persisted fact definitions/fact schemas.

**Step 2: Run failing tests and confirm expected failures.**

**Step 3: Implement minimal code changes to remove fact `required` from persistence/types/projections.**

**Step 4: Re-run tests and confirm pass.**

**Step 5: Commit cleanup slice.**

### Task 0.2: Seed scope alignment to pre-L2 baseline

**Files:**
- Modify: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
- Modify: `packages/scripts/src/seed/methodology/index.ts`
- Modify: `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`

**Step 1: Write failing tests** that enforce metadata-only baseline and forbid premature project-context lifecycle/workflow seeding.

**Step 2: Run failing tests and confirm expected failures.**

**Step 3: Implement metadata-only seed slice and align canonical table keys (`work_unit_fact_definitions`).**

**Step 4: Re-run tests and confirm pass.**

**Step 5: Commit cleanup slice.**

---

## Phase 1: Backend foundation (no tab UI implementation yet)

### Task 1: Finalize persistence and contracts for deferred Story 3.2 domains

**Files:**
- Modify: `packages/db/src/schema/methodology.ts`
- Modify: `packages/db/src/methodology-repository.ts`
- Create/Modify: `packages/contracts/src/methodology/artifact-slot.ts`
- Modify: `packages/contracts/src/methodology/fact.ts` (aligned with design-time work-unit fact table `work_unit_fact_definitions`)
- Modify: `packages/contracts/src/methodology/index.ts`
- Test: `packages/db/src/tests/repository/methodology-repository.integration.test.ts`

**Step 1: Write failing tests**
- Add/extend tests covering artifact slot/template persistence and renamed fact model expectations.

**Step 2: Run tests and confirm fail**
- `bun test "src/tests/repository/methodology-repository.integration.test.ts"` (cwd `packages/db`)

**Step 3: Implement minimal schema/repository/contracts changes**
- Keep frozen artifact-slot/template schema decisions.
- Lock work-unit fact persistence naming to `work_unit_fact_definitions` across schema/repository/contracts/API.

**Step 4: Re-run tests and confirm pass**

**Step 5: Commit**

---

### Task 2: Complete methodology-engine L2 services and layer wiring

**Files:**
- Create/Modify: `packages/methodology-engine/src/services/work-unit-fact-service.ts`
- Create/Modify: `packages/methodology-engine/src/services/work-unit-state-machine-service.ts`
- Create/Modify: `packages/methodology-engine/src/services/work-unit-artifact-slot-service.ts`
- Modify: `packages/methodology-engine/src/services/work-unit-service.ts`
- Modify: `packages/methodology-engine/src/layers/live.ts`
- Modify: `packages/methodology-engine/src/index.ts`
- Tests under: `packages/methodology-engine/src/tests/l2-l3/`

**Step 1: Write failing service tests**

**Step 2: Run tests and confirm fail**

**Step 3: Implement minimal service wiring**

**Step 4: Re-run tests and confirm pass**

**Step 5: Commit**

---

### Task 3: Complete nested API surface for L2 ownership

**Files:**
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write failing router tests** for:
- `methodology.version.workUnit.fact.*`
- `methodology.version.workUnit.workflow.*`
- `methodology.version.workUnit.stateMachine.*`
- `methodology.version.workUnit.artifactSlot.*`

**Step 2: Run tests and confirm fail**

**Step 3: Implement minimal nested procedures**

**Step 4: Re-run tests and confirm pass**

**Step 5: Commit**

---

## Phase 2: Tab-by-tab UI execution (strict order, lock each tab before code)

### Per-tab freeze protocol (must be applied before each tab implementation)

1. Freeze tab behavior contract (data shown, actions, warning/error semantics).
2. Freeze tab look/layout contract.
3. Freeze interaction contract (dialogs, expansion, routing, quick-fixes).
4. For **Overview only**, create simple ASCII wireframe first and approve it.
5. Implement tab.
6. Run tab tests + integration tests.
7. Commit.

### Task 4: Overview tab slice (first UI tab)

**Files:**
- Modify/Create: `apps/web/src/features/methodologies/work-unit-l2/OverviewTab.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Tests: `apps/web/src/tests/features/methodologies/*overview*`

**Step 1: Freeze behavior + produce ASCII wireframe**
- Include mini-graph, dependency summary, artifact slots summary, chips, quick actions.

**Step 2: Write failing tests from frozen wireframe/behavior**

**Step 3: Implement minimal Overview tab**

**Step 4: Run tests and confirm pass**

**Step 5: Commit**

---

### Task 5: Facts tab slice

**Files:**
- Modify/Create: `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx`
- Tests: `apps/web/src/tests/features/methodologies/*facts*`

**Step 1: Freeze behavior/look/UX for Facts tab** (table-first, dialog-first CRUD, no row expansion)

**Step 2: Write failing tests**

**Step 3: Implement minimal Facts tab against locked APIs**

**Step 4: Run tests and confirm pass**

**Step 5: Commit**

---

### Task 6: Workflows tab slice

**Files:**
- Modify/Create: `apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx`
- Tests: `apps/web/src/tests/features/methodologies/*workflows*`

**Step 1: Freeze behavior/look/UX for Workflows tab** (read-only bindings visibility, routing actions)

**Step 2: Write failing tests**

**Step 3: Implement minimal Workflows tab**

**Step 4: Run tests and confirm pass**

**Step 5: Commit**

---

### Task 7: State Machine tab slice

**Files:**
- Modify/Create: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`
- Create/Modify: transition details route/components under `apps/web/src/features/methodologies/transitions/`
- Tests: state + transition + transition-details tests

**Step 1: Freeze behavior/look/UX for State Machine**
- Inner tabs (States/Transitions), delete-state warn-not-block, unbound-transition warning + quick-fix, transition details tabs.

**Step 2: Write failing tests**

**Step 3: Implement minimal State Machine slice**

**Step 4: Run tests and confirm pass**

**Step 5: Commit**

---

### Task 8: Artifact Slots tab slice

**Files:**
- Modify/Create: `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx`
- Modify/Create: `apps/web/src/features/methodologies/work-unit-l2/components/SlotDetailsDialog.tsx`
- Tests: artifact-slot tab/dialog tests

**Step 1: Freeze behavior/look/UX for Artifact Slots**
- Slot-first table, templates managed inside Slot Details dialog, no separate templates page.

**Step 2: Write failing tests**

**Step 3: Implement minimal Artifact Slots tab**

**Step 4: Run tests and confirm pass**

**Step 5: Commit**

---

## Phase 3: End-to-end verification + story record updates

### Task 9: Full verification gate

**Step 1:** Run LSP diagnostics on modified files (zero errors required).

**Step 2:** Run targeted test suites:
- `packages/db`
- `packages/methodology-engine`
- `packages/api`
- `apps/web`

**Step 3:** Run workspace typecheck + build:
- `bun run check-types`
- `bun run build`

**Step 4:** Update Story 3.2 artifact record:
- `_bmad-output/implementation-artifacts/3-2-complete-work-unit-l2-tabs-overview-workflows-artifact-slots-facts-state-machine.md`

**Step 5:** Final commit for docs/evidence alignment.

---

## Verification commands (authoritative gate)

```bash
# DB
bun test "src/tests/repository/methodology-repository.integration.test.ts"

# Methodology engine
bun test "src/tests/l2-l3/*.test.ts"

# API
bun test "src/tests/routers/methodology.test.ts"

# Web
bun run test -- "src/tests/features/methodologies/*.test.tsx"
bun run test -- "src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units*.integration.test.tsx"

# Workspace
bun run check-types
bun run build
```

Expected result: zero failing tests, zero type errors, build success.

---

## Execution handoff

Plan complete and saved to `docs/plans/2026-03-20-story-3-2-l2-implementation-plan.md`. Two execution options:

1. **Subagent-Driven (this session)** - Dispatch fresh subagent per task, review between tasks, fast iteration.
2. **Parallel Session (separate)** - Open new session with `executing-plans`, batch execution with checkpoints.
