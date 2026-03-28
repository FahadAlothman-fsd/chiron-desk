import { Context, type Effect } from "effect";
import type { RepositoryError } from "../errors";

export interface CreateWorkUnitFactInstanceParams {
  projectWorkUnitId: string;
  factDefinitionId: string;
  valueJson?: unknown;
  referencedProjectWorkUnitId?: string | null;
  producedByTransitionExecutionId?: string | null;
  producedByWorkflowExecutionId?: string | null;
  authoredByUserId?: string | null;
}

export interface SupersedeWorkUnitFactInstanceParams {
  workUnitFactInstanceId: string;
  supersededByWorkUnitFactInstanceId: string;
}

export interface WorkUnitFactInstanceRow {
  id: string;
  projectWorkUnitId: string;
  factDefinitionId: string;
  valueJson: unknown;
  referencedProjectWorkUnitId: string | null;
  status: "active" | "superseded" | "parent_superseded";
  supersededByFactInstanceId: string | null;
  producedByTransitionExecutionId: string | null;
  producedByWorkflowExecutionId: string | null;
  authoredByUserId: string | null;
  createdAt: Date;
}

export class WorkUnitFactRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/WorkUnitFactRepository",
)<
  WorkUnitFactRepository,
  {
    readonly createFactInstance: (
      params: CreateWorkUnitFactInstanceParams,
    ) => Effect.Effect<WorkUnitFactInstanceRow, RepositoryError>;
    readonly getCurrentValuesByDefinition: (params: {
      projectWorkUnitId: string;
      factDefinitionId: string;
    }) => Effect.Effect<readonly WorkUnitFactInstanceRow[], RepositoryError>;
    readonly listFactsByWorkUnit: (params: {
      projectWorkUnitId: string;
    }) => Effect.Effect<readonly WorkUnitFactInstanceRow[], RepositoryError>;
    readonly supersedeFactInstance: (
      params: SupersedeWorkUnitFactInstanceParams,
    ) => Effect.Effect<void, RepositoryError>;
  }
>() {}
