# Branch Step Contract

This document defines the branch step schema and behavior.

## Purpose

Branch steps choose the next step or path based on variables. They do not mutate variables.

## Condition ADT (no string expressions)

```ts
type Condition =
  | { op: "exists"; var: string }
  | { op: "equals"; var: string; value: string | number | boolean }
  | { op: "contains"; var: string; value: string }
  | { op: "gt" | "gte" | "lt" | "lte"; var: string; value: number }
  | { op: "and"; all: Condition[] }
  | { op: "or"; any: Condition[] }
  | { op: "not"; cond: Condition }
```

## BranchStepConfig

```ts
type BranchStepConfig = {
  type: "branch"
  id: string
  title?: string
  message?: string

  branches: Array<{
    when: Condition
    next: { stepId?: string; pathKey?: string }
    label?: string
  }>

  defaultNext?: { stepId?: string; pathKey?: string }
  allowOverride?: boolean
  overrideMode?: "before" | "after"
}
```

## Execution semantics

1. Evaluate `branches` in order.
2. Select the first matching `when`.
3. If no match, use `defaultNext`.
4. If `allowOverride`:
   - `before`: user selects next before auto-eval
   - `after`: auto-select, then user can override
5. Persist chosen next (optional) and continue.

## Example

```ts
{
  type: "branch",
  id: "route-by-complexity",
  branches: [
    {
      when: { op: "equals", var: "complexity", value: "large" },
      next: { stepId: "enterprise-plan" }
    },
    {
      when: {
        op: "and",
        all: [
          { op: "equals", var: "complexity", value: "medium" },
          { op: "exists", var: "architecture_ready" }
        ]
      },
      next: { stepId: "method-plan" }
    }
  ],
  defaultNext: { stepId: "quick-plan" },
  allowOverride: true,
  overrideMode: "after"
}
```
