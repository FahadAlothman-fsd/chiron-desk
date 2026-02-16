# Workflow Engine Migration Status

> **Last reviewed:** 2026-02-08
> **Overall status:** ~90% complete — core package built, API wiring in progress

This file tracks progress for the workflow-engine migration to `@chiron/workflow-engine` and Effect-first schemas.

## Done

- Step contracts documented:
  - form: `docs/architecture/workflow-engine/form-step-contract.md`
  - action: `docs/architecture/workflow-engine/action-step-contract.md`
  - invoke: `docs/architecture/workflow-engine/invoke-step-contract.md`
  - branch: `docs/architecture/workflow-engine/branch-step-contract.md`
  - display: `docs/architecture/workflow-engine/display-step-contract.md`
  - agent: `docs/architecture/workflow-engine/agent-step-contract.md`
- Effectful design guidance: `docs/architecture/workflow-engine/effectful-design.md`
- Workflow paths guidance: `docs/architecture/workflow-engine/workflow-paths.md`
- Effect-first schemas added in `packages/workflow-engine/src/schema/`:
  - form, action, invoke, branch, display, agent
  - workflow union: `packages/workflow-engine/src/schema/workflow.ts`
- Schema exports: `packages/workflow-engine/src/schema/index.ts`
- Module exports: `packages/workflow-engine/src/index.ts`
- Minimal service contracts:
  - `packages/workflow-engine/src/services/step-handler.ts`
  - `packages/workflow-engine/src/services/step-registry.ts`
- Core Effect services added:
  - `packages/workflow-engine/src/services/execution-context.ts`
  - `packages/workflow-engine/src/services/event-bus.ts`
  - `packages/workflow-engine/src/services/variable-service.ts`
  - `packages/workflow-engine/src/services/workflow-engine.ts`
- Initial handlers added:
  - `packages/workflow-engine/src/handlers/form-handler.ts`
  - `packages/workflow-engine/src/handlers/branch-handler.ts`
  - `packages/workflow-engine/src/handlers/display-handler.ts`
- Effect-native handlers added:
  - `packages/workflow-engine/src/handlers/action-handler.ts`
  - `packages/workflow-engine/src/handlers/agent-handler.ts`
  - `packages/workflow-engine/src/handlers/invoke-handler.ts`
- Decode boundary service added: `packages/workflow-engine/src/services/decode.ts`
- Approval and invoke support services added:
  - `packages/workflow-engine/src/services/approval-gateway.ts`
  - `packages/workflow-engine/src/services/workflow-invoker.ts`
- Package build passes: `bun run build` in `packages/workflow-engine`
- Source tests pass: `bun test src` in `packages/workflow-engine` (16 passing)
- Module-isolated tests added/updated:
  - `packages/workflow-engine/src/services/decode.test.ts`
  - `packages/workflow-engine/src/services/approval-gateway.test.ts`
  - `packages/workflow-engine/src/handlers/invoke-handler.test.ts`
  - `packages/workflow-engine/src/handlers/branch-handler.test.ts`
- Workflow-engine integration tests added:
  - `packages/workflow-engine/src/services/workflow-engine.test.ts`
    - `execute -> requiresUserInput -> continue`
    - `submitApproval` emits `ApprovalResolved` and clears pending request
- Child invocation now uses an executable service contract (no synthetic placeholder IDs):
  - `packages/workflow-engine/src/services/workflow-invoker.ts`
  - `packages/workflow-engine/src/services/live.ts`
- Deterministic non-variable actions added to `ActionServiceLive`:
  - `env:get`, `file:template`, `directory:join`, `artifact:record`, `snapshot:capture`, `git:ref`
  - extended variable operations: `delete`, `append`, `increment`
  - file: `packages/workflow-engine/src/services/action-service.ts`
- Additional migration tests added:
  - `packages/workflow-engine/src/services/workflow-invoker.test.ts`
  - `packages/workflow-engine/src/services/action-service.test.ts`
- API decode boundary wiring added on execute/continue paths:
  - `packages/api/src/services/workflow-engine/effect/decode-boundary.ts`
  - `packages/api/src/services/workflow-engine/effect/executor.ts`
- API runtime composition adapter added for new module runtime + child invocation bridge:
  - `packages/api/src/services/workflow-engine/effect/runtime-composition.ts`
- API decode boundary tests added:
  - `packages/api/src/services/workflow-engine/effect/decode-boundary.test.ts`

## In Progress

- Switch workflow API router execution endpoints from legacy executor flow to runtime composition adapter (`runtime-composition.ts`)
- Add workflow-engine integration tests for malformed persisted state + decode boundary failure in continue path
- Replace API package relative imports with stable workspace package import once workspace dependency resolution is fixed (`handlebars@catalog` install issue)

## Next

- Add API integration path for child workflow invocation via `WorkflowEngineRuntimeForApiLive` and validate parent/child variable propagation
- Remove/deprecate legacy workflow-engine paths in `packages/api` after API composition migrates
