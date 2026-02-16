import { describe, expect, it } from "bun:test";
import { Effect, Fiber } from "effect";
import { makeApprovalGateway } from "./approval-gateway";

describe("approval-gateway", () => {
  it("resolves pending approval request roundtrip", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const gateway = yield* makeApprovalGateway;

        const requestFiber = yield* gateway
          .request({
            toolCallId: "call-1",
            toolName: "write_file",
            executionId: "exec-1",
            stepId: "step-1",
            args: { path: "README.md" },
          })
          .pipe(Effect.fork);

        yield* Effect.yieldNow();

        const resolved = yield* gateway.resolve({
          toolCallId: "call-1",
          toolName: "write_file",
          action: "approve",
          feedback: "safe",
        });

        const resolution = yield* Fiber.join(requestFiber);

        return { resolved, resolution };
      }),
    );

    expect(result.resolved).toBe(true);
    expect(result.resolution.toolCallId).toBe("call-1");
    expect(result.resolution.action).toBe("approve");
  });

  it("returns false for unknown approval request", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const gateway = yield* makeApprovalGateway;
        return yield* gateway.resolve({
          toolCallId: "missing",
          toolName: "write_file",
          action: "reject",
        });
      }),
    );

    expect(result).toBe(false);
  });
});
