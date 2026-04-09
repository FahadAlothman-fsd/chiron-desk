import type { AgentStepDesignTimePayload } from "@chiron/contracts/agent-step";
import type {
  FormStepPayload,
  WorkflowContextFactDto,
  WorkflowMetadataDialogInput,
} from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import { AgentStepDefinitionService } from "./agent-step-definition-service";
import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { FormStepDefinitionService } from "./form-step-definition-service";
import { WorkflowContextFactDefinitionService } from "./workflow-context-fact-definition-service";
import { WorkflowService } from "./workflow-service";
import { WorkflowTopologyMutationService } from "./workflow-topology-mutation-service";

export class WorkflowAuthoringTransactionService extends Context.Tag(
  "WorkflowAuthoringTransactionService",
)<
  WorkflowAuthoringTransactionService,
  {
    readonly applyMutation: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly metadata?: WorkflowMetadataDialogInput;
        readonly createAgentStep?: {
          readonly afterStepKey: string | null;
          readonly payload: AgentStepDesignTimePayload;
        };
        readonly updateAgentStep?: {
          readonly stepId: string;
          readonly payload: AgentStepDesignTimePayload;
        };
        readonly deleteAgentStepId?: string;
        readonly createFormStep?: {
          readonly afterStepKey: string | null;
          readonly payload: FormStepPayload;
        };
        readonly updateFormStep?: {
          readonly stepId: string;
          readonly payload: FormStepPayload;
        };
        readonly deleteFormStepId?: string;
        readonly createEdge?: {
          readonly fromStepKey: string | null;
          readonly toStepKey: string | null;
          readonly descriptionJson?: { readonly markdown: string };
        };
        readonly updateEdge?: {
          readonly edgeId: string;
          readonly fromStepKey: string | null;
          readonly toStepKey: string | null;
          readonly descriptionJson?: { readonly markdown: string };
        };
        readonly deleteEdgeId?: string;
        readonly createContextFact?: WorkflowContextFactDto;
        readonly updateContextFact?: {
          readonly contextFactDefinitionId: string;
          readonly fact: WorkflowContextFactDto;
        };
        readonly deleteContextFactDefinitionId?: string;
      },
      actorId: string | null,
    ) => Effect.Effect<
      {
        readonly ok: true;
      },
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
  }
>() {}

export const WorkflowAuthoringTransactionServiceLive = Layer.effect(
  WorkflowAuthoringTransactionService,
  Effect.gen(function* () {
    const workflowService = yield* WorkflowService;
    const formSteps = yield* FormStepDefinitionService;
    const agentSteps = yield* AgentStepDefinitionService;
    const topology = yield* WorkflowTopologyMutationService;
    const contextFacts = yield* WorkflowContextFactDefinitionService;

    const applyMutation = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly metadata?: WorkflowMetadataDialogInput;
        readonly createAgentStep?: {
          readonly afterStepKey: string | null;
          readonly payload: AgentStepDesignTimePayload;
        };
        readonly updateAgentStep?: {
          readonly stepId: string;
          readonly payload: AgentStepDesignTimePayload;
        };
        readonly deleteAgentStepId?: string;
        readonly createFormStep?: {
          readonly afterStepKey: string | null;
          readonly payload: FormStepPayload;
        };
        readonly updateFormStep?: {
          readonly stepId: string;
          readonly payload: FormStepPayload;
        };
        readonly deleteFormStepId?: string;
        readonly createEdge?: {
          readonly fromStepKey: string | null;
          readonly toStepKey: string | null;
          readonly descriptionJson?: { readonly markdown: string };
        };
        readonly updateEdge?: {
          readonly edgeId: string;
          readonly fromStepKey: string | null;
          readonly toStepKey: string | null;
          readonly descriptionJson?: { readonly markdown: string };
        };
        readonly deleteEdgeId?: string;
        readonly createContextFact?: WorkflowContextFactDto;
        readonly updateContextFact?: {
          readonly contextFactDefinitionId: string;
          readonly fact: WorkflowContextFactDto;
        };
        readonly deleteContextFactDefinitionId?: string;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        if (input.metadata) {
          yield* workflowService.updateWorkflowMetadata(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              payload: input.metadata,
            },
            actorId,
          );
        }

        if (input.createContextFact) {
          yield* contextFacts.create(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              fact: input.createContextFact,
            },
            actorId,
          );
        }

        if (input.updateContextFact) {
          yield* contextFacts.update(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              contextFactDefinitionId: input.updateContextFact.contextFactDefinitionId,
              fact: input.updateContextFact.fact,
            },
            actorId,
          );
        }

        if (input.createFormStep) {
          yield* formSteps.createFormStep(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              afterStepKey: input.createFormStep.afterStepKey,
              payload: input.createFormStep.payload,
            },
            actorId,
          );
        }

        if (input.createAgentStep) {
          yield* agentSteps.createAgentStep(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              afterStepKey: input.createAgentStep.afterStepKey,
              payload: input.createAgentStep.payload,
            },
            actorId,
          );
        }

        if (input.updateFormStep) {
          yield* formSteps.updateFormStep(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              stepId: input.updateFormStep.stepId,
              payload: input.updateFormStep.payload,
            },
            actorId,
          );
        }

        if (input.updateAgentStep) {
          yield* agentSteps.updateAgentStep(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              stepId: input.updateAgentStep.stepId,
              payload: input.updateAgentStep.payload,
            },
            actorId,
          );
        }

        if (input.createEdge) {
          yield* topology.createEdge(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              fromStepKey: input.createEdge.fromStepKey,
              toStepKey: input.createEdge.toStepKey,
              descriptionJson: input.createEdge.descriptionJson ?? { markdown: "" },
            },
            actorId,
          );
        }

        if (input.deleteFormStepId) {
          yield* formSteps.deleteFormStep(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              stepId: input.deleteFormStepId,
            },
            actorId,
          );
        }

        if (input.deleteAgentStepId) {
          yield* agentSteps.deleteAgentStep(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              stepId: input.deleteAgentStepId,
            },
            actorId,
          );
        }

        if (input.updateEdge) {
          yield* topology.updateEdge(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              edgeId: input.updateEdge.edgeId,
              fromStepKey: input.updateEdge.fromStepKey,
              toStepKey: input.updateEdge.toStepKey,
              descriptionJson: input.updateEdge.descriptionJson ?? { markdown: "" },
            },
            actorId,
          );
        }

        if (input.deleteEdgeId) {
          yield* topology.deleteEdge(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              edgeId: input.deleteEdgeId,
            },
            actorId,
          );
        }

        if (input.deleteContextFactDefinitionId) {
          yield* contextFacts.delete(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              contextFactDefinitionId: input.deleteContextFactDefinitionId,
            },
            actorId,
          );
        }

        return { ok: true } as const;
      });

    return WorkflowAuthoringTransactionService.of({ applyMutation });
  }),
);
