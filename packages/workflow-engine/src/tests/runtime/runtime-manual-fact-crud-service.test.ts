import type { WorkflowContextFactValueRow } from "../../repositories/workflow-context-fact-repository";
import { describe, expect, it } from "vitest";
import { Context, Effect, Layer } from "effect";

import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { ProjectFactRepository } from "../../repositories/project-fact-repository";
import { ProjectWorkUnitRepository } from "../../repositories/project-work-unit-repository";
import { WorkflowContextFactRepository } from "../../repositories/workflow-context-fact-repository";
import { WorkUnitFactRepository } from "../../repositories/work-unit-fact-repository";
import {
  RuntimeManualFactCrudService,
  RuntimeManualFactCrudServiceLive,
} from "../../services/runtime-manual-fact-crud-service";

const now = new Date("2026-04-19T10:00:00.000Z");

const makeCrudTestLayer = () => {
  const projectFacts = [
    {
      id: "pf-label-1",
      projectId: "project-1",
      factDefinitionId: "fact-labels",
      valueJson: "alpha",
      status: "active" as const,
      supersededByFactInstanceId: null,
      producedByTransitionExecutionId: null,
      producedByWorkflowExecutionId: null,
      authoredByUserId: null,
      createdAt: now,
    },
    {
      id: "pf-label-2",
      projectId: "project-1",
      factDefinitionId: "fact-labels",
      valueJson: "beta",
      status: "active" as const,
      supersededByFactInstanceId: null,
      producedByTransitionExecutionId: null,
      producedByWorkflowExecutionId: null,
      authoredByUserId: null,
      createdAt: now,
    },
  ];

  const workUnitFacts = [] as Array<{
    id: string;
    projectWorkUnitId: string;
    factDefinitionId: string;
    valueJson: unknown;
    referencedProjectWorkUnitId: string | null;
    status: "active" | "deleted";
    supersededByFactInstanceId: string | null;
    producedByTransitionExecutionId: string | null;
    producedByWorkflowExecutionId: string | null;
    authoredByUserId: string | null;
    createdAt: Date;
  }>;

  const workflowContextFacts = [] as WorkflowContextFactValueRow[];
  const workflowContextRecords = [] as Array<{
    verb: "create" | "update" | "remove" | "delete";
    instanceId: string | null;
    contextFactDefinitionId: string;
  }>;

  let nextProjectFactId = 1;
  let nextWorkUnitFactId = 1;
  let nextContextFactId = 1;
  let nextContextInstanceId = 1;

  const projectFactLayer = Layer.succeed(ProjectFactRepository, {
    createFactInstance: (params) =>
      Effect.sync(() => {
        const row = {
          id: `pf-${nextProjectFactId++}`,
          projectId: params.projectId,
          factDefinitionId: params.factDefinitionId,
          valueJson: params.valueJson,
          status: "active" as const,
          supersededByFactInstanceId: null,
          producedByTransitionExecutionId: params.producedByTransitionExecutionId ?? null,
          producedByWorkflowExecutionId: params.producedByWorkflowExecutionId ?? null,
          authoredByUserId: params.authoredByUserId ?? null,
          createdAt: now,
        };
        projectFacts.push(row);
        return row;
      }),
    getCurrentValuesByDefinition: ({ projectId, factDefinitionId }) =>
      Effect.succeed(
        projectFacts.filter(
          (row) =>
            row.projectId === projectId &&
            row.factDefinitionId === factDefinitionId &&
            row.status === "active",
        ),
      ),
    listFactsByProject: ({ projectId }) =>
      Effect.succeed(
        projectFacts.filter((row) => row.projectId === projectId && row.status === "active"),
      ),
    supersedeFactInstance: ({ projectFactInstanceId, supersededByProjectFactInstanceId }) =>
      Effect.sync(() => {
        const row = projectFacts.find((candidate) => candidate.id === projectFactInstanceId);
        if (row) {
          row.status = "deleted";
          row.supersededByFactInstanceId = supersededByProjectFactInstanceId;
        }
      }),
    manualUpdateFactInstance: ({ projectFactInstanceId, valueJson }) =>
      Effect.sync(() => {
        const row = projectFacts.find(
          (candidate) => candidate.id === projectFactInstanceId && candidate.status === "active",
        );
        if (!row) {
          return null;
        }
        row.valueJson = valueJson;
        return row;
      }),
    createVersionedFactSuccessor: ({ previousProjectFactInstanceId, valueJson }) =>
      Effect.sync(() => {
        const previous = projectFacts.find(
          (candidate) =>
            candidate.id === previousProjectFactInstanceId && candidate.status === "active",
        );
        if (!previous) {
          return null;
        }
        const row = {
          id: `pf-${nextProjectFactId++}`,
          projectId: previous.projectId,
          factDefinitionId: previous.factDefinitionId,
          valueJson,
          status: "active" as const,
          supersededByFactInstanceId: null,
          producedByTransitionExecutionId: null,
          producedByWorkflowExecutionId: null,
          authoredByUserId: null,
          createdAt: now,
        };
        previous.status = "superseded";
        previous.supersededByFactInstanceId = row.id;
        projectFacts.push(row);
        return row;
      }),
    logicallyDeleteFactInstance: ({ projectFactInstanceId }) =>
      Effect.sync(() => {
        const row = projectFacts.find(
          (candidate) => candidate.id === projectFactInstanceId && candidate.status === "active",
        );
        if (!row) {
          return null;
        }
        row.status = "deleted";
        return row;
      }),
  } as unknown as Context.Tag.Service<typeof ProjectFactRepository>);

  const workUnitFactLayer = Layer.succeed(WorkUnitFactRepository, {
    createFactInstance: (params) =>
      Effect.sync(() => {
        const row = {
          id: `wuf-${nextWorkUnitFactId++}`,
          projectWorkUnitId: params.projectWorkUnitId,
          factDefinitionId: params.factDefinitionId,
          valueJson: params.valueJson ?? null,
          referencedProjectWorkUnitId: params.referencedProjectWorkUnitId ?? null,
          status: "active" as const,
          supersededByFactInstanceId: null,
          producedByTransitionExecutionId: params.producedByTransitionExecutionId ?? null,
          producedByWorkflowExecutionId: params.producedByWorkflowExecutionId ?? null,
          authoredByUserId: params.authoredByUserId ?? null,
          createdAt: now,
        };
        workUnitFacts.push(row);
        return row;
      }),
    getCurrentValuesByDefinition: ({ projectWorkUnitId, factDefinitionId }) =>
      Effect.succeed(
        workUnitFacts.filter(
          (row) =>
            row.projectWorkUnitId === projectWorkUnitId &&
            row.factDefinitionId === factDefinitionId &&
            row.status === "active",
        ),
      ),
    listFactsByWorkUnit: ({ projectWorkUnitId }) =>
      Effect.succeed(
        workUnitFacts.filter(
          (row) => row.projectWorkUnitId === projectWorkUnitId && row.status === "active",
        ),
      ),
    supersedeFactInstance: ({ workUnitFactInstanceId, supersededByWorkUnitFactInstanceId }) =>
      Effect.sync(() => {
        const row = workUnitFacts.find((candidate) => candidate.id === workUnitFactInstanceId);
        if (row) {
          row.status = "deleted";
          row.supersededByFactInstanceId = supersededByWorkUnitFactInstanceId;
        }
      }),
    manualUpdateFactInstance: ({
      workUnitFactInstanceId,
      valueJson,
      referencedProjectWorkUnitId,
    }) =>
      Effect.sync(() => {
        const row = workUnitFacts.find(
          (candidate) => candidate.id === workUnitFactInstanceId && candidate.status === "active",
        );
        if (!row) {
          return null;
        }
        row.valueJson = valueJson ?? null;
        row.referencedProjectWorkUnitId = referencedProjectWorkUnitId ?? null;
        return row;
      }),
    createVersionedFactSuccessor: ({
      previousWorkUnitFactInstanceId,
      valueJson,
      referencedProjectWorkUnitId,
    }) =>
      Effect.sync(() => {
        const previous = workUnitFacts.find(
          (candidate) =>
            candidate.id === previousWorkUnitFactInstanceId && candidate.status === "active",
        );
        if (!previous) {
          return null;
        }
        const row = {
          id: `wuf-${nextWorkUnitFactId++}`,
          projectWorkUnitId: previous.projectWorkUnitId,
          factDefinitionId: previous.factDefinitionId,
          valueJson: valueJson ?? null,
          referencedProjectWorkUnitId: referencedProjectWorkUnitId ?? null,
          status: "active" as const,
          supersededByFactInstanceId: null,
          producedByTransitionExecutionId: null,
          producedByWorkflowExecutionId: null,
          authoredByUserId: null,
          createdAt: now,
        };
        previous.status = "superseded";
        previous.supersededByFactInstanceId = row.id;
        workUnitFacts.push(row);
        return row;
      }),
    logicallyDeleteFactInstance: ({ workUnitFactInstanceId }) =>
      Effect.sync(() => {
        const row = workUnitFacts.find(
          (candidate) => candidate.id === workUnitFactInstanceId && candidate.status === "active",
        );
        if (!row) {
          return null;
        }
        row.status = "deleted";
        return row;
      }),
  } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>);

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
            (candidate) => candidate.contextFactDefinitionId === contextFactDefinitionId,
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
    updateFactValue: ({ contextFactDefinitionId, instanceId, valueJson, sourceStepExecutionId }) =>
      Effect.sync(() => {
        const row = workflowContextFacts.find(
          (candidate) =>
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
    removeFactValue: ({ contextFactDefinitionId, instanceId }) =>
      Effect.sync(() => {
        const index = workflowContextFacts.findIndex(
          (candidate) =>
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
    deleteFactValues: ({ contextFactDefinitionId }) =>
      Effect.sync(() => {
        const remaining = workflowContextFacts.filter(
          (candidate) => candidate.contextFactDefinitionId !== contextFactDefinitionId,
        );
        const deletedCount = workflowContextFacts.length - remaining.length;
        workflowContextFacts.splice(0, workflowContextFacts.length, ...remaining);
        workflowContextRecords.push({ verb: "delete", instanceId: null, contextFactDefinitionId });
        return deletedCount;
      }),
    listCurrentFactValuesByDefinition: ({ workflowExecutionId, contextFactDefinitionId }) =>
      Effect.succeed(
        workflowContextFacts
          .filter(
            (row) =>
              row.workflowExecutionId === workflowExecutionId &&
              row.contextFactDefinitionId === contextFactDefinitionId,
          )
          .sort((left, right) => left.instanceOrder - right.instanceOrder),
      ),
    listCurrentFactsByWorkflowExecution: (workflowExecutionId) =>
      Effect.succeed(
        workflowContextFacts.filter((row) => row.workflowExecutionId === workflowExecutionId),
      ),
    listFactRecordsByDefinition: ({ contextFactDefinitionId }) =>
      Effect.succeed(
        workflowContextRecords
          .filter((row) => row.contextFactDefinitionId === contextFactDefinitionId)
          .map((row, index) => ({
            id: `record-${index}`,
            workflowExecutionId: "wfexec-1",
            contextFactDefinitionId,
            instanceId: row.instanceId,
            verb: row.verb,
            valueJson: null,
            sourceStepExecutionId: null,
            createdAt: now,
          })),
      ),
  } as unknown as Context.Tag.Service<typeof WorkflowContextFactRepository>);

  const projectWorkUnitLayer = Layer.succeed(ProjectWorkUnitRepository, {
    createProjectWorkUnit: () => Effect.die("unused"),
    listProjectWorkUnitsByProject: () =>
      Effect.succeed([
        {
          id: "wu-1",
          projectId: "project-1",
          workUnitTypeId: "story",
          currentStateId: "draft",
          activeTransitionExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "wu-2",
          projectId: "project-1",
          workUnitTypeId: "story",
          currentStateId: "draft",
          activeTransitionExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
      ]),
    getProjectWorkUnitById: (projectWorkUnitId) =>
      Effect.succeed(
        projectWorkUnitId === "wu-1" || projectWorkUnitId === "wu-2"
          ? {
              id: projectWorkUnitId,
              projectId: "project-1",
              workUnitTypeId: "story",
              currentStateId: "draft",
              activeTransitionExecutionId: null,
              createdAt: now,
              updatedAt: now,
            }
          : null,
      ),
    updateActiveTransitionExecutionPointer: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>);

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
    findFactDefinitionsByVersionId: () =>
      Effect.succeed([
        {
          id: "fact-priority",
          name: "Priority",
          key: "fact-priority",
          valueType: "string",
          cardinality: "one",
          descriptionJson: null,
          guidanceJson: null,
          defaultValueJson: null,
          validationJson: { kind: "allowed-values", values: ["P1", "P2"] },
        },
        {
          id: "fact-labels",
          name: "Labels",
          key: "fact-labels",
          valueType: "string",
          cardinality: "many",
          descriptionJson: null,
          guidanceJson: null,
          defaultValueJson: null,
          validationJson: { kind: "none" },
        },
      ]),
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
            kind: "workflow_ref_fact",
            key: "supportingWorkflow",
            contextFactDefinitionId: "ctx-workflow-ref",
            cardinality: "one",
            allowedWorkflowDefinitionIds: ["wf-allowed"],
          },
          {
            kind: "bound_fact",
            key: "boundPriority",
            contextFactDefinitionId: "ctx-bound",
            cardinality: "one",
            factDefinitionId: "fact-priority",
          },
          {
            kind: "artifact_slot_reference_fact",
            key: "artifactSnapshot",
            contextFactDefinitionId: "ctx-artifact",
            cardinality: "one",
            slotDefinitionId: "slot-story-doc",
          },
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
            kind: "plain_value_fact",
            key: "notes",
            contextFactDefinitionId: "ctx-notes",
            cardinality: "many",
            valueType: "string",
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
    findArtifactSlotsByWorkUnitType: () =>
      Effect.succeed([
        {
          id: "slot-story-doc",
          key: "story_doc",
          workUnitTypeId: "story",
          displayName: "Story Doc",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "fileset",
          rulesJson: null,
          templates: [],
        },
      ]),
    listWorkflowsByWorkUnitType: () =>
      Effect.succeed([
        {
          id: "wf-allowed",
          workflowDefinitionId: "wf-allowed",
          key: "wf_allowed",
          displayName: "Allowed Workflow",
          createdAt: now,
          updatedAt: now,
        },
      ]),
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

  const layer = RuntimeManualFactCrudServiceLive.pipe(
    Layer.provideMerge(projectFactLayer),
    Layer.provideMerge(workUnitFactLayer),
    Layer.provideMerge(workflowContextFactLayer),
    Layer.provideMerge(projectWorkUnitLayer),
    Layer.provideMerge(projectContextLayer),
    Layer.provideMerge(methodologyLayer),
    Layer.provideMerge(lifecycleLayer),
    Layer.provideMerge(executionReadLayer),
  );

  return {
    layer,
    state: {
      projectFacts,
      workUnitFacts,
      workflowContextFacts,
      workflowContextRecords,
    },
  };
};

describe("RuntimeManualFactCrudService", () => {
  it("applies project fact create/update/remove/delete with logical delete semantics", async () => {
    const runtime = makeCrudTestLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeManualFactCrudService;

        const created = yield* service.apply({
          scope: "project",
          projectId: "project-1",
          factDefinitionId: "fact-priority",
          payload: { verb: "create", value: "P1" },
          authoredByUserId: "user-1",
        });
        const updated = yield* service.apply({
          scope: "project",
          projectId: "project-1",
          factDefinitionId: "fact-priority",
          payload: { verb: "update", instanceId: created.affectedInstanceIds[0]!, value: "P2" },
          authoredByUserId: "user-1",
        });
        const removed = yield* service.apply({
          scope: "project",
          projectId: "project-1",
          factDefinitionId: "fact-priority",
          payload: { verb: "remove", instanceId: updated.affectedInstanceIds[0]! },
        });
        const deleted = yield* service.apply({
          scope: "project",
          projectId: "project-1",
          factDefinitionId: "fact-labels",
          payload: { verb: "delete" },
        });

        return { created, updated, removed, deleted };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.created.affectedCount).toBe(1);
    expect(result.updated.affectedCount).toBe(1);
    expect(result.removed.affectedCount).toBe(1);
    expect(result.deleted.affectedCount).toBe(2);
    expect(runtime.state.projectFacts.filter((row) => row.status === "active")).toHaveLength(0);
  });

  it("applies work-unit fact create/update/delete across primitive and work-unit references", async () => {
    const runtime = makeCrudTestLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeManualFactCrudService;

        const createdTitle = yield* service.apply({
          scope: "work_unit",
          projectWorkUnitId: "wu-1",
          factDefinitionId: "wu-fact-title",
          payload: { verb: "create", value: "Draft story title" },
        });
        yield* service.apply({
          scope: "work_unit",
          projectWorkUnitId: "wu-1",
          factDefinitionId: "wu-fact-title",
          payload: {
            verb: "update",
            instanceId: createdTitle.affectedInstanceIds[0]!,
            value: "Final story title",
          },
        });
        const createdDependency = yield* service.apply({
          scope: "work_unit",
          projectWorkUnitId: "wu-1",
          factDefinitionId: "wu-fact-dependency",
          payload: { verb: "create", value: { projectWorkUnitId: "wu-2" } },
        });
        const deletedDependency = yield* service.apply({
          scope: "work_unit",
          projectWorkUnitId: "wu-1",
          factDefinitionId: "wu-fact-dependency",
          payload: { verb: "delete" },
        });

        return { createdDependency, deletedDependency };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(
      runtime.state.workUnitFacts.find((row) => row.factDefinitionId === "wu-fact-title")
        ?.valueJson,
    ).toBe("Final story title");
    expect(result.createdDependency.affectedCount).toBe(1);
    expect(result.deletedDependency.affectedCount).toBe(1);
  });

  it("applies workflow-context create/update/remove/delete with remove vs delete distinction", async () => {
    const runtime = makeCrudTestLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeManualFactCrudService;

        const workflowRef = yield* service.apply({
          scope: "workflow_context",
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-workflow-ref",
          payload: { verb: "create", value: { workflowDefinitionId: "wf-allowed" } },
        });
        yield* service.apply({
          scope: "workflow_context",
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-workflow-ref",
          payload: {
            verb: "update",
            instanceId: workflowRef.affectedInstanceIds[0]!,
            value: { workflowDefinitionId: "wf-allowed" },
          },
        });
        const noteOne = yield* service.apply({
          scope: "workflow_context",
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-notes",
          payload: { verb: "create", value: "first note" },
        });
        yield* service.apply({
          scope: "workflow_context",
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-notes",
          payload: { verb: "create", value: "second note" },
        });
        const removed = yield* service.apply({
          scope: "workflow_context",
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-notes",
          payload: { verb: "remove", instanceId: noteOne.affectedInstanceIds[0]! },
        });
        const deleted = yield* service.apply({
          scope: "workflow_context",
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-notes",
          payload: { verb: "delete" },
        });

        return { removed, deleted };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.removed.affectedCount).toBe(1);
    expect(result.deleted.affectedCount).toBe(1);
    expect(runtime.state.workflowContextRecords.map((row) => row.verb)).toContain("remove");
    expect(runtime.state.workflowContextRecords.map((row) => row.verb)).toContain("delete");
  });

  it("returns structured error on invalid payload", async () => {
    const runtime = makeCrudTestLayer();

    const failure = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeManualFactCrudService;
        return yield* service.apply({
          scope: "workflow_context",
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-bound",
          payload: { verb: "create", value: "not-a-bound-envelope" },
        });
      }).pipe(
        Effect.provide(runtime.layer),
        Effect.catchAll((error) => Effect.succeed(error)),
      ),
    );

    expect(failure?._tag).toBe("RuntimeFactValidationError");
  });

  it("returns forbidden operation error for single-cardinality create against existing value", async () => {
    const runtime = makeCrudTestLayer();

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeManualFactCrudService;
        yield* service.apply({
          scope: "workflow_context",
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-workflow-ref",
          payload: { verb: "create", value: { workflowDefinitionId: "wf-allowed" } },
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    const failure = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeManualFactCrudService;
        return yield* service.apply({
          scope: "workflow_context",
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-workflow-ref",
          payload: { verb: "create", value: { workflowDefinitionId: "wf-allowed" } },
        });
      }).pipe(
        Effect.provide(runtime.layer),
        Effect.catchAll((error) => Effect.succeed(error)),
      ),
    );

    expect(failure?._tag).toBe("RuntimeFactCrudError");
  });

  it("returns structured error for workflow family policy violations", async () => {
    const runtime = makeCrudTestLayer();

    const failure = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeManualFactCrudService;
        return yield* service.apply({
          scope: "workflow_context",
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-draft",
          payload: {
            verb: "create",
            value: {
              workUnitDefinitionId: "story",
              factValues: [{ workUnitFactDefinitionId: "wu-fact-dependency", value: "wu-2" }],
              artifactValues: [
                { slotDefinitionId: "slot-story-doc", relativePath: "stories/story.md" },
              ],
            },
          },
        });
      }).pipe(
        Effect.provide(runtime.layer),
        Effect.catchAll((error) => Effect.succeed(error)),
      ),
    );

    expect(failure?._tag).toBe("RuntimeFactValidationError");
  });

  it("rejects workflow refs that are not defined on the current work unit type", async () => {
    const runtime = makeCrudTestLayer();

    const failure = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeManualFactCrudService;
        return yield* service.apply({
          scope: "workflow_context",
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-workflow-ref",
          payload: { verb: "create", value: { workflowDefinitionId: "wf-missing-local" } },
        });
      }).pipe(
        Effect.provide(runtime.layer),
        Effect.catchAll((error) => Effect.succeed(error)),
      ),
    );

    expect(failure?._tag).toBe("RuntimeFactValidationError");
    expect((failure as { message?: string } | undefined)?.message).toContain(
      "not defined for this work unit type",
    );
  });

  it("rejects bound fact instance ids that do not exist in the current source", async () => {
    const runtime = makeCrudTestLayer();

    const failure = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeManualFactCrudService;
        return yield* service.apply({
          scope: "workflow_context",
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-bound",
          payload: {
            verb: "create",
            value: { factInstanceId: "missing-bound-instance", value: "P1" },
          },
        });
      }).pipe(
        Effect.provide(runtime.layer),
        Effect.catchAll((error) => Effect.succeed(error)),
      ),
    );

    expect(failure?._tag).toBe("RuntimeFactValidationError");
    expect((failure as { message?: string } | undefined)?.message).toContain(
      "Omit factInstanceId if you intend to create a new instance later in an action step.",
    );
  });
});
