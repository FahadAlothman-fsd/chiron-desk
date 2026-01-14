import "../../../../db/test-setup";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { db, eq, workflowSteps, workflows } from "@chiron/db";
import { loadWorkflow, WorkflowValidationError } from "./workflow-loader";

describe("Workflow Loader", () => {
  let testWorkflowId: string;

  beforeEach(async () => {
    // Create a test workflow
    const [workflow] = await db
      .insert(workflows)
      .values({
        name: "test-workflow-loader",
        displayName: "Test Workflow Loader",
        description: "Test workflow for loader validation",
      })
      .returning();

    testWorkflowId = workflow.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(workflows).where(eq(workflows.id, testWorkflowId));
  });

  it("should load workflow with 0 steps (empty workflow)", async () => {
    const result = await loadWorkflow(testWorkflowId);

    expect(result.workflow.id).toBe(testWorkflowId);
    expect(result.steps).toHaveLength(0);
  });

  it("should load workflow with steps sorted by stepNumber", async () => {
    // Insert steps out of order
    await db.insert(workflowSteps).values([
      {
        workflowId: testWorkflowId,
        stepNumber: 3,
        goal: "Step 3",
        stepType: "display-output",
        config: { outputTemplate: "Step 3", outputType: "info" },
        nextStepNumber: null,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Step 1",
        stepType: "ask-user",
        config: {
          question: "Test?",
          inputType: "text",
          storeAs: "test",
        },
        nextStepNumber: 2,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 2,
        goal: "Step 2",
        stepType: "display-output",
        config: { outputTemplate: "Step 2", outputType: "info" },
        nextStepNumber: 3,
      },
    ]);

    const result = await loadWorkflow(testWorkflowId);

    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].stepNumber).toBe(1);
    expect(result.steps[1].stepNumber).toBe(2);
    expect(result.steps[2].stepNumber).toBe(3);
  });

  it("should allow gaps in step numbers with warning", async () => {
    // Create workflow with gaps: 1, 3, 5
    await db.insert(workflowSteps).values([
      {
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Step 1",
        stepType: "ask-user",
        config: {
          question: "Test?",
          inputType: "text",
          storeAs: "test",
        },
        nextStepNumber: 3,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 3,
        goal: "Step 3",
        stepType: "display-output",
        config: { outputTemplate: "Step 3", outputType: "info" },
        nextStepNumber: 5,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 5,
        goal: "Step 5",
        stepType: "display-output",
        config: { outputTemplate: "Step 5", outputType: "info" },
        nextStepNumber: null,
      },
    ]);

    // Should not throw - gaps are allowed
    const result = await loadWorkflow(testWorkflowId);
    expect(result.steps).toHaveLength(3);
  });

  it("should throw error for invalid nextStepNumber reference", async () => {
    await db.insert(workflowSteps).values([
      {
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Step 1",
        stepType: "ask-user",
        config: {
          question: "Test?",
          inputType: "text",
          storeAs: "test",
        },
        nextStepNumber: 999, // Invalid reference
      },
    ]);

    await expect(loadWorkflow(testWorkflowId)).rejects.toThrow(WorkflowValidationError);
    await expect(loadWorkflow(testWorkflowId)).rejects.toThrow(
      "Step 1 references invalid nextStepNumber: 999",
    );
  });

  it("should throw error for cycle without branch steps", async () => {
    // Create cycle: 1 -> 2 -> 3 -> 1
    await db.insert(workflowSteps).values([
      {
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Step 1",
        stepType: "display-output",
        config: { outputTemplate: "Step 1", outputType: "info" },
        nextStepNumber: 2,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 2,
        goal: "Step 2",
        stepType: "display-output",
        config: { outputTemplate: "Step 2", outputType: "info" },
        nextStepNumber: 3,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 3,
        goal: "Step 3",
        stepType: "display-output",
        config: { outputTemplate: "Step 3", outputType: "info" },
        nextStepNumber: 1, // Creates cycle
      },
    ]);

    await expect(loadWorkflow(testWorkflowId)).rejects.toThrow(WorkflowValidationError);
    await expect(loadWorkflow(testWorkflowId)).rejects.toThrow(
      "Cycle detected in workflow without branch steps",
    );
  });

  it("should allow cycle with branch steps (state machine pattern)", async () => {
    // Create cycle with branch: 1 -> 2 -> 1, but step 2 is a branch
    await db.insert(workflowSteps).values([
      {
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Step 1",
        stepType: "ask-user",
        config: {
          question: "Continue?",
          inputType: "boolean",
          storeAs: "continue",
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
        nextStepNumber: 1, // Cycle back
      },
    ]);

    // Should not throw - cycle with branch is allowed (state machine)
    const result = await loadWorkflow(testWorkflowId);
    expect(result.steps).toHaveLength(2);
  });

  it("should throw error for duplicate step numbers", async () => {
    await db.insert(workflowSteps).values([
      {
        workflowId: testWorkflowId,
        stepNumber: 1,
        goal: "Step 1a",
        stepType: "display-output",
        config: { outputTemplate: "Step 1a", outputType: "info" },
        nextStepNumber: 2,
      },
      {
        workflowId: testWorkflowId,
        stepNumber: 1, // Duplicate!
        goal: "Step 1b",
        stepType: "display-output",
        config: { outputTemplate: "Step 1b", outputType: "info" },
        nextStepNumber: 2,
      },
    ]);

    await expect(loadWorkflow(testWorkflowId)).rejects.toThrow(WorkflowValidationError);
    await expect(loadWorkflow(testWorkflowId)).rejects.toThrow(
      "Duplicate step numbers found in workflow",
    );
  });

  it("should throw error for non-existent workflow", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";

    await expect(loadWorkflow(fakeId)).rejects.toThrow(WorkflowValidationError);
    await expect(loadWorkflow(fakeId)).rejects.toThrow(`Workflow not found: ${fakeId}`);
  });
});
