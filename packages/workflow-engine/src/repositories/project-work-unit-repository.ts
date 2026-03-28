import { Context, type Effect } from "effect";
import type { RepositoryError } from "../errors";

export interface ProjectWorkUnitRow {
  id: string;
  projectId: string;
  workUnitTypeId: string;
  currentStateId: string;
  activeTransitionExecutionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectWorkUnitParams {
  projectId: string;
  workUnitTypeId: string;
  currentStateId: string;
}

export interface UpdateActiveTransitionExecutionPointerParams {
  projectWorkUnitId: string;
  activeTransitionExecutionId: string | null;
}

export class ProjectWorkUnitRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/ProjectWorkUnitRepository",
)<
  ProjectWorkUnitRepository,
  {
    readonly createProjectWorkUnit: (
      params: CreateProjectWorkUnitParams,
    ) => Effect.Effect<ProjectWorkUnitRow, RepositoryError>;
    readonly listProjectWorkUnitsByProject: (
      projectId: string,
    ) => Effect.Effect<readonly ProjectWorkUnitRow[], RepositoryError>;
    readonly getProjectWorkUnitById: (
      projectWorkUnitId: string,
    ) => Effect.Effect<ProjectWorkUnitRow | null, RepositoryError>;
    readonly updateActiveTransitionExecutionPointer: (
      params: UpdateActiveTransitionExecutionPointerParams,
    ) => Effect.Effect<ProjectWorkUnitRow | null, RepositoryError>;
  }
>() {}
