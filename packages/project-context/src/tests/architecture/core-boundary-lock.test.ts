import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../");

const readRepoFile = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("CCF.5 thin-core boundary governance", () => {
  it("requires a concrete @chiron/core package bootstrap for Epic 3", () => {
    const corePackageJson = readRepoFile("packages/core/package.json");
    const coreTsconfig = readRepoFile("packages/core/tsconfig.json");
    const coreEntrypoint = readRepoFile("packages/core/src/index.ts");

    expect(corePackageJson).toContain('"name": "@chiron/core"');
    expect(corePackageJson).toContain('"test"');
    expect(coreTsconfig).toContain('"extends"');
    expect(coreEntrypoint).toContain("core boundary");
  });

  it("locks core ownership as orchestration-only with explicit forbidden categories", () => {
    const moduleStructure = readRepoFile("docs/architecture/chiron-module-structure.md");

    expect(moduleStructure).toContain("Thin-Core Boundary Lock");
    expect(moduleStructure).toContain("packages/core");
    expect(moduleStructure).toContain("Allowed responsibilities in `core`");
    expect(moduleStructure).toContain("Forbidden responsibilities in `core`");
    expect(moduleStructure).toContain("DB/filesystem/process adapters");
    expect(moduleStructure).toContain("Hono/oRPC handlers");
    expect(moduleStructure).toContain("React/TanStack UI");
  });

  it("records contracts-centered dependency direction and ownership mapping", () => {
    const modulesReadme = readRepoFile("docs/architecture/modules/README.md");

    expect(modulesReadme).toContain("Package Responsibility Map (CCF.5 Lock)");
    expect(modulesReadme).toContain("@chiron/core");
    expect(modulesReadme).toContain("contracts-centered dependency rule");
    expect(modulesReadme).toContain("boundary-violation-diagnostics");
    expect(modulesReadme).toContain("package-ownership-diagnostics");
  });

  it("locks Epic 3 start gate references to CCF.5 evidence", () => {
    const architecture = readRepoFile("_bmad-output/planning-artifacts/architecture.md");
    const epics = readRepoFile("_bmad-output/planning-artifacts/epics.md");

    expect(architecture).toContain("Epic 3 Prerequisite: CCF.5 Thin-Core Boundary Lock");
    expect(architecture).toContain("epic3-prerequisite-architecture-log");
    expect(epics).toContain("Epic 3 start is blocked until Story CCF.5");
    expect(epics).toContain("core-boundary-decision-log");
    expect(epics).toContain("package-responsibility-map");
  });

  it("publishes boundary compliance checklists for dev-story and code-review", () => {
    const moduleStructure = readRepoFile("docs/architecture/chiron-module-structure.md");

    expect(moduleStructure).toContain("Dev Story Boundary Checklist");
    expect(moduleStructure).toContain("Code Review Boundary Checklist");
    expect(moduleStructure).toContain("transport/runtime/UI leakage into `core`");
    expect(moduleStructure).toContain("adapter/infrastructure implementation inside `core`");
  });
});
