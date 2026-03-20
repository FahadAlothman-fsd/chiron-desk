import type {
  GetWorkUnitArtifactSlotsInput,
  ReplaceWorkUnitArtifactSlotsInput,
} from "@chiron/contracts/methodology/artifact-slot";
import { Context, Effect, Layer } from "effect";

import { MethodologyVersionService } from "./methodology-version-service";
import { RepositoryError, VersionNotDraftError, VersionNotFoundError } from "../errors";
import type { UpdateDraftResult } from "../version-service";

export class WorkUnitArtifactSlotService extends Context.Tag("WorkUnitArtifactSlotService")<
  WorkUnitArtifactSlotService,
  {
    readonly listByWorkUnitType: (input: GetWorkUnitArtifactSlotsInput) => Effect.Effect<
      readonly {
        key: string;
        displayName: string | null;
        description: unknown;
        guidance: unknown;
        cardinality: "single" | "fileset";
        rules: unknown;
        templates: readonly {
          key: string;
          displayName: string | null;
          description: unknown;
          guidance: unknown;
          content: string | null;
        }[];
      }[],
      RepositoryError
    >;
    readonly replaceForWorkUnitType: (
      input: ReplaceWorkUnitArtifactSlotsInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
  }
>() {}

export const WorkUnitArtifactSlotServiceLive = Layer.effect(
  WorkUnitArtifactSlotService,
  Effect.gen(function* () {
    const versionService = yield* MethodologyVersionService;
    return WorkUnitArtifactSlotService.of({
      listByWorkUnitType: (input) => versionService.getWorkUnitArtifactSlots(input),
      replaceForWorkUnitType: (input, actorId) =>
        versionService.replaceWorkUnitArtifactSlots(input, actorId),
    });
  }),
);
