import { call } from "@orpc/server";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { AgentStepSessionCommandService } from "@chiron/workflow-engine";

import { createProjectRuntimeRouter } from "../../routers/project-runtime";

const AUTHENTICATED_CTX = {
  context: {
    session: {
      session: {
        id: "session-id",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        userId: "user-id",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        token: "token",
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: "user-id",
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        emailVerified: true,
        image: null,
      },
    },
  },
};

const PUBLIC_CTX = { context: { session: null } };

function makeRebindLayer() {
  const calls: Array<{ stepExecutionId: string; model: { provider: string; model: string } }> = [];

  const sessionService: AgentStepSessionCommandService["Type"] = {
    startAgentStepSession: ({ stepExecutionId }) =>
      Effect.succeed({
        stepExecutionId,
        state: "active_idle",
        bindingState: "bound",
      }),
    sendAgentStepMessage: ({ stepExecutionId }) =>
      Effect.succeed({
        stepExecutionId,
        accepted: true,
        state: "active_idle",
      }),
    updateAgentStepTurnSelection: ({ stepExecutionId, model }) => {
      calls.push({ stepExecutionId, model });
      return Effect.succeed({
        stepExecutionId,
        appliesTo: "next_turn_only",
        model,
      });
    },
    completeAgentStepExecution: ({ stepExecutionId }) =>
      Effect.succeed({
        stepExecutionId,
        state: "completed",
      }),
  };

  return {
    calls,
    layer: Layer.succeed(AgentStepSessionCommandService, sessionService),
  };
}

describe("project runtime agent-step turn-selection rebinding", () => {
  it("requires authentication for turn-selection updates", async () => {
    const testLayer = makeRebindLayer();
    const router = createProjectRuntimeRouter(testLayer.layer);

    await expect(
      call(
        router.updateAgentStepTurnSelection,
        {
          projectId: "project-1",
          stepExecutionId: "agent-step-1",
          model: { provider: "anthropic", model: "claude-sonnet-4" },
        },
        PUBLIC_CTX,
      ),
    ).rejects.toThrow();
    expect(testLayer.calls).toHaveLength(0);
  });

  it("delegates next-turn model rebinding exactly for the requested execution", async () => {
    const testLayer = makeRebindLayer();
    const router = createProjectRuntimeRouter(testLayer.layer);

    const first = await call(
      router.updateAgentStepTurnSelection,
      {
        projectId: "project-1",
        stepExecutionId: "agent-step-1",
        model: { provider: "anthropic", model: "claude-sonnet-4" },
      },
      AUTHENTICATED_CTX,
    );
    const second = await call(
      router.updateAgentStepTurnSelection,
      {
        projectId: "project-1",
        stepExecutionId: "agent-step-2",
        model: { provider: "openai", model: "gpt-5.4" },
      },
      AUTHENTICATED_CTX,
    );

    expect(testLayer.calls).toEqual([
      {
        stepExecutionId: "agent-step-1",
        model: { provider: "anthropic", model: "claude-sonnet-4" },
      },
      {
        stepExecutionId: "agent-step-2",
        model: { provider: "openai", model: "gpt-5.4" },
      },
    ]);
    expect(first.appliesTo).toBe("next_turn_only");
    expect(first.model).toEqual({ provider: "anthropic", model: "claude-sonnet-4" });
    expect(second.model).toEqual({ provider: "openai", model: "gpt-5.4" });
  });
});
