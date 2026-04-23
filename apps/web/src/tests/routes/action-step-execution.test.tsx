import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.VITE_SERVER_URL ??= "http://localhost:3000";
(import.meta as any).env = {
  ...(import.meta as any).env,
  VITE_SERVER_URL: "http://localhost:3000",
};

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
  Card: ({ children, ...props }: React.ComponentProps<"section">) => (
    <section {...props}>{children}</section>
  ),
  CardHeader: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div {...props}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardFooter: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ render, children }: { render?: ReactNode; children?: ReactNode }) => (
    <>{render ?? children}</>
  ),
  CollapsibleContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandInput: (props: React.ComponentProps<"input">) => <input {...props} />,
  CommandItem: ({ children, onSelect }: any) => (
    <button type="button" onClick={() => onSelect?.()}>
      {children}
    </button>
  ),
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ render, children }: { render?: ReactNode; children?: ReactNode }) => (
    <>{render ?? children}</>
  ),
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.ComponentProps<"textarea">) => <textarea {...props} />,
}));

vi.mock("@/features/workflow-editor/agent-step-tabs/model-selector", () => ({
  ModelSelector: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModelSelectorTrigger: ({ render }: { render?: ReactNode }) => <>{render}</>,
  ModelSelectorContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModelSelectorInput: (props: React.ComponentProps<"input">) => <input {...props} />,
  ModelSelectorList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModelSelectorEmpty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModelSelectorGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModelSelectorItem: ({ children, onSelect }: any) => (
    <button type="button" onClick={() => onSelect?.()}>
      {children}
    </button>
  ),
  ModelSelectorLogo: () => <span />,
  ModelSelectorLogoGroup: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  ModelSelectorName: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  ModelSelectorSeparator: () => <hr />,
}));

vi.mock("@/components/elements/ai-reasoning", () => ({
  AiReasoning: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AiReasoningContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AiReasoningText: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AiReasoningTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/elements/ai-tool-call", () => ({
  AiToolCall: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AiToolCallContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AiToolCallError: ({ error }: { error: string }) => <div>{error}</div>,
  AiToolCallHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AiToolCallInput: ({ input }: { input: unknown }) => <div>{JSON.stringify(input)}</div>,
  AiToolCallOutput: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ai-elements/prompt-input", () => ({
  PromptInput: ({ children }: { children: ReactNode }) => <form>{children}</form>,
  PromptInputBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PromptInputFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PromptInputSubmit: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  PromptInputTextarea: (props: React.ComponentProps<"textarea">) => <textarea {...props} />,
  PromptInputTools: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@chiron/env/web", () => ({
  env: {
    VITE_SERVER_URL: "http://localhost:3000",
  },
}));

function buildDetail(): any {
  return {
    shell: {
      stepExecutionId: "step-action-1",
      workflowExecutionId: "workflow-1",
      stepDefinitionId: "action-step-def-1",
      stepType: "action" as const,
      status: "active" as const,
      activatedAt: "2026-04-17T12:00:00.000Z",
      completedAt: undefined,
      completionAction: {
        kind: "complete_step_execution" as const,
        visible: true,
        enabled: false,
        reasonIfDisabled: "Complete remains blocked until at least one action succeeds.",
      },
    },
    body: {
      stepType: "action" as const,
      executionMode: "sequential" as const,
      runtimeRowPolicy: "lazy_on_first_execution" as const,
      duplicateRunPolicy: "idempotent_noop" as const,
      duplicateRetryPolicy: "idempotent_noop" as const,
      completionSummary: {
        mode: "manual" as const,
        eligible: false,
        requiresAtLeastOneSucceededAction: true as const,
        blockedByRunningActions: true as const,
        reasonIfIneligible: "Complete remains blocked until at least one action succeeds.",
      },
      actions: [
        {
          actionId: "action-1",
          actionKey: "propagate-summary",
          label: "Propagate Summary",
          enabled: true,
          sortOrder: 100,
          actionKind: "propagation" as const,
          contextFactDefinitionId: "ctx-summary",
          contextFactKey: "summary",
          contextFactKind: "bound_fact" as const,
          status: "not_started" as const,
          items: [
            {
              itemId: "item-1",
              itemKey: "summary-value",
              label: "Summary Value",
              sortOrder: 100,
              targetContextFactDefinitionId: "ctx-summary",
              targetContextFactKey: "summary",
              targetContextFactKind: "bound_fact" as const,
              status: "not_started" as const,
              affectedTargets: [
                {
                  targetKind: "external_fact" as const,
                  targetState: "missing" as const,
                  label: "summary",
                },
              ],
              propagationMappings: [
                {
                  targetKind: "external_fact" as const,
                  operationKind: "create" as const,
                  label: "summary",
                  nextValueJson: { value: { title: "summary next" } },
                },
              ],
              skipAction: {
                kind: "skip_action_step_action_items" as const,
                enabled: true,
                actionId: "action-1",
                itemId: "item-1",
              },
            },
          ],
          runAction: {
            kind: "run_action_step_actions" as const,
            enabled: true,
            actionId: "action-1",
          },
          retryAction: {
            kind: "retry_action_step_actions" as const,
            enabled: false,
            reasonIfDisabled: "Only needs-attention actions are retryable.",
            actionId: "action-1",
          },
          skipAction: {
            kind: "skip_action_step_actions" as const,
            enabled: true,
            actionId: "action-1",
          },
        },
        {
          actionId: "action-2",
          actionKey: "propagate-environment",
          label: "Propagate Environment",
          enabled: true,
          sortOrder: 200,
          actionKind: "propagation" as const,
          contextFactDefinitionId: "ctx-environment",
          contextFactKey: "environment",
          contextFactKind: "bound_fact" as const,
          status: "not_started" as const,
          items: [
            {
              itemId: "item-2",
              itemKey: "environment-value",
              label: "Environment Value",
              sortOrder: 100,
              targetContextFactDefinitionId: "ctx-environment",
              targetContextFactKey: "environment",
              targetContextFactKind: "bound_fact" as const,
              status: "not_started" as const,
              affectedTargets: [
                {
                  targetKind: "external_fact" as const,
                  targetState: "exists" as const,
                  label: "environment",
                },
              ],
              propagationMappings: [
                {
                  targetKind: "external_fact" as const,
                  operationKind: "no_op" as const,
                  targetId: "env-1",
                  label: "environment",
                  previousValueJson: { factInstanceId: "env-1", value: { env: "prod" } },
                  nextValueJson: { factInstanceId: "env-1", value: { env: "prod" } },
                },
              ],
              skipAction: {
                kind: "skip_action_step_action_items" as const,
                enabled: true,
                actionId: "action-2",
                itemId: "item-2",
              },
            },
          ],
          runAction: {
            kind: "run_action_step_actions" as const,
            enabled: false,
            reasonIfDisabled:
              "Sequential mode requires all earlier enabled actions to succeed first.",
            actionId: "action-2",
          },
          retryAction: {
            kind: "retry_action_step_actions" as const,
            enabled: false,
            reasonIfDisabled: "Only needs-attention actions are retryable.",
            actionId: "action-2",
          },
          skipAction: {
            kind: "skip_action_step_actions" as const,
            enabled: true,
            actionId: "action-2",
          },
        },
        {
          actionId: "action-3",
          actionKey: "propagate-artifact",
          label: "Propagate Artifact",
          enabled: true,
          sortOrder: 300,
          actionKind: "propagation" as const,
          contextFactDefinitionId: "ctx-artifact",
          contextFactKey: "artifact_ref",
          contextFactKind: "artifact_slot_reference_fact" as const,
          status: "needs_attention" as const,
          resultSummaryJson: { summary: "Missing bound target." },
          items: [
            {
              itemId: "item-3",
              itemKey: "artifact-value",
              label: "Artifact Value",
              sortOrder: 100,
              targetContextFactDefinitionId: "ctx-artifact",
              targetContextFactKey: "artifact_ref",
              targetContextFactKind: "artifact_slot_reference_fact" as const,
              status: "needs_attention" as const,
              resultSummaryJson: { summary: "Missing bound target." },
              affectedTargets: [
                {
                  targetKind: "artifact" as const,
                  targetState: "missing" as const,
                  label: "artifact_ref",
                },
              ],
              propagationMappings: [
                {
                  targetKind: "artifact" as const,
                  operationKind: "update" as const,
                  label: "artifact_ref",
                  previousValueJson: {
                    slotDefinitionId: "slot-1",
                    files: [{ filePath: "docs/old.md", status: "present" }],
                  },
                  nextValueJson: {
                    slotDefinitionId: "slot-1",
                    files: [{ filePath: "docs/new.md", status: "present" }],
                  },
                },
              ],
              recoveryAction: {
                kind: "recreate_bound_target_from_context_value" as const,
                enabled: true,
              },
              skipAction: {
                kind: "skip_action_step_action_items" as const,
                enabled: true,
                actionId: "action-3",
                itemId: "item-3",
              },
            },
          ],
          runAction: {
            kind: "run_action_step_actions" as const,
            enabled: true,
            actionId: "action-3",
          },
          retryAction: {
            kind: "retry_action_step_actions" as const,
            enabled: true,
            actionId: "action-3",
          },
          skipAction: {
            kind: "skip_action_step_actions" as const,
            enabled: true,
            actionId: "action-3",
          },
        },
      ],
    },
  };
}

async function renderHarness(initialDetail = buildDetail()) {
  const { RuntimeFormStepDetailRoute, runtimeStepExecutionDetailQueryKey } =
    await import("../../routes/projects.$projectId.step-executions.$stepExecutionId");
  let currentDetail: any = initialDetail;
  const runCalls: Array<Record<string, unknown>> = [];
  const retryCalls: Array<Record<string, unknown>> = [];
  const skipActionCalls: Array<Record<string, unknown>> = [];
  const skipItemCalls: Array<Record<string, unknown>> = [];
  const completeCalls: Array<Record<string, unknown>> = [];
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  const getRuntimeStepExecutionDetailQueryOptionsMock = vi.fn(
    (_input: { input: { projectId: string; stepExecutionId: string } }) => ({
      queryKey: ["runtime-step-execution-detail", "project-1", "step-action-1"],
      queryFn: async () => currentDetail,
    }),
  );

  const getAgentStepExecutionDetailQueryOptionsMock = vi.fn(() => ({
    queryKey: ["runtime-agent-step-execution-detail", "project-1", "step-action-1"],
    queryFn: async () => ({ body: { stepType: "agent" as const } }),
  }));

  const runActionStepActionsMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        runCalls.push(input);
        currentDetail = {
          ...currentDetail,
          shell: {
            ...currentDetail.shell,
            completionAction: {
              kind: "complete_step_execution",
              visible: true,
              enabled: true,
            },
          },
          body: {
            ...currentDetail.body,
            completionSummary: {
              mode: "manual",
              eligible: true,
              requiresAtLeastOneSucceededAction: true,
              blockedByRunningActions: true,
            },
            actions: currentDetail.body.actions.map(
              (action: (typeof currentDetail.body.actions)[number]) =>
                action.actionId === "action-1"
                  ? {
                      ...action,
                      status: "succeeded",
                      resultSummaryJson: { summary: "Propagated successfully." },
                      items: action.items.map((item: (typeof action.items)[number]) => ({
                        ...item,
                        status: "succeeded",
                        resultSummaryJson: { summary: "Summary propagated." },
                        affectedTargets: [
                          {
                            targetKind: "external_fact",
                            targetState: "exists" as const,
                            targetId: "fact-1",
                            label: "Existing Summary Fact",
                          },
                        ],
                      })),
                      retryAction: {
                        kind: "retry_action_step_actions",
                        enabled: false,
                        reasonIfDisabled: "Only needs-attention actions are retryable.",
                        actionId: "action-1",
                      },
                    }
                  : action.actionId === "action-2"
                    ? {
                        ...action,
                        runAction: {
                          kind: "run_action_step_actions",
                          enabled: true,
                          actionId: "action-2",
                        },
                      }
                    : action,
            ),
          },
        } as any;
        queryClient.setQueryData(
          runtimeStepExecutionDetailQueryKey("project-1", "step-action-1"),
          currentDetail,
        );
        await options?.onSuccess?.();
        return {
          stepExecutionId: "step-action-1",
          actionResults: [{ actionId: "action-1", result: "started" as const }],
        };
      },
    }),
  );

  const retryActionStepActionsMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        retryCalls.push(input);
        currentDetail = {
          ...currentDetail,
          shell: {
            ...currentDetail.shell,
            completionAction: {
              kind: "complete_step_execution",
              visible: true,
              enabled: true,
            },
          },
          body: {
            ...currentDetail.body,
            completionSummary: {
              mode: "manual",
              eligible: true,
              requiresAtLeastOneSucceededAction: true,
              blockedByRunningActions: true,
            },
            actions: currentDetail.body.actions.map(
              (action: (typeof currentDetail.body.actions)[number]) =>
                action.actionId === "action-3"
                  ? {
                      ...action,
                      status: "succeeded",
                      resultSummaryJson: { summary: "Artifact recreated." },
                      items: action.items.map((item: (typeof action.items)[number]) => ({
                        ...item,
                        status: "succeeded",
                        resultSummaryJson: { summary: "Artifact propagated." },
                        affectedTargets: [
                          {
                            targetKind: "artifact",
                            targetState: "exists" as const,
                            targetId: "artifact-1",
                            label: "docs/setup.md",
                          },
                        ],
                      })),
                      retryAction: {
                        kind: "retry_action_step_actions",
                        enabled: false,
                        reasonIfDisabled: "Only needs-attention actions are retryable.",
                        actionId: "action-3",
                      },
                    }
                  : action,
            ),
          },
        } as any;
        queryClient.setQueryData(
          runtimeStepExecutionDetailQueryKey("project-1", "step-action-1"),
          currentDetail,
        );
        await options?.onSuccess?.();
        return {
          stepExecutionId: "step-action-1",
          actionResults: [{ actionId: "action-3", result: "started" as const }],
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
            completedAt: "2026-04-17T12:05:00.000Z",
            completionAction: {
              kind: "complete_step_execution",
              visible: false,
              enabled: false,
            },
          },
        } as any;
        queryClient.setQueryData(
          runtimeStepExecutionDetailQueryKey("project-1", "step-action-1"),
          currentDetail,
        );
        await options?.onSuccess?.();
        return { stepExecutionId: "step-action-1", status: "completed" as const };
      },
    }),
  );

  const skipActionStepActionsMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        skipActionCalls.push(input);
        const targetActionId = input.actionIds?.[0];
        currentDetail = {
          ...currentDetail,
          body: {
            ...currentDetail.body,
            actions: currentDetail.body.actions.map((action: any) =>
              action.actionId === targetActionId
                ? {
                    ...action,
                    status: "skipped",
                    resultSummaryJson: { status: "skipped", reason: "Skipped by operator." },
                    items: action.items.map((item: any) => ({
                      ...item,
                      status: "skipped",
                      resultSummaryJson: { status: "skipped" },
                    })),
                    skipAction: {
                      kind: "skip_action_step_actions",
                      enabled: false,
                      reasonIfDisabled: "Action was already skipped.",
                      actionId: action.actionId,
                    },
                  }
                : action,
            ),
          },
        } as any;
        queryClient.setQueryData(
          runtimeStepExecutionDetailQueryKey("project-1", "step-action-1"),
          currentDetail,
        );
        await options?.onSuccess?.();
        return {
          stepExecutionId: "step-action-1",
          actionResults: [{ actionId: targetActionId, result: "skipped" as const }],
        };
      },
    }),
  );

  const skipActionStepActionItemsMutationOptionsMock = vi.fn(
    (options?: { onSuccess?: () => Promise<void> | void }) => ({
      mutationFn: async (input: Record<string, any>) => {
        skipItemCalls.push(input);
        const targetItemId = input.itemIds?.[0];
        currentDetail = {
          ...currentDetail,
          body: {
            ...currentDetail.body,
            actions: currentDetail.body.actions.map((action: any) => {
              if (action.actionId !== input.actionId) {
                return action;
              }

              return {
                ...action,
                status: "succeeded",
                resultSummaryJson: { status: "succeeded", reason: "Skipped item repaired row." },
                items: action.items.map((item: any) =>
                  item.itemId === targetItemId
                    ? {
                        ...item,
                        status: "skipped",
                        resultSummaryJson: { status: "skipped" },
                        skipAction: {
                          kind: "skip_action_step_action_items",
                          enabled: false,
                          reasonIfDisabled: "Item was already skipped.",
                          actionId: input.actionId,
                          itemId: item.itemId,
                        },
                      }
                    : item,
                ),
              };
            }),
          },
        } as any;
        queryClient.setQueryData(
          runtimeStepExecutionDetailQueryKey("project-1", "step-action-1"),
          currentDetail,
        );
        await options?.onSuccess?.();
        return {
          stepExecutionId: "step-action-1",
          actionId: input.actionId,
          itemResults: [{ itemId: targetItemId, result: "skipped" as const }],
        };
      },
    }),
  );

  useParamsMock.mockReturnValue({ projectId: "project-1", stepExecutionId: "step-action-1" });
  useRouteContextMock.mockReturnValue({
    queryClient,
    orpc: {
      project: {
        getRuntimeStepExecutionDetail: {
          queryOptions: getRuntimeStepExecutionDetailQueryOptionsMock,
        },
        getAgentStepExecutionDetail: {
          queryOptions: getAgentStepExecutionDetailQueryOptionsMock,
        },
        runActionStepActions: {
          mutationOptions: runActionStepActionsMutationOptionsMock,
        },
        retryActionStepActions: {
          mutationOptions: retryActionStepActionsMutationOptionsMock,
        },
        skipActionStepActions: {
          mutationOptions: skipActionStepActionsMutationOptionsMock,
        },
        skipActionStepActionItems: {
          mutationOptions: skipActionStepActionItemsMutationOptionsMock,
        },
        completeActionStepExecution: {
          mutationOptions: completeStepExecutionMutationOptionsMock,
        },
        activateWorkflowStepExecution: {
          mutationOptions: vi.fn(() => ({
            mutationFn: async () => ({ stepExecutionId: "step-next-1" }),
          })),
        },
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RuntimeFormStepDetailRoute />
    </QueryClientProvider>,
  );

  await waitFor(() =>
    expect(
      queryClient.getQueryData(runtimeStepExecutionDetailQueryKey("project-1", "step-action-1")),
    ).toBeTruthy(),
  );

  return { runCalls, retryCalls, skipActionCalls, skipItemCalls, completeCalls };
}

describe("action step execution route", () => {
  beforeEach(() => {
    cleanup();
    useRouteContextMock.mockReset();
    useParamsMock.mockReset();
  });

  it("renders locked run, retry, and completion states from the runtime payload", async () => {
    await renderHarness();

    expect(await screen.findByText(/Action runtime/i)).toBeTruthy();
    expect(screen.getByText(/Run propagation rows under the locked Plan A rules/i)).toBeTruthy();
    expect(screen.getAllByText(/Sequential/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Lazy rows/i)).toBeTruthy();
    expect(screen.queryByText(/Connected/i)).toBeNull();

    const secondRow = screen.getByTestId("action-runtime-row-action-2");
    expect(within(secondRow).getByText(/^bound fact$/i)).toBeTruthy();
    expect(within(secondRow).getByText(/Previous external value/i)).toBeTruthy();
    expect(within(secondRow).getByText(/Next propagated value/i)).toBeTruthy();
    expect(within(secondRow).getByText(/already in sync/i)).toBeTruthy();
    expect(
      within(secondRow).getByText(
        /Sequential mode requires all earlier enabled actions to succeed first/i,
      ),
    ).toBeTruthy();
    expect(within(secondRow).getByRole("button", { name: /run action/i })).toHaveProperty(
      "disabled",
      true,
    );
    expect(within(secondRow).getByRole("button", { name: /skip action/i })).toHaveProperty(
      "disabled",
      false,
    );
    expect(within(secondRow).getByRole("button", { name: /skip item/i })).toHaveProperty(
      "disabled",
      false,
    );

    const thirdRow = screen.getByTestId("action-runtime-row-action-3");
    expect(within(thirdRow).getAllByText(/Needs attention/i).length).toBeGreaterThan(0);
    expect(within(thirdRow).getByRole("button", { name: /retry action/i })).toHaveProperty(
      "disabled",
      false,
    );
    expect(within(thirdRow).getByText(/Recovery available/i)).toBeTruthy();
    expect(within(thirdRow).getByRole("button", { name: /skip item/i })).toHaveProperty(
      "disabled",
      false,
    );
    expect(screen.getAllByText(/Item target context/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^summary$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^environment$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^artifact_ref$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^exists$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^missing$/i).length).toBeGreaterThan(0);

    expect(
      screen.getAllByText(/Complete remains blocked until at least one action succeeds/i).length,
    ).toBeGreaterThan(0);
  });

  it("runs an enabled action and unlocks later sequential rows plus completion", async () => {
    const user = userEvent.setup();
    const { runCalls } = await renderHarness();

    const firstRow = await screen.findByTestId("action-runtime-row-action-1");
    await user.click(within(firstRow).getByRole("button", { name: /run action/i }));

    await waitFor(() =>
      expect(runCalls).toEqual([
        {
          projectId: "project-1",
          stepExecutionId: "step-action-1",
          actionIds: ["action-1"],
        },
      ]),
    );

    await screen.findByTestId("action-runtime-row-action-2");
    await waitFor(() =>
      expect(
        within(screen.getByTestId("action-runtime-row-action-2")).getByRole("button", {
          name: /run action/i,
        }),
      ).toHaveProperty("disabled", false),
    );

    expect((await screen.findAllByText(/Ready to complete/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Existing Summary Fact/i)).toBeTruthy();
  });

  it("retries a needs-attention row and then completes the step", async () => {
    const user = userEvent.setup();
    const { retryCalls, completeCalls } = await renderHarness();

    const thirdRow = await screen.findByTestId("action-runtime-row-action-3");
    await user.click(within(thirdRow).getByRole("button", { name: /retry action/i }));

    await waitFor(() =>
      expect(retryCalls).toEqual([
        {
          projectId: "project-1",
          stepExecutionId: "step-action-1",
          actionIds: ["action-3"],
        },
      ]),
    );

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /complete step/i }).length).toBeGreaterThan(0),
    );
    await user.click(screen.getAllByRole("button", { name: /complete step/i })[0]!);

    await waitFor(() =>
      expect(completeCalls).toEqual([
        {
          projectId: "project-1",
          stepExecutionId: "step-action-1",
        },
      ]),
    );

    expect((await screen.findAllByText(/Completed/i)).length).toBeGreaterThan(0);
  });

  it("supports skipping whole actions and individual items at runtime", async () => {
    const user = userEvent.setup();
    const { skipActionCalls, skipItemCalls } = await renderHarness();

    const secondRow = await screen.findByTestId("action-runtime-row-action-2");
    await user.click(within(secondRow).getByRole("button", { name: /skip action/i }));

    await waitFor(() =>
      expect(skipActionCalls).toEqual([
        {
          projectId: "project-1",
          stepExecutionId: "step-action-1",
          actionIds: ["action-2"],
        },
      ]),
    );

    const thirdItem = await screen.findByTestId("action-runtime-item-item-3");
    await user.click(within(thirdItem).getByRole("button", { name: /skip item/i }));

    await waitFor(() =>
      expect(skipItemCalls).toEqual([
        {
          projectId: "project-1",
          stepExecutionId: "step-action-1",
          actionId: "action-3",
          itemIds: ["item-3"],
        },
      ]),
    );

    expect(await screen.findAllByText(/Skipped/i)).not.toHaveLength(0);
  });
});
