import { Context, type Effect } from "effect";
import type { RepositoryError } from "../errors";

export interface CreateProjectFactInstanceParams {
  projectId: string;
  factDefinitionId: string;
  valueJson: unknown;
  producedByTransitionExecutionId?: string | null;
  producedByWorkflowExecutionId?: string | null;
  authoredByUserId?: string | null;
}

export interface SupersedeProjectFactInstanceParams {
  projectFactInstanceId: string;
  supersededByProjectFactInstanceId: string;
}

export interface UpdateProjectFactInstanceParams {
  projectFactInstanceId: string;
  valueJson: unknown;
  producedByTransitionExecutionId?: string | null;
  producedByWorkflowExecutionId?: string | null;
  authoredByUserId?: string | null;
}

export interface DeleteProjectFactInstanceParams {
  projectFactInstanceId: string;
  producedByTransitionExecutionId?: string | null;
  producedByWorkflowExecutionId?: string | null;
  authoredByUserId?: string | null;
}

export interface ProjectFactInstanceRow {
  id: string;
  projectId: string;
  factDefinitionId: string;
  valueJson: unknown;
  status: "active" | "superseded" | "parent_superseded" | "deleted";
  supersededByFactInstanceId: string | null;
  producedByTransitionExecutionId: string | null;
  producedByWorkflowExecutionId: string | null;
  authoredByUserId: string | null;
  createdAt: Date;
}

export class ProjectFactRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/ProjectFactRepository",
)<
  ProjectFactRepository,
  {
    readonly createFactInstance: (
      params: CreateProjectFactInstanceParams,
    ) => Effect.Effect<ProjectFactInstanceRow, RepositoryError>;
    readonly getCurrentValuesByDefinition: (params: {
      projectId: string;
      factDefinitionId: string;
    }) => Effect.Effect<readonly ProjectFactInstanceRow[], RepositoryError>;
    readonly listFactsByProject: (params: {
      projectId: string;
    }) => Effect.Effect<readonly ProjectFactInstanceRow[], RepositoryError>;
    readonly supersedeFactInstance: (
      params: SupersedeProjectFactInstanceParams,
    ) => Effect.Effect<void, RepositoryError>;
    readonly updateFactInstance?: (
      params: UpdateProjectFactInstanceParams,
    ) => Effect.Effect<ProjectFactInstanceRow | null, RepositoryError>;
    readonly logicallyDeleteFactInstance?: (
      params: DeleteProjectFactInstanceParams,
    ) => Effect.Effect<ProjectFactInstanceRow | null, RepositoryError>;
  }
>() {}
