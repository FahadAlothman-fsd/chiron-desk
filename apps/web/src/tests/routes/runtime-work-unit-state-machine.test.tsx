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

import { ProjectWorkUnitStateMachineRoute } from "../../routes/projects.$projectId.work-units.$projectWorkUnitId.state-machine.tsx";

function createHarness() {
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
          openTransitionTarget: {
            page: "transition-execution-detail",
            transitionExecutionId: "te-1",
          },
        },
      },
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
          actionMode: "switch",
          actions: {
            inspectStartGate: {
              transitionId: "tr-2",
              projectWorkUnitId: "wu-1",
            },
          },
        },
      ],
      history: [
        {
          transitionExecutionId: "te-0",
          transitionId: "tr-0",
          transitionKey: "start",
          transitionName: "Start",
          toStateId: "state-1",
          toStateKey: "draft",
          status: "completed",
          startedAt: "2026-03-28T10:00:00.000Z",
          completedAt: "2026-03-28T10:01:00.000Z",
          target: {
            page: "transition-execution-detail",
            transitionExecutionId: "te-0",
          },
        },
      ],
    }),
  }));

  const orpc = {
    project: {
      getRuntimeWorkUnitStateMachine: {
        queryOptions: getRuntimeWorkUnitStateMachineQueryOptionsMock,
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
    getRuntimeWorkUnitStateMachineQueryOptionsMock,
  };
}

describe("runtime work-unit state-machine route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders active transition panel and possible switch candidates", async () => {
    const { queryClient, orpc, getRuntimeWorkUnitStateMachineQueryOptionsMock } = createHarness();

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeWorkUnitStateMachine.queryOptions({
        input: { projectId: "project-1", projectWorkUnitId: "wu-1" },
      }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ProjectWorkUnitStateMachineRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Current state");
    expect(markup).toContain("Draft");
    expect(markup).toContain("Active transition");
    expect(markup).toContain("Draft to Ready");
    expect(markup).toContain("Possible transitions");
    expect(markup).toContain("Draft to Blocked");
    expect(markup).toContain("switch candidate");
    expect(markup).toContain("Missing required fact");
    expect(markup).not.toContain("future opportunity");

    expect(getRuntimeWorkUnitStateMachineQueryOptionsMock).toHaveBeenCalledWith({
      input: { projectId: "project-1", projectWorkUnitId: "wu-1" },
    });
  });
});
