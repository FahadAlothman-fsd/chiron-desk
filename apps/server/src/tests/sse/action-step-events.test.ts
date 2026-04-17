import { Layer, Stream } from "effect";
import { describe, expect, it } from "vitest";

import { ActionStepEventStreamService } from "@chiron/workflow-engine";

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

describe("action-step SSE route", () => {
  it("streams ordered action-only operational events", async () => {
    process.env.DATABASE_URL ??= "file:/tmp/chiron-action-step-events-test.sqlite";
    process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret";
    process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
    process.env.CORS_ORIGIN ??= "http://localhost:3001";

    const actionEventStreamService: ActionStepEventStreamService["Type"] = {
      streamExecutionEvents: ({ stepExecutionId }) =>
        Stream.fromIterable([
          {
            version: "v1" as const,
            stream: "action_step_execution_events" as const,
            eventType: "bootstrap" as const,
            stepExecutionId,
            data: {
              stepStatus: "active" as const,
              completionSummary: {
                mode: "manual" as const,
                eligible: false,
                requiresAtLeastOneSucceededAction: true,
                blockedByRunningActions: true,
                reasonIfIneligible:
                  "Action step requires at least one succeeded action before completion.",
              },
              actions: [{ actionId: "action-1", status: "running" as const }],
              items: [],
            },
          },
          {
            version: "v1" as const,
            stream: "action_step_execution_events" as const,
            eventType: "action-item-status-changed" as const,
            stepExecutionId,
            data: {
              actionId: "action-1",
              itemId: "item-1",
              status: "succeeded" as const,
              resultSummaryJson: { status: "succeeded" },
              affectedTargets: [],
            },
          },
          {
            version: "v1" as const,
            stream: "action_step_execution_events" as const,
            eventType: "action-status-changed" as const,
            stepExecutionId,
            data: {
              actionId: "action-1",
              status: "succeeded" as const,
              resultSummaryJson: { status: "succeeded" },
            },
          },
          {
            version: "v1" as const,
            stream: "action_step_execution_events" as const,
            eventType: "step-completion-eligibility-changed" as const,
            stepExecutionId,
            data: {
              mode: "manual" as const,
              eligible: true,
              requiresAtLeastOneSucceededAction: true,
              blockedByRunningActions: true,
            },
          },
          {
            version: "v1" as const,
            stream: "action_step_execution_events" as const,
            eventType: "done" as const,
            stepExecutionId,
            data: {
              finalStepStatus: "completed" as const,
            },
          },
        ]),
    };

    const { createServerApp } = await import("../../index");

    const app = createServerApp({
      runtimeStepServiceLayer: Layer.succeed(
        ActionStepEventStreamService,
        actionEventStreamService,
      ),
    });

    const response = await app.request(
      "/sse/action-step-events?projectId=project-1&stepExecutionId=step-exec-1",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const body = await response.text();
    const events = parseSsePayload(body);

    expect(events.map((event) => event.event)).toEqual([
      "bootstrap",
      "action-item-status-changed",
      "action-status-changed",
      "step-completion-eligibility-changed",
      "done",
    ]);
    expect(events.every((event) => event.data?.stream === "action_step_execution_events")).toBe(
      true,
    );
  });

  it("rejects missing query params", async () => {
    process.env.DATABASE_URL ??= "file:/tmp/chiron-action-step-events-test.sqlite";
    process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret";
    process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
    process.env.CORS_ORIGIN ??= "http://localhost:3001";

    const { createServerApp } = await import("../../index");

    const app = createServerApp({
      runtimeStepServiceLayer: Layer.succeed(ActionStepEventStreamService, {
        streamExecutionEvents: () => Stream.empty,
      }),
    });

    const response = await app.request("/sse/action-step-events?projectId=project-1");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Missing required query params: projectId and stepExecutionId",
    });
  });
});
