import { db, workflows, agents } from "@chiron/db";

/**
 * Seeds the workflow-init-new workflow metadata
 * This is a special workflow for initializing new (greenfield) projects
 * Steps will be added in Stories 1.5-1.8
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

	await db
		.insert(workflows)
		.values({
			name: "workflow-init-new",
			displayName: "Initialize New Project",
			description:
				"Conversational project setup workflow for new (greenfield) projects. Guides users through project path selection, analyzes complexity, and creates project directory with git repository.",
			module: "bmm",
			agentId: pmAgent.id,
			initializerType: "new-project",
			isStandalone: true,
			requiresProjectContext: false,
			outputArtifactType: null, // No artifact generated
		})
		.onConflictDoNothing();

	console.log("  ✓ workflow-init-new (PM agent, initializer)");
}
