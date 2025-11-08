import "../../test-setup"; // Load environment variables
import { describe, expect, test, beforeAll } from "bun:test";
import { db, agents } from "@chiron/db";
import { seedAgents } from "./agents";
import { eq } from "drizzle-orm";

describe("Agent Seeding", () => {
	test("seedAgents() ensures 6 agents exist", async () => {
		await seedAgents();

		const allAgents = await db.select().from(agents);
		expect(allAgents.length).toBeGreaterThanOrEqual(6);

		// Verify all 6 core agents exist
		const coreAgentNames = [
			"analyst",
			"pm",
			"architect",
			"dev",
			"sm",
			"ux-designer",
		];
		const agentNames = allAgents.map((a) => a.name);

		for (const name of coreAgentNames) {
			expect(agentNames).toContain(name);
		}
	});

	test("All agents have required fields", async () => {
		const allAgents = await db.select().from(agents);

		for (const agent of allAgents) {
			expect(agent.name).toBeTruthy();
			expect(agent.displayName).toBeTruthy();
			expect(agent.description).toBeTruthy();
			expect(agent.role).toBeTruthy();
			expect(agent.llmProvider).toBeTruthy();
			expect(agent.llmModel).toBeTruthy();
			expect(agent.llmTemperature).toBeTruthy();
		}
	});

	test("All agents are active", async () => {
		const allAgents = await db.select().from(agents);

		for (const agent of allAgents) {
			expect(agent.active).toBe(true);
		}
	});

	test("Running seedAgents() twice doesn't create duplicates", async () => {
		// Get count before
		const countBefore = (await db.select().from(agents)).length;

		// Run seed again
		await seedAgents();

		// Count should remain the same
		const countAfter = (await db.select().from(agents)).length;
		expect(countAfter).toBe(countBefore);
	});

	test("PM agent has anthropic provider", async () => {
		const pmAgent = await db.query.agents.findFirst({
			where: eq(agents.name, "pm"),
		});

		expect(pmAgent).toBeTruthy();
		expect(pmAgent?.llmProvider).toBe("anthropic");
	});

	test("DEV agent exists with correct role", async () => {
		const devAgent = await db.query.agents.findFirst({
			where: eq(agents.name, "dev"),
		});

		expect(devAgent).toBeTruthy();
		expect(devAgent?.role).toBe("developer");
	});
});
