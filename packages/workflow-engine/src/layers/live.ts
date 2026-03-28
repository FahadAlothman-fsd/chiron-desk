import { Layer } from "effect";

import { RuntimeArtifactServiceLive } from "../services/runtime-artifact-service";
import { RuntimeFactServiceLive } from "../services/runtime-fact-service";
import { RuntimeGateServiceLive } from "../services/runtime-gate-service";
import { RuntimeGuidanceServiceLive } from "../services/runtime-guidance-service";
import { RuntimeOverviewServiceLive } from "../services/runtime-overview-service";
import { RuntimeWorkflowIndexServiceLive } from "../services/runtime-workflow-index-service";
import { RuntimeWorkUnitServiceLive } from "../services/runtime-work-unit-service";
import { TransitionExecutionCommandServiceLive } from "../services/transition-execution-command-service";
import { TransitionExecutionDetailServiceLive } from "../services/transition-execution-detail-service";
import { WorkflowExecutionCommandServiceLive } from "../services/workflow-execution-command-service";
import { WorkflowExecutionDetailServiceLive } from "../services/workflow-execution-detail-service";

const WorkflowEngineRuntimeBaseLayer = Layer.mergeAll(
  RuntimeGateServiceLive,
  RuntimeWorkflowIndexServiceLive,
  RuntimeFactServiceLive,
  RuntimeArtifactServiceLive,
);

const WorkflowEngineRuntimeDependentLayer = Layer.mergeAll(
  RuntimeOverviewServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  RuntimeGuidanceServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  RuntimeWorkUnitServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  TransitionExecutionCommandServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  TransitionExecutionDetailServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  WorkflowExecutionCommandServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  WorkflowExecutionDetailServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
);

export const WorkflowEngineRuntimeServicesLive = Layer.mergeAll(
  WorkflowEngineRuntimeBaseLayer,
  WorkflowEngineRuntimeDependentLayer,
);

export const WorkflowEngineRuntimeLive = WorkflowEngineRuntimeServicesLive;
