# Form Step Contract

This document defines the final form step schema and behavior.

## Goals

- Single extensible schema for form fields
- Minimal, composable dataSource model
- Completion derived from required fields

## Completion rule

The form step completes when all visible fields with `required: true` are valid.

## FormStepConfig

```ts
type FormStepConfig = {
  type: "form"
  id: string
  title?: string
  message?: string
  helpText?: string
  submitLabel?: string
  autoSave?: boolean
  validationMode?: "onChange" | "onBlur" | "onSubmit"
  fields: FormFieldConfig[]
}
```

## FormFieldConfig

```ts
type FormFieldConfig = {
  key: string
  label?: string
  description?: string

  type: "string" | "text" | "markdown" | "number" | "boolean" | "array" | "object"

  ref?:
    | "path"
    | "relative-path"
    | "file"
    | "artifact"
    | "snapshot"
    | "execution"
    | "agent"
    | "workflow"
    | "project"
    | "repo"
    | "enum"

  dataSource?: DataSource
  multiple?: boolean
  maxSelections?: number
  dependsOn?: string[]

  validation?: {
    required?: boolean
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: string
    customMessage?: string
  }

  outputVariable?: string
}
```

## DataSource

```ts
type DataSource =
  | {
      kind: "static"
      options: Array<{ label: string; value: string; meta?: Record<string, unknown> }>
    }
  | {
      kind: "table"
      table: "agents" | "artifacts" | "workflows" | "stories" | "snapshots"
      valueKey: string
      labelKey: string
      valuePath?: string
      labelPath?: string
      metaKeys?: string[]
      searchField?: string
      filters?: Record<string, unknown>
      query?: string
      limit?: number
    }
  | {
      kind: "search"
      query: string
      filters?: Record<string, unknown>
      limit?: number
    }
```

Notes:
- `ref: "enum"` implies `dataSource` is required.
- `searchField` defaults to `labelKey` if omitted.
- `metaKeys` are optional fields shown as secondary info in UI.
- Use `valuePath` / `labelPath` when the value or label lives in a nested object (for example under `tags`).

## Example: workflow-init input fields

```ts
const fields: FormFieldConfig[] = [
  {
    key: "project_description",
    label: "Workflow description",
    type: "markdown",
    validation: { required: true, minLength: 20 }
  },
  {
    key: "complexity_classification",
    label: "Complexity",
    type: "string",
    ref: "enum",
    dataSource: {
      kind: "table",
      table: "workflows",
      valuePath: "tags.complexity.value",
      labelPath: "tags.complexity.value",
      searchField: "tags.complexity.value",
      filters: { "tags->'fieldType'->>'value'": "greenfield" }
    },
    dependsOn: ["project_description"],
    validation: { required: true }
  },
  {
    key: "selected_workflow_path_id",
    label: "Workflow path",
    type: "string",
    ref: "workflow",
    dataSource: {
      kind: "table",
      table: "workflows",
      valueKey: "id",
      labelKey: "displayName",
      metaKeys: ["path", "description"],
      searchField: "displayName",
      filters: { "tags->'complexity'->>'value'": "{{complexity_classification}}" }
    },
    dependsOn: ["complexity_classification"],
    validation: { required: true }
  }
]
```
