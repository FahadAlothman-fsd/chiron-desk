import { db, workflowPaths, workflowPathWorkflows, workflows } from "@chiron/db";
import { eq } from "drizzle-orm";

const COMPLEXITY_TAGS = {
  "quick-flow": {
    name: "Quick Flow Track",
    value: "quick-flow",
    description:
      "Fast implementation track using tech-spec planning only. Best for bug fixes, small features, and changes with clear scope. Typical range: 1-15 stories.",
  },
  method: {
    name: "BMad Method Track",
    value: "method",
    description:
      "Full product planning track using PRD + Architecture + UX. Best for products, platforms, and complex features requiring system design. Typical range: 10-50+ stories.",
  },
  enterprise: {
    name: "Enterprise Method Track",
    value: "enterprise",
    description:
      "Extended enterprise planning track adding Security Architecture, DevOps Strategy, and Test Strategy. Best for enterprise requirements and compliance needs. Typical range: 30+ stories.",
  },
};

const FIELD_TYPE_TAGS = {
  greenfield: {
    name: "Greenfield",
    value: "greenfield",
    description: "Starting a new project from scratch with no existing codebase.",
  },
  brownfield: {
    name: "Brownfield",
    value: "brownfield",
    description: "Working with an existing codebase, adding features or refactoring.",
  },
};

const EDUCATION_TEXT: Record<string, string> = {
  "quick-flow-greenfield":
    "Best for: Small projects (1-2 weeks), clear requirements, single developer or tiny team. Skips formal architecture in favor of rapid iteration.",
  "quick-flow-brownfield":
    "Best for: Adding features to well-understood codebases, bug fixes, minor enhancements. Skips re-analysis of existing architecture.",
  "method-greenfield":
    "Best for: Medium projects (4-8 weeks), structured requirements, small team (2-4 developers). Includes tech-spec planning.",
  "method-brownfield":
    "Best for: Major feature additions, refactoring existing systems, technical debt resolution. Includes architecture updates.",
  "enterprise-greenfield":
    "Best for: Large projects (3+ months), formal governance requirements, multi-team coordination. Comprehensive documentation.",
  "enterprise-brownfield":
    "Best for: Large-scale refactoring, system modernization, legacy migration with multi-team coordination.",
};

const ESTIMATED_TIME: Record<string, string> = {
  "quick-flow": "1-2 weeks",
  method: "4-8 weeks",
  enterprise: "3-6 months",
};

const AGENT_SUPPORT: Record<string, string> = {
  "quick-flow": "PM, DEV",
  method: "PM, Architect, DEV, SM",
  enterprise: "Full agent suite",
};

interface PhaseWorkflow {
  workflowName: string;
  optional?: boolean;
}

interface PathDefinition {
  name: string;
  displayName: string;
  description: string;
  track: "quick-flow" | "method" | "enterprise";
  fieldType: "greenfield" | "brownfield";
  phases: PhaseWorkflow[][];
}

const PATH_DEFINITIONS: PathDefinition[] = [
  {
    name: "quick-flow-greenfield",
    displayName: "Quick Flow - Greenfield",
    description: "Fast-track for new small projects with clear scope.",
    track: "quick-flow",
    fieldType: "greenfield",
    phases: [
      [],
      [{ workflowName: "brainstorm-project", optional: true }],
      [{ workflowName: "prd" }],
      [],
      [{ workflowName: "sprint-planning" }],
    ],
  },
  {
    name: "quick-flow-brownfield",
    displayName: "Quick Flow - Brownfield",
    description: "Fast-track for adding features to existing codebases.",
    track: "quick-flow",
    fieldType: "brownfield",
    phases: [
      [{ workflowName: "document-project", optional: true }],
      [{ workflowName: "brainstorm-project", optional: true }],
      [{ workflowName: "prd" }],
      [],
      [{ workflowName: "sprint-planning" }],
    ],
  },
  {
    name: "method-greenfield",
    displayName: "Method BMAD - Greenfield",
    description: "Standard BMAD methodology for new projects starting from scratch.",
    track: "method",
    fieldType: "greenfield",
    phases: [
      [],
      [
        { workflowName: "brainstorm-project", optional: true },
        { workflowName: "research", optional: true },
        { workflowName: "product-brief", optional: true },
      ],
      [{ workflowName: "prd" }, { workflowName: "create-ux-design", optional: true }],
      [
        { workflowName: "create-architecture" },
        { workflowName: "create-epics-and-stories" },
        { workflowName: "test-design", optional: true },
        { workflowName: "implementation-readiness" },
      ],
      [{ workflowName: "sprint-planning" }],
    ],
  },
  {
    name: "method-brownfield",
    displayName: "Method BMAD - Brownfield",
    description: "BMAD methodology for existing projects requiring documentation first.",
    track: "method",
    fieldType: "brownfield",
    phases: [
      [{ workflowName: "document-project" }],
      [
        { workflowName: "brainstorm-project", optional: true },
        { workflowName: "research", optional: true },
        { workflowName: "product-brief", optional: true },
      ],
      [{ workflowName: "prd" }, { workflowName: "create-ux-design", optional: true }],
      [
        { workflowName: "create-architecture" },
        { workflowName: "create-epics-and-stories" },
        { workflowName: "test-design", optional: true },
        { workflowName: "implementation-readiness" },
      ],
      [{ workflowName: "sprint-planning" }],
    ],
  },
  {
    name: "enterprise-greenfield",
    displayName: "Enterprise BMAD - Greenfield",
    description: "Full BMAD methodology with all phases for enterprise-scale new projects.",
    track: "enterprise",
    fieldType: "greenfield",
    phases: [
      [],
      [
        { workflowName: "brainstorm-project", optional: true },
        { workflowName: "research", optional: true },
        { workflowName: "product-brief", optional: true },
      ],
      [{ workflowName: "prd" }, { workflowName: "create-ux-design", optional: true }],
      [
        { workflowName: "create-architecture" },
        { workflowName: "create-epics-and-stories" },
        { workflowName: "test-design", optional: true },
        { workflowName: "implementation-readiness" },
      ],
      [{ workflowName: "sprint-planning" }],
    ],
  },
  {
    name: "enterprise-brownfield",
    displayName: "Enterprise BMAD - Brownfield",
    description: "Full BMAD methodology for enterprise-scale existing projects.",
    track: "enterprise",
    fieldType: "brownfield",
    phases: [
      [{ workflowName: "document-project" }],
      [
        { workflowName: "brainstorm-project", optional: true },
        { workflowName: "research", optional: true },
        { workflowName: "product-brief", optional: true },
      ],
      [{ workflowName: "prd" }, { workflowName: "create-ux-design", optional: true }],
      [
        { workflowName: "create-architecture" },
        { workflowName: "create-epics-and-stories" },
        { workflowName: "test-design", optional: true },
        { workflowName: "implementation-readiness" },
      ],
      [{ workflowName: "sprint-planning" }],
    ],
  },
];

function buildTags(track: PathDefinition["track"], fieldType: PathDefinition["fieldType"]) {
  return {
    complexity: COMPLEXITY_TAGS[track],
    fieldType: FIELD_TYPE_TAGS[fieldType],
  };
}

function buildMetadata(track: PathDefinition["track"], name: string) {
  return {
    educationText: EDUCATION_TEXT[name] || "",
    estimatedTime: ESTIMATED_TIME[track],
    agentSupport: AGENT_SUPPORT[track],
  };
}

async function getWorkflowId(name: string): Promise<string | null> {
  const workflow = await db.query.workflows.findFirst({
    where: eq(workflows.name, name),
  });
  return workflow?.id ?? null;
}

export async function seedWorkflowPaths(): Promise<void> {
  console.log("Seeding workflow paths...");

  for (const path of PATH_DEFINITIONS) {
    const tags = buildTags(path.track, path.fieldType);
    const metadata = buildMetadata(path.track, path.name);

    const existing = await db.query.workflowPaths.findFirst({
      where: eq(workflowPaths.name, path.name),
    });

    let pathId: string;

    if (existing) {
      console.log(`  ⏭️  Path "${path.name}" exists, updating workflows...`);
      pathId = existing.id;

      await db
        .delete(workflowPathWorkflows)
        .where(eq(workflowPathWorkflows.workflowPathId, pathId));
    } else {
      const [inserted] = await db
        .insert(workflowPaths)
        .values({
          name: path.name,
          displayName: path.displayName,
          description: path.description,
          tags,
          metadata,
        })
        .returning();

      if (!inserted) {
        console.log(`  ❌ Failed to insert path "${path.name}"`);
        continue;
      }

      pathId = inserted.id;
      console.log(`  ✅ Created path: ${path.name}`);
    }

    let orderIndex = 0;
    for (let phaseNum = 0; phaseNum < path.phases.length; phaseNum++) {
      const phase = path.phases[phaseNum];
      if (!phase) continue;

      for (const wf of phase) {
        const workflowId = await getWorkflowId(wf.workflowName);

        if (!workflowId) {
          console.log(`    ⚠️  Workflow "${wf.workflowName}" not found, skipping`);
          continue;
        }

        await db.insert(workflowPathWorkflows).values({
          workflowPathId: pathId,
          workflowId,
          phase: phaseNum,
          sequenceOrder: orderIndex++,
          isOptional: wf.optional ?? false,
        });
      }
    }
  }

  console.log("Workflow paths seeding complete!");
}
