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
