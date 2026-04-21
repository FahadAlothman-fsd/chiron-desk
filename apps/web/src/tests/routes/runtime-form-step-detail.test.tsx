import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  ...(() => {
    const __routerMocks = {
      useRouteContextMock: vi.fn(),
      useParamsMock: vi.fn(),
      useNavigateMock: vi.fn(),
    };

    return {
      __routerMocks,
      createFileRoute: () => (options: Record<string, unknown>) => ({
        ...options,
        useRouteContext: __routerMocks.useRouteContextMock,
        useParams: __routerMocks.useParamsMock,
        useNavigate: () => __routerMocks.useNavigateMock,
      }),
      Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
    };
  })(),
}));

import { __routerMocks } from "@tanstack/react-router";

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
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/field", () => ({
  Field: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  FieldGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.ComponentProps<"textarea">) => <textarea {...props} />,
}));

import {
  RuntimeFormStepDetailRoute,
  runtimeStepExecutionDetailQueryKey,
} from "../../routes/projects.$projectId.step-executions.$stepExecutionId";

function buildDetail(): any {
  const detail: any = {
    shell: {
      stepExecutionId: "step-1",
      workflowExecutionId: "workflow-1",
      stepDefinitionId: "def-form-1",
      stepType: "form" as const,
      status: "active" as const,
      activatedAt: "2026-04-01T12:00:00.000Z",
      completedAt: undefined,
      completionAction: {
        kind: "complete_step_execution" as const,
        visible: true,
        enabled: true,
      },
    },
    body: {
      stepType: "form" as const,
      page: {
        formKey: "collect-context",
        formLabel: "Collect context",
        descriptionMarkdown: "Capture the setup facts that drive runtime execution.",
        projectRootPath: "/tmp/workspace/chiron",
        fields: [
          {
            fieldKey: "initiativeName",
            fieldLabel: "Initiative name",
            helpText: "Reusable project summary anchor.",
            required: true,
            contextFactDefinitionId: "ctx-initiative-name",
            contextFactKey: "initiative_name",
            contextFactKind: "plain_value_fact" as const,
            widget: {
              control: "text" as const,
              valueType: "string" as const,
              cardinality: "one" as const,
              renderedMultiplicity: "one" as const,
            },
          },
          {
            fieldKey: "workflowMode",
            fieldLabel: "Workflow mode",
            helpText: "Definition-backed external fact using allowed values.",
            required: true,
            contextFactDefinitionId: "ctx-workflow-mode",
            contextFactKey: "workflow_mode",
            contextFactKind: "bound_fact" as const,
            widget: {
              control: "select" as const,
              valueType: "string" as const,
              cardinality: "one" as const,
              renderedMultiplicity: "one" as const,
              externalBindingKey: "workflow_mode",
              options: [
                { value: "initial_scan", label: "initial_scan" },
                { value: "full_rescan", label: "full_rescan" },
                { value: "deep_dive", label: "deep_dive" },
              ],
            },
          },
          {
            fieldKey: "requiresBrainstorming",
            fieldLabel: "Requires brainstorming",
            helpText: "Boolean runtime widget.",
            required: false,
            contextFactDefinitionId: "ctx-requires-brainstorming",
            contextFactKey: "requires_brainstorming",
            contextFactKind: "plain_value_fact" as const,
            widget: {
              control: "checkbox" as const,
              valueType: "boolean" as const,
              cardinality: "one" as const,
              renderedMultiplicity: "one" as const,
            },
          },
          {
            fieldKey: "existingRepositoryType",
            fieldLabel: "Existing repository type",
            helpText: "Bound external fact selector.",
            required: false,
            contextFactDefinitionId: "ctx-repository-type",
            contextFactKey: "repository_type",
            contextFactKind: "bound_fact" as const,
            widget: {
              control: "reference" as const,
              valueType: "string" as const,
              cardinality: "one" as const,
              renderedMultiplicity: "one" as const,
              externalBindingKey: "repository_type",
              bindingLabel: "Repository Type",
              options: [
                {
                  value: { factInstanceId: "fact-1" },
                  label: "monorepo",
                  description: "Repository type",
                },
                {
                  value: { factInstanceId: "fact-2" },
                  label: "multi_part",
                  description: "Repository type",
                },
              ],
            },
          },
          {
            fieldKey: "existingProjectParts",
            fieldLabel: "Existing project parts",
            helpText: "Repeated bound external fact selector.",
            required: false,
            contextFactDefinitionId: "ctx-project-parts",
            contextFactKey: "project_parts",
            contextFactKind: "bound_fact" as const,
            widget: {
              control: "reference" as const,
              valueType: "json" as const,
              cardinality: "many" as const,
              renderedMultiplicity: "many" as const,
              externalBindingKey: "project_parts",
              bindingLabel: "Project Parts",
              options: [
                {
                  value: { factInstanceId: "fact-part-1" },
                  label: "apps/web",
                  description: "Project parts",
                },
                {
                  value: { factInstanceId: "fact-part-2" },
                  label: "packages/api",
                  description: "Project parts",
                },
              ],
            },
          },
          {
            fieldKey: "referenceWorkflow",
            fieldLabel: "Reference workflow",
            helpText: "Workflow reference selector.",
            required: false,
            contextFactDefinitionId: "ctx-reference-workflow",
            contextFactKey: "reference_workflow",
            contextFactKind: "workflow_ref_fact" as const,
            widget: {
              control: "workflow-reference" as const,
              valueType: "json" as const,
              cardinality: "one" as const,
              renderedMultiplicity: "one" as const,
              options: [{ value: "wf-setup", label: "Setup workflow" }],
            },
          },
          {
            fieldKey: "referenceArtifact",
            fieldLabel: "Reference artifact",
            helpText: "Artifact reference path widget.",
            required: false,
            contextFactDefinitionId: "ctx-reference-artifact",
            contextFactKey: "reference_artifact",
            contextFactKind: "artifact_slot_reference_fact" as const,
            widget: {
              control: "artifact-reference" as const,
              valueType: "json" as const,
              cardinality: "one" as const,
              renderedMultiplicity: "one" as const,
              artifactSlotDefinitionId: "setup_readme",
              bindingLabel: "Setup Readme",
            },
          },
          {
            fieldKey: "draftSpecTarget",
            fieldLabel: "Draft spec target",
            helpText: "Work-unit draft-spec nested editor.",
            required: false,
            contextFactDefinitionId: "ctx-draft-spec-target",
            contextFactKey: "draft_spec_target",
            contextFactKind: "work_unit_draft_spec_fact" as const,
            widget: {
              control: "draft-spec" as const,
              valueType: "json" as const,
              cardinality: "one" as const,
              renderedMultiplicity: "one" as const,
              bindingLabel: "Setup",
              nestedFields: [
                {
                  key: "constraints",
                  label: "Constraints",
                  factType: "json" as const,
                  cardinality: "one" as const,
                  required: false,
                  validation: {
                    kind: "json-schema" as const,
                    schema: {
                      type: "object" as const,
                      properties: {
                        must_have: {
                          type: "string" as const,
                          cardinality: "one" as const,
                          title: "Must Have",
                        },
                        must_avoid: {
                          type: "string" as const,
                          cardinality: "one" as const,
                          title: "Must Avoid",
                        },
                        timebox_notes: {
                          type: "string" as const,
                          cardinality: "one" as const,
                          title: "Timebox Notes",
                        },
                      },
                    },
                  },
                },
                {
                  key: "setupWorkUnit",
                  label: "Setup work unit",
                  factType: "work_unit" as const,
                  cardinality: "one" as const,
                  required: false,
                  options: [
                    {
                      value: { projectWorkUnitId: "wu-setup-1" },
                      label: "Setup:wu-setup",
                    },
                  ],
                  emptyState: "No Setup work units are available yet.",
                  workUnitTypeKey: "setup",
                },
              ],
            },
            lineage: {
              previousStepExecutionId: undefined,
              nextStepExecutionId: undefined,
            },
          },
        ],
      },
      draft: {
        payloadMode: "latest_only" as const,
        payload: {
          initiativeName: "Draft initiative",
          workflowMode: "initial_scan",
          requiresBrainstorming: true,
          existingRepositoryType: { factInstanceId: "fact-1" },
          existingProjectParts: [{ factInstanceId: "fact-part-1" }],
          referenceWorkflow: { workflowDefinitionId: "wf-setup" },
          referenceArtifact: { relativePath: "docs/setup.md" },
          draftSpecTarget: {
            constraints: {
              must_have: "be concise",
              must_avoid: "scope creep",
              timebox_notes: "30 minutes max",
            },
            setupWorkUnit: { projectWorkUnitId: "wu-2" },
          },
        } as Record<string, unknown>,
        lastSavedAt: "2026-04-01T12:03:00.000Z",
      },
      saveDraftAction: {
        kind: "save_form_step_draft" as const,
        enabled: true,
      },
      submission: {
        payloadMode: "latest_only" as const,
        payload: {
          initiativeName: "Submitted initiative",
          workflowMode: "full_rescan",
        } as Record<string, unknown>,
        submittedAt: "2026-04-01T12:04:00.000Z",
      },
      submitAction: {
        kind: "submit_form_step" as const,
        enabled: true,
      },
      lineage: {
        previousStepExecutionId: undefined,
        nextStepExecutionId: undefined,
      },
    },
  };

  return detail;
}

function toFieldPayload(detail: any, values: Record<string, unknown>) {
  if (detail.body.stepType !== "form") {
    return values;
  }

  return Object.fromEntries(
    detail.body.page.fields.map((field: any) => [field.fieldKey, values[field.fieldKey]]),
  );
}

async function renderHarness(params?: { currentDetail?: any }) {
  let currentDetail: any = params?.currentDetail ?? buildDetail();
  const saveDraftCalls: Array<Record<string, unknown>> = [];
  const submitCalls: Array<Record<string, unknown>> = [];
  const completeCalls: Array<Record<string, unknown>> = [];
  let saveCounter = 0;
  let submitCounter = 0;

  const getRuntimeStepExecutionDetailQueryOptionsMock = vi.fn(
    (_input: { input: { projectId: string; stepExecutionId: string } }) => ({
      queryKey: ["runtime-step-execution-detail", "project-1", "step-1"],
      queryFn: async () => currentDetail,
    }),
  );

  const getAgentStepExecutionDetailQueryOptionsMock = vi.fn(
    (_input: { input: { projectId: string; stepExecutionId: string } }) => ({
      queryKey: ["runtime-agent-step-execution-detail", "project-1", "step-1"],
      queryFn: async () => ({
        shell: currentDetail.shell,
        body: {
          stepType: "agent" as const,
          prompt: null,
          transcript: [],
        },
      }),
    }),
  );

  const saveFormStepDraftMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        saveCounter += 1;
        saveDraftCalls.push(input);
        const nextBody: any =
          currentDetail.body.stepType === "form"
            ? {
                ...currentDetail.body,
                draft: {
                  ...currentDetail.body.draft,
                  payload: toFieldPayload(currentDetail, input.values),
                  lastSavedAt: `2026-04-01T12:0${saveCounter + 4}:00.000Z`,
                },
              }
            : currentDetail.body;
        currentDetail = {
          ...currentDetail,
          body: nextBody,
        } as any;
        await options?.onSuccess?.();
        return { stepExecutionId: "step-1", status: "draft_saved" as const };
      },
    }),
  );

  const submitFormStepMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        submitCounter += 1;
        submitCalls.push(input);
        const nextBody: any =
          currentDetail.body.stepType === "form"
            ? {
                ...currentDetail.body,
                draft: {
                  ...currentDetail.body.draft,
                  payload: toFieldPayload(currentDetail, input.values),
                  lastSavedAt: `2026-04-01T12:1${submitCounter}:00.000Z`,
                },
                submission: {
                  ...currentDetail.body.submission,
                  payload: toFieldPayload(currentDetail, input.values),
                  submittedAt: `2026-04-01T12:2${submitCounter}:00.000Z`,
                },
              }
            : currentDetail.body;
        currentDetail = {
          ...currentDetail,
          body: nextBody,
        } as any;
        await options?.onSuccess?.();
        return { stepExecutionId: "step-1", status: "captured" as const };
      },
    }),
  );

  const completeStepExecutionMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        completeCalls.push(input);
        const nextShell: any = {
          ...currentDetail.shell,
          status: "completed",
          completedAt: "2026-04-01T12:30:00.000Z",
          completionAction: {
            kind: "complete_step_execution",
            visible: false,
            enabled: false,
          },
        };
        currentDetail = {
          ...currentDetail,
          shell: nextShell,
        } as any;
        await options?.onSuccess?.();
        return { stepExecutionId: "step-1", status: "completed" as const };
      },
    }),
  );
  const activateWorkflowStepExecutionCalls: Array<Record<string, unknown>> = [];
  const activateWorkflowStepExecutionMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: (result: { stepExecutionId: string }) => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        activateWorkflowStepExecutionCalls.push(input);
        const result = { stepExecutionId: "step-2" };
        await options?.onSuccess?.(result);
        return result;
      },
    }),
  );

  const orpc = {
    project: {
      getAgentStepExecutionDetail: {
        queryOptions: getAgentStepExecutionDetailQueryOptionsMock,
      },
      getRuntimeStepExecutionDetail: {
        queryOptions: getRuntimeStepExecutionDetailQueryOptionsMock,
      },
      saveFormStepDraft: {
        mutationOptions: saveFormStepDraftMutationOptionsMock,
      },
      submitFormStep: {
        mutationOptions: submitFormStepMutationOptionsMock,
      },
      completeStepExecution: {
        mutationOptions: completeStepExecutionMutationOptionsMock,
      },
      activateWorkflowStepExecution: {
        mutationOptions: activateWorkflowStepExecutionMutationOptionsMock,
      },
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  __routerMocks.useParamsMock.mockReturnValue({
    projectId: "project-1",
    stepExecutionId: "step-1",
  });
  __routerMocks.useNavigateMock.mockResolvedValue(undefined);
  __routerMocks.useRouteContextMock.mockReturnValue({ orpc, queryClient });

  await queryClient.prefetchQuery({
    ...orpc.project.getRuntimeStepExecutionDetail.queryOptions({
      input: { projectId: "project-1", stepExecutionId: "step-1" },
    }),
    queryKey: runtimeStepExecutionDetailQueryKey("project-1", "step-1"),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RuntimeFormStepDetailRoute />
    </QueryClientProvider>,
  );

  return {
    queryClient,
    saveDraftCalls,
    submitCalls,
    completeCalls,
    activateWorkflowStepExecutionCalls,
    getRuntimeStepExecutionDetailQueryOptionsMock,
  };
}

describe("runtime form step detail route", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders the shared header shell plus resolved form widgets and actions", async () => {
    await renderHarness();

    expect(screen.getByText("Step execution detail")).toBeTruthy();
    expect(screen.getByText("Step execution identity & status")).toBeTruthy();
    expect(screen.getByText("Collect context")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Complete Step" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit" })).toBeTruthy();

    expect(screen.getByText("Last draft save")).toBeTruthy();
    expect(screen.getByText("Last submit")).toBeTruthy();
    expect(screen.getByText("Initiative name")).toBeTruthy();
    expect(screen.getByText("Workflow mode")).toBeTruthy();
    expect(screen.getByText("Existing repository type")).toBeTruthy();
    expect(screen.getByText("Existing project parts")).toBeTruthy();
    expect(screen.getByText("Reference workflow")).toBeTruthy();
    expect(screen.getByText("Reference artifact")).toBeTruthy();
    expect(screen.getByText("Draft spec target")).toBeTruthy();
    expect(screen.getByText("Repository Type")).toBeTruthy();
    expect(screen.getAllByText("Project Parts").length).toBeGreaterThan(0);
    expect(screen.getByText("Setup Readme")).toBeTruthy();
    expect(screen.getByText("Setup")).toBeTruthy();
    expect(screen.getAllByText("required").length).toBeGreaterThan(0);
    expect(screen.getAllByText("optional").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Setup work unit").length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox", { name: "Existing repository type" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Must Have" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Must Avoid" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Timebox Notes" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Setup work unit" })).toBeTruthy();
    expect(screen.queryByText(/workflow-context-facts/i)).toBeNull();
  });

  it("renders bound external references as searchable comboboxes and disables duplicates across repeated rows", async () => {
    const user = userEvent.setup();
    await renderHarness();

    await user.click(screen.getByRole("button", { name: "Add value" }));
    await user.click(screen.getByRole("combobox", { name: "Existing project parts 2" }));

    const disabledOption = screen.getByRole("option", { name: /apps\/web/i });
    const enabledOption = screen.getByRole("option", { name: /packages\/api/i });

    expect(disabledOption.getAttribute("data-disabled")).toBe("true");
    expect(enabledOption.getAttribute("data-disabled")).toBe("false");
  });

  it("shows unavailable bound external selections and still allows switching to inline creation", async () => {
    const user = userEvent.setup();
    const detail = buildDetail();

    if (detail.body.stepType !== "form") {
      throw new Error("expected form detail");
    }

    detail.body.page.fields = detail.body.page.fields.map((field: any) => {
      if (field.fieldKey === "existingRepositoryType") {
        return {
          ...field,
          widget: {
            ...field.widget,
            options: [],
            emptyState:
              "No eligible existing instances are available yet. Create the required fact first.",
          },
        };
      }

      return field;
    });

    const { saveDraftCalls } = await renderHarness({ currentDetail: detail });

    expect(
      screen.getByRole("combobox", { name: "Existing repository type" }).textContent,
    ).toContain("fact-1");
    expect(screen.getByText("Current selection is unavailable")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Create new" }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: "Create new" })[1]!);
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(saveDraftCalls).toHaveLength(1));
    expect(saveDraftCalls[0]).toMatchObject({
      values: {
        existingRepositoryType: { value: null },
      },
    });
  });

  it("allows creating a new bound fact value inline when no existing instances are available", async () => {
    const user = userEvent.setup();
    const detail = buildDetail();

    if (detail.body.stepType !== "form") {
      throw new Error("expected form detail");
    }

    detail.body.page.fields = detail.body.page.fields.map((field: any) => {
      if (field.fieldKey === "existingRepositoryType") {
        return {
          ...field,
          widget: {
            ...field.widget,
            options: [],
            emptyState:
              "No eligible existing instances are available yet. Create the required fact first.",
          },
        };
      }

      return field;
    });

    const { saveDraftCalls } = await renderHarness({ currentDetail: detail });

    await user.click(screen.getAllByRole("button", { name: "Create new" })[1]!);
    const input = screen.getByRole("textbox", { name: "Existing repository type" });
    await user.clear(input);
    await user.type(input, "greenfield");
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(saveDraftCalls).toHaveLength(1));
    expect(saveDraftCalls[0]).toMatchObject({
      values: {
        existingRepositoryType: { value: "greenfield" },
      },
    });
  });

  it("preserves existing bound fact binding when selecting an available instance", async () => {
    const user = userEvent.setup();
    const { saveDraftCalls } = await renderHarness();

    await user.click(screen.getAllByRole("button", { name: "Bind existing" })[1]!);
    await user.click(screen.getByRole("combobox", { name: "Existing repository type" }));
    await user.click(screen.getByRole("option", { name: "multi_part Repository type" }));
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(saveDraftCalls).toHaveLength(1));
    expect(saveDraftCalls[0]).toMatchObject({
      values: {
        existingRepositoryType: { factInstanceId: "fact-2" },
      },
    });
  });

  it("renders required validation messages only once", async () => {
    const user = userEvent.setup();
    await renderHarness();

    await user.clear(screen.getByRole("textbox", { name: "Initiative name" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getAllByText("Initiative name is required")).toHaveLength(1);
    });
  });

  it("maps Save draft, Submit, and Complete Step to exact mutations with latest-only semantics", async () => {
    const user = userEvent.setup();
    const { saveDraftCalls, submitCalls, completeCalls } = await renderHarness();

    const initiativeInput = screen.getByRole("textbox", { name: "Initiative name" });
    await user.clear(initiativeInput);
    await user.type(initiativeInput, "Updated initiative");

    await user.click(screen.getByRole("combobox", { name: "Workflow mode" }));
    await user.click(screen.getByRole("option", { name: "deep_dive" }));

    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(saveDraftCalls).toHaveLength(1));
    expect(saveDraftCalls[0]).toMatchObject({
      projectId: "project-1",
      workflowExecutionId: "workflow-1",
      stepExecutionId: "step-1",
      values: {
        initiativeName: "Updated initiative",
        workflowMode: "deep_dive",
      },
    });

    await user.clear(initiativeInput);
    await user.type(initiativeInput, "Final initiative");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(submitCalls).toHaveLength(1));
    expect(submitCalls[0]?.values).toMatchObject({
      initiativeName: "Final initiative",
      workflowMode: "deep_dive",
    });

    await user.clear(initiativeInput);
    await user.type(initiativeInput, "Final initiative v2");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(submitCalls).toHaveLength(2));
    expect(submitCalls[1]?.values).toMatchObject({
      initiativeName: "Final initiative v2",
      workflowMode: "deep_dive",
    });

    await user.click(screen.getByRole("button", { name: "Complete Step" }));

    await waitFor(() => expect(completeCalls).toHaveLength(1));
    expect(completeCalls[0]).toMatchObject({
      projectId: "project-1",
      workflowExecutionId: "workflow-1",
      stepExecutionId: "step-1",
    });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Complete Step" })).toBeNull());
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
  });

  it("makes form fields read-only after the step is completed", async () => {
    const detail = buildDetail();
    if (detail.body.stepType !== "form") {
      throw new Error("expected form detail");
    }

    detail.shell.status = "completed";
    detail.shell.completedAt = "2026-04-01T12:49:08.000Z";
    detail.shell.completionAction = {
      kind: "complete_step_execution",
      visible: false,
      enabled: false,
      reasonIfDisabled: "Step execution is already completed.",
    };
    detail.body.submitAction.enabled = false;

    await renderHarness({ currentDetail: detail });

    const initiativeInput = screen.getByRole("textbox", {
      name: "Initiative name",
    }) as HTMLInputElement;
    expect(initiativeInput.disabled).toBe(true);

    const workflowMode = screen.getByRole("combobox", { name: "Workflow mode" });
    expect(workflowMode.getAttribute("disabled")).toBe("");

    const brainstormingToggle = screen.getByRole("checkbox", {
      name: "Requires brainstorming",
    }) as HTMLButtonElement;
    expect(brainstormingToggle.getAttribute("disabled")).toBe("");

    const addReferenceButton = screen.getByRole("button", { name: "Add value" });
    expect(addReferenceButton.getAttribute("disabled")).toBe("");
  });

  it("opens the next step directly when a completed step already has an active next step", async () => {
    const user = userEvent.setup();
    const detail = buildDetail();
    if (detail.body.stepType !== "form") {
      throw new Error("expected form detail");
    }

    detail.shell.status = "completed";
    detail.shell.completedAt = "2026-04-01T12:49:08.000Z";
    detail.shell.completionAction = {
      kind: "complete_step_execution",
      visible: false,
      enabled: false,
      reasonIfDisabled: "Step execution is already completed.",
    };
    detail.body.lineage = {
      previousStepExecutionId: undefined,
      nextStepExecutionId: "step-2",
    };
    detail.body.nextStep = {
      state: "active",
      nextStepDefinitionId: "def-form-2",
      nextStepExecutionId: "step-2",
    };

    await renderHarness({ currentDetail: detail });

    await user.click(screen.getByRole("button", { name: "Open next step" }));

    expect(__routerMocks.useNavigateMock).toHaveBeenCalledWith({
      to: "/projects/$projectId/step-executions/$stepExecutionId",
      params: { projectId: "project-1", stepExecutionId: "step-2" },
    });
  });

  it("activates then opens the next step when a completed step has an inactive next step", async () => {
    const user = userEvent.setup();
    const detail = buildDetail();
    if (detail.body.stepType !== "form") {
      throw new Error("expected form detail");
    }

    detail.shell.status = "completed";
    detail.shell.completedAt = "2026-04-01T12:49:08.000Z";
    detail.shell.completionAction = {
      kind: "complete_step_execution",
      visible: false,
      enabled: false,
      reasonIfDisabled: "Step execution is already completed.",
    };
    detail.body.lineage = {
      previousStepExecutionId: undefined,
      nextStepExecutionId: undefined,
    };
    detail.body.nextStep = {
      state: "inactive",
      nextStepDefinitionId: "def-form-2",
    };

    const { activateWorkflowStepExecutionCalls } = await renderHarness({ currentDetail: detail });

    await user.click(screen.getByRole("button", { name: "Activate and open next step" }));

    await waitFor(() => expect(activateWorkflowStepExecutionCalls).toHaveLength(1));
    expect(activateWorkflowStepExecutionCalls[0]).toEqual({
      projectId: "project-1",
      workflowExecutionId: "workflow-1",
    });
    expect(__routerMocks.useNavigateMock).toHaveBeenCalledWith({
      to: "/projects/$projectId/step-executions/$stepExecutionId",
      params: { projectId: "project-1", stepExecutionId: "step-2" },
    });
  });
});
