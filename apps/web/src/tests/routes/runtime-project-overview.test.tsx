import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useParamsMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useParamsMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useParams: useParamsMock,
  }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  buttonVariants: () => "",
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock("@/features/methodologies/foundation", () => ({
  getDeterministicState: () => "normal",
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | null | false>) => classes.filter(Boolean).join(" "),
}));

import { ProjectDashboardRoute } from "../../routes/projects.$projectId.index";

async function renderOverviewRoute() {
  const getRuntimeOverviewQueryOptionsMock = vi.fn((_input?: { input: { projectId: string } }) => ({
    queryKey: ["runtime-overview", "project-1"],
    queryFn: async () => ({
      stats: {
        factTypesWithInstances: {
          current: 3,
          total: 5,
          subtitle: "3 fact types currently instantiated",
          target: { page: "project-facts", filters: { existence: "exists" } },
        },
        workUnitTypesWithInstances: {
          current: 2,
          total: 4,
          subtitle: "2 work-unit types currently instantiated",
          target: { page: "work-units" },
        },
        activeTransitions: {
          count: 1,
          subtitle: "1 transition currently active",
          target: { page: "runtime-guidance", section: "active" },
        },
      },
      activeWorkflows: [
        {
          workflowExecutionId: "we-1",
          workflowId: "wf-1",
          workflowKey: "document-project",
          workflowName: "Document project",
          workUnit: {
            projectWorkUnitId: "wu-1",
            workUnitTypeId: "wut-1",
            workUnitTypeKey: "WU.PROJECT_CONTEXT",
            workUnitLabel: "Project Context",
          },
          transition: {
            transitionExecutionId: "te-1",
            transitionId: "t-1",
            transitionKey: "start",
            transitionName: "Start",
          },
          startedAt: "2026-03-28T12:00:00.000Z",
          target: { page: "workflow-execution-detail", workflowExecutionId: "we-1" },
        },
      ],
      goToGuidanceTarget: { page: "runtime-guidance" },
      goToGuidanceHref: "/projects/project-1/transitions",
    }),
  }));

  const getRuntimeGuidanceActiveQueryOptionsMock = vi.fn(
    (_input?: { input: { projectId: string } }) => ({
      queryKey: ["runtime-guidance-active", "project-1"],
      queryFn: async () => ({
        activeWorkUnitCards: [
          {
            projectWorkUnitId: "wu-1",
            workUnitTypeId: "wut-1",
            workUnitTypeKey: "seed:wut:setup:mver_bmad_v1_active",
            workUnitTypeName: "Setup",
            currentStateKey: "activation",
            currentStateLabel: "Activation",
            factSummary: { currentCount: 0, totalCount: 0 },
            artifactSummary: { currentCount: 0, totalCount: 0 },
            activeTransition: {
              transitionExecutionId: "te-1",
              transitionId: "t-1",
              transitionKey: "seed:transition:setup:activation-to-done:mver_bmad_v1_active",
              transitionName: "Setup Activation To Done Mver Bmad V1 Active",
              toStateKey: "done",
              toStateLabel: "Done",
              status: "active",
              readyForCompletion: true,
            },
            activePrimaryWorkflow: {
              workflowExecutionId: "we-1",
              workflowId: "wf-1",
              workflowKey: "seed:workflow:setup:setup-project:mver_bmad_v1_active",
              workflowName: "Setup Setup Project Mver Bmad V1 Active",
              status: "active",
            },
            actions: {
              primary: { kind: "open_workflow", workflowExecutionId: "we-1" },
              openTransitionTarget: { transitionExecutionId: "te-1" },
              openWorkflowTarget: { workflowExecutionId: "we-1" },
            },
          },
        ],
      }),
    }),
  );

  const orpc = {
    project: {
      getRuntimeOverview: {
        queryOptions: getRuntimeOverviewQueryOptionsMock,
      },
      getRuntimeGuidanceActive: {
        queryOptions: getRuntimeGuidanceActiveQueryOptionsMock,
      },
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  useParamsMock.mockReturnValue({ projectId: "project-1" });
  useRouteContextMock.mockReturnValue({ orpc, queryClient });

  await queryClient.prefetchQuery(
    orpc.project.getRuntimeOverview.queryOptions({ input: { projectId: "project-1" } }),
  );

  await queryClient.prefetchQuery(
    orpc.project.getRuntimeGuidanceActive.queryOptions({ input: { projectId: "project-1" } }),
  );

  const markup = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <ProjectDashboardRoute />
    </QueryClientProvider>,
  );

  return {
    markup,
    getRuntimeOverviewQueryOptionsMock,
    getRuntimeGuidanceActiveQueryOptionsMock,
  };
}

describe("runtime project overview route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders runtime-backed overview cards, active guidance cards, and guidance CTA", async () => {
    const { markup, getRuntimeOverviewQueryOptionsMock, getRuntimeGuidanceActiveQueryOptionsMock } =
      await renderOverviewRoute();

    expect(markup).toContain("Fact types with instances");
    expect(markup).toContain("Work-unit types with instances");
    expect(markup).toContain("Active transitions");
    expect(markup).toContain("Active guidance");
    expect(markup).toContain("Active transition");
    expect(markup).toContain("Primary workflow");
    expect(markup).toContain("Open transition detail");
    expect(markup).toContain("Open workflow detail");
    expect(markup).toContain("Go to Guidance");

    expect(markup).toContain('href="/projects/$projectId/facts"');
    expect(markup).toContain('href="/projects/$projectId/work-units"');
    expect(markup).toContain('href="/projects/$projectId/transitions"');
    expect(markup).toContain(
      'href="/projects/$projectId/transition-executions/$transitionExecutionId"',
    );
    expect(markup).toContain(
      'href="/projects/$projectId/workflow-executions/$workflowExecutionId"',
    );
    expect(getRuntimeOverviewQueryOptionsMock).toHaveBeenCalledWith({
      input: { projectId: "project-1" },
    });
    expect(getRuntimeGuidanceActiveQueryOptionsMock).toHaveBeenCalledWith({
      input: { projectId: "project-1" },
    });
  });
});
