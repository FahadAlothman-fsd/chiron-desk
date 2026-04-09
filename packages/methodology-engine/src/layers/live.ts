import { Layer } from "effect";

import { MethodologyVersionServiceLive } from "../services/methodology-version-service";
import { MethodologyValidationServiceLive } from "../services/methodology-validation-service";
import { PublishedMethodologyServiceLive } from "../services/published-methodology-service";
import { WorkflowEditorDefinitionServiceLive } from "../services/workflow-editor-definition-service";
import { WorkflowServiceLive } from "../services/workflow-service";
import { WorkflowTopologyMutationServiceLive } from "../services/workflow-topology-mutation-service";
import { FormStepDefinitionServiceLive } from "../services/form-step-definition-service";
import { WorkflowContextFactDefinitionServiceLive } from "../services/workflow-context-fact-definition-service";
import { WorkflowAuthoringTransactionServiceLive } from "../services/workflow-authoring-transaction-service";
import { AgentStepDefinitionServiceLive } from "../services/agent-step-definition-service";

export const MethodologyEngineL1CoreServicesLive = Layer.mergeAll(
  MethodologyVersionServiceLive,
  MethodologyValidationServiceLive,
  PublishedMethodologyServiceLive,
  WorkflowEditorDefinitionServiceLive,
  WorkflowServiceLive,
  WorkflowTopologyMutationServiceLive,
  FormStepDefinitionServiceLive,
  WorkflowContextFactDefinitionServiceLive,
);

const WorkflowAuthoringTransactionServiceDependenciesLive = Layer.mergeAll(
  MethodologyEngineL1CoreServicesLive,
  AgentStepDefinitionServiceLive,
);

const WorkflowAuthoringTransactionServiceWiredLive = Layer.provide(
  WorkflowAuthoringTransactionServiceLive,
  WorkflowAuthoringTransactionServiceDependenciesLive,
);

export const MethodologyWorkflowAuthoringServicesLive = Layer.mergeAll(
  MethodologyEngineL1CoreServicesLive,
  WorkflowAuthoringTransactionServiceWiredLive,
);

export const MethodologyEngineL1ServicesLive = MethodologyEngineL1CoreServicesLive;

export const MethodologyEngineL1Live = MethodologyEngineL1ServicesLive;
