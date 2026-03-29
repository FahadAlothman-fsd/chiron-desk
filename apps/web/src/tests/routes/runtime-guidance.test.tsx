import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({
    useParams: () => ({ projectId: "project-1" }),
    useRouteContext: () => ({ orpc: {}, queryClient: {} }),
  }),
}));

vi.mock("@/components/runtime/runtime-guidance-sections", () => ({
  RuntimeGuidanceSections: () => null,
}));

vi.mock("@/components/runtime/runtime-start-gate-dialog", () => ({
  RuntimeStartGateDialog: () => null,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: () => null,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

import {
  buildStartGateInput,
  resolveRuntimeGuidanceLaunchDecision,
  toErrorMessage,
} from "../../routes/projects.$projectId.transitions";

describe("runtime guidance helpers", () => {
  it("builds future start-gate input with futureCandidate identity", () => {
    const input = buildStartGateInput(
      "project-1",
      {
        candidateCardId: "card-future-1",
        source: "future",
        workUnitContext: {
          workUnitTypeId: "wut-future-1",
          workUnitTypeKey: "WU.FUTURE.ONE",
          workUnitTypeName: "Future Work Unit",
          currentStateLabel: "Absent",
        },
        summaries: {
          facts: { currentCount: 0, totalCount: 1 },
          artifactSlots: { currentCount: 0, totalCount: 1 },
        },
        transitions: [],
      },
      {
        candidateId: "candidate-future-1",
        transitionId: "transition-future-1",
        transitionKey: "TR.FUTURE.ONE",
        transitionName: "Future Transition",
        toStateKey: "draft",
        toStateLabel: "Draft",
        source: "future",
      },
    );

    expect(input).toEqual({
      projectId: "project-1",
      transitionId: "transition-future-1",
      transitionKey: "TR.FUTURE.ONE",
      futureCandidate: {
        workUnitTypeId: "wut-future-1",
        workUnitTypeKey: "WU.FUTURE.ONE",
        source: "future",
      },
    });
  });

  it("chooses startTransitionExecution when no matching active work unit exists", () => {
    const decision = resolveRuntimeGuidanceLaunchDecision({
      projectId: "project-1",
      selection: {
        card: {
          candidateCardId: "card-open-1",
          source: "open",
          workUnitContext: {
            projectWorkUnitId: "wu-open-1",
            workUnitTypeId: "wut-open-1",
            workUnitTypeKey: "WU.OPEN.ONE",
            workUnitTypeName: "Open Work Unit",
            currentStateKey: "draft",
            currentStateLabel: "Draft",
          },
          summaries: {
            facts: { currentCount: 1, totalCount: 2 },
            artifactSlots: { currentCount: 0, totalCount: 1 },
          },
          transitions: [],
        },
        transition: {
          candidateId: "candidate-open-1",
          transitionId: "transition-open-1",
          transitionKey: "TR.OPEN.ONE",
          transitionName: "Open Transition",
          toStateKey: "ready",
          toStateLabel: "Ready",
          source: "open",
        },
        input: {
          projectId: "project-1",
          transitionId: "transition-open-1",
          transitionKey: "TR.OPEN.ONE",
          projectWorkUnitId: "wu-open-1",
        },
      },
      activeCards: [],
      workflow: {
        workflowId: "wf-open-1",
        workflowKey: "WF.OPEN.ONE",
      },
    });

    expect(decision.kind).toBe("start");
    expect(decision.input).toMatchObject({
      projectId: "project-1",
      transitionId: "transition-open-1",
      workflowId: "wf-open-1",
      workUnit: {
        mode: "existing",
        projectWorkUnitId: "wu-open-1",
      },
    });
  });

  it("chooses switchActiveTransitionExecution when active card exists for target work unit", () => {
    const decision = resolveRuntimeGuidanceLaunchDecision({
      projectId: "project-1",
      selection: {
        card: {
          candidateCardId: "card-open-1",
          source: "open",
          workUnitContext: {
            projectWorkUnitId: "wu-open-1",
            workUnitTypeId: "wut-open-1",
            workUnitTypeKey: "WU.OPEN.ONE",
            workUnitTypeName: "Open Work Unit",
            currentStateKey: "draft",
            currentStateLabel: "Draft",
          },
          summaries: {
            facts: { currentCount: 1, totalCount: 2 },
            artifactSlots: { currentCount: 0, totalCount: 1 },
          },
          transitions: [],
        },
        transition: {
          candidateId: "candidate-open-1",
          transitionId: "transition-open-1",
          transitionKey: "TR.OPEN.ONE",
          transitionName: "Open Transition",
          toStateKey: "ready",
          toStateLabel: "Ready",
          source: "open",
        },
        input: {
          projectId: "project-1",
          transitionId: "transition-open-1",
          transitionKey: "TR.OPEN.ONE",
          projectWorkUnitId: "wu-open-1",
        },
      },
      activeCards: [
        {
          projectWorkUnitId: "wu-open-1",
          workUnitTypeId: "wut-open-1",
          workUnitTypeKey: "WU.OPEN.ONE",
          workUnitTypeName: "Open Work Unit",
          currentStateKey: "doing",
          currentStateLabel: "Doing",
          factSummary: { currentCount: 1, totalCount: 2 },
          artifactSummary: { currentCount: 0, totalCount: 1 },
          activeTransition: {
            transitionExecutionId: "te-existing-1",
            transitionId: "transition-existing-1",
            transitionKey: "TR.EXISTING.ONE",
            transitionName: "Existing Transition",
            toStateKey: "doing",
            toStateLabel: "Doing",
            status: "active",
          },
          activePrimaryWorkflow: {
            workflowExecutionId: "we-existing-1",
            workflowId: "wf-existing-1",
            workflowKey: "WF.EXISTING.ONE",
            workflowName: "Existing Workflow",
            status: "active",
          },
          actions: {
            primary: {
              kind: "open_transition",
              transitionExecutionId: "te-existing-1",
            },
            openTransitionTarget: { transitionExecutionId: "te-existing-1" },
            openWorkflowTarget: { workflowExecutionId: "we-existing-1" },
          },
        },
      ],
      workflow: {
        workflowId: "wf-open-1",
        workflowKey: "WF.OPEN.ONE",
      },
    });

    expect(decision.kind).toBe("switch");
    expect(decision.input).toMatchObject({
      projectId: "project-1",
      projectWorkUnitId: "wu-open-1",
      supersededTransitionExecutionId: "te-existing-1",
      transitionId: "transition-open-1",
      workflowId: "wf-open-1",
      workflowKey: "WF.OPEN.ONE",
    });
  });

  it("normalizes unknown errors to string messages", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom");
    expect(toErrorMessage({ message: 42 })).toBe("42");
  });
});
