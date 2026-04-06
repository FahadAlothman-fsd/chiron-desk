import { call } from "@orpc/server";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  RuntimeFactService,
  TransitionExecutionCommandService,
  WorkflowExecutionCommandService,
} from "../../../../workflow-engine/src/index";

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
    addProject: 0,
    setProject: 0,
    replaceProject: 0,
    addWorkUnit: 0,
    setWorkUnit: 0,
    replaceWorkUnit: 0,
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
    addRuntimeProjectFactValue: () => {
      calls.addProject += 1;
      return Effect.succeed({ projectFactInstanceId: "pf-1" });
    },
    setRuntimeProjectFactValue: () => {
      calls.setProject += 1;
      return Effect.succeed({
        projectFactInstanceId: "pf-2",
        supersededProjectFactInstanceId: "pf-1",
      });
    },
    replaceRuntimeProjectFactValue: () => {
      calls.replaceProject += 1;
      return Effect.succeed({
        projectFactInstanceId: "pf-3",
        supersededProjectFactInstanceId: "pf-2",
      });
    },
    addRuntimeWorkUnitFactValue: () => {
      calls.addWorkUnit += 1;
      return Effect.succeed({ workUnitFactInstanceId: "wf-1" });
    },
    setRuntimeWorkUnitFactValue: () => {
      calls.setWorkUnit += 1;
      return Effect.succeed({
        workUnitFactInstanceId: "wf-2",
        supersededWorkUnitFactInstanceId: "wf-1",
      });
    },
    replaceRuntimeWorkUnitFactValue: () => {
      calls.replaceWorkUnit += 1;
      return Effect.succeed({
        workUnitFactInstanceId: "wf-3",
        supersededWorkUnitFactInstanceId: "wf-2",
      });
    },
  } satisfies RuntimeFactService["Type"] &
    Record<string, (...args: any[]) => Effect.Effect<unknown>>;

  return {
    calls,
    layer: Layer.mergeAll(
      Layer.succeed(TransitionExecutionCommandService, transitionCommands),
      Layer.succeed(WorkflowExecutionCommandService, workflowCommands),
      Layer.succeed(RuntimeFactService, factService),
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

  it("delegates project/work-unit fact mutations exactly once", async () => {
    const testLayer = makeServiceLayer();
    const router = createProjectRuntimeRouter(testLayer.layer);

    await call(
      router.addRuntimeProjectFactValue,
      { projectId: "p", factDefinitionId: "fd", value: "v" },
      AUTHENTICATED_CTX,
    );
    await call(
      router.setRuntimeProjectFactValue,
      { projectId: "p", factDefinitionId: "fd", projectFactInstanceId: "pf-1", value: "v2" },
      AUTHENTICATED_CTX,
    );
    await call(
      router.replaceRuntimeProjectFactValue,
      { projectId: "p", factDefinitionId: "fd", projectFactInstanceId: "pf-2", value: "v3" },
      AUTHENTICATED_CTX,
    );
    await call(
      router.addRuntimeWorkUnitFactValue,
      { projectId: "p", projectWorkUnitId: "wu", factDefinitionId: "fd", value: "x" },
      AUTHENTICATED_CTX,
    );
    await call(
      router.setRuntimeWorkUnitFactValue,
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
      router.replaceRuntimeWorkUnitFactValue,
      {
        projectId: "p",
        projectWorkUnitId: "wu",
        factDefinitionId: "fd",
        workUnitFactInstanceId: "wf-2",
        value: "z",
      },
      AUTHENTICATED_CTX,
    );

    expect(testLayer.calls.addProject).toBe(1);
    expect(testLayer.calls.setProject).toBe(1);
    expect(testLayer.calls.replaceProject).toBe(1);
    expect(testLayer.calls.addWorkUnit).toBe(1);
    expect(testLayer.calls.setWorkUnit).toBe(1);
    expect(testLayer.calls.replaceWorkUnit).toBe(1);
  });
});
