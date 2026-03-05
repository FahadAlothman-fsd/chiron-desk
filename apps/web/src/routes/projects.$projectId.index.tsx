import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RUNTIME_DEFERRED_RATIONALE,
  getDeterministicState,
} from "@/features/methodologies/foundation";
import {
  BaselineVisibilitySection,
  type BaselinePreview,
} from "@/features/projects/baseline-visibility";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute("/projects/$projectId/")({
  component: ProjectDashboardRoute,
});

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

export function ProjectDashboardRoute() {
  const { projectId } = Route.useParams();
  const { orpc } = Route.useRouteContext();

  const projectQuery = useQuery(
    orpc.project.getProjectDetails.queryOptions({
      input: { projectId },
    }),
  );

  const state = getDeterministicState({
    isLoading: projectQuery.isLoading,
    hasError: Boolean(projectQuery.error),
    hasData: Boolean(projectQuery.data),
    isBlocked: false,
  });

  return (
    <MethodologyWorkspaceShell
      title="Project dashboard"
      stateLabel={state}
      segments={[
        { label: "Projects", to: "/projects" },
        { label: projectQuery.data?.project.displayName ?? projectId },
      ]}
    >
      <section className="space-y-4 border border-border/80 bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Project overview
            </p>
            <h2 className="text-lg font-semibold tracking-[0.04em]">
              {projectQuery.data?.project.displayName ?? projectId}
            </h2>
          </div>
          <Link
            to="/projects/$projectId/pinning"
            params={{ projectId }}
            className={
              buttonVariants({ variant: "default" }) + " rounded-none uppercase tracking-[0.12em]"
            }
          >
            Open pinning workspace
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        {projectQuery.isLoading ? <Skeleton className="h-20 w-full rounded-none" /> : null}

        {!projectQuery.isLoading && projectQuery.data ? (
          <div className="grid gap-3 border border-border/70 bg-background/30 p-3 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Project ID
              </p>
              <p className="break-all text-sm">{projectQuery.data.project.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Created
              </p>
              <p className="text-sm">{formatTimestamp(projectQuery.data.project.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Last Updated
              </p>
              <p className="text-sm">{formatTimestamp(projectQuery.data.project.updatedAt)}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Active methodology pin
        </p>

        {projectQuery.isLoading ? <Skeleton className="h-16 w-full rounded-none" /> : null}

        {!projectQuery.isLoading && projectQuery.data?.pin ? (
          <div className="grid gap-3 border border-border/70 bg-background/30 p-3 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Methodology
              </p>
              <p className="text-sm font-medium">{projectQuery.data.pin.methodologyKey}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Version
              </p>
              <p className="text-sm font-medium">{projectQuery.data.pin.publishedVersion}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Actor
              </p>
              <p className="break-all text-sm">{projectQuery.data.pin.actorId}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Updated
              </p>
              <p className="text-sm">{formatTimestamp(projectQuery.data.pin.timestamp)}</p>
            </div>
          </div>
        ) : null}

        {!projectQuery.isLoading && !projectQuery.data?.pin ? (
          <div className="space-y-2 border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium text-amber-200">No active pin found.</p>
            <p className="text-muted-foreground">
              Open the pinning workspace to choose a methodology and pin a published version.
            </p>
          </div>
        ) : null}
      </section>

      <BaselineVisibilitySection
        baselinePreview={(projectQuery.data?.baselinePreview ?? null) as BaselinePreview | null}
      />

      <section className="border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Runtime</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button aria-disabled="true" disabled variant="outline" className="rounded-none">
            Runtime Execution (Epic 3+)
          </Button>
          <p className="text-xs text-muted-foreground">{RUNTIME_DEFERRED_RATIONALE}</p>
        </div>
      </section>
    </MethodologyWorkspaceShell>
  );
}
