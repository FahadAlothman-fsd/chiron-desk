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

const { cleanup, fireEvent, render, screen, waitFor } = await import("@testing-library/react");

const {
  useParamsMock,
  useRouteContextMock,
  createInvokeStepMutationSpy,
  updateInvokeStepMutationSpy,
  deleteInvokeStepMutationSpy,
  createBranchStepMutationSpy,
  updateBranchStepMutationSpy,
  deleteBranchStepMutationSpy,
  reactFlowPropsSpy,
} = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
  useRouteContextMock: vi.fn(),
  createInvokeStepMutationSpy: vi.fn(async () => ({ stepId: "step-created-invoke" })),
  updateInvokeStepMutationSpy: vi.fn(async () => ({ diagnostics: [] })),
  deleteInvokeStepMutationSpy: vi.fn(async () => ({ diagnostics: [] })),
  createBranchStepMutationSpy: vi.fn(async () => ({ stepId: "step-created-branch" })),
  updateBranchStepMutationSpy: vi.fn(async () => ({ diagnostics: [] })),
  deleteBranchStepMutationSpy: vi.fn(async () => ({ diagnostics: [] })),
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
  CommandItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (
    <button type="button" onClick={onSelect}>
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
    return (
      <div>
        {props.edges?.map((edge: any) => (
          <button
            key={edge.id}
            type="button"
            onClick={() => props.onEdgeClick?.({}, edge)}
            aria-label={`canvas-edge-${edge.id}`}
          >
            {edge.id}
          </button>
        ))}
        {props.children}
      </div>
    );
  },
  useNodesState: (initialNodes: any[]) => {
    const [nodes, setNodes] = React.useState(initialNodes);
    return [nodes, setNodes, vi.fn()] as const;
  },
}));

vi.mock("../../features/workflow-editor/workflow-canvas", () => ({
  WorkflowCanvas: ({ edges, onSelectEdge, onFocusBranchStep }: any) => (
    <div>
      <div>Workflow Canvas</div>
      {edges.map((edge: any) => (
        <button
          key={edge.edgeId}
          type="button"
          aria-label={`Mock Canvas Edge ${edge.edgeId}`}
          data-owner={edge.edgeOwner ?? "generic"}
          onClick={() =>
            edge.branchStepId ? onFocusBranchStep(edge.branchStepId) : onSelectEdge(edge.edgeId)
          }
        >
          {edge.fromStepKey} → {edge.toStepKey}
        </button>
      ))}
    </div>
  ),
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
          descriptionJson: { markdown: "Capture the reusable workflow context." },
          fields: [
            {
              contextFactDefinitionId: "ctx-summary",
              fieldLabel: "Summary",
              fieldKey: "summary",
              helpText: null,
              required: true,
            },
          ],
          guidance: {
            human: { markdown: "Capture the context." },
            agent: { markdown: "Normalize context for downstream steps." },
          },
        },
      },
      {
        stepId: "step-invoke-1",
        stepType: "invoke",
        payload: {
          key: "invoke-story-work",
          label: "Invoke Story Work",
          descriptionJson: { markdown: "Invoke the child story workflow." },
          guidance: {
            human: { markdown: "Review the invoked work before activation." },
            agent: { markdown: "Preserve only the bound workflow facts." },
          },
          targetKind: "work_unit",
          sourceMode: "fixed_set",
          workUnitDefinitionId: "wut-story",
          bindings: [
            {
              destination: {
                kind: "work_unit_fact",
                workUnitFactDefinitionId: "wuf-story-title",
              },
              source: {
                kind: "context_fact",
                contextFactDefinitionId: "ctx-summary",
              },
            },
          ],
          activationTransitions: [
            {
              transitionId: "transition-ready",
              workflowDefinitionIds: ["wf-implementation"],
            },
          ],
        },
      },
      {
        stepId: "step-branch-1",
        stepType: "branch",
        payload: {
          key: "branch-on-summary",
          label: "Branch on Summary",
          descriptionJson: { markdown: "Route based on the workflow summary." },
          guidance: {
            human: { markdown: "Review the selected branch path." },
            agent: { markdown: "Use the summary fact to determine the next step." },
          },
          defaultTargetStepId: "step-invoke-1",
          routes: [
            {
              routeId: "route-summary-match",
              targetStepId: "step-form-1",
              conditionMode: "all",
              groups: [
                {
                  groupId: "group-summary",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "condition-summary",
                      contextFactDefinitionId: "ctx-summary",
                      subFieldKey: null,
                      operator: "equals",
                      isNegated: false,
                      comparisonJson: { value: "ship it" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
    edges: [
      {
        edgeId: "edge-1",
        fromStepKey: "capture-context",
        toStepKey: "branch-on-summary",
        edgeOwner: "normal",
      },
      {
        edgeId: "edge-branch-default",
        fromStepKey: "branch-on-summary",
        toStepKey: "invoke-story-work",
        edgeOwner: "branch_default",
        isDefault: true,
        descriptionJson: {
          edgeOwner: "branch_default",
          branchStepId: "step-branch-1",
        },
      },
      {
        edgeId: "edge-branch-conditional",
        fromStepKey: "branch-on-summary",
        toStepKey: "capture-context",
        edgeOwner: "branch_conditional",
        routeId: "route-summary-match",
        descriptionJson: {
          edgeOwner: "branch_conditional",
          branchStepId: "step-branch-1",
          routeId: "route-summary-match",
        },
      },
    ],
    contextFacts: [
      {
        contextFactDefinitionId: "ctx-summary",
        key: "summary",
        label: "Summary",
        descriptionJson: { markdown: "Reusable workflow summary." },
        kind: "plain_value_fact",
        cardinality: "one",
        valueType: "string",
        guidanceJson: {
          human: { markdown: "Provide a summary." },
          agent: { markdown: "Keep the summary concise." },
        },
      },
      {
        contextFactDefinitionId: "ctx-workflow-targets",
        key: "workflow_targets",
        label: "Workflow Targets",
        descriptionJson: { markdown: "Workflow reference fan-out targets." },
        kind: "workflow_reference_fact",
        cardinality: "many",
        allowedWorkflowDefinitionIds: ["wf-review", "wf-implementation"],
      },
      {
        contextFactDefinitionId: "ctx-story-draft",
        key: "story_draft",
        label: "Story Draft",
        descriptionJson: { markdown: "Work unit draft spec for child story creation." },
        kind: "work_unit_draft_spec_fact",
        cardinality: "one",
        workUnitDefinitionId: "wut-story",
        selectedWorkUnitFactDefinitionIds: ["wuf-story-title"],
        selectedArtifactSlotDefinitionIds: [],
      },
      {
        contextFactDefinitionId: "ctx-current-story",
        key: "current_story",
        label: "Current Story",
        descriptionJson: { markdown: "Definition-backed external work unit reference." },
        kind: "definition_backed_external_fact",
        cardinality: "one",
        externalFactDefinitionId: "ext-current-story",
        workUnitDefinitionId: "wut-story",
      },
      {
        contextFactDefinitionId: "ctx-bound-external-json",
        key: "bound_external_json",
        label: "Bound External JSON",
        descriptionJson: { markdown: "Bound external JSON fact with subfields." },
        kind: "bound_external_fact",
        cardinality: "one",
        externalFactDefinitionId: "ext-bound-json",
      },
    ],
    formDefinitions: [],
    agentStepDefinitions: [],
  };
}

function createRouteContext(editorDefinition = createEditorDefinition()) {
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
                queryFn: async () => ({
                  factDefinitions: [
                    {
                      id: "ext-bound-json",
                      key: "existing_documentation_inventory",
                      name: "Existing Documentation Inventory",
                      factType: "json",
                      cardinality: "many",
                      validation: {
                        kind: "json-schema",
                        schema: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            projectRoot: {
                              type: "string",
                              title: "projectRoot",
                              cardinality: "one",
                              "x-validation": {
                                kind: "path",
                                pathKind: "directory",
                                normalization: { mode: "posix", trimWhitespace: true },
                                safety: { disallowAbsolute: true, preventTraversal: true },
                              },
                            },
                            status: {
                              type: "string",
                              title: "status",
                              cardinality: "one",
                              "x-validation": {
                                kind: "allowed-values",
                                values: ["draft", "ready"],
                              },
                            },
                            estimatedHours: {
                              type: "number",
                              title: "estimatedHours",
                              cardinality: "one",
                            },
                            isCritical: {
                              type: "boolean",
                              title: "isCritical",
                              cardinality: "one",
                            },
                          },
                        },
                      },
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
                      id: "wut-story",
                      key: "story",
                      displayName: "Story",
                      lifecycleStates: [
                        { key: "draft", displayName: "Draft" },
                        { key: "ready", displayName: "Ready" },
                      ],
                      factSchemas: [
                        {
                          id: "wuf-story-title",
                          key: "story_title",
                          name: "Story Title",
                          factType: "string",
                          cardinality: "one",
                        },
                        {
                          id: "ext-current-story",
                          key: "current_story_ref",
                          name: "Current Story Ref",
                          factType: "work_unit",
                          cardinality: "one",
                        },
                      ],
                    },
                    {
                      id: "wut-epic",
                      key: "epic",
                      displayName: "Epic",
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
                  queryFn: async () => ({
                    workUnitTypes: [
                      {
                        id: "wut-story",
                        key: "story",
                        factSchemas: [
                          {
                            id: "wuf-story-title",
                            key: "story_title",
                            name: "Story Title",
                            factType: "string",
                            cardinality: "one",
                          },
                          {
                            id: "ext-current-story",
                            key: "current_story_ref",
                            name: "Current Story Ref",
                            factType: "work_unit",
                            cardinality: "one",
                          },
                        ],
                      },
                    ],
                  }),
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
                    queryFn: async () => [
                      {
                        transitionId: "transition-ready",
                        transitionKey: "ready_to_active",
                        transitionName: "Ready to Active",
                      },
                      {
                        transitionId: "transition-review",
                        transitionKey: "review_to_done",
                        transitionName: "Review to Done",
                      },
                    ],
                  }),
                },
                binding: {
                  list: {
                    queryOptions: ({ input }: { input: { transitionKey?: string } }) => ({
                      queryKey: [
                        "transition-bindings",
                        "v1",
                        "WU.SETUP",
                        input.transitionKey ?? "",
                      ],
                      queryFn: async () =>
                        input.transitionKey === "ready_to_active" ? ["wf-implementation"] : [],
                    }),
                  },
                },
              },
            },
            workflow: {
              list: {
                queryOptions: () => ({
                  queryKey: ["workflows", "v1", "WU.SETUP"],
                  queryFn: async () => ({
                    workflows: [
                      {
                        workflowDefinitionId: "wf-review",
                        displayName: "Review Child Workflow",
                        descriptionJson: { markdown: "Review child workflow." },
                      },
                      {
                        workflowDefinitionId: "wf-implementation",
                        displayName: "Implementation Child Workflow",
                        descriptionJson: { markdown: "Implementation child workflow." },
                      },
                    ],
                  }),
                }),
              },
              getEditorDefinition: {
                queryOptions: () => ({
                  queryKey: ["workflow-editor", "v1", "WU.SETUP", "wf-def-001"],
                  queryFn: async () => editorDefinition,
                }),
              },
              createInvokeStep: {
                mutationOptions: () => ({ mutationFn: createInvokeStepMutationSpy }),
              },
              updateInvokeStep: {
                mutationOptions: () => ({ mutationFn: updateInvokeStepMutationSpy }),
              },
              deleteInvokeStep: {
                mutationOptions: () => ({ mutationFn: deleteInvokeStepMutationSpy }),
              },
              createBranchStep: {
                mutationOptions: () => ({ mutationFn: createBranchStepMutationSpy }),
              },
              updateBranchStep: {
                mutationOptions: () => ({ mutationFn: updateBranchStepMutationSpy }),
              },
              deleteBranchStep: {
                mutationOptions: () => ({ mutationFn: deleteBranchStepMutationSpy }),
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

describe("workflow editor invoke route", () => {
  beforeEach(() => {
    cleanup();
    useParamsMock.mockReset();
    useRouteContextMock.mockReset();
    createInvokeStepMutationSpy.mockClear();
    updateInvokeStepMutationSpy.mockClear();
    deleteInvokeStepMutationSpy.mockClear();
    createBranchStepMutationSpy.mockClear();
    updateBranchStepMutationSpy.mockClear();
    deleteBranchStepMutationSpy.mockClear();
    reactFlowPropsSpy.mockClear();

    useParamsMock.mockReturnValue({
      methodologyId: "m1",
      versionId: "v1",
      workUnitKey: "WU.SETUP",
      workflowDefinitionId: "wf-def-001",
    });
    useRouteContextMock.mockReturnValue(createRouteContext());
  });

  it("invoke route creates workflow-target invokes from the unlocked grid", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    const invokeTile = await screen.findByRole("button", { name: /Invoke step type 33/i });
    expect((invokeTile as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(invokeTile);

    expect(await screen.findByText("Create Invoke Step")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Contract" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Target" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bindings" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guidance" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Step Key"), {
      target: { value: "invoke-review-work" },
    });
    fireEvent.change(screen.getByLabelText("Step Title"), {
      target: { value: "Invoke Review Work" },
    });
    expect((screen.getByRole("button", { name: /Bindings/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    fireEvent.click(screen.getByRole("button", { name: "Target" }));

    fireEvent.click(screen.getByRole("button", { name: /Review Child Workflow/i }));
    fireEvent.click(screen.getByRole("button", { name: /Implementation Child Workflow/i }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createInvokeStepMutationSpy).toHaveBeenCalledTimes(1);
    });

    expect((createInvokeStepMutationSpy.mock.calls as unknown[][])[0]?.[0]).toEqual(
      expect.objectContaining({
        versionId: "v1",
        workUnitTypeKey: "WU.SETUP",
        workflowDefinitionId: "wf-def-001",
        payload: expect.objectContaining({
          key: "invoke-review-work",
          label: "Invoke Review Work",
          targetKind: "workflow",
          sourceMode: "fixed_set",
          workflowDefinitionIds: ["wf-review", "wf-implementation"],
        }),
      }),
    );
  });

  it("invoke dialog shows work-unit bindings and transitions for work-unit targets", async () => {
    const { InvokeStepDialog } = await import("../../features/workflow-editor/dialogs");
    const onSave = vi.fn();

    renderRoute(
      <InvokeStepDialog
        open
        mode="create"
        availableWorkflows={[
          {
            value: "wf-review",
            label: "Review Child Workflow",
            description: "Review child workflow.",
          },
          {
            value: "wf-implementation",
            label: "Implementation Child Workflow",
            description: "Implementation child workflow.",
          },
        ]}
        availableWorkUnits={[
          { value: "wut-story", label: "Story", description: "Story" },
          { value: "wut-epic", label: "Epic", description: "Epic" },
        ]}
        availableTransitions={[]}
        availableContextFacts={[
          {
            contextFactDefinitionId: "ctx-summary",
            key: "summary",
            label: "Summary",
            descriptionMarkdown: "Reusable summary.",
            kind: "plain_value_fact",
            cardinality: "one",
            guidance: { humanMarkdown: "", agentMarkdown: "" },
            allowedWorkflowDefinitionIds: [],
            includedFactDefinitionIds: [],
            selectedWorkUnitFactDefinitionIds: [],
            selectedArtifactSlotDefinitionIds: [],
            summary: "plain value fact · one · string",
            valueType: "string",
          },
          {
            contextFactDefinitionId: "ctx-story-draft",
            key: "story_draft",
            label: "Story Draft",
            descriptionMarkdown: "Story draft spec.",
            kind: "work_unit_draft_spec_fact",
            cardinality: "one",
            guidance: { humanMarkdown: "", agentMarkdown: "" },
            allowedWorkflowDefinitionIds: [],
            includedFactDefinitionIds: ["wuf-story-title"],
            selectedWorkUnitFactDefinitionIds: ["wuf-story-title"],
            selectedArtifactSlotDefinitionIds: [],
            summary: "work unit draft spec fact · one · story",
            workUnitDefinitionId: "wut-story",
            workUnitTypeKey: "wut-story",
          },
        ]}
        workUnitFactsQueryScope="v1"
        loadWorkUnitFacts={async () => [
          {
            id: "wuf-story-title",
            key: "story_title",
            label: "Story Title",
            factType: "string",
            cardinality: "one",
            validationJson: { kind: "none" },
          },
        ]}
        loadWorkUnitArtifactSlots={async () => []}
        loadWorkUnitTransitions={async () => [
          {
            value: "transition-ready",
            label: "Ready to Active",
            secondaryLabel: "ready_to_active",
            description: "ready_to_active",
          },
        ]}
        loadWorkUnitWorkflows={async () => [
          {
            value: "wf-review",
            label: "Review Child Workflow",
            secondaryLabel: "wf_review",
            description: "Review child workflow.",
          },
          {
            value: "wf-implementation",
            label: "Implementation Child Workflow",
            secondaryLabel: "wf_implementation",
            description: "Implementation child workflow.",
          },
        ]}
        loadTransitionBoundWorkflowKeys={async (_workUnitDefinitionId, transitionId) =>
          transitionId === "transition-ready" ? ["wf_implementation"] : []
        }
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Step Key"), { target: { value: "invoke-story" } });
    fireEvent.click(screen.getByRole("button", { name: "Target" }));
    fireEvent.change(screen.getByLabelText("workflow-editor-invoke-target-kind"), {
      target: { value: "work_unit" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Story/i }));

    fireEvent.click(screen.getByRole("button", { name: /Bindings/i }));

    expect(screen.getByText("Work Unit Bindings")).toBeTruthy();
    expect(screen.getByText("Activation Transitions")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Add Binding/i }));
    fireEvent.click(await screen.findByText("Story Title"));
    fireEvent.change(screen.getByLabelText("Source Type"), {
      target: { value: "context_fact" },
    });
    fireEvent.click((await screen.findAllByText("Summary")).at(-1)!);

    fireEvent.click(screen.getByRole("button", { name: /Add Binding/i }));
    fireEvent.click((await screen.findAllByRole("combobox", { name: "Destination" })).at(-1)!);
    expect(await screen.findByText("Already bound in another binding")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" }).at(-1)!);

    fireEvent.click(screen.getByRole("button", { name: /Add Transition/i }));
    fireEvent.click(screen.getByRole("button", { name: /Ready to Active/i }));
    fireEvent.click(screen.getByRole("combobox", { name: /Workflows/i }));
    expect(await screen.findByText("Implementation Child Workflow")).toBeTruthy();
    expect(screen.queryByText("Review Child Workflow")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Implementation Child Workflow/i }));

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "invoke-story",
          targetKind: "work_unit",
          sourceMode: "fixed_set",
          workUnitDefinitionId: "wut-story",
          bindings: [
            expect.objectContaining({
              destination: {
                kind: "work_unit_fact",
                workUnitFactDefinitionId: "wuf-story-title",
              },
              source: {
                kind: "context_fact",
                contextFactDefinitionId: "ctx-summary",
              },
            }),
          ],
          activationTransitions: [
            expect.objectContaining({
              transitionId: "transition-ready",
              workflowDefinitionIds: ["wf-implementation"],
            }),
          ],
        }),
      );
    });
  });

  it("invoke route edits existing invoke steps", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /Inspect Step invoke-story-work/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit invoke step" }));

    fireEvent.change(screen.getByLabelText("Step Title"), {
      target: { value: "Invoke Story Work Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Guidance/i }));
    fireEvent.change(screen.getByLabelText("Human Guidance"), {
      target: { value: "Review the updated invoke path." },
    });

    fireEvent.click(screen.getByRole("button", { name: /Bindings/i }));
    if (screen.queryByText(/Complete invoke binding 2 before saving/i)) {
      fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[1]!);
    }
    const workflowsCombobox = screen.getByRole("combobox", { name: /Workflows/i });
    if (workflowsCombobox.textContent?.includes("Select workflows")) {
      fireEvent.click(workflowsCombobox);
      fireEvent.click((await screen.findAllByText("Implementation Child Workflow")).at(-1)!);
    }
    fireEvent.click(screen.getByRole("button", { name: /Guidance/i }));

    await waitFor(() => {
      expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(
        false,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateInvokeStepMutationSpy).toHaveBeenCalledTimes(1);
    });

    expect((updateInvokeStepMutationSpy.mock.calls as unknown[][])[0]?.[0]).toEqual(
      expect.objectContaining({
        stepId: "step-invoke-1",
        payload: expect.objectContaining({
          label: "Invoke Story Work Updated",
          targetKind: "work_unit",
          sourceMode: "fixed_set",
          workUnitDefinitionId: "wut-story",
          bindings: [
            expect.objectContaining({
              destination: expect.objectContaining({
                kind: "work_unit_fact",
                workUnitFactDefinitionId: "wuf-story-title",
              }),
              source: expect.objectContaining({
                kind: "context_fact",
                contextFactDefinitionId: "ctx-summary",
              }),
            }),
          ],
          activationTransitions: [
            expect.objectContaining({
              transitionId: "transition-ready",
              workflowDefinitionIds: ["wf-implementation"],
            }),
          ],
          guidance: {
            human: { markdown: "Review the updated invoke path." },
            agent: { markdown: "Preserve only the bound workflow facts." },
          },
        }),
      }),
    );
  });

  it("invoke route requires confirmation before deleting invoke steps", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /Inspect Step invoke-story-work/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit invoke step" }));

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    expect(await screen.findByText("Delete invoke step?")).toBeTruthy();
    expect(deleteInvokeStepMutationSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" }).at(-1)!);
    expect(screen.queryByText("Delete invoke step?")).toBeNull();
    expect(deleteInvokeStepMutationSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: "Delete Invoke Step" }));

    await waitFor(() => {
      expect(deleteInvokeStepMutationSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("invoke dialog blocks invalid invoke states and preserves dirty cancel behavior", async () => {
    const { InvokeStepDialog } = await import("../../features/workflow-editor/dialogs");
    const onOpenChange = vi.fn();
    const onSave = vi.fn();

    renderRoute(
      <InvokeStepDialog
        open
        mode="create"
        availableWorkflows={[]}
        availableWorkUnits={[{ value: "wut-story", label: "Story", description: "Story" }]}
        availableTransitions={[]}
        availableContextFacts={[]}
        workUnitFactsQueryScope="v1"
        loadWorkUnitFacts={async () => []}
        loadWorkUnitArtifactSlots={async () => []}
        onOpenChange={onOpenChange}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Step Key"), { target: { value: "invoke-story" } });
    fireEvent.click(screen.getByRole("button", { name: "Target" }));
    fireEvent.change(screen.getByLabelText("workflow-editor-invoke-target-kind"), {
      target: { value: "work_unit" },
    });

    expect(screen.getByText("Select a work unit for work-unit-target invoke.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Create" }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("Discard unsaved changes?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("branch route creates branch steps from the unlocked grid", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    const branchTile = await screen.findByRole("button", { name: /Branch step type 61/i });
    expect((branchTile as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(branchTile);

    expect(await screen.findByText("Create Branch Step")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Contract" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Routes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guidance" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Step Key"), {
      target: { value: "branch-on-review" },
    });
    fireEvent.change(screen.getByLabelText("Step Title"), {
      target: { value: "Branch On Review" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Default Target Step" }));
    fireEvent.click(screen.getByRole("button", { name: /Invoke Story Work/i }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createBranchStepMutationSpy).toHaveBeenCalledTimes(1);
    });

    expect((createBranchStepMutationSpy.mock.calls as unknown[][])[0]?.[0]).toEqual(
      expect.objectContaining({
        versionId: "v1",
        workUnitTypeKey: "WU.SETUP",
        workflowDefinitionId: "wf-def-001",
        payload: expect.objectContaining({
          key: "branch-on-review",
          label: "Branch On Review",
          defaultTargetStepId: "step-invoke-1",
          routes: [],
        }),
      }),
    );
  });

  it("branch stacked route dialog saves routes, groups, and conditions", async () => {
    const { BranchStepDialog } = await import("../../features/workflow-editor/dialogs");
    const onSave = vi.fn();

    renderRoute(
      <BranchStepDialog
        open
        mode="create"
        availableSteps={[
          { value: "step-form-1", label: "Capture Context", secondaryLabel: "capture-context" },
          {
            value: "step-invoke-1",
            label: "Invoke Story Work",
            secondaryLabel: "invoke-story-work",
          },
        ]}
        availableContextFacts={[
          {
            contextFactDefinitionId: "ctx-summary",
            key: "summary",
            label: "Summary",
            descriptionMarkdown: "Reusable summary.",
            kind: "plain_value_fact",
            cardinality: "one",
            guidance: { humanMarkdown: "", agentMarkdown: "" },
            allowedWorkflowDefinitionIds: [],
            includedFactDefinitionIds: [],
            selectedWorkUnitFactDefinitionIds: [],
            selectedArtifactSlotDefinitionIds: [],
            summary: "plain value fact · one · string",
            valueType: "string",
          },
        ]}
        conditionOperators={[
          {
            key: "equals",
            label: "Equals",
            requiresComparison: true,
            supportsOperand: (operand) => operand.operandType === "string",
            validateComparison: (comparison: unknown) =>
              typeof comparison === "object" && comparison !== null && "value" in comparison,
          },
          {
            key: "isEmpty",
            label: "Is Empty",
            requiresComparison: false,
            supportsOperand: () => true,
            validateComparison: () => true,
          },
        ]}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Step Key"), { target: { value: "branch-on-summary" } });
    fireEvent.click(screen.getByRole("button", { name: "Routes" }));
    fireEvent.click(screen.getByRole("button", { name: /Add Route/i }));

    expect(await screen.findByRole("heading", { name: "Add Route" })).toBeTruthy();

    fireEvent.click(screen.getByRole("combobox", { name: "Target Step" }));
    fireEvent.click(screen.getByRole("button", { name: /Invoke Story Work/i }));
    fireEvent.click(screen.getByRole("combobox", { name: "Context Fact" }));
    fireEvent.click(screen.getByRole("button", { name: /Summary/i }));
    fireEvent.change(screen.getByLabelText("Operator"), {
      target: { value: "equals" },
    });
    fireEvent.change(screen.getByLabelText("Comparison Value"), {
      target: { value: "ship it" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Route" }));

    expect(await screen.findByText("Invoke Story Work")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "branch-on-summary",
          routes: [
            expect.objectContaining({
              targetStepId: "step-invoke-1",
              groups: [
                expect.objectContaining({
                  conditions: [
                    expect.objectContaining({
                      contextFactDefinitionId: "ctx-summary",
                      subFieldKey: null,
                      operator: "equals",
                      comparisonJson: { value: "ship it" },
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      );
    });
  });

  it("branch stacked route dialog uses a select for allowed-values JSON subfield comparisons", async () => {
    const { RouteDialog } = await import("../../features/workflow-editor/dialogs");
    const onSave = vi.fn();

    renderRoute(
      <RouteDialog
        open
        ownerStepId="step-branch-1"
        route={{
          routeId: "route-product-brief",
          targetStepId: "",
          conditionMode: "all",
          groups: [
            {
              groupId: "group-product-brief",
              mode: "all",
              conditions: [
                {
                  conditionId: "condition-product-brief",
                  contextFactDefinitionId: "",
                  subFieldKey: null,
                  operator: "exists",
                  isNegated: false,
                  comparisonJson: null,
                },
              ],
            },
          ],
        }}
        availableSteps={[
          { value: "step-form-1", label: "Capture Context", secondaryLabel: "capture-context" },
        ]}
        availableContextFacts={[
          {
            contextFactDefinitionId: "ctx-product-brief",
            key: "requires_product_brief",
            label: "Requires Product Brief",
            descriptionMarkdown: "Reusable JSON fact.",
            kind: "plain_value_fact",
            cardinality: "one",
            guidance: { humanMarkdown: "", agentMarkdown: "" },
            allowedWorkflowDefinitionIds: [],
            includedFactDefinitionIds: [],
            selectedWorkUnitFactDefinitionIds: [],
            selectedArtifactSlotDefinitionIds: [],
            summary: "plain value fact · one · json",
            valueType: "json",
            validationJson: {
              kind: "json-schema",
              subSchema: {
                type: "object",
                fields: [
                  {
                    key: "status",
                    type: "string",
                    cardinality: "one",
                    validation: {
                      kind: "allowed-values",
                      values: ["draft", "ready"],
                    },
                  },
                ],
              },
            },
          },
        ]}
        conditionOperators={[
          {
            key: "exists",
            label: "Exists",
            requiresComparison: false,
            supportsOperand: () => true,
            validateComparison: () => true,
          },
          {
            key: "equals",
            label: "Equals",
            requiresComparison: true,
            supportsOperand: (operand) => operand.operandType === "string",
            validateComparison: (comparison: unknown) =>
              typeof comparison === "object" && comparison !== null && "value" in comparison,
          },
        ]}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Target Step" }));
    fireEvent.click(screen.getByRole("button", { name: /Capture Context/i }));
    fireEvent.click(screen.getByRole("combobox", { name: "Context Fact" }));
    fireEvent.click(screen.getByRole("button", { name: /Requires Product Brief/i }));
    await waitFor(() => {
      expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(4);
    });

    fireEvent.change(screen.getAllByRole("combobox")[2]!, {
      target: { value: "status" },
    });
    fireEvent.change(screen.getAllByRole("combobox")[3]!, {
      target: { value: "equals" },
    });

    expect(screen.queryByLabelText("Comparison Value")).toBeNull();
    expect(screen.getByRole("option", { name: "draft" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "ready" })).toBeTruthy();
    expect(
      screen.getByText(/Comparison options come from the allowed values defined for this field\./i),
    ).toBeTruthy();

    const comparisonSelect = screen.getAllByRole("combobox").at(-1);
    expect(comparisonSelect).toBeTruthy();
    fireEvent.change(comparisonSelect!, { target: { value: "ready" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Route" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        targetStepId: "step-form-1",
        groups: [
          expect.objectContaining({
            conditions: [
              expect.objectContaining({
                contextFactDefinitionId: "ctx-product-brief",
                subFieldKey: "status",
                operator: "equals",
                comparisonJson: { value: "ready" },
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("branch route derives current_state comparison options from the referenced work unit type", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /Branch step type 61/i }));
    expect(await screen.findByText("Create Branch Step")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Step Key"), {
      target: { value: "branch-on-current-story-state" },
    });
    fireEvent.change(screen.getByLabelText("Step Title"), {
      target: { value: "Branch On Current Story State" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Default Target Step" }));
    fireEvent.click(screen.getByRole("button", { name: /Invoke Story Work/i }));

    fireEvent.click(screen.getByRole("button", { name: "Routes" }));
    fireEvent.click(screen.getByRole("button", { name: /Add Route/i }));

    expect(await screen.findByRole("heading", { name: "Add Route" })).toBeTruthy();

    fireEvent.click(screen.getByRole("combobox", { name: "Target Step" }));
    fireEvent.click(screen.getByRole("button", { name: /Capture Context/i }));
    fireEvent.click(screen.getByRole("combobox", { name: "Context Fact" }));
    fireEvent.click(screen.getByRole("button", { name: /Current Story/i }));

    fireEvent.change(screen.getByLabelText("Operator"), {
      target: { value: "current_state" },
    });

    expect(screen.queryByLabelText("Comparison Value")).toBeNull();
    expect(screen.getByRole("option", { name: "Activation" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Draft" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Ready" })).toBeTruthy();
    expect(
      screen.getByText(
        /Comparison options come from the lifecycle states defined on the referenced work unit type, plus Activation for the pre-state before first activation\./i,
      ),
    ).toBeTruthy();

    const comparisonSelect = screen.getAllByRole("combobox").at(-1);
    expect(comparisonSelect).toBeTruthy();
    fireEvent.change(comparisonSelect!, { target: { value: "ready" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Route" }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createBranchStepMutationSpy).toHaveBeenCalledTimes(1);
    });

    expect((createBranchStepMutationSpy.mock.calls as unknown[][])[0]?.[0]).toEqual(
      expect.objectContaining({
        versionId: "v1",
        workUnitTypeKey: "WU.SETUP",
        workflowDefinitionId: "wf-def-001",
        payload: expect.objectContaining({
          key: "branch-on-current-story-state",
          routes: expect.arrayContaining([
            expect.objectContaining({
              groups: expect.arrayContaining([
                expect.objectContaining({
                  conditions: expect.arrayContaining([
                    expect.objectContaining({
                      contextFactDefinitionId: "ctx-current-story",
                      operator: "current_state",
                      comparisonJson: { value: "ready" },
                    }),
                  ]),
                }),
              ]),
            }),
          ]),
        }),
      }),
    );
  });

  it("branch route infers draft-spec target labels and operators from the selected target metadata", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /Branch step type 61/i }));
    expect(await screen.findByText("Create Branch Step")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Step Key"), {
      target: { value: "branch-on-story-draft" },
    });
    fireEvent.change(screen.getByLabelText("Step Title"), {
      target: { value: "Branch On Story Draft" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Default Target Step" }));
    fireEvent.click(screen.getByRole("button", { name: /Invoke Story Work/i }));

    fireEvent.click(screen.getByRole("button", { name: "Routes" }));
    fireEvent.click(screen.getByRole("button", { name: /Add Route/i }));

    expect(await screen.findByRole("heading", { name: "Add Route" })).toBeTruthy();

    fireEvent.click(screen.getByRole("combobox", { name: "Target Step" }));
    fireEvent.click(screen.getByRole("button", { name: /Capture Context/i }));
    fireEvent.click(screen.getByRole("combobox", { name: "Context Fact" }));
    fireEvent.click(screen.getByRole("button", { name: /Story Draft/i }));

    expect(screen.getAllByText(/Targeting Work Unit Instance/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("option", { name: /^Current State$/i })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /^Fresh$/i })).toBeNull();
    expect(screen.queryByRole("option", { name: /^Equals$/i })).toBeNull();

    fireEvent.change(screen.getByLabelText("Draft-spec Sub-field"), {
      target: { value: "fact:wuf-story-title" },
    });

    expect(screen.getAllByText(/Targeting String Fact Instance/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("option", { name: /^Equals$/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: /^Contains$/i })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /^Current State$/i })).toBeNull();
  });

  it("branch route targets external JSON subfields with the same operators as plain JSON facts", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /Branch step type 61/i }));
    expect(await screen.findByText("Create Branch Step")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Step Key"), {
      target: { value: "branch-on-bound-external-json" },
    });
    fireEvent.change(screen.getByLabelText("Step Title"), {
      target: { value: "Branch On Bound External JSON" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Default Target Step" }));
    fireEvent.click(screen.getByRole("button", { name: /Invoke Story Work/i }));

    fireEvent.click(screen.getByRole("button", { name: "Routes" }));
    fireEvent.click(screen.getByRole("button", { name: /Add Route/i }));

    expect(await screen.findByRole("heading", { name: "Add Route" })).toBeTruthy();

    fireEvent.click(screen.getByRole("combobox", { name: "Target Step" }));
    fireEvent.click(screen.getByRole("button", { name: /Capture Context/i }));
    fireEvent.click(screen.getByRole("combobox", { name: "Context Fact" }));
    fireEvent.click(screen.getByRole("button", { name: /Bound External JSON/i }));

    expect(screen.getByLabelText("JSON Sub-field")).toBeTruthy();

    fireEvent.change(screen.getAllByRole("combobox")[2]!, {
      target: { value: "projectRoot" },
    });
    expect(screen.getByRole("option", { name: /^Exists$/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: /^Exists In Repo$/i })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /^Contains$/i })).toBeNull();

    fireEvent.change(screen.getAllByRole("combobox")[2]!, {
      target: { value: "status" },
    });
    fireEvent.change(screen.getAllByRole("combobox")[3]!, {
      target: { value: "equals" },
    });
    expect(screen.queryByLabelText("Comparison Value")).toBeNull();
    expect(screen.getByRole("option", { name: "draft" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "ready" })).toBeTruthy();

    fireEvent.change(screen.getAllByRole("combobox")[2]!, {
      target: { value: "estimatedHours" },
    });
    expect(screen.getByRole("option", { name: /^Greater Than$/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: /^Between$/i })).toBeTruthy();

    fireEvent.change(screen.getAllByRole("combobox")[2]!, {
      target: { value: "isCritical" },
    });
    expect(screen.getByRole("option", { name: /^Equals$/i })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /^Contains$/i })).toBeNull();
  });

  it("branch canvas renders projected edges differently and focuses the owner on click", async () => {
    const actualModule = await vi.importActual<
      typeof import("../../features/workflow-editor/workflow-canvas")
    >("../../features/workflow-editor/workflow-canvas");
    const onFocusBranchStep = vi.fn();
    const onSelectEdge = vi.fn();

    renderRoute(
      <actualModule.WorkflowCanvas
        entryStepId={null}
        steps={[
          {
            stepId: "step-branch-1",
            stepType: "branch",
            payload: {
              key: "branch-on-summary",
              defaultTargetStepId: "step-invoke-1",
              routes: [],
              guidance: { human: { markdown: "" }, agent: { markdown: "" } },
            },
          } as any,
          {
            stepId: "step-invoke-1",
            stepType: "invoke",
            payload: {
              key: "invoke-story-work",
              targetKind: "workflow",
              sourceMode: "fixed_set",
              workflowDefinitionIds: [],
            },
          } as any,
        ]}
        edges={[
          {
            edgeId: "edge-branch-conditional",
            fromStepKey: "branch-on-summary",
            toStepKey: "invoke-story-work",
            descriptionMarkdown: "",
            edgeOwner: "branch_conditional",
            branchStepId: "step-branch-1",
          },
        ]}
        selection={null}
        errorMessage={null}
        onSelectStep={vi.fn()}
        onSelectEdge={onSelectEdge}
        onFocusBranchStep={onFocusBranchStep}
        onConnect={vi.fn()}
      />,
    );

    const canvasProps = (reactFlowPropsSpy.mock.calls.at(-1) as any[])?.[0];
    const projectedEdge = canvasProps.edges[0];
    expect(projectedEdge.animated).toBe(true);
    expect(projectedEdge.style.strokeDasharray).toBe("7 5");
    expect(projectedEdge.label).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "canvas-edge-edge-branch-conditional" }));
    expect(onFocusBranchStep).toHaveBeenCalledWith("step-branch-1");
    expect(onSelectEdge).not.toHaveBeenCalled();
  });

  it("branch-owned edges focus the branch step from canvas and list inspector", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Mock Canvas Edge edge-branch-conditional/i }),
    );
    expect(await screen.findByText(/BRANCH STEP INSPECTOR/i)).toBeTruthy();
    expect(screen.getByText(/Branch routing/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back to step list" }));
    const branchEdgeButton = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes("branch-on-summary → capture-context"));
    expect(branchEdgeButton).toBeTruthy();
    fireEvent.click(branchEdgeButton!);

    expect(await screen.findByText(/Branch routing/i)).toBeTruthy();
    expect(screen.getByText(/Default target: Invoke Story Work/i)).toBeTruthy();
  });

  it("compat keeps branch-edge interactions working when editor definitions include top-level ownership metadata", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    const branchEdgeButton = await screen.findByRole("button", {
      name: /Mock Canvas Edge edge-branch-conditional/i,
    });
    expect(branchEdgeButton.getAttribute("data-owner")).toBe("branch_conditional");

    fireEvent.click(branchEdgeButton);
    expect(await screen.findByText(/Branch routing/i)).toBeTruthy();
  });

  it("plain JSON subfields are selectable and expose string-path operators", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    const editorDefinition = createEditorDefinition();
    editorDefinition.contextFacts = [
      ...editorDefinition.contextFacts,
      {
        contextFactDefinitionId: "ctx-json-plain",
        key: "json_plain",
        label: "json-plain",
        descriptionJson: { markdown: "Nested JSON contract." },
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
              project_root: { type: "string" },
              estimate_hours: { type: "number" },
            },
          },
          subSchema: {
            type: "object",
            fields: [
              {
                key: "project_root",
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
              {
                key: "estimate_hours",
                displayName: "Estimate Hours",
                type: "number",
                cardinality: "one",
              },
            ],
          },
        },
      },
    ];

    useRouteContextMock.mockReturnValue(createRouteContext(editorDefinition));

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /Inspect Step branch-on-summary/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit branch step" }));
    fireEvent.click(screen.getByRole("button", { name: "Routes" }));
    fireEvent.click(screen.getByRole("button", { name: /Edit Route/i }));

    fireEvent.click(screen.getByRole("combobox", { name: "Context Fact" }));
    fireEvent.click(screen.getByRole("button", { name: /json-plain/i }));

    fireEvent.click(screen.getByRole("combobox", { name: /sub-field/i }));
    expect(screen.getByRole("option", { name: /^Project Root$/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: /^Estimate Hours$/i })).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: /sub-field/i }), {
      target: { value: "project_root" },
    });

    fireEvent.click(
      screen.getByRole("combobox", {
        name: /workflow-editor-branch-condition-operator-/i,
      }),
    );
    expect(screen.getByRole("option", { name: /^Exists$/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: /^Exists In Repo$/i })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /^Contains$/i })).toBeNull();

    fireEvent.change(
      screen.getByRole("combobox", {
        name: /workflow-editor-branch-condition-operator-/i,
      }),
      {
        target: { value: "exists_in_repo" },
      },
    );

    expect(screen.getByText(/Paths are treated as repo-relative/i)).toBeTruthy();
  });

  it("artifact reference branch conditions do not offer equals", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    const editorDefinition = createEditorDefinition();
    editorDefinition.contextFacts = [
      ...editorDefinition.contextFacts,
      {
        contextFactDefinitionId: "ctx-project-overview",
        key: "project_overview",
        label: "Project Overview Artifact",
        descriptionJson: { markdown: "Seeded project overview artifact." },
        kind: "artifact_reference_fact",
        cardinality: "one",
        artifactSlotDefinitionId: "PROJECT_OVERVIEW",
      },
    ];

    useRouteContextMock.mockReturnValue(createRouteContext(editorDefinition));

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /Inspect Step branch-on-summary/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit branch step" }));
    fireEvent.click(screen.getByRole("button", { name: "Routes" }));
    fireEvent.click(screen.getByRole("button", { name: /Edit Route/i }));

    fireEvent.click(screen.getByRole("combobox", { name: "Context Fact" }));
    fireEvent.click(screen.getByRole("button", { name: /Project Overview Artifact/i }));
    fireEvent.click(
      screen.getByRole("combobox", {
        name: /workflow-editor-branch-condition-operator-/i,
      }),
    );

    expect(screen.getByRole("option", { name: /^Exists$/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: /^Fresh$/i })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /^Equals$/i })).toBeNull();
  });
});
