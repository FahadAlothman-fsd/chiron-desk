import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";

import {
  ExecutionReadRepository,
  ProjectFactRepository,
  ProjectWorkUnitRepository,
  RuntimeOverviewService,
  RuntimeOverviewServiceLive,
  RuntimeWorkflowIndexServiceLive,
} from "../../index";

const testLayer = RuntimeOverviewServiceLive.pipe(
  Layer.provideMerge(RuntimeWorkflowIndexServiceLive),
  Layer.provideMerge(
    Layer.succeed(ProjectFactRepository, {
      createFactInstance: () => Effect.die("not implemented in test"),
      getCurrentValuesByDefinition: () => Effect.succeed([]),
      listFactsByProject: () =>
        Effect.succeed([
          {
            id: "pf-1",
            projectId: "project-1",
            factDefinitionId: "fact-a",
            valueJson: "x",
            status: "active" as const,
            supersededByFactInstanceId: null,
            producedByTransitionExecutionId: null,
            producedByWorkflowExecutionId: null,
            authoredByUserId: null,
            createdAt: new Date(),
          },
          {
            id: "pf-2",
            projectId: "project-1",
            factDefinitionId: "fact-b",
            valueJson: "y",
            status: "active" as const,
            supersededByFactInstanceId: null,
            producedByTransitionExecutionId: null,
            producedByWorkflowExecutionId: null,
            authoredByUserId: null,
            createdAt: new Date(),
          },
        ]),
      supersedeFactInstance: () => Effect.void,
    }),
  ),
  Layer.provideMerge(
    Layer.succeed(ProjectWorkUnitRepository, {
      createProjectWorkUnit: () => Effect.die("not implemented in test"),
      listProjectWorkUnitsByProject: () =>
        Effect.succeed([
          {
            id: "wu-1",
            projectId: "project-1",
            workUnitTypeId: "task",
            currentStateId: "todo",
            activeTransitionExecutionId: "te-1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "wu-2",
            projectId: "project-1",
            workUnitTypeId: "bug",
            currentStateId: "todo",
            activeTransitionExecutionId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      getProjectWorkUnitById: () => Effect.succeed(null),
      updateActiveTransitionExecutionPointer: () => Effect.succeed(null),
    }),
  ),
  Layer.provideMerge(
    Layer.succeed(ExecutionReadRepository, {
      getTransitionExecutionDetail: () => Effect.succeed(null),
      listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
      getWorkflowExecutionDetail: () => Effect.succeed(null),
      listWorkflowExecutionsForTransition: () => Effect.succeed([]),
      listActiveWorkflowExecutionsByProject: () =>
        Effect.succeed([
          {
            workflowExecution: {
              id: "we-1",
              transitionExecutionId: "te-1",
              workflowId: "wf-a",
              workflowRole: "primary" as const,
              status: "active" as const,
              supersededByWorkflowExecutionId: null,
              startedAt: new Date("2026-03-28T10:00:00.000Z"),
              completedAt: null,
              supersededAt: null,
            },
            transitionExecution: {
              id: "te-1",
              projectWorkUnitId: "wu-1",
              transitionId: "tr-a",
              status: "active" as const,
              primaryWorkflowExecutionId: "we-1",
              supersededByTransitionExecutionId: null,
              startedAt: new Date("2026-03-28T10:00:00.000Z"),
              completedAt: null,
              supersededAt: null,
            },
            projectWorkUnitId: "wu-1",
            projectId: "project-1",
          },
        ]),
    }),
  ),
);

describe("RuntimeOverviewService", () => {
  it("projects stats, active workflows preview, and guidance href", async () => {
    const program = Effect.gen(function* () {
      const service = yield* RuntimeOverviewService;
      return yield* service.getOverviewRuntimeSummary({ projectId: "project-1" });
    }).pipe(Effect.provide(testLayer));

    const result = await Effect.runPromise(program);

    expect(result.stats.factTypesWithInstances.current).toBe(2);
    expect(result.stats.workUnitTypesWithInstances.current).toBe(2);
    expect(result.stats.activeTransitions.count).toBe(1);
    expect(result.activeWorkflows).toHaveLength(1);
    expect(result.goToGuidanceHref).toBe("/projects/project-1/transitions");
  });
});
