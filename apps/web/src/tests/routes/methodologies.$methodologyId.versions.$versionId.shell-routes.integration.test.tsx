import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  useNavigate: () => useNavigateMock,
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
      agentTypes: [
        {
          key: "agent.research",
          displayName: "Research Agent",
          promptTemplate: { markdown: "Thorough reviewer" },
        },
      ],
      linkTypeDefinitions: [{ key: "link.requires", name: "Requires" }],
      transitionWorkflowBindings: { "link.requires": ["wf.a"] },
    }));
  const evidenceQueryFn = options?.evidenceQueryFn ?? (async () => []);
  const createAgentMock = vi.fn(async () => ({ validation: { valid: true, diagnostics: [] } }));
  const updateAgentMock = vi.fn(async () => ({ validation: { valid: true, diagnostics: [] } }));
  const deleteAgentMock = vi.fn(async () => ({ validation: { valid: true, diagnostics: [] } }));
  const createWorkUnitMock = vi.fn(async (_input: unknown) => ({
    validation: { valid: true, diagnostics: [] },
  }));
  const updateWorkUnitMock = vi.fn(async (_input: unknown) => ({
    validation: { valid: true, diagnostics: [] },
  }));
  const createDependencyDefinitionMock = vi.fn(async () => ({ diagnostics: [] }));
  const updateDependencyDefinitionMock = vi.fn(async () => ({ diagnostics: [] }));
  const deleteDependencyDefinitionMock = vi.fn(async () => ({ diagnostics: [] }));

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
        updateDraftLifecycle: {
          mutationOptions: () => ({
            mutationFn: async () => ({ validation: { valid: true, diagnostics: [] } }),
          }),
        },
        updateDraftWorkflows: {
          mutationOptions: () => ({ mutationFn: async () => ({ diagnostics: [] }) }),
        },
        version: {
          workspace: {
            get: {
              queryOptions: ({ input }: { input: { versionId: string } }) => ({
                queryKey: ["methodology", "draft", input.versionId],
                queryFn: draftQueryFn,
              }),
            },
          },
          getPublicationEvidence: {
            queryOptions: ({ input }: { input: { methodologyVersionId: string } }) => ({
              queryKey: ["methodology", "evidence", input.methodologyVersionId],
              queryFn: evidenceQueryFn,
            }),
          },
          validate: {
            mutationOptions: () => ({ mutationFn: async () => ({ valid: true, diagnostics: [] }) }),
          },
          publish: {
            mutationOptions: () => ({
              mutationFn: async () => ({ published: false, diagnostics: [], evidence: null }),
            }),
          },
          agent: {
            list: {
              queryOptions: ({ input }: { input: { versionId: string } }) => ({
                queryKey: ["methodology", "draft", input.versionId, "agents"],
                queryFn: draftQueryFn,
              }),
            },
            create: {
              mutationOptions: (options: Record<string, unknown> = {}) => ({
                mutationFn: createAgentMock,
                ...options,
              }),
            },
            update: {
              mutationOptions: (options: Record<string, unknown> = {}) => ({
                mutationFn: updateAgentMock,
                ...options,
              }),
            },
            delete: {
              mutationOptions: (options: Record<string, unknown> = {}) => ({
                mutationFn: deleteAgentMock,
                ...options,
              }),
            },
          },
          dependencyDefinition: {
            list: {
              queryOptions: ({ input }: { input: { versionId: string } }) => ({
                queryKey: ["methodology", "draft", input.versionId, "dependency-definitions"],
                queryFn: draftQueryFn,
              }),
            },
            create: {
              mutationOptions: (options: Record<string, unknown> = {}) => ({
                mutationFn: createDependencyDefinitionMock,
                ...options,
              }),
            },
            update: {
              mutationOptions: (options: Record<string, unknown> = {}) => ({
                mutationFn: updateDependencyDefinitionMock,
                ...options,
              }),
            },
            delete: {
              mutationOptions: (options: Record<string, unknown> = {}) => ({
                mutationFn: deleteDependencyDefinitionMock,
                ...options,
              }),
            },
          },
          workUnit: {
            list: {
              queryOptions: ({ input }: { input: { versionId: string } }) => ({
                queryKey: ["methodology", "draft", input.versionId, "work-units"],
                queryFn: draftQueryFn,
              }),
            },
            create: {
              mutationOptions: () => ({
                mutationFn: createWorkUnitMock,
              }),
            },
            updateMeta: {
              mutationOptions: () => ({
                mutationFn: updateWorkUnitMock,
              }),
            },
            get: {
              queryOptions: ({ input }: { input: { versionId: string } }) => ({
                queryKey: ["methodology", "draft", input.versionId, "work-unit"],
                queryFn: draftQueryFn,
              }),
            },
          },
        },
      },
    },
    createAgentMock,
    updateAgentMock,
    deleteAgentMock,
    createWorkUnitMock,
    updateWorkUnitMock,
    createDependencyDefinitionMock,
    updateDependencyDefinitionMock,
    deleteDependencyDefinitionMock,
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

  it("renders work-units shell with graph/contracts/diagnostics views and active summary", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({ view: "graph", selected: "WU.TASK" });

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    expect(await screen.findByPlaceholderText("Search work units...")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Graph" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Contracts" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Diagnostics" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "List" })).toBeNull();
    expect(screen.getByText("ACTIVE WORK UNIT")).toBeTruthy();
    expect(screen.getByText("Open details")).toBeTruthy();
    expect(screen.getByText("Open Relationship View")).toBeTruthy();
  });

  it("creates a work unit with guidance through version.workUnit.create", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({});
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Work Unit" }));
    expect(screen.getByRole("button", { name: /Many per project/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /One per project/i })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Work Unit Key"), { target: { value: "WU.INTAKE" } });
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Intake" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Collect intake guidance" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    fireEvent.change(screen.getByLabelText("Human Guidance"), {
      target: { value: "Ask operator for intake context." },
    });
    fireEvent.change(screen.getByLabelText("Agent Guidance"), {
      target: { value: "Extract structured intake summary." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Work Unit" }));

    await waitFor(() => expect(routeContext.createWorkUnitMock).toHaveBeenCalledTimes(1));
    const firstCreateCall = routeContext.createWorkUnitMock.mock.calls.at(0);
    expect(firstCreateCall).toBeTruthy();
    const createPayload = firstCreateCall?.[0];
    expect(createPayload).toEqual(
      expect.objectContaining({
        versionId: "draft-v2",
        workUnitType: expect.objectContaining({
          key: "WU.INTAKE",
          displayName: "Intake",
          description: "Collect intake guidance",
          guidance: {
            human: { markdown: "Ask operator for intake context." },
            agent: { markdown: "Extract structured intake summary." },
          },
          cardinality: "many_per_project",
        }),
      }),
    );
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

  it("renders overview as four command cards without mini-graph", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "overview" });

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    expect(await screen.findByRole("heading", { name: "Facts" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Workflows" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "State Machine" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Artifact Slots" })).toBeTruthy();
    expect(screen.getByText("Add Fact")).toBeTruthy();
    expect(screen.getByText("Add Workflow")).toBeTruthy();
    expect(screen.getByText("Add State")).toBeTruthy();
    expect(screen.getByText("Add Artifact Slot")).toBeTruthy();
    expect(screen.getAllByTestId("surface-card-corner")).toHaveLength(16);
    expect(screen.getAllByTestId("surface-card-overlay")).toHaveLength(4);
    expect(screen.queryByText("Focused Dependency Graph")).toBeNull();
  });

  it("renders a failed shell when the selected work unit key does not exist in the draft", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.MISSING",
    });
    useSearchMock.mockReturnValue({ tab: "overview" });

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    expect(await screen.findByText("Work Unit · WU.MISSING")).toBeTruthy();
    expect(
      await screen.findByText(
        "State: failed - Unable to load work-unit details while preserving selected context.",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText("L2 detail shell is active for deterministic Story 3.1 baseline."),
    ).toBeNull();
    expect(screen.getByText("Work Unit: WU.MISSING")).toBeTruthy();
  });

  it("opens the agents create dialog from add-agent intent and clears intent after create", async () => {
    const { MethodologyVersionAgentsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.agents");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({ intent: "add-agent" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionAgentsRoute />);

    expect(await screen.findByText("+ Add Agent")).toBeTruthy();
    expect(screen.getByText("Add Agent requested from command palette.")).toBeTruthy();
    expect(screen.getByText("Contracts")).toBeTruthy();
    expect(screen.getByText("Diagnostics")).toBeTruthy();

    expect(screen.getByLabelText("Agent Key")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Agent Key"), { target: { value: "agent.review" } });
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Review Agent" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Reviews outputs" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    fireEvent.change(screen.getByLabelText("System Prompt (Markdown)"), {
      target: { value: "Thorough reviewer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Agent" }));

    await waitFor(() => expect(routeContext.createAgentMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(useNavigateMock).toHaveBeenCalledWith({
        to: "/methodologies/$methodologyId/versions/$versionId/agents",
        params: { methodologyId: "equity-core", versionId: "draft-v2" },
        search: {},
        replace: true,
      }),
    );
  });

  it("creates an agent through version.agent.create", async () => {
    const { MethodologyVersionAgentsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.agents");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({});
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionAgentsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Agent" }));
    fireEvent.change(screen.getByLabelText("Agent Key"), { target: { value: "agent.review" } });
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Review Agent" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Reviews outputs" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    fireEvent.change(screen.getByLabelText("System Prompt (Markdown)"), {
      target: { value: "Thorough reviewer" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Advanced (Deferred)" }));
    expect(
      screen.getByText(
        "Advanced runtime settings are deferred in v1; this raw JSON editor is temporary.",
      ),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Advanced JSON"), {
      target: {
        value: "{ invalid",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Agent" }));

    expect(routeContext.createAgentMock).toHaveBeenCalledTimes(0);
    expect(screen.getByText("Advanced JSON must be valid JSON before saving.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Advanced JSON"), {
      target: {
        value:
          '{"defaultModel":{"provider":"openai","model":"gpt-5"},"mcpServers":["filesystem","github"],"capabilities":["reasoning","tool-use"]}',
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Agent" }));

    await waitFor(() => expect(routeContext.createAgentMock).toHaveBeenCalledTimes(1));
    expect(routeContext.createAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: expect.objectContaining({
          defaultModel: { provider: "openai", model: "gpt-5" },
          mcpServers: ["filesystem", "github"],
          capabilities: ["reasoning", "tool-use"],
        }),
      }),
      expect.anything(),
    );
  });

  it("updates an agent through version.agent.update", async () => {
    const { MethodologyVersionAgentsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.agents");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({});
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionAgentsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit Research Agent" }));
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Research Agent Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Agent Changes" }));

    await waitFor(() => expect(routeContext.updateAgentMock).toHaveBeenCalledTimes(1));
  });

  it("deletes an agent through version.agent.delete", async () => {
    const { MethodologyVersionAgentsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.agents");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({});
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionAgentsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "Delete Research Agent" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Delete Agent" }));

    await waitFor(() => expect(routeContext.deleteAgentMock).toHaveBeenCalledTimes(1));
  });

  it("opens the dependency definition dialog from add-link-type intent and clears intent after create", async () => {
    const { MethodologyVersionDependencyDefinitionsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({ intent: "add-link-type" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionDependencyDefinitionsRoute />);

    expect(await screen.findByText("+ Add Link Type")).toBeTruthy();
    expect(screen.getByText("Add Link Type requested from command palette.")).toBeTruthy();
    expect(screen.getByText("Definitions")).toBeTruthy();
    expect(screen.getByText("Usage")).toBeTruthy();

    expect(screen.getByLabelText("Link Type Key")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Link Type Key"), { target: { value: "depends_on" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Depends On" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Depends on another work unit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    fireEvent.change(screen.getByLabelText("Human Guidance"), {
      target: { value: "Require upstream completion before start." },
    });
    fireEvent.change(screen.getByLabelText("Agent Guidance"), {
      target: { value: "Schedule this item after upstream dependencies close." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Link Type" }));

    await waitFor(() =>
      expect(routeContext.createDependencyDefinitionMock).toHaveBeenCalledTimes(1),
    );
    await waitFor(() =>
      expect(useNavigateMock).toHaveBeenCalledWith({
        to: "/methodologies/$methodologyId/versions/$versionId/dependency-definitions",
        params: { methodologyId: "equity-core", versionId: "draft-v2" },
        search: {},
        replace: true,
      }),
    );
  });

  it("creates a dependency definition through version.dependencyDefinition.create", async () => {
    const { MethodologyVersionDependencyDefinitionsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({});
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionDependencyDefinitionsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Link Type" }));
    fireEvent.change(screen.getByLabelText("Link Type Key"), { target: { value: "depends_on" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Depends On" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Depends on another work unit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    fireEvent.change(screen.getByLabelText("Human Guidance"), {
      target: { value: "Require upstream completion before start." },
    });
    fireEvent.change(screen.getByLabelText("Agent Guidance"), {
      target: { value: "Schedule this item after upstream dependencies close." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Link Type" }));

    await waitFor(() =>
      expect(routeContext.createDependencyDefinitionMock).toHaveBeenCalledTimes(1),
    );
  });

  it("updates a dependency definition through version.dependencyDefinition.update", async () => {
    const { MethodologyVersionDependencyDefinitionsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({});
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionDependencyDefinitionsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit link.requires" }));
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Updated dependency description" },
    });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Requires" } });
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    fireEvent.change(screen.getByLabelText("Human Guidance"), {
      target: { value: "Explain why this dependency must complete first." },
    });
    fireEvent.change(screen.getByLabelText("Agent Guidance"), {
      target: { value: "Block workflow execution until dependency resolves." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Link Type Changes" }));

    await waitFor(() =>
      expect(routeContext.updateDependencyDefinitionMock).toHaveBeenCalledTimes(1),
    );
  });

  it("deletes a dependency definition through version.dependencyDefinition.delete", async () => {
    const { MethodologyVersionDependencyDefinitionsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({});
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionDependencyDefinitionsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "Delete link.requires" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Link Type Permanently" }));

    await waitFor(() =>
      expect(routeContext.deleteDependencyDefinitionMock).toHaveBeenCalledTimes(1),
    );
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
