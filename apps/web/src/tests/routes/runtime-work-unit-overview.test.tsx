import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div>loading</div>,
}));

import { ProjectWorkUnitOverviewRoute } from "../../routes/projects.$projectId.work-units.$projectWorkUnitId.tsx";

function createHarness() {
  const getRuntimeWorkUnitOverviewQueryOptionsMock = vi.fn((_input?: unknown) => ({
    queryKey: ["runtime-work-unit-overview", "project-1", "wu-1"],
    queryFn: async () => ({
      workUnit: {
        projectWorkUnitId: "wu-1",
        workUnitTypeId: "wut-1",
        workUnitTypeKey: "WU.PROJECT_CONTEXT",
        workUnitTypeName: "Project Context",
        currentStateId: "state-1",
        currentStateKey: "draft",
        currentStateLabel: "Draft",
        createdAt: "2026-03-28T12:00:00.000Z",
        updatedAt: "2026-03-28T12:05:00.000Z",
      },
      activeTransition: {
        transitionExecutionId: "te-1",
        transitionId: "tr-1",
        transitionKey: "draft_to_ready",
        transitionName: "Draft to Ready",
        toStateId: "state-2",
        toStateKey: "ready",
        toStateLabel: "Ready",
        status: "active",
        readyForCompletion: false,
        primaryWorkflow: {
          workflowExecutionId: "we-1",
          workflowId: "wf-1",
          workflowKey: "document-project",
          workflowName: "Document project",
          status: "active",
        },
        actions: {
          primary: {
            kind: "open_transition",
            transitionExecutionId: "te-1",
          },
          secondaryWorkflow: {
            kind: "open_workflow",
            workflowExecutionId: "we-1",
          },
          openTransitionTarget: {
            page: "transition-execution-detail",
            transitionExecutionId: "te-1",
          },
          openWorkflowTarget: {
            page: "workflow-execution-detail",
            workflowExecutionId: "we-1",
          },
        },
      },
      summaries: {
        factsDependencies: {
          factInstancesCurrent: 2,
          factDefinitionsTotal: 4,
          inboundDependencyCount: 1,
          outboundDependencyCount: 0,
          target: { page: "work-unit-facts", projectWorkUnitId: "wu-1" },
        },
        stateMachine: {
          currentStateKey: "draft",
          currentStateLabel: "Draft",
          hasActiveTransition: true,
          target: { page: "work-unit-state-machine", projectWorkUnitId: "wu-1" },
        },
        artifactSlots: {
          slotsWithCurrentSnapshots: 1,
          slotDefinitionsTotal: 2,
          target: { page: "artifact-slots", projectWorkUnitId: "wu-1" },
        },
      },
    }),
  }));

  const orpc = {
    project: {
      getRuntimeWorkUnitOverview: {
        queryOptions: getRuntimeWorkUnitOverviewQueryOptionsMock,
      },
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  useParamsMock.mockReturnValue({ projectId: "project-1", projectWorkUnitId: "wu-1" });
  useRouteContextMock.mockReturnValue({
    orpc,
    queryClient,
  });

  return {
    queryClient,
    orpc,
    getRuntimeWorkUnitOverviewQueryOptionsMock,
  };
}

describe("runtime work-unit overview route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders work-unit identity, active transition context, and summary cards", async () => {
    const { queryClient, orpc, getRuntimeWorkUnitOverviewQueryOptionsMock } = createHarness();

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeWorkUnitOverview.queryOptions({
        input: { projectId: "project-1", projectWorkUnitId: "wu-1" },
      }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ProjectWorkUnitOverviewRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Project Context");
    expect(markup).toContain("WU.PROJECT_CONTEXT");
    expect(markup).toContain("Current state");
    expect(markup).toContain("Draft");
    expect(markup).toContain("Draft to Ready");
    expect(markup).toContain("Document project");

    expect(markup).toContain("Facts / Dependencies");
    expect(markup).toContain("State Machine");
    expect(markup).toContain("Artifact Slots");
    expect(markup).toContain('href="/projects/$projectId/work-units/$projectWorkUnitId/facts"');
    expect(markup).toContain(
      'href="/projects/$projectId/work-units/$projectWorkUnitId/state-machine"',
    );

    expect(getRuntimeWorkUnitOverviewQueryOptionsMock).toHaveBeenCalledWith({
      input: { projectId: "project-1", projectWorkUnitId: "wu-1" },
    });
  });
});
