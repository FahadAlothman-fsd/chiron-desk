import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  useRouteContextMock,
  useParamsMock,
  useSearchMock,
  useNavigateMock,
  useLocationMock,
  navigateMock,
} = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useParamsMock: vi.fn(),
  useSearchMock: vi.fn(),
  useNavigateMock: vi.fn(),
  useLocationMock: vi.fn(),
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
  useLocation: useLocationMock,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  Outlet: () => <div>work-unit-detail-outlet</div>,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children, className }: { children: ReactNode; className?: string }) => (
    <button type="button" className={className}>
      {children}
    </button>
  ),
  CollapsibleContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
  ChevronRight: ({ className }: { className?: string }) => (
    <span className={className}>chevron</span>
  ),
}));

import { ProjectWorkUnitsRoute } from "../../routes/projects.$projectId.work-units";

function createHarness() {
  const getProjectDetailsQueryOptionsMock = vi.fn((_input?: unknown) => ({
    queryKey: ["project-details", "project-1"],
    queryFn: async () => ({
      project: {
        projectId: "project-1",
        displayName: "Aurora Orion 123",
      },
      pin: {
        methodologyVersionId: "ver-1",
      },
    }),
  }));

  const getWorkUnitDefinitionsQueryOptionsMock = vi.fn((_input?: unknown) => ({
    queryKey: ["work-unit-definitions", "ver-1"],
    queryFn: async () => ({
      workUnitTypes: [
        {
          key: "setup",
          displayName: "Setup",
          description: "Establishes the foundational project context.",
          cardinality: "one_per_project",
          lifecycleTransitions: [{ key: "setup_activate", toState: "draft" }],
        },
        {
          key: "WU.ARCHITECTURE",
          displayName: "Architecture",
          description: "Capture system architecture decisions.",
          cardinality: "one_per_project",
          lifecycleTransitions: [{ key: "architecture_activate", toState: "draft" }],
        },
        {
          key: "WU.STORY",
          displayName: "Story",
          description: "Implement stories.",
          cardinality: "many_per_project",
          lifecycleTransitions: [],
        },
      ],
    }),
  }));

  const getRuntimeWorkUnitsQueryOptionsMock = vi.fn((_input?: unknown) => ({
    queryKey: ["runtime-work-units", "project-1"],
    queryFn: async () => ({
      project: { projectId: "project-1", name: "Aurora Orion 123" },
      filters: {},
      rows: [
        {
          projectWorkUnitId: "wu-1",
          displayIdentity: {
            primaryLabel: "Project Context",
            secondaryLabel: "WU-0001",
            fullInstanceId: "wu-1",
          },
          workUnitType: {
            workUnitTypeId: "wut-1",
            workUnitTypeKey: "SETUP",
            workUnitTypeName: "Setup",
            cardinality: "many_per_project",
          },
          currentState: {
            stateId: "state-1",
            stateKey: "draft",
            stateLabel: "Draft",
          },
          activeTransition: {
            transitionExecutionId: "te-1",
            transitionId: "tr-1",
            transitionKey: "draft_to_ready",
            transitionName: "Draft to Ready",
            toStateId: "state-2",
            toStateKey: "ready",
            toStateLabel: "Ready",
          },
          summaries: {
            factsDependencies: {
              factInstancesCurrent: 2,
              factDefinitionsTotal: 4,
              inboundDependencyCount: 1,
              outboundDependencyCount: 0,
            },
            artifactSlots: {
              slotsWithCurrentArtifacts: 1,
              slotDefinitionsTotal: 2,
            },
          },
          timestamps: {
            createdAt: "2026-03-28T12:00:00.000Z",
            updatedAt: "2026-03-28T12:05:00.000Z",
          },
          target: {
            page: "work-unit-overview",
            projectWorkUnitId: "wu-1",
          },
        },
      ],
    }),
  }));

  const orpc = {
    project: {
      getProjectDetails: {
        queryOptions: getProjectDetailsQueryOptionsMock,
      },
      getRuntimeWorkUnits: {
        queryOptions: getRuntimeWorkUnitsQueryOptionsMock,
      },
    },
    methodology: {
      version: {
        workUnit: {
          list: {
            queryOptions: getWorkUnitDefinitionsQueryOptionsMock,
          },
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

  useParamsMock.mockReturnValue({ projectId: "project-1" });
  useSearchMock.mockReturnValue({ q: "", hasActiveTransition: "all" });
  useNavigateMock.mockReturnValue(navigateMock);
  useLocationMock.mockReturnValue({ pathname: "/projects/project-1/work-units" });
  navigateMock.mockReset();
  useRouteContextMock.mockReturnValue({
    orpc,
    queryClient,
  });

  return {
    queryClient,
    orpc,
    getProjectDetailsQueryOptionsMock,
    getWorkUnitDefinitionsQueryOptionsMock,
    getRuntimeWorkUnitsQueryOptionsMock,
  };
}

describe("runtime work-units route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders singleton section with instance and no-instance cards", async () => {
    const {
      queryClient,
      orpc,
      getProjectDetailsQueryOptionsMock,
      getWorkUnitDefinitionsQueryOptionsMock,
      getRuntimeWorkUnitsQueryOptionsMock,
    } = createHarness();

    await queryClient.prefetchQuery(
      orpc.project.getProjectDetails.queryOptions({ input: { projectId: "project-1" } }),
    );

    await queryClient.prefetchQuery(
      orpc.methodology.version.workUnit.list.queryOptions({ input: { versionId: "ver-1" } }),
    );

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeWorkUnits.queryOptions({ input: { projectId: "project-1" } }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ProjectWorkUnitsRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Singleton work units");
    expect(markup).toContain("Setup");
    expect(markup).toContain("setup");
    expect(markup).toContain("Instance ID: wu-1");
    expect(markup).toContain("Draft");
    expect(markup).toContain("Draft to Ready");
    expect(markup).toContain("Architecture");
    expect(markup).toContain("No instance yet");
    expect(markup).toContain("architecture_activate");
    expect(markup).toContain('href="/projects/$projectId/work-units/$projectWorkUnitId"');
    expect(markup).toContain("Work unit instances (many)");
    expect(markup).toContain("1/2 instantiated");

    expect(getProjectDetailsQueryOptionsMock).toHaveBeenCalledWith({
      input: { projectId: "project-1" },
    });
    expect(getWorkUnitDefinitionsQueryOptionsMock).toHaveBeenCalledWith({
      input: { versionId: "ver-1" },
    });
    expect(getRuntimeWorkUnitsQueryOptionsMock).toHaveBeenCalledWith({
      input: { projectId: "project-1" },
    });
  });

  it("renders outlet for child work-unit overview route", async () => {
    const { queryClient, orpc } = createHarness();
    useLocationMock.mockReturnValue({ pathname: "/projects/project-1/work-units/wu-1" });

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeWorkUnits.queryOptions({ input: { projectId: "project-1" } }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ProjectWorkUnitsRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("work-unit-detail-outlet");
    expect(markup).not.toContain("Open overview");
  });
});
