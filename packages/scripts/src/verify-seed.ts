import { resolve } from "node:path";
import { config } from "dotenv";

// Load environment variables FIRST
config({ path: resolve(process.cwd(), "../../apps/server/.env") });

async function verify() {
	const { db } = await import("@chiron/db");

	try {
		// Count agents
		const agents = await db.query.agents.findMany();
		console.log(`\n🤖 Agents: ${agents.length}`);
		agents.forEach((agent) =>
			console.log(`  - ${agent.displayName} (${agent.name})`),
		);

		// Count workflow paths
		const workflowPaths = await db.query.workflowPaths.findMany();
		console.log(`\n📍 Workflow Paths: ${workflowPaths.length}`);
		workflowPaths.forEach((path) => console.log(`  - ${path.name}`));

		// Count workflows
		const workflows = await db.query.workflows.findMany();
		console.log(`\n🔄 Workflows: ${workflows.length}`);
		workflows.forEach((wf) => console.log(`  - ${wf.name} (${wf.pattern})`));

		console.log("\n✅ Verification complete!");
		process.exit(0);
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

verify();
