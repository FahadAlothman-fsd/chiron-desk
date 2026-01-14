import { beforeEach, describe, expect, it } from "bun:test";
import type { ExecuteActionStepConfig, WorkflowStep } from "@chiron/db";
import type { ExecutionContext } from "../execution-context";
import { ExecuteActionStepHandler } from "./execute-action-handler";

describe("ExecuteActionStepHandler", () => {
  let handler: ExecuteActionStepHandler;
  let mockContext: ExecutionContext;
  let mockStep: WorkflowStep;

  beforeEach(() => {
    handler = new ExecuteActionStepHandler();

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
      stepNumber: 1,
      goal: "Test step",
      stepType: "execute-action",
      config: {
        type: "execute-action",
        actions: [],
        executionMode: "sequential",
      } as ExecuteActionStepConfig,
      nextStepNumber: 2,
      createdAt: new Date(),
    };
  });

  describe("set-variable with literal value", () => {
    it("should set simple variable without requiring confirmation", async () => {
      mockStep.config = {
        type: "execute-action",
        actions: [
          {
            type: "set-variable",
            config: {
              variable: "detected_field_type",
              value: "greenfield",
            },
          },
        ],
        executionMode: "sequential",
        requiresUserConfirmation: false, // No confirmation needed
      };

      const result = await handler.executeStep(mockStep, mockContext);

      expect(result.output).toEqual({
        detected_field_type: "greenfield",
      });
      expect(result.requiresUserInput).toBe(false);
      expect(result.nextStepNumber).toBe(2);
    });

    it("should set nested variable", async () => {
      mockStep.config = {
        type: "execute-action",
        actions: [
          {
            type: "set-variable",
            config: {
              variable: "metadata.complexity",
              value: "high",
            },
          },
        ],
        executionMode: "sequential",
      };

      const result = await handler.executeStep(mockStep, mockContext);

      expect(result.output).toEqual({
        metadata: {
          complexity: "high",
        },
      });
    });
  });

  describe("set-variable with variable reference", () => {
    it("should resolve variable references", async () => {
      mockContext.executionVariables = {
        project_path: "/home/user/my-project",
      };

      mockStep.config = {
        type: "execute-action",
        actions: [
          {
            type: "set-variable",
            config: {
              variable: "src_path",
              value: "{{project_path}}/src",
            },
          },
        ],
        executionMode: "sequential",
      };

      const result = await handler.executeStep(mockStep, mockContext);

      expect(result.output).toEqual({
        src_path: "/home/user/my-project/src",
      });
    });

    it("should resolve system variables", async () => {
      mockStep.config = {
        type: "execute-action",
        actions: [
          {
            type: "set-variable",
            config: {
              variable: "project_ref",
              value: "Project {{project_id}} by user {{current_user_id}}",
            },
          },
        ],
        executionMode: "sequential",
      };

      const result = await handler.executeStep(mockStep, mockContext);

      expect(result.output).toEqual({
        project_ref: "Project test-project-id by user test-user-id",
      });
    });
  });

  describe("sequential execution mode", () => {
    it("should execute actions in order with cumulative context", async () => {
      mockStep.config = {
        type: "execute-action",
        actions: [
          {
            type: "set-variable",
            config: {
              variable: "first_var",
              value: "first_value",
            },
          },
          {
            type: "set-variable",
            config: {
              variable: "second_var",
              value: "second_value",
            },
          },
        ],
        executionMode: "sequential",
      };

      const result = await handler.executeStep(mockStep, mockContext);

      expect(result.output).toEqual({
        first_var: "first_value",
        second_var: "second_value",
      });
    });
  });

  describe("error handling", () => {
    it("should throw error for unknown action type", async () => {
      mockStep.config = {
        type: "execute-action",
        actions: [
          {
            type: "unknown-action" as any,
            config: {},
          },
        ],
        executionMode: "sequential",
      };

      await expect(handler.executeStep(mockStep, mockContext)).rejects.toThrow(
        "Unknown action type: unknown-action",
      );
    });

    it("should include action index in error message", async () => {
      mockStep.config = {
        type: "execute-action",
        actions: [
          {
            type: "set-variable",
            config: {
              variable: "valid_var",
              value: "valid_value",
            },
          },
          {
            type: "unknown-action" as any,
            config: {},
          },
        ],
        executionMode: "sequential",
      };

      await expect(handler.executeStep(mockStep, mockContext)).rejects.toThrow(
        "Action unknown-action failed at step index 1",
      );
    });
  });

  describe("parallel execution mode", () => {
    it("should execute actions in parallel", async () => {
      mockStep.config = {
        type: "execute-action",
        actions: [
          {
            type: "set-variable",
            config: {
              variable: "parallel_var1",
              value: "value1",
            },
          },
          {
            type: "set-variable",
            config: {
              variable: "parallel_var2",
              value: "value2",
            },
          },
        ],
        executionMode: "parallel",
      };

      const result = await handler.executeStep(mockStep, mockContext);

      expect(result.output).toEqual({
        parallel_var1: "value1",
        parallel_var2: "value2",
      });
    });
  });

  describe("idempotent execution", () => {
    it("should produce same output for same input", async () => {
      mockStep.config = {
        type: "execute-action",
        actions: [
          {
            type: "set-variable",
            config: {
              variable: "detected_field_type",
              value: "greenfield",
            },
          },
        ],
        executionMode: "sequential",
      };

      const result1 = await handler.executeStep(mockStep, mockContext);
      const result2 = await handler.executeStep(mockStep, mockContext);

      expect(result1).toEqual(result2);
    });
  });
});
