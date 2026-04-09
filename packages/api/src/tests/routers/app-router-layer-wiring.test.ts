import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { Context, Effect, Layer } from "effect";

import { createMethodologyRouter } from "../../routers/methodology";
import { createProjectRouter } from "../../routers/project";
import {
  MethodologyRepository,
  MethodologyEngineL1Live,
  MethodologyVersionBoundaryService,
  WorkUnitStateMachineService,
  WorkUnitStateMachineServiceLive,
  WorkflowService,
  WorkflowServiceLive,
  EligibilityService,
  EligibilityServiceLive,
  type MethodologyDefinitionRow,
  LifecycleRepository,
} from "@chiron/methodology-engine";
import {
  ProjectContextRepository,
  ProjectContextService,
  ProjectContextServiceLive,
  type ProjectRow,
} from "@chiron/project-context";

const PUBLIC_CTX = { context: { session: null } };

function makeMethodologyRepoLayer() {
  const methodologyRows: readonly MethodologyDefinitionRow[] = [
    {
      id: "methodology-1",
      key: "test-method",
      name: "Test Method",
      descriptionJson: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      archivedAt: null,
    },
  ];

  return Layer.succeed(MethodologyRepository, {
    listDefinitions: () => Effect.succeed(methodologyRows),
    listVersionsByMethodologyId: () => Effect.succeed([]),
    getWorkflowEditorDefinition: () =>
      Effect.succeed({
        workflow: {
          workflowDefinitionId: "wf-1",
          key: "wu.story.setup",
          displayName: "Setup",
          descriptionJson: { markdown: "Setup" },
        },
        steps: [],
        edges: [],
        contextFacts: [],
        formDefinitions: [],
      }),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>);
}

function makeLifecycleRepoLayer() {
  return Layer.succeed(LifecycleRepository, {
    getLifecycleDefinition: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);
}

function makeProjectContextRepoLayer() {
  const projectRows: readonly ProjectRow[] = [
    {
      id: "project-1",
      name: "Project 1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ];

  return Layer.succeed(ProjectContextRepository, {
    listProjects: () => Effect.succeed(projectRows),
  } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);
}

describe("app router layer wiring regression", () => {
  it("wires listMethodologies and listProjects without missing WorkflowService", async () => {
    const allRepos = Layer.mergeAll(
      makeMethodologyRepoLayer(),
      makeLifecycleRepoLayer(),
      makeProjectContextRepoLayer(),
    );

    const methodologyCoreLayer = Layer.provide(MethodologyEngineL1Live, allRepos);

    const methodologyServiceLayer = Layer.mergeAll(
      methodologyCoreLayer,
      Layer.provide(WorkflowServiceLive, allRepos),
      Layer.provide(WorkUnitStateMachineServiceLive, allRepos),
      Layer.provide(Layer.effect(EligibilityService, EligibilityServiceLive), allRepos),
      Layer.provide(ProjectContextServiceLive, allRepos),
    ) as Layer.Layer<
      | MethodologyVersionBoundaryService
      | WorkflowService
      | WorkUnitStateMachineService
      | EligibilityService
      | ProjectContextService
    >;

    const methodologyRouter = createMethodologyRouter(methodologyServiceLayer);
    const projectRouter = createProjectRouter(methodologyServiceLayer);

    const methodologies = await call(methodologyRouter.listMethodologies, {}, PUBLIC_CTX);
    const projects = await call(projectRouter.listProjects, {}, PUBLIC_CTX);

    expect(Array.isArray(methodologies)).toBe(true);
    expect(Array.isArray(projects)).toBe(true);
  });

  it("keeps repository access available for workflow editor reads", async () => {
    const allRepos = Layer.mergeAll(
      makeMethodologyRepoLayer(),
      makeLifecycleRepoLayer(),
      makeProjectContextRepoLayer(),
    );

    const methodologyCoreLayer = Layer.provide(MethodologyEngineL1Live, allRepos);

    const methodologyServiceLayer = Layer.mergeAll(
      allRepos,
      methodologyCoreLayer,
      Layer.provide(WorkflowServiceLive, allRepos),
      Layer.provide(WorkUnitStateMachineServiceLive, allRepos),
      Layer.provide(Layer.effect(EligibilityService, EligibilityServiceLive), allRepos),
      Layer.provide(ProjectContextServiceLive, allRepos),
    ) as Layer.Layer<any>;

    const methodologyRouter = createMethodologyRouter(methodologyServiceLayer);

    const editor = await call(
      methodologyRouter.version.workUnit.workflow.getEditorDefinition,
      {
        methodologyId: "methodology-1",
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
      },
      PUBLIC_CTX,
    );

    expect(editor.workflow.workflowDefinitionId).toBe("wf-1");
  });
});
