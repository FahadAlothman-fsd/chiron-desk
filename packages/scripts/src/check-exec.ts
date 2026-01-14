import { db, workflowExecutions, workflows } from "@chiron/db";
import { desc, eq, isNotNull } from "drizzle-orm";

async function check() {
  // Find child executions (Five Whys, etc.)
  const childExecs = await db
    .select({
      id: workflowExecutions.id,
      status: workflowExecutions.status,
      variables: workflowExecutions.variables,
      workflowName: workflows.name,
      parentExecutionId: workflowExecutions.parentExecutionId,
    })
    .from(workflowExecutions)
    .innerJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
    .where(isNotNull(workflowExecutions.parentExecutionId))
    .orderBy(desc(workflowExecutions.updatedAt))
    .limit(5);

  for (const exec of childExecs) {
    console.log("\n=== Child Execution:", exec.workflowName, "===");
    console.log("Status:", exec.status);
    const vars = exec.variables as Record<string, unknown>;
    console.log("Variable keys:", Object.keys(vars || {}));
    if (vars?.generated_ideas) {
      console.log("generated_ideas:", JSON.stringify(vars.generated_ideas, null, 2));
    }
    if (vars?.root_causes) {
      console.log("root_causes:", JSON.stringify(vars.root_causes, null, 2));
    }
  }

  // Also check parent execution
  const parentExec = await db
    .select({
      id: workflowExecutions.id,
      status: workflowExecutions.status,
      variables: workflowExecutions.variables,
      workflowName: workflows.name,
    })
    .from(workflowExecutions)
    .innerJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
    .where(eq(workflows.name, "brainstorming"))
    .orderBy(desc(workflowExecutions.updatedAt))
    .limit(1);

  if (parentExec[0]) {
    console.log("\n=== Parent Execution: Brainstorming ===");
    console.log("Status:", parentExec[0].status);
    const vars = parentExec[0].variables as Record<string, unknown>;
    console.log("Variable keys:", Object.keys(vars || {}));
    if (vars?.captured_ideas) {
      console.log("captured_ideas:", JSON.stringify(vars.captured_ideas, null, 2));
    }
    if (vars?._child_metadata) {
      console.log("_child_metadata:", JSON.stringify(vars._child_metadata, null, 2));
    }
  }
}

check()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
