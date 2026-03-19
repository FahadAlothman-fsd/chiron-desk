import { Context, Effect } from "effect";

export class WorkflowService extends Context.Tag("WorkflowService")<
  WorkflowService,
  {
    readonly updateWorkflowDefinition: (
      input: {
        readonly versionId: string;
        readonly workUnitKey: string;
        readonly workflowKey: string;
        readonly definition: unknown;
      },
      actorId: string | null,
    ) => Effect.Effect<void, never>;
  }
>() {}
