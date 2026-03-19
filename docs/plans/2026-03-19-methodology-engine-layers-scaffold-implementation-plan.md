# Methodology Engine Layered Scaffold Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild `@chiron/methodology-engine` around strict phased boundaries: L1 (version-level authoring only), L2 (work-unit domain), L3 (workflow internals), while removing `LifecycleService` from target architecture.

**Architecture:** L1 introduces explicit service and repository ports for version-owned concerns only (`versions`, methodology `facts`, `agents`, `dependency definitions`, and work-unit metadata). L2 and L3 are introduced as separate boundary services and ports without bleeding ownership into L1. Runtime-facing resolution remains read-only through resolver contracts and published projections.

**Tech Stack:** TypeScript, Effect (`Context.Tag`, `Layer`), oRPC/Hono routers, Bun, Vitest, Drizzle adapters.

## Execution Status (2026-03-19)

Status: **Implemented in current branch history** (merged via `74cbb68b5`, core refactor commit `8c0a93313`).

Completion highlights:
- L1 services are active and routed through boundary-first API handlers.
- Legacy/lifecycle compatibility seam was removed from active code paths.
- `packages/methodology-engine/src/lifecycle-service.ts` was deleted after migration.
- L2/L3 scaffold contracts were introduced and exported.
- Version CRUD and archive-not-delete behavior were re-verified after seam removal.

Verification snapshot:
- `packages/methodology-engine/src/tests/l1/l1-port-exports.characterization.test.ts` ✅
- `packages/methodology-engine/src/tests/l1/methodology-version-service.test.ts` ✅
- `packages/methodology-engine/src/tests/l1/l1-route-boundary.characterization.test.ts` ✅
- `packages/api/src/tests/routers/methodology.test.ts` ✅
- `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx` ✅
- `bunx turbo -F @chiron/api -F @chiron/methodology-engine -F web build` ✅

---

### Task 1: Baseline and Characterization Safety Net

**Files:**
- Modify: `packages/methodology-engine/src/tests/versioning/version-service.test.ts`
- Create: `packages/methodology-engine/src/tests/l1/l1-route-boundary.characterization.test.ts`

**Step 1: Write failing L1 ownership test**

```ts
it("L1 does not mutate workflow/state-machine internals", async () => {
  // call L1 route-level method (fact/agent/dependency/work-unit-metadata)
  // assert workflow internals are unchanged
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test packages/methodology-engine/src/tests/l1/l1-route-boundary.characterization.test.ts`
Expected: FAIL showing current aggregate mutation leakage.

**Step 3: Add failing test for L1 work-unit metadata-only semantics**

```ts
it("L1 work-unit update accepts metadata fields only", async () => {
  // attempt L1 update with internal workflow/state payload
  // expect validation failure or explicit rejection
});
```

**Step 4: Re-run characterization tests**

Run: `bun run test packages/methodology-engine/src/tests/l1/l1-route-boundary.characterization.test.ts`
Expected: FAIL with boundary violation evidence.

**Step 5: Commit characterization-only tests**

```bash
git add packages/methodology-engine/src/tests/l1/l1-route-boundary.characterization.test.ts packages/methodology-engine/src/tests/versioning/version-service.test.ts
git commit -m "test(methodology-engine): characterize L1 ownership boundaries"
```

---

### Task 2: Introduce Boundary Ports (No Behavior Move Yet)

**Files:**
- Create: `packages/methodology-engine/src/ports/version-repository.ts`
- Create: `packages/methodology-engine/src/ports/work-unit-repository.ts`
- Create: `packages/methodology-engine/src/ports/workflow-repository.ts`
- Create: `packages/methodology-engine/src/ports/projection-repository.ts`
- Create: `packages/methodology-engine/src/ports/methodology-tx.ts`
- Modify: `packages/methodology-engine/src/index.ts`

**Step 1: Write failing compile-time test for missing ports exports**

```ts
import { VersionRepository } from "@chiron/methodology-engine";
// should compile once ports are exported
```

**Step 2: Run typecheck to verify failure**

Run: `bun run typecheck`
Expected: FAIL on missing exported port tags.

**Step 3: Add Effect `Context.Tag` contracts for each port**

```ts
export class VersionRepository extends Context.Tag("VersionRepository")<
  VersionRepository,
  {
    readonly findVersionById: (...) => Effect.Effect<...>;
    readonly updateVersionMetadata: (...) => Effect.Effect<...>;
  }
>() {}
```

**Step 4: Export ports from package index**

Update `packages/methodology-engine/src/index.ts` to export all new `ports/*` contracts.

**Step 5: Re-run typecheck**

Run: `bun run typecheck`
Expected: PASS for new export surface.

**Step 6: Commit ports introduction**

```bash
git add packages/methodology-engine/src/ports packages/methodology-engine/src/index.ts
git commit -m "feat(methodology-engine): add layered repository port contracts"
```

---

### Task 3: Build L1 Services and Layers (Target Shape)

**Files:**
- Create: `packages/methodology-engine/src/services/methodology-version-service.ts`
- Create: `packages/methodology-engine/src/services/methodology-validation-service.ts`
- Create: `packages/methodology-engine/src/services/published-methodology-service.ts`
- Create: `packages/methodology-engine/src/layers/live.ts`
- Modify: `packages/methodology-engine/src/index.ts`
- Test: `packages/methodology-engine/src/tests/l1/methodology-version-service.test.ts`

**Step 1: Write failing service-level tests**

```ts
it("MethodologyVersionService handles L1 facts without workflow mutation", async () => {
  // arrange mock ports
  // act createFact
  // assert only L1 repos called
});
```

**Step 2: Run test to verify failure**

Run: `bun run test packages/methodology-engine/src/tests/l1/methodology-version-service.test.ts`
Expected: FAIL because service/layer does not exist.

**Step 3: Implement `MethodologyValidationService` contract + live layer**

```ts
export class MethodologyValidationService extends Context.Tag("MethodologyValidationService")<...>() {}
```

**Step 4: Implement `MethodologyVersionService` for L1-only methods**

Methods include only:
- version lifecycle + metadata,
- methodology facts/agents/dependency definitions,
- work-unit metadata-only create/update/delete.

**Step 5: Implement `PublishedMethodologyService` read/projection methods**

No mutation methods in this service.

**Step 6: Compose `Layer` wiring in `layers/live.ts`**

Provide all dependencies at composition root; avoid nested dynamic service pulls in routers.

**Step 7: Re-run service tests**

Run: `bun run test packages/methodology-engine/src/tests/l1/methodology-version-service.test.ts`
Expected: PASS.

**Step 8: Commit L1 services**

```bash
git add packages/methodology-engine/src/services packages/methodology-engine/src/layers/live.ts packages/methodology-engine/src/index.ts packages/methodology-engine/src/tests/l1/methodology-version-service.test.ts
git commit -m "feat(methodology-engine): introduce L1 version-boundary services"
```

---

### Task 4: API Router Rewiring for L1 Ownership

**Files:**
- Modify: `packages/api/src/routers/index.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write failing API tests for L1 route-to-service mapping**

```ts
it("version.fact.create delegates to MethodologyVersionService L1 method", async () => {
  // assert call path and payload shape
});
```

**Step 2: Run targeted API test for RED state**

Run: `bun run test packages/api/src/tests/routers/methodology.test.ts -t "L1 route mapping"`
Expected: FAIL showing old service path.

**Step 3: Replace legacy DI with new L1 layers**

In `packages/api/src/routers/index.ts`, wire:
- `MethodologyVersionServiceLive`
- `MethodologyValidationServiceLive`
- `PublishedMethodologyServiceLive`
and remove direct router dependency on `LifecycleService` for L1 mutations.

**Step 4: Update methodology routes to call new L1 methods**

L1 routes only:
- `version.*`
- `version.fact.*`
- `version.agent.*`
- `version.dependencyDefinition.*`
- `version.workUnit.*` (metadata only)

**Step 5: Re-run targeted API tests**

Run: `bun run test packages/api/src/tests/routers/methodology.test.ts -t "L1 route mapping"`
Expected: PASS.

**Step 6: Commit router rewiring**

```bash
git add packages/api/src/routers/index.ts packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "refactor(api): route L1 mutations through version-boundary services"
```

---

### Task 5: Legacy Lifecycle Seam Demotion and Guardrails

**Files:**
- Modify: `packages/methodology-engine/src/lifecycle-service.ts`
- Modify: `packages/methodology-engine/src/index.ts`
- Test: `packages/methodology-engine/src/tests/l1/lifecycle-compatibility.test.ts`

**Step 1: Write failing compatibility guard tests**

```ts
it("L1 mutations do not require LifecycleService", async () => {
  // ensure L1 path works without lifecycle adapter invocation
});
```

**Step 2: Run compatibility test for RED**

Run: `bun run test packages/methodology-engine/src/tests/l1/lifecycle-compatibility.test.ts`
Expected: FAIL if L1 still hard-depends on lifecycle service.

**Step 3: Demote lifecycle exports to compatibility-only**

Mark as transitional in exports/docs and remove it from primary L1 API router paths.

**Step 4: Re-run compatibility test**

Run: `bun run test packages/methodology-engine/src/tests/l1/lifecycle-compatibility.test.ts`
Expected: PASS.

**Step 5: Commit seam demotion**

```bash
git add packages/methodology-engine/src/lifecycle-service.ts packages/methodology-engine/src/index.ts packages/methodology-engine/src/tests/l1/lifecycle-compatibility.test.ts
git commit -m "refactor(methodology-engine): demote lifecycle service to compatibility seam"

> Final implemented state superseded this step by fully removing the lifecycle seam from active code paths and deleting `lifecycle-service.ts`.
```

---

### Task 6: L2/L3 Scaffolds (Interfaces Only, No Ownership Move Yet)

**Files:**
- Create: `packages/methodology-engine/src/services/work-unit-service.ts`
- Create: `packages/methodology-engine/src/services/workflow-service.ts`
- Create: `packages/methodology-engine/src/contracts/runtime-resolvers.ts`
- Modify: `packages/methodology-engine/src/index.ts`
- Test: `packages/methodology-engine/src/tests/l2-l3/scaffold-contracts.test.ts`

**Step 1: Write failing scaffold contract tests**

```ts
it("exports WorkUnitService and WorkflowService contracts", () => {
  // import assertions
});
```

**Step 2: Run tests to verify RED**

Run: `bun run test packages/methodology-engine/src/tests/l2-l3/scaffold-contracts.test.ts`
Expected: FAIL for missing interfaces/exports.

**Step 3: Add service contracts only (no live behavior move)**

Define `Context.Tag` interfaces for:
- `WorkUnitService`
- `WorkflowService`
- runtime resolvers:
  - `MethodologyRuntimeResolver`
  - `WorkUnitRuntimeResolver`
  - `WorkflowRuntimeResolver`
  - `StepContractResolver`

**Step 4: Export scaffold contracts**

Update `index.ts` exports.

**Step 5: Re-run scaffold tests**

Run: `bun run test packages/methodology-engine/src/tests/l2-l3/scaffold-contracts.test.ts`
Expected: PASS.

**Step 6: Commit scaffold contracts**

```bash
git add packages/methodology-engine/src/services/work-unit-service.ts packages/methodology-engine/src/services/workflow-service.ts packages/methodology-engine/src/contracts/runtime-resolvers.ts packages/methodology-engine/src/index.ts packages/methodology-engine/src/tests/l2-l3/scaffold-contracts.test.ts
git commit -m "feat(methodology-engine): scaffold L2/L3 boundary contracts"
```

---

### Task 7: Verification Gate

**Files:**
- Modify: `docs/plans/2026-03-19-methodology-engine-layers-scaffold-implementation-plan.md` (checklist section)

**Step 1: Run diagnostics on touched files**

Run LSP diagnostics for all modified files; expect zero errors.

**Step 2: Run targeted tests**

Run:
- `bun run test packages/methodology-engine/src/tests/l1/*.test.ts`
- `bun run test packages/methodology-engine/src/tests/l2-l3/*.test.ts`
- `bun run test packages/api/src/tests/routers/methodology.test.ts -t "L1 route mapping"`

Expected: PASS.

**Step 3: Run typecheck and build**

Run:
- `bun run typecheck`
- `bun run build`

Expected: project-level success or explicitly documented pre-existing failures outside touched scope.

**Step 4: Commit verification checklist updates**

```bash
git add docs/plans/2026-03-19-methodology-engine-layers-scaffold-implementation-plan.md
git commit -m "docs(plan): add verification gate for layered scaffold rollout"
```
