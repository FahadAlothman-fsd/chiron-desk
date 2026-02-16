import { db, workflowSteps } from "@chiron/db";

/**
 * SCAMPER Technique Workflow Seed
 *
 * SCAMPER is a structured brainstorming technique using 7 lenses:
 * - Substitute: What could you substitute?
 * - Combine: What could you combine?
 * - Adapt: How could you adapt?
 * - Modify: What could you modify?
 * - Put to other uses: What other purposes?
 * - Eliminate: What could you eliminate?
 * - Reverse: What if reversed?
 *
 * Source: bmad/core/workflows/brainstorming/brain-methods.csv (line 23)
 */
export async function seedScamperTechnique() {
  // Query analyst agent ID
  const analystAgent = await db.query.agents.findFirst({
    where: (agents, { eq }) => eq(agents.name, "analyst"),
  });

  if (!analystAgent) {
    console.error("  ❌ Analyst agent not found - cannot seed SCAMPER technique");
    return;
  }

  // Query existing workflow
  const workflow = await db.query.workflows.findFirst({
    where: (workflows, { eq }) => eq(workflows.name, "scamper"),
  });

  if (!workflow) {
    console.error("  ❌ SCAMPER workflow not found - run workflow seeder first");
    return;
  }

  console.log("  ✓ SCAMPER workflow found (Analyst agent)");

  // Check if steps already exist
  const existingSteps = await db.query.workflowSteps.findMany({
    where: (steps, { eq }) => eq(steps.workflowId, workflow.id),
  });

  if (existingSteps.length > 0) {
    console.log("  ℹ️  SCAMPER steps already exist, skipping step seeding");
    return;
  }

  // Step 1: Interactive SCAMPER Session
  // 7 sequential blocking tools (one for each letter)
  const step1Config = {
    agentKind: "chiron",
    agentId: analystAgent.id,
    message:
      "Let's explore your idea using the SCAMPER method! 🔍\n\nSCAMPER helps you systematically examine your concept through 7 creative lenses. We'll go through each one step by step.\n\nFirst, let's start with **Substitute**: What elements of your idea could be substituted with something else?",

    tools: [
      // S - Substitute
      {
        name: "scamper_substitute",
        toolType: "update-variable",
        targetVariable: "substitute_ideas",
        description: "Capture ideas for what could be substituted",
        usageGuidance:
          "Call this tool when the user has shared ideas about what elements could be substituted, replaced, or swapped out. Examples: different materials, alternative processes, other resources, different people/roles.",
        requiredVariables: [], // First tool, no prerequisites
        requiresApproval: true,
        valueSchema: {
          type: "array",
          items: {
            type: "string",
          },
          description: "List of substitution ideas from the conversation",
        },
      },

      // C - Combine
      {
        name: "scamper_combine",
        toolType: "update-variable",
        targetVariable: "combine_ideas",
        description: "Capture ideas for what could be combined",
        usageGuidance:
          "Call this tool when the user has explored ideas about combining elements together. Examples: merging features, integrating processes, blending concepts, uniting resources.",
        requiredVariables: ["substitute_ideas"], // Blocked until substitute approved
        requiresApproval: true,
        valueSchema: {
          type: "array",
          items: {
            type: "string",
          },
          description: "List of combination ideas from the conversation",
        },
      },

      // A - Adapt
      {
        name: "scamper_adapt",
        toolType: "update-variable",
        targetVariable: "adapt_ideas",
        description: "Capture ideas for how to adapt from other contexts",
        usageGuidance:
          "Call this tool when the user has discussed how to adapt ideas from other domains or contexts. Examples: borrowing from nature, adapting from other industries, applying proven patterns from elsewhere.",
        requiredVariables: ["combine_ideas"], // Blocked until combine approved
        requiresApproval: true,
        valueSchema: {
          type: "array",
          items: {
            type: "string",
          },
          description: "List of adaptation ideas from the conversation",
        },
      },

      // M - Modify
      {
        name: "scamper_modify",
        toolType: "update-variable",
        targetVariable: "modify_ideas",
        description: "Capture ideas for modifications and alterations",
        usageGuidance:
          "Call this tool when the user has brainstormed ways to modify, magnify, or minimize aspects. Examples: changing size, altering shape, adjusting color, varying intensity, scaling up/down.",
        requiredVariables: ["adapt_ideas"], // Blocked until adapt approved
        requiresApproval: true,
        valueSchema: {
          type: "array",
          items: {
            type: "string",
          },
          description: "List of modification ideas from the conversation",
        },
      },

      // P - Put to other uses
      {
        name: "scamper_put_to_other_uses",
        toolType: "update-variable",
        targetVariable: "other_uses_ideas",
        description: "Capture ideas for alternative uses or purposes",
        usageGuidance:
          "Call this tool when the user has explored alternative purposes or new contexts for the idea. Examples: different markets, new applications, repurposing for other needs.",
        requiredVariables: ["modify_ideas"], // Blocked until modify approved
        requiresApproval: true,
        valueSchema: {
          type: "array",
          items: {
            type: "string",
          },
          description: "List of alternative use ideas from the conversation",
        },
      },

      // E - Eliminate
      {
        name: "scamper_eliminate",
        toolType: "update-variable",
        targetVariable: "eliminate_ideas",
        description: "Capture ideas for what could be eliminated or simplified",
        usageGuidance:
          "Call this tool when the user has identified elements that could be removed, reduced, or streamlined. Examples: removing unnecessary features, simplifying processes, cutting redundancies.",
        requiredVariables: ["other_uses_ideas"], // Blocked until other uses approved
        requiresApproval: true,
        valueSchema: {
          type: "array",
          items: {
            type: "string",
          },
          description: "List of elimination ideas from the conversation",
        },
      },

      // R - Reverse/Rearrange
      {
        name: "scamper_reverse",
        toolType: "update-variable",
        targetVariable: "reverse_ideas",
        description: "Capture ideas for reversing or rearranging elements",
        usageGuidance:
          "Call this tool when the user has explored reversing order, flipping perspectives, or rearranging components. Examples: inverting the process, doing opposite, changing sequence, switching roles.",
        requiredVariables: ["eliminate_ideas"], // Blocked until eliminate approved
        requiresApproval: true,
        valueSchema: {
          type: "array",
          items: {
            type: "string",
          },
          description: "List of reversal/rearrangement ideas from the conversation",
        },
      },
    ],

    // Completion: All 7 SCAMPER lenses must be explored
    completionConditions: [
      {
        type: "all-variables-set",
        requiredVariables: [
          "substitute_ideas",
          "combine_ideas",
          "adapt_ideas",
          "modify_ideas",
          "other_uses_ideas",
          "eliminate_ideas",
          "reverse_ideas",
        ],
      },
    ],
  };

  // Insert Step 1
  await db.insert(workflowSteps).values({
    workflowId: workflow.id,
    stepNumber: 1,
    goal: "Explore idea through 7 SCAMPER lenses systematically",
    stepType: "agent",
    config: step1Config,
    nextStepNumber: null, // Single-step technique
  });

  console.log("  ✓ Step 1: SCAMPER Interactive Session (7 sequential tools)");
}
