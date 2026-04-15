import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  GetRuntimeStepExecutionDetailOutput,
  RuntimeInvokeTargetStatus,
  StartInvokeWorkUnitTargetInput,
  StartInvokeWorkUnitTargetOutput,
  StartInvokeWorkflowTargetInput,
  StartInvokeWorkflowTargetOutput,
} from "../runtime/executions";

describe("l3 runtime invoke contracts", () => {
  it("returns a first-class invoke body from runtime step detail", () => {
    const output = Schema.decodeUnknownSync(GetRuntimeStepExecutionDetailOutput)({
      shell: {
        stepExecutionId: "step-exec-1",
        workflowExecutionId: "workflow-exec-1",
        stepDefinitionId: "step-def-1",
        stepType: "invoke",
        status: "active",
        activatedAt: "2026-04-14T00:00:00.000Z",
        completionAction: {
          kind: "complete_step_execution",
          visible: true,
          enabled: false,
          reasonIfDisabled: "Finish child targets first.",
        },
      },
      body: {
        stepType: "invoke",
        targetKind: "work_unit",
        sourceMode: "context_fact_backed",
        workflowTargets: [
          {
            label: "Create story workflow",
            status: "active",
            activeChildStepLabel: "Draft implementation plan",
            invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
            workflowDefinitionId: "workflow-def-1",
            workflowDefinitionKey: "create-story",
            workflowDefinitionName: "Create story",
            workflowExecutionId: "workflow-exec-child-1",
            actions: {
              openWorkflow: {
                kind: "open_workflow_execution",
                workflowExecutionId: "workflow-exec-child-1",
                target: {
                  page: "workflow-execution-detail",
                  workflowExecutionId: "workflow-exec-child-1",
                },
              },
            },
          },
        ],
        workUnitTargets: [
          {
            workUnitLabel: "Story · Add invoke detail page",
            transitionLabel: "Move to In Progress",
            workflowLabel: "Create story",
            currentWorkUnitStateLabel: "In Progress",
            status: "blocked",
            blockedReason: "Select a primary workflow.",
            availablePrimaryWorkflows: [
              {
                workflowDefinitionName: "Create story",
                workflowDefinitionId: "workflow-def-1",
                workflowDefinitionKey: "create-story",
              },
            ],
            invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
            projectWorkUnitId: "project-wu-1",
            workUnitDefinitionId: "wu-def-1",
            workUnitDefinitionKey: "story",
            workUnitDefinitionName: "Story",
            transitionDefinitionId: "transition-def-1",
            transitionDefinitionKey: "ready-to-in-progress",
            workflowDefinitionId: "workflow-def-1",
            workflowDefinitionKey: "create-story",
            transitionExecutionId: "transition-exec-1",
            workflowExecutionId: "workflow-exec-child-1",
            actions: {
              start: {
                kind: "start_invoke_work_unit_target",
                enabled: false,
                reasonIfDisabled: "Select a primary workflow.",
                invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
              },
              openWorkUnit: {
                kind: "open_work_unit",
                projectWorkUnitId: "project-wu-1",
                target: {
                  page: "work-unit-overview",
                  projectWorkUnitId: "project-wu-1",
                },
              },
              openTransition: {
                kind: "open_transition_execution",
                transitionExecutionId: "transition-exec-1",
                target: {
                  page: "transition-execution-detail",
                  transitionExecutionId: "transition-exec-1",
                },
              },
              openWorkflow: {
                kind: "open_workflow_execution",
                workflowExecutionId: "workflow-exec-child-1",
                target: {
                  page: "workflow-execution-detail",
                  workflowExecutionId: "workflow-exec-child-1",
                },
              },
            },
          },
        ],
        completionSummary: {
          mode: "manual",
          eligible: false,
          reasonIfIneligible: "1 invoke target is still blocked.",
          totalTargets: 2,
          completedTargets: 1,
        },
        propagationPreview: {
          mode: "on_step_completion",
          summary: "Completion will write 1 context fact output.",
          outputs: [
            {
              label: "Created stories",
              contextFactDefinitionId: "context-fact-1",
              contextFactKey: "createdStories",
            },
          ],
        },
      },
    });

    expect(output.shell.stepType).toBe("invoke");
    expect(output.body.stepType).toBe("invoke");

    if (output.body.stepType === "invoke") {
      expect(output.body.workflowTargets[0]?.label).toBe("Create story workflow");
      expect(output.body.workUnitTargets[0]?.workUnitLabel).toBe("Story · Add invoke detail page");
      expect(output.body.workUnitTargets[0]?.invokeWorkUnitTargetExecutionId).toBe(
        "invoke-wu-target-1",
      );
      expect(output.body.propagationPreview.outputs[0]?.label).toBe("Created stories");
    }
  });

  it("locks invoke target statuses", () => {
    const decode = Schema.decodeUnknownSync(RuntimeInvokeTargetStatus);

    expect([
      decode("not_started"),
      decode("blocked"),
      decode("active"),
      decode("completed"),
      decode("failed"),
      decode("unavailable"),
    ]).toEqual(["not_started", "blocked", "active", "completed", "failed", "unavailable"]);

    expect(() => decode("queued")).toThrow();
  });

  it("locks startInvokeWorkflowTarget to a narrow idempotent-aware command surface", () => {
    const input = Schema.decodeUnknownSync(StartInvokeWorkflowTargetInput)({
      projectId: "project-1",
      stepExecutionId: "step-exec-1",
      invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
      workflowDefinitionId: "should-be-dropped",
    });

    expect(input).toEqual({
      projectId: "project-1",
      stepExecutionId: "step-exec-1",
      invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
    });

    const output = Schema.decodeUnknownSync(StartInvokeWorkflowTargetOutput)({
      invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
      workflowExecutionId: "workflow-exec-1",
      result: "already_started",
      body: { shouldNotLeak: true },
    });

    expect(output).toEqual({
      invokeWorkflowTargetExecutionId: "invoke-wf-target-1",
      workflowExecutionId: "workflow-exec-1",
      result: "already_started",
    });
  });

  it("locks startInvokeWorkUnitTarget to a narrow idempotent-aware command surface", () => {
    const input = Schema.decodeUnknownSync(StartInvokeWorkUnitTargetInput)({
      projectId: "project-1",
      stepExecutionId: "step-exec-1",
      invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
      workflowDefinitionId: "workflow-def-1",
      projectWorkUnitId: "should-be-dropped",
    });

    expect(input).toEqual({
      projectId: "project-1",
      stepExecutionId: "step-exec-1",
      invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
      workflowDefinitionId: "workflow-def-1",
    });

    const output = Schema.decodeUnknownSync(StartInvokeWorkUnitTargetOutput)({
      invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
      projectWorkUnitId: "project-wu-1",
      transitionExecutionId: "transition-exec-1",
      workflowExecutionId: "workflow-exec-1",
      result: "started",
      propagationPreview: { shouldNotLeak: true },
    });

    expect(output).toEqual({
      invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
      projectWorkUnitId: "project-wu-1",
      transitionExecutionId: "transition-exec-1",
      workflowExecutionId: "workflow-exec-1",
      result: "started",
    });
  });
});
