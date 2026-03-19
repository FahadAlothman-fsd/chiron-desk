import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { createMethodologyRouter } from "./methodology";
import { createProjectRouter } from "./project";
import { Layer } from "effect";
import {
  MethodologyVersionService,
  MethodologyVersionServiceLive,
  MethodologyVersionBoundaryService,
  MethodologyVersionBoundaryServiceLive,
  MethodologyRepository,
  LifecycleService,
  LifecycleServiceLive,
  EligibilityService,
  EligibilityServiceLive,
  LifecycleRepository,
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
  const legacyMethodologyServices = Layer.mergeAll(
    Layer.provide(Layer.effect(MethodologyVersionService, MethodologyVersionServiceLive), allRepos),
    Layer.provide(Layer.effect(LifecycleService, LifecycleServiceLive), allRepos),
  );
  const methodologyServiceLayer = Layer.mergeAll(
    legacyMethodologyServices,
    Layer.provide(MethodologyVersionBoundaryServiceLive, legacyMethodologyServices),
    Layer.provide(Layer.effect(EligibilityService, EligibilityServiceLive), allRepos),
    Layer.provide(ProjectContextServiceLive, allRepos),
  ) as Layer.Layer<
    | MethodologyVersionService
    | MethodologyVersionBoundaryService
    | LifecycleService
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
