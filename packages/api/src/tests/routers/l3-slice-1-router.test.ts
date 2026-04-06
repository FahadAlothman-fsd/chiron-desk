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
    complete: 0,
    detail: 0,
  };

  const stepCommandService: WorkflowExecutionStepCommandService["Type"] = {
    activateWorkflowStepExecution: () => {
      calls.activate += 1;
      return Effect.succeed({ stepExecutionId: "step-exec-1" });
    },
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
    completeStepExecution: () => {
      calls.complete += 1;
      return Effect.succeed({ stepExecutionId: "step-exec-1", status: "completed" as const });
    },
  };

  const stepDetailService: StepExecutionDetailService["Type"] = {
    getRuntimeStepExecutionDetail: () => {
      calls.detail += 1;
      return Effect.succeed({
        shell: {
          stepExecutionId: "step-exec-1",
          workflowExecutionId: "wfexec-1",
          stepDefinitionId: "step-1",
          stepType: "form",
          status: "completed",
          activatedAt: new Date(0).toISOString(),
          completedAt: new Date(1).toISOString(),
          completionAction: {
            kind: "complete_step_execution",
            visible: false,
            enabled: false,
            reasonIfDisabled: "Step execution is already completed.",
          },
        },
        body: {
          stepType: "form",
          page: {
            formKey: "collect-context",
            formLabel: "Collect context",
            descriptionMarkdown: "Capture the setup selections.",
            projectRootPath: "/tmp/chiron",
            fields: [
              {
                fieldKey: "initiativeName",
                fieldLabel: "Initiative name",
                helpText: "Used by later runtime steps.",
                required: true,
                contextFactDefinitionId: "ctx-initiative-name",
                contextFactKey: "initiative_name",
                contextFactKind: "plain_value_fact",
                widget: {
                  control: "text",
                  valueType: "string",
                  cardinality: "one",
                  renderedMultiplicity: "one",
                },
              },
            ],
          },
          draft: {
            payloadMode: "latest_only",
            payload: { initiativeName: "Chiron" },
          },
          saveDraftAction: {
            kind: "save_form_step_draft",
            enabled: false,
            reasonIfDisabled: "Only active Form steps can save draft state.",
          },
          submission: {
            payloadMode: "latest_only",
            payload: { initiativeName: "Chiron" },
            submittedAt: new Date(1).toISOString(),
          },
          submitAction: {
            kind: "submit_form_step",
            enabled: false,
            reasonIfDisabled: "Form submission is already captured for this step execution.",
          },
          lineage: {
            previousStepExecutionId: undefined,
            nextStepExecutionId: "step-exec-2",
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
      router.activateWorkflowStepExecution,
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
    const completeResult = await call(
      router.completeStepExecution,
      {
        projectId: "project-1",
        workflowExecutionId: "wfexec-1",
        stepExecutionId: "step-exec-1",
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
    expect(runtime.calls.complete).toBe(1);
    expect(runtime.calls.detail).toBe(1);

    expect(activateResult.stepExecutionId).toBe("step-exec-1");
    expect(saveResult.status).toBe("draft_saved");
    expect(submitResult.status).toBe("captured");
    expect(completeResult.status).toBe("completed");
    expect(detailResult.shell.completionAction.visible).toBe(false);
    expect(detailResult.body.stepType).toBe("form");
    if (detailResult.body.stepType === "form") {
      expect(detailResult.body.page.fields[0]?.fieldKey).toBe("initiativeName");
      expect(detailResult.body.submission.payload).toMatchObject({ initiativeName: "Chiron" });
      expect(detailResult.body.lineage.nextStepExecutionId).toBe("step-exec-2");
    }
  });

  it("requires authentication for activation and form command mutations", async () => {
    const runtime = makeRuntimeLayer();
    const router = createProjectRuntimeRouter(runtime.layer);

    await expect(
      call(
        router.activateWorkflowStepExecution,
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

    await expect(
      call(
        router.completeStepExecution,
        {
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          stepExecutionId: "step-exec-1",
        },
        PUBLIC_CTX,
      ),
    ).rejects.toThrow();

    expect(runtime.calls.activate).toBe(0);
    expect(runtime.calls.saveDraft).toBe(0);
    expect(runtime.calls.submit).toBe(0);
    expect(runtime.calls.complete).toBe(0);
  });
});
