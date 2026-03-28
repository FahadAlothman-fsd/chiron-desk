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

    expect(handlerCount).toBeGreaterThan(0);
    expect(serviceResolutionCount).toBeGreaterThan(0);
    expect(serviceResolutionCount).toBeLessThanOrEqual(handlerCount);
    expect(source).not.toContain("yield* TransitionExecutionRepository");
    expect(source).not.toContain("yield* WorkflowExecutionRepository");
    expect(source).not.toContain("runtime-repositories");
    expect(source).not.toContain('from "../../../db/src/runtime-repositories');
    expect(source).not.toContain('from "../../../workflow-engine/src/repositories');
    expect(source).toContain("runEffect(");
  });

  it("locks runtime router to workflow-engine services and forbids repository imports", () => {
    const source = readRepoFile("packages/api/src/routers/project-runtime.ts");

    expect(source).toContain("../../../workflow-engine/src/index");
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

  it("forbids step-level procedures in runtime router", () => {
    const source = readRepoFile("packages/api/src/routers/project-runtime.ts");

    const procedureNames = [
      ...source.matchAll(/\n\s{4}([A-Za-z0-9_]+):\s+(?:publicProcedure|protectedProcedure)/g),
    ]
      .map((match) => match[1])
      .filter((name): name is string => typeof name === "string");

    expect(procedureNames.length).toBeGreaterThan(0);
    expect(procedureNames.every((name) => !/step/i.test(name))).toBe(true);

    expect(source).not.toContain("getRuntimeStepExecutionDetail");
    expect(source).not.toContain("streamRuntimeStepExecutions");
    expect(source).not.toContain("retrySameStepExecution");
  });
});
