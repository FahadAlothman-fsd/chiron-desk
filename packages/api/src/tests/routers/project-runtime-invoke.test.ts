import { call } from "@orpc/server";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  InvokeWorkUnitExecutionService,
  InvokeWorkflowExecutionService,
  RepositoryError,
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

function makeServiceLayer() {
  const calls = { workflow: 0, workUnit: 0, saveDraft: 0 };

  return {
    calls,
    successLayer: Layer.mergeAll(
      Layer.succeed(InvokeWorkflowExecutionService, {
        startInvokeWorkflowTarget: () => {
          calls.workflow += 1;
          return Effect.succeed({
            invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
            workflowExecutionId: "workflow-exec-1",
            result: "started" as const,
          });
        },
      }),
      Layer.succeed(InvokeWorkUnitExecutionService, {
        startInvokeWorkUnitTarget: () => {
          calls.workUnit += 1;
          return Effect.succeed({
            invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
            projectWorkUnitId: "project-work-unit-1",
            transitionExecutionId: "transition-exec-1",
            workflowExecutionId: "workflow-exec-2",
            result: "started" as const,
          });
        },
        saveInvokeWorkUnitTargetDraft: () => {
          calls.saveDraft += 1;
          return Effect.succeed({
            invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
          });
        },
      }),
    ),
    failureLayer: Layer.mergeAll(
      Layer.succeed(InvokeWorkflowExecutionService, {
        startInvokeWorkflowTarget: () =>
          Effect.fail(
            new RepositoryError({
              operation: "invoke-workflow-execution",
              cause: new Error("step execution is not active"),
            }),
          ),
      }),
      Layer.succeed(InvokeWorkUnitExecutionService, {
        startInvokeWorkUnitTarget: () =>
          Effect.fail(
            new RepositoryError({
              operation: "invoke-work-unit-execution.startInvokeWorkUnitTarget",
              cause: new Error("selected workflow definition is not valid for target"),
            }),
          ),
        saveInvokeWorkUnitTargetDraft: () =>
          Effect.fail(
            new RepositoryError({
              operation: "invoke-work-unit-execution.saveInvokeWorkUnitTargetDraft",
              cause: new Error("invoke work-unit target execution not found"),
            }),
          ),
      }),
    ),
  };
}

describe("project runtime invoke router", () => {
  it("delegates invoke start endpoints to the invoke services", async () => {
    const testLayer = makeServiceLayer();
    const router = createProjectRuntimeRouter(testLayer.successLayer);

    const workflow = await call(
      router.startInvokeWorkflowTarget,
      {
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
        invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
      },
      AUTHENTICATED_CTX,
    );
    const workUnit = await call(
      router.startInvokeWorkUnitTarget,
      {
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
        invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
        workflowDefinitionId: "workflow-def-1",
      },
      AUTHENTICATED_CTX,
    );
    const savedDraft = await call(
      router.saveInvokeWorkUnitTargetDraft,
      {
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
        invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
        runtimeFactValues: [
          {
            workUnitFactDefinitionId: "fact-1",
            valueJson: "saved",
          },
        ],
      },
      AUTHENTICATED_CTX,
    );

    expect(testLayer.calls).toEqual({ workflow: 1, workUnit: 1, saveDraft: 1 });
    expect(workflow.result).toBe("started");
    expect(workUnit.result).toBe("started");
    expect(savedDraft.invokeWorkUnitTargetExecutionId).toBe("invoke-wu-target-1");
  });

  it("maps invoke-specific repository failures through router error handling", async () => {
    const testLayer = makeServiceLayer();
    const router = createProjectRuntimeRouter(testLayer.failureLayer);

    await expect(
      call(
        router.startInvokeWorkflowTarget,
        {
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
        },
        AUTHENTICATED_CTX,
      ),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Repository operation failed: ",
    });

    await expect(
      call(
        router.startInvokeWorkUnitTarget,
        {
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
          workflowDefinitionId: "workflow-def-1",
        },
        AUTHENTICATED_CTX,
      ),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Repository operation failed: ",
    });

    await expect(
      call(
        router.saveInvokeWorkUnitTargetDraft,
        {
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
        },
        AUTHENTICATED_CTX,
      ),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Repository operation failed: ",
    });
  });
});
