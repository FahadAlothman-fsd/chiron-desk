import "../../../../test-setup";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { AskUserChatStepConfig } from "@chiron/db";
import { acePlaybooks, agents, db, workflowSteps } from "@chiron/db";
import { eq } from "drizzle-orm";
import type { ExecutionContext } from "../types";
import { AskUserChatStepHandler } from "./ask-user-chat-handler";

describe("AskUserChatStepHandler", () => {
	let handler: AskUserChatStepHandler;
	let testContext: ExecutionContext;
	let testAgentId: string;
	let testStep: any;

	beforeEach(async () => {
		// Cleanup any existing test data first
		await db.delete(agents).where(eq(agents.name, "test-pm-agent"));

		handler = new AskUserChatStepHandler();

		// Create test agent with instructions
		const [agent] = await db
			.insert(agents)
			.values({
				name: "test-pm-agent",
				displayName: "Test PM Agent",
				description: "Test agent for chat handler tests",
				role: "pm",
				llmProvider: "anthropic",
				llmModel: "claude-3-5-sonnet-20241022",
				instructions: `You are a helpful project management assistant.
Guide the user through project initialization.`,
			})
			.returning();

		testAgentId = agent.id;

		// Create initial ACE playbook with correct structure
		await db.insert(acePlaybooks).values({
			agentId: testAgentId,
			scope: "global",
			playbook: {
				sections: {
					"Summary Generation Patterns": {
						bullets: [],
					},
					"Complexity Classification Patterns": {
						bullets: [],
					},
				},
			},
			version: 1,
			totalUpdates: 0,
		});

		// Create test step config
		const stepConfig: AskUserChatStepConfig = {
			agentId: testAgentId,
			initialMessage: "Hello! Let's get your project set up.",
			tools: [],
			completionCondition: {
				type: "all-tools-approved",
				requiredTools: [],
			},
			outputVariables: {},
		};

		testStep = {
			id: "test-step-id",
			workflowId: "test-workflow-id",
			stepNumber: 3,
			stepType: "ask-user-chat",
			config: stepConfig,
			nextStepNumber: 4,
		};

		// Create test execution context
		testContext = {
			executionId: "test-execution-id",
			workflowId: "test-workflow-id",
			projectId: "test-project-id",
			executionVariables: {},
			systemVariables: {
				current_user_id: "test-user-id",
				current_project_id: "test-project-id",
				execution_id: "test-execution-id",
			},
		};
	});

	afterEach(async () => {
		// Cleanup test data
		if (testAgentId) {
			await db
				.delete(acePlaybooks)
				.where(eq(acePlaybooks.agentId, testAgentId));
			await db.delete(agents).where(eq(agents.id, testAgentId));
		}
	});

	describe("executeStep - Agent Initialization", () => {
		it("should initialize agent with DB instructions and ACE playbook", async () => {
			// Execute step without user input (initialization only)
			const result = await handler.executeStep(testStep, testContext);

			// Should require user input (waiting for first message)
			expect(result.requiresUserInput).toBe(true);

			// Should have created Mastra thread and returned ID in output
			expect(result.output.mastra_thread_id).toBeDefined();
			expect(typeof result.output.mastra_thread_id).toBe("string");
		});

		it("should resume with existing thread ID if already set", async () => {
			// Set existing thread ID
			testContext.executionVariables.mastra_thread_id = "existing-thread-123";

			const result = await handler.executeStep(testStep, testContext);

			// Should use existing thread (not create new one)
			expect(testContext.executionVariables.mastra_thread_id).toBe(
				"existing-thread-123",
			);
			expect(result.requiresUserInput).toBe(true);
		});
	});

	describe("executeStep - Completion Detection", () => {
		it("should detect completion when all required tools are approved", async () => {
			// Set up config with required tools
			testStep.config.completionCondition = {
				type: "all-tools-approved",
				requiredTools: ["update_summary", "update_complexity"],
			};

			testStep.config.outputVariables = {
				project_description: "approval_states.update_summary.value.summary",
				complexity_classification:
					"approval_states.update_complexity.value.complexity",
			};

			// Mark all tools as approved in execution variables
			testContext.executionVariables.approval_states = {
				update_summary: {
					status: "approved",
					value: { summary: "Test project description" },
				},
				update_complexity: {
					status: "approved",
					value: { complexity: "method" },
				},
			};

			const result = await handler.executeStep(testStep, testContext);

			// Should complete and extract outputs
			expect(result.requiresUserInput).toBe(false);
			expect(result.output.project_description).toBe(
				"Test project description",
			);
			expect(result.output.complexity_classification).toBe("method");
			expect(result.nextStepNumber).toBe(4);
		});

		it("should NOT complete if any required tool is pending", async () => {
			testStep.config.completionCondition = {
				type: "all-tools-approved",
				requiredTools: ["update_summary", "update_complexity"],
			};

			// Only one tool approved, one still pending
			testContext.executionVariables.approval_states = {
				update_summary: {
					status: "approved",
					value: { summary: "Test description" },
				},
				update_complexity: {
					status: "pending",
					value: { complexity: "method" },
				},
			};

			const result = await handler.executeStep(testStep, testContext);

			// Should NOT complete
			expect(result.requiresUserInput).toBe(true);
		});

		it("should NOT complete if any required tool is missing", async () => {
			testStep.config.completionCondition = {
				type: "all-tools-approved",
				requiredTools: ["update_summary", "update_complexity"],
			};

			// Only one tool exists
			testContext.executionVariables.approval_states = {
				update_summary: {
					status: "approved",
					value: { summary: "Test description" },
				},
				// update_complexity missing entirely
			};

			const result = await handler.executeStep(testStep, testContext);

			// Should NOT complete
			expect(result.requiresUserInput).toBe(true);
		});
	});

	describe("Tool Building and Validation", () => {
		it("should validate required variables before tool execution", async () => {
			// Add tool with required variable
			testStep.config.tools = [
				{
					name: "update_complexity",
					description: "Classify project complexity",
					toolType: "ax-generation",
					requiredVariables: ["project_description"],
					axSignature: {
						input: [],
						output: [],
					},
				},
			];

			// project_description is MISSING
			const result = await handler.executeStep(testStep, testContext);

			// Should still initialize successfully (tool validation happens at execution time)
			expect(result.requiresUserInput).toBe(true);
		});
	});

	describe("Output Variable Extraction", () => {
		it("should extract nested variables using dot notation", async () => {
			testStep.config.completionCondition = {
				type: "all-tools-approved",
				requiredTools: ["update_summary"],
			};

			testStep.config.outputVariables = {
				project_description: "approval_states.update_summary.value.summary",
				reasoning: "approval_states.update_summary.reasoning",
			};

			testContext.executionVariables.approval_states = {
				update_summary: {
					status: "approved",
					value: {
						summary: "Test project description with nested value",
					},
					reasoning: "Based on conversation context",
				},
			};

			const result = await handler.executeStep(testStep, testContext);

			expect(result.output.project_description).toBe(
				"Test project description with nested value",
			);
			expect(result.output.reasoning).toBe("Based on conversation context");
		});

		it("should handle missing variable paths gracefully", async () => {
			testStep.config.completionCondition = {
				type: "all-tools-approved",
				requiredTools: [],
			};

			testStep.config.outputVariables = {
				missing_value: "approval_states.nonexistent.value.data",
			};

			const result = await handler.executeStep(testStep, testContext);

			// Should return undefined for missing paths (not throw)
			expect(result.output.missing_value).toBeUndefined();
		});
	});
});
