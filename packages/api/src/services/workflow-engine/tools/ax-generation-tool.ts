import { ai, ax } from "@ax-llm/ax";
import type { AskUserChatStepConfig } from "@chiron/db";
import { appConfig, db } from "@chiron/db";
import { createTool } from "@mastra/core/tools";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { decrypt } from "../../encryption";
import { getThreadMessages } from "../../mastra/mastra-service";
import type { ExecutionContext } from "../execution-context";

/**
 * Ax-Generation Tool Builder
 *
 * Builds Mastra tools that use Ax signatures for AI-powered content generation.
 * Supports:
 * - ChainOfThought strategy (shows reasoning)
 * - Predict strategy (direct output)
 * - Input resolution from multiple sources (variable, context, literal, playbook)
 * - Approval gates for human-in-the-loop validation
 * - ACE playbook injection for online learning
 *
 * Story 1.6: This enables the PM Agent to generate project summaries,
 * classify complexity, and create project names with user approval.
 *
 * @see docs/architecture/STORY-1-6-ARCHITECTURE-SUMMARY.md
 */

type ToolConfig = NonNullable<AskUserChatStepConfig["tools"]>[number];

/**
 * Build an Ax-powered Mastra tool from config
 *
 * This tool wraps an Ax signature with approval gate logic.
 * When executed, it:
 * 1. Resolves inputs from various sources
 * 2. Generates content using Ax signature
 * 3. Filters internal fields
 * 4. Returns result for approval (if requiresApproval: true)
 *
 * @param config - Tool configuration from step config
 * @param context - Execution context with variables
 * @param agentId - Agent ID for ACE playbook loading
 * @returns Mastra tool created with createTool()
 */
export async function buildAxGenerationTool(
	config: ToolConfig,
	context: ExecutionContext,
	agentId: string,
): Promise<ReturnType<typeof createTool>> {
	if (!config.axSignature) {
		throw new Error(
			`Tool ${config.name} is type "ax-generation" but missing axSignature config`,
		);
	}

	const axConfig = config.axSignature;

	// Build Ax signature string from config (with dynamic class options support)
	const signatureString = buildAxSignatureString(axConfig, context, config);

	// Create Ax program with strategy
	const program = ax(signatureString);

	// Set description if provided
	if (axConfig.input.length > 0) {
		const inputDescriptions = axConfig.input
			.map((input) => `- ${input.name}: ${input.description}`)
			.join("\n");
		program.setDescription(`Generate content based on:\n${inputDescriptions}`);
	}

	// Create proper Mastra tool using createTool()
	return createTool({
		id: config.name,
		description:
			config.description ||
			`Generate content using Ax signature (${axConfig.strategy})`,
		inputSchema: z.object({}), // Tools called by agent don't need explicit input schema
		outputSchema: z.object({}), // Output schema is dynamic based on Ax signature
		execute: async ({ context: toolContext }) => {
			// Resolve inputs from config
			// Pass toolContext so resolveInputs can access current message
			const resolvedInputs = await resolveInputs(
				axConfig.input,
				context,
				agentId,
				toolContext, // Include Mastra's tool context (has current message)
			);

			console.log(
				`[AxGenerationTool] Generating ${config.name} with inputs:`,
				resolvedInputs,
			);

			// Get user settings to configure AI model
			const userId = context.systemVariables.current_user_id;

			// Load user's API key from database
			const [userConfig] = await db
				.select()
				.from(appConfig)
				.where(eq(appConfig.userId, userId));

			let apiKey = process.env.OPENROUTER_API_KEY; // Fallback to env var
			let modelId = "anthropic/claude-3.5-sonnet:beta"; // Default model

			if (userConfig?.openrouterApiKey) {
				try {
					apiKey = decrypt(userConfig.openrouterApiKey);
				} catch (_error) {
					console.warn(
						"[AxGenerationTool] Failed to decrypt user API key, using env fallback",
					);
				}
			}

			// Model selection precedence:
			// 1. Runtime selection from UI (highest priority - per-execution choice)
			// 2. User's saved preference (medium priority - account default)
			// 3. System default (lowest priority - fallback)
			if (context.executionVariables.selected_model) {
				const runtimeModel = context.executionVariables
					.selected_model as string;
				// Parse format "provider:modelId" -> extract modelId
				// Use indexOf to split only on FIRST colon (model IDs can contain colons like "model:free")
				const firstColonIndex = runtimeModel.indexOf(":");
				modelId =
					firstColonIndex !== -1
						? runtimeModel.slice(firstColonIndex + 1)
						: runtimeModel;
				console.log(
					`[AxGenerationTool] Using runtime model selection: ${runtimeModel} (parsed: ${modelId})`,
				);
			} else if (userConfig?.selectedModelId) {
				modelId = userConfig.selectedModelId;
				console.log(
					`[AxGenerationTool] Using user's saved model preference: ${modelId}`,
				);
			} else {
				console.log(`[AxGenerationTool] Using default model: ${modelId}`);
			}

			// Create AxAIService from user settings
			// OpenRouter is the primary provider
			const aiService = ai({
				name: "openrouter",
				apiKey,
				config: {
					model: modelId,
				},
				options: {
					debug: false, // Set to true for debugging
				},
			});

			// Call Ax program to generate content
			try {
				const result = await program.forward(aiService, resolvedInputs);

				console.log("[AxGenerationTool] Generated result:", result);

				// Extract fields with extractFrom (deterministic post-LLM extraction)
				console.log("[AxGenerationTool] Calling extractDeterministicFields...");
				console.log(
					"[AxGenerationTool] resolvedInputs keys:",
					Object.keys(resolvedInputs),
				);
				const enrichedResult = extractDeterministicFields(
					result,
					axConfig,
					resolvedInputs,
				);
				console.log("[AxGenerationTool] Enriched result:", enrichedResult);

				// Filter out internal fields
				const publicResult = filterInternalFields(enrichedResult, axConfig);
				console.log(
					"[AxGenerationTool] publicResult after filtering:",
					publicResult,
				);

				// Extract reasoning if ChainOfThought was used
				const reasoning =
					axConfig.strategy === "ChainOfThought" && "reasoning" in result
						? (result as any).reasoning
						: undefined;

				// If requires approval, return approval state structure
				if (config.requiresApproval) {
					// Check if this tool has optionsSource (for card selector UI)
					if (config.optionsSource) {
						const availableOptions =
							context.executionVariables[config.optionsSource.outputVariable];

						// Auto-select optimization: If there's only ONE option, skip approval and auto-select it
						if (
							Array.isArray(availableOptions) &&
							availableOptions.length === 1
						) {
							const singleOption = availableOptions[0];
							console.log(
								`[AxGenerationTool] Tool ${config.name} has only 1 option - auto-selecting without approval`,
								{ option: singleOption },
							);

							// Return the auto-selected value directly (no approval needed)
							// Use the ID as the selected value (consistent with manual selection)
							const autoSelectedValue =
								singleOption.id || singleOption.value || singleOption;

							// Build result matching the expected output field name
							// For select_workflow_path: { selected_workflow_path_id: "uuid" }
							const outputField = axConfig.output.find((o) => !o.internal);
							if (outputField) {
								return {
									[outputField.name]: autoSelectedValue,
									reasoning: `Auto-selected (only 1 option available): ${singleOption.displayName || singleOption.name || autoSelectedValue}`,
								};
							}

							return {
								...publicResult,
								reasoning: `Auto-selected (only 1 option available): ${singleOption.displayName || singleOption.name || autoSelectedValue}`,
							};
						}

						console.log(
							`[AxGenerationTool] Tool ${config.name} requires approval with options selector`,
							{ optionCount: availableOptions?.length || 0 },
						);

						return {
							type: "approval_required_selector",
							tool_name: config.name,
							generated_value: publicResult,
							available_options: availableOptions || [],
							display_config: config.optionsSource.displayConfig, // Pass displayConfig to frontend
							require_feedback_on_override: config.requireFeedbackOnOverride, // Pass override feedback flag
							reasoning,
						};
					}

					// Standard text-based approval (no options)
					return {
						type: "approval_required",
						tool_name: config.name,
						generated_value: publicResult,
						reasoning,
					};
				}

				return publicResult;
			} catch (error) {
				console.error(
					`[AxGenerationTool] Error generating content for ${config.name}:`,
					error,
				);
				throw new Error(
					`Failed to generate content: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},
	});
}

/**
 * Build Ax signature string from config with dynamic class options support
 *
 * Supports dynamic class types that pull options from database:
 * - Regular: "fieldName:string" → "fieldName:string"
 * - Class (static): type="class" → uses hardcoded options
 * - Class (dynamic): type="class" + optionsSource → pulls from context.executionVariables
 *
 * Example outputs:
 * - "conversation_history:string, project_description:string -> summary:string, reasoning:string"
 * - "description:string -> complexity:class \"simple, moderate, complex\" \"Complexity level\", reasoning:string"
 *
 * @param axConfig - Ax signature configuration
 * @param context - Execution context with variables (for dynamic class options)
 * @param config - Tool configuration (for optionsSource)
 * @returns Signature string for ax()
 */
function buildAxSignatureString(
	axConfig: NonNullable<ToolConfig["axSignature"]>,
	context: ExecutionContext,
	config: ToolConfig,
): string {
	const inputs = axConfig.input
		.map((input) => {
			const inputAny = input as any;

			// Handle json/json[] types with selectFields - generate inline schema
			if (
				(input.type === "json" || input.type === "json[]") &&
				inputAny.selectFields &&
				Array.isArray(inputAny.selectFields)
			) {
				const inlineSchema = `{${inputAny.selectFields.join(", ")}}`;
				const typeWithSchema =
					input.type === "json[]" ? `Array of ${inlineSchema}` : inlineSchema;

				console.log(
					`[AxGenerationTool] Building input '${input.name}' with selectFields: ${typeWithSchema}`,
				);

				return `${input.name}:${input.type} "${typeWithSchema}"`;
			}

			// Include description to guide AX on how to use the input
			if (input.description) {
				return `${input.name}:${input.type} "${input.description}"`;
			}
			return `${input.name}:${input.type}`;
		})
		.join(", ");

	const outputs = axConfig.output
		.filter((output) => {
			// Skip fields with extractFrom - they're extracted post-LLM, not generated
			const outputAny = output as any;
			if (outputAny.extractFrom) {
				console.log(
					`[AxGenerationTool] Skipping output field '${output.name}' in signature (has extractFrom - will be extracted post-LLM)`,
				);
				return false;
			}
			return true;
		})
		.map((output) => {
			const outputAny = output as any;

			// Check if this is a class type with field-level classesFrom
			if (output.type === "class" && outputAny.classesFrom) {
				const { source, field } = outputAny.classesFrom;
				const options = context.executionVariables[source] as Array<
					Record<string, any>
				>;

				if (options && Array.isArray(options) && options.length > 0) {
					// Extract values from specified field
					const optionValues = options
						.map((opt) => opt[field])
						.filter((v) => v)
						.join(", ");

					if (optionValues) {
						console.log(
							`[AxGenerationTool] Building class field '${output.name}' with classesFrom (source: ${source}, field: ${field}): [${optionValues}]`,
						);

						// Build: fieldName:class "option1, option2, option3" "Description"
						return `${output.name}:class "${optionValues}" "${output.description || ""}"`;
					}
				}

				console.warn(
					`[AxGenerationTool] Class field '${output.name}' has classesFrom but no options found in variable '${source}' - using string type as fallback`,
				);
				return `${output.name}:string`;
			}

			// Legacy: Check if this is a class type with tool-level optionsSource (backwards compatibility)
			if (output.type === "class" && config.optionsSource) {
				const optionsVariable = config.optionsSource.outputVariable;
				const options = context.executionVariables[optionsVariable] as Array<{
					value?: string;
					id?: string;
				}>;

				if (options && Array.isArray(options) && options.length > 0) {
					const optionValues = options
						.map((opt) => opt.value || opt.id)
						.filter((v) => v)
						.join(", ");

					if (optionValues) {
						console.log(
							`[AxGenerationTool] Building class field '${output.name}' with legacy optionsSource: [${optionValues}]`,
						);
						return `${output.name}:class "${optionValues}" "${output.description || ""}"`;
					}
				}

				console.warn(
					`[AxGenerationTool] Class field '${output.name}' has optionsSource but no options found - using string type as fallback`,
				);
				return `${output.name}:string`;
			}

			// Regular field (string, number, boolean, etc.)
			if (output.description) {
				return `${output.name}:${output.type} "${output.description}"`;
			}
			return `${output.name}:${output.type}`;
		})
		.join(", ");

	return `${inputs} -> ${outputs}`;
}

/**
 * Resolve input values from various sources
 *
 * Supports:
 * - source: "variable" - Get from execution.variables
 * - source: "context" - Fetch from Mastra thread conversation history
 * - source: "literal" - Use static default value
 * - source: "playbook" - Load ACE playbook for the agent
 *
 * @param inputConfigs - Input field configurations
 * @param context - Execution context
 * @param agentId - Agent ID for playbook loading
 * @returns Resolved input values
 */
async function resolveInputs(
	inputConfigs: NonNullable<ToolConfig["axSignature"]>["input"],
	context: ExecutionContext,
	agentId: string,
	toolContext?: any, // Mastra tool context with current message
): Promise<Record<string, unknown>> {
	const inputs: Record<string, unknown> = {};

	for (const inputConfig of inputConfigs) {
		switch (inputConfig.source) {
			case "variable": {
				const variableName = inputConfig.variableName || inputConfig.name;
				let value = context.executionVariables[variableName];

				if (value === undefined) {
					throw new Error(
						`Required variable "${variableName}" not found in execution variables`,
					);
				}

				// Filter fields if selectFields is specified for json/json[] types
				const inputAny = inputConfig as any;
				if (
					(inputConfig.type === "json" || inputConfig.type === "json[]") &&
					inputAny.selectFields &&
					Array.isArray(inputAny.selectFields)
				) {
					if (Array.isArray(value)) {
						// json[] - filter each object to only include selectFields
						value = value.map((item: any) => {
							const filtered: Record<string, any> = {};
							for (const field of inputAny.selectFields) {
								if (field in item) {
									filtered[field] = item[field];
								}
							}
							return filtered;
						});
						console.log(
							`[AxGenerationTool] Filtered ${inputConfig.name} to selectFields: [${inputAny.selectFields.join(", ")}]`,
						);
					} else if (typeof value === "object" && value !== null) {
						// json - filter single object
						const filtered: Record<string, any> = {};
						for (const field of inputAny.selectFields) {
							if (field in value) {
								filtered[field] = (value as any)[field];
							}
						}
						value = filtered;
						console.log(
							`[AxGenerationTool] Filtered ${inputConfig.name} to selectFields: [${inputAny.selectFields.join(", ")}]`,
						);
					}
				}

				inputs[inputConfig.name] = value;
				break;
			}

			case "context": {
				// Fetch conversation history from Mastra thread
				const threadId = context.executionVariables.mastra_thread_id as
					| string
					| undefined;

				if (!threadId) {
					// Thread doesn't exist yet (first message in conversation)
					// Provide minimal conversation context
					console.log(
						`[AxGenerationTool] No thread ID yet for ${inputConfig.name}, using minimal context`,
					);
					inputs[inputConfig.name] =
						"user: Initial conversation - no prior history available.";
					break;
				}

				console.log(
					`[AxGenerationTool] Fetching messages for thread: ${threadId}`,
				);
				const messages = await getThreadMessages(threadId);

				console.log(
					`[AxGenerationTool] Formatting ${messages.length} messages for conversation_history (thread: ${threadId})`,
				);

				// Handle case where thread exists but has no messages yet
				// This can happen on first message when tool executes before user message is committed
				if (messages.length === 0) {
					console.log(
						`[AxGenerationTool] Thread ${threadId} has no messages yet, using minimal context for ${inputConfig.name}`,
					);
					inputs[inputConfig.name] =
						"user: Initial conversation - gathering project requirements.";
					break;
				}

				// Format messages as conversation history string
				const conversationHistory = messages
					.map((msg, idx) => {
						// Parse content if it's a JSON string, otherwise use as-is
						let text = "";
						try {
							const content =
								typeof msg.content === "string"
									? JSON.parse(msg.content)
									: msg.content;

							// Log the actual structure to debug
							if (idx === 0) {
								console.log(
									"[AxGenerationTool] Sample message content type:",
									typeof msg.content,
								);
								console.log(
									"[AxGenerationTool] Sample message content:",
									JSON.stringify(content, null, 2),
								);
							}

							// Content is an array of content blocks like [{"type":"text","text":"..."}]
							if (Array.isArray(content)) {
								text = content
									.filter((block) => block.type === "text")
									.map((block) => block.text)
									.join(" ");
							} else if (typeof content === "object" && content !== null) {
								// Handle object content - check for common patterns
								if ("text" in content) {
									text = String(content.text);
								} else if ("content" in content) {
									text = String(content.content);
								} else {
									// Fallback: JSON stringify
									text = JSON.stringify(content);
								}
							} else {
								text = String(content);
							}
						} catch (error) {
							// If parsing fails, use as string
							console.warn(
								"[AxGenerationTool] Failed to parse message content:",
								error,
							);
							text = String(msg.content);
						}
						return `${msg.role}: ${text}`;
					})
					.join("\n");

				console.log(
					"[AxGenerationTool] Formatted conversation_history:",
					conversationHistory.substring(0, 200),
				);

				// Include current user message from system variables
				// This ensures the latest message is included even if not yet saved to thread
				let finalConversationHistory = conversationHistory;
				const currentUserMessage = context.systemVariables
					.current_user_message as string | undefined;

				if (currentUserMessage) {
					console.log(
						"[AxGenerationTool] Including current user message from systemVariables:",
						currentUserMessage.substring(0, 200),
					);
					const userMessageLine = `user: ${currentUserMessage}`;
					finalConversationHistory = conversationHistory
						? `${conversationHistory}\n${userMessageLine}`
						: userMessageLine;
				}

				inputs[inputConfig.name] = finalConversationHistory;
				break;
			}

			case "literal": {
				inputs[inputConfig.name] = inputConfig.defaultValue;
				break;
			}

			case "playbook": {
				// ACE playbook integration deferred to future story
				// Provide placeholder value to satisfy Ax signature validation
				inputs[inputConfig.name] = "No learned patterns available yet.";
				break;
			}

			default:
				throw new Error(`Unknown input source: ${(inputConfig as any).source}`);
		}
	}

	return inputs;
}

/**
 * Filter internal fields from Ax output
 *
 * Fields marked with internal: true are used for reasoning/debugging
 * but should not be shown in approval UI.
 *
 * @param result - Raw Ax generation result
 * @param axConfig - Ax signature configuration
 * @returns Filtered result with only public fields
 */
/**
 * Extract fields with extractFrom metadata (deterministic post-LLM extraction)
 *
 * Fields with extractFrom are NOT generated by the LLM - they're extracted
 * from source data based on other LLM-generated fields.
 *
 * Example: selected_workflow_path_name is extracted from workflow_path_options
 * by looking up the id that matches selected_workflow_path_id.
 *
 * @param result - LLM-generated result
 * @param axConfig - Ax signature configuration
 * @param resolvedInputs - Resolved input values (contains source data)
 * @returns Enriched result with extracted fields
 */
export function extractDeterministicFields(
	result: Record<string, unknown>,
	axConfig: NonNullable<ToolConfig["axSignature"]>,
	resolvedInputs: Record<string, unknown>,
): Record<string, unknown> {
	const enriched = { ...result };

	for (const output of axConfig.output) {
		const outputAny = output as any;

		// Skip if no extractFrom metadata
		if (!outputAny.extractFrom) continue;

		const { source, matchField, matchValue, selectField } =
			outputAny.extractFrom;

		// Get the match value from the LLM result
		const matchValueData = result[matchValue];
		if (!matchValueData) {
			console.warn(
				`[AxGenerationTool] extractFrom: matchValue field '${matchValue}' not found in result for '${output.name}'`,
			);
			continue;
		}

		// Get the source data from resolved inputs
		const sourceData = resolvedInputs[source];
		if (!sourceData || !Array.isArray(sourceData)) {
			console.warn(
				`[AxGenerationTool] extractFrom: source '${source}' not found or not an array for '${output.name}'`,
			);
			continue;
		}

		// Find the matching option
		const matchedOption = sourceData.find(
			(item: any) => item[matchField] === matchValueData,
		);

		if (!matchedOption) {
			console.warn(
				`[AxGenerationTool] extractFrom: no option found matching ${matchField}='${matchValueData}' in '${source}' for '${output.name}'`,
			);
			continue;
		}

		// Extract the desired field
		const extractedValue = matchedOption[selectField];
		if (extractedValue === undefined) {
			console.warn(
				`[AxGenerationTool] extractFrom: field '${selectField}' not found in matched option for '${output.name}'`,
			);
			continue;
		}

		// Add to result
		enriched[output.name] = extractedValue;
		console.log(
			`[AxGenerationTool] extractFrom: Extracted '${output.name}' = '${extractedValue}' (matched ${matchField}='${matchValueData}' in ${source})`,
		);
	}

	return enriched;
}

export function filterInternalFields(
	result: Record<string, unknown>,
	axConfig: NonNullable<ToolConfig["axSignature"]>,
): Record<string, unknown> {
	const filtered: Record<string, unknown> = {};

	for (const output of axConfig.output) {
		if (!output.internal && output.name in result) {
			filtered[output.name] = result[output.name];
		}
	}

	return filtered;
}

/**
 * Validate required variables exist before tool execution
 *
 * @param requiredVariables - List of required variable names
 * @param context - Execution context
 * @returns Validation result with missing variables if any
 */
export function validateRequiredVariables(
	requiredVariables: string[] | undefined,
	context: ExecutionContext,
): { valid: boolean; missingVariables?: string[] } {
	if (!requiredVariables || requiredVariables.length === 0) {
		return { valid: true };
	}

	const missing = requiredVariables.filter(
		(varName) => !(varName in context.executionVariables),
	);

	if (missing.length > 0) {
		return { valid: false, missingVariables: missing };
	}

	return { valid: true };
}
