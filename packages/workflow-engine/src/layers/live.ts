import { Layer } from "effect";
import { HarnessService } from "@chiron/agent-runtime";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { SandboxGitServiceLive } from "@chiron/sandbox-engine";

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
import { AgentStepContextReadServiceLive } from "../services/runtime/agent-step-context-read-service";
import { AgentStepContextWriteServiceLive } from "../services/runtime/agent-step-context-write-service";
import { AgentStepEventStreamServiceLive } from "../services/runtime/agent-step-event-stream-service";
import { AgentStepExecutionDetailServiceLive } from "../services/runtime/agent-step-execution-detail-service";
import { AgentStepMcpServiceLive } from "../services/runtime/agent-step-mcp-service";
import { AgentStepSessionCommandServiceLive } from "../services/runtime/agent-step-session-command-service";
import { AgentStepSnapshotServiceLive } from "../services/runtime/agent-step-snapshot-service";
import { AgentStepTimelineServiceLive } from "../services/runtime/agent-step-timeline-service";

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

const WorkflowEngineRuntimeAgentStepBaseLayer = Layer.mergeAll(
  Layer.service(HarnessService),
  Layer.service(ProjectContextRepository),
  Layer.service(LifecycleRepository),
  Layer.service(MethodologyRepository),
  SandboxGitServiceLive,
  WorkflowEngineRuntimeStepCoreLayer,
  WorkflowEngineRuntimeStepLifecycleLayer,
  WorkflowEngineRuntimeStepTransactionLayer,
  WorkflowEngineRuntimeStepDetailLayer,
);

const WorkflowEngineRuntimeAgentStepTimelineLayer = AgentStepTimelineServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeAgentStepBaseLayer),
);

const WorkflowEngineRuntimeAgentStepDetailLayer = AgentStepExecutionDetailServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeAgentStepBaseLayer),
  Layer.provideMerge(WorkflowEngineRuntimeAgentStepTimelineLayer),
);

const WorkflowEngineRuntimeAgentStepSessionLayer = AgentStepSessionCommandServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeAgentStepBaseLayer),
);

const WorkflowEngineRuntimeAgentStepEventStreamLayer = AgentStepEventStreamServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeAgentStepBaseLayer),
);

const WorkflowEngineRuntimeAgentStepSnapshotLayer = AgentStepSnapshotServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeAgentStepBaseLayer),
);

const WorkflowEngineRuntimeAgentStepContextReadLayer = AgentStepContextReadServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeAgentStepBaseLayer),
);

const WorkflowEngineRuntimeAgentStepContextWriteLayer = AgentStepContextWriteServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeAgentStepBaseLayer),
);

const WorkflowEngineRuntimeAgentStepMcpLayer = AgentStepMcpServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeAgentStepSnapshotLayer),
  Layer.provideMerge(WorkflowEngineRuntimeAgentStepContextReadLayer),
  Layer.provideMerge(WorkflowEngineRuntimeAgentStepContextWriteLayer),
);

export const WorkflowEngineRuntimeStepServicesLive = Layer.mergeAll(
  WorkflowEngineRuntimeStepCoreLayer,
  WorkflowEngineRuntimeStepLifecycleLayer,
  WorkflowEngineRuntimeStepTransactionLayer,
  WorkflowEngineRuntimeStepFormLayer,
  WorkflowEngineRuntimeStepCommandLayer,
  WorkflowEngineRuntimeStepDetailLayer,
  WorkflowEngineRuntimeAgentStepTimelineLayer,
  WorkflowEngineRuntimeAgentStepDetailLayer,
  WorkflowEngineRuntimeAgentStepSessionLayer,
  WorkflowEngineRuntimeAgentStepEventStreamLayer,
  WorkflowEngineRuntimeAgentStepSnapshotLayer,
  WorkflowEngineRuntimeAgentStepContextReadLayer,
  WorkflowEngineRuntimeAgentStepContextWriteLayer,
  WorkflowEngineRuntimeAgentStepMcpLayer,
);

export const WorkflowEngineRuntimeServicesLive = Layer.mergeAll(
  WorkflowEngineRuntimeBaseLayer,
  WorkflowEngineRuntimeDependentLayer,
);

export const WorkflowEngineRuntimeLive = WorkflowEngineRuntimeServicesLive;
