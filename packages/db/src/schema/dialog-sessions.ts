import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workflowExecutions } from "./workflows";

// ============================================
// DIALOG SESSIONS TABLE (OPTIONAL)
// Tracks dialog interactions for clarification steps
// Note: Can also be stored in workflow_executions.variables if preferred
// ============================================

export const dialogSessions = pgTable("dialog_sessions", {
	id: uuid("id").primaryKey().defaultRandom(),

	executionId: uuid("execution_id")
		.notNull()
		.references(() => workflowExecutions.id, { onDelete: "cascade" }),

	questionId: text("question_id").notNull(), // "q3_user_description"

	// Chat history
	messages: jsonb("messages")
		.$type<
			Array<{
				role: "user" | "assistant";
				content: string;
				timestamp: string;
			}>
		>()
		.default([]),

	// Extracted answer from dialog
	extractedAnswer: jsonb("extracted_answer"),

	status: text("status").notNull(), // "open" | "closed"

	createdAt: timestamp("created_at").notNull().defaultNow(),
	closedAt: timestamp("closed_at"),
});
