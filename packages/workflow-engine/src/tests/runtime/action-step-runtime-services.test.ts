import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import type {
  ActionStepPayload,
  WorkflowContextFactDto,
} from "@chiron/contracts/methodology/workflow";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import {
  ActionStepRuntimeRepository,
  type ActionStepExecutionActionItemRow,
  type ActionStepExecutionActionRow,
  type ActionStepExecutionRow,
} from "../../repositories/action-step-runtime-repository";
import { ArtifactRepository } from "../../repositories/artifact-repository";
import {
  ExecutionReadRepository,
  type WorkflowExecutionDetailReadModel,
} from "../../repositories/execution-read-repository";
import {
  StepExecutionRepository,
  type RuntimeFormStepExecutionStateRow,
  type RuntimeStepExecutionRow,
  type RuntimeWorkflowContextFactDefinitionRow,
  type RuntimeWorkflowEdgeRow,
  type RuntimeWorkflowExecutionContextFactRow,
  type RuntimeWorkflowStepDefinitionRow,
  type UpsertRuntimeFormStepExecutionStateParams,
} from "../../repositories/step-execution-repository";
import { ProjectFactRepository } from "../../repositories/project-fact-repository";
import { WorkUnitFactRepository } from "../../repositories/work-unit-fact-repository";
import {
  ActionStepDetailService,
  ActionStepDetailServiceLive,
} from "../../services/action-step-detail-service";
import {
  ActionStepRuntimeService,
  ActionStepRuntimeServiceLive,
} from "../../services/action-step-runtime-service";

const now = new Date("2026-04-17T12:00:00.000Z");

function makeAction(
  id: string,
  params: {
    key: string;
    sortOrder: number;
    contextFactDefinitionId: string;
    contextFactKind: WorkflowContextFactDto["kind"] &
      ("bound_fact" | "artifact_slot_reference_fact");
    enabled?: boolean;
    items?: ReadonlyArray<{
      itemId: string;
      itemKey: string;
      label?: string;
      sortOrder: number;
      targetContextFactDefinitionId?: string;
    }>;
  },
) {
  return {
    actionId: id,
    actionKey: params.key,
    label: params.key,
    enabled: params.enabled ?? true,
    sortOrder: params.sortOrder,
    actionKind: "propagation" as const,
    contextFactDefinitionId: params.contextFactDefinitionId,
    contextFactKind: params.contextFactKind,
    items: params.items ?? [
      {
        itemId: `${id}-item-1`,
        itemKey: `${params.key}-item-1`,
        label: `${params.key} item`,
        sortOrder: 10,
      },
    ],
  };
}

function makeTestContext(options?: {
  executionMode?: ActionStepPayload["executionMode"];
  actions?: readonly ReturnType<typeof makeAction>[];
  contextFacts?: readonly RuntimeWorkflowExecutionContextFactRow[];
}) {
  const actions =
    options?.actions ??
    ([
      makeAction("action-1", {
        key: "bound-primary",
        sortOrder: 10,
        contextFactDefinitionId: "ctx-bound-1",
        contextFactKind: "bound_fact",
      }),
      makeAction("action-2", {
        key: "definition-secondary",
        sortOrder: 20,
        contextFactDefinitionId: "ctx-definition-1",
        contextFactKind: "bound_fact",
      }),
      makeAction("action-3", {
        key: "artifact-tertiary",
        sortOrder: 30,
        contextFactDefinitionId: "ctx-artifact-1",
        contextFactKind: "artifact_slot_reference_fact",
      }),
    ] as const);

  const actionStepPayload: ActionStepPayload = {
    key: "action-step",
    label: "Action Step",
    executionMode: options?.executionMode ?? "sequential",
    actions,
  };

  const stepExecution: RuntimeStepExecutionRow = {
    id: "step-exec-action-1",
    workflowExecutionId: "workflow-exec-1",
    stepDefinitionId: "action-step-1",
    stepType: "action",
    status: "active",
    activatedAt: now,
    completedAt: null,
    previousStepExecutionId: null,
  };

  const workflowDetail: WorkflowExecutionDetailReadModel = {
    workflowExecution: {
      id: "workflow-exec-1",
      transitionExecutionId: "transition-exec-1",
      workflowId: "workflow-1",
      workflowRole: "primary",
      status: "active",
      currentStepExecutionId: stepExecution.id,
      supersededByWorkflowExecutionId: null,
      startedAt: now,
      completedAt: null,
      supersededAt: null,
    },
    transitionExecution: {
      id: "transition-exec-1",
      projectWorkUnitId: "work-unit-1",
      transitionId: "transition-1",
      status: "active",
      primaryWorkflowExecutionId: "workflow-exec-1",
      supersededByTransitionExecutionId: null,
      startedAt: now,
      completedAt: null,
      supersededAt: null,
    },
    projectId: "project-1",
    projectWorkUnitId: "work-unit-1",
    workUnitTypeId: "wu-parent",
    currentStateId: "state-active",
  };

  const workflowContextFacts: WorkflowContextFactDto[] = [
    {
      kind: "bound_fact",
      contextFactDefinitionId: "ctx-bound-1",
      key: "boundPrimary",
      label: "Bound Primary",
      cardinality: "one",
      factDefinitionId: "external-bound-1",
    },
    {
      kind: "bound_fact",
      contextFactDefinitionId: "ctx-definition-1",
      key: "definitionSecondary",
      label: "Definition Secondary",
      cardinality: "one",
      factDefinitionId: "external-definition-1",
    },
    {
      kind: "artifact_slot_reference_fact",
      contextFactDefinitionId: "ctx-artifact-1",
      key: "artifactTertiary",
      label: "Artifact Tertiary",
      cardinality: "one",
      slotDefinitionId: "slot-1",
    },
  ];

  const contextFacts: RuntimeWorkflowExecutionContextFactRow[] = [
    ...(options?.contextFacts ?? [
      {
        id: "ctx-row-bound-1",
        workflowExecutionId: stepExecution.workflowExecutionId,
        contextFactDefinitionId: "ctx-bound-1",
        instanceOrder: 0,
        valueJson: { factInstanceId: "external-1", value: { title: "bound" } },
        sourceStepExecutionId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "ctx-row-definition-1",
        workflowExecutionId: stepExecution.workflowExecutionId,
        contextFactDefinitionId: "ctx-definition-1",
        instanceOrder: 0,
        valueJson: { title: "definition" },
        sourceStepExecutionId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "ctx-row-artifact-1",
        workflowExecutionId: stepExecution.workflowExecutionId,
        contextFactDefinitionId: "ctx-artifact-1",
        instanceOrder: 0,
        valueJson: { relativePath: "docs/plan.md" },
        sourceStepExecutionId: null,
        createdAt: now,
        updatedAt: now,
      },
    ]),
  ];

  const rootRows: ActionStepExecutionRow[] = [];
  const actionRows: ActionStepExecutionActionRow[] = [];
  const itemRows: ActionStepExecutionActionItemRow[] = [];
  const projectFactRows: Array<{
    id: string;
    projectId: string;
    factDefinitionId: string;
    valueJson: unknown;
    status: "active";
    supersededByFactInstanceId: null;
    producedByTransitionExecutionId: string | null;
    producedByWorkflowExecutionId: string | null;
    authoredByUserId: null;
    createdAt: Date;
  }> = [];
  const workUnitFactRows: Array<{
    id: string;
    projectWorkUnitId: string;
    factDefinitionId: string;
    valueJson: unknown;
    referencedProjectWorkUnitId: null;
    status: "active";
    supersededByFactInstanceId: null;
    producedByTransitionExecutionId: string | null;
    producedByWorkflowExecutionId: string | null;
    authoredByUserId: null;
    createdAt: Date;
  }> = [];
  const artifactSnapshotRows: Array<{
    id: string;
    projectWorkUnitId: string;
    slotDefinitionId: string;
    recordedByTransitionExecutionId: string | null;
    recordedByWorkflowExecutionId: string | null;
    recordedByUserId: string | null;
    supersededByProjectArtifactSnapshotId: string | null;
    createdAt: Date;
  }> = [];
  const artifactSnapshotFileRows: Array<{
    id: string;
    artifactSnapshotId: string;
    filePath: string;
    memberStatus: "present" | "removed";
    gitCommitHash: string | null;
    gitBlobHash: string | null;
    gitCommitTitle: string | null;
    gitCommitBody: string | null;
  }> = [];

  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

  const stepRepoLayer = Layer.succeed(StepExecutionRepository, {
    createStepExecution: () => Effect.die("unused"),
    getStepExecutionById: (stepExecutionId: string) =>
      Effect.succeed(stepExecutionId === stepExecution.id ? stepExecution : null),
    findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
    listStepExecutionsForWorkflow: () => Effect.succeed([stepExecution]),
    completeStepExecution: ({ stepExecutionId }: { stepExecutionId: string }) =>
      Effect.sync(() => {
        if (stepExecutionId !== stepExecution.id) {
          return null;
        }
        stepExecution.status = "completed";
        stepExecution.completedAt = new Date(now.getTime() + 60_000);
        return stepExecution;
      }),
    createFormStepExecutionState: () => Effect.die("unused"),
    upsertFormStepExecutionState: (_params: UpsertRuntimeFormStepExecutionStateParams) =>
      Effect.die("unused"),
    getFormStepExecutionState: () => Effect.succeed<RuntimeFormStepExecutionStateRow | null>(null),
    replaceWorkflowExecutionContextFacts: ({
      workflowExecutionId,
      sourceStepExecutionId,
      affectedContextFactDefinitionIds,
      currentValues,
    }: {
      workflowExecutionId: string;
      sourceStepExecutionId: string | null;
      affectedContextFactDefinitionIds: readonly string[];
      currentValues: readonly {
        contextFactDefinitionId: string;
        instanceOrder: number;
        valueJson: unknown;
      }[];
    }) =>
      Effect.sync(() => {
        for (let index = contextFacts.length - 1; index >= 0; index -= 1) {
          if (
            contextFacts[index]?.workflowExecutionId === workflowExecutionId &&
            affectedContextFactDefinitionIds.includes(contextFacts[index]!.contextFactDefinitionId)
          ) {
            contextFacts.splice(index, 1);
          }
        }

        const inserted = currentValues.map(
          (value) =>
            ({
              id: nextId("ctx-row"),
              workflowExecutionId,
              contextFactDefinitionId: value.contextFactDefinitionId,
              instanceOrder: value.instanceOrder,
              valueJson: value.valueJson,
              sourceStepExecutionId,
              createdAt: new Date(now.getTime() + idCounter * 1_000),
              updatedAt: new Date(now.getTime() + idCounter * 1_000),
            }) satisfies RuntimeWorkflowExecutionContextFactRow,
        );

        contextFacts.push(...inserted);
        return inserted;
      }),
    listWorkflowExecutionContextFacts: (workflowExecutionId: string) =>
      Effect.succeed(contextFacts.filter((row) => row.workflowExecutionId === workflowExecutionId)),
    listWorkflowContextFactDefinitions: () =>
      Effect.succeed<readonly RuntimeWorkflowContextFactDefinitionRow[]>([]),
    listWorkflowStepDefinitions: () =>
      Effect.succeed<readonly RuntimeWorkflowStepDefinitionRow[]>([]),
    listWorkflowEdges: () => Effect.succeed<readonly RuntimeWorkflowEdgeRow[]>([]),
  } as unknown as Context.Tag.Service<typeof StepExecutionRepository>);

  const executionReadRepoLayer = Layer.succeed(ExecutionReadRepository, {
    getTransitionExecutionDetail: () => Effect.die("unused"),
    listTransitionExecutionsForWorkUnit: () => Effect.die("unused"),
    getWorkflowExecutionDetail: (workflowExecutionId: string) =>
      Effect.succeed(
        workflowExecutionId === workflowDetail.workflowExecution.id ? workflowDetail : null,
      ),
    listWorkflowExecutionsForTransition: () => Effect.die("unused"),
    listActiveWorkflowExecutionsByProject: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);

  const projectContextLayer = Layer.succeed(ProjectContextRepository, {
    findProjectPin: (projectId: string) =>
      Effect.succeed(
        projectId === workflowDetail.projectId
          ? {
              projectId,
              methodologyVersionId: "version-1",
              methodologyId: "methodology-1",
              methodologyKey: "core",
              publishedVersion: "1.0.0",
              actorId: null,
              createdAt: now,
              updatedAt: now,
            }
          : null,
      ),
  } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);

  const lifecycleLayer = Layer.succeed(LifecycleRepository, {
    findWorkUnitTypes: () =>
      Effect.succeed([
        {
          id: "wu-parent",
          methodologyVersionId: "version-1",
          key: "WU.PARENT",
          displayName: "Parent",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "one" as const,
          createdAt: now,
          updatedAt: now,
        },
      ]),
    findLifecycleStates: () => Effect.die("unused"),
    findLifecycleTransitions: () => Effect.die("unused"),
    findFactSchemas: () =>
      Effect.succeed([
        {
          id: "external-bound-1",
          methodologyVersionId: "version-1",
          workUnitTypeId: "wu-parent",
          key: "external-bound-1",
          name: "External Bound 1",
          factType: "json" as const,
          cardinality: "one" as const,
          validationJson: null,
          createdAt: now,
          updatedAt: now,
        },
      ]),
    findTransitionConditionSets: () => Effect.die("unused"),
    findAgentTypes: () => Effect.die("unused"),
    findTransitionWorkflowBindings: () => Effect.die("unused"),
    saveLifecycleDefinition: () => Effect.die("unused"),
    recordLifecycleEvent: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

  const methodologyLayer = Layer.succeed(MethodologyRepository, {
    getActionStepDefinition: ({ stepId }: { stepId: string }) =>
      Effect.succeed(
        stepId === stepExecution.stepDefinitionId
          ? {
              stepId,
              payload: actionStepPayload,
            }
          : null,
      ),
    getWorkflowEditorDefinition: () =>
      Effect.succeed({
        workflow: {
          workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
          key: "workflow-1",
          displayName: "Workflow 1",
          descriptionJson: null,
        },
        steps: [],
        edges: [],
        contextFacts: workflowContextFacts,
        formDefinitions: [],
      }),
    findFactDefinitionsByVersionId: () =>
      Effect.succeed([
        {
          id: "external-definition-1",
          methodologyVersionId: "version-1",
          key: "external-definition-1",
          name: "External Definition 1",
          descriptionJson: null,
          factType: "json" as const,
          cardinality: "one" as const,
          validationJson: null,
          createdAt: now,
          updatedAt: now,
        },
      ]),
    findArtifactSlotsByWorkUnitType: () =>
      Effect.succeed([
        {
          id: "slot-1",
          methodologyVersionId: "version-1",
          workUnitTypeId: "wu-parent",
          key: "PROJECT_OVERVIEW",
          displayName: "Project Overview",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "fileset" as const,
          rulesJson: null,
          createdAt: now,
          updatedAt: now,
        },
      ]),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

  const projectFactRepoLayer = Layer.succeed(ProjectFactRepository, {
    createFactInstance: ({
      projectId,
      factDefinitionId,
      valueJson,
      producedByTransitionExecutionId,
      producedByWorkflowExecutionId,
      authoredByUserId,
    }: {
      projectId: string;
      factDefinitionId: string;
      valueJson: unknown;
      producedByTransitionExecutionId?: string | null;
      producedByWorkflowExecutionId?: string | null;
      authoredByUserId?: string | null;
    }) =>
      Effect.sync(() => {
        const created = {
          id: nextId("project-fact"),
          projectId,
          factDefinitionId,
          valueJson,
          status: "active" as const,
          supersededByFactInstanceId: null,
          producedByTransitionExecutionId: producedByTransitionExecutionId ?? null,
          producedByWorkflowExecutionId: producedByWorkflowExecutionId ?? null,
          authoredByUserId: authoredByUserId ?? null,
          createdAt: new Date(now.getTime() + idCounter * 1_000),
        };
        projectFactRows.push(created);
        return created;
      }),
    getCurrentValuesByDefinition: () => Effect.die("unused"),
    listFactsByProject: () => Effect.succeed(projectFactRows),
    supersedeFactInstance: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ProjectFactRepository>);

  const workUnitFactRepoLayer = Layer.succeed(WorkUnitFactRepository, {
    createFactInstance: ({
      projectWorkUnitId,
      factDefinitionId,
      valueJson,
      referencedProjectWorkUnitId,
      producedByTransitionExecutionId,
      producedByWorkflowExecutionId,
      authoredByUserId,
    }: {
      projectWorkUnitId: string;
      factDefinitionId: string;
      valueJson?: unknown;
      referencedProjectWorkUnitId?: string | null;
      producedByTransitionExecutionId?: string | null;
      producedByWorkflowExecutionId?: string | null;
      authoredByUserId?: string | null;
    }) =>
      Effect.sync(() => {
        const created = {
          id: nextId("work-unit-fact"),
          projectWorkUnitId,
          factDefinitionId,
          valueJson: valueJson ?? null,
          referencedProjectWorkUnitId: referencedProjectWorkUnitId ?? null,
          status: "active" as const,
          supersededByFactInstanceId: null,
          producedByTransitionExecutionId: producedByTransitionExecutionId ?? null,
          producedByWorkflowExecutionId: producedByWorkflowExecutionId ?? null,
          authoredByUserId: authoredByUserId ?? null,
          createdAt: new Date(now.getTime() + idCounter * 1_000),
        };
        workUnitFactRows.push(created);
        return created;
      }),
    getCurrentValuesByDefinition: () => Effect.die("unused"),
    listFactsByWorkUnit: () => Effect.succeed(workUnitFactRows),
    supersedeFactInstance: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>);

  const artifactRepoLayer = Layer.succeed(ArtifactRepository, {
    createSnapshot: ({
      projectWorkUnitId,
      slotDefinitionId,
      recordedByTransitionExecutionId,
      recordedByWorkflowExecutionId,
      recordedByUserId,
      supersededByProjectArtifactSnapshotId,
    }: {
      projectWorkUnitId: string;
      slotDefinitionId: string;
      recordedByTransitionExecutionId?: string | null;
      recordedByWorkflowExecutionId?: string | null;
      recordedByUserId?: string | null;
      supersededByProjectArtifactSnapshotId?: string | null;
    }) =>
      Effect.sync(() => {
        const created = {
          id: nextId("artifact-snapshot"),
          projectWorkUnitId,
          slotDefinitionId,
          recordedByTransitionExecutionId: recordedByTransitionExecutionId ?? null,
          recordedByWorkflowExecutionId: recordedByWorkflowExecutionId ?? null,
          recordedByUserId: recordedByUserId ?? null,
          supersededByProjectArtifactSnapshotId: null,
          createdAt: new Date(now.getTime() + idCounter * 1_000),
        };
        artifactSnapshotRows.push(created);

        if (supersededByProjectArtifactSnapshotId) {
          const superseded = artifactSnapshotRows.find(
            (row) => row.id === supersededByProjectArtifactSnapshotId,
          );
          if (superseded) {
            superseded.supersededByProjectArtifactSnapshotId = created.id;
          }
        }

        return created;
      }),
    addSnapshotFiles: ({
      artifactSnapshotId,
      files,
    }: {
      artifactSnapshotId: string;
      files: ReadonlyArray<{
        filePath: string;
        memberStatus: "present" | "removed";
        gitCommitHash?: string | null;
        gitBlobHash?: string | null;
        gitCommitTitle?: string | null;
        gitCommitBody?: string | null;
      }>;
    }) =>
      Effect.sync(() => {
        const inserted = files.map((file) => ({
          id: nextId("artifact-file"),
          artifactSnapshotId,
          filePath: file.filePath,
          memberStatus: file.memberStatus,
          gitCommitHash: file.gitCommitHash ?? null,
          gitBlobHash: file.gitBlobHash ?? null,
          gitCommitTitle: file.gitCommitTitle ?? null,
          gitCommitBody: file.gitCommitBody ?? null,
        }));
        artifactSnapshotFileRows.push(...inserted);
        return inserted;
      }),
    getCurrentSnapshotBySlot: ({
      projectWorkUnitId,
      slotDefinitionId,
    }: {
      projectWorkUnitId: string;
      slotDefinitionId: string;
    }) =>
      Effect.sync(() => {
        const snapshots = artifactSnapshotRows.filter(
          (row) =>
            row.projectWorkUnitId === projectWorkUnitId &&
            row.slotDefinitionId === slotDefinitionId,
        );
        const head = snapshots
          .filter((row) => row.supersededByProjectArtifactSnapshotId === null)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];

        if (!head) {
          return { exists: false, snapshot: null, members: [] };
        }

        const parentByChild = new Map<string, (typeof snapshots)[number]>();
        for (const snapshot of snapshots) {
          if (snapshot.supersededByProjectArtifactSnapshotId) {
            parentByChild.set(snapshot.supersededByProjectArtifactSnapshotId, snapshot);
          }
        }

        const lineage: (typeof snapshots)[number][] = [head];
        let cursor = head;
        while (true) {
          const parent = parentByChild.get(cursor.id);
          if (!parent) {
            break;
          }
          lineage.push(parent);
          cursor = parent;
        }

        const effectiveByPath = new Map<string, (typeof artifactSnapshotFileRows)[number]>();
        for (const snapshot of [...lineage].reverse()) {
          const deltaRows = artifactSnapshotFileRows.filter(
            (row) => row.artifactSnapshotId === snapshot.id,
          );
          for (const deltaRow of deltaRows) {
            if (deltaRow.memberStatus === "removed") {
              effectiveByPath.delete(deltaRow.filePath);
            } else {
              effectiveByPath.set(deltaRow.filePath, deltaRow);
            }
          }
        }

        const members = [...effectiveByPath.values()].sort((a, b) =>
          a.filePath.localeCompare(b.filePath),
        );
        return {
          exists: members.length > 0,
          snapshot: head,
          members,
        };
      }),
    listLineageHistory: () => Effect.die("unused"),
    checkFreshness: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ArtifactRepository>);

  const runtimeRepoLayer = Layer.succeed(ActionStepRuntimeRepository, {
    createActionStepExecution: ({ stepExecutionId }: { stepExecutionId: string }) =>
      Effect.sync(() => {
        const existing = rootRows.find((row) => row.stepExecutionId === stepExecutionId);
        if (existing) {
          return existing;
        }
        const created = {
          id: nextId("action-root"),
          stepExecutionId,
          createdAt: new Date(now.getTime() + idCounter * 1_000),
          updatedAt: new Date(now.getTime() + idCounter * 1_000),
        } satisfies ActionStepExecutionRow;
        rootRows.push(created);
        return created;
      }),
    getActionStepExecutionByStepExecutionId: (stepExecutionId: string) =>
      Effect.succeed(rootRows.find((row) => row.stepExecutionId === stepExecutionId) ?? null),
    createActionExecution: ({
      stepExecutionId,
      actionDefinitionId,
      actionKind,
      status,
      resultJson,
      resultSummaryJson,
    }: {
      stepExecutionId: string;
      actionDefinitionId: string;
      actionKind: "propagation";
      status?: ActionStepExecutionActionRow["status"];
      resultJson?: unknown;
      resultSummaryJson?: unknown;
    }) =>
      Effect.sync(() => {
        const existing = actionRows.find(
          (row) =>
            row.actionDefinitionId === actionDefinitionId &&
            rootRows.some(
              (root) =>
                root.id === row.actionStepExecutionId && root.stepExecutionId === stepExecutionId,
            ),
        );
        if (existing) {
          return existing;
        }
        const root = rootRows.find((row) => row.stepExecutionId === stepExecutionId) ?? {
          id: nextId("action-root"),
          stepExecutionId,
          createdAt: now,
          updatedAt: now,
        };
        if (!rootRows.some((row) => row.id === root.id)) {
          rootRows.push(root);
        }
        const created = {
          id: nextId("action-row"),
          actionStepExecutionId: root.id,
          actionDefinitionId,
          actionKind,
          status: status ?? "running",
          resultSummaryJson: resultSummaryJson ?? null,
          resultJson: resultJson ?? null,
          createdAt: new Date(now.getTime() + idCounter * 1_000),
          updatedAt: new Date(now.getTime() + idCounter * 1_000),
        } satisfies ActionStepExecutionActionRow;
        actionRows.push(created);
        return created;
      }),
    getActionExecutionByDefinitionId: ({
      stepExecutionId,
      actionDefinitionId,
    }: {
      stepExecutionId: string;
      actionDefinitionId: string;
    }) =>
      Effect.succeed(
        actionRows.find(
          (row) =>
            row.actionDefinitionId === actionDefinitionId &&
            rootRows.some(
              (root) =>
                root.id === row.actionStepExecutionId && root.stepExecutionId === stepExecutionId,
            ),
        ) ?? null,
      ),
    listActionExecutions: (stepExecutionId: string) =>
      Effect.succeed(
        actionRows.filter((row) =>
          rootRows.some(
            (root) =>
              root.id === row.actionStepExecutionId && root.stepExecutionId === stepExecutionId,
          ),
        ),
      ),
    updateActionExecution: ({
      actionExecutionId,
      status,
      resultJson,
      resultSummaryJson,
    }: {
      actionExecutionId: string;
      status?: ActionStepExecutionActionRow["status"];
      resultJson?: unknown;
      resultSummaryJson?: unknown;
    }) =>
      Effect.sync(() => {
        const row = actionRows.find((candidate) => candidate.id === actionExecutionId) ?? null;
        if (!row) {
          return null;
        }
        if (status !== undefined) row.status = status;
        if (resultSummaryJson !== undefined) row.resultSummaryJson = resultSummaryJson;
        if (resultJson !== undefined) row.resultJson = resultJson;
        row.updatedAt = new Date(now.getTime() + idCounter * 1_000);
        return row;
      }),
    createActionExecutionItem: ({
      actionExecutionId,
      itemDefinitionId,
      status,
      resultJson,
      resultSummaryJson,
      affectedTargetsJson,
    }: {
      actionExecutionId: string;
      itemDefinitionId: string;
      status?: ActionStepExecutionActionItemRow["status"];
      resultJson?: unknown;
      resultSummaryJson?: unknown;
      affectedTargetsJson?: ActionStepExecutionActionItemRow["affectedTargetsJson"];
    }) =>
      Effect.sync(() => {
        const existing = itemRows.find(
          (row) =>
            row.actionExecutionId === actionExecutionId &&
            row.itemDefinitionId === itemDefinitionId,
        );
        if (existing) {
          return existing;
        }
        const created = {
          id: nextId("item-row"),
          actionExecutionId,
          itemDefinitionId,
          status: status ?? "running",
          resultSummaryJson: resultSummaryJson ?? null,
          resultJson: resultJson ?? null,
          affectedTargetsJson: affectedTargetsJson ?? null,
          createdAt: new Date(now.getTime() + idCounter * 1_000),
          updatedAt: new Date(now.getTime() + idCounter * 1_000),
        } satisfies ActionStepExecutionActionItemRow;
        itemRows.push(created);
        return created;
      }),
    getActionExecutionItemByDefinitionId: ({
      actionExecutionId,
      itemDefinitionId,
    }: {
      actionExecutionId: string;
      itemDefinitionId: string;
    }) =>
      Effect.succeed(
        itemRows.find(
          (row) =>
            row.actionExecutionId === actionExecutionId &&
            row.itemDefinitionId === itemDefinitionId,
        ) ?? null,
      ),
    listActionExecutionItems: (actionExecutionId: string) =>
      Effect.succeed(itemRows.filter((row) => row.actionExecutionId === actionExecutionId)),
    updateActionExecutionItem: ({
      actionExecutionId,
      itemDefinitionId,
      status,
      resultJson,
      resultSummaryJson,
      affectedTargetsJson,
    }: {
      actionExecutionId: string;
      itemDefinitionId: string;
      status?: ActionStepExecutionActionItemRow["status"];
      resultJson?: unknown;
      resultSummaryJson?: unknown;
      affectedTargetsJson?: ActionStepExecutionActionItemRow["affectedTargetsJson"];
    }) =>
      Effect.sync(() => {
        const row =
          itemRows.find(
            (candidate) =>
              candidate.actionExecutionId === actionExecutionId &&
              candidate.itemDefinitionId === itemDefinitionId,
          ) ?? null;
        if (!row) {
          return null;
        }
        if (status !== undefined) row.status = status;
        if (resultSummaryJson !== undefined) row.resultSummaryJson = resultSummaryJson;
        if (resultJson !== undefined) row.resultJson = resultJson;
        if (affectedTargetsJson !== undefined) row.affectedTargetsJson = affectedTargetsJson;
        row.updatedAt = new Date(now.getTime() + idCounter * 1_000);
        return row;
      }),
  } as unknown as Context.Tag.Service<typeof ActionStepRuntimeRepository>);

  const baseLayer = Layer.mergeAll(
    stepRepoLayer,
    executionReadRepoLayer,
    projectContextLayer,
    lifecycleLayer,
    methodologyLayer,
    runtimeRepoLayer,
    projectFactRepoLayer,
    workUnitFactRepoLayer,
    artifactRepoLayer,
  );

  const runtimeLayer = Layer.provide(ActionStepRuntimeServiceLive, baseLayer);
  const detailLayer = Layer.provide(
    ActionStepDetailServiceLive,
    Layer.mergeAll(baseLayer, runtimeLayer),
  );

  return {
    stepExecution,
    workflowDetail,
    contextFacts,
    workflowContextFacts,
    rootRows,
    actionRows,
    itemRows,
    projectFactRows,
    workUnitFactRows,
    artifactSnapshotRows,
    artifactSnapshotFileRows,
    runtimeLayer,
    detailLayer,
  };
}

describe("ActionStep runtime services", () => {
  it("starts sequential steps and persists missing external facts with real ids", async () => {
    const ctx = makeTestContext({
      executionMode: "sequential",
      actions: [
        makeAction("action-1", {
          key: "bound-primary",
          sortOrder: 10,
          contextFactDefinitionId: "ctx-bound-1",
          contextFactKind: "bound_fact",
        }),
        makeAction("action-2", {
          key: "definition-secondary",
          sortOrder: 20,
          contextFactDefinitionId: "ctx-definition-1",
          contextFactKind: "bound_fact",
        }),
        makeAction("action-3", {
          key: "artifact-tertiary",
          sortOrder: 30,
          contextFactDefinitionId: "ctx-artifact-1",
          contextFactKind: "artifact_slot_reference_fact",
        }),
      ],
      contextFacts: [
        {
          id: "ctx-bound-success",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-bound-1",
          instanceOrder: 0,
          valueJson: { factInstanceId: "external-1", value: { ok: true } },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "ctx-definition-missing-bound",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-definition-1",
          instanceOrder: 0,
          valueJson: { value: { title: "needs bind" } },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "ctx-artifact-success",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-artifact-1",
          instanceOrder: 0,
          valueJson: {
            relativePath: "docs/final.md",
            gitCommitHash: "commit-1",
            gitBlobHash: "blob-1",
            gitCommitSubject: "seed artifact",
            gitCommitBody: "body-1",
          },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    expect(ctx.rootRows).toHaveLength(0);
    expect(ctx.actionRows).toHaveLength(0);

    const started = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.startExecution({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(started).toEqual({ stepExecutionId: ctx.stepExecution.id, result: "started" });
    expect(ctx.rootRows).toHaveLength(1);
    expect(ctx.actionRows.map((row) => [row.actionDefinitionId, row.status])).toEqual([
      ["action-1", "succeeded"],
      ["action-2", "succeeded"],
      ["action-3", "succeeded"],
    ]);
    expect(ctx.projectFactRows).toHaveLength(1);
    expect(ctx.projectFactRows[0]).toMatchObject({
      factDefinitionId: "external-definition-1",
      valueJson: { value: { title: "needs bind" } },
    });
    expect(
      ctx.contextFacts.find((row) => row.contextFactDefinitionId === "ctx-definition-1")?.valueJson,
    ).toEqual({
      instanceId: ctx.projectFactRows[0]?.id,
      value: { value: { title: "needs bind" } },
    });
    expect(ctx.artifactSnapshotRows).toHaveLength(1);
    expect(ctx.artifactSnapshotRows[0]).toMatchObject({
      projectWorkUnitId: "work-unit-1",
      slotDefinitionId: "slot-1",
      recordedByTransitionExecutionId: "transition-exec-1",
      recordedByWorkflowExecutionId: "workflow-exec-1",
      supersededByProjectArtifactSnapshotId: null,
    });
    expect(ctx.artifactSnapshotFileRows).toEqual([
      expect.objectContaining({
        artifactSnapshotId: ctx.artifactSnapshotRows[0]?.id,
        filePath: "docs/final.md",
        memberStatus: "present",
        gitCommitHash: "commit-1",
        gitBlobHash: "blob-1",
        gitCommitTitle: "seed artifact",
        gitCommitBody: "body-1",
      }),
    ]);
  });

  it("resolves artifact slot references provided as slot key before snapshot insert", async () => {
    const ctx = makeTestContext({ executionMode: "sequential" });
    const artifactFact = ctx.workflowContextFacts.find(
      (fact) =>
        fact.kind === "artifact_slot_reference_fact" &&
        fact.contextFactDefinitionId === "ctx-artifact-1",
    );
    if (!artifactFact) {
      throw new Error("Expected artifact context fact in test fixture");
    }
    artifactFact.slotDefinitionId = "PROJECT_OVERVIEW";

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.startExecution({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(ctx.artifactSnapshotRows).toHaveLength(1);
    expect(ctx.artifactSnapshotRows[0]?.slotDefinitionId).toBe("slot-1");
  });

  it("fails before snapshot insert when artifact slot reference cannot be resolved", async () => {
    const ctx = makeTestContext({ executionMode: "sequential" });
    const artifactFact = ctx.workflowContextFacts.find(
      (fact) =>
        fact.kind === "artifact_slot_reference_fact" &&
        fact.contextFactDefinitionId === "ctx-artifact-1",
    );
    if (!artifactFact) {
      throw new Error("Expected artifact context fact in test fixture");
    }
    artifactFact.slotDefinitionId = "UNKNOWN_SLOT";

    const result = await Effect.runPromise(
      Effect.either(
        Effect.gen(function* () {
          const service = yield* ActionStepRuntimeService;
          return yield* service.startExecution({
            projectId: "project-1",
            stepExecutionId: ctx.stepExecution.id,
          });
        }).pipe(Effect.provide(ctx.runtimeLayer)),
      ),
    );

    expect(result._tag).toBe("Left");
    expect(ctx.artifactSnapshotRows).toHaveLength(0);
  });

  it("creates artifact snapshot deltas when propagation changes slot members", async () => {
    const ctx = makeTestContext({
      executionMode: "sequential",
      actions: [
        makeAction("action-artifact-a", {
          key: "artifact-a",
          sortOrder: 10,
          contextFactDefinitionId: "ctx-artifact-1",
          contextFactKind: "artifact_slot_reference_fact",
        }),
        makeAction("action-artifact-b", {
          key: "artifact-b",
          sortOrder: 20,
          contextFactDefinitionId: "ctx-artifact-2",
          contextFactKind: "artifact_slot_reference_fact",
        }),
      ],
      contextFacts: [
        {
          id: "ctx-artifact-a",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-artifact-1",
          instanceOrder: 0,
          valueJson: { relativePath: "docs/a.md" },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "ctx-artifact-b",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-artifact-2",
          instanceOrder: 0,
          valueJson: { relativePath: "docs/b.md" },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    ctx.workflowContextFacts.push({
      kind: "artifact_slot_reference_fact",
      contextFactDefinitionId: "ctx-artifact-2",
      key: "artifactSecondary",
      label: "Artifact Secondary",
      cardinality: "one",
      slotDefinitionId: "slot-1",
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.startExecution({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(ctx.artifactSnapshotRows).toHaveLength(2);

    const [first, second] = ctx.artifactSnapshotRows;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first?.supersededByProjectArtifactSnapshotId).toBe(second?.id ?? null);

    const firstDelta = ctx.artifactSnapshotFileRows.filter(
      (row) => row.artifactSnapshotId === first?.id,
    );
    const secondDelta = ctx.artifactSnapshotFileRows.filter(
      (row) => row.artifactSnapshotId === second?.id,
    );

    expect(firstDelta).toEqual([
      expect.objectContaining({ filePath: "docs/a.md", memberStatus: "present" }),
    ]);
    expect(secondDelta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ filePath: "docs/a.md", memberStatus: "removed" }),
        expect.objectContaining({ filePath: "docs/b.md", memberStatus: "present" }),
      ]),
    );
  });

  it("creates metadata-only delta snapshots when file path stays the same", async () => {
    const ctx = makeTestContext({
      executionMode: "sequential",
      actions: [
        makeAction("action-artifact-v1", {
          key: "artifact-v1",
          sortOrder: 10,
          contextFactDefinitionId: "ctx-artifact-1",
          contextFactKind: "artifact_slot_reference_fact",
        }),
        makeAction("action-artifact-v2", {
          key: "artifact-v2",
          sortOrder: 20,
          contextFactDefinitionId: "ctx-artifact-2",
          contextFactKind: "artifact_slot_reference_fact",
        }),
      ],
      contextFacts: [
        {
          id: "ctx-artifact-v1",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-artifact-1",
          instanceOrder: 0,
          valueJson: {
            relativePath: "docs/shared.md",
            gitCommitHash: "commit-v1",
            gitBlobHash: "blob-v1",
            gitCommitTitle: "title-v1",
            gitCommitBody: "body-v1",
          },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "ctx-artifact-v2",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-artifact-2",
          instanceOrder: 0,
          valueJson: {
            relativePath: "docs/shared.md",
            gitCommitHash: "commit-v2",
            gitBlobHash: "blob-v2",
            gitCommitTitle: "title-v2",
            gitCommitBody: "body-v2",
          },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    ctx.workflowContextFacts.push({
      kind: "artifact_slot_reference_fact",
      contextFactDefinitionId: "ctx-artifact-2",
      key: "artifactSecondary",
      label: "Artifact Secondary",
      cardinality: "one",
      slotDefinitionId: "slot-1",
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.startExecution({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(ctx.artifactSnapshotRows).toHaveLength(2);

    const [first, second] = ctx.artifactSnapshotRows;
    const secondDelta = ctx.artifactSnapshotFileRows.filter(
      (row) => row.artifactSnapshotId === second?.id,
    );

    expect(first?.supersededByProjectArtifactSnapshotId).toBe(second?.id ?? null);
    expect(secondDelta).toEqual([
      expect.objectContaining({
        filePath: "docs/shared.md",
        memberStatus: "present",
        gitCommitHash: "commit-v2",
        gitBlobHash: "blob-v2",
        gitCommitTitle: "title-v2",
        gitCommitBody: "body-v2",
      }),
    ]);
  });

  it("aggregates same-slot multi-item artifact propagation into one snapshot", async () => {
    const ctx = makeTestContext({
      executionMode: "parallel",
      actions: [
        makeAction("action-artifact-multi", {
          key: "artifact-multi-slot",
          sortOrder: 10,
          contextFactDefinitionId: "ctx-artifact-1",
          contextFactKind: "artifact_slot_reference_fact",
          items: [
            { itemId: "item-a", itemKey: "item.a", sortOrder: 10 },
            {
              itemId: "item-b",
              itemKey: "item.b",
              sortOrder: 20,
              targetContextFactDefinitionId: "ctx-artifact-2",
            },
          ],
        }),
      ],
      contextFacts: [
        {
          id: "ctx-artifact-a",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-artifact-1",
          instanceOrder: 0,
          valueJson: { relativePath: "docs/a.md" },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "ctx-artifact-b",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-artifact-2",
          instanceOrder: 0,
          valueJson: { relativePath: "docs/b.md" },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    ctx.workflowContextFacts.push({
      kind: "artifact_slot_reference_fact",
      contextFactDefinitionId: "ctx-artifact-2",
      key: "artifactSecondary",
      label: "Artifact Secondary",
      cardinality: "one",
      slotDefinitionId: "slot-1",
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.runActions({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
          actionIds: ["action-artifact-multi"],
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(ctx.artifactSnapshotRows).toHaveLength(1);
    expect(ctx.artifactSnapshotFileRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ filePath: "docs/a.md", memberStatus: "present" }),
        expect.objectContaining({ filePath: "docs/b.md", memberStatus: "present" }),
      ]),
    );
  });

  it("runs only selected actions in parallel and leaves unselected actions lazy", async () => {
    const ctx = makeTestContext({ executionMode: "parallel" });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.runActions({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
          actionIds: ["action-2", "action-3"],
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(result.actionResults).toEqual([
      { actionId: "action-2", result: "started" },
      { actionId: "action-3", result: "started" },
    ]);
    expect(ctx.actionRows.map((row) => row.actionDefinitionId).sort()).toEqual([
      "action-2",
      "action-3",
    ]);
    expect(ctx.actionRows.find((row) => row.actionDefinitionId === "action-1")).toBeUndefined();
    expect(ctx.projectFactRows).toHaveLength(1);
    expect(
      ctx.contextFacts.find((row) => row.contextFactDefinitionId === "ctx-definition-1")?.valueJson,
    ).toEqual({
      instanceId: ctx.projectFactRows[0]?.id,
      value: { title: "definition" },
    });
  });

  it("creates persisted work-unit and project fact instances for missing external envelopes", async () => {
    const ctx = makeTestContext({
      executionMode: "parallel",
      contextFacts: [
        {
          id: "ctx-bound-create",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-bound-1",
          instanceOrder: 0,
          valueJson: { title: "bound missing instance" },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "ctx-definition-create",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-definition-1",
          instanceOrder: 0,
          valueJson: { title: "definition missing instance" },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.runActions({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
          actionIds: ["action-1", "action-2"],
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(ctx.workUnitFactRows).toHaveLength(1);
    expect(ctx.projectFactRows).toHaveLength(1);
    expect(ctx.workUnitFactRows[0]).toMatchObject({
      projectWorkUnitId: "work-unit-1",
      factDefinitionId: "external-bound-1",
      valueJson: { title: "bound missing instance" },
      producedByWorkflowExecutionId: "workflow-exec-1",
    });
    expect(ctx.projectFactRows[0]).toMatchObject({
      projectId: "project-1",
      factDefinitionId: "external-definition-1",
      valueJson: { title: "definition missing instance" },
      producedByWorkflowExecutionId: "workflow-exec-1",
    });
    expect(
      ctx.contextFacts.find((row) => row.contextFactDefinitionId === "ctx-bound-1")?.valueJson,
    ).toEqual({
      instanceId: ctx.workUnitFactRows[0]?.id,
      value: { title: "bound missing instance" },
    });
    expect(
      ctx.contextFacts.find((row) => row.contextFactDefinitionId === "ctx-definition-1")?.valueJson,
    ).toEqual({
      instanceId: ctx.projectFactRows[0]?.id,
      value: { title: "definition missing instance" },
    });
  });

  it("keeps grouped actions but resolves affected targets per item override", async () => {
    const ctx = makeTestContext({
      executionMode: "parallel",
      actions: [
        makeAction("action-grouped", {
          key: "grouped-targets",
          sortOrder: 10,
          contextFactDefinitionId: "ctx-bound-1",
          contextFactKind: "bound_fact",
          items: [
            {
              itemId: "item-bound-default",
              itemKey: "group.bound.default",
              label: "Bound default",
              sortOrder: 10,
            },
            {
              itemId: "item-bound-override",
              itemKey: "group.bound.override",
              label: "Bound override",
              sortOrder: 20,
              targetContextFactDefinitionId: "ctx-bound-2",
            },
          ],
        }),
      ],
      contextFacts: [
        {
          id: "ctx-row-bound-1",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-bound-1",
          instanceOrder: 0,
          valueJson: { factInstanceId: "external-1", value: { title: "bound one" } },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "ctx-row-bound-2",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-bound-2",
          instanceOrder: 0,
          valueJson: { factInstanceId: "external-2", value: { title: "bound two" } },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    ctx.workflowContextFacts.push({
      kind: "bound_fact",
      contextFactDefinitionId: "ctx-bound-2",
      key: "boundOverride",
      label: "Bound Override",
      cardinality: "one",
      factDefinitionId: "external-bound-1",
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.runActions({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
          actionIds: ["action-grouped"],
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    const defaultItem = ctx.itemRows.find((row) => row.itemDefinitionId === "item-bound-default");
    const overrideItem = ctx.itemRows.find((row) => row.itemDefinitionId === "item-bound-override");

    expect(defaultItem?.affectedTargetsJson).toEqual([
      {
        targetKind: "external_fact",
        targetState: "exists",
        targetId: "external-1",
        label: "Bound Primary",
      },
    ]);
    expect(overrideItem?.affectedTargetsJson).toEqual([
      {
        targetKind: "external_fact",
        targetState: "exists",
        targetId: "external-2",
        label: "Bound Override",
      },
    ]);
  });

  it("blocks sequential skip-ahead runs and disables later actions in canonical detail", async () => {
    const ctx = makeTestContext({ executionMode: "sequential" });

    const skipAttempt = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* Effect.either(
          service.runActions({
            projectId: "project-1",
            stepExecutionId: ctx.stepExecution.id,
            actionIds: ["action-2"],
          }),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(skipAttempt).toMatchObject({
      _tag: "Left",
      left: {
        _tag: "RepositoryError",
        operation: "action-step-runtime.sequential",
      },
    });

    const detail = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepDetailService;
        return yield* service.buildActionStepExecutionDetailBody({
          projectId: "project-1",
          stepExecution: ctx.stepExecution,
          workflowDetail: ctx.workflowDetail,
        });
      }).pipe(Effect.provide(ctx.detailLayer)),
    );

    expect(detail.actions[1]).toMatchObject({
      actionId: "action-2",
      runAction: {
        enabled: false,
        reasonIfDisabled: "Sequential mode requires all earlier enabled actions to succeed first.",
      },
    });
  });

  it("skips a whole action and marks all item rows with skip result metadata", async () => {
    const ctx = makeTestContext({ executionMode: "parallel" });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.skipActions({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
          actionIds: ["action-1"],
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(result.actionResults).toEqual([{ actionId: "action-1", result: "skipped" }]);
    expect(ctx.actionRows.find((row) => row.actionDefinitionId === "action-1")).toMatchObject({
      status: "succeeded",
      resultJson: expect.objectContaining({ code: "propagation_action_skipped" }),
    });
    expect(ctx.itemRows.find((row) => row.itemDefinitionId === "action-1-item-1")).toMatchObject({
      status: "succeeded",
      resultJson: expect.objectContaining({ code: "propagation_item_skipped" }),
    });
  });

  it("allows skipping a needs-attention item and settles action status to succeeded", async () => {
    const ctx = makeTestContext({
      executionMode: "parallel",
      actions: [
        makeAction("action-artifact", {
          key: "artifact-multi",
          sortOrder: 10,
          contextFactDefinitionId: "ctx-artifact-1",
          contextFactKind: "artifact_slot_reference_fact",
          items: [
            {
              itemId: "item-good",
              itemKey: "item.good",
              sortOrder: 10,
            },
            {
              itemId: "item-invalid",
              itemKey: "item.invalid",
              sortOrder: 20,
              targetContextFactDefinitionId: "ctx-artifact-2",
            },
          ],
        }),
      ],
      contextFacts: [
        {
          id: "ctx-artifact-valid",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-artifact-1",
          instanceOrder: 0,
          valueJson: { relativePath: "docs/valid.md" },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "ctx-artifact-invalid",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-artifact-2",
          instanceOrder: 0,
          valueJson: { invalid: true },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    ctx.workflowContextFacts.push({
      kind: "artifact_slot_reference_fact",
      contextFactDefinitionId: "ctx-artifact-2",
      key: "artifactSecondary",
      label: "Artifact Secondary",
      cardinality: "one",
      slotDefinitionId: "slot-1",
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.runActions({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
          actionIds: ["action-artifact"],
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(ctx.actionRows[0]).toMatchObject({
      actionDefinitionId: "action-artifact",
      status: "needs_attention",
    });

    const skipped = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.skipActionItems({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
          actionId: "action-artifact",
          itemIds: ["item-invalid"],
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(skipped.itemResults).toEqual([{ itemId: "item-invalid", result: "skipped" }]);
    expect(ctx.itemRows.find((row) => row.itemDefinitionId === "item-invalid")).toMatchObject({
      status: "succeeded",
      resultJson: expect.objectContaining({ code: "propagation_item_skipped" }),
    });
    expect(
      ctx.actionRows.find((row) => row.actionDefinitionId === "action-artifact"),
    ).toMatchObject({
      status: "succeeded",
      resultJson: expect.objectContaining({ code: "propagation_action_applied_with_skips" }),
    });
  });

  it("rejects action and item skip mutations when the step is not active", async () => {
    const ctx = makeTestContext({ executionMode: "parallel" });
    ctx.stepExecution.status = "completed";

    const skipActionAttempt = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* Effect.either(
          service.skipActions({
            projectId: "project-1",
            stepExecutionId: ctx.stepExecution.id,
            actionIds: ["action-1"],
          }),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    const skipItemAttempt = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* Effect.either(
          service.skipActionItems({
            projectId: "project-1",
            stepExecutionId: ctx.stepExecution.id,
            actionId: "action-1",
            itemIds: ["action-1-item-1"],
          }),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(skipActionAttempt).toMatchObject({
      _tag: "Left",
      left: {
        _tag: "RepositoryError",
        operation: "action-step-runtime.skip",
      },
    });
    expect(skipItemAttempt).toMatchObject({
      _tag: "Left",
      left: {
        _tag: "RepositoryError",
        operation: "action-step-runtime.skip-item",
      },
    });
  });

  it("retries needs-attention actions in place and allows completion after one success", async () => {
    const ctx = makeTestContext({
      executionMode: "parallel",
      contextFacts: [
        {
          id: "ctx-bound-missing-target",
          workflowExecutionId: "workflow-exec-1",
          contextFactDefinitionId: "ctx-bound-1",
          instanceOrder: 0,
          valueJson: { value: { title: "repair me" } },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.runActions({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
          actionIds: ["action-1"],
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    const firstItemId = ctx.itemRows[0]?.id;
    expect(ctx.actionRows[0]).toMatchObject({
      actionDefinitionId: "action-1",
      status: "succeeded",
    });

    const blockedCompletion = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* Effect.either(
          service.completeStep({
            projectId: "project-1",
            stepExecutionId: ctx.stepExecution.id,
          }),
        );
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(blockedCompletion).toMatchObject({
      _tag: "Right",
      right: {
        stepExecutionId: ctx.stepExecution.id,
        status: "completed",
      },
    });

    const retried = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.retryActions({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
          actionIds: ["action-1"],
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(retried.actionResults).toEqual([{ actionId: "action-1", result: "not_retryable" }]);
    expect(ctx.itemRows[0]?.id).toBe(firstItemId);
    expect(ctx.actionRows[0]?.status).toBe("succeeded");

    const completion = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ActionStepRuntimeService;
        return yield* service.getCompletionEligibility({
          projectId: "project-1",
          stepExecutionId: ctx.stepExecution.id,
        });
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );
    expect(completion).toMatchObject({ eligible: true });

    expect(ctx.stepExecution.status).toBe("completed");
  });
});
