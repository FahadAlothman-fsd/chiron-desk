import { call } from "@orpc/server";
import { Context, Effect, Layer, Stream } from "effect";
import { describe, expect, it } from "vitest";

import type { ActionStepPayload } from "@chiron/contracts/methodology/workflow";
import { MethodologyRepository } from "@chiron/methodology-engine";
import {
  ActionStepEventStreamService,
  ActionStepRuntimeService,
  StepExecutionDetailService,
  WorkflowExecutionStepCommandService,
} from "@chiron/workflow-engine";

import { createMethodologyRouter } from "../../routers/methodology";
import { createProjectRuntimeRouter } from "../../routers/project-runtime";

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

const actionPayload: ActionStepPayload = {
  key: "sync-context",
  label: "Sync Context",
  executionMode: "sequential",
  actions: [
    {
      actionId: "action-1",
      actionKey: "propagate-project-context",
      label: "Propagate project context",
      enabled: true,
      sortOrder: 100,
      actionKind: "propagation",
      contextFactDefinitionId: "ctx-project-context",
      contextFactKind: "definition_backed_external_fact",
      items: [
        {
          itemId: "item-1",
          itemKey: "project-name",
          label: "Project name",
          sortOrder: 100,
          targetContextFactDefinitionId: "ctx-project-context",
        },
      ],
    },
  ],
};

function makeServiceLayer() {
  const createdPayloads: ActionStepPayload[] = [];
  const updatedPayloads: ActionStepPayload[] = [];
  const deletedStepIds: string[] = [];
  const actionSteps = new Map<string, { stepId: string; payload: ActionStepPayload }>([
    ["step-action-1", { stepId: "step-action-1", payload: actionPayload }],
  ]);

  const repo = {
    findVersionById: () =>
      Effect.succeed({
        id: "ver-1",
        methodologyId: "meth-1",
        version: "v1",
        status: "draft",
        displayName: "Draft",
        definitionExtensions: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        retiredAt: null,
      }),
    listWorkflowContextFactsByDefinitionId: () =>
      Effect.succeed([
        {
          contextFactDefinitionId: "ctx-project-context",
          kind: "definition_backed_external_fact",
          key: "project_context",
          label: "Project Context",
          cardinality: "one",
          externalFactDefinitionId: "EXT.PROJECT_CONTEXT",
          valueType: "json",
        },
        {
          contextFactDefinitionId: "ctx-artifact",
          kind: "artifact_reference_fact",
          key: "artifact",
          label: "Artifact",
          cardinality: "one",
          artifactSlotDefinitionId: "ART.PRD",
        },
      ]),
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
            stepId: "step-action-1",
            stepType: "action",
            stepKey: "sync-context-existing",
            mode: "deferred",
            defaultMessage: "Deferred in slice-1",
          },
        ],
        edges: [],
        contextFacts: [],
        formDefinitions: [],
      }),
    createActionStepDefinition: (input: { readonly payload: ActionStepPayload }) =>
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
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>;

  return {
    createdPayloads,
    updatedPayloads,
    deletedStepIds,
    layer: Layer.succeed(MethodologyRepository, repo),
  };
}

describe("action methodology router", () => {
  it("action methodology wires create/update/delete/get procedures", async () => {
    const { layer, createdPayloads, updatedPayloads, deletedStepIds } = makeServiceLayer();
    const router = createMethodologyRouter(layer);

    const created = await call(
      router.version.workUnit.workflow.createActionStep,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        afterStepKey: "capture",
        payload: actionPayload,
      },
      AUTHENTICATED_CTX,
    );

    const fetched = await call(
      router.version.workUnit.workflow.getActionStepDefinition,
      {
        methodologyId: "meth-1",
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        stepId: created.stepId,
      },
      AUTHENTICATED_CTX,
    );

    const updated = await call(
      router.version.workUnit.workflow.updateActionStep,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        stepId: created.stepId,
        payload: { ...actionPayload, label: "Sync Context v2", executionMode: "parallel" },
      },
      AUTHENTICATED_CTX,
    );

    await call(
      router.version.workUnit.workflow.deleteActionStep,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        stepId: created.stepId,
      },
      AUTHENTICATED_CTX,
    );

    expect(created).toMatchObject({ stepId: "step-action-created", stepType: "action" });
    expect(fetched).toMatchObject({ stepId: "step-action-created", stepType: "action" });
    expect(updated.payload.label).toBe("Sync Context v2");
    expect(updated.payload.executionMode).toBe("parallel");
    expect(createdPayloads).toEqual([actionPayload]);
    expect(updatedPayloads).toEqual([
      expect.objectContaining({ label: "Sync Context v2", executionMode: "parallel" }),
    ]);
    expect(deletedStepIds).toEqual(["step-action-created"]);
  });

  it("action methodology rejects non-propagation authoring payloads", async () => {
    const { layer } = makeServiceLayer();
    const router = createMethodologyRouter(layer);

    await expect(
      call(
        router.version.workUnit.workflow.createActionStep,
        {
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
          payload: {
            ...actionPayload,
            key: "invalid-action-kind",
            actions: [{ ...actionPayload.actions[0]!, actionKind: "other" }],
          },
        },
        AUTHENTICATED_CTX,
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Input validation failed",
    });
  });
});

describe("action runtime router", () => {
  it("delegates start, run, retry, complete, and stream procedures", async () => {
    const calls = {
      start: 0,
      run: 0,
      retry: 0,
      skipAction: 0,
      skipItem: 0,
      complete: 0,
      stream: 0,
    };

    const runtimeService: ActionStepRuntimeService["Type"] = {
      startExecution: ({ stepExecutionId }) => {
        calls.start += 1;
        return Effect.succeed({ stepExecutionId, result: "started" as const });
      },
      runActions: ({ stepExecutionId, actionIds }) => {
        calls.run += 1;
        return Effect.succeed({
          stepExecutionId,
          actionResults: actionIds.map((actionId) => ({ actionId, result: "started" as const })),
        });
      },
      retryActions: ({ stepExecutionId, actionIds }) => {
        calls.retry += 1;
        return Effect.succeed({
          stepExecutionId,
          actionResults: actionIds.map((actionId) => ({ actionId, result: "started" as const })),
        });
      },
      skipActions: ({ stepExecutionId, actionIds }) => {
        calls.skipAction += 1;
        return Effect.succeed({
          stepExecutionId,
          actionResults: actionIds.map((actionId) => ({ actionId, result: "skipped" as const })),
        });
      },
      skipActionItems: ({ stepExecutionId, actionId, itemIds }) => {
        calls.skipItem += 1;
        return Effect.succeed({
          stepExecutionId,
          actionId,
          itemResults: itemIds.map((itemId) => ({ itemId, result: "skipped" as const })),
        });
      },
      completeStep: ({ stepExecutionId }) => {
        calls.complete += 1;
        return Effect.succeed({ stepExecutionId, status: "completed" as const });
      },
      getCompletionEligibility: () =>
        Effect.succeed({
          mode: "manual" as const,
          eligible: true,
          requiresAtLeastOneSucceededAction: true,
          blockedByRunningActions: true,
        }),
    };

    const streamService: ActionStepEventStreamService["Type"] = {
      streamExecutionEvents: ({ stepExecutionId }) => {
        calls.stream += 1;
        return Stream.fromIterable([
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
        ]);
      },
    };

    const router = createProjectRuntimeRouter(
      Layer.mergeAll(
        Layer.succeed(ActionStepRuntimeService, runtimeService),
        Layer.succeed(ActionStepEventStreamService, streamService),
      ),
    );

    const started = await call(
      router.startActionStepExecution,
      { projectId: "project-1", stepExecutionId: "step-exec-1" },
      AUTHENTICATED_CTX,
    );
    const ran = await call(
      router.runActionStepActions,
      { projectId: "project-1", stepExecutionId: "step-exec-1", actionIds: ["action-1"] },
      AUTHENTICATED_CTX,
    );
    const retried = await call(
      router.retryActionStepActions,
      { projectId: "project-1", stepExecutionId: "step-exec-1", actionIds: ["action-1"] },
      AUTHENTICATED_CTX,
    );
    const skippedAction = await call(
      router.skipActionStepActions,
      { projectId: "project-1", stepExecutionId: "step-exec-1", actionIds: ["action-1"] },
      AUTHENTICATED_CTX,
    );
    const skippedItem = await call(
      router.skipActionStepActionItems,
      {
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
        actionId: "action-1",
        itemIds: ["item-1"],
      },
      AUTHENTICATED_CTX,
    );
    const completed = await call(
      router.completeActionStepExecution,
      { projectId: "project-1", stepExecutionId: "step-exec-1" },
      AUTHENTICATED_CTX,
    );
    const stream = await call(
      router.streamActionStepExecutionEvents,
      { projectId: "project-1", stepExecutionId: "step-exec-1" },
      { context: { session: null } },
    );

    const events: Array<{ eventType: string }> = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(calls).toEqual({
      start: 1,
      run: 1,
      retry: 1,
      skipAction: 1,
      skipItem: 1,
      complete: 1,
      stream: 1,
    });
    expect(started).toEqual({ stepExecutionId: "step-exec-1", result: "started" });
    expect(ran.actionResults).toEqual([{ actionId: "action-1", result: "started" }]);
    expect(retried.actionResults).toEqual([{ actionId: "action-1", result: "started" }]);
    expect(skippedAction.actionResults).toEqual([{ actionId: "action-1", result: "skipped" }]);
    expect(skippedItem.itemResults).toEqual([{ itemId: "item-1", result: "skipped" }]);
    expect(completed).toEqual({ stepExecutionId: "step-exec-1", status: "completed" });
    expect(events.map((event) => event.eventType)).toEqual([
      "bootstrap",
      "step-completion-eligibility-changed",
      "done",
    ]);
  });

  it("requires authentication for action runtime mutations", async () => {
    const runtimeService = {
      startExecution: () => Effect.die("unused"),
      runActions: () => Effect.die("unused"),
      retryActions: () => Effect.die("unused"),
      skipActions: () => Effect.die("unused"),
      skipActionItems: () => Effect.die("unused"),
      completeStep: () => Effect.die("unused"),
      getCompletionEligibility: () => Effect.die("unused"),
    } as unknown as ActionStepRuntimeService["Type"];

    const router = createProjectRuntimeRouter(
      Layer.succeed(ActionStepRuntimeService, runtimeService),
    );

    await expect(
      call(
        router.startActionStepExecution,
        { projectId: "project-1", stepExecutionId: "step-exec-1" },
        { context: { session: null } },
      ),
    ).rejects.toThrow();

    await expect(
      call(
        router.runActionStepActions,
        { projectId: "project-1", stepExecutionId: "step-exec-1", actionIds: ["action-1"] },
        { context: { session: null } },
      ),
    ).rejects.toThrow();

    await expect(
      call(
        router.retryActionStepActions,
        { projectId: "project-1", stepExecutionId: "step-exec-1", actionIds: ["action-1"] },
        { context: { session: null } },
      ),
    ).rejects.toThrow();

    await expect(
      call(
        router.skipActionStepActions,
        { projectId: "project-1", stepExecutionId: "step-exec-1", actionIds: ["action-1"] },
        { context: { session: null } },
      ),
    ).rejects.toThrow();

    await expect(
      call(
        router.skipActionStepActionItems,
        {
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          actionId: "action-1",
          itemIds: ["item-1"],
        },
        { context: { session: null } },
      ),
    ).rejects.toThrow();

    await expect(
      call(
        router.completeActionStepExecution,
        { projectId: "project-1", stepExecutionId: "step-exec-1" },
        { context: { session: null } },
      ),
    ).rejects.toThrow();
  });
});

describe("branch runtime router", () => {
  it("branch runtime exposes branch detail payload and save-selection mutation", async () => {
    const calls = {
      detail: 0,
      saveSelection: 0,
    };

    const detailService: StepExecutionDetailService["Type"] = {
      getRuntimeStepExecutionDetail: () => {
        calls.detail += 1;
        return Effect.succeed({
          shell: {
            stepExecutionId: "step-branch-1",
            workflowExecutionId: "wfexec-1",
            stepDefinitionId: "step-def-branch-1",
            stepType: "branch" as const,
            status: "active" as const,
            activatedAt: new Date("2026-04-17T12:00:00.000Z").toISOString(),
            completionAction: {
              kind: "complete_step_execution" as const,
              visible: true,
              enabled: false,
              reasonIfDisabled:
                "Branch completion is blocked until a valid target selection is explicitly saved.",
            },
          },
          body: {
            stepType: "branch" as const,
            resolutionContract: "explicit_save_selection_v1" as const,
            persistedSelection: {
              selectedTargetStepId: null,
              isValid: false,
              blockingReason:
                "Branch completion is blocked until a valid target selection is explicitly saved.",
            },
            suggestion: {
              suggestedTargetStepId: "step-next-a",
              source: "conditional_route" as const,
              routeId: "route-a",
            },
            conditionalRoutes: [
              {
                routeId: "route-a",
                targetStepId: "step-next-a",
                sortOrder: 0,
                isValid: true,
                conditionMode: "all" as const,
                evaluationTree: {
                  mode: "all" as const,
                  met: true,
                  conditions: [],
                  groups: [],
                },
              },
              {
                routeId: "route-b",
                targetStepId: "step-next-b",
                sortOrder: 1,
                isValid: false,
                conditionMode: "all" as const,
                evaluationTree: {
                  mode: "all" as const,
                  met: false,
                  reason: "At least one branch condition failed",
                  conditions: [],
                  groups: [],
                },
              },
            ],
            defaultTargetStepId: "step-default",
            saveSelectionAction: {
              kind: "save_branch_step_selection" as const,
              enabled: true,
            },
            completionSummary: {
              mode: "explicit_saved_selection" as const,
              eligible: false,
              reasonIfIneligible:
                "Branch completion is blocked until a valid target selection is explicitly saved.",
            },
          },
        });
      },
    };

    const commandService: WorkflowExecutionStepCommandService["Type"] = {
      activateWorkflowStepExecution: () => Effect.die("unused"),
      activateFirstWorkflowStepExecution: () => Effect.die("unused"),
      saveFormStepDraft: () => Effect.die("unused"),
      submitFormStep: () => Effect.die("unused"),
      saveBranchStepSelection: ({ selectedTargetStepId }) => {
        calls.saveSelection += 1;
        return Effect.succeed({
          stepExecutionId: "step-branch-1",
          selectedTargetStepId,
          result: "saved" as const,
        });
      },
      completeStepExecution: () => Effect.die("unused"),
    };

    const router = createProjectRuntimeRouter(
      Layer.mergeAll(
        Layer.succeed(StepExecutionDetailService, detailService),
        Layer.succeed(WorkflowExecutionStepCommandService, commandService),
      ),
    );

    const detail = await call(
      router.getRuntimeStepExecutionDetail,
      { projectId: "project-1", stepExecutionId: "step-branch-1" },
      { context: { session: null } },
    );
    const saved = await call(
      router.saveBranchStepSelection,
      {
        projectId: "project-1",
        stepExecutionId: "step-branch-1",
        selectedTargetStepId: "step-next-a",
      },
      AUTHENTICATED_CTX,
    );

    expect(calls).toEqual({ detail: 1, saveSelection: 1 });
    expect(detail.body.stepType).toBe("branch");
    if (detail.body.stepType !== "branch") {
      throw new Error("expected branch detail body");
    }

    expect(detail.body.suggestion).toEqual({
      suggestedTargetStepId: "step-next-a",
      source: "conditional_route",
      routeId: "route-a",
    });
    expect(detail.body.conditionalRoutes.map((route) => route.routeId)).toEqual([
      "route-a",
      "route-b",
    ]);
    expect(detail.body.saveSelectionAction.kind).toBe("save_branch_step_selection");
    expect(saved).toEqual({
      stepExecutionId: "step-branch-1",
      selectedTargetStepId: "step-next-a",
      result: "saved",
    });
  });
});
