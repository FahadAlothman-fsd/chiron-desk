## 2026-03-29 - Gate seam decision

- Decision: keep `RuntimeGateService` as the sole gate DI seam and remove transition-specific gate tags.
- Rationale: the plan’s shared-service boundary explicitly locks gate evaluation to one shared seam consumed by guidance and transition services.
- Implementation note: transition services now depend on `RuntimeGateService` token directly; no `TransitionRuntimeGateService` class remains.

## 2026-03-29 - Final verification wave composition decisions

- Decision: inject workflow-engine runtime services into API project-router composition by extending `createAppRouter(...)` with a dedicated runtime repository layer argument and providing `WorkflowEngineRuntimeLive` there.
- Decision: keep service logic untouched and only change composition/wiring path (`apps/server/src/index.ts` + `packages/api/src/routers/index.ts`) for runtime service availability.
- Decision: for package-scoped test reliability, use `bunx vitest run` in `packages/workflow-engine/package.json` and keep a package-local `vitest.config.ts`.

## 2026-03-29 - Runtime repo wiring completeness decision

- Decision: keep `WorkflowEngineRuntimeLive` as a single merged runtime layer (read + command services) and satisfy it by expanding runtime repo provisioning instead of splitting runtime layers per endpoint.
- Rationale: preserves one runtime composition seam while ensuring all merged runtime services have their repository dependencies satisfied at app bootstrap.
- Applied at composition boundary by adding `TransitionExecutionRepository` + `WorkflowExecutionRepository` to runtime repo layer requirements and server-provided runtime repo merge set.
