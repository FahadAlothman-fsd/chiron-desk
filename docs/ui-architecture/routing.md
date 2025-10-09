
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

