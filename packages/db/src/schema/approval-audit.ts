import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { workflowExecutions } from "./workflows";

export const trustLevelEnum = pgEnum("trust_level", [
	"paranoid",
	"cautious",
	"balanced",
	"yolo",
]);

export const riskLevelEnum = pgEnum("risk_level", [
	"safe",
	"moderate",
	"dangerous",
]);

export interface ApprovalUserResponse {
	action: "approved" | "denied" | "modified";
	value?: string;
	responseTimeMs: number;
}

export const approvalAudit = pgTable(
	"approval_audit",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		executionId: uuid("execution_id")
			.notNull()
			.references(() => workflowExecutions.id, { onDelete: "cascade" }),

		toolName: text("tool_name").notNull(),
		toolType: text("tool_type").notNull(),

		autoApproved: boolean("auto_approved").notNull(),
		reason: text("reason").notNull(),

		trustLevel: trustLevelEnum("trust_level").notNull(),
		riskLevel: riskLevelEnum("risk_level").notNull(),

		userResponse: jsonb("user_response").$type<ApprovalUserResponse | null>(),

		timedOut: boolean("timed_out").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		executionIdx: index("approval_audit_execution_idx").on(table.executionId),
		autoApprovedIdx: index("approval_audit_auto_approved_idx").on(
			table.autoApproved,
		),
		toolTypeIdx: index("approval_audit_tool_type_idx").on(table.toolType),
		createdIdx: index("approval_audit_created_idx").on(table.createdAt),
	}),
);

export const approvalAuditRelations = relations(approvalAudit, ({ one }) => ({
	execution: one(workflowExecutions, {
		fields: [approvalAudit.executionId],
		references: [workflowExecutions.id],
	}),
}));

export type ApprovalAuditEntry = typeof approvalAudit.$inferSelect;
export type NewApprovalAuditEntry = typeof approvalAudit.$inferInsert;
