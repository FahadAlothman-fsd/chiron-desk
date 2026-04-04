import { Layer } from "effect";
import { LifecycleRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import { RuntimeArtifactServiceLive } from "../services/runtime-artifact-service";
import { RuntimeFactServiceLive } from "../services/runtime-fact-service";
import { RuntimeGateServiceLive } from "../services/runtime-gate-service";
import { RuntimeGuidanceServiceLive } from "../services/runtime-guidance-service";
import { RuntimeOverviewServiceLive } from "../services/runtime-overview-service";
import { RuntimeWorkflowIndexServiceLive } from "../services/runtime-workflow-index-service";
import { RuntimeWorkUnitServiceLive } from "../services/runtime-work-unit-service";
import { FormStepExecutionServiceLive } from "../services/form-step-execution-service";
import { StepContextMutationServiceLive } from "../services/step-context-mutation-service";
import { StepContextQueryServiceLive } from "../services/step-context-query-service";
import { StepExecutionDetailServiceLive } from "../services/step-execution-detail-service";
import { StepExecutionLifecycleServiceLive } from "../services/step-execution-lifecycle-service";
import { StepExecutionTransactionServiceLive } from "../services/step-execution-transaction-service";
import { StepProgressionServiceLive } from "../services/step-progression-service";
import { TransitionExecutionCommandServiceLive } from "../services/transition-execution-command-service";
import { TransitionExecutionDetailServiceLive } from "../services/transition-execution-detail-service";
import { WorkflowExecutionCommandServiceLive } from "../services/workflow-execution-command-service";
import { WorkflowExecutionDetailServiceLive } from "../services/workflow-execution-detail-service";
import { WorkflowExecutionStepCommandServiceLive } from "../services/workflow-execution-step-command-service";

const WorkflowEngineRuntimeBaseLayer = Layer.mergeAll(
  Layer.service(ProjectContextRepository),
  Layer.service(LifecycleRepository),
  RuntimeGateServiceLive,
  RuntimeWorkflowIndexServiceLive,
  RuntimeFactServiceLive,
  RuntimeArtifactServiceLive,
);

const WorkflowEngineRuntimeGuidanceBaseLayer = Layer.mergeAll(WorkflowEngineRuntimeBaseLayer);

const WorkflowEngineRuntimeDependentLayer = Layer.mergeAll(
  RuntimeOverviewServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  RuntimeGuidanceServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeGuidanceBaseLayer)),
  RuntimeWorkUnitServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  TransitionExecutionCommandServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  TransitionExecutionDetailServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  WorkflowExecutionCommandServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  WorkflowExecutionDetailServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
);

const WorkflowEngineRuntimeStepCoreLayer = Layer.mergeAll(
  StepProgressionServiceLive,
  StepContextQueryServiceLive,
  StepContextMutationServiceLive,
);

const WorkflowEngineRuntimeStepLifecycleLayer = StepExecutionLifecycleServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeStepCoreLayer),
);

const WorkflowEngineRuntimeStepTransactionLayer = StepExecutionTransactionServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeStepCoreLayer),
  Layer.provideMerge(WorkflowEngineRuntimeStepLifecycleLayer),
);

const WorkflowEngineRuntimeStepFormLayer = FormStepExecutionServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeStepTransactionLayer),
);

const WorkflowEngineRuntimeStepCommandLayer = WorkflowExecutionStepCommandServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeStepCoreLayer),
  Layer.provideMerge(WorkflowEngineRuntimeStepLifecycleLayer),
  Layer.provideMerge(WorkflowEngineRuntimeStepFormLayer),
);

const WorkflowEngineRuntimeStepDetailLayer = StepExecutionDetailServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeStepCoreLayer),
);

export const WorkflowEngineRuntimeStepServicesLive = Layer.mergeAll(
  WorkflowEngineRuntimeStepCoreLayer,
  WorkflowEngineRuntimeStepLifecycleLayer,
  WorkflowEngineRuntimeStepTransactionLayer,
  WorkflowEngineRuntimeStepFormLayer,
  WorkflowEngineRuntimeStepCommandLayer,
  WorkflowEngineRuntimeStepDetailLayer,
);

export const WorkflowEngineRuntimeServicesLive = Layer.mergeAll(
  WorkflowEngineRuntimeBaseLayer,
  WorkflowEngineRuntimeDependentLayer,
);

export const WorkflowEngineRuntimeLive = WorkflowEngineRuntimeServicesLive;
