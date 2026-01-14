import { db, executionVariables } from "@chiron/db";
import { desc, eq } from "drizzle-orm";

async function debugChildMetadata() {
  console.log("🔍 Querying _child_metadata from execution_variables...\n");

  const results = await db
    .select()
    .from(executionVariables)
    .where(eq(executionVariables.variableName, "_child_metadata"))
    .orderBy(desc(executionVariables.createdAt))
    .limit(3);

  if (results.length === 0) {
    console.log("❌ No _child_metadata found in execution_variables");
    console.log("\n🔍 Let's check what variables exist for recent executions...");

    const recentVars = await db
      .select()
      .from(executionVariables)
      .orderBy(desc(executionVariables.createdAt))
      .limit(10);

    console.log("\nRecent execution variables:");
    for (const v of recentVars) {
      console.log(`- ${v.variableName} (execution: ${v.executionId})`);
      console.log(`  Value: ${JSON.stringify(v.variableValue).substring(0, 150)}`);
    }
  } else {
    console.log(`✅ Found ${results.length} _child_metadata records:\n`);

    for (const record of results) {
      console.log(`Execution ID: ${record.executionId}`);
      console.log(`Created: ${record.createdAt}`);
      console.log("Value:");
      console.log(JSON.stringify(record.variableValue, null, 2));
      console.log(`\n${"=".repeat(80)}\n`);
    }
  }

  process.exit(0);
}

debugChildMetadata();
