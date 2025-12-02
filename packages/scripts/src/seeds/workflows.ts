import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	db,
	type WorkflowMetadata,
	type WorkflowTags,
	workflows,
} from "@chiron/db";
import yaml from "js-yaml";

/**
 * Story 2.1: Updated workflow seed to use tags/metadata JSONB fields
 *
 * Agent mapping is now stored in metadata.agentId instead of agentId column
 * Workflow categorization uses tags JSONB (phase, type, track, module)
 */

// Agent-Workflow Mapping Strategy (now stored in metadata.agentId)
const AGENT_WORKFLOW_MAP: Record<string, string> = {
	// Analyst workflows
	"product-brief": "analyst",
	"brainstorm-project": "analyst",
	research: "analyst",
	"workflow-init": "analyst",
	brainstorming: "analyst",

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

	// Core technique workflows
	scamper: "analyst",
	"five-whys": "analyst",
};

/**
 * Detect workflow phase based on BMAD methodology
 * Phase 0 = Discovery, 1 = Analysis, 2 = Planning, 3 = Solutioning, 4 = Implementation
 */
function detectPhase(workflowName: string): string {
	const name = workflowName.toLowerCase();

	// Phase 0: Discovery workflows
	if (
		name.includes("brainstorm") ||
		name.includes("research") ||
		name.includes("product-brief")
	) {
		return "0";
	}

	// Phase 1: Analysis workflows
	if (name.includes("prd") || name.includes("validate")) {
		return "1";
	}

	// Phase 2: Planning workflows
	if (
		name.includes("architecture") ||
		name.includes("tech-spec") ||
		name.includes("ux-design")
	) {
		return "2";
	}

	// Phase 3: Solutioning workflows
	if (
		name.includes("story") ||
		name.includes("sprint") ||
		name.includes("epic")
	) {
		return "3";
	}

	// Phase 4: Implementation workflows
	if (
		name.includes("dev") ||
		name.includes("code") ||
		name.includes("review")
	) {
		return "4";
	}

	// Default to phase 0
	return "0";
}

/**
 * Detect workflow type (method, technique, utility, initializer)
 */
function detectType(workflowName: string, _isStandalone?: boolean): string {
	const name = workflowName.toLowerCase();

	// Initializer workflows
	if (name.includes("workflow-init") || name.includes("init")) {
		return "initializer";
	}

	// Technique workflows (sub-workflows used within methods)
	if (
		name.includes("scamper") ||
		name.includes("six-hats") ||
		name.includes("five-whys") ||
		name.includes("technique")
	) {
		return "technique";
	}

	// Utility workflows (standalone tools)
	if (
		name.includes("validate") ||
		name.includes("review") ||
		name.includes("status")
	) {
		return "utility";
	}

	// Default to method (main workflow type)
	return "method";
}

/**
 * Detect module origin (bmm, cis, core, custom)
 */
function detectModule(filePath: string): string {
	if (filePath.includes("/cis/")) {
		return "cis";
	}
	if (filePath.includes("/bmm/")) {
		return "bmm";
	}
	if (filePath.includes("/core/")) {
		return "core";
	}
	return "custom";
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
	const CORE_WORKFLOWS_DIR = join(PROJECT_ROOT, "bmad/core/workflows");

	// Find all workflow.yaml files
	const bmmFiles = await findWorkflowFiles(BMM_WORKFLOWS_DIR);
	const cisFiles = await findWorkflowFiles(CIS_WORKFLOWS_DIR);
	const coreFiles = await findWorkflowFiles(CORE_WORKFLOWS_DIR);

	const allFiles = [...bmmFiles, ...cisFiles, ...coreFiles];

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
				console.warn(
					`  ⚠️  Skipping ${workflowName} - agent '${agentName}' not found`,
				);
				skippedCount++;
				continue;
			}

			// Story 2.1: Build tags JSONB
			const tags: WorkflowTags = {
				phase: detectPhase(workflowName),
				type: detectType(workflowName, data.standalone),
				module: detectModule(filePath),
			};

			// Add track for initializer workflows
			if (tags.type === "initializer") {
				// Default to greenfield for new-project workflow-init
				tags.track = workflowName.includes("existing")
					? "brownfield"
					: "greenfield";
			}

			// Story 2.1: Build metadata JSONB
			const metadata: WorkflowMetadata = {
				agentId, // Migrated from column
				isStandalone: data.standalone ?? true, // Migrated from column
				requiresProjectContext: !data.standalone, // Migrated from column
			};

			// Insert workflow with new schema
			await db
				.insert(workflows)
				.values({
					name: workflowName,
					displayName: toDisplayName(workflowName),
					description: data.description || null,
					tags,
					metadata,
					outputArtifactType: data.template ? "markdown" : null,
				})
				.onConflictDoNothing();

			console.log(
				`  ✓ ${workflowName} (${agentName}, phase: ${tags.phase}, type: ${tags.type})`,
			);
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

/**
 * Story 2.1: Seed brainstorming workflow specifically for Phase 0 Dashboard
 * This ensures the brainstorming workflow is available with correct tags
 */
export async function seedBrainstormingWorkflow() {
	console.log("  🧠 Seeding brainstorming workflow for Phase 0...");

	// Get analyst agent ID
	const agentId = await getAgentId("analyst");
	if (!agentId) {
		console.warn("  ⚠️  Analyst agent not found - skipping brainstorming seed");
		return;
	}

	const tags: WorkflowTags = {
		phase: "0", // Phase 0: Discovery
		type: "method", // Primary workflow type
		module: "cis", // Creative Innovation System
	};

	const metadata: WorkflowMetadata = {
		agentId,
		isStandalone: false, // Requires project context
		requiresProjectContext: true,
		icon: "brain", // Lucide icon
		color: "#8B5CF6", // Purple color
		estimatedDuration: "15-30 min",
		recommendedFor: ["new-projects", "ideation", "discovery"],
	};

	await db
		.insert(workflows)
		.values({
			name: "brainstorming",
			displayName: "Brainstorming Session",
			description:
				"Kick off your project by defining the core topic, goals, and scope with AI assistance",
			tags,
			metadata,
			outputArtifactType: "markdown",
		})
		.onConflictDoNothing();

	console.log("  ✓ Brainstorming workflow seeded");
}
