import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { McpToolValidationError, McpWriteRequirementError } from "@chiron/contracts";

import { AgentStepMcpService } from "../../services/runtime/agent-step-mcp-service";
import { AgentStepSessionCommandService } from "../../services/runtime/agent-step-session-command-service";
import { AgentStepSnapshotService } from "../../services/runtime/agent-step-snapshot-service";
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

const withHiddenStepExecutionId = <T extends object>(input: T) =>
  ({ ...input, stepExecutionId: "step-exec-1" }) as T & { stepExecutionId: string };

describe("AgentStep MCP services", () => {
  it("implements read_step_snapshot and read_context_value v1 semantics", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    const snapshot = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepSnapshotService;
        return yield* service.readStepSnapshot(
          withHiddenStepExecutionId({ readItemId: "step_snapshot" }) as any,
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(snapshot).toEqual({
      readItemId: "step_snapshot",
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
          input: withHiddenStepExecutionId({ readItemId: "project-context", mode: "all" }) as any,
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(mcpRead.response).toMatchObject({
      version: "v1",
      toolName: "read_context_value",
      output: {
        readItemId: "project-context",
        mode: "all",
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

    await seedSavedSession(ctx);

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        yield* service.execute({
          version: "v1",
          toolName: "write_context_value",
          input: withHiddenStepExecutionId({
            writeItemId: "write-review-notes",
            valueJson: "needs more references",
          }) as any,
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
          input: withHiddenStepExecutionId({
            writeItemId: "write-summary",
            valueJson: "Approved summary",
          }) as any,
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
            input: withHiddenStepExecutionId({
              writeItemId: "write-summary",
              valueJson: "",
            }) as any,
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

    await seedSavedSession(ctx);

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
            input: withHiddenStepExecutionId({
              writeItemId: "write-artifact",
              valueJson: { relativePath: "docs/setup.md" },
            }) as any,
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

  it("returns structured validation errors for invalid progressive-disclosure query params", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    const invalidRead = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        return yield* Effect.either(
          service.execute({
            version: "v1",
            toolName: "read_context_value",
            input: withHiddenStepExecutionId({
              readItemId: "project-context",
              mode: "query",
              queryParam: "limit=0",
            }) as any,
          }),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(invalidRead._tag).toBe("Left");
    if (invalidRead._tag !== "Left") {
      throw new Error("expected invalid read to fail");
    }

    expect(invalidRead.left).toBeInstanceOf(McpToolValidationError);
    expect(invalidRead.left.message).toContain("limit");
  });

  it("records committed git metadata for artifact reference writes", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    await seedSavedSession(ctx);

    await Effect.runPromise(
      Effect.gen(function* () {
        const session = yield* AgentStepSessionCommandService;
        yield* session.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        yield* service.execute({
          version: "v1",
          toolName: "write_context_value",
          input: withHiddenStepExecutionId({
            writeItemId: "write-summary",
            valueJson: "Approved summary",
          }) as any,
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    const artifactWrite = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        return yield* service.execute({
          version: "v1",
          toolName: "write_context_value",
          input: withHiddenStepExecutionId({
            writeItemId: "write-artifact",
            valueJson: { relativePath: "docs/setup.md" },
          }) as any,
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(artifactWrite.response.toolName).toBe("write_context_value");
    if (artifactWrite.response.toolName !== "write_context_value") {
      throw new Error("expected write_context_value response");
    }

    expect(artifactWrite.response.output.appliedWrite.valueJson).toEqual({
      slotDefinitionId: "slot-1",
      files: [
        {
          filePath: "docs/setup.md",
          status: "present",
          gitCommitHash: "commit-123",
          gitBlobHash: "blob-123",
          gitCommitSubject: "seed",
          gitCommitBody: "seed body",
        },
      ],
    });
    expect(
      ctx.contextFacts.find((fact) => fact.contextFactDefinitionId === "ctx-artifact")?.valueJson,
    ).toEqual({
      slotDefinitionId: "slot-1",
      files: [
        {
          filePath: "docs/setup.md",
          status: "present",
          gitCommitHash: "commit-123",
          gitBlobHash: "blob-123",
          gitCommitSubject: "seed",
          gitCommitBody: "seed body",
        },
      ],
    });
  });

  it("rejects artifact reference writes when the file is not committed", async () => {
    const ctx = makeAgentStepRuntimeTestContext({
      artifactReferenceResolutions: {
        "docs/setup.md": {
          status: "not_committed",
          relativePath: "docs/setup.md",
          tracked: true,
          untracked: false,
          staged: true,
          modified: false,
          deleted: false,
        },
      },
    });

    await seedSavedSession(ctx);

    await Effect.runPromise(
      Effect.gen(function* () {
        const session = yield* AgentStepSessionCommandService;
        yield* session.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        yield* service.execute({
          version: "v1",
          toolName: "write_context_value",
          input: withHiddenStepExecutionId({
            writeItemId: "write-summary",
            valueJson: "Approved summary",
          }) as any,
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        return yield* Effect.either(
          service.execute({
            version: "v1",
            toolName: "write_context_value",
            input: withHiddenStepExecutionId({
              writeItemId: "write-artifact",
              valueJson: { relativePath: "docs/setup.md" },
            }) as any,
          }),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(result._tag).toBe("Left");
    if (result._tag !== "Left") {
      throw new Error("expected artifact write to fail");
    }

    expect(result.left).toBeInstanceOf(McpToolValidationError);
    expect(result.left.message).toContain("not committed yet");
    expect(ctx.contextFacts.some((fact) => fact.contextFactDefinitionId === "ctx-artifact")).toBe(
      false,
    );
  });

  it("records deleted artifact updates distinctly when an existing artifact path is removed", async () => {
    const ctx = makeAgentStepRuntimeTestContext({
      initialContextFacts: [
        {
          id: "fact-summary-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-summary",
          instanceOrder: 0,
          valueJson: "Approved summary",
          sourceStepExecutionId: "step-exec-1",
          createdAt: new Date("2026-04-09T12:00:01.000Z"),
          updatedAt: new Date("2026-04-09T12:00:01.000Z"),
        },
        {
          id: "fact-artifact-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-artifact",
          instanceOrder: 0,
          valueJson: {
            relativePath: "docs/setup.md",
            gitCommitHash: "commit-old",
            gitBlobHash: "blob-old",
            gitCommitSubject: "subject-old",
            gitCommitBody: "body-old",
          },
          sourceStepExecutionId: "step-exec-1",
          createdAt: new Date("2026-04-09T12:00:02.000Z"),
          updatedAt: new Date("2026-04-09T12:00:02.000Z"),
        },
      ],
      artifactReferenceResolutions: {
        "docs/setup.md": {
          status: "not_committed",
          relativePath: "docs/setup.md",
          tracked: true,
          untracked: false,
          staged: false,
          modified: false,
          deleted: true,
        },
      },
    });

    await seedSavedSession(ctx);

    await Effect.runPromise(
      Effect.gen(function* () {
        const session = yield* AgentStepSessionCommandService;
        yield* session.startAgentStepSession({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    const artifactWrite = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        return yield* service.execute({
          version: "v1",
          toolName: "write_context_value",
          input: withHiddenStepExecutionId({
            writeItemId: "write-artifact",
            valueJson: { relativePath: "docs/setup.md", status: "deleted" },
          }) as any,
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(artifactWrite.response.toolName).toBe("write_context_value");
    if (artifactWrite.response.toolName !== "write_context_value") {
      throw new Error("expected write_context_value response");
    }

    expect(artifactWrite.response.output.appliedWrite.valueJson).toEqual({
      slotDefinitionId: "slot-1",
      files: [
        {
          filePath: "docs/setup.md",
          status: "deleted",
          gitCommitHash: "commit-old",
          gitBlobHash: "blob-old",
          gitCommitSubject: "subject-old",
          gitCommitBody: "body-old",
        },
      ],
    });
  });
});
