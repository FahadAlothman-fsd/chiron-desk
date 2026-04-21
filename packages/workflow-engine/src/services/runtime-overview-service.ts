import type {
  GetOverviewRuntimeSummaryInput,
  GetOverviewRuntimeSummaryOutput,
} from "@chiron/contracts/runtime/overview";
import { MethodologyVersionBoundaryService } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import { ProjectFactRepository } from "../repositories/project-fact-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import {
  RuntimeWorkflowIndexService,
  type RuntimeActiveWorkflowRow,
} from "./runtime-workflow-index-service";

export class RuntimeOverviewService extends Context.Tag("RuntimeOverviewService")<
  RuntimeOverviewService,
  {
    readonly getOverviewRuntimeSummary: (
      input: GetOverviewRuntimeSummaryInput,
    ) => Effect.Effect<GetOverviewRuntimeSummaryOutput, RepositoryError>;
  }
>() {}

const toOverviewActiveWorkflow = (
  row: RuntimeActiveWorkflowRow,
): GetOverviewRuntimeSummaryOutput["activeWorkflows"][number] => ({
  workflowExecutionId: row.workflowExecutionId,
  workflowId: row.workflowId,
  workflowKey: row.workflowKey,
  workflowName: row.workflowName,
  workUnit: row.workUnit,
  transition: row.transition,
  startedAt: row.startedAt,
  target: row.target,
});

export const RuntimeOverviewServiceLive = Layer.effect(
  RuntimeOverviewService,
  Effect.gen(function* () {
    const projectFactRepository = yield* ProjectFactRepository;
    const projectWorkUnitRepository = yield* ProjectWorkUnitRepository;
    const runtimeWorkflowIndexService = yield* RuntimeWorkflowIndexService;
    const projectContextRepository = yield* ProjectContextRepository;
    const methodologyVersionService = yield* MethodologyVersionBoundaryService;

    const getOverviewRuntimeSummary = (
      input: GetOverviewRuntimeSummaryInput,
    ): Effect.Effect<GetOverviewRuntimeSummaryOutput, RepositoryError> =>
      Effect.gen(function* () {
        const [projectFacts, projectWorkUnits, activeWorkflows, projectPin] = yield* Effect.all([
          projectFactRepository.listFactsByProject({ projectId: input.projectId }),
          projectWorkUnitRepository.listProjectWorkUnitsByProject(input.projectId),
          runtimeWorkflowIndexService.getActiveWorkflows({ projectId: input.projectId }),
          projectContextRepository.findProjectPin(input.projectId),
        ]);
        const workspaceSnapshot = projectPin
          ? yield* methodologyVersionService
              .getVersionWorkspaceSnapshot(projectPin.methodologyVersionId)
              .pipe(Effect.catchAll(() => Effect.succeed(null)))
          : null;

        const activeTransitionCount = projectWorkUnits.filter(
          (workUnit) => workUnit.activeTransitionExecutionId !== null,
        ).length;
        const factTypeCount = new Set(projectFacts.map((row) => row.factDefinitionId)).size;
        const workUnitTypeCount = new Set(projectWorkUnits.map((row) => row.workUnitTypeId)).size;
        const totalFactDefinitionCount = workspaceSnapshot?.factDefinitions.length ?? factTypeCount;
        const totalWorkUnitTypeCount = workspaceSnapshot?.workUnitTypes.length ?? workUnitTypeCount;

        return {
          stats: {
            factTypesWithInstances: {
              current: factTypeCount,
              total: totalFactDefinitionCount,
              subtitle: `${factTypeCount} of ${totalFactDefinitionCount} fact definitions currently instantiated`,
              target: {
                page: "project-facts",
                filters: { existence: "exists" },
              },
            },
            workUnitTypesWithInstances: {
              current: workUnitTypeCount,
              total: totalWorkUnitTypeCount,
              subtitle: `${workUnitTypeCount} of ${totalWorkUnitTypeCount} work-unit types instantiated`,
              target: {
                page: "work-units",
              },
            },
            activeTransitions: {
              count: activeTransitionCount,
              subtitle: `${activeTransitionCount} transitions currently active`,
              target: {
                page: "runtime-guidance",
                section: "active",
              },
            },
          },
          activeWorkflows: activeWorkflows.map((row) => toOverviewActiveWorkflow(row)),
          goToGuidanceTarget: { page: "runtime-guidance" },
          goToGuidanceHref: `/projects/${input.projectId}/transitions`,
        };
      });

    return RuntimeOverviewService.of({ getOverviewRuntimeSummary });
  }),
);
