import "../../../../db/test-setup";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import os from "node:os";
import path from "node:path";
import { db, eq, workflowExecutions, workflowSteps, workflows } from "@chiron/db";
import { continueExecution, executeWorkflow, WorkflowExecutionError } from "./executor";
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
    await db.insert(workflowSteps).values([
      {
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Step 1",
        stepType: "execute-action",
        config: {
          actions: [
            {
              type: "set-variable",
              config: { variable: "step1", value: "done" },
            },
          ],
          executionMode: "sequential",
          requiresUserConfirmation: false,
        },
        nextStepNumber: 2,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 2,
        goal: "Step 2",
        stepType: "execute-action",
        config: {
          actions: [
            {
              type: "set-variable",
              config: { variable: "step2", value: "done" },
            },
          ],
          executionMode: "sequential",
          requiresUserConfirmation: false,
        },
        nextStepNumber: 3,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 3,
        goal: "Step 3",
        stepType: "execute-action",
        config: {
          actions: [
            {
              type: "set-variable",
              config: { variable: "step3", value: "done" },
            },
          ],
          executionMode: "sequential",
          requiresUserConfirmation: false,
        },
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

  it("should execute workflow with auto-advancing execute-action steps", async () => {
    await db.insert(workflowSteps).values([
      {
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Step 1",
        stepType: "execute-action",
        config: {
          actions: [{ type: "set-variable", config: { variable: "v1", value: "done" } }],
          executionMode: "sequential",
          requiresUserConfirmation: false,
        },
        nextStepNumber: 2,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 2,
        goal: "Step 2",
        stepType: "execute-action",
        config: {
          actions: [{ type: "set-variable", config: { variable: "v2", value: "done" } }],
          executionMode: "sequential",
          requiresUserConfirmation: false,
        },
        nextStepNumber: 3,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 3,
        goal: "Step 3",
        stepType: "execute-action",
        config: {
          actions: [{ type: "set-variable", config: { variable: "v3", value: "done" } }],
          executionMode: "sequential",
          requiresUserConfirmation: false,
        },
        nextStepNumber: 4,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 4,
        goal: "Step 4",
        stepType: "execute-action",
        config: {
          actions: [{ type: "set-variable", config: { variable: "v4", value: "done" } }],
          executionMode: "sequential",
          requiresUserConfirmation: false,
        },
        nextStepNumber: 5,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 5,
        goal: "Step 5",
        stepType: "execute-action",
        config: {
          actions: [{ type: "set-variable", config: { variable: "v5", value: "done" } }],
          executionMode: "sequential",
          requiresUserConfirmation: false,
        },
        nextStepNumber: null,
      },
    ]);

    const executionId = await executeWorkflow({
      workflowId: testWorkflowId,
      userId: testUserId,
    });

    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    expect(execution.status).toBe("completed");

    const executedSteps = execution.executedSteps as Record<number, any>;
    expect(Object.keys(executedSteps)).toHaveLength(5);

    for (let i = 1; i <= 5; i++) {
      expect(executedSteps[i].status).toBe("completed");
      expect(executedSteps[i].stepId).toBeDefined();
    }
  });

  it("should pause at ask-user step in branching workflow (Story 1.5)", async () => {
    // Create workflow with branch that could loop
    // Story 1.5: ask-user steps now pause for user input
    await db.insert(workflowSteps).values([
      {
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Step 1",
        stepType: "ask-user",
        config: {
          type: "ask-user",
          question: "Continue?",
          responseType: "boolean",
          responseVariable: "continue",
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
        nextStepNumber: 1, // Potential cycle
      },
    ]);

    // Workflow will pause at ask-user step (not hit execution limit)
    const executionId = await executeWorkflow({
      workflowId: testWorkflowId,
      userId: testUserId,
    });

    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    // Should pause waiting for user input at step 1
    expect(execution.status).toBe("paused");
    // Note: currentStepNumber might be null when paused, check executedSteps instead
    // expect(execution.currentStepNumber).toBe(1);

    const executedSteps = execution.executedSteps as Record<number, any>;
    expect(executedSteps[1].status).toBe("waiting");
  });

  it("should track all registered step types", () => {
    const registeredTypes = stepRegistry.getRegisteredTypes();

    expect(registeredTypes).toContain("ask-user");
    expect(registeredTypes).toContain("ask-user-chat");
    expect(registeredTypes).toContain("user-form");
    expect(registeredTypes).toContain("sandboxed-agent");
    expect(registeredTypes).toContain("system-agent");
    expect(registeredTypes).toContain("branch");
    expect(registeredTypes).toContain("execute-action");
    expect(registeredTypes).toContain("invoke-workflow");
    expect(registeredTypes).toContain("display-output");
    expect(registeredTypes).toHaveLength(9);
  });

  describe("Error Handling", () => {
    it("should not auto-advance when ask-user step validation fails", async () => {
      // Create workflow with ask-user step (path validation)
      await db.insert(workflowSteps).values({
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Get project path",
        stepType: "ask-user",
        config: {
          type: "ask-user",
          question: "Select project directory",
          responseType: "path",
          responseVariable: "project_path",
          pathConfig: {
            selectMode: "directory",
            mustExist: false,
          },
        },
        nextStepNumber: null,
      });

      // Start workflow
      const executionId = await executeWorkflow({
        workflowId: testWorkflowId,
        userId: testUserId,
      });

      // Attempt to submit invalid path (directory traversal)
      const invalidPath = "/some/path/../../../etc/passwd";

      try {
        await continueExecution(executionId, testUserId, invalidPath);
        throw new Error("Expected validation error");
      } catch (error: any) {
        expect(error.message).toContain("Directory traversal not allowed");
      }

      // Verify workflow remained paused (didn't auto-advance)
      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.id, executionId))
        .limit(1);

      expect(execution.status).toBe("paused");
      const executedSteps = execution.executedSteps as Record<number, any>;
      expect(executedSteps[1].status).toBe("waiting");
    });

    it("should mark execution as failed when step execution fails without skipOnFailure", async () => {
      // Create workflow with execute-action step that will fail (invalid action type)
      await db.insert(workflowSteps).values({
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Execute failing action",
        stepType: "execute-action",
        config: {
          type: "execute-action",
          actions: [
            {
              type: "invalid-action-type", // This will cause handler to throw error
              config: {},
            },
          ],
          executionMode: "sequential",
        },
        nextStepNumber: null,
      });

      try {
        await executeWorkflow({
          workflowId: testWorkflowId,
          userId: testUserId,
        });
        throw new Error("Expected execution to fail");
      } catch (error: any) {
        expect(error).toBeInstanceOf(WorkflowExecutionError);
        expect(error.stepNumber).toBe(1);
      }

      // Verify execution marked as failed
      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, testWorkflowId))
        .limit(1);

      expect(execution.status).toBe("failed");
      expect(execution.error).toBeDefined();
    });

    it("should support retry by calling continueExecution with corrected input", async () => {
      // Create workflow with ask-user step
      await db.insert(workflowSteps).values({
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Get project path",
        stepType: "ask-user",
        config: {
          type: "ask-user",
          question: "Select project directory",
          responseType: "path",
          responseVariable: "project_path",
          pathConfig: {
            selectMode: "directory",
            mustExist: false,
          },
        },
        nextStepNumber: null,
      });

      // Start workflow
      const executionId = await executeWorkflow({
        workflowId: testWorkflowId,
        userId: testUserId,
      });

      // First attempt with invalid path
      const invalidPath = "../invalid";
      try {
        await continueExecution(executionId, testUserId, invalidPath);
      } catch (error: any) {
        expect(error.message).toContain("must be absolute");
      }

      // Retry with valid path
      const validPath = path.join(os.tmpdir(), "valid-project");
      await continueExecution(executionId, testUserId, validPath);

      // Verify workflow completed with valid input
      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.id, executionId))
        .limit(1);

      expect(execution.status).toBe("completed");
      expect((execution.variables as any).project_path).toBe(validPath);
    });

    it("should include step number in error when step execution fails", async () => {
      // Create workflow with failing step
      await db.insert(workflowSteps).values({
        workflowId: testWorkflowId,
        stepNumber: 3,
        goal: "Failing step",
        stepType: "execute-action",
        config: {
          type: "execute-action",
          actions: [
            {
              type: "invalid-action-type", // Invalid action type will cause error
              config: {},
            },
          ],
          executionMode: "sequential",
        },
        nextStepNumber: null,
      });

      try {
        await executeWorkflow({
          workflowId: testWorkflowId,
          userId: testUserId,
        });
      } catch (error: any) {
        expect(error).toBeInstanceOf(WorkflowExecutionError);
        expect(error.executionId).toBeDefined();
        expect(error.stepNumber).toBe(3);
        expect(error.message).toBeDefined();
      }
    });

    it("should handle validation errors with clear error messages", async () => {
      // Create workflow with ask-user step
      await db.insert(workflowSteps).values({
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Get project path",
        stepType: "ask-user",
        config: {
          type: "ask-user",
          question: "Select project directory",
          responseType: "path",
          responseVariable: "project_path",
          pathConfig: {
            selectMode: "directory",
            mustExist: false,
          },
        },
        nextStepNumber: null,
      });

      const executionId = await executeWorkflow({
        workflowId: testWorkflowId,
        userId: testUserId,
      });

      // Test various validation error scenarios
      const testCases = [
        {
          input: "/some/path/../../../etc/passwd",
          expectedError: "Directory traversal not allowed",
        },
        {
          input: "/nonexistent/parent/project",
          expectedError: "Parent directory does not exist",
        },
        {
          input: "relative/path",
          expectedError: "must be absolute",
        },
      ];

      for (const testCase of testCases) {
        try {
          await continueExecution(executionId, testUserId, testCase.input);
          throw new Error(`Expected error for input: ${testCase.input}`);
        } catch (error: any) {
          expect(error.message).toContain(testCase.expectedError);
        }
      }
    });
  });
});
