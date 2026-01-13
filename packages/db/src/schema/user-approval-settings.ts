import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { trustLevelEnum } from "./approval-audit";
import { user } from "./auth";

export const userApprovalSettings = pgTable(
	"user_approval_settings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: "cascade" }),

		enabled: boolean("enabled").notNull().default(true),
		trustLevel: trustLevelEnum("trust_level").notNull().default("cautious"),

		toolOverrides: jsonb("tool_overrides")
			.$type<Record<string, boolean>>()
			.notNull()
			.default({}),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		userIdx: index("user_approval_settings_user_idx").on(table.userId),
	}),
);

export const userApprovalSettingsRelations = relations(
	userApprovalSettings,
	({ one }) => ({
		user: one(user, {
			fields: [userApprovalSettings.userId],
			references: [user.id],
		}),
	}),
);

export type UserApprovalSettings = typeof userApprovalSettings.$inferSelect;
export type NewUserApprovalSettings = typeof userApprovalSettings.$inferInsert;
