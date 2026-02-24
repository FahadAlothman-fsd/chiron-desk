import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { createMethodologyRouter } from "./methodology";
import { Layer } from "effect";
import {
  MethodologyVersionService,
  MethodologyVersionServiceLive,
  MethodologyRepository,
  LifecycleService,
  LifecycleServiceLive,
  EligibilityService,
  EligibilityServiceLive,
  LifecycleRepository,
} from "@chiron/methodology-engine";

export function createAppRouter(
  repoLayer: Layer.Layer<MethodologyRepository>,
  lifecycleRepoLayer: Layer.Layer<LifecycleRepository>,
) {
  const allRepos = Layer.mergeAll(repoLayer, lifecycleRepoLayer);
  const methodologyServiceLayer = Layer.mergeAll(
    Layer.provide(Layer.effect(MethodologyVersionService, MethodologyVersionServiceLive), allRepos),
    Layer.provide(Layer.effect(LifecycleService, LifecycleServiceLive), allRepos),
    Layer.provide(Layer.effect(EligibilityService, EligibilityServiceLive), allRepos),
  );
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
  };
}
export type AppRouter = ReturnType<typeof createAppRouter>;
export type AppRouterClient = RouterClient<AppRouter>;
