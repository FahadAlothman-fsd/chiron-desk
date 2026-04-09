import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { AgentStepContextWriteService } from "../../services/runtime/agent-step-context-write-service";
import { AgentStepSessionCommandService } from "../../services/runtime/agent-step-session-command-service";
import { makeAgentStepRuntimeTestContext } from "./agent-step-runtime-test-support";

describe("AgentStep write exposure", () => {
  it("uses satisfied requirements only, not presentation order, to expose writes", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    await Effect.runPromise(
      Effect.gen(function* () {
        const session = yield* AgentStepSessionCommandService;
        yield* session.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    const firstWrite = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepContextWriteService;
        return yield* service.writeContextValue({
          stepExecutionId: "step-exec-1",
          writeItemId: "write-summary",
          valueJson: "summary available",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(firstWrite.newlyExposedWriteItems.map((item) => item.writeItemId)).toEqual([
      "write-artifact",
    ]);

    const secondWrite = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepContextWriteService;
        return yield* service.writeContextValue({
          stepExecutionId: "step-exec-1",
          writeItemId: "write-review-notes",
          valueJson: "notes available",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(secondWrite.newlyExposedWriteItems).toEqual([]);
    expect(ctx.appliedWrites.map((row) => row.writeItemId)).toEqual([
      "write-summary",
      "write-review-notes",
    ]);
  });
});
