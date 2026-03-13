# Action v1 Layered Variable Model Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the workflow variable registry authoritative for typed variable behavior, remove duplicated output typing from new `action.v1` and agent-tool configs, and introduce one mutation gateway contract for consistent action/tool propagation into Chiron state and snapshots.

**Architecture:** Start at the contracts and validator boundary, because the repo already centralizes workflow-definition authority in `@chiron/contracts` and `@chiron/methodology-engine`. Then add a thin shared mutation contract in the scaffolded runtime packages so both `@chiron/workflow-engine` and `@chiron/tooling-engine` can target the same write path without implementing full runtime persistence in this slice.

**Tech Stack:** TypeScript, Effect Schema, Vitest, Bun

---

### Task 1: Add registry-first workflow variable contracts

**Files:**
- Modify: `packages/contracts/src/methodology/version.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/methodology/version.test.ts`

**Step 1: Write the failing contract test**

Add a new decode test in `packages/contracts/src/methodology/version.test.ts` for a workflow definition that includes:

- a variable registry entry for `context.bootstrapPayload`
- a variable registry entry for `self.bootstrapSnapshot`
- an `action.v1`-style write ref that targets `self.bootstrapSnapshot` without restating `valueType` or `cardinality`

Use a payload like:

```ts
const definition = {
  key: "document-project",
  workflows: [
    {
      key: "bootstrap",
      steps: [
        {
          key: "persist",
          type: "action",
          config: {
            contract: "action.v1",
            writes: [
              {
                target: "self.bootstrapSnapshot",
                op: "artifact-slot-upsert",
                from: { variable: "context.bootstrapPayload" },
              },
            ],
          },
        },
      ],
      edges: [],
      variableRegistry: [
        {
          key: "context.bootstrapPayload",
          layer: "context",
          valueType: "json",
          cardinality: "one",
          mutability: "step_write",
          durability: "execution",
          branchSafe: false,
        },
        {
          key: "self.bootstrapSnapshot",
          layer: "self",
          valueType: "artifact_ref",
          cardinality: "one",
          mutability: "explicit_durable_write",
          durability: "work_unit",
          branchSafe: true,
        },
      ],
    },
  ],
} as const;
```

Expected: FAIL because `WorkflowDefinition` does not yet accept a variable registry shape.

**Step 2: Run the contracts test to verify failure**

Run: `bun run --cwd packages/contracts test`
Expected: FAIL with schema mismatch for the new variable registry payload.

**Step 3: Implement the minimal contract changes**

In `packages/contracts/src/methodology/version.ts`, add:

- `VariableLayer = "context" | "self" | "project"`
- `VariableValueType = FactType | "entity_ref" | "entity_snapshot" | "artifact_ref"`
- `VariableRegistryEntryV1`
- `ActionMutationRefV1`
- `AgentToolWriteRefV1`

Then extend `WorkflowDefinition` with:

```ts
variableRegistry: Schema.optionalWith(Schema.Array(VariableRegistryEntryV1), {
  default: () => [],
})
```

Keep the step `config` field as `Schema.Unknown` for now; this slice only establishes the shared registry and mutation-ref contracts. Export the new schemas/types from `packages/contracts/src/index.ts`.

**Step 4: Run the contracts test to verify it passes**

Run: `bun run --cwd packages/contracts test`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/version.ts packages/contracts/src/index.ts packages/contracts/src/methodology/version.test.ts
git commit -m "feat(contracts): add registry-first workflow variable contracts"
```

---

### Task 2: Enforce registry guardrails in methodology validation

**Files:**
- Modify: `packages/methodology-engine/src/validation.ts`
- Test: `packages/methodology-engine/src/validation.test.ts`

**Step 1: Write the failing validator tests**

Add failing tests in `packages/methodology-engine/src/validation.test.ts` for:

1. duplicate variable registry keys in one workflow
2. a write ref that targets an undeclared variable
3. a write ref that targets a `read_only` variable
4. a branch edge that references a registry entry with `branchSafe: false`

Suggested diagnostic codes:

- `DUPLICATE_VARIABLE_REGISTRY_KEY`
- `UNDECLARED_MUTATION_TARGET`
- `READ_ONLY_MUTATION_TARGET`
- `BRANCH_CONDITION_NON_BRANCH_SAFE_VAR`

**Step 2: Run the methodology-engine tests to verify failure**

Run: `bun run --cwd packages/methodology-engine test`
Expected: FAIL with missing diagnostics.

**Step 3: Implement the minimal validation**

In `packages/methodology-engine/src/validation.ts`:

- build a workflow-local map of `variableRegistry` entries keyed by `key`
- emit a blocking diagnostic for duplicates
- inspect step configs conservatively as records and collect any `writes[].target` or tool `writeRef.target` values when present
- emit a blocking diagnostic when a target key is missing from the registry
- emit a blocking diagnostic when the target entry is `read_only`
- when validating branch edges, reject any referenced variable whose registry entry is not scalar or `branchSafe !== true`

Keep the validator deterministic:

- use workflow key + variable key in `scope`
- sort keys before emitting diagnostics

**Step 4: Run the tests to verify they pass**

Run: `bun run --cwd packages/methodology-engine test`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/methodology-engine/src/validation.ts packages/methodology-engine/src/validation.test.ts
git commit -m "feat(methodology-engine): validate registry-backed workflow mutations"
```

---

### Task 3: Add a shared mutation gateway contract in variable-service

**Files:**
- Create: `packages/variable-service/src/mutation-gateway.ts`
- Modify: `packages/variable-service/src/index.ts`
- Test: `packages/variable-service/src/mutation-gateway.test.ts`

**Step 1: Write the failing gateway test**

Create `packages/variable-service/src/mutation-gateway.test.ts` with a focused unit test for a pure function or Effect helper that accepts:

- a registry entry
- a mutation request
- a current scope snapshot

Assert that:

- `context.*` writes resolve as execution writes
- `self.*` writes resolve as work-unit durable writes
- `project.*` writes resolve as project durable writes
- `read_only` targets fail before producing a write plan

Example assertion target:

```ts
expect(result).toEqual({
  targetKey: "self.bootstrapSnapshot",
  writeKind: "work_unit",
  op: "artifact-slot-upsert",
})
```

**Step 2: Run the test to verify failure**

Run: `bunx vitest run packages/variable-service/src/mutation-gateway.test.ts`
Expected: FAIL because the module does not exist.

**Step 3: Implement the minimal gateway contract**

Create `packages/variable-service/src/mutation-gateway.ts` with:

- `MutationRequest`
- `ResolvedMutationPlan`
- `resolveMutationPlan(entry, request)`

Implement only the minimal logic for:

- layer to durability mapping
- mutability rejection
- pass-through operation validation

Do not implement DB writes in this task. This file is only the shared decision point both runtimes can call. Export it from `packages/variable-service/src/index.ts`.

**Step 4: Run the test to verify it passes**

Run: `bunx vitest run packages/variable-service/src/mutation-gateway.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/variable-service/src/mutation-gateway.ts packages/variable-service/src/index.ts packages/variable-service/src/mutation-gateway.test.ts
git commit -m "feat(variable-service): add shared mutation gateway contract"
```

---

### Task 4: Make workflow-engine action writes resolve through the shared gateway

**Files:**
- Create: `packages/workflow-engine/src/action-mutation-planner.ts`
- Modify: `packages/workflow-engine/src/index.ts`
- Test: `packages/workflow-engine/src/action-mutation-planner.test.ts`

**Step 1: Write the failing planner test**

Create `packages/workflow-engine/src/action-mutation-planner.test.ts` that builds:

- one registry entry for `context.bootstrapPayload`
- one registry entry for `self.bootstrapSnapshot`
- one action write ref targeting `self.bootstrapSnapshot`

Assert that the planner calls the shared resolver and returns a durable write plan for the action step.

**Step 2: Run the test to verify failure**

Run: `bunx vitest run packages/workflow-engine/src/action-mutation-planner.test.ts`
Expected: FAIL because the planner module does not exist.

**Step 3: Implement the minimal planner**

Create `packages/workflow-engine/src/action-mutation-planner.ts` with a small helper like:

```ts
export function planActionMutations(registry, writes) {
  // lookup target entry
  // call resolveMutationPlan
  // return ordered plans
}
```

Do not implement action execution yet. This task proves that `action` configs no longer need local type metadata to decide write behavior. Export the helper from `packages/workflow-engine/src/index.ts`.

**Step 4: Run the test to verify it passes**

Run: `bunx vitest run packages/workflow-engine/src/action-mutation-planner.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/workflow-engine/src/action-mutation-planner.ts packages/workflow-engine/src/index.ts packages/workflow-engine/src/action-mutation-planner.test.ts
git commit -m "feat(workflow-engine): plan action writes from registry metadata"
```

---

### Task 5: Make tooling-engine agent writes resolve through the same gateway

**Files:**
- Create: `packages/tooling-engine/src/tool-mutation-planner.ts`
- Modify: `packages/tooling-engine/src/index.ts`
- Test: `packages/tooling-engine/src/tool-mutation-planner.test.ts`

**Step 1: Write the failing planner test**

Create `packages/tooling-engine/src/tool-mutation-planner.test.ts` with:

- a registry entry for `project.deliveryMode`
- an agent tool write ref with `target: "project.deliveryMode"`, `op: "set"`, and `applyResult.valuePath: "deliveryMode"`

Assert that the planner extracts the result payload and returns a project durable write plan through the shared gateway contract.

**Step 2: Run the test to verify failure**

Run: `bunx vitest run packages/tooling-engine/src/tool-mutation-planner.test.ts`
Expected: FAIL because the planner module does not exist.

**Step 3: Implement the minimal planner**

Create `packages/tooling-engine/src/tool-mutation-planner.ts` with a helper that:

- applies `valuePath` when present
- looks up the registry entry
- calls `resolveMutationPlan`
- returns a normalized mutation plan for the tooling bridge

Export the helper from `packages/tooling-engine/src/index.ts`.

**Step 4: Run the test to verify it passes**

Run: `bunx vitest run packages/tooling-engine/src/tool-mutation-planner.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/tooling-engine/src/tool-mutation-planner.ts packages/tooling-engine/src/index.ts packages/tooling-engine/src/tool-mutation-planner.test.ts
git commit -m "feat(tooling-engine): route agent writes through shared mutation planning"
```

---

### Task 6: Define consistent propagation events for snapshots and state refresh

**Files:**
- Create: `packages/contracts/src/methodology/mutation.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/methodology/version.test.ts`
- Modify: `docs/architecture/modules/variable-service.md`
- Modify: `docs/architecture/workflow-engine-parity-checklist.md`

**Step 1: Write the failing contract/doc test or assertion**

Add a small contracts test that decodes a normalized mutation event payload with fields like:

```ts
{
  source: "action-step",
  executionId: "exec_123",
  stepKey: "artifact.snapshot.save",
  targetKey: "self.projectContextSnapshot",
  durability: "work_unit",
  refreshSnapshot: true,
}
```

Expected: FAIL because no schema exists.

**Step 2: Run the contracts test to verify failure**

Run: `bun run --cwd packages/contracts test`
Expected: FAIL with missing schema export.

**Step 3: Implement the minimal event contract and doc updates**

Create `packages/contracts/src/methodology/mutation.ts` with a schema for normalized mutation events or receipts shared by both action and tool paths. Export it from `packages/contracts/src/index.ts`.

Then update:

- `docs/architecture/modules/variable-service.md` to say the mutation gateway is the shared source for `variable.set`, `variable.merge`, `variable.promote`, and durable refresh triggers
- `docs/architecture/workflow-engine-parity-checklist.md` to require both action and tool writes to use the shared gateway before the runtime cutover is considered complete

**Step 4: Run the contracts test to verify it passes**

Run: `bun run --cwd packages/contracts test`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/mutation.ts packages/contracts/src/index.ts packages/contracts/src/methodology/version.test.ts docs/architecture/modules/variable-service.md docs/architecture/workflow-engine-parity-checklist.md
git commit -m "feat(contracts): add normalized mutation propagation contract"
```

---

## Verification checklist

- `bun run --cwd packages/contracts test`
- `bun run --cwd packages/methodology-engine test`
- `bunx vitest run packages/variable-service/src/mutation-gateway.test.ts`
- `bunx vitest run packages/workflow-engine/src/action-mutation-planner.test.ts`
- `bunx vitest run packages/tooling-engine/src/tool-mutation-planner.test.ts`
- `bun run check-types`

## Notes for the implementer

- Do not add per-action or per-tool `valueType`/`cardinality` duplication back into newly authored configs.
- Keep backward compatibility only at decode or migration boundaries.
- Do not attempt full DB persistence cutover in this plan; this slice only establishes the shared mutation authority and propagation contract the later runtime cutover can rely on.
