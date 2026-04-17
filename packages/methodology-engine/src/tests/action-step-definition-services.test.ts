import type { ActionStepPayload } from "@chiron/contracts/methodology/workflow";
import { Either } from "effect";
import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { MethodologyRepository } from "../repository";
import {
  ActionStepDefinitionService,
  ActionStepDefinitionServiceLive,
} from "../services/action-step-definition-service";

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
    contextFactDefinitionId: "fact-external",
    kind: "definition_backed_external_fact",
    key: "project_context",
    label: "Project Context",
    cardinality: "one",
    externalFactDefinitionId: "EXT.PROJECT_CONTEXT",
    valueType: "json",
  },
  {
    contextFactDefinitionId: "fact-bound",
    kind: "bound_external_fact",
    key: "bound_status",
    label: "Bound Status",
    cardinality: "one",
    externalFactDefinitionId: "EXT.STATUS",
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
  {
    contextFactDefinitionId: "fact-plain",
    kind: "plain_value_fact",
    key: "plain_summary",
    label: "Summary",
    cardinality: "one",
    valueType: "string",
  },
] as const;

const basePayload: ActionStepPayload = {
  key: "sync-context",
  label: "Sync Context",
  descriptionJson: { markdown: "Propagate authored values outward." },
  guidance: {
    human: { markdown: "Review before saving." },
    agent: { markdown: "Preserve authored ids." },
  },
  executionMode: "sequential",
  actions: [
    {
      actionId: "action-1",
      actionKey: "propagate-project-context",
      label: "Propagate project context",
      enabled: true,
      sortOrder: 100,
      actionKind: "propagation",
      contextFactDefinitionId: "fact-external",
      contextFactKind: "definition_backed_external_fact",
      items: [
        { itemId: "item-1", itemKey: "project-name", label: "Project name", sortOrder: 100 },
        { itemId: "item-2", itemKey: "project-scope", label: "Project scope", sortOrder: 200 },
      ],
    },
    {
      actionId: "action-2",
      actionKey: "propagate-prd-artifact",
      label: "Propagate PRD artifact",
      enabled: false,
      sortOrder: 200,
      actionKind: "propagation",
      contextFactDefinitionId: "fact-artifact",
      contextFactKind: "artifact_reference_fact",
      items: [{ itemId: "item-3", itemKey: "prd-doc", label: "PRD", sortOrder: 100 }],
    },
  ],
};

function makeLayer(options?: { readonly versionStatus?: string }) {
  const actionSteps = new Map<string, { stepId: string; payload: ActionStepPayload }>([
    ["step-action-existing", { stepId: "step-action-existing", payload: basePayload }],
  ]);
  const recordedOperations: string[] = [];
  const createdPayloads: ActionStepPayload[] = [];
  const updatedPayloads: ActionStepPayload[] = [];
  const deletedStepIds: string[] = [];

  const repo = {
    findVersionById: () =>
      Effect.succeed({
        ...versionRow,
        status: options?.versionStatus ?? versionRow.status,
      }),
    listWorkflowContextFactsByDefinitionId: () => Effect.succeed([...contextFacts]),
    getWorkflowEditorDefinition: () =>
      Effect.succeed({
        workflow: {
          workflowDefinitionId: "wf-1",
          key: "workflow-1",
          displayName: "Workflow",
          descriptionJson: null,
        },
        steps: [
          { stepId: "step-form-1", stepType: "form", payload: { key: "capture", fields: [] } },
          {
            stepId: "step-action-existing",
            stepType: "action",
            stepKey: "sync-context",
            mode: "deferred",
            defaultMessage: "Deferred in slice-1",
          },
        ],
        edges: [],
        contextFacts: [...contextFacts],
        formDefinitions: [],
      }),
    createActionStepDefinition: (input: {
      readonly payload: ActionStepPayload;
      readonly afterStepKey: string | null;
    }) =>
      Effect.sync(() => {
        createdPayloads.push(input.payload);
        const created = { stepId: "step-action-created", payload: input.payload };
        actionSteps.set(created.stepId, created);
        return created;
      }),
    updateActionStepDefinition: (input: {
      readonly stepId: string;
      readonly payload: ActionStepPayload;
    }) =>
      Effect.sync(() => {
        updatedPayloads.push(input.payload);
        const updated = { stepId: input.stepId, payload: input.payload };
        actionSteps.set(updated.stepId, updated);
        return updated;
      }),
    deleteActionStepDefinition: (input: { readonly stepId: string }) =>
      Effect.sync(() => {
        deletedStepIds.push(input.stepId);
        actionSteps.delete(input.stepId);
      }),
    getActionStepDefinition: (input: { readonly stepId: string }) =>
      Effect.sync(() => actionSteps.get(input.stepId) ?? null),
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
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>;

  return {
    createdPayloads,
    updatedPayloads,
    deletedStepIds,
    recordedOperations,
    layer: Layer.provide(
      ActionStepDefinitionServiceLive,
      Layer.succeed(MethodologyRepository, repo),
    ),
  };
}

describe("action-step definition services", () => {
  it("creates, reads, updates, and deletes whole-step action definitions while preserving stable ids", async () => {
    const { layer, createdPayloads, updatedPayloads, deletedStepIds, recordedOperations } =
      makeLayer();

    const updatedPayload: ActionStepPayload = {
      ...basePayload,
      label: "Sync Context v2",
      executionMode: "parallel",
      actions: [
        {
          ...basePayload.actions[1]!,
          sortOrder: 100,
          items: [{ ...basePayload.actions[1]!.items[0]!, sortOrder: 300 }],
        },
        {
          ...basePayload.actions[0]!,
          sortOrder: 200,
          items: [
            { ...basePayload.actions[0]!.items[1]!, sortOrder: 100 },
            { ...basePayload.actions[0]!.items[0]!, sortOrder: 200 },
          ],
        },
      ],
    };

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepDefinitionService;

        const created = yield* service.createActionStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            afterStepKey: "capture",
            payload: { ...basePayload, key: "sync-context-created" },
          },
          "tester",
        );

        const fetched = yield* service.getActionStepDefinition({
          versionId: "ver-1",
          workflowDefinitionId: "wf-1",
          stepId: created.stepId,
        });

        const updated = yield* service.updateActionStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            stepId: created.stepId,
            payload: { ...updatedPayload, key: "sync-context-updated" },
          },
          "tester",
        );

        yield* service.deleteActionStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            stepId: created.stepId,
          },
          "tester",
        );

        return { created, fetched, updated };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.created).toMatchObject({ stepId: "step-action-created", stepType: "action" });
    expect(result.fetched.payload.key).toBe("sync-context-created");
    expect(result.updated.payload.key).toBe("sync-context-updated");
    expect(createdPayloads).toEqual([{ ...basePayload, key: "sync-context-created" }]);
    expect(updatedPayloads).toEqual([{ ...updatedPayload, key: "sync-context-updated" }]);
    expect(updatedPayloads[0]!.actions.map((action) => action.actionId)).toEqual([
      "action-2",
      "action-1",
    ]);
    expect(updatedPayloads[0]!.actions[1]!.items.map((item) => item.itemId)).toEqual([
      "item-2",
      "item-1",
    ]);
    expect(deletedStepIds).toEqual(["step-action-created"]);
    expect(recordedOperations).toEqual([
      "create_action_step",
      "update_action_step",
      "delete_action_step",
    ]);
  });

  it("rejects all-disabled actions, non-propagation actions, kind mismatches, and duplicate step keys", async () => {
    const { layer } = makeLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepDefinitionService;

        const allDisabled = yield* Effect.either(
          service.createActionStep(
            {
              versionId: "ver-1",
              workUnitTypeKey: "WU.STORY",
              workflowDefinitionId: "wf-1",
              afterStepKey: null,
              payload: {
                ...basePayload,
                key: "all-disabled",
                actions: basePayload.actions.map((action) => ({ ...action, enabled: false })),
              },
            },
            "tester",
          ),
        );

        const invalidKind = yield* Effect.either(
          service.createActionStep(
            {
              versionId: "ver-1",
              workUnitTypeKey: "WU.STORY",
              workflowDefinitionId: "wf-1",
              afterStepKey: null,
              payload: {
                ...basePayload,
                key: "invalid-kind",
                actions: [{ ...basePayload.actions[0]!, actionKind: "other" as never }],
              },
            },
            "tester",
          ),
        );

        const staleCompatibilityKind = yield* Effect.either(
          service.createActionStep(
            {
              versionId: "ver-1",
              workUnitTypeKey: "WU.STORY",
              workflowDefinitionId: "wf-1",
              afterStepKey: null,
              payload: {
                ...basePayload,
                key: "mismatch-kind",
                actions: [
                  {
                    ...basePayload.actions[0]!,
                    contextFactKind: "artifact_reference_fact",
                  },
                ],
              },
            },
            "tester",
          ),
        );

        const duplicateStepKey = yield* Effect.either(
          service.createActionStep(
            {
              versionId: "ver-1",
              workUnitTypeKey: "WU.STORY",
              workflowDefinitionId: "wf-1",
              afterStepKey: null,
              payload: basePayload,
            },
            "tester",
          ),
        );

        return { allDisabled, invalidKind, staleCompatibilityKind, duplicateStepKey };
      }).pipe(Effect.provide(layer)),
    );

    expect(Either.isLeft(result.allDisabled)).toBe(true);
    expect(Either.isLeft(result.invalidKind)).toBe(true);
    expect(Either.isRight(result.staleCompatibilityKind)).toBe(true);
    expect(Either.isLeft(result.duplicateStepKey)).toBe(true);
    if (
      !Either.isLeft(result.allDisabled) ||
      !Either.isLeft(result.invalidKind) ||
      !Either.isRight(result.staleCompatibilityKind) ||
      !Either.isLeft(result.duplicateStepKey)
    ) {
      throw new Error("Expected validation failures");
    }
    expect(result.allDisabled.left.message).toContain("enable at least one action");
    expect(result.invalidKind.left.message).toContain("actionKind 'propagation'");
    expect(result.duplicateStepKey.left.message).toContain("already exists");
  });

  it("rejects mutations against non-draft versions", async () => {
    const { layer } = makeLayer({ versionStatus: "published" });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepDefinitionService;
        return yield* Effect.either(
          service.updateActionStep(
            {
              versionId: "ver-1",
              workUnitTypeKey: "WU.STORY",
              workflowDefinitionId: "wf-1",
              stepId: "step-action-existing",
              payload: { ...basePayload, key: "sync-context-published" },
            },
            "tester",
          ),
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (!Either.isLeft(result)) {
      throw new Error("Expected non-draft update to fail");
    }
    expect(result.left._tag).toBe("VersionNotDraftError");
  });
});
