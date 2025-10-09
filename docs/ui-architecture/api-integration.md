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

