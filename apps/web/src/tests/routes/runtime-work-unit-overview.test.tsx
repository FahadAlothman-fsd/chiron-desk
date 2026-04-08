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

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/runtime/runtime-start-gate-dialog", () => ({
  RuntimeStartGateDialog: () => null,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div>loading</div>,
}));

import { ProjectWorkUnitOverviewRoute } from "../../routes/projects.$projectId.work-units.$projectWorkUnitId.tsx";

function createHarness(options?: { withActiveTransition?: boolean }) {
  const withActiveTransition = options?.withActiveTransition ?? true;

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
      activeTransition: withActiveTransition
        ? {
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
          }
        : undefined,
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

  const getRuntimeWorkUnitStateMachineQueryOptionsMock = vi.fn((_input?: unknown) => ({
    queryKey: ["runtime-work-unit-state-machine", "project-1", "wu-1"],
    queryFn: async () => ({
      workUnit: {
        projectWorkUnitId: "wu-1",
        workUnitTypeId: "wut-1",
        workUnitTypeKey: "WU.PROJECT_CONTEXT",
        workUnitTypeName: "Project Context",
        currentStateId: "state-1",
        currentStateKey: "draft",
        currentStateLabel: "Draft",
      },
      activeTransition: withActiveTransition
        ? {
            transitionExecutionId: "te-1",
            transitionId: "tr-1",
            transitionKey: "draft_to_ready",
            transitionName: "Draft to Ready",
            toStateId: "state-2",
            toStateKey: "ready",
            toStateLabel: "Ready",
            status: "active",
            readyForCompletion: false,
            actions: {
              primary: {
                kind: "open_transition",
                transitionExecutionId: "te-1",
              },
              openTransitionTarget: {
                page: "transition-execution-detail",
                transitionExecutionId: "te-1",
              },
            },
          }
        : undefined,
      possibleTransitions: [
        {
          transitionId: "tr-2",
          transitionKey: "draft_to_blocked",
          transitionName: "Draft to Blocked",
          fromStateId: "state-1",
          fromStateKey: "draft",
          toStateId: "state-3",
          toStateKey: "blocked",
          toStateLabel: "Blocked",
          result: "blocked",
          firstReason: "Missing required fact",
          actionMode: withActiveTransition ? "switch" : "start",
          actions: {
            inspectStartGate: {
              transitionId: "tr-2",
              projectWorkUnitId: "wu-1",
            },
          },
        },
      ],
      history: [],
    }),
  }));

  const startTransitionExecutionMutationOptionsMock = vi.fn(() => ({
    mutationFn: async () => ({
      projectWorkUnitId: "wu-1",
      transitionExecutionId: "te-2",
      workflowExecutionId: "we-2",
    }),
  }));

  const switchActiveTransitionExecutionMutationOptionsMock = vi.fn(() => ({
    mutationFn: async () => ({
      supersededTransitionExecutionId: "te-1",
      transitionExecutionId: "te-2",
      workflowExecutionId: "we-2",
    }),
  }));

  const orpc = {
    project: {
      getRuntimeWorkUnitOverview: {
        queryOptions: getRuntimeWorkUnitOverviewQueryOptionsMock,
      },
      getRuntimeWorkUnitStateMachine: {
        queryOptions: getRuntimeWorkUnitStateMachineQueryOptionsMock,
      },
      getRuntimeStartGateDetail: {
        call: vi.fn(async () => null),
      },
      startTransitionExecution: {
        mutationOptions: startTransitionExecutionMutationOptionsMock,
      },
      switchActiveTransitionExecution: {
        mutationOptions: switchActiveTransitionExecutionMutationOptionsMock,
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
    getRuntimeWorkUnitStateMachineQueryOptionsMock,
  };
}

describe("runtime work-unit overview route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders work-unit identity, active transition context, summaries, and alternative transitions", async () => {
    const {
      queryClient,
      orpc,
      getRuntimeWorkUnitOverviewQueryOptionsMock,
      getRuntimeWorkUnitStateMachineQueryOptionsMock,
    } = createHarness({ withActiveTransition: true });

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeWorkUnitOverview.queryOptions({
        input: { projectId: "project-1", projectWorkUnitId: "wu-1" },
      }),
    );

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeWorkUnitStateMachine.queryOptions({
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
    expect(markup).toContain("Alternative transitions");
    expect(markup).toContain("Open active transition detail");
    expect(markup).toContain("Draft to Blocked");
    expect(markup).toContain("First blocker");
    expect(markup).toContain("Open start-gate diagnostics");
    expect(markup).toContain("Switch transition");
    expect(markup).toContain("Switch unavailable until blocker is resolved");
    expect(markup).toContain("ready now 0");
    expect(markup).toContain("blocked 1");
    expect(markup).toContain("Blocked by start gate");

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
    expect(getRuntimeWorkUnitStateMachineQueryOptionsMock).toHaveBeenCalledWith({
      input: { projectId: "project-1", projectWorkUnitId: "wu-1" },
    });
  });

  it("renders available transitions and start action when no active transition exists", async () => {
    const { queryClient, orpc } = createHarness({ withActiveTransition: false });

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeWorkUnitOverview.queryOptions({
        input: { projectId: "project-1", projectWorkUnitId: "wu-1" },
      }),
    );

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeWorkUnitStateMachine.queryOptions({
        input: { projectId: "project-1", projectWorkUnitId: "wu-1" },
      }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ProjectWorkUnitOverviewRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Available transitions");
    expect(markup).toContain("Start transition");
    expect(markup).toContain("blocked 1");
    expect(markup).toContain("Blocked by start gate");
    expect(markup).not.toContain("Alternative transitions");
  });
});
