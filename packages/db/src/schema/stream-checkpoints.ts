import { relations } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { chatSessions } from "./chat-sessions";

export const streamCheckpointStatusEnum = pgEnum("stream_checkpoint_status", [
  "streaming",
  "complete",
  "failed",
  "interrupted",
]);

export const streamCheckpoints = pgTable(
  "stream_checkpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),

    accumulatedText: text("accumulated_text").notNull().default(""),
    tokenCount: integer("token_count").notNull().default(0),

    status: streamCheckpointStatusEnum("status").notNull().default("streaming"),
    errorMessage: text("error_message"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastChunkAt: timestamp("last_chunk_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    sessionIdx: index("stream_checkpoints_session_idx").on(table.sessionId),
    statusIdx: index("stream_checkpoints_status_idx").on(table.status),
  }),
);

export const streamCheckpointsRelations = relations(streamCheckpoints, ({ one }) => ({
  session: one(chatSessions, {
    fields: [streamCheckpoints.sessionId],
    references: [chatSessions.id],
  }),
}));

export type StreamCheckpoint = typeof streamCheckpoints.$inferSelect;
export type NewStreamCheckpoint = typeof streamCheckpoints.$inferInsert;
