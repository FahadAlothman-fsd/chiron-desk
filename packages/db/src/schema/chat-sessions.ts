import { relations } from "drizzle-orm";
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
import { workflowExecutions } from "./workflows";
import { chatMessages } from "./chat-messages";
import { streamCheckpoints } from "./stream-checkpoints";

export const chatSessionStatusEnum = pgEnum("chat_session_status", [
	"active",
	"completed",
	"failed",
	"interrupted",
]);

export interface ChatSessionMetadata {
	model?: string;
	systemPrompt?: string;
	tools?: string[];
	[key: string]: unknown;
}

export const chatSessions = pgTable(
	"chat_sessions",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		executionId: uuid("execution_id")
			.notNull()
			.references(() => workflowExecutions.id, { onDelete: "cascade" }),
		stepId: text("step_id").notNull(),

		title: text("title"),
		status: chatSessionStatusEnum("status").notNull().default("active"),

		messageCount: integer("message_count").notNull().default(0),
		totalTokens: integer("total_tokens").notNull().default(0),

		metadata: jsonb("metadata").$type<ChatSessionMetadata>(),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
	},
	(table) => ({
		executionIdx: index("chat_sessions_execution_idx").on(table.executionId),
		executionStepIdx: index("chat_sessions_execution_step_idx").on(
			table.executionId,
			table.stepId,
		),
		statusIdx: index("chat_sessions_status_idx").on(table.status),
	}),
);

export const chatSessionsRelations = relations(
	chatSessions,
	({ one, many }) => ({
		execution: one(workflowExecutions, {
			fields: [chatSessions.executionId],
			references: [workflowExecutions.id],
		}),
		messages: many(chatMessages),
		checkpoints: many(streamCheckpoints),
	}),
);

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
