import {
	approvalAudit,
	type ApprovalAuditEntry as DBApprovalAuditEntry,
	type UserApprovalSettings as DBUserApprovalSettings,
	type NewApprovalAuditEntry,
	userApprovalSettings,
} from "@chiron/db";
import { eq } from "drizzle-orm";
import { Context, Data, Effect, Layer } from "effect";
import { DatabaseService } from "./database-service";
import type {
	ApprovalMode,
	RiskLevel,
	ToolApprovalConfig,
} from "./tool-builder";

export class ApprovalServiceError extends Data.TaggedError(
	"ApprovalServiceError",
)<{
	readonly cause: unknown;
	readonly operation: "decide" | "log" | "getSettings" | "updateSettings";
}> {}

export type TrustLevel = "paranoid" | "cautious" | "balanced" | "yolo";

export interface UserAutoApproveSettings {
	enabled: boolean;
	trustLevel: TrustLevel;
	toolOverrides: Record<string, boolean>;
}

export interface SessionApprovalState {
	approveAllUntil?: Date;
	approvedTools: Set<string>;
	deniedTools: Set<string>;
}

export interface ApprovalDecision {
	autoApprove: boolean;
	reason: string;
	toolName: string;
	riskLevel: RiskLevel;
	trustLevel: TrustLevel;
}

export interface ApprovalAuditEntry {
	id: string;
	timestamp: Date;
	executionId: string;
	toolName: string;
	toolType: string;
	autoApproved: boolean;
	reason: string;
	trustLevel: TrustLevel;
	riskLevel: RiskLevel;
	userResponse?: {
		action: "approved" | "denied" | "modified";
		value?: string;
		responseTimeMs: number;
	} | null;
	timedOut: boolean;
}

export interface ApprovalRequest {
	toolName: string;
	toolType: string;
	approval: ToolApprovalConfig;
	executionId: string;
	context?: Record<string, unknown>;
}

const TRUST_MATRIX: Record<TrustLevel, Set<RiskLevel>> = {
	paranoid: new Set([]),
	cautious: new Set(["safe"]),
	balanced: new Set(["safe", "moderate"]),
	yolo: new Set(["safe", "moderate", "dangerous"]),
};

const DEFAULT_USER_SETTINGS: UserAutoApproveSettings = {
	enabled: true,
	trustLevel: "cautious",
	toolOverrides: {},
};

const sessionStates = new Map<string, SessionApprovalState>();

function getSessionState(executionId: string): SessionApprovalState {
	let state = sessionStates.get(executionId);
	if (!state) {
		state = {
			approvedTools: new Set(),
			deniedTools: new Set(),
		};
		sessionStates.set(executionId, state);
	}
	return state;
}

export interface ApprovalService {
	readonly _tag: "ApprovalService";

	shouldAutoApprove: (
		request: ApprovalRequest,
		userSettings: UserAutoApproveSettings,
		sessionState: SessionApprovalState,
	) => Effect.Effect<ApprovalDecision, never>;

	logDecision: (
		entry: Omit<ApprovalAuditEntry, "id" | "timestamp">,
	) => Effect.Effect<ApprovalAuditEntry, ApprovalServiceError>;

	getUserSettings: (
		userId: string,
	) => Effect.Effect<UserAutoApproveSettings, ApprovalServiceError>;

	updateUserSettings: (
		userId: string,
		settings: Partial<UserAutoApproveSettings>,
	) => Effect.Effect<UserAutoApproveSettings, ApprovalServiceError>;

	getSessionState: (
		executionId: string,
	) => Effect.Effect<SessionApprovalState, never>;

	updateSessionState: (
		executionId: string,
		update: Partial<SessionApprovalState>,
	) => Effect.Effect<SessionApprovalState, ApprovalServiceError>;

	getAuditLog: (
		executionId: string,
		options?: { limit?: number },
	) => Effect.Effect<ApprovalAuditEntry[], ApprovalServiceError>;

	clearSessionState: (executionId: string) => Effect.Effect<void, never>;
}

export const ApprovalService =
	Context.GenericTag<ApprovalService>("ApprovalService");

export const ApprovalServiceLive = Layer.effect(
	ApprovalService,
	Effect.gen(function* () {
		const { db } = yield* DatabaseService;

		return {
			_tag: "ApprovalService" as const,

			shouldAutoApprove: (request, userSettings, sessionState) =>
				Effect.sync(() => {
					const { approval, toolName } = request;
					const baseDecision = {
						toolName,
						riskLevel: approval.riskLevel,
						trustLevel: userSettings.trustLevel,
					};

					if (approval.mode === "none") {
						return {
							...baseDecision,
							autoApprove: true,
							reason: "mode:none",
						};
					}

					if (!userSettings.enabled) {
						return {
							...baseDecision,
							autoApprove: false,
							reason: "auto-approve:disabled",
						};
					}

					if (
						sessionState.approveAllUntil &&
						new Date() < sessionState.approveAllUntil
					) {
						return {
							...baseDecision,
							autoApprove: true,
							reason: "session:approve-all",
						};
					}

					if (sessionState.deniedTools.has(toolName)) {
						return {
							...baseDecision,
							autoApprove: false,
							reason: "session:denied",
						};
					}

					if (sessionState.approvedTools.has(toolName)) {
						return {
							...baseDecision,
							autoApprove: true,
							reason: "session:approved",
						};
					}

					if (request.toolType in userSettings.toolOverrides) {
						return {
							...baseDecision,
							autoApprove: userSettings.toolOverrides[request.toolType]!,
							reason: "user:tool-override",
						};
					}

					const allowedRisks = TRUST_MATRIX[userSettings.trustLevel];
					const autoApprove = allowedRisks.has(approval.riskLevel);

					return {
						...baseDecision,
						autoApprove,
						reason: `trust:${userSettings.trustLevel}+risk:${approval.riskLevel}`,
					};
				}),

			logDecision: (entry) =>
				Effect.tryPromise({
					try: async () => {
						const newEntry: NewApprovalAuditEntry = {
							executionId: entry.executionId,
							toolName: entry.toolName,
							toolType: entry.toolType,
							autoApproved: entry.autoApproved,
							reason: entry.reason,
							trustLevel: entry.trustLevel,
							riskLevel: entry.riskLevel,
							userResponse: entry.userResponse ?? null,
							timedOut: entry.timedOut,
						};

						const [result] = await db
							.insert(approvalAudit)
							.values(newEntry)
							.returning();

						return {
							id: result!.id,
							timestamp: result!.createdAt,
							executionId: result!.executionId,
							toolName: result!.toolName,
							toolType: result!.toolType,
							autoApproved: result!.autoApproved,
							reason: result!.reason,
							trustLevel: result!.trustLevel,
							riskLevel: result!.riskLevel,
							userResponse: result!.userResponse,
							timedOut: result!.timedOut,
						} as ApprovalAuditEntry;
					},
					catch: (error) =>
						new ApprovalServiceError({ cause: error, operation: "log" }),
				}),

			getUserSettings: (userId) =>
				Effect.tryPromise({
					try: async () => {
						const result = await db
							.select()
							.from(userApprovalSettings)
							.where(eq(userApprovalSettings.userId, userId))
							.limit(1);

						if (!result[0]) {
							return DEFAULT_USER_SETTINGS;
						}

						return {
							enabled: result[0].enabled,
							trustLevel: result[0].trustLevel,
							toolOverrides: result[0].toolOverrides,
						};
					},
					catch: (error) =>
						new ApprovalServiceError({
							cause: error,
							operation: "getSettings",
						}),
				}),

			updateUserSettings: (userId, settings) =>
				Effect.tryPromise({
					try: async () => {
						const existing = await db
							.select()
							.from(userApprovalSettings)
							.where(eq(userApprovalSettings.userId, userId))
							.limit(1);

						const currentSettings = existing[0]
							? {
									enabled: existing[0].enabled,
									trustLevel: existing[0].trustLevel,
									toolOverrides: existing[0].toolOverrides,
								}
							: DEFAULT_USER_SETTINGS;

						const newSettings = {
							...currentSettings,
							...settings,
						};

						if (existing[0]) {
							await db
								.update(userApprovalSettings)
								.set({
									enabled: newSettings.enabled,
									trustLevel: newSettings.trustLevel,
									toolOverrides: newSettings.toolOverrides,
									updatedAt: new Date(),
								})
								.where(eq(userApprovalSettings.userId, userId));
						} else {
							await db.insert(userApprovalSettings).values({
								userId,
								enabled: newSettings.enabled,
								trustLevel: newSettings.trustLevel,
								toolOverrides: newSettings.toolOverrides,
							});
						}

						return newSettings;
					},
					catch: (error) =>
						new ApprovalServiceError({
							cause: error,
							operation: "updateSettings",
						}),
				}),

			getSessionState: (executionId) =>
				Effect.sync(() => getSessionState(executionId)),

			updateSessionState: (executionId, update) =>
				Effect.try({
					try: () => {
						const state = getSessionState(executionId);

						if (update.approveAllUntil !== undefined) {
							state.approveAllUntil = update.approveAllUntil;
						}

						if (update.approvedTools) {
							for (const tool of update.approvedTools) {
								state.approvedTools.add(tool);
								state.deniedTools.delete(tool);
							}
						}

						if (update.deniedTools) {
							for (const tool of update.deniedTools) {
								state.deniedTools.add(tool);
								state.approvedTools.delete(tool);
							}
						}

						return state;
					},
					catch: (error) =>
						new ApprovalServiceError({
							cause: error,
							operation: "updateSettings",
						}),
				}),

			getAuditLog: (executionId, options) =>
				Effect.tryPromise({
					try: async () => {
						let query = db
							.select()
							.from(approvalAudit)
							.where(eq(approvalAudit.executionId, executionId))
							.orderBy(approvalAudit.createdAt);

						if (options?.limit) {
							query = query.limit(options.limit) as typeof query;
						}

						const results = await query;

						return results.map((r) => ({
							id: r.id,
							timestamp: r.createdAt,
							executionId: r.executionId,
							toolName: r.toolName,
							toolType: r.toolType,
							autoApproved: r.autoApproved,
							reason: r.reason,
							trustLevel: r.trustLevel,
							riskLevel: r.riskLevel,
							userResponse: r.userResponse,
							timedOut: r.timedOut,
						})) as ApprovalAuditEntry[];
					},
					catch: (error) =>
						new ApprovalServiceError({ cause: error, operation: "log" }),
				}),

			clearSessionState: (executionId) =>
				Effect.sync(() => {
					sessionStates.delete(executionId);
				}),
		};
	}),
);
