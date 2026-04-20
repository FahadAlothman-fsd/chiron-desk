import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import {
  ExecutionReadRepository,
  type WorkflowExecutionDetailReadModel,
} from "../../repositories/execution-read-repository";
import {
  InvokeExecutionRepository,
  type InvokeStepExecutionStateRow,
  type InvokeWorkUnitTargetExecutionRow,
  type InvokeWorkflowTargetExecutionRow,
} from "../../repositories/invoke-execution-repository";
import { BranchStepRuntimeRepository } from "../../repositories/branch-step-runtime-repository";
import { ProjectFactRepository } from "../../repositories/project-fact-repository";
import { ProjectWorkUnitRepository } from "../../repositories/project-work-unit-repository";
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
import { TransitionExecutionRepository } from "../../repositories/transition-execution-repository";
import {
  WorkflowExecutionRepository,
  type WorkflowExecutionRow,
} from "../../repositories/workflow-execution-repository";
import { InvokeCompletionServiceLive } from "../../services/invoke-completion-service";
import { InvokeStepDetailServiceLive } from "../../services/invoke-step-detail-service";
import { ActionStepDetailService } from "../../services/action-step-detail-service";
import {
  StepExecutionDetailService,
  StepExecutionDetailServiceLive,
} from "../../services/step-execution-detail-service";
import { NO_INVOKE_TARGETS_RESOLVED_REASON } from "../../services/invoke-target-resolution-service";
import { WorkUnitFactRepository } from "../../repositories/work-unit-fact-repository";

const projectPin = {
  projectId: "project-1",
  methodologyVersionId: "version-1",
  methodologyId: "methodology-1",
  methodologyKey: "core",
  publishedVersion: "1.0.0",
  actorId: null,
  createdAt: new Date("2026-04-14T00:00:00.000Z"),
  updatedAt: new Date("2026-04-14T00:00:00.000Z"),
};

const workUnitTypes = [
  {
    id: "wu-parent",
    methodologyVersionId: "version-1",
    key: "WU.PARENT",
    displayName: "Parent",
    descriptionJson: null,
    guidanceJson: null,
    cardinality: "one" as const,
    createdAt: new Date("2026-04-14T00:00:00.000Z"),
    updatedAt: new Date("2026-04-14T00:00:00.000Z"),
  },
  {
    id: "wu-story",
    methodologyVersionId: "version-1",
    key: "WU.STORY",
    displayName: "Story Draft",
    descriptionJson: null,
    guidanceJson: null,
    cardinality: "many" as const,
    createdAt: new Date("2026-04-14T00:00:00.000Z"),
    updatedAt: new Date("2026-04-14T00:00:00.000Z"),
  },
] as const;

const parentWorkflowDetail: WorkflowExecutionDetailReadModel = {
  workflowExecution: {
    id: "parent-workflow-exec-1",
    transitionExecutionId: "parent-transition-exec-1",
    workflowId: "workflow-parent",
    workflowRole: "primary",
    status: "active",
    currentStepExecutionId: "step-exec-1",
    supersededByWorkflowExecutionId: null,
    startedAt: new Date("2026-04-14T00:00:00.000Z"),
    completedAt: null,
    supersededAt: null,
  },
  transitionExecution: {
    id: "parent-transition-exec-1",
    projectWorkUnitId: "parent-project-work-unit-1",
    transitionId: "transition-parent",
    status: "active",
    primaryWorkflowExecutionId: "parent-workflow-exec-1",
    supersededByTransitionExecutionId: null,
    startedAt: new Date("2026-04-14T00:00:00.000Z"),
    completedAt: null,
    supersededAt: null,
  },
  projectId: "project-1",
  projectWorkUnitId: "parent-project-work-unit-1",
  workUnitTypeId: "wu-parent",
  currentStateId: "state-parent-active",
};

function buildCommonLayers() {
  const projectContextLayer = Layer.succeed(ProjectContextRepository, {
    findProjectPin: (projectId: string) =>
      Effect.succeed(projectId === projectPin.projectId ? projectPin : null),
    getProjectById: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);

  const projectFactLayer = Layer.succeed(ProjectFactRepository, {
    listFactsByProject: () => Effect.succeed([]),
    listFactDefinitionsForProject: () => Effect.die("unused"),
    getFactDefinitionById: () => Effect.die("unused"),
    addFactValue: () => Effect.die("unused"),
    setFactValue: () => Effect.die("unused"),
    replaceFactValue: () => Effect.die("unused"),
    removeFactValue: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ProjectFactRepository>);

  const workUnitFactLayer = Layer.succeed(WorkUnitFactRepository, {
    listFactsByWorkUnit: () => Effect.succeed([]),
    listFactDefinitionsForWorkUnit: () => Effect.die("unused"),
    getFactDefinitionById: () => Effect.die("unused"),
    addFactValue: () => Effect.die("unused"),
    setFactValue: () => Effect.die("unused"),
    replaceFactValue: () => Effect.die("unused"),
    removeFactValue: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>);

  const branchRuntimeLayer = Layer.succeed(BranchStepRuntimeRepository, {
    createOnActivation: () => Effect.die("unused"),
    saveSelection: () => Effect.die("unused"),
    loadWithRoutes: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof BranchStepRuntimeRepository>);

  const actionDetailLayer = Layer.succeed(ActionStepDetailService, {
    buildActionStepExecutionDetailBody: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ActionStepDetailService>);

  return Layer.mergeAll(
    projectContextLayer,
    projectFactLayer,
    workUnitFactLayer,
    branchRuntimeLayer,
    actionDetailLayer,
  );
}

function buildStepRepoLayer(params: {
  stepExecution: RuntimeStepExecutionRow;
  extraStepExecutions?: RuntimeStepExecutionRow[];
}) {
  const stepRows = [params.stepExecution, ...(params.extraStepExecutions ?? [])];

  return Layer.succeed(StepExecutionRepository, {
    createStepExecution: () => Effect.die("unused"),
    getStepExecutionById: (stepExecutionId: string) =>
      Effect.succeed(stepRows.find((row) => row.id === stepExecutionId) ?? null),
    findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
    listStepExecutionsForWorkflow: (workflowExecutionId: string) =>
      Effect.succeed(stepRows.filter((row) => row.workflowExecutionId === workflowExecutionId)),
    completeStepExecution: () => Effect.die("unused"),
    createFormStepExecutionState: () => Effect.die("unused"),
    upsertFormStepExecutionState: (_params: UpsertRuntimeFormStepExecutionStateParams) =>
      Effect.die("unused"),
    getFormStepExecutionState: () => Effect.succeed<RuntimeFormStepExecutionStateRow | null>(null),
    replaceWorkflowExecutionContextFacts: () => Effect.die("unused"),
    listWorkflowExecutionContextFacts: () =>
      Effect.succeed<readonly RuntimeWorkflowExecutionContextFactRow[]>([]),
    listWorkflowContextFactDefinitions: () =>
      Effect.succeed<readonly RuntimeWorkflowContextFactDefinitionRow[]>([]),
    listWorkflowStepDefinitions: () =>
      Effect.succeed<readonly RuntimeWorkflowStepDefinitionRow[]>([]),
    listWorkflowEdges: () => Effect.succeed<readonly RuntimeWorkflowEdgeRow[]>([]),
  } as unknown as Context.Tag.Service<typeof StepExecutionRepository>);
}

describe("runtime invoke step detail", () => {
  it("surfaces the zero-target blocked reason on the disabled completion action", async () => {
    const stepExecution: RuntimeStepExecutionRow = {
      id: "step-exec-zero-targets",
      workflowExecutionId: parentWorkflowDetail.workflowExecution.id,
      stepDefinitionId: "invoke-step-zero-targets",
      stepType: "invoke",
      status: "active",
      activatedAt: new Date("2026-04-14T00:00:00.000Z"),
      completedAt: null,
      previousStepExecutionId: null,
    };
    const invokeState: InvokeStepExecutionStateRow = {
      id: "invoke-state-zero-targets",
      stepExecutionId: stepExecution.id,
      invokeStepDefinitionId: stepExecution.stepDefinitionId,
      createdAt: new Date("2026-04-14T00:00:00.000Z"),
      updatedAt: new Date("2026-04-14T00:00:00.000Z"),
    };

    const lifecycleLayer = Layer.succeed(LifecycleRepository, {
      findWorkUnitTypes: () => Effect.succeed(workUnitTypes),
      findLifecycleStates: () => Effect.succeed([]),
      findLifecycleTransitions: () => Effect.succeed([]),
      findFactSchemas: (_versionId: string, workUnitTypeId?: string) =>
        Effect.succeed(
          workUnitTypeId === "wu-story"
            ? [
                {
                  id: "fact-work-unit",
                  methodologyVersionId: "version-1",
                  workUnitTypeId: "wu-story",
                  name: "Setup Work Unit",
                  key: "setup_work_unit",
                  factType: "work_unit",
                  cardinality: "one",
                  description: null,
                  defaultValueJson: null,
                  guidanceJson: null,
                  validationJson: { workUnitKey: "WU.PARENT" },
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]
            : [],
        ),
      findTransitionConditionSets: () => Effect.die("unused"),
      findAgentTypes: () => Effect.die("unused"),
      findTransitionWorkflowBindings: () => Effect.die("unused"),
      saveLifecycleDefinition: () => Effect.die("unused"),
      recordLifecycleEvent: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

    const methodologyLayer = Layer.succeed(MethodologyRepository, {
      getWorkflowEditorDefinition: () =>
        Effect.succeed({
          workflow: {
            workflowDefinitionId: "workflow-parent",
            key: "WF.PARENT",
            displayName: "Parent Workflow",
            descriptionJson: null,
          },
          steps: [
            {
              stepId: "invoke-step-zero-targets",
              stepType: "invoke",
              payload: {
                key: "invoke-zero-targets",
                label: "Invoke zero targets",
                targetKind: "workflow",
                sourceMode: "fixed",
                workflowDefinitionIds: [],
              },
            },
          ],
          edges: [],
          contextFacts: [],
          formDefinitions: [],
        }),
      listWorkflowsByWorkUnitType: () => Effect.succeed([]),
      getInvokeStepDefinition: () =>
        Effect.succeed({
          stepId: "invoke-step-zero-targets",
          stepType: "invoke",
          payload: {
            key: "invoke-zero-targets",
            label: "Invoke zero targets",
            targetKind: "workflow",
            sourceMode: "fixed",
            workflowDefinitionIds: [],
          },
        }),
      findArtifactSlotsByWorkUnitType: () => Effect.succeed([]),
      findFactDefinitionsByVersionId: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

    const executionReadLayer = Layer.succeed(ExecutionReadRepository, {
      getTransitionExecutionDetail: () => Effect.die("unused"),
      listTransitionExecutionsForWorkUnit: () => Effect.die("unused"),
      getWorkflowExecutionDetail: (workflowExecutionId: string) =>
        Effect.succeed(
          workflowExecutionId === parentWorkflowDetail.workflowExecution.id
            ? parentWorkflowDetail
            : null,
        ),
      listWorkflowExecutionsForTransition: () => Effect.die("unused"),
      listActiveWorkflowExecutionsByProject: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);

    const invokeRepoLayer = Layer.succeed(InvokeExecutionRepository, {
      createInvokeStepExecutionState: () => Effect.die("unused"),
      getInvokeStepExecutionStateByStepExecutionId: (stepExecutionId: string) =>
        Effect.succeed(stepExecutionId === stepExecution.id ? invokeState : null),
      listInvokeWorkflowTargetExecutions: () => Effect.succeed([]),
      getInvokeWorkflowTargetExecutionById: () => Effect.die("unused"),
      createInvokeWorkflowTargetExecution: () => Effect.die("unused"),
      markInvokeWorkflowTargetExecutionStarted: () => Effect.die("unused"),
      listInvokeWorkUnitTargetExecutions: () => Effect.succeed([]),
      getInvokeWorkUnitTargetExecutionById: () => Effect.die("unused"),
      createInvokeWorkUnitTargetExecution: () => Effect.die("unused"),
      markInvokeWorkUnitTargetExecutionStarted: () => Effect.die("unused"),
      listInvokeWorkUnitCreatedFactInstances: () => Effect.succeed([]),
      createInvokeWorkUnitCreatedFactInstance: () => Effect.die("unused"),
      listInvokeWorkUnitCreatedArtifactSnapshots: () => Effect.die("unused"),
      createInvokeWorkUnitCreatedArtifactSnapshot: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof InvokeExecutionRepository>);

    const workflowRepoLayer = Layer.succeed(WorkflowExecutionRepository, {
      createWorkflowExecution: () => Effect.die("unused"),
      getWorkflowExecutionById: () => Effect.succeed(null),
      setCurrentStepExecutionId: () => Effect.die("unused"),
      markWorkflowExecutionCompleted: () => Effect.die("unused"),
      markWorkflowExecutionSuperseded: () => Effect.die("unused"),
      updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.die("unused"),
      retryWorkflowExecution: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>);

    const transitionLayer = Layer.succeed(TransitionExecutionRepository, {
      createTransitionExecution: () => Effect.die("unused"),
      startTransitionExecution: () => Effect.die("unused"),
      switchActiveTransitionExecution: () => Effect.die("unused"),
      getActiveTransitionExecutionForWorkUnit: () => Effect.die("unused"),
      getTransitionExecutionById: () => Effect.succeed(null),
    } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>);

    const projectWorkUnitLayer = Layer.succeed(ProjectWorkUnitRepository, {
      createProjectWorkUnit: () => Effect.die("unused"),
      listProjectWorkUnitsByProject: () => Effect.succeed([]),
      getProjectWorkUnitById: () => Effect.succeed(null),
      updateActiveTransitionExecutionPointer: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>);

    const baseLayer = Layer.mergeAll(
      buildCommonLayers(),
      buildStepRepoLayer({ stepExecution }),
      lifecycleLayer,
      methodologyLayer,
      executionReadLayer,
      invokeRepoLayer,
      workflowRepoLayer,
      transitionLayer,
      projectWorkUnitLayer,
    );
    const invokeCompletionLayer = InvokeCompletionServiceLive.pipe(Layer.provide(baseLayer));
    const invokeStepDetailLayer = InvokeStepDetailServiceLive.pipe(
      Layer.provideMerge(baseLayer),
      Layer.provideMerge(invokeCompletionLayer),
    );
    const layer = StepExecutionDetailServiceLive.pipe(
      Layer.provideMerge(baseLayer),
      Layer.provideMerge(invokeStepDetailLayer),
    );

    const detail = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* StepExecutionDetailService;
        return yield* service.getRuntimeStepExecutionDetail({
          projectId: projectPin.projectId,
          stepExecutionId: stepExecution.id,
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(detail?.body.stepType).toBe("invoke");
    if (!detail || detail.body.stepType !== "invoke") {
      throw new Error("expected invoke detail body");
    }

    expect(detail.shell.completionAction).toEqual({
      kind: "complete_step_execution",
      visible: true,
      enabled: false,
      reasonIfDisabled: NO_INVOKE_TARGETS_RESOLVED_REASON,
    });
    expect(detail.body.completionSummary).toEqual({
      mode: "manual",
      eligible: false,
      reasonIfIneligible: NO_INVOKE_TARGETS_RESOLVED_REASON,
      totalTargets: 0,
      completedTargets: 0,
    });
  });

  it("returns full workflow invoke detail with labels, actions, completion summary, and propagation preview", async () => {
    const stepExecution: RuntimeStepExecutionRow = {
      id: "step-exec-1",
      workflowExecutionId: parentWorkflowDetail.workflowExecution.id,
      stepDefinitionId: "invoke-step-1",
      stepType: "invoke",
      status: "active",
      activatedAt: new Date("2026-04-14T00:00:00.000Z"),
      completedAt: null,
      previousStepExecutionId: null,
    };
    const childActiveStepExecution: RuntimeStepExecutionRow = {
      id: "child-step-exec-1",
      workflowExecutionId: "child-workflow-exec-1",
      stepDefinitionId: "child-step-def-review",
      stepType: "display",
      status: "active",
      activatedAt: new Date("2026-04-14T00:02:00.000Z"),
      completedAt: null,
      previousStepExecutionId: null,
    };
    const invokeState: InvokeStepExecutionStateRow = {
      id: "invoke-state-1",
      stepExecutionId: stepExecution.id,
      invokeStepDefinitionId: stepExecution.stepDefinitionId,
      createdAt: new Date("2026-04-14T00:00:00.000Z"),
      updatedAt: new Date("2026-04-14T00:00:00.000Z"),
    };
    const workflowTargets: InvokeWorkflowTargetExecutionRow[] = [
      {
        id: "invoke-wf-target-1",
        invokeStepExecutionStateId: invokeState.id,
        workflowDefinitionId: "workflow-child-1",
        workflowExecutionId: "child-workflow-exec-1",
        resolutionOrder: 0,
        createdAt: new Date("2026-04-14T00:01:00.000Z"),
        updatedAt: new Date("2026-04-14T00:01:00.000Z"),
      },
      {
        id: "invoke-wf-target-2",
        invokeStepExecutionStateId: invokeState.id,
        workflowDefinitionId: "workflow-child-2",
        workflowExecutionId: "child-workflow-exec-2",
        resolutionOrder: 1,
        createdAt: new Date("2026-04-14T00:01:00.000Z"),
        updatedAt: new Date("2026-04-14T00:01:00.000Z"),
      },
      {
        id: "invoke-wf-target-3",
        invokeStepExecutionStateId: invokeState.id,
        workflowDefinitionId: "workflow-child-3",
        workflowExecutionId: null,
        resolutionOrder: 2,
        createdAt: new Date("2026-04-14T00:01:00.000Z"),
        updatedAt: new Date("2026-04-14T00:01:00.000Z"),
      },
    ];
    const childWorkflows: WorkflowExecutionRow[] = [
      {
        id: "child-workflow-exec-1",
        transitionExecutionId: "transition-1",
        workflowId: "workflow-child-1",
        workflowRole: "supporting",
        status: "active",
        currentStepExecutionId: childActiveStepExecution.id,
        supersededByWorkflowExecutionId: null,
        startedAt: new Date("2026-04-14T00:02:00.000Z"),
        completedAt: null,
        supersededAt: null,
      },
      {
        id: "child-workflow-exec-2",
        transitionExecutionId: "transition-2",
        workflowId: "workflow-child-2",
        workflowRole: "supporting",
        status: "completed",
        currentStepExecutionId: null,
        supersededByWorkflowExecutionId: null,
        startedAt: new Date("2026-04-14T00:03:00.000Z"),
        completedAt: new Date("2026-04-14T00:04:00.000Z"),
        supersededAt: null,
      },
    ];

    const lifecycleLayer = Layer.succeed(LifecycleRepository, {
      findWorkUnitTypes: () => Effect.succeed(workUnitTypes),
      findLifecycleStates: () => Effect.succeed([]),
      findLifecycleTransitions: () => Effect.succeed([]),
      findFactSchemas: (_versionId: string, workUnitTypeId?: string) =>
        Effect.succeed(
          workUnitTypeId === "wu-story"
            ? [
                {
                  id: "fact-work-unit",
                  methodologyVersionId: "version-1",
                  workUnitTypeId: "wu-story",
                  name: "Setup Work Unit",
                  key: "setup_work_unit",
                  factType: "work_unit",
                  cardinality: "one",
                  description: null,
                  defaultValueJson: null,
                  guidanceJson: null,
                  validationJson: { workUnitKey: "WU.PARENT" },
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]
            : [],
        ),
      findTransitionConditionSets: () => Effect.die("unused"),
      findAgentTypes: () => Effect.die("unused"),
      findTransitionWorkflowBindings: () => Effect.die("unused"),
      saveLifecycleDefinition: () => Effect.die("unused"),
      recordLifecycleEvent: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

    const methodologyLayer = Layer.succeed(MethodologyRepository, {
      getWorkflowEditorDefinition: ({ workflowDefinitionId }: { workflowDefinitionId: string }) =>
        Effect.succeed(
          workflowDefinitionId === "workflow-parent"
            ? {
                workflow: {
                  workflowDefinitionId: "workflow-parent",
                  key: "WF.PARENT",
                  displayName: "Parent Workflow",
                  descriptionJson: null,
                },
                steps: [
                  {
                    stepId: "invoke-step-1",
                    stepType: "invoke",
                    payload: {
                      key: "invoke-children",
                      label: "Invoke Child Workflows",
                      targetKind: "workflow",
                      sourceMode: "fixed",
                      workflowDefinitionIds: [
                        "workflow-child-1",
                        "workflow-child-2",
                        "workflow-child-3",
                      ],
                    },
                  },
                ],
                edges: [],
                contextFacts: [
                  {
                    contextFactDefinitionId: "ctx-child-workflows",
                    kind: "workflow_ref_fact",
                    key: "childWorkflows",
                    label: "Child workflows",
                    cardinality: "many",
                    allowedWorkflowDefinitionIds: ["workflow-child-1", "workflow-child-2"],
                  },
                ],
                formDefinitions: [],
              }
            : {
                workflow: {
                  workflowDefinitionId,
                  key: workflowDefinitionId,
                  displayName: workflowDefinitionId,
                  descriptionJson: null,
                },
                steps: [
                  {
                    stepId: "child-step-def-review",
                    stepType: "display",
                    payload: {
                      key: "review-output",
                      label: "Review output",
                    },
                  },
                ],
                edges: [],
                contextFacts: [],
                formDefinitions: [],
              },
        ),
      listWorkflowsByWorkUnitType: () =>
        Effect.succeed([
          {
            workflowDefinitionId: "workflow-parent",
            key: "WF.PARENT",
            displayName: "Parent Workflow",
            workUnitTypeKey: "WU.PARENT",
            description: undefined,
            guidance: undefined,
            metadata: undefined,
            steps: [],
            edges: [],
          },
          {
            workflowDefinitionId: "workflow-child-1",
            key: "WF.CHILD.ONE",
            displayName: "Draft Story",
            workUnitTypeKey: "WU.STORY",
            description: undefined,
            guidance: undefined,
            metadata: undefined,
            steps: [],
            edges: [],
          },
          {
            workflowDefinitionId: "workflow-child-2",
            key: "WF.CHILD.TWO",
            displayName: "Review Story",
            workUnitTypeKey: "WU.STORY",
            description: undefined,
            guidance: undefined,
            metadata: undefined,
            steps: [],
            edges: [],
          },
          {
            workflowDefinitionId: "workflow-child-3",
            key: "WF.CHILD.THREE",
            displayName: "Publish Story",
            workUnitTypeKey: "WU.STORY",
            description: undefined,
            guidance: undefined,
            metadata: undefined,
            steps: [],
            edges: [],
          },
        ]),
      getInvokeStepDefinition: () =>
        Effect.succeed({
          stepId: "invoke-step-1",
          stepType: "invoke",
          payload: {
            key: "invoke-story-workflow",
            targetKind: "workflow",
            sourceMode: "fixed",
            workflowDefinitionIds: ["workflow-child-1", "workflow-child-2", "workflow-child-3"],
          },
        }),
      findArtifactSlotsByWorkUnitType: () => Effect.succeed([]),
      findFactDefinitionsByVersionId: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

    const executionReadLayer = Layer.succeed(ExecutionReadRepository, {
      getTransitionExecutionDetail: () => Effect.die("unused"),
      listTransitionExecutionsForWorkUnit: () => Effect.die("unused"),
      getWorkflowExecutionDetail: (workflowExecutionId: string) =>
        Effect.succeed(
          workflowExecutionId === parentWorkflowDetail.workflowExecution.id
            ? parentWorkflowDetail
            : null,
        ),
      listWorkflowExecutionsForTransition: () => Effect.die("unused"),
      listActiveWorkflowExecutionsByProject: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);

    const invokeRepoLayer = Layer.succeed(InvokeExecutionRepository, {
      createInvokeStepExecutionState: () => Effect.die("unused"),
      getInvokeStepExecutionStateByStepExecutionId: (stepExecutionId: string) =>
        Effect.succeed(stepExecutionId === stepExecution.id ? invokeState : null),
      listInvokeWorkflowTargetExecutions: () => Effect.succeed(workflowTargets),
      getInvokeWorkflowTargetExecutionById: () => Effect.die("unused"),
      createInvokeWorkflowTargetExecution: () => Effect.die("unused"),
      markInvokeWorkflowTargetExecutionStarted: () => Effect.die("unused"),
      listInvokeWorkUnitTargetExecutions: () => Effect.succeed([]),
      getInvokeWorkUnitTargetExecutionById: () => Effect.die("unused"),
      createInvokeWorkUnitTargetExecution: () => Effect.die("unused"),
      markInvokeWorkUnitTargetExecutionStarted: () => Effect.die("unused"),
      listInvokeWorkUnitCreatedFactInstances: () => Effect.die("unused"),
      createInvokeWorkUnitCreatedFactInstance: () => Effect.die("unused"),
      listInvokeWorkUnitCreatedArtifactSnapshots: () => Effect.die("unused"),
      createInvokeWorkUnitCreatedArtifactSnapshot: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof InvokeExecutionRepository>);

    const workflowRepoLayer = Layer.succeed(WorkflowExecutionRepository, {
      createWorkflowExecution: () => Effect.die("unused"),
      getWorkflowExecutionById: (workflowExecutionId: string) =>
        Effect.succeed(childWorkflows.find((row) => row.id === workflowExecutionId) ?? null),
      setCurrentStepExecutionId: () => Effect.die("unused"),
      markWorkflowExecutionCompleted: () => Effect.die("unused"),
      markWorkflowExecutionSuperseded: () => Effect.die("unused"),
      updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.die("unused"),
      retryWorkflowExecution: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>);

    const projectWorkUnitLayer = Layer.succeed(ProjectWorkUnitRepository, {
      createProjectWorkUnit: () => Effect.die("unused"),
      listProjectWorkUnitsByProject: () => Effect.succeed([]),
      getProjectWorkUnitById: () => Effect.succeed(null),
      updateActiveTransitionExecutionPointer: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>);

    const transitionLayer = Layer.succeed(TransitionExecutionRepository, {
      createTransitionExecution: () => Effect.die("unused"),
      startTransitionExecution: () => Effect.die("unused"),
      switchActiveTransitionExecution: () => Effect.die("unused"),
      getActiveTransitionExecutionForWorkUnit: () => Effect.die("unused"),
      getTransitionExecutionById: () => Effect.succeed(null),
    } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>);

    const baseLayer = Layer.mergeAll(
      buildCommonLayers(),
      buildStepRepoLayer({ stepExecution, extraStepExecutions: [childActiveStepExecution] }),
      lifecycleLayer,
      methodologyLayer,
      executionReadLayer,
      invokeRepoLayer,
      workflowRepoLayer,
      projectWorkUnitLayer,
      transitionLayer,
    );
    const invokeCompletionLayer = InvokeCompletionServiceLive.pipe(Layer.provide(baseLayer));
    const invokeStepDetailLayer = InvokeStepDetailServiceLive.pipe(
      Layer.provideMerge(baseLayer),
      Layer.provideMerge(invokeCompletionLayer),
    );
    const layer = StepExecutionDetailServiceLive.pipe(
      Layer.provideMerge(baseLayer),
      Layer.provideMerge(invokeStepDetailLayer),
    );

    const detail = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* StepExecutionDetailService;
        return yield* service.getRuntimeStepExecutionDetail({
          projectId: projectPin.projectId,
          stepExecutionId: stepExecution.id,
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(detail?.body.stepType).toBe("invoke");
    if (!detail || detail.body.stepType !== "invoke") {
      throw new Error("expected invoke detail body");
    }

    expect(detail.shell.completionAction).toEqual({
      kind: "complete_step_execution",
      visible: true,
      enabled: true,
      reasonIfDisabled: undefined,
    });
    expect(detail.body.targetKind).toBe("workflow");
    expect(detail.body.workflowTargets).toEqual([
      expect.objectContaining({
        label: "Draft Story",
        status: "active",
        activeChildStepLabel: "Review output",
        actions: expect.objectContaining({
          openWorkflow: expect.objectContaining({ workflowExecutionId: "child-workflow-exec-1" }),
        }),
      }),
      expect.objectContaining({
        label: "Review Story",
        status: "completed",
      }),
      expect.objectContaining({
        label: "Publish Story",
        status: "not_started",
        actions: expect.objectContaining({
          start: expect.objectContaining({
            enabled: true,
            invokeWorkflowTargetExecutionId: "invoke-wf-target-3",
          }),
        }),
      }),
    ]);
    expect(detail.body.completionSummary).toEqual({
      mode: "manual",
      eligible: true,
      reasonIfIneligible: undefined,
      totalTargets: 3,
      completedTargets: 1,
    });
    expect(detail.body.propagationPreview).toEqual({
      mode: "on_step_completion",
      summary: "On step completion, 1 workflow reference output will be written.",
      outputs: [
        {
          label: "Child workflows",
          contextFactDefinitionId: "ctx-child-workflows",
          contextFactKey: "childWorkflows",
        },
      ],
    });
  });

  it("returns work-unit invoke rows with blocked reasons, workflow choices, and disabled completion reason", async () => {
    const stepExecution: RuntimeStepExecutionRow = {
      id: "step-exec-1",
      workflowExecutionId: parentWorkflowDetail.workflowExecution.id,
      stepDefinitionId: "invoke-step-1",
      stepType: "invoke",
      status: "active",
      activatedAt: new Date("2026-04-14T00:00:00.000Z"),
      completedAt: null,
      previousStepExecutionId: null,
    };
    const invokeState: InvokeStepExecutionStateRow = {
      id: "invoke-state-1",
      stepExecutionId: stepExecution.id,
      invokeStepDefinitionId: stepExecution.stepDefinitionId,
      createdAt: new Date("2026-04-14T00:00:00.000Z"),
      updatedAt: new Date("2026-04-14T00:00:00.000Z"),
    };
    const workUnitTargets: InvokeWorkUnitTargetExecutionRow[] = [
      {
        id: "invoke-wu-target-blocked",
        invokeStepExecutionStateId: invokeState.id,
        projectWorkUnitId: null,
        workUnitDefinitionId: "wu-story",
        transitionDefinitionId: "transition-blocked",
        transitionExecutionId: null,
        workflowDefinitionId: null,
        workflowExecutionId: null,
        resolutionOrder: 0,
        createdAt: new Date("2026-04-14T00:01:00.000Z"),
        updatedAt: new Date("2026-04-14T00:01:00.000Z"),
      },
      {
        id: "invoke-wu-target-ready",
        invokeStepExecutionStateId: invokeState.id,
        projectWorkUnitId: null,
        workUnitDefinitionId: "wu-story",
        transitionDefinitionId: "transition-ready",
        transitionExecutionId: null,
        workflowDefinitionId: null,
        workflowExecutionId: null,
        resolutionOrder: 1,
        createdAt: new Date("2026-04-14T00:01:00.000Z"),
        updatedAt: new Date("2026-04-14T00:01:00.000Z"),
      },
      {
        id: "invoke-wu-target-active",
        invokeStepExecutionStateId: invokeState.id,
        projectWorkUnitId: "project-work-unit-story-1",
        workUnitDefinitionId: "wu-story",
        transitionDefinitionId: "transition-in-progress",
        transitionExecutionId: "transition-exec-story-1",
        workflowDefinitionId: "workflow-child-1",
        workflowExecutionId: "child-workflow-exec-1",
        resolutionOrder: 2,
        createdAt: new Date("2026-04-14T00:01:00.000Z"),
        updatedAt: new Date("2026-04-14T00:01:00.000Z"),
      },
    ];

    const lifecycleLayer = Layer.succeed(LifecycleRepository, {
      findWorkUnitTypes: () => Effect.succeed(workUnitTypes),
      findLifecycleStates: (_versionId: string, workUnitTypeId: string) =>
        Effect.succeed(
          workUnitTypeId === "wu-story"
            ? [
                {
                  id: "state-drafting",
                  methodologyVersionId: "version-1",
                  workUnitTypeId: "wu-story",
                  key: "drafting",
                  displayName: "Drafting",
                  descriptionJson: null,
                  guidanceJson: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]
            : [],
        ),
      findLifecycleTransitions: (_versionId: string, params?: { workUnitTypeId?: string }) =>
        Effect.succeed(
          params?.workUnitTypeId === "wu-story"
            ? [
                {
                  id: "transition-blocked",
                  methodologyVersionId: "version-1",
                  workUnitTypeId: "wu-story",
                  transitionKey: "blocked-path",
                  fromStateId: null,
                  toStateId: null,
                  displayOrder: 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                {
                  id: "transition-ready",
                  methodologyVersionId: "version-1",
                  workUnitTypeId: "wu-story",
                  transitionKey: "ready-for-drafting",
                  fromStateId: null,
                  toStateId: null,
                  displayOrder: 1,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                {
                  id: "transition-in-progress",
                  methodologyVersionId: "version-1",
                  workUnitTypeId: "wu-story",
                  transitionKey: "in-progress",
                  fromStateId: null,
                  toStateId: null,
                  displayOrder: 2,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]
            : [],
        ),
      findFactSchemas: (_versionId: string, workUnitTypeId?: string) =>
        Effect.succeed(
          workUnitTypeId === "wu-story"
            ? [
                {
                  id: "fact-work-unit",
                  methodologyVersionId: "version-1",
                  workUnitTypeId: "wu-story",
                  name: "Setup Work Unit",
                  key: "setup_work_unit",
                  factType: "work_unit",
                  cardinality: "one",
                  description: null,
                  defaultValueJson: null,
                  guidanceJson: null,
                  validationJson: { workUnitKey: "WU.PARENT" },
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]
            : [],
        ),
      findTransitionConditionSets: () => Effect.die("unused"),
      findAgentTypes: () => Effect.die("unused"),
      findTransitionWorkflowBindings: () => Effect.die("unused"),
      saveLifecycleDefinition: () => Effect.die("unused"),
      recordLifecycleEvent: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

    const methodologyLayer = Layer.succeed(MethodologyRepository, {
      getWorkflowEditorDefinition: () =>
        Effect.succeed({
          workflow: {
            workflowDefinitionId: "workflow-parent",
            key: "WF.PARENT",
            displayName: "Parent Workflow",
            descriptionJson: null,
          },
          steps: [
            {
              stepId: "invoke-step-1",
              stepType: "invoke",
              payload: {
                key: "invoke-stories",
                label: "Invoke stories",
                targetKind: "work_unit",
                sourceMode: "fixed",
                workUnitDefinitionId: "wu-story",
                bindings: [
                  {
                    destination: {
                      kind: "work_unit_fact",
                      workUnitFactDefinitionId: "fact-work-unit",
                    },
                    source: { kind: "runtime" },
                  },
                ],
                activationTransitions: [
                  { transitionId: "transition-blocked", workflowDefinitionIds: [] },
                  { transitionId: "transition-ready", workflowDefinitionIds: ["workflow-child-1"] },
                  {
                    transitionId: "transition-in-progress",
                    workflowDefinitionIds: ["workflow-child-1"],
                  },
                ],
              },
            },
          ],
          edges: [],
          contextFacts: [
            {
              contextFactDefinitionId: "ctx-story-drafts",
              kind: "work_unit_draft_spec_fact",
              key: "storyDrafts",
              label: "Story drafts",
              cardinality: "many",
              workUnitDefinitionId: "wu-story",
              selectedWorkUnitFactDefinitionIds: [],
              selectedArtifactSlotDefinitionIds: [],
            },
          ],
          formDefinitions: [],
        }),
      listWorkflowsByWorkUnitType: () =>
        Effect.succeed([
          {
            workflowDefinitionId: "workflow-child-1",
            key: "WF.CHILD.ONE",
            displayName: "Draft Story",
            workUnitTypeKey: "WU.STORY",
            description: undefined,
            guidance: undefined,
            metadata: undefined,
            steps: [],
            edges: [],
          },
        ]),
      getInvokeStepDefinition: () =>
        Effect.succeed({
          stepId: "invoke-step-1",
          stepType: "invoke",
          payload: {
            key: "invoke-story-work-unit",
            targetKind: "work_unit",
            sourceMode: "fixed",
            workUnitDefinitionId: "wu-story",
            bindings: [
              {
                destination: {
                  kind: "work_unit_fact",
                  workUnitFactDefinitionId: "fact-work-unit",
                },
                source: { kind: "runtime" },
              },
            ],
            activationTransitions: [
              {
                transitionId: "transition-ready",
                workflowDefinitionIds: ["workflow-child-1"],
              },
            ],
          },
        }),
      findArtifactSlotsByWorkUnitType: () => Effect.succeed([]),
      findFactDefinitionsByVersionId: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

    const executionReadLayer = Layer.succeed(ExecutionReadRepository, {
      getTransitionExecutionDetail: () => Effect.die("unused"),
      listTransitionExecutionsForWorkUnit: () => Effect.die("unused"),
      getWorkflowExecutionDetail: (workflowExecutionId: string) =>
        Effect.succeed(
          workflowExecutionId === parentWorkflowDetail.workflowExecution.id
            ? parentWorkflowDetail
            : null,
        ),
      listWorkflowExecutionsForTransition: () => Effect.die("unused"),
      listActiveWorkflowExecutionsByProject: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);

    const invokeRepoLayer = Layer.succeed(InvokeExecutionRepository, {
      createInvokeStepExecutionState: () => Effect.die("unused"),
      getInvokeStepExecutionStateByStepExecutionId: (stepExecutionId: string) =>
        Effect.succeed(stepExecutionId === stepExecution.id ? invokeState : null),
      listInvokeWorkflowTargetExecutions: () => Effect.succeed([]),
      getInvokeWorkflowTargetExecutionById: () => Effect.die("unused"),
      createInvokeWorkflowTargetExecution: () => Effect.die("unused"),
      markInvokeWorkflowTargetExecutionStarted: () => Effect.die("unused"),
      listInvokeWorkUnitTargetExecutions: () => Effect.succeed(workUnitTargets),
      getInvokeWorkUnitTargetExecutionById: () => Effect.die("unused"),
      createInvokeWorkUnitTargetExecution: () => Effect.die("unused"),
      markInvokeWorkUnitTargetExecutionStarted: () => Effect.die("unused"),
      listInvokeWorkUnitCreatedFactInstances: () => Effect.die("unused"),
      createInvokeWorkUnitCreatedFactInstance: () => Effect.die("unused"),
      listInvokeWorkUnitCreatedArtifactSnapshots: () => Effect.die("unused"),
      createInvokeWorkUnitCreatedArtifactSnapshot: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof InvokeExecutionRepository>);

    const projectWorkUnitLayer = Layer.succeed(ProjectWorkUnitRepository, {
      createProjectWorkUnit: () => Effect.die("unused"),
      listProjectWorkUnitsByProject: () =>
        Effect.succeed([
          {
            id: "parent-project-work-unit-1",
            projectId: "project-1",
            workUnitTypeId: "wu-parent",
            currentStateId: "state-parent-active",
            activeTransitionExecutionId: "parent-transition-exec-1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      getProjectWorkUnitById: (projectWorkUnitId: string) =>
        Effect.succeed(
          projectWorkUnitId === "project-work-unit-story-1"
            ? {
                id: "project-work-unit-story-1",
                projectId: "project-1",
                workUnitTypeId: "wu-story",
                currentStateId: "state-drafting",
                activeTransitionExecutionId: "transition-exec-story-1",
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            : projectWorkUnitId === "setup-work-unit-1"
              ? {
                  id: "setup-work-unit-1",
                  projectId: "project-1",
                  workUnitTypeId: "wu-parent",
                  currentStateId: "state-parent-active",
                  activeTransitionExecutionId: "setup-transition-exec-1",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }
              : null,
        ),
      updateActiveTransitionExecutionPointer: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>);

    const transitionLayer = Layer.succeed(TransitionExecutionRepository, {
      createTransitionExecution: () => Effect.die("unused"),
      startTransitionExecution: () => Effect.die("unused"),
      switchActiveTransitionExecution: () => Effect.die("unused"),
      getActiveTransitionExecutionForWorkUnit: () => Effect.die("unused"),
      getTransitionExecutionById: (transitionExecutionId: string) =>
        Effect.succeed(
          transitionExecutionId === "transition-exec-story-1"
            ? {
                id: "transition-exec-story-1",
                projectWorkUnitId: "project-work-unit-story-1",
                transitionId: "transition-in-progress",
                status: "active",
                primaryWorkflowExecutionId: "child-workflow-exec-1",
                supersededByTransitionExecutionId: null,
                startedAt: new Date("2026-04-14T00:02:00.000Z"),
                completedAt: null,
                supersededAt: null,
              }
            : null,
        ),
    } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>);

    const workUnitFactLayer = Layer.succeed(WorkUnitFactRepository, {
      createFactInstance: () => Effect.die("unused"),
      getCurrentValuesByDefinition: () => Effect.die("unused"),
      listFactsByWorkUnit: ({ projectWorkUnitId }: { projectWorkUnitId: string }) =>
        Effect.succeed(
          projectWorkUnitId === "project-work-unit-story-1"
            ? [
                {
                  id: "fact-instance-setup-link",
                  projectWorkUnitId: "project-work-unit-story-1",
                  factDefinitionId: "fact-work-unit",
                  valueJson: null,
                  referencedProjectWorkUnitId: "setup-work-unit-1",
                  status: "active",
                  supersededByFactInstanceId: null,
                  producedByTransitionExecutionId: "transition-exec-story-1",
                  producedByWorkflowExecutionId: "child-workflow-exec-1",
                  authoredByUserId: null,
                  createdAt: new Date(),
                },
              ]
            : [],
        ),
      supersedeFactInstance: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>);

    const workflowRepoLayer = Layer.succeed(WorkflowExecutionRepository, {
      createWorkflowExecution: () => Effect.die("unused"),
      getWorkflowExecutionById: (workflowExecutionId: string) =>
        Effect.succeed(
          workflowExecutionId === "child-workflow-exec-1"
            ? {
                id: "child-workflow-exec-1",
                transitionExecutionId: "transition-exec-story-1",
                workflowId: "workflow-child-1",
                workflowRole: "primary",
                status: "active",
                currentStepExecutionId: null,
                supersededByWorkflowExecutionId: null,
                startedAt: new Date("2026-04-14T00:02:00.000Z"),
                completedAt: null,
                supersededAt: null,
              }
            : null,
        ),
      setCurrentStepExecutionId: () => Effect.die("unused"),
      markWorkflowExecutionCompleted: () => Effect.die("unused"),
      markWorkflowExecutionSuperseded: () => Effect.die("unused"),
      updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.die("unused"),
      retryWorkflowExecution: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>);

    const baseLayer = Layer.mergeAll(
      buildCommonLayers(),
      buildStepRepoLayer({ stepExecution }),
      lifecycleLayer,
      methodologyLayer,
      executionReadLayer,
      invokeRepoLayer,
      projectWorkUnitLayer,
      transitionLayer,
      workUnitFactLayer,
      workflowRepoLayer,
    );
    const invokeCompletionLayer = InvokeCompletionServiceLive.pipe(Layer.provide(baseLayer));
    const invokeStepDetailLayer = InvokeStepDetailServiceLive.pipe(
      Layer.provideMerge(baseLayer),
      Layer.provideMerge(invokeCompletionLayer),
    );
    const layer = StepExecutionDetailServiceLive.pipe(
      Layer.provideMerge(baseLayer),
      Layer.provideMerge(invokeStepDetailLayer),
    );

    const detail = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* StepExecutionDetailService;
        return yield* service.getRuntimeStepExecutionDetail({
          projectId: projectPin.projectId,
          stepExecutionId: stepExecution.id,
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(detail?.body.stepType).toBe("invoke");
    if (!detail || detail.body.stepType !== "invoke") {
      throw new Error("expected invoke detail body");
    }

    expect(detail.shell.completionAction).toEqual({
      kind: "complete_step_execution",
      visible: true,
      enabled: false,
      reasonIfDisabled:
        "At least one child transition path must be completed before invoke completion",
    });
    expect(detail.body.targetKind).toBe("work_unit");
    expect(detail.body.workUnitTargets).toEqual([
      expect.objectContaining({
        workUnitLabel: "Story Draft",
        transitionLabel: "Blocked Path",
        status: "blocked",
        blockedReason: "No primary workflows are available for this transition.",
        actions: expect.objectContaining({
          start: expect.objectContaining({
            enabled: false,
            reasonIfDisabled: "No primary workflows are available for this transition.",
          }),
        }),
      }),
      expect.objectContaining({
        workUnitLabel: "Story Draft",
        transitionLabel: "Ready For Drafting",
        status: "not_started",
        bindingPreview: [
          expect.objectContaining({
            destinationDefinitionId: "fact-work-unit",
            destinationFactType: "work_unit",
            requiresRuntimeValue: true,
            editorWorkUnitTypeKey: "WU.PARENT",
            editorOptions: [
              expect.objectContaining({
                value: { projectWorkUnitId: "parent-project-work-unit-1" },
              }),
            ],
          }),
        ],
        availablePrimaryWorkflows: [
          {
            workflowDefinitionId: "workflow-child-1",
            workflowDefinitionKey: "WF.CHILD.ONE",
            workflowDefinitionName: "Draft Story",
          },
        ],
      }),
      expect.objectContaining({
        workUnitLabel: "Story Draft (project-)",
        transitionLabel: "In Progress",
        workflowLabel: "Draft Story",
        currentWorkUnitStateLabel: "Drafting",
        status: "active",
        bindingPreview: [
          expect.objectContaining({
            destinationDefinitionId: "fact-work-unit",
            resolvedValueJson: { projectWorkUnitId: "setup-work-unit-1" },
          }),
        ],
        actions: expect.objectContaining({
          openWorkUnit: expect.objectContaining({ projectWorkUnitId: "project-work-unit-story-1" }),
          openTransition: expect.objectContaining({
            transitionExecutionId: "transition-exec-story-1",
          }),
          openWorkflow: expect.objectContaining({ workflowExecutionId: "child-workflow-exec-1" }),
        }),
      }),
    ]);
    expect(detail.body.completionSummary).toEqual({
      mode: "manual",
      eligible: false,
      reasonIfIneligible:
        "At least one child transition path must be completed before invoke completion",
      totalTargets: 3,
      completedTargets: 0,
    });
    expect(detail.body.propagationPreview).toEqual({
      mode: "on_step_completion",
      summary: "On step completion, 1 work-unit draft-spec output will be written.",
      outputs: [
        {
          label: "Story drafts",
          contextFactDefinitionId: "ctx-story-drafts",
          contextFactKey: "storyDrafts",
        },
      ],
    });
  });
});
