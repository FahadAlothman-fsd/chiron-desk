# Workflow Editor Branch Step Dialog

This document defines the stable methodology Workflow Editor contract for the `branch.v1` step dialog, aligned with the locked Epic 3 baseline in `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md` section 6.4.

## Scope

- This is the design-time contract for `branch.v1`.
- Branch steps evaluate read-only workflow data and choose the next route.
- They do not mutate variables, facts, or artifacts.

## Contract goals

- Keep branching typed, explicit, and versioned.
- Support nested condition-builder semantics without falling back to free-form expressions.
- Allow direct routing from canonical target namespaces, not only prior form outputs.
- Keep runtime route selection deterministic, including the default route path.

## Core contract

```ts
type BranchStepConfigV1 = {
  stepConfigVersion: "branch.v1";

  overview: {
    stepKey: string;
    stepName: string;
    title?: string;
    message?: string;
  };

  rootMode: "ALL" | "ANY";
  conditions: BranchConditionNode[];
  matchRoute: BranchRouteTarget;
  defaultRoute?: BranchRouteTarget;

  guidance?: {
    human?: string;
    agent?: string;
  };
};

type BranchConditionNode = BranchConditionRule | BranchConditionGroup;

type BranchConditionRule = {
  kind: "rule";
  variablePath: string;
  valueType: "string" | "number" | "boolean" | "json" | "ref";
  cardinality: "single" | "set";
  operator: BranchOperator;
  value?: unknown;
};

type BranchConditionGroup = {
  kind: "group";
  mode: "ALL" | "ANY";
  conditions: BranchConditionNode[];
};

type BranchRouteTarget = {
  nextStep: string;
  label?: string;
};

type BranchOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "in"
  | "empty"
  | "not_empty"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "is_true"
  | "is_false"
  | "exists"
  | "not_exists"
  | "is_set"
  | "not_set"
  | "not_contains"
  | "size_eq"
  | "size_gt"
  | "size_lt";
```

## Target namespace model

`branch.v1` conditions can read directly from the canonical workflow target namespaces locked on March 11:

- `project.facts.<factKey>`
- `self.facts.<factKey>`
- `project.workUnits`
- `project.workUnits.<workUnitKey>`
- `project.workUnits.<workUnitKey>.facts.<factKey>`
- `context.<fieldKey>`

UI may present these through a segmented selector such as `project > workUnits > WU.SETUP > facts > status`, but persisted paths use canonical dot notation such as `project.workUnits.WU.SETUP.facts.status`.

## Nested condition-builder semantics

- Root mode is `ALL | ANY`.
- `rootMode` defines how the top-level `conditions` array is evaluated: `ALL` means every child must pass, `ANY` means at least one child must pass.
- If the evaluated tree succeeds, the step routes to `matchRoute`.
- A child item may be a `rule` or a nested `group`.
- Nested groups use their own `mode` and recurse through the same rule or group model.
- The editor supports nested groups and uses stacked dialogs for advanced path selection and nested condition editing.
- The UI is intentionally optimized for one to two levels of nesting, even though the stored structure remains recursive.

## Type-aware operator matrix

Available operators depend on the resolved target type and cardinality.

- `string` with `single` cardinality: `equals`, `not_equals`, `contains`, `starts_with`, `ends_with`, `in`, `empty`, `not_empty`
- `number` with `single` cardinality: `equals`, `not_equals`, `gt`, `gte`, `lt`, `lte`, `between`
- `boolean` with `single` cardinality: `is_true`, `is_false`, `equals`
- `json` with `single` cardinality: `exists`, `not_exists`, `equals`
- `ref` with `single` cardinality: `equals`, `not_equals`, `is_set`, `not_set`
- any `set`-typed path: `contains`, `not_contains`, `size_eq`, `size_gt`, `size_lt`, `empty`, `not_empty`

Operator choices are type-aware from the resolved variable path. The editor should not offer operators that are invalid for the selected path.

## Runtime semantics

- Branch evaluation is read-only.
- The runtime evaluates the top-level `conditions` array using `rootMode`, including any nested groups.
- `matchRoute` is the non-default route used when the evaluated tree produces a positive outcome.
- `defaultRoute` is the fallback when the evaluated tree does not produce a positive outcome.
- If `defaultRoute` is omitted, validation should treat the branch step as incomplete unless another surrounding contract guarantees a terminal-safe outcome.
- The chosen route is deterministic from the current workflow state and should be persisted as normal step execution state for auditability.

## Expected editor behavior

- The branch dialog uses `Overview`, `Conditions`, and `Guidance` tabs.
- Overview exposes `stepKey`, `stepName`, `rootMode`, `matchRoute`, and `defaultRoute`.
- Conditions shows a nested builder with rule and group rows, path usage preview, findings, and inline condition errors.
- Advanced variable selectors and nested editors open in stacked dialogs so the base step dialog stays focused.
- Unsaved edits persist across tab switches until save or explicit discard.
- Dirty-state indication remains visible until save or discard.

### Dialog wireframes

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — BRANCH                                                          │
│ Tabs: [Overview] [Conditions] [Guidance]                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Overview                                                                     │
│ - Step Key                                                                   │
│ - Step Name                                                                  │
│ - Root mode: [ALL | ANY]                                                     │
│ - Default route                                                              │
│                                                                              │
│ Conditions Preview                                                           │
│ - Rules: 5    Groups: 1    Max UI depth: 2                                  │
│ - Uses: project.facts.projectType, context.intakeMode, project.workUnits    │
│                                                                              │
│ Actions: [Cancel] [Save]                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — BRANCH                                                          │
│ Tabs: [Overview] [Conditions] [Guidance]                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Conditions (nested builder)                                                  │
│ Root Group: ALL                                                              │
│  1) project > facts > projectType             [equals]       "greenfield"   │
│  2) context > intakeMode                     [in]           ["guided"]      │
│  3) project > workUnits                      [size >]       0                │
│  4) Group [ANY]                                                             │
│     4.1 self > facts > goal                  [not empty]                    │
│     4.2 project > workUnits > WU.SETUP > facts > status [equals] "ready"   │
│                                                                              │
│ [ + Add Condition ]   [ + Add Group ]                                        │
│                                                                              │
│ Condition variable selector uses rich hierarchical dropdown.                 │
│ Operators are type-aware from resolved variable type.                        │
│                                                                              │
│ Guidance                                                                     │
│ - Human guidance                                                             │
│ - Agent guidance                                                             │
│                                                                              │
│ Findings + inline condition errors                                           │
│ Actions: [Cancel] [Save]                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Deprecated legacy shape

The following older fields and concepts are no longer authoritative for Epic 3 implementation:

- primary contracts keyed by `type: "branch"`
- free-form condition ADTs based on `op: "and" | "or" | "not"` as the stored authority shape
- `branches[]` plus per-branch `when` and `next` as the primary route model
- implicit success routing without an explicit `matchRoute`
- `defaultNext`
- `allowOverride`
- `overrideMode`
- contracts limited to form-created context keys instead of canonical workflow target namespaces

When older docs or prototypes reference those shapes, treat them as superseded by the versioned `branch.v1` model above.
