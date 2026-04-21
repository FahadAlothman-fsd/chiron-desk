import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useSearch: () => ({}),
    useParams: () => ({
      methodologyId: "bmad.v1",
      versionId: "mver_bmad_project_context_only_draft",
    }),
  }),
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

import { MethodologyVersionFactsRoute } from "../../routes/methodologies.$methodologyId.versions.$versionId.facts";

function comboboxForField(label: string): HTMLButtonElement {
  const field = screen.getByText(label).closest("div");
  if (!field) {
    throw new Error(`Field not found for ${label}`);
  }

  return within(field).getByRole("combobox") as HTMLButtonElement;
}

function chooseOption(label: string, optionName: string) {
  fireEvent.click(comboboxForField(label));
  const option = screen.getByRole("option", { name: optionName });
  fireEvent.mouseMove(option);
  fireEvent.click(option);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createTestHarness() {
  const draftProjection = {
    id: "mver_bmad_project_context_only_draft",
    methodologyId: "mdef_story_2_7_bmad_v1",
    version: "v2-draft",
    status: "draft",
    displayName: "BMAD v2 Draft",
    workUnitTypes: [],
    agentTypes: [],
    transitions: [],
    workflows: [],
    transitionWorkflowBindings: {},
    guidance: null,
    factDefinitions: [
      {
        name: "Repository URL",
        key: "repo_url",
        valueType: "string",
        defaultValue: "https://example.com/repo.git",
        description: "Canonical repository source.",
        guidance: {
          human: { markdown: "Provide the canonical source repository URL." },
          agent: { markdown: "Use the repo URL when creating workspace context." },
        },
        validation: { kind: "none" },
      },
    ],
  };
  const createFactMock = vi.fn(
    async (input?: { fact?: (typeof draftProjection.factDefinitions)[number] }) => {
      if (input?.fact) {
        draftProjection.factDefinitions = [...draftProjection.factDefinitions, input.fact];
        return { diagnostics: [] };
      }

      return { diagnostics: [] };
    },
  );
  const updateFactMock = vi.fn(
    async (input?: {
      factKey?: string;
      fact?: (typeof draftProjection.factDefinitions)[number];
    }) => {
      if (input?.factKey && input.fact) {
        const nextFact = input.fact;
        draftProjection.factDefinitions = draftProjection.factDefinitions.map((fact) =>
          fact.key === input.factKey ? nextFact : fact,
        );
      }

      return { diagnostics: [] };
    },
  );
  const deleteFactMock = vi.fn(async (input?: { factKey?: string }) => {
    if (input?.factKey) {
      draftProjection.factDefinitions = draftProjection.factDefinitions.filter(
        (fact) => fact.key !== input.factKey,
      );
    }

    return { diagnostics: [] };
  });
  const orpc = {
    methodology: {
      getMethodologyDetails: {
        queryOptions: () => ({
          queryKey: ["methodology", "detail", "bmad.v1"],
          queryFn: async () => ({
            methodologyId: "mdef_story_2_7_bmad_v1",
            methodologyKey: "bmad.v1",
            displayName: "BMAD v1",
            descriptionJson: { summary: "Project-context-only canonical mapping for Story 2.7." },
            createdAt: "2026-03-09T21:42:43.783Z",
            updatedAt: "2026-03-09T21:42:43.783Z",
            versions: [
              {
                id: "mver_bmad_project_context_only_draft",
                version: "v2-draft",
                status: "draft",
                displayName: "BMAD v2 Draft",
                createdAt: "2026-03-10T10:00:00.000Z",
                retiredAt: null,
              },
              {
                id: "mver_bmad_project_context_only_active",
                version: "v1",
                status: "active",
                displayName: "BMAD v1",
                createdAt: "2026-03-09T21:42:43.783Z",
                retiredAt: null,
              },
            ],
          }),
        }),
      },
      version: {
        fact: {
          list: {
            queryOptions: () => ({
              queryKey: ["methodology", "draft", "mver_bmad_project_context_only_draft"],
              queryFn: async () => structuredClone(draftProjection),
            }),
          },
          create: {
            mutationOptions: () => ({ mutationFn: createFactMock }),
          },
          update: {
            mutationOptions: () => ({ mutationFn: updateFactMock }),
          },
          delete: {
            mutationOptions: () => ({ mutationFn: deleteFactMock }),
          },
        },
      },
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const invalidateQueriesMock = vi.spyOn(queryClient, "invalidateQueries");

  useRouteContextMock.mockReturnValue({ orpc, queryClient });

  return { queryClient, createFactMock, updateFactMock, deleteFactMock, invalidateQueriesMock };
}

describe("methodology version facts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a version-scoped methodology facts page with grid actions", async () => {
    const { queryClient } = createTestHarness();
    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyVersionFactsRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Methodology Facts")).toBeTruthy();
    expect(screen.getByText("Fact Inventory")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Fact" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Fact" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeTruthy();
    expect(await screen.findByText("Repository URL")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Workspace" }).getAttribute("href")).toBe(
      "/methodologies/$methodologyId/versions/$versionId",
    );
  });

  it("supports create, edit, guidance, delete, and save refresh behavior for the selected version", async () => {
    const { queryClient, createFactMock, updateFactMock, deleteFactMock, invalidateQueriesMock } =
      createTestHarness();
    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyVersionFactsRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Repository URL");

    fireEvent.click(screen.getByRole("button", { name: "Add Fact" }));
    expect((await screen.findAllByText("Contract")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Guidance").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Save" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByTestId("fact-key-required-message").textContent).toContain(
      "Fact key is required to save.",
    );
    expect(createFactMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Workspace Root" },
    });
    fireEvent.change(screen.getByLabelText("Fact Key"), { target: { value: "workspace_root" } });
    expect(comboboxForField("Validation Type")).toBeTruthy();
    chooseOption("Validation Type", "path");
    expect(await screen.findByText("Path Kind")).toBeTruthy();
    expect(screen.getByLabelText(/Trim Whitespace/i)).toBeTruthy();
    chooseOption("Validation Type", "allowed-values");
    expect(await screen.findByLabelText("Allowed value input")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Allowed value input"), {
      target: { value: "greenfield" },
    });
    fireEvent.keyDown(screen.getByLabelText("Allowed value input"), {
      key: "Enter",
      code: "Enter",
    });
    expect(screen.getByText("greenfield")).toBeTruthy();
    chooseOption("Fact Type", "json");
    await waitFor(() => {
      expect(screen.queryByText("Validation Type")).toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: "Add JSON Key" }));
    fireEvent.change(screen.getByLabelText("Key Display Name"), {
      target: { value: "Workspace Root Path" },
    });
    fireEvent.change(screen.getByLabelText("Key Name"), {
      target: { value: "workspaceRoot" },
    });
    fireEvent.click(comboboxForField("Value Type"));
    expect(screen.queryByRole("option", { name: "json" })).toBeNull();
    const stringValueOption = screen.getByRole("option", { name: "string" });
    fireEvent.mouseMove(stringValueOption);
    fireEvent.click(stringValueOption);
    expect(await screen.findByText("Value Validation Type")).toBeTruthy();
    chooseOption("Value Validation Type", "path");
    expect(await screen.findByText("Path Kind")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    expect(await screen.findByLabelText("Human Guidance")).toBeTruthy();
    expect(screen.getByLabelText("Agent Guidance")).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByText("Validation Type")).toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Workspace Root")).toBeTruthy();
    expect(createFactMock).toHaveBeenCalled();
    expect(createFactMock.mock.calls[0]?.[0]?.fact?.validation?.kind).toBe("json-schema");
    const createdFact = createFactMock.mock.calls[0]?.[0]?.fact as
      | Record<string, unknown>
      | undefined;
    expect(createdFact?.cardinality).toBe("one");
    expect(createdFact?.description).toEqual({
      markdown: "",
    });
    const createdValidation: unknown = createFactMock.mock.calls[0]?.[0]?.fact?.validation;
    const createdSchema =
      isRecord(createdValidation) && isRecord(createdValidation["schema"])
        ? createdValidation["schema"]
        : {};
    const createdSubSchema =
      isRecord(createdValidation) && isRecord(createdValidation["subSchema"])
        ? createdValidation["subSchema"]
        : {};
    const createdSubFields = Array.isArray(createdSubSchema.fields) ? createdSubSchema.fields : [];
    const createdProperties = isRecord(createdSchema.properties) ? createdSchema.properties : {};
    const workspaceRoot = isRecord(createdProperties.workspaceRoot)
      ? createdProperties.workspaceRoot
      : {};
    const workspaceRootValidation = isRecord(workspaceRoot["x-validation"])
      ? workspaceRoot["x-validation"]
      : {};

    expect(workspaceRoot.type).toBe("string");
    expect(workspaceRootValidation.kind).toBe("path");
    expect(createdSubSchema.type).toBe("object");
    expect(createdSubFields).toContainEqual(
      expect.objectContaining({ key: "workspaceRoot", type: "string", cardinality: "one" }),
    );
    expect(toastSuccessMock).toHaveBeenCalledWith("Fact saved");
    expect(invalidateQueriesMock).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "View guidance" }));
    const guidanceDialog = await screen.findByRole("dialog", { name: "Guidance" });
    expect(guidanceDialog).toBeTruthy();
    fireEvent.click(within(guidanceDialog).getAllByRole("button", { name: "Close" })[0]!);

    fireEvent.click(screen.getAllByRole("button", { name: "Fact actions" })[0]!);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    expect(await screen.findByDisplayValue("Repository URL")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Repository URL Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    const humanGuidanceField = (await screen.findByLabelText(
      "Human Guidance",
    )) as HTMLTextAreaElement;
    const agentGuidanceField = screen.getByLabelText("Agent Guidance") as HTMLTextAreaElement;
    expect(humanGuidanceField.value).toBe("Provide the canonical source repository URL.");
    expect(agentGuidanceField.value).toBe("Use the repo URL when creating workspace context.");
    fireEvent.click(await screen.findByRole("button", { name: "Save" }));
    expect(await screen.findByText("Repository URL Updated")).toBeTruthy();
    expect(updateFactMock).toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Fact actions" })[1]!);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    expect(await screen.findByDisplayValue("Workspace Root Path")).toBeTruthy();
    expect(screen.getByDisplayValue("workspaceRoot")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByDisplayValue("Workspace Root Path")).toBeNull();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Fact actions" })[0]!);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    expect(await screen.findByDisplayValue("Repository URL Updated")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Repository URL Draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("Discard unsaved changes?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));

    fireEvent.click(screen.getAllByRole("button", { name: "Fact actions" })[0]!);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    expect(await screen.findByText("Destructive action")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete Fact Permanently" }));

    await waitFor(() => {
      expect(deleteFactMock).toHaveBeenCalled();
      expect(toastSuccessMock).toHaveBeenCalledWith("Fact deleted");
      expect(invalidateQueriesMock).toHaveBeenCalled();
    });
  });

  it("sends number min/max as json-schema minimum/maximum in create mutation payload", async () => {
    const { queryClient, createFactMock } = createTestHarness();
    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyVersionFactsRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Repository URL");

    fireEvent.click(screen.getByRole("button", { name: "Add Fact" }));
    await screen.findByText("Contract");

    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Effort Score" },
    });
    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "effort_score" },
    });

    chooseOption("Fact Type", "number");

    fireEvent.change(screen.getByLabelText("Minimum Value"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Maximum Value"), {
      target: { value: "10" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createFactMock).toHaveBeenCalledTimes(1);
    });

    const createdValidation = createFactMock.mock.calls[0]?.[0]?.fact?.validation as
      | Record<string, unknown>
      | undefined;
    const createdSchema = isRecord(createdValidation?.schema)
      ? (createdValidation.schema as Record<string, unknown>)
      : {};

    expect(createdValidation?.kind).toBe("json-schema");
    expect(createdSchema.type).toBe("number");
    expect(createdSchema.minimum).toBe(1);
    expect(createdSchema.maximum).toBe(10);
  });

  it("blocks save when number maximum is less than minimum", async () => {
    const { queryClient, createFactMock } = createTestHarness();
    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyVersionFactsRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Repository URL");

    fireEvent.click(screen.getByRole("button", { name: "Add Fact" }));
    await screen.findByText("Contract");

    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Invalid Bounds" },
    });
    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "invalid_bounds" },
    });

    chooseOption("Fact Type", "number");

    fireEvent.change(screen.getByLabelText("Minimum Value"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Maximum Value"), {
      target: { value: "2" },
    });

    expect(await screen.findByTestId("fact-number-range-error")).toBeTruthy();
    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toHaveProperty("disabled", true);

    fireEvent.click(saveButton);

    expect(createFactMock).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalledWith(
      "Maximum value cannot be less than minimum value.",
    );
  });

  it("blocks save when JSON number subfield maximum is less than minimum", async () => {
    const { queryClient, createFactMock } = createTestHarness();
    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyVersionFactsRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Repository URL");

    fireEvent.click(screen.getByRole("button", { name: "Add Fact" }));
    await screen.findByText("Contract");

    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "JSON Invalid Bounds" },
    });
    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "json_invalid_bounds" },
    });

    chooseOption("Fact Type", "json");
    fireEvent.click(screen.getByRole("button", { name: "Add JSON Key" }));
    fireEvent.change(screen.getByLabelText("Key Display Name"), {
      target: { value: "Score" },
    });
    fireEvent.change(screen.getByLabelText("Key Name"), {
      target: { value: "score" },
    });
    chooseOption("Value Type", "number");

    fireEvent.change(screen.getByLabelText("Value Minimum"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Value Maximum"), {
      target: { value: "2" },
    });

    expect(await screen.findByTestId("fact-json-number-range-error")).toBeTruthy();
    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toHaveProperty("disabled", true);

    fireEvent.click(saveButton);
    expect(createFactMock).not.toHaveBeenCalled();
  });

  it("persists and rehydrates string allowed-values validation", async () => {
    const { queryClient, createFactMock } = createTestHarness();
    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyVersionFactsRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Repository URL");

    fireEvent.click(screen.getByRole("button", { name: "Add Fact" }));
    await screen.findByText("Contract");

    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Output Format" },
    });
    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "output_format" },
    });

    chooseOption("Validation Type", "allowed-values");
    const allowedValueInput = screen.getByLabelText("Allowed value input");
    fireEvent.change(allowedValueInput, { target: { value: "markdown" } });
    fireEvent.keyDown(allowedValueInput, { key: "Enter", code: "Enter" });
    fireEvent.change(allowedValueInput, { target: { value: "asciidoc" } });
    fireEvent.keyDown(allowedValueInput, { key: "Enter", code: "Enter" });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createFactMock).toHaveBeenCalledTimes(1);
    });

    const createdValidation = createFactMock.mock.calls[0]?.[0]?.fact?.validation as
      | Record<string, unknown>
      | undefined;
    expect(createdValidation?.kind).toBe("allowed-values");
    expect(createdValidation?.values).toEqual(["markdown", "asciidoc"]);

    expect(await screen.findByText("Output Format")).toBeTruthy();
    expect(screen.getByText("Allowed values (2)")).toBeTruthy();
  });
});
