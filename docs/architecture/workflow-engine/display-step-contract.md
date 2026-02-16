# Display Step Contract

This document defines the display step schema and behavior.

## Purpose

Display steps present read-only views of workflow data. They do not mutate state.

This step is rendered using the Plate editor with custom plugins so users can customize layout, embeds, references, and tabs for grouping sections. All dynamic values are resolved from variables.

Common use cases:
- Show outcomes of a workflow
- Show usage data
- Show stats about the workflow
- Show suggested next actions

## DisplayStepConfig

```ts
type DisplayStepConfig = {
  type: "display"
  id: string
  title?: string
  message?: string

  // Display content is a Plate document (read-only)
  // Use tabs when multiple categorized views are needed.
  content?: PlateDocument
  tabs?: Array<{
    key: string
    title: string
    content: PlateDocument
  }>

  // Optional actions for navigation (no side effects)
  nextStep?: string
}
```

## PlateDocument

```ts
type PlateDocument = Record<string, unknown> // Plate JSON document
```

Notes:
- Any node that supports text content can include variable templates ({{vars}}).
- Plugins may add blocks for tables, stats, or next-actions.
- Tabs provide multiple titled editors; each tab content is resolved independently.

## Proposed Plate plugins (display)

- vars-inline (render {{var}} tokens safely)
- stats-block
- table-block
- next-actions-block
- tabs-container + tab-panel
- artifact-link (artifact/snapshot refs)
- execution-link (child execution refs)

## Execution semantics

1. Resolve variables used in the Plate document.
2. Render the Plate document read-only.
3. Emit `step_completed`.
4. Proceed to `nextStep` if provided.

## Example

We should review the Plate document shape in the codebase and define the minimal node types/plugins needed for display. We also need to decide how to wrap Plate rendering with Effect for safe variable resolution and error handling.
