import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { createMethodologyRouter } from "./methodology";
import { createProjectRouter } from "./project";
import { Layer } from "effect";
import {
  MethodologyVersionBoundaryService,
  MethodologyEngineL1Live,
  WorkUnitStateMachineService,
  WorkUnitStateMachineServiceLive,
  MethodologyRepository,
  EligibilityService,
  EligibilityServiceLive,
  LifecycleRepository,
  WorkflowService,
  WorkflowServiceLive,
} from "@chiron/methodology-engine";
import {
  ArtifactRepository,
  ExecutionReadRepository,
  ProjectFactRepository,
  ProjectWorkUnitRepository,
  StepExecutionRepository,
  TransitionExecutionRepository,
  WorkflowExecutionRepository,
  WorkUnitFactRepository,
  WorkflowEngineRuntimeLive,
  WorkflowEngineRuntimeStepServicesLive,
} from "../../../workflow-engine/src/index";
import {
  ProjectContextRepository,
  ProjectContextService,
  ProjectContextServiceLive,
} from "@chiron/project-context";

export function createAppRouter(
  repoLayer: Layer.Layer<MethodologyRepository>,
  lifecycleRepoLayer: Layer.Layer<LifecycleRepository>,
  projectContextRepoLayer: Layer.Layer<ProjectContextRepository>,
  runtimeRepoLayer: Layer.Layer<
    | ProjectWorkUnitRepository
    | ExecutionReadRepository
    | TransitionExecutionRepository
    | WorkflowExecutionRepository
    | ProjectFactRepository
    | WorkUnitFactRepository
    | ArtifactRepository
    | StepExecutionRepository
  >,
) {
  const allRepos = Layer.mergeAll(repoLayer, lifecycleRepoLayer, projectContextRepoLayer);
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
  const runtimeServiceLayer = Layer.mergeAll(
    Layer.provide(
      WorkflowEngineRuntimeLive,
      Layer.mergeAll(runtimeRepoLayer, lifecycleRepoLayer, projectContextRepoLayer),
    ),
    Layer.provide(
      WorkflowEngineRuntimeStepServicesLive,
      Layer.mergeAll(runtimeRepoLayer, repoLayer, lifecycleRepoLayer, projectContextRepoLayer),
    ),
  ) as Layer.Layer<any>;
  const projectServiceLayer = Layer.mergeAll(
    methodologyServiceLayer,
    runtimeServiceLayer,
  ) as Layer.Layer<any>;

  return {
    healthCheck: publicProcedure.handler(() => {
      return "OK";
    }),
    privateData: protectedProcedure.handler(({ context }) => {
      return {
        message: "This is private",
        user: context.session?.user,
      };
    }),
    methodology: createMethodologyRouter(methodologyServiceLayer),
    project: createProjectRouter(methodologyServiceLayer, projectServiceLayer),
  };
}
export type AppRouter = ReturnType<typeof createAppRouter>;
export type AppRouterClient = RouterClient<AppRouter>;
