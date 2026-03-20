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
  ProjectContextRepository,
  ProjectContextService,
  ProjectContextServiceLive,
} from "@chiron/project-context";

export function createAppRouter(
  repoLayer: Layer.Layer<MethodologyRepository>,
  lifecycleRepoLayer: Layer.Layer<LifecycleRepository>,
  projectContextRepoLayer: Layer.Layer<ProjectContextRepository>,
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
    project: createProjectRouter(methodologyServiceLayer),
  };
}
export type AppRouter = ReturnType<typeof createAppRouter>;
export type AppRouterClient = RouterClient<AppRouter>;
