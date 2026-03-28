# F3: Real Manual QA

**Date:** 2026-03-29
**Plan:** `unified-l1-l2-runtime-slice`
**Status:** ❌ REJECTED

## Command Results

### 1) `bun run test | tee .sisyphus/evidence/f3-root-test.log`
- Exit code: **127**
- Result: **FAILED**
- Key output:
  - `@chiron/workflow-engine:test: /usr/bin/bash: line 1: vitest: command not found`
  - `Failed:    @chiron/workflow-engine#test`
- Evidence: `.sisyphus/evidence/f3-root-test.log`

### 2) `bun run test:layout:guardrail | tee .sisyphus/evidence/f3-layout.log`
- Exit code: **1**
- Result: **FAILED**
- Key output from shell transcript:
  - `❌ Test layout guardrail failed.`
  - `All app/package test files under src/ must live in src/tests/**.`
  - `Found violations:`
  - ` - packages/template-engine/src/index.test.ts`
- Evidence: `.sisyphus/evidence/f3-layout.log`
- Note: the command emitted failure text to stderr, so the tee log file is empty even though the command failed in-shell.

### 3) `bunx playwright test tests/e2e/runtime-*.spec.ts --reporter=line | tee .sisyphus/evidence/f3-playwright.log`
- Exit code: **0**
- Result: **NOT ACCEPTABLE FOR APPROVAL**
- Summary:
  - `Running 7 tests using 7 workers`
  - `7 skipped`
- Evidence: `.sisyphus/evidence/f3-playwright.log`

## Playwright / Manual QA Findings

- Runtime E2E did **not** pass; all 7 specs were skipped.
- I additionally attempted direct browser access to `http://localhost:3001/` and received `ERR_CONNECTION_REFUSED`.
- Because the web app was unreachable, live browser spot-checking of the runtime pages could not be completed.

## Locked-Scope Spot Check

Because live pages were unavailable, I performed a source/spec spot-check against the locked scope in `.sisyphus/plans/unified-l1-l2-runtime-slice.md`.

### Guidance
- `apps/web/src/routes/projects.$projectId.transitions.tsx` uses runtime active query + runtime guidance stream.
- `apps/web/src/components/runtime/runtime-guidance-sections.tsx` renders exactly two top-level sections: **Active** and **Open/Future**.
- Guidance still routes launches through start/switch flows and does **not** expose a completion action on this page.

### Work units / facts
- `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.state-machine.tsx` shows current state, active transition, and possible transitions only; no future-instantiation surface is present there.
- `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.facts.tsx` renders exactly two tabs: **Primitive** and **Work Units**, with **Outgoing** before **Incoming**.
- `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx` exposes add/set/replace controls only; no delete/clear strings were found.
- `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.facts.$factDefinitionId.tsx` exposes add/set/replace (including linked work-unit variants) only; no delete/clear strings were found.

### Artifacts
- `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.artifact-slots.$slotDefinitionId.tsx` renders **Current effective snapshot** before **Lineage history**.
- The same route wires **Check current slot state** only on detail and includes explicit unavailable messaging when project root/git context cannot be resolved.
- Zero-live-member handling is preserved with `No current effective artifact` while lineage remains visible.

### Transition / workflow detail
- `apps/web/src/routes/projects.$projectId.transition-executions.$transitionExecutionId.tsx` contains the locked section order: transition definition, current primary workflow, completion gate, primary attempt history, supporting workflows.
- Transition detail owns **Complete transition** and **Choose another primary workflow** actions.
- `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx` contains **Retry same workflow** and explicit **Steps coming later** messaging.
- No choose-different-workflow affordance was found on workflow detail.

### Active workflows shell scope
- `apps/web/src/routes/projects.$projectId.workflows.tsx` table headers are `Work Unit`, `Transition`, `Workflow Execution`, `Started At`; no status column is present.

## Verdict

**REJECT**

Reasons:
1. `bun run test` failed with exit code 127.
2. `bun run test:layout:guardrail` failed with exit code 1.
3. Playwright did not produce passing runtime verification; all specs were skipped because the app was unreachable.
4. Live manual runtime-page QA could not be completed due `ERR_CONNECTION_REFUSED` on the web app.

Approval is blocked until the root test suite passes, the layout guardrail violation is fixed, and runtime Playwright can execute against a reachable app with passing results.
