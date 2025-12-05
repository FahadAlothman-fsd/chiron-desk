import { beforeEach, describe, expect, it } from "bun:test";
import type { ExecutionContext } from "../execution-context";
import { buildUpdateVariableTool } from "./update-variable-tool";

describe("buildUpdateVariableTool - Object Type Support", () => {
	let context: ExecutionContext;

	beforeEach(() => {
		// Mock execution context
		context = {
			executionId: "test-exec-123",
			workflowId: "test-workflow",
			variables: {},
		} as any;
	});

	describe("Object Type - Basic Structure", () => {
		it("should validate object with required string and number properties", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_qa_pair",
					type: "update-variable",
					targetVariable: "qa_pair",
					valueSchema: {
						type: "object",
						required: ["question", "answer"],
						properties: {
							question: { type: "string" },
							answer: { type: "string" },
						},
					},
				},
				context,
			);

			// Valid input should pass
			const result = await tool.execute({
				context: {
					value: {
						question: "Why did this happen?",
						answer: "Because of X reason",
					},
				},
			});

			expect(result.value).toEqual({
				question: "Why did this happen?",
				answer: "Because of X reason",
			});
		});

		it("should reject object missing required fields", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_qa_pair",
					type: "update-variable",
					targetVariable: "qa_pair",
					valueSchema: {
						type: "object",
						required: ["question", "answer"],
						properties: {
							question: { type: "string" },
							answer: { type: "string" },
						},
					},
				},
				context,
			);

			// Missing required field should return error
			// Mastra wraps validation errors in result object instead of throwing
			const result: any = await tool.execute({
				context: {
					value: {
						question: "Why?",
						// Missing 'answer' field
					},
				},
			});

			expect(result.error).toBe(true);
			expect(result.message).toContain("validation failed");
			expect(result.message).toContain("answer");
		});

		it("should validate object with mixed primitive types", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_metadata",
					type: "update-variable",
					targetVariable: "metadata",
					valueSchema: {
						type: "object",
						required: ["id", "active"],
						properties: {
							id: { type: "number" },
							active: { type: "boolean" },
							label: { type: "string" },
						},
					},
				},
				context,
			);

			const result = await tool.execute({
				context: {
					value: {
						id: 42,
						active: true,
						label: "Important",
					},
				},
			});

			expect(result.value).toEqual({
				id: 42,
				active: true,
				label: "Important",
			});
		});

		it("should reject object with incorrect property types", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_metadata",
					type: "update-variable",
					targetVariable: "metadata",
					valueSchema: {
						type: "object",
						required: ["id", "active"],
						properties: {
							id: { type: "number" },
							active: { type: "boolean" },
						},
					},
				},
				context,
			);

			// id should be number, not string
			const result: any = await tool.execute({
				context: {
					value: {
						id: "not-a-number",
						active: true,
					},
				},
			});

			expect(result.error).toBe(true);
			expect(result.message).toContain("validation failed");
		});
	});

	describe("Object Type - Optional Fields", () => {
		it("should allow optional fields to be omitted", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_profile",
					type: "update-variable",
					targetVariable: "profile",
					valueSchema: {
						type: "object",
						required: ["name"],
						properties: {
							name: { type: "string" },
							age: { type: "number" }, // Optional (not in required array)
							bio: { type: "string" }, // Optional
						},
					},
				},
				context,
			);

			const result = await tool.execute({
				context: {
					value: {
						name: "Alice",
						// age and bio omitted
					},
				},
			});

			expect(result.value).toEqual({
				name: "Alice",
			});
		});

		it("should validate optional fields when provided", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_profile",
					type: "update-variable",
					targetVariable: "profile",
					valueSchema: {
						type: "object",
						required: ["name"],
						properties: {
							name: { type: "string" },
							age: { type: "number" },
						},
					},
				},
				context,
			);

			// Wrong type for optional field should fail
			const result: any = await tool.execute({
				context: {
					value: {
						name: "Bob",
						age: "thirty-five", // Wrong type
					},
				},
			});

			expect(result.error).toBe(true);
			expect(result.message).toContain("validation failed");
		});
	});

	describe("Object Type - Array Properties", () => {
		it("should validate object with array property", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_branch",
					type: "update-variable",
					targetVariable: "branch",
					valueSchema: {
						type: "object",
						required: ["name", "items"],
						properties: {
							name: { type: "string" },
							items: { type: "array" }, // Array of strings
						},
					},
				},
				context,
			);

			const result = await tool.execute({
				context: {
					value: {
						name: "Main Branch",
						items: ["idea1", "idea2", "idea3"],
					},
				},
			});

			expect(result.value).toEqual({
				name: "Main Branch",
				items: ["idea1", "idea2", "idea3"],
			});
		});

		it("should reject array property with non-string items", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_branch",
					type: "update-variable",
					targetVariable: "branch",
					valueSchema: {
						type: "object",
						required: ["items"],
						properties: {
							items: { type: "array" },
						},
					},
				},
				context,
			);

			// Array should contain strings, not numbers
			const result: any = await tool.execute({
				context: {
					value: {
						items: [1, 2, 3],
					},
				},
			});

			expect(result.error).toBe(true);
			expect(result.message).toContain("validation failed");
		});
	});

	describe("Object Type - Additional Properties (Dynamic Keys)", () => {
		it("should support dynamic keys with array values (Mind Mapping pattern)", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_mind_map",
					type: "update-variable",
					targetVariable: "mind_map",
					valueSchema: {
						type: "object",
						properties: {}, // No fixed properties
						additionalProperties: {
							type: "array", // Each dynamic key has array of strings
						},
					},
				},
				context,
			);

			const result = await tool.execute({
				context: {
					value: {
						"Technical Features": ["API integration", "Real-time sync"],
						"User Experience": ["Intuitive UI", "Fast performance"],
						"Business Value": ["Cost savings", "Scalability"],
					},
				},
			});

			expect(result.value).toEqual({
				"Technical Features": ["API integration", "Real-time sync"],
				"User Experience": ["Intuitive UI", "Fast performance"],
				"Business Value": ["Cost savings", "Scalability"],
			});
		});

		it("should support dynamic keys with string values", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_labels",
					type: "update-variable",
					targetVariable: "labels",
					valueSchema: {
						type: "object",
						properties: {},
						additionalProperties: {
							type: "string",
						},
					},
				},
				context,
			);

			const result = await tool.execute({
				context: {
					value: {
						priority: "high",
						status: "active",
						assignee: "alice",
					},
				},
			});

			expect(result.value).toEqual({
				priority: "high",
				status: "active",
				assignee: "alice",
			});
		});

		it("should combine fixed properties with dynamic keys", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_extended_map",
					type: "update-variable",
					targetVariable: "extended_map",
					valueSchema: {
						type: "object",
						required: ["center"],
						properties: {
							center: { type: "string" },
						},
						additionalProperties: {
							type: "array",
						},
					},
				},
				context,
			);

			const result = await tool.execute({
				context: {
					value: {
						center: "Improve Onboarding",
						"Branch 1": ["idea A", "idea B"],
						"Branch 2": ["idea C", "idea D"],
					},
				},
			});

			expect(result.value.center).toBe("Improve Onboarding");
			expect(result.value["Branch 1"]).toEqual(["idea A", "idea B"]);
		});
	});

	describe("Object Type - Five Whys Use Case", () => {
		it("should validate Five Whys Q&A pair structure", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "capture_why_1",
					type: "update-variable",
					targetVariable: "why_1",
					valueSchema: {
						type: "object",
						required: ["question", "answer"],
						properties: {
							question: { type: "string" },
							answer: { type: "string" },
						},
					},
				},
				context,
			);

			const result = await tool.execute({
				context: {
					value: {
						question: "Why did the deployment fail?",
						answer:
							"Because the environment variables were not configured correctly",
					},
				},
			});

			expect(result.value.question).toBe("Why did the deployment fail?");
			expect(result.value.answer).toContain("environment variables");
		});
	});

	describe("Array of Objects Type (What If Scenarios Use Case)", () => {
		it("should validate array of objects with primitive properties", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "capture_actionable_insights",
					type: "update-variable",
					targetVariable: "actionable_insights",
					valueSchema: {
						type: "array",
						items: {
							type: "object",
							required: ["wildIdea", "essence", "practical"],
							properties: {
								wildIdea: { type: "string" },
								essence: { type: "string" },
								practical: { type: "string" },
							},
						},
					},
				},
				context,
			);

			const result = await tool.execute({
				context: {
					value: [
						{
							wildIdea: "Hire dream team",
							essence: "Need high-quality talent",
							practical: "Partner with university for talented interns",
						},
						{
							wildIdea: "Perfect every detail",
							essence: "Quality matters in key areas",
							practical: "Identify 2-3 critical features for extra polish",
						},
					],
				},
			});

			expect(result.value).toHaveLength(2);
			expect(result.value[0].wildIdea).toBe("Hire dream team");
			expect(result.value[1].essence).toBe("Quality matters in key areas");
		});

		it("should validate array of objects with nested arrays", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "capture_what_if_scenarios",
					type: "update-variable",
					targetVariable: "what_if_scenarios",
					valueSchema: {
						type: "array",
						items: {
							type: "object",
							required: ["constraint", "whatIf", "ideas"],
							properties: {
								constraint: { type: "string" },
								whatIf: { type: "string" },
								ideas: { type: "array" }, // Nested array of strings
							},
						},
					},
				},
				context,
			);

			const result = await tool.execute({
				context: {
					value: [
						{
							constraint: "$5,000 budget",
							whatIf: "Unlimited money",
							ideas: [
								"Hire dream team",
								"Custom-build everything",
								"Global campaign",
							],
						},
						{
							constraint: "2-week deadline",
							whatIf: "Infinite time",
							ideas: ["Perfect every detail", "User research for months"],
						},
					],
				},
			});

			expect(result.value).toHaveLength(2);
			expect(result.value[0].constraint).toBe("$5,000 budget");
			expect(result.value[0].ideas).toEqual([
				"Hire dream team",
				"Custom-build everything",
				"Global campaign",
			]);
		});

		it("should reject array of objects with missing required fields", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "capture_insights",
					type: "update-variable",
					targetVariable: "insights",
					valueSchema: {
						type: "array",
						items: {
							type: "object",
							required: ["wildIdea", "practical"],
							properties: {
								wildIdea: { type: "string" },
								practical: { type: "string" },
							},
						},
					},
				},
				context,
			);

			const result: any = await tool.execute({
				context: {
					value: [
						{
							wildIdea: "Something wild",
							// Missing 'practical' field
						},
					],
				},
			});

			expect(result.error).toBe(true);
			expect(result.message).toContain("validation failed");
		});

		it("should handle optional fields in array of objects", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "capture_enriched_insights",
					type: "update-variable",
					targetVariable: "enriched_insights",
					valueSchema: {
						type: "array",
						items: {
							type: "object",
							required: ["idea"], // Only idea is required
							properties: {
								idea: { type: "string" },
								confidence: { type: "number" }, // Optional
								notes: { type: "string" }, // Optional
							},
						},
					},
				},
				context,
			);

			const result = await tool.execute({
				context: {
					value: [
						{
							idea: "Test idea",
							confidence: 0.8,
							// notes omitted (optional)
						},
						{
							idea: "Another idea",
							// both optional fields omitted
						},
					],
				},
			});

			expect(result.value).toHaveLength(2);
			expect(result.value[0].confidence).toBe(0.8);
			expect(result.value[1].confidence).toBeUndefined();
		});
	});

	describe("Backwards Compatibility", () => {
		it("should still support string type", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_topic",
					type: "update-variable",
					targetVariable: "topic",
					valueSchema: {
						type: "string",
					},
				},
				context,
			);

			const result = await tool.execute({
				context: {
					value: "Improve user onboarding",
				},
			});

			expect(result.value).toBe("Improve user onboarding");
		});

		it("should still support array type", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_goals",
					type: "update-variable",
					targetVariable: "goals",
					valueSchema: {
						type: "array",
					},
				},
				context,
			);

			const result = await tool.execute({
				context: {
					value: ["Reduce friction", "Increase engagement"],
				},
			});

			expect(result.value).toEqual(["Reduce friction", "Increase engagement"]);
		});
	});

	describe("Approval Flow", () => {
		it("should return approval state when requiresApproval is true", async () => {
			const tool = await buildUpdateVariableTool(
				{
					name: "update_critical_data",
					type: "update-variable",
					targetVariable: "critical_data",
					requiresApproval: true,
					valueSchema: {
						type: "object",
						required: ["name"],
						properties: {
							name: { type: "string" },
						},
					},
				},
				context,
			);

			const result = await tool.execute({
				context: {
					value: { name: "Important Value" },
					reasoning: "User confirmed this value",
				},
			});

			expect(result.status).toBe("awaiting_approval");
			expect(result.value).toEqual({ name: "Important Value" });
			expect(result.reasoning).toBe("User confirmed this value");
		});
	});
});
