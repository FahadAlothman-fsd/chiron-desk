import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	db,
	workflowPaths,
	workflowPathWorkflows,
	workflows,
} from "@chiron/db";
import { eq } from "drizzle-orm";
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

		// Create structured tag objects with {name, value, description}
		// Map from YAML track values to structured tags
		const complexityTagMap: Record<
			string,
			{ name: string; value: string; description: string }
		> = {
			"quick-flow": {
				name: "Quick Flow Track",
				value: "quick-flow",
				description:
					"Fast implementation track using tech-spec planning only. Best for bug fixes, small features, and changes with clear scope. Typical range: 1-15 stories. Examples: bug fixes, OAuth login, search features.",
			},
			"bmad-method": {
				name: "BMad Method Track",
				value: "method",
				description:
					"Full product planning track using PRD + Architecture + UX. Best for products, platforms, and complex features requiring system design. Typical range: 10-50+ stories. Examples: admin dashboards, e-commerce platforms, SaaS products.",
			},
			method: {
				// Alias for backwards compatibility
				name: "BMad Method Track",
				value: "method",
				description:
					"Full product planning track using PRD + Architecture + UX. Best for products, platforms, and complex features requiring system design. Typical range: 10-50+ stories. Examples: admin dashboards, e-commerce platforms, SaaS products.",
			},
			"enterprise-bmad-method": {
				name: "Enterprise Method Track",
				value: "enterprise",
				description:
					"Extended enterprise planning track adding Security Architecture, DevOps Strategy, and Test Strategy to BMad Method. Best for enterprise requirements, compliance needs, and multi-tenant systems. Typical range: 30+ stories. Examples: multi-tenant platforms, compliance-driven systems, mission-critical applications.",
			},
			enterprise: {
				// Alias for backwards compatibility
				name: "Enterprise Method Track",
				value: "enterprise",
				description:
					"Extended enterprise planning track adding Security Architecture, DevOps Strategy, and Test Strategy to BMad Method. Best for enterprise requirements, compliance needs, and multi-tenant systems. Typical range: 30+ stories. Examples: multi-tenant platforms, compliance-driven systems, mission-critical applications.",
			},
		};

		const fieldTypeTagMap: Record<
			string,
			{ name: string; value: string; description: string }
		> = {
			greenfield: {
				name: "Greenfield",
				value: "greenfield",
				description:
					"Starting a new project from scratch with no existing codebase.",
			},
			brownfield: {
				name: "Brownfield",
				value: "brownfield",
				description:
					"Working with an existing codebase, adding features or refactoring.",
			},
		};

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
			"bmad-method": "4-8 weeks",
			method: "4-8 weeks", // Alias
			"enterprise-bmad-method": "3-6 months",
			enterprise: "3-6 months", // Alias
		};

		const agentSupportMap: Record<string, string> = {
			"quick-flow": "PM, DEV",
			"bmad-method": "PM, Analyst, Architect, DEV, SM",
			method: "PM, Analyst, Architect, DEV, SM", // Alias
			"enterprise-bmad-method": "All 6 agents",
			enterprise: "All 6 agents", // Alias
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

		// Insert workflow path
		const insertedPath = await db
			.insert(workflowPaths)
			.values({
				name,
				displayName,
				description: data.description,
				educationText: educationTextMap[name] || data.description,
				tags: {
					complexity: complexityTagMap[track] || complexityTagMap.method,
					fieldType: fieldTypeTagMap[fieldType] || fieldTypeTagMap.greenfield,
				},
				recommendedFor: data.recommended_for || null,
				estimatedTime: estimatedTimeMap[track] || null,
				agentSupport: agentSupportMap[track] || null,
				sequenceOrder: sequenceMap[name] || 0,
			})
			.onConflictDoUpdate({
				target: workflowPaths.name,
				set: {
					displayName,
					description: data.description,
					educationText: educationTextMap[name] || data.description,
					tags: {
						complexity: complexityTagMap[track] || complexityTagMap.method,
						fieldType: fieldTypeTagMap[fieldType] || fieldTypeTagMap.greenfield,
					},
					recommendedFor: data.recommended_for || null,
					estimatedTime: estimatedTimeMap[track] || null,
					agentSupport: agentSupportMap[track] || null,
					sequenceOrder: sequenceMap[name] || 0,
				},
			})
			.returning();

		let workflowPathId = insertedPath[0]?.id;

		// Fallback: if upsert didn't return ID (e.g. no changes made), fetch it
		if (!workflowPathId) {
			// Use raw select instead of query builder to be safe
			const existing = await db
				.select({ id: workflowPaths.id })
				.from(workflowPaths)
				.where(eq(workflowPaths.name, name))
				.limit(1);
			workflowPathId = existing[0]?.id;
		}

		console.log(`    Path ID for ${name}: ${workflowPathId}`);

		// Seed workflow_path_workflows join table from phases
		if (data.phases && Array.isArray(data.phases) && workflowPathId) {
			console.log(`    Seeding ${data.phases.length} phases for ${name}...`);

			// Clean up existing join rows for this path first to avoid duplicates
			await db
				.delete(workflowPathWorkflows)
				.where(eq(workflowPathWorkflows.workflowPathId, workflowPathId));

			for (const phaseData of data.phases) {
				const phaseNumber =
					phaseData.phase !== undefined ? phaseData.phase : null;
				const phaseWorkflows = phaseData.workflows || [];

				if (phaseNumber === null) {
					console.warn(
						`    ⚠️  Phase number missing in ${name}, skipping phase`,
					);
					continue;
				}

				for (let i = 0; i < phaseWorkflows.length; i++) {
					const workflowData = phaseWorkflows[i];
					const workflowName = workflowData.id;

					// Look up workflow by name
					const workflow = await db.query.workflows.findFirst({
						where: eq(workflows.name, workflowName),
					});

					if (!workflow) {
						console.warn(
							`    ⚠️  Workflow '${workflowName}' not found, skipping`,
						);
						continue;
					}

					// Insert into join table
					await db
						.insert(workflowPathWorkflows)
						.values({
							workflowPathId,
							workflowId: workflow.id,
							phase: phaseNumber,
							sequenceOrder: i + 1,
							isOptional: workflowData.optional || false,
							isRecommended: workflowData.recommended || false,
						})
						.onConflictDoNothing();
				}
			}
			console.log(
				`  ✓ ${name} (${displayName}) with ${data.phases.length} phases`,
			);
		} else {
			console.log(`  ✓ ${name} (${displayName})`);
		}
	}
}
