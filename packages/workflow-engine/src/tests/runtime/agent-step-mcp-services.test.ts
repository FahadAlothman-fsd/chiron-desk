import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { McpToolValidationError, McpWriteRequirementError } from "@chiron/contracts";

import { AgentStepMcpService } from "../../services/runtime/agent-step-mcp-service";
import { AgentStepSessionCommandService } from "../../services/runtime/agent-step-session-command-service";
import { AgentStepSnapshotService } from "../../services/runtime/agent-step-snapshot-service";
import { makeAgentStepRuntimeTestContext } from "./agent-step-runtime-test-support";

describe("AgentStep MCP services", () => {
  it("implements read_step_snapshot and read_context_value v1 semantics", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    const snapshot = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSnapshotService;
        return yield* service.readStepSnapshot({ stepExecutionId: "step-exec-1" });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(snapshot).toEqual({
      stepExecutionId: "step-exec-1",
      workflowExecutionId: "wfexec-1",
      state: "not_started",
      objective: ctx.agentPayload.objective,
      instructionsMarkdown: ctx.agentPayload.instructionsMarkdown,
      contractVersion: "v1",
    });

    const mcpRead = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        return yield* service.execute({
          version: "v1",
          toolName: "read_context_value",
          input: {
            stepExecutionId: "step-exec-1",
            contextFactDefinitionId: "ctx-project-context",
          },
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(mcpRead.response).toMatchObject({
      version: "v1",
      toolName: "read_context_value",
      output: {
        stepExecutionId: "step-exec-1",
        contextFactDefinitionId: "ctx-project-context",
        contextFactKind: "plain_value_fact",
      },
    });
    if (mcpRead.response.toolName !== "read_context_value") {
      throw new Error("expected read_context_value response");
    }
    expect(mcpRead.response.output.values).toHaveLength(1);
    expect(mcpRead.newlyExposedWriteItems).toEqual([]);
  });

  it("applies valid writes, returns newly exposed write items, and does not persist invalid writes", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        yield* service.execute({
          version: "v1",
          toolName: "write_context_value",
          input: {
            stepExecutionId: "step-exec-1",
            writeItemId: "write-review-notes",
            valueJson: "needs more references",
          },
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    ).catch(() => undefined);

    expect(ctx.appliedWrites).toHaveLength(0);

    await Effect.runPromise(
      Effect.gen(function* () {
        const session = yield* AgentStepSessionCommandService;
        yield* session.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    const writeResult = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        return yield* service.execute({
          version: "v1",
          toolName: "write_context_value",
          input: {
            stepExecutionId: "step-exec-1",
            writeItemId: "write-summary",
            valueJson: "Approved summary",
          },
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(writeResult.response.toolName).toBe("write_context_value");
    if (writeResult.response.toolName !== "write_context_value") {
      throw new Error("expected write_context_value response");
    }
    expect(writeResult.response.output.status).toBe("applied");
    expect(writeResult.response.output.appliedWrite.valueJson).toBe("Approved summary");
    expect(writeResult.newlyExposedWriteItems.map((item) => item.writeItemId)).toEqual([
      "write-artifact",
    ]);
    expect(ctx.appliedWrites).toHaveLength(1);
    expect(ctx.contextFacts.some((fact) => fact.contextFactDefinitionId === "ctx-summary")).toBe(
      true,
    );

    const invalidWrite = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        return yield* Effect.either(
          service.execute({
            version: "v1",
            toolName: "write_context_value",
            input: {
              stepExecutionId: "step-exec-1",
              writeItemId: "write-summary",
              valueJson: "",
            },
          }),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(invalidWrite._tag).toBe("Left");
    if (invalidWrite._tag !== "Left") {
      throw new Error("expected invalid write to fail");
    }
    expect(invalidWrite.left).toBeInstanceOf(McpToolValidationError);
    expect(ctx.appliedWrites).toHaveLength(1);
  });

  it("rejects blocked writes until requirements are satisfied", async () => {
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

    const blocked = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        return yield* Effect.either(
          service.execute({
            version: "v1",
            toolName: "write_context_value",
            input: {
              stepExecutionId: "step-exec-1",
              writeItemId: "write-artifact",
              valueJson: { relativePath: "docs/setup.md" },
            },
          }),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(blocked._tag).toBe("Left");
    if (blocked._tag !== "Left") {
      throw new Error("expected blocked write to fail");
    }
    expect(blocked.left).toBeInstanceOf(McpWriteRequirementError);
    expect(ctx.appliedWrites).toHaveLength(0);
  });
});
