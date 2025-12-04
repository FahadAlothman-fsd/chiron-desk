import type { InvokeWorkflowStepConfig, WorkflowStep } from "@chiron/db";
import { db, workflowExecutions, workflows } from "@chiron/db";
import { eq } from "drizzle-orm";
import type { ExecutionContext } from "../execution-context";
import type { StepHandler, StepResult } from "../step-handler";

/**
 * InvokeWorkflowStepHandler - Spawns child workflow executions
 *
 * Story 2.3: Handles invoke-workflow step type
 * - Creates child workflow_executions records with parentExecutionId
 * - Applies variableMapping to expose parent variables to children
 * - Tracks child execution IDs in parent variables AND executedSteps
 * - Waits for all children to complete before advancing
 * - Aggregates child outputs into parent variable
 */
export class InvokeWorkflowStepHandler implements StepHandler {
	async executeStep(
		step: WorkflowStep,
		context: ExecutionContext,
		userInput?: unknown,
	): Promise<StepResult> {
		const config = step.config as InvokeWorkflowStepConfig;

		console.log("[InvokeWorkflowHandler] executeStep called");
		console.log(
			"[InvokeWorkflowHandler] config.workflowsToInvoke:",
			config.workflowsToInvoke,
		);
		console.log(
			"[InvokeWorkflowHandler] context.variables:",
			JSON.stringify(context.variables, null, 2),
		);

		// Resolve workflowsToInvoke variable (array of workflow IDs)
		const workflowIds = this.resolveVariable(
			config.workflowsToInvoke,
			context,
		) as string[];

		if (!Array.isArray(workflowIds) || workflowIds.length === 0) {
			throw new Error(
				`workflowsToInvoke must resolve to non-empty array of workflow IDs, got: ${JSON.stringify(workflowIds)}`,
			);
		}

		// Get current child_executions from variables (or initialize)
		const childExecutions =
			(context.variables.child_executions as string[]) || [];

		// Check if we need to create children (first execution of this step)
		if (childExecutions.length === 0) {
			// Create child workflow executions
			await this.createChildExecutions(workflowIds, config, context);

			// Return "running" status (children are executing)
			return {
				output: {
					child_executions: context.variables.child_executions, // Updated by createChildExecutions
					_child_metadata: context.variables._child_metadata, // Include metadata for UI display
				},
				nextStepNumber: step.nextStepNumber ?? null,
				requiresUserInput: true, // Pause here until children complete
			};
		}

		// Check if user clicked "Execute" on a specific child (userInput is child workflow ID)
		if (typeof userInput === "string" && workflowIds.includes(userInput)) {
			// User triggered execution of a specific child workflow
			// Create that child execution if it doesn't exist yet
			const existingChildId = childExecutions.find(async (childId) => {
				const child = await db.query.workflowExecutions.findFirst({
					where: eq(workflowExecutions.id, childId),
				});
				return child?.workflowId === userInput;
			});

			if (!existingChildId) {
				await this.createChildExecution(userInput, config, context);
			}

			// Return "running" status (child is now executing)
			return {
				output: {
					child_executions: context.variables.child_executions,
					_child_metadata: context.variables._child_metadata, // Include metadata for UI display
				},
				nextStepNumber: step.nextStepNumber ?? null,
				requiresUserInput: true, // Still waiting for completion
			};
		}

		// Check completion condition (all children completed?)
		const allComplete = await this.checkCompletionCondition(
			childExecutions,
			config,
		);

		if (!allComplete) {
			// Still waiting for children to complete
			return {
				output: {
					child_executions: childExecutions,
					_child_metadata: context.variables._child_metadata, // Include metadata for UI display
				},
				nextStepNumber: step.nextStepNumber ?? null,
				requiresUserInput: true, // Keep waiting
			};
		}

		// All children complete! Aggregate outputs
		const aggregatedData = await this.aggregateChildOutputs(
			childExecutions,
			config,
		);

		// Track failed children for visibility (Story 2.3 Subtask 5.11)
		const children = await db.query.workflowExecutions.findMany({
			where: (executions, { inArray }) =>
				inArray(executions.id, childExecutions),
			with: {
				workflow: true,
			},
		});

		const failedChildren = children
			.filter((child) => child.status === "failed")
			.map((child) => ({
				id: child.id,
				workflowId: child.workflowId,
				workflowName: child.workflow?.displayName || "Unknown",
				error: child.error || "No error message",
				failedAt: child.updatedAt?.toISOString(),
			}));

		// Store failed children info in parent variables (for UI display)
		if (failedChildren.length > 0) {
			context.variables._failed_children = failedChildren;
		}

		// Store aggregated data in parent variable
		context.variables[config.aggregateInto] = aggregatedData;

		// Step complete, advance to next step
		return {
			output: {
				child_executions: childExecutions,
				[config.aggregateInto]: aggregatedData,
				_failed_children: failedChildren, // Include in step output for time-travel
			},
			nextStepNumber: step.nextStepNumber ?? null,
			requiresUserInput: false, // Complete!
		};
	}

	/**
	 * Create child workflow executions for all workflow IDs
	 */
	private async createChildExecutions(
		workflowIds: string[],
		config: InvokeWorkflowStepConfig,
		context: ExecutionContext,
	): Promise<void> {
		const childIds: string[] = [];
		const childMetadata: Array<{
			id: string;
			workflowId: string;
			workflowName: string;
			status: string;
			createdAt: string;
		}> = [];

		for (const workflowId of workflowIds) {
			const childData = await this.createChildExecution(
				workflowId,
				config,
				context,
			);
			childIds.push(childData.id);
			childMetadata.push(childData);
		}

		// Store child IDs in parent variables (quick access)
		context.variables.child_executions = childIds;

		// Store child metadata in executedSteps (history/time travel)
		// Note: This will be updated when step completes (in workflow executor)
		context.variables._child_metadata = childMetadata; // Temporary storage for executor
	}

	/**
	 * Create a single child workflow execution
	 */
	private async createChildExecution(
		workflowId: string,
		config: InvokeWorkflowStepConfig,
		context: ExecutionContext,
	): Promise<{
		id: string;
		workflowId: string;
		workflowName: string;
		status: string;
		createdAt: string;
	}> {
		// Fetch workflow details
		const workflow = await db.query.workflows.findFirst({
			where: eq(workflows.id, workflowId),
		});

		if (!workflow) {
			throw new Error(`Workflow not found: ${workflowId}`);
		}

		// Apply variableMapping to create child variables
		const childVariables: Record<string, unknown> = {};
		for (const [childVarName, parentVarRef] of Object.entries(
			config.variableMapping,
		)) {
			const resolvedValue = this.resolveVariable(parentVarRef, context);

			// Story 2.3 Subtask 5.11: Validate variable mapping
			if (resolvedValue === undefined) {
				throw new Error(
					`Variable mapping error for workflow "${workflow.displayName}": ` +
						`Parent variable ${parentVarRef} is undefined. ` +
						`Cannot map to child variable "${childVarName}".`,
				);
			}

			childVariables[childVarName] = resolvedValue;
		}

		// Story 2.3 Subtask 5.11: Optional inputSchema validation (warn only)
		if (workflow.metadata?.inputSchema) {
			this.validateInputSchema(
				childVariables,
				workflow.metadata.inputSchema as any,
				workflow.displayName,
			);
		}

		// Create child workflow_executions record
		const [childExecution] = await db
			.insert(workflowExecutions)
			.values({
				workflowId: workflow.id,
				projectId: context.projectId,
				parentExecutionId: context.executionId, // Link to parent
				status: "idle", // Not started yet (user must click "Execute")
				variables: childVariables, // Mapped parent variables
				executedSteps: {},
			})
			.returning();

		return {
			id: childExecution.id,
			workflowId: workflow.id,
			workflowName: workflow.displayName,
			status: "idle",
			createdAt: new Date().toISOString(),
		};
	}

	/**
	 * Check if completion condition is met (all children completed or failed)
	 * Story 2.3 Subtask 5.11: Graceful degradation - failed children don't block parent
	 */
	private async checkCompletionCondition(
		childExecutionIds: string[],
		config: InvokeWorkflowStepConfig,
	): Promise<boolean> {
		if (config.completionCondition.type !== "all-complete") {
			throw new Error(
				`Unsupported completion condition: ${config.completionCondition.type}`,
			);
		}

		// Query all child executions
		const children = await db.query.workflowExecutions.findMany({
			where: (executions, { inArray }) =>
				inArray(executions.id, childExecutionIds),
		});

		// Graceful degradation: Consider both "completed" and "failed" as "done"
		// This allows parent to continue with partial results if some children fail
		return children.every(
			(child) => child.status === "completed" || child.status === "failed",
		);
	}

	/**
	 * Aggregate child outputs into parent variable
	 * Story 2.3 Subtask 8.2: Generic aggregation - structure preserves workflow metadata
	 * Story 2.3 Subtask 5.11: Only aggregate successful children, track failures separately
	 */
	private async aggregateChildOutputs(
		childExecutionIds: string[],
		config: InvokeWorkflowStepConfig,
	): Promise<Record<string, unknown>> {
		const aggregatedData: Record<string, unknown> = {};

		// Query all child executions with workflow info
		const children = await db.query.workflowExecutions.findMany({
			where: (executions, { inArray }) =>
				inArray(executions.id, childExecutionIds),
			with: {
				workflow: true, // Include workflow for displayName
			},
		});

		// Separate successful and failed children
		const successfulChildren = children.filter(
			(child) => child.status === "completed",
		);
		const failedChildren = children.filter(
			(child) => child.status === "failed",
		);

		// Log failures for visibility
		if (failedChildren.length > 0) {
			console.warn(
				`⚠️  ${failedChildren.length} child workflow(s) failed:`,
				failedChildren.map((c) => ({
					name: c.workflow?.displayName,
					error: c.error,
				})),
			);
		}

		// Extract expectedOutputVariable from successful children only
		// Generic structure: { workflowId: { workflowName, output, completedAt } }
		for (const child of successfulChildren) {
			const outputValue = child.variables[config.expectedOutputVariable];
			if (outputValue !== undefined && child.workflow) {
				aggregatedData[child.workflowId] = {
					workflowId: child.workflowId,
					workflowName: child.workflow.displayName,
					workflowDescription: child.workflow.description,
					output: outputValue, // Raw output from child workflow (could be anything)
					completedAt:
						child.completedAt?.toISOString() || new Date().toISOString(),
				};
			}
		}

		return aggregatedData;
	}

	/**
	 * Resolve variable reference (e.g., "{{techniques}}" → array of IDs)
	 */
	private resolveVariable(
		variableRef: string,
		context: ExecutionContext,
	): unknown {
		// Check if it's a template variable ({{variable_name}})
		const match = variableRef.match(/^\{\{(.+?)\}\}$/);
		if (match) {
			const varName = match[1].trim();
			// Safely access variables with null check
			if (!context.variables) {
				console.warn(
					`[InvokeWorkflowHandler] context.variables is undefined when resolving ${varName}`,
				);
				return undefined;
			}
			return context.variables[varName];
		}

		// Otherwise, return as literal
		return variableRef;
	}

	/**
	 * Validate child variables against workflow inputSchema (warn only, don't throw)
	 * Story 2.3 Subtask 5.11: Lightweight validation for MVP
	 */
	private validateInputSchema(
		childVariables: Record<string, unknown>,
		inputSchema: Record<string, any>,
		workflowName: string,
	): void {
		const warnings: string[] = [];

		for (const [varName, varSchema] of Object.entries(inputSchema)) {
			const value = childVariables[varName];

			// Check required fields
			if (varSchema.required && value === undefined) {
				warnings.push(
					`Required variable "${varName}" is missing (expected ${varSchema.type})`,
				);
				continue;
			}

			// Basic type checking
			if (value !== undefined) {
				const actualType = Array.isArray(value) ? "array" : typeof value;
				if (actualType !== varSchema.type) {
					warnings.push(
						`Variable "${varName}" type mismatch: expected ${varSchema.type}, got ${actualType}`,
					);
				}
			}
		}

		// Log warnings (don't throw - graceful degradation)
		if (warnings.length > 0) {
			console.warn(
				`⚠️  Input validation warnings for workflow "${workflowName}":`,
				warnings,
			);
		}
	}
}
