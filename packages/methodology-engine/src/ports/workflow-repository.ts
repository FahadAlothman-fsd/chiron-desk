import { Context, type Effect } from "effect";
import type { WorkflowSnapshot } from "../repository";
import type { RepositoryError } from "../errors";

export class WorkflowRepository extends Context.Tag(
  "@chiron/methodology-engine/ports/WorkflowRepository",
)<
  WorkflowRepository,
  {
    readonly getSnapshot: (versionId: string) => Effect.Effect<WorkflowSnapshot, RepositoryError>;
    readonly saveSnapshot: (
      versionId: string,
      snapshot: WorkflowSnapshot,
    ) => Effect.Effect<void, RepositoryError>;
  }
>() {}
