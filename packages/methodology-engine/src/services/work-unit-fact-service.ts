import { AgentTypeDefinition } from "@chiron/contracts/methodology/agent";
import type {
  GetWorkUnitFactsInput,
  ReplaceWorkUnitFactsInput,
} from "@chiron/contracts/methodology/fact";
import { WorkUnitTypeDefinition } from "@chiron/contracts/methodology/lifecycle";
import { Context, Effect, Layer, Schema } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { MethodologyVersionService } from "./methodology-version-service";
import type { UpdateDraftLifecycleResult } from "./methodology-version-service";

function decodeWorkUnitTypes(
  value: unknown,
): Effect.Effect<readonly WorkUnitTypeDefinition[], ValidationDecodeError> {
  return Schema.decodeUnknown(Schema.Array(WorkUnitTypeDefinition))(value).pipe(
    Effect.mapError((error) => new ValidationDecodeError({ message: String(error) })),
  );
}

function decodeAgentTypes(
  value: unknown,
): Effect.Effect<readonly (typeof AgentTypeDefinition.Type)[], ValidationDecodeError> {
  return Schema.decodeUnknown(Schema.Array(AgentTypeDefinition))(value).pipe(
    Effect.mapError((error) => new ValidationDecodeError({ message: String(error) })),
  );
}

export class WorkUnitFactService extends Context.Tag("WorkUnitFactService")<
  WorkUnitFactService,
  {
    readonly listByWorkUnitType: (
      input: GetWorkUnitFactsInput,
    ) => Effect.Effect<
      (typeof WorkUnitTypeDefinition.Type)["factSchemas"],
      VersionNotFoundError | ValidationDecodeError | RepositoryError
    >;
    readonly replaceForWorkUnitType: (
      input: ReplaceWorkUnitFactsInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
  }
>() {}

export const WorkUnitFactServiceLive = Layer.effect(
  WorkUnitFactService,
  Effect.gen(function* () {
    const versionService = yield* MethodologyVersionService;

    const listByWorkUnitType = (input: GetWorkUnitFactsInput) =>
      Effect.gen(function* () {
        const projection = yield* versionService.getDraftProjection(input.versionId);
        const workUnitTypes = yield* decodeWorkUnitTypes(projection.workUnitTypes);
        const workUnit = workUnitTypes.find((item) => item.key === input.workUnitTypeKey);
        return workUnit ? workUnit.factSchemas : [];
      });

    const replaceForWorkUnitType = (input: ReplaceWorkUnitFactsInput, actorId: string | null) =>
      Effect.gen(function* () {
        const projection = yield* versionService.getDraftProjection(input.versionId);
        const workUnitTypes = yield* decodeWorkUnitTypes(projection.workUnitTypes);
        const agentTypes = yield* decodeAgentTypes(projection.agentTypes);

        const nextWorkUnitTypes = workUnitTypes.map((workUnit) =>
          workUnit.key === input.workUnitTypeKey
            ? { ...workUnit, factSchemas: input.facts }
            : workUnit,
        );

        const found = nextWorkUnitTypes.some((workUnit) => workUnit.key === input.workUnitTypeKey);
        if (!found) {
          return yield* Effect.fail(
            new RepositoryError({
              operation: "workUnitFact.replaceForWorkUnitType",
              cause: new Error(`work unit type '${input.workUnitTypeKey}' not found`),
            }),
          );
        }

        return yield* versionService.updateDraftLifecycle(
          {
            versionId: input.versionId,
            workUnitTypes: nextWorkUnitTypes,
            agentTypes,
          },
          actorId,
        );
      });

    return WorkUnitFactService.of({
      listByWorkUnitType,
      replaceForWorkUnitType,
    });
  }),
);
