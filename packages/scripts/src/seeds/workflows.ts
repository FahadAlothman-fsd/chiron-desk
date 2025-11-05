import { db, workflows, agents } from "@chiron/db";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";

// Agent-Workflow Mapping Strategy (from story dev notes)
const AGENT_WORKFLOW_MAP: Record<string, string> = {
	// Analyst workflows
	"product-brief": "analyst",
	"brainstorm-project": "analyst",
	research: "analyst",
	"workflow-init": "analyst", // Added based on workflow-status

	// PM workflows
	prd: "pm",
	"validate-prd": "pm",

	// Architect workflows
	architecture: "architect",
	"create-architecture": "architect",
	"validate-architecture": "architect",
	"tech-spec": "architect",
	"tech-spec-sm": "architect",
	"solutioning-gate-check": "architect",
	"document-project": "architect",

	// Dev workflows
	"dev-story": "dev",
	"code-review": "dev",

	// SM workflows
	"sprint-planning": "sm",
	"create-story": "sm",
	"story-ready": "sm",
	"story-done": "sm",
	"story-context": "sm",
	"epic-tech-context": "sm",
	retrospective: "sm",
	"workflow-status": "sm",
	"correct-course": "sm",

	// UX Designer workflows
	"create-ux-design": "ux-designer",
	"design-thinking": "ux-designer",

	// CIS workflows - all map to analyst by default
	"innovation-strategy": "analyst",
	"problem-solving": "analyst",
	storytelling: "analyst",
	brainstorming: "analyst",
};

// Pattern Detection Heuristics (from story dev notes)
function detectPattern(workflowName: string): string {
	const name = workflowName.toLowerCase();

	if (name.includes("brainstorm") || name.includes("design-thinking")) {
		return "structured-exploration";
	}

	if (name.includes("review") || name.includes("validate")) {
		return "focused-dialogs";
	}

	if (
		name.includes("planning") ||
		name.includes("sprint") ||
		name.includes("parallel")
	) {
		return "parallel-independence";
	}

	// Default pattern
	return "sequential-dependencies";
}

// Convert workflow name to display name
function toDisplayName(name: string): string {
	return name
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

// Recursively find all workflow.yaml files
async function findWorkflowFiles(dir: string): Promise<string[]> {
	const files: string[] = [];

	try {
		const entries = await readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dir, entry.name);

			if (entry.isDirectory()) {
				// Recursively scan subdirectories
				const subFiles = await findWorkflowFiles(fullPath);
				files.push(...subFiles);
			} else if (entry.name === "workflow.yaml") {
				files.push(fullPath);
			}
		}
	} catch (error) {
		console.warn(`⚠️  Could not read directory ${dir}:`, error);
	}

	return files;
}

// Get agent ID by name
async function getAgentId(agentName: string): Promise<string | null> {
	const agent = await db.query.agents.findFirst({
		where: (agents, { eq }) => eq(agents.name, agentName),
	});

	return agent?.id ?? null;
}

export async function seedWorkflows() {
	// Navigate to project root (../../ from packages/scripts)
	const PROJECT_ROOT = join(process.cwd(), "../..");
	const BMM_WORKFLOWS_DIR = join(PROJECT_ROOT, "bmad/bmm/workflows");
	const CIS_WORKFLOWS_DIR = join(PROJECT_ROOT, "bmad/cis/workflows");

	// Find all workflow.yaml files
	const bmmFiles = await findWorkflowFiles(BMM_WORKFLOWS_DIR);
	const cisFiles = await findWorkflowFiles(CIS_WORKFLOWS_DIR);

	const allFiles = [...bmmFiles, ...cisFiles];

	console.log(`  📂 Found ${allFiles.length} workflow files`);

	let seededCount = 0;
	let skippedCount = 0;

	for (const filePath of allFiles) {
		try {
			const content = await readFile(filePath, "utf-8");
			const data = yaml.load(content) as any;

			if (!data.name) {
				console.warn(`  ⚠️  Skipping ${filePath} - no name field`);
				skippedCount++;
				continue;
			}

			const workflowName = data.name;

			// Determine agent
			const agentName = AGENT_WORKFLOW_MAP[workflowName];
			if (!agentName) {
				console.warn(
					`  ⚠️  Skipping ${workflowName} - no agent mapping defined`,
				);
				skippedCount++;
				continue;
			}

			const agentId = await getAgentId(agentName);
			if (!agentId) {
				console.warn(`  ⚠️  Skipping ${workflowName} - agent '${agentName}' not found`);
				skippedCount++;
				continue;
			}

			// Determine pattern
			const pattern = detectPattern(workflowName);

			// Insert workflow
			await db
				.insert(workflows)
				.values({
					name: workflowName,
					displayName: toDisplayName(workflowName),
					agentId,
					pattern: pattern as any,
					outputArtifactType: data.template ? "markdown" : null,
				})
				.onConflictDoNothing();

			console.log(`  ✓ ${workflowName} (${agentName}, ${pattern})`);
			seededCount++;
		} catch (error) {
			console.error(`  ❌ Error processing ${filePath}:`, error);
			skippedCount++;
		}
	}

	console.log(
		`\n  📊 Seeded ${seededCount} workflows, skipped ${skippedCount}`,
	);
}
