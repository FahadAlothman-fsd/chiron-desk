import { call } from "@orpc/server";
import { Effect, Layer, Stream } from "effect";
import { describe, expect, it } from "vitest";

import {
  AgentStepEventStreamService,
  AgentStepExecutionDetailService,
  AgentStepSessionCommandService,
  AgentStepTimelineService,
} from "@chiron/workflow-engine";

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

const collect = async <T>(iterable: AsyncIterable<T>): Promise<T[]> => {
  const values: T[] = [];
  for await (const value of iterable) {
    values.push(value);
  }
  return values;
};

function makeAgentStepLayer() {
  const calls = {
    detail: 0,
    timeline: 0,
    start: 0,
    send: 0,
    update: 0,
    complete: 0,
    stream: 0,
  };

  const detailService: AgentStepExecutionDetailService["Type"] = {
    getAgentStepExecutionDetail: ({ stepExecutionId }) => {
      calls.detail += 1;
      if (stepExecutionId === "missing-step") {
        return Effect.succeed(null);
      }

      return Effect.succeed({
        stepExecutionId,
        workflowExecutionId: "workflow-exec-1",
        body: {
          stepType: "agent",
          state: "active_idle",
          contractBoundary: {
            version: "v2",
            supportedMcpTools: [
              "read_step_execution_snapshot",
              "read_context_fact_schema",
              "read_context_fact_instances",
              "read_attachable_targets",
              "create_context_fact_instance",
              "update_context_fact_instance",
              "remove_context_fact_instance",
              "delete_context_fact_instance",
            ],
            stepSnapshotReadItemId: "read_step_execution_snapshot",
            requestContextAccess: false,
            continuationMode: "bootstrap_only",
            nativeMessageLog: false,
            persistedWritePolicy: "applied_only",
            streamContract: {
              streamName: "agent_step_session_events",
              streamCount: 1,
              transport: "sse",
              source: "step_execution_scoped",
              purpose: "timeline_and_tool_activity",
            },
          },
          sessionStartPolicy: "explicit",
          harnessBinding: {
            harnessId: "opencode",
            bindingState: "bound",
            sessionId: "opencode-session-1",
            selectedModel: {
              provider: "anthropic",
              model: "claude-sonnet-4",
            },
          },
          composer: {
            enabled: true,
            startSessionVisible: false,
          },
          objective: "Draft a handoff",
          instructionsMarkdown: "Use the runtime boundary.",
          readableContextFacts: [],
          writeItems: [],
          timelinePreview: [],
        },
      });
    },
  };

  const timelineService: AgentStepTimelineService["Type"] = {
    getTimelinePage: ({ stepExecutionId, cursor, limit }) => {
      calls.timeline += 1;
      const items = [
        {
          itemType: "message" as const,
          timelineItemId: "msg-1",
          createdAt: new Date(0).toISOString(),
          role: "assistant" as const,
          content: "Draft ready.",
        },
        {
          itemType: "tool_activity" as const,
          timelineItemId: "tool-1",
          createdAt: new Date(0).toISOString(),
          toolKind: "mcp" as const,
          toolName: "create_context_fact_instance",
          status: "completed" as const,
          summary: "Applied context write.",
        },
      ].slice(0, limit ?? 2);

      return Effect.succeed({
        stepExecutionId,
        cursor: cursor ?? { after: "tool-1" },
        items,
      });
    },
  };

  const sessionService: AgentStepSessionCommandService["Type"] = {
    startAgentStepSession: ({ stepExecutionId }) => {
      calls.start += 1;
      return Effect.succeed({
        stepExecutionId,
        state: "active_idle",
        bindingState: "bound",
      });
    },
    sendAgentStepMessage: ({ stepExecutionId }) => {
      calls.send += 1;
      return Effect.succeed({
        stepExecutionId,
        accepted: true,
        state: "active_streaming",
      });
    },
    updateAgentStepTurnSelection: ({ stepExecutionId, model }) => {
      calls.update += 1;
      return Effect.succeed({
        stepExecutionId,
        appliesTo: "next_turn_only",
        model,
      });
    },
    completeAgentStepExecution: ({ stepExecutionId }) => {
      calls.complete += 1;
      return Effect.succeed({
        stepExecutionId,
        state: "completed",
      });
    },
  };

  const eventStreamService: AgentStepEventStreamService["Type"] = {
    streamSessionEvents: ({ stepExecutionId }) => {
      calls.stream += 1;
      return Stream.fromIterable([
        {
          version: "v1" as const,
          stream: "agent_step_session_events" as const,
          eventType: "bootstrap" as const,
          stepExecutionId,
          data: {
            state: "active_idle" as const,
            streamContract: {
              streamName: "agent_step_session_events" as const,
              streamCount: 1 as const,
              transport: "sse" as const,
              source: "step_execution_scoped" as const,
              purpose: "timeline_and_tool_activity" as const,
            },
            timelineItems: [],
          },
        },
        {
          version: "v1" as const,
          stream: "agent_step_session_events" as const,
          eventType: "timeline" as const,
          stepExecutionId,
          data: {
            item: {
              itemType: "message" as const,
              timelineItemId: "msg-1",
              createdAt: new Date(0).toISOString(),
              role: "assistant" as const,
              content: "Draft ready.",
            },
          },
        },
        {
          version: "v1" as const,
          stream: "agent_step_session_events" as const,
          eventType: "done" as const,
          stepExecutionId,
          data: {
            finalState: "active_idle" as const,
          },
        },
      ]);
    },
  };

  return {
    calls,
    layer: Layer.mergeAll(
      Layer.succeed(AgentStepExecutionDetailService, detailService),
      Layer.succeed(AgentStepTimelineService, timelineService),
      Layer.succeed(AgentStepSessionCommandService, sessionService),
      Layer.succeed(AgentStepEventStreamService, eventStreamService),
    ),
  };
}

describe("project runtime agent-step router", () => {
  it("delegates detail and timeline queries and maps missing detail to not found", async () => {
    const testLayer = makeAgentStepLayer();
    const router = createProjectRuntimeRouter(testLayer.layer);

    const detail = await call(
      router.getAgentStepExecutionDetail,
      { projectId: "project-1", stepExecutionId: "agent-step-1" },
      PUBLIC_CTX,
    );
    const timeline = await call(
      router.getAgentStepTimelinePage,
      {
        projectId: "project-1",
        stepExecutionId: "agent-step-1",
        cursor: { before: "cursor-1" },
        limit: 1,
      },
      PUBLIC_CTX,
    );

    expect(testLayer.calls.detail).toBe(1);
    expect(testLayer.calls.timeline).toBe(1);
    expect(detail.stepExecutionId).toBe("agent-step-1");
    expect(detail.workflowExecutionId).toBe("workflow-exec-1");
    expect(timeline.cursor.before).toBe("cursor-1");
    expect(timeline.items).toHaveLength(1);

    await expect(
      call(
        router.getAgentStepExecutionDetail,
        { projectId: "project-1", stepExecutionId: "missing-step" },
        PUBLIC_CTX,
      ),
    ).rejects.toThrow(/Agent step execution not found: missing-step/);
    expect(testLayer.calls.detail).toBe(2);
  });

  it("streams delegated agent-step session events", async () => {
    const testLayer = makeAgentStepLayer();
    const router = createProjectRuntimeRouter(testLayer.layer);

    const stream = await call(
      router.streamAgentStepSessionEvents,
      { projectId: "project-1", stepExecutionId: "agent-step-1" },
      PUBLIC_CTX,
    );
    const events = await collect(stream);

    expect(testLayer.calls.stream).toBe(1);
    expect(events.map((event) => event.eventType)).toEqual(["bootstrap", "timeline", "done"]);
    expect(events.every((event) => event.stream === "agent_step_session_events")).toBe(true);
  });

  it("requires auth for mutations and delegates start, send, and complete commands", async () => {
    const testLayer = makeAgentStepLayer();
    const router = createProjectRuntimeRouter(testLayer.layer);

    await expect(
      call(
        router.startAgentStepSession,
        { projectId: "project-1", stepExecutionId: "agent-step-1" },
        PUBLIC_CTX,
      ),
    ).rejects.toThrow();
    expect(testLayer.calls.start).toBe(0);

    const started = await call(
      router.startAgentStepSession,
      { projectId: "project-1", stepExecutionId: "agent-step-1" },
      AUTHENTICATED_CTX,
    );
    const sent = await call(
      router.sendAgentStepMessage,
      {
        projectId: "project-1",
        stepExecutionId: "agent-step-1",
        message: "Continue the handoff.",
      },
      AUTHENTICATED_CTX,
    );
    const completed = await call(
      router.completeAgentStepExecution,
      { projectId: "project-1", stepExecutionId: "agent-step-1" },
      AUTHENTICATED_CTX,
    );

    expect(testLayer.calls.start).toBe(1);
    expect(testLayer.calls.send).toBe(1);
    expect(testLayer.calls.complete).toBe(1);
    expect(started.bindingState).toBe("bound");
    expect(sent.accepted).toBe(true);
    expect(completed.state).toBe("completed");
  });
});
