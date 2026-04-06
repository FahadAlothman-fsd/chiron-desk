import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useParamsMock, useSearchMock, useNavigateMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useParamsMock: vi.fn(),
  useSearchMock: vi.fn(),
  useNavigateMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useParams: useParamsMock,
    useSearch: useSearchMock,
    useNavigate: () => useNavigateMock,
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
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | null | undefined | false>) => classes.filter(Boolean).join(" "),
}));

import {
  TransitionExecutionDetailRoute,
  runtimeTransitionExecutionDetailQueryKey,
} from "../../routes/projects.$projectId.transition-executions.$transitionExecutionId";

type TransitionDetail = {
  workUnit: {
    projectWorkUnitId: string;
    workUnitTypeId: string;
    workUnitTypeKey: string;
    workUnitTypeName: string;
    currentStateId: string;
    currentStateKey: string;
    currentStateLabel: string;
  };
  transitionExecution: {
    transitionExecutionId: string;
    status: "active" | "completed" | "superseded";
    startedAt: string;
    completedAt?: string;
    supersededAt?: string;
    supersedesTransitionExecutionId?: string;
  };
  transitionDefinition: {
    transitionId: string;
    transitionKey: string;
    transitionName: string;
    fromStateKey?: string;
    fromStateLabel?: string;
    toStateKey: string;
    toStateLabel: string;
    boundWorkflows: Array<{ workflowId: string; workflowKey: string; workflowName: string }>;
    startConditionSets: unknown[];
    completionConditionSets: unknown[];
  };
  startGate: {
    mode: "informational";
    startedAt: string;
    note: string;
  };
  currentPrimaryWorkflow?: {
    workflowExecutionId: string;
    workflowId: string;
    workflowKey: string;
    workflowName: string;
    status: "active" | "completed" | "superseded" | "parent_superseded";
    startedAt: string;
  };
  primaryAttemptHistory: Array<{
    workflowExecutionId: string;
    workflowId: string;
    workflowKey: string;
    workflowName: string;
    status: "active" | "completed" | "superseded" | "parent_superseded";
    startedAt: string;
  }>;
  supportingWorkflows: Array<{
    workflowExecutionId: string;
    workflowId: string;
    workflowKey: string;
    workflowName: string;
    status: "active" | "completed" | "superseded" | "parent_superseded";
    startedAt: string;
  }>;
  completionGate: {
    panelState:
      | "workflow_running"
      | "passing"
      | "failing"
      | "completed_read_only"
      | "superseded_read_only";
    firstBlockingReason?: string;
    lastEvaluatedAt?: string;
    actions?: {
      completeTransition?: { kind: "complete_transition_execution"; transitionExecutionId: string };
      chooseAnotherPrimaryWorkflow?: {
        kind: "choose_primary_workflow_for_transition_execution";
        transitionExecutionId: string;
      };
    };
  };
};

function buildTransitionDetail(
  completionGate: TransitionDetail["completionGate"],
): TransitionDetail {
  return {
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
      toStateKey: "in_progress",
      toStateLabel: "In Progress",
      boundWorkflows: [
        {
          workflowId: "wf_story_start_primary",
          workflowKey: "WF.STORY.START.PRIMARY",
          workflowName: "Start story workflow",
        },
        {
          workflowId: "wf_story_start_escalated",
          workflowKey: "WF.STORY.START.ESCALATED",
          workflowName: "Escalated start workflow",
        },
      ],
      startConditionSets: [],
      completionConditionSets: [],
    },
    startGate: {
      mode: "informational",
      startedAt: "2026-03-28T12:00:00.000Z",
      note: "Start gate evaluated before launch.",
    },
    currentPrimaryWorkflow: {
      workflowExecutionId: "we_story_start_primary_003",
      workflowId: "wf_story_start_primary",
      workflowKey: "WF.STORY.START.PRIMARY",
      workflowName: "Start story workflow",
      status: "completed",
      startedAt: "2026-03-28T12:01:00.000Z",
    },
    primaryAttemptHistory: [
      {
        workflowExecutionId: "we_story_start_primary_002",
        workflowId: "wf_story_start_primary",
        workflowKey: "WF.STORY.START.PRIMARY",
        workflowName: "Start story workflow",
        status: "superseded",
        startedAt: "2026-03-28T11:59:00.000Z",
      },
    ],
    supportingWorkflows: [
      {
        workflowExecutionId: "we_story_supporting_001",
        workflowId: "wf_story_sync",
        workflowKey: "WF.STORY.SYNC",
        workflowName: "Sync story context",
        status: "active",
        startedAt: "2026-03-28T12:02:00.000Z",
      },
    ],
    completionGate,
  };
}

async function renderTransitionDetailRoute(detail: TransitionDetail) {
  const getRuntimeTransitionExecutionDetailQueryOptionsMock = vi.fn(
    (_input: {
      input: {
        projectId: string;
        projectWorkUnitId: string;
        transitionExecutionId: string;
      };
    }) => ({
      queryKey: ["runtime-transition-execution-detail", "project-1", "te_story_start_001"],
      queryFn: async () => detail,
    }),
  );

  const choosePrimaryWorkflowMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async () => {
        await options?.onSuccess?.();
        return {
          transitionExecutionId: "te_story_start_001",
          workflowExecutionId: "we_story_start_primary_004",
        };
      },
    }),
  );

  const completeTransitionMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async () => {
        await options?.onSuccess?.();
        return {
          transitionExecutionId: "te_story_start_001",
          projectWorkUnitId: "wu_story_001",
          newStateId: "state_in_progress",
          newStateKey: "in_progress",
          newStateLabel: "In Progress",
        };
      },
    }),
  );

  const orpc = {
    project: {
      getRuntimeTransitionExecutionDetail: {
        queryOptions: getRuntimeTransitionExecutionDetailQueryOptionsMock,
      },
      choosePrimaryWorkflowForTransitionExecution: {
        mutationOptions: choosePrimaryWorkflowMutationOptionsMock,
      },
      completeTransitionExecution: {
        mutationOptions: completeTransitionMutationOptionsMock,
      },
    },
  };

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
    ...orpc.project.getRuntimeTransitionExecutionDetail.queryOptions({
      input: {
        projectId: "project-1",
        projectWorkUnitId: "wu_story_001",
        transitionExecutionId: "te_story_start_001",
      },
    }),
    queryKey: runtimeTransitionExecutionDetailQueryKey("project-1", "te_story_start_001"),
  });

  const markup = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <TransitionExecutionDetailRoute />
    </QueryClientProvider>,
  );

  return {
    markup,
    getRuntimeTransitionExecutionDetailQueryOptionsMock,
    choosePrimaryWorkflowMutationOptionsMock,
    completeTransitionMutationOptionsMock,
  };
}

describe("runtime transition execution detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the five required sections in order and shows choose-primary action in failing state", async () => {
    const { markup, getRuntimeTransitionExecutionDetailQueryOptionsMock } =
      await renderTransitionDetailRoute(
        buildTransitionDetail({
          panelState: "failing",
          firstBlockingReason: "Completion condition blocked.",
          lastEvaluatedAt: "2026-03-28T12:06:00.000Z",
          actions: {
            chooseAnotherPrimaryWorkflow: {
              kind: "choose_primary_workflow_for_transition_execution",
              transitionExecutionId: "te_story_start_001",
            },
          },
        }),
      );

    const sectionOrder = [
      "Transition definition",
      "Current primary workflow",
      "Completion gate",
      "Primary attempt history",
      "Supporting workflows",
    ];

    let cursor = -1;
    for (const heading of sectionOrder) {
      const nextIndex = markup.indexOf(heading);
      expect(nextIndex).toBeGreaterThan(cursor);
      cursor = nextIndex;
    }

    expect(markup).toContain("Choose another primary workflow");
    expect(markup).toContain("Completion condition blocked.");
    expect(markup).toContain(
      'href="/projects/$projectId/workflow-executions/$workflowExecutionId"',
    );
    expect(markup).not.toContain("Retry same workflow");

    expect(runtimeTransitionExecutionDetailQueryKey("project-1", "te_story_start_001")).toEqual([
      "runtime-transition-execution-detail",
      "project-1",
      "te_story_start_001",
    ]);

    expect(getRuntimeTransitionExecutionDetailQueryOptionsMock).toHaveBeenCalledWith({
      input: {
        projectId: "project-1",
        projectWorkUnitId: "wu_story_001",
        transitionExecutionId: "te_story_start_001",
      },
    });
  });

  it("renders complete action when completion gate is passing", async () => {
    const { markup } = await renderTransitionDetailRoute(
      buildTransitionDetail({
        panelState: "passing",
        lastEvaluatedAt: "2026-03-28T12:07:00.000Z",
        actions: {
          completeTransition: {
            kind: "complete_transition_execution",
            transitionExecutionId: "te_story_start_001",
          },
        },
      }),
    );

    expect(markup).toContain("Complete transition");
    expect(markup).not.toContain("Choose another primary workflow");
    expect(markup).not.toContain("Choose different workflow");
  });

  it("renders activation semantics when the transition has no from-state", async () => {
    const detail = buildTransitionDetail({
      panelState: "passing",
      lastEvaluatedAt: "2026-03-28T12:07:00.000Z",
      actions: {
        completeTransition: {
          kind: "complete_transition_execution",
          transitionExecutionId: "te_story_start_001",
        },
      },
    });

    detail.transitionDefinition = {
      transitionId: detail.transitionDefinition.transitionId,
      transitionKey: detail.transitionDefinition.transitionKey,
      transitionName: detail.transitionDefinition.transitionName,
      toStateKey: "backlog",
      toStateLabel: "Backlog",
      boundWorkflows: detail.transitionDefinition.boundWorkflows,
      startConditionSets: detail.transitionDefinition.startConditionSets,
      completionConditionSets: detail.transitionDefinition.completionConditionSets,
    };

    const { markup } = await renderTransitionDetailRoute(detail);

    expect(markup).toContain("Activation → Backlog");
    expect(markup).not.toContain("Any state → Backlog");
    expect(markup).not.toContain("Activation → null");
  });
});
