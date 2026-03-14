import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useLocationMock, useParamsMock, useRouteContextMock, useSearchMock, useNavigateMock } =
  vi.hoisted(() => ({
    useLocationMock: vi.fn(),
    useParamsMock: vi.fn(),
    useRouteContextMock: vi.fn(),
    useSearchMock: vi.fn(),
    useNavigateMock: vi.fn(),
  }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
  useLocation: useLocationMock,
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useLocation: useLocationMock,
    useParams: useParamsMock,
    useRouteContext: useRouteContextMock,
    useSearch: useSearchMock,
    useNavigate: useNavigateMock,
  }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  buttonVariants: () => "",
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { MethodologyWorkspaceEntryRoute } from "./methodologies.$methodologyId.versions.$versionId";

type ValidationDiagnostic = {
  code: string;
  scope: string;
  blocking: boolean;
  required?: unknown;
  observed?: unknown;
  remediation?: string;
};

type ValidateResult = {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
};

type PublishResult = {
  published: boolean;
  diagnostics: ValidationDiagnostic[];
  evidence: {
    actorId: string | null;
    timestamp: string;
    sourceDraftRef: string;
    publishedVersion: string;
    validationSummary: {
      valid: boolean;
      diagnostics: Array<{ code: string; scope: string }>;
    };
    evidenceRef: string;
  } | null;
};

type TestContext = ReturnType<typeof createTestContext>;

const DRAFT_PROJECTION = {
  displayName: "Equity Draft",
  workUnitTypes: [],
  agentTypes: [],
  transitions: [],
  workflows: [],
  transitionWorkflowBindings: {},
  guidance: {},
};

const DETAILS_DRAFT = {
  versions: [
    {
      id: "draft-v2",
      status: "draft",
      version: "0.2.0",
    },
  ],
};

function createTestContext(options?: {
  detailsData?: unknown;
  evidenceData?: Array<{
    actorId: string | null;
    timestamp: string;
    sourceDraftRef: string;
    publishedVersion: string;
    validationSummary: { valid: boolean; diagnostics: Array<{ code: string; scope: string }> };
    evidenceRef: string;
  }>;
  validateResult?: ValidateResult;
  lifecycleResult?: { validation: ValidateResult };
  workflowResult?: { diagnostics: ValidationDiagnostic[] };
  publishResult?: PublishResult;
}) {
  const detailsData = options?.detailsData;
  const evidenceData = options?.evidenceData ?? [];
  const validateResult =
    options?.validateResult ??
    ({
      valid: true,
      diagnostics: [],
    } satisfies ValidateResult);
  const lifecycleResult =
    options?.lifecycleResult ??
    ({
      validation: {
        valid: true,
        diagnostics: [],
      },
    } satisfies { validation: ValidateResult });
  const workflowResult =
    options?.workflowResult ??
    ({
      diagnostics: [],
    } satisfies { diagnostics: ValidationDiagnostic[] });
  const publishResult =
    options?.publishResult ??
    ({
      published: true,
      diagnostics: [],
      evidence: {
        actorId: "operator-1",
        timestamp: "2026-03-01T10:00:00.000Z",
        sourceDraftRef: "draft-v2",
        publishedVersion: "0.2.0",
        validationSummary: {
          valid: true,
          diagnostics: [],
        },
        evidenceRef: "ev-001",
      },
    } satisfies PublishResult);

  const validateDraftSpy = vi.fn(async () => validateResult);
  const updateLifecycleSpy = vi.fn(async () => lifecycleResult);
  const updateWorkflowsSpy = vi.fn(async () => workflowResult);
  const publishSpy = vi.fn(async () => publishResult);
  const invalidateQueriesSpy = vi.fn(async () => undefined);

  const orpc = {
    methodology: {
      getMethodologyDetails: {
        queryOptions: ({ input }: { input: { methodologyKey: string } }) => ({
          queryKey: ["methodology", "details", input.methodologyKey],
          queryFn: async () => detailsData,
        }),
      },
      getDraftProjection: {
        queryOptions: ({ input }: { input: { versionId: string } }) => ({
          queryKey: ["methodology", "draft", input.versionId],
          queryFn: async () => DRAFT_PROJECTION,
        }),
      },
      getPublicationEvidence: {
        queryOptions: ({ input }: { input: { methodologyVersionId: string } }) => ({
          queryKey: ["methodology", "evidence", input.methodologyVersionId],
          queryFn: async () => evidenceData,
        }),
      },
      validateDraftVersion: {
        mutationOptions: () => ({
          mutationFn: validateDraftSpy,
        }),
      },
      updateDraftLifecycle: {
        mutationOptions: () => ({
          mutationFn: updateLifecycleSpy,
        }),
      },
      updateDraftWorkflows: {
        mutationOptions: () => ({
          mutationFn: updateWorkflowsSpy,
        }),
      },
      publishDraftVersion: {
        mutationOptions: () => ({
          mutationFn: publishSpy,
        }),
      },
    },
  };

  return {
    orpc,
    queryClient: {
      invalidateQueries: invalidateQueriesSpy,
    },
    spies: {
      validateDraftSpy,
      updateLifecycleSpy,
      updateWorkflowsSpy,
      publishSpy,
      invalidateQueriesSpy,
    },
  };
}

function renderRoute(
  context: TestContext,
  options?: { page?: "author" | "publish" | "evidence" | "context" },
) {
  const tanstackQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  useLocationMock.mockReturnValue({
    pathname: "/methodologies/equity-core/versions/draft-v2",
  });
  useParamsMock.mockReturnValue({
    methodologyId: "equity-core",
    versionId: "draft-v2",
  });
  useSearchMock.mockReturnValue(options?.page ? { page: options.page } : {});
  useNavigateMock.mockReturnValue(vi.fn());
  useRouteContextMock.mockReturnValue({
    orpc: context.orpc,
    queryClient: context.queryClient,
  });

  render(
    <QueryClientProvider client={tanstackQueryClient}>
      <MethodologyWorkspaceEntryRoute />
    </QueryClientProvider>,
  );

  return tanstackQueryClient;
}

beforeEach(() => {
  useLocationMock.mockReset();
  useParamsMock.mockReset();
  useRouteContextMock.mockReset();
  useSearchMock.mockReset();
  useNavigateMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("methodology version route publish and immutable guards", () => {
  it("allows save attempts before methodology details resolve current version", async () => {
    const context = createTestContext({
      detailsData: { versions: [] },
    });

    renderRoute(context);

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(context.spies.updateLifecycleSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("ignores duplicate save clicks while a save is already pending", async () => {
    const context = createTestContext({
      detailsData: DETAILS_DRAFT,
    });

    let resolveLifecycle: ((result: { validation: ValidateResult }) => void) | undefined;
    const lifecyclePending = new Promise<{ validation: ValidateResult }>((resolve) => {
      resolveLifecycle = resolve;
    });

    context.spies.updateLifecycleSpy.mockImplementationOnce(async () => lifecyclePending);

    renderRoute(context);

    const saveButton = screen.getByRole("button", { name: "Save Draft" });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(context.spies.updateLifecycleSpy).toHaveBeenCalledTimes(1);
    });

    resolveLifecycle?.({
      validation: {
        valid: true,
        diagnostics: [],
      },
    });

    await waitFor(() => {
      expect(context.spies.updateWorkflowsSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("maps save mutation errors mentioning draft to immutable diagnostics", async () => {
    const context = createTestContext({
      detailsData: DETAILS_DRAFT,
    });

    context.spies.updateLifecycleSpy.mockRejectedValueOnce(new Error("draft is immutable"));

    renderRoute(context);

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(context.spies.updateLifecycleSpy).toHaveBeenCalledTimes(1);
    });

    expect(context.spies.updateWorkflowsSpy).toHaveBeenCalledTimes(0);
    expect(
      screen.getAllByText(
        (_, element) =>
          element?.textContent?.includes("State: failed - draft is immutable") ?? false,
      ).length,
    ).toBeGreaterThan(0);
  });

  it("does not block publish when validation diagnostics are non-blocking warnings", async () => {
    const context = createTestContext({
      detailsData: DETAILS_DRAFT,
      validateResult: {
        valid: true,
        diagnostics: [
          {
            code: "EMPTY_LIFECYCLE_STATES",
            scope: "definition.workUnitTypes[0].lifecycleStates",
            blocking: false,
            required: "at least one state",
            observed: 0,
            remediation: "Add lifecycle states.",
          },
        ],
      },
    });

    renderRoute(context, { page: "publish" });

    await waitFor(() => {
      expect((screen.getByLabelText("Published Version") as HTMLInputElement).value).toBe("0.2.0");
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish Immutable Version" }));

    await waitFor(() => {
      expect(context.spies.publishSpy).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Last Publish Result")).toBeTruthy();
  });

  it("blocks publish on blocking diagnostics and does not execute publish mutation", async () => {
    const context = createTestContext({
      detailsData: DETAILS_DRAFT,
      validateResult: {
        valid: false,
        diagnostics: [
          {
            code: "WF_STEP_TYPE_INVALID",
            scope: "definition.workflows.wf.prd.form.steps.step_1.type",
            blocking: true,
            required: "form|agent|action|invoke|branch|display",
            observed: "custom",
            remediation: "Use one of the allowed step types.",
          },
        ],
      },
    });

    renderRoute(context, { page: "publish" });

    await waitFor(() => {
      expect((screen.getByLabelText("Published Version") as HTMLInputElement).value).toBe("0.2.0");
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish Immutable Version" }));

    await waitFor(() => {
      expect(context.spies.publishSpy).toHaveBeenCalledTimes(0);
    });
  });

  it("surfaces publish failure diagnostics when publish mutation throws", async () => {
    const context = createTestContext({
      detailsData: DETAILS_DRAFT,
    });

    context.spies.publishSpy.mockRejectedValueOnce(new Error("upstream unavailable"));

    renderRoute(context, { page: "publish" });

    await waitFor(() => {
      expect((screen.getByLabelText("Published Version") as HTMLInputElement).value).toBe("0.2.0");
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish Immutable Version" }));

    await waitFor(() => {
      expect(context.spies.publishSpy).toHaveBeenCalledTimes(1);
    });

    expect(context.spies.invalidateQueriesSpy).toHaveBeenCalledTimes(0);
    expect(screen.queryByText("Last Publish Result")).toBeNull();
  });

  it("renders publication evidence in deterministic order and supports filtering", async () => {
    const context = createTestContext({
      detailsData: DETAILS_DRAFT,
      evidenceData: [
        {
          actorId: "alice",
          timestamp: "2026-03-02T00:00:00.000Z",
          sourceDraftRef: "draft-v2",
          publishedVersion: "0.2.0",
          validationSummary: { valid: true, diagnostics: [] },
          evidenceRef: "ev-b",
        },
        {
          actorId: "bob",
          timestamp: "2026-03-02T00:00:00.000Z",
          sourceDraftRef: "draft-v2",
          publishedVersion: "0.2.0",
          validationSummary: { valid: true, diagnostics: [] },
          evidenceRef: "ev-a",
        },
        {
          actorId: "carol",
          timestamp: "2026-03-01T00:00:00.000Z",
          sourceDraftRef: "draft-v2",
          publishedVersion: "0.2.0",
          validationSummary: { valid: true, diagnostics: [] },
          evidenceRef: "ev-c",
        },
      ],
    });

    renderRoute(context, { page: "evidence" });

    await waitFor(() => {
      expect(screen.getByText("ev-c")).toBeTruthy();
    });

    const evidenceRefs = screen.getAllByText(/ev-[abc]/).map((cell) => cell.textContent);
    expect(evidenceRefs).toEqual(["ev-c", "ev-a", "ev-b"]);

    fireEvent.change(screen.getByLabelText("Filter Evidence"), {
      target: { value: "ev-a" },
    });

    expect(screen.getByText("ev-a")).toBeTruthy();
    expect(screen.queryByText("ev-b")).toBeNull();
    expect(screen.queryByText("ev-c")).toBeNull();
  });
});
