# Transition Condition + Binding Ownership Design

## Decision Summary

Chosen approach: **Single Owner per concern (Option 1)**.

- `transition.upsert` owns transition metadata only (`transitionKey`, `fromState`, `toState`).
- `transition.conditionSet.update` owns transition condition sets (start/completion gates).
- `transition.binding.update` owns workflow bindings for a transition (bulk replace per transition).

This removes overlapping writes and prevents condition sets from being accidentally overwritten by transition-upsert operations.

---

## Current Problem

The current system allows condition sets to be written via two paths:

1. `transition.upsert` path writes condition sets.
2. `transition.conditionSet.update` path also writes condition sets.

Because both handlers perform replace-style writes for the same transition-level condition-set data, ownership is ambiguous and can cause unintended overwrites.

---

## Target Architecture

### 1) Transition metadata owner

**Handler**: `version.workUnit.stateMachine.transition.upsert`

**Owns**:
- transition identity and state links

**Must not own**:
- condition set records
- workflow binding records

### 2) Condition set owner

**Handler**: `version.workUnit.stateMachine.transition.conditionSet.update`

**Owns**:
- condition-set rows for a single transition
- start and completion gate configurations

**Data model note**:
- UI semantics target two phase records (start/completion).
- Endpoint should remain tolerant to payload ordering and idempotent replacement behavior.

### 3) Binding owner

**Handler**: `version.workUnit.stateMachine.transition.binding.update`

**Owns**:
- workflow bindings for a single transition

**Bulk semantics**:
- bulk replace per transition is acceptable and desirable for reorder/add/remove behavior.

---

## Dialog Save Flow (Single Action UX)

Transition dialog save should orchestrate three calls in one user action:

1. `transition.upsert` (metadata only)
2. `transition.conditionSet.update` (start/completion gates)
3. `transition.binding.update` (bulk workflow bindings)

Then invalidate/refetch the relevant state-machine snapshot once after successful completion.

### Why this is still “single save”

Even though multiple handlers are invoked, each handler has clear ownership and the user still experiences one save action.

### Create-vs-update sequencing

Yes — for **new transitions**, the transition must be created first so downstream handlers can resolve the transition by key/id in persistence.

- For a new transition: run `transition.upsert` first, then condition sets and bindings.
- For an existing transition: the same order is still safe and keeps behavior deterministic.

This sequencing is intentional and part of the ownership model.

---

## Retrieval Model

Read behavior remains explicit and composable:

- `transition.list` provides transition metadata.
- `transition.conditionSet.list` provides gate definitions by transition.
- `transition.binding.list` provides bound workflow keys by transition.

This supports clear hydration when reopening transition dialogs.

---

## Error Handling & Consistency

- If any save step fails, keep dialog open and surface step-specific errors.
- Do not silently mutate unrelated domains.
- Preserve idempotency for condition-set and binding updates.

### Hardening rule

Server should enforce ownership boundaries by ensuring `transition.upsert` does not mutate condition sets.

---

## API / Service / Repository Direction

1. Remove condition-set persistence from transition-upsert repository/service path.
2. Keep condition-set update through dedicated condition-set path only.
3. Keep binding update as bulk-per-transition replace.
4. Keep condition-set and binding list handlers as read sources for dialog hydration.

---

## Test Strategy

### API + service tests

- `transition.upsert` updates transition metadata only.
- `conditionSet.update` updates only condition-set rows.
- `binding.update` updates only transition-binding rows.
- no overlapping writes across domains.

### Integration tests

- transition dialog save updates metadata + gates + bindings in one flow.
- reopening dialog loads the same start/completion conditions and bindings.
- failure in one step is surfaced clearly and does not mask partial state.

### Regression coverage

- verify no condition-set writes happen inside transition-upsert path.
- verify conditionSet.list + binding.list are authoritative retrieval sources.

---

## Non-Goals

- No redesign of lifecycle state CRUD behavior in this change.
- No cross-transition bulk operation for condition sets.
- No workflow execution/runtime behavior changes; this is design-time authoring ownership cleanup only.
