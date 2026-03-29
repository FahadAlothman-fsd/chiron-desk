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

## 2026-03-29 - Runtime guidance methodology-seeded future cards

- Decision: keep `streamCandidates(...)` test override behavior intact (`options.candidateSeeds` bypasses auto-discovery) while enabling methodology-derived future candidates in normal execution path.
- Decision: treat `fromStateId = null` transitions as future-card launch transitions and ignore non-start transitions for not-yet-created work units.
- Decision: provide Runtime Guidance runtime dependencies via API composition merge (`runtimeRepoLayer + lifecycleRepoLayer + projectContextRepoLayer`) so guidance can resolve methodology pins and lifecycle definitions at runtime.

## 2026-03-29 - Start-gate command evaluation source of truth

- Decision: remove the unsafe `as unknown` runtime-gate cast from `TransitionExecutionCommandService` and enforce typed `RuntimeGateService` calls for start/switch commands.
- Decision: derive start-gate condition trees from methodology lifecycle condition sets in the command service (via project pin + work-unit type + transition lookup) instead of trying to pass transition/workflow identifiers into gate evaluation.
- Decision: do not expand completion/choose command gate semantics in this hotfix; keep those paths behavior-compatible while fixing only the start-gate type mismatch bug.

## 2026-03-29 - Workflow runtime layer dependency declaration for lazy repositories

- Decision: declare `ProjectContextRepository` and `LifecycleRepository` in `WorkflowEngineRuntimeBaseLayer` via `Layer.service(...)` passthrough.
- Rationale: command methods in `TransitionExecutionCommandService` yield these repositories at execution time, so runtime handler context must include these tags even when the service layer itself is already built.
