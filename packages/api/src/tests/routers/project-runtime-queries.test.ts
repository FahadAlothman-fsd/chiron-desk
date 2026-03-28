import { call } from "@orpc/server";
import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";

import {
  RuntimeArtifactService,
  RuntimeFactService,
  RuntimeOverviewService,
  RuntimeWorkflowIndexService,
  RuntimeWorkUnitService,
} from "../../../../workflow-engine/src/index";

import { createProjectRouter } from "../../routers/project";

const PUBLIC_CTX = { context: { session: null } };

function makeHarness() {
  const overviewOutput = {
    stats: {
      factTypesWithInstances: {
        current: 1,
        total: 2,
        subtitle: "1 fact definition currently instantiated",
        target: { page: "project-facts", filters: { existence: "exists" as const } },
      },
      workUnitTypesWithInstances: {
        current: 1,
        total: 1,
        subtitle: "1 work-unit type instantiated",
        target: { page: "work-units" as const },
      },
      activeTransitions: {
        count: 1,
        subtitle: "1 transition currently active",
        target: { page: "runtime-guidance" as const, section: "active" as const },
      },
    },
    activeWorkflows: [],
    goToGuidanceTarget: { page: "runtime-guidance" as const },
    goToGuidanceHref: "/projects/project-1/transitions",
  };

  const workUnitsOutput = {
    project: { projectId: "project-1", name: "Project project-1" },
    filters: { hasActiveTransition: true },
    rows: [
      {
        projectWorkUnitId: "wu-1",
        displayIdentity: {
          primaryLabel: "task",
          secondaryLabel: "ready",
          fullInstanceId: "wu-1",
        },
        workUnitType: {
          workUnitTypeId: "task",
          workUnitTypeKey: "task",
          workUnitTypeName: "Task",
          cardinality: "many_per_project" as const,
        },
        currentState: {
          stateId: "ready",
          stateKey: "ready",
          stateLabel: "Ready",
        },
        summaries: {
          factsDependencies: {
            factInstancesCurrent: 1,
            factDefinitionsTotal: 1,
            inboundDependencyCount: 0,
            outboundDependencyCount: 0,
          },
          artifactSlots: {
            slotsWithCurrentArtifacts: 0,
            slotDefinitionsTotal: 0,
          },
        },
        timestamps: {
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        target: {
          page: "work-unit-overview" as const,
          projectWorkUnitId: "wu-1",
        },
      },
    ],
  };

  const workUnitOverviewOutput = {
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
        factInstancesCurrent: 1,
        factDefinitionsTotal: 1,
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
  };

  const workUnitStateMachineOutput = {
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
  };

  const projectFactsOutput = {
    project: { projectId: "project-1", name: "Project project-1" },
    filters: { existence: "exists" as const },
    cards: [],
  };

  const projectFactDetailOutput = {
    project: { projectId: "project-1", name: "Project project-1" },
    factDefinition: {
      factDefinitionId: "fact-1",
      factKey: "priority",
      factName: "Priority",
      factType: "string" as const,
      cardinality: "one" as const,
    },
    currentState: {
      exists: true,
      currentCount: 1,
      values: [
        {
          projectFactInstanceId: "pfi-1",
          value: "high",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
    actions: {
      canAddInstance: true,
      canUpdateExisting: true,
      canRemoveExisting: false as const,
    },
  };

  const workUnitFactsOutput = {
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
    filters: { existence: "exists" as const },
    primitive: {
      cards: [],
    },
  };

  const workUnitFactDetailOutput = {
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
    primitiveState: {
      exists: true,
      currentCount: 1,
      values: [
        {
          workUnitFactInstanceId: "wfi-1",
          value: "high",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
    actions: {
      canAddInstance: true,
      canUpdateExisting: true,
      canRemoveExisting: false as const,
    },
  };

  const artifactSlotsOutput = {
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
  };

  const artifactSlotDetailOutput = {
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
  };

  const artifactSnapshotDialogOutput = {
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
  };

  const activeWorkflowsOutput = [
    {
      workflowExecutionId: "wf-exec-1",
      workflowId: "workflow-1",
      workflowKey: "workflow-1",
      workflowName: "Workflow 1",
      workUnit: {
        projectWorkUnitId: "wu-1",
        workUnitTypeId: "task",
        workUnitTypeKey: "task",
        workUnitLabel: "task:wu-1",
      },
      transition: {
        transitionExecutionId: "te-1",
        transitionId: "transition-1",
        transitionKey: "transition-1",
        transitionName: "Transition 1",
      },
      startedAt: "2026-01-01T00:00:00.000Z",
      target: {
        page: "workflow-execution-detail" as const,
        workflowExecutionId: "wf-exec-1",
      },
    },
  ];

  const overview = vi.fn((_input: unknown) => Effect.succeed(overviewOutput as any));
  const workUnits = vi.fn((_input: unknown) => Effect.succeed(workUnitsOutput as any));
  const workUnitOverview = vi.fn((_input: unknown) =>
    Effect.succeed(workUnitOverviewOutput as any),
  );
  const workUnitStateMachine = vi.fn((_input: unknown) =>
    Effect.succeed(workUnitStateMachineOutput as any),
  );
  const projectFacts = vi.fn((_input: unknown) => Effect.succeed(projectFactsOutput as any));
  const projectFactDetail = vi.fn((_input: unknown) =>
    Effect.succeed(projectFactDetailOutput as any),
  );
  const workUnitFacts = vi.fn((_input: unknown) => Effect.succeed(workUnitFactsOutput as any));
  const workUnitFactDetail = vi.fn((_input: unknown) =>
    Effect.succeed(workUnitFactDetailOutput as any),
  );
  const artifactSlots = vi.fn((_input: unknown) => Effect.succeed(artifactSlotsOutput as any));
  const artifactSlotDetail = vi.fn((_input: unknown) =>
    Effect.succeed(artifactSlotDetailOutput as any),
  );
  const artifactSnapshotDialog = vi.fn((_input: unknown) =>
    Effect.succeed(artifactSnapshotDialogOutput as any),
  );
  const activeWorkflows = vi.fn((_input: unknown) => Effect.succeed(activeWorkflowsOutput as any));

  const layer = Layer.mergeAll(
    Layer.succeed(RuntimeOverviewService, {
      getOverviewRuntimeSummary: overview,
    } as any),
    Layer.succeed(RuntimeWorkUnitService, {
      getWorkUnits: workUnits,
      getWorkUnitOverview: workUnitOverview,
      getWorkUnitStateMachine: workUnitStateMachine,
    } as any),
    Layer.succeed(RuntimeFactService, {
      getProjectFacts: projectFacts,
      getProjectFactDetail: projectFactDetail,
      getWorkUnitFacts: workUnitFacts,
      getWorkUnitFactDetail: workUnitFactDetail,
    } as any),
    Layer.succeed(RuntimeArtifactService, {
      getArtifactSlots: artifactSlots,
      getArtifactSlotDetail: artifactSlotDetail,
      getArtifactSnapshotDialog: artifactSnapshotDialog,
      checkArtifactSlotCurrentState: vi.fn(),
    } as any),
    Layer.succeed(RuntimeWorkflowIndexService, {
      getActiveWorkflows: activeWorkflows,
    } as any),
  );

  const router = createProjectRouter(layer as never);
  const mocks = {
    overview,
    workUnits,
    workUnitOverview,
    workUnitStateMachine,
    projectFacts,
    projectFactDetail,
    workUnitFacts,
    workUnitFactDetail,
    artifactSlots,
    artifactSlotDetail,
    artifactSnapshotDialog,
    activeWorkflows,
  };

  return {
    router: router as Record<string, unknown>,
    mocks,
    outputs: {
      overviewOutput,
      workUnitsOutput,
      workUnitOverviewOutput,
      workUnitStateMachineOutput,
      projectFactsOutput,
      projectFactDetailOutput,
      workUnitFactsOutput,
      workUnitFactDetailOutput,
      artifactSlotsOutput,
      artifactSlotDetailOutput,
      artifactSnapshotDialogOutput,
      activeWorkflowsOutput,
    },
  };
}

function expectOnlyCalled(
  mocks: ReturnType<typeof makeHarness>["mocks"],
  key: keyof ReturnType<typeof makeHarness>["mocks"],
  input: unknown,
) {
  for (const [name, mock] of Object.entries(mocks)) {
    if (name === key) {
      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock).toHaveBeenCalledWith(input);
      continue;
    }

    expect(mock).not.toHaveBeenCalled();
  }
}

describe("project runtime query router", () => {
  it("wires all runtime query procedures onto the project router", () => {
    const { router } = makeHarness();

    expect(router.getRuntimeOverview).toBeDefined();
    expect(router.getRuntimeWorkUnits).toBeDefined();
    expect(router.getRuntimeWorkUnitOverview).toBeDefined();
    expect(router.getRuntimeWorkUnitStateMachine).toBeDefined();
    expect(router.getRuntimeProjectFacts).toBeDefined();
    expect(router.getRuntimeProjectFactDetail).toBeDefined();
    expect(router.getRuntimeWorkUnitFacts).toBeDefined();
    expect(router.getRuntimeWorkUnitFactDetail).toBeDefined();
    expect(router.getRuntimeArtifactSlots).toBeDefined();
    expect(router.getRuntimeArtifactSlotDetail).toBeDefined();
    expect(router.getRuntimeArtifactSnapshotDialog).toBeDefined();
    expect(router.getRuntimeActiveWorkflows).toBeDefined();
  });

  it("routes getRuntimeOverview through RuntimeOverviewService", async () => {
    const { router, mocks, outputs } = makeHarness();
    const input = { projectId: "project-1" };

    await expect(call((router as any).getRuntimeOverview, input, PUBLIC_CTX)).resolves.toEqual(
      outputs.overviewOutput,
    );
    expectOnlyCalled(mocks, "overview", input);
  });

  it("routes getRuntimeWorkUnits through RuntimeWorkUnitService", async () => {
    const { router, mocks, outputs } = makeHarness();
    const input = { projectId: "project-1", filters: { hasActiveTransition: true } };

    await expect(call((router as any).getRuntimeWorkUnits, input, PUBLIC_CTX)).resolves.toEqual(
      outputs.workUnitsOutput,
    );
    expectOnlyCalled(mocks, "workUnits", input);
  });

  it("routes getRuntimeWorkUnitOverview through RuntimeWorkUnitService", async () => {
    const { router, mocks, outputs } = makeHarness();
    const input = { projectId: "project-1", projectWorkUnitId: "wu-1" };

    await expect(
      call((router as any).getRuntimeWorkUnitOverview, input, PUBLIC_CTX),
    ).resolves.toEqual(outputs.workUnitOverviewOutput);
    expectOnlyCalled(mocks, "workUnitOverview", input);
  });

  it("routes getRuntimeWorkUnitStateMachine through RuntimeWorkUnitService", async () => {
    const { router, mocks, outputs } = makeHarness();
    const input = { projectId: "project-1", projectWorkUnitId: "wu-1" };

    await expect(
      call((router as any).getRuntimeWorkUnitStateMachine, input, PUBLIC_CTX),
    ).resolves.toEqual(outputs.workUnitStateMachineOutput);
    expectOnlyCalled(mocks, "workUnitStateMachine", input);
  });

  it("routes getRuntimeProjectFacts through RuntimeFactService", async () => {
    const { router, mocks, outputs } = makeHarness();
    const input = { projectId: "project-1", filters: { existence: "exists" } };

    await expect(call((router as any).getRuntimeProjectFacts, input, PUBLIC_CTX)).resolves.toEqual(
      outputs.projectFactsOutput,
    );
    expectOnlyCalled(mocks, "projectFacts", input);
  });

  it("routes getRuntimeProjectFactDetail through RuntimeFactService", async () => {
    const { router, mocks, outputs } = makeHarness();
    const input = { projectId: "project-1", factDefinitionId: "fact-1" };

    await expect(
      call((router as any).getRuntimeProjectFactDetail, input, PUBLIC_CTX),
    ).resolves.toEqual(outputs.projectFactDetailOutput);
    expectOnlyCalled(mocks, "projectFactDetail", input);
  });

  it("routes getRuntimeWorkUnitFacts through RuntimeFactService", async () => {
    const { router, mocks, outputs } = makeHarness();
    const input = {
      projectId: "project-1",
      projectWorkUnitId: "wu-1",
      tab: "primitive",
      filters: { existence: "exists" },
    };

    await expect(call((router as any).getRuntimeWorkUnitFacts, input, PUBLIC_CTX)).resolves.toEqual(
      outputs.workUnitFactsOutput,
    );
    expectOnlyCalled(mocks, "workUnitFacts", input);
  });

  it("routes getRuntimeWorkUnitFactDetail through RuntimeFactService", async () => {
    const { router, mocks, outputs } = makeHarness();
    const input = { projectId: "project-1", projectWorkUnitId: "wu-1", factDefinitionId: "fact-1" };

    await expect(
      call((router as any).getRuntimeWorkUnitFactDetail, input, PUBLIC_CTX),
    ).resolves.toEqual(outputs.workUnitFactDetailOutput);
    expectOnlyCalled(mocks, "workUnitFactDetail", input);
  });

  it("routes getRuntimeArtifactSlots through RuntimeArtifactService", async () => {
    const { router, mocks, outputs } = makeHarness();
    const input = { projectId: "project-1", projectWorkUnitId: "wu-1" };

    await expect(call((router as any).getRuntimeArtifactSlots, input, PUBLIC_CTX)).resolves.toEqual(
      outputs.artifactSlotsOutput,
    );
    expectOnlyCalled(mocks, "artifactSlots", input);
  });

  it("routes getRuntimeArtifactSlotDetail through RuntimeArtifactService", async () => {
    const { router, mocks, outputs } = makeHarness();
    const input = { projectId: "project-1", projectWorkUnitId: "wu-1", slotDefinitionId: "slot-1" };

    await expect(
      call((router as any).getRuntimeArtifactSlotDetail, input, PUBLIC_CTX),
    ).resolves.toEqual(outputs.artifactSlotDetailOutput);
    expectOnlyCalled(mocks, "artifactSlotDetail", input);
  });

  it("routes getRuntimeArtifactSnapshotDialog through RuntimeArtifactService", async () => {
    const { router, mocks, outputs } = makeHarness();
    const input = {
      projectId: "project-1",
      projectWorkUnitId: "wu-1",
      slotDefinitionId: "slot-1",
      projectArtifactSnapshotId: "snapshot-1",
    };

    await expect(
      call((router as any).getRuntimeArtifactSnapshotDialog, input, PUBLIC_CTX),
    ).resolves.toEqual(outputs.artifactSnapshotDialogOutput);
    expectOnlyCalled(mocks, "artifactSnapshotDialog", input);
  });

  it("routes getRuntimeActiveWorkflows through RuntimeWorkflowIndexService", async () => {
    const { router, mocks, outputs } = makeHarness();
    const input = { projectId: "project-1" };

    await expect(
      call((router as any).getRuntimeActiveWorkflows, input, PUBLIC_CTX),
    ).resolves.toEqual(outputs.activeWorkflowsOutput);
    expectOnlyCalled(mocks, "activeWorkflows", input);
  });
});
