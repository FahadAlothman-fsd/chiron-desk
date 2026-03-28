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

import { ProjectPinningRoute } from "../../routes/projects.$projectId.pinning";

type MethodologyVersionFixture = {
  id: string;
  version: string;
  status: string;
  displayName: string;
  createdAt: string;
  retiredAt: string | null;
};

type HarnessOptions = {
  repinImpl?: (input: unknown) => Promise<unknown>;
  detailsByMethodologyKey?: Record<string, { versions: MethodologyVersionFixture[] }>;
  baselinePreview?: Record<string, unknown> | null;
};

function createHarness(options: HarnessOptions = {}) {
  const invalidateQueriesSpy = vi.fn(async () => undefined);
  const repinSpy = vi.fn(
    options.repinImpl ??
      (async (_input?: unknown) => ({
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
          methodologyId: "m1",
          methodologyKey: "bmad.v1",
          publishedVersion: "1.0.0",
          actorId: "operator-1",
          timestamp: "2026-03-03T10:00:00.000Z",
        },
      })),
  );

  const detailsByMethodologyKey: Record<string, { versions: MethodologyVersionFixture[] }> = {
    "bmad.v1": {
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
    },
    "spiral.v1": {
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
    ...options.detailsByMethodologyKey,
  };

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
              methodologyId: "m1",
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
            baselinePreview: options.baselinePreview ?? {
              summary: {
                methodologyKey: "bmad.v1",
                pinnedVersion: "1.0.0",
                publishState: "published",
                validationStatus: "pass",
                setupFactsStatus:
                  "Deferred to WU.PROJECT_CONTEXT/document-project runtime execution in Epic 3.",
              },
              transitionPreview: {
                workUnitTypeKey: "task",
                currentState: "__absent__",
                transitions: [
                  {
                    transitionKey: "start",
                    fromState: "__absent__",
                    toState: "new",
                    gateClass: "start_gate",
                    status: "blocked",
                    statusReasonCode: "MISSING_PREVIEW_PREREQUISITE_FACT",
                    conditionSets: [],
                    diagnostics: [],
                    workflows: [
                      {
                        workflowKey: "default-wf",
                        enabled: false,
                        disabledReason: "Workflow runtime execution unlocks in Epic 3+",
                        helperText: "Execution is enabled in Epic 3 after start-gate preflight.",
                      },
                    ],
                  },
                  {
                    transitionKey: "complete",
                    fromState: "new",
                    toState: "done",
                    gateClass: "completion_gate",
                    status: "future",
                    statusReasonCode: "FUTURE_NOT_IN_CURRENT_CONTEXT",
                    conditionSets: [],
                    diagnostics: [],
                    workflows: [],
                  },
                ],
              },
              facts: [
                {
                  key: "deliveryMode",
                  type: "string",
                  value: null,
                  required: true,
                  missing: true,
                  indicator: "blocking",
                  sourceExecutionId: null,
                  updatedAt: null,
                },
              ],
              diagnosticsHistory: {
                publish: [],
                pin: [],
                "repin-policy": [],
              },
              evidenceTimeline: [
                {
                  kind: "publish",
                  actor: "operator-1",
                  timestamp: "2026-03-03T09:00:00.000Z",
                  reference: "publication-evidence:test",
                },
                {
                  kind: "pin",
                  actor: "operator-1",
                  timestamp: "2026-03-03T10:00:00.000Z",
                  reference: "project-pin-event:event-1",
                },
              ],
            },
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
          queryFn: async () => ({
            versions: detailsByMethodologyKey[input.methodologyKey]?.versions ?? [],
          }),
        }),
      },
      repinProjectMethodologyVersion: {
        mutationOptions: (options?: {
          onSuccess?: (result: unknown) => Promise<void> | void;
          onError?: (error: unknown) => Promise<void> | void;
        }) => ({
          mutationFn: (input: unknown) =>
            repinSpy(input).then(
              async (result: unknown) => {
                await options?.onSuccess?.(result);
                return result;
              },
              async (error: unknown) => {
                await options?.onError?.(error);
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
        methodologyId: "m1",
        versionId: "v1-id",
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

  it("renders deterministic diagnostics when repin transport fails", async () => {
    const { queryClient } = createHarness({
      repinImpl: async () => Promise.reject(new Error("connection reset")),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectPinningRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Active pin snapshot");

    const repinButton = screen.getByRole("button", {
      name: "Repin project",
    }) as HTMLButtonElement;
    await waitFor(() => {
      expect(repinButton.disabled).toBe(false);
    });

    fireEvent.click(repinButton);

    expect(await screen.findByText("PROJECT_REPIN_TRANSPORT_ERROR")).toBeTruthy();
    expect(screen.getByText("scope: project.repin.transport")).toBeTruthy();
    expect(screen.getByText(/Observed:/)).toBeTruthy();
    expect(screen.getByText(/connection reset/)).toBeTruthy();
    expect(screen.getByText(/evidenceRef:/)).toBeTruthy();
  });

  it("treats non-active statuses as unpublished for repin selection", async () => {
    const { queryClient } = createHarness({
      detailsByMethodologyKey: {
        "bmad.v1": {
          versions: [
            {
              id: "bmad-v99-id",
              version: "9.9.0",
              status: "published",
              displayName: "BMAD 9.9.0",
              createdAt: "2026-03-03T11:00:00.000Z",
              retiredAt: null,
            },
          ],
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectPinningRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Active pin snapshot");

    const methodologyCombobox = screen.getByTestId(
      "repin-methodology-combobox",
    ) as HTMLButtonElement;
    await waitFor(() => {
      expect(methodologyCombobox.textContent).toContain("bmad.v1");
    });

    const versionCombobox = screen.getByTestId("repin-version-combobox") as HTMLButtonElement;
    await waitFor(() => {
      expect(versionCombobox.disabled).toBe(true);
    });
    expect(
      screen.getByText(
        "No published versions available for selected methodology. Publish an eligible version first.",
      ),
    ).toBeTruthy();
  });

  it("keeps readiness visibility on dashboard and pinning focused on pin management", async () => {
    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectPinningRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Readiness visibility")).toBeTruthy();
    expect(screen.getByText("Open readiness baseline")).toBeTruthy();
    expect(screen.queryByText("Baseline visibility")).toBeNull();
    expect(screen.queryByText(/Transition readiness preview/i)).toBeNull();
  });
});
