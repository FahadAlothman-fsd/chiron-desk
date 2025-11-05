import { db, agents } from "@chiron/db";

const CORE_AGENTS = [
	{
		name: "analyst",
		displayName: "Business Analyst",
		description:
			"Conducts analysis, research, and product brief development. Gathers requirements and defines project scope.",
		role: "analyst",
		llmProvider: "anthropic" as const,
		llmModel: "claude-sonnet-4-20250514",
		llmTemperature: "0.7",
		capabilitiesJson: {
			workflows: ["product-brief", "brainstorm-project", "research"],
			tools: ["web-search", "document-analysis"],
		},
		color: "#3B82F6", // Blue
		avatar: null,
		active: true,
	},
	{
		name: "pm",
		displayName: "Product Manager",
		description:
			"Creates PRDs, defines epics and stories. Manages product requirements and roadmap planning.",
		role: "product-manager",
		llmProvider: "anthropic" as const,
		llmModel: "claude-sonnet-4-20250514",
		llmTemperature: "0.7",
		capabilitiesJson: {
			workflows: ["prd", "validate-prd"],
			tools: ["document-generation", "epic-breakdown"],
		},
		color: "#8B5CF6", // Purple
		avatar: null,
		active: true,
	},
	{
		name: "architect",
		displayName: "System Architect",
		description:
			"Designs system architecture, makes technical decisions. Creates architecture documents and validates technical feasibility.",
		role: "architect",
		llmProvider: "anthropic" as const,
		llmModel: "claude-sonnet-4-20250514",
		llmTemperature: "0.7",
		capabilitiesJson: {
			workflows: [
				"create-architecture",
				"validate-architecture",
				"solutioning-gate-check",
			],
			tools: ["diagram-generation", "technical-analysis"],
		},
		color: "#10B981", // Green
		avatar: null,
		active: true,
	},
	{
		name: "dev",
		displayName: "Developer",
		description:
			"Implements features, writes code and tests. Executes stories and technical implementation.",
		role: "developer",
		llmProvider: "anthropic" as const,
		llmModel: "claude-sonnet-4-20250514",
		llmTemperature: "0.5",
		capabilitiesJson: {
			workflows: ["dev-story", "code-review"],
			tools: ["code-generation", "testing", "git-operations"],
		},
		color: "#F59E0B", // Amber
		avatar: null,
		active: true,
	},
	{
		name: "sm",
		displayName: "Scrum Master",
		description:
			"Manages sprint planning and retrospectives. Facilitates agile processes and team coordination.",
		role: "scrum-master",
		llmProvider: "anthropic" as const,
		llmModel: "claude-sonnet-4-20250514",
		llmTemperature: "0.7",
		capabilitiesJson: {
			workflows: ["sprint-planning", "retrospective"],
			tools: ["story-management", "sprint-tracking"],
		},
		color: "#EF4444", // Red
		avatar: null,
		active: true,
	},
	{
		name: "ux-designer",
		displayName: "UX Designer",
		description:
			"Creates user experience designs and interfaces. Defines UI/UX patterns and design systems.",
		role: "ux-designer",
		llmProvider: "anthropic" as const,
		llmModel: "claude-sonnet-4-20250514",
		llmTemperature: "0.8",
		capabilitiesJson: {
			workflows: ["create-ux-design", "design-thinking"],
			tools: ["design-generation", "user-research"],
		},
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
