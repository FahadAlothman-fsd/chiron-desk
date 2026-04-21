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
import { WorkUnitFactRepository } from "../../repositories/work-unit-fact-repository";
import { WorkflowExecutionRepository } from "../../repositories/workflow-execution-repository";
import {
  TransitionExecutionCommandService,
  TransitionExecutionCommandServiceLive,
} from "../../services/transition-execution-command-service";
import {
  TransitionExecutionDetailService,
  TransitionExecutionDetailServiceLive,
} from "../../services/transition-execution-detail-service";
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

function makeProjectContextRepositoryLayer() {
  return Layer.succeed(ProjectContextRepository, {
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
  } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);
}

function makeLifecycleRepositoryLayer(options?: {
  fromStateId?: string | null;
  toStateId?: string | null;
  transitionKey?: string;
  conditionSets?: readonly unknown[];
}) {
  return Layer.succeed(LifecycleRepository, {
    findLifecycleTransitions: () =>
      Effect.succeed([
        {
          id: "transition-1",
          methodologyVersionId: "version-1",
          workUnitTypeId: "wut-1",
          fromStateId: options?.fromStateId ?? "state-a",
          toStateId: options?.toStateId ?? "state-b",
          transitionKey: options?.transitionKey ?? "draft_to_ready",
          createdAt: new Date("2026-03-28T10:00:00.000Z"),
          updatedAt: new Date("2026-03-28T10:00:00.000Z"),
        },
      ]),
    findLifecycleStates: () =>
      Effect.succeed([
        {
          id: "state-a",
          methodologyVersionId: "version-1",
          workUnitTypeId: "wut-1",
          key: "draft",
          displayName: "Draft",
          descriptionJson: null,
          guidanceJson: null,
          createdAt: new Date("2026-03-28T10:00:00.000Z"),
          updatedAt: new Date("2026-03-28T10:00:00.000Z"),
        },
        {
          id: "state-b",
          methodologyVersionId: "version-1",
          workUnitTypeId: "wut-1",
          key: "ready",
          displayName: "Ready",
          descriptionJson: null,
          guidanceJson: null,
          createdAt: new Date("2026-03-28T10:00:00.000Z"),
          updatedAt: new Date("2026-03-28T10:00:00.000Z"),
        },
      ]),
    findWorkUnitTypes: () =>
      Effect.succeed([
        {
          id: "wut-1",
          methodologyVersionId: "version-1",
          key: "WU.ONE",
          displayName: "Work Unit One",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "one",
          createdAt: new Date("2026-03-28T10:00:00.000Z"),
          updatedAt: new Date("2026-03-28T10:00:00.000Z"),
        },
      ]),
    findFactSchemas: () => Effect.succeed([]),
    findTransitionConditionSets: () => Effect.succeed(options?.conditionSets ?? []),
    findTransitionWorkflowBindings: () => Effect.succeed([]),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);
}

function makeWorkUnitFactRepositoryLayer() {
  return Layer.succeed(WorkUnitFactRepository, {
    createFactInstance: () => Effect.die("unused"),
    getCurrentValuesByDefinition: () => Effect.succeed([]),
    listFactsByWorkUnit: () => Effect.succeed([]),
    supersedeFactInstance: () => Effect.void,
    updateFactInstance: () => Effect.succeed(null),
    logicallyDeleteFactInstance: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>);
}

describe("TransitionExecutionCommandService", () => {
  it("creates a project work unit from new work unit input mode", async () => {
    const calls = {
      createProjectWorkUnit: [] as Array<{
        projectId: string;
        workUnitTypeId: string;
        currentStateId: string;
      }>,
      createFactInstance: [] as Array<{
        projectWorkUnitId: string;
        factDefinitionId: string;
        referencedProjectWorkUnitId?: string | null;
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
      findWorkUnitTypes: () =>
        Effect.succeed([
          {
            id: "wut-1",
            methodologyVersionId: "version-1",
            key: "WU.ONE",
            displayName: "Work Unit One",
            descriptionJson: null,
            guidanceJson: null,
            cardinality: "many_per_project",
            createdAt: new Date("2026-03-28T10:00:00.000Z"),
            updatedAt: new Date("2026-03-28T10:00:00.000Z"),
          },
          {
            id: "wut-single",
            methodologyVersionId: "version-1",
            key: "WU.SINGLE",
            displayName: "Singleton Work Unit",
            descriptionJson: null,
            guidanceJson: null,
            cardinality: "one",
            createdAt: new Date("2026-03-28T10:00:00.000Z"),
            updatedAt: new Date("2026-03-28T10:00:00.000Z"),
          },
        ]),
      findFactSchemas: () =>
        Effect.succeed([
          {
            id: "fact-link",
            methodologyVersionId: "version-1",
            workUnitTypeId: "wut-1",
            name: "Linked singleton",
            key: "linked_singleton",
            factType: "work_unit",
            cardinality: "one",
            description: null,
            defaultValueJson: null,
            guidanceJson: null,
            validationJson: null,
            targetWorkUnitDefinitionId: "wut-single",
            createdAt: new Date("2026-03-28T10:00:00.000Z"),
            updatedAt: new Date("2026-03-28T10:00:00.000Z"),
          },
        ]),
      findTransitionConditionSets: () => Effect.succeed([]),
    } as unknown as Context.Tag.Service<typeof LifecycleRepository>;

    const layer = Layer.provide(
      TransitionExecutionCommandServiceLive,
      Layer.mergeAll(
        Layer.succeed(ProjectContextRepository, projectContextRepository),
        Layer.succeed(LifecycleRepository, lifecycleRepository),
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
          listProjectWorkUnitsByProject: () =>
            Effect.succeed([
              {
                id: "wu-single-1",
                projectId: "proj-1",
                workUnitTypeId: "wut-single",
                currentStateId: "state-single",
                activeTransitionExecutionId: null,
                createdAt: new Date("2026-03-28T10:00:00.000Z"),
                updatedAt: new Date("2026-03-28T10:00:00.000Z"),
              },
            ]),
          getProjectWorkUnitById: () => Effect.succeed(null),
          updateActiveTransitionExecutionPointer: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>),
        Layer.succeed(WorkUnitFactRepository, {
          createFactInstance: (params: {
            projectWorkUnitId: string;
            factDefinitionId: string;
            referencedProjectWorkUnitId?: string | null;
          }) => {
            calls.createFactInstance.push(params);
            return Effect.succeed({
              id: "wufi-1",
              projectWorkUnitId: params.projectWorkUnitId,
              factDefinitionId: params.factDefinitionId,
              valueJson: null,
              referencedProjectWorkUnitId: params.referencedProjectWorkUnitId ?? null,
              status: "active",
              supersededByFactInstanceId: null,
              producedByTransitionExecutionId: null,
              producedByWorkflowExecutionId: null,
              authoredByUserId: null,
              createdAt: new Date("2026-03-28T10:00:00.000Z"),
            });
          },
          getCurrentValuesByDefinition: () => Effect.succeed([]),
          listFactsByWorkUnit: () => Effect.succeed([]),
          supersedeFactInstance: () => Effect.void,
          updateFactInstance: () => Effect.succeed(null),
          logicallyDeleteFactInstance: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>),
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
      }).pipe(Effect.provide(layer)),
    );

    expect(calls.createProjectWorkUnit).toEqual([
      {
        projectId: "proj-1",
        workUnitTypeId: "wut-1",
        currentStateId: null,
      },
    ]);
    expect(calls.startTransitionExecution).toEqual([
      {
        projectWorkUnitId: "wu-new",
        transitionId: "transition-1",
      },
    ]);
    expect(calls.createFactInstance).toEqual([
      {
        projectWorkUnitId: "wu-new",
        factDefinitionId: "fact-link",
        referencedProjectWorkUnitId: "wu-single-1",
      },
    ]);
    expect(result).toEqual({
      projectWorkUnitId: "wu-new",
      transitionExecutionId: "tx-2",
      workflowExecutionId: "wf-2",
    });
  });

  it("returns non-blocking warnings when singleton work-unit auto-attach finds no match", async () => {
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
      findWorkUnitTypes: () =>
        Effect.succeed([
          {
            id: "wut-1",
            methodologyVersionId: "version-1",
            key: "WU.ONE",
            displayName: "Work Unit One",
            descriptionJson: null,
            guidanceJson: null,
            cardinality: "many_per_project",
            createdAt: new Date("2026-03-28T10:00:00.000Z"),
            updatedAt: new Date("2026-03-28T10:00:00.000Z"),
          },
          {
            id: "wut-single",
            methodologyVersionId: "version-1",
            key: "WU.SINGLE",
            displayName: "Singleton Work Unit",
            descriptionJson: null,
            guidanceJson: null,
            cardinality: "one",
            createdAt: new Date("2026-03-28T10:00:00.000Z"),
            updatedAt: new Date("2026-03-28T10:00:00.000Z"),
          },
        ]),
      findFactSchemas: () =>
        Effect.succeed([
          {
            id: "fact-link",
            methodologyVersionId: "version-1",
            workUnitTypeId: "wut-1",
            name: "Linked singleton",
            key: "linked_singleton",
            factType: "work_unit",
            cardinality: "one",
            description: null,
            defaultValueJson: null,
            guidanceJson: null,
            validationJson: null,
            targetWorkUnitDefinitionId: "wut-single",
            createdAt: new Date("2026-03-28T10:00:00.000Z"),
            updatedAt: new Date("2026-03-28T10:00:00.000Z"),
          },
        ]),
      findTransitionConditionSets: () => Effect.succeed([]),
    } as unknown as Context.Tag.Service<typeof LifecycleRepository>;

    const layer = Layer.provide(
      TransitionExecutionCommandServiceLive,
      Layer.mergeAll(
        makeProjectContextRepositoryLayer(),
        Layer.succeed(LifecycleRepository, lifecycleRepository),
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
          createProjectWorkUnit: () =>
            Effect.succeed({
              id: "wu-new",
              projectId: "proj-1",
              workUnitTypeId: "wut-1",
              currentStateId: null,
              activeTransitionExecutionId: null,
              createdAt: new Date("2026-03-28T10:00:00.000Z"),
              updatedAt: new Date("2026-03-28T10:00:00.000Z"),
            }),
          listProjectWorkUnitsByProject: () => Effect.succeed([]),
          getProjectWorkUnitById: () => Effect.succeed(null),
          updateActiveTransitionExecutionPointer: () => Effect.succeed(null),
        } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>),
        makeWorkUnitFactRepositoryLayer(),
        Layer.succeed(TransitionExecutionRepository, {
          createTransitionExecution: () => Effect.die("unused"),
          startTransitionExecution: () =>
            Effect.succeed({
              id: "tx-2",
              projectWorkUnitId: "wu-new",
              transitionId: "transition-1",
              status: "active" as const,
              primaryWorkflowExecutionId: null,
              supersededByTransitionExecutionId: null,
              startedAt: new Date("2026-03-28T10:00:00.000Z"),
              completedAt: null,
              supersededAt: null,
            }),
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
              workflowRole: "primary" as const,
              status: "active" as const,
              currentStepExecutionId: null,
              supersededByWorkflowExecutionId: null,
              startedAt: new Date("2026-03-28T10:00:00.000Z"),
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
          workUnit: { mode: "new", workUnitTypeId: "wut-1" },
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "singleton_auto_attach_no_match",
        factDefinitionId: "fact-link",
        targetWorkUnitDefinitionId: "wut-single",
      }),
    ]);
  });

  it("re-checks completion gate and refuses completion when gate fails", async () => {
    let completionAttempted = false;

    const layer = Layer.provide(
      TransitionExecutionCommandServiceLive,
      Layer.mergeAll(
        makeProjectContextRepositoryLayer(),
        makeLifecycleRepositoryLayer(),
        makeReadRepositoryLayer(ACTIVE_TRANSITION_DETAIL),
        Layer.succeed(RuntimeGateService, {
          evaluateStartGate: () =>
            Effect.succeed({
              result: "available",
              evaluatedAt: "2026-03-28T10:03:00.000Z",
            }),
          evaluateCompletionGate: () =>
            Effect.succeed({
              result: "blocked",
              evaluatedAt: "2026-03-28T10:03:30.000Z",
              firstReason: "missing-required-artifact",
            }),
        } as unknown as Context.Tag.Service<typeof RuntimeGateService>),
        Layer.succeed(ProjectWorkUnitRepository, {
          createProjectWorkUnit: () => Effect.die("unused"),
          listProjectWorkUnitsByProject: () => Effect.succeed([]),
          getProjectWorkUnitById: () =>
            Effect.succeed({
              id: "wu-1",
              projectId: "proj-1",
              workUnitTypeId: "wut-1",
              currentStateId: "state-a",
              activeTransitionExecutionId: "tx-1",
              createdAt: new Date("2026-03-28T10:00:00.000Z"),
              updatedAt: new Date("2026-03-28T10:00:00.000Z"),
            }),
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
        makeProjectContextRepositoryLayer(),
        makeLifecycleRepositoryLayer(),
        makeReadRepositoryLayer(ACTIVE_TRANSITION_DETAIL),
        Layer.succeed(RuntimeGateService, {
          evaluateStartGate: () =>
            Effect.succeed({
              result: "available",
              evaluatedAt: "2026-03-28T10:03:00.000Z",
            }),
          evaluateCompletionGate: () =>
            Effect.succeed({
              result: "available",
              evaluatedAt: "2026-03-28T10:03:30.000Z",
            }),
        } as unknown as Context.Tag.Service<typeof RuntimeGateService>),
        Layer.succeed(ProjectWorkUnitRepository, {
          createProjectWorkUnit: () => Effect.die("unused"),
          listProjectWorkUnitsByProject: () => Effect.succeed([]),
          getProjectWorkUnitById: () =>
            Effect.succeed({
              id: "wu-1",
              projectId: "proj-1",
              workUnitTypeId: "wut-1",
              currentStateId: "state-a",
              activeTransitionExecutionId: "tx-1",
              createdAt: new Date("2026-03-28T10:00:00.000Z"),
              updatedAt: new Date("2026-03-28T10:00:00.000Z"),
            }),
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
        makeProjectContextRepositoryLayer(),
        makeLifecycleRepositoryLayer(),
        makeReadRepositoryLayer(ACTIVE_TRANSITION_DETAIL),
        Layer.succeed(RuntimeGateService, {
          evaluateStartGate: () =>
            Effect.succeed({
              result: "available",
              evaluatedAt: "2026-03-28T10:03:00.000Z",
            }),
          evaluateCompletionGate: () =>
            Effect.succeed({
              result: "blocked",
              evaluatedAt: "2026-03-28T10:03:30.000Z",
              firstReason: "choose-another-primary",
            }),
        } as unknown as Context.Tag.Service<typeof RuntimeGateService>),
        Layer.succeed(ProjectWorkUnitRepository, {
          createProjectWorkUnit: () => Effect.die("unused"),
          listProjectWorkUnitsByProject: () => Effect.succeed([]),
          getProjectWorkUnitById: () =>
            Effect.succeed({
              id: "wu-1",
              projectId: "proj-1",
              workUnitTypeId: "wut-1",
              currentStateId: "state-a",
              activeTransitionExecutionId: "tx-1",
              createdAt: new Date("2026-03-28T10:00:00.000Z"),
              updatedAt: new Date("2026-03-28T10:00:00.000Z"),
            }),
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

  it("refuses choose-primary when completion gate is already passing", async () => {
    let chooseAttempted = false;

    const layer = Layer.provide(
      TransitionExecutionCommandServiceLive,
      Layer.mergeAll(
        makeProjectContextRepositoryLayer(),
        makeLifecycleRepositoryLayer(),
        makeReadRepositoryLayer(ACTIVE_TRANSITION_DETAIL),
        Layer.succeed(RuntimeGateService, {
          evaluateStartGate: () =>
            Effect.succeed({
              result: "available",
              evaluatedAt: "2026-03-28T10:03:00.000Z",
            }),
          evaluateCompletionGate: () =>
            Effect.succeed({
              result: "available",
              evaluatedAt: "2026-03-28T10:03:30.000Z",
            }),
        } as unknown as Context.Tag.Service<typeof RuntimeGateService>),
        Layer.succeed(ProjectWorkUnitRepository, {
          createProjectWorkUnit: () => Effect.die("unused"),
          listProjectWorkUnitsByProject: () => Effect.succeed([]),
          getProjectWorkUnitById: () =>
            Effect.succeed({
              id: "wu-1",
              projectId: "proj-1",
              workUnitTypeId: "wut-1",
              currentStateId: "state-a",
              activeTransitionExecutionId: "tx-1",
              createdAt: new Date("2026-03-28T10:00:00.000Z"),
              updatedAt: new Date("2026-03-28T10:00:00.000Z"),
            }),
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
          choosePrimaryWorkflowForTransitionExecutionAtomically: () => {
            chooseAttempted = true;
            return Effect.die("must-not-run");
          },
        } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>),
      ),
    );

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* TransitionExecutionCommandService;
        yield* service.choosePrimaryWorkflowForTransitionExecution({
          projectId: "proj-1",
          projectWorkUnitId: "wu-1",
          transitionExecutionId: "tx-1",
          workflowId: "workflow-2",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(exit._tag).toBe("Failure");
    expect(chooseAttempted).toBe(false);
  });
});

describe("TransitionExecutionDetailService", () => {
  it("surfaces completion gate conditions and blocking reason for transition detail", async () => {
    const lifecycleRepository = {
      findLifecycleTransitions: () =>
        Effect.succeed([
          {
            id: "transition-1",
            methodologyVersionId: "version-1",
            workUnitTypeId: "wut-1",
            fromStateId: null,
            toStateId: "state-b",
            transitionKey: "activation_to_ready",
            createdAt: new Date("2026-03-28T10:00:00.000Z"),
            updatedAt: new Date("2026-03-28T10:00:00.000Z"),
          },
        ]),
      findLifecycleStates: () =>
        Effect.succeed([
          {
            id: "state-b",
            methodologyVersionId: "version-1",
            workUnitTypeId: "wut-1",
            key: "ready",
            displayName: "Ready",
            descriptionJson: null,
            guidanceJson: null,
            createdAt: new Date("2026-03-28T10:00:00.000Z"),
            updatedAt: new Date("2026-03-28T10:00:00.000Z"),
          },
        ]),
      findTransitionConditionSets: () =>
        Effect.succeed([
          {
            id: "cond-1",
            methodologyVersionId: "version-1",
            transitionId: "transition-1",
            key: "completion_requires_prd",
            phase: "completion",
            mode: "all",
            groupsJson: [
              {
                conditions: [
                  {
                    kind: "artifact",
                    required: true,
                    config: {
                      slotKey: "approved_prd",
                    },
                  },
                ],
              },
            ],
            guidanceJson: null,
            createdAt: new Date("2026-03-28T10:00:00.000Z"),
            updatedAt: new Date("2026-03-28T10:00:00.000Z"),
          },
        ]),
      findTransitionWorkflowBindings: () =>
        Effect.succeed([
          {
            id: "binding-1",
            methodologyVersionId: "version-1",
            transitionId: "transition-1",
            transitionKey: "activation_to_ready",
            workflowId: "workflow-1",
            workflowKey: "WF.READY.PRIMARY",
            createdAt: new Date("2026-03-28T10:00:00.000Z"),
            updatedAt: new Date("2026-03-28T10:00:00.000Z"),
          },
        ]),
    } as unknown as Context.Tag.Service<typeof LifecycleRepository>;

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

    const layer = Layer.provide(
      TransitionExecutionDetailServiceLive,
      Layer.mergeAll(
        Layer.succeed(ProjectContextRepository, projectContextRepository),
        Layer.succeed(LifecycleRepository, lifecycleRepository),
        makeReadRepositoryLayer(ACTIVE_TRANSITION_DETAIL),
        Layer.succeed(RuntimeGateService, {
          evaluateStartGate: () =>
            Effect.succeed({
              result: "available",
              evaluatedAt: "2026-03-28T10:03:00.000Z",
            }),
          evaluateCompletionGate: () =>
            Effect.succeed({
              result: "blocked",
              evaluatedAt: "2026-03-28T10:03:30.000Z",
              firstReason: "Artifact slot 'approved_prd' has no current snapshot",
            }),
          evaluateCompletionGateExhaustive: () =>
            Effect.succeed({
              result: "blocked",
              evaluatedAt: "2026-03-28T10:03:30.000Z",
              firstReason: "Artifact slot 'approved_prd' has no current snapshot",
              evaluationTree: {
                mode: "all",
                met: false,
                conditions: [],
                groups: [
                  {
                    mode: "all",
                    met: false,
                    conditions: [],
                    groups: [
                      {
                        mode: "all",
                        met: false,
                        conditions: [
                          {
                            condition: {
                              kind: "artifact",
                              slotKey: "approved_prd",
                              operator: "exists",
                            },
                            met: false,
                            reason: "Artifact slot 'approved_prd' has no current snapshot",
                          },
                        ],
                        groups: [],
                      },
                    ],
                  },
                ],
              },
            }),
        } as unknown as Context.Tag.Service<typeof RuntimeGateService>),
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* TransitionExecutionDetailService;
        return yield* service.getTransitionExecutionDetail({
          projectId: "proj-1",
          projectWorkUnitId: "wu-1",
          transitionExecutionId: "tx-1",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result?.completionGate.panelState).toBe("failing");
    expect(result?.completionGate.firstBlockingReason).toBe(
      "Artifact slot 'approved_prd' has no current snapshot",
    );
    expect(result?.completionGate.conditionTree).toEqual({
      mode: "all",
      conditions: [],
      groups: [
        {
          mode: "all",
          conditions: [],
          groups: [
            {
              mode: "all",
              conditions: [
                {
                  kind: "artifact",
                  slotKey: "approved_prd",
                  operator: "exists",
                },
              ],
              groups: [],
            },
          ],
        },
      ],
    });
    expect(result?.completionGate.evaluationTree).toEqual({
      mode: "all",
      met: false,
      conditions: [],
      groups: [
        {
          mode: "all",
          met: false,
          conditions: [],
          groups: [
            {
              mode: "all",
              met: false,
              conditions: [
                {
                  condition: {
                    kind: "artifact",
                    slotKey: "approved_prd",
                    operator: "exists",
                  },
                  met: false,
                  reason: "Artifact slot 'approved_prd' has no current snapshot",
                },
              ],
              groups: [],
            },
          ],
        },
      ],
    });
    expect(result?.transitionDefinition.completionConditionSets).toHaveLength(1);
  });
});
