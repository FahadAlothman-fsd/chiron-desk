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

const deferredStepTypes = ["agent", "action", "invoke", "branch", "display"] as const;

describe("l3 slice-1 deferred surfaces architecture", () => {
  it("locks non-form design-time and runtime read models to deferred/default surfaces only", () => {
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
  });

  it("keeps methodology authoring and runtime commands form-only", () => {
    const methodologySource = readRepoFile("packages/api/src/routers/methodology.ts");
    const runtimeSource = readRepoFile("packages/api/src/routers/project-runtime.ts");

    expect(methodologySource).toContain("createFormStep");
    expect(methodologySource).toContain("updateFormStep");
    expect(methodologySource).toContain("deleteFormStep");

    for (const forbiddenName of [
      "createAgentStep",
      "updateAgentStep",
      "deleteAgentStep",
      "createActionStep",
      "updateActionStep",
      "deleteActionStep",
      "createInvokeStep",
      "updateInvokeStep",
      "deleteInvokeStep",
      "createBranchStep",
      "updateBranchStep",
      "deleteBranchStep",
      "createDisplayStep",
      "updateDisplayStep",
      "deleteDisplayStep",
      "saveAgentStepDraft",
      "submitAgentStep",
      "runActionStep",
      "invokeWorkflowStep",
    ]) {
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

    expect(runtimeProcedureNames.filter((name) => /Step|FormStep/.test(name)).toSorted()).toEqual(
      [
        "activateFirstWorkflowStepExecution",
        "getRuntimeStepExecutionDetail",
        "saveFormStepDraft",
        "submitFormStep",
      ].toSorted(),
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
