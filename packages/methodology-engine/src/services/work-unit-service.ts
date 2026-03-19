import { Context, Effect } from "effect";

export class WorkUnitService extends Context.Tag("WorkUnitService")<
  WorkUnitService,
  {
    readonly updateMetadata: (
      input: {
        readonly versionId: string;
        readonly workUnitKey: string;
        readonly metadata: unknown;
      },
      actorId: string | null,
    ) => Effect.Effect<void, never>;
  }
>() {}
