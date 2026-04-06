import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { StepExecutionRepository } from "../../repositories/step-execution-repository";
import { TransitionExecutionRepository } from "../../repositories/transition-execution-repository";
import { WorkflowExecutionRepository } from "../../repositories/workflow-execution-repository";
import {
  WorkflowExecutionCommandService,
  WorkflowExecutionCommandServiceLive,
} from "../../services/workflow-execution-command-service";
import {
  WorkflowExecutionDetailService,
  WorkflowExecutionDetailServiceLive,
} from "../../services/workflow-execution-detail-service";

describe("WorkflowExecutionCommandService", () => {
  it("retrySameWorkflowExecution updates primary pointer only for primary role", async () => {
    const pointerUpdates: Array<string> = [];

    const primaryLayer = Layer.provide(
      WorkflowExecutionCommandServiceLive,
      Layer.mergeAll(
        Layer.succeed(ExecutionReadRepository, {
          getTransitionExecutionDetail: () => Effect.succeed(null),
          listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
          getWorkflowExecutionDetail: () =>
            Effect.succeed({
              workflowExecution: {
                id: "wf-1",
                transitionExecutionId: "tx-1",
                workflowId: "workflow-1",
                workflowRole: "primary",
                status: "completed",
                supersededByWorkflowExecutionId: null,
                startedAt: new Date("2026-03-28T10:00:00.000Z"),
                completedAt: new Date("2026-03-28T10:01:00.000Z"),
                supersededAt: null,
              },
              transitionExecution: {
                id: "tx-1",
                projectWorkUnitId: "wu-1",
                transitionId: "transition-1",
                status: "active",
                primaryWorkflowExecutionId: "wf-1",
                supersededByTransitionExecutionId: null,
                startedAt: new Date("2026-03-28T09:59:00.000Z"),
                completedAt: null,
                supersededAt: null,
              },
              projectId: "proj-1",
              projectWorkUnitId: "wu-1",
              workUnitTypeId: "wut-1",
              currentStateId: "state-a",
            }),
          listWorkflowExecutionsForTransition: () => Effect.succeed([]),
          listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>),
        Layer.succeed(TransitionExecutionRepository, {
          createTransitionExecution: () => Effect.die("unused"),
          startTransitionExecution: () => Effect.die("unused"),
          switchActiveTransitionExecution: () => Effect.die("unused"),
          getActiveTransitionExecutionForWorkUnit: () => Effect.succeed(null),
          getTransitionExecutionById: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>),
        Layer.succeed(StepExecutionRepository, {
          createStepExecution: () => Effect.die("unused"),
          getStepExecutionById: () => Effect.die("unused"),
          findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
          listStepExecutionsForWorkflow: () => Effect.succeed([]),
          completeStepExecution: () => Effect.die("unused"),
          upsertFormStepExecutionState: () => Effect.die("unused"),
          getFormStepExecutionState: () => Effect.die("unused"),
          writeWorkflowExecutionContextFact: () => Effect.die("unused"),
          listWorkflowExecutionContextFacts: () => Effect.succeed([]),
          listWorkflowContextFactDefinitions: () => Effect.succeed([]),
          listWorkflowStepDefinitions: () => Effect.succeed([]),
          listWorkflowEdges: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof StepExecutionRepository>),
        Layer.succeed(WorkflowExecutionRepository, {
          createWorkflowExecution: () =>
            Effect.succeed({
              id: "wf-2",
              transitionExecutionId: "tx-1",
              workflowId: "workflow-1",
              workflowRole: "primary",
              status: "active",
              supersededByWorkflowExecutionId: null,
              startedAt: new Date("2026-03-28T10:02:00.000Z"),
              completedAt: null,
              supersededAt: null,
            }),
          getWorkflowExecutionById: () => Effect.succeed(null),
          markWorkflowExecutionCompleted: () => Effect.succeed(null),
          markWorkflowExecutionSuperseded: () => Effect.succeed(null),
          updateTransitionPrimaryWorkflowExecutionPointer: ({
            primaryWorkflowExecutionId,
          }: {
            primaryWorkflowExecutionId: string | null;
          }) => {
            pointerUpdates.push(primaryWorkflowExecutionId ?? "null");
            return Effect.void;
          },
          retryWorkflowExecution: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>),
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkflowExecutionCommandService;
        return yield* service.retrySameWorkflowExecution({
          projectId: "proj-1",
          workflowExecutionId: "wf-1",
        });
      }).pipe(Effect.provide(primaryLayer)),
    );

    expect(result).toEqual({
      transitionExecutionId: "tx-1",
      workflowExecutionId: "wf-2",
      workflowRole: "primary",
    });
    expect(pointerUpdates).toEqual(["wf-2"]);
  });

  it("retrySameWorkflowExecution preserves supporting role without changing primary pointer", async () => {
    let pointerUpdated = false;

    const layer = Layer.provide(
      WorkflowExecutionCommandServiceLive,
      Layer.mergeAll(
        Layer.succeed(ExecutionReadRepository, {
          getTransitionExecutionDetail: () => Effect.succeed(null),
          listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
          getWorkflowExecutionDetail: () =>
            Effect.succeed({
              workflowExecution: {
                id: "wf-s1",
                transitionExecutionId: "tx-1",
                workflowId: "workflow-support",
                workflowRole: "supporting",
                status: "active",
                supersededByWorkflowExecutionId: null,
                startedAt: new Date("2026-03-28T10:00:00.000Z"),
                completedAt: null,
                supersededAt: null,
              },
              transitionExecution: {
                id: "tx-1",
                projectWorkUnitId: "wu-1",
                transitionId: "transition-1",
                status: "active",
                primaryWorkflowExecutionId: "wf-primary",
                supersededByTransitionExecutionId: null,
                startedAt: new Date("2026-03-28T09:59:00.000Z"),
                completedAt: null,
                supersededAt: null,
              },
              projectId: "proj-1",
              projectWorkUnitId: "wu-1",
              workUnitTypeId: "wut-1",
              currentStateId: "state-a",
            }),
          listWorkflowExecutionsForTransition: () => Effect.succeed([]),
          listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>),
        Layer.succeed(TransitionExecutionRepository, {
          createTransitionExecution: () => Effect.die("unused"),
          startTransitionExecution: () => Effect.die("unused"),
          switchActiveTransitionExecution: () => Effect.die("unused"),
          getActiveTransitionExecutionForWorkUnit: () => Effect.succeed(null),
          getTransitionExecutionById: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>),
        Layer.succeed(StepExecutionRepository, {
          createStepExecution: () => Effect.die("unused"),
          getStepExecutionById: () => Effect.die("unused"),
          findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
          listStepExecutionsForWorkflow: () => Effect.succeed([]),
          completeStepExecution: () => Effect.die("unused"),
          upsertFormStepExecutionState: () => Effect.die("unused"),
          getFormStepExecutionState: () => Effect.die("unused"),
          writeWorkflowExecutionContextFact: () => Effect.die("unused"),
          listWorkflowExecutionContextFacts: () => Effect.succeed([]),
          listWorkflowContextFactDefinitions: () => Effect.succeed([]),
          listWorkflowStepDefinitions: () => Effect.succeed([]),
          listWorkflowEdges: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof StepExecutionRepository>),
        Layer.succeed(WorkflowExecutionRepository, {
          createWorkflowExecution: () =>
            Effect.succeed({
              id: "wf-s2",
              transitionExecutionId: "tx-1",
              workflowId: "workflow-support",
              workflowRole: "supporting",
              status: "active",
              supersededByWorkflowExecutionId: null,
              startedAt: new Date("2026-03-28T10:02:00.000Z"),
              completedAt: null,
              supersededAt: null,
            }),
          getWorkflowExecutionById: () => Effect.succeed(null),
          markWorkflowExecutionCompleted: () => Effect.succeed(null),
          markWorkflowExecutionSuperseded: () => Effect.succeed(null),
          updateTransitionPrimaryWorkflowExecutionPointer: () => {
            pointerUpdated = true;
            return Effect.void;
          },
          retryWorkflowExecution: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>),
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkflowExecutionCommandService;
        return yield* service.retrySameWorkflowExecution({
          projectId: "proj-1",
          workflowExecutionId: "wf-s1",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result).toEqual({
      transitionExecutionId: "tx-1",
      workflowExecutionId: "wf-s2",
      workflowRole: "supporting",
    });
    expect(pointerUpdated).toBe(false);
  });

  it("completeWorkflowExecution marks an active terminal workflow as completed", async () => {
    let completedWorkflowId: string | null = null;

    const layer = Layer.provide(
      WorkflowExecutionCommandServiceLive,
      Layer.mergeAll(
        Layer.succeed(ExecutionReadRepository, {
          getTransitionExecutionDetail: () => Effect.succeed(null),
          listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
          getWorkflowExecutionDetail: () =>
            Effect.succeed({
              workflowExecution: {
                id: "wf-1",
                transitionExecutionId: "tx-1",
                workflowId: "workflow-1",
                workflowRole: "primary",
                status: "active",
                currentStepExecutionId: null,
                supersededByWorkflowExecutionId: null,
                startedAt: new Date("2026-03-28T10:00:00.000Z"),
                completedAt: null,
                supersededAt: null,
              },
              transitionExecution: {
                id: "tx-1",
                projectWorkUnitId: "wu-1",
                transitionId: "transition-1",
                status: "active",
                primaryWorkflowExecutionId: "wf-1",
                supersededByTransitionExecutionId: null,
                startedAt: new Date("2026-03-28T09:59:00.000Z"),
                completedAt: null,
                supersededAt: null,
              },
              projectId: "proj-1",
              projectWorkUnitId: "wu-1",
              workUnitTypeId: "wut-1",
              currentStateId: "state-terminal",
            }),
          listWorkflowExecutionsForTransition: () => Effect.succeed([]),
          listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>),
        Layer.succeed(StepExecutionRepository, {
          createStepExecution: () => Effect.die("unused"),
          getStepExecutionById: () => Effect.die("unused"),
          findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
          listStepExecutionsForWorkflow: () =>
            Effect.succeed([
              {
                id: "step-terminal",
                workflowExecutionId: "wf-1",
                stepDefinitionId: "step-finish",
                stepType: "display",
                status: "completed" as const,
                previousStepExecutionId: null,
                activatedAt: new Date("2026-03-28T10:02:00.000Z"),
                completedAt: new Date("2026-03-28T10:03:00.000Z"),
              },
            ]),
          completeStepExecution: () => Effect.die("unused"),
          upsertFormStepExecutionState: () => Effect.die("unused"),
          getFormStepExecutionState: () => Effect.die("unused"),
          writeWorkflowExecutionContextFact: () => Effect.die("unused"),
          listWorkflowExecutionContextFacts: () => Effect.succeed([]),
          listWorkflowContextFactDefinitions: () => Effect.succeed([]),
          listWorkflowStepDefinitions: () =>
            Effect.succeed([
              {
                id: "step-entry",
                workflowId: "workflow-1",
                key: "capture_setup",
                type: "form",
                ordinal: 0,
              },
              {
                id: "step-finish",
                workflowId: "workflow-1",
                key: "show_summary",
                type: "display",
                ordinal: 1,
              },
            ]),
          listWorkflowEdges: () =>
            Effect.succeed([
              {
                id: "edge-1",
                workflowId: "workflow-1",
                fromStepId: "step-entry",
                toStepId: "step-finish",
              },
            ]),
        } as unknown as Context.Tag.Service<typeof StepExecutionRepository>),
        Layer.succeed(WorkflowExecutionRepository, {
          createWorkflowExecution: () => Effect.die("unused"),
          getWorkflowExecutionById: () => Effect.succeed(null),
          setCurrentStepExecutionId: () => Effect.succeed(null),
          markWorkflowExecutionCompleted: (workflowExecutionId: string) => {
            completedWorkflowId = workflowExecutionId;
            return Effect.succeed({
              id: workflowExecutionId,
              transitionExecutionId: "tx-1",
              workflowId: "workflow-1",
              workflowRole: "primary",
              status: "completed" as const,
              currentStepExecutionId: null,
              supersededByWorkflowExecutionId: null,
              startedAt: new Date("2026-03-28T10:00:00.000Z"),
              completedAt: new Date("2026-03-28T10:05:00.000Z"),
              supersededAt: null,
            });
          },
          markWorkflowExecutionSuperseded: () => Effect.succeed(null),
          updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.void,
          retryWorkflowExecution: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>),
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkflowExecutionCommandService;
        return yield* service.completeWorkflowExecution({
          projectId: "proj-1",
          workflowExecutionId: "wf-1",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result).toEqual({
      workflowExecutionId: "wf-1",
      status: "completed",
    });
    expect(completedWorkflowId).toBe("wf-1");
  });
});

describe("WorkflowExecutionDetailService", () => {
  it("returns retry history and excludes L3 step surfaces", async () => {
    const layer = Layer.provide(
      WorkflowExecutionDetailServiceLive,
      Layer.mergeAll(
        Layer.succeed(ExecutionReadRepository, {
          getTransitionExecutionDetail: () => Effect.succeed(null),
          listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
          getWorkflowExecutionDetail: () =>
            Effect.succeed({
              workflowExecution: {
                id: "wf-2",
                transitionExecutionId: "tx-1",
                workflowId: "workflow-1",
                workflowRole: "primary",
                status: "active",
                supersededByWorkflowExecutionId: null,
                startedAt: new Date("2026-03-28T10:05:00.000Z"),
                completedAt: null,
                supersededAt: null,
              },
              transitionExecution: {
                id: "tx-1",
                projectWorkUnitId: "wu-1",
                transitionId: "transition-1",
                status: "active",
                primaryWorkflowExecutionId: "wf-2",
                supersededByTransitionExecutionId: null,
                startedAt: new Date("2026-03-28T10:00:00.000Z"),
                completedAt: null,
                supersededAt: null,
              },
              projectId: "proj-1",
              projectWorkUnitId: "wu-1",
              workUnitTypeId: "wut-1",
              currentStateId: "state-a",
            }),
          listWorkflowExecutionsForTransition: () =>
            Effect.succeed([
              {
                id: "wf-1",
                transitionExecutionId: "tx-1",
                workflowId: "workflow-1",
                workflowRole: "primary",
                status: "superseded",
                supersededByWorkflowExecutionId: "wf-2",
                startedAt: new Date("2026-03-28T10:01:00.000Z"),
                completedAt: new Date("2026-03-28T10:02:00.000Z"),
                supersededAt: new Date("2026-03-28T10:04:59.000Z"),
              },
              {
                id: "wf-2",
                transitionExecutionId: "tx-1",
                workflowId: "workflow-1",
                workflowRole: "primary",
                status: "active",
                supersededByWorkflowExecutionId: null,
                startedAt: new Date("2026-03-28T10:05:00.000Z"),
                completedAt: null,
                supersededAt: null,
              },
            ]),
          listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>),
        Layer.succeed(StepExecutionRepository, {
          createStepExecution: () => Effect.die("unused"),
          getStepExecutionById: () => Effect.die("unused"),
          findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
          listStepExecutionsForWorkflow: () => Effect.succeed([]),
          completeStepExecution: () => Effect.die("unused"),
          upsertFormStepExecutionState: () => Effect.die("unused"),
          getFormStepExecutionState: () => Effect.die("unused"),
          writeWorkflowExecutionContextFact: () => Effect.die("unused"),
          listWorkflowExecutionContextFacts: () => Effect.succeed([]),
          listWorkflowContextFactDefinitions: () => Effect.succeed([]),
          listWorkflowStepDefinitions: () => Effect.succeed([]),
          listWorkflowEdges: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof StepExecutionRepository>),
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkflowExecutionDetailService;
        return yield* service.getWorkflowExecutionDetail({
          projectId: "proj-1",
          workflowExecutionId: "wf-2",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result?.lineage.previousPrimaryAttempts).toHaveLength(1);
    expect(result?.stepSurface).toEqual({
      state: "invalid_definition",
      reason: "missing_entry_step",
    });
    expect(result?.workflowContextFacts).toEqual({ mode: "read_only_by_definition", groups: [] });
  });
});
