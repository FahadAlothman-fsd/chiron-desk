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
  if (typeof dom.window.HTMLElement.prototype.scrollIntoView !== "function") {
    Object.defineProperty(dom.window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: () => {},
    });
  }
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

if (typeof globalThis.HTMLElement !== "undefined") {
  Object.defineProperty(globalThis.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value: () => {},
  });
}

if (typeof globalThis.Element !== "undefined") {
  Object.defineProperty(globalThis.Element.prototype, "scrollIntoView", {
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
  updateWorkflowMutationSpy,
  createFormStepMutationSpy,
  createContextFactMutationSpy,
  updateContextFactMutationSpy,
  deleteContextFactMutationSpy,
} = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
  useRouteContextMock: vi.fn(),
  updateWorkflowMutationSpy: vi.fn(async () => ({ diagnostics: [] })),
  createFormStepMutationSpy: vi.fn(async () => ({ stepId: "step-new", diagnostics: [] })),
  createContextFactMutationSpy: vi.fn(async () => ({
    contextFactDefinitionId: "ctx-created",
    kind: "plain_value_fact",
    key: "architecture-summary",
    label: "Architecture Summary",
    cardinality: "one",
    valueType: "string",
  })),
  updateContextFactMutationSpy: vi.fn(async () => ({ diagnostics: [] })),
  deleteContextFactMutationSpy: vi.fn(async () => ({ diagnostics: [] })),
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

vi.mock("@/components/ui/button", () => ({
  buttonVariants: () => "",
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
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
    placeholder: string | undefined;
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

  const findTriggerProps = (children: ReactNode): { id?: string; placeholder?: string } => {
    for (const child of React.Children.toArray(children)) {
      if (!React.isValidElement<SelectChildProps>(child)) {
        continue;
      }

      const element = child as React.ReactElement<SelectChildProps>;

      if (typeof element.props.id === "string") {
        return { id: element.props.id };
      }

      const nested = findTriggerProps(element.props.children);
      if (nested.id || nested.placeholder) {
        return nested;
      }
    }

    return {};
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
    }) => {
      const trigger = findTriggerProps(children);
      return (
        <SelectContext.Provider
          value={{
            value: value ?? null,
            onValueChange,
            selectId: trigger.id,
            placeholder: trigger.placeholder,
            options: collectOptions(children),
          }}
        >
          <div>{children}</div>
        </SelectContext.Provider>
      );
    },
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

vi.mock("../../features/workflow-editor/workflow-canvas", () => ({
  WorkflowCanvas: () => <div>Workflow Canvas</div>,
}));

type TestWorkflowEditorDefinition = {
  workflow: Record<string, unknown>;
  steps: unknown[];
  edges: unknown[];
  contextFacts: Array<Record<string, unknown>>;
  formDefinitions: unknown[];
  agentStepDefinitions?: unknown[];
  actionStepDefinitions?: unknown[];
};

type MethodologyFactsListResult = {
  factDefinitions: Array<{
    id: string;
    key: string;
    name: string;
    valueType: string;
    cardinality: string;
  }>;
};

function createEditorDefinition(): TestWorkflowEditorDefinition {
  return {
    workflow: {
      workflowDefinitionId: "wf-def-001",
      key: "WF.SETUP",
      displayName: "Setup Workflow",
      descriptionJson: { markdown: "Bootstrap workflow" },
    },
    steps: [
      {
        stepId: "step-id-1",
        stepType: "form",
        payload: {
          key: "capture-context",
          label: "Capture Context",
          descriptionJson: { markdown: "Capture the reusable context." },
          fields: [
            {
              contextFactDefinitionId: "ctx-summary",
              fieldLabel: "Summary",
              fieldKey: "summary",
              helpText: null,
              required: true,
            },
          ],
          guidanceJson: {
            human: { markdown: "Ask the operator for the reusable context." },
            agent: { markdown: "Normalize the response into workflow facts." },
          },
        },
      },
    ],
    edges: [],
    contextFacts: [
      {
        contextFactDefinitionId: "ctx-summary",
        key: "summary",
        label: "Summary",
        descriptionJson: { markdown: "Reusable summary for downstream steps." },
        kind: "plain_value_fact",
        cardinality: "one",
        valueType: "string",
        guidanceJson: {
          human: { markdown: "Provide the concise project summary." },
          agent: { markdown: "Keep the summary concise and reusable." },
        },
      },
      {
        contextFactDefinitionId: "ctx-supporting-workflows",
        key: "supporting-workflows",
        label: "Supporting Workflows",
        descriptionJson: { markdown: "Workflow references for fan-out steps." },
        kind: "workflow_ref_fact",
        cardinality: "many",
        allowedWorkflowDefinitionIds: ["wf.review", "wf.dev"],
        guidanceJson: {
          human: { markdown: "Choose the reusable workflow references." },
          agent: { markdown: "Preserve the workflow ids as authored." },
        },
      },
      {
        contextFactDefinitionId: "ctx-deep-dive-target",
        key: "deep_dive_target",
        label: "Deep Dive Target",
        descriptionJson: { markdown: "Selected deep-dive target for brainstorming follow-up." },
        kind: "work_unit_draft_spec_fact",
        cardinality: "one",
        workUnitDefinitionId: "wut-brainstorming",
        selectedWorkUnitFactDefinitionIds: ["wuf-selected-directions"],
        selectedArtifactSlotDefinitionIds: [],
        includedFactDefinitionIds: ["wuf-selected-directions"],
        guidanceJson: {
          human: { markdown: "Pick the brainstorming target to deepen." },
          agent: { markdown: "Reuse the selected brainstorming target in downstream flows." },
        },
      },
    ],
    formDefinitions: [
      {
        stepId: "step-id-1",
        payload: {
          key: "capture-context",
          label: "Capture Context",
          descriptionJson: { markdown: "Capture the reusable context." },
          fields: [
            {
              contextFactDefinitionId: "ctx-summary",
              fieldLabel: "Summary",
              fieldKey: "summary",
              helpText: null,
              required: true,
            },
          ],
          guidanceJson: {
            human: { markdown: "Ask the operator for the reusable context." },
            agent: { markdown: "Normalize the response into workflow facts." },
          },
        },
      },
    ],
  };
}

function createRouteContext(
  editorDefinition: ReturnType<typeof createEditorDefinition> | null = createEditorDefinition(),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  return {
    queryClient,
    orpc: {
      methodology: {
        version: {
          fact: {
            list: {
              queryOptions: () => ({
                queryKey: ["methodology-facts", "v1"],
                queryFn: async (): Promise<MethodologyFactsListResult> => ({ factDefinitions: [] }),
              }),
            },
          },
          dependencyDefinition: {
            list: {
              queryOptions: () => ({
                queryKey: ["dependency-definitions", "v1"],
                queryFn: async () => ({
                  linkTypeDefinitions: [
                    {
                      key: "depends_on",
                      name: "Depends On",
                    },
                    {
                      key: "blocks",
                      name: "Blocks",
                    },
                    {
                      key: "relates_to",
                      name: "Relates To",
                    },
                  ],
                }),
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
                      id: "wut-brainstorming",
                      key: "brainstorming",
                      displayName: "Brainstorming",
                      factSchemas: [
                        {
                          id: "wuf-selected-directions",
                          key: "selected_directions",
                          name: "Selected Directions",
                          valueType: "json",
                          cardinality: "one",
                          description:
                            "Durable convergence checkpoint capturing the directions selected at the end of brainstorming.",
                        },
                        {
                          id: "wuf-desired-outcome",
                          key: "desired_outcome",
                          name: "Desired Outcome",
                          valueType: "string",
                          cardinality: "one",
                          description: "What the session should produce when it has succeeded.",
                        },
                      ],
                    },
                  ],
                }),
              }),
            },
            fact: {
              list: {
                queryOptions: () => ({
                  queryKey: ["work-unit-facts", "v1"],
                  queryFn: async () => ({
                    workUnitTypes: [
                      {
                        id: "wut-brainstorming",
                        key: "brainstorming",
                        displayName: "Brainstorming",
                        factSchemas: [
                          {
                            id: "wuf-selected-directions",
                            key: "selected_directions",
                            name: "Selected Directions",
                            valueType: "json",
                            cardinality: "one",
                            description:
                              "Durable convergence checkpoint capturing the directions selected at the end of brainstorming.",
                          },
                          {
                            id: "wuf-desired-outcome",
                            key: "desired_outcome",
                            name: "Desired Outcome",
                            valueType: "string",
                            cardinality: "one",
                            description: "What the session should produce when it has succeeded.",
                          },
                        ],
                      },
                    ],
                  }),
                }),
              },
            },
            workflow: {
              getEditorDefinition: {
                queryOptions: () => ({
                  queryKey: ["workflow-editor", "v1", "WU.SETUP", "wf-def-001"],
                  queryFn: async () => editorDefinition,
                }),
              },
              updateWorkflowMetadata: {
                mutationOptions: () => ({ mutationFn: updateWorkflowMutationSpy }),
              },
              createFormStep: {
                mutationOptions: () => ({ mutationFn: createFormStepMutationSpy }),
              },
              contextFact: {
                create: {
                  mutationOptions: () => ({ mutationFn: createContextFactMutationSpy }),
                },
                update: {
                  mutationOptions: () => ({ mutationFn: updateContextFactMutationSpy }),
                },
                delete: {
                  mutationOptions: () => ({ mutationFn: deleteContextFactMutationSpy }),
                },
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

describe("workflow editor form slice route", () => {
  beforeEach(() => {
    cleanup();
    useParamsMock.mockReset();
    useRouteContextMock.mockReset();
    updateWorkflowMutationSpy.mockClear();
    createFormStepMutationSpy.mockClear();
    createContextFactMutationSpy.mockClear();
    updateContextFactMutationSpy.mockClear();
    deleteContextFactMutationSpy.mockClear();

    useParamsMock.mockReturnValue({
      methodologyId: "m1",
      versionId: "v1",
      workUnitKey: "WU.SETUP",
      workflowDefinitionId: "wf-def-001",
    });
    useRouteContextMock.mockReturnValue(createRouteContext());
  });

  it("renders locked design-time CRUD surfaces for forms and context facts", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    expect(await screen.findByText("STEP TYPES")).toBeTruthy();
    expect(screen.getByText("Context Fact Definitions")).toBeTruthy();
    expect(screen.getByText("Summary")).toBeTruthy();
    expect(screen.getByText("Deep Dive Target")).toBeTruthy();
    expect(screen.getByText("Brainstorming")).toBeTruthy();
    expect(screen.queryByText("wut-brainstorming")).toBeNull();
    expect(screen.queryByText(/coming in slice-2/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Form step type 45/i }));

    expect(await screen.findByRole("button", { name: "Contract" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fields" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guidance" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Context Facts" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Step Key"), { target: { value: "capture-brief" } });
    fireEvent.change(screen.getByLabelText("Step Title"), { target: { value: "Capture Brief" } });
    fireEvent.click(screen.getByRole("button", { name: "Fields" }));

    const addBindingFactSelect = screen.getAllByLabelText(
      "workflow-editor-add-field",
    )[0] as HTMLSelectElement;
    fireEvent.change(addBindingFactSelect, { target: { value: "ctx-supporting-workflows" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add Field Binding" }));

    fireEvent.change(screen.getByLabelText("Field Label"), {
      target: { value: "Supporting Workflows" },
    });
    fireEvent.change(screen.getByLabelText("Field Key"), {
      target: { value: "supportingWorkflows" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));
    fireEvent.change(screen.getByLabelText("Human Guidance"), {
      target: { value: "Ask for the supporting workflows to run." },
    });
    fireEvent.change(screen.getByLabelText("Agent Guidance"), {
      target: { value: "Treat the selection as reusable workflow references." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      const createFormPayload = (createFormStepMutationSpy.mock.calls as unknown[][])[0]?.[0];
      expect(createFormPayload).toBeDefined();
      expect(createFormPayload).toEqual(
        expect.objectContaining({
          versionId: "v1",
          workUnitTypeKey: "WU.SETUP",
          workflowDefinitionId: "wf-def-001",
          payload: expect.objectContaining({
            key: "capture-brief",
            label: "Capture Brief",
            fields: expect.arrayContaining([
              expect.objectContaining({
                contextFactDefinitionId: "ctx-supporting-workflows",
                fieldLabel: "Supporting Workflows",
                fieldKey: "supportingWorkflows",
              }),
            ]),
            guidance: {
              human: { markdown: "Ask for the supporting workflows to run." },
              agent: { markdown: "Treat the selection as reusable workflow references." },
            },
          }),
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "+ Fact" }));

    expect(await screen.findByRole("button", { name: "Value Semantics" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Contract/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guidance" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "architecture-summary" },
    });
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Architecture Summary" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guidance" }));

    const guidanceTab = screen.getByRole("button", { name: "Guidance" }).closest("div");
    const guidanceScope = guidanceTab?.parentElement?.parentElement ?? document.body;
    const guidanceInputs = within(guidanceScope);
    const [factHumanGuidance] = guidanceInputs.getAllByLabelText("Human Guidance");
    const [factAgentGuidance] = guidanceInputs.getAllByLabelText("Agent Guidance");

    if (!factHumanGuidance || !factAgentGuidance) {
      throw new Error("Expected context-fact guidance inputs to be rendered.");
    }

    fireEvent.change(factHumanGuidance, {
      target: { value: "Capture the canonical architecture summary." },
    });
    fireEvent.change(factAgentGuidance, {
      target: { value: "Keep the definition aligned with downstream readers." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      const createContextFactPayload = (
        createContextFactMutationSpy.mock.calls as unknown[][]
      )[0]?.[0];
      expect(createContextFactPayload).toBeDefined();
      expect(createContextFactPayload).toEqual(
        expect.objectContaining({
          versionId: "v1",
          workUnitTypeKey: "WU.SETUP",
          workflowDefinitionId: "wf-def-001",
          fact: expect.objectContaining({
            kind: "plain_fact",
            key: "architecture-summary",
            label: "Architecture Summary",
            cardinality: "one",
            type: "string",
          }),
        }),
      );
    });
  });

  it("updates workflow metadata through the authoritative workflow-definition route", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit workflow metadata" }));
    fireEvent.change(screen.getByLabelText("Workflow Display Name"), {
      target: { value: "Updated Setup Workflow" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save metadata" }));

    await waitFor(() => {
      const updateWorkflowPayload = (updateWorkflowMutationSpy.mock.calls as unknown[][])[0]?.[0];
      expect(updateWorkflowPayload).toBeDefined();
      expect(updateWorkflowPayload).toEqual(
        expect.objectContaining({
          versionId: "v1",
          workUnitTypeKey: "WU.SETUP",
          workflowDefinitionId: "wf-def-001",
          payload: expect.objectContaining({
            key: "WF.SETUP",
            displayName: "Updated Setup Workflow",
          }),
        }),
      );
    });
  });

  it("maps work-unit reference context facts to dependency payload fields", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Fact" }));
    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "current-story" },
    });
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Current Story" },
    });
    fireEvent.change(screen.getByLabelText("workflow-editor-context-fact-kind"), {
      target: { value: "work_unit_reference_fact" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Value Semantics/ }));
    fireEvent.click(screen.getByRole("combobox", { name: "Dependency Type" }));
    expect(await screen.findByText("Blocks")).toBeTruthy();
    fireEvent.click((await screen.findAllByText("Depends On"))[0]!);
    fireEvent.click(screen.getByRole("combobox", { name: "Work Unit Definition" }));
    fireEvent.click((await screen.findAllByText("Brainstorming"))[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      const createContextFactPayload = (createContextFactMutationSpy.mock.calls as unknown[][]).at(
        -1,
      )?.[0] as {
        fact?: {
          kind?: string;
          linkTypeDefinitionId?: string;
        };
      };

      expect(createContextFactPayload?.fact).toEqual(
        expect.objectContaining({
          kind: "work_unit_reference_fact",
          linkTypeDefinitionId: "depends_on",
        }),
      );
    });
  });

  it("shows dirty indicators and discard confirmation for create-mode context facts", async () => {
    const { WorkflowContextFactDialog } = await import("../../features/workflow-editor/dialogs");
    const onOpenChange = vi.fn();

    renderRoute(
      <WorkflowContextFactDialog
        open
        mode="create"
        methodologyFacts={[]}
        currentWorkUnitFacts={[]}
        artifactSlots={[]}
        workUnitTypes={[]}
        availableWorkflows={[]}
        workUnitFactsQueryScope="WU.SETUP"
        loadWorkUnitFacts={async () => []}
        loadWorkUnitArtifactSlots={async () => []}
        onOpenChange={onOpenChange}
        onSave={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "architecture-summary" },
    });

    expect(screen.getByRole("button", { name: /Contract\s*\*/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("Discard unsaved changes?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Keep Editing" }));

    expect(screen.queryByText("Discard unsaved changes?")).toBeNull();
    expect((screen.getByLabelText("Fact Key") as HTMLInputElement).value).toBe(
      "architecture-summary",
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("highlights Fact Key when create returns duplicate-key validation error", async () => {
    const { WorkflowContextFactDialog } = await import("../../features/workflow-editor/dialogs");

    renderRoute(
      <WorkflowContextFactDialog
        open
        mode="create"
        methodologyFacts={[]}
        currentWorkUnitFacts={[]}
        artifactSlots={[]}
        workUnitTypes={[]}
        availableWorkflows={[]}
        workUnitFactsQueryScope="WU.SETUP"
        loadWorkUnitFacts={async () => []}
        loadWorkUnitArtifactSlots={async () => []}
        onOpenChange={vi.fn()}
        onSave={vi.fn(async () => {
          throw new Error(
            "ValidationDecodeError: Workflow context fact key 'fasdfa' already exists",
          );
        })}
      />,
    );

    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "fasdfa" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByText("Fact key 'fasdfa' already exists in this workflow.")).toBeTruthy();
    });

    const keyInput = screen.getByLabelText("Fact Key") as HTMLInputElement;
    expect(keyInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("submits draft-spec work unit and fact selections as ids", async () => {
    const { WorkflowContextFactDialog } = await import("../../features/workflow-editor/dialogs");
    const onSave = vi.fn();

    renderRoute(
      <WorkflowContextFactDialog
        open
        mode="create"
        methodologyFacts={[]}
        currentWorkUnitFacts={[]}
        artifactSlots={[
          {
            value: "setup-slot-project-overview",
            label: "Project Overview",
            secondaryLabel: "project_overview",
            description: "Setup artifact slot",
          },
        ]}
        workUnitTypes={[
          {
            value: "wut-brainstorming",
            label: "Brainstorming",
            secondaryLabel: "brainstorming",
            description: "Brainstorming",
            badges: [{ label: "one", tone: "cardinality" }],
          },
        ]}
        availableWorkflows={[]}
        workUnitFactsQueryScope="v1"
        loadWorkUnitFacts={async () => [
          {
            value: "wuf-selected-directions",
            label: "Selected Directions",
            secondaryLabel: "selected_directions",
            description:
              "Durable convergence checkpoint capturing the directions selected at the end of brainstorming.",
            badges: [
              { label: "one", tone: "cardinality" },
              { label: "json", tone: "type-json" },
            ],
          },
          {
            value: "wuf-desired-outcome",
            label: "Desired Outcome",
            secondaryLabel: "desired_outcome",
            description: "What the session should produce when it has succeeded.",
            badges: [
              { label: "one", tone: "cardinality" },
              { label: "string", tone: "type-string" },
            ],
          },
        ]}
        loadWorkUnitArtifactSlots={async (workUnitTypeKey) =>
          workUnitTypeKey === "wut-brainstorming"
            ? [
                {
                  value: "brainstorm-slot-directions",
                  label: "Directions Board",
                  secondaryLabel: "directions_board",
                  description: "Brainstorming artifact slot",
                },
              ]
            : []
        }
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "brainstorming-draft-spec" },
    });
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Brainstorming Draft Spec" },
    });
    fireEvent.change(screen.getByLabelText("workflow-editor-context-fact-kind"), {
      target: { value: "work_unit_draft_spec_fact" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Value Semantics/ }));

    const preSelectionArtifactSlotCombobox = screen.getByRole("combobox", {
      name: "Artifact Slot Definition",
    }) as HTMLButtonElement;
    expect(preSelectionArtifactSlotCombobox.disabled).toBe(true);
    expect(preSelectionArtifactSlotCombobox.textContent).toContain("Select a work unit type first");
    expect(screen.queryByText("Project Overview")).toBeNull();

    fireEvent.click(screen.getByRole("combobox", { name: "Work Unit Definition" }));
    fireEvent.click((await screen.findAllByText("Brainstorming"))[0]!);

    fireEvent.click(screen.getByRole("button", { name: /Contract/ }));
    expect(
      await screen.findByText(
        "Selected work unit type 'Brainstorming' allows one instance, so cardinality is locked to one.",
      ),
    ).toBeTruthy();
    const draftSpecCardinalitySelect = screen.getByLabelText(
      "workflow-editor-context-fact-cardinality",
    ) as HTMLSelectElement;
    expect(
      Array.from(draftSpecCardinalitySelect.options).map((option) => option.value),
    ).not.toContain("many");

    fireEvent.click(screen.getByRole("button", { name: /Value Semantics/ }));

    await waitFor(() => {
      expect(screen.queryByText("Loading facts for the selected work unit...")).toBeNull();
    });

    fireEvent.click(screen.getByRole("combobox", { name: "Artifact Slot Definition" }));
    expect(await screen.findByText("Directions Board")).toBeTruthy();
    expect(screen.queryByText("Project Overview")).toBeNull();

    fireEvent.click(screen.getByRole("combobox", { name: "Fact Definition" }));
    fireEvent.click((await screen.findAllByText("Selected Directions"))[0]!);
    fireEvent.click(screen.getByRole("button", { name: /Add Fact Definition/i }));
    fireEvent.click(screen.getByRole("combobox", { name: "Fact Definition" }));
    fireEvent.click((await screen.findAllByText("Desired Outcome"))[0]!);
    fireEvent.click(screen.getByRole("button", { name: /Add Fact Definition/i }));

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "work_unit_draft_spec_fact",
          workUnitDefinitionId: "wut-brainstorming",
          includedFactDefinitionIds: ["wuf-selected-directions", "wuf-desired-outcome"],
          selectedWorkUnitFactDefinitionIds: ["wuf-selected-directions", "wuf-desired-outcome"],
        }),
      );
    });
  });

  it("shows value semantics for work-unit reference facts and saves selected dependency and work unit ids", async () => {
    const { WorkflowContextFactDialog } = await import("../../features/workflow-editor/dialogs");
    const onSave = vi.fn();

    renderRoute(
      <WorkflowContextFactDialog
        open
        mode="create"
        methodologyFacts={[]}
        currentWorkUnitFacts={[]}
        artifactSlots={[]}
        dependencyDefinitions={[
          {
            value: "depends_on",
            label: "Depends On",
            secondaryLabel: "depends_on",
            description: "Dependency definition",
          },
        ]}
        workUnitTypes={[
          {
            value: "wut-setup",
            label: "Setup",
            secondaryLabel: "WU.SETUP",
            description: "Setup work unit",
            badges: [{ label: "one", tone: "cardinality" }],
          },
        ]}
        availableWorkflows={[]}
        workUnitFactsQueryScope="v1"
        loadWorkUnitFacts={async () => []}
        loadWorkUnitArtifactSlots={async () => []}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "current-setup-work-unit" },
    });
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Current Setup Work Unit" },
    });
    fireEvent.change(screen.getByLabelText("workflow-editor-context-fact-kind"), {
      target: { value: "work_unit_reference_fact" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Value Semantics/ }));
    fireEvent.click(screen.getByRole("combobox", { name: "Dependency Type" }));
    fireEvent.click((await screen.findAllByText("Depends On"))[0]!);
    fireEvent.click(screen.getByRole("combobox", { name: "Work Unit Definition" }));
    fireEvent.click((await screen.findAllByText("Setup"))[0]!);

    fireEvent.click(screen.getByRole("button", { name: /Contract/ }));
    expect(
      await screen.findByText(
        "Selected work unit type 'Setup' allows one instance, so cardinality is locked to one.",
      ),
    ).toBeTruthy();
    const cardinalitySelect = screen.getByLabelText(
      "workflow-editor-context-fact-cardinality",
    ) as HTMLSelectElement;
    expect(Array.from(cardinalitySelect.options).map((option) => option.value)).not.toContain(
      "many",
    );

    fireEvent.click(screen.getByRole("button", { name: /Value Semantics/ }));

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "work_unit_reference_fact",
          workUnitDefinitionId: "wut-setup",
          targetWorkUnitDefinitionId: "wut-setup",
          linkTypeDefinitionId: "depends_on",
        }),
      );
    });
  });

  it("shows dirty indicators and discard confirmation for edit-mode context facts", async () => {
    const { WorkflowContextFactDialog } = await import("../../features/workflow-editor/dialogs");
    const onOpenChange = vi.fn();
    const fact = {
      contextFactDefinitionId: "ctx-summary",
      key: "summary",
      label: "Summary",
      descriptionMarkdown: "Reusable summary for downstream steps.",
      kind: "plain_value_fact" as const,
      cardinality: "one" as const,
      guidance: {
        humanMarkdown: "Provide the concise project summary.",
        agentMarkdown: "Keep the summary concise and reusable.",
      },
      valueType: "string" as const,
      externalFactDefinitionId: "",
      allowedWorkflowDefinitionIds: [],
      artifactSlotDefinitionId: "",
      workUnitTypeKey: "",
      includedFactDefinitionIds: [],
      summary: "plain value fact · one · string",
    };

    renderRoute(
      <WorkflowContextFactDialog
        open
        mode="edit"
        fact={fact}
        methodologyFacts={[]}
        currentWorkUnitFacts={[]}
        artifactSlots={[]}
        workUnitTypes={[]}
        availableWorkflows={[]}
        workUnitFactsQueryScope="WU.SETUP"
        loadWorkUnitFacts={async () => []}
        loadWorkUnitArtifactSlots={async () => []}
        onOpenChange={onOpenChange}
        onSave={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Updated Summary" },
    });

    expect(screen.getByRole("button", { name: /Contract\s*\*/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("Discard unsaved changes?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("supports numeric bounds for plain context facts and blocks invalid ranges", async () => {
    const { WorkflowContextFactDialog } = await import("../../features/workflow-editor/dialogs");
    const onSave = vi.fn();

    renderRoute(
      <WorkflowContextFactDialog
        open
        mode="create"
        methodologyFacts={[]}
        currentWorkUnitFacts={[]}
        artifactSlots={[]}
        workUnitTypes={[]}
        availableWorkflows={[]}
        workUnitFactsQueryScope="WU.SETUP"
        loadWorkUnitFacts={async () => []}
        loadWorkUnitArtifactSlots={async () => []}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "estimation_score" },
    });
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Estimation Score" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Value Semantics" }));

    fireEvent.change(screen.getByLabelText("workflow-editor-context-fact-value-type"), {
      target: { value: "number" },
    });

    expect(screen.queryByLabelText("Default Value")).toBeNull();

    fireEvent.change(screen.getByLabelText("Minimum Value"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Maximum Value"), {
      target: { value: "2" },
    });

    expect(
      screen.getByText("Maximum value must be greater than or equal to minimum value."),
    ).toBeTruthy();
    expect((screen.getByRole("button", { name: "Create" }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    fireEvent.change(screen.getByLabelText("Maximum Value"), {
      target: { value: "20" },
    });
    expect(
      screen.queryByText("Maximum value must be greater than or equal to minimum value."),
    ).toBeNull();
    expect((screen.getByRole("button", { name: "Create" }) as HTMLButtonElement).disabled).toBe(
      false,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "estimation_score",
          type: "number",
          valueType: "number",
          validationJson: {
            kind: "json-schema",
            schemaDialect: "draft-2020-12",
            schema: {
              type: "number",
              minimum: 10,
              maximum: 20,
            },
          },
        }),
      );
    });
  });

  it("persists edited plain_fact number type and renders number + bounds badges", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    const editorDefinition = createEditorDefinition();
    const routeContext = createRouteContext(editorDefinition);
    useRouteContextMock.mockReturnValue(routeContext);

    updateContextFactMutationSpy.mockImplementationOnce(async (payload: unknown) => {
      const input = payload as {
        fact?: { type?: string; valueType?: string; validationJson?: unknown };
      };
      const current = editorDefinition.contextFacts.find(
        (entry) => entry.contextFactDefinitionId === "ctx-summary",
      );
      if (current && input.fact) {
        current.type = input.fact.type;
        current.valueType = input.fact.valueType;
        current.validationJson = input.fact.validationJson;
      }
      return { diagnostics: [] };
    });

    renderRoute(<MethodologyWorkflowEditorRoute />);

    const summaryFactItem = (await screen.findByText("Summary")).closest("li");
    if (!summaryFactItem) {
      throw new Error("Expected Summary context fact card to render.");
    }

    fireEvent.click(within(summaryFactItem).getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Value Semantics" }));

    fireEvent.change(screen.getByLabelText("workflow-editor-context-fact-value-type"), {
      target: { value: "number" },
    });
    fireEvent.change(screen.getByLabelText("Minimum Value"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Maximum Value"), {
      target: { value: "11" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const updateContextFactPayload = (
        updateContextFactMutationSpy.mock.calls as unknown[][]
      )[0]?.[0] as
        | { fact?: { type?: string; valueType?: string; validationJson?: unknown } }
        | undefined;
      expect(
        updateContextFactPayload?.fact?.valueType ?? updateContextFactPayload?.fact?.type,
      ).toBe("number");
      expect(updateContextFactPayload?.fact?.validationJson).toEqual(
        expect.objectContaining({
          kind: "json-schema",
          schema: expect.objectContaining({ type: "number", minimum: 1, maximum: 11 }),
        }),
      );
    });

    const updatedSummaryFactItem = (await screen.findByText("Summary")).closest("li");
    if (!updatedSummaryFactItem) {
      throw new Error("Expected updated Summary context fact card to render.");
    }

    expect(within(updatedSummaryFactItem).getByText("number")).toBeTruthy();
    expect(within(updatedSummaryFactItem).getByText("min:1")).toBeTruthy();
    expect(within(updatedSummaryFactItem).getByText("max:11")).toBeTruthy();
  });

  it("renders plain_fact validation badges for path and allowed-values", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    const editorDefinition = createEditorDefinition();
    editorDefinition.contextFacts.push(
      {
        contextFactDefinitionId: "ctx-path-fact",
        key: "repo_root",
        label: "Repo Root",
        kind: "plain_fact",
        cardinality: "one",
        type: "string",
        valueType: "string",
        validationJson: {
          kind: "path",
          pathKind: "directory",
          normalization: { mode: "posix", trimWhitespace: true },
          safety: { disallowAbsolute: true, preventTraversal: true },
        },
      },
      {
        contextFactDefinitionId: "ctx-allowed-fact",
        key: "delivery_mode",
        label: "Delivery Mode",
        kind: "plain_fact",
        cardinality: "one",
        type: "string",
        valueType: "string",
        validationJson: {
          kind: "allowed-values",
          values: ["fast", "safe"],
        },
      },
    );
    useRouteContextMock.mockReturnValue(createRouteContext(editorDefinition));

    renderRoute(<MethodologyWorkflowEditorRoute />);

    const repoRootRow = (await screen.findByText("Repo Root")).closest("li");
    if (!repoRootRow) {
      throw new Error("Expected Repo Root context fact card to render.");
    }
    expect(within(repoRootRow).getByText("path:directory")).toBeTruthy();

    const deliveryModeRow = (await screen.findByText("Delivery Mode")).closest("li");
    if (!deliveryModeRow) {
      throw new Error("Expected Delivery Mode context fact card to render.");
    }
    expect(within(deliveryModeRow).getByText("allowed:2")).toBeTruthy();
  });

  it("supports numeric bounds for JSON subfields and blocks invalid ranges", async () => {
    const { WorkflowContextFactDialog } = await import("../../features/workflow-editor/dialogs");
    const onSave = vi.fn();

    renderRoute(
      <WorkflowContextFactDialog
        open
        mode="create"
        methodologyFacts={[]}
        currentWorkUnitFacts={[]}
        artifactSlots={[]}
        workUnitTypes={[]}
        availableWorkflows={[]}
        workUnitFactsQueryScope="WU.SETUP"
        loadWorkUnitFacts={async () => []}
        loadWorkUnitArtifactSlots={async () => []}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "json_metrics" },
    });
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "JSON Metrics" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Value Semantics" }));

    fireEvent.change(screen.getByLabelText("workflow-editor-context-fact-value-type"), {
      target: { value: "json" },
    });

    const valueTypeSelects = screen.getAllByLabelText("Value Type");
    fireEvent.change(valueTypeSelects[1] as HTMLSelectElement, {
      target: { value: "number" },
    });

    const minimumInputs = screen.getAllByLabelText("Minimum Value");
    const maximumInputs = screen.getAllByLabelText("Maximum Value");
    fireEvent.change(minimumInputs[0] as HTMLInputElement, {
      target: { value: "5" },
    });
    fireEvent.change(maximumInputs[0] as HTMLInputElement, {
      target: { value: "1" },
    });

    expect((screen.getByRole("button", { name: "Create" }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    fireEvent.change(maximumInputs[0] as HTMLInputElement, {
      target: { value: "10" },
    });
    expect((screen.getByRole("button", { name: "Create" }) as HTMLButtonElement).disabled).toBe(
      false,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      const saved = onSave.mock.calls[0]?.[0] as
        | {
            validationJson?: {
              kind?: string;
              schema?: {
                properties?: Record<
                  string,
                  {
                    type?: string;
                    minimum?: number;
                    maximum?: number;
                    [key: string]: unknown;
                  }
                >;
              };
              subSchema?: {
                fields?: Array<{
                  key?: string;
                  type?: string;
                  cardinality?: string;
                  validation?: unknown;
                }>;
              };
            };
          }
        | undefined;

      expect(saved?.validationJson?.kind).toBe("json-schema");
      expect(saved?.validationJson?.subSchema?.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "field_1",
            type: "number",
            cardinality: "one",
          }),
        ]),
      );

      const fieldOne = saved?.validationJson?.subSchema?.fields?.find(
        (field) => field.key === "field_1",
      );
      expect(fieldOne).toBeTruthy();
      expect(fieldOne).not.toHaveProperty("validation");

      expect(saved?.validationJson?.schema?.properties?.field_1).toEqual(
        expect.objectContaining({
          type: "number",
          minimum: 5,
          maximum: 10,
        }),
      );
    });
  });

  it("preloads linked external fact selections when editing external context facts", async () => {
    const { WorkflowContextFactDialog } = await import("../../features/workflow-editor/dialogs");

    const methodologyFacts = [
      {
        value: "seed:fact-def:existing-documentation-inventory:mver_bmad_v1_draft",
        label: "Existing Documentation Inventory",
        secondaryLabel: "existing_documentation_inventory",
        description: "Methodology fact",
        valueType: "json" as const,
      },
    ];

    const definitionBackedFact = {
      contextFactDefinitionId: "ctx-methodology-docs",
      key: "method_existing_documentation_inventory",
      label: "Methodology Existing Documentation Inventory",
      descriptionMarkdown: "Reusable methodology documentation inventory.",
      kind: "bound_fact" as const,
      cardinality: "many" as const,
      guidance: {
        humanMarkdown: "Use the methodology inventory.",
        agentMarkdown: "Use the methodology inventory.",
      },
      valueType: "json" as const,
      factDefinitionId: "existing_documentation_inventory",
      allowedWorkflowDefinitionIds: [],
      slotDefinitionId: "",
      selectedWorkUnitFactDefinitionIds: [],
      selectedArtifactSlotDefinitionIds: [],
      includedFactDefinitionIds: [],
      summary:
        "definition backed external fact · many · seed:fact-def:existing-documentation-inventory:mver_bmad_v1_draft",
    };

    renderRoute(
      <WorkflowContextFactDialog
        open
        mode="edit"
        fact={definitionBackedFact}
        methodologyFacts={methodologyFacts}
        currentWorkUnitFacts={[]}
        artifactSlots={[]}
        workUnitTypes={[]}
        availableWorkflows={[]}
        workUnitFactsQueryScope="WU.SETUP"
        loadWorkUnitFacts={async () => []}
        loadWorkUnitArtifactSlots={async () => []}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Value Semantics/ }));
    expect(
      screen.getByRole("combobox", { name: "Bound Fact Definition Id" }).textContent,
    ).toContain("Existing Documentation Inventory");

    cleanup();

    renderRoute(
      <WorkflowContextFactDialog
        open
        mode="edit"
        fact={{ ...definitionBackedFact, kind: "bound_fact", key: "bound_existing_docs" }}
        methodologyFacts={methodologyFacts}
        currentWorkUnitFacts={[]}
        artifactSlots={[]}
        workUnitTypes={[]}
        availableWorkflows={[]}
        workUnitFactsQueryScope="WU.SETUP"
        loadWorkUnitFacts={async () => []}
        loadWorkUnitArtifactSlots={async () => []}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Value Semantics/ }));
    expect(
      screen.getByRole("combobox", { name: "Bound Fact Definition Id" }).textContent,
    ).toContain("Existing Documentation Inventory");
  });

  it("saves methodology external fact selections by definition id instead of key", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    const editorDefinition = createEditorDefinition();
    editorDefinition.contextFacts.push({
      contextFactDefinitionId: "ctx-methodology-docs",
      key: "bound_existing_docs",
      label: "Bound Methodology Existing Documentation Inventory",
      descriptionJson: { markdown: "Bound methodology documentation inventory." },
      kind: "bound_fact",
      cardinality: "many",
      factDefinitionId: "seed:fact-def:existing-documentation-inventory:mver_bmad_v1_draft",
      selectedWorkUnitFactDefinitionIds: [],
      selectedArtifactSlotDefinitionIds: [],
      includedFactDefinitionIds: [],
    });

    const routeContext = createRouteContext(editorDefinition);
    routeContext.orpc.methodology.version.fact.list.queryOptions = () => ({
      queryKey: ["methodology-facts", "v1", "external-id-regression"],
      queryFn: async (): Promise<MethodologyFactsListResult> => ({
        factDefinitions: [
          {
            id: "seed:fact-def:existing-documentation-inventory:mver_bmad_v1_draft",
            key: "existing_documentation_inventory",
            name: "Existing Documentation Inventory",
            valueType: "json",
            cardinality: "many",
          },
          {
            id: "seed:fact-def:communication-language:mver_bmad_v1_draft",
            key: "communication_language",
            name: "Communication Language",
            valueType: "string",
            cardinality: "one",
          },
        ],
      }),
    });

    useRouteContextMock.mockReturnValue(routeContext);

    renderRoute(<MethodologyWorkflowEditorRoute />);

    const externalFactItem = (
      await screen.findByText("Bound Methodology Existing Documentation Inventory")
    ).closest("li");
    if (!externalFactItem) {
      throw new Error("Expected external context fact row to render.");
    }

    fireEvent.click(within(externalFactItem).getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: /Value Semantics/ }));

    fireEvent.click(screen.getByRole("combobox", { name: "Bound Fact Definition Id" }));
    fireEvent.click(await screen.findByText("Communication Language"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const updatePayload = (updateContextFactMutationSpy.mock.calls as unknown[][]).at(-1)?.[0] as
        | { fact?: { factDefinitionId?: string } }
        | undefined;
      expect(updatePayload?.fact?.factDefinitionId).toBe(
        "seed:fact-def:communication-language:mver_bmad_v1_draft",
      );
    });
  });

  it("updates and deletes context facts by definition id when the key differs", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    const summaryFactItem = (await screen.findByText("Summary")).closest("li");
    if (!summaryFactItem) {
      throw new Error("Expected Summary context fact card to render.");
    }

    fireEvent.click(within(summaryFactItem).getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Updated Summary" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const updateContextFactPayload = (
        updateContextFactMutationSpy.mock.calls as unknown[][]
      )[0]?.[0];
      expect(updateContextFactPayload).toEqual(
        expect.objectContaining({
          contextFactDefinitionId: "ctx-summary",
          workflowDefinitionId: "wf-def-001",
          versionId: "v1",
        }),
      );
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[1]!);
    fireEvent.click(screen.getByRole("button", { name: "Delete Fact" }));

    await waitFor(() => {
      const deleteContextFactPayload = (
        deleteContextFactMutationSpy.mock.calls as unknown[][]
      )[0]?.[0];
      expect(deleteContextFactPayload).toEqual(
        expect.objectContaining({
          contextFactDefinitionId: "ctx-supporting-workflows",
          workflowDefinitionId: "wf-def-001",
          versionId: "v1",
        }),
      );
    });
  });

  it("uses the returned created id for immediate edit and delete actions", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    const editorDefinition = createEditorDefinition();
    useRouteContextMock.mockReturnValue(createRouteContext(editorDefinition));

    createContextFactMutationSpy.mockImplementationOnce(async () => {
      const created = {
        contextFactDefinitionId: "ctx-created",
        kind: "plain_value_fact",
        key: "architecture-summary",
        label: "Architecture Summary",
        cardinality: "one",
        valueType: "string",
      };
      editorDefinition.contextFacts.push(created);
      return created;
    });

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "+ Fact" }));
    fireEvent.change(screen.getByLabelText("Fact Key"), {
      target: { value: "architecture-summary" },
    });
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Architecture Summary" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    const contextFactsHeading = await screen.findByText("Context Fact Definitions");
    const contextFactsSection = contextFactsHeading.closest("section");
    if (!contextFactsSection) {
      throw new Error("Expected context facts section to render.");
    }

    const createdFactItem = await within(contextFactsSection).findByText("Architecture Summary");
    const createdFactRow = createdFactItem.closest("li");
    if (!createdFactRow) {
      throw new Error("Expected created context fact row to render.");
    }

    fireEvent.click(within(createdFactRow).getByRole("button", { name: "Edit" }));
    await screen.findByText("Edit Context Fact Definition: Architecture Summary");
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Architecture Summary Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const updatePayload = (updateContextFactMutationSpy.mock.calls as unknown[][])[0]?.[0];
      expect(updatePayload).toEqual(
        expect.objectContaining({
          contextFactDefinitionId: "ctx-created",
          workflowDefinitionId: "wf-def-001",
          versionId: "v1",
        }),
      );
    });

    fireEvent.click(within(createdFactRow).getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Fact" }));

    await waitFor(() => {
      const deletePayload = (deleteContextFactMutationSpy.mock.calls as unknown[][])[0]?.[0];
      expect(deletePayload).toEqual(
        expect.objectContaining({
          contextFactDefinitionId: "ctx-created",
          workflowDefinitionId: "wf-def-001",
          versionId: "v1",
        }),
      );
    });
  });

  it("preserves JSON sub-schema keys and string validation when editing plain JSON context facts", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    const editorDefinition = createEditorDefinition();
    editorDefinition.contextFacts.push({
      contextFactDefinitionId: "ctx-json-plain",
      key: "json_plain",
      label: "JSON Plain",
      descriptionJson: { markdown: "Nested json contract." },
      kind: "plain_value_fact",
      cardinality: "one",
      valueType: "json",
      validationJson: {
        kind: "json-schema",
        schemaDialect: "draft-2020-12",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            field_1: { type: "string" },
            field_2: { type: "number" },
            field_3: { type: "boolean" },
          },
        },
        subSchema: {
          type: "object",
          fields: [
            {
              key: "field_1",
              displayName: "Project Root",
              type: "string",
              cardinality: "one",
              validation: {
                kind: "path",
                pathKind: "directory",
                normalization: { mode: "posix", trimWhitespace: true },
                safety: { disallowAbsolute: true, preventTraversal: true },
              },
            },
            { key: "field_2", displayName: "Estimate", type: "number", cardinality: "one" },
            {
              key: "field_3",
              displayName: "Critical",
              type: "boolean",
              cardinality: "one",
            },
          ],
        },
      },
    });

    useRouteContextMock.mockReturnValue(createRouteContext(editorDefinition));

    renderRoute(<MethodologyWorkflowEditorRoute />);

    const contextFactsHeading = await screen.findByText("Context Fact Definitions");
    const contextFactsSection = contextFactsHeading.closest("section");
    if (!contextFactsSection) {
      throw new Error("Expected context facts section to render.");
    }

    const jsonFactItem = await within(contextFactsSection).findByText("JSON Plain");
    const jsonFactRow = jsonFactItem.closest("li");
    if (!jsonFactRow) {
      throw new Error("Expected JSON context fact row to render.");
    }

    fireEvent.click(within(jsonFactRow).getByRole("button", { name: "Edit" }));
    await screen.findByText("Edit Context Fact Definition: JSON Plain");
    fireEvent.click(screen.getByRole("button", { name: "Value Semantics" }));

    expect(screen.getAllByLabelText("Key Name")).toHaveLength(3);
    expect(screen.queryByLabelText("Default Value")).toBeNull();
    expect(screen.getByLabelText("String Validation")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const updatePayload = (updateContextFactMutationSpy.mock.calls as unknown[][])[0]?.[0] as
        | {
            fact?: {
              validationJson?: {
                kind?: string;
                schemaDialect?: string;
                schema?: {
                  properties?: Record<
                    string,
                    {
                      type?: string;
                      [key: string]: unknown;
                    }
                  >;
                };
                subSchema?: {
                  type?: string;
                  fields?: Array<{
                    key?: string;
                    type?: string;
                    cardinality?: string;
                    validation?: unknown;
                  }>;
                };
              };
            };
          }
        | undefined;

      expect(updatePayload?.fact?.validationJson?.kind).toBe("json-schema");
      expect(updatePayload?.fact?.validationJson?.schemaDialect).toBe("draft-2020-12");
      expect(updatePayload?.fact?.validationJson?.subSchema?.type).toBe("object");
      expect(updatePayload?.fact?.validationJson?.subSchema?.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: "field_1", type: "string", cardinality: "one" }),
          expect.objectContaining({ key: "field_2", type: "number", cardinality: "one" }),
          expect.objectContaining({ key: "field_3", type: "boolean", cardinality: "one" }),
        ]),
      );

      const fieldOne = updatePayload?.fact?.validationJson?.subSchema?.fields?.find(
        (field) => field.key === "field_1",
      );
      expect(fieldOne).toBeTruthy();
      expect(fieldOne).not.toHaveProperty("validation");

      expect(updatePayload?.fact?.validationJson?.schema?.properties?.field_1).toEqual(
        expect.objectContaining({
          type: "string",
          "x-validation": {
            kind: "path",
            pathKind: "directory",
            normalization: { mode: "posix", trimWhitespace: true },
            safety: { disallowAbsolute: true, preventTraversal: true },
          },
        }),
      );
    });
  });

  it("shows an error when the authoritative editor definition cannot resolve the workflow", async () => {
    useRouteContextMock.mockReturnValue(
      createRouteContext(null as ReturnType<typeof createEditorDefinition> | null),
    );

    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    expect(
      await screen.findByText("Unable to resolve workflow wf-def-001 for work unit WU.SETUP."),
    ).toBeTruthy();
  });
});
