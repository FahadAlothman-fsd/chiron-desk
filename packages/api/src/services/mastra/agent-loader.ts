import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import type { RuntimeContext } from "@mastra/core/runtime-context";
import { db, agents, appConfig, acePlaybooks } from "@chiron/db";
import { eq, and, or } from "drizzle-orm";
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
 * - ACE playbooks are injected based on scope (global/user/project)
 * - User API keys are loaded per-request for model authentication
 *
 * @see docs/architecture/dynamic-agent-registration.md
 */

/**
 * Parse model string into provider and modelId
 * Format: "provider:model" or "provider/model"
 */
function parseModelConfig(modelString: string): {
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
 * Load ACE playbooks for an agent based on scope
 *
 * Scope priority: project > user > global
 * Multiple playbooks can apply, they are merged in order
 */
async function loadACEPlaybooks(
	agentId: string,
	userId?: string,
	projectId?: string,
): Promise<
	Array<{
		scope: string;
		playbook: {
			sections: Record<string, { bullets: string[] }>;
		};
	}>
> {
	const conditions = [
		eq(acePlaybooks.agentId, agentId),
		or(
			eq(acePlaybooks.scope, "global"),
			userId
				? and(eq(acePlaybooks.scope, "user"), eq(acePlaybooks.userId, userId))
				: undefined,
			projectId
				? and(
						eq(acePlaybooks.scope, "project"),
						eq(acePlaybooks.projectId, projectId),
					)
				: undefined,
		),
	].filter(Boolean);

	const playbooks = await db
		.select()
		.from(acePlaybooks)
		.where(and(...conditions))
		.orderBy(acePlaybooks.updatedAt);

	return playbooks;
}

/**
 * Format ACE playbooks into markdown sections for instruction injection
 */
function formatACEPlaybooks(
	playbooks: Array<{
		scope: string;
		playbook: { sections: Record<string, { bullets: string[] }> };
	}>,
): string {
	if (playbooks.length === 0) return "";

	let formatted = "\n\n---\n## ACE Context (Learned Patterns)\n\n";

	for (const pb of playbooks) {
		formatted += `### ${pb.scope.charAt(0).toUpperCase() + pb.scope.slice(1)} Scope\n\n`;

		for (const [sectionName, sectionData] of Object.entries(
			pb.playbook.sections,
		)) {
			formatted += `**${sectionName}:**\n`;
			for (const bullet of sectionData.bullets) {
				formatted += `- ${bullet}\n`;
			}
			formatted += "\n";
		}
	}

	return formatted;
}

/**
 * Load agent instructions with ACE playbook injection
 *
 * This function is called on EVERY agent.generate() call via runtimeContext,
 * ensuring ACE playbooks are always fresh from the database.
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
	// Start with base instructions
	let instructions = agentRecord.instructions || "";

	// Inject current model information (so agent knows what model it's running on)
	const selectedModel = variables?.selected_model as string | undefined;
	const currentModel = selectedModel || agentRecord.llmModel;
	instructions += `\n\n---\n## System Information\n\n**Current Model**: ${currentModel}\n`;
	if (selectedModel) {
		instructions += `**Note**: User selected this model (overriding default: ${agentRecord.llmModel})\n`;
	}

	// Load and inject ACE playbooks
	const playbooks = await loadACEPlaybooks(agentRecord.id, userId, projectId);
	if (playbooks.length > 0) {
		instructions += formatACEPlaybooks(playbooks);
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

	console.log(`[Agent Loader] Model selection for ${agentRecord.name}:`, {
		selectedModel,
		agentDefault: agentRecord.llmModel,
		usingModel: modelToUse,
	});

	// Parse model config
	const modelConfig = parseModelConfig(modelToUse);

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
	if (
		modelConfig.provider === "openrouter" &&
		userConfigRecord.openrouterApiKey
	) {
		apiKey = decrypt(userConfigRecord.openrouterApiKey);
	} else if (
		modelConfig.provider === "anthropic" &&
		userConfigRecord.anthropicApiKey
	) {
		apiKey = decrypt(userConfigRecord.anthropicApiKey);
	} else if (
		modelConfig.provider === "openai" &&
		userConfigRecord.openaiApiKey
	) {
		apiKey = decrypt(userConfigRecord.openaiApiKey);
	}

	if (!apiKey) {
		throw new Error(
			`No API key found for provider: ${modelConfig.provider}, user: ${userId}`,
		);
	}

	// Create model instance with user's API key
	const fullModelConfig: ModelConfig = {
		provider: modelConfig.provider as any,
		modelId: modelConfig.modelId,
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
async function loadTools({
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

		// Dynamic tools - loads from DB on every call
		// TODO: Implement tool loading - currently returns empty
		tools: async ({ runtimeContext }: { runtimeContext: RuntimeContext }) => {
			return await loadTools({
				agentId: agentRecord.id,
			});
		},

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
