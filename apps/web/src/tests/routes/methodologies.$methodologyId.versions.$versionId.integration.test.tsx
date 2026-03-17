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
    lifecycle: {
      workUnitTypes: [
        { key: "wu_discovery", lifecycleTransitions: [{ key: "start" }, { key: "finish" }] },
        { key: "wu_delivery", lifecycleTransitions: [{ key: "approve" }] },
      ],
      agentTypes: [{ key: "agent_planner" }, { key: "agent_reviewer" }, { key: "agent_runner" }],
    },
    workflows: {
      workflows: [{ key: "wf_author" }, { key: "wf_publish" }],
      transitionWorkflowBindings: {
        depends_on: ["wf_author", "wf_publish"],
        informs: ["wf_author"],
      },
      guidance: null,
      factDefinitions: [{ key: "fact_goal" }],
    },
  }),
}));

import {
  MethodologyWorkspaceEntryRoute,
  Route,
} from "../../routes/methodologies.$methodologyId.versions.$versionId";

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
    useLocationMock.mockReturnValue({
      pathname: "/methodologies/bmad.v1/versions/mver_bmad_project_context_only_draft",
    });
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

  it("only accepts author and review as top-level workspace pages", () => {
    const validateSearch = (
      Route as unknown as {
        validateSearch: (search: unknown) => unknown;
      }
    ).validateSearch;

    expect(validateSearch({})).toEqual({});
    expect(validateSearch({ page: "author" })).toEqual({ page: "author" });
    expect(validateSearch({ page: "review" })).toEqual({ page: "review" });

    expect(() => validateSearch({ page: "publish" })).toThrow();
    expect(() => validateSearch({ page: "evidence" })).toThrow();
    expect(() => validateSearch({ page: "context" })).toThrow();
  });

  it("renders the new author hub shell on the top-level workspace route", async () => {
    const { queryClient } = createTestHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyWorkspaceEntryRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("button", { name: "Author" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Review & Publish" })).toBeTruthy();

    expect(screen.getByText("DRAFT")).toBeTruthy();
    expect(screen.getByText("SAVE STATE")).toBeTruthy();
    expect(screen.getByText("RUNTIME")).toBeTruthy();
    expect(screen.getByText("READINESS")).toBeTruthy();

    expect(screen.getByText("Work Units")).toBeTruthy();
    expect(screen.getByText("Facts")).toBeTruthy();
    expect(screen.getByText("Agents")).toBeTruthy();
    expect(screen.getByText("Link Types")).toBeTruthy();

    expect(screen.getByText(/Open Work Units/i)).toBeTruthy();
    expect(screen.getByText(/Add Work Unit/i)).toBeTruthy();
    expect(screen.getByText(/Open Facts/i)).toBeTruthy();
    expect(screen.getByText(/Add Fact/i)).toBeTruthy();
    expect(screen.getByText(/Open Agents/i)).toBeTruthy();
    expect(screen.getByText(/Add Agent/i)).toBeTruthy();
    expect(screen.getByText(/Open Link Types/i)).toBeTruthy();
    expect(screen.getByText(/Add Link Type/i)).toBeTruthy();

    expect(screen.getByText(/G W/i)).toBeTruthy();
    expect(screen.getByText(/C W/i)).toBeTruthy();
    expect(screen.getByText(/G F/i)).toBeTruthy();
    expect(screen.getByText(/C F/i)).toBeTruthy();
    expect(screen.getByText(/G A/i)).toBeTruthy();
    expect(screen.getByText(/C A/i)).toBeTruthy();
    expect(screen.getByText(/G L/i)).toBeTruthy();
    expect(screen.getByText(/C L/i)).toBeTruthy();

    expect(screen.getByText("2 work units")).toBeTruthy();
    expect(screen.getByText("3 transitions")).toBeTruthy();
    expect(screen.getByText("2 workflows")).toBeTruthy();
    expect(screen.getByText("1 methodology fact")).toBeTruthy();
    expect(screen.getByText("3 agent definitions")).toBeTruthy();
    expect(screen.getByText("2 link types")).toBeTruthy();
    expect(screen.getByText("3 active bindings")).toBeTruthy();
    expect(screen.getAllByTestId("surface-card-separator")).toHaveLength(4);
    expect(screen.getAllByTestId("surface-card-footer")).toHaveLength(4);
    expect(screen.getAllByTestId("surface-card-corner")).toHaveLength(16);
    expect(screen.queryByText("Workspace body")).toBeNull();
  });
});
