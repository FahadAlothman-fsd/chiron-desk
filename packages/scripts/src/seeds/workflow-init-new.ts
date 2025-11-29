import type {
	AskUserChatStepConfig,
	AskUserStepConfig,
	DisplayOutputStepConfig,
	ExecuteActionStepConfig,
	WorkflowMetadata,
	WorkflowTags,
} from "@chiron/db";
import { db, workflowSteps, workflows } from "@chiron/db";
import { eq } from "drizzle-orm";

/**
 * Seeds the workflow-init-new workflow metadata and steps 1-2
 * Story 1.5: Field type detection and directory selection
 * Steps 3+ will be added in Stories 1.6-1.8
 * Story 2.1: Updated to use tags/metadata JSONB fields
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

	// Story 2.1: Use tags JSONB for workflow categorization
	const tags: WorkflowTags = {
		phase: "0", // Discovery phase
		type: "initializer", // This is an initializer workflow
		track: "greenfield", // For new projects
		module: "bmm",
	};

	// Story 2.1: Use metadata JSONB for workflow configuration
	const metadata: WorkflowMetadata = {
		agentId: pmAgent.id,
		isStandalone: true,
		requiresProjectContext: false,
		initializerType: "new-project", // Moved from column to metadata
	};

	// Insert workflow (idempotent)
	const [workflow] = await db
		.insert(workflows)
		.values({
			name: "workflow-init-new",
			displayName: "Initialize New Project (Guided)",
			description:
				"Conversational setup for new greenfield projects (15-20 min). Guides users through project path selection, analyzes complexity, and creates project directory with git repository.",
			tags,
			metadata,
			outputArtifactType: null, // No artifact generated
		})
		.onConflictDoUpdate({
			target: workflows.name,
			set: {
				displayName: "Initialize New Project (Guided)",
				description:
					"Conversational setup for new greenfield projects (15-20 min). Guides users through project path selection, analyzes complexity, and creates project directory with git repository.",
				tags,
				metadata,
			},
		})
		.returning();

	console.log("  ✓ workflow-init-new (PM agent, initializer)");

	if (!workflow) {
		console.error("  ❌ Failed to create/update workflow-init-new");
		return;
	}

	// Check if steps already exist - skip if they do (fresh DB only)
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
			// Tool 1: Set Project Description
			{
				name: "update_description",
				toolType: "update-variable",
				targetVariable: "project_description",
				description:
					"Set the project description based on your analysis of the conversation",
				usageGuidance:
					"Call this tool when you have enough information to understand: (1) what problem the user is solving, (2) who the target users are, and (3) key features or requirements. Write a clear, comprehensive description that captures what the product is, who it's for, the core problem it solves, and key value proposition. Use specific details from the conversation - mention the product name if provided, target users, and main features. The description can be as detailed as the conversation warrants - don't artificially limit it to a specific length. If the user provides comprehensive details in their first message, call this tool immediately. If their message is vague, ask 1-2 follow-up questions first.",
				requiredVariables: [], // Can execute anytime based on conversation
				requiresApproval: true,
				valueSchema: {
					type: "string",
					description:
						"A clear, comprehensive project description focusing on: what it is, who it's for, problem it solves, and key value. Be as detailed as the conversation warrants.",
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
							description: "Approved project description",
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
					"Call this tool IMMEDIATELY after complexity_classification is approved. Fetch matching workflow paths from the database and recommend the most appropriate one based on the project's complexity and requirements. Present all options to the user for selection. IMPORTANT: You MUST call this tool even if only ONE workflow path matches the filters - this formally registers the path selection and creates an approval gate for audit trail purposes. Do not skip this tool just because there's only one option.",
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
							description: "Project description for context",
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
					"Generate 3-5 project name suggestions based on the description, and let user pick one or provide a custom name",
				usageGuidance:
					"Call this tool when the user asks about the project name OR after complexity/workflow path are set. Generate 3-5 diverse project name suggestions that follow kebab-case conventions (lowercase, hyphens, no spaces). Pick your recommended name from the suggestions. The user can select one of your suggestions or enter a custom name. ALWAYS call this tool - do NOT just say you've set the name without calling it.",
				requiredVariables: ["project_description"],
				requiresApproval: true,
				axSignature: {
					input: [
						{
							name: "project_description",
							type: "string",
							source: "variable",
							variableName: "project_description",
							description: "Project description for generating name ideas",
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
							name: "project_name_suggestions",
							type: "json",
							description:
								"3-5 diverse project name suggestions in kebab-case format. Include variations like: direct names, abbreviated names, metaphorical names, and action-oriented names. Return as JSON array of strings.",
							internal: false,
						},
						{
							name: "project_name",
							type: "string",
							description:
								"Your recommended project name from the suggestions (kebab-case, e.g. 'my-project-name'). Pick the most memorable and descriptive option.",
							internal: false,
						},
						{
							name: "reasoning",
							type: "string",
							description:
								"Why you recommend this specific name over the other suggestions",
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
				"update_description",
				"update_complexity",
				"select_workflow_path",
				"update_project_name",
			],
		},

		outputVariables: {
			project_description:
				"approval_states.update_description.value.project_description",
			complexity_classification:
				"approval_states.update_complexity.value.complexity_classification",
			selected_workflow_path_id:
				"approval_states.select_workflow_path.value.selected_workflow_path_id",
			project_name: "approval_states.update_project_name.value.project_name",
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
		nextStepNumber: 3, // Continue to Step 3: Project Initialization
	});

	console.log("  ✓ Step 2: Get project directory location from user");

	// Step 3: Execute-Action (Project Initialization)
	// Story 1.8: Git init + Database update
	const step3Config: ExecuteActionStepConfig = {
		actions: [
			// Action 1: Initialize git repository
			{
				type: "git",
				config: {
					operation: "init",
					path: "{{project_path}}", // User provides full project path
				},
			},
			// Action 2: Update project record in database
			{
				type: "database",
				config: {
					table: "projects",
					operation: "update",
					columns: {
						name: "{{project_name}}",
						path: "{{project_path}}", // User provides full project path
						workflowPathId: "{{selected_workflow_path_id}}",
						status: "active", // Mark project as active after initialization
					},
					where: {
						id: "{{project_id}}",
					},
				},
			},
		],
		executionMode: "sequential", // Git first, then DB update
	};

	await db.insert(workflowSteps).values({
		workflowId: workflow.id,
		stepNumber: 3,
		goal: "Initialize git repository and update project record",
		stepType: "execute-action",
		config: step3Config,
		nextStepNumber: 4, // Continue to Step 4: Success Display
	});

	console.log("  ✓ Step 3: Project Initialization (git init + DB update)");

	// Step 4: Display-Output (Success Message)
	// Story 1.8: Show celebratory success message
	const step4Config: DisplayOutputStepConfig = {
		contentTemplate: `🎉 **Project Created Successfully!**

Your project **{{project_name}}** has been initialized at:
\`{{project_path}}/{{project_name}}\`

**What was set up:**
- ✅ Git repository initialized
- ✅ Project registered in Chiron
- ✅ Workflow path selected: {{selected_workflow_path_id}}

**Next Steps:**
1. Open your project in VS Code or your preferred IDE
2. Return to Chiron to start your first workflow
3. Begin with the recommended Phase 0: Discovery workflows

Happy building! 🚀`,
	};

	await db.insert(workflowSteps).values({
		workflowId: workflow.id,
		stepNumber: 4,
		goal: "Display success message to user",
		stepType: "display-output",
		config: step4Config,
		nextStepNumber: null, // End of workflow
	});

	console.log("  ✓ Step 4: Success Display");
}
