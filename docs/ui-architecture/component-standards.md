## Component Standards

Based on your React 19 + TypeScript + TanStack ecosystem, here's the comprehensive component standards for your frontend architecture.

### Component Template

Here's a minimal but complete component template that follows React/TypeScript best practices, incorporating your chosen libraries:

```typescript
import React from 'react';
import { useForm } from '@tanstack/react-form';
import { useStore } from 'zustand';
import { useMachine } from '@xstate/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { bmadWorkflowMachine } from '@/machines/bmadWorkflowMachine';
import { useProjectStore } from '@/stores/useProjectStore';

interface ComponentProps {
  /** Unique identifier for the component instance */
  id: string;
  /** Optional CSS class name for styling */
  className?: string;
  /** Callback function triggered on user interaction */
  onAction?: (data: ComponentActionData) => void;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Error message to display if something went wrong */
  error?: string | null;
}

interface ComponentActionData {
  type: 'submit' | 'cancel' | 'retry';
  payload?: Record<string, unknown>;
}

/**
 * ComponentName - Brief description of what this component does
 * 
 * @example
 * ```tsx
 * <ComponentName 
 *   id="unique-id"
 *   onAction={(data) => console.log(data)}
 * />
 * ```
 */
export const ComponentName: React.FC<ComponentProps> = ({
  id,
  className,
  onAction,
  isLoading = false,
  error = null,
}) => {
  // State management with Zustand
  const { currentProject, updateProject } = useProjectStore();
  
  // XState machine for complex workflow logic
  const [state, send] = useMachine(bmadWorkflowMachine, {
    context: { projectId: currentProject?.id }
  });
  
  // TanStack Form for form handling
  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
    },
    onSubmit: async ({ value }) => {
      try {
        // Handle form submission
        await updateProject({ ...currentProject, ...value });
        onAction?.({ type: 'submit', payload: value });
      } catch (err) {
        console.error('Form submission failed:', err);
      }
    },
  });

  // Handle workflow state changes
  React.useEffect(() => {
    if (state.matches('completed')) {
      onAction?.({ type: 'submit' });
    }
  }, [state.value, onAction]);

  return (
    <div className={cn('component-wrapper', className)}>
      {/* Error state handling */}
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      
      {/* Loading state */}
      {isLoading && (
        <div className="loading-spinner" aria-live="polite">
          Loading...
        </div>
      )}
      
      {/* Form using TanStack Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) =>
              !value ? 'Name is required' : undefined,
          }}
          children={(field) => (
            <div>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Enter name"
                aria-describedby={field.state.meta.errors.length ? `${field.name}-error` : undefined}
              />
              {field.state.meta.errors.length > 0 && (
                <p id={`${field.name}-error`} className="error-text">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        />
        
        <form.Field
          name="description"
          children={(field) => (
            <div>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Enter description"
              />
            </div>
          )}
        />
        
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isLoading || state.matches('loading')}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => onAction?.({ type: 'cancel' })}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ComponentName;
```

### Naming Conventions

Here are the naming conventions specific to your React/TypeScript/TanStack/XState stack, with proper shadcn/ui + Tailwind CSS approach:

**Components:**
- **File Names**: `kebab-case` (e.g., `chat-interface.tsx`, `interactive-list.tsx`)
- **Component Names**: `PascalCase` (e.g., `ChatInterface`, `InteractiveList`)
- **Directory Structure**: Feature-based organization (e.g., `components/chat/`, `components/workspace/`)

**State Management:**
- **Zustand Stores**: `camelCase` prefixed with `use` (e.g., `useProjectStore.ts`, `useChatStore.ts`)
- **Store Actions**: `camelCase` (e.g., `updateProject`, `sendMessage`)
- **XState Machines**: `camelCase` (e.g., `bmadWorkflowMachine.ts`, `interactiveListMachine.ts`)
- **Machine States**: `camelCase` (e.g., `idle`, `projectBrief`, `completed`)
- **Machine Events**: `SCREAMING_SNAKE_CASE` (e.g., `START_PROJECT`, `COMPLETE`)

**Files and Directories:**
- **Feature Directories**: `kebab-case` (e.g., `chat-interface/`, `project-management/`)
- **Utility Files**: `kebab-case` (e.g., `form-helpers.ts`, `validation-utils.ts`)
- **Type Files**: `kebab-case` (e.g., `api-types.ts`, `workflow-types.ts`)
- **Hook Files**: `camelCase` prefixed with `use` (e.g., `useWebSocket.ts`, `useArtifacts.ts`)

**APIs and Services:**
- **Service Functions**: `camelCase` (e.g., `fetchProjectData`, `createArtifact`)
- **API Endpoints**: `kebab-case` (e.g., `/api/projects`, `/api/artifacts`)
- **tRPC Procedures**: `camelCase` (e.g., `getProject`, `createArtifact`)

**CSS Classes and Styling (shadcn/ui + Tailwind CSS):**
- **Component Styling**: Use Tailwind utility classes directly in JSX (e.g., `className="flex items-center justify-between p-4 bg-background"`)
- **Conditional Classes**: Use `cn()` utility for conditional styling (e.g., `className={cn("base-classes", isActive && "active-classes")}`)
- **No Custom CSS**: Components rely entirely on Tailwind utilities and shadcn/ui variants
- **shadcn/ui Variants**: Use built-in variants like `variant="outline"`, `size="sm"` for consistent styling
- **Responsive Design**: Use Tailwind responsive prefixes (e.g., `md:flex`, `lg:grid-cols-2`)
- **Theme Integration**: Leverage CSS custom properties for Winter palette (e.g., `bg-primary`, `text-primary-foreground`)

**Constants and Enums:**
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `MAX_ARTIFACT_SIZE`, `API_TIMEOUT`)
- **Enums**: `PascalCase` (e.g., `ArtifactType`, `WorkflowState`)

**TypeScript Types:**
- **Interfaces**: `PascalCase` (e.g., `ProjectData`, `ChatMessage`)
- **Type Aliases**: `PascalCase` (e.g., `ApiResponse<T>`, `WorkflowContext`)
- **Generic Types**: Descriptive names (e.g., `ArtifactWithMetadata`)

**Detailed Rationale:**
These naming conventions ensure consistency across your large codebase while leveraging TypeScript's type system and React's component patterns. The kebab-case for files aligns with URL-friendly naming, while PascalCase for components follows React conventions. XState uses SCREAMING_SNAKE_CASE for events to distinguish them from regular function calls, and Zustand stores follow the `use` prefix pattern for React hooks.

## State Management

Based on your hybrid state management approach (TanStack Query + Zustand + XState), here's the comprehensive state management architecture for your frontend.

### Store Structure

Here's the directory structure for your state management setup:

```
src/
├── stores/                    # Zustand stores for client state
│   ├── useProjectStore.ts     # Project-specific state
│   ├── useChatStore.ts        # Chat and conversation state
│   ├── useWorkflowStore.ts    # BMAD workflow state
│   ├── useUIStore.ts          # UI state (themes, layout, modals)
│   ├── useConnectionStore.ts  # WebSocket connection state
│   └── index.ts               # Store exports and initialization
├── machines/                  # XState state machines for complex workflows
│   ├── bmadWorkflowMachine.ts # BMAD methodology workflow
│   ├── interactiveListMachine.ts # Interactive list logic
│   ├── connectionMachine.ts   # WebSocket connection states
│   ├── formMachine.ts         # Form submission workflows
│   └── index.ts               # Machine exports
├── hooks/                     # Custom hooks for state management
│   ├── useWorkflow.ts         # XState workflow hook
│   ├── useProject.ts          # Project data hook (TanStack Query)
│   ├── useChat.ts             # Chat data hook (TanStack Query)
│   └── useOptimisticUpdate.ts # Optimistic update patterns
├── lib/                       # State management utilities
