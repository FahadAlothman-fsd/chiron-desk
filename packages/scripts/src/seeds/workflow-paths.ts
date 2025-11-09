import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db, workflowPaths } from "@chiron/db";
import yaml from "js-yaml";

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Navigate to project root from packages/scripts/src/seeds
const WORKFLOW_PATHS_DIR = join(
	__dirname,
	"../../../../bmad/bmm/workflows/workflow-status/paths",
);

export async function seedWorkflowPaths() {
	const files = await readdir(WORKFLOW_PATHS_DIR);
	const yamlFiles = files.filter(
		(f) => f.endsWith(".yaml") && f !== "game-design.yaml", // Skip game workflows (not in MVP)
	);

	for (const file of yamlFiles) {
		const filePath = join(WORKFLOW_PATHS_DIR, file);
		const content = await readFile(filePath, "utf-8");
		const data = yaml.load(content) as any;

		// Extract workflow path name from filename (e.g., "greenfield-level-3.yaml" → "greenfield-level-3")
		const name = file.replace(".yaml", "");

		// Convert method_name to displayName or generate from name
		const displayName =
			data.method_name ||
			name
				.split("-")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ");

		// Extract track and field type from data or filename
		const track = data.track || "";
		const fieldType = data.field_type || "";

		// Determine complexity based on track
		const complexityMap: Record<string, string> = {
			"quick-flow": "simple",
			method: "moderate",
			enterprise: "complex",
		};
		const complexity = complexityMap[track] || "moderate";

		// Generate appropriate metadata based on track and field type
		const educationTextMap: Record<string, string> = {
			"quick-flow-greenfield":
				"Best for: Small projects (1-2 weeks), clear requirements, single developer or tiny team. Skips formal architecture in favor of rapid iteration.",
			"quick-flow-brownfield":
				"Best for: Adding features to well-understood codebases, bug fixes, minor enhancements. Skips re-analysis of existing architecture.",
			"method-greenfield":
				"Best for: Medium projects (4-8 weeks), structured requirements, small team (2-4 developers). Includes tech-spec planning.",
			"method-brownfield":
				"Best for: Major feature additions, refactoring existing systems, technical debt resolution. Includes architecture updates.",
			"enterprise-greenfield":
				"Best for: Large projects (3+ months), formal governance requirements, multi-team coordination. Comprehensive documentation.",
			"enterprise-brownfield":
				"Best for: Large-scale refactoring, system modernization, legacy migration with multi-team coordination.",
		};

		const estimatedTimeMap: Record<string, string> = {
			"quick-flow": "1-2 weeks",
			method: "4-8 weeks",
			enterprise: "3-6 months",
		};

		const agentSupportMap: Record<string, string> = {
			"quick-flow": "PM, DEV",
			method: "PM, Analyst, Architect, DEV, SM",
			enterprise: "All 6 agents",
		};

		// Determine sequence order
		const sequenceMap: Record<string, number> = {
			"quick-flow-greenfield": 1,
			"quick-flow-brownfield": 2,
			"method-greenfield": 3,
			"method-brownfield": 4,
			"enterprise-greenfield": 5,
			"enterprise-brownfield": 6,
		};

		await db
			.insert(workflowPaths)
			.values({
				name,
				displayName,
				description: data.description,
				educationText: educationTextMap[name] || data.description,
				tags: {
					track,
					fieldType,
					complexity,
				},
				recommendedFor: data.recommended_for || null,
				estimatedTime: estimatedTimeMap[track] || null,
				agentSupport: agentSupportMap[track] || null,
				sequenceOrder: sequenceMap[name] || 0,
			})
			.onConflictDoNothing();

		console.log(`  ✓ ${name} (${displayName})`);
	}
}
