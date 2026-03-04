import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useLocationMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useLocationMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
  }),
  useLocation: useLocationMock,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { ProjectsRoute } from "./projects";

function createTestHarness() {
  const orpc = {
    project: {
      listProjects: {
        queryOptions: () => ({
          queryKey: ["project", "list"],
          queryFn: async () => [
            {
              id: "project-1",
              createdAt: "2026-03-03T10:00:00.000Z",
              updatedAt: "2026-03-03T10:00:00.000Z",
            },
          ],
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

  useRouteContextMock.mockReturnValue({
    orpc,
    queryClient,
  });
  useLocationMock.mockReturnValue({ pathname: "/projects" });

  return { queryClient };
}

describe("projects route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders project operations overview with create navigation", async () => {
    const { queryClient } = createTestHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectsRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Manage your Chiron projects")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create Project" }).getAttribute("href")).toBe(
      "/projects/new",
    );
    const openProjectLink = await screen.findByRole("link", { name: "Open Project" });
    expect(openProjectLink.getAttribute("href")).toBe("/projects/$projectId");
  });

  it("retains runtime boundary copy in overview page", async () => {
    const { queryClient } = createTestHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectsRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Workflow runtime execution unlocks in Epic 3+")).toBeTruthy();
  });
});
