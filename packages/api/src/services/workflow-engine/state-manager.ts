import { db, eq, workflowExecutions, workflowSteps } from "@chiron/db";
import deepmerge from "deepmerge";

/**
 * State Manager - Manages workflow execution state persistence
 * Handles creation, updates, pause/resume, and completion
 */

export interface ExecutedStepData {
	stepId: string; // UUID reference to workflow_steps
	status: "completed" | "failed" | "skipped" | "waiting";
	startedAt: string;
	completedAt?: string;
	output?: Record<string, unknown>;
	error?: string;
}

export class StateManager {
	/**
	 * Create a new workflow execution
	 * TODO: Future enhancement - Save partial input for better UX (deferred to chat steps Story 1.6+)
	 */
	async createExecution(params: {
		workflowId: string;
		projectId?: string;
		userId: string;
		agentId?: string;
	}): Promise<string> {
		const [execution] = await db
			.insert(workflowExecutions)
			.values({
				workflowId: params.workflowId,
				projectId: params.projectId || null,
				agentId: params.agentId || null,
				status: "active",
				variables: {},
				executedSteps: {},
				startedAt: new Date(),
			})
			.returning();

		return execution.id;
	}

	/**
	 * Update executedSteps JSONB with new step completion
	 * TODO: Add optimistic locking for concurrent execution protection (Epic 6 multi-agent)
	 */
	async updateExecutedSteps(
		executionId: string,
		stepNumber: number,
		stepData: ExecutedStepData,
	): Promise<void> {
		// Fetch current state
		const [execution] = await db
			.select()
			.from(workflowExecutions)
			.where(eq(workflowExecutions.id, executionId))
			.limit(1);

		if (!execution) {
			throw new Error(`Execution not found: ${executionId}`);
		}

		const executedSteps =
			(execution.executedSteps as Record<number, ExecutedStepData>) || {};

		// Update step entry
		executedSteps[stepNumber] = stepData;

		// Save to database
		await db
			.update(workflowExecutions)
			.set({
				executedSteps,
				currentStepId: stepData.stepId,
				updatedAt: new Date(),
			})
			.where(eq(workflowExecutions.id, executionId));
	}

	/**
	 * Merge step output into execution variables using deep merge
	 * Preserves nested objects and arrays
	 */
	async mergeExecutionVariables(
		executionId: string,
		output: Record<string, unknown>,
	): Promise<void> {
		// Fetch current variables
		const [execution] = await db
			.select()
			.from(workflowExecutions)
			.where(eq(workflowExecutions.id, executionId))
			.limit(1);

		if (!execution) {
			throw new Error(`Execution not found: ${executionId}`);
		}

		const currentVariables =
			(execution.variables as Record<string, unknown>) || {};

		// Deep merge (output overwrites conflicting keys)
		const mergedVariables = deepmerge(currentVariables, output);

		// Save back to database
		await db
			.update(workflowExecutions)
			.set({
				variables: mergedVariables,
				updatedAt: new Date(),
			})
			.where(eq(workflowExecutions.id, executionId));
	}

	/**
	 * Pause workflow execution
	 */
	async pauseExecution(executionId: string): Promise<void> {
		await db
			.update(workflowExecutions)
			.set({
				status: "paused",
				pausedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(workflowExecutions.id, executionId));
	}

	/**
	 * Resume paused workflow
	 */
	async resumeExecution(executionId: string): Promise<void> {
		// Validate status is "paused"
		const [execution] = await db
			.select()
			.from(workflowExecutions)
			.where(eq(workflowExecutions.id, executionId))
			.limit(1);

		if (!execution) {
			throw new Error(`Execution not found: ${executionId}`);
		}

		if (execution.status !== "paused") {
			throw new Error(
				`Cannot resume execution with status: ${execution.status}. Expected "paused".`,
			);
		}

		await db
			.update(workflowExecutions)
			.set({
				status: "active",
				updatedAt: new Date(),
			})
			.where(eq(workflowExecutions.id, executionId));
	}

	/**
	 * Mark workflow as completed
	 */
	async completeExecution(executionId: string): Promise<void> {
		await db
			.update(workflowExecutions)
			.set({
				status: "completed",
				completedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(workflowExecutions.id, executionId));
	}

	/**
	 * Mark workflow as failed
	 */
	async failExecution(
		executionId: string,
		error: string,
		errorStep?: number,
	): Promise<void> {
		await db
			.update(workflowExecutions)
			.set({
				status: "failed",
				error,
				errorStep,
				updatedAt: new Date(),
			})
			.where(eq(workflowExecutions.id, executionId));
	}

	/**
	 * Get execution state with current step details
	 */
	async getExecution(executionId: string) {
		const [execution] = await db
			.select()
			.from(workflowExecutions)
			.where(eq(workflowExecutions.id, executionId))
			.limit(1);

		if (!execution) {
			return null;
		}

		// If there's a current step, fetch its details
		let currentStep = null;
		if (execution.currentStepId) {
			const [step] = await db
				.select()
				.from(workflowSteps)
				.where(eq(workflowSteps.id, execution.currentStepId))
				.limit(1);

			currentStep = step || null;
		}

		return {
			...execution,
			currentStep,
		};
	}
}

// Export singleton instance
export const stateManager = new StateManager();
