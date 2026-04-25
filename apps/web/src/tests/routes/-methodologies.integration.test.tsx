import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { toastSuccessMock, useLocationMock, useNavigateMock, useRouteContextMock } = vi.hoisted(
  () => ({
    toastSuccessMock: vi.fn(),
    useLocationMock: vi.fn(),
    useNavigateMock: vi.fn(),
    useRouteContextMock: vi.fn(),
  }),
);

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useSearch: () => ({}),
    useNavigate: () => useNavigateMock,
  }),
  useLocation: useLocationMock,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  Outlet: () => null,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@base-ui/react/dialog", () => ({
  Dialog: {
    Root: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Trigger: ({ render }: { render: ReactNode }) => render,
    Portal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Backdrop: () => null,
    Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Title: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Description: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Close: ({ render }: { render: ReactNode }) => render,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: vi.fn(),
  },
}));

import { MethodologiesRoute } from "../../routes/methodologies";

function createTestHarness() {
  const seedCatalogMock = vi.fn(async () => ({
    methodologyKey: "bmad.slice-a.v1",
    methodologyId: "mdef_bmad_v1",
    displayName: "BMAD v1 — Slice A",
    versionIds: ["mver_bmad_v1_draft", "mver_bmad_v1_active"],
    versionCount: 2,
    clearedTableCount: 14,
    seededTableCount: 14,
    insertedCanonicalRowCount: 128,
  }));

  const orpc = {
    methodology: {
      listMethodologies: {
        queryOptions: () => ({
          queryKey: ["methodologies", "list"],
          queryFn: async () => [],
        }),
      },
      createMethodology: {
        mutationOptions: (options?: Record<string, unknown>) => ({
          mutationFn: async () => null,
          ...options,
        }),
      },
      catalog: {
        seed: {
          mutationOptions: (options?: Record<string, unknown>) => ({
            mutationFn: seedCatalogMock,
            ...options,
          }),
        },
      },
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

  useRouteContextMock.mockReturnValue({ orpc, queryClient });
  useLocationMock.mockReturnValue({ pathname: "/methodologies" });

  return { invalidateQueriesSpy, queryClient, seedCatalogMock };
}

describe("methodologies route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a visible BMAD seed action and refreshes the catalog after seeding", async () => {
    const { invalidateQueriesSpy, queryClient, seedCatalogMock } = createTestHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <MethodologiesRoute />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Seed / Update BMAD" }));

    await waitFor(() => {
      expect(seedCatalogMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["methodologies", "list"],
      });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("BMAD seeded (2 versions, 128 canonical rows).");
  });
});
