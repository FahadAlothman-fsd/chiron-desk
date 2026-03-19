# Story 2.7 Condition Set Authority Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `transition_condition_sets` the transition-check authority for Story 2.7 seed/runtime path and remove `transition_required_links` from transition gating semantics.

**Architecture:** Keep canonical ownership in methodology tables and repository/services. Represent transition gates using condition sets rows and derive runtime transition checks from those rows instead of required-links rows. Keep `transition_required_links` as non-authoritative migration-debt table (empty for this slice).

**Tech Stack:** TypeScript, Effect, Drizzle ORM, Bun, Vitest

---

### Task 1: Wire Lifecycle Repository To Condition Sets

**Files:**
- Modify: `packages/methodology-engine/src/lifecycle-repository.ts`
- Modify: `packages/db/src/lifecycle-repository.ts`

**Steps:**
1. Add transition condition set row type to lifecycle repository contracts.
2. Add repository query method for condition sets by version/transition.
3. Implement DB adapter query against `transition_condition_sets`.
4. Keep required-links method available only for migration/debt compatibility.

### Task 2: Switch Transition Checks To Condition Sets

**Files:**
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/methodology-engine/src/lifecycle-validation.ts`

**Steps:**
1. Update canonical lifecycle loading to include condition sets.
2. Update validation/check logic to read transition gate semantics from condition sets.
3. Ensure required-links no longer participates in transition gating decisions.

### Task 3: Validate Story 2.7 Seed + Runtime Evidence

**Files:**
- Modify (if needed): `packages/api/src/routers/methodology.test.ts`
- Modify (if needed): `packages/db/src/methodology-repository.integration.test.ts`

**Steps:**
1. Run story seeding command and verify canonical table rows exist for condition sets.
2. Run targeted tests and workspace checks.
3. Capture exact schema additions and Effect/repository handling details for user report.
