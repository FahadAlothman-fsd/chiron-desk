import { agents, db } from "@chiron/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const agentsRouter = router({
	/**
	 * Get agent by ID
	 */
	getById: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
			}),
		)
		.query(async ({ input }) => {
			const [agent] = await db
				.select()
				.from(agents)
				.where(eq(agents.id, input.id))
				.limit(1);

			if (!agent) {
				throw new Error(`Agent not found: ${input.id}`);
			}

			return { agent };
		}),

	/**
	 * Get resolved agent instructions with dynamic context filled
	 *
	 * This endpoint hydrates the instruction template with real execution data,
	 * mimicking what the agent actually sees at runtime.
	 */
	getResolvedInstructions: protectedProcedure
		.input(
			z.object({
				agentId: z.string().uuid(),
				executionId: z.string().uuid(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const [agent] = await db
				.select()
				.from(agents)
				.where(eq(agents.id, input.agentId))
				.limit(1);

			if (!agent) {
				throw new Error(`Agent not found: ${input.agentId}`);
			}

			// Load execution to get context variables
			// We need to replicate the AskUserChatHandler logic here
			const { workflowExecutions, workflowSteps } = await import("@chiron/db");
			const { and } = await import("drizzle-orm");

			const [execution] = await db
				.select()
				.from(workflowExecutions)
				.where(eq(workflowExecutions.id, input.executionId))
				.limit(1);

			if (!execution) {
				throw new Error(`Execution not found: ${input.executionId}`);
			}

			// Load Step Configuration
			const [step] = await db
				.select()
				.from(workflowSteps)
				.where(
					and(
						eq(workflowSteps.workflowId, execution.workflowId),
						eq(
							workflowSteps.stepNumber,
							execution.currentStepNumber || 1, // Default to 1 if null
						),
					),
				)
				.limit(1);

			let toolsListStr = "(No tools available)";
			let stepObjective = "Complete current step";

			if (step) {
				const config = step.config as any; // Cast to allow access to tools
				stepObjective = `Complete ${config.completionCondition?.type || "step"}`;

				if (config.tools && Array.isArray(config.tools)) {
					// Replicate AskUserChatHandler tool filtering logic
					const _registeredToolNames = config.tools.map((t: any) => t.name);
					const stepExecutionApprovalStates =
						(execution.variables?.approval_states as Record<string, any>) || {};

					const toolsGuidance = config.tools
						.filter((t: any) => {
							// Must have guidance
							if (!t.usageGuidance) return false;

							// Must be registered (unblocked)
							// In our case, we assume all in config are registered unless we check prerequisites
							// Let's do the prerequisite check for accuracy!
							const requiredVars = t.requiredVariables || [];
							const missingVars = requiredVars.filter((varName: string) => {
								if (varName in (execution.variables || {})) return false;
								const hasInApprovals = Object.values(
									stepExecutionApprovalStates,
								).some(
									(state: any) =>
										state.status === "approved" &&
										state.value &&
										typeof state.value === "object" &&
										varName in state.value,
								);
								return !hasInApprovals;
							});

							if (missingVars.length > 0) return false;

							// Must NOT be approved
							const toolState = stepExecutionApprovalStates[t.name];
							if (toolState?.status === "approved") return false;

							return true;
						})
						.map((t: any) => `**${t.name}**: ${t.usageGuidance}`);

					if (toolsGuidance.length > 0) {
						toolsListStr = toolsGuidance.join("\n\n");
					} else {
						toolsListStr =
							"(No active tools - all approved or blocked by prerequisites)";
					}
				}
			}

			// Prepare variables for substitution
			const variables: Record<string, any> = {
				// Standard context
				workflow_id: execution.workflowId,
				step_number: execution.currentStepNumber || 1,
				step_objective: stepObjective,
				// Add calculated values
				tools_list: toolsListStr,
				workflow_specific_instructions: "", // Empty by default as per handler
			};

			// If agent has no base instructions, build minimal instructions from step context
			if (!agent.instructions) {
				const minimalInstructions = `## Workflow Context

**Workflow ID**: ${variables.workflow_id}
**Current Step**: ${variables.step_number}
**Objective**: ${variables.step_objective}

## Available Tools

${variables.tools_list}`;

				return { instructions: minimalInstructions };
			}

			// Use Handlebars to compile and execute the template
			// This replicates the agent's internal behavior
			try {
				const Handlebars = await import("handlebars");
				// Compile the template
				const template = Handlebars.compile(agent.instructions);
				// Execute with variables
				const resolvedInstructions = template(variables);
				return { instructions: resolvedInstructions };
			} catch (error) {
				console.error("Error compiling instructions with Handlebars:", error);
				// Fallback to simple string replacement if Handlebars fails
				let resolvedInstructions = agent.instructions;
				for (const [key, value] of Object.entries(variables)) {
					resolvedInstructions = resolvedInstructions.replace(
						new RegExp(`{{${key}}}`, "g"),
						String(value),
					);
				}
				return { instructions: resolvedInstructions };
			}
		}),
});
