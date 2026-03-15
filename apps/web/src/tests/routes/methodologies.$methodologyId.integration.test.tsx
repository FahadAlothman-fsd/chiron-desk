import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useLocationMock, useNavigateMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useLocationMock: vi.fn(),
  useNavigateMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useParams: () => ({ methodologyId: "bmad.v1" }),
  }),
  useLocation: useLocationMock,
  useNavigate: () => useNavigateMock,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  Outlet: () => null,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { MethodologyDetailsRoute } from "../../routes/methodologies.$methodologyId";

function createTestHarness() {
  const orpc = {
    methodology: {
      listMethodologies: {
        queryOptions: () => ({ queryKey: ["methodologies", "list"], queryFn: async () => [] }),
      },
      getMethodologyDetails: {
        queryOptions: () => ({
          queryKey: ["methodology", "detail", "bmad.v1"],
          queryFn: async () => ({
            methodologyId: "mdef_story_2_7_bmad_v1",
            methodologyKey: "bmad.v1",
            displayName: "BMAD v1",
            descriptionJson: { summary: "Project-context-only canonical mapping for Story 2.7." },
            createdAt: "2026-03-09T21:42:43.783Z",
            updatedAt: "2026-03-09T21:42:43.783Z",
            versions: [
              {
                id: "mver_bmad_project_context_only_draft",
                version: "v2-draft",
                status: "draft",
                displayName: "BMAD v1",
                createdAt: "2026-03-10T09:42:43.783Z",
                retiredAt: null,
              },
              {
                id: "mver_bmad_project_context_only_active",
                version: "v1",
                status: "active",
                displayName: "BMAD v1",
                createdAt: "2026-03-09T21:42:43.783Z",
                retiredAt: null,
              },
            ],
          }),
        }),
      },
      getDraftProjection: {
        queryOptions: () => ({
          queryKey: ["methodology", "draft", "mver_bmad_project_context_only_draft"],
          queryFn: async () => ({
            factDefinitions: [
              {
                name: "Repository URL",
                key: "repo_url",
                factType: "string",
                defaultValue: "https://example.com/repo.git",
                validation: { kind: "none" },
              },
            ],
          }),
        }),
      },
      createDraftVersion: { mutationOptions: () => ({ mutationFn: async () => null }) },
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  useRouteContextMock.mockReturnValue({ orpc, queryClient });
  useLocationMock.mockReturnValue({ pathname: "/methodologies/bmad.v1" });

  return { queryClient };
}

describe("methodology details route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a dashboard-style fact inventory and links out to the facts editor", async () => {
    const { queryClient } = createTestHarness();
    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyDetailsRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("BMAD v1")).toBeTruthy();
    expect(screen.getByText("Fact Inventory")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Fact" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Type" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Guidance" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Facts Editor" }).getAttribute("href")).toBe(
      "/methodologies/$methodologyId/versions/$versionId/facts",
    );
    expect(screen.queryByRole("columnheader", { name: "Actions" })).toBeNull();
    expect(screen.queryByText("Metadata")).toBeNull();
    expect(screen.queryByText("Runtime")).toBeNull();
  });
});
