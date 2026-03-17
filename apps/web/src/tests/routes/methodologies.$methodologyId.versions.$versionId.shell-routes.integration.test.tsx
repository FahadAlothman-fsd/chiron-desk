import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useParamsMock, useSearchMock, useRouteContextMock, useLocationMock, useNavigateMock } =
  vi.hoisted(() => ({
    useParamsMock: vi.fn(),
    useSearchMock: vi.fn(),
    useRouteContextMock: vi.fn(),
    useLocationMock: vi.fn(),
    useNavigateMock: vi.fn(),
  }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
  Outlet: () => <div>Nested route outlet</div>,
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: useParamsMock,
    useSearch: useSearchMock,
    useRouteContext: useRouteContextMock,
    useNavigate: () => useNavigateMock,
  }),
  useLocation: useLocationMock,
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

function createRouteContext(options?: {
  detailsQueryFn?: () => Promise<unknown>;
  draftQueryFn?: () => Promise<unknown>;
  evidenceQueryFn?: () => Promise<unknown>;
}) {
  const detailsQueryFn = options?.detailsQueryFn ?? (async () => ({ versions: [] }));
  const draftQueryFn =
    options?.draftQueryFn ??
    (async () => ({
      workUnitTypes: [{ key: "WU.TASK", displayName: "Task" }],
      agentTypes: [{ key: "agent.research", displayName: "Research Agent" }],
      transitionWorkflowBindings: { "link.requires": ["wf.a"] },
    }));
  const evidenceQueryFn = options?.evidenceQueryFn ?? (async () => []);

  return {
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    }),
    orpc: {
      methodology: {
        getMethodologyDetails: {
          queryOptions: ({ input }: { input: { methodologyKey: string } }) => ({
            queryKey: ["methodology", "details", input.methodologyKey],
            queryFn: detailsQueryFn,
          }),
        },
        getDraftProjection: {
          queryOptions: ({ input }: { input: { versionId: string } }) => ({
            queryKey: ["methodology", "draft", input.versionId],
            queryFn: draftQueryFn,
          }),
        },
        getPublicationEvidence: {
          queryOptions: ({ input }: { input: { methodologyVersionId: string } }) => ({
            queryKey: ["methodology", "evidence", input.methodologyVersionId],
            queryFn: evidenceQueryFn,
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
    },
  };
}

function renderWithQueryClient(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  useParamsMock.mockReset();
  useSearchMock.mockReset();
  useRouteContextMock.mockReset();
  useLocationMock.mockReset();
  useNavigateMock.mockReset();
  useRouteContextMock.mockReturnValue(createRouteContext());
  useLocationMock.mockReturnValue({
    pathname: "/methodologies/equity-core/versions/draft-v2/work-units",
  });
});

afterEach(() => {
  cleanup();
});

describe("methodology version shell routes", () => {
  it("renders the new workspace author shell contract at the top layer", async () => {
    const { MethodologyWorkspaceEntryRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId");
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({});
    useLocationMock.mockReturnValue({ pathname: "/methodologies/equity-core/versions/draft-v2" });
    useRouteContextMock.mockReturnValue(
      createRouteContext({
        detailsQueryFn: async () => ({
          versions: [{ id: "draft-v2", version: "Draft: Equity Draft", status: "draft" }],
        }),
      }),
    );

    renderWithQueryClient(<MethodologyWorkspaceEntryRoute />);

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
    expect(screen.getAllByTestId("surface-card-separator")).toHaveLength(4);
    expect(screen.getAllByTestId("surface-card-footer")).toHaveLength(4);
    expect(screen.getAllByTestId("surface-card-corner")).toHaveLength(16);
  });

  it("renders work-units shell and keeps add intent context", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({ intent: "add-work-unit" });

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    expect(await screen.findByText("+ Add Work Unit")).toBeTruthy();
    expect(screen.getByText(/Add Work Unit requested from command palette/)).toBeTruthy();
  });

  it("renders work-unit detail shell with preserved selected key", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "state-machine" });

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    expect(await screen.findByText("Work Unit · WU.TASK")).toBeTruthy();
    expect(screen.getByText("Work Unit: WU.TASK")).toBeTruthy();
    expect(screen.getByText("State Machine")).toBeTruthy();
    expect(screen.getByText("Artifact Slots")).toBeTruthy();
  });

  it("renders agents shell and intent banner", async () => {
    const { MethodologyVersionAgentsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.agents");
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({ intent: "add-agent" });

    renderWithQueryClient(<MethodologyVersionAgentsRoute />);

    expect(await screen.findByText("+ Add Agent")).toBeTruthy();
    expect(screen.getByText("Add Agent requested from command palette.")).toBeTruthy();
    expect(screen.getByText("Contracts")).toBeTruthy();
    expect(screen.getByText("Diagnostics")).toBeTruthy();
  });

  it("renders dependency definitions shell and intent banner", async () => {
    const { MethodologyVersionDependencyDefinitionsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions");
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({ intent: "add-link-type" });

    renderWithQueryClient(<MethodologyVersionDependencyDefinitionsRoute />);

    expect(await screen.findByText("+ Add Link Type")).toBeTruthy();
    expect(screen.getByText("Add Link Type requested from command palette.")).toBeTruthy();
    expect(screen.getByText("Definitions")).toBeTruthy();
    expect(screen.getByText("Usage")).toBeTruthy();
  });

  it("renders deterministic loading state while preserving scope copy", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({});
    useRouteContextMock.mockReturnValue(
      createRouteContext({
        draftQueryFn: () => new Promise(() => undefined),
      }),
    );

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    expect(screen.getByText("Loading work-unit shells for this version...")).toBeTruthy();
  });

  it("renders deterministic failed-state copy while preserving route context", async () => {
    const { MethodologyVersionDependencyDefinitionsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions");
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({});
    useRouteContextMock.mockReturnValue(
      createRouteContext({
        draftQueryFn: async () => {
          throw new Error("boom");
        },
      }),
    );

    renderWithQueryClient(<MethodologyVersionDependencyDefinitionsRoute />);

    expect(
      await screen.findByText(
        "State: failed - Unable to load dependency definitions while preserving current methodology/version context.",
      ),
    ).toBeTruthy();
  });
});
