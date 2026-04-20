import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../");

const readRepoFile = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("runtime router boundary governance", () => {
  it("keeps runtime router handlers thin with service-only composition", () => {
    const source = readRepoFile("packages/api/src/routers/project-runtime.ts");

    const handlerCount = (source.match(/\.handler\(async \(\{ input \}\) =>/g) ?? []).length;
    const serviceResolutionCount = (
      source.match(/const\s+[A-Za-z0-9_]*Service\s*=\s+yield\*/g) ?? []
    ).length;
    const serviceResolutionOverhead = serviceResolutionCount - handlerCount;

    expect(handlerCount).toBeGreaterThan(0);
    expect(serviceResolutionCount).toBeGreaterThan(0);
    expect(serviceResolutionOverhead).toBeGreaterThanOrEqual(0);
    expect(serviceResolutionOverhead).toBeLessThanOrEqual(8);
    expect(source).not.toContain("yield* TransitionExecutionRepository");
    expect(source).not.toContain("yield* WorkflowExecutionRepository");
    expect(source).not.toContain("runtime-repositories");
    expect(source).not.toContain('from "../../../db/src/runtime-repositories');
    expect(source).not.toContain('from "../../../workflow-engine/src/repositories');
    expect(source).toContain("runEffect(");
  });

  it("locks runtime router to workflow-engine services and forbids repository imports", () => {
    const source = readRepoFile("packages/api/src/routers/project-runtime.ts");

    expect(source).toContain("@chiron/workflow-engine");
    expect(source).toContain("RuntimeGuidanceService");
    expect(source).toContain("RuntimeOverviewService");
    expect(source).toContain("RuntimeWorkUnitService");
    expect(source).toContain("RuntimeWorkflowIndexService");
    expect(source).toContain("TransitionExecutionCommandService");
    expect(source).toContain("WorkflowExecutionCommandService");

    expect(source).not.toContain("ExecutionReadRepository");
    expect(source).not.toContain("ProjectContextRepository");
    expect(source).not.toContain("WorkflowExecutionRepository");
    expect(source).not.toContain("TransitionExecutionRepository");
  });

  it("keeps step-level runtime procedures explicit and service-backed", () => {
    const source = readRepoFile("packages/api/src/routers/project-runtime.ts");

    const procedureNames = [
      ...source.matchAll(/\n\s{4}([A-Za-z0-9_]+):\s+(?:publicProcedure|protectedProcedure)/g),
    ]
      .map((match) => match[1])
      .filter((name): name is string => typeof name === "string");

    expect(procedureNames.length).toBeGreaterThan(0);
    expect(procedureNames).toEqual(
      expect.arrayContaining([
        "getRuntimeStepExecutionDetail",
        "activateFirstWorkflowStepExecution",
        "saveFormStepDraft",
        "submitFormStep",
        "saveBranchStepSelection",
        "startActionStepExecution",
        "runActionStepActions",
        "retryActionStepActions",
        "skipActionStepActions",
        "skipActionStepActionItems",
        "completeActionStepExecution",
        "startInvokeWorkflowTarget",
        "startInvokeWorkUnitTarget",
      ]),
    );

    expect(source).toContain("StepExecutionDetailService");
    expect(source).toContain("WorkflowExecutionStepCommandService");
    expect(source).toContain("ActionStepRuntimeService");
    expect(source).toContain("InvokeWorkflowExecutionService");
    expect(source).toContain("InvokeWorkUnitExecutionService");
    expect(source).not.toContain("retrySameStepExecution");
  });
});
