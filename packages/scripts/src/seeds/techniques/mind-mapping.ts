import type { AskUserChatStepConfig } from "@chiron/db";
import { db, workflowSteps } from "@chiron/db";

/**
 * Seeds the Mind Mapping technique workflow
 * Story 2.3: Technique Workflows - Mind Mapping (4-step visual branching)
 *
 * Pattern: Multi-step with distinct cognitive phases
 * Duration: ~20-25 minutes
 * Steps: 4 (Center → Main Branches → Sub-branches → Connections)
 */
export async function seedMindMappingTechnique() {
  // Query Analyst agent ID (Brainstorming Coach uses Analyst agent)
  const analystAgent = await db.query.agents.findFirst({
    where: (agents, { eq }) => eq(agents.name, "analyst"),
  });

  if (!analystAgent) {
    console.error("  ❌ Analyst agent not found - cannot seed Mind Mapping workflow");
    return;
  }

  // Query existing workflow
  const workflow = await db.query.workflows.findFirst({
    where: (workflows, { eq }) => eq(workflows.name, "mind-mapping"),
  });

  if (!workflow) {
    console.error("  ❌ Mind Mapping workflow not found - run workflow seeder first");
    return;
  }

  console.log("  ✓ Mind Mapping workflow found (Analyst agent)");

  // Check if steps already exist
  const existingSteps = await db.query.workflowSteps.findMany({
    where: (steps, { eq }) => eq(steps.workflowId, workflow.id),
  });

  if (existingSteps.length > 0) {
    console.log("  ℹ️  Mind Mapping steps already exist, skipping step seeding");
    return;
  }

  // ============================================
  // STEP 1: Define Central Concept
  // ============================================
  const step1Config: AskUserChatStepConfig = {
    agentId: analystAgent.id,
    generateInitialMessage: true,
    initialPrompt: `You are Carson facilitating Mind Mapping - a visual technique for exploring ideas!

**Session Context:**
Topic: {{parent.session_topic}}
Goals: {{parent.stated_goals}}

**Phase 1: THE CENTER 🎯**

Every mind map starts with a powerful central concept - the heart from which everything branches.

Help the user crystallize their main idea into ONE clear, concise phrase. This is the anchor point!

**Your Task:**
Ask: "Let's start with the CENTER of your mind map. In one powerful phrase or word, what's the CORE idea we're exploring?"

**Tips for them:**
- Keep it simple (1-5 words)
- Make it concrete
- This is the sun - branches are the rays

Be enthusiastic and help them refine until it's crystal clear!`,

    tools: [
      {
        name: "set_central_concept",
        toolType: "update-variable",
        targetVariable: "central_concept",
        description: "Capture the central concept",
        usageGuidance:
          "Once user has a clear, concise central concept (1-5 words), save it and celebrate: 'Perfect! That's your center! Now let's grow some branches!' Then the step will complete.",
        requiredVariables: [],
        requiresApproval: true,
        valueSchema: {
          type: "string",
          description: "The central concept (1-5 words)",
        },
      },
    ],

    completionCondition: {
      type: "all-variables-set",
      requiredVariables: ["central_concept"],
    },

    outputVariables: {
      central_concept: "central_concept",
    },
  };

  // ============================================
  // STEP 2: Generate Main Branches
  // ============================================
  const step2Config: AskUserChatStepConfig = {
    agentId: analystAgent.id,
    generateInitialMessage: true,
    initialPrompt: `**Phase 2: MAIN BRANCHES 🌳**

Central Concept: **{{central_concept}}**

Now let's grow the MAIN BRANCHES! These are the 4-7 major themes, categories, or dimensions that radiate from your center.

Think of these as the BIG pieces of your topic.

**Examples:**
- If center is "Mobile App", branches might be: Features, Users, Technology, Marketing, Revenue
- If center is "Vacation", branches might be: Destination, Activities, Budget, Companions, Timeline

**Your Task:**
Help the user identify 4-7 main branches. Ask: "What are the major CATEGORIES or THEMES that branch out from '{{central_concept}}'?"

**Tips:**
- Aim for 4-7 branches (not too few, not too many)
- Each branch should be distinct
- Use single words or short phrases
- Think: "What are the big pieces of this puzzle?"

Be encouraging! Build energy as branches emerge!`,

    tools: [
      {
        name: "capture_main_branches",
        toolType: "update-variable",
        targetVariable: "main_branches",
        description: "Capture main branches (4-7 major themes)",
        usageGuidance:
          "Once user has identified 4-7 main branches, save them and celebrate: 'Excellent branches! Now let's add detail with sub-branches!' Step will advance automatically.",
        requiredVariables: [],
        requiresApproval: true,
        valueSchema: {
          type: "array",
          items: { type: "string" },
          description: "List of 4-7 main branch names",
        },
      },
    ],

    completionCondition: {
      type: "all-variables-set",
      requiredVariables: ["main_branches"],
    },

    outputVariables: {
      main_branches: "main_branches",
    },
  };

  // ============================================
  // STEP 3: Expand with Sub-branches
  // ============================================
  const step3Config: AskUserChatStepConfig = {
    agentId: analystAgent.id,
    generateInitialMessage: true,
    initialPrompt: `**Phase 3: SUB-BRANCHES 🌿**

Your Main Branches: {{main_branches}}

Time to add DETAIL! For EACH main branch, let's grow 2-4 sub-branches.

Sub-branches are the smaller ideas, specifics, details, or questions that extend from each main branch.

**Process:**
Go through each branch ONE AT A TIME and ask: "What specific ideas, details, or aspects belong under this branch?"

**Example:**
Main Branch: "Features"
Sub-branches: Login, Dashboard, Notifications, Search

**Your Task:**
Guide them through EACH main branch systematically. Build up a rich tree structure!

Start: "Let's expand each branch! Pick the first branch from {{main_branches}} - what SUB-BRANCHES sprout from it?"

**Tips:**
- 2-4 sub-branches per main branch
- Keep sub-branches more specific than main branches
- It's okay to have different numbers for different branches

Be patient and methodical! Celebrate each expanded branch!`,

    tools: [
      {
        name: "capture_sub_branches",
        toolType: "update-variable",
        targetVariable: "sub_branches",
        description: "Capture sub-branches organized by main branch",
        usageGuidance:
          "Once all main branches have been expanded with sub-branches, save the full structure and celebrate: 'Beautiful! Your mind map is taking shape! Now let's find the hidden connections!' Step advances.",
        requiredVariables: [],
        requiresApproval: true,
        valueSchema: {
          type: "object",
          description:
            "Sub-branches organized by main branch name as key, with array of sub-branch names as value",
          additionalProperties: {
            type: "array",
            items: { type: "string" },
          },
          // Example: { "Features": ["Login", "Dashboard"], "Users": ["Students", "Teachers"] }
        },
      },
    ],

    completionCondition: {
      type: "all-variables-set",
      requiredVariables: ["sub_branches"],
    },

    outputVariables: {
      sub_branches: "sub_branches",
    },
  };

  // ============================================
  // STEP 4: Discover Connections
  // ============================================
  const step4Config: AskUserChatStepConfig = {
    agentId: analystAgent.id,
    generateInitialMessage: true,
    initialPrompt: `**Phase 4: CONNECTIONS ✨**

Your Complete Mind Map:
- **Center:** {{central_concept}}
- **Main Branches:** {{main_branches}}
- **Sub-branches:** {{sub_branches}}

Now for the MAGIC - finding CONNECTIONS!

Mind maps aren't just trees - they're NETWORKS. Look for relationships, links, patterns, or synergies between DIFFERENT branches.

**What to Look For:**
- Which branches influence each other?
- What patterns emerge across branches?
- What surprising links exist?
- Which sub-branches from different main branches relate?

**Examples:**
- "Marketing connects to Features - we need to promote the Login simplicity"
- "Budget limits Technology choices"
- "Users inform Features and Marketing"

**Your Task:**
Ask: "Looking at your complete map, what CONNECTIONS exist between different branches? What relationships or patterns do you see?"

**Tips:**
- Cross-branch connections reveal insights
- Look for cause-effect relationships
- Find synergies and conflicts
- The most interesting ideas often live in connections!

Be excited about discoveries! These connections are where innovation happens!`,

    tools: [
      {
        name: "capture_connections",
        toolType: "update-variable",
        targetVariable: "connections",
        description: "Capture discovered connections between branches",
        usageGuidance:
          "Once user has identified key connections (at least 2-3), save them and CELEBRATE COMPLETION: 'WOW! You just created a complete mind map! Look at all those connections and insights! 🎉' Workflow completes.",
        requiredVariables: [],
        requiresApproval: true,
        valueSchema: {
          type: "array",
          items: { type: "string" },
          description:
            "List of connections (e.g., 'Marketing → Features: Promote login simplicity')",
        },
      },
    ],

    completionCondition: {
      type: "all-variables-set",
      requiredVariables: ["connections"],
    },

    outputVariables: {
      generated_ideas: "complete_mind_map", // Full structured mind map object
    },
  };

  // Insert all 4 steps
  await db.insert(workflowSteps).values([
    {
      workflowId: workflow.id,
      stepNumber: 1,
      goal: "Establish the central concept",
      stepType: "ask-user-chat",
      config: step1Config,
      nextStepNumber: 2,
    },
    {
      workflowId: workflow.id,
      stepNumber: 2,
      goal: "Create main branches from center",
      stepType: "ask-user-chat",
      config: step2Config,
      nextStepNumber: 3,
    },
    {
      workflowId: workflow.id,
      stepNumber: 3,
      goal: "Add sub-branches to each main branch",
      stepType: "ask-user-chat",
      config: step3Config,
      nextStepNumber: 4,
    },
    {
      workflowId: workflow.id,
      stepNumber: 4,
      goal: "Find connections between branches",
      stepType: "ask-user-chat",
      config: step4Config,
      nextStepNumber: null, // Final step
    },
  ]);

  console.log("  ✓ Step 1-4: Center → Main Branches → Sub-branches → Connections");
}
