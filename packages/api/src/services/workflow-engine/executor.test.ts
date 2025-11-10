import "../../../../db/test-setup";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
	db,
	eq,
	workflowExecutions,
	workflowSteps,
	workflows,
} from "@chiron/db";
import { executeWorkflow } from "./executor";
import { stepRegistry } from "./step-registry";

describe("Workflow Executor", () => {
	let testWorkflowId: string;
	const testUserId = "test-user-123";

	beforeEach(async () => {
		// Create a test workflow
		const [workflow] = await db
			.insert(workflows)
			.values({
				name: "test-executor-workflow",
				displayName: "Test Executor Workflow",
				description: "Test workflow for executor",
			})
			.returning();

		testWorkflowId = workflow.id;
	});

	afterEach(async () => {
		// Clean up test data
		await db.delete(workflows).where(eq(workflows.id, testWorkflowId));
	});

	it("should execute empty workflow (0 steps) successfully", async () => {
		const executionId = await executeWorkflow({
			workflowId: testWorkflowId,
			userId: testUserId,
		});

		// Check execution record
		const [execution] = await db
			.select()
			.from(workflowExecutions)
			.where(eq(workflowExecutions.id, executionId))
			.limit(1);

		expect(execution).toBeDefined();
		expect(execution.status).toBe("completed");
		expect(execution.workflowId).toBe(testWorkflowId);
	});

	it("should execute workflow with auto-advancing steps", async () => {
		// Create workflow with 3 display-output steps (auto-advance)
		await db.insert(workflowSteps).values([
			{
				workflowId: testWorkflowId,
				stepNumber: 1,
				goal: "Step 1",
				stepType: "display-output",
				config: { outputTemplate: "Step 1", outputType: "info" },
				nextStepNumber: 2,
			},
			{
				workflowId: testWorkflowId,
				stepNumber: 2,
				goal: "Step 2",
				stepType: "display-output",
				config: { outputTemplate: "Step 2", outputType: "info" },
				nextStepNumber: 3,
			},
			{
				workflowId: testWorkflowId,
				stepNumber: 3,
				goal: "Step 3",
				stepType: "display-output",
				config: { outputTemplate: "Step 3", outputType: "info" },
				nextStepNumber: null,
			},
		]);

		const executionId = await executeWorkflow({
			workflowId: testWorkflowId,
			userId: testUserId,
		});

		// Check execution completed
		const [execution] = await db
			.select()
			.from(workflowExecutions)
			.where(eq(workflowExecutions.id, executionId))
			.limit(1);

		expect(execution.status).toBe("completed");

		// Check all steps executed
		const executedSteps = execution.executedSteps as Record<number, any>;
		expect(Object.keys(executedSteps)).toHaveLength(3);
		expect(executedSteps[1].status).toBe("completed");
		expect(executedSteps[2].status).toBe("completed");
		expect(executedSteps[3].status).toBe("completed");
	});

	it("should execute workflow with multiple steps and track state", async () => {
		// Create workflow with 5 steps to test state tracking
		await db.insert(workflowSteps).values([
			{
				workflowId: testWorkflowId,
				stepNumber: 1,
				goal: "Step 1",
				stepType: "display-output",
				config: { outputTemplate: "Step 1", outputType: "info" },
				nextStepNumber: 2,
			},
			{
				workflowId: testWorkflowId,
				stepNumber: 2,
				goal: "Step 2",
				stepType: "display-output",
				config: { outputTemplate: "Step 2", outputType: "info" },
				nextStepNumber: 3,
			},
			{
				workflowId: testWorkflowId,
				stepNumber: 3,
				goal: "Step 3",
				stepType: "llm-generate",
				config: {
					promptTemplate: "Generate content",
					outputSchema: "{}",
					streaming: false,
					storeAs: "generated",
				},
				nextStepNumber: 4,
			},
			{
				workflowId: testWorkflowId,
				stepNumber: 4,
				goal: "Step 4",
				stepType: "execute-action",
				config: { description: "Execute action" },
				nextStepNumber: 5,
			},
			{
				workflowId: testWorkflowId,
				stepNumber: 5,
				goal: "Step 5",
				stepType: "display-output",
				config: { outputTemplate: "Complete", outputType: "success" },
				nextStepNumber: null,
			},
		]);

		const executionId = await executeWorkflow({
			workflowId: testWorkflowId,
			userId: testUserId,
		});

		// Check execution completed
		const [execution] = await db
			.select()
			.from(workflowExecutions)
			.where(eq(workflowExecutions.id, executionId))
			.limit(1);

		expect(execution.status).toBe("completed");

		// Check all steps executed
		const executedSteps = execution.executedSteps as Record<number, any>;
		expect(Object.keys(executedSteps)).toHaveLength(5);

		// Verify step metadata stored correctly
		for (let i = 1; i <= 5; i++) {
			expect(executedSteps[i]).toBeDefined();
			expect(executedSteps[i].status).toBe("completed");
			expect(executedSteps[i].stepId).toBeDefined(); // UUID reference
			expect(executedSteps[i].completedAt).toBeDefined();
		}
	});

	it("should respect execution limit with branching workflow", async () => {
		// Create workflow with branch that could loop (but has branch step, so warned not blocked)
		await db.insert(workflowSteps).values([
			{
				workflowId: testWorkflowId,
				stepNumber: 1,
				goal: "Step 1",
				stepType: "ask-user",
				config: {
					question: "Continue?",
					inputType: "boolean",
					storeAs: "continue",
				},
				nextStepNumber: 2,
			},
			{
				workflowId: testWorkflowId,
				stepNumber: 2,
				goal: "Branch",
				stepType: "branch",
				config: {
					conditionType: "boolean",
					evaluateVariable: "continue",
				},
				nextStepNumber: 1, // Potential cycle (but has branch, so allowed)
			},
		]);

		// This will trigger execution limit if branch always loops back
		await expect(
			executeWorkflow({
				workflowId: testWorkflowId,
				userId: testUserId,
			}),
		).rejects.toThrow("Workflow execution limit reached");
	});

	it("should track all registered step types", () => {
		const registeredTypes = stepRegistry.getRegisteredTypes();

		expect(registeredTypes).toContain("ask-user");
		expect(registeredTypes).toContain("llm-generate");
		expect(registeredTypes).toContain("branch");
		expect(registeredTypes).toContain("execute-action");
		expect(registeredTypes).toContain("display-output");
		expect(registeredTypes).toHaveLength(8); // All step types from step-types.ts
	});
});
