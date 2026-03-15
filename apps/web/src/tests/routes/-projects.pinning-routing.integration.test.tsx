import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

vi.mock("@/components/app-shell", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));

vi.mock("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtools: () => null,
}));

vi.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => null,
}));

afterEach(() => {
  cleanup();
});

describe("project pinning route wiring", () => {
  it("renders pinning page content at /projects/$projectId/pinning", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    const orpc = {
      project: {
        listProjects: {
          queryOptions: () => ({
            queryKey: ["project", "list"],
            queryFn: async () => [],
          }),
        },
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
      methodology: {
        listMethodologies: {
          queryOptions: () => ({
            queryKey: ["methodology", "catalog"],
            queryFn: async () => [],
          }),
        },
        getMethodologyDetails: {
          queryOptions: () => ({
            queryKey: ["methodology", "details", "spiral.v1"],
            queryFn: async () => ({ versions: [] }),
          }),
        },
        repinProjectMethodologyVersion: {
          mutationOptions: () => ({
            mutationFn: async () => ({
              repinned: false,
              diagnostics: { valid: true, diagnostics: [] },
              pin: null,
            }),
          }),
        },
      },
    };

    const router = createRouter({
      routeTree,
      history: createMemoryHistory({
        initialEntries: ["/projects/project-1/pinning"],
      }),
      context: {
        queryClient,
        orpc: orpc as never,
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Pinning operations")).toBeTruthy();
  });
});
