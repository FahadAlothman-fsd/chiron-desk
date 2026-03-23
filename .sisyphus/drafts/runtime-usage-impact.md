# Draft: Runtime Usage Impact

## Requirements (confirmed)
- Assess whether runtime usage of methodology design-time definitions changes the recommended architecture.
- Consider runtime consumers at project context, step runtime, transition runtime, and eligibility runtime.
- Account for cases where definitions must be visible even when no runtime instance exists yet.
- Decide whether the team can continue on the current architecture to finish remaining L2/L3 design-time pages and project runtime by March 31, instead of pausing for the larger separation refactor.
- Treat reverted schema renames in `packages/db/src/schema/methodology.ts` as the current baseline; do not assume the refactor plan is in flight.

## User Runtime Model
- Project context should surface all fact definitions, including facts without instances.
- Step runtime and MCP-driven updates need definition lookup and validation for facts, work units, and dependencies.
- Form steps need runtime option lists derived from methodology definitions.
- Transition runtime evaluates completion gate condition sets after workflow completion and records project-context events.
- Eligibility runtime evaluates start gates for transitions filtered by current work-unit state.

## Research Findings
- Direct repo search confirms runtime-facing contracts/resolvers exist in `packages/methodology-engine/src/contracts/runtime-resolvers.ts` and are exported from `packages/methodology-engine/src/index.ts`.
- `packages/methodology-engine/src/eligibility-service.ts` already consumes lifecycle definitions, condition sets, and transition workflow bindings at runtime.
- `packages/project-context/src/transition-condition-evaluator.ts` evaluates runtime condition sets and emits diagnostics based on methodology-derived inputs.
- `packages/methodology-engine/src/version-service.ts` and `packages/db/src/methodology-repository.ts` currently assemble definition snapshots that runtime services appear to depend on indirectly.
- `packages/api/src/routers/project.ts` is a major runtime composition point that combines methodology definition reads with runtime eligibility/status shaping.
- `packages/project-context/src/service.ts` currently imports `MethodologyRepository` directly for project pin/repin validation, which violates a clean runtime boundary.
- `packages/api/src/routers/methodology.ts` exposes multiple definition lookup endpoints via `getAuthoringSnapshot`, while only `getPublishedContractByVersionAndWorkUnitType` is shaped like a runtime read.
- Step/MCP exploration found runtime resolver contracts exist but are unimplemented, MCP integration is not yet real code, and form-step runtime resolution is still only documented, not implemented.

## Synthesis
- Runtime is a separate concern from authoring: it reads immutable published definitions plus mutable project state.
- The existing design-time service split should remain for draft CRUD and publishing.
- A separate published-runtime read boundary should be added in methodology-engine, backed by typed runtime resolvers/read models keyed by `methodologyVersionId`.
- Runtime consumers (project-context, eligibility, project router, future step/MCP runtime) should depend on that read boundary instead of `MethodologyRepository`, `LifecycleRepository`, `getAuthoringSnapshot`, or workspace snapshots.

## Deadline-Oriented Decision
- Continue on the current architecture for the March 31 push; do not stop now for the full design-time/runtime separation refactor.
- Current L2/L3 design-time work is mostly incremental on top of existing services/router/routes, not blocked by architecture.
- The main deferred risk is runtime coupling: `packages/project-context/src/service.ts` and `packages/api/src/routers/project.ts` currently read methodology data through authoring/repository seams.
- That risk is manageable through the deadline if runtime always reads the pinned published version and no new runtime code reaches into draft/workspace APIs.

## Minimum Guardrails If Separation Is Deferred
- Runtime code may read only the pinned published version; never `getAuthoringSnapshot` or workspace snapshots.
- Do not introduce new runtime dependencies on design-time mutation services; keep runtime reads behind a thin published-contract/resolver facade, even if initially backed by current methodology-engine services.
- Keep dependency direction one-way: `project-context` may consume read-only methodology contracts/resolvers, but methodology-engine must not depend on project-context.
- Defer table/service renames and big package splits until after delivery; prioritize finishing Artifact Slots, workflow editor, step CRUD, and project runtime behavior.

## Open Questions
- Should runtime consume the same authoring-oriented services, or should there be separate read-only runtime resolvers/read models per methodology/version/work-unit/workflow scope?
- Where should validation of MCP writes against definitions live: runtime resolver layer, project-context service, or step contract resolver?

## Current Delivery Decision Frame
- User's immediate priority is to finish remaining L2 work (transition dialog/condition saving and artifact slot tab/dialogs), then L3 workflow edit and step CRUD, then project runtime, all by March 31.
- The question is not whether the larger separation is cleaner; it is whether continuing on the current system will create a fatal trap before the deadline.

## Scope Boundaries
- INCLUDE: runtime read-model impact on methodology boundaries.
- EXCLUDE: implementation changes in this session.
