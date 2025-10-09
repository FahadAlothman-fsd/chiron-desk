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
