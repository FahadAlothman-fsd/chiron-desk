import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeterministicState } from "@/features/methodologies/foundation";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { cn } from "@/lib/utils";

const runtimeOverviewQueryKey = (projectId: string) => ["runtime-overview", projectId] as const;

export const Route = createFileRoute("/projects/$projectId/")({
  component: ProjectDashboardRoute,
});

type RuntimeStatCardProps = {
  title: string;
  value: string;
  subtitle: string;
};

function RuntimeStatCard({ title, value, subtitle }: RuntimeStatCardProps) {
  return (
    <Card
      frame="cut"
      tone="runtime"
      className="h-full border-border/80 bg-background/40 transition-colors group-hover:border-primary/60"
    >
      <CardHeader className="space-y-1 pb-2">
        <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </CardDescription>
        <CardTitle className="text-2xl leading-none tracking-[0.02em]">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{subtitle}</CardContent>
    </Card>
  );
}

function formatStartedAt(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

export function ProjectDashboardRoute() {
  const { projectId } = Route.useParams();
  const { orpc } = Route.useRouteContext();

  const runtimeOverviewQuery = useQuery({
    ...orpc.project.getRuntimeOverview.queryOptions({
      input: { projectId },
    }),
    queryKey: runtimeOverviewQueryKey(projectId),
  });

  const state = getDeterministicState({
    isLoading: runtimeOverviewQuery.isLoading,
    hasError: Boolean(runtimeOverviewQuery.error),
    hasData: Boolean(runtimeOverviewQuery.data),
    isBlocked: false,
  });

  const runtimeOverview = runtimeOverviewQuery.data;
  return (
    <MethodologyWorkspaceShell
      title="Project overview"
      stateLabel={state}
      segments={[{ label: "Projects", to: "/projects" }, { label: projectId }]}
    >
      <section className="space-y-3">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Runtime project overview
        </p>

        {runtimeOverviewQuery.isLoading ? <Skeleton className="h-36 w-full rounded-none" /> : null}

        {!runtimeOverviewQuery.isLoading && runtimeOverview ? (
          <div className="grid gap-3 md:grid-cols-3">
            <Link
              to="/projects/$projectId/facts"
              params={{ projectId }}
              search={{
                q: "",
                existence: runtimeOverview.stats.factTypesWithInstances.target.filters.existence,
                factType: "all",
              }}
              className="group block"
            >
              <RuntimeStatCard
                title="Fact types with instances"
                value={`${runtimeOverview.stats.factTypesWithInstances.current ?? 0}/${runtimeOverview.stats.factTypesWithInstances.total ?? 0}`}
                subtitle={runtimeOverview.stats.factTypesWithInstances.subtitle}
              />
            </Link>

            <Link
              to="/projects/$projectId/work-units"
              params={{ projectId }}
              search={{ q: "", hasActiveTransition: "all" }}
              className="group block"
            >
              <RuntimeStatCard
                title="Work-unit types with instances"
                value={`${runtimeOverview.stats.workUnitTypesWithInstances.current ?? 0}/${runtimeOverview.stats.workUnitTypesWithInstances.total ?? 0}`}
                subtitle={runtimeOverview.stats.workUnitTypesWithInstances.subtitle}
              />
            </Link>

            <Link
              to="/projects/$projectId/transitions"
              params={{ projectId }}
              search={{ q: "", status: "all" }}
              className="group block"
            >
              <RuntimeStatCard
                title="Active transitions"
                value={`${runtimeOverview.stats.activeTransitions.count ?? 0}`}
                subtitle={runtimeOverview.stats.activeTransitions.subtitle}
              />
            </Link>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Active workflows
        </p>

        {runtimeOverviewQuery.isLoading ? <Skeleton className="h-32 w-full rounded-none" /> : null}

        {!runtimeOverviewQuery.isLoading && runtimeOverview ? (
          runtimeOverview.activeWorkflows.length > 0 ? (
            <ul className="space-y-2">
              {runtimeOverview.activeWorkflows.map((workflow) => (
                <li
                  key={workflow.workflowExecutionId}
                  className="border border-border/70 bg-background/40 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium">{workflow.workflowName}</p>
                      <p className="text-xs text-muted-foreground">
                        {workflow.workflowKey} · {workflow.workUnit.workUnitTypeKey} · transition{" "}
                        {workflow.transition.transitionKey}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      started {formatStartedAt(workflow.startedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No active workflows right now.</p>
          )
        ) : null}
      </section>

      <section className="border border-primary/40 bg-primary/10 p-4">
        <Link
          to="/projects/$projectId/transitions"
          params={{ projectId }}
          search={{ q: "", status: "all" }}
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "w-full justify-between rounded-none text-[0.72rem] uppercase tracking-[0.14em]",
          )}
        >
          Go to Guidance
          <ArrowRightIcon className="size-4" />
        </Link>
      </section>
    </MethodologyWorkspaceShell>
  );
}
