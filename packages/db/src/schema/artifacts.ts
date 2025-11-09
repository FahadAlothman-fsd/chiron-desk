import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./core";
import { workflows } from "./workflows";

// ============================================
// PROJECT ARTIFACTS TABLE
// Tracks generated files (NOT metadata - actual artifacts!)
// ============================================

export const projectArtifacts = pgTable(
	"project_artifacts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),

		artifactType: text("artifact_type").notNull(), // "brainstorming-session", "product-brief", "prd"
		filePath: text("file_path").notNull(), // Path to actual file (e.g., /docs/brainstorming-2025-11-05.md)

		workflowId: uuid("workflow_id").references(() => workflows.id),

		// FR034: Git commit hash tracking (type-safe column)
		gitCommitHash: text("git_commit_hash"), // Git hash of artifact version

		metadata: jsonb("metadata").$type<Record<string, unknown>>(), // Artifact-specific metadata

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		projectIdIdx: index("project_artifacts_project_id_idx").on(table.projectId),
		typeIdx: index("project_artifacts_type_idx").on(table.artifactType),
		gitHashIdx: index("project_artifacts_git_hash_idx").on(table.gitCommitHash),
	}),
);
