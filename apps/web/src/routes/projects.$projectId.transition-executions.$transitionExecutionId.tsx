import { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { cn } from "@/lib/utils";

const transitionExecutionSearchSchema = z.object({
  projectWorkUnitId: z.string().optional(),
});

const runtimeGuidanceActiveQueryKey = (projectId: string) =>
  ["runtime-guidance-active", projectId] as const;
const runtimeActiveWorkflowsQueryKey = (projectId: string) =>
  ["runtime-active-workflows", projectId] as const;

export const runtimeTransitionExecutionDetailQueryKey = (
  projectId: string,
  transitionExecutionId: string,
) => ["runtime-transition-execution-detail", projectId, transitionExecutionId] as const;

export const runtimeTransitionExecutionShellQueryKey = (
  projectId: string,
  transitionExecutionId: string,
  _projectWorkUnitId?: string,
) => runtimeTransitionExecutionDetailQueryKey(projectId, transitionExecutionId);

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

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}

function renderTransitionStatus(status: "active" | "completed" | "superseded"): string {
  switch (status) {
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    default:
      return "Superseded";
  }
}

function renderWorkflowStatus(
  status: "active" | "completed" | "superseded" | "parent_superseded",
): string {
  switch (status) {
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "parent_superseded":
      return "Parent superseded";
    default:
      return "Superseded";
  }
}

export const Route = createFileRoute(
  "/projects/$projectId/transition-executions/$transitionExecutionId",
)({
  validateSearch: (search) => transitionExecutionSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    projectWorkUnitId: search.projectWorkUnitId,
  }),
  loader: async ({ context, params, deps }) => {
    if (!deps.projectWorkUnitId) {
      return;
    }

    await context.queryClient.ensureQueryData({
      ...context.orpc.project.getRuntimeTransitionExecutionDetail.queryOptions({
        input: {
          projectId: params.projectId,
          projectWorkUnitId: deps.projectWorkUnitId,
          transitionExecutionId: params.transitionExecutionId,
        },
      }),
      queryKey: runtimeTransitionExecutionDetailQueryKey(
        params.projectId,
        params.transitionExecutionId,
      ),
    });
  },
  component: TransitionExecutionDetailRoute,
});

export function TransitionExecutionDetailRoute() {
  const { projectId, transitionExecutionId } = Route.useParams();
  const search = Route.useSearch();
  const { orpc, queryClient } = Route.useRouteContext();
  const projectWorkUnitId =
    typeof search.projectWorkUnitId === "string" ? search.projectWorkUnitId : undefined;

  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");

  const transitionDetailQuery = useQuery({
    ...(projectWorkUnitId
      ? orpc.project.getRuntimeTransitionExecutionDetail.queryOptions({
          input: {
            projectId,
            projectWorkUnitId,
            transitionExecutionId,
          },
        })
      : {
          queryFn: async () => null,
        }),
    enabled: Boolean(projectWorkUnitId),
    queryKey: runtimeTransitionExecutionDetailQueryKey(projectId, transitionExecutionId),
  });

  const choosePrimaryMutation = useMutation(
    orpc.project.choosePrimaryWorkflowForTransitionExecution.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeTransitionExecutionDetailQueryKey(projectId, transitionExecutionId),
          }),
          queryClient.invalidateQueries({ queryKey: runtimeGuidanceActiveQueryKey(projectId) }),
          queryClient.invalidateQueries({ queryKey: runtimeActiveWorkflowsQueryKey(projectId) }),
        ]);
      },
    }),
  );

  const completeTransitionMutation = useMutation(
    orpc.project.completeTransitionExecution.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeTransitionExecutionDetailQueryKey(projectId, transitionExecutionId),
          }),
          queryClient.invalidateQueries({ queryKey: runtimeGuidanceActiveQueryKey(projectId) }),
          queryClient.invalidateQueries({ queryKey: runtimeActiveWorkflowsQueryKey(projectId) }),
        ]);
      },
    }),
  );

  const detail = transitionDetailQuery.data;
  const boundWorkflows = detail?.transitionDefinition.boundWorkflows ?? [];

  useEffect(() => {
    if (!detail) {
      setSelectedWorkflowId("");
      return;
    }

    const differentWorkflowId = boundWorkflows.find(
      (workflow) => workflow.workflowId !== detail.currentPrimaryWorkflow?.workflowId,
    )?.workflowId;

    setSelectedWorkflowId(differentWorkflowId ?? boundWorkflows[0]?.workflowId ?? "");
  }, [boundWorkflows, detail]);

  const selectedWorkflow = useMemo(
    () => boundWorkflows.find((workflow) => workflow.workflowId === selectedWorkflowId),
    [boundWorkflows, selectedWorkflowId],
  );

  const isLoading = Boolean(projectWorkUnitId) && transitionDetailQuery.isLoading;
  const hasError = Boolean(transitionDetailQuery.error);
  const isBusy = choosePrimaryMutation.isPending || completeTransitionMutation.isPending;

  const chooseAnotherPrimaryAvailable =
    detail?.completionGate.actions?.chooseAnotherPrimaryWorkflow !== undefined;
  const completeTransitionAvailable =
    detail?.completionGate.actions?.completeTransition !== undefined;

  return (
    <MethodologyWorkspaceShell
      title="Transition execution"
      stateLabel={isLoading ? "loading" : hasError ? "failed" : "normal"}
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        {
          label: "Guidance",
          to: "/projects/$projectId/transitions",
          params: { projectId },
        },
        { label: detail?.transitionDefinition.transitionKey ?? transitionExecutionId },
      ]}
    >
      <section
        data-testid="runtime-transition-execution-shell-boundary"
        className="space-y-3 border border-border/80 bg-background p-4"
      >
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Runtime context
        </p>

        {isLoading ? (
          <>
            <p className="text-sm text-muted-foreground">Loading transition execution detail…</p>
            <Skeleton className="h-28 w-full rounded-none" />
          </>
        ) : hasError ? (
          <p className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {toErrorMessage(transitionDetailQuery.error)}
          </p>
        ) : !projectWorkUnitId ? (
          <p className="border border-border/80 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
            Missing work-unit context. Open this page from Guidance active cards.
          </p>
        ) : (
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <p>
              <span className="text-muted-foreground">Transition execution:</span>{" "}
              {detail?.transitionExecution.transitionExecutionId ?? transitionExecutionId}
            </p>
            <p>
              <span className="text-muted-foreground">Work unit:</span>{" "}
              {detail?.workUnit.workUnitTypeKey ?? "pending context"}
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              {detail ? renderTransitionStatus(detail.transitionExecution.status) : "pending"}
            </p>
          </div>
        )}
      </section>

      {detail ? (
        <>
          <section className="space-y-3 border border-border/80 bg-background p-4">
            <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Transition definition
            </h2>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  {detail.transitionDefinition.transitionName}
                </p>
                <p>
                  <span className="text-muted-foreground">Key:</span>{" "}
                  {detail.transitionDefinition.transitionKey}
                </p>
                <p>
                  <span className="text-muted-foreground">Flow:</span>{" "}
                  {detail.transitionDefinition.fromStateLabel ??
                    detail.transitionDefinition.fromStateKey ??
                    "Any"}{" "}
                  → {detail.transitionDefinition.toStateLabel}
                </p>
              </div>

              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Start gate:</span> informational
                </p>
                <p>
                  <span className="text-muted-foreground">Started:</span>{" "}
                  {formatTimestamp(detail.startGate.startedAt)}
                </p>
                <p className="text-muted-foreground">{detail.startGate.note}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                Bound workflows
              </p>

              {detail.transitionDefinition.boundWorkflows.length > 0 ? (
                <ul className="space-y-2">
                  {detail.transitionDefinition.boundWorkflows.map((workflow) => (
                    <li
                      key={workflow.workflowId}
                      className="border border-border/70 bg-background/40 px-3 py-2 text-xs"
                    >
                      <p className="font-medium text-foreground">{workflow.workflowName}</p>
                      <p className="text-muted-foreground">{workflow.workflowKey}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No bound workflows configured.</p>
              )}
            </div>
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Current primary workflow
            </h2>

            {detail.currentPrimaryWorkflow ? (
              <div className="space-y-2 border border-border/70 bg-background/40 p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Workflow:</span>{" "}
                  {detail.currentPrimaryWorkflow.workflowName}
                </p>
                <p>
                  <span className="text-muted-foreground">Key:</span>{" "}
                  {detail.currentPrimaryWorkflow.workflowKey}
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  {renderWorkflowStatus(detail.currentPrimaryWorkflow.status)}
                </p>
                <p>
                  <span className="text-muted-foreground">Started:</span>{" "}
                  {formatTimestamp(detail.currentPrimaryWorkflow.startedAt)}
                </p>
                <Link
                  to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                  params={{
                    projectId,
                    workflowExecutionId: detail.currentPrimaryWorkflow.workflowExecutionId,
                  }}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-1 rounded-none text-[0.68rem] uppercase tracking-[0.12em]",
                  )}
                >
                  Open workflow detail
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No primary workflow is currently selected.
              </p>
            )}
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Completion gate
            </h2>

            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Panel state:</span>{" "}
                {detail.completionGate.panelState}
              </p>
              {detail.completionGate.lastEvaluatedAt ? (
                <p>
                  <span className="text-muted-foreground">Last evaluated:</span>{" "}
                  {formatTimestamp(detail.completionGate.lastEvaluatedAt)}
                </p>
              ) : null}
              {detail.completionGate.completedAt ? (
                <p>
                  <span className="text-muted-foreground">Completed at:</span>{" "}
                  {formatTimestamp(detail.completionGate.completedAt)}
                </p>
              ) : null}
              {detail.completionGate.firstBlockingReason ? (
                <p className="text-destructive">{detail.completionGate.firstBlockingReason}</p>
              ) : null}
            </div>

            {detail.completionGate.conditionTree !== undefined ? (
              <pre className="overflow-x-auto border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
                {JSON.stringify(detail.completionGate.conditionTree, null, 2)}
              </pre>
            ) : null}

            {completeTransitionAvailable ? (
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "rounded-none text-[0.68rem] uppercase tracking-[0.12em]",
                )}
                disabled={isBusy}
                onClick={async () => {
                  if (!projectWorkUnitId) {
                    return;
                  }

                  await completeTransitionMutation.mutateAsync({
                    projectId,
                    projectWorkUnitId,
                    transitionExecutionId,
                  });
                }}
              >
                Complete transition
              </button>
            ) : null}

            {chooseAnotherPrimaryAvailable ? (
              <div className="space-y-2">
                <label
                  className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                  htmlFor="next-primary-workflow"
                >
                  Next primary workflow
                </label>
                <select
                  id="next-primary-workflow"
                  value={selectedWorkflowId}
                  onChange={(event) => setSelectedWorkflowId(event.target.value)}
                  className="h-8 w-full border border-border/80 bg-background px-2 text-xs"
                >
                  {boundWorkflows.map((workflow) => (
                    <option key={workflow.workflowId} value={workflow.workflowId}>
                      {workflow.workflowName} ({workflow.workflowKey})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "rounded-none text-[0.68rem] uppercase tracking-[0.12em]",
                  )}
                  disabled={isBusy || !selectedWorkflowId || !projectWorkUnitId}
                  onClick={async () => {
                    if (!projectWorkUnitId || !selectedWorkflowId) {
                      return;
                    }

                    await choosePrimaryMutation.mutateAsync({
                      projectId,
                      projectWorkUnitId,
                      transitionExecutionId,
                      workflowId: selectedWorkflowId,
                      ...(selectedWorkflow?.workflowKey
                        ? { workflowKey: selectedWorkflow.workflowKey }
                        : {}),
                    });
                  }}
                >
                  Choose another primary workflow
                </button>
              </div>
            ) : null}
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Primary attempt history
            </h2>

            {detail.primaryAttemptHistory.length > 0 ? (
              <ul className="space-y-2">
                {detail.primaryAttemptHistory.map((workflow) => (
                  <li
                    key={workflow.workflowExecutionId}
                    className="border border-border/70 bg-background/40 px-3 py-2 text-xs"
                  >
                    <div className="grid gap-1 md:grid-cols-[1fr_auto]">
                      <div>
                        <p className="font-medium text-foreground">{workflow.workflowName}</p>
                        <p className="text-muted-foreground">{workflow.workflowKey}</p>
                        <p className="text-muted-foreground">
                          status {renderWorkflowStatus(workflow.status)} · started{" "}
                          {formatTimestamp(workflow.startedAt)}
                        </p>
                      </div>

                      <Link
                        to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                        params={{ projectId, workflowExecutionId: workflow.workflowExecutionId }}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "xs" }),
                          "h-fit rounded-none text-[0.66rem] uppercase tracking-[0.12em]",
                        )}
                      >
                        Open workflow detail
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No prior primary attempts.</p>
            )}
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Supporting workflows
            </h2>

            {detail.supportingWorkflows.length > 0 ? (
              <ul className="space-y-2">
                {detail.supportingWorkflows.map((workflow) => (
                  <li
                    key={workflow.workflowExecutionId}
                    className="border border-border/70 bg-background/40 px-3 py-2 text-xs"
                  >
                    <div className="grid gap-1 md:grid-cols-[1fr_auto]">
                      <div>
                        <p className="font-medium text-foreground">{workflow.workflowName}</p>
                        <p className="text-muted-foreground">{workflow.workflowKey}</p>
                        <p className="text-muted-foreground">
                          status {renderWorkflowStatus(workflow.status)} · started{" "}
                          {formatTimestamp(workflow.startedAt)}
                        </p>
                      </div>

                      <Link
                        to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                        params={{ projectId, workflowExecutionId: workflow.workflowExecutionId }}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "xs" }),
                          "h-fit rounded-none text-[0.66rem] uppercase tracking-[0.12em]",
                        )}
                      >
                        Open workflow detail
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No supporting workflows.</p>
            )}
          </section>

          <section className="flex flex-wrap gap-2">
            <Link
              to="/projects/$projectId/transitions"
              params={{ projectId }}
              search={{ q: "", status: "all" }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Back to Guidance
            </Link>

            <Link
              to="/projects/$projectId/workflows"
              params={{ projectId }}
              search={{ q: "", workUnitTypeKey: "all" }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Open Active Workflows
            </Link>
          </section>
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}

export function TransitionExecutionShellRoute() {
  return <TransitionExecutionDetailRoute />;
}
