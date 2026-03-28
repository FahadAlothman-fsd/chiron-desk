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

  const orpc = {
    project: {
      getRuntimeOverview: {
        queryOptions: getRuntimeOverviewQueryOptionsMock,
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

  const markup = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <ProjectDashboardRoute />
    </QueryClientProvider>,
  );

  return { markup, getRuntimeOverviewQueryOptionsMock };
}

describe("runtime project overview route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders runtime-backed overview cards, active workflows, and guidance CTA", async () => {
    const { markup, getRuntimeOverviewQueryOptionsMock } = await renderOverviewRoute();

    expect(markup).toContain("Fact types with instances");
    expect(markup).toContain("Work-unit types with instances");
    expect(markup).toContain("Active transitions");
    expect(markup).toContain("Active workflows");
    expect(markup).toContain("Document project");
    expect(markup).toContain("WU.PROJECT_CONTEXT");
    expect(markup).toContain("Go to Guidance");

    expect(markup).toContain('href="/projects/$projectId/facts"');
    expect(markup).toContain('href="/projects/$projectId/work-units"');
    expect(markup).toContain('href="/projects/$projectId/transitions"');
    expect(markup).not.toContain("Runtime Execution (Epic 3+)");

    expect(getRuntimeOverviewQueryOptionsMock).toHaveBeenCalledWith({
      input: { projectId: "project-1" },
    });
  });
});
