import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div data-slot="dialog">{children}</div> : <div data-slot="dialog-root" />,
  DialogContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-slot="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | null | undefined | false>) => classes.filter(Boolean).join(" "),
}));

import {
  WorkflowContextFactDialog,
  WorkflowExecutionDetailRoute,
  runtimeWorkflowExecutionDetailQueryKey,
} from "../../routes/projects.$projectId.workflow-executions.$workflowExecutionId";

type WorkflowContextFactGroup = {
  contextFactDefinitionId: string;
  definitionKey?: string;
  definitionLabel?: string;
  definitionDescriptionJson?: unknown;
  instances: Array<{
    contextFactInstanceId?: string;
    instanceOrder: number;
    valueJson: unknown;
    sourceStepExecutionId?: string;
    recordedAt?: string;
  }>;
};

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
  completeAction?: {
    kind: "complete_workflow_execution";
    enabled: boolean;
    reasonIfDisabled?: string;
  };
  impactDialog?: {
    requiredForRetry: boolean;
    affectedEntitiesSummary: {
      transitionExecutionId: string;
      workflowExecutionIds: string[];
      futureStepExecutionCount?: number;
    };
  };
  stepSurface:
    | {
        state: "entry_pending";
        entryStep: { stepDefinitionId: string; stepType: string; stepKey?: string };
      }
    | {
        state: "active_step";
        activeStep: {
          stepExecutionId: string;
          stepDefinitionId: string;
          stepType: string;
          status: "active" | "completed";
          activatedAt: string;
          completedAt?: string;
          target: { page: "step-execution-detail"; stepExecutionId: string };
        };
      }
    | {
        state: "next_pending";
        afterStep: {
          stepExecutionId: string;
          stepDefinitionId: string;
          stepType: string;
          status: "active" | "completed";
          activatedAt: string;
          completedAt?: string;
          target: { page: "step-execution-detail"; stepExecutionId: string };
        };
        nextStep: { stepDefinitionId: string; stepType: string; stepKey?: string };
      }
    | {
        state: "terminal_no_next_step";
        terminalStep?: {
          stepExecutionId: string;
          stepDefinitionId: string;
          stepType: string;
          status: "active" | "completed";
          activatedAt: string;
          completedAt?: string;
          target: { page: "step-execution-detail"; stepExecutionId: string };
        };
      }
    | {
        state: "invalid_definition";
        reason: "missing_entry_step" | "ambiguous_entry_step";
      };
  workflowContextFacts: {
    mode: "read_only_by_definition";
    groups: WorkflowContextFactGroup[];
  };
};

const baseContextGroups: WorkflowContextFactGroup[] = [
  {
    contextFactDefinitionId: "ctx-empty",
    definitionKey: "workflow_mode",
    definitionLabel: "Workflow Mode",
    definitionDescriptionJson: { markdown: "Select the setup workflow mode." },
    instances: [],
  },
  {
    contextFactDefinitionId: "ctx-summary",
    definitionKey: "project_summary",
    definitionLabel: "Project Summary",
    definitionDescriptionJson: { markdown: "Capture a concise reusable project summary." },
    instances: [
      {
        contextFactInstanceId: "ctx-summary-1",
        instanceOrder: 0,
        valueJson: "Ship runtime setup detail.",
        recordedAt: "2026-03-28T12:03:00.000Z",
      },
    ],
  },
  {
    contextFactDefinitionId: "ctx-parts",
    definitionKey: "project_parts",
    definitionLabel: "Project Parts",
    definitionDescriptionJson: { markdown: "Reference discovered project parts." },
    instances: [
      {
        contextFactInstanceId: "ctx-parts-1",
        instanceOrder: 0,
        valueJson: { projectWorkUnitId: "wu-part-1" },
        recordedAt: "2026-03-28T12:04:00.000Z",
      },
      {
        contextFactInstanceId: "ctx-parts-2",
        instanceOrder: 1,
        valueJson: { projectWorkUnitId: "wu-part-2" },
        recordedAt: "2026-03-28T12:04:30.000Z",
      },
    ],
  },
];

function buildWorkflowDetail(stepSurface: WorkflowDetail["stepSurface"]): WorkflowDetail {
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
    retryAction: {
      kind: "retry_same_workflow",
      enabled: true,
      parentTransitionExecutionId: "te_story_start_001",
    },
    completeAction: {
      kind: "complete_workflow_execution",
      enabled: false,
      reasonIfDisabled: "Workflow execution is already finalized.",
    },
    impactDialog: {
      requiredForRetry: true,
      affectedEntitiesSummary: {
        transitionExecutionId: "te_story_start_001",
        workflowExecutionIds: ["we_story_start_primary_003"],
      },
    },
    stepSurface,
    workflowContextFacts: {
      mode: "read_only_by_definition",
      groups: baseContextGroups,
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

  const activateWorkflowStepExecutionMutationOptionsMock = vi.fn(() => ({
    mutationFn: async () => ({
      stepExecutionId: "step-1",
      workflowExecutionId: detail.workflowExecution.workflowExecutionId,
    }),
  }));

  const completeWorkflowExecutionMutationOptionsMock = vi.fn(() => ({
    mutationFn: async () => ({
      workflowExecutionId: detail.workflowExecution.workflowExecutionId,
      status: "completed" as const,
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
      completeWorkflowExecution: {
        mutationOptions: completeWorkflowExecutionMutationOptionsMock,
      },
      activateWorkflowStepExecution: {
        mutationOptions: activateWorkflowStepExecutionMutationOptionsMock,
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
    activateWorkflowStepExecutionMutationOptionsMock,
    completeWorkflowExecutionMutationOptionsMock,
  };
}

describe("runtime workflow execution detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders entry-pending orchestration state and read-only context fact cards", async () => {
    const {
      markup,
      getRuntimeWorkflowExecutionDetailQueryOptionsMock,
      activateWorkflowStepExecutionMutationOptionsMock,
    } = await renderWorkflowDetailRoute(
      buildWorkflowDetail({
        state: "entry_pending",
        entryStep: {
          stepDefinitionId: "step-entry",
          stepType: "form",
          stepKey: "capture_setup",
        },
      }),
    );

    expect(markup).toContain("Workflow runtime summary");
    expect(markup).toContain("Retry and supersession lineage");
    expect(markup).toContain("Workflow step surface");
    expect(markup).toContain("Entry step pending activation");
    expect(markup).toContain("Activate entry step");
    expect(markup).toContain("Workflow context facts");
    expect(markup).toContain("Workflow Mode");
    expect(markup).toContain("Project Summary");
    expect(markup).toContain("Project Parts");
    expect(markup).toContain("0 instances");
    expect(markup).toContain("1 instance");
    expect(markup).toContain("2 instances");
    expect(markup).toContain("View instances");
    expect(markup).not.toContain("Save draft");
    expect(markup).not.toContain("Submit");
    expect(markup).not.toContain("Replace value");
    expect(markup).not.toContain("Add instance");

    expect(activateWorkflowStepExecutionMutationOptionsMock).toHaveBeenCalledTimes(1);
    expect(getRuntimeWorkflowExecutionDetailQueryOptionsMock).toHaveBeenCalledWith({
      input: {
        projectId: "project-1",
        workflowExecutionId: "we_story_start_primary_003",
      },
    });
  });

  it("renders active-step summary only and hides next-step activation while a step is active", async () => {
    const { markup } = await renderWorkflowDetailRoute(
      buildWorkflowDetail({
        state: "active_step",
        activeStep: {
          stepExecutionId: "step-active",
          stepDefinitionId: "step-entry",
          stepType: "form",
          status: "active",
          activatedAt: "2026-03-28T12:02:00.000Z",
          target: { page: "step-execution-detail", stepExecutionId: "step-active" },
        },
      }),
    );

    expect(markup).toContain("Active step in progress");
    expect(markup).toContain("Open active step");
    expect(markup).toContain("While an active step exists, next-step activation stays hidden");
    expect(markup).not.toContain("Activate next step");
  });

  it("renders next-pending orchestration summary with activation CTA", async () => {
    const { markup } = await renderWorkflowDetailRoute(
      buildWorkflowDetail({
        state: "next_pending",
        afterStep: {
          stepExecutionId: "step-completed",
          stepDefinitionId: "step-entry",
          stepType: "form",
          status: "completed",
          activatedAt: "2026-03-28T12:02:00.000Z",
          completedAt: "2026-03-28T12:03:00.000Z",
          target: { page: "step-execution-detail", stepExecutionId: "step-completed" },
        },
        nextStep: {
          stepDefinitionId: "step-next",
          stepType: "display",
          stepKey: "show_summary",
        },
      }),
    );

    expect(markup).toContain("Next step pending activation");
    expect(markup).toContain("Open completed step");
    expect(markup).toContain("Activate next step");
    expect(markup).toContain("show_summary");
  });

  it("renders terminal state summary card", async () => {
    const detail = buildWorkflowDetail({
      state: "terminal_no_next_step",
      terminalStep: {
        stepExecutionId: "step-terminal",
        stepDefinitionId: "step-finish",
        stepType: "display",
        status: "completed",
        activatedAt: "2026-03-28T12:03:00.000Z",
        completedAt: "2026-03-28T12:04:00.000Z",
        target: { page: "step-execution-detail", stepExecutionId: "step-terminal" },
      },
    });
    detail.workflowExecution.status = "active";
    delete detail.workflowExecution.completedAt;
    detail.completeAction = {
      kind: "complete_workflow_execution",
      enabled: true,
    };

    const { markup } = await renderWorkflowDetailRoute(detail);

    expect(markup).toContain("Workflow is terminal");
    expect(markup).toContain("Complete workflow");
    expect(markup).toContain("Open terminal step");
    expect(markup).not.toContain("Activate next step");
  });

  it("opens a confirmation dialog before completing a terminal workflow", async () => {
    const user = userEvent.setup();
    const detail = buildWorkflowDetail({
      state: "terminal_no_next_step",
      terminalStep: {
        stepExecutionId: "step-terminal",
        stepDefinitionId: "step-finish",
        stepType: "display",
        status: "completed",
        activatedAt: "2026-03-28T12:03:00.000Z",
        completedAt: "2026-03-28T12:04:00.000Z",
        target: { page: "step-execution-detail", stepExecutionId: "step-terminal" },
      },
    });
    detail.workflowExecution.status = "active";
    delete detail.workflowExecution.completedAt;
    detail.completeAction = {
      kind: "complete_workflow_execution",
      enabled: true,
    };

    const { completeWorkflowExecutionMutationOptionsMock } = await (async () => {
      const getRuntimeWorkflowExecutionDetailQueryOptionsMock = vi.fn(
        (_input: { input: { projectId: string; workflowExecutionId: string } }) => ({
          queryKey: [
            "runtime-workflow-execution-detail",
            "project-1",
            "we_story_start_primary_003",
          ],
          queryFn: async () => detail,
        }),
      );

      const retrySameWorkflowMutationOptionsMock = vi.fn(() => ({ mutationFn: async () => ({}) }));
      const activateWorkflowStepExecutionMutationOptionsMock = vi.fn(() => ({
        mutationFn: async () => ({}),
      }));
      const completeWorkflowExecutionMutationOptionsMock = vi.fn(() => ({
        mutationFn: async () => ({
          workflowExecutionId: detail.workflowExecution.workflowExecutionId,
          status: "completed" as const,
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
          completeWorkflowExecution: {
            mutationOptions: completeWorkflowExecutionMutationOptionsMock,
          },
          activateWorkflowStepExecution: {
            mutationOptions: activateWorkflowStepExecutionMutationOptionsMock,
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

      render(
        <QueryClientProvider client={queryClient}>
          <WorkflowExecutionDetailRoute />
        </QueryClientProvider>,
      );

      return { completeWorkflowExecutionMutationOptionsMock };
    })();

    await user.click(screen.getByRole("button", { name: "Complete workflow" }));

    expect(screen.getByText("Complete workflow execution?")).toBeTruthy();
    expect(screen.getByText(/mark the workflow execution as finished/i)).toBeTruthy();
    expect(completeWorkflowExecutionMutationOptionsMock).toHaveBeenCalled();
  });

  it("renders invalid-definition blocking summary card", async () => {
    const { markup } = await renderWorkflowDetailRoute(
      buildWorkflowDetail({
        state: "invalid_definition",
        reason: "ambiguous_entry_step",
      }),
    );

    expect(markup).toContain("Workflow definition is invalid");
    expect(markup).toContain("Multiple entry steps were derived");
    expect(markup).not.toContain("Activate entry step");
    expect(markup).not.toContain("Activate next step");
  });

  it("renders read-only context-fact dialog empty, single, and multi-instance layouts", () => {
    const emptyMarkup = renderToStaticMarkup(
      <WorkflowContextFactDialog
        group={baseContextGroups[0]!}
        open
        onOpenChange={() => undefined}
      />,
    );
    const singleMarkup = renderToStaticMarkup(
      <WorkflowContextFactDialog
        group={{
          contextFactDefinitionId: "ctx-reference-workflow",
          definitionKey: "reference_workflow",
          definitionLabel: "Reference Workflow",
          definitionDescriptionJson: { markdown: "Reference another workflow." },
          instances: [
            {
              contextFactInstanceId: "ctx-reference-workflow-1",
              instanceOrder: 0,
              valueJson: { workflowDefinitionId: "wf.generate-project-context" },
              recordedAt: "2026-03-28T12:05:00.000Z",
            },
          ],
        }}
        open
        onOpenChange={() => undefined}
      />,
    );
    const multiMarkup = renderToStaticMarkup(
      <WorkflowContextFactDialog
        group={{
          contextFactDefinitionId: "ctx-reference-artifact",
          definitionKey: "reference_artifact",
          definitionLabel: "Reference Artifact",
          definitionDescriptionJson: { markdown: "Reference the setup README artifact slot." },
          instances: [
            {
              contextFactInstanceId: "ctx-reference-artifact-1",
              instanceOrder: 0,
              valueJson: { relativePath: "docs/setup/README.md" },
              recordedAt: "2026-03-28T12:05:00.000Z",
            },
            {
              contextFactInstanceId: "ctx-reference-artifact-2",
              instanceOrder: 1,
              valueJson: { relativePath: "apps/web/src/routes/projects.new.tsx" },
              recordedAt: "2026-03-28T12:06:00.000Z",
            },
          ],
        }}
        open
        onOpenChange={() => undefined}
      />,
    );

    expect(emptyMarkup).toContain("No current instances recorded for this definition.");
    expect(singleMarkup).toContain("Workflow definition ID");
    expect(singleMarkup).toContain("wf.generate-project-context");
    expect(multiMarkup).toContain("Instance 1");
    expect(multiMarkup).toContain("Instance 2");
    expect(multiMarkup).toContain("Relative path");
    expect(multiMarkup).toContain("docs/setup/README.md");
    expect(multiMarkup).toContain("max-h-[min(85vh,48rem)]");
    expect(multiMarkup).toContain("overflow-y-auto");
  });

  it("keeps the workflow detail query key stable", () => {
    expect(
      runtimeWorkflowExecutionDetailQueryKey("project-1", "we_story_start_primary_003"),
    ).toEqual(["runtime-workflow-execution-detail", "project-1", "we_story_start_primary_003"]);
  });
});
