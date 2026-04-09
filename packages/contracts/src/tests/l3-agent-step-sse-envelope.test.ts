import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import { AGENT_STEP_SSE_EVENT_TYPES, AgentStepSseEnvelope } from "../sse";

describe("l3 agent-step SSE envelope", () => {
  it("locks the normalized SSE event taxonomy", () => {
    expect(AGENT_STEP_SSE_EVENT_TYPES).toEqual([
      "bootstrap",
      "session_state",
      "timeline",
      "tool_activity",
      "error",
      "done",
    ]);

    expect(AGENT_STEP_SSE_EVENT_TYPES).not.toContain("context_refresh");
    expect(AGENT_STEP_SSE_EVENT_TYPES).not.toContain("second_live_state");
  });

  it("decodes bootstrap envelopes with the single-stream contract", () => {
    const event = Schema.decodeUnknownSync(AgentStepSseEnvelope)({
      version: "v1",
      stream: "agent_step_session_events",
      eventType: "bootstrap",
      stepExecutionId: "step-exec-1",
      data: {
        state: "not_started",
        streamContract: {
          streamName: "agent_step_session_events",
          streamCount: 1,
          transport: "sse",
          source: "step_execution_scoped",
          purpose: "timeline_and_tool_activity",
        },
        timelineItems: [],
      },
    });

    expect(event.eventType).toBe("bootstrap");
    if (event.eventType !== "bootstrap") {
      throw new Error("expected bootstrap event");
    }

    expect(event.data.streamContract.streamCount).toBe(1);
  });

  it("decodes session, timeline, tool, error, and done events without inventing a second stream", () => {
    const decode = Schema.decodeUnknownSync(AgentStepSseEnvelope);

    const sessionStateEvent = decode({
      version: "v1",
      stream: "agent_step_session_events",
      eventType: "session_state",
      stepExecutionId: "step-exec-1",
      data: { state: "active_streaming" },
    });
    expect(sessionStateEvent.eventType).toBe("session_state");
    if (sessionStateEvent.eventType !== "session_state") {
      throw new Error("expected session_state event");
    }
    expect(sessionStateEvent.data.state).toBe("active_streaming");

    const timelineEvent = decode({
      version: "v1",
      stream: "agent_step_session_events",
      eventType: "timeline",
      stepExecutionId: "step-exec-1",
      data: {
        item: {
          itemType: "message",
          timelineItemId: "item-1",
          createdAt: "2026-04-09T00:00:00.000Z",
          role: "assistant",
          content: "Here is the draft.",
        },
      },
    });
    expect(timelineEvent.eventType).toBe("timeline");
    if (timelineEvent.eventType !== "timeline") {
      throw new Error("expected timeline event");
    }
    expect(timelineEvent.data.item.itemType).toBe("message");

    const toolEvent = decode({
      version: "v1",
      stream: "agent_step_session_events",
      eventType: "tool_activity",
      stepExecutionId: "step-exec-1",
      data: {
        item: {
          itemType: "tool_activity",
          timelineItemId: "item-2",
          createdAt: "2026-04-09T00:00:01.000Z",
          toolKind: "mcp",
          toolName: "write_context_value",
          status: "completed",
          summary: "Applied context write",
        },
      },
    });
    expect(toolEvent.eventType).toBe("tool_activity");
    if (toolEvent.eventType !== "tool_activity") {
      throw new Error("expected tool_activity event");
    }
    expect(toolEvent.data.item.toolKind).toBe("mcp");

    const errorEvent = decode({
      version: "v1",
      stream: "agent_step_session_events",
      eventType: "error",
      stepExecutionId: "step-exec-1",
      data: {
        error: {
          _tag: "HarnessExecutionError",
          operation: "stream_events",
          message: "stream dropped",
        },
      },
    });
    expect(errorEvent.eventType).toBe("error");
    if (errorEvent.eventType !== "error") {
      throw new Error("expected error event");
    }
    expect(errorEvent.data.error._tag).toBe("HarnessExecutionError");

    const doneEvent = decode({
      version: "v1",
      stream: "agent_step_session_events",
      eventType: "done",
      stepExecutionId: "step-exec-1",
      data: { finalState: "completed" },
    });
    expect(doneEvent.eventType).toBe("done");
    if (doneEvent.eventType !== "done") {
      throw new Error("expected done event");
    }
    expect(doneEvent.data.finalState).toBe("completed");
  });

  it("rejects speculative raw-opencode or second-stream events", () => {
    const decode = Schema.decodeUnknownSync(AgentStepSseEnvelope);

    expect(() =>
      decode({
        version: "v1",
        stream: "agent_step_read_panel_events",
        eventType: "context_refresh",
        stepExecutionId: "step-exec-1",
        data: {},
      }),
    ).toThrow();

    expect(() =>
      decode({
        version: "v1",
        stream: "agent_step_session_events",
        eventType: "session.created",
        stepExecutionId: "step-exec-1",
        data: {},
      }),
    ).toThrow();
  });
});
