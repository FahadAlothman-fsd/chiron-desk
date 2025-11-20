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
import { agents } from "./agents";
import { projects } from "./core";
import type { StepConfig } from "./step-configs";

// ============================================
// ENUMS
// ============================================

export const workflowPatternEnum = pgEnum("workflow_pattern", [
	"sequential-dependencies",
	"parallel-independence",
	"structured-exploration",
	"focused-dialogs",
]);

export const stepTypeEnum = pgEnum("step_type", [
	"ask-user",
	"ask-user-chat", // Story 1.6 - Conversational chat with AI agent
	"llm-generate",
	"branch", // Renamed from "check-condition" for clarity (N-way branching)
	"approval-checkpoint",
	"execute-action",
	"invoke-workflow",
	"display-output",
	"question-set", // NEW - batch questions with optional dialogs
]);

export const actionExecutionEnum = pgEnum("action_execution", [
	"sequential",
	"parallel",
	"conditional",
]);

export const workflowStatusEnum = pgEnum("workflow_status", [
	"idle",
	"active",
	"paused",
	"completed",
	"failed",
]);

// ============================================
// WORKFLOWS TABLE (UPDATED - Added special flags and template reference)
// Complete workflow definitions
// ============================================

export const workflows = pgTable(
	"workflows",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull().unique(), // e.g., "brainstorm-project", "research", "workflow-init"
		displayName: text("display_name").notNull(),
		description: text("description"),
		module: text("module"), // "bmm", "cis", "custom"

		agentId: uuid("agent_id").references(() => agents.id),

		// Special flags (UPDATED - replaced isProjectInitializer with initializerType)
		initializerType: text("initializer_type"), // "new-project", "existing-project", null
		isStandalone: boolean("is_standalone").default(true), // Can run without project context
		requiresProjectContext: boolean("requires_project_context").default(false),

		// Output artifact configuration (optional)
		outputArtifactType: text("output_artifact_type"), // "prd", "architecture", "story", etc.
		outputTemplateId: uuid("output_template_id"), // Reference to workflow_templates table

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		moduleIdx: index("idx_workflows_module").on(table.module),
	}),
);

// ============================================
// WORKFLOW STEPS TABLE (UPDATED - Aligned with workflow-schema-snapshot.md)
// Individual steps within workflows
// ============================================

export const workflowSteps = pgTable(
	"workflow_steps",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workflowId: uuid("workflow_id")
			.notNull()
			.references(() => workflows.id, { onDelete: "cascade" }),

		stepNumber: integer("step_number").notNull(),
		goal: text("goal").notNull(), // Human-readable step purpose (replaces "title")
		stepType: stepTypeEnum("step_type").notNull(),

		// Type-specific configuration (typed per stepType)
		config: jsonb("config").$type<StepConfig>().notNull(),

		// Sequential flow (null = end of workflow, or branching via workflow_step_branches)
		nextStepNumber: integer("next_step_number"), // Changed from nextStepId to match snapshot

		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		workflowIdIdx: index("idx_workflow_steps_workflow_id").on(table.workflowId),
		workflowStepNumIdx: index("workflow_steps_workflow_step_idx").on(
			table.workflowId,
			table.stepNumber,
		),
	}),
);

// ============================================
// WORKFLOW EXECUTIONS TABLE (UPDATED - Added executedSteps tracking)
// Runtime workflow execution state (pause/resume)
// ============================================

// @ts-expect-error - Circular reference with workflowSteps is intentional for foreign key
export const workflowExecutions = pgTable(
	"workflow_executions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id").references(() => projects.id, {
			onDelete: "cascade",
		}), // Nullable for workflow-init (no project yet)
		workflowId: uuid("workflow_id")
			.notNull()
			.references(() => workflows.id, { onDelete: "cascade" }),
		agentId: uuid("agent_id").references(() => agents.id, {
			onDelete: "cascade",
		}),

		status: workflowStatusEnum("status").notNull().default("idle"),

		// Current step being executed
		currentStepId: uuid("current_step_id").references(() => workflowSteps.id),

		// ALL RUNTIME DATA STORED HERE!
		// Steps read/write from this JSONB using storeAs and evaluateVariable config fields
		variables: jsonb("variables")
			.$type<Record<string, unknown>>()
			.notNull()
			.default({}),

		// NEW: Step-by-step execution tracking (mirrors executedVsPath pattern)
		executedSteps: jsonb("executed_steps")
			.$type<{
				[stepNumber: number]: {
					status: "completed" | "failed" | "skipped";
					startedAt: string;
					completedAt?: string;
					output?: unknown;
					error?: string;
					branchTaken?: string; // For branch steps: which path was chosen
				};
			}>()
			.default({}),

		startedAt: timestamp("started_at"),
		completedAt: timestamp("completed_at"),
		pausedAt: timestamp("paused_at"),

		// Error tracking
		error: text("error"),
		errorStep: integer("error_step"),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		projectIdIdx: index("idx_workflow_executions_project_id").on(
			table.projectId,
		),
		statusIdx: index("idx_workflow_executions_status").on(table.status),
		projectStatusIdx: index("workflow_executions_project_status_idx").on(
			table.projectId,
			table.status,
		),
	}),
);

// ============================================
// TYPESCRIPT TYPES FOR STEP CONFIGS
// ============================================

// AskUserStep - Captures user input (UPDATED for Story 1.5)
// NOTE: Step config types are now defined in step-configs.ts using Zod schemas
// Import them from there instead of duplicating here

// Inferred type for workflow step records from database
export type WorkflowStep = typeof workflowSteps.$inferSelect;
