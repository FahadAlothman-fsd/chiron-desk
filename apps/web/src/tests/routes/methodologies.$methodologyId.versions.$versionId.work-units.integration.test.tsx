import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  useParamsMock,
  useSearchMock,
  useRouteContextMock,
  useNavigateMock,
  useLocationMock,
  createWorkUnitMutationSpy,
  updateWorkUnitMutationSpy,
  deleteWorkUnitMutationSpy,
  toastSuccessSpy,
  toastErrorSpy,
} = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
  useSearchMock: vi.fn(),
  useRouteContextMock: vi.fn(),
  useNavigateMock: vi.fn(),
  useLocationMock: vi.fn(),
  createWorkUnitMutationSpy: vi.fn(async () => ({
    validation: { valid: true, diagnostics: [] as Array<Record<string, unknown>> },
  })),
  updateWorkUnitMutationSpy: vi.fn(async () => ({
    validation: { valid: true, diagnostics: [] as Array<Record<string, unknown>> },
  })),
  deleteWorkUnitMutationSpy: vi.fn(async () => ({
    validation: { valid: true, diagnostics: [] as Array<Record<string, unknown>> },
  })),
  toastSuccessSpy: vi.fn(),
  toastErrorSpy: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessSpy,
    error: toastErrorSpy,
  },
}));

const draftQueryKey = ["rpc", "methodology", "version", "workUnit", "list", "draft-v3"];
const detailsQueryKey = ["rpc", "methodology", "details", "equity-core"];

function createDraftProjection() {
  return {
    workUnitTypes: [
      {
        key: "WU.INTAKE",
        displayName: "Intake",
        description: "Collect intake guidance and initial operator context.",
        guidance: {
          human: { markdown: "Capture the intake packet from the operator." },
          agent: { markdown: "Normalize the intake packet into structured fields." },
        },
        cardinality: "many_per_project",
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
        description: "Validate the intake package before publication.",
        guidance: {
          human: { markdown: "Review the validation checklist before approval." },
          agent: { markdown: "Flag any unresolved validation issues." },
        },
        cardinality: "one_per_project",
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
}

let draftProjectionState = createDraftProjection();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
  Outlet: () => <div data-testid="work-units-nested-outlet">Nested work-unit details route</div>,
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: useParamsMock,
    useSearch: useSearchMock,
    useRouteContext: useRouteContextMock,
    useNavigate: () => useNavigateMock,
  }),
  useLocation: useLocationMock,
}));

function createRouteContext() {
  return {
    orpc: {
      methodology: {
        getMethodologyDetails: {
          queryOptions: (_options: { input: { methodologyKey: string } }) => ({
            queryKey: detailsQueryKey,
            queryFn: async () => ({ versions: [] }),
          }),
        },
        version: {
          workUnit: {
            list: {
              queryOptions: (_options: { input: { versionId: string } }) => ({
                queryKey: draftQueryKey,
                queryFn: async () => draftProjectionState,
              }),
            },
            create: {
              mutationOptions: () => ({ mutationFn: createWorkUnitMutationSpy }),
            },
            updateMeta: {
              mutationOptions: () => ({ mutationFn: updateWorkUnitMutationSpy }),
            },
            delete: {
              mutationOptions: () => ({ mutationFn: deleteWorkUnitMutationSpy }),
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
  useLocationMock.mockReset();

  useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v3" });
  useSearchMock.mockReturnValue({ view: "graph", selected: "WU.INTAKE" });
  useLocationMock.mockReturnValue({
    pathname: "/methodologies/equity-core/versions/draft-v3/work-units",
  });
  useRouteContextMock.mockReturnValue(createRouteContext());
  draftProjectionState = createDraftProjection();
  createWorkUnitMutationSpy.mockClear();
  updateWorkUnitMutationSpy.mockClear();
  deleteWorkUnitMutationSpy.mockClear();
  toastSuccessSpy.mockClear();
  toastErrorSpy.mockClear();
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
    expect(
      routeModule.Route.validateSearch({
        view: "contracts",
        selected: "WU.INTAKE",
        tab: "facts",
      }),
    ).toEqual({
      view: "contracts",
      selected: "WU.INTAKE",
      tab: "facts",
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

  it("renders a clear list-only work-units shell", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    expect(await screen.findByPlaceholderText("Search work units...")).toBeTruthy();
    expect(await screen.findByRole("columnheader", { name: "Work Unit" })).toBeTruthy();
    expect(await screen.findByRole("columnheader", { name: "Cardinality" })).toBeTruthy();
    expect(await screen.findByRole("columnheader", { name: "Human Guidance" })).toBeTruthy();
    expect(await screen.findByRole("columnheader", { name: "Agent Guidance" })).toBeTruthy();
    expect(await screen.findByRole("columnheader", { name: "Facts" })).toBeTruthy();
    expect(await screen.findByRole("columnheader", { name: "Actions" })).toBeTruthy();
    expect(screen.getByText("Capture the intake packet from the operator.")).toBeTruthy();
    expect(screen.getByText("Flag any unresolved validation issues.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Graph" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Contracts" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Diagnostics" })).toBeNull();
    expect(screen.getByText("+ Add Work Unit")).toBeTruthy();
    expect(screen.queryByText("ACTIVE WORK UNIT")).toBeNull();
    expect(screen.queryByText("Open details")).toBeNull();
    expect(screen.queryByText("Open Relationship View")).toBeNull();
  });

  it("renders nested detail outlet when URL is on work-unit child route", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    useLocationMock.mockReturnValue({
      pathname: "/methodologies/equity-core/versions/draft-v3/work-units/WU.VALIDATION",
    });

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    expect(await screen.findByTestId("work-units-nested-outlet")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Search work units...")).toBeNull();
  });

  it("navigates to work-unit detail route when selecting a work unit from the list", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    const validationCell = await screen.findByText("Validation");
    const validationRow = validationCell.closest("tr");
    expect(validationRow).not.toBeNull();

    fireEvent.click(
      within(validationRow as HTMLTableRowElement).getByRole("button", { name: /View details/i }),
    );

    expect(useNavigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/methodologies/$methodologyId/versions/$versionId/work-units/$workUnitKey",
        params: {
          methodologyId: "equity-core",
          versionId: "draft-v3",
          workUnitKey: "WU.VALIDATION",
        },
      }),
    );
  });

  it("opens edit dialog from the actions column", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    const intakeCell = await screen.findByText("Intake");
    const intakeRow = intakeCell.closest("tr");
    expect(intakeRow).not.toBeNull();

    fireEvent.click(
      within(intakeRow as HTMLTableRowElement).getByRole("button", { name: /^Edit$/i }),
    );

    expect(await screen.findByLabelText("Work Unit Key")).toBeTruthy();
    expect(screen.getByDisplayValue("WU.INTAKE")).toBeTruthy();
    expect(screen.getByDisplayValue("Intake")).toBeTruthy();
  });

  it("creates a work unit through Contract and Guidance tabs", async () => {
    createWorkUnitMutationSpy.mockImplementationOnce(async (...args: unknown[]) => {
      const [{ workUnitType }] = args as [
        { workUnitType: (typeof draftProjectionState.workUnitTypes)[number] },
      ];
      draftProjectionState = {
        ...draftProjectionState,
        workUnitTypes: [
          ...draftProjectionState.workUnitTypes,
          {
            key: workUnitType.key,
            displayName: workUnitType.displayName,
            description: workUnitType.description,
            guidance: workUnitType.guidance,
            cardinality: workUnitType.cardinality,
            lifecycleStates: [{ key: "draft" }],
            lifecycleTransitions: [],
            factSchemas: [],
          },
        ],
      };

      return {
        validation: { valid: true, diagnostics: [] },
      };
    });

    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Work Unit" }));

    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
    expect(screen.getByText("Contract").closest("div")?.className.includes("border-b")).toBe(true);
    expect(
      screen.queryByText("/", {
        selector: "span.text-xs.text-muted-foreground",
      }),
    ).toBeNull();

    expect((await screen.findAllByText("Contract")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Guidance").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("Work Unit Key")).toBeTruthy();
    expect(screen.getByLabelText("Display Name")).toBeTruthy();
    expect(screen.getByLabelText("Description")).toBeTruthy();
    expect(screen.getByLabelText("Cardinality")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Work Unit Key"), {
      target: { value: "WU.NEW_STEP" },
    });
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "New Step" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Operator-facing work unit summary." },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /One per project Limit this work unit to a single instance per project lifecycle\./,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Guidance/ }));

    expect(await screen.findByLabelText("Human Guidance")).toBeTruthy();
    expect(screen.getByLabelText("Agent Guidance")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Human Guidance"), {
      target: { value: "Capture the operator-facing definition of done." },
    });
    fireEvent.change(screen.getByLabelText("Agent Guidance"), {
      target: { value: "Draft the normalized work-unit brief for downstream automation." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Work Unit" }));

    await waitFor(() => {
      expect(createWorkUnitMutationSpy).toHaveBeenCalled();
    });

    const firstCall = createWorkUnitMutationSpy.mock.calls[0] as [unknown, unknown?] | undefined;

    expect(firstCall?.[0]).toEqual(
      expect.objectContaining({
        versionId: "draft-v3",
        workUnitType: expect.objectContaining({
          key: "WU.NEW_STEP",
          displayName: "New Step",
          description: { markdown: "Operator-facing work unit summary." },
          cardinality: "one_per_project",
          guidance: {
            human: { markdown: "Capture the operator-facing definition of done." },
            agent: {
              markdown: "Draft the normalized work-unit brief for downstream automation.",
            },
          },
        }),
      }),
    );

    await waitFor(() => {
      expect(screen.getAllByText("New Step").length).toBeGreaterThan(0);
    });
  });

  it("surfaces a human-readable error when create work unit fails", async () => {
    createWorkUnitMutationSpy.mockRejectedValueOnce(new Error("BAD_REQUEST"));

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

  it("surfaces server-provided lifecycle diagnostic when create work unit mutation rejects", async () => {
    createWorkUnitMutationSpy.mockRejectedValueOnce({
      code: "BAD_REQUEST",
      message: "Work-unit lifecycle validation failed",
      data: {
        firstDiagnostic: {
          code: "MISSING_LIFECYCLE_TRANSITION_TARGET",
          message: "Missing lifecycle transition target for work unit WU.FAIL_CASE.",
          scope: "workUnitTypes[2].lifecycleTransitions[0].toState",
        },
      },
    });

    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Work Unit" }));
    fireEvent.change(screen.getByLabelText("Work Unit Key"), {
      target: { value: "WU.FAIL_CASE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Work Unit" }));

    expect(
      await screen.findByText("Missing lifecycle transition target for work unit WU.FAIL_CASE."),
    ).toBeTruthy();
    expect(screen.getByLabelText("Work Unit Key")).toBeTruthy();
    expect(toastSuccessSpy).not.toHaveBeenCalled();
  });

  it("surfaces server actionable message when rejected mutation omits firstDiagnostic", async () => {
    createWorkUnitMutationSpy.mockRejectedValueOnce({
      code: "BAD_REQUEST",
      message: "Work-unit lifecycle validation failed",
      data: {
        actionableMessage:
          "Work-unit description must be an object with description.markdown as a string",
      },
    });

    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Work Unit" }));
    fireEvent.change(screen.getByLabelText("Work Unit Key"), {
      target: { value: "WU.FAIL_SHAPE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Work Unit" }));

    expect(
      await screen.findByText(
        "Work-unit description must be an object with description.markdown as a string",
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText("Work Unit Key")).toBeTruthy();
    expect(toastSuccessSpy).not.toHaveBeenCalled();
  });

  it("keeps create dialog open and shows duplicate key error when create returns invalid diagnostics", async () => {
    createWorkUnitMutationSpy.mockResolvedValueOnce({
      diagnostics: {
        valid: false,
        diagnostics: [
          {
            code: "DUPLICATE_WORK_UNIT_KEY",
            scope: "workUnitTypes[2].key",
          },
        ],
      },
    } as never);

    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Work Unit" }));
    fireEvent.change(screen.getByLabelText("Work Unit Key"), {
      target: { value: "WU.NEW_DUP" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Work Unit" }));

    expect(await screen.findByText("Work Unit Key must be unique.")).toBeTruthy();
    expect(screen.getByLabelText("Work Unit Key")).toBeTruthy();
    expect(toastSuccessSpy).not.toHaveBeenCalled();
  });

  it("keeps edit dialog open and shows duplicate key error when update returns invalid validation payload", async () => {
    updateWorkUnitMutationSpy.mockResolvedValueOnce({
      validation: {
        valid: false,
        diagnostics: [
          {
            code: "DUPLICATE_WORK_UNIT_KEY",
            scope: "workUnitTypes[0].key",
          },
        ],
      },
    });

    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    const intakeCell = await screen.findByText("Intake");
    const intakeRow = intakeCell.closest("tr");
    expect(intakeRow).not.toBeNull();

    fireEvent.click(
      within(intakeRow as HTMLTableRowElement).getByRole("button", { name: /^Edit$/i }),
    );

    fireEvent.change(screen.getByLabelText("Work Unit Key"), {
      target: { value: "WU.CHANGED" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Work Unit Changes" }));

    expect(await screen.findByText("Work Unit Key must be unique.")).toBeTruthy();
    expect(screen.getByLabelText("Work Unit Key")).toBeTruthy();
    expect(toastSuccessSpy).not.toHaveBeenCalled();
  });

  it("shows dirty indicators and confirms cancel when dialog has unsaved changes", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Work Unit" }));
    fireEvent.change(screen.getByLabelText("Work Unit Key"), {
      target: { value: "WU.UNSAVED" },
    });

    expect(screen.getByTestId("work-unit-contract-modified-indicator")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    fireEvent.change(screen.getByLabelText("Human Guidance"), {
      target: { value: "Unsaved guidance content" },
    });

    expect(screen.getByTestId("work-unit-guidance-modified-indicator")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("Discard unsaved changes?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep Editing" }));
    expect(screen.queryByText("Discard unsaved changes?")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));

    expect(screen.queryByText("Discard unsaved changes?")).toBeNull();
    expect(screen.queryByLabelText("Work Unit Key")).toBeNull();
  });
});
