import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

const runtimeWorkUnitStateMachineQueryKey = (projectId: string, projectWorkUnitId: string) =>
  ["runtime-work-unit-state-machine", projectId, projectWorkUnitId] as const;

function renderTransitionResult(result: "available" | "blocked" | "future") {
  if (result === "available") {
    return { label: "available", className: "border-primary/50 bg-primary/15 text-primary" };
  }

  if (result === "blocked") {
    return {
      label: "blocked",
      className: "border-destructive/50 bg-destructive/10 text-destructive",
    };
  }

  return { label: "future", className: "border-border/60 bg-muted/30 text-muted-foreground" };
}

export const Route = createFileRoute(
  "/projects/$projectId/work-units/$projectWorkUnitId/state-machine",
)({
  component: ProjectWorkUnitStateMachineRoute,
});

export function ProjectWorkUnitStateMachineRoute() {
  const { projectId, projectWorkUnitId } = Route.useParams();
  const { orpc } = Route.useRouteContext();

  const stateMachineQuery = useQuery({
    ...orpc.project.getRuntimeWorkUnitStateMachine.queryOptions({
      input: {
        projectId,
        projectWorkUnitId,
      },
    }),
    queryKey: runtimeWorkUnitStateMachineQueryKey(projectId, projectWorkUnitId),
  });

  const stateMachine = stateMachineQuery.data;

  return (
    <MethodologyWorkspaceShell
      title="Work unit state machine"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        {
          label: "Work Units",
          to: "/projects/$projectId/work-units",
          params: { projectId },
        },
        {
          label: stateMachine?.workUnit.workUnitTypeName ?? projectWorkUnitId,
          to: "/projects/$projectId/work-units/$projectWorkUnitId",
          params: { projectId, projectWorkUnitId },
        },
        { label: "State Machine" },
      ]}
    >
      {stateMachineQuery.isLoading ? <Skeleton className="h-64 w-full rounded-none" /> : null}

      {stateMachine ? (
        <>
          <section className="space-y-1 border border-border/80 bg-background p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Current state
            </p>
            <p className="text-sm font-medium">{stateMachine.workUnit.currentStateLabel}</p>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {stateMachine.workUnit.currentStateKey}
            </p>
          </section>

          {stateMachine.activeTransition ? (
            <section className="border border-border/80 bg-background p-4">
              <Card frame="cut" tone="runtime" className="h-full border-border/80 bg-background/40">
                <CardHeader className="space-y-1">
                  <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Active transition
                  </CardDescription>
                  <CardTitle className="text-base tracking-[0.02em]">
                    {stateMachine.activeTransition.transitionName}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {stateMachine.activeTransition.transitionKey} →{" "}
                    {stateMachine.activeTransition.toStateLabel}
                  </p>
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-muted-foreground">
                  {stateMachine.activeTransition.primaryWorkflow ? (
                    <p>
                      Primary workflow: {stateMachine.activeTransition.primaryWorkflow.workflowName}{" "}
                      ({stateMachine.activeTransition.primaryWorkflow.workflowKey})
                    </p>
                  ) : null}
                  <p>
                    Completion hint:{" "}
                    {stateMachine.activeTransition.readyForCompletion ? "ready" : "pending"}
                  </p>
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Possible transitions
            </p>

            {stateMachine.possibleTransitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No switch candidates are currently available from this state.
              </p>
            ) : (
              <ul className="space-y-2">
                {stateMachine.possibleTransitions.map((transition) => {
                  const resultToken = renderTransitionResult(transition.result);

                  return (
                    <li
                      key={transition.transitionId}
                      className="space-y-2 border border-border/70 bg-background/40 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{transition.transitionName}</p>
                          <p className="text-xs text-muted-foreground">
                            {transition.transitionKey} → {transition.toStateLabel}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="border border-border/70 bg-muted/30 px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                            {transition.actionMode} candidate
                          </span>
                          <span
                            className={`border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] ${resultToken.className}`}
                          >
                            {resultToken.label}
                          </span>
                        </div>
                      </div>

                      {transition.firstReason ? (
                        <p className="text-xs text-muted-foreground">{transition.firstReason}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <Link
              to="/projects/$projectId/work-units/$projectWorkUnitId"
              params={{ projectId, projectWorkUnitId }}
              search={{ q: "" }}
              className="inline-flex text-xs font-medium uppercase tracking-[0.12em] text-primary hover:underline"
            >
              Back to overview
            </Link>
          </section>
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
