import type {
	AskUserChatStepConfig,
	AskUserStepConfig,
	ExecuteActionStepConfig,
} from "@chiron/db";
import { db, workflowSteps, workflows } from "@chiron/db";

/**
 * Seeds the workflow-init-new workflow metadata and steps 1-2
 * Story 1.5: Field type detection and directory selection
 * Steps 3+ will be added in Stories 1.6-1.8
 */
export async function seedWorkflowInitNew() {
	// Query PM agent ID
	const pmAgent = await db.query.agents.findFirst({
		where: (agents, { eq }) => eq(agents.name, "pm"),
	});

	if (!pmAgent) {
		console.error("  ❌ PM agent not found - cannot seed workflow-init-new");
		return;
	}

	// Insert workflow (idempotent)
	const [workflow] = await db
		.insert(workflows)
		.values({
			name: "workflow-init-new",
			displayName: "Initialize New Project (Guided)",
			description:
				"Conversational setup for new greenfield projects (15-20 min). Guides users through project path selection, analyzes complexity, and creates project directory with git repository.",
			module: "bmm",
			agentId: pmAgent.id,
			initializerType: "new-project",
			isStandalone: true,
			requiresProjectContext: false,
			outputArtifactType: null, // No artifact generated
		})
		.onConflictDoUpdate({
			target: workflows.name,
			set: {
				displayName: "Initialize New Project (Guided)",
				description:
					"Conversational setup for new greenfield projects (15-20 min). Guides users through project path selection, analyzes complexity, and creates project directory with git repository.",
			},
		})
		.returning();

	console.log("  ✓ workflow-init-new (PM agent, initializer)");

	// Check if steps already exist
	const existingSteps = await db.query.workflowSteps.findMany({
		where: (steps, { eq }) => eq(steps.workflowId, workflow.id),
	});

	if (existingSteps.length > 0) {
		console.log("  ℹ️  Steps already exist, skipping step seeding");
		return;
	}

	// Step 1: Ask-User-Chat (Conversational Project Initialization)
	// Story 1.6: PM Agent (Athena) guides user through project setup
	// Story 1.7: Added project naming and refactored to be Step 1
	const step1Config: AskUserChatStepConfig = {
		agentId: pmAgent.id,
		initialMessage:
			"Let's set up your new project! Tell me about what you're building - what problem are you solving for your users?",

		tools: [
			// Tool 1: Generate Project Summary
			{
				name: "update_summary",
				toolType: "ax-generation",
				description:
					"Generate a concise project summary from conversation history",
				usageGuidance:
					"Call this tool after 2-3 exchanges with the user about their project. Wait until you understand: what problem they're solving, who the target users are, and key features or requirements. Do NOT call this tool in your first response - gather information first through conversation.",
				requiredVariables: [], // Can execute anytime based on conversation
				requiresApproval: true,
				axSignature: {
					input: [
						{
							name: "conversation_history",
							type: "string",
							source: "context",
							description: "Full conversation history with the user",
						},
					],
					output: [
						{
							name: "project_description",
							type: "string",
							description:
								"Concise 2-3 sentence project summary focusing on user value",
							internal: false,
						},
						{
							name: "reasoning",
							type: "string",
							description: "Why this summary captures the project essence",
							internal: true, // Hidden from approval UI
						},
					],
					strategy: "ChainOfThought",
				},
			},

			// Tool 2: Classify Project Complexity
			{
				name: "update_complexity",
				toolType: "ax-generation",
				description:
					"Classify the project's complexity level based on scope, team size, and technical requirements",
				usageGuidance:
					"IMMEDIATELY call this tool after the project_description is approved by the user. DO NOT ask the user to classify complexity manually - automatically analyze the conversation context (team size, timeline, technical scope, feature list) and select the appropriate complexity level from the complexity_options provided. This is a required step that must execute automatically.",
				requiredVariables: ["project_description"], // Must run after summary approved
				requiresApproval: true,
				// Fetch available complexity options from database
				optionsSource: {
					table: "workflow_paths",
					distinctField: "tags->'complexity'", // Get unique complexity tags
					filterBy: {
						"tags->'fieldType'->>'value'": "greenfield", // Hardcoded greenfield per Story 1.7 AC 3
					},
					orderBy: "sequence_order", // Order by sequence
					outputVariable: "complexity_options", // Store in execution.variables
					// Display configuration - how to render options in approval cards
					displayConfig: {
						cardLayout: "simple",
						fields: {
							value: "value", // The complexity value to submit (e.g., "quick-flow")
							title: "name", // Display name (e.g., "Quick Flow Track")
							description: "description", // Full description text
						},
					},
					requireFeedbackOnOverride: true, // Ask user for feedback when overriding AI's choice
				},
				axSignature: {
					input: [
						{
							name: "project_description",
							type: "string",
							source: "variable",
							variableName: "project_description",
							description: "Approved project summary",
						},
						{
							name: "conversation_history",
							type: "string",
							source: "context",
							description: "Context about team size, timeline, scope",
						},
						{
							name: "complexity_options",
							type: "json", // Ax doesn't support "array" type - use "json" for structured data
							source: "variable",
							variableName: "complexity_options",
							description:
								"Available complexity levels with structured metadata (value, name, description)",
						},
					],
					output: [
						{
							name: "complexity_classification",
							type: "class", // ✅ Use class type to constrain LLM to valid options
							description: "Selected complexity value from available options",
							internal: false,
						},
						{
							name: "reasoning",
							type: "string",
							description: "Factors that led to this complexity classification",
							internal: false, // Show reasoning for transparency
						},
					],
					strategy: "ChainOfThought",
				},
			},

			// Tool 3: Select Workflow Path
			{
				name: "select_workflow_path",
				toolType: "ax-generation",
				description:
					"Present available workflow paths filtered by complexity and field type, allowing user to select the methodology that best fits their project",
				usageGuidance:
					"Call this tool IMMEDIATELY after complexity_classification is approved. Fetch matching workflow paths from the database and recommend the most appropriate one based on the project's complexity and requirements. Present all options to the user for selection.",
				requiredVariables: ["complexity_classification"],
				requiresApproval: true,
				// Fetch available workflow paths from database
				optionsSource: {
					table: "workflow_paths",
					selectFields: [
						"id",
						"name",
						"displayName",
						"description",
						"tags",
						"phases",
					], // Fetch full records
					filterBy: {
						"tags->'complexity'->>'value'": "{{complexity_classification}}", // Match selected complexity
						"tags->'fieldType'->>'value'": "greenfield", // Hardcoded greenfield per Story 1.7 AC 3
					},
					orderBy: "sequence_order",
					outputVariable: "workflow_path_options",
					requireFeedbackOnOverride: true, // Ask why if user picks different path than AI recommended
					// Display configuration - detailed cards with phases
					displayConfig: {
						cardLayout: "detailed",
						fields: {
							value: "id", // Submit the workflow path UUID
							title: "displayName", // e.g., "Quick Flow - Greenfield"
							subtitle: "tags.recommendedFor.value", // e.g., "Solo dev, 2-3 weeks, simple features"
							description: "description", // Full description text
							sections: [
								{
									label: "Phases & Workflows",
									icon: "🗂️",
									dataPath: "phases", // Array of phase objects
									renderAs: "nested-list",
									collapsible: true,
									defaultExpanded: true,
									itemFields: {
										title: "name", // Phase name (e.g., "Phase 1: Discovery")
										subtitle: "duration", // Phase duration (e.g., "1-2 weeks")
										children: "workflows", // Nested workflows array
										childFields: {
											title: "name", // Workflow name (e.g., "User Research")
											icon: "•",
										},
									},
								},
							],
						},
					},
				},
				axSignature: {
					input: [
						{
							name: "complexity_classification",
							type: "string",
							source: "variable",
							variableName: "complexity_classification",
							description: "Selected complexity level",
						},
						{
							name: "workflow_path_options",
							type: "json",
							source: "variable",
							variableName: "workflow_path_options",
							description:
								"Available workflow paths filtered by complexity and field type",
						},
						{
							name: "project_description",
							type: "string",
							source: "variable",
							variableName: "project_description",
							description: "Project summary for context",
						},
						{
							name: "conversation_history",
							type: "string",
							source: "context",
							description: "Full conversation history",
						},
					],
					output: [
						{
							name: "selected_workflow_path_id",
							type: "class", // Constrain to valid options
							description: "Selected workflow path UUID from available options",
							internal: false,
						},
						{
							name: "reasoning",
							type: "string",
							description: "Why this workflow path is recommended",
							internal: false,
						},
					],
					strategy: "ChainOfThought",
				},
			},

			// Tool 4: Generate/Approve Project Name (Story 1.7)
			{
				name: "update_project_name",
				toolType: "ax-generation",
				description:
					"Suggest a project name based on the description and selected workflow path, and allow user to approve or edit it",
				usageGuidance:
					"Call this tool IMMEDIATELY after the workflow path is selected. Propose a project name that follows kebab-case conventions (lowercase, hyphens, no spaces). The user will have a chance to edit this name.",
				requiredVariables: ["selected_workflow_path_id", "project_description"],
				requiresApproval: true,
				axSignature: {
					input: [
						{
							name: "project_description",
							type: "string",
							source: "variable",
							variableName: "project_description",
							description: "Project summary",
						},
						{
							name: "conversation_history",
							type: "string",
							source: "context",
							description:
								"Conversation history to pick up on user naming preferences",
						},
					],
					output: [
						{
							name: "project_name",
							type: "string",
							description:
								"Recommended project name (kebab-case, e.g. 'my-project-name')",
							internal: false,
						},
						{
							name: "reasoning",
							type: "string",
							description: "Why this name was chosen",
							internal: true,
						},
					],
					strategy: "ChainOfThought",
				},
			},
		],

		completionCondition: {
			type: "all-tools-approved",
			requiredTools: [
				"update_summary",
				"update_complexity",
				"select_workflow_path",
				"update_project_name",
			],
		},

		outputVariables: {
			project_description: "approval_states.update_summary.value",
			complexity_classification: "approval_states.update_complexity.value",
			selected_workflow_path_id: "approval_states.select_workflow_path.value",
			project_name: "approval_states.update_project_name.value",
		},
	};

	await db.insert(workflowSteps).values({
		workflowId: workflow.id,
		stepNumber: 1,
		goal: "Conversational project initialization with AI-powered approval gates",
		stepType: "ask-user-chat",
		config: step1Config,
		nextStepNumber: 2,
	});

	console.log("  ✓ Step 1: Conversational project initialization (Athena)");
	console.log(`    - ${step1Config.tools?.length || 0} tools configured`);
	console.log(
		`    - Completion: ${step1Config.completionCondition.requiredTools?.length || 0} approvals required`,
	);

	// Step 2: Ask-User (Directory Selection)
	const step2Config: AskUserStepConfig = {
		type: "ask-user",
		message:
			"Great! Now that we've defined your project, where should we create it?",
		question: "Select your project directory",
		responseType: "path",
		responseVariable: "project_path",
		pathConfig: {
			selectMode: "directory",
			mustExist: false, // Will create project dir later in Step 9
		},
		validation: {
			required: true,
		},
	};

	await db.insert(workflowSteps).values({
		workflowId: workflow.id,
		stepNumber: 2,
		goal: "Get project directory location from user",
		stepType: "ask-user",
		config: step2Config,
		nextStepNumber: null, // Future: Step 3 will be Create Project
	});

	console.log("  ✓ Step 2: Get project directory location from user");
}
