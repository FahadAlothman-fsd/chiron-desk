import { db, workflows } from "@chiron/db";
import { eq } from "drizzle-orm";
import { loadBmadTransitionAllowedSeed } from "./load-seed-json";

type WorkflowMetadata = Record<string, unknown>;

export async function seedBmadTransitionAllowedWorkflows(): Promise<void> {
  const seed = loadBmadTransitionAllowedSeed();
  console.log(`Seeding BMAD transition allowed-workflow mappings (${seed.bindings.length})...`);

  const byWorkflow = new Map<
    string,
    Array<{
      workUnitRef: string;
      workUnitType: string;
      fromState: string;
      toState: string;
      priority: number | null;
      enabled: boolean;
      bindingDefaultsJson?: Record<string, unknown>;
    }>
  >();

  for (const binding of seed.bindings) {
    for (const allowed of binding.allowed) {
      const list = byWorkflow.get(allowed.workflowKey) ?? [];
      list.push({
        workUnitRef: binding.workUnitRef,
        workUnitType: binding.workUnitType,
        fromState: binding.fromState,
        toState: binding.toState,
        priority: allowed.priority,
        enabled: allowed.enabled,
        bindingDefaultsJson: allowed.bindingDefaultsJson,
      });
      byWorkflow.set(allowed.workflowKey, list);
    }
  }

  for (const [workflowKey, transitions] of byWorkflow) {
    const existing = await db.query.workflows.findFirst({
      where: eq(workflows.name, workflowKey),
    });

    if (!existing) {
      console.log(`  ⚠️  Workflow not found for transition mapping: ${workflowKey}`);
      continue;
    }

    const previous = (existing.metadata ?? {}) as WorkflowMetadata;

    await db
      .update(workflows)
      .set({
        metadata: {
          ...previous,
          bmad: {
            ...(typeof previous.bmad === "object" && previous.bmad !== null ? (previous.bmad as Record<string, unknown>) : {}),
            transitionAllowedMappings: transitions,
          },
        },
      })
      .where(eq(workflows.id, existing.id));

    console.log(`  ✓ Attached transition mappings to workflow: ${workflowKey}`);
  }

  console.log("BMAD transition mapping seed complete");
}
