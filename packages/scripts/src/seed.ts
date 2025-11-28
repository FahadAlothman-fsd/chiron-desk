import { resolve } from "node:path";
import { config } from "dotenv";

// Load environment variables FIRST
config({ path: resolve(process.cwd(), "../../apps/server/.env") });

async function main() {
	const shouldReset = process.argv.includes("--reset");

	if (shouldReset) {
		console.log("🔄 Resetting database...");
	} else {
		console.log("🌱 Starting database seeding...");
	}

	// Lazy import after env is loaded
	const { db } = await import("@chiron/db");
	const { seedWorkflowPaths } = await import("./seeds/workflow-paths");
	const { seedAgents } = await import("./seeds/agents");
	const { seedWorkflows, seedBrainstormingWorkflow } = await import(
		"./seeds/workflows"
	);
	const { seedWorkflowInitNew } = await import("./seeds/workflow-init-new");
	const { seedUsers } = await import("./seeds/users");

	try {
		if (shouldReset) {
			// Import schema and reset function
			const { reset } = await import("drizzle-seed");
			const schema = await import("@chiron/db");

			console.log("\n🗑️  Clearing all tables...");
			await reset(db, schema);
			console.log("✅ Database reset complete");
		}

		// Seed agents
		console.log("\n🤖 Seeding agents...");
		await seedAgents();
		console.log("✅ Agents seeded");

		// Seed workflows (Story 1.2)
		console.log("\n🔄 Seeding workflows...");
		await seedWorkflows();
		console.log("✅ Workflows seeded");

		// Story 2.1: Seed brainstorming workflow for Phase 0 Dashboard
		console.log("\n🧠 Seeding brainstorming workflow...");
		await seedBrainstormingWorkflow();
		console.log("✅ Brainstorming workflow seeded");

		// Seed workflow paths - MUST run after workflows are seeded!
		console.log("\n📍 Seeding workflow paths...");
		await seedWorkflowPaths();
		console.log("✅ Workflow paths seeded");

		// Seed workflow-init-new (Story 1.2 - AC#3)
		console.log("\n📋 Seeding workflow-init-new...");
		await seedWorkflowInitNew();
		console.log("✅ workflow-init-new seeded");

		// Seed users (Story 1.2)
		console.log("\n👤 Seeding test user...");
		await seedUsers();
		console.log("✅ Test user seeded");

		// TODO: Seed workflow steps (Story 1.5 - workflow execution engine)

		console.log("\n✅ Database seeding complete!");
		process.exit(0);
	} catch (error) {
		console.error("❌ Error seeding database:", error);
		process.exit(1);
	}
}

main();
