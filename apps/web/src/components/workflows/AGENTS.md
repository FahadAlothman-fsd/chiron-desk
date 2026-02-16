# WORKFLOW COMPONENTS

UI rendering layer for workflow steps. Maps `stepType` to React components, `layoutType` to layout wrappers.

## STRUCTURE

```
workflows/
├── step-renderer.tsx              # stepType → component routing
├── workflow-layout-renderer.tsx   # layoutType → layout routing
├── types.ts                       # Shared types (StepStatus, WorkflowStepDefinition)
├── steps/
│   ├── user-form-step.tsx            # Form input collection (form step type)
│   ├── sandboxed-agent-step.tsx      # AI agent execution + chat (agent step type)
│   ├── execute-action-step.tsx       # Action preview + execution (action step type)
│   ├── invoke-workflow-step.tsx      # Child workflow cards (invoke step type)
│   └── display-output-step.tsx       # Markdown output rendering (display step type)
├── layouts/
│   ├── wizard-layout.tsx                  # Horizontal stepper
│   ├── artifact-workbench-layout.tsx      # Split pane: Timeline + ArtifactPreview
│   └── dialog-layout.tsx                  # Modal for child workflows
├── steppers/wizard/
│   ├── wizard-step-container.tsx          # Step wrapper for wizard layout
│   ├── workflow-stepper-wizard.tsx        # Multi-step wizard navigation
│   └── examples/
│       ├── chat-step-example.tsx
│       └── simple-form-step.tsx
├── option-card/                   # Reusable card components for selections
│   ├── option-card.tsx
│   ├── card-header.tsx
│   ├── card-body.tsx
│   ├── card-sections.tsx
│   ├── nested-section.tsx
│   ├── types.ts
│   └── index.ts
├── approval-card.tsx              # Approval decision display
├── approval-card-selector.tsx     # Approval option picker
├── artifact-preview.tsx           # Artifact content preview pane
├── selection-with-custom-card.tsx # Selection with custom input option
├── workflow-execution-card.tsx    # Execution status/summary card
├── workflow-path-selector-card.tsx # Workflow path selection
├── workbench-layout.tsx           # Main workbench shell
├── tool-status-panel.tsx          # Active tool call status
├── tool-status-sidebar.tsx        # Sidebar variant of tool status
├── timeline.tsx                   # Step execution timeline
├── timeline-browse-view.tsx       # Timeline in browse mode
└── timeline-focused-view.tsx      # Timeline in focused mode
```

## STEP TYPE → COMPONENT MAPPING

| Step Type (backend) | Component File               | Notes                          |
| ------------------- | ---------------------------- | ------------------------------ |
| `form`              | `user-form-step.tsx`         | Collects user input            |
| `agent`             | `sandboxed-agent-step.tsx`   | AI streaming + tool calls      |
| `action`            | `execute-action-step.tsx`    | Side-effect execution          |
| `invoke`            | `invoke-workflow-step.tsx`   | Sub-workflow execution         |
| `display`           | `display-output-step.tsx`    | Renders results                |
| `branch`            | (no dedicated component)     | Handled by engine, not UI      |

## WHERE TO LOOK

| Task                  | Location                                                         |
| --------------------- | ---------------------------------------------------------------- |
| Add step type         | `steps/` new file + register in `step-renderer.tsx`              |
| Add layout type       | `layouts/` new file + register in `workflow-layout-renderer.tsx`  |
| Modify step props     | Step component + `StepRendererProps` interface                   |
| Change approval UI    | `approval-card.tsx`, `approval-card-selector.tsx`                |
| Modify timeline       | `timeline.tsx`, `timeline-browse-view.tsx`, `timeline-focused-view.tsx` |
| Tool call display     | `tool-status-panel.tsx`, `tool-status-sidebar.tsx`               |
| Wizard stepper        | `steppers/wizard/`                                               |
| Selection components  | `option-card/`, `selection-with-custom-card.tsx`                 |

## PATTERNS

### Adding New Step Component

```tsx
// 1. Create steps/my-new-step.tsx
export interface MyNewStepProps {
	stepConfig: Record<string, unknown>;
	executionId: string;
}

export function MyNewStep({ stepConfig, executionId }: MyNewStepProps) {
	const { data } = trpc.workflows.getSomething.useQuery({ executionId });
	return <div>...</div>;
}

// 2. Register in step-renderer.tsx
import { MyNewStep } from "./steps/my-new-step";
// Add case in step type routing
```

### Step Props Contract

All steps receive from `StepRenderer`:

- `step.config` — Step-specific configuration from DB
- `execution.id` — Current execution ID
- `execution.variables` — Workflow state variables
- `projectId` — Context for queries

### Layout Selection

`workflow-layout-renderer.tsx` reads `workflow.metadata.layoutType`:

- `"wizard"` → Linear stepper, no split pane
- `"artifact-workbench"` → Timeline + ArtifactPreview split (default)
- `"dialog"` → Modal overlay (auto-applied when `dialogProps` provided)

## ANTI-PATTERNS

- **Direct DB queries in steps**: Use tRPC hooks, never raw SQL
- **State in layouts**: Layouts are presentational; state lives in step components
- **Hardcoded workflow IDs**: Use config variables with `{{variable}}` templates
- **Skipping `stepConfig` typing**: Import types from `@chiron/db` when available
