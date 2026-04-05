import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Context, Effect, Layer } from "effect";

import {
  MethodologyRepository,
  type WorkflowFormDefinitionReadModel,
  RepositoryError,
} from "@chiron/methodology-engine";

import { createMethodologyRepoLayer } from "../methodology-repository";

type DB = LibSQLDatabase<Record<string, unknown>>;

export interface CreateFormStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly afterStepKey: string | null;
  readonly payload: WorkflowFormDefinitionReadModel["payload"];
}

export interface UpdateFormStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
  readonly payload: WorkflowFormDefinitionReadModel["payload"];
}

export interface DeleteFormStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

export class FormStepRepository extends Context.Tag("@chiron/db/repositories/FormStepRepository")<
  FormStepRepository,
  {
    readonly createFormStepDefinition: (
      params: CreateFormStepDefinitionParams,
    ) => Effect.Effect<WorkflowFormDefinitionReadModel, RepositoryError>;
    readonly updateFormStepDefinition: (
      params: UpdateFormStepDefinitionParams,
    ) => Effect.Effect<WorkflowFormDefinitionReadModel, RepositoryError>;
    readonly deleteFormStepDefinition: (
      params: DeleteFormStepDefinitionParams,
    ) => Effect.Effect<void, RepositoryError>;
  }
>() {}

export function createFormStepRepoLayer(db: DB): Layer.Layer<FormStepRepository> {
  return Layer.effect(
    FormStepRepository,
    Effect.gen(function* () {
      const repo = yield* MethodologyRepository;

      return FormStepRepository.of({
        createFormStepDefinition: (params) => repo.createFormStepDefinition(params),
        updateFormStepDefinition: (params) => repo.updateFormStepDefinition(params),
        deleteFormStepDefinition: (params) => repo.deleteFormStepDefinition(params),
      });
    }),
  ).pipe(Layer.provide(createMethodologyRepoLayer(db)));
}
