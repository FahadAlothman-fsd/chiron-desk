# Invoke Step Contract

This document defines the invoke step schema and behavior.

## Purpose

Invoke steps start child workflow executions from within a parent workflow. They pass inputs into children and capture outputs back into parent variables without requiring an explicit child schema.

## Core capabilities

- Run one or many child workflows
- Support dynamic expansion at runtime (forEach)
- Map parent variables into child inputs
- Capture child outputs in a schema-agnostic way
- Control execution mode (sequential/parallel)
- Control error handling (fail/continue/pause)

## InvokeStepConfig

```ts
type InvokeStepConfig = {
  type: "invoke"
  id: string
  title?: string
  message?: string

  // Dynamic expansion
  forEach?: {
    itemsVar: string
    itemVar: string
  }

  // Which workflow to run
  workflowRef: { id?: string; key?: string }

  // Parent -> child variable mapping
  inputMapping?: Record<string, string>

  // Execution strategy
  executionMode?: "sequential" | "parallel"
  concurrency?: number

  // Output capture (schema-agnostic)
  output?: {
    mode: "reference" | "variables" | "namespace"
    target: string
    selectors?: string[]
  }

  waitForCompletion?: boolean  // default true
  onChildError?: "fail" | "continue" | "pause"
}
```

## Output capture modes

- `reference`: store only execution references
- `variables`: capture selected variables if present
- `namespace`: store all child variables under a namespace

Example outputs:

```ts
output: { mode: "reference", target: "child_executions" }
output: { mode: "variables", target: "technique_results", selectors: ["ideas", "summary"] }
output: { mode: "namespace", target: "children.{{child.id}}" }
```

## Example: Brainstorming technique workflows

```ts
{
  type: "invoke",
  id: "run-techniques",
  forEach: {
    itemsVar: "selected_techniques",
    itemVar: "technique"
  },
  workflowRef: { key: "{{technique.workflowKey}}" },
  inputMapping: {
    session_context: "{{brainstorm_context}}",
    technique_id: "{{technique.id}}",
    technique_name: "{{technique.name}}",
    constraints: "{{brainstorm_constraints}}"
  },
  executionMode: "parallel",
  concurrency: 3,
  output: {
    mode: "variables",
    target: "technique_results",
    selectors: ["ideas", "summary", "notes"]
  },
  waitForCompletion: true,
  onChildError: "continue"
}
```

## Effect execution sketch

```ts
Effect.gen(function* (_) {
  const ctx = yield* _(ExecutionContext)
  const vars = yield* _(VariableService)
  const engine = yield* _(WorkflowEngine)

  const items = yield* _(vars.get(itemsVar))
  const runs = (items ?? []).map((item) =>
    Effect.gen(function* (_) {
      const input = mapInputs(inputMapping, ctx, vars, item)
      const exec = yield* _(engine.execute(workflowRef, input))
      const childVars = yield* _(vars.getByExecution(exec.executionId))
      return { item, exec, childVars }
    })
  )

  const results =
    executionMode === "parallel"
      ? yield* _(Effect.forEach(runs, (r) => r, { concurrency }))
      : yield* _(Effect.forEach(runs, (r) => r))

  yield* _(writeOutputs(output, results))
})
```
