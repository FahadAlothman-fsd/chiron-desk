import { db, workflows, workflowSteps } from "@chiron/db";
import type {
	ExecuteActionStepConfig,
	AskUserStepConfig,
	AskUserChatStepConfig,
} from "@chiron/db";

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
				requiredVariables: ["project_description"], // Must run after summary approved
				requiresApproval: true,
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
							name: "ace_context",
							type: "string",
							source: "playbook",
							description: "Learned patterns for complexity classification",
						},
					],
					output: [
						{
							name: "complexity_classification",
							type: "string",
							description: "Classification: quick-flow, method, or enterprise",
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

			// Tool 3: Fetch Available Workflow Paths from Database
			{
				name: "fetch_workflow_paths",
				toolType: "database-query",
				requiredVariables: ["complexity_classification", "detected_field_type"],
				requiresApproval: false, // Auto-executes (database query)
				databaseQuery: {
					table: "workflow_paths",
					filters: [
						{
							field: "tags->>'fieldType'",
							operator: "eq",
							value: "{{detected_field_type}}",
						},
						{
							field: "tags->>'complexity'",
							operator: "eq",
							value: "{{complexity_classification}}",
						},
					],
					outputVariable: "available_workflow_paths",
				},
			},

			// Tool 4: Present Workflow Path Selection to User
			{
				name: "select_workflow_path",
				toolType: "custom",
				customToolHandler: "select_workflow_path",
				requiredVariables: ["available_workflow_paths"],
				requiresApproval: true, // User must choose a path
			},

			// Tool 5: Generate Project Name Suggestions
			{
				name: "generate_project_name",
				toolType: "custom",
				customToolHandler: "generate_project_name",
				requiredVariables: ["project_description", "complexity_classification"],
				requiresApproval: true, // User selects or provides custom name
			},
		],

		completionCondition: {
			type: "all-tools-approved",
			requiredTools: [
				"update_summary",
				"update_complexity",
				"select_workflow_path",
				"generate_project_name",
			],
			// Note: fetch_workflow_paths auto-executes, not in requiredTools
		},

		outputVariables: {
			project_description: "approval_states.update_summary.value",
			complexity_classification: "approval_states.update_complexity.value",
			selected_workflow_path_id: "approval_states.select_workflow_path.value",
			project_name: "approval_states.generate_project_name.value",
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
