# Workflow Editor Form Step Dialog

This document defines the stable methodology Workflow Editor contract for the `form.v1` step dialog, aligned with the locked Epic 3 baseline in `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md` sections 6.3 and 6.4.

## Scope

- This is the design-time contract for `form.v1`.
- Form fields read from canonical project or work-unit data and store reusable workflow-local values in `context.*`.
- The contract prioritizes deterministic validation, typed paths, and explicit cardinality.

## Contract goals

- Separate source lookup from stored target naming.
- Keep path persistence canonical and migration-safe.
- Make field typing and cardinality explicit.
- Keep validation deterministic and diagnostics-driven.

## Core contract

```ts
type FormStepConfigV1 = {
  stepConfigVersion: "form.v1";

  overview: {
    stepKey: string;
    stepName: string;
    submitLabel?: string;
    title?: string;
    message?: string;
  };

  fields: FormFieldConfigV1[];
  guidance?: { human?: string; agent?: string };
};

type FormFieldConfigV1 = {
  label: string;
  fieldKey: string;
  sourcePath: string;
  valueType: "string" | "number" | "boolean" | "json" | "ref";
  cardinality: "single" | "set";
  required?: boolean;
  validation?: FormFieldValidationV1;
};

type FormFieldValidationV1 =
  | { kind: "none" }
  | { kind: "path" }
  | { kind: "allowed-values"; values: unknown[] }
  | { kind: "json-schema"; valueSchema: Record<string, unknown> };
```

## Variable model

Each field separates where the value comes from from where it is stored:

- `sourcePath` is the canonical read or prefill source.
- `fieldKey` is the reusable workflow-local key, persisted later as `context.<fieldKey>`.
- `cardinality` models `single` vs `set` directly on the stored contract.

Supported source namespaces in v1:

- `project.facts.<factKey>`
- `project.workUnits`
- `project.workUnits.<workUnitKey>`
- `project.workUnits.<workUnitKey>.facts.<factKey>`
- `self.facts.<factKey>`
- `context.<fieldKey>` for later-step reuse

## Path and validation rules

- UI may show segmented selectors such as `project > facts > projectType`.
- Persisted values must use canonical dot notation such as `project.facts.projectType`.
- Types for `project.*` and `self.*` sources inherit from canonical definitions.
- Types for `context.*` fields are declared by the step contract.
- Changing cardinality requires immediate revalidation of dependent configuration.

## Editor behavior

- The form dialog uses `Overview`, `Fields`, and `Guidance` tabs.
- Field editing uses stacked dialogs:
  - Level 1: basics (`label`, `fieldKey`, `sourcePath`, `required`)
  - Level 2: type and cardinality
  - Level 3: validation
- JSON fields define `valueSchema` in validation, not inline in the table.
- Findings and inline field errors stay synchronized.
- Unsaved edits persist across tab switches until save or discard.

### Dialog wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — FORM                                                            │
│ Tabs: [Overview] [Fields] [Guidance]                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Overview                                                                     │
│ - Step Key                                                                   │
│ - Step Name                                                                  │
│ - Submit Label                                                               │
│                                                                              │
│ Fields                                                                       │
│ ┌──────────────────────────────────────────────────────────────────────────┐  │
│ │ Label         Field Key      Kind      Source Path                    │  │
│ │ Project Type  projectType    project   project > facts > projectType  │  │
│ │ Target WUs    targetWUs      project   project > workUnits            │  │
│ │ Goal          goal           self      self > facts > goal             │  │
│ └──────────────────────────────────────────────────────────────────────────┘  │
│ [ + Add Field ] [Edit selected]                                              │
│                                                                              │
│ Field editing uses stacked dialog (recommended pattern):                      │
│ - Level 1: Field Basics (label, fieldKey, kind, sourcePath, required)       │
│ - Level 2: Type/Cardinality (type when needed, single|set)                  │
│ - Level 3: Validation (none/path/allowed-values/json-schema)                │
│                                                                              │
│ JSON-specific rule:                                                           │
│ - If valueType = json, user can define `valueSchema` in Validation level.   │
│ - `valueSchema` is stored with the field config (schema object/json text).   │
│ - UI offers a schema editor area in the stacked dialog (not inline in table).│
│                                                                              │
│ Path representation rule:                                                     │
│ - UI shows segmented path (e.g., project > facts > projectType).            │
│ - Persisted value uses canonical dot path (e.g., project.facts.projectType).│
│                                                                              │
│ Guidance                                                                     │
│ - Human guidance                                                             │
│ - Agent guidance                                                             │
│                                                                              │
│ Findings + inline field errors                                               │
│ Actions: [Cancel] [Save]                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Expected runtime behavior

- Later form steps may read or update `context.*` values created earlier in the same workflow path.
- Completion is deterministic and validation-driven.
- No extension-authority shortcuts are allowed.

## Deprecated legacy shape

The following older fields are not authoritative for Epic 3 implementation:

- `dataSource`
- `outputVariable`
- `multiple`
- table/search datasource abstractions as the primary authority model

When older docs mention those concepts, reinterpret them through `sourcePath`, `fieldKey`, typed validation, and explicit cardinality.
