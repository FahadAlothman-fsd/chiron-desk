## Frontend Architecture Document

# Chiron Frontend Architecture Document

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-08 | v1.0 | Initial frontend architecture document creation | Architect |

## Frontend Tech Stack

Based on your existing implementation, here's your formalized technology stack:

**Technology Stack Table:**

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Framework | React | 19 | Core UI framework with concurrent features | Latest React with improved performance and developer experience |
| Language | TypeScript | 5.x | Type safety and better development experience | Strict mode for catch-all errors and better maintainability |
| Routing | TanStack Router | Latest | Type-safe navigation with code splitting | Superior type safety compared to React Router |
| State Management | TanStack Query + Zustand | Latest | Hybrid state management approach | TanStack Query for server state, Zustand for client state |
| Form Handling | TanStack Form | Latest | Form state management and validation | Seamless integration with TanStack ecosystem |
| Build Tool | Vite | Latest | Fast development and optimized builds | Rapid HMR and optimized production builds |
| Styling | TailwindCSS | Latest | Utility-first CSS framework | Consistent Winter palette implementation and rapid development |
| Component Library | shadcn/ui | Latest | Pre-built accessible components | Built on Radix UI primitives with excellent accessibility |
| Desktop Wrapper | Tauri | Latest | Cross-platform desktop application | Lightweight alternative to Electron with better performance |
| Real-time Communication | WebSocket | Native | Live updates and synchronization | Essential for split-screen artifact synchronization |
| Animation | Framer Motion | Latest | Smooth animations and transitions | Professional micro-interactions and state transitions |
| State Machine | XState | Latest | Complex workflow management | Manages BMAD workflow states and user interaction flows |
| Workflow Visualization | React Flow | Latest | Visual workflow representation | Interactive node-based UI for workflow visualization |
| Dev Tools | React DevTools | Latest | Debugging and performance profiling | Essential for React development workflow |

**Rationale for Key Decisions:**

- **React 19**: Chosen for concurrent features and improved performance that support your real-time chat interface
- **TanStack Router**: Provides compile-time type safety for routes, crucial for your complex project navigation
- **TanStack Query**: Perfect for your OpenRouter API integration with built-in caching and error handling
- **shadcn/ui**: Ensures WCAG 2.1 AA compliance out of the box with the Winter palette theming
- **Tauri**: Lightweight desktop wrapper that maintains web performance while providing native features

**Detailed Rationale:**
I've formalized your existing stack choices based on the technical architecture document. The key trade-off was choosing TanStack Router over React Router for better TypeScript integration, which aligns with your strict TypeScript requirements. The shadcn/ui choice ensures accessibility compliance while maintaining design consistency with your Winter color palette.

## Project Structure

Based on your monorepo structure and the chosen tech stack, here's the recommended directory structure for your frontend service:

```
apps/web/
├── src/
│   ├── main.tsx                    # React application entry point
│   ├── routeTree.gen.ts            # Generated type-safe routes
│   ├── routes/                     # TanStack Router routes
│   │   ├── __root.tsx             # Root layout with providers
│   │   ├── index.tsx              # Dashboard/home page
│   │   ├── projects/
│   │   │   ├── $projectId.tsx     # Project workspace (split-screen)
│   │   │   ├── models.tsx         # Model management page
│   │   │   └── new.tsx            # New project creation
│   │   ├── settings.tsx           # Global settings
│   │   └── analytics.tsx          # Usage analytics dashboard
│   ├── components/                 # Reusable UI components
│   │   ├── chat/                  # Chat interface components
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── InteractiveList.tsx
│   │   │   ├── ModelSelector.tsx
│   │   │   └── UsageTracker.tsx
│   │   ├── workspace/             # Split-screen workspace
│   │   │   ├── SplitScreen.tsx
│   │   │   ├── ArtifactViewer.tsx
│   │   │   ├── ResizableDivider.tsx
│   │   │   └── WorkspaceHeader.tsx
│   │   ├── kanban/                # Kanban board components
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   └── BoardColumn.tsx
│   │   ├── workflow/              # XState workflow components
│   │   │   ├── BMADWorkflow.tsx
│   │   │   ├── WorkflowProvider.tsx
│   │   │   └── WorkflowVisualization.tsx (future)
│   │   └── ui/                    # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── dialog.tsx
│   │       └── ...
│   ├── stores/                    # Zustand stores for client state
│   │   ├── useProjectStore.ts     # Project-specific state
│   │   ├── useChatStore.ts        # Chat and conversation state
│   │   ├── useWorkflowStore.ts    # BMAD workflow state
│   │   ├── useUIStore.ts          # UI state (themes, layout, modals)
│   │   ├── useConnectionStore.ts  # WebSocket connection state
│   │   └── index.ts               # Store exports and initialization
│   ├── machines/                  # XState state machines for complex workflows
│   │   ├── bmadWorkflowMachine.ts # BMAD methodology workflow
│   │   ├── interactiveListMachine.ts # Interactive list logic
│   │   ├── connectionMachine.ts   # WebSocket connection states
│   │   ├── formMachine.ts         # Form submission workflows
│   │   └── index.ts               # Machine exports
│   ├── hooks/                     # Custom React hooks
│   │   ├── useWebSocket.ts        # WebSocket connection
│   │   ├── useArtifacts.ts        # Artifact management
│   │   ├── useModels.ts           # Model management
│   │   ├── useWorkflow.ts         # XState workflow hooks
│   │   └── useFormState.ts        # TanStack Form helpers
│   ├── services/                  # API services
│   │   ├── api.ts                 # tRPC client configuration
│   │   ├── openrouter.ts          # OpenRouter API client
│   │   ├── artifacts.ts           # Artifact CRUD operations
│   │   └── websocket.ts           # WebSocket service
│   ├── lib/                       # Utility libraries
│   │   ├── trpc.ts                # tRPC setup
│   │   ├── utils.ts               # General utilities
│   │   ├── constants.ts           # App constants
│   │   ├── validations.ts         # Form validations
│   │   └── themes.ts              # Winter palette theme
│   ├── types/                     # TypeScript type definitions
│   │   ├── api.ts                 # API response types
│   │   ├── workflow.ts            # Workflow types
│   │   ├── artifact.ts            # Artifact types
│   │   └── chat.ts                # Chat types
│   └── styles/                    # Global styles
│       ├── globals.css            # Tailwind + custom styles
│       └── components.css         # Component-specific styles
├── public/                        # Static assets
│   ├── favicon.ico
│   └── manifest.json
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.js             # Tailwind configuration
├── vite.config.ts                 # Vite build configuration
└── .env.example                   # Environment variables template
```

**Key Structure Decisions:**

1. **Separation of Concerns**: Clear distinction between UI components, state management, and business logic
2. **XState Machines**: Dedicated `machines/` directory for workflow logic
3. **Zustand Stores**: Simple, focused stores for different state domains
4. **Type Safety**: Comprehensive `types/` directory for TypeScript definitions
5. **Services Layer**: Clean API abstraction with tRPC integration

**Rationale:**
This structure supports your complex workflow requirements while maintaining scalability. The separation of XState machines from Zustand stores provides clear boundaries - machines for complex workflow logic, stores for simple client state. The `components/` organization by feature (chat, workspace, kanban) aligns with your PRD requirements.

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
│   ├── queryClient.ts         # TanStack Query configuration
│   ├── store.ts               # Zustand store setup
│   └── stateUtils.ts          # State management helpers
└── types/                     # State-related types
    ├── store.ts               # Zustand store types
    ├── machine.ts             # XState machine types
    └── query.ts               # TanStack Query types
```

### State Management Template

Here's a comprehensive state management template showing Zustand store, XState machine, and TanStack Query integration:

```typescript
// stores/useProjectStore.ts - Zustand store for project state
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'template';
  currentWorkflow: string;
  artifacts: Artifact[];
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  addProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    persist(
      (set, get) => ({
        projects: [],
        currentProject: null,
        isLoading: false,
        error: null,
        
        setProjects: (projects) => set({ projects }, false, 'setProjects'),
        
        setCurrentProject: (project) => 
          set({ currentProject: project }, false, 'setCurrentProject'),
        
        updateProject: (projectId, updates) => 
          set(
            (state) => ({
              projects: state.projects.map(project =>
                project.id === projectId 
                  ? { ...project, ...updates, updatedAt: new Date() }
                  : project
              ),
              currentProject: state.currentProject?.id === projectId
                ? { ...state.currentProject, ...updates, updatedAt: new Date() }
                : state.currentProject
            }),
            false,
            'updateProject'
          ),
        
        addProject: (project) => 
          set(
            (state) => ({ projects: [...state.projects, project] }),
            false,
            'addProject'
          ),
        
        deleteProject: (projectId) => 
          set(
            (state) => ({
              projects: state.projects.filter(p => p.id !== projectId),
              currentProject: state.currentProject?.id === projectId 
                ? null 
                : state.currentProject
            }),
            false,
            'deleteProject'
          ),
        
        setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
        
        setError: (error) => set({ error }, false, 'setError'),
        
        reset: () => set({
          projects: [],
          currentProject: null,
          isLoading: false,
          error: null
        }, false, 'reset')
      }),
      {
        name: 'project-store',
        partialize: (state) => ({ 
          projects: state.projects,
          currentProject: state.currentProject 
        })
      }
    ),
    { name: 'ProjectStore' }
  )
);

// machines/bmadWorkflowMachine.ts - XState machine for BMAD workflow
import { createMachine, assign } from 'xstate';

export interface BMADWorkflowContext {
  projectId: string;
  currentStep: string;
  completedSteps: string[];
  artifacts: Record<string, any>;
  error?: string;
}

export type BMADWorkflowEvent =
  | { type: 'START_PROJECT'; projectId: string }
  | { type: 'COMPLETE_STEP'; step: string; artifact?: any }
  | { type: 'GO_TO_STEP'; step: string }
  | { type: 'RETRY_STEP'; step: string }
  | { type: 'RESET_WORKFLOW' }
  | { type: 'ERROR'; error: string };

export const bmadWorkflowMachine = createMachine<BMADWorkflowContext, BMADWorkflowEvent>({
  id: 'bmadWorkflow',
  initial: 'idle',
  context: {
    projectId: '',
    currentStep: '',
    completedSteps: [],
    artifacts: {}
  },
  states: {
    idle: {
      on: {
        START_PROJECT: {
          target: 'projectBrief',
          actions: assign({
            projectId: (_, event) => event.projectId,
            currentStep: 'projectBrief'
          })
        }
      }
    },
    
    projectBrief: {
      on: {
        COMPLETE_STEP: {
          target: 'prd',
          actions: assign({
            completedSteps: (context) => [...context.completedSteps, 'projectBrief'],
            currentStep: 'prd',
            artifacts: (context, event) => ({
              ...context.artifacts,
              projectBrief: event.artifact
            })
          })
        },
        GO_TO_STEP: {
          target: 'projectBrief',
          actions: assign({ currentStep: (_, event) => event.step })
        }
      }
    },
    
    prd: {
      on: {
        COMPLETE_STEP: {
          target: 'frontendSpec',
          actions: assign({
            completedSteps: (context) => [...context.completedSteps, 'prd'],
            currentStep: 'frontendSpec',
            artifacts: (context, event) => ({
              ...context.artifacts,
              prd: event.artifact
            })
          })
        },
        GO_TO_STEP: {
          target: 'prd',
          actions: assign({ currentStep: (_, event) => event.step })
        }
      }
    },
    
    frontendSpec: {
      on: {
        COMPLETE_STEP: {
          target: 'architecture',
          actions: assign({
            completedSteps: (context) => [...context.completedSteps, 'frontendSpec'],
            currentStep: 'architecture',
            artifacts: (context, event) => ({
              ...context.artifacts,
              frontendSpec: event.artifact
            })
          })
        },
        GO_TO_STEP: {
          target: 'frontendSpec',
          actions: assign({ currentStep: (_, event) => event.step })
        }
      }
    },
    
    architecture: {
      on: {
        COMPLETE_STEP: {
          target: 'epics',
          actions: assign({
            completedSteps: (context) => [...context.completedSteps, 'architecture'],
            currentStep: 'epics',
            artifacts: (context, event) => ({
              ...context.artifacts,
              architecture: event.artifact
            })
          })
        },
        GO_TO_STEP: {
          target: 'architecture',
          actions: assign({ currentStep: (_, event) => event.step })
        }
      }
    },
    
    epics: {
      on: {
        COMPLETE_STEP: {
          target: 'stories',
          actions: assign({
            completedSteps: (context) => [...context.completedSteps, 'epics'],
            currentStep: 'stories',
            artifacts: (context, event) => ({
              ...context.artifacts,
              epics: event.artifact
            })
          })
        },
        GO_TO_STEP: {
          target: 'epics',
          actions: assign({ currentStep: (_, event) => event.step })
        }
      }
    },
    
    stories: {
      type: 'final',
      on: {
        RESET_WORKFLOW: 'idle'
      }
    }
  },
  
  on: {
    ERROR: {
      actions: assign({ error: (_, event) => event.error })
    },
    
    RETRY_STEP: {
      actions: (context) => {
        // Retry logic for failed steps
        console.log(`Retrying step: ${context.currentStep}`);
      }
    }
  }
});

// hooks/useWorkflow.ts - Custom hook for XState workflow
import { useMachine } from '@xstate/react';
import { useProjectStore } from '@/stores/useProjectStore';
import { bmadWorkflowMachine } from '@/machines/bmadWorkflowMachine';

export const useWorkflow = (projectId: string) => {
  const { currentProject, updateProject } = useProjectStore();
  
  const [state, send] = useMachine(bmadWorkflowMachine, {
    context: { projectId }
  });
  
  const completeStep = (step: string, artifact?: any) => {
    send({ type: 'COMPLETE_STEP', step, artifact });
    
    // Update project workflow state
    if (currentProject) {
      updateProject(currentProject.id, {
        currentWorkflow: step,
        artifacts: {
          ...currentProject.artifacts,
          [step]: artifact
        }
      });
    }
  };
  
  const goToStep = (step: string) => {
    send({ type: 'GO_TO_STEP', step });
  };
  
  const retryStep = () => {
    send({ type: 'RETRY_STEP', step: state.context.currentStep });
  };
  
  return {
    state,
    context: state.context,
    completeStep,
    goToStep,
    retryStep,
    canGoToStep: (step: string) => {
      // Logic to determine if step transition is allowed
      const stepOrder = ['projectBrief', 'prd', 'frontendSpec', 'architecture', 'epics', 'stories'];
      const currentIndex = stepOrder.indexOf(state.context.currentStep);
      const targetIndex = stepOrder.indexOf(step);
      return targetIndex <= currentIndex || state.context.completedSteps.includes(step);
    }
  };
};

// lib/queryClient.ts - TanStack Query configuration
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
          if (error.status >= 400 && error.status < 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

**Detailed Rationale:**
This state management approach provides clear separation of concerns:
- **TanStack Query**: Handles server state, caching, and API synchronization
- **Zustand**: Manages simple client state with persistence and devtools
- **XState**: Orchestrates complex workflows with predictable state transitions

Trade-offs include the learning curve of XState for workflow logic, but it ensures reliable BMAD progression. Zustand's simplicity keeps client state lightweight, while TanStack Query optimizes API interactions. The structure scales well for your complex workflow requirements while maintaining performance.

## API Integration

Based on your tRPC + OpenRouter integration requirements, here's the comprehensive API integration architecture for your frontend.

### Service Template

Here's the corrected API service template following tRPC functional patterns:

```typescript
// lib/trpc.ts - tRPC client configuration (no classes)
import { createTRPCReact } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../../server/src/routers/_app';

// Type inference helpers
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// tRPC client (functional approach)
export const trpc = createTRPCReact<AppRouter>();

// API utilities (functional helpers)
export const apiUtils = {
  // Project operations using tRPC hooks pattern
  useProjects: () => trpc.projects.list.useQuery(),
  useProject: (id: string) => trpc.projects.get.useQuery({ id }),
  createProject: trpc.projects.create.useMutation(),
  updateProject: trpc.projects.update.useMutation(),
  deleteProject: trpc.projects.delete.useMutation(),
  
  // Artifact operations
  useArtifacts: (projectId: string) => trpc.artifacts.list.useQuery({ projectId }),
  useArtifact: (projectId: string, artifactId: string) => 
    trpc.artifacts.get.useQuery({ projectId, artifactId }),
  createArtifact: trpc.artifacts.create.useMutation(),
  updateArtifact: trpc.artifacts.update.useMutation(),
  
  // Chat operations
  useChatHistory: (conversationId: string) => 
    trpc.conversations.get.useQuery({ conversationId }),
  sendMessage: trpc.messages.create.useMutation(),
  useMessages: (conversationId: string) =>
    trpc.messages.list.useQuery({ conversationId }),
  
  // Usage operations
  useUsageMetrics: (projectId?: string, timeframe?: 'day' | 'week' | 'month') =>
    trpc.usage.get.useQuery({ projectId, timeframe }),
  useBillingInfo: () => trpc.usage.billing.useQuery(),
  
  // API key operations
  useApiKeys: () => trpc.apiKeys.list.useQuery(),
  createApiKey: trpc.apiKeys.create.useMutation(),
  deleteApiKey: trpc.apiKeys.delete.useMutation(),
  validateApiKey: trpc.apiKeys.validate.useMutation(),
};

// OpenRouter service (simple functional service for external API)
export const openRouterService = {
  async listModels(apiKey: string): Promise<any[]> {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': import.meta.env.VITE_APP_URL || 'http://localhost:3000',
        'X-Title': 'Chiron',
      },
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }
    
    return response.json();
  },
  
  async generateCompletion(
    apiKey: string,
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    model: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': import.meta.env.VITE_APP_URL || 'http://localhost:3000',
        'X-Title': 'Chiron',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        stream: options.stream ?? true,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenRouter API error: ${response.status}`);
    }
    
    if (!options.stream) {
      const data = await response.json();
      return (async function* () {
        yield data.choices[0]?.message?.content || '';
      })();
    }
    
    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    return (async function* () {
      if (!reader) return;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') return;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) yield content;
              } catch (e) {
                // Ignore parsing errors for non-JSON lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    })();
  },
};

// Error handling utilities (functional approach)
export const handleApiError = (error: any): string => {
  if (error?.data?.httpStatus === 401) {
    return 'Authentication required. Please log in again.';
  }
  if (error?.data?.httpStatus === 403) {
    return 'You do not have permission to perform this action.';
  }
  if (error?.data?.httpStatus === 404) {
    return 'The requested resource was not found.';
  }
  if (error?.data?.httpStatus >= 500) {
    return 'Server error. Please try again later.';
  }
  return error?.message || 'An unexpected error occurred.';
};

// Authentication utilities (functional)
export const authUtils = {
  getToken: (): string | null => localStorage.getItem('auth-token'),
  
  setToken: (token: string): void => localStorage.setItem('auth-token', token),
  
  removeToken: (): void => localStorage.removeItem('auth-token'),
  
  isAuthenticated: (): boolean => !!authUtils.getToken(),
  
  getAuthHeaders: (): Record<string, string> => {
    const token = authUtils.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
};
```

### API Client Configuration

Here's the corrected tRPC client configuration following functional patterns:

```typescript
// lib/trpc-client.ts - tRPC client setup (functional)
import { QueryClient } from '@tanstack/react-query';
import { trpc } from './trpc';
import superjson from 'superjson';

// Query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.data?.httpStatus === 401) {
          return false;
        }
        // Don't retry on client errors (4xx)
        if (error?.data?.httpStatus >= 400 && error?.data?.httpStatus < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.data?.httpStatus >= 400 && error?.data?.httpStatus < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

// tRPC provider component (functional)
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { trpc } from './trpc';
import { queryClient } from './queryClient';

interface TRPCProviderProps {
  children: React.ReactNode;
}

export const TRPCProvider: React.FC<TRPCProviderProps> = ({ children }) => {
  const [trpcClient] = React.useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: import.meta.env.VITE_API_URL || 'http://localhost:3001/trpc',
          async fetch(url, options) {
            // Add authentication headers
            const headers = {
              ...options.headers,
              ...authUtils.getAuthHeaders(),
            };
            
            // Add service token for AI service communication
            const serviceToken = import.meta.env.VITE_SERVICE_TOKEN;
            if (serviceToken) {
              headers['X-Service-Token'] = serviceToken;
            }
            
            return fetch(url, { ...options, headers });
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
};

// Usage in components (functional patterns)
import { apiUtils, handleApiError } from '@/lib/trpc';

export const ProjectList: React.FC = () => {
  const { data: projects, error, isLoading, refetch } = apiUtils.useProjects();
  
  if (isLoading) return <div>Loading projects...</div>;
  if (error) return <div>Error: {handleApiError(error)}</div>;
  
  return (
    <div>
      {projects?.map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
};

export const CreateProjectForm: React.FC = () => {
  const createProject = apiUtils.createProject();
  
  const handleSubmit = async (data: { name: string; description?: string }) => {
    try {
      await createProject.mutateAsync(data);
      // Success handling
    } catch (error) {
      console.error('Failed to create project:', handleApiError(error));
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={createProject.isLoading}>
        {createProject.isLoading ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  );
};

// Error boundary for API errors (functional)
export const ApiErrorBoundary: React.FC<{
  children: React.ReactNode;
  fallback?: (error: Error, retry: () => void) => React.ReactNode;
}> = ({ children, fallback }) => {
  return (
    <ErrorBoundary
      fallback={(error, retry) => 
        fallback ? fallback(error, retry) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <button
              onClick={retry}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
};
```

**Detailed Rationale:**
Following tRPC best practices:
- **No Classes**: tRPC uses functional, hook-based patterns with generated utilities
- **Direct Hook Usage**: `trpc.procedure.useQuery()` and `trpc.procedure.useMutation()` for type-safe API calls
- **Utility Objects**: Simple objects for organizing related operations without class overhead
- **Error Handling**: Functional error utilities that work with tRPC's error system
- **Authentication**: Simple utility functions for token management

This approach is more aligned with React and tRPC patterns, reducing complexity while maintaining type safety and error handling.

## Routing

Based on your TanStack Router choice, here's the comprehensive routing configuration for your frontend architecture.

### Route Configuration

Here's the routing configuration using TanStack Router with protected routes, lazy loading, and authentication guards:

```typescript
// routes/__root.tsx - Root layout with providers and guards
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { TRPCProvider } from '@/lib/trpc';
import { authUtils } from '@/lib/auth-utils';
import { useProjectStore } from '@/stores/useProjectStore';

export const Route = createRootRoute({
  component: () => {
    // Global error boundary
    if (!authUtils.isAuthenticated()) {
      return <LoginRedirect />;
    }
    
    return (
      <TRPCProvider>
        <div className="min-h-screen bg-background">
          <AppLayout>
            <Outlet />
          </AppLayout>
          {import.meta.env.DEV && <TanStackRouterDevtools />}
        </div>
      </TRPCProvider>
    );
  },
  errorComponent: ({ error }) => (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <button onClick={() => window.location.reload()}>
        Reload page
      </button>
    </div>
  ),
});

// routes/index.tsx - Dashboard/home page
import { createFileRoute } from '@tanstack/react-router';
import { ProjectGrid } from '@/components/dashboard/ProjectGrid';
import { ChatInput } from '@/components/chat/ChatInput';

export const Route = createFileRoute('/')({
  component: () => (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Chiron Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectGrid />
        <ChatInput />
      </div>
    </div>
  ),
  loader: async () => {
    // Preload critical data
    return {
      projects: await fetch('/api/projects').then(r => r.json()),
    };
  },
});

// routes/projects/$projectId.tsx - Project workspace (split-screen)
import { createFileRoute } from '@tanstack/react-router';
import { SplitScreenWorkspace } from '@/components/workspace/SplitScreen';
import { useProjectStore } from '@/stores/useProjectStore';

export const Route = createFileRoute('/projects/$projectId')({
  component: () => {
    const { projectId } = Route.useParams();
    const { currentProject } = useProjectStore();
    
    if (!currentProject) {
      return <div>Project not found</div>;
    }
    
    return (
      <SplitScreenWorkspace projectId={projectId} />
    );
  },
  loader: async ({ params }) => {
    // Load project data
    const project = await fetch(`/api/projects/${params.projectId}`).then(r => r.json());
    return { project };
  },
  beforeLoad: ({ params }) => {
    // Check if user has access to this project
    const userProjects = JSON.parse(localStorage.getItem('user-projects') || '[]');
    if (!userProjects.includes(params.projectId)) {
      throw new Error('Access denied');
    }
  },
});

// routes/projects/models.tsx - Model management page
import { createFileRoute } from '@tanstack/react-router';
import { ModelsBrowser } from '@/components/models/ModelsBrowser';

export const Route = createFileRoute('/projects/models')({
  component: () => <ModelsBrowser />,
  loader: async () => {
    // Load available models
    const models = await fetch('/api/models').then(r => r.json());
    return { models };
  },
});

// routes/settings.tsx - Global settings
import { createFileRoute } from '@tanstack/react-router';
import { SettingsPanel } from '@/components/settings/SettingsPanel';

export const Route = createFileRoute('/settings')({
  component: () => <SettingsPanel />,
});

// routes/analytics.tsx - Usage analytics
import { createFileRoute } from '@tanstack/react-router';
import { UsageDashboard } from '@/components/analytics/UsageDashboard';

export const Route = createFileRoute('/analytics')({
  component: () => <UsageDashboard />,
});

// Authentication guard component
const LoginRedirect: React.FC = () => {
  React.useEffect(() => {
    // Redirect to login or show login modal
    window.location.href = '/login';
  }, []);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    </div>
  );
};

// App layout component with navigation
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-card border-r">
        <nav className="p-4 space-y-2">
          <Link
            to="/"
            className={cn(
              "flex items-center px-3 py-2 rounded-md text-sm font-medium",
              location.pathname === "/" 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            Dashboard
          </Link>
          <Link
            to="/projects/models"
            className={cn(
              "flex items-center px-3 py-2 rounded-md text-sm font-medium",
              location.pathname === "/projects/models" 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            Models
          </Link>
          <Link
            to="/analytics"
            className={cn(
              "flex items-center px-3 py-2 rounded-md text-sm font-medium",
              location.pathname === "/analytics" 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            Analytics
          </Link>
          <Link
            to="/settings"
            className={cn(
              "flex items-center px-3 py-2 rounded-md text-sm font-medium",
              location.pathname === "/settings" 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            Settings
          </Link>
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
};

// Route guards and middleware
import { redirect } from '@tanstack/react-router';

// Protected route guard
export const protectedRoute = createFileRoute({
  beforeLoad: ({ location }) => {
    if (!authUtils.isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.pathname },
      });
    }
  },
});

// Admin-only route guard
export const adminRoute = createFileRoute({
  beforeLoad: async ({ location }) => {
    if (!authUtils.isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.pathname },
      });
    }
    
    // Check if user is admin
    const user = await authUtils.getCurrentUser();
    if (user.role !== 'admin') {
      throw new Error('Admin access required');
    }
  },
});

// Lazy loading for performance
const lazyRoute = (importFn: () => Promise<any>) => 
  createFileRoute({
    component: React.lazy(importFn),
    pendingComponent: () => <div>Loading...</div>,
  });

// Example lazy-loaded route
export const LazyAnalyticsRoute = lazyRoute(() => import('./analytics'));

// Nested routes for project-specific pages
export const projectRoutes = [
  createFileRoute('/projects/$projectId/chat'),
  createFileRoute('/projects/$projectId/kanban'),
  createFileRoute('/projects/$projectId/artifacts'),
  createFileRoute('/projects/$projectId/settings'),
];

// Route configuration with search params
export const Route = createFileRoute('/projects/$projectId/chat')({
  validateSearch: (search: Record<string, unknown>) => ({
    conversationId: (search.conversationId as string) || '',
    model: (search.model as string) || 'default',
  }),
  component: ({ useSearch }) => {
    const { conversationId, model } = useSearch();
    return <ChatInterface conversationId={conversationId} model={model} />;
  },
});
```

**Detailed Rationale:**
This routing configuration provides:
- **Type Safety**: Full TypeScript integration with TanStack Router's generated types
- **Protected Routes**: Authentication guards prevent unauthorized access
- **Lazy Loading**: Code splitting for better performance on large applications
- **Nested Routes**: Organized route structure for complex project workflows
- **Search Params**: Type-safe handling of URL parameters and query strings
- **Error Boundaries**: Graceful error handling for route-level failures

Trade-offs include the learning curve of TanStack Router's patterns, but it provides superior type safety compared to React Router. The file-based routing aligns with your project structure while the guards ensure security.

## Styling Guidelines

Based on your Tailwind CSS + shadcn/ui stack, here's the comprehensive styling guidelines for your frontend architecture.

### Styling Approach

**Tailwind CSS Utility-First with shadcn/ui Components:**

Your styling approach leverages Tailwind CSS's utility-first methodology combined with shadcn/ui's pre-built, accessible components. This provides a perfect balance of rapid development and consistency.

**Core Principles:**
1. **Utility-First**: Use Tailwind utility classes directly in JSX for all custom styling
2. **Component Library**: Rely on shadcn/ui components for common UI patterns
3. **No Custom CSS**: Avoid creating separate CSS files; all styles are co-located with components
4. **Design Tokens**: Use CSS custom properties for theme consistency
5. **Responsive Design**: Mobile-first approach with Tailwind's responsive utilities

**Component Styling Pattern:**
```tsx
// Good: Utility classes in JSX
<div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">

// Avoid: Custom CSS classes
<div className="custom-component"> {/* Don't do this */}
```

**shadcn/ui Integration:**
- Use built-in variants: `variant="outline"`, `size="sm"`
- Customize components via `className` prop for one-off modifications
- Extend shadcn/ui components when needed for project-specific requirements

**Responsive Strategy:**
- Mobile-first: Design for mobile, enhance for larger screens
- Breakpoints: Use Tailwind's `sm:`, `md:`, `lg:`, `xl:` prefixes
- Container queries: Use `@container` for component-level responsive design

**Animation and Transitions:**
- Use Tailwind's transition utilities: `transition-colors duration-200`
- Leverage Framer Motion for complex animations
- Follow your Winter palette for motion design

### Global Theme Variables

Here's your CSS custom properties theme system implementing the Winter color palette with dark mode support:

```css
/* styles/globals.css - Global theme variables */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Winter Color Palette - Light Mode */
    --background: 42 44 41; /* #2A2C29 */
    --foreground: 167 165 151; /* #A7A599 */
    
    --card: 255 255 255;
    --card-foreground: 42 44 41;
    
    --popover: 255 255 255;
    --popover-foreground: 42 44 41;
    
    --primary: 93 108 106; /* #5D6C6A */
    --primary-foreground: 255 255 255;
    
    --secondary: 240 240 240;
    --secondary-foreground: 42 44 41;
    
    --muted: 245 245 245;
    --muted-foreground: 107 114 128;
    
    --accent: 240 240 240;
    --accent-foreground: 42 44 41;
    
    --destructive: 239 68 68;
    --destructive-foreground: 255 255 255;
    
    --border: 229 229 229;
    --input: 229 229 229;
    --ring: 93 108 106;
    
    --radius: 0.5rem;
    
    /* Typography */
    --font-sans: 'Inter', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
    
    /* Spacing Scale */
    --space-1: 0.25rem; /* 4px */
    --space-2: 0.5rem;  /* 8px */
    --space-3: 0.75rem; /* 12px */
    --space-4: 1rem;    /* 16px */
    --space-5: 1.25rem; /* 20px */
    --space-6: 1.5rem;  /* 24px */
    --space-8: 2rem;    /* 32px */
    --space-10: 2.5rem; /* 40px */
    --space-12: 3rem;   /* 48px */
    --space-16: 4rem;   /* 64px */
    --space-20: 5rem;   /* 80px */
    --space-24: 6rem;   /* 96px */
    
    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    
    /* Border Radius */
    --radius-sm: 0.125rem;
    --radius: 0.25rem;
    --radius-md: 0.375rem;
    --radius-lg: 0.5rem;
    --radius-xl: 0.75rem;
    --radius-2xl: 1rem;
    --radius-3xl: 1.5rem;
    
    /* Z-Index Scale */
    --z-dropdown: 1000;
    --z-sticky: 1020;
    --z-fixed: 1030;
    --z-modal-backdrop: 1040;
    --z-modal: 1050;
    --z-popover: 1060;
    --z-tooltip: 1070;
    --z-toast: 1080;
  }
  
  .dark {
    /* Winter Color Palette - Dark Mode */
    --background: 42 44 41; /* #2A2C29 - slightly darker for dark mode */
    --foreground: 167 165 151; /* #A7A599 */
    
    --card: 45 47 44; /* Slightly lighter than background */
    --card-foreground: 167 165 151;
    
    --popover: 45 47 44;
    --popover-foreground: 167 165 151;
    
    --primary: 93 108 106;
    --primary-foreground: 255 255 255;
    
    --secondary: 58 62 60;
    --secondary-foreground: 167 165 151;
    
    --muted: 58 62 60;
    --muted-foreground: 140 143 138;
    
    --accent: 58 62 60;
    --accent-foreground: 167 165 151;
    
    --destructive: 239 68 68;
    --destructive-foreground: 255 255 255;
    
    --border: 58 62 60;
    --input: 58 62 60;
    --ring: 93 108 106;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans);
  }
  
  h1, h2, h3, h4, h5, h6 {
    @apply text-foreground;
  }
  
  code, pre {
    font-family: var(--font-mono);
  }
}

@layer components {
  /* Custom component classes using design tokens */
  .btn-primary {
    @apply bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium transition-colors;
  }
  
  .btn-secondary {
    @apply bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md font-medium transition-colors;
  }
  
  .card {
    @apply bg-card text-card-foreground rounded-lg border shadow-sm;
  }
  
  .input {
    @apply flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50;
  }
  
  /* Chat-specific components */
  .chat-message {
    @apply p-4 rounded-lg mb-4 max-w-3xl;
  }
  
  .chat-user {
    @apply chat-message bg-primary text-primary-foreground ml-auto;
  }
  
  .chat-assistant {
    @apply chat-message bg-muted;
  }
  
  /* Workflow components */
  .workflow-step {
    @apply flex items-center p-3 border border-border rounded-md bg-card;
  }
  
  .workflow-step-active {
    @apply workflow-step border-primary bg-primary/5;
  }
  
  .workflow-step-completed {
    @apply workflow-step bg-green-50 border-green-200;
  }
}

@layer utilities {
  /* Utility classes for common patterns */
  .text-balance {
    text-wrap: balance;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.5s ease-in-out;
  }
  
  .animate-slide-up {
    animation: slideUp 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { 
      opacity: 0; 
      transform: translateY(10px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
}

/* Dark mode toggle styles */
.dark-mode-toggle {
  @apply relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50;
}

.dark-mode-toggle[data-state="checked"] {
  @apply bg-primary;
}

.dark-mode-toggle[data-state="unchecked"] {
    @apply bg-secondary;
}
```

**Detailed Rationale:**
This styling approach provides:
- **Consistency**: CSS custom properties ensure the Winter palette is applied uniformly
- **Dark Mode**: Seamless light/dark mode switching with proper contrast
- **Accessibility**: WCAG-compliant color contrasts and focus states
- **Maintainability**: No custom CSS files, everything managed through Tailwind
- **Performance**: Tailwind's purging removes unused styles automatically
- **shadcn/ui Integration**: Built-in support for component variants and theming

Trade-offs include the initial setup complexity of CSS variables, but it ensures perfect theme consistency across your application. The utility-first approach speeds up development while maintaining design system integrity.

## Testing Requirements

Based on your React/TypeScript/Vitest stack, here's the comprehensive testing architecture for your frontend.

### Component Test Template

Here's a basic component test template using Vitest, React Testing Library, and TanStack Query testing utilities:

```typescript
// components/__tests__/ChatInterface.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChatInterface } from '../chat/ChatInterface';
import { trpc } from '@/lib/trpc';
import { useProjectStore } from '@/stores/useProjectStore';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    messages: {
      create: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isLoading: false,
          error: null,
        })),
      },
    },
    chat: {
      stream: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isLoading: false,
        })),
      },
    },
  },
}));

// Mock Zustand store
vi.mock('@/stores/useProjectStore', () => ({
  useProjectStore: vi.fn(() => ({
    currentProject: { id: 'test-project', name: 'Test Project' },
    updateProject: vi.fn(),
  })),
}));

// Mock XState machine
vi.mock('@/machines/bmadWorkflowMachine', () => ({
  bmadWorkflowMachine: {
    context: { projectId: 'test-project' },
  },
}));

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ChatInterface', () => {
  const defaultProps = {
    conversationId: 'test-conversation',
    projectId: 'test-project',
    onArtifactUpdate: vi.fn(),
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders chat interface correctly', () => {
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });
  
  it('displays loading state when sending message', async () => {
    const mockMutateAsync = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    vi.mocked(trpc.messages.create.useMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: true,
      error: null,
    } as any);
    
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/sending/i)).toBeInTheDocument();
    });
  });
  
  it('handles message submission correctly', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'new-message',
      content: 'Test response',
      role: 'assistant',
    });
    
    vi.mocked(trpc.messages.create.useMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      error: null,
    } as any);
    
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'Hello AI' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        conversationId: 'test-conversation',
        content: 'Hello AI',
        model: 'default',
      });
    });
  });
  
  it('displays error message when submission fails', async () => {
    const mockError = new Error('API Error');
    const mockMutateAsync = vi.fn().mockRejectedValue(mockError);
    
    vi.mocked(trpc.messages.create.useMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      error: mockError,
    } as any);
    
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
  
  it('calls onArtifactUpdate when artifact is generated', async () => {
    const mockOnArtifactUpdate = vi.fn();
    const mockStreamResponse = async function* () {
      yield { type: 'content', content: 'Response content' };
      yield { type: 'artifact', artifact: { id: 'test-artifact' } };
    };
    
    vi.mocked(trpc.chat.stream.useMutation).mockReturnValue({
      mutateAsync: vi.fn().mockReturnValue(mockStreamResponse()),
      isLoading: false,
    } as any);
    
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} onArtifactUpdate={mockOnArtifactUpdate} />
      </TestWrapper>
    );
    
    // Simulate streaming completion
    await waitFor(() => {
      expect(mockOnArtifactUpdate).toHaveBeenCalledWith({ id: 'test-artifact' });
    });
  });
  
  it('handles keyboard shortcuts', () => {
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
    
    // Verify send action was triggered
    expect(vi.mocked(trpc.messages.create.useMutation)().mutateAsync).toHaveBeenCalled();
  });
  
  it('respects max token limit', () => {
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    
    // Simulate input exceeding token limit
    fireEvent.change(input, { 
      target: { value: 'a'.repeat(5000) } // Exceeds typical limits
    });
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });
});

// Integration test example
describe('ChatInterface Integration', () => {
  it('integrates with project store correctly', () => {
    const mockStore = {
      currentProject: { id: 'test-project', name: 'Test Project' },
      updateProject: vi.fn(),
    };
    
    vi.mocked(useProjectStore).mockReturnValue(mockStore);
    
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
  });
});

// Accessibility test example
describe('ChatInterface Accessibility', () => {
  it('has proper ARIA labels', () => {
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-label', expect.stringContaining('message'));
  });
  
  it('supports keyboard navigation', () => {
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    input.focus();
    expect(document.activeElement).toBe(input);
    
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(document.activeElement).toBe(sendButton);
  });
});
```

### Testing Best Practices

Here are the comprehensive testing best practices for your React/TypeScript/TanStack/XState stack:

1. **Unit Tests**: Test individual components in isolation with mocked dependencies
2. **Integration Tests**: Test component interactions and data flow between components
3. **E2E Tests**: Test critical user flows using Playwright for realistic browser testing
4. **Coverage Goals**: Aim for 80% code coverage with focus on critical paths
5. **Test Structure**: Use Arrange-Act-Assert pattern for clear, readable tests
6. **Mock External Dependencies**: Mock API calls, routing, state management, and external services
7. **Test User Interactions**: Use React Testing Library's user-event for realistic interactions
8. **Accessibility Testing**: Include axe-core or similar for WCAG compliance verification
9. **Performance Testing**: Monitor bundle size and runtime performance in CI/CD
10. **State Machine Testing**: Test XState machines for all state transitions and edge cases
11. **Form Testing**: Validate form submissions, error states, and user input handling
12. **Error Boundary Testing**: Ensure error boundaries catch and display errors appropriately
13. **Responsive Testing**: Test components across different screen sizes and devices
14. **Internationalization Testing**: Verify i18n keys and locale switching if applicable
15. **Concurrent Testing**: Use Vitest's concurrent mode for faster test execution
16. **Snapshot Testing**: Use for UI components to catch unintended visual changes
17. **API Testing**: Test tRPC procedures and OpenRouter integration separately
18. **Custom Hook Testing**: Test custom hooks in isolation with renderHook from RTL
19. **Context Testing**: Test React contexts and providers for proper value propagation
20. **Type Testing**: Leverage TypeScript for compile-time testing of prop types

**Detailed Rationale:**
This testing approach provides:
- **Comprehensive Coverage**: Unit, integration, and E2E tests ensure reliability
- **Developer Experience**: Vitest's speed and TypeScript integration improve productivity
- **Accessibility**: Built-in a11y testing ensures WCAG compliance
- **Performance**: Bundle and runtime monitoring prevents regressions
- **State Management**: Specific testing for XState machines and Zustand stores

Trade-offs include the initial setup time for comprehensive testing, but it prevents bugs and ensures code quality for your complex workflow application.

## Environment Configuration

Based on your Vite + tRPC + OpenRouter stack, here's the comprehensive environment configuration for your frontend.

### Environment Variables

Here's the updated list of required environment variables focused on local development:

```bash
# .env.example - Environment variables template (Local Development)

# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WEBSOCKET_URL=ws://localhost:3001

# OpenRouter Configuration (API key stored in DB, not here)
# VITE_OPENROUTER_API_KEY=  # Removed - stored securely in database

# Feature Flags
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_MOCK_API=false
VITE_ENABLE_WORKFLOW_VISUALIZATION=false

# UI Configuration
VITE_DEFAULT_THEME=light  # light, dark, system
VITE_MAX_ARTIFACT_SIZE=10000  # lines
VITE_CHAT_RESPONSE_TIMEOUT=30000  # milliseconds

# Development Settings
VITE_ENABLE_DEVTOOLS=true

# Production Settings (for future use)
VITE_APP_URL=http://localhost:3000
```

**Updated Environment Variable Categories:**

**API and Service Configuration:**
- `VITE_API_URL`: Backend API endpoint for tRPC communication
- `VITE_WEBSOCKET_URL`: WebSocket endpoint for real-time updates
- `VITE_APP_URL`: Application URL for CORS and redirects (local for now)

**Feature Flags:**
- `VITE_ENABLE_DEBUG_MODE`: Enable debug logging and development tools
- `VITE_ENABLE_MOCK_API`: Use mock API responses for development
- `VITE_ENABLE_WORKFLOW_VISUALIZATION`: Enable React Flow visualization (future feature)

**UI and User Experience:**
- `VITE_DEFAULT_THEME`: Default theme (light/dark/system)
- `VITE_MAX_ARTIFACT_SIZE`: Maximum artifact size in lines
- `VITE_CHAT_RESPONSE_TIMEOUT`: Timeout for chat responses in milliseconds

**Development:**
- `VITE_ENABLE_DEVTOOLS`: Enable development tools in development

**Environment-Specific Files:**
```bash
# .env.local - Local development (gitignored)
VITE_API_URL=http://localhost:3001
VITE_WEBSOCKET_URL=ws://localhost:3001
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_DEVTOOLS=true

# .env.production - Future production (when needed)
VITE_API_URL=https://api.your-domain.com
VITE_WEBSOCKET_URL=wss://api.your-domain.com
VITE_APP_URL=https://your-domain.com
VITE_ENABLE_DEBUG_MODE=false
VITE_ENABLE_DEVTOOLS=false
```

**Usage in Application:**
```typescript
// lib/config.ts - Updated environment configuration
export const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  websocketUrl: import.meta.env.VITE_WEBSOCKET_URL,
  features: {
    debugMode: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
    mockApi: import.meta.env.VITE_ENABLE_MOCK_API === 'true',
    workflowVisualization: import.meta.env.VITE_ENABLE_WORKFLOW_VISUALIZATION === 'true',
  },
  ui: {
    defaultTheme: import.meta.env.VITE_DEFAULT_THEME,
    maxArtifactSize: parseInt(import.meta.env.VITE_MAX_ARTIFACT_SIZE || '10000'),
    chatTimeout: parseInt(import.meta.env.VITE_CHAT_RESPONSE_TIMEOUT || '30000'),
  },
  dev: {
    devtools: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
  },
  appUrl: import.meta.env.VITE_APP_URL,
} as const;

// Type-safe environment variable access
export type Config = typeof config;
```

**Detailed Rationale:**
This updated configuration provides:
- **Local Focus**: Simplified for local development without unnecessary production concerns
- **Security**: API keys handled through database storage as you specified
- **No Auth Overhead**: Removed JWT and authentication since no login system is needed
- **Essential Features**: Only variables necessary for current development phase
- **Future-Ready**: Structure allows easy addition of production variables when needed

Trade-offs include minimal configuration for now, but it keeps the setup simple and focused on your local development needs while maintaining scalability for future enhancements.

## Frontend Developer Standards

Based on your React/TypeScript/TanStack/XState stack, here's the comprehensive developer standards for your frontend.

### Critical Coding Rules

Here are the essential coding rules that prevent common AI mistakes, including universal and framework-specific guidelines:

**Universal Rules:**
1. **TypeScript Strict Mode**: Always use strict TypeScript settings - no `any` types, explicit typing for all variables and function parameters
2. **Error Handling**: Implement proper error boundaries and handle async errors with try-catch or `.catch()`
3. **Code Comments**: Add JSDoc comments for all public functions, interfaces, and complex logic
4. **Consistent Formatting**: Use Prettier for code formatting and ESLint for linting - no manual formatting
5. **Import Organization**: Group imports (React, third-party, internal) and use absolute paths with `@/` alias
6. **No Console Logs**: Never leave `console.log` statements in production code - use proper logging
7. **Accessibility**: Ensure all interactive elements have proper ARIA labels and keyboard navigation
8. **Performance**: Avoid unnecessary re-renders - use React.memo, useMemo, useCallback appropriately
9. **Security**: Never expose sensitive data in client-side code or commit API keys to version control
10. **Testing**: Write tests for all new features and maintain 80%+ code coverage

**React-Specific Rules:**
11. **Functional Components**: Use functional components with hooks - no class components
12. **Props Destructuring**: Always destructure props in function parameters
13. **Custom Hooks**: Extract reusable logic into custom hooks following the `use` prefix convention
14. **State Management**: Use Zustand for simple state, XState for complex workflows, TanStack Query for server state
15. **Component Composition**: Prefer composition over inheritance - build complex components from smaller ones
16. **Key Props**: Always provide unique `key` props when rendering lists
17. **Event Handlers**: Use arrow functions for event handlers to maintain proper `this` context
18. **Conditional Rendering**: Use logical AND (`&&`) for simple conditionals, avoid inline ternary operators in JSX
19. **Fragment Usage**: Use React.Fragment or `<>` for multiple root elements
20. **Prop Types**: Use TypeScript interfaces for prop validation instead of PropTypes

**TanStack Ecosystem Rules:**
21. **Query Keys**: Use consistent, hierarchical query keys for TanStack Query (e.g., `['projects', projectId, 'artifacts']`)
22. **Mutation Patterns**: Always handle loading and error states for mutations
23. **Cache Management**: Use TanStack Query's cache invalidation properly - don't manually manage cache
24. **Form Validation**: Use TanStack Form's built-in validation - no custom validation logic
25. **Router Types**: Use TanStack Router's generated types for all route parameters and search params

**XState Rules:**
26. **Machine Context**: Keep machine context minimal and focused - no business logic in machines
27. **Event Naming**: Use SCREAMING_SNAKE_CASE for all XState events
28. **State Transitions**: Ensure all state transitions are predictable and testable
29. **Machine Composition**: Break complex machines into smaller, composable machines
30. **Error States**: Include error states in all machines for proper error handling

**shadcn/ui + Tailwind Rules:**
31. **Utility Classes**: Use Tailwind utility classes directly in JSX - no custom CSS classes
32. **Component Variants**: Use shadcn/ui's built-in variants before creating custom styles
33. **Responsive Design**: Use mobile-first responsive design with Tailwind breakpoints
34. **Theme Consistency**: Use CSS custom properties for colors and spacing from your Winter palette
35. **Animation**: Use Tailwind's transition utilities and Framer Motion for complex animations

**File and Project Structure Rules:**
36. **File Naming**: Use kebab-case for files, PascalCase for components
37. **Directory Organization**: Follow feature-based directory structure (e.g., `components/chat/`)
38. **Index Files**: Create index.ts files for clean imports from directories
39. **Type Definitions**: Keep TypeScript types co-located with components or in dedicated types directories
40. **Asset Management**: Use Vite's asset handling for images and static files

### Quick Reference (Updated)

Here's your updated framework-specific cheat sheet with Bun and Turborepo commands:

**Common Commands:**
```bash
# Development (Bun)
bun dev              # Start development server
bun run build        # Build for production
bun run preview      # Preview production build
bun run test         # Run tests
bun run test:ui      # Run tests with UI
bun run lint         # Run ESLint
bun run type-check   # Run TypeScript type checking

# Turborepo (Monorepo Management)
turbo dev            # Run dev across all apps in monorepo
turbo build          # Build all packages in monorepo
turbo test           # Test all packages in monorepo
turbo lint           # Lint all packages in monorepo
turbo type-check     # Type check all packages in monorepo

# Specific app development
turbo dev --filter=web  # Run only web app in dev mode

# TanStack Router
npx @tanstack/router-cli generate  # Generate route types

# Database (if using)
bun run db:generate  # Generate database types
bun run db:push      # Push schema to database
```

**Key Import Patterns:**
```typescript
// React and core
import React from 'react';
import { useState, useEffect, useCallback } from 'react';

// TanStack ecosystem
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { createFileRoute, useParams, useSearch } from '@tanstack/react-router';

// State management
import { useStore } from 'zustand';
import { useMachine } from '@xstate/react';

// UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Utilities
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { config } from '@/lib/config';
```

**File Naming Conventions:**
```typescript
// Components
ChatInterface.tsx      # PascalCase for component name
chat-interface.tsx     # kebab-case for file name

// Hooks
useChat.ts             # camelCase with 'use' prefix

// Stores
useProjectStore.ts     # camelCase with 'use' prefix

// Machines
bmadWorkflowMachine.ts # camelCase

// Types
chat-types.ts          # kebab-case

// Utils
form-helpers.ts        # kebab-case
```

**Project-Specific Patterns:**

**Component Structure:**
```typescript
interface ComponentProps {
  id: string;
  className?: string;
  onAction?: (data: ActionData) => void;
}

export const ComponentName: React.FC<ComponentProps> = ({
  id,
  className,
  onAction,
}) => {
  // Custom hooks
  const { data, isLoading } = useQuery({...});
  const [state, send] = useMachine(machine);
  
  // Event handlers
  const handleClick = useCallback(() => {
    onAction?.({ type: 'click' });
  }, [onAction]);
  
  return (
    <div className={cn('base-classes', className)}>
      {/* JSX content */}
    </div>
  );
};
```

**State Management Patterns:**
```typescript
// Zustand store
export const useProjectStore = create<ProjectStore>()(
  devtools(persist(
    (set) => ({
      projects: [],
      setProjects: (projects) => set({ projects }),
      // ... other actions
    }),
    { name: 'project-store' }
  ))
);

// XState machine
export const workflowMachine = createMachine({
  initial: 'idle',
  states: {
    idle: { on: { START: 'loading' } },
    loading: { on: { SUCCESS: 'success', ERROR: 'error' } },
    success: { type: 'final' },
    error: { on: { RETRY: 'loading' } }
  }
});
```

**API Integration Patterns:**
```typescript
// tRPC usage
const { data, error, isLoading } = trpc.projects.list.useQuery();
const createProject = trpc.projects.create.useMutation();

// Error handling
if (error) {
  return <div>Error: {handleApiError(error)}</div>;
}
```

**Styling Patterns:**
```typescript
// Tailwind + shadcn/ui
<div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
  <Button variant="outline" size="sm">
    Action
  </Button>
</div>

// Conditional styling
<div className={cn(
  "base-classes",
  isActive && "active-classes",
  isLoading && "loading-classes"
)}>
```

**Testing Patterns:**
```typescript
// Component test
import { render, screen } from '@testing-library/react';

it('renders correctly', () => {
  render(<Component {...props} />);
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```

**Detailed Rationale (Updated):**
Requirements tracing confirms that these standards fully support your PRD requirements, including:
- **Type Safety**: Ensures reliable BMAD workflow implementation
- **Performance**: Supports real-time interactions and large artifact handling
- **Accessibility**: Maintains WCAG 2.1 AA compliance
- **Security**: Prevents API key exposure and ensures secure development
- **Monorepo Compatibility**: Works seamlessly with Bun and Turborepo

All standards are validated and ready for implementation.

---

## Document Creation Complete

The frontend architecture document has been successfully created and validated against your PRD requirements. All sections are complete and aligned with your project needs.

**Document Summary:**
- **Template and Framework Selection**: React 19 + TypeScript + TanStack ecosystem
- **Frontend Tech Stack**: Comprehensive stack with XState, Zustand, and shadcn/ui
- **Project Structure**: Feature-based organization optimized for your workflow
- **Component Standards**: TypeScript-first patterns with proper error handling
- **State Management**: Hybrid approach with TanStack Query + Zustand + XState
- **API Integration**: tRPC-based with functional patterns
- **Routing**: TanStack Router with protected routes and lazy loading
- **Styling Guidelines**: Tailwind + shadcn/ui with Winter palette
- **Testing Requirements**: Comprehensive testing with Vitest and RTL
- **Environment Configuration**: Local-focused with secure API key handling
- **Frontend Developer Standards**: 40+ rules validated against PRD

**Next Steps:**
1. **Implementation**: Start coding with the provided patterns and standards
2. **Validation**: Use the standards to ensure code quality
3. **Iteration**: Update architecture as needed during development

The document is now ready for your development team to use as a comprehensive guide for building Chiron.