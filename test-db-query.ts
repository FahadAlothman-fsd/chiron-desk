import { db, workflowPaths } from "@chiron/db";
import { eq, sql } from "drizzle-orm";

const results = await db
	.select()
	.from(workflowPaths)
	.where(sql`tags->>'fieldType' = 'greenfield'`)
	.limit(3);

console.log("=== Greenfield Workflow Paths ===");
for (const row of results) {
	console.log(`\nName: ${row.name}`);
	console.log(`Display Name: ${row.displayName}`);
	console.log("Tags:", JSON.stringify(row.tags, null, 2));
}

process.exit(0);
