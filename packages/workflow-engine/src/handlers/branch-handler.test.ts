import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { makeBranchHandler } from "./branch-handler";

describe("branch-handler", () => {
  it("selects matched branch next step", async () => {
    const handler = makeBranchHandler();

    const result = await Effect.runPromise(
      handler({
        executionId: "exec-1",
        step: {
          type: "branch",
          id: "branch-1",
          branches: [
            {
              when: { op: "equals", var: "complexity", value: "large" },
              next: { stepId: "enterprise" },
            },
          ],
          defaultNext: { stepId: "quick" },
        },
        variables: { complexity: "large" },
      }),
    );

    expect(result.nextStepId).toBe("enterprise");
  });

  it("falls back to defaultNext when no branch matches", async () => {
    const handler = makeBranchHandler();

    const result = await Effect.runPromise(
      handler({
        executionId: "exec-1",
        step: {
          type: "branch",
          id: "branch-1",
          branches: [
            {
              when: { op: "equals", var: "complexity", value: "large" },
              next: { stepId: "enterprise" },
            },
          ],
          defaultNext: { stepId: "quick" },
        },
        variables: { complexity: "small" },
      }),
    );

    expect(result.nextStepId).toBe("quick");
  });
});
