import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

const runtimeWorkUnitOverviewQueryKey = (projectId: string, projectWorkUnitId: string) =>
  ["runtime-work-unit-overview", projectId, projectWorkUnitId] as const;

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

export const Route = createFileRoute("/projects/$projectId/work-units/$projectWorkUnitId")({
  component: ProjectWorkUnitOverviewRoute,
});

export function ProjectWorkUnitOverviewRoute() {
  const { projectId, projectWorkUnitId } = Route.useParams();
  const { orpc } = Route.useRouteContext();

  const runtimeWorkUnitOverviewQuery = useQuery({
    ...orpc.project.getRuntimeWorkUnitOverview.queryOptions({
      input: {
        projectId,
        projectWorkUnitId,
      },
    }),
    queryKey: runtimeWorkUnitOverviewQueryKey(projectId, projectWorkUnitId),
  });

  const overview = runtimeWorkUnitOverviewQuery.data;

  return (
    <MethodologyWorkspaceShell
      title="Work unit overview"
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
        { label: overview?.workUnit.workUnitTypeName ?? projectWorkUnitId },
      ]}
    >
      {runtimeWorkUnitOverviewQuery.isLoading ? (
        <Skeleton className="h-56 w-full rounded-none" />
      ) : null}

      {overview ? (
        <>
          <section className="space-y-3 border border-border/80 bg-background p-4">
            <div className="space-y-1">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Work unit
              </p>
              <p className="text-sm font-medium">{overview.workUnit.workUnitTypeName}</p>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {overview.workUnit.workUnitTypeKey}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Current state
                </p>
                <p className="text-sm">{overview.workUnit.currentStateLabel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Created
                </p>
                <p className="text-sm">{formatTimestamp(overview.workUnit.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Updated
                </p>
                <p className="text-sm">{formatTimestamp(overview.workUnit.updatedAt)}</p>
              </div>
            </div>
          </section>

          {overview.activeTransition ? (
            <section className="border border-border/80 bg-background p-4">
              <Card frame="cut" tone="runtime" className="h-full border-border/80 bg-background/40">
                <CardHeader className="space-y-1">
                  <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Active transition
                  </CardDescription>
                  <CardTitle className="text-base tracking-[0.02em]">
                    {overview.activeTransition.transitionName}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {overview.activeTransition.transitionKey} →{" "}
                    {overview.activeTransition.toStateLabel}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  {overview.activeTransition.primaryWorkflow ? (
                    <p>
                      Primary workflow: {overview.activeTransition.primaryWorkflow.workflowName} (
                      {overview.activeTransition.primaryWorkflow.workflowKey})
                    </p>
                  ) : (
                    <p>No primary workflow is attached yet.</p>
                  )}
                  <p>
                    Completion hint:{" "}
                    {overview.activeTransition.readyForCompletion ? "ready" : "pending"}
                  </p>
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section className="grid gap-3 md:grid-cols-3">
            <Card frame="cut" tone="runtime" className="h-full border-border/80 bg-background/40">
              <CardHeader>
                <CardTitle className="text-sm">Facts / Dependencies</CardTitle>
                <CardDescription>Current fact and dependency footprint</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Facts: {overview.summaries.factsDependencies.factInstancesCurrent} /{" "}
                  {overview.summaries.factsDependencies.factDefinitionsTotal}
                </p>
                <p>
                  Dependencies: in {overview.summaries.factsDependencies.inboundDependencyCount} ·
                  out {overview.summaries.factsDependencies.outboundDependencyCount}
                </p>
                <Link
                  to="/projects/$projectId/work-units/$projectWorkUnitId/facts"
                  params={{ projectId, projectWorkUnitId }}
                  search={{
                    tab: "primitive",
                    q: "",
                    existence: "all",
                    primitiveFactType: "all",
                    hasActiveTransition: "all",
                  }}
                  className="inline-flex text-xs font-medium uppercase tracking-[0.12em] text-primary hover:underline"
                >
                  Open facts
                </Link>
              </CardContent>
            </Card>

            <Card frame="cut" tone="runtime" className="h-full border-border/80 bg-background/40">
              <CardHeader>
                <CardTitle className="text-sm">State Machine</CardTitle>
                <CardDescription>Current state and switch candidates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>
                  {overview.summaries.stateMachine.currentStateLabel} (
                  {overview.summaries.stateMachine.currentStateKey})
                </p>
                <p>
                  Active transition:{" "}
                  {overview.summaries.stateMachine.hasActiveTransition ? "yes" : "no"}
                </p>
                <Link
                  to="/projects/$projectId/work-units/$projectWorkUnitId/state-machine"
                  params={{ projectId, projectWorkUnitId }}
                  search={{ q: "", hasActiveTransition: "all" }}
                  className="inline-flex text-xs font-medium uppercase tracking-[0.12em] text-primary hover:underline"
                >
                  Open state machine
                </Link>
              </CardContent>
            </Card>

            <Card frame="cut" tone="runtime" className="h-full border-border/80 bg-background/40">
              <CardHeader>
                <CardTitle className="text-sm">Artifact Slots</CardTitle>
                <CardDescription>Current artifact-slot occupancy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Slots with snapshots: {overview.summaries.artifactSlots.slotsWithCurrentSnapshots}{" "}
                  / {overview.summaries.artifactSlots.slotDefinitionsTotal}
                </p>
                <Link
                  to="/projects/$projectId/work-units/$projectWorkUnitId/artifact-slots"
                  params={{ projectId, projectWorkUnitId }}
                  search={{ q: "", hasActiveTransition: "all" }}
                  className="inline-flex text-xs font-medium uppercase tracking-[0.12em] text-primary hover:underline"
                >
                  Open artifact slots
                </Link>
              </CardContent>
            </Card>
          </section>

          <section>
            <Link
              to="/projects/$projectId/work-units"
              params={{ projectId }}
              search={{ q: "", hasActiveTransition: "all" }}
              className="inline-flex text-xs font-medium uppercase tracking-[0.12em] text-primary hover:underline"
            >
              Back to Work Units
            </Link>
          </section>
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
