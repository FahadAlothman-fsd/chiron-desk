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

type MethodologyVersionFixture = {
  id: string;
  version: string;
  status: string;
  displayName: string;
  createdAt: string;
  retiredAt: string | null;
};

type HarnessOptions = {
  createAndPinImpl?: (input: unknown) => Promise<unknown>;
  detailsByMethodologyKey?: Record<
    string,
    {
      summary: string;
      versions: MethodologyVersionFixture[];
    }
  >;
};

function comboboxForCard(cardTitle: string): HTMLButtonElement {
  const titleElement = screen.getByText(cardTitle);
  const card = titleElement.closest("label");
  if (!card) {
    throw new Error(`Card not found for ${cardTitle}`);
  }

  return within(card).getByRole("combobox") as HTMLButtonElement;
}

function createHarness(options: HarnessOptions = {}) {
  const createAndPinSpy = vi.fn(
    options.createAndPinImpl ??
      (async () => ({
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
      })),
  );

  const detailsByMethodologyKey: Record<
    string,
    {
      summary: string;
      versions: MethodologyVersionFixture[];
    }
  > = {
    "bmad.v1": {
      summary: "Structured iterative BMAD delivery.",
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
    },
    "spiral.v1": {
      summary: "Spiral strategy with milestone loops.",
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
    },
    "lean.v1": {
      summary: "Lean planning baseline.",
      versions: [],
    },
    ...options.detailsByMethodologyKey,
  };

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
            const details = detailsByMethodologyKey[input.methodologyKey];
            if (!details) {
              return {
                methodologyId: "m0",
                methodologyKey: input.methodologyKey,
                displayName: input.methodologyKey,
                descriptionJson: { summary: "Unknown methodology." },
                createdAt: "2026-03-03T05:00:00.000Z",
                updatedAt: "2026-03-03T08:00:00.000Z",
                versions: [],
              };
            }

            return {
              methodologyId:
                input.methodologyKey === "bmad.v1"
                  ? "m1"
                  : input.methodologyKey === "spiral.v1"
                    ? "m2"
                    : "m3",
              methodologyKey: input.methodologyKey,
              displayName:
                input.methodologyKey === "bmad.v1"
                  ? "BMAD v1"
                  : input.methodologyKey === "spiral.v1"
                    ? "Spiral v1"
                    : "Lean Canvas",
              descriptionJson: { summary: details.summary },
              createdAt: "2026-03-03T05:00:00.000Z",
              updatedAt: "2026-03-03T10:00:00.000Z",
              versions: details.versions,
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
        mutationOptions: (mutationLifecycle?: {
          onSuccess?: (result: unknown) => Promise<void> | void;
          onError?: (error: unknown) => Promise<void> | void;
        }) => ({
          mutationFn: (input: unknown) =>
            createAndPinSpy(input).then(
              async (result: unknown) => {
                await mutationLifecycle?.onSuccess?.(result);
                return result;
              },
              async (error: unknown) => {
                await mutationLifecycle?.onError?.(error);
                throw error;
              },
            ),
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

    const createButton = screen.getByRole("button", {
      name: "Create and pin project",
    }) as HTMLButtonElement;
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

  it("renders deterministic diagnostics when create-and-pin transport fails", async () => {
    const { queryClient } = createHarness({
      createAndPinImpl: async () => Promise.reject(new Error("gateway timeout")),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CreateProjectRoute />
      </QueryClientProvider>,
    );

    await screen.findByRole("radio", { name: "Select BMAD v1" });

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Aurora Atlas 321" },
    });

    fireEvent.click(screen.getByText("BMAD v1"));

    const createButton = screen.getByRole("button", {
      name: "Create and pin project",
    }) as HTMLButtonElement;
    await waitFor(() => {
      expect(createButton.disabled).toBe(false);
    });

    fireEvent.click(createButton);

    expect(await screen.findByText("PROJECT_PIN_TRANSPORT_ERROR")).toBeTruthy();
    expect(screen.getByText("scope: project.pin.transport")).toBeTruthy();
    expect(screen.getByText(/Observed:/)).toBeTruthy();
    expect(screen.getByText(/gateway timeout/)).toBeTruthy();
    expect(screen.getByText(/evidenceRef:/)).toBeTruthy();
  });

  it("treats non-active statuses as unpublished for methodology selection", async () => {
    const { queryClient } = createHarness({
      detailsByMethodologyKey: {
        "lean.v1": {
          summary: "Lean planning baseline.",
          versions: [
            {
              id: "lean-v99",
              version: "9.9.0",
              status: "published",
              displayName: "Lean 9.9.0",
              createdAt: "2026-03-03T10:30:00.000Z",
              retiredAt: null,
            },
          ],
        },
      },
    });

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
  });
});
