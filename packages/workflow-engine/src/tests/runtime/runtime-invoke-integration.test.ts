import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Cause, Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { RepositoryError } from "../../errors";
import { AgentStepExecutionAppliedWriteRepository } from "../../repositories/agent-step-execution-applied-write-repository";
import {
  ExecutionReadRepository,
  type WorkflowExecutionDetailReadModel,
} from "../../repositories/execution-read-repository";
import {
  InvokeExecutionRepository,
  type InvokeStepExecutionStateRow,
  type InvokeWorkUnitCreatedArtifactSnapshotRow,
  type InvokeWorkUnitCreatedFactInstanceRow,
  type InvokeWorkUnitTargetExecutionRow,
  type InvokeWorkflowTargetExecutionRow,
  type StartInvokeWorkflowTargetAtomicallyParams,
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
import { InvokeWorkUnitExecutionService } from "../../services/invoke-work-unit-execution-service";
import { InvokeWorkflowExecutionServiceLive } from "../../services/invoke-workflow-execution-service";
import { InvokeWorkflowExecutionService } from "../../services/invoke-workflow-execution-service";
import { StepContextMutationServiceLive } from "../../services/step-context-mutation-service";
import { StepExecutionLifecycleServiceLive } from "../../services/step-execution-lifecycle-service";
import { StepProgressionService } from "../../services/step-progression-service";
import {
  StepExecutionTransactionService,
  StepExecutionTransactionServiceLive,
} from "../../services/step-execution-transaction-service";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../");

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

function makeStepRepo(stepExecution: RuntimeStepExecutionRow) {
  return Layer.succeed(StepExecutionRepository, {
    createStepExecution: () => Effect.die("unused"),
    getStepExecutionById: (stepExecutionId: string) =>
      Effect.succeed(stepExecutionId === stepExecution.id ? stepExecution : null),
    findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
    listStepExecutionsForWorkflow: () => Effect.succeed([stepExecution]),
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

function buildWorkflowInvokeRuntime(options?: { failAtomic?: boolean }) {
  const invokeState: InvokeStepExecutionStateRow = {
    id: "invoke-state-1",
    stepExecutionId: "step-exec-1",
    invokeStepDefinitionId: "invoke-step-1",
    createdAt: new Date("2026-04-14T00:00:00.000Z"),
    updatedAt: new Date("2026-04-14T00:00:00.000Z"),
  };
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
  const workflowTarget: InvokeWorkflowTargetExecutionRow = {
    id: "invoke-wf-target-1",
    invokeStepExecutionStateId: invokeState.id,
    workflowDefinitionId: "workflow-child-1",
    workflowExecutionId: null,
    resolutionOrder: 0,
    createdAt: new Date("2026-04-14T00:01:00.000Z"),
    updatedAt: new Date("2026-04-14T00:01:00.000Z"),
  };
  const state = {
    workflowTarget,
    createdWorkflowExecutions: [] as WorkflowExecutionRow[],
    atomicCalls: [] as StartInvokeWorkflowTargetAtomicallyParams[],
  };

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
    listInvokeWorkflowTargetExecutions: () => Effect.succeed([state.workflowTarget]),
    getInvokeWorkflowTargetExecutionById: (invokeWorkflowTargetExecutionId: string) =>
      Effect.succeed(
        invokeWorkflowTargetExecutionId === state.workflowTarget.id ? state.workflowTarget : null,
      ),
    createInvokeWorkflowTargetExecution: () => Effect.die("unused"),
    startInvokeWorkflowTargetAtomically: ({
      invokeWorkflowTargetExecutionId,
      transitionExecutionId,
      workflowDefinitionId,
    }: StartInvokeWorkflowTargetAtomicallyParams) =>
      Effect.gen(function* () {
        state.atomicCalls.push({
          invokeWorkflowTargetExecutionId,
          transitionExecutionId,
          workflowDefinitionId,
        });
        yield* Effect.promise(() => Promise.resolve());

        if (options?.failAtomic) {
          return yield* Effect.fail(
            new RepositoryError({
              operation: "invoke.atomic.startInvokeWorkflowTarget",
              cause: new Error("Injected atomic workflow-start failure"),
            }),
          );
        }

        if (state.workflowTarget.workflowExecutionId) {
          return {
            invokeWorkflowTargetExecutionId: state.workflowTarget.id,
            workflowExecutionId: state.workflowTarget.workflowExecutionId,
            result: "already_started" as const,
          };
        }

        const workflowExecutionId = `child-workflow-exec-${state.createdWorkflowExecutions.length + 1}`;
        state.createdWorkflowExecutions.push({
          id: workflowExecutionId,
          transitionExecutionId,
          workflowId: workflowDefinitionId,
          workflowRole: "supporting",
          status: "active",
          currentStepExecutionId: null,
          supersededByWorkflowExecutionId: null,
          startedAt: new Date("2026-04-14T00:02:00.000Z"),
          completedAt: null,
          supersededAt: null,
        });
        state.workflowTarget.workflowExecutionId = workflowExecutionId;
        return {
          invokeWorkflowTargetExecutionId: state.workflowTarget.id,
          workflowExecutionId,
          result: "started" as const,
        };
      }),
    markInvokeWorkflowTargetExecutionStarted: () => Effect.die("unused"),
    listInvokeWorkUnitTargetExecutions: () => Effect.succeed([]),
    getInvokeWorkUnitTargetExecutionById: () => Effect.succeed(null),
    createInvokeWorkUnitTargetExecution: () => Effect.die("unused"),
    markInvokeWorkUnitTargetExecutionStarted: () => Effect.die("unused"),
    listInvokeWorkUnitCreatedFactInstances: () => Effect.succeed([]),
    createInvokeWorkUnitCreatedFactInstance: () => Effect.die("unused"),
    listInvokeWorkUnitCreatedArtifactSnapshots: () => Effect.succeed([]),
    createInvokeWorkUnitCreatedArtifactSnapshot: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof InvokeExecutionRepository>);

  return {
    state,
    dependencies: Layer.mergeAll(executionReadLayer, makeStepRepo(stepExecution), invokeRepoLayer),
  };
}

function buildWorkUnitCompletionRuntime(options?: { zeroTargets?: boolean }) {
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
    invokeStepDefinitionId: "invoke-step-1",
    createdAt: new Date("2026-04-14T00:00:00.000Z"),
    updatedAt: new Date("2026-04-14T00:00:00.000Z"),
  };
  const state = {
    stepExecution,
    childTransitions: [
      {
        id: "child-transition-exec-1",
        projectWorkUnitId: "project-work-unit-1",
        transitionId: "transition-ready",
        status: "completed" as const,
        primaryWorkflowExecutionId: "child-workflow-exec-1",
        supersededByTransitionExecutionId: null,
        startedAt: new Date("2026-04-14T00:02:00.000Z"),
        completedAt: new Date("2026-04-14T00:06:00.000Z"),
        supersededAt: null,
      },
    ] as TransitionExecutionRow[],
    workUnitTargets: (options?.zeroTargets
      ? []
      : [
          {
            id: "invoke-wu-target-1",
            invokeStepExecutionStateId: invokeState.id,
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
        ]) as InvokeWorkUnitTargetExecutionRow[],
    factMappings: (options?.zeroTargets
      ? []
      : [
          {
            id: "fact-map-1",
            invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
            factDefinitionId: "fact-title",
            workUnitFactInstanceId: "fact-instance-1-title",
            createdAt: new Date("2026-04-14T00:04:00.000Z"),
          },
        ]) as InvokeWorkUnitCreatedFactInstanceRow[],
    artifactMappings: (options?.zeroTargets
      ? []
      : [
          {
            id: "artifact-map-1",
            invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
            artifactSlotDefinitionId: "artifact-brief",
            artifactSnapshotId: "artifact-snapshot-1-brief",
            createdAt: new Date("2026-04-14T00:05:00.000Z"),
          },
        ]) as InvokeWorkUnitCreatedArtifactSnapshotRow[],
    contextFacts: [] as RuntimeWorkflowExecutionContextFactRow[],
    replaceCalls: [] as ReplaceRuntimeWorkflowExecutionContextFactsParams[],
    completeCalls: [] as string[],
  };

  const projectContextLayer = Layer.succeed(ProjectContextRepository, {
    findProjectPin: (projectId: string) =>
      Effect.succeed(projectId === projectPin.projectId ? projectPin : null),
  } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);

  const stepProgressionLayer = Layer.succeed(StepProgressionService, {
    resolveEntryStepDefinition: () => Effect.die("unused"),
    getNextStepDefinition: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof StepProgressionService>);

  const appliedWriteRepoLayer = Layer.succeed(AgentStepExecutionAppliedWriteRepository, {
    createAppliedWrite: () => Effect.die("unused"),
    listAppliedWritesForStepExecution: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof AgentStepExecutionAppliedWriteRepository>);

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
          cardinality: "one",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "wu-story",
          methodologyVersionId: "version-1",
          key: "WU.STORY",
          displayName: "Story",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "many",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    findLifecycleStates: () => Effect.die("unused"),
    findLifecycleTransitions: () => Effect.die("unused"),
    findFactSchemas: () => Effect.die("unused"),
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
        contextFacts: [
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
        ],
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
        if (stepExecutionId !== state.stepExecution.id) return null;
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
        state.contextFacts = params.currentValues.map((value, index) => ({
          id: `ctx-${index}`,
          workflowExecutionId: params.workflowExecutionId,
          contextFactDefinitionId: value.contextFactDefinitionId,
          instanceOrder: value.instanceOrder,
          valueJson: value.valueJson,
          sourceStepExecutionId: params.sourceStepExecutionId,
          createdAt: new Date("2026-04-14T00:11:00.000Z"),
          updatedAt: new Date("2026-04-14T00:11:00.000Z"),
        }));
        return state.contextFacts;
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
      Effect.succeed(stepExecutionId === state.stepExecution.id ? invokeState : null),
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
    projectContextLayer,
    stepProgressionLayer,
    appliedWriteRepoLayer,
    lifecycleLayer,
    methodologyLayer,
    executionReadLayer,
    stepRepoLayer,
    invokeRepoLayer,
    workflowRepoLayer,
    transitionRepoLayer,
  );
  const contextLayer = StepContextMutationServiceLive.pipe(Layer.provideMerge(baseLayer));
  const completionLayer = InvokeCompletionServiceLive.pipe(Layer.provideMerge(baseLayer));
  const lifecycleServiceLayer = StepExecutionLifecycleServiceLive.pipe(
    Layer.provideMerge(baseLayer),
  );
  const propagationLayer = InvokePropagationServiceLive.pipe(
    Layer.provideMerge(baseLayer),
    Layer.provideMerge(contextLayer),
  );

  return {
    state,
    layer: StepExecutionTransactionServiceLive.pipe(
      Layer.provideMerge(baseLayer),
      Layer.provideMerge(contextLayer),
      Layer.provideMerge(completionLayer),
      Layer.provideMerge(lifecycleServiceLayer),
      Layer.provideMerge(propagationLayer),
    ),
  };
}

describe("runtime invoke integration", () => {
  it("keeps both invoke start services wired into the published runtime step layer", () => {
    const source = readFileSync(
      resolve(repoRoot, "packages/workflow-engine/src/layers/live.ts"),
      "utf8",
    );

    expect(source).toContain(
      "export const WorkflowEngineRuntimeStepServicesLive = Layer.mergeAll(",
    );
    expect(source).toContain("InvokeWorkflowExecutionServiceLive");
    expect(source).toContain("InvokeWorkUnitExecutionServiceLive");
  });

  it("starts workflow invoke targets race-safely through the live runtime step layer", async () => {
    const runtime = buildWorkflowInvokeRuntime();
    const layer = InvokeWorkflowExecutionServiceLive.pipe(Layer.provide(runtime.dependencies));

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeWorkflowExecutionService;
        return yield* Effect.all(
          [
            service.startInvokeWorkflowTarget({
              projectId: "project-1",
              stepExecutionId: "step-exec-1",
              invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
            }),
            service.startInvokeWorkflowTarget({
              projectId: "project-1",
              stepExecutionId: "step-exec-1",
              invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
            }),
          ],
          { concurrency: "unbounded" },
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(result).toEqual([
      {
        invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
        workflowExecutionId: "child-workflow-exec-1",
        result: "started",
      },
      {
        invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
        workflowExecutionId: "child-workflow-exec-1",
        result: "already_started",
      },
    ]);
    expect(runtime.state.createdWorkflowExecutions).toHaveLength(1);
    expect(runtime.state.atomicCalls).toHaveLength(2);
  });

  it("surfaces atomic workflow-start failures without orphaning child workflow executions", async () => {
    const runtime = buildWorkflowInvokeRuntime({ failAtomic: true });
    const layer = InvokeWorkflowExecutionServiceLive.pipe(Layer.provide(runtime.dependencies));

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* InvokeWorkflowExecutionService;
        return yield* service.startInvokeWorkflowTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      const failure = Cause.failureOption(exit.cause);
      expect(failure._tag).toBe("Some");
      if (failure._tag === "Some") {
        expect(failure.value).toMatchObject({
          _tag: "RepositoryError",
          operation: "invoke.atomic.startInvokeWorkflowTarget",
        });
      }
    }
    expect(runtime.state.createdWorkflowExecutions).toEqual([]);
    expect(runtime.state.workflowTarget.workflowExecutionId).toBeNull();
  });

  it("rejects zero-target work-unit invoke completion with the canonical disabled reason", async () => {
    const runtime = buildWorkUnitCompletionRuntime({ zeroTargets: true });

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* StepExecutionTransactionService;
        return yield* service.completeStepExecution({
          workflowExecutionId: "parent-workflow-exec-1",
          stepExecutionId: "step-exec-1",
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      const failure = Cause.failureOption(exit.cause);
      expect(failure._tag).toBe("Some");
      if (failure._tag === "Some") {
        expect(failure.value).toMatchObject({
          _tag: "RepositoryError",
          operation: "step-execution-transaction",
        });
        expect(String((failure.value as RepositoryError).cause)).toContain(
          "No invoke targets resolved",
        );
      }
    }
    expect(runtime.state.replaceCalls).toHaveLength(0);
    expect(runtime.state.completeCalls).toHaveLength(0);
  });

  it("keeps work-unit invoke completion propagation idempotent when completion is retried", async () => {
    const runtime = buildWorkUnitCompletionRuntime();

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

    expect(completed).toEqual({
      first: { stepExecutionId: "step-exec-1", status: "completed" },
      second: { stepExecutionId: "step-exec-1", status: "completed" },
    });
    expect(runtime.state.replaceCalls).toHaveLength(1);
    expect(runtime.state.completeCalls).toEqual(["step-exec-1"]);
    expect(runtime.state.contextFacts.map((fact) => fact.valueJson)).toEqual([
      {
        projectWorkUnitId: "project-work-unit-1",
        workUnitFactInstanceIds: ["fact-instance-1-title"],
        artifactSnapshotIds: ["artifact-snapshot-1-brief"],
      },
    ]);
  });
});
