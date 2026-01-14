# Brainstorming Session Results

**Session Date:** 2025-01-24
**Facilitator:** Strategic Business Analyst Mary
**Participant:** fahad

## Executive Summary

**Topic:** Chiron - BMAD-powered project management platform architecture

**Session Goals:**
Explore four critical aspects:

1. Interactive question/answer/refine UX pattern
2. **How to implement BMAD workflows within a project management context** (PRIMARY FOCUS)
3. Balance between BMM/CIS modules and traditional PM features
4. Agentic architecture (ax + ai-sdk + xstate)

**Techniques Used:** First Principles Thinking, Mind Mapping (partial)

**Total Ideas Generated:** 15+ architectural insights

### Key Themes Identified:

1. **Chiron is a BMAD Workflow Engine with PM UI**, not a PM tool that uses BMAD
2. **Modules are data collections** (workflows + agents + techniques) seeded from BMAD CSVs
3. **Workflow engine is a state machine** with sequential step processing, variable resolution, and nested workflow support
4. **UI adds value through interactivity** - Q&A dialogs, artifact refinement, workflow visualization
5. **Architecture separates concerns** - Engine rules in code, workflows in data, UI renders state

## Technique Sessions

### First Principles Thinking (20-25 min)

**Goal:** Understand BMAD workflow engine fundamentals

**Process:**

- Started with understanding workflow-init workflow execution
- Asked BMAD agent 10 detailed implementation questions
- Received complete execution pseudocode, state management details, variable resolution flow

**Key Discoveries:**

**Fundamental Truth #1: Three-File Minimum**
Every workflow needs:

1. workflow.yaml - Configuration, variables, file paths
2. instructions.md - Execution steps with XML tags
3. config.yaml - Project context, user settings
4. template.md (optional) - For document generation workflows

**Fundamental Truth #2: Variable Resolution Chain**
4-level precedence:

1. user_responses (from `<ask>` tags) - Highest priority
2. workflow.yaml variables - Medium priority
3. system_variables (date, paths) - Low priority
4. inherited_vars (from parent workflows) - Lowest priority

**Fundamental Truth #3: Sequential Step Execution**
Engine processes steps (n=1, n=2, n=3...) with XML tag handlers:

- `<action>` → Execute immediately
- `<ask>` → Prompt user, HALT until response
- `<invoke-workflow>` → Call child workflow, manage call stack
- `<template-output>` → Save checkpoint, show user, wait for approval
- `<check if>` → Conditional logic
- `<elicit-required>` → Enhancement loop with CSV-driven methods

**Fundamental Truth #4: Two Workflow Types**

- Template workflows (`template: true`) → Create/edit files
- Action workflows (`template: false`) → Perform actions, no file output

**Fundamental Truth #5: Workflow Communication**
Via `<invoke-workflow>` with call stack management:

- Parent state saved to call stack
- Child inherits parent variables
- Child returns template-output values
- Parent resumes after child completes

**Fundamental Truth #6: Status as Central Coordinator**
`workflow-status.md` (→ DB table in Chiron) is single source of truth:

- Stores current phase, workflow, next action
- Other workflows read (validate mode) and update (update mode)
- Acts as both workflow and service

**Fundamental Truth #7: Validation as Quality Gate**
Optional validation runs at workflow completion before marking done

**Implementation Insights from BMAD Agent:**

**WorkflowState Object:**

```typescript
{
  // Execution tracking
  current_step: number;
  yolo_mode: boolean;

  // Variable management (4-level precedence)
  variables: {
  } // workflow.yaml
  user_responses: {
  } // <ask> tags
  system_variables: {
  } // date, paths
  inherited_vars: {
  } // from parent

  // Workflow invocation
  call_stack: []; // nested workflows
  return_values: {
  } // child outputs
  parent_workflow: {
  } // parent reference

  // File & content
  output_file: string;
  current_content: string;

  // Error handling
  rollback_points: [];
  errors: [];
}
```

**Execution Loop Pseudocode:**

```python
while current_step <= total_steps:
  step = instructions.steps[current_step - 1]

  # Check attributes (optional, if, for-each)
  if step.optional and not yolo: ask_user()
  if step.if_condition: evaluate()

  # Execute content
  for element in step.content:
    if tag == 'action': execute_action()
    if tag == 'ask': user_response = ask_user()
    if tag == 'invoke-workflow': invoke_workflow()
    if tag == 'template-output': save_checkpoint()

  # Special tags
  if step.has_elicit: run_elicitation_loop()

  current_step++
```

**Insights Generated:**

- BMAD workflows are markdown with embedded XML, not pure XML
- State management is central - all execution flows through WorkflowState
- Modules are just workflow collections + data seeded into DB
- Engine doesn't care about BMM vs CIS - executes workflows generically
- Custom business logic = implementing engine rules in TypeScript

### Mind Mapping (15-20 min) - Partial

**Goal:** Visualize complete Chiron system architecture

**Main Branches Identified:**

1. **Workflow Engine** (State Machine)
   - WorkflowState (core state object)
   - ExecutionLoop (step-by-step processor)
   - TagHandlers (action, ask, check, invoke-workflow)
   - VariableResolver (4-level precedence)
   - CallStack (nested workflow support)
   - ErrorHandler (checkpoints & rollback)

2. **Data Layer** (Seeded from BMAD)
   - Workflows (from workflow-manifest.csv)
   - Agents (from agent-manifest.csv)
   - Techniques (from \*-methods.csv)
   - Patterns (from pattern-categories.csv)
   - Runtime State (projects, stories, artifacts)

3. **UI Layer** (Added Value)
   - Interactive Q&A (question dialogs)
   - Artifact Refinement (real-time preview + refine)
   - Workflow Visualizer (react-flow)
   - Dashboard (phase/status display)
   - Kanban Board (story management)

4. **Agent Orchestration** (ax + ai-sdk + xstate)
   - ax (DSPy TypeScript - agent framework)
   - ai-sdk (Vercel AI - LLM calls)
   - xstate (State machines for workflows)
   - Agent executors (analyst, dev, architect)

5. **BMM Module** (4-Phase Workflow)
   - Phase 1: Analysis
   - Phase 2: Planning
   - Phase 3: Solutioning
   - Phase 4: Implementation

6. **CIS Module** (Creative Engine)
   - Brainstorming (36 techniques)
   - Problem Solving (31 methods)
   - Design Thinking (31 methods)
   - Innovation Strategy

**Session Paused:** User decided to start implementation rather than complete all branches

## Idea Categorization

### Immediate Opportunities

_Ideas ready to implement now_

1. **Build WorkflowEngine core class**
   - Implement WorkflowState type
   - Build variable resolver with 4-level precedence
   - Create step processor and tag handlers
   - Based on BMAD agent's pseudocode

2. **Design DB schema for module seeding**
   - workflows, agents, techniques, patterns tables
   - project_workflows, workflow_status, stories, epics tables
   - Seed from BMAD CSVs (workflow-manifest, agent-manifest, brain-methods, etc.)

3. **Implement workflow-init as proof of concept**
   - First complete workflow execution
   - Tests entire engine: variable resolution, step execution, status creation
   - Validates architecture before building more

4. **Build QuestionDialog component**
   - Core of interactive UX
   - Answer/Refine/Skip actions
   - Maps to BMAD's `<ask>` tag handling

### Future Innovations

_Ideas requiring development/research_

1. **Interactive artifact refinement UI**
   - Real-time preview as user answers questions
   - Inline editing with AI suggestions
   - Version history and rollback

2. **Workflow visualization with react-flow**
   - Show current position in workflow path
   - Visualize phase transitions
   - Display workflow dependencies

3. **Agent orchestration layer**
   - Integrate ax (DSPy TypeScript port)
   - Use ai-sdk for LLM calls
   - xstate for workflow state machines
   - Coordinate analyst, dev, architect agents

4. **CIS technique integration**
   - Load techniques from DB (seeded from CSVs)
   - Dynamic facilitation prompt rendering
   - Elicitation loop implementation

### Moonshots

_Ambitious, transformative concepts_

1. **Module builder UI**
   - Users create custom workflows via web interface
   - Visual workflow designer
   - Technique library management
   - Extension marketplace

2. **Collaborative workflow execution**
   - Multiple users on same project
   - Real-time artifact collaboration
   - Workflow handoffs between team members

3. **AI-powered workflow optimization**
   - Analyze project patterns
   - Suggest workflow customizations
   - Auto-generate stories from minimal input

### Insights and Learnings

_Key realizations from the session_

1. **Chiron is fundamentally different from Linear/Jira**
   - Not just PM + AI features
   - PM interface powered by workflow engine
   - Workflows generate the work (stories, docs), not users

2. **The architecture is already extensible**
   - Modules = data in DB, not hard-coded features
   - Engine executes any workflow generically
   - No UI needed for extensibility (data-driven)

3. **UI value is in interaction patterns**
   - CLI → Web transformation is the innovation
   - Q&A dialogs vs terminal prompts
   - Real-time artifact updates vs file saves
   - Visual workflow progress vs text status

4. **Implementation will teach more than planning**
   - Need to build first workflow to understand edge cases
   - Abstractions will emerge during coding
   - Over-planning risks wrong assumptions

## Action Planning

### Top 3 Priority Ideas

#### #1 Priority: Build Workflow Engine Core

**Rationale:**
Foundation for everything else. Without the engine, nothing works. This validates the entire architecture before committing to more features.

**Next Steps:**

1. Design WorkflowState TypeScript type/class with all fields from BMAD agent's spec
2. Implement variable resolver with 4-level precedence (user_responses → variables → system_variables → inherited_vars)
3. Build step processor that parses instructions and executes tags sequentially
4. Create tag handler functions (handleAction, handleAsk, handleInvokeWorkflow, handleTemplateOutput)
5. Write tests for execution loop with mock workflow data

**Resources Needed:**

- BMAD agent's execution pseudocode (already captured)
- TypeScript/Node.js environment
- Test framework (Vitest recommended)

**Timeline:** 1-2 weeks

---

#### #2 Priority: Seed BMM Module

**Rationale:**
First complete module proves the architecture works end-to-end. BMM is the core orchestrator for Chiron, so it must work first before adding CIS or custom workflows.

**Next Steps:**

1. Design database schema using Drizzle ORM (workflows, agents, techniques, patterns, projects, workflow_status, stories, epics)
2. Write seed scripts to parse BMAD CSV files (workflow-manifest.csv, agent-manifest.csv, brain-methods.csv, pattern-categories.csv)
3. Insert BMM workflows, agents, and data into database
4. Implement workflow-init as first executable workflow
5. Test complete flow: create project → execute workflow-init → generate workflow status

**Resources Needed:**

- BMAD CSV files from /bmad/bmm/ and /bmad/\_cfg/
- PostgreSQL database
- Drizzle ORM
- CSV parsing library

**Timeline:** 1-2 weeks

---

#### #3 Priority: Build Interactive Q&A UX

**Rationale:**
This is Chiron's core differentiator over BMAD CLI. The interactive Q&A pattern transforms workflow execution from terminal-based to collaborative and visual. This is the "added value" that makes Chiron worth building.

**Next Steps:**

1. Design QuestionDialog component with Answer/Refine/Skip actions
2. Build InteractiveList component that renders questions with contextual actions
3. Implement ArtifactPreview component with real-time markdown rendering
4. Connect components to WorkflowEngine state (user_responses, current_content)
5. Test with brainstorming workflow (technique selection + facilitation prompts)

**Resources Needed:**

- React + TypeScript
- Radix UI or shadcn/ui for dialogs
- Markdown renderer (react-markdown)
- State management (Zustand or React Context)

**Timeline:** 1 week

---

## Reflection and Follow-up

### What Worked Well

- **First Principles Thinking delivered clarity** - Breaking down to fundamentals (3-file minimum, variable precedence, execution loop) gave solid understanding
- **Asking BMAD agent for implementation details was crucial** - Getting actual pseudocode and state object specs removed ambiguity
- **User's instinct to implement rather than over-plan** - Recognized that building first workflow will teach more than additional brainstorming

### Areas for Further Exploration

- **UX pattern variations** - Conversational vs form-based Q&A, inline vs dialog-based refinement, graph vs timeline workflow visualization
- **Agent orchestration architecture** - How ax, ai-sdk, and xstate integrate, agent communication patterns, context sharing between agents
- **Workflow visualization design** - react-flow implementation details, interactive node actions, progress indicators

### Recommended Follow-up Techniques

When ready for next brainstorming session:

1. **What If Scenarios** - Explore UX pattern variations once core Q&A is implemented
2. **Morphological Analysis** - Systematically evaluate architecture component combinations (state management: xstate vs Zustand, agents: ax vs LangChain, etc.)
3. **SCAMPER Method** - Optimize existing workflow engine design based on implementation learnings

### Questions That Emerged

1. How should workflow instructions be stored in DB? (As text to parse at runtime? Pre-parsed as JSON? Hybrid?)
2. What's the right abstraction for tag handlers? (Class-based? Function registry? Strategy pattern?)
3. How do we handle long-running workflows? (Save state to DB? Resume capability? Timeouts?)
4. How does the elicitation loop map to interactive UI? (Nested dialog? Sidebar? Inline suggestions?)
5. What's the data model for artifacts with versions? (Separate versions table? JSONB history? Git-like diffs?)

### Next Session Planning

**Suggested Topics:**

- After implementing workflow engine core: Brainstorm error handling and recovery strategies
- After building first Q&A UI: Explore artifact refinement UX variations
- Before implementing agents: Brainstorm agent orchestration patterns and communication

**Recommended Timeframe:**

- Week 3-4 of implementation (after core engine + BMM seeding complete)
- Or when hitting specific architecture decision points

**Preparation Needed:**

- Have working workflow-init execution
- Screenshots of first Q&A UI implementation
- List of questions/blockers encountered during implementation

---

_Session facilitated using the BMAD CIS brainstorming framework_
