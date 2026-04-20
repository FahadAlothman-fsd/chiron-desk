import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useNavigateMock, useRouteContextMock, useParamsMock, useSearchMock } = vi.hoisted(() => ({
  useNavigateMock: vi.fn(),
  useRouteContextMock: vi.fn(),
  useParamsMock: vi.fn(),
  useSearchMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useNavigate: () => useNavigateMock,
    useRouteContext: useRouteContextMock,
    useParams: useParamsMock,
    useSearch: useSearchMock,
  }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ title, children }: { title: string; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock("@/components/ui/button", () => ({
  buttonVariants: () => "",
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | null | undefined | false>) => classes.filter(Boolean).join(" "),
}));

import {
  TransitionExecutionShellRoute,
  runtimeTransitionExecutionShellQueryKey,
} from "../../routes/projects.$projectId.transition-executions.$transitionExecutionId";
import { WorkflowExecutionShellRoute } from "../../routes/projects.$projectId.workflow-executions.$workflowExecutionId";

function buildRouteContext() {
  const getRuntimeGuidanceActiveQueryOptionsMock = vi.fn(
    ({ input }: { input: { projectId: string } }) => ({
      queryKey: ["runtime-guidance-active", input.projectId],
      queryFn: async () => ({
        activeWorkUnitCards: [
          {
            projectWorkUnitId: "wu_story_001",
            workUnitTypeId: "wut_story",
            workUnitTypeKey: "WU.STORY",
            workUnitTypeName: "Story",
            currentStateKey: "draft",
            currentStateLabel: "Draft",
            factSummary: { currentCount: 1, totalCount: 3 },
            artifactSummary: { currentCount: 0, totalCount: 1 },
            activeTransition: {
              transitionExecutionId: "te_story_start_001",
              transitionId: "tr_story_start",
              transitionKey: "TR.STORY.START",
              transitionName: "Start story",
              toStateKey: "in_progress",
              toStateLabel: "In Progress",
              status: "active",
              readyForCompletion: false,
            },
            activePrimaryWorkflow: {
              workflowExecutionId: "we_story_start_primary_001",
              workflowId: "wf_story_start_primary",
              workflowKey: "WF.STORY.START.PRIMARY",
              workflowName: "Start story workflow",
              status: "active",
            },
            actions: {
              primary: { kind: "open_transition", transitionExecutionId: "te_story_start_001" },
              openTransitionTarget: { transitionExecutionId: "te_story_start_001" },
              openWorkflowTarget: { workflowExecutionId: "we_story_start_primary_001" },
            },
          },
        ],
      }),
    }),
  );

  const getRuntimeTransitionExecutionDetailQueryOptionsMock = vi.fn(
    (_input: {
      input: {
        projectId: string;
        projectWorkUnitId: string;
        transitionExecutionId: string;
      };
    }) => ({
      queryKey: [
        "runtime-transition-execution-shell",
        "project-1",
        "te_story_start_001",
        "wu_story_001",
      ],
      queryFn: async () => ({
        workUnit: {
          projectWorkUnitId: "wu_story_001",
          workUnitTypeId: "wut_story",
          workUnitTypeKey: "WU.STORY",
          workUnitTypeName: "Story",
          currentStateId: "state_draft",
          currentStateKey: "draft",
          currentStateLabel: "Draft",
        },
        transitionExecution: {
          transitionExecutionId: "te_story_start_001",
          status: "active",
          startedAt: "2026-03-28T12:00:00.000Z",
        },
        transitionDefinition: {
          transitionId: "tr_story_start",
          transitionKey: "TR.STORY.START",
          transitionName: "Start story",
          fromStateKey: "draft",
          fromStateLabel: "Draft",
          toStateLabel: "In Progress",
          completionConditionSets: [],
          boundWorkflows: [
            {
              workflowId: "wf_story_start_primary",
              workflowKey: "WF.STORY.START.PRIMARY",
              workflowName: "Start story workflow",
            },
          ],
        },
        completionGate: {
          panelState: "workflow_running",
          lastEvaluatedAt: "2026-03-28T12:01:00.000Z",
          completedAt: undefined,
          firstBlockingReason: undefined,
          evaluationTree: {
            conditions: [],
            groups: [],
          },
          actions: {},
        },
        currentPrimaryWorkflow: {
          workflowExecutionId: "we_story_start_primary_001",
          workflowId: "wf_story_start_primary",
          workflowKey: "WF.STORY.START.PRIMARY",
          workflowName: "Start story workflow",
          status: "active",
          startedAt: "2026-03-28T12:00:00.000Z",
        },
        startGate: {
          startedAt: "2026-03-28T12:00:00.000Z",
          note: "Transition started from guidance.",
        },
        primaryAttemptHistory: [],
        supportingWorkflows: [],
      }),
    }),
  );

  const getRuntimeWorkflowExecutionDetailQueryOptionsMock = vi.fn(
    (_input: { input: { projectId: string; workflowExecutionId: string } }) => ({
      queryKey: ["runtime-workflow-execution-shell", "project-1", "we_story_start_primary_001"],
      queryFn: async () => ({
        workflowExecution: {
          workflowExecutionId: "we_story_start_primary_001",
          workflowId: "wf_story_start_primary",
          workflowKey: "WF.STORY.START.PRIMARY",
          workflowName: "Start story workflow",
          workflowRole: "primary",
          status: "active",
          startedAt: "2026-03-28T12:00:00.000Z",
        },
        parentTransition: {
          transitionExecutionId: "te_story_start_001",
          transitionId: "tr_story_start",
          transitionKey: "TR.STORY.START",
          transitionName: "Start story",
          status: "active",
          target: {
            page: "transition-execution-detail",
            transitionExecutionId: "te_story_start_001",
          },
        },
      }),
    }),
  );

  return {
    orpc: {
      project: {
        activateWorkflowStepExecution: {
          mutationOptions: () => ({ mutationFn: vi.fn() }),
        },
        choosePrimaryWorkflowForTransitionExecution: {
          mutationOptions: () => ({ mutationFn: vi.fn() }),
        },
        completeTransitionExecution: {
          mutationOptions: () => ({ mutationFn: vi.fn() }),
        },
        completeWorkflowExecution: {
          mutationOptions: () => ({ mutationFn: vi.fn() }),
        },
        createRuntimeWorkflowContextFactValue: {
          mutationOptions: () => ({ mutationFn: vi.fn() }),
        },
        deleteRuntimeWorkflowContextFactValue: {
          mutationOptions: () => ({ mutationFn: vi.fn() }),
        },
        getRuntimeGuidanceActive: {
          queryOptions: getRuntimeGuidanceActiveQueryOptionsMock,
        },
        getRuntimeTransitionExecutionDetail: {
          queryOptions: getRuntimeTransitionExecutionDetailQueryOptionsMock,
        },
        getRuntimeWorkflowExecutionDetail: {
          queryOptions: getRuntimeWorkflowExecutionDetailQueryOptionsMock,
        },
        removeRuntimeWorkflowContextFactValue: {
          mutationOptions: () => ({ mutationFn: vi.fn() }),
        },
        retrySameWorkflowExecution: {
          mutationOptions: () => ({ mutationFn: vi.fn() }),
        },
        updateRuntimeWorkflowContextFactValue: {
          mutationOptions: () => ({ mutationFn: vi.fn() }),
        },
      },
    },
    getRuntimeGuidanceActiveQueryOptionsMock,
    getRuntimeTransitionExecutionDetailQueryOptionsMock,
    getRuntimeWorkflowExecutionDetailQueryOptionsMock,
  };
}

describe("runtime execution route shells", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders transition shell navigation breadcrumbs with hydrated runtime context", async () => {
    const {
      orpc,
      getRuntimeGuidanceActiveQueryOptionsMock,
      getRuntimeTransitionExecutionDetailQueryOptionsMock,
    } = buildRouteContext();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    useParamsMock.mockReturnValue({
      projectId: "project-1",
      transitionExecutionId: "te_story_start_001",
    });
    useSearchMock.mockReturnValue({ projectWorkUnitId: "wu_story_001" });
    useRouteContextMock.mockReturnValue({ orpc, queryClient });

    await queryClient.prefetchQuery({
      ...orpc.project.getRuntimeGuidanceActive.queryOptions({ input: { projectId: "project-1" } }),
      queryKey: ["runtime-guidance-active", "project-1"],
    });

    await queryClient.prefetchQuery({
      ...orpc.project.getRuntimeTransitionExecutionDetail.queryOptions({
        input: {
          projectId: "project-1",
          projectWorkUnitId: "wu_story_001",
          transitionExecutionId: "te_story_start_001",
        },
      }),
      queryKey: runtimeTransitionExecutionShellQueryKey(
        "project-1",
        "te_story_start_001",
        "wu_story_001",
      ),
    });

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <TransitionExecutionShellRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Transition execution");
    expect(markup).toContain("te_story_start_001");
    expect(markup).toContain("WU.STORY");
    expect(markup).toContain('href="/projects/$projectId/transitions"');
    expect(markup).toContain('href="/projects/$projectId/workflows"');

    expect(getRuntimeGuidanceActiveQueryOptionsMock).toHaveBeenCalledWith({
      input: { projectId: "project-1" },
    });
    expect(getRuntimeTransitionExecutionDetailQueryOptionsMock).toHaveBeenCalledWith({
      input: {
        projectId: "project-1",
        projectWorkUnitId: "wu_story_001",
        transitionExecutionId: "te_story_start_001",
      },
    });
  });

  it("renders workflow shell loader boundary and workflow navigation target", () => {
    const { orpc, getRuntimeWorkflowExecutionDetailQueryOptionsMock } = buildRouteContext();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    useParamsMock.mockReturnValue({
      projectId: "project-1",
      workflowExecutionId: "we_story_start_primary_001",
    });
    useSearchMock.mockReturnValue({});
    useRouteContextMock.mockReturnValue({ orpc, queryClient });

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <WorkflowExecutionShellRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Workflow execution");
    expect(markup).toContain("Loading workflow execution detail…");
    expect(markup).toContain("runtime-workflow-execution-shell-boundary");
    expect(getRuntimeWorkflowExecutionDetailQueryOptionsMock).toHaveBeenCalledWith({
      input: {
        projectId: "project-1",
        workflowExecutionId: "we_story_start_primary_001",
      },
    });
  });
});
