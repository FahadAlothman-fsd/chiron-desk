import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import type { StepHandlerInput } from "../effect/step-registry";
import {
	createLegacySandboxedAgentHandler,
	SandboxedAgentHandler,
	SandboxedAgentHandlerLive,
} from "./sandboxed-agent-handler";

function createInput(
	config: Record<string, unknown>,
	variables: Record<string, unknown> = {},
): StepHandlerInput {
	return {
		stepConfig: config,
		variables,
		executionId: "test-execution-id",
	};
}

function runHandler(input: StepHandlerInput, userInput?: unknown) {
	const program = Effect.provide(
		Effect.flatMap(SandboxedAgentHandler, (handler) =>
			handler.execute(input, userInput),
		),
		SandboxedAgentHandlerLive,
	);
	return Effect.runPromise(program);
}

describe("SandboxedAgentHandler", () => {
	describe("initialization", () => {
		it("requires user input on first call", async () => {
			const input = createInput(
				{
					systemPrompt: "You are a helpful assistant",
					userPrompt: "Help me with {{task}}",
					tools: [],
					completionCondition: { type: "max-turns", maxTurns: 3 },
				},
				{ task: "testing" },
			);

			const result = await runHandler(input);

			expect(result.requiresUserInput).toBe(true);
			expect(result.conversationState?.messages.length).toBe(2);
		});

		it("resolves variables in prompts", async () => {
			const input = createInput(
				{
					systemPrompt: "Help with {{project}}",
					userPrompt: "Task: {{task}}",
					tools: [],
					completionCondition: { type: "max-turns", maxTurns: 1 },
				},
				{ project: "Chiron", task: "testing" },
			);

			const result = await runHandler(input);

			expect(result.conversationState?.messages[0].content).toBe(
				"Help with Chiron",
			);
			expect(result.conversationState?.messages[1].content).toBe(
				"Task: testing",
			);
		});
	});

	describe("user input handling", () => {
		it("accepts string messages", async () => {
			const input = createInput({
				systemPrompt: "Assistant",
				userPrompt: "Start",
				tools: [],
				completionCondition: { type: "max-turns", maxTurns: 5 },
				_conversationState: {
					messages: [
						{ role: "system", content: "Assistant" },
						{ role: "user", content: "Start" },
					],
					turnCount: 1,
					approvedTools: [],
				},
			});

			const result = await runHandler(input, "Continue please");

			expect(result.conversationState?.messages.length).toBe(3);
			expect(result.conversationState?.messages[2].content).toBe(
				"Continue please",
			);
		});

		it("handles tool approval", async () => {
			const input = createInput({
				systemPrompt: "Assistant",
				userPrompt: "Start",
				tools: [
					{
						name: "test-tool",
						type: "update-variable",
						description: "Test",
						inputSchema: {},
					},
				],
				completionCondition: { type: "all-tools-approved" },
				_conversationState: {
					messages: [
						{ role: "system", content: "Assistant" },
						{ role: "user", content: "Start" },
					],
					turnCount: 1,
					approvedTools: [],
				},
			});

			const result = await runHandler(input, {
				type: "approval",
				toolName: "test-tool",
				approved: true,
			});

			expect(result.conversationState?.messages.length).toBe(3);
			expect(result.conversationState?.messages[2].content).toContain(
				"Approved",
			);
		});
	});

	describe("completion conditions", () => {
		it("completes when max turns reached", async () => {
			const input = createInput({
				systemPrompt: "Assistant",
				userPrompt: "Start",
				tools: [],
				completionCondition: { type: "max-turns", maxTurns: 2 },
				_conversationState: {
					messages: [
						{ role: "system", content: "Assistant" },
						{ role: "user", content: "Start" },
					],
					turnCount: 2,
					approvedTools: [],
				},
			});

			const result = await runHandler(input);

			expect(result.requiresUserInput).toBe(false);
			expect(result.result.completed).toBe(true);
		});

		it("completes when all tools approved", async () => {
			const input = createInput({
				systemPrompt: "Assistant",
				userPrompt: "Start",
				tools: [
					{
						name: "tool1",
						type: "update-variable",
						description: "T1",
						inputSchema: {},
					},
					{
						name: "tool2",
						type: "update-variable",
						description: "T2",
						inputSchema: {},
					},
				],
				completionCondition: { type: "all-tools-approved" },
				_conversationState: {
					messages: [],
					turnCount: 0,
					approvedTools: ["tool1", "tool2"],
				},
			});

			const result = await runHandler(input);

			expect(result.requiresUserInput).toBe(false);
			expect(result.result.completed).toBe(true);
		});

		it("completes when all required variables set", async () => {
			const input = createInput(
				{
					systemPrompt: "Assistant",
					userPrompt: "Start",
					tools: [],
					completionCondition: {
						type: "all-variables-set",
						requiredVariables: ["name", "email"],
					},
				},
				{ name: "John", email: "john@example.com" },
			);

			const result = await runHandler(input);

			expect(result.requiresUserInput).toBe(false);
			expect(result.result.completed).toBe(true);
		});

		it("continues when required variables missing", async () => {
			const input = createInput(
				{
					systemPrompt: "Assistant",
					userPrompt: "Start",
					tools: [],
					completionCondition: {
						type: "all-variables-set",
						requiredVariables: ["name", "email"],
					},
				},
				{ name: "John" },
			);

			const result = await runHandler(input);

			expect(result.requiresUserInput).toBe(true);
			expect(result.result.completed).toBe(false);
		});
	});

	describe("legacy adapter", () => {
		it("works with legacy interface", async () => {
			const handler = createLegacySandboxedAgentHandler();
			const step = {
				config: {
					systemPrompt: "Assistant",
					userPrompt: "Help",
					tools: [],
					completionCondition: { type: "max-turns", maxTurns: 5 },
				},
				nextStepNumber: 2,
			};

			const result = await handler.executeStep(step, {});

			expect(result.requiresUserInput).toBe(true);
			expect(result.nextStepNumber).toBe(2);
		});
	});
});
