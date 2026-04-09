import { Effect, Stream } from "effect";
import { describe, expect, it } from "vitest";

import { HarnessExecutionError } from "@chiron/contracts/agent-step/errors";
import { makeFakeHarnessService } from "../../fake-harness-service";

describe("HarnessService contract", () => {
  it("freezes discovery metadata and starts an idempotent fake session", async () => {
    const harness = makeFakeHarnessService({
      now: () => "2026-04-09T12:00:00.000Z",
      idFactory: (() => {
        let counter = 0;
        return (prefix: string) => `${prefix}-${++counter}`;
      })(),
    });

    const metadata = await Effect.runPromise(harness.discoverMetadata());
    expect(metadata).toMatchObject({
      harness: "opencode",
      agents: [
        expect.objectContaining({
          key: "fake-agent",
          defaultModel: { provider: "fake-provider", model: "fake-model" },
        }),
      ],
      providers: [
        expect.objectContaining({
          provider: "fake-provider",
          defaultModel: "fake-model",
        }),
      ],
    });

    const firstStart = await Effect.runPromise(
      harness.startSession({
        stepExecutionId: "step-exec-1",
        agent: "fake-agent",
        model: { provider: "fake-provider", model: "fake-model" },
        objective: "Draft a setup handoff.",
        instructionsMarkdown: "Use the fake harness contract.",
      }),
    );
    const secondStart = await Effect.runPromise(
      harness.startSession({
        stepExecutionId: "step-exec-1",
        agent: "fake-agent",
        model: { provider: "fake-provider", model: "fake-model" },
        objective: "ignored",
        instructionsMarkdown: "ignored",
      }),
    );

    expect(firstStart.session).toEqual(secondStart.session);
    expect(firstStart.session.sessionId).toBe("session-1");
    expect(firstStart.session.state).toBe("active_idle");
    expect(firstStart.timeline).toEqual([
      {
        itemType: "message",
        timelineItemId: "timeline-2",
        createdAt: "2026-04-09T12:00:00.000Z",
        role: "system",
        content: "Draft a setup handoff.\n\nUse the fake harness contract.",
      },
    ]);
    expect(firstStart.cursor).toEqual({
      before: "timeline-2",
      after: "timeline-2",
    });
  });

  it("simulates send, timeline paging, and SSE event streaming", async () => {
    const harness = makeFakeHarnessService({
      now: (() => {
        const timestamps = [
          "2026-04-09T12:00:00.000Z",
          "2026-04-09T12:00:01.000Z",
          "2026-04-09T12:00:02.000Z",
        ];
        let index = 0;
        return () => timestamps[Math.min(index++, timestamps.length - 1)]!;
      })(),
      idFactory: (() => {
        let counter = 0;
        return (prefix: string) => `${prefix}-${++counter}`;
      })(),
      responseResolver: ({ turn, message }) => `Fake response ${turn}: ${message.toUpperCase()}`,
    });

    const started = await Effect.runPromise(
      harness.startSession({
        stepExecutionId: "step-exec-2",
        objective: "Implement runtime services.",
        instructionsMarkdown: "Stay inside the contract.",
      }),
    );

    const accepted = await Effect.runPromise(
      harness.sendMessage(started.session.sessionId, "please continue"),
    );
    expect(accepted).toEqual({
      sessionId: started.session.sessionId,
      stepExecutionId: "step-exec-2",
      accepted: true,
      state: "active_idle",
    });

    const streamEvents = Array.from(
      await Effect.runPromise(
        Stream.runCollect(
          harness.streamSessionEvents(started.session.sessionId).pipe(Stream.take(8)),
        ),
      ),
    );
    expect(streamEvents.map((event) => event.eventType)).toEqual([
      "bootstrap",
      "session_state",
      "timeline",
      "tool_activity",
      "timeline",
      "tool_activity",
      "session_state",
      "done",
    ]);
    expect(streamEvents[0]).toMatchObject({
      eventType: "bootstrap",
      stepExecutionId: "step-exec-2",
      data: {
        state: "active_idle",
        timelineItems: [
          expect.objectContaining({
            itemType: "message",
            role: "system",
          }),
        ],
      },
    });
    expect(streamEvents[2]).toMatchObject({
      eventType: "timeline",
      data: {
        item: expect.objectContaining({
          itemType: "message",
          role: "user",
          content: "please continue",
        }),
      },
    });
    expect(streamEvents[4]).toMatchObject({
      eventType: "timeline",
      data: {
        item: expect.objectContaining({
          itemType: "message",
          role: "assistant",
          content: "Fake response 1: PLEASE CONTINUE",
        }),
      },
    });

    const fullPage = await Effect.runPromise(harness.getTimelinePage(started.session.sessionId));
    expect(fullPage.items).toHaveLength(5);
    expect(fullPage.items.map((item) => item.itemType)).toEqual([
      "message",
      "message",
      "tool_activity",
      "message",
      "tool_activity",
    ]);

    const incrementalPage = await Effect.runPromise(
      harness.getTimelinePage(started.session.sessionId, {
        after: fullPage.items[1]?.timelineItemId,
      }),
    );
    expect(incrementalPage.items).toHaveLength(3);
    expect(incrementalPage.items[0]).toMatchObject({
      itemType: "tool_activity",
      toolKind: "harness",
      toolName: "send_message",
      status: "started",
    });
  });

  it("normalizes missing-session failures to HarnessExecutionError", async () => {
    const harness = makeFakeHarnessService();

    const result = await Effect.runPromise(
      Effect.either(harness.sendMessage("missing-session", "hello")),
    );

    expect(result._tag).toBe("Left");
    if (result._tag !== "Left") {
      throw new Error("expected missing fake session to return a typed Left");
    }

    expect(result.left).toBeInstanceOf(HarnessExecutionError);
    expect(result.left).toMatchObject({
      _tag: "HarnessExecutionError",
      operation: "send_message",
      message: "Harness session 'missing-session' was not found.",
    });
  });
});
