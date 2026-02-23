import { db, workflowSteps, workflows } from "@chiron/db";
import { and, eq } from "drizzle-orm";
import { loadBmadWorkflowDefinitionsSeed } from "./load-seed-json";

function makeTags(moduleName: string): Record<string, string> {
  return {
    source: "bmad",
    module: moduleName,
    type: "method",
    track: "main",
    phase: "mapped",
  };
}

function makeStepConfig(step: {
  id: string;
  type: "form" | "agent" | "action" | "invoke" | "branch" | "display";
}): Record<string, unknown> {
  if (step.type === "display") {
    return {
      contentTemplate:
        "BMAD mapped workflow placeholder. Full runtime config stored in workflows.metadata.bmad.definitionJson.",
    };
  }

  if (step.type === "form") {
    return {
      type: "form",
      question: `Complete step: ${step.id}`,
      responseType: "text",
      responseVariable: `${step.id.replace(/\./g, "_")}_response`,
      validation: { required: false },
    };
  }

  if (step.type === "agent") {
    return {
      type: "agent",
      agentKind: "chiron",
      // Placeholder UUID so schema accepts row; authoritative agent wiring is in metadata
      agentId: "00000000-0000-0000-0000-000000000000",
      initialMessage: `Mapped agent step: ${step.id}`,
      completionCondition: { type: "user-satisfied" },
      tools: [],
      outputVariables: {},
    };
  }

  if (step.type === "action") {
    return {
      actions: [],
      executionMode: "sequential",
      requiresUserConfirmation: false,
    };
  }

  if (step.type === "invoke") {
    return {
      workflowsToInvoke: "{{fanout.items}}",
      variableMapping: {},
      expectedOutputVariable: "result",
      aggregateInto: "fanout.outputs",
      completionCondition: { type: "all-complete" },
    };
  }

  return {
    contentTemplate: `Branch step mapped: ${step.id}`,
  };
}

export async function seedBmadWorkflowDefinitions(): Promise<void> {
  const seed = loadBmadWorkflowDefinitionsSeed();
  console.log(`Seeding BMAD workflow definitions (${seed.workflows.length})...`);

  for (const workflow of seed.workflows) {
    const [upserted] = await db
      .insert(workflows)
      .values({
        name: workflow.key,
        displayName: workflow.displayName,
        description: `${workflow.displayName} (BMAD mapped workflow definition)`,
        tags: makeTags(workflow.module),
        metadata: {
          source: "bmad-seed-v1",
          methodologyVersionKey: seed.methodologyVersionKey,
          module: workflow.module,
          ownerWorkUnitRef: workflow.ownerWorkUnitRef,
          ownerWorkUnitType: workflow.ownerWorkUnitType,
          transition: workflow.transition,
          promptCatalogRef: seed.promptCatalogRef,
          stepTemplateRef: seed.stepTemplateRef,
          bmad: {
            enabled: workflow.enabled,
            definitionJson: workflow.definitionJson,
          },
        },
      })
      .onConflictDoUpdate({
        target: workflows.name,
        set: {
          displayName: workflow.displayName,
          description: `${workflow.displayName} (BMAD mapped workflow definition)`,
          tags: makeTags(workflow.module),
          metadata: {
            source: "bmad-seed-v1",
            methodologyVersionKey: seed.methodologyVersionKey,
            module: workflow.module,
            ownerWorkUnitRef: workflow.ownerWorkUnitRef,
            ownerWorkUnitType: workflow.ownerWorkUnitType,
            transition: workflow.transition,
            promptCatalogRef: seed.promptCatalogRef,
            stepTemplateRef: seed.stepTemplateRef,
            bmad: {
              enabled: workflow.enabled,
              definitionJson: workflow.definitionJson,
            },
          },
        },
      })
      .returning();

    if (!upserted) {
      console.log(`  ⚠️  Unable to upsert workflow: ${workflow.key}`);
      continue;
    }

    const existingStep1 = await db.query.workflowSteps.findFirst({
      where: and(eq(workflowSteps.workflowId, upserted.id), eq(workflowSteps.stepNumber, 1)),
    });

    if (existingStep1) {
      console.log(`  ↻ Updated metadata for workflow: ${workflow.key}`);
      continue;
    }

    const firstStep = workflow.definitionJson.steps[0];

    await db.insert(workflowSteps).values({
      workflowId: upserted.id,
      stepNumber: 1,
      goal: firstStep ? `Mapped step: ${firstStep.id}` : "Mapped BMAD workflow placeholder",
      stepType: firstStep?.type ?? "display",
      config: (firstStep ? makeStepConfig(firstStep) : { contentTemplate: "Mapped workflow placeholder" }) as any,
      nextStepNumber: workflow.definitionJson.steps.length > 1 ? 2 : null,
    });

    console.log(`  ✓ Seeded workflow shell: ${workflow.key}`);
  }

  console.log("BMAD workflow definitions seed complete");
}
