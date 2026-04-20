import { Layer } from "effect";
import { HarnessService } from "@chiron/agent-runtime";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { SandboxGitServiceLive } from "@chiron/sandbox-engine";

import { RuntimeArtifactServiceLive } from "../services/runtime-artifact-service";
import { RuntimeFactServiceLive } from "../services/runtime-fact-service";
import { RuntimeManualFactCrudServiceLive } from "../services/runtime-manual-fact-crud-service";
import { RuntimeGateServiceLive } from "../services/runtime-gate-service";
import { RuntimeGuidanceServiceLive } from "../services/runtime-guidance-service";
import { RuntimeOverviewServiceLive } from "../services/runtime-overview-service";
import { RuntimeWorkflowIndexServiceLive } from "../services/runtime-workflow-index-service";
import { RuntimeWorkUnitServiceLive } from "../services/runtime-work-unit-service";
import { ActionStepDetailServiceLive } from "../services/action-step-detail-service";
import { ActionStepRuntimeServiceLive } from "../services/action-step-runtime-service";
import { FormStepExecutionServiceLive } from "../services/form-step-execution-service";
import { InvokeWorkflowExecutionServiceLive } from "../services/invoke-workflow-execution-service";
import { InvokeWorkUnitExecutionServiceLive } from "../services/invoke-work-unit-execution-service";
import { InvokeCompletionServiceLive } from "../services/invoke-completion-service";
import { InvokePropagationServiceLive } from "../services/invoke-propagation-service";
import { InvokeStepDetailServiceLive } from "../services/invoke-step-detail-service";
import { InvokeTargetResolutionServiceLive } from "../services/invoke-target-resolution-service";
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
import { WorkflowContextExternalPrefillServiceLive } from "../services/workflow-context-external-prefill-service";
import { WorkflowExecutionStepCommandServiceLive } from "../services/workflow-execution-step-command-service";
import { AgentStepContextReadServiceLive } from "../services/runtime/agent-step-context-read-service";
import { ArtifactSlotReferenceServiceLive } from "../services/runtime/artifact-slot-reference-service";
import { AgentStepContextWriteServiceLive } from "../services/runtime/agent-step-context-write-service";
import { ActionStepEventStreamServiceLive } from "../services/runtime/action-step-event-stream-service";
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
  RuntimeManualFactCrudServiceLive,
  RuntimeArtifactServiceLive,
);

const WorkflowEngineRuntimeGuidanceBaseLayer = Layer.mergeAll(WorkflowEngineRuntimeBaseLayer);

const WorkflowEngineRuntimeStepCoreLayer = Layer.mergeAll(
  StepProgressionServiceLive,
  StepContextQueryServiceLive,
  StepContextMutationServiceLive,
);

const WorkflowEngineRuntimeWorkflowExecutionDependenciesLayer = Layer.mergeAll(
  WorkflowEngineRuntimeBaseLayer,
  WorkflowEngineRuntimeStepCoreLayer,
);

const WorkflowEngineRuntimeExternalPrefillLayer = WorkflowContextExternalPrefillServiceLive.pipe(
  Layer.provide(WorkflowEngineRuntimeBaseLayer),
);

const WorkflowEngineRuntimeDependentLayer = Layer.mergeAll(
  RuntimeOverviewServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  RuntimeGuidanceServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeGuidanceBaseLayer)),
  RuntimeWorkUnitServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  WorkflowEngineRuntimeExternalPrefillLayer,
  TransitionExecutionCommandServiceLive.pipe(
    Layer.provideMerge(WorkflowEngineRuntimeExternalPrefillLayer),
    Layer.provide(WorkflowEngineRuntimeBaseLayer),
  ),
  TransitionExecutionDetailServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  Layer.provide(
    WorkflowExecutionCommandServiceLive,
    WorkflowEngineRuntimeWorkflowExecutionDependenciesLayer,
  ),
  Layer.provide(
    WorkflowExecutionDetailServiceLive,
    WorkflowEngineRuntimeWorkflowExecutionDependenciesLayer,
  ),
);

const WorkflowEngineRuntimeInvokeCompletionLayer = InvokeCompletionServiceLive;

const WorkflowEngineRuntimeInvokePropagationLayer = InvokePropagationServiceLive.pipe(
  Layer.provideMerge(WorkflowEngineRuntimeStepCoreLayer),
);

const WorkflowEngineRuntimeStepLifecycleLayer = Layer.provide(
  StepExecutionLifecycleServiceLive,
  WorkflowEngineRuntimeStepCoreLayer,
);

const WorkflowEngineRuntimeActionStepLayer = Layer.provide(
  ActionStepRuntimeServiceLive,
  WorkflowEngineRuntimeStepCoreLayer,
);

const WorkflowEngineRuntimeStepTransactionLayer = Layer.provide(
  StepExecutionTransactionServiceLive,
  Layer.mergeAll(
    WorkflowEngineRuntimeStepCoreLayer,
    WorkflowEngineRuntimeStepLifecycleLayer,
    WorkflowEngineRuntimeActionStepLayer,
    WorkflowEngineRuntimeInvokeCompletionLayer,
    WorkflowEngineRuntimeInvokePropagationLayer,
  ),
);

const WorkflowEngineRuntimeStepFormLayer = Layer.provide(
  FormStepExecutionServiceLive,
  WorkflowEngineRuntimeStepTransactionLayer,
);

const WorkflowEngineRuntimeStepCommandLayer = Layer.provide(
  WorkflowExecutionStepCommandServiceLive,
  Layer.mergeAll(
    WorkflowEngineRuntimeStepCoreLayer,
    WorkflowEngineRuntimeStepLifecycleLayer,
    WorkflowEngineRuntimeStepTransactionLayer,
    WorkflowEngineRuntimeStepFormLayer,
    WorkflowEngineRuntimeInvokeCompletionLayer,
    InvokeTargetResolutionServiceLive,
  ),
);

const WorkflowEngineRuntimeInvokeStepDetailLayer = Layer.provide(
  InvokeStepDetailServiceLive,
  WorkflowEngineRuntimeInvokeCompletionLayer,
);

const WorkflowEngineRuntimeActionStepDetailLayer = Layer.provide(
  ActionStepDetailServiceLive,
  Layer.mergeAll(
    WorkflowEngineRuntimeActionStepLayer,
    Layer.service(ProjectContextRepository),
    Layer.service(LifecycleRepository),
    Layer.service(MethodologyRepository),
  ),
);

const WorkflowEngineRuntimeStepDetailLayer = Layer.provide(
  StepExecutionDetailServiceLive,
  Layer.mergeAll(
    WorkflowEngineRuntimeStepCoreLayer,
    WorkflowEngineRuntimeActionStepDetailLayer,
    WorkflowEngineRuntimeInvokeStepDetailLayer,
  ),
);

const WorkflowEngineRuntimeAgentStepBaseLayer = Layer.mergeAll(
  Layer.service(HarnessService),
  Layer.service(ProjectContextRepository),
  Layer.service(LifecycleRepository),
  Layer.service(MethodologyRepository),
  SandboxGitServiceLive,
  ArtifactSlotReferenceServiceLive.pipe(Layer.provideMerge(SandboxGitServiceLive)),
  WorkflowEngineRuntimeStepCoreLayer,
  WorkflowEngineRuntimeStepLifecycleLayer,
  WorkflowEngineRuntimeStepTransactionLayer,
  WorkflowEngineRuntimeStepDetailLayer,
);

const WorkflowEngineRuntimeAgentStepTimelineLayer = Layer.provide(
  AgentStepTimelineServiceLive,
  WorkflowEngineRuntimeAgentStepBaseLayer,
);

const WorkflowEngineRuntimeAgentStepDetailLayer = Layer.provide(
  AgentStepExecutionDetailServiceLive,
  Layer.mergeAll(
    WorkflowEngineRuntimeAgentStepBaseLayer,
    WorkflowEngineRuntimeAgentStepTimelineLayer,
  ),
);

const WorkflowEngineRuntimeAgentStepSessionLayer = Layer.provide(
  AgentStepSessionCommandServiceLive,
  WorkflowEngineRuntimeAgentStepBaseLayer,
);

const WorkflowEngineRuntimeAgentStepEventStreamLayer = Layer.provide(
  AgentStepEventStreamServiceLive,
  WorkflowEngineRuntimeAgentStepBaseLayer,
);

const WorkflowEngineRuntimeActionStepEventStreamLayer = Layer.provide(
  ActionStepEventStreamServiceLive,
  WorkflowEngineRuntimeStepDetailLayer,
);

const WorkflowEngineRuntimeAgentStepSnapshotLayer = Layer.provide(
  AgentStepSnapshotServiceLive,
  WorkflowEngineRuntimeAgentStepBaseLayer,
);

const WorkflowEngineRuntimeAgentStepContextReadLayer = Layer.provide(
  AgentStepContextReadServiceLive,
  Layer.mergeAll(
    WorkflowEngineRuntimeAgentStepBaseLayer,
    RuntimeWorkUnitServiceLive.pipe(Layer.provide(WorkflowEngineRuntimeBaseLayer)),
  ),
);

const WorkflowEngineRuntimeAgentStepContextWriteLayer = Layer.provide(
  AgentStepContextWriteServiceLive,
  WorkflowEngineRuntimeAgentStepBaseLayer,
);

const WorkflowEngineRuntimeAgentStepMcpLayer = Layer.provide(
  AgentStepMcpServiceLive,
  Layer.mergeAll(
    WorkflowEngineRuntimeAgentStepSnapshotLayer,
    WorkflowEngineRuntimeAgentStepContextReadLayer,
    WorkflowEngineRuntimeAgentStepContextWriteLayer,
  ),
);

export const WorkflowEngineRuntimeStepServicesLive = Layer.mergeAll(
  WorkflowEngineRuntimeStepCoreLayer,
  WorkflowEngineRuntimeStepLifecycleLayer,
  WorkflowEngineRuntimeActionStepLayer,
  WorkflowEngineRuntimeStepTransactionLayer,
  WorkflowEngineRuntimeStepFormLayer,
  WorkflowEngineRuntimeInvokeCompletionLayer,
  WorkflowEngineRuntimeInvokePropagationLayer,
  WorkflowEngineRuntimeActionStepDetailLayer,
  WorkflowEngineRuntimeInvokeStepDetailLayer,
  WorkflowEngineRuntimeExternalPrefillLayer,
  InvokeTargetResolutionServiceLive,
  WorkflowEngineRuntimeStepCommandLayer,
  WorkflowEngineRuntimeStepDetailLayer,
  InvokeWorkflowExecutionServiceLive,
  InvokeWorkUnitExecutionServiceLive.pipe(
    Layer.provideMerge(WorkflowEngineRuntimeExternalPrefillLayer),
  ),
  WorkflowEngineRuntimeAgentStepTimelineLayer,
  WorkflowEngineRuntimeAgentStepDetailLayer,
  WorkflowEngineRuntimeAgentStepSessionLayer,
  WorkflowEngineRuntimeAgentStepEventStreamLayer,
  WorkflowEngineRuntimeActionStepEventStreamLayer,
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
