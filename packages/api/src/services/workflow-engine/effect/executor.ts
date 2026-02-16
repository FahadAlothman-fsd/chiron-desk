import { db, eq, workflowExecutions } from "@chiron/db";
import { Effect, Layer } from "effect";
import { workflowEventBus as legacyEventBus } from "../event-bus";
import { stateManager } from "../state-manager";
import { loadWorkflow } from "../workflow-loader";
import { AIProviderServiceLive } from "@chiron/agent-runtime/ai-sdk/ai-provider-service";
import { AiRuntimeServiceLive } from "@chiron/agent-runtime/ai-sdk/ai-runtime-service";
import { AgentRuntimeDefault } from "@chiron/agent-runtime/runtime";
import { ApprovalServiceLive } from "./approval-service";
import { ChatServiceLive } from "./chat-service";
import { ConfigServiceLive } from "./config-service";
import { DatabaseServiceLive } from "./database-service";
import { MaxStepsExceededError, UnknownStepTypeError } from "./errors";
import { WorkflowEventBusSingletonLive } from "./event-bus";
import { ExecutionContextLive, type ExecutionState } from "./execution-context";
import { AllHandlerLayers, StepHandlerRegistry, StepHandlerRegistryLive } from "./step-registry";
import { ToolApprovalGatewayLive } from "./tool-approval-gateway";
import { VariableServiceLive } from "./variable-service";
import { validateWorkflowDecodeBoundary } from "./decode-boundary";

/**
 * Maximum step executions per workflow (prevents infinite loops)
 */
const MAX_STEP_EXECUTIONS = 100;

/**
 * Workflow Executor - Effect-based execution with full production support
 * Migrated from legacy executor.ts to use Effect services and handlers
 */

export class WorkflowExecutionError extends Error {
  constructor(
    message: string,
    public executionId: string,
    public stepNumber?: number,
  ) {
    super(message);
    this.name = "WorkflowExecutionError";
  }
}

/**
 * Create the Effect runtime layer with all required services
 */
const createWorkflowLayer = (initialState: ExecutionState) => {
  const coreLayer = Layer.mergeAll(
    DatabaseServiceLive,
    ExecutionContextLive(initialState),
    WorkflowEventBusSingletonLive,
  );

  const configLayer = ConfigServiceLive.pipe(Layer.provide(coreLayer));
  const providerLayer = AIProviderServiceLive.pipe(Layer.provide(configLayer));
  const runtimeLayer = AiRuntimeServiceLive.pipe(Layer.provide(providerLayer));
  const agentRuntimeLayer = AgentRuntimeDefault.pipe(
    Layer.provide(runtimeLayer),
    Layer.provide(providerLayer),
  );
  const aiLayer = Layer.mergeAll(providerLayer, runtimeLayer, agentRuntimeLayer);
  const approvalLayer = Layer.mergeAll(ApprovalServiceLive, ToolApprovalGatewayLive).pipe(
    Layer.provide(coreLayer),
  );
  const variableLayer = VariableServiceLive.pipe(Layer.provide(coreLayer));
  const chatLayer = ChatServiceLive.pipe(Layer.provide(coreLayer));

  const baseLayer = Layer.mergeAll(
    coreLayer,
    configLayer,
    aiLayer,
    approvalLayer,
    variableLayer,
    chatLayer,
  );

  const handlerLayer = AllHandlerLayers.pipe(Layer.provide(baseLayer));
  const registryLayer = StepHandlerRegistryLive.pipe(
    Layer.provide(Layer.mergeAll(baseLayer, handlerLayer)),
  );

  return Layer.mergeAll(baseLayer, handlerLayer, registryLayer);
};

/**
 * Execute a workflow
 * @param workflowId - UUID of the workflow to execute
 * @param userId - User ID executing the workflow
 * @param projectId - Optional project ID (null for workflow-init)
 * @returns Execution ID
 */
export async function executeWorkflow(params: {
  workflowId: string;
  userId: string;
  projectId?: string;
  initialVariables?: Record<string, unknown>;
  parentExecutionId?: string;
}): Promise<string> {
  // Load workflow and steps
  const { workflow, steps } = await loadWorkflow(params.workflowId);
  await validateWorkflowDecodeBoundary({
    workflowId: workflow.id,
    workflowName: workflow.displayName,
    steps,
  });

  // Story 2.1: Get agentId from metadata JSONB field instead of column
  const metadata = workflow.metadata as { agentId?: string } | null;
  const agentId = metadata?.agentId || null;

  // Create execution record with initial variables (for child workflows inheriting parent state)
  const [execution] = await db
    .insert(workflowExecutions)
    .values({
      workflowId: params.workflowId,
      projectId: params.projectId || null,
      agentId: agentId,
      parentExecutionId: params.parentExecutionId || null,
      status: "active",
      variables: params.initialVariables || {},
      executedSteps: {},
      startedAt: new Date(),
    })
    .returning();

  if (!execution) {
    throw new Error("Failed to create execution record");
  }

  const executionId = execution.id;

  try {
    // Emit workflow_started event via legacy event bus (for tRPC subscriptions)
    legacyEventBus.emitWorkflowStarted(executionId, params.workflowId, params.userId);

    // Handle empty workflow (0 steps) - immediate completion
    if (steps.length === 0) {
      await completeExecution(executionId);
      legacyEventBus.emitWorkflowCompleted(executionId);
      return executionId;
    }

    // Start execution loop from step 1
    await continueExecution(executionId, params.userId);

    return executionId;
  } catch (error) {
    // Handle execution errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStep = error instanceof WorkflowExecutionError ? error.stepNumber : undefined;

    await failExecution(executionId, errorMessage);
    legacyEventBus.emitWorkflowError(executionId, errorMessage, errorStep);
    throw error;
  }
}

/**
 * Continue execution from current step
 * Used for resuming paused workflows and processing user input
 */
export async function continueExecution(
  executionId: string,
  userId: string,
  initialUserInput?: unknown,
): Promise<void> {
  let currentUserInput = initialUserInput;
  console.log("[Effect Executor] continueExecution called with userInput:", currentUserInput);

  // Load execution state
  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.id, executionId))
    .limit(1);

  if (!execution) {
    throw new WorkflowExecutionError("Execution not found", executionId);
  }

  // Load workflow and steps
  const { steps } = await loadWorkflow(execution.workflowId);
  await validateWorkflowDecodeBoundary({
    workflowId: execution.workflowId,
    workflowName: null,
    steps,
  });

  if (steps.length === 0) {
    await completeExecution(executionId);
    return;
  }

  let currentStepNumber: number | null = 1;
  const executedSteps = execution.executedSteps as Record<number, any>;

  // Find steps that are truly completed (not waiting)
  const completedStepNumbers = Object.keys(executedSteps)
    .map(Number)
    .filter((stepNum) => executedSteps[stepNum].status === "completed")
    .toSorted((a, b) => b - a);

  // Check if there's a waiting step
  const waitingStepNumbers = Object.keys(executedSteps)
    .map(Number)
    .filter((stepNum) => executedSteps[stepNum].status === "waiting")
    .toSorted((a, b) => a - b); // Oldest waiting step first

  if (waitingStepNumbers.length > 0) {
    // Resume from the waiting step (user is submitting input for it)
    currentStepNumber = waitingStepNumbers[0];
    console.log(
      `[Effect Executor] Found waiting step ${currentStepNumber}, resuming with user input`,
    );
  } else if (completedStepNumbers.length > 0) {
    // No waiting steps, continue from last completed
    const lastCompletedStep = completedStepNumbers[0];
    const lastStep = steps.find((s) => s.stepNumber === lastCompletedStep);
    currentStepNumber = lastStep?.nextStepNumber || lastCompletedStep + 1;
    console.log(
      `[Effect Executor] Last completed step: ${lastCompletedStep}, continuing to step ${currentStepNumber}`,
    );
  } else {
    console.log("[Effect Executor] No completed or waiting steps, starting from step 1");
  }

  // Execute steps sequentially
  let stepExecutionCount = 0;

  while (currentStepNumber !== null) {
    // Increment counter at the START of each iteration
    stepExecutionCount++;

    // Check execution limit BEFORE executing step
    if (stepExecutionCount > MAX_STEP_EXECUTIONS) {
      const errorMessage = `Workflow execution limit reached (${MAX_STEP_EXECUTIONS} steps). Possible infinite loop.`;
      await failExecution(executionId, errorMessage);
      throw new WorkflowExecutionError(errorMessage, executionId);
    }

    // Find current step
    const currentStep = steps.find((s) => s.stepNumber === currentStepNumber);

    if (!currentStep) {
      // No more steps - workflow complete
      await completeExecution(executionId);
      return;
    }

    // Reload execution to get fresh variables (in case previous step updated them)
    const [freshExecution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    if (!freshExecution) {
      throw new WorkflowExecutionError("Execution not found during context build", executionId);
    }

    console.log(`[Effect Executor] Reloaded execution for step ${currentStepNumber}`);

    // Build Effect execution context
    const initialState: ExecutionState = {
      executionId,
      workflowId: freshExecution.workflowId,
      projectId: freshExecution.projectId ?? undefined,
      parentExecutionId: freshExecution.parentExecutionId ?? null,
      userId,
      variables: freshExecution.variables as Record<string, unknown>,
      currentStepNumber,
    };

    // Execute step using Effect
    try {
      // Emit step_started event
      legacyEventBus.emitStepStarted(executionId, currentStep.stepNumber);

      const stepExecution = await stateManager.startStepExecution({
        executionId,
        stepId: currentStep.id,
        stepNumber: currentStep.stepNumber,
      });

      // Create the Effect program to execute this step
      const stepProgram = Effect.gen(function* () {
        const registry = yield* StepHandlerRegistry;

        // Get handler for step type
        const handler = yield* registry.getHandler(currentStep.stepType);

        // Execute handler with step config and user input
        const result = yield* handler({
          stepConfig: currentStep.config as Record<string, unknown>,
          variables: initialState.variables,
          executionId: executionId,
          workflowId: initialState.workflowId,
          stepId: currentStep.id,
          stepExecutionId: stepExecution.id,
          stepNumber: currentStep.stepNumber,
          stepGoal: currentStep.goal,
          stepType: currentStep.stepType,
          userInput: currentUserInput,
        });

        return result;
      });

      // Create layer with execution context
      const layer = Layer.mergeAll(DatabaseServiceLive, createWorkflowLayer(initialState));

      // Run the Effect program
      const result = await Effect.runPromise(stepProgram.pipe(Effect.provide(layer)));

      console.log(
        `[Effect Executor] Step ${currentStep.stepNumber} (${currentStep.stepType}) result:`,
        {
          hasResult: !!result.result,
          hasVariableUpdates: !!result.variableUpdates,
          requiresUserInput: result.requiresUserInput,
          nextStepOverride: result.nextStepOverride,
        },
      );

      // Check if step requires user input BEFORE saving
      if (result.requiresUserInput) {
        console.log(
          `[Effect Executor] Step ${currentStep.stepNumber} requires user input - pausing execution`,
        );

        const approvalState =
          (result.variableUpdates as Record<string, unknown> | undefined)?.approval_states ?? {};

        await stateManager.markStepExecutionWaiting({
          executionId,
          stepId: currentStep.id,
          variablesDelta: result.variableUpdates || {},
          approvalState: approvalState as Record<string, unknown>,
        });

        // Mark step as waiting (not completed yet) - SAVE OUTPUT
        await updateExecutedSteps(
          executionId,
          currentStep.stepNumber,
          currentStep.id,
          result.variableUpdates || {},
          "waiting",
        );

        // Merge output into execution variables
        if (result.variableUpdates) {
          await mergeExecutionVariables(executionId, result.variableUpdates);
        }

        // Pause execution - wait for user input submission
        await pauseExecution(executionId, currentStep.stepNumber);
        legacyEventBus.emitWorkflowPaused(executionId);
        return;
      }

      // Step completed without user input - save result
      const output = result.variableUpdates || {};
      const approvalState =
        (result.variableUpdates as Record<string, unknown> | undefined)?.approval_states ?? {};
      console.log(
        `[Effect Executor] Saving step ${currentStep.stepNumber} output:`,
        JSON.stringify(output, null, 2),
      );
      await updateExecutedSteps(
        executionId,
        currentStep.stepNumber,
        currentStep.id,
        output,
        "completed",
      );

      await stateManager.completeStepExecution({
        executionId,
        stepId: currentStep.id,
        variablesDelta: output,
        approvalState: approvalState as Record<string, unknown>,
      });

      // Merge output into execution variables
      if (result.variableUpdates) {
        console.log(
          `[Effect Executor] Merging output into execution variables for step ${currentStep.stepNumber}`,
        );
        await mergeExecutionVariables(executionId, result.variableUpdates);
        console.log(`[Effect Executor] ✓ Merge completed for step ${currentStep.stepNumber}`);
      }

      // Emit step_completed event
      legacyEventBus.emitStepCompleted(executionId, currentStep.stepNumber);

      console.log(
        `[Effect Executor] Step ${currentStep.stepNumber} completed - continuing to next step`,
      );

      // Determine next step
      currentStepNumber = result.nextStepOverride ?? currentStep.nextStepNumber;

      currentUserInput = undefined;
    } catch (error) {
      // Handle Effect errors
      if (error instanceof UnknownStepTypeError) {
        // Unknown step type - auto-advance using nextStepNumber
        console.warn(
          `Unknown step type at step ${currentStep.stepNumber}: ${currentStep.stepType}. Auto-advancing.`,
        );

        // Mark step as skipped
        await updateExecutedSteps(
          executionId,
          currentStep.stepNumber,
          currentStep.id,
          {},
          "skipped",
        );

        await stateManager.completeStepExecution({
          executionId,
          stepId: currentStep.id,
          variablesDelta: {},
          metadata: { skipped: true },
        });

        // Auto-advance
        currentStepNumber = currentStep.nextStepNumber;
        continue;
      }

      // Check for MaxStepsExceededError
      if (error instanceof MaxStepsExceededError) {
        const errorMessage = `Workflow execution limit reached (${MAX_STEP_EXECUTIONS} steps). Possible infinite loop.`;
        await failExecution(executionId, errorMessage);
        throw new WorkflowExecutionError(errorMessage, executionId);
      }

      // Check skipOnFailure config
      const config = currentStep.config as any;
      const skipOnFailure = config?.errorHandling?.skipOnFailure || false;

      if (skipOnFailure) {
        // Mark step as failed but continue
        console.warn(`Step ${currentStep.stepNumber} failed but skipOnFailure=true. Continuing.`);

        await updateExecutedSteps(
          executionId,
          currentStep.stepNumber,
          currentStep.id,
          {},
          "failed",
          error instanceof Error ? error.message : "Unknown error",
        );

        await stateManager.failStepExecution({
          executionId,
          stepId: currentStep.id,
          metadata: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });

        // Continue to next step
        currentStepNumber = currentStep.nextStepNumber;
        continue;
      }

      console.error("[WorkflowExecutor] Step failed", {
        executionId,
        stepNumber: currentStep.stepNumber,
        stepId: currentStep.id,
        stepType: currentStep.stepType,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      await stateManager.failStepExecution({
        executionId,
        stepId: currentStep.id,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });

      // Halt workflow on error
      throw new WorkflowExecutionError(
        error instanceof Error ? error.message : "Step execution failed",
        executionId,
        currentStep.stepNumber,
      );
    }
  }

  // If we exit loop without pause, workflow is complete
  await completeExecution(executionId);
  legacyEventBus.emitWorkflowCompleted(executionId);
}

/**
 * Update executedSteps JSONB field
 */
async function updateExecutedSteps(
  executionId: string,
  stepNumber: number,
  stepId: string,
  output: Record<string, unknown>,
  status: "completed" | "failed" | "skipped" | "waiting",
  error?: string,
): Promise<void> {
  // Fetch current executedSteps
  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.id, executionId))
    .limit(1);

  if (!execution) {
    throw new WorkflowExecutionError("Execution not found", executionId);
  }

  const executedSteps = (execution.executedSteps as Record<number, any>) || {};

  // Add/update step entry
  executedSteps[stepNumber] = {
    stepId,
    status,
    startedAt: executedSteps[stepNumber]?.startedAt || new Date().toISOString(),
    completedAt: status === "completed" ? new Date().toISOString() : undefined,
    output: status === "completed" || status === "waiting" ? output : undefined,
    error,
  };

  // Update database
  await db
    .update(workflowExecutions)
    .set({
      executedSteps,
      currentStepId: stepId,
      updatedAt: new Date(),
    })
    .where(eq(workflowExecutions.id, executionId));
}

/**
 * Merge step output into execution variables
 */
async function mergeExecutionVariables(
  executionId: string,
  output: Record<string, unknown>,
): Promise<void> {
  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.id, executionId))
    .limit(1);

  if (!execution) {
    throw new WorkflowExecutionError("Execution not found", executionId);
  }

  const variables = (execution.variables as Record<string, unknown>) || {};
  const merged = { ...variables, ...output };

  console.log("[mergeExecutionVariables] Current variables:", JSON.stringify(variables, null, 2));
  console.log("[mergeExecutionVariables] Output to merge:", JSON.stringify(output, null, 2));
  console.log("[mergeExecutionVariables] Merged result:", JSON.stringify(merged, null, 2));

  await db
    .update(workflowExecutions)
    .set({
      variables: merged,
      updatedAt: new Date(),
    })
    .where(eq(workflowExecutions.id, executionId));

  console.log(
    `[mergeExecutionVariables] ✓ Variables saved to database for execution ${executionId}`,
  );
}

/**
 * Pause execution
 */
async function pauseExecution(executionId: string, stepNumber: number): Promise<void> {
  console.log("[Effect Executor] pauseExecution called for:", executionId, "at step:", stepNumber);
  await db
    .update(workflowExecutions)
    .set({
      status: "paused",
      pausedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workflowExecutions.id, executionId));
  console.log("[Effect Executor] Execution paused successfully at step:", stepNumber);
}

/**
 * Complete execution
 */
async function completeExecution(executionId: string): Promise<void> {
  console.log("[Effect Executor] completeExecution called for:", executionId);
  await db
    .update(workflowExecutions)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workflowExecutions.id, executionId));
  console.log("[Effect Executor] Execution completed successfully");
}

/**
 * Fail execution
 */
async function failExecution(executionId: string, error: string): Promise<void> {
  await db
    .update(workflowExecutions)
    .set({
      status: "failed",
      error,
      updatedAt: new Date(),
    })
    .where(eq(workflowExecutions.id, executionId));
}
