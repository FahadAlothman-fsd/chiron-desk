import type {
  CreateMethodologyDependencyDefinitionInput,
  DeleteMethodologyDependencyDefinitionInput,
  UpdateMethodologyDependencyDefinitionInput,
} from "@chiron/contracts/methodology/dependency";
import type {
  CreateMethodologyFactInput,
  DeleteMethodologyFactInput,
  UpdateMethodologyFactInput,
} from "@chiron/contracts/methodology/fact";
import type {
  CreateMethodologyAgentInput,
  DeleteMethodologyAgentInput,
  UpdateMethodologyAgentInput,
} from "@chiron/contracts/methodology/agent";
import type {
  CreateMethodologyWorkUnitInput,
  UpdateMethodologyWorkUnitInput,
} from "@chiron/contracts/methodology/lifecycle";
import { Context, Effect, Layer } from "effect";

import {
  DependencyDefinitionNotFoundError,
  DuplicateDependencyDefinitionError,
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import {
  MethodologyVersionService as LegacyMethodologyVersionService,
  type UpdateDraftResult,
} from "../version-service";
import { LifecycleService, type UpdateDraftLifecycleResult } from "../lifecycle-service";

export class MethodologyVersionService extends Context.Tag("MethodologyVersionServiceL1")<
  MethodologyVersionService,
  {
    readonly createFact: (
      input: CreateMethodologyFactInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      | VersionNotFoundError
      | VersionNotDraftError
      | ValidationDecodeError
      | RepositoryError
      | DuplicateDependencyDefinitionError
      | DependencyDefinitionNotFoundError,
      LegacyMethodologyVersionService
    >;
    readonly updateFact: (
      input: UpdateMethodologyFactInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError,
      LegacyMethodologyVersionService
    >;
    readonly deleteFact: (
      input: DeleteMethodologyFactInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError,
      LegacyMethodologyVersionService
    >;
    readonly createDependencyDefinition: (
      input: CreateMethodologyDependencyDefinitionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      | VersionNotFoundError
      | VersionNotDraftError
      | DuplicateDependencyDefinitionError
      | ValidationDecodeError
      | RepositoryError,
      LegacyMethodologyVersionService
    >;
    readonly updateDependencyDefinition: (
      input: UpdateMethodologyDependencyDefinitionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      | VersionNotFoundError
      | VersionNotDraftError
      | ValidationDecodeError
      | RepositoryError
      | DuplicateDependencyDefinitionError
      | DependencyDefinitionNotFoundError,
      LegacyMethodologyVersionService
    >;
    readonly deleteDependencyDefinition: (
      input: DeleteMethodologyDependencyDefinitionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      | VersionNotFoundError
      | VersionNotDraftError
      | ValidationDecodeError
      | RepositoryError
      | DependencyDefinitionNotFoundError,
      LegacyMethodologyVersionService
    >;
    readonly createAgent: (
      input: CreateMethodologyAgentInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError,
      LifecycleService
    >;
    readonly updateAgent: (
      input: UpdateMethodologyAgentInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError,
      LifecycleService
    >;
    readonly deleteAgent: (
      input: DeleteMethodologyAgentInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError,
      LifecycleService
    >;
    readonly createWorkUnitMetadata: (
      input: CreateMethodologyWorkUnitInput | UpdateMethodologyWorkUnitInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError,
      LifecycleService
    >;
    readonly updateWorkUnitMetadata: (
      input: UpdateMethodologyWorkUnitInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError,
      LifecycleService
    >;
  }
>() {}

export const MethodologyVersionServiceLive = Layer.succeed(MethodologyVersionService, {
  createFact: (input, actorId) =>
    Effect.flatMap(LegacyMethodologyVersionService, (service) =>
      service.createFact(input, actorId),
    ),
  updateFact: (input, actorId) =>
    Effect.flatMap(LegacyMethodologyVersionService, (service) =>
      service.updateFact(input, actorId),
    ),
  deleteFact: (input, actorId) =>
    Effect.flatMap(LegacyMethodologyVersionService, (service) =>
      service.deleteFact(input, actorId),
    ),
  createDependencyDefinition: (input, actorId) =>
    Effect.flatMap(LegacyMethodologyVersionService, (service) =>
      service.createDependencyDefinition(input, actorId),
    ),
  updateDependencyDefinition: (input, actorId) =>
    Effect.flatMap(LegacyMethodologyVersionService, (service) =>
      service.updateDependencyDefinition(input, actorId),
    ),
  deleteDependencyDefinition: (input, actorId) =>
    Effect.flatMap(LegacyMethodologyVersionService, (service) =>
      service.deleteDependencyDefinition(input, actorId),
    ),
  createAgent: (input, actorId) =>
    Effect.flatMap(LifecycleService, (service) => service.createAgent(input, actorId ?? "system")),
  updateAgent: (input, actorId) =>
    Effect.flatMap(LifecycleService, (service) => service.updateAgent(input, actorId ?? "system")),
  deleteAgent: (input, actorId) =>
    Effect.flatMap(LifecycleService, (service) => service.deleteAgent(input, actorId ?? "system")),
  createWorkUnitMetadata: (input, actorId) =>
    Effect.flatMap(LifecycleService, (service) =>
      "workUnitKey" in input
        ? service.updateWorkUnit(input, actorId ?? "system")
        : service.createWorkUnit(input, actorId ?? "system"),
    ),
  updateWorkUnitMetadata: (input, actorId) =>
    Effect.flatMap(LifecycleService, (service) =>
      service.updateWorkUnit(input, actorId ?? "system"),
    ),
});
