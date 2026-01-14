# WORKFLOW COMPONENTS

UI rendering layer for workflow steps. Maps `stepType` to React components, `layoutType` to layout wrappers.

## STRUCTURE

```
workflows/
├── step-renderer.tsx         # stepType → component switch
├── workflow-layout-renderer.tsx  # layoutType → layout routing
├── types.ts                  # Shared types (StepStatus, WorkflowStepDefinition)
├── steps/
│   ├── ask-user-chat-step.tsx    # AI chat with approval gates
│   ├── ask-user-step.tsx         # Form input (path, string, number)
│   ├── execute-action-step.tsx   # Action preview + execution
│   ├── invoke-workflow-step.tsx  # Child workflow cards
│   └── display-output-step.tsx   # Markdown output with templates
├── layouts/
│   ├── wizard-layout.tsx             # Horizontal stepper
│   ├── artifact-workbench-layout.tsx # Split pane: Timeline + ArtifactPreview
│   └── dialog-layout.tsx             # Modal for child workflows
└── option-card/              # Reusable approval card components
```

## WHERE TO LOOK

| Task               | Location                                                         |
| ------------------ | ---------------------------------------------------------------- |
| Add step type      | `steps/` new file + register in `step-renderer.tsx` switch       |
| Add layout type    | `layouts/` new file + register in `workflow-layout-renderer.tsx` |
| Modify step props  | Step component + `StepRendererProps` interface                   |
| Change approval UI | `option-card/` or `approval-card*.tsx`                           |
| Modify timeline    | `timeline.tsx`, `timeline-*.tsx` variants                        |

## PATTERNS

### Adding New Step Component

```tsx
// 1. Create steps/my-new-step.tsx
export interface MyNewStepProps {
  stepConfig: Record<string, unknown>;
  executionId: string;
  // Add step-specific props
}

export function MyNewStep({ stepConfig, executionId }: MyNewStepProps) {
  // Use trpc hooks for API calls
  const { data } = trpc.workflows.getSomething.useQuery({ executionId });
  return <div>...</div>;
}

// 2. Register in step-renderer.tsx
import { MyNewStep } from "./steps/my-new-step";

// Add case in switch:
case "my-new-step":
  return <MyNewStep stepConfig={step.config} executionId={execution.id} />;
```

### Step Props Contract

All steps receive from `StepRenderer`:

- `step.config` - Step-specific configuration from DB
- `execution.id` - Current execution ID
- `execution.variables` - Workflow state variables
- `projectId` - Context for queries

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
