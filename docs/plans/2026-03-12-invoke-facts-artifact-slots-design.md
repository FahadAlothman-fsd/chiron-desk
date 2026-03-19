# Invoke Facts/Artifact Slots Design

**Status:** Approved
**Last Updated:** 2026-03-12

## Bottom line

Remove invoke-level business IO entirely. Child workflows should communicate durable results only by writing scoped work unit facts and artifact slots; invoke itself should only record lineage and execution status.

For v1, keep a tiny runtime-owned invoke record so the parent can deterministically know what child execution or child work unit was started, whether it completed, and where to load persisted results from. Do not keep `inputMapping`, `output`, or workflow-level IO contracts as part of the invoke handshake.

## Decision

### 1) Business data moves only through facts and artifact slots

Invoke is an orchestration boundary, not a data-shaping boundary.

- `current_work_unit`: the invoked workflow reads and writes the current work unit's facts and artifact slots.
- `child_work_unit`: the invoked workflow reads and writes the child work unit's facts and artifact slots.
- Parent workflows read child results through persisted state plus lineage-aware selectors after invoke completion.

This makes the durable project model authoritative and avoids copying child payloads into parent runtime variables.

### 2) Keep only minimal invoke output capture

A parent still needs deterministic awareness that an invoke happened. Keep a small system-owned invoke result record with fields like:

```ts
type InvokeLineageRecord = {
  stepKey: string
  targetMode: "current_work_unit" | "child_work_unit"
  workflowKey: string
  childWorkUnitRef?: {
    workUnitId: string
    workUnitTypeKey: string
  }
  childExecutionId: string
  status: "queued" | "running" | "completed" | "failed" | "cancelled"
  startedAt: string
  finishedAt?: string
}
```

This record is runtime metadata, not a user-authored output mapping surface. It must not include copied fact values, namespaced variable blobs, or selector-driven payload extraction.

### 3) Remove invoke IO config from v1

Remove these as supported invoke features:

- `inputMapping`
- `output.mode`
- `output.target`
- `output.selectors`
- any parent-side namespace capture of child variables

Legacy workflow IO contract columns are removed from the model and are not part of the approved v1 orchestration design.

### 4) Parent awareness for `child_work_unit`

Minimal parent awareness is still needed, but only at the lineage level:

- which child work unit was created or activated
- which child execution ran
- whether it completed successfully
- when it started or finished

Any parent branching, gating, or resumed agent reasoning should load persisted child facts and artifact snapshots using that lineage, rather than consuming mapped invoke outputs.

### 5) Naming for invoke modes

Use two separate concepts:

1. `targetMode`: where the invoked workflow runs
   - `current_work_unit`
   - `child_work_unit`

2. `executionMode`: how repeated invokes are scheduled
   - `single` (optional if no fan-out is configured)
   - `sequential`
   - `parallel`

Do not use `bindingMode`; it mixes context boundary with an older mapping concept. Do not use plural `child_work_units`; plurality belongs to fan-out configuration such as `forEach`, not to the target boundary name itself.

## Runtime rules

- Invoke may create or activate a child work unit when `targetMode = child_work_unit`.
- Child workflows do not write parent facts or parent artifact slots directly in v1.
- Parent steps may read child persisted state only through explicit lineage-aware selectors or runtime context attachments built from persisted state.
- Gate evaluation should inspect related work units plus persisted facts/artifacts, not invoke payload copies.

## What stays out of v1

- No schema-agnostic child variable capture.
- No selector-based output projection from child runtime into parent runtime.
- No parent-to-child payload adapter layer beyond normal context visibility rules.
- No automatic child-to-parent synchronization of business facts.

## Why this is the right cut

- It removes the overlap between workflow-level IO contracts and invoke-level mapping/output capture.
- It aligns orchestration with the newer facts/artifact-slot model already emerging in the methodology design docs.
- It preserves auditability because lineage and durable state remain explicit.
- It keeps v1 small: one orchestration primitive, one durable data model, one minimal metadata record.

## Implementation notes

- Prefer validation and seed updates before runtime expansion so new methodology drafts cannot keep authoring legacy invoke IO.
- No database column drop is required in the first cut if that would slow delivery; it is enough to stop consuming legacy fields and make them invalid for new approved configs.
- Update canonical docs and seed fixtures in the same change so design and implementation do not drift immediately.
