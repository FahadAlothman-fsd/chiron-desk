import "../../test-setup"; // Load environment variables
import { describe, expect, test, beforeAll } from "bun:test";
import { db, workflows, agents } from "@chiron/db";
import { seedAgents } from "./agents";
import { seedWorkflowInitNew } from "./workflow-init-new";
import { eq } from "drizzle-orm";

describe("Workflow-Init-New Seeding", () => {
	beforeAll(async () => {
		// Ensure agents are seeded (FK dependency)
		await seedAgents();
	});

	test("seedWorkflowInitNew() creates workflow", async () => {
		await seedWorkflowInitNew();

		const workflow = await db.query.workflows.findFirst({
			where: eq(workflows.name, "workflow-init-new"),
		});

		expect(workflow).toBeTruthy();
		expect(workflow?.displayName).toBe("Initialize New Project");
	});

	test("Workflow has PM agent assigned", async () => {
		const workflow = await db.query.workflows.findFirst({
			where: eq(workflows.name, "workflow-init-new"),
		});

		expect(workflow?.agentId).toBeTruthy();

		// Verify the agent is PM
		const pmAgent = await db.query.agents.findFirst({
			where: eq(agents.name, "pm"),
		});

		expect(workflow?.agentId).toBe(pmAgent?.id);
	});

	test("initializerType = 'new-project'", async () => {
		const workflow = await db.query.workflows.findFirst({
			where: eq(workflows.name, "workflow-init-new"),
		});

		expect(workflow?.initializerType).toBe("new-project");
	});

	test("isStandalone = true", async () => {
		const workflow = await db.query.workflows.findFirst({
			where: eq(workflows.name, "workflow-init-new"),
		});

		expect(workflow?.isStandalone).toBe(true);
	});

	test("requiresProjectContext = false", async () => {
		const workflow = await db.query.workflows.findFirst({
			where: eq(workflows.name, "workflow-init-new"),
		});

		expect(workflow?.requiresProjectContext).toBe(false);
	});

	test("Running twice doesn't create duplicates", async () => {
		// Get workflows with this name before
		const before = await db
			.select()
			.from(workflows)
			.where(eq(workflows.name, "workflow-init-new"));

		const countBefore = before.length;

		// Run seed again
		await seedWorkflowInitNew();

		// Count should remain the same
		const after = await db
			.select()
			.from(workflows)
			.where(eq(workflows.name, "workflow-init-new"));

		expect(after.length).toBe(countBefore);
		expect(after.length).toBe(1);
	});
});
