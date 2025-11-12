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
import { user } from "./auth";
import { workflowExecutions, workflows } from "./workflows";

// ============================================
// PROJECT STATUS ENUM
// ============================================

export const projectStatusEnum = pgEnum("project_status", [
	"initializing",
	"active",
	"archived",
	"failed",
]);

// ============================================
// NO ENUMS! All project metadata is data, not schema constraints
// This enables runtime extensibility without migrations
// ============================================

// ============================================
// PROJECTS TABLE (UPDATED - No enums, workflow path reference)
// ============================================

export const projects = pgTable(
	"projects",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(), // Removed .unique() - multiple projects can have same name
		path: text("path"), // File system path to project (nullable until Step 2 completes)

		// Project status tracking
		status: projectStatusEnum("status").notNull().default("initializing"),

		// User ownership (multi-user support)
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Workflow initializer reference (for Story 1.5+)
		initializerWorkflowId: uuid("initializer_workflow_id").references(
			() => workflows.id,
		),

		// Workflow path reference (replaces level/type/fieldType enums)
		workflowPathId: uuid("workflow_path_id").references(() => workflowPaths.id),

		// Audit trail - which workflow-init execution created this project
		initializedByExecutionId: uuid("initialized_by_execution_id").references(
			() => workflowExecutions.id,
		),

		// Progress tracking - compares executed workflows vs path definition
		executedVsPath: jsonb("executed_vs_path")
			.$type<{
				[phase: number]: {
					[workflowName: string]: {
						status: "not-started" | "in-progress" | "completed" | "skipped";
						executionId?: string;
						startedAt?: string;
						completedAt?: string;
						artifactPath?: string;
					};
				};
			}>()
			.default({}),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		nameIdx: index("projects_name_idx").on(table.name),
		userIdIdx: index("idx_projects_user_id").on(table.userId),
		workflowPathIdx: index("projects_workflow_path_idx").on(
			table.workflowPathId,
		),
		statusIdx: index("idx_projects_status").on(table.status),
		initializerWorkflowIdIdx: index("idx_projects_initializer_workflow_id").on(
			table.initializerWorkflowId,
		),
	}),
);

// ============================================
// WORKFLOW PATHS TABLE (UPDATED - No enums, JSONB tags for filtering)
// Defines workflow sequences with free-form metadata
// ============================================

export const workflowPaths = pgTable("workflow_paths", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull().unique(), // e.g., "method-greenfield"
	displayName: text("display_name").notNull(), // "BMad Method (Greenfield)"
	description: text("description").notNull(),
	educationText: text("education_text"), // Long-form explanation for UI cards

	// FREE-FORM TAGS (not enums!) - workflow-init filters dynamically on these
	tags: jsonb("tags").$type<{
		track?: string; // "quick-flow" | "method" | "enterprise"
		fieldType?: string; // "greenfield" | "brownfield"
		complexity?: string; // "simple" | "moderate" | "complex"
		[key: string]: string | undefined; // Custom tags allowed!
	}>(),

	// Metadata for workflow-init's recommendation engine
	recommendedFor: jsonb("recommended_for").$type<string[]>(), // Keywords like ["dashboard", "platform"]
	estimatedTime: text("estimated_time"), // "1-3 days"
	agentSupport: text("agent_support"), // "Exceptional - complete context"

	// UI presentation order
	sequenceOrder: integer("sequence_order").default(0),

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

	// User-specific configuration (one config per user)
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),

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
