import { call } from "@orpc/server";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MethodologyRepository } from "@chiron/methodology-engine";
import { WorkflowEditorDefinitionServiceLive } from "@chiron/methodology-engine";
import { HarnessService } from "../../../../agent-runtime/src/index";

import { createMethodologyRouter } from "../../routers/methodology";

vi.mock("@opencode-ai/sdk", () => ({
  createOpencode: vi.fn(async () => ({
    client: {
      app: {
        agents: async () => [
          { name: "explore", description: "Explore", mode: "subagent" },
          { name: "build", description: "Build", mode: "primary" },
        ],
      },
      config: {
        providers: async () => ({
          providers: [
            {
              id: "anthropic",
              name: "Anthropic",
              models: {
                "claude-sonnet-4": {
                  id: "claude-sonnet-4",
                  name: "Claude Sonnet 4",
                  capabilities: {
                    reasoning: true,
                    toolcall: true,
                    attachment: true,
                  },
                },
              },
            },
          ],
          default: { anthropic: "claude-sonnet-4" },
        }),
      },
    },
    server: {
      close: async () => undefined,
    },
  })),
}));

const AUTHENTICATED_CTX = {
  context: {
    session: {
      session: {
        id: "session-1",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        userId: "user-1",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        token: "token",
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: "user-1",
        email: "tester@example.com",
        emailVerified: true,
        name: "Tester",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        image: null,
      },
    },
  },
};

const PUBLIC_CTX = { context: { session: null } };

const basePayload = {
  key: "draft-prd",
  label: "Draft PRD",
  descriptionJson: { markdown: "Draft the PRD artifact." },
  objective: "Draft the PRD",
  instructionsMarkdown: "Use approved facts only.",
  harnessSelection: {
    harness: "opencode",
    agent: "explore",
    model: { provider: "anthropic", model: "claude-sonnet-4" },
  },
  explicitReadGrants: [{ contextFactDefinitionId: "fact-summary" }],
  writeItems: [
    {
      writeItemId: "write-artifact",
      contextFactDefinitionId: "fact-artifact",
      contextFactKind: "artifact_reference_fact",
      order: 100,
      requirementContextFactDefinitionIds: ["fact-summary"],
    },
  ],
  completionRequirements: [{ contextFactDefinitionId: "fact-artifact" }],
  runtimePolicy: {
    sessionStart: "explicit",
    continuationMode: "bootstrap_only",
    liveStreamCount: 1,
    nativeMessageLog: false,
    persistedWritePolicy: "applied_only",
  },
  guidance: {
    human: { markdown: "Review before starting." },
    agent: { markdown: "Stay within scope." },
  },
} as const;

function makeServiceLayer() {
  const createdPayloads: Array<unknown> = [];
  const updatedPayloads: Array<unknown> = [];
  const deletedStepIds: Array<string> = [];

  const repo = {
    getWorkflowEditorDefinition: () =>
      Effect.succeed({
        workflow: {
          workflowDefinitionId: "wf-1",
          key: "wu.story.draft",
          displayName: "Draft Story",
          descriptionJson: { markdown: "Story drafting workflow" },
        },
        steps: [
          {
            stepId: "step-agent-1",
            stepType: "agent",
            mode: "deferred",
            defaultMessage: "Deferred agent shell",
          },
        ],
        edges: [],
        contextFacts: [
          {
            contextFactDefinitionId: "fact-summary",
            kind: "plain_value_fact",
            key: "summary",
            label: "Summary",
            cardinality: "one",
            valueType: "string",
          },
          {
            contextFactDefinitionId: "fact-artifact",
            kind: "artifact_reference_fact",
            key: "prd_artifact",
            label: "PRD Artifact",
            cardinality: "one",
            artifactSlotDefinitionId: "ART.PRD",
          },
        ],
        formDefinitions: [],
      }),
    getAgentStepDefinition: () =>
      Effect.succeed({
        stepId: "step-agent-1",
        payload: basePayload,
      }),
    findVersionById: () =>
      Effect.succeed({
        id: "ver-1",
        status: "draft",
      }),
    listWorkflowContextFactsByDefinitionId: () =>
      Effect.succeed([
        {
          contextFactDefinitionId: "fact-summary",
          kind: "plain_value_fact",
          key: "summary",
          label: "Summary",
          cardinality: "one",
          valueType: "string",
        },
        {
          contextFactDefinitionId: "fact-artifact",
          kind: "artifact_reference_fact",
          key: "prd_artifact",
          label: "PRD Artifact",
          cardinality: "one",
          artifactSlotDefinitionId: "ART.PRD",
        },
      ]),
    createAgentStepDefinition: (input: { payload: unknown }) =>
      Effect.sync(() => {
        createdPayloads.push(input.payload);
        return { stepId: "step-agent-2", payload: input.payload };
      }),
    updateAgentStepDefinition: (input: { payload: unknown }) =>
      Effect.sync(() => {
        updatedPayloads.push(input.payload);
        return { stepId: "step-agent-1", payload: input.payload };
      }),
    deleteAgentStepDefinition: (input: { stepId: string }) =>
      Effect.sync(() => {
        deletedStepIds.push(input.stepId);
      }),
    recordEvent: () =>
      Effect.succeed({
        id: crypto.randomUUID(),
        methodologyVersionId: "ver-1",
        eventType: "workflows_updated",
        actorId: "tester",
        changedFieldsJson: {},
        diagnosticsJson: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
  } as any;

  return {
    createdPayloads,
    updatedPayloads,
    deletedStepIds,
    layer: Layer.mergeAll(
      Layer.succeed(MethodologyRepository, repo),
      Layer.provide(
        WorkflowEditorDefinitionServiceLive,
        Layer.succeed(MethodologyRepository, repo),
      ),
      Layer.succeed(HarnessService, {
        discoverMetadata: () =>
          Effect.succeed({
            harness: "opencode" as const,
            discoveredAt: new Date().toISOString(),
            agents: [
              {
                key: "explore",
                label: "explore",
                mode: "subagent" as const,
                defaultModel: { provider: "anthropic", model: "claude-sonnet-4" },
              },
              { key: "build", label: "build", mode: "primary" as const },
            ],
            providers: [
              {
                provider: "anthropic",
                label: "Anthropic",
                defaultModel: "claude-sonnet-4",
                models: [
                  {
                    provider: "anthropic",
                    model: "claude-sonnet-4",
                    label: "Claude Sonnet 4",
                    isDefault: true,
                    supportsReasoning: true,
                    supportsTools: true,
                    supportsAttachments: true,
                  },
                ],
              },
            ],
            models: [
              {
                provider: "anthropic",
                model: "claude-sonnet-4",
                label: "Claude Sonnet 4",
                isDefault: true,
                supportsReasoning: true,
                supportsTools: true,
                supportsAttachments: true,
              },
            ],
          }),
      }),
    ),
  };
}

describe("l3 agent-step design-time router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wires and executes agent-step design-time procedures", async () => {
    const { layer, createdPayloads, updatedPayloads, deletedStepIds } = makeServiceLayer();
    const router = createMethodologyRouter(layer);

    expect(router.version.workUnit.workflow.getAgentStepDefinition).toBeDefined();
    expect(router.version.workUnit.workflow.discoverAgentStepHarnessMetadata).toBeDefined();
    expect(router.version.workUnit.workflow.createAgentStep).toBeDefined();
    expect(router.version.workUnit.workflow.updateAgentStep).toBeDefined();
    expect(router.version.workUnit.workflow.deleteAgentStep).toBeDefined();

    const definition = await call(
      router.version.workUnit.workflow.getAgentStepDefinition,
      {
        methodologyId: "meth-1",
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        stepId: "step-agent-1",
      },
      PUBLIC_CTX,
    );

    const harnessMetadata = await call(
      router.version.workUnit.workflow.discoverAgentStepHarnessMetadata,
      {},
      PUBLIC_CTX,
    );

    const created = await call(
      router.version.workUnit.workflow.createAgentStep,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        afterStepKey: null,
        payload: basePayload,
      },
      AUTHENTICATED_CTX,
    );

    await call(
      router.version.workUnit.workflow.updateAgentStep,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        stepId: "step-agent-1",
        payload: {
          ...basePayload,
          label: "Updated PRD",
        },
      },
      AUTHENTICATED_CTX,
    );

    await call(
      router.version.workUnit.workflow.deleteAgentStep,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        stepId: "step-agent-1",
      },
      AUTHENTICATED_CTX,
    );

    expect(definition.payload.key).toBe("draft-prd");
    expect(definition.writeItemPreviews).toEqual([
      expect.objectContaining({
        contextFactDefinitionId: "fact-artifact",
        requirementLabels: ["Summary"],
      }),
    ]);
    expect(harnessMetadata.providers[0]?.provider).toBe("anthropic");
    expect(harnessMetadata.models[0]?.model).toBe("claude-sonnet-4");
    expect(created.stepId).toBe("step-agent-2");
    expect(createdPayloads).toHaveLength(1);
    expect(updatedPayloads[0]).toMatchObject({ label: "Updated PRD" });
    expect(deletedStepIds).toEqual(["step-agent-1"]);
  });
});
