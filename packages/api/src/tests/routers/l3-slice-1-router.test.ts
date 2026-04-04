import { call } from "@orpc/server";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  StepExecutionDetailService,
  WorkflowExecutionStepCommandService,
} from "../../../../workflow-engine/src";
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

function makeRuntimeLayer() {
  const calls = {
    activate: 0,
    saveDraft: 0,
    submit: 0,
    detail: 0,
  };

  const stepCommandService: WorkflowExecutionStepCommandService["Type"] = {
    activateFirstWorkflowStepExecution: () => {
      calls.activate += 1;
      return Effect.succeed({ stepExecutionId: "step-exec-1" });
    },
    saveFormStepDraft: () => {
      calls.saveDraft += 1;
      return Effect.succeed({ stepExecutionId: "step-exec-1", status: "draft_saved" as const });
    },
    submitFormStep: () => {
      calls.submit += 1;
      return Effect.succeed({ stepExecutionId: "step-exec-1", status: "captured" as const });
    },
  };

  const stepDetailService: StepExecutionDetailService["Type"] = {
    getRuntimeStepExecutionDetail: () => {
      calls.detail += 1;
      return Effect.succeed({
        stepExecution: {
          stepExecutionId: "step-exec-1",
          workflowExecutionId: "wfexec-1",
          stepDefinitionId: "step-1",
          stepType: "form",
          status: "completed",
          activatedAt: new Date(0).toISOString(),
          completedAt: new Date(1).toISOString(),
        },
        tabs: {
          submissionAndProgression: {
            draftValues: { initiative_name: "Chiron" },
            submittedSnapshot: { initiative_name: "Chiron" },
            submittedAt: new Date(1).toISOString(),
            progression: { submittedAt: new Date(1).toISOString() },
            nextStepExecutionId: "step-exec-2",
          },
          writes: {
            workflowContextWrites: [
              {
                contextFactId: "ctx-1",
                factKey: "initiative_name",
                factKind: "plain_value",
                value: "Chiron",
              },
            ],
            authoritativeProjectFactWrites: [
              {
                projectFactInstanceId: "pf-1",
                factDefinitionId: "setup_tags",
                value: { env: "dev" },
              },
            ],
          },
          contextFactSemantics: {
            notes: ["Submission snapshot is immutable once submitted."],
            mappings: [
              {
                factKey: "initiative_name",
                semantics: "Captured as workflow-local context for downstream steps.",
              },
            ],
          },
        },
      });
    },
  };

  return {
    calls,
    layer: Layer.mergeAll(
      Layer.succeed(WorkflowExecutionStepCommandService, stepCommandService),
      Layer.succeed(StepExecutionDetailService, stepDetailService),
    ),
  };
}

describe("l3 slice-1 project runtime router", () => {
  it("wires activate/save/submit commands and runtime step detail", async () => {
    const runtime = makeRuntimeLayer();
    const router = createProjectRuntimeRouter(runtime.layer);

    const activateResult = await call(
      router.activateFirstWorkflowStepExecution,
      { projectId: "project-1", workflowExecutionId: "wfexec-1" },
      AUTHENTICATED_CTX,
    );
    const saveResult = await call(
      router.saveFormStepDraft,
      {
        projectId: "project-1",
        workflowExecutionId: "wfexec-1",
        stepExecutionId: "step-exec-1",
        values: { initiative_name: "Chiron" },
      },
      AUTHENTICATED_CTX,
    );
    const submitResult = await call(
      router.submitFormStep,
      {
        projectId: "project-1",
        workflowExecutionId: "wfexec-1",
        stepExecutionId: "step-exec-1",
        values: { initiative_name: "Chiron", "project.setup_tags": { env: "dev" } },
      },
      AUTHENTICATED_CTX,
    );
    const detailResult = await call(
      router.getRuntimeStepExecutionDetail,
      { projectId: "project-1", stepExecutionId: "step-exec-1" },
      PUBLIC_CTX,
    );

    expect(runtime.calls.activate).toBe(1);
    expect(runtime.calls.saveDraft).toBe(1);
    expect(runtime.calls.submit).toBe(1);
    expect(runtime.calls.detail).toBe(1);

    expect(activateResult.stepExecutionId).toBe("step-exec-1");
    expect(saveResult.status).toBe("draft_saved");
    expect(submitResult.status).toBe("captured");
    expect(detailResult.tabs.writes.workflowContextWrites).toHaveLength(1);
    expect(detailResult.tabs.writes.authoritativeProjectFactWrites).toHaveLength(1);
  });

  it("requires authentication for activation and form command mutations", async () => {
    const runtime = makeRuntimeLayer();
    const router = createProjectRuntimeRouter(runtime.layer);

    await expect(
      call(
        router.activateFirstWorkflowStepExecution,
        { projectId: "project-1", workflowExecutionId: "wfexec-1" },
        PUBLIC_CTX,
      ),
    ).rejects.toThrow();

    await expect(
      call(
        router.saveFormStepDraft,
        {
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          stepExecutionId: "step-exec-1",
          values: { initiative_name: "Chiron" },
        },
        PUBLIC_CTX,
      ),
    ).rejects.toThrow();

    await expect(
      call(
        router.submitFormStep,
        {
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          stepExecutionId: "step-exec-1",
          values: { initiative_name: "Chiron" },
        },
        PUBLIC_CTX,
      ),
    ).rejects.toThrow();

    expect(runtime.calls.activate).toBe(0);
    expect(runtime.calls.saveDraft).toBe(0);
    expect(runtime.calls.submit).toBe(0);
  });
});
