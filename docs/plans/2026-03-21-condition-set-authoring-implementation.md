# Condition Set Authoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build detailed condition-set authoring for transition Start/Completion tabs with stacked group dialogs, fact/work-unit condition types, and type-aware operator UX.

**Architecture:** Keep transition save as one composite write while strengthening condition schemas at the contract/router boundary and introducing UI-side discriminated condition builders. Persist nested groups/conditions in existing JSON fields (`groups_json`) with backward-compatible loading and deterministic validation.

**Tech Stack:** TypeScript, Effect/Schema, oRPC/Hono router, methodology-engine services, React + shadcn/ui Command/Popover/Dialog, Vitest, Bun.

---

### Task 1: Define typed condition-kind contracts for v1 core operators

**Files:**
- Modify: `packages/contracts/src/methodology/lifecycle.ts`
- Test: `packages/contracts/src/tests/methodology/version.test.ts`

**Step 1: Write the failing test**

Add tests that reject invalid condition configs and accept valid `fact`/`work_unit` condition shapes.

```ts
expect(() => decodeCondition({
  kind: "fact",
  config: { factKey: "fact.priority", operator: "gt", value: 3 },
})).not.toThrow();

expect(() => decodeCondition({
  kind: "fact",
  config: { factKey: "fact.priority", operator: "contains", value: "x" },
})).toThrow();
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/contracts/src/tests/methodology/version.test.ts`
Expected: FAIL due missing discriminated condition-kind schema.

**Step 3: Write minimal implementation**

- In `lifecycle.ts`, replace open-ended `TransitionCondition` with discriminated union for v1:
  - `kind: "fact"` with typed config
  - `kind: "work_unit"` with typed config
- Keep backward-compatible optional handling for unknown legacy shapes through separate compatibility type if needed.

**Step 4: Run test to verify it passes**

Run: `bun test packages/contracts/src/tests/methodology/version.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/lifecycle.ts packages/contracts/src/tests/methodology/version.test.ts
git commit -m "feat(contracts): add typed fact/work-unit transition condition schemas"
```

---

### Task 2: Enforce router-level validation and normalization for typed conditions

**Files:**
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

Add router tests proving invalid operator/type combos are rejected and valid payloads are accepted.

```ts
await expect(call(saveRoute, invalidPayload, AUTHENTICATED_CTX)).rejects.toThrow();
await expect(call(saveRoute, validPayload, AUTHENTICATED_CTX)).resolves.toBeDefined();
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/api/src/tests/routers/methodology.test.ts -t "condition set"`
Expected: FAIL because router currently accepts opaque condition config.

**Step 3: Write minimal implementation**

- Update condition schemas in router to match new discriminated union.
- Add normalization guards for optional arrays/strings without altering semantic payload.

**Step 4: Run test to verify it passes**

Run: `bun test packages/api/src/tests/routers/methodology.test.ts -t "condition set"`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "feat(api): validate typed transition condition payloads"
```

---

### Task 3: Add engine validation diagnostics for condition authoring constraints

**Files:**
- Modify: `packages/methodology-engine/src/lifecycle-validation.ts`
- Test: `packages/methodology-engine/src/tests/validation/lifecycle-validation.test.ts`

**Step 1: Write the failing test**

Add validation tests for:
- max group depth = 2,
- missing required config fields,
- invalid operator/value combination.

```ts
expect(result.diagnostics).toContainEqual(
  expect.objectContaining({ code: "INVALID_CONDITION_OPERATOR" }),
);
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/methodology-engine/src/tests/validation/lifecycle-validation.test.ts`
Expected: FAIL because these diagnostics are not implemented yet.

**Step 3: Write minimal implementation**

- Add deterministic validation helpers in `lifecycle-validation.ts` for condition sets/groups/conditions.
- Add explicit diagnostic codes for unsupported/invalid combinations.

**Step 4: Run test to verify it passes**

Run: `bun test packages/methodology-engine/src/tests/validation/lifecycle-validation.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/methodology-engine/src/lifecycle-validation.ts packages/methodology-engine/src/tests/validation/lifecycle-validation.test.ts
git commit -m "feat(validation): add deterministic condition-set constraint diagnostics"
```

---

### Task 4: Build stacked-dialog condition authoring UX in StateMachineTab

**Files:**
- Modify: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

**Step 1: Write the failing test**

Add integration test proving:
- Start/Completion tabs expose mode + guidance + description,
- Manage Groups opens stacked dialog,
- nested group add blocks after depth 2,
- condition type selector supports `Fact` and `Work Unit`.

```tsx
expect(screen.getByRole("button", { name: "Manage Groups" })).toBeTruthy();
expect(screen.getByText("Maximum nesting depth reached")).toBeTruthy();
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web vitest run 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' -t 'condition authoring'`
Expected: FAIL because current UI lacks stacked group authoring.

**Step 3: Write minimal implementation**

- Add condition-set card UI in Start/Completion tabs.
- Implement stacked dialogs for group editing (2-level max).
- Implement condition type selection with type-specific fields.
- Maintain dirty/discard behavior and single save action.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web vitest run 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' -t 'condition authoring'`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx
git commit -m "feat(web): add stacked condition-group authoring dialogs"
```

---

### Task 5: Implement fact-type-aware operator filtering and value widgets

**Files:**
- Modify: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

**Step 1: Write the failing test**

Add tests for dynamic operator options by fact type and value widget changes.

```tsx
chooseOption("Fact", "fact.priority");
expect(screen.queryByRole("option", { name: /contains/i })).toBeNull();
expect(screen.getByRole("option", { name: />=/i })).toBeTruthy();
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web vitest run 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' -t 'fact type operator matrix'`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Add fact-type operator registry in component/module scope.
- Render operator list based on selected fact’s type.
- Render value control based on operator contract.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web vitest run 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' -t 'fact type operator matrix'`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx
git commit -m "feat(web): filter condition operators by selected fact type"
```

---

### Task 6: Add backward-compatible legacy condition handling

**Files:**
- Modify: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`
- Modify: `packages/methodology-engine/src/lifecycle-validation.ts`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`
- Test: `packages/methodology-engine/src/tests/validation/lifecycle-validation.test.ts`

**Step 1: Write the failing test**

Add tests proving unknown legacy condition kind loads safely as read-only diagnostic card and blocks unsafe overwrite.

```tsx
expect(screen.getByText(/unsupported condition kind/i)).toBeTruthy();
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/methodology-engine/src/tests/validation/lifecycle-validation.test.ts && bun run --cwd apps/web vitest run 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' -t 'legacy condition kind'`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Add compatibility mapping/read-only rendering for unknown condition kinds.
- Emit explicit diagnostics in validation for unknown edited kinds.

**Step 4: Run test to verify it passes**

Run: `bun test packages/methodology-engine/src/tests/validation/lifecycle-validation.test.ts && bun run --cwd apps/web vitest run 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' -t 'legacy condition kind'`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx packages/methodology-engine/src/lifecycle-validation.ts apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx packages/methodology-engine/src/tests/validation/lifecycle-validation.test.ts
git commit -m "fix(condition-authoring): preserve unsupported legacy conditions safely"
```

---

### Task 7: Full verification and integration sweep

**Files:**
- Modify: touched files from tasks above as needed

**Step 1: Run targeted API tests**

Run: `bun test packages/api/src/tests/routers/methodology.test.ts`
Expected: PASS.

**Step 2: Run targeted engine tests**

Run: `bun test packages/methodology-engine/src/tests/validation/lifecycle-validation.test.ts`
Expected: PASS.

**Step 3: Run targeted web integration tests**

Run: `bun run --cwd apps/web vitest run 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`
Expected: PASS.

**Step 4: Run workspace checks**

Run: `bun run check-types`
Expected: PASS.

Run: `bun run build`
Expected: PASS.

**Step 5: Commit final test/docs alignment**

```bash
git add -A
git commit -m "test(condition-authoring): verify stacked dialog and typed condition flows"
```
