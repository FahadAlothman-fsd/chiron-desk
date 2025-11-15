import "../../../test-setup";
import { describe, it, expect, beforeEach } from "bun:test";
import { MiProCollector } from "./mipro-collector";
import { db } from "@chiron/db";
import { agents } from "@chiron/db/schema";

describe("MiPRO Collector", () => {
	let collector: MiProCollector;
	let testAgentId: string;

	beforeEach(async () => {
		collector = new MiProCollector();

		// Create test agent
		const [agent] = await db
			.insert(agents)
			.values({
				name: "test-agent-mipro",
				displayName: "Test Agent MiPRO",
				description: "Test agent for MiPRO collector tests",
				role: "tester",
				llmProvider: "anthropic",
				llmModel: "claude-3-5-sonnet-20241022",
			})
			.returning();

		testAgentId = agent.id;
	});

	describe("saveApprovedOutput", () => {
		it("should save training example with all fields", async () => {
			await collector.saveApprovedOutput(
				"update_summary",
				testAgentId,
				{
					conversation_history: "User: Tell me about healthcare...",
					variables: { project_type: "healthcare" },
				},
				{
					project_description: "A healthcare task management system",
				},
				[
					{
						feedback: "Too vague",
						rejectedAt: new Date().toISOString(),
						previousOutput: { project_description: "A healthcare app" },
					},
				],
				{
					answerRelevancy: 0.95,
					completeness: 0.88,
				},
			);

			const examples = await collector.getTrainingExamples(
				"update_summary",
				10,
			);
			expect(examples.length).toBeGreaterThan(0);
			expect(examples[0].toolName).toBe("update_summary");
		});

		it("should save example without rejection history", async () => {
			await collector.saveApprovedOutput(
				"update_complexity",
				testAgentId,
				{
					variables: { project_description: "Healthcare app" },
				},
				{
					complexity: "method",
				},
			);

			const examples = await collector.getTrainingExamples(
				"update_complexity",
				10,
			);
			expect(examples.length).toBeGreaterThan(0);
		});
	});

	describe("getTrainingExamples", () => {
		it("should return empty array for tool with no examples", async () => {
			const examples = await collector.getTrainingExamples(
				"non_existent_tool",
				10,
			);
			expect(examples).toHaveLength(0);
		});

		it("should return examples for specific tool", async () => {
			await collector.saveApprovedOutput(
				"test_tool_1",
				testAgentId,
				{ variables: {} },
				{},
			);
			await collector.saveApprovedOutput(
				"test_tool_1",
				testAgentId,
				{ variables: {} },
				{},
			);
			await collector.saveApprovedOutput(
				"test_tool_2",
				testAgentId,
				{ variables: {} },
				{},
			);

			const examples = await collector.getTrainingExamples("test_tool_1", 10);
			expect(examples.length).toBe(2);
		});

		it("should respect limit parameter", async () => {
			for (let i = 0; i < 5; i++) {
				await collector.saveApprovedOutput(
					"test_tool",
					testAgentId,
					{ variables: {} },
					{},
				);
			}

			const examples = await collector.getTrainingExamples("test_tool", 3);
			expect(examples.length).toBe(3);
		});
	});

	describe("getTrainingExamplesByAgent", () => {
		it("should return all examples for an agent across tools", async () => {
			await collector.saveApprovedOutput(
				"tool_1",
				testAgentId,
				{ variables: {} },
				{},
			);
			await collector.saveApprovedOutput(
				"tool_2",
				testAgentId,
				{ variables: {} },
				{},
			);

			const examples = await collector.getTrainingExamplesByAgent(
				testAgentId,
				10,
			);
			expect(examples.length).toBe(2);
		});
	});

	describe("getExampleCount", () => {
		it("should return 0 for no examples", async () => {
			const count = await collector.getExampleCount("non_existent_tool");
			expect(count).toBe(0);
		});

		it("should return correct count for tool", async () => {
			await collector.saveApprovedOutput(
				"count_test_tool",
				testAgentId,
				{ variables: {} },
				{},
			);
			await collector.saveApprovedOutput(
				"count_test_tool",
				testAgentId,
				{ variables: {} },
				{},
			);

			const count = await collector.getExampleCount("count_test_tool");
			expect(count).toBe(2);
		});
	});

	describe("formatForMiPRO", () => {
		it("should format examples for MiPRO optimizer", async () => {
			await collector.saveApprovedOutput(
				"format_test",
				testAgentId,
				{
					variables: { input_var: "value" },
				},
				{ output_var: "result" },
				[
					{
						feedback: "feedback",
						rejectedAt: new Date().toISOString(),
						previousOutput: {},
					},
				],
				{ answerRelevancy: 0.9 },
			);

			const examples = await collector.getTrainingExamples("format_test", 10);
			const formatted = collector.formatForMiPRO(examples);

			expect(formatted).toHaveLength(1);
			expect(formatted[0].input).toBeDefined();
			expect(formatted[0].expected_output).toBeDefined();
			expect(formatted[0].metadata.toolName).toBe("format_test");
			expect(formatted[0].metadata.rejectionCount).toBe(1);
		});
	});
});
