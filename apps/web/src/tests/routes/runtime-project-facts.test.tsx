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

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
  buttonVariants: () => "",
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

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ value, onChange, ...props }: { value: string; onChange: (event: any) => void }) => (
    <textarea value={value} onChange={onChange} {...props} />
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | null | false>) => classes.filter(Boolean).join(" "),
}));

import { ProjectFactsRoute } from "../../routes/projects.$projectId.facts";
import { ProjectFactDetailRoute } from "../../routes/projects.$projectId.facts.$factDefinitionId.tsx";

function createHarness() {
  const createRuntimeProjectFactValueMutationOptionsMock = vi.fn(() => ({
    mutationFn: vi.fn(async () => ({ projectFactInstanceId: "pfi-new" })),
  }));
  const updateRuntimeProjectFactValueMutationOptionsMock = vi.fn(() => ({
    mutationFn: vi.fn(async () => ({
      projectFactInstanceId: "pfi-set",
      supersededProjectFactInstanceId: "pfi-1",
    })),
  }));
  const deleteRuntimeProjectFactValueMutationOptionsMock = vi.fn(() => ({
    mutationFn: vi.fn(async () => ({ affectedCount: 1, affectedInstanceIds: ["pfi-deleted"] })),
  }));

  const orpc = {
    project: {
      getRuntimeProjectFacts: {
        queryOptions: vi.fn((_input?: unknown) => ({
          queryKey: ["runtime-project-facts", "project-1", "all", "all"],
          queryFn: async () => ({
            project: { projectId: "project-1", name: "Aurora Orion 123" },
            filters: { existence: "exists" },
            cards: [
              {
                factDefinitionId: "fact-1",
                factKey: "deliveryMode",
                factName: "Delivery Mode",
                factType: "string",
                cardinality: "one",
                exists: true,
                currentCount: 1,
                currentValues: ["incremental"],
                target: { page: "project-fact-detail", factDefinitionId: "fact-1" },
                actions: {
                  addInstance: { kind: "add_project_fact_instance", factDefinitionId: "fact-1" },
                },
              },
            ],
          }),
        })),
      },
      getRuntimeProjectFactDetail: {
        queryOptions: vi.fn((_input?: unknown) => ({
          queryKey: ["runtime-project-fact-detail", "project-1", "fact-1"],
          queryFn: async () => ({
            project: { projectId: "project-1", name: "Aurora Orion 123" },
            factDefinition: {
              factDefinitionId: "fact-1",
              factKey: "deliveryMode",
              factName: "Delivery Mode",
              factType: "string",
              cardinality: "many",
              description: "Delivery strategy",
            },
            currentState: {
              exists: true,
              currentCount: 1,
              values: [
                {
                  instanceId: "pfi-1",
                  value: "incremental",
                  createdAt: "2026-03-28T12:00:00.000Z",
                },
              ],
            },
            actions: {
              canAddInstance: true,
              canUpdateExisting: true,
              canRemoveExisting: false,
            },
          }),
        })),
      },
      createRuntimeProjectFactValue: {
        mutationOptions: createRuntimeProjectFactValueMutationOptionsMock,
      },
      updateRuntimeProjectFactValue: {
        mutationOptions: updateRuntimeProjectFactValueMutationOptionsMock,
      },
      deleteRuntimeProjectFactValue: {
        mutationOptions: deleteRuntimeProjectFactValueMutationOptionsMock,
      },
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  useParamsMock.mockReturnValue({ projectId: "project-1", factDefinitionId: "fact-1" });
  useSearchMock.mockReturnValue({ q: "", existence: "all", factType: "all" });
  useNavigateMock.mockReturnValue(navigateMock);
  navigateMock.mockReset();
  useRouteContextMock.mockReturnValue({
    orpc,
    queryClient,
  });

  return {
    queryClient,
    orpc,
    createRuntimeProjectFactValueMutationOptionsMock,
    updateRuntimeProjectFactValueMutationOptionsMock,
    deleteRuntimeProjectFactValueMutationOptionsMock,
  };
}

describe("runtime project facts routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders runtime-backed project fact cards and detail navigation", async () => {
    const {
      queryClient,
      orpc,
      createRuntimeProjectFactValueMutationOptionsMock,
      updateRuntimeProjectFactValueMutationOptionsMock,
      deleteRuntimeProjectFactValueMutationOptionsMock,
    } = createHarness();

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeProjectFacts.queryOptions({ input: { projectId: "project-1" } }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ProjectFactsRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Delivery Mode");
    expect(markup).toContain("deliveryMode");
    expect(markup).toContain("incremental");
    expect(markup).toContain("Has instances");
    expect(markup).toContain("Add value");
    expect(markup).toContain('href="/projects/$projectId/facts/$factDefinitionId"');

    expect(createRuntimeProjectFactValueMutationOptionsMock).not.toHaveBeenCalled();
    expect(updateRuntimeProjectFactValueMutationOptionsMock).not.toHaveBeenCalled();
    expect(deleteRuntimeProjectFactValueMutationOptionsMock).not.toHaveBeenCalled();
  });

  it("wires create, update, and delete controls only to runtime fact mutation procedures", async () => {
    const {
      queryClient,
      orpc,
      createRuntimeProjectFactValueMutationOptionsMock,
      updateRuntimeProjectFactValueMutationOptionsMock,
      deleteRuntimeProjectFactValueMutationOptionsMock,
    } = createHarness();

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeProjectFactDetail.queryOptions({
        input: { projectId: "project-1", factDefinitionId: "fact-1" },
      }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ProjectFactDetailRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Manual runtime CRUD");
    expect(markup).toContain("Dialogs are the canonical manual CRUD surface here.");
    expect(markup).toContain("Add instance");
    expect(markup).toContain("Edit instance");
    expect(markup).toContain("Delete current value");

    expect(createRuntimeProjectFactValueMutationOptionsMock).toHaveBeenCalledTimes(1);
    expect(updateRuntimeProjectFactValueMutationOptionsMock).toHaveBeenCalledTimes(1);
    expect(deleteRuntimeProjectFactValueMutationOptionsMock).toHaveBeenCalledTimes(1);
  });
});
