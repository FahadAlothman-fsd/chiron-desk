import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../");

const readRepoFile = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("runtime query-key separation", () => {
  it("uses runtime-prefixed query keys for locked runtime route surfaces", () => {
    const overviewRoute = readRepoFile("apps/web/src/routes/projects.$projectId.index.tsx");
    const guidanceRoute = readRepoFile("apps/web/src/routes/projects.$projectId.transitions.tsx");
    const workUnitsRoute = readRepoFile("apps/web/src/routes/projects.$projectId.work-units.tsx");
    const activeWorkflowsRoute = readRepoFile(
      "apps/web/src/routes/projects.$projectId.workflows.tsx",
    );
    const transitionDetailRoute = readRepoFile(
      "apps/web/src/routes/projects.$projectId.transition-executions.$transitionExecutionId.tsx",
    );
    const workflowDetailRoute = readRepoFile(
      "apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx",
    );

    expect(overviewRoute).toContain('["runtime-overview", projectId]');
    expect(guidanceRoute).toContain('["runtime-guidance-active", projectId]');
    expect(workUnitsRoute).toContain('["runtime-work-units", projectId, hasActiveTransition]');
    expect(activeWorkflowsRoute).toContain('["runtime-active-workflows", projectId]');
    expect(transitionDetailRoute).toContain(
      '["runtime-transition-execution-detail", projectId, transitionExecutionId]',
    );
    expect(workflowDetailRoute).toContain(
      '["runtime-workflow-execution-detail", projectId, workflowExecutionId]',
    );
  });

  it("prevents preview/non-runtime cache-key collisions for runtime pages", () => {
    const overviewRoute = readRepoFile("apps/web/src/routes/projects.$projectId.index.tsx");
    const guidanceRoute = readRepoFile("apps/web/src/routes/projects.$projectId.transitions.tsx");
    const workUnitsRoute = readRepoFile("apps/web/src/routes/projects.$projectId.work-units.tsx");
    const activeWorkflowsRoute = readRepoFile(
      "apps/web/src/routes/projects.$projectId.workflows.tsx",
    );
    const transitionDetailRoute = readRepoFile(
      "apps/web/src/routes/projects.$projectId.transition-executions.$transitionExecutionId.tsx",
    );
    const workflowDetailRoute = readRepoFile(
      "apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx",
    );

    expect(overviewRoute).not.toContain('["overview", projectId]');
    expect(guidanceRoute).not.toContain('["guidance-active", projectId]');
    expect(workUnitsRoute).not.toContain('["work-units", projectId, hasActiveTransition]');
    expect(activeWorkflowsRoute).not.toContain('["active-workflows", projectId]');
    expect(transitionDetailRoute).not.toContain(
      '["transition-execution-detail", projectId, transitionExecutionId]',
    );
    expect(workflowDetailRoute).not.toContain(
      '["workflow-execution-detail", projectId, workflowExecutionId]',
    );
  });

  it("keeps runtime keys isolated from preview-prefixed namespaces", () => {
    const runtimeRouteSources = [
      readRepoFile("apps/web/src/routes/projects.$projectId.index.tsx"),
      readRepoFile("apps/web/src/routes/projects.$projectId.transitions.tsx"),
      readRepoFile("apps/web/src/routes/projects.$projectId.work-units.tsx"),
      readRepoFile("apps/web/src/routes/projects.$projectId.workflows.tsx"),
      readRepoFile(
        "apps/web/src/routes/projects.$projectId.transition-executions.$transitionExecutionId.tsx",
      ),
      readRepoFile(
        "apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx",
      ),
    ];

    for (const source of runtimeRouteSources) {
      expect(source).not.toContain('["preview-');
      expect(source).not.toContain("preview-");
    }
  });
});
