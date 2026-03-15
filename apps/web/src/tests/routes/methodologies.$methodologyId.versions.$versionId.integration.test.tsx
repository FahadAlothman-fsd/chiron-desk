import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useLocationMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useLocationMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useParams: () => ({
      methodologyId: "bmad.v1",
      versionId: "mver_bmad_project_context_only_draft",
    }),
    useSearch: () => ({}),
    useNavigate: () => vi.fn(),
  }),
  useLocation: useLocationMock,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  Outlet: () => <div>Nested route outlet</div>,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/methodologies/version-workspace", () => ({
  MethodologyVersionWorkspace: () => <div>Workspace body</div>,
  createDraftFromProjection: () => ({ factDefinitionsJson: "[]" }),
  createEmptyMethodologyVersionWorkspaceDraft: () => ({ factDefinitionsJson: "[]" }),
  mapValidationDiagnosticsToWorkspaceDiagnostics: () => [],
  parseWorkspaceDraftForPersistence: () => ({
    diagnostics: [],
    lifecycle: { workUnitTypes: [], agentTypes: [] },
    workflows: {
      workflows: [],
      transitionWorkflowBindings: {},
      guidance: null,
      factDefinitions: [],
    },
  }),
}));

import { MethodologyWorkspaceEntryRoute } from "../../routes/methodologies.$methodologyId.versions.$versionId";

function createTestHarness() {
  const orpc = {
    methodology: {
      getMethodologyDetails: {
        queryOptions: () => ({
          queryKey: ["methodology", "detail", "bmad.v1"],
          queryFn: async () => ({
            versions: [
              {
                id: "mver_bmad_project_context_only_draft",
                version: "v2-draft",
                status: "draft",
              },
            ],
          }),
        }),
      },
      getDraftProjection: {
        queryOptions: () => ({
          queryKey: ["methodology", "draft", "mver_bmad_project_context_only_draft"],
          queryFn: async () => ({ factDefinitions: [] }),
        }),
      },
      getPublicationEvidence: {
        queryOptions: () => ({
          queryKey: ["methodology", "evidence", "mver_bmad_project_context_only_draft"],
          queryFn: async () => [],
        }),
      },
      validateDraftVersion: {
        mutationOptions: () => ({ mutationFn: async () => ({ valid: true, diagnostics: [] }) }),
      },
      updateDraftLifecycle: {
        mutationOptions: () => ({
          mutationFn: async () => ({ validation: { valid: true, diagnostics: [] } }),
        }),
      },
      updateDraftWorkflows: {
        mutationOptions: () => ({ mutationFn: async () => ({ diagnostics: [] }) }),
      },
      publishDraftVersion: {
        mutationOptions: () => ({
          mutationFn: async () => ({ published: false, diagnostics: [], evidence: null }),
        }),
      },
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  useRouteContextMock.mockReturnValue({ orpc, queryClient });

  return { queryClient };
}

describe("methodology workspace entry route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nested child routes instead of the workspace body on deeper version paths", async () => {
    useLocationMock.mockReturnValue({
      pathname: "/methodologies/bmad.v1/versions/mver_bmad_project_context_only_draft/facts",
    });
    const { queryClient } = createTestHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyWorkspaceEntryRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Nested route outlet")).toBeTruthy();
    expect(screen.queryByText("Workspace body")).toBeNull();
  });
});
