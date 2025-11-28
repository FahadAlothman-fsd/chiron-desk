import { db, eq, workflowExecutions } from "@chiron/db";
import { workflowEventBus } from "./event-bus";
import { buildExecutionContext } from "./execution-context";
import { UnknownStepTypeError } from "./step-handler";
import { stepRegistry } from "./step-registry";
import { loadWorkflow } from "./workflow-loader";

/**
 * Maximum step executions per workflow (prevents infinite loops)
 */
const MAX_STEP_EXECUTIONS = 100;

/**
 * Workflow Executor - Main execution loop
 * Orchestrates step-by-step workflow execution with state management
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
}): Promise<string> {
	// Load workflow and steps
	const { workflow, steps } = await loadWorkflow(params.workflowId);

	// Story 2.1: Get agentId from metadata JSONB field instead of column
	const metadata = workflow.metadata as { agentId?: string } | null;
	const agentId = metadata?.agentId || null;

	// Create execution record
	const [execution] = await db
		.insert(workflowExecutions)
		.values({
			workflowId: params.workflowId,
			projectId: params.projectId || null,
			agentId: agentId,
			status: "active",
			variables: {},
			executedSteps: {},
			startedAt: new Date(),
		})
		.returning();

	const executionId = execution.id;

	try {
		// Emit workflow_started event
		workflowEventBus.emitWorkflowStarted(
			executionId,
			params.workflowId,
			params.userId,
		);

		// Handle empty workflow (0 steps) - immediate completion
		if (steps.length === 0) {
			await completeExecution(executionId);
			workflowEventBus.emitWorkflowCompleted(executionId);
			return executionId;
		}

		// Start execution loop from step 1
		await continueExecution(executionId, params.userId);

		return executionId;
	} catch (error) {
		// Handle execution errors
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		const errorStep =
			error instanceof WorkflowExecutionError ? error.stepNumber : undefined;

		await failExecution(executionId, errorMessage);
		workflowEventBus.emitWorkflowError(executionId, errorMessage, errorStep);
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
	userInput?: unknown,
): Promise<void> {
	console.log("[Executor] continueExecution called with userInput:", userInput);
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

	if (steps.length === 0) {
		await completeExecution(executionId);
		return;
	}

	// Determine current step number
	let currentStepNumber = 1;
	const executedSteps = execution.executedSteps as Record<number, any>;

	// Find steps that are truly completed (not waiting)
	const completedStepNumbers = Object.keys(executedSteps)
		.map(Number)
		.filter((stepNum) => executedSteps[stepNum].status === "completed")
		.sort((a, b) => b - a);

	// Check if there's a waiting step
	const waitingStepNumbers = Object.keys(executedSteps)
		.map(Number)
		.filter((stepNum) => executedSteps[stepNum].status === "waiting")
		.sort((a, b) => a - b); // Oldest waiting step first

	if (waitingStepNumbers.length > 0) {
		// Resume from the waiting step (user is submitting input for it)
		currentStepNumber = waitingStepNumbers[0];
		console.log(
			`[Executor] Found waiting step ${currentStepNumber}, resuming with user input`,
		);
	} else if (completedStepNumbers.length > 0) {
		// No waiting steps, continue from last completed
		const lastCompletedStep = completedStepNumbers[0];
		const _lastStepData = executedSteps[lastCompletedStep];

		// If last step has nextStepNumber, use it
		const lastStep = steps.find((s) => s.stepNumber === lastCompletedStep);
		currentStepNumber = lastStep?.nextStepNumber || lastCompletedStep + 1;
		console.log(
			`[Executor] Last completed step: ${lastCompletedStep}, continuing to step ${currentStepNumber}`,
		);
	} else {
		console.log(
			"[Executor] No completed or waiting steps, starting from step 1",
		);
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

		// Build execution context
		const context = buildExecutionContext({
			executionId,
			userId,
			projectId: execution.projectId,
			variables: execution.variables as Record<string, unknown>,
			executedSteps: execution.executedSteps as any,
			defaultValues: {},
		});

		// Execute step
		try {
			// Emit step_started event
			workflowEventBus.emitStepStarted(executionId, currentStep.stepNumber);

			const handler = stepRegistry.getHandler(currentStep.stepType);
			console.log(
				`[Executor] Calling handler for step ${currentStep.stepNumber}, userInput:`,
				userInput,
			);
			const result = await handler.executeStep(currentStep, context, userInput);

			console.log(
				`[Executor] Step ${currentStep.stepNumber} (${currentStep.stepType}) result:`,
				{
					requiresUserInput: result.requiresUserInput,
					nextStepNumber: result.nextStepNumber,
					hasOutput: Object.keys(result.output).length > 0,
				},
			);

			// Check if step requires user input BEFORE saving
			if (result.requiresUserInput) {
				console.log(
					`[Executor] Step ${currentStep.stepNumber} requires user input - pausing execution`,
				);

				// Mark step as waiting (not completed yet) - SAVE OUTPUT (e.g., thread IDs)
				await updateExecutedSteps(
					executionId,
					currentStep.stepNumber,
					currentStep.id,
					result.output, // Save output even when waiting for user input
					"waiting",
				);

				// Merge output into execution variables (e.g., mastra_thread_id)
				await mergeExecutionVariables(executionId, result.output);

				// Pause execution - wait for user input submission
				await pauseExecution(executionId, currentStep.stepNumber);
				workflowEventBus.emitWorkflowPaused(executionId);
				return;
			}

			// Step completed without user input - save result
			await updateExecutedSteps(
				executionId,
				currentStep.stepNumber,
				currentStep.id,
				result.output,
				"completed",
			);

			// Merge output into execution variables
			await mergeExecutionVariables(executionId, result.output);

			// Emit step_completed event
			workflowEventBus.emitStepCompleted(executionId, currentStep.stepNumber);

			console.log(
				`[Executor] Step ${currentStep.stepNumber} completed - continuing to next step`,
			);

			// Determine next step
			currentStepNumber = result.nextStepNumber ?? currentStep.nextStepNumber;

			// Clear userInput after first step (only used once)
			userInput = undefined;
		} catch (error) {
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

				// Auto-advance
				currentStepNumber = currentStep.nextStepNumber;
				continue;
			}

			// Check skipOnFailure config
			const config = currentStep.config as any;
			const skipOnFailure = config?.errorHandling?.skipOnFailure || false;

			if (skipOnFailure) {
				// Mark step as failed but continue
				console.warn(
					`Step ${currentStep.stepNumber} failed but skipOnFailure=true. Continuing.`,
				);

				await updateExecutedSteps(
					executionId,
					currentStep.stepNumber,
					currentStep.id,
					{},
					"failed",
					error instanceof Error ? error.message : "Unknown error",
				);

				// Continue to next step
				currentStepNumber = currentStep.nextStepNumber;
				continue;
			}

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
	workflowEventBus.emitWorkflowCompleted(executionId);
}

/**
 * Update executedSteps JSONB field
 * TODO: Add optimistic locking for concurrent execution protection (Epic 6 multi-agent)
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
		output: status === "completed" || status === "waiting" ? output : undefined, // Save output for waiting steps too
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
 * Merge step output into execution variables (deep merge)
 * Using deepmerge library (to be installed)
 */
async function mergeExecutionVariables(
	executionId: string,
	output: Record<string, unknown>,
): Promise<void> {
	// For Story 1.4, use simple object spread
	// TODO: Use deepmerge library for nested objects (Task 3)
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

	await db
		.update(workflowExecutions)
		.set({
			variables: merged,
			updatedAt: new Date(),
		})
		.where(eq(workflowExecutions.id, executionId));
}

/**
 * Pause execution
 */
async function pauseExecution(
	executionId: string,
	stepNumber: number,
): Promise<void> {
	console.log(
		"[Executor] pauseExecution called for:",
		executionId,
		"at step:",
		stepNumber,
	);
	await db
		.update(workflowExecutions)
		.set({
			status: "paused",
			pausedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(workflowExecutions.id, executionId));
	console.log("[Executor] Execution paused successfully at step:", stepNumber);
}

/**
 * Complete execution
 */
async function completeExecution(executionId: string): Promise<void> {
	console.log("[Executor] completeExecution called for:", executionId);
	await db
		.update(workflowExecutions)
		.set({
			status: "completed",
			completedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(workflowExecutions.id, executionId));
	console.log("[Executor] Execution completed successfully");
}

/**
 * Fail execution
 */
async function failExecution(
	executionId: string,
	error: string,
): Promise<void> {
	await db
		.update(workflowExecutions)
		.set({
			status: "failed",
			error,
			updatedAt: new Date(),
		})
		.where(eq(workflowExecutions.id, executionId));
}
