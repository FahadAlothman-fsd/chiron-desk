import type {
  FormStepPayload,
  WorkflowContextFactDto,
  WorkflowMetadataDialogInput,
} from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

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
          readonly factKey: string;
          readonly fact: WorkflowContextFactDto;
        };
        readonly deleteContextFactKey?: string;
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
    const topology = yield* WorkflowTopologyMutationService;
    const contextFacts = yield* WorkflowContextFactDefinitionService;

    const applyMutation = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly metadata?: WorkflowMetadataDialogInput;
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
          readonly factKey: string;
          readonly fact: WorkflowContextFactDto;
        };
        readonly deleteContextFactKey?: string;
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
              factKey: input.updateContextFact.factKey,
              fact: input.updateContextFact.fact,
            },
            actorId,
          );
        }

        if (input.deleteContextFactKey) {
          yield* contextFacts.delete(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              factKey: input.deleteContextFactKey,
            },
            actorId,
          );
        }

        return { ok: true } as const;
      });

    return WorkflowAuthoringTransactionService.of({ applyMutation });
  }),
);
