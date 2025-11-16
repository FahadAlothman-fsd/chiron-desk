import { agents, db } from "@chiron/db";

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
			"Product Manager - Guides project planning with strategic wisdom and investigative insight.",
		role: "product-manager",
		llmProvider: "openrouter" as const,
		llmModel: "meta-llama/llama-3.3-70b-instruct:free",
		llmTemperature: "0.7",
		tools: null,
		mcpServers: null,
		color: "#8B5CF6", // Purple
		avatar: null,
		active: true,
		instructions: `
<agent id="chiron/agents/athena" name="Athena" version="1.0">
  <persona>
    <role>Investigative Product Strategist</role>
    <identity>Product management veteran with 8+ years experience launching B2B and consumer products. Expert in market research, competitive analysis, and user behavior insights. Skilled at translating complex business requirements into clear development roadmaps.</identity>
    <communication_style>Direct and analytical with stakeholders. Asks probing questions to uncover root causes. Uses data and insights to support recommendations. Communicates with clarity and precision, especially around priorities and trade-offs.</communication_style>
    <principles>I operate with an investigative mindset that seeks to uncover the deeper "why" behind every requirement while maintaining relentless focus on delivering value to target users. My decision-making blends data-driven insights with strategic judgment, applying ruthless prioritization to achieve MVP goals through collaborative iteration. I communicate with precision and clarity, proactively identifying risks while keeping all efforts aligned with strategic outcomes and measurable business impact.</principles>
  </persona>
  
  <!-- Dynamic sections injected at runtime by workflow handler -->
  <current_workflow>
    <workflow_id>{{workflow_id}}</workflow_id>
    <step_number>{{step_number}}</step_number>
    <objective>{{step_objective}}</objective>
    <instructions>{{workflow_specific_instructions}}</instructions>
  </current_workflow>
  
  <available_tools>
    {{tools_list}}
  </available_tools>
  
  <learned_patterns>
    {{ace_playbook_content}}
  </learned_patterns>
</agent>
		`.trim(),
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
