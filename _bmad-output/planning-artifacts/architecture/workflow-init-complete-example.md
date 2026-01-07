# workflow-init: Complete Implementation Example (Greenfield Only)

**Date:** 2025-11-05
**Status:** Detailed Implementation Guide - Greenfield Projects
**Context:** Full workflow-init mapping from database seed to UI execution (brownfield support deferred)

---

## Overview

This document shows the **complete workflow-init implementation** for **greenfield (new) projects only**:
1. Database seed data (what gets inserted)
2. UI execution flow (what user sees)
3. Example responses at each step
4. Variable flow and state management

**Note:** Brownfield (existing codebase) support will be added later once we validate the greenfield flow.

---

## Part 1: Database Seed Data

### 1.1 Workflow Record

```typescript
// INSERT into workflows table
{
  id: "550e8400-e29b-41d4-a716-446655440000", // UUID
  name: "workflow-init",
  displayName: "Project Initialization",
  description: "Interactive workflow to initialize a new Chiron project and select appropriate workflow path",
  module: "bmm",
  agentId: "analyst-agent-uuid",  // References Analyst agent
  
  isProjectInitializer: true,  // 🎯 Special flag
  isStandalone: true,
  requiresProjectContext: false,
  
  outputArtifactType: null,  // Doesn't create artifact
  outputTemplateId: null,
  
  createdAt: "2025-11-05T00:00:00Z",
  updatedAt: "2025-11-05T00:00:00Z"
}
```

---

### 1.2 Workflow Steps (4 steps total)

#### Step 1: Display Welcome Message

```typescript
// INSERT into workflow_steps
{
  id: "step-1-uuid",
  workflowId: "550e8400-e29b-41d4-a716-446655440000",
  stepNumber: 1,
  goal: "Welcome user and explain workflow-init purpose",
  stepType: "display-output",
  
  config: {
    type: "display-output",
    content: `# Welcome to Chiron! 🚀

I'm here to help you initialize your new project. I'll ask you a few questions to understand your project and recommend the best workflow path.

This will take about 2-3 minutes. Let's get started!`
  },
  
  nextStepNumber: 2,
  createdAt: "2025-11-05T00:00:00Z"
}
```

---

#### Step 2: Gather Project Information (QuestionSetStep)

```typescript
// INSERT into workflow_steps
{
  id: "step-2-uuid",
  workflowId: "550e8400-e29b-41d4-a716-446655440000",
  stepNumber: 2,
  goal: "Gather all project information through interactive questions",
  stepType: "question-set",
  
  config: {
    type: "question-set",
    mode: "sequential",
    
    questions: [
      // Question 2.1: Project Name
      {
        id: "q1_project_name",
        text: "What's your project called?",
        interactionMode: "simple-input",
        responseType: "string",
        placeholder: "my-awesome-project",
        validation: {
          required: true,
          minLength: 3,
          maxLength: 50,
          pattern: "^[a-z0-9-]+$",
          errorMessage: "Use lowercase letters, numbers, and hyphens only"
        }
      },
      
      // Question 2.2: Project Path
      {
        id: "q2_project_path",
        text: "Where should I create this project?",
        interactionMode: "simple-input",
        responseType: "string",
        placeholder: "/Users/fahad/projects/my-project",
        validation: {
          required: true,
          pattern: "^/.*",
          errorMessage: "Please provide an absolute path"
        },
        hint: "This will be your project's root directory"
      },
      
      // Question 2.3: Project Description (with clarification dialog)
      {
        id: "q3_user_description",
        text: "Tell me about what you're building. What's the goal?",
        interactionMode: "clarification-dialog",
        dialogConfig: {
          agentPrompt: `Help the user articulate their project vision clearly.

You can:
- Ask clarifying questions about the product
- Help them think through their goals
- Understand the scope and complexity
- Identify key features

Your goal: Get a clear description that will help classify project complexity.

When you have enough information, summarize their project in 2-3 sentences.`,
          tools: ["ask_user"],
          allowMultiTurn: true,
          extractAnswer: "summary",  // Extract final summary
          minCharacters: 20
        }
      },
      
      // Question 2.4: Complexity Analysis (LLM Classification Dialog)
      {
        id: "q4_complexity",
        text: "Let me analyze your project complexity",
        interactionMode: "clarification-dialog",
        dialogConfig: {
          agentPrompt: `Classify the project complexity based on the user's description.

Context available:
- Project description: {{q3_user_description}}

Analyze for these signals:

**Quick Flow (simple):**
- Keywords: "fix", "bug", "add button", "small feature", "quick change"
- Scope: Single feature, clear boundaries
- Story count: 1-10 stories
- Complexity: Low technical complexity

**Method (moderate):**
- Keywords: "dashboard", "admin panel", "user management", "multiple features"
- Scope: Product with several integrated features
- Story count: 10-50 stories
- Complexity: Moderate, needs planning and architecture

**Enterprise (complex):**
- Keywords: "multi-tenant", "compliance", "enterprise", "scale", "security audit"
- Scope: Large system with multiple subsystems
- Story count: 50+ stories
- Complexity: High, needs security/devops/test planning

You can ask clarifying questions to understand:
- How many features/modules?
- Expected user scale?
- Security/compliance requirements?
- Integration complexity?

When confident, classify into ONE of: quick-flow, method, enterprise`,
          tools: ["ask_user"],
          allowMultiTurn: true,
          extractAnswer: "structured",
          extractSchema: {
            classification: "quick-flow | method | enterprise",
            reasoning: "string"
          }
        }
      },
      
      // Question 2.5: Workflow Path Selection (Dynamic Choices)
      {
        id: "q5_path_selection",
        text: "Select your workflow path",
        interactionMode: "simple-input",
        responseType: "choice",
        
        // Dynamic choices loaded from database
        choicesSource: {
          type: "database-query",
          table: "workflow_paths",
          filter: {
            "tags->>'fieldType'": "greenfield"  // Only greenfield paths
          },
          orderBy: "sequence_order",
          displayTemplate: `
### {{displayName}} {{#if recommended}}⭐ RECOMMENDED{{/if}}

**Time:** {{estimatedTime}}
**Agent Support:** {{agentSupport}}

{{educationText}}
          `
        },
        
        // Highlight recommendation
        highlightIf: {
          field: "tags.track",
          matches: "{{q4_complexity.classification}}"
        }
      }
    ],
    
    // Map question IDs to workflow variables
    outputVariables: {
      "q1_project_name": "project_name",
      "q2_project_path": "project_path",
      "q3_user_description": "user_description",
      "q4_complexity": "recommended_track",
      "q5_path_selection": "selected_workflow_path_id"
    }
  },
  
  nextStepNumber: 3,
  createdAt: "2025-11-05T00:00:00Z"
}
```

---

#### Step 3: Create Project Record

```typescript
// INSERT into workflow_steps
{
  id: "step-3-uuid",
  workflowId: "550e8400-e29b-41d4-a716-446655440000",
  stepNumber: 3,
  goal: "Create project in database with selected workflow path",
  stepType: "execute-action",
  
  config: {
    type: "execute-action",
    action: {
      type: "database",
      operation: "insert",
      table: "projects",
      values: {
        name: "{{project_name}}",
        path: "{{project_path}}",
        workflowPathId: "{{selected_workflow_path_id}}",
        initializedByExecutionId: "{{execution_id}}"
      },
      output: "project_id"
    }
  },
  
  nextStepNumber: 4,
  createdAt: "2025-11-05T00:00:00Z"
}
```

---

#### Step 4: Display Success & Next Steps

```typescript
// INSERT into workflow_steps
{
  id: "step-4-uuid",
  workflowId: "550e8400-e29b-41d4-a716-446655440000",
  stepNumber: 4,
  goal: "Show success message and guide user to next workflow",
  stepType: "display-output",
  
  config: {
    type: "display-output",
    content: `# ✅ Project Initialized Successfully!

**Project:** {{project_name}}
**Location:** {{project_path}}
**Workflow Path:** {{selected_workflow_path.displayName}}

---

## Next Steps

{{#if (eq recommended_track "quick-flow")}}
You'll create a **Tech Spec** to plan your implementation.

**Estimated Time:** 30 minutes - 1 hour

Click "Create Tech Spec" in your dashboard.

{{else if (eq recommended_track "method")}}
You can optionally create a **Product Brief** for strategic planning, then move to **PRD** creation.

**Estimated Time:** 1-3 days of planning

Recommended order:
1. Product Brief (optional) - 1-2 hours
2. PRD - 2-4 hours
3. UX Design (if UI components) - 2-3 hours
4. Architecture - 2-4 hours

Click "Start Planning" in your dashboard.

{{else if (eq recommended_track "enterprise")}}
You'll go through comprehensive planning:

1. Product Brief - 2-3 hours
2. PRD - 4-6 hours
3. UX Design - 3-4 hours
4. Architecture - 4-6 hours
5. Security Architecture - 2-3 hours
6. DevOps Strategy - 2-3 hours
7. Test Strategy - 2-3 hours

**Estimated Time:** 3-7 days of comprehensive planning

Click "Start Enterprise Planning" in your dashboard.

{{/if}}

---

Your project is ready! Head to the **dashboard** to begin. 🚀
    `
  },
  
  nextStepNumber: null,  // End of workflow
  createdAt: "2025-11-05T00:00:00Z"
}
```

---

## Part 2: UI Execution Flow with Examples

### 2.1 Step 1: Welcome Message

**What User Sees:**

```
┌─────────────────────────────────────────┐
│ ASSISTANT                               │
├─────────────────────────────────────────┤
│                                         │
│ # Welcome to Chiron! 🚀                 │
│                                         │
│ I'm here to help you initialize your   │
│ new project. I'll ask you a few        │
│ questions to understand your project   │
│ and recommend the best workflow path.  │
│                                         │
│ This will take about 2-3 minutes.      │
│ Let's get started!                     │
│                                         │
└─────────────────────────────────────────┘

[Continue →]
```

**User Action:** Clicks "Continue"

**Workflow State After Step 1:**
```json
{
  "currentStep": 1,
  "completed": true,
  "variables": {}
}
```

---

### 2.2 Step 2: Question Set (All Questions Shown)

**Left Panel - Question List:**

```
┌─────────────────────────────────────────┐
│ PROJECT INITIALIZATION                  │
├─────────────────────────────────────────┤
│                                         │
│ ○ What's your project called?          │
│                                         │
│ ○ Where should I create this project?  │
│                                         │
│ ○ Tell me about what you're building   │
│                                         │
│ ○ Let me analyze your project          │
│   complexity                            │
│                                         │
│ ○ Select your workflow path            │
│                                         │
│                                         │
│ [0/5 questions answered]                │
└─────────────────────────────────────────┘
```

---

### 2.2.1 Question 1: Project Name (Simple Input)

**UI:**

```
┌─────────────────────────────────────────┐
│ ✓ What's your project called?          │  <- Highlighted/Active
│                                         │
│ ○ Where should I create this project?  │
│                                         │
│ ○ Tell me about what you're building   │
│ ...                                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ QUESTION                                │
├─────────────────────────────────────────┤
│                                         │
│ What's your project called?            │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ task-manager                        │ │ <- User types
│ └─────────────────────────────────────┘ │
│                                         │
│ Use lowercase letters, numbers, and    │
│ hyphens only                           │
│                                         │
│            [Answer →]                   │
└─────────────────────────────────────────┘
```

**User Input:** `task-manager`

**Validation:** ✅ Passes (matches pattern `^[a-z0-9-]+$`)

**Variable Set:** `project_name = "task-manager"`

**UI Updates:**
```
┌─────────────────────────────────────────┐
│ ✓ What's your project called?          │  <- Checkmark
│   task-manager                          │  <- Shows answer
│                                         │
│ ○ Where should I create this project?  │  <- Now active
│ ...                                     │
│                                         │
│ [1/5 questions answered]                │
└─────────────────────────────────────────┘
```

---

### 2.2.2 Question 2: Project Path (Simple Input)

**UI:**

```
┌─────────────────────────────────────────┐
│ QUESTION                                │
├─────────────────────────────────────────┤
│                                         │
│ Where should I create this project?    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ /Users/fahad/projects/task-manager  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 💡 This will be your project's root    │
│    directory                            │
│                                         │
│            [Answer →]                   │
└─────────────────────────────────────────┘
```

**User Input:** `/Users/fahad/projects/task-manager`

**Variable Set:** `project_path = "/Users/fahad/projects/task-manager"`

---

### 2.2.3 Question 3: Project Description (Clarification Dialog)

**Initial UI (Question Active):**

```
┌─────────────────────────────────────────┐
│ ✓ What's your project called?          │
│   task-manager                          │
│                                         │
│ ✓ Where should I create this project?  │
│   /Users/fahad/projects/task-manager   │
│                                         │
│ ○ Tell me about what you're building   │  <- Active, shows dialog button
│   [Clarify with Agent →]                │
│ ...                                     │
└─────────────────────────────────────────┘
```

**User clicks "Clarify with Agent" → Dialog Opens:**

```
┌───────────────────────────────────────────────────────────┐
│ CLARIFY QUESTION                                      [X] │
├───────────────────────────────────────────────────────────┤
│ Tell me about what you're building. What's the goal?     │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ ASSISTANT                                         │   │
│ │                                                   │   │
│ │ I'd love to help you articulate your project!   │   │
│ │                                                   │   │
│ │ Let's start with the basics:                     │   │
│ │ - What problem are you trying to solve?         │   │
│ │ - Who will use this product?                    │   │
│ │ - What are the main features you envision?      │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Type your response...                             │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│                         [Close]  [Apply Answer]          │
└───────────────────────────────────────────────────────────┘
```

**User Types:**

```
┌───────────────────────────────────────────────────────────┐
│ CLARIFY QUESTION                                      [X] │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ ASSISTANT                                         │   │
│ │ I'd love to help you articulate your project!   │   │
│ │ ...                                              │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ USER                                              │   │
│ │                                                   │   │
│ │ I want to build a task management app for       │   │
│ │ small teams. It needs a kanban board, task      │   │
│ │ assignment, and basic analytics.                │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ ASSISTANT                                         │   │
│ │                                                   │   │
│ │ Great! A few follow-up questions:               │   │
│ │                                                   │   │
│ │ 1. How many team members typically? (scale)     │   │
│ │ 2. Do you need real-time collaboration?        │   │
│ │ 3. Any integrations? (Slack, email, etc.)      │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Type your response...                             │   │
│ └───────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

**User Continues Conversation:**

```
USER:
5-10 team members. Real-time would be nice but not critical.
No integrations needed for MVP.

ASSISTANT:
Perfect! Let me summarize what I understand:

**Project:** Task Management App for Small Teams
**Target Users:** Teams of 5-10 members
**Core Features:**
- Kanban board for task visualization
- Task assignment and tracking
- Basic analytics dashboard
- Real-time updates (nice-to-have)

**Scope:** MVP without integrations

Does this accurately capture your vision?
```

**User Clicks "Apply Answer"**

**Dialog Extracts Summary:**
```json
{
  "summary": "Task management app for small teams (5-10 members) with kanban board, task assignment, basic analytics, and optional real-time collaboration. MVP scope without integrations.",
  "key_features": ["kanban", "task-assignment", "analytics"],
  "complexity_signals": ["dashboard", "real-time", "analytics"]
}
```

**Variable Set:** `user_description = "Task management app for small teams..."`

**Dialog Closes, UI Updates:**

```
┌─────────────────────────────────────────┐
│ ✓ Tell me about what you're building   │
│   Task management app for small teams  │
│   (5-10 members) with kanban board...  │
│                                         │
│ ○ Let me analyze your project          │  <- Next question active
│   complexity                            │
│ ...                                     │
│                                         │
│ [3/5 questions answered]                │
└─────────────────────────────────────────┘
```

---

### 2.2.4 Question 4: Complexity Classification (LLM Dialog)

**User Clicks "Clarify" to Open Dialog:**

```
┌───────────────────────────────────────────────────────────┐
│ ANALYZE COMPLEXITY                                    [X] │
├───────────────────────────────────────────────────────────┤
│ Let me analyze your project complexity                   │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ ASSISTANT                                         │   │
│ │                                                   │   │
│ │ I'm analyzing your project to recommend the      │   │
│ │ best workflow path.                              │   │
│ │                                                   │   │
│ │ Based on your description:                       │   │
│ │ "Task management app with kanban, analytics,    │   │
│ │ and real-time features"                         │   │
│ │                                                   │   │
│ │ I'm thinking this is **moderate complexity**    │   │
│ │ because:                                         │   │
│ │ - Multiple integrated features (kanban +        │   │
│ │   analytics + real-time)                        │   │
│ │ - Needs thoughtful data modeling               │   │
│ │ - Real-time adds architectural complexity      │   │
│ │                                                   │   │
│ │ A few questions to confirm:                     │   │
│ │ 1. Do you need user authentication/roles?       │   │
│ │ 2. Any complex business logic for task         │   │
│ │    workflows?                                   │   │
│ │ 3. Expected scale? (hundreds/thousands/        │   │
│ │    millions of tasks)                          │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Type your response...                             │   │
│ └───────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

**User Responds:**

```
USER:
Yes to authentication and roles (admin, member).
Task workflows are simple - just status transitions.
Scale: thousands of tasks max.
```

**Agent Classifies:**

```
┌───────────────────────────────────────────────────────────┐
│ ASSISTANT                                                 │
│                                                           │
│ Perfect! Based on our discussion:                        │
│                                                           │
│ **Recommended Track: BMad Method** ✅                     │
│                                                           │
│ **Reasoning:**                                           │
│ - Multiple features requiring integration (kanban,       │
│   analytics, auth, real-time)                           │
│ - Moderate scale (thousands of tasks)                   │
│ - Needs thoughtful architecture for real-time and       │
│   data modeling                                         │
│ - Not enterprise-level (no compliance, multi-tenancy)   │
│                                                           │
│ This means you'll create:                               │
│ - Product Requirements Document (PRD)                   │
│ - UX Design (for kanban interface)                     │
│ - System Architecture                                   │
│                                                           │
│ Estimated planning time: 1-3 days                       │
│ AI agents will get complete context for exceptional     │
│ code generation.                                        │
│                                                           │
│                         [Close]  [Apply Classification] │
└───────────────────────────────────────────────────────────┘
```

**User Clicks "Apply Classification"**

**Variable Set:**
```json
{
  "recommended_track": "method",
  "reasoning": "Multiple features requiring integration..."
}
```

**UI Updates:**

```
┌─────────────────────────────────────────┐
│ ✓ Let me analyze your project          │
│   complexity                            │
│   BMad Method (Moderate Complexity)    │
│                                         │
│ ○ Select your workflow path            │  <- Next/Final question
│                                         │
│ [4/5 questions answered]                │
└─────────────────────────────────────────┘
```

---

### 2.2.5 Question 5: Workflow Path Selection (Dynamic Cards)

**Workflow Engine Queries Database:**

```sql
SELECT * FROM workflow_paths
WHERE tags->>'fieldType' = 'greenfield'
ORDER BY sequence_order;
```

**Returns 3 paths:**
```json
[
  {
    "id": "quick-flow-greenfield-uuid",
    "name": "quick-flow-greenfield",
    "displayName": "Quick Flow (Greenfield)",
    "tags": { "track": "quick-flow", "fieldType": "greenfield" },
    "estimatedTime": "Hours to 1 day",
    "agentSupport": "Basic - minimal context",
    "educationText": "Tech-spec focused planning. Best for simple features with clear scope..."
  },
  {
    "id": "method-greenfield-uuid",
    "name": "method-greenfield",
    "displayName": "BMad Method (Greenfield)",
    "tags": { "track": "method", "fieldType": "greenfield" },
    "estimatedTime": "1-3 days",
    "agentSupport": "Exceptional - complete context",
    "educationText": "PRD + UX + Architecture. Best for products, platforms, complex features..."
  },
  {
    "id": "enterprise-greenfield-uuid",
    "name": "enterprise-greenfield",
    "displayName": "Enterprise Method (Greenfield)",
    "tags": { "track": "enterprise", "fieldType": "greenfield" },
    "estimatedTime": "3-7 days",
    "agentSupport": "Elite - comprehensive planning",
    "educationText": "Extended planning with security, devops, test strategy..."
  }
]
```

**UI Renders Cards:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ SELECT YOUR WORKFLOW PATH                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌────────────────────┐  ┌────────────────────┐  ┌────────────────┐ │
│ │ Quick Flow         │  │ BMad Method ⭐     │  │ Enterprise     │ │
│ │ (Greenfield)       │  │ (Greenfield)       │  │ Method         │ │
│ ├────────────────────┤  ├────────────────────┤  ├────────────────┤ │
│ │                    │  │                    │  │                │ │
│ │ Time:              │  │ Time:              │  │ Time:          │ │
│ │ Hours to 1 day     │  │ 1-3 days           │  │ 3-7 days       │ │
│ │                    │  │                    │  │                │ │
│ │ Agent Support:     │  │ Agent Support:     │  │ Agent Support: │ │
│ │ Basic - minimal    │  │ Exceptional -      │  │ Elite -        │ │
│ │ context            │  │ complete context   │  │ comprehensive  │ │
│ │                    │  │                    │  │                │ │
│ │ Tech-spec focused  │  │ PRD + UX +         │  │ Extended       │ │
│ │ planning. Best for │  │ Architecture. Best │  │ planning with  │ │
│ │ simple features    │  │ for products,      │  │ security,      │ │
│ │ with clear scope.  │  │ platforms, complex │  │ devops, test   │ │
│ │                    │  │ features.          │  │ strategy.      │ │
│ │                    │  │                    │  │                │ │
│ │ [Select]           │  │ [Select] ✓         │  │ [Select]       │ │
│ └────────────────────┘  └────────────────────┘  └────────────────┘ │
│                                                                     │
│ ⭐ = Recommended based on your project complexity                  │
└─────────────────────────────────────────────────────────────────────┘
```

**User Clicks "Select" on BMad Method Card**

**Variable Set:** `selected_workflow_path_id = "method-greenfield-uuid"`

**UI Updates:**

```
┌─────────────────────────────────────────┐
│ ✓ Select your workflow path            │
│   BMad Method (Greenfield)             │
│                                         │
│ [5/5 questions answered] ✅            │
│                                         │
│ [Create Project →]                      │
└─────────────────────────────────────────┘
```

---

### 2.3 Step 3: Create Project (Execute Action)

**Workflow Engine Executes:**

```typescript
// Background action
const result = await db.insert(projects).values({
  name: "task-manager",
  path: "/Users/fahad/projects/task-manager",
  workflowPathId: "method-greenfield-uuid",
  initializedByExecutionId: "current-execution-uuid"
}).returning();

// Variable set
project_id = result.id; // "new-project-uuid"
```

**User Sees Loading State:**

```
┌─────────────────────────────────────────┐
│ Creating your project...                │
│                                         │
│ ⏳ Setting up database records          │
│ ⏳ Configuring workflow path            │
│                                         │
└─────────────────────────────────────────┘
```

---

### 2.4 Step 4: Success Message

**UI Displays:**

```
┌──────────────────────────────────────────────────────────┐
│ ASSISTANT                                                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ # ✅ Project Initialized Successfully!                  │
│                                                          │
│ **Project:** task-manager                               │
│ **Location:** /Users/fahad/projects/task-manager        │
│ **Workflow Path:** BMad Method (Greenfield)             │
│                                                          │
│ ---                                                      │
│                                                          │
│ ## Next Steps                                           │
│                                                          │
│ You can optionally create a **Product Brief** for      │
│ strategic planning, then move to **PRD** creation.      │
│                                                          │
│ **Estimated Time:** 1-3 days of planning                │
│                                                          │
│ Recommended order:                                      │
│ 1. Product Brief (optional) - 1-2 hours                 │
│ 2. PRD - 2-4 hours                                      │
│ 3. UX Design (if UI components) - 2-3 hours             │
│ 4. Architecture - 2-4 hours                             │
│                                                          │
│ Click "Start Planning" in your dashboard.               │
│                                                          │
│ ---                                                      │
│                                                          │
│ Your project is ready! Head to the **dashboard** to    │
│ begin. 🚀                                                │
│                                                          │
└──────────────────────────────────────────────────────────┘

[Go to Dashboard →]
```

---

## Part 3: Complete Variable Flow

### 3.1 Variable State After Each Step

**After Step 1 (Welcome):**
```json
{
  "execution_id": "exec-123",
  "current_step": 1,
  "variables": {}
}
```

**After Step 2, Q1 (Project Name):**
```json
{
  "current_step": 2,
  "current_question": "q1_project_name",
  "variables": {
    "project_name": "task-manager"
  }
}
```

**After Step 2, Q2 (Project Path):**
```json
{
  "current_step": 2,
  "current_question": "q2_project_path",
  "variables": {
    "project_name": "task-manager",
    "project_path": "/Users/fahad/projects/task-manager"
  }
}
```

**After Step 2, Q3 (Description):**
```json
{
  "current_step": 2,
  "current_question": "q3_user_description",
  "variables": {
    "project_name": "task-manager",
    "project_path": "/Users/fahad/projects/task-manager",
    "user_description": "Task management app for small teams (5-10 members) with kanban board, task assignment, basic analytics, and optional real-time collaboration. MVP scope without integrations."
  }
}
```

**After Step 2, Q4 (Complexity):**
```json
{
  "current_step": 2,
  "current_question": "q4_complexity",
  "variables": {
    "project_name": "task-manager",
    "project_path": "/Users/fahad/projects/task-manager",
    "user_description": "...",
    "recommended_track": "method",
    "complexity_reasoning": "Multiple features requiring integration..."
  }
}
```

**After Step 2, Q5 (Path Selection):**
```json
{
  "current_step": 2,
  "current_question": "q5_path_selection",
  "variables": {
    "project_name": "task-manager",
    "project_path": "/Users/fahad/projects/task-manager",
    "user_description": "...",
    "recommended_track": "method",
    "available_paths": [
      { "id": "quick-flow-greenfield-uuid", "name": "...", ... },
      { "id": "method-greenfield-uuid", "name": "...", ... },
      { "id": "enterprise-greenfield-uuid", "name": "...", ... }
    ],
    "selected_workflow_path_id": "method-greenfield-uuid"
  }
}
```

**After Step 3 (Create Project):**
```json
{
  "current_step": 3,
  "variables": {
    "project_name": "task-manager",
    "project_path": "/Users/fahad/projects/task-manager",
    "user_description": "...",
    "recommended_track": "method",
    "selected_workflow_path_id": "method-greenfield-uuid",
    "project_id": "new-project-uuid-789"
  }
}
```

**After Step 4 (Success Message):**
```json
{
  "current_step": 4,
  "completed": true,
  "variables": {
    "project_name": "task-manager",
    "project_id": "new-project-uuid-789",
    "selected_workflow_path_id": "method-greenfield-uuid"
  }
}
```

---

## Part 4: Database State After Completion

### 4.1 Projects Table

```sql
SELECT * FROM projects WHERE id = 'new-project-uuid-789';
```

```
id                  | new-project-uuid-789
name                | task-manager
path                | /Users/fahad/projects/task-manager
workflow_path_id    | method-greenfield-uuid
initialized_by      | exec-123
created_at          | 2025-11-05 10:30:00
updated_at          | 2025-11-05 10:30:00
```

### 4.2 Workflow Executions Table

```sql
SELECT * FROM workflow_executions WHERE id = 'exec-123';
```

```
id                  | exec-123
workflow_id         | 550e8400-e29b-41d4-a716-446655440000
status              | completed
current_step        | 4
variables           | { "project_name": "task-manager", ... }
started_at          | 2025-11-05 10:25:00
completed_at        | 2025-11-05 10:30:00
```

---

## Part 5: What's Missing for Brownfield Support

When we add brownfield (existing codebase) support later, we'll need:

### 5.1 Additional Question in QuestionSetStep

```typescript
{
  id: "q2b_codebase_check",
  text: "Do you have existing code at this location?",
  interactionMode: "auto-detect",
  autoAction: {
    type: "scan-codebase",
    path: "{{q2_project_path}}",
    checks: ["has_git", "has_source", "has_package_json"],
    outputVariable: "codebase_scan"
  },
  followUpIf: {
    condition: "codebase_scan.has_source == true",
    question: {
      id: "q2c_brownfield_confirm",
      text: "I found existing code. Are you adding to this codebase?",
      interactionMode: "simple-input",
      responseType: "choice",
      choices: [
        { value: "brownfield", label: "Yes, adding to existing code" },
        { value: "greenfield", label: "No, starting fresh" }
      ]
    }
  }
}
```

### 5.2 Additional Workflow Paths

Need to seed brownfield paths:
- `quick-flow-brownfield`
- `method-brownfield`
- `enterprise-brownfield`

### 5.3 Conditional Path Query

```typescript
choicesSource: {
  type: "database-query",
  table: "workflow_paths",
  filter: {
    "tags->>'fieldType'": "{{detected_field_type}}"  // Now dynamic!
  }
}
```

### 5.4 Additional Success Message Content

```typescript
{{#if (eq detected_field_type "brownfield")}}
## Important First Step: Document Your Codebase

Since you have existing code, run the **document-project** workflow first.
This analyzes your codebase and creates documentation that AI agents can use.

**Estimated Time:** 10-20 minutes

Click "Start document-project" in your dashboard.
{{/if}}
```

---

## Summary

This simplified greenfield-only version:

1. ✅ **5 Questions Total** (down from 6)
   - Project name
   - Project path
   - Project description (with dialog)
   - Complexity analysis (with dialog)
   - Workflow path selection (cards)

2. ✅ **Only Greenfield Paths** shown
   - Quick Flow (Greenfield)
   - BMad Method (Greenfield)
   - Enterprise Method (Greenfield)

3. ✅ **No Codebase Scanning** 
   - Assumes fresh project
   - No brownfield detection logic

4. ✅ **Simpler Success Message**
   - No brownfield-specific instructions
   - Focus on planning workflows only

---

**When ready to add brownfield:**
- Add codebase detection question (auto-detect)
- Add field_type confirmation question
- Seed brownfield workflow paths
- Update path query to be dynamic
- Add document-project instructions to success message

---

_Greenfield-Only Version Created: 2025-11-05_
