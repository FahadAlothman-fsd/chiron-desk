# Transition Condition + Binding Ownership Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce single-owner lifecycle editing so transition upsert only changes transition metadata, condition sets are updated only via condition-set handlers, and workflow bindings are updated only via binding handlers in one orchestrated dialog save.

**Architecture:** Split write ownership by domain boundary. Transition metadata (`fromState`, `toState`, `transitionKey`) is handled exclusively by transition-upsert. Condition sets (start/completion) are handled exclusively by condition-set update. Transition workflow bindings remain bulk-per-transition through binding update, and the UI save action coordinates these handlers in sequence.

**Tech Stack:** TypeScript, Effect, oRPC, Hono router, Drizzle (SQLite), React + TanStack Query, Vitest, Bun, Turborepo.

---

### Task 1: Lock transition-upsert contract to metadata only

**Files:**
- Modify: `packages/contracts/src/methodology/lifecycle.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Modify: `packages/methodology-engine/src/services/work-unit-state-machine-service.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

Add/adjust API test asserting `transition.upsert` payload no longer accepts or requires `conditionSets` and does not mutate condition sets.

```ts
expect(updatedTransition.conditionSets).toEqual(previousConditionSets);
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/api/src/tests/routers/methodology.test.ts -t "transition upsert"`
Expected: FAIL because current upsert path still writes condition sets.

**Step 3: Write minimal implementation**

- In lifecycle contract, remove `conditionSets` from `UpsertWorkUnitLifecycleTransitionInput.transition`.
- In API router schema (`upsertWorkUnitLifecycleTransitionInput`), accept only transition metadata fields.
- In service upsert path, map only metadata fields.

**Step 4: Run test to verify it passes**

Run: `bun test packages/api/src/tests/routers/methodology.test.ts -t "transition upsert"`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/lifecycle.ts packages/api/src/routers/methodology.ts packages/methodology-engine/src/services/work-unit-state-machine-service.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "refactor(lifecycle): constrain transition upsert to metadata only"
```

---

### Task 2: Remove condition-set writes from transition-upsert repository path

**Files:**
- Modify: `packages/methodology-engine/src/repository.ts`
- Modify: `packages/db/src/methodology-repository.ts`
- Test: `packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts`

**Step 1: Write the failing test**

Add/adjust repository/service-level test proving `upsertWorkUnitLifecycleTransition` does not replace condition sets.

```ts
expect(conditionSetRowsAfterUpsert).toEqual(conditionSetRowsBeforeUpsert);
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts -t "upsert transition"`
Expected: FAIL because DB upsert currently deletes/inserts condition sets.

**Step 3: Write minimal implementation**

- Keep `upsertWorkUnitLifecycleTransition` scoped to transition row update/insert only.
- Remove delete/insert operations on `transitionConditionSets` from that method.
- Keep `replaceWorkUnitTransitionConditionSets` as the only condition-set writer.

**Step 4: Run test to verify it passes**

Run: `bun test packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts -t "upsert transition"`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/methodology-engine/src/repository.ts packages/db/src/methodology-repository.ts packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts
git commit -m "refactor(db): remove condition-set mutation from transition upsert"
```

---

### Task 3: Add bindings tab to transition dialog and orchestrate single-save flow

**Files:**
- Modify: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Reference: `packages/api/src/routers/methodology.ts`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

**Step 1: Write the failing test**

Add/adjust integration test for transition dialog save to assert:
- metadata saved via transition upsert,
- condition sets saved via conditionSet.update,
- bindings saved via binding.update,
- all triggered from one Save action.

```tsx
expect(calls).toEqual([
  "transition.upsert",
  "transition.conditionSet.update",
  "transition.binding.update",
]);
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web vitest run src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "transition dialog save"`
Expected: FAIL because dialog currently lacks bindings tab and/or flow.

**Step 3: Write minimal implementation**

- Add a third transition dialog tab for bindings.
- Provide selected workflow keys for transition in dialog state.
- On Save, perform sequential mutations:
  1) `stateMachine.transition.upsert`
  2) `stateMachine.transition.conditionSet.update`
  3) `stateMachine.transition.binding.update`
- Invalidate/refetch snapshot once after all succeed.

**Important sequencing note:**
- For new transitions, step (1) must complete before (2)/(3), because condition-set and binding writes require the transition to exist in persistence.
- Keep this ordering even for updates for consistent behavior.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web vitest run src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "transition dialog save"`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx
git commit -m "feat(web): add transition bindings tab and single-save orchestration"
```

---

### Task 4: Ensure conditionSet.list and binding.list are authoritative hydration sources

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Modify: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

**Step 1: Write the failing test**

Add test that reopening dialog after save loads start/completion conditions and binding selections from list handlers.

```tsx
expect(startGate).toMatchObject(savedStartGate);
expect(completionGate).toMatchObject(savedCompletionGate);
expect(selectedBindings).toEqual(savedBindings);
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web vitest run src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "reopen transition dialog"`
Expected: FAIL until hydration wiring is finalized.

**Step 3: Write minimal implementation**

- Use `transition.conditionSet.list` result to seed gate editor state.
- Use `transition.binding.list` result to seed binding tab state.
- Preserve dirty-state/discard UX while separating domains.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web vitest run src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "reopen transition dialog"`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx
git commit -m "fix(web): hydrate transition conditions and bindings from dedicated list handlers"
```

---

### Task 5: Full verification and cleanup

**Files:**
- Modify (as needed): files touched in Tasks 1-4

**Step 1: Run targeted backend tests**

Run: `bun test packages/api/src/tests/routers/methodology.test.ts`
Expected: PASS.

**Step 2: Run targeted service tests**

Run: `bun test packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts`
Expected: PASS.

**Step 3: Run targeted web integration tests**

Run: `bun run --cwd apps/web vitest run src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "State Machine|transition dialog|condition set|binding"`
Expected: PASS.

**Step 4: Run typecheck + build**

Run: `bun run check-types`
Expected: PASS.

Run: `bun run build`
Expected: PASS.

**Step 5: Commit verification updates**

```bash
git add -A
git commit -m "test: enforce single-owner transition save boundaries and dialog hydration"
```
