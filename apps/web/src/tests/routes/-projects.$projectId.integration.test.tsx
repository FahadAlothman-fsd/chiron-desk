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
  MethodologyWorkspaceShell: ({ title, children }: { title?: string; children: ReactNode }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

import { ProjectDashboardRoute } from "../../routes/projects.$projectId.index";

async function* createGuidanceStream(options?: { showAvailableFallback?: boolean }) {
  yield {
    type: "bootstrap" as const,
    version: "1" as const,
    cards: options?.showAvailableFallback
      ? [
          {
            candidateCardId: "candidate-card-1",
            source: "future" as const,
            workUnitContext: {
              workUnitTypeId: "wut-setup",
              workUnitTypeKey: "setup",
              workUnitTypeName: "Setup",
              currentStateLabel: "Not started",
            },
            summaries: {
              facts: { currentCount: 0, totalCount: 0 },
              artifactSlots: { currentCount: 0, totalCount: 0 },
            },
            transitions: [
              {
                candidateId: "candidate-transition-1",
                transitionId: "transition-1",
                transitionKey: "activation_to_done",
                transitionName: "Setup activation to done",
                toStateKey: "done",
                toStateLabel: "Done",
                source: "future" as const,
              },
            ],
          },
        ]
      : [],
  };

  if (options?.showAvailableFallback) {
    yield {
      type: "transitionResult" as const,
      version: "1" as const,
      candidateId: "candidate-transition-1",
      result: "available" as const,
    };
  }

  yield {
    type: "done" as const,
    version: "1" as const,
  };
}

function createHarness(options?: {
  activeWorkflows?: Array<Record<string, unknown>>;
  showAvailableFallback?: boolean;
}) {
  const orpc = {
    project: {
      getRuntimeOverview: {
        queryOptions: () => ({
          queryKey: ["runtime-overview", "project-1"],
          queryFn: async () => ({
            stats: {
              factTypesWithInstances: {
                current: 2,
                total: 5,
                subtitle: "Fact types already populated in runtime.",
                target: { filters: { existence: "exists" as const } },
              },
              workUnitTypesWithInstances: {
                current: 1,
                total: 4,
                subtitle: "Work-unit types materialized for this project.",
              },
              activeTransitions: {
                count: 1,
                subtitle: "Transitions currently in flight.",
              },
            },
            activeWorkflows: options?.activeWorkflows ?? [
              {
                workflowExecutionId: "we-1",
                workflowName: "Document project",
                workflowKey: "document-project",
                startedAt: "2026-03-03T12:00:00.000Z",
                workUnit: { workUnitTypeKey: "WU.PROJECT_CONTEXT" },
                transition: { transitionKey: "start" },
              },
            ],
          }),
        }),
      },
      getRuntimeGuidanceActive: {
        queryOptions: () => ({
          queryKey: ["runtime-guidance-active", "project-1"],
          queryFn: async () => ({
            activeWorkUnitCards:
              options?.activeWorkflows?.length === 0
                ? []
                : [
                    {
                      projectWorkUnitId: "wu-1",
                      workUnitTypeId: "wut-1",
                      workUnitTypeKey: "seed:wut:setup:mver_bmad_v1_active",
                      workUnitTypeName: "Setup",
                      currentStateKey: "activation",
                      currentStateLabel: "Activation",
                      factSummary: { currentCount: 0, totalCount: 0 },
                      artifactSummary: { currentCount: 0, totalCount: 0 },
                      activeTransition: {
                        transitionExecutionId: "te-1",
                        transitionId: "tr-1",
                        transitionKey:
                          "seed:transition:setup:activation-to-done:mver_bmad_v1_active",
                        transitionName: "Setup Activation To Done Mver Bmad V1 Active",
                        toStateKey: "done",
                        toStateLabel: "Done",
                        status: "active" as const,
                        readyForCompletion: true,
                      },
                      activePrimaryWorkflow: {
                        workflowExecutionId: "we-1",
                        workflowId: "wf-1",
                        workflowKey: "seed:workflow:setup:setup-project:mver_bmad_v1_active",
                        workflowName: "Setup Setup Project Mver Bmad V1 Active",
                        status: "active" as const,
                      },
                      actions: {
                        primary: { kind: "open_workflow" as const, workflowExecutionId: "we-1" },
                        openTransitionTarget: { transitionExecutionId: "te-1" },
                        openWorkflowTarget: { workflowExecutionId: "we-1" },
                      },
                    },
                  ],
          }),
        }),
      },
      streamRuntimeGuidanceCandidates: {
        call: () => createGuidanceStream({ showAvailableFallback: options?.showAvailableFallback }),
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
  useRouteContextMock.mockReturnValue({ orpc, queryClient });

  return { queryClient };
}

describe("project dashboard route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders runtime overview stat cards and guidance navigation", async () => {
    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectDashboardRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Project overview")).toBeTruthy();
    expect(await screen.findByText("2/5")).toBeTruthy();
    expect(screen.getByText("Runtime project overview")).toBeTruthy();
    expect(screen.getByText("Fact types with instances")).toBeTruthy();
    expect(screen.getByText("Work-unit types with instances")).toBeTruthy();
    expect(screen.getByText("1/4")).toBeTruthy();
    expect(screen.getByText("Active transitions")).toBeTruthy();

    const guidanceLink = screen.getByRole("link", { name: /Go to Guidance/i });
    expect(guidanceLink.getAttribute("href")).toBe("/projects/$projectId/transitions");
  });

  it("renders active guidance cards with detail actions", async () => {
    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectDashboardRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Active guidance")).toBeTruthy();
    expect(await screen.findByText("Active transition")).toBeTruthy();
    expect(screen.getByText("Primary workflow")).toBeTruthy();
    expect(await screen.findByRole("link", { name: /Open transition detail/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open workflow detail/i })).toBeTruthy();
  });

  it("renders available fallback guidance when no transition is active but one is ready", async () => {
    const { queryClient } = createHarness({ activeWorkflows: [], showAvailableFallback: true });

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectDashboardRoute />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(
        /No transition is active\. Showing the next transitions ready to start now\./i,
      ),
    ).toBeTruthy();
    expect(screen.getByText("Available now")).toBeTruthy();
    expect(screen.getByText(/Setup activation to done/i)).toBeTruthy();
  });

  it("renders empty-state copy when no transitions are active and none are ready", async () => {
    const { queryClient } = createHarness({ activeWorkflows: [], showAvailableFallback: false });

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectDashboardRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("No active transitions right now.")).toBeTruthy();
  });
});
