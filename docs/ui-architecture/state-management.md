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
