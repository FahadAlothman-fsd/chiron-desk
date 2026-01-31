import type { AgentStepConfig } from "@chiron/db";
import { db, workflowSteps, workflows, workflowTemplates } from "@chiron/db";

/**
 * Seeds the brainstorming workflow with Step 1 configuration
 * Story 2.2: Workbench Shell & Setup - Brainstorming workflow foundation
 *
 * Step 1: Setup phase - Topic selection, goal setting, technique selection
 * Future steps (Stories 2.3-2.6): Execution loop, convergence, planning, output
 */
export async function seedBrainstorming() {
  // Query Analyst agent ID (Brainstorming Coach uses Analyst agent)
  const analystAgent = await db.query.agents.findFirst({
    where: (agents, { eq }) => eq(agents.name, "analyst"),
  });

  if (!analystAgent) {
    console.error("  ❌ Analyst agent not found - cannot seed brainstorming workflow");
    return;
  }

  // Query existing workflow (created by seedBrainstormingWorkflow)
  const workflow = await db.query.workflows.findFirst({
    where: (workflows, { eq }) => eq(workflows.name, "brainstorming"),
  });

  if (!workflow) {
    console.error("  ❌ Brainstorming workflow not found - run seedBrainstormingWorkflow first");
    return;
  }

  console.log("  ✓ brainstorming workflow found (Analyst agent, Phase 0)");

  // Create or update template for brainstorming session preview
  const template = `# Brainstorming Session: {{session_topic}}

## Session Goals

{{#each stated_goals}}
- {{this}}
{{/each}}

## Selected Techniques

{{#each selected_techniques}}
- **{{this.displayName}}**: {{this.description}}
{{/each}}

---

*Session configured and ready to begin*`;

  const [sessionTemplate] = await db
    .insert(workflowTemplates)
    .values({
      name: "brainstorming-session",
      displayName: "Brainstorming Session",
      artifactType: "brainstorming",
      template,
      templateVariables: [
        {
          name: "session_topic",
          type: "string",
          required: true,
          description: "The brainstorming session topic",
        },
        {
          name: "stated_goals",
          type: "array",
          required: true,
          description: "List of session goals",
        },
        {
          name: "selected_techniques",
          type: "array",
          required: true,
          description: "Selected brainstorming techniques",
        },
      ],
    })
    .onConflictDoUpdate({
      target: workflowTemplates.name,
      set: {
        template,
        templateVariables: [
          {
            name: "session_topic",
            type: "string",
            required: true,
            description: "The brainstorming session topic",
          },
          {
            name: "stated_goals",
            type: "array",
            required: true,
            description: "List of session goals",
          },
          {
            name: "selected_techniques",
            type: "array",
            required: true,
            description: "Selected brainstorming techniques",
          },
        ],
      },
    })
    .returning();

  // Update workflow to reference this template
  const { eq } = await import("drizzle-orm");
  await db
    .update(workflows)
    .set({
      outputTemplateId: sessionTemplate.id,
    })
    .where(eq(workflows.id, workflow.id));

  console.log("  ✓ Brainstorming template created and linked");

  // Check if steps already exist - skip if they do (fresh DB only)
  const existingSteps = await db.query.workflowSteps.findMany({
    where: (steps, { eq }) => eq(steps.workflowId, workflow.id),
  });

  if (existingSteps.length > 0) {
    console.log("  ℹ️  Brainstorming steps already exist, skipping step seeding");
    return;
  }

  // Step 1: Setup Phase - Topic, Goals, Techniques
  // Story 2.2: Configure Step 1 with three Mastra tools
  const step1Config: AgentStepConfig = {
    agentKind: "chiron",
    agentId: analystAgent.id,
    initialMessage:
      "Welcome to your brainstorming session! 🧠\n\nI'm here to help you generate creative ideas and develop an action plan. Let's start by setting up your session.\n\nWhat would you like to brainstorm about? Tell me the topic or problem you want to explore.",

    tools: [
      // Tool 1: Update Topic
      {
        name: "update_topic",
        toolType: "update-variable",
        targetVariable: "session_topic",
        description: "Set the brainstorming session topic",
        usageGuidance:
          "Call this tool when the user clearly states what they want to brainstorm about. The topic should be specific enough to guide technique selection but broad enough to allow creative exploration. Examples: 'AI-powered task manager', 'Sustainable packaging solutions', 'Remote team engagement strategies'.",
        requiredVariables: [], // Can execute anytime
        requiresApproval: true,
        valueSchema: {
          type: "string",
          description: "A clear, concise session topic (let agent decide appropriate length)",
        },
      },

      // Tool 2: Update Goals
      {
        name: "update_goals",
        toolType: "update-variable",
        targetVariable: "stated_goals",
        description: "Set the brainstorming session goals",
        usageGuidance:
          "Call this tool after the topic is approved and the user has explained what they want to achieve. Extract concrete goals from the conversation. Each goal should be specific and measurable. If user only states vague goals, ask clarifying questions first. Let agent decide appropriate number of goals based on conversation depth.",
        requiredVariables: ["session_topic"], // Topic must be set first
        requiresApproval: true,
        valueSchema: {
          type: "array",
          items: {
            type: "string",
          },
          description: "List of session goals (agent determines appropriate quantity)",
        },
      },

      // Tool 3: Select Techniques
      {
        name: "select_techniques",
        toolType: "ax-generation",
        description: "Select brainstorming techniques to use in this session",
        usageGuidance:
          "After goals are approved, present available technique options from the database. Recommend techniques that best fit the session topic and goals. User can select multiple techniques that complement each other. Let agent/user decide appropriate number based on session scope.",
        requiredVariables: ["stated_goals"], // Goals must be set first
        requiresApproval: true,
        // Fetch technique workflows from database (both CIS and Core)
        optionsSource: {
          table: "workflows",
          selectFields: ["id", "name", "displayName", "description", "tags"],
          filterBy: {
            "tags->>'type'": "technique",
            // No module filter - accept all techniques (CIS, Core, custom)
          },
          orderBy: "name",
          outputVariable: "technique_options",
          requireFeedbackOnOverride: false,
          displayConfig: {
            cardLayout: "simple",
            fields: {
              value: "id",
              title: "displayName",
              description: "description",
            },
          },
        },
        axSignature: {
          input: [
            {
              name: "session_topic",
              type: "string",
              source: "variable",
              variableName: "session_topic",
              description: "Session topic for context",
            },
            {
              name: "stated_goals",
              type: "string[]",
              source: "variable",
              variableName: "stated_goals",
              description: "User's stated goals",
            },
            {
              name: "technique_options",
              type: "json[]",
              selectFields: ["id", "displayName", "description"],
              source: "variable",
              variableName: "technique_options",
              description: "Available brainstorming techniques",
            },
          ],
          output: [
            {
              name: "selected_techniques",
              type: "class[]",
              classesFrom: {
                source: "technique_options",
                field: "id",
              },
              description: "Selected technique IDs (agent recommends appropriate number)",
              internal: false,
            },
            {
              name: "reasoning",
              type: "string",
              description: "Why these techniques fit the session goals",
              internal: false,
            },
          ],
          strategy: "ChainOfThought",
        },
      },
    ],

    // Completion condition: All three variables must be set
    completionCondition: {
      type: "all-variables-set",
      requiredVariables: ["session_topic", "stated_goals", "selected_techniques"],
    },

    // Output variables mapping (for template rendering in artifact preview)
    outputVariables: {
      topic: "approval_states.update_topic.value",
      goals: "approval_states.update_goals.value",
      techniques: "approval_states.select_techniques.value.selected_techniques",
    },
  };

  // Insert Step 1
  await db.insert(workflowSteps).values({
    workflowId: workflow.id,
    stepNumber: 1,
    goal: "Define session topic, goals, and select brainstorming techniques",
    stepType: "agent",
    config: step1Config,
    nextStepNumber: 2, // Story 2.3: Continue to Step 2
  });

  console.log("  ✓ Step 1: Setup (topic, goals, techniques)");

  // Step 2: Execute Selected Techniques (Invoke)
  // Story 2.3: Configure Step 2 with invoke logic
  const step2Config = {
    workflowsToInvoke: "{{techniques}}", // Read from Step 1 outputVariables (techniques → approval_states.select_techniques.value.selected_techniques)
    variableMapping: {
      // Key = child workflow variable name, Value = parent execution variable reference
      session_topic: "{{topic}}", // Child uses {{parent.session_topic}}, gets from parent's {{topic}} (Step 1 output)
      stated_goals: "{{goals}}", // Child uses {{parent.stated_goals}}, gets from parent's {{goals}} (Step 1 output)
    },
    expectedOutputVariable: "generated_ideas", // Variable name to read from each child
    aggregateInto: "captured_ideas", // Parent variable to append child outputs
    completionCondition: {
      type: "all-complete", // Wait for all children to reach status = completed
    },
  };

  // Insert Step 2
  await db.insert(workflowSteps).values({
    workflowId: workflow.id,
    stepNumber: 2,
    goal: "Execute selected brainstorming techniques and collect ideas",
    stepType: "invoke",
    config: step2Config,
    nextStepNumber: null, // Story 2.4+ will add convergence steps
  });

  console.log("  ✓ Step 2: Technique Execution (invoke)");
}
