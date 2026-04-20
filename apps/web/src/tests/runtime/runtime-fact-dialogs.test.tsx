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

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
  buttonVariants: () => "",
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
    const [textValue, setTextValue] = React.useState("");
    const [instanceId, setInstanceId] = React.useState("");
    const [selectedValue, setSelectedValue] = React.useState("");
    const [relativePath, setRelativePath] = React.useState("");

    React.useEffect(() => {
      if (!open) {
        return;
      }

      setTextValue(typeof initialValue === "string" ? initialValue : "updated-value");
      setInstanceId(
        typeof initialValue === "object" && initialValue !== null && "instanceId" in initialValue
          ? String((initialValue as { instanceId: string }).instanceId)
          : "instance-1",
      );
      setSelectedValue(
        editor.kind === "workflow_ref_fact"
          ? ((initialValue as { workflowDefinitionId?: string } | undefined)
              ?.workflowDefinitionId ??
              editor.options?.[0]?.value ??
              "")
          : editor.kind === "artifact_slot_reference_fact" ||
              editor.kind === "artifact_slot_reference_fact"
            ? ((initialValue as { artifactInstanceId?: string } | undefined)?.artifactInstanceId ??
              editor.options?.[0]?.value ??
              "")
            : editor.kind === "work_unit"
              ? ((initialValue as { projectWorkUnitId?: string } | undefined)?.projectWorkUnitId ??
                editor.options?.[0]?.value ??
                "")
              : "",
      );
      setRelativePath("stories/story.md");
    }, [editor, initialValue, open]);

    if (!open) {
      return null;
    }

    const submit = async () => {
      switch (editor.kind) {
        case "primitive":
          await onSubmit(textValue || "updated-value");
          return;
        case "work_unit":
          await onSubmit({ projectWorkUnitId: selectedValue || editor.options?.[0]?.value });
          return;
        case "bound_fact":
          await onSubmit({ instanceId, value: textValue || "P1" });
          return;
        case "workflow_ref_fact":
          await onSubmit({ workflowDefinitionId: selectedValue || editor.options?.[0]?.value });
          return;
        case "artifact_slot_reference_fact":
          await onSubmit({
            slotDefinitionId: editor.slotDefinitionId,
            artifactInstanceId: selectedValue || editor.options?.[0]?.value,
          });
          return;
        case "work_unit_draft_spec_fact":
          await onSubmit({
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
          return;
      }
    };

    return (
      <div data-testid="runtime-fact-dialog">
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
              <input value={textValue} onChange={(event) => setTextValue(event.target.value)} />
            </label>
          </>
        ) : null}
        {editor.kind === "primitive" ? (
          <label>
            Fact Value
            <input value={textValue} onChange={(event) => setTextValue(event.target.value)} />
          </label>
        ) : null}
        {editor.kind === "workflow_ref_fact" ||
        editor.kind === "artifact_slot_reference_fact" ||
        editor.kind === "artifact_slot_reference_fact" ||
        editor.kind === "work_unit" ? (
          <label>
            Selection
            <select
              value={selectedValue}
              onChange={(event) => setSelectedValue(event.target.value)}
            >
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
        <button type="button" onClick={() => void submit()}>
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
      <div data-testid="runtime-confirm-dialog">
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

import { ProjectFactDetailRoute } from "../../routes/projects.$projectId.facts.$factDefinitionId";
import { ProjectWorkUnitFactDetailRoute } from "../../routes/projects.$projectId.work-units.$projectWorkUnitId.facts.$factDefinitionId";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

describe("runtime fact dialogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses a direct replace dialog for single-cardinality project facts", async () => {
    const updateMutation = vi.fn(async () => ({ projectFactInstanceId: "pf-1" }));
    const queryClient = createQueryClient();

    useParamsMock.mockReturnValue({ projectId: "project-1", factDefinitionId: "fact-1" });
    useRouteContextMock.mockReturnValue({
      queryClient,
      orpc: {
        project: {
          getRuntimeProjectFactDetail: {
            queryOptions: () => ({
              queryKey: ["runtime-project-fact-detail", "project-1", "fact-1"],
              queryFn: async () => ({
                project: { projectId: "project-1", name: "Project One" },
                factDefinition: {
                  factDefinitionId: "fact-1",
                  factKey: "deliveryMode",
                  factName: "Delivery Mode",
                  factType: "string",
                  cardinality: "one",
                },
                currentState: {
                  exists: true,
                  currentCount: 1,
                  values: [
                    {
                      instanceId: "pf-1",
                      value: "incremental",
                      createdAt: "2026-04-19T10:00:00.000Z",
                    },
                  ],
                },
                actions: {
                  canAddInstance: true,
                  canUpdateExisting: true,
                  canRemoveExisting: false,
                },
              }),
            }),
          },
          createRuntimeProjectFactValue: { mutationOptions: () => ({ mutationFn: vi.fn() }) },
          updateRuntimeProjectFactValue: {
            mutationOptions: () => ({ mutationFn: updateMutation }),
          },
          deleteRuntimeProjectFactValue: { mutationOptions: () => ({ mutationFn: vi.fn() }) },
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectFactDetailRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Replace value")).toBeTruthy();
    expect(screen.queryByText("Add instance")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Replace value" }));

    expect(screen.getByText("Replace project fact value")).toBeTruthy();
    expect(screen.getByText("editor:primitive")).toBeTruthy();

    const dialog = screen.getAllByTestId("runtime-fact-dialog").at(-1) as HTMLElement;
    await userEvent.clear(screen.getByLabelText("Fact Value"));
    await userEvent.type(screen.getByLabelText("Fact Value"), "continuous");
    await userEvent.click(within(dialog).getByRole("button", { name: "Replace value" }));

    expect(updateMutation).toHaveBeenCalledTimes(1);
    const firstUpdateArg = updateMutation.mock.calls.flatMap((call) => call).at(0);
    expect(firstUpdateArg).toEqual({
      projectId: "project-1",
      factDefinitionId: "fact-1",
      projectFactInstanceId: "pf-1",
      value: "continuous",
    });
  });

  it("uses list-plus-dialog flows for multi-cardinality work-unit fact references", async () => {
    const createMutation = vi.fn(async () => ({ workUnitFactInstanceId: "wufi-new" }));
    const updateMutation = vi.fn(async () => ({ workUnitFactInstanceId: "wufi-1" }));
    const queryClient = createQueryClient();

    useParamsMock.mockReturnValue({
      projectId: "project-1",
      projectWorkUnitId: "wu-1",
      factDefinitionId: "dep-1",
    });
    useRouteContextMock.mockReturnValue({
      queryClient,
      orpc: {
        project: {
          getRuntimeWorkUnitFactDetail: {
            queryOptions: () => ({
              queryKey: ["runtime-work-unit-fact-detail", "project-1", "wu-1", "dep-1"],
              queryFn: async () => ({
                workUnit: {
                  projectWorkUnitId: "wu-1",
                  workUnitTypeId: "wut-story",
                  workUnitTypeKey: "story",
                  workUnitTypeName: "Story",
                },
                factDefinition: {
                  factDefinitionId: "dep-1",
                  factKey: "dependsOn",
                  factName: "Depends On",
                  factType: "work_unit",
                  cardinality: "many",
                },
                dependencyState: {
                  outgoing: [
                    {
                      workUnitFactInstanceId: "wufi-1",
                      counterpartProjectWorkUnitId: "wu-2",
                      counterpartWorkUnitTypeId: "wut-research",
                      counterpartWorkUnitTypeKey: "research",
                      counterpartWorkUnitTypeName: "Research",
                      counterpartLabel: "Research #1",
                      createdAt: "2026-04-19T10:00:00.000Z",
                    },
                  ],
                  incoming: [],
                },
                actions: {
                  canAddInstance: true,
                  canUpdateExisting: true,
                  canRemoveExisting: false,
                },
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
                    displayIdentity: { primaryLabel: "Research #1", secondaryLabel: "research_1" },
                  },
                  {
                    projectWorkUnitId: "wu-3",
                    displayIdentity: { primaryLabel: "Review #1", secondaryLabel: "review_1" },
                  },
                ],
              }),
            }),
          },
          createRuntimeWorkUnitFactValue: {
            mutationOptions: () => ({ mutationFn: createMutation }),
          },
          updateRuntimeWorkUnitFactValue: {
            mutationOptions: () => ({ mutationFn: updateMutation }),
          },
          deleteRuntimeWorkUnitFactValue: { mutationOptions: () => ({ mutationFn: vi.fn() }) },
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectWorkUnitFactDetailRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Add linked work unit")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Add linked work unit" }));
    expect(screen.getByText("editor:work_unit")).toBeTruthy();

    const createDialog = screen.getAllByTestId("runtime-fact-dialog").at(-1) as HTMLElement;
    await userEvent.selectOptions(within(createDialog).getByLabelText("Selection"), "wu-3");
    await userEvent.click(within(createDialog).getByRole("button", { name: "Create link" }));

    expect(createMutation).toHaveBeenCalledTimes(1);
    const firstCreateArg = createMutation.mock.calls.flatMap((call) => call).at(0);
    expect(firstCreateArg).toEqual({
      projectId: "project-1",
      projectWorkUnitId: "wu-1",
      factDefinitionId: "dep-1",
      referencedProjectWorkUnitId: "wu-3",
    });

    const dependencyCard = screen.getByText("Research #1 · research").closest("li");
    expect(dependencyCard).not.toBeNull();

    await userEvent.click(
      within(dependencyCard as HTMLElement).getByRole("button", { name: "Edit instance" }),
    );
    expect(screen.getByText("Replace linked work unit")).toBeTruthy();

    const updateDialog = screen.getAllByTestId("runtime-fact-dialog").at(-1) as HTMLElement;
    await userEvent.selectOptions(within(updateDialog).getByLabelText("Selection"), "wu-2");
    await userEvent.click(within(updateDialog).getByRole("button", { name: "Save link" }));

    expect(updateMutation).toHaveBeenCalledTimes(1);
    const dependencyUpdateArg = updateMutation.mock.calls.flatMap((call) => call).at(0);
    expect(dependencyUpdateArg).toEqual({
      projectId: "project-1",
      projectWorkUnitId: "wu-1",
      factDefinitionId: "dep-1",
      workUnitFactInstanceId: "wufi-1",
      referencedProjectWorkUnitId: "wu-2",
    });
  });
});
