import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { createMethodologyRouter } from "./methodology";
import { Layer } from "effect";
import {
  MethodologyVersionService,
  MethodologyVersionServiceLive,
  MethodologyRepository,
} from "@chiron/methodology-engine";

export function createAppRouter(repoLayer: Layer.Layer<MethodologyRepository>) {
  const methodologyServiceLayer = Layer.provide(
    Layer.effect(MethodologyVersionService, MethodologyVersionServiceLive),
    repoLayer,
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
