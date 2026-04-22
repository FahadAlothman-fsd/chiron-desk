import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | null | false>) => classes.filter(Boolean).join(" "),
}));

import { ProjectWorkUnitFactsRoute } from "../../routes/projects.$projectId.work-units.$projectWorkUnitId.facts.tsx";

function createHarness(tab: "primitive" | "work_units") {
  const getRuntimeWorkUnitFactsQueryOptionsMock = vi.fn((request: unknown) => ({
    queryKey: ["runtime-work-unit-facts", "project-1", "wu-1"],
    queryFn: async () => {
      const input = (request as { input: { tab: "primitive" | "work_units" } }).input;

      return {
        workUnit: {
          projectWorkUnitId: "wu-1",
          workUnitTypeId: "wut-1",
          workUnitTypeKey: "WU.PROJECT_CONTEXT",
          workUnitTypeName: "Project Context",
          currentStateId: "state-1",
          currentStateKey: "draft",
          currentStateLabel: "Draft",
        },
        activeTab: input.tab,
        filters: {},
        ...(input.tab === "primitive"
          ? {
              primitive: {
                cards: [
                  {
                    factDefinitionId: "fact-primitive-1",
                    factKey: "deliveryMode",
                    factName: "Delivery Mode",
                    factType: "string",
                    cardinality: "one",
                    exists: true,
                    currentCount: 1,
                    currentValues: [{ instanceId: "wufi-1", value: "incremental" }],
                    target: { page: "work-unit-fact-detail", factDefinitionId: "fact-primitive-1" },
                  },
                ],
              },
            }
          : {
              workUnits: {
                outgoing: [
                  {
                    factDefinitionId: "fact-dep-out-1",
                    factKey: "dependsOn",
                    factName: "Depends On",
                    cardinality: "many",
                    count: 1,
                    currentMembers: [
                      {
                        workUnitFactInstanceId: "wufi-out-1",
                        counterpartProjectWorkUnitId: "wu-2",
                        counterpartWorkUnitTypeId: "wut-2",
                        counterpartWorkUnitTypeKey: "WU.RESEARCH",
                        counterpartWorkUnitTypeName: "Research",
                        counterpartLabel: "Research #1",
                      },
                    ],
                    target: { page: "work-unit-fact-detail", factDefinitionId: "fact-dep-out-1" },
                  },
                ],
                incoming: [
                  {
                    factDefinitionId: "fact-dep-in-1",
                    factKey: "requiredBy",
                    factName: "Required By",
                    cardinality: "one",
                    count: 1,
                    currentMembers: [
                      {
                        workUnitFactInstanceId: "wufi-in-1",
                        counterpartProjectWorkUnitId: "wu-3",
                        counterpartWorkUnitTypeId: "wut-3",
                        counterpartWorkUnitTypeKey: "WU.REVIEW",
                        counterpartWorkUnitTypeName: "Review",
                        counterpartLabel: "Review #1",
                      },
                    ],
                    target: { page: "work-unit-fact-detail", factDefinitionId: "fact-dep-in-1" },
                  },
                ],
              },
            }),
      };
    },
  }));

  const orpc = {
    project: {
      getRuntimeWorkUnitFacts: {
        queryOptions: getRuntimeWorkUnitFactsQueryOptionsMock,
      },
      getRuntimeWorkUnitFactDetail: {
        queryOptions: vi.fn(() => ({
          queryKey: ["runtime-work-unit-fact-detail", "project-1", "wu-1", "__idle__"],
          queryFn: async () => null,
        })),
      },
      getRuntimeWorkUnits: {
        queryOptions: vi.fn(() => ({
          queryKey: ["runtime-work-units", "project-1"],
          queryFn: async () => ({ rows: [] }),
        })),
      },
      createRuntimeWorkUnitFactValue: {
        mutationOptions: vi.fn(() => ({ mutationFn: vi.fn(async () => ({})) })),
      },
      updateRuntimeWorkUnitFactValue: {
        mutationOptions: vi.fn(() => ({ mutationFn: vi.fn(async () => ({})) })),
      },
      deleteRuntimeWorkUnitFactValue: {
        mutationOptions: vi.fn(() => ({ mutationFn: vi.fn(async () => ({})) })),
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
  useSearchMock.mockReturnValue({
    tab,
    q: "",
    existence: "all",
    primitiveFactType: "all",
  });
  useNavigateMock.mockReturnValue(navigateMock);
  navigateMock.mockReset();
  useRouteContextMock.mockReturnValue({
    orpc,
    queryClient,
  });

  return {
    queryClient,
    orpc,
    getRuntimeWorkUnitFactsQueryOptionsMock,
  };
}

describe("runtime work-unit facts list route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders exactly Primitive and Work Units tabs with primitive cards", async () => {
    const { queryClient, orpc, getRuntimeWorkUnitFactsQueryOptionsMock } =
      createHarness("primitive");

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeWorkUnitFacts.queryOptions({
        input: {
          projectId: "project-1",
          projectWorkUnitId: "wu-1",
          tab: "primitive",
        },
      }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ProjectWorkUnitFactsRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Primitive");
    expect(markup).toContain("Work Units");
    expect(markup).toContain("Delivery Mode");
    expect(markup).toContain("incremental");
    expect(markup).toContain("Instance wufi-1");
    expect(markup).toContain("Open detail");

    expect(getRuntimeWorkUnitFactsQueryOptionsMock).toHaveBeenCalledWith({
      input: {
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        tab: "primitive",
      },
    });
  });

  it("renders Work Units tab with Outgoing section before Incoming", async () => {
    const { queryClient, orpc, getRuntimeWorkUnitFactsQueryOptionsMock } =
      createHarness("work_units");

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeWorkUnitFacts.queryOptions({
        input: {
          projectId: "project-1",
          projectWorkUnitId: "wu-1",
          tab: "work_units",
        },
      }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ProjectWorkUnitFactsRoute />
      </QueryClientProvider>,
    );

    const outgoingIndex = markup.indexOf("Outgoing");
    const incomingIndex = markup.indexOf("Incoming");

    expect(outgoingIndex).toBeGreaterThan(-1);
    expect(incomingIndex).toBeGreaterThan(-1);
    expect(outgoingIndex).toBeLessThan(incomingIndex);

    expect(getRuntimeWorkUnitFactsQueryOptionsMock).toHaveBeenCalledWith({
      input: {
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        tab: "work_units",
      },
    });
  });
});
