/**
 * Stub Workflows Seed
 *
 * Creates stub workflows for all path-referenced workflows that don't have
 * full implementations yet. These are minimal placeholders that will be
 * fleshed out as development progresses.
 *
 * Fully implemented workflows are in separate files:
 * - workflow-init-new.ts
 * - brainstorming.ts
 * - techniques/*.ts
 */

import { db, agents, workflows, workflowSteps } from "@chiron/db";
import { eq } from "drizzle-orm";

// Agent name to workflow mapping for metadata
const AGENT_WORKFLOW_MAP: Record<string, string> = {
  // Analyst workflows
  brainstorming: "analyst",
  scamper: "analyst",
  "five-whys": "analyst",
  "six-thinking-hats": "analyst",
  "mind-mapping": "analyst",
  "what-if-scenarios": "analyst",
  "document-project": "analyst",
  "brainstorm-project": "analyst",
  research: "analyst",
  "product-brief": "analyst",

  // PM workflows
  prd: "pm",
  "create-epics-and-stories": "pm",
  "implementation-readiness": "pm",

  // Architect workflows
  "create-architecture": "architect",
  "test-design": "architect",

  // UX Designer workflows
  "create-ux-design": "ux-designer",

  // Scrum Master workflows
  "sprint-planning": "sm",
};

// Stub workflow definitions
const STUB_WORKFLOWS = [
  {
    name: "brainstorming",
    displayName: "Brainstorming",
    description:
      "Facilitate interactive brainstorming sessions using diverse creative techniques and ideation methods.",
    tags: { phase: 0, type: "ideation", track: "standalone", module: "bmm" },
    isStandalone: true,
  },
  {
    name: "scamper",
    displayName: "SCAMPER",
    description:
      "Creative ideation technique using Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse.",
    tags: { phase: 0, type: "technique", track: "standalone", module: "bmm" },
    isStandalone: true,
  },
  {
    name: "five-whys",
    displayName: "Five Whys",
    description:
      "Root cause analysis technique that asks 'why' five times to uncover underlying issues.",
    tags: { phase: 0, type: "technique", track: "standalone", module: "bmm" },
    isStandalone: true,
  },
  {
    name: "six-thinking-hats",
    displayName: "Six Thinking Hats",
    description:
      "Parallel thinking technique using six perspectives: facts, emotions, benefits, risks, creativity, and process.",
    tags: { phase: 0, type: "technique", track: "standalone", module: "bmm" },
    isStandalone: true,
  },
  {
    name: "mind-mapping",
    displayName: "Mind Mapping",
    description:
      "Visual brainstorming technique that organizes ideas around a central concept with branches.",
    tags: { phase: 0, type: "technique", track: "standalone", module: "bmm" },
    isStandalone: true,
  },
  {
    name: "what-if-scenarios",
    displayName: "What-If Scenarios",
    description:
      "Creative exploration technique that challenges constraints by asking 'what if' to generate innovative ideas.",
    tags: { phase: 0, type: "technique", track: "standalone", module: "bmm" },
    isStandalone: true,
  },

  // Phase 0 (Brownfield only)
  {
    name: "document-project",
    displayName: "Document Existing Project",
    description:
      "Analyze and document an existing codebase to create comprehensive reference documentation for AI-assisted development.",
    tags: { phase: 0, type: "documentation", track: "main", module: "bmm" },
  },

  // Phase 1 (Optional Discovery)
  {
    name: "brainstorm-project",
    displayName: "Brainstorm Project",
    description:
      "Facilitate interactive brainstorming sessions to explore project ideas and possibilities.",
    tags: { phase: 1, type: "discovery", track: "main", module: "bmm" },
  },
  {
    name: "research",
    displayName: "Research",
    description:
      "Conduct comprehensive research across multiple domains using current web data and verified sources.",
    tags: { phase: 1, type: "discovery", track: "main", module: "bmm" },
  },
  {
    name: "product-brief",
    displayName: "Create Product Brief",
    description:
      "Create comprehensive product briefs through collaborative step-by-step discovery.",
    tags: { phase: 1, type: "discovery", track: "main", module: "bmm" },
  },

  // Phase 2 (Solutioning)
  {
    name: "prd",
    displayName: "Create PRD",
    description:
      "Create a comprehensive Product Requirements Document through collaborative discovery.",
    tags: { phase: 2, type: "planning", track: "main", module: "bmm" },
  },
  {
    name: "create-ux-design",
    displayName: "Create UX Design",
    description:
      "Work with a UX Design expert to plan your application's UX patterns, look and feel.",
    tags: { phase: 2, type: "design", track: "main", module: "bmm" },
  },

  // Phase 3 (Architecture & Planning)
  {
    name: "create-architecture",
    displayName: "Create Architecture",
    description:
      "Collaborative architectural decision facilitation producing a decision-focused architecture document.",
    tags: { phase: 3, type: "architecture", track: "main", module: "bmm" },
  },
  {
    name: "create-epics-and-stories",
    displayName: "Create Epics & Stories",
    description:
      "Transform PRD requirements and Architecture decisions into comprehensive stories organized by user value.",
    tags: { phase: 3, type: "planning", track: "main", module: "bmm" },
  },
  {
    name: "test-design",
    displayName: "Test Design",
    description:
      "Dual-mode workflow for system-level testability review or epic-level test planning.",
    tags: { phase: 3, type: "testing", track: "optional", module: "bmm" },
  },
  {
    name: "implementation-readiness",
    displayName: "Implementation Readiness Check",
    description:
      "Critical validation that assesses PRD, Architecture, and Epics for completeness before implementation.",
    tags: { phase: 3, type: "validation", track: "main", module: "bmm" },
  },

  // Phase 4 (Implementation)
  {
    name: "sprint-planning",
    displayName: "Sprint Planning",
    description: "Generate and manage the sprint status tracking file for implementation phase.",
    tags: { phase: 4, type: "implementation", track: "main", module: "bmm" },
  },
];

/**
 * Get agent ID by name
 */
async function getAgentId(agentName: string): Promise<string | null> {
  const agent = await db.query.agents.findFirst({
    where: eq(agents.name, agentName),
  });
  return agent?.id ?? null;
}

/**
 * Seed stub workflows
 */
export async function seedWorkflows(): Promise<void> {
  console.log("Seeding stub workflows...");

  for (const workflow of STUB_WORKFLOWS) {
    // Get the agent for this workflow
    const agentName = AGENT_WORKFLOW_MAP[workflow.name];
    const agentId = agentName ? await getAgentId(agentName) : null;

    // Check if workflow already exists
    const existing = await db.query.workflows.findFirst({
      where: eq(workflows.name, workflow.name),
    });

    if (existing) {
      console.log(`  ⏭️  Workflow "${workflow.name}" already exists, skipping`);
      continue;
    }

    // Insert workflow
    const [insertedWorkflow] = await db
      .insert(workflows)
      .values({
        name: workflow.name,
        displayName: workflow.displayName,
        description: workflow.description,
        tags: workflow.tags,
        metadata: {
          agentId,
          isStandalone: false,
          layoutType: "standard",
        },
      })
      .returning();

    if (!insertedWorkflow) {
      console.log(`  ❌ Failed to insert workflow "${workflow.name}"`);
      continue;
    }

    // Insert a single stub step
    await db.insert(workflowSteps).values({
      workflowId: insertedWorkflow.id,
      stepNumber: 1,
      name: "stub-placeholder",
      goal: `${workflow.displayName} - Implementation pending`,
      stepType: "display",
      config: {
        contentTemplate: `This workflow is a placeholder. Full implementation coming soon.\n\nDescription: ${workflow.description}`,
        outputType: "info",
      },
    });

    console.log(`  ✅ Created stub workflow: ${workflow.name}`);
  }

  console.log("Stub workflows seeding complete!");
}
