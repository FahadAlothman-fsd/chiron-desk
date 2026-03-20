import type {
  CreateWorkUnitWorkflowInput,
  DeleteWorkUnitWorkflowInput,
  UpdateWorkUnitWorkflowInput,
} from "@chiron/contracts/methodology/workflow";
import type { WorkflowDefinition } from "@chiron/contracts/methodology/version";
import { Context, Effect } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import type { UpdateDraftResult } from "../version-service";

export class WorkflowService extends Context.Tag("WorkflowService")<
  WorkflowService,
  {
    readonly listWorkUnitWorkflows: (input: {
      readonly versionId: string;
      readonly workUnitTypeKey: string;
    }) => Effect.Effect<readonly WorkflowDefinition[], RepositoryError>;
    readonly createWorkUnitWorkflow: (
      input: CreateWorkUnitWorkflowInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly updateWorkUnitWorkflow: (
      input: UpdateWorkUnitWorkflowInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteWorkUnitWorkflow: (
      input: DeleteWorkUnitWorkflowInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
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
