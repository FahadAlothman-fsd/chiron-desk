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
  const addRuntimeWorkUnitFactValueMutationOptionsMock = vi.fn(() => ({
    mutationFn: vi.fn(async () => ({ workUnitFactInstanceId: "wufi-new" })),
  }));

  const setRuntimeWorkUnitFactValueMutationOptionsMock = vi.fn(() => ({
    mutationFn: vi.fn(async () => ({
      workUnitFactInstanceId: "wufi-set",
      supersededWorkUnitFactInstanceId: "wufi-1",
    })),
  }));

  const replaceRuntimeWorkUnitFactValueMutationOptionsMock = vi.fn(() => ({
    mutationFn: vi.fn(async () => ({
      workUnitFactInstanceId: "wufi-replaced",
      supersededWorkUnitFactInstanceId: "wufi-1",
    })),
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
      addRuntimeWorkUnitFactValue: {
        mutationOptions: addRuntimeWorkUnitFactValueMutationOptionsMock,
      },
      setRuntimeWorkUnitFactValue: {
        mutationOptions: setRuntimeWorkUnitFactValueMutationOptionsMock,
      },
      replaceRuntimeWorkUnitFactValue: {
        mutationOptions: replaceRuntimeWorkUnitFactValueMutationOptionsMock,
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
    addRuntimeWorkUnitFactValueMutationOptionsMock,
    setRuntimeWorkUnitFactValueMutationOptionsMock,
    replaceRuntimeWorkUnitFactValueMutationOptionsMock,
  };
}

describe("runtime work-unit fact detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders definition-scoped detail and wires add/set/replace mutations only", async () => {
    const {
      queryClient,
      orpc,
      addRuntimeWorkUnitFactValueMutationOptionsMock,
      setRuntimeWorkUnitFactValueMutationOptionsMock,
      replaceRuntimeWorkUnitFactValueMutationOptionsMock,
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
    expect(markup).toContain("work-unit-fact-set-form");
    expect(markup).toContain("work-unit-fact-replace-form-wufi-1");
    expect(markup).not.toContain("Delete");
    expect(markup).not.toContain("Clear");

    expect(addRuntimeWorkUnitFactValueMutationOptionsMock).toHaveBeenCalledTimes(1);
    expect(setRuntimeWorkUnitFactValueMutationOptionsMock).toHaveBeenCalledTimes(1);
    expect(replaceRuntimeWorkUnitFactValueMutationOptionsMock).toHaveBeenCalledTimes(1);
  });
});
