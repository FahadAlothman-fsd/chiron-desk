import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { McpToolValidationError, McpWriteRequirementError } from "@chiron/contracts";

import { AgentStepMcpService } from "../../services/runtime/agent-step-mcp-service";
import { AgentStepSessionCommandService } from "../../services/runtime/agent-step-session-command-service";
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

const runMcp = async (
  ctx: ReturnType<typeof makeAgentStepRuntimeTestContext>,
  request: Parameters<AgentStepMcpService["Type"]["execute"]>[0],
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* AgentStepMcpService;
      return yield* service.execute(request);
    }).pipe(Effect.provide(ctx.runtimeLayer)),
  );

const startSession = async (ctx: ReturnType<typeof makeAgentStepRuntimeTestContext>) => {
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
};

describe("AgentStep MCP v2 services", () => {
  it("reads the step snapshot, schema, and instances through the v2 surface", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    const snapshot = await runMcp(ctx, {
      version: "v2",
      toolName: "read_step_execution_snapshot",
      input: withHiddenStepExecutionId({}),
    });

    expect(snapshot.response.toolName).toBe("read_step_execution_snapshot");
    if (snapshot.response.toolName !== "read_step_execution_snapshot") {
      throw new Error("expected read_step_execution_snapshot response");
    }
    expect(snapshot.response.output.readSet[0]?.factKey).toBe("project-context");
    expect(snapshot.response.output.writeSet.map((item) => item.factKey)).toEqual([
      "review-notes",
      "artifact",
      "summary",
    ]);

    const schema = await runMcp(ctx, {
      version: "v2",
      toolName: "read_context_fact_schema",
      input: withHiddenStepExecutionId({ factKey: "summary" }),
    });

    expect(schema.response.toolName).toBe("read_context_fact_schema");
    if (schema.response.toolName !== "read_context_fact_schema") {
      throw new Error("expected read_context_fact_schema response");
    }
    expect(schema.response.output.actions).toEqual(["create", "update", "remove"]);

    const instances = await runMcp(ctx, {
      version: "v2",
      toolName: "read_context_fact_instances",
      input: withHiddenStepExecutionId({ factKey: "project-context" }),
    });

    expect(instances.response.toolName).toBe("read_context_fact_instances");
    if (instances.response.toolName !== "read_context_fact_instances") {
      throw new Error("expected read_context_fact_instances response");
    }
    expect(instances.response.output.instances).toHaveLength(1);
    expect(instances.response.output.instances[0]?.value).toEqual({ problem: "Need a plan" });
  });

  it("denormalizes draft-spec instance reads back to keyed authored values", async () => {
    const workflowEditorContextFacts = [
      {
        kind: "plain_value_fact" as const,
        contextFactDefinitionId: "ctx-project-context",
        key: "project-context",
        label: "Project Context",
        cardinality: "one" as const,
        valueType: "json" as const,
      },
      {
        kind: "plain_value_fact" as const,
        contextFactDefinitionId: "ctx-summary",
        key: "summary",
        label: "Summary",
        cardinality: "one" as const,
        valueType: "string" as const,
      },
      {
        kind: "plain_value_fact" as const,
        contextFactDefinitionId: "ctx-review-notes",
        key: "review-notes",
        label: "Review Notes",
        cardinality: "one" as const,
        valueType: "string" as const,
      },
      {
        kind: "artifact_slot_reference_fact" as const,
        contextFactDefinitionId: "ctx-artifact",
        key: "artifact",
        label: "Artifact",
        cardinality: "one" as const,
        slotDefinitionId: "slot-1",
      },
      {
        kind: "work_unit_draft_spec_fact" as const,
        contextFactDefinitionId: "ctx-draft",
        key: "draft-spec",
        label: "Draft Spec",
        cardinality: "one" as const,
        workUnitDefinitionId: "wu-type-1",
        selectedWorkUnitFactDefinitionIds: ["wu-fact-title"],
        selectedArtifactSlotDefinitionIds: ["slot-1"],
      },
    ];

    const ctx = makeAgentStepRuntimeTestContext({
      workflowEditorContextFacts,
      lifecycleFactSchemas: [
        {
          id: "wu-fact-title",
          methodologyVersionId: "version-1",
          workUnitTypeId: "wu-type-1",
          name: "Draft Title",
          key: "draft_title",
          factType: "string",
          cardinality: "one",
          validationJson: null,
          description: null,
          createdAt: new Date("2026-04-09T12:00:00.000Z"),
          updatedAt: new Date("2026-04-09T12:00:00.000Z"),
        },
      ],
      initialContextFacts: [
        {
          id: "fact-draft-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-draft",
          instanceOrder: 0,
          valueJson: {
            workUnitDefinitionId: "wu-type-1",
            factValues: [
              {
                workUnitFactDefinitionId: "wu-fact-title",
                value: "Draft title",
              },
            ],
            artifactValues: [
              {
                slotDefinitionId: "slot-1",
                relativePath: "stories/draft.md",
                clear: false,
              },
            ],
          },
          sourceStepExecutionId: "step-exec-1",
          createdAt: new Date("2026-04-09T12:00:03.000Z"),
          updatedAt: new Date("2026-04-09T12:00:03.000Z"),
        },
      ],
    });

    ctx.agentPayload.explicitReadGrants.push({ contextFactDefinitionId: "ctx-draft" });

    const instances = await runMcp(ctx, {
      version: "v2",
      toolName: "read_context_fact_instances",
      input: withHiddenStepExecutionId({ factKey: "draft-spec" }),
    });

    expect(instances.response.toolName).toBe("read_context_fact_instances");
    if (instances.response.toolName !== "read_context_fact_instances") {
      throw new Error("expected read_context_fact_instances response");
    }
    expect(instances.response.output.instances).toHaveLength(1);
    expect(instances.response.output.instances[0]?.value).toEqual({
      factValues: { draft_title: "Draft title" },
      artifactValues: { ARTIFACT: ["stories/draft.md"] },
    });
  });

  it("enforces active-session gating and requirement gating for v2 writes", async () => {
    const ctx = makeAgentStepRuntimeTestContext();

    await seedSavedSession(ctx);

    const inactiveWrite = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        return yield* Effect.either(
          service.execute({
            version: "v2",
            toolName: "create_context_fact_instance",
            input: withHiddenStepExecutionId({
              factKey: "review-notes",
              value: "needs more references",
            }),
          }),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(inactiveWrite._tag).toBe("Left");

    await startSession(ctx);

    const blockedWrite = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        return yield* Effect.either(
          service.execute({
            version: "v2",
            toolName: "create_context_fact_instance",
            input: withHiddenStepExecutionId({
              factKey: "artifact",
              value: { files: ["docs/setup.md"] },
            }),
          }),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(blockedWrite._tag).toBe("Left");
    if (blockedWrite._tag !== "Left") {
      throw new Error("expected blocked write to fail");
    }
    expect(blockedWrite.left).toBeInstanceOf(McpWriteRequirementError);

    const created = await runMcp(ctx, {
      version: "v2",
      toolName: "create_context_fact_instance",
      input: withHiddenStepExecutionId({ factKey: "summary", value: "Approved summary" }),
    });

    expect(created.response.toolName).toBe("create_context_fact_instance");
    if (created.response.toolName !== "create_context_fact_instance") {
      throw new Error("expected create_context_fact_instance response");
    }
    expect(created.response.output.value).toBe("Approved summary");
    expect(created.newlyExposedWriteItems.map((item) => item.writeItemId)).toEqual([
      "write-artifact",
    ]);
    expect(
      ctx.contextFacts.find((fact) => fact.contextFactDefinitionId === "ctx-summary")?.valueJson,
    ).toBe("Approved summary");
    expect(ctx.appliedWrites).toContainEqual(
      expect.objectContaining({
        stepExecutionId: "step-exec-1",
        writeItemId: "write-summary",
        contextFactDefinitionId: "ctx-summary",
        contextFactKind: "plain_value_fact",
        instanceOrder: 0,
        appliedValueJson: "Approved summary",
      }),
    );
  });

  it("updates artifact facts with committed files on the v2 surface", async () => {
    const ctx = makeAgentStepRuntimeTestContext();
    await startSession(ctx);

    await runMcp(ctx, {
      version: "v2",
      toolName: "create_context_fact_instance",
      input: withHiddenStepExecutionId({ factKey: "summary", value: "Approved summary" }),
    });

    const createdArtifact = await runMcp(ctx, {
      version: "v2",
      toolName: "create_context_fact_instance",
      input: withHiddenStepExecutionId({
        factKey: "artifact",
        value: { files: ["docs/setup.md"] },
      }),
    });

    expect(createdArtifact.response.toolName).toBe("create_context_fact_instance");
    if (createdArtifact.response.toolName !== "create_context_fact_instance") {
      throw new Error("expected create_context_fact_instance response");
    }
    expect(createdArtifact.response.output.value).toEqual({
      files: [{ filePath: "docs/setup.md", gitCommitHash: "commit-123" }],
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
    expect(ctx.appliedWrites).toContainEqual(
      expect.objectContaining({
        stepExecutionId: "step-exec-1",
        writeItemId: "write-artifact",
        contextFactDefinitionId: "ctx-artifact",
        contextFactKind: "artifact_slot_reference_fact",
        instanceOrder: 0,
        appliedValueJson: {
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
        },
      }),
    );
  });

  it("distinguishes artifact remove for context-local files from artifact delete for external-slot files", async () => {
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
            slotDefinitionId: "slot-1",
            files: [
              {
                filePath: "docs/external.md",
                status: "present",
                gitCommitHash: "commit-old",
                gitBlobHash: "blob-old",
                gitCommitSubject: "subject-old",
                gitCommitBody: "body-old",
              },
              {
                filePath: "docs/local.md",
                status: "present",
                gitCommitHash: "commit-local",
                gitBlobHash: "blob-local",
                gitCommitSubject: "subject-local",
                gitCommitBody: "body-local",
              },
            ],
          },
          sourceStepExecutionId: "step-exec-1",
          createdAt: new Date("2026-04-09T12:00:02.000Z"),
          updatedAt: new Date("2026-04-09T12:00:02.000Z"),
        },
      ],
      currentArtifactState: {
        exists: true,
        snapshot: {
          id: "artifact-instance-1",
          projectWorkUnitId: "pwu-1",
          slotDefinitionId: "slot-1",
          recordedByTransitionExecutionId: null,
          recordedByWorkflowExecutionId: "wfexec-1",
          recordedByUserId: null,
          supersededByProjectArtifactSnapshotId: null,
          createdAt: new Date("2026-04-09T12:00:00.000Z"),
        },
        members: [
          {
            id: "member-1",
            artifactSnapshotId: "artifact-instance-1",
            filePath: "docs/external.md",
            memberStatus: "present",
            gitCommitHash: "commit-old",
            gitBlobHash: "blob-old",
            gitCommitTitle: "subject-old",
            gitCommitBody: "body-old",
          },
        ],
      },
    });
    await startSession(ctx);

    const invalidRemove = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        return yield* Effect.either(
          service.execute({
            version: "v2",
            toolName: "remove_context_fact_instance",
            input: withHiddenStepExecutionId({
              factKey: "artifact",
              instanceId: "fact-artifact-1",
              value: { files: ["docs/external.md"] },
            }),
          }),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(invalidRemove._tag).toBe("Left");
    if (invalidRemove._tag !== "Left") {
      throw new Error("expected invalid remove to fail");
    }
    expect(invalidRemove.left).toBeInstanceOf(McpToolValidationError);

    const removed = await runMcp(ctx, {
      version: "v2",
      toolName: "remove_context_fact_instance",
      input: withHiddenStepExecutionId({
        factKey: "artifact",
        instanceId: "fact-artifact-1",
        value: { files: ["docs/local.md"] },
      }),
    });

    expect(removed.response.toolName).toBe("remove_context_fact_instance");
    if (removed.response.toolName !== "remove_context_fact_instance") {
      throw new Error("expected remove_context_fact_instance response");
    }
    expect(removed.response.output.value).toEqual({
      artifactInstanceId: "artifact-instance-1",
      files: [{ filePath: "docs/external.md", gitCommitHash: "commit-old" }],
    });
    expect(ctx.appliedWrites).toContainEqual(
      expect.objectContaining({
        writeItemId: "write-artifact",
        contextFactDefinitionId: "ctx-artifact",
        contextFactKind: "artifact_slot_reference_fact",
        instanceOrder: 0,
        appliedValueJson: {
          operation: "remove",
          instanceId: "fact-artifact-1",
          previousValue: {
            slotDefinitionId: "slot-1",
            files: [
              {
                filePath: "docs/external.md",
                status: "present",
                gitCommitHash: "commit-old",
                gitBlobHash: "blob-old",
                gitCommitSubject: "subject-old",
                gitCommitBody: "body-old",
              },
              {
                filePath: "docs/local.md",
                status: "present",
                gitCommitHash: "commit-local",
                gitBlobHash: "blob-local",
                gitCommitSubject: "subject-local",
                gitCommitBody: "body-local",
              },
            ],
          },
          nextValue: {
            slotDefinitionId: "slot-1",
            files: [
              {
                filePath: "docs/external.md",
                status: "present",
                gitCommitHash: "commit-old",
                gitBlobHash: "blob-old",
                gitCommitSubject: "subject-old",
                gitCommitBody: "body-old",
              },
            ],
          },
        },
      }),
    );
    const updatedInstanceId = removed.response.output.instanceId;

    const invalidDelete = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        return yield* Effect.either(
          service.execute({
            version: "v2",
            toolName: "delete_context_fact_instance",
            input: withHiddenStepExecutionId({
              factKey: "artifact",
              instanceId: updatedInstanceId,
              value: { files: ["docs/local.md"] },
            }),
          }),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(invalidDelete._tag).toBe("Left");
    if (invalidDelete._tag !== "Left") {
      throw new Error("expected invalid delete to fail");
    }
    expect(invalidDelete.left).toBeInstanceOf(McpToolValidationError);

    const deleted = await runMcp(ctx, {
      version: "v2",
      toolName: "delete_context_fact_instance",
      input: withHiddenStepExecutionId({
        factKey: "artifact",
        instanceId: updatedInstanceId,
        value: { files: ["docs/external.md"] },
      }),
    });

    expect(deleted.response.toolName).toBe("delete_context_fact_instance");
    if (deleted.response.toolName !== "delete_context_fact_instance") {
      throw new Error("expected delete_context_fact_instance response");
    }
    expect(deleted.response.output.value).toEqual({
      artifactInstanceId: "artifact-instance-1",
      files: [{ filePath: "docs/external.md", gitCommitHash: "commit-123", deleted: true }],
    });
    expect(ctx.appliedWrites).toContainEqual(
      expect.objectContaining({
        writeItemId: "write-artifact",
        contextFactDefinitionId: "ctx-artifact",
        contextFactKind: "artifact_slot_reference_fact",
        instanceOrder: 0,
        appliedValueJson: {
          operation: "delete",
          instanceId: updatedInstanceId,
          previousValue: {
            slotDefinitionId: "slot-1",
            files: [
              {
                filePath: "docs/external.md",
                status: "present",
                gitCommitHash: "commit-old",
                gitBlobHash: "blob-old",
                gitCommitSubject: "subject-old",
                gitCommitBody: "body-old",
              },
            ],
          },
          nextValue: {
            slotDefinitionId: "slot-1",
            files: [
              {
                filePath: "docs/external.md",
                status: "deleted",
                gitCommitHash: "commit-123",
                gitBlobHash: "blob-123",
                gitCommitSubject: "seed",
                gitCommitBody: "seed body",
              },
            ],
          },
        },
      }),
    );
  });

  it("records an explicit applied-write audit row when remove deletes the final plain fact instance", async () => {
    const ctx = makeAgentStepRuntimeTestContext();
    await startSession(ctx);

    const created = await runMcp(ctx, {
      version: "v2",
      toolName: "create_context_fact_instance",
      input: withHiddenStepExecutionId({
        factKey: "review-notes",
        value: "needs more references",
      }),
    });

    if (created.response.toolName !== "create_context_fact_instance") {
      throw new Error("expected create_context_fact_instance response");
    }

    const removed = await runMcp(ctx, {
      version: "v2",
      toolName: "remove_context_fact_instance",
      input: withHiddenStepExecutionId({
        factKey: "review-notes",
        instanceId: created.response.output.instanceId,
      }),
    });

    expect(removed.response.toolName).toBe("remove_context_fact_instance");
    expect(
      ctx.contextFacts.filter((fact) => fact.contextFactDefinitionId === "ctx-review-notes"),
    ).toHaveLength(0);
    expect(ctx.appliedWrites).toContainEqual(
      expect.objectContaining({
        writeItemId: "write-review-notes",
        contextFactDefinitionId: "ctx-review-notes",
        contextFactKind: "plain_value_fact",
        instanceOrder: 0,
        appliedValueJson: {
          operation: "remove",
          instanceId: created.response.output.instanceId,
          previousValue: "needs more references",
          nextValue: null,
        },
      }),
    );
  });

  it("rejects artifact writes that provide object file entries instead of file path strings", async () => {
    const ctx = makeAgentStepRuntimeTestContext();
    await startSession(ctx);

    await runMcp(ctx, {
      version: "v2",
      toolName: "create_context_fact_instance",
      input: withHiddenStepExecutionId({ factKey: "summary", value: "Approved summary" }),
    });

    const invalidArtifactCreate = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepMcpService;
        return yield* Effect.either(
          service.execute({
            version: "v2",
            toolName: "create_context_fact_instance",
            input: withHiddenStepExecutionId({
              factKey: "artifact",
              value: { files: [{ path: "docs/setup.md", content: "nope" }] },
            }),
          }),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(invalidArtifactCreate._tag).toBe("Left");
    if (invalidArtifactCreate._tag !== "Left") {
      throw new Error("expected invalid artifact create to fail");
    }
    expect(invalidArtifactCreate.left).toBeInstanceOf(McpToolValidationError);
    expect(invalidArtifactCreate.left.message).toContain("value.files");
  });
});
