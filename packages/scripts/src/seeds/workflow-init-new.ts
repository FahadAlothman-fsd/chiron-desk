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

	// Step 1: Execute-Action (Field Type Detection)
	const step1Config: ExecuteActionStepConfig = {
		type: "execute-action",
		actions: [
			{
				type: "set-variable",
				config: {
					variable: "detected_field_type",
					value: "greenfield",
				},
			},
		],
		executionMode: "sequential",
		requiresUserConfirmation: false, // Auto-execute variable setting
	};

	await db.insert(workflowSteps).values({
		workflowId: workflow.id,
		stepNumber: 1,
		goal: "Set field type to greenfield",
		stepType: "execute-action",
		config: step1Config,
		nextStepNumber: 2,
	});

	console.log("  ✓ Step 1: Set field type to greenfield");

	// Step 2: Ask-User (Directory Selection)
	const step2Config: AskUserStepConfig = {
		type: "ask-user",
		message: "Let's set up your project! Where would you like to create it?",
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
		nextStepNumber: 3, // Story 1.6: Continue to conversational chat
	});

	console.log("  ✓ Step 2: Get project directory location from user");

	// Step 3: Ask-User-Chat (Conversational Project Initialization)
	// Story 1.6: PM Agent (Athena) guides user through project setup
	const step3Config: AskUserChatStepConfig = {
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
						{
							name: "ace_context",
							type: "string",
							source: "playbook",
							description: "Learned patterns for generating summaries",
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
						"tags->'fieldType'->>'value'": "{{detected_field_type}}", // Filter by field type (greenfield/brownfield)
					},
					orderBy: "sequence_order", // Order by sequence
					outputVariable: "complexity_options", // Store in execution.variables
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
						{
							name: "ace_context",
							type: "string",
							source: "playbook",
							description: "Learned patterns for complexity classification",
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

			// Tool 3: TEMPORARILY DISABLED - Will fix after update_summary and update_complexity work
			// {
			// 	name: "fetch_workflow_paths",
			// 	toolType: "ax-generation",
			// 	requiredVariables: ["complexity_classification", "detected_field_type"],
			// 	requiresApproval: true,
			// 	axSignature: {
			// 		systemPrompt: "...",
			// 		userPromptTemplate: "...",
			// 		optionSource: {...},
			// 		outputVariable: "selected_workflow_path",
			// 		outputFields: [...],
			// 		strategy: "ChainOfThought",
			// 	},
			// },

			// Tool 4: TEMPORARILY DISABLED
			// {
			// 	name: "generate_project_name",
			// 	toolType: "custom",
			// 	customToolHandler: "generate_project_name",
			// 	requiredVariables: ["project_description", "complexity_classification"],
			// 	requiresApproval: true,
			// },
		],

		completionCondition: {
			type: "all-tools-approved",
			requiredTools: [
				"update_summary",
				"update_complexity",
				// TEMPORARILY DISABLED - Will re-enable after testing tools 1-2
				// "fetch_workflow_paths",
				// "generate_project_name",
			],
		},

		outputVariables: {
			project_description: "approval_states.update_summary.value",
			complexity_classification: "approval_states.update_complexity.value",
			// TEMPORARILY DISABLED - Will re-enable after testing tools 1-2
			// selected_workflow_path: "approval_states.fetch_workflow_paths.value",
			// project_name: "approval_states.generate_project_name.value",
		},
	};

	await db.insert(workflowSteps).values({
		workflowId: workflow.id,
		stepNumber: 3,
		goal: "Conversational project initialization with AI-powered approval gates",
		stepType: "ask-user-chat",
		config: step3Config,
		nextStepNumber: null, // Future: Step 4 will be added in later stories
	});

	console.log("  ✓ Step 3: Conversational project initialization (Athena)");
	console.log(`    - ${step3Config.tools?.length || 0} tools configured`);
	console.log(
		`    - Completion: ${step3Config.completionCondition.requiredTools?.length || 0} approvals required`,
	);
}
