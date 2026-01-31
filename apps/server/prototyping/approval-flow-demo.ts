import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { eventBusToAsyncGenerator } from "../../../packages/api/src/services/workflow-engine/effect/streaming-adapter";
import { effectWorkflowEventBus } from "../../../packages/api/src/services/workflow-engine/effect/event-bus";
import { toolApprovalGateway } from "../../../packages/api/src/services/workflow-engine/effect/tool-approval-gateway";

const executionId = randomUUID();
const stepId = "step-1";
const toolCallId = randomUUID();

const logStream = async () => {
  const generator = eventBusToAsyncGenerator(
    effectWorkflowEventBus,
    executionId,
    (event) => event.stepId === stepId,
  );

  for await (const event of generator) {
    console.log("STREAM EVENT:", event);
    if (event.type === "tool.result") {
      break;
    }
  }
};

const run = async () => {
  void logStream();

  await Effect.runPromise(
    effectWorkflowEventBus.publish({
      _tag: "ApprovalRequested",
      executionId,
      stepId,
      toolName: "update_description",
      toolType: "update-variable",
      toolCallId,
      args: { variableName: "project_description", value: "TaskFlow" },
      riskLevel: "safe",
    }),
  );

  const pending = Effect.runPromise(
    toolApprovalGateway.request({
      toolCallId,
      toolName: "update_description",
      executionId,
      stepId,
      args: { variableName: "project_description", value: "TaskFlow" },
      approvalMode: "ask",
    }),
  );

  await new Promise((resolve) => setTimeout(resolve, 200));

  await Effect.runPromise(
    toolApprovalGateway.resolve({
      toolCallId,
      toolName: "update_description",
      action: "approve",
    }),
  );

  await pending;

  await Effect.runPromise(
    effectWorkflowEventBus.publish({
      _tag: "ApprovalResolved",
      executionId,
      stepId,
      toolName: "update_description",
      toolType: "update-variable",
      toolCallId,
      action: "approve",
    }),
  );

  await Effect.runPromise(
    effectWorkflowEventBus.publish({
      _tag: "ToolCallStarted",
      executionId,
      stepId,
      toolName: "update_description",
      toolType: "update-variable",
      toolCallId,
      args: { variableName: "project_description", value: "TaskFlow" },
    }),
  );

  await Effect.runPromise(
    effectWorkflowEventBus.publish({
      _tag: "ToolCallCompleted",
      executionId,
      stepId,
      toolName: "update_description",
      toolType: "update-variable",
      toolCallId,
      result: { success: true },
    }),
  );
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
