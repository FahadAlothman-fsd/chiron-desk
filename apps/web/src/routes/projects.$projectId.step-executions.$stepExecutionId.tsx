import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { cn } from "@/lib/utils";

type StepDetailTab = "submission" | "writes" | "semantics";

export const runtimeStepExecutionDetailQueryKey = (projectId: string, stepExecutionId: string) =>
  ["runtime-step-execution-detail", projectId, stepExecutionId] as const;

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function formatJson(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[unserializable]";
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}

export const Route = createFileRoute("/projects/$projectId/step-executions/$stepExecutionId")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData({
      ...context.orpc.project.getRuntimeStepExecutionDetail.queryOptions({
        input: {
          projectId: params.projectId,
          stepExecutionId: params.stepExecutionId,
        },
      }),
      queryKey: runtimeStepExecutionDetailQueryKey(params.projectId, params.stepExecutionId),
    });
  },
  component: RuntimeFormStepDetailRoute,
});

export function RuntimeFormStepDetailRoute() {
  const { projectId, stepExecutionId } = Route.useParams();
  const { orpc } = Route.useRouteContext();
  const [activeTab, setActiveTab] = useState<StepDetailTab>("submission");

  const stepDetailQuery = useQuery({
    ...orpc.project.getRuntimeStepExecutionDetail.queryOptions({
      input: {
        projectId,
        stepExecutionId,
      },
    }),
    queryKey: runtimeStepExecutionDetailQueryKey(projectId, stepExecutionId),
  });

  const detail = stepDetailQuery.data;
  const isLoading = stepDetailQuery.isLoading;
  const hasError = Boolean(stepDetailQuery.error);

  return (
    <MethodologyWorkspaceShell
      title="Step execution detail"
      stateLabel={isLoading ? "loading" : hasError ? "failed" : "normal"}
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        {
          label: "Workflow execution",
          to: "/projects/$projectId/workflow-executions/$workflowExecutionId",
          params: {
            projectId,
            workflowExecutionId: detail?.stepExecution.workflowExecutionId ?? "pending",
          },
        },
        { label: stepExecutionId },
      ]}
    >
      <section className="space-y-3 border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Runtime context
        </p>

        {isLoading ? (
          <>
            <p className="text-sm text-muted-foreground">Loading step execution detail…</p>
            <Skeleton className="h-28 w-full rounded-none" />
          </>
        ) : hasError ? (
          <p className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {toErrorMessage(stepDetailQuery.error)}
          </p>
        ) : detail ? (
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Step execution:</span>{" "}
              {detail.stepExecution.stepExecutionId}
            </p>
            <p>
              <span className="text-muted-foreground">Workflow execution:</span>{" "}
              {detail.stepExecution.workflowExecutionId}
            </p>
            <p>
              <span className="text-muted-foreground">Step type:</span>{" "}
              {detail.stepExecution.stepType}
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span> {detail.stepExecution.status}
            </p>
            <p>
              <span className="text-muted-foreground">Activated:</span>{" "}
              {formatTimestamp(detail.stepExecution.activatedAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Completed:</span>{" "}
              {formatTimestamp(detail.stepExecution.completedAt)}
            </p>
          </div>
        ) : null}
      </section>

      {detail ? (
        <section className="space-y-3 border border-border/80 bg-background p-4">
          <div className="inline-flex w-fit border border-border/80 bg-background/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("submission")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em]",
                activeTab === "submission"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              Submission & Progression
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("writes")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em]",
                activeTab === "writes"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              Writes
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("semantics")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em]",
                activeTab === "semantics"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              Context Fact Semantics
            </button>
          </div>

          <div className="space-y-1 border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
            <p>Submitted snapshot = immutable submit-time value set.</p>
            <p>Progression = lifecycle and next-step outcome.</p>
            <p>Context writes = workflow execution context mutations.</p>
            <p>Authoritative writes = writes propagated into project fact instances.</p>
          </div>

          {activeTab === "submission" ? (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <section className="space-y-2 border border-border/70 bg-background/40 p-3">
                  <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Draft values
                  </p>
                  <pre className="overflow-x-auto text-xs text-muted-foreground">
                    {formatJson(detail.tabs.submissionAndProgression.draftValues)}
                  </pre>
                </section>

                <section className="space-y-2 border border-border/70 bg-background/40 p-3">
                  <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Submitted snapshot
                  </p>
                  <pre className="overflow-x-auto text-xs text-muted-foreground">
                    {formatJson(detail.tabs.submissionAndProgression.submittedSnapshot)}
                  </pre>
                </section>
              </div>

              <section className="space-y-1 border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
                <p>
                  Submitted at: {formatTimestamp(detail.tabs.submissionAndProgression.submittedAt)}
                </p>
                <p>
                  Progression payload:{" "}
                  {formatJson(detail.tabs.submissionAndProgression.progression)}
                </p>
                <p>
                  Next step execution:{" "}
                  {detail.tabs.submissionAndProgression.nextStepExecutionId ?? "none"}
                </p>
                {detail.tabs.submissionAndProgression.nextStepExecutionId ? (
                  <Link
                    to="/projects/$projectId/step-executions/$stepExecutionId"
                    params={{
                      projectId,
                      stepExecutionId: detail.tabs.submissionAndProgression.nextStepExecutionId,
                    }}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "xs" }),
                      "mt-2 rounded-none uppercase tracking-[0.12em]",
                    )}
                  >
                    Open next step
                  </Link>
                ) : null}
              </section>
            </div>
          ) : null}

          {activeTab === "writes" ? (
            <div className="space-y-3">
              <section className="space-y-2 border border-border/70 bg-background/40 p-3">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Workflow context writes
                </p>
                {detail.tabs.writes.workflowContextWrites.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No workflow-context writes recorded.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.tabs.writes.workflowContextWrites.map((write) => (
                      <li
                        key={write.contextFactId}
                        className="space-y-1 border border-border/70 p-2 text-xs"
                      >
                        <p className="font-medium text-foreground">{write.factKey}</p>
                        <p className="text-muted-foreground">kind: {write.factKind}</p>
                        <pre className="overflow-x-auto text-muted-foreground">
                          {formatJson(write.value)}
                        </pre>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2 border border-border/70 bg-background/40 p-3">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Authoritative project fact writes
                </p>
                {detail.tabs.writes.authoritativeProjectFactWrites.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No authoritative project-fact writes recorded.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.tabs.writes.authoritativeProjectFactWrites.map((write) => (
                      <li
                        key={write.projectFactInstanceId}
                        className="space-y-1 border border-border/70 p-2 text-xs"
                      >
                        <p className="font-medium text-foreground">{write.factDefinitionId}</p>
                        <p className="text-muted-foreground">
                          instance: {write.projectFactInstanceId}
                        </p>
                        <pre className="overflow-x-auto text-muted-foreground">
                          {formatJson(write.value)}
                        </pre>
                        <Link
                          to="/projects/$projectId/facts/$factDefinitionId"
                          params={{ projectId, factDefinitionId: write.factDefinitionId }}
                          search={{ q: "", existence: "all", factType: "all" }}
                          className="inline-flex uppercase tracking-[0.12em] text-primary hover:underline"
                        >
                          Open project fact detail
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}

          {activeTab === "semantics" ? (
            <div className="space-y-3">
              <section className="space-y-2 border border-border/70 bg-background/40 p-3">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Semantics notes
                </p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {detail.tabs.contextFactSemantics.notes.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2 border border-border/70 bg-background/40 p-3">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Fact mappings
                </p>

                {detail.tabs.contextFactSemantics.mappings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No context mappings recorded.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.tabs.contextFactSemantics.mappings.map((mapping) => (
                      <li key={mapping.factKey} className="border border-border/70 p-2 text-xs">
                        <p className="font-medium text-foreground">{mapping.factKey}</p>
                        <p className="text-muted-foreground">{mapping.semantics}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}
        </section>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
