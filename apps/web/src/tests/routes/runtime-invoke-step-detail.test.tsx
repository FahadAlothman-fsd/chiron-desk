import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useParamsMock, useNavigateMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useParamsMock: vi.fn(),
  useNavigateMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useParams: useParamsMock,
    useNavigate: () => useNavigateMock,
  }),
  Link: ({ children, to, params, ...props }: any) => (
    <a href={String(to)} data-params={JSON.stringify(params ?? {})} {...props}>
      {children}
    </a>
  ),
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
  buttonVariants: () => "button-variant",
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => {
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

import {
  RuntimeFormStepDetailRoute,
  runtimeStepExecutionDetailQueryKey,
} from "../../routes/projects.$projectId.step-executions.$stepExecutionId";

function buildDetail(): any {
  return {
    shell: {
      stepExecutionId: "step-invoke-1",
      workflowExecutionId: "workflow-parent-1",
      stepDefinitionId: "invoke-step-def-1",
      stepType: "invoke" as const,
      status: "active" as const,
      activatedAt: "2026-04-14T10:00:00.000Z",
      completedAt: undefined,
      completionAction: {
        kind: "complete_step_execution" as const,
        visible: true,
        enabled: true,
      },
    },
    body: {
      stepType: "invoke" as const,
      targetKind: "work_unit" as const,
      sourceMode: "fact_backed" as const,
      sourceContextFactDefinitionId:
        "seed:l3-setup-invoke:setup:mver_bmad_v1_active:fact:research-draft-specs",
      sourceContextFactLabel: "Research Draft Specs",
      sourceContextFactKey: "cf_research_draft_specs",
      sourceContextFactKind: "work_unit_draft_spec_fact" as const,
      sourceContextFactCardinality: "many" as const,
      sourceContextFactValueType: "work_unit_draft_spec",
      sourceContextFactWorkUnitDefinitionName: "Research",
      sourceContextFactInstanceValues: [
        {
          id: "research-001",
          topic: "Offline-First Architecture Patterns",
        },
      ],
      workflowTargets: [
        {
          label: "Draft architecture",
          status: "not_started" as const,
          invokeWorkflowTargetExecutionId: "invoke-workflow-row-1",
          workflowDefinitionId: "workflow-def-1",
          workflowDefinitionKey: "WF.ARCHITECTURE",
          workflowDefinitionName: "Draft architecture",
          actions: {
            start: {
              kind: "start_invoke_workflow_target" as const,
              enabled: true,
              invokeWorkflowTargetExecutionId: "invoke-workflow-row-1",
            },
          },
        },
        {
          label: "Security review",
          status: "active" as const,
          activeChildStepLabel: "Assess constraints",
          invokeWorkflowTargetExecutionId: "invoke-workflow-row-2",
          workflowDefinitionId: "workflow-def-2",
          workflowDefinitionKey: "WF.SECURITY",
          workflowDefinitionName: "Security review",
          workflowExecutionId: "workflow-exec-2",
          actions: {
            openWorkflow: {
              kind: "open_workflow_execution" as const,
              workflowExecutionId: "workflow-exec-2",
              target: {
                page: "workflow-execution-detail" as const,
                workflowExecutionId: "workflow-exec-2",
              },
            },
          },
        },
      ],
      workUnitTargets: [
        {
          workUnitLabel: "QA Review",
          transitionLabel: "Start QA",
          status: "blocked" as const,
          blockedReason: "No primary workflows are available for this transition.",
          startGate: {
            conditionTree: {
              mode: "all" as const,
              conditions: [],
              groups: [],
            },
            evaluationTree: {
              mode: "all" as const,
              met: true,
              conditions: [],
              groups: [],
            },
            evaluatedAt: "2026-04-14T10:02:00.000Z",
          },
          availablePrimaryWorkflows: [],
          invokeWorkUnitTargetExecutionId: "invoke-work-unit-row-1",
          workUnitDefinitionId: "work-unit-def-1",
          transitionDefinitionId: "transition-def-1",
          actions: {
            start: {
              kind: "start_invoke_work_unit_target" as const,
              enabled: false,
              reasonIfDisabled: "No primary workflows are available for this transition.",
              invokeWorkUnitTargetExecutionId: "invoke-work-unit-row-1",
            },
          },
          bindingPreview: [],
        },
        {
          workUnitLabel: "Story: Payments",
          transitionLabel: "Start implementation",
          transitionFromStateLabel: "Activation",
          transitionToStateLabel: "In Progress",
          status: "not_started" as const,
          availablePrimaryWorkflows: [
            {
              workflowDefinitionName: "Implement story",
              workflowDefinitionId: "workflow-primary-1",
              workflowDefinitionKey: "WF.IMPLEMENT",
            },
            {
              workflowDefinitionName: "Spike first",
              workflowDefinitionId: "workflow-primary-2",
              workflowDefinitionKey: "WF.SPIKE",
            },
          ],
          invokeWorkUnitTargetExecutionId: "invoke-work-unit-row-2",
          workUnitDefinitionId: "work-unit-def-2",
          workUnitDefinitionKey: "WU.STORY",
          workUnitDefinitionName: "Story",
          transitionDefinitionId: "transition-def-2",
          transitionDefinitionKey: "activation_to_in_progress",
          startGate: {
            conditionTree: {
              mode: "all" as const,
              conditions: [
                {
                  kind: "work_unit_fact" as const,
                  factKey: "setup_work_unit",
                  operator: "exists" as const,
                },
              ],
              groups: [],
            },
            evaluationTree: {
              mode: "all" as const,
              met: false,
              reason: "Work-unit fact 'setup_work_unit' is missing",
              conditions: [
                {
                  condition: {
                    kind: "work_unit_fact" as const,
                    factKey: "setup_work_unit",
                    operator: "exists" as const,
                  },
                  met: false,
                  reason: "Work-unit fact 'setup_work_unit' is missing",
                },
              ],
              groups: [],
            },
            firstBlockingReason: "Work-unit fact 'setup_work_unit' is missing",
            evaluatedAt: "2026-04-14T10:03:00.000Z",
          },
          actions: {
            start: {
              kind: "start_invoke_work_unit_target" as const,
              enabled: true,
              invokeWorkUnitTargetExecutionId: "invoke-work-unit-row-2",
            },
          },
          bindingPreview: [
            {
              destinationKind: "work_unit_fact" as const,
              destinationDefinitionId: "fact-story-direction",
              destinationLabel: "Selected Direction",
              destinationFactType: "string" as const,
              destinationCardinality: "one" as const,
              sourceKind: "context_fact" as const,
              sourceContextFactDefinitionId: "ctx-selected-direction",
              sourceContextFactKey: "selected_direction",
              sourceContextFactLabel: "Selected Direction",
              authoredPrefillValueJson: "Context direction",
              savedDraftValueJson: "Saved direction",
              resolvedValueJson: "Saved direction",
              requiresRuntimeValue: false,
            },
            {
              destinationKind: "work_unit_fact" as const,
              destinationDefinitionId: "fact-story-outcome",
              destinationLabel: "Desired Outcome",
              destinationFactType: "string" as const,
              destinationCardinality: "one" as const,
              sourceKind: "literal" as const,
              authoredPrefillValueJson: "Literal outcome",
              resolvedValueJson: "Literal outcome",
              requiresRuntimeValue: false,
            },
            {
              destinationKind: "work_unit_fact" as const,
              destinationDefinitionId: "fact-story-owner",
              destinationLabel: "Owner",
              destinationFactType: "string" as const,
              destinationCardinality: "one" as const,
              sourceKind: "runtime" as const,
              requiresRuntimeValue: true,
            },
            {
              destinationKind: "artifact_slot" as const,
              destinationDefinitionId: "artifact-brainstorming-session",
              destinationLabel: "Brainstorming Session",
              destinationCardinality: "one" as const,
              sourceKind: "runtime" as const,
              requiresRuntimeValue: true,
            },
            {
              destinationKind: "artifact_slot" as const,
              destinationDefinitionId: "artifact-supporting-files",
              destinationLabel: "Supporting Files",
              destinationCardinality: "many" as const,
              sourceKind: "runtime" as const,
              requiresRuntimeValue: true,
            },
            {
              destinationKind: "artifact_slot" as const,
              destinationDefinitionId: "artifact-story-brief",
              destinationLabel: "Story Brief",
              sourceKind: "context_fact" as const,
              sourceContextFactDefinitionId: "ctx-brief-path",
              sourceContextFactKey: "brief_path",
              sourceWarnings: [
                "Brief Path: docs/missing.md will not be mapped (file is missing from the repo).",
              ],
              requiresRuntimeValue: false,
            },
          ],
        },
        {
          workUnitLabel: "Story: Search",
          transitionLabel: "Start implementation",
          workflowLabel: "Implement story",
          currentWorkUnitStateLabel: "Done",
          status: "completed" as const,
          availablePrimaryWorkflows: [
            {
              workflowDefinitionName: "Implement story",
              workflowDefinitionId: "workflow-primary-1",
              workflowDefinitionKey: "WF.IMPLEMENT",
            },
          ],
          invokeWorkUnitTargetExecutionId: "invoke-work-unit-row-3",
          projectWorkUnitId: "project-work-unit-3",
          workUnitDefinitionId: "work-unit-def-3",
          transitionDefinitionId: "transition-def-3",
          workflowDefinitionId: "workflow-primary-1",
          transitionExecutionId: "transition-exec-3",
          workflowExecutionId: "workflow-exec-3",
          startGate: {
            conditionTree: {
              mode: "all" as const,
              conditions: [],
              groups: [],
            },
            evaluationTree: {
              mode: "all" as const,
              met: true,
              conditions: [],
              groups: [],
            },
            evaluatedAt: "2026-04-14T10:04:00.000Z",
          },
          actions: {
            openWorkUnit: {
              kind: "open_work_unit" as const,
              projectWorkUnitId: "project-work-unit-3",
              target: {
                page: "work-unit-overview" as const,
                projectWorkUnitId: "project-work-unit-3",
              },
            },
            openTransition: {
              kind: "open_transition_execution" as const,
              transitionExecutionId: "transition-exec-3",
              target: {
                page: "transition-execution-detail" as const,
                transitionExecutionId: "transition-exec-3",
              },
            },
            openWorkflow: {
              kind: "open_workflow_execution" as const,
              workflowExecutionId: "workflow-exec-3",
              target: {
                page: "workflow-execution-detail" as const,
                workflowExecutionId: "workflow-exec-3",
              },
            },
          },
          bindingPreview: [],
        },
      ],
      completionSummary: {
        mode: "manual" as const,
        eligible: true,
        totalTargets: 3,
        completedTargets: 1,
      },
      propagationPreview: {
        mode: "on_step_completion" as const,
        summary: "Completion will write selected story draft specs into workflow context facts.",
        outputs: [
          {
            label: "Story draft specs",
            contextFactDefinitionId: "ctx-draft-specs",
            contextFactKey: "story_draft_specs",
          },
          {
            label: "Story workflow references",
            contextFactDefinitionId: "ctx-workflow-refs",
            contextFactKey: "story_workflow_refs",
          },
        ],
      },
    },
  };
}

async function renderHarness(initialDetail = buildDetail()) {
  let currentDetail = initialDetail;
  let detailQueryCalls = 0;

  const startWorkflowCalls: Array<Record<string, unknown>> = [];
  const startWorkUnitCalls: Array<Record<string, unknown>> = [];
  const saveDraftCalls: Array<Record<string, unknown>> = [];
  const completeCalls: Array<Record<string, unknown>> = [];

  const getRuntimeStepExecutionDetailQueryOptionsMock = vi.fn(
    (_input: { input: { projectId: string; stepExecutionId: string } }) => ({
      queryKey: ["runtime-step-execution-detail", "project-1", "step-invoke-1"],
      queryFn: async () => {
        detailQueryCalls += 1;
        return currentDetail;
      },
    }),
  );

  const getAgentStepExecutionDetailQueryOptionsMock = vi.fn(() => ({
    queryKey: ["runtime-agent-step-execution-detail", "project-1", "step-invoke-1"],
    queryFn: async () => ({ body: { stepType: "agent" as const } }),
  }));
  const getProjectDetailsQueryOptionsMock = vi.fn(() => ({
    queryKey: ["project-details", "project-1"],
    queryFn: async () => ({
      project: {
        projectId: "project-1",
        displayName: "Project 1",
        projectRootPath: "/tmp/project-1",
      },
      pin: {
        methodologyVersionId: "mver_bmad_v1_active",
      },
    }),
  }));
  const getProjectRepoFileStatusesQueryOptionsMock = vi.fn(
    (_input: { input: { projectId: string; relativePaths: string[] } }) => ({
      queryKey: ["project-repo-file-statuses", "project-1", ..._input.input.relativePaths],
      queryFn: async () =>
        _input.input.relativePaths.map((relativePath) => ({
          relativePath,
          status: "committed" as const,
          gitCommitHash: "commit-1",
          gitBlobHash: "blob-1",
          gitCommitSubject: `Add ${relativePath}`,
          gitCommitBody: null,
        })),
    }),
  );
  const listProjectRepoFilesQueryOptionsMock = vi.fn(() => ({
    queryKey: ["project-repo-files", "project-1"],
    queryFn: async () => [
      {
        relativePath: "docs/brief.md",
        status: "committed" as const,
        gitCommitHash: "commit-1",
        gitBlobHash: "blob-1",
        gitCommitSubject: "Add brief",
        gitCommitBody: null,
      },
      {
        relativePath: "docs/missing.md",
        status: "missing" as const,
      },
    ],
  }));

  const startInvokeWorkflowTargetMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        startWorkflowCalls.push(input);
        currentDetail = {
          ...currentDetail,
          body: {
            ...currentDetail.body,
            workflowTargets: currentDetail.body.workflowTargets.map((row: any) =>
              row.invokeWorkflowTargetExecutionId === input.invokeWorkflowTargetExecutionId
                ? {
                    ...row,
                    status: "active",
                    workflowExecutionId: "workflow-exec-started-1",
                    actions: {
                      openWorkflow: {
                        kind: "open_workflow_execution",
                        workflowExecutionId: "workflow-exec-started-1",
                        target: {
                          page: "workflow-execution-detail",
                          workflowExecutionId: "workflow-exec-started-1",
                        },
                      },
                    },
                  }
                : row,
            ),
          },
        };
        await options?.onSuccess?.();
        return {
          invokeWorkflowTargetExecutionId: input.invokeWorkflowTargetExecutionId,
          workflowExecutionId: "workflow-exec-started-1",
          result: "started" as const,
        };
      },
    }),
  );

  const startInvokeWorkUnitTargetMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        startWorkUnitCalls.push(input);
        currentDetail = {
          ...currentDetail,
          body: {
            ...currentDetail.body,
            workUnitTargets: currentDetail.body.workUnitTargets.map((row: any) =>
              row.invokeWorkUnitTargetExecutionId === input.invokeWorkUnitTargetExecutionId
                ? {
                    ...row,
                    workflowDefinitionId: input.workflowDefinitionId,
                    workflowLabel:
                      input.workflowDefinitionId === "workflow-primary-2"
                        ? "Spike first"
                        : "Implement story",
                    currentWorkUnitStateLabel: "In Progress",
                    projectWorkUnitId: "project-work-unit-2",
                    transitionExecutionId: "transition-exec-2",
                    workflowExecutionId: "workflow-exec-2",
                    status: "active",
                    actions: {
                      openWorkUnit: {
                        kind: "open_work_unit",
                        projectWorkUnitId: "project-work-unit-2",
                        target: {
                          page: "work-unit-overview",
                          projectWorkUnitId: "project-work-unit-2",
                        },
                      },
                      openTransition: {
                        kind: "open_transition_execution",
                        transitionExecutionId: "transition-exec-2",
                        target: {
                          page: "transition-execution-detail",
                          transitionExecutionId: "transition-exec-2",
                        },
                      },
                      openWorkflow: {
                        kind: "open_workflow_execution",
                        workflowExecutionId: "workflow-exec-2",
                        target: {
                          page: "workflow-execution-detail",
                          workflowExecutionId: "workflow-exec-2",
                        },
                      },
                    },
                  }
                : row,
            ),
          },
        };
        await options?.onSuccess?.();
        return {
          invokeWorkUnitTargetExecutionId: input.invokeWorkUnitTargetExecutionId,
          projectWorkUnitId: "project-work-unit-2",
          transitionExecutionId: "transition-exec-2",
          workflowExecutionId: "workflow-exec-2",
          result: "started" as const,
        };
      },
    }),
  );

  const saveInvokeWorkUnitTargetDraftMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        saveDraftCalls.push(input);
        currentDetail = {
          ...currentDetail,
          body: {
            ...currentDetail.body,
            workUnitTargets: currentDetail.body.workUnitTargets.map((row: any) =>
              row.invokeWorkUnitTargetExecutionId === input.invokeWorkUnitTargetExecutionId
                ? {
                    ...row,
                    blockedReason: undefined,
                    startGate: {
                      conditionTree: row.startGate.conditionTree,
                      evaluationTree: {
                        mode: "all",
                        met: true,
                        conditions: [
                          {
                            condition: {
                              kind: "work_unit_fact",
                              factKey: "setup_work_unit",
                              operator: "exists",
                            },
                            met: true,
                          },
                        ],
                        groups: [],
                      },
                      evaluatedAt: "2026-04-24T12:00:00.000Z",
                    },
                    bindingPreview: row.bindingPreview.map((binding: any) =>
                      binding.destinationDefinitionId === "fact-story-owner"
                        ? {
                            ...binding,
                            savedDraftValueJson: { projectWorkUnitId: "setup-work-unit-1" },
                            resolvedValueJson: { projectWorkUnitId: "setup-work-unit-1" },
                          }
                        : binding,
                    ),
                  }
                : row,
            ),
          },
        };
        await options?.onSuccess?.();
        return {
          invokeWorkUnitTargetExecutionId: input.invokeWorkUnitTargetExecutionId,
        };
      },
    }),
  );

  const completeStepExecutionMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        completeCalls.push(input);
        currentDetail = {
          ...currentDetail,
          shell: {
            ...currentDetail.shell,
            status: "completed",
            completedAt: "2026-04-14T12:30:00.000Z",
            completionAction: {
              kind: "complete_step_execution",
              visible: false,
              enabled: false,
            },
          },
        };
        await options?.onSuccess?.();
        return { stepExecutionId: "step-invoke-1", status: "completed" as const };
      },
    }),
  );

  const orpc = {
    project: {
      getProjectDetails: {
        queryOptions: getProjectDetailsQueryOptionsMock,
      },
      getProjectRepoFileStatuses: {
        queryOptions: getProjectRepoFileStatusesQueryOptionsMock,
      },
      getRuntimeStepExecutionDetail: {
        queryOptions: getRuntimeStepExecutionDetailQueryOptionsMock,
      },
      getAgentStepExecutionDetail: {
        queryOptions: getAgentStepExecutionDetailQueryOptionsMock,
      },
      listProjectRepoFiles: {
        queryOptions: listProjectRepoFilesQueryOptionsMock,
      },
      startInvokeWorkflowTarget: {
        mutationOptions: startInvokeWorkflowTargetMutationOptionsMock,
      },
      startInvokeWorkUnitTarget: {
        mutationOptions: startInvokeWorkUnitTargetMutationOptionsMock,
      },
      saveInvokeWorkUnitTargetDraft: {
        mutationOptions: saveInvokeWorkUnitTargetDraftMutationOptionsMock,
      },
      completeStepExecution: {
        mutationOptions: completeStepExecutionMutationOptionsMock,
      },
      activateWorkflowStepExecution: {
        mutationOptions: vi.fn(() => ({
          mutationFn: async () => ({ stepExecutionId: "step-next-1" }),
        })),
      },
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  useParamsMock.mockReturnValue({
    projectId: "project-1",
    stepExecutionId: "step-invoke-1",
  });
  useRouteContextMock.mockReturnValue({ orpc, queryClient });

  await queryClient.prefetchQuery({
    ...orpc.project.getRuntimeStepExecutionDetail.queryOptions({
      input: { projectId: "project-1", stepExecutionId: "step-invoke-1" },
    }),
    queryKey: runtimeStepExecutionDetailQueryKey("project-1", "step-invoke-1"),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RuntimeFormStepDetailRoute />
    </QueryClientProvider>,
  );

  return {
    detailQueryCalls: () => detailQueryCalls,
    startWorkflowCalls,
    startWorkUnitCalls,
    saveDraftCalls,
    completeCalls,
    getProjectDetailsQueryOptionsMock,
    getProjectRepoFileStatusesQueryOptionsMock,
    listProjectRepoFilesQueryOptionsMock,
  };
}

describe("runtime invoke step detail route", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    delete window.desktop;
  });

  it("renders the agreed invoke shell, workflow/work-unit rows, and propagation preview", async () => {
    await renderHarness();

    expect(screen.getByText("Step execution detail")).toBeTruthy();
    expect(screen.getByText("Invoke targets, completion rule & propagation preview")).toBeTruthy();
    expect(screen.getByText("Target kind")).toBeTruthy();
    expect(screen.getAllByText("Work unit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fact backed").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Bound context fact: Research Draft Specs · seed:l3-setup-invoke:setup:mver_bmad_v1_active:fact:research-draft-specs",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Type: work_unit_draft_spec_fact · many · Research")).toBeTruthy();
    expect(screen.getByText("Runtime instances: 1")).toBeTruthy();
    expect(screen.getByText(/#1:\s*{\s*"id":\s*"research-001"/)).toBeTruthy();
    expect(
      screen.getByText(/At least one invoked work-unit transition must complete/i),
    ).toBeTruthy();
    expect(screen.getByText("1 of 3 targets completed")).toBeTruthy();

    expect(screen.getByText("Invoked workflows")).toBeTruthy();
    expect(screen.getAllByText("Draft architecture").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Security review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Assess constraints").length).toBeGreaterThan(0);
    expect(screen.getByText("Invoked work-unit paths")).toBeTruthy();
    expect(screen.getAllByText("QA Review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Story: Payments").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Story: Search").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Activation → In Progress").length).toBeGreaterThan(0);
    expect(screen.getAllByText("WU.STORY").length).toBeGreaterThan(0);
    expect(screen.getAllByText("activation_to_in_progress").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("No primary workflows are available for this transition.").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/prefill/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Saved direction")).toBeTruthy();
    expect(screen.getByText("Context direction")).toBeTruthy();
    expect(
      screen.getByRole("combobox", {
        name: /artifact-files-invoke-work-unit-row-2:artifact-brainstorming-session/i,
      }),
    ).toBeTruthy();
    expect(screen.getAllByText("Browse project repo files").length).toBeGreaterThan(0);
    expect(screen.getByText("Mapping warnings")).toBeTruthy();
    expect(
      screen.getByText(
        "Brief Path: docs/missing.md will not be mapped (file is missing from the repo).",
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("Condition tree").length).toBeGreaterThan(0);
    expect(screen.getByText("setup_work_unit must exist")).toBeTruthy();
    expect(
      screen.getAllByText("Work-unit fact 'setup_work_unit' is missing").length,
    ).toBeGreaterThan(0);

    expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Start workflow" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Start work unit" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Complete Step" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Open workflow" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Open work unit" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open transition" })).toBeTruthy();

    expect(screen.getByText("Completion-time outputs")).toBeTruthy();
    expect(screen.getByText("Story draft specs")).toBeTruthy();
    expect(screen.getByText("story_draft_specs")).toBeTruthy();
    expect(screen.getByText("Story workflow references")).toBeTruthy();
  });

  it("starts workflow/work-unit targets, refetches detail, and completes the invoke step", async () => {
    const user = userEvent.setup();
    const harness = await renderHarness();

    await user.click(screen.getByRole("button", { name: "Start workflow" }));

    await waitFor(() => expect(harness.startWorkflowCalls).toHaveLength(1));
    expect(harness.startWorkflowCalls[0]).toMatchObject({
      projectId: "project-1",
      stepExecutionId: "step-invoke-1",
      invokeWorkflowTargetExecutionId: "invoke-workflow-row-1",
    });

    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: "Open workflow" }).length).toBeGreaterThanOrEqual(
        3,
      ),
    );
    await waitFor(() => expect(harness.detailQueryCalls()).toBeGreaterThan(1));

    await user.selectOptions(
      screen.getByRole("combobox", { name: "invoke-primary-workflow-invoke-work-unit-row-2" }),
      "workflow-primary-2",
    );
    const overrideInput = screen.getByDisplayValue("Saved direction");
    await user.clear(overrideInput);
    await user.type(overrideInput, "Operator override");
    await user.click(screen.getAllByRole("button", { name: "Start work unit" }).at(1)!);

    await waitFor(() => expect(harness.startWorkUnitCalls).toHaveLength(1));
    expect(harness.startWorkUnitCalls[0]).toMatchObject({
      projectId: "project-1",
      stepExecutionId: "step-invoke-1",
      invokeWorkUnitTargetExecutionId: "invoke-work-unit-row-2",
      workflowDefinitionId: "workflow-primary-2",
      runtimeFactValues: expect.arrayContaining([
        {
          workUnitFactDefinitionId: "fact-story-direction",
          valueJson: "Operator override",
        },
      ]),
    });

    await waitFor(() => expect(screen.getAllByText("In Progress").length).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: "Complete Step" }));

    await waitFor(() => expect(harness.completeCalls).toHaveLength(1));
    expect(harness.completeCalls[0]).toMatchObject({
      projectId: "project-1",
      workflowExecutionId: "workflow-parent-1",
      stepExecutionId: "step-invoke-1",
    });

    await waitFor(() => expect(screen.queryByRole("button", { name: "Complete Step" })).toBeNull());
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
  });

  it("saves invoke mappings and rehydrates server-evaluated gate detail", async () => {
    const user = userEvent.setup();
    const harness = await renderHarness();

    await user.click(screen.getAllByRole("button", { name: "Save mappings" })[0]!);

    await waitFor(() => expect(harness.saveDraftCalls).toHaveLength(1));
    expect(harness.saveDraftCalls[0]).toMatchObject({
      projectId: "project-1",
      stepExecutionId: "step-invoke-1",
      invokeWorkUnitTargetExecutionId: "invoke-work-unit-row-1",
    });
    expect(harness.detailQueryCalls()).toBeGreaterThan(1);
  });

  it("shows saved mapping values separately from refill sources and reapplies authored prefills", async () => {
    const user = userEvent.setup();
    await renderHarness();

    expect(screen.getAllByText("Saved mapping value").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Available refill value").length).toBeGreaterThan(0);
    expect(screen.getByText("Saved direction")).toBeTruthy();
    expect(screen.getByText("Context direction")).toBeTruthy();
    expect(screen.getByText("Literal outcome")).toBeTruthy();

    const directionInput = screen.getByDisplayValue("Saved direction");
    await user.clear(directionInput);
    await user.type(directionInput, "Manual direction");
    await user.click(
      screen.getByRole("button", {
        name: "Refill from context fact for Selected Direction",
      }),
    );
    expect(screen.getByDisplayValue("Context direction")).toBeTruthy();

    const outcomeInput = screen.getByDisplayValue("Literal outcome");
    await user.clear(outcomeInput);
    await user.type(outcomeInput, "Manual outcome");
    await user.click(
      screen.getByRole("button", {
        name: "Refill from literal for Desired Outcome",
      }),
    );
    expect(screen.getByDisplayValue("Literal outcome")).toBeTruthy();
  });

  it("normalizes artifact values to repo-relative paths and offers full-path copy actions", async () => {
    await renderHarness({
      ...buildDetail(),
      body: {
        ...buildDetail().body,
        workUnitTargets: buildDetail().body.workUnitTargets.map((row: any) =>
          row.invokeWorkUnitTargetExecutionId === "invoke-work-unit-row-2"
            ? {
                ...row,
                bindingPreview: row.bindingPreview.map((binding: any) =>
                  binding.destinationDefinitionId === "artifact-brainstorming-session"
                    ? {
                        ...binding,
                        savedDraftValueJson: {
                          relativePath: "cf_setup_brainstorming_draft_spec.json",
                        },
                        resolvedValueJson: {
                          relativePath: "cf_setup_brainstorming_draft_spec.json",
                        },
                      }
                    : binding,
                ),
              }
            : row,
        ),
      },
    });

    expect(screen.getAllByText("cf_setup_brainstorming_draft_spec.json").length).toBeGreaterThan(0);
    expect(
      screen.queryByText('{"relativePath":"cf_setup_brainstorming_draft_spec.json"}'),
    ).toBeNull();
    expect(
      screen.getAllByRole("button", {
        name: "Copy full path for cf_setup_brainstorming_draft_spec.json",
      }).length,
    ).toBeGreaterThan(0);
  });

  it("keeps blocked start and complete actions disabled while surfacing their reasons", async () => {
    const user = userEvent.setup();
    const harness = await renderHarness({
      ...buildDetail(),
      shell: {
        ...buildDetail().shell,
        completionAction: {
          kind: "complete_step_execution",
          visible: true,
          enabled: false,
          reasonIfDisabled: "No invoke targets resolved",
        },
      },
      body: {
        ...buildDetail().body,
        completionSummary: {
          mode: "manual",
          eligible: false,
          reasonIfIneligible: "No invoke targets resolved",
          totalTargets: 0,
          completedTargets: 0,
        },
      },
    });

    const startButtons = screen.getAllByRole("button", { name: "Start work unit" });
    const blockedStartButton = startButtons.at(0)!;
    expect(blockedStartButton).toHaveProperty("disabled", true);
    expect(screen.queryByRole("button", { name: "Complete Step" })).toBeNull();
    expect(screen.getAllByText("No invoke targets resolved").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("No primary workflows are available for this transition.").length,
    ).toBeGreaterThan(0);

    await user.click(blockedStartButton);

    expect(harness.startWorkUnitCalls).toHaveLength(0);
    expect(harness.completeCalls).toHaveLength(0);
  });

  it("prefers the Electron system file selector for runtime artifact bindings when the desktop bridge is available", async () => {
    const user = userEvent.setup();
    const selectFiles = vi
      .fn()
      .mockResolvedValueOnce(["/tmp/project-1/docs/brief.md"])
      .mockResolvedValueOnce(["/tmp/project-1/docs/brief.md", "/tmp/project-1/docs/notes.md"]);
    window.desktop = {
      runtime: {},
      getRuntimeStatus: vi.fn(),
      recoverLocalServices: vi.fn(),
      selectProjectRootDirectory: vi.fn(),
      selectFiles,
    };

    const harness = await renderHarness();

    expect(
      screen.getByRole("combobox", {
        name: /artifact-files-invoke-work-unit-row-2:artifact-brainstorming-session/i,
      }),
    ).toBeTruthy();
    expect(screen.getByText("Choose file")).toBeTruthy();

    await user.click(
      screen.getByRole("combobox", {
        name: /artifact-files-invoke-work-unit-row-2:artifact-brainstorming-session/i,
      }),
    );

    await waitFor(() => expect(selectFiles).toHaveBeenCalledOnce());
    expect(selectFiles).toHaveBeenNthCalledWith(1, {
      multiple: false,
      title: "Select file for Brainstorming Session",
      buttonLabel: "Select file",
      defaultPath: "/tmp/project-1",
    });
    expect(harness.getProjectDetailsQueryOptionsMock).toHaveBeenCalled();
    await waitFor(() =>
      expect(harness.getProjectRepoFileStatusesQueryOptionsMock).toHaveBeenCalledWith({
        input: {
          projectId: "project-1",
          relativePaths: ["docs/brief.md"],
        },
      }),
    );
    expect(screen.getAllByText("docs/brief.md").length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("combobox", {
        name: /artifact-files-invoke-work-unit-row-2:artifact-supporting-files/i,
      }),
    );

    await waitFor(() => expect(selectFiles).toHaveBeenCalledTimes(2));
    expect(selectFiles).toHaveBeenNthCalledWith(2, {
      multiple: true,
      title: "Select files for Supporting Files",
      buttonLabel: "Select files",
      defaultPath: "/tmp/project-1",
    });
    await waitFor(() =>
      expect(harness.getProjectRepoFileStatusesQueryOptionsMock).toHaveBeenCalledWith({
        input: {
          projectId: "project-1",
          relativePaths: ["docs/brief.md", "docs/notes.md"],
        },
      }),
    );
    expect(screen.getByText("docs/notes.md")).toBeTruthy();
  });
});
