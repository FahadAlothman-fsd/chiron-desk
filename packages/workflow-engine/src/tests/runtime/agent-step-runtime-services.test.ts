import { Effect, Stream } from "effect";
import { describe, expect, it } from "vitest";

import { SingleLiveStreamContractError } from "@chiron/contracts";

import { AgentStepEventStreamService } from "../../services/runtime/agent-step-event-stream-service";
import { AgentStepExecutionDetailService } from "../../services/runtime/agent-step-execution-detail-service";
import { AgentStepSessionCommandService } from "../../services/runtime/agent-step-session-command-service";
import { AgentStepTimelineService } from "../../services/runtime/agent-step-timeline-service";
import { makeAgentStepRuntimeTestContext } from "./agent-step-runtime-test-support";

async function seedSavedSession(ctx: ReturnType<typeof makeAgentStepRuntimeTestContext>) {
  const started = await Effect.runPromise(
    ctx.harness.startSession({
      stepExecutionId: "step-exec-1",
      projectRootPath: "/tmp/chiron-test",
      agent: ctx.agentPayload.harnessSelection.agent,
      model: ctx.agentPayload.harnessSelection.model,
      objective: ctx.agentPayload.objective,
      instructionsMarkdown: ctx.agentPayload.instructionsMarkdown,
    }),
  );

  const now = new Date("2026-04-09T12:00:00.000Z");
  const existing = ctx.bindings[0];
  if (existing) {
    existing.bindingState = "bound";
    existing.sessionId = started.session.sessionId;
    existing.serverInstanceId = started.serverInstanceId ?? null;
    existing.serverBaseUrl = started.serverBaseUrl ?? null;
    existing.selectedAgentKey = started.session.agent ?? ctx.agentPayload.harnessSelection.agent;
    existing.selectedModelJson = started.session.model ?? ctx.agentPayload.harnessSelection.model;
    existing.updatedAt = now;
    return;
  }

  ctx.bindings.push({
    id: "binding-1",
    stepExecutionId: "step-exec-1",
    harnessId: "opencode",
    bindingState: "bound",
    sessionId: started.session.sessionId,
    serverInstanceId: started.serverInstanceId ?? null,
    serverBaseUrl: started.serverBaseUrl ?? null,
    selectedAgentKey: started.session.agent ?? ctx.agentPayload.harnessSelection.agent,
    selectedModelJson: started.session.model ?? ctx.agentPayload.harnessSelection.model,
    createdAt: now,
    updatedAt: now,
  });
}

describe("AgentStep runtime services", () => {
  it("builds full agent-step detail payload before and after session start", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    const beforeStart = await Effect.runPromise(
      Effect.gen(function* () {
        const detail = yield* AgentStepExecutionDetailService;
        return yield* detail.getAgentStepExecutionDetail({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(beforeStart?.body.state).toBe("not_started");
    expect(beforeStart?.body.composer.enabled).toBe(false);
    expect(beforeStart?.body.composer.startSessionVisible).toBe(true);
    expect(
      beforeStart?.body.readableContextFacts.map((fact) => fact.contextFactDefinitionId),
    ).toEqual(["ctx-project-context", "ctx-summary", "ctx-review-notes", "ctx-artifact"]);
    expect(beforeStart?.body.writeItems.map((item) => item.writeItemId)).toEqual([
      "write-review-notes",
      "write-artifact",
      "write-summary",
    ]);
    expect(beforeStart?.body.timelinePreview).toEqual([]);

    await seedSavedSession(ctx);

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSessionCommandService;
        return yield* service.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    const afterStart = await Effect.runPromise(
      Effect.gen(function* () {
        const detail = yield* AgentStepExecutionDetailService;
        return yield* detail.getAgentStepExecutionDetail({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(afterStart?.body.state).toBe("active_idle");
    expect(afterStart?.body.composer.enabled).toBe(true);
    expect(afterStart?.body.harnessBinding.bindingState).toBe("bound");
    expect(afterStart?.body.harnessBinding.serverInstanceId).toBe("fake-server:step-exec-1");
    expect(afterStart?.body.harnessBinding.serverBaseUrl).toBe(
      "http://fake-opencode.local/step-exec-1",
    );
    expect(afterStart?.body.timelinePreview[0]).toMatchObject({
      itemType: "message",
      role: "user",
    });
  });

  it("enforces runtime state transitions, idempotent start, and next-turn selection updates", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    await seedSavedSession(ctx);

    const startResult = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSessionCommandService;
        return yield* service.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(startResult).toMatchObject({
      stepExecutionId: "step-exec-1",
      state: "active_idle",
      bindingState: "bound",
    });

    const idempotentStart = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSessionCommandService;
        return yield* service.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );
    expect(idempotentStart.state).toBe("active_idle");
    expect(ctx.bindings).toHaveLength(1);
    expect(ctx.bindings[0]).toMatchObject({
      serverInstanceId: "fake-server:step-exec-1",
      serverBaseUrl: "http://fake-opencode.local/step-exec-1",
    });

    const sendResult = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSessionCommandService;
        return yield* service.sendAgentStepMessage({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          message: "please continue",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(sendResult).toEqual({
      stepExecutionId: "step-exec-1",
      accepted: true,
      state: "active_idle",
    });
    expect(ctx.states.at(-1)?.state).toBe("active_idle");

    const selectionResult = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSessionCommandService;
        return yield* service.updateAgentStepTurnSelection({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          model: { provider: "fake-provider", model: "other-model" },
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(selectionResult).toEqual({
      stepExecutionId: "step-exec-1",
      appliesTo: "next_turn_only",
      model: { provider: "fake-provider", model: "other-model" },
    });
    expect(ctx.bindings[0]?.selectedModelJson).toEqual({
      provider: "fake-provider",
      model: "other-model",
    });

    const agentSelectionResult = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSessionCommandService;
        return yield* service.updateAgentStepTurnSelection({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          agent: "explore",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(agentSelectionResult).toEqual({
      stepExecutionId: "step-exec-1",
      appliesTo: "next_turn_only",
      agent: "explore",
    });
    expect(ctx.bindings[0]?.selectedAgentKey).toBe("explore");

    const completeResult = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSessionCommandService;
        return yield* service.completeAgentStepExecution({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(completeResult).toEqual({
      stepExecutionId: "step-exec-1",
      state: "completed",
    });
    expect(ctx.steps[0]?.status).toBe("completed");
    expect(ctx.states.at(-1)?.state).toBe("completed");
  });

  it("recovers stale starting_session to active_idle when bound session is still live", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    await seedSavedSession(ctx);

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSessionCommandService;
        return yield* service.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    ctx.states[0] = {
      ...ctx.states[0],
      state: "starting_session",
      updatedAt: new Date("2026-04-09T12:01:00.000Z"),
    };

    const recovered = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSessionCommandService;
        return yield* service.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(recovered).toMatchObject({
      stepExecutionId: "step-exec-1",
      state: "active_idle",
      bindingState: "bound",
    });
    expect(ctx.states[0]?.state).toBe("active_idle");
  });

  it("loads timeline pages and enforces the single live stream rule", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    await seedSavedSession(ctx);

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSessionCommandService;
        yield* service.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
        yield* service.sendAgentStepMessage({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          message: "ship it",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    const page = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepTimelineService;
        return yield* service.getTimelinePage({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(page.items).toHaveLength(5);
    expect(page.items.map((item) => item.itemType)).toEqual([
      "message",
      "message",
      "tool_activity",
      "message",
      "tool_activity",
    ]);

    const events = await Effect.runPromise(
      Effect.gen(function* () {
        const streamService = yield* AgentStepEventStreamService;
        return yield* Stream.runCollect(
          streamService
            .streamSessionEvents({ projectId: "project-1", stepExecutionId: "step-exec-1" })
            .pipe(Stream.take(8)),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );
    expect(Array.from(events).map((event) => event.eventType)).toEqual([
      "bootstrap",
      "session_state",
      "timeline",
      "tool_activity",
      "timeline",
      "tool_activity",
      "session_state",
      "done",
    ]);

    const duplicateStream = await Effect.runPromise(
      Effect.gen(function* () {
        const streamService = yield* AgentStepEventStreamService;
        const first = streamService.streamSessionEvents({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
        const second = streamService.streamSessionEvents({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });

        yield* Stream.runDrain(first.pipe(Stream.take(100))).pipe(Effect.fork);
        yield* Effect.sleep(10);
        const secondResult = yield* Effect.either(Stream.runDrain(second.pipe(Stream.take(1))));
        return secondResult;
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(duplicateStream._tag).toBe("Left");
    if (duplicateStream._tag !== "Left") {
      throw new Error("expected duplicate stream to fail");
    }
    expect(duplicateStream.left).toBeInstanceOf(SingleLiveStreamContractError);
  });

  it("preserves session id when timeline read marks stale binding as errored", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    await seedSavedSession(ctx);

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSessionCommandService;
        return yield* service.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    const staleSessionId = "stale-session-id";
    if (!ctx.bindings[0]) {
      throw new Error("expected binding row to exist");
    }
    ctx.bindings[0].sessionId = staleSessionId;

    await Effect.runPromise(
      Effect.gen(function* () {
        const timeline = yield* AgentStepTimelineService;
        return yield* timeline.getTimelinePage({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(ctx.bindings[0]).toMatchObject({
      bindingState: "errored",
      sessionId: staleSessionId,
      serverInstanceId: null,
      serverBaseUrl: null,
    });
    expect(ctx.states.at(-1)?.state).toBe("disconnected_or_error");
  });

  it("reuses preserved session id on retry after errored binding", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    await seedSavedSession(ctx);

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSessionCommandService;
        return yield* service.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    if (!ctx.bindings[0]) {
      throw new Error("expected binding row to exist");
    }
    const originalSessionId = ctx.bindings[0].sessionId;
    ctx.bindings[0].bindingState = "errored";
    ctx.bindings[0].serverInstanceId = null;
    ctx.bindings[0].serverBaseUrl = null;

    if (!ctx.states[0]) {
      throw new Error("expected runtime state row to exist");
    }
    ctx.states[0].state = "disconnected_or_error";

    const retried = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSessionCommandService;
        return yield* service.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(retried).toMatchObject({
      stepExecutionId: "step-exec-1",
      state: "active_idle",
      bindingState: "bound",
    });
    expect(ctx.bindings[0]?.sessionId).toBe(originalSessionId);
  });
});
