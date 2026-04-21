import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeConditionEvaluationTree } from "@chiron/contracts/runtime/conditions";

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

function buildDetail(params?: {
  conditionalRoutes?: Array<{
    routeId: string;
    targetStepId: string;
    isValid: boolean;
    sortOrder: number;
    reason?: string;
    evaluationTree?: RuntimeConditionEvaluationTree;
  }>;
  defaultTargetStepId?: string | null;
  suggestion?: {
    suggestedTargetStepId: string | null;
    source: "conditional_route" | "default_target" | "none";
    routeId?: string;
  };
  persistedSelection?: {
    selectedTargetStepId: string | null;
    isValid: boolean;
    savedAt?: string;
    blockingReason?: string;
  };
  completionReason?: string;
}) {
  const conditionalRoutes = params?.conditionalRoutes ?? [
    {
      routeId: "route-a",
      targetStepId: "step-next-a",
      isValid: true,
      sortOrder: 0,
    },
    {
      routeId: "route-b",
      targetStepId: "step-next-b",
      isValid: true,
      sortOrder: 1,
    },
    {
      routeId: "route-c",
      targetStepId: "step-next-c",
      isValid: false,
      sortOrder: 2,
      reason: "At least one branch condition failed",
    },
  ];

  const defaultTargetStepId = params?.defaultTargetStepId ?? null;
  const completionReason =
    params?.completionReason ??
    "Branch completion is blocked until a valid target selection is explicitly saved.";

  return {
    shell: {
      stepExecutionId: "step-branch-1",
      workflowExecutionId: "workflow-1",
      stepDefinitionId: "branch-step-def-1",
      stepType: "branch" as const,
      status: "active" as const,
      activatedAt: "2026-04-17T12:00:00.000Z",
      completedAt: undefined,
      completionAction: {
        kind: "complete_step_execution" as const,
        visible: true,
        enabled: false,
        reasonIfDisabled: completionReason,
      },
    },
    body: {
      stepType: "branch" as const,
      resolutionContract: "explicit_save_selection_v1" as const,
      persistedSelection: {
        selectedTargetStepId: null,
        isValid: false,
        ...params?.persistedSelection,
      },
      suggestion: params?.suggestion ?? {
        suggestedTargetStepId: "step-next-a",
        source: "conditional_route" as const,
        routeId: "route-a",
      },
      conditionalRoutes: conditionalRoutes.map((route) => ({
        routeId: route.routeId,
        targetStepId: route.targetStepId,
        sortOrder: route.sortOrder,
        isValid: route.isValid,
        conditionMode: "all" as const,
        evaluationTree:
          route.evaluationTree ??
          ({
            mode: "all" as const,
            met: route.isValid,
            ...(route.reason ? { reason: route.reason } : {}),
            conditions: [],
            groups: [],
          } satisfies RuntimeConditionEvaluationTree),
      })),
      defaultTargetStepId,
      saveSelectionAction: {
        kind: "save_branch_step_selection" as const,
        enabled: true,
      },
      completionSummary: {
        mode: "explicit_saved_selection" as const,
        eligible: false,
        reasonIfIneligible: completionReason,
      },
    },
  };
}

type RuntimeBranchStepDetail = ReturnType<typeof buildDetail>;
type CompletedRuntimeBranchStepDetail = Omit<RuntimeBranchStepDetail, "shell"> & {
  shell: Omit<RuntimeBranchStepDetail["shell"], "status" | "completedAt" | "completionAction"> & {
    status: "completed";
    completedAt: string;
    completionAction: {
      kind: "complete_step_execution";
      visible: false;
      enabled: false;
    };
  };
};

function toCompletedDetail(detail: RuntimeBranchStepDetail): CompletedRuntimeBranchStepDetail {
  return {
    ...detail,
    shell: {
      ...detail.shell,
      status: "completed",
      completedAt: "2026-04-17T12:05:00.000Z",
      completionAction: {
        kind: "complete_step_execution",
        visible: false,
        enabled: false,
      },
    },
  };
}

function isActiveDetail(
  detail: RuntimeBranchStepDetail | CompletedRuntimeBranchStepDetail,
): detail is RuntimeBranchStepDetail {
  return detail.shell.status === "active";
}

async function renderHarness(initialDetail = buildDetail()) {
  let currentDetail: RuntimeBranchStepDetail | CompletedRuntimeBranchStepDetail = initialDetail;
  const saveSelectionCalls: Array<Record<string, unknown>> = [];
  const completeCalls: Array<Record<string, unknown>> = [];

  const getRuntimeStepExecutionDetailQueryOptionsMock = vi.fn(
    (_input: { input: { projectId: string; stepExecutionId: string } }) => ({
      queryKey: ["runtime-step-execution-detail", "project-1", "step-branch-1"],
      queryFn: async () => currentDetail,
    }),
  );

  const getAgentStepExecutionDetailQueryOptionsMock = vi.fn(() => ({
    queryKey: ["runtime-agent-step-execution-detail", "project-1", "step-branch-1"],
    queryFn: async () => ({ body: { stepType: "agent" as const } }),
  }));

  const saveBranchStepSelectionMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        saveSelectionCalls.push(input);
        currentDetail = {
          ...currentDetail,
          shell: {
            ...currentDetail.shell,
            completionAction: {
              kind: "complete_step_execution",
              visible: true,
              enabled: input.selectedTargetStepId !== null,
              ...(input.selectedTargetStepId === null
                ? {
                    reasonIfDisabled:
                      "Branch completion is blocked until a valid target selection is explicitly saved.",
                  }
                : {}),
            },
          },
          body: {
            ...currentDetail.body,
            persistedSelection: {
              selectedTargetStepId: input.selectedTargetStepId,
              isValid: input.selectedTargetStepId !== null,
              savedAt: "2026-04-17T12:03:00.000Z",
              ...(input.selectedTargetStepId === null
                ? {
                    blockingReason:
                      "Branch completion is blocked until a valid target selection is explicitly saved.",
                  }
                : {}),
            },
            completionSummary: {
              mode: "explicit_saved_selection",
              eligible: input.selectedTargetStepId !== null,
              ...(input.selectedTargetStepId === null
                ? {
                    reasonIfIneligible:
                      "Branch completion is blocked until a valid target selection is explicitly saved.",
                  }
                : {}),
            },
          },
        } as typeof currentDetail;
        await options?.onSuccess?.();
        return {
          stepExecutionId: "step-branch-1",
          selectedTargetStepId: input.selectedTargetStepId,
          result: "saved" as const,
        };
      },
    }),
  );

  const completeStepExecutionMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        completeCalls.push(input);
        if (isActiveDetail(currentDetail)) {
          currentDetail = toCompletedDetail(currentDetail);
        } else {
          currentDetail = toCompletedDetail(initialDetail);
        }
        await options?.onSuccess?.();
        return { stepExecutionId: "step-branch-1", status: "completed" as const };
      },
    }),
  );

  const orpc = {
    project: {
      getRuntimeStepExecutionDetail: {
        queryOptions: getRuntimeStepExecutionDetailQueryOptionsMock,
      },
      getAgentStepExecutionDetail: {
        queryOptions: getAgentStepExecutionDetailQueryOptionsMock,
      },
      saveBranchStepSelection: {
        mutationOptions: saveBranchStepSelectionMutationOptionsMock,
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
    stepExecutionId: "step-branch-1",
  });
  useRouteContextMock.mockReturnValue({ orpc, queryClient });

  await queryClient.prefetchQuery({
    ...orpc.project.getRuntimeStepExecutionDetail.queryOptions({
      input: { projectId: "project-1", stepExecutionId: "step-branch-1" },
    }),
    queryKey: runtimeStepExecutionDetailQueryKey("project-1", "step-branch-1"),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RuntimeFormStepDetailRoute />
    </QueryClientProvider>,
  );

  return {
    saveSelectionCalls,
    completeCalls,
  };
}

describe("runtime branch step detail route", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders multi-match routes, keeps suggestion advisory, and completes only after save", async () => {
    const { saveSelectionCalls, completeCalls } = await renderHarness();
    const user = userEvent.setup();

    expect(screen.getByText("Persist a route selection before completion")).toBeTruthy();
    expect(screen.getByText("2 valid routes available.")).toBeTruthy();
    expect(
      screen.getByText("Suggested target step-next-a is advisory only until you save it."),
    ).toBeTruthy();
    expect(screen.queryByText("Complete Step")).toBeNull();

    await user.selectOptions(screen.getByLabelText("branch-selected-target"), "step-next-b");
    await user.click(screen.getByRole("button", { name: "Save selection" }));

    await waitFor(() => {
      expect(saveSelectionCalls).toEqual([
        {
          projectId: "project-1",
          stepExecutionId: "step-branch-1",
          selectedTargetStepId: "step-next-b",
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("Complete Step")).toBeTruthy();
    });

    await user.click(screen.getByText("Complete Step"));

    await waitFor(() => {
      expect(completeCalls).toEqual([
        {
          projectId: "project-1",
          workflowExecutionId: "workflow-1",
          stepExecutionId: "step-branch-1",
        },
      ]);
    });
  });

  it("renders invalid persisted-selection warning for a single valid route", async () => {
    await renderHarness(
      buildDetail({
        conditionalRoutes: [
          {
            routeId: "route-a",
            targetStepId: "step-next-a",
            isValid: true,
            sortOrder: 0,
          },
          {
            routeId: "route-b",
            targetStepId: "step-next-b",
            isValid: false,
            sortOrder: 1,
            reason: "At least one branch condition failed",
          },
        ],
        persistedSelection: {
          selectedTargetStepId: "step-stale",
          isValid: false,
          savedAt: "2026-04-17T12:02:00.000Z",
          blockingReason:
            "Branch completion is blocked because the saved target selection is no longer valid.",
        },
        suggestion: {
          suggestedTargetStepId: "step-next-a",
          source: "conditional_route",
          routeId: "route-a",
        },
        completionReason:
          "Branch completion is blocked because the saved target selection is no longer valid.",
      }),
    );

    expect(screen.getByText("1 valid route available.")).toBeTruthy();
    expect(
      screen.getByText(
        "Saved target step-stale is no longer valid. Save a new target before completing this branch.",
      ),
    ).toBeTruthy();
    expect(
      screen.getAllByText(
        "Branch completion is blocked because the saved target selection is no longer valid.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("renders the no-valid-match state with a default suggestion", async () => {
    await renderHarness(
      buildDetail({
        conditionalRoutes: [
          {
            routeId: "route-a",
            targetStepId: "step-next-a",
            isValid: false,
            sortOrder: 0,
            reason: "No ANY branch satisfied",
          },
        ],
        defaultTargetStepId: "step-default",
        suggestion: {
          suggestedTargetStepId: "step-default",
          source: "default_target",
        },
      }),
    );

    expect(
      screen.getByText(
        "No valid routes matched. A default target is available to save explicitly.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Suggested target step-default is advisory only until you save it."),
    ).toBeTruthy();
    expect(screen.getByText("Default target: step-default")).toBeTruthy();
  });

  it("renders the no-valid-match state without a default target", async () => {
    await renderHarness(
      buildDetail({
        conditionalRoutes: [
          {
            routeId: "route-a",
            targetStepId: "step-next-a",
            isValid: false,
            sortOrder: 0,
            reason: "No ANY branch satisfied",
          },
        ],
        defaultTargetStepId: null,
        suggestion: {
          suggestedTargetStepId: null,
          source: "none",
        },
      }),
    );

    expect(
      screen.getByText("No valid routes matched and no default target is available."),
    ).toBeTruthy();
    expect(
      screen.getByText("No valid targets are available to save from the current server payload."),
    ).toBeTruthy();
  });

  it("renders nested condition-level branch evaluation details", async () => {
    await renderHarness(
      buildDetail({
        conditionalRoutes: [
          {
            routeId: "route-evidence",
            targetStepId: "step-next-a",
            isValid: false,
            sortOrder: 0,
            reason: "At least one branch condition failed",
            evaluationTree: {
              mode: "all",
              met: false,
              reason: "At least one branch condition failed",
              conditions: [],
              groups: [
                {
                  mode: "all",
                  met: true,
                  conditions: [
                    {
                      met: true,
                      condition: {
                        kind: "fact",
                        factDefinitionId: "fact-requires-brainstorming",
                        factKey: "requires_brainstorming",
                        operator: "equals",
                        comparisonJson: { value: true },
                      },
                    },
                  ],
                  groups: [],
                },
                {
                  mode: "any",
                  met: false,
                  reason: "No ANY branch satisfied",
                  conditions: [
                    {
                      met: false,
                      reason: "Context fact 'branch_note' did not satisfy equals",
                      condition: {
                        kind: "fact",
                        factDefinitionId: "fact-branch-note",
                        factKey: "branch_note",
                        operator: "equals",
                        comparisonJson: { value: "brainstorm_then_research" },
                      },
                    },
                  ],
                  groups: [],
                },
              ],
            },
          },
        ],
      }),
    );

    expect(screen.getAllByText("ALL group").length).toBeGreaterThan(0);
    expect(screen.getByText("requires_brainstorming equals true")).toBeTruthy();
    expect(screen.getByText("ANY group")).toBeTruthy();
    expect(screen.getByText("branch_note equals brainstorm_then_research")).toBeTruthy();
    expect(screen.getByText("Context fact 'branch_note' did not satisfy equals")).toBeTruthy();
  });
});
