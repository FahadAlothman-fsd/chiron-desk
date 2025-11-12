import { db, workflows, workflowSteps } from "@chiron/db";
import type { ExecuteActionStepConfig, AskUserStepConfig } from "@chiron/db";

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
		nextStepNumber: null, // Story 1.5: Only steps 1-2 implemented. Will add step 3 in Story 1.6
	});

	console.log("  ✓ Step 2: Get project directory location from user");
}
