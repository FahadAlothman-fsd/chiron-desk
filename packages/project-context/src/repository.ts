import { Context, Effect } from "effect";
import type { RepositoryError } from "./errors";

export interface PinProjectMethodologyVersionParams {
  projectId: string;
  methodologyVersionId: string;
  actorId: string | null;
  previousVersion: string | null;
  newVersion: string;
}

export interface GetProjectPinLineageParams {
  projectId: string;
}

export interface ProjectMethodologyPinRow {
  projectId: string;
  methodologyVersionId: string;
  methodologyId: string;
  methodologyKey: string;
  publishedVersion: string;
  actorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMethodologyPinEventRow {
  id: string;
  projectId: string;
  eventType: "pinned" | "repinned";
  actorId: string | null;
  previousVersion: string | null;
  newVersion: string;
  evidenceRef: string;
  createdAt: Date;
}

export interface ProjectRow {
  id: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectContextRepository extends Context.Tag("ProjectContextRepository")<
  ProjectContextRepository,
  {
    readonly findProjectPin: (
      projectId: string,
    ) => Effect.Effect<ProjectMethodologyPinRow | null, RepositoryError>;
    readonly hasExecutionHistoryForRepin: (
      projectId: string,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly pinProjectMethodologyVersion: (
      params: PinProjectMethodologyVersionParams,
    ) => Effect.Effect<
      {
        pin: ProjectMethodologyPinRow;
        event: ProjectMethodologyPinEventRow;
      },
      RepositoryError
    >;
    readonly repinProjectMethodologyVersion: (
      params: PinProjectMethodologyVersionParams,
    ) => Effect.Effect<
      {
        pin: ProjectMethodologyPinRow;
        event: ProjectMethodologyPinEventRow;
      },
      RepositoryError
    >;
    readonly getProjectPinLineage: (
      params: GetProjectPinLineageParams,
    ) => Effect.Effect<readonly ProjectMethodologyPinEventRow[], RepositoryError>;
    readonly createProject: (params: {
      projectId: string;
      name?: string;
    }) => Effect.Effect<ProjectRow, RepositoryError>;
    readonly listProjects: () => Effect.Effect<readonly ProjectRow[], RepositoryError>;
    readonly getProjectById: (params: {
      projectId: string;
    }) => Effect.Effect<ProjectRow | null, RepositoryError>;
  }
>() {}
