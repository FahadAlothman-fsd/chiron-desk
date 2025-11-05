# Chiron Seed Data Examples - Phase 1 Workflows

**Date:** 2025-11-05
**Status:** Ready for implementation
**Context:** Complete seed data for brainstorm-project and research workflows

---

## Seeding Order

**IMPORTANT:** Seed in this exact order due to foreign key dependencies:

1. Agents (no dependencies)
2. Workflow Paths (no dependencies)
3. Workflows (depends on agents)
4. Workflow Steps (depends on workflows)
5. Workflow Step Branches (depends on workflow steps)
6. Workflow Step Actions (depends on workflow steps)
7. Workflow Path Workflows (depends on paths and workflows)

---

## 1. Seed Agents

```typescript
import { db } from "./db";
import { agents } from "./schema";

export async function seedAgents() {
  const analystAgent = await db.insert(agents).values({
    id: "agent-analyst-uuid", // Use consistent UUID
    name: "analyst",
    displayName: "Business Analyst",
    description: "Strategic Business Analyst + Requirements Expert",
    role: "Strategic Business Analyst + Requirements Expert",
    llmProvider: "anthropic",
    llmModel: "claude-sonnet-4-20250514",
    llmTemperature: "0.7",
    tools: [],
    mcpServers: [],
    color: "#3B82F6",
    avatar: "📊",
    active: true
  }).returning();

  console.log("✅ Seeded analyst agent");
  return { analystAgent: analystAgent[0] };
}
```

---

## 2. Seed Workflow Paths

```typescript
import { db } from "./db";
import { workflowPaths } from "./schema";

export async function seedWorkflowPaths() {
  const greenfield3 = await db.insert(workflowPaths).values({
    id: "path-greenfield-3-uuid",
    name: "greenfield-level-3",
    projectType: "software",
    projectLevel: "3",
    fieldType: "greenfield",
    description: "Complex system - subsystems, integrations, architectural decisions"
  }).returning();

  console.log("✅ Seeded greenfield-level-3 path");
  return { greenfield3: greenfield3[0] };
}
```

---

## 3. Seed Workflows

```typescript
import { db } from "./db";
import { workflows } from "./schema";

export async function seedWorkflows(analystAgentId: string) {
  // brainstorm-project workflow
  const brainstormWorkflow = await db.insert(workflows).values({
    id: "wf-brainstorm-project-uuid",
    name: "brainstorm-project",
    displayName: "Brainstorm Project",
    agentId: analystAgentId,
    pattern: "sequential-dependencies",
    outputArtifactType: "markdown",
    outputArtifactTemplateId: null
  }).returning();

  // research workflow
  const researchWorkflow = await db.insert(workflows).values({
    id: "wf-research-uuid",
    name: "research",
    displayName: "Research Workflow",
    agentId: analystAgentId,
    pattern: "structured-exploration",
    outputArtifactType: "markdown",
    outputArtifactTemplateId: null
  }).returning();

  console.log("✅ Seeded brainstorm-project workflow");
  console.log("✅ Seeded research workflow");

  return {
    brainstormWorkflow: brainstormWorkflow[0],
    researchWorkflow: researchWorkflow[0]
  };
}
```

---

## 4. Seed Workflow Steps - brainstorm-project

```typescript
import { db } from "./db";
import { workflowSteps } from "./schema";

export async function seedBrainstormProjectSteps(workflowId: string) {
  const steps = await db.insert(workflowSteps).values([
    // Step 1: Validate Workflow Readiness
    {
      id: "step-1-validate-uuid",
      workflowId: workflowId,
      stepNumber: 1,
      stepType: "invoke-workflow",
      stepId: "validate-readiness",
      title: "Validate Workflow Readiness",
      description: "Check project status and load configuration",
      config: {
        invokedWorkflowName: "workflow-status",
        inputParams: {
          mode: "data",
          data_request: "project_config"
        },
        outputMapping: {
          status_exists: "status_exists",
          project_id: "project_id",
          project_level: "project_level",
          active_path: "active_path"
        }
      },
      nextStepId: "step-2-check-status-uuid"
    },

    // Step 2: Check Status Exists
    {
      id: "step-2-check-status-uuid",
      workflowId: workflowId,
      stepNumber: 2,
      stepType: "check-condition",
      stepId: "check-status-exists",
      title: "Check if Progress Tracking Exists",
      description: "Determine if running in tracked or standalone mode",
      config: {
        conditionType: "boolean",
        evaluateVariable: "status_exists"
      },
      nextStepId: null // Routing via branches
    },

    // Step 3: Set Standalone Mode
    {
      id: "step-3-set-standalone-uuid",
      workflowId: workflowId,
      stepNumber: 3,
      stepType: "execute-action",
      stepId: "set-standalone-mode",
      title: "Enable Standalone Mode",
      description: "Set standalone_mode = true",
      config: {
        description: "Enable standalone mode for workflows without progress tracking"
      },
      nextStepId: "step-4-load-context-uuid"
    },

    // Step 4: Load Project Context (INLINE CONTEXT!)
    {
      id: "step-4-load-context-uuid",
      workflowId: workflowId,
      stepNumber: 4,
      stepType: "load-context",
      stepId: "load-project-context",
      title: "Load Project Brainstorming Context",
      description: "Load brainstorming guidance into workflow context",
      config: {
        contextSource: "inline",
        contextContent: `# Project Brainstorming Context

## Focus Areas for Project Ideation
- Product vision and strategic goals
- User problems and pain points that need solving
- Market opportunities and competitive gaps
- Technical feasibility and constraints
- Business model and revenue considerations

## Key Considerations for Software Projects
- Scalability and architecture decisions
- Technology stack and framework choices
- Development timeline and resource requirements
- Integration with existing systems
- Security and compliance needs

## Recommended Brainstorming Techniques
- **SCAMPER**: Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse
- **Mind Mapping**: Visual exploration of features and capabilities
- **User Journey Brainstorming**: Walk through user experiences and touchpoints
- **Competitive Gap Analysis**: Identify what competitors miss
- **"How Might We" Questions**: Reframe problems as opportunities
- **Crazy 8s**: Rapid ideation with time constraints
- **Brainwriting**: Silent idea generation before discussion

## Output Structure Guidance
Your brainstorming session should produce:
- **Key Insights**: Major discoveries about the problem space
- **Idea Categories**: Grouped by theme or user need
- **Prioritized Concepts**: Which ideas have most potential
- **Validation Needs**: What assumptions need testing
- **Next Steps**: Recommended actions coming out of session`,
        storeAs: "project_context"
      },
      nextStepId: "step-5-invoke-brainstorming-uuid"
    },

    // Step 5: Invoke Core Brainstorming
    {
      id: "step-5-invoke-brainstorming-uuid",
      workflowId: workflowId,
      stepNumber: 5,
      stepType: "invoke-workflow",
      stepId: "invoke-cis-brainstorming",
      title: "Execute CIS Brainstorming with Context",
      description: "Run interactive brainstorming session",
      config: {
        invokedWorkflowName: "cis-brainstorming",
        inputParams: {
          context: "{{project_context}}",
          project_name: "{{project_name}}"
        },
        outputMapping: {
          session_results: "brainstorming_results",
          output_file_path: "brainstorming_artifact_path",
          techniques_used: "brainstorming_techniques"
        }
      },
      nextStepId: "step-6-save-artifact-uuid"
    },

    // Step 6: Save Artifact to Database
    {
      id: "step-6-save-artifact-uuid",
      workflowId: workflowId,
      stepNumber: 6,
      stepType: "execute-action",
      stepId: "save-brainstorming-artifact",
      title: "Track Generated Artifact",
      description: "Save brainstorming artifact to project_artifacts table",
      config: {
        description: "Record brainstorming artifact in database for future reference"
      },
      nextStepId: "step-7-check-standalone-uuid"
    },

    // Step 7: Check Standalone Mode
    {
      id: "step-7-check-standalone-uuid",
      workflowId: workflowId,
      stepNumber: 7,
      stepType: "check-condition",
      stepId: "check-standalone-mode",
      title: "Check Progress Tracking Mode",
      description: "Determine completion message based on tracking mode",
      config: {
        conditionType: "boolean",
        evaluateVariable: "standalone_mode"
      },
      nextStepId: null // Routing via branches
    },

    // Step 8: Update Workflow Status
    {
      id: "step-8-update-status-uuid",
      workflowId: workflowId,
      stepNumber: 8,
      stepType: "invoke-workflow",
      stepId: "update-workflow-status",
      title: "Mark Workflow Complete",
      description: "Update project_state to mark brainstorm-project as complete",
      config: {
        invokedWorkflowName: "workflow-status",
        inputParams: {
          mode: "update",
          action: "complete_workflow",
          workflow_name: "brainstorm-project"
        },
        outputMapping: {
          success: "status_update_success",
          next_workflow: "next_workflow",
          next_agent: "next_agent"
        }
      },
      nextStepId: "step-9-display-tracked-uuid"
    },

    // Step 9a: Display Completion (Tracked Mode)
    {
      id: "step-9-display-tracked-uuid",
      workflowId: workflowId,
      stepNumber: 9,
      stepType: "display-output",
      stepId: "display-tracked-complete",
      title: "Show Completion with Next Steps",
      description: "Display success message with progress tracking info",
      config: {
        outputTemplate: `✅ **Brainstorming Session Complete!**

**Session Results:**
- Brainstorming results saved to: {{brainstorming_artifact_path}}
- Techniques used: {{brainstorming_techniques}}

**Status Updated:**
- Progress tracking updated
- brainstorm-project marked complete

**Next Steps:**
- **Next required:** {{next_workflow}} ({{next_agent}} agent)
- **Optional:** You can run other analysis workflows (research, product-brief) before proceeding

Check status anytime with: \`workflow-status\``,
        outputType: "success"
      },
      nextStepId: null // END
    },

    // Step 9b: Display Completion (Standalone Mode)
    {
      id: "step-9-display-standalone-uuid",
      workflowId: workflowId,
      stepNumber: 10,
      stepType: "display-output",
      stepId: "display-standalone-complete",
      title: "Show Standalone Completion",
      description: "Display success message for standalone mode",
      config: {
        outputTemplate: `✅ **Brainstorming Session Complete!**

**Session Results:**
- Brainstorming results saved to: {{brainstorming_artifact_path}}
- Techniques used: {{brainstorming_techniques}}

**Next Steps:**
Since no workflow is in progress:
- Refer to the BMM workflow guide if unsure what to do next
- Or run \`workflow-init\` to create a workflow path and get guided next steps`,
        outputType: "success"
      },
      nextStepId: null // END
    }
  ]).returning();

  console.log(`✅ Seeded ${steps.length} steps for brainstorm-project`);
  return steps;
}
```

---

## 5. Seed Workflow Step Branches - brainstorm-project

```typescript
import { db } from "./db";
import { workflowStepBranches } from "./schema";

export async function seedBrainstormProjectBranches() {
  const branches = await db.insert(workflowStepBranches).values([
    // Step 2: Check Status Exists (boolean)
    {
      stepId: "step-2-check-status-uuid",
      branchKey: "false",
      branchLabel: null,
      nextStepId: "step-3-set-standalone-uuid",
      displayOrder: null
    },
    {
      stepId: "step-2-check-status-uuid",
      branchKey: "true",
      branchLabel: null,
      nextStepId: "step-4-load-context-uuid",
      displayOrder: null
    },

    // Step 7: Check Standalone Mode (boolean)
    {
      stepId: "step-7-check-standalone-uuid",
      branchKey: "true",
      branchLabel: null,
      nextStepId: "step-9-display-standalone-uuid",
      displayOrder: null
    },
    {
      stepId: "step-7-check-standalone-uuid",
      branchKey: "false",
      branchLabel: null,
      nextStepId: "step-8-update-status-uuid",
      displayOrder: null
    }
  ]).returning();

  console.log(`✅ Seeded ${branches.length} branches for brainstorm-project`);
  return branches;
}
```

---

## 6. Seed Workflow Step Actions - brainstorm-project

```typescript
import { db } from "./db";
import { workflowStepActions } from "./schema";

export async function seedBrainstormProjectActions() {
  const actions = await db.insert(workflowStepActions).values([
    // Step 3: Set Standalone Mode
    {
      stepId: "step-3-set-standalone-uuid",
      actionType: "set-variable",
      actionConfig: {
        variableName: "standalone_mode",
        value: true
      },
      executionMode: "sequential",
      sequenceOrder: 1,
      condition: null
    },

    // Step 6: Save Artifact
    {
      stepId: "step-6-save-artifact-uuid",
      actionType: "database-insert",
      actionConfig: {
        table: "project_artifacts",
        data: {
          project_id: "{{project_id}}",
          artifact_type: "brainstorming-session",
          file_path: "{{brainstorming_artifact_path}}",
          workflow_id: "wf-brainstorm-project-uuid",
          metadata: {
            techniques_used: "{{brainstorming_techniques}}",
            session_date: "{{current_date}}"
          }
        }
      },
      executionMode: "sequential",
      sequenceOrder: 1,
      condition: null
    }
  ]).returning();

  console.log(`✅ Seeded ${actions.length} actions for brainstorm-project`);
  return actions;
}
```

---

## 7. Seed Workflow Steps - research (6-way branching!)

```typescript
import { db } from "./db";
import { workflowSteps } from "./schema";

export async function seedResearchSteps(workflowId: string) {
  const steps = await db.insert(workflowSteps).values([
    // Step 1-3: Same validation pattern as brainstorm-project
    {
      id: "research-step-1-validate-uuid",
      workflowId: workflowId,
      stepNumber: 1,
      stepType: "invoke-workflow",
      stepId: "validate-readiness",
      title: "Validate Workflow Readiness",
      description: "Check project status and load configuration",
      config: {
        invokedWorkflowName: "workflow-status",
        inputParams: {
          mode: "data",
          data_request: "project_config"
        },
        outputMapping: {
          status_exists: "status_exists",
          project_id: "project_id",
          project_level: "project_level"
        }
      },
      nextStepId: "research-step-2-check-status-uuid"
    },

    {
      id: "research-step-2-check-status-uuid",
      workflowId: workflowId,
      stepNumber: 2,
      stepType: "check-condition",
      stepId: "check-status-exists",
      title: "Check Progress Tracking",
      description: "Determine if running in tracked or standalone mode",
      config: {
        conditionType: "boolean",
        evaluateVariable: "status_exists"
      },
      nextStepId: null
    },

    {
      id: "research-step-3-set-standalone-uuid",
      workflowId: workflowId,
      stepNumber: 3,
      stepType: "execute-action",
      stepId: "set-standalone-mode",
      title: "Enable Standalone Mode",
      description: "Set standalone_mode = true",
      config: {
        description: "Enable standalone mode"
      },
      nextStepId: "research-step-4-welcome-uuid"
    },

    // Step 4: Present Research Type Menu (SELECT INPUT!)
    {
      id: "research-step-4-welcome-uuid",
      workflowId: workflowId,
      stepNumber: 4,
      stepType: "ask-user",
      stepId: "select-research-type",
      title: "Research Type Selection",
      description: "Present user with research type options",
      config: {
        question: `**What type of research do you need?**

Select the research type that best fits your needs:`,
        inputType: "select",
        options: [
          "1. Market Research - Comprehensive market analysis with TAM/SAM/SOM, competitive intelligence, and go-to-market strategy",
          "2. Deep Research Prompt Generator - Create structured, multi-step research prompts optimized for AI platforms",
          "3. Technical/Architecture Research - Evaluate technology stacks, architecture patterns, and technical approaches",
          "4. Competitive Intelligence - Deep dive into competitors, their strategies, and market positioning",
          "5. User Research - Customer insights, personas, jobs-to-be-done, and user behavior analysis",
          "6. Domain/Industry Research - Deep dive into specific industries, domains, or subject matter areas"
        ],
        validation: null,
        storeAs: "research_type"
      },
      nextStepId: "research-step-5-route-uuid"
    },

    // Step 5: Route to Research Type (6-WAY SELECT BRANCH!)
    {
      id: "research-step-5-route-uuid",
      workflowId: workflowId,
      stepNumber: 5,
      stepType: "check-condition",
      stepId: "route-research-type",
      title: "Route to Appropriate Research Type",
      description: "Branch to selected research workflow",
      config: {
        conditionType: "select",
        evaluateVariable: "research_type"
      },
      nextStepId: null // Routing via branches (6-way!)
    },

    // Step 6a: Execute Market Research
    {
      id: "research-step-6a-market-uuid",
      workflowId: workflowId,
      stepNumber: 6,
      stepType: "invoke-workflow",
      stepId: "execute-market-research",
      title: "Execute Market Research",
      description: "Run comprehensive market research workflow",
      config: {
        invokedWorkflowName: "research-market",
        inputParams: {
          project_id: "{{project_id}}",
          mode: "market",
          context: "full-market-analysis"
        },
        outputMapping: {
          research_results: "research_results",
          output_file_path: "research_artifact_path",
          research_type: "research_type_completed"
        }
      },
      nextStepId: "research-step-7-save-artifact-uuid"
    },

    // Step 6b: Execute Deep Prompt Generator
    {
      id: "research-step-6b-deep-prompt-uuid",
      workflowId: workflowId,
      stepNumber: 7,
      stepType: "invoke-workflow",
      stepId: "execute-deep-prompt",
      title: "Execute Deep Research Prompt Generator",
      description: "Generate structured research prompts",
      config: {
        invokedWorkflowName: "research-deep-prompt",
        inputParams: {
          project_id: "{{project_id}}",
          mode: "deep-prompt"
        },
        outputMapping: {
          research_results: "research_results",
          output_file_path: "research_artifact_path",
          research_type: "research_type_completed"
        }
      },
      nextStepId: "research-step-7-save-artifact-uuid"
    },

    // Step 6c: Execute Technical Research
    {
      id: "research-step-6c-technical-uuid",
      workflowId: workflowId,
      stepNumber: 8,
      stepType: "invoke-workflow",
      stepId: "execute-technical-research",
      title: "Execute Technical/Architecture Research",
      description: "Evaluate technical approaches and architecture patterns",
      config: {
        invokedWorkflowName: "research-technical",
        inputParams: {
          project_id: "{{project_id}}",
          mode: "technical"
        },
        outputMapping: {
          research_results: "research_results",
          output_file_path: "research_artifact_path",
          research_type: "research_type_completed"
        }
      },
      nextStepId: "research-step-7-save-artifact-uuid"
    },

    // Step 6d: Execute Competitive Intelligence
    {
      id: "research-step-6d-competitive-uuid",
      workflowId: workflowId,
      stepNumber: 9,
      stepType: "invoke-workflow",
      stepId: "execute-competitive-research",
      title: "Execute Competitive Intelligence",
      description: "Deep dive into competitor analysis",
      config: {
        invokedWorkflowName: "research-market",
        inputParams: {
          project_id: "{{project_id}}",
          mode: "competitive"
        },
        outputMapping: {
          research_results: "research_results",
          output_file_path: "research_artifact_path",
          research_type: "research_type_completed"
        }
      },
      nextStepId: "research-step-7-save-artifact-uuid"
    },

    // Step 6e: Execute User Research
    {
      id: "research-step-6e-user-uuid",
      workflowId: workflowId,
      stepNumber: 10,
      stepType: "invoke-workflow",
      stepId: "execute-user-research",
      title: "Execute User Research",
      description: "Customer insights and persona development",
      config: {
        invokedWorkflowName: "research-market",
        inputParams: {
          project_id: "{{project_id}}",
          mode: "user"
        },
        outputMapping: {
          research_results: "research_results",
          output_file_path: "research_artifact_path",
          research_type: "research_type_completed"
        }
      },
      nextStepId: "research-step-7-save-artifact-uuid"
    },

    // Step 6f: Execute Domain Research
    {
      id: "research-step-6f-domain-uuid",
      workflowId: workflowId,
      stepNumber: 11,
      stepType: "invoke-workflow",
      stepId: "execute-domain-research",
      title: "Execute Domain/Industry Research",
      description: "Deep dive into industry analysis",
      config: {
        invokedWorkflowName: "research-market",
        inputParams: {
          project_id: "{{project_id}}",
          mode: "domain"
        },
        outputMapping: {
          research_results: "research_results",
          output_file_path: "research_artifact_path",
          research_type: "research_type_completed"
        }
      },
      nextStepId: "research-step-7-save-artifact-uuid"
    },

    // Step 7: Save Research Artifact (ALL 6 BRANCHES CONVERGE HERE!)
    {
      id: "research-step-7-save-artifact-uuid",
      workflowId: workflowId,
      stepNumber: 12,
      stepType: "execute-action",
      stepId: "save-research-artifact",
      title: "Track Generated Research Artifact",
      description: "Save research artifact to project_artifacts table",
      config: {
        description: "Record research artifact in database"
      },
      nextStepId: "research-step-8-check-standalone-uuid"
    },

    // Step 8-10: Same completion pattern as brainstorm-project
    {
      id: "research-step-8-check-standalone-uuid",
      workflowId: workflowId,
      stepNumber: 13,
      stepType: "check-condition",
      stepId: "check-standalone-mode",
      title: "Check Progress Tracking Mode",
      description: "Determine completion message",
      config: {
        conditionType: "boolean",
        evaluateVariable: "standalone_mode"
      },
      nextStepId: null
    },

    {
      id: "research-step-9-update-status-uuid",
      workflowId: workflowId,
      stepNumber: 14,
      stepType: "invoke-workflow",
      stepId: "update-workflow-status",
      title: "Mark Workflow Complete",
      description: "Update project_state",
      config: {
        invokedWorkflowName: "workflow-status",
        inputParams: {
          mode: "update",
          action: "complete_workflow",
          workflow_name: "research"
        },
        outputMapping: {
          next_workflow: "next_workflow",
          next_agent: "next_agent"
        }
      },
      nextStepId: "research-step-10a-display-tracked-uuid"
    },

    {
      id: "research-step-10a-display-tracked-uuid",
      workflowId: workflowId,
      stepNumber: 15,
      stepType: "display-output",
      stepId: "display-tracked-complete",
      title: "Show Completion with Next Steps",
      description: "Display success message",
      config: {
        outputTemplate: `✅ **Research Complete!**

**Research Type:** {{research_type_completed}}
**Results saved to:** {{research_artifact_path}}

**Status Updated:**
- research workflow marked complete

**Next Steps:**
- **Next required:** {{next_workflow}} ({{next_agent}} agent)
- **Optional:** Run additional research types or other analysis workflows

Check status: \`workflow-status\``,
        outputType: "success"
      },
      nextStepId: null
    },

    {
      id: "research-step-10b-display-standalone-uuid",
      workflowId: workflowId,
      stepNumber: 16,
      stepType: "display-output",
      stepId: "display-standalone-complete",
      title: "Show Standalone Completion",
      description: "Display success message for standalone mode",
      config: {
        outputTemplate: `✅ **Research Complete!**

**Research Type:** {{research_type_completed}}
**Results saved to:** {{research_artifact_path}}

**Next Steps:**
- Run \`workflow-init\` to start progress tracking
- Or refer to BMM workflow guide`,
        outputType: "success"
      },
      nextStepId: null
    }
  ]).returning();

  console.log(`✅ Seeded ${steps.length} steps for research`);
  return steps;
}
```

---

## 8. Seed Workflow Step Branches - research (6-way!)

```typescript
import { db } from "./db";
import { workflowStepBranches } from "./schema";

export async function seedResearchBranches() {
  const branches = await db.insert(workflowStepBranches).values([
    // Step 2: Check Status Exists (boolean)
    {
      stepId: "research-step-2-check-status-uuid",
      branchKey: "false",
      branchLabel: null,
      nextStepId: "research-step-3-set-standalone-uuid",
      displayOrder: null
    },
    {
      stepId: "research-step-2-check-status-uuid",
      branchKey: "true",
      branchLabel: null,
      nextStepId: "research-step-4-welcome-uuid",
      displayOrder: null
    },

    // Step 5: Route Research Type (6-WAY SELECT!)
    {
      stepId: "research-step-5-route-uuid",
      branchKey: "1",
      branchLabel: "Market Research",
      nextStepId: "research-step-6a-market-uuid",
      displayOrder: 1
    },
    {
      stepId: "research-step-5-route-uuid",
      branchKey: "2",
      branchLabel: "Deep Research Prompt Generator",
      nextStepId: "research-step-6b-deep-prompt-uuid",
      displayOrder: 2
    },
    {
      stepId: "research-step-5-route-uuid",
      branchKey: "3",
      branchLabel: "Technical/Architecture Research",
      nextStepId: "research-step-6c-technical-uuid",
      displayOrder: 3
    },
    {
      stepId: "research-step-5-route-uuid",
      branchKey: "4",
      branchLabel: "Competitive Intelligence",
      nextStepId: "research-step-6d-competitive-uuid",
      displayOrder: 4
    },
    {
      stepId: "research-step-5-route-uuid",
      branchKey: "5",
      branchLabel: "User Research",
      nextStepId: "research-step-6e-user-uuid",
      displayOrder: 5
    },
    {
      stepId: "research-step-5-route-uuid",
      branchKey: "6",
      branchLabel: "Domain/Industry Research",
      nextStepId: "research-step-6f-domain-uuid",
      displayOrder: 6
    },

    // Step 8: Check Standalone Mode (boolean)
    {
      stepId: "research-step-8-check-standalone-uuid",
      branchKey: "true",
      branchLabel: null,
      nextStepId: "research-step-10b-display-standalone-uuid",
      displayOrder: null
    },
    {
      stepId: "research-step-8-check-standalone-uuid",
      branchKey: "false",
      branchLabel: null,
      nextStepId: "research-step-9-update-status-uuid",
      displayOrder: null
    }
  ]).returning();

  console.log(`✅ Seeded ${branches.length} branches for research (including 6-way!)`);
  return branches;
}
```

---

## 9. Seed Workflow Step Actions - research

```typescript
import { db } from "./db";
import { workflowStepActions } from "./schema";

export async function seedResearchActions() {
  const actions = await db.insert(workflowStepActions).values([
    // Step 3: Set Standalone Mode
    {
      stepId: "research-step-3-set-standalone-uuid",
      actionType: "set-variable",
      actionConfig: {
        variableName: "standalone_mode",
        value: true
      },
      executionMode: "sequential",
      sequenceOrder: 1,
      condition: null
    },

    // Step 7: Save Artifact
    {
      stepId: "research-step-7-save-artifact-uuid",
      actionType: "database-insert",
      actionConfig: {
        table: "project_artifacts",
        data: {
          project_id: "{{project_id}}",
          artifact_type: "research-{{research_type_completed}}",
          file_path: "{{research_artifact_path}}",
          workflow_id: "wf-research-uuid",
          metadata: {
            research_type: "{{research_type_completed}}",
            completed_date: "{{current_date}}"
          }
        }
      },
      executionMode: "sequential",
      sequenceOrder: 1,
      condition: null
    }
  ]).returning();

  console.log(`✅ Seeded ${actions.length} actions for research`);
  return actions;
}
```

---

## 10. Seed Workflow Path Workflows (Junction Table)

```typescript
import { db } from "./db";
import { workflowPathWorkflows } from "./schema";

export async function seedWorkflowPathWorkflows(
  pathId: string,
  brainstormWorkflowId: string,
  researchWorkflowId: string
) {
  const junctions = await db.insert(workflowPathWorkflows).values([
    // Phase 1: brainstorm-project
    {
      workflowPathId: pathId,
      workflowId: brainstormWorkflowId,
      phase: 1,
      sequenceOrder: 1,
      isOptional: true,
      isRecommended: false
    },

    // Phase 1: research
    {
      workflowPathId: pathId,
      workflowId: researchWorkflowId,
      phase: 1,
      sequenceOrder: 2,
      isOptional: true,
      isRecommended: false
    }

    // Note: product-brief will be added in next session
  ]).returning();

  console.log(`✅ Seeded ${junctions.length} workflow path relationships`);
  return junctions;
}
```

---

## 11. Master Seed Script

```typescript
// packages/db/src/seed/index.ts
import {
  seedAgents,
  seedWorkflowPaths,
  seedWorkflows,
  seedBrainstormProjectSteps,
  seedBrainstormProjectBranches,
  seedBrainstormProjectActions,
  seedResearchSteps,
  seedResearchBranches,
  seedResearchActions,
  seedWorkflowPathWorkflows
} from "./seed-functions";

export async function seedDatabase() {
  console.log("🌱 Starting database seeding...\n");

  try {
    // 1. Seed agents
    const { analystAgent } = await seedAgents();

    // 2. Seed workflow paths
    const { greenfield3 } = await seedWorkflowPaths();

    // 3. Seed workflows
    const { brainstormWorkflow, researchWorkflow } = await seedWorkflows(analystAgent.id);

    // 4. Seed brainstorm-project workflow
    await seedBrainstormProjectSteps(brainstormWorkflow.id);
    await seedBrainstormProjectBranches();
    await seedBrainstormProjectActions();

    // 5. Seed research workflow
    await seedResearchSteps(researchWorkflow.id);
    await seedResearchBranches();
    await seedResearchActions();

    // 6. Seed workflow path relationships
    await seedWorkflowPathWorkflows(
      greenfield3.id,
      brainstormWorkflow.id,
      researchWorkflow.id
    );

    console.log("\n✅ Database seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
```

---

## Usage

```bash
# Run seed script
cd packages/db
bun run src/seed/index.ts

# Or add to package.json
{
  "scripts": {
    "db:seed": "bun run src/seed/index.ts"
  }
}

# Then run
bun run db:seed
```

---

## Verification Queries

```typescript
// Verify seeding worked
import { db } from "./db";
import { agents, workflows, workflowSteps, workflowStepBranches } from "./schema";

// Check agents
const agentCount = await db.select().from(agents);
console.log(`Agents: ${agentCount.length}`); // Should be 1

// Check workflows
const workflowCount = await db.select().from(workflows);
console.log(`Workflows: ${workflowCount.length}`); // Should be 2

// Check steps
const stepCount = await db.select().from(workflowSteps);
console.log(`Steps: ${stepCount.length}`); // Should be 26 (10 + 16)

// Check branches (including 6-way!)
const branchCount = await db.select().from(workflowStepBranches);
console.log(`Branches: ${branchCount.length}`); // Should be 10 (4 + 6)
```

---

## Key Patterns Demonstrated

### 1. Inline Context (Step 4 of brainstorm-project)
```typescript
config: {
  contextSource: "inline",
  contextContent: "Your actual context here...", // ← NOT a file path!
  storeAs: "project_context"
}
```

### 2. N-way Select Branching (Step 5 of research)
```typescript
// Step config
config: {
  conditionType: "select",
  evaluateVariable: "research_type" // User selected "1", "2", "3", etc.
}

// 6 branches in workflow_step_branches table
branchKey: "1" → nextStepId: market-research
branchKey: "2" → nextStepId: deep-prompt
// ... 4 more branches
```

### 3. Variable Interpolation
```typescript
inputParams: {
  context: "{{project_context}}", // ← Reads from workflow_executions.variables
  project_id: "{{project_id}}"
}
```

### 4. Artifact Tracking
```typescript
actionConfig: {
  table: "project_artifacts",
  data: {
    project_id: "{{project_id}}",
    file_path: "{{brainstorming_artifact_path}}", // Actual file path
    artifact_type: "brainstorming-session"
  }
}
```

---

_Seed data ready for implementation_
_Last updated: 2025-11-05_
