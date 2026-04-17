import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import { WorkflowStepReadModel } from "@chiron/contracts/methodology/workflow";
import { RuntimeStepExecutionDto } from "@chiron/contracts/runtime/executions";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../");

const readRepoFile = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

const deferredStepTypes = ["agent", "action", "display"] as const;

describe("l3 slice-1 deferred surfaces architecture", () => {
  it("locks deferred generic shells while invoke/branch use first-class payload read models", () => {
    const decodeWorkflowStepReadModel = Schema.decodeUnknownSync(WorkflowStepReadModel);
    const decodeRuntimeStepExecution = Schema.decodeUnknownSync(RuntimeStepExecutionDto);

    for (const stepType of deferredStepTypes) {
      expect(
        decodeWorkflowStepReadModel({
          stepId: `step-${stepType}`,
          stepType,
          mode: "deferred",
          defaultMessage: `${stepType} deferred in slice-1`,
        }),
      ).toMatchObject({ stepType, mode: "deferred" });

      expect(
        decodeRuntimeStepExecution({
          stepExecutionId: `exec-${stepType}`,
          stepType,
          mode: "deferred",
          defaultMessage: `${stepType} deferred in slice-1`,
        }),
      ).toMatchObject({ stepType, mode: "deferred" });

      expect(() =>
        decodeWorkflowStepReadModel({
          stepId: `invalid-step-${stepType}`,
          stepType,
          payload: {
            key: "capture",
            fields: [],
            contextFacts: [],
          },
        }),
      ).toThrow();

      expect(() =>
        decodeRuntimeStepExecution({
          stepExecutionId: `invalid-exec-${stepType}`,
          stepType,
          mode: "captured",
          formStep: {
            key: "capture",
            fields: [],
            contextFacts: [],
          },
        }),
      ).toThrow();
    }

    expect(
      decodeWorkflowStepReadModel({
        stepId: "step-invoke",
        stepType: "invoke",
        payload: {
          key: "invoke-story",
          targetKind: "workflow",
          sourceMode: "fixed_set",
          workflowDefinitionIds: ["wf-story"],
        },
      }),
    ).toMatchObject({ stepType: "invoke", payload: { key: "invoke-story" } });

    expect(
      decodeWorkflowStepReadModel({
        stepId: "step-branch",
        stepType: "branch",
        payload: {
          key: "branch-story",
          routes: [],
          defaultTargetStepId: null,
        },
      }),
    ).toMatchObject({ stepType: "branch", payload: { key: "branch-story" } });

    expect(() =>
      decodeRuntimeStepExecution({
        stepExecutionId: "invalid-exec-invoke",
        stepType: "invoke",
        mode: "deferred",
        defaultMessage: "invoke deferred in slice-1",
      }),
    ).toThrow();

    expect(() =>
      decodeRuntimeStepExecution({
        stepExecutionId: "invalid-exec-branch",
        stepType: "branch",
        mode: "deferred",
        defaultMessage: "branch deferred in slice-1",
      }),
    ).toThrow();
  });

  it("locks the current Plan A authoring/runtime procedure surface while display remains deferred", () => {
    const methodologySource = readRepoFile("packages/api/src/routers/methodology.ts");
    const runtimeSource = readRepoFile("packages/api/src/routers/project-runtime.ts");

    expect(methodologySource).toContain("createFormStep");
    expect(methodologySource).toContain("updateFormStep");
    expect(methodologySource).toContain("deleteFormStep");
    expect(methodologySource).toContain("createAgentStep");
    expect(methodologySource).toContain("createInvokeStep");
    expect(methodologySource).toContain("createBranchStep");
    expect(methodologySource).toContain("getActionStepDefinition");
    expect(methodologySource).toContain("createActionStep");
    expect(methodologySource).toContain("updateActionStep");
    expect(methodologySource).toContain("deleteActionStep");

    for (const forbiddenName of ["createDisplayStep", "updateDisplayStep", "deleteDisplayStep"]) {
      expect(methodologySource).not.toContain(forbiddenName);
      expect(runtimeSource).not.toContain(forbiddenName);
    }

    const runtimeProcedureNames = [
      ...runtimeSource.matchAll(
        /\n\s{4}([A-Za-z0-9_]+):\s+(?:publicProcedure|protectedProcedure)/g,
      ),
    ]
      .map((match) => match[1])
      .filter((name): name is string => typeof name === "string");

    expect(
      runtimeProcedureNames.filter((name) => /Step|FormStep|Action|Branch|Invoke|Agent/.test(name)),
    ).toEqual(
      expect.arrayContaining([
        "activateWorkflowStepExecution",
        "activateFirstWorkflowStepExecution",
        "getRuntimeStepExecutionDetail",
        "getAgentStepExecutionDetail",
        "getAgentStepTimelinePage",
        "startAgentStepSession",
        "reconnectAgentStepSession",
        "sendAgentStepMessage",
        "updateAgentStepTurnSelection",
        "completeAgentStepExecution",
        "saveFormStepDraft",
        "submitFormStep",
        "saveBranchStepSelection",
        "completeStepExecution",
        "startActionStepExecution",
        "runActionStepActions",
        "retryActionStepActions",
        "completeActionStepExecution",
        "streamActionStepExecutionEvents",
        "streamAgentStepSessionEvents",
        "startInvokeWorkflowTarget",
        "startInvokeWorkUnitTarget",
      ]),
    );
  });

  it("keeps manual authoring isolated to project fact instances", () => {
    const projectFactDetailSource = readRepoFile(
      "apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx",
    );
    const workflowExecutionSource = readRepoFile(
      "apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx",
    );
    const stepExecutionSource = readRepoFile(
      "apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx",
    );

    expect(projectFactDetailSource).toContain("Manual authoring (project facts only)");
    expect(projectFactDetailSource).toContain("addRuntimeProjectFactValue");
    expect(projectFactDetailSource).toContain("setRuntimeProjectFactValue");
    expect(projectFactDetailSource).toContain("replaceRuntimeProjectFactValue");

    for (const otherSource of [workflowExecutionSource, stepExecutionSource]) {
      expect(otherSource).not.toContain("addRuntimeProjectFactValue");
      expect(otherSource).not.toContain("setRuntimeProjectFactValue");
      expect(otherSource).not.toContain("replaceRuntimeProjectFactValue");
      expect(otherSource).not.toContain("Manual authoring (project facts only)");
    }
  });
});
