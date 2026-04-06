import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Context, Effect, Layer } from "effect";

import { MethodologyRepository, RepositoryError } from "@chiron/methodology-engine";
import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";

import { createMethodologyRepoLayer } from "../methodology-repository";

type DB = LibSQLDatabase<Record<string, unknown>>;

export class WorkflowContextFactRepository extends Context.Tag(
  "@chiron/db/repositories/WorkflowContextFactRepository",
)<
  WorkflowContextFactRepository,
  {
    readonly listWorkflowContextFactsByDefinitionId: (input: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
    }) => Effect.Effect<readonly WorkflowContextFactDto[], RepositoryError>;
    readonly createWorkflowContextFactByDefinitionId: (input: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
      readonly fact: WorkflowContextFactDto;
    }) => Effect.Effect<WorkflowContextFactDto, RepositoryError>;
    readonly updateWorkflowContextFactByDefinitionId: (input: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
      readonly contextFactDefinitionId: string;
      readonly fact: WorkflowContextFactDto;
    }) => Effect.Effect<WorkflowContextFactDto, RepositoryError>;
    readonly deleteWorkflowContextFactByDefinitionId: (input: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
      readonly contextFactDefinitionId: string;
    }) => Effect.Effect<void, RepositoryError>;
  }
>() {}

export function createWorkflowContextFactRepoLayer(
  db: DB,
): Layer.Layer<WorkflowContextFactRepository> {
  return Layer.effect(
    WorkflowContextFactRepository,
    Effect.gen(function* () {
      const repo = yield* MethodologyRepository;

      return WorkflowContextFactRepository.of({
        listWorkflowContextFactsByDefinitionId: (input) =>
          repo.listWorkflowContextFactsByDefinitionId(input),
        createWorkflowContextFactByDefinitionId: (input) =>
          repo.createWorkflowContextFactByDefinitionId(input),
        updateWorkflowContextFactByDefinitionId: (input) =>
          repo.updateWorkflowContextFactByDefinitionId(input),
        deleteWorkflowContextFactByDefinitionId: (input) =>
          repo.deleteWorkflowContextFactByDefinitionId(input),
      });
    }),
  ).pipe(Layer.provide(createMethodologyRepoLayer(db)));
}
