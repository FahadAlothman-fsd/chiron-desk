# Workflow Variables Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add workflow variable metadata (declared keys, explicit cardinality, optional deterministic bindings) to the methodology builder, plus validation guardrails that keep branching deterministic and entity selection unambiguous.

**Architecture:** Use workflow metadata (not workflow IO contracts) to describe variables and optional source bindings, and validate deterministically in `@chiron/methodology-engine`.

**Tech Stack:** TypeScript, Effect Schema, Vitest, Drizzle (SQLite), Bun

---

### Task 1: Add workflow variable metadata to `@chiron/contracts`

**Files:**
- Modify: `packages/contracts/src/methodology/version.ts`
- Test: `packages/contracts/src/methodology/version.test.ts`

**Step 1: Write a failing decode test for workflow variable metadata**

Add a new test case to `packages/contracts/src/methodology/version.test.ts` that decodes a `WorkflowDefinition` with:
- `workflow variable metadata` includes declared keys
- inputs declared with:
  - `varKey: "workUnit.ref"`, `valueType: "json"`, `cardinality: "one"`
  - `varKey: "workUnit.snapshot"`, `valueType: "json"`, `cardinality: "one"`
- one derived input binding that selects a single work unit from a many-source using a stable sort.

Example JSON payload for the test:

```ts
const variableMetadata = {
  inputs: [
    {
      varKey: "workUnit.ref",
      displayName: "Selected Work Unit Ref",
      valueType: "json",
      cardinality: "one",
      scope: "execution",
      mutability: "read_only"
    },
    {
      varKey: "workUnit.snapshot",
      displayName: "Selected Work Unit Snapshot",
      valueType: "json",
      cardinality: "one",
      scope: "execution",
      mutability: "read_only"
    }
  ],
  outputs: [],
  bindings: [
    {
      kind: "binding.v1",
      targetVarKey: "workUnit.ref",
      source: {
        kind: "workItem.links",
        relationType: "depends_on",
        strength: "hard"
      },
      sourceCardinality: "many",
      aggregator: { kind: "firstSorted", sortKey: "createdAt", direction: "asc" }
    }
  ]
} as const;
```

Expected: test FAILS until schemas exist.

**Step 2: Run the contracts test to confirm failure**

Run: `bun run --cwd packages/contracts test`
Expected: FAIL with schema mismatch / unknown kind.

**Step 3: Implement V2 schemas (minimal set)**

In `packages/contracts/src/methodology/version.ts`, introduce:

```ts
export const VariableCardinality = Schema.Literal("one", "many");
export type VariableCardinality = typeof VariableCardinality.Type;

export const VariableScope = Schema.Literal("step", "execution", "project", "global");
export type VariableScope = typeof VariableScope.Type;

export const VariableMutability = Schema.Literal("read_only", "step_write", "explicit_op");
export type VariableMutability = typeof VariableMutability.Type;

export const WorkflowVariableSpecV2 = Schema.Struct({
  varKey: Schema.NonEmptyString,
  displayName: Schema.String,
  valueType: FactType,
  cardinality: VariableCardinality,
  scope: VariableScope,
  mutability: VariableMutability,
});
export type WorkflowVariableSpecV2 = typeof WorkflowVariableSpecV2.Type;

export const BindingAggregatorV1 = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("selectById"), idVarKey: Schema.NonEmptyString }),
  Schema.Struct({ kind: Schema.Literal("firstSorted"), sortKey: Schema.NonEmptyString, direction: Schema.Literal("asc", "desc") }),
  Schema.Struct({ kind: Schema.Literal("count") }),
);
export type BindingAggregatorV1 = typeof BindingAggregatorV1.Type;

export const BindingSourceV1 = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("git.context"), key: Schema.NonEmptyString }),
  Schema.Struct({ kind: Schema.Literal("workItem.self") }),
  Schema.Struct({ kind: Schema.Literal("workItem.links"), relationType: Schema.NonEmptyString, strength: Schema.optional(LinkStrength) }),
);
export type BindingSourceV1 = typeof BindingSourceV1.Type;

export const WorkflowInputBindingV1 = Schema.Struct({
  kind: Schema.Literal("binding.v1"),
  targetVarKey: Schema.NonEmptyString,
  source: BindingSourceV1,
  sourceCardinality: VariableCardinality,
  aggregator: Schema.optional(BindingAggregatorV1),
});
export type WorkflowInputBindingV1 = typeof WorkflowInputBindingV1.Type;

export const WorkflowVariableMetadataV1 = Schema.Struct({
  kind: Schema.Literal("workflow-variables.v1"),
  inputs: Schema.Array(WorkflowVariableSpecV2),
  outputs: Schema.Array(WorkflowVariableSpecV2),
  bindings: Schema.optionalWith(Schema.Array(WorkflowInputBindingV1), { default: () => [] }),
});
export type WorkflowVariableMetadataV1 = typeof WorkflowVariableMetadataV1.Type;
```

Then update workflow metadata schemas without introducing workflow IO contract fields.

```ts
export const WorkflowVariableMetadata = Schema.Struct({
  inputs: Schema.Array(WorkflowVariableSpecV2),
  outputs: Schema.Array(WorkflowVariableSpecV2),
  bindings: Schema.optionalWith(Schema.Array(WorkflowInputBindingV1), { default: () => [] }),
});
```

and keep `WorkflowDefinition` free of workflow IO contract fields.

**Step 4: Run tests to confirm they pass**

Run: `bun run --cwd packages/contracts test`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/version.ts packages/contracts/src/methodology/version.test.ts
git commit -m "feat(contracts): add workflow variable metadata schema"
```

---

### Task 2: Validate V2 variable contracts deterministically in `@chiron/methodology-engine`

**Files:**
- Modify: `packages/methodology-engine/src/validation.ts`
- Test: `packages/methodology-engine/src/validation.test.ts` (or create if missing)

**Step 1: Write failing tests for guardrails**

Add test cases that call `validateDraftDefinition` and assert blocking diagnostics for:
1) Binding with `sourceCardinality: "many"` and missing `aggregator`.
2) Two inputs with the same `varKey`.
3) A binding that targets a `targetVarKey` that is not declared in `inputs`.

Expected diagnostic codes (suggested):
- `VARIABLE_BINDING_MISSING_AGGREGATOR`
- `DUPLICATE_WORKFLOW_VAR_KEY`
- `UNDECLARED_BOUND_VARIABLE`

**Step 2: Run methodology-engine tests to confirm failure**

Run: `bun run --cwd packages/methodology-engine test`
Expected: FAIL.

**Step 3: Implement validation logic**

In `packages/methodology-engine/src/validation.ts`, inside the per-workflow loop:
- Detect variable metadata via the workflow metadata object.
- Build a `Set` of declared `varKey` from inputs + outputs and emit diagnostics for duplicates.
- For each binding:
  - if `sourceCardinality === "many"` and `aggregator` is missing => blocking diagnostic.
  - if `binding.targetVarKey` not in declared inputs => blocking diagnostic.

Ensure diagnostics are deterministic:
- stable `scope` strings (key-based, not index-based)
- stable sort already happens at end of validator

**Step 4: Run tests to confirm pass**

Run: `bun run --cwd packages/methodology-engine test`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/methodology-engine/src/validation.ts packages/methodology-engine/src/validation.test.ts
git commit -m "feat(methodology-engine): validate workflow variable bindings deterministically"
```

---

### Task 3: Add branch-condition shape validation (ADT) + branch-safe variable rule

**Files:**
- Create: `packages/contracts/src/workflow/condition.ts` (or place in methodology contracts)
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/methodology-engine/src/validation.ts`
- Test: `packages/methodology-engine/src/validation.test.ts`

**Step 1: Write failing tests for invalid branch conditions**

Add a workflow with a branch step and an outgoing edge whose `condition` is:
- missing
- or a string expression like `"x > 1"`

Expected: blocking diagnostic `INVALID_BRANCH_CONDITION`.

Add a second case where condition references a variable that is declared with `cardinality: "many"`.
Expected: blocking diagnostic `BRANCH_CONDITION_NON_SCALAR_VAR`.

**Step 2: Implement Condition schema and decode-at-validation**

Implement the Condition ADT schema (aligned with `docs/architecture/methodology-pages/workflow-editor/branch-step.md`) and in `validateDraftDefinition`:
- for each outgoing edge from a branch step:
  - attempt to decode `edge.condition` using the Condition schema
  - fail => diagnostic
- walk the decoded condition tree, collect referenced `var` keys, and validate:
  - key exists in declared inputs/outputs (or in a reserved allowlist like `git.*`)
  - referenced vars are scalar (cardinality one, and valueType in string|number|boolean)

**Step 3: Run tests**

Run: `bun run --cwd packages/methodology-engine test`
Expected: PASS.

**Step 4: Commit**

```bash
git add packages/contracts/src/index.ts packages/contracts/src/workflow/condition.ts packages/methodology-engine/src/validation.ts packages/methodology-engine/src/validation.test.ts
git commit -m "feat: validate branch condition ADT and branch-safe variables"
```

---

### Task 4: Encode entity selection as ref+snapshot variable pair (contract + validation helpers)

**Files:**
- Modify: `packages/contracts/src/methodology/version.ts`
- Modify: `packages/methodology-engine/src/validation.ts`
- Test: `packages/methodology-engine/src/validation.test.ts`

**Step 1: Add a helper convention (no new runtime required)**

Add a small validation helper that recognizes selection pairs:
- `*.ref` and `*.snapshot` for the same prefix

Validation rules (blocking):
- if `*.snapshot` exists, require corresponding `*.ref`
- recommend `cardinality: one` for both

**Step 2: Tests**

Add a failing test where `workUnit.snapshot` is declared without `workUnit.ref`.
Expected: blocking diagnostic `MISSING_ENTITY_REF_FOR_SNAPSHOT`.

**Step 3: Implement and run tests**

Run: `bun run --cwd packages/methodology-engine test`
Expected: PASS.

**Step 4: Commit**

```bash
git add packages/contracts/src/methodology/version.ts packages/methodology-engine/src/validation.ts packages/methodology-engine/src/validation.test.ts
git commit -m "feat: enforce ref+snapshot selection pair guardrail"
```

---

## Verification checklist
- `bun run --cwd packages/contracts test`
- `bun run --cwd packages/methodology-engine test`
- (Optional) `bun run test` at repo root
