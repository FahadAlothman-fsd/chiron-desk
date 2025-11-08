import "../../test-setup"; // Load environment variables
import { describe, expect, test, beforeAll } from "bun:test";
import { db, workflowPaths } from "@chiron/db";
import { seedWorkflowPaths } from "./workflow-paths";
import { sql } from "drizzle-orm";

describe("Workflow Paths Seeding", () => {
	test("seedWorkflowPaths() ensures 6 BMM paths exist", async () => {
		await seedWorkflowPaths();

		const allPaths = await db.select().from(workflowPaths);

		// Verify all 6 BMM paths exist
		const requiredPaths = [
			"quick-flow-greenfield",
			"quick-flow-brownfield",
			"method-greenfield",
			"method-brownfield",
			"enterprise-greenfield",
			"enterprise-brownfield",
		];

		const pathNames = allPaths.map((p) => p.name);

		for (const name of requiredPaths) {
			expect(pathNames).toContain(name);
		}

		expect(allPaths.length).toBeGreaterThanOrEqual(6);
	});

	test("All paths have tags JSONB", async () => {
		const allPaths = await db.select().from(workflowPaths);

		for (const path of allPaths) {
			expect(path.tags).toBeTruthy();
			expect(typeof path.tags).toBe("object");
		}
	});

	test("Tags contain track and fieldType", async () => {
		const allPaths = await db.select().from(workflowPaths);

		for (const path of allPaths) {
			expect(path.tags).toHaveProperty("track");
			expect(path.tags).toHaveProperty("fieldType");
			expect(path.tags).toHaveProperty("complexity");
		}
	});

	test("sequenceOrder is sequential (1-6)", async () => {
		const allPaths = await db
			.select()
			.from(workflowPaths)
			.orderBy(workflowPaths.sequenceOrder);

		const orders = allPaths.map((p) => p.sequenceOrder);
		expect(orders).toEqual([1, 2, 3, 4, 5, 6]);
	});

	test("Query by fieldType: greenfield returns 3 paths", async () => {
		const greenfieldPaths = await db
			.select()
			.from(workflowPaths)
			.where(sql`${workflowPaths.tags}->>'fieldType' = 'greenfield'`);

		expect(greenfieldPaths.length).toBe(3);
	});

	test("Query by track: quick-flow returns 2 paths", async () => {
		const quickFlowPaths = await db
			.select()
			.from(workflowPaths)
			.where(sql`${workflowPaths.tags}->>'track' = 'quick-flow'`);

		expect(quickFlowPaths.length).toBe(2);
	});

	test("Running twice doesn't create duplicates", async () => {
		// Get count before
		const countBefore = (await db.select().from(workflowPaths)).length;

		// Run seed again
		await seedWorkflowPaths();

		// Count should remain the same
		const countAfter = (await db.select().from(workflowPaths)).length;
		expect(countAfter).toBe(countBefore);
	});
});
