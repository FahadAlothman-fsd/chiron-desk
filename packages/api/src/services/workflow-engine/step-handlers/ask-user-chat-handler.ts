import type { AskUserChatStepConfig, WorkflowStep } from "@chiron/db";
import { agents, db, workflowExecutions } from "@chiron/db";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { eq } from "drizzle-orm";
import {
	createThread,
	getMastraInstance,
	getThread,
	getThreadMessages,
} from "../../mastra/mastra-service";
import type { ExecutionContext } from "../execution-context";
import { stateManager } from "../state-manager";
import type { StepHandler, StepResult } from "../step-handler";
import { buildAxGenerationTool } from "../tools/ax-generation-tool";
import { buildDatabaseQueryTool } from "../tools/database-query-tool";

/**
 * AskUserChatStepHandler - Conversational chat interface with AI agent
 *
 * Architecture: Uses registered Mastra agents with dynamic configuration
 *
 * This handler uses agents registered with Mastra at startup. Agent configuration
 * (instructions, model, tools) is loaded dynamically via RuntimeContext on each call,
 * allowing for real-time updates without server restarts.
 *
 * Features:
 * - Registered agents with dynamic configuration via RuntimeContext
 * - Automatic conversation history loading by Mastra
 * - ACE playbook injection based on scope (global/user/project)
 * - User-specific API key loading per request
 * - Thread management for conversation persistence
 * - Completion condition checking
 *
 * @see docs/architecture/dynamic-agent-registration.md
 * @see docs/architecture/STORY-1-6-ARCHITECTURE-SUMMARY.md
 */
export class AskUserChatStepHandler implements StepHandler {
	// Cache agent names to avoid redundant DB queries
	private agentNameCache = new Map<string, string>();

	/**
	 * Get agent name from agentId (with caching)
	 * This is needed because Mastra uses agent names for lookup
	 */
	private async getAgentName(agentId: string): Promise<string> {
		// Check cache first
		if (this.agentNameCache.has(agentId)) {
			return this.agentNameCache.get(agentId)!;
		}

		// Query database
		const [agentRecord] = await db
			.select({ name: agents.name })
			.from(agents)
			.where(eq(agents.id, agentId))
			.limit(1);

		if (!agentRecord) {
			throw new Error(`Agent not found: ${agentId}`);
		}

		// Cache for future calls
		this.agentNameCache.set(agentId, agentRecord.name);
		return agentRecord.name;
	}

	/**
	 * Build tools for agent with precedence: step > workflow > agent
	 *
	 * Tool Precedence:
	 * 1. Step config tools (highest priority - most specific)
	 * 2. Workflow config tools (medium priority - workflow-wide)
	 * 3. Agent config tools (lowest priority - agent defaults)
	 *
	 * Tools with same name: step overrides workflow, workflow overrides agent
	 */
	private async buildToolsForAgent(
		config: AskUserChatStepConfig,
		context: ExecutionContext,
		agentId: string,
	): Promise<Record<string, any>> {
		const allTools: Record<string, any> = {};

		// 1. Load agent tools (lowest priority)
		// TODO: Implement when agents.tools JSONB is populated
		// const agentTools = await loadAgentTools(config.agentId);
		// Object.assign(allTools, agentTools);

		// 2. Load workflow tools (medium priority)
		// TODO: Implement when workflow.tools is defined
		// const workflowTools = await loadWorkflowTools(context.workflowId);
		// Object.assign(allTools, workflowTools);

		// 3. Build step tools (highest priority)
		if (config.tools && config.tools.length > 0) {
			console.log(
				`[AskUserChatHandler] Building ${config.tools.length} step tools...`,
			);

			for (const toolConfig of config.tools) {
				console.log(`[ToolRegistration] Building ${toolConfig.name}`, {
					type: toolConfig.toolType,
					hasOptionsSource: !!toolConfig.optionsSource,
					requiredVariables: toolConfig.requiredVariables || [],
					requiresApproval: toolConfig.requiresApproval,
				});

				try {
					// Process optionsSource if present - fetch options from database BEFORE building tool
					if (toolConfig.optionsSource) {
						await this.fetchAndStoreOptions(toolConfig.optionsSource, context);
					}

					let baseTool: any;

					switch (toolConfig.toolType) {
						case "ax-generation":
							baseTool = await buildAxGenerationTool(
								toolConfig,
								context,
								agentId,
							);
							break;

						case "database-query":
							baseTool = await buildDatabaseQueryTool(toolConfig, context);
							break;

						case "custom":
							// Custom tools deprecated - use ax-generation or database-query instead
							// All Story 1.6 tools are either ax-generation or database-query
							console.warn(
								`[ToolRegistration] ⚠️ Skipping deprecated custom tool: ${toolConfig.name}`,
							);
							console.warn(
								`[ToolRegistration] Please convert ${toolConfig.name} to ax-generation or database-query type`,
							);
							continue;

						default:
							console.warn(
								`[ToolRegistration] ⚠️ Unknown tool type for ${toolConfig.name}: ${toolConfig.toolType}`,
							);
							continue;
					}

					if (baseTool) {
						// Wrap tool with prerequisite validation
						const wrappedTool = this.wrapToolWithPrerequisites(
							baseTool,
							toolConfig,
							context,
						);

						allTools[toolConfig.name] = wrappedTool;
						console.log(
							`[ToolRegistration] ✓ Registered ${toolConfig.name} to agent`,
							{
								toolId: baseTool.id,
								hasDescription: !!baseTool.description,
							},
						);
					}
				} catch (error) {
					// CRITICAL: Log but continue - don't let one tool failure prevent others
					console.error(
						`[ToolRegistration] ❌ Failed to build ${toolConfig.name}:`,
						error instanceof Error ? error.message : String(error),
					);
					console.error("[ToolRegistration] Stack trace:", error);
					console.warn(
						"[ToolRegistration] Continuing with other tools despite failure",
					);
					// Continue building other tools even if one fails
				}
			}
		}

		console.log(
			`[AskUserChatHandler] Total tools registered: ${Object.keys(allTools).length}`,
		);
		return allTools;
	}

	/**
	 * Wrap tool with prerequisite validation
	 *
	 * This ensures sequential tool execution:
	 * - update_summary can run immediately
	 * - update_complexity requires project_description
	 * - fetch_workflow_paths requires complexity_classification
	 * - etc.
	 *
	 * NOTE: We preserve the original tool object to maintain Mastra's internal
	 * properties (type, schema, etc.) and only wrap the execute function.
	 */
	private wrapToolWithPrerequisites(
		baseTool: any,
		toolConfig: any,
		context: ExecutionContext,
	): any {
		const requiredVariables = toolConfig.requiredVariables || [];

		// Store original execute function
		const originalExecute = baseTool.execute.bind(baseTool);

		// Override execute with prerequisite AND approval checking wrapper
		baseTool.execute = async (input: unknown) => {
			console.log(`[ToolExecution] ${toolConfig.name} called by agent`, {
				hasRequiredVars: requiredVariables.length > 0,
				requiresApproval: toolConfig.requiresApproval,
			});

			// First, check if tool is already approved
			const approvalStates =
				(context.executionVariables.approval_states as Record<string, any>) ||
				{};
			const toolState = approvalStates[toolConfig.name];

			if (toolState && toolState.status === "approved") {
				console.log(
					`[ToolExecution] ⏭️ ${toolConfig.name} already approved, returning cached value`,
					{
						approvalStatus: toolState.status,
					},
				);
				// Return the approved value without re-executing
				return toolState.value;
			}

			// Check prerequisites (only if not already approved)
			if (requiredVariables.length > 0) {
				const missing = requiredVariables.filter((varName: string) => {
					// Check in execution variables AND approval states
					const hasInVars = varName in context.executionVariables;

					// Check if variable exists in any approved tool output
					const hasInApprovals = Object.values(approvalStates).some(
						(state: any) => state.value && varName in state.value,
					);

					return !hasInVars && !hasInApprovals;
				});

				if (missing.length > 0) {
					// Build helpful error message with context
					const missingList = missing.map((v) => `  • ${v}`).join("\n");

					const errorMsg =
						`Tool "${toolConfig.name}" cannot execute yet.\n\n` +
						`Missing required inputs:\n${missingList}\n\n` +
						"These inputs are generated by previous workflow steps. " +
						"Please complete the earlier steps in sequence before attempting to use this tool.";

					console.warn(`[AskUserChatHandler] ${errorMsg}`);

					throw new Error(errorMsg);
				}
			}

			// Prerequisites met, execute tool
			console.log(
				`[ToolExecution] ✓ Prerequisites satisfied for ${toolConfig.name}, executing...`,
			);
			const result = await originalExecute(input);
			console.log(`[ToolExecution] ✓ ${toolConfig.name} execution completed`, {
				resultType: typeof result,
				hasApprovalRequired:
					result && typeof result === "object" && "type" in result
						? result.type === "approval_required"
						: false,
			});
			return result;
		};

		return baseTool;
	}

	/**
	 * Update the last assistant message with tool_calls metadata
	 * This allows the UI to display which tools were called by the agent
	 */
	private async updateLastAssistantMessageMetadata(
		threadId: string,
		agentId: string,
		toolCalls: Array<{ name: string }>,
	): Promise<void> {
		try {
			const mastra = await getMastraInstance();
			const storage = mastra.getStorage();

			if (!storage) {
				console.warn(
					"[AskUserChatHandler] Storage not available for metadata update",
				);
				return;
			}

			// Get all messages in thread
			const messages = await getThreadMessages(threadId);

			// Find the last assistant message
			const assistantMessages = messages.filter((m) => m.role === "assistant");
			if (assistantMessages.length === 0) {
				console.warn(
					"[AskUserChatHandler] No assistant messages found to update",
				);
				return;
			}

			const lastAssistantMessage =
				assistantMessages[assistantMessages.length - 1];

			// Get agent info for metadata
			const [agentRecord] = await db
				.select({ name: agents.name, icon: agents.icon })
				.from(agents)
				.where(eq(agents.id, agentId))
				.limit(1);

			// Update message metadata with tool calls and agent info
			const updatedMetadata = {
				...(lastAssistantMessage.metadata || {}),
				agent_id: agentId,
				agent_name: agentRecord?.name || "Assistant",
				agent_icon: agentRecord?.icon || "🤖",
				tool_calls: toolCalls,
			};

			// Update message in storage
			await storage.saveMessages({
				messages: [
					{
						...lastAssistantMessage,
						metadata: updatedMetadata,
					},
				],
			});

			console.log(
				`[AskUserChatHandler] Updated message metadata with ${toolCalls.length} tool calls`,
			);
		} catch (error) {
			console.error(
				"[AskUserChatHandler] Error updating message metadata:",
				error,
			);
			// Don't throw - metadata update is non-critical
		}
	}

	async executeStep(
		step: WorkflowStep,
		context: ExecutionContext,
		userInput?: unknown,
	): Promise<StepResult> {
		const config = step.config as AskUserChatStepConfig;

		console.log(
			"[AskUserChatHandler] executeStep called",
			"userInput:",
			userInput,
		);

		// Initialize or load Mastra agent and thread
		const agentContext = await this.initializeAgent(config, context);

		// Save thread ID to execution variables if new thread created
		const output: Record<string, unknown> = {};
		if (agentContext.needsSave) {
			output.mastra_thread_id = agentContext.threadId;
		}

		// Check if step is already complete (tools approved while paused)
		// This allows auto-completion after approval mutations without requiring more user input
		const isComplete = await this.checkCompletionCondition(config, context);

		if (isComplete) {
			console.log(
				"[AskUserChatHandler] Step complete - all required tools approved",
			);
			// Extract output variables
			const outputs = this.extractOutputVariables(config, context);
			return {
				output: {
					...outputs,
					...output, // Include thread ID if it was just created
					mastra_thread_id: agentContext.threadId, // Always include thread ID
				},
				nextStepNumber: step.nextStepNumber ?? null,
				requiresUserInput: false,
			};
		}

		// Check for rejected tools that need regeneration BEFORE checking user input
		// This allows rejection flow to work without requiring userInput parameter
		// IMPORTANT: Reload execution state from DB to get fresh approval_states
		// (context.executionVariables may be stale if rejection was just saved)
		const [freshExecution] = await db
			.select()
			.from(workflowExecutions)
			.where(
				eq(
					workflowExecutions.id,
					context.systemVariables.execution_id as string,
				),
			)
			.limit(1);

		const currentApprovalStates = (freshExecution?.variables?.approval_states ||
			{}) as Record<
			string,
			{
				status: "pending" | "approved" | "rejected";
				rejection_history?: Array<{
					feedback: string;
					rejectedAt: string;
					previousOutput?: unknown;
				}>;
				regenerationNeeded?: boolean;
			}
		>;

		const rejectedTools = Object.entries(currentApprovalStates)
			.filter(
				([_, state]) =>
					// Check for regenerationNeeded flag (primary) or rejected status (fallback)
					state.regenerationNeeded === true ||
					(state.status === "rejected" && state.rejection_history?.length > 0),
			)
			.map(([toolName, state]) => {
				const lastRejection =
					state.rejection_history?.[state.rejection_history.length - 1];
				return {
					toolName,
					lastFeedback: lastRejection?.feedback || "",
					previousOutput: lastRejection?.previousOutput,
				};
			});

		// If no user input AND no rejected tools, show initial message and wait
		if (!userInput && rejectedTools.length === 0) {
			console.log(
				"[AskUserChatHandler] No user input and no rejected tools - awaiting first message",
			);
			return {
				output: {
					...output,
					agent_context: {
						threadId: agentContext.threadId,
					},
					initial_message: config.initialMessage,
				},
				nextStepNumber: step.nextStepNumber ?? null,
				requiresUserInput: true,
			};
		}

		// If we have rejected tools but no user input, we're in regeneration mode
		if (!userInput && rejectedTools.length > 0) {
			console.log(
				"[AskUserChatHandler] No user input but found rejected tools - entering regeneration mode",
			);
		}

		// If user input provided, process it through agent
		console.log("[AskUserChatHandler] Processing user message:", userInput);

		// Get agent name from database (one-time query per step execution)
		// Agent configuration (instructions, model, tools) is loaded dynamically via RuntimeContext
		const agentName = await this.getAgentName(config.agentId);

		// Get registered agent from Mastra
		const mastra = await getMastraInstance();
		const agent = mastra.getAgent(agentName);

		if (!agent) {
			throw new Error(`Agent not registered with Mastra: ${agentName}`);
		}

		// Build tools with precedence: step > workflow > agent
		const tools = await this.buildToolsForAgent(
			config,
			context,
			config.agentId,
		);

		// Extract usageGuidance from tools for injection into agent instructions
		const toolsGuidance = (config.tools || [])
			.filter((t) => t.usageGuidance)
			.map((t) => `**${t.name}**: ${t.usageGuidance}`);

		// Create RuntimeContext with required data for dynamic loading
		const runtimeContext = new RuntimeContext();
		runtimeContext.set("userId", context.systemVariables.current_user_id);
		runtimeContext.set("projectId", context.systemVariables.project_id);
		runtimeContext.set("variables", {
			...context.executionVariables,
			// Workflow context for agent instructions template replacement
			step_number: step.stepNumber,
			step_objective: `Complete ${config.completionCondition.type}`,
			tools_guidance: toolsGuidance, // Array of tool guidance strings
			selected_model: context.executionVariables?.selected_model,
			rejected_tools: rejectedTools, // Pass rejected tools info
		});
		runtimeContext.set("executionId", context.systemVariables.execution_id); // For tool access to execution

		const threadId = agentContext.threadId;
		const userId = context.systemVariables.current_user_id as string;

		// Call agent with RuntimeContext - Mastra handles conversation history automatically
		console.log(
			"[AskUserChatHandler] Calling registered agent with RuntimeContext...",
		);
		console.log(
			`[AskUserChatHandler] Registered ${Object.keys(tools).length} tools:`,
			Object.keys(tools),
		);

		// Use the SAME resourceId that was used to create the thread
		const resourceId = `user-${userId}`;
		console.log(
			`[AskUserChatHandler] Using threadId: ${threadId}, resourceId: ${resourceId}`,
		);

		// Mastra expects toolsets as Record<string, Record<string, Tool>>
		// Wrap our tools in a toolset object
		const toolsets = Object.keys(tools).length > 0 ? { stepTools: tools } : {};

		// If there are rejected tools, prepend regeneration instructions to user input
		let effectiveUserInput = userInput ? String(userInput) : "";

		if (rejectedTools.length > 0) {
			const regenerationInstructions = rejectedTools
				.map((rt) => {
					let instruction = `\n\n[SYSTEM: The user rejected the output from **${rt.toolName}**.`;

					// Include previous output if available
					if (rt.previousOutput !== undefined) {
						const outputStr =
							typeof rt.previousOutput === "string"
								? rt.previousOutput
								: JSON.stringify(rt.previousOutput, null, 2);
						instruction += `\n\n**Previous Output (REJECTED):**\n${outputStr}`;
					}

					// Include user feedback
					instruction += `\n\n**User Feedback:**\n"${rt.lastFeedback}"`;

					// Add instructions
					instruction += `\n\n**Instructions:**\nPlease regenerate the output for this tool, addressing the user's feedback. Learn from what was wrong in the previous output and improve upon it. Call the tool again with improved parameters.]`;

					return instruction;
				})
				.join("\n");
			effectiveUserInput =
				regenerationInstructions +
				(effectiveUserInput ? "\n\n" + effectiveUserInput : "");
			console.log(
				"[AskUserChatHandler] Injecting regeneration instructions with previous output for rejected tools:",
				rejectedTools.map((rt) => rt.toolName),
			);
		}

		const result = await agent.generate(effectiveUserInput, {
			memory: {
				thread: threadId,
				resource: resourceId,
			},
			toolsets, // Pass step-specific tools wrapped in toolset
			runtimeContext, // Triggers dynamic loading of instructions, model
			maxSteps: 5,
		});

		console.log("[AskUserChatHandler] Agent response received:", result.text);

		// DEBUG: Log the entire result structure to understand what we're getting
		console.log("[AskUserChatHandler] Result keys:", Object.keys(result));
		console.log("[AskUserChatHandler] result.text:", result.text);
		console.log(
			"[AskUserChatHandler] result.text length:",
			result.text?.length || 0,
		);
		console.log(
			"[AskUserChatHandler] toolCalls count:",
			result.toolCalls?.length || 0,
		);
		console.log(
			"[AskUserChatHandler] toolResults count:",
			result.toolResults?.length || 0,
		);
		console.log(
			"[AskUserChatHandler] uiMessages count:",
			result.uiMessages?.length || 0,
		);
		if (result.toolResults && result.toolResults.length > 0) {
			console.log(
				"[AskUserChatHandler] toolResults structure:",
				JSON.stringify(result.toolResults, null, 2),
			);
		}
		if (result.uiMessages && result.uiMessages.length > 0) {
			console.log(
				"[AskUserChatHandler] First uiMessage structure:",
				JSON.stringify(result.uiMessages[0], null, 2),
			);
		}

		// Add tool_calls metadata to assistant message
		if (result.toolCalls && result.toolCalls.length > 0) {
			await this.updateLastAssistantMessageMetadata(
				threadId,
				config.agentId,
				result.toolCalls.map((tc) => ({ name: tc.toolName })),
			);
		}

		// Process tool results for approval gates
		// Tool results are in result.toolResults[].payload.result
		const approvalStates =
			(context.executionVariables.approval_states as Record<string, any>) || {};

		// Track auto-selected values to save to DB
		const autoSelectedVariables: Record<string, unknown> = {};

		let toolsProcessed = 0;
		if (result.toolResults && result.toolResults.length > 0) {
			for (const toolResultItem of result.toolResults) {
				// Extract tool name and result from the payload
				const toolName = toolResultItem.payload?.toolName;
				const toolResult = toolResultItem.payload?.result;

				if (!toolName || !toolResult) {
					console.log("[AskUserChatHandler] Skipping invalid tool result item");
					continue;
				}

				toolsProcessed++;

				console.log(
					`[AskUserChatHandler] Processed tool ${toolName} result:`,
					toolResult,
				);

				// Check if tool requires approval
				if (
					toolResult &&
					typeof toolResult === "object" &&
					"type" in toolResult &&
					(toolResult.type === "approval_required" ||
						toolResult.type === "approval_required_selector")
				) {
					console.log(
						`[AskUserChatHandler] Tool ${toolName} requires approval (type: ${toolResult.type})`,
					);

					// Save to approval states
					approvalStates[toolName] = {
						status: "pending",
						value: toolResult.generated_value || toolResult.value || {},
						reasoning: toolResult.reasoning,
						...(toolResult.type === "approval_required_selector" && {
							available_options: toolResult.available_options || [],
						}),
						rejection_history:
							approvalStates[toolName]?.rejection_history || [],
						createdAt: new Date().toISOString(),
					};
				} else if (toolResult && typeof toolResult === "object") {
					// Tool returned value directly (auto-selected, no approval needed)
					// Save directly to execution variables
					console.log(
						`[AskUserChatHandler] Tool ${toolName} returned direct value (auto-selected)`,
					);

					// Merge the tool result fields into execution variables
					// For example: { selected_workflow_path_id: "uuid", reasoning: "..." }
					// becomes: executionVariables.selected_workflow_path_id = "uuid"
					for (const [key, value] of Object.entries(toolResult)) {
						context.executionVariables[key] = value;
						autoSelectedVariables[key] = value;
						console.log(`[AskUserChatHandler] Auto-selected ${key}:`, value);
					}
				}
			}
		}

		if (toolsProcessed > 0) {
			console.log(
				`[AskUserChatHandler] Processed ${toolsProcessed} tool results`,
			);
			console.log(
				`[AskUserChatHandler] About to save to executionId: ${context.systemVariables.execution_id}`,
			);
			console.log(
				"[AskUserChatHandler] Approval states to save:",
				JSON.stringify(approvalStates, null, 2),
			);
			console.log(
				"[AskUserChatHandler] Auto-selected variables to save:",
				JSON.stringify(autoSelectedVariables, null, 2),
			);

			try {
				// Build the variables to save
				// Include both approval_states AND any auto-selected values
				const variablesToSave: Record<string, unknown> = {
					approval_states: approvalStates,
					...autoSelectedVariables, // Spread auto-selected values into the save
				};

				console.log(
					"[AskUserChatHandler] All variables to save:",
					Object.keys(variablesToSave),
				);

				await stateManager.mergeExecutionVariables(
					context.systemVariables.execution_id,
					variablesToSave,
				);

				console.log(
					"[AskUserChatHandler] ✓ Successfully updated approval states and execution variables",
				);
			} catch (error) {
				console.error("[AskUserChatHandler] ✗ Error saving variables:", error);
				throw error;
			}
		}

		// Mastra automatically saves messages when agent is registered
		// No manual saving needed!

		// Check if step is complete after agent processing
		const isCompleteAfterAgent = await this.checkCompletionCondition(
			config,
			context,
		);

		if (isCompleteAfterAgent) {
			// Extract output variables
			const outputs = this.extractOutputVariables(config, context);
			return {
				output: {
					...outputs,
					...output, // Include thread ID if it was just created
					mastra_thread_id: agentContext.threadId, // Always include thread ID
				},
				nextStepNumber: step.nextStepNumber ?? null,
				requiresUserInput: false,
			};
		}

		// Step not complete, wait for more user input
		return {
			output: {
				...output, // Include thread ID if it was just created
				mastra_thread_id: agentContext.threadId, // Always include thread ID for message retrieval
			},
			nextStepNumber: step.nextStepNumber ?? null,
			requiresUserInput: true,
		};
	}

	/**
	 * Initialize or load Mastra thread for conversation
	 *
	 * With dynamic agent registration, we no longer create agents here.
	 * We only manage the Mastra thread for conversation persistence.
	 *
	 * @param config - Step configuration
	 * @param context - Execution context
	 * @returns Thread ID and needsSave flag
	 */
	private async initializeAgent(
		_config: AskUserChatStepConfig,
		context: ExecutionContext,
	): Promise<{
		threadId: string;
		needsSave: boolean;
	}> {
		// Get or create Mastra thread
		let threadId = context.executionVariables.mastra_thread_id as
			| string
			| undefined;
		let needsSave = false;

		if (!threadId) {
			const thread = await createThread(
				`user-${context.systemVariables.current_user_id}`,
			);
			threadId = thread.id;
			needsSave = true; // Need to save thread ID to execution variables
			console.log("[AskUserChatHandler] Created new thread:", threadId);
		} else {
			// Verify thread exists
			const thread = await getThread(threadId);
			if (!thread) {
				// Thread not found, create new one
				const newThread = await createThread(
					`user-${context.systemVariables.current_user_id}`,
				);
				threadId = newThread.id;
				needsSave = true;
				console.log(
					"[AskUserChatHandler] Thread not found, created new:",
					threadId,
				);
			}
		}

		return {
			threadId,
			needsSave,
		};
	}

	/**
	 * Fetch options from database via optionsSource config and store in execution variables
	 *
	 * This is used for tools that need dynamic options (e.g., complexity levels from workflow_paths).
	 * The options are fetched once and stored in execution.variables for the tool to access.
	 *
	 * Example: update_complexity tool needs complexity_options from workflow_paths table
	 */
	private async fetchAndStoreOptions(
		optionsSource: NonNullable<
			NonNullable<AskUserChatStepConfig["tools"]>[number]["optionsSource"]
		>,
		context: ExecutionContext,
	): Promise<void> {
		const { table, distinctField, filterBy, orderBy, outputVariable } =
			optionsSource;

		console.log(`[OptionsSource] Fetching options from ${table}`, {
			distinctField,
			filterBy,
			orderBy,
			outputVariable,
		});

		try {
			// Import database utilities
			const { db, workflowPaths } = await import("@chiron/db");
			const { sql } = await import("drizzle-orm");

			// Build query based on table
			let query: any;

			if (table === "workflow_paths") {
				// Query workflow_paths table
				query = db.select().from(workflowPaths).$dynamic();

				// Apply filters if provided
				if (filterBy) {
					const { and } = await import("drizzle-orm");
					const conditions: any[] = [];

					for (const [filterField, filterValue] of Object.entries(filterBy)) {
						// Handle JSONB path queries (e.g., "tags->'fieldType'->>'value'")
						if (filterField.includes("->")) {
							// Resolve template variables in filter value (e.g., {{detected_field_type}})
							let resolvedValue = String(filterValue);
							const templateMatch = resolvedValue.match(/\{\{([^}]+)\}\}/);
							if (templateMatch) {
								const varName = templateMatch[1];
								const varValue = context.executionVariables[varName];
								if (varValue) {
									resolvedValue = String(varValue);
									console.log(
										`[OptionsSource] Resolved {{${varName}}} → "${resolvedValue}"`,
									);
								}
							}

							// Build JSONB filter using raw SQL
							conditions.push(sql`${sql.raw(filterField)} = ${resolvedValue}`);
							console.log(
								`[OptionsSource] Added JSONB filter: ${filterField} = ${resolvedValue}`,
							);
						} else {
							// Regular field filter
							conditions.push(sql`${sql.raw(filterField)} = ${filterValue}`);
						}
					}

					// Apply all conditions with AND
					if (conditions.length > 0) {
						query = query.where(and(...conditions));
						console.log(
							`[OptionsSource] Applied ${conditions.length} filter conditions with AND`,
						);
					}
				}

				// Apply ordering if provided
				if (orderBy) {
					query = query.orderBy(sql.raw(orderBy));
				}

				// Execute query
				const results = await query;

				console.log(`[OptionsSource] Query returned ${results.length} results`);

				// Extract distinct values if distinctField specified
				if (distinctField) {
					// Handle JSONB path extraction (e.g., "tags->'complexity'")
					const extractedValues = results
						.map((row: any) => {
							// Extract value from JSONB path
							if (distinctField.includes("->")) {
								// Parse the JSONB path (e.g., "tags->'complexity'")
								// For simplicity, handle one level deep
								const pathMatch = distinctField.match(/(\w+)->['"](\w+)['"]/);
								if (pathMatch) {
									const [, field, key] = pathMatch;
									return row[field]?.[key];
								}
							}
							return row[distinctField];
						})
						.filter((v: any) => v !== null && v !== undefined);

					console.log(
						`[OptionsSource] Extracted ${extractedValues.length} values BEFORE deduplication:`,
						extractedValues.map((v: any) =>
							typeof v === "object" && v.value ? v.value : v,
						),
					);

					// Remove duplicates based on the 'value' property
					// Tags structure: {name, value, description}
					const uniqueValues = [
						...new Map(
							extractedValues.map((v: any) => {
								// Deduplicate by the 'value' field if tag is an object
								const key =
									typeof v === "object" && v.value
										? v.value
										: JSON.stringify(v);
								return [key, v];
							}),
						).values(),
					];

					context.executionVariables[outputVariable] = uniqueValues;

					console.log(
						`[OptionsSource] Extracted ${uniqueValues.length} unique values AFTER deduplication for ${outputVariable}:`,
						uniqueValues.map((v: any) =>
							typeof v === "object" && v.value ? v.value : v,
						),
					);
				} else {
					// Store full results
					context.executionVariables[outputVariable] = results;
					console.log(
						`[OptionsSource] Stored ${results.length} results in ${outputVariable}`,
					);
				}

				// Save to database
				await stateManager.mergeExecutionVariables(
					context.systemVariables.execution_id,
					{
						[outputVariable]: context.executionVariables[outputVariable],
					},
				);

				console.log(
					`[OptionsSource] ✓ Saved ${outputVariable} to execution variables`,
				);
			} else {
				throw new Error(`Unsupported optionsSource table: ${table}`);
			}
		} catch (error) {
			console.error("[OptionsSource] ✗ Failed to fetch options:", error);
			throw error;
		}
	}

	/**
	 * Check completion condition for chat step
	 *
	 * Supported conditions:
	 * - all-tools-approved: All required tools have been approved
	 * - user-satisfied: User explicitly marks as complete (future)
	 * - max-turns: Maximum conversation turns reached (future)
	 * - confidence-threshold: AI confidence threshold (future)
	 */
	private async checkCompletionCondition(
		config: AskUserChatStepConfig,
		context: ExecutionContext,
	): Promise<boolean> {
		const condition = config.completionCondition;

		switch (condition.type) {
			case "all-tools-approved": {
				const requiredTools = condition.requiredTools || [];

				// If no tools required, never complete automatically
				// (This prevents empty requiredTools from causing immediate completion)
				if (requiredTools.length === 0) {
					return false;
				}

				const approvalStates = (context.executionVariables.approval_states ||
					{}) as Record<
					string,
					{ status: "pending" | "approved" | "rejected" }
				>;

				// Check if all required tools have been approved
				return requiredTools.every((toolName) => {
					const state = approvalStates[toolName];
					return state && state.status === "approved";
				});
			}

			case "user-satisfied":
			case "max-turns":
			case "confidence-threshold":
				// TODO: Implement these conditions in future iterations
				console.warn(
					`[AskUserChatHandler] Completion condition "${condition.type}" not yet implemented`,
				);
				return false;

			default:
				throw new Error(
					`Unknown completion condition type: ${(condition as any).type}`,
				);
		}
	}

	/**
	 * Extract output variables from approval states
	 *
	 * Maps output variable names to their values from approval_states
	 * Example: { project_description: "approval_states.update_summary.value" }
	 */
	private extractOutputVariables(
		config: AskUserChatStepConfig,
		context: ExecutionContext,
	): Record<string, unknown> {
		if (!config.outputVariables) {
			return {};
		}

		const outputs: Record<string, unknown> = {};
		const approvalStates = (context.executionVariables.approval_states ||
			{}) as Record<string, { value: unknown }>;

		for (const [outputName, path] of Object.entries(config.outputVariables)) {
			// Parse path like "approval_states.update_summary.value" or "approval_states.update_summary.value.summary"
			if (typeof path !== "string") {
				console.warn(
					`[AskUserChatHandler] Invalid output variable path type: ${typeof path}`,
				);
				continue;
			}

			const pathParts = path.split(".");
			if (pathParts.length >= 3 && pathParts[0] === "approval_states") {
				const toolName = pathParts[1];
				if (!toolName) {
					console.warn(
						`[AskUserChatHandler] Missing tool name in path: ${path}`,
					);
					continue;
				}

				const state = approvalStates[toolName];
				if (!state) {
					console.warn(
						`[AskUserChatHandler] Tool state not found: ${toolName}`,
					);
					continue;
				}

				// Navigate the rest of the path starting from the tool state
				// e.g., "value.summary" or just "value"
				const remainingPath = pathParts.slice(2);
				let value: any = state;

				for (const part of remainingPath) {
					if (value && typeof value === "object" && part in value) {
						value = value[part];
					} else {
						value = undefined;
						break;
					}
				}

				if (value !== undefined) {
					outputs[outputName] = value;
				}
			} else {
				console.warn(
					`[AskUserChatHandler] Unsupported output variable path: ${path}`,
				);
			}
		}

		return outputs;
	}
}
