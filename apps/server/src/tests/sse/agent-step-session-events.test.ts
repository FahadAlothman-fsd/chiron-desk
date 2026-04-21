import { Layer, Stream } from "effect";
import { describe, expect, it } from "vitest";

import { AgentStepEventStreamService } from "@chiron/workflow-engine";

function parseSsePayload(body: string) {
  return body
    .trim()
    .split("\n\n")
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split("\n");
      const event = lines
        .find((line) => line.startsWith("event:"))
        ?.slice(6)
        .trim();
      const dataLine = lines.find((line) => line.startsWith("data:"));
      return {
        event,
        data: dataLine ? JSON.parse(dataLine.slice(5).trim()) : null,
      };
    });
}

describe("agent-step SSE route", () => {
  it("streams ordered agent session events", async () => {
    process.env.DATABASE_URL ??= "file:/tmp/chiron-agent-step-events-test.sqlite";
    process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret";
    process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
    process.env.CORS_ORIGIN ??= "http://localhost:3001";

    const agentEventStreamService: AgentStepEventStreamService["Type"] = {
      streamSessionEvents: ({ stepExecutionId }) =>
        Stream.fromIterable([
          {
            version: "v1" as const,
            stream: "agent_step_session_events" as const,
            eventType: "bootstrap" as const,
            stepExecutionId,
            data: {
              stepState: "active_idle" as const,
              binding: { bindingState: "bound" as const, sessionId: "session-1" },
            },
          },
          {
            version: "v1" as const,
            stream: "agent_step_session_events" as const,
            eventType: "session_state" as const,
            stepExecutionId,
            data: {
              state: "active_streaming" as const,
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
        ]),
    };

    const { createServerApp } = await import("../../index");

    const app = createServerApp({
      runtimeStepServiceLayer: Layer.succeed(AgentStepEventStreamService, agentEventStreamService),
    });

    const response = await app.request(
      "/sse/agent-step-session-events?projectId=project-1&stepExecutionId=agent-step-1",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const body = await response.text();
    const events = parseSsePayload(body);

    expect(events.map((event) => event.event)).toEqual(["bootstrap", "session_state", "done"]);
    expect(events.every((event) => event.data?.stream === "agent_step_session_events")).toBe(true);
  });
});
