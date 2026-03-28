import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";

import {
  ExecutionReadRepository,
  ProjectWorkUnitRepository,
  RuntimeWorkflowIndexService,
  RuntimeWorkflowIndexServiceLive,
} from "../../index";

const testLayer = RuntimeWorkflowIndexServiceLive.pipe(
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
              workflowId: "wf-ship",
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
              transitionId: "tr-ship",
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

describe("RuntimeWorkflowIndexService", () => {
  it("lists active workflows with navigation targets", async () => {
    const program = Effect.gen(function* () {
      const service = yield* RuntimeWorkflowIndexService;
      return yield* service.getActiveWorkflows({ projectId: "project-1" });
    }).pipe(Effect.provide(testLayer));

    const rows = await Effect.runPromise(program);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.workflowExecutionId).toBe("we-1");
    expect(rows[0]?.workUnit.projectWorkUnitId).toBe("wu-1");
    expect(rows[0]?.target).toEqual({
      page: "workflow-execution-detail",
      workflowExecutionId: "we-1",
    });
  });
});
