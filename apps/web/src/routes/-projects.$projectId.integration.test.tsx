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
  MethodologyWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { ProjectDashboardRoute } from "./projects.$projectId.index";

function createHarness() {
  const orpc = {
    project: {
      getProjectDetails: {
        queryOptions: () => ({
          queryKey: ["project", "details", "project-1"],
          queryFn: async () => ({
            project: {
              id: "project-1",
              displayName: "Aurora Orion 123",
              createdAt: "2026-03-03T10:00:00.000Z",
              updatedAt: "2026-03-03T12:00:00.000Z",
            },
            pin: {
              projectId: "project-1",
              methodologyVersionId: "v1-id",
              methodologyKey: "spiral.v1",
              publishedVersion: "1.0.0",
              actorId: "operator-1",
              timestamp: "2026-03-03T12:00:00.000Z",
            },
            lineage: [],
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
  useRouteContextMock.mockReturnValue({
    orpc,
    queryClient,
  });

  return { queryClient };
}

describe("project dashboard route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders project overview, active pin summary, and pinning navigation", async () => {
    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectDashboardRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Project overview")).toBeTruthy();
    expect(await screen.findByText("Aurora Orion 123")).toBeTruthy();
    expect(screen.getByText("Active methodology pin")).toBeTruthy();
    expect(await screen.findByText("spiral.v1")).toBeTruthy();

    const managePinningLink = screen.getByRole("link", { name: "Open pinning workspace" });
    expect(managePinningLink.getAttribute("href")).toBe("/projects/$projectId/pinning");
  });

  it("retains runtime boundary copy on dashboard", async () => {
    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectDashboardRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Workflow runtime execution unlocks in Epic 3+")).toBeTruthy();
  });
});
