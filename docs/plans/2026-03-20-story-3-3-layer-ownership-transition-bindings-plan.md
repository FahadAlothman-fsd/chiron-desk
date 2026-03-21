# Story 3-3 Layer Ownership and Transition-Scoped Bindings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align methodology engine/service layering so transition bindings and transition condition sets are transition-scoped under state machine ownership, workflow details stay workflow-owned, and workspace query composition stays boundary-owned without cross-domain service coupling.

**Architecture:** Keep `WorkUnitStateMachineService` and `WorkflowService` as separate domain seams. Store and manipulate binding references and condition sets under transition scope (`transitionKey` required), while workflow definitions/steps are resolved by workflow queries keyed by version + work unit + workflow key. Preserve API compatibility where needed and migrate nested routing to explicit transition-scoped semantics.

**Tech Stack:** Bun, TypeScript, Effect (`Context.Tag`, `Layer.effect`), oRPC + Zod, Vitest, ripgrep.

## Status Note (2026-03-21)

- Story 3-2 design-time closure is complete on the web L2 surface and is now treated as the baseline input for Story 3-3.
- Locked UX constraints now enforced in Story 3-2 UI: facts have no `required` semantics, workflows are metadata-only at L2 with row-level `Open Workflow Editor` deep-link, artifact slots are definition-time only with templates nested in Slot Details.
- Keyboard navigation is normalized to shared TanStack hotkeys with stable `1..5` tab switching and preserved tab-local actions.
- Story 3-3 continues from this closure state and should not re-introduce steps/edges editing into Story 3-2 surfaces.

---

### Task 1: Lock Target Transition-Scoped Route and Ownership Contract (RED)

**Files:**
- Modify: `packages/api/src/tests/routers/methodology.test.ts`
- Reference: `packages/api/src/routers/methodology.ts`

**Step 1: Write failing tests for transition-scoped binding and condition-set route shape**

Add/adjust tests asserting nested route contract is transition-scoped:
- `version.workUnit.stateMachine.transition.binding.list`
- `version.workUnit.stateMachine.transition.binding.create`
- `version.workUnit.stateMachine.transition.binding.update`
- `version.workUnit.stateMachine.transition.binding.delete`
- `version.workUnit.stateMachine.transition.conditionSet.list`
- `version.workUnit.stateMachine.transition.conditionSet.create`
- `version.workUnit.stateMachine.transition.conditionSet.update`
- `version.workUnit.stateMachine.transition.conditionSet.delete`

Each test must assert required identity fields include:
- `versionId`
- `workUnitTypeKey`
- `transitionKey`

**Step 2: Run tests to verify failure**

Run: `bun run --cwd packages/api vitest run src/tests/routers/methodology.test.ts -t "transition.binding"`

Expected: FAIL due to missing/incorrect transition-nested route wiring.

**Step 3: Commit failing tests**

Run:
```bash
git add packages/api/src/tests/routers/methodology.test.ts
git commit -m "test(api): codify transition-scoped binding and condition-set routes"
```

---

### Task 2: Move Binding and Condition-Set Handling to Transition Scope in Router (GREEN)

**Files:**
- Modify: `packages/api/src/routers/methodology.ts`
- Modify: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Implement nested route mapping under transition scope**

In nested router export tree, move/alias binding routes under:
- `version.workUnit.stateMachine.transition.binding.*`

And move/alias condition-set routes under:
- `version.workUnit.stateMachine.transition.conditionSet.*`

Keep compatibility alias only if tests require short-term support; mark alias as temporary.

**Step 2: Ensure input schemas are transition-scoped**

Use/extend schema to require `transitionKey` on all binding and condition-set mutations and list operations.

**Step 3: Run route-focused tests**

Run: `bun run --cwd packages/api vitest run src/tests/routers/methodology.test.ts -t "transition.binding"`

Expected: PASS for transition-scoped binding and condition-set tests.

**Step 4: Commit router update**

Run:
```bash
git add packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "refactor(api): nest binding and condition-set routes under transition scope"
```

---

### Task 3: Enforce Service Ownership Boundaries in Methodology Engine (RED -> GREEN)

**Files:**
- Modify: `packages/methodology-engine/src/services/work-unit-state-machine-service.ts`
- Modify: `packages/methodology-engine/src/services/workflow-service.ts`
- Modify: `packages/methodology-engine/src/services/methodology-version-service.ts`
- Test: `packages/methodology-engine/src/tests/l2-l3/scaffold-contracts.test.ts`
- Test: `packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts`

**Step 1: Add failing seam tests**

Add tests that assert:
- state machine service owns transition-binding and transition-condition-set operations.
- workflow service owns workflow definition retrieval/mutation.
- no direct state-machine -> workflow service runtime dependency.

**Step 2: Run seam tests to verify RED**

Run:
`bun run --cwd packages/methodology-engine vitest run src/tests/l2-l3/scaffold-contracts.test.ts src/tests/l2-l3/work-unit-l2-services.test.ts`

Expected: FAIL where ownership boundary is not yet explicit.

**Step 3: Implement minimal seam corrections**

- Keep binding and condition-set write/read contracts in state machine service path.
- Keep workflow contracts in workflow service.
- In boundary service composition, orchestrate both services without introducing service-to-service cycles.

**Step 4: Re-run seam tests**

Run:
`bun run --cwd packages/methodology-engine vitest run src/tests/l2-l3/scaffold-contracts.test.ts src/tests/l2-l3/work-unit-l2-services.test.ts`

Expected: PASS.

**Step 5: Commit seam refactor**

Run:
```bash
git add packages/methodology-engine/src/services/work-unit-state-machine-service.ts packages/methodology-engine/src/services/workflow-service.ts packages/methodology-engine/src/services/methodology-version-service.ts packages/methodology-engine/src/tests/l2-l3/scaffold-contracts.test.ts packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts
git commit -m "refactor(engine): enforce state-machine vs workflow service ownership"
```

---

### Task 4: Normalize Workflow Query Inputs and Read Composition

**Files:**
- Modify: `packages/methodology-engine/src/services/workflow-service.ts`
- Modify: `packages/methodology-engine/src/services/methodology-version-service.ts`
- Modify: `packages/api/src/routers/project.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write failing tests for workflow query keying**

Add/adjust tests that require workflow detail lookups to use:
- `versionId`
- `workUnitTypeKey`
- `workflowKey`

and verify bindings only expose workflow refs, not embedded workflow step payloads.

**Step 2: Run tests to verify RED**

Run: `bun run --cwd packages/api vitest run src/tests/routers/methodology.test.ts -t "workflow"`

Expected: FAIL where keying/read shape differs.

**Step 3: Implement minimal updates**

- Keep `versionId` mandatory for workflow queries.
- Ensure workspace/baseline composition resolves workflow details via workflow query path when needed, not by embedding in binding storage.

**Step 4: Re-run workflow tests**

Run: `bun run --cwd packages/api vitest run src/tests/routers/methodology.test.ts -t "workflow"`

Expected: PASS.

**Step 5: Commit changes**

Run:
```bash
git add packages/methodology-engine/src/services/workflow-service.ts packages/methodology-engine/src/services/methodology-version-service.ts packages/api/src/routers/project.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "refactor(engine): require version-scoped workflow query identity"
```

---

### Task 5: L1 Facade Delegation and Ownership Cleanup (RED -> GREEN)

**Files:**
- Modify: `packages/methodology-engine/src/services/methodology-version-service.ts`
- Modify: `packages/methodology-engine/src/services/work-unit-fact-service.ts`
- Modify: `packages/methodology-engine/src/services/work-unit-state-machine-service.ts`
- Modify: `packages/methodology-engine/src/services/workflow-service.ts`
- Test: `packages/methodology-engine/src/tests/l2-l3/scaffold-contracts.test.ts`
- Test: `packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts`

**Step 1: Write failing seam tests for L1 ownership limits**

Add tests asserting:
- `MethodologyVersionService` acts as a facade/orchestrator for work-unit internals, not the deep owner.
- work-unit metadata create/update/delete ownership is delegated to `WorkUnitService` seam (or equivalent L2 seam once introduced).
- L2 peer services do not call each other directly (`WorkUnitService` must not depend on `WorkflowService`).

**Step 2: Run seam tests to verify RED**

Run:
`bun run --cwd packages/methodology-engine vitest run src/tests/l2-l3/scaffold-contracts.test.ts src/tests/l2-l3/work-unit-l2-services.test.ts`

Expected: FAIL where L1 still holds deep ownership logic.

**Step 3: Implement minimal delegation refactor**

- Keep compatibility API methods in L1 where required.
- Internally delegate deep work-unit ownership to the correct L2 seam(s).
- Keep workflow ownership in `WorkflowService`; bindings in state-machine seam only.

**Step 4: Re-run seam tests**

Run:
`bun run --cwd packages/methodology-engine vitest run src/tests/l2-l3/scaffold-contracts.test.ts src/tests/l2-l3/work-unit-l2-services.test.ts`

Expected: PASS.

**Step 5: Commit ownership cleanup**

Run:
```bash
git add packages/methodology-engine/src/services/methodology-version-service.ts packages/methodology-engine/src/services/work-unit-fact-service.ts packages/methodology-engine/src/services/work-unit-state-machine-service.ts packages/methodology-engine/src/services/workflow-service.ts packages/methodology-engine/src/tests/l2-l3/scaffold-contracts.test.ts packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts
git commit -m "refactor(engine): move deep work-unit ownership behind L2 seams"
```

---

### Task 6: Add Fast Workspace Stats Query (Single Call, No N+1)

**Files:**
- Modify: `packages/methodology-engine/src/services/methodology-version-service.ts`
- Modify: `packages/methodology-engine/src/repository.ts` and/or `packages/methodology-engine/src/lifecycle-repository.ts`
- Modify: `packages/db/src/methodology-repository.ts` and/or `packages/db/src/lifecycle-repository.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write failing API/engine tests for workspace stats read**

Add tests for a single workspace stats read that returns aggregated counts:
- work unit types
- states
- transitions
- workflows
- fact definitions (methodology-level and/or work-unit scoped as required by UI)

Tests must assert one aggregate read path is used (no per-work-unit fan-out loop in service layer).

**Step 2: Run tests to verify RED**

Run:
`bun run --cwd packages/api vitest run src/tests/routers/methodology.test.ts -t "workspace stats"`

Expected: FAIL before aggregate query method exists.

**Step 3: Implement aggregate query behind repository boundary**

- Add a dedicated repository method for version-scoped aggregate counts.
- Implement using grouped counts/CTEs or equivalent optimized query shape.
- Expose via L1 boundary method such as `getVersionWorkspaceStats(versionId)`.

**Step 4: Re-run targeted tests**

Run:
`bun run --cwd packages/api vitest run src/tests/routers/methodology.test.ts -t "workspace stats"`

Expected: PASS.

**Step 5: Commit stats query path**

Run:
```bash
git add packages/methodology-engine/src/services/methodology-version-service.ts packages/methodology-engine/src/repository.ts packages/methodology-engine/src/lifecycle-repository.ts packages/db/src/methodology-repository.ts packages/db/src/lifecycle-repository.ts packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "feat(engine): add version workspace stats aggregate query"
```

---

### Task 7: Documentation and Terminology Alignment

**Files:**
- Modify: `docs/plans/2026-03-20-final-projection-removal-plan.md`
- Modify: `docs/**` files mentioning state-machine/binding ownership
- Modify: `_bmad-output/**` mirrored architecture notes

**Step 1: Update architectural ownership language**

Document:
- transition-scoped binding ownership under state machine transitions.
- transition-scoped condition-set ownership under state machine transitions.
- workflow definition ownership under workflow service.
- boundary composition role for workspace query.

**Step 2: Run docs scan**

Run:
`rg -n "stateMachine\.binding|transition\.binding|workflow service|work unit service" docs _bmad-output`

Expected: references align with new ownership model.

**Step 3: Commit docs updates**

Run:
```bash
git add docs _bmad-output
git commit -m "docs: align layering and transition-scoped binding ownership"
```

---

### Task 8: Full Verification Gates

**Files:**
- Verify all modified files above

**Step 1: Engine tests**

Run: `bun run --cwd packages/methodology-engine vitest run`

Expected: PASS.

**Step 2: API router tests**

Run: `bun run --cwd packages/api vitest run src/tests/routers/methodology.test.ts`

Expected: PASS.

**Step 3: LSP diagnostics**

Run diagnostics on each edited TS file and ensure zero errors.

**Step 4: Required architecture scans**

Run:
```bash
ENGINE_FORBIDDEN_PATTERN="getDraft""Projection|MethodologyVersion""Projection|Projection""Repository|projection-""repository"
DOCS_FORBIDDEN_PATTERN="getDraft""Projection|MethodologyVersion""Projection|Projection""Repository|draft ""projection|projection-""repository"
rg -n "$ENGINE_FORBIDDEN_PATTERN" packages/methodology-engine/src
rg -n "$DOCS_FORBIDDEN_PATTERN" docs _bmad-output
```

Expected: no matches.

**Step 5: Final commit**

Run:
```bash
git add -A
git commit -m "refactor: finalize Story 3-3 layer ownership and transition binding boundaries"
```

---

## Notes for Implementer

- Keep Effect service contracts explicit (`Context.Tag` service APIs should expose stable semantics; avoid circular service dependencies).
- Keep command-side and query-side explicit; do not reintroduce projection-centric naming/coupling.
- Prefer transition-scoped binding and condition-set operations over flat state-machine semantics.
- Preserve API compatibility only where required by Story scope; document any compatibility alias and planned removal timeline.
- Keep L1 as compatibility/query facade and orchestration boundary; move deep entity ownership to domain seams.
- For workspace card stats, prefer one repository-backed aggregate read over assembling counts from full snapshot payloads.
