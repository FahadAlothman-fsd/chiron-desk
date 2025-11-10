import { observable } from "@trpc/server/observable";
import { z } from "zod";
import { publicProcedure, router } from "../index";
import {
	type WorkflowEvent,
	workflowEventBus,
} from "../services/workflow-engine/event-bus";
import {
	continueExecution,
	executeWorkflow,
} from "../services/workflow-engine/executor";
import { stateManager } from "../services/workflow-engine/state-manager";

/**
 * Workflow Router - tRPC endpoints for workflow execution
 */

export const workflowRouter = router({
	/**
	 * Start a new workflow execution
	 */
	execute: publicProcedure
		.input(
			z.object({
				workflowId: z.string().uuid(),
				projectId: z.string().uuid().optional(),
				userId: z.string().default("system"), // TODO: Get from auth context
			}),
		)
		.mutation(async ({ input }) => {
			const executionId = await executeWorkflow({
				workflowId: input.workflowId,
				userId: input.userId,
				projectId: input.projectId,
			});

			return { executionId };
		}),

	/**
	 * Submit user input for a step (resume paused workflow)
	 */
	submitStep: publicProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
				userId: z.string().default("system"),
				userInput: z.any(),
			}),
		)
		.mutation(async ({ input }) => {
			// Resume execution with user input
			await stateManager.resumeExecution(input.executionId);
			await continueExecution(input.executionId, input.userId, input.userInput);

			return { success: true };
		}),

	/**
	 * Get execution state
	 */
	getExecution: publicProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
			}),
		)
		.query(async ({ input }) => {
			const execution = await stateManager.getExecution(input.executionId);

			if (!execution) {
				throw new Error(`Execution not found: ${input.executionId}`);
			}

			return execution;
		}),

	/**
	 * Pause a running workflow
	 */
	pauseWorkflow: publicProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
			}),
		)
		.mutation(async ({ input }) => {
			await stateManager.pauseExecution(input.executionId);
			workflowEventBus.emitWorkflowPaused(input.executionId);

			return { success: true };
		}),

	/**
	 * Resume a paused workflow
	 */
	resumeWorkflow: publicProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
				userId: z.string().default("system"),
			}),
		)
		.mutation(async ({ input }) => {
			await stateManager.resumeExecution(input.executionId);
			workflowEventBus.emitWorkflowResumed(input.executionId);
			await continueExecution(input.executionId, input.userId);

			return { success: true };
		}),

	/**
	 * Subscribe to workflow events (SSE subscription)
	 * Frontend receives real-time updates for workflow lifecycle
	 */
	onWorkflowEvent: publicProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
			}),
		)
		.subscription(({ input }) => {
			return observable<WorkflowEvent>((emit) => {
				// Subscribe to events for this execution
				const unsubscribe = workflowEventBus.subscribeToExecution(
					input.executionId,
					(event) => {
						emit.next(event);
					},
				);

				// Return cleanup function
				return () => {
					unsubscribe();
				};
			});
		}),
}) as ReturnType<typeof router>;
