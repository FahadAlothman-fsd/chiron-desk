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

