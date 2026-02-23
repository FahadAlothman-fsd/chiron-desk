# Cross-Work-Unit Invoke Pattern (Parent -> Child)

Date: 2026-02-19
Status: Locked for implementation stories
Scope: Workflow/invoke runtime, gate evaluation, dependency semantics

## Decision

When a parent work unit (for example `WU.EPIC` or `WU.STORY`) needs elicitation/brainstorming support, it invokes a child workflow with `bindingMode = child_work_units` and creates or activates a child `WU.BRAINSTORMING` instance.

Dependency semantics are methodology-defined, not hardcoded in runtime.

- Link/dependency types come from methodology configuration.
- Runtime only evaluates configured link types and strengths.
- Domain labels like `requires_elicitation` or `informed_by_brainstorming` are data keys, not engine enums.

## Why

- Keeps elicitation workflows owned by brainstorming work units.
- Enables reuse from epic/story flows without polluting transition-allowed lists of unrelated work units.
- Preserves clean lineage and auditability (parent execution, child execution, returned evidence).
- Supports both hard-blocking and inform-only behavior through method-defined dependency policy.

## Required Runtime Contract

## 1) Parent -> Child Input Mapping

Parent transition workflow must pass explicit context inputs to the child brainstorming workflow, at minimum:

- `topic`
- `goals`
- `constraints`
- `scope` (optional but recommended)
- `originWorkUnitRef` (parent reference)

## 2) Child -> Parent Output Binding

Child workflow returns structured outputs for parent gate/evidence evaluation, at minimum:

- `elicitation_summary`
- `technique_results[]`
- `decision_notes`
- `recommendations[]`
- `evidenceRefs[]`

## 3) Gate Integration

Parent completion gate policy decides behavior using methodology-defined dependency rules:

- hard requirement: block until required child outcomes are present
- soft requirement: allow progression but attach diagnostics/warnings
- context requirement: informational context only, no blocking

## Pattern Example

```yaml
type: invoke
bindingMode: child_work_units
childWorkUnitTypeKey: brainstorming
activationTransitionKey: draft_to_ready
inputMapping:
  topic: parent.topic
  goals: parent.goals
  constraints: parent.constraints
  scope: parent.scope
  originWorkUnitRef: context.workUnitRef
output:
  mode: variables
  target: parent.elicitation
  selectors:
    - elicitation_summary
    - technique_results
    - decision_notes
    - recommendations
    - evidenceRefs
```

## Guardrails

- Do not hardcode dependency semantics in engine code.
- Do not require cyclic hard dependencies between parent and child.
- Keep dependency interpretation in gate evaluation policy, sourced from methodology definitions.
- Persist parent-child lineage and returned evidence for diagnostics and audit.

## Story Placement Guidance

Implement this pattern in workflow-related epics/stories (the runtime/kernel set), not methodology-bootstrap stories:

- invoke execution behavior (child creation/activation)
- input mapping resolver and validation
- output capture and parent binding
- gate evaluator dependency interpretation
