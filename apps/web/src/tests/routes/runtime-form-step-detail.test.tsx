import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useParamsMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useParamsMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useParams: useParamsMock,
  }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
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
  buttonVariants: () => "",
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | null | undefined | false>) => classes.filter(Boolean).join(" "),
}));

import { RuntimeFormStepDetailRoute } from "../../routes/projects.$projectId.step-executions.$stepExecutionId";

function createHarness() {
  const getRuntimeStepExecutionDetailQueryOptionsMock = vi.fn(
    (_input: { input: { projectId: string; stepExecutionId: string } }) => ({
      queryKey: ["runtime-step-execution-detail", "project-1", "step-1"],
      queryFn: async () => ({
        stepExecution: {
          stepExecutionId: "step-1",
          workflowExecutionId: "workflow-1",
          stepDefinitionId: "def-form-1",
          stepType: "form",
          status: "completed",
          activatedAt: "2026-04-01T12:00:00.000Z",
          completedAt: "2026-04-01T12:05:00.000Z",
        },
        tabs: {
          submissionAndProgression: {
            draftValues: { title: "Draft title" },
            submittedSnapshot: { title: "Submitted title", "project.fact-1": "alpha" },
            submittedAt: "2026-04-01T12:04:00.000Z",
            progression: { status: "completed", activatedFromStepExecutionId: null },
            nextStepExecutionId: "step-2",
          },
          writes: {
            workflowContextWrites: [
              {
                contextFactId: "ctx-1",
                factKey: "setup.title",
                factKind: "plain_value",
                value: "Submitted title",
              },
            ],
            authoritativeProjectFactWrites: [
              {
                projectFactInstanceId: "pfi-1",
                factDefinitionId: "fact-1",
                value: "alpha",
              },
            ],
          },
          contextFactSemantics: {
            notes: [
              "Submission snapshot is immutable once submitted.",
              "Progression records lifecycle outcomes and next-step activation lineage.",
              "Workflow context writes stay within workflow execution context.",
              "Authoritative writes are propagated into project fact instances when mapped via 'project.<factDefinitionId>' keys.",
            ],
            mappings: [
              {
                factKey: "setup.title",
                semantics: "Captured as workflow-local context for downstream steps.",
              },
            ],
          },
        },
      }),
    }),
  );

  const orpc = {
    project: {
      getRuntimeStepExecutionDetail: {
        queryOptions: getRuntimeStepExecutionDetailQueryOptionsMock,
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
    stepExecutionId: "step-1",
  });
  useRouteContextMock.mockReturnValue({ orpc, queryClient });

  return {
    queryClient,
    orpc,
    getRuntimeStepExecutionDetailQueryOptionsMock,
  };
}

describe("runtime form step detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders tabs with explanatory copy for submission, progression, and writes semantics", async () => {
    const { queryClient, orpc, getRuntimeStepExecutionDetailQueryOptionsMock } = createHarness();

    await queryClient.prefetchQuery(
      orpc.project.getRuntimeStepExecutionDetail.queryOptions({
        input: {
          projectId: "project-1",
          stepExecutionId: "step-1",
        },
      }),
    );

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <RuntimeFormStepDetailRoute />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Step execution detail");
    expect(markup).toContain("Submission &amp; Progression");
    expect(markup).toContain("Writes");
    expect(markup).toContain("Context Fact Semantics");

    expect(markup).toContain("Submitted snapshot = immutable submit-time value set");
    expect(markup).toContain("Progression = lifecycle and next-step outcome");
    expect(markup).toContain("Context writes = workflow execution context mutations");
    expect(markup).toContain(
      "Authoritative writes = writes propagated into project fact instances",
    );

    expect(markup).toContain("step-2");
    expect(markup).toContain("project.fact-1");

    expect(getRuntimeStepExecutionDetailQueryOptionsMock).toHaveBeenCalledWith({
      input: {
        projectId: "project-1",
        stepExecutionId: "step-1",
      },
    });
  });
});
