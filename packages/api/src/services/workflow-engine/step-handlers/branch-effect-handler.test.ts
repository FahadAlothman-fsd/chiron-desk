import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import type { StepHandlerInput } from "../effect/step-registry";
import {
	BranchHandler,
	BranchHandlerLive,
	createLegacyBranchHandler,
} from "./branch-effect-handler";

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

function runHandler(input: StepHandlerInput) {
	const program = Effect.provide(
		Effect.flatMap(BranchHandler, (handler) => handler.execute(input)),
		BranchHandlerLive,
	);
	return Effect.runPromise(program);
}

describe("BranchHandler", () => {
	describe("equals operator", () => {
		it("matches when variable equals value", async () => {
			const input = createInput(
				{
					conditions: [
						{
							variable: "status",
							operator: "equals",
							value: "approved",
							targetStepNumber: 5,
						},
					],
					defaultStepNumber: 10,
				},
				{ status: "approved" },
			);

			const result = await runHandler(input);

			expect(result.nextStepNumber).toBe(5);
			expect(result.result).toEqual({ matchedCondition: "status" });
		});

		it("falls through to default when no match", async () => {
			const input = createInput(
				{
					conditions: [
						{
							variable: "status",
							operator: "equals",
							value: "approved",
							targetStepNumber: 5,
						},
					],
					defaultStepNumber: 10,
				},
				{ status: "rejected" },
			);

			const result = await runHandler(input);

			expect(result.nextStepNumber).toBe(10);
			expect(result.result).toEqual({ matchedCondition: "default" });
		});
	});

	describe("not-equals operator", () => {
		it("matches when variable does not equal value", async () => {
			const input = createInput(
				{
					conditions: [
						{
							variable: "status",
							operator: "not-equals",
							value: "pending",
							targetStepNumber: 5,
						},
					],
					defaultStepNumber: 10,
				},
				{ status: "approved" },
			);

			const result = await runHandler(input);

			expect(result.nextStepNumber).toBe(5);
		});
	});

	describe("contains operator", () => {
		it("matches when string contains value", async () => {
			const input = createInput(
				{
					conditions: [
						{
							variable: "message",
							operator: "contains",
							value: "error",
							targetStepNumber: 5,
						},
					],
					defaultStepNumber: 10,
				},
				{ message: "An error occurred" },
			);

			const result = await runHandler(input);

			expect(result.nextStepNumber).toBe(5);
		});

		it("matches when array contains value", async () => {
			const input = createInput(
				{
					conditions: [
						{
							variable: "tags",
							operator: "contains",
							value: "urgent",
							targetStepNumber: 5,
						},
					],
					defaultStepNumber: 10,
				},
				{ tags: ["normal", "urgent", "review"] },
			);

			const result = await runHandler(input);

			expect(result.nextStepNumber).toBe(5);
		});
	});

	describe("greater-than operator", () => {
		it("matches when number is greater", async () => {
			const input = createInput(
				{
					conditions: [
						{
							variable: "count",
							operator: "greater-than",
							value: 10,
							targetStepNumber: 5,
						},
					],
					defaultStepNumber: 10,
				},
				{ count: 15 },
			);

			const result = await runHandler(input);

			expect(result.nextStepNumber).toBe(5);
		});

		it("does not match when number is less", async () => {
			const input = createInput(
				{
					conditions: [
						{
							variable: "count",
							operator: "greater-than",
							value: 10,
							targetStepNumber: 5,
						},
					],
					defaultStepNumber: 10,
				},
				{ count: 5 },
			);

			const result = await runHandler(input);

			expect(result.nextStepNumber).toBe(10);
		});
	});

	describe("less-than operator", () => {
		it("matches when number is less", async () => {
			const input = createInput(
				{
					conditions: [
						{
							variable: "count",
							operator: "less-than",
							value: 10,
							targetStepNumber: 5,
						},
					],
					defaultStepNumber: 10,
				},
				{ count: 5 },
			);

			const result = await runHandler(input);

			expect(result.nextStepNumber).toBe(5);
		});
	});

	describe("multiple conditions", () => {
		it("matches first true condition", async () => {
			const input = createInput(
				{
					conditions: [
						{
							variable: "status",
							operator: "equals",
							value: "error",
							targetStepNumber: 3,
						},
						{
							variable: "status",
							operator: "equals",
							value: "warning",
							targetStepNumber: 5,
						},
						{
							variable: "status",
							operator: "equals",
							value: "success",
							targetStepNumber: 7,
						},
					],
					defaultStepNumber: 10,
				},
				{ status: "warning" },
			);

			const result = await runHandler(input);

			expect(result.nextStepNumber).toBe(5);
		});
	});

	describe("legacy adapter", () => {
		it("works with legacy interface", async () => {
			const handler = createLegacyBranchHandler();
			const step = {
				config: {
					conditions: [
						{
							variable: "approved",
							operator: "equals",
							value: true,
							targetStepNumber: 5,
						},
					],
					defaultStepNumber: 10,
				},
				nextStepNumber: null,
			};

			const result = await handler.executeStep(step, {
				executionVariables: { approved: true },
			});

			expect(result.nextStepNumber).toBe(5);
			expect(result.requiresUserInput).toBe(false);
		});
	});
});
