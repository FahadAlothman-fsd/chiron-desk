import type { WorkflowEditorRouteIdentity } from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import { RepositoryError, ValidationDecodeError } from "../errors";
import { MethodologyRepository, type WorkflowEditorDefinitionReadModel } from "../repository";

export class WorkflowEditorDefinitionService extends Context.Tag("WorkflowEditorDefinitionService")<
  WorkflowEditorDefinitionService,
  {
    readonly getEditorDefinition: (
      input: WorkflowEditorRouteIdentity,
    ) => Effect.Effect<WorkflowEditorDefinitionReadModel, ValidationDecodeError | RepositoryError>;
  }
>() {}

export const WorkflowEditorDefinitionServiceLive = Layer.effect(
  WorkflowEditorDefinitionService,
  Effect.gen(function* () {
    const repo = yield* MethodologyRepository;

    const getEditorDefinition = (input: WorkflowEditorRouteIdentity) =>
      Effect.gen(function* () {
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
