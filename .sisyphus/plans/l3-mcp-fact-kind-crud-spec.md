# L3 MCP Fact-Kind CRUD Spec

## Purpose

This document progressively defines the agent/MCP read and write model for workflow-context facts.

The goal is to replace the current proposal/apply-only MCP surface with a fact-aware CRUD model that matches the Plan B runtime fact architecture.

This spec is written incrementally, one workflow context fact kind at a time.

---

## Locked assumptions

### 1. Public MCP fact identity uses the context fact key

For MCP-facing read/write operations, the public identifier should be the **workflow context fact key**.

Examples:

- `summary`
- `research_topic`
- `setup_branch_note`

The server may continue to resolve that key to an internal `contextFactDefinitionId`, but that resolution is backend-only.

### 2. Separate `writeItemId` / `readItemId` should not remain the public runtime API

Current runtime contracts still model separate authored identifiers like `writeItemId` and `readItemId`, but those are implementation-era artifacts rather than the desired public contract.

For the redesigned MCP surface:

- public read identity = context fact key
- public write identity = context fact key

### 3. Context fact label is just the context fact name

The display label for an MCP-exposed context fact should come from the workflow context fact label/name.

Separate per-write-item label overrides are not part of the desired public contract.

### 4. CRUD operations are fact-kind aware

The action names are shared across the MCP surface:

- `create`
- `update`
- `remove`
- `delete`

But their meaning depends on the workflow context fact kind.

### 5. `delete` is reserved for external-deletion semantics

`delete` is not a universal operation.

It is reserved for fact kinds where deletion has external propagation semantics, especially:

- `bound_fact`
- `artifact_slot_reference_fact`

For self-contained workflow-context facts like `plain_fact`, `delete` is invalid and `remove` is the destructive operation.

### 6. JSON validation is layered and runtime-authoritative

For JSON-backed values, runtime validation has three layers:

1. generic JSON-schema validation
2. subfield existence / closed object shape validation
3. structured subfield cardinality/type/field-level validation

The runtime validator is authoritative even when the stored schema shape is not a pure off-the-shelf JSON Schema representation.

---

## Current implementation notes that this spec intentionally corrects

These are observations about current code, not desired end-state rules.

- Current MCP write input still uses `{ writeItemId, valueJson }`
- Current agent-step runtime contracts still model `writeItemId` separately from `contextFactDefinitionId`
- Current runtime fact validation already supports the Plan B CRUD model outside MCP
- Current JSON validation already mixes generic schema checks and explicit runtime field checks

This spec defines the target MCP/runtime contract, not the current limitation.

---

## MCP surface direction

This spec assumes the MCP surface should be split by operation rather than forced into one generic write tool.

### Read categories

The read model will likely need at least these categories:

1. **read fact schema**
   - what the fact is
   - cardinality
   - validation
   - admissible actions

2. **read context-fact instances**
   - actual existing workflow-context instances
   - latest/all
   - optional `limit`
   - optional list of `instanceIds`

3. **read external attachable instances**
   - only for fact kinds that proxy or reference external entities
   - examples: existing workflows, existing project work units, existing attachable bound fact instances

### Write categories

The write model will likely need operation-specific tools or a single tool with an explicit `verb` field. This spec is operation-first either way.

Supported action names:

- `create`
- `update`
- `remove`
- `delete`

The rest of this file defines what each means per fact kind.

---

## Workflow context fact kinds covered by this spec

- `plain_fact`
- `bound_fact`
- `workflow_ref_fact`
- `work_unit_reference_fact`
- `artifact_slot_reference_fact`
- `work_unit_draft_spec_fact`

---

# `plain_fact`

## Meaning

A `plain_fact` is a self-contained workflow-context-owned value.

It does **not** attach to an external fact instance, workflow instance, work-unit instance, or artifact instance.

It stores a direct value whose primitive family is defined by the fact definition:

- `string`
- `number`
- `boolean`
- `json`

## Public MCP identity

For MCP-facing operations, `plain_fact` is addressed by the **context fact key**.

Example:

```json
{
  "factKey": "summary"
}
```

## Canonical persisted value shape

The persisted runtime value is the direct typed value, with no envelope.

### String example

```json
"Approved summary"
```

### Number example

```json
42
```

### Boolean example

```json
true
```

### JSON example

```json
{
  "title": "Offline sync",
  "priority": 1,
  "constraints": ["local-first", "eventual consistency"]
}
```

## Allowed actions

### `create`

Meaning:

- create a new workflow-context instance for this fact

Allowed when:

- cardinality = `many`, or
- cardinality = `one` and no current instance exists

Canonical request shape:

```json
{
  "factKey": "summary",
  "value": "Approved summary"
}
```

Effects:

- creates a workflow-context fact instance
- updates workflow context only
- does not touch any external fact, work unit, workflow, or artifact

### `update`

Meaning:

- replace one existing workflow-context instance by `instanceId`

Canonical request shape:

```json
{
  "factKey": "summary",
  "instanceId": "ctx-123",
  "value": "Updated summary"
}
```

Effects:

- updates one workflow-context fact instance
- workflow-context only

### `remove`

Meaning:

- remove one workflow-context instance

Canonical request shape:

```json
{
  "factKey": "summary",
  "instanceId": "ctx-123"
}
```

Effects:

- removes one workflow-context fact instance
- workflow-context only

### `delete`

Meaning for `plain_fact`:

- **invalid operation**

Reason:

- `plain_fact` has no external deletion semantics
- `remove` is the destructive terminal operation for one instance
- `delete` is reserved for fact kinds whose external target must be marked for later propagation

## Cardinality rules

### Cardinality = `one`

- `create` is allowed only if no instance exists
- once an instance exists, callers must use `update`
- `remove` removes the single current instance
- `delete` is invalid

### Cardinality = `many`

- `create` adds a new instance
- `update` targets one instance
- `remove` targets one instance
- `delete` is invalid

## Validation rules

Validation for `plain_fact` is runtime-authoritative.

### Primitive family validation

- `string` values must be strings
- `number` values must be numbers
- `boolean` values must be booleans
- `json` values must be JSON-compatible

### String validation

Supported validation patterns include:

- allowed-values membership
- path validation
- string constraints encoded in schema (for example min/max length)

### Number validation

Supported validation patterns include:

- minimum
- maximum
- exclusive minimum
- exclusive maximum

### Boolean validation

- boolean type only

### JSON validation

JSON validation has three explicit layers.

#### Layer 1 — generic JSON-schema checks

The runtime validator may enforce:

- enum membership
- top-level type
- numeric limits
- string length constraints
- array size constraints
- required keys
- `additionalProperties: false`
- nested property schema checks

#### Layer 2 — subfield existence / closed object shape

If the value is an object and the schema defines required fields or a closed property map, the runtime validator enforces that exact object shape.

#### Layer 3 — structured subfield contract

If `subSchema.fields` exists, each declared field has runtime semantics:

- `key` must exist when required by the structured contract
- `cardinality = one` means the field value must be a scalar primitive
- `cardinality = many` means the field value must be an array of primitives
- `type` must match the declared primitive family
- field-level `validation` may impose additional rules

### JSON subfield clarification

For spec purposes, a JSON-backed `plain_fact` field is governed by all three questions:

1. does the subfield key exist in the schema/structured contract?
2. is the subfield cardinality `one` or `many`?
3. does the subfield value satisfy its primitive type and validation?

This means an agent cannot safely write JSON plain facts from raw intuition; it needs the fact schema/read contract first.

## Read capabilities required for agents

### 1. Read plain-fact schema

The agent must be able to read:

- fact key
- label/name
- primitive family
- cardinality
- validation definition
- admissible actions

### 2. Read plain-fact instances

The agent must be able to read:

- current instances
- latest instance
- all instances
- optional list of `instanceIds`
- optional `limit`

### 3. External attachable instance reads are not needed

Because `plain_fact` has no external attachment target, there is no attachable-instance discovery mode for this kind.

## Response semantics

Successful writes should report:

- operation
- `factKey`
- affected `instanceId`
- normalized stored value
- whether workflow context changed

Example:

```json
{
  "status": "applied",
  "operation": "update",
  "factKey": "summary",
  "instanceId": "ctx-123",
  "value": "Normalized summary",
  "changedContext": true
}
```

## Summary rule

For `plain_fact`:

- `create` = create a new workflow-context instance
- `update` = replace one existing workflow-context instance
- `remove` = remove one workflow-context instance
- `delete` = invalid for this fact kind

All effects are workflow-context-only.

---

## Next section

The next fact kind to define is `bound_fact`.

That section must be more explicit about the difference between:

- mutating the workflow-context attachment
- mutating the referenced external fact value
- removing the attachment
- deleting/marking the external fact for later propagation

---

# `bound_fact`

## Meaning

A `bound_fact` is a workflow-context attachment to an external fact instance.

It does not behave like a plain independent context value.

Instead, the workflow-context instance carries:

- which external fact instance it is bound to
- the effective bound value that should be used during workflow execution and later propagation

This allows workflow execution to change a fact value locally and propagate it later through the approved runtime/action boundaries.

## Public MCP identity

For MCP-facing operations, `bound_fact` is addressed by the **context fact key**.

Example:

```json
{
  "factKey": "requires_research"
}
```

## Identity rules

This kind has two different identities and they must not be conflated.

### `instanceId`

This is always the **workflow context fact instance id**.

It must keep that meaning consistently across all workflow context fact kinds.

### `factInstanceId`

This is the **external fact instance id** referenced by the bound fact value.

It is specific to `bound_fact` and therefore belongs inside the `value` payload rather than the outer mutation envelope.

## Canonical persisted value shape

The canonical runtime value for a `bound_fact` context fact instance is:

```json
{
  "factInstanceId": "external-fact-instance-id",
  "value": "resolved-or-overridden-bound-value"
}
```

This means:

- outer workflow-context instance identity stays uniform (`instanceId`)
- bound-fact-specific external identity stays inside `value.factInstanceId`

## Compatibility shape

Current compatibility readers still accept legacy envelope variations using `instanceId` or `factInstanceId` directly at the runtime-bound helper layer.

That compatibility is a migration concern, not the desired public MCP contract.

The target MCP/runtime write contract for `bound_fact` should use:

```json
{
  "factInstanceId": "external-fact-instance-id",
  "value": ...
}
```

inside the fact-kind-specific `value` payload.

## Value model

The effective bound value must conform to the underlying external fact definition.

Conceptually, the inner `value` may be backed by an external fact definition of type:

- `string`
- `string` with path/file validation
- `string` with path/folder validation
- `number`
- `number` with min/max validation
- `boolean`
- `json`

The runtime should model this as:

1. an outer bound-fact envelope schema
2. an inner value schema derived from the referenced external fact definition

## Allowed actions

### `create`

Meaning:

- create a new workflow-context bound instance
- attach an external fact instance
- optionally override the external fact’s current value for workflow use/propagation

Canonical request shape:

```json
{
  "factKey": "requires_research",
  "value": {
    "factInstanceId": "fact-123",
    "value": true
  }
}
```

Behavior:

1. resolve the referenced external fact instance
2. read its current underlying value
3. if an override `value` is provided, apply it as the initial workflow-local bound value
4. store the resulting `{ factInstanceId, value }` in the workflow-context instance

For JSON-backed external facts, the provided `value` may be a partial object patch rather than a full replacement object.

The runtime should merge that patch onto the external fact’s current value before storing the effective bound value in workflow context.

### `update`

Meaning:

- update one existing workflow-context bound instance
- optionally retarget it to a different external fact instance
- optionally update the effective bound value

Canonical request shape:

```json
{
  "factKey": "requires_research",
  "instanceId": "ctx-1",
  "value": {
    "factInstanceId": "fact-456",
    "value": {
      "...": "override payload"
    }
  }
}
```

Rules:

- `instanceId` always targets the workflow-context bound instance being updated
- `value.factInstanceId` is optional
- `value.value` is optional
- at least one of them must be present

Behavior:

#### Case A — update bound value only

If `value.factInstanceId` is absent and `value.value` is present:

- keep the current external fact instance attachment
- update the effective bound value only

#### Case B — reattach only

If `value.factInstanceId` is present and `value.value` is absent:

- switch attachment to the new external fact instance
- read that external fact’s current value
- store the resulting bound envelope using the new external fact value

#### Case C — reattach and override

If both are present:

- switch attachment to the new external fact instance
- read the new external fact’s current value
- overlay/replace using the provided payload
- store the resulting effective bound value in the workflow-context instance

For JSON-backed facts, the provided value payload may be partial and should merge onto the selected external fact’s current value.

If neither a replacement `factInstanceId` nor a value payload is supplied, the request is invalid.

### `remove`

Meaning:

- remove the workflow-context bound instance only

Canonical request shape:

```json
{
  "factKey": "requires_research",
  "instanceId": "ctx-1"
}
```

Behavior:

- delete the workflow-context instance
- do not delete the external fact instance
- do not imply any external deletion intent

### `delete`

Meaning:

- mark the external fact instance attached to the targeted workflow-context instance for deletion propagation

Canonical request shape:

```json
{
  "factKey": "requires_research",
  "instanceId": "ctx-1",
  "deleted": true
}
```

Behavior:

- target one workflow-context bound instance by `instanceId`
- mark the attached external fact instance for deletion when later propagated
- this is not the same as removing the workflow-context instance

### Delete toggle semantics

`delete` should be toggleable.

That means the same shape may also be used to unmark the deletion intent:

```json
{
  "factKey": "requires_research",
  "instanceId": "ctx-1",
  "deleted": false
}
```

So for `bound_fact`, `delete` behaves like a propagated deletion-intent toggle rather than a one-way destructive command.

## Cardinality rules

### Cardinality = `one`

- `create` is allowed only if no workflow-context bound instance exists
- once one exists, callers must use `update`, `remove`, or `delete`

### Cardinality = `many`

- `create` may add another workflow-context bound instance
- `update`, `remove`, and `delete` target one existing workflow-context bound instance by `instanceId`

## Validation rules

Validation for `bound_fact` has two layers.

### Layer 1 — bound envelope validation

The runtime must validate:

- `instanceId` targets a real workflow-context instance for update/remove/delete
- `value.factInstanceId` references a real external fact instance when required
- the external fact instance is admissible for the bound fact definition

### Layer 2 — underlying external fact validation

The inner `value.value` must satisfy the schema of the external fact definition referenced by the bound-fact definition.

That includes:

- primitive family checks
- path validation
- allowed-values validation
- number min/max rules
- JSON schema + subfield validation

## JSON update behavior

For JSON-backed external facts:

- `create` may provide only the keys it wants to override
- `update` may provide only the keys it wants to override
- runtime merges the partial payload onto the selected external fact’s current value

This means the write payload does not need to resend the entire JSON object when only part of it is changing.

## Read capabilities required for agents

### 1. Read bound-fact schema

The agent must be able to read:

- context fact key
- label/name
- cardinality
- referenced external fact definition identity
- underlying fact type
- underlying validation
- admissible actions

### 2. Read current workflow-context bound instances

The read should accept:

- context fact key
- optional array of workflow-context `instanceId`s
- optional `limit`

It should return a list where each item contains:

- workflow-context `instanceId`
- external `factInstanceId`
- effective bound `value`

### 3. Read attachable external fact instances

This read is specifically for discovering candidate external fact instances that may be attached to this bound fact.

For the initial version, it should:

- be filtered by the underlying external fact definition
- accept a `limit`
- return the full external fact values

Each returned item should contain:

- external `factInstanceId`
- underlying external fact value

### Deferred functionality

Filtering candidate external fact instances by underlying fact values is explicitly deferred for later MCP work.

The initial read model should not attempt to reuse the condition engine for this.

## Response semantics

Successful writes should report:

- operation
- `factKey`
- targeted workflow-context `instanceId`
- stored bound value shape
- whether workflow context changed

Example create response:

```json
{
  "status": "applied",
  "operation": "create",
  "factKey": "requires_research",
  "instanceId": "ctx-1",
  "value": {
    "factInstanceId": "fact-123",
    "value": true
  },
  "changedContext": true
}
```

## Summary rule

For `bound_fact`:

- `create` = attach external fact instance + optional workflow-local override
- `update` = optional reattach + optional override, but at least one change input must be present
- `remove` = delete workflow-context instance only
- `delete` = toggle propagated deletion intent for the attached external fact instance

This keeps:

- `instanceId` stable as workflow-context identity
- `factInstanceId` inside the bound-fact-specific value payload
- fact-kind-specific semantics contained inside the `value` shape

---

## Next section

The next fact kind to define is `workflow_ref_fact`.

---

# `workflow_ref_fact`

## Meaning

A `workflow_ref_fact` is a workflow-context value that references a workflow definition.

It is self-contained within workflow context, but unlike `plain_fact` its admissible values are constrained by the workflow definitions explicitly allowed on the fact definition.

It does not attach to an external fact instance or work-unit instance.

## Public MCP identity

For MCP-facing operations, `workflow_ref_fact` is addressed by the **context fact key**.

Example:

```json
{
  "factKey": "selected_workflows"
}
```

## Canonical persisted value shape

The canonical runtime value is:

```json
{
  "workflowDefinitionId": "wf-1"
}
```

This shape is already reflected in the runtime contracts.

## Value model

The referenced workflow must belong to the **current work unit type** that owns the running workflow.

This kind is intended for selecting or carrying workflow references inside that work-unit-local workflow family, especially supporting workflows.

So the primary validation rule is not “member of `allowedWorkflowDefinitionIds`” in isolation, but rather:

- the referenced workflow definition belongs to the current work unit type
- the referenced workflow is valid in the current runtime/work-unit-local workflow catalog

If `allowedWorkflowDefinitionIds` exists on the fact definition, it may still act as an additional narrowing hint, but it is not the primary semantic rule in this spec.

## Allowed actions

### `create`

Meaning:

- create a new workflow-context instance containing a workflow definition reference

Canonical request shape:

```json
{
  "factKey": "selected_workflows",
  "value": {
    "workflowDefinitionId": "wf-1"
  }
}
```

Behavior:

- validates that the referenced workflow belongs to the current work unit type and is valid in the current workflow catalog
- creates a new workflow-context instance

### `update`

Meaning:

- replace one existing workflow-context instance with a different workflow definition reference

Canonical request shape:

```json
{
  "factKey": "selected_workflows",
  "instanceId": "ctx-1",
  "value": {
    "workflowDefinitionId": "wf-2"
  }
}
```

Behavior:

- targets the workflow-context instance by `instanceId`
- validates that the replacement workflow belongs to the current work unit type and is valid in the current workflow catalog
- replaces the referenced workflow definition for that one context instance

### `remove`

Meaning:

- remove one workflow-context reference instance only

Canonical request shape:

```json
{
  "factKey": "selected_workflows",
  "instanceId": "ctx-1"
}
```

Behavior:

- deletes one workflow-context instance
- no external deletion semantics are implied

### `delete`

Meaning for `workflow_ref_fact`:

- **invalid operation**

Reason:

- this kind references workflow definitions, not external runtime resources that should be marked for deletion propagation
- `remove` is the destructive operation here

## Cardinality rules

### Cardinality = `one`

- `create` is allowed only if no current instance exists
- once one exists, callers must use `update` or `remove`
- `delete` is invalid

### Cardinality = `many`

- `create` may add another workflow reference instance
- `update` targets one existing workflow-context instance
- `remove` targets one existing workflow-context instance
- `delete` is invalid

## Validation rules

Validation for `workflow_ref_fact` is straightforward and runtime-authoritative.

The runtime must validate:

- the provided `workflowDefinitionId` is present
- the referenced workflow definition belongs to the current work unit type
- the referenced workflow definition is visible in the current runtime workflow catalog for that work unit type

`allowedWorkflowDefinitionIds` may be used as an optional narrowing layer, but current-work-unit workflow membership is the primary rule.

No extra external attachment envelope is involved.

## Read capabilities required for agents

### 1. Read workflow-ref schema

The agent must be able to read:

- context fact key
- label/name
- cardinality
- current work unit type workflow scope
- admissible actions

### 2. Read current workflow-context reference instances

The read should accept:

- context fact key
- optional array of workflow-context `instanceId`s
- optional `limit`

It should return a list where each item contains:

- workflow-context `instanceId`
- referenced `workflowDefinitionId`
- workflow description
- workflow agent guidance

### 3. Read attachable workflows

This read is specifically for discovering the workflows that may be attached to this fact.

For the initial version, it should:

- derive candidates from workflows belonging to the current work unit type
- optionally narrow further using `allowedWorkflowDefinitionIds` if the definition supplies them
- accept a `limit`
- return workflow identity metadata sufficient for selection

Each returned item should contain:

- `workflowDefinitionId`
- workflow key
- display label/name if available
- workflow description
- workflow guidance

### Deferred functionality

Filtering workflows by richer workflow metadata or condition-engine style predicates is explicitly deferred.

Initial attachable-workflow discovery should remain definition-scoped and simple.

## Response semantics

Successful writes should report:

- operation
- `factKey`
- targeted workflow-context `instanceId`
- stored workflow reference shape
- whether workflow context changed

Example create response:

```json
{
  "status": "applied",
  "operation": "create",
  "factKey": "selected_workflows",
  "instanceId": "ctx-1",
  "value": {
    "workflowDefinitionId": "wf-1"
  },
  "changedContext": true
}
```

## Summary rule

For `workflow_ref_fact`:

- `create` = create a workflow-context workflow-definition reference
- `update` = replace one workflow-context workflow-definition reference
- `remove` = remove one workflow-context reference instance
- `delete` = invalid for this fact kind

This keeps `workflow_ref_fact` simple:

- no external instance attachment
- no propagated deletion semantics
- no special inner envelope beyond `{ workflowDefinitionId }`
- semantic scope anchored to the current work unit’s workflow family, especially supporting workflows

---

## Next section

The next fact kind to define is `work_unit_reference_fact`.

---

# `work_unit_reference_fact`

## Meaning

A `work_unit_reference_fact` is a workflow-context relationship from the current runtime scope to another project work unit.

It represents a runtime reference edge, not a free-form JSON payload.

At design time, this edge is defined against:

- `linkTypeDefinitionId`
- `targetWorkUnitDefinitionId`

For this spec, those should be treated as always-present design-time semantics.

## Public MCP identity

For MCP-facing operations, `work_unit_reference_fact` is addressed by the **context fact key**.

Example:

```json
{
  "factKey": "setup_work_unit"
}
```

## Canonical persisted value shape

The authored runtime value is centered on:

```json
{
  "projectWorkUnitId": "wu-123"
}
```

At persistence boundaries, this behaves more like a reference edge than a rich JSON object.

## Value model

The referenced target is always a **project work unit instance**.

The current clearly evidenced runtime rules are:

- the target work unit must exist
- the target work unit must belong to the same project

The reference is therefore always interpreted through:

- a target work-unit type constraint
- a link-type constraint

Even where current runtime enforcement may still be thinner than the full contract intent, this spec treats both constraints as required design-time inputs.

## Allowed actions

### `create`

Meaning:

- create a new workflow-context instance containing a reference to a project work unit

Canonical request shape:

```json
{
  "factKey": "setup_work_unit",
  "value": {
    "projectWorkUnitId": "wu-123"
  }
}
```

Behavior:

- validates that the target project work unit exists
- validates that it belongs to the same project
- validates that it matches the required `targetWorkUnitDefinitionId`
- validates against the required `linkTypeDefinitionId` semantics when applicable
- creates a new workflow-context reference instance

### `update`

Meaning:

- replace one existing workflow-context reference instance with a different target project work unit

Canonical request shape:

```json
{
  "factKey": "setup_work_unit",
  "instanceId": "ctx-1",
  "value": {
    "projectWorkUnitId": "wu-456"
  }
}
```

Behavior:

- targets the workflow-context instance by `instanceId`
- validates the new target work unit
- replaces the referenced target for that one context instance

### `remove`

Meaning:

- remove one workflow-context reference instance only

Canonical request shape:

```json
{
  "factKey": "setup_work_unit",
  "instanceId": "ctx-1"
}
```

Behavior:

- deletes one workflow-context instance
- does not delete the target project work unit

### `delete`

Meaning for `work_unit_reference_fact`:

- **invalid operation**

Reason:

- this kind references project work units, not deletable external fact/artifact resources in the `delete`-toggle sense
- `remove` is the destructive operation here

## Cardinality rules

### Cardinality = `one`

- `create` is allowed only if no current instance exists
- once one exists, callers must use `update` or `remove`
- `delete` is invalid

### Cardinality = `many`

- `create` may add another work-unit reference instance
- `update` targets one existing workflow-context instance
- `remove` targets one existing workflow-context instance
- `delete` is invalid

## Validation rules

Validation for `work_unit_reference_fact` is runtime-authoritative.

The runtime must validate:

- the provided `projectWorkUnitId` is present
- the referenced project work unit exists
- the referenced project work unit belongs to the same project
- the referenced project work unit matches the required `targetWorkUnitDefinitionId`
- the relationship is authored under the required `linkTypeDefinitionId`

For this spec, target-type and link-type constraints are not optional hints; they are part of the intended contract.

## Read capabilities required for agents

### 1. Read work-unit-reference schema

The agent must be able to read:

- context fact key
- label/name
- cardinality
- `targetWorkUnitDefinitionId`
- `linkTypeDefinitionId`
- admissible actions

### 2. Read current workflow-context reference instances

The read should accept:

- context fact key
- optional array of workflow-context `instanceId`s
- optional `limit`

It should return a list where each item contains:

- workflow-context `instanceId`
- referenced `projectWorkUnitId`
- target work unit label/name
- target work unit type key/name
- current state summary if available

### 3. Read attachable work units

This read is specifically for discovering candidate project work units that may be attached to this fact.

For the initial version, it should:

- be scoped to the current project
- always constrain candidates to the required `targetWorkUnitDefinitionId`
- accept a `limit`
- return identity metadata and fact-value summaries

Each returned item should contain:

- `projectWorkUnitId`
- work unit label/name
- work unit type key/name
- current state summary if available
- fact summaries when fact instances exist

### Fact-value read behavior for attachable work units

Attachable work-unit reads should surface fact values when they exist.

Default behavior:

- if a work-unit fact is cardinality `one`, return the current value directly in the summary view
- if a work-unit fact is cardinality `many`, return one representative/current value and indicate that multiple instances exist

Targeted behavior:

- if the caller targets a specific attached or attachable `projectWorkUnitId`, the read may return the full fact instance set for that work unit

This allows agents to:

- browse candidates efficiently
- see enough current fact context to decide which work unit to attach
- request full fact-instance detail only when needed

### Deferred functionality

Advanced filtering across work-unit fact values is deferred.

The initial attachable-work-unit read should focus on:

- project-scoped discovery
- target-type filtering
- limit
- summarized fact/value context

## Response semantics

Successful writes should report:

- operation
- `factKey`
- targeted workflow-context `instanceId`
- stored reference shape
- whether workflow context changed

Example create response:

```json
{
  "status": "applied",
  "operation": "create",
  "factKey": "setup_work_unit",
  "instanceId": "ctx-1",
  "value": {
    "projectWorkUnitId": "wu-123"
  },
  "changedContext": true
}
```

## Summary rule

For `work_unit_reference_fact`:

- `create` = create a workflow-context reference to a project work unit
- `update` = replace one workflow-context work-unit reference
- `remove` = remove one workflow-context reference instance
- `delete` = invalid for this fact kind

This keeps `work_unit_reference_fact` centered on runtime relationship edges:

- the authored value shape is `{ projectWorkUnitId }`
- reads can expose richer target work-unit metadata
- attachable-work-unit reads should also expose summarized fact values when available

---

## Next section

The next fact kind to define is `artifact_slot_reference_fact`.
