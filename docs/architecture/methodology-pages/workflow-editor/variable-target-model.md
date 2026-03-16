# Variable Target Model

This document extracts the shared variable-target rules reused across Epic 3 methodology Workflow Editor authoring surfaces, grounded in `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md` sections 6.3 through 6.10 and aligned with the promoted methodology-page docs under `docs/architecture/`.

## Scope

- This is the shared authority for canonical variable and target-path semantics across form, branch, agent, action, display, and invoke authoring.
- It defines how `sourcePath`, `fieldKey`, `cardinality`, and related target references should be interpreted when stored in step contracts.
- It does not redefine step-specific UI shells or per-step runtime execution models.

## Model goals

- Separate read or prefill source selection from persisted workflow-local naming.
- Keep path storage canonical and migration-safe.
- Make type and cardinality expectations explicit across all step families.
- Reuse one namespace model instead of restating March 11 baseline prose in each page-level spec.

## Core terms

- `sourcePath` is the canonical read or prefill source for a field, selector, or binding.
- `fieldKey` is the workflow-local variable key authored by the editor and later persisted as `context.<fieldKey>`.
- `cardinality` expresses whether the stored or referenced value is `single` or `set`.
- Canonical variable paths use dot notation such as `project.facts.projectType` or `context.selectedWorkflowRef`.

## Canonical path families

These are the broadly reusable canonical path families across Epic 3 authoring surfaces:

- `project.*`
- `self.*`
- `context.*`

Common structured descendants reused across current contracts and the March 11 baseline include:

- `project.facts.<factKey>`
- `project.workUnits`
- `project.workUnits.<workUnitKey>`
- `project.workUnits.<workUnitKey>.facts.<factKey>`
- `self.facts.<factKey>`
- `context.<fieldKey>`

This shared model intentionally defines the path families and their canonical dot-path persistence, not the full allowed-selector matrix for every step. Per-step restrictions, non-path selectors, read-only rules, and write-scope limits remain owned by each promoted step-specific doc.

## Persistence semantics

- UI may present segmented selectors such as `project > workUnits > WU.SETUP > facts > status`.
- Persisted values must use canonical dot notation such as `project.workUnits.WU.SETUP.facts.status`.
- `fieldKey` never stores a fully qualified path by itself. Its persisted workflow-local target is always interpreted as `context.<fieldKey>`.
- Form prefill and branch condition selection read from canonical source namespaces without rewriting the underlying stored path model.
- Invoke, agent, and action configuration may store target references through fields such as `workflowRefVariable`, `targetVariable`, `outputTarget`, `variablePath`, `requiredVariables`, or `childRefsOutputVariable`; those references still participate in the same canonical namespace-family and dot-path rules.

## Type and cardinality rules

- For canonical `project.*` and `self.*` descendants backed by methodology or runtime definitions, type is inherited from those definitions.
- For `context.*` values introduced by a step contract, type is declared by that contract and then reused by later steps.
- `cardinality` is modeled explicitly as `single` or `set` and must be validated against the selected source or target.
- Changing `cardinality` requires immediate revalidation of dependent configuration, including operators, bindings, and selector compatibility.

## Cross-step reuse semantics

- Later form steps may read or update `context.*` values created by earlier form steps in the same workflow execution path.
- Branch authoring may read direct canonical paths instead of depending only on prior form outputs, but branch-specific operator coverage and exact readable descendants remain owned by the promoted branch contract.
- Agent authoring may bind inputs from canonical variable paths, but agent-specific selector catalogs and non-path selectors remain owned by the agent contract.
- Action authoring may write only to declared allow-listed targets, and the exact writable descendants remain owned by the action contract.
- Display interpolation may read canonical variable paths, but display remains read-only and its exact allowed interpolation scope remains owned by the promoted display contract.
- Invoke authoring may reference workflow or child-output variables through canonical dot paths, but invoke v1 does not add a separate IO mapping layer and its accepted variable fields remain owned by the invoke contract.

## Authoring guidance

- Treat this document as the shared reference when a page spec needs variable-path behavior, namespace examples, or canonical dot-path persistence rules.
- Use `docs/architecture/methodology-pages/workflow-editor/form-step.md` for form-specific field schema and validation rules.
- Use `docs/architecture/methodology-pages/workflow-editor/agent-step.md`, `docs/architecture/methodology-pages/workflow-editor/invoke-step.md`, and `docs/architecture/methodology-pages/workflow-editor/action-step.md` for promoted step-specific restrictions.
- Use `docs/architecture/methodology-pages/workflow-editor/branch-step.md` and `docs/architecture/methodology-pages/workflow-editor/display-step.md` for promoted branch/display specifics.
- Use `docs/architecture/ux-patterns/rich-selectors.md` for selector interaction rules and stacked dialog behavior.
