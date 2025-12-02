# Story 2.2: Workbench Shell & Setup (Step 1)

Status: ready-for-dev

## Story

As a User,
I want a split-pane interface where I can chat with the Brainstorming agent to define the topic and goals,
so that the brainstorming session is properly scoped before I begin generating ideas.

## Acceptance Criteria

1. **Seed Step 1:** Configure `brainstorming` workflow Step 1 with `update_topic`, `update_goals`, `select_techniques` Mastra tools (first real tools with structured inputs)
2. **Workbench Layout:** Implement resizable Split-Pane layout with Chat interface on left and Artifact preview on right
3. **Chat Interface:** Render chat timeline with same ask-user-chat pattern currently used in workflow-init (message history, agent reasoning, tool call indicators)
4. **Tool Execution:** Implement same conversational tool pattern as workflow-init - agent asks, user responds, agent calls tools with structured data
5. **Validation:** Verify tools (`update_topic`, `update_goals`) work end-to-end with Mastra agent, test structured input handling

## Tasks / Subtasks

- [x] Task 1: Configure Brainstorming Workflow Step 1 with Mastra Tools (AC: 1)
  - [x] Subtask 1.1: Create new seed file `packages/scripts/src/seeds/brainstorming.ts` (follows workflow-init-new.ts pattern)
  - [x] Subtask 1.2: Define step config with `stepType: "ask-user-chat"` and Mastra tools: `update_topic`, `update_goals`, `select_techniques`
  - [x] Subtask 1.3: Enhance `update-variable-tool.ts` to support array valueSchema (added case "array": z.array(z.string()))
  - [x] Subtask 1.4: Configure Analyst agent (Brainstorming Coach) with completionCondition (all-variables-set), outputVariables mapping (topic, goals, techniques)
  - [x] Subtask 1.5: Run seed script to populate database with Step 1 configuration (verified with db:seed:reset)
  - [x] Subtask 1.6: Write integration test for Step 1 seed data validation (packages/scripts/src/seeds/brainstorming.test.ts)

- [x] Task 2: Implement Split-Pane Workbench Layout (AC: 2)
  - [x] Subtask 2.1: Add shadcn/ui `resizable` component (uses react-resizable-panels internally)
  - [x] Subtask 2.2: Create `WorkbenchLayout` component at `apps/web/src/components/workflows/workbench-layout.tsx`
  - [x] Subtask 2.3: Implement left pane for chat interface with header and overflow handling
  - [x] Subtask 2.4: Implement right pane for artifact preview with Card wrapper
  - [x] Subtask 2.5: Add ResizableHandle with localStorage persistence for panel sizes

- [x] Task 2.5: Create Universal Workflow Route (AC: 2)
  - [x] Subtask 2.5.1: Create route `/projects/:projectId/workflow/:executionId` at `apps/web/src/routes/projects/$projectId.workflow.$executionId.tsx`
  - [x] Subtask 2.5.2: Implement WorkflowExecutionPage component with workbench layout integration
  - [x] Subtask 2.5.3: Add WorkbenchChatInterface component that renders current step (ask-user-chat support)
  - [x] Subtask 2.5.4: Add ArtifactPreview component with live variable display (topic, goals, techniques)
  - [x] Subtask 2.5.5: Update project dashboard to navigate to new route with executionId
  - [x] Subtask 2.5.6: Add legacy workflow fallback for non-workbench workflows

- [ ] Task 3: Implement Chat Timeline Interface (AC: 3)
  - [ ] Subtask 3.1: Create `ChatTimeline` component with message list rendering
  - [ ] Subtask 3.2: Create `ChatMessage` component with support for user/assistant/system messages
  - [ ] Subtask 3.3: Add collapsible sections for agent reasoning (🤔 REASONING) and tool calls (🛠️ TOOL CALLS)
  - [ ] Subtask 3.4: Implement auto-scroll to latest message with smooth scrolling
  - [ ] Subtask 3.5: Add loading indicators for agent processing state
  - [ ] Subtask 3.6: Write unit tests for ChatTimeline component

- [ ] Task 4: Implement Mastra Tool Execution (AC: 4)
  - [ ] Subtask 4.1: Extend existing ask-user-chat handler to support Mastra tools (same pattern as workflow-init)
  - [ ] Subtask 4.2: Implement tool definitions for `update_topic`, `update_goals`, `select_techniques` with Zod schemas
  - [ ] Subtask 4.3: Test conversational flow: Agent asks → User responds → Agent calls tool with structured data
  - [ ] Subtask 4.4: Display tool execution in chat timeline (🛠️ TOOL CALLS collapsible section - already implemented)
  - [ ] Subtask 4.5: Verify tool results stored in `workflow_executions.variables` JSONB
  - [ ] Subtask 4.6: Write unit tests for new Mastra tools

- [ ] Task 5: Backend Tool Implementation (AC: 1, 4)
  - [ ] Subtask 5.1: Extend `packages/api/src/services/workflow-engine/mastra-tools.ts` with new tools
  - [ ] Subtask 5.2: Implement `update_topic` tool: Zod schema (z.object({ topic: z.string() })), stores in variables.session_topic
  - [ ] Subtask 5.3: Implement `update_goals` tool: Zod schema (z.object({ goals: z.array(z.string()) })), stores in variables.stated_goals
  - [ ] Subtask 5.4: Implement `select_techniques` tool: Zod schema (z.object({ techniques: z.array(z.string()) })), validates technique IDs exist in workflows table
  - [ ] Subtask 5.5: Test tools execute when agent calls them during conversation (same as workflow-init pattern)
  - [ ] Subtask 5.6: Write integration tests for tool execution and variable storage

- [ ] Task 6: Integration & Validation (AC: 5)
  - [ ] Subtask 6.1: Test full conversational flow: Agent asks for topic → User responds "AI-powered task manager" → Agent calls `update_topic` → Stored in variables
  - [ ] Subtask 6.2: Test goals collection: Agent asks for goals → User lists goals → Agent calls `update_goals` with array → Stored in variables
  - [ ] Subtask 6.3: Test technique selection: Agent presents options → User selects → Agent calls `select_techniques` → Stored in variables
  - [ ] Subtask 6.4: Verify split-pane workbench enhances existing ask-user-chat pattern (same conversation flow, better UI)
  - [ ] Subtask 6.5: Test error handling: Invalid technique ID, empty goals array, malformed inputs
  - [ ] Subtask 6.6: Verify this is first real test of Mastra tools with structured inputs (beyond simple string storage)

## Dev Notes

### Architecture Patterns

**Split-Pane Pattern:**
- Uses `react-resizable-panels` for smooth resize experience
- Persistent sizing stored in localStorage per user preference
- Minimum pane width: 300px (prevents collapse)
- Default split: 50/50 on first load

**Tool Execution Pattern (Same as workflow-init):**
- Agent executes with Mastra's `generate()` API in conversational multi-turn pattern
- Agent presents information, user responds in chat, agent processes and calls tools
- Tools execute immediately when agent calls them (same pattern as current `set_project_name`, `set_project_path`)
- **Story 2.2 Tests:** First real Mastra tools: `update_topic` and `update_goals` with structured inputs
- Tools store results in `workflow_executions.variables` JSONB field
- **Enhancement:** Artifact Workbench adds split-pane layout to existing ask-user-chat pattern

**Chat Timeline as Version Control:**
- Not implemented in Story 2.2 (deferred to Story 2.6)
- This story focuses on basic chat rendering for Step 1 setup only

### Component Structure

```
apps/web/src/
├── routes/
│   └── workbench/
│       └── $executionId.tsx        # Main workbench route
├── components/
│   └── workbench/
│       ├── SplitPaneLayout.tsx     # Resizable container
│       ├── ChatPane.tsx            # Left pane wrapper
│       ├── ArtifactPane.tsx        # Right pane wrapper (basic for now)
│       ├── ChatTimeline.tsx        # Message list
│       ├── ChatMessage.tsx         # Individual message component
│       └── ToolCallCard.tsx        # Blocking tool UI
```

### Mastra Agent Configuration

Step 1 agent instructions should:
1. Greet user and explain brainstorming session structure
2. Ask for session topic → User responds in natural language → Agent calls `update_topic({ topic: "..." })`
3. Ask for stated goals → User lists goals → Agent calls `update_goals({ goals: ["...", "..."] })`
4. Present technique options → User selects techniques → Agent calls `select_techniques({ techniques: ["scamper", "six-hats"] })`
5. Confirm session setup complete and transition to Step 2

**Key Pattern (Same as workflow-init):**
- Agent asks open-ended questions
- User responds conversationally in chat
- Agent interprets response and structures data
- Agent calls tool with structured Zod-validated input
- Tool stores result in `workflow_executions.variables`
- **No suspension needed** - agent handles multi-turn conversation naturally with `generate()`

**Story 2.2 Innovation:**
- First real test of Mastra tools with **complex structured inputs** (arrays, objects)
- Previous tools were simple string storage (`set_project_name`, `set_project_path`)
- These tools validate data structures, query database, transform user input

### Project Structure Notes

- Split-pane workbench route created at `/workbench/$executionId`
- Component library extended with workbench-specific UI patterns
- tRPC router added for tool execution (`packages/api/src/routers/tools.ts`)
- Seed data extended to include brainstorming workflow Step 1

### Design Decisions & Story Scope

**Story 2.2 Scope:**
- ✅ **Core Pattern:** Enhance existing ask-user-chat with split-pane Artifact Workbench UI
- ✅ **Tool Innovation:** First Mastra tools with structured inputs (`update_topic`, `update_goals`, `select_techniques`)
- ✅ **Conversation Flow:** Same multi-turn pattern as workflow-init (agent asks → user responds → agent calls tools)
- ✅ **UI Enhancement:** Split-pane layout provides better visualization than single-pane chat
- ✅ **Testing Focus:** Validate Mastra tools work with complex data structures (arrays, validation, database queries)

**Not "Basic" - This is Full ask-user-chat Enhancement:**
- This is the **exact same conversational pattern** used in workflow-init (Stories 1.6, 1.7, 1.8)
- Split-pane layout is the enhancement (artifact preview + chat side-by-side)
- Tools are more sophisticated than previous stories (structured inputs, validation, database integration)
- We're testing that Mastra tool pattern scales beyond simple string storage

### Learnings from Previous Story

**From Story 2.1 (Status: done)**

- **Schema Refactor Success:** JSONB `tags` and `metadata` pattern works well for flexible workflow configuration
  - Use same pattern for tool configurations in Step 1 config JSONB
  - Store tool schemas in `config.tools` array with `name`, `description`, `schema`, `requiresUserInput`
- **Dashboard Integration:** Project dashboard already routes to workflows
  - Workbench route should be triggered when user clicks "Start Brainstorming"
  - Pass `executionId` to workbench route via navigation
- **Database Migration Pattern:** Interactive `drizzle-kit push` required for new columns
  - No new columns needed for Story 2.2 (using existing `workflow_steps.config` JSONB)
- **API Endpoint Pattern:** `getByPhase` endpoint demonstrates JSONB tag filtering
  - Use similar pattern for querying technique workflows by tag: `tags->>'type' = 'technique'`
- **Seed Data Organization:** Workflow seeding logic is in `packages/scripts/src/seeds/workflows.ts`
  - Add brainstorming Step 1 to existing seed file
  - Use helper functions for consistency (e.g., `createWorkflowStep()`)
- **Executor Pattern:** Agent ID retrieved from `metadata.agentId` JSONB field
  - Ensure Step 1 config includes `metadata: { agentId: "analyst" }` (brainstorming uses Analyst agent)
- **Pre-existing TypeScript Errors:** Test files had unrelated errors, not blocking
  - Focus on new workbench components, don't fix unrelated test issues in this story

### References

- [Source: docs/epics/epic-2-artifact-workbench.md#Story-2.2] - Story requirements and acceptance criteria
- [Source: docs/PRD.md#Epic-7] - Chat Interface Patterns (Pattern D: Focused Dialogs)
- [Source: docs/architecture/architecture-decisions.md#Decision-7] - Mastra + Ax integration architecture
- [Source: docs/architecture/database-schema-architecture.md#Pattern-1] - JSONB step configuration pattern
- [Source: docs/sprint-artifacts/2-1-project-dashboard.md#Dev-Agent-Record] - Previous story context and learnings

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/2-2-workbench-shell-and-setup.context.xml`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

**Implementation Plan - Task 1: Configure Brainstorming Workflow Step 1 with Mastra Tools**

Analysis of context file reveals:
- Need to create new seed file: `packages/scripts/src/seeds/brainstorming.ts`
- Configure Step 1 with 3 tools (not in story file Task subtasks but in context file):
  1. `update_topic` - update-variable tool storing session_topic (string)
  2. `update_goals` - update-variable tool storing stated_goals (array)
  3. `select_techniques` - ax-generation tool with optionsSource from workflows table

Key changes needed:
1. Enhance `update-variable-tool.ts` to support array valueSchema (case "array": z.array(z.string()))
2. Create brainstorming.ts seed following workflow-init-new.ts pattern
3. Configure completionCondition: all-variables-set with requiredVariables
4. Configure outputVariables mapping for template rendering
5. Use Brainstorming Coach agent (from bmad/cis/agents/brainstorming-coach.md)

Starting implementation...

**Task 1 Completion Summary:**
✅ Created `packages/scripts/src/seeds/brainstorming.ts` following workflow-init-new.ts pattern
✅ Enhanced `update-variable-tool.ts` to support array type (added case "array")
✅ Configured Step 1 with 3 Mastra tools:
   - `update_topic` (update-variable, session_topic, string)
   - `update_goals` (update-variable, stated_goals, array, requires session_topic)
   - `select_techniques` (ax-generation, optionsSource from workflows table filtered by tags->'type'='technique')
✅ Set completionCondition: all-variables-set with requiredVariables: [session_topic, stated_goals, selected_techniques]
✅ Configured outputVariables mapping for template rendering
✅ Registered seed in seed.ts and verified execution with db:seed:reset
✅ Created integration test (brainstorming.test.ts) with comprehensive validation

Files Modified:
- packages/api/src/services/workflow-engine/tools/update-variable-tool.ts (added array support)
- packages/scripts/src/seeds/brainstorming.ts (new file)
- packages/scripts/src/seeds/brainstorming.test.ts (new file)
- packages/scripts/src/seed.ts (registered seedBrainstorming)

**Task 2 & 2.5 Completion Summary:**
✅ Added shadcn/ui resizable component using bunx shadcn@latest add resizable
✅ Created WorkbenchLayout component with:
   - ResizablePanelGroup (horizontal direction)
   - Left pane: Chat interface with header ("Chat") and flexible content area
   - Right pane: Artifact preview with header ("Artifact Preview") and scrollable card
   - ResizableHandle with localStorage persistence (workbench-chat-size key)
   - Configurable default split (defaultChatSize prop, default 50%)
   - Min/max size constraints (30-70%)
   - showArtifact prop to hide right pane when no artifact
✅ Created universal workflow route `/projects/:projectId/workflow/:executionId`:
   - WorkflowExecutionPage component with query polling (2s interval when running)
   - WorkbenchChatInterface renders current step (ask-user-chat support)
   - ArtifactPreview component displays live variables (topic, goals, techniques)
   - Legacy workflow fallback for non-workbench workflows
   - usesWorkbench flag (checks workflow.name === "brainstorming")
✅ Updated project dashboard ($projectId.tsx) to navigate to new route with executionId
✅ TanStack Router routes regenerated

Files Created/Modified (Task 2 & 2.5):
- apps/web/src/components/ui/resizable.tsx (new, shadcn component)
- apps/web/src/components/workflows/workbench-layout.tsx (new)
- apps/web/src/routes/projects/$projectId.workflow.$executionId.tsx (new)
- apps/web/src/routes/projects/$projectId.tsx (modified - navigation update)

### Completion Notes List

### File List

**Modified:**
- `packages/api/src/services/workflow-engine/tools/update-variable-tool.ts` - Added array type support
- `apps/web/src/routes/projects/$projectId.tsx` - Updated to navigate to new universal workflow route
- `packages/scripts/src/seed.ts` - Registered seedBrainstorming function

**Created:**
- `packages/scripts/src/seeds/brainstorming.ts` - Brainstorming workflow Step 1 seed configuration
- `packages/scripts/src/seeds/brainstorming.test.ts` - Integration test for brainstorming seed
- `apps/web/src/components/ui/resizable.tsx` - Shadcn resizable component
- `apps/web/src/components/workflows/workbench-layout.tsx` - Split-pane workbench layout
- `apps/web/src/routes/projects/$projectId.workflow.$executionId.tsx` - Universal workflow execution route
