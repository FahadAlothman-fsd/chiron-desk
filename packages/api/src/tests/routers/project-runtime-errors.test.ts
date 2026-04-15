import { call } from "@orpc/server";
import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";

import {
  RepositoryError,
  RuntimeArtifactService,
  RuntimeFactService,
  RuntimeOverviewService,
  RuntimeWorkflowIndexService,
  RuntimeWorkUnitService,
} from "@chiron/workflow-engine";

import { createProjectRouter } from "../../routers/project";

const PUBLIC_CTX = { context: { session: null } };

function makeRuntimeLayer(
  overrides: {
    projectFacts?: (...args: any[]) => Effect.Effect<any, any>;
    workUnitOverview?: (...args: any[]) => Effect.Effect<any, any>;
    artifactSlotDetail?: (...args: any[]) => Effect.Effect<any, any>;
  } = {},
) {
  return Layer.mergeAll(
    Layer.succeed(RuntimeOverviewService, {
      getOverviewRuntimeSummary: vi.fn(() =>
        Effect.succeed({
          stats: {
            factTypesWithInstances: {
              current: 0,
              total: 0,
              subtitle: "0 fact definitions currently instantiated",
              target: { page: "project-facts", filters: { existence: "exists" as const } },
            },
            workUnitTypesWithInstances: {
              current: 0,
              total: 0,
              subtitle: "0 work-unit types instantiated",
              target: { page: "work-units" as const },
            },
            activeTransitions: {
              count: 0,
              subtitle: "0 transitions currently active",
              target: { page: "runtime-guidance" as const, section: "active" as const },
            },
          },
          activeWorkflows: [],
          goToGuidanceTarget: { page: "runtime-guidance" as const },
          goToGuidanceHref: "/projects/project-1/transitions",
        } as any),
      ),
    } as any),
    Layer.succeed(RuntimeWorkUnitService, {
      getWorkUnits: vi.fn(() =>
        Effect.succeed({
          project: { projectId: "project-1", name: "Project project-1" },
          filters: {},
          rows: [],
        } as any),
      ),
      getWorkUnitOverview: vi.fn(
        overrides.workUnitOverview ??
          (() =>
            Effect.succeed({
              workUnit: {
                projectWorkUnitId: "wu-1",
                workUnitTypeId: "task",
                workUnitTypeKey: "task",
                workUnitTypeName: "Task",
                currentStateId: "ready",
                currentStateKey: "ready",
                currentStateLabel: "Ready",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
              summaries: {
                factsDependencies: {
                  factInstancesCurrent: 0,
                  factDefinitionsTotal: 0,
                  inboundDependencyCount: 0,
                  outboundDependencyCount: 0,
                  target: { page: "work-unit-facts" as const, projectWorkUnitId: "wu-1" },
                },
                stateMachine: {
                  currentStateKey: "ready",
                  currentStateLabel: "Ready",
                  hasActiveTransition: false,
                  target: { page: "work-unit-state-machine" as const, projectWorkUnitId: "wu-1" },
                },
                artifactSlots: {
                  slotsWithCurrentSnapshots: 0,
                  slotDefinitionsTotal: 0,
                  target: { page: "artifact-slots" as const, projectWorkUnitId: "wu-1" },
                },
              },
            } as any)),
      ),
      getWorkUnitStateMachine: vi.fn(() =>
        Effect.succeed({
          workUnit: {
            projectWorkUnitId: "wu-1",
            workUnitTypeId: "task",
            workUnitTypeKey: "task",
            workUnitTypeName: "Task",
            currentStateId: "ready",
            currentStateKey: "ready",
            currentStateLabel: "Ready",
          },
          possibleTransitions: [],
          history: [],
        } as any),
      ),
    } as any),
    Layer.succeed(RuntimeFactService, {
      getProjectFacts: vi.fn(
        overrides.projectFacts ??
          (() =>
            Effect.succeed({
              project: { projectId: "project-1", name: "Project project-1" },
              filters: {},
              cards: [],
            } as any)),
      ),
      getProjectFactDetail: vi.fn(() =>
        Effect.succeed({
          project: { projectId: "project-1", name: "Project project-1" },
          factDefinition: {
            factDefinitionId: "fact-1",
            factKey: "priority",
            factName: "Priority",
            factType: "string" as const,
            cardinality: "one" as const,
          },
          currentState: { exists: false, currentCount: 0, values: [] },
          actions: {
            canAddInstance: true,
            canUpdateExisting: true,
            canRemoveExisting: false as const,
          },
        } as any),
      ),
      getWorkUnitFacts: vi.fn(() =>
        Effect.succeed({
          workUnit: {
            projectWorkUnitId: "wu-1",
            workUnitTypeId: "task",
            workUnitTypeKey: "task",
            workUnitTypeName: "Task",
            currentStateId: "ready",
            currentStateKey: "ready",
            currentStateLabel: "Ready",
          },
          activeTab: "primitive" as const,
          filters: {},
          primitive: { cards: [] },
        } as any),
      ),
      getWorkUnitFactDetail: vi.fn(() =>
        Effect.succeed({
          workUnit: {
            projectWorkUnitId: "wu-1",
            workUnitTypeId: "task",
            workUnitTypeKey: "task",
            workUnitTypeName: "Task",
          },
          factDefinition: {
            factDefinitionId: "fact-1",
            factKey: "priority",
            factName: "Priority",
            factType: "string" as const,
            cardinality: "one" as const,
          },
          primitiveState: { exists: false, currentCount: 0, values: [] },
          actions: {
            canAddInstance: true,
            canUpdateExisting: true,
            canRemoveExisting: false as const,
          },
        } as any),
      ),
    } as any),
    Layer.succeed(RuntimeArtifactService, {
      getArtifactSlots: vi.fn(() =>
        Effect.succeed({
          workUnit: {
            projectWorkUnitId: "wu-1",
            workUnitTypeId: "task",
            workUnitTypeKey: "task",
            workUnitTypeName: "Task",
            currentStateId: "ready",
            currentStateKey: "ready",
            currentStateLabel: "Ready",
          },
          slots: [],
        } as any),
      ),
      getArtifactSlotDetail: vi.fn(
        overrides.artifactSlotDetail ??
          (() =>
            Effect.succeed({
              workUnit: {
                projectWorkUnitId: "wu-1",
                workUnitTypeId: "task",
                workUnitTypeKey: "task",
                workUnitTypeName: "Task",
                currentStateId: "ready",
                currentStateKey: "ready",
                currentStateLabel: "Ready",
              },
              slotDefinition: {
                slotDefinitionId: "slot-1",
                slotKey: "design-doc",
                slotName: "Design Doc",
                artifactKind: "single_file" as const,
              },
              currentEffectiveSnapshot: {
                exists: false,
                memberCounts: { currentCount: 0 },
                members: [],
              },
              lineage: [],
            } as any)),
      ),
      getArtifactSnapshotDialog: vi.fn(() =>
        Effect.succeed({
          workUnit: {
            projectWorkUnitId: "wu-1",
            workUnitTypeId: "task",
            workUnitTypeKey: "task",
            workUnitTypeName: "Task",
          },
          slotDefinition: {
            slotDefinitionId: "slot-1",
            slotKey: "design-doc",
            slotName: "Design Doc",
            artifactKind: "single_file" as const,
          },
          snapshot: {
            projectArtifactSnapshotId: "snapshot-1",
            createdAt: "2026-01-01T00:00:00.000Z",
            deltaMembers: [],
            effectiveMemberCounts: { currentCount: 0 },
          },
        } as any),
      ),
      checkArtifactSlotCurrentState: vi.fn(),
    } as any),
    Layer.succeed(RuntimeWorkflowIndexService, {
      getActiveWorkflows: vi.fn(() => Effect.succeed([])),
    } as any),
  );
}

describe("project runtime query error handling", () => {
  it("returns empty collections without converting them into 404s", async () => {
    const router = createProjectRouter(makeRuntimeLayer() as never) as Record<string, unknown>;

    await expect(
      call((router as any).getRuntimeProjectFacts, { projectId: "project-1" }, PUBLIC_CTX),
    ).resolves.toEqual({
      project: { projectId: "project-1", name: "Project project-1" },
      filters: {},
      cards: [],
    });
  });

  it("maps tagged not-found runtime errors to NOT_FOUND", async () => {
    const router = createProjectRouter(
      makeRuntimeLayer({
        workUnitOverview: () =>
          Effect.fail(
            Object.assign(new Error("missing work unit"), {
              _tag: "ProjectWorkUnitNotFoundError",
            }),
          ),
      }) as never,
    ) as Record<string, unknown>;

    try {
      await call(
        (router as any).getRuntimeWorkUnitOverview,
        { projectId: "project-1", projectWorkUnitId: "missing" },
        PUBLIC_CTX,
      );
      expect.unreachable("expected NOT_FOUND error");
    } catch (error) {
      expect((error as { code?: string }).code).toBe("NOT_FOUND");
      expect((error as Error).message).toContain("missing work unit");
    }
  });

  it("maps RepositoryError failures to INTERNAL_SERVER_ERROR", async () => {
    const router = createProjectRouter(
      makeRuntimeLayer({
        artifactSlotDetail: () =>
          Effect.fail(
            new RepositoryError({
              operation: "artifact-detail",
              cause: new Error("db is down"),
            }),
          ),
      }) as never,
    ) as Record<string, unknown>;

    try {
      await call(
        (router as any).getRuntimeArtifactSlotDetail,
        { projectId: "project-1", projectWorkUnitId: "wu-1", slotDefinitionId: "slot-1" },
        PUBLIC_CTX,
      );
      expect.unreachable("expected INTERNAL_SERVER_ERROR");
    } catch (error) {
      expect((error as { code?: string }).code).toBe("INTERNAL_SERVER_ERROR");
    }
  });

  it("maps unknown runtime failures to INTERNAL_SERVER_ERROR", async () => {
    const router = createProjectRouter(
      makeRuntimeLayer({
        projectFacts: () => Effect.fail(new Error("unexpected boom")),
      }) as never,
    ) as Record<string, unknown>;

    await expect(
      call((router as any).getRuntimeProjectFacts, { projectId: "project-1" }, PUBLIC_CTX),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: expect.stringContaining("unexpected boom"),
    });
  });
});
