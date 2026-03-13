# Action v1 Layered Variable Model Design

**Date:** 2026-03-12  
**Status:** Approved

## Bottom line

Redesign `action.v1` around a workflow-owned variable registry with three primary business layers: `context`, `self`, and `project`. New authored step and tool configs should reference declared variable keys and mutation operations only; they should not restate `valueType`, `cardinality`, or ad hoc schemas that already belong to the registry.

Both mutation paths - deterministic `action` steps and agent/tool writes - must pass through one mutation gateway so Chiron updates canonical stores, variable history, execution state, and execution snapshots consistently.

## Problem

The current direction has the right ingredients but not one authority surface yet:

- `docs/plans/2026-03-11-workflow-variables-design.md` moves toward declared variables, deterministic bindings, and explicit scope semantics.
- `docs/architecture/workflow-engine/action-step-contract.md` still models variable writes and outputs as step-local config fields without a typed registry-first contract.
- `docs/architecture/workflow-engine/agent-step-contract.md` still lets agent tools describe output behavior independently through `targetVariable`, `valueSchema`, and tool-local behavior.
- `docs/plans/2026-03-12-invoke-facts-artifact-slots-design.md` correctly moves invoke away from workflow-level business IO and toward durable facts/artifact slots, which increases the need for one canonical mutation path elsewhere.

If action steps, agent tools, and workflow IO all describe the same data independently, Chiron will drift on:

- variable typing and cardinality
- durable vs transient ownership
- branch safety
- audit and replay semantics
- snapshot/state propagation

## Decision

### 1) Make the workflow variable registry authoritative

Each workflow definition may declare a variable registry keyed by namespaced variable key. Registry entries are the only authoritative place for:

- layer ownership
- value type
- cardinality
- mutability
- durability
- sensitivity
- provenance
- branch safety

Recommended v1 entry shape:

```ts
type VariableRegistryEntryV1 = {
  key: string
  layer: "context" | "self" | "project"
  valueType:
    | "string"
    | "number"
    | "boolean"
    | "json"
    | "entity_ref"
    | "entity_snapshot"
    | "artifact_ref"
  cardinality: "one" | "many"
  mutability: "read_only" | "step_write" | "explicit_durable_write"
  durability: "execution" | "work_unit" | "project"
  branchSafe: boolean
  sensitivity?: "normal" | "secret"
  provenance?: "system" | "user_input" | "derived" | "tool_output"
}
```

### 2) Use three business layers in authored configs

For v1, keep authored business variables in these layers only:

- `context.*`: execution-scoped values used during one workflow run
- `self.*`: durable values owned by the current work unit
- `project.*`: durable values owned at project scope

Reserved runtime/system namespaces may still exist for engine internals, but they should not be the normal authoring model.

### 3) Remove duplicate typing from new `action.v1` configs

`action.v1` should describe what operation happens and which declared variables it reads or writes. It should not redefine the target variable contract.

Recommended direction:

```ts
type ActionMutationRefV1 = {
  target: string
  op: "set" | "merge" | "delete" | "fact-upsert" | "artifact-slot-upsert"
  from?: {
    variable?: string
    valuePath?: string
    literal?: unknown
  }
}
```

Examples:

- a render action writes `context.bootstrapPayload` via `set`
- a snapshot/artifact action writes a durable artifact slot and returns an `artifact_ref` into `self.bootstrapSnapshot`
- a git action updates observed git variables through the same mutation gateway instead of ad hoc state writes

### 4) Remove duplicate typing from agent tool configs too

Agent tools should not own a second variable schema language. Tool configs may still define tool input payload shape when needed, but target variable typing must come from the registry.

Recommended v1 write shape:

```ts
type AgentToolWriteRefV1 = {
  target: string
  op: "set" | "merge" | "fact-upsert" | "artifact-slot-upsert"
  applyResult?: {
    valuePath?: string
  }
}
```

This keeps one place where output type/cardinality are enforced and one place where branch-safety is declared.

### 5) Unify both mutation paths behind one mutation gateway

Both of these paths must call the same service:

- workflow-engine action handlers
- tooling-engine agent tools

The shared gateway is responsible for:

1. validating the target variable exists in the registry
2. checking layer mutability and promotion rules
3. decoding/coercing the value against the registry entry
4. writing staged execution state when the target is execution-scoped
5. writing canonical durable state when the target is `self` or `project`
6. appending `variable_history`/audit rows
7. emitting normalized events
8. refreshing the execution snapshot/projection

## Layer semantics

### `context.*`

- execution-scoped
- mutable during the run
- not canonical durable business state
- safe place for generated intermediate payloads such as `context.bootstrapPayload`

### `self.*`

- durable current-work-unit state
- maps to work-unit facts, artifact slots, and related current-unit projections
- the default durable target for invoked/current work-unit business outputs

### `project.*`

- durable project-wide state
- maps to project facts, project artifact slots, and other shared project context

## Snapshot and state propagation

### Recommendation

Treat snapshots and execution state projections as derived artifacts, not independently authored mutable stores.

After every committed mutation, Chiron should update state in this order:

1. canonical write or execution-layer write is committed
2. audit/history row is appended
3. normalized mutation event is emitted
4. execution snapshot/projection is rebuilt or incrementally refreshed from canonical state plus execution context

This avoids one subsystem writing durable state while another separately mutates a snapshot view that can go stale or diverge.

### Practical implication for dual mutation paths

- `action` step writes do not directly mutate snapshots
- agent-tool writes do not directly mutate snapshots
- both paths submit a mutation request and let the shared gateway perform propagation

## Branching and determinism guardrails

Publish-time and runtime guardrails for v1:

- block unknown target keys
- block writes to `read_only` variables
- block writes across layers unless the target entry explicitly allows that durability
- block branch conditions on non-scalar or non-`branchSafe` variables
- require explicit aggregation before a `many` source can feed a scalar target
- treat `entity_snapshot` and immutable `artifact_ref` as branch-safe only when declared that way in the registry
- keep `context -> self/project` promotion explicit; never infer durable writes from naming alone

## Practical `action.v1` recommendation

For v1, keep `action.v1` small and explicit:

- deterministic operations only
- explicit `reads` and `writes`
- no per-action `valueType`/`cardinality` duplication
- no embedded author-defined business schemas beyond operation payload needs
- operation-specific params stay allowed (`artifactSlotKey`, `message`, `includePaths`, etc.)

That gives a minimal but durable contract surface: the step says what it wants to do, the registry says what the data means, and the mutation gateway enforces the join.

## Migration posture

Use a compatibility adapter for already-authored legacy shapes:

- continue decoding existing configs that still carry local typing hints
- warn when duplicated type/cardinality/schema metadata is present
- reject new authored configs that introduce fresh duplicated variable contracts

This keeps v1 practical without locking in the old drift-prone model.

## Why this cut is right for v1

- It aligns with current variable-authority direction without waiting for a larger runtime rewrite.
- It matches the invoke redesign: durable business data belongs in durable stores, not in ad hoc child/parent variable copies.
- It gives Chiron one consistent path for audit, replay, step history, and snapshot refresh.
- It avoids inventing a second schema system inside action and agent configs.

## Not in v1

- free-form expression language for writes or conditions
- implicit live source resolution at runtime
- automatic sync from durable state back into execution context unless explicitly refreshed
- separate snapshot mutation APIs for different step types
- new infrastructure beyond a shared mutation contract and adapters
