import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { cn } from "@/lib/utils";

const runtimeGuidanceActiveQueryKey = (projectId: string) =>
  ["runtime-guidance-active", projectId] as const;
const runtimeActiveWorkflowsQueryKey = (projectId: string) =>
  ["runtime-active-workflows", projectId] as const;

export const runtimeWorkflowExecutionDetailQueryKey = (
  projectId: string,
  workflowExecutionId: string,
) => ["runtime-workflow-execution-detail", projectId, workflowExecutionId] as const;

export const runtimeWorkflowExecutionShellQueryKey = (
  projectId: string,
  workflowExecutionId: string,
) => runtimeWorkflowExecutionDetailQueryKey(projectId, workflowExecutionId);

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
  "/projects/$projectId/workflow-executions/$workflowExecutionId",
)({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData({
      ...context.orpc.project.getRuntimeWorkflowExecutionDetail.queryOptions({
        input: {
          projectId: params.projectId,
          workflowExecutionId: params.workflowExecutionId,
        },
      }),
      queryKey: runtimeWorkflowExecutionDetailQueryKey(
        params.projectId,
        params.workflowExecutionId,
      ),
    });
  },
  component: WorkflowExecutionDetailRoute,
});

export function WorkflowExecutionDetailRoute() {
  const { projectId, workflowExecutionId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { orpc, queryClient } = Route.useRouteContext();

  const workflowExecutionDetailQuery = useQuery({
    ...orpc.project.getRuntimeWorkflowExecutionDetail.queryOptions({
      input: {
        projectId,
        workflowExecutionId,
      },
    }),
    queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, workflowExecutionId),
  });

  const retrySameWorkflowMutation = useMutation(
    orpc.project.retrySameWorkflowExecution.mutationOptions({
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, workflowExecutionId),
          }),
          queryClient.invalidateQueries({ queryKey: runtimeActiveWorkflowsQueryKey(projectId) }),
          queryClient.invalidateQueries({ queryKey: runtimeGuidanceActiveQueryKey(projectId) }),
        ]);

        if (result?.workflowExecutionId) {
          await navigate({
            to: "/projects/$projectId/workflow-executions/$workflowExecutionId",
            params: {
              projectId,
              workflowExecutionId: result.workflowExecutionId,
            },
            replace: true,
          });
        }
      },
    }),
  );

  const detail = workflowExecutionDetailQuery.data;
  const isLoading = workflowExecutionDetailQuery.isLoading;
  const hasError = Boolean(workflowExecutionDetailQuery.error);

  return (
    <MethodologyWorkspaceShell
      title="Workflow execution"
      stateLabel={isLoading ? "loading" : hasError ? "failed" : "normal"}
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        {
          label: "Active Workflows",
          to: "/projects/$projectId/workflows",
          params: { projectId },
        },
        { label: detail?.workflowExecution.workflowKey ?? workflowExecutionId },
      ]}
    >
      <section
        data-testid="runtime-workflow-execution-shell-boundary"
        className="space-y-3 border border-border/80 bg-background p-4"
      >
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Runtime context
        </p>

        {isLoading ? (
          <>
            <p className="text-sm text-muted-foreground">Loading workflow execution detail…</p>
            <Skeleton className="h-28 w-full rounded-none" />
          </>
        ) : hasError ? (
          <p className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {toErrorMessage(workflowExecutionDetailQuery.error)}
          </p>
        ) : (
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <p>
              <span className="text-muted-foreground">Workflow execution:</span>{" "}
              {detail?.workflowExecution.workflowExecutionId ?? workflowExecutionId}
            </p>
            <p>
              <span className="text-muted-foreground">Workflow:</span>{" "}
              {detail?.workflowExecution.workflowName ?? "pending context"}
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              {detail ? renderWorkflowStatus(detail.workflowExecution.status) : "pending"}
            </p>
          </div>
        )}
      </section>

      {detail ? (
        <>
          <section className="space-y-3 border border-border/80 bg-background p-4">
            <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Workflow runtime summary
            </h2>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="space-y-1">
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  {detail.workflowExecution.workflowName}
                </p>
                <p>
                  <span className="text-muted-foreground">Key:</span>{" "}
                  {detail.workflowExecution.workflowKey}
                </p>
                <p>
                  <span className="text-muted-foreground">Role:</span>{" "}
                  {detail.workflowExecution.workflowRole}
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  {renderWorkflowStatus(detail.workflowExecution.status)}
                </p>
              </div>

              <div className="space-y-1">
                <p>
                  <span className="text-muted-foreground">Started:</span>{" "}
                  {formatTimestamp(detail.workflowExecution.startedAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">Completed:</span>{" "}
                  {formatTimestamp(detail.workflowExecution.completedAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">Superseded:</span>{" "}
                  {formatTimestamp(detail.workflowExecution.supersededAt)}
                </p>
              </div>
            </div>

            <div className="grid gap-2 border border-border/70 bg-background/40 p-3 text-xs md:grid-cols-2">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Parent transition</p>
                <p className="text-muted-foreground">
                  {detail.parentTransition.transitionName} ({detail.parentTransition.transitionKey})
                </p>
                <Link
                  to="/projects/$projectId/transition-executions/$transitionExecutionId"
                  params={{
                    projectId,
                    transitionExecutionId: detail.parentTransition.transitionExecutionId,
                  }}
                  search={{ projectWorkUnitId: detail.workUnit.projectWorkUnitId }}
                  className="inline-flex font-medium uppercase tracking-[0.1em] text-primary hover:underline"
                >
                  Open transition detail
                </Link>
              </div>

              <div className="space-y-1">
                <p className="font-medium text-foreground">Parent work unit</p>
                <p className="text-muted-foreground">
                  {detail.workUnit.workUnitTypeName} ({detail.workUnit.workUnitTypeKey})
                </p>
                <Link
                  to="/projects/$projectId/work-units/$projectWorkUnitId"
                  params={{ projectId, projectWorkUnitId: detail.workUnit.projectWorkUnitId }}
                  search={{ q: "", hasActiveTransition: "all" }}
                  className="inline-flex font-medium uppercase tracking-[0.1em] text-primary hover:underline"
                >
                  Open work unit overview
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Retry and supersession lineage
            </h2>

            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Supersedes workflow execution:</span>{" "}
                {detail.lineage.supersedesWorkflowExecutionId ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Superseded by workflow execution:</span>{" "}
                {detail.lineage.supersededByWorkflowExecutionId ?? "—"}
              </p>
            </div>

            {detail.lineage.previousPrimaryAttempts &&
            detail.lineage.previousPrimaryAttempts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Previous primary attempts
                </p>
                <ul className="space-y-2">
                  {detail.lineage.previousPrimaryAttempts.map((attempt) => (
                    <li
                      key={attempt.workflowExecutionId}
                      className="grid gap-1 border border-border/70 bg-background/40 px-3 py-2 text-xs md:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="font-medium text-foreground">{attempt.workflowName}</p>
                        <p className="text-muted-foreground">{attempt.workflowKey}</p>
                      </div>
                      <Link
                        to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                        params={{ projectId, workflowExecutionId: attempt.workflowExecutionId }}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "xs" }),
                          "h-fit rounded-none text-[0.66rem] uppercase tracking-[0.12em]",
                        )}
                      >
                        Open attempt
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detail.retryAction?.enabled ? (
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "rounded-none text-[0.68rem] uppercase tracking-[0.12em]",
                )}
                disabled={retrySameWorkflowMutation.isPending}
                onClick={async () => {
                  await retrySameWorkflowMutation.mutateAsync({
                    projectId,
                    workflowExecutionId,
                  });
                }}
              >
                Retry same workflow
              </button>
            ) : null}

            {detail.retryAction && !detail.retryAction.enabled ? (
              <div className="space-y-1 border border-border/70 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Retry unavailable</p>
                <p>
                  {detail.retryAction.reasonIfDisabled ??
                    "Retry is currently unavailable for this workflow execution."}
                </p>
              </div>
            ) : null}

            {detail.impactDialog?.requiredForRetry ? (
              <p className="text-xs text-muted-foreground">
                Retry impact: transition{" "}
                {detail.impactDialog.affectedEntitiesSummary.transitionExecutionId} · workflows{" "}
                {detail.impactDialog.affectedEntitiesSummary.workflowExecutionIds.join(", ")}
              </p>
            ) : null}
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Steps coming later
            </h2>
            <p className="text-sm text-muted-foreground">{detail.stepsSurface.message}</p>
          </section>

          <section className="flex flex-wrap gap-2">
            <Link
              to="/projects/$projectId/workflows"
              params={{ projectId }}
              search={{ q: "", workUnitTypeKey: "all" }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Back to Active Workflows
            </Link>

            <Link
              to="/projects/$projectId/transitions"
              params={{ projectId }}
              search={{ q: "", status: "all" }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Back to Guidance
            </Link>
          </section>
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}

export function WorkflowExecutionShellRoute() {
  return <WorkflowExecutionDetailRoute />;
}
