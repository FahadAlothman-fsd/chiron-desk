import type { GetOverviewRuntimeSummaryOutput } from "@chiron/contracts/runtime/overview";
import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";

export interface GetRuntimeActiveWorkflowsInput {
  readonly projectId: string;
}

export interface RuntimeActiveWorkflowRow {
  readonly workflowExecutionId: string;
  readonly workflowId: string;
  readonly workflowKey: string;
  readonly workflowName: string;
  readonly workUnit: {
    readonly projectWorkUnitId: string;
    readonly workUnitTypeId: string;
    readonly workUnitTypeKey: string;
    readonly workUnitLabel: string;
  };
  readonly transition: {
    readonly transitionExecutionId: string;
    readonly transitionId: string;
    readonly transitionKey: string;
    readonly transitionName: string;
  };
  readonly startedAt: string;
  readonly target: {
    readonly page: "workflow-execution-detail";
    readonly workflowExecutionId: string;
  };
}

export class RuntimeWorkflowIndexService extends Context.Tag("RuntimeWorkflowIndexService")<
  RuntimeWorkflowIndexService,
  {
    readonly getActiveWorkflows: (
      input: GetRuntimeActiveWorkflowsInput,
    ) => Effect.Effect<readonly RuntimeActiveWorkflowRow[], RepositoryError>;
  }
>() {}

const buildWorkUnitLabel = (workUnitTypeId: string, projectWorkUnitId: string): string =>
  `${workUnitTypeId}:${projectWorkUnitId.slice(0, 8)}`;

type RuntimeOverviewActiveWorkflow = GetOverviewRuntimeSummaryOutput["activeWorkflows"][number];

export const RuntimeWorkflowIndexServiceLive = Layer.effect(
  RuntimeWorkflowIndexService,
  Effect.gen(function* () {
    const executionReadRepository = yield* ExecutionReadRepository;
    const projectWorkUnitRepository = yield* ProjectWorkUnitRepository;

    const getActiveWorkflows = (
      input: GetRuntimeActiveWorkflowsInput,
    ): Effect.Effect<readonly RuntimeActiveWorkflowRow[], RepositoryError> =>
      Effect.gen(function* () {
        const [activeWorkflowRows, projectWorkUnits] = yield* Effect.all([
          executionReadRepository.listActiveWorkflowExecutionsByProject(input.projectId),
          projectWorkUnitRepository.listProjectWorkUnitsByProject(input.projectId),
        ]);

        const workUnitById = new Map(
          projectWorkUnits.map((workUnit) => [workUnit.id, workUnit] as const),
        );

        const rows: RuntimeOverviewActiveWorkflow[] = activeWorkflowRows.map((row) => {
          const workUnit = workUnitById.get(row.projectWorkUnitId);
          const workUnitTypeId = workUnit?.workUnitTypeId ?? "unknown-work-unit-type";

          return {
            workflowExecutionId: row.workflowExecution.id,
            workflowId: row.workflowExecution.workflowId,
            workflowKey: row.workflowExecution.workflowId,
            workflowName: row.workflowExecution.workflowId,
            workUnit: {
              projectWorkUnitId: row.projectWorkUnitId,
              workUnitTypeId,
              workUnitTypeKey: workUnitTypeId,
              workUnitLabel: buildWorkUnitLabel(workUnitTypeId, row.projectWorkUnitId),
            },
            transition: {
              transitionExecutionId: row.transitionExecution.id,
              transitionId: row.transitionExecution.transitionId,
              transitionKey: row.transitionExecution.transitionId,
              transitionName: row.transitionExecution.transitionId,
            },
            startedAt: row.workflowExecution.startedAt.toISOString(),
            target: {
              page: "workflow-execution-detail",
              workflowExecutionId: row.workflowExecution.id,
            },
          };
        });

        return rows;
      });

    return RuntimeWorkflowIndexService.of({ getActiveWorkflows });
  }),
);
