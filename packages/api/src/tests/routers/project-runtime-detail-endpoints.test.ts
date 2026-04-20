import { call } from "@orpc/server";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  RuntimeArtifactService,
  RuntimeGuidanceService,
  TransitionExecutionDetailService,
  WorkflowExecutionDetailService,
} from "@chiron/workflow-engine";

import { createProjectRuntimeRouter } from "../../routers/project-runtime";

const PUBLIC_CTX = { context: { session: null } };

function makeServiceLayer() {
  const calls = {
    startGate: 0,
    transitionDetail: 0,
    workflowDetail: 0,
    artifactState: 0,
  };

  const guidanceService = {
    getActive: () => Effect.succeed({ activeWorkUnitCards: [] }),
    streamCandidates: () => Effect.succeed((async function* () {})()),
    getRuntimeStartGateDetail: () => {
      calls.startGate += 1;
      return Effect.succeed({
        transition: {
          transitionId: "t-1",
          transitionKey: "T.ONE",
          transitionName: "Transition One",
          toStateKey: "doing",
        },
        workUnitContext: {
          projectWorkUnitId: "wu-1",
          workUnitTypeId: "wut-1",
          workUnitTypeKey: "WUT.ONE",
          workUnitTypeName: "Work Unit One",
          currentStateLabel: "Todo",
          source: "open",
        },
        gateSummary: { result: "available" },
        conditionTree: { mode: "all", conditions: [], groups: [] },
        launchability: { canLaunch: true, availableWorkflows: [] },
      });
    },
  } satisfies RuntimeGuidanceService["Type"] &
    Record<string, (...args: any[]) => Effect.Effect<unknown>>;

  const transitionDetailService: TransitionExecutionDetailService["Type"] = {
    getTransitionExecutionDetail: () => {
      calls.transitionDetail += 1;
      return Effect.succeed({
        workUnit: {
          projectWorkUnitId: "wu-1",
          workUnitTypeId: "wut-1",
          workUnitTypeKey: "WUT.ONE",
          workUnitTypeName: "Work Unit One",
          currentStateId: "todo",
          currentStateKey: "todo",
          currentStateLabel: "Todo",
        },
        transitionExecution: {
          transitionExecutionId: "te-1",
          status: "active",
          startedAt: new Date(0).toISOString(),
        },
        transitionDefinition: {
          transitionId: "t-1",
          transitionKey: "T.ONE",
          transitionName: "Transition One",
          toStateId: "state-doing",
          toStateKey: "doing",
          toStateLabel: "Doing",
          boundWorkflows: [],
          startConditionSets: [],
          completionConditionSets: [],
        },
        startGate: {
          mode: "informational",
          startedAt: new Date(0).toISOString(),
          note: "note",
        },
        primaryAttemptHistory: [],
        supportingWorkflows: [],
        completionGate: { panelState: "workflow_running" },
      });
    },
  };

  const workflowDetailService: WorkflowExecutionDetailService["Type"] = {
    getWorkflowExecutionDetail: () => {
      calls.workflowDetail += 1;
      return Effect.succeed({
        workflowExecution: {
          workflowExecutionId: "we-1",
          workflowId: "wf-1",
          workflowKey: "WF.ONE",
          workflowName: "Workflow One",
          workflowRole: "primary",
          status: "active",
          startedAt: new Date(0).toISOString(),
        },
        workUnit: {
          projectWorkUnitId: "wu-1",
          workUnitTypeId: "wut-1",
          workUnitTypeKey: "WUT.ONE",
          workUnitTypeName: "Work Unit One",
          currentStateId: "todo",
          currentStateKey: "todo",
          currentStateLabel: "Todo",
          target: { page: "work-unit-overview", projectWorkUnitId: "wu-1" },
        },
        parentTransition: {
          transitionExecutionId: "te-1",
          transitionId: "t-1",
          transitionKey: "T.ONE",
          transitionName: "Transition One",
          status: "active",
          target: { page: "transition-execution-detail", transitionExecutionId: "te-1" },
        },
        lineage: {},
        stepSurface: {
          state: "entry_pending",
          entryStep: {
            stepDefinitionId: "step-1",
            stepType: "form",
            stepKey: "capture",
          },
        },
        workflowContextFacts: { mode: "read_only_by_definition", groups: [] },
      });
    },
  };

  const artifactService: RuntimeArtifactService["Type"] = {
    getArtifactSlots: () => Effect.succeed({ workUnit: {} as any, slots: [] }),
    getArtifactSlotDetail: () =>
      Effect.succeed({
        workUnit: {} as any,
        slotDefinition: {} as any,
        currentArtifactInstance: { exists: false, fileCount: 0, files: [] },
      }),
    getArtifactInstanceDialog: () =>
      Effect.succeed({
        workUnit: {} as any,
        slotDefinition: {} as any,
        artifactInstance: {
          exists: true,
          artifactInstanceId: "artifact-instance-1",
          updatedAt: new Date(0).toISOString(),
          fileCount: 0,
          files: [],
        },
      }),
    checkArtifactSlotCurrentState: () => {
      calls.artifactState += 1;
      return Effect.succeed({ result: "unchanged", currentArtifactInstanceExists: true });
    },
  };

  return {
    calls,
    layer: Layer.mergeAll(
      Layer.succeed(RuntimeGuidanceService, guidanceService),
      Layer.succeed(TransitionExecutionDetailService, transitionDetailService),
      Layer.succeed(WorkflowExecutionDetailService, workflowDetailService),
      Layer.succeed(RuntimeArtifactService, artifactService),
    ),
  };
}

describe("project runtime detail/query endpoints", () => {
  it("delegates start gate detail and artifact current-state checks", async () => {
    const testLayer = makeServiceLayer();
    const router = createProjectRuntimeRouter(testLayer.layer);

    const startGate = await call(
      router.getRuntimeStartGateDetail,
      { projectId: "p", transitionId: "t-1", projectWorkUnitId: "wu-1" },
      PUBLIC_CTX,
    );
    const artifact = await call(
      router.checkArtifactSlotCurrentState,
      { projectId: "p", projectWorkUnitId: "wu-1", slotDefinitionId: "slot-1" },
      PUBLIC_CTX,
    );

    expect(testLayer.calls.startGate).toBe(1);
    expect(testLayer.calls.artifactState).toBe(1);
    expect(startGate.gateSummary.result).toBe("available");
    expect(artifact.result).toBe("unchanged");
  });

  it("delegates transition/workflow detail endpoints exactly once", async () => {
    const testLayer = makeServiceLayer();
    const router = createProjectRuntimeRouter(testLayer.layer);

    const transition = await call(
      router.getRuntimeTransitionExecutionDetail,
      { projectId: "p", projectWorkUnitId: "wu-1", transitionExecutionId: "te-1" },
      PUBLIC_CTX,
    );
    const workflow = await call(
      router.getRuntimeWorkflowExecutionDetail,
      { projectId: "p", workflowExecutionId: "we-1" },
      PUBLIC_CTX,
    );

    expect(testLayer.calls.transitionDetail).toBe(1);
    expect(testLayer.calls.workflowDetail).toBe(1);
    expect(transition.transitionExecution.transitionExecutionId).toBe("te-1");
    expect(workflow.workflowExecution.workflowExecutionId).toBe("we-1");
  });
});
