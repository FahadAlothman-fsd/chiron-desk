import { integer, jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./core";

// ============================================
// TRAINING EXAMPLES TABLE (ax optimization)
// Stores user corrections for prompt optimization
// ============================================

export const trainingExamples = pgTable("training_examples", {
	id: uuid("id").primaryKey().defaultRandom(),
	projectId: uuid("project_id").references(() => projects.id, {
		onDelete: "cascade",
	}),

	workflowId: text("workflow_id").notNull(), // e.g., "workflow-init"
	stepId: text("step_id").notNull(), // e.g., "classify-level"

	input: jsonb("input").notNull(), // LLM inputs
	output: jsonb("output").notNull(), // Correct output (from user correction)
	originalPrediction: jsonb("original_prediction"), // Wrong LLM prediction

	createdAt: timestamp("created_at").notNull().defaultNow(),
	usedInOptimizationAt: timestamp("used_in_optimization_at"),
});

// ============================================
// OPTIMIZATION RUNS TABLE (ax optimization)
// Stores GEPA optimizer results
// ============================================

export const optimizationRuns = pgTable("optimization_runs", {
	id: uuid("id").primaryKey().defaultRandom(),

	workflowId: text("workflow_id").notNull(),
	stepId: text("step_id").notNull(),

	optimizerType: text("optimizer_type").notNull(), // "GEPA", "MiPRO", etc.
	numExamples: integer("num_examples").notNull(),

	bestScore: real("best_score").notNull(),
	paretoFrontSize: integer("pareto_front_size"),
	hypervolume: real("hypervolume"),

	optimizationFilePath: text("optimization_file_path").notNull(), // Path to JSON file
	appliedAt: timestamp("applied_at"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
});
