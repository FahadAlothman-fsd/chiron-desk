import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useParamsMock, useNavigateMock, useSSEMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useParamsMock: vi.fn(),
  useNavigateMock: vi.fn(),
  useSSEMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useParams: useParamsMock,
    useNavigate: () => useNavigateMock,
  }),
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ title, children }: { title: string; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/lib/use-sse", () => ({
  useSSE: (...args: unknown[]) => useSSEMock(...args),
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

import {
  RuntimeFormStepDetailRoute,
  agentStepTimelineQueryKey,
  runtimeAgentStepExecutionDetailQueryKey,
  runtimeStepExecutionDetailQueryKey,
} from "../../routes/projects.$projectId.step-executions.$stepExecutionId";

type AgentState =
  | "not_started"
  | "starting_session"
  | "active_streaming"
  | "active_idle"
  | "disconnected_or_error"
  | "completed";

function buildStepDetail() {
  return {
    shell: {
      stepExecutionId: "step-agent-1",
      workflowExecutionId: "workflow-1",
      stepDefinitionId: "agent-step-def-1",
      stepType: "agent" as const,
      status: "active" as const,
      activatedAt: "2026-04-09T12:00:00.000Z",
      completedAt: undefined,
      completionAction: {
        kind: "complete_step_execution" as const,
        visible: true,
        enabled: true,
      },
    },
    body: {
      stepType: "agent" as const,
      mode: "deferred" as const,
      defaultMessage: "Agent runtime loads from the dedicated runtime DTO.",
    },
  };
}

function buildAgentDetail(state: AgentState) {
  return {
    stepExecutionId: "step-agent-1",
    workflowExecutionId: "workflow-1",
    body: {
      stepType: "agent" as const,
      state,
      contractBoundary: {
        version: "v1" as const,
        supportedMcpTools: ["read_step_snapshot", "read_context_value", "write_context_value"],
        requestContextAccess: false,
        continuationMode: "bootstrap_only" as const,
        nativeMessageLog: false,
        persistedWritePolicy: "applied_only" as const,
        streamContract: {
          streamName: "agent_step_session_events" as const,
          streamCount: 1 as const,
          transport: "sse" as const,
          source: "step_execution_scoped" as const,
          purpose: "timeline_and_tool_activity" as const,
        },
      },
      sessionStartPolicy: "explicit" as const,
      harnessBinding: {
        harnessId: "opencode" as const,
        bindingState:
          state === "not_started"
            ? ("unbound" as const)
            : state === "starting_session"
              ? ("binding" as const)
              : ("bound" as const),
        ...(state === "not_started" ? {} : { sessionId: "ses-1" }),
        selectedModel: {
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
        },
      },
      composer: {
        enabled: state === "active_idle",
        startSessionVisible: state === "not_started" || state === "disconnected_or_error",
        reasonIfDisabled:
          state === "not_started"
            ? "Start the session first."
            : state === "starting_session"
              ? "Session startup is in progress."
              : state === "active_streaming"
                ? "The agent is still responding."
                : state === "disconnected_or_error"
                  ? "The session disconnected."
                  : state === "completed"
                    ? "This Agent step execution is completed."
                    : undefined,
      },
      objective: "Synthesize the setup handoff.",
      instructionsMarkdown: "## Instructions\nUse the readable facts and emit structured writes.",
      readableContextFacts: [
        {
          contextFactDefinitionId: "ctx-summary",
          contextFactKind: "plain_value_fact" as const,
          source: "explicit" as const,
        },
      ],
      writeItems: [
        {
          writeItemId: "write-summary",
          contextFactDefinitionId: "ctx-summary",
          contextFactKind: "plain_value_fact" as const,
          order: 100,
          requirementContextFactDefinitionIds: ["ctx-summary"],
          exposureMode: "requirements_only" as const,
        },
      ],
      timelinePreview: [
        {
          itemType: "message" as const,
          timelineItemId: "timeline-1",
          createdAt: "2026-04-09T12:01:00.000Z",
          role: "assistant" as const,
          content: "Bootstrap complete.",
        },
      ],
    },
  };
}

function buildWorkflowDetail() {
  return {
    workflowExecution: {
      workflowExecutionId: "workflow-1",
      workflowId: "wf-1",
      workflowKey: "WF.SETUP.SYNTHESIZE",
      workflowName: "Setup synthesis",
      workflowRole: "primary" as const,
      status: "active" as const,
      startedAt: "2026-04-09T12:00:00.000Z",
    },
    workUnit: {
      projectWorkUnitId: "wu-1",
      workUnitTypeId: "wut-1",
      workUnitTypeKey: "WU.SETUP",
      workUnitTypeName: "Setup",
      currentStateId: "state-1",
      currentStateKey: "in_progress",
      currentStateLabel: "In Progress",
      target: { page: "work-unit-overview" as const, projectWorkUnitId: "wu-1" },
    },
    parentTransition: {
      transitionExecutionId: "transition-1",
      transitionId: "transition-def-1",
      transitionKey: "TR.START",
      transitionName: "Start",
      status: "active" as const,
      target: {
        page: "transition-execution-detail" as const,
        transitionExecutionId: "transition-1",
      },
    },
    lineage: {},
    stepSurface: {
      state: "active_step" as const,
      activeStep: {
        target: { page: "step-execution-detail" as const, stepExecutionId: "step-agent-1" },
        stepExecutionId: "step-agent-1",
        stepDefinitionId: "agent-step-def-1",
        stepType: "agent",
        status: "active",
        activatedAt: "2026-04-09T12:00:00.000Z",
      },
    },
    workflowContextFacts: {
      mode: "read_only_by_definition" as const,
      groups: [
        {
          contextFactDefinitionId: "ctx-summary",
          definitionKey: "project_summary",
          definitionLabel: "Project Summary",
          definitionDescriptionJson: { markdown: "Summary fact" },
          cardinality: "one" as const,
          instances: [
            {
              contextFactInstanceId: "ctx-inst-1",
              instanceOrder: 0,
              valueJson: "Initial summary",
              sourceStepExecutionId: "step-form-1",
              recordedAt: "2026-04-09T12:00:00.000Z",
            },
          ],
        },
      ],
    },
  };
}

function buildHarnessMetadata() {
  return {
    harness: "opencode" as const,
    discoveredAt: "2026-04-09T12:00:00.000Z",
    agents: [
      {
        key: "Atlas - Plan Executor",
        label: "Atlas - Plan Executor",
        mode: "subagent" as const,
        defaultModel: {
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
        },
      },
      {
        key: "Prometheus - Plan Builder",
        label: "Prometheus - Plan Builder",
        mode: "subagent" as const,
        defaultModel: {
          provider: "anthropic",
          model: "claude-opus-4-20250514",
        },
      },
    ],
    providers: [
      {
        provider: "anthropic",
        label: "Anthropic",
        defaultModel: "claude-sonnet-4-20250514",
        models: [
          {
            provider: "anthropic",
            model: "claude-sonnet-4-20250514",
            label: "Claude Sonnet 4",
            isDefault: true,
            supportsReasoning: true,
            supportsTools: true,
            supportsAttachments: false,
          },
          {
            provider: "anthropic",
            model: "claude-opus-4-20250514",
            label: "Claude Opus 4",
            isDefault: false,
            supportsReasoning: true,
            supportsTools: true,
            supportsAttachments: false,
          },
        ],
      },
    ],
    models: [
      {
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        label: "Claude Sonnet 4",
        isDefault: true,
        supportsReasoning: true,
        supportsTools: true,
        supportsAttachments: false,
      },
      {
        provider: "anthropic",
        model: "claude-opus-4-20250514",
        label: "Claude Opus 4",
        isDefault: false,
        supportsReasoning: true,
        supportsTools: true,
        supportsAttachments: false,
      },
    ],
  };
}

function buildTimelinePage() {
  return {
    stepExecutionId: "step-agent-1",
    cursor: {},
    items: [
      {
        itemType: "message" as const,
        timelineItemId: "timeline-0",
        createdAt: "2026-04-09T12:00:30.000Z",
        role: "user" as const,
        content: "Use the readable facts and emit structured writes.",
      },
      {
        itemType: "message" as const,
        timelineItemId: "timeline-1",
        createdAt: "2026-04-09T12:01:00.000Z",
        role: "assistant" as const,
        content: "Bootstrap complete.",
      },
    ],
  };
}

function buildOrpc(overrides?: {
  state?: AgentState;
  agentDetailTransform?: (
    detail: ReturnType<typeof buildAgentDetail>,
  ) => ReturnType<typeof buildAgentDetail>;
  workflowDetailTransform?: (
    detail: ReturnType<typeof buildWorkflowDetail>,
  ) => ReturnType<typeof buildWorkflowDetail>;
  timelinePage?: ReturnType<typeof buildTimelinePage>;
  getTimelinePage?: ReturnType<typeof vi.fn>;
  startSession?: ReturnType<typeof vi.fn>;
  reconnectSession?: ReturnType<typeof vi.fn>;
  sendMessage?: ReturnType<typeof vi.fn>;
  updateTurnSelection?: ReturnType<typeof vi.fn>;
  completeStep?: ReturnType<typeof vi.fn>;
}) {
  const state = overrides?.state ?? "not_started";
  const stepDetail = buildStepDetail();
  const agentDetail =
    overrides?.agentDetailTransform?.(buildAgentDetail(state)) ?? buildAgentDetail(state);
  const workflowDetail =
    overrides?.workflowDetailTransform?.(buildWorkflowDetail()) ?? buildWorkflowDetail();
  const harnessMetadata = buildHarnessMetadata();
  const timelinePage = overrides?.timelinePage ?? buildTimelinePage();
  const getTimelinePage = overrides?.getTimelinePage ?? vi.fn(async () => timelinePage);

  const startSession =
    overrides?.startSession ??
    vi.fn(async () => ({
      stepExecutionId: "step-agent-1",
      state: "active_idle" as const,
      bindingState: "bound" as const,
    }));
  const sendMessage =
    overrides?.sendMessage ??
    vi.fn(async () => ({
      stepExecutionId: "step-agent-1",
      accepted: true as const,
      state: "active_streaming" as const,
    }));
  const reconnectSession =
    overrides?.reconnectSession ??
    vi.fn(async () => ({
      stepExecutionId: "step-agent-1",
      state: "active_idle" as const,
      bindingState: "bound" as const,
    }));
  const updateTurnSelection =
    overrides?.updateTurnSelection ??
    vi.fn(async () => ({
      stepExecutionId: "step-agent-1",
      appliesTo: "next_turn_only" as const,
      model: { provider: "anthropic", model: "claude-opus-4-20250514" },
    }));
  const completeStep =
    overrides?.completeStep ??
    vi.fn(async () => ({ stepExecutionId: "step-agent-1", state: "completed" as const }));

  const withMutationOptions =
    <T extends (...args: any[]) => Promise<any>>(fn: T) =>
    (options?: Record<string, unknown>) => ({ mutationFn: fn, ...options });

  return {
    orpc: {
      project: {
        getRuntimeStepExecutionDetail: {
          queryOptions: ({ input }: { input: { projectId: string; stepExecutionId: string } }) => ({
            queryKey: runtimeStepExecutionDetailQueryKey(input.projectId, input.stepExecutionId),
            queryFn: async () => stepDetail,
          }),
        },
        getAgentStepExecutionDetail: {
          queryOptions: ({ input }: { input: { projectId: string; stepExecutionId: string } }) => ({
            queryKey: runtimeAgentStepExecutionDetailQueryKey(
              input.projectId,
              input.stepExecutionId,
            ),
            queryFn: async () => agentDetail,
          }),
        },
        getAgentStepTimelinePage: {
          queryOptions: ({
            input,
          }: {
            input: {
              projectId: string;
              stepExecutionId: string;
              cursor?: { before?: string; after?: string };
              limit?: number;
            };
          }) => ({
            queryKey: agentStepTimelineQueryKey(
              input.projectId,
              input.stepExecutionId,
              input.cursor,
            ),
            queryFn: async () => getTimelinePage(input),
          }),
        },
        getRuntimeWorkflowExecutionDetail: {
          queryOptions: ({
            input,
          }: {
            input: { projectId: string; workflowExecutionId: string };
          }) => ({
            queryKey: [
              "runtime-workflow-execution-detail",
              input.projectId,
              input.workflowExecutionId,
            ],
            queryFn: async () => workflowDetail,
          }),
        },
        startAgentStepSession: { mutationOptions: withMutationOptions(startSession) },
        reconnectAgentStepSession: { mutationOptions: withMutationOptions(reconnectSession) },
        sendAgentStepMessage: { mutationOptions: withMutationOptions(sendMessage) },
        updateAgentStepTurnSelection: { mutationOptions: withMutationOptions(updateTurnSelection) },
        completeAgentStepExecution: { mutationOptions: withMutationOptions(completeStep) },
        activateWorkflowStepExecution: {
          mutationOptions: withMutationOptions(
            vi.fn(async () => ({ stepExecutionId: "step-next-1" as const })),
          ),
        },
      },
      methodology: {
        version: {
          workUnit: {
            workflow: {
              discoverAgentStepHarnessMetadata: {
                queryOptions: () => ({
                  queryKey: ["agent-step-harness-metadata"],
                  queryFn: async () => harnessMetadata,
                }),
              },
            },
          },
        },
      },
    },
    getTimelinePage,
    startSession,
    reconnectSession,
    sendMessage,
    updateTurnSelection,
    completeStep,
  };
}

async function renderRoute(
  state: AgentState,
  options?: {
    sseEvents?: unknown[];
    queryClient?: QueryClient;
    agentDetailTransform?: (
      detail: ReturnType<typeof buildAgentDetail>,
    ) => ReturnType<typeof buildAgentDetail>;
    workflowDetailTransform?: (
      detail: ReturnType<typeof buildWorkflowDetail>,
    ) => ReturnType<typeof buildWorkflowDetail>;
    timelinePage?: ReturnType<typeof buildTimelinePage>;
    getTimelinePage?: ReturnType<typeof vi.fn>;
  },
) {
  const queryClient =
    options?.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
  const setup = buildOrpc({
    state,
    ...(options?.agentDetailTransform
      ? { agentDetailTransform: options.agentDetailTransform }
      : {}),
    ...(options?.workflowDetailTransform
      ? { workflowDetailTransform: options.workflowDetailTransform }
      : {}),
    ...(options?.timelinePage ? { timelinePage: options.timelinePage } : {}),
    ...(options?.getTimelinePage ? { getTimelinePage: options.getTimelinePage } : {}),
  });

  useParamsMock.mockReturnValue({ projectId: "project-1", stepExecutionId: "step-agent-1" });
  useRouteContextMock.mockReturnValue({ orpc: setup.orpc, queryClient });
  useSSEMock.mockReturnValue({
    events: options?.sseEvents ?? [],
    status: state === "not_started" ? "closed" : "open",
  });

  await queryClient.prefetchQuery({
    ...setup.orpc.project.getRuntimeStepExecutionDetail.queryOptions({
      input: { projectId: "project-1", stepExecutionId: "step-agent-1" },
    }),
    queryKey: runtimeStepExecutionDetailQueryKey("project-1", "step-agent-1"),
  });

  await queryClient.prefetchQuery({
    ...setup.orpc.project.getAgentStepExecutionDetail.queryOptions({
      input: { projectId: "project-1", stepExecutionId: "step-agent-1" },
    }),
    queryKey: runtimeAgentStepExecutionDetailQueryKey("project-1", "step-agent-1"),
  });

  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <RuntimeFormStepDetailRoute />
    </QueryClientProvider>,
  );

  await screen.findByText("Session orchestration & context boundaries");

  return { ...rendered, queryClient, ...setup };
}

describe("runtime agent step detail route", () => {
  const composerTextbox = () => screen.getAllByRole("textbox")[0] as HTMLTextAreaElement;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      state: "not_started",
      assert: () => {
        expect(screen.getByRole("button", { name: /Start Session/i })).toBeTruthy();
        expect(composerTextbox().disabled).toBe(true);
      },
    },
    {
      state: "starting_session",
      assert: () => {
        expect(screen.queryByRole("button", { name: /Start Session/i })).toBeNull();
        expect(screen.getByText(/Session startup is in progress/i)).toBeTruthy();
        expect(composerTextbox().disabled).toBe(true);
      },
    },
    {
      state: "active_streaming",
      assert: () => {
        expect(screen.getByText(/Streaming current turn/i)).toBeTruthy();
        expect(composerTextbox().disabled).toBe(true);
      },
    },
    {
      state: "active_idle",
      assert: () => {
        expect(screen.queryByRole("button", { name: /Start Session/i })).toBeNull();
        expect(composerTextbox().disabled).toBe(false);
      },
    },
    {
      state: "disconnected_or_error",
      assert: () => {
        expect(screen.getByRole("button", { name: /Reconnect Session/i })).toBeTruthy();
        expect(composerTextbox().disabled).toBe(true);
      },
    },
    {
      state: "completed",
      assert: () => {
        expect(screen.queryByRole("button", { name: /Start Session/i })).toBeNull();
        expect(composerTextbox().disabled).toBe(true);
        expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
      },
    },
  ])("renders $state runtime state", async ({ state, assert }) => {
    await renderRoute(state as AgentState);
    assert();
  });

  it("shows retry action when state is starting_session without a bound session id", async () => {
    await renderRoute("starting_session", {
      agentDetailTransform: (detail) => ({
        ...(() => {
          const { sessionId: _sessionId, ...harnessBindingWithoutSession } =
            detail.body.harnessBinding;

          return {
            ...detail,
            body: {
              ...detail.body,
              harnessBinding: {
                ...harnessBindingWithoutSession,
                bindingState: "binding",
              },
            },
          };
        })(),
      }),
    });

    expect(screen.getByRole("button", { name: /Retry Session/i })).toBeTruthy();
    expect(screen.getByText(/stale or disconnected/i)).toBeTruthy();
    expect(composerTextbox().disabled).toBe(true);
  });

  it("hydrates the timeline with full history on mount", async () => {
    const { getTimelinePage } = await renderRoute("active_idle");

    await screen.findByText("Use the readable facts and emit structured writes.");

    expect(getTimelinePage).toHaveBeenCalledWith({
      projectId: "project-1",
      stepExecutionId: "step-agent-1",
      limit: 1000,
    });
  });

  it("shows a localized loading indicator while full history is loading", async () => {
    let resolveTimelinePage: ((value: ReturnType<typeof buildTimelinePage>) => void) | undefined;
    const getTimelinePage = vi.fn(
      () =>
        new Promise<ReturnType<typeof buildTimelinePage>>((resolve) => {
          resolveTimelinePage = resolve;
        }),
    );

    await renderRoute("active_idle", { getTimelinePage });

    expect(screen.getByTestId("agent-step-timeline-history-loading")).toBeTruthy();
    expect(screen.getByText("Bootstrap complete.")).toBeTruthy();

    resolveTimelinePage?.(buildTimelinePage());
    await waitFor(() => {
      expect(screen.queryByTestId("agent-step-timeline-history-loading")).toBeNull();
    });
  });

  it("falls back to the preview when the full history query fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await renderRoute("active_idle", {
        getTimelinePage: vi.fn(async () => {
          throw new Error("history unavailable");
        }),
      });

      await screen.findByTestId("agent-step-timeline-history-error");

      expect(screen.getByText("Bootstrap complete.")).toBeTruthy();
      expect(screen.getByText(/history unavailable/i)).toBeTruthy();
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it.each([
    {
      label: "without a started session",
      state: "not_started" as AgentState,
      agentDetailTransform: undefined,
    },
    {
      label: "when the preview is empty",
      state: "active_idle" as AgentState,
      agentDetailTransform: (detail: ReturnType<typeof buildAgentDetail>) => ({
        ...detail,
        body: {
          ...detail.body,
          timelinePreview: [],
        },
      }),
    },
  ])("does not fetch full timeline history $label", async ({ state, agentDetailTransform }) => {
    const { getTimelinePage } = await renderRoute(
      state,
      agentDetailTransform ? { agentDetailTransform } : undefined,
    );

    expect(getTimelinePage).not.toHaveBeenCalled();
  });

  it("invalidates side-panel queries after a successful write tool event", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await renderRoute("active_idle", {
      queryClient,
      sseEvents: [
        {
          version: "v1",
          stream: "agent_step_session_events",
          eventType: "tool_activity",
          stepExecutionId: "step-agent-1",
          data: {
            item: {
              itemType: "tool_activity",
              timelineItemId: "tool-1",
              createdAt: "2026-04-09T12:02:00.000Z",
              toolKind: "mcp",
              toolName: "write_context_value",
              status: "completed",
              summary: "Applied context write.",
            },
          },
        },
      ],
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["runtime-workflow-execution-detail", "project-1", "workflow-1"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: runtimeAgentStepExecutionDetailQueryKey("project-1", "step-agent-1"),
      });
    });
  });

  it("renders applied write instances with structured artifact details and deletion cues", async () => {
    const user = userEvent.setup();

    await renderRoute("active_idle", {
      agentDetailTransform: (detail) => ({
        ...detail,
        body: {
          ...detail.body,
          writeItems: [
            {
              writeItemId: "write-artifact",
              contextFactDefinitionId: "ctx-artifact",
              contextFactKind: "artifact_slot_reference_fact",
              order: 200,
              requirementContextFactDefinitionIds: [],
              exposureMode: "requirements_only",
            },
          ],
        },
      }),
      workflowDetailTransform: (detail) => ({
        ...detail,
        workflowContextFacts: {
          ...detail.workflowContextFacts,
          groups: [
            {
              contextFactDefinitionId: "ctx-artifact",
              definitionKey: "project_overview_artifact",
              definitionLabel: "Project Overview Artifact",
              definitionDescriptionJson: { markdown: "Artifact fact" },
              cardinality: "one" as const,
              instances: [
                {
                  contextFactInstanceId: "ctx-inst-artifact-1",
                  instanceOrder: 0,
                  valueJson: {
                    slotDefinitionId: "slot-project-overview",
                    files: [
                      {
                        filePath: "artifacts/project-overview/taskflow-overview.json",
                        status: "present",
                        gitCommitHash: "93b98abff15a713b8c0bf7425d1a93ae2f6811d9",
                        gitCommitSubject: "Add TaskFlow project overview artifact",
                      },
                      {
                        filePath: "artifacts/project-overview/old.json",
                        status: "deleted",
                        gitCommitHash: "1234567890abcdef1234567890abcdef12345678",
                        gitCommitSubject: "Remove obsolete overview artifact",
                      },
                    ],
                  },
                  sourceStepExecutionId: "step-agent-1",
                  recordedAt: "2026-04-09T12:10:00.000Z",
                },
              ],
            },
          ],
        },
      }),
    });

    await user.click(screen.getByRole("button", { name: /^write$/i }));

    expect(screen.getByText("Project Overview Artifact")).toBeTruthy();
    expect(screen.getByText("Add TaskFlow project overview artifact")).toBeTruthy();
    expect(screen.getByText(/^one$/i)).toBeTruthy();
    expect(screen.getAllByText("marked deleted").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /copy file path/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /copy commit hash/i }).length).toBeGreaterThan(0);
  });

  it("renders draft-spec nested fact values as key-value rows with type badges instead of raw JSON blobs", async () => {
    const user = userEvent.setup();

    await renderRoute("active_idle", {
      agentDetailTransform: (detail) => ({
        ...detail,
        body: {
          ...detail.body,
          writeItems: [
            {
              writeItemId: "write-draft",
              contextFactDefinitionId: "ctx-draft",
              contextFactKind: "work_unit_draft_spec_fact",
              order: 500,
              requirementContextFactDefinitionIds: [],
              exposureMode: "requirements_only",
            },
          ],
        },
      }),
      workflowDetailTransform: (detail) => ({
        ...detail,
        workflowContextFacts: {
          ...detail.workflowContextFacts,
          groups: [
            {
              contextFactDefinitionId: "ctx-draft",
              definitionKey: "research_draft_spec",
              definitionLabel: "Research Draft Spec",
              definitionDescriptionJson: { markdown: "Draft fact" },
              cardinality: "many" as const,
              instances: [
                {
                  contextFactInstanceId: "ctx-inst-draft-1",
                  instanceOrder: 0,
                  valueJson: {
                    factValues: {
                      research_goals: {
                        title: "Pattern Analysis",
                        question:
                          "What are the best patterns for offline-first React applications?",
                        priority: 1,
                        notes: "Focus on React-specific implementations",
                      },
                    },
                    artifactValues: {},
                  },
                  sourceStepExecutionId: "step-agent-1",
                  recordedAt: "2026-04-09T12:11:00.000Z",
                },
              ],
            },
          ],
        },
      }),
    });

    await user.click(screen.getByRole("button", { name: /^write$/i }));

    expect(screen.getByText("Research Draft Spec")).toBeTruthy();
    expect(screen.getByText("research_goals")).toBeTruthy();
    expect(screen.getByText(/^json$/i)).toBeTruthy();
    expect(screen.getByText("title")).toBeTruthy();
    expect(screen.getByText("Pattern Analysis")).toBeTruthy();
    expect(screen.getByText("priority")).toBeTruthy();
    expect(screen.getByText(/^number$/i)).toBeTruthy();
    expect(screen.queryByText(/\{"title":\s*"Pattern Analysis"/i)).toBeNull();
  });

  it("merges started and completed tool events into one expandable tool-call entry", async () => {
    const user = userEvent.setup();

    await renderRoute("active_idle", {
      sseEvents: [
        {
          version: "v1",
          stream: "agent_step_session_events",
          eventType: "tool_activity",
          stepExecutionId: "step-agent-1",
          data: {
            item: {
              itemType: "tool_activity",
              timelineItemId: "tool:abc:started",
              createdAt: "2026-04-09T12:02:00.000Z",
              toolKind: "harness",
              toolName: "bash",
              status: "started",
              summary: "Check current working directory.",
              input: JSON.stringify({ command: "pwd" }),
            },
          },
        },
        {
          version: "v1",
          stream: "agent_step_session_events",
          eventType: "tool_activity",
          stepExecutionId: "step-agent-1",
          data: {
            item: {
              itemType: "tool_activity",
              timelineItemId: "tool:abc:completed",
              createdAt: "2026-04-09T12:02:01.000Z",
              toolKind: "harness",
              toolName: "bash",
              status: "completed",
              output: JSON.stringify({ output: "home/gondilf/Desktop/projects/masters/chiron" }),
              summary: "home/gondilf/Desktop/projects/masters/chiron",
            },
          },
        },
      ],
    });

    expect(screen.getAllByText("bash")).toHaveLength(1);
    expect(screen.queryByText("$ pwd")).toBeNull();

    await user.click(screen.getByRole("button", { name: /bash/i }));

    const timelineList = screen.getByTestId("agent-step-timeline-list");
    const timelineText = timelineList.textContent ?? "";
    expect(timelineText).toContain("Completed");
    expect(timelineText).toContain("Check current working directory.");
    expect(timelineText).toContain("$ pwd");
    expect(timelineText).toContain("home/gondilf/Desktop/projects/masters/chiron");
  });

  it("renders thinking timeline entries with muted reasoning styling", async () => {
    await renderRoute("active_idle", {
      sseEvents: [
        {
          version: "v1",
          stream: "agent_step_session_events",
          eventType: "timeline",
          stepExecutionId: "step-agent-1",
          data: {
            item: {
              itemType: "thinking",
              timelineItemId: "thinking-1",
              createdAt: "2026-04-09T12:02:00.000Z",
              content: "I should inspect the working tree before suggesting a patch.",
            },
          },
        },
      ],
    });

    expect(screen.getByText("REASONING")).toBeTruthy();
    expect(
      screen.getByText("I should inspect the working tree before suggesting a patch."),
    ).toBeTruthy();
  });

  it("falls back to summary-only tool activity payloads when structured payload is missing", async () => {
    const user = userEvent.setup();

    await renderRoute("active_idle", {
      sseEvents: [
        {
          version: "v1",
          stream: "agent_step_session_events",
          eventType: "tool_activity",
          stepExecutionId: "step-agent-1",
          data: {
            item: {
              itemType: "tool_activity",
              timelineItemId: "tool:legacy:started",
              createdAt: "2026-04-09T12:03:00.000Z",
              toolKind: "harness",
              toolName: "bash",
              status: "started",
              summary: "Legacy input summary.",
            },
          },
        },
        {
          version: "v1",
          stream: "agent_step_session_events",
          eventType: "tool_activity",
          stepExecutionId: "step-agent-1",
          data: {
            item: {
              itemType: "tool_activity",
              timelineItemId: "tool:legacy:completed",
              createdAt: "2026-04-09T12:03:01.000Z",
              toolKind: "harness",
              toolName: "bash",
              status: "completed",
              summary: "Legacy output summary.",
            },
          },
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /bash/i }));

    const timelineText = screen.getByTestId("agent-step-timeline-list").textContent ?? "";
    expect(timelineText).toContain("Legacy input summary.");
    expect(timelineText).toContain("Legacy output summary.");
  });

  it("shows bootstrap prompt from session history as a normal user message", async () => {
    const bootstrapPromptContent = [
      "Synthesize the setup handoff.",
      "## Instructions\nUse the readable facts and emit structured writes.",
    ].join("\n\n");

    await renderRoute("active_idle", {
      sseEvents: [
        {
          version: "v1",
          stream: "agent_step_session_events",
          eventType: "bootstrap",
          stepExecutionId: "step-agent-1",
          data: {
            state: "active_idle",
            streamContract: {
              streamName: "agent_step_session_events",
              streamCount: 1,
              transport: "sse",
              source: "step_execution_scoped",
              purpose: "timeline_and_tool_activity",
            },
            timelineItems: [
              {
                itemType: "message",
                timelineItemId: "bootstrap:session-1",
                createdAt: "2026-04-09T12:00:00.000Z",
                role: "user",
                content: bootstrapPromptContent,
              },
            ],
          },
        },
      ],
    });

    const bootstrapMessage = screen.getByTestId("agent-step-timeline-message-bootstrap:session-1");
    expect(bootstrapMessage).toBeTruthy();
    const bootstrapText = bootstrapMessage.textContent ?? "";
    expect(bootstrapText).toContain("Synthesize the setup handoff.");
    expect(bootstrapText).toContain("Use the readable facts and emit structured writes.");
  });

  it("updates the next-turn model selection", async () => {
    const user = userEvent.setup();
    const { updateTurnSelection } = await renderRoute("active_idle");

    await user.click(await screen.findByText(/Claude Opus 4/i));

    expect(updateTurnSelection).toHaveBeenCalledTimes(1);
    expect(updateTurnSelection.mock.calls[0]?.[0]).toEqual({
      projectId: "project-1",
      stepExecutionId: "step-agent-1",
      model: {
        provider: "anthropic",
        model: "claude-opus-4-20250514",
      },
    });
  });

  it("updates the next-turn agent selection using the canonical agent key", async () => {
    const user = userEvent.setup();
    const { updateTurnSelection } = await renderRoute("active_idle", {
      agentDetailTransform: (detail) => ({
        ...detail,
        body: {
          ...detail.body,
          harnessBinding: {
            ...detail.body.harnessBinding,
            selectedAgent: "Atlas - Plan Executor",
          },
        },
      }),
    });

    await user.click(await screen.findByText(/Prometheus - Plan Builder/i));

    expect(updateTurnSelection).toHaveBeenCalledTimes(1);
    expect(updateTurnSelection.mock.calls[0]?.[0]).toEqual({
      projectId: "project-1",
      stepExecutionId: "step-agent-1",
      agent: "Prometheus - Plan Builder",
    });
  });
});
