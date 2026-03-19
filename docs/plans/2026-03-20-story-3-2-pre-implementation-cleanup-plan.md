# Story 3.2 Pre-Implementation Cleanup Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare the codebase for full Story 3.2 implementation by removing deprecated fact `required` persistence/usage, aligning seed scope to pre-L2 reality, and locking canonical naming.

**Architecture:** Execute a strict cleanup gate before feature work: first deprecate/remove fact `required` from methodology/work-unit design-time tables and dependent projections, then simplify canonical seeds to metadata-only baseline (no premature project-context lifecycle/workflow seeding), then verify green before entering Story 3.2 implementation slices.

**Tech Stack:** TypeScript, Bun, Drizzle ORM (SQLite), Effect, oRPC/Hono, Vitest.

---

### Task 1: Remove fact `required` from DB schemas and repositories

**Files:**
- Modify: `packages/db/src/schema/methodology.ts`
- Modify: `packages/db/src/lifecycle-repository.ts`
- Modify: `packages/db/src/methodology-repository.ts`
- Test: `packages/db/src/tests/repository/lifecycle-repository.integration.test.ts`
- Test: `packages/db/src/tests/repository/methodology-repository.integration.test.ts`

**Step 1: Write failing tests**
- Add fixture/assertion coverage that does not include fact `required` columns/fields.

**Step 2: Run tests to verify fail**
- `bun test "src/tests/repository/lifecycle-repository.integration.test.ts"`
- `bun test "src/tests/repository/methodology-repository.integration.test.ts"`

**Step 3: Write minimal implementation**
- Remove fact `required` columns from both design-time fact tables and remove repository read/write mapping of `required`.

**Step 4: Run tests to verify pass**

**Step 5: Commit**

---

### Task 2: Remove deprecated fact `required` typing and projection logic in engine/API

**Files:**
- Modify: `packages/methodology-engine/src/repository.ts`
- Modify: `packages/methodology-engine/src/lifecycle-repository.ts`
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/api/src/routers/project.ts`

**Step 1: Write failing tests**
- Add/adjust tests expecting no fact `required` projection fields and no blocking logic based on deprecated flag.

**Step 2: Run tests to verify fail**
- `bun test "src/tests/routers/methodology.test.ts"` (API)
- Run relevant methodology-engine tests covering lifecycle/version projections.

**Step 3: Write minimal implementation**
- Remove fact `required` fields from row types and projection mappings.
- Remove project-router missing-fact blocking branch that depends on deprecated `required` flag.

**Step 4: Run tests to verify pass**

**Step 5: Commit**

---

### Task 3: Align methodology seed to pre-L2 baseline and canonical names

**Files:**
- Modify: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
- Modify: `packages/scripts/src/seed/methodology/index.ts`
- Modify: `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`

**Step 1: Write failing test updates**
- Enforce metadata-only baseline seed slice and canonical table key `work_unit_fact_definitions`.

**Step 2: Run tests to verify fail**
- `bun test "src/tests/seeding/methodology-seed-integrity.test.ts"`

**Step 3: Write minimal implementation**
- Remove premature project-context lifecycle/workflow/fact-schema seeding.
- Keep seed scope limited to current baseline metadata.

**Step 4: Run tests to verify pass**

**Step 5: Commit**

---

### Task 4: Planning and story-artifact alignment

**Files:**
- Modify: `docs/plans/2026-03-20-story-3-2-l2-implementation-plan.md`
- Modify: `_bmad-output/implementation-artifacts/3-2-complete-work-unit-l2-tabs-overview-workflows-artifact-slots-facts-state-machine.md`

**Step 1: Add cleanup gate references**
- Ensure Story 3.2 implementation sequence explicitly starts with this pre-implementation cleanup gate.

**Step 2: Verify links and naming locks**
- Confirm references to `work_unit_fact_definitions` and this cleanup plan are present and consistent.

---

### Task 5: Verification gate before Story 3.2 implementation

**Step 1: Diagnostics**
- Run `lsp_diagnostics` on all modified TypeScript files; zero errors required.

**Step 2: Targeted tests**
- DB repository integration tests
- Scripts seed integrity tests
- API router tests touched by projection changes
- Relevant methodology-engine tests for lifecycle/version projections

**Step 3: Workspace checks**
- `bun run check-types`
- `bun run build`

**Step 4: Record evidence**
- Capture command outputs and update Story 3.2 artifact checkboxes.

---

## Execution handoff

Plan complete and saved to `docs/plans/2026-03-20-story-3-2-pre-implementation-cleanup-plan.md`. Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration.
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints.
