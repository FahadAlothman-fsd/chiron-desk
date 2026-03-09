# Chiron Test Framework Readiness Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preserve the current Chiron testing decisions so `testarch-framework` can be rerun later without losing the agreed direction or creating churn during Story 2.7 and the upcoming Electron migration.

**Architecture:** Defer framework scaffolding until Story 2.7 is complete and the Electron direction is clearer. In the meantime, capture a stable testing contract: Effect-native backend/module testing on Vitest, Playwright as the long-term automation framework, story-driven validation journeys, and a code-review gate that runs deterministic automation before agentic validation.

**Tech Stack:** TypeScript, Vitest, Effect, `@effect/vitest` (planned), Playwright (planned), Bun, Turborepo, BMAD/TEA workflows

---

### Task 1: Preserve the agreed framework direction

**Files:**
- Create: `docs/plans/2026-03-09-chiron-test-framework-readiness-plan.md`
- Reference: `_bmad/tea/workflows/testarch/framework/workflow.yaml`
- Reference: `_bmad/tea/workflows/testarch/framework/instructions.md`
- Reference: `_bmad/tea/config.yaml`

**Steps:**
1. Record that `testarch-framework` is intentionally deferred because it would generate framework files now.
2. Record that Playwright remains the preferred long-term test framework for Chiron.
3. Record that no framework scaffolding should be generated until Story 2.7 is complete and Electron migration constraints are clearer.
4. Record that the next execution of `testarch-framework` must use this document as the decision baseline.

### Task 2: Preserve the backend and module testing standard

**Files:**
- Reference: `packages/api/vitest.config.ts`
- Reference: `packages/methodology-engine/vitest.config.ts`
- Reference: `packages/contracts/vitest.config.ts`
- Reference: `packages/scripts/vitest.config.ts`
- Reference: `packages/db/src/methodology-repository.integration.test.ts`

**Steps:**
1. Record that backend/module packages should standardize on Vitest plus `@effect/vitest` for Effectful tests.
2. Record that existing `Effect.runPromise(...)`-heavy tests should migrate over time toward `it.effect`, `it.scoped`, and `TestClock` patterns.
3. Record that DB integration tests can remain on `bun:test` temporarily until runner convergence is worth the churn.
4. Record that UI tests should not be pulled into this backend-oriented migration.

### Task 3: Preserve the story-driven validation journey model

**Files:**
- Reference: `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/steps/step-02-design-epics.md`
- Reference: `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/steps/step-03-create-stories.md`
- Reference: `_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Reference: `_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`

**Steps:**
1. Record that validation journeys are living artifacts refined at epic creation, story creation, story implementation, and code review.
2. Record that journey details should live in story artifacts or story context, not in forked BMAD core workflow files.
3. Record that stories should carry four practical sections when relevant: deterministic gates, agentic journey, edge cases discovered, and evidence.
4. Record that implementation work may refine the journey as real edge cases emerge.

### Task 4: Preserve the review-stage gate policy

**Files:**
- Reference: `_bmad/bmm/workflows/4-implementation/code-review/instructions.xml`
- Reference: `_bmad/bmm/workflows/4-implementation/code-review/checklist.md`
- Reference: `_bmad/tea/workflows/testarch/test-review/workflow.yaml`

**Steps:**
1. Record that heavy validation belongs in code review, not dev-story, to avoid bloating the implementation agent.
2. Record the required sequence: implementation/doc validation, deterministic automated tests, scripted Playwright E2E, then agentic validation only if all deterministic stages pass.
3. Record that failed deterministic automation is a hard stop and prevents agentic validation from running.
4. Record that the future integration point is process-level first and CI-level second.

### Task 5: Preserve the future-state rollout plan

**Files:**
- Reference: `_bmad/tea/workflows/testarch/ci/workflow.yaml`
- Reference: `_bmad/tea/workflows/testarch/ci/github-actions-template.yaml`
- Reference: `package.json`

**Steps:**
1. Record that the near-term phase is story-level/process-level governance rather than full CI enforcement.
2. Record that the later stable-state model should be PR-blocking deterministic smoke suites plus nightly broader regression.
3. Record that agentic validation should remain an additional post-green validation layer, not a replacement for deterministic suites.
4. Record that Electron-specific E2E decisions should be finalized before generating long-lived Playwright scaffolding.

### Task 6: Define the trigger to rerun `testarch-framework`

**Files:**
- Reference: `docs/plans/2026-03-09-chiron-test-framework-readiness-plan.md`
- Reference: `_bmad/tea/workflows/testarch/framework/workflow.yaml`

**Steps:**
1. Finish Story 2.7 or reach a safe pause where framework churn will not disrupt active implementation.
2. Clarify Electron migration scope enough to know whether Playwright setup should target web-only first or web-plus-Electron.
3. Reopen this readiness plan and confirm the preserved decisions still hold.
4. Only then rerun `testarch-framework` and allow file generation/scaffolding.
