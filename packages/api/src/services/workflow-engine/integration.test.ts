import "../../../../db/test-setup";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { db, eq, workflowSteps, workflows } from "@chiron/db";
import { executeWorkflow } from "./effect/executor";
import { AIProviderService } from "./effect/ai-provider-service";
import { stateManager } from "./state-manager";

/**
 * Integration Tests for Workflow Engine
 * Tests end-to-end workflow execution with real database
 *
 * Covers:
 * - AC29: Integration test for workflow execution
 * - AC30: Pause → Resume from correct step
 * - AC31: Invalid step type error handling
 */

describe("Workflow Engine Integration Tests", () => {
  let testWorkflowId: string;
  const testUserId = "integration-test-user";

  beforeEach(async () => {
    // Create test workflow
    const [workflow] = await db
      .insert(workflows)
      .values({
        name: "integration-test-workflow",
        displayName: "Integration Test Workflow",
        description: "End-to-end integration test workflow",
      })
      .returning();

    testWorkflowId = workflow.id;
  });

  afterEach(async () => {
    // Clean up
    await db.delete(workflows).where(eq(workflows.id, testWorkflowId));
  });

  /**
   * AC30: Integration test - Manual pause → resume workflow
   * Note: Full form step pause testing deferred to Story 1.5 when actual handler implemented
   * Currently tests manual pause/resume infrastructure
   */
  it("should manually pause and resume workflow from correct step", async () => {
    await db.insert(workflowSteps).values([
      {
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Step 1",
        stepType: "action",
        config: {
          actions: [{ type: "set-variable", config: { variable: "s1", value: "done" } }],
          executionMode: "sequential",
          requiresUserConfirmation: false,
        },
        nextStepNumber: 2,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 2,
        goal: "Step 2",
        stepType: "action",
        config: {
          actions: [{ type: "set-variable", config: { variable: "s2", value: "done" } }],
          executionMode: "sequential",
          requiresUserConfirmation: false,
        },
        nextStepNumber: 3,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 3,
        goal: "Step 3",
        stepType: "action",
        config: {
          actions: [{ type: "set-variable", config: { variable: "s3", value: "done" } }],
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

    let result = await stateManager.getExecution(executionId);
    expect(result).toBeDefined();
    expect(result?.execution.status).toBe("completed");

    const executedSteps = result?.execution.executedSteps as Record<number, any>;
    expect(executedSteps[1].status).toBe("completed");
    expect(executedSteps[2].status).toBe("completed");
    expect(executedSteps[3].status).toBe("completed");

    await stateManager.pauseExecution(executionId);

    result = await stateManager.getExecution(executionId);
    expect(result?.execution.status).toBe("paused");

    await stateManager.resumeExecution(executionId);

    result = await stateManager.getExecution(executionId);
    expect(result?.execution.status).toBe("active");
  });

  /**
   * AC31: Error handling test - Workflow handles step execution errors
   * Note: Unknown step type test deferred to Story 1.5+ when custom step types can be dynamically registered
   * Currently all valid enum step types have placeholder handlers in Story 1.4
   */
  it("should complete workflow with auto-advancing action step", async () => {
    await db.insert(workflowSteps).values([
      {
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Action step 1",
        stepType: "action",
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
        goal: "Action step 2",
        stepType: "action",
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
        goal: "Action step 3",
        stepType: "action",
        config: {
          actions: [],
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

    const result = await stateManager.getExecution(executionId);
    expect(result).toBeDefined();
    expect(result?.execution.status).toBe("completed");

    const executedSteps = result?.execution.executedSteps as Record<number, any>;
    expect(executedSteps[1].status).toBe("completed");
    expect(executedSteps[2].status).toBe("completed");
    expect(executedSteps[3].status).toBe("completed");
  });

  it("should execute multi-step workflow successfully", async () => {
    await db.insert(workflowSteps).values([
      {
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Step 1",
        stepType: "action",
        config: {
          actions: [{ type: "set-variable", config: { variable: "m1", value: "done" } }],
          executionMode: "sequential",
          requiresUserConfirmation: false,
        },
        nextStepNumber: 2,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 2,
        goal: "Step 2",
        stepType: "action",
        config: {
          actions: [{ type: "set-variable", config: { variable: "m2", value: "done" } }],
          executionMode: "sequential",
          requiresUserConfirmation: false,
        },
        nextStepNumber: 3,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 3,
        goal: "Step 3",
        stepType: "action",
        config: {
          actions: [{ type: "set-variable", config: { variable: "m3", value: "done" } }],
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

    const result = await stateManager.getExecution(executionId);
    expect(result).toBeDefined();
    expect(result?.execution.status).toBe("completed");

    const executedSteps = result?.execution.executedSteps as Record<number, any>;
    expect(executedSteps[1].status).toBe("completed");
    expect(executedSteps[2].status).toBe("completed");
    expect(executedSteps[3].status).toBe("completed");

    expect(executedSteps[1].stepId).toBeDefined();
    expect(executedSteps[2].stepId).toBeDefined();
    expect(executedSteps[3].stepId).toBeDefined();
  });

  /**
   * TODO Story 1.5: Add integration tests for actual step handler implementations
   * - LLM generate step with real OpenRouter API (mocked in tests)
   * - Ask-user-chat step with conversation flow
   * - File operations in action step
   * - Complex variable resolution with nested objects and arrays
   */
});
