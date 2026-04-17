import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Context, Effect, Layer } from "effect";

import {
  MethodologyRepository,
  type WorkflowActionStepDefinitionReadModel,
  RepositoryError,
} from "@chiron/methodology-engine";

import { createMethodologyRepoLayer } from "../methodology-repository";

type DB = LibSQLDatabase<Record<string, unknown>>;

export interface CreateActionStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly afterStepKey: string | null;
  readonly payload: WorkflowActionStepDefinitionReadModel["payload"];
}

export interface UpdateActionStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
  readonly payload: WorkflowActionStepDefinitionReadModel["payload"];
}

export interface DeleteActionStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

export interface GetActionStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

export class ActionStepDefinitionRepository extends Context.Tag(
  "@chiron/db/repositories/ActionStepDefinitionRepository",
)<
  ActionStepDefinitionRepository,
  {
    readonly createActionStepDefinition: (
      params: CreateActionStepDefinitionParams,
    ) => Effect.Effect<WorkflowActionStepDefinitionReadModel, RepositoryError>;
    readonly updateActionStepDefinition: (
      params: UpdateActionStepDefinitionParams,
    ) => Effect.Effect<WorkflowActionStepDefinitionReadModel, RepositoryError>;
    readonly deleteActionStepDefinition: (
      params: DeleteActionStepDefinitionParams,
    ) => Effect.Effect<void, RepositoryError>;
    readonly getActionStepDefinition: (
      params: GetActionStepDefinitionParams,
    ) => Effect.Effect<WorkflowActionStepDefinitionReadModel | null, RepositoryError>;
  }
>() {}

export function createActionStepDefinitionRepoLayer(
  db: DB,
): Layer.Layer<ActionStepDefinitionRepository> {
  return Layer.effect(
    ActionStepDefinitionRepository,
    Effect.gen(function* () {
      const repo = yield* MethodologyRepository;

      return ActionStepDefinitionRepository.of({
        createActionStepDefinition: (params) => repo.createActionStepDefinition(params),
        updateActionStepDefinition: (params) => repo.updateActionStepDefinition(params),
        deleteActionStepDefinition: (params) => repo.deleteActionStepDefinition(params),
        getActionStepDefinition: (params) => repo.getActionStepDefinition(params),
      });
    }),
  ).pipe(Layer.provide(createMethodologyRepoLayer(db)));
}
