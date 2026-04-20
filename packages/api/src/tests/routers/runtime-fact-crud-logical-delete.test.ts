import { call } from "@orpc/server";
import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import {
  ExecutionReadRepository,
  ProjectFactRepository,
  ProjectWorkUnitRepository,
  RuntimeManualFactCrudServiceLive,
  WorkflowContextFactRepository,
  WorkUnitFactRepository,
} from "@chiron/workflow-engine";

import { createProjectRuntimeRouter } from "../../routers/project-runtime";

const AUTHENTICATED_CTX = {
  context: {
    session: {
      session: {
        id: "session-id",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        userId: "user-id",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        token: "token",
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: "user-id",
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        emailVerified: true,
        image: null,
      },
    },
  },
} as const;

const now = new Date("2026-04-19T10:00:00.000Z");

type ProjectFactRow = {
  id: string;
  projectId: string;
  factDefinitionId: string;
  valueJson: unknown;
  status: "active" | "deleted";
  supersededByFactInstanceId: string | null;
  producedByTransitionExecutionId: string | null;
  producedByWorkflowExecutionId: string | null;
  authoredByUserId: string | null;
  createdAt: Date;
};

type WorkUnitFactRow = {
  id: string;
  projectWorkUnitId: string;
  factDefinitionId: string;
  valueJson: unknown;
  referencedProjectWorkUnitId: string | null;
  status: "active" | "deleted";
  supersededByFactInstanceId: string | null;
  producedByTransitionExecutionId: string | null;
  producedByWorkflowExecutionId: string | null;
  authoredByUserId: string | null;
  createdAt: Date;
};

function makeRouterHarness() {
  const projectFacts: ProjectFactRow[] = [
    {
      id: "pf-label-1",
      projectId: "project-1",
      factDefinitionId: "fact-labels",
      valueJson: "alpha",
      status: "active",
      supersededByFactInstanceId: null,
      producedByTransitionExecutionId: null,
      producedByWorkflowExecutionId: null,
      authoredByUserId: null,
      createdAt: now,
    },
    {
      id: "pf-label-2",
      projectId: "project-1",
      factDefinitionId: "fact-labels",
      valueJson: "beta",
      status: "active",
      supersededByFactInstanceId: null,
      producedByTransitionExecutionId: null,
      producedByWorkflowExecutionId: null,
      authoredByUserId: null,
      createdAt: now,
    },
  ];

  const workUnitFacts: WorkUnitFactRow[] = [
    {
      id: "wuf-label-1",
      projectWorkUnitId: "wu-1",
      factDefinitionId: "wu-fact-labels",
      valueJson: "alpha",
      referencedProjectWorkUnitId: null,
      status: "active",
      supersededByFactInstanceId: null,
      producedByTransitionExecutionId: null,
      producedByWorkflowExecutionId: null,
      authoredByUserId: null,
      createdAt: now,
    },
    {
      id: "wuf-label-2",
      projectWorkUnitId: "wu-1",
      factDefinitionId: "wu-fact-labels",
      valueJson: "beta",
      referencedProjectWorkUnitId: null,
      status: "active",
      supersededByFactInstanceId: null,
      producedByTransitionExecutionId: null,
      producedByWorkflowExecutionId: null,
      authoredByUserId: null,
      createdAt: now,
    },
  ];

  let nextProjectFactId = 1;
  let nextWorkUnitFactId = 1;

  const createProjectFactRow = (params: {
    projectId: string;
    factDefinitionId: string;
    valueJson: unknown;
    status?: "active" | "deleted";
    authoredByUserId?: string | null;
  }) => ({
    id: `pf-${nextProjectFactId++}`,
    projectId: params.projectId,
    factDefinitionId: params.factDefinitionId,
    valueJson: params.valueJson,
    status: params.status ?? "active",
    supersededByFactInstanceId: null,
    producedByTransitionExecutionId: null,
    producedByWorkflowExecutionId: null,
    authoredByUserId: params.authoredByUserId ?? null,
    createdAt: now,
  });

  const createWorkUnitFactRow = (params: {
    projectWorkUnitId: string;
    factDefinitionId: string;
    valueJson?: unknown;
    referencedProjectWorkUnitId?: string | null;
    status?: "active" | "deleted";
    authoredByUserId?: string | null;
  }) => ({
    id: `wuf-${nextWorkUnitFactId++}`,
    projectWorkUnitId: params.projectWorkUnitId,
    factDefinitionId: params.factDefinitionId,
    valueJson: params.valueJson ?? null,
    referencedProjectWorkUnitId: params.referencedProjectWorkUnitId ?? null,
    status: params.status ?? "active",
    supersededByFactInstanceId: null,
    producedByTransitionExecutionId: null,
    producedByWorkflowExecutionId: null,
    authoredByUserId: params.authoredByUserId ?? null,
    createdAt: now,
  });

  const projectFactLayer = Layer.succeed(ProjectFactRepository, {
    createFactInstance: (params) =>
      Effect.sync(() => {
        const row = createProjectFactRow(params);
        projectFacts.push(row);
        return row;
      }),
    getCurrentValuesByDefinition: ({ projectId, factDefinitionId }) =>
      Effect.succeed(
        projectFacts.filter(
          (row) =>
            row.projectId === projectId &&
            row.factDefinitionId === factDefinitionId &&
            row.status === "active",
        ),
      ),
    listFactsByProject: ({ projectId }) =>
      Effect.succeed(
        projectFacts.filter((row) => row.projectId === projectId && row.status === "active"),
      ),
    supersedeFactInstance: ({ projectFactInstanceId, supersededByProjectFactInstanceId }) =>
      Effect.sync(() => {
        const row = projectFacts.find((candidate) => candidate.id === projectFactInstanceId);
        if (row) {
          row.status = "deleted";
          row.supersededByFactInstanceId = supersededByProjectFactInstanceId;
        }
      }),
    updateFactInstance: ({ projectFactInstanceId, valueJson }) =>
      Effect.sync(() => {
        const row = projectFacts.find(
          (candidate) => candidate.id === projectFactInstanceId && candidate.status === "active",
        );
        if (!row) {
          return null;
        }
        row.valueJson = valueJson;
        return row;
      }),
    logicallyDeleteFactInstance: ({ projectFactInstanceId, authoredByUserId }) =>
      Effect.sync(() => {
        const row = projectFacts.find(
          (candidate) => candidate.id === projectFactInstanceId && candidate.status === "active",
        );
        if (!row) {
          return null;
        }

        const tombstone = createProjectFactRow({
          projectId: row.projectId,
          factDefinitionId: row.factDefinitionId,
          valueJson: row.valueJson,
          status: "deleted",
          authoredByUserId,
        });
        projectFacts.push(tombstone);
        row.status = "deleted";
        row.supersededByFactInstanceId = tombstone.id;
        return tombstone;
      }),
  } as unknown as Context.Tag.Service<typeof ProjectFactRepository>);

  const workUnitFactLayer = Layer.succeed(WorkUnitFactRepository, {
    createFactInstance: (params) =>
      Effect.sync(() => {
        const row = createWorkUnitFactRow(params);
        workUnitFacts.push(row);
        return row;
      }),
    getCurrentValuesByDefinition: ({ projectWorkUnitId, factDefinitionId }) =>
      Effect.succeed(
        workUnitFacts.filter(
          (row) =>
            row.projectWorkUnitId === projectWorkUnitId &&
            row.factDefinitionId === factDefinitionId &&
            row.status === "active",
        ),
      ),
    listFactsByWorkUnit: ({ projectWorkUnitId }) =>
      Effect.succeed(
        workUnitFacts.filter(
          (row) => row.projectWorkUnitId === projectWorkUnitId && row.status === "active",
        ),
      ),
    supersedeFactInstance: ({ workUnitFactInstanceId, supersededByWorkUnitFactInstanceId }) =>
      Effect.sync(() => {
        const row = workUnitFacts.find((candidate) => candidate.id === workUnitFactInstanceId);
        if (row) {
          row.status = "deleted";
          row.supersededByFactInstanceId = supersededByWorkUnitFactInstanceId;
        }
      }),
    updateFactInstance: ({ workUnitFactInstanceId, valueJson, referencedProjectWorkUnitId }) =>
      Effect.sync(() => {
        const row = workUnitFacts.find(
          (candidate) => candidate.id === workUnitFactInstanceId && candidate.status === "active",
        );
        if (!row) {
          return null;
        }
        row.valueJson = valueJson ?? null;
        row.referencedProjectWorkUnitId = referencedProjectWorkUnitId ?? null;
        return row;
      }),
    logicallyDeleteFactInstance: ({ workUnitFactInstanceId, authoredByUserId }) =>
      Effect.sync(() => {
        const row = workUnitFacts.find(
          (candidate) => candidate.id === workUnitFactInstanceId && candidate.status === "active",
        );
        if (!row) {
          return null;
        }

        const tombstone = createWorkUnitFactRow({
          projectWorkUnitId: row.projectWorkUnitId,
          factDefinitionId: row.factDefinitionId,
          valueJson: row.valueJson,
          referencedProjectWorkUnitId: row.referencedProjectWorkUnitId,
          status: "deleted",
          authoredByUserId,
        });
        workUnitFacts.push(tombstone);
        row.status = "deleted";
        row.supersededByFactInstanceId = tombstone.id;
        return tombstone;
      }),
  } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>);

  const projectWorkUnitLayer = Layer.succeed(ProjectWorkUnitRepository, {
    getProjectWorkUnitById: (projectWorkUnitId: string) =>
      Effect.succeed(
        projectWorkUnitId === "wu-1"
          ? {
              id: "wu-1",
              projectId: "project-1",
              workUnitTypeId: "story",
              workUnitTypeKey: "story",
              workUnitTypeName: "Story",
              stateId: "todo",
              stateKey: "todo",
              stateLabel: "Todo",
            }
          : null,
      ),
  } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>);

  const projectContextLayer = Layer.succeed(ProjectContextRepository, {
    findProjectPin: (projectId: string) =>
      Effect.succeed(
        projectId === "project-1" ? { projectId: "project-1", methodologyVersionId: "mv-1" } : null,
      ),
  } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);

  const methodologyLayer = Layer.succeed(MethodologyRepository, {
    findFactDefinitionsByVersionId: () =>
      Effect.succeed([
        {
          id: "fact-score",
          key: "score",
          valueType: "number",
          cardinality: "one",
          validationJson: {
            kind: "json-schema",
            schemaDialect: "draft-2020-12",
            schema: { type: "number", minimum: 1, maximum: 3 },
          },
        },
        {
          id: "fact-json",
          key: "json-note",
          valueType: "json",
          cardinality: "one",
          validationJson: {
            kind: "json-schema",
            schemaDialect: "draft-2020-12",
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["label"],
              properties: {
                label: { type: "string" },
              },
            },
          },
        },
        {
          id: "fact-labels",
          key: "labels",
          valueType: "string",
          cardinality: "many",
          validationJson: { kind: "none" },
        },
      ]),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

  const lifecycleLayer = Layer.succeed(LifecycleRepository, {
    findFactSchemas: () =>
      Effect.succeed([
        {
          id: "wu-fact-score",
          key: "score",
          factType: "number",
          cardinality: "one",
          validationJson: {
            kind: "json-schema",
            schemaDialect: "draft-2020-12",
            schema: { type: "number", minimum: 1, maximum: 3 },
          },
        },
        {
          id: "wu-fact-json",
          key: "metadata",
          factType: "json",
          cardinality: "one",
          validationJson: {
            kind: "json-schema",
            schemaDialect: "draft-2020-12",
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["label"],
              properties: {
                label: { type: "string" },
              },
            },
          },
        },
        {
          id: "wu-fact-labels",
          key: "labels",
          factType: "string",
          cardinality: "many",
          validationJson: { kind: "none" },
        },
      ]),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

  const workflowContextLayer = Layer.succeed(WorkflowContextFactRepository, {
    listCurrentFactValuesByDefinition: () => Effect.succeed([]),
  } as unknown as Context.Tag.Service<typeof WorkflowContextFactRepository>);

  const executionReadLayer = Layer.succeed(ExecutionReadRepository, {
    getWorkflowExecutionDetail: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);

  const serviceLayer = RuntimeManualFactCrudServiceLive.pipe(
    Layer.provideMerge(projectFactLayer),
    Layer.provideMerge(workUnitFactLayer),
    Layer.provideMerge(projectWorkUnitLayer),
    Layer.provideMerge(projectContextLayer),
    Layer.provideMerge(methodologyLayer),
    Layer.provideMerge(lifecycleLayer),
    Layer.provideMerge(workflowContextLayer),
    Layer.provideMerge(executionReadLayer),
  );

  return {
    router: createProjectRuntimeRouter(serviceLayer),
    state: { projectFacts, workUnitFacts },
  };
}

describe("runtime fact CRUD logical delete router", () => {
  it("uses create/update/delete verbs with logical delete tombstones for project and work-unit facts", async () => {
    const harness = makeRouterHarness();

    const createdProject = await call(
      harness.router.createRuntimeProjectFactValue,
      { projectId: "project-1", factDefinitionId: "fact-score", value: 2 },
      AUTHENTICATED_CTX,
    );

    const updatedProject = await call(
      harness.router.updateRuntimeProjectFactValue,
      {
        projectId: "project-1",
        factDefinitionId: "fact-score",
        projectFactInstanceId: createdProject.affectedInstanceIds[0]!,
        value: 3,
      },
      AUTHENTICATED_CTX,
    );

    const deletedProject = await call(
      harness.router.deleteRuntimeProjectFactValue,
      { projectId: "project-1", factDefinitionId: "fact-labels" },
      AUTHENTICATED_CTX,
    );

    const createdWorkUnit = await call(
      harness.router.createRuntimeWorkUnitFactValue,
      {
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        factDefinitionId: "wu-fact-score",
        value: 2,
      },
      AUTHENTICATED_CTX,
    );

    const updatedWorkUnit = await call(
      harness.router.updateRuntimeWorkUnitFactValue,
      {
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        factDefinitionId: "wu-fact-score",
        workUnitFactInstanceId: createdWorkUnit.affectedInstanceIds[0]!,
        value: 1,
      },
      AUTHENTICATED_CTX,
    );

    const deletedWorkUnit = await call(
      harness.router.deleteRuntimeWorkUnitFactValue,
      {
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        factDefinitionId: "wu-fact-labels",
      },
      AUTHENTICATED_CTX,
    );

    expect(createdProject.verb).toBe("create");
    expect(updatedProject.verb).toBe("update");
    expect(deletedProject.verb).toBe("delete");
    expect(deletedProject.affectedCount).toBe(2);

    expect(createdWorkUnit.verb).toBe("create");
    expect(updatedWorkUnit.verb).toBe("update");
    expect(deletedWorkUnit.verb).toBe("delete");
    expect(deletedWorkUnit.affectedCount).toBe(2);

    expect(
      harness.state.projectFacts.filter(
        (row) => row.factDefinitionId === "fact-labels" && row.status === "active",
      ),
    ).toHaveLength(0);
    expect(
      harness.state.projectFacts.filter(
        (row) => row.factDefinitionId === "fact-labels" && row.status === "deleted",
      ),
    ).toHaveLength(4);

    expect(
      harness.state.workUnitFacts.filter(
        (row) => row.factDefinitionId === "wu-fact-labels" && row.status === "active",
      ),
    ).toHaveLength(0);
    expect(
      harness.state.workUnitFacts.filter(
        (row) => row.factDefinitionId === "wu-fact-labels" && row.status === "deleted",
      ),
    ).toHaveLength(4);
  });

  it("enforces min/max at the runtime CRUD boundary", async () => {
    const harness = makeRouterHarness();

    await expect(
      call(
        harness.router.createRuntimeProjectFactValue,
        { projectId: "project-1", factDefinitionId: "fact-score", value: 5 },
        AUTHENTICATED_CTX,
      ),
    ).rejects.toThrow("less than or equal to 3");

    await expect(
      call(
        harness.router.createRuntimeWorkUnitFactValue,
        {
          projectId: "project-1",
          projectWorkUnitId: "wu-1",
          factDefinitionId: "wu-fact-score",
          value: 0,
        },
        AUTHENTICATED_CTX,
      ),
    ).rejects.toThrow("greater than or equal to 1");
  });

  it("rejects json compatibility violations at the runtime CRUD boundary", async () => {
    const harness = makeRouterHarness();

    await expect(
      call(
        harness.router.createRuntimeProjectFactValue,
        {
          projectId: "project-1",
          factDefinitionId: "fact-json",
          value: { label: "valid", nested: { bad: () => "nope" } },
        },
        AUTHENTICATED_CTX,
      ),
    ).rejects.toThrow("JSON-compatible");
  });

  it("rejects exact key-shape violations at the runtime CRUD boundary", async () => {
    const harness = makeRouterHarness();

    await expect(
      call(
        harness.router.createRuntimeWorkUnitFactValue,
        {
          projectId: "project-1",
          projectWorkUnitId: "wu-1",
          factDefinitionId: "wu-fact-json",
          value: { label: "valid", extra: true },
        },
        AUTHENTICATED_CTX,
      ),
    ).rejects.toThrow("exact key-shape");
  });
});
