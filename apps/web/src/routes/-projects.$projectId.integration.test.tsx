import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useParamsMock, useSearchMock, useNavigateMock, navigateMock } =
  vi.hoisted(() => ({
    useRouteContextMock: vi.fn(),
    useParamsMock: vi.fn(),
    useSearchMock: vi.fn(),
    useNavigateMock: vi.fn(),
    navigateMock: vi.fn(),
  }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useParams: useParamsMock,
    useSearch: useSearchMock,
    useNavigate: useNavigateMock,
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
            baselinePreview: {
              summary: {
                methodologyKey: "spiral.v1",
                pinnedVersion: "1.0.0",
                publishState: "published",
                validationStatus: "pass",
                setupFactsStatus:
                  "Deferred to WU.PROJECT_CONTEXT/document-project runtime execution in Epic 3.",
              },
              transitionPreview: {
                workUnitTypeKey: "WU.PROJECT_CONTEXT",
                currentState: "__absent__",
                transitions: [
                  {
                    transitionKey: "start",
                    fromState: "__absent__",
                    toState: "done",
                    gateClass: "start_gate",
                    status: "blocked",
                    statusReasonCode: "MISSING_PREVIEW_PREREQUISITE_FACT",
                    guidance: {
                      intent: "Initialize project prerequisites before first handoff.",
                    },
                    conditionSets: [
                      {
                        key: "gate.activate.wu.project_context",
                        phase: "start",
                        mode: "all",
                        groups: [],
                      },
                    ],
                    diagnostics: [],
                    workflows: [
                      {
                        workflowKey: "document-project",
                        enabled: false,
                        disabledReason: "Workflow runtime execution unlocks in Epic 3+",
                        helperText: "Execution is enabled in Epic 3 after start-gate preflight.",
                        guidance: "Collect and normalize baseline project facts before execution.",
                      },
                    ],
                  },
                  {
                    transitionKey: "future-path",
                    fromState: "done",
                    toState: "verified",
                    gateClass: "completion_gate",
                    status: "future",
                    statusReasonCode: "FUTURE_NOT_IN_CURRENT_CONTEXT",
                    conditionSets: [],
                    diagnostics: [],
                    workflows: [],
                  },
                ],
              },
              projectionSummary: {
                workUnits: [
                  {
                    workUnitTypeKey: "WU.PROJECT_CONTEXT",
                    guidance: {
                      intent: "Prepare project context and prerequisite facts.",
                    },
                  },
                  {
                    workUnitTypeKey: "WU.BUILD",
                    guidance: "Produce implementation outputs after setup readiness.",
                  },
                ],
                agents: [
                  {
                    agentTypeKey: "project-agent",
                    guidance: "Coordinate project-level setup and handoff orchestration.",
                  },
                ],
                transitions: [],
                facts: [],
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
                publish: [
                  {
                    code: "PUBLISH_CONTRACT_WARNING",
                    scope: "publish.validation",
                    blocking: false,
                    required: "Published contract passes static validation",
                    observed: "Non-blocking warning",
                    remediation: "Review warning guidance before promotion.",
                    timestamp: "2026-03-03T12:01:00.000Z",
                    evidenceRef: "publish-evidence-1",
                  },
                ],
                pin: [],
                "repin-policy": [],
              },
              evidenceTimeline: [
                {
                  kind: "pin",
                  actor: "operator-1",
                  timestamp: "2026-03-03T12:00:00.000Z",
                  reference: "project-pin-event:event-1",
                },
              ],
            },
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
  useSearchMock.mockReturnValue({});
  useNavigateMock.mockReturnValue(navigateMock);
  navigateMock.mockReset();
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
    expect((await screen.findAllByText("spiral.v1")).length).toBeGreaterThan(0);

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

  it("renders baseline readiness visibility on dashboard", async () => {
    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectDashboardRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Baseline visibility")).toBeTruthy();
    expect(
      await screen.findByText("Transition readiness preview (WU.PROJECT_CONTEXT)"),
    ).toBeTruthy();
    expect(await screen.findByText("reason: Missing Preview Prerequisite Fact")).toBeTruthy();
    expect(screen.queryByText("future-path")).toBeNull();

    const futureToggle = screen.getByLabelText("Show future paths");
    futureToggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(await screen.findByText("future-path")).toBeTruthy();
    expect(screen.getByText(/Prepare project context and prerequisite facts\./)).toBeTruthy();
    expect(
      screen.getByText(/Initialize project prerequisites before first handoff\./),
    ).toBeTruthy();
    expect(
      screen.getByText(/Collect and normalize baseline project facts before execution\./),
    ).toBeTruthy();
    expect(screen.getByText("PUBLISH_CONTRACT_WARNING")).toBeTruthy();
    expect(screen.getByText("context: publish")).toBeTruthy();
    expect(screen.getByText("blocking: no")).toBeTruthy();
    expect(screen.getByText("required: Published contract passes static validation")).toBeTruthy();
    expect(screen.getByText("observed: Non-blocking warning")).toBeTruthy();
    expect(screen.getByText("remediation: Review warning guidance before promotion.")).toBeTruthy();
    expect(screen.getByText("evidenceRef: publish-evidence-1")).toBeTruthy();
  });

  it("keeps transition workflow controls focusable with aria-disabled rationale", async () => {
    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectDashboardRoute />
      </QueryClientProvider>,
    );

    const action = await screen.findByRole("button", { name: "Execute (Epic 3+)" });
    action.focus();

    expect(action).toBe(document.activeElement);
    expect(action.getAttribute("aria-disabled")).toBe("true");
    expect(
      screen.getAllByText("Workflow runtime execution unlocks in Epic 3+").length,
    ).toBeGreaterThan(0);
  });
});
