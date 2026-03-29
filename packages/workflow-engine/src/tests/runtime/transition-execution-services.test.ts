import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { LifecycleRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import type { CompleteTransitionExecutionInput } from "@chiron/contracts/runtime/executions";
import {
  ExecutionReadRepository,
  type TransitionExecutionDetailReadModel,
} from "../../repositories/execution-read-repository";
import { ProjectWorkUnitRepository } from "../../repositories/project-work-unit-repository";
import { TransitionExecutionRepository } from "../../repositories/transition-execution-repository";
import { WorkflowExecutionRepository } from "../../repositories/workflow-execution-repository";
import {
  TransitionExecutionCommandService,
  TransitionExecutionCommandServiceLive,
} from "../../services/transition-execution-command-service";
import { RuntimeGateService } from "../../services/runtime-gate-service";

const ACTIVE_TRANSITION_DETAIL: TransitionExecutionDetailReadModel = {
  transitionExecution: {
    id: "tx-1",
    projectWorkUnitId: "wu-1",
    transitionId: "transition-1",
    status: "active",
    primaryWorkflowExecutionId: "wf-1",
    supersededByTransitionExecutionId: null,
    startedAt: new Date("2026-03-28T10:00:00.000Z"),
    completedAt: null,
    supersededAt: null,
  },
  projectId: "proj-1",
  workUnitTypeId: "wut-1",
  currentStateId: "state-a",
  activeTransitionExecutionId: "tx-1",
  primaryWorkflowExecution: {
    id: "wf-1",
    transitionExecutionId: "tx-1",
    workflowId: "workflow-1",
    workflowRole: "primary",
    status: "completed",
    supersededByWorkflowExecutionId: null,
    startedAt: new Date("2026-03-28T10:01:00.000Z"),
    completedAt: new Date("2026-03-28T10:02:00.000Z"),
    supersededAt: null,
  },
};

function makeReadRepositoryLayer(detail: TransitionExecutionDetailReadModel) {
  return Layer.succeed(ExecutionReadRepository, {
    getTransitionExecutionDetail: () => Effect.succeed(detail),
    listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
    getWorkflowExecutionDetail: () => Effect.succeed(null),
    listWorkflowExecutionsForTransition: () => Effect.succeed([]),
    listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
  } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);
}

describe("TransitionExecutionCommandService", () => {
  it("creates a project work unit from new work unit input mode", async () => {
    const calls = {
      createProjectWorkUnit: [] as Array<{
        projectId: string;
        workUnitTypeId: string;
        currentStateId: string;
      }>,
      startTransitionExecution: [] as Array<{ projectWorkUnitId: string; transitionId: string }>,
    };

    const projectContextRepository = {
      findProjectPin: () =>
        Effect.succeed({
          projectId: "proj-1",
          methodologyVersionId: "version-1",
          methodologyId: "methodology-1",
          methodologyKey: "core",
          publishedVersion: "1.0.0",
          actorId: null,
          createdAt: new Date("2026-03-28T10:00:00.000Z"),
          updatedAt: new Date("2026-03-28T10:00:00.000Z"),
        }),
    } as unknown as Context.Tag.Service<typeof ProjectContextRepository>;

    const lifecycleRepository = {
      findLifecycleTransitions: () =>
        Effect.succeed([
          {
            id: "transition-1",
            methodologyVersionId: "version-1",
            workUnitTypeId: "wut-1",
            fromStateId: "state-a",
            toStateId: "state-b",
            transitionKey: "draft_to_ready",
            createdAt: new Date("2026-03-28T10:00:00.000Z"),
            updatedAt: new Date("2026-03-28T10:00:00.000Z"),
          },
        ]),
      findLifecycleStates: () => Effect.succeed([]),
      findTransitionConditionSets: () => Effect.succeed([]),
    } as unknown as Context.Tag.Service<typeof LifecycleRepository>;

    const layer = Layer.provide(
      TransitionExecutionCommandServiceLive,
      Layer.mergeAll(
        makeReadRepositoryLayer(ACTIVE_TRANSITION_DETAIL),
        Layer.succeed(RuntimeGateService, {
          evaluateStartGate: () =>
            Effect.succeed({
              result: "available",
              firstReason: undefined,
            }),
          evaluateCompletionGate: () =>
            Effect.succeed({
              result: "available",
              firstReason: undefined,
            }),
        } as unknown as Context.Tag.Service<typeof RuntimeGateService>),
        Layer.succeed(ProjectWorkUnitRepository, {
          createProjectWorkUnit: (params: {
            projectId: string;
            workUnitTypeId: string;
            currentStateId: string;
          }) => {
            calls.createProjectWorkUnit.push(params);
            return Effect.succeed({
              id: "wu-new",
              projectId: params.projectId,
              workUnitTypeId: params.workUnitTypeId,
              currentStateId: params.currentStateId,
              activeTransitionExecutionId: null,
              createdAt: new Date("2026-03-28T10:00:00.000Z"),
              updatedAt: new Date("2026-03-28T10:00:00.000Z"),
            });
          },
          listProjectWorkUnitsByProject: () => Effect.succeed([]),
          getProjectWorkUnitById: () => Effect.succeed(null),
          updateActiveTransitionExecutionPointer: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>),
        Layer.succeed(TransitionExecutionRepository, {
          createTransitionExecution: () => Effect.die("unused"),
          startTransitionExecution: (params: {
            projectWorkUnitId: string;
            transitionId: string;
          }) => {
            calls.startTransitionExecution.push(params);
            return Effect.succeed({
              id: "tx-2",
              projectWorkUnitId: params.projectWorkUnitId,
              transitionId: params.transitionId,
              status: "active",
              primaryWorkflowExecutionId: null,
              supersededByTransitionExecutionId: null,
              startedAt: new Date("2026-03-28T10:01:00.000Z"),
              completedAt: null,
              supersededAt: null,
            });
          },
          switchActiveTransitionExecution: () => Effect.die("unused"),
          getActiveTransitionExecutionForWorkUnit: () => Effect.succeed(null),
          getTransitionExecutionById: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>),
        Layer.succeed(WorkflowExecutionRepository, {
          createWorkflowExecution: () =>
            Effect.succeed({
              id: "wf-2",
              transitionExecutionId: "tx-2",
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
          updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.void,
          retryWorkflowExecution: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>),
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* TransitionExecutionCommandService;
        return yield* service.startTransitionExecution({
          projectId: "proj-1",
          transitionId: "transition-1",
          workflowId: "workflow-1",
          workUnit: {
            mode: "new",
            workUnitTypeId: "wut-1",
          },
        });
      }).pipe(
        Effect.provideService(ProjectContextRepository, projectContextRepository),
        Effect.provideService(LifecycleRepository, lifecycleRepository),
        Effect.provide(layer),
      ),
    );

    expect(calls.createProjectWorkUnit).toEqual([
      {
        projectId: "proj-1",
        workUnitTypeId: "wut-1",
        currentStateId: "state-a",
      },
    ]);
    expect(calls.startTransitionExecution).toEqual([
      {
        projectWorkUnitId: "wu-new",
        transitionId: "transition-1",
      },
    ]);
    expect(result).toEqual({
      projectWorkUnitId: "wu-new",
      transitionExecutionId: "tx-2",
      workflowExecutionId: "wf-2",
    });
  });

  it("re-checks completion gate and refuses completion when gate fails", async () => {
    let completionAttempted = false;

    const layer = Layer.provide(
      TransitionExecutionCommandServiceLive,
      Layer.mergeAll(
        makeReadRepositoryLayer(ACTIVE_TRANSITION_DETAIL),
        Layer.succeed(RuntimeGateService, {
          evaluateStartGate: () =>
            Effect.succeed({
              passed: true,
              evaluatedAt: "2026-03-28T10:03:00.000Z",
            }),
          evaluateCompletionGate: () =>
            Effect.succeed({
              passed: false,
              evaluatedAt: "2026-03-28T10:03:30.000Z",
              firstBlockingReason: "missing-required-artifact",
            }),
        } as unknown as Context.Tag.Service<typeof RuntimeGateService>),
        Layer.succeed(ProjectWorkUnitRepository, {
          createProjectWorkUnit: () => Effect.die("unused"),
          listProjectWorkUnitsByProject: () => Effect.succeed([]),
          getProjectWorkUnitById: () => Effect.succeed(null),
          updateActiveTransitionExecutionPointer: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>),
        Layer.succeed(TransitionExecutionRepository, {
          createTransitionExecution: () => Effect.die("unused"),
          startTransitionExecution: () => Effect.die("unused"),
          switchActiveTransitionExecution: () => Effect.die("unused"),
          getActiveTransitionExecutionForWorkUnit: () => Effect.succeed(null),
          getTransitionExecutionById: () => Effect.succeed(null),
          completeTransitionExecutionAtomically: () => {
            completionAttempted = true;
            return Effect.die("must-not-run");
          },
        } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>),
        Layer.succeed(WorkflowExecutionRepository, {
          createWorkflowExecution: () => Effect.die("unused"),
          getWorkflowExecutionById: () => Effect.succeed(null),
          markWorkflowExecutionCompleted: () => Effect.succeed(null),
          markWorkflowExecutionSuperseded: () => Effect.succeed(null),
          updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.void,
          retryWorkflowExecution: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>),
      ),
    );

    const input: CompleteTransitionExecutionInput = {
      projectId: "proj-1",
      projectWorkUnitId: "wu-1",
      transitionExecutionId: "tx-1",
    };

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* TransitionExecutionCommandService;
        yield* service.completeTransitionExecution(input);
      }).pipe(Effect.provide(layer)),
    );

    expect(exit._tag).toBe("Failure");
    expect(completionAttempted).toBe(false);
  });

  it("completes transition atomically after live gate pass and clears active pointer", async () => {
    const calls: Array<string> = [];

    const layer = Layer.provide(
      TransitionExecutionCommandServiceLive,
      Layer.mergeAll(
        makeReadRepositoryLayer(ACTIVE_TRANSITION_DETAIL),
        Layer.succeed(RuntimeGateService, {
          evaluateStartGate: () =>
            Effect.succeed({
              passed: true,
              evaluatedAt: "2026-03-28T10:03:00.000Z",
            }),
          evaluateCompletionGate: () =>
            Effect.succeed({
              passed: true,
              evaluatedAt: "2026-03-28T10:03:30.000Z",
              targetState: {
                stateId: "state-b",
                stateKey: "ready",
                stateLabel: "Ready",
              },
            }),
        } as unknown as Context.Tag.Service<typeof RuntimeGateService>),
        Layer.succeed(ProjectWorkUnitRepository, {
          createProjectWorkUnit: () => Effect.die("unused"),
          listProjectWorkUnitsByProject: () => Effect.succeed([]),
          getProjectWorkUnitById: () => Effect.succeed(null),
          updateActiveTransitionExecutionPointer: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>),
        Layer.succeed(TransitionExecutionRepository, {
          createTransitionExecution: () => Effect.die("unused"),
          startTransitionExecution: () => Effect.die("unused"),
          switchActiveTransitionExecution: () => Effect.die("unused"),
          getActiveTransitionExecutionForWorkUnit: () => Effect.succeed(null),
          getTransitionExecutionById: () => Effect.succeed(null),
          completeTransitionExecutionAtomically: (params: {
            transitionExecutionId: string;
            projectWorkUnitId: string;
            newStateId: string;
            newStateKey: string;
            newStateLabel: string;
          }) => {
            calls.push(JSON.stringify(params));
            return Effect.succeed({
              transitionExecutionId: params.transitionExecutionId,
              projectWorkUnitId: params.projectWorkUnitId,
              newStateId: params.newStateId,
              newStateKey: params.newStateKey,
              newStateLabel: params.newStateLabel,
            });
          },
        } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>),
        Layer.succeed(WorkflowExecutionRepository, {
          createWorkflowExecution: () => Effect.die("unused"),
          getWorkflowExecutionById: () => Effect.succeed(null),
          markWorkflowExecutionCompleted: () => Effect.succeed(null),
          markWorkflowExecutionSuperseded: () => Effect.succeed(null),
          updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.void,
          retryWorkflowExecution: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>),
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* TransitionExecutionCommandService;
        return yield* service.completeTransitionExecution({
          projectId: "proj-1",
          projectWorkUnitId: "wu-1",
          transitionExecutionId: "tx-1",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result).toEqual({
      transitionExecutionId: "tx-1",
      projectWorkUnitId: "wu-1",
      newStateId: "state-b",
      newStateKey: "ready",
      newStateLabel: "Ready",
    });
    expect(calls).toHaveLength(1);
  });

  it("chooses a new primary workflow execution and supersedes prior primary attempt", async () => {
    let captured: Record<string, string | null> | null = null;

    const layer = Layer.provide(
      TransitionExecutionCommandServiceLive,
      Layer.mergeAll(
        makeReadRepositoryLayer(ACTIVE_TRANSITION_DETAIL),
        Layer.succeed(RuntimeGateService, {
          evaluateStartGate: () =>
            Effect.succeed({
              passed: true,
              evaluatedAt: "2026-03-28T10:03:00.000Z",
            }),
          evaluateCompletionGate: () =>
            Effect.succeed({
              passed: false,
              evaluatedAt: "2026-03-28T10:03:30.000Z",
              firstBlockingReason: "choose-another-primary",
            }),
        } as unknown as Context.Tag.Service<typeof RuntimeGateService>),
        Layer.succeed(ProjectWorkUnitRepository, {
          createProjectWorkUnit: () => Effect.die("unused"),
          listProjectWorkUnitsByProject: () => Effect.succeed([]),
          getProjectWorkUnitById: () => Effect.succeed(null),
          updateActiveTransitionExecutionPointer: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>),
        Layer.succeed(TransitionExecutionRepository, {
          createTransitionExecution: () => Effect.die("unused"),
          startTransitionExecution: () => Effect.die("unused"),
          switchActiveTransitionExecution: () => Effect.die("unused"),
          getActiveTransitionExecutionForWorkUnit: () => Effect.succeed(null),
          getTransitionExecutionById: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>),
        Layer.succeed(WorkflowExecutionRepository, {
          createWorkflowExecution: () => Effect.die("unused"),
          getWorkflowExecutionById: () => Effect.succeed(null),
          markWorkflowExecutionCompleted: () => Effect.succeed(null),
          markWorkflowExecutionSuperseded: () => Effect.succeed(null),
          updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.void,
          retryWorkflowExecution: () => Effect.succeed(null),
          choosePrimaryWorkflowForTransitionExecutionAtomically: (params: {
            transitionExecutionId: string;
            workflowId: string;
            supersededWorkflowExecutionId: string | null;
          }) => {
            captured = params;
            return Effect.succeed({
              transitionExecutionId: params.transitionExecutionId,
              workflowExecutionId: "wf-new-primary",
              supersededWorkflowExecutionId: params.supersededWorkflowExecutionId,
            });
          },
        } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>),
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* TransitionExecutionCommandService;
        return yield* service.choosePrimaryWorkflowForTransitionExecution({
          projectId: "proj-1",
          projectWorkUnitId: "wu-1",
          transitionExecutionId: "tx-1",
          workflowId: "workflow-2",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(captured).toEqual({
      transitionExecutionId: "tx-1",
      workflowId: "workflow-2",
      supersededWorkflowExecutionId: "wf-1",
    });
    expect(result).toEqual({
      transitionExecutionId: "tx-1",
      workflowExecutionId: "wf-new-primary",
      supersededWorkflowExecutionId: "wf-1",
    });
  });
});
