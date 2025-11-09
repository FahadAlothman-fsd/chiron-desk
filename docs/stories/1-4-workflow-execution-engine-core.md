# Story 1.4: Workflow Execution Engine Core

**Epic:** Epic 1 - Foundation + Workflow-Init Engine  
**Status:** ready-for-dev  
**Estimated Effort:** 3 days  
**Assignee:** Dev Agent  
**Dependencies:** Story 1.3 (Web UI Foundation + LLM Models Page)

---

## User Story

As a **developer building Chiron's workflow orchestration system**,  
I want **a generic workflow execution engine that loads workflows from the database, executes steps sequentially, manages state, and resolves variables**,  
So that **all future BMAD workflows can be executed without custom code, enabling runtime workflow modification and consistent execution behavior across all methodology phases**.

---

## Context

Based on Epic 1 technical specification, PRD goals, and epics breakdown, Story 1.4 implements the core workflow execution engine that powers all BMAD workflows in Chiron. This is the foundational service layer that transforms database-stored workflow definitions into executable, stateful processes with variable resolution, step-by-step orchestration, and event-driven UI updates.

The engine delivers:

1. **Workflow Loader Service**: Reads workflow + steps from database by workflow ID, loads steps in correct order, validates workflow structure
2. **Step Executor Framework**: Generic step handler interface with type registry, sequential execution loop, automatic transitions
3. **Variable Resolver**: Resolves `{{variable}}` references using Handlebars with 4-level precedence (system → execution → step outputs → defaults)
4. **State Management**: Creates/updates `workflow_executions` records, tracks executed steps in JSONB, supports pause/resume
5. **Event System**: Emits workflow lifecycle events (`workflow_started`, `step_started`, `step_completed`, `workflow_completed`, `workflow_error`) for real-time UI updates
6. **UI Components**: `WorkflowStepper` progress indicator, `WorkflowStepContainer` wrapper with navigation buttons

**Architectural Constraints:**
- Workflow engine MUST be generic and reusable for all future workflows (not workflow-init-specific)
- Step handlers registered in type registry enable extensibility without engine refactoring
- JSONB `executedSteps` field tracks complete execution history for audit trail and resume capability
- Variable resolution follows exact BMAD precedence rules per `/bmad/core/tasks/workflow.xml`
- State persistence after each step completion ensures recovery from crashes
- Event-driven architecture enables real-time UI updates without polling

**Key Requirements:**
- FR002: Execute workflows following BMAD workflow.xml engine rules
- FR004: Resolve variables using 4-level precedence
- FR005: Maintain workflow state and enable resume/restart
- NFR002: 99%+ workflow execution success rate without data loss

[Source: docs/epics/tech-spec-epic-1.md - Story 1.4 Acceptance Criteria, System Architecture Alignment]  
[Source: docs/PRD.md - FR002, FR004, FR005, NFR002]  
[Source: docs/epics.md - Epic 1, Story 1.4 detailed spec]

---

## Acceptance Criteria

**Workflow Loader:**
- [ ] **AC1:** Workflow loader service reads workflow + steps from database by workflow ID
- [ ] **AC2:** Steps loaded in correct order (sorted by `stepNumber` ascending)
- [ ] **AC3:** Workflow structure validated (no missing steps, valid `nextStepNumber` references, no cycles)
- [ ] **AC4:** Validation errors thrown with clear messages (e.g., "Step 5 references nextStepNumber 3, creating cycle")

**Step Executor Framework:**
- [ ] **AC5:** Generic step handler interface defined: `executeStep(step, context) → result`
- [ ] **AC6:** Step type registry maps step types to handler implementations (`ask-user` → `AskUserStepHandler`)
- [ ] **AC7:** Step execution loop executes steps sequentially, respecting `nextStepNumber`
- [ ] **AC8:** Step transitions support auto-advance (backend-only steps) and wait-for-user-input modes
- [ ] **AC9:** Unrecognized step type throws clear error: "No handler registered for step type: {type}"

**Variable Resolver:**
- [ ] **AC10:** Variable resolver uses Handlebars templating for `{{variable}}` syntax
- [ ] **AC11:** 4-level precedence implemented correctly:
  - **Level 1:** System variables (`{{current_user_id}}`, `{{execution_id}}`, `{{date}}`)
  - **Level 2:** Execution variables (`workflow_executions.variables` JSONB)
  - **Level 3:** Step outputs (`executedSteps[N].output`)
  - **Level 4:** Default values (from step config)
- [ ] **AC12:** First match wins (Level 1 checked before Level 2, etc.)
- [ ] **AC13:** Nested variables supported: `{{user.name}}`, `{{array[0]}}`, `{{step_4.recommended_track}}`
- [ ] **AC14:** Missing required variable throws error: "Variable '{{project_name}}' not found in context"
- [ ] **AC15:** Handlebars templates compiled and cached to avoid re-parsing

**State Management:**
- [ ] **AC16:** `workflow_executions` record created on workflow start (status: "running")
- [ ] **AC17:** `currentStep` field updated after each step completion
- [ ] **AC18:** `executedSteps` JSONB field tracks step-by-step history with schema:
  ```json
  {
    "1": { "status": "completed", "output": {...}, "completedAt": "2025-11-08T12:30:00Z" },
    "2": { "status": "in-progress", "startedAt": "2025-11-08T12:31:00Z" }
  }
  ```
- [ ] **AC19:** Can pause workflow mid-execution (status: "paused")
- [ ] **AC20:** Can resume paused workflow from last completed step (load state from database)
- [ ] **AC21:** Workflow completion sets status to "completed" and `completedAt` timestamp
- [ ] **AC22:** Workflow errors set status to "error" and populate `error` text field

**Event System:**
- [ ] **AC23:** Events emitted at lifecycle transitions:
  - `workflow_started`: { executionId, workflowId, userId }
  - `step_started`: { executionId, stepNumber, stepType }
  - `step_completed`: { executionId, stepNumber, output }
  - `workflow_completed`: { executionId }
  - `workflow_error`: { executionId, error }
- [ ] **AC24:** Event system uses Node EventEmitter for internal event bus
- [ ] **AC25:** tRPC SSE subscription endpoint for real-time events with type safety and auto-reconnection via `tracked()` helper

**UI Components:**
- [ ] **AC26:** `WorkflowStepper` component displays:
  - "Step X of N" progress text
  - Visual progress bar (percentage: X/N * 100)
  - Current step title and goal from step config
- [ ] **AC27:** `WorkflowStepContainer` component features:
  - Wrapper for step-specific UI components
  - "Next" button (submits current step, advances)
  - "Back" button (navigate to previous step with warning)
  - Loading state while step executes (spinner + "Executing..." text)
  - Error display (red alert with error message + "Retry" button)
- [ ] **AC28:** Auto-advance for backend-only steps (execute-action, llm-generate execute and advance without user input)

**Testing:**
- [ ] **AC29:** Unit tests for workflow engine services:
  - Load workflow-init-new from database (metadata only, 0 steps for Story 1.4)
  - Execute empty workflow (0 steps) successfully
  - Variable resolution with all 4 precedence levels
  - Workflow state saves/loads from database
- [ ] **AC30:** Integration test: Start workflow → pause → resume from correct step
- [ ] **AC31:** Error handling test: Invalid step type triggers clear error
- [ ] **AC32:** Variable resolution test: Nested variables, arrays, missing variables

**Performance:**
- [ ] **AC33:** Step transitions execute within 200ms (excluding user think time)
- [ ] **AC34:** Variable resolution completes within 50ms for typical templates (<100 variables)
- [ ] **AC35:** Database queries for workflow loading complete within 100ms

---

## Tasks / Subtasks

### Task 1: Workflow Loader Service (AC: #1, #2, #3, #4)
- [ ] **Subtask 1.1:** Create `packages/api/src/services/workflow-engine/workflow-loader.ts`
  - Implement `loadWorkflow(workflowId: string)` function
  - Query `workflows` table by ID with eager loading of `workflow_steps` (use Drizzle `.with()`)
  - Sort steps by `stepNumber` ascending
  - Return structured object: `{ workflow: Workflow, steps: WorkflowStep[] }`
- [ ] **Subtask 1.2:** Implement workflow structure validation
  - Check no duplicate step numbers
  - Verify `nextStepNumber` references valid step (or null for final step)
  - Detect cycles using graph traversal algorithm
  - Throw descriptive errors: `WorkflowValidationError` with details
- [ ] **Subtask 1.3:** Write unit tests for workflow loader (using Bun test)
  - Test: Load workflow-init-new (0 steps initially - metadata only)
  - Test: Validation error for invalid nextStepNumber
  - Test: Validation error for cycle detection
  - Test: Steps sorted correctly by stepNumber

### Task 2: Step Executor Framework (AC: #5, #6, #7, #8, #9)
- [ ] **Subtask 2.1:** Define step handler interface
  - Create `packages/api/src/services/workflow-engine/step-handler.ts`
  - Define `StepHandler` interface:
    ```typescript
    interface StepHandler {
      executeStep(step: WorkflowStep, context: ExecutionContext, userInput?: any): Promise<StepResult>;
    }
    interface StepResult {
      output: any;
      nextStepNumber: number | null;
      requiresUserInput: boolean;
    }
    ```
- [ ] **Subtask 2.2:** Implement step type registry
  - Create `packages/api/src/services/workflow-engine/step-registry.ts`
  - Map: `{ "ask-user": AskUserStepHandler, "execute-action": ExecuteActionStepHandler, ... }`
  - Methods: `register(type, handler)`, `getHandler(type)`
  - Throw error if handler not found: `UnknownStepTypeError`
- [ ] **Subtask 2.3:** Implement step execution loop
  - Create `packages/api/src/services/workflow-engine/executor.ts`
  - `executeWorkflow(workflowId, userId)` function:
    1. Load workflow + steps
    2. Create `workflow_executions` record
    3. Loop: currentStep = 1 → execute → advance → repeat until nextStepNumber = null
    4. Handle user input steps: return to frontend, wait for submission
    5. Update executedSteps JSONB after each step
    6. Emit events at each transition
- [ ] **Subtask 2.4:** Write unit tests for step executor (using Bun test)
  - Test: Execute 0-step workflow (immediate completion)
  - Test: Handler registry returns correct handler
  - Test: Unknown step type throws error
  - Test: Execution loop respects nextStepNumber

### Task 3: Variable Resolver (AC: #10, #11, #12, #13, #14, #15)
- [ ] **Subtask 3.1:** Implement variable resolver with Handlebars
  - Create `packages/api/src/services/workflow-engine/variable-resolver.ts`
  - Install `handlebars` package: `bun add handlebars`
  - Implement `resolveVariables(template: string, context: ExecutionContext): string`
  - Build context object from 4 precedence levels (merge in order)
- [ ] **Subtask 3.2:** Define execution context type
  - Create `packages/api/src/services/workflow-engine/execution-context.ts`
  - Type: `ExecutionContext`:
    ```typescript
    interface ExecutionContext {
      systemVariables: { current_user_id, execution_id, date };
      executionVariables: Record<string, any>; // from workflow_executions.variables
      stepOutputs: Record<number, any>; // from executedSteps
      defaultValues: Record<string, any>; // from step config
    }
    ```
- [ ] **Subtask 3.3:** Implement precedence merging logic
  - Merge levels 1-4 in correct order (Level 1 overwrites Level 4 if conflict)
  - Support nested access: `{{user.name}}` → `context.user.name`
  - Support array access: `{{array[0]}}` → `context.array[0]`
  - Throw error for missing required variables
- [ ] **Subtask 3.4:** Cache Handlebars templates for performance
  - Use `Handlebars.compile(template)` and cache result by template string
  - Clear cache on workflow completion to avoid memory leaks
- [ ] **Subtask 3.5:** Write unit tests for variable resolver (using Bun test)
  - Test: System variables resolved ({{current_user_id}})
  - Test: Execution variables resolved ({{project_name}})
  - Test: Step outputs resolved ({{step_4.recommended_track}})
  - Test: Default values resolved (fallback)
  - Test: Precedence order (Level 1 > Level 2 > Level 3 > Level 4)
  - Test: Nested variables ({{user.name}})
  - Test: Array access ({{array[0]}})
  - Test: Missing variable throws error

### Task 4: State Management (AC: #16, #17, #18, #19, #20, #21, #22)
- [ ] **Subtask 4.1:** Implement workflow execution state creation
  - Create `packages/api/src/services/workflow-engine/state-manager.ts`
  - `createExecution(workflowId, projectId, userId)` function
  - Insert `workflow_executions` record:
    - `id`: generated UUID
    - `workflowId`, `projectId`, `userId` (from params)
    - `status`: "running"
    - `currentStep`: 1
    - `variables`: `{}` (empty object)
    - `executedSteps`: `{}` (empty object)
    - `startedAt`: current timestamp
  - Return execution ID
- [ ] **Subtask 4.2:** Implement step completion tracking
  - `updateExecutedSteps(executionId, stepNumber, result)` function
  - Fetch current `executedSteps` JSONB
  - Add new entry: `executedSteps[stepNumber] = { status: "completed", output: result, completedAt: timestamp }`
  - Update `currentStep` to next step number
  - Save back to database
- [ ] **Subtask 4.3:** Implement pause/resume functionality
  - `pauseExecution(executionId)`: Set status to "paused", save current state
  - `resumeExecution(executionId)`: Load state, continue from `currentStep`
  - Handle edge case: Resume on step requiring user input (re-prompt)
- [ ] **Subtask 4.4:** Implement workflow completion
  - `completeExecution(executionId)`: Set status to "completed", set `completedAt` timestamp
  - `failExecution(executionId, error)`: Set status to "error", populate `error` field
- [ ] **Subtask 4.5:** Write unit tests for state manager (using Bun test)
  - Test: Create execution record with correct fields
  - Test: Update executedSteps JSONB correctly
  - Test: Pause and resume from correct step
  - Test: Complete execution sets status and timestamp
  - Test: Fail execution sets error field

### Task 5: Event System (AC: #23, #24, #25)
- [ ] **Subtask 5.1:** Implement event bus
  - Create `packages/api/src/services/workflow-engine/event-bus.ts`
  - Use Node EventEmitter pattern
  - Methods: `emit(event, payload)`, `on(event, callback)`, `off(event, callback)`
- [ ] **Subtask 5.2:** Emit events in executor
  - workflow_started: Emit when execution record created
  - step_started: Emit before step handler executes
  - step_completed: Emit after step result saved
  - workflow_completed: Emit when nextStepNumber = null
  - workflow_error: Emit on any error (step execution, validation, database)
- [ ] **Subtask 5.3:** Implement tRPC SSE subscription endpoint
  - Add `onWorkflowEvent` subscription procedure to `workflowRouter`
  - Use `tracked()` helper for auto-reconnection with `lastEventId`
  - Listen to EventBus events and yield to subscribers filtered by `executionId`
  - Configure SSE options in `initTRPC` (ping interval, reconnection timeout)
  - Endpoint handled automatically by `@hono/trpc-server` via `fetchRequestHandler`
- [ ] **Subtask 5.4:** Frontend tRPC subscription hook
  - Use `trpc.workflows.onWorkflowEvent.useSubscription()` hook
  - Configure `httpSubscriptionLink` in tRPC client with `splitLink`
  - Invalidate TanStack Query cache on events received
  - Handle auto-reconnection and error states
- [ ] **Subtask 5.5:** Write unit tests for event system (using Bun test)
  - Test: Events emitted at correct lifecycle points
  - Test: Multiple subscribers receive same event
  - Test: Subscription yields correct events filtered by executionId
  - Test: `tracked()` provides correct event IDs for reconnection

### Task 6: UI Components - Wizard Stepper Pattern (AC: #26, #27, #28)

**Scope:** Implement wizard-style stepper for quick linear workflows (workflow-init). This is one of multiple stepper patterns - others (workbench, progress tracker, kanban) deferred to future stories.

- [ ] **Subtask 6.1:** Install animation dependencies
  - Add `framer-motion` to apps/web: `bun add framer-motion`
  - Enables smooth slide animations between steps
  
- [ ] **Subtask 6.2:** Create shared stepper types and abstractions
  - File: `apps/web/src/components/workflows/types.ts`
  - Define base types:
    - `WorkflowStepperBaseProps` - Common props for all stepper variants
    - `WorkflowStepDefinition` - Step metadata (id, number, name, status, icon)
    - `StepContentProps` - Props passed to step content components
    - `WorkflowStepperType` - Enum: 'wizard' | 'workbench' | 'progress' | 'kanban'
  - Export factory function: `getStepperComponent(type: WorkflowStepperType)`
  - Future steppers will extend these base types
  
- [ ] **Subtask 6.3:** Create IconWrapper component (corner bracket decoration)
  - File: `apps/web/src/components/ui/icon-wrapper.tsx`
  - Props: `children: ReactNode, variant?: 'primary' | 'muted' | 'success', size?: 'sm' | 'md' | 'lg'`
  - Visual: Border with L-bracket corners at all 4 corners (inspired by reference design)
  - Implementation: CSS borders with absolute positioned corner elements
  - Supports theming via variant prop
  - Used to wrap step icons for visual accent
  
- [ ] **Subtask 6.4:** Create WorkflowStepperWizard component (horizontal progress bar)
  - File: `apps/web/src/components/workflows/steppers/wizard/workflow-stepper-wizard.tsx`
  - Props: `currentStep: number, totalSteps: number, steps: WorkflowStepDefinition[], onStepClick?: (stepNumber) => void`
  - Visual layout: Horizontal bar at top of page
    - Completed steps: Thin green vertical bars (w-4 h-8)
    - Current step: Numbered box (w-8 h-8) with step name displayed
    - Upcoming steps: Thin grey vertical bars
  - Hover tooltips show step names for non-current steps
  - Responsive: Stack vertically on mobile, horizontal on desktop
  - Optional click navigation to previous steps (disabled by default)
  
- [ ] **Subtask 6.5:** Create WizardStepContainer component (animated step wrapper)
  - File: `apps/web/src/components/workflows/steppers/wizard/wizard-step-container.tsx`
  - Props: `step: WorkflowStepDefinition, children: ReactNode, onNext?: () => void, onBack?: () => void, isLoading?: boolean, error?: string, canContinue?: boolean`
  - Features:
    - Framer Motion slide animations (slide left/right based on direction)
    - AnimatePresence for smooth transitions between steps
    - IconWrapper integration for step icon display
    - Navigation buttons: "← Back" and "Continue →"
    - Conditional "Continue" button (disabled when canContinue=false)
    - Loading state: Spinner + "Executing..." text
    - Error state: Red alert with message + "Retry" button
  - Renders children (step-specific content can be forms, chat interfaces, previews, etc.)
  
- [ ] **Subtask 6.6:** Create example step content components (placeholder demos)
  - File: `apps/web/src/components/workflows/steppers/wizard/examples/simple-form-step.tsx`
    - Basic form with text input + validation
    - Demonstrates how to use WizardStepContainer
  - File: `apps/web/src/components/workflows/steppers/wizard/examples/chat-step-example.tsx`
    - Placeholder chat interface showing message list + input
    - Demonstrates complex UI inside wizard stepper (for Story 1.5+)
  - Note: These are just examples to prove the pattern - actual implementations in Stories 1.5-1.8
  
- [ ] **Subtask 6.7:** Implement auto-advance logic in executor
  - In `executor.ts`: Check `step.requiresUserInput` flag
  - If false: Execute step automatically and advance to next
  - If true: Pause execution, wait for user submission via tRPC mutation
  - UI shows brief loading state for auto-advancing steps (<200ms)
  
- [ ] **Subtask 6.8:** Write component tests (Vitest + React Testing Library)
  - Test: WorkflowStepperWizard displays correct progress (e.g., "Step 3 of 10")
  - Test: Completed/current/upcoming steps render with correct styles
  - Test: Hover tooltips appear on non-current steps
  - Test: WizardStepContainer shows Back/Continue buttons
  - Test: Framer Motion animations trigger on step change
  - Test: Loading state displays spinner
  - Test: Error state displays error message + retry button
  - Test: Conditional continue button (enabled/disabled based on canContinue prop)

**Deferred to Future Stories:**
- WorkflowStepperWorkbench (vertical sidebar, document editing) → Epic 2
- WorkflowStepperProgress (timeline, long-running tasks) → Epic 2/3
- WorkflowStepperKanban (multi-track, drag-drop) → Epic 3

### Task 7: Integration & Testing (AC: #29, #30, #31, #32, #33, #34, #35)
- [ ] **Subtask 7.1:** End-to-end integration test
  - Test: Load workflow-init-new from database (0 steps - metadata only for Story 1.4)
  - Test: Execute empty workflow (0 steps) → completes immediately
  - Test: Variable resolution with all 4 precedence levels
  - Test: Workflow state saves to database after each step
  - Test: Pause workflow → reload from database → resume from correct step
- [ ] **Subtask 7.2:** Error handling integration test
  - Test: Invalid step type triggers clear error
  - Test: Missing variable in template throws error
  - Test: Database connection failure during execution handled gracefully
- [ ] **Subtask 7.3:** Performance validation
  - Test: Step transitions complete within 200ms
  - Test: Variable resolution completes within 50ms for 100 variables
  - Test: Workflow loading completes within 100ms
- [ ] **Subtask 7.4:** Manual testing checklist
  - [ ] Can start workflow-init-new from UI (metadata-only workflow for Story 1.4)
  - [ ] WorkflowStepper displays correctly
  - [ ] Pause and resume workflow works
  - [ ] Events update UI in real-time
  - [ ] Error messages are clear and actionable

---

## Dev Notes

### Learnings from Previous Story (1.3 - Web UI Foundation + LLM Models Page)

**From Story 1.3 Completion:**
- Web UI foundation complete with sidebar navigation, home page, models page, and settings page
- TanStack Router configured and functional for all routes
- tRPC API infrastructure exists in `packages/api/` with routers for projects, models, settings
- Database client available at `@chiron/db` with Drizzle ORM
- 23 new files created, 8 modified - extensive UI component library established

**Existing Infrastructure to Reuse:**
- ✅ tRPC router pattern at `packages/api/src/routers/` - follow for workflow router
- ✅ Protected route pattern from `apps/web/src/routes/_authenticated.tsx` - use for workflow pages
- ✅ shadcn/ui components: sidebar, table, select, checkbox - use `<Progress>` for stepper
- ✅ TanStack Query for server state - use `useQuery` and `useMutation` for workflow API
- ✅ Service layer pattern at `packages/api/src/services/` - create workflow-engine/ directory

**New Patterns to Establish:**
- **Service directory structure:** `packages/api/src/services/workflow-engine/` with modular services
- **Step handler registry:** Extensible pattern for adding new step types without engine changes
- **Event-driven architecture:** Real-time UI updates via tRPC SSE subscriptions with TanStack Query invalidation
- **JSONB state tracking:** Use `executedSteps` for complete execution history

**Key Files to Create:**
- `packages/api/src/services/workflow-engine/workflow-loader.ts` - Load workflows from DB
- `packages/api/src/services/workflow-engine/executor.ts` - Main execution loop
- `packages/api/src/services/workflow-engine/step-handler.ts` - Handler interface
- `packages/api/src/services/workflow-engine/step-registry.ts` - Handler registry
- `packages/api/src/services/workflow-engine/variable-resolver.ts` - Handlebars resolver
- `packages/api/src/services/workflow-engine/state-manager.ts` - State persistence
- `packages/api/src/services/workflow-engine/event-bus.ts` - Event emitter (Node EventEmitter)
- `packages/api/src/services/workflow-engine/execution-context.ts` - Context types
- `packages/api/src/routers/workflows.ts` - Workflow tRPC router with SSE subscription
- `apps/web/src/hooks/useWorkflowEvents.ts` - tRPC subscription hook wrapper
- `apps/web/src/components/workflows/workflow-stepper.tsx` - Progress component
- `apps/web/src/components/workflows/workflow-step-container.tsx` - Step wrapper

**Key Files to Modify:**
- `packages/api/src/trpc.ts` - Configure SSE options in initTRPC
- `packages/api/src/routers/index.ts` - Add workflows router
- `apps/web/src/lib/trpc.ts` - Add httpSubscriptionLink with splitLink
- `apps/web/src/routes/__root.tsx` - Add workflow routes (future stories)

**Technical Debt from Story 1.3:**
- None blocking - build succeeds, all tests passing

[Source: stories/1-3-web-ui-foundation.md - Completion Notes, File List]  
[Source: packages/api/src/routers/]  
[Source: apps/web/src/routes/]

### Architecture Patterns and Constraints

**Workflow Engine Design Principles:**
1. **Generic and Extensible:** Engine must handle any BMAD workflow without custom code
2. **Step Handler Registry:** New step types added by implementing `StepHandler` interface and registering
3. **Declarative Configuration:** All workflow logic in database JSONB, not hardcoded
4. **State Machine Pattern:** Workflow status transitions: IDLE → RUNNING → PAUSED → COMPLETED → ERROR
5. **Event-Driven UI:** Backend emits events, frontend subscribes for real-time updates

**Variable Resolution Strategy:**
- Follow BMAD's exact precedence rules from `/bmad/core/tasks/workflow.xml`
- Use Handlebars for template syntax consistency with BMAD workflows
- Cache compiled templates for performance (avoid re-parsing on each step)
- Support nested variables and array access (common in BMAD workflows)

**State Persistence:**
- Save `executedSteps` JSONB after each step completion
- Enables resume from any step after crash or deliberate pause
- Provides complete audit trail for debugging and user visibility
- Bounded size: Max 50 steps per workflow (configurable)

**Error Handling:**
- All errors thrown as typed exceptions: `WorkflowValidationError`, `UnknownStepTypeError`, `VariableResolutionError`
- Error context includes: executionId, stepNumber, stepType, userId
- Errors saved to `workflow_executions.error` field for post-mortem analysis
- UI displays actionable error messages with "Retry" or "Cancel" options

**Testing Strategy:**
- Unit tests for each service in isolation (mocked dependencies)
- Integration tests for full workflow execution (real database)
- Component tests for UI with mocked tRPC queries
- Performance tests for variable resolution and step transitions
- Story 1.4 tests focus on empty workflow (0 steps) - step handlers tested in Stories 1.5-1.8

**Database Schema Alignment:**
- `workflows` table: workflow metadata (name, displayName, agentId, etc.)
- `workflow_steps` table: steps with JSONB config
- `workflow_executions` table: execution state with executedSteps JSONB
- JSONB validation: TypeScript type guards + runtime checks with Zod

**Extensibility for Future Stories:**
- Story 1.5-1.8: Add step handler implementations (AskUserStepHandler, ExecuteActionStepHandler, etc.)
- Epic 2+: Add new step types (branch, approval-checkpoint, invoke-workflow) by implementing `StepHandler` and registering
- No engine refactoring required when adding new step types

**Stepper UI Architecture:**
- **Multiple stepper patterns** for different workflow types: wizard (quick linear), workbench (document editing), progress (long-running tasks), kanban (multi-track)
- Story 1.4 implements **wizard stepper only** - horizontal progress bar with slide animations (Framer Motion)
- Wizard stepper is **navigation pattern** - step content can be simple forms OR complex UIs (chat interfaces, rich editors, previews)
- Chat interfaces (like complexity analysis in workflow-init step 4) live **inside** wizard stepper steps
- IconWrapper component provides corner bracket decoration (inspired by reference design)
- Future stepper types (workbench, progress, kanban) deferred to Epic 2+
- Database `stepper_type` field discussion deferred to Stories 1.5-1.8 (when implementing actual workflow-init steps)

### Project Structure Notes

**Service Directory Structure:**
```
packages/api/src/services/workflow-engine/
  workflow-loader.ts        # Load workflows from DB
  executor.ts               # Main execution loop
  step-handler.ts           # Handler interface
  step-registry.ts          # Handler registry
  variable-resolver.ts      # Handlebars resolver
  state-manager.ts          # State persistence
  event-bus.ts              # Event emitter
  execution-context.ts      # Context types
  step-handlers/            # Handler implementations (Stories 1.5-1.8)
    ask-user-handler.ts
    execute-action-handler.ts
    llm-generate-handler.ts
    ask-user-chat-handler.ts
    display-output-handler.ts
```

**Component Directory Structure:**
```
apps/web/src/components/workflows/
  types.ts                                 # Shared types & stepper factory
  steppers/                                # Multiple stepper pattern implementations
    wizard/                                # Quick linear workflows (Story 1.4)
      workflow-stepper-wizard.tsx          # Horizontal progress bar
      wizard-step-container.tsx            # Animated step wrapper
      examples/                            # Demo components
        simple-form-step.tsx               # Form example
        chat-step-example.tsx              # Chat interface example
    workbench/                             # Document editing (Epic 2)
      workflow-stepper-workbench.tsx       # Vertical sidebar navigation
      workbench-editor.tsx                 # Rich text editor area
    progress/                              # Long-running tasks (Epic 2/3)
      workflow-stepper-progress.tsx        # Timeline view
      progress-log.tsx                     # Expandable logs
    kanban/                                # Multi-track workflows (Epic 3)
      workflow-stepper-kanban.tsx          # Board view
      kanban-column.tsx                    # Draggable columns
  steps/                                   # Step-specific UI (Stories 1.5-1.8)
    ask-user-step.tsx
    execute-action-step.tsx
    llm-generate-step.tsx
    ask-user-chat-step.tsx
    display-output-step.tsx
```

**Stepper Pattern Usage:**
- **Wizard:** workflow-init (quick setup), simple configurations
- **Workbench:** PRD creation, architecture design (document-focused, non-linear)
- **Progress:** Code generation, LLM workflows (real-time progress tracking)
- **Kanban:** Sprint planning, batch operations (multi-item management)

**Note:** Story 1.4 only implements the Wizard stepper. Step content (inside wizard) can be simple forms OR complex UIs like chat interfaces, previews, etc.

### References

**Primary Source Documents:**
- [Source: docs/epics/tech-spec-epic-1.md - Story 1.4 Acceptance Criteria, Workflow Engine Service specification]
- [Source: docs/PRD.md - FR002, FR004, FR005, NFR002]
- [Source: docs/epics.md - Epic 1, Story 1.4 detailed spec]
- [Source: bmad/core/tasks/workflow.xml - Variable resolution precedence rules, step execution flow]

**Implementation Patterns:**
- [Source: packages/api/src/routers/projects.ts - tRPC router pattern reference]
- [Source: packages/api/src/services/models.ts - Service layer pattern reference]
- [Source: apps/web/src/routes/_authenticated.tsx - Protected route pattern]

**External References:**
- [Source: https://handlebarsjs.com/ - Handlebars templating documentation]
- [Source: https://nodejs.org/api/events.html - Node EventEmitter API]

---

## Change Log

| Date | Author | Change Description |
|------|--------|-------------------|
| 2025-11-08 | SM Agent (fahad) | Initial story draft created via *create-story workflow (non-interactive mode) |

---

## Dev Agent Record

### Context Reference
**Story Location:** docs/stories/1-4-workflow-execution-engine-core.md  
**Epic:** Epic 1 - Foundation + Workflow-Init Engine  
**Dependencies:** Story 1.3 (Web UI Foundation + LLM Models Page) - In Review  
**Story Context File:** docs/stories/1-4-workflow-execution-engine-core.context.xml

### Agent Model Used
(To be filled by Dev Agent during implementation)

### Debug Log References
(To be filled by Dev Agent during implementation)

### Completion Notes List
(To be filled by Dev Agent during implementation)

### File List
(To be filled by Dev Agent during implementation)
