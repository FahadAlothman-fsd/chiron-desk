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
  InvokeExecutionRepository,
  ProjectFactRepository,
  ProjectWorkUnitRepository,
  StepExecutionRepository,
  TransitionExecutionRepository,
  WorkflowExecutionRepository,
  WorkUnitFactRepository,
  WorkflowEngineRuntimeLive,
  WorkflowEngineRuntimeStepServicesLive,
} from "@chiron/workflow-engine";
import {
  ProjectContextRepository,
  ProjectContextService,
  ProjectContextServiceLive,
} from "@chiron/project-context";
import { OpencodeHarnessServiceLive } from "../../../agent-runtime/src/index";

export function createAppRouter(
  repoLayer: Layer.Layer<MethodologyRepository>,
  lifecycleRepoLayer: Layer.Layer<LifecycleRepository>,
  projectContextRepoLayer: Layer.Layer<ProjectContextRepository>,
  runtimeRepoLayer: Layer.Layer<
    | ProjectWorkUnitRepository
    | ExecutionReadRepository
    | InvokeExecutionRepository
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
    allRepos,
    methodologyCoreLayer,
    Layer.provide(WorkflowServiceLive, allRepos),
    Layer.provide(WorkUnitStateMachineServiceLive, allRepos),
    Layer.provide(Layer.effect(EligibilityService, EligibilityServiceLive), allRepos),
    Layer.provide(ProjectContextServiceLive, allRepos),
    OpencodeHarnessServiceLive,
  ) as Layer.Layer<
    | MethodologyVersionBoundaryService
    | WorkflowService
    | WorkUnitStateMachineService
    | EligibilityService
    | ProjectContextService
  >;
  const runtimeServiceLayer = Layer.provide(
    Layer.mergeAll(WorkflowEngineRuntimeLive, WorkflowEngineRuntimeStepServicesLive),
    Layer.mergeAll(
      runtimeRepoLayer,
      repoLayer,
      lifecycleRepoLayer,
      projectContextRepoLayer,
      OpencodeHarnessServiceLive,
    ),
  ) as Layer.Layer<any>;
  const runtimeQueryServiceLayer = Layer.provide(
    WorkflowEngineRuntimeLive,
    Layer.mergeAll(
      runtimeRepoLayer,
      repoLayer,
      lifecycleRepoLayer,
      projectContextRepoLayer,
      OpencodeHarnessServiceLive,
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
    project: createProjectRouter(
      methodologyServiceLayer,
      projectServiceLayer,
      runtimeQueryServiceLayer,
    ),
  };
}
export type AppRouter = ReturnType<typeof createAppRouter>;
export type AppRouterClient = RouterClient<AppRouter>;
