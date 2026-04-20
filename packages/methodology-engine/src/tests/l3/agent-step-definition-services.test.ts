import type { AgentStepDesignTimePayload } from "@chiron/contracts/agent-step";
import { describe, expect, it } from "vitest";
import { Context, Effect, Layer } from "effect";

import { MethodologyRepository } from "../../repository";
import {
  AgentStepDefinitionService,
  AgentStepDefinitionServiceLive,
  normalizeWriteItemOrders,
} from "../../services/agent-step-definition-service";
import {
  AgentStepEditorDefinitionService,
  AgentStepEditorDefinitionServiceLive,
  deriveAgentStepReadModePreview,
  deriveInferredReadableContextFacts,
} from "../../services/agent-step-editor-definition-service";
import { WorkflowEditorDefinitionServiceLive } from "../../services/workflow-editor-definition-service";

const versionRow = {
  id: "ver-1",
  methodologyId: "meth-1",
  version: "v1",
  status: "draft",
  displayName: "Draft",
  definitionExtensions: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  retiredAt: null,
};

const contextFacts = [
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
    kind: "artifact_slot_reference_fact",
    key: "prd_artifact",
    label: "PRD Artifact",
    cardinality: "one",
    slotDefinitionId: "ART.PRD",
  },
  {
    contextFactDefinitionId: "fact-external",
    kind: "bound_fact",
    key: "project_context",
    label: "Project Context",
    cardinality: "one",
    factDefinitionId: "FACT.PROJECT_CONTEXT",
    valueType: "string",
  },
  {
    contextFactDefinitionId: "fact-draft-spec",
    kind: "work_unit_draft_spec_fact",
    key: "story_spec",
    label: "Story Spec",
    cardinality: "one",
    workUnitDefinitionId: "WU.STORY",
    selectedWorkUnitFactDefinitionIds: ["fact-summary"],
    selectedArtifactSlotDefinitionIds: ["ART.PRD"],
  },
] as const;

const basePayload: AgentStepDesignTimePayload = {
  key: "draft-prd",
  label: "Draft PRD",
  objective: "Draft the PRD from available context.",
  instructionsMarkdown: "Ground the output in approved context facts.",
  harnessSelection: { harness: "opencode" },
  explicitReadGrants: [{ contextFactDefinitionId: "fact-summary" }],
  writeItems: [
    {
      writeItemId: "write-artifact",
      contextFactDefinitionId: "fact-artifact",
      contextFactKind: "artifact_slot_reference_fact",
      order: 20,
      requirementContextFactDefinitionIds: ["fact-summary", "fact-summary"],
    },
    {
      writeItemId: "write-draft-spec",
      contextFactDefinitionId: "fact-draft-spec",
      contextFactKind: "work_unit_draft_spec_fact",
      order: 10,
      requirementContextFactDefinitionIds: [],
    },
  ],
  completionRequirements: [{ contextFactDefinitionId: "fact-artifact" }],
  runtimePolicy: {
    sessionStart: "explicit",
    continuationMode: "bootstrap_only",
    liveStreamCount: 1,
    bootstrapPromptNoReply: true,
    nativeMessageLog: false,
    persistedWritePolicy: "applied_only",
  },
};

function makeRepo(options?: { readonly includeSingularAgentGetter?: boolean }) {
  const includeSingularAgentGetter = options?.includeSingularAgentGetter ?? true;
  const agentSteps = new Map<string, { stepId: string; payload: AgentStepDesignTimePayload }>([
    ["step-agent", { stepId: "step-agent", payload: basePayload }],
  ]);
  const agentStepOrder = ["step-agent"];
  const recordedOperations: Array<string> = [];

  const syncSteps = () =>
    agentStepOrder.map((stepId) => ({
      stepId,
      stepType: "agent" as const,
      mode: "deferred" as const,
      defaultMessage: "Deferred until runtime adapter lands",
    }));

  const repo = {
    findVersionById: () => Effect.succeed(versionRow),
    recordEvent: (event: { changedFieldsJson: { operation: string } }) =>
      Effect.sync(() => {
        recordedOperations.push(event.changedFieldsJson.operation);
        return {
          id: crypto.randomUUID(),
          methodologyVersionId: "ver-1",
          eventType: "workflows_updated",
          actorId: "tester",
          changedFieldsJson: event.changedFieldsJson,
          diagnosticsJson: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        };
      }),
    listWorkflowContextFactsByDefinitionId: () => Effect.succeed([...contextFacts]),
    getWorkflowEditorDefinition: () =>
      Effect.succeed({
        workflow: {
          workflowDefinitionId: "wf-1",
          key: "wu.story.draft",
          displayName: "Draft Story",
          descriptionJson: { markdown: "Story drafting workflow" },
        },
        steps: syncSteps(),
        edges: [],
        contextFacts: [...contextFacts],
        formDefinitions: [],
      }),
    listAgentStepDefinitions: () =>
      Effect.sync(() =>
        agentStepOrder
          .map((stepId) => agentSteps.get(stepId))
          .filter((step): step is { stepId: string; payload: AgentStepDesignTimePayload } =>
            Boolean(step),
          ),
      ),
    createAgentStepDefinition: (input: {
      afterStepKey: string | null;
      payload: AgentStepDesignTimePayload;
    }) =>
      Effect.sync(() => {
        const stepId = `step-agent-${agentSteps.size + 1}`;
        const created = { stepId, payload: input.payload };
        agentSteps.set(stepId, created);
        if (input.afterStepKey) {
          const index = agentStepOrder.indexOf(input.afterStepKey);
          agentStepOrder.splice(index + 1, 0, stepId);
        } else {
          agentStepOrder.unshift(stepId);
        }
        return created;
      }),
    updateAgentStepDefinition: (input: { stepId: string; payload: AgentStepDesignTimePayload }) =>
      Effect.sync(() => {
        const updated = { stepId: input.stepId, payload: input.payload };
        agentSteps.set(input.stepId, updated);
        return updated;
      }),
    deleteAgentStepDefinition: (input: { stepId: string }) =>
      Effect.sync(() => {
        agentSteps.delete(input.stepId);
        const index = agentStepOrder.indexOf(input.stepId);
        if (index >= 0) {
          agentStepOrder.splice(index, 1);
        }
      }),
  } as Context.Tag.Service<typeof MethodologyRepository> & {
    readonly getAgentStepDefinition?: (params: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
      readonly stepId: string;
    }) => Effect.Effect<{ stepId: string; payload: AgentStepDesignTimePayload }, never>;
    readonly createAgentStepDefinition: (params: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
      readonly afterStepKey: string | null;
      readonly payload: AgentStepDesignTimePayload;
    }) => Effect.Effect<{ stepId: string; payload: AgentStepDesignTimePayload }, never>;
    readonly updateAgentStepDefinition: (params: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
      readonly stepId: string;
      readonly payload: AgentStepDesignTimePayload;
    }) => Effect.Effect<{ stepId: string; payload: AgentStepDesignTimePayload }, never>;
    readonly deleteAgentStepDefinition: (params: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
      readonly stepId: string;
    }) => Effect.Effect<void, never>;
  };

  if (includeSingularAgentGetter) {
    repo.getAgentStepDefinition = (input: { stepId: string }) =>
      Effect.sync(() => {
        const step = agentSteps.get(input.stepId);
        if (!step) {
          throw new Error(`Missing agent step ${input.stepId}`);
        }

        return step;
      });
  }

  return { repo, recordedOperations, agentSteps };
}

function makeLayer(options?: { readonly includeSingularAgentGetter?: boolean }) {
  const { repo, recordedOperations, agentSteps } = makeRepo(options);
  const repoLayer = Layer.succeed(MethodologyRepository, repo);
  const layer = Layer.mergeAll(
    Layer.provide(WorkflowEditorDefinitionServiceLive, repoLayer),
    Layer.provide(AgentStepDefinitionServiceLive, repoLayer),
    Layer.provide(
      AgentStepEditorDefinitionServiceLive,
      Layer.mergeAll(repoLayer, Layer.provide(WorkflowEditorDefinitionServiceLive, repoLayer)),
    ),
  );

  return { layer, recordedOperations, agentSteps };
}

describe("agent-step definition services", () => {
  it("exports deterministic helper derivations", () => {
    expect(normalizeWriteItemOrders(basePayload.writeItems)).toEqual([
      {
        writeItemId: "write-draft-spec",
        contextFactDefinitionId: "fact-draft-spec",
        contextFactKind: "work_unit_draft_spec_fact",
        order: 100,
        requirementContextFactDefinitionIds: [],
      },
      {
        writeItemId: "write-artifact",
        contextFactDefinitionId: "fact-artifact",
        contextFactKind: "artifact_slot_reference_fact",
        order: 200,
        requirementContextFactDefinitionIds: ["fact-summary"],
      },
    ]);

    expect(deriveAgentStepReadModePreview("artifact_slot_reference_fact", "explicit")).toBe(
      "artifact_snapshot_read",
    );
    expect(deriveAgentStepReadModePreview("work_unit_draft_spec_fact", "inferred_from_write")).toBe(
      "draft_spec_write_target",
    );

    expect(deriveInferredReadableContextFacts(basePayload, contextFacts)).toEqual([
      {
        contextFactDefinitionId: "fact-artifact",
        key: "prd_artifact",
        label: "PRD Artifact",
        contextFactKind: "artifact_slot_reference_fact",
        source: "inferred_from_write",
        readModePreview: "artifact_snapshot_write_target",
      },
      {
        contextFactDefinitionId: "fact-draft-spec",
        key: "story_spec",
        label: "Story Spec",
        contextFactKind: "work_unit_draft_spec_fact",
        source: "inferred_from_write",
        readModePreview: "draft_spec_write_target",
      },
    ]);
  });

  it("returns the locked editor model with inferred reads and write previews", async () => {
    const { layer } = makeLayer();
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepEditorDefinitionService;
        return yield* service.getAgentStepDefinition({
          methodologyId: "meth-1",
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
          stepId: "step-agent",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result.step).toMatchObject({
      stepId: "step-agent",
      stepType: "agent",
      mode: "deferred",
    });
    expect(result.payload.writeItems.map((item) => item.order)).toEqual([100, 200]);
    expect(result.readableContextFactPreviews).toEqual([
      {
        contextFactDefinitionId: "fact-summary",
        key: "summary",
        label: "Summary",
        contextFactKind: "plain_value_fact",
        source: "explicit",
        readModePreview: "value_read",
      },
      {
        contextFactDefinitionId: "fact-draft-spec",
        key: "story_spec",
        label: "Story Spec",
        contextFactKind: "work_unit_draft_spec_fact",
        source: "inferred_from_write",
        readModePreview: "draft_spec_write_target",
      },
      {
        contextFactDefinitionId: "fact-artifact",
        key: "prd_artifact",
        label: "PRD Artifact",
        contextFactKind: "artifact_slot_reference_fact",
        source: "inferred_from_write",
        readModePreview: "artifact_snapshot_write_target",
      },
    ]);
    expect(result.writeItemPreviews).toEqual([
      {
        writeItemId: "write-draft-spec",
        contextFactDefinitionId: "fact-draft-spec",
        contextFactKey: "story_spec",
        contextFactKind: "work_unit_draft_spec_fact",
        label: undefined,
        order: 100,
        requirementContextFactDefinitionIds: [],
        requirementLabels: [],
        exposureModePreview: "requirements_only",
      },
      {
        writeItemId: "write-artifact",
        contextFactDefinitionId: "fact-artifact",
        contextFactKey: "prd_artifact",
        contextFactKind: "artifact_slot_reference_fact",
        label: undefined,
        order: 200,
        requirementContextFactDefinitionIds: ["fact-summary"],
        requirementLabels: ["Summary"],
        exposureModePreview: "requirements_only",
      },
    ]);
  });

  it("falls back to listAgentStepDefinitions when singular getter is unavailable", async () => {
    const { layer } = makeLayer({ includeSingularAgentGetter: false });
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepEditorDefinitionService;
        return yield* service.getAgentStepDefinition({
          methodologyId: "meth-1",
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
          stepId: "step-agent",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result.step.stepId).toBe("step-agent");
    expect(result.payload.key).toBe("draft-prd");
  });

  it("validates invariants and records create/update/delete mutations", async () => {
    const { layer, recordedOperations, agentSteps } = makeLayer();
    const program = Effect.gen(function* () {
      const service = yield* AgentStepDefinitionService;

      const invalid = yield* Effect.either(
        service.createAgentStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            afterStepKey: null,
            payload: {
              ...basePayload,
              writeItems: [
                ...basePayload.writeItems,
                {
                  writeItemId: "write-artifact-duplicate",
                  contextFactDefinitionId: "fact-artifact",
                  contextFactKind: "artifact_slot_reference_fact",
                  order: 30,
                  requirementContextFactDefinitionIds: [],
                },
              ],
            },
          },
          "tester",
        ),
      );

      const created = yield* service.createAgentStep(
        {
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
          afterStepKey: "step-agent",
          payload: {
            ...basePayload,
            key: "refine-prd",
            completionRequirements: [{ contextFactDefinitionId: "fact-draft-spec" }],
            writeItems: [
              {
                writeItemId: "write-draft-spec-only",
                contextFactDefinitionId: "fact-draft-spec",
                contextFactKind: "work_unit_draft_spec_fact",
                order: 999,
                requirementContextFactDefinitionIds: ["fact-summary"],
              },
            ],
          },
        },
        "tester",
      );

      const updated = yield* service.updateAgentStep(
        {
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
          stepId: created.stepId,
          payload: {
            ...created.payload,
            label: "Refine PRD",
            writeItems: [
              {
                ...created.payload.writeItems[0]!,
                order: 5,
                requirementContextFactDefinitionIds: ["fact-summary", "fact-external"],
              },
            ],
          },
        },
        "tester",
      );

      yield* service.deleteAgentStep(
        {
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
          stepId: created.stepId,
        },
        "tester",
      );

      return { invalid, created, updated };
    }).pipe(Effect.provide(layer));

    const result = await Effect.runPromise(program);

    expect(result.invalid._tag).toBe("Left");
    expect(result.created.payload.writeItems[0]?.order).toBe(100);
    expect(result.updated.payload.writeItems[0]?.requirementContextFactDefinitionIds).toEqual([
      "fact-summary",
      "fact-external",
    ]);
    expect(agentSteps.has(result.created.stepId)).toBe(false);
    expect(recordedOperations).toEqual([
      "create_agent_step",
      "update_agent_step",
      "delete_agent_step",
    ]);
  });
});
