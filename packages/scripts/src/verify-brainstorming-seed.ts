#!/usr/bin/env bun
import { db } from "@chiron/db";

async function verifyBrainstormingSeed() {
  console.log("🔍 Verifying Brainstorming Workflow Seed...\n");

  // Query brainstorming workflow
  const workflow = await db.query.workflows.findFirst({
    where: (workflows, { eq }) => eq(workflows.name, "brainstorming"),
  });

  if (!workflow) {
    console.log("❌ Brainstorming workflow not found!");
    process.exit(1);
  }

  console.log("✅ Brainstorming Workflow Found:");
  console.log(`   ID: ${workflow.id}`);
  console.log(`   Name: ${workflow.name}`);
  console.log(`   Display Name: ${workflow.displayName}`);
  console.log(`   Description: ${workflow.description}`);
  console.log("   Tags:", JSON.stringify(workflow.tags, null, 2));
  console.log("   Metadata:", JSON.stringify(workflow.metadata, null, 2));
  console.log();

  // Query workflow steps
  const steps = await db.query.workflowSteps.findMany({
    where: (steps, { eq }) => eq(steps.workflowId, workflow.id),
  });

  console.log(`📋 Workflow Steps: ${steps.length} found\n`);

  for (const step of steps) {
    console.log(`Step ${step.stepNumber}:`);
    console.log(`   Goal: ${step.goal}`);
    console.log(`   Step Type: ${step.stepType}`);
    console.log(`   Next Step: ${step.nextStepNumber ?? "None (end)"}`);

    if (step.stepType === "ask-user-chat") {
      const config = step.config as any;
      console.log(`   Agent ID: ${config.agentId}`);
      console.log(`   Initial Message: ${config.initialMessage?.substring(0, 80)}...`);
      console.log(`   Tools: ${config.tools?.length ?? 0}`);

      if (config.tools) {
        for (const tool of config.tools) {
          console.log(`      - ${tool.name} (${tool.toolType})`);
          if (tool.targetVariable) {
            console.log(`        → Target Variable: ${tool.targetVariable}`);
          }
          if (tool.requiredVariables?.length > 0) {
            console.log(`        → Required Variables: ${tool.requiredVariables.join(", ")}`);
          }
          if (tool.valueSchema) {
            console.log(`        → Value Type: ${tool.valueSchema.type}`);
          }
        }
      }

      console.log(`   Completion Condition: ${config.completionCondition?.type}`);
      if (config.completionCondition?.requiredVariables) {
        console.log(
          `      → Required Variables: ${config.completionCondition.requiredVariables.join(", ")}`,
        );
      }

      console.log("   Output Variables:", config.outputVariables);
    }

    console.log();
  }

  console.log("✅ Verification Complete!");
  process.exit(0);
}

verifyBrainstormingSeed().catch((error) => {
  console.error("❌ Error verifying seed:", error);
  process.exit(1);
});
