import { describe, expect, test } from "bun:test";
import { buildExecutionContext } from "./execution-context";

describe("buildExecutionContext", () => {
	describe("System Variables", () => {
		test("should set current_user_id from userId parameter", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				projectId: null,
				variables: {},
				executedSteps: {},
			});

			expect(context.systemVariables.current_user_id).toBe("user-456");
		});

		test("should set execution_id from executionId parameter", () => {
			const context = buildExecutionContext({
				executionId: "exec-789",
				userId: "user-456",
				projectId: null,
				variables: {},
				executedSteps: {},
			});

			expect(context.systemVariables.execution_id).toBe("exec-789");
		});

		test("should set project_id from projectId parameter", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				projectId: "project-999",
				variables: {},
				executedSteps: {},
			});

			expect(context.systemVariables.project_id).toBe("project-999");
		});

		test("should set project_id to null when projectId is null", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				projectId: null,
				variables: {},
				executedSteps: {},
			});

			expect(context.systemVariables.project_id).toBeNull();
		});

		test("should set project_id to null when projectId is undefined", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				variables: {},
				executedSteps: {},
			});

			expect(context.systemVariables.project_id).toBeNull();
		});

		test("should set date in YYYY-MM-DD format", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				projectId: null,
				variables: {},
				executedSteps: {},
			});

			expect(context.systemVariables.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		test("should set timestamp in ISO 8601 format", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				projectId: null,
				variables: {},
				executedSteps: {},
			});

			expect(context.systemVariables.timestamp).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
			);
		});
	});

	describe("Execution Variables", () => {
		test("should include execution variables from parameters", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				projectId: null,
				variables: {
					detected_field_type: "greenfield",
					project_path: "/home/user/project",
				},
				executedSteps: {},
			});

			expect(context.executionVariables).toEqual({
				detected_field_type: "greenfield",
				project_path: "/home/user/project",
			});
		});

		test("should handle empty execution variables", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				projectId: null,
				variables: {},
				executedSteps: {},
			});

			expect(context.executionVariables).toEqual({});
		});
	});

	describe("Step Outputs", () => {
		test("should extract step outputs from executedSteps", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				projectId: null,
				variables: {},
				executedSteps: {
					1: {
						status: "completed",
						output: { detected_field_type: "greenfield" },
					},
					2: {
						status: "completed",
						output: { project_path: "/home/user/project" },
					},
				},
			});

			expect(context.stepOutputs).toEqual({
				1: { detected_field_type: "greenfield" },
				2: { project_path: "/home/user/project" },
			});
		});

		test("should skip steps without output", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				projectId: null,
				variables: {},
				executedSteps: {
					1: {
						status: "completed",
						output: { detected_field_type: "greenfield" },
					},
					2: {
						status: "failed",
					},
				},
			});

			expect(context.stepOutputs).toEqual({
				1: { detected_field_type: "greenfield" },
			});
		});

		test("should handle empty executedSteps", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				projectId: null,
				variables: {},
				executedSteps: {},
			});

			expect(context.stepOutputs).toEqual({});
		});
	});

	describe("Default Values", () => {
		test("should include default values from parameters", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				projectId: null,
				variables: {},
				executedSteps: {},
				defaultValues: {
					max_complexity: 5,
					default_language: "TypeScript",
				},
			});

			expect(context.defaultValues).toEqual({
				max_complexity: 5,
				default_language: "TypeScript",
			});
		});

		test("should default to empty object when defaultValues not provided", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				projectId: null,
				variables: {},
				executedSteps: {},
			});

			expect(context.defaultValues).toEqual({});
		});
	});

	describe("4-Level Precedence Integration", () => {
		test("should make all 4 levels accessible in context", () => {
			const context = buildExecutionContext({
				executionId: "exec-123",
				userId: "user-456",
				projectId: "project-999",
				variables: {
					project_path: "/home/user/project",
				},
				executedSteps: {
					1: {
						status: "completed",
						output: { detected_field_type: "greenfield" },
					},
				},
				defaultValues: {
					default_language: "TypeScript",
				},
			});

			// Level 1: System variables
			expect(context.systemVariables.execution_id).toBe("exec-123");
			expect(context.systemVariables.current_user_id).toBe("user-456");
			expect(context.systemVariables.project_id).toBe("project-999");

			// Level 2: Execution variables
			expect(context.executionVariables.project_path).toBe(
				"/home/user/project",
			);

			// Level 3: Step outputs
			expect(context.stepOutputs[1]).toEqual({
				detected_field_type: "greenfield",
			});

			// Level 4: Default values
			expect(context.defaultValues.default_language).toBe("TypeScript");
		});
	});
});
