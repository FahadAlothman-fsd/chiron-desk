import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
  Input: ({ value, onChange, ...props }: { value: string; onChange: (event: any) => void }) => (
    <input value={value} onChange={onChange} {...props} />
  ),
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

import { ProjectWorkUnitFactDetailRoute } from "../../routes/projects.$projectId.work-units.$projectWorkUnitId.facts.$factDefinitionId.tsx";

function createHarness() {
  const createRuntimeWorkUnitFactValueMutationOptionsMock = vi.fn(() => ({
    mutationFn: vi.fn(async () => ({ workUnitFactInstanceId: "wufi-new" })),
  }));

  const updateRuntimeWorkUnitFactValueMutationOptionsMock = vi.fn(() => ({
    mutationFn: vi.fn(async () => ({
      workUnitFactInstanceId: "wufi-set",
      supersededWorkUnitFactInstanceId: "wufi-1",
    })),
  }));

  const deleteRuntimeWorkUnitFactValueMutationOptionsMock = vi.fn(() => ({
    mutationFn: vi.fn(async () => ({ affectedCount: 1, affectedInstanceIds: ["wufi-deleted"] })),
  }));

  const orpc = {
    project: {
      getRuntimeWorkUnitFactDetail: {
        queryOptions: vi.fn((_input?: unknown) => ({
          queryKey: ["runtime-work-unit-fact-detail", "project-1", "wu-1", "fact-1"],
          queryFn: async () => ({
            workUnit: {
              projectWorkUnitId: "wu-1",
              workUnitTypeId: "wut-1",
              workUnitTypeKey: "WU.PROJECT_CONTEXT",
              workUnitTypeName: "Project Context",
            },
            factDefinition: {
              factDefinitionId: "fact-1",
              factKey: "deliveryMode",
              factName: "Delivery Mode",
              factType: "string",
              cardinality: "one",
              description: "Delivery strategy",
            },
            primitiveState: {
              exists: true,
              currentCount: 1,
              values: [
                {
                  workUnitFactInstanceId: "wufi-1",
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
      getRuntimeWorkUnits: {
        queryOptions: vi.fn((_input?: unknown) => ({
          queryKey: ["runtime-work-units", "project-1"],
          queryFn: async () => ({
            rows: [
              {
                projectWorkUnitId: "wu-2",
                displayIdentity: {
                  primaryLabel: "Project Context #2",
                  secondaryLabel: "project_context_2",
                },
              },
            ],
          }),
        })),
      },
      createRuntimeWorkUnitFactValue: {
        mutationOptions: createRuntimeWorkUnitFactValueMutationOptionsMock,
      },
      updateRuntimeWorkUnitFactValue: {
        mutationOptions: updateRuntimeWorkUnitFactValueMutationOptionsMock,
      },
      deleteRuntimeWorkUnitFactValue: {
        mutationOptions: deleteRuntimeWorkUnitFactValueMutationOptionsMock,
      },
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  useParamsMock.mockReturnValue({
    projectId: "project-1",
    projectWorkUnitId: "wu-1",
    factDefinitionId: "fact-1",
  });

  useRouteContextMock.mockReturnValue({
    orpc,
    queryClient,
  });

  return {
    queryClient,
    orpc,
    createRuntimeWorkUnitFactValueMutationOptionsMock,
    updateRuntimeWorkUnitFactValueMutationOptionsMock,
    deleteRuntimeWorkUnitFactValueMutationOptionsMock,
  };
}

describe("runtime work-unit fact detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders definition-scoped detail and wires create/update/delete mutations only", async () => {
    const {
      queryClient,
      orpc,
      createRuntimeWorkUnitFactValueMutationOptionsMock,
      updateRuntimeWorkUnitFactValueMutationOptionsMock,
      deleteRuntimeWorkUnitFactValueMutationOptionsMock,
    } = createHarness();

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeWorkUnitFactDetail.queryOptions({
        input: {
          projectId: "project-1",
          projectWorkUnitId: "wu-1",
          factDefinitionId: "fact-1",
        },
      }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ProjectWorkUnitFactDetailRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Delivery Mode");
    expect(markup).toContain("deliveryMode");
    expect(markup).toContain("Current state");
    expect(markup).toContain("Replace value");
    expect(markup).toContain("Delete current value");
    expect(markup).not.toContain("Clear");

    expect(createRuntimeWorkUnitFactValueMutationOptionsMock).toHaveBeenCalledTimes(1);
    expect(updateRuntimeWorkUnitFactValueMutationOptionsMock).toHaveBeenCalledTimes(1);
    expect(deleteRuntimeWorkUnitFactValueMutationOptionsMock).toHaveBeenCalledTimes(1);
  });
});
