# Workflow Variables + Entity Capture Model (Methodology Builder)

Date: 2026-03-11
Status: DRAFT (awaiting approval)

## Problem
A methodology builder needs a workflow variable system that:
- minimizes ambiguity (especially around plural sources and cardinality)
- enables automation (steps can consume typed context reliably)
- supports deterministic branching (branch steps pick paths reproducibly)
- remains auditable and compatible with execution replay and pinned workflow versions

Two recurring tradeoffs:
1) Variables authored as source-bound fields with inherited cardinality vs variables always created explicitly in the execution context.
2) Selected entities (e.g., work units) represented by reference-only vs snapshot capture.

## Goals
- Deterministic branching based on stable, validated inputs.
- Predictable variable resolution rules across scopes.
- Explicit cardinality to prevent "sometimes one, sometimes many" behavior.
- Reproducible executions pinned to workflow definition versions.

## Non-Goals
- Free-form expression language for conditions.
- Implicit IO (filesystem existence, network calls) as part of variable resolution.
- Automatically keeping snapshots up-to-date without an explicit refresh step.

## Baseline Alignment (existing repo direction)
- Variable scopes and precedence: step -> execution -> project -> global.
- Step writes are staged; only explicit outputs are promoted to execution scope.
- Branch steps read variables and do not mutate them; conditions are an ADT (no string expressions).

## Recommended Model (robust default)

### 1) Two layers: Authoring bindings, Runtime explicit variables
Authoring-time UX may let users pick "sources" (project/work item/git/etc), but runtime must only see explicit, declared variables.

- Authoring concept: Binding
  - a declaration that a variable is derived from a source, plus a deterministic transform.
- Publish-time compilation:
  - compile bindings into a deterministic "derive plan" that materializes variables into the execution's initial context snapshot.
- Runtime:
  - steps read explicit variables from variable-service; they do not implicitly resolve sources.

This keeps authoring ergonomic while preventing runtime ambiguity.

### 2) Variable declarations are mandatory for workflow-visible keys
Every workflow-visible variable key must be declared in the workflow definition contract.

Suggested declaration fields:
- key: string (namespaced)
- varType: primitive | json | entity_ref | entity_snapshot | ...
- cardinality: one | many
- scope: step | execution | project | global
- mutability: read_only | step_write | explicit_op
- sensitivity: normal | secret (redaction/persistence rules)
- provenance: system | derived | user_input | tool_output

Runtime rule:
- Steps may write only to declared output keys (and only within allowed scopes).
- Ad-hoc keys are restricted to step scope under a reserved namespace (e.g., scratch.*) and cannot be promoted unless mapped to a declared output.

### 3) Cardinality never "inherits" without an explicit aggregator
If a source can produce plural results, the binding MUST specify an aggregator.

- If source cardinality is inherently "many" (linked entities, search results), the binding must pick one of:
  - selectOneById(idVar)
  - firstSorted(sortKey, direction)
  - count()
  - map/pluck(field) into many

Determinism rules for aggregators:
- Any selection from many requires a stable sort key (or a stable identifier match).
- If no stable sort key exists, publish is blocked (diagnostic: NONDETERMINISTIC_SELECTION).

### 4) Deterministic branching constraints
Branch steps can only depend on branch-safe values.

- Allowed in branch conditions:
  - boolean/number/string (or enums) in execution/step scope
  - derived scalars like count, equals, contains
- Disallowed directly:
  - objects and arrays
  - project/global mutable values unless they were materialized into execution scope at start (or at a prior explicit refresh step)

Validation rule:
- If a branch condition references a non-scalar variable, publish is blocked.

### 5) Selected entities use "ref + snapshot" (default)
When a workflow "selects" an entity like a work unit, store two variables:

- <entity>.ref (reference)
  - stable identifiers (e.g., projectId + workItemId)
  - optional etag/updatedAt for staleness detection
  - optional selection metadata (selector criteria)

- <entity>.snapshot (snapshot)
  - immutable JSON used for:
    - branching
    - templates/prompts
    - audit/replay

Determinism rule:
- Branching reads snapshots (or other execution-scope materialized values), not live references.

"Live" behavior rule:
- If a workflow wants latest data, it must run an explicit refresh/fetch step that updates the snapshot (and records an audit event).

### 6) Audit and replay posture
- Record variable write events with:
  - key, scope, writer step, source type (form/tool/derive), and timestamps
  - do not log variable values; redact secrets
- Execution can be replayed deterministically against:
  - pinned workflow definition version
  - recorded variable history and snapshots

## Comparison: architecture tradeoffs

### A) Source-bound fields with inherited cardinality
Pros:
- Fast authoring and fewer explicit variables.

Cons / failure modes:
- "Sometimes one, sometimes many" behavior when source data changes.
- Ordering ambiguity (which linked item is "the" one?).
- Branching becomes nondeterministic if it implicitly depends on current external state.

Guardrails (if chosen):
- require aggregator whenever source is many
- require stable sort key
- disallow branch steps from reading live-resolved fields

### B) Always-new context variables (explicit variables only)
Pros:
- Deterministic, validation-friendly, stable for automation.
- Matches strict template mode and branch-step contract style.

Cons:
- More verbose authoring without builder assistance.

Mitigation:
- builder generates variable declarations + derive bindings by default

### C) Recommended hybrid (author source-bound, runtime explicit)
Pros:
- Ergonomic authoring; deterministic runtime.
- Clear place to enforce guardrails (publish-time compilation + validation).

Cons:
- Requires a compile/normalization layer.

## Comparison: reference-only vs snapshot capture

### Reference-only
Pros:
- Small payload; always "current".

Cons / failure modes:
- Branch outcomes can change if entity mutates mid-execution.
- Replay becomes best-effort (depends on current DB state).

Guardrails:
- only allow reference-only for display-only steps
- block branch conditions that depend on live ref resolution

### Snapshot capture
Pros:
- Fully deterministic branching and replay.

Cons:
- Snapshot can be stale.

Guardrails:
- staleness detection via ref etag/updatedAt
- explicit refresh step updates snapshot

### Recommended: ref + snapshot
Pros:
- Deterministic by default while allowing intentional refresh.

## Failure modes and guardrails (canonical list)
- Nondeterministic selection from many: require aggregator + stable sort key, else publish-block.
- Silent shadowing across scopes: warn/block when a write targets an existing key in a higher scope unless declaration allows override.
- Type drift in outputs: enforce runtime decode against declared varType; fail step and record diagnostic.
- Branching on non-branch-safe values: publish-block.
- Snapshot bloat: impose size limits per snapshot and store large payloads as typed output refs if needed.
- Dangling refs: refresh/fetch step must validate existence and fail with explicit error codes.

## Open questions
- Whether runtime should allow inventing new workflow-visible keys at all (current recommendation: no; only scratch.* step-local keys).
