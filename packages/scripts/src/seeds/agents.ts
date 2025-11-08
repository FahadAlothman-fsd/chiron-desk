import { db, agents } from "@chiron/db";

const CORE_AGENTS = [
	{
		name: "analyst",
		displayName: "Mimir",
		description:
			"Conducts analysis, research, and product brief development. Gathers requirements and defines project scope.",
		role: "analyst",
		llmProvider: "anthropic" as const,
		llmModel: "claude-sonnet-4-20250514",
		llmTemperature: "0.7",
		tools: null,
		mcpServers: null,
		color: "#3B82F6", // Blue
		avatar: null,
		active: true,
	},
	{
		name: "pm",
		displayName: "Athena",
		description:
			"Creates PRDs, defines epics and stories. Manages product requirements and roadmap planning.",
		role: "product-manager",
		llmProvider: "anthropic" as const,
		llmModel: "claude-sonnet-4-20250514",
		llmTemperature: "0.7",
		tools: null,
		mcpServers: null,
		color: "#8B5CF6", // Purple
		avatar: null,
		active: true,
	},
	{
		name: "architect",
		displayName: "Daedalus",
		description:
			"Designs system architecture, makes technical decisions. Creates architecture documents and validates technical feasibility.",
		role: "architect",
		llmProvider: "anthropic" as const,
		llmModel: "claude-sonnet-4-20250514",
		llmTemperature: "0.7",
		tools: null,
		mcpServers: null,
		color: "#10B981", // Green
		avatar: null,
		active: true,
	},
	{
		name: "dev",
		displayName: "Osiris",
		description:
			"Implements features, writes code and tests. Executes stories and technical implementation.",
		role: "developer",
		llmProvider: "anthropic" as const,
		llmModel: "claude-sonnet-4-20250514",
		llmTemperature: "0.5",
		tools: null,
		mcpServers: null,
		color: "#F59E0B", // Amber
		avatar: null,
		active: true,
	},
	{
		name: "sm",
		displayName: "Chronos",
		description:
			"Manages sprint planning and retrospectives. Facilitates agile processes and team coordination.",
		role: "scrum-master",
		llmProvider: "anthropic" as const,
		llmModel: "claude-sonnet-4-20250514",
		llmTemperature: "0.7",
		tools: null,
		mcpServers: null,
		color: "#EF4444", // Red
		avatar: null,
		active: true,
	},
	{
		name: "ux-designer",
		displayName: "Ariadne",
		description:
			"Creates user experience designs and interfaces. Defines UI/UX patterns and design systems.",
		role: "ux-designer",
		llmProvider: "anthropic" as const,
		llmModel: "claude-sonnet-4-20250514",
		llmTemperature: "0.8",
		tools: null,
		mcpServers: null,
		color: "#EC4899", // Pink
		avatar: null,
		active: true,
	},
];

export async function seedAgents() {
	for (const agent of CORE_AGENTS) {
		await db.insert(agents).values(agent).onConflictDoNothing();
		console.log(`  ✓ ${agent.displayName} (${agent.name})`);
	}
}
