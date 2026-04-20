import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { linkMock, useNavigateMock, useParamsMock, useRouteContextMock } = vi.hoisted(() => ({
  linkMock: vi.fn(({ children }: { children: ReactNode }) => <a>{children}</a>),
  useNavigateMock: vi.fn(),
  useParamsMock: vi.fn(),
  useRouteContextMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: useParamsMock,
    useRouteContext: useRouteContextMock,
    useNavigate: () => useNavigateMock,
  }),
  Link: (props: { children: ReactNode }) => linkMock(props),
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ title, children }: { title: string; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
  buttonVariants: () => "",
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardAction: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
}));

vi.mock("@/features/projects/execution-detail-visuals", () => ({
  DetailCode: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DetailEyebrow: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DetailLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DetailPrimary: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ExecutionBadge: ({ label }: { label: string }) => <span>{label}</span>,
  getExecutionStatusTone: () => "amber",
  getStepTypeTone: () => "amber",
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/components/runtime/runtime-fact-dialogs", async () => {
  const React = await import("react");

  const RuntimeFactValueDialog = ({
    open,
    title,
    submitLabel,
    editor,
    initialValue,
    onSubmit,
  }: {
    open: boolean;
    title: string;
    submitLabel: string;
    editor: { kind: string; [key: string]: any };
    initialValue?: unknown;
    onSubmit: (value: unknown) => Promise<void> | void;
  }) => {
    const [instanceId, setInstanceId] = React.useState("pf-1");
    const [value, setValue] = React.useState("P1");
    const [selection, setSelection] = React.useState("");
    const [relativePath, setRelativePath] = React.useState("stories/story.md");

    React.useEffect(() => {
      if (!open) return;
      setInstanceId(
        typeof initialValue === "object" && initialValue !== null && "instanceId" in initialValue
          ? String((initialValue as { instanceId: string }).instanceId)
          : "pf-1",
      );
      setValue(
        typeof initialValue === "object" && initialValue !== null && "value" in initialValue
          ? String((initialValue as { value: string }).value)
          : typeof initialValue === "string"
            ? initialValue
            : "P1",
      );
      setSelection(
        editor.options?.[0]?.value ??
          (
            initialValue as
              | { workflowDefinitionId?: string; artifactInstanceId?: string }
              | undefined
          )?.workflowDefinitionId ??
          (initialValue as { artifactInstanceId?: string } | undefined)?.artifactInstanceId ??
          "",
      );
    }, [editor, initialValue, open]);

    if (!open) {
      return null;
    }

    return (
      <div data-testid="workflow-context-dialog">
        <h3>{title}</h3>
        <p>{`editor:${editor.kind}`}</p>
        {editor.kind === "bound_fact" ? (
          <>
            <label>
              Instance ID
              <input value={instanceId} onChange={(event) => setInstanceId(event.target.value)} />
            </label>
            <label>
              Bound Value
              <input value={value} onChange={(event) => setValue(event.target.value)} />
            </label>
          </>
        ) : null}
        {editor.kind === "workflow_ref_fact" ||
        editor.kind === "artifact_slot_reference_fact" ||
        editor.kind === "artifact_slot_reference_fact" ? (
          <label>
            Selection
            <select value={selection} onChange={(event) => setSelection(event.target.value)}>
              {editor.options.map((option: { value: string; label: string }) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {editor.kind === "work_unit_draft_spec_fact" ? (
          <>
            {editor.fields.map((field: { label: string }) => (
              <p key={field.label}>{field.label}</p>
            ))}
            {editor.artifacts.map((artifact: { label: string }) => (
              <p key={artifact.label}>{artifact.label}</p>
            ))}
            <label>
              Relative path
              <input
                value={relativePath}
                onChange={(event) => setRelativePath(event.target.value)}
              />
            </label>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (editor.kind === "bound_fact") {
              void onSubmit({ instanceId, value });
              return;
            }

            if (editor.kind === "workflow_ref_fact") {
              void onSubmit({ workflowDefinitionId: selection });
              return;
            }

            if (
              editor.kind === "artifact_slot_reference_fact" ||
              editor.kind === "artifact_slot_reference_fact"
            ) {
              void onSubmit({
                slotDefinitionId: editor.slotDefinitionId,
                artifactInstanceId: selection,
              });
              return;
            }

            if (editor.kind === "work_unit_draft_spec_fact") {
              void onSubmit({
                workUnitDefinitionId: editor.workUnitDefinitionId,
                factValues: editor.fields.map((field: { workUnitFactDefinitionId: string }) => ({
                  workUnitFactDefinitionId: field.workUnitFactDefinitionId,
                  value: "Draft Story",
                })),
                artifactValues: editor.artifacts.map((artifact: { slotDefinitionId: string }) => ({
                  slotDefinitionId: artifact.slotDefinitionId,
                  relativePath,
                })),
              });
            }
          }}
        >
          {submitLabel}
        </button>
      </div>
    );
  };

  const RuntimeConfirmDialog = ({
    open,
    title,
    confirmLabel,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    confirmLabel: string;
    onConfirm: () => Promise<void> | void;
  }) =>
    open ? (
      <div>
        <h3>{title}</h3>
        <button type="button" onClick={() => void onConfirm()}>
          {confirmLabel}
        </button>
      </div>
    ) : null;

  return {
    RuntimeFactValueDialog,
    RuntimeConfirmDialog,
  };
});

import { WorkflowExecutionDetailRoute } from "../../routes/projects.$projectId.workflow-executions.$workflowExecutionId";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

type WorkflowContextCreateInput = {
  projectId: string;
  workflowExecutionId: string;
  contextFactDefinitionId: string;
  value: unknown;
};

type WorkflowContextUpdateInput = WorkflowContextCreateInput & {
  instanceId: string;
};

describe("workflow context fact CRUD section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hosts structured workflow-context CRUD dialogs on workflow execution detail", async () => {
    const createMutation = vi.fn(async (_input: WorkflowContextCreateInput) => ({
      affectedCount: 1,
    }));
    const updateMutation = vi.fn(async (_input: WorkflowContextUpdateInput) => ({
      affectedCount: 1,
    }));
    const queryClient = createQueryClient();

    useParamsMock.mockReturnValue({ projectId: "project-1", workflowExecutionId: "wfexec-1" });
    useRouteContextMock.mockReturnValue({
      queryClient,
      orpc: {
        project: {
          getRuntimeWorkflowExecutionDetail: {
            queryOptions: () => ({
              queryKey: ["runtime-workflow-execution-detail", "project-1", "wfexec-1"],
              queryFn: async () => ({
                workflowExecution: {
                  workflowExecutionId: "wfexec-1",
                  workflowId: "wf-1",
                  workflowKey: "WF.ONE",
                  workflowName: "Workflow One",
                  workflowRole: "primary",
                  status: "active",
                  startedAt: "2026-04-19T10:00:00.000Z",
                },
                workUnit: {
                  projectWorkUnitId: "wu-1",
                  workUnitTypeId: "story",
                  workUnitTypeKey: "story",
                  workUnitTypeName: "Story",
                  currentStateId: "draft",
                  currentStateKey: "draft",
                  currentStateLabel: "Draft",
                  target: { page: "work-unit-overview", projectWorkUnitId: "wu-1" },
                },
                parentTransition: {
                  transitionExecutionId: "te-1",
                  transitionId: "tr-1",
                  transitionKey: "TR.ONE",
                  transitionName: "Transition One",
                  status: "active",
                  target: { page: "transition-execution-detail", transitionExecutionId: "te-1" },
                },
                lineage: {},
                stepSurface: {
                  state: "entry_pending",
                  entryStep: { stepDefinitionId: "step-1", stepType: "form", stepKey: "capture" },
                },
                workflowContextFacts: {
                  mode: "read_only_by_definition",
                  groups: [
                    {
                      contextFactDefinitionId: "ctx-bound",
                      definitionKey: "boundPriority",
                      definitionLabel: "Bound Priority",
                      instances: [],
                    },
                    {
                      contextFactDefinitionId: "ctx-workflow-ref",
                      definitionKey: "supportingWorkflow",
                      definitionLabel: "Supporting Workflow",
                      instances: [
                        {
                          contextFactInstanceId: "ctx-workflow-ref-1",
                          instanceOrder: 0,
                          valueJson: { workflowDefinitionId: "wf-allowed" },
                        },
                      ],
                    },
                    {
                      contextFactDefinitionId: "ctx-artifact",
                      definitionKey: "artifactSnapshot",
                      definitionLabel: "Artifact Snapshot",
                      instances: [],
                    },
                    {
                      contextFactDefinitionId: "ctx-draft",
                      definitionKey: "storyDraft",
                      definitionLabel: "Story Draft",
                      instances: [],
                    },
                  ],
                },
              }),
            }),
          },
          getProjectDetails: {
            queryOptions: () => ({
              queryKey: ["project-details", "project-1"],
              queryFn: async () => ({
                pin: { methodologyId: "method-1", methodologyVersionId: "version-1" },
              }),
            }),
          },
          getRuntimeWorkUnits: {
            queryOptions: () => ({
              queryKey: ["runtime-work-units", "project-1"],
              queryFn: async () => ({
                rows: [
                  {
                    projectWorkUnitId: "wu-2",
                    displayIdentity: { primaryLabel: "Story #2", secondaryLabel: "story_2" },
                  },
                ],
              }),
            }),
          },
          getRuntimeArtifactSlotDetail: {
            queryOptions: () => ({
              queryKey: ["runtime-artifact-slot-detail", "project-1", "wu-1", "slot-story-doc"],
              queryFn: async () => ({
                slotDefinition: { slotDefinitionId: "slot-story-doc" },
                currentArtifactInstance: {
                  exists: true,
                  artifactInstanceId: "artifact-instance-current",
                  fileCount: 1,
                  files: [{ filePath: "stories/draft.md" }],
                },
              }),
            }),
          },
          retrySameWorkflowExecution: { mutationOptions: () => ({ mutationFn: vi.fn() }) },
          completeWorkflowExecution: { mutationOptions: () => ({ mutationFn: vi.fn() }) },
          activateWorkflowStepExecution: { mutationOptions: () => ({ mutationFn: vi.fn() }) },
          createRuntimeWorkflowContextFactValue: {
            mutationOptions: () => ({ mutationFn: createMutation }),
          },
          updateRuntimeWorkflowContextFactValue: {
            mutationOptions: () => ({ mutationFn: updateMutation }),
          },
          removeRuntimeWorkflowContextFactValue: {
            mutationOptions: () => ({ mutationFn: vi.fn() }),
          },
          deleteRuntimeWorkflowContextFactValue: {
            mutationOptions: () => ({ mutationFn: vi.fn() }),
          },
        },
        methodology: {
          version: {
            fact: {
              list: {
                queryOptions: () => ({
                  queryKey: ["methodology-facts", "version-1"],
                  queryFn: async () => ({
                    factDefinitions: [
                      {
                        id: "fact-priority",
                        key: "priority",
                        name: "Priority",
                        valueType: "string",
                        validationJson: { kind: "none" },
                      },
                    ],
                  }),
                }),
              },
            },
            workUnit: {
              list: {
                queryOptions: () => ({
                  queryKey: ["work-unit-types", "version-1"],
                  queryFn: async () => ({
                    workUnitTypes: [{ id: "story", key: "story", displayName: "Story" }],
                  }),
                }),
              },
              fact: {
                list: {
                  queryOptions: () => ({
                    queryKey: ["work-unit-facts", "version-1"],
                    queryFn: async () => ({
                      workUnitTypes: [
                        {
                          factSchemas: [
                            {
                              id: "wu-fact-title",
                              key: "title",
                              name: "Title",
                              factType: "string",
                              validationJson: { kind: "none" },
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
                    queryKey: ["artifact-slots", "version-1", "story"],
                    queryFn: async () => [
                      {
                        id: "slot-story-doc",
                        key: "story_doc",
                        displayName: "Story Doc",
                      },
                    ],
                  }),
                },
              },
              workflow: {
                list: {
                  queryOptions: () => ({
                    queryKey: ["workflows", "version-1", "story"],
                    queryFn: async () => [
                      {
                        id: "wf-allowed",
                        key: "WF.ALLOWED",
                        name: "Allowed Workflow",
                      },
                    ],
                  }),
                },
                getEditorDefinition: {
                  queryOptions: () => ({
                    queryKey: ["workflow-editor-definition", "wf-1"],
                    queryFn: async () => ({
                      contextFacts: [
                        {
                          kind: "bound_fact",
                          contextFactDefinitionId: "ctx-bound",
                          key: "boundPriority",
                          label: "Bound Priority",
                          cardinality: "one",
                          factDefinitionId: "fact-priority",
                        },
                        {
                          kind: "workflow_ref_fact",
                          contextFactDefinitionId: "ctx-workflow-ref",
                          key: "supportingWorkflow",
                          label: "Supporting Workflow",
                          cardinality: "one",
                          allowedWorkflowDefinitionIds: ["wf-allowed"],
                        },
                        {
                          kind: "artifact_slot_reference_fact",
                          contextFactDefinitionId: "ctx-artifact",
                          key: "artifactSnapshot",
                          label: "Artifact Snapshot",
                          cardinality: "one",
                          slotDefinitionId: "slot-story-doc",
                        },
                        {
                          kind: "work_unit_draft_spec_fact",
                          contextFactDefinitionId: "ctx-draft",
                          key: "storyDraft",
                          label: "Story Draft",
                          cardinality: "one",
                          workUnitDefinitionId: "story",
                          selectedWorkUnitFactDefinitionIds: ["wu-fact-title"],
                          selectedArtifactSlotDefinitionIds: ["slot-story-doc"],
                        },
                      ],
                    }),
                  }),
                },
              },
            },
          },
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <WorkflowExecutionDetailRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Workflow context manual CRUD")).toBeTruthy();

    const boundCard = screen.getByText("Bound Priority").closest("section");
    expect(boundCard).not.toBeNull();
    await userEvent.click(
      within(boundCard as HTMLElement).getByRole("button", { name: "Set value" }),
    );
    expect(screen.getByText("editor:bound_fact")).toBeTruthy();
    await userEvent.clear(screen.getByLabelText("Instance ID"));
    await userEvent.type(screen.getByLabelText("Instance ID"), "pf-priority-1");
    await userEvent.click(
      within(screen.getByTestId("workflow-context-dialog")).getByRole("button", {
        name: "Set value",
      }),
    );
    expect(createMutation).toHaveBeenCalledTimes(1);
    const firstCreateArg = createMutation.mock.calls[0]?.[0];
    expect(firstCreateArg).toEqual({
      projectId: "project-1",
      workflowExecutionId: "wfexec-1",
      contextFactDefinitionId: "ctx-bound",
      value: { instanceId: "pf-priority-1", value: "P1" },
    });

    const workflowCard = screen.getByText("Supporting Workflow").closest("section");
    expect(workflowCard).not.toBeNull();
    await userEvent.click(
      within(workflowCard as HTMLElement).getByRole("button", { name: "Replace value" }),
    );
    expect(screen.getByText("editor:workflow_ref_fact")).toBeTruthy();
    await userEvent.click(
      within(screen.getByTestId("workflow-context-dialog")).getByRole("button", {
        name: "Replace value",
      }),
    );
    expect(updateMutation).toHaveBeenCalledTimes(1);
    const firstUpdateArg = updateMutation.mock.calls[0]?.[0];
    expect(firstUpdateArg).toEqual({
      projectId: "project-1",
      workflowExecutionId: "wfexec-1",
      contextFactDefinitionId: "ctx-workflow-ref",
      instanceId: "ctx-workflow-ref-1",
      value: { workflowDefinitionId: "wf-allowed" },
    });

    const artifactCard = screen.getByText("Artifact Snapshot").closest("section");
    expect(artifactCard).not.toBeNull();
    await userEvent.click(
      within(artifactCard as HTMLElement).getByRole("button", { name: "Set value" }),
    );
    expect(screen.getByText("editor:artifact_slot_reference_fact")).toBeTruthy();
    await userEvent.click(
      within(screen.getByTestId("workflow-context-dialog")).getByRole("button", {
        name: "Set value",
      }),
    );
    expect(createMutation).toHaveBeenCalledTimes(2);
    const secondCreateArg = createMutation.mock.calls[1]?.[0];
    expect(secondCreateArg).toEqual({
      projectId: "project-1",
      workflowExecutionId: "wfexec-1",
      contextFactDefinitionId: "ctx-artifact",
      value: {
        slotDefinitionId: "slot-story-doc",
        artifactInstanceId: "artifact-instance-current",
      },
    });

    const draftCard = screen.getByText("Story Draft").closest("section");
    expect(draftCard).not.toBeNull();
    await userEvent.click(
      within(draftCard as HTMLElement).getByRole("button", { name: "Set value" }),
    );
    expect(screen.getByText("editor:work_unit_draft_spec_fact")).toBeTruthy();
    expect(screen.getByText("Title")).toBeTruthy();
    expect(screen.getByText("Story Doc")).toBeTruthy();
    await userEvent.click(
      within(screen.getByTestId("workflow-context-dialog")).getByRole("button", {
        name: "Set value",
      }),
    );
    expect(createMutation).toHaveBeenCalledTimes(3);
    const thirdCreateArg = createMutation.mock.calls[2]?.[0];
    expect(thirdCreateArg).toEqual({
      projectId: "project-1",
      workflowExecutionId: "wfexec-1",
      contextFactDefinitionId: "ctx-draft",
      value: {
        workUnitDefinitionId: "story",
        factValues: [{ workUnitFactDefinitionId: "wu-fact-title", value: "Draft Story" }],
        artifactValues: [{ slotDefinitionId: "slot-story-doc", relativePath: "stories/story.md" }],
      },
    });
  });
});
