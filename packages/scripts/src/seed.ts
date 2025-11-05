import { config } from "dotenv";
import { resolve } from "node:path";

// Load environment variables FIRST
config({ path: resolve(process.cwd(), "../../apps/server/.env") });

async function main() {
	console.log("🌱 Starting database seeding...");

	// Lazy import after env is loaded
	const { db } = await import("@chiron/db");
	const { seedWorkflowPaths } = await import("./seeds/workflow-paths");
	const { seedAgents } = await import("./seeds/agents");

	try {
		// Seed workflow paths
		console.log("\n📍 Seeding workflow paths...");
		await seedWorkflowPaths();
		console.log("✅ Workflow paths seeded");

		// Seed agents
		console.log("\n🤖 Seeding agents...");
		await seedAgents();
		console.log("✅ Agents seeded");

		// TODO: Seed workflows and workflow steps (Story 1.2 continuation)

		console.log("\n✅ Database seeding complete!");
		process.exit(0);
	} catch (error) {
		console.error("❌ Error seeding database:", error);
		process.exit(1);
	}
}

main();
