import { agents, appConfig, db } from "@chiron/db";
import { Agent } from "@mastra/core/agent";
import type { RuntimeContext } from "@mastra/core/runtime-context";
import { Memory } from "@mastra/memory";
import { eq } from "drizzle-orm";
import Handlebars from "handlebars";
import { decrypt } from "../encryption";
import { loadModel, type ModelConfig } from "./model-loader";

/**
 * Agent Loader - Dynamically loads and registers agents from database
 *
 * This module handles the creation of Mastra agents with database-driven configurations.
 * All agent properties (instructions, model, tools) are loaded dynamically via runtimeContext,
 * allowing for real-time updates without server restarts.
 *
 * Architecture:
 * - Agents are registered with Mastra at startup
 * - Configuration is loaded from database on EVERY agent.generate() call
 * - RuntimeContext provides userId, projectId, variables for dynamic behavior
 * - User API keys are loaded per-request for model authentication
 *
 * @see docs/architecture/dynamic-agent-registration.md
 */

/**
 * Parse model string into provider and modelId
 * Format: "provider:model" or "provider/model"
 */
function _parseModelConfig(modelString: string): {
	provider: string;
	modelId: string;
} {
	const separators = [":", "/"];
	for (const sep of separators) {
		if (modelString.includes(sep)) {
			const [provider, modelId] = modelString.split(sep);
			return { provider: provider.trim(), modelId: modelId.trim() };
		}
	}

	// Default to openrouter if no separator
	return { provider: "openrouter", modelId: modelString };
}

/**
 * Load agent instructions with dynamic context
 *
 * This function is called on EVERY agent.generate() call via runtimeContext,
 * allowing for dynamic instruction updates based on workflow context.
 *
 * Note: agentRecord is passed from closure to avoid redundant DB query
 */
async function loadInstructions({
	agentRecord,
	userId,
	projectId,
	variables,
}: {
	agentRecord: typeof agents.$inferSelect;
	userId?: string;
	projectId?: string;
	variables?: Record<string, unknown>;
}): Promise<string> {
	// Start with base instructions (contains Handlebars placeholders)
	let instructions = agentRecord.instructions || "";

	// Build tool guidance from individual tool usageGuidance fields
	const toolsGuidance = (variables?.tools_guidance as string[]) || [];
	const toolsGuidanceSection =
		toolsGuidance.length > 0
			? toolsGuidance.join("\n")
			: "No specific tool usage guidance provided.";

	// Build context for Handlebars template resolution
	const templateContext = {
		workflow_id: variables?.workflow_id || "unknown",
		step_number: variables?.step_number || "",
		step_objective: variables?.step_objective || "",
		workflow_specific_instructions: toolsGuidanceSection,
		// Include all variables for flexibility
		...variables,
	};

	// Resolve Handlebars placeholders in agent instructions
	const compiledTemplate = Handlebars.compile(instructions, {
		strict: false, // Don't throw on missing variables (return empty string)
		noEscape: true, // Don't HTML-escape output
	});
	instructions = compiledTemplate(templateContext);

	// Inject current model information (so agent knows what model it's running on)
	const selectedModel = variables?.selected_model as string | undefined;
	const currentModel = selectedModel || agentRecord.llmModel;
	instructions += `\n\n---\n## System Information\n\n**Current Model**: ${currentModel}\n`;
	if (selectedModel) {
		instructions += `**Note**: User selected this model (overriding default: ${agentRecord.llmModel})\n`;
	}

	return instructions;
}

/**
 * Load model with user's API key
 *
 * This function is called on EVERY agent.generate() call via runtimeContext,
 * allowing for per-user API key authentication.
 *
 * Model Precedence:
 * 1. Execution variables (selected_model) - user's runtime choice
 * 2. Agent database config (llmModel) - agent's default model
 *
 * Note: agentRecord is passed from closure to avoid redundant DB query
 */
async function loadModelWithUserKey({
	agentRecord,
	userId,
	variables,
}: {
	agentRecord: typeof agents.$inferSelect;
	userId: string;
	variables?: Record<string, unknown>;
}): Promise<any> {
	// Check for model override in execution variables (precedence over agent default)
	const selectedModel = variables?.selected_model as string | undefined;
	const modelToUse = selectedModel || agentRecord.llmModel;

	// Parse model string: "provider:modelId" -> extract provider and modelId
	// Frontend sends format like "openrouter:anthropic/claude-3.5-sonnet" or "openrouter:meta-llama/llama-3.3-70b-instruct:free"
	// We need provider="openrouter" and modelId="anthropic/claude-3.5-sonnet"
	// Use indexOf to split only on FIRST colon (model IDs can contain colons like "model:free")
	const firstColonIndex = modelToUse.indexOf(":");
	let provider: string;
	let modelId: string;

	if (firstColonIndex !== -1) {
		// Format: "provider:modelId"
		provider = modelToUse.slice(0, firstColonIndex);
		modelId = modelToUse.slice(firstColonIndex + 1);
	} else {
		// No colon - use agent's default provider
		provider = agentRecord.llmProvider;
		modelId = modelToUse;
	}

	console.log(`[Agent Loader] Model selection for ${agentRecord.name}:`, {
		selectedModel,
		agentDefault: agentRecord.llmModel,
		usingModel: modelToUse,
		extractedProvider: provider,
		parsedModelId: modelId,
		agentDefaultProvider: agentRecord.llmProvider,
	});

	// Load user's API key
	const [userConfigRecord] = await db
		.select()
		.from(appConfig)
		.where(eq(appConfig.userId, userId));

	if (!userConfigRecord) {
		throw new Error(`User config not found for user: ${userId}`);
	}

	// Decrypt appropriate API key based on provider
	let apiKey: string | undefined;
	if (provider === "openrouter" && userConfigRecord.openrouterApiKey) {
		apiKey = decrypt(userConfigRecord.openrouterApiKey);
	} else if (provider === "anthropic" && userConfigRecord.anthropicApiKey) {
		apiKey = decrypt(userConfigRecord.anthropicApiKey);
	} else if (provider === "openai" && userConfigRecord.openaiApiKey) {
		apiKey = decrypt(userConfigRecord.openaiApiKey);
	}

	if (!apiKey) {
		throw new Error(
			`No API key found for provider: ${provider}, user: ${userId}`,
		);
	}

	// Create model instance with user's API key
	const fullModelConfig: ModelConfig = {
		provider: provider as any,
		modelId: modelId,
		apiKey,
	};

	return loadModel(fullModelConfig);
}

/**
 * Load tools for an agent from database
 *
 * TODO: Implement dynamic tool loading
 * Currently returns empty object - tools will be added in future iteration
 */
async function _loadTools({
	agentId,
}: {
	agentId: string;
}): Promise<Record<string, any>> {
	// Load agent to get tool configurations
	const [agentRecord] = await db
		.select()
		.from(agents)
		.where(eq(agents.id, agentId));

	if (!agentRecord || !agentRecord.tools) {
		return {};
	}

	// TODO: Build Mastra tools from database tool configs
	// For now, return empty - tools are handled separately in workflow step handlers
	return {};
}

/**
 * Create a dynamic Mastra agent that loads configuration from database
 *
 * The agent uses runtimeContext to load instructions, model, and tools
 * on EVERY agent.generate() call, ensuring configuration is always fresh.
 *
 * @param agentRecord - Database record for the agent
 * @returns Mastra Agent instance with dynamic configuration
 */
export function createDynamicAgent(
	agentRecord: typeof agents.$inferSelect,
): Agent {
	return new Agent({
		name: agentRecord.name,

		// Dynamic instructions - loads ACE playbooks on every call
		// Note: agentRecord comes from closure, no DB query needed
		instructions: async ({
			runtimeContext,
		}: {
			runtimeContext: RuntimeContext;
		}) => {
			const userId = runtimeContext.get("userId") as string | undefined;
			const projectId = runtimeContext.get("projectId") as string | undefined;
			const variables = runtimeContext.get("variables") as
				| Record<string, unknown>
				| undefined;

			return await loadInstructions({
				agentRecord,
				userId,
				projectId,
				variables,
			});
		},

		// Dynamic model - loads user's API key on every call
		// Note: agentRecord comes from closure, no DB query needed
		model: async ({ runtimeContext }: { runtimeContext: RuntimeContext }) => {
			const userId = runtimeContext.get("userId") as string;
			const variables = runtimeContext.get("variables") as
				| Record<string, unknown>
				| undefined;

			if (!userId) {
				throw new Error(
					"userId is required in runtimeContext for model loading",
				);
			}

			return await loadModelWithUserKey({
				agentRecord,
				userId,
				variables,
			});
		},

		// Dynamic tools - DISABLED
		// Tools are passed dynamically via toolsets in agent.generate() call
		// to allow per-workflow-step tool configuration
		// tools: async ({ runtimeContext }: { runtimeContext: RuntimeContext }) => {
		// 	return await loadTools({
		// 		agentId: agentRecord.id,
		// 	});
		// },

		// Memory configuration - uses shared Mastra storage
		memory: new Memory({
			options: {
				lastMessages: 50, // Include last 50 messages for context
				threads: {
					generateTitle: true, // Auto-generate thread titles
				},
			},
		}),
	});
}

/**
 * Load all active agents from database and create dynamic Agent instances
 *
 * Called once at Mastra initialization to register all agents.
 * Agents load their configuration dynamically via runtimeContext on each call.
 *
 * @returns Record of agent name to Agent instance
 */
export async function loadAllAgents(): Promise<Record<string, Agent>> {
	const agentRecords = await db
		.select()
		.from(agents)
		.where(eq(agents.active, true));

	const mastraAgents: Record<string, Agent> = {};

	for (const record of agentRecords) {
		mastraAgents[record.name] = createDynamicAgent(record);
		console.log(`[Agent Loader] Registered agent: ${record.name}`);
	}

	console.log(
		`[Agent Loader] Loaded ${agentRecords.length} agents from database`,
	);

	return mastraAgents;
}
