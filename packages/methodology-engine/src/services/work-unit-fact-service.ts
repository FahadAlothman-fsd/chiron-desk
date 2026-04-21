import type {
  GetWorkUnitFactsInput,
  ReplaceWorkUnitFactsInput,
} from "@chiron/contracts/methodology/fact";
import { WorkUnitTypeDefinition } from "@chiron/contracts/methodology/lifecycle";
import { Context, Effect, Layer } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { MethodologyVersionService } from "./methodology-version-service";
import type { UpdateDraftResult } from "../version-service";

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
      UpdateDraftResult,
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
        const snapshot = yield* versionService.getAuthoringSnapshot(input.versionId);
        const workUnitTypes = snapshot.workUnitTypes;
        const workUnit = workUnitTypes.find((item) => item.key === input.workUnitTypeKey);
        return workUnit ? workUnit.factSchemas : [];
      });

    const replaceForWorkUnitType = (input: ReplaceWorkUnitFactsInput, actorId: string | null) =>
      Effect.gen(function* () {
        const snapshot = yield* versionService.getAuthoringSnapshot(input.versionId);
        const found = snapshot.workUnitTypes.some(
          (workUnit) => workUnit.key === input.workUnitTypeKey,
        );
        if (!found) {
          return yield* new RepositoryError({
            operation: "workUnitFact.replaceForWorkUnitType",
            cause: new Error(`work unit type '${input.workUnitTypeKey}' not found`),
          });
        }

        return yield* versionService.replaceWorkUnitFacts(
          {
            versionId: input.versionId,
            workUnitTypeKey: input.workUnitTypeKey,
            facts: input.facts,
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
