import { beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AskUserStepConfig, WorkflowStep } from "@chiron/db";
import type { ExecutionContext } from "../execution-context";
import { AskUserStepHandler, ValidationError } from "./ask-user-handler";

describe("AskUserStepHandler", () => {
	let handler: AskUserStepHandler;
	let mockContext: ExecutionContext;
	let mockStep: WorkflowStep;
	let tempDir: string;

	beforeEach(async () => {
		handler = new AskUserStepHandler();

		// Create temporary directory for testing
		tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "chiron-test-"));

		mockContext = {
			executionId: "test-execution-id",
			workflowId: "test-workflow-id",
			projectId: "test-project-id",
			userId: "test-user-id",
			executionVariables: {},
			systemVariables: {
				project_id: "test-project-id",
				execution_id: "test-execution-id",
				current_user_id: "test-user-id",
				current_date: "2025-11-10T00:00:00Z",
			},
		};

		mockStep = {
			id: "test-step-id",
			workflowId: "test-workflow-id",
			stepNumber: 2,
			goal: "Test step",
			stepType: "ask-user",
			config: {
				type: "ask-user",
				question: "Test question",
				responseType: "string",
				responseVariable: "test_var",
			} as AskUserStepConfig,
			nextStepNumber: 3,
			createdAt: new Date(),
		};
	});

	describe("no user input", () => {
		it("should require user input when no input provided", async () => {
			const result = await handler.executeStep(mockStep, mockContext);

			expect(result.requiresUserInput).toBe(true);
			expect(result.output).toEqual({});
		});
	});

	describe("path validation", () => {
		it("should accept valid absolute path with existing parent", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Select directory",
				responseType: "path",
				responseVariable: "project_path",
				pathConfig: {
					selectMode: "directory",
					mustExist: false,
				},
				validation: {
					required: true,
				},
			};

			const testPath = path.join(tempDir, "my-project");

			const result = await handler.executeStep(mockStep, mockContext, testPath);

			expect(result.output).toEqual({
				project_path: testPath,
			});
			expect(result.requiresUserInput).toBe(false);
		});

		it("should reject relative path", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Select directory",
				responseType: "path",
				responseVariable: "project_path",
				pathConfig: {
					selectMode: "directory",
					mustExist: false,
				},
			};

			await expect(
				handler.executeStep(mockStep, mockContext, "./my-project"),
			).rejects.toThrow(ValidationError);

			await expect(
				handler.executeStep(mockStep, mockContext, "./my-project"),
			).rejects.toThrow("Path must be absolute");
		});

		it("should reject directory traversal", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Select directory",
				responseType: "path",
				responseVariable: "project_path",
				pathConfig: {
					selectMode: "directory",
					mustExist: false,
				},
			};

			// Use raw path with .. instead of path.join which normalizes it
			const testPath = `${tempDir}/../evil-path`;

			await expect(
				handler.executeStep(mockStep, mockContext, testPath),
			).rejects.toThrow("Directory traversal not allowed");
		});

		it("should reject path with non-existent parent directory", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Select directory",
				responseType: "path",
				responseVariable: "project_path",
				pathConfig: {
					selectMode: "directory",
					mustExist: false,
				},
			};

			const testPath = "/nonexistent/parent/my-project";

			await expect(
				handler.executeStep(mockStep, mockContext, testPath),
			).rejects.toThrow("Parent directory does not exist");
		});

		it("should reject path when mustExist is true and path doesn't exist", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Select directory",
				responseType: "path",
				responseVariable: "project_path",
				pathConfig: {
					selectMode: "directory",
					mustExist: true,
				},
			};

			const testPath = path.join(tempDir, "nonexistent-project");

			await expect(
				handler.executeStep(mockStep, mockContext, testPath),
			).rejects.toThrow("Path does not exist");
		});

		it("should accept path when mustExist is true and path exists", async () => {
			// Create the directory
			const testPath = path.join(tempDir, "existing-project");
			await fs.promises.mkdir(testPath);

			mockStep.config = {
				type: "ask-user",
				question: "Select directory",
				responseType: "path",
				responseVariable: "project_path",
				pathConfig: {
					selectMode: "directory",
					mustExist: true,
				},
			};

			const result = await handler.executeStep(mockStep, mockContext, testPath);

			expect(result.output).toEqual({
				project_path: testPath,
			});
		});
	});

	describe("string validation", () => {
		it("should accept valid string", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Enter project name",
				responseType: "string",
				responseVariable: "project_name",
			};

			const result = await handler.executeStep(
				mockStep,
				mockContext,
				"My Project",
			);

			expect(result.output).toEqual({
				project_name: "My Project",
			});
		});

		it("should reject empty string when required", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Enter project name",
				responseType: "string",
				responseVariable: "project_name",
				validation: {
					required: true,
				},
			};

			await expect(
				handler.executeStep(mockStep, mockContext, ""),
			).rejects.toThrow("Input is required");
		});

		it("should reject string shorter than minLength", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Enter project name",
				responseType: "string",
				responseVariable: "project_name",
				validation: {
					minLength: 5,
				},
			};

			await expect(
				handler.executeStep(mockStep, mockContext, "Hi"),
			).rejects.toThrow("at least 5 characters");
		});

		it("should reject string longer than maxLength", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Enter project name",
				responseType: "string",
				responseVariable: "project_name",
				validation: {
					maxLength: 10,
				},
			};

			await expect(
				handler.executeStep(
					mockStep,
					mockContext,
					"This is a very long project name",
				),
			).rejects.toThrow("at most 10 characters");
		});

		it("should validate pattern", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Enter project slug",
				responseType: "string",
				responseVariable: "project_slug",
				validation: {
					pattern: "^[a-z0-9-]+$",
				},
			};

			// Should pass
			const result = await handler.executeStep(
				mockStep,
				mockContext,
				"my-project-123",
			);
			expect(result.output).toEqual({
				project_slug: "my-project-123",
			});

			// Should fail
			await expect(
				handler.executeStep(mockStep, mockContext, "My Project!"),
			).rejects.toThrow("does not match required pattern");
		});
	});

	describe("boolean validation", () => {
		it("should accept boolean values", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Enable feature?",
				responseType: "boolean",
				responseVariable: "feature_enabled",
			};

			let result = await handler.executeStep(mockStep, mockContext, true);
			expect(result.output).toEqual({ feature_enabled: true });

			result = await handler.executeStep(mockStep, mockContext, false);
			expect(result.output).toEqual({ feature_enabled: false });
		});

		it("should parse string boolean values", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Enable feature?",
				responseType: "boolean",
				responseVariable: "feature_enabled",
			};

			let result = await handler.executeStep(mockStep, mockContext, "true");
			expect(result.output).toEqual({ feature_enabled: true });

			result = await handler.executeStep(mockStep, mockContext, "false");
			expect(result.output).toEqual({ feature_enabled: false });

			result = await handler.executeStep(mockStep, mockContext, "yes");
			expect(result.output).toEqual({ feature_enabled: true });

			result = await handler.executeStep(mockStep, mockContext, "no");
			expect(result.output).toEqual({ feature_enabled: false });
		});

		it("should reject invalid boolean values", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Enable feature?",
				responseType: "boolean",
				responseVariable: "feature_enabled",
			};

			await expect(
				handler.executeStep(mockStep, mockContext, "invalid"),
			).rejects.toThrow("must be a boolean value");
		});
	});

	describe("number validation", () => {
		it("should accept valid numbers", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Enter count",
				responseType: "number",
				responseVariable: "item_count",
			};

			let result = await handler.executeStep(mockStep, mockContext, 42);
			expect(result.output).toEqual({ item_count: 42 });

			result = await handler.executeStep(mockStep, mockContext, 3.14);
			expect(result.output).toEqual({ item_count: 3.14 });
		});

		it("should parse string numbers", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Enter count",
				responseType: "number",
				responseVariable: "item_count",
			};

			const result = await handler.executeStep(mockStep, mockContext, "42");
			expect(result.output).toEqual({ item_count: 42 });
		});

		it("should enforce min value", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Enter count",
				responseType: "number",
				responseVariable: "item_count",
				validation: {
					min: 10,
				},
			};

			await expect(
				handler.executeStep(mockStep, mockContext, 5),
			).rejects.toThrow("at least 10");
		});

		it("should enforce max value", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Enter count",
				responseType: "number",
				responseVariable: "item_count",
				validation: {
					max: 100,
				},
			};

			await expect(
				handler.executeStep(mockStep, mockContext, 150),
			).rejects.toThrow("at most 100");
		});

		it("should reject invalid numbers", async () => {
			mockStep.config = {
				type: "ask-user",
				question: "Enter count",
				responseType: "number",
				responseVariable: "item_count",
			};

			await expect(
				handler.executeStep(mockStep, mockContext, "not-a-number"),
			).rejects.toThrow("must be a valid number");
		});
	});
});
