import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useParamsMock, useNavigateMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useParamsMock: vi.fn(),
  useNavigateMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useParams: useParamsMock,
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
  WorkflowExecutionDetailRoute,
  runtimeWorkflowExecutionDetailQueryKey,
} from "../../routes/projects.$projectId.workflow-executions.$workflowExecutionId";

type WorkflowDetail = {
  workflowExecution: {
    workflowExecutionId: string;
    workflowId: string;
    workflowKey: string;
    workflowName: string;
    workflowRole: "primary" | "supporting";
    status: "active" | "completed" | "superseded" | "parent_superseded";
    startedAt: string;
    completedAt?: string;
    supersededAt?: string;
    supersedesWorkflowExecutionId?: string;
  };
  workUnit: {
    projectWorkUnitId: string;
    workUnitTypeId: string;
    workUnitTypeKey: string;
    workUnitTypeName: string;
    currentStateId: string;
    currentStateKey: string;
    currentStateLabel: string;
    target: { page: "work-unit-overview"; projectWorkUnitId: string };
  };
  parentTransition: {
    transitionExecutionId: string;
    transitionId: string;
    transitionKey: string;
    transitionName: string;
    status: "active" | "completed" | "superseded";
    target: { page: "transition-execution-detail"; transitionExecutionId: string };
  };
  lineage: {
    supersedesWorkflowExecutionId?: string;
    supersededByWorkflowExecutionId?: string;
    previousPrimaryAttempts?: Array<{
      workflowExecutionId: string;
      workflowId: string;
      workflowKey: string;
      workflowName: string;
      status: "active" | "completed" | "superseded" | "parent_superseded";
      startedAt: string;
    }>;
  };
  retryAction?: {
    kind: "retry_same_workflow";
    enabled: boolean;
    reasonIfDisabled?: string;
    parentTransitionExecutionId?: string;
  };
  impactDialog?: {
    requiredForRetry: boolean;
    affectedEntitiesSummary: {
      transitionExecutionId: string;
      workflowExecutionIds: string[];
      futureStepExecutionCount?: number;
    };
  };
  stepsSurface: {
    mode: "deferred";
    message: string;
  };
};

function buildWorkflowDetail(retryEnabled: boolean, stepsMessage: string): WorkflowDetail {
  const retryAction: NonNullable<WorkflowDetail["retryAction"]> = retryEnabled
    ? {
        kind: "retry_same_workflow",
        enabled: true,
        parentTransitionExecutionId: "te_story_start_001",
      }
    : {
        kind: "retry_same_workflow",
        enabled: false,
        reasonIfDisabled: "Retry is allowed only while parent transition execution remains active.",
        parentTransitionExecutionId: "te_story_start_001",
      };

  return {
    workflowExecution: {
      workflowExecutionId: "we_story_start_primary_003",
      workflowId: "wf_story_start_primary",
      workflowKey: "WF.STORY.START.PRIMARY",
      workflowName: "Start story workflow",
      workflowRole: "primary",
      status: "completed",
      startedAt: "2026-03-28T12:01:00.000Z",
      completedAt: "2026-03-28T12:05:00.000Z",
      supersedesWorkflowExecutionId: "we_story_start_primary_002",
    },
    workUnit: {
      projectWorkUnitId: "wu_story_001",
      workUnitTypeId: "wut_story",
      workUnitTypeKey: "WU.STORY",
      workUnitTypeName: "Story",
      currentStateId: "state_draft",
      currentStateKey: "draft",
      currentStateLabel: "Draft",
      target: {
        page: "work-unit-overview",
        projectWorkUnitId: "wu_story_001",
      },
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
    lineage: {
      supersedesWorkflowExecutionId: "we_story_start_primary_002",
      supersededByWorkflowExecutionId: "we_story_start_primary_004",
      previousPrimaryAttempts: [
        {
          workflowExecutionId: "we_story_start_primary_001",
          workflowId: "wf_story_start_primary",
          workflowKey: "WF.STORY.START.PRIMARY",
          workflowName: "Start story workflow",
          status: "superseded",
          startedAt: "2026-03-28T11:55:00.000Z",
        },
      ],
    },
    retryAction,
    impactDialog: {
      requiredForRetry: true,
      affectedEntitiesSummary: {
        transitionExecutionId: "te_story_start_001",
        workflowExecutionIds: ["we_story_start_primary_003"],
      },
    },
    stepsSurface: {
      mode: "deferred",
      message: stepsMessage,
    },
  };
}

async function renderWorkflowDetailRoute(detail: WorkflowDetail) {
  const getRuntimeWorkflowExecutionDetailQueryOptionsMock = vi.fn(
    (_input: { input: { projectId: string; workflowExecutionId: string } }) => ({
      queryKey: ["runtime-workflow-execution-detail", "project-1", "we_story_start_primary_003"],
      queryFn: async () => detail,
    }),
  );

  const retrySameWorkflowMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async () => {
        await options?.onSuccess?.();
        return {
          transitionExecutionId: "te_story_start_001",
          workflowExecutionId: "we_story_start_primary_004",
          workflowRole: "primary" as const,
        };
      },
    }),
  );

  const activateFirstWorkflowStepExecutionMutationOptionsMock = vi.fn(() => ({
    mutationFn: async () => ({
      stepExecutionId: "step-1",
      workflowExecutionId: detail.workflowExecution.workflowExecutionId,
    }),
  }));

  const orpc = {
    project: {
      getRuntimeWorkflowExecutionDetail: {
        queryOptions: getRuntimeWorkflowExecutionDetailQueryOptionsMock,
      },
      retrySameWorkflowExecution: {
        mutationOptions: retrySameWorkflowMutationOptionsMock,
      },
      activateFirstWorkflowStepExecution: {
        mutationOptions: activateFirstWorkflowStepExecutionMutationOptionsMock,
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
    workflowExecutionId: "we_story_start_primary_003",
  });
  useRouteContextMock.mockReturnValue({ orpc, queryClient });

  await queryClient.prefetchQuery({
    ...orpc.project.getRuntimeWorkflowExecutionDetail.queryOptions({
      input: {
        projectId: "project-1",
        workflowExecutionId: "we_story_start_primary_003",
      },
    }),
    queryKey: runtimeWorkflowExecutionDetailQueryKey("project-1", "we_story_start_primary_003"),
  });

  const markup = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <WorkflowExecutionDetailRoute />
    </QueryClientProvider>,
  );

  return {
    markup,
    getRuntimeWorkflowExecutionDetailQueryOptionsMock,
    activateFirstWorkflowStepExecutionMutationOptionsMock,
  };
}

describe("runtime workflow execution detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders workflow summary plus first-step activation CTA when no step execution exists yet", async () => {
    const {
      markup,
      getRuntimeWorkflowExecutionDetailQueryOptionsMock,
      activateFirstWorkflowStepExecutionMutationOptionsMock,
    } = await renderWorkflowDetailRoute(
      buildWorkflowDetail(
        true,
        "No step execution exists yet. Activate the first step to begin runtime execution.",
      ),
    );

    expect(markup).toContain("Workflow runtime summary");
    expect(markup).toContain("Retry and supersession lineage");
    expect(markup).toContain("Step execution runtime");
    expect(markup).toContain("Start story workflow");
    expect(markup).toContain("TR.STORY.START");
    expect(markup).toContain("WU.STORY");
    expect(markup).toContain("Retry same workflow");
    expect(markup).toContain("Activate first step");
    expect(markup).toContain("Activate the first step to begin runtime execution.");

    expect(activateFirstWorkflowStepExecutionMutationOptionsMock).toHaveBeenCalledTimes(1);

    expect(markup).not.toContain("Choose another primary workflow");
    expect(markup).not.toContain("Choose different workflow");

    expect(
      runtimeWorkflowExecutionDetailQueryKey("project-1", "we_story_start_primary_003"),
    ).toEqual(["runtime-workflow-execution-detail", "project-1", "we_story_start_primary_003"]);

    expect(getRuntimeWorkflowExecutionDetailQueryOptionsMock).toHaveBeenCalledWith({
      input: {
        projectId: "project-1",
        workflowExecutionId: "we_story_start_primary_003",
      },
    });
  });

  it("shows retry disabled reason when same-workflow retry is not currently allowed", async () => {
    const { markup } = await renderWorkflowDetailRoute(
      buildWorkflowDetail(false, "Step execution runtime is active (2 executions recorded)."),
    );

    expect(markup).toContain("Retry unavailable");
    expect(markup).toContain(
      "Retry is allowed only while parent transition execution remains active.",
    );
    expect(markup).toContain("Step execution runtime is active (2 executions recorded).");
    expect(markup).not.toContain("Activate first step");
    expect(markup).not.toContain("Choose another primary workflow");
  });
});
