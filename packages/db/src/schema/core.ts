import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { workflows } from "./workflows";

// ============================================
// ENUMS
// ============================================

export const projectLevelEnum = pgEnum("project_level", [
	"0",
	"1",
	"2",
	"3",
	"4",
]);

export const projectTypeEnum = pgEnum("project_type", ["software", "game"]);

export const fieldTypeEnum = pgEnum("field_type", ["greenfield", "brownfield"]);

// ============================================
// PROJECTS TABLE
// ============================================

export const projects = pgTable(
	"projects",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull().unique(),
		path: text("path").notNull(), // File system path to project
		level: projectLevelEnum("level").notNull(),
		type: projectTypeEnum("type").notNull(),
		fieldType: fieldTypeEnum("field_type").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		nameIdx: index("projects_name_idx").on(table.name),
	}),
);

// ============================================
// WORKFLOW PATHS TABLE
// Defines workflow sequences for project types (e.g., greenfield-level-3)
// ============================================

export const workflowPaths = pgTable("workflow_paths", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull().unique(), // e.g., "greenfield-level-3"
	projectType: projectTypeEnum("project_type").notNull(),
	projectLevel: projectLevelEnum("project_level").notNull(),
	fieldType: fieldTypeEnum("field_type").notNull(),
	description: text("description").notNull(),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// WORKFLOW PATH WORKFLOWS (Junction Table)
// Which workflows belong to which path, in which phase/order
// ============================================

export const workflowPathWorkflows = pgTable("workflow_path_workflows", {
	id: uuid("id").primaryKey().defaultRandom(),

	workflowPathId: uuid("workflow_path_id")
		.notNull()
		.references(() => workflowPaths.id, { onDelete: "cascade" }),

	workflowId: uuid("workflow_id")
		.notNull()
		.references(() => workflows.id, { onDelete: "cascade" }),

	phase: integer("phase").notNull(), // 1=Analysis, 2=Planning, 3=Solutioning, 4=Implementation
	sequenceOrder: integer("sequence_order").notNull(), // Order within phase

	isOptional: boolean("is_optional").notNull().default(false),
	isRecommended: boolean("is_recommended").notNull().default(false),

	createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================
// PROJECT STATE TABLE
// Tracks current position in workflow path (NOT file-based!)
// ============================================

export const projectState = pgTable("project_state", {
	id: uuid("id").primaryKey().defaultRandom(),
	projectId: uuid("project_id")
		.notNull()
		.unique()
		.references(() => projects.id, { onDelete: "cascade" }),

	// Workflow path reference
	workflowPathId: uuid("workflow_path_id")
		.notNull()
		.references(() => workflowPaths.id),

	// Current position
	currentPhase: integer("current_phase").notNull().default(1), // 1=Analysis, 2=Planning, 3=Solutioning, 4=Implementation
	currentWorkflowId: uuid("current_workflow_id").references(() => workflows.id),

	// Completed workflows (array of workflow IDs)
	completedWorkflows: jsonb("completed_workflows")
		.$type<string[]>()
		.notNull()
		.default([]),

	lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// ============================================
// APP CONFIG TABLE (System Configuration)
// Application-wide settings (LLM API keys, preferences)
// CRITICAL: This should be a singleton table (one row only)
// ============================================

export const appConfig = pgTable("app_config", {
	id: uuid("id").primaryKey().defaultRandom(),

	// LLM Provider API Keys (encrypted at rest!)
	openrouterApiKey: text("openrouter_api_key"), // PRIMARY - required for first-time setup
	anthropicApiKey: text("anthropic_api_key"), // Optional fallback
	openaiApiKey: text("openai_api_key"), // Optional fallback

	// Default Provider Configuration
	defaultLlmProvider: text("default_llm_provider").default("openrouter"), // "openrouter", "anthropic", "openai"

	// Timestamps
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
