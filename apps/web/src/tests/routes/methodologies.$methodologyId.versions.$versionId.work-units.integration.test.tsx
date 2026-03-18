import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  useParamsMock,
  useSearchMock,
  useRouteContextMock,
  useNavigateMock,
  updateDraftLifecycleMutationSpy,
} = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
  useSearchMock: vi.fn(),
  useRouteContextMock: vi.fn(),
  useNavigateMock: vi.fn(),
  updateDraftLifecycleMutationSpy: vi.fn(async () => ({
    validation: { valid: true, diagnostics: [] },
  })),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: useParamsMock,
    useSearch: useSearchMock,
    useRouteContext: useRouteContextMock,
    useNavigate: () => useNavigateMock,
  }),
}));

function createRouteContext() {
  const draftProjection = {
    workUnitTypes: [
      {
        key: "WU.INTAKE",
        displayName: "Intake",
        lifecycleStates: [{ key: "draft" }, { key: "ready" }],
        lifecycleTransitions: [
          { transitionKey: "draft__to__ready", toState: "ready" },
          { transitionKey: "ready__to__published", toState: "published" },
        ],
        factSchemas: [{ key: "fact.goal" }, { key: "fact.input" }],
      },
      {
        key: "WU.VALIDATION",
        displayName: "Validation",
        lifecycleStates: [{ key: "draft" }, { key: "done" }],
        lifecycleTransitions: [{ transitionKey: "draft__to__done", toState: "done" }],
        factSchemas: [{ key: "fact.result" }],
      },
    ],
    workflows: [
      { key: "wf.intake.review", displayName: "Intake Review", workUnitTypeKey: "WU.INTAKE" },
      { key: "wf.intake.publish", displayName: "Intake Publish", workUnitTypeKey: "WU.INTAKE" },
      {
        key: "wf.validation",
        displayName: "Validation Workflow",
        workUnitTypeKey: "WU.VALIDATION",
      },
    ],
    transitionWorkflowBindings: {
      depends_on: ["wf.intake.review"],
      informs: ["wf.intake.publish", "wf.validation"],
    },
    agentTypes: [
      {
        key: "agent.reviewer",
        displayName: "Reviewer",
        description: "",
        persona: "",
      },
    ],
  };

  return {
    orpc: {
      methodology: {
        getMethodologyDetails: {
          queryOptions: ({ input }: { input: { methodologyKey: string } }) => ({
            queryKey: ["methodology", "details", input.methodologyKey],
            queryFn: async () => ({ versions: [] }),
          }),
        },
        version: {
          workUnit: {
            list: {
              queryOptions: ({ input }: { input: { versionId: string } }) => ({
                queryKey: ["methodology", "draft", input.versionId],
                queryFn: async () => draftProjection,
              }),
            },
            create: {
              mutationOptions: () => ({ mutationFn: updateDraftLifecycleMutationSpy }),
            },
          },
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
  useNavigateMock.mockReset();

  useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v3" });
  useSearchMock.mockReturnValue({ view: "graph", selected: "WU.INTAKE" });
  useRouteContextMock.mockReturnValue(createRouteContext());
  updateDraftLifecycleMutationSpy.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("methodology version work units l1 route", () => {
  it("accepts only graph/contracts/diagnostics view state with selected work unit key", async () => {
    const routeModule =
      (await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units")) as unknown as {
        Route: { validateSearch: (search: unknown) => unknown };
      };

    expect(routeModule.Route.validateSearch({})).toEqual({});
    expect(routeModule.Route.validateSearch({ view: "graph" })).toEqual({ view: "graph" });
    expect(routeModule.Route.validateSearch({ view: "contracts", selected: "WU.INTAKE" })).toEqual({
      view: "contracts",
      selected: "WU.INTAKE",
    });
    expect(
      routeModule.Route.validateSearch({ view: "diagnostics", selected: "WU.INTAKE" }),
    ).toEqual({
      view: "diagnostics",
      selected: "WU.INTAKE",
    });
    expect(() => routeModule.Route.validateSearch({ view: "list" })).toThrow();
    expect(routeModule.Route.validateSearch({ intent: "add-work-unit" })).toEqual({
      intent: "add-work-unit",
    });
  });

  it("opens the create dialog from add-work-unit intent and clears only the intent on close", async () => {
    useSearchMock.mockReturnValue({
      view: "contracts",
      selected: "WU.INTAKE",
      intent: "add-work-unit",
    });

    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    expect(await screen.findByLabelText("Work Unit Key")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(useNavigateMock).toHaveBeenCalledTimes(1);

    const firstCall = useNavigateMock.mock.calls[0] as
      | [
          {
            search?: (previous: {
              view?: "graph" | "contracts" | "diagnostics";
              selected?: string;
              intent?: "add-work-unit";
            }) => unknown;
          },
        ]
      | undefined;

    expect(
      firstCall?.[0]?.search?.({
        view: "contracts",
        selected: "WU.INTAKE",
        intent: "add-work-unit",
      }),
    ).toEqual({
      view: "contracts",
      selected: "WU.INTAKE",
    });
  });

  it("renders the canonical l1 shell with graph/contracts/diagnostics, right rail, and active summary actions", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    expect(await screen.findByPlaceholderText("Search work units...")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Graph" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Contracts" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Diagnostics" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "List" })).toBeNull();
    expect(screen.getByText("+ Add Work Unit")).toBeTruthy();
    expect(screen.getByText("ACTIVE WORK UNIT")).toBeTruthy();
    expect(screen.getByText("key: WU.INTAKE")).toBeTruthy();
    expect(screen.getByText("Open details")).toBeTruthy();
    expect(screen.getByText("Open Relationship View")).toBeTruthy();
  });

  it("opens the relationship view by switching back to graph mode for the active work unit", async () => {
    useSearchMock.mockReturnValue({ view: "contracts", selected: "WU.INTAKE" });

    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "Open Relationship View" }));

    expect(useNavigateMock).toHaveBeenCalledTimes(1);

    const firstCall = useNavigateMock.mock.calls[0] as
      | [
          {
            search?: (previous: {
              view?: "graph" | "contracts" | "diagnostics";
              selected?: string;
            }) => unknown;
          },
        ]
      | undefined;

    expect(firstCall?.[0]?.search?.({ view: "contracts", selected: "WU.INTAKE" })).toEqual({
      view: "graph",
      selected: "WU.INTAKE",
    });
  });

  it("opens a create flow with shallow metadata fields and submits the authored work unit", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Work Unit" }));

    expect(screen.getByLabelText("Work Unit Key")).toBeTruthy();
    expect(screen.getByLabelText("Display Name")).toBeTruthy();
    expect(screen.getByLabelText("Description")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Work Unit Key"), {
      target: { value: "WU.NEW_STEP" },
    });
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "New Step" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Operator-facing work unit summary." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Work Unit" }));

    await waitFor(() => {
      expect(updateDraftLifecycleMutationSpy).toHaveBeenCalled();
    });

    const firstCall = updateDraftLifecycleMutationSpy.mock.calls[0] as
      | [unknown, unknown?]
      | undefined;

    expect(firstCall?.[0]).toEqual(
      expect.objectContaining({
        versionId: "draft-v3",
        workUnitTypes: expect.arrayContaining([
          expect.objectContaining({
            key: "WU.NEW_STEP",
            displayName: "New Step",
            description: "Operator-facing work unit summary.",
          }),
        ]),
        agentTypes: expect.arrayContaining([
          expect.objectContaining({ key: "agent.reviewer", persona: "draft" }),
        ]),
      }),
    );
  });

  it("surfaces a human-readable error when create work unit fails", async () => {
    updateDraftLifecycleMutationSpy.mockRejectedValueOnce(new Error("BAD_REQUEST"));

    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Work Unit" }));
    fireEvent.change(screen.getByLabelText("Work Unit Key"), {
      target: { value: "WU.FAIL_CASE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Work Unit" }));

    expect(
      await screen.findByText(
        "Unable to create work unit. Review the current draft definitions and try again.",
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText("Work Unit Key")).toBeTruthy();
  });
});
