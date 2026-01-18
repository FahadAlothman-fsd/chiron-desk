import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { agents } from "./agents";
import { projects } from "./core";
import type { StepConfig } from "./step-configs";

// ============================================
// WORKFLOW TYPES - Story 2.1 Schema Refactor
// ============================================

/**
 * WorkflowTags - JSONB type for flexible filtering
 * Replaces rigid columns (module, initializerType, etc.) with dynamic tags
 *
 * @example
 * {
 *   phase: "0",           // BMAD phase (0=Discovery, 1=Analysis, etc.)
 *   type: "method",       // Workflow type (method, technique, utility)
 *   track: "greenfield",  // Project track (greenfield, brownfield)
 *   complexity: "moderate" // Complexity classification
 * }
 */
export interface WorkflowTags {
  phase?: string; // BMAD phase: "0", "1", "2", "3", "4"
  type?: string; // Workflow type: "method", "technique", "utility", "initializer"
  track?: string; // Project track: "greenfield", "brownfield"
  complexity?: string; // Complexity: "quick", "moderate", "enterprise"
  module?: string; // Module origin: "bmm", "cis", "custom" (migrated from column)
  [key: string]: string | undefined; // Allow additional custom tags
}

/**
 * WorkflowInputSchema - Defines expected input variables for workflow invocation
 * Story 2.3: Used for validating variableMapping when invoking child workflows
 *
 * @example
 * {
 *   session_topic: { type: "string", required: true, description: "The brainstorming topic" },
 *   stated_goals: { type: "array", items: { type: "string" }, required: false, description: "User goals" }
 * }
 */
export interface WorkflowInputSchema {
  [variableName: string]: {
    type: "string" | "number" | "boolean" | "array" | "object";
    required: boolean;
    description?: string;
    items?: { type: string }; // For array types
    properties?: Record<string, unknown>; // For object types (shallow)
  };
}

/**
 * WorkflowMetadata - JSONB type for UI configuration
 * Stores display-related settings that don't affect execution
 *
 * @example
 * {
 *   icon: "brain",
 *   color: "#8B5CF6",
 *   recommendedFor: ["new-projects", "ideation"],
 *   estimatedDuration: "15-30 min",
 *   inputSchema: {
 *     session_topic: { type: "string", required: true },
 *     stated_goals: { type: "array", items: { type: "string" }, required: true }
 *   }
 * }
 */
export interface WorkflowMetadata {
  icon?: string; // Lucide icon name
  color?: string; // Hex color for UI
  recommendedFor?: string[]; // Contexts where this workflow is recommended
  estimatedDuration?: string; // Human-readable duration estimate
  agentId?: string; // Associated agent UUID (migrated from column)
  isStandalone?: boolean; // Can run without project context (migrated from column)
  requiresProjectContext?: boolean; // Needs existing project (migrated from column)
  layoutType?: "wizard" | "artifact-workbench" | "dialog"; // Story 2.3: UI layout pattern for child workflows
  inputSchema?: WorkflowInputSchema; // Story 2.3: Expected input variables (for child workflows)
  [key: string]: unknown; // Allow additional custom metadata
}

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
  "user-form",
  "sandboxed-agent",
  "system-agent",
  "execute-action",
  "invoke-workflow",
  "display-output",
  "branch",
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
// WORKFLOWS TABLE (Story 2.1 - Schema Refactor)
// Complete workflow definitions with flexible tags and metadata
// ============================================

export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(), // e.g., "brainstorm-project", "research", "workflow-init"
    displayName: text("display_name").notNull(),
    description: text("description"),

    // Story 2.1: Flexible JSONB fields replace rigid columns
    // Tags for filtering (phase, type, track, complexity, etc.)
    tags: jsonb("tags").$type<WorkflowTags>().default({}),
    // Metadata for UI configuration (icon, color, recommendedFor, etc.)
    metadata: jsonb("metadata").$type<WorkflowMetadata>().default({}),

    // Output artifact configuration (optional) - KEPT for artifact generation
    outputArtifactType: text("output_artifact_type"), // "prd", "architecture", "story", etc.
    outputTemplateId: uuid("output_template_id"), // Reference to workflow_templates table

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // GIN index for efficient JSONB tag filtering
    tagsIdx: index("idx_workflows_tags").using("gin", table.tags),
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

    // Story 2.3: Parent-child workflow tracking
    parentExecutionId: uuid("parent_execution_id").references((): any => workflowExecutions.id, {
      onDelete: "cascade",
    }), // Nullable - null = top-level workflow, set = child workflow

    status: workflowStatusEnum("status").notNull().default("idle"),

    // Current step being executed
    currentStepId: uuid("current_step_id").references(() => workflowSteps.id),

    // ALL RUNTIME DATA STORED HERE!
    // Steps read/write from this JSONB using storeAs and evaluateVariable config fields
    variables: jsonb("variables").$type<Record<string, unknown>>().notNull().default({}),

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
    projectIdIdx: index("idx_workflow_executions_project_id").on(table.projectId),
    statusIdx: index("idx_workflow_executions_status").on(table.status),
    projectStatusIdx: index("workflow_executions_project_status_idx").on(
      table.projectId,
      table.status,
    ),
    parentExecutionIdIdx: index("idx_workflow_executions_parent_id").on(table.parentExecutionId), // Story 2.3: Query children by parent
  }),
);

// ============================================
// DRIZZLE RELATIONS
// ============================================

export const workflowsRelations = relations(workflows, ({ many }) => ({
  steps: many(workflowSteps),
  executions: many(workflowExecutions),
}));

export const workflowStepsRelations = relations(workflowSteps, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowSteps.workflowId],
    references: [workflows.id],
  }),
}));

export const workflowExecutionsRelations = relations(workflowExecutions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [workflowExecutions.workflowId],
    references: [workflows.id],
  }),
  project: one(projects, {
    fields: [workflowExecutions.projectId],
    references: [projects.id],
  }),
  agent: one(agents, {
    fields: [workflowExecutions.agentId],
    references: [agents.id],
  }),
  currentStep: one(workflowSteps, {
    fields: [workflowExecutions.currentStepId],
    references: [workflowSteps.id],
  }),
  parent: one(workflowExecutions, {
    fields: [workflowExecutions.parentExecutionId],
    references: [workflowExecutions.id],
    relationName: "parentChild",
  }),
  children: many(workflowExecutions, {
    relationName: "parentChild",
  }),
}));

// ============================================
// TYPESCRIPT TYPES
// ============================================

// Inferred type for workflow records from database
export type Workflow = typeof workflows.$inferSelect;

// Inferred type for workflow step records from database
export type WorkflowStep = typeof workflowSteps.$inferSelect;

// NOTE: Step config types are defined in step-configs.ts using Zod schemas
// Import them from there instead of duplicating here
