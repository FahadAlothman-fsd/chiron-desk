import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  MethodologyWorkspaceShell: ({ title, children }: { title?: string; children: ReactNode }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

import { ProjectDashboardRoute } from "../../routes/projects.$projectId.index";

function createHarness(options?: { activeWorkflows?: Array<Record<string, unknown>> }) {
  const orpc = {
    project: {
      getRuntimeOverview: {
        queryOptions: () => ({
          queryKey: ["runtime-overview", "project-1"],
          queryFn: async () => ({
            stats: {
              factTypesWithInstances: {
                current: 2,
                total: 5,
                subtitle: "Fact types already populated in runtime.",
                target: { filters: { existence: "exists" as const } },
              },
              workUnitTypesWithInstances: {
                current: 1,
                total: 4,
                subtitle: "Work-unit types materialized for this project.",
              },
              activeTransitions: {
                count: 1,
                subtitle: "Transitions currently in flight.",
              },
            },
            activeWorkflows: options?.activeWorkflows ?? [
              {
                workflowExecutionId: "we-1",
                workflowName: "Document project",
                workflowKey: "document-project",
                startedAt: "2026-03-03T12:00:00.000Z",
                workUnit: { workUnitTypeKey: "WU.PROJECT_CONTEXT" },
                transition: { transitionKey: "start" },
              },
            ],
          }),
        }),
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

  return { queryClient };
}

describe("project dashboard route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders runtime overview stat cards and guidance navigation", async () => {
    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectDashboardRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Project overview")).toBeTruthy();
    expect(await screen.findByText("2/5")).toBeTruthy();
    expect(screen.getByText("Runtime project overview")).toBeTruthy();
    expect(screen.getByText("Fact types with instances")).toBeTruthy();
    expect(screen.getByText("Work-unit types with instances")).toBeTruthy();
    expect(screen.getByText("1/4")).toBeTruthy();
    expect(screen.getByText("Active transitions")).toBeTruthy();

    const guidanceLink = screen.getByRole("link", { name: /Go to Guidance/i });
    expect(guidanceLink.getAttribute("href")).toBe("/projects/$projectId/transitions");
  });

  it("renders active workflow rows with canonical runtime identifiers", async () => {
    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectDashboardRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Document project")).toBeTruthy();
    expect(screen.getByText("Active workflows")).toBeTruthy();
    expect(
      screen.getByText(/document-project · WU\.PROJECT_CONTEXT · transition start/i),
    ).toBeTruthy();
  });

  it("renders empty-state copy when no workflows are active", async () => {
    const { queryClient } = createHarness({ activeWorkflows: [] });

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectDashboardRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("No active workflows right now.")).toBeTruthy();
  });
});
