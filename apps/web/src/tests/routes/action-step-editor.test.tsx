import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error jsdom package ships without local type declarations in this workspace.
import { JSDOM } from "jsdom";

if (typeof globalThis.document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    MutationObserver: dom.window.MutationObserver,
    Event: dom.window.Event,
    KeyboardEvent: dom.window.KeyboardEvent,
    MouseEvent: dom.window.MouseEvent,
    SVGElement: dom.window.SVGElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  });
}

if (typeof globalThis.HTMLElement !== "undefined") {
  Object.defineProperty(globalThis.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value: () => {},
  });
}

const { cleanup, fireEvent, render, screen, waitFor, within } =
  await import("@testing-library/react");

const {
  useParamsMock,
  useRouteContextMock,
  createActionStepMutationSpy,
  updateActionStepMutationSpy,
  deleteActionStepMutationSpy,
  reactFlowPropsSpy,
} = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
  useRouteContextMock: vi.fn(),
  createActionStepMutationSpy: vi.fn(async () => ({ stepId: "step-created-action" })),
  updateActionStepMutationSpy: vi.fn(async () => ({ diagnostics: [] })),
  deleteActionStepMutationSpy: vi.fn(async () => ({ diagnostics: [] })),
  reactFlowPropsSpy: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: useParamsMock,
    useRouteContext: useRouteContextMock,
  }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | null | false>) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("../../components/ui/button", () => ({
  buttonVariants: () => "",
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("../../components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogTrigger: ({ render, children }: { render?: ReactNode; children?: ReactNode }) => (
    <>{render ?? children}</>
  ),
}));

vi.mock("../../components/ui/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
}));

vi.mock("../../components/ui/textarea", () => ({
  Textarea: (props: React.ComponentProps<"textarea">) => <textarea {...props} />,
}));

vi.mock("../../components/ui/checkbox", () => ({
  Checkbox: ({
    onCheckedChange,
    checked,
    ...props
  }: React.ComponentProps<"input"> & { onCheckedChange?: (checked: boolean) => void }) => (
    <input
      {...props}
      type="checkbox"
      checked={checked as boolean | undefined}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("../../components/ui/select", () => {
  type SelectChildProps = {
    value?: unknown;
    children?: ReactNode;
    id?: string;
  };

  const SelectContext = React.createContext<{
    value: string | null | undefined;
    onValueChange: ((value: string | null) => void) | undefined;
    selectId: string | undefined;
    options: Array<{ value: string; label: string }>;
  } | null>(null);

  const collectOptions = (children: ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(children).flatMap((child) => {
      if (!React.isValidElement<SelectChildProps>(child)) {
        return [];
      }

      const element = child as React.ReactElement<SelectChildProps>;
      const value = element.props.value;
      const label = React.Children.toArray(element.props.children)
        .map((part) => (typeof part === "string" ? part : ""))
        .join("")
        .trim();

      const nested = collectOptions(element.props.children);
      return typeof value === "string" ? [{ value, label: label || value }, ...nested] : nested;
    });

  const findTriggerId = (children: ReactNode): string | undefined => {
    for (const child of React.Children.toArray(children)) {
      if (!React.isValidElement<SelectChildProps>(child)) {
        continue;
      }

      const element = child as React.ReactElement<SelectChildProps>;
      if (typeof element.props.id === "string") {
        return element.props.id;
      }

      const nested = findTriggerId(element.props.children);
      if (nested) {
        return nested;
      }
    }

    return undefined;
  };

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string | null;
      onValueChange?: (value: string | null) => void;
      children: ReactNode;
    }) => (
      <SelectContext.Provider
        value={{
          value: value ?? null,
          onValueChange,
          selectId: findTriggerId(children),
          options: collectOptions(children),
        }}
      >
        <div>{children}</div>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({ id }: { id?: string; children?: ReactNode }) => {
      const ctx = React.useContext(SelectContext);
      return (
        <select
          id={id ?? ctx?.selectId}
          aria-label={id ?? ctx?.selectId}
          value={ctx?.value ?? ""}
          onChange={(event) => ctx?.onValueChange?.(event.target.value || null)}
        >
          <option value="">Select</option>
          {ctx?.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    },
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

vi.mock("../../components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ render, children }: { render?: ReactNode; children?: ReactNode }) => (
    <>{render ?? children}</>
  ),
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../components/ui/command", () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandInput: ({ placeholder }: { placeholder?: string }) => <input aria-label={placeholder} />,
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ heading, children }: { heading?: ReactNode; children: ReactNode }) => (
    <section>
      <h3>{heading}</h3>
      {children}
    </section>
  ),
  CommandItem: ({
    children,
    onSelect,
    disabled,
  }: {
    children: ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={() => !disabled && onSelect?.()}>
      {children}
    </button>
  ),
}));

vi.mock("../../components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../components/ui/radio-group", () => {
  const RadioGroupContext = React.createContext<{
    value: string | undefined;
    onValueChange: ((value: string) => void) | undefined;
    name?: string;
  } | null>(null);

  return {
    RadioGroup: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string;
      onValueChange?: (value: string) => void;
      children: ReactNode;
    }) => (
      <RadioGroupContext.Provider value={{ value, onValueChange }}>
        {children}
      </RadioGroupContext.Provider>
    ),
    RadioGroupItem: ({ value, name }: { value: string; name?: string }) => {
      const ctx = React.useContext(RadioGroupContext);
      return (
        <input
          type="radio"
          name={name ?? ctx?.name}
          aria-label={value}
          checked={ctx?.value === value}
          onChange={() => ctx?.onValueChange?.(value)}
        />
      );
    },
  };
});

vi.mock("@xyflow/react", () => ({
  Background: () => <div data-testid="xyflow-background" />,
  Controls: () => <div data-testid="xyflow-controls" />,
  Handle: () => <div data-testid="xyflow-handle" />,
  MarkerType: { ArrowClosed: "arrow-closed" },
  Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Position: { Left: "left", Right: "right" },
  ReactFlow: (props: any) => {
    reactFlowPropsSpy(props);
    return <div>{props.children}</div>;
  },
  useNodesState: (initialNodes: any[]) => {
    const [nodes, setNodes] = React.useState(initialNodes);
    return [nodes, setNodes, vi.fn()] as const;
  },
}));

vi.mock("../../features/workflow-editor/workflow-canvas", () => ({
  WorkflowCanvas: () => <div>Workflow Canvas</div>,
}));

function createEditorDefinition() {
  return {
    workflow: {
      workflowDefinitionId: "wf-def-001",
      key: "WF.SETUP",
      displayName: "Setup Workflow",
      descriptionJson: { markdown: "Bootstrap workflow" },
    },
    steps: [
      {
        stepId: "step-form-1",
        stepType: "form",
        payload: {
          key: "capture-context",
          label: "Capture Context",
          descriptionJson: { markdown: "Capture reusable setup context." },
          fields: [
            {
              contextFactDefinitionId: "ctx-plain",
              fieldLabel: "Summary",
              fieldKey: "summary",
              helpText: null,
              required: true,
            },
          ],
          guidance: {
            human: { markdown: "Capture the setup context." },
            agent: { markdown: "Normalize the setup context." },
          },
        },
      },
      {
        stepId: "step-action-1",
        stepType: "action",
      },
    ],
    edges: [
      {
        edgeId: "edge-1",
        fromStepKey: "capture-context",
        toStepKey: "propagate-setup-context",
      },
    ],
    contextFacts: [
      {
        contextFactDefinitionId: "ctx-plain",
        key: "plain_summary",
        label: "Plain Summary",
        descriptionJson: { markdown: "Plain summary fact." },
        kind: "plain_value_fact",
        cardinality: "one",
        valueType: "string",
        guidanceJson: {
          human: { markdown: "Provide a summary." },
          agent: { markdown: "Keep it concise." },
        },
      },
      {
        contextFactDefinitionId: "ctx-bound",
        key: "bound_setup_summary",
        label: "Bound Setup Summary",
        descriptionJson: { markdown: "Bound external setup summary." },
        kind: "bound_external_fact",
        cardinality: "one",
        externalFactDefinitionId: "ext-bound-setup-summary",
      },
      {
        contextFactDefinitionId: "ctx-artifact",
        key: "setup_artifact",
        label: "Setup Artifact",
        descriptionJson: { markdown: "Setup artifact reference." },
        kind: "artifact_reference_fact",
        cardinality: "one",
        artifactSlotDefinitionId: "slot-setup",
      },
    ],
    formDefinitions: [],
    agentStepDefinitions: [],
  };
}

function createRouteContext(editorDefinition = createEditorDefinition()) {
  const actionDefinitions = new Map([
    [
      "step-action-1",
      {
        step: { stepId: "step-action-1" },
        payload: {
          key: "propagate-setup-context",
          label: "Propagate Setup Context",
          descriptionJson: { markdown: "Propagate the setup context outward." },
          executionMode: "sequential",
          guidance: {
            human: { markdown: "Review the outgoing propagation targets." },
            agent: { markdown: "Only use the authored propagation rows." },
          },
          actions: [
            {
              actionId: "action-1",
              actionKey: "propagate-summary",
              label: "Propagate Summary",
              enabled: true,
              sortOrder: 100,
              actionKind: "propagation",
              contextFactDefinitionId: "ctx-bound",
              contextFactKind: "bound_external_fact",
              items: [
                {
                  itemId: "item-1",
                  itemKey: "summary-value",
                  label: "Summary Value",
                  sortOrder: 100,
                  targetContextFactDefinitionId: "ctx-bound",
                },
              ],
            },
          ],
        },
      },
    ],
  ]);

  return {
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    }),
    orpc: {
      methodology: {
        version: {
          fact: {
            list: {
              queryOptions: () => ({
                queryKey: ["methodology-facts", "v1"],
                queryFn: async () => ({ factDefinitions: [] }),
              }),
            },
          },
          workUnit: {
            list: {
              queryOptions: () => ({
                queryKey: ["work-unit-types", "v1"],
                queryFn: async () => ({
                  workUnitTypes: [
                    {
                      id: "wut-setup",
                      key: "WU.SETUP",
                      displayName: "Setup",
                      factSchemas: [],
                    },
                  ],
                }),
              }),
            },
            fact: {
              list: {
                queryOptions: () => ({
                  queryKey: ["work-unit-facts", "v1"],
                  queryFn: async () => ({ workUnitTypes: [] }),
                }),
              },
            },
            artifactSlot: {
              list: {
                queryOptions: () => ({
                  queryKey: ["artifact-slots", "v1", "WU.SETUP"],
                  queryFn: async () => [],
                }),
              },
            },
            stateMachine: {
              transition: {
                list: {
                  queryOptions: () => ({
                    queryKey: ["transitions", "v1", "WU.SETUP"],
                    queryFn: async () => [],
                  }),
                },
                binding: {
                  list: {
                    queryOptions: () => ({
                      queryKey: ["transition-bindings", "v1", "WU.SETUP"],
                      queryFn: async () => [],
                    }),
                  },
                },
              },
            },
            workflow: {
              list: {
                queryOptions: () => ({
                  queryKey: ["workflows", "v1", "WU.SETUP"],
                  queryFn: async () => ({ workflows: [] }),
                }),
              },
              getEditorDefinition: {
                queryOptions: () => ({
                  queryKey: ["workflow-editor", "v1", "WU.SETUP", "wf-def-001"],
                  queryFn: async () => editorDefinition,
                }),
              },
              getActionStepDefinition: {
                queryOptions: ({ input }: { input: { stepId: string } }) => ({
                  queryKey: ["workflow-editor-action-step-definition", input.stepId],
                  queryFn: async () => actionDefinitions.get(input.stepId) ?? null,
                }),
              },
              createActionStep: {
                mutationOptions: () => ({ mutationFn: createActionStepMutationSpy }),
              },
              updateActionStep: {
                mutationOptions: () => ({ mutationFn: updateActionStepMutationSpy }),
              },
              deleteActionStep: {
                mutationOptions: () => ({ mutationFn: deleteActionStepMutationSpy }),
              },
            },
          },
        },
      },
    },
  };
}

function renderRoute(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

describe("action step editor route", () => {
  beforeEach(() => {
    cleanup();
    useParamsMock.mockReset();
    useRouteContextMock.mockReset();
    createActionStepMutationSpy.mockClear();
    updateActionStepMutationSpy.mockClear();
    deleteActionStepMutationSpy.mockClear();
    reactFlowPropsSpy.mockClear();

    useParamsMock.mockReturnValue({
      methodologyId: "m1",
      versionId: "v1",
      workUnitKey: "WU.SETUP",
      workflowDefinitionId: "wf-def-001",
    });
    useRouteContextMock.mockReturnValue(createRouteContext());
  });

  it("hydrates action steps from the dedicated action-step definition queries", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    const inspectActionButton = await screen.findByRole("button", {
      name: /Inspect Step propagate-setup-context/i,
    });
    fireEvent.click(inspectActionButton);
    fireEvent.click(screen.getByRole("button", { name: /edit action step/i }));

    expect(await screen.findByDisplayValue("propagate-setup-context")).toBeTruthy();
    expect(screen.getByDisplayValue("Propagate Setup Context")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Actions$/i }));
    expect(screen.getByText("Propagate Summary")).toBeTruthy();
    const actionCard = screen.getByText("Propagate Summary").closest("section");
    expect(actionCard).toBeTruthy();
    fireEvent.click(
      within(actionCard as HTMLElement).getByRole("button", { name: /edit action/i }),
    );
    expect(await screen.findByRole("heading", { name: /edit action/i })).toBeTruthy();
    expect(screen.getByDisplayValue("propagate-summary")).toBeTruthy();
    expect(screen.getByDisplayValue("Summary Value")).toBeTruthy();
    expect(screen.getByText(/context fact to propagate/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Guidance$/i }));
    expect(screen.getByDisplayValue("Review the outgoing propagation targets.")).toBeTruthy();
  });

  it("creates action steps as whole-step payloads with stable nested ids and locked tabs", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    const actionTile = await screen.findByRole("button", { name: /Action step type 08/i });
    fireEvent.click(actionTile);

    expect(await screen.findByText("Create Action Step")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Overview/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Actions/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Execution/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Guidance/i })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Step key"), {
      target: { value: "propagate-team-setup" },
    });
    fireEvent.change(screen.getByLabelText("Label"), {
      target: { value: "Propagate Team Setup" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^Actions$/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /new-action-type/i }), {
      target: { value: "propagation" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add action/i }));

    expect(await screen.findByRole("heading", { name: /add action/i })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Action key"), {
      target: { value: "propagate-bound-setup-summary" },
    });
    fireEvent.change(screen.getByLabelText("Action name"), {
      target: { value: "Setup Summary Value" },
    });
    fireEvent.change(screen.getByLabelText("Item key 1"), {
      target: { value: "bound-setup-summary-item" },
    });
    fireEvent.change(screen.getByLabelText("Item label 1"), {
      target: { value: "Setup Summary Item" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^Add action$/i }).at(-1)!);

    fireEvent.click(screen.getByRole("button", { name: /^Execution$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Parallel/i }));

    fireEvent.click(screen.getByRole("button", { name: /^Guidance$/i }));
    fireEvent.change(screen.getByLabelText("Human guidance"), {
      target: { value: "Confirm the outward propagation before running it." },
    });
    fireEvent.change(screen.getByLabelText("Agent guidance"), {
      target: { value: "Use only the authored propagation rows and ids." },
    });

    fireEvent.click(screen.getByRole("button", { name: /save action step/i }));

    await waitFor(() => expect(createActionStepMutationSpy).toHaveBeenCalledTimes(1));

    expect((createActionStepMutationSpy.mock.calls as unknown[][])[0]?.[0]).toEqual(
      expect.objectContaining({
        versionId: "v1",
        workUnitTypeKey: "WU.SETUP",
        workflowDefinitionId: "wf-def-001",
        afterStepKey: null,
        payload: expect.objectContaining({
          key: "propagate-team-setup",
          label: "Propagate Team Setup",
          executionMode: "parallel",
          guidance: {
            human: { markdown: "Confirm the outward propagation before running it." },
            agent: { markdown: "Use only the authored propagation rows and ids." },
          },
          actions: [
            expect.objectContaining({
              actionId: expect.any(String),
              actionKey: "propagate-bound-setup-summary",
              label: "Setup Summary Value",
              contextFactDefinitionId: "ctx-bound",
              contextFactKind: "bound_external_fact",
              sortOrder: 100,
              items: [
                expect.objectContaining({
                  itemId: expect.any(String),
                  itemKey: "bound-setup-summary-item",
                  label: "Setup Summary Item",
                  sortOrder: 100,
                  targetContextFactDefinitionId: "ctx-bound",
                }),
              ],
            }),
          ],
        }),
      }),
    );
  });

  it("rejects saving an action step when every authored action is disabled", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /Action step type 08/i }));
    expect(await screen.findByText("Create Action Step")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Step key"), {
      target: { value: "propagate-disabled" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^Actions$/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /new-action-type/i }), {
      target: { value: "propagation" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add action/i }));
    expect(await screen.findByRole("heading", { name: /add action/i })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Item key 1"), {
      target: { value: "disabled-item" },
    });
    const enabledCheckbox = screen.getByRole("checkbox", { name: "Action enabled" });
    fireEvent.click(enabledCheckbox);
    expect((enabledCheckbox as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getAllByRole("button", { name: /^Add action$/i }).at(-1)!);

    fireEvent.click(screen.getByRole("button", { name: /save action step/i }));

    expect(await screen.findByText("Enable at least one action.")).toBeTruthy();
    expect(createActionStepMutationSpy).not.toHaveBeenCalled();
  });

  it("disables context facts already selected by sibling items within the same propagation action only", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /Action step type 08/i }));
    expect(await screen.findByText("Create Action Step")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Step key"), {
      target: { value: "propagate-duplicates-guard" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^Actions$/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /new-action-type/i }), {
      target: { value: "propagation" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add action/i }));
    expect(await screen.findByRole("heading", { name: /add action/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Add propagation item/i }));

    const firstItemCard = screen
      .getByLabelText("Item key 1")
      .closest("article") as HTMLElement | null;
    const secondItemCard = screen
      .getByLabelText("Item key 2")
      .closest("article") as HTMLElement | null;
    expect(firstItemCard).toBeTruthy();
    expect(secondItemCard).toBeTruthy();

    fireEvent.click(within(secondItemCard).getByRole("button", { name: /Setup Artifact/i }));

    const disabledSiblingOption = within(secondItemCard).getByRole("button", {
      name: /Bound Setup Summary/i,
    });
    expect(disabledSiblingOption.hasAttribute("disabled")).toBe(true);

    expect(
      within(firstItemCard)
        .getByRole("button", { name: /Bound Setup Summary/i })
        .hasAttribute("disabled"),
    ).toBe(false);
  });

  it("allows mixed allowed context-fact kinds inside one propagation action", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /Action step type 08/i }));
    expect(await screen.findByText("Create Action Step")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Step key"), {
      target: { value: "propagate-mixed-kinds" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^Actions$/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /new-action-type/i }), {
      target: { value: "propagation" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add action/i }));
    expect(await screen.findByRole("heading", { name: /add action/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Add propagation item/i }));

    const secondItemCard = screen
      .getByLabelText("Item key 2")
      .closest("article") as HTMLElement | null;
    expect(secondItemCard).toBeTruthy();

    fireEvent.click(within(secondItemCard).getByRole("button", { name: /Setup Artifact/i }));
    expect(screen.queryByText(/same context fact kind/i)).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: /^Add action$/i }).at(-1)!);
    expect(screen.queryByText(/same context fact kind/i)).toBeNull();
  });
});
