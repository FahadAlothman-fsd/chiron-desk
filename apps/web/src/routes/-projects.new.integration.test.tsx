import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useNavigateMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useNavigateMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useNavigate: () => useNavigateMock,
  }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { CreateProjectRoute } from "./projects.new";

function comboboxForCard(cardTitle: string): HTMLButtonElement {
  const titleElement = screen.getByText(cardTitle);
  const card = titleElement.closest("label");
  if (!card) {
    throw new Error(`Card not found for ${cardTitle}`);
  }

  return within(card).getByRole("combobox") as HTMLButtonElement;
}

function createHarness() {
  const createAndPinSpy = vi.fn(async () => ({
    project: {
      id: "project-42",
      createdAt: "2026-03-03T12:00:00.000Z",
      updatedAt: "2026-03-03T12:00:00.000Z",
    },
    pinned: true,
    diagnostics: { valid: true, diagnostics: [] },
    pin: {
      projectId: "project-42",
      methodologyVersionId: "bmad-v11",
      methodologyKey: "bmad.v1",
      publishedVersion: "1.1.0",
      actorId: "operator-1",
      timestamp: "2026-03-03T12:00:00.000Z",
    },
  }));

  const invalidateQueriesSpy = vi.fn(async () => undefined);

  const orpc = {
    methodology: {
      listMethodologies: {
        queryOptions: () => ({
          queryKey: ["methodology", "catalog"],
          queryFn: async () => [
            {
              methodologyId: "m1",
              methodologyKey: "bmad.v1",
              displayName: "BMAD v1",
              hasDraftVersion: true,
              availableVersions: 2,
              updatedAt: "2026-03-03T10:00:00.000Z",
            },
            {
              methodologyId: "m2",
              methodologyKey: "spiral.v1",
              displayName: "Spiral v1",
              hasDraftVersion: false,
              availableVersions: 1,
              updatedAt: "2026-03-03T09:00:00.000Z",
            },
            {
              methodologyId: "m3",
              methodologyKey: "lean.v1",
              displayName: "Lean Canvas",
              hasDraftVersion: false,
              availableVersions: 0,
              updatedAt: "2026-03-03T08:00:00.000Z",
            },
          ],
        }),
      },
      getMethodologyDetails: {
        queryOptions: ({ input }: { input: { methodologyKey: string } }) => ({
          queryKey: ["methodology", "details", input.methodologyKey],
          queryFn: async () => {
            if (input.methodologyKey === "bmad.v1") {
              return {
                methodologyId: "m1",
                methodologyKey: "bmad.v1",
                displayName: "BMAD v1",
                descriptionJson: { summary: "Structured iterative BMAD delivery." },
                createdAt: "2026-03-03T08:00:00.000Z",
                updatedAt: "2026-03-03T10:00:00.000Z",
                versions: [
                  {
                    id: "bmad-v10",
                    version: "1.0.0",
                    status: "active",
                    displayName: "BMAD 1.0.0",
                    createdAt: "2026-03-03T09:00:00.000Z",
                    retiredAt: null,
                  },
                  {
                    id: "bmad-v11",
                    version: "1.1.0",
                    status: "active",
                    displayName: "BMAD 1.1.0",
                    createdAt: "2026-03-03T10:00:00.000Z",
                    retiredAt: null,
                  },
                ],
              };
            }

            if (input.methodologyKey === "spiral.v1") {
              return {
                methodologyId: "m2",
                methodologyKey: "spiral.v1",
                displayName: "Spiral v1",
                descriptionJson: { summary: "Spiral strategy with milestone loops." },
                createdAt: "2026-03-03T06:00:00.000Z",
                updatedAt: "2026-03-03T09:00:00.000Z",
                versions: [
                  {
                    id: "spiral-v09",
                    version: "0.9.0",
                    status: "active",
                    displayName: "Spiral 0.9.0",
                    createdAt: "2026-03-03T07:00:00.000Z",
                    retiredAt: null,
                  },
                ],
              };
            }

            return {
              methodologyId: "m3",
              methodologyKey: "lean.v1",
              displayName: "Lean Canvas",
              descriptionJson: { summary: "Lean planning baseline." },
              createdAt: "2026-03-03T05:00:00.000Z",
              updatedAt: "2026-03-03T08:00:00.000Z",
              versions: [],
            };
          },
        }),
      },
    },
    project: {
      listProjects: {
        queryOptions: () => ({
          queryKey: ["project", "list"],
          queryFn: async () => [],
        }),
      },
      createAndPinProject: {
        mutationOptions: () => ({
          mutationFn: createAndPinSpy,
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
    queryClient: {
      ...queryClient,
      invalidateQueries: invalidateQueriesSpy,
    },
  });
  useNavigateMock.mockResolvedValue(undefined);

  return { queryClient, createAndPinSpy };
}

describe("create project route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders three methodology cards each with embedded combobox and bottom radio selector", async () => {
    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <CreateProjectRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Create a project from a pinned methodology")).toBeTruthy();
    expect(await screen.findByRole("radio", { name: "Select BMAD v1" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Select Spiral v1" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Select Lean Canvas" })).toBeTruthy();

    expect(screen.getAllByRole("combobox").length).toBe(3);
    expect(screen.getAllByRole("radio").length).toBe(3);
    expect(screen.getByText("Structured iterative BMAD delivery.")).toBeTruthy();

    const projectNameInput = screen.getByLabelText("Project name") as HTMLInputElement;
    expect(projectNameInput.value.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(comboboxForCard("BMAD v1").textContent).toContain("1.1.0");
      expect(comboboxForCard("Spiral v1").textContent).toContain("0.9.0");
    });
  });

  it("shows blocked state for empty methodology and allows create after choosing version in selected card", async () => {
    const { queryClient, createAndPinSpy } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <CreateProjectRoute />
      </QueryClientProvider>,
    );

    await screen.findByRole("radio", { name: "Select BMAD v1" });

    fireEvent.click(screen.getByText("Lean Canvas"));
    expect(comboboxForCard("Lean Canvas").disabled).toBe(true);
    expect(
      screen.getByText(
        "No published versions available for selected methodology. Publish an eligible version first.",
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByText("BMAD v1"));

    const bmadCombobox = comboboxForCard("BMAD v1");
    await waitFor(() => {
      expect(bmadCombobox.disabled).toBe(false);
      expect(bmadCombobox.textContent).toContain("1.1.0");
    });

    fireEvent.click(bmadCombobox);
    fireEvent.click(await screen.findByText("1.0.0"));

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Aurora Atlas 321" },
    });

    const createButton = screen.getByRole("button", { name: "Create and pin project" });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createAndPinSpy).toHaveBeenCalled();
      const firstCallInput = (createAndPinSpy.mock.calls as unknown[][])[0]?.[0];
      expect(firstCallInput).toEqual({
        methodologyKey: "bmad.v1",
        publishedVersion: "1.0.0",
        name: "Aurora Atlas 321",
      });
    });
  });
});
