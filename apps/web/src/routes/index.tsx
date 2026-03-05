import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  RUNTIME_DEFERRED_RATIONALE,
  getDeterministicState,
} from "@/features/methodologies/foundation";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const { orpc } = Route.useRouteContext();

  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const projectsQuery = useQuery(orpc.project.listProjects.queryOptions());
  const methodologiesQuery = useQuery(orpc.methodology.listMethodologies.queryOptions());

  const latestProject = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
  }, [projectsQuery.data]);

  const latestProjectDetailsQuery = useQuery({
    ...orpc.project.getProjectDetails.queryOptions({
      input: { projectId: latestProject?.id ?? "" },
    }),
    enabled: Boolean(latestProject?.id),
  });

  const latestTransitions =
    latestProjectDetailsQuery.data?.baselinePreview?.transitionPreview.transitions ?? [];
  const transitionCounts = {
    eligible: latestTransitions.filter((transition) => transition.status === "eligible").length,
    blocked: latestTransitions.filter((transition) => transition.status === "blocked").length,
    future: latestTransitions.filter((transition) => transition.status === "future").length,
  };

  const state = getDeterministicState({
    isLoading: healthCheck.isLoading || projectsQuery.isLoading || methodologiesQuery.isLoading,
    hasError:
      Boolean(healthCheck.error) ||
      Boolean(projectsQuery.error) ||
      Boolean(methodologiesQuery.error),
    hasData:
      Boolean(healthCheck.data) && Boolean(projectsQuery.data) && Boolean(methodologiesQuery.data),
  });

  return (
    <MethodologyWorkspaceShell title="Home index" stateLabel={state} segments={[{ label: "Home" }]}>
      <section className="grid gap-3 lg:grid-cols-3">
        <Card frame="cut-thick" tone="navigation" className="space-y-2 p-4">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            Projects
          </p>
          <p className="text-2xl font-semibold">{projectsQuery.data?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">
            Latest: {latestProject?.displayName ?? "No projects yet"}
          </p>
          <Link
            to="/projects"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-none")}
          >
            Open projects
          </Link>
        </Card>

        <Card frame="cut-thick" tone="navigation" className="space-y-2 p-4">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            Methodologies
          </p>
          <p className="text-2xl font-semibold">{methodologiesQuery.data?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">
            Latest: {methodologiesQuery.data?.[0]?.displayName ?? "No methodologies yet"}
          </p>
          <Link
            to="/methodologies"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-none")}
          >
            Open methodologies
          </Link>
        </Card>

        <Card frame="cut-thick" tone="runtime" className="space-y-2 p-4">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            Workflow executions
          </p>
          <p className="text-sm">{RUNTIME_DEFERRED_RATIONALE}</p>
          <p className="text-xs text-muted-foreground">
            Context preview (
            {latestProjectDetailsQuery.data?.baselinePreview?.transitionPreview.workUnitTypeKey ??
              "n/a"}
            )
          </p>
          <p className="text-xs text-muted-foreground">
            eligible {transitionCounts.eligible} | blocked {transitionCounts.blocked} | future{" "}
            {transitionCounts.future}
          </p>
          {latestProject ? (
            <Link
              to="/projects/$projectId/transitions"
              params={{ projectId: latestProject.id }}
              search={{ q: "", status: "all" }}
              className={cn(buttonVariants({ variant: "outline" }), "rounded-none")}
            >
              Open transition preview
            </Link>
          ) : null}
        </Card>
      </section>

      <section className="space-y-3 border border-border/80 bg-background p-4">
        <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
          System health
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              "size-2 rounded-full",
              healthCheck.data && !healthCheck.error ? "bg-emerald-400" : "bg-rose-400",
            )}
          />
          {healthCheck.isLoading
            ? "Checking API..."
            : healthCheck.data && !healthCheck.error
              ? "API connected"
              : "API unavailable"}
        </div>
      </section>
    </MethodologyWorkspaceShell>
  );
}
