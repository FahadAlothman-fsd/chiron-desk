import type {
  CreateMethodologyWorkUnitInput,
  UpdateMethodologyWorkUnitInput,
} from "@chiron/contracts/methodology/lifecycle";
import { Context, Effect } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import type { UpdateDraftLifecycleResult } from "./methodology-version-service";
import type { UpdateDraftResult } from "../version-service";

export class WorkUnitService extends Context.Tag("WorkUnitService")<
  WorkUnitService,
  {
    readonly createMetadata: (
      input: CreateMethodologyWorkUnitInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly updateMetadata: (
      input: UpdateMethodologyWorkUnitInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly deleteWorkUnit: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
      },
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
  }
>() {}
