import { call } from "@orpc/server";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  RuntimeManualFactCrudService,
  RuntimeFactService,
  TransitionExecutionCommandService,
  WorkflowExecutionCommandService,
} from "@chiron/workflow-engine";

import { createProjectRuntimeRouter } from "../../routers/project-runtime";

const AUTHENTICATED_CTX = {
  context: {
    session: {
      session: {
        id: "session-id",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        userId: "user-id",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        token: "token",
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: "user-id",
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        emailVerified: true,
        image: null,
      },
    },
  },
};

const PUBLIC_CTX = { context: { session: null } };

function makeServiceLayer() {
  const calls = {
    start: 0,
    switch: 0,
    complete: 0,
    choosePrimary: 0,
    retry: 0,
    createProject: 0,
    updateProject: 0,
    deleteProject: 0,
    createWorkUnit: 0,
    updateWorkUnit: 0,
    deleteWorkUnit: 0,
  };

  const transitionCommands: TransitionExecutionCommandService["Type"] = {
    startTransitionExecution: () => {
      calls.start += 1;
      return Effect.succeed({
        projectWorkUnitId: "wu-1",
        transitionExecutionId: "te-1",
        workflowExecutionId: "we-1",
      });
    },
    switchActiveTransitionExecution: () => {
      calls.switch += 1;
      return Effect.succeed({
        supersededTransitionExecutionId: "te-old",
        transitionExecutionId: "te-2",
        workflowExecutionId: "we-2",
      });
    },
    completeTransitionExecution: () => {
      calls.complete += 1;
      return Effect.succeed({
        transitionExecutionId: "te-2",
        projectWorkUnitId: "wu-1",
        newStateId: "state-done",
        newStateKey: "done",
        newStateLabel: "Done",
      });
    },
    choosePrimaryWorkflowForTransitionExecution: () => {
      calls.choosePrimary += 1;
      return Effect.succeed({
        transitionExecutionId: "te-2",
        workflowExecutionId: "we-3",
      });
    },
  };

  const workflowCommands: WorkflowExecutionCommandService["Type"] = {
    retrySameWorkflowExecution: () => {
      calls.retry += 1;
      return Effect.succeed({
        transitionExecutionId: "te-2",
        workflowExecutionId: "we-4",
        workflowRole: "primary",
      });
    },
  };

  const factService = {
    getProjectFacts: () =>
      Effect.succeed({ project: { projectId: "p", name: "p" }, filters: {}, cards: [] }),
    getProjectFactDetail: () =>
      Effect.succeed({
        project: { projectId: "p", name: "p" },
        factDefinition: {
          factDefinitionId: "fd",
          factKey: "fd",
          factType: "string",
          cardinality: "one",
        },
        currentState: { exists: false, currentCount: 0, values: [] },
        actions: {
          canAddInstance: true,
          canUpdateExisting: true,
          canRemoveExisting: false as const,
        },
      }),
    getWorkUnitFacts: () =>
      Effect.succeed({
        workUnit: {
          projectWorkUnitId: "wu",
          workUnitTypeId: "wut",
          workUnitTypeKey: "WUT",
          workUnitTypeName: "WUT",
          currentStateId: "todo",
          currentStateKey: "todo",
          currentStateLabel: "Todo",
        },
        activeTab: "primitive" as const,
        filters: {},
        primitive: { cards: [] },
      }),
    getWorkUnitFactDetail: () =>
      Effect.succeed({
        workUnit: {
          projectWorkUnitId: "wu",
          workUnitTypeId: "wut",
          workUnitTypeKey: "WUT",
          workUnitTypeName: "WUT",
        },
        factDefinition: {
          factDefinitionId: "fd",
          factKey: "fd",
          factType: "string",
          cardinality: "one",
        },
        primitiveState: { exists: false, currentCount: 0, values: [] },
        actions: {
          canAddInstance: true,
          canUpdateExisting: true,
          canRemoveExisting: false as const,
        },
      }),
  } satisfies RuntimeFactService["Type"] &
    Record<string, (...args: any[]) => Effect.Effect<unknown>>;

  const runtimeManualFactCrudService: RuntimeManualFactCrudService["Type"] = {
    apply: (request) => {
      if (request.scope === "project") {
        switch (request.payload.verb) {
          case "create":
            calls.createProject += 1;
            return Effect.succeed({
              scope: "project",
              factDefinitionId: request.factDefinitionId,
              verb: request.payload.verb,
              affectedCount: 1,
              affectedInstanceIds: ["pf-1"],
            });
          case "update":
            calls.updateProject += 1;
            return Effect.succeed({
              scope: "project",
              factDefinitionId: request.factDefinitionId,
              verb: request.payload.verb,
              affectedCount: 1,
              affectedInstanceIds: [request.payload.instanceId],
            });
          case "delete":
            calls.deleteProject += 1;
            return Effect.succeed({
              scope: "project",
              factDefinitionId: request.factDefinitionId,
              verb: request.payload.verb,
              affectedCount: 1,
              affectedInstanceIds: ["pf-deleted"],
            });
        }
      }

      switch (request.payload.verb) {
        case "create":
          calls.createWorkUnit += 1;
          return Effect.succeed({
            scope: "work_unit",
            factDefinitionId: request.factDefinitionId,
            verb: request.payload.verb,
            affectedCount: 1,
            affectedInstanceIds: ["wf-1"],
          });
        case "update":
          calls.updateWorkUnit += 1;
          return Effect.succeed({
            scope: "work_unit",
            factDefinitionId: request.factDefinitionId,
            verb: request.payload.verb,
            affectedCount: 1,
            affectedInstanceIds: [request.payload.instanceId],
          });
        case "delete":
          calls.deleteWorkUnit += 1;
          return Effect.succeed({
            scope: "work_unit",
            factDefinitionId: request.factDefinitionId,
            verb: request.payload.verb,
            affectedCount: 1,
            affectedInstanceIds: ["wf-deleted"],
          });
      }
    },
  };

  return {
    calls,
    layer: Layer.mergeAll(
      Layer.succeed(TransitionExecutionCommandService, transitionCommands),
      Layer.succeed(WorkflowExecutionCommandService, workflowCommands),
      Layer.succeed(RuntimeFactService, factService),
      Layer.succeed(RuntimeManualFactCrudService, runtimeManualFactCrudService),
    ),
  };
}

describe("project runtime router mutations", () => {
  it("requires authentication for transition start mutation", async () => {
    const testLayer = makeServiceLayer();
    const router = createProjectRuntimeRouter(testLayer.layer);

    await expect(
      call(
        router.startTransitionExecution,
        {
          projectId: "p",
          transitionId: "t",
          workflowId: "wf",
          workUnit: { mode: "existing", projectWorkUnitId: "wu" },
        },
        PUBLIC_CTX,
      ),
    ).rejects.toThrow();
    expect(testLayer.calls.start).toBe(0);
  });

  it("delegates transition/workflow command mutations exactly once", async () => {
    const testLayer = makeServiceLayer();
    const router = createProjectRuntimeRouter(testLayer.layer);

    await call(
      router.startTransitionExecution,
      {
        projectId: "p",
        transitionId: "t",
        workflowId: "wf",
        workUnit: { mode: "existing", projectWorkUnitId: "wu" },
      },
      AUTHENTICATED_CTX,
    );
    await call(
      router.switchActiveTransitionExecution,
      {
        projectId: "p",
        projectWorkUnitId: "wu",
        supersededTransitionExecutionId: "te-old",
        transitionId: "t2",
        workflowId: "wf2",
      },
      AUTHENTICATED_CTX,
    );
    await call(
      router.completeTransitionExecution,
      { projectId: "p", projectWorkUnitId: "wu", transitionExecutionId: "te-2" },
      AUTHENTICATED_CTX,
    );
    await call(
      router.choosePrimaryWorkflowForTransitionExecution,
      {
        projectId: "p",
        projectWorkUnitId: "wu",
        transitionExecutionId: "te-2",
        workflowId: "wf3",
      },
      AUTHENTICATED_CTX,
    );
    await call(
      router.retrySameWorkflowExecution,
      { projectId: "p", workflowExecutionId: "we-2" },
      AUTHENTICATED_CTX,
    );

    expect(testLayer.calls.start).toBe(1);
    expect(testLayer.calls.switch).toBe(1);
    expect(testLayer.calls.complete).toBe(1);
    expect(testLayer.calls.choosePrimary).toBe(1);
    expect(testLayer.calls.retry).toBe(1);
  });

  it("delegates project/work-unit CRUD mutations exactly once", async () => {
    const testLayer = makeServiceLayer();
    const router = createProjectRuntimeRouter(testLayer.layer);

    await call(
      router.createRuntimeProjectFactValue,
      { projectId: "p", factDefinitionId: "fd", value: "v" },
      AUTHENTICATED_CTX,
    );
    await call(
      router.updateRuntimeProjectFactValue,
      { projectId: "p", factDefinitionId: "fd", projectFactInstanceId: "pf-1", value: "v2" },
      AUTHENTICATED_CTX,
    );
    await call(
      router.deleteRuntimeProjectFactValue,
      { projectId: "p", factDefinitionId: "fd" },
      AUTHENTICATED_CTX,
    );
    await call(
      router.createRuntimeWorkUnitFactValue,
      { projectId: "p", projectWorkUnitId: "wu", factDefinitionId: "fd", value: "x" },
      AUTHENTICATED_CTX,
    );
    await call(
      router.updateRuntimeWorkUnitFactValue,
      {
        projectId: "p",
        projectWorkUnitId: "wu",
        factDefinitionId: "fd",
        workUnitFactInstanceId: "wf-1",
        value: "y",
      },
      AUTHENTICATED_CTX,
    );
    await call(
      router.deleteRuntimeWorkUnitFactValue,
      {
        projectId: "p",
        projectWorkUnitId: "wu",
        factDefinitionId: "fd",
      },
      AUTHENTICATED_CTX,
    );

    expect(testLayer.calls.createProject).toBe(1);
    expect(testLayer.calls.updateProject).toBe(1);
    expect(testLayer.calls.deleteProject).toBe(1);
    expect(testLayer.calls.createWorkUnit).toBe(1);
    expect(testLayer.calls.updateWorkUnit).toBe(1);
    expect(testLayer.calls.deleteWorkUnit).toBe(1);
  });
});
