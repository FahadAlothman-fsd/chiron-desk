import { call } from "@orpc/server";
import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  ExecutionReadRepository,
  ProjectFactRepository,
  ProjectWorkUnitRepository,
  RuntimeManualFactCrudServiceLive,
  type WorkflowContextFactValueRow,
  WorkflowContextFactRepository,
  WorkUnitFactRepository,
} from "@chiron/workflow-engine";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import { createProjectRuntimeRouter } from "../../routers/project-runtime";

const now = new Date("2026-04-19T10:00:00.000Z");

const AUTHENTICATED_CTX = {
  context: {
    session: {
      session: {
        id: "session-id",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        userId: "user-id",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        token: "token",
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: "user-id",
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        emailVerified: true,
        image: null,
      },
    },
  },
};

const PUBLIC_CTX = { context: { session: null } };

function makeWorkflowContextCrudTestLayer() {
  const workflowContextFacts: WorkflowContextFactValueRow[] = [];
  const workflowContextRecords: Array<{
    verb: "create" | "update" | "remove" | "delete";
    instanceId: string | null;
    contextFactDefinitionId: string;
  }> = [];

  let nextContextFactId = 1;
  let nextContextInstanceId = 1;

  const workflowContextFactLayer = Layer.succeed(WorkflowContextFactRepository, {
    createFactValue: ({
      workflowExecutionId,
      contextFactDefinitionId,
      valueJson,
      sourceStepExecutionId,
    }) =>
      Effect.sync(() => {
        const row = {
          id: `ctx-row-${nextContextFactId++}`,
          workflowExecutionId,
          contextFactDefinitionId,
          instanceId: `ctx-instance-${nextContextInstanceId++}`,
          instanceOrder: workflowContextFacts.filter(
            (candidate) =>
              candidate.workflowExecutionId === workflowExecutionId &&
              candidate.contextFactDefinitionId === contextFactDefinitionId,
          ).length,
          valueJson,
          sourceStepExecutionId: sourceStepExecutionId ?? null,
          createdAt: now,
          updatedAt: now,
        } satisfies WorkflowContextFactValueRow;

        workflowContextFacts.push(row);
        workflowContextRecords.push({
          verb: "create",
          instanceId: row.instanceId,
          contextFactDefinitionId,
        });
        return row;
      }),
    updateFactValue: ({
      workflowExecutionId,
      contextFactDefinitionId,
      instanceId,
      valueJson,
      sourceStepExecutionId,
    }) =>
      Effect.sync(() => {
        const row = workflowContextFacts.find(
          (candidate) =>
            candidate.workflowExecutionId === workflowExecutionId &&
            candidate.contextFactDefinitionId === contextFactDefinitionId &&
            candidate.instanceId === instanceId,
        );
        if (!row) {
          return null;
        }

        row.valueJson = valueJson;
        row.sourceStepExecutionId = sourceStepExecutionId ?? null;
        row.updatedAt = now;
        workflowContextRecords.push({ verb: "update", instanceId, contextFactDefinitionId });
        return row;
      }),
    removeFactValue: ({ workflowExecutionId, contextFactDefinitionId, instanceId }) =>
      Effect.sync(() => {
        const index = workflowContextFacts.findIndex(
          (candidate) =>
            candidate.workflowExecutionId === workflowExecutionId &&
            candidate.contextFactDefinitionId === contextFactDefinitionId &&
            candidate.instanceId === instanceId,
        );
        if (index < 0) {
          return false;
        }

        workflowContextFacts.splice(index, 1);
        workflowContextRecords.push({ verb: "remove", instanceId, contextFactDefinitionId });
        return true;
      }),
    deleteFactValues: ({ workflowExecutionId, contextFactDefinitionId }) =>
      Effect.sync(() => {
        const removed = workflowContextFacts.filter(
          (candidate) =>
            candidate.workflowExecutionId === workflowExecutionId &&
            candidate.contextFactDefinitionId === contextFactDefinitionId,
        );
        const remaining = workflowContextFacts.filter(
          (candidate) =>
            candidate.workflowExecutionId !== workflowExecutionId ||
            candidate.contextFactDefinitionId !== contextFactDefinitionId,
        );

        workflowContextFacts.splice(0, workflowContextFacts.length, ...remaining);
        workflowContextRecords.push({
          verb: "delete",
          instanceId: null,
          contextFactDefinitionId,
        });
        return removed.length;
      }),
    listCurrentFactValuesByDefinition: ({ workflowExecutionId, contextFactDefinitionId }) =>
      Effect.succeed(
        workflowContextFacts
          .filter(
            (candidate) =>
              candidate.workflowExecutionId === workflowExecutionId &&
              candidate.contextFactDefinitionId === contextFactDefinitionId,
          )
          .sort((left, right) => left.instanceOrder - right.instanceOrder),
      ),
    listCurrentFactsByWorkflowExecution: (workflowExecutionId) =>
      Effect.succeed(
        workflowContextFacts.filter(
          (candidate) => candidate.workflowExecutionId === workflowExecutionId,
        ),
      ),
    listFactRecordsByDefinition: ({ workflowExecutionId, contextFactDefinitionId }) =>
      Effect.succeed(
        workflowContextRecords
          .filter((candidate) => candidate.contextFactDefinitionId === contextFactDefinitionId)
          .map((candidate, index) => ({
            id: `record-${index + 1}`,
            workflowExecutionId,
            contextFactDefinitionId,
            instanceId: candidate.instanceId,
            verb: candidate.verb,
            valueJson: null,
            sourceStepExecutionId: null,
            createdAt: now,
          })),
      ),
  } as unknown as Context.Tag.Service<typeof WorkflowContextFactRepository>);

  const projectContextLayer = Layer.succeed(ProjectContextRepository, {
    findProjectPin: (projectId) =>
      Effect.succeed(
        projectId === "project-1"
          ? {
              projectId,
              methodologyVersionId: "version-1",
              methodologyId: "method-1",
              methodologyKey: "method",
              publishedVersion: "1.0.0",
              actorId: null,
              createdAt: now,
              updatedAt: now,
            }
          : null,
      ),
    hasExecutionHistoryForRepin: () => Effect.die("unused"),
    pinProjectMethodologyVersion: () => Effect.die("unused"),
    repinProjectMethodologyVersion: () => Effect.die("unused"),
    getProjectPinLineage: () => Effect.die("unused"),
    createProject: () => Effect.die("unused"),
    listProjects: () => Effect.die("unused"),
    getProjectById: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);

  const methodologyLayer = Layer.succeed(MethodologyRepository, {
    findFactDefinitionsByVersionId: () => Effect.succeed([]),
    getWorkflowEditorDefinition: () =>
      Effect.succeed({
        workflow: {
          workflowDefinitionId: "wf-1",
          key: "wf-1",
          displayName: "Runtime Flow",
          descriptionJson: null,
        },
        steps: [],
        edges: [],
        formDefinitions: [],
        contextFacts: [
          {
            kind: "work_unit_draft_spec_fact",
            key: "storyDraft",
            contextFactDefinitionId: "ctx-draft",
            cardinality: "one",
            workUnitDefinitionId: "story",
            selectedWorkUnitFactDefinitionIds: ["wu-fact-title"],
            selectedArtifactSlotDefinitionIds: ["slot-story-doc"],
          },
          {
            kind: "plain_fact",
            key: "notes",
            contextFactDefinitionId: "ctx-notes",
            cardinality: "many",
            type: "string",
            validationJson: { kind: "none" },
          },
          {
            kind: "workflow_ref_fact",
            key: "supportingWorkflow",
            contextFactDefinitionId: "ctx-workflow-ref",
            cardinality: "one",
            allowedWorkflowDefinitionIds: ["wf-allowed"],
          },
        ],
      }),
    findVersionById: () => Effect.die("unused"),
    createDraft: () => Effect.die("unused"),
    updateDraft: () => Effect.die("unused"),
    getVersionEvents: () => Effect.die("unused"),
    publishDraftVersion: () => Effect.die("unused"),
    getPublicationEvidence: () => Effect.die("unused"),
    findMethodologyByKey: () => Effect.die("unused"),
    findVersionsByMethodologyId: () => Effect.die("unused"),
    findLatestPublishedVersion: () => Effect.die("unused"),
    findWorkflowSnapshotByVersionId: () => Effect.die("unused"),
    getVersionWorkspaceStats: () => Effect.die("unused"),
    listWorkflowContextFactsByDefinitionId: () => Effect.die("unused"),
    createWorkflowContextFactByDefinitionId: () => Effect.die("unused"),
    updateWorkflowContextFactByDefinitionId: () => Effect.die("unused"),
    deleteWorkflowContextFactByDefinitionId: () => Effect.die("unused"),
    recordEvent: () => Effect.die("unused"),
    listWorkUnitsByVersionId: () => Effect.die("unused"),
    getWorkUnitByKey: () => Effect.die("unused"),
    getWorkflowById: () => Effect.die("unused"),
    getFormStepDefinition: () => Effect.die("unused"),
    createFormStepDefinition: () => Effect.die("unused"),
    updateFormStepDefinition: () => Effect.die("unused"),
    deleteFormStepDefinition: () => Effect.die("unused"),
    createAgentStepDefinition: () => Effect.die("unused"),
    updateAgentStepDefinition: () => Effect.die("unused"),
    deleteAgentStepDefinition: () => Effect.die("unused"),
    createActionStepDefinition: () => Effect.die("unused"),
    updateActionStepDefinition: () => Effect.die("unused"),
    deleteActionStepDefinition: () => Effect.die("unused"),
    getActionStepDefinition: () => Effect.die("unused"),
    createInvokeStepDefinition: () => Effect.die("unused"),
    updateInvokeStepDefinition: () => Effect.die("unused"),
    deleteInvokeStepDefinition: () => Effect.die("unused"),
    getInvokeStepDefinition: () => Effect.die("unused"),
    createBranchStepDefinition: () => Effect.die("unused"),
    updateBranchStepDefinition: () => Effect.die("unused"),
    deleteBranchStepDefinition: () => Effect.die("unused"),
    getBranchStepDefinition: () => Effect.die("unused"),
    updateWorkflowMetadataByDefinitionId: () => Effect.die("unused"),
    findFactSchemasByVersionId: () => Effect.die("unused"),
    replaceArtifactSlotsForWorkUnitType: () => Effect.die("unused"),
    findArtifactSlotsByWorkUnitType: () => Effect.succeed([]),
    findInvokeBindingWorkUnitFactDefinitionsByIds: () => Effect.die("unused"),
    findInvokeBindingArtifactSlotDefinitionsByIds: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

  const lifecycleLayer = Layer.succeed(LifecycleRepository, {
    findWorkUnitTypes: () =>
      Effect.succeed([
        {
          id: "story",
          methodologyVersionId: "version-1",
          key: "story",
          displayName: "Story",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "many_per_project",
          createdAt: now,
          updatedAt: now,
        },
      ]),
    findFactSchemas: () =>
      Effect.succeed([
        {
          id: "wu-fact-title",
          methodologyVersionId: "version-1",
          workUnitTypeId: "story",
          name: "Title",
          key: "wu-fact-title",
          factType: "string",
          cardinality: "one",
          description: null,
          defaultValueJson: null,
          guidanceJson: null,
          validationJson: { kind: "none" },
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "wu-fact-dependency",
          methodologyVersionId: "version-1",
          workUnitTypeId: "story",
          name: "Dependency",
          key: "wu-fact-dependency",
          factType: "work_unit",
          cardinality: "many",
          description: null,
          defaultValueJson: null,
          guidanceJson: null,
          validationJson: { kind: "none" },
          createdAt: now,
          updatedAt: now,
        },
      ]),
    findLifecycleStates: () => Effect.die("unused"),
    findLifecycleTransitions: () => Effect.die("unused"),
    findTransitionConditionSets: () => Effect.die("unused"),
    findAgentTypes: () => Effect.die("unused"),
    findTransitionWorkflowBindings: () => Effect.die("unused"),
    saveLifecycleDefinition: () => Effect.die("unused"),
    recordLifecycleEvent: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

  const executionReadLayer = Layer.succeed(ExecutionReadRepository, {
    getTransitionExecutionDetail: () => Effect.die("unused"),
    listTransitionExecutionsForWorkUnit: () => Effect.die("unused"),
    getWorkflowExecutionDetail: (workflowExecutionId) =>
      Effect.succeed(
        workflowExecutionId === "wfexec-1"
          ? {
              workflowExecution: {
                id: "wfexec-1",
                transitionExecutionId: "transition-1",
                workflowId: "wf-1",
                workflowDefinitionId: "wf-1",
                workflowKey: "wf-1",
                workflowRole: "primary",
                isSupporting: false,
                status: "active",
                startedAt: now,
                completedAt: null,
              },
              transitionExecution: {
                id: "transition-1",
                projectWorkUnitId: "wu-1",
                transitionId: "transition-def-1",
                status: "active",
                startedAt: now,
                completedAt: null,
              },
              projectId: "project-1",
              projectWorkUnitId: "wu-1",
              workUnitTypeId: "story",
              currentStateId: "draft",
            }
          : null,
      ),
    listWorkflowExecutionsForTransition: () => Effect.die("unused"),
    listActiveWorkflowExecutionsByProject: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);

  const unusedProjectFactLayer = Layer.succeed(ProjectFactRepository, {
    createFactInstance: () => Effect.die("unused"),
    getCurrentValuesByDefinition: () => Effect.die("unused"),
    listFactsByProject: () => Effect.die("unused"),
    supersedeFactInstance: () => Effect.die("unused"),
    updateFactInstance: () => Effect.die("unused"),
    logicallyDeleteFactInstance: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ProjectFactRepository>);

  const unusedWorkUnitFactLayer = Layer.succeed(WorkUnitFactRepository, {
    createFactInstance: () => Effect.die("unused"),
    getCurrentValuesByDefinition: () => Effect.die("unused"),
    listFactsByWorkUnit: () => Effect.die("unused"),
    supersedeFactInstance: () => Effect.die("unused"),
    updateFactInstance: () => Effect.die("unused"),
    logicallyDeleteFactInstance: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>);

  const projectWorkUnitLayer = Layer.succeed(ProjectWorkUnitRepository, {
    createProjectWorkUnit: () => Effect.die("unused"),
    listProjectWorkUnitsByProject: () => Effect.succeed([]),
    getProjectWorkUnitById: () => Effect.succeed(null),
    updateActiveTransitionExecutionPointer: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>);

  const layer = RuntimeManualFactCrudServiceLive.pipe(
    Layer.provideMerge(workflowContextFactLayer),
    Layer.provideMerge(projectContextLayer),
    Layer.provideMerge(methodologyLayer),
    Layer.provideMerge(lifecycleLayer),
    Layer.provideMerge(executionReadLayer),
    Layer.provideMerge(unusedProjectFactLayer),
    Layer.provideMerge(unusedWorkUnitFactLayer),
    Layer.provideMerge(projectWorkUnitLayer),
  );

  return {
    router: createProjectRuntimeRouter(layer),
    state: { workflowContextFacts, workflowContextRecords },
  };
}

describe("project runtime workflow-context CRUD router", () => {
  it("requires authentication for workflow-context create", async () => {
    const runtime = makeWorkflowContextCrudTestLayer();

    await expect(
      call(
        runtime.router.createRuntimeWorkflowContextFactValue,
        {
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-notes",
          value: "first note",
        },
        PUBLIC_CTX,
      ),
    ).rejects.toThrow();
  });

  it("supports create/update/remove/delete and preserves remove vs delete for workflow-context facts", async () => {
    const runtime = makeWorkflowContextCrudTestLayer();

    const workflowRef = await call(
      runtime.router.createRuntimeWorkflowContextFactValue,
      {
        projectId: "project-1",
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-workflow-ref",
        value: { workflowDefinitionId: "wf-allowed" },
      },
      AUTHENTICATED_CTX,
    );

    const updatedWorkflowRef = await call(
      runtime.router.updateRuntimeWorkflowContextFactValue,
      {
        projectId: "project-1",
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-workflow-ref",
        instanceId: workflowRef.affectedInstanceIds[0]!,
        value: { workflowDefinitionId: "wf-allowed" },
      },
      AUTHENTICATED_CTX,
    );

    const firstNote = await call(
      runtime.router.createRuntimeWorkflowContextFactValue,
      {
        projectId: "project-1",
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-notes",
        value: "first note",
      },
      AUTHENTICATED_CTX,
    );

    await call(
      runtime.router.createRuntimeWorkflowContextFactValue,
      {
        projectId: "project-1",
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-notes",
        value: "second note",
      },
      AUTHENTICATED_CTX,
    );

    const removed = await call(
      runtime.router.removeRuntimeWorkflowContextFactValue,
      {
        projectId: "project-1",
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-notes",
        instanceId: firstNote.affectedInstanceIds[0]!,
      },
      AUTHENTICATED_CTX,
    );

    const deleted = await call(
      runtime.router.deleteRuntimeWorkflowContextFactValue,
      {
        projectId: "project-1",
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-notes",
      },
      AUTHENTICATED_CTX,
    );

    expect(workflowRef.verb).toBe("create");
    expect(updatedWorkflowRef.verb).toBe("update");
    expect(removed).toMatchObject({ verb: "remove", affectedCount: 1 });
    expect(deleted).toMatchObject({ verb: "delete", affectedCount: 1 });
    expect(runtime.state.workflowContextFacts).toHaveLength(1);
    expect(runtime.state.workflowContextRecords.map((entry) => entry.verb)).toEqual([
      "create",
      "update",
      "create",
      "create",
      "remove",
      "delete",
    ]);
  });

  it("rejects direct project/work-unit mutation bypass through workflow-context draft specs", async () => {
    const runtime = makeWorkflowContextCrudTestLayer();

    await expect(
      call(
        runtime.router.createRuntimeWorkflowContextFactValue,
        {
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-draft",
          value: {
            workUnitDefinitionId: "story",
            factValues: [
              {
                workUnitFactDefinitionId: "wu-fact-dependency",
                value: "wu-2",
              },
            ],
            artifactValues: [
              { slotDefinitionId: "slot-story-doc", relativePath: "stories/story.md" },
            ],
          },
        },
        AUTHENTICATED_CTX,
      ),
    ).rejects.toThrow();

    expect(runtime.state.workflowContextFacts).toHaveLength(0);
  });
});
