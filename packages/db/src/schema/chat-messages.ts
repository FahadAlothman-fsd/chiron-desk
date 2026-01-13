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
import { chatSessions } from "./chat-sessions";

export const messageRoleEnum = pgEnum("message_role", [
	"user",
	"assistant",
	"system",
	"tool_call",
	"tool_result",
]);

export interface ChatMessageMetadata {
	tokenCount?: number;
	model?: string;
	finishReason?: string;
	interrupted?: boolean;
	toolName?: string;
	toolCallId?: string;
	toolResultId?: string;
	success?: boolean;
	[key: string]: unknown;
}

export const chatMessages = pgTable(
	"chat_messages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => chatSessions.id, { onDelete: "cascade" }),

		role: messageRoleEnum("role").notNull(),
		content: text("content").notNull(),
		sequenceNum: integer("sequence_num").notNull(),

		metadata: jsonb("metadata").$type<ChatMessageMetadata>(),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		sessionSeqIdx: index("chat_messages_session_seq_idx").on(
			table.sessionId,
			table.sequenceNum,
		),
		roleIdx: index("chat_messages_role_idx").on(table.role),
		createdIdx: index("chat_messages_created_idx").on(table.createdAt),
	}),
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
	session: one(chatSessions, {
		fields: [chatMessages.sessionId],
		references: [chatSessions.id],
	}),
}));

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
