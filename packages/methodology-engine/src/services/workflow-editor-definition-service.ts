import type {
  FormStepPayload,
  WorkflowContextFactDto,
  WorkflowEditorRouteIdentity,
  WorkflowEdgeDto,
  WorkflowStepReadModel,
} from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import { RepositoryError, ValidationDecodeError } from "../errors";
import { MethodologyRepository } from "../repository";

type WorkflowEditorRepository = {
  readonly getWorkflowEditorDefinition?: (input: {
    readonly versionId: string;
    readonly workUnitTypeKey: string;
    readonly workflowDefinitionId: string;
  }) => Effect.Effect<
    {
      readonly workflow: {
        readonly workflowDefinitionId: string;
        readonly key: string;
        readonly displayName: string | null;
        readonly descriptionJson: unknown;
      };
      readonly steps: readonly WorkflowStepReadModel[];
      readonly edges: readonly WorkflowEdgeDto[];
      readonly contextFacts: readonly WorkflowContextFactDto[];
      readonly formDefinitions: readonly {
        readonly stepId: string;
        readonly payload: FormStepPayload;
      }[];
    },
    RepositoryError
  >;
};

const missingCapability = (operation: string) =>
  new RepositoryError({
    operation,
    cause: new Error("Workflow editor repository capability is not configured"),
  });

export class WorkflowEditorDefinitionService extends Context.Tag("WorkflowEditorDefinitionService")<
  WorkflowEditorDefinitionService,
  {
    readonly getEditorDefinition: (input: WorkflowEditorRouteIdentity) => Effect.Effect<
      {
        readonly workflow: {
          readonly workflowDefinitionId: string;
          readonly key: string;
          readonly displayName: string | null;
          readonly descriptionJson: unknown;
        };
        readonly steps: readonly WorkflowStepReadModel[];
        readonly edges: readonly WorkflowEdgeDto[];
        readonly contextFacts: readonly WorkflowContextFactDto[];
        readonly formDefinitions: readonly {
          readonly stepId: string;
          readonly payload: FormStepPayload;
        }[];
      },
      ValidationDecodeError | RepositoryError
    >;
  }
>() {}

export const WorkflowEditorDefinitionServiceLive = Layer.effect(
  WorkflowEditorDefinitionService,
  Effect.gen(function* () {
    const repo = (yield* MethodologyRepository) as MethodologyRepository["Type"] &
      WorkflowEditorRepository;

    const getEditorDefinition = (input: WorkflowEditorRouteIdentity) =>
      Effect.gen(function* () {
        if (!repo.getWorkflowEditorDefinition) {
          return yield* Effect.fail(missingCapability("workflowEditor.getEditorDefinition"));
        }

        return yield* repo.getWorkflowEditorDefinition({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflowDefinitionId: input.workflowDefinitionId,
        });
      });

    return WorkflowEditorDefinitionService.of({
      getEditorDefinition,
    });
  }),
);
