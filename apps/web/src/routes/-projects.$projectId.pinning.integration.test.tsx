import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

import { ProjectPinningRoute } from "./projects.$projectId.pinning";

function createHarness() {
  const invalidateQueriesSpy = vi.fn(async () => undefined);
  const repinSpy = vi.fn(async (_input?: unknown) => ({
    repinned: false,
    diagnostics: {
      valid: false,
      diagnostics: [
        {
          code: "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY",
          scope: "project.pin",
          blocking: true,
          required: "project has no persisted executions",
          observed: "project has execution history",
          remediation: "create a new project pinned to desired version",
          timestamp: "2026-03-03T12:00:00.000Z",
          evidenceRef: "project-pin-event:test",
        },
      ],
    },
    pin: {
      projectId: "project-1",
      methodologyVersionId: "v1-id",
      methodologyKey: "bmad.v1",
      publishedVersion: "1.0.0",
      actorId: "operator-1",
      timestamp: "2026-03-03T10:00:00.000Z",
    },
  }));

  const orpc = {
    project: {
      getProjectDetails: {
        queryOptions: () => ({
          queryKey: ["project", "details", "project-1"],
          queryFn: async () => ({
            project: {
              id: "project-1",
              displayName: "Mythic Athena 42",
              createdAt: "2026-03-03T10:00:00.000Z",
              updatedAt: "2026-03-03T10:00:00.000Z",
            },
            pin: {
              projectId: "project-1",
              methodologyVersionId: "v1-id",
              methodologyKey: "bmad.v1",
              publishedVersion: "1.0.0",
              actorId: "operator-1",
              timestamp: "2026-03-03T10:00:00.000Z",
            },
            lineage: [
              {
                id: "event-1",
                projectId: "project-1",
                eventType: "pinned",
                actorId: "operator-1",
                previousVersion: null,
                newVersion: "1.0.0",
                timestamp: "2026-03-03T10:00:00.000Z",
                evidenceRef: "project-pin-event:event-1",
              },
            ],
          }),
        }),
      },
    },
    methodology: {
      listMethodologies: {
        queryOptions: () => ({
          queryKey: ["methodology", "catalog"],
          queryFn: async () => [
            {
              methodologyId: "m1",
              methodologyKey: "bmad.v1",
              displayName: "BMAD v1",
              hasDraftVersion: false,
              availableVersions: 1,
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
          ],
        }),
      },
      getMethodologyDetails: {
        queryOptions: ({ input }: { input: { methodologyKey: string } }) => ({
          queryKey: ["methodology", "details", input.methodologyKey],
          queryFn: async () =>
            input.methodologyKey === "bmad.v1"
              ? {
                  versions: [
                    {
                      id: "v1-id",
                      version: "1.0.0",
                      status: "active",
                      displayName: "BMAD 1.0.0",
                      createdAt: "2026-03-03T10:00:00.000Z",
                      retiredAt: null,
                    },
                  ],
                }
              : {
                  versions: [
                    {
                      id: "spiral-v1-id",
                      version: "1.0.0",
                      status: "active",
                      displayName: "Spiral 1.0.0",
                      createdAt: "2026-03-03T09:00:00.000Z",
                      retiredAt: null,
                    },
                  ],
                },
        }),
      },
      repinProjectMethodologyVersion: {
        mutationOptions: (options?: {
          onSuccess?: (result: unknown) => Promise<void> | void;
          onError?: () => Promise<void> | void;
        }) => ({
          mutationFn: async (input: unknown) => {
            try {
              const result = await repinSpy(input);
              await options?.onSuccess?.(result);
              return result;
            } catch (error) {
              await options?.onError?.();
              throw error;
            }
          },
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
    queryClient: {
      ...queryClient,
      invalidateQueries: invalidateQueriesSpy,
    },
  });

  return { queryClient, repinSpy, invalidateQueriesSpy };
}

describe("project pinning route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders active pin snapshot, lineage cards, and selector-based repin controls", async () => {
    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectPinningRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Active pin snapshot")).toBeTruthy();
    expect(await screen.findByText("Mythic Athena 42")).toBeTruthy();
    expect(await screen.findByText("Pin lineage")).toBeTruthy();
    expect(screen.getByTestId("repin-methodology-combobox")).toBeTruthy();
    expect(screen.getByTestId("repin-version-combobox")).toBeTruthy();
    expect(screen.getByText("Open project dashboard")).toBeTruthy();
    expect(screen.getByText("Current pin")).toBeTruthy();
    expect(screen.getByText("Version transition preview")).toBeTruthy();
    expect(screen.getByText("PINNED")).toBeTruthy();
  });

  it("submits repin payload and renders deterministic blocked diagnostics panel", async () => {
    const { queryClient, repinSpy, invalidateQueriesSpy } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectPinningRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Active pin snapshot");

    await waitFor(() => {
      const versionCombobox = screen.getByTestId("repin-version-combobox") as HTMLButtonElement;
      expect(versionCombobox.textContent).toContain("1.0.0");
    });

    fireEvent.click(screen.getByRole("button", { name: "Repin project" }));

    await waitFor(() => {
      expect(repinSpy).toHaveBeenCalled();
      const firstCallInput = (repinSpy.mock.calls as unknown[][])[0]?.[0];
      expect(firstCallInput).toEqual({
        projectId: "project-1",
        methodologyKey: "bmad.v1",
        publishedVersion: "1.0.0",
      });
    });

    expect(await screen.findByText("Repin blocked by deterministic validation")).toBeTruthy();
    expect(screen.getByText("PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY")).toBeTruthy();
    expect(screen.getByText("scope: project.pin")).toBeTruthy();
    expect(screen.getByText("Required:")).toBeTruthy();
    expect(screen.getByText("Observed:")).toBeTruthy();
    expect(screen.getByText("Remediation:")).toBeTruthy();
    expect(invalidateQueriesSpy).toHaveBeenCalled();
  });
});
