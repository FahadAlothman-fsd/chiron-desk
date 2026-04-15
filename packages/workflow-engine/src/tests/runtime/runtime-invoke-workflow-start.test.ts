import { Cause, Context, Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";

import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import {
  InvokeExecutionRepository,
  type InvokeStepExecutionStateRow,
  type InvokeWorkflowTargetExecutionRow,
  type StartInvokeWorkflowTargetAtomicallyParams,
} from "../../repositories/invoke-execution-repository";
import {
  StepExecutionRepository,
  type RuntimeStepExecutionRow,
} from "../../repositories/step-execution-repository";
import { type WorkflowExecutionRow } from "../../repositories/workflow-execution-repository";
import {
  InvokeWorkflowExecutionService,
  InvokeWorkflowExecutionServiceLive,
} from "../../services/invoke-workflow-execution-service";

const buildInvokeWorkflowExecutionTestLayer = () => {
  const invokeStates: InvokeStepExecutionStateRow[] = [
    {
      id: "invoke-state-1",
      stepExecutionId: "step-exec-1",
      invokeStepDefinitionId: "invoke-step-def-1",
      createdAt: new Date("2026-04-14T00:00:00.000Z"),
      updatedAt: new Date("2026-04-14T00:00:00.000Z"),
    },
    {
      id: "invoke-state-2",
      stepExecutionId: "step-exec-2",
      invokeStepDefinitionId: "invoke-step-def-2",
      createdAt: new Date("2026-04-14T00:00:00.000Z"),
      updatedAt: new Date("2026-04-14T00:00:00.000Z"),
    },
  ];

  const workflowTargets: InvokeWorkflowTargetExecutionRow[] = [
    {
      id: "invoke-wf-target-1",
      invokeStepExecutionStateId: "invoke-state-1",
      workflowDefinitionId: "workflow-child-1",
      workflowExecutionId: null,
      resolutionOrder: 0,
      createdAt: new Date("2026-04-14T00:01:00.000Z"),
      updatedAt: new Date("2026-04-14T00:01:00.000Z"),
    },
    {
      id: "invoke-wf-target-foreign",
      invokeStepExecutionStateId: "invoke-state-2",
      workflowDefinitionId: "workflow-child-foreign",
      workflowExecutionId: null,
      resolutionOrder: 0,
      createdAt: new Date("2026-04-14T00:01:00.000Z"),
      updatedAt: new Date("2026-04-14T00:01:00.000Z"),
    },
  ];

  const stepExecutions: RuntimeStepExecutionRow[] = [
    {
      id: "step-exec-1",
      workflowExecutionId: "parent-workflow-exec-1",
      stepDefinitionId: "invoke-step-def-1",
      stepType: "invoke",
      status: "active",
      activatedAt: new Date("2026-04-14T00:00:00.000Z"),
      completedAt: null,
      previousStepExecutionId: null,
    },
  ];

  const createdWorkflowExecutions: WorkflowExecutionRow[] = [];
  const atomicStartCalls: StartInvokeWorkflowTargetAtomicallyParams[] = [];

  const executionReadRepoLayer = Layer.succeed(ExecutionReadRepository, {
    getTransitionExecutionDetail: () => Effect.die("unused"),
    listTransitionExecutionsForWorkUnit: () => Effect.die("unused"),
    getWorkflowExecutionDetail: (workflowExecutionId: string) =>
      Effect.succeed(
        workflowExecutionId === "parent-workflow-exec-1"
          ? {
              workflowExecution: {
                id: "parent-workflow-exec-1",
                transitionExecutionId: "transition-exec-1",
                workflowId: "workflow-parent",
                workflowRole: "primary" as const,
                status: "active" as const,
                currentStepExecutionId: "step-exec-1",
                supersededByWorkflowExecutionId: null,
                startedAt: new Date("2026-04-14T00:00:00.000Z"),
                completedAt: null,
                supersededAt: null,
              },
              transitionExecution: {
                id: "transition-exec-1",
                projectWorkUnitId: "project-work-unit-1",
                transitionId: "transition-def-1",
                status: "active" as const,
                primaryWorkflowExecutionId: "parent-workflow-exec-1",
                supersededByTransitionExecutionId: null,
                startedAt: new Date("2026-04-14T00:00:00.000Z"),
                completedAt: null,
                supersededAt: null,
              },
              projectId: "project-1",
              projectWorkUnitId: "project-work-unit-1",
              workUnitTypeId: "work-unit-def-1",
              currentStateId: "state-1",
            }
          : null,
      ),
    listWorkflowExecutionsForTransition: () => Effect.die("unused"),
    listActiveWorkflowExecutionsByProject: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);

  const stepRepoLayer = Layer.succeed(StepExecutionRepository, {
    createStepExecution: () => Effect.die("unused"),
    getStepExecutionById: (stepExecutionId: string) =>
      Effect.succeed(stepExecutions.find((row) => row.id === stepExecutionId) ?? null),
    findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
    listStepExecutionsForWorkflow: () => Effect.die("unused"),
    completeStepExecution: () => Effect.die("unused"),
    createFormStepExecutionState: () => Effect.die("unused"),
    upsertFormStepExecutionState: () => Effect.die("unused"),
    getFormStepExecutionState: () => Effect.die("unused"),
    replaceWorkflowExecutionContextFacts: () => Effect.die("unused"),
    listWorkflowExecutionContextFacts: () => Effect.die("unused"),
    listWorkflowContextFactDefinitions: () => Effect.die("unused"),
    listWorkflowStepDefinitions: () => Effect.die("unused"),
    listWorkflowEdges: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof StepExecutionRepository>);

  const invokeRepoLayer = Layer.succeed(InvokeExecutionRepository, {
    createInvokeStepExecutionState: () => Effect.die("unused"),
    getInvokeStepExecutionStateByStepExecutionId: (stepExecutionId: string) =>
      Effect.succeed(invokeStates.find((row) => row.stepExecutionId === stepExecutionId) ?? null),
    listInvokeWorkflowTargetExecutions: () => Effect.die("unused"),
    getInvokeWorkflowTargetExecutionById: (invokeWorkflowTargetExecutionId: string) =>
      Effect.succeed(
        workflowTargets.find((row) => row.id === invokeWorkflowTargetExecutionId) ?? null,
      ),
    createInvokeWorkflowTargetExecution: () => Effect.die("unused"),
    startInvokeWorkflowTargetAtomically: ({
      invokeWorkflowTargetExecutionId,
      transitionExecutionId,
      workflowDefinitionId,
    }: StartInvokeWorkflowTargetAtomicallyParams) =>
      Effect.sync(() => {
        atomicStartCalls.push({
          invokeWorkflowTargetExecutionId,
          transitionExecutionId,
          workflowDefinitionId,
        });

        const target = workflowTargets.find((row) => row.id === invokeWorkflowTargetExecutionId);
        if (!target) {
          throw new Error("invoke workflow target execution not found");
        }

        if (target.workflowExecutionId) {
          return {
            invokeWorkflowTargetExecutionId: target.id,
            workflowExecutionId: target.workflowExecutionId,
            result: "already_started" as const,
          };
        }

        const workflowExecutionId = `child-workflow-exec-${createdWorkflowExecutions.length + 1}`;
        createdWorkflowExecutions.push({
          id: workflowExecutionId,
          transitionExecutionId,
          workflowId: workflowDefinitionId,
          workflowRole: "supporting",
          status: "active",
          currentStepExecutionId: null,
          supersededByWorkflowExecutionId: null,
          startedAt: new Date("2026-04-14T00:01:30.000Z"),
          completedAt: null,
          supersededAt: null,
        });

        target.workflowExecutionId = workflowExecutionId;
        target.updatedAt = new Date("2026-04-14T00:02:00.000Z");

        return {
          invokeWorkflowTargetExecutionId: target.id,
          workflowExecutionId,
          result: "started" as const,
        };
      }),
    markInvokeWorkflowTargetExecutionStarted: () => Effect.die("unused"),
    listInvokeWorkUnitTargetExecutions: () => Effect.die("unused"),
    getInvokeWorkUnitTargetExecutionById: () => Effect.die("unused"),
    createInvokeWorkUnitTargetExecution: () => Effect.die("unused"),
    markInvokeWorkUnitTargetExecutionStarted: () => Effect.die("unused"),
    listInvokeWorkUnitCreatedFactInstances: () => Effect.die("unused"),
    createInvokeWorkUnitCreatedFactInstance: () => Effect.die("unused"),
    listInvokeWorkUnitCreatedArtifactSnapshots: () => Effect.die("unused"),
    createInvokeWorkUnitCreatedArtifactSnapshot: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof InvokeExecutionRepository>);

  return {
    layer: Layer.provide(
      InvokeWorkflowExecutionServiceLive,
      Layer.mergeAll(executionReadRepoLayer, stepRepoLayer, invokeRepoLayer),
    ),
    state: {
      stepExecutions,
      workflowTargets,
      createdWorkflowExecutions,
      atomicStartCalls,
    },
  };
};

describe("InvokeWorkflowExecutionService", () => {
  it("starts a pre-materialized workflow target once and then returns already_started", async () => {
    const runtime = buildInvokeWorkflowExecutionTestLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeWorkflowExecutionService;

        const first = yield* service.startInvokeWorkflowTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
        });

        const second = yield* service.startInvokeWorkflowTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
        });

        return { first, second };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.first).toEqual({
      invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
      workflowExecutionId: "child-workflow-exec-1",
      result: "started",
    });
    expect(result.second).toEqual({
      invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
      workflowExecutionId: "child-workflow-exec-1",
      result: "already_started",
    });
    expect(runtime.state.workflowTargets[0]?.workflowExecutionId).toBe("child-workflow-exec-1");
    expect(runtime.state.workflowTargets[0]?.resolutionOrder).toBe(0);
    expect(runtime.state.atomicStartCalls).toEqual([
      {
        invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
        transitionExecutionId: "transition-exec-1",
        workflowDefinitionId: "workflow-child-1",
      },
      {
        invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
        transitionExecutionId: "transition-exec-1",
        workflowDefinitionId: "workflow-child-1",
      },
    ]);
    expect(runtime.state.createdWorkflowExecutions).toHaveLength(1);
  });

  it("fails safely when the target row does not belong to the provided step execution", async () => {
    const runtime = buildInvokeWorkflowExecutionTestLayer();

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* InvokeWorkflowExecutionService;
        return yield* service.startInvokeWorkflowTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkflowTargetExecutionId: "invoke-wf-target-foreign",
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      const failure = Cause.failureOption(exit.cause);
      expect(Option.isSome(failure)).toBe(true);
      if (Option.isSome(failure)) {
        expect(failure.value).toMatchObject({
          _tag: "RepositoryError",
          operation: "invoke-workflow-execution",
        });
      }
    }

    expect(runtime.state.createdWorkflowExecutions).toHaveLength(0);
    expect(runtime.state.atomicStartCalls).toHaveLength(0);
    expect(runtime.state.workflowTargets[1]?.workflowExecutionId).toBeNull();
  });

  it("rejects starts when the parent invoke step is no longer active", async () => {
    const runtime = buildInvokeWorkflowExecutionTestLayer();
    runtime.state.stepExecutions[0]!.status = "completed";
    runtime.state.stepExecutions[0]!.completedAt = new Date("2026-04-14T00:05:00.000Z");

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* InvokeWorkflowExecutionService;
        return yield* service.startInvokeWorkflowTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      const failure = Cause.failureOption(exit.cause);
      expect(Option.isSome(failure)).toBe(true);
      if (Option.isSome(failure)) {
        expect(failure.value).toMatchObject({
          _tag: "RepositoryError",
          operation: "invoke-workflow-execution",
          cause: expect.objectContaining({ message: "step execution is not active" }),
        });
      }
    }

    expect(runtime.state.createdWorkflowExecutions).toHaveLength(0);
    expect(runtime.state.atomicStartCalls).toHaveLength(0);
    expect(runtime.state.workflowTargets[0]?.workflowExecutionId).toBeNull();
  });
});
