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

import { ProjectWorkUnitArtifactSlotsRoute } from "../../routes/projects.$projectId.work-units.$projectWorkUnitId.artifact-slots.tsx";

function createHarness() {
  const getRuntimeArtifactSlotsQueryOptionsMock = vi.fn((_input?: unknown) => ({
    queryKey: ["runtime-artifact-slots", "project-1", "wu-1"],
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
      slots: [
        {
          slotDefinition: {
            slotDefinitionId: "slot-1",
            slotKey: "project-brief",
            slotName: "Project Brief",
            artifactKind: "single_file",
          },
          currentArtifactInstance: {
            exists: true,
            artifactInstanceId: "artifact-instance-1",
            updatedAt: "2026-03-28T12:00:00.000Z",
            fileCount: 1,
            previewFiles: [
              {
                filePath: "docs/project-brief.md",
              },
            ],
          },
          target: {
            page: "artifact-slot-detail",
            slotDefinitionId: "slot-1",
          },
        },
        {
          slotDefinition: {
            slotDefinitionId: "slot-2",
            slotKey: "risk-register",
            slotName: "Risk Register",
            artifactKind: "file_set",
          },
          currentArtifactInstance: {
            exists: false,
            fileCount: 0,
            previewFiles: [],
          },
          target: {
            page: "artifact-slot-detail",
            slotDefinitionId: "slot-2",
          },
        },
      ],
    }),
  }));

  const checkArtifactSlotCurrentStateMutationOptionsMock = vi.fn(() => ({
    mutationFn: vi.fn(async () => ({ result: "unchanged", currentArtifactInstanceExists: true })),
  }));

  const orpc = {
    project: {
      getRuntimeArtifactSlots: {
        queryOptions: getRuntimeArtifactSlotsQueryOptionsMock,
      },
      checkArtifactSlotCurrentState: {
        mutationOptions: checkArtifactSlotCurrentStateMutationOptionsMock,
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
    getRuntimeArtifactSlotsQueryOptionsMock,
    checkArtifactSlotCurrentStateMutationOptionsMock,
  };
}

describe("runtime artifact slots route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders one card per slot with current artifact instance summary and detail navigation", async () => {
    const {
      queryClient,
      orpc,
      getRuntimeArtifactSlotsQueryOptionsMock,
      checkArtifactSlotCurrentStateMutationOptionsMock,
    } = createHarness();

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeArtifactSlots.queryOptions({
        input: { projectId: "project-1", projectWorkUnitId: "wu-1" },
      }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ProjectWorkUnitArtifactSlotsRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Project Brief");
    expect(markup).toContain("Risk Register");
    expect(markup).toContain("docs/project-brief.md");
    expect(markup).toContain("No current artifact instance");
    expect(markup).toContain(
      'href="/projects/$projectId/work-units/$projectWorkUnitId/artifact-slots/$slotDefinitionId"',
    );

    expect(getRuntimeArtifactSlotsQueryOptionsMock).toHaveBeenCalledWith({
      input: { projectId: "project-1", projectWorkUnitId: "wu-1" },
    });
    expect(checkArtifactSlotCurrentStateMutationOptionsMock).not.toHaveBeenCalled();
  });
});
