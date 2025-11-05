import {
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
	"llm-generate",
	"check-condition",
	"approval-checkpoint",
	"execute-action",
	"invoke-workflow",
	"display-output",
	"load-context",
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
// WORKFLOWS TABLE
// Complete workflow definitions
// ============================================

export const workflows = pgTable("workflows", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull().unique(), // e.g., "brainstorm-project", "research"
	displayName: text("display_name").notNull(),
	agentId: uuid("agent_id")
		.notNull()
		.references(() => agents.id),

	pattern: workflowPatternEnum("pattern").notNull(),

	// Output artifact configuration (optional)
	outputArtifactType: text("output_artifact_type"), // "markdown", "json"
	outputArtifactTemplateId: uuid("output_artifact_template_id"), // Future: reference to templates table

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// WORKFLOW STEPS TABLE
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
		stepType: stepTypeEnum("step_type").notNull(),
		stepId: text("step_id").notNull(), // "validate-readiness", "check-status"

		title: text("title").notNull(),
		description: text("description"),

		// Type-specific configuration (typed per stepType)
		config: jsonb("config").$type<StepConfig>().notNull(),

		// Next step (null if routing via branches)
		nextStepId: uuid("next_step_id").references(() => workflowSteps.id),

		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		workflowIdIdx: index("workflow_steps_workflow_id_idx").on(table.workflowId),
		workflowStepNumIdx: index("workflow_steps_workflow_step_idx").on(
			table.workflowId,
			table.stepNumber,
		),
	}),
);

// ============================================
// WORKFLOW STEP BRANCHES TABLE
// N-way conditional routing (boolean, select, abstract)
// ============================================

export const workflowStepBranches = pgTable("workflow_step_branches", {
	id: uuid("id").primaryKey().defaultRandom(),

	stepId: uuid("step_id")
		.notNull()
		.references(() => workflowSteps.id, { onDelete: "cascade" }),

	// Branch configuration
	branchKey: text("branch_key").notNull(), // "true", "false", "1", "2", "3", etc.
	branchLabel: text("branch_label"), // Display text for select options (optional)

	// Target
	nextStepId: uuid("next_step_id")
		.notNull()
		.references(() => workflowSteps.id),

	// Ordering for select dropdowns
	displayOrder: integer("display_order"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================
// WORKFLOW STEP ACTIONS TABLE
// Actions within steps (sequential/parallel execution)
// ============================================

export const workflowStepActions = pgTable("workflow_step_actions", {
	id: uuid("id").primaryKey().defaultRandom(),

	stepId: uuid("step_id")
		.notNull()
		.references(() => workflowSteps.id, { onDelete: "cascade" }),

	actionType: text("action_type").notNull(), // "set-variable", "database-insert", "database-query"
	actionConfig: jsonb("action_config").notNull(), // Action-specific parameters

	// Chiron's execution pattern
	executionMode: actionExecutionEnum("execution_mode").notNull(),
	sequenceOrder: integer("sequence_order").notNull(),

	// Conditional execution (optional)
	condition: text("condition"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================
// WORKFLOW EXECUTIONS TABLE
// Runtime workflow execution state (pause/resume)
// ============================================

export const workflowExecutions = pgTable(
	"workflow_executions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		workflowId: uuid("workflow_id")
			.notNull()
			.references(() => workflows.id, { onDelete: "cascade" }),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),

		status: workflowStatusEnum("status").notNull().default("idle"),

		// Current step being executed
		currentStepId: uuid("current_step_id").references(() => workflowSteps.id),

		// ALL RUNTIME DATA STORED HERE!
		// Steps read/write from this JSONB using storeAs and evaluateVariable config fields
		variables: jsonb("variables")
			.$type<Record<string, unknown>>()
			.notNull()
			.default({}),
		contextData: jsonb("context_data").$type<Record<string, unknown>>(),

		startedAt: timestamp("started_at"),
		completedAt: timestamp("completed_at"),
		pausedAt: timestamp("paused_at"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		projectIdIdx: index("workflow_executions_project_id_idx").on(
			table.projectId,
		),
		statusIdx: index("workflow_executions_status_idx").on(table.status),
		projectStatusIdx: index("workflow_executions_project_status_idx").on(
			table.projectId,
			table.status,
		),
	}),
);

// ============================================
// TYPESCRIPT TYPES FOR STEP CONFIGS
// ============================================

// AskUserStep - Captures user input
export type AskUserStepConfig = {
	question: string;
	inputType: "text" | "boolean" | "select" | "number";
	options?: string[]; // For select type
	validation?: string; // Zod schema as string
	storeAs: string; // Variable name in workflow_executions.variables
};

// LLMGenerateStep - Generate content with LLM
export type LLMGenerateStepConfig = {
	promptTemplate: string; // Can use {{variable}} interpolation
	outputSchema: string; // Zod schema as JSON string
	streaming: boolean;
	temperature?: number;
	storeAs: string; // Variable name
};

// CheckConditionStep - Evaluate condition and route
export type CheckConditionStepConfig = {
	conditionType: "boolean" | "select" | "abstract";
	evaluateVariable: string; // Variable name from workflow_executions.variables

	// For ABSTRACT only (LLM evaluates)
	abstractCondition?: {
		llmPrompt: string;
		evaluationSchema: string; // Zod schema (usually z.boolean())
	};

	// Routing defined in workflow_step_branches table
};

// ExecuteActionStep - Run actions
export type ExecuteActionStepConfig = {
	description: string;
	// Actions defined in workflow_step_actions table
};

// InvokeWorkflowStep - Call sub-workflow
export type InvokeWorkflowStepConfig = {
	invokedWorkflowName: string;
	inputParams: Record<string, unknown>; // Can use {{variable}} interpolation
	outputMapping: Record<string, string>; // Map sub-workflow outputs to variables
};

// DisplayOutputStep - Show message to user
export type DisplayOutputStepConfig = {
	outputTemplate: string; // Can use {{variable}} interpolation
	outputType: "info" | "success" | "warning" | "error";
};

// LoadContextStep - Load context into workflow
export type LoadContextStepConfig = {
	contextSource: "inline" | "database" | "variable";

	// For inline (context defined in workflow config)
	contextContent?: string;

	// For database (query for artifact content)
	databaseQuery?: {
		table: string;
		where: Record<string, unknown>;
		selectField: string;
	};

	// For variable (copy from existing variable)
	sourceVariable?: string;

	storeAs: string; // Variable name
};

// Union type for all step configs
export type StepConfig =
	| AskUserStepConfig
	| LLMGenerateStepConfig
	| CheckConditionStepConfig
	| ExecuteActionStepConfig
	| InvokeWorkflowStepConfig
	| DisplayOutputStepConfig
	| LoadContextStepConfig;
