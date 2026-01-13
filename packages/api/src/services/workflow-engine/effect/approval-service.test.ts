import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import {
	type ApprovalRequest,
	ApprovalService,
	ApprovalServiceLive,
	type SessionApprovalState,
	type TrustLevel,
	type UserAutoApproveSettings,
} from "./approval-service";
import { DatabaseService } from "./database-service";
import type { ApprovalMode, RiskLevel } from "./tool-builder";

const mockDb = {
	insert: () => ({
		values: () => ({
			returning: () =>
				Promise.resolve([{ id: "test-id", createdAt: new Date() }]),
		}),
	}),
	select: () => ({
		from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
	}),
	update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
};

const MockDatabaseLayer = Layer.succeed(DatabaseService, {
	_tag: "DatabaseService" as const,
	db: mockDb as any,
	transaction: (fn: any) =>
		Effect.tryPromise({ try: () => fn(mockDb), catch: (e) => e }),
});

function createApprovalRequest(
	mode: ApprovalMode,
	riskLevel: RiskLevel,
	toolName = "test-tool",
): ApprovalRequest {
	return {
		toolName,
		toolType: "update-variable",
		approval: {
			mode,
			riskLevel,
		},
		executionId: "test-execution",
	};
}

function createUserSettings(
	trustLevel: TrustLevel,
	enabled = true,
	toolOverrides: Record<string, boolean> = {},
): UserAutoApproveSettings {
	return { enabled, trustLevel, toolOverrides };
}

function createSessionState(
	approvedTools: string[] = [],
	deniedTools: string[] = [],
	approveAllUntil?: Date,
): SessionApprovalState {
	return {
		approvedTools: new Set(approvedTools),
		deniedTools: new Set(deniedTools),
		approveAllUntil,
	};
}

describe("ApprovalService", () => {
	describe("shouldAutoApprove - Mode: none", () => {
		it("should auto-approve when mode is none regardless of trust level", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ApprovalService;
				return yield* service.shouldAutoApprove(
					createApprovalRequest("none", "dangerous"),
					createUserSettings("paranoid"),
					createSessionState(),
				);
			});

			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);
			const result = await Effect.runPromise(
				program.pipe(Effect.provide(testLayer)),
			);

			expect(result.autoApprove).toBe(true);
			expect(result.reason).toBe("mode:none");
		});
	});

	describe("shouldAutoApprove - Master switch", () => {
		it("should NOT auto-approve when enabled is false", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ApprovalService;
				return yield* service.shouldAutoApprove(
					createApprovalRequest("confirm", "safe"),
					createUserSettings("yolo", false),
					createSessionState(),
				);
			});

			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);
			const result = await Effect.runPromise(
				program.pipe(Effect.provide(testLayer)),
			);

			expect(result.autoApprove).toBe(false);
			expect(result.reason).toBe("auto-approve:disabled");
		});
	});

	describe("shouldAutoApprove - Session state", () => {
		it("should auto-approve when within approveAllUntil window", async () => {
			const futureDate = new Date(Date.now() + 60000);

			const program = Effect.gen(function* () {
				const service = yield* ApprovalService;
				return yield* service.shouldAutoApprove(
					createApprovalRequest("confirm", "dangerous"),
					createUserSettings("paranoid"),
					createSessionState([], [], futureDate),
				);
			});

			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);
			const result = await Effect.runPromise(
				program.pipe(Effect.provide(testLayer)),
			);

			expect(result.autoApprove).toBe(true);
			expect(result.reason).toBe("session:approve-all");
		});

		it("should NOT auto-approve when tool is in deniedTools", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ApprovalService;
				return yield* service.shouldAutoApprove(
					createApprovalRequest("confirm", "safe", "denied-tool"),
					createUserSettings("yolo"),
					createSessionState([], ["denied-tool"]),
				);
			});

			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);
			const result = await Effect.runPromise(
				program.pipe(Effect.provide(testLayer)),
			);

			expect(result.autoApprove).toBe(false);
			expect(result.reason).toBe("session:denied");
		});

		it("should auto-approve when tool is in approvedTools", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ApprovalService;
				return yield* service.shouldAutoApprove(
					createApprovalRequest("confirm", "dangerous", "approved-tool"),
					createUserSettings("paranoid"),
					createSessionState(["approved-tool"]),
				);
			});

			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);
			const result = await Effect.runPromise(
				program.pipe(Effect.provide(testLayer)),
			);

			expect(result.autoApprove).toBe(true);
			expect(result.reason).toBe("session:approved");
		});
	});

	describe("shouldAutoApprove - Tool overrides", () => {
		it("should respect per-tool-type override (true)", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ApprovalService;
				return yield* service.shouldAutoApprove(
					createApprovalRequest("confirm", "dangerous"),
					createUserSettings("paranoid", true, { "update-variable": true }),
					createSessionState(),
				);
			});

			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);
			const result = await Effect.runPromise(
				program.pipe(Effect.provide(testLayer)),
			);

			expect(result.autoApprove).toBe(true);
			expect(result.reason).toBe("user:tool-override");
		});

		it("should respect per-tool-type override (false)", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ApprovalService;
				return yield* service.shouldAutoApprove(
					createApprovalRequest("confirm", "safe"),
					createUserSettings("yolo", true, { "update-variable": false }),
					createSessionState(),
				);
			});

			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);
			const result = await Effect.runPromise(
				program.pipe(Effect.provide(testLayer)),
			);

			expect(result.autoApprove).toBe(false);
			expect(result.reason).toBe("user:tool-override");
		});
	});

	describe("shouldAutoApprove - Trust matrix", () => {
		it("paranoid: should NOT auto-approve any risk level", async () => {
			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);

			for (const riskLevel of [
				"safe",
				"moderate",
				"dangerous",
			] as RiskLevel[]) {
				const program = Effect.gen(function* () {
					const service = yield* ApprovalService;
					return yield* service.shouldAutoApprove(
						createApprovalRequest("confirm", riskLevel),
						createUserSettings("paranoid"),
						createSessionState(),
					);
				});

				const result = await Effect.runPromise(
					program.pipe(Effect.provide(testLayer)),
				);
				expect(result.autoApprove).toBe(false);
				expect(result.reason).toBe(`trust:paranoid+risk:${riskLevel}`);
			}
		});

		it("cautious: should auto-approve only safe", async () => {
			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);

			const safeProgram = Effect.gen(function* () {
				const service = yield* ApprovalService;
				return yield* service.shouldAutoApprove(
					createApprovalRequest("confirm", "safe"),
					createUserSettings("cautious"),
					createSessionState(),
				);
			});
			const safeResult = await Effect.runPromise(
				safeProgram.pipe(Effect.provide(testLayer)),
			);
			expect(safeResult.autoApprove).toBe(true);

			const moderateProgram = Effect.gen(function* () {
				const service = yield* ApprovalService;
				return yield* service.shouldAutoApprove(
					createApprovalRequest("confirm", "moderate"),
					createUserSettings("cautious"),
					createSessionState(),
				);
			});
			const moderateResult = await Effect.runPromise(
				moderateProgram.pipe(Effect.provide(testLayer)),
			);
			expect(moderateResult.autoApprove).toBe(false);
		});

		it("balanced: should auto-approve safe and moderate", async () => {
			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);

			for (const riskLevel of ["safe", "moderate"] as RiskLevel[]) {
				const program = Effect.gen(function* () {
					const service = yield* ApprovalService;
					return yield* service.shouldAutoApprove(
						createApprovalRequest("confirm", riskLevel),
						createUserSettings("balanced"),
						createSessionState(),
					);
				});
				const result = await Effect.runPromise(
					program.pipe(Effect.provide(testLayer)),
				);
				expect(result.autoApprove).toBe(true);
			}

			const dangerousProgram = Effect.gen(function* () {
				const service = yield* ApprovalService;
				return yield* service.shouldAutoApprove(
					createApprovalRequest("confirm", "dangerous"),
					createUserSettings("balanced"),
					createSessionState(),
				);
			});
			const dangerousResult = await Effect.runPromise(
				dangerousProgram.pipe(Effect.provide(testLayer)),
			);
			expect(dangerousResult.autoApprove).toBe(false);
		});

		it("yolo: should auto-approve all risk levels", async () => {
			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);

			for (const riskLevel of [
				"safe",
				"moderate",
				"dangerous",
			] as RiskLevel[]) {
				const program = Effect.gen(function* () {
					const service = yield* ApprovalService;
					return yield* service.shouldAutoApprove(
						createApprovalRequest("confirm", riskLevel),
						createUserSettings("yolo"),
						createSessionState(),
					);
				});
				const result = await Effect.runPromise(
					program.pipe(Effect.provide(testLayer)),
				);
				expect(result.autoApprove).toBe(true);
			}
		});
	});

	describe("getSessionState and updateSessionState", () => {
		it("should return empty session state for new execution", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ApprovalService;
				return yield* service.getSessionState("new-execution");
			});

			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);
			const result = await Effect.runPromise(
				program.pipe(Effect.provide(testLayer)),
			);

			expect(result.approvedTools.size).toBe(0);
			expect(result.deniedTools.size).toBe(0);
			expect(result.approveAllUntil).toBeUndefined();
		});

		it("should update session state with approved tools", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ApprovalService;
				yield* service.updateSessionState("test-exec", {
					approvedTools: new Set(["tool1", "tool2"]),
				});
				return yield* service.getSessionState("test-exec");
			});

			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);
			const result = await Effect.runPromise(
				program.pipe(Effect.provide(testLayer)),
			);

			expect(result.approvedTools.has("tool1")).toBe(true);
			expect(result.approvedTools.has("tool2")).toBe(true);
		});

		it("should clear session state", async () => {
			const program = Effect.gen(function* () {
				const service = yield* ApprovalService;
				yield* service.updateSessionState("clear-test", {
					approvedTools: new Set(["tool1"]),
				});
				yield* service.clearSessionState("clear-test");
				return yield* service.getSessionState("clear-test");
			});

			const testLayer = ApprovalServiceLive.pipe(
				Layer.provide(MockDatabaseLayer),
			);
			const result = await Effect.runPromise(
				program.pipe(Effect.provide(testLayer)),
			);

			expect(result.approvedTools.size).toBe(0);
		});
	});
});
