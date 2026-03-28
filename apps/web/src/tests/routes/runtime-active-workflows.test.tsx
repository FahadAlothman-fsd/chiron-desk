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

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children, ...props }: { children: ReactNode }) => <table {...props}>{children}</table>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableRow: ({ children, ...props }: { children: ReactNode }) => <tr {...props}>{children}</tr>,
  TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div>loading</div>,
}));

import { ProjectActiveWorkflowsRoute } from "../../routes/projects.$projectId.workflows";

async function renderActiveWorkflowsRoute() {
  const getRuntimeActiveWorkflowsQueryOptionsMock = vi.fn(
    (_input?: { input: { projectId: string } }) => ({
      queryKey: ["runtime-active-workflows", "project-1"],
      queryFn: async () => [
        {
          workflowExecutionId: "we_story_start_primary_001",
          workflowId: "wf_story_start_primary",
          workflowKey: "WF.STORY.START.PRIMARY",
          workflowName: "Start story workflow",
          workUnit: {
            projectWorkUnitId: "wu_story_001",
            workUnitTypeId: "wut_story",
            workUnitTypeKey: "WU.STORY",
            workUnitLabel: "wut_story:wu_story",
          },
          transition: {
            transitionExecutionId: "te_story_start_001",
            transitionId: "tr_story_start",
            transitionKey: "TR.STORY.START",
            transitionName: "Start story",
          },
          startedAt: "2026-03-28T12:00:00.000Z",
          target: {
            page: "workflow-execution-detail",
            workflowExecutionId: "we_story_start_primary_001",
          },
        },
      ],
    }),
  );

  const orpc = {
    project: {
      getRuntimeActiveWorkflows: {
        queryOptions: getRuntimeActiveWorkflowsQueryOptionsMock,
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
  useSearchMock.mockReturnValue({ q: "", workUnitTypeKey: "all" });
  useRouteContextMock.mockReturnValue({ orpc, queryClient });

  await queryClient.prefetchQuery(
    orpc.project.getRuntimeActiveWorkflows.queryOptions({
      input: { projectId: "project-1" },
    }),
  );

  const markup = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <ProjectActiveWorkflowsRoute />
    </QueryClientProvider>,
  );

  return { markup, getRuntimeActiveWorkflowsQueryOptionsMock };
}

describe("runtime active workflows route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders active-only workflow execution table with workflow-detail navigation", async () => {
    const { markup, getRuntimeActiveWorkflowsQueryOptionsMock } =
      await renderActiveWorkflowsRoute();

    expect(markup).toContain("Active workflows");
    expect(markup).toContain("Work Unit");
    expect(markup).toContain("Transition");
    expect(markup).toContain("Workflow Execution");
    expect(markup).toContain("Started At");
    expect(markup).toContain("Start story workflow");
    expect(markup).toContain("WU.STORY");
    expect(markup).toContain("TR.STORY.START");
    expect(markup).toContain("runtime-active-workflows-table");
    expect(markup).toContain(
      'href="/projects/$projectId/workflow-executions/$workflowExecutionId"',
    );
    expect(markup).not.toContain("Status");

    expect(getRuntimeActiveWorkflowsQueryOptionsMock).toHaveBeenCalledWith({
      input: { projectId: "project-1" },
    });
  });
});
