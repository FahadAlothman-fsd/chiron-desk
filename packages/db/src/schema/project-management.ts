import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./core";

// ============================================
// EPIC STATE TABLE (Future - Epic 2+)
// Tracks epic progress
// ============================================

export const epicState = pgTable("epic_state", {
	id: uuid("id").primaryKey().defaultRandom(),
	projectId: uuid("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	epicNumber: integer("epic_number").notNull(),
	status: text("status").notNull(), // "todo", "in-progress", "done"
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// STORY STATE TABLE (Future - Epic 2+)
// Tracks story progress
// ============================================

export const storyState = pgTable("story_state", {
	id: uuid("id").primaryKey().defaultRandom(),
	projectId: uuid("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	epicNumber: integer("epic_number").notNull(),
	storyNumber: text("story_number").notNull(),
	status: text("status").notNull(), // "todo", "in-progress", "done"
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
