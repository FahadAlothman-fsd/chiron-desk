## 2026-03-29 - Workspace typecheck blocker observed during verification

- Command: `bun run check-types`
- Result: failed in `apps/server` with `TS2307: Cannot find module '@chiron/workflow-engine'` at `packages/api/src/routers/index.ts`.
- Scope assessment: failure appears to be broader workspace packaging/composition state and not introduced by this seam-only refactor (targeted runtime tests still pass).

## 2026-03-29 - Final verification wave blockers resolved

- `packages/workflow-engine` test script failed (`vitest: command not found`) when run in package scope.
  - Resolution: changed script to `bunx vitest run` and added package-local `vitest.config.ts`.
- API router import of `@chiron/workflow-engine` failed module resolution during server typecheck.
  - Resolution: switched to relative source import in `packages/api/src/routers/index.ts` and kept runtime layer wiring in the same composition site.

## 2026-03-29 - Runtime overview service-not-found incident

- Symptom: `project/getRuntimeOverview` returned `Service not found: RuntimeOverviewService`.
- Root cause: runtime layer bundle includes transition/workflow command services that require `TransitionExecutionRepository` + `WorkflowExecutionRepository`, but runtime repository provisioning in app composition omitted those repositories.
- Resolution: expanded runtime repo type contract in `createAppRouter(...)` and added both missing runtime repo layers in `apps/server/src/index.ts` runtime merge.

## 2026-03-29 - Workspace `bun test` still failing (pre-existing)

- Command: `bun test` (repo root)
- Result: fails across unrelated e2e/desktop/web suites (Playwright/Vitest environment and packaging-path issues), not in the touched workflow-engine command service file.
- Mitigation evidence for this fix: `bun run build` passes, `lsp_diagnostics` is clean on changed file, and targeted `packages/workflow-engine/src/tests/runtime/transition-execution-services.test.ts` passes.

## 2026-03-29 - Verification blocker during repository dependency fix

- Command: `bun test` (repo root)
- Result: fails with broad pre-existing suite/environment issues across e2e, desktop, and web tests (Playwright invocation context, browser/electron globals, jsdom/vitest API mismatch), unrelated to `packages/workflow-engine/src/layers/live.ts` change.
- Local evidence for changed scope: `bun run build` succeeded and `lsp_diagnostics` on `packages/workflow-engine/src/layers/live.ts` returned clean.

## 2026-04-17 - Dashboard runtime overview missing StepProgressionService

- Symptom: `POST /rpc/project/getRuntimeOverview` failed with `Service not found: @chiron/workflow-engine/services/StepProgressionService`.
- Root cause: `WorkflowEngineRuntimeLive` constructed workflow execution command/detail services without internally providing the step-core layer, so runtime overview queries pulled in a partially wired dependency graph.
- Resolution: provided workflow execution command/detail services from a combined `WorkflowEngineRuntimeBaseLayer + WorkflowEngineRuntimeStepCoreLayer` dependency layer and added `createBranchStepRuntimeRepoLayer(db)` to server runtime repo composition so the newly wired `StepProgressionServiceLive` could fully resolve.
