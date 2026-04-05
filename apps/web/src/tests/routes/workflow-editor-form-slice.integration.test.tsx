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

const { fireEvent, render, screen, waitFor, within } = await import("@testing-library/react");

const {
  useParamsMock,
  useRouteContextMock,
  updateWorkflowMutationSpy,
  createFormStepMutationSpy,
  createContextFactMutationSpy,
} = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
  useRouteContextMock: vi.fn(),
  updateWorkflowMutationSpy: vi.fn(async () => ({ diagnostics: [] })),
  createFormStepMutationSpy: vi.fn(async () => ({ stepId: "step-new", diagnostics: [] })),
  createContextFactMutationSpy: vi.fn(async () => ({ diagnostics: [] })),
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
        stepId: "step-id-1",
        stepType: "form",
        payload: {
          key: "capture-context",
          label: "Capture Context",
          descriptionJson: { markdown: "Capture the reusable context." },
          fields: [
            {
              contextFactDefinitionId: "summary",
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
        contextFactDefinitionId: "summary",
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
        contextFactDefinitionId: "supporting-workflows",
        key: "supporting-workflows",
        label: "Supporting Workflows",
        descriptionJson: { markdown: "Workflow references for fan-out steps." },
        kind: "workflow_reference_fact",
        cardinality: "many",
        allowedWorkflowDefinitionIds: ["wf.review", "wf.dev"],
        guidanceJson: {
          human: { markdown: "Choose the reusable workflow references." },
          agent: { markdown: "Preserve the workflow ids as authored." },
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
              contextFactDefinitionId: "summary",
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
          workUnit: {
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
    useParamsMock.mockReset();
    useRouteContextMock.mockReset();
    updateWorkflowMutationSpy.mockClear();
    createFormStepMutationSpy.mockClear();
    createContextFactMutationSpy.mockClear();

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
    fireEvent.change(addBindingFactSelect, { target: { value: "supporting-workflows" } });
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
      const createFormCall = createFormStepMutationSpy.mock.calls.at(0);
      expect(createFormCall).toBeDefined();
      expect(createFormCall?.[0]).toEqual(
        expect.objectContaining({
          versionId: "v1",
          workUnitTypeKey: "WU.SETUP",
          workflowDefinitionId: "wf-def-001",
          payload: expect.objectContaining({
            key: "capture-brief",
            label: "Capture Brief",
            fields: expect.arrayContaining([
              expect.objectContaining({
                contextFactDefinitionId: "supporting-workflows",
                fieldLabel: "Supporting Workflows",
                fieldKey: "supportingWorkflows",
              }),
            ]),
            guidance: {
              humanMarkdown: "Ask for the supporting workflows to run.",
              agentMarkdown: "Treat the selection as reusable workflow references.",
            },
          }),
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "+ Fact" }));

    expect(await screen.findByRole("button", { name: "Value Semantics" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Contract" })).toBeTruthy();
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
      const createContextFactCall = createContextFactMutationSpy.mock.calls.at(0);
      expect(createContextFactCall).toBeDefined();
      expect(createContextFactCall?.[0]).toEqual(
        expect.objectContaining({
          versionId: "v1",
          workUnitTypeKey: "WU.SETUP",
          workflowDefinitionId: "wf-def-001",
          fact: expect.objectContaining({
            kind: "plain_value_fact",
            key: "architecture-summary",
            label: "Architecture Summary",
            cardinality: "one",
            valueType: "string",
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
      const updateWorkflowCall = updateWorkflowMutationSpy.mock.calls.at(0);
      expect(updateWorkflowCall).toBeDefined();
      expect(updateWorkflowCall?.[0]).toEqual(
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
