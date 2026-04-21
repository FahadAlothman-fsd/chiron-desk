import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error jsdom package ships without local type declarations in this workspace.
import { JSDOM } from "jsdom";

if (typeof globalThis.document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  const setGlobal = (name: string, value: unknown) => {
    if (!(name in globalThis) || (globalThis as Record<string, unknown>)[name] === undefined) {
      Object.defineProperty(globalThis, name, {
        configurable: true,
        writable: true,
        value,
      });
    }
  };

  setGlobal("window", dom.window);
  setGlobal("document", dom.window.document);
  setGlobal("navigator", dom.window.navigator);
  setGlobal("HTMLElement", dom.window.HTMLElement);
  setGlobal("Element", dom.window.Element);
  setGlobal("Node", dom.window.Node);
  setGlobal("MutationObserver", dom.window.MutationObserver);
  setGlobal("Event", dom.window.Event);
  setGlobal("KeyboardEvent", dom.window.KeyboardEvent);
  setGlobal("MouseEvent", dom.window.MouseEvent);
  setGlobal("SVGElement", dom.window.SVGElement);
  setGlobal("getComputedStyle", dom.window.getComputedStyle.bind(dom.window));
  setGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  setGlobal("requestAnimationFrame", (callback: (timestamp: number) => void) =>
    setTimeout(() => callback(Date.now()), 16),
  );
  setGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
}

const { cleanup, fireEvent, render, screen, waitFor, within } =
  await import("@testing-library/react");

const useParamsMock = vi.fn();
const useSearchMock = vi.fn();
const useRouteContextMock = vi.fn();
const useLocationMock = vi.fn();
const useNavigateMock = vi.fn();
const useRouterStateMock = vi.fn();

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
  useRouterState: useRouterStateMock,
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

vi.mock("@monaco-editor/react", () => ({
  default: ({
    value,
    onChange,
    options,
    wrapperProps,
  }: {
    value?: string;
    onChange?: (value: string) => void;
    options?: { ariaLabel?: string };
    wrapperProps?: Record<string, unknown>;
  }) => {
    const dataTestId =
      typeof wrapperProps?.["data-testid"] === "string"
        ? (wrapperProps["data-testid"] as string)
        : undefined;
    const id = typeof wrapperProps?.id === "string" ? (wrapperProps.id as string) : undefined;

    return (
      <textarea
        id={id}
        aria-label={options?.ariaLabel ?? "Template Content"}
        data-testid={dataTestId}
        value={value ?? ""}
        onChange={(event) => onChange?.(event.target.value)}
      />
    );
  },
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
      workUnitTypes: [
        {
          key: "WU.TASK",
          displayName: "Task",
          cardinality: "many_per_project",
          lifecycle: {
            states: [
              { key: "todo", displayName: "To Do", description: "Awaiting work" },
              { key: "done", displayName: "Done", description: "Completed" },
            ],
            transitions: [
              {
                transitionKey: "todo_to_done",
                fromState: "todo",
                toState: "done",
                conditionSets: [],
              },
            ],
          },
          workflows: [
            {
              key: "wf.intake",
              displayName: "Intake Workflow",
              workUnitTypeKey: "WU.TASK",
              metadata: { owner: "ops", stage: "intake" },
              guidance: { human: { markdown: "Run intake checks" } },
              steps: [],
              edges: [],
            },
          ],
          artifactSlots: [
            {
              key: "slot.summary",
              displayName: "Summary Slot",
              cardinality: "single",
              rules: { format: "markdown" },
              templates: [
                {
                  key: "tpl.default",
                  displayName: "Default Template",
                  content: "# Summary",
                },
              ],
            },
          ],
          factSchemas: [
            {
              key: "fact.input_path",
              name: "Input Path",
              valueType: "string",
              validation: { kind: "path", dependencyType: "depends_on" },
              guidance: {
                human: { markdown: "Provide an input path." },
                agent: { markdown: "Use path as dependency context." },
              },
            },
            {
              key: "fact.contract_json",
              name: "Contract JSON",
              valueType: "json",
              validation: { kind: "json-schema" },
            },
          ],
        },
        {
          key: "WU.SETUP",
          displayName: "Setup",
          cardinality: "one_per_project",
          lifecycle: {
            states: [{ key: "draft", displayName: "Draft", description: "Setup draft" }],
            transitions: [],
          },
          workflows: [],
          artifactSlots: [],
          factSchemas: [],
        },
        {
          key: "WU.RESEARCH",
          displayName: "Research",
          cardinality: "many_per_project",
          lifecycle: {
            states: [{ key: "draft", displayName: "Draft", description: "Research draft" }],
            transitions: [],
          },
          workflows: [],
          artifactSlots: [],
          factSchemas: [],
        },
      ],
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
  const createWorkUnitFactMock = vi.fn(async () => ({ diagnostics: [] }));
  const updateWorkUnitFactMock = vi.fn(async () => ({ diagnostics: [] }));
  const deleteWorkUnitFactMock = vi.fn(async () => ({ diagnostics: [] }));
  const deleteWorkUnitMock = vi.fn(async () => ({ diagnostics: [] }));
  const listWorkUnitWorkflowMock = vi.fn(async () => [
    {
      key: "wf.intake",
      displayName: "Intake Workflow",
      workUnitTypeKey: "WU.TASK",
      metadata: { owner: "ops", stage: "intake" },
      guidance: { human: { markdown: "Run intake checks" } },
      steps: [],
      edges: [],
    },
  ]);
  const createWorkUnitWorkflowMock = vi.fn(async () => ({ diagnostics: [] }));
  const updateWorkUnitWorkflowMock = vi.fn(async () => ({ diagnostics: [] }));
  const deleteWorkUnitWorkflowMock = vi.fn(async () => ({ diagnostics: [] }));
  const listStateMachineStatesMock = vi.fn(async () => [
    { key: "todo", displayName: "To Do", description: "Awaiting work" },
    { key: "done", displayName: "Done", description: "Completed" },
  ]);
  const upsertStateMachineStateMock = vi.fn(async () => ({ diagnostics: [] }));
  const deleteStateMachineStateMock = vi.fn(async () => ({ diagnostics: [] }));
  const listStateMachineTransitionsMock = vi.fn(async () => [
    {
      transitionKey: "todo_to_done",
      fromState: "todo",
      toState: "done",
      conditionSets: [],
    },
  ]);
  const saveStateMachineTransitionMock = vi.fn(async () => ({ diagnostics: [] }));
  const upsertStateMachineTransitionMock = vi.fn(async () => ({ diagnostics: [] }));
  const deleteStateMachineTransitionMock = vi.fn(async () => ({ diagnostics: [] }));
  const listTransitionConditionSetsMock = vi.fn(async () => [
    {
      key: "start_guard",
      phase: "start",
      mode: "all",
      groups: [],
      guidance: "Start only when prerequisites pass",
    },
    {
      key: "done_guard",
      phase: "completion",
      mode: "all",
      groups: [],
      guidance: "Require evidence",
    },
  ]);
  const updateTransitionConditionSetsMock = vi.fn(async () => ({ diagnostics: [] }));
  const listArtifactSlotsMock = vi.fn(async () => [
    {
      key: "slot.summary",
      displayName: null,
      description: null,
      guidance: null,
      cardinality: "single",
      rules: { format: "markdown" },
      templates: [
        {
          key: "tpl.default",
          displayName: null,
          description: null,
          guidance: null,
          content: null,
        },
      ],
    },
  ]);
  const replaceArtifactSlotsMock = vi.fn(async () => ({ diagnostics: [] }));

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
            delete: {
              mutationOptions: () => ({
                mutationFn: deleteWorkUnitMock,
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
            fact: {
              list: {
                queryOptions: ({ input }: { input: { versionId: string } }) => ({
                  queryKey: ["methodology", "draft", input.versionId, "work-unit", "facts"],
                  queryFn: draftQueryFn,
                }),
              },
              create: {
                mutationOptions: () => ({
                  mutationFn: createWorkUnitFactMock,
                }),
              },
              update: {
                mutationOptions: () => ({
                  mutationFn: updateWorkUnitFactMock,
                }),
              },
              delete: {
                mutationOptions: () => ({
                  mutationFn: deleteWorkUnitFactMock,
                }),
              },
            },
            workflow: {
              list: {
                queryOptions: ({
                  input,
                }: {
                  input: { versionId: string; workUnitTypeKey: string };
                }) => ({
                  queryKey: [
                    "methodology",
                    "draft",
                    input.versionId,
                    "work-unit",
                    input.workUnitTypeKey,
                    "workflows",
                  ],
                  queryFn: listWorkUnitWorkflowMock,
                }),
              },
              create: {
                mutationOptions: () => ({
                  mutationFn: createWorkUnitWorkflowMock,
                }),
              },
              update: {
                mutationOptions: () => ({
                  mutationFn: updateWorkUnitWorkflowMock,
                }),
              },
              delete: {
                mutationOptions: () => ({
                  mutationFn: deleteWorkUnitWorkflowMock,
                }),
              },
            },
            stateMachine: {
              state: {
                list: {
                  queryOptions: ({
                    input,
                  }: {
                    input: { versionId: string; workUnitTypeKey: string };
                  }) => ({
                    queryKey: [
                      "methodology",
                      "draft",
                      input.versionId,
                      "work-unit",
                      input.workUnitTypeKey,
                      "state-machine",
                      "states",
                    ],
                    queryFn: listStateMachineStatesMock,
                  }),
                },
                upsert: {
                  mutationOptions: () => ({
                    mutationFn: upsertStateMachineStateMock,
                  }),
                },
                delete: {
                  mutationOptions: () => ({
                    mutationFn: deleteStateMachineStateMock,
                  }),
                },
              },
              transition: {
                list: {
                  queryOptions: ({
                    input,
                  }: {
                    input: { versionId: string; workUnitTypeKey: string };
                  }) => ({
                    queryKey: [
                      "methodology",
                      "draft",
                      input.versionId,
                      "work-unit",
                      input.workUnitTypeKey,
                      "state-machine",
                      "transitions",
                    ],
                    queryFn: listStateMachineTransitionsMock,
                  }),
                },
                save: {
                  mutationOptions: () => ({
                    mutationFn: saveStateMachineTransitionMock,
                  }),
                },
                upsert: {
                  mutationOptions: () => ({
                    mutationFn: upsertStateMachineTransitionMock,
                  }),
                },
                delete: {
                  mutationOptions: () => ({
                    mutationFn: deleteStateMachineTransitionMock,
                  }),
                },
                conditionSet: {
                  list: {
                    queryOptions: ({
                      input,
                    }: {
                      input: { versionId: string; workUnitTypeKey: string; transitionKey: string };
                    }) => ({
                      queryKey: [
                        "methodology",
                        "draft",
                        input.versionId,
                        "work-unit",
                        input.workUnitTypeKey,
                        "state-machine",
                        "transition",
                        input.transitionKey,
                        "condition-sets",
                      ],
                      queryFn: listTransitionConditionSetsMock,
                    }),
                  },
                  update: {
                    mutationOptions: () => ({
                      mutationFn: updateTransitionConditionSetsMock,
                    }),
                  },
                },
              },
            },
            artifactSlot: {
              list: {
                queryOptions: ({
                  input,
                }: {
                  input: { versionId: string; workUnitTypeKey: string };
                }) => ({
                  queryKey: [
                    "methodology",
                    "draft",
                    input.versionId,
                    "work-unit",
                    input.workUnitTypeKey,
                    "artifact-slots",
                  ],
                  queryFn: listArtifactSlotsMock,
                }),
              },
              create: {
                mutationOptions: () => ({
                  mutationFn: replaceArtifactSlotsMock,
                }),
              },
              update: {
                mutationOptions: () => ({
                  mutationFn: replaceArtifactSlotsMock,
                }),
              },
              delete: {
                mutationOptions: () => ({
                  mutationFn: replaceArtifactSlotsMock,
                }),
              },
              replace: {
                mutationOptions: () => ({
                  mutationFn: replaceArtifactSlotsMock,
                }),
              },
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
    createWorkUnitFactMock,
    updateWorkUnitFactMock,
    deleteWorkUnitFactMock,
    deleteWorkUnitMock,
    listWorkUnitWorkflowMock,
    createWorkUnitWorkflowMock,
    updateWorkUnitWorkflowMock,
    deleteWorkUnitWorkflowMock,
    listStateMachineStatesMock,
    upsertStateMachineStateMock,
    deleteStateMachineStateMock,
    listStateMachineTransitionsMock,
    saveStateMachineTransitionMock,
    upsertStateMachineTransitionMock,
    deleteStateMachineTransitionMock,
    listTransitionConditionSetsMock,
    updateTransitionConditionSetsMock,
    listArtifactSlotsMock,
    replaceArtifactSlotsMock,
  };
}

function comboboxForField(label: string): HTMLButtonElement {
  const field = screen.getByText(label).closest("div");
  if (!field) {
    throw new Error(`Field not found for ${label}`);
  }

  return within(field).getByRole("combobox") as HTMLButtonElement;
}

function chooseOption(label: string, optionName: string) {
  fireEvent.click(comboboxForField(label));
  const option = screen.getByRole("option", { name: new RegExp(optionName, "i") });
  fireEvent.mouseMove(option);
  fireEvent.click(option);
}

function comboboxForFieldIn(container: HTMLElement, label: string): HTMLButtonElement {
  const field = within(container).getByText(label).closest("div");
  if (!field) {
    throw new Error(`Field not found for ${label}`);
  }

  return within(field).getByRole("combobox") as HTMLButtonElement;
}

function chooseOptionIn(container: HTMLElement, label: string, optionName: string) {
  fireEvent.click(comboboxForFieldIn(container, label));
  const option = screen.getByRole("option", { name: new RegExp(optionName, "i") });
  fireEvent.mouseMove(option);
  fireEvent.click(option);
}

function renderWithQueryClient(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  if (typeof globalThis.HTMLElement !== "undefined") {
    Object.defineProperty(globalThis.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  }
  useParamsMock.mockReset();
  useSearchMock.mockReset();
  useRouteContextMock.mockReset();
  useLocationMock.mockReset();
  useNavigateMock.mockReset();
  useRouterStateMock.mockReset();
  useRouteContextMock.mockReturnValue(createRouteContext());
  useLocationMock.mockReturnValue({
    pathname: "/methodologies/equity-core/versions/draft-v2/work-units",
  });
  useRouterStateMock.mockImplementation(
    ({ select }: { select?: (state: { location: { pathname: string } }) => unknown }) =>
      select?.({
        location: {
          pathname: "/methodologies/equity-core/versions/draft-v2/work-units/WU.TASK",
        },
      }) ?? "/methodologies/equity-core/versions/draft-v2/work-units/WU.TASK",
  );
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
    expect(screen.getByText("Link Types")).toBeTruthy();
    expect(screen.getAllByTestId("surface-card-separator")).toHaveLength(3);
    expect(screen.getAllByTestId("surface-card-footer")).toHaveLength(3);
    expect(screen.getAllByTestId("surface-card-corner")).toHaveLength(12);
  });

  it("renders work-units shell as a clear list with actions", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({ selected: "WU.TASK" });

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    expect(await screen.findByPlaceholderText("Search work units...")).toBeTruthy();
    expect(await screen.findByRole("columnheader", { name: "Work Unit" })).toBeTruthy();
    expect(await screen.findByRole("columnheader", { name: "Actions" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Graph" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Contracts" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Diagnostics" })).toBeNull();
    expect(screen.getAllByRole("button", { name: /View details/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /^Edit$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /^Delete$/i }).length).toBeGreaterThan(0);
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
          description: { markdown: "Collect intake guidance" },
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

  it("renders facts tab with validation + dependency badges and opens add dialog via 1", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "facts" });

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    expect(await screen.findByRole("columnheader", { name: "Fact" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Type" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Validation" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Guidance" })).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Dependency" })).toBeNull();
    expect(await screen.findByText("Input Path")).toBeTruthy();
    expect(await screen.findByText("DEP: depends_on")).toBeTruthy();

    fireEvent.keyDown(window, { key: "1" });
    expect(await screen.findByRole("button", { name: "+ Add Fact" })).toBeTruthy();
  });

  it("does not show required fact semantics and still saves through workUnit.fact.create", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "facts" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Fact" }));
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Fact Without Explicit Key" },
    });

    expect(screen.queryByTestId("fact-key-required-message")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(routeContext.createWorkUnitFactMock).toHaveBeenCalledTimes(1);
    });
  });

  it("wires workflows tab CRUD and keeps metadata-only with open editor deep-link", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "workflows" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    expect(await screen.findByText("Workflow Metadata")).toBeTruthy();
    expect(await screen.findByText("Intake Workflow")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Workflow Editor" })).toBeTruthy();
    expect(screen.getByTestId("workflow-metadata-chip-wf.intake-owner").textContent).toContain(
      "owner: ops",
    );
    expect(screen.getByTestId("workflow-metadata-chip-wf.intake-stage").textContent).toContain(
      "stage: intake",
    );
    expect(screen.queryByText('{"owner":"ops","stage":"intake"}')).toBeNull();
    expect(screen.queryByText("steps")).toBeNull();
    expect(screen.queryByText("edges")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "+ Add Workflow" }));
    const workflowCreateDialog = screen.getByRole("dialog");
    expect(workflowCreateDialog.className).toContain("w-[min(72rem,calc(100vw-2rem))]");
    fireEvent.click(screen.getByRole("button", { name: "Contract" }));
    fireEvent.change(screen.getByLabelText("Workflow Key"), { target: { value: "wf.review" } });
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Review Flow" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Review metadata and readiness" },
    });
    expect(screen.getByTestId("workflow-contract-modified-indicator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Metadata" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add Metadata Field" }));
    const createMetadataKeyInputs = screen.getAllByLabelText("Metadata Key");
    const createMetadataValueInputs = screen.getAllByLabelText("Metadata Value");
    fireEvent.change(createMetadataKeyInputs[0]!, { target: { value: "priority" } });
    fireEvent.change(createMetadataValueInputs[0]!, { target: { value: "high" } });
    expect(screen.getByTestId("workflow-metadata-modified-indicator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    fireEvent.change(screen.getByLabelText("Human Guidance"), {
      target: { value: "Review this workflow manually." },
    });
    fireEvent.change(screen.getByLabelText("Agent Guidance"), {
      target: { value: "Run deterministic review checks." },
    });
    expect(screen.getByTestId("workflow-guidance-modified-indicator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("Discard unsaved changes?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep Editing" }));
    expect(screen.queryByText("Discard unsaved changes?")).toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(routeContext.createWorkUnitWorkflowMock).toHaveBeenCalledTimes(1);
    });
    expect(routeContext.createWorkUnitWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        versionId: "draft-v2",
        workUnitTypeKey: "WU.TASK",
        workflow: expect.objectContaining({
          key: "wf.review",
          displayName: "Review Flow",
          metadata: expect.objectContaining({
            priority: "high",
          }),
          guidance: {
            human: { markdown: "Review this workflow manually." },
            agent: { markdown: "Run deterministic review checks." },
          },
        }),
      }),
      expect.anything(),
    );
    expect(routeContext.createWorkUnitWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: expect.not.objectContaining({
          steps: expect.anything(),
          edges: expect.anything(),
        }),
      }),
      expect.anything(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Metadata" }));
    const workflowEditDialog = screen.getByRole("dialog");
    expect(workflowEditDialog.className).toContain("w-[min(72rem,calc(100vw-2rem))]");
    fireEvent.click(screen.getByRole("button", { name: "Contract" }));
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Intake Workflow Updated" },
    });
    expect(screen.getByTestId("workflow-contract-modified-indicator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Metadata" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add Metadata Field" }));
    const editMetadataKeyInputs = screen.getAllByLabelText("Metadata Key");
    const editMetadataValueInputs = screen.getAllByLabelText("Metadata Value");
    fireEvent.change(editMetadataKeyInputs[0]!, { target: { value: "owner" } });
    fireEvent.change(editMetadataValueInputs[0]!, { target: { value: "platform" } });
    expect(screen.getByTestId("workflow-metadata-modified-indicator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    fireEvent.change(screen.getByLabelText("Human Guidance"), {
      target: { value: "Updated human guidance" },
    });
    expect(screen.getByTestId("workflow-guidance-modified-indicator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const discardDialog = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
    fireEvent.click(within(discardDialog).getByRole("button", { name: "Discard Changes" }));
    expect(screen.queryByLabelText("Workflow Key")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit Metadata" }));
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Intake Workflow Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Metadata" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add Metadata Field" }));
    const editMetadataKeyInputsAfterDiscard = screen.getAllByLabelText("Metadata Key");
    const editMetadataValueInputsAfterDiscard = screen.getAllByLabelText("Metadata Value");
    fireEvent.change(editMetadataKeyInputsAfterDiscard[0]!, { target: { value: "owner" } });
    fireEvent.change(editMetadataValueInputsAfterDiscard[0]!, { target: { value: "platform" } });
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    fireEvent.change(screen.getByLabelText("Human Guidance"), {
      target: { value: "Updated human guidance" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(routeContext.updateWorkUnitWorkflowMock).toHaveBeenCalledTimes(1);
    });
    expect(routeContext.updateWorkUnitWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: expect.objectContaining({
          metadata: expect.objectContaining({
            owner: "platform",
          }),
        }),
      }),
      expect.anything(),
    );
    expect(routeContext.updateWorkUnitWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: expect.not.objectContaining({
          steps: expect.anything(),
          edges: expect.anything(),
        }),
      }),
      expect.anything(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Workflow" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Delete Workflow" }));
    await waitFor(() => {
      expect(routeContext.deleteWorkUnitWorkflowMock).toHaveBeenCalledTimes(1);
    });
  });

  it("supports state-machine CRUD with transition contract/start/completion/bindings tabs", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "state-machine" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    expect(await screen.findByText("Lifecycle Detail")).toBeTruthy();
    expect(await screen.findByText("To Do")).toBeTruthy();
    expect(await screen.findByText("todo_to_done")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Start Condition" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Completion Condition" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "+ Add State" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "+ Add Transition" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save States" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save Transitions" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit Condition Sets" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "+ Add State" }));
    expect(await screen.findByText("Add State")).toBeTruthy();
    const stateCreateDialog = screen.getByRole("dialog");
    expect(stateCreateDialog.className).toContain("w-[min(72rem,calc(100vw-2rem))]");
    fireEvent.click(screen.getByRole("button", { name: "Contract" }));
    fireEvent.change(screen.getByLabelText("State Key"), { target: { value: "state.review" } });
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Review" } });
    expect(screen.getByTestId("state-contract-modified-indicator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    fireEvent.change(screen.getByLabelText("Human Guidance"), {
      target: { value: "State-level operator guidance" },
    });
    fireEvent.change(screen.getByLabelText("Agent Guidance"), {
      target: { value: "State-level automation guidance" },
    });
    expect(screen.getByTestId("state-guidance-modified-indicator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("Discard unsaved changes?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep Editing" }));
    expect(screen.queryByText("Discard unsaved changes?")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Create State" }));
    await waitFor(() => {
      expect(routeContext.upsertStateMachineStateMock).toHaveBeenCalled();
    });
    const stateUpsertCallsAfterCreate = routeContext.upsertStateMachineStateMock.mock.calls.length;

    fireEvent.click(screen.getAllByRole("button", { name: "Edit State" })[0]!);
    expect(await screen.findByText("Edit State")).toBeTruthy();
    const stateEditDialog = screen.getByRole("dialog");
    expect(stateEditDialog.className).toContain("w-[min(72rem,calc(100vw-2rem))]");
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "To Do Updated" } });
    expect(screen.getByTestId("state-contract-modified-indicator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    fireEvent.change(screen.getByLabelText("Human Guidance"), {
      target: { value: "Updated state guidance" },
    });
    fireEvent.change(screen.getByLabelText("Agent Guidance"), {
      target: { value: "Updated automation guidance" },
    });
    expect(screen.getByTestId("state-guidance-modified-indicator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const stateDiscardDialog = await screen.findByRole("dialog", {
      name: "Discard unsaved changes?",
    });
    fireEvent.click(within(stateDiscardDialog).getByRole("button", { name: "Discard Changes" }));
    expect(screen.queryByText("Edit State")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit State" })[0]!);
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "To Do Updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Save State" }));
    await waitFor(() => {
      expect(routeContext.upsertStateMachineStateMock.mock.calls.length).toBeGreaterThan(
        stateUpsertCallsAfterCreate,
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "+ Add Transition" }));
    expect(await screen.findByText("Add Transition")).toBeTruthy();
    const transitionCreateDialog = screen.getByRole("dialog");
    expect(transitionCreateDialog.className).toContain("w-[min(72rem,calc(100vw-2rem))]");
    expect(screen.getByRole("button", { name: "Contract" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start Conditions" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Completion Conditions" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bindings" })).toBeTruthy();
    const transitionTabScrollRegion = screen.getByTestId("transition-tab-scroll-region");
    expect(transitionTabScrollRegion.className).toContain("overflow-y-auto");
    expect(transitionTabScrollRegion.className).toContain("flex-1");
    const transitionDialogFooter = screen.getByTestId("transition-dialog-footer");
    expect(transitionDialogFooter.className).toContain("shrink-0");
    expect(transitionDialogFooter.className).toContain("border-t");
    expect(screen.getByLabelText("Transition Key")).toBeTruthy();

    fireEvent.click(comboboxForField("From State"));
    expect(screen.getByRole("option", { name: /activate work unit/i })).toBeTruthy();
    expect(screen.getByText(/for activating a work unit/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: /activate work unit/i }));

    fireEvent.click(comboboxForField("To State"));
    expect(screen.queryByRole("option", { name: /activate work unit/i })).toBeNull();
    expect(screen.queryByText(/for activating a work unit/i)).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: /done/i }));

    fireEvent.change(screen.getByLabelText("Transition Key"), {
      target: { value: "review_to_done" },
    });
    expect(screen.getByTestId("transition-contract-modified-indicator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start Conditions" }));
    expect(screen.queryByLabelText("Transition Key")).toBeNull();
    fireEvent.change(screen.getByLabelText("Start Gate Mode"), {
      target: { value: "any" },
    });
    expect(screen.getByTestId("transition-start-modified-indicator")).toBeTruthy();
    const startConditionsScrollRegion = screen.getByTestId("transition-tab-scroll-region");
    expect(startConditionsScrollRegion.className).toContain("overflow-y-auto");
    expect(screen.queryByRole("button", { name: "Add Project Fact Condition" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Work Unit Fact Condition" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add Group" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add Group" }));
    const groupDialog = await screen.findByRole("dialog", { name: "Add Group" });
    expect(within(groupDialog).queryByRole("button", { name: "Add Group" })).toBeNull();
    fireEvent.click(
      within(groupDialog).getByRole("button", { name: "Add Work Unit Fact Condition" }),
    );
    fireEvent.click(
      within(groupDialog).getByRole("button", { name: "Add Work Unit Fact Condition" }),
    );
    fireEvent.click(within(groupDialog).getByRole("button", { name: "Save Group" }));

    fireEvent.click(screen.getByRole("button", { name: "Completion Conditions" }));
    expect(screen.queryByLabelText("Transition Key")).toBeNull();
    fireEvent.change(screen.getByLabelText("Completion Gate Mode"), {
      target: { value: "all" },
    });
    expect(screen.getByTestId("transition-completion-modified-indicator")).toBeTruthy();
    const completionConditionsScrollRegion = screen.getByTestId("transition-tab-scroll-region");
    expect(completionConditionsScrollRegion.className).toContain("overflow-y-auto");
    expect(screen.queryByRole("button", { name: "Add Project Fact Condition" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Work Unit Fact Condition" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add Group" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bindings" }));
    expect(screen.queryByLabelText("Transition Key")).toBeNull();
    chooseOption("Bind Workflows", "wf.intake");
    expect(screen.getByTestId("transition-bindings-modified-indicator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create Transition" }));
    await waitFor(() => {
      expect(routeContext.saveStateMachineTransitionMock.mock.calls.length).toBeGreaterThan(0);
    });
    expect(routeContext.saveStateMachineTransitionMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ workflowKeys: ["wf.intake"] }),
      expect.anything(),
    );
    expect(routeContext.saveStateMachineTransitionMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        conditionSets: expect.arrayContaining([
          expect.objectContaining({ phase: "start", mode: "any" }),
          expect.objectContaining({ phase: "completion", mode: "all" }),
        ]),
      }),
      expect.anything(),
    );
    expect(routeContext.saveStateMachineTransitionMock).toHaveBeenLastCalledWith(
      expect.not.objectContaining({
        transition: expect.objectContaining({ fromState: "__absent__" }),
      }),
      expect.anything(),
    );
    const transitionSaveCallsAfterCreate =
      routeContext.saveStateMachineTransitionMock.mock.calls.length;

    fireEvent.click(screen.getAllByRole("button", { name: "Edit Transition" })[0]!);
    expect(await screen.findByText("Edit Transition")).toBeTruthy();
    const transitionEditDialog = screen.getByRole("dialog");
    expect(transitionEditDialog.className).toContain("w-[min(72rem,calc(100vw-2rem))]");
    expect(screen.queryByTestId("transition-contract-modified-indicator")).toBeNull();
    expect(screen.queryByTestId("transition-start-modified-indicator")).toBeNull();
    expect(screen.queryByTestId("transition-completion-modified-indicator")).toBeNull();
    expect(screen.queryByTestId("transition-bindings-modified-indicator")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Contract" }));
    chooseOption("To State", "state.review");
    expect(screen.getByTestId("transition-contract-modified-indicator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start Conditions" }));
    expect(screen.getByLabelText("Start Gate Mode")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Completion Conditions" }));
    expect(screen.getByLabelText("Completion Gate Mode")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save Transition" }));
    await waitFor(() => {
      expect(routeContext.saveStateMachineTransitionMock.mock.calls.length).toBeGreaterThan(
        transitionSaveCallsAfterCreate,
      );
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Edit Transition" })[0]!);
    expect(await screen.findByText("Edit Transition")).toBeTruthy();
    expect(screen.queryByTestId("transition-contract-modified-indicator")).toBeNull();
    expect(screen.queryByTestId("transition-start-modified-indicator")).toBeNull();
    expect(screen.queryByTestId("transition-completion-modified-indicator")).toBeNull();
    expect(screen.queryByTestId("transition-bindings-modified-indicator")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Start Conditions" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Group" }));
    const unsavedGroupDialog = await screen.findByRole("dialog", { name: "Add Group" });
    fireEvent.click(
      within(unsavedGroupDialog).getByRole("button", { name: "Add Project Fact Condition" }),
    );
    fireEvent.click(within(unsavedGroupDialog).getByRole("button", { name: "Save Group" }));
    expect(screen.getByTestId("transition-start-modified-indicator")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("Discard unsaved changes?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep Editing" }));
    expect(screen.queryByText("Discard unsaved changes?")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const transitionDiscardDialog = await screen.findByRole("dialog", {
      name: "Discard unsaved changes?",
    });
    fireEvent.click(
      within(transitionDiscardDialog).getByRole("button", { name: "Discard Changes" }),
    );
    expect(screen.queryByText("Edit Transition")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit Transition" })[0]!);
    expect(await screen.findByText("Edit Transition")).toBeTruthy();
    expect(screen.queryByTestId("transition-contract-modified-indicator")).toBeNull();
    expect(screen.queryByTestId("transition-start-modified-indicator")).toBeNull();
    expect(screen.queryByTestId("transition-completion-modified-indicator")).toBeNull();
    expect(screen.queryByTestId("transition-bindings-modified-indicator")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start Conditions" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Group" }));
    const reopenedGroupDialog = await screen.findByRole("dialog", { name: "Add Group" });
    expect(within(reopenedGroupDialog).queryByTestId("group-condition-0")).toBeNull();
    expect(within(reopenedGroupDialog).getByText("No conditions added yet.")).toBeTruthy();
    fireEvent.click(within(reopenedGroupDialog).getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(routeContext.updateTransitionConditionSetsMock).toHaveBeenCalledTimes(0);
  });

  it("authors grouped fact/work-unit conditions in transition dialog and saves edited configs through transition.save", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "state-machine" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);
    expect(await screen.findByText("To Do")).toBeTruthy();

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Transition" }));
    fireEvent.change(screen.getByLabelText("Transition Key"), {
      target: { value: "typed_conditions_transition" },
    });
    chooseOption("From State", "activate work unit");
    chooseOption("To State", "done");

    fireEvent.click(screen.getByRole("button", { name: "Start Conditions" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Group" }));
    const groupDialog = await screen.findByRole("dialog", { name: "Add Group" });
    fireEvent.click(
      within(groupDialog).getByRole("button", { name: "Add Work Unit Fact Condition" }),
    );

    const startFactConditionRow = within(groupDialog).getByTestId("group-condition-0");
    chooseOptionIn(startFactConditionRow, "Fact", "fact.input_path");
    fireEvent.change(within(startFactConditionRow).getByLabelText("Operator"), {
      target: { value: "equals" },
    });
    fireEvent.change(within(startFactConditionRow).getByLabelText("Value"), {
      target: { value: "docs/input.md" },
    });
    expect(within(startFactConditionRow).getAllByText(/fact.input_path/i).length).toBeGreaterThan(
      0,
    );

    fireEvent.click(within(groupDialog).getByRole("button", { name: "Add Artifact Condition" }));
    const startWorkUnitConditionRow = within(groupDialog).getByTestId("group-condition-1");
    chooseOptionIn(startWorkUnitConditionRow, "Artifact Slot", "slot.summary");
    fireEvent.change(within(startWorkUnitConditionRow).getByLabelText("Operator"), {
      target: { value: "exists" },
    });
    expect(within(startWorkUnitConditionRow).getAllByText(/slot.summary/i).length).toBeGreaterThan(
      0,
    );

    fireEvent.click(within(groupDialog).getByRole("button", { name: "Save Group" }));

    fireEvent.click(screen.getByRole("button", { name: "Completion Conditions" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Group" }));
    const completionGroupDialog = await screen.findByRole("dialog", { name: "Add Group" });
    fireEvent.click(
      within(completionGroupDialog).getByRole("button", { name: "Add Work Unit Fact Condition" }),
    );
    const completionFactConditionRow =
      within(completionGroupDialog).getByTestId("group-condition-0");
    chooseOptionIn(completionFactConditionRow, "Fact", "fact.contract_json");
    fireEvent.change(within(completionFactConditionRow).getByLabelText("Operator"), {
      target: { value: "exists" },
    });
    fireEvent.click(within(completionGroupDialog).getByRole("button", { name: "Save Group" }));

    fireEvent.click(screen.getByRole("button", { name: "Bindings" }));
    chooseOption("Bind Workflows", "wf.intake");
    fireEvent.click(screen.getByRole("button", { name: "Create Transition" }));

    await waitFor(() => {
      expect(routeContext.saveStateMachineTransitionMock).toHaveBeenCalledTimes(1);
    });
    expect(routeContext.saveStateMachineTransitionMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        conditionSets: expect.arrayContaining([
          expect.objectContaining({
            phase: "start",
            groups: expect.arrayContaining([
              expect.objectContaining({
                conditions: expect.arrayContaining([
                  expect.objectContaining({
                    kind: "work_unit_fact",
                    config: expect.objectContaining({
                      factKey: "fact.input_path",
                      operator: "equals",
                      value: "docs/input.md",
                    }),
                  }),
                  expect.objectContaining({
                    kind: "artifact",
                    config: expect.objectContaining({
                      slotKey: "slot.summary",
                      operator: "exists",
                    }),
                  }),
                ]),
              }),
            ]),
          }),
          expect.objectContaining({
            phase: "completion",
            groups: expect.arrayContaining([
              expect.objectContaining({
                conditions: expect.arrayContaining([
                  expect.objectContaining({
                    kind: "work_unit_fact",
                    config: expect.objectContaining({
                      factKey: "fact.contract_json",
                      operator: "exists",
                    }),
                  }),
                ]),
              }),
            ]),
          }),
        ]),
      }),
      expect.anything(),
    );
  });

  it("loads existing start/completion groups in transition edit and saves grouped-only conditionSets payload", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    routeContext.listStateMachineTransitionsMock.mockResolvedValue([
      {
        transitionKey: "todo_to_done",
        fromState: "todo",
        toState: "done",
        workflowKeys: ["wf.intake"],
        conditionSets: [
          {
            key: "start_guard",
            phase: "start",
            mode: "all",
            groups: [
              {
                key: "start.group.seeded",
                mode: "all",
                conditions: [
                  {
                    kind: "fact",
                    required: true,
                    config: {
                      factKey: "fact.input_path",
                      operator: "equals",
                      value: "docs/seeded-start.md",
                    },
                  },
                ],
              },
            ],
            guidance: "Start only when path matches",
          },
          {
            key: "done_guard",
            phase: "completion",
            mode: "all",
            groups: [
              {
                key: "completion.group.seeded",
                mode: "all",
                conditions: [
                  {
                    kind: "work_unit",
                    required: true,
                    config: {
                      dependencyKey: "link.requires",
                      workUnitKey: "WU.TASK",
                      operator: "state_is",
                      stateKey: "done",
                    },
                  },
                ],
              },
            ],
            guidance: "Complete after dependency reaches done",
          },
        ],
      },
    ] as never);
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "state-machine" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);
    expect(await screen.findByText("To Do")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit Transition" })[0]!);
    expect(await screen.findByText("Edit Transition")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start Conditions" }));
    expect(screen.getByText(/fact\.input_path equals docs\/seeded-start\.md/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Completion Conditions" }));
    expect(screen.getByText(/link\.requires exists/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save Transition" }));
    await waitFor(() => {
      expect(routeContext.saveStateMachineTransitionMock).toHaveBeenCalledTimes(1);
    });

    const saveCalls = routeContext.saveStateMachineTransitionMock.mock.calls as unknown as Array<
      [unknown, unknown]
    >;
    const savePayload = saveCalls.at(-1)?.[0] as {
      conditionSets: Array<Record<string, unknown> & { phase: string; groups: unknown[] }>;
    };
    expect(savePayload.conditionSets).toHaveLength(2);
    savePayload.conditionSets.forEach((set) => {
      expect(set).toEqual(expect.objectContaining({ groups: expect.any(Array) }));
      expect(set).not.toHaveProperty("conditions");
    });
  });

  it("preserves seeded group keys when editing transition instead of appending duplicate groups", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    routeContext.listStateMachineTransitionsMock.mockResolvedValue([
      {
        transitionKey: "todo_to_done",
        fromState: "todo",
        toState: "done",
        workflowKeys: ["wf.intake"],
        conditionSets: [
          {
            key: "start_guard",
            phase: "start",
            mode: "all",
            groups: [
              {
                key: "start.group.seeded",
                mode: "all",
                conditions: [
                  {
                    kind: "fact",
                    required: true,
                    config: { factKey: "fact.input_path", operator: "exists" },
                  },
                ],
              },
            ],
          },
          {
            key: "done_guard",
            phase: "completion",
            mode: "all",
            groups: [
              {
                key: "completion.group.seeded",
                mode: "all",
                conditions: [
                  {
                    kind: "fact",
                    required: true,
                    config: { factKey: "fact.contract_json", operator: "exists" },
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as never);
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "state-machine" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);
    expect(await screen.findByText("To Do")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit Transition" })[0]!);
    expect(await screen.findByText("Edit Transition")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start Conditions" }));
    fireEvent.change(screen.getByLabelText("Start Gate Mode"), {
      target: { value: "any" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Transition" }));
    await waitFor(() => {
      expect(routeContext.saveStateMachineTransitionMock).toHaveBeenCalledTimes(1);
    });

    const saveCalls = routeContext.saveStateMachineTransitionMock.mock.calls as unknown as Array<
      [unknown, unknown]
    >;
    const savePayload = saveCalls.at(-1)?.[0] as {
      conditionSets: Array<
        Record<string, unknown> & { phase: string; groups: Array<Record<string, unknown>> }
      >;
    };
    const startSet = savePayload.conditionSets.find((set) => set.phase === "start");
    const completionSet = savePayload.conditionSets.find((set) => set.phase === "completion");

    expect(startSet).toBeTruthy();
    expect(startSet?.groups).toHaveLength(1);
    expect(startSet?.groups[0]).toEqual(
      expect.objectContaining({
        key: "start.group.seeded",
      }),
    );

    expect(completionSet).toBeTruthy();
    expect(completionSet?.groups).toHaveLength(1);
    expect(completionSet?.groups[0]).toEqual(
      expect.objectContaining({
        key: "completion.group.seeded",
      }),
    );
  });

  it("edits existing start/completion groups in place from group summaries with prefilled editor", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    routeContext.listStateMachineTransitionsMock.mockResolvedValue([
      {
        transitionKey: "todo_to_done",
        fromState: "todo",
        toState: "done",
        workflowKeys: ["wf.intake"],
        conditionSets: [
          {
            key: "start_guard",
            phase: "start",
            mode: "all",
            groups: [
              {
                key: "start.group.seeded",
                mode: "all",
                conditions: [
                  {
                    kind: "fact",
                    required: true,
                    config: { factKey: "fact.input_path", operator: "exists" },
                  },
                ],
              },
            ],
          },
          {
            key: "done_guard",
            phase: "completion",
            mode: "all",
            groups: [
              {
                key: "completion.group.seeded",
                mode: "all",
                conditions: [
                  {
                    kind: "fact",
                    required: true,
                    config: { factKey: "fact.contract_json", operator: "exists" },
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as never);
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "state-machine" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);
    expect(await screen.findByText("To Do")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit Transition" })[0]!);
    expect(await screen.findByText("Edit Transition")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start Conditions" }));
    fireEvent.click(screen.getByRole("button", { name: /edit start group 1/i }));
    const startGroupDialog = await screen.findByRole("dialog", { name: /edit group/i });
    const startConditionRow = within(startGroupDialog).getByTestId("group-condition-0");
    expect(within(startConditionRow).getAllByText(/fact.input_path/i).length).toBeGreaterThan(0);
    fireEvent.change(within(startGroupDialog).getByLabelText("Group Mode"), {
      target: { value: "any" },
    });
    fireEvent.click(within(startGroupDialog).getByRole("button", { name: "Save Group" }));

    fireEvent.click(screen.getByRole("button", { name: "Completion Conditions" }));
    fireEvent.click(screen.getByRole("button", { name: /edit completion group 1/i }));
    const completionGroupDialog = await screen.findByRole("dialog", { name: /edit group/i });
    const completionConditionRow = within(completionGroupDialog).getByTestId("group-condition-0");
    expect(
      within(completionConditionRow).getAllByText(/fact.contract_json/i).length,
    ).toBeGreaterThan(0);
    fireEvent.change(within(completionGroupDialog).getByLabelText("Group Mode"), {
      target: { value: "any" },
    });
    fireEvent.click(within(completionGroupDialog).getByRole("button", { name: "Save Group" }));

    fireEvent.click(screen.getByRole("button", { name: "Save Transition" }));
    await waitFor(() => {
      expect(routeContext.saveStateMachineTransitionMock).toHaveBeenCalledTimes(1);
    });

    const saveCalls = routeContext.saveStateMachineTransitionMock.mock.calls as unknown as Array<
      [unknown, unknown]
    >;
    const savePayload = saveCalls.at(-1)?.[0] as {
      conditionSets: Array<
        Record<string, unknown> & { phase: string; groups: Array<Record<string, unknown>> }
      >;
    };
    const startSet = savePayload.conditionSets.find((set) => set.phase === "start");
    const completionSet = savePayload.conditionSets.find((set) => set.phase === "completion");

    expect(startSet?.groups).toHaveLength(1);
    expect(startSet?.groups[0]).toEqual(
      expect.objectContaining({
        key: "start.group.seeded",
        mode: "any",
      }),
    );

    expect(completionSet?.groups).toHaveLength(1);
    expect(completionSet?.groups[0]).toEqual(
      expect.objectContaining({
        key: "completion.group.seeded",
        mode: "any",
      }),
    );
  });

  it("wires artifact slots tab list/replace with nested templates dialog and normalized payload", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "artifact-slots" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    expect(await screen.findByText("Artifact Slot Definitions")).toBeTruthy();
    expect(await screen.findByText("slot.summary")).toBeTruthy();
    expect(screen.queryByText(/occupied|occupancy/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Slot Details" }));
    const slotDialog = await screen.findByRole("dialog", { name: /Edit Slot/i });
    expect(within(slotDialog).getByRole("tab", { name: "Templates" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Templates page/i })).toBeNull();

    fireEvent.click(within(slotDialog).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(routeContext.replaceArtifactSlotsMock).toHaveBeenCalledTimes(1);
    });
    expect(routeContext.replaceArtifactSlotsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        versionId: "draft-v2",
        workUnitTypeKey: "WU.TASK",
        slot: expect.objectContaining({
          key: "slot.summary",
          cardinality: "single",
        }),
        templateOps: { add: [], remove: [], update: [] },
      }),
      expect.anything(),
    );
  });

  it("adds and updates nested artifact templates by id", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    routeContext.listArtifactSlotsMock.mockResolvedValue([
      {
        id: "slot.seeded",
        key: "slot.summary",
        displayName: null,
        description: null,
        guidance: null,
        cardinality: "single",
        rules: { format: "markdown" },
        templates: [
          {
            id: "template.seeded.default",
            key: "tpl.default",
            displayName: "Default Template",
            description: null,
            guidance: null,
            content: "# Summary",
          },
        ],
      },
    ] as never);
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "artifact-slots" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    const seededSlotCell = await screen.findByText("slot.summary");
    fireEvent.click(
      within(seededSlotCell.closest("tr") ?? screen.getByRole("table")).getByRole("button", {
        name: "Slot Details",
      }),
    );
    const slotDialog = await screen.findByRole("dialog", { name: /Edit Slot/i });
    fireEvent.click(within(slotDialog).getByRole("tab", { name: "Templates" }));

    expect(within(slotDialog).getByText("tpl.default")).toBeTruthy();

    fireEvent.click(within(slotDialog).getByRole("button", { name: "+ Add Template" }));
    const addTemplateDialog = await screen.findByRole("dialog", { name: /Add Template/i });
    expect(addTemplateDialog).toBeTruthy();

    fireEvent.change(within(addTemplateDialog).getByLabelText("Template Key"), {
      target: { value: "tpl.generated" },
    });
    fireEvent.change(within(addTemplateDialog).getByLabelText("Display Name"), {
      target: { value: "Generated Template" },
    });
    fireEvent.click(within(addTemplateDialog).getByRole("tab", { name: "Guidance" }));
    fireEvent.change(within(addTemplateDialog).getByLabelText("Description (Human)"), {
      target: { value: "Generated description" },
    });
    fireEvent.change(within(addTemplateDialog).getByLabelText("Guidance (Human)"), {
      target: { value: "Generated guidance" },
    });
    fireEvent.click(within(addTemplateDialog).getByRole("tab", { name: "Content" }));
    fireEvent.change(within(addTemplateDialog).getByLabelText("Template Content"), {
      target: { value: "# Generated content" },
    });
    fireEvent.click(within(addTemplateDialog).getByRole("button", { name: "Save Template" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Add Template/i })).toBeNull();
    });
    expect(screen.getByText("tpl.generated")).toBeTruthy();

    const slotDialogAfterTemplateAdd = screen.getByRole("dialog", { name: /Edit Slot/i });
    const seededTemplateRow = within(slotDialogAfterTemplateAdd)
      .getByText("tpl.default")
      .closest("article");
    expect(seededTemplateRow).toBeTruthy();
    fireEvent.click(
      within(seededTemplateRow ?? slotDialogAfterTemplateAdd).getByRole("button", {
        name: "Edit Template",
      }),
    );

    const editTemplateDialog = await screen.findByRole("dialog", { name: /Edit Template/i });
    fireEvent.change(within(editTemplateDialog).getByLabelText("Template Key"), {
      target: { value: "tpl.default.v2" },
    });
    fireEvent.change(within(editTemplateDialog).getByLabelText("Display Name"), {
      target: { value: "Default Template v2" },
    });
    fireEvent.click(within(editTemplateDialog).getByRole("tab", { name: "Content" }));
    fireEvent.change(within(editTemplateDialog).getByLabelText("Template Content"), {
      target: { value: "# Updated summary template" },
    });
    fireEvent.click(within(editTemplateDialog).getByRole("button", { name: "Save Template" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Edit Template/i })).toBeNull();
    });
    expect(screen.getByText("tpl.default.v2")).toBeTruthy();

    const slotDialogBeforeFirstSave = screen.getByRole("dialog", { name: /Edit Slot/i });
    fireEvent.click(within(slotDialogBeforeFirstSave).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(routeContext.replaceArtifactSlotsMock).toHaveBeenCalledTimes(1);
    });
    expect(routeContext.replaceArtifactSlotsMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        slotId: "slot.seeded",
        templateOps: expect.objectContaining({
          add: [
            expect.objectContaining({
              key: "tpl.generated",
              displayName: "Generated Template",
              guidance: {
                human: { markdown: "Generated guidance" },
                agent: { markdown: "" },
              },
              content: "# Generated content",
            }),
          ],
          update: [
            expect.objectContaining({
              templateId: "template.seeded.default",
              template: expect.objectContaining({
                key: "tpl.default.v2",
                displayName: "Default Template v2",
                content: "# Updated summary template",
              }),
            }),
          ],
        }),
      }),
      expect.anything(),
    );

    const reopenedSlotCell = await screen.findByText("slot.summary");
    fireEvent.click(
      within(reopenedSlotCell.closest("tr") ?? screen.getByRole("table")).getByRole("button", {
        name: "Slot Details",
      }),
    );
    const reopenedSlotDialog = await screen.findByRole("dialog", { name: /Edit Slot/i });
    fireEvent.click(within(reopenedSlotDialog).getByRole("tab", { name: "Templates" }));

    const generatedTemplateRow = within(reopenedSlotDialog)
      .getByText("tpl.generated")
      .closest("article");
    expect(generatedTemplateRow).toBeTruthy();
    fireEvent.click(
      within(generatedTemplateRow ?? reopenedSlotDialog).getByRole("button", {
        name: "Delete Template",
      }),
    );

    const updatedSeededTemplateRow = within(reopenedSlotDialog)
      .getByText("tpl.default.v2")
      .closest("article");
    expect(updatedSeededTemplateRow).toBeTruthy();
    fireEvent.click(
      within(updatedSeededTemplateRow ?? reopenedSlotDialog).getByRole("button", {
        name: "Delete Template",
      }),
    );

    expect(within(reopenedSlotDialog).getByText("No templates yet.")).toBeTruthy();
    fireEvent.click(within(reopenedSlotDialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(routeContext.replaceArtifactSlotsMock).toHaveBeenCalledTimes(2);
    });
    expect(routeContext.replaceArtifactSlotsMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        slotId: "slot.seeded",
        templateOps: expect.objectContaining({
          remove: ["template.seeded.default", expect.stringMatching(/^local:/)],
        }),
      }),
      expect.anything(),
    );
  });

  it("inserts predefined artifact template variables through Monaco authoring", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "artifact-slots" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    const seededSlotCell = await screen.findByText("slot.summary");
    fireEvent.click(
      within(seededSlotCell.closest("tr") ?? screen.getByRole("table")).getByRole("button", {
        name: "Slot Details",
      }),
    );
    const slotDialog = await screen.findByRole("dialog", { name: /Edit Slot/i });
    fireEvent.click(within(slotDialog).getByRole("tab", { name: "Templates" }));

    fireEvent.click(within(slotDialog).getByRole("button", { name: "+ Add Template" }));
    const addTemplateDialog = await screen.findByRole("dialog", { name: /Add Template/i });

    fireEvent.change(within(addTemplateDialog).getByLabelText("Template Key"), {
      target: { value: "tpl.variables" },
    });
    fireEvent.click(within(addTemplateDialog).getByRole("tab", { name: "Content" }));

    fireEvent.change(within(addTemplateDialog).getByLabelText("Template Content"), {
      target: { value: "# Template source\n" },
    });

    fireEvent.click(
      within(addTemplateDialog).getByRole("combobox", { name: "Insert template variable" }),
    );
    fireEvent.click(screen.getByRole("option", { name: /Methodology fact value/i }));

    fireEvent.click(
      within(addTemplateDialog).getByRole("combobox", { name: "Insert template variable" }),
    );
    fireEvent.click(screen.getByRole("option", { name: /Current work-unit fact value/i }));

    fireEvent.click(
      within(addTemplateDialog).getByRole("combobox", { name: "Insert template variable" }),
    );
    fireEvent.click(screen.getByRole("option", { name: /Methodology work-unit value/i }));

    const editorValue = (
      within(addTemplateDialog).getByLabelText("Template Content") as HTMLTextAreaElement
    ).value;
    expect(editorValue).toContain("{{methodology.facts.{key}}}");
    expect(editorValue).toContain("{{workUnit.facts.{key}}}");
    expect(editorValue).toContain("{{methodology.workUnits.{key}}}");

    fireEvent.click(within(addTemplateDialog).getByRole("button", { name: "Save Template" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Add Template/i })).toBeNull();
    });

    const slotDialogBeforeSave = screen.getByRole("dialog", { name: /Edit Slot/i });
    fireEvent.click(within(slotDialogBeforeSave).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(routeContext.replaceArtifactSlotsMock).toHaveBeenCalledTimes(1);
    });

    expect(routeContext.replaceArtifactSlotsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        templateOps: expect.objectContaining({
          add: [
            expect.objectContaining({
              key: "tpl.variables",
              content: expect.stringContaining("{{methodology.facts.{key}}}"),
            }),
          ],
        }),
      }),
      expect.anything(),
    );

    const replaceCall = routeContext.replaceArtifactSlotsMock.mock.calls.at(0);
    expect(replaceCall).toBeTruthy();
    const replacePayloadCandidate = (replaceCall as unknown as unknown[] | undefined)?.[0];
    const replacePayload = replacePayloadCandidate as {
      templateOps: { add: Array<{ key: string; content?: string }> };
    };
    const insertedTemplate = replacePayload.templateOps.add.find(
      (template) => template.key === "tpl.variables",
    );
    expect(insertedTemplate?.content).toContain("{{workUnit.facts.{key}}}");
    expect(insertedTemplate?.content).toContain("{{methodology.workUnits.{key}}}");
  });

  it("tracks artifact slot dirty tabs independently", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "artifact-slots" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    const dirtySlotRow = await screen.findByText("slot.summary");
    fireEvent.click(
      within(dirtySlotRow.closest("tr") ?? screen.getByRole("table")).getByRole("button", {
        name: "Slot Details",
      }),
    );
    const slotDialog = await screen.findByRole("dialog", { name: /Edit Slot/i });

    fireEvent.change(within(slotDialog).getByLabelText("Display Name"), {
      target: { value: "Updated Summary Slot" },
    });
    expect(
      within(slotDialog).getByTestId("artifact-slot-contract-modified-indicator"),
    ).toBeTruthy();
    expect(
      within(slotDialog).queryByTestId("artifact-slot-guidance-modified-indicator"),
    ).toBeNull();
    expect(
      within(slotDialog).queryByTestId("artifact-slot-templates-modified-indicator"),
    ).toBeNull();

    fireEvent.click(within(slotDialog).getByRole("tab", { name: /Guidance/ }));
    fireEvent.change(within(slotDialog).getByLabelText("Description (Human)"), {
      target: { value: "Human summary guidance update" },
    });
    expect(
      within(slotDialog).getByTestId("artifact-slot-contract-modified-indicator"),
    ).toBeTruthy();
    expect(
      within(slotDialog).getByTestId("artifact-slot-guidance-modified-indicator"),
    ).toBeTruthy();
    expect(
      within(slotDialog).queryByTestId("artifact-slot-templates-modified-indicator"),
    ).toBeNull();

    fireEvent.click(within(slotDialog).getByRole("tab", { name: /Contract/ }));
    expect((within(slotDialog).getByLabelText("Display Name") as HTMLInputElement).value).toBe(
      "Updated Summary Slot",
    );

    fireEvent.click(within(slotDialog).getByRole("button", { name: "Cancel" }));
    const discardDialog = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
    fireEvent.click(within(discardDialog).getByRole("button", { name: "Keep Editing" }));
    expect(screen.queryByText("Discard unsaved changes?")).toBeNull();
    expect((within(slotDialog).getByLabelText("Display Name") as HTMLInputElement).value).toBe(
      "Updated Summary Slot",
    );

    fireEvent.click(within(slotDialog).getByRole("button", { name: "Cancel" }));
    const finalDiscardDialog = await screen.findByRole("dialog", {
      name: "Discard unsaved changes?",
    });
    fireEvent.click(within(finalDiscardDialog).getByRole("button", { name: "Discard Changes" }));
    expect(screen.queryByRole("dialog", { name: /Edit Slot/i })).toBeNull();

    const reopenedDirtySlotRow = await screen.findByText("slot.summary");
    fireEvent.click(
      within(reopenedDirtySlotRow.closest("tr") ?? screen.getByRole("table")).getByRole("button", {
        name: "Slot Details",
      }),
    );
    const reopenedSlotDialog = await screen.findByRole("dialog", { name: /Edit Slot/i });
    expect(
      (within(reopenedSlotDialog).getByLabelText("Display Name") as HTMLInputElement).value,
    ).toBe("");
    expect(
      within(reopenedSlotDialog).queryByTestId("artifact-slot-contract-modified-indicator"),
    ).toBeNull();
    expect(
      within(reopenedSlotDialog).queryByTestId("artifact-slot-guidance-modified-indicator"),
    ).toBeNull();
    expect(
      within(reopenedSlotDialog).queryByTestId("artifact-slot-templates-modified-indicator"),
    ).toBeNull();
  });

  it("shows dependency selector for work unit fact type and saves through workUnit.fact.create", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "facts" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Fact" }));
    chooseOption("Fact Type", "work unit");
    chooseOption("Work Unit", "WU.RESEARCH");
    chooseOptionIn(screen.getByRole("dialog"), "Cardinality", "many");
    expect(comboboxForField("Dependency Type")).toBeTruthy();
    chooseOption("Dependency Type", "link.requires");
    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "fact.upstream_unit" },
    });
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Upstream Work Unit" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(routeContext.createWorkUnitFactMock).toHaveBeenCalledTimes(1);
    });
    expect(routeContext.createWorkUnitFactMock).toHaveBeenCalledWith(
      expect.objectContaining({
        versionId: "draft-v2",
        workUnitTypeKey: "WU.TASK",
        fact: expect.objectContaining({
          kind: "work_unit_reference_fact",
          key: "fact.upstream_unit",
          cardinality: "many",
          validation: expect.objectContaining({ workUnitKey: "WU.RESEARCH" }),
        }),
      }),
      expect.anything(),
    );
  });

  it("locks work-unit reference fact cardinality to one when referenced work unit is one_per_project", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "facts" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Fact" }));
    chooseOption("Fact Type", "work unit");
    chooseOption("Work Unit", "WU.SETUP");

    const cardinalityCombobox = comboboxForFieldIn(screen.getByRole("dialog"), "Cardinality");
    expect(cardinalityCombobox.hasAttribute("disabled")).toBe(true);
    expect(cardinalityCombobox.textContent?.toLowerCase().includes("one")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(routeContext.createWorkUnitFactMock).toHaveBeenCalledTimes(1);
    });

    expect(routeContext.createWorkUnitFactMock).toHaveBeenCalledWith(
      expect.objectContaining({
        versionId: "draft-v2",
        workUnitTypeKey: "WU.TASK",
        fact: expect.objectContaining({
          kind: "work_unit_reference_fact",
          cardinality: "one",
          validation: expect.objectContaining({ workUnitKey: "WU.SETUP" }),
        }),
      }),
      expect.anything(),
    );
  });

  it("preserves allowed-values validation when creating work-unit facts", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "facts" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Fact" }));
    chooseOption("Fact Type", "string");
    chooseOptionIn(screen.getByRole("dialog"), "Validation Type", "allowed-values");
    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "fact.allowed_status" },
    });
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Allowed Status" },
    });
    fireEvent.change(screen.getByLabelText("Allowed value input"), {
      target: { value: "ready" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add allowed value" }));
    fireEvent.change(screen.getByLabelText("Allowed value input"), {
      target: { value: "blocked" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add allowed value" }));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(routeContext.createWorkUnitFactMock).toHaveBeenCalledTimes(1);
    });

    expect(routeContext.createWorkUnitFactMock).toHaveBeenCalledWith(
      expect.objectContaining({
        versionId: "draft-v2",
        workUnitTypeKey: "WU.TASK",
        fact: expect.objectContaining({
          key: "fact.allowed_status",
          kind: "plain_fact",
          type: "string",
          validation: {
            kind: "allowed-values",
            values: ["ready", "blocked"],
          },
        }),
      }),
      expect.anything(),
    );
  });

  it("preserves JSON sub-schema key cardinality when creating work-unit facts", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "facts" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Add Fact" }));
    chooseOption("Fact Type", "json");
    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "fact.contract_json" },
    });
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Contract JSON" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add JSON Key" }));

    const jsonSubKeyCard = screen
      .getByLabelText("Key Display Name")
      .closest(".space-y-4") as HTMLElement | null;
    expect(jsonSubKeyCard).toBeTruthy();
    chooseOptionIn(jsonSubKeyCard as HTMLElement, "Cardinality", "many");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(routeContext.createWorkUnitFactMock).toHaveBeenCalledTimes(1);
    });

    const firstCreateCall = routeContext.createWorkUnitFactMock.mock.calls[0]?.[0] as
      | {
          fact?: {
            validation?: {
              kind?: string;
              subSchema?: {
                type?: string;
                fields?: Array<{ key?: string; type?: string; cardinality?: string }>;
              };
            };
          };
        }
      | undefined;

    expect(firstCreateCall?.fact?.validation?.kind).toBe("json-schema");
    expect(firstCreateCall?.fact?.validation?.subSchema).toEqual(
      expect.objectContaining({
        type: "object",
        fields: expect.arrayContaining([
          expect.objectContaining({
            key: "field_1",
            type: "string",
            cardinality: "many",
          }),
        ]),
      }),
    );
  });

  it("shows destructive delete confirmation style for work-unit facts", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "facts" });

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    const deleteButtons = await screen.findAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons[0]!);

    expect(await screen.findByText("Destructive action")).toBeTruthy();
    const destructiveConfirm = screen.getByRole("button", { name: "Delete Fact Permanently" });
    expect(destructiveConfirm.className).toContain("text-destructive");
  });

  it("deletes work units through version.workUnit.delete", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({});
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    fireEvent.click((await screen.findAllByRole("button", { name: "Delete" }))[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Delete Work Unit Permanently" }));
    await waitFor(() => {
      expect(routeContext.deleteWorkUnitMock).toHaveBeenCalledTimes(1);
    });
  });

  it("toggles keymap helper and uses consistent 1..5 tab hotkeys while preserving tab-local keys", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "overview" });

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    expect(screen.queryByText("KEYMAP")).toBeNull();
    expect(screen.queryByText("Methodologies")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open keymap" }));
    expect(await screen.findByText("KEYMAP")).toBeTruthy();
    const keymapMenu = screen.getByTestId("keymap-menu");
    expect(keymapMenu.className).toContain("fixed");
    expect(keymapMenu.className).not.toContain("chiron-frame-flat");
    expect(keymapMenu.className).toContain("bottom-0");
    expect(keymapMenu.className).toContain("right-0");
    expect(keymapMenu.className).not.toContain("bottom-4");
    expect(keymapMenu.className).not.toContain("right-4");

    expect(screen.getByText("? — Toggle helper")).toBeTruthy();
    expect(screen.getByText("Esc — Close helper")).toBeTruthy();
    expect(screen.getByText("1 — Facts")).toBeTruthy();
    expect(screen.getByText("2 — Workflows")).toBeTruthy();
    expect(screen.getByText("3 — State Machine")).toBeTruthy();
    expect(screen.getByText("4 — Artifact Slots")).toBeTruthy();
    expect(screen.getByText("5 — Overview")).toBeTruthy();
    expect(screen.getByText("F — Add Fact (Facts tab)")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close keymap" }));
    await waitFor(() => {
      expect(screen.queryByText("KEYMAP")).toBeNull();
    });

    expect(screen.getByRole("button", { name: "Open keymap" }).className).toContain("fixed");
    expect(screen.getByRole("button", { name: "Open keymap" }).className).not.toContain(
      "chiron-frame-flat",
    );

    fireEvent.click(screen.getByRole("button", { name: "Open keymap" }));
    expect(await screen.findByText("KEYMAP")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close keymap" }));
    await waitFor(() => {
      expect(screen.queryByText("KEYMAP")).toBeNull();
    });
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

  it("redirects the removed methodology agents route back to the version workspace", async () => {
    const { MethodologyVersionAgentsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.agents");
    const routeContext = createRouteContext();
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({ intent: "add-agent" });
    useRouteContextMock.mockReturnValue(routeContext);

    renderWithQueryClient(<MethodologyVersionAgentsRoute />);

    expect(useNavigateMock).not.toHaveBeenCalled();
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
