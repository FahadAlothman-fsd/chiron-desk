import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { agents } from "./agents";
import { user } from "./auth";
import { projects } from "./core";

// ============================================
// ACE PLAYBOOKS TABLE
// Stores learned patterns from user feedback for ACE (Agentic Context Engineering) optimizer
// ============================================

export const acePlaybooks = pgTable(
	"ace_playbooks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),

		// Scope determines playbook applicability
		scope: text("scope").notNull().default("global"), // "global" | "user" | "project"
		userId: text("user_id").references(() => user.id, { onDelete: "cascade" }), // For user-scoped playbooks
		projectId: uuid("project_id").references(() => projects.id, {
			onDelete: "cascade",
		}), // For project-scoped playbooks

		// Playbook content (structured bullets)
		// Format: { sections: { "Summary Generation": { bullets: ["...", "..."] }, "Complexity": { bullets: [...] } } }
		playbook: jsonb("playbook")
			.$type<{
				sections: Record<
					string,
					{
						bullets: string[];
					}
				>;
			}>()
			.notNull()
			.default({ sections: {} }),

		// Version tracking
		version: integer("version").notNull().default(1),
		totalUpdates: integer("total_updates").notNull().default(0),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		agentIdIdx: index("idx_ace_playbooks_agent_id").on(table.agentId),
		agentScopeIdx: index("idx_ace_playbooks_agent_scope").on(
			table.agentId,
			table.scope,
		),
		userIdIdx: index("idx_ace_playbooks_user_id").on(table.userId),
		projectIdIdx: index("idx_ace_playbooks_project_id").on(table.projectId),
	}),
);

// ============================================
// MIPRO TRAINING EXAMPLES TABLE
// Collects approved outputs for future MiPRO (Multi-prompt Iterative Refinement Optimization)
// ============================================

export const miproTrainingExamples = pgTable(
	"mipro_training_examples",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		// Tool/side effect identification
		toolName: text("tool_name").notNull(), // e.g., "update_summary", "update_complexity"
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),

		// Training data
		// Input includes: conversation_history, ace_context, variables
		input: jsonb("input")
			.$type<{
				conversation_history?: string;
				ace_context?: string;
				variables: Record<string, unknown>;
			}>()
			.notNull(),

		// Expected output (approved by user)
		expectedOutput: jsonb("expected_output")
			.$type<Record<string, unknown>>()
			.notNull(),

		// Rejection history (for analysis)
		rejectionHistory: jsonb("rejection_history")
			.$type<
				Array<{
					feedback: string;
					rejectedAt: string;
					previousOutput: unknown;
				}>
			>()
			.default([]),

		// Scorer results (from Mastra evals)
		scorerResults: jsonb("scorer_results")
			.$type<{
				answerRelevancy?: number;
				completeness?: number;
				accuracy?: number;
			}>()
			.default({}),

		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		toolNameIdx: index("idx_mipro_training_tool_name").on(table.toolName),
		agentIdIdx: index("idx_mipro_training_agent_id").on(table.agentId),
		createdAtIdx: index("idx_mipro_training_created_at").on(table.createdAt),
	}),
);

// TypeScript types
export type AcePlaybook = typeof acePlaybooks.$inferSelect;
export type NewAcePlaybook = typeof acePlaybooks.$inferInsert;
export type MiproTrainingExample = typeof miproTrainingExamples.$inferSelect;
export type NewMiproTrainingExample = typeof miproTrainingExamples.$inferInsert;
