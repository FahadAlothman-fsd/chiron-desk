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
	 *
	 * Array merge strategy (naming convention):
	 * - Variables ending in '_options' (database-sourced) → REPLACE array
	 * - All other variables (user/AI-generated) → APPEND to array
	 *
	 * This allows:
	 * - Static option lists from DB to be refreshed without duplication
	 * - Dynamic content (epics, requirements, etc.) to accumulate over conversation
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

		// Deep merge with conditional array handling based on naming convention
		// We need to manually check keys since deepmerge doesn't provide them in arrayMerge
		const mergedVariables = deepmerge(currentVariables, output, {
			arrayMerge: (target, source) => {
				// Find which key in output has this source array
				// This is safe because we're processing one variable at a time
				let keyName: string | undefined;
				for (const [k, v] of Object.entries(output)) {
					if (v === source) {
						keyName = k;
						break;
					}
				}

				// Variables ending in '_options' are database-sourced → REPLACE
				if (keyName?.endsWith("_options")) {
					console.log(
						`[StateManager] Replacing array for '${keyName}' (database-sourced options)`,
					);
					return source;
				}

				// All other arrays → APPEND (user-generated content like epics, requirements)
				console.log(
					`[StateManager] Appending to array for '${keyName || "unknown"}' (user-generated content)`,
				);
				return [...target, ...source];
			},
		});

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
		// Validate status is "paused" or "active" (for chat steps that are already active)
		const [execution] = await db
			.select()
			.from(workflowExecutions)
			.where(eq(workflowExecutions.id, executionId))
			.limit(1);

		if (!execution) {
			throw new Error(`Execution not found: ${executionId}`);
		}

		// Allow resuming if paused OR if already active (chat steps can receive messages while active)
		if (execution.status !== "paused" && execution.status !== "active") {
			throw new Error(
				`Cannot resume execution with status: ${execution.status}. Expected "paused" or "active".`,
			);
		}

		// Only update status if currently paused
		if (execution.status === "paused") {
			await db
				.update(workflowExecutions)
				.set({
					status: "active",
					updatedAt: new Date(),
				})
				.where(eq(workflowExecutions.id, executionId));
		}
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
