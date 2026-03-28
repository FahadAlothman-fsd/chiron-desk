import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../");

const readRepoFile = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

const listFiles = (relativeDir: string, extensions: readonly string[]): string[] => {
  const root = resolve(repoRoot, relativeDir);

  const walk = (current: string): string[] => {
    const entries = readdirSync(current, { withFileTypes: true });

    return entries.flatMap((entry) => {
      const absolutePath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        return walk(absolutePath);
      }

      if (extensions.some((extension) => entry.name.endsWith(extension))) {
        return [absolutePath];
      }

      return [];
    });
  };

  return walk(root);
};

const relativeFromRoot = (absolutePath: string) => absolutePath.replace(`${repoRoot}/`, "");

describe("runtime boundary lock: workflow-engine ownership", () => {
  it("keeps all runtime service seams exported from workflow-engine index", () => {
    const indexSource = readRepoFile("packages/workflow-engine/src/index.ts");

    expect(indexSource).toContain('export * from "./services/runtime-gate-service"');
    expect(indexSource).toContain('export * from "./services/runtime-guidance-service"');
    expect(indexSource).toContain('export * from "./services/runtime-overview-service"');
    expect(indexSource).toContain('export * from "./services/runtime-work-unit-service"');
    expect(indexSource).toContain('export * from "./services/runtime-workflow-index-service"');
    expect(indexSource).toContain('export * from "./services/runtime-fact-service"');
    expect(indexSource).toContain('export * from "./services/runtime-artifact-service"');
    expect(indexSource).toContain('export * from "./services/transition-execution-detail-service"');
    expect(indexSource).toContain(
      'export * from "./services/transition-execution-command-service"',
    );
    expect(indexSource).toContain('export * from "./services/workflow-execution-detail-service"');
    expect(indexSource).toContain('export * from "./services/workflow-execution-command-service"');
  });

  it("prevents runtime service class leakage into non-workflow-engine packages", () => {
    const runtimeServiceSymbols = [
      "RuntimeGateService",
      "RuntimeGuidanceService",
      "RuntimeOverviewService",
      "RuntimeWorkUnitService",
      "RuntimeWorkflowIndexService",
      "RuntimeFactService",
      "RuntimeArtifactService",
      "TransitionExecutionDetailService",
      "TransitionExecutionCommandService",
      "WorkflowExecutionDetailService",
      "WorkflowExecutionCommandService",
    ] as const;

    const packageFiles = listFiles("packages", [".ts", ".tsx"]);

    for (const symbol of runtimeServiceSymbols) {
      const declarationMatches = packageFiles
        .map((absolutePath) => {
          const source = readFileSync(absolutePath, "utf8");
          const declaresClass = source.includes(`class ${symbol} extends Context.Tag`);
          return declaresClass ? relativeFromRoot(absolutePath) : null;
        })
        .filter((value): value is string => value !== null);

      expect(declarationMatches).toHaveLength(1);
      expect(declarationMatches[0]).toMatch(/^packages\/workflow-engine\/src\/services\//);
    }
  });

  it("locks L1/L2 runtime surface without step_executions table or step-level seams", () => {
    const runtimeSchema = readRepoFile("packages/db/src/schema/runtime.ts");
    const runtimeMigration = readRepoFile("packages/db/src/migrations/0001_runtime_l1_l2.sql");
    const runtimeRouter = readRepoFile("packages/api/src/routers/project-runtime.ts");
    const runtimeContracts = readRepoFile("packages/contracts/src/runtime/executions.ts");

    expect(runtimeSchema).not.toContain("step_executions");
    expect(runtimeMigration).not.toContain("step_executions");

    expect(runtimeRouter).not.toContain("getRuntimeStepExecutionDetail");
    expect(runtimeRouter).not.toContain("retrySameStepExecution");
    expect(runtimeRouter).not.toContain("streamRuntimeStepExecutions");

    expect(runtimeContracts).toContain("RuntimeExcludedL3Entity");
    expect(runtimeContracts).toContain('Schema.Literal("step_executions")');
  });
});
