import { db, workflowExecutions } from "@chiron/db";
import { observable } from "@trpc/server/observable";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { AceOptimizer } from "../services/mastra/ace-optimizer";
import { getThreadMessages } from "../services/mastra/mastra-service";
import { MiProCollector } from "../services/mastra/mipro-collector";
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
	execute: protectedProcedure
		.input(
			z.object({
				workflowId: z.string().uuid(),
				projectId: z.string().uuid().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session.user.id;

			const executionId = await executeWorkflow({
				workflowId: input.workflowId,
				userId: userId,
				projectId: input.projectId,
			});

			return { executionId };
		}),

	/**
	 * Story 1.5: Continue an existing execution (for execute-action steps)
	 * Use this instead of execute() when an execution already exists
	 */
	continue: protectedProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session.user.id;
			await continueExecution(input.executionId, userId);
			return { success: true };
		}),

	/**
	 * Submit user input for a step (resume paused workflow)
	 */
	submitStep: protectedProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
				userInput: z.any(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session.user.id;

			// Resume execution with user input
			await stateManager.resumeExecution(input.executionId);
			await continueExecution(input.executionId, userId, input.userInput);

			return { success: true };
		}),

	/**
	 * Get execution state
	 */
	getExecution: protectedProcedure
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
	pauseWorkflow: protectedProcedure
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
	resumeWorkflow: protectedProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session.user.id;

			await stateManager.resumeExecution(input.executionId);
			workflowEventBus.emitWorkflowResumed(input.executionId);
			await continueExecution(input.executionId, userId);

			return { success: true };
		}),

	/**
	 * Subscribe to workflow events (SSE subscription)
	 * Frontend receives real-time updates for workflow lifecycle
	 */
	onWorkflowEvent: protectedProcedure
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

	/**
	 * Story 1.5: Get workflow initializers
	 * Returns workflows that can be used to initialize a new project
	 */
	getInitializers: protectedProcedure
		.input(
			z.object({
				type: z.enum(["new-project", "existing-project"]),
			}),
		)
		.query(async ({ input }) => {
			const initializers = await db.query.workflows.findMany({
				where: (workflows, { eq }) => eq(workflows.initializerType, input.type),
				orderBy: (workflows, { asc }) => [asc(workflows.displayName)],
			});

			return { workflows: initializers };
		}),

	/**
	 * Story 1.5: Get workflow by ID
	 * Returns a single workflow by its ID
	 */
	getById: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
			}),
		)
		.query(async ({ input }) => {
			const workflow = await db.query.workflows.findFirst({
				where: (workflows, { eq }) => eq(workflows.id, input.id),
			});

			if (!workflow) {
				throw new Error(`Workflow not found: ${input.id}`);
			}

			return workflow;
		}),

	/**
	 * Get all steps for a workflow
	 * Returns steps sorted by stepNumber
	 */
	getSteps: protectedProcedure
		.input(
			z.object({
				workflowId: z.string().uuid(),
			}),
		)
		.query(async ({ input }) => {
			const steps = await db.query.workflowSteps.findMany({
				where: (workflowSteps, { eq }) =>
					eq(workflowSteps.workflowId, input.workflowId),
				orderBy: (workflowSteps, { asc }) => [asc(workflowSteps.stepNumber)],
			});

			return { steps };
		}),

	/**
	 * Story 1.6: Approve a tool call result
	 * Saves the approved value, stores to MiPRO training, and resumes workflow
	 */
	approveToolCall: protectedProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
				toolName: z.string(),
				approvedValue: z.any(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session.user.id;
			// Get execution
			const execution = await stateManager.getExecution(input.executionId);
			if (!execution) {
				throw new Error(`Execution not found: ${input.executionId}`);
			}

			// Validate execution is paused
			if (execution.status !== "paused") {
				throw new Error(
					`Cannot approve: Execution is ${execution.status}, expected "paused"`,
				);
			}

			// Get approval states from variables
			const approvalStates = (execution.variables.approval_states ||
				{}) as Record<string, any>;
			const toolState = approvalStates[input.toolName];

			if (!toolState) {
				throw new Error(
					`Tool "${input.toolName}" not found in approval states`,
				);
			}

			// Update approval state
			toolState.status = "approved";
			toolState.value = input.approvedValue;
			toolState.approved_at = new Date().toISOString();

			// Extract output fields from approved value and merge into execution variables
			// This allows subsequent tools to access these variables as prerequisites
			if (input.approvedValue && typeof input.approvedValue === "object") {
				// Merge all non-internal fields from approved value into execution.variables
				for (const [key, value] of Object.entries(input.approvedValue)) {
					// Skip internal fields (reasoning, etc.) - only extract actual outputs
					if (key !== "reasoning" && key !== "internal") {
						execution.variables[key] = value;
						console.log(
							`[ApproveToolCall] Extracted output variable: ${key} = ${typeof value === "string" ? `${value.substring(0, 50)}...` : JSON.stringify(value)}`,
						);
					}
				}
			}

			// Get agent ID from execution or current step config
			let agentId: string | undefined;
			if (execution.agentId) {
				agentId = execution.agentId;
			} else if (execution.currentStep?.config) {
				const stepConfig = execution.currentStep.config as any;
				agentId = stepConfig.agentId;
			}

			console.log("[ApproveToolCall] Agent ID for MiPRO:", agentId);

			// Save approved output to MiPRO training examples (only if we have agent ID)
			if (agentId) {
				const miproCollector = new MiProCollector();
				await miproCollector.saveApprovedOutput(
					input.toolName,
					agentId,
					toolState.input || {},
					input.approvedValue,
					toolState.rejection_history || [],
				);
				console.log(`[ApproveToolCall] Saved to MiPRO: ${input.toolName}`);
			} else {
				console.warn(
					`[ApproveToolCall] Skipping MiPRO save - no agent ID found for execution: ${input.executionId}`,
				);
			}

			// Update execution variables
			await db
				.update(workflowExecutions)
				.set({
					variables: execution.variables,
					status: "active",
				})
				.where(eq(workflowExecutions.id, input.executionId));

			// Emit event
			workflowEventBus.emitWorkflowResumed(input.executionId);

			// Resume workflow execution
			await continueExecution(input.executionId, userId);

			console.log(`[WorkflowRouter] Approved tool: ${input.toolName}`);

			return { success: true };
		}),

	/**
	 * Story 1.6: Reject a tool call result with feedback
	 * Updates ACE playbook with feedback and regenerates
	 */
	rejectToolCall: protectedProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
				toolName: z.string(),
				feedback: z.string(),
				agentId: z.string().uuid(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session.user.id;
			// Get execution
			const execution = await stateManager.getExecution(input.executionId);
			if (!execution) {
				throw new Error(`Execution not found: ${input.executionId}`);
			}

			// Validate execution is paused
			if (execution.status !== "paused") {
				throw new Error(
					`Cannot reject: Execution is ${execution.status}, expected "paused"`,
				);
			}

			// Get approval states from variables
			const approvalStates = (execution.variables.approval_states ||
				{}) as Record<string, any>;
			const toolState = approvalStates[input.toolName];

			if (!toolState) {
				throw new Error(
					`Tool "${input.toolName}" not found in approval states`,
				);
			}

			// Update approval state with rejection
			toolState.status = "rejected";
			toolState.rejection_count = (toolState.rejection_count || 0) + 1;
			toolState.rejection_history = toolState.rejection_history || [];
			toolState.rejection_history.push({
				feedback: input.feedback,
				rejected_at: new Date().toISOString(),
			});

			// Update ACE playbook with feedback
			const aceOptimizer = new AceOptimizer();
			const sectionName = determineSectionName(input.toolName);
			await aceOptimizer.applyOnlineUpdate(
				input.agentId,
				sectionName,
				input.feedback,
				toolState.input || {},
				toolState.value,
				"global", // TODO: Support user/project scopes
			);

			// Update execution variables
			await db
				.update(workflowExecutions)
				.set({
					variables: execution.variables,
					status: "active",
				})
				.where(eq(workflowExecutions.id, input.executionId));

			// Emit event
			workflowEventBus.emitWorkflowResumed(input.executionId);

			console.log(
				`[WorkflowRouter] Rejected tool: ${input.toolName}, feedback: ${input.feedback}`,
			);

			// Resume workflow - agent will regenerate with updated ACE playbook
			await continueExecution(input.executionId, userId);

			return { success: true };
		}),

	/**
	 * Story 1.6: Get chat message history from Mastra thread
	 */
	getChatMessages: protectedProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
			}),
		)
		.query(async ({ input }) => {
			// Get execution to find thread ID
			const execution = await stateManager.getExecution(input.executionId);
			if (!execution) {
				throw new Error(`Execution not found: ${input.executionId}`);
			}

			const threadId = execution.variables.mastra_thread_id as
				| string
				| undefined;
			if (!threadId) {
				// No thread yet, return empty
				return { messages: [] };
			}

			// Fetch messages from Mastra
			const messages = await getThreadMessages(threadId);

			// Format for frontend
			return {
				messages: messages.map((msg) => ({
					id: msg.id,
					role: msg.role,
					content:
						typeof msg.content === "string"
							? msg.content
							: JSON.stringify(msg.content),
					metadata: msg.metadata || {},
					created_at: msg.createdAt?.toISOString() || new Date().toISOString(),
				})),
			};
		}),

	/**
	 * Story 1.6: Send chat message to AI agent
	 * Convenience alias for submitStep with model selection support
	 */

	/**
	 * Story 1.6: Send chat message and get agent response
	 * This submits user input to the step handler which processes via Mastra agent
	 */
	sendChatMessage: protectedProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
				message: z.string(),
				selectedModel: z.string().optional(), // User's model selection from UI
			}),
		)
		.mutation(async ({ input, ctx }) => {
			// Get userId from authenticated session
			const userId = ctx.session.user.id;

			// If user selected a model, store it in execution variables
			if (input.selectedModel) {
				await stateManager.mergeExecutionVariables(input.executionId, {
					selected_model: input.selectedModel,
				});
			}

			// Submit the message as user input to continue execution
			await stateManager.resumeExecution(input.executionId);
			await continueExecution(input.executionId, userId, input.message);

			workflowEventBus.emitWorkflowResumed(input.executionId);

			return { success: true };
		}),

	/**
	 * Story 1.6: Approve tool output
	 * User accepts AI-generated output from approval gate
	 *
	 * This mutation:
	 * 1. Updates approval state to "approved"
	 * 2. Saves approved value to execution variables
	 * 3. Saves to MiPRO training examples for future optimization
	 * 4. Resumes workflow execution
	 */
	approveToolOutput: protectedProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
				toolName: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session.user.id;

			// Get execution to access approval states
			const execution = await stateManager.getExecution(input.executionId);
			if (!execution) {
				throw new Error(`Execution not found: ${input.executionId}`);
			}

			const approvalStates = (execution.variables.approval_states ||
				{}) as Record<string, any>;
			const toolState = approvalStates[input.toolName];

			if (!toolState) {
				throw new Error(`No approval state found for tool: ${input.toolName}`);
			}

			if (toolState.status === "approved") {
				// Already approved, just return success
				return { success: true, alreadyApproved: true };
			}

			// Update approval state to approved
			toolState.status = "approved";
			toolState.approvedAt = new Date().toISOString();

			// Save approved value to execution variables
			const approvedValue = toolState.value;
			const updatedVariables = {
				...execution.variables,
				approval_states: approvalStates,
				...approvedValue, // Merge approved fields into variables
			};

			await stateManager.mergeExecutionVariables(
				input.executionId,
				updatedVariables,
			);

			// Save to MiPRO training examples
			const miproCollector = new MiProCollector();

			// Get conversation history from Mastra thread
			const threadId = execution.variables.mastra_thread_id as
				| string
				| undefined;
			let conversationHistory = "";
			if (threadId) {
				try {
					const messages = await getThreadMessages(threadId);
					conversationHistory = messages
						.map(
							(m: any) =>
								`${m.role === "user" ? "User" : "Agent"}: ${m.content}`,
						)
						.join("\n");
				} catch (error) {
					console.warn(
						"[ApproveToolOutput] Failed to load conversation history:",
						error,
					);
				}
			}

			// Get ACE context (from agent's current playbooks)
			// TODO: Load current ACE playbooks for the agent
			const aceContext = ""; // Placeholder for now

			// Get agent ID from execution or current step config
			let agentId: string | undefined;
			if (execution.agentId) {
				agentId = execution.agentId;
			} else if (execution.currentStep?.config) {
				const stepConfig = execution.currentStep.config as any;
				agentId = stepConfig.agentId;
			}

			console.log("[ApproveToolOutput] Agent ID for MiPRO:", agentId);

			// Save to MiPRO only if we have an agent ID
			if (agentId) {
				await miproCollector.saveApprovedOutput(
					input.toolName,
					agentId,
					{
						conversation_history: conversationHistory,
						ace_context: aceContext,
						variables: execution.variables,
					},
					approvedValue,
					toolState.rejection_history || [],
					{}, // Scorer results (future: add quality metrics)
				);
				console.log(`[ApproveToolOutput] Saved to MiPRO: ${input.toolName}`);
			} else {
				console.warn(
					`[ApproveToolOutput] Skipping MiPRO save - no agent ID found for execution: ${input.executionId}`,
				);
			}

			// Resume workflow execution
			await stateManager.resumeExecution(input.executionId);
			await continueExecution(input.executionId, userId, "");

			workflowEventBus.emitWorkflowResumed(input.executionId);

			return { success: true };
		}),

	/**
	 * Story 1.6: Reject tool output
	 * User rejects AI-generated output and provides feedback
	 *
	 * This mutation:
	 * 1. Updates approval state to "rejected"
	 * 2. Saves rejection feedback to history
	 * 3. Triggers ACE optimizer to update playbook
	 * 4. Regenerates output with updated ACE knowledge
	 */
	rejectToolOutput: protectedProcedure
		.input(
			z.object({
				executionId: z.string().uuid(),
				toolName: z.string(),
				feedback: z.string().min(1, "Feedback is required"),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session.user.id;

			// Get execution to access approval states
			const execution = await stateManager.getExecution(input.executionId);
			if (!execution) {
				throw new Error(`Execution not found: ${input.executionId}`);
			}

			const approvalStates = (execution.variables.approval_states ||
				{}) as Record<string, any>;
			const toolState = approvalStates[input.toolName];

			if (!toolState) {
				throw new Error(`No approval state found for tool: ${input.toolName}`);
			}

			// Save previous output to rejection history
			const rejectionEntry = {
				feedback: input.feedback,
				rejectedAt: new Date().toISOString(),
				previousOutput: toolState.value,
			};

			toolState.rejection_history = toolState.rejection_history || [];
			toolState.rejection_history.push(rejectionEntry);
			toolState.status = "rejected";

			// Update approval states
			const updatedVariables = {
				...execution.variables,
				approval_states: approvalStates,
			};

			await stateManager.mergeExecutionVariables(
				input.executionId,
				updatedVariables,
			);

			// Trigger ACE optimizer to update playbook
			const aceOptimizer = new AceOptimizer();

			// Determine section name based on tool type
			const sectionName = determineSectionName(input.toolName);

			// Get agent ID from execution
			const agentId = execution.agentId || "";
			if (!agentId) {
				console.warn(
					"[RejectToolOutput] No agentId in execution, skipping ACE update",
				);
			} else {
				// Load existing playbook
				const playbook = await aceOptimizer.loadPlaybook(agentId, "global");

				// Apply online update with rejection feedback
				const updatedPlaybook = await aceOptimizer.applyOnlineUpdate(
					playbook,
					toolState.value, // Current prediction
					input.feedback, // User's feedback
					sectionName,
				);

				// Save updated playbook
				await aceOptimizer.savePlaybook(updatedPlaybook);

				console.log(
					`[RejectToolOutput] Updated ACE playbook for ${input.toolName}`,
				);
			}

			// TODO: Trigger tool regeneration with updated ACE context
			// For now, reset status to "pending" so agent can regenerate
			toolState.status = "pending";
			toolState.regenerationNeeded = true;

			await stateManager.mergeExecutionVariables(input.executionId, {
				...updatedVariables,
				approval_states: approvalStates,
			});

			// Resume workflow for regeneration
			// Pass a special marker as user input so the handler knows to process rejected tools
			await stateManager.resumeExecution(input.executionId);
			await continueExecution(
				input.executionId,
				userId,
				"[REGENERATION_REQUESTED]",
			);

			workflowEventBus.emitWorkflowResumed(input.executionId);

			return { success: true, regenerationTriggered: true };
		}),
}) as ReturnType<typeof router>;

/**
 * Determine ACE playbook section name based on tool name
 * This helps organize learned patterns by tool type
 */
function determineSectionName(toolName: string): string {
	if (toolName.includes("summary")) {
		return "Summary Generation Patterns";
	}
	if (toolName.includes("complexity")) {
		return "Complexity Classification Patterns";
	}
	if (toolName.includes("name")) {
		return "Project Naming Patterns";
	}
	return "General Patterns";
}
