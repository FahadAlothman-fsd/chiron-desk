import "../../../test-setup";
import { describe, it, expect, beforeEach } from "bun:test";
import { AceOptimizer } from "./ace-optimizer";
import { db } from "@chiron/db";
import { acePlaybooks, agents } from "@chiron/db";

describe("ACE Optimizer", () => {
	let optimizer: AceOptimizer;
	let testAgentId: string;

	beforeEach(async () => {
		optimizer = new AceOptimizer();

		// Create test agent
		const [agent] = await db
			.insert(agents)
			.values({
				name: "test-agent-ace",
				displayName: "Test Agent ACE",
				description: "Test agent for ACE optimizer tests",
				role: "tester",
				llmProvider: "anthropic",
				llmModel: "claude-3-5-sonnet-20241022",
			})
			.returning();

		testAgentId = agent.id;
	});

	describe("loadPlaybook", () => {
		it("should return null for non-existent playbook", async () => {
			const playbook = await optimizer.loadPlaybook(testAgentId, "global");
			expect(playbook).toBeNull();
		});

		it("should return existing playbook", async () => {
			// Insert test playbook
			await db.insert(acePlaybooks).values({
				agentId: testAgentId,
				scope: "global",
				playbook: {
					sections: {
						"Test Section": { bullets: ["Test bullet 1", "Test bullet 2"] },
					},
				},
			});

			const playbook = await optimizer.loadPlaybook(testAgentId, "global");
			expect(playbook).toBeDefined();
			expect(playbook?.sections["Test Section"].bullets).toHaveLength(2);
		});
	});

	describe("applyOnlineUpdate", () => {
		it("should create new playbook if none exists", async () => {
			const playbook = await optimizer.applyOnlineUpdate(
				testAgentId,
				"Summary Generation",
				"Please include more detail about the timeline",
				{ conversation: "test input" },
				{ summary: "test prediction" },
			);

			expect(playbook).toBeDefined();
			expect(playbook.sections["Summary Generation"]).toBeDefined();
			expect(
				playbook.sections["Summary Generation"].bullets.length,
			).toBeGreaterThan(0);
		});

		it("should add bullet to existing section", async () => {
			// Create initial playbook
			await db.insert(acePlaybooks).values({
				agentId: testAgentId,
				scope: "global",
				playbook: {
					sections: {
						"Summary Generation": { bullets: ["Existing bullet"] },
					},
				},
			});

			const playbook = await optimizer.applyOnlineUpdate(
				testAgentId,
				"Summary Generation",
				"New feedback",
				{},
				{},
			);

			expect(playbook.sections["Summary Generation"].bullets).toHaveLength(2);
		});

		it("should create new section if doesn't exist", async () => {
			// Create initial playbook with different section
			await db.insert(acePlaybooks).values({
				agentId: testAgentId,
				scope: "global",
				playbook: {
					sections: {
						"Other Section": { bullets: ["Existing bullet"] },
					},
				},
			});

			const playbook = await optimizer.applyOnlineUpdate(
				testAgentId,
				"New Section",
				"New feedback",
				{},
				{},
			);

			expect(playbook.sections["New Section"]).toBeDefined();
			expect(playbook.sections["Other Section"]).toBeDefined();
		});
	});

	describe("formatPlaybookForPrompt", () => {
		it("should return empty string for empty playbook", () => {
			const formatted = optimizer.formatPlaybookForPrompt({ sections: {} });
			expect(formatted).toBe("");
		});

		it("should format playbook as markdown", () => {
			const formatted = optimizer.formatPlaybookForPrompt({
				sections: {
					"Summary Generation": {
						bullets: [
							"• Include timeline details",
							"• Mention key stakeholders",
						],
					},
					"Complexity Classification": {
						bullets: ["• Consider team size", "• Factor in compliance needs"],
					},
				},
			});

			expect(formatted).toContain("🎓 LEARNED PATTERNS");
			expect(formatted).toContain("### Summary Generation");
			expect(formatted).toContain("• Include timeline details");
			expect(formatted).toContain("### Complexity Classification");
		});
	});

	describe("savePlaybook", () => {
		it("should increment version on update", async () => {
			// Save initial playbook
			await optimizer.savePlaybook(testAgentId, { sections: {} }, "global");

			// Update playbook
			await optimizer.savePlaybook(
				testAgentId,
				{ sections: { Test: { bullets: ["New"] } } },
				"global",
			);

			const info = await optimizer.getPlaybookInfo(testAgentId, "global");
			expect(info?.version).toBe(2);
			expect(info?.totalUpdates).toBe(2);
		});
	});

	describe("getPlaybookInfo", () => {
		it("should return null for non-existent playbook", async () => {
			const info = await optimizer.getPlaybookInfo(testAgentId, "global");
			expect(info).toBeNull();
		});

		it("should return version and totalUpdates", async () => {
			await db.insert(acePlaybooks).values({
				agentId: testAgentId,
				scope: "global",
				playbook: { sections: {} },
				version: 3,
				totalUpdates: 5,
			});

			const info = await optimizer.getPlaybookInfo(testAgentId, "global");
			expect(info?.version).toBe(3);
			expect(info?.totalUpdates).toBe(5);
		});
	});
});
