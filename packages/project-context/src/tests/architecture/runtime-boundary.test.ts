import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../");

const readRepoFile = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("project-context runtime boundary governance", () => {
  it("keeps runtime-history read access narrow via hasExecutionHistoryForRepin port", () => {
    const repositorySource = readRepoFile("packages/project-context/src/repository.ts");
    const serviceSource = readRepoFile("packages/project-context/src/service.ts");

    expect(repositorySource).toContain("hasExecutionHistoryForRepin");
    expect(serviceSource).toContain("projectRepo.hasExecutionHistoryForRepin(input.projectId)");
    expect(serviceSource).toContain("PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY");
  });

  it("locks repin history predicate to both legacy and runtime execution storage", () => {
    const dbRepositorySource = readRepoFile("packages/db/src/project-context-repository.ts");

    expect(dbRepositorySource).toContain("projectExecutions");
    expect(dbRepositorySource).toContain("transitionExecutions");
    expect(dbRepositorySource).toContain("workflowExecutions");
    expect(dbRepositorySource).toContain("projectFactInstances");
    expect(dbRepositorySource).toContain("workUnitFactInstances");
    expect(dbRepositorySource).toContain("projectArtifactSnapshots");
    expect(dbRepositorySource).toContain("hasExecutionHistoryForRepin");
  });

  it("forbids runtime writes from project-context package", () => {
    const repositorySource = readRepoFile("packages/project-context/src/repository.ts");
    const serviceSource = readRepoFile("packages/project-context/src/service.ts");

    const forbiddenRuntimeWrites = [
      "startTransitionExecution",
      "switchActiveTransitionExecution",
      "completeTransitionExecution",
      "choosePrimaryWorkflowForTransitionExecution",
      "retrySameWorkflowExecution",
      "addRuntimeProjectFactValue",
      "setRuntimeProjectFactValue",
      "replaceRuntimeProjectFactValue",
      "addRuntimeWorkUnitFactValue",
      "setRuntimeWorkUnitFactValue",
      "replaceRuntimeWorkUnitFactValue",
    ] as const;

    for (const symbol of forbiddenRuntimeWrites) {
      expect(repositorySource).not.toContain(symbol);
      expect(serviceSource).not.toContain(symbol);
    }

    expect(repositorySource).not.toContain("@chiron/workflow-engine");
    expect(serviceSource).not.toContain("@chiron/workflow-engine");
  });
});
