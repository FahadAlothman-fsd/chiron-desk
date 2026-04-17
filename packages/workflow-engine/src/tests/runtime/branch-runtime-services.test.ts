import { Cause, Context, Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";

import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import { RepositoryError } from "../../errors";
import { BranchStepRuntimeRepository } from "../../repositories/branch-step-runtime-repository";
import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { ProjectFactRepository } from "../../repositories/project-fact-repository";
import {
  StepExecutionRepository,
  type RuntimeStepExecutionRow,
} from "../../repositories/step-execution-repository";
import { WorkUnitFactRepository } from "../../repositories/work-unit-fact-repository";
import { WorkflowExecutionRepository } from "../../repositories/workflow-execution-repository";
import { FormStepExecutionService } from "../../services/form-step-execution-service";
import { InvokeCompletionService } from "../../services/invoke-completion-service";
import { InvokeTargetResolutionService } from "../../services/invoke-target-resolution-service";
import { StepContextMutationService } from "../../services/step-context-mutation-service";
import { StepExecutionLifecycleService } from "../../services/step-execution-lifecycle-service";
import {
  StepExecutionTransactionService,
  StepExecutionTransactionServiceLive,
} from "../../services/step-execution-transaction-service";
import { StepProgressionServiceLive } from "../../services/step-progression-service";
import {
  WorkflowExecutionStepCommandService,
  WorkflowExecutionStepCommandServiceLive,
} from "../../services/workflow-execution-step-command-service";
import { AgentStepExecutionAppliedWriteRepository } from "../../repositories/agent-step-execution-applied-write-repository";
import { InvokePropagationService } from "../../services/invoke-propagation-service";
import { ActionStepRuntimeService } from "../../services/action-step-runtime-service";

type HarnessOptions = {
  selectedTargetStepId: string | null;
  factValue: "ready" | "blocked";
  routeTargets?: readonly string[];
};

function makeCoreHarness(options: HarnessOptions) {
  const routeTargets = options.routeTargets ?? ["step-a", "step-b"];

  const workflowExecution = {
    id: "wfexec-1",
    transitionExecutionId: "tx-1",
    workflowId: "workflow-1",
    workflowRole: "primary" as const,
    status: "active" as const,
    currentStepExecutionId: "step-exec-branch",
    supersededByWorkflowExecutionId: null,
    startedAt: new Date("2026-04-17T00:00:00.000Z"),
    completedAt: null,
    supersededAt: null,
  };

  const stepExecutions: RuntimeStepExecutionRow[] = [
    {
      id: "step-exec-branch",
      workflowExecutionId: workflowExecution.id,
      stepDefinitionId: "step-branch",
      stepType: "branch",
      status: "active",
      activatedAt: new Date("2026-04-17T00:01:00.000Z"),
      completedAt: null,
      previousStepExecutionId: null,
    },
  ];

  const branchState = {
    branch: {
      id: "branch-runtime-1",
      stepExecutionId: "step-exec-branch",
      selectedTargetStepId: options.selectedTargetStepId,
      savedAt: options.selectedTargetStepId ? new Date("2026-04-17T00:01:30.000Z") : null,
      createdAt: new Date("2026-04-17T00:01:00.000Z"),
      updatedAt: new Date("2026-04-17T00:01:00.000Z"),
    },
    routes: routeTargets.map((targetStepId, index) => ({
      id: `route-row-${index + 1}`,
      branchStepExecutionId: "branch-runtime-1",
      routeId: `route-${index + 1}`,
      targetStepId,
      sortOrder: index,
      conditionMode: "all" as const,
      isValid: true,
      evaluationTreeJson: null,
      createdAt: new Date("2026-04-17T00:01:00.000Z"),
      updatedAt: new Date("2026-04-17T00:01:00.000Z"),
    })),
  };

  const contextFactDefinitions: readonly WorkflowContextFactDto[] = [
    {
      contextFactDefinitionId: "fact-status",
      kind: "plain_value_fact",
      key: "status",
      cardinality: "one",
      valueType: "string",
    },
  ];

  const stepRepoLayer = Layer.succeed(StepExecutionRepository, {
    createStepExecution: () => Effect.die("unused"),
    getStepExecutionById: (stepExecutionId: string) =>
      Effect.succeed(stepExecutions.find((row) => row.id === stepExecutionId) ?? null),
    findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
    listStepExecutionsForWorkflow: () => Effect.succeed(stepExecutions),
    completeStepExecution: ({ stepExecutionId }: { stepExecutionId: string }) =>
      Effect.sync(() => {
        const row = stepExecutions.find((item) => item.id === stepExecutionId);
        if (!row) {
          return null;
        }
        row.status = "completed";
        row.completedAt = new Date("2026-04-17T00:02:00.000Z");
        return row;
      }),
    createFormStepExecutionState: () => Effect.die("unused"),
    upsertFormStepExecutionState: () => Effect.die("unused"),
    getFormStepExecutionState: () => Effect.succeed(null),
    replaceWorkflowExecutionContextFacts: () => Effect.die("unused"),
    listWorkflowExecutionContextFacts: () =>
      Effect.succeed([
        {
          id: "ctx-1",
          workflowExecutionId: workflowExecution.id,
          contextFactDefinitionId: "fact-status",
          instanceOrder: 0,
          valueJson: options.factValue,
          sourceStepExecutionId: null,
          createdAt: new Date("2026-04-17T00:00:00.000Z"),
          updatedAt: new Date("2026-04-17T00:00:00.000Z"),
        },
      ]),
    listWorkflowContextFactDefinitions: () => Effect.succeed([]),
    listWorkflowStepDefinitions: () =>
      Effect.succeed([
        {
          id: "step-branch",
          workflowId: workflowExecution.workflowId,
          key: "branch-step",
          type: "branch",
          createdAt: new Date("2026-04-17T00:00:00.000Z"),
        },
        {
          id: "step-a",
          workflowId: workflowExecution.workflowId,
          key: "step-a",
          type: "display",
          createdAt: new Date("2026-04-17T00:00:01.000Z"),
        },
        {
          id: "step-b",
          workflowId: workflowExecution.workflowId,
          key: "step-b",
          type: "display",
          createdAt: new Date("2026-04-17T00:00:02.000Z"),
        },
      ]),
    listWorkflowEdges: () => Effect.succeed([]),
    getWorkflowEntryStepId: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof StepExecutionRepository>);

  const branchRepoLayer = Layer.succeed(BranchStepRuntimeRepository, {
    createOnActivation: () => Effect.die("unused"),
    loadWithRoutes: () => Effect.succeed(branchState),
    saveSelection: ({ selectedTargetStepId }: { selectedTargetStepId: string | null }) =>
      Effect.sync(() => {
        branchState.branch.selectedTargetStepId = selectedTargetStepId;
        branchState.branch.savedAt = new Date("2026-04-17T00:01:45.000Z");
        return branchState.branch;
      }),
  } as unknown as Context.Tag.Service<typeof BranchStepRuntimeRepository>);

  const executionReadLayer = Layer.succeed(ExecutionReadRepository, {
    getTransitionExecutionDetail: () => Effect.die("unused"),
    listTransitionExecutionsForWorkUnit: () => Effect.die("unused"),
    getWorkflowExecutionDetail: () =>
      Effect.succeed({
        workflowExecution,
        transitionExecution: {
          id: "tx-1",
          projectWorkUnitId: "wu-1",
          transitionId: "transition-1",
          status: "active" as const,
          primaryWorkflowExecutionId: workflowExecution.id,
          supersededByTransitionExecutionId: null,
          startedAt: new Date("2026-04-17T00:00:00.000Z"),
          completedAt: null,
          supersededAt: null,
        },
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        workUnitTypeId: "wu-type-1",
        currentStateId: "draft",
      }),
    listWorkflowExecutionsForTransition: () => Effect.succeed([workflowExecution]),
    listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
  } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);

  const workflowRepoLayer = Layer.succeed(WorkflowExecutionRepository, {
    createWorkflowExecution: () => Effect.die("unused"),
    getWorkflowExecutionById: () => Effect.succeed(workflowExecution),
    setCurrentStepExecutionId: () => Effect.die("unused"),
    markWorkflowExecutionCompleted: () => Effect.die("unused"),
    markWorkflowExecutionSuperseded: () => Effect.die("unused"),
    updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.die("unused"),
    retryWorkflowExecution: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>);

  const projectContextLayer = Layer.succeed(ProjectContextRepository, {
    findProjectPin: () =>
      Effect.succeed({
        projectId: "project-1",
        methodologyVersionId: "version-1",
        methodologyId: "methodology-1",
        methodologyKey: "core",
        publishedVersion: "1.0.0",
        actorId: null,
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        updatedAt: new Date("2026-04-17T00:00:00.000Z"),
      }),
  } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);

  const lifecycleLayer = Layer.succeed(LifecycleRepository, {
    findWorkUnitTypes: () =>
      Effect.succeed([
        {
          id: "wu-type-1",
          methodologyVersionId: "version-1",
          key: "WU.STORY",
          displayName: "Story",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "many" as const,
          createdAt: new Date("2026-04-17T00:00:00.000Z"),
          updatedAt: new Date("2026-04-17T00:00:00.000Z"),
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
    getBranchStepDefinition: () =>
      Effect.succeed({
        stepId: "step-branch",
        payload: {
          key: "branch-step",
          label: "Branch",
          defaultTargetStepId: "step-b",
          routes: routeTargets.map((targetStepId, index) => ({
            routeId: `route-${index + 1}`,
            targetStepId,
            conditionMode: "all" as const,
            groups: [
              {
                groupId: `group-${index + 1}`,
                mode: "all" as const,
                conditions: [
                  {
                    conditionId: `cond-${index + 1}`,
                    contextFactDefinitionId: "fact-status",
                    subFieldKey: null,
                    operator: "equals",
                    isNegated: false,
                    comparisonJson: { value: "ready" },
                  },
                ],
              },
            ],
          })),
        },
      }),
    getWorkflowEditorDefinition: () =>
      Effect.succeed({
        workflow: {
          workflowDefinitionId: workflowExecution.workflowId,
          key: "wf",
          displayName: "WF",
          descriptionJson: null,
        },
        steps: [],
        edges: [],
        contextFacts: contextFactDefinitions,
        formDefinitions: [],
      }),
    findFactDefinitionsByVersionId: () => Effect.die("unused"),
    findArtifactSlotsByWorkUnitType: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

  const base = Layer.mergeAll(
    stepRepoLayer,
    branchRepoLayer,
    executionReadLayer,
    workflowRepoLayer,
    projectContextLayer,
    lifecycleLayer,
    methodologyLayer,
  );

  return {
    branchState,
    stepExecutions,
    base,
    progressionLayer: Layer.provide(StepProgressionServiceLive, base),
  };
}

const expectRepositoryError = async (
  effect: Effect.Effect<unknown, RepositoryError, any>,
  layer: Layer.Layer<any>,
): Promise<RepositoryError> => {
  const exit = await Effect.runPromiseExit(effect.pipe(Effect.provide(layer)));
  expect(exit._tag).toBe("Failure");
  if (exit._tag !== "Failure") {
    throw new Error("Expected failure");
  }
  const failure = Cause.failureOption(exit.cause);
  expect(Option.isSome(failure)).toBe(true);
  if (Option.isNone(failure)) {
    throw new Error("Expected repository failure");
  }
  expect(failure.value._tag).toBe("RepositoryError");
  return failure.value as RepositoryError;
};

describe("branch runtime services - save and complete", () => {
  it("save and complete: persists selection and allows completion", async () => {
    const harness = makeCoreHarness({
      selectedTargetStepId: null,
      factValue: "ready",
      routeTargets: ["step-a", "step-b"],
    });

    const progression = Layer.provide(StepProgressionServiceLive, harness.base);

    const txLayer = Layer.provide(
      StepExecutionTransactionServiceLive,
      Layer.mergeAll(
        harness.base,
        progression,
        Layer.succeed(StepExecutionLifecycleService, {
          activateFirstStepExecution: () => Effect.die("unused"),
          activateStepExecution: () => Effect.die("unused"),
          completeStepExecution: ({ stepExecutionId }: { stepExecutionId: string }) =>
            Effect.sync(() => {
              const row = harness.stepExecutions.find((item) => item.id === stepExecutionId);
              if (!row) {
                return null as never;
              }
              row.status = "completed";
              row.completedAt = new Date("2026-04-17T00:03:00.000Z");
              return row;
            }),
          getStepExecutionStatus: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof StepExecutionLifecycleService>),
        Layer.succeed(StepContextMutationService, {
          replaceContextFacts: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof StepContextMutationService>),
        Layer.succeed(AgentStepExecutionAppliedWriteRepository, {
          createAppliedWrite: () => Effect.die("unused"),
          listAppliedWritesByStepExecutionId: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof AgentStepExecutionAppliedWriteRepository>),
        Layer.succeed(ActionStepRuntimeService, {
          startExecution: () => Effect.die("unused"),
          runActions: () => Effect.die("unused"),
          retryActions: () => Effect.die("unused"),
          recreateBoundTargetFromContextValue: () => Effect.die("unused"),
          getCompletionEligibility: () =>
            Effect.succeed({ eligible: true, reasonIfIneligible: null }),
        } as unknown as Context.Tag.Service<typeof ActionStepRuntimeService>),
        Layer.succeed(InvokeCompletionService, {
          getCompletionEligibility: () =>
            Effect.succeed({ eligible: true, reasonIfIneligible: null }),
        } as unknown as Context.Tag.Service<typeof InvokeCompletionService>),
        Layer.succeed(InvokePropagationService, {
          propagateInvokeCompletionOutputs: () =>
            Effect.succeed({ affectedContextFactDefinitionIds: [], propagatedValueCount: 0 }),
        } as unknown as Context.Tag.Service<typeof InvokePropagationService>),
      ),
    );

    const stepCommandLayer = Layer.provide(
      WorkflowExecutionStepCommandServiceLive,
      Layer.mergeAll(
        harness.base,
        progression,
        txLayer,
        Layer.succeed(FormStepExecutionService, {
          saveFormStepDraft: () => Effect.die("unused"),
          submitFormStep: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof FormStepExecutionService>),
        Layer.succeed(InvokeTargetResolutionService, {
          resolveTargets: () => Effect.die("unused"),
          materializeTargetsForActivation: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof InvokeTargetResolutionService>),
        Layer.succeed(ProjectFactRepository, {
          createFactInstance: () => Effect.die("unused"),
          getCurrentValuesByDefinition: () => Effect.succeed([]),
          listFactsByProject: () => Effect.succeed([]),
          supersedeFactInstance: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof ProjectFactRepository>),
        Layer.succeed(WorkUnitFactRepository, {
          createFactInstance: () => Effect.die("unused"),
          getCurrentValuesByDefinition: () => Effect.succeed([]),
          listFactsByWorkUnit: () => Effect.succeed([]),
          supersedeFactInstance: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>),
        Layer.succeed(InvokeCompletionService, {
          getCompletionEligibility: () =>
            Effect.succeed({ eligible: true, reasonIfIneligible: null }),
        } as unknown as Context.Tag.Service<typeof InvokeCompletionService>),
      ),
    );

    const saveResult = await Effect.runPromise(
      Effect.gen(function* () {
        const svc = yield* WorkflowExecutionStepCommandService;
        return yield* svc.saveBranchStepSelection({
          projectId: "project-1",
          stepExecutionId: "step-exec-branch",
          selectedTargetStepId: "step-b",
        });
      }).pipe(Effect.provide(stepCommandLayer)),
    );

    expect(saveResult).toEqual({
      stepExecutionId: "step-exec-branch",
      selectedTargetStepId: "step-b",
      result: "saved",
    });

    const completionResult = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* StepExecutionTransactionService;
        return yield* tx.completeStepExecution({
          workflowExecutionId: "wfexec-1",
          stepExecutionId: "step-exec-branch",
        });
      }).pipe(Effect.provide(txLayer)),
    );

    expect(completionResult).toEqual({
      stepExecutionId: "step-exec-branch",
      status: "completed",
    });
  });

  it("save and complete: blocks completion when persisted selection is missing", async () => {
    const harness = makeCoreHarness({
      selectedTargetStepId: null,
      factValue: "ready",
    });

    const txLayer = Layer.provide(
      StepExecutionTransactionServiceLive,
      Layer.mergeAll(
        harness.base,
        Layer.provide(StepProgressionServiceLive, harness.base),
        Layer.succeed(StepExecutionLifecycleService, {
          activateFirstStepExecution: () => Effect.die("unused"),
          activateStepExecution: () => Effect.die("unused"),
          completeStepExecution: () => Effect.die("unused"),
          getStepExecutionStatus: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof StepExecutionLifecycleService>),
        Layer.succeed(StepContextMutationService, {
          replaceContextFacts: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof StepContextMutationService>),
        Layer.succeed(AgentStepExecutionAppliedWriteRepository, {
          createAppliedWrite: () => Effect.die("unused"),
          listAppliedWritesByStepExecutionId: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof AgentStepExecutionAppliedWriteRepository>),
        Layer.succeed(ActionStepRuntimeService, {
          startExecution: () => Effect.die("unused"),
          runActions: () => Effect.die("unused"),
          retryActions: () => Effect.die("unused"),
          recreateBoundTargetFromContextValue: () => Effect.die("unused"),
          getCompletionEligibility: () =>
            Effect.succeed({ eligible: true, reasonIfIneligible: null }),
        } as unknown as Context.Tag.Service<typeof ActionStepRuntimeService>),
        Layer.succeed(InvokeCompletionService, {
          getCompletionEligibility: () =>
            Effect.succeed({ eligible: true, reasonIfIneligible: null }),
        } as unknown as Context.Tag.Service<typeof InvokeCompletionService>),
        Layer.succeed(InvokePropagationService, {
          propagateInvokeCompletionOutputs: () =>
            Effect.succeed({ affectedContextFactDefinitionIds: [], propagatedValueCount: 0 }),
        } as unknown as Context.Tag.Service<typeof InvokePropagationService>),
      ),
    );

    const error = await expectRepositoryError(
      Effect.gen(function* () {
        const tx = yield* StepExecutionTransactionService;
        return yield* tx.completeStepExecution({
          workflowExecutionId: "wfexec-1",
          stepExecutionId: "step-exec-branch",
        });
      }),
      txLayer,
    );

    expect(error.cause).toMatchObject({
      message: "Branch completion is blocked until a valid target selection is explicitly saved.",
    });
  });

  it("save and complete: blocks completion when persisted selection is invalidated", async () => {
    const harness = makeCoreHarness({
      selectedTargetStepId: "step-a",
      factValue: "blocked",
    });

    const txLayer = Layer.provide(
      StepExecutionTransactionServiceLive,
      Layer.mergeAll(
        harness.base,
        Layer.provide(StepProgressionServiceLive, harness.base),
        Layer.succeed(StepExecutionLifecycleService, {
          activateFirstStepExecution: () => Effect.die("unused"),
          activateStepExecution: () => Effect.die("unused"),
          completeStepExecution: () => Effect.die("unused"),
          getStepExecutionStatus: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof StepExecutionLifecycleService>),
        Layer.succeed(StepContextMutationService, {
          replaceContextFacts: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof StepContextMutationService>),
        Layer.succeed(AgentStepExecutionAppliedWriteRepository, {
          createAppliedWrite: () => Effect.die("unused"),
          listAppliedWritesByStepExecutionId: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof AgentStepExecutionAppliedWriteRepository>),
        Layer.succeed(ActionStepRuntimeService, {
          startExecution: () => Effect.die("unused"),
          runActions: () => Effect.die("unused"),
          retryActions: () => Effect.die("unused"),
          recreateBoundTargetFromContextValue: () => Effect.die("unused"),
          getCompletionEligibility: () =>
            Effect.succeed({ eligible: true, reasonIfIneligible: null }),
        } as unknown as Context.Tag.Service<typeof ActionStepRuntimeService>),
        Layer.succeed(InvokeCompletionService, {
          getCompletionEligibility: () =>
            Effect.succeed({ eligible: true, reasonIfIneligible: null }),
        } as unknown as Context.Tag.Service<typeof InvokeCompletionService>),
        Layer.succeed(InvokePropagationService, {
          propagateInvokeCompletionOutputs: () =>
            Effect.succeed({ affectedContextFactDefinitionIds: [], propagatedValueCount: 0 }),
        } as unknown as Context.Tag.Service<typeof InvokePropagationService>),
      ),
    );

    const error = await expectRepositoryError(
      Effect.gen(function* () {
        const tx = yield* StepExecutionTransactionService;
        return yield* tx.completeStepExecution({
          workflowExecutionId: "wfexec-1",
          stepExecutionId: "step-exec-branch",
        });
      }),
      txLayer,
    );

    expect(error.cause).toMatchObject({
      message:
        "Branch completion is blocked because the saved target selection is no longer valid.",
    });
  });
});

describe("branch runtime services - progression", () => {
  it("progression activates only the persisted valid target (not first suggestion)", async () => {
    const harness = makeCoreHarness({
      selectedTargetStepId: "step-b",
      factValue: "ready",
      routeTargets: ["step-a", "step-b"],
    });

    harness.stepExecutions[0]!.status = "completed";
    harness.stepExecutions[0]!.completedAt = new Date("2026-04-17T00:02:00.000Z");

    let activatedStepDefinitionId: string | null = null;

    const commandLayer = Layer.provide(
      WorkflowExecutionStepCommandServiceLive,
      Layer.mergeAll(
        harness.base,
        Layer.provide(StepProgressionServiceLive, harness.base),
        Layer.succeed(StepExecutionTransactionService, {
          activateFirstStepExecution: () => Effect.die("unused"),
          activateStepExecution: ({ stepDefinitionId }: { stepDefinitionId: string }) =>
            Effect.sync(() => {
              activatedStepDefinitionId = stepDefinitionId;
              return { stepExecutionId: "step-exec-next" };
            }),
          submitFormStepExecution: () => Effect.die("unused"),
          completeStepExecution: () => Effect.die("unused"),
          applyAgentStepWrite: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof StepExecutionTransactionService>),
        Layer.succeed(FormStepExecutionService, {
          saveFormStepDraft: () => Effect.die("unused"),
          submitFormStep: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof FormStepExecutionService>),
        Layer.succeed(InvokeTargetResolutionService, {
          resolveTargets: () => Effect.die("unused"),
          materializeTargetsForActivation: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof InvokeTargetResolutionService>),
        Layer.succeed(ProjectFactRepository, {
          createFactInstance: () => Effect.die("unused"),
          getCurrentValuesByDefinition: () => Effect.succeed([]),
          listFactsByProject: () => Effect.succeed([]),
          supersedeFactInstance: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof ProjectFactRepository>),
        Layer.succeed(WorkUnitFactRepository, {
          createFactInstance: () => Effect.die("unused"),
          getCurrentValuesByDefinition: () => Effect.succeed([]),
          listFactsByWorkUnit: () => Effect.succeed([]),
          supersedeFactInstance: () => Effect.die("unused"),
        } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>),
        Layer.succeed(InvokeCompletionService, {
          getCompletionEligibility: () =>
            Effect.succeed({ eligible: true, reasonIfIneligible: null }),
        } as unknown as Context.Tag.Service<typeof InvokeCompletionService>),
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkflowExecutionStepCommandService;
        return yield* service.activateWorkflowStepExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
        });
      }).pipe(Effect.provide(commandLayer)),
    );

    expect(result).toEqual({ stepExecutionId: "step-exec-next" });
    expect(activatedStepDefinitionId).toBe("step-b");
  });
});
