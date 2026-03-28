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
  buttonVariants: () => "",
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock("@/components/runtime/artifact-snapshot-dialog", () => ({
  ArtifactSnapshotDialog: () => <div>artifact-snapshot-dialog</div>,
}));

import { ProjectWorkUnitArtifactSlotDetailRoute } from "../../routes/projects.$projectId.work-units.$projectWorkUnitId.artifact-slots.$slotDefinitionId.tsx";

function createHarness() {
  const getRuntimeArtifactSlotDetailQueryOptionsMock = vi.fn((_input?: unknown) => ({
    queryKey: ["runtime-artifact-slot-detail", "project-1", "wu-1", "slot-1"],
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
      slotDefinition: {
        slotDefinitionId: "slot-1",
        slotKey: "project-brief",
        slotName: "Project Brief",
        artifactKind: "file_set",
      },
      currentEffectiveSnapshot: {
        exists: false,
        memberCounts: { currentCount: 0 },
        members: [],
      },
      lineage: [
        {
          projectArtifactSnapshotId: "snap-latest",
          createdAt: "2026-03-28T12:00:00.000Z",
          memberCounts: { deltaRowCount: 2, effectiveCount: 0 },
          actions: {
            inspectSnapshot: {
              kind: "open_artifact_snapshot_dialog",
              projectArtifactSnapshotId: "snap-latest",
            },
          },
        },
      ],
    }),
  }));

  const checkArtifactSlotCurrentStateMutationOptionsMock = vi.fn(() => ({
    mutationFn: vi.fn(async () => ({
      result: "unavailable",
      currentEffectiveSnapshotExists: false,
    })),
  }));

  const orpc = {
    project: {
      getRuntimeArtifactSlotDetail: {
        queryOptions: getRuntimeArtifactSlotDetailQueryOptionsMock,
      },
      checkArtifactSlotCurrentState: {
        mutationOptions: checkArtifactSlotCurrentStateMutationOptionsMock,
      },
      getRuntimeArtifactSnapshotDialog: {
        queryOptions: vi.fn(),
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
    slotDefinitionId: "slot-1",
  });
  useRouteContextMock.mockReturnValue({
    orpc,
    queryClient,
  });

  return {
    queryClient,
    orpc,
    getRuntimeArtifactSlotDetailQueryOptionsMock,
    checkArtifactSlotCurrentStateMutationOptionsMock,
  };
}

describe("runtime artifact slot detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders current effective snapshot before lineage and wires current-state check on detail page", async () => {
    const {
      queryClient,
      orpc,
      getRuntimeArtifactSlotDetailQueryOptionsMock,
      checkArtifactSlotCurrentStateMutationOptionsMock,
    } = createHarness();

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeArtifactSlotDetail.queryOptions({
        input: {
          projectId: "project-1",
          projectWorkUnitId: "wu-1",
          slotDefinitionId: "slot-1",
        },
      }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ProjectWorkUnitArtifactSlotDetailRoute />
      </QueryClientProvider>,
    );

    const currentSectionIndex = markup.indexOf("Current effective snapshot");
    const lineageSectionIndex = markup.indexOf("Lineage history");

    expect(markup).toContain("Project Brief");
    expect(markup).toContain("No current effective artifact");
    expect(markup).toContain("snap-latest");
    expect(markup).toContain("Inspect snapshot");
    expect(markup).toContain("Check current slot state");
    expect(markup).toContain("artifact-snapshot-dialog");
    expect(currentSectionIndex).toBeGreaterThanOrEqual(0);
    expect(lineageSectionIndex).toBeGreaterThan(currentSectionIndex);

    expect(getRuntimeArtifactSlotDetailQueryOptionsMock).toHaveBeenCalledWith({
      input: {
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        slotDefinitionId: "slot-1",
      },
    });
    expect(checkArtifactSlotCurrentStateMutationOptionsMock).toHaveBeenCalledTimes(1);
  });
});
