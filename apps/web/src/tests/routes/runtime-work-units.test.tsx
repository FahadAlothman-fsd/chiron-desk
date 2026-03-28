import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (event: any) => void;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
}));

import { ProjectWorkUnitsRoute } from "../../routes/projects.$projectId.work-units";

function createHarness() {
  const getRuntimeWorkUnitsQueryOptionsMock = vi.fn((_input?: unknown) => ({
    queryKey: ["runtime-work-units", "project-1", "all"],
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
            workUnitTypeKey: "WU.PROJECT_CONTEXT",
            workUnitTypeName: "Project Context",
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
      getRuntimeWorkUnits: {
        queryOptions: getRuntimeWorkUnitsQueryOptionsMock,
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
  navigateMock.mockReset();
  useRouteContextMock.mockReturnValue({
    orpc,
    queryClient,
  });

  return {
    queryClient,
    orpc,
    getRuntimeWorkUnitsQueryOptionsMock,
  };
}

describe("runtime work-units route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders runtime work-unit instance rows and navigation into work-unit overview", async () => {
    const { queryClient, orpc, getRuntimeWorkUnitsQueryOptionsMock } = createHarness();

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeWorkUnits.queryOptions({ input: { projectId: "project-1" } }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ProjectWorkUnitsRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Project Context");
    expect(markup).toContain("WU-0001");
    expect(markup).toContain("Draft");
    expect(markup).toContain("Draft to Ready");
    expect(markup).toContain("2 / 4");
    expect(markup).toContain("1 / 2");
    expect(markup).toContain('href="/projects/$projectId/work-units/$projectWorkUnitId"');

    expect(getRuntimeWorkUnitsQueryOptionsMock).toHaveBeenCalledWith({
      input: { projectId: "project-1" },
    });
  });
});
