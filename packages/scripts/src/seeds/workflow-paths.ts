import { db, workflowPaths } from "@chiron/db";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";

// Navigate to project root (../../ from packages/scripts)
const WORKFLOW_PATHS_DIR = join(
	process.cwd(),
	"../../bmad/bmm/workflows/workflow-status/paths",
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

		await db
			.insert(workflowPaths)
			.values({
				name,
				projectType: data.project_type,
				projectLevel:
					data.project_level?.toString() || data.level?.toString() || "0",
				fieldType: data.field_type,
				description: data.description,
				pathDefinition: data.phases, // Store phases array as JSON
			})
			.onConflictDoNothing();

		console.log(`  ✓ ${name}`);
	}
}
