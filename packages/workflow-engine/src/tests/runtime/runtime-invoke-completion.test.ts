import { Cause, Context, Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";

import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import { AgentStepExecutionAppliedWriteRepository } from "../../repositories/agent-step-execution-applied-write-repository";
import {
  ExecutionReadRepository,
  type WorkflowExecutionDetailReadModel,
} from "../../repositories/execution-read-repository";
import {
  InvokeExecutionRepository,
  type InvokeStepExecutionStateRow,
  type InvokeWorkflowTargetExecutionRow,
  type InvokeWorkUnitCreatedArtifactSnapshotRow,
  type InvokeWorkUnitCreatedFactInstanceRow,
  type InvokeWorkUnitTargetExecutionRow,
} from "../../repositories/invoke-execution-repository";
import {
  StepExecutionRepository,
  type ReplaceRuntimeWorkflowExecutionContextFactsParams,
  type RuntimeFormStepExecutionStateRow,
  type RuntimeStepExecutionRow,
  type RuntimeWorkflowContextFactDefinitionRow,
  type RuntimeWorkflowEdgeRow,
  type RuntimeWorkflowExecutionContextFactRow,
  type RuntimeWorkflowStepDefinitionRow,
  type UpsertRuntimeFormStepExecutionStateParams,
} from "../../repositories/step-execution-repository";
import {
  TransitionExecutionRepository,
  type TransitionExecutionRow,
} from "../../repositories/transition-execution-repository";
import {
  WorkflowExecutionRepository,
  type WorkflowExecutionRow,
} from "../../repositories/workflow-execution-repository";
import { InvokeCompletionServiceLive } from "../../services/invoke-completion-service";
import { InvokePropagationServiceLive } from "../../services/invoke-propagation-service";
import { StepContextMutationServiceLive } from "../../services/step-context-mutation-service";
import { StepExecutionLifecycleServiceLive } from "../../services/step-execution-lifecycle-service";
import {
  StepExecutionTransactionService,
  StepExecutionTransactionServiceLive,
} from "../../services/step-execution-transaction-service";
import { StepProgressionService } from "../../services/step-progression-service";

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
    displayName: "Story",
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
  currentStateId: "state-active",
};

type WorkflowRuntimeState = {
  stepExecution: RuntimeStepExecutionRow;
  invokeState: InvokeStepExecutionStateRow;
  workflowTargets: InvokeWorkflowTargetExecutionRow[];
  childWorkflows: WorkflowExecutionRow[];
  contextFacts: RuntimeWorkflowExecutionContextFactRow[];
  replaceCalls: ReplaceRuntimeWorkflowExecutionContextFactsParams[];
  completeCalls: string[];
};

type WorkUnitRuntimeState = {
  stepExecution: RuntimeStepExecutionRow;
  invokeState: InvokeStepExecutionStateRow;
  workUnitTargets: InvokeWorkUnitTargetExecutionRow[];
  childTransitions: TransitionExecutionRow[];
  factMappings: InvokeWorkUnitCreatedFactInstanceRow[];
  artifactMappings: InvokeWorkUnitCreatedArtifactSnapshotRow[];
  contextFacts: RuntimeWorkflowExecutionContextFactRow[];
  replaceCalls: ReplaceRuntimeWorkflowExecutionContextFactsParams[];
  completeCalls: string[];
};

const workflowInvokeContextFacts: readonly WorkflowContextFactDto[] = [
  {
    contextFactDefinitionId: "ctx-selected-workflows",
    kind: "workflow_reference_fact",
    key: "selectedWorkflows",
    label: "Selected Workflows",
    cardinality: "many",
    allowedWorkflowDefinitionIds: ["workflow-child-2"],
  },
  {
    contextFactDefinitionId: "ctx-all-workflows",
    kind: "workflow_reference_fact",
    key: "allWorkflows",
    label: "All Workflows",
    cardinality: "many",
    allowedWorkflowDefinitionIds: [],
  },
];

const workUnitInvokeContextFacts: readonly WorkflowContextFactDto[] = [
  {
    contextFactDefinitionId: "ctx-story-selected",
    kind: "work_unit_draft_spec_fact",
    key: "selectedStoryDrafts",
    label: "Selected Story Drafts",
    cardinality: "many",
    workUnitDefinitionId: "wu-story",
    selectedWorkUnitFactDefinitionIds: ["fact-title"],
    selectedArtifactSlotDefinitionIds: ["artifact-brief"],
  },
  {
    contextFactDefinitionId: "ctx-story-all",
    kind: "work_unit_draft_spec_fact",
    key: "allStoryDrafts",
    label: "All Story Drafts",
    cardinality: "many",
    workUnitDefinitionId: "wu-story",
    selectedWorkUnitFactDefinitionIds: [],
    selectedArtifactSlotDefinitionIds: [],
  },
];

function buildCommonAuxiliaryLayers() {
  const appliedWriteRepoLayer = Layer.succeed(AgentStepExecutionAppliedWriteRepository, {
    createAppliedWrite: () => Effect.die("unused"),
    listAppliedWritesForStepExecution: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof AgentStepExecutionAppliedWriteRepository>);

  const stepProgressionLayer = Layer.succeed(StepProgressionService, {
    resolveEntryStepDefinition: () => Effect.die("unused"),
    getNextStepDefinition: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof StepProgressionService>);

  const projectContextLayer = Layer.succeed(ProjectContextRepository, {
    findProjectPin: (projectId: string) =>
      Effect.succeed(projectId === projectPin.projectId ? projectPin : null),
  } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);

  const lifecycleLayer = Layer.succeed(LifecycleRepository, {
    findWorkUnitTypes: () => Effect.succeed(workUnitTypes),
    findLifecycleStates: () => Effect.die("unused"),
    findLifecycleTransitions: () => Effect.die("unused"),
    findFactSchemas: () => Effect.die("unused"),
    findTransitionConditionSets: () => Effect.die("unused"),
    findAgentTypes: () => Effect.die("unused"),
    findTransitionWorkflowBindings: () => Effect.die("unused"),
    saveLifecycleDefinition: () => Effect.die("unused"),
    recordLifecycleEvent: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

  return Layer.mergeAll(
    appliedWriteRepoLayer,
    stepProgressionLayer,
    projectContextLayer,
    lifecycleLayer,
  );
}

function buildWorkflowInvokeCompletionRuntime() {
  const state: WorkflowRuntimeState = {
    stepExecution: {
      id: "step-exec-1",
      workflowExecutionId: parentWorkflowDetail.workflowExecution.id,
      stepDefinitionId: "invoke-step-1",
      stepType: "invoke",
      status: "active",
      activatedAt: new Date("2026-04-14T00:00:00.000Z"),
      completedAt: null,
      previousStepExecutionId: null,
    },
    invokeState: {
      id: "invoke-state-1",
      stepExecutionId: "step-exec-1",
      invokeStepDefinitionId: "invoke-step-1",
      createdAt: new Date("2026-04-14T00:00:00.000Z"),
      updatedAt: new Date("2026-04-14T00:00:00.000Z"),
    },
    workflowTargets: [
      {
        id: "invoke-wf-target-1",
        invokeStepExecutionStateId: "invoke-state-1",
        workflowDefinitionId: "workflow-child-1",
        workflowExecutionId: "child-workflow-exec-1",
        resolutionOrder: 0,
        createdAt: new Date("2026-04-14T00:01:00.000Z"),
        updatedAt: new Date("2026-04-14T00:01:00.000Z"),
      },
      {
        id: "invoke-wf-target-2",
        invokeStepExecutionStateId: "invoke-state-1",
        workflowDefinitionId: "workflow-child-2",
        workflowExecutionId: "child-workflow-exec-2",
        resolutionOrder: 1,
        createdAt: new Date("2026-04-14T00:01:00.000Z"),
        updatedAt: new Date("2026-04-14T00:01:00.000Z"),
      },
    ],
    childWorkflows: [
      {
        id: "child-workflow-exec-1",
        transitionExecutionId: "child-transition-exec-1",
        workflowId: "workflow-child-1",
        workflowRole: "supporting",
        status: "active",
        currentStepExecutionId: null,
        supersededByWorkflowExecutionId: null,
        startedAt: new Date("2026-04-14T00:02:00.000Z"),
        completedAt: null,
        supersededAt: null,
      },
      {
        id: "child-workflow-exec-2",
        transitionExecutionId: "child-transition-exec-2",
        workflowId: "workflow-child-2",
        workflowRole: "supporting",
        status: "active",
        currentStepExecutionId: null,
        supersededByWorkflowExecutionId: null,
        startedAt: new Date("2026-04-14T00:03:00.000Z"),
        completedAt: null,
        supersededAt: null,
      },
    ],
    contextFacts: [],
    replaceCalls: [],
    completeCalls: [],
  };

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
              key: "invoke-children",
              targetKind: "workflow",
              sourceMode: "fixed_set",
              workflowDefinitionIds: ["workflow-child-1", "workflow-child-2"],
            },
          },
        ],
        edges: [],
        contextFacts: workflowInvokeContextFacts,
        formDefinitions: [],
      }),
    getInvokeStepDefinition: () =>
      Effect.succeed({
        stepId: "invoke-step-1",
        stepType: "invoke",
        payload: {
          key: "invoke-children",
          targetKind: "workflow",
          sourceMode: "fixed_set",
          workflowDefinitionIds: ["workflow-child-1", "workflow-child-2"],
        },
      }),
    findArtifactSlotsByWorkUnitType: () => Effect.die("unused"),
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

  const stepRepoLayer = Layer.succeed(StepExecutionRepository, {
    createStepExecution: () => Effect.die("unused"),
    getStepExecutionById: (stepExecutionId: string) =>
      Effect.succeed(stepExecutionId === state.stepExecution.id ? state.stepExecution : null),
    findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
    listStepExecutionsForWorkflow: () => Effect.succeed([state.stepExecution]),
    completeStepExecution: ({ stepExecutionId }: { stepExecutionId: string }) =>
      Effect.sync(() => {
        if (stepExecutionId !== state.stepExecution.id) {
          return null;
        }
        state.completeCalls.push(stepExecutionId);
        state.stepExecution = {
          ...state.stepExecution,
          status: "completed",
          completedAt: new Date("2026-04-14T00:10:00.000Z"),
        };
        return state.stepExecution;
      }),
    createFormStepExecutionState: () => Effect.die("unused"),
    upsertFormStepExecutionState: (_params: UpsertRuntimeFormStepExecutionStateParams) =>
      Effect.die("unused"),
    getFormStepExecutionState: () => Effect.succeed<RuntimeFormStepExecutionStateRow | null>(null),
    replaceWorkflowExecutionContextFacts: (
      params: ReplaceRuntimeWorkflowExecutionContextFactsParams,
    ) =>
      Effect.sync(() => {
        state.replaceCalls.push(params);
        state.contextFacts = state.contextFacts.filter(
          (fact) => !params.affectedContextFactDefinitionIds.includes(fact.contextFactDefinitionId),
        );

        const created = params.currentValues.map(
          (value, index) =>
            ({
              id: `ctx-${state.replaceCalls.length}-${index}`,
              workflowExecutionId: params.workflowExecutionId,
              contextFactDefinitionId: value.contextFactDefinitionId,
              instanceOrder: value.instanceOrder,
              valueJson: value.valueJson,
              sourceStepExecutionId: params.sourceStepExecutionId,
              createdAt: new Date("2026-04-14T00:11:00.000Z"),
              updatedAt: new Date("2026-04-14T00:11:00.000Z"),
            }) satisfies RuntimeWorkflowExecutionContextFactRow,
        );

        state.contextFacts.push(...created);
        return created;
      }),
    listWorkflowExecutionContextFacts: () => Effect.succeed(state.contextFacts),
    listWorkflowContextFactDefinitions: () =>
      Effect.succeed<readonly RuntimeWorkflowContextFactDefinitionRow[]>([]),
    listWorkflowStepDefinitions: () =>
      Effect.succeed<readonly RuntimeWorkflowStepDefinitionRow[]>([]),
    listWorkflowEdges: () => Effect.succeed<readonly RuntimeWorkflowEdgeRow[]>([]),
  } as unknown as Context.Tag.Service<typeof StepExecutionRepository>);

  const invokeRepoLayer = Layer.succeed(InvokeExecutionRepository, {
    createInvokeStepExecutionState: () => Effect.die("unused"),
    getInvokeStepExecutionStateByStepExecutionId: (stepExecutionId: string) =>
      Effect.succeed(stepExecutionId === state.stepExecution.id ? state.invokeState : null),
    listInvokeWorkflowTargetExecutions: () => Effect.succeed(state.workflowTargets),
    getInvokeWorkflowTargetExecutionById: () => Effect.die("unused"),
    createInvokeWorkflowTargetExecution: () => Effect.die("unused"),
    markInvokeWorkflowTargetExecutionStarted: () => Effect.die("unused"),
    listInvokeWorkUnitTargetExecutions: () => Effect.succeed([]),
    getInvokeWorkUnitTargetExecutionById: () => Effect.die("unused"),
    createInvokeWorkUnitTargetExecution: () => Effect.die("unused"),
    markInvokeWorkUnitTargetExecutionStarted: () => Effect.die("unused"),
    listInvokeWorkUnitCreatedFactInstances: () => Effect.succeed([]),
    createInvokeWorkUnitCreatedFactInstance: () => Effect.die("unused"),
    listInvokeWorkUnitCreatedArtifactSnapshots: () => Effect.succeed([]),
    createInvokeWorkUnitCreatedArtifactSnapshot: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof InvokeExecutionRepository>);

  const workflowRepoLayer = Layer.succeed(WorkflowExecutionRepository, {
    createWorkflowExecution: () => Effect.die("unused"),
    getWorkflowExecutionById: (workflowExecutionId: string) =>
      Effect.succeed(
        workflowExecutionId === parentWorkflowDetail.workflowExecution.id
          ? parentWorkflowDetail.workflowExecution
          : (state.childWorkflows.find((row) => row.id === workflowExecutionId) ?? null),
      ),
    setCurrentStepExecutionId: () => Effect.die("unused"),
    markWorkflowExecutionCompleted: () => Effect.die("unused"),
    markWorkflowExecutionSuperseded: () => Effect.die("unused"),
    updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.die("unused"),
    retryWorkflowExecution: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>);

  const transitionRepoLayer = Layer.succeed(TransitionExecutionRepository, {
    createTransitionExecution: () => Effect.die("unused"),
    startTransitionExecution: () => Effect.die("unused"),
    switchActiveTransitionExecution: () => Effect.die("unused"),
    getActiveTransitionExecutionForWorkUnit: () => Effect.die("unused"),
    getTransitionExecutionById: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>);

  const baseLayer = Layer.mergeAll(
    buildCommonAuxiliaryLayers(),
    methodologyLayer,
    executionReadLayer,
    stepRepoLayer,
    invokeRepoLayer,
    workflowRepoLayer,
    transitionRepoLayer,
  );
  const contextLayer = StepContextMutationServiceLive.pipe(Layer.provideMerge(baseLayer));
  const completionLayer = InvokeCompletionServiceLive.pipe(Layer.provideMerge(baseLayer));
  const lifecycleLayer = StepExecutionLifecycleServiceLive.pipe(Layer.provideMerge(baseLayer));
  const propagationLayer = InvokePropagationServiceLive.pipe(
    Layer.provideMerge(baseLayer),
    Layer.provideMerge(contextLayer),
  );
  const layer = StepExecutionTransactionServiceLive.pipe(
    Layer.provideMerge(baseLayer),
    Layer.provideMerge(contextLayer),
    Layer.provideMerge(completionLayer),
    Layer.provideMerge(lifecycleLayer),
    Layer.provideMerge(propagationLayer),
  );

  return { layer, state };
}

function buildWorkUnitInvokeCompletionRuntime() {
  const state: WorkUnitRuntimeState = {
    stepExecution: {
      id: "step-exec-1",
      workflowExecutionId: parentWorkflowDetail.workflowExecution.id,
      stepDefinitionId: "invoke-step-1",
      stepType: "invoke",
      status: "active",
      activatedAt: new Date("2026-04-14T00:00:00.000Z"),
      completedAt: null,
      previousStepExecutionId: null,
    },
    invokeState: {
      id: "invoke-state-1",
      stepExecutionId: "step-exec-1",
      invokeStepDefinitionId: "invoke-step-1",
      createdAt: new Date("2026-04-14T00:00:00.000Z"),
      updatedAt: new Date("2026-04-14T00:00:00.000Z"),
    },
    workUnitTargets: [
      {
        id: "invoke-wu-target-1",
        invokeStepExecutionStateId: "invoke-state-1",
        projectWorkUnitId: "project-work-unit-1",
        workUnitDefinitionId: "wu-story",
        transitionDefinitionId: "transition-ready",
        transitionExecutionId: "child-transition-exec-1",
        workflowDefinitionId: "workflow-story",
        workflowExecutionId: "child-workflow-exec-1",
        resolutionOrder: 0,
        createdAt: new Date("2026-04-14T00:01:00.000Z"),
        updatedAt: new Date("2026-04-14T00:01:00.000Z"),
      },
      {
        id: "invoke-wu-target-2",
        invokeStepExecutionStateId: "invoke-state-1",
        projectWorkUnitId: "project-work-unit-2",
        workUnitDefinitionId: "wu-story",
        transitionDefinitionId: "transition-ready",
        transitionExecutionId: "child-transition-exec-2",
        workflowDefinitionId: "workflow-story",
        workflowExecutionId: "child-workflow-exec-2",
        resolutionOrder: 1,
        createdAt: new Date("2026-04-14T00:01:00.000Z"),
        updatedAt: new Date("2026-04-14T00:01:00.000Z"),
      },
    ],
    childTransitions: [
      {
        id: "child-transition-exec-1",
        projectWorkUnitId: "project-work-unit-1",
        transitionId: "transition-ready",
        status: "active",
        primaryWorkflowExecutionId: "child-workflow-exec-1",
        supersededByTransitionExecutionId: null,
        startedAt: new Date("2026-04-14T00:02:00.000Z"),
        completedAt: null,
        supersededAt: null,
      },
      {
        id: "child-transition-exec-2",
        projectWorkUnitId: "project-work-unit-2",
        transitionId: "transition-ready",
        status: "active",
        primaryWorkflowExecutionId: "child-workflow-exec-2",
        supersededByTransitionExecutionId: null,
        startedAt: new Date("2026-04-14T00:03:00.000Z"),
        completedAt: null,
        supersededAt: null,
      },
    ],
    factMappings: [
      {
        id: "fact-map-1",
        invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
        factDefinitionId: "fact-title",
        workUnitFactInstanceId: "fact-instance-1-title",
        createdAt: new Date("2026-04-14T00:04:00.000Z"),
      },
      {
        id: "fact-map-2",
        invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
        factDefinitionId: "fact-notes",
        workUnitFactInstanceId: "fact-instance-1-notes",
        createdAt: new Date("2026-04-14T00:04:00.000Z"),
      },
      {
        id: "fact-map-3",
        invokeWorkUnitTargetExecutionId: "invoke-wu-target-2",
        factDefinitionId: "fact-title",
        workUnitFactInstanceId: "fact-instance-2-title",
        createdAt: new Date("2026-04-14T00:04:00.000Z"),
      },
      {
        id: "fact-map-4",
        invokeWorkUnitTargetExecutionId: "invoke-wu-target-2",
        factDefinitionId: "fact-notes",
        workUnitFactInstanceId: "fact-instance-2-notes",
        createdAt: new Date("2026-04-14T00:04:00.000Z"),
      },
    ],
    artifactMappings: [
      {
        id: "artifact-map-1",
        invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
        artifactSlotDefinitionId: "artifact-brief",
        artifactSnapshotId: "artifact-snapshot-1-brief",
        createdAt: new Date("2026-04-14T00:05:00.000Z"),
      },
      {
        id: "artifact-map-2",
        invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
        artifactSlotDefinitionId: "artifact-notes",
        artifactSnapshotId: "artifact-snapshot-1-notes",
        createdAt: new Date("2026-04-14T00:05:00.000Z"),
      },
      {
        id: "artifact-map-3",
        invokeWorkUnitTargetExecutionId: "invoke-wu-target-2",
        artifactSlotDefinitionId: "artifact-brief",
        artifactSnapshotId: "artifact-snapshot-2-brief",
        createdAt: new Date("2026-04-14T00:05:00.000Z"),
      },
      {
        id: "artifact-map-4",
        invokeWorkUnitTargetExecutionId: "invoke-wu-target-2",
        artifactSlotDefinitionId: "artifact-notes",
        artifactSnapshotId: "artifact-snapshot-2-notes",
        createdAt: new Date("2026-04-14T00:05:00.000Z"),
      },
    ],
    contextFacts: [],
    replaceCalls: [],
    completeCalls: [],
  };

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
              key: "invoke-story-work",
              targetKind: "work_unit",
              sourceMode: "fixed_set",
              workUnitDefinitionId: "wu-story",
              bindings: [],
              activationTransitions: [
                { transitionId: "transition-ready", workflowDefinitionIds: ["workflow-story"] },
              ],
            },
          },
        ],
        edges: [],
        contextFacts: workUnitInvokeContextFacts,
        formDefinitions: [],
      }),
    getInvokeStepDefinition: () =>
      Effect.succeed({
        stepId: "invoke-step-1",
        stepType: "invoke",
        payload: {
          key: "invoke-story-work",
          targetKind: "work_unit",
          sourceMode: "fixed_set",
          workUnitDefinitionId: "wu-story",
          bindings: [],
          activationTransitions: [
            { transitionId: "transition-ready", workflowDefinitionIds: ["workflow-story"] },
          ],
        },
      }),
    findArtifactSlotsByWorkUnitType: () => Effect.die("unused"),
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

  const stepRepoLayer = Layer.succeed(StepExecutionRepository, {
    createStepExecution: () => Effect.die("unused"),
    getStepExecutionById: (stepExecutionId: string) =>
      Effect.succeed(stepExecutionId === state.stepExecution.id ? state.stepExecution : null),
    findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
    listStepExecutionsForWorkflow: () => Effect.succeed([state.stepExecution]),
    completeStepExecution: ({ stepExecutionId }: { stepExecutionId: string }) =>
      Effect.sync(() => {
        if (stepExecutionId !== state.stepExecution.id) {
          return null;
        }
        state.completeCalls.push(stepExecutionId);
        state.stepExecution = {
          ...state.stepExecution,
          status: "completed",
          completedAt: new Date("2026-04-14T00:10:00.000Z"),
        };
        return state.stepExecution;
      }),
    createFormStepExecutionState: () => Effect.die("unused"),
    upsertFormStepExecutionState: (_params: UpsertRuntimeFormStepExecutionStateParams) =>
      Effect.die("unused"),
    getFormStepExecutionState: () => Effect.succeed<RuntimeFormStepExecutionStateRow | null>(null),
    replaceWorkflowExecutionContextFacts: (
      params: ReplaceRuntimeWorkflowExecutionContextFactsParams,
    ) =>
      Effect.sync(() => {
        state.replaceCalls.push(params);
        state.contextFacts = state.contextFacts.filter(
          (fact) => !params.affectedContextFactDefinitionIds.includes(fact.contextFactDefinitionId),
        );

        const created = params.currentValues.map(
          (value, index) =>
            ({
              id: `ctx-${state.replaceCalls.length}-${index}`,
              workflowExecutionId: params.workflowExecutionId,
              contextFactDefinitionId: value.contextFactDefinitionId,
              instanceOrder: value.instanceOrder,
              valueJson: value.valueJson,
              sourceStepExecutionId: params.sourceStepExecutionId,
              createdAt: new Date("2026-04-14T00:11:00.000Z"),
              updatedAt: new Date("2026-04-14T00:11:00.000Z"),
            }) satisfies RuntimeWorkflowExecutionContextFactRow,
        );

        state.contextFacts.push(...created);
        return created;
      }),
    listWorkflowExecutionContextFacts: () => Effect.succeed(state.contextFacts),
    listWorkflowContextFactDefinitions: () =>
      Effect.succeed<readonly RuntimeWorkflowContextFactDefinitionRow[]>([]),
    listWorkflowStepDefinitions: () =>
      Effect.succeed<readonly RuntimeWorkflowStepDefinitionRow[]>([]),
    listWorkflowEdges: () => Effect.succeed<readonly RuntimeWorkflowEdgeRow[]>([]),
  } as unknown as Context.Tag.Service<typeof StepExecutionRepository>);

  const invokeRepoLayer = Layer.succeed(InvokeExecutionRepository, {
    createInvokeStepExecutionState: () => Effect.die("unused"),
    getInvokeStepExecutionStateByStepExecutionId: (stepExecutionId: string) =>
      Effect.succeed(stepExecutionId === state.stepExecution.id ? state.invokeState : null),
    listInvokeWorkflowTargetExecutions: () => Effect.succeed([]),
    getInvokeWorkflowTargetExecutionById: () => Effect.die("unused"),
    createInvokeWorkflowTargetExecution: () => Effect.die("unused"),
    markInvokeWorkflowTargetExecutionStarted: () => Effect.die("unused"),
    listInvokeWorkUnitTargetExecutions: () => Effect.succeed(state.workUnitTargets),
    getInvokeWorkUnitTargetExecutionById: () => Effect.die("unused"),
    createInvokeWorkUnitTargetExecution: () => Effect.die("unused"),
    markInvokeWorkUnitTargetExecutionStarted: () => Effect.die("unused"),
    listInvokeWorkUnitCreatedFactInstances: (invokeWorkUnitTargetExecutionId: string) =>
      Effect.succeed(
        state.factMappings.filter(
          (row) => row.invokeWorkUnitTargetExecutionId === invokeWorkUnitTargetExecutionId,
        ),
      ),
    createInvokeWorkUnitCreatedFactInstance: () => Effect.die("unused"),
    listInvokeWorkUnitCreatedArtifactSnapshots: (invokeWorkUnitTargetExecutionId: string) =>
      Effect.succeed(
        state.artifactMappings.filter(
          (row) => row.invokeWorkUnitTargetExecutionId === invokeWorkUnitTargetExecutionId,
        ),
      ),
    createInvokeWorkUnitCreatedArtifactSnapshot: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof InvokeExecutionRepository>);

  const workflowRepoLayer = Layer.succeed(WorkflowExecutionRepository, {
    createWorkflowExecution: () => Effect.die("unused"),
    getWorkflowExecutionById: (workflowExecutionId: string) =>
      Effect.succeed(
        workflowExecutionId === parentWorkflowDetail.workflowExecution.id
          ? parentWorkflowDetail.workflowExecution
          : null,
      ),
    setCurrentStepExecutionId: () => Effect.die("unused"),
    markWorkflowExecutionCompleted: () => Effect.die("unused"),
    markWorkflowExecutionSuperseded: () => Effect.die("unused"),
    updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.die("unused"),
    retryWorkflowExecution: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>);

  const transitionRepoLayer = Layer.succeed(TransitionExecutionRepository, {
    createTransitionExecution: () => Effect.die("unused"),
    startTransitionExecution: () => Effect.die("unused"),
    switchActiveTransitionExecution: () => Effect.die("unused"),
    getActiveTransitionExecutionForWorkUnit: () => Effect.die("unused"),
    getTransitionExecutionById: (transitionExecutionId: string) =>
      Effect.succeed(
        state.childTransitions.find((row) => row.id === transitionExecutionId) ?? null,
      ),
  } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>);

  const baseLayer = Layer.mergeAll(
    buildCommonAuxiliaryLayers(),
    methodologyLayer,
    executionReadLayer,
    stepRepoLayer,
    invokeRepoLayer,
    workflowRepoLayer,
    transitionRepoLayer,
  );
  const contextLayer = StepContextMutationServiceLive.pipe(Layer.provideMerge(baseLayer));
  const completionLayer = InvokeCompletionServiceLive.pipe(Layer.provideMerge(baseLayer));
  const lifecycleLayer = StepExecutionLifecycleServiceLive.pipe(Layer.provideMerge(baseLayer));
  const propagationLayer = InvokePropagationServiceLive.pipe(
    Layer.provideMerge(baseLayer),
    Layer.provideMerge(contextLayer),
  );
  const layer = StepExecutionTransactionServiceLive.pipe(
    Layer.provideMerge(baseLayer),
    Layer.provideMerge(contextLayer),
    Layer.provideMerge(completionLayer),
    Layer.provideMerge(lifecycleLayer),
    Layer.provideMerge(propagationLayer),
  );

  return { layer, state };
}

describe("invoke completion runtime flow", () => {
  it("re-checks workflow-target completion, propagates filtered/default workflow references, and is idempotent on retry", async () => {
    const runtime = buildWorkflowInvokeCompletionRuntime();

    const firstExit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* StepExecutionTransactionService;
        return yield* service.completeStepExecution({
          workflowExecutionId: "parent-workflow-exec-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(firstExit._tag).toBe("Failure");
    if (firstExit._tag === "Failure") {
      const failure = Cause.failureOption(firstExit.cause);
      expect(Option.isSome(failure)).toBe(true);
      if (Option.isSome(failure)) {
        expect(failure.value).toMatchObject({
          _tag: "RepositoryError",
          operation: "step-execution-transaction",
        });
      }
    }

    runtime.state.childWorkflows[1] = {
      ...runtime.state.childWorkflows[1]!,
      status: "completed",
      completedAt: new Date("2026-04-14T00:06:00.000Z"),
    };

    const completed = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* StepExecutionTransactionService;

        const first = yield* service.completeStepExecution({
          workflowExecutionId: "parent-workflow-exec-1",
          stepExecutionId: "step-exec-1",
        });

        const second = yield* service.completeStepExecution({
          workflowExecutionId: "parent-workflow-exec-1",
          stepExecutionId: "step-exec-1",
        });

        return { first, second };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(completed.first).toEqual({
      stepExecutionId: "step-exec-1",
      status: "completed",
    });
    expect(completed.second).toEqual({
      stepExecutionId: "step-exec-1",
      status: "completed",
    });
    expect(runtime.state.stepExecution.status).toBe("completed");
    expect(runtime.state.replaceCalls).toHaveLength(1);
    expect(runtime.state.completeCalls).toEqual(["step-exec-1"]);

    expect(
      runtime.state.contextFacts
        .filter((fact) => fact.contextFactDefinitionId === "ctx-selected-workflows")
        .map((fact) => fact.valueJson),
    ).toEqual([
      {
        workflowDefinitionId: "workflow-child-2",
        workflowExecutionId: "child-workflow-exec-2",
      },
    ]);
    expect(
      runtime.state.contextFacts
        .filter((fact) => fact.contextFactDefinitionId === "ctx-all-workflows")
        .map((fact) => fact.valueJson),
    ).toEqual([
      {
        workflowDefinitionId: "workflow-child-1",
        workflowExecutionId: "child-workflow-exec-1",
      },
      {
        workflowDefinitionId: "workflow-child-2",
        workflowExecutionId: "child-workflow-exec-2",
      },
    ]);
  });

  it("re-checks work-unit-target completion and propagates selected and default work-unit draft-spec references", async () => {
    const runtime = buildWorkUnitInvokeCompletionRuntime();

    const firstExit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* StepExecutionTransactionService;
        return yield* service.completeStepExecution({
          workflowExecutionId: "parent-workflow-exec-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(firstExit._tag).toBe("Failure");

    runtime.state.childTransitions[0] = {
      ...runtime.state.childTransitions[0]!,
      status: "completed",
      completedAt: new Date("2026-04-14T00:06:00.000Z"),
    };

    const completed = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* StepExecutionTransactionService;
        return yield* service.completeStepExecution({
          workflowExecutionId: "parent-workflow-exec-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(completed).toEqual({
      stepExecutionId: "step-exec-1",
      status: "completed",
    });
    expect(runtime.state.replaceCalls).toHaveLength(1);
    expect(runtime.state.completeCalls).toEqual(["step-exec-1"]);

    expect(
      runtime.state.contextFacts
        .filter((fact) => fact.contextFactDefinitionId === "ctx-story-selected")
        .map((fact) => fact.valueJson),
    ).toEqual([
      {
        projectWorkUnitId: "project-work-unit-1",
        workUnitFactInstanceIds: ["fact-instance-1-title"],
        artifactSnapshotIds: ["artifact-snapshot-1-brief"],
      },
      {
        projectWorkUnitId: "project-work-unit-2",
        workUnitFactInstanceIds: ["fact-instance-2-title"],
        artifactSnapshotIds: ["artifact-snapshot-2-brief"],
      },
    ]);
    expect(
      runtime.state.contextFacts
        .filter((fact) => fact.contextFactDefinitionId === "ctx-story-all")
        .map((fact) => fact.valueJson),
    ).toEqual([
      {
        projectWorkUnitId: "project-work-unit-1",
        workUnitFactInstanceIds: ["fact-instance-1-title", "fact-instance-1-notes"],
        artifactSnapshotIds: ["artifact-snapshot-1-brief", "artifact-snapshot-1-notes"],
      },
      {
        projectWorkUnitId: "project-work-unit-2",
        workUnitFactInstanceIds: ["fact-instance-2-title", "fact-instance-2-notes"],
        artifactSnapshotIds: ["artifact-snapshot-2-brief", "artifact-snapshot-2-notes"],
      },
    ]);
  });
});
